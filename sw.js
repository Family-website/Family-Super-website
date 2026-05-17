// ============================================================
// 🚀 GHARMANAGER PRO — SERVICE WORKER v4.0
// Smart Caching · Background Sync · Push · IndexedDB
// Offline Fallback · Auto-Update Detection
// ============================================================

const VERSION        = 'v4.0';
const STATIC_CACHE   = `gharmanager-static-${VERSION}`;
const DYNAMIC_CACHE  = `gharmanager-dynamic-${VERSION}`;
const FIREBASE_CACHE = `gharmanager-firebase-${VERSION}`;

// ── Pre-cache these on install ───────────────────────────────
const STATIC_ASSETS = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icon.png',
    './offline.html',
];

// ── URL Routing Patterns ─────────────────────────────────────
const FIREBASE_PATTERNS = [
    /firestore\.googleapis\.com/,
    /firebase\.googleapis\.com/,
    /identitytoolkit\.googleapis\.com/,
    /securetoken\.googleapis\.com/,
];
const STATIC_PATTERNS = [
    /fonts\.googleapis\.com/,
    /fonts\.gstatic\.com/,
    /cdnjs\.cloudflare\.com/,
    /cdn\.jsdelivr\.net/,
    /actions\.google\.com\/sounds/,
    /\.woff2?$/, /\.ttf$/, /\.otf$/,
    /\.png$/, /\.jpg$/, /\.svg$/, /\.ico$/,
    /\.ogg$/, /\.mp3$/,
];

// ============================================================
// INSTALL — Pre-cache static assets
// ============================================================
self.addEventListener('install', event => {
    console.log(`[SW] Installing GharManager ${VERSION}`);
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => Promise.allSettled(
                STATIC_ASSETS.map(url =>
                    cache.add(url).catch(err =>
                        console.warn('[SW] Skipping:', url, err.message)
                    )
                )
            ))
            .then(() => {
                console.log('[SW] Static cache ready ✅');
                return self.skipWaiting();
            })
    );
});

// ============================================================
// ACTIVATE — Remove old caches
// ============================================================
self.addEventListener('activate', event => {
    const VALID = [STATIC_CACHE, DYNAMIC_CACHE, FIREBASE_CACHE];
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k.startsWith('gharmanager-') && !VALID.includes(k))
                    .map(k => {
                        console.log('[SW] Deleting old cache:', k);
                        return caches.delete(k);
                    })
            )
        ).then(() => {
            console.log('[SW] Activated ✅');
            self.clients.matchAll().then(clients =>
                clients.forEach(c => c.postMessage({ type: 'SW_UPDATED', version: VERSION }))
            );
            return self.clients.claim();
        })
    );
});

// ============================================================
// FETCH — Smart routing
// ============================================================
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = request.url;

    if (request.method !== 'GET') return;
    if (url.startsWith('chrome-extension://')) return;
    if (url.includes('sockjs') || url.includes('webpack')) return;

    // Firebase → Network First
    if (FIREBASE_PATTERNS.some(p => p.test(url))) {
        event.respondWith(strategyNetworkFirst(request, FIREBASE_CACHE, 4000));
        return;
    }
    // Static CDN → Cache First
    if (STATIC_PATTERNS.some(p => p.test(url))) {
        event.respondWith(strategyCacheFirst(request, STATIC_CACHE));
        return;
    }
    // Everything else → Stale While Revalidate
    event.respondWith(strategyStaleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ── Cache First ──────────────────────────────────────────────
async function strategyCacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response && response.ok && response.type !== 'opaque') {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        return buildOfflineResponse(request);
    }
}

// ── Network First with timeout ───────────────────────────────
async function strategyNetworkFirst(request, cacheName, timeoutMs = 5000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timer);
        if (response && response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch {
        clearTimeout(timer);
        const cached = await caches.match(request);
        return cached || buildOfflineResponse(request);
    }
}

// ── Stale While Revalidate ───────────────────────────────────
async function strategyStaleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const networkFetch = fetch(request)
        .then(response => {
            if (response && response.ok) cache.put(request, response.clone());
            return response;
        })
        .catch(() => null);
    return cached || await networkFetch || buildOfflineResponse(request);
}

// ── Offline Fallback ─────────────────────────────────────────
async function buildOfflineResponse(request) {
    const accept = request.headers.get('Accept') || '';
    if (accept.includes('text/html')) {
        const page = await caches.match('./offline.html') || await caches.match('/offline.html');
        if (page) return page;
    }
    return new Response(
        JSON.stringify({ offline: true, message: 'GharManager offline mode active' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
}

// ============================================================
// BACKGROUND SYNC
// ============================================================
self.addEventListener('sync', event => {
    console.log('[SW] Background Sync tag:', event.tag);
    if (event.tag === 'sync-expenses') {
        event.waitUntil(syncQueue('pendingExpenses', 'SYNC_EXPENSE'));
    }
    if (event.tag === 'sync-investments') {
        event.waitUntil(syncQueue('pendingInvestments', 'SYNC_INVESTMENT'));
    }
    if (event.tag === 'sync-all') {
        event.waitUntil(Promise.all([
            syncQueue('pendingExpenses', 'SYNC_EXPENSE'),
            syncQueue('pendingInvestments', 'SYNC_INVESTMENT'),
        ]));
    }
});

async function syncQueue(storeName, messageType) {
    const db    = await openIDB();
    const items = await idbGetAll(db, storeName);
    if (!items.length) return;

    console.log(`[SW] Syncing ${items.length} items from ${storeName}`);
    const clients = await self.clients.matchAll({ includeUncontrolled: true });

    for (const item of items) {
        clients.forEach(c => c.postMessage({ type: messageType, data: item }));
        await idbDelete(db, storeName, item.id);
    }

    self.registration.showNotification('☁️ GharManager Synced!', {
        body: `${items.length} pending ${storeName === 'pendingExpenses' ? 'kharche' : 'entries'} cloud pe save ho gaye! ✅`,
        icon: './icon.png',
        badge: './icon.png',
        tag: 'sync-success',
        vibrate: [100, 50, 100],
    });
}

// ============================================================
// PERIODIC SYNC — Daily reminders
// ============================================================
self.addEventListener('periodicsync', event => {
    if (event.tag === 'daily-reminder') event.waitUntil(sendDailyReminder());
    if (event.tag === 'budget-check')   event.waitUntil(sendBudgetAlert());
});

async function sendDailyReminder() {
    const hour = new Date().getHours();
    if (hour < 8 || hour > 21) return;
    return self.registration.showNotification('📊 GharManager Daily', {
        body: 'Aaj ka kharcha track kiya? Budget pe nazar rakho! 💰',
        icon: './icon.png',
        badge: './icon.png',
        tag: 'daily-reminder',
        vibrate: [200, 100, 200],
        data: { url: './' },
        actions: [
            { action: 'open',    title: '📱 Open App'   },
            { action: 'dismiss', title: '✖ Baad mein' },
        ],
    });
}

async function sendBudgetAlert() {
    const db   = await openIDB();
    const data = await idbGet(db, 'offlineData', 'budgetStatus');
    if (!data || data.percentage < 80) return;
    return self.registration.showNotification('⚠️ Budget Alert!', {
        body: `Aapka ${Math.round(data.percentage)}% budget use ho gaya! Sambhalo! 🚨`,
        icon: './icon.png',
        badge: './icon.png',
        tag: 'budget-alert',
        vibrate: [300, 100, 300, 100, 300],
        data: { url: './' },
    });
}

// ============================================================
// PUSH NOTIFICATIONS
// ============================================================
self.addEventListener('push', event => {
    let data = { title: '🏠 GharManager', body: 'Aapke liye ek update hai!' };
    try { if (event.data) data = { ...data, ...event.data.json() }; } catch { }
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: './icon.png',
            badge: './icon.png',
            tag: data.tag || 'gharmanager',
            data: { url: data.url || './' },
            vibrate: [200, 100, 200],
            renotify: true,
            actions: [
                { action: 'open',    title: '📱 Open'   },
                { action: 'dismiss', title: '✖ Dismiss' },
            ],
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    if (event.action === 'dismiss') return;
    const targetUrl = event.notification.data?.url || './';
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clients => {
                const win = clients.find(c => c.focused || c.url.includes('gharmanager'));
                if (win) { win.focus(); return win.navigate(targetUrl); }
                return self.clients.openWindow(targetUrl);
            })
    );
});

// ============================================================
// MESSAGE HANDLER
// ============================================================
self.addEventListener('message', event => {
    const { type, data } = event.data || {};
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'QUEUE_EXPENSE':
            openIDB().then(db => idbPut(db, 'pendingExpenses', {
                ...data, id: data.id || `exp_${Date.now()}`, timestamp: Date.now(),
            })).then(() => event.source?.postMessage({ type: 'QUEUED_OK', store: 'expenses' }));
            break;

        case 'QUEUE_INVESTMENT':
            openIDB().then(db => idbPut(db, 'pendingInvestments', {
                ...data, id: data.id || `inv_${Date.now()}`, timestamp: Date.now(),
            }));
            break;

        case 'SAVE_BUDGET_STATUS':
            openIDB().then(db => idbPut(db, 'offlineData', {
                key: 'budgetStatus', percentage: data.percentage, updated: Date.now(),
            }));
            break;

        case 'GET_PENDING_COUNT':
            openIDB().then(async db => {
                const exp = await idbGetAll(db, 'pendingExpenses');
                const inv = await idbGetAll(db, 'pendingInvestments');
                event.source?.postMessage({ type: 'PENDING_COUNT', expenses: exp.length, investments: inv.length });
            });
            break;

        case 'GET_CACHE_SIZE':
            getCacheSize().then(bytes =>
                event.source?.postMessage({ type: 'CACHE_SIZE', bytes })
            );
            break;

        case 'CLEAR_ALL_CACHE':
            caches.keys()
                .then(keys => Promise.all(keys.map(k => caches.delete(k))))
                .then(() => event.source?.postMessage({ type: 'CACHE_CLEARED' }));
            break;
    }
});

// ============================================================
// INDEXEDDB HELPERS
// ============================================================
function openIDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open('GharManagerDB', 4);
        req.onupgradeneeded = e => {
            const db = e.target.result;
            const stores = {
                pendingExpenses:    { keyPath: 'id' },
                pendingInvestments: { keyPath: 'id' },
                offlineData:        { keyPath: 'key' },
                settings:           { keyPath: 'key' },
            };
            for (const [name, config] of Object.entries(stores)) {
                if (!db.objectStoreNames.contains(name)) {
                    db.createObjectStore(name, { keyPath: config.keyPath });
                }
            }
        };
        req.onsuccess = e => resolve(e.target.result);
        req.onerror   = e => reject(e.target.error);
    });
}

const idbPut    = (db, s, d)    => new Promise((r, j) => { const req = db.transaction(s,'readwrite').objectStore(s).put(d); req.onsuccess=()=>r(req.result); req.onerror=()=>j(req.error); });
const idbGet    = (db, s, k)    => new Promise((r, j) => { const req = db.transaction(s,'readonly').objectStore(s).get(k); req.onsuccess=()=>r(req.result); req.onerror=()=>j(req.error); });
const idbGetAll = (db, s)       => new Promise((r, j) => { const req = db.transaction(s,'readonly').objectStore(s).getAll(); req.onsuccess=()=>r(req.result||[]); req.onerror=()=>j(req.error); });
const idbDelete = (db, s, k)    => new Promise((r, j) => { const req = db.transaction(s,'readwrite').objectStore(s).delete(k); req.onsuccess=()=>r(); req.onerror=()=>j(req.error); });

async function getCacheSize() {
    let total = 0;
    const names = await caches.keys();
    for (const name of names) {
        const cache = await caches.open(name);
        const reqs  = await cache.keys();
        for (const req of reqs) {
            const resp = await cache.match(req);
            if (resp) total += (await resp.blob()).size;
        }
    }
    return total;
}

console.log(`[SW] GharManager Pro ${VERSION} ready ✅`);
