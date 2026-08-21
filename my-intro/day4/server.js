// 순수 Node.js(프레임워크 없음). 카카오 로컬 API REST 키를 서버 쪽에만 두고,
// 프론트(index.html)는 이 서버의 /api/day4/places만 호출한다. day7/restaurant/server.js와
// 같은 패턴 — package.json도 node_modules도 없이 내장 http 모듈만 쓴다.
//
// 카카오 로컬 검색(키워드) API는 Authorization: KakaoAK {REST_API_KEY} 헤더가 필요하고
// CORS를 지원하지 않아 브라우저에서 직접 호출할 수 없다. 반드시 서버를 거쳐야 한다.

const http = require("http");
const fs = require("fs");
const path = require("path");

try {
  process.loadEnvFile(path.join(__dirname, ".env.local"));
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

const PORT = process.env.PORT || 3400;
const RAW_KEY = process.env.KAKAO_REST_API_KEY || "";
// .env.local에는 실제 값이 채워지기 전까지 TODO placeholder가 들어있다 — 그 상태를
// "키 없음"과 동일하게 취급해 업스트림 호출을 아예 시도하지 않는다.
const KAKAO_REST_API_KEY = RAW_KEY && !/^TODO/i.test(RAW_KEY) ? RAW_KEY : "";
const KAKAO_ENDPOINT = "https://dapi.kakao.com/v2/local/search/keyword.json";

if (!KAKAO_REST_API_KEY) {
  console.warn("[경고] KAKAO_REST_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요 (.env.example 참고).");
}

const RAW_GOOGLE_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const GOOGLE_PLACES_API_KEY = RAW_GOOGLE_KEY && !/^TODO/i.test(RAW_GOOGLE_KEY) ? RAW_GOOGLE_KEY : "";
const GOOGLE_TEXTSEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
// 요청 필드를 정확히 5개(이름·별점·리뷰개수·리뷰·지도 링크)로 제한한다 — Places API (New)는
// 필드마스크에 넣은 필드 수/종류에 따라 과금 등급이 달라지므로, 여기 넣는 필드를 늘릴 땐
// 신중해야 한다.
const GOOGLE_FIELD_MASK = "places.displayName,places.rating,places.userRatingCount,places.reviews,places.googleMapsUri";
const GOOGLE_MATCH_RADIUS_METERS = 150; // 도보 약 2분 — "같은 이름의 다른 지점"을 걸러내기 위한 강제 반경

if (!GOOGLE_PLACES_API_KEY) {
  console.warn("[경고] GOOGLE_PLACES_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요 (.env.example 참고).");
}

const RAW_GEMINI_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_API_KEY = RAW_GEMINI_KEY && !/^TODO/i.test(RAW_GEMINI_KEY) ? RAW_GEMINI_KEY : "";
// 모델명은 비밀값이 아니라 TODO 가드가 필요 없다 — 구글이 모델 라인업을 자주 바꾸므로,
// 코드 수정 없이 .env.local에서 한 줄로 바꿀 수 있게 환경변수로 뺐다.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

if (!GEMINI_API_KEY) {
  console.warn("[경고] GEMINI_API_KEY가 설정되지 않았습니다. .env.local을 확인하세요 (.env.example 참고).");
}

// place-info(위치 정보 제보) 저장소를 Supabase Postgres에 둔다. anon(publishable) 키만
// 쓴다 — RLS의 public select/insert 정책이 지금 서버가 하는 것과 같은 권한이라 service
// role 키가 필요 없다. 카카오/구글/제미나이 키와 달리 비밀값이 아니므로 TODO 가드도 없다.
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("[경고] SUPABASE_URL/SUPABASE_ANON_KEY가 설정되지 않았습니다. .env.local을 확인하세요 (.env.example 참고).");
}

const UPSTREAM_TIMEOUT_MS = 8000;
// LLM 생성은 검색류 API보다 느리고 편차가 크다 — 검색 프록시들과 같은 8초를 쓰면 "분석 중"
// 상태가 너무 자주 타임아웃으로 끊길 수 있어 별도로 더 길게 잡는다. (실측: thinkingBudget을
// 안 주면 9~35초까지 편차가 컸고, thinkingBudget을 낮게 주면 2~5초로 안정됐다 — 그래도
// 가끔의 느린 응답을 위해 여유를 둔다.)
const GEMINI_TIMEOUT_MS = 15000;

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

// place_url 끝의 숫자가 카카오맵 고유 장소 ID다 — 위치 정보(place-info) 저장의 키로 쓴다.
function extractPlaceId(doc) {
  const match = /(\d+)\s*$/.exec(doc.place_url || "");
  return match ? match[1] : "";
}

// 카카오 응답 하나(document)를 프론트가 쓰기 편한 최소 형태로 재구성한다.
function reshapePlace(doc) {
  const categorySegments = (doc.category_name || "").split(">").map((s) => s.trim()).filter(Boolean);
  return {
    id: extractPlaceId(doc),
    name: doc.place_name || "",
    category: categorySegments.length ? categorySegments[categorySegments.length - 1] : "",
    address: doc.road_address_name || doc.address_name || "",
    phone: doc.phone || "",
    lat: doc.y || "",
    lng: doc.x || "",
    url: doc.place_url || "",
  };
}

function fetchKakao(query) {
  const params = new URLSearchParams({ query });
  const url = KAKAO_ENDPOINT + "?" + params.toString();
  return fetch(url, {
    headers: { Authorization: "KakaoAK " + KAKAO_REST_API_KEY },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

function handlePlacesApi(req, res, query) {
  const q = (query.get("query") || "").trim();

  if (!q) {
    sendJson(res, 400, { error: "MISSING_QUERY", message: "검색어를 입력해 주세요." });
    return;
  }

  if (!KAKAO_REST_API_KEY) {
    sendJson(res, 500, {
      error: "SERVER_NOT_CONFIGURED",
      message: "서버에 카카오 API 키가 설정되지 않았습니다.",
    });
    return;
  }

  fetchKakao(q)
    .then((upstreamRes) => {
      if (upstreamRes.ok) {
        return upstreamRes.json().then((json) => {
          const documents = Array.isArray(json.documents) ? json.documents : [];
          sendJson(res, 200, { places: documents.map(reshapePlace) });
        });
      }

      // 업스트림 상태/본문을 그대로 클라이언트에 노출하지 않고, 닫힌 오류 코드 집합으로만 매핑한다.
      if (upstreamRes.status === 401) {
        console.error("[api] 카카오 인증 실패 (401) — REST API 키를 확인하세요.");
        sendJson(res, 502, { error: "UPSTREAM_AUTH_ERROR", message: "검색 서비스 인증에 실패했습니다." });
        return;
      }
      if (upstreamRes.status === 429) {
        sendJson(res, 502, { error: "UPSTREAM_RATE_LIMITED", message: "요청이 많아 잠시 후 다시 시도해 주세요." });
        return;
      }
      console.error("[api] 카카오 API 오류 상태: " + upstreamRes.status);
      sendJson(res, 502, { error: "UPSTREAM_ERROR", message: "검색 서비스에 일시적인 문제가 있습니다." });
    })
    .catch((err) => {
      console.error("[api] 카카오 호출 실패:", err.message);
      sendJson(res, 502, { error: "UPSTREAM_UNAVAILABLE", message: "검색 서비스에 연결할 수 없습니다." });
    });
}

// ---- 구글 리뷰(place-reviews): Places API (New)로 가게의 평점·리뷰를 가져온다. 서버 쪽
// 영속 저장은 하지 않는다(요청되지 않음) — 캐싱은 place.html의 localStorage에서만 한다.

// locationRestriction(강제 필터)은 rectangle만 지원하고 circle은 지원하지 않는다
// (circle은 locationBias, 즉 단순 "선호"에서만 쓸 수 있다). "150m 이내만 찾도록"은 강제
// 필터가 필요하므로, 좌표를 중심으로 한 정사각형 바운딩 박스를 계산해 rectangle로 보낸다.
// 대각선 방향으로는 최대 ~212m까지 포함되는 근사치이지만, 요구사항 자체가 "약 150m(도보
// 2분)"이므로 허용 가능한 근사로 판단했다 — 원을 다시 쓰겠다고 되돌리지 말 것.
function buildLocationRestrictionBox(lat, lng) {
  const latDelta = GOOGLE_MATCH_RADIUS_METERS / 111320;
  const lngDelta = GOOGLE_MATCH_RADIUS_METERS / (111320 * Math.cos((lat * Math.PI) / 180));
  return {
    rectangle: {
      low: { latitude: lat - latDelta, longitude: lng - lngDelta },
      high: { latitude: lat + latDelta, longitude: lng + lngDelta },
    },
  };
}

function fetchGooglePlaceReviews(name, lat, lng) {
  const body = {
    textQuery: name,
    locationRestriction: buildLocationRestrictionBox(lat, lng),
    languageCode: "ko",
    regionCode: "KR",
    pageSize: 1,
  };
  return fetch(GOOGLE_TEXTSEARCH_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": GOOGLE_PLACES_API_KEY,
      "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

// 구글 응답(Place) 하나를 프론트가 쓰기 편한 최소 형태로 재구성한다.
// displayName은 문자열이 아니라 { text, languageCode } 객체다 — .text로 읽어야 한다.
function reshapeGooglePlace(place) {
  const reviews = Array.isArray(place.reviews) ? place.reviews : [];
  return {
    name: (place.displayName && place.displayName.text) || "",
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : 0,
    mapUrl: place.googleMapsUri || "",
    reviews: reviews.map((r) => ({
      author: (r.authorAttribution && r.authorAttribution.displayName) || "익명",
      rating: typeof r.rating === "number" ? r.rating : null,
      relativeTime: r.relativePublishTimeDescription || "",
      text: (r.text && r.text.text) || "",
    })),
  };
}

function handlePlaceReviewsApi(req, res, query) {
  const name = (query.get("name") || "").trim();
  const rawLat = (query.get("lat") || "").trim();
  const rawLng = (query.get("lng") || "").trim();
  const lat = Number(rawLat);
  const lng = Number(rawLng);

  if (!name) {
    sendJson(res, 400, { error: "MISSING_NAME", message: "가게 이름이 필요합니다." });
    return;
  }
  // 빈 문자열은 Number()가 0으로 변환해 Number.isFinite를 통과해버리므로, 원본 문자열이
  // 비어 있는지부터 먼저 확인한다 (좌표 없음을 "적도/본초자오선"으로 오인하지 않도록).
  if (!rawLat || !rawLng || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    sendJson(res, 400, { error: "MISSING_COORDS", message: "가게 좌표가 필요합니다." });
    return;
  }
  if (!GOOGLE_PLACES_API_KEY) {
    sendJson(res, 500, {
      error: "SERVER_NOT_CONFIGURED",
      message: "서버에 구글 API 키가 설정되지 않았습니다.",
    });
    return;
  }

  fetchGooglePlaceReviews(name, lat, lng)
    .then((upstreamRes) => {
      if (upstreamRes.ok) {
        return upstreamRes.json().then((json) => {
          const places = Array.isArray(json.places) ? json.places : [];
          if (places.length === 0) {
            sendJson(res, 200, { found: false });
            return;
          }
          sendJson(res, 200, { found: true, place: reshapeGooglePlace(places[0]) });
        });
      }

      // 업스트림 상태/본문을 그대로 클라이언트에 노출하지 않고, 닫힌 오류 코드 집합으로만
      // 매핑한다. 구글은 401뿐 아니라 403(권한/API 미사용 설정)도 인증 오류로 쓴다.
      if (upstreamRes.status === 401 || upstreamRes.status === 403) {
        console.error("[api] 구글 인증 실패 (" + upstreamRes.status + ") — API 키와 'Places API (New)' 활성화 여부를 확인하세요.");
        sendJson(res, 502, { error: "UPSTREAM_AUTH_ERROR", message: "리뷰 서비스 인증에 실패했습니다." });
        return;
      }
      if (upstreamRes.status === 429) {
        sendJson(res, 502, { error: "UPSTREAM_RATE_LIMITED", message: "요청이 많아 잠시 후 다시 시도해 주세요." });
        return;
      }
      console.error("[api] 구글 Places API 오류 상태: " + upstreamRes.status);
      sendJson(res, 502, { error: "UPSTREAM_ERROR", message: "리뷰 서비스에 일시적인 문제가 있습니다." });
    })
    .catch((err) => {
      console.error("[api] 구글 Places API 호출 실패:", err.message);
      sendJson(res, 502, { error: "UPSTREAM_UNAVAILABLE", message: "리뷰 서비스에 연결할 수 없습니다." });
    });
}

// ---- 리뷰 AI 분석(place-review-analysis): 이미 클라이언트가 갖고 있는 구글 리뷰 텍스트를
// 받아 제미나이로 감정 분류·키워드·한줄 요약을 만든다. 구글 Places를 다시 호출하지 않는다.
// 서버 쪽 영속 저장은 없다(캐싱은 place.html의 localStorage에서만 한다).

function buildAnalysisPrompt(name, reviews) {
  const reviewLines = reviews
    .map((r, i) => (i + 1) + ". (별점 " + r.rating + ") " + r.text)
    .join("\n");
  return [
    "너는 한국어 리뷰 분석 도우미다. \"" + name + "\"라는 가게의 구글 리뷰 " + reviews.length + "개가 아래에 있다.",
    "",
    reviewLines,
    "",
    "아래 세 가지를 분석해서 요청한 JSON 스키마 형태로만 답하라:",
    "1. 각 리뷰를 긍정/보통/부정으로 분류한 뒤 각각 몇 개인지 센다(positive/neutral/negative 정수).",
    "2. 리뷰에 자주 나오는 핵심 단어를 8~15개 뽑는다(리뷰 개수가 적어 8개를 채우기 어려우면 8개보다 적어도 된다 — 억지로 만들어내지 마라). 음식 이름·맛·분위기·서비스 위주로 고르고, 각 단어마다 1~10점의 중요도 점수와 좋은 맥락(good)인지 나쁜 맥락(bad)인지를 함께 준다.",
    "3. 이 가게 리뷰 전체를 한국어 한 문장으로 요약한다.",
    "",
    "리뷰 원문이 한국어가 아니어도 출력(요약·키워드)은 반드시 한국어로 작성하라.",
  ].join("\n");
}

function buildAnalysisResponseSchema() {
  return {
    type: "OBJECT",
    properties: {
      sentiment: {
        type: "OBJECT",
        properties: {
          positive: { type: "INTEGER" },
          neutral: { type: "INTEGER" },
          negative: { type: "INTEGER" },
        },
        required: ["positive", "neutral", "negative"],
      },
      keywords: {
        type: "ARRAY",
        maxItems: 15,
        items: {
          type: "OBJECT",
          properties: {
            word: { type: "STRING" },
            score: { type: "INTEGER" },
            sentiment: { type: "STRING", enum: ["good", "bad"] },
          },
          required: ["word", "score", "sentiment"],
        },
      },
      summary: { type: "STRING" },
    },
    required: ["sentiment", "keywords", "summary"],
  };
}

function fetchGeminiAnalysis(name, reviews) {
  const body = {
    contents: [{ role: "user", parts: [{ text: buildAnalysisPrompt(name, reviews) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: buildAnalysisResponseSchema(),
      temperature: 0.2,
      maxOutputTokens: 2048,
      // gemini-3.6-flash는 응답 전에 내부적으로 "생각" 토큰을 쓰는데, 기본값(제한 없음)으로
      // 두면 리뷰 5개짜리 요청도 9~35초까지 걸릴 만큼 편차가 컸다. 이 작업은 정해진 스키마로
      // 사실을 추출/집계하는 정도라 깊은 추론이 필요 없어, budget을 낮게 고정해 2~5초로
      // 안정시켰다(응답 품질 저하는 테스트에서 확인되지 않았다).
      thinkingConfig: { thinkingBudget: 512 },
    },
  };
  // 구글 Places와 달리 제미나이는 키를 헤더가 아니라 쿼리 파라미터로 받는다 — 다른 두
  // 엔드포인트와 "통일"하겠다고 헤더로 바꾸지 말 것, 그러면 인증이 깨진다.
  const url = GEMINI_ENDPOINT_BASE + encodeURIComponent(GEMINI_MODEL) + ":generateContent?key=" + GEMINI_API_KEY;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });
}

// 제미나이 응답에서 실제 생성물은 candidates[0].content.parts[0].text에 "문자열"로 들어있어
// JSON.parse가 한 번 더 필요하다. 구조화 출력 모드라도 안전 필터에 걸리거나 형태가 깨질 수
// 있으니 최소한의 형태 검증만 하고, 실패하면 null을 돌려준다(reshapeGooglePlace의
// typeof ... === "number" ? ... : null 가드와 같은 수준 — 과한 재검증은 하지 않는다).
function parseGeminiAnalysis(json) {
  try {
    const text = json.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(text);
    const sentiment = parsed.sentiment;
    if (
      !sentiment ||
      typeof sentiment.positive !== "number" ||
      typeof sentiment.neutral !== "number" ||
      typeof sentiment.negative !== "number" ||
      !Array.isArray(parsed.keywords) ||
      typeof parsed.summary !== "string"
    ) {
      return null;
    }
    return {
      sentiment: { positive: sentiment.positive, neutral: sentiment.neutral, negative: sentiment.negative },
      keywords: parsed.keywords
        .filter((k) => k && typeof k.word === "string" && typeof k.score === "number")
        .map((k) => ({
          word: k.word,
          score: k.score,
          sentiment: k.sentiment === "bad" ? "bad" : "good",
        })),
      summary: parsed.summary,
    };
  } catch (err) {
    return null;
  }
}

function handlePlaceReviewAnalysisApi(req, res) {
  readJsonBody(req, 50000)
    .then((body) => {
      const name = String(body.name || "").trim();
      const reviews = Array.isArray(body.reviews) ? body.reviews : null;

      if (!name) {
        sendJson(res, 400, { error: "MISSING_NAME", message: "가게 이름이 필요합니다." });
        return;
      }
      if (!reviews) {
        sendJson(res, 400, { error: "INVALID_REVIEWS", message: "리뷰 목록이 필요합니다." });
        return;
      }
      if (reviews.length === 0) {
        sendJson(res, 400, { error: "EMPTY_REVIEWS", message: "분석할 리뷰가 없습니다." });
        return;
      }
      if (!GEMINI_API_KEY) {
        sendJson(res, 500, {
          error: "SERVER_NOT_CONFIGURED",
          message: "서버에 제미나이 API 키가 설정되지 않았습니다.",
        });
        return;
      }

      // 클라이언트가 뭐라 주장하든 서버가 방어적으로 상한선을 건다 — 이 엔드포인트는 임의
      // 텍스트를 가장 비싼 업스트림(LLM)에 그대로 넘기는 유일한 엔드포인트라 남용 벡터가 크다.
      const cappedReviews = reviews.slice(0, 30).map((r) => ({
        rating: typeof r.rating === "number" ? r.rating : 0,
        text: String((r && r.text) || "").slice(0, 1000),
      }));

      fetchGeminiAnalysis(name, cappedReviews)
        .then((upstreamRes) => {
          if (upstreamRes.ok) {
            return upstreamRes.json().then((json) => {
              const analysis = parseGeminiAnalysis(json);
              if (!analysis) {
                console.error("[api] 제미나이 응답 파싱 실패 — 스키마/모델명을 확인하세요.");
                sendJson(res, 502, { error: "ANALYSIS_UNPARSEABLE", message: "리뷰 분석 결과를 해석하지 못했습니다." });
                return;
              }
              sendJson(res, 200, analysis);
            });
          }

          if (upstreamRes.status === 401 || upstreamRes.status === 403) {
            console.error("[api] 제미나이 인증 실패 (" + upstreamRes.status + ") — API 키를 확인하세요.");
            sendJson(res, 502, { error: "UPSTREAM_AUTH_ERROR", message: "분석 서비스 인증에 실패했습니다." });
            return;
          }
          if (upstreamRes.status === 429) {
            sendJson(res, 502, { error: "UPSTREAM_RATE_LIMITED", message: "요청이 많아 잠시 후 다시 시도해 주세요." });
            return;
          }
          console.error("[api] 제미나이 API 오류 상태: " + upstreamRes.status);
          sendJson(res, 502, { error: "UPSTREAM_ERROR", message: "분석 서비스에 일시적인 문제가 있습니다." });
        })
        .catch((err) => {
          console.error("[api] 제미나이 API 호출 실패:", err.message);
          sendJson(res, 502, { error: "UPSTREAM_UNAVAILABLE", message: "분석 서비스에 연결할 수 없습니다." });
        });
    })
    .catch((err) => {
      if (err.code === "TOO_LARGE") {
        sendJson(res, 413, { error: "PAYLOAD_TOO_LARGE", message: "요청이 너무 큽니다." });
        return;
      }
      sendJson(res, 400, { error: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." });
    });
}

// ---- 위치 정보(place-info): 가게별 사진·설명·핀·"도움이 됐어요"를 Supabase Postgres
// (place_info_entries 테이블)에 저장한다. anon 키로 PostgREST를 fetch()로 직접 호출한다 —
// 카카오/구글/제미나이 프록시와 같은 패턴(전역 fetch, AbortSignal.timeout)이고 별도 SDK는
// 설치하지 않는다. PRD 5.5는 등록을 위해 로그인을 요구하지만, 이번 구현은 익명 등록을
// 허용한다(author가 비어 있으면 "익명"으로 저장) — DB의 RLS(select/insert를 anon에게도
// 허용)도 이 규칙을 그대로 반영한다. helpful 증가는 원자적 RPC
// (increment_place_info_helpful)로 처리해 예전 파일 기반 구현의 읽기→+1→쓰기 경쟁 조건을
// 없앴다.
const SUPABASE_REST_BASE = SUPABASE_URL + "/rest/v1";

function supabaseHeaders(extra) {
  return Object.assign(
    {
      apikey: SUPABASE_ANON_KEY,
      Authorization: "Bearer " + SUPABASE_ANON_KEY,
    },
    extra || {}
  );
}

// DB row(snake_case) -> 기존 클라이언트 계약(camelCase) 형태로 재구성한다. 라우트/응답
// 모양은 파일 기반 구현 때와 동일하게 유지해 place.html은 손댈 필요가 없다.
function reshapePlaceInfoEntry(row) {
  return {
    id: row.id,
    author: row.author,
    text: row.text,
    photoUrl: row.photo_url || "",
    pinX: row.pin_x === null || row.pin_x === undefined ? null : Number(row.pin_x),
    pinY: row.pin_y === null || row.pin_y === undefined ? null : Number(row.pin_y),
    helpfulCount: row.helpful_count || 0,
    createdAt: row.created_at,
  };
}

function fetchPlaceInfoEntries(placeId) {
  const params = new URLSearchParams({ place_id: "eq." + placeId, order: "created_at.desc" });
  return fetch(SUPABASE_REST_BASE + "/place_info_entries?" + params.toString(), {
    headers: supabaseHeaders(),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

function insertPlaceInfoEntry(row) {
  return fetch(SUPABASE_REST_BASE + "/place_info_entries", {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

function incrementPlaceInfoHelpful(entryId) {
  return fetch(SUPABASE_REST_BASE + "/rpc/increment_place_info_helpful", {
    method: "POST",
    headers: supabaseHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({ p_entry_id: entryId }),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

// 프레임워크가 없으니 요청 본문을 직접 모아 JSON으로 파싱한다.
function readJsonBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("payload too large"), { code: "TOO_LARGE" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(Object.assign(new Error("invalid json"), { code: "INVALID_JSON" }));
      }
    });
    req.on("error", reject);
  });
}

function handleGetPlaceInfo(req, res, query) {
  const placeId = (query.get("id") || "").trim();
  if (!placeId) {
    sendJson(res, 400, { error: "MISSING_ID", message: "가게 id가 필요합니다." });
    return;
  }
  fetchPlaceInfoEntries(placeId)
    .then((upstreamRes) => {
      if (!upstreamRes.ok) {
        console.error("[data] place-info 조회 실패, 상태: " + upstreamRes.status);
        sendJson(res, 502, { error: "UPSTREAM_ERROR", message: "위치 정보를 불러오지 못했습니다." });
        return;
      }
      return upstreamRes.json().then((rows) => {
        sendJson(res, 200, { entries: (Array.isArray(rows) ? rows : []).map(reshapePlaceInfoEntry) });
      });
    })
    .catch((err) => {
      console.error("[data] place-info 조회 호출 실패:", err.message);
      sendJson(res, 502, { error: "UPSTREAM_UNAVAILABLE", message: "위치 정보 서비스에 연결할 수 없습니다." });
    });
}

function handlePostPlaceInfo(req, res) {
  readJsonBody(req, 20000)
    .then((body) => {
      const placeId = String(body.placeId || "").trim();
      const text = String(body.text || "").trim();
      let author = String(body.author || "").trim();
      const photoUrl = String(body.photoUrl || "").trim();
      const pinX = Number(body.pinX);
      const pinY = Number(body.pinY);

      if (!placeId) {
        sendJson(res, 400, { error: "MISSING_PLACE_ID", message: "가게 id가 필요합니다." });
        return;
      }
      if (!text) {
        sendJson(res, 400, { error: "MISSING_TEXT", message: "입구 설명을 입력해 주세요." });
        return;
      }
      if (text.length > 500) {
        sendJson(res, 400, { error: "TEXT_TOO_LONG", message: "설명은 500자 이내로 입력해 주세요." });
        return;
      }
      if (photoUrl && !/^https?:\/\//i.test(photoUrl)) {
        sendJson(res, 400, { error: "INVALID_PHOTO_URL", message: "사진 URL은 http(s)로 시작해야 합니다." });
        return;
      }
      if (photoUrl.length > 500) {
        sendJson(res, 400, { error: "PHOTO_URL_TOO_LONG", message: "사진 URL이 너무 깁니다." });
        return;
      }
      if (!author) author = "익명";
      author = author.slice(0, 30);

      const row = {
        place_id: placeId,
        author: author,
        text: text,
        photo_url: photoUrl,
        pin_x: Number.isFinite(pinX) && pinX >= 0 && pinX <= 100 ? Math.round(pinX * 10) / 10 : null,
        pin_y: Number.isFinite(pinY) && pinY >= 0 && pinY <= 100 ? Math.round(pinY * 10) / 10 : null,
      };

      insertPlaceInfoEntry(row)
        .then((upstreamRes) => {
          if (!upstreamRes.ok) {
            console.error("[data] place-info 등록 실패, 상태: " + upstreamRes.status);
            sendJson(res, 502, { error: "UPSTREAM_ERROR", message: "위치 정보를 저장하지 못했습니다." });
            return;
          }
          return upstreamRes.json().then((rows) => {
            const created = Array.isArray(rows) ? rows[0] : rows;
            sendJson(res, 201, { entry: reshapePlaceInfoEntry(created) });
          });
        })
        .catch((err) => {
          console.error("[data] place-info 등록 호출 실패:", err.message);
          sendJson(res, 502, { error: "UPSTREAM_UNAVAILABLE", message: "위치 정보 서비스에 연결할 수 없습니다." });
        });
    })
    .catch((err) => {
      if (err.code === "TOO_LARGE") {
        sendJson(res, 413, { error: "PAYLOAD_TOO_LARGE", message: "요청이 너무 큽니다." });
        return;
      }
      sendJson(res, 400, { error: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." });
    });
}

function handlePostPlaceInfoHelpful(req, res) {
  readJsonBody(req, 2000)
    .then((body) => {
      const placeId = String(body.placeId || "").trim();
      const entryId = String(body.entryId || "").trim();
      if (!placeId || !entryId) {
        sendJson(res, 400, { error: "MISSING_FIELDS", message: "placeId와 entryId가 필요합니다." });
        return;
      }
      incrementPlaceInfoHelpful(entryId)
        .then((upstreamRes) => {
          if (!upstreamRes.ok) {
            console.error("[data] place-info helpful 증가 실패, 상태: " + upstreamRes.status);
            sendJson(res, 502, { error: "UPSTREAM_ERROR", message: "처리에 실패했습니다." });
            return;
          }
          return upstreamRes.json().then((result) => {
            // RPC는 대상 row가 없으면(0건 업데이트) 예외 대신 null을 반환한다.
            if (result === null || result === undefined) {
              sendJson(res, 404, { error: "ENTRY_NOT_FOUND", message: "해당 정보를 찾을 수 없습니다." });
              return;
            }
            sendJson(res, 200, { helpfulCount: result });
          });
        })
        .catch((err) => {
          console.error("[data] place-info helpful 호출 실패:", err.message);
          sendJson(res, 502, { error: "UPSTREAM_UNAVAILABLE", message: "위치 정보 서비스에 연결할 수 없습니다." });
        });
    })
    .catch(() => {
      sendJson(res, 400, { error: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." });
    });
}

// index.html / place.html은 자체 완결(Tailwind CDN + Google Fonts CDN, 로컬 자산 없음)이라
// 화이트리스트에 원래 두 HTML 파일만 있었다. auth.js는 두 HTML이 공유하는 유일한 로컬
// 자산이라 여기 추가했다(day4/CLAUDE.md "로그인(Supabase Auth)" 절 참고). 디렉터리 밖
// 경로를 절대 열어주지 않기 위해 임의 경로 대신 화이트리스트를 쓴다(day7/restaurant/server.js와
// 동일한 접근).
const STATIC_FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/place.html": { file: "place.html", type: "text/html; charset=utf-8" },
  "/auth.js": { file: "auth.js", type: "text/javascript; charset=utf-8" },
};

function serveStatic(req, res, pathname) {
  const entry = STATIC_FILES[pathname];
  const filePath = path.join(__dirname, entry.file);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("not found");
      return;
    }
    res.writeHead(200, { "Content-Type": entry.type });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");

  // /api/day4/ 접두사가 붙은 다섯 엔드포인트는 모두 상태 없는 프록시(place-info류는
  // Supabase가 실제 영속 저장소)라 api/day4/*.js에 Vercel 서버리스 함수로도 똑같이
  // 존재한다(코드는 별도 복사본 — 로직을 고치면 두 곳 다 고칠 것, day4/CLAUDE.md
  // "Vercel 배포" 절 참고).
  if (req.method === "GET" && url.pathname === "/api/day4/places") {
    handlePlacesApi(req, res, url.searchParams);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/day4/place-reviews") {
    handlePlaceReviewsApi(req, res, url.searchParams);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/day4/place-review-analysis") {
    handlePlaceReviewAnalysisApi(req, res);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/day4/place-info") {
    handleGetPlaceInfo(req, res, url.searchParams);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/day4/place-info") {
    handlePostPlaceInfo(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/day4/place-info-helpful") {
    handlePostPlaceInfoHelpful(req, res);
    return;
  }
  if (req.method === "GET" && STATIC_FILES[url.pathname]) {
    serveStatic(req, res, url.pathname);
    return;
  }
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("not found");
});

server.listen(PORT, () => {
  console.log("가게 길찾기 서버 실행 중: http://localhost:" + PORT);
});
