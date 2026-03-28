const CACHE_NAME = 'timebox-flow-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') {
        return;
    }

    // API requests: always prefer network
    if (e.request.url.includes('/api/')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // App shell and static assets: network first, cache as fallback
    e.respondWith(
        fetch(e.request)
            .then((response) => {
                if (!response || response.status !== 200) {
                    return response;
                }

                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
                return response;
            })
            .catch(() => caches.match(e.request).then((response) => response || caches.match('/index.html')))
    );
});
