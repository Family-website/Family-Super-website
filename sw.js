const CACHE_NAME = 'gharmanager-final-v1'; // Naya naam tak ki purana cache reset ho jaye

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                './',
                './index.html',
                './style.css',
                './script.js',
                './manifest.json',
                './icon.png'
            ]).catch(err => console.log('Cache error', err));
        })
    );
    self.skipWaiting(); // Naye service worker ko turant active karne ke liye
});

// Purani memory (cache) ko auto-delete karne ka jaadu
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Purana cache ud gaya:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
