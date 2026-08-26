// day12 "AI 영수증 가계부" — 영수증 이미지 → 구조화된 지출 데이터 파싱 Edge Function.
// 클라이언트가 촬영/업로드한 영수증 사진 base64를 보내면 Gemini Vision이 상호명/날짜/
// 품목/금액/카테고리를 추출해 돌려준다. GEMINI_API_KEY는 여기(Supabase Edge Function
// 시크릿)에만 존재한다 — 클라이언트에는 절대 내려가지 않는다. 같은 프로젝트(srhnwzcnimadmoyfukwd)의
// day11 gemini-vision과 시크릿을 공유하므로(Supabase 시크릿은 프로젝트 단위) 이미 등록된
// GEMINI_API_KEY를 그대로 사용한다.
//
// MOCK_GEMINI(기본 "1")이 켜져 있으면 실제 Gemini를 호출하지 않고 아래 RECEIPT_POOL 예시를
// 순환 반환한다. 사용자가 실제 GEMINI_API_KEY를 등록하고 MOCK_GEMINI를 "0"으로 바꾸면
// 실제 AI 경로로 전환된다(day11과 동일 패턴).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CATEGORY_IDS = [
  "food",
  "cafe",
  "transport",
  "shopping",
  "health",
  "culture",
  "living",
  "etc",
] as const;

const RECEIPT_POOL = [
  {
    merchant: "스타벅스 강남점",
    totalAmount: 6800,
    paymentMethodGuess: "신한카드",
    categoryId: "cafe",
    items: [{ name: "아이스 아메리카노 T", quantity: 1, unitPrice: 6800 }],
    lowConfidenceFields: ["transactionDate"],
  },
  {
    merchant: "본죽 삼성점",
    totalAmount: 12000,
    paymentMethodGuess: "신한카드",
    categoryId: "food",
    items: [{ name: "전복죽", quantity: 1, unitPrice: 12000 }],
    lowConfidenceFields: ["transactionDate"],
  },
  {
    merchant: "GS25 학동역점",
    totalAmount: 4200,
    paymentMethodGuess: "신한카드",
    categoryId: "living",
    items: [
      { name: "삼각김밥", quantity: 1, unitPrice: 1700 },
      { name: "물 500ml", quantity: 1, unitPrice: 1000 },
      { name: "커피우유", quantity: 1, unitPrice: 1500 },
    ],
    lowConfidenceFields: ["transactionDate", "totalAmount"],
  },
];

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    merchant: { type: "STRING" },
    transactionDate: { type: "STRING", description: "ISO 8601, e.g. 2026-08-26T14:32:00" },
    totalAmount: { type: "INTEGER" },
    paymentMethodGuess: { type: "STRING" },
    categoryId: { type: "STRING", enum: CATEGORY_IDS as unknown as string[] },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "INTEGER" },
          unitPrice: { type: "INTEGER" },
        },
        required: ["name", "quantity", "unitPrice"],
      },
    },
    lowConfidenceFields: {
      type: "ARRAY",
      items: { type: "STRING" },
      description: "확신이 낮은 최상위 필드 이름들 (예: merchant, transactionDate, totalAmount)",
    },
  },
  required: ["merchant", "transactionDate", "totalAmount", "categoryId", "items", "lowConfidenceFields"],
};

const CATEGORY_HINT = `카테고리(categoryId)는 다음 중 정확히 하나 — food(식비/외식/장보기), cafe(카페/커피/디저트), transport(대중교통/택시/주유), shopping(쇼핑/온라인몰/생필품), health(약국/병원), culture(영화/공연/취미), living(편의점/생활용품/공과금), etc(분류 애매한 나머지)`;

const PROMPT = `당신은 영수증 사진에서 지출 정보를 추출하는 도우미입니다.
아래 이미지 한 장(영수증)을 보고 JSON으로만 응답하세요.

- merchant: 상호명
- transactionDate: 거래 일시 (ISO 8601). 영수증에 연도가 없으면 오늘 날짜 기준으로 추정.
- totalAmount: 총 결제 금액 (원 단위 정수, 통화 기호/콤마 없이)
- paymentMethodGuess: 결제 수단 추정 (카드사명 등, 알 수 없으면 빈 문자열)
- items: 품목 리스트 (name, quantity, unitPrice) — 품목이 안 보이면 총액 한 줄로 items 하나만 채움
- ${CATEGORY_HINT}
- lowConfidenceFields: 흐림/잘림 등으로 확신이 낮은 필드 이름 배열 (없으면 빈 배열)`;

function corsHeaders() {
  return {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

function pickMock() {
  const pick = RECEIPT_POOL[Math.floor(Math.random() * RECEIPT_POOL.length)];
  return {
    ...pick,
    merchant: `${pick.merchant} (mock)`,
    transactionDate: new Date().toISOString(),
  };
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
          parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[receipt-vision] Gemini upstream error:", res.status, body);
    throw new Error(`gemini_upstream_${res.status}`);
  }

  const payload = await res.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    console.error("[receipt-vision] Gemini response missing text part:", JSON.stringify(payload).slice(0, 500));
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
    console.error("[receipt-vision] failed, falling back to mock:", err);
    return new Response(JSON.stringify({ ...pickMock(), fallback: true }), { headers: corsHeaders() });
  }
});
