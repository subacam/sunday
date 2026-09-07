(function () {
  "use strict";

  var GROUPS = {
    NT: {
      name: "NT · 분석가형",
      emoji: "🧠",
      file: "nt.html",
      desc: "원리를 이해해야 진짜 내 것이 되는 전략가 타입이에요. 왜 그런지 납득이 되어야 오래 기억하고, 처음 보는 문제에도 스스로 논리를 세워 풀어낼 수 있어요.",
    },
    NF: {
      name: "NF · 외교관형",
      emoji: "🌱",
      file: "nf.html",
      desc: "의미와 감정이 연결돼야 몰입하는 공감형 타입이에요. “왜 배우는가”에 대한 답을 찾으면 누구보다 깊이, 오래 파고들 수 있어요.",
    },
    SJ: {
      name: "SJ · 관리자형",
      emoji: "📋",
      file: "sj.html",
      desc: "꾸준한 루틴과 반복 속에서 실력이 쌓이는 성실 타입이에요. 정해진 계획을 지킬 때 가장 안정적으로, 확실하게 성장해요.",
    },
    SP: {
      name: "SP · 탐험가형",
      emoji: "⚡",
      file: "sp.html",
      desc: "직접 부딪히고 실전을 겪어야 느는 실전형 타입이에요. 몸으로 익힌 감각과 순발력으로 위기 상황에도 강한 힘을 발휘해요.",
    },
  };

  var GROUP_ORDER = ["NT", "NF", "SJ", "SP"];
  var TOTAL_QUESTIONS = 10;

  var form = document.getElementById("mbti-form");
  var resultSection = document.getElementById("result");
  var resultTitle = document.getElementById("result-title");
  var resultDesc = document.getElementById("result-desc");
  var scoreBars = document.getElementById("score-bars");
  var detailLinks = document.getElementById("detail-links");
  var shareBtn = document.getElementById("share-btn");
  var toast = document.getElementById("toast");

  var currentShareText = "";
  var toastTimer = null;

  function highlightSelectedOption(radio) {
    var options = radio.closest(".options").querySelectorAll(".option");
    options.forEach(function (opt) {
      opt.classList.remove("selected");
    });
    radio.closest(".option").classList.add("selected");
  }

  form.addEventListener("change", function (e) {
    if (e.target && e.target.type === "radio") {
      highlightSelectedOption(e.target);
    }
  });

  function getScores() {
    var scores = { NT: 0, NF: 0, SJ: 0, SP: 0 };
    var data = new FormData(form);
    for (var i = 1; i <= TOTAL_QUESTIONS; i++) {
      var val = data.get("q" + i);
      if (val && Object.prototype.hasOwnProperty.call(scores, val)) {
        scores[val]++;
      }
    }
    return scores;
  }

  function getTopGroups(scores) {
    var max = Math.max.apply(null, GROUP_ORDER.map(function (g) { return scores[g]; }));
    return GROUP_ORDER.filter(function (g) { return scores[g] === max; });
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toast.classList.remove("show");
    }, 2400);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        document.body.removeChild(ta);
      }
    });
  }

  function renderResult(scores, topGroups) {
    var isTie = topGroups.length > 1;

    if (isTie) {
      var names = topGroups.map(function (g) { return GROUPS[g].emoji + " " + g; }).join(" · ");
      resultTitle.textContent = names + " 유형이 함께 높게 나왔어요!";
      resultDesc.textContent = topGroups.map(function (g) { return GROUPS[g].desc; }).join(" ");
    } else {
      var top = topGroups[0];
      resultTitle.textContent = GROUPS[top].emoji + " 당신의 공부 유형은 " + GROUPS[top].name + "입니다!";
      resultDesc.textContent = GROUPS[top].desc;
    }

    scoreBars.innerHTML = "";
    GROUP_ORDER.forEach(function (g) {
      var row = document.createElement("div");
      row.className = "score-row" + (topGroups.indexOf(g) !== -1 ? " top" : "");
      var pct = (scores[g] / TOTAL_QUESTIONS) * 100;
      row.innerHTML =
        '<span>' + g + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
        '<span>' + scores[g] + '</span>';
      scoreBars.appendChild(row);
    });

    detailLinks.innerHTML = "";
    topGroups.forEach(function (g) {
      var a = document.createElement("a");
      a.className = "btn btn-primary";
      a.href = GROUPS[g].file;
      a.textContent = GROUPS[g].name + " 자세히 보기";
      detailLinks.appendChild(a);
    });

    currentShareText = isTie
      ? "나의 공부 유형은 " + topGroups.join(" · ") + "! 너의 유형도 확인해봐 →"
      : "나의 공부 유형은 " + GROUPS[topGroups[0]].name + "! 너의 유형도 확인해봐 →";
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var scores = getScores();
    var topGroups = getTopGroups(scores);

    renderResult(scores, topGroups);

    if (typeof gtag === "function") {
      gtag("event", "test_complete", { group: topGroups.join("+") });
    }

    resultSection.classList.add("show");
    resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  shareBtn.addEventListener("click", function () {
    var shareData = {
      title: "MBTI 공부법 연구소",
      text: currentShareText || "나에게 맞는 공부 유형을 확인해봐 →",
      url: location.href,
    };

    if (navigator.share) {
      navigator.share(shareData).catch(function () {
        /* 사용자가 공유를 취소한 경우 등은 무시한다 */
      });
      return;
    }

    copyText(shareData.url)
      .then(function () {
        showToast("링크가 복사되었어요! 친구에게 붙여넣기 해보세요.");
      })
      .catch(function () {
        showToast("복사에 실패했어요. 주소창의 링크를 직접 복사해주세요.");
      });
  });
})();
