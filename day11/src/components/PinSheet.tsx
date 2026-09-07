import { MOOD_BG, MOOD_COLOR } from "@/lib/mood";
import type { WalkRecord } from "@/types/walk";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function PinSheet({
  record,
  photoUrl,
  onClose,
}: {
  record: WalkRecord;
  photoUrl?: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        background: "#fff",
        borderRadius: "24px 24px 0 0",
        padding: "18px 20px 30px",
        boxShadow: "0 -8px 24px rgba(0,0,0,0.14)",
        zIndex: 35,
      }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <div
          onClick={onClose}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#F3F0E6",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M1 1l10 10M11 1L1 11" stroke="#8B8578" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <div
        style={{
          height: 130,
          borderRadius: 16,
          background: photoUrl ? `${MOOD_BG[record.ai_mood]} center/cover` : MOOD_BG[record.ai_mood],
          position: "relative",
          marginTop: 4,
          overflow: "hidden",
        }}
      >
        {photoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={record.ai_caption} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )}
        <div
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            padding: "5px 11px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.88)",
            fontSize: 12,
            fontWeight: 700,
            color: MOOD_COLOR[record.ai_mood],
          }}
        >
          {record.ai_mood}
        </div>
      </div>
      <div style={{ fontSize: 14.5, color: "#2E2B24", fontWeight: 500, lineHeight: 1.5, marginTop: 14 }}>
        {record.ai_caption}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
        {record.ai_tags.map((tag) => (
          <span
            key={tag}
            style={{ fontSize: 12, color: "#6B6656", background: "#F3F0E6", padding: "4px 10px", borderRadius: 14, fontWeight: 500 }}
          >
            {tag}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#B0AA98", fontWeight: 500, marginTop: 12, textAlign: "right" }}>
        {formatDate(record.created_at)}
      </div>
    </div>
  );
}
