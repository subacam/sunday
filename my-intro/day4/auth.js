// day4 유일의 공유 로직 파일 — index.html/place.html은 각자 자체 완결(헬퍼 중복)이
// 원칙이지만(day4/CLAUDE.md), 로그인/세션은 두 페이지에 복붙하면 drift가 나는 보안 민감
// 코드이고, "지금 로그인한 사람이 누구인지"를 다른 기능(즐겨찾기, 핀 등록 로그인 게이트
// 등)이 그대로 가져다 쓸 수 있어야 한다는 요구 때문에 의도적으로 예외를 둔 파일이다.
//
// index.html/place.html 양쪽에서 <script type="module" src="auth.js"></script>로 로드하고,
// window.Day4Auth를 통해서만 접근한다.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 비밀값이 아니다 — 카카오맵 JS 키와 같은 성격으로 브라우저에 노출되는 게 정상이다
// (day4/CLAUDE.md "서비스키" 절 참고). RLS가 실제 접근 범위를 통제한다.
const SUPABASE_URL = "https://srhnwzcnimadmoyfukwd.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_lszrxj-ZCq3itUfcrqatrg_HPefI61I";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
const listeners = new Set();

function notify(user) {
  listeners.forEach((callback) => {
    try {
      callback(user);
    } catch (err) {
      console.error("[auth] 리스너 처리 중 오류:", err);
    }
  });
}

supabase.auth.getSession().then(({ data }) => {
  currentUser = (data.session && data.session.user) || null;
  notify(currentUser);
});

supabase.auth.onAuthStateChange((_event, session) => {
  currentUser = (session && session.user) || null;
  notify(currentUser);
});

function getUser() {
  return currentUser;
}

// 구독 즉시 현재 상태로 한 번 불러준다 — 호출부가 "먼저 getUser()로 초기값을 읽고, 그
// 다음 변경을 구독"하는 두 단계를 매번 반복하지 않아도 되게.
function onAuthChange(callback) {
  listeners.add(callback);
  callback(currentUser);
  return function unsubscribe() {
    listeners.delete(callback);
  };
}

// 로그인이 필요한 액션(즐겨찾기, 핀 등록 등 미래 기능)의 클릭 핸들러 맨 앞에 한 줄로
// 꽂아 쓰는 헬퍼. 로그인 안 됐으면 모달을 열고 false를 반환한다.
function requireLogin() {
  if (currentUser) return true;
  openLoginModal();
  return false;
}

async function signOut() {
  await supabase.auth.signOut();
}

function mapAuthError(error) {
  const code = (error && error.code) || "";
  const message = (error && error.message) || "";

  if (code === "invalid_credentials" || /invalid login credentials/i.test(message)) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (code === "user_already_exists" || /already registered/i.test(message)) {
    return "이미 가입된 이메일입니다.";
  }
  if (code === "weak_password" || /password should be at least/i.test(message)) {
    return "비밀번호는 6자 이상이어야 합니다.";
  }
  if (code === "validation_failed" || code === "email_address_invalid" || /invalid email/i.test(message)) {
    return "올바른 이메일 형식이 아닙니다.";
  }
  return "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
}

let modalEl = null;

function ensureModal() {
  if (modalEl) return modalEl;

  const dialog = document.createElement("dialog");
  dialog.id = "auth-dialog";
  dialog.className =
    "w-[min(92vw,26rem)] rounded-3xl border border-base-tint/60 bg-white p-0 shadow-xl backdrop:bg-ink/40";
  dialog.innerHTML =
    '<div class="p-6">' +
    '<div class="mb-4 flex items-center justify-between">' +
    '<h2 class="text-[1.25rem] font-extrabold text-base-dark">로그인</h2>' +
    '<button type="button" data-auth-close class="grid h-8 w-8 place-items-center rounded-full text-ink-mute hover:bg-base-tint" aria-label="닫기">✕</button>' +
    "</div>" +
    '<div class="space-y-3">' +
    '<label class="block text-[0.95rem] font-bold text-ink-soft">이메일' +
    '<input type="email" name="email" required autocomplete="email" class="mt-1 h-[48px] w-full rounded-xl border border-base-tint/70 px-3 text-[1rem] text-ink focus-visible:outline-none">' +
    "</label>" +
    '<label class="block text-[0.95rem] font-bold text-ink-soft">비밀번호' +
    '<input type="password" name="password" required autocomplete="current-password" class="mt-1 h-[48px] w-full rounded-xl border border-base-tint/70 px-3 text-[1rem] text-ink focus-visible:outline-none">' +
    "</label>" +
    "</div>" +
    '<p data-auth-error role="alert" class="mt-3 hidden text-[0.9rem] font-bold text-terra"></p>' +
    '<div class="mt-5 flex gap-2">' +
    '<button type="button" data-auth-signup class="h-[48px] flex-1 rounded-2xl border border-base bg-white text-[1rem] font-bold text-base-dark hover:bg-base-tint">회원가입</button>' +
    '<button type="button" data-auth-signin class="h-[48px] flex-1 rounded-2xl bg-cta text-[1rem] font-bold text-ink shadow-sm hover:-translate-y-0.5 hover:bg-cta-dark hover:shadow-md">로그인</button>' +
    "</div>" +
    "</div>";
  document.body.appendChild(dialog);

  const errorEl = dialog.querySelector("[data-auth-error]");
  const emailInput = dialog.querySelector('input[name="email"]');
  const passwordInput = dialog.querySelector('input[name="password"]');
  const buttons = dialog.querySelectorAll("button");

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.remove("hidden");
  }
  function clearError() {
    errorEl.classList.add("hidden");
    errorEl.textContent = "";
  }
  function setBusy(busy) {
    buttons.forEach((btn) => {
      btn.disabled = busy;
    });
  }
  function resetFields() {
    emailInput.value = "";
    passwordInput.value = "";
  }

  dialog.querySelector("[data-auth-close]").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", clearError);

  dialog.querySelector("[data-auth-signin]").addEventListener("click", async () => {
    clearError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      showError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      showError(mapAuthError(error));
      return;
    }
    resetFields();
    dialog.close();
  });

  dialog.querySelector("[data-auth-signup]").addEventListener("click", async () => {
    clearError();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
      showError("이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      showError(mapAuthError(error));
      return;
    }
    // 정상 흐름(대시보드의 "Confirm email"이 꺼져 있을 때)이면 signUp이 바로 세션을 준다.
    // 세션이 없으면 이메일 인증이 아직 켜져 있다는 뜻 — 크래시 없이 안내만 한다.
    if (!data.session) {
      showError("회원가입은 완료됐지만 이메일 인증이 필요합니다. 관리자에게 문의해 주세요.");
      return;
    }
    resetFields();
    dialog.close();
  });

  modalEl = dialog;
  return dialog;
}

function openLoginModal() {
  const dialog = ensureModal();
  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function renderHeaderWidget(container, user) {
  container.innerHTML = "";

  if (!user) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "rounded-full bg-base-tint px-4 py-1.5 text-[1rem] font-bold text-base-dark hover:bg-base-tint/70";
    btn.textContent = "로그인";
    btn.addEventListener("click", openLoginModal);
    container.appendChild(btn);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "flex items-center gap-2";

  const name = document.createElement("span");
  name.className = "text-[1rem] font-bold text-base-dark";
  name.textContent = (user.email ? user.email.split("@")[0] : "사용자") + "님";

  const logoutBtn = document.createElement("button");
  logoutBtn.type = "button";
  logoutBtn.className =
    "rounded-full bg-base-tint px-3 py-1.5 text-[0.95rem] font-bold text-base-dark hover:bg-base-tint/70";
  logoutBtn.textContent = "로그아웃";
  logoutBtn.addEventListener("click", () => {
    signOut();
  });

  wrap.appendChild(name);
  wrap.appendChild(logoutBtn);
  container.appendChild(wrap);
}

// 헤더의 로그인/로그아웃 영역을 container 안에 그리고, 로그인 상태가 바뀔 때마다 자동으로
// 다시 그린다. index.html/place.html은 각자 헤더에 빈 컨테이너만 두고 이 함수를 부르면 된다.
function mountHeaderWidget(container) {
  if (!container) return;
  onAuthChange((user) => renderHeaderWidget(container, user));
}

window.Day4Auth = {
  getUser: getUser,
  onAuthChange: onAuthChange,
  requireLogin: requireLogin,
  openLoginModal: openLoginModal,
  signOut: signOut,
  mountHeaderWidget: mountHeaderWidget,
};
