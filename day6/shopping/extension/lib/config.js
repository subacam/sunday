// 로컬 개발용 기본값. 배포 시(day6/shopping/CLAUDE.md "project-hub / 배포" 참고)
// 실제 배포된 프록시 URL로 반드시 교체해야 함 — 이 값을 바꾸지 않으면 확장
// 프로그램을 배포해도 개발자 로컬 서버로만 요청을 보내게 됨. 이 값을 바꿀 때는
// ../manifest.json의 host_permissions에 있는 "http://localhost:3000/*"도
// 새 URL로 같이 바꿔야 한다 — background.js의 fetch()가 host_permissions에
// 없는 origin으로 요청하면 일반 웹페이지처럼 CORS에 걸려 "Failed to fetch"로
// 조용히 실패한다 (서버가 CORS 헤더를 안 보내므로).
export const PROXY_BASE_URL = "http://localhost:3000";

export const STORAGE_KEY = "shoppingReviewAnalysisState";

export const MAX_REVIEWS_TARGET = 150;
