const CACHE_NAME = 'susi-pwa-cache-v13';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  // 네트워크 우선(Network First) 전략: 
  // 항상 최신 파일을 받아오고, 오프라인일 때만 캐시를 시도합니다.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 네트워크 요청 성공 시 캐시에 복사본 저장
        if (event.request.method === 'GET') {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, resClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 네트워크 연결 실패 시 캐시에서 반환
        return caches.match(event.request);
      })
  );
});
