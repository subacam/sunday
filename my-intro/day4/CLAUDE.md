# CLAUDE.md (day4)

가게 길찾기 랜딩페이지 + 가게 상세 목업. 스펙은 `PRD.md`, 비주얼/화면 구성은 `DESIGN.md` 참고.

## Tooling — plain Node.js, not Next.js

이 폴더는 `day5/news`/`day6/dust`처럼 서비스키(카카오 REST API 키)를 서버에 숨겨야 하지만,
프레임워크 없이 **순수 Node.js 내장 `http` 모듈**만 쓴다. `package.json`도 `node_modules`도 없다 —
`day7/restaurant`가 세운 것과 같은, 저장소 루트 CLAUDE.md의 "빌드 없는 순수 코드" 기조에 맞춘
의도적인 선택이다.

- `server.js` — 정적 파일(`index.html`, `place.html`) 서빙 + `/api/places`에서 카카오 로컬
  검색(키워드) API를 프록시.
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

## 서비스키

- `.env.local`에 `KAKAO_REST_API_KEY=...`와 `GOOGLE_PLACES_API_KEY=...` (둘 다 gitignore
  처리됨, 커밋 금지). `.env.example`이 형식과 발급처(카카오는 카카오 디벨로퍼스 콘솔,
  https://developers.kakao.com > 내 애플리케이션 > 앱 키 > REST API 키; 구글은 구글 클라우드
  콘솔, https://console.cloud.google.com > API 및 서비스 > 사용자 인증 정보 — 반드시
  **"Places API (New)"**를 사용 설정해야 하며, 레거시 Places API만 켜져 있으면
  `places:searchText` 호출이 403으로 실패한다)를 보여준다.
- `server.js`가 시작 시 `process.loadEnvFile('.env.local')`로 읽는다(Node 20.6+ 내장 API, 별도
  dotenv 불필요).
- **키가 없거나 `TODO_...` placeholder면 "키 없음"과 동일하게 취급한다.** 두 키 모두 이 규칙을
  따른다 — 업스트림 호출을 아예 시도하지 않고, 각각 `/api/places`·`/api/place-reviews`가
  `{ error: "SERVER_NOT_CONFIGURED", message: "..." }`를 500으로 반환한다. 실제 키를
  발급받으면 `.env.local`의 값만 교체하면 된다.

## `/api/places` 계약

- `GET /api/places?query=검색어` — `query`가 비어 있으면 400 `MISSING_QUERY`.
- 카카오 응답(`documents` 배열)을 프론트가 쓰기 쉬운 최소 형태로 재구성해 `{ places: [...] }`로
  반환한다. 각 place는 `name`(`place_name`) · `category`(`category_name`의 마지막 세그먼트,
  예: "카페") · `address`(`road_address_name` 우선, 없으면 `address_name`) · `phone` ·
  `lat`/`lng`(`y`/`x`, 문자열 그대로) · `url`(`place_url`).
- 업스트림 오류(401/429/5xx/네트워크 실패)는 `day5/news`, `day7/restaurant`와 같은 원칙으로 닫힌
  오류 코드 집합(`UPSTREAM_AUTH_ERROR`/`UPSTREAM_RATE_LIMITED`/`UPSTREAM_ERROR`/
  `UPSTREAM_UNAVAILABLE`)에 매핑한다 — 원본 응답 본문·상태 텍스트·키는 클라이언트나 로그에
  절대 노출하지 않는다.

## `/api/place-reviews` 계약

가게 이름·좌표로 구글 지도에서 그 가게를 찾아 평점·리뷰를 가져오는, 서버 쪽 영속 저장이
없는 프록시다(캐싱은 `place.html`의 `localStorage`에서만 한다). 반드시 **Places API
(New)**의 `POST https://places.googleapis.com/v1/places:searchText`를 쓴다(레거시 Places
API 아님).

- `GET /api/place-reviews?name=가게이름&lat=위도&lng=경도` — `name`이 비어 있으면 400
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
- 업스트림 오류(401/403/429/5xx/네트워크 실패)는 `/api/places`와 같은 원칙으로 닫힌 오류
  코드 집합(`UPSTREAM_AUTH_ERROR`/`UPSTREAM_RATE_LIMITED`/`UPSTREAM_ERROR`/
  `UPSTREAM_UNAVAILABLE`)에 매핑한다. 구글은 401뿐 아니라 403(권한 부족·API 미사용 설정)도
  인증 오류로 쓰므로 둘 다 `UPSTREAM_AUTH_ERROR`로 매핑한다 — 원본 응답 본문·상태 텍스트·키는
  클라이언트나 로그에 절대 노출하지 않는다.
- **로그인을 요구하지 않는다.** 조회는 누구나 할 수 있고, 서버는 조회 결과를 저장하지 않는다
  (매 요청마다 구글을 호출) — 클라이언트가 `localStorage`에 만료 없이 캐싱해 같은 가게를
  다시 조회할 때 네트워크 호출 없이 즉시 보여준다.

## `/api/place-info` 계약

가게 하나에 대해 여러 사용자가 각자 남긴 사진·설명·정밀 핀·"도움이 됐어요"를 누적 저장하는
아주 작은 파일 기반 저장소다. 별도 DB 없이 `day4/data/place-info.json`(gitignore 처리, 서버
재시작에도 유지) 하나에 `{ placeId: [entry, ...] }` 형태로 저장한다. `place.html`이 이 API를
호출하는 유일한 클라이언트다.

- `GET /api/place-info?id=가게id` — `id`가 비어 있으면 400 `MISSING_ID`. 응답은
  `{ entries: [...] }`이며 각 entry는 `createdAt` 내림차순(최신 먼저)으로 정렬되어 있다. entry
  형태: `{ id, author, text, photoUrl, pinX, pinY, helpfulCount, createdAt }`. `pinX`/`pinY`는
  핀을 남기지 않았으면 `null`이다.
- `POST /api/place-info` — 본문 `{ placeId, author, text, photoUrl, pinX, pinY }`. `placeId`
  누락 시 400 `MISSING_PLACE_ID`, `text` 누락 시 400 `MISSING_TEXT`, `text`가 500자 초과면 400
  `TEXT_TOO_LONG`. `photoUrl`은 값이 있으면 `http(s)://`로 시작해야 하며(아니면 400
  `INVALID_PHOTO_URL`), 500자를 넘으면 400 `PHOTO_URL_TOO_LONG`. `author`가 비어 있으면 서버가
  "익명"으로 채우고, 30자로 잘린다. `pinX`/`pinY`는 0~100 범위의 유한수일 때만 저장되고, 그
  외에는 `null`로 저장된다. 성공 시 201과 함께 생성된 `{ entry }`를 반환한다.
- `POST /api/place-info/helpful` — 본문 `{ placeId, entryId }`. 둘 중 하나라도 없으면 400
  `MISSING_FIELDS`, 해당 `entryId`를 찾지 못하면 404 `ENTRY_NOT_FOUND`. 성공 시 200과 함께
  증가된 `{ helpfulCount }`를 반환한다.
- **등록에 로그인을 요구하지 않는다(익명 허용).** PRD.md §5.2/§5.5는 위치 정보 추가와
  "도움이 됐어요" 모두 로그인을 요구하지만, 이 구현은 로그인 게이트 없이 두 행위를 모두
  허용하는 의도적인 MVP 이탈이다 — 자세한 설명은 `DESIGN.md` §6.12 참고. PRD.md 자체는
  수정하지 않았다.

## 프론트 연동

- `index.html`의 히어로 검색 폼이 `/api/places`를 호출한다. 결과는 히어로 바로 아래
  "검색 결과" 섹션(`#search-results-section`)에 3장 "길찾기" 캐러셀 카드와 같은 카드 클래스
  조합(DESIGN.md 6.11절)으로 렌더링된다.
- 로딩/빈 결과/오류 세 가지 상태를 처리한다. 오류는 페이지에 이미 있는 `#toast` +
  `demoNotice()`를 그대로 재사용해 보여준다(정의는 건드리지 않음).
- `place.html`은 더 이상 정적 목업이 아니다 — `index.html`의 카드가 넘기는 `id` 쿼리
  파라미터를 키로 `/api/place-info` 계열 엔드포인트에서 실제 데이터를 읽고 쓰는 동적 페이지다.
  자세한 화면 구성은 `DESIGN.md` §6.12 참고.
