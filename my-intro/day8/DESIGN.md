---
version: 1.0.0
name: day8-memo-notion
description: 노션(Notion) 앱 특유의 미니멀한 화이트/오프화이트 톤을 옮겨온, 메모장 하나를 위한 축소 디자인 시스템.
colors:
  bg: '#FFFFFF'
  bg-page: '#F7F7F5'
  surface: '#FFFFFF'
  surface-hover: '#F1F1EF'
  text: '#37352F'
  text-secondary: '#787774'
  muted: '#9B9A97'
  border: '#E9E9E7'
  border-strong: '#D3D1CB'
  accent: '#2383E2'
  accent-hover: '#0B6FCC'
  on-accent: '#FFFFFF'
  danger: '#EB5757'
  danger-bg: '#FDECEC'
typography:
  font: "-apple-system, BlinkMacSystemFont, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
  fs-title: 28px
  fs-heading: 18px
  fs-body: 15px
  fs-caption: 13px
  fs-label: 12px
rounded:
  sm: 4px
  md: 6px
spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
components:
  memo-card: '흰 배경 + 1px {colors.border} 보더 + {rounded.md}, 그림자 없음'
  button-primary: '{colors.text} 배경, {colors.on-accent} 글자, hover 시 살짝 어둡게'
  button-secondary: '투명 배경, {colors.border} 보더, hover 시 {colors.surface-hover}'
  button-danger-confirm: '삭제 확인 상태. {colors.danger-bg} 배경 + {colors.danger} 글자'
  textarea: '흰 배경, {colors.border} 보더, 포커스 시 {colors.accent} 보더'
---

## Overview

노션(Notion) 앱의 화면을 볼 때 드는 인상 — 그림자도 그라디언트도 없이, 옅은 회색 선 하나와 넉넉한 여백만으로 구획을 나누는 절제된 화이트 톤 — 을 메모장 하나 분량으로 옮겼다. 색은 거의 흑백에 가깝고, 강조는 링크·포커스 상태에 쓰는 파란색(`{colors.accent}`) 하나로 제한한다. `day2`처럼 이 문서의 YAML 프론트매터가 `index.html`의 `:root` 변수와 1:1로 대응하는 토큰 원장이고, 아래 산문은 그 위에 얹는 설명이다.

## Colors

- `{colors.bg-page}`는 `<body>` 배경(옅은 오프화이트) — 메모 카드가 놓이는 바닥.
- `{colors.surface}`는 카드·입력창처럼 "떠 있는" 표면. 노션 특유의 그림자 대신 `{colors.border}` 1px 선만으로 표면을 구분한다.
- `{colors.text}`는 노션 텍스트 색과 같은 짙은 브라운-그레이(`#37352F`)다. 순수 검정(`#000`)을 쓰지 않는 것이 노션 톤의 핵심이라, 검정으로 되돌리지 말 것.
- `{colors.accent}`는 이 시스템에서 유일한 유채색이다. 포커스 링, 저장/취소 중 "확인" 계열 버튼, 링크에만 쓰고 장식적으로 남용하지 않는다.
- `{colors.danger}`/`{colors.danger-bg}`는 삭제 확인 상태 전용 — 평상시에는 보이지 않다가 "삭제" 버튼을 누른 순간에만 나타난다(§ Do's and Don'ts 참고).

## Typography

시스템 폰트 스택만 쓴다(`{typography.font}`). 노션도 플랫폼마다 San Francisco/Segoe UI 같은 시스템 폰트를 그대로 쓰지 웹폰트를 CDN으로 받지 않는다 — 이 저장소의 "웹폰트 CDN 금지" 원칙과 우연히 일치하므로 별도 예외 표기 없이 그대로 따른다. 제목(`{typography.fs-title}`)은 굵게, 본문(`{typography.fs-body}`)은 line-height 1.6 이상으로 노션 특유의 여유 있는 줄간격을 낸다.

## Layout

콘텐츠 폭은 640px로 제한하고 화면 중앙에 둔다 — 노션 페이지 본문 폭과 비슷한 좁은 단이 "문서를 읽는" 느낌을 준다. 카드 사이 간격은 `{spacing.sm}`, 카드 내부 패딩은 `{spacing.md}`~`{spacing.lg}`.

## Elevation

의도적으로 없음. 그림자 대신 `{colors.border}` 1px 선만 쓴다 — 노션 UI에 그림자가 등장하는 유일한 순간은 드래그 중인 블록 정도이고, 이 앱은 드래그 정렬이 없으므로 그림자 토큰 자체를 두지 않았다.

## Shapes

모서리는 `{rounded.sm}`(입력 요소·작은 버튼)과 `{rounded.md}`(카드)만 쓴다. 노션 UI의 둥근 정도가 크지 않다는 인상을 그대로 반영한 상한이다.

## Components

- **메모 카드**(`{components.memo-card}`): 내용 텍스트 → 작성 시각 캡션(`{typography.fs-caption}`, `{colors.muted}`) → 수정/삭제 버튼 순으로 세로 배치.
- **수정 모드**: 카드가 그 자리에서 textarea + 저장/취소 버튼으로 바뀐다. 목록에 별도 모달을 띄우지 않는다 — 노션의 "그 자리에서 바로 편집" 감각.
- **삭제 확인**(`{components.button-danger-confirm}`): 클릭 한 번으로 바로 지우지 않는다. "삭제" → "정말 삭제?"(확인/취소 두 버튼)로 바뀌는 2단계 확인이며, `window.confirm`은 쓰지 않는다 — `day2/CLAUDE.md`가 명시한 대로 샌드박스 환경에서 네이티브 다이얼로그가 막히면 화면이 멈춘 것처럼 보이기 때문. **확장**: day2의 Promise 기반 `dialog()` 헬퍼 대신, 이 앱 규모에서는 버튼 자체의 상태 전환으로 더 가볍게 구현한다.
- **입력 폼**: 상단 고정, textarea + "추가" 버튼. 빈 내용은 추가되지 않는다.
- **오류 배너**: Supabase 호출 실패 시 목록 위에 짧은 문구로 표시하고, 무한 로딩 스피너로 남겨두지 않는다. **확장**: 이 토큰 세트에 오류 상태 색이 별도로 없어 `{colors.danger}`/`{colors.danger-bg}`를 재사용한다.

## Do's and Don'ts

- 그림자·그라디언트를 추가하지 말 것 — 노션 톤의 핵심은 "선 하나로 충분하다"는 절제다.
- `{colors.accent}`를 버튼 배경색 기본값으로 쓰지 말 것 — 링크·포커스·확인 상태 등 "지금 상호작용 중"인 곳에만 쓴다. 평상시 버튼은 `{colors.text}`(진한 회갈색) 배경이다.
- 순수 검정(`#000000`)이나 순수 회색조 없는 파랑을 섞지 말 것 — 노션 팔레트는 살짝 브라운/웜톤이 섞여 있다.

## Responsive Behavior

640px 미만에서는 좌우 패딩만 `{spacing.md}`로 줄이고 레이아웃 구조(세로 목록)는 그대로 유지한다 — 애초에 폭이 좁은 단일 컬럼 설계라 별도 모바일 전용 레이아웃이 필요 없다.

## Iteration Guide

토큰 값을 바꿀 때는 이 프론트매터와 `index.html`의 `:root` 블록을 함께 고친다(`day2` 계약과 동일). 이 앱에 필요한데 토큰에 없는 것이 생기면, 위 Components 절처럼 **확장** 표시를 남기고 이 문서에도 한 줄 추가할 것.

## Known Gaps

- 다크 모드 토큰 없음 — 노션 다크 테마는 이번 범위에서 다루지 않았다.
- 리치 텍스트(굵게/목록/체크박스 등) 없음 — 메모는 순수 텍스트만 저장한다.
