// ============================================================
// 🚀 GHARMANAGER PWA — UPGRADED SERVICE WORKER v3.0
// Features: Smart Cache | Background Sync | Push Notifications
// ============================================================

const APP_VERSION   = 'v3.0';
const STATIC_CACHE  = `gm-static-${APP_VERSION}`;
const DYNAMIC_CACHE = `gm-dynamic-${APP_VERSION}`;
const SYNC_TAG      = 'gm-background-sync';

// ── Files to cache immediately on install ──────────────────
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon.png',
    // Google Fonts (subset — cache for offline)
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
    'https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap',
];

// ── External domains that should be cached dynamically ─────
const CACHE_DOMAINS = [
    'fonts.gstatic.com',
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net',
];

// ============================================================
// 1. INSTALL — Pre-cache all static assets
// ============================================================
self.addEventListener('install', (event) => {
    console.log(`[SW ${APP_VERSION}] Installing...`);
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log(`[SW] Pre-caching ${STATIC_ASSETS.length} assets`);
            // addAll fails if one fails, so use individual adds with catch
            return Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    cache.add(url).catch(err =>
                        console.warn(`[SW] Could not cache: ${url}`, err)
                    )
                )
            );
        })
    );
    self.skipWaiting(); // Activate immediately without waiting
});

// ============================================================
// 2. ACTIVATE — Clean old caches
// ============================================================
self.addEventListener('activate', (event) => {
    console.log(`[SW ${APP_VERSION}] Activating...`);
    event.waitUntil(
        caches.keys().then((allCaches) => {
            return Promise.all(
                allCaches
                    .filter(name => name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
                    .map(name => {
                        console.log(`[SW] Deleting old cache: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim()) // Take control of all open tabs
    );
});

// ============================================================
// 3. FETCH — Smart caching strategies
// ============================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and chrome-extension requests
    if (request.method !== 'GET') return;
    if (url.protocol === 'chrome-extension:') return;

    // ── Firebase / API calls → Network Only (never cache) ──
    if (url.hostname.includes('firebase') ||
        url.hostname.includes('firestore') ||
        url.hostname.includes('googleapis.com') ||
        url.pathname.includes('/v1/') ) {
        event.respondWith(fetch(request).catch(() => offlineFallback(request)));
        return;
    }

    // ── Static App Shell → Cache First ─────────────────────
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // ── External CDN/Fonts → Stale While Revalidate ────────
    if (CACHE_DOMAINS.some(d => url.hostname.includes(d))) {
        event.respondWith(staleWhileRevalidate(request));
        return;
    }

    // ── Everything else → Network First with cache fallback ─
    event.respondWith(networkFirst(request));
});

// ── Strategy: Cache First (best for static assets) ─────────
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const fresh = await fetch(request);
        if (fresh.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, fresh.clone());
        }
        return fresh;
    } catch {
        return offlineFallback(request);
    }
}

// ── Strategy: Network First (best for HTML pages) ──────────
async function networkFirst(request) {
    try {
        const fresh = await fetch(request);
        if (fresh.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, fresh.clone());
        }
        return fresh;
    } catch {
        const cached = await caches.match(request);
        return cached || offlineFallback(request);
    }
}

// ── Strategy: Stale While Revalidate (fonts/CDN) ───────────
async function staleWhileRevalidate(request) {
    const cache = await caches.open(DYNAMIC_CACHE);
    const cached = await cache.match(request);
    const fetchPromise = fetch(request).then(fresh => {
        if (fresh.ok) cache.put(request, fresh.clone());
        return fresh;
    }).catch(() => cached);
    return cached || fetchPromise;
}

// ── Offline fallback page ───────────────────────────────────
async function offlineFallback(request) {
    if (request.headers.get('accept')?.includes('text/html')) {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
    }
    // Return a minimal offline response for other assets
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
}

function isStaticAsset(url) {
    return url.pathname.match(/\.(html|css|js|png|jpg|jpeg|svg|ico|webp|woff|woff2)$/);
}

// ============================================================
// 4. BACKGROUND SYNC — Save offline data when back online
// ============================================================
self.addEventListener('sync', (event) => {
    console.log(`[SW] Background sync triggered: ${event.tag}`);

    if (event.tag === SYNC_TAG) {
        event.waitUntil(processSyncQueue());
    }

    if (event.tag === 'gm-expense-sync') {
        event.waitUntil(syncPendingExpenses());
    }
});

async function processSyncQueue() {
    // Notify all open clients that sync is happening
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_START', message: 'Background sync shuru hua...' });
    });

    // Give app time to process, then notify complete
    await new Promise(resolve => setTimeout(resolve, 500));
    clients.forEach(client => {
        client.postMessage({ type: 'SYNC_COMPLETE', message: 'Data sync ho gaya! ✅' });
    });
}

async function syncPendingExpenses() {
    // App handles actual Firebase sync; SW just notifies clients
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => {
        client.postMessage({ type: 'EXPENSE_SYNC', message: 'Pending expenses sync ho rahe hain...' });
    });
}

// ============================================================
// 5. PUSH NOTIFICATIONS
// ============================================================
self.addEventListener('push', (event) => {
    console.log('[SW] Push notification received');

    let data = { title: 'GharManager 🏠', body: 'Aapke liye ek update hai!', icon: './icon.png', badge: './icon.png', tag: 'gm-push' };

    try {
        const payload = event.data?.json();
        if (payload) data = { ...data, ...payload };
    } catch {
        const text = event.data?.text();
        if (text) data.body = text;
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body:    data.body,
            icon:    data.icon    || './icon.png',
            badge:   data.badge   || './icon.png',
            tag:     data.tag     || 'gm-push',
            vibrate: [200, 100, 200],
            data:    { url: data.url || './' },
            actions: data.actions || [
                { action: 'open',    title: '📱 App Kholein' },
                { action: 'dismiss', title: '✕ Dismiss' }
            ]
        })
    );
});

// ── Notification click handler ──────────────────────────────
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    const targetUrl = event.notification.data?.url || './';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
            // Focus existing tab if open
            for (const client of clients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open new tab
            if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
        })
    );
});

// ── Push subscription change ────────────────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
    event.waitUntil(
        self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: event.oldSubscription?.options?.applicationServerKey
        })
    );
});
