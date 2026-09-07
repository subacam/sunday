import { STORAGE_KEY } from "../lib/config.js";
import { renderDonutChart } from "./render/donutChart.js";
import { renderInsights } from "./render/insights.js";
import { renderMindmap } from "./render/mindmap.js";
import { renderReviewList } from "./render/reviewList.js";
import { exportToExcel } from "./render/xlsxExport.js";

const el = {
  productName: document.getElementById("productName"),
  subline: document.getElementById("subline"),
  idleView: document.getElementById("idleView"),
  progressView: document.getElementById("progressView"),
  errorView: document.getElementById("errorView"),
  resultView: document.getElementById("resultView"),
  startButton: document.getElementById("startButton"),
  retryButton: document.getElementById("retryButton"),
  downloadButton: document.getElementById("downloadButton"),
  resetButton: document.getElementById("resetButton"),
  progressLabel: document.getElementById("progressLabel"),
  progressBarFill: document.getElementById("progressBarFill"),
  progressCount: document.getElementById("progressCount"),
  errorMessage: document.getElementById("errorMessage"),
  sentimentChart: document.getElementById("sentimentChart"),
  insights: document.getElementById("insights"),
  mindmap: document.getElementById("mindmap"),
  reviewList: document.getElementById("reviewList"),
};

const VIEWS = { idleView: el.idleView, progressView: el.progressView, errorView: el.errorView, resultView: el.resultView };

let currentState = null;

function showView(name) {
  for (const [key, node] of Object.entries(VIEWS)) {
    node.classList.toggle("hidden", key !== name);
  }
}

function render(state) {
  currentState = state;

  if (state.productName) {
    el.productName.textContent = state.productName;
  } else {
    el.productName.textContent = "쇼핑리뷰분석";
  }

  switch (state.status) {
    case "parsing":
    case "analyzing": {
      showView("progressView");
      el.progressLabel.textContent = state.status === "parsing" ? "리뷰를 읽는 중..." : "AI가 리뷰를 분석하는 중...";
      const { count = 0, target = 300 } = state.progress ?? {};
      const pct = Math.min(100, Math.round((count / target) * 100));
      el.progressBarFill.style.width = `${Math.max(6, pct)}%`;
      el.progressCount.textContent = state.status === "parsing" ? `${count}개 수집됨 (최대 ${target}개)` : `리뷰 ${count}개 분석 중 (최대 30초 정도 소요)`;
      el.subline.textContent = "분석 진행 중...";
      break;
    }
    case "error": {
      showView("errorView");
      el.errorMessage.textContent = state.errorMessage ?? "알 수 없는 오류가 발생했습니다.";
      el.subline.textContent = "오류가 발생했습니다";
      break;
    }
    case "done": {
      showView("resultView");
      el.subline.textContent = `최근 리뷰 ${state.reviews?.length ?? 0}개 분석완료`;
      renderDonutChart(el.sentimentChart, state.result.sentiment);
      renderInsights(el.insights, state.result.insights);
      renderMindmap(el.mindmap, state.result.keywords, state.result.keywordRelations);
      renderReviewList(el.reviewList, state.reviews, state.result.reviewLabels);
      break;
    }
    case "idle":
    default: {
      showView("idleView");
      el.subline.textContent = "쿠팡·네이버 상품 페이지에서 리뷰를 분석해보세요";
      break;
    }
  }
}

async function readState() {
  const stored = await chrome.storage.session.get(STORAGE_KEY);
  return (
    stored[STORAGE_KEY] ?? {
      status: "idle",
      platform: null,
      productName: null,
      progress: { count: 0, target: 300 },
      reviews: null,
      result: null,
      errorCode: null,
      errorMessage: null,
    }
  );
}

function startAnalysis() {
  chrome.runtime.sendMessage({ type: "START_ANALYSIS" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error("[popup] sendMessage failed:", chrome.runtime.lastError.message);
      return;
    }
    if (!response?.ok && response?.error === "ALREADY_RUNNING") {
      // 이미 분석이 진행 중 — storage.onChanged가 최신 진행 상태를 반영해줄 것.
      return;
    }
  });
}

el.startButton.addEventListener("click", startAnalysis);
el.retryButton.addEventListener("click", startAnalysis);
el.resetButton.addEventListener("click", startAnalysis);

el.downloadButton.addEventListener("click", async () => {
  if (!currentState || currentState.status !== "done") return;
  el.downloadButton.disabled = true;
  el.downloadButton.textContent = "다운로드 중...";
  try {
    await exportToExcel({
      productName: currentState.productName,
      reviews: currentState.reviews,
      reviewLabels: currentState.result.reviewLabels,
      keywords: currentState.result.keywords,
    });
  } catch (err) {
    console.error("[popup] excel export failed:", err);
    alert("엑셀 파일을 만드는 중 오류가 발생했습니다.");
  } finally {
    el.downloadButton.disabled = false;
    el.downloadButton.textContent = "엑셀로 다운로드";
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "session" || !changes[STORAGE_KEY]) return;
  render(changes[STORAGE_KEY].newValue);
});

readState().then(render);
