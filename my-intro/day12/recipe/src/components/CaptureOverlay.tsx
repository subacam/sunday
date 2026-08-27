"use client";

import { useEffect, useRef, useState } from "react";

export default function CaptureOverlay({
  onClose,
  onCaptured,
}: {
  onClose: () => void;
  onCaptured: (blob: Blob, mimeType: string) => void;
}) {
  const hasCamera = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(!hasCamera);

  useEffect(() => {
    if (!hasCamera) return;
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      })
      .catch(() => {
        if (!cancelled) setCameraError(true);
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [hasCamera]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCaptured(blob, "image/jpeg");
    }, "image/jpeg", 0.9);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onCaptured(file, file.type || "image/jpeg");
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "#111311", position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "58px 20px 12px" }}>
        <div onClick={onClose} style={{ color: "#fff", fontSize: 22, cursor: "pointer" }}>
          ✕
        </div>
        <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>영수증 촬영</div>
        <div style={{ width: 22 }} />
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: "10px 24px" }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 300,
            aspectRatio: "3/4",
            border: "1.5px dashed rgba(255,255,255,0.35)",
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {cameraReady && (
            <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          )}
          {[
            { top: -1, left: -1, borderTop: true, borderLeft: true, radius: "12px 0 0 0" },
            { top: -1, right: -1, borderTop: true, borderRight: true, radius: "0 12px 0 0" },
            { bottom: -1, left: -1, borderBottom: true, borderLeft: true, radius: "0 0 0 12px" },
            { bottom: -1, right: -1, borderBottom: true, borderRight: true, radius: "0 0 12px 0" },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: c.top,
                left: c.left,
                right: c.right,
                bottom: c.bottom,
                width: 28,
                height: 28,
                borderTop: c.borderTop ? "3px solid #fff" : undefined,
                borderLeft: c.borderLeft ? "3px solid #fff" : undefined,
                borderRight: c.borderRight ? "3px solid #fff" : undefined,
                borderBottom: c.borderBottom ? "3px solid #fff" : undefined,
                borderRadius: c.radius,
              }}
            />
          ))}
          {!cameraReady && (
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", padding: "0 20px" }}>
              {cameraError ? (
                <>
                  카메라를 사용할 수 없어요.
                  <br />
                  갤러리에서 영수증 사진을 선택해주세요.
                </>
              ) : (
                <>
                  영수증 전체가
                  <br />
                  보이도록 맞춰주세요
                </>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", padding: "10px 32px 48px" }}>
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="14" rx="2" stroke="#fff" strokeWidth="1.6" />
            <circle cx="8.5" cy="11" r="1.6" fill="#fff" />
            <path d="M3 16l5-4 4 3 3-2 6 5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div
          onClick={takePhoto}
          style={{
            width: 74,
            height: 74,
            borderRadius: "50%",
            background: cameraReady ? "#fff" : "rgba(255,255,255,0.3)",
            border: "4px solid rgba(255,255,255,0.3)",
            cursor: cameraReady ? "pointer" : "default",
          }}
        />
        <div style={{ width: 44, height: 44 }} />
      </div>
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} style={{ display: "none" }} />
    </div>
  );
}
