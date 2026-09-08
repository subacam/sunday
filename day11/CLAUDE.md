# CLAUDE.md (day11)

**앱 이름은 "마이플"(myplayground)이다** — 2026-09-07에 "산책기록"에서 바꿨다. 사용자에게 보이는 이름은 `layout.tsx`의 `metadata.title`, `manifest.json`의 `name`/`short_name`, `Splash.tsx`, `AuthScreen.tsx`, `page.tsx`의 `navigator.share` 제목 다섯 군데뿐이고 전부 바뀌었다. 코드/폴더 식별자(`package.json`의 `day11-walk-record`, 테이블 `walk_records`/`walk_tracks`, 버킷 `walk-photos`, 디자인 원본 파일명 `산책기록.dc.html`)는 그대로 뒀다 — 사용자에게 안 보이고, 바꾸면 DB 마이그레이션과 디자인 핸드오프 이력이 끊긴다.

"마이플" PWA. Claude Design 핸드오프 번들(`prd/README.md`, `prd/산책기록_PWA_PRD.md`, `prd/project/산책기록.dc.html`)을 픽셀 단위로 재현한 실제 구현체. 산책 중 사진을 찍으면 Gemini Vision이 감성 캡션·태그·무드를 붙이고, 위치가 지도에 핀으로 쌓이고, 대시보드에서 태그워드클라우드/요일별 그래프/무드분포를 보여준다.

## 이 폴더가 다른 day 폴더와 다른 점

이 저장소에서 **Next.js를 쓰면서 동시에 별도 백엔드 서버도 두지 않는** 유일한 폴더다. `day5/news`/`day6/dust`/`day6/shopping/server`는 서비스키를 숨기려고 Next.js 서버를 두고, `day8`은 서버 없이 순수 HTML/CSS/JS로 Supabase를 직접 호출한다 — day11은 그 중간으로, **프론트엔드 프레임워크는 Next.js(사용자가 명시적으로 "이전 제약(무프레임워크) 무시하고 진행"이라고 지시해 채택)를 쓰지만, Gemini 키를 숨기는 역할은 Next.js 서버가 아니라 Supabase Edge Function(`supabase/functions/gemini-vision/`)이 맡는다.** 그래서 `npm run build`가 만드는 것은 정적으로 배포 가능한 클라이언트 앱이고, day6/shopping/server처럼 "이 앱 자체가 API 프록시"인 구조는 아니다.

## 스택

- **프론트엔드**: Next.js 16 (App Router) + TypeScript + React 19, 전부 클라이언트 컴포넌트(`src/app/page.tsx`가 스플래시/온보딩/로그인/앱 4단계 상태 머신을 직접 관리). Tailwind 없음 — `prd/project/산책기록.dc.html`의 인라인 스타일 값을 `src/components/*.tsx`에 그대로 옮겨적는 방식이 픽셀 일치를 보장하기 가장 쉬웠다.
- **인증/DB/스토리지**: Supabase, day4/day8과 같은 공유 프로젝트("subacam's Project", id `srhnwzcnimadmoyfukwd`). URL과 publishable(anon) 키는 `src/lib/supabase.ts`에 하드코딩되어 있다 — day4/day8과 같은 이유로 비밀값이 아니다(RLS가 실제 접근을 통제).
- **AI**: Gemini Vision, 이 폴더의 소스가 아니라 Supabase Edge Function(`supabase/functions/gemini-vision/index.ts`) 안에서만 호출된다. `GEMINI_API_KEY`는 Edge Function 시크릿으로만 존재하고 클라이언트에는 절대 내려가지 않는다.
- **지도**: MapLibre GL JS **v4**(v6 아님 — 이유는 아래 "지도" 절의 워커 버그 참고) + OpenFreeMap 벡터 타일(무료, 키 불필요).

## 데이터 모델 (Supabase 프로젝트 `srhnwzcnimadmoyfukwd`)

- `public.walk_profiles(id uuid PK → auth.users, onboarding_seen bool, created_at)` — 온보딩을 한 번만 보여주기 위한 최소 프로필 확장.
- `public.walk_records(id, user_id → auth.users, image_url text, latitude, longitude, ai_caption, ai_tags text[], ai_mood text check(...), created_at)` — `ai_mood`는 PRD 7번 섹션 후보군(평온/설렘/활기/쓸쓸함/그리움/행복/여유)으로 DB 레벨에서 제한.
- `public.walk_tracks(id, user_id → auth.users, started_at, ended_at, distance_m double precision, points jsonb, created_at)` — 실제로 걸은 경로. **포인트를 행으로 쪼개지 않고 `points` jsonb 배열 하나에 담는다**(산책 1회당 수백~수천 행이 생기는 걸 피하려는 것). `distance_m`은 `points`에서 계산해 저장해두는 중복 컬럼 — 대시보드가 매번 좌표를 파싱해 하버사인을 돌리지 않고 바로 합산할 수 있게 하려고 일부러 둔 것이다. 인덱스는 `(user_id, started_at desc)`.
- Storage 버킷 `walk-photos` (private), 객체 경로는 항상 `{auth.uid()}/파일명`.
- 마이그레이션: `create_walk_records_tables`, `create_walk_photos_bucket`, `create_walk_tracks_table` (Supabase MCP `apply_migration`으로 적용). RLS는 두 테이블 + 버킷 모두 `auth.uid()` 기준 본인 행/경로만 select/insert/update/delete 허용. `get_advisors(security)`로 새로 추가된 규칙에 대한 경고 없음을 확인(기존 day4 관련 경고만 남아 있고 day11이 새로 만든 것은 없음).

## Edge Function: `gemini-vision`

- 배포: `mcp__supabase__deploy_edge_function` (project_id `srhnwzcnimadmoyfukwd`, `verify_jwt: true` — 로그인한 사용자만 호출 가능). 소스는 `supabase/functions/gemini-vision/index.ts`에 보관(레포 버전 관리용 — 실제 실행되는 코드는 Supabase에 배포된 버전).
- 요청 `{imageBase64, mimeType}` → `{caption, tags, mood}` (Gemini `responseSchema`로 스키마 강제, `day6/shopping/server/src/lib/gemini.ts`와 같은 패턴).
- **`MOCK_GEMINI` 플래그(Edge Function 시크릿, 기본값 없으면 "1"로 간주) — 지금은 mock 상태다.** `GEMINI_API_KEY` 시크릿이 아직 등록되지 않았거나 `MOCK_GEMINI`가 "0"이 아니면 PRD의 `AI_POOL` 예시 3종 중 하나를 `(mock)` 접미사와 함께 그대로 반환한다. 실제 Gemini 호출이 실패해도(401/429/기타) mock으로 자동 폴백하고 응답에 `fallback:true`를 얹는다 — 사용자 경험이 절대 끊기지 않도록.
- **실제 키로 전환하는 법(사용자가 직접 해야 함 — Supabase MCP 도구셋에는 Edge Function 시크릿을 설정하는 도구가 없다)**: Supabase 대시보드 → Edge Functions → `gemini-vision` → Secrets에서 `GEMINI_API_KEY`(Google AI Studio, `AIzaSy...`로 시작하는 키)와 `MOCK_GEMINI=0`을 등록하거나, CLI로 `supabase secrets set GEMINI_API_KEY=... MOCK_GEMINI=0 --project-ref srhnwzcnimadmoyfukwd`. 이 세션에서 사용자가 붙여넣은 값(`AQ.`로 시작)은 Google AI Studio 키 형식(`AIzaSy...`)이 아니라 OAuth 액세스 토큰처럼 보여 사용하지 않았다 — 실제 키인지 `aistudio.google.com/apikey`에서 재확인 필요.
- **"AI 분석이 안 되는 것 같다" 진단(2026-09-08)**: `query_logs`(`source = 'function_logs'`, `event_message like '%gemini-vision%'`)로 확인하니 실제 원인은 코드 버그가 아니라 **Gemini 쪽 일시적 과부하**였다 — 업스트림이 `503 UNAVAILABLE`("This model is currently experiencing high demand")을 반환했고, 기존 로직대로 mock으로 자동 폴백해 사용자에게는 매번 `(mock)` 캡션만 보였다(요청 자체는 실패하지 않아 화면이 멈추거나 에러가 뜨진 않음 — 그래서 "안 되는 것 같다"는 애매한 인상만 남았다). **503/429는 재시도하면 곧잘 성공하는 일시적 상태라 `callGemini`에 재시도 1회(`MAX_ATTEMPTS=2`, 900ms 간격)를 추가했다** — 그 외 상태코드(401/400 등)는 재시도해도 똑같이 실패하므로 바로 mock 폴백으로 넘어간다. 재시도 여유를 만들려고 시도당 타임아웃도 30s→15s로 줄였다(최악의 경우 총 대기시간이 예전보다 크게 늘지 않도록). `supabase/functions` 디렉터리는 `tsconfig.json`의 `exclude`에 있어 `npm run build`/`lint`로는 검증되지 않는다 — 배포(`deploy_edge_function`, version 6)로만 반영했고 로컬 `index.ts`와 내용을 동일하게 맞춰뒀다.

## 지도

**1차 구현(추상 SVG) → 2차 구현(실지도)으로 교체됐다.** 처음엔 Claude Design 대화 기록에서 사용자가 지도 스타일로 "심플/미니멀 지도"를 골랐던 것을 근거로, `산책기록.dc.html`의 추상 블롭+경로 SVG를 그대로 구현했다. 이후 사용자가 "지금 컨셉(미니멀 톤)은 유지하되 실제 지도 형태와 동일하게 해달라"고 요청해, **MapLibre GL JS + OpenFreeMap 벡터 타일**로 다시 구현했다(`src/components/MapTab.tsx`).

- **왜 OpenFreeMap인가**: Kakao/Mapbox 같은 다른 실지도 SDK는 키 발급(사용자 액션 필요)이 걸리거나(Kakao), 스타일을 도로/땅/물 색까지 자유롭게 재색칠하기 어렵다. OpenFreeMap(openfreemap.org)은 회원가입·키 없이 벡터 타일을 무료로 제공하고, MapLibre 스타일 스펙(레이어별 `paint` 오버라이드)을 그대로 쓸 수 있어 "실제 도로/건물/물 모양은 유지하되 색은 앱 팔레트로" 요구를 정확히 만족한다.
- **컨셉을 유지하는 방법**: 색칠은 지도를 움직이거나 다시 열 때마다 다시 계산하지 않는다 — `src/lib/mapStyle.json`이 OpenFreeMap의 "positron" 베이스 스타일에서 라벨/POI/철도/공항/행정경계 레이어를 전부 제거하고, 남은 13개 레이어(배경/공원/물/주거지/숲/수로/건물/도로 각급)만 앱 팔레트(`#EEEDE1`/`#DCE6D6`/`#DAD5C4` 등, 목업의 블롭·경로 색과 동일 계열)로 미리 재색칠해둔 정적 파일이다. 지도를 열 때마다 실시간으로 바뀌는 건 그 위치의 실제 지형 **데이터**(도로·건물 모양)뿐이고, 그건 사용자가 어디를 걷든 대응해야 하므로 라이브로 받아올 수밖에 없다(전 세계를 미리 구워둘 수 없음). `mapStyle.json`은 `scratchpad/build-map-style.js`(세션 임시 스크립트, 저장소에는 없음) 같은 방식으로 OpenFreeMap의 positron 스타일을 한 번 내려받아 레이어를 골라 재색칠해 만들었다 — 다시 만들 땐 `https://tiles.openfreemap.org/styles/positron`을 기준으로 삼으면 된다.
- **핀/카메라**: 기록의 실제 위경도로 `LngLatBounds` + `fitBounds`를 써서 사용자의 기록 범위에 자동으로 맞춘다(예전의 `projectRecordsToMap` 수동 정규화는 제거). 핀은 기존 mood-color teardrop SVG를 MapLibre `Marker`의 커스텀 DOM 엘리먼트로 그대로 재사용한다.
- **전국 미리 캡처는 하지 않기로 함**: 사용자가 "한국 전체를 미리 캡처해두면 어떤가" 물어봐서, 골목 단위 상세도로 전국을 정적 타일로 구우면 파일 수가 감당 안 된다는 점(전국 × z16~18은 수백만 타일)과, PMTiles(단일 파일 오프라인 타일 아카이브)로 하면 가능은 하지만 빌드 파이프라인이 훨씬 무거워진다는 점을 설명했다. 개인 프로젝트 규모라 지금의 라이브 OpenFreeMap 방식(브라우저가 사용자가 실제로 다니는 지역만 자연히 캐싱)을 유지하기로 결정했다.
- **트레이드오프**: 지도 화면은 이제 네트워크가 필요하다(추상 SVG일 때는 완전 오프라인이었음) — 지도 탭은 타일을 못 받으면 배경색만 보이고 빈 상태가 된다. 별도 오프라인 폴백은 아직 안 만들었다. (아래 "피드가 빈 상태로 보이던 문제" 참고 — 여기 적혀 있던 "다른 화면은 오프라인에서 캐시된 데이터로 보인다"는 서술은 사실이 아니었다. `public/sw.js`가 Supabase 호출은 아예 캐시하지 않고 항상 네트워크로 보내고(주석 그대로), 기록/트랙은 React state에만 있어 캐시가 없었다 — 그래서 실제로는 재개 직후 첫 요청이 실패하면 피드가 빈 화면으로 보였다.)

### 배포 후 실제로 겪은 버그 3개 — 순서대로

지도를 실지도로 바꾼 뒤 배포했더니 실사용자(이 프로젝트 소유자)가 "지도가 안 보인다"고 보고했다. 원인이 세 개 겹쳐 있었고, 하나씩 벗겨내며 고쳤다:

1. **서비스워커가 배포를 아예 감지하지 못함.** `public/sw.js`가 v1에서 순수 캐시 우선(cache-first, 재검증 없음)이었다. `sw.js` 파일 자체의 바이트가 바뀌지 않으면 브라우저는 새 서비스워커 설치 자체를 시도하지 않는다 — 그래서 코드를 아무리 재배포해도 최초에 캐싱해둔 예전 HTML/JS(당시엔 추상 SVG 지도였던 버전)를 브라우저가 영원히 계속 서빙했다. `CACHE_VERSION`을 올리고 fetch 전략을 네트워크 우선(성공하면 그걸 쓰고 캐시에 저장, 실패하면 캐시 폴백)으로 바꿔서 해결(`v2`). `skipWaiting`/`clients.claim`은 원래 있었지만 그건 "새 SW가 설치될 때" 취하는 조치라,애초에 새 SW 설치 자체가 트리거되지 않으면 무용지물이라는 걸 이번에 체감했다.
2. **지도 캔버스 크기가 마운트 시점에 잘못 고정됨.** 로컬에서 캔버스 내부 버퍼가 스타일 크기의 정확히 절반(224×270 vs 448×540)으로 굳어있는 걸 발견 — MapLibre가 컨테이너를 실제 최종 레이아웃 이전 시점 크기로 한 번만 읽고 고정해버린 것으로 추정. `MapTab.tsx`에 `ResizeObserver`를 달아 컨테이너 크기가 바뀔 때마다 `map.resize()`를 호출하도록 고쳤다.
3. **(진짜 원인) MapLibre GL JS v6가 타일 워커를 ES 모듈 blob URL로 띄우는데, 그 워커 스크립트 로드 자체가 이 환경에서 영원히 멈춤.** `window.Worker`를 몽키패치해 관찰한 결과 워커가 아예 생성되지 않았고, 네트워크 탭에는 `blob:https://.../<uuid>` 요청 하나가 `pending` 상태로 영원히 걸려 있었다 — `.pbf` 타일 요청은 단 하나도 나가지 않았다(`map.isStyleLoaded()`가 계속 `false`). v6는 `new Worker(url, {type:'module'})`로 워커를 띄우는데(`node_modules/maplibre-gl/dist/maplibre-gl.mjs`에서 `new Worker(e,{type:` 검색하면 확인 가능), v4.7.1은 `new Worker(e.a.WORKER_URL)`처럼 classic(비-모듈) 워커를 쓴다. **`maplibre-gl`을 `^6.6.0` → `4.7.1`로 다운그레이드하니 즉시 해결됐다** (`map.loaded()`/`isStyleLoaded()`가 `true`로 바뀌고 실제 타일이 렌더링됨 — Vercel 프리뷰 배포로 직접 확인). API(named export `Map`/`Marker`/`LngLatBounds`/`StyleSpecification`)는 v4도 동일해서 `MapTab.tsx` 코드 변경은 필요 없었다. **v6로 다시 올리지 말 것** — 최소한 이 워커 이슈가 업스트림에서 고쳐졌는지 확인 후에.

디버깅 과정에서 `npm run dev`(Turbopack)의 Fast Refresh가 여러 번 코드 변경을 반영하지 못하고 멈추는 것도 겪었다 — 파일을 고친 뒤 콘솔 로그가 안 보이면 HMR을 의심하지 말고 그냥 `node` 프로세스를 전부 죽이고 `npm run dev`를 재시작할 것. 최종 확인은 로컬이 아니라 **Vercel 프리뷰 배포**(`vercel deploy`, prod 아님)로 했다 — 실제 배포 환경과 최대한 가깝게 재현하려는 목적.

## 발바닥 아이콘 (고양이 젤리)

Claude Design 프로젝트 **Cat Paw Icon**(`a131953b-7ff7-467c-9049-3a5dc93643bc`, `claude_design` MCP의 `DesignSync`로 읽음)의 **1a "기본형 — 균형 잡힌 젤리"** 좌표를 그대로 쓴다. 발가락 4개(안쪽 2개가 높고 바깥 2개가 낮은 아치) + 위가 좁고 아래가 넓은 라운드 삼각형 발바닥. 예전의 "타원 1개 + 원 3개" 발자국은 전부 이걸로 교체됐다.

- **`src/components/PawIcon.tsx` 하나가 유일한 원본**이다. 탭바 피드 아이콘(22px)과 지도 로딩 발자국 4개(26px, `MapTab.tsx`의 `FootIcon`)가 이 컴포넌트를 공유하고, 지도의 현재 위치 마커(`activeHeadElement`)와 PWA 아이콘 생성기만 MapLibre/Node 쪽이라 같은 좌표를 문자열로 복제해 갖고 있다 — **도형을 고치면 이 세 군데를 같이 고쳐야 한다**(`PawIcon.tsx`, `MapTab.tsx`의 `activeHeadElement`, `scripts/build-icons.js`).
- **1b(통통형)를 쓰지 않은 이유**: 디자인이 1b를 "작은 크기에서 더 잘 보임"으로 제안했지만, 1a를 실제 22·26px로 래스터라이즈해 확대해보니 발가락 4개와 발바닥이 또렷하게 구분됐다. 디자인이 "그대로 복사해서 쓰세요"로 넘겨준 SVG 소스와 PWA 미리보기가 둘 다 1a 기준이라 1a로 통일했다. 더 통통한 쪽을 원하면 1b 좌표로 `PawIcon.tsx`만 바꾸면 된다.
- **PWA 아이콘**: `node scripts/build-icons.js`가 `public/icon.svg`·`icon-192.png`·`icon-512.png`·`icon-maskable-512.png`를 한 번에 만든다. 디자인 스펙대로 배경 `#E8927C` + 흰 발바닥이고, "any"는 타일의 62%(디자인 미리보기의 112/180), maskable은 그 72%인 45%에 모서리 라운딩 없이 꽉 채운다(런처가 원형/스쿼클로 자르므로). `sharp`는 next의 전이 의존성이라 `package.json`에 직접 넣지 않고 `node_modules`에 있는 걸 그대로 쓴다 — next 버전이 올라 sharp가 빠지면 이 스크립트만 깨지고 앱은 멀쩡하다.

## 다크 모드 (2026-09-08)

Cat Paw Icon 프로젝트의 **섹션 3 "다크 모드 — 전체 탭 + 야간 산책 지도 효과"**(2c 팔레트: 배경 `#171a21`, 카드 `#20242e`, 포인트 민트 `#7fd6c2`)를 그대로 옮겼다. 라이트는 기존 디자인 그대로 두고(디자인 자체는 변경 없음), 다크는 색만 새 팔레트로 교체하는 방식이라 레이아웃/컴포넌트 구조는 손대지 않았다.

- **토큰은 CSS 커스텀 프로퍼티**(`globals.css`의 `:root`/`:root[data-theme="dark"]`) — `--wr-bg`/`--wr-card`/`--wr-card-alt`/`--wr-text`/`--wr-text-muted`/`--wr-text-faint`/`--wr-text-chip`/`--wr-border`/`--wr-border-strong`/`--wr-accent`/`--wr-skeleton`/`--wr-shadow`/`--wr-scroll-thumb`/`--wr-overlay`/`--wr-stat-value`. 인라인 스타일 값 리터럴(`#2E2B24`, `#8B8578`, `#fff` 등)을 `var(--wr-*)` 문자열로 바꿔 넣는 방식이라, day11의 "픽셀 값을 그대로 옮겨적는" 인라인 스타일 관례를 그대로 유지하면서 색만 테마에 따라 바뀐다.
- **적용 범위**: 앱 셸(`page.tsx`, `.wr-app-root`), `TabBar`, `FeedTab`, `DashboardTab`, `ProfileTab`, `CaptureSheet`, `PinSheet`, `FeedDetailModal`, `MapTab`(아래 "지도 다크 모드" 참고). **`Splash`/`Onboarding`/`AuthScreen`만 이번 범위에서 뺐다** — 로그인 전 화면이라 다크 모드 토글(내정보 안에 있음)에 닿기 전에만 보이고, 각자 `position:absolute;inset:0`으로 전체를 불투명하게 덮는 자체 배경(`#FAF6EC`/`#fff`)을 갖고 있어 뒤의 `.wr-app-root`가 다크로 바뀌어도 비쳐 보이지 않는다.
- **토글**: `src/lib/theme.ts`의 `useTheme()`(localStorage 키 `walk_theme`, `document.documentElement`에 `data-theme` 속성 설정)을 `page.tsx`가 소유하고 `ProfileTab`에 `theme`/`onToggleTheme`로 내려준다. `ProfileTab`이 디자인 3d 시안 그대로 "다크 모드" 라벨 + 필 스위치(`ThemeSwitch`)를 렌더한다. `layout.tsx`의 `<head>` 인라인 스크립트가 하이드레이션 전에 `localStorage`를 읽어 `data-theme`를 먼저 찍어둬서 라이트→다크 깜빡임(FOUC)이 없다.
- **통계 숫자만 예외**: 디자인 3d의 다크 프로필 카드는 "312km"/"64" 같은 숫자를 민트 포인트 컬러로 강조했는데, 라이트 원본은 기본 텍스트색이었다. 그래서 `--wr-stat-value` 토큰만 라이트에서 `var(--wr-text)`, 다크에서 `var(--wr-accent)`로 갈라뒀다 — 라이트 디자인은 그대로 두면서 다크에서만 디자인 3d의 강조를 재현하기 위함.
- **확인한 것**: `npm run build`/`npm run lint` 통과. **브라우저로 실제 토글을 띄워보지는 못했다**(이 세션엔 Chrome 자동화 도구가 없었음) — 다음 세션에서 실제로 켜고 끄며 4개 탭 + 시트 3종을 눈으로 봐야 한다.
- **포인트 CTA 3종(카메라 FAB·이번주 걸은 거리 카드·산책 시작 버튼) 후속 조정(2026-09-08)**: 셋 다 원래 `linear-gradient(135deg,#F0A28C,#D97BA0)`(코랄→핑크)를 그대로 썼는데, 다크 모드에서도 이 핑크 그라디언트가 안 바뀌어 새 다크 네이비 톤과 붕 떠 보였다. `--wr-cta-start`/`--wr-cta-end`/`--wr-cta-shadow-rgb`/`--wr-accent-contrast`(+`-rgb`) 토큰을 추가해 라이트는 코랄 계열(`#F0A28C→#E37F6A`, 피드 스와이프 삭제 액션과 같은 톤으로 통일 — 핑크 정지색만 뺐다), 다크는 포인트 민트 계열(`#7fd6c2→#4fb89e`)로 갈라뒀다. 아이콘/글자색은 `--wr-accent-contrast`(라이트 흰색, 다크 `#171a21`)로 대비를 맞춘다. **단, "이번주 걸은 거리" 카드는 바로 아래 항목에서 이 그라디언트 처리를 다시 뺐다** — `--wr-cta-*`는 카메라 FAB·산책 시작 버튼 두 곳에만 남아 있다.
- **"이번주 걸은 거리" 카드를 대시보드의 다른 카드와 통일(2026-09-08)**: 위 항목에서 넣은 `--wr-cta-*` 그라디언트가 대시보드의 나머지 카드(요일별 거리·태그 워드클라우드·무드 분포, 전부 `cardStyle`의 `var(--wr-card)` 배경)와 확 달라 보인다는 피드백으로 되돌렸다. `DashboardTab.tsx`의 `weekCard`가 이제 `cardStyle`을 그대로 쓰고, 숫자만 `var(--wr-stat-value)`(라이트는 본문 텍스트색, 다크는 포인트 민트 — `ProfileTab`의 통계 숫자와 같은 토큰)로 강조한다.
- **이 과정에서 발견한 버그 하나**: 지도 "산책 종료하고 저장" 버튼(추적 중 상태)이 배경엔 `var(--wr-text)`, 글자엔 하드코딩 `#fff`를 같이 쓰고 있었다 — 다크 모드의 `--wr-text`는 밝은색(`#f0ede7`)이라 흰 배경에 흰 글자가 겹쳐 안 보이는 상태였다(필터 칩들은 배경·글자 둘 다 `var(--wr-text)`/`var(--wr-bg)`로 같이 뒤집혀서 문제없었는데, 이 버튼만 글자색이 고정이라 어긋남). `--wr-ink`(항상 어두운 표면, 라이트 `#2E2B24`/다크 `#0d1017`) 토큰을 새로 만들어 이 버튼의 "정지" 배경 전용으로 쓰도록 고쳤다 — 테마가 바뀌어도 뒤집히지 않아야 하는 값과, 뒤집혀야 하는 값(`--wr-text`류)을 섞어 쓰면 이런 문제가 생긴다는 걸 기억해둘 것.
- CaptureSheet의 "저장" 버튼은 요청 범위 밖이라 손대지 않았다 — 여전히 원래 핑크 그라디언트라, 나중에 CTA 톤을 완전히 통일하려면 여기도 `--wr-cta-*` 토큰으로 맞출 필요가 있다.
- **대시보드 태그 워드클라우드도 같은 종류의 버그**: `src/lib/dashboard.ts`의 `CLOUD_COLORS`가 `#2E2B24`(라이트 잉크색)를 리터럴로 갖고 있었는데, 다크 카드 배경(`#20242e`)과 명도가 거의 같아 그 순번의 태그가 다크 모드에서 안 보였다. `CLOUD_COLORS`를 `var(--wr-cloud-1..4)`로 바꾸고 다크에서만 4색 다 밝게 다시 잡았다(`--wr-cloud-1`은 라이트 진한 잉크 → 다크 거의 흰색으로 반전). `computeTagCloud()`는 순수 함수라 리턴값에 `var(--wr-*)` 문자열을 그대로 넣어도 React가 인라인 스타일로 그릴 때 문제없이 해석된다.

### 지도 다크 모드 (2026-09-08 구현)

Cat Paw Icon 디자인 3c("산책 중 — 전체화면 야간 지도")를 따라 지도도 다크 모드에 포함시켰다.

- **타일 스타일**: `src/lib/mapStyle-dark.json`을 `mapStyle.json`과 **동일한 13개 레이어·필터**로 새로 만들고 `paint`만 다크 팔레트로 바꿨다(배경 `#171a21`, 공원/숲 `#1b2b28`, 물 `#141c26`, 건물 `#20242e`, 도로는 대부분 `rgba(240,237,231,0.2~0.45)`, 주요/고속도로 케이싱만 카드-알트 톤 `#2d3342`). OpenFreeMap 벡터 소스·필터는 그대로라 실제 도로/건물/물 형태는 라이트와 동일하고 색만 바뀐다.
- **테마 전환**: `MapTab`이 `page.tsx`로부터 `theme` prop을 받는다. 마운트 시 `mapStyleFor(theme)`로 초기 스타일을 고르고, 이후 `theme`가 바뀌면 `map.setStyle(mapStyleFor(theme))`를 호출한다. **`setStyle`은 새 스타일 JSON에 없는 런타임 소스/레이어(트랙 두 개)를 지워버리므로**, `map.once("style.load", ...)`에서 `addTrackLayers()`로 트랙 소스·레이어를 다시 만들고 `setData`로 현재 트랙/진행 중 산책 데이터를 즉시 채워 넣는다. 전환 중에는 `styleLoaded`를 잠깐 `false`로 내려 기존 로딩 오버레이(발자국 애니메이션)가 다시 뜨게 했다 — 별도 트랜지션 UI를 새로 만들지 않고 기존 걸 재사용.
- **트레일 라인(2026-09-08 수정)**: 원래 라이트는 코랄(`#E8927C`)→옐로우(`#F2C14E`) `line-gradient`였는데, "진행에 따라 노란색으로 바뀌는 게 어색하다"는 피드백으로 **양쪽 다 시작색 단색으로 고정**했다 — `trackGradient(theme)`가 `line-gradient` 표현식의 시작/끝에 같은 색(라이트 `TRACK_COLOR` `#E8927C`, 다크 `DARK_TRACK_COLOR` `#7fd6c2`)을 넣어 사실상 단색으로 그린다(표현식 자체는 유지 — `line-gradient`를 쓰려면 `line-progress` 보간이 필요해서). 다크는 그 아래에 같은 소스를 쓰는 **글로우 레이어**(폭 9~11px, opacity 0.18~0.22, 같은 민트)를 한 겹 더 깔아 디자인의 "연한 글로우 + 진한 실선" 이중 stroke를 재현했다(`addTrackLayers()`가 `theme === "dark"`일 때만 글로우 레이어를 추가).
- **현재 위치 마커·핀**: `activeHeadElement()`(발자국 마커)와 pin의 사진 placeholder 배경은 순수 DOM/SVG라 `var(--wr-track-head)`/`var(--wr-track-head-icon)`/`var(--wr-card)` 같은 CSS 변수를 그대로 써서 — MapLibre 페인트 표현식과 달리 이쪽은 브라우저가 알아서 테마에 맞춰 다시 그려준다(마커를 재생성할 필요 없음). `--wr-track-head`는 트레일 단색화에 맞춰 라이트도 옐로우(`#F2C14E`)에서 트레일과 같은 코랄(`#E8927C`)로 바꿨고, 다크는 민트 + 어두운 발바닥(`#171a21`) 그대로다.
- **지도 주변 크롬**(헤더, 기간/무드 필터 칩, 로딩 오버레이, 산책 시작/종료 컨트롤, 기간 직접 설정 시트)도 다른 탭과 같은 `--wr-*` 토큰으로 교체했다. 지도 컨테이너/로딩 오버레이의 플레이스홀더 배경은 `mapStyle*.json`의 `background` 레이어 색과 맞춘 전용 토큰 `--wr-map-bg`(라이트 `#eeede1`, 다크 `#171a21`)를 쓴다 — 타일이 늦게 뜨거나 오프라인일 때도 아래 배경색이 테마와 어긋나지 않는다.
- **확인한 것**: `npm run build`/`npm run lint` 통과. **브라우저 실측은 못했다** — 다음 세션에서 ① 다크 모드 토글 후 지도 탭이 실제로 어두운 타일로 바뀌는지 ② 토글 도중 저장된 트랙/진행 중 산책 선이 사라지지 않고 다시 그려지는지 ③ 글로우 레이어가 실제로 보기 좋게 겹치는지 눈으로 확인해야 한다.
- 디자인 3c가 언급한 반투명 달·별점 오버레이는 옮기지 않았다 — 실제 벡터 지도 위에 얹을 마땅한 자리(정적 장식이라 지도가 움직이면 같이 움직여야 자연스러운데, 시간/날씨 데이터도 없어 장식 이상의 의미를 못 준다)가 애매해서 스코프에서 뺐다. 필요하면 지도 컨테이너에 고정된 절대위치 오버레이로 간단히 추가할 수 있다.

## 산책 경로 추적 (걸어온 길 점선)

지도 탭 아래쪽의 "산책 시작 → 산책 종료하고 저장" 컨트롤이 `navigator.geolocation.watchPosition`으로 위치를 모아 `walk_tracks` 한 행으로 저장한다. 로직은 `src/lib/track.ts`(순수 계산)와 `src/lib/useWalkTracker.ts`(훅)로 나뉘어 있고, 상태 소유자는 `page.tsx`다(기록과 같은 자리).

- **GPS 튐 필터** (`track.ts`): 정확도 50m 초과 측정은 버리고, 직전 점과 5m 미만이면 제자리 흔들림으로 보고 추가하지 않으며, 200m 초과 점프는 거리 합산에서 제외한다. 이걸 안 하면 실내나 신호가 나쁜 구간에서 걷지 않은 거리가 수백 m씩 더해진다.
- **"점점이 선"을 그리는 법**: MapLibre `line` 레이어에서 `line-cap: "round"` + `line-dasharray: [0.33, 3]`. 값의 출처는 Cat Paw Icon 디자인의 "오늘의 산책" 카드 — 거기서 경로를 `stroke-width:3` / `stroke-dasharray:"1 9"` / round cap으로 그리는데, **MapLibre의 dasharray 단위는 픽셀이 아니라 line-width 배수**라 3px:9px 비율을 옮기면 `[0.33, 3]`이 된다(점 지름 = line-width, 점 중심 간격 = 3.33 × line-width로 디자인과 정확히 일치). 점선 끝에는 디자인처럼 코랄 원 + 흰 발바닥 마커가 현재 위치에 붙는다(`activeHeadElement`). 저장된 트랙(`walk-tracks` 소스, opacity 0.55)과 진행 중인 산책(`walk-active-track` 소스, opacity 1·더 두꺼움) 두 레이어로 나뉜다 — 소스는 `map.once("load")`에서 빈 채로 만들어두고 데이터는 effect가 `setData`로 채운다(`styleLoaded` 이전에는 소스가 없으므로 건너뛴다).
- **새로고침 복구**: 걷는 도중 탭이 죽거나 새로고침되면 메모리 상태가 통째로 날아가므로, 진행 중인 경로를 `localStorage`(`walk_active_track`)에도 계속 쓴다. 돌아오면 "산책 이어가기"/"버리기"가 뜬다. 저장(insert)이 실패하면 경로를 지우지 않고 localStorage에 남겨 다시 종료를 누를 수 있게 한다.
- **한계**: PWA는 백그라운드에서 위치를 못 받는다 — 화면을 끄거나 앱을 완전히 나가면 그 구간은 기록되지 않는다. 실기기 검증은 아직 안 했다(아래 "아직 안 된 것").
- 기간 필터(전체/1주/1개월/3개월/직접설정)는 핀과 트랙 양쪽에 같이 적용된다. 그래서 `withinPeriod`가 레코드가 아니라 ISO 문자열을 받도록 바뀌었다. 무드 필터는 트랙에 무드가 없어 핀에만 걸린다.

## 대시보드 구성 (2026-09-07 변경)

위에서부터 **이번주 걸은 거리 → 요일별 걸은 거리 → 태그 워드클라우드 → 무드 분포** 순이다. 예전의 "요일별 기록 수"(`computeWeekData`)는 제거됐다.

- **요일별 그래프의 범위가 바뀌었다**: 예전 기록 수 그래프는 *전체 기간*을 요일로 뭉갠 값이었는데, 거리 그래프는 *이번 주*(월~일)만 본다. 바로 위 "이번주 걸은 거리" 카드와 범위를 맞춰 막대의 합이 카드 값과 정확히 일치하게 하려는 것 — 두 카드가 다른 기간을 보면 나란히 놓았을 때 읽는 사람이 헷갈린다.
- 주의 시작은 월요일 00:00 로컬(`startOfThisWeek`), `WEEK_ORDER`가 월요일부터인 것과 맞춘 것.
- **막대 위 숫자는 km 값만 쓰고 단위는 제목("요일별 걸은 거리 (km)")에 뒀다.** 7칸을 나눠 쓰면 390px 아이폰에서 한 칸이 35.7px인데 `formatDistance`가 내는 "1.23km"가 약 35.4px라 딱 붙고, 360px 갤럭시(31.4px)에서는 겹친다. `(m/1000).toFixed(1)`이면 최대 "12.3"(약 24px)이라 항상 들어간다.
- 거리 카드 두 개는 **사진 기록이 0개여도 보여준다** — 트랙과 사진 기록은 별개로 쌓이므로 사진 없이 걷기만 한 주에도 거리는 나와야 한다. 태그/무드 카드만 `records.length === 0`일 때 빈 상태로 대체된다.

## 스크롤 컨테이너 하나를 4개 탭이 공유한다

`page.tsx`의 `<main ref={scrollRef}>` **하나**가 피드/지도/대시보드/내정보의 스크롤을 전부 맡는다(탭을 갈아끼워도 엘리먼트는 그대로). 여기에 붙은 것이 셋이다 — 커스텀 스크롤바 썸, **"맨 위로" 버튼**(피드에서만 `display:flex`, `scrollTop > 500`일 때 opacity/transform으로 나타남), 그리고 탭 전환 시 `scrollTo({top:0})`.

마지막 리셋이 꼭 필요하다: 컨테이너가 공유되므로 긴 피드에서 짧은 탭으로 옮기면 **브라우저가 scrollTop을 알아서 잘라버리고**, 그러면 앱이 들고 있는 `showScrollTop`이 실제 위치와 어긋나 피드로 돌아왔을 때 맨 위인데도 버튼이 떠 있게 된다. 리셋은 이벤트 핸들러(`TabBar`의 `onSelect`) 안에서 한다 — effect에서 하면 `react-hooks/set-state-in-effect`에 걸린다.

## 온보딩/로그인 순서

PRD 5.1(스플래시 → 온보딩 최초 1회 → 로그인)을 그대로 따른다. `산책기록.dc.html`은 온보딩 다음 바로 앱으로 넘어가고 로그인 화면 자체는 목업에 없었다(Claude Design 대화도 로그인 UI는 다루지 않음) — `src/components/AuthScreen.tsx`는 같은 색/폰트 토큰으로 이 프로젝트가 새로 디자인한 화면이다. 로그인 전 온보딩 시청 여부는 `localStorage`(`walk_onboarding_seen`)에 임시 저장했다가 로그인 성공 시 `walk_profiles.onboarding_seen`으로 동기화(PRD 5.1의 명시적 지시).

**구글 로그인이 기본 수단이 됐다**(`supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } })`). 이메일/비밀번호는 아래에 구분선과 함께 보조 수단으로 남아 있다.

- **리다이렉트 방식이라 `AuthScreen`의 `onAuthed` 콜백이 실행될 기회가 없다.** 구글에서 돌아오면 페이지가 새로 로드되고, `page.tsx`의 `onAuthStateChange`가 `SIGNED_IN`을 받는 그 시점에 프로필 upsert + `loadRecords`/`loadTracks` + `setStage("app")`을 직접 한다. 그 안에서 다른 supabase 호출을 곧바로 하면 supabase-js 내부 락 때문에 멈출 수 있어서 `setTimeout(..., 0)`으로 한 틱 미뤘다(공식 문서의 경고).
- **`redirectTo`를 `window.location.origin`으로 명시**해야 로컬(3000)과 배포 도메인에서 같은 코드가 돈다. Supabase 대시보드의 Authentication → URL Configuration → Redirect URLs에 두 주소가 모두 등록돼 있어야 한다.
- **사용자가 직접 해야 하는 설정(Supabase MCP 도구셋에 auth provider를 켜는 도구가 없다 — Edge Function 시크릿과 같은 상황)**: ① Google Cloud Console에서 OAuth 2.0 클라이언트 ID 발급, 승인된 리디렉션 URI에 `https://srhnwzcnimadmoyfukwd.supabase.co/auth/v1/callback` 등록 → ② Supabase 대시보드 Authentication → Providers → Google 활성화 후 클라이언트 ID/시크릿 입력 → ③ URL Configuration의 Redirect URLs에 배포 도메인과 `http://localhost:3000` 추가.
- **현재 상태: 켜져 있다.** 사용자가 2026-09-07에 직접 설정을 마쳤고, `curl "$URL/auth/v1/authorize?provider=google"`가 302로 `accounts.google.com/o/oauth2/v2/auth?client_id=983372861498-...`로 리다이렉트하는 것을 확인했다(그 전에는 400 `provider is not enabled`였다). `AuthScreen.tsx`는 그 400 메시지를 "구글 로그인이 아직 설정되지 않았어요"로 번역하는 폴백을 여전히 갖고 있다 — provider가 다시 꺼져도 앱이 깨지지 않게.

## 확인한 것

- `npm run build` / `npm run lint` 통과 (TypeScript strict, ESLint 0 errors — `prd/**`는 Claude Design 원본 소스라 lint 대상에서 제외).
- Supabase REST를 직접 호출해 실제 유저(`signup` → JWT)로 `walk_profiles`/`walk_records` insert·select 확인, **RLS가 실제로 타인 접근을 막는 것**(무토큰 조회 시 빈 배열)까지 확인. Storage도 본인 경로 업로드는 성공, 남의 경로 업로드는 403으로 막히는 것 확인, 서명 URL 발급도 확인.
- `gemini-vision` Edge Function을 실제 유저 JWT로 호출해 mock 응답(`(mock)` 접미사) 정상 수신 확인.
- **`npm run dev` + 실제 Chrome 브라우저 자동화로 골든 패스 전체를 실행**: 스플래시 → 온보딩 3장(건너뛰기/다음/시작하기) → 회원가입(Supabase Auth 실호출) → 4탭(피드/지도/대시보드/내정보) 렌더링 → FAB로 캡처 시트 열기 → 갤러리에서 실제 파일 업로드 → (지오로케이션은 자동화 브라우저에 위치 권한이 없어 최초 시도는 8초 타임아웃 후 토스트+`choose` 화면으로 정상 복귀하는 것까지 확인 — GPS 실패 시 앱이 멈추지 않고 우아하게 처리됨을 검증) → 위치를 모킹해 재시도 → `gemini-vision` mock 응답 수신 → 결과 화면(`(mock)` 캡션/태그/무드) → 저장 → **Storage 업로드 + `walk_records` insert 실제 성공** → 피드에 새 카드로 반영 → 지도 핀 · 대시보드 태그클라우드/요일막대/무드도넛까지 전부 실데이터로 정확히 반영되는 것을 확인. 테스트로 만든 계정/행/파일은 전부 정리(cascade delete)했다.
- **이 브라우저 검증에서 실제 버그 하나 발견·수정**: `AuthScreen.tsx`가 `const fn = mode==='login' ? supabase.auth.signInWithPassword : supabase.auth.signUp; await fn(...)`처럼 메서드를 변수로 분리해서 호출하고 있었는데, 이러면 `this` 바인딩이 깨져 supabase-js 내부에서 `Cannot read properties of undefined (reading 'storage')`로 즉시 실패했다(회원가입 버튼이 "처리 중..."에서 영원히 멈춤). `mode`에 따라 두 갈래로 직접 호출하도록 고쳐서 해결 — 콘솔에서 실제로 예외를 잡아서 재현·수정까지 한 것이라 실사용 검증의 가치가 컸다.
- **`GEMINI_API_KEY`가 실제로 등록되어 실제 Gemini 응답 경로가 라이브다.** 사용자가 직접 키를 등록해 캡션에 더 이상 `(mock)`이 붙지 않는 실제 AI 응답(예: "길가 작은 화단 구석에서 수줍게 피어난 분홍빛 꽃송이들")으로 저장된 기록을 프로덕션에서 확인했다 — Edge Function 절의 "mock 상태" 서술은 이제 지나간 얘기다.
- 지도를 실지도로 바꾼 뒤 실제로 겪은 버그 3개(서비스워커 캐시, 캔버스 리사이즈, MapLibre v6 워커 행)와 각각의 수정은 위 "지도 → 배포 후 실제로 겪은 버그 3개" 절 참고.
- **Clay 스타일 디자인(`산책기록 (Clay 스타일).dc.html`) 적용 및 누락분 보완**: 초기 구현은 같은 팔레트를 쓰면서도 스플래시/온보딩/피드 헤더의 radial-gradient 배경, 버튼·아바타·FAB의 코랄 그라디언트, 발가락 3개짜리 탭바 아이콘을 놓치고 있었다 — Clay dc.html과 다시 대조해 `globals.css`/`Splash.tsx`/`Onboarding.tsx`/`TabBar.tsx`/`ProfileTab.tsx`/`CaptureSheet.tsx`에 반영했다. 그리고 dc.html의 `showFeedDetail` 모달(피드 카드 클릭 시 사진 중심의 상세 팝업)이 아예 구현되지 않아 카드에 onClick 자체가 없었다 — `FeedDetailModal.tsx`를 새로 만들어 연결했다. 둘 다 Supabase에 임시 계정/기록을 만들어 브라우저로 실제 클릭→렌더까지 확인 후 테스트 데이터를 정리했다(단, 인증 세션이 이미 브라우저에 캐시된 상태에서 서버측 사용자를 먼저 지우면 Storage에 소유자 없는 고아 파일이 남는다는 것도 이번에 직접 겪었다 — 정리 순서는 항상 "클라이언트 로그아웃 → Storage 객체 삭제 → auth.users 삭제").
- **상세 모달의 사진 비율**: 처음엔 4:3 고정 박스라 세로 사진에 빈 여백이 생겼다. `naturalWidth/naturalHeight`로 실제 비율을 읽어 박스 `aspect-ratio`를 그때그때 맞추도록 고쳤다(0.55~1.8로 완만하게 clamp + `max-height:420px` 안전장치, 극단적인 비율에서도 `object-fit:cover`라 빈 공간 없이 살짝만 크롭된다). 실제로 1600×900(가로)·900×1600(세로) 테스트 이미지로 두 경우 다 빈 여백 없이 렌더되는 것을 좌표 계산으로 확인했다.
- **피드 로딩 속도 3종 개선**: (1) 업로드 전 `resizeImage()`(`lib/capture.ts`)로 캔버스 리사이즈+JPEG 재인코딩(긴 변 1600px, quality 0.82) — AI 분석과 Storage 업로드 양쪽에 재사용해 원본 수 MB짜리 카메라 사진 대신 훨씬 작은 파일이 오간다. (2) 부팅 시퀀스에서 `loadRecords()`를 온보딩 프로필 조회와 병렬로 먼저 시작하도록 바꿔(`page.tsx`의 `boot()`), 두 왕복을 순차로 기다리지 않는다. (3) `FeedTab.tsx`의 카드 `<img>`에 `loading="lazy"`/`decoding="async"` 추가.
- **프로필 사진도 부팅 시점에 미리 받아둔다(2026-09-08)**: `avatarUrl`은 `loadProfile()`에서 부팅 때 이미 계산되지만, 실제 `<img src={avatarUrl}>`는 `ProfileTab`이 마운트될 때(=사용자가 내정보 탭을 열 때)까지 렌더되지 않아 그제서야 네트워크 요청이 나갔다. `loadProfile()`에서 서명 URL을 받은 직후 `new Image().src = avatarUrl`로 브라우저 캐시에 미리 올려두도록 한 줄 추가 — 나중에 `ProfileTab`의 실제 `<img>`가 같은 URL로 그려지면 캐시 히트라 즉시 뜬다. 아바타는 400px로 리사이즈해 올리므로(`handleUpdateAvatar` 참고) 부팅 때 미리 받는 부담이 크지 않다.
- **"시간이 지나고 PWA를 다시 켜면 피드가 비어 보인다" 진단·수정(2026-09-09)**: 원인은 캐시된 데이터가 오래돼서가 아니라 **캐시 자체가 없었던 것**이었다. 기록/트랙은 오직 React state에만 있고(`useState<WalkRecord[]>([])`), `sw.js`는 Supabase 호출을 아예 캐시하지 않는다(코드에도 그렇게 적혀 있다: "Supabase 호출은 캐시하지 않는다 — 항상 네트워크로"). 그래서 모바일 OS가 백그라운드에서 PWA 프로세스를 죽였다가(흔한 동작) 사용자가 다시 열면 `boot()`가 처음부터 다시 돌면서 `loadRecords()`가 새로 나가는데, **재개 직후라 아직 네트워크가 안 붙어 있으면 이 요청이 실패**하고 — 기록 state는 fresh `[]`이므로 — 피드가 "지금 첫 기록을 남겨주세요" 빈 상태로 보인다. 실패 토스트가 2.2초 뜨긴 하지만 앱을 막 켠 순간이라 놓치기 쉽고, 재시도 버튼도 없어 사실상 새로고침 전까진 빈 화면에 머문다. `src/lib/offlineCache.ts`(새 파일)에 로그인 사용자별 `localStorage` 캐시(`walk_records_cache_<userId>`)를 추가해, `loadRecords()`가 성공할 때마다 최신 목록을 저장해두고, 실패하면 그 캐시로 폴백하도록 `page.tsx`를 고쳤다(폴백 시 토스트 문구도 "네트워크가 불안정해서 마지막으로 불러온 기록을 보여드려요"로 구분). 캐시엔 레코드 메타데이터만 들어가고 서명 URL(1시간 만료)은 안 들어가므로, 완전 오프라인 상태에서 폴백이 뜨면 텍스트/태그는 보여도 사진은 못 뜬다 — 그 정도는 허용 가능한 저하로 봤다. 트랙(`loadTracks`)에도 같은 구조적 문제가 있지만 이번 요청 범위(피드)엔 없어 손대지 않았다.
- **"이따금 프로필 사진을 못 불러온다" 진단·수정(2026-09-09)**: 위 피드 문제와는 원인이 달랐다. 아바타 서명 URL은 `loadProfile()`이 부팅 때 딱 한 번 계산해서 `profile.avatarUrl` state에 담아두는데, `ProfileTab`은 활성 탭일 때만 렌더되는 컴포넌트라 **탭을 열 때마다 `<img>`가 새로 마운트되며 그 오래된 URL로 매번 새 네트워크 요청을 건다.** 서명 URL 유효기간이 1시간(`createSignedUrl(path, 3600)`)이었어서, 앱을 1시간 넘게 켜둔 채(흔한 일 — PWA는 백그라운드에서도 살아있을 때가 많다) 내정보 탭을 다시 열면 서명이 만료돼 사진이 깨져 보였다. 두 가지로 고쳤다: ① 유효기간을 `AVATAR_SIGNED_URL_TTL`(24시간)로 늘려 한 세션 안에서 만료될 가능성을 크게 줄임(`loadProfile`/`handleUpdateAvatar` 둘 다 적용). ② 그래도 못 뜨는 경우(만료·일시적 네트워크 오류 등)를 대비해 `ProfileTab`의 아바타 `<img>`에 `onError={onAvatarError}`를 달아, 실패하면 `page.tsx`의 `refreshAvatarUrl()`이 서명을 다시 발급받아 `avatarUrl`을 갈아끼운다 — `avatarRetriedForRef`로 **같은 `avatarPath`당 세션 내 한 번만** 재시도하도록 막아뒀다(파일이 진짜 없어졌거나 접근 불가능한 경우 새 서명을 계속 발급받아 `<img>`가 무한히 재시도하는 걸 방지). 새 앱 세션(재부팅)마다 이 가드는 자연히 초기화된다.

## 아직 안 된 것

- 실제 기기 카메라로 촬영해 GPS 권한 프롬프트까지 포함한 전체 캡처 플로우의 실기기 검증(자동화 브라우저는 위치 권한 자체가 없어 GPS 성공 경로는 `getCurrentPosition`을 런타임에 모킹해서만 확인했다). 사용자가 실제 브라우저로 촬영→저장까지는 이미 여러 번 직접 확인함(피드에 실데이터 존재).
- PWA 설치(홈 화면 추가) 실기기 검증 — `manifest.json`/`sw.js`는 `day10`(물 한잔) 패턴을 그대로 따랐다. 아이콘(`public/icon.svg`, `public/icon-192.png`, `public/icon-512.png`)은 `TabBar.tsx`의 피드 탭 발자국 마크를 그대로 확대해 브랜드 컬러(`#E8927C`) 배경에 얹은 것(사용자 요청) — 실배포 전 재검토 대상.
- **확인용 샘플 산책 경로 5개가 `devtest1234@example.co.kr` 계정(`1d5fbc68-...`)에 들어 있다** — 2026-09-07에 SQL로 직접 넣은 가짜 데이터다(광화문·성북·잠실 주변 루프, 이번 주 월요일 2개 + 지난주 3개). 실제 걸어서 만든 기록이 아니므로 **확인이 끝나면 지울 것**: `delete from public.walk_tracks where user_id = '1d5fbc68-5d8a-4a7d-8ffe-4ae563e38a61';`
- **2026-09-07 변경분(아이콘 교체 · 산책 경로 추적 · 구글 로그인 · 대시보드 개편 · 이름 변경 · 맨 위로 버튼)의 브라우저 검증이 통째로 빠져 있다.** 이 세션에서는 Chrome 확장을 쓸 수 없어서, 예전 변경들과 달리 **실제 화면을 한 번도 띄워보지 못했다.** 통과한 것은 `npm run build`/`npm run lint`(타입체크 포함), Supabase REST 직접 호출, 그리고 발바닥을 22·26·512px로 실제 래스터라이즈해 눈으로 확인한 것뿐이다. 다음 세션에서 최소한 이건 봐야 한다: ① 탭바 발바닥과 지도 로딩 발자국이 실제로 새 도형으로 보이는지 ② 대시보드 두 카드의 레이아웃(특히 요일별 거리 막대 위 숫자 라벨이 좁은 화면에서 겹치지 않는지) ③ 구글 로그인 리다이렉트 왕복이 실제로 앱 화면까지 도달하는지 ④ 지도 위 산책 컨트롤이 로딩 오버레이·빈 상태 문구와 겹치지 않는지.
- 구글 로그인 리다이렉트 왕복 — provider는 켜졌지만(위 "온보딩/로그인 순서") 실제로 구글 계정으로 로그인해 `onAuthStateChange`가 앱 화면으로 넘기는 경로를 돌려보지 못했다. 특히 `SIGNED_IN` 이벤트가 스플래시 최소 1500ms를 건너뛰고 앱으로 튀는지 확인 필요.
- 산책 경로 추적의 실기기 검증 — `watchPosition` 성공 경로(실제로 걸으며 점이 쌓이고 점선이 그려지는 것)를 확인하지 못했다. `walk_tracks` insert/select와 RLS(타인 `user_id`로 insert 시 42501, 무토큰 조회 시 빈 배열)는 REST로 직접 확인했다.
- 지도 탭이 오프라인일 때의 폴백 UI(현재는 타일을 못 받으면 배경색만 보이는 빈 상태) — 위 "지도 → 트레이드오프" 참고.

## 실행

```
cd day11
npm run dev     # localhost:3000
npm run build   # 타입체크 + lint + 프로덕션 빌드
```

@AGENTS.md
