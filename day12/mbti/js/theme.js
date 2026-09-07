(function () {
  "use strict";

  var STORAGE_KEY = "mbti-theme";

  document.addEventListener("DOMContentLoaded", function () {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;

    var icon = btn.querySelector(".theme-toggle-icon");
    var label = btn.querySelector(".theme-toggle-label");

    function render(theme) {
      var isDark = theme === "dark";
      btn.setAttribute("aria-pressed", String(isDark));
      if (icon) icon.textContent = isDark ? "☀️" : "🌙";
      if (label) label.textContent = isDark ? "라이트 모드" : "다크 모드";
    }

    render(document.documentElement.getAttribute("data-theme") || "light");

    btn.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      var next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* localStorage를 쓸 수 없는 환경(프라이빗 모드 등)이면 테마 저장만 건너뛴다 */
      }
      render(next);
    });
  });
})();
