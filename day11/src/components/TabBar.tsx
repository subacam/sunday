import PawIcon from "@/components/PawIcon";

export type TabKey = "feed" | "map" | "dashboard" | "profile";

const ACTIVE = "#E8927C";
const MUTED = "#B0AA98";

export default function TabBar({
  active,
  onSelect,
  onOpenCapture,
}: {
  active: TabKey;
  onSelect: (tab: TabKey) => void;
  onOpenCapture: () => void;
}) {
  const feedColor = active === "feed" ? ACTIVE : MUTED;
  const mapColor = active === "map" ? ACTIVE : MUTED;
  const dashColor = active === "dashboard" ? ACTIVE : MUTED;
  const profileColor = active === "profile" ? ACTIVE : MUTED;

  return (
    <nav
      aria-label="주요 메뉴"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr",
        alignItems: "center",
        padding: "8px 8px 24px",
        background: "rgba(250,246,236,0.94)",
        backdropFilter: "blur(10px)",
        borderTop: "1px solid rgba(46,43,36,0.06)",
        position: "relative",
        zIndex: 5,
      }}
    >
      <div onClick={() => onSelect("feed")} style={tabCol}>
        <PawIcon size={22} color={feedColor} />
        <span style={{ fontSize: 11, fontWeight: 700, color: feedColor }}>피드</span>
      </div>

      <div onClick={() => onSelect("map")} style={tabCol}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z"
            stroke={mapColor}
            strokeWidth="2"
            fill="none"
          />
          <circle cx="12" cy="9" r="2.5" stroke={mapColor} strokeWidth="2" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: mapColor }}>지도</span>
      </div>

      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          onClick={onOpenCapture}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg,#F0A28C,#D97BA0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 16px rgba(232,146,124,0.4)",
            marginTop: -26,
            cursor: "pointer",
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z"
              stroke="#fff"
              strokeWidth="2"
              fill="none"
            />
            <circle cx="12" cy="14" r="3.5" stroke="#fff" strokeWidth="2" />
          </svg>
        </div>
      </div>

      <div onClick={() => onSelect("dashboard")} style={tabCol}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 20V10M12 20V4M20 20v-7" stroke={dashColor} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: dashColor }}>대시보드</span>
      </div>

      <div onClick={() => onSelect("profile")} style={tabCol}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="8" r="3.6" stroke={profileColor} strokeWidth="2" />
          <path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5" stroke={profileColor} strokeWidth="2" fill="none" />
        </svg>
        <span style={{ fontSize: 11, fontWeight: 700, color: profileColor }}>내 정보</span>
      </div>
    </nav>
  );
}

const tabCol: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
};
