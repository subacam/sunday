"use client";

import { useEffect, useRef, useState } from "react";
import { getCurrentPosition } from "@/lib/capture";
import type { WalkRecord } from "@/types/walk";

const NICKNAME_MAX_LENGTH = 20;

type PermissionLabel = "granted" | "denied" | "prompt" | "unsupported";

function permissionText(status: PermissionLabel) {
  switch (status) {
    case "granted":
      return "허용됨";
    case "denied":
      return "거부됨";
    case "unsupported":
      return "미지원";
    default:
      return "";
  }
}

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
  nickname,
  avatarUrl,
  onReopenOnboarding,
  onLogout,
  onToast,
  onUpdateNickname,
  onUpdateAvatar,
}: {
  records: WalkRecord[];
  joinedAt?: string;
  nickname: string | null;
  avatarUrl: string | null;
  onReopenOnboarding: () => void;
  onLogout: () => void;
  onToast: (message: string) => void;
  onUpdateNickname: (nickname: string) => void;
  onUpdateAvatar: (file: File) => Promise<void>;
}) {
  const uniqueTagCount = new Set(records.flatMap((r) => r.ai_tags)).size;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(nickname ?? "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function startEditingName() {
    setNameDraft(nickname ?? "");
    setEditingName(true);
  }

  function commitNickname() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      onToast("닉네임을 입력해주세요");
      return;
    }
    if (trimmed !== nickname) onUpdateNickname(trimmed);
    setEditingName(false);
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일을 다시 골라도 change 이벤트가 뜨도록 초기화
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      onToast("이미지 파일만 첨부할 수 있어요");
      return;
    }
    setAvatarUploading(true);
    try {
      await onUpdateAvatar(file);
    } finally {
      setAvatarUploading(false);
    }
  }

  const [notifStatus, setNotifStatus] = useState<PermissionLabel>("unsupported");
  const [geoStatus, setGeoStatus] = useState<PermissionLabel>("unsupported");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      // 마운트 시점에 브라우저 외부 상태(권한값)를 한 번 읽어와 state로 옮기는 것뿐이라 여기서만 끈다.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifStatus(Notification.permission === "default" ? "prompt" : Notification.permission);
    }
    if (typeof navigator !== "undefined" && "permissions" in navigator) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => setGeoStatus(status.state as PermissionLabel))
        .catch(() => setGeoStatus("unsupported"));
    }
  }, []);

  async function handleNotificationClick() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      onToast("이 브라우저에서는 알림을 지원하지 않아요");
      return;
    }
    if (Notification.permission === "granted") {
      onToast("이미 알림이 허용되어 있어요");
      return;
    }
    if (Notification.permission === "denied") {
      onToast("알림이 차단되어 있어요. 브라우저 설정에서 허용해주세요");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifStatus(result === "default" ? "prompt" : result);
    onToast(result === "granted" ? "알림이 허용됐어요" : "알림 요청이 거부됐어요");
  }

  async function handleLocationClick() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      onToast("이 브라우저에서는 위치 정보를 지원하지 않아요");
      return;
    }
    try {
      await getCurrentPosition();
      setGeoStatus("granted");
      onToast("위치 권한이 허용됐어요");
    } catch (err) {
      const code = (err as GeolocationPositionError | undefined)?.code;
      if (code === 1) {
        setGeoStatus("denied");
        onToast("위치 권한이 필요해요. 브라우저 설정에서 허용해주세요");
      } else {
        onToast("위치를 확인하지 못했어요. 다시 시도해주세요");
      }
    }
  }

  return (
    <div style={{ padding: "2px 20px 30px" }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: "#2E2B24", padding: "6px 0 18px", margin: 0 }}>내 정보</h1>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingBottom: 16 }}>
        <div style={{ position: "relative" }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: "50%",
              overflow: "hidden",
              background: avatarUrl ? "#F1EDE2" : "linear-gradient(135deg,#F0A28C,#D97BA0)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 14px rgba(232,146,124,0.35)",
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="프로필 사진"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" fill="#fff" />
                <path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7" fill="#fff" />
              </svg>
            )}
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              position: "absolute",
              right: -2,
              bottom: -2,
              width: 26,
              height: 26,
              borderRadius: "50%",
              background: "#fff",
              border: "2px solid #FAF6EC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(46,43,36,0.18)",
            }}
          >
            {avatarUploading ? (
              <span style={{ fontSize: 9, color: "#8B8578" }}>···</span>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 8h3l2-3h6l2 3h3v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8Z"
                  stroke="#8B8578"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="13" r="3.2" stroke="#8B8578" strokeWidth="1.8" />
              </svg>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            style={{ display: "none" }}
          />
        </div>

        {editingName ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNickname();
                if (e.key === "Escape") setEditingName(false);
              }}
              placeholder="닉네임"
              maxLength={NICKNAME_MAX_LENGTH}
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "#2E2B24",
                border: "1.5px solid #E3DFD2",
                borderRadius: 10,
                padding: "4px 10px",
                outline: "none",
                width: 130,
                textAlign: "center",
              }}
            />
            <span onClick={commitNickname} style={{ fontSize: 13, color: "#E37F6A", fontWeight: 700, cursor: "pointer" }}>
              저장
            </span>
            <span onClick={() => setEditingName(false)} style={{ fontSize: 13, color: "#8B8578", cursor: "pointer" }}>
              취소
            </span>
          </div>
        ) : (
          <div
            onClick={startEditingName}
            style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer", marginTop: 6 }}
          >
            <span style={{ fontSize: 17, fontWeight: 800, color: "#2E2B24" }}>{nickname || "산책자"}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M4 20h4l10-10-4-4L4 16v4Z" stroke="#C7C2B2" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        )}
        <div style={{ fontSize: 12.5, color: "#8B8578" }}>{joinedLabel(joinedAt)}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, paddingBottom: 16 }}>
        <StatTile label="총 기록" value={String(records.length)} />
        <StatTile label="고유 태그" value={String(uniqueTagCount)} />
        <StatTile label="최근 기록" value={lastRecordLabel(records)} small />
      </div>

      <div style={{ background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 2px 8px rgba(46,43,36,0.05)" }}>
        <Row label="온보딩 다시보기" onClick={onReopenOnboarding} />
        <Row label="알림 설정" badge={permissionText(notifStatus)} onClick={handleNotificationClick} />
        <Row label="위치 권한" badge={permissionText(geoStatus)} onClick={handleLocationClick} last />
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

function Row({
  label,
  badge,
  onClick,
  last,
}: {
  label: string;
  badge?: string;
  onClick?: () => void;
  last?: boolean;
}) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {badge && <span style={{ fontSize: 12.5, color: "#8B8578" }}>{badge}</span>}
        <svg width="8" height="14" viewBox="0 0 8 14">
          <path d="M1 1l6 6-6 6" stroke="#C7C2B2" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
