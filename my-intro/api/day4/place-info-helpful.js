// Vercel 서버리스 함수판 place-info "도움이 됐어요" 증가 API. 로직은 day4/server.js의
// handlePostPlaceInfoHelpful과 동일하되, Vercel의 req.body/res.status().json() 인터페이스에
// 맞춰 다시 썼다. 로직을 고치면 day4/server.js 쪽도 같이 고칠 것 — 두 파일은 별도
// 사본이라 자동 동기화되지 않는다(day4/CLAUDE.md "Vercel 배포" 절 참고).

const UPSTREAM_TIMEOUT_MS = 8000;

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "허용되지 않는 메서드입니다." });
    return;
  }

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const apiKey = process.env.SUPABASE_ANON_KEY || "";
  if (!supabaseUrl || !apiKey) {
    res.status(500).json({ error: "SERVER_NOT_CONFIGURED", message: "서버에 Supabase 설정이 없습니다." });
    return;
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const placeId = String(body.placeId || "").trim();
  const entryId = String(body.entryId || "").trim();
  if (!placeId || !entryId) {
    res.status(400).json({ error: "MISSING_FIELDS", message: "placeId와 entryId가 필요합니다." });
    return;
  }

  try {
    const upstreamRes = await fetch(supabaseUrl + "/rest/v1/rpc/increment_place_info_helpful", {
      method: "POST",
      headers: {
        apikey: apiKey,
        Authorization: "Bearer " + apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_entry_id: entryId }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstreamRes.ok) {
      console.error("[api] place-info helpful 증가 실패, 상태: " + upstreamRes.status);
      res.status(502).json({ error: "UPSTREAM_ERROR", message: "처리에 실패했습니다." });
      return;
    }
    const result = await upstreamRes.json();
    if (result === null || result === undefined) {
      res.status(404).json({ error: "ENTRY_NOT_FOUND", message: "해당 정보를 찾을 수 없습니다." });
      return;
    }
    res.status(200).json({ helpfulCount: result });
  } catch (err) {
    console.error("[api] place-info helpful 호출 실패:", err.message);
    res.status(502).json({ error: "UPSTREAM_UNAVAILABLE", message: "위치 정보 서비스에 연결할 수 없습니다." });
  }
};
