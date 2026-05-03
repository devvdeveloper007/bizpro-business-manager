// BizPro Service Worker v4
const CACHE_NAME = 'bizpro-v4';
const STATIC_ASSETS = [
  '/', '/index.html', '/manifest.json',
  '/icon-192.png', '/icon-512.png', '/privacy-policy.html'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase/API calls — Network first, NEVER cache
  if(url.includes('firestore.googleapis.com') ||
     url.includes('firebase') ||
     url.includes('googleapis.com') ||
     url.includes('identitytoolkit') ||
     url.includes('firebaseapp.com') ||
     url.includes('recaptcha') ||
     url.includes('gstatic.com/firebasejs')) {
    e.respondWith(
      fetch(e.request).catch(err => {
        // Network fail — don't try cache for API calls
        return new Response('Network error', {
          status: 503,
          statusText: 'Service Unavailable'
        });
      })
    );
    return;
  }

  // Static assets — Cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(response => {
        // Sirf valid responses cache karo
        if(response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback
        if(e.request.destination === 'document') {
          return caches.match('/index.html');
        }
        return new Response('Offline', {status: 503});
      });
    })
  );
});
