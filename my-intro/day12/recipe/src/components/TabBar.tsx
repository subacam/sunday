"use client";

import { TabId } from "@/types/ledger";

const ACTIVE = "#2B5A4C";
const INACTIVE = "rgba(28,30,29,0.4)";

export default function TabBar({
  tab,
  onSelect,
  onCapture,
}: {
  tab: TabId;
  onSelect: (t: TabId) => void;
  onCapture: () => void;
}) {
  const colorFor = (t: TabId) => (tab === t ? ACTIVE : INACTIVE);

  return (
    <div
      style={{
        flexShrink: 0,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        padding: "10px 12px 24px",
        background: "rgba(246,244,239,0.92)",
        backdropFilter: "blur(10px)",
        borderTop: "0.5px solid rgba(28,30,29,0.08)",
      }}
    >
      <TabButton label="피드" color={colorFor("feed")} onClick={() => onSelect("feed")}>
        <path d="M4 6h16M4 12h16M4 18h10" stroke={colorFor("feed")} strokeWidth="1.8" strokeLinecap="round" />
      </TabButton>

      <TabButton label="트렌드" color={colorFor("trend")} onClick={() => onSelect("trend")}>
        <circle cx="8.5" cy="9" r="3" stroke={colorFor("trend")} strokeWidth="1.8" />
        <circle cx="16" cy="10.5" r="2.3" stroke={colorFor("trend")} strokeWidth="1.8" />
        <path d="M2.5 19c0.8-3.2 3.2-5 6-5s5.2 1.8 6 5" stroke={colorFor("trend")} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M14.8 15c2 0.2 3.6 1.7 4.2 4" stroke={colorFor("trend")} strokeWidth="1.8" strokeLinecap="round" />
      </TabButton>

      <div
        onClick={onCapture}
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#2B5A4C",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          marginTop: -26,
          boxShadow: "0 8px 18px rgba(43,90,76,0.35)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M4 7l1.2-2.4A2 2 0 0 1 7 3.5h10a2 2 0 0 1 1.8 1.1L20 7" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="3.5" y="7" width="17" height="12.5" rx="3" stroke="#fff" strokeWidth="1.7" />
          <circle cx="12" cy="13" r="3.4" stroke="#fff" strokeWidth="1.7" />
        </svg>
      </div>

      <TabButton label="대시보드" color={colorFor("dashboard")} onClick={() => onSelect("dashboard")}>
        <path d="M5 20V10M12 20V4M19 20v-7" stroke={colorFor("dashboard")} strokeWidth="1.8" strokeLinecap="round" />
      </TabButton>

      <TabButton label="마이" color={colorFor("mai")} onClick={() => onSelect("mai")}>
        <circle cx="12" cy="8" r="3.6" stroke={colorFor("mai")} strokeWidth="1.8" />
        <path d="M5 20c1-3.8 4-6 7-6s6 2.2 7 6" stroke={colorFor("mai")} strokeWidth="1.8" strokeLinecap="round" />
      </TabButton>
    </div>
  );
}

function TabButton({
  label,
  color,
  onClick,
  children,
}: {
  label: string;
  color: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <div onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", width: 52 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        {children}
      </svg>
      <div style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</div>
    </div>
  );
}
