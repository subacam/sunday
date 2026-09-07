import type { AnalyzeRequestBody, AnalyzeResponseBody, SentimentLabel } from "@/types/analyze";

/**
 * Deterministic mock used when `MOCK_ANALYSIS=1` (or no GEMINI_API_KEY is
 * configured yet). Lets the extension's popup/dashboard/xlsx-export be built
 * and tested without a real Gemini key or real parsed reviews — see the
 * build order in the plan (proxy skeleton → extension skeleton → popup UI
 * against mock data → real Gemini wiring).
 */
export function buildMockResponse(body: AnalyzeRequestBody): AnalyzeResponseBody {
  const keywords = [
    { id: "shipping", label: "배송", weight: 9 },
    { id: "packaging", label: "포장 상태", weight: 6 },
    { id: "quality", label: "품질", weight: 8 },
    { id: "price", label: "가격", weight: 5 },
    { id: "cs", label: "CS 응대", weight: 3 },
  ];

  const labels: SentimentLabel[] = ["positive", "positive", "neutral", "negative"];
  const reviewLabels = body.reviews.map((review, i) => ({
    index: review.index,
    label: labels[i % labels.length],
    keywords: [keywords[i % keywords.length].id],
  }));

  const positive = reviewLabels.filter((r) => r.label === "positive").length;
  const neutral = reviewLabels.filter((r) => r.label === "neutral").length;
  const negative = reviewLabels.filter((r) => r.label === "negative").length;
  const total = reviewLabels.length || 1;

  return {
    sentiment: {
      positivePct: Math.round((positive / total) * 100),
      neutralPct: Math.round((neutral / total) * 100),
      negativePct: Math.round((negative / total) * 100),
    },
    reviewLabels,
    insights: {
      strengths: [
        `"${body.productName}"의 배송 속도와 포장 상태에 대한 언급이 많습니다. (mock 데이터)`,
        "품질에 만족한다는 리뷰가 다수 발견됩니다. (mock 데이터)",
      ],
      improvements: [
        "일부 리뷰에서 CS 응대 속도에 대한 불만이 확인됩니다. (mock 데이터)",
        "가격 대비 만족도가 엇갈리는 편입니다. (mock 데이터)",
      ],
    },
    keywords,
    keywordRelations: [
      { source: "shipping", target: "packaging" },
      { source: "quality", target: "price" },
    ],
  };
}
