// Vercel 서버리스 함수판 제미나이 리뷰 분석 프록시. 로직은 day4/server.js의
// handlePlaceReviewAnalysisApi 및 그 헬퍼들과 동일하다 — 로직을 고치면 day4/server.js
// 쪽도 같이 고칠 것(day4/CLAUDE.md "Vercel 배포" 절 참고).
//
// Vercel은 Content-Type: application/json 요청 본문을 req.body에 이미 파싱해서 넘겨준다 —
// day4/server.js의 readJsonBody처럼 스트림을 직접 읽을 필요가 없다.

const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
const GEMINI_TIMEOUT_MS = 15000;

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

function fetchGeminiAnalysis(name, reviews, apiKey, model) {
  const body = {
    contents: [{ role: "user", parts: [{ text: buildAnalysisPrompt(name, reviews) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: buildAnalysisResponseSchema(),
      temperature: 0.2,
      maxOutputTokens: 2048,
      // gemini-3.6-flash는 기본적으로 "생각" 토큰을 쓰는데, 이 작업은 정해진 스키마로 사실을
      // 추출/집계하는 정도라 깊은 추론이 필요 없다. budget을 낮게 고정하지 않으면 같은 요청도
      // 9~35초까지 편차가 컸다(실측) — Vercel 서버리스 함수의 실행 시간 제한에도 걸릴 수
      // 있으니 이 값을 지우지 말 것.
      thinkingConfig: { thinkingBudget: 512 },
    },
  };
  // 구글 Places와 달리 제미나이는 키를 헤더가 아니라 쿼리 파라미터로 받는다.
  const url = GEMINI_ENDPOINT_BASE + encodeURIComponent(model) + ":generateContent?key=" + apiKey;
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });
}

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

module.exports = async (req, res) => {
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const reviews = Array.isArray(body.reviews) ? body.reviews : null;
  const rawKey = process.env.GEMINI_API_KEY || "";
  const apiKey = rawKey && !/^TODO/i.test(rawKey) ? rawKey : "";
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

  if (!name) {
    res.status(400).json({ error: "MISSING_NAME", message: "가게 이름이 필요합니다." });
    return;
  }
  if (!reviews) {
    res.status(400).json({ error: "INVALID_REVIEWS", message: "리뷰 목록이 필요합니다." });
    return;
  }
  if (reviews.length === 0) {
    res.status(400).json({ error: "EMPTY_REVIEWS", message: "분석할 리뷰가 없습니다." });
    return;
  }
  if (!apiKey) {
    res.status(500).json({ error: "SERVER_NOT_CONFIGURED", message: "서버에 제미나이 API 키가 설정되지 않았습니다." });
    return;
  }

  // 클라이언트가 뭐라 주장하든 서버가 방어적으로 상한선을 건다 — 이 엔드포인트는 임의 텍스트를
  // 가장 비싼 업스트림(LLM)에 그대로 넘기는 유일한 엔드포인트라 남용 벡터가 크다.
  const cappedReviews = reviews.slice(0, 30).map((r) => ({
    rating: typeof r.rating === "number" ? r.rating : 0,
    text: String((r && r.text) || "").slice(0, 1000),
  }));

  try {
    const upstreamRes = await fetchGeminiAnalysis(name, cappedReviews, apiKey, model);
    if (upstreamRes.ok) {
      const json = await upstreamRes.json();
      const analysis = parseGeminiAnalysis(json);
      if (!analysis) {
        console.error("[api] 제미나이 응답 파싱 실패 — 스키마/모델명을 확인하세요.");
        res.status(502).json({ error: "ANALYSIS_UNPARSEABLE", message: "리뷰 분석 결과를 해석하지 못했습니다." });
        return;
      }
      res.status(200).json(analysis);
      return;
    }
    if (upstreamRes.status === 401 || upstreamRes.status === 403) {
      console.error("[api] 제미나이 인증 실패 (" + upstreamRes.status + ") — API 키를 확인하세요.");
      res.status(502).json({ error: "UPSTREAM_AUTH_ERROR", message: "분석 서비스 인증에 실패했습니다." });
      return;
    }
    if (upstreamRes.status === 429) {
      res.status(502).json({ error: "UPSTREAM_RATE_LIMITED", message: "요청이 많아 잠시 후 다시 시도해 주세요." });
      return;
    }
    console.error("[api] 제미나이 API 오류 상태: " + upstreamRes.status);
    res.status(502).json({ error: "UPSTREAM_ERROR", message: "분석 서비스에 일시적인 문제가 있습니다." });
  } catch (err) {
    console.error("[api] 제미나이 API 호출 실패:", err.message);
    res.status(502).json({ error: "UPSTREAM_UNAVAILABLE", message: "분석 서비스에 연결할 수 없습니다." });
  }
};
