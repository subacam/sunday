// Vercel 서버리스 함수판 구글 Places API (New) 리뷰 프록시. 로직은
// day4/server.js의 handlePlaceReviewsApi 및 그 헬퍼들과 동일하다 — 로직을 고치면
// day4/server.js 쪽도 같이 고칠 것(day4/CLAUDE.md "Vercel 배포" 절 참고).

const GOOGLE_TEXTSEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_FIELD_MASK = "places.displayName,places.rating,places.userRatingCount,places.reviews,places.googleMapsUri";
const GOOGLE_MATCH_RADIUS_METERS = 150;
const UPSTREAM_TIMEOUT_MS = 8000;

// locationRestriction(강제 필터)은 rectangle만 지원하고 circle은 지원하지 않는다 — circle로
// "단순화"하면 요청 자체가 유효하지 않게 되니 되돌리지 말 것. 자세한 이유는
// day4/server.js의 같은 이름 함수 주석 참고.
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

function fetchGooglePlaceReviews(name, lat, lng, apiKey) {
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
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": GOOGLE_FIELD_MASK,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

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

module.exports = async (req, res) => {
  const q = req.query || {};
  const name = String(q.name || "").trim();
  const rawLat = String(q.lat || "").trim();
  const rawLng = String(q.lng || "").trim();
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  const rawKey = process.env.GOOGLE_PLACES_API_KEY || "";
  const apiKey = rawKey && !/^TODO/i.test(rawKey) ? rawKey : "";

  if (!name) {
    res.status(400).json({ error: "MISSING_NAME", message: "가게 이름이 필요합니다." });
    return;
  }
  if (!rawLat || !rawLng || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    res.status(400).json({ error: "MISSING_COORDS", message: "가게 좌표가 필요합니다." });
    return;
  }
  if (!apiKey) {
    res.status(500).json({ error: "SERVER_NOT_CONFIGURED", message: "서버에 구글 API 키가 설정되지 않았습니다." });
    return;
  }

  try {
    const upstreamRes = await fetchGooglePlaceReviews(name, lat, lng, apiKey);
    if (upstreamRes.ok) {
      const json = await upstreamRes.json();
      const places = Array.isArray(json.places) ? json.places : [];
      if (places.length === 0) {
        res.status(200).json({ found: false });
        return;
      }
      res.status(200).json({ found: true, place: reshapeGooglePlace(places[0]) });
      return;
    }
    if (upstreamRes.status === 401 || upstreamRes.status === 403) {
      console.error("[api] 구글 인증 실패 (" + upstreamRes.status + ") — API 키와 'Places API (New)' 활성화 여부를 확인하세요.");
      res.status(502).json({ error: "UPSTREAM_AUTH_ERROR", message: "리뷰 서비스 인증에 실패했습니다." });
      return;
    }
    if (upstreamRes.status === 429) {
      res.status(502).json({ error: "UPSTREAM_RATE_LIMITED", message: "요청이 많아 잠시 후 다시 시도해 주세요." });
      return;
    }
    console.error("[api] 구글 Places API 오류 상태: " + upstreamRes.status);
    res.status(502).json({ error: "UPSTREAM_ERROR", message: "리뷰 서비스에 일시적인 문제가 있습니다." });
  } catch (err) {
    console.error("[api] 구글 Places API 호출 실패:", err.message);
    res.status(502).json({ error: "UPSTREAM_UNAVAILABLE", message: "리뷰 서비스에 연결할 수 없습니다." });
  }
};
