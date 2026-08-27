import { MOOD_BG, MOOD_COLOR } from "@/lib/mood";
import type { WalkRecord } from "@/types/walk";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function FeedDetailModal({
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
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(30,28,22,0.5)",
        zIndex: 65,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 22px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "calc(100% - 40px)",
          maxWidth: 322,
          background: "#fff",
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          maxHeight: "82%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "4/3",
            background: photoUrl ? `${MOOD_BG[record.ai_mood]} center/cover` : MOOD_BG[record.ai_mood],
            flexShrink: 0,
          }}
        >
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={record.ai_caption}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            />
          )}
          <div
            onClick={onClose}
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 14,
              color: "#8B8578",
            }}
          >
            ✕
          </div>
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              padding: "5px 11px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.92)",
              fontSize: 12,
              fontWeight: 700,
              color: MOOD_COLOR[record.ai_mood],
            }}
          >
            {record.ai_mood}
          </div>
        </div>
        <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflow: "auto" }}>
          <div style={{ fontSize: 14.5, color: "#2E2B24", fontWeight: 500, lineHeight: 1.55 }}>
            {record.ai_caption}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {record.ai_tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  color: "#6B6656",
                  background: "#F3F0E6",
                  padding: "4px 10px",
                  borderRadius: 14,
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: "#B0AA98", fontWeight: 500, textAlign: "right" }}>
            {formatDate(record.created_at)}
          </div>
        </div>
      </div>
    </div>
  );
}
