import { MOOD_COLOR } from "@/lib/mood";
import { projectRecordsToMap } from "@/lib/dashboard";
import type { WalkRecord } from "@/types/walk";

export default function MapTab({
  records,
  onSelectPin,
}: {
  records: WalkRecord[];
  onSelectPin: (record: WalkRecord) => void;
}) {
  const pins = projectRecordsToMap(records);

  return (
    <div>
      <div style={{ padding: "2px 20px 12px" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 0" }}>지도</div>
        <div style={{ fontSize: 13, color: "#8B8578", fontWeight: 500, padding: "4px 0 14px" }}>
          발자취가 쌓인 곳
        </div>
      </div>
      <div
        style={{
          position: "relative",
          margin: "0 16px 16px",
          height: 540,
          borderRadius: 24,
          overflow: "hidden",
          background: "#EEEDE1",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 300 400"
          preserveAspectRatio="none"
          style={{ position: "absolute", inset: 0 }}
        >
          <ellipse cx="70" cy="90" rx="65" ry="48" fill="#DCE6D6" />
          <ellipse cx="235" cy="300" rx="55" ry="70" fill="#DCE6D6" />
          <path d="M0 150 C 90 130, 130 200, 300 190" stroke="#DAD5C4" strokeWidth="7" fill="none" />
          <path d="M20 0 C 60 90, 40 220, 90 400" stroke="#DAD5C4" strokeWidth="6" fill="none" />
          <path d="M300 60 C 220 100, 210 260, 260 400" stroke="#DAD5C4" strokeWidth="6" fill="none" />
        </svg>

        {records.length === 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              color: "#8B8578",
              fontWeight: 600,
              textAlign: "center",
              padding: "0 40px",
            }}
          >
            아직 발자취가 없어요
          </div>
        )}

        {pins.map(({ record, left, top }) => (
          <div
            key={record.id}
            onClick={() => onSelectPin(record)}
            style={{ position: "absolute", left: `${left}%`, top: `${top}%`, transform: "translate(-50%,-100%)", cursor: "pointer" }}
          >
            <svg width="26" height="34" viewBox="0 0 20 26">
              <path
                d="M10 0C4.5 0 0 4.5 0 10c0 7 10 16 10 16s10-9 10-16C20 4.5 15.5 0 10 0z"
                fill={MOOD_COLOR[record.ai_mood]}
              />
              <circle cx="10" cy="10" r="4" fill="#fff" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
