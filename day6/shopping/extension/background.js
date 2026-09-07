import { MAX_REVIEWS_TARGET, PROXY_BASE_URL, STORAGE_KEY } from "./lib/config.js";

const RECEIVING_END_MISSING = "Receiving end does not exist";

const CONTENT_SCRIPT_FILES = {
  coupang: ["content-scripts/common.js", "content-scripts/coupang.js"],
  naver: ["content-scripts/common.js", "content-scripts/naver.js"],
};

const ERROR_MESSAGES = {
  UNSUPPORTED_SITE: "쿠팡 또는 네이버 스마트스토어 상품 페이지에서 사용해주세요.",
  NO_REVIEWS_FOUND: "이 페이지에서 리뷰를 찾지 못했습니다.",
  PARSE_ERROR: "리뷰를 읽는 중 오류가 발생했습니다.",
  NOT_IMPLEMENTED: "이 사이트의 리뷰 파싱은 아직 준비 중입니다.",
  INVALID_REQUEST: "요청이 올바르지 않습니다.",
  PAYLOAD_TOO_LARGE: "리뷰 데이터가 너무 많습니다.",
  AUTH_ERROR: "서비스 일시 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  RATE_LIMITED: "요청이 많아 잠시 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
  UPSTREAM_ERROR: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
  CONFIG_ERROR: "서버 설정 오류입니다. 잠시 후 다시 시도해주세요.",
  UNKNOWN_ERROR: "알 수 없는 오류가 발생했습니다.",
};

function detectPlatform(url) {
  try {
    const host = new URL(url).hostname;
    if (host === "www.coupang.com" || host === "m.coupang.com") return "coupang";
    if (host === "smartstore.naver.com" || host === "m.smartstore.naver.com") return "naver";
    return null;
  } catch {
    return null;
  }
}

async function getState() {
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  return (
    stored[STORAGE_KEY] ?? {
      status: "idle",
      platform: null,
      productName: null,
      progress: { count: 0, target: MAX_REVIEWS_TARGET },
      reviews: null,
      result: null,
      errorCode: null,
      errorMessage: null,
    }
  );
}

async function setState(patch) {
  const current = await getState();
  const next = { ...current, ...patch };
  await chrome.storage.session.set({ [STORAGE_KEY]: next });
  return next;
}

async function fail(errorCode, errorMessage) {
  await setState({
    status: "error",
    errorCode,
    errorMessage: errorMessage ?? ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.UNKNOWN_ERROR,
  });
}

async function sendMessageWithInjectionFallback(tabId, files, message) {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (err) {
    if (!String(err?.message ?? "").includes(RECEIVING_END_MISSING)) throw err;
    // 확장 프로그램이 페이지 로드 후 새로 설치/리로드된 경우 content script가
    // 아직 주입되지 않았을 수 있음 — 수동으로 주입 후 한 번 재시도.
    await chrome.scripting.executeScript({ target: { tabId }, files });
    return await chrome.tabs.sendMessage(tabId, message);
  }
}

async function orchestrate() {
  try {
    await setState({
      status: "parsing",
      platform: null,
      productName: null,
      progress: { count: 0, target: MAX_REVIEWS_TARGET },
      reviews: null,
      result: null,
      errorCode: null,
      errorMessage: null,
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) {
      await fail("UNSUPPORTED_SITE");
      return;
    }

    const platform = detectPlatform(tab.url);
    if (!platform) {
      await fail("UNSUPPORTED_SITE");
      return;
    }
    await setState({ platform });

    const parseResult = await sendMessageWithInjectionFallback(tab.id, CONTENT_SCRIPT_FILES[platform], {
      type: "PARSE_REVIEWS",
      targetCount: MAX_REVIEWS_TARGET,
    });

    if (!parseResult?.ok) {
      await fail(parseResult?.error ?? "PARSE_ERROR");
      return;
    }
    if (!parseResult.reviews?.length) {
      await fail("NO_REVIEWS_FOUND");
      return;
    }

    await setState({
      status: "analyzing",
      productName: parseResult.productName,
      reviews: parseResult.reviews,
      progress: { count: parseResult.reviews.length, target: MAX_REVIEWS_TARGET },
    });

    const res = await fetch(`${PROXY_BASE_URL}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform,
        productName: parseResult.productName,
        reviews: parseResult.reviews,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      await fail(data?.error ?? "UPSTREAM_ERROR", data?.message);
      return;
    }

    await setState({ status: "done", result: data });
  } catch (err) {
    console.error("[background] orchestrate failed:", err);
    await fail("UNKNOWN_ERROR");
  }
}

async function handleStartAnalysis(sendResponse) {
  const state = await getState();
  if (state.status === "parsing" || state.status === "analyzing") {
    sendResponse({ ok: false, error: "ALREADY_RUNNING" });
    return;
  }
  sendResponse({ ok: true });
  orchestrate();
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "START_ANALYSIS") {
    handleStartAnalysis(sendResponse);
    return true; // keep the message channel open for the async sendResponse above
  }
  if (message?.type === "PARSE_PROGRESS") {
    setState({ progress: { count: message.count, target: message.target } });
    return false;
  }
  return false;
});
