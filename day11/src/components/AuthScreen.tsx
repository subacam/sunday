"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

function translateAuthError(message: string): string {
  if (message.includes("Invalid login credentials")) return "이메일 또는 비밀번호가 올바르지 않아요";
  if (message.includes("already registered")) return "이미 가입된 이메일이에요";
  if (message.includes("Password should be at least")) return "비밀번호는 6자 이상이어야 해요";
  if (message.includes("Email not confirmed")) return "이메일 인증이 필요해요. 메일함을 확인해주세요";
  if (message.includes("rate limit")) return "시도가 너무 잦아요. 잠시 후 다시 시도해주세요";
  return "문제가 발생했어요. 잠시 후 다시 시도해주세요";
}

export default function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Google 로그인은 리다이렉트 방식이라 이 함수가 끝나도 onAuthed를 부르지 않는다 —
  // 돌아온 뒤 page.tsx의 onAuthStateChange가 세션을 받아 앱으로 넘긴다.
  // redirectTo를 현재 origin으로 명시해야 로컬(3000)과 배포 도메인 양쪽에서 같은 코드가 돈다
  // (Supabase 대시보드의 Redirect URLs에 두 주소가 모두 등록돼 있어야 한다).
  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      setGoogleLoading(false);
      setError(
        oauthError.message.includes("provider is not enabled")
          ? "구글 로그인이 아직 설정되지 않았어요"
          : "구글 로그인에 실패했어요. 잠시 후 다시 시도해주세요"
      );
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: authError } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (authError) {
      setError(translateAuthError(authError.message));
      return;
    }
    onAuthed();
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#FAF6EC",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 28px",
        zIndex: 45,
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 800, color: "#2E2B24", marginBottom: 6 }}>마이플</div>
      <div style={{ fontSize: 13, color: "#8B8578", marginBottom: 32 }}>
        {mode === "login" ? "다시 만나서 반가워요" : "오늘부터 산책을 기록해요"}
      </div>

      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          padding: 15,
          borderRadius: 16,
          background: "#fff",
          border: "1.5px solid #E3DFD2",
          color: "#2E2B24",
          fontWeight: 700,
          fontSize: 15,
          fontFamily: "inherit",
          cursor: "pointer",
          opacity: googleLoading ? 0.7 : 1,
          boxShadow: "0 2px 10px rgba(46,43,36,0.06)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 009 18z"
          />
          <path fill="#FBBC05" d="M3.96 10.71a5.41 5.41 0 010-3.42V4.96H.96a9 9 0 000 8.08l3-2.33z" />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.96l3 2.33C4.67 5.16 6.65 3.58 9 3.58z"
          />
        </svg>
        {googleLoading ? "구글로 이동 중..." : "Google로 계속하기"}
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 16px" }}>
        <div style={{ flex: 1, height: 1, background: "#E3DFD2" }} />
        <span style={{ fontSize: 12, color: "#B0AA98", fontWeight: 600 }}>또는 이메일로</span>
        <div style={{ flex: 1, height: 1, background: "#E3DFD2" }} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {error && (
          <div style={{ fontSize: 12.5, color: "#E37F6A", fontWeight: 600 }}>{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            textAlign: "center",
            padding: 15,
            borderRadius: 16,
            background: "#E8927C",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            border: "none",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
        </button>
      </form>

      <div
        onClick={() => {
          setError(null);
          setMode((m) => (m === "login" ? "signup" : "login"));
        }}
        style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "#8B8578", fontWeight: 600, cursor: "pointer" }}
      >
        {mode === "login" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 14,
  border: "1.5px solid #E3DFD2",
  background: "#fff",
  fontSize: 14.5,
  color: "#2E2B24",
  outline: "none",
};
