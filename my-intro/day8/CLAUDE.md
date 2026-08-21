# CLAUDE.md (day8)

노션 스타일 메모장. 스펙은 이 파일과 `DESIGN.md`, 구현은 `index.html` 하나로 끝난다.

## 이 폴더가 다른 day 폴더와 다른 점

`day1`/`day2`/`day4`처럼 폴더 하나에 `index.html`+`CLAUDE.md`+`DESIGN.md`를 두는 평평한 구조지만, 저장소에서 **Supabase를 쓰는 유일한 폴더**다. `day5/news`·`day6/dust`·`day4`·`day7/restaurant`가 서비스키를 숨기려고 서버를 두는 것과 달리, 이 폴더는 **서버가 없다** — 클라이언트에서 Supabase JS SDK로 직접 REST(PostgREST) 호출을 보낸다.

## 데이터 모델

`public.memos` 테이블 (Supabase 프로젝트 `subacam's Project`, id `srhnwzcnimadmoyfukwd`):

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | `bigint generated always as identity` | PK |
| `content` | `text not null` | 메모 내용 |
| `created_at` | `timestamptz not null default now()` | 작성 시간. 수정해도 바뀌지 않는다 — "수정 시간"은 요구사항에 없어 별도 컬럼을 두지 않았다 |

Row Level Security를 켜고 `select`/`insert`/`update`/`delete` 네 정책을 전부 `using (true)`/`with check (true)`로 열어뒀다 — 로그인 없이 누구나 읽고 쓰는 요구사항을 RLS 정책으로 그대로 구현한 것이다. 마이그레이션은 `create_memos_table`(Supabase MCP `apply_migration`)로 적용했다.

## 키를 클라이언트에 그대로 박아 넣은 이유

`index.html`에 `SUPABASE_URL`과 `SUPABASE_KEY`(publishable/anon 키)가 하드코딩돼 있다. **이것은 비밀값이 아니다** — `day4/CLAUDE.md`가 카카오맵 JS SDK 키에 대해 이미 적어둔 것과 같은 보안 모델이다: 대칭적인 서버-측 비밀(day4의 카카오 REST 키, day5/news의 네이버 키 등)은 노출되면 그 자체로 도용되지만, publishable/anon 키는 "누가 이 키로 요청했는지"가 아니라 "이 요청이 RLS 정책을 통과하는지"로 접근을 제어한다. 이 폴더에서는 정책 자체가 전부 공개(`true`)이므로, 키를 숨겨도 얻는 보안 이득이 없다 — 숨겨야 할 것은 키가 아니라 정책이다. `.env` 파일이나 서버가 필요 없는 이유도 이것이다.

## 문서 계약

`index.html`의 `:root` 블록은 `DESIGN.md` 프론트매터(`colors`/`typography`/`rounded`/`spacing`) 값을 그대로 미러링한다 — `day2`와 같은 계약. 토큰 값을 바꾸려면 두 파일을 함께 고칠 것. `DESIGN.md`에 없는데 앱에 필요해서 추가한 것(오류 배너 색 재사용, 삭제 2단계 확인 등)은 `DESIGN.md` 안에 **확장** 표시로 남겨뒀다.

## 삭제 확인 패턴

`window.confirm`을 쓰지 않는다. `day2/CLAUDE.md`가 이미 기록한 이유(샌드박스 환경에서 네이티브 다이얼로그가 막히면 페이지가 멈춘 것처럼 보인다)를 그대로 적용해, "삭제" 버튼을 누르면 그 자리에서 "정말 삭제할까요? [확인] [취소]" 상태로 바뀌는 인라인 2단계 확인을 쓴다.

## 실행/서빙

다른 정적 폴더와 동일하게 파일에서 직접 열거나 `python -m http.server 8000`으로 서빙한다. 빌드 단계 없음, `node_modules` 없음. 외부 CDN은 `@supabase/supabase-js@2`(jsdelivr) 하나만 쓴다 — 이 저장소의 "무의존성" 원칙에 대한 명시적 예외이며, 이유는 day4의 카카오맵 JS SDK와 같다(브라우저에서 직접 쓰라고 만들어진 공개 클라이언트 키/SDK).

## 확인한 것

배포 후 Supabase MCP `get_advisors`(security)로 확인했을 때 이 스키마에 대한 경고는 없었다(공개 RLS 정책은 의도된 설계라 advisor가 문제 삼지 않음). 데모로 메모 3개를 실제 UI에서 추가·수정·삭제해 새로고침 후에도 반영되는지 확인했다.
