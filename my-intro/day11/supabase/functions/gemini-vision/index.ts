// day11 "산책기록" — Gemini Vision 프록시.
// 클라이언트가 사진 base64를 보내면 Gemini Vision으로 감성 캡션/태그/무드를 받아 돌려준다.
// GEMINI_API_KEY는 여기(Supabase Edge Function 시크릿)에만 존재한다 — 클라이언트에는 절대 내려가지 않는다.
//
// MOCK_GEMINI(기본 "1")이 켜져 있으면 실제 Gemini를 호출하지 않고 PRD의 AI_POOL 예시를 순환 반환한다.
// 사용자가 실제 GEMINI_API_KEY를 Supabase 대시보드(Edge Functions > Secrets) 또는
// `supabase secrets set GEMINI_API_KEY=... MOCK_GEMINI=0 --project-ref srhnwzcnimadmoyfukwd`로 등록하고
// MOCK_GEMINI를 "0"으로 바꾸면 실제 AI 경로로 전환된다.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MOOD_LIST = ["평온", "설렘", "활기", "쓸쓸함", "그리움", "행복", "여유"] as const;

const AI_POOL = [
  { caption: "잠시 멈춰서 바라본 하늘, 마음이 가벼워졌다", tags: ["하늘", "바람", "오늘"], mood: "평온" },
  { caption: "낯선 골목에서 발견한 작은 화단이 반가웠다", tags: ["골목", "꽃", "발견"], mood: "설렘" },
  { caption: "익숙한 길인데 오늘은 유난히 여유로웠다", tags: ["익숙함", "여유", "저녁"], mood: "여유" },
];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    caption: { type: "STRING" },
    tags: { type: "ARRAY", items: { type: "STRING" } },
    mood: { type: "STRING", enum: MOOD_LIST as unknown as string[] },
  },
  required: ["caption", "tags", "mood"],
};

const PROMPT = `당신은 산책 중 찍은 사진에 감성적인 기록을 붙여주는 도우미입니다.
아래 이미지 한 장을 보고 JSON으로만 응답하세요.

- caption: 과장되지 않은 감성 톤의 한국어 한 문장 (40자 내외).
  '조용한', '고요한', '평화로운' 같은 뭉뚱그린 분위기 형용사를 남발하지 말고,
  사진에서 실제로 보이는 구체적인 요소(색·사물·빛·질감·구도·계절감 등)를
  한두 가지 짚어 문장에 녹여내세요. 매번 같은 표현이 아니라 사진마다
  다른 어휘를 쓰도록 신경 쓰세요.
- tags: 사진과 어울리는 한국어 태그 3~5개. 여기도 캡션과 같은 뭉뚱그린
  분위기 단어 반복 대신 사진 속 구체적인 사물·장소·색·계절 단어를 우선하세요.
- mood: 다음 후보군 중 정확히 하나만 선택 — ${MOOD_LIST.join("/")}`;

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function pickMock() {
  const pick = AI_POOL[Math.floor(Math.random() * AI_POOL.length)];
  return { ...pick, caption: `${pick.caption} (mock)` };
}

async function callGemini(imageBase64: string, mimeType: string, apiKey: string) {
  const model = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: PROMPT },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        // 기본값(1.0)보다 살짝 높여 사진마다 어휘 선택의 다양성을 늘린다 —
        // 안 그러면 비슷한 풍경 사진에 매번 "조용한" 류의 같은 표현이 반복된다.
        temperature: 1.3,
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[gemini-vision] Gemini upstream error:", res.status, body);
    throw new Error(`gemini_upstream_${res.status}`);
  }

  const payload = await res.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("[gemini-vision] Gemini response missing text part:", JSON.stringify(payload).slice(0, 500));
    throw new Error("gemini_empty_response");
  }
  return JSON.parse(text);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), { status: 405, headers: corsHeaders() });
  }

  let body: { imageBase64?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid_json" }), { status: 400, headers: corsHeaders() });
  }

  if (!body.imageBase64 || !body.mimeType) {
    return new Response(JSON.stringify({ error: "missing_image" }), { status: 400, headers: corsHeaders() });
  }

  const mockEnabled = (Deno.env.get("MOCK_GEMINI") ?? "1") !== "0";
  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (mockEnabled || !apiKey) {
    await new Promise((r) => setTimeout(r, 600));
    return new Response(JSON.stringify(pickMock()), { headers: corsHeaders() });
  }

  try {
    const result = await callGemini(body.imageBase64, body.mimeType, apiKey);
    return new Response(JSON.stringify(result), { headers: corsHeaders() });
  } catch (err) {
    console.error("[gemini-vision] failed, falling back to mock:", err);
    return new Response(JSON.stringify({ ...pickMock(), fallback: true }), { headers: corsHeaders() });
  }
});
