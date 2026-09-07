# CLAUDE.md (day12/mbti)

이 파일은 Claude Code(claude.ai/code)가 이 폴더에서 작업할 때 참고하는 가이드다.

## 프로젝트

MBTI 공부법 연구소 — HTML 여러 페이지로 구성된 콘텐츠 사이트.

## 디자인

IBM(`ibm.com/kr-ko`)의 Carbon 디자인 시스템을 참고한다. 2026-08-27 사용자 요청으로 기존 "크림 배경 + 보라 포인트" 디자인에서 교체했다 — 이 문서와 실제 사이트 디자인이 어긋나면 사이트(구현) 쪽을 따르고 이 문서를 갱신할 것.

- **컬러**: 라이트 배경 `#ffffff` / 다크 배경 `#161616`(Carbon Gray 100), 포인트 컬러는 IBM Blue 60 `#0f62fe`(호버 `#0043ce`). 실제 값은 `css/base.css`의 `:root`·`:root[data-theme="dark"]` 토큰이 원본이다.
- **폰트**: IBM Plex Sans / IBM Plex Sans KR (Google Fonts CDN).
- **모서리**: 버튼·카드·태그 모두 각진 사각형(`border-radius: 0`) — Carbon 특유의 flat/사각 스타일.
- **다크/라이트 모드**: 모든 페이지 헤더 우측에 토글 버튼(`#theme-toggle`)이 있다. `<html data-theme="light|dark">`로 전환하며 `localStorage("mbti-theme")`에 저장, 최초 방문 시 `prefers-color-scheme`을 따른다. 깜빡임(FOUC) 방지를 위해 각 HTML `<head>` 맨 앞에 테마를 동기적으로 읽어 세팅하는 인라인 스크립트가 있다 — 새 페이지를 추가할 때도 이 인라인 스크립트를 그대로 복사해 넣을 것.
- 모바일 반응형 유지.

## 파일 구조

- `css/base.css` — 리셋, 컬러/폰트 토큰(라이트+다크), 헤더(테마 토글 포함), 히어로, 버튼, 푸터. 모든 페이지가 로드.
- `css/components.css` — `index.html`과 그룹 페이지(`nt/nf/sj/sp.html`) 전용(그룹 카드, 특징/강점/주의점, 유형별 카드, 시험 꿀팁, 하단 CTA).
- `css/test.css` — `test.html` 전용(문항/보기, 결과 카드, 점수 바, 토스트).
- `js/theme.js` — 테마 토글 버튼 동작(모든 페이지 공통).
- `js/test.js` — `test.html`의 채점/결과 렌더링/공유 로직.
- 원래 `css/style.css` 하나였지만 300줄 규칙(아래) 때문에 위 세 파일로 분리했다 — 새 스타일을 추가할 때 다시 300줄을 넘길 것 같으면 같은 기준(공통/그룹페이지 전용/자가진단 전용)으로 또 분리할 것.

## 규칙

- 서버, API, 키는 절대 사용하지 않는다 — 정적 파일(HTML/CSS/JS)만으로 구성한다.
- 파일이 300줄을 넘으면 곧바로 쪼개지 말고, 먼저 분리를 제안할 것.
