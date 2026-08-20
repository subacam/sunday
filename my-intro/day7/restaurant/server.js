// 순수 Node.js(프레임워크 없음). api.kcisa.kr 서비스키를 서버 쪽에만 두고,
// 프론트(index.html)는 이 서버의 /api/restaurants만 호출한다. (PRD 5.4, 6장)
//
// 실제 API로 확인한 사실(PRD 9장 오픈이슈 보완):
//  - 기본 응답은 XML이지만, `Accept: application/json` 헤더를 보내면 JSON으로 내려준다.
//    (Swagger 문서 예시가 이 헤더를 쓰길래 확인함 — 헤더 없이는 계속 XML만 온다.)
//  - areaNm/clNm 필터는 정상 동작하지만, 반드시 UTF-8로 percent-encoding해야 한다.
//    (관련 없어 보이지만 중요: 로케일에 따라 값이 EUC-KR 등으로 잘못 인코딩되면
//     서버가 아무 것도 매칭하지 못해 빈 결과만 돌아온다. URLSearchParams는 항상
//     UTF-8이라 안전하다.)
//  - totalCount는 조건과 무관하게 항상 같은 값(전체 데이터 건수로 추정)이라 신뢰할 수
//    없다. 화면에는 그대로 노출하지 않는다.
//  - 응답이 자주 느리다(실측 10~40초대, 데이터 양/필터 유무와 상관없이 들쭉날쭉).
//    타임아웃을 넉넉히 잡아야 정상 응답도 실패로 처리하지 않는다.
//  - JSON 변환 특성상 결과가 0건이면 items가 빈 문자열("")로, 1건이면 items.item이
//    배열이 아니라 객체 하나로 온다. 배열로 정규화해서 다뤄야 한다.
//
// 위 이유로 응답이 느려서(10~40초) 매번 그대로 쓰면 체감상 못 쓸 정도다. 지역×카테고리
// 조합이 최대 136가지(17개 지역 × 8개 카테고리)뿐이고 데이터 갱신도 드물어서(PRD 6장
// 제안대로) 서버 메모리에 조건별로 캐싱한다. 같은 조건이 캐싱 전에 동시에 여러 번 들어와도
// 업스트림을 한 번만 부르도록 in-flight 요청도 공유한다.

const http = require("http");
const fs = require("fs");
const path = require("path");

try {
  process.loadEnvFile(path.join(__dirname, ".env.local"));
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

const PORT = process.env.PORT || 3000;
const SERVICE_KEY = process.env.KCISA_SERVICE_KEY;
const KCISA_ENDPOINT = "https://api.kcisa.kr/openapi/API_CNV_063/request";

const ALLOWED_CATEGORIES = ["한식", "분식", "치킨", "동양식", "서양식", "패스트푸드", "뷔페", "퓨전"];

if (!SERVICE_KEY) {
  console.warn("[경고] KCISA_SERVICE_KEY가 없습니다. .env.local을 확인하세요 (.env.example 참고).");
}

const ITEM_FIELDS = ["rstrNm", "rstrBhfNm", "rstrClNm", "rstrRoadAddr", "rstrLnbrAddr", "rstrInfoStdDt", "title"];

// items가 0건이면 ""(빈 문자열), 1건이면 item이 배열이 아니라 객체 하나로 온다.
function normalizeItems(items) {
  if (!items || typeof items !== "object") return [];
  const item = items.item;
  if (!item) return [];
  const list = Array.isArray(item) ? item : [item];
  return list.map((raw) => {
    const out = {};
    for (const field of ITEM_FIELDS) out[field] = raw[field] || "";
    return out;
  });
}

function parseRestaurantJson(json) {
  const body = (json && json.response && json.response.body) || {};
  const header = (json && json.response && json.response.header) || {};
  return {
    resultCode: header.resultCode || "",
    resultMsg: header.resultMsg || "",
    numOfRows: Number(body.numOfRows) || 0,
    pageNo: Number(body.pageNo) || 1,
    items: normalizeItems(body.items),
  };
}

// 실측 결과 이 API는 데이터 양/필터 유무와 무관하게 10~40초대까지 느려질 수 있다.
// 정상 응답도 실패로 처리하지 않도록 넉넉히 잡는다. 진짜로 안 오는 경우(네트워크 단절
// 등)에만 재시도한다 — 느려서 타임아웃난 요청을 또 기다리면 사용자만 더 오래 기다린다.
const UPSTREAM_TIMEOUT_MS = 45000;

function fetchKcisa(params, attempt = 1) {
  const url = KCISA_ENDPOINT + "?" + params.toString();
  return fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  })
    .then((res) => {
      if (!res.ok) {
        if (res.status >= 500 && attempt < 2) {
          return fetchKcisa(params, attempt + 1);
        }
        throw new Error("upstream_" + res.status);
      }
      return res.json();
    });
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // PRD 6장 제안: 동일 조건 1일 캐싱
const cache = new Map(); // key -> { data, expiresAt }
const pending = new Map(); // key -> 진행 중인 업스트림 호출 Promise (중복 호출 방지)

function cacheKey(areaNm, clNm, pageNo, numOfRows) {
  return areaNm + "|" + clNm + "|" + pageNo + "|" + numOfRows;
}

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

function handleRestaurantsApi(req, res, query) {
  const areaNm = (query.get("areaNm") || "").trim();
  const clNm = (query.get("clNm") || "").trim();
  const pageNo = query.get("pageNo") || "1";
  const numOfRows = query.get("numOfRows") || "10";

  if (!areaNm || !clNm) {
    sendJson(res, 400, { error: "areaNm, clNm은 필수입니다." });
    return;
  }
  if (!ALLOWED_CATEGORIES.includes(clNm)) {
    sendJson(res, 400, { error: "clNm은 " + ALLOWED_CATEGORIES.join("/") + " 중 하나여야 합니다." });
    return;
  }
  if (!SERVICE_KEY) {
    sendJson(res, 500, { error: "서버에 KCISA_SERVICE_KEY가 설정되어 있지 않습니다." });
    return;
  }

  const key = cacheKey(areaNm, clNm, pageNo, numOfRows);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    sendJson(res, 200, cached.data);
    return;
  }

  let promise = pending.get(key);
  if (!promise) {
    const params = new URLSearchParams({ serviceKey: SERVICE_KEY, areaNm, clNm, pageNo, numOfRows });
    promise = fetchKcisa(params)
      .then((json) => {
        const parsed = parseRestaurantJson(json);
        if (parsed.resultCode && parsed.resultCode !== "0000") {
          const err = new Error("upstream_error");
          err.resultCode = parsed.resultCode;
          err.resultMsg = parsed.resultMsg;
          throw err;
        }
        // totalCount는 실측 결과 신뢰할 수 없어(조건 무관 고정값) 응답에서 제외한다.
        const data = { pageNo: parsed.pageNo, numOfRows: parsed.numOfRows, items: parsed.items };
        cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
        return data;
      })
      .finally(() => pending.delete(key));
    pending.set(key, promise);
  }

  promise
    .then((data) => sendJson(res, 200, data))
    .catch((err) => {
      if (err.resultCode) {
        sendJson(res, 502, { error: "upstream_error", resultCode: err.resultCode, resultMsg: err.resultMsg });
        return;
      }
      console.error("[api] kcisa 호출 실패:", err.message);
      sendJson(res, 502, { error: "upstream_unavailable" });
    });
}

// index.html이 참조하는 정적 파일(theme.js, app.js 등)을 허용 목록으로만 서빙한다.
// 디렉터리 밖 경로(../ 등)를 절대 열어주지 않기 위해 임의 경로 대신 화이트리스트를 쓴다.
const STATIC_FILES = {
  "/": { file: "index.html", type: "text/html; charset=utf-8" },
  "/index.html": { file: "index.html", type: "text/html; charset=utf-8" },
  "/theme.js": { file: "theme.js", type: "text/javascript; charset=utf-8" },
  "/app.js": { file: "app.js", type: "text/javascript; charset=utf-8" },
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

  if (req.method === "GET" && url.pathname === "/api/restaurants") {
    handleRestaurantsApi(req, res, url.searchParams);
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
  console.log("CityBite Tour 서버 실행 중: http://localhost:" + PORT);
});
