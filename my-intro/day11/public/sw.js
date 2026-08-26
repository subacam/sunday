const CACHE_VERSION = 'v2';
const CACHE_NAME = `day11-walk-record-${CACHE_VERSION}`;

const PRECACHE_URLS = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// 네트워크 우선 + 캐시 폴백. v1은 캐시 우선이라 재배포해도 SW가 예전 번들을
// 영원히 계속 서빙하는 버그가 있었다(같은 sw.js 바이트가 유지되는 한 새
// service worker가 아예 설치되지 않아 재배포를 감지 못함). 지도 탭이 실지도
// SDK로 바뀌며 어차피 온라인 전제가 생겼으므로, "항상 최신"을 우선하고
// 오프라인일 때만 캐시로 폴백하는 쪽으로 바꿨다.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Supabase 호출(REST/Storage/Functions)은 캐시하지 않는다 — 항상 네트워크로.
  if (event.request.url.includes('supabase.co')) return;
  // 지도 벡터 타일도 캐시하지 않는다 — 브라우저 HTTP 캐시가 이미 맡고,
  // Cache Storage에까지 쌓아두면 용량만 커진다.
  if (event.request.url.includes('tiles.openfreemap.org')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => {
        if (cached) return cached;
        if (event.request.mode === 'navigate') return caches.match('/');
      }))
  );
});
