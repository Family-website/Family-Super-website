const CACHE_NAME = 'gharmanager-v1';

// 1. Install hone par files ko phone mein save karna
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './',
                './index.html',
                './style.css',
                './script.js',
                './icon.png',
                './manifest.json'
            ]);
        })
    );
    console.log('[Service Worker] GharManager Install & Cached 😎');
});

// 2. Internet na hone par save ki hui files dikhana
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
