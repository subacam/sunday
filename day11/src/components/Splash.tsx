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
        background:
          "radial-gradient(90% 70% at 20% 15%, #FBE2DC 0%, transparent 60%), radial-gradient(80% 65% at 85% 85%, #E3F0DE 0%, transparent 60%), #FAF6EC",
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
            background: "linear-gradient(135deg,#F0A28C,#D97BA0)",
            boxShadow: "0 0 0 6px rgba(232,146,124,0.16)",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          background: "linear-gradient(135deg,#E8927C,#9C81C4)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
          letterSpacing: -0.5,
        }}
      >
        마이플
      </div>
      <div style={{ fontSize: 14, color: "#8B8578", fontWeight: 500 }}>오늘의 걸음을 기록해요</div>
    </div>
  );
}
