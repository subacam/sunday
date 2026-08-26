import type { WalkRecord } from "@/types/walk";

function joinedLabel(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월부터 걷고 있어요`;
}

function lastRecordLabel(records: WalkRecord[]) {
  if (records.length === 0) return "-";
  const d = new Date(records[0].created_at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function ProfileTab({
  records,
  joinedAt,
  onReopenOnboarding,
  onLogout,
}: {
  records: WalkRecord[];
  joinedAt?: string;
  onReopenOnboarding: () => void;
  onLogout: () => void;
}) {
  const uniqueTagCount = new Set(records.flatMap((r) => r.ai_tags)).size;

  return (
    <div style={{ padding: "2px 20px 30px" }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 18px" }}>내 정보</div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingBottom: 16 }}>
        <div
          style={{
            width: 76,
            height: 76,
            borderRadius: "50%",
            background: "#E8927C",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 14px rgba(232,146,124,0.35)",
          }}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="8" r="4" fill="#fff" />
            <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#fff" />
          </svg>
        </div>
        <div style={{ fontSize: 17, fontWeight: 800, color: "#2E2B24", marginTop: 6 }}>산책자</div>
        <div style={{ fontSize: 12.5, color: "#8B8578" }}>{joinedLabel(joinedAt)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, paddingBottom: 16 }}>
        <StatTile label="총 기록" value={String(records.length)} />
        <StatTile label="고유 태그" value={String(uniqueTagCount)} />
        <StatTile label="최근 기록" value={lastRecordLabel(records)} small />
      </div>

      <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(46,43,36,0.05)" }}>
        <Row label="온보딩 다시보기" onClick={onReopenOnboarding} />
        <Row label="알림 설정" />
        <Row label="위치 권한" last />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 16px" }}>
          <span onClick={onLogout} style={{ fontSize: 14.5, color: "#E37F6A", fontWeight: 600, cursor: "pointer" }}>
            로그아웃
          </span>
        </div>
      </div>
    </div>
  );
}

function StatTile({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div style={{ background: "#fff", borderRadius: 16, padding: "14px 8px", textAlign: "center", boxShadow: "0 2px 8px rgba(46,43,36,0.05)" }}>
      <div style={{ fontSize: small ? 14 : 18, fontWeight: 800, color: "#2E2B24" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#8B8578", marginTop: 2 }}>{label}</div>
    </div>
  );
}

function Row({ label, onClick, last }: { label: string; onClick?: () => void; last?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "15px 16px",
        borderBottom: last ? "none" : "1px solid #F1EDE2",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ fontSize: 14.5, color: "#2E2B24", fontWeight: 500 }}>{label}</span>
      <svg width="8" height="14" viewBox="0 0 8 14">
        <path d="M1 1l6 6-6 6" stroke="#C7C2B2" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}
