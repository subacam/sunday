import { NextRequest, NextResponse } from 'next/server';
import { CACHE_REVALIDATE_SECONDS, CITIES, HOURLY_POINTS } from '@/lib/constants';
import { REPRESENTATIVE_STATIONS } from '@/lib/stations';
import { parseGrade, parseValue } from '@/lib/airQualityGrade';
import type { CityCode, DustApiError, DustApiSuccess, HourlyPoint, RealtimeReading } from '@/types/dust';

const AIRKOREA_URL =
  'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty';

const VALID_CITY_CODES = new Set(CITIES.map((c) => c.code));

function errorResponse(status: number, body: DustApiError) {
  return NextResponse.json(body, { status });
}

function parseCity(raw: string | null): CityCode | null {
  if (!raw || !VALID_CITY_CODES.has(raw as CityCode)) return null;
  return raw as CityCode;
}

interface AirKoreaRawItem {
  dataTime: string;
  pm10Value: string | null;
  pm25Value: string | null;
  khaiGrade: string | null;
  pm10Grade: string | null;
  pm25Grade: string | null;
}

interface AirKoreaResponse {
  response: {
    header: { resultCode: string; resultMsg: string };
    body?: { items: AirKoreaRawItem[]; totalCount: number };
  };
}

// data.go.kr 인증 실패(등록되지 않은 키, IP 제한 등)는 returnType=json을 요청해도
// JSON이 아닌 XML 오류 본문으로 내려오는 경우가 있어, 텍스트로 먼저 받아 안전하게 판별한다.
function looksLikeAuthFault(rawText: string): boolean {
  return /SERVICE[_ ]?KEY|SERVICE_ACCESS_DENIED|UNREGISTERED_IP|UNSIGNED_CALL/i.test(rawText);
}

const AUTH_RESULT_CODES = new Set(['20', '21', '30', '31', '32', '33']);
const RATE_LIMIT_RESULT_CODES = new Set(['22']);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const city = parseCity(searchParams.get('city'));

  if (!city) {
    return errorResponse(400, { error: 'INVALID_CITY', message: '유효하지 않은 지역입니다.' });
  }

  const stationName = REPRESENTATIVE_STATIONS[city];

  const serviceKey = process.env.AIRKOREA_SERVICE_KEY;
  if (!serviceKey) {
    console.error('[api/dust] AIRKOREA_SERVICE_KEY is not set');
    return errorResponse(503, {
      error: 'UPSTREAM_CONFIG_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }
  if (/%[0-9A-Fa-f]{2}/.test(serviceKey)) {
    console.warn(
      '[api/dust] AIRKOREA_SERVICE_KEY looks percent-encoded — use the Decoding key from data.go.kr, not the Encoding key, or requests will double-encode and fail auth.',
    );
  }

  const upstreamUrl =
    `${AIRKOREA_URL}?serviceKey=${encodeURIComponent(serviceKey)}` +
    `&returnType=json&numOfRows=${HOURLY_POINTS}&pageNo=1` +
    `&stationName=${encodeURIComponent(stationName)}&dataTerm=DAILY&ver=1.3`;

  let rawText: string;
  try {
    const upstreamRes = await fetch(upstreamUrl, {
      next: { revalidate: CACHE_REVALIDATE_SECONDS },
      signal: AbortSignal.timeout(8000),
    });
    rawText = await upstreamRes.text();
    if (!upstreamRes.ok) {
      console.error('[api/dust] AirKorea HTTP error:', upstreamRes.status, rawText);
      if (upstreamRes.status === 401 || upstreamRes.status === 403) {
        return errorResponse(502, {
          error: 'AUTH_ERROR',
          message: '서비스 일시 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
      }
      return errorResponse(503, {
        error: 'UPSTREAM_ERROR',
        message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
    }
  } catch (err) {
    console.error('[api/dust] fetch to AirKorea failed:', err);
    return errorResponse(503, {
      error: 'UPSTREAM_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }

  let data: AirKoreaResponse;
  try {
    data = JSON.parse(rawText);
  } catch {
    console.error('[api/dust] AirKorea returned non-JSON body:', rawText.slice(0, 500));
    if (looksLikeAuthFault(rawText)) {
      return errorResponse(502, {
        error: 'AUTH_ERROR',
        message: '서비스 일시 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
    }
    return errorResponse(503, {
      error: 'UPSTREAM_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }

  const resultCode = data.response?.header?.resultCode;
  if (resultCode !== '00') {
    console.error('[api/dust] AirKorea result error:', resultCode, data.response?.header?.resultMsg);
    if (AUTH_RESULT_CODES.has(resultCode)) {
      return errorResponse(502, {
        error: 'AUTH_ERROR',
        message: '서비스 일시 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
    }
    if (RATE_LIMIT_RESULT_CODES.has(resultCode)) {
      return errorResponse(429, {
        error: 'RATE_LIMITED',
        message: '요청이 많아 잠시 지연되고 있습니다. 잠시 후 다시 시도해주세요.',
      });
    }
    return errorResponse(503, {
      error: 'UPSTREAM_ERROR',
      message: '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    });
  }

  const items = data.response.body?.items ?? [];
  if (items.length === 0) {
    return errorResponse(404, {
      error: 'NO_DATA',
      message: '해당 지역의 측정 데이터를 찾을 수 없습니다.',
    });
  }

  // AirKorea returns newest-first.
  const [latest, ...rest] = items;
  const current: RealtimeReading = {
    dataTime: latest.dataTime,
    pm10Value: parseValue(latest.pm10Value),
    pm25Value: parseValue(latest.pm25Value),
    khaiGrade: parseGrade(latest.khaiGrade),
    pm10Grade: parseGrade(latest.pm10Grade),
    pm25Grade: parseGrade(latest.pm25Grade),
  };

  // 차트는 시간 순(오래된 -> 최신)으로 그리므로 뒤집는다.
  const hourly: HourlyPoint[] = [latest, ...rest]
    .map((item) => ({
      dataTime: item.dataTime,
      pm10Value: parseValue(item.pm10Value),
      pm25Value: parseValue(item.pm25Value),
    }))
    .reverse();

  const body: DustApiSuccess = { city, station: stationName, current, hourly };
  return NextResponse.json(body);
}
