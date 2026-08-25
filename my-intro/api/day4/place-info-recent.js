// Vercel 서버리스 함수판 "최근 등록된 길찾기" 조회 API. 로직은 day4/server.js의
// handleGetPlaceInfoRecent와 동일하되, Vercel의 res.status().json() 인터페이스에 맞춰
// 다시 썼다. 로직을 고치면 day4/server.js 쪽도 같이 고칠 것 — 두 파일은 별도 사본이라
// 자동 동기화되지 않는다(day4/CLAUDE.md "Vercel 배포" 절 참고).
//
// place-info.js와 달리 특정 가게(place_id)가 아니라 전체에서 최신 N개를 가져온다 —
// index.html의 "최근 등록된 길찾기" 티커가 이 엔드포인트만 호출한다.

const UPSTREAM_TIMEOUT_MS = 8000;
const RECENT_LIMIT = 12;

function reshapePlaceInfoEntry(row) {
  return {
    id: row.id,
    placeId: row.place_id,
    placeName: row.place_name || "",
    category: row.category || "",
    address: row.address || "",
    author: row.author,
    text: row.text,
    photoUrl: row.photo_url || "",
    pinX: row.pin_x === null || row.pin_x === undefined ? null : Number(row.pin_x),
    pinY: row.pin_y === null || row.pin_y === undefined ? null : Number(row.pin_y),
    helpfulCount: row.helpful_count || 0,
    reportCount: row.report_count || 0,
    createdAt: row.created_at,
  };
}

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "허용되지 않는 메서드입니다." });
    return;
  }

  const restBase = (process.env.SUPABASE_URL || "") + "/rest/v1";
  const apiKey = process.env.SUPABASE_ANON_KEY || "";
  if (!process.env.SUPABASE_URL || !apiKey) {
    res.status(500).json({ error: "SERVER_NOT_CONFIGURED", message: "서버에 Supabase 설정이 없습니다." });
    return;
  }

  try {
    // place_name이 비어 있는 행(비정규화 컬럼 추가 이전의 옛 데이터 등)은 카드에 가게
    // 이름을 못 띄우니 제외한다.
    const params = new URLSearchParams({
      order: "created_at.desc",
      limit: String(RECENT_LIMIT),
      place_name: "not.is.null",
    });
    const upstreamRes = await fetch(restBase + "/place_info_entries?" + params.toString(), {
      headers: { apikey: apiKey, Authorization: "Bearer " + apiKey },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstreamRes.ok) {
      console.error("[api] place-info-recent 조회 실패, 상태: " + upstreamRes.status);
      res.status(502).json({ error: "UPSTREAM_ERROR", message: "최근 길찾기 정보를 불러오지 못했습니다." });
      return;
    }
    const rows = await upstreamRes.json();
    res.status(200).json({ entries: (Array.isArray(rows) ? rows : []).map(reshapePlaceInfoEntry) });
  } catch (err) {
    console.error("[api] place-info-recent 조회 호출 실패:", err.message);
    res.status(502).json({ error: "UPSTREAM_UNAVAILABLE", message: "위치 정보 서비스에 연결할 수 없습니다." });
  }
};
