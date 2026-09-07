# CLAUDE.md (day7/restaurant)

시티투어 주변 맛집 검색 서비스. 스펙은 `맛집찾기_PRD.md` 참고.

## Tooling — plain Node.js, not Next.js

이 폴더는 `day5/news`/`day6/dust`처럼 서비스키를 서버에 숨겨야 하지만, 프레임워크 없이 **순수 Node.js
내장 `http` 모듈**만 쓴다. `package.json`도 `node_modules`도 없다 — 저장소 루트 CLAUDE.md의
"빌드 없는 순수 코드" 기조에 맞춘 의도적인 선택.

- `server.js` — 정적 파일(`index.html`) 서빙 + `/api/restaurants`에서 `api.kcisa.kr`을 프록시.
- 실행: `node server.js` (기본 포트 3000; `PORT=3100 node server.js`처럼 바꿀 수 있음).
- `index.html`만은 예외적으로 Tailwind CDN(`cdn.tailwindcss.com`) + Google Fonts를 쓴다 — Stitch가
  생성한 디자인을 최대한 그대로 재현해달라는 요청에 따른 것으로, 이 폴더에 한정된 예외다.

## 서비스키

- `.env.local`에 `KCISA_SERVICE_KEY=...` (gitignore 처리됨, 커밋 금지). `.env.example`이 형식을 보여준다.
- `server.js`가 시작 시 `process.loadEnvFile('.env.local')`로 읽는다(Node 20.6+ 내장 API, 별도 dotenv 불필요).

## api.kcisa.kr (API_CNV_063) 실측으로 확인한 것 — PRD의 가정과 다른 부분

- **기본 응답은 XML이지만 `Accept: application/json` 헤더를 보내면 JSON을 준다.** 헤더 없이 호출하면
  계속 XML만 오길래 처음엔 "JSON을 지원 안 한다"고 오판했음. `server.js`는 이 헤더를 붙여 JSON으로
  받는다.
- **JSON 변환 특성상 결과 0건이면 `items`가 빈 문자열(`""`)로, 1건이면 `items.item`이 배열이 아니라
  객체 하나로 온다.** 항상 배열로 정규화해서 다뤄야 한다(`server.js`의 `normalizeItems`).
- **`areaNm`/`clNm` 필터는 정상 동작하지만 반드시 UTF-8로 percent-encode해야 한다.** 값이 EUC-KR 등
  다른 인코딩으로 나가면 서버가 아무 것도 매칭하지 못하고 빈 결과만 돌려줘서 "필터가 고장났다"고
  착각하기 쉽다. `URLSearchParams`(Node)는 항상 UTF-8이라 안전하지만, 셸에서 curl로 직접 테스트할 때는
  로케일에 따라 깨질 수 있으니 주의.
- **`totalCount`는 조건과 무관하게 고정값(실측 시 1,195,062)이라 신뢰할 수 없다.** 그래서 프론트는
  총 건수를 표시하지 않고, "받은 개수 == numOfRows"일 때만 더보기 버튼을 노출하는 방식으로 우회한다.
- **응답이 원래 느리다.** 실측으로 10~40초대까지 걸렸고, `numOfRows` 크기나 필터 유무와 뚜렷한
  상관관계가 없었다(데이터 양 문제가 아니라 API 자체 특성으로 보임). `server.js`는 45초 타임아웃을
  두고, 그래도 실패하면 502를 반환해 프론트의 오류 상태(재시도 버튼)로 이어지게 한다. 짧은 타임아웃은
  정상 응답도 실패로 오판하게 만드니 줄이지 말 것.
