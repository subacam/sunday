"use client";

import { useState, type FormEvent } from "react";
import { supabase } from "@/lib/supabase";

// 디자인(가계부 앱.dc.html)의 온보딩 마지막 스텝은 Google/카카오 소셜 로그인 버튼을 보여주지만,
// 실제 OAuth 앱 등록 없이는 동작시킬 수 없어(day11 AuthScreen과 동일한 이유로) 이메일/비밀번호
// 인증으로 대체했다. "게스트로 둘러보기"는 익명 로그인이 이 프로젝트에서 비활성화되어 있어
// (Supabase 대시보드에서 켜야 함) 무작위 이메일로 즉석 계정을 만들어 흉내낸다.
export default function AuthScreen({ onAuthed }: { onAuthed: () => void }) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
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
      setError(authError.message);
      return;
    }
    onAuthed();
  }

  async function handleGuest() {
    setError(null);
    setLoading(true);
    const guestEmail = `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@ledger.local`;
    const guestPassword = Math.random().toString(36).slice(2) + "Aa1!";
    const { error: authError } = await supabase.auth.signUp({ email: guestEmail, password: guestPassword });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    onAuthed();
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#F6F4EF",
        padding: "0 28px",
      }}
    >
      <div style={{ fontSize: 24, fontWeight: 700, color: "#1C1E1D", marginBottom: 6 }}>AI 영수증 가계부</div>
      <div style={{ fontSize: 13, color: "rgba(28,30,29,0.55)", marginBottom: 32 }}>
        {mode === "login" ? "다시 만나서 반가워요" : "이메일로 계정을 만들어요"}
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

        {error && <div style={{ fontSize: 12.5, color: "#C1663F", fontWeight: 600 }}>{error}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: 8,
            height: 52,
            borderRadius: 14,
            background: "#2B5A4C",
            color: "#fff",
            fontWeight: 600,
            fontSize: 15,
            border: "none",
            cursor: "pointer",
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
        style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "rgba(28,30,29,0.5)", fontWeight: 600, cursor: "pointer" }}
      >
        {mode === "login" ? "계정이 없나요? 회원가입" : "이미 계정이 있나요? 로그인"}
      </div>

      <div
        onClick={handleGuest}
        style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: "rgba(28,30,29,0.4)", cursor: "pointer" }}
      >
        게스트로 둘러보기
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "14px 16px",
  borderRadius: 14,
  border: "1.5px solid rgba(28,30,29,0.12)",
  background: "#fff",
  fontSize: 14.5,
  color: "#1C1E1D",
  outline: "none",
};
