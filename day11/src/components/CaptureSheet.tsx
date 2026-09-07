"use client";

import { useRef } from "react";
import { MOOD_BG, MOOD_COLOR } from "@/lib/mood";
import type { PendingAnalysis } from "@/types/walk";

export type CaptureStep = "choose" | "loading" | "result";

export type PhotoSource = "camera" | "gallery";

export default function CaptureSheet({
  step,
  previewUrl,
  pending,
  locationSource,
  onFileSelected,
  onCancel,
  onRetake,
  onSave,
}: {
  step: CaptureStep;
  previewUrl?: string;
  pending?: PendingAnalysis;
  locationSource?: "device" | "photo";
  onFileSelected: (file: File, source: PhotoSource) => void;
  onCancel: () => void;
  onRetake: () => void;
  onSave: () => void;
}) {
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  function handleChange(source: PhotoSource) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) onFileSelected(file, source);
    };
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(30,28,22,0.45)",
        zIndex: 40,
        display: "flex",
        alignItems: "flex-end",
      }}
    >
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={handleChange("camera")} />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={handleChange("gallery")} />

      {step === "choose" && (
        <div style={{ width: "100%", background: "var(--wr-card)", borderRadius: "24px 24px 0 0", padding: "22px 20px 34px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--wr-border-strong)", margin: "0 auto 6px" }} />
          <div style={{ fontSize: 18, fontWeight: 800, color: "var(--wr-text)", textAlign: "center" }}>새로운 기록</div>
          <div style={{ fontSize: 13, color: "var(--wr-text-muted)", textAlign: "center", marginBottom: 6 }}>
            사진을 찍으면 AI가 감성을 붙여드려요
          </div>
          <div
            onClick={() => cameraInput.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, background: "var(--wr-card-alt)", cursor: "pointer" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V9a1 1 0 011-1z" stroke="var(--wr-accent)" strokeWidth="2" fill="none" />
              <circle cx="12" cy="14" r="3.5" stroke="var(--wr-accent)" strokeWidth="2" />
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--wr-text)" }}>카메라로 촬영</div>
              <div style={{ fontSize: 12, color: "var(--wr-text-muted)" }}>지금 이 순간을 담아요</div>
            </div>
          </div>
          <div
            onClick={() => galleryInput.current?.click()}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, background: "var(--wr-card-alt)", cursor: "pointer" }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="2" stroke="#9DBE9A" strokeWidth="2" />
              <circle cx="8.5" cy="9.5" r="1.5" fill="#9DBE9A" />
              <path d="M4 16l5-5 4 4 3-3 4 4" stroke="#9DBE9A" strokeWidth="2" fill="none" />
            </svg>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--wr-text)" }}>갤러리에서 선택</div>
              <div style={{ fontSize: 12, color: "var(--wr-text-muted)" }}>이미 찍어둔 사진이 있어요</div>
            </div>
          </div>
          <div onClick={onCancel} style={{ textAlign: "center", fontSize: 14, color: "var(--wr-text-muted)", fontWeight: 600, paddingTop: 4, cursor: "pointer" }}>
            취소
          </div>
        </div>
      )}

      {step === "loading" && (
        <div style={{ width: "100%", background: "var(--wr-card)", borderRadius: "24px 24px 0 0", padding: "44px 20px 54px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", border: "4px solid var(--wr-card-alt)", borderTopColor: "var(--wr-accent)", animation: "wr-spin 0.9s linear infinite" }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--wr-text)" }}>AI가 사진을 분석하고 있어요</div>
          <div style={{ fontSize: 12.5, color: "var(--wr-text-muted)" }}>캡션, 태그, 무드를 찾는 중...</div>
        </div>
      )}

      {step === "result" && pending && (
        <div style={{ width: "100%", background: "var(--wr-card)", borderRadius: "24px 24px 0 0", padding: "20px 20px 30px", display: "flex", flexDirection: "column", gap: 14, maxHeight: 660, overflow: "auto", boxSizing: "border-box" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--wr-border-strong)", margin: "0 auto" }} />
          <div style={{ height: 140, borderRadius: 16, background: previewUrl ? `${MOOD_BG[pending.mood]} center/cover` : MOOD_BG[pending.mood], position: "relative", overflow: "hidden" }}>
            {previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            )}
            <div style={{ position: "absolute", top: 10, left: 10, padding: "5px 11px", borderRadius: 20, background: "rgba(255,255,255,0.88)", fontSize: 12, fontWeight: 700, color: MOOD_COLOR[pending.mood] }}>
              {pending.mood}
            </div>
          </div>
          <div style={{ fontSize: 14.5, color: "var(--wr-text)", fontWeight: 500, lineHeight: 1.5 }}>{pending.caption}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {pending.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 12, color: "var(--wr-text-chip)", background: "var(--wr-card-alt)", padding: "4px 10px", borderRadius: 14, fontWeight: 500 }}>
                {tag}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--wr-text-muted)" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M12 21s7-6.5 7-12a7 7 0 10-14 0c0 5.5 7 12 7 12z" stroke="var(--wr-text-muted)" strokeWidth="2" fill="none" />
              <circle cx="12" cy="9" r="2.5" stroke="var(--wr-text-muted)" strokeWidth="2" />
            </svg>
            {locationSource === "photo" ? "사진에 저장된 위치가 기록돼요" : "현재 위치가 기록돼요"}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
            <div onClick={onRetake} style={{ flex: 1, textAlign: "center", padding: 14, borderRadius: 14, border: "1.5px solid var(--wr-border-strong)", color: "var(--wr-text-chip)", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              다시 촬영
            </div>
            <div onClick={onSave} style={{ flex: 1, textAlign: "center", padding: 14, borderRadius: 14, background: "linear-gradient(135deg,#F0A28C,#D97BA0)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              저장
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
