import { computeDonutGradient, computeMoodDist, computeTagCloud, computeWeekData } from "@/lib/dashboard";
import type { WalkRecord } from "@/types/walk";

export default function DashboardTab({ records }: { records: WalkRecord[] }) {
  const weekData = computeWeekData(records);
  const tagCloud = computeTagCloud(records);
  const moodLegend = computeMoodDist(records);
  const donutGradient = computeDonutGradient(moodLegend);

  if (records.length === 0) {
    return (
      <div style={{ padding: "2px 20px 30px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 18px", margin: 0 }}>대시보드</h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "60px 20px",
            color: "#8B8578",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "#2E2B24" }}>아직 통계가 없어요</div>
          <div style={{ fontSize: 13, textAlign: "center" }}>기록이 쌓이면 태그, 요일, 무드 통계가 여기 나타나요</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "2px 20px 30px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 18px" }}>대시보드</div>

      <div style={{ background: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: "0 2px 10px rgba(46,43,36,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8B8578", marginBottom: 14 }}>태그 워드클라우드</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {tagCloud.map((t) => (
            <span key={t.word} style={{ fontSize: t.size, fontWeight: 700, color: t.color }}>
              {t.word}
            </span>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, padding: 20, marginBottom: 16, boxShadow: "0 2px 10px rgba(46,43,36,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8B8578", marginBottom: 16 }}>요일별 기록 수</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
          {weekData.map((w) => (
            <div
              key={w.day}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end" }}
            >
              <div style={{ width: "100%", maxWidth: 26, borderRadius: 8, height: `${w.heightPct}%`, background: w.barColor }} />
              <div style={{ fontSize: 12, color: "#8B8578", fontWeight: 600 }}>{w.day}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: "#fff", borderRadius: 20, padding: 20, boxShadow: "0 2px 10px rgba(46,43,36,0.06)" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#8B8578", marginBottom: 16 }}>무드 분포</div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 110, height: 110, borderRadius: "50%", background: donutGradient, position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: 16, borderRadius: "50%", background: "#fff" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
            {moodLegend.map((m) => (
              <div key={m.mood} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "#4A463B" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>{m.mood}</div>
                <div style={{ fontWeight: 700, color: "#2E2B24" }}>{m.pct}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
