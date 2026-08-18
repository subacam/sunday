import { NextRequest, NextResponse } from 'next/server';
import { MAX_DISPLAY, PAGE_SIZE } from '@/lib/constants';
import type { NewsApiError, NewsItem, SortOption } from '@/types/news';

const NAVER_NEWS_URL = 'https://naverapihub.apigw.ntruss.com/search/v1/news';

function errorResponse(status: number, body: NewsApiError) {
  return NextResponse.json(body, { status });
}

function parseSort(raw: string | null): SortOption {
  return raw === 'date' ? 'date' : 'sim';
}

function parsePage(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function sourceFromLink(link: string): string {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link;
  }
}

interface NaverNewsRawItem {
  title: string;
  description: string;
  link: string;
  originallink: string;
  pubDate: string;
}

interface NaverNewsResponse {
  total: number;
  items: NaverNewsRawItem[];
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = (searchParams.get('query') ?? '').trim();
  const sort = parseSort(searchParams.get('sort'));
  const page = parsePage(searchParams.get('page'));

  if (!query) {
    return errorResponse(400, {
      error: 'INVALID_QUERY',
      message: '검색어를 입력해주세요.',
    });
  }

  const display = Math.min(page * PAGE_SIZE, MAX_DISPLAY);

  const clientId = process.env['X-NCP-APIGW-API-KEY-ID'];
  const clientSecret = process.env['X-NCP-APIGW-API-KEY'];

  if (!clientId || !clientSecret) {
    console.error('[api/news] X-NCP-APIGW-API-KEY-ID / X-NCP-APIGW-API-KEY is not set');
    return errorResponse(503, {
      error: 'UPSTREAM_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }

  const upstreamUrl = `${NAVER_NEWS_URL}?query=${encodeURIComponent(query)}&sort=${sort}&start=1&display=${display}`;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstreamUrl, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret,
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error('[api/news] fetch to Naver failed:', err);
    return errorResponse(503, {
      error: 'UPSTREAM_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }

  if (upstreamRes.status === 401 || upstreamRes.status === 403) {
    console.error('[api/news] Naver auth error:', upstreamRes.status, await upstreamRes.text());
    return errorResponse(502, {
      error: 'AUTH_ERROR',
      message: '서비스 일시 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }

  if (upstreamRes.status === 429) {
    console.error('[api/news] Naver rate limited');
    return errorResponse(429, {
      error: 'RATE_LIMITED',
      message: '요청이 많아 잠시 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
    });
  }

  if (!upstreamRes.ok) {
    console.error('[api/news] Naver upstream error:', upstreamRes.status, await upstreamRes.text());
    return errorResponse(503, {
      error: 'UPSTREAM_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }

  const data: NaverNewsResponse = await upstreamRes.json();

  const items: NewsItem[] = data.items.map((item) => ({
    title: item.title,
    description: item.description,
    link: item.originallink || item.link,
    source: sourceFromLink(item.originallink || item.link),
    pubDate: item.pubDate,
  }));

  return NextResponse.json({
    items,
    total: data.total,
    currentPage: page,
  });
}
