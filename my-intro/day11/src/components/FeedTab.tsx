import { MOOD_BG, MOOD_COLOR } from "@/lib/mood";
import type { WalkRecord } from "@/types/walk";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function FeedTab({
  records,
  imageUrls,
}: {
  records: WalkRecord[];
  imageUrls: Record<string, string>;
}) {
  return (
    <div style={{ padding: "2px 20px 24px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 0" }}>피드</div>
      <div style={{ fontSize: 13, color: "#8B8578", fontWeight: 500, padding: "4px 0 18px" }}>
        {records.length}개의 기록
      </div>

      {records.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: "40px 20px",
          }}
        >
          <svg width="130" height="130" viewBox="0 0 160 160">
            <circle cx="80" cy="82" r="70" fill="#F3EFE4" />
            <rect x="40" y="60" width="70" height="52" rx="14" fill="#fff" stroke="#2E2B24" strokeWidth="3" />
            <rect x="60" y="50" width="22" height="14" rx="5" fill="#fff" stroke="#2E2B24" strokeWidth="3" />
            <circle cx="75" cy="86" r="17" fill="#EAF2E6" stroke="#2E2B24" strokeWidth="3" />
            <circle cx="75" cy="86" r="7" fill="#9DBE9A" />
            <circle cx="118" cy="112" r="16" fill="#E8927C" />
            <line x1="118" y1="105" x2="118" y2="119" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <line x1="111" y1="112" x2="125" y2="112" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#2E2B24", textAlign: "center" }}>
            지금 첫 기록을 남겨주세요
          </div>
          <div style={{ fontSize: 13, color: "#8B8578", textAlign: "center" }}>
            아래 카메라 버튼을 눌러 산책을 기록해보세요
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {records.map((rec) => {
            const photoUrl = imageUrls[rec.image_url];
            return (
              <div
                key={rec.id}
                style={{
                  background: "#fff",
                  borderRadius: 20,
                  overflow: "hidden",
                  boxShadow: "0 2px 10px rgba(46,43,36,0.07)",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: 150,
                    background: photoUrl ? `${MOOD_BG[rec.ai_mood]} center/cover` : MOOD_BG[rec.ai_mood],
                  }}
                >
                  {photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={rec.ai_caption}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      padding: "5px 11px",
                      borderRadius: 20,
                      background: "rgba(255,255,255,0.88)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: MOOD_COLOR[rec.ai_mood],
                    }}
                  >
                    {rec.ai_mood}
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 14.5, color: "#2E2B24", fontWeight: 500, lineHeight: 1.5 }}>
                    {rec.ai_caption}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {rec.ai_tags.map((tag) => (
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
                  <div style={{ fontSize: 12, color: "#B0AA98", fontWeight: 500, marginTop: 12, textAlign: "right" }}>
                    {formatDate(rec.created_at)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
