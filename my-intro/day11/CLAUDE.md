# CLAUDE.md (day11)

"산책기록" PWA. Claude Design 핸드오프 번들(`prd/README.md`, `prd/산책기록_PWA_PRD.md`, `prd/project/산책기록.dc.html`)을 픽셀 단위로 재현한 실제 구현체. 산책 중 사진을 찍으면 Gemini Vision이 감성 캡션·태그·무드를 붙이고, 위치가 지도에 핀으로 쌓이고, 대시보드에서 태그워드클라우드/요일별 그래프/무드분포를 보여준다.

## 이 폴더가 다른 day 폴더와 다른 점

이 저장소에서 **Next.js를 쓰면서 동시에 별도 백엔드 서버도 두지 않는** 유일한 폴더다. `day5/news`/`day6/dust`/`day6/shopping/server`는 서비스키를 숨기려고 Next.js 서버를 두고, `day8`은 서버 없이 순수 HTML/CSS/JS로 Supabase를 직접 호출한다 — day11은 그 중간으로, **프론트엔드 프레임워크는 Next.js(사용자가 명시적으로 "이전 제약(무프레임워크) 무시하고 진행"이라고 지시해 채택)를 쓰지만, Gemini 키를 숨기는 역할은 Next.js 서버가 아니라 Supabase Edge Function(`supabase/functions/gemini-vision/`)이 맡는다.** 그래서 `npm run build`가 만드는 것은 정적으로 배포 가능한 클라이언트 앱이고, day6/shopping/server처럼 "이 앱 자체가 API 프록시"인 구조는 아니다.

## 스택

- **프론트엔드**: Next.js 16 (App Router) + TypeScript + React 19, 전부 클라이언트 컴포넌트(`src/app/page.tsx`가 스플래시/온보딩/로그인/앱 4단계 상태 머신을 직접 관리). Tailwind 없음 — `prd/project/산책기록.dc.html`의 인라인 스타일 값을 `src/components/*.tsx`에 그대로 옮겨적는 방식이 픽셀 일치를 보장하기 가장 쉬웠다.
- **인증/DB/스토리지**: Supabase, day4/day8과 같은 공유 프로젝트("subacam's Project", id `srhnwzcnimadmoyfukwd`). URL과 publishable(anon) 키는 `src/lib/supabase.ts`에 하드코딩되어 있다 — day4/day8과 같은 이유로 비밀값이 아니다(RLS가 실제 접근을 통제).
- **AI**: Gemini Vision, 이 폴더의 소스가 아니라 Supabase Edge Function(`supabase/functions/gemini-vision/index.ts`) 안에서만 호출된다. `GEMINI_API_KEY`는 Edge Function 시크릿으로만 존재하고 클라이언트에는 절대 내려가지 않는다.
- **지도**: 실지도 SDK 없음 (아래 "지도가 실지도가 아닌 이유" 참고).

## 데이터 모델 (Supabase 프로젝트 `srhnwzcnimadmoyfukwd`)

- `public.walk_profiles(id uuid PK → auth.users, onboarding_seen bool, created_at)` — 온보딩을 한 번만 보여주기 위한 최소 프로필 확장.
- `public.walk_records(id, user_id → auth.users, image_url text, latitude, longitude, ai_caption, ai_tags text[], ai_mood text check(...), created_at)` — `ai_mood`는 PRD 7번 섹션 후보군(평온/설렘/활기/쓸쓸함/그리움/행복/여유)으로 DB 레벨에서 제한.
- Storage 버킷 `walk-photos` (private), 객체 경로는 항상 `{auth.uid()}/파일명`.
- 마이그레이션: `create_walk_records_tables`, `create_walk_photos_bucket` (Supabase MCP `apply_migration`으로 적용). RLS는 두 테이블 + 버킷 모두 `auth.uid()` 기준 본인 행/경로만 select/insert/update/delete 허용. `get_advisors(security)`로 새로 추가된 규칙에 대한 경고 없음을 확인(기존 day4 관련 경고만 남아 있고 day11이 새로 만든 것은 없음).

## Edge Function: `gemini-vision`

- 배포: `mcp__supabase__deploy_edge_function` (project_id `srhnwzcnimadmoyfukwd`, `verify_jwt: true` — 로그인한 사용자만 호출 가능). 소스는 `supabase/functions/gemini-vision/index.ts`에 보관(레포 버전 관리용 — 실제 실행되는 코드는 Supabase에 배포된 버전).
- 요청 `{imageBase64, mimeType}` → `{caption, tags, mood}` (Gemini `responseSchema`로 스키마 강제, `day6/shopping/server/src/lib/gemini.ts`와 같은 패턴).
- **`MOCK_GEMINI` 플래그(Edge Function 시크릿, 기본값 없으면 "1"로 간주) — 지금은 mock 상태다.** `GEMINI_API_KEY` 시크릿이 아직 등록되지 않았거나 `MOCK_GEMINI`가 "0"이 아니면 PRD의 `AI_POOL` 예시 3종 중 하나를 `(mock)` 접미사와 함께 그대로 반환한다. 실제 Gemini 호출이 실패해도(401/429/기타) mock으로 자동 폴백하고 응답에 `fallback:true`를 얹는다 — 사용자 경험이 절대 끊기지 않도록.
- **실제 키로 전환하는 법(사용자가 직접 해야 함 — Supabase MCP 도구셋에는 Edge Function 시크릿을 설정하는 도구가 없다)**: Supabase 대시보드 → Edge Functions → `gemini-vision` → Secrets에서 `GEMINI_API_KEY`(Google AI Studio, `AIzaSy...`로 시작하는 키)와 `MOCK_GEMINI=0`을 등록하거나, CLI로 `supabase secrets set GEMINI_API_KEY=... MOCK_GEMINI=0 --project-ref srhnwzcnimadmoyfukwd`. 이 세션에서 사용자가 붙여넣은 값(`AQ.`로 시작)은 Google AI Studio 키 형식(`AIzaSy...`)이 아니라 OAuth 액세스 토큰처럼 보여 사용하지 않았다 — 실제 키인지 `aistudio.google.com/apikey`에서 재확인 필요.

## 지도가 실지도가 아닌 이유

PRD 문서 자체는 Kakao/Mapbox 같은 실지도 SDK를 "추가로 필요"하다고 제안했지만, Claude Design 대화 기록을 확인한 결과 사용자가 초기 설정 질문에서 지도 스타일을 **"심플/미니멀 지도"**로 명시적으로 선택했다(실지도 스타일 옵션이 따로 있었는데 고르지 않음). 그래서 `산책기록.dc.html`에 이미 그려진 추상 블롭 2개 + 경로 3개짜리 SVG가 placeholder가 아니라 최종 디자인이라고 판단해 그대로 구현했다(`src/components/MapTab.tsx`). 실제 위경도는 그 사용자의 기록 범위(min/max lat/lng)에 맞춰 15%~85% 캔버스 좌표로 정규화한다(`src/lib/dashboard.ts`의 `projectRecordsToMap`) — 기록이 1개뿐이거나 위경도 범위가 0이면 중앙(50%,50%)으로 fallback.

## 온보딩/로그인 순서

PRD 5.1(스플래시 → 온보딩 최초 1회 → 로그인)을 그대로 따른다. `산책기록.dc.html`은 온보딩 다음 바로 앱으로 넘어가고 로그인 화면 자체는 목업에 없었다(Claude Design 대화도 로그인 UI는 다루지 않음) — `src/components/AuthScreen.tsx`는 같은 색/폰트 토큰으로 이 프로젝트가 새로 디자인한 화면이다. 로그인 전 온보딩 시청 여부는 `localStorage`(`walk_onboarding_seen`)에 임시 저장했다가 로그인 성공 시 `walk_profiles.onboarding_seen`으로 동기화(PRD 5.1의 명시적 지시).

## 확인한 것

- `npm run build` / `npm run lint` 통과 (TypeScript strict, ESLint 0 errors — `prd/**`는 Claude Design 원본 소스라 lint 대상에서 제외).
- Supabase REST를 직접 호출해 실제 유저(`signup` → JWT)로 `walk_profiles`/`walk_records` insert·select 확인, **RLS가 실제로 타인 접근을 막는 것**(무토큰 조회 시 빈 배열)까지 확인. Storage도 본인 경로 업로드는 성공, 남의 경로 업로드는 403으로 막히는 것 확인, 서명 URL 발급도 확인.
- `gemini-vision` Edge Function을 실제 유저 JWT로 호출해 mock 응답(`(mock)` 접미사) 정상 수신 확인.
- **`npm run dev` + 실제 Chrome 브라우저 자동화로 골든 패스 전체를 실행**: 스플래시 → 온보딩 3장(건너뛰기/다음/시작하기) → 회원가입(Supabase Auth 실호출) → 4탭(피드/지도/대시보드/내정보) 렌더링 → FAB로 캡처 시트 열기 → 갤러리에서 실제 파일 업로드 → (지오로케이션은 자동화 브라우저에 위치 권한이 없어 최초 시도는 8초 타임아웃 후 토스트+`choose` 화면으로 정상 복귀하는 것까지 확인 — GPS 실패 시 앱이 멈추지 않고 우아하게 처리됨을 검증) → 위치를 모킹해 재시도 → `gemini-vision` mock 응답 수신 → 결과 화면(`(mock)` 캡션/태그/무드) → 저장 → **Storage 업로드 + `walk_records` insert 실제 성공** → 피드에 새 카드로 반영 → 지도 핀 1개(`projectRecordsToMap`) · 대시보드 태그클라우드/요일막대/무드도넛(100% 설렘)까지 전부 실데이터로 정확히 반영되는 것을 확인. 테스트로 만든 계정/행/파일은 전부 정리(cascade delete)했다.
- **이 브라우저 검증에서 실제 버그 하나 발견·수정**: `AuthScreen.tsx`가 `const fn = mode==='login' ? supabase.auth.signInWithPassword : supabase.auth.signUp; await fn(...)`처럼 메서드를 변수로 분리해서 호출하고 있었는데, 이러면 `this` 바인딩이 깨져 supabase-js 내부에서 `Cannot read properties of undefined (reading 'storage')`로 즉시 실패했다(회원가입 버튼이 "처리 중..."에서 영원히 멈춤). `mode`에 따라 두 갈래로 직접 호출하도록 고쳐서 해결 — 콘솔에서 실제로 예외를 잡아서 재현·수정까지 한 것이라 실사용 검증의 가치가 컸다.

## 아직 안 된 것

- **실제 Gemini 응답으로 전체 플로우(촬영→분석→저장) 실사용 검증** — `GEMINI_API_KEY`가 아직 mock 상태라 캡션/태그/무드는 항상 `AI_POOL` 예시 중 하나. 사용자가 실제 키를 등록하면 즉시 실제 경로로 전환된다(코드 변경 불필요).
- 실제 기기 카메라로 촬영해 GPS 권한 프롬프트까지 포함한 전체 캡처 플로우의 실기기 검증(자동화 브라우저는 위치 권한 자체가 없어 GPS 성공 경로는 `getCurrentPosition`을 런타임에 모킹해서만 확인했다).
- PWA 설치(홈 화면 추가) 실기기 검증 — `manifest.json`/`sw.js`는 `day10`(물 한잔) 패턴을 그대로 따랐다. 아이콘(`public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`)은 `TabBar.tsx`의 피드 탭 발자국 마크를 그대로 확대해 브랜드 컬러(`#E8927C`) 배경에 얹은 것(사용자 요청) — 실배포 전 재검토 대상.
- `project-hub` 카드 등록, Vercel 배포(별도 프로젝트, Root Directory `day11`로 설정 필요 — `day6/shopping/server`와 같은 방식).
- 소셜 로그인(PRD가 "선택"으로 언급) — 이메일/비밀번호만 구현, OAuth 앱 등록이 필요해 이번 범위에서 제외.

## 실행

```
cd day11
npm run dev     # localhost:3000
npm run build   # 타입체크 + lint + 프로덕션 빌드
```

@AGENTS.md
