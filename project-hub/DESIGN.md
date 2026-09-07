---
version: v2.0
name: ARCHIVE-design-system
description: ARCHIVE(아카이브)는 보랏빛 어둠 위에 반투명 유리를 얹는 프로젝트 허브다. 인트로와 리스트가 같은 광원(블러 처리된 그라디언트 블롭 3개)을 공유하고, 그 위로 유리 카드가 떠 있다. 포인트 색은 바이올렛({colors.accent}) 하나이며 카드 번호·인라인 선·포커스 링에만 쓴다. 글꼴은 Pretendard 하나로 통일하고 위계는 크기와 굵기로만 만든다. 모서리는 최대 4px까지만 굴린다. 움직임은 블롭 부유·제목 마스크 리빌·화면 크로스페이드·카드 부유와 마우스 기울기 다섯 가지뿐이며, 호버는 크기를 바꾸지 않고 선과 배경 농도만 바꾼다.

colors:
  canvas: "#0B0714"
  canvas-deep: "#070510"
  surface: "rgba(255, 255, 255, 0.055)"
  surface-strong: "rgba(255, 255, 255, 0.09)"
  ink: "#F4F1FB"
  ink-secondary: "#C9C3DE"
  muted: "#9B93B4"
  hairline: "rgba(255, 255, 255, 0.10)"
  hairline-strong: "rgba(255, 255, 255, 0.26)"
  accent: "#A78BFA"
  accent-deep: "#7C5CFC"
  on-accent: "#0B0714"
  on-ink: "#0B0714"
  overlay: "rgba(7, 5, 16, 0.72)"
  glow-1: "#7C3AED"
  glow-2: "#C026D3"
  glow-3: "#4338CA"

typography:
  display-xl:
    fontFamily: Pretendard
    fontSize: 88px
    fontWeight: 800
    lineHeight: 1.0
    letterSpacing: -0.03em
  display-lg:
    fontFamily: Pretendard
    fontSize: 56px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: -0.02em
  number:
    fontFamily: Pretendard
    fontSize: 60px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: 0.04em
  heading-1:
    fontFamily: Pretendard
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.01em
  heading-2:
    fontFamily: Pretendard
    fontSize: 22px
    fontWeight: 600
    lineHeight: 1.4
  body-lg:
    fontFamily: Pretendard
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.7
  body:
    fontFamily: Pretendard
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: Pretendard
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.7
  caption:
    fontFamily: Pretendard
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.1em
  label-wide:
    fontFamily: Pretendard
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.18em

rounded:
  none: 0
  xs: 2px
  sm: 4px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px
  section-lg: 120px

elevation:
  glass: "0 24px 60px -24px rgba(0, 0, 0, 0.75)"
  modal: "0 48px 120px -32px rgba(0, 0, 0, 0.85)"

motion:
  duration-fast: 200ms
  duration-base: 400ms
  ease-out: "cubic-bezier(0.16, 1, 0.3, 1)"
  duration-line-reveal: 1050ms
  ease-line-reveal: "power4.out"
  stagger-line: 120ms
  duration-enter-out: 800ms
  ease-enter-out: "power2.in"
  duration-enter-in: 1200ms
  ease-enter-in: "expo.out"
  duration-card-in: 1300ms
  stagger-card: 100ms
  duration-blob-drift: "21s ~ 27s"
  ease-blob-drift: "sine.inOut"
  duration-card-float: "3.4s ~ 5.8s"
  duration-tilt: 800ms
  ease-tilt: "power3"

components:
  intro-screen:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    padding: "{spacing.section-lg} {spacing.lg}"
  intro-title:
    typography: "{typography.display-xl}"
    textColor: "{colors.ink}"
  intro-enter-button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md} {spacing.xl}"
    border: "1px solid {colors.hairline-strong}"
  ambient-blob:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
  ambient-noise:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
  line-mask:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
  screen-over:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
  list-header:
    backgroundColor: "rgba(11, 7, 20, 0.55)"
    textColor: "{colors.ink}"
    padding: "{spacing.lg} {spacing.xl}"
    border: "0 0 1px {colors.hairline} solid"
  list-title:
    typography: "{typography.display-lg}"
    textColor: "{colors.ink}"
  card-float:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
  glass-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xl}"
    border: "1px solid {colors.hairline}"
    elevation: "{elevation.glass}"
  glass-card-hover:
    backgroundColor: "{colors.surface-strong}"
    border: "1px solid {colors.hairline-strong}"
  glass-sheen:
    backgroundColor: "linear-gradient(140deg, rgba(255,255,255,0.14) 0%, transparent 42%)"
    rounded: "{rounded.none}"
  card-number:
    typography: "{typography.number}"
    textColor: "{colors.accent}"
  card-title:
    typography: "{typography.heading-1}"
    textColor: "{colors.ink}"
  card-subtitle:
    typography: "{typography.label-wide}"
    textColor: "{colors.muted}"
  card-tagline:
    typography: "{typography.body-sm}"
    textColor: "{colors.ink-secondary}"
  stack-tag:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.xs}"
    padding: "{spacing.xxs} {spacing.xs}"
    border: "1px solid {colors.hairline}"
  modal-overlay:
    backgroundColor: "{colors.overlay}"
  modal-panel:
    backgroundColor: "rgba(20, 14, 34, 0.86)"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xxl}"
    border: "1px solid {colors.hairline}"
    elevation: "{elevation.modal}"
  modal-close:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
    border: "1px solid {colors.hairline}"
  study-heading:
    typography: "{typography.heading-2}"
    textColor: "{colors.ink}"
  study-body:
    typography: "{typography.body-lg}"
    textColor: "{colors.ink-secondary}"
  study-highlight-item:
    typography: "{typography.body}"
    textColor: "{colors.ink-secondary}"
    padding: "{spacing.sm} 0 {spacing.sm} {spacing.md}"
    border: "0 0 0 2px {colors.accent} solid"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md} {spacing.xl}"
    border: "1px solid {colors.ink}"
  button-primary-hover:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md} {spacing.xl}"
    border: "1px solid {colors.hairline-strong}"
  focus-ring:
    border: "2px solid {colors.accent}"
    rounded: "{rounded.xs}"
  footer-region:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    padding: "{spacing.xxl} {spacing.xl}"
    border: "1px 0 0 {colors.hairline} solid"
---

## Overview

ARCHIVE는 **보랏빛 어둠 위에 떠 있는 유리**다. 배경에는 블러 처리된 커다란 그라디언트 블롭 세 개가 천천히 흐르고, 그 위로 반투명 유리 카드가 얹힌다. 카드가 유리처럼 보이는 것은 배경 흐림({components.glass-card}의 `backdrop-filter`)과 윗면에 비스듬히 얹힌 빛({components.glass-sheen}) 두 가지 덕분이다.

**인트로와 리스트는 같은 광원을 공유한다.** 두 화면 모두 같은 블롭 세 개와 같은 노이즈 결을 쓰되, 리스트에서는 블러를 더 키우고 불투명도를 낮춰 뒤로 물린다. 화면이 바뀌어도 같은 공간에 있다는 감각이 유지된다.

포인트 색은 바이올렛({colors.accent}) 하나다. 카드 번호, 구현 포인트의 왼쪽 선, 포커스 링 — **면이 아니라 숫자와 선으로만** 등장한다.

글꼴은 Pretendard 하나뿐이다. 카드가 스크린샷 없이 타이포만으로 프로젝트를 드러내야 하므로, 위계를 만드는 일이 곧 화면을 만드는 일이다.

**Key Characteristics**
- 보랏빛 어둠({colors.canvas}) + 반투명 유리({colors.surface}) + 바이올렛 포인트({colors.accent})
- 인트로와 리스트가 같은 블롭 3개 · 같은 노이즈를 공유
- 카드는 스크린샷이 아니라 **타이포로 프로젝트를 미리 보여준다**. 스크린샷은 상세 모달에서 크게 본다
- Pretendard 단일 글꼴, 위계는 크기·굵기·자간으로만
- 반경 상한 4px. 유리 카드도 크게 굴리지 않는다
- 카드는 늘 조금씩 떠 있고 마우스 쪽으로 살짝 기운다
- 호버는 크기를 바꾸지 않고 테두리와 배경 농도만 바꾼다

---

## Colors

### 바탕과 표면

- **Canvas** ({colors.canvas}) — 보랏빛이 도는 검정. 페이지 바닥
- **Canvas Deep** ({colors.canvas-deep}) — 더 깊은 바닥. 그림자와 오버레이의 기준
- **Surface** ({colors.surface}) — 유리 카드의 흰 반투명. 5.5%보다 진하면 유리가 아니라 회색 판이 된다
- **Surface Strong** ({colors.surface-strong}) — 호버 시의 농도
- **Hairline** ({colors.hairline}) / **Hairline Strong** ({colors.hairline-strong}) — 유리의 테두리. 흰색의 투명도로만 만든다

### 광원

- **Glow 1** ({colors.glow-1}) 바이올렛 · **Glow 2** ({colors.glow-2}) 푸크시아 · **Glow 3** ({colors.glow-3}) 인디고

세 색 모두 보라 계열이다. **여기에 난색(주황·빨강)을 섞지 말 것** — 보랏빛이라는 성격이 즉시 흐려진다.

### 글자

| 토큰 | 값 | {colors.canvas} 위 대비 | 쓰임 |
|---|---|---|---|
| {colors.ink} | `#F4F1FB` | **17.85:1** | 제목, 강조 |
| {colors.ink-secondary} | `#C9C3DE` | **11.70:1** | 케이스 스터디 본문, 카드 설명 |
| {colors.muted} | `#9B93B4` | **6.85:1** | 캡션, 메타, 스택 태그 |
| {colors.accent} | `#A78BFA` | **7.32:1** | 카드 번호, 포인트 선, 포커스 링 |
| {colors.accent-deep} | `#7C5CFC` | **4.54:1** | 눌림 상태 |

전부 WCAG AA를 넉넉히 넘긴다. 어두운 바탕이라 v1의 흰 바탕보다 여유가 크다.

### 포인트 색이 등장하는 곳

1. 카드 번호 ({components.card-number})
2. 구현 포인트의 왼쪽 세로선 ({components.study-highlight-item})
3. 포커스 링 ({components.focus-ring})
4. 주 버튼의 호버 상태 ({components.button-primary-hover})

**배경이나 본문 글자에는 쓰지 않는다.**

---

## Typography

### Font Family

**Pretendard** (단일 서체). 폴백 스택:

```
Pretendard, -apple-system, BlinkMacSystemFont, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif
```

**폴백 스택 없이 Pretendard만 지정하지 말 것** — 오프라인이나 `file://`에서 글꼴이 깨진다.

### 위계

| 토큰 | 크기 | 굵기 | 행간 | 자간 | 쓰임 |
|---|---|---|---|---|---|
| {typography.display-xl} | 88px | 800 | 1.0 | -0.03em | 인트로 `ARCHIVE` |
| {typography.display-lg} | 56px | 700 | 1.1 | -0.02em | 리스트 제목, 모달 제목 |
| {typography.number} | 60px | **400** | 1.0 | **+0.04em** | 카드·모달 번호 |
| {typography.heading-1} | 32px | 700 | 1.3 | -0.01em | 카드 제목 |
| {typography.heading-2} | 22px | 600 | 1.4 | — | 케이스 스터디 소제목 |
| {typography.body-lg} | 18px | 400 | 1.7 | — | 모달 본문 |
| {typography.body} | 16px | 400 | 1.6 | — | 기본 |
| {typography.body-sm} | 14px | 400 | 1.7 | — | 카드 설명 |
| {typography.caption} | 13px | 400 | 1.4 | — | 푸터, 메타 |
| {typography.label} | 12px | 600 | 1.2 | 0.1em | 버튼, 태그 |
| {typography.label-wide} | 12px | 600 | 1.2 | **0.18em** | 카드 부제 |

### 원칙

- **큰 숫자는 가늘고 넓게.** {typography.number}만 굵기 400에 자간을 **양수(+0.04em)**로 준다. 다른 큰 글자는 굵고 좁은데(800, -0.03em) 번호만 반대로 가서, 굵기를 올리지 않고도 시선을 끈다
- 큰 글자일수록 자간을 좁히고 행간을 좁힌다 (숫자는 예외)
- 굵기는 400 · 600 · 700 · 800 네 단계만
- {typography.label-wide}는 카드 부제 전용. 자간을 넓혀 제목과 성격을 갈라놓는다
- 카드 설명은 행간 1.7. 유리 위의 글자는 배경이 비쳐 보이므로 줄 사이가 좁으면 읽기 어렵다

---

## Layout

### 간격 체계

- **기준 단위 4px.** 모든 간격은 {spacing.xxs}의 배수
- 섹션 사이는 {spacing.section}(80px) 이상

### 컨테이너와 그리드

| 영역 | 값 |
|---|---|
| 최대 폭 | 1120px |
| 좌우 여백 | 데스크톱 {spacing.xl}, 모바일 {spacing.lg} |
| 카드 그리드 | 데스크톱 2열, 그 외 1열 |
| 카드 사이 간격 | {spacing.xl} |
| 모달 최대 폭 | 720px |

**카드는 2열을 넘기지 않는다.** 3열 이상이면 유리 카드가 작아져 떠 있는 느낌이 사라지고, 마우스 기울기도 눈에 띄지 않는다.

---

## Elevation & Depth

깊이는 그림자가 아니라 **흐림과 투명도**로 만든다. 카드 뒤의 블롭이 흐려져 비치는 것 자체가 거리감이다.

| 단계 | 처리 | 쓰임 |
|---|---|---|
| 유리 | `backdrop-filter: blur(18px) saturate(150%)` + {elevation.glass} | 카드 |
| 유리(헤더) | `backdrop-filter: blur(20px) saturate(140%)` | 고정 헤더 |
| 모달 | `backdrop-filter: blur(28px) saturate(150%)` + {elevation.modal} | 상세 패널 |

`saturate()`를 함께 거는 이유는, 블러만 걸면 뒤의 보라색이 탁해지기 때문이다. 채도를 되살려야 유리 너머로 색이 살아 보인다.

---

## Shapes

| 토큰 | 값 | 쓰임 |
|---|---|---|
| {rounded.none} | 0 | 배경 레이어 |
| {rounded.xs} | 2px | 스택 태그, 포커스 링 |
| {rounded.sm} | 4px | **유리 카드, 버튼, 모달** |

`full`이나 `9999px`은 이 시스템에 **존재하지 않는다.**

유리 카드를 크게 굴리지 않는 것은 의도다. 요즘 유리 UI는 대개 16~24px을 쓰는데, 그러면 부드럽고 흔해진다. **4px에서 멈추면 유리가 흐물거리지 않고 판처럼 단단해 보인다.**

---

## Components

### 배경 (인트로 · 리스트 공용)

**{components.ambient-blob}** — 떠다니는 광원 세 개.
- `radial-gradient(circle at center, 색 0%, transparent 64~68%)`, 크기 `62vmax`
- 인트로는 `blur(70px)` / 불투명도 0.36~0.50, 리스트는 `blur(90px)` / 0.22~0.34로 더 뒤로 물린다
- **원을 만들 때 `border-radius`를 쓰지 않는다.** 반경으로 원을 그리면 4px 상한에 걸린다. 그라디언트로 그리면 규칙을 건드리지 않는다

**{components.ambient-noise}** — 불투명도 0.055의 결.
- 인라인 SVG `feTurbulence`(fractalNoise, baseFrequency 0.82, 4옥타브)를 data URI로, 200×200 타일
- 넓은 그라디언트에서 생기는 계단 모양 띠(밴딩)를 덮는 실용적 목적을 겸한다

### 인트로 (FR-1)

**{components.intro-title}** / **{components.line-mask}** — 줄을 감싸 넘치는 부분을 자르는 틀.
- `overflow: hidden` + `padding-bottom: 0.14em` / `margin-bottom: -0.14em`. 여백이 없으면 `g`·`y`의 아래가 잘린다

**{components.intro-enter-button}** — 유리 테두리 버튼.
- 투명 배경 + `1px solid {colors.hairline-strong}` + `backdrop-filter: blur(12px)`

### 전환 (FR-2)

**{components.screen-over}** — 전환 중 **떠나는 화면에만** 입히는 상태.
- `position: fixed; inset: 0; z-index: 70`
- 남는 화면은 흐름에 그대로 두므로 안쪽의 고정 헤더가 기준을 잃지 않는다

### 리스트 (FR-3)

**{components.list-header}** — 유리 고정 헤더.
- `rgba(11, 7, 20, 0.55)` + `backdrop-filter: blur(20px) saturate(140%)`, 하단 {colors.hairline}

### 카드 (FR-4)

**{components.card-float}** — 부유를 담당하는 바깥 껍데기.
- `perspective: 1100px`. 안쪽 카드의 3D 기울기가 여기서 원근을 얻는다
- **바깥과 안쪽을 나눈 이유:** 한 요소에 부유(`y`)와 기울기(`rotationX/Y`)를 함께 걸면 서로 transform을 덮어쓴다

**{components.glass-card}** — 반투명 유리 카드.
- 배경 {colors.surface}, 테두리 `1px solid {colors.hairline}`, 반경 {rounded.sm}
- `backdrop-filter: blur(18px) saturate(150%)`, 그림자 {elevation.glass}
- `transform-style: preserve-3d`

**{components.glass-sheen}** — 유리 윗면에 비스듬히 얹히는 빛(`::before`).
- `linear-gradient(140deg, rgba(255,255,255,0.14) 0%, transparent 42%)`
- **이 한 겹이 유리처럼 보이게 하는 핵심이다.** 없으면 그냥 반투명 사각형이다

**{components.card-number}** — 번호. {typography.number}, 색 {colors.accent}. 아래에 1px 실선을 깔아 제목과 나눈다

카드에는 **스크린샷을 넣지 않는다.** 유리 위에 사진을 얹으면 뒤의 블롭과 겹쳐 지저분해지고, 유리라는 성격도 사라진다. 스크린샷은 모달에서 본다.

### 모달 (FR-5)

**{components.modal-panel}** — 가장 짙은 유리.
- `rgba(20, 14, 34, 0.86)` + `backdrop-filter: blur(28px)`. 카드보다 불투명해야 긴 본문을 읽을 수 있다
- 오버레이 자체에도 `blur(6px)`을 걸어 뒤의 리스트를 물린다

### 버튼 · 링크 (FR-6)

**{components.button-primary}** — 밝은 잉크 바탕에 어두운 글자. 어두운 화면에서 가장 강한 대비다.
- **호버에서만 {colors.accent}로 바뀐다** ({components.button-primary-hover}). 기본 상태를 바이올렛으로 채우면 포인트 색이 면이 된다

---

## Motion

움직임은 **다섯 가지뿐**이다. 블롭 부유, 제목 마스크 리빌, 화면 크로스페이드, 카드 부유, 마우스 기울기.

### 블롭 부유 (인트로 · 리스트)

| 항목 | 값 |
|---|---|
| 주기 | {motion.duration-blob-drift} — 21초 / 27초 / 24초 |
| 이징 | {motion.ease-blob-drift} |
| 반복 | 무한 `yoyo` |

**주기를 서로 나누어떨어지지 않게 잡는다.** 셋이 같은 주기면 일정 간격마다 처음 배열로 되돌아와 루프가 눈에 띈다.

### 제목 마스크 리빌 (인트로)

각 줄을 {components.line-mask}로 감싸고 안쪽 줄을 `yPercent: 110 → 0`으로 올린다.

| 항목 | 값 |
|---|---|
| 시간 | {motion.duration-line-reveal} |
| 이징 | {motion.ease-line-reveal} |
| 줄 간격 | {motion.stagger-line} |

**초기 상태를 CSS가 아니라 GSAP으로만 숨긴다.** CSS에 `yPercent: 110`을 박아두면 스크립트 실패 시 제목이 영영 보이지 않는다.

### 화면 크로스페이드 (FR-2)

인트로가 살짝 커지며 물러나 사라지고, 리스트가 아주 조금 확대된 상태에서 제자리를 찾는다. 그 뒤 카드가 차례로 떠오른다.

| 구간 | 값 | 시작 |
|---|---|---|
| 인트로 퇴장 | `opacity 1→0`, `scale 1→1.06`, {motion.duration-enter-out}, {motion.ease-enter-out} | 0s |
| 리스트 등장 | `opacity 0→1`, `scale 1.03→1`, {motion.duration-enter-in}, {motion.ease-enter-in} | 0.25s |
| 카드 등장 | `opacity 0→1`, `y 54→0`, {motion.duration-card-in}, 간격 {motion.stagger-card} | 0.4s |

**`expo.out`을 쓰는 이유:** 초반에 크게 움직이고 끝이 아주 길게 늘어져 멎는다. 튕기거나 되돌아오지 않으므로 가볍게 보이지 않는다. 구간을 겹쳐 배치해(0 / 0.25 / 0.4) 세 움직임이 하나의 흐름으로 이어진다.

### 카드 부유 (FR-3)

| 항목 | 값 |
|---|---|
| 이동 | `y: 9 ~ 16px` |
| 주기 | {motion.duration-card-float} — 카드마다 다르게 |
| 이징 | `sine.inOut`, 무한 `yoyo`, 시작 지연 0.35초씩 |

**넷이 같은 주기로 오르내리면 기계처럼 보인다.** 주기와 시작 지연을 모두 어긋나게 잡아야 물 위에 뜬 것처럼 보인다.

### 마우스 기울기 (FR-3)

포인터 위치를 -1~1로 정규화해 카드를 기울인다.

| 항목 | 값 |
|---|---|
| 좌우 회전 | `rotationY: ±3.2° × depth` |
| 상하 회전 | `rotationX: ∓2.4° × depth` |
| 평행 이동 | `x: ±5px × depth` |
| 추종 | {motion.duration-tilt}, {motion.ease-tilt} |

- `depth`는 카드마다 1 또는 1.35. 같은 각도로 움직이면 평면 한 장이 기우는 것처럼 보인다
- **`gsap.quickTo`로 구현한다.** `mousemove`마다 `gsap.to`를 새로 만들면 트윈이 초당 수십 개씩 쌓인다
- **터치 기기에서는 아예 걸지 않는다** — 포인터가 없으면 기울일 기준도 없다
- 이 움직임은 호버 상태가 아니라 **늘 켜져 있는 추종 동작**이다. 호버 규칙과는 별개다

### 호버

**크기와 위치는 바뀌지 않는다.** 카드는 테두리가 {colors.hairline} → {colors.hairline-strong}, 배경이 {colors.surface} → {colors.surface-strong}로 {motion.duration-fast} 동안 바뀔 뿐이다.

### 축소 모션

`prefers-reduced-motion: reduce`에서 **위 다섯 가지를 전부 해제**한다 (FR-7.6). 블롭은 멈추고, 제목은 처음부터 제자리에 있고, 화면은 즉시 교체되며, 카드는 뜨지도 기울지도 않는다.

---

## Do's and Don'ts

### Don't

1. **이모지와 컬러 아이콘을 쓰지 않는다.** 이모지 하나만 들어가도 톤이 깨진다
2. **포인트 색({colors.accent})을 배경·본문 글자·넓은 면적에 쓰지 않는다.** 카드 번호, 포인트 선, 포커스 링, 주 버튼 호버 — 이 넷이 전부다
3. **모서리 반경 {rounded.sm}(4px)을 넘기지 않는다.** 유리 카드도 예외가 아니다
4. **글꼴을 섞지 않는다.** 위계가 부족하면 크기·굵기·자간을 조정한다
5. **호버에 크기·위치 변화를 주지 않는다.** 마우스 기울기는 호버가 아니라 상시 추종이므로 이 규칙과 무관하다
6. **광원에 난색을 섞지 않는다.** 보라·자주·남색 계열만. 주황이나 빨강이 들어오면 보랏빛이라는 성격이 즉시 흐려진다
7. **유리 카드에 스크린샷을 넣지 않는다.** 뒤의 블롭과 겹쳐 지저분해진다
8. **{colors.surface}를 5.5%보다 진하게 만들지 않는다.** 유리가 아니라 회색 판이 된다

### Do

- 깊이는 그림자가 아니라 흐림과 투명도로 만든다
- `backdrop-filter`에는 `saturate()`를 함께 건다. 블러만 걸면 뒤의 보라가 탁해진다
- 반복 애니메이션은 주기를 서로 어긋나게 잡는다
- 위계는 크기·굵기·자간으로만 만든다
- 카드는 2열로 유지한다

---

## Responsive Behavior

| 이름 | 폭 | 주요 변화 |
|---|---|---|
| Mobile | < 640px | 카드 1열. 인트로 제목 40px, 번호 32px. 마우스 기울기 없음 |
| Tablet | 640 – 1023px | 카드 1열 유지. 인트로 제목 56px, 번호 52px |
| Desktop | ≥ 1024px | 카드 2열. 인트로 제목 88px, 번호 60px |

본문({typography.body}, {typography.body-lg})은 **어느 폭에서도 줄이지 않는다.**

### 터치 대상

- 버튼·카드·닫기 버튼 모두 최소 44×44px (FR-7.4)
- {components.stack-tag}는 장식이라 터치 대상이 아니다

---

## Document Contract

`day2`가 쓰는 방식을 그대로 따른다 (`day2/CLAUDE.md` 참조).

- `project-hub/index.html`의 `:root` 블록이 이 문서 프론트매터의 `colors` · `typography` · `rounded` · `spacing` · `elevation` · `motion`을 **미러링한다**
- **토큰을 바꾸려면 두 파일을 함께 고친다.** 프론트매터가 정본이고 산문은 해설이다
- 이 문서에 없는 값이 필요하면 `index.html`에 `확장` 주석으로 이유를 남기고 여기에 토큰을 추가한다

---

## Changelog

### v2.0 — 보랏빛 유리

v1의 **「흰 바탕 미니멀 전시장 + 레드 포인트」를 폐기**하고 보랏빛 다크 유리로 전면 전환했다. 인트로만 어둡던 v1.5의 예외 조항도 함께 사라졌다 — 이제 전 화면이 어두우므로 예외가 필요 없다.

| v1 규칙 | v2 |
|---|---|
| 흰 캔버스 + 잉크 + 레드 | **폐기** → 보랏빛 어둠 + 유리 + 바이올렛 |
| 그림자 없는 평면, 선으로만 구분 | **폐기** → 흐림과 투명도로 깊이를 만든다 |
| 카드에 16:9 썸네일 | **폐기** → 카드는 타이포, 스크린샷은 모달로 |
| 스크롤 등장(IntersectionObserver) | **폐기** → 진입 시 카드 스태거로 대체 (카드가 4장뿐이라 스크롤 관찰이 무의미) |
| 「인트로 예외」 조항 | **삭제** → 전 화면 다크라 예외가 성립하지 않음 |
| 이모지 금지 | **유지** |
| 포인트 색을 넓게 쓰지 않기 | **유지** (대상이 레드 → 바이올렛으로 바뀜) |
| 모서리 4px 상한 | **유지** — 유리 카드도 4px에서 멈춘다 |
| 단일 글꼴 | **유지** |
| 호버에 크기 변화 금지 | **유지** |

---

## Known Gaps

- **`backdrop-filter`를 지원하지 않는 브라우저**에서는 카드가 그냥 반투명 사각형이 된다. 치명적이지는 않으나 유리 느낌은 사라진다. `@supports`로 대체 배경을 줄지 정하지 않았다
- **`backdrop-filter` + 3D 회전은 무겁다.** 카드 4장 규모에서는 문제없지만 8장을 넘기면 기울기 강도를 낮추거나 끄는 것을 검토할 것
- **Pretendard의 조달 방식** — 현재 CDN. PRD §7이 외부 의존성을 CDN 1개(GSAP)로 제한하고 있어 글꼴이 두 번째다. 폴백 스택은 유지 중
- **라이트 모드가 없다.** v1의 흰 시스템은 폐기했고 되살릴 계획은 없다
- 인쇄 스타일(`@media print`)은 정의하지 않았다. 어두운 배경은 인쇄에 부적합하므로 필요해지면 별도 정의가 필요하다
