// 순수 Node.js(프레임워크 없음). 카카오 로컬 API REST 키를 서버 쪽에만 두고,
// 프론트(index.html)는 이 서버의 /api/places만 호출한다. day7/restaurant/server.js와
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

const UPSTREAM_TIMEOUT_MS = 8000;

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

// ---- 위치 정보(place-info): 가게별 사진·설명·핀·"도움이 됐어요"를 저장하는 아주 작은
// 파일 기반 저장소. 별도 DB 없이 day4/data/place-info.json 하나에 { placeId: [entry, ...] }
// 형태로 저장한다 — day4 규모(데모 프로젝트)에서는 이 정도로 충분하고, 서버를 재시작해도
// 데이터가 남는다. PRD 5.5는 등록을 위해 로그인을 요구하지만, 이번 구현은 익명 등록을
// 허용한다(author가 비어 있으면 "익명"으로 저장).
const DATA_DIR = path.join(__dirname, "data");
const PLACE_INFO_FILE = path.join(DATA_DIR, "place-info.json");

function readPlaceInfoStore() {
  try {
    return JSON.parse(fs.readFileSync(PLACE_INFO_FILE, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("[data] place-info.json 읽기 실패, 빈 상태로 시작합니다:", err.message);
    }
    return {};
  }
}

function writePlaceInfoStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(PLACE_INFO_FILE, JSON.stringify(store, null, 2), "utf8");
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
  const store = readPlaceInfoStore();
  const entries = (store[placeId] || [])
    .slice()
    .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  sendJson(res, 200, { entries: entries });
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

      const entry = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
        author: author,
        text: text,
        photoUrl: photoUrl,
        pinX: Number.isFinite(pinX) && pinX >= 0 && pinX <= 100 ? Math.round(pinX * 10) / 10 : null,
        pinY: Number.isFinite(pinY) && pinY >= 0 && pinY <= 100 ? Math.round(pinY * 10) / 10 : null,
        helpfulCount: 0,
        createdAt: new Date().toISOString(),
      };

      const store = readPlaceInfoStore();
      if (!Array.isArray(store[placeId])) store[placeId] = [];
      store[placeId].push(entry);
      writePlaceInfoStore(store);

      sendJson(res, 201, { entry: entry });
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
      const store = readPlaceInfoStore();
      const list = store[placeId] || [];
      const entry = list.find((e) => e.id === entryId);
      if (!entry) {
        sendJson(res, 404, { error: "ENTRY_NOT_FOUND", message: "해당 정보를 찾을 수 없습니다." });
        return;
      }
      entry.helpfulCount = (entry.helpfulCount || 0) + 1;
      writePlaceInfoStore(store);
      sendJson(res, 200, { helpfulCount: entry.helpfulCount });
    })
    .catch(() => {
      sendJson(res, 400, { error: "INVALID_JSON", message: "요청 형식이 올바르지 않습니다." });
    });
}

// index.html / place.html 모두 자체 완결(Tailwind CDN + Google Fonts CDN, 로컬 자산 없음)
// 이라 화이트리스트에는 두 HTML 파일만 있으면 된다. 디렉터리 밖 경로를 절대 열어주지 않기
// 위해 임의 경로 대신 화이트리스트를 쓴다(day7/restaurant/server.js와 동일한 접근).
const STATIC_FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/place.html": { file: "place.html", type: "text/html; charset=utf-8" },
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

  if (req.method === "GET" && url.pathname === "/api/places") {
    handlePlacesApi(req, res, url.searchParams);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/place-reviews") {
    handlePlaceReviewsApi(req, res, url.searchParams);
    return;
  }
  if (req.method === "GET" && url.pathname === "/api/place-info") {
    handleGetPlaceInfo(req, res, url.searchParams);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/place-info") {
    handlePostPlaceInfo(req, res);
    return;
  }
  if (req.method === "POST" && url.pathname === "/api/place-info/helpful") {
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
