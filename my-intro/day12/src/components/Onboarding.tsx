"use client";

import { useState } from "react";

const STEP_ICONS = [
  <svg key="0" width="46" height="46" viewBox="0 0 24 24" fill="none">
    <path d="M6 2h12v18l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3V2z" stroke="#F6F4EF" strokeWidth={1.6} strokeLinejoin="round" />
    <path d="M8.5 7h7M8.5 10.5h7M8.5 14h4.5" stroke="#F6F4EF" strokeWidth={1.4} strokeLinecap="round" />
  </svg>,
  <svg key="1" width="46" height="46" viewBox="0 0 24 24" fill="none">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" stroke="#F6F4EF" strokeWidth={1.6} strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" stroke="#F6F4EF" strokeWidth={1.6} />
  </svg>,
  <svg key="2" width="46" height="46" viewBox="0 0 24 24" fill="none">
    <path d="M4 7l1.2-2.4A2 2 0 0 1 7 3.5h10a2 2 0 0 1 1.8 1.1L20 7" stroke="#F6F4EF" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    <rect x="3.5" y="7" width="17" height="12.5" rx="3" stroke="#F6F4EF" strokeWidth={1.6} />
    <circle cx="12" cy="13" r="3.4" stroke="#F6F4EF" strokeWidth={1.6} />
  </svg>,
];

const STEP_TEXT = [
  { title: <>영수증만 찍으면<br />가계부 완성</>, body: <>촬영, 입력, 분류까지<br />AI가 대신 해드려요</> },
  { title: <>AI 인식 → 자동 분류<br />→ 대시보드</>, body: <>지출 패턴을 한눈에<br />확인할 수 있어요</> },
  { title: <>카메라 권한이<br />필요해요</>, body: <>영수증 촬영을 위해서만 사용하고<br />다른 목적에는 쓰지 않아요</> },
];

export default function Onboarding({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const [step, setStep] = useState(0);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#F6F4EF", position: "relative" }}>
      <div style={{ position: "absolute", top: 58, right: 20, zIndex: 5 }}>
        <div onClick={() => setStep(3)} style={{ fontSize: 14, color: "rgba(28,30,29,0.45)", padding: 8, cursor: "pointer" }}>
          건너뛰기
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px", gap: 22, textAlign: "center" }}>
        {step < 3 ? (
          <>
            <div style={{ width: 96, height: 96, borderRadius: 28, background: "#2B5A4C", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {STEP_ICONS[step]}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1C1E1D", lineHeight: 1.4 }}>{STEP_TEXT[step].title}</div>
            <div style={{ fontSize: 15, color: "rgba(28,30,29,0.55)", lineHeight: 1.6 }}>{STEP_TEXT[step].body}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1C1E1D" }}>지금 시작해볼까요?</div>
            <div style={{ fontSize: 15, color: "rgba(28,30,29,0.55)", lineHeight: 1.6 }}>계정 없이도 먼저 둘러볼 수 있어요</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", marginTop: 8 }}>
              <div
                onClick={onContinue}
                style={{ height: 52, borderRadius: 14, background: "#1C1E1D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >
                이메일로 계속하기
              </div>
            </div>
          </>
        )}
      </div>

      <div style={{ padding: "0 0 40px", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                width: i === step ? 22 : 6,
                height: 6,
                borderRadius: 3,
                background: i === step ? "#2B5A4C" : "rgba(28,30,29,0.15)",
                transition: "width .2s",
              }}
            />
          ))}
        </div>
        {step < 3 && (
          <div
            onClick={() => setStep((s) => Math.min(3, s + 1))}
            style={{ width: 200, height: 52, borderRadius: 14, background: "#2B5A4C", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 600, cursor: "pointer" }}
          >
            다음
          </div>
        )}
      </div>
    </div>
  );
}
