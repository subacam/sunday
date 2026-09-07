import {
  computeDonutGradient,
  computeMoodDist,
  computeTagCloud,
  computeWeekDistance,
  thisWeekTracks,
  totalDistance,
} from "@/lib/dashboard";
import { formatDistance } from "@/lib/track";
import type { WalkRecord, WalkTrack } from "@/types/walk";

const cardStyle: React.CSSProperties = {
  background: "var(--wr-card)",
  borderRadius: 20,
  padding: 20,
  marginBottom: 16,
  boxShadow: "0 2px 10px var(--wr-shadow)",
};

const cardLabel: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: "var(--wr-text-muted)" };

export default function DashboardTab({
  records,
  tracks,
}: {
  records: WalkRecord[];
  tracks: WalkTrack[];
}) {
  const tagCloud = computeTagCloud(records);
  const moodLegend = computeMoodDist(records);
  const donutGradient = computeDonutGradient(moodLegend);

  const weekTracks = thisWeekTracks(tracks);
  const weekMeters = totalDistance(weekTracks);
  const weekDistance = computeWeekDistance(tracks);

  // 걸은 거리 카드는 사진 기록이 하나도 없어도 보여준다 — 산책 트랙과 사진 기록은
  // 별개로 쌓이기 때문에, 사진 없이 걷기만 한 주에도 거리는 나와야 한다.
  const weekCard = (
    <div
      style={{
        ...cardStyle,
        background: "linear-gradient(135deg,var(--wr-cta-start),var(--wr-cta-end))",
        color: "var(--wr-accent-contrast)",
        boxShadow: "0 6px 18px rgba(var(--wr-cta-shadow-rgb),0.28)",
      }}
    >
      <div style={{ ...cardLabel, color: "rgba(var(--wr-accent-contrast-rgb),0.85)", marginBottom: 10 }}>
        이번주 걸은 거리
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: -0.5 }}>
          {formatDistance(weekMeters)}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(var(--wr-accent-contrast-rgb),0.85)" }}>
          산책 {weekTracks.length}회
        </div>
      </div>
    </div>
  );

  const weekChartCard = (
    <div style={cardStyle}>
      {/* 단위를 막대 라벨이 아니라 제목에 둔다 — 7칸을 나눠 쓰면 한 칸이 좁은 화면에서
          32px 남짓이라 "1.23km"(약 35px)는 옆 칸과 겹친다. km 숫자만 두면 "12.3"(약 24px)로 항상 들어간다. */}
      <div style={{ ...cardLabel, marginBottom: 16 }}>요일별 걸은 거리 (km)</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, height: 120 }}>
        {weekDistance.map((w) => (
          <div
            key={w.day}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              height: "100%",
              justifyContent: "flex-end",
            }}
          >
            <div style={{ fontSize: 10.5, color: "var(--wr-text-muted)", fontWeight: 700, whiteSpace: "nowrap" }}>
              {w.meters > 0 ? (w.meters / 1000).toFixed(1) : ""}
            </div>
            <div
              style={{
                width: "100%",
                maxWidth: 26,
                borderRadius: 8,
                height: `${w.heightPct}%`,
                background: w.barColor,
              }}
            />
            <div style={{ fontSize: 12, color: "var(--wr-text-muted)", fontWeight: 600 }}>{w.day}</div>
          </div>
        ))}
      </div>
      {weekMeters === 0 && (
        <div style={{ fontSize: 12.5, color: "var(--wr-text-faint)", fontWeight: 600, marginTop: 12, textAlign: "center" }}>
          이번 주엔 아직 걸은 기록이 없어요
        </div>
      )}
    </div>
  );

  return (
    <div style={{ padding: "2px 20px 30px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--wr-text)", padding: "6px 0 18px", margin: 0 }}>
        대시보드
      </h1>

      {weekCard}
      {weekChartCard}

      {records.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            padding: "40px 20px",
            color: "var(--wr-text-muted)",
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--wr-text)" }}>아직 사진 통계가 없어요</div>
          <div style={{ fontSize: 13, textAlign: "center" }}>사진 기록이 쌓이면 태그와 무드 통계가 여기 나타나요</div>
        </div>
      ) : (
        <>
          <div style={cardStyle}>
            <div style={{ ...cardLabel, marginBottom: 14 }}>태그 워드클라우드</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
              {tagCloud.map((t) => (
                <span key={t.word} style={{ fontSize: t.size, fontWeight: 700, color: t.color }}>
                  {t.word}
                </span>
              ))}
            </div>
          </div>

          <div style={{ ...cardStyle, marginBottom: 0 }}>
            <div style={{ ...cardLabel, marginBottom: 16 }}>무드 분포</div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div
                style={{
                  width: 110,
                  height: 110,
                  borderRadius: "50%",
                  background: donutGradient,
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <div style={{ position: "absolute", inset: 16, borderRadius: "50%", background: "var(--wr-card)" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                {moodLegend.map((m) => (
                  <div
                    key={m.mood}
                    style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--wr-text-muted)" }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>{m.mood}</div>
                    <div style={{ fontWeight: 700, color: "var(--wr-text)" }}>{m.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
