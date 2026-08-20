// Tailwind CDN(index.html)이 쓰는 디자인 토큰. index.html은 이 값을
// `tailwind.config = { theme: { extend: window.CITYBITE_THEME } }`로 그대로 소비한다.
//
// 여기 정의된 색상/폰트/라운드 "토큰 이름"(travel-orange, on-primary-container 등)은
// index.html과 app.js 곳곳의 Tailwind 유틸리티 클래스(bg-travel-orange 등)에서 이름으로
// 참조되고 있으므로, 디자인을 바꿀 때도 토큰 이름은 그대로 두고 값만 바꿀 것 — 그래야
// 이 파일만 고쳐도 다른 파일을 건드리면 필요가 없다.
window.CITYBITE_THEME = {
  colors: {
    "error-container": "#ffdad6",
    "badge-tour": "#E3F2FD",
    "on-primary-container": "#531900",
    "bus-blue": "#0052CC",
    "tertiary": "#0061a4",
    "outline": "#8f7065",
    "surface-container-highest": "#f9dcd3",
    "on-error": "#ffffff",
    "surface-dim": "#f0d4ca",
    "surface": "#fff8f6",
    "category-bg": "#F4F7FA",
    "surface-container-lowest": "#ffffff",
    "surface-container-low": "#fff1ec",
    "surface-container-high": "#ffe2d8",
    "inverse-surface": "#3e2c26",
    "primary-container": "#ff5f05",
    "surface-variant": "#f9dcd3",
    "on-surface-variant": "#5b4137",
    "surface-container": "#ffe9e2",
    "on-surface": "#271812",
    "travel-orange": "#FF5F05",
    "error": "#ba1a1a",
    "on-error-container": "#93000a",
    "secondary": "#0453cd",
    "on-background": "#271812",
    "surface-tint": "#a73b00",
    "primary": "#a73b00",
    "outline-variant": "#e4bfb1",
    "surface-bright": "#fff8f6",
    "background": "#fff8f6",
    "on-primary": "#ffffff"
  },
  borderRadius: { DEFAULT: "0.25rem", lg: "0.5rem", xl: "0.75rem", full: "9999px" },
  spacing: { "container-max": "1200px", lg: "24px", gutter: "16px", md: "16px", xl: "40px", base: "4px", xs: "4px", sm: "8px" },
  fontFamily: {
    "headline-lg": ["Inter"], "label-md": ["Inter"], "headline-md": ["Inter"],
    "body-md": ["Inter"], "label-sm": ["Inter"], "body-lg": ["Inter"], "headline-lg-mobile": ["Inter"]
  },
  fontSize: {
    "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.02em", fontWeight: "700" }],
    "label-md": ["14px", { lineHeight: "20px", letterSpacing: "0.01em", fontWeight: "500" }],
    "headline-md": ["20px", { lineHeight: "28px", fontWeight: "600" }],
    "body-md": ["16px", { lineHeight: "24px", fontWeight: "400" }],
    "label-sm": ["12px", { lineHeight: "16px", fontWeight: "600" }],
    "body-lg": ["18px", { lineHeight: "26px", fontWeight: "400" }],
    "headline-lg-mobile": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em", fontWeight: "700" }]
  }
};
