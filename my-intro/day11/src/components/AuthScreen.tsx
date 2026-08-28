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
      <div style={{ fontSize: 24, fontWeight: 800, color: "#2E2B24", marginBottom: 6 }}>산책기록</div>
      <div style={{ fontSize: 13, color: "#8B8578", marginBottom: 32 }}>
        {mode === "login" ? "다시 만나서 반가워요" : "오늘부터 산책을 기록해요"}
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
