# CLAUDE.md (day4)

가게 길찾기 랜딩페이지 + 가게 상세 목업. 스펙은 `PRD.md`, 비주얼/화면 구성은 `DESIGN.md` 참고.

## Tooling — plain Node.js, not Next.js

이 폴더는 `day5/news`/`day6/dust`처럼 서비스키(카카오 REST API 키)를 서버에 숨겨야 하지만,
프레임워크 없이 **순수 Node.js 내장 `http` 모듈**만 쓴다. `package.json`도 `node_modules`도 없다 —
`day7/restaurant`가 세운 것과 같은, 저장소 루트 CLAUDE.md의 "빌드 없는 순수 코드" 기조에 맞춘
의도적인 선택이다.

- `server.js` — 정적 파일(`index.html`, `place.html`) 서빙 + `/api/day4/places`에서 카카오
  로컬 검색(키워드) API를 프록시.
- 실행: `node server.js` (기본 포트 3400; `PORT=3500 node server.js`처럼 바꿀 수 있음).
- `index.html`/`place.html`은 둘 다 Tailwind CDN(`cdn.tailwindcss.com`) + Pretendard 웹폰트를
  쓴다 — day7/restaurant와 마찬가지로 이 저장소의 "번들러 없음" 원칙과는 별개로, 두 파일 모두
  로컬 자산 없이 자체 완결(self-contained)되어 있어 서버는 이 두 파일만 화이트리스트로 서빙하면
  된다.

## 왜 서버가 필요한가

카카오 로컬 검색(키워드) API(`https://dapi.kakao.com/v2/local/search/keyword.json`)는
`Authorization: KakaoAK {REST_API_KEY}` 헤더가 필요하고 브라우저에서 직접 호출할 수 있는 CORS를
지원하지 않는다. 키를 클라이언트에 노출하지 않으면서 호출하려면 서버를 거쳐야 한다 — day7/restaurant가
`api.kcisa.kr`에 대해 쓴 것과 같은 이유다.

## 카카오맵 JS SDK — REST 키와는 완전히 다른 보안 모델

`place.html`의 "정확한 입구 핀" 지도(표시용·핀 찍기용 둘 다)는 카카오맵 **JS SDK**로 띄운다 —
`KAKAO_REST_API_KEY`(카카오 로컬 검색용)와는 **다른 키**이고, 다루는 방식도 정반대다.

- **JS 키는 비밀값이 아니다.** `place.html`에 `<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=...">`로
  그대로 하드코딩돼 있다 — REST 키처럼 서버 뒤에 숨기지 않는다. 대신 카카오 디벨로퍼스
  콘솔에 **등록된 도메인에서 온 요청만 허용**하는 방식으로 보안을 건다(요청 Referer/Origin을
  검사). 등록 안 된 도메인에서 부르면 SDK 자체가 401
  `{"errorType":"AccessDeniedError","message":"domain mismatched! ..."}`로 거부된다 —
  콘솔에 도메인을 안 넣었을 때 실제로 이 오류를 확인했다.
- **로컬·배포 도메인을 각각 등록해야 한다**: 카카오 디벨로퍼스 콘솔 → 해당 앱 → 앱 설정 →
  플랫폼 → Web 플랫폼 등록에 로컬(`http://localhost:3400`, 포트를 바꿨으면 그 포트로)과
  Vercel 배포 도메인을 모두 넣어야 두 환경 다 지도가 뜬다. 하나만 등록하면 등록 안 한
  쪽에서만 실패한다.
- **`autoload=false` + `kakao.maps.load(callback)` 패턴**을 쓴다 — SDK 스크립트가 로드되자마자
  자동으로 지도 모듈을 초기화하지 않고, `initPlacePage()` 안에서 명시적으로
  `kakao.maps.load(...)`를 호출한 뒤 그 콜백 안에서 지도를 만든다.
- **지도 두 개(`#pin-map`, `#pin-picker`) 모두 `draggable: false, zoomable: false`로 뷰를
  고정한다.** 핀 마커는 실제 `kakao.maps.Marker`가 아니라 예전부터 쓰던 방식 그대로
  `left`/`top` % 기반 CSS 오버레이 `<div>`다 — 지도를 움직이거나 확대할 수 있게 하면 이
  오버레이가 실제 지도 위치와 어긋나 보인다. 이 두 지도를 "진짜 인터랙티브 지도"로
  업그레이드하려면(패닝·줌 가능) 핀 저장 방식 자체를 %좌표에서 실제 위도/경도로 바꾸고
  진짜 마커를 쓰는 별도 작업이 필요하다 — 지금은 하지 않았다.
- **두 지도의 CSS 오버레이 마커는 같은 디자인을 쓴다**: 원형 배경 없이 끝이 뾰족한
  물방울(핀) 모양 SVG 하나만 CTA 앰버(`#E8A33D`) 채우기 + 진한 외곽선(`#1F2A24`)으로
  그린다. 이전에는 원형 배경(`rounded-full bg-terra`) 안에 작은 핀 아이콘을 넣는
  형태였는데, 그 원이 실제로는 넓은 면적처럼 보여 `#pin-picker`에서 정확한 지점을
  찍기 어렵다는 피드백을 받아 두 지도 모두 다시 그렸다. SVG의 뾰족한 끝점이 곧 좌표가
  되도록 `viewBox`와 anchor(`-translate-x-1/2 -translate-y-full`)를 맞췄다. 클래스명은
  여전히 다르다(`#pin-map`은 `.pin-marker`, `#pin-picker`는 `.pin-picker-marker`) —
  `updatePinMapDefaultMarker()`가 `.pin-marker`의 유무로 "등록된 핀이 있는지"를
  판단하므로 이 구분은 유지해야 한다(마크업이 겹칠 일은 없지만, 이름을 합치면 그
  판단 로직이 헷갈리기 쉽다).
- **`#pin-map`(표시용 지도)은 딱 하나만 예외적으로 진짜 `kakao.maps.Marker`를 쓴다** — 사용자
  제보 핀이 하나도 없을 때(`renderPin`의 `pinned.length === 0`) 이 가게 좌표에 카카오 기본
  마커를 잠깐 띄워서 지도가 완전히 비어 보이지 않게 한다. `updatePinMapDefaultMarker()`가
  이 로직을 담당하며, 지도 초기화(`kakao.maps.load` 콜백)와 `renderPin()` 호출 양쪽 모두에서
  불려서 어느 쪽이 먼저 끝나든(순서 보장 안 됨) 안전하게 동기화된다 — DOM에 `.pin-marker`
  CSS 오버레이가 있는지를 직접 확인해서 있으면 기본 마커를 지우고, 없으면 띄운다. 첫
  사용자 핀이 등록되면(같은 세션에서 폼 제출 후 `loadEntries()` 재호출 포함) 자동으로
  기본 마커가 사라진다. `#pin-picker`(핀 찍기 입력용 지도)에는 이 기본 마커를 넣지 않았다 —
  "여기를 클릭해서 핀을 표시하세요" 안내 문구가 이미 그 역할을 한다.
- 이 기능은 순수 클라이언트 사이드라 서버 쪽 코드(`server.js`, `api/day4/*.js`)는 전혀
  건드리지 않았다 — `/api/day4/place-reviews`의 "150m 강제 반경" 로직(구글 Places용)과는
  무관한 완전히 별개 기능이다.

## Vercel 배포 — `api/day4/*.js`는 `server.js`의 별도 사본이다

Vercel은 `server.js` 같은 상시 실행 Node 서버를 실행하지 않는다 — `/api` 디렉터리 밑의 파일
하나당 서버리스 함수 하나로만 배포한다. 그래서 저장소 **루트**의 `api/day4/`에 세 파일
(`places.js`, `place-reviews.js`, `place-review-analysis.js`)이 있는데, 각각 `server.js`의
`handlePlacesApi`/`handlePlaceReviewsApi`/`handlePlaceReviewAnalysisApi`와 **로직이 동일한
별도 복사본**이다(하나를 고치면 다른 하나는 자동으로 안 바뀐다 — 두 곳 다 손으로 고쳐야
한다). 공유 모듈로 묶지 않고 의도적으로 복제한 이유: `server.js`는 Node의 `http`
IncomingMessage/ServerResponse를 직접 다루고(`query.get(...)`, `readJsonBody`,
`res.writeHead`), Vercel 함수는 `req.query`(이미 파싱된 일반 객체)·`req.body`(JSON이면 이미
파싱됨)·`res.status(code).json(body)`라는 다른 인터페이스를 쓴다 — 두 세계를 하나의 함수로
추상화하는 것보다, 각자 자기 런타임에 맞는 얇은 버전을 유지하는 쪽이 이 정도 규모에서는
더 안전하고 읽기 쉽다고 판단했다.

- **로컬(`node server.js`)과 Vercel 배포본이 완전히 같은 경로(`/api/day4/places` 등)를
  쓴다** — `index.html`/`place.html`의 fetch 코드는 환경 분기 없이 그대로 양쪽에서 동작한다.
- **`/api/day4/place-info`, `/api/day4/place-info-helpful`도 다른 세 엔드포인트와 같은
  방식으로 미러링된다.** 예전에는 파일 기반 저장소(`day4/data/place-info.json`)를 써서
  Vercel 서버리스(요청마다 다른 컨테이너, 재배포 시 파일시스템 초기화)에서 동작할 수 없어
  이 미러링에서 제외돼 있었지만, Supabase Postgres로 옮기면서 그 제약이 사라졌다 — 자세한
  내용은 "`/api/day4/place-info` 계약" 절 참고. 파일에 저장하지 않으므로
  `day4/data/place-info.json`은 더 이상 쓰이지 않는다.
- **Vercel 프로젝트의 Environment Variables**(대시보드 → Settings → Environment
  Variables)에 `KAKAO_REST_API_KEY`·`GOOGLE_PLACES_API_KEY`·`GEMINI_API_KEY`·`GEMINI_MODEL`·
  `SUPABASE_URL`·`SUPABASE_ANON_KEY` 여섯 개를 등록해야 배포본에서 실제로 동작한다 —
  `.env.local`은 로컬 전용이라 배포에 자동으로 반영되지 않는다. **카카오맵 JS 키와
  `auth.js`에 박힌 Supabase URL/anon 키는 여기 포함되지 않는다** — 셋 다 비밀값이 아니라
  각각 `place.html`/`auth.js`에 하드코딩돼 있어서 환경변수 등록이 필요 없다(다만
  `server.js`와 `api/day4/place-info*.js`는 이 값들을 `process.env`로 읽으므로, 그
  두 곳이 동작하려면 위 목록의 `SUPABASE_URL`/`SUPABASE_ANON_KEY` 등록은 여전히
  필요하다). 카카오맵 JS 키는 대신 카카오 디벨로퍼스 콘솔에 Vercel 배포 도메인을
  등록해야 한다("카카오맵 JS SDK" 절 참고).
- `thinkingConfig: { thinkingBudget: 512 }`는 `api/day4/place-review-analysis.js`에도
  그대로 있어야 한다 — 이게 없으면 응답이 최대 35초까지 걸릴 수 있는데, Vercel 서버리스
  함수는 플랜에 따라 실행 시간 제한이 있어 더 위험하다.
- 저장소 루트에 `package.json`을 추가하지 않았다 — `api/day4/*.js`는 CommonJS(`require`/
  `module.exports`)만 쓰므로 없어도 Vercel의 zero-config Node 빌더가 인식한다. 나중에
  빌드 로그에서 인식 실패가 뜨면 최소한의 `package.json`을 추가하는 걸 첫 번째로 의심할 것.

## 서비스키

- `.env.local`에 `KAKAO_REST_API_KEY=...`, `GOOGLE_PLACES_API_KEY=...`, `GEMINI_API_KEY=...`
  (셋 다 gitignore 처리됨, 커밋 금지). `.env.example`이 형식과 발급처(카카오는 카카오
  디벨로퍼스 콘솔, https://developers.kakao.com > 내 애플리케이션 > 앱 키 > REST API 키;
  구글 Places는 구글 클라우드 콘솔, https://console.cloud.google.com > API 및 서비스 >
  사용자 인증 정보 — 반드시 **"Places API (New)"**를 사용 설정해야 하며, 레거시 Places
  API만 켜져 있으면 `places:searchText` 호출이 403으로 실패한다; 제미나이는 구글 AI
  Studio, https://aistudio.google.com/apikey)를 보여준다.
- `GEMINI_MODEL`도 `.env.local`/`.env.example`에 있지만 **비밀값이 아니다** — 기본값
  `gemini-3.6-flash`가 `.env.example`에 실제로 채워져 있고, 구글이 모델 라인업을 자주
  바꾸므로 AI Studio에서 현재 모델명을 확인해 다르면 `.env.local`에서 한 줄로 덮어쓰면
  된다(코드 수정 불필요).
- `SUPABASE_URL`/`SUPABASE_ANON_KEY`(publishable 키)도 **비밀값이 아니다** — 카카오맵 JS
  키와 같은 성격이라 `.env.example`에 실제 값이 채워져 있다. `server.js`와
  `api/day4/place-info*.js`가 이 값들로 Supabase PostgREST를 호출해 `place_info_entries`
  테이블을 읽고 쓴다(자세한 내용은 "`/api/day4/place-info` 계약" 절). 같은 URL/키가
  `day4/auth.js`에도 상수로 박혀 있다(로그인용 Supabase 클라이언트) — 값이 바뀌면 두
  곳(`.env.local`과 `auth.js`) 다 고쳐야 한다.
- `server.js`가 시작 시 `process.loadEnvFile('.env.local')`로 읽는다(Node 20.6+ 내장 API, 별도
  dotenv 불필요).
- **키가 없거나 `TODO_...` placeholder면 "키 없음"과 동일하게 취급한다.** 세 키 모두 이 규칙을
  따른다 — 업스트림 호출을 아예 시도하지 않고, 각각 `/api/day4/places`·`/api/day4/place-reviews`·
  `/api/day4/place-review-analysis`가 `{ error: "SERVER_NOT_CONFIGURED", message: "..." }`를
  500으로 반환한다. 실제 키를 발급받으면 `.env.local`의 값만 교체하면 된다.

## `/api/day4/places` 계약

- `GET /api/day4/places?query=검색어` — `query`가 비어 있으면 400 `MISSING_QUERY`.
- 카카오 응답(`documents` 배열)을 프론트가 쓰기 쉬운 최소 형태로 재구성해 `{ places: [...] }`로
  반환한다. 각 place는 `name`(`place_name`) · `category`(`category_name`의 마지막 세그먼트,
  예: "카페") · `address`(`road_address_name` 우선, 없으면 `address_name`) · `phone` ·
  `lat`/`lng`(`y`/`x`, 문자열 그대로) · `url`(`place_url`).
- 업스트림 오류(401/429/5xx/네트워크 실패)는 `day5/news`, `day7/restaurant`와 같은 원칙으로 닫힌
  오류 코드 집합(`UPSTREAM_AUTH_ERROR`/`UPSTREAM_RATE_LIMITED`/`UPSTREAM_ERROR`/
  `UPSTREAM_UNAVAILABLE`)에 매핑한다 — 원본 응답 본문·상태 텍스트·키는 클라이언트나 로그에
  절대 노출하지 않는다.

## `/api/day4/place-reviews` 계약

가게 이름·좌표로 구글 지도에서 그 가게를 찾아 평점·리뷰를 가져오는, 서버 쪽 영속 저장이
없는 프록시다(캐싱은 `place.html`의 `localStorage`에서만 한다). 반드시 **Places API
(New)**의 `POST https://places.googleapis.com/v1/places:searchText`를 쓴다(레거시 Places
API 아님).

- `GET /api/day4/place-reviews?name=가게이름&lat=위도&lng=경도` — `name`이 비어 있으면 400
  `MISSING_NAME`, `lat`/`lng`가 유한수가 아니면 400 `MISSING_COORDS`.
- 요청 필드마스크(`X-Goog-FieldMask`)는 정확히 5개로 고정:
  `places.displayName,places.rating,places.userRatingCount,places.reviews,places.googleMapsUri`.
  과금 등급에 영향을 주므로 임의로 필드를 추가하지 않는다.
- 좌표 기준 150m(도보 약 2분) **강제** 반경 필터를 건다. `locationRestriction`은
  `rectangle`만 지원하고 `circle`은 지원하지 않으므로(circle은 단순 "선호"인
  `locationBias`에서만 가능), 서버가 좌표를 중심으로 한 정사각형 바운딩 박스를 계산해
  `locationRestriction.rectangle`로 보낸다 — `circle`로 "단순화"하면 요청 자체가 유효하지
  않게 되니 되돌리지 말 것.
- 구글에서 매칭되는 가게를 못 찾으면 오류가 아니라 200과 함께 `{ found: false }`를
  반환한다. 찾으면 `{ found: true, place: { name, rating, reviewCount, mapUrl, reviews:
  [{ author, rating, relativeTime, text }, ...] } }`을 반환한다 — 구글의 원본 응답 형태를
  그대로 넘기지 않고 재구성한다.
- 업스트림 오류(401/403/429/5xx/네트워크 실패)는 `/api/day4/places`와 같은 원칙으로 닫힌 오류
  코드 집합(`UPSTREAM_AUTH_ERROR`/`UPSTREAM_RATE_LIMITED`/`UPSTREAM_ERROR`/
  `UPSTREAM_UNAVAILABLE`)에 매핑한다. 구글은 401뿐 아니라 403(권한 부족·API 미사용 설정)도
  인증 오류로 쓰므로 둘 다 `UPSTREAM_AUTH_ERROR`로 매핑한다 — 원본 응답 본문·상태 텍스트·키는
  클라이언트나 로그에 절대 노출하지 않는다.
- **로그인을 요구하지 않는다.** 조회는 누구나 할 수 있고, 서버는 조회 결과를 저장하지 않는다
  (매 요청마다 구글을 호출) — 클라이언트가 `localStorage`에 만료 없이 캐싱해 같은 가게를
  다시 조회할 때 네트워크 호출 없이 즉시 보여준다.

## `/api/day4/place-review-analysis` 계약

`/api/day4/place-reviews`가 이미 가져온 리뷰 텍스트를 받아 제미나이(**`generateContent`**,
`POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`)로
감정 분류·핵심 키워드·한 줄 요약을 만든다. 구글 Places를 다시 호출하지 않는다. 서버 쪽
영속 저장은 없다(캐싱은 `place.html`의 `localStorage`에서만 한다).

- 제미나이는 구글 Places와 달리 API 키를 헤더가 아니라 **쿼리 파라미터**(`?key=...`)로
  받는다 — 다른 두 엔드포인트와 통일하겠다고 헤더로 바꾸면 인증이 깨진다.
- 요청은 `responseMimeType: "application/json"` + `responseSchema`로 구조화 출력을
  강제한다. `type` 필드는 대문자 열거형(`OBJECT`/`STRING`/`INTEGER`/`ARRAY`)을 쓴다. 생성된
  JSON은 `candidates[0].content.parts[0].text`에 **문자열**로 들어있어 한 번 더
  `JSON.parse`가 필요하다.
- **`thinkingConfig.thinkingBudget: 512`를 반드시 유지할 것.** 이 값이 없으면(모델 기본
  동작) 같은 요청도 9초~35초까지 편차가 크게 튀는 걸 실측으로 확인했다 — 이 작업은 정해진
  스키마로 사실을 추출/집계하는 정도라 깊은 추론이 필요 없고, budget을 낮게 고정하면 응답
  품질 저하 없이 2~5초로 안정된다. 이 상수를 지우거나 "더 똑똑하게 만들자"며 늘리면 다시
  타임아웃이 잦아진다.
- `POST /api/day4/place-review-analysis` — 본문 `{ name, reviews: [{ rating, text }, ...] }`.
  `name` 없으면 400 `MISSING_NAME`, `reviews`가 배열이 아니면 400 `INVALID_REVIEWS`, 빈
  배열이면 400 `EMPTY_REVIEWS`(클라이언트는 리뷰 0개일 때 이 엔드포인트를 아예 호출하지
  않지만, 외부에서 직접 호출될 수도 있어 서버도 막는다).
- 서버는 클라이언트가 보낸 리뷰를 그대로 믿지 않고 방어적으로 자른다(최대 30개, 각
  `text` 최대 1000자) — 이 엔드포인트는 임의 텍스트를 가장 비싼 업스트림(LLM)에 그대로
  넘기는 유일한 엔드포인트라 다른 두 곳보다 남용 벡터가 크다. 이 서버는 인증도
  레이트리밋도 없으므로, 근본적인 남용 방지는 안 되고 완화만 된다는 점을 알아둘 것.
- 성공 시 `{ sentiment: { positive, neutral, negative }, keywords: [{ word, score, sentiment:
  "good"|"bad" }, ...], summary }`를 200으로 반환한다. `keywords`는 8~15개를 요청하지만
  강제는 아니다(구글 Places가 가게당 리뷰를 최대 5개까지만 주므로, 리뷰가 적으면 8개 미만도
  정상 — UI는 온 만큼만 그린다). `sentiment`의 세 숫자 합이 `reviews.length`와 다를 수 있고,
  검증 없이 그대로 신뢰해서 그린다.
- 업스트림 오류는 `/api/day4/place-reviews`와 같은 닫힌 오류 코드 집합을 쓴다
  (`UPSTREAM_AUTH_ERROR`/`UPSTREAM_RATE_LIMITED`/`UPSTREAM_ERROR`/`UPSTREAM_UNAVAILABLE`).
  **추가로 이 엔드포인트만의 `ANALYSIS_UNPARSEABLE`**(502)이 있다 — 업스트림 응답은 200인데
  구조화 출력이 안전 필터에 걸렸거나 형태가 깨져 파싱에 실패한 경우로, 서버가 생성물을
  직접 파싱해야 하는 이 엔드포인트만 가질 수 있는 실패 유형이라 다른 두 프록시에는 없는
  코드를 새로 추가했다.
- **로그인을 요구하지 않는다.** 서버 쪽 영속 저장이 없어 어차피 "누가 요청했는지"를 남길
  이유도 없다.

## `/api/day4/place-info` 계약

가게 하나에 대해 여러 사용자가 각자 남긴 사진·설명·정밀 핀·"도움이 됐어요"를 누적 저장하는
저장소다. Supabase Postgres의 `place_info_entries` 테이블에 저장한다(전에는
`day4/data/place-info.json` 파일 기반이었으나, Vercel 서버리스가 파일시스템을 유지하지
않아 배포본에서 못 썼던 문제를 해결하려고 옮겼다 — 이제 다른 세 엔드포인트와 같은
`/day4/` 접두사를 쓰고 Vercel에도 정상 배포된다). `server.js`와 `api/day4/place-info.js`/
`api/day4/place-info-helpful.js`/`api/day4/place-info-delete.js`가 `fetch()`로 Supabase
PostgREST(`{SUPABASE_URL}/rest/v1/...`)를
직접 호출한다 — SDK 설치 없이 카카오/구글/제미나이 프록시와 같은 패턴이다. `server.js`/
Vercel 함수 모두 **anon(publishable) 키만 쓴다** — service role 키는 쓰지 않는다(RLS의
public select/insert 정책이 서버가 필요로 하는 권한과 정확히 같다). `place.html`이 이 API를
호출하는 유일한 클라이언트다.

- `GET /api/day4/place-info?id=가게id` — `id`가 비어 있으면 400 `MISSING_ID`. 응답은
  `{ entries: [...] }`이며 각 entry는 `created_at` 내림차순(최신 먼저)으로 정렬되어 있다.
  entry 형태(DB의 snake_case를 서버가 camelCase로 재구성): `{ id, author, text, photoUrl,
  pinX, pinY, helpfulCount, createdAt }`. `id`는 이제 uuid 문자열이다(예전 base36 짧은
  id 아님). `pinX`/`pinY`는 핀을 남기지 않았으면 `null`이다.
- `POST /api/day4/place-info` — 본문 `{ placeId, author, text, photoUrl, pinX, pinY }`.
  `placeId` 누락 시 400 `MISSING_PLACE_ID`, `text` 누락 시 400 `MISSING_TEXT`, `text`가
  500자 초과면 400 `TEXT_TOO_LONG`. `photoUrl`은 값이 있으면 `http(s)://`로 시작해야
  하며(아니면 400 `INVALID_PHOTO_URL`), 500자를 넘으면 400 `PHOTO_URL_TOO_LONG`.
  `author`가 비어 있으면 서버가 "익명"으로 채우고, 30자로 잘린다. `pinX`/`pinY`는 0~100
  범위의 유한수일 때만 저장되고, 그 외에는 `null`로 저장된다. 이 유효성 검증은 모두
  애플리케이션 코드에만 있다(DB 제약으로 옮기지 않음). 성공 시 201과 함께 생성된
  `{ entry }`를 반환한다.
- `POST /api/day4/place-info-helpful` — 본문 `{ placeId, entryId }`. 둘 중 하나라도
  없으면 400 `MISSING_FIELDS`(`placeId`는 검증에만 쓰이고 실제 조회는 `entryId`만으로
  한다 — 요청 계약을 예전과 동일하게 유지하려고 남겨뒀다). Postgres 함수
  `increment_place_info_helpful(p_entry_id uuid)`를 `POST .../rpc/increment_place_info_helpful`로
  호출해 `helpful_count`를 원자적으로 1 증가시킨다(예전 파일 기반 구현의 읽기→+1→쓰기
  경쟁 조건이 없어짐). 해당 `entryId`를 찾지 못하면(RPC가 `null` 반환) 404
  `ENTRY_NOT_FOUND`. 성공 시 200과 함께 증가된 `{ helpfulCount }`를 반환한다.
- `POST /api/day4/place-info-delete` — 본문 `{ placeId, entryId }`(helpful과 같은 이유로
  `placeId`는 검증에만 쓰이고 실제 삭제는 `entryId`만으로 한다). Postgres 함수
  `delete_place_info_entry(p_entry_id uuid)`를 `POST .../rpc/delete_place_info_entry`로
  호출해 해당 row를 지우고, 실제로 지워진 게 있으면 `true`/없으면 `false`를 반환한다.
  `false`면 404 `ENTRY_NOT_FOUND`, 그 외엔 200과 함께 `{ deleted: true }`.
  **`entryId`가 이 브라우저가 등록한 것인지 서버는 검증하지 않는다** — helpful 증가와
  똑같은 신뢰 모델이다(로그인이 없어 "누구 것인지" 자체를 서버가 판단할 방법이 없다).
  유효한 `entryId`라면 원칙적으로 누구든 지울 수 있다. `place.html`은 자신이 방금
  등록에 성공해 응답으로 받은 `entryId`만 `localStorage`(`place-info-mine:{entryId}`)에
  남겨두고, 그 항목에만 "삭제" 버튼을 보여주는 방식으로 UX 차원에서만 삭제 가능
  범위를 제한한다 — 실제 서버 쪽 소유권 검증이 아니라는 점을 잊지 말 것. 삭제 확인은
  `window.confirm`을 쓰지 않고(day2/day8과 같은 이유 — 샌드박스 환경에서 네이티브
  다이얼로그가 막히면 화면이 멈춘 것처럼 보인다) 버튼 영역을 "정말 삭제할까요?
  [삭제] [취소]" 상태로 바꾸는 인라인 2단계 확인을 쓴다.
- **등록에 로그인을 요구하지 않는다(익명 허용) — DB 마이그레이션 이후에도 그대로다.**
  PRD.md §5.2/§5.5는 위치 정보 추가와 "도움이 됐어요" 모두 로그인을 요구하지만, 이 구현은
  로그인 게이트 없이 두 행위를 모두 허용하는 의도적인 MVP 이탈이다 — 자세한 설명은
  `DESIGN.md` §6.12 참고. PRD.md 자체는 수정하지 않았다. `place_info_entries.user_id`
  컬럼은 nullable로 미리 마련만 해뒀고(지금은 항상 `null`), 로그인 게이트를 실제로 걸 때
  채우면 된다.
- **테이블 스키마**: `place_info_entries(id uuid pk default gen_random_uuid(), place_id text,
  author text default '익명', text text, photo_url text default '', pin_x numeric,
  pin_y numeric, helpful_count integer default 0, created_at timestamptz default now(),
  user_id uuid references auth.users)`. `place_id`에 인덱스. RLS 활성화, `select`/`insert`
  정책은 `anon`/`authenticated` 모두 허용(`using (true)` / `with check (true)`) — 지금의
  "로그인 없이 등록 가능" 규칙을 DB 레벨에서도 그대로 반영한다. `update`/`delete` 정책은
  없음(막힘) — helpful 증가와 항목 삭제는 각각 `increment_place_info_helpful`/
  `delete_place_info_entry` `SECURITY DEFINER` RPC로만 가능하다(Supabase 보안
  어드바이저가 "anon이 SECURITY DEFINER 함수를 호출할 수 있다"고 두 함수 모두에 대해
  경고하는데, 이건 의도된 설계다 — RLS로는 막혀 있는 특정 동작 하나씩만 우회해서
  허용하는 용도이지, RLS를 완전히 무력화하는 게 아니다).

## 로그인(Supabase Auth) — `day4/auth.js`가 유일한 공유 파일인 이유

`index.html`/`place.html`은 원칙적으로 각자 자체 완결이라 작은 헬퍼(`escapeHtml()`, 토스트
등)도 서로 복붙해서 중복해 둔다. 로그인만 예외를 둬서 `day4/auth.js` 하나를 두 페이지가
`<script type="module" src="auth.js">`로 함께 로드한다 — 이유는 두 가지: (1) 인증/세션
로직은 두 파일에 복붙하면 drift가 나는 안 되는 보안 민감 코드이고, (2) "지금 로그인한
사람이 누구인지"를 즐겨찾기·핀 등록 로그인 게이트 같은 미래 기능이 그대로 가져다 쓸 수
있어야 한다는 요구가 있었다. 이 파일 하나만 예외라는 걸 잊지 말 것 — 새 공유 파일을 더
늘리는 핑계로 쓰지 말 것.

- Supabase JS는 npm 설치 대신 `import { createClient } from
  'https://esm.sh/@supabase/supabase-js@2'`로 CDN에서 ESM으로 가져온다 — 카카오맵 JS SDK를
  `<script src="...">`로 CDN에서 가져오는 것과 같은 이유(day4는 `package.json`/
  `node_modules` 없는 게 원칙).
- `SUPABASE_URL`/`SUPABASE_ANON_KEY`(publishable 키)는 `auth.js` 안에 상수로 하드코딩돼
  있다 — 카카오맵 JS 키와 같은 성격으로 비밀값이 아니라 브라우저에 노출되는 게 정상이다.
  실제 접근 범위는 서버가 아니라 RLS가 통제한다. `server.js`/`api/day4/place-info*.js`가
  쓰는 `.env.local`의 같은 값과 반드시 일치해야 한다 — 값이 바뀌면 세 곳 다 고칠 것.
- `window.Day4Auth`가 유일한 공개 접점이다: `getUser()`(캐시된 세션 기준 동기 반환),
  `onAuthChange(callback)`(구독 즉시 현재 상태로 1회 호출 + 이후 변경마다 호출),
  `requireLogin()`(로그인 안 됐으면 모달 열고 `false` 반환 — 미래에 "로그인 필요" 액션의
  클릭 핸들러 맨 앞에 한 줄로 꽂아 쓰라고 만든 헬퍼, 이번 범위에선 아무도 호출하지
  않는다), `openLoginModal()`, `signOut()`, `mountHeaderWidget(containerEl)`(헤더의
  로그인/로그아웃 표시를 그리고 상태 변화에 맞춰 자동 갱신).
- 세션 유지는 `createClient` 기본 동작(`persistSession`/`autoRefreshToken`)에 그대로
  맡긴다 — 별도로 손댄 게 없다. 새로고침해도 로그인 상태가 유지되는 이유.
- 회원가입 흐름(`supabase.auth.signUp`)이 가입 즉시 로그인까지 되려면 **Supabase
  대시보드 → Authentication → Sign In / Providers → Email의 "Confirm email"이 꺼져 있어야
  한다.** 이 설정은 MCP 도구로 바꿀 수 없어 대시보드에서 직접 꺼야 한다 — 켜져 있으면
  `signUp()`이 세션 없이 반환되고, `auth.js`는 이 경우를 감지해 "이메일 인증이
  필요합니다" 안내만 하고 크래시 없이 끝낸다(즉시 로그인은 안 됨).
- 로그인 여부와 무관하게 검색·리뷰 조회·AI 분석·핀 등록/삭제("도움이 됐어요" 포함)는
  전부 그대로 동작한다 — 로그인은 지금은 순수 UI/세션 기능일 뿐, 어떤 기존 API도
  게이트하지 않는다.

## 프론트 연동

- `index.html`의 히어로 검색 폼이 `/api/day4/places`를 호출한다. 결과는 히어로 바로 아래
  "검색 결과" 섹션(`#search-results-section`)에 3장 "길찾기" 캐러셀 카드와 같은 카드 클래스
  조합(DESIGN.md 6.11절)으로 렌더링된다.
- 로딩/빈 결과/오류 세 가지 상태를 처리한다. 오류는 페이지에 이미 있는 `#toast` +
  `demoNotice()`를 그대로 재사용해 보여준다(정의는 건드리지 않음).
- `place.html`은 더 이상 정적 목업이 아니다 — `index.html`의 카드가 넘기는 `id` 쿼리
  파라미터를 키로 `/api/day4/place-info` 계열 엔드포인트에서 실제 데이터를 읽고 쓰는 동적
  페이지다. 자세한 화면 구성은 `DESIGN.md` §6.12 참고.
- 구글 리뷰가 성공적으로 뜨면(캐시 히트든 새로 불러왔든) `/api/day4/place-review-analysis` 호출이
  **버튼 없이 자동으로** 이어진다 — 리뷰 자체는 여전히 "리뷰 보기" 클릭이 트리거지만, 그
  다음 AI 분석은 리뷰 로딩 완료가 트리거다. 리뷰가 0개면 이 자동 트리거 자체가 발동하지
  않는다. 자세한 내용은 `DESIGN.md` §6.14 참고.
