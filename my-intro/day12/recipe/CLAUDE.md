# CLAUDE.md (day12)

"AI 영수증 가계부" PWA. Claude Design 핸드오프 번들(`prd/AI가계부_PWA_PRD.md`, `prd/project/가계부 앱.dc.html`)을 실제로 동작하는 앱으로 구현한 것. 영수증을 찍거나 갤러리에서 올리면 Gemini Vision이 상호명·날짜·품목·금액·카테고리를 구조화해 돌려주고, 사용자가 확인/수정 후 저장하면 피드·대시보드·트렌드 탭에 반영된다.

## 이 폴더가 다른 day 폴더와 다른 점

day11과 같은 계열이다 — **Next.js를 쓰면서 별도 백엔드 서버는 두지 않고, Gemini 키를 숨기는 역할은 Supabase Edge Function이 맡는다.** `npm run build`는 정적으로 배포 가능한 클라이언트 앱을 만든다.

## 스택

- **프론트엔드**: Next.js 16 (App Router) + TypeScript + React 19, 전부 클라이언트 컴포넌트(`src/app/page.tsx`가 boot/onboarding/auth/app 4단계 상태 머신을 직접 관리). Tailwind 없음 — `prd/project/가계부 앱.dc.html`의 인라인 스타일 값(색상 `#2B5A4C`/`#EDEAE4`/`#1C1E1D` 등, radius, 폰트 크기)을 `src/components/*.tsx`에 그대로 옮겨적었다. 폰트는 디자인이 지정한 Pretendard를 jsdelivr CDN 링크로 그대로 로드(`src/app/layout.tsx`).
- **인증/DB/스토리지**: Supabase, day4/day8/day11과 같은 공유 프로젝트("subacam's Project", id `srhnwzcnimadmoyfukwd`). URL과 publishable(anon) 키는 `src/lib/supabase.ts`에 하드코딩되어 있다 — 같은 이유로 비밀값이 아니다(RLS가 실제 접근을 통제).
- **AI**: Gemini Vision, 이 폴더의 소스가 아니라 Supabase Edge Function(`supabase/functions/receipt-vision/index.ts`) 안에서만 호출된다. `GEMINI_API_KEY`/`MOCK_GEMINI`는 day11의 `gemini-vision`과 같은 프로젝트 시크릿을 공유한다(Supabase 시크릿은 함수 단위가 아니라 프로젝트 단위) — 그래서 이 함수를 배포하자마자 별도 등록 없이 이미 `MOCK_GEMINI=0` + 실제 `GEMINI_API_KEY`로 실제 Gemini 응답이 나온다(목업 아님, 실제 확인함 — 아래 "확인한 것" 참고).

## 데이터 모델 (Supabase 프로젝트 `srhnwzcnimadmoyfukwd`)

- `public.ledger_profiles(id uuid PK → auth.users, display_name, onboarding_seen bool, created_at)`.
- `public.ledger_expenses(id, user_id → auth.users, receipt_image_path, merchant_name, transaction_at, total_amount, category_id text check(8종), payment_method, memo, is_edited, created_at)`.
- `public.ledger_expense_items(id, expense_id → ledger_expenses, name, quantity, unit_price)`.
- `public.ledger_budgets(id, user_id, category_id, monthly_amount, unique(user_id, category_id))`.
- Storage 버킷 `ledger-receipts` (private), 객체 경로는 항상 `{auth.uid()}/파일명`.
- RLS: 네 테이블 모두 `auth.uid()` 기준 본인 행만 select/insert/update/delete. `ledger_expense_items`는 자체 `user_id`가 없어 `ledger_expenses` 조인 서브쿼리로 검사.
- **트렌드 탭 전용 집계 RPC** `public.ledger_category_totals(since timestamptz)` — `SECURITY DEFINER`로 전체 사용자의 카테고리별 합계·참여 사용자 수만 반환(개별 사용자 행은 절대 반환하지 않음). PRD 4.9 참고. `get_advisors(security)`에 "익명도 실행 가능한 SECURITY DEFINER" 경고가 뜨지만, 이 함수는 원래 익명 집계를 보여주는 것이 목적이라 의도된 설계다(같은 프로젝트의 `get_popular_places` 등 기존 함수들도 같은 패턴으로 이미 존재).
- 마이그레이션: `create_ledger_tables`, `create_ledger_trend_functions`, `create_ledger_receipts_bucket` (Supabase MCP `apply_migration`으로 적용).

## Edge Function: `receipt-vision`

- 배포: `mcp__supabase__deploy_edge_function` (project_id `srhnwzcnimadmoyfukwd`, `verify_jwt: true`). 소스는 `supabase/functions/receipt-vision/index.ts`에 보관.
- 요청 `{imageBase64, mimeType}` → `{merchant, transactionDate, totalAmount, paymentMethodGuess, categoryId, items[], lowConfidenceFields[]}` (Gemini `responseSchema`로 스키마 강제, day11 `gemini-vision`과 같은 패턴).
- 실제 Gemini 호출이 실패해도 mock 목록(`RECEIPT_POOL`)으로 자동 폴백하고 응답에 `fallback:true`를 얹는다.

## PRD와 다른/추가된 점

- **트렌드 탭**은 원래 PRD v1.0에 없었고 디자인 핸드오프(`가계부 앱.dc.html`)에만 하단 탭 4번째로 구현되어 있었다 — `prd/AI가계부_PWA_PRD.md`에 "4.9 트렌드 (Trend)"와 "4.10 마이 (My)" 섹션을 추가해 문서를 실제 구현과 맞췄다.
- **소셜 로그인(Google/카카오) 대신 이메일/게스트**: 디자인의 온보딩 마지막 스텝은 Google/카카오 버튼을 보여주지만 실제 OAuth 앱 등록 없이는 동작시킬 수 없어(day11 AuthScreen과 동일 이유) 이메일/비밀번호로 대체했다. "게스트로 둘러보기"는 이 프로젝트에서 익명 로그인(anonymous sign-in)이 비활성화되어 있어(Supabase 대시보드에서 별도로 켜야 함 — MCP 도구셋에는 그 설정을 켜는 도구가 없음) 무작위 이메일로 즉석 계정을 만들어 흉내낸다(`src/components/AuthScreen.tsx`).
- **AI 인사이트 카드는 별도 LLM 호출이 아니라 규칙 기반**이다(`src/lib/stats.ts`의 `buildInsight`) — 이번 달 카테고리별 지출을 지난달과 비교해 가장 크게 늘어난 카테고리를 찾고 예산 대비 소진율을 문장으로 조립한다. PRD 4.8의 "자연어 요약" 요구를 만족하면서 추가 AI 호출 비용/지연을 피하기 위한 선택.
- **"+ 카테고리 추가"는 디자인처럼 시각적 요소만 있고 실제로 카테고리를 추가하지 않는다** — 카테고리 8종은 `ledger_expenses.category_id`의 DB `check` 제약으로 고정되어 있어(`src/lib/categories.ts`), 누르면 "카테고리는 8종으로 고정되어 있어요" 토스트만 보여준다.
- **마이 탭의 "알림 설정"/"결제수단 관리"는 디자인처럼 미구현 상태** — 누르면 "아직 준비 중인 기능이에요" 토스트만 뜬다(Web Push 발송 인프라, 결제수단 저장 등은 이번 범위 밖). "데이터 내보내기"는 실제로 동작하며 본인 지출 내역을 CSV로 내보낸다.

## 확인한 것

- `npm run build` / `npm run lint` 통과 (TypeScript strict, ESLint 0 errors/warnings).
- Chrome 브라우저 자동화로 골든 패스 전체 실행: 온보딩 건너뛰기 → 이메일 화면 → 게스트로 가입(실제 Supabase Auth) → 피드 진입 → FAB로 촬영 오버레이 → 카메라 미지원 환경에서 갤러리 업로드 폴백 정상 동작 확인 → 로딩 단계 애니메이션 → **실제 이미지를 `receipt-vision` Edge Function에 보내 실제 Gemini Vision 응답 수신 확인**(mock이 아님 — 빈 이미지에 대해 "알 수 없음"/확인 필요 필드 정확히 표시) → 확인/수정 화면에서 상호명·카테고리·금액·품목 수정 → 저장 → **Storage 업로드 + `ledger_expenses`/`ledger_expense_items` insert 실제 성공** → 피드에 새 항목 반영 → 대시보드 월별 추이 차트에 실데이터 반영 → 트렌드 탭이 표본 부족(사용자 1명) 상태에서 "아직 비교할 사용자가 충분하지 않아요" 빈 상태를 정확히 보여줌(익명성 보호 로직 확인) → 마이 탭에서 카테고리 예산 설정 저장 확인 → "준비 중" 토스트 확인. 테스트로 만든 계정/행/Storage 파일은 전부 정리했다.
- Supabase 프로젝트 시크릿이 이미 `GEMINI_API_KEY`(실키) + `MOCK_GEMINI=0`으로 설정되어 있어(day11이 등록) `receipt-vision`도 별도 설정 없이 바로 실제 AI 경로가 라이브다.

## 아직 안 된 것

- 실제 기기 카메라 촬영 검증(자동화 브라우저에는 카메라 장치가 없어 `getUserMedia` 실패 → 갤러리 폴백 경로만 확인). `CaptureOverlay.tsx`는 카메라 가능 시 실시간 프리뷰 + 셔터 촬영도 구현되어 있으나 실기기 검증은 남음.
- PWA 설치(홈 화면 추가) 실기기 검증 — `manifest.json`/`sw.js`는 day10/day11 패턴(네트워크 우선 + 캐시 폴백)을 그대로 따랐다.
- 소셜 로그인, 알림 설정 실동작, 결제수단 관리, 카테고리 커스텀 추가 — 위 "PRD와 다른/추가된 점" 참고.
- 트렌드 탭의 또래 비교는 지금 활동 사용자가 적어 대부분 빈 상태로 보인다 — 실사용자가 늘어야 의미 있는 비교가 나온다.

## 실행

```
cd day12
npm run dev     # localhost:3000
npm run build   # 타입체크 + lint + 프로덕션 빌드
npm run gen-icons  # public/icon.svg → icon-192.png/icon-512.png 재생성
```

@AGENTS.md
