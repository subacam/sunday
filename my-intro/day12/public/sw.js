const CACHE_VERSION = 'v1';
const CACHE_NAME = `day12-ai-ledger-${CACHE_VERSION}`;

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

// 네트워크 우선 + 캐시 폴백. day11에서 캐시 우선 전략이 재배포를 감지하지
// 못하는 버그를 겪은 뒤 정착한 패턴 — 같은 sw.js 바이트가 유지되는 한
// 새 service worker가 설치되지 않아 캐시 우선이면 예전 번들을 영원히
// 서빙하게 된다. "항상 최신"을 우선하고 오프라인일 때만 캐시로 폴백한다.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // Supabase 호출(REST/Storage/Functions)은 캐시하지 않는다 — 항상 네트워크로.
  if (event.request.url.includes('supabase.co')) return;

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
