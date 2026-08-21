// Vercel 서버리스 함수판 place-info(위치 정보 제보) API. 로직은 day4/server.js의
// handleGetPlaceInfo/handlePostPlaceInfo와 동일하되, Node http가 아니라 Vercel의
// req(.query/.body가 이미 파싱된 객체)/res(.status().json() 제공) 인터페이스에 맞춰 다시
// 썼다. 로직을 고치면 day4/server.js 쪽도 같이 고칠 것 — 두 파일은 별도 사본이라 자동
// 동기화되지 않는다(day4/CLAUDE.md "Vercel 배포" 절 참고).
//
// 이전에는 파일 기반 저장소(day4/data/place-info.json)를 썼기 때문에 Vercel의 비영속
// 파일시스템에서 동작할 수 없어 이 미러링에서 제외돼 있었다. Supabase Postgres로
// 옮기면서 이제는 다른 세 엔드포인트와 같은 /day4/ 접두사로 정상 배포할 수 있다.

const UPSTREAM_TIMEOUT_MS = 8000;

function supabaseHeaders(apiKey, extra) {
  return Object.assign({ apikey: apiKey, Authorization: "Bearer " + apiKey }, extra || {});
}

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

async function handleGet(req, res, restBase, apiKey) {
  const placeId = String((req.query && req.query.id) || "").trim();
  if (!placeId) {
    res.status(400).json({ error: "MISSING_ID", message: "가게 id가 필요합니다." });
    return;
  }

  try {
    const params = new URLSearchParams({ place_id: "eq." + placeId, order: "created_at.desc" });
    const upstreamRes = await fetch(restBase + "/place_info_entries?" + params.toString(), {
      headers: supabaseHeaders(apiKey),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstreamRes.ok) {
      console.error("[api] place-info 조회 실패, 상태: " + upstreamRes.status);
      res.status(502).json({ error: "UPSTREAM_ERROR", message: "위치 정보를 불러오지 못했습니다." });
      return;
    }
    const rows = await upstreamRes.json();
    res.status(200).json({ entries: (Array.isArray(rows) ? rows : []).map(reshapePlaceInfoEntry) });
  } catch (err) {
    console.error("[api] place-info 조회 호출 실패:", err.message);
    res.status(502).json({ error: "UPSTREAM_UNAVAILABLE", message: "위치 정보 서비스에 연결할 수 없습니다." });
  }
}

async function handlePost(req, res, restBase, apiKey) {
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const placeId = String(body.placeId || "").trim();
  const text = String(body.text || "").trim();
  let author = String(body.author || "").trim();
  const photoUrl = String(body.photoUrl || "").trim();
  const pinX = Number(body.pinX);
  const pinY = Number(body.pinY);

  if (!placeId) {
    res.status(400).json({ error: "MISSING_PLACE_ID", message: "가게 id가 필요합니다." });
    return;
  }
  if (!text) {
    res.status(400).json({ error: "MISSING_TEXT", message: "입구 설명을 입력해 주세요." });
    return;
  }
  if (text.length > 500) {
    res.status(400).json({ error: "TEXT_TOO_LONG", message: "설명은 500자 이내로 입력해 주세요." });
    return;
  }
  if (photoUrl && !/^https?:\/\//i.test(photoUrl)) {
    res.status(400).json({ error: "INVALID_PHOTO_URL", message: "사진 URL은 http(s)로 시작해야 합니다." });
    return;
  }
  if (photoUrl.length > 500) {
    res.status(400).json({ error: "PHOTO_URL_TOO_LONG", message: "사진 URL이 너무 깁니다." });
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

  try {
    const upstreamRes = await fetch(restBase + "/place_info_entries", {
      method: "POST",
      headers: supabaseHeaders(apiKey, { "Content-Type": "application/json", Prefer: "return=representation" }),
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!upstreamRes.ok) {
      console.error("[api] place-info 등록 실패, 상태: " + upstreamRes.status);
      res.status(502).json({ error: "UPSTREAM_ERROR", message: "위치 정보를 저장하지 못했습니다." });
      return;
    }
    const rows = await upstreamRes.json();
    const created = Array.isArray(rows) ? rows[0] : rows;
    res.status(201).json({ entry: reshapePlaceInfoEntry(created) });
  } catch (err) {
    console.error("[api] place-info 등록 호출 실패:", err.message);
    res.status(502).json({ error: "UPSTREAM_UNAVAILABLE", message: "위치 정보 서비스에 연결할 수 없습니다." });
  }
}

module.exports = async (req, res) => {
  const restBase = (process.env.SUPABASE_URL || "") + "/rest/v1";
  const apiKey = process.env.SUPABASE_ANON_KEY || "";

  if (!process.env.SUPABASE_URL || !apiKey) {
    res.status(500).json({ error: "SERVER_NOT_CONFIGURED", message: "서버에 Supabase 설정이 없습니다." });
    return;
  }

  if (req.method === "GET") {
    await handleGet(req, res, restBase, apiKey);
    return;
  }
  if (req.method === "POST") {
    await handlePost(req, res, restBase, apiKey);
    return;
  }
  res.status(405).json({ error: "METHOD_NOT_ALLOWED", message: "허용되지 않는 메서드입니다." });
};
