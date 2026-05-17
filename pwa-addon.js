// ============================================================
// 🔥 GHARMANAGER PRO — PWA ADDON v4.0
// SW Registration · Install Prompt · Push Notifications
// Network Status UI · Update Banner · Background Sync
// ============================================================
// ▶ Include this AFTER script.js in index.html:
//   <script src="./pwa-addon.js?v=4"></script>
// ============================================================

(function() {
    'use strict';

    // ── Config ───────────────────────────────────────────────
    const SW_URL    = './sw.js';
    const SW_SCOPE  = './';

    let swRegistration   = null;
    let deferredInstall  = null; // BeforeInstallPromptEvent
    let isOnline         = navigator.onLine;

    // ============================================================
    // 1. SERVICE WORKER REGISTRATION
    // ============================================================
    async function registerSW() {
        if (!('serviceWorker' in navigator)) {
            console.warn('[PWA] Service Worker not supported in this browser.');
            return;
        }

        try {
            swRegistration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
            console.log('[PWA] SW registered, scope:', swRegistration.scope);

            // Detect update available
            swRegistration.addEventListener('updatefound', () => {
                const newWorker = swRegistration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        showUpdateBanner();
                    }
                });
            });

            // Request periodic sync (Chrome 80+)
            if ('periodicSync' in swRegistration) {
                try {
                    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
                    if (status.state === 'granted') {
                        await swRegistration.periodicSync.register('daily-reminder', { minInterval: 24 * 60 * 60 * 1000 });
                        await swRegistration.periodicSync.register('budget-check',   { minInterval: 12 * 60 * 60 * 1000 });
                        console.log('[PWA] Periodic sync registered ✅');
                    }
                } catch (e) { console.log('[PWA] Periodic sync not available:', e.message); }
            }

        } catch (err) {
            console.error('[PWA] SW registration failed:', err);
        }

        // Listen to messages from SW
        navigator.serviceWorker.addEventListener('message', onSWMessage);

        // Check for controller change (new SW took over)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[PWA] New SW controller active, reloading...');
            window.location.reload();
        });
    }

    // ============================================================
    // 2. SW MESSAGE HANDLER
    // ============================================================
    function onSWMessage(event) {
        const { type, data, version, bytes, expenses, investments } = event.data || {};

        switch (type) {
            case 'SW_UPDATED':
                console.log('[PWA] SW updated to', version);
                break;

            case 'SYNC_EXPENSE':
                // SW telling us to sync this offline expense to Firestore
                if (typeof db !== 'undefined' && typeof currentUser !== 'undefined' && currentUser && data) {
                    const uid = currentUser.uid;
                    db.collection('users').doc(uid).collection('expenses').doc(data.id).set(data)
                        .then(() => console.log('[PWA] Offline expense synced:', data.id))
                        .catch(e => console.error('[PWA] Expense sync error:', e));
                }
                break;

            case 'SYNC_INVESTMENT':
                if (typeof db !== 'undefined' && typeof currentUser !== 'undefined' && currentUser && data) {
                    const uid = currentUser.uid;
                    db.collection('users').doc(uid).collection('investments').doc(data.id).set(data)
                        .then(() => console.log('[PWA] Offline investment synced:', data.id))
                        .catch(e => console.error('[PWA] Investment sync error:', e));
                }
                break;

            case 'CACHE_SIZE':
                updateCacheSizeUI(bytes);
                break;

            case 'PENDING_COUNT':
                updatePendingUI(expenses, investments);
                break;

            case 'QUEUED_OK':
                showToast('📥 Offline save hua! Online hone pe sync hoga ☁️', 'info');
                break;

            case 'CACHE_CLEARED':
                showToast('🗑️ Cache cleared!', 'success');
                break;
        }
    }

    // ============================================================
    // 3. NETWORK STATUS — Live detection + beautiful UI
    // ============================================================
    function initNetworkMonitor() {
        updateNetworkUI(navigator.onLine);

        window.addEventListener('online', () => {
            isOnline = true;
            updateNetworkUI(true);
            triggerBackgroundSync();
            // Save last online time
            localStorage.setItem('lastCloudSync', Date.now().toString());
        });

        window.addEventListener('offline', () => {
            isOnline = false;
            updateNetworkUI(false);
        });
    }

    function updateNetworkUI(online) {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            banner.style.display = online ? 'none' : 'block';
        }

        // Update pending badge if exists
        if (!online) {
            postToSW({ type: 'GET_PENDING_COUNT' });
        }

        // If just came back online, show a success toast
        if (online && !isOnline) {
            showToast('🌐 Internet vapas aa gaya! Data sync ho raha hai ☁️', 'success');
        }
    }

    // ============================================================
    // 4. BACKGROUND SYNC TRIGGER
    // ============================================================
    async function triggerBackgroundSync() {
        if (!swRegistration) return;
        if (!('sync' in swRegistration)) {
            console.log('[PWA] Background Sync not supported, using fallback');
            fallbackSync();
            return;
        }
        try {
            await swRegistration.sync.register('sync-all');
            console.log('[PWA] Background sync registered ✅');
        } catch (e) {
            console.warn('[PWA] Sync register failed:', e.message);
            fallbackSync();
        }
    }

    function fallbackSync() {
        // Browser doesn't support Background Sync — do it ourselves
        const controller = navigator.serviceWorker.controller;
        if (controller) {
            controller.postMessage({ type: 'GET_PENDING_COUNT' });
        }
    }

    // ============================================================
    // 5. QUEUE OFFLINE DATA
    // ============================================================
    window.queueOfflineExpense = function(expenseData) {
        postToSW({
            type: 'QUEUE_EXPENSE',
            data: { ...expenseData, id: expenseData.id || `exp_${Date.now()}` },
        });
        // Also register sync
        if (swRegistration && 'sync' in swRegistration) {
            swRegistration.sync.register('sync-expenses').catch(() => {});
        }
    };

    window.queueOfflineInvestment = function(investData) {
        postToSW({
            type: 'QUEUE_INVESTMENT',
            data: { ...investData, id: investData.id || `inv_${Date.now()}` },
        });
        if (swRegistration && 'sync' in swRegistration) {
            swRegistration.sync.register('sync-investments').catch(() => {});
        }
    };

    // Call this after saving budget to keep SW updated for budget-check periodic sync
    window.saveBudgetStatus = function(percentage) {
        postToSW({ type: 'SAVE_BUDGET_STATUS', data: { percentage } });
    };

    // ============================================================
    // 6. INSTALL PROMPT — Beautiful custom UI
    // ============================================================
    window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredInstall = e;
        console.log('[PWA] Install prompt intercepted ✅');

        // Show install banner after 3 seconds if not installed
        const alreadyDismissed = localStorage.getItem('installBannerDismissed');
        if (!alreadyDismissed) {
            setTimeout(showInstallBanner, 3000);
        }
    });

    window.addEventListener('appinstalled', () => {
        console.log('[PWA] App installed! 🎉');
        hideInstallBanner();
        deferredInstall = null;
        showToast('🎉 GharManager install ho gaya! Home screen pe dekho!', 'success');
        if (typeof confetti !== 'undefined') {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
        localStorage.setItem('appInstalled', 'true');
    });

    function showInstallBanner() {
        if (document.getElementById('pwa-install-banner')) return;
        if (window.matchMedia('(display-mode: standalone)').matches) return; // already installed

        const banner = document.createElement('div');
        banner.id = 'pwa-install-banner';
        banner.innerHTML = `
            <div style="
                position: fixed; bottom: 90px; left: 12px; right: 12px; z-index: 9999999;
                background: white; border-radius: 24px;
                box-shadow: 0 16px 48px rgba(37,99,235,0.22), 0 4px 0 #1d4ed8;
                padding: 16px 18px; display: flex; align-items: center; gap: 14px;
                border: 1.5px solid #bfdbfe;
                animation: bannerSlide 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            ">
                <style>
                    @keyframes bannerSlide {
                        from { opacity: 0; transform: translateY(30px) scale(0.95); }
                        to   { opacity: 1; transform: translateY(0) scale(1); }
                    }
                </style>
                <img src="./icon.png" style="width:48px;height:48px;border-radius:14px;object-fit:cover;flex-shrink:0;">
                <div style="flex:1; min-width:0;">
                    <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:14px;font-weight:800;color:#0f172a;margin-bottom:2px;">
                        Install GharManager 📲
                    </div>
                    <div style="font-size:12px;color:#64748b;font-weight:600;line-height:1.4;">
                        Home screen pe add karo — bilkul app jaise!
                    </div>
                </div>
                <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0;">
                    <button onclick="triggerInstallPrompt()" style="
                        background:linear-gradient(135deg,#2563eb,#4f46e5);
                        color:white; border:none; border-radius:12px;
                        padding:8px 14px; font-size:12px; font-weight:800;
                        cursor:pointer; white-space:nowrap;
                        font-family:'Plus Jakarta Sans',sans-serif;
                    ">Install ✨</button>
                    <button onclick="dismissInstallBanner()" style="
                        background:transparent; color:#94a3b8;
                        border:none; font-size:11px; font-weight:700;
                        cursor:pointer; font-family:'Plus Jakarta Sans',sans-serif;
                    ">Not now</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }

    function hideInstallBanner() {
        const banner = document.getElementById('pwa-install-banner');
        if (banner) banner.remove();
    }

    window.dismissInstallBanner = function() {
        hideInstallBanner();
        localStorage.setItem('installBannerDismissed', Date.now().toString());
    };

    window.triggerInstallPrompt = async function() {
        if (!deferredInstall) {
            showToast('Pehle se install hai ya browser support nahi karta!', 'info');
            return;
        }
        hideInstallBanner();
        deferredInstall.prompt();
        const { outcome } = await deferredInstall.userChoice;
        console.log('[PWA] Install outcome:', outcome);
        deferredInstall = null;
    };

    // ============================================================
    // 7. UPDATE BANNER
    // ============================================================
    function showUpdateBanner() {
        if (document.getElementById('pwa-update-banner')) return;

        const banner = document.createElement('div');
        banner.id = 'pwa-update-banner';
        banner.innerHTML = `
            <div style="
                position: fixed; top: 0; left: 0; right: 0; z-index: 99999999;
                background: linear-gradient(135deg, #0f172a, #1e3a8a);
                color: white; padding: 12px 16px;
                display: flex; align-items: center; justify-content: space-between; gap: 12px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            ">
                <style>@keyframes slideDown { from{transform:translateY(-100%)} to{transform:translateY(0)} }</style>
                <div style="display:flex;align-items:center;gap:10px;">
                    <span style="font-size:20px;">⚡</span>
                    <div>
                        <div style="font-size:13px;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif;">
                            New Update Available!
                        </div>
                        <div style="font-size:11px;color:#93c5fd;font-weight:600;">
                            GharManager v4.0 ready hai
                        </div>
                    </div>
                </div>
                <div style="display:flex;gap:8px;flex-shrink:0;">
                    <button onclick="applyUpdate()" style="
                        background:#2563eb;color:white;border:none;border-radius:10px;
                        padding:8px 14px;font-size:12px;font-weight:800;cursor:pointer;
                        font-family:'Plus Jakarta Sans',sans-serif;
                    ">Update 🚀</button>
                    <button onclick="document.getElementById('pwa-update-banner').remove()" style="
                        background:rgba(255,255,255,0.12);color:white;border:none;
                        border-radius:10px;padding:8px 10px;font-size:12px;cursor:pointer;
                    ">✕</button>
                </div>
            </div>
        `;
        document.body.appendChild(banner);
    }

    window.applyUpdate = function() {
        const banner = document.getElementById('pwa-update-banner');
        if (banner) banner.remove();
        postToSW({ type: 'SKIP_WAITING' });
    };

    // ============================================================
    // 8. PUSH NOTIFICATION PERMISSION
    // ============================================================
    window.requestPushPermission = async function() {
        if (!('Notification' in window)) {
            showToast('Yeh browser notifications support nahi karta!', 'info');
            return false;
        }
        if (Notification.permission === 'granted') return true;
        if (Notification.permission === 'denied') {
            showToast('Notifications blocked hain — browser settings check karo!', 'info');
            return false;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            showToast('🔔 Notifications on! Ab alerts milenge!', 'success');
            return true;
        }
        return false;
    };

    // ── Send a local notification (no server needed) ─────────
    window.sendLocalNotification = function(title, body, options = {}) {
        if (Notification.permission !== 'granted') return;
        if (!swRegistration) return;
        swRegistration.showNotification(title, {
            body,
            icon: './icon.png',
            badge: './icon.png',
            vibrate: [200, 100, 200],
            tag: options.tag || 'gharmanager',
            data: { url: options.url || './' },
            ...options,
        });
    };

    // ── Schedule a bill reminder ─────────────────────────────
    window.scheduleBillReminder = function(billName, daysLeft) {
        if (daysLeft <= 3 && Notification.permission === 'granted') {
            sendLocalNotification(
                `⚡ Bill Reminder: ${billName}`,
                `Sirf ${daysLeft} din bacha! Jaldi pay karo! 🚨`,
                { tag: `bill-${billName}`, url: './' }
            );
        }
    };

    // ============================================================
    // 9. CACHE MANAGEMENT UI (for profile/settings screen)
    // ============================================================
    window.showCacheInfo = function() {
        postToSW({ type: 'GET_CACHE_SIZE' });
        postToSW({ type: 'GET_PENDING_COUNT' });
    };

    window.clearAppCache = function() {
        postToSW({ type: 'CLEAR_ALL_CACHE' });
    };

    function updateCacheSizeUI(bytes) {
        const el = document.getElementById('cache-size-display');
        if (el) el.textContent = `${(bytes / 1048576).toFixed(1)} MB`;
    }

    function updatePendingUI(expenses, investments) {
        const total = (expenses || 0) + (investments || 0);
        const el = document.getElementById('pending-sync-count');
        if (el) el.textContent = total > 0 ? `${total} pending` : 'All synced ✅';

        // Show a badge on the offline banner
        if (total > 0 && !isOnline) {
            const banner = document.getElementById('offline-banner');
            if (banner) {
                banner.textContent = `📶 Offline — ${total} items pending sync`;
            }
        }
    }

    // ============================================================
    // 10. TOAST HELPER
    // ============================================================
    function showToast(message, type = 'info') {
        // Reuse SweetAlert2 toast if available
        if (typeof Swal !== 'undefined') {
            const icons = { success: 'success', info: 'info', error: 'error' };
            Swal.fire({
                toast: true,
                position: 'top',
                icon: icons[type] || 'info',
                title: message,
                timer: 3000,
                showConfirmButton: false,
                timerProgressBar: true,
            });
            return;
        }
        // Fallback: native toast
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position:fixed; top:16px; left:50%; transform:translateX(-50%);
            background:#0f172a; color:white; padding:12px 20px;
            border-radius:100px; font-size:13px; font-weight:700;
            z-index:99999999; white-space:nowrap;
            box-shadow:0 8px 24px rgba(0,0,0,0.3);
            animation:fadeIn 0.3s ease both;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // ============================================================
    // 11. HELPER: postMessage to SW controller
    // ============================================================
    function postToSW(message) {
        const sw = navigator.serviceWorker?.controller;
        if (sw) sw.postMessage(message);
    }

    // ============================================================
    // 12. SHORTCUT PARAMS — Handle manifest shortcuts
    // ============================================================
    function handleStartupParams() {
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action');
        const tab    = params.get('tab');

        if (!action && !tab) return;

        // Wait for app to fully load then trigger action
        setTimeout(() => {
            if (action === 'add-expense') {
                const btn = document.getElementById('add-expense-btn') ||
                            document.querySelector('[onclick*="addExpense"]');
                if (btn) btn.click();
            }
            if (action === 'jars') {
                if (typeof openJarSystem === 'function') openJarSystem();
            }
            if (action === 'udhar') {
                if (typeof openIOwe === 'function') openIOwe();
            }
            if (tab === 'budget') {
                const navBudget = document.querySelector('[onclick*="budget"]');
                if (navBudget) navBudget.click();
            }
        }, 3000);
    }

    // ============================================================
    // 🚀 INIT
    // ============================================================
    document.addEventListener('DOMContentLoaded', () => {
        registerSW();
        initNetworkMonitor();
        handleStartupParams();
        console.log('[PWA] GharManager PWA Addon v4.0 initialized ✅');
    });

})();
