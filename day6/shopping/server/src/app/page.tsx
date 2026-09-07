export default function Home() {
  return (
    <main style={{ maxWidth: 640, margin: "4rem auto", padding: "0 1.5rem", lineHeight: 1.6 }}>
      <h1>쇼핑리뷰분석 API 서버</h1>
      <p>
        이 서버는 웹사이트가 아니라, 크롬 확장 프로그램 &quot;쇼핑리뷰분석&quot;이 Gemini API 키를
        노출하지 않고 리뷰를 분석할 수 있도록 중계하는 프록시입니다.
      </p>
      <p>
        엔드포인트: <code>POST /api/analyze</code>
      </p>
    </main>
  );
}
