"use client";

import { useState } from "react";

const SLIDES = [
  {
    title: <>찍으면 AI가<br />감성 캡션을 붙여줘요</>,
    desc: "사진 한 장이면 캡션·태그·무드가 저절로",
    svg: (
      <svg width="140" height="140" viewBox="0 0 160 160">
        <circle cx="80" cy="82" r="70" fill="#F3EFE4" />
        <rect x="35" y="55" width="70" height="52" rx="14" fill="#fff" stroke="#2E2B24" strokeWidth="3" />
        <rect x="55" y="45" width="22" height="14" rx="5" fill="#fff" stroke="#2E2B24" strokeWidth="3" />
        <circle cx="70" cy="81" r="17" fill="#FCE9E1" stroke="#2E2B24" strokeWidth="3" />
        <circle cx="70" cy="81" r="7" fill="#E8927C" />
        <circle cx="95" cy="64" r="3" fill="#2E2B24" />
        <path d="M110 40l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#F3C463" />
        <path d="M35 30l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#9DBE9A" />
        <rect x="98" y="95" width="46" height="30" rx="10" fill="#fff" stroke="#2E2B24" strokeWidth="2.5" />
        <path d="M110 125l-6 8v-8z" fill="#fff" stroke="#2E2B24" strokeWidth="2.5" />
        <line x1="106" y1="104" x2="136" y2="104" stroke="#E8927C" strokeWidth="3" strokeLinecap="round" />
        <line x1="106" y1="112" x2="128" y2="112" stroke="#E8927C" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: <>지도에 발자취가<br />쌓여요</>,
    desc: "내가 걸은 길이 그대로 나만의 지도가 돼요",
    svg: (
      <svg width="140" height="140" viewBox="0 0 160 160">
        <circle cx="80" cy="82" r="70" fill="#EAF2E6" />
        <path
          d="M25 120 C 55 120, 55 80, 85 80 S 110 40, 135 40"
          stroke="#fff"
          strokeWidth="6"
          strokeDasharray="2 10"
          strokeLinecap="round"
          fill="none"
        />
        <circle cx="25" cy="120" r="6" fill="#9DBE9A" />
        <circle cx="85" cy="80" r="7" fill="#F3C463" />
        <g transform="translate(122,24)">
          <path d="M13 0C6 0 0 6 0 13c0 9 13 21 13 21s13-12 13-21C26 6 20 0 13 0z" fill="#E8927C" />
          <circle cx="13" cy="13" r="5" fill="#fff" />
        </g>
      </svg>
    ),
  },
  {
    title: <>대시보드로 나의<br />산책을 돌아봐요</>,
    desc: "태그, 요일, 무드로 나의 산책 습관을 확인해요",
    svg: (
      <svg width="140" height="140" viewBox="0 0 160 160">
        <circle cx="80" cy="82" r="70" fill="#FBEEE3" />
        <rect x="35" y="90" width="16" height="40" rx="6" fill="#9DBE9A" />
        <rect x="60" y="65" width="16" height="65" rx="6" fill="#E8927C" />
        <rect x="85" y="100" width="16" height="30" rx="6" fill="#F3C463" />
        <circle cx="122" cy="55" r="20" fill="none" stroke="#BFA8DE" strokeWidth="8" />
        <circle
          cx="122"
          cy="55"
          r="20"
          fill="none"
          stroke="#E8927C"
          strokeWidth="8"
          strokeDasharray="60 70"
          strokeLinecap="round"
          transform="rotate(-90 122 55)"
        />
      </svg>
    ),
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const isLast = step >= SLIDES.length - 1;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background:
          "radial-gradient(90% 70% at 15% 10%, #FBE2DC 0%, transparent 60%), radial-gradient(80% 65% at 90% 90%, #E9E0FA 0%, transparent 60%), #FAF6EC",
        display: "flex",
        flexDirection: "column",
        zIndex: 45,
      }}
    >
      <div style={{ height: 54 }} />
      <div
        onClick={onDone}
        style={{
          alignSelf: "flex-end",
          padding: "0 20px",
          fontSize: 13,
          color: "#8B8578",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        건너뛰기
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          padding: "0 30px",
        }}
      >
        {SLIDES[step].svg}
        <div style={{ fontSize: 18, fontWeight: 800, color: "#2E2B24", textAlign: "center", lineHeight: 1.4 }}>
          {SLIDES[step].title}
        </div>
        <div style={{ fontSize: 13, color: "#8B8578", textAlign: "center" }}>{SLIDES[step].desc}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 6, paddingBottom: 18 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === step ? 20 : 8,
              height: 8,
              borderRadius: 4,
              background: i === step ? "#E8927C" : "#E3DFD2",
            }}
          />
        ))}
      </div>
      <div style={{ padding: "0 20px 40px" }}>
        <div
          onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}
          style={{
            textAlign: "center",
            padding: 15,
            borderRadius: 16,
            background: "linear-gradient(135deg,#F0A28C,#D97BA0)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {isLast ? "시작하기" : "다음"}
        </div>
      </div>
    </div>
  );
}
