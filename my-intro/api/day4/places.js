// Vercel 서버리스 함수판 카카오 로컬 검색 프록시. 로직은 day4/server.js의
// handlePlacesApi/fetchKakao/reshapePlace와 동일하되, Node http가 아니라 Vercel의
// req(.query가 이미 파싱된 객체)/res(.status().json() 제공) 인터페이스에 맞춰 다시 썼다.
// 로직을 고치면 day4/server.js 쪽도 같이 고칠 것 — 두 파일은 별도 사본이라 자동 동기화되지
// 않는다(day4/CLAUDE.md "Vercel 배포" 절 참고).

const KAKAO_ENDPOINT = "https://dapi.kakao.com/v2/local/search/keyword.json";
const UPSTREAM_TIMEOUT_MS = 8000;

function extractPlaceId(doc) {
  const match = /(\d+)\s*$/.exec(doc.place_url || "");
  return match ? match[1] : "";
}

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

function fetchKakao(query, apiKey) {
  const params = new URLSearchParams({ query });
  return fetch(KAKAO_ENDPOINT + "?" + params.toString(), {
    headers: { Authorization: "KakaoAK " + apiKey },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

module.exports = async (req, res) => {
  const q = String((req.query && req.query.query) || "").trim();
  const rawKey = process.env.KAKAO_REST_API_KEY || "";
  const apiKey = rawKey && !/^TODO/i.test(rawKey) ? rawKey : "";

  if (!q) {
    res.status(400).json({ error: "MISSING_QUERY", message: "검색어를 입력해 주세요." });
    return;
  }
  if (!apiKey) {
    res.status(500).json({ error: "SERVER_NOT_CONFIGURED", message: "서버에 카카오 API 키가 설정되지 않았습니다." });
    return;
  }

  try {
    const upstreamRes = await fetchKakao(q, apiKey);
    if (upstreamRes.ok) {
      const json = await upstreamRes.json();
      const documents = Array.isArray(json.documents) ? json.documents : [];
      res.status(200).json({ places: documents.map(reshapePlace) });
      return;
    }
    if (upstreamRes.status === 401) {
      console.error("[api] 카카오 인증 실패 (401) — REST API 키를 확인하세요.");
      res.status(502).json({ error: "UPSTREAM_AUTH_ERROR", message: "검색 서비스 인증에 실패했습니다." });
      return;
    }
    if (upstreamRes.status === 429) {
      res.status(502).json({ error: "UPSTREAM_RATE_LIMITED", message: "요청이 많아 잠시 후 다시 시도해 주세요." });
      return;
    }
    console.error("[api] 카카오 API 오류 상태: " + upstreamRes.status);
    res.status(502).json({ error: "UPSTREAM_ERROR", message: "검색 서비스에 일시적인 문제가 있습니다." });
  } catch (err) {
    console.error("[api] 카카오 호출 실패:", err.message);
    res.status(502).json({ error: "UPSTREAM_UNAVAILABLE", message: "검색 서비스에 연결할 수 없습니다." });
  }
};
