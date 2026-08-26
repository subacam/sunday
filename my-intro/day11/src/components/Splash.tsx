export default function Splash() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 22,
        background: "#FAF6EC",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#DAD4C2" }} />
        <div style={{ width: 18, height: 1.5, background: "#DAD4C2" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C6CBA9" }} />
        <div style={{ width: 18, height: 1.5, background: "#DAD4C2" }} />
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#9DBE9A" }} />
        <div style={{ width: 18, height: 1.5, background: "#DAD4C2" }} />
        <div
          style={{
            width: 15,
            height: 15,
            borderRadius: "50%",
            background: "#E8927C",
            boxShadow: "0 0 0 6px rgba(232,146,124,0.16)",
          }}
        />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#2E2B24", letterSpacing: -0.5 }}>산책기록</div>
      <div style={{ fontSize: 14, color: "#8B8578", fontWeight: 500 }}>오늘의 걸음을 기록해요</div>
    </div>
  );
}
