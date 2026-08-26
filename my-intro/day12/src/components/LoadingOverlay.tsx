"use client";

import { useEffect, useState } from "react";

const STEPS = ["이미지 정리 중", "글자 인식(OCR) 중", "카테고리 분류 중"];

export default function LoadingOverlay() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => Math.min(STEPS.length - 1, a + 1));
    }, 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#111311",
        gap: 26,
        padding: "0 40px",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          border: "4px solid rgba(255,255,255,0.15)",
          borderTopColor: "#E7A94E",
          animation: "spin 0.9s linear infinite",
        }}
      />
      <div style={{ color: "#fff", fontSize: 16, fontWeight: 600, textAlign: "center" }}>영수증을 읽는 중이에요</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 220 }}>
        {STEPS.map((label, i) => {
          const done = i < active;
          const current = i === active;
          const color = done ? "rgba(255,255,255,0.85)" : current ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.35)";
          return (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: done ? "#E7A94E" : current ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)",
                  animation: current ? "pulse 1.2s ease infinite" : undefined,
                }}
              />
              <div>{label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
