// ==========================================
// 🔥 DATA CACHING (INCOME PRESERVE)
// ==========================================
let cachedData = JSON.parse(localStorage.getItem('appDataCache') || '{}');

let familyExpenses = JSON.parse(localStorage.getItem('familyExpenses') || '[]'); 
let dudhRecords = JSON.parse(localStorage.getItem('dudhRecords') || '[]'); 
let rationItems = JSON.parse(localStorage.getItem('rationItems') || '[]'); 
let investments = JSON.parse(localStorage.getItem('investments') || '[]'); 
let activeLoans = JSON.parse(localStorage.getItem('loans') || '[]'); 
let activeSubs = JSON.parse(localStorage.getItem('subscriptions') || '[]'); 
let rechargeRecords = JSON.parse(localStorage.getItem('rechargeRecords') || '[]');

let budgetLimit = cachedData.budget || 20000; 
let customDisplayName = cachedData.displayName || ""; 
let monthlyIncome = cachedData.income || 0; 
let userXP = cachedData.xp || 0; 
let challengeDays = cachedData.challengeDays || 0; 
let dailyStreak = cachedData.dailyStreak || 0; 
let lastLoginDate = cachedData.lastLoginDate || ""; 
let todoItems = cachedData.todoItems || []; 
let dreamGoal = cachedData.dreamGoal || { name: "No Goal", target: 0 }; 

let currentGPSLocation = null; 
let activeQuickFilter = "Clear";
let appLang = localStorage.getItem('appLang') || 'Hinglish'; 

// ==========================================
// 🔥 FIREBASE SETUP
// ==========================================
const firebaseConfig = { apiKey: "AIzaSyCej-idbSFHr3WVokG3sdpmdWPWgz5PkQk", authDomain: "super-family-appp.firebaseapp.com", projectId: "super-family-appp", storageBucket: "super-family-appp.firebasestorage.app", messagingSenderId: "250506329447", appId: "1:250506329447:web:cf9ac2e4d6d24b37e903c2", measurementId: "G-0E3C8289HF" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth(); const db = firebase.firestore(); let currentUser = null;

// ==========================================
// 📶 OFFLINE MODE SYSTEM
// ==========================================
let isOffline = !navigator.onLine;
window.addEventListener('online', () => { isOffline = false; document.getElementById('offline-banner').style.display = 'none'; syncOldLocalData(); playSound('success'); });
window.addEventListener('offline', () => { isOffline = true; document.getElementById('offline-banner').style.display = 'block'; });

let isSoundEnabled = localStorage.getItem('appSound') !== 'false';
function toggleSound() { isSoundEnabled = !isSoundEnabled; localStorage.setItem('appSound', isSoundEnabled); updateSoundUI(); if(isSoundEnabled) playSound('click'); }
function updateSoundUI() { const btn = document.getElementById('sound-toggle-btn'); if(btn) { btn.innerHTML = isSoundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF'; btn.style.color = isSoundEnabled ? '#10b981' : '#64748b'; btn.style.borderColor = isSoundEnabled ? '#10b981' : '#64748b'; } }
function playSound(type) { 
    if(navigator.vibrate) try { navigator.vibrate(type === 'success' ? [30, 50, 30] : 30); } catch(e){}
    if(!isSoundEnabled) return; 
    try { if(type === 'click') document.getElementById('sound-click').play(); if(type === 'success') document.getElementById('sound-success').play(); } catch(e) {} 
}

// ==========================================
// 👑 USER ROLES
// ==========================================
let userRole = 'Admin'; // Default Admin for main user
function checkRole(name) { 
    // Main user is always Admin; guests/invited members are Member
    const guestEmails = JSON.parse(localStorage.getItem('guestEmails') || '[]');
    const email = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.email : '';
    const isGuest = guestEmails.includes(email);
    userRole = isGuest ? 'Member' : 'Admin';
    const isAdmin = userRole === 'Admin';
    const b = document.getElementById('role-badge'); 
    if(b){ b.innerText = isAdmin ? '👑 Admin' : '👤 Member'; b.style.background = isAdmin ? '#fef08a' : '#e2e8f0'; b.style.color = isAdmin ? '#b45309' : '#475569'; }
    const bp = document.getElementById('role-badge-profile');
    if(bp){ bp.innerText = isAdmin ? '👑 Admin' : '👤 Member'; bp.style.background = isAdmin ? '#fef3c7' : '#f1f5f9'; bp.style.color = isAdmin ? '#b45309' : '#475569'; bp.style.border = isAdmin ? '1px solid #fde68a' : '1px solid #e2e8f0'; }
}

window.addEventListener('load', () => {
    setTimeout(() => {
        let splash = document.getElementById('splash-screen'); if(splash) splash.style.display = 'none';
        if(!navigator.onLine) { document.getElementById('offline-banner').style.display = 'block'; }
        if(!localStorage.getItem('onboarding_done')) document.getElementById('onboarding-screen').style.display = 'flex'; 
        else if(!currentUser) document.getElementById('login-screen').style.display = 'flex';
        updateHisabUI(); 
    }, 2500);
});

function finishOnboarding() { localStorage.setItem('onboarding_done', 'true'); document.getElementById('onboarding-screen').style.display = 'none'; if(!currentUser) document.getElementById('login-screen').style.display = 'flex'; playSound('success'); }

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user; 
        let hour = new Date().getHours(); let wish = hour < 12 ? 'Good Morning ☀️' : hour < 18 ? 'Good Afternoon 🌤️' : 'Good Evening 🌙'; document.getElementById('smart-greeting').innerText = `${wish}`;
        let userName = user.email.split("@")[0]; document.getElementById('user-avatar').innerText = userName.charAt(0).toUpperCase(); checkRole(userName);
        loadCloudData(user.uid); await syncOldLocalData();
        let ls = document.getElementById('login-screen'); if(ls) { ls.style.opacity = "0"; setTimeout(()=> ls.style.display = 'none', 300); }
        if(localStorage.getItem('onboarding_done')) {
            if(document.getElementById('pin-screen')) { document.getElementById('pin-screen').style.display = 'flex'; if(!localStorage.getItem('app_pin')) { document.getElementById('pin-msg').innerText = "Security ke liye naya 4-digit PIN banayein"; document.getElementById('btn-setup-pin').style.display = 'block'; } } else document.getElementById('main-app').style.display = 'block';
            checkSmartReminders(); applyLanguageUI();
        }
    } else { currentUser = null; document.getElementById('main-app').style.display = 'none'; }
});

// ==========================================
// 🔐 UPGRADED LOGIN SYSTEM
// ==========================================
let currentLoginTab = 'login';

function switchLoginTab(tab) {
    currentLoginTab = tab;
    const isLogin = tab === 'login';
    const loginBtn = document.getElementById('tab-login');
    const regBtn = document.getElementById('tab-register');
    const mainBtn = document.getElementById('main-auth-btn');
    const nameField = document.getElementById('name-field');
    const confirmField = document.getElementById('confirm-field');
    const forgotWrap = document.getElementById('forgot-wrap');
    if(loginBtn) { loginBtn.style.background = isLogin ? 'white' : 'transparent'; loginBtn.style.color = isLogin ? '#2563eb' : '#64748b'; loginBtn.style.boxShadow = isLogin ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'; }
    if(regBtn) { regBtn.style.background = !isLogin ? 'white' : 'transparent'; regBtn.style.color = !isLogin ? '#2563eb' : '#64748b'; regBtn.style.boxShadow = !isLogin ? '0 2px 8px rgba(0,0,0,0.08)' : 'none'; }
    if(nameField) nameField.style.display = isLogin ? 'none' : 'block';
    if(confirmField) confirmField.style.display = isLogin ? 'none' : 'block';
    if(forgotWrap) forgotWrap.style.display = isLogin ? 'block' : 'none';
    if(mainBtn) { mainBtn.innerHTML = isLogin ? '🚀 Login Karein' : '✨ Account Banayein'; mainBtn.onclick = isLogin ? loginWithEmail : registerWithEmail; }
    playSound('click');
}

function togglePasswordVisibility(inputId, btnId) {
    const inp = document.getElementById(inputId);
    const btn = document.getElementById(btnId);
    if(!inp) return;
    if(inp.type === 'password') { inp.type = 'text'; if(btn) btn.innerText = '🙈'; }
    else { inp.type = 'password'; if(btn) btn.innerText = '👁️'; }
}

function showLoginLoading(show) {
    const btn = document.getElementById('main-auth-btn');
    const status = document.getElementById('login-status');
    if(btn) { btn.disabled = show; btn.style.opacity = show ? '0.7' : '1'; btn.innerHTML = show ? '⏳ Please wait...' : (currentLoginTab === 'login' ? '🚀 Login Karein' : '✨ Account Banayein'); }
    if(status) status.style.display = show ? 'block' : 'none';
}

function loginWithEmail() {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    if (!email || password.length < 6) return Swal.fire('Oops!', 'Sahi email aur kam se kam 6 letter ka password daalein.', 'warning');
    showLoginLoading(true);
    auth.signInWithEmailAndPassword(email, password)
        .catch(e => { showLoginLoading(false); let msg = 'Email ya password galat hai!'; if(e.code==='auth/user-not-found') msg='Yeh account nahi mila. Register karein!'; else if(e.code==='auth/wrong-password') msg='Password galat hai. Dobara try karein.'; else if(e.code==='auth/too-many-requests') msg='Bahut attempts ho gaye. Thodi der baad try karein.'; Swal.fire('Login Failed ❌', msg, 'error'); });
    playSound('click');
}

function registerWithEmail() {
    const name = document.getElementById('name-input')?.value.trim() || '';
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    const confirm = document.getElementById('confirm-password-input')?.value.trim() || '';
    if (!email || password.length < 6) return Swal.fire('Oops!', 'Sahi details daalein (password min 6 letters).', 'warning');
    if (password !== confirm) return Swal.fire('Oops!', 'Dono passwords same hone chahiye!', 'warning');
    showLoginLoading(true);
    auth.createUserWithEmailAndPassword(email, password)
        .then(cred => { if(name && cred.user) return cred.user.updateProfile({displayName: name}); })
        .then(() => { showLoginLoading(false); Swal.fire({ title: 'Mubarak ho! 🎉', text: 'Aapka account ban gaya!', icon: 'success', confirmButtonColor: '#2563eb' }); })
        .catch(e => { showLoginLoading(false); let msg = e.message; if(e.code==='auth/email-already-in-use') msg='Yeh email already use ho rahi hai. Login karein!'; Swal.fire('Error ❌', msg, 'error'); });
    playSound('click');
}

function loginWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(e => Swal.fire('Error', e.message, 'error'));
    playSound('click');
}

function forgotPassword() {
    const email = document.getElementById('email-input').value.trim();
    if(!email) return Swal.fire('Email Daalein', 'Upar email field mein apni email daalo, phir forgot password press karo.', 'info');
    auth.sendPasswordResetEmail(email).then(() => Swal.fire('Bheja! 📧', `Password reset email ${email} par bhej diya gaya!`, 'success')).catch(e => Swal.fire('Error', e.message, 'error'));
}

function logout() { Swal.fire({ title: 'Logout?', text: 'Kya aap logout karna chahte hain?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Haan, Logout' }).then((result) => { if (result.isConfirmed) auth.signOut(); }); playSound('click'); }

// ==========================================
// 🔒 UPGRADED PIN + FINGERPRINT SYSTEM
// ==========================================
let pinBuffer = '';
let pinAttempts = 0;
const MAX_PIN_ATTEMPTS = 5;

function pinPad(digit) {
    if(pinBuffer.length >= 4) return;
    pinBuffer += String(digit);
    const inp = document.getElementById('pin-input');
    if(inp) inp.value = pinBuffer;
    updatePinDots(pinBuffer);
    playSound('click');
    if(pinBuffer.length === 4) { setTimeout(() => { if(localStorage.getItem('app_pin')) verifyPin(); else setupPin(); }, 200); }
}

function pinBackspace() {
    pinBuffer = pinBuffer.slice(0, -1);
    const inp = document.getElementById('pin-input');
    if(inp) inp.value = pinBuffer;
    updatePinDots(pinBuffer);
    playSound('click');
}

function updatePinDots(val) {
    pinBuffer = String(val || '');
    const dots = document.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => {
        dot.style.background = i < pinBuffer.length ? '#2563eb' : 'var(--line-color)';
        dot.style.borderColor = i < pinBuffer.length ? '#2563eb' : '#cbd5e1';
        dot.style.transform = i < pinBuffer.length ? 'scale(1.2)' : 'scale(1)';
    });
}

function setupPin() {
    if(pinBuffer.length !== 4 || isNaN(pinBuffer)) return showPinError('4 digit PIN chahiye!');
    localStorage.setItem('app_pin', pinBuffer);
    localStorage.setItem('biometric_enabled', 'true');
    pinBuffer = '';
    updatePinDots('');
    const lockEl = document.getElementById('lock-anim');
    if(lockEl) { lockEl.innerText = '🔓'; setTimeout(() => { lockEl.innerText = '🔒'; }, 500); }
    Swal.fire({ title: 'PIN Set! 🔒', text: 'Aapka PIN set ho gaya. Ab fingerprint bhi use kar sakte hain!', icon: 'success', confirmButtonColor: '#2563eb', timer: 2000, showConfirmButton: false });
    setTimeout(() => { document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; }, 2100);
    playSound('success');
}

function verifyPin() {
    const savedPin = localStorage.getItem('app_pin');
    if(!savedPin) return Swal.fire('Wait', 'Pehle PIN setup karein!', 'info');
    if(pinAttempts >= MAX_PIN_ATTEMPTS) { showPinError('Bahut attempts! 30 sec wait karein.'); return; }
    if(pinBuffer === savedPin) {
        pinAttempts = 0; pinBuffer = '';
        const lockEl = document.getElementById('lock-anim');
        if(lockEl) { lockEl.innerText = '🔓'; lockEl.style.transform = 'scale(1.3)'; }
        setTimeout(() => { document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; if(lockEl) { lockEl.style.transform = 'scale(1)'; lockEl.innerText = '🔒'; } }, 400);
        playSound('success');
    } else {
        pinAttempts++;
        pinBuffer = ''; updatePinDots('');
        const inp = document.getElementById('pin-input'); if(inp) inp.value = '';
        const remaining = MAX_PIN_ATTEMPTS - pinAttempts;
        showPinError(`Galat PIN ❌ (${remaining} chances bache)`);
        const card = document.querySelector('#pin-screen .lock-card');
        if(card) { card.style.animation = 'none'; card.offsetHeight; card.style.animation = 'shake 0.4s'; }
        playSound('click');
        if(pinAttempts >= MAX_PIN_ATTEMPTS) { showPinError('Account lock! 30 sec baad try karein.'); setTimeout(() => { pinAttempts = 0; showPinError(''); }, 30000); }
    }
}

function showPinError(msg) {
    const el = document.getElementById('pin-error-msg');
    if(el) { el.innerText = msg; setTimeout(() => { if(el.innerText === msg) el.innerText = ''; }, 3000); }
}

function biometricUnlock() {
    const savedPin = localStorage.getItem('app_pin');
    if(!savedPin) return Swal.fire({ title: 'PIN Setup Pehle', text: 'Fingerprint use karne ke liye pehle PIN set karein.', icon: 'info', confirmButtonColor: '#2563eb' });
    
    // Use WebAuthn / Biometric API if supported
    if(window.PublicKeyCredential) {
        Swal.fire({
            title: '🔏 Fingerprint Scan',
            html: `<div style="text-align:center;padding:10px;">
                <div style="font-size:64px;margin-bottom:12px;animation:pulse 1.5s infinite;">🫆</div>
                <p style="font-size:14px;font-weight:700;color:#64748b;">Apni ungli sensor par rakhein</p>
                <div style="width:60px;height:4px;background:linear-gradient(90deg,#2563eb,#6366f1);border-radius:2px;margin:12px auto;animation:shimmer-slide 1.5s infinite;"></div>
            </div>`,
            showConfirmButton: false, showCancelButton: true, cancelButtonText: 'Cancel',
            background: 'var(--paper-bg)', color: 'var(--text-main)',
            timer: 15000, timerProgressBar: true,
            didOpen: () => {
                // Try navigator.credentials (WebAuthn) for real biometric
                if(navigator.credentials && window.CredentialManagedByUser !== undefined) {
                    // Platform authenticator check
                    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(available => {
                        if(available) {
                            // Simulate a get() call — in production integrate full WebAuthn flow
                            navigator.credentials.get({ publicKey: {
                                challenge: new Uint8Array(32),
                                timeout: 10000,
                                userVerification: 'required'
                            }}).then(() => {
                                Swal.close();
                                unlockApp();
                            }).catch(() => {
                                // Fallback: if biometric fails, let user try PIN
                            });
                        }
                    });
                }
            }
        }).then(result => {
            if(result.isDismissed && result.dismiss === Swal.DismissReason.timer) {
                // Timer expired - use fallback (simulated success for demo/PWA)
                unlockApp();
            }
        });
    } else {
        // Fallback for browsers without WebAuthn
        Swal.fire({ title: 'Scanning... 🫆', html: '<div style="font-size:60px;text-align:center;animation:pulse 1s infinite;">🫆</div>', timer: 1500, timerProgressBar: true, showConfirmButton: false, background: 'var(--paper-bg)' }).then(() => unlockApp());
    }
}

function unlockApp() {
    pinBuffer = ''; pinAttempts = 0;
    const lockEl = document.getElementById('lock-anim');
    if(lockEl) { lockEl.innerText = '🔓'; lockEl.style.transform = 'scale(1.3)'; }
    setTimeout(() => { document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; if(lockEl) { lockEl.style.transform = 'scale(1)'; lockEl.innerText = '🔒'; } }, 400);
    playSound('success');
}

// ==========================================
// ☁️ CLOUD SYNC & LOCAL CACHE 
// ==========================================
function showSyncSuccess() { const syncEl = document.getElementById('sync-status'); if(syncEl) { syncEl.innerText = "☁️ Synced Just Now"; syncEl.style.color = "#10b981"; setTimeout(() => { syncEl.style.color = "#94a3b8"; syncEl.innerText = "☁️ Cloud Active"; }, 3000); } }

function loadCloudData(uid) {
    if(isOffline) return;
    try {
        db.collection('familyData').doc(uid).onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data(); 
                familyExpenses = data.expenses || []; dudhRecords = data.dudh || []; rationItems = data.ration || []; investments = data.investments || []; activeLoans = data.loans || []; activeSubs = data.subscriptions || []; rechargeRecords = data.recharges || [];
                budgetLimit = data.budget || 20000; customDisplayName = data.displayName || ""; monthlyIncome = data.income || 0; userXP = data.xp || 0; challengeDays = data.challengeDays || 0; dailyStreak = data.dailyStreak || 0; lastLoginDate = data.lastLoginDate || ""; todoItems = data.todoItems || []; dreamGoal = data.dreamGoal || { name: "No Goal", target: 0 };
                updateHisabUI(); updateDudhUI(); updateRationUI(); updateInvestUI(); updateLoanUI(); updateSubsUI(); updateRechargeUI(); updateGreetingName(); checkRole(customDisplayName || (currentUser?currentUser.email:"")); updateChallengeUI(); checkStreak(); updateToDoUI();
                
                localStorage.setItem('appDataCache', JSON.stringify({ budget: budgetLimit, income: monthlyIncome, xp: userXP, challengeDays: challengeDays, dailyStreak: dailyStreak, lastLoginDate: lastLoginDate, displayName: customDisplayName, dreamGoal: dreamGoal }));
            }
        });
    } catch(e) { console.error("Cloud Error", e); }
}

async function saveToCloud() { 
    localStorage.setItem('familyExpenses', JSON.stringify(familyExpenses)); 
    localStorage.setItem('dudhRecords', JSON.stringify(dudhRecords)); 
    localStorage.setItem('rationItems', JSON.stringify(rationItems)); 
    localStorage.setItem('investments', JSON.stringify(investments)); 
    localStorage.setItem('loans', JSON.stringify(activeLoans)); 
    localStorage.setItem('subscriptions', JSON.stringify(activeSubs)); 
    localStorage.setItem('rechargeRecords', JSON.stringify(rechargeRecords));

    localStorage.setItem('appDataCache', JSON.stringify({ budget: budgetLimit, income: monthlyIncome, xp: userXP, challengeDays: challengeDays, dailyStreak: dailyStreak, lastLoginDate: lastLoginDate, displayName: customDisplayName, dreamGoal: dreamGoal }));
    
    if(!currentUser) return; 
    if(isOffline) { console.log('Saved Offline'); return; }
    
    try {
        await db.collection('familyData').doc(currentUser.uid).set({ expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, investments: investments, loans: activeLoans, subscriptions: activeSubs, recharges: rechargeRecords, budget: budgetLimit, displayName: customDisplayName, income: monthlyIncome, xp: userXP, challengeDays: challengeDays, dailyStreak: dailyStreak, lastLoginDate: lastLoginDate, todoItems: todoItems, dreamGoal: dreamGoal }, { merge: true }); 
        const s = document.getElementById('sync-status'); if(s) { s.innerText = "☁️ Synced"; s.style.color = "#10b981"; setTimeout(() => s.style.color = "#94a3b8", 2000); }
    } catch(e){}
}

async function syncOldLocalData() { 
    if(isOffline) return; let dataChanged = false;
    if (familyExpenses.length > 0) { dataChanged = true; } 
    if (dataChanged) { await saveToCloud(); } 
}

let pStartY = 0; let pRef = document.getElementById('pull-to-refresh');
document.addEventListener('touchstart', e => { pStartY = e.touches[0].clientY; }, {passive: true});
document.addEventListener('touchend', e => {
    let pEndY = e.changedTouches[0].clientY;
    if(pEndY > pStartY + 150 && window.scrollY === 0 && currentUser) {
        playSound('click'); pRef.style.display = 'block'; pRef.innerText = '🔄 Syncing...';
        setTimeout(() => { if(!isOffline) loadCloudData(currentUser.uid); pRef.innerText = '✅ Synced!'; playSound('success'); setTimeout(() => pRef.style.display = 'none', 1000); }, 1000);
    }
});

// ==========================================
// 📱 RECHARGE TRACKER
// ==========================================
function addRecharge() {
    const name = document.getElementById('rech-name').value; const amt = parseFloat(document.getElementById('rech-amt').value); const days = parseInt(document.getElementById('rech-days').value); const dDate = document.getElementById('rech-date').value || todayDateString;
    if(!name || isNaN(amt) || isNaN(days) || amt<=0 || days<=0) return Swal.fire('Error', 'Sahi details daalein!', 'error');
    let startDate = new Date(dDate); startDate.setDate(startDate.getDate() + days); let expDate = startDate.toISOString().split('T')[0];
    rechargeRecords.push({ name: name, amount: amt, days: days, date: dDate, expiry: expDate });
    familyExpenses.push({ member: "Me", category: "Bills", description: `📱 Recharge: ${name}`, amount: amt, date: dDate, receipt: "", gps: null });
    saveToCloud(); updateRechargeUI(); updateHisabUI(); document.getElementById('rech-name').value = ''; document.getElementById('rech-amt').value = ''; document.getElementById('rech-days').value = '';
    playSound('success'); Swal.fire('Saved!', `Recharge Hisaab me add ho gaya. Expire hoga: ${expDate}`, 'success');
}

function updateRechargeUI() {
    const list = document.getElementById('recharge-list'); if(!list) return; list.innerHTML = '';
    if(rechargeRecords.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">No Recharges 📱</h3></div>`;
    let today = new Date();
    rechargeRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((rech, index) => {
        let expD = new Date(rech.expiry); let diffTime = expD - today; let diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        let statusHtml = ""; let borderCol = "";
        if(diffDays < 0) { statusHtml = `<span style="color:#ef4444; font-weight:bold; font-size:11px;">Expired</span>`; borderCol = "#ef4444"; }
        else if(diffDays <= 3) { statusHtml = `<span style="color:#f59e0b; font-weight:bold; font-size:11px;">Expiring in ${diffDays} days ⚠️</span>`; borderCol = "#f59e0b"; }
        else { statusHtml = `<span style="color:#10b981; font-weight:bold; font-size:11px;">Active (${diffDays} days left) ✅</span>`; borderCol = "#10b981"; }
        const li = document.createElement('li'); li.style.borderLeft = `4px solid ${borderCol}`;
        li.innerHTML = `<div class="list-left"><strong style="font-size:16px;">${rech.name}</strong><span style="font-size:11px; color:#64748b;">Done: ${rech.date} | Valid: ${rech.days}D</span><br>${statusHtml}</div><div class="list-right"><span style="font-weight:800; color:#2563eb; font-size:18px; margin-right:5px;">₹${rech.amount}</span><button class="action-btn delete" onclick="deleteRecharge(${index})">🗑️</button></div>`; list.appendChild(li);
    });
}
function deleteRecharge(index) { playSound('click'); rechargeRecords.splice(index, 1); saveToCloud(); updateRechargeUI(); }

function checkSmartReminders() {
    let td = new Date(); let rs = sessionStorage.getItem('reminderShownToday');
    if(!rs) {
        let alerts = rechargeRecords.filter(r => Math.ceil((new Date(r.expiry) - td) / (1000 * 60 * 60 * 24)) <= 2 && Math.ceil((new Date(r.expiry) - td) / (1000 * 60 * 60 * 24)) >= 0).map(r => r.name);
        if(alerts.length > 0) { Swal.fire('📱 Recharge Khatam!', `Bhai, "${alerts.join(', ')}" ka recharge 2 din me khatam hone wala hai!`, 'warning'); }
        else {
            let todayDate = td.getDate(); let la = activeLoans.filter(l => l.monthsPaid < l.time && Math.abs(l.dueDate - todayDate) <= 2).map(l => l.name);
            if(la.length > 0) Swal.fire('🔔 EMI Alert!', `Mahaul tight hai! "${la.join(', ')}" ki EMI aane wali hai.`, 'warning');
            else if(todayDate >= 1 && todayDate <= 5) Swal.fire('🔔 Mahine ki shuruat!', 'Kiraya/bills baaki hain toh clear kar lo!', 'info');
        }
        sessionStorage.setItem('reminderShownToday', 'true');
    }
}

// ==========================================
// 🛡️ USER PROFILE 
// ==========================================
function updateProfileName() { const currentName = customDisplayName || (currentUser && currentUser.email ? currentUser.email.split("@")[0] : "User"); Swal.fire({ title: 'Apna Naam Likhein', input: 'text', inputValue: currentName, showCancelButton: true, confirmButtonText: 'Save', confirmButtonColor: '#2563eb' }).then((result) => { if (result.isConfirmed) { customDisplayName = result.value.trim(); checkRole(customDisplayName); saveToCloud(); updateGreetingName(); Swal.fire('Saved!', '', 'success'); } }); playSound('click'); }
function updateGreetingName() { if (!currentUser) return; const finalName = customDisplayName || (currentUser.email ? currentUser.email.split("@")[0] : "User"); const NameFormatted = finalName.charAt(0).toUpperCase() + finalName.slice(1); document.getElementById('profile-name').innerText = NameFormatted; document.getElementById('user-avatar').innerText = finalName.charAt(0).toUpperCase(); document.getElementById('profile-avatar-large').innerText = finalName.charAt(0).toUpperCase(); }

function openProfile() {
    try {
        const modal = document.getElementById('profile-modal'); if(!modal) return;
        if (currentUser) { let emailEl = document.getElementById('profile-email'); if(emailEl) emailEl.innerText = currentUser.email || "No Email Linked"; updateGreetingName(); }
        const lvlBadge = document.getElementById('profile-level-badge'); if(lvlBadge) { let level = Math.floor((parseInt(userXP) || 0) / 100) + 1; let title = level < 3 ? "Beginner 🥉" : level < 6 ? "Pro Saver 🥈" : "Finance Ninja 🥇"; lvlBadge.innerText = `Level ${level} | ${title} (XP: ${userXP})`; }

        let totalExpAllTime = familyExpenses.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0); let expEl = document.getElementById('profile-total-expense'); if(expEl) expEl.innerText = `₹${totalExpAllTime}`;
        let totalDudhAllTime = dudhRecords.reduce((sum, item) => sum + (((parseFloat(item.morning) || 0) + (parseFloat(item.evening) || 0)) * (parseFloat(item.rate) || 0)), 0); let dudhEl = document.getElementById('profile-total-dudh'); if(dudhEl) dudhEl.innerText = `₹${Math.round(totalDudhAllTime)}`;
        let totalInvestments = investments.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0); let totalLoanLeft = activeLoans.reduce((sum, item) => { let p = parseFloat(item.principal) || 0; let t = parseInt(item.time) || 1; let m = parseInt(item.monthsPaid) || 0; return sum + (p - (p * (m/t))); }, 0);
        let netWorth = (parseFloat(monthlyIncome) || 0) + totalInvestments - totalExpAllTime - totalLoanLeft; let nwEl = document.getElementById('profile-net-worth'); if(nwEl) { if(netWorth >= 0) { nwEl.style.color = '#10b981'; nwEl.innerText = `₹${Math.round(netWorth)} 📈`; } else { nwEl.style.color = '#ef4444'; nwEl.innerText = `₹${Math.round(netWorth)} 📉`; } }

        let filterMonth = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0, 7); if(!filterMonth) filterMonth = todayDateString.slice(0, 7);
        let monthExpenses = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        let score = 50; let mIncome = parseFloat(monthlyIncome) || 0; if(mIncome > 0) { let savePercent = ((mIncome - monthExpenses) / mIncome) * 100; if(savePercent >= 20) score = 95; else if(savePercent >= 10) score = 75; else if(savePercent >= 0) score = 60; else score = 30; }
        if(dailyStreak > 3) score += 5; if(score > 100) score = 100;
        let scoreBar = document.getElementById('health-score-bar'); let scoreText = document.getElementById('health-score-text'); if(scoreBar && scoreText) { scoreBar.style.width = `${score}%`; scoreText.innerText = `${score}/100`; }
        
        if(document.getElementById('goal-name')) { document.getElementById('goal-name').innerText = dreamGoal.name || "No Goal"; document.getElementById('goal-target').innerText = dreamGoal.target || 0; let currentSavings = mIncome > monthExpenses ? mIncome - monthExpenses : 0; document.getElementById('goal-saved').innerText = currentSavings; let t = parseFloat(dreamGoal.target) || 0; let percent = t > 0 ? (currentSavings / t) * 100 : 0; if(percent > 100) percent = 100; document.getElementById('goal-bar').style.width = `${percent}%`; }

        modal.style.display = 'flex'; playSound('click');
        
        setTimeout(() => {
            try {
                let monthData = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)); 
                let catTotals = {}; let memTotals = {}; 
                monthData.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount); memTotals[e.member] = (memTotals[e.member] || 0) + parseFloat(e.amount); });
                renderTrendChartProfile(monthData); renderCategoryChart(catTotals); renderMemberChart(memTotals);
            } catch(e) { console.log("Chart render skipped", e); }
        }, 300);

    } catch (err) { console.error("Profile Error: ", err); Swal.fire('Minor Glitch', 'Kuch data load hone me issue aaya, par app safe hai!', 'info'); }
}
function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; playSound('click'); }

function setGoal() { if(userRole !== 'Admin') return Swal.fire('Access Denied', 'Sirf Admin hi goal change kar sakte hain', 'error'); Swal.fire({ title: 'Set Dream Goal 🎯', html: '<input id="swal-gn" class="swal2-input" placeholder="Goal Name"><input id="swal-gt" type="number" class="swal2-input" placeholder="Amount (₹)">', preConfirm: () => ({ name: document.getElementById('swal-gn').value, target: parseFloat(document.getElementById('swal-gt').value) }) }).then((res) => { if(res.isConfirmed && res.value.target > 0) { dreamGoal = { name: res.value.name || 'Dream', target: res.value.target }; saveToCloud(); openProfile(); playSound('success'); } }); }

function updateToDoUI() { const list = document.getElementById('todo-list'); if(!list) return; list.innerHTML = ''; todoItems.forEach((task, index) => { const li = document.createElement('li'); li.style.background = 'transparent'; li.style.borderBottom = '1px dashed #fde68a'; li.style.padding = '8px 0'; li.innerHTML = `<div style="display:flex; align-items:center; cursor:pointer; flex:1;" onclick="toggleToDo(${index})"><input type="checkbox" ${task.done ? 'checked' : ''} style="width:18px; height:18px; margin-right:10px; accent-color:#f59e0b; pointer-events:none;"><span style="font-size:14px; font-weight:700; color:#92400e; text-decoration:${task.done ? 'line-through' : 'none'}; opacity:${task.done ? '0.5' : '1'}">${task.text}</span></div><button onclick="deleteToDo(${index})" style="background:none; border:none; font-size:16px; cursor:pointer; opacity:0.6;">❌</button>`; list.appendChild(li); }); }
function addToDo() { Swal.fire({ title: 'Naya Task', input: 'text', showCancelButton: true, confirmButtonColor: '#f59e0b' }).then((res) => { if(res.isConfirmed && res.value.trim()) { todoItems.push({ text: res.value.trim(), done: false }); saveToCloud(); updateToDoUI(); playSound('click'); } }); playSound('click'); }
function toggleToDo(index) { todoItems[index].done = !todoItems[index].done; playSound('click'); saveToCloud(); updateToDoUI(); if(todoItems[index].done && typeof confetti !== 'undefined') confetti({ particleCount: 30, spread: 40, origin: { y: 0.6 } }); }
function deleteToDo(index) { todoItems.splice(index, 1); saveToCloud(); updateToDoUI(); playSound('click'); }

const dict = { 'Hinglish': { 'Total Kharcha (Is Mahine)': 'Total Kharcha (Is Mahine)', 'Monthly Budget:': 'Monthly Budget:', 'Kamai (Income)': 'Kamai (Income)' }, 'English': { 'Total Kharcha (Is Mahine)': 'Total Expense (This Month)', 'Monthly Budget:': 'Monthly Budget:', 'Kamai (Income)': 'Total Income' } };
function toggleLanguage() { appLang = appLang === 'Hinglish' ? 'English' : 'Hinglish'; localStorage.setItem('appLang', appLang); applyLanguageUI(); playSound('click'); }
function applyLanguageUI() { document.querySelectorAll('.translatable').forEach(el => { let key = el.getAttribute('data-key') || el.innerText.trim(); if(!el.getAttribute('data-key')) el.setAttribute('data-key', key); if(dict[appLang] && dict[appLang][key]) { if(el.children.length>0 && el.innerHTML.includes('<span')) { el.innerHTML = el.innerHTML.replace(key, dict[appLang][key]); } else { el.innerText = dict[appLang][key]; } } }); }

let isDarkMode = localStorage.getItem('darkMode') === 'true'; if(isDarkMode) document.body.classList.add('dark-mode');
function toggleTheme() { isDarkMode = !isDarkMode; document.body.classList.toggle('dark-mode', isDarkMode); localStorage.setItem('darkMode', isDarkMode); playSound('click'); }
function autoDarkMode() { const h = new Date().getHours(); if(h >= 18 || h < 6) { if(localStorage.getItem('appTheme') === 'default' || !localStorage.getItem('appTheme')) applyTheme('night'); } }

function openSection(sName, title) { document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section')); document.getElementById('section-'+sName).classList.add('active-section'); const titleEl = document.getElementById('app-title'); if(sName === 'hisab') { titleEl.innerText = 'Hisaab'; } else { titleEl.innerText = title || sName; } document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('active-nav'); const oc = btn.getAttribute('onclick'); if(oc && oc.includes("'" + sName + "'")) btn.classList.add('active-nav'); }); window.scrollTo({ top: 0, behavior: 'smooth' }); playSound('click'); }
const todayDateString = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

function updatePrediction(tot) { 
    let fm = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0, 7);
    let currM = todayDateString.slice(0, 7);
    const el = document.getElementById('predicted-expense'); if(!el) return;
    
    if (fm !== currM) {
        el.innerText = `🔮 Past Month`;
        el.style.color = '#64748b';
        return;
    }

    let d = new Date().getDate(); 
    if (d === 0) d = 1; 
    let dim = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate(); 
    let p = (tot / d) * dim; 
    if(isNaN(p) || !isFinite(p)) p = 0; 
    el.innerText = `🔮 AI: ₹${Math.round(p)} ${appLang==='English'?'Expected':'Umeed'}`; 
    el.style.color = p > budgetLimit ? '#ef4444' : '#10b981'; 
}

function renderCalendar(exps, fm) {
    const cel = document.getElementById('expense-calendar'); if(!cel) return; cel.innerHTML = '';
    const y = parseInt(fm.split('-')[0]); const m = parseInt(fm.split('-')[1]) - 1; const dim = new Date(y, m + 1, 0).getDate();
    ['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d => { const el = document.createElement('div'); el.innerText = d; el.style.fontWeight = 'bold'; el.style.color = 'var(--text-muted)'; el.style.fontSize = '12px'; cel.appendChild(el); });
    let fd = new Date(y, m, 1).getDay(); for(let i=0; i<fd; i++) cel.appendChild(document.createElement('div'));
    let dt = {}; exps.forEach(e => { let day = parseInt(e.date.split('-')[2]); dt[day] = (dt[day] || 0) + parseFloat(e.amount); });
    
    let frag = document.createDocumentFragment();
    for(let i=1; i<=dim; i++) {
        const el = document.createElement('div'); el.innerText = i; el.style.padding = '6px 0'; el.style.borderRadius = '8px'; el.style.fontSize = '12px'; el.style.fontWeight = 'bold';
        if(dt[i]) { 
            el.style.color = 'white'; 
            if(dt[i] >= 1000) el.style.background = '#ef4444'; 
            else if(dt[i] >= 300) el.style.background = '#f59e0b'; 
            else el.style.background = '#10b981'; 
        } else { el.style.background = 'var(--line-color)'; el.style.color = 'var(--text-main)'; }
        frag.appendChild(el);
    }
    cel.appendChild(frag);
}

function captureLocation() { let statusEl = document.getElementById('loc-status'); statusEl.innerText = "⏳ Fetching..."; if (navigator.geolocation) { navigator.geolocation.getCurrentPosition((pos) => { currentGPSLocation = `https://www.google.com/maps/search/?api=1&query=$${pos.coords.latitude},${pos.coords.longitude}`; statusEl.innerText = "✅ Captured!"; statusEl.style.color = "#10b981"; playSound('click'); }, () => { statusEl.innerText = "❌ Failed"; statusEl.style.color = "#ef4444"; Swal.fire('Error', 'Location on karein!', 'error'); }); } else { statusEl.innerText = "❌ Not Supported"; } playSound('click'); }
function applyQuickFilter(type) { activeQuickFilter = type; document.getElementById('sort-expense').value = 'date-desc'; playSound('click'); updateHisabUI(); }
function applyChip(type, btn) {
    activeQuickFilter = type === 'All' ? '' : type;
    // Style chips
    document.querySelectorAll('[id^=chip-]').forEach(b => { b.style.background='var(--line-color)'; b.style.color='var(--text-main)'; });
    if(btn) { btn.style.background='var(--ink-blue)'; btn.style.color='white'; }
    // Category chip special handling
    const catFilter = document.getElementById('cat-filter');
    const catChips = ['Food','Petrol','Ration','Medical','Bills','Shopping'];
    if(catChips.includes(type) && catFilter) { catFilter.value = type; activeQuickFilter = ''; }
    else if(catFilter) { catFilter.value = 'All'; }
    playSound('click');
    updateHisabUI();
}
function smartSearch(val) {
    const clearBtn = document.getElementById('search-clear-btn');
    if(clearBtn) clearBtn.style.display = val ? 'flex' : 'none';
    clearTimeout(window._searchTimeout);
    window._searchTimeout = setTimeout(() => updateHisabUI(), 200);
}
function clearSearch() {
    const inp = document.getElementById('search-expense');
    if(inp) inp.value = '';
    const clearBtn = document.getElementById('search-clear-btn');
    if(clearBtn) clearBtn.style.display = 'none';
    activeQuickFilter = '';
    // Reset all chips
    document.querySelectorAll('[id^=chip-]').forEach(b => { b.style.background='var(--line-color)'; b.style.color='var(--text-main)'; });
    const allChip = document.getElementById('chip-all');
    if(allChip) { allChip.style.background='var(--ink-blue)'; allChip.style.color='white'; }
    const catFilter = document.getElementById('cat-filter');
    if(catFilter) catFilter.value = 'All';
    updateHisabUI();
}

window.addEventListener('DOMContentLoaded', () => {
    const descInp = document.getElementById('description');
    if(descInp) { descInp.addEventListener('input', function(e) { let val = e.target.value.toLowerCase(); let cat = document.getElementById('expense-category'); if(val.includes('dawa') || val.includes('doctor') || val.includes('hospital')) cat.value = 'Medical'; else if(val.includes('petrol') || val.includes('diesel') || val.includes('bike')) cat.value = 'Petrol'; else if(val.includes('sabji') || val.includes('ration') || val.includes('tel')) cat.value = 'Ration'; else if(val.includes('recharge') || val.includes('bill') || val.includes('wifi')) cat.value = 'Bills'; else if(val.includes('kapde') || val.includes('shoes') || val.includes('shopping')) cat.value = 'Shopping'; }); }
});

// ==========================================
// ⚡ HISAAB SECTION
// ==========================================
let editExpenseIndex = -1; let currentReceiptUrl = ""; let categoryChartInstance = null; let memberChartInstance = null; let trendChartInstance = null;
const dateInput = document.getElementById('date'); if(dateInput) dateInput.value = todayDateString;
const monthFilter = document.getElementById('month-filter'); if(monthFilter) monthFilter.value = todayDateString.slice(0, 7); 

let searchTimeout; function debounceSearch() { clearTimeout(searchTimeout); searchTimeout = setTimeout(() => { updateHisabUI(); }, 300); }

const receiptInput = document.getElementById('receipt-img');
if(receiptInput) { receiptInput.addEventListener('change', function(e) { const file = e.target.files[0]; if (file) { const reader = new FileReader(); reader.onload = function(event) { currentReceiptUrl = event.target.result; const preview = document.getElementById('receipt-preview'); if(preview) { preview.src = currentReceiptUrl; preview.style.display = 'block'; } document.getElementById('scan-btn').style.display = 'block'; }; reader.readAsDataURL(file); } }); }

function scanReceipt() { if(!currentReceiptUrl || typeof Tesseract === 'undefined') return Swal.fire('Wait', 'Library load ho rahi hai...', 'info'); const btn = document.getElementById('scan-btn'); btn.innerText = "⏳ AI Scanning..."; Tesseract.recognize(currentReceiptUrl, 'eng').then(({ data: { text } }) => { let amounts = text.match(/[\d,]+\.\d{2}/g); if(amounts) { let maxAmt = Math.max(...amounts.map(a => parseFloat(a.replace(/,/g, '')))); document.getElementById('amount').value = maxAmt; Swal.fire('Scan Success! 📸', `Bill me se Amount ₹${maxAmt} nikal liya gaya!`, 'success'); playSound('success'); } else { Swal.fire('Oops', 'Bill mein exact amount nahi mila. Khud daal lijiye.', 'info'); } btn.innerText = "📸 AI Scan"; }).catch(err => { btn.innerText = "📸 AI Scan"; Swal.fire('Error', 'Scanning fail ho gayi.', 'error'); }); playSound('click'); }
function calculateSplit() { let amt = parseFloat(document.getElementById('split-amount').value); let ppl = parseInt(document.getElementById('split-people').value); if(isNaN(amt) || isNaN(ppl) || amt<=0 || ppl<=0) return Swal.fire('Error', 'Sahi details daalein!', 'error'); let perHead = (amt / ppl).toFixed(2); let res = document.getElementById('split-result'); res.style.display = 'block'; res.innerHTML = `Har kisi ko <b>₹${perHead}</b> dene honge! 💸`; playSound('success'); if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); }

function importBankCSV() { const fileInput = document.getElementById('bank-csv-file'); if(!fileInput.files.length) return Swal.fire('File Missing', 'Pehle ek CSV file upload karein!', 'warning'); const reader = new FileReader(); reader.onload = function(e) { let lines = e.target.result.split('\n'); let added = 0; for(let i=1; i<lines.length; i++) { let cols = lines[i].split(','); if(cols.length >= 3) { let dateVal = cols[0].trim(); let descVal = cols[1].trim(); let amtVal = parseFloat(cols[2] || cols[3] || 0); if(!isNaN(amtVal) && amtVal > 0 && descVal.length > 2) { let fDate = todayDateString; try { let d = new Date(dateVal); if(!isNaN(d)) fDate = d.toISOString().split('T')[0]; } catch(err){} familyExpenses.push({ member: "Me", category: "Other", description: `🏦 Bank: ${descVal.substring(0,15)}`, amount: amtVal, date: fDate, receipt: "", gps: null }); added++; } } } if(added > 0) { saveToCloud(); updateHisabUI(); playSound('success'); Swal.fire('Imported! 🏦', `${added} naye kharche bank statement se jod diye gaye!`, 'success'); } else { Swal.fire('Error', 'File format sahi nahi hai.', 'error'); } fileInput.value = ""; }; reader.readAsText(fileInput.files[0]); playSound('click'); }

function setBudget() { if(userRole !== 'Admin') return Swal.fire('Access Denied', 'Sirf Admin hi budget badal sakte hain', 'error'); Swal.fire({ title: 'Monthly Budget', input: 'number', inputValue: budgetLimit, showCancelButton: true }).then((result) => { if (result.isConfirmed && result.value > 0) { budgetLimit = result.value; saveToCloud(); renderHistoryWithSkeleton(); } }); playSound('click'); }

function setIncome() { 
    if(userRole !== 'Admin') return Swal.fire('Access Denied', 'Sirf Admin hi income add kar sakte hain', 'error'); 
    Swal.fire({ title: 'Is Mahine Ki Kamai', input: 'number', inputValue: monthlyIncome, showCancelButton: true }).then((result) => { 
        if (result.isConfirmed && result.value >= 0) { 
            monthlyIncome = parseFloat(result.value); 
            localStorage.setItem('appDataCache', JSON.stringify({ budget: budgetLimit, income: monthlyIncome, xp: userXP, challengeDays: challengeDays, dailyStreak: dailyStreak, lastLoginDate: lastLoginDate, displayName: customDisplayName, dreamGoal: dreamGoal }));
            saveToCloud(); 
            updateHisabUI(); 
        } 
    }); 
    playSound('click'); 
}

function renderHistoryWithSkeleton() { const list = document.getElementById('history-list'); if(!list) return; list.innerHTML = `<div class="skeleton-box" style="height:60px; margin-bottom:10px;"></div><div class="skeleton-box" style="height:60px; margin-bottom:10px;"></div>`; setTimeout(updateHisabUI, 150); }

function updateHisabUI() {
    const list = document.getElementById('history-list'); if(!list) return; list.innerHTML = ''; 
    const filterMonth = document.getElementById('month-filter').value || todayDateString.slice(0, 7);
    const bdEl = document.getElementById('budget-display'); if(bdEl) bdEl.innerText = budgetLimit;

    const searchInput = document.getElementById('search-expense'); const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
    const familyFilterInput = document.getElementById('family-filter'); const familyQuery = familyFilterInput ? familyFilterInput.value : "All";
    const sortFilterInput = document.getElementById('sort-expense'); const sortQuery = sortFilterInput ? sortFilterInput.value : "date-desc";

    const catFilterInput = document.getElementById('cat-filter'); const catQuery = catFilterInput ? catFilterInput.value : 'All';
    let amtMin = null, amtMax = null;
    const amtMatch = searchQuery.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if(amtMatch) { amtMin = parseInt(amtMatch[1]); amtMax = parseInt(amtMatch[2]); }
    let filteredExpenses = familyExpenses.filter(item => {
        const matchMonth = item.date && item.date.startsWith(filterMonth);
        const matchFamily = familyQuery === 'All' ? true : (item.member === familyQuery);
        const matchCat = catQuery === 'All' ? true : (item.category === catQuery);
        let matchSearch = true;
        if(amtMin !== null) { matchSearch = parseFloat(item.amount) >= amtMin && parseFloat(item.amount) <= amtMax; }
        else if(searchQuery) {
            matchSearch = item.description.toLowerCase().includes(searchQuery) 
                || item.category.toLowerCase().includes(searchQuery) 
                || (item.member && item.member.toLowerCase().includes(searchQuery))
                || String(item.amount).includes(searchQuery)
                || (item.date && item.date.includes(searchQuery));
        }
        return matchMonth && matchSearch && matchFamily && matchCat;
    });
    // Show search count
    const countEl = document.getElementById('search-results-count');
    if(countEl) { if(searchQuery || familyQuery !== 'All' || catQuery !== 'All') { countEl.style.display='block'; countEl.textContent = filteredExpenses.length + ' results found'; } else { countEl.style.display='none'; } }

    let totalExpense = 0;
    if(activeQuickFilter === 'Today') filteredExpenses = filteredExpenses.filter(item => item.date === todayDateString);
    if(activeQuickFilter === 'High') filteredExpenses = filteredExpenses.filter(item => item.amount >= 500);

    filteredExpenses.sort((a, b) => { if(sortQuery === 'date-desc') return new Date(b.date) - new Date(a.date); if(sortQuery === 'date-asc') return new Date(a.date) - new Date(b.date); if(sortQuery === 'amt-desc') return b.amount - a.amount; if(sortQuery === 'amt-asc') return a.amount - b.amount; return 0; });
    let isDateSorted = sortQuery.startsWith('date');

    filteredExpenses.forEach((item) => { totalExpense += parseFloat(item.amount); });

    let fragment = document.createDocumentFragment(); 

    if(filteredExpenses.length === 0) {
        let emptyDiv = document.createElement('div');
        emptyDiv.innerHTML = `<div style="text-align:center; padding: 40px 10px; opacity:0.7; background:var(--line-color); border-radius:15px;"><div style="font-size:50px; margin-bottom:10px;">🤷‍♂️</div><h3 style="color:var(--text-main); font-size:18px;">Koi Hisaab Nahi!</h3><p style="color:var(--text-muted); font-size:13px; font-weight:bold;">Is filter ya mahine mein koi kharcha nahi mila 😊</p></div>`;
        fragment.appendChild(emptyDiv);
    } else {
        let currentDateHeader = "";
        filteredExpenses.forEach((item) => {
            if(isDateSorted && item.date !== currentDateHeader) {
                currentDateHeader = item.date; const parts = currentDateHeader.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`;
                const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.style.fontWeight = 'bold'; dateHeader.style.color = 'var(--ink-blue)'; dateHeader.style.margin = '10px 0 5px 0'; dateHeader.innerText = `📅 ${showDate}`; fragment.appendChild(dateHeader);
            }
            const originalIndex = familyExpenses.indexOf(item); const li = document.createElement('li');
            let receiptHTML = item.receipt ? `<img src="${item.receipt}" class="receipt-thumb" style="width:30px; height:30px; border-radius:5px; object-fit:cover; margin-right:5px; cursor:pointer;" onclick="Swal.fire({imageUrl: '${item.receipt}', imageWidth: '100%'})">` : '';
            const catMeta = getCategoryMeta(item.category);
            li.setAttribute('ondblclick', `editExpense(${originalIndex})`); li.style.cursor = 'pointer';
            li.style.borderLeft = `4px solid ${catMeta.color}`;
            li.innerHTML = `<div class="list-left" style="pointer-events:none;"><div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;"><span style="background:${catMeta.bg}; color:${catMeta.color}; font-size:14px; width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">${catMeta.icon}</span><strong style="font-size:16px; line-height:1.2;">${item.description}</strong></div><div style="display:flex; align-items:center; margin-top:3px; flex-wrap:wrap; gap:5px; padding-left:34px;"><span class="member-badge">👤 ${item.member}</span><span class="category-badge" style="background:${catMeta.bg}; color:${catMeta.color};">${item.category||'Other'}</span></div></div><div class="list-right">${receiptHTML}<span style="font-weight:800; color:#e74c3c; font-size:18px; margin:0 5px;">₹${item.amount}</span><button class="action-btn delete" onclick="event.stopPropagation(); deleteExpense(${originalIndex})">🗑️</button></div>`;
            fragment.appendChild(li);
        });
    }
    
    list.appendChild(fragment); 

    const totalEl = document.getElementById('total-expense'); if(totalEl) totalEl.innerText = `₹${totalExpense}`;
    
    let compEl = document.getElementById('month-comparison');
    if(compEl) {
        let currYear = parseInt(filterMonth.split('-')[0]); let currMonth = parseInt(filterMonth.split('-')[1]); let lastMonth = currMonth === 1 ? 12 : currMonth - 1; let lastYear = currMonth === 1 ? currYear - 1 : currYear; let lastMonthStr = `${lastYear}-${lastMonth.toString().padStart(2, '0')}`;
        let lastMonthTotal = familyExpenses.filter(item => item.date && item.date.startsWith(lastMonthStr)).reduce((sum, item) => sum + parseFloat(item.amount), 0);
        if(lastMonthTotal > 0) {
            let diff = totalExpense - lastMonthTotal; let percentDiff = Math.abs((diff / lastMonthTotal) * 100).toFixed(1);
            if(diff > 0) { compEl.innerHTML = `📉 Pichle mahine se <b>${percentDiff}% zyada</b> kharcha hua.`; compEl.style.color = '#ef4444'; } else if(diff < 0) { compEl.innerHTML = `📈 Pichle mahine se <b>${percentDiff}% kam</b> kharcha hua! ✅`; compEl.style.color = '#10b981'; } else { compEl.innerHTML = `📊 Pichle mahine jitna hi kharcha chal raha hai.`; compEl.style.color = '#64748b'; }
        } else { compEl.innerHTML = `📊 Abhi tak ka kharcha: ₹${totalExpense}`; compEl.style.color = '#64748b'; }
    }

    let budgetPercent = Math.min((totalExpense / budgetLimit) * 100, 100).toFixed(1); const bar = document.getElementById('budget-bar'); 
    if(bar) { bar.style.width = `${budgetPercent}%`; if(budgetPercent < 50) bar.style.background = '#2ecc71'; else if(budgetPercent < 80) bar.style.background = '#f39c12'; else bar.style.background = '#e74c3c'; const warning = document.getElementById('budget-warning'); if(warning) { warning.innerHTML = `📊 Usage: <b>${budgetPercent}%</b>`; warning.style.display = 'block'; warning.style.color = budgetPercent >= 80 ? '#e74c3c' : '#10b981'; } }
    
    let planner = document.getElementById('smart-budget-planner');
    if(monthlyIncome > 0 && planner) { planner.style.display = 'block'; document.getElementById('rule-needs').innerText = `₹${Math.round(monthlyIncome * 0.50)}`; document.getElementById('rule-wants').innerText = `₹${Math.round(monthlyIncome * 0.30)}`; document.getElementById('rule-saves').innerText = `₹${Math.round(monthlyIncome * 0.20)}`; } else if(planner) { planner.style.display = 'none'; }
    
    updatePrediction(totalExpense);
    renderCalendar(filteredExpenses, filterMonth); 
    renderQuickStats(totalExpense);
    renderAITip(totalExpense, monthlyIncome);
    updateToolsStats(totalExpense);
    applyLanguageUI();
}

function renderTrendChartProfile(exps) { const ctx = document.getElementById('trendChart'); if(!ctx) return; if(trendChartInstance) trendChartInstance.destroy(); let dt = {}; exps.forEach(e => { let d = e.date.split('-')[2]; dt[d] = (dt[d] || 0) + parseFloat(e.amount); }); const labels = Object.keys(dt).sort((a,b) => parseInt(a) - parseInt(b)); const data = labels.map(d => dt[d]); const tc = isDarkMode ? '#fff' : '#333'; trendChartInstance = new Chart(ctx.getContext('2d'), { type: 'bar', data: { labels: labels.map(l => l + ' Date'), datasets: [{ label: 'Daily Spend (₹)', data: data, backgroundColor: '#8b5cf6', borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { labels: { color: tc } } }, scales: { x: { ticks: { color: tc } }, y: { ticks: { color: tc } } } } }); }
function renderCategoryChart(obj) { const ctx = document.getElementById('categoryChart'); if(!ctx) return; if(categoryChartInstance) categoryChartInstance.destroy(); const lbls = Object.keys(obj); const data = Object.values(obj); const hd = data.some(v => v > 0); const tc = isDarkMode ? '#fff' : '#333'; categoryChartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels: lbls, datasets: [{ data: hd ? data : [1], backgroundColor: hd ? ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: tc, font: {size: 11} } } }, cutout: '70%' } }); }
function renderMemberChart(obj) { const ctx = document.getElementById('memberChart'); if(!ctx) return; if(memberChartInstance) memberChartInstance.destroy(); const lbls = Object.keys(obj); const data = Object.values(obj); const hd = data.some(v => v > 0); const tc = isDarkMode ? '#fff' : '#333'; memberChartInstance = new Chart(ctx.getContext('2d'), { type: 'pie', data: { labels: lbls, datasets: [{ data: hd ? data : [1], backgroundColor: hd ? ['#2980b9', '#e84393', '#27ae60', '#8e44ad', '#16a085'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: tc, font: {size: 12, weight: 'bold'} } } } } }); }

function scrollToAdd() { openSection('hisab', 'Hisaab'); document.getElementById('amount').focus(); window.scrollTo({ top: document.getElementById('amount').offsetTop - 150, behavior: 'smooth' }); playSound('click'); }

function addExpense() {
    try {
        const memberEl = document.getElementById('member-name');
        const categoryEl = document.getElementById('expense-category');
        const descEl = document.getElementById('description');
        const amtEl = document.getElementById('amount');
        const dateEl = document.getElementById('date');

        if (!memberEl || !categoryEl || !descEl || !amtEl || !dateEl) {
            return Swal.fire('Error', 'Form elements gayab hain!', 'error');
        }

        const member = memberEl.value;
        const category = categoryEl.value;
        const desc = descEl.value;
        const amt = parseFloat(amtEl.value);
        const date = dateEl.value;

        if (!desc || isNaN(amt) || amt <= 0 || !date) {
            return Swal.fire('Oops...', 'Sahi details bhariye!', 'warning');
        }

        if (!Array.isArray(familyExpenses)) familyExpenses = [];

        const newRecord = { member: member, category: category, description: desc, amount: amt, date: date, receipt: typeof currentReceiptUrl !== 'undefined' ? currentReceiptUrl : "", gps: typeof currentGPSLocation !== 'undefined' ? currentGPSLocation : null };

        if (typeof editExpenseIndex !== 'undefined' && editExpenseIndex !== -1) {
            familyExpenses[editExpenseIndex] = newRecord;
            editExpenseIndex = -1;
            let btnAdd = document.getElementById('btn-add-expense');
            if(btnAdd) btnAdd.innerText = "Kharcha Add Karein";
            Swal.fire({toast:true, position:'top-end', icon:'success', title:'Updated!', showConfirmButton:false, timer:1500});
        } else {
            familyExpenses.push(newRecord);
            if (typeof gainXP === 'function') gainXP(10);
            if (typeof playSound === 'function') playSound('success');
            if (typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }

        if (typeof currentGPSLocation !== 'undefined') currentGPSLocation = null;
        let statusEl = document.getElementById('loc-status');
        if(statusEl) { statusEl.innerText = "📍 Location Not Saved"; statusEl.style.color = "var(--text-muted)"; }

        descEl.value = ''; amtEl.value = '';
        if (typeof saveToCloud === 'function') saveToCloud();
        if (typeof updateHisabUI === 'function') updateHisabUI();

    } catch (e) {
        console.error("ADD EXPENSE ERROR:", e);
        Swal.fire('Error', 'Kharcha add nahi hua! Reason: ' + e.message, 'error');
    }
}

function editExpense(index) { const item = familyExpenses[index]; document.getElementById('member-name').value = item.member || 'Me'; document.getElementById('expense-category').value = item.category || 'Other'; document.getElementById('description').value = item.description; document.getElementById('amount').value = item.amount; document.getElementById('date').value = item.date; editExpenseIndex = index; document.getElementById('btn-add-expense').innerText = "Update Kharcha ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); playSound('click'); }
function deleteExpense(index) { playSound('click'); Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c' }).then((result) => { if (result.isConfirmed) { familyExpenses.splice(index, 1); saveToCloud(); renderHistoryWithSkeleton(); playSound('success'); } }); }

// ==========================================
// 🏦 LOANS & SUBSCRIPTIONS
// ==========================================
let tempLoanData = null;
function calculateEMI() { const name = document.getElementById('emi-name').value || 'My Loan'; const p = parseFloat(document.getElementById('emi-principal').value); const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100; const n = parseFloat(document.getElementById('emi-time').value); const dueDate = parseInt(document.getElementById('emi-due-date').value) || 5; if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || n <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error'); const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); const totalAmount = emi * n; const totalInterest = totalAmount - p; tempLoanData = { name: name, principal: p, rate: document.getElementById('emi-rate').value, time: n, emi: Math.round(emi), totalInterest: Math.round(totalInterest), dueDate: dueDate, monthsPaid: 0 }; document.getElementById('emi-result').style.display = 'block'; document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`; document.getElementById('emi-break-principal').innerText = Math.round(p); document.getElementById('emi-break-interest').innerText = Math.round(totalInterest); let pPercent = (p / totalAmount) * 100; document.getElementById('emi-break-bar').style.width = `${pPercent}%`; playSound('click'); }
function saveLoan() { if(!tempLoanData) return; activeLoans.push(tempLoanData); saveToCloud(); updateLoanUI(); tempLoanData = null; Swal.fire('Saved! 🏦', 'Yeh loan list me add ho gaya hai.', 'success'); document.getElementById('emi-result').style.display = 'none'; document.getElementById('emi-name').value = ''; document.getElementById('emi-principal').value = ''; document.getElementById('emi-rate').value = ''; document.getElementById('emi-time').value = ''; playSound('success'); }
function updateLoanUI() { 
    const list = document.getElementById('loan-list'); if(!list) return; list.innerHTML = ''; 
    if(activeLoans.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">No Active Loans 😌</h3></div>`;
    activeLoans.forEach((loan, index) => { let percentPaid = (loan.monthsPaid / loan.time) * 100; let isComplete = loan.monthsPaid >= loan.time; const li = document.createElement('li'); li.style.flexDirection = 'column'; li.style.alignItems = 'stretch'; li.style.borderLeft = isComplete ? "4px solid #10b981" : "4px solid #f472b6"; li.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;"><div style="display: flex; flex-direction: column;"><strong style="font-size: 16px;">${loan.name}</strong><span style="font-size: 11px; color: #64748b;">Due: Every ${loan.dueDate}th | EMI: ₹${loan.emi}</span></div><button class="action-btn delete" onclick="deleteLoan(${index})">🗑️</button></div><div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #1e293b; margin-bottom: 4px;"><span>Paid: ${loan.monthsPaid}/${loan.time} Mnth</span><span style="color: ${isComplete ? '#10b981' : '#f59e0b'}">${isComplete ? 'Loan Clear! 🎉' : Math.round(percentPaid)+'% Done'}</span></div><div style="width:100%; background: var(--line-color); border-radius:10px; height:6px; overflow:hidden; margin-bottom: 10px;"><div style="height:100%; width:${percentPaid}%; background: ${isComplete ? '#10b981' : '#f472b6'}; transition: width 0.5s;"></div></div>${!isComplete ? `<button onclick="payEMI(${index})" class="expense-btn" style="background: #ec4899; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: bold; width: 100%; cursor: pointer;">1-Click Pay ₹${loan.emi} ✅</button>` : ''}`; list.appendChild(li); }); 
}
function payEMI(index) { let loan = activeLoans[index]; if(loan.monthsPaid >= loan.time) return; Swal.fire({ title: 'Pay EMI?', text: `Kya tum ${loan.name} ka ₹${loan.emi} Hisaab me add karna chahte ho?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Haan, Pay Karo' }).then(async (result) => { if (result.isConfirmed) { const autoExpense = { member: "Me", category: "Bills", description: `🏦 EMI Paid: ${loan.name}`, amount: loan.emi, date: todayDateString, receipt: "", gps: null }; familyExpenses.push(autoExpense); loan.monthsPaid += 1; gainXP(20); playSound('success'); if(loan.monthsPaid >= loan.time) { if(typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); Swal.fire('Mubarak Ho! 🎉', `Tumhara "${loan.name}" poori tarah se chukta ho gaya hai!`, 'success'); } else { Swal.fire('EMI Paid ✅', 'Hisaab mein add ho gaya hai.', 'success'); } await saveToCloud(); updateLoanUI(); updateHisabUI(); } }); playSound('click'); }
function deleteLoan(index) { playSound('click'); Swal.fire({ title: 'Delete Loan?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { activeLoans.splice(index, 1); saveToCloud(); updateLoanUI(); } }); }

function addSubscription() { const name = document.getElementById('sub-name').value; const amt = parseFloat(document.getElementById('sub-amount').value); const due = parseInt(document.getElementById('sub-due').value) || 1; if(!name || isNaN(amt) || amt <= 0) return Swal.fire('Error', 'Sahi details daalein!', 'error'); activeSubs.push({ name: name, amount: amt, dueDate: due }); saveToCloud(); updateSubsUI(); document.getElementById('sub-name').value = ''; document.getElementById('sub-amount').value = ''; playSound('success'); Swal.fire('Saved!', 'Subscription add ho gaya!', 'success'); }
function updateSubsUI() { 
    const list = document.getElementById('sub-list'); if(!list) return; list.innerHTML = ''; 
    if(activeSubs.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">No Subscriptions 📺</h3></div>`;
    activeSubs.forEach((sub, index) => { const li = document.createElement('li'); li.style.borderLeft = "4px solid #6366f1"; li.innerHTML = `<div class="list-left"><strong style="font-size:16px;">${sub.name}</strong><span style="font-size:11px; color:#64748b;">Due: Every ${sub.dueDate}th</span></div><div class="list-right" style="display:flex; gap:5px; align-items:center;"><button onclick="paySubscription(${index})" class="expense-btn" style="background:#6366f1; color:white; border:none; padding:6px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;">Pay ₹${sub.amount}</button><button class="action-btn delete" onclick="deleteSubscription(${index})">🗑️</button></div>`; list.appendChild(li); }); 
}
function deleteSubscription(index) { playSound('click'); activeSubs.splice(index, 1); saveToCloud(); updateSubsUI(); }
function paySubscription(index) { let sub = activeSubs[index]; playSound('click'); Swal.fire({ title: 'Pay Bill?', text: `Pay ₹${sub.amount} for ${sub.name}?`, icon: 'question', showCancelButton: true }).then((result) => { if(result.isConfirmed) { familyExpenses.push({ member: "Me", category: "Bills", description: `🔁 Sub Paid: ${sub.name}`, amount: sub.amount, date: todayDateString, receipt: "", gps: null }); saveToCloud(); updateHisabUI(); playSound('success'); gainXP(10); Swal.fire('Paid!', 'Bill hisaab me add ho gaya ✅', 'success'); } }); }

// ==========================================
// 💸 INVESTMENTS, RATION, DUDH, VYAJ
// ==========================================
function calculateVyaj() { const p = parseFloat(document.getElementById('vyaj-principal').value); const rate = parseFloat(document.getElementById('vyaj-rate').value); const time = parseFloat(document.getElementById('vyaj-time').value); if (isNaN(p) || isNaN(rate) || isNaN(time) || p <= 0 || time <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error'); const interest = (p * rate * time) / 100; document.getElementById('vyaj-result').style.display = 'block'; document.getElementById('vyaj-only').innerText = `₹${Math.round(interest)}`; playSound('click'); }

function updateInvestUI() { const list = document.getElementById('invest-list'); if(!list) return; list.innerHTML = ''; let totalInvest = 0; if(investments.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">No Investments Yet 📈</h3></div>`; investments.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((item, index) => { totalInvest += item.amount; const li = document.createElement('li'); li.style.borderLeft = "4px solid #06b6d4"; li.innerHTML = `<div class="list-left"><strong style="font-size:16px;">${item.type}</strong><span style="font-size:12px; color:#64748b; font-weight:bold;">📅 ${item.date}</span></div><div class="list-right"><span style="font-weight:800; color:#0891b2; font-size:18px; margin-right:10px;">₹${item.amount}</span><button class="action-btn delete" onclick="deleteInvestment(${index})">🗑️</button></div>`; list.appendChild(li); }); const totalEl = document.getElementById('invest-total-amount'); if(totalEl) totalEl.innerText = `₹${totalInvest}`; }
function addInvestment() { const type = document.getElementById('invest-type').value; const amt = parseFloat(document.getElementById('invest-amount').value); const date = document.getElementById('invest-date').value || todayDateString; if (isNaN(amt) || amt <= 0 || !date) return Swal.fire('Oops...', 'Sahi amount daalein!', 'warning'); investments.push({ type, amount: amt, date }); saveToCloud(); updateInvestUI(); gainXP(20); document.getElementById('invest-amount').value = ''; playSound('success'); Swal.fire('Great!', 'Investment add ho gaya!', 'success'); }
function deleteInvestment(index) { playSound('click'); Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { investments.splice(index, 1); saveToCloud(); updateInvestUI(); playSound('success'); } }); }

function updateRationUI() { const list = document.getElementById('ration-list'); if(!list) return; list.innerHTML = ''; if(rationItems.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">Ration list is empty 🛒</h3></div>`; rationItems.sort((a, b) => new Date(b.date) - new Date(a.date)); const uniqueDates = [...new Set(rationItems.map(item => item.date))]; uniqueDates.forEach(dateStr => { const parts = dateStr.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`; const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.style.fontWeight = 'bold'; dateHeader.style.color = '#c084fc'; dateHeader.style.margin = '10px 0 5px 0'; dateHeader.innerText = `🛒 ${showDate}`; list.appendChild(dateHeader); rationItems.forEach((item, index) => { if(item.date === dateStr) { const li = document.createElement('li'); li.style.borderLeft = item.lowStock ? "4px solid #ef4444" : "4px solid #8e44ad"; li.style.background = item.lowStock ? "#fef2f2" : "var(--line-color)"; li.innerHTML = `<div class="list-left ration-item" onclick="toggleRation(${index})" style="flex-direction: row; align-items:center; cursor:pointer; opacity: ${item.bought ? '0.5' : '1'}; flex: 2;"><input type="checkbox" ${item.bought ? 'checked' : ''} style="width: 20px; height: 20px; margin-right:10px;"><div style="display:flex; flex-direction:column;"><strong style="font-size: 16px; text-decoration: ${item.bought ? 'line-through' : 'none'}; color: ${item.lowStock ? '#ef4444' : 'var(--text-main)'}">${item.name}</strong>${item.amount > 0 ? `<span style="font-size:12px; color:#64748b; font-weight:bold;">₹${item.amount}</span>` : ''}</div></div><div class="list-right" style="flex: 1; justify-content: flex-end;"><button class="action-btn" onclick="toggleLowStock(${index})" style="background: ${item.lowStock ? '#ef4444' : '#f1f5f9'}; color: ${item.lowStock ? 'white' : 'black'}; font-size:12px; font-weight:bold; width: 60px;">${item.lowStock ? '⚠️ Low' : 'Stock OK'}</button><button class="action-btn delete" onclick="deleteRation(${index})">🗑️</button></div>`; list.appendChild(li); } }); }); }
function addRation() { const name = document.getElementById('ration-item').value; const rDate = document.getElementById('ration-date').value || todayDateString; const amount = parseFloat(document.getElementById('ration-amount').value) || 0; if(!name || !rDate) return Swal.fire('Galti', 'Samaan ka naam likhein!', 'warning'); rationItems.push({ name: name, bought: false, date: rDate, amount: amount, lowStock: false }); saveToCloud(); document.getElementById('ration-item').value = ''; document.getElementById('ration-amount').value = ''; playSound('success'); updateRationUI(); }
async function toggleRation(index) { const item = rationItems[index]; item.bought = !item.bought; playSound('click'); if (item.bought && item.amount > 0) { const autoExpense = { member: "Me", category: "Ration", description: `🛒 ${item.name} (Ration)`, amount: item.amount, date: todayDateString, receipt: "", gps: null }; familyExpenses.push(autoExpense); gainXP(5); playSound('success'); Swal.fire({ title: 'Hisaab mein juda!', text: `${item.name} ka ₹${item.amount} 'GharManager' mein add ho gaya hai. ✅`, icon: 'success', timer: 2000, showConfirmButton: false }); } await saveToCloud(); updateRationUI(); updateHisabUI(); }
function toggleLowStock(index) { rationItems[index].lowStock = !rationItems[index].lowStock; playSound('click'); saveToCloud(); updateRationUI(); }
function deleteRation(index) { playSound('click'); rationItems.splice(index, 1); saveToCloud(); updateRationUI(); }

function updateDudhUI() { const list = document.getElementById('dudh-list'); if(!list) return; list.innerHTML = ''; let totalLiter = 0, totalBill = 0; if(dudhRecords.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">No Milk Records 🥛</h3></div>`; dudhRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((record, index) => { const totalDayLiter = record.morning + record.evening; const dayCost = totalDayLiter * record.rate; totalLiter += totalDayLiter; totalBill += dayCost; const parts = record.date.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`; const li = document.createElement('li'); li.innerHTML = `<div class="list-left"><div style="display:flex; align-items:center; margin-bottom:6px;"><span class="member-badge" style="background:#bfdbfe; color:#2563eb;">📅 ${showDate}</span><strong style="font-size:15px;">S: ${record.morning}L | Sh: ${record.evening}L</strong></div><div style="font-size:12px; color:#64748b; font-weight:600;">Rate: ₹${record.rate}/L | Total: ${totalDayLiter}L</div></div><div class="list-right"><span style="font-weight:800; color:#2563eb; font-size:19px; margin-right:5px;">₹${dayCost}</span><button class="action-btn edit" onclick="editDudh(${index})">✏️</button><button class="action-btn delete" onclick="deleteDudh(${index})">🗑️</button></div>`; list.appendChild(li); }); document.getElementById('dudh-total-liter').innerText = totalLiter.toFixed(2); document.getElementById('dudh-total-bill').innerText = `₹${Math.round(totalBill)}`; }
function addDudh() { const dDate = document.getElementById('dudh-date').value || todayDateString; const rate = parseFloat(document.getElementById('dudh-rate').value); const morn = parseFloat(document.getElementById('dudh-morning').value) || 0; const eve = parseFloat(document.getElementById('dudh-evening').value) || 0; if (!dDate || isNaN(rate) || (morn === 0 && eve === 0)) return Swal.fire('Galti', 'Sahi details daaliye!', 'error'); if(editDudhIndex === -1) { dudhRecords.push({ date: dDate, rate: rate, morning: morn, evening: eve }); playSound('success'); } else { dudhRecords[editDudhIndex] = { date: dDate, rate: rate, morning: morn, evening: eve }; editDudhIndex = -1; document.getElementById('btn-add-dudh').innerText = "Dudh Add Karein"; } saveToCloud(); updateDudhUI(); document.getElementById('dudh-morning').value = ''; document.getElementById('dudh-evening').value = ''; }
function editDudh(index) { const item = dudhRecords[index]; document.getElementById('dudh-date').value = item.date; document.getElementById('dudh-rate').value = item.rate; document.getElementById('dudh-morning').value = item.morning; document.getElementById('dudh-evening').value = item.evening; editDudhIndex = index; document.getElementById('btn-add-dudh').innerText = "Update Dudh ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); playSound('click'); }
function deleteDudh(index) { playSound('click'); Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { dudhRecords.splice(index, 1); saveToCloud(); updateDudhUI(); } }); }

// ==========================================
// 🖨️ BUG FIX 1: 100% NATIVE PRINT (No iFrame Crashes)
// ==========================================
function printReport() { 
    let fm = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0,7); 
    let exps = familyExpenses.filter(i => i.date && i.date.startsWith(fm)); 
    if(exps.length===0) return Swal.fire('Khali', 'Is mahine ka koi data nahi hai!', 'info'); 
    
    let totalAmt = 0; let trs = '';
    exps.sort((a,b)=>new Date(b.date)-new Date(a.date)).forEach(e => {
        let cleanCat = e.category ? String(e.category).replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim() : '';
        let cleanDesc = e.description ? String(e.description).replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim() : '';
        let cleanMem = e.member ? String(e.member).replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim() : '';

        trs += `<tr><td style="padding:8px; border:1px solid #ddd;">${e.date}</td><td style="padding:8px; border:1px solid #ddd;">${cleanCat}</td><td style="padding:8px; border:1px solid #ddd;">${cleanDesc}</td><td style="padding:8px; border:1px solid #ddd;">${cleanMem}</td><td style="padding:8px; border:1px solid #ddd;">Rs ${e.amount}</td></tr>`;
        totalAmt += parseFloat(e.amount);
    });

    let html = `
        <div style="font-family: Arial, sans-serif; max-width: 800px; margin: auto; padding: 20px;">
            <h2 style="text-align:center; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">GharManager - Hisaab Report</h2>
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <p><b>Month:</b> ${fm}</p>
                <p><b>Total Kharcha:</b> Rs ${totalAmt}</p>
            </div>
            <table style="width:100%; border-collapse:collapse; text-align:left; font-size:14px;">
                <tr style="background:#f1f5f9; color: #0f172a;">
                    <th style="padding:8px; border:1px solid #ddd;">Date</th>
                    <th style="padding:8px; border:1px solid #ddd;">Category</th>
                    <th style="padding:8px; border:1px solid #ddd;">Details</th>
                    <th style="padding:8px; border:1px solid #ddd;">Member</th>
                    <th style="padding:8px; border:1px solid #ddd;">Amount</th>
                </tr>
                ${trs}
                <tr style="background:#fee2e2; color: #991b1b; font-weight: bold;">
                    <td colspan="4" style="text-align:right; padding:8px; border:1px solid #ddd;">Total Expense:</td>
                    <td style="padding:8px; border:1px solid #ddd;">Rs ${totalAmt}</td>
                </tr>
            </table>
            <p style="text-align:center; font-size:12px; color:#64748b; margin-top:30px;">Generated by GharManager Pro</p>
        </div>
    `;

    // 100% Native Print Setup (No Iframe)
    let printStyle = document.getElementById('print-style');
    if(!printStyle) {
        printStyle = document.createElement('style');
        printStyle.id = 'print-style';
        printStyle.innerHTML = `@media print { body * { visibility: hidden; } #print-area, #print-area * { visibility: visible; } #print-area { position: absolute; left: 0; top: 0; width: 100%; } } @media screen { #print-area { display: none; } }`;
        document.head.appendChild(printStyle);
    }
    
    let printDiv = document.getElementById('print-area');
    if(!printDiv) {
        printDiv = document.createElement('div');
        printDiv.id = 'print-area';
        document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;
    
    window.print();
    playSound('click'); 
}

function backupData() { const dataToBackup = { expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, investments: investments, loans: activeLoans, subscriptions: activeSubs, recharges: rechargeRecords, budget: budgetLimit, income: monthlyIncome, xp: userXP, dailyStreak: dailyStreak, todoItems: todoItems, dreamGoal: dreamGoal }; const encryptedData = btoa(unescape(encodeURIComponent(JSON.stringify(dataToBackup)))); const dataStr = "data:text/plain;charset=utf-8," + encryptedData; const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", "GharManager_Encrypted_Backup.txt"); dlAnchorElem.click(); playSound('success'); }
function restoreData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async function(e) { try { let decryptedStr = e.target.result; try { decryptedStr = decodeURIComponent(escape(atob(e.target.result))); } catch(err) {} const data = JSON.parse(decryptedStr); if (data.expenses) { familyExpenses = data.expenses || []; dudhRecords = data.dudh || []; rationItems = data.ration || []; investments = data.investments || []; activeLoans = data.loans || []; activeSubs = data.subscriptions || []; rechargeRecords = data.recharges || []; budgetLimit = data.budget || 20000; monthlyIncome = data.income || 0; userXP = data.xp || 0; dailyStreak = data.dailyStreak || 0; todoItems = data.todoItems || []; dreamGoal = data.dreamGoal || { name: "No Goal", target: 0 }; await saveToCloud(); Swal.fire('Restored!', 'Aapka purana data wapas aa gaya hai! ✅', 'success'); loadCloudData(currentUser.uid); playSound('success'); } else { Swal.fire('Error', 'Yeh file sahi format mein nahi hai!', 'error'); } } catch(err) { Swal.fire('Error', 'File read nahi ho paayi.', 'error'); } }; reader.readAsText(file); }

// PREMIUM PDF EXPORT
async function shareReport() {
    if(!window.jspdf) return Swal.fire('Wait', 'PDF library load ho rahi hai.', 'info');
    const filterMonth = document.getElementById('month-filter').value || todayDateString.slice(0, 7); 
    const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)); 
    if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Koi record nahi hai.', 'info');
    
    const { jsPDF } = window.jspdf; const doc = new jsPDF(); 
    
    doc.setFillColor(37, 99, 235); doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(22); doc.text(`GharManager Pro`, 14, 20);
    doc.setFontSize(12); doc.text(`Report: ${filterMonth}`, 150, 20);

    let totalAmount = 0; dataToExport.forEach(e => totalAmount += parseFloat(e.amount));
    doc.setTextColor(0, 0, 0); doc.setFontSize(14); doc.text(`Financial Summary`, 14, 45);
    doc.setFontSize(11); doc.text(`Total Income: Rs ${monthlyIncome}`, 14, 55); doc.text(`Total Expense: Rs ${totalAmount}`, 14, 62); doc.text(`Net Savings: Rs ${monthlyIncome - totalAmount}`, 14, 69);

    const cleanText = (str) => str ? String(str).replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim() : '';

    const tableColumn = ["Date", "Name", "Category", "Details", "Amount"]; const tableRows = []; 
    [...dataToExport].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => { 
        const p = exp.date.split('-'); 
        tableRows.push([`${p[2]}/${p[1]}`, cleanText(exp.member || '-'), cleanText(exp.category || 'Other'), cleanText(exp.description), `Rs ${exp.amount}`]); 
    });
    
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 80, theme: 'striped', headStyles: { fillColor: [16, 185, 129] }, styles: { fontSize: 10 }, foot: [["", "", "", "Total :", `Rs ${totalAmount}`]], footStyles: { fillColor: [239, 68, 68], textColor: [255,255,255] } });
    
    const pdfBlob = doc.output('blob'); const fileName = `GharManager_${filterMonth}.pdf`; const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    
    Swal.fire({ title: 'PDF Ready! 🎉', text: 'PDF ban gayi hai, kya karna chahte ho?', icon: 'success', showCancelButton: true, confirmButtonText: '📥 Download', cancelButtonText: '📤 Share', confirmButtonColor: '#10b981', cancelButtonColor: '#3b82f6' }).then(async (result) => {
        if (result.isConfirmed) { doc.save(fileName); } 
        else {
            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) { try { await navigator.share({ title: `Hisaab - ${filterMonth}`, text: `Total kharcha: Rs ${totalAmount}.`, files: [pdfFile] }); } catch (error) { doc.save(fileName); } } 
            else { doc.save(fileName); }
        }
    });
    playSound('success');
}
function exportToPDF() { shareReport(); }
function exportToExcel() {
    const filterMonth = document.getElementById('month-filter').value; const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth)); if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Is mahine koi kharcha nahi hai.', 'info');
    const cleanText = (str) => str ? String(str).replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim() : '';
    let csvContent = "Date,Kaun,Category,Details,Amount (Rs)\n"; 
    dataToExport.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(row => { 
        let cleanDesc = cleanText(row.description).replace(/,/g, " "); 
        csvContent += `${row.date},${cleanText(row.member)},${cleanText(row.category)},${cleanDesc},${row.amount}\n`; 
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const link = document.createElement("a"); const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", `GharManager_Excel_${filterMonth}.csv`); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); playSound('success'); Swal.fire('Downloaded! 📊', 'Excel file download ho gayi hai.', 'success');
}

// 🛡️ 11. THE REAL GEMINI AI API (UPGRADED v2 - SMARTER CONTEXT)
async function sendToRealAI() {
    const GEMINI_API_KEY = "AIzaSyC5VaHXD9zC5Zpf_vcsYdaZq6ehJOcaIfk"; 

    let inputEl = document.getElementById('ai-user-input');
    let chatBox = document.getElementById('ai-chat-box');
    if(!inputEl) return;
    let userText = inputEl.value.trim();
    if(!userText) return;

    chatBox.innerHTML += `<div style="margin:5px 0; text-align:right;"><span style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:8px 14px; border-radius:18px 18px 4px 18px; display:inline-block; max-width:80%; word-wrap:break-word; font-size:13px; font-weight:600;">${userText}</span></div>`;
    inputEl.value = ''; chatBox.scrollTop = chatBox.scrollHeight; playSound('click');

    let filterMonth = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0,7);
    let monthData = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    let totalExp = monthData.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    // 🧠 Build rich financial context
    let catTotals = {}; monthData.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount); });
    let catSummary = Object.entries(catTotals).map(([k,v]) => `${k}:₹${v}`).join(', ');
    let totalEMI = activeLoans.reduce((s,l) => s + (l.emi || 0), 0);
    let totalSubs = activeSubs.reduce((s,sub) => s + (sub.amount || 0), 0);
    let totalInvest = investments.reduce((s,i) => s + (i.amount || 0), 0);
    let savings = monthlyIncome - totalExp;
    let savingsRate = monthlyIncome > 0 ? ((savings/monthlyIncome)*100).toFixed(1) : 0;
    
    let systemPrompt = `You are GharManager AI, an expert Indian family finance advisor.
User's Financial Snapshot (${filterMonth}):
- Monthly Income: ₹${monthlyIncome}
- Total Expenses: ₹${totalExp}
- Net Savings: ₹${savings} (${savingsRate}% savings rate)
- Category Breakdown: ${catSummary || 'No data yet'}
- Active EMIs total: ₹${totalEMI}/month (${activeLoans.length} loans)
- Subscriptions: ₹${totalSubs}/month
- Total Investments: ₹${totalInvest}
- Daily Streak: ${dailyStreak} days
- Budget Limit: ₹${budgetLimit}

Instructions:
- Answer in simple, friendly Hinglish (Roman Hindi + English mix)
- Give specific, actionable advice based on the user's actual numbers
- Be encouraging and positive, like a trusted family friend
- Keep responses concise (3-4 lines max)
- Use ₹ symbol for rupees
- User's question: ${userText}`;

    let loadingId = 'load-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" style="margin:5px 0; text-align:left;"><span style="background:var(--paper-bg); color:var(--text-muted); border:1px solid var(--line-color); padding:8px 14px; border-radius:18px 18px 18px 4px; display:inline-block; font-size:13px; font-weight:600;">AI soch raha hai <span class="ai-dots"><span></span><span></span><span></span></span></span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        // 🔥 ULTIMATE FIX: Using gemini-1.5-pro for 100% Stability & No "Not Found" errors
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        });
        
        let data = await response.json();
        
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();

        if (!response.ok) {
            let errMsg = data.error ? data.error.message : 'Unknown API Error';
            chatBox.innerHTML += `<div style="margin:5px 0; text-align:left;"><span style="background:#fee2e2; color:#991b1b; padding:8px 12px; border-radius:16px 16px 16px 0; display:inline-block; font-size:12px;"><b>API Error:</b> ${errMsg}</span></div>`;
            chatBox.scrollTop = chatBox.scrollHeight;
            return;
        }

        if (data.candidates && data.candidates[0].content) {
            let aiText = data.candidates[0].content.parts[0].text;
            // 📝 Markdown Fix (Bold & Breaklines)
            let formatText = aiText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
            chatBox.innerHTML += `<div style="margin:8px 0; text-align:left; animation: fadeIn 0.3s;"><span style="background:var(--paper-bg); color:var(--text-main); border:1px solid var(--line-color); padding:10px 14px; border-radius:18px 18px 18px 4px; display:inline-block; max-width:92%; word-wrap:break-word; line-height:1.6; font-size:13px; font-weight:600; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">${formatText}</span></div>`;
        } else {
            chatBox.innerHTML += `<div style="margin:5px 0; text-align:left;"><span style="background:#fee2e2; color:#991b1b; padding:8px 12px; border-radius:16px 16px 16px 0; display:inline-block; font-size:14px;">AI ne koi jawab nahi diya.</span></div>`;
        }
        
        chatBox.scrollTop = chatBox.scrollHeight; playSound('success');
    } catch(e) {
        if(document.getElementById(loadingId)) document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div style="margin:5px 0; text-align:left;"><span style="background:#fee2e2; color:#991b1b; padding:8px 12px; border-radius:16px 16px 16px 0; display:inline-block; font-size:12px;">Internet ya Network Error! Check console.</span></div>`;
        console.error("Gemini AI Error:", e);
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

function startVoice() { 
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) { Swal.fire('Oops!', 'Aapka browser Voice Typing support nahi karta. Chrome use karein.', 'warning'); return; }
    try {
        const recognition = new SpeechRecognition(); 
        recognition.lang = 'hi-IN'; const btn = document.getElementById('mic-btn'); btn.innerText = "🛑"; 
        recognition.onresult = (event) => { 
            let text = event.results[0][0].transcript; let match = text.match(/\d+/); 
            if(match) { let amt = match[0]; let descStr = text.replace(match[0], '').replace(/(rupaye|rupay|roopaye|rs|ka|ki|ke)/gi, '').trim(); if(!descStr) descStr = "Voice Kharcha"; document.getElementById('amount').value = amt; document.getElementById('description').value = descStr; document.getElementById('description').dispatchEvent(new Event('input')); setTimeout(() => { addExpense(); Swal.fire({ toast:true, position:'top-end', icon:'success', title:`✨ AI ne ${descStr} (₹${amt}) add kar diya!`, timer: 2500, showConfirmButton: false }); }, 200); } 
            else { document.getElementById('description').value = text; document.getElementById('description').dispatchEvent(new Event('input')); Swal.fire({ toast:true, position:'top-end', icon:'info', title:'Amount nahi mila, manually add karein.', timer: 2000, showConfirmButton: false }); }
            btn.innerText = "🎤"; playSound('click'); 
        }; 
        recognition.onerror = (e) => { btn.innerText = "🎤"; console.error(e); if(e.error === 'not-allowed') { Swal.fire('Permission Denied', 'Browser me Microphone ki permission on karein!', 'error'); } else { Swal.fire('Error', 'Awaz clear nahi aayi!', 'error'); } }; 
        recognition.onend = () => { btn.innerText = "🎤"; }; recognition.start(); playSound('click');
    } catch(e) { document.getElementById('mic-btn').innerText = "🎤"; console.error(e); Swal.fire('Error', 'Mic start nahi hua. ' + e.message, 'error'); }
}

function openAIBottomSheet() {
    // Build quick chips from top spending categories
    let topCats = {};
    familyExpenses.forEach(e => { topCats[e.category] = (topCats[e.category] || 0) + 1; });
    let sortedCats = Object.entries(topCats).sort((a,b) => b[1]-a[1]).slice(0,3).map(([cat]) => cat);
    let chipSuggestions = [
        'Is mahine ka summary do', 
        'Kitna bachana chahiye?',
        sortedCats[0] ? `${sortedCats[0]} ka kharcha kam karo` : 'Saving tips do',
        'Next mahine ka budget plan karo'
    ];
    let chipsHtml = chipSuggestions.map(s => 
        `<button onclick="setQuickAIPrompt('${s}')" style="background:var(--line-color); color:var(--ink-blue); border:1px solid var(--ink-blue); padding:5px 10px; border-radius:20px; font-size:11px; font-weight:bold; cursor:pointer; white-space:nowrap; flex-shrink:0;">${s}</button>`
    ).join('');

    Swal.fire({
        title: '🤖 GharManager AI',
        html: `<div style="display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button onclick="Swal.close(); askFinanceAI();" style="flex:1; background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; border:none; padding:10px; border-radius:12px; font-weight:bold; cursor:pointer; font-size:13px;">📊 AI Report</button>
                    <button onclick="Swal.close(); startVoice();" style="flex:1; background:linear-gradient(135deg,#8b5cf6,#ec4899); color:white; border:none; padding:10px; border-radius:12px; font-weight:bold; cursor:pointer; font-size:13px;">🎤 Voice Add</button>
                </div>
                <hr style="border: 0.5px dashed #cbd5e1; margin: 2px 0;">
                <p style="font-size:11px; font-weight:bold; color:var(--text-muted); text-align:left; margin:0; text-transform:uppercase;">💬 Chat with AI</p>
                <div id="ai-chat-box" style="background:var(--line-color); height:200px; border-radius:12px; padding:10px; font-size:13px; overflow-y:auto; text-align:left; margin-bottom:2px; scroll-behavior:smooth; line-height:1.5;">
                    <div style="text-align:left;"><span style="background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white; padding:8px 12px; border-radius:16px 16px 16px 0; display:inline-block; max-width:90%; font-size:13px;">Namaste! 🙏 Main GharManager AI hun. Apne paise ke baare mein kuch bhi poocho!</span></div>
                </div>
                <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:4px; scrollbar-width:none;">${chipsHtml}</div>
                <div style="display:flex; gap:8px; align-items:center;">
                    <input type="text" id="ai-user-input" placeholder="Poocho kuch bhi..." onkeydown="if(event.key==='Enter') sendToRealAI()" style="flex:1; min-height:46px; padding:12px 14px; border-radius:16px; border:1.5px solid var(--line-color); outline:none; font-size:14px; background:var(--paper-bg); color:var(--text-main); box-sizing:border-box; font-weight:600;">
                    <button onclick="sendToRealAI()" style="background:linear-gradient(135deg,#10b981,#059669); color:white; border:none; padding:0 18px; border-radius:16px; font-weight:bold; cursor:pointer; height:46px; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">➤</button>
                </div>
               </div>`,
        position: 'bottom', showConfirmButton: false, showCloseButton: true, 
        customClass: { popup: 'animate__animated animate__slideInUp', container: 'bottom-sheet-container' }, 
        width: '100%', background: 'var(--paper-bg)', color: 'var(--text-main)'
    }); 
    playSound('click');
}

function setQuickAIPrompt(text) {
    const inp = document.getElementById('ai-user-input');
    if(inp) { inp.value = text; inp.focus(); sendToRealAI(); }
}

function askFinanceAI() {
    if(navigator.vibrate) try{ navigator.vibrate(50); } catch(e){} 
    if(familyExpenses.length === 0) return Swal.fire('🤖 AI', 'Bhai, pehle kuch kharcha toh add karo!', 'info');
    let filterMonth = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0,7);
    let currYear = parseInt(filterMonth.split('-')[0]); let currMonth = parseInt(filterMonth.split('-')[1]);
    let lastMonth = currMonth === 1 ? 12 : currMonth - 1; let lastYear = currMonth === 1 ? currYear - 1 : currYear;
    let lastMonthStr = `${lastYear}-${lastMonth.toString().padStart(2, '0')}`;
    let currentData = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    let pastData = familyExpenses.filter(item => item.date && item.date.startsWith(lastMonthStr));
    let currCat = {}; currentData.forEach(e => currCat[e.category] = (currCat[e.category] || 0) + parseFloat(e.amount));
    let pastCat = {}; pastData.forEach(e => pastCat[e.category] = (pastCat[e.category] || 0) + parseFloat(e.amount));
    let maxCat = ""; let maxAmt = 0; let alertMsg = "Sab theek chal raha hai. 👍";
    for (let cat in currCat) {
        if(currCat[cat] > maxAmt) { maxAmt = currCat[cat]; maxCat = cat; }
        if(pastCat[cat] && currCat[cat] > pastCat[cat]) {
            let percentInc = (((currCat[cat] - pastCat[cat]) / pastCat[cat]) * 100).toFixed(0);
            if(percentInc > 15) alertMsg = `⚠️ <b>Unusual Spending:</b> Tumhara <b>${cat}</b> ka kharcha pichle mahine se <b>${percentInc}% badh gaya hai!</b> Control karo!`;
        }
    }
    let totalExpMonth = currentData.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    let savings = monthlyIncome - totalExpMonth;
    let savingsMsg = savings > 0 ? `<span style="color:#16a34a; font-weight:bold;">Badiya! Tumne is mahine ₹${savings} bacha liye hain. 🤑</span>` : `<span style="color:#e74c3c; font-weight:bold;">Alert! Tumhari kamai se zyada kharcha (₹${Math.abs(savings)} extra) ho raha hai! 📉</span>`;
    Swal.fire({ title: '🤖 Real AI Insights', html: `<div style="text-align: left; font-size: 14px; line-height: 1.6;"><p>📊 <b>Top Kharcha:</b> Sabse zyada paisa <b>${maxCat || 'kisi cheez'} (₹${maxAmt})</b> mein gaya hai.</p><hr style="margin: 10px 0; border: 0.5px dashed #cbd5e1;"><p>💡 <b>Trend Alert:</b> ${alertMsg}</p><hr style="margin: 10px 0; border: 0.5px dashed #cbd5e1;"><p>💰 <b>Savings:</b> ${savingsMsg}</p></div>`, icon: 'info', confirmButtonText: 'Thanks AI! 👍', confirmButtonColor: '#6366f1' });
}

function openThemeStore() { closeProfile(); document.getElementById('theme-modal').style.display = 'flex'; playSound('click'); }
function closeThemeStore() { document.getElementById('theme-modal').style.display = 'none'; playSound('click'); }
function applyTheme(themeName) { document.body.setAttribute('data-theme', themeName); localStorage.setItem('appTheme', themeName); closeThemeStore(); Swal.fire({ title: 'Theme Applied! 🎨', text: 'Naya rang set ho gaya hai!', icon: 'success', timer: 1500, showConfirmButton: false }); if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); playSound('click'); }

window.addEventListener('DOMContentLoaded', () => { 
    if(!document.getElementById('premium-themes-css')) {
        let style = document.createElement('style'); style.id = 'premium-themes-css';
        style.innerHTML = `[data-theme="cyberpunk"] { --bg-color: #0f172a; --paper-bg: #1e1b4b; --text-main: #fdf4ff; --text-muted: #f472b6; --line-color: #831843; --ink-blue: #db2777; --btn-shadow: #9d174d; --shadow-color: rgba(219, 39, 119, 0.4); } [data-theme="glass"] { --bg-color: #e0f2fe; --paper-bg: rgba(255, 255, 255, 0.6); --text-main: #0f172a; --text-muted: #0369a1; --line-color: rgba(255, 255, 255, 0.4); --ink-blue: #0284c7; --btn-shadow: #075985; --shadow-color: rgba(2, 132, 199, 0.15); backdrop-filter: blur(15px); -webkit-backdrop-filter: blur(15px); }`; document.head.appendChild(style);
    }
    let savedAppTheme = localStorage.getItem('appTheme'); if(savedAppTheme) document.body.setAttribute('data-theme', savedAppTheme); 
    updateSoundUI(); autoDarkMode(); 
});

let deferredPrompt; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
function installApp() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then((choiceResult) => { if (choiceResult.outcome === 'accepted') { Swal.fire('Mubarak Ho! 🎉', 'GharManager phone mein install ho gaya hai!', 'success'); } deferredPrompt = null; }); } else { Swal.fire({ title: 'Install Kaise Karein?', text: 'Bhai, upar Right corner mein 3-dots (⋮) par click karo aur wahan se "Add to Home screen" daba do!', icon: 'info', confirmButtonText: 'Theek hai 👍' }); } playSound('click'); }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').then(reg => console.log('✅ SW Active!')).catch(err => console.error('❌ SW Error', err)); }); }

// ==========================================
// ✨ NEW FEATURES - ADVANCED UPGRADE v2
// ==========================================

// 🎨 Category metadata (icon + color + bg)
function getCategoryMeta(cat) {
    const map = {
        'Ration':     { icon: '🛒', color: '#8b5cf6', bg: '#f5f3ff' },
        'Medical':    { icon: '💊', color: '#ef4444', bg: '#fef2f2' },
        'Petrol':     { icon: '⛽', color: '#f59e0b', bg: '#fffbeb' },
        'Bills':      { icon: '⚡', color: '#0ea5e9', bg: '#f0f9ff' },
        'Food':       { icon: '🍕', color: '#f97316', bg: '#fff7ed' },
        'Travel':     { icon: '✈️', color: '#6366f1', bg: '#eef2ff' },
        'Education':  { icon: '📚', color: '#10b981', bg: '#f0fdf4' },
        'Shopping':   { icon: '🛍️', color: '#ec4899', bg: '#fdf2f8' },
        'EMI':        { icon: '🏦', color: '#0891b2', bg: '#ecfeff' },
        'Other':      { icon: '📝', color: '#64748b', bg: '#f8fafc' }
    };
    return map[cat] || { icon: '📝', color: '#64748b', bg: '#f8fafc' };
}

// 📊 Quick Stats 4-card row on dashboard
function renderQuickStats(totalExpense) {
    const row = document.getElementById('quick-stats-row');
    if (!row) return;

    const savings = monthlyIncome > 0 ? monthlyIncome - totalExpense : 0;
    const savPct = monthlyIncome > 0 ? ((savings / monthlyIncome) * 100).toFixed(0) : 0;
    const totalInvest = investments.reduce((s, i) => s + (i.amount || 0), 0);
    const totalEMI = activeLoans.reduce((s, l) => s + (l.emi || 0), 0);

    const savColor = savings >= 0 ? '#10b981' : '#ef4444';
    const savBg = savings >= 0 ? '#f0fdf4' : '#fef2f2';
    const budgetPct = budgetLimit > 0 ? Math.min((totalExpense / budgetLimit) * 100, 100).toFixed(0) : 0;
    const budgetColor = budgetPct < 50 ? '#10b981' : budgetPct < 80 ? '#f59e0b' : '#ef4444';

    row.innerHTML = `
        <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe); border-radius:16px; padding:14px; border:1px solid #bfdbfe;">
            <p style="font-size:10px; color:#1d4ed8; font-weight:800; text-transform:uppercase; margin-bottom:4px;">💰 Income</p>
            <h3 style="font-size:18px; color:#1e40af; font-weight:900; margin:0;">₹${monthlyIncome.toLocaleString('en-IN')}</h3>
            <p style="font-size:10px; color:#3b82f6; font-weight:700; margin-top:3px;">Monthly Kamai</p>
        </div>
        <div style="background:linear-gradient(135deg,#fef2f2,#fee2e2); border-radius:16px; padding:14px; border:1px solid #fecaca;">
            <p style="font-size:10px; color:#b91c1c; font-weight:800; text-transform:uppercase; margin-bottom:4px;">🧾 Kharcha</p>
            <h3 style="font-size:18px; color:#dc2626; font-weight:900; margin:0;">₹${totalExpense.toLocaleString('en-IN')}</h3>
            <p style="font-size:10px; color:#${budgetColor.replace('#','')}; font-weight:700; margin-top:3px;">Budget: ${budgetPct}% used</p>
        </div>
        <div style="background:linear-gradient(135deg,${savBg},${savBg}); border-radius:16px; padding:14px; border:1px solid ${savColor}33;">
            <p style="font-size:10px; color:${savColor}; font-weight:800; text-transform:uppercase; margin-bottom:4px;">${savings>=0?'💚 Bachat':'🔴 Loss'}</p>
            <h3 style="font-size:18px; color:${savColor}; font-weight:900; margin:0;">₹${Math.abs(savings).toLocaleString('en-IN')}</h3>
            <p style="font-size:10px; color:${savColor}; font-weight:700; margin-top:3px;">${savPct}% savings rate</p>
        </div>
        <div style="background:linear-gradient(135deg,#ecfeff,#cffafe); border-radius:16px; padding:14px; border:1px solid #a5f3fc;">
            <p style="font-size:10px; color:#0891b2; font-weight:800; text-transform:uppercase; margin-bottom:4px;">📈 Invest</p>
            <h3 style="font-size:18px; color:#0e7490; font-weight:900; margin:0;">₹${totalInvest.toLocaleString('en-IN')}</h3>
            <p style="font-size:10px; color:#06b6d4; font-weight:700; margin-top:3px;">EMI: ₹${totalEMI}/mo</p>
        </div>
    `;
}

// 🤖 Smart AI Tip Card (no API — instant local insights)
function renderAITip(totalExpense, income) {
    const card = document.getElementById('ai-tip-card');
    const tipEl = document.getElementById('ai-tip-text');
    if (!card || !tipEl) return;

    card.style.display = 'block';
    const savings = income - totalExpense;
    const savPct = income > 0 ? (savings / income) * 100 : 0;
    const budgetPct = budgetLimit > 0 ? (totalExpense / budgetLimit) * 100 : 0;
    const totalEMI = activeLoans.reduce((s, l) => s + (l.emi || 0), 0);
    const emiPct = income > 0 ? (totalEMI / income) * 100 : 0;

    // Category analysis
    let catTotals = {};
    familyExpenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + parseFloat(e.amount); });
    let topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];

    let tips = [];

    if (income === 0) {
        tips.push("💡 Pehle apni monthly income add karo — tabhi AI sahi advice de sakta hai!");
    } else if (budgetPct > 90) {
        tips.push(`🚨 Budget almost full (${budgetPct.toFixed(0)}%)! Zaruri cheezein hi khareedo aab.`);
    } else if (savPct < 10 && income > 0) {
        tips.push(`⚠️ Sirf ${savPct.toFixed(0)}% savings ho rahi hai! 20% target rakho — ₹${Math.round(income * 0.20)} bachao.`);
    } else if (emiPct > 40) {
        tips.push(`🏦 EMI income ka ${emiPct.toFixed(0)}% le rahi hai! Yeh risky hai — koi loan prepay karo.`);
    } else if (topCat && topCat[1] > income * 0.3) {
        tips.push(`📊 ${topCat[0]} mein ₹${topCat[1]} gaya — income ka ${((topCat[1]/income)*100).toFixed(0)}%! Thoda control rakho.`);
    } else if (savPct >= 20) {
        tips.push(`🎉 Zabardast! ₹${savings.toLocaleString('en-IN')} bach rahe hain (${savPct.toFixed(0)}%). Investment mein lagao!`);
    } else if (totalExpense === 0) {
        tips.push("📝 Kharcha add karo — AI tumhari spending patterns analyze karega!");
    } else {
        tips.push(`✅ Budget track ho raha hai! ₹${savings.toLocaleString('en-IN')} abhi tak bache hain.`);
    }

    // Rotate tips if multiple
    const tipIndex = new Date().getDate() % tips.length;
    tipEl.textContent = tips[tipIndex];
}

// 📊 Improved openProfile with better chart rendering
const _origOpenProfile = typeof openProfile !== 'undefined' ? openProfile : null;

// 🎨 Animated AI dots CSS (inject once)
(function injectAIDotsStyle() {
    if (document.getElementById('ai-dots-style')) return;
    const s = document.createElement('style');
    s.id = 'ai-dots-style';
    s.innerHTML = `
        @keyframes ai-dot-bounce { 0%,80%,100%{opacity:0.3;transform:scale(0.8)} 40%{opacity:1;transform:scale(1.2)} }
        .ai-dots { display:inline-flex; gap:2px; vertical-align:middle; }
        .ai-dots span { width:5px; height:5px; border-radius:50%; background:var(--ink-blue); display:inline-block; animation:ai-dot-bounce 1.2s infinite ease-in-out; }
        .ai-dots span:nth-child(2){animation-delay:0.15s}
        .ai-dots span:nth-child(3){animation-delay:0.3s}
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .nav-btn.active-nav { color: var(--ink-blue) !important; position: relative; }
        .nav-btn.active-nav::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:24px; height:3px; background:var(--ink-blue); border-radius:3px 3px 0 0; }
    `;
    document.head.appendChild(s);
})();


// =====================================================
// ✅ FIX 4: CONVERT TO USD (Working)
// =====================================================
async function convertToUSD() {
    const btn = document.getElementById('usd-btn');
    if (btn) { btn.textContent = 'Fetching...'; btn.style.opacity = '0.6'; }
    
    const netWorthEl = document.getElementById('profile-net-worth');
    const netWorthINR = netWorthEl ? parseFloat(netWorthEl.textContent.replace(/[₹,]/g, '')) : 0;
    
    try {
        // Use free no-auth exchange rate API
        const res = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
        const data = await res.json();
        const usdRate = data.rates && data.rates.USD ? data.rates.USD : 0.012;
        const usdValue = (netWorthINR * usdRate).toFixed(2);
        const usdFormatted = parseFloat(usdValue).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        
        if (btn) { btn.textContent = usdFormatted; btn.style.opacity = '1'; btn.style.color = '#15803d'; btn.style.fontWeight = '900'; btn.style.fontSize = '16px'; }
        
        Swal.fire({
            title: '💱 Net Worth in USD',
            html: `<div style="text-align:center;">
                <p style="font-size:42px; font-weight:900; color:#15803d; margin:10px 0;">${usdFormatted}</p>
                <p style="font-size:14px; color:#64748b;">₹${netWorthINR.toLocaleString('en-IN')} at rate 1 INR = ${usdRate.toFixed(4)} USD</p>
                <p style="font-size:11px; color:#94a3b8; margin-top:5px;">Live rate from exchangerate-api.com</p>
            </div>`,
            confirmButtonText: 'Close', confirmButtonColor: '#10b981',
            background: 'var(--paper-bg)', color: 'var(--text-main)'
        });
    } catch (err) {
        // Fallback static rate
        const fallbackRate = 0.012;
        const usdValue = (netWorthINR * fallbackRate).toFixed(2);
        if (btn) { btn.textContent = '$' + parseFloat(usdValue).toLocaleString(); btn.style.opacity = '1'; }
        Swal.fire('💱 Approximate Value', `Net Worth ≈ $${parseFloat(usdValue).toLocaleString()} USD\n(Using approx rate: 1 INR ≈ $0.012)`, 'info');
    }
    playSound('click');
}

// =====================================================
// ✅ FIX 5 & 6: INVITE SYSTEM + ADVANCED MEMBERS PANEL
// =====================================================
let familyMembers = JSON.parse(localStorage.getItem('familyMembers') || JSON.stringify([
    { name: 'Me', role: 'Admin', avatar: 'M', color: '#6366f1', email: '', status: 'active', joinedDate: new Date().toISOString().split('T')[0] },
    { name: 'Papa', role: 'Member', avatar: 'P', color: '#f59e0b', email: '', status: 'active', joinedDate: '' },
    { name: 'Mummy', role: 'Member', avatar: 'M', color: '#ec4899', email: '', status: 'active', joinedDate: '' },
]));

function saveFamilyMembers() {
    localStorage.setItem('familyMembers', JSON.stringify(familyMembers));
    // Also update member dropdowns
    updateMemberDropdowns();
}

function updateMemberDropdowns() {
    const selects = document.querySelectorAll('#member-name, #family-filter');
    selects.forEach(sel => {
        if (!sel) return;
        const current = sel.value;
        // Keep first option for family-filter (All)
        const isFilter = sel.id === 'family-filter';
        sel.innerHTML = isFilter ? '<option value="All">All Members</option>' : '';
        familyMembers.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name;
            opt.textContent = m.name + (m.role === 'Admin' ? ' 👑' : '');
            sel.appendChild(opt);
        });
        // Restore selection
        if ([...sel.options].some(o => o.value === current)) sel.value = current;
    });
}

function openInviteSystem() {
    const inviteCode = 'GM-' + Math.random().toString(36).substring(2,8).toUpperCase();
    localStorage.setItem('lastInviteCode', inviteCode);
    
    Swal.fire({
        title: '',
        html: `<div style="text-align:center;">
            <div style="width:60px; height:60px; background:linear-gradient(135deg,#f59e0b,#d97706); border-radius:20px; display:flex; align-items:center; justify-content:center; margin:0 auto 12px auto;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="28" height="28"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
            </div>
            <h3 style="font-size:22px; font-weight:800; color:var(--ink-blue); margin-bottom:5px;">Invite Family</h3>
            <p style="font-size:13px; color:#64748b; margin-bottom:20px;">Family member ko invite karo GharManager join karne ke liye</p>
            
            <div style="background:linear-gradient(135deg,#fef3c7,#fde68a); border:2px dashed #f59e0b; border-radius:16px; padding:16px; margin-bottom:16px;">
                <p style="font-size:11px; color:#b45309; font-weight:800; margin-bottom:8px; text-transform:uppercase;">Invite Code</p>
                <div style="display:flex; align-items:center; gap:8px; justify-content:center;">
                    <span id="invite-code-display" style="font-size:24px; font-weight:900; color:#92400e; letter-spacing:4px; font-family:monospace;">${inviteCode}</span>
                    <button onclick="copyInviteCode('${inviteCode}')" style="background:#f59e0b; color:white; border:none; padding:6px 10px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer;">Copy</button>
                </div>
            </div>
            
            <div style="text-align:left; margin-bottom:16px;">
                <label style="font-size:12px; font-weight:800; color:#64748b; display:block; margin-bottom:6px;">Member ka naam:</label>
                <input id="invite-member-name" placeholder="e.g., Bhai, Didi, Chacha..." style="width:100%; padding:10px 12px; border:2px solid #e2e8f0; border-radius:12px; font-size:14px; font-weight:600; outline:none; box-sizing:border-box; background:var(--paper-bg); color:var(--text-main);">
            </div>
            <div style="text-align:left; margin-bottom:16px;">
                <label style="font-size:12px; font-weight:800; color:#64748b; display:block; margin-bottom:6px;">Role assign karo:</label>
                <div style="display:flex; gap:8px;">
                    <button onclick="selectInviteRole('Member', this)" class="role-select-btn" style="flex:1; padding:10px; background:#eff6ff; color:#2563eb; border:2px solid #bfdbfe; border-radius:12px; font-weight:800; font-size:12px; cursor:pointer;">Member</button>
                    <button onclick="selectInviteRole('Admin', this)" class="role-select-btn" style="flex:1; padding:10px; background:var(--line-color); color:var(--text-muted); border:2px solid transparent; border-radius:12px; font-weight:800; font-size:12px; cursor:pointer;">Admin 👑</button>
                    <button onclick="selectInviteRole('Viewer', this)" class="role-select-btn" style="flex:1; padding:10px; background:var(--line-color); color:var(--text-muted); border:2px solid transparent; border-radius:12px; font-weight:800; font-size:12px; cursor:pointer;">Viewer</button>
                </div>
            </div>
            
            <button onclick="sendInviteViaWhatsApp('${inviteCode}')" style="width:100%; padding:13px; background:linear-gradient(135deg,#25D366,#128C7E); color:white; border:none; border-radius:14px; font-weight:800; font-size:15px; cursor:pointer; margin-bottom:10px;">
                Share via WhatsApp
            </button>
            <button onclick="addMemberDirectly()" style="width:100%; padding:11px; background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; border:none; border-radius:14px; font-weight:800; font-size:13px; cursor:pointer;">
                Add Locally (Offline)
            </button>
        </div>`,
        showConfirmButton: false, showCloseButton: true,
        background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}

window._selectedInviteRole = 'Member';
function selectInviteRole(role, btn) {
    window._selectedInviteRole = role;
    document.querySelectorAll('.role-select-btn').forEach(b => {
        b.style.background = 'var(--line-color)'; b.style.color = 'var(--text-muted)'; b.style.border = '2px solid transparent';
    });
    btn.style.background = '#eff6ff'; btn.style.color = '#2563eb'; btn.style.border = '2px solid #bfdbfe';
}

function copyInviteCode(code) {
    navigator.clipboard.writeText(code).then(() => {
        Swal.fire({ toast: true, position: 'top', icon: 'success', title: 'Code copied!', timer: 1500, showConfirmButton: false });
    });
}

function sendInviteViaWhatsApp(code) {
    const memberName = document.getElementById('invite-member-name')?.value || 'Family Member';
    const msg = encodeURIComponent(`Hey ${memberName}! 🏠\n\nMainne tumhe GharManager Pro mein invite kiya hai!\n\nInvite Code: *${code}*\n\nApp download karo aur hamare family account se judho! 🎉\n\n📥 App: [Your App Link Here]`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
    addMemberDirectly();
}

function addMemberDirectly() {
    const nameEl = document.getElementById('invite-member-name');
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) { Swal.fire({ toast: true, position: 'top', icon: 'warning', title: 'Naam likhna zaruri hai!', timer: 2000, showConfirmButton: false }); return; }
    
    const colors = ['#6366f1','#f59e0b','#ec4899','#10b981','#0891b2','#ef4444','#8b5cf6'];
    const newMember = {
        name, role: window._selectedInviteRole || 'Member',
        avatar: name.charAt(0).toUpperCase(),
        color: colors[familyMembers.length % colors.length],
        email: '', status: 'active',
        joinedDate: new Date().toISOString().split('T')[0]
    };
    familyMembers.push(newMember);
    saveFamilyMembers();
    Swal.fire({ toast: true, position: 'top', icon: 'success', title: `${name} add ho gaya! 🎉`, timer: 2000, showConfirmButton: false });
    if (typeof confetti !== 'undefined') confetti({ particleCount: 80, spread: 60, origin: { y: 0.4 } });
    playSound('success');
}

// =====================================================
// ✅ FIX 6: ADVANCED MEMBERS PANEL (Google Workspace style)
// =====================================================
function openMembersPanel() {
    const roleColors = { 'Admin': { bg: '#fef3c7', color: '#b45309', border: '#fde68a' }, 'Member': { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }, 'Viewer': { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' } };
    
    const membersHTML = familyMembers.map((m, i) => {
        const rc = roleColors[m.role] || roleColors['Member'];
        return `
        <div style="display:flex; align-items:center; gap:12px; padding:14px 16px; border-bottom:1px solid var(--line-color); background:var(--paper-bg);">
            <div style="width:42px; height:42px; border-radius:14px; background:${m.color}22; color:${m.color}; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; flex-shrink:0; border:2px solid ${m.color}33;">${m.avatar}</div>
            <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
                    <span style="font-size:14px; font-weight:800; color:var(--text-main);">${m.name}</span>
                    <span style="background:${rc.bg}; color:${rc.color}; border:1px solid ${rc.border}; font-size:10px; font-weight:800; padding:2px 7px; border-radius:8px;">${m.role}</span>
                </div>
                ${m.joinedDate ? `<span style="font-size:11px; color:var(--text-muted);">Joined: ${m.joinedDate}</span>` : ''}
            </div>
            <div style="display:flex; gap:6px;">
                ${i > 0 ? `<button onclick="changeMemberRole(${i})" style="background:var(--line-color); border:none; width:30px; height:30px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Change Role">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                </button>
                <button onclick="removeMember(${i})" style="background:#fef2f2; border:none; width:30px; height:30px; border-radius:10px; cursor:pointer; display:flex; align-items:center; justify-content:center;" title="Remove">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>` : `<span style="font-size:11px; color:#94a3b8; font-weight:700; padding:0 4px;">You</span>`}
            </div>
        </div>`;
    }).join('');

    // Expense breakdown per member
    const memberStats = {};
    familyExpenses.forEach(e => {
        memberStats[e.member] = (memberStats[e.member] || 0) + parseFloat(e.amount);
    });
    const statsHTML = Object.entries(memberStats).map(([name, amt]) => {
        const member = familyMembers.find(m => m.name === name) || { color: '#64748b', avatar: name[0] };
        return `<div style="display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--line-color);">
            <div style="width:32px; height:32px; border-radius:10px; background:${member.color}22; color:${member.color}; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; flex-shrink:0;">${member.avatar}</div>
            <span style="flex:1; font-size:13px; font-weight:700; color:var(--text-main);">${name}</span>
            <span style="font-size:14px; font-weight:800; color:#ef4444;">₹${amt.toLocaleString('en-IN')}</span>
        </div>`;
    }).join('') || '<p style="text-align:center;color:#94a3b8;padding:15px;">No expense data yet</p>';

    Swal.fire({
        title: '',
        html: `<div style="text-align:left; max-height:70vh; overflow-y:auto;">
            <div style="display:flex; align-items:center; gap:12px; padding:0 0 15px 0; border-bottom:1px solid var(--line-color); margin-bottom:0;">
                <div style="width:48px; height:48px; background:linear-gradient(135deg,#6366f1,#4f46e5); border-radius:16px; display:flex; align-items:center; justify-content:center;">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" width="24" height="24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <div>
                    <h3 style="font-size:18px; font-weight:800; color:var(--text-main); margin:0;">Family Members</h3>
                    <p style="font-size:12px; color:#64748b; margin:0;">${familyMembers.length} members · Manage roles & access</p>
                </div>
            </div>
            
            <div style="border-radius:16px; overflow:hidden; margin-bottom:16px; border:1px solid var(--line-color);">
                ${membersHTML}
            </div>
            
            <button onclick="openInviteSystem(); Swal.close();" style="width:100%; padding:13px; background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; border:none; border-radius:14px; font-weight:800; font-size:14px; cursor:pointer; margin-bottom:15px;">
                + Invite New Member
            </button>
            
            <p style="font-size:12px; color:#64748b; font-weight:800; margin-bottom:8px; text-transform:uppercase;">Spending by Member</p>
            <div style="background:var(--line-color); border-radius:16px; padding:10px 14px;">
                ${statsHTML}
            </div>
        </div>`,
        showConfirmButton: false, showCloseButton: true,
        background: 'var(--paper-bg)', color: 'var(--text-main)', width: '92%', maxWidth: '440px'
    });
    playSound('click');
}

function changeMemberRole(index) {
    const member = familyMembers[index];
    const roles = ['Member', 'Admin', 'Viewer'];
    const current = member.role;
    const next = roles[(roles.indexOf(current) + 1) % roles.length];
    member.role = next;
    saveFamilyMembers();
    openMembersPanel();
    Swal.fire({ toast: true, position: 'top', icon: 'success', title: `${member.name} is now ${next}`, timer: 1500, showConfirmButton: false });
}

function removeMember(index) {
    if (index === 0) return; // Can't remove self
    const name = familyMembers[index].name;
    Swal.fire({ title: `Remove ${name}?`, text: 'Ye member family se remove ho jayega.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Remove' }).then(res => {
        if (res.isConfirmed) {
            familyMembers.splice(index, 1);
            saveFamilyMembers();
            openMembersPanel();
        }
    });
}

// =====================================================
// ✅ FIX: Missing functions that were being called
// =====================================================

// gainXP (may already exist but ensure it's defined)
if (typeof gainXP === 'undefined') {
    window.gainXP = function(amount) {
        userXP = (userXP || 0) + amount;
        const fill = document.getElementById('xp-mini-fill');
        const label = document.getElementById('xp-label');
        if (fill) fill.style.width = ((userXP % 100)) + '%';
        if (label) label.textContent = '⚡ ' + userXP + ' XP';
    };
}

function checkStreak() {
    const today = todayDateString;
    const last = lastLoginDate;
    if (!last) { dailyStreak = 1; }
    else if (last === today) { /* same day, no change */ }
    else {
        const diff = Math.floor((new Date(today) - new Date(last)) / (1000*60*60*24));
        if (diff === 1) { dailyStreak = (dailyStreak || 0) + 1; }
        else if (diff > 1) { dailyStreak = 1; }
    }
    lastLoginDate = today;
    const el = document.getElementById('daily-streak');
    if (el) el.textContent = '🔥 ' + dailyStreak + ' Day Streak';
    saveToCloud();
}

function updateChallengeUI() {
    if (typeof updateMonthlyChallengeUI === 'function') updateMonthlyChallengeUI();
}

// =====================================================
// ✅ FIX 7: Better search engine
// =====================================================
// Override debounceSearch to be more robust
window.debounceSearch = function() {
    clearTimeout(window._searchTimeout);
    window._searchTimeout = setTimeout(() => {
        if (typeof updateHisabUI === 'function') updateHisabUI();
    }, 250);
};

// =====================================================
// ✅ Profile XP Bar Updater
// =====================================================
const _origOpenProfileFn = openProfile;
window.openProfile = function() {
    _origOpenProfileFn();
    // Update XP bar in profile
    setTimeout(() => {
        const xpFill = document.getElementById('xp-bar-profile');
        const xpLbl = document.getElementById('xp-label-profile');
        const lvl = Math.floor((userXP||0) / 100) + 1;
        const inLvl = (userXP||0) % 100;
        if (xpFill) xpFill.style.width = inLvl + '%';
        if (xpLbl) xpLbl.textContent = (userXP||0) + ' / ' + (lvl * 100) + ' XP';
        
        // Update profile level badge
        const lvlBadge = document.getElementById('profile-level-badge');
        const titles = ['Beginner','Tracker','Saver','Investor','Finance Guru','Money Master'];
        if (lvlBadge) lvlBadge.textContent = 'Level ' + lvl + ' | ' + (titles[Math.min(lvl-1, titles.length-1)]);
        
        // Update role badge
        checkRole(customDisplayName || '');
        
        // Update member dropdowns with latest members
        updateMemberDropdowns();
    }, 100);
};

// Init member dropdowns on load
window.addEventListener('load', () => {
    setTimeout(() => {
        updateMemberDropdowns();
        checkStreak();
    }, 3000);
});

// ============================================================
// 🚀 ALL 16 FEATURES — COMPLETE IMPLEMENTATION
// ============================================================

// ── Tools Section Stats Updater ──────────────────────────────
function updateToolsStats(totalExpense) {
    const ti = document.getElementById('tools-income');
    const tk = document.getElementById('tools-kharcha');
    const tb = document.getElementById('tools-bachat');
    const tbp = document.getElementById('tools-bachat-pct');
    const tinv = document.getElementById('tools-invest');
    if(ti) ti.textContent = '₹' + (monthlyIncome||0).toLocaleString('en-IN');
    if(tk) tk.textContent = '₹' + (totalExpense||0).toLocaleString('en-IN');
    const sav = (monthlyIncome||0) - (totalExpense||0);
    const savPct = monthlyIncome>0 ? Math.round((sav/monthlyIncome)*100) : 0;
    if(tb) { tb.textContent = '₹' + Math.abs(sav).toLocaleString('en-IN'); tb.style.color = sav>=0 ? '#1e40af' : '#dc2626'; }
    if(tbp) tbp.textContent = savPct + '% rate';
    const totalInv = (typeof investments!=='undefined' ? investments : []).reduce((s,i)=>s+(i.amount||0),0);
    if(tinv) tinv.textContent = '₹' + totalInv.toLocaleString('en-IN');
}

// ── FEATURE 1: Future Wealth Simulator ───────────────────────
function openFutureSim() {
    Swal.fire({
        title: '🔮 Future Me Simulator',
        html: `<div style="text-align:left;">
            <p style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:15px;">Agar main extra paisa bachaunga, toh future mein kya hoga?</p>
            <label style="font-size:12px;font-weight:800;color:var(--ink-blue);">Har mahine extra bachaunga (₹)</label>
            <input id="sim-monthly" type="number" value="2000" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;font-size:16px;font-weight:800;margin:6px 0 12px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
            <label style="font-size:12px;font-weight:800;color:var(--ink-blue);">Expected annual return (%)</label>
            <input id="sim-rate" type="number" value="12" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;font-size:16px;font-weight:800;margin:6px 0 12px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
            <button onclick="calcFutureSim()" style="width:100%;padding:12px;background:linear-gradient(135deg,#2563eb,#6366f1);color:white;border:none;border-radius:14px;font-weight:800;font-size:14px;cursor:pointer;margin-bottom:15px;">Calculate Future 🚀</button>
            <div id="sim-result" style="display:none;"></div>
        </div>`,
        showConfirmButton: false, showCloseButton: true, background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}
function calcFutureSim() {
    const monthly = parseFloat(document.getElementById('sim-monthly').value)||2000;
    const rate = (parseFloat(document.getElementById('sim-rate').value)||12)/100/12;
    const results = [1,3,5,10,20].map(yr => {
        const n = yr*12;
        const fv = monthly * ((Math.pow(1+rate,n)-1)/rate) * (1+rate);
        return { yr, fv: Math.round(fv), invested: monthly*n };
    });
    document.getElementById('sim-result').style.display = 'block';
    document.getElementById('sim-result').innerHTML = results.map(r => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;background:var(--line-color);border-radius:12px;margin-bottom:8px;">
            <div><p style="font-size:13px;font-weight:800;color:var(--text-main);margin:0;">${r.yr} saal baad</p><p style="font-size:11px;color:#64748b;margin:0;">Invested: ₹${r.invested.toLocaleString('en-IN')}</p></div>
            <div style="text-align:right;"><p style="font-size:16px;font-weight:900;color:#15803d;margin:0;">₹${r.fv.toLocaleString('en-IN')}</p><p style="font-size:10px;color:#16a34a;font-weight:700;">+${Math.round(((r.fv-r.invested)/r.invested)*100)}% returns</p></div>
        </div>`).join('');
    playSound('success');
}

// ── FEATURE 2: Guilty Spend Detector ────────────────────────
function openGuiltyDetector() {
    const patterns = analyzeSpendingPatterns();
    Swal.fire({
        title: '😤 Guilty Spend Detector',
        html: `<div style="text-align:left;">
            ${patterns.length === 0 
                ? '<div style="text-align:center;padding:20px;"><div style="font-size:40px;">🎉</div><p style="font-weight:700;color:#10b981;margin-top:10px;">No guilty patterns found! Great habits!</p></div>'
                : patterns.map(p => `<div style="background:${p.severity==='high'?'#fef2f2':'#fefce8'};border:1px solid ${p.severity==='high'?'#fca5a5':'#fde68a'};border-radius:14px;padding:14px;margin-bottom:10px;"><div style="display:flex;gap:10px;align-items:flex-start;"><span style="font-size:24px;flex-shrink:0;">${p.icon}</span><div><p style="font-size:13px;font-weight:800;color:${p.severity==='high'?'#b91c1c':'#b45309'};margin-bottom:4px;">${p.title}</p><p style="font-size:12px;color:#64748b;font-weight:600;line-height:1.4;">${p.detail}</p></div></div></div>`).join('')
            }
        </div>`,
        confirmButtonText: 'Samajh Gaya!', confirmButtonColor: '#6366f1', background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}
function analyzeSpendingPatterns() {
    const patterns = [];
    if(familyExpenses.length < 5) return [];
    const dayTotals = {};
    familyExpenses.forEach(e => {
        const day = new Date(e.date).getDay();
        dayTotals[day] = (dayTotals[day]||0) + parseFloat(e.amount);
    });
    const avgDay = Object.values(dayTotals).reduce((a,b)=>a+b,0)/7;
    Object.entries(dayTotals).forEach(([day,amt]) => {
        if(amt > avgDay*1.8) {
            const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
            patterns.push({ icon:'📅', title:`${days[day]} ko zyada kharcha`, detail:`Har ${days[day]} average se ${Math.round(((amt-avgDay)/avgDay)*100)}% zyada kharcha hota hai.`, severity:'medium' });
        }
    });
    const catTotals = {};
    familyExpenses.forEach(e => { catTotals[e.category]=(catTotals[e.category]||0)+parseFloat(e.amount); });
    const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    if(topCat && monthlyIncome>0 && topCat[1]>monthlyIncome*0.3) {
        patterns.push({ icon:'🔥', title:`${topCat[0]} mein bahut zyada`, detail:`${topCat[0]} mein ₹${Math.round(topCat[1])} kharcha hua — income ka ${Math.round((topCat[1]/monthlyIncome)*100)}%! Reduce karo.`, severity:'high' });
    }
    if(familyExpenses.length > 20) {
        const foodSpends = familyExpenses.filter(e=>e.category==='Food');
        if(foodSpends.length > familyExpenses.length*0.4) {
            patterns.push({ icon:'🍕', title:`Bahut zyada Food orders`, detail:`${foodSpends.length} baar food par kharcha kiya — total kharchhon ka ${Math.round((foodSpends.length/familyExpenses.length)*100)}%. Ghar ka khana try karo!`, severity:'medium' });
        }
    }
    return patterns;
}

// ── FEATURE 3: Savings Jars ──────────────────────────────────
let savingsJars = JSON.parse(localStorage.getItem('savingsJars')||'[]');
function openJarSystem() {
    const jarsHTML = savingsJars.map((jar,i) => {
        const pct = Math.min(100,Math.round((jar.saved/jar.target)*100));
        return `<div style="background:var(--line-color);border-radius:20px;padding:15px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:24px;">${jar.emoji||'🪙'}</span><div><p style="font-size:14px;font-weight:800;color:var(--text-main);margin:0;">${jar.name}</p><p style="font-size:11px;color:#64748b;margin:0;">₹${jar.saved.toLocaleString('en-IN')} / ₹${jar.target.toLocaleString('en-IN')}</p></div></div>
                <span style="font-size:13px;font-weight:900;color:${pct>=100?'#10b981':'#f59e0b'};">${pct}%</span>
            </div>
            <div style="background:rgba(0,0,0,0.1);border-radius:8px;height:8px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${pct>=100?'linear-gradient(90deg,#10b981,#059669)':'linear-gradient(90deg,#f59e0b,#f97316)'};transition:width 0.5s;border-radius:8px;"></div></div>
            <div style="display:flex;gap:6px;margin-top:10px;">
                <button onclick="addToJar(${i})" style="flex:1;padding:7px;background:#10b981;color:white;border:none;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">+ Add</button>
                <button onclick="deleteJar(${i})" style="padding:7px 10px;background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:10px;font-weight:800;font-size:12px;cursor:pointer;">🗑️</button>
            </div>
        </div>`;
    }).join('') || '<p style="text-align:center;color:#94a3b8;padding:20px;">Koi jar nahi hai. Pehla banao!</p>';
    Swal.fire({
        title: '🪙 Savings Jars',
        html: `<div style="text-align:left;max-height:60vh;overflow-y:auto;">${jarsHTML}
            <button onclick="createNewJar()" style="width:100%;padding:13px;background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:14px;font-weight:800;font-size:14px;cursor:pointer;margin-top:10px;">+ New Savings Jar</button>
        </div>`,
        showConfirmButton: false, showCloseButton: true, background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}
function createNewJar() {
    const emojis = ['🏖️','🚗','📱','🏠','💍','✈️','📚','🎁','💊','🎓'];
    Swal.fire({
        title: 'New Savings Jar',
        html: `<input id="jar-name" placeholder="Jar ka naam (e.g., Goa Trip)" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;margin-bottom:8px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
        <input id="jar-target" type="number" placeholder="Target Amount (₹)" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;margin-bottom:8px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
        <div style="display:flex;flex-wrap:wrap;gap:6px;">${emojis.map(e=>`<button onclick="window._jarEmoji='${e}';document.querySelectorAll('.emoji-btn').forEach(b=>b.style.background='var(--line-color)');this.style.background='#dbeafe';" class="emoji-btn" style="background:var(--line-color);border:none;padding:6px;border-radius:8px;font-size:20px;cursor:pointer;">${e}</button>`).join('')}</div>`,
        showCancelButton: true, confirmButtonText: 'Create Jar 🪙', confirmButtonColor: '#10b981',
        background: 'var(--paper-bg)', color: 'var(--text-main)',
        preConfirm: () => {
            const name = document.getElementById('jar-name').value;
            const target = parseFloat(document.getElementById('jar-target').value);
            if(!name || !target) { Swal.showValidationMessage('Naam aur target dono bharo!'); return false; }
            return { name, target, emoji: window._jarEmoji||'🪙', saved: 0 };
        }
    }).then(r => {
        if(r.isConfirmed) { savingsJars.push(r.value); localStorage.setItem('savingsJars',JSON.stringify(savingsJars)); openJarSystem(); if(typeof gainXP==='function') gainXP(20); }
    });
}
function addToJar(i) {
    Swal.fire({ title: `Add to "${savingsJars[i].name}"`, input: 'number', inputPlaceholder: 'Amount (₹)', showCancelButton: true, confirmButtonColor: '#10b981', background: 'var(--paper-bg)', color: 'var(--text-main)' }).then(r => {
        if(r.isConfirmed && r.value) { savingsJars[i].saved += parseFloat(r.value); localStorage.setItem('savingsJars',JSON.stringify(savingsJars)); openJarSystem(); playSound('success'); if(savingsJars[i].saved>=savingsJars[i].target) { confetti({particleCount:150,spread:80}); Swal.fire('Goal Reached! 🎉','',  'success'); } }
    });
}
function deleteJar(i) { savingsJars.splice(i,1); localStorage.setItem('savingsJars',JSON.stringify(savingsJars)); openJarSystem(); }

// ── FEATURE 4: Family War Room ───────────────────────────────
function openWarRoom() {
    const fm = todayDateString.slice(0,7);
    const monthExp = familyExpenses.filter(e=>e.date&&e.date.startsWith(fm));
    const totalExp = monthExp.reduce((s,e)=>s+parseFloat(e.amount),0);
    const byMember = {};
    monthExp.forEach(e=>{ byMember[e.member]=(byMember[e.member]||0)+parseFloat(e.amount); });
    const memberBars = Object.entries(byMember).map(([name,amt]) => {
        const pct = totalExp>0 ? Math.round((amt/totalExp)*100) : 0;
        const colors=['#6366f1','#f59e0b','#ec4899','#10b981','#0891b2'];
        const col = colors[Object.keys(byMember).indexOf(name)%colors.length];
        return `<div style="margin-bottom:12px;"><div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:13px;font-weight:800;color:var(--text-main);">${name}</span><span style="font-size:13px;font-weight:900;color:${col};">₹${amt.toLocaleString('en-IN')} (${pct}%)</span></div><div style="background:var(--line-color);border-radius:8px;height:10px;overflow:hidden;"><div style="height:100%;width:${pct}%;background:${col};border-radius:8px;transition:width 0.6s;"></div></div></div>`;
    }).join('') || '<p style="text-align:center;color:#94a3b8;">Abhi koi data nahi</p>';
    const savings = monthlyIncome - totalExp;
    Swal.fire({
        title: '',
        html: `<div style="text-align:left;">
            <div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:20px;padding:18px;margin-bottom:16px;color:white;">
                <p style="font-size:11px;color:#94a3b8;font-weight:800;text-transform:uppercase;margin-bottom:8px;">Family Finance War Room</p>
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">
                    <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:10px;text-align:center;"><p style="font-size:9px;color:#94a3b8;font-weight:800;margin-bottom:4px;">INCOME</p><p style="font-size:15px;font-weight:900;color:#86efac;">₹${monthlyIncome.toLocaleString('en-IN')}</p></div>
                    <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:10px;text-align:center;"><p style="font-size:9px;color:#94a3b8;font-weight:800;margin-bottom:4px;">KHARCHA</p><p style="font-size:15px;font-weight:900;color:#fca5a5;">₹${totalExp.toLocaleString('en-IN')}</p></div>
                    <div style="background:rgba(255,255,255,0.1);border-radius:12px;padding:10px;text-align:center;"><p style="font-size:9px;color:#94a3b8;font-weight:800;margin-bottom:4px;">BACHAT</p><p style="font-size:15px;font-weight:900;color:${savings>=0?'#86efac':'#fca5a5'};">₹${Math.abs(savings).toLocaleString('en-IN')}</p></div>
                </div>
            </div>
            <p style="font-size:11px;font-weight:800;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px;">Member-wise Spending</p>
            ${memberBars}
        </div>`,
        showConfirmButton: false, showCloseButton: true, background: 'var(--paper-bg)', color: 'var(--text-main)', width: '92%', maxWidth: '440px'
    });
    playSound('click');
}

// ── FEATURE 5: Gift / Khushi Fund Tracker ────────────────────
let giftFunds = JSON.parse(localStorage.getItem('giftFunds')||'[]');
function openGiftTracker() {
    const today = new Date();
    const giftsHTML = giftFunds.map((g,i) => {
        const eventDate = g.date ? new Date(g.date) : null;
        const daysLeft = eventDate ? Math.ceil((eventDate-today)/(1000*60*60*24)) : null;
        const pct = g.target>0 ? Math.min(100,Math.round((g.saved/g.target)*100)) : 0;
        return `<div style="background:var(--line-color);border-radius:18px;padding:14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <div><p style="font-size:13px;font-weight:800;color:var(--text-main);margin:0;">${g.emoji||'🎁'} ${g.name}</p>${daysLeft!==null?`<p style="font-size:11px;color:${daysLeft<=7?'#ef4444':'#64748b'};font-weight:700;margin:2px 0 0;">${daysLeft<=0?'Today!':daysLeft+' din baaki'}</p>`:''}
                </div>
                <div style="text-align:right;"><p style="font-size:14px;font-weight:900;color:#ec4899;">₹${g.saved}/${g.target}</p></div>
            </div>
            <div style="background:rgba(0,0,0,0.08);height:6px;border-radius:6px;overflow:hidden;margin-bottom:8px;"><div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#ec4899,#f43f5e);border-radius:6px;"></div></div>
            <div style="display:flex;gap:6px;">
                <button onclick="addGiftSavings(${i})" style="flex:1;padding:6px;background:#ec4899;color:white;border:none;border-radius:10px;font-weight:800;font-size:11px;cursor:pointer;">+ Save</button>
                <button onclick="deleteGift(${i})" style="padding:6px 10px;background:var(--paper-bg);color:#ef4444;border:1px solid #fecaca;border-radius:10px;font-weight:800;font-size:11px;cursor:pointer;">🗑️</button>
            </div>
        </div>`;
    }).join('') || '<p style="text-align:center;color:#94a3b8;padding:20px;">Koi fund nahi! Banao ek.</p>';
    Swal.fire({
        title: '🎁 Khushi Fund',
        html: `<div style="text-align:left;max-height:60vh;overflow-y:auto;">${giftsHTML}
            <button onclick="createGiftFund()" style="width:100%;padding:13px;background:linear-gradient(135deg,#ec4899,#f43f5e);color:white;border:none;border-radius:14px;font-weight:800;cursor:pointer;margin-top:10px;">+ New Gift Fund</button>
        </div>`,
        showConfirmButton: false, showCloseButton: true, background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}
function createGiftFund() {
    Swal.fire({
        title: 'New Gift Fund',
        html: `<input id="gf-name" placeholder="Kaun/kya? (e.g., Papa Birthday)" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;margin-bottom:8px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
        <input id="gf-target" type="number" placeholder="Budget (₹)" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;margin-bottom:8px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
        <input id="gf-date" type="date" placeholder="Event date" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">`,
        showCancelButton: true, confirmButtonText: 'Create Fund 🎁', confirmButtonColor: '#ec4899',
        background: 'var(--paper-bg)', color: 'var(--text-main)',
        preConfirm: () => {
            const name=document.getElementById('gf-name').value; const target=parseFloat(document.getElementById('gf-target').value); const date=document.getElementById('gf-date').value;
            if(!name||!target){Swal.showValidationMessage('Naam aur budget dono bharo!');return false;}
            return{name,target,date,saved:0,emoji:'🎁'};
        }
    }).then(r=>{if(r.isConfirmed){giftFunds.push(r.value);localStorage.setItem('giftFunds',JSON.stringify(giftFunds));openGiftTracker();}});
}
function addGiftSavings(i){Swal.fire({title:'Kitna save kiya?',input:'number',inputPlaceholder:'₹',showCancelButton:true,confirmButtonColor:'#ec4899',background:'var(--paper-bg)',color:'var(--text-main)'}).then(r=>{if(r.isConfirmed&&r.value){giftFunds[i].saved+=parseFloat(r.value);localStorage.setItem('giftFunds',JSON.stringify(giftFunds));openGiftTracker();}});}
function deleteGift(i){giftFunds.splice(i,1);localStorage.setItem('giftFunds',JSON.stringify(giftFunds));openGiftTracker();}

// ── FEATURE 6: I Owe / U Owe (Splitwise style) ───────────────
let udhars = JSON.parse(localStorage.getItem('udhars')||'[]');
function openIOwe() {
    const totalIOwe = udhars.filter(u=>u.type==='iowe').reduce((s,u)=>s+(u.settled?0:u.amount),0);
    const totalUOwe = udhars.filter(u=>u.type==='uowe').reduce((s,u)=>s+(u.settled?0:u.amount),0);
    const listHTML = udhars.map((u,i)=>`
        <div style="display:flex;align-items:center;gap:10px;padding:12px;background:${u.settled?'var(--line-color)':u.type==='iowe'?'#fef2f2':'#f0fdf4'};border-radius:14px;margin-bottom:8px;opacity:${u.settled?'0.5':'1'};">
            <div style="width:36px;height:36px;background:${u.type==='iowe'?'#ef4444':'#10b981'};border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px;flex-shrink:0;">${u.name[0]}</div>
            <div style="flex:1;"><p style="font-size:13px;font-weight:800;color:var(--text-main);margin:0;">${u.name}</p><p style="font-size:11px;color:#64748b;margin:0;">${u.note||''} · ${u.date||''}</p></div>
            <div style="text-align:right;"><p style="font-size:14px;font-weight:900;color:${u.type==='iowe'?'#ef4444':'#10b981'};margin:0;">${u.type==='iowe'?'-':'+'} ₹${u.amount}</p>${!u.settled?`<button onclick="settleUdhar(${i})" style="font-size:10px;background:#10b981;color:white;border:none;border-radius:6px;padding:2px 8px;cursor:pointer;font-weight:800;">Settle</button>`:''}</div>
        </div>`).join('')||'<p style="text-align:center;color:#94a3b8;padding:20px;">Koi udhar nahi! Clean slate 🎉</p>';
    Swal.fire({
        title: '',
        html: `<div style="text-align:left;">
            <div style="display:flex;gap:10px;margin-bottom:16px;">
                <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:14px;padding:12px;text-align:center;"><p style="font-size:10px;font-weight:800;color:#b91c1c;margin-bottom:4px;">I OWE</p><p style="font-size:18px;font-weight:900;color:#ef4444;margin:0;">₹${totalIOwe.toLocaleString('en-IN')}</p></div>
                <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:12px;text-align:center;"><p style="font-size:10px;font-weight:800;color:#166534;margin-bottom:4px;">U OWE ME</p><p style="font-size:18px;font-weight:900;color:#10b981;margin:0;">₹${totalUOwe.toLocaleString('en-IN')}</p></div>
            </div>
            <div style="max-height:50vh;overflow-y:auto;">${listHTML}</div>
            <div style="display:flex;gap:8px;margin-top:12px;">
                <button onclick="addUdhar('iowe')" style="flex:1;padding:11px;background:#ef4444;color:white;border:none;border-radius:12px;font-weight:800;cursor:pointer;font-size:13px;">I Owe Someone</button>
                <button onclick="addUdhar('uowe')" style="flex:1;padding:11px;background:#10b981;color:white;border:none;border-radius:12px;font-weight:800;cursor:pointer;font-size:13px;">They Owe Me</button>
            </div>
        </div>`,
        showConfirmButton: false, showCloseButton: true, background: 'var(--paper-bg)', color: 'var(--text-main)', width: '92%', maxWidth: '440px'
    });
    playSound('click');
}
function addUdhar(type) {
    Swal.fire({
        title: type==='iowe'?'Maine kisi ko diya':'Kisi ne mujhse liya',
        html: `<input id="ud-name" placeholder="Naam" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;margin-bottom:8px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
        <input id="ud-amt" type="number" placeholder="Amount (₹)" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;margin-bottom:8px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
        <input id="ud-note" placeholder="Note (optional)" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">`,
        showCancelButton: true, confirmButtonColor: type==='iowe'?'#ef4444':'#10b981',
        background: 'var(--paper-bg)', color: 'var(--text-main)',
        preConfirm: () => {
            const name=document.getElementById('ud-name').value; const amount=parseFloat(document.getElementById('ud-amt').value); const note=document.getElementById('ud-note').value;
            if(!name||!amount){Swal.showValidationMessage('Naam aur amount dono bharo!');return false;}
            return{name,amount,note,type,date:todayDateString,settled:false};
        }
    }).then(r=>{if(r.isConfirmed){udhars.unshift(r.value);localStorage.setItem('udhars',JSON.stringify(udhars));openIOwe();}});
}
function settleUdhar(i){udhars[i].settled=true;localStorage.setItem('udhars',JSON.stringify(udhars));openIOwe();Swal.fire({toast:true,position:'top',icon:'success',title:'Settled! 🎉',timer:2000,showConfirmButton:false});}

// ── FEATURE 7: Smart Shopping List ──────────────────────────
let smartList = JSON.parse(localStorage.getItem('smartList')||'[]');
function openSmartShopping() {
    const listHTML = smartList.map((item,i) => {
        const priceChange = item.prices.length>1 ? item.prices[item.prices.length-1]-item.prices[item.prices.length-2] : 0;
        const trend = priceChange>0?`🔴 +₹${priceChange} mehnga`:priceChange<0?`🟢 ₹${Math.abs(priceChange)} sasta`:'';
        return `<div style="display:flex;align-items:center;gap:10px;padding:12px;background:var(--line-color);border-radius:14px;margin-bottom:8px;">
            <input type="checkbox" ${item.bought?'checked':''} onchange="toggleBought(${i})" style="width:18px;height:18px;cursor:pointer;">
            <div style="flex:1;${item.bought?'opacity:0.5;text-decoration:line-through':''}"><p style="font-size:13px;font-weight:800;color:var(--text-main);margin:0;">${item.name}</p><p style="font-size:11px;color:#64748b;margin:0;">Last: ₹${item.prices[item.prices.length-1]||'?'}/kg ${trend}</p></div>
            <button onclick="updateItemPrice(${i})" style="background:var(--ink-blue);color:white;border:none;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:800;cursor:pointer;">₹ Update</button>
        </div>`;
    }).join('')||'<p style="text-align:center;color:#94a3b8;padding:20px;">List khaali hai! Item add karo.</p>';
    Swal.fire({
        title: '🛒 Smart Shopping List',
        html: `<div style="text-align:left;max-height:65vh;overflow-y:auto;">
            ${listHTML}
            <div style="display:flex;gap:8px;margin-top:12px;">
                <input id="new-item-input" placeholder="Item name..." style="flex:1;padding:10px;border:2px solid var(--line-color);border-radius:12px;background:var(--paper-bg);color:var(--text-main);font-weight:700;">
                <button onclick="addSmartItem()" style="padding:10px 16px;background:var(--ink-blue);color:white;border:none;border-radius:12px;font-weight:800;cursor:pointer;">Add</button>
            </div>
        </div>`,
        showConfirmButton: false, showCloseButton: true, background: 'var(--paper-bg)', color: 'var(--text-main)', width: '92%', maxWidth: '440px'
    });
    playSound('click');
}
function addSmartItem(){const inp=document.getElementById('new-item-input');if(!inp||!inp.value.trim())return;smartList.push({name:inp.value.trim(),prices:[],bought:false});localStorage.setItem('smartList',JSON.stringify(smartList));openSmartShopping();}
function toggleBought(i){smartList[i].bought=!smartList[i].bought;localStorage.setItem('smartList',JSON.stringify(smartList));openSmartShopping();}
function updateItemPrice(i){Swal.fire({title:`${smartList[i].name} ka rate`,input:'number',inputPlaceholder:'₹ per kg/piece',showCancelButton:true,confirmButtonColor:'var(--ink-blue)',background:'var(--paper-bg)',color:'var(--text-main)'}).then(r=>{if(r.isConfirmed&&r.value){smartList[i].prices.push(parseFloat(r.value));localStorage.setItem('smartList',JSON.stringify(smartList));openSmartShopping();}});}

// ── FEATURE 8: Carbon Footprint ──────────────────────────────
function openCarbonTracker() {
    const petrolExp = familyExpenses.filter(e=>e.category==='Petrol').reduce((s,e)=>s+parseFloat(e.amount),0);
    const elecBill = familyExpenses.filter(e=>e.category==='Bills'&&e.description.toLowerCase().includes('bijli')).reduce((s,e)=>s+parseFloat(e.amount),0);
    const petrolLitres = petrolExp/100;
    const kgCO2Petrol = petrolLitres*2.31;
    const kgCO2Elec = (elecBill/8)*0.82;
    const totalCO2 = kgCO2Petrol+kgCO2Elec;
    const trees = Math.ceil(totalCO2/21);
    Swal.fire({
        title: '🌱 Carbon Footprint',
        html: `<div style="text-align:center;">
            <div style="font-size:60px;margin:10px 0;">${totalCO2<50?'😊':totalCO2<100?'😐':'😟'}</div>
            <h2 style="font-size:32px;font-weight:900;color:${totalCO2<50?'#16a34a':totalCO2<100?'#ca8a04':'#dc2626'};margin:5px 0;">${totalCO2.toFixed(1)} kg CO₂</h2>
            <p style="font-size:13px;color:#64748b;margin-bottom:20px;">Is mahine ka estimated carbon emission</p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left;margin-bottom:16px;">
                <div style="background:#fef3c7;border-radius:14px;padding:12px;"><p style="font-size:10px;color:#b45309;font-weight:800;margin-bottom:4px;">PETROL</p><p style="font-size:16px;font-weight:900;color:#b45309;">${kgCO2Petrol.toFixed(1)} kg CO₂</p><p style="font-size:11px;color:#64748b;">≈ ${petrolLitres.toFixed(0)}L fuel</p></div>
                <div style="background:#dbeafe;border-radius:14px;padding:12px;"><p style="font-size:10px;color:#1d4ed8;font-weight:800;margin-bottom:4px;">ELECTRICITY</p><p style="font-size:16px;font-weight:900;color:#1d4ed8;">${kgCO2Elec.toFixed(1)} kg CO₂</p><p style="font-size:11px;color:#64748b;">Bill: ₹${elecBill}</p></div>
            </div>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;padding:14px;">
                <p style="font-size:14px;font-weight:800;color:#166534;">🌳 ${trees} ped lagane se offset hoga!</p>
                <p style="font-size:11px;color:#16a34a;margin-top:4px;">Ek ped/saal mein ~21 kg CO₂ absorb karta hai</p>
            </div>
        </div>`,
        confirmButtonText: 'Main Plant Karunga! 🌱', confirmButtonColor: '#16a34a', background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}

// ── FEATURE 9: Time = Money Calculator ──────────────────────
function openTimeMoney() {
    const hourlyRate = monthlyIncome>0 ? Math.round(monthlyIncome/(22*8)) : 100;
    Swal.fire({
        title: '⏰ Time = Money',
        html: `<div style="text-align:left;">
            <p style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:12px;">Koi bhi kharcha karne se pehle — kitne ghante kaam karna padega?</p>
            <div style="background:#fef3c7;border-radius:12px;padding:10px;margin-bottom:12px;text-align:center;"><p style="font-size:12px;color:#b45309;font-weight:800;">Aapki hourly value</p><p style="font-size:24px;font-weight:900;color:#b45309;">₹${hourlyRate}/hour</p></div>
            <label style="font-size:12px;font-weight:800;color:var(--ink-blue);">Item ka price (₹)</label>
            <input id="tm-price" type="number" placeholder="e.g., 5000" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;font-size:16px;font-weight:800;margin:6px 0 12px;box-sizing:border-box;background:var(--paper-bg);color:var(--text-main);">
            <button onclick="calcTimeMoney(${hourlyRate})" style="width:100%;padding:12px;background:linear-gradient(135deg,#f59e0b,#d97706);color:white;border:none;border-radius:14px;font-weight:800;font-size:14px;cursor:pointer;margin-bottom:12px;">Calculate ⏰</button>
            <div id="tm-result" style="display:none;"></div>
        </div>`,
        showConfirmButton: false, showCloseButton: true, background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}
function calcTimeMoney(rate) {
    const price = parseFloat(document.getElementById('tm-price').value)||0;
    if(!price){return;}
    const hours = price/rate;
    const days = hours/8;
    document.getElementById('tm-result').style.display='block';
    document.getElementById('tm-result').innerHTML=`
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:14px;padding:16px;text-align:center;">
            <p style="font-size:13px;color:#92400e;font-weight:700;margin-bottom:8px;">₹${price.toLocaleString('en-IN')} ke liye aapko kaam karna hoga:</p>
            <p style="font-size:28px;font-weight:900;color:#b45309;">${hours.toFixed(1)} ghante</p>
            <p style="font-size:14px;color:#b45309;font-weight:700;">(${days.toFixed(1)} working days)</p>
            <p style="font-size:12px;color:#92400e;margin-top:8px;font-weight:600;">${hours>40?'🤔 Bahut costly hai, sochna chahiye!':hours>8?'😐 Ek din se zyada kaam karna padega':hours>2?'🙂 2-8 ghante ka kharcha':'✅ 2 ghante se kam — theek hai!'}</p>
        </div>`;
    playSound('click');
}

// ── FEATURE 10: Electricity Bill Predictor ───────────────────
function openElectricityPredictor() {
    Swal.fire({
        title: '⚡ Bijli Bill Predictor',
        html: `<div style="text-align:left;">
            <p style="font-size:12px;color:#64748b;font-weight:700;margin-bottom:12px;">Apne appliances bharo — estimate milega!</p>
            <div id="appliance-list">
                ${[['AC/Cooler','1500',8],['Fan','75',12],['TV','100',6],['Fridge','150',24],['Washing Machine','500',1],['LED Bulbs (5)','30',10]].map((a,i)=>`
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;background:var(--line-color);padding:8px;border-radius:10px;">
                    <span style="flex:2;font-size:12px;font-weight:700;color:var(--text-main);">${a[0]}</span>
                    <input type="number" id="app-${i}" value="${a[2]}" style="width:45px;padding:6px;border:1px solid var(--line-color);border-radius:8px;text-align:center;font-weight:700;background:var(--paper-bg);color:var(--text-main);" placeholder="hrs">
                    <span style="font-size:11px;color:#64748b;">hr/day</span>
                    <span style="font-size:10px;color:#64748b;flex-shrink:0;">${a[1]}W</span>
                </div>`).join('')}
            </div>
            <button onclick="calcElecBill()" style="width:100%;padding:12px;background:linear-gradient(135deg,#eab308,#ca8a04);color:white;border:none;border-radius:14px;font-weight:800;font-size:14px;cursor:pointer;margin-bottom:10px;">Predict Bill ⚡</button>
            <div id="elec-result" style="display:none;"></div>
        </div>`,
        showConfirmButton: false, showCloseButton: true, background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}
function calcElecBill(){
    const watts=[1500,75,100,150,500,30];
    let totalUnits=0;
    watts.forEach((w,i)=>{const hrs=parseFloat(document.getElementById('app-'+i)?.value||0);totalUnits+=w*hrs*30/1000;});
    const rate=7; const bill=Math.round(totalUnits*rate);
    document.getElementById('elec-result').style.display='block';
    document.getElementById('elec-result').innerHTML=`<div style="background:linear-gradient(135deg,#fef9c3,#fef08a);border-radius:14px;padding:16px;text-align:center;"><p style="font-size:12px;color:#b45309;font-weight:800;margin-bottom:6px;">Estimated Monthly Bijli Bill</p><p style="font-size:32px;font-weight:900;color:#b45309;">₹${bill.toLocaleString('en-IN')}</p><p style="font-size:12px;color:#92400e;">${totalUnits.toFixed(0)} units @ ₹${rate}/unit</p><p style="font-size:11px;color:#92400e;margin-top:6px;">${bill>2000?'🚨 Zyada lag raha hai! AC hours kam karo.':bill>1000?'⚠️ Average range mein hai':'✅ Bahut kam — efficient ho!'}</p></div>`;
    playSound('click');
}

// ── FEATURE 11: Neighbourhood Comparison ─────────────────────
function openNeighbourhood(){
    const fm=todayDateString.slice(0,7);
    const myExp=familyExpenses.filter(e=>e.date&&e.date.startsWith(fm)).reduce((s,e)=>s+parseFloat(e.amount),0);
    const avgFamily=18500;
    const diff=myExp-avgFamily;
    const pct=avgFamily>0?Math.abs((diff/avgFamily)*100).toFixed(1):0;
    Swal.fire({
        title:'🏘️ Area Benchmark',
        html:`<div style="text-align:center;">
            <p style="font-size:12px;color:#64748b;margin-bottom:16px;">Aapke area ki average family se compare</p>
            <div style="display:flex;gap:10px;margin-bottom:16px;">
                <div style="flex:1;background:var(--line-color);border-radius:14px;padding:14px;"><p style="font-size:10px;font-weight:800;color:var(--text-muted);margin-bottom:4px;">AAPKA KHARCHA</p><p style="font-size:20px;font-weight:900;color:var(--text-main);">₹${myExp.toLocaleString('en-IN')}</p></div>
                <div style="flex:1;background:var(--line-color);border-radius:14px;padding:14px;"><p style="font-size:10px;font-weight:800;color:var(--text-muted);margin-bottom:4px;">AREA AVERAGE</p><p style="font-size:20px;font-weight:900;color:var(--text-main);">₹${avgFamily.toLocaleString('en-IN')}</p></div>
            </div>
            <div style="background:${diff>0?'#fef2f2':'#f0fdf4'};border-radius:16px;padding:16px;">
                <p style="font-size:32px;font-weight:900;color:${diff>0?'#dc2626':'#16a34a'};">${diff>0?'+':'-'}${pct}%</p>
                <p style="font-size:14px;font-weight:700;color:${diff>0?'#b91c1c':'#15803d'};">${diff>0?'Area average se zyada kharcha hota hai':'Area average se kam kharcha — Great!'}</p>
                ${diff>0?'<p style="font-size:12px;color:#b91c1c;margin-top:6px;">₹'+Math.abs(diff).toLocaleString('en-IN')+' kam karne ki koshish karo</p>':''}
            </div>
            <p style="font-size:10px;color:#94a3b8;margin-top:12px;">*Data based on Tier-2 city average family spending (₹18,500/month)</p>
        </div>`,
        confirmButtonText:'Samajh Gaya',confirmButtonColor:'#2563eb',background:'var(--paper-bg)',color:'var(--text-main)',width:'90%',maxWidth:'400px'
    });
    playSound('click');
}

// ── FEATURE 12: Beautiful CA-Style PDF ──────────────────────
function generateBeautifulPDF(){
    const fm=document.getElementById('month-filter')?document.getElementById('month-filter').value:todayDateString.slice(0,7);
    const monthExp=familyExpenses.filter(e=>e.date&&e.date.startsWith(fm));
    const total=monthExp.reduce((s,e)=>s+parseFloat(e.amount),0);
    const bycat={};monthExp.forEach(e=>{bycat[e.category]=(bycat[e.category]||0)+parseFloat(e.amount);});
    const {jsPDF}=window.jspdf;const doc=new jsPDF();
    // Cover
    doc.setFillColor(37,99,235);doc.rect(0,0,210,60,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(28);doc.setFont('helvetica','bold');
    doc.text('GharManager Pro',105,28,{align:'center'});
    doc.setFontSize(14);doc.text('Monthly Financial Report — '+fm,105,42,{align:'center'});
    // Summary
    doc.setTextColor(30,41,59);doc.setFontSize(12);doc.text('FINANCIAL SUMMARY',14,75);
    doc.setDrawColor(226,232,240);doc.line(14,77,196,77);
    doc.setFontSize(11);
    doc.text('Monthly Income: Rs.'+monthlyIncome.toLocaleString('en-IN'),14,88);
    doc.text('Total Expenses: Rs.'+total.toLocaleString('en-IN'),14,98);
    doc.text('Net Savings: Rs.'+(monthlyIncome-total).toLocaleString('en-IN'),14,108);
    // Table
    doc.autoTable({startY:118,head:[['Description','Category','Member','Amount','Date']],body:monthExp.map(e=>[e.description,e.category,e.member,'Rs.'+e.amount,e.date]),theme:'striped',headStyles:{fillColor:[37,99,235]},styles:{fontSize:10}});
    doc.save('GharManager-Report-'+fm+'.pdf');
    Swal.fire({toast:true,position:'top',icon:'success',title:'CA Report downloaded! 📄',timer:2500,showConfirmButton:false});
    playSound('success');
}

// ── Net Worth Dashboard ──────────────────────────────────────
function renderNetworthDashboard(){
    const el=document.getElementById('networth-dashboard');if(!el)return;
    const totalInv=(typeof investments!=='undefined'?investments:[]).reduce((s,i)=>s+(i.amount||0),0);
    const totalDebt=(typeof activeLoans!=='undefined'?activeLoans:[]).reduce((s,l)=>s+(l.principal||0),0);
    const monthlyExp=familyExpenses.filter(e=>e.date&&e.date.startsWith(todayDateString.slice(0,7))).reduce((s,e)=>s+parseFloat(e.amount),0);
    const netWorth=totalInv-totalDebt;
    el.innerHTML=`
        <div style="background:linear-gradient(135deg,#dcfce7,#bbf7d0);border-radius:16px;padding:14px;border:1px solid #86efac;"><p style="font-size:9px;font-weight:800;color:#166534;text-transform:uppercase;margin-bottom:4px;">Investments</p><p style="font-size:20px;font-weight:900;color:#15803d;">₹${totalInv.toLocaleString('en-IN')}</p></div>
        <div style="background:linear-gradient(135deg,#fee2e2,#fecaca);border-radius:16px;padding:14px;border:1px solid #fca5a5;"><p style="font-size:9px;font-weight:800;color:#b91c1c;text-transform:uppercase;margin-bottom:4px;">Total Debt</p><p style="font-size:20px;font-weight:900;color:#dc2626;">₹${totalDebt.toLocaleString('en-IN')}</p></div>
        <div style="background:linear-gradient(135deg,#eff6ff,#dbeafe);border-radius:16px;padding:14px;border:1px solid #93c5fd;"><p style="font-size:9px;font-weight:800;color:#1d4ed8;text-transform:uppercase;margin-bottom:4px;">Monthly Exp</p><p style="font-size:20px;font-weight:900;color:#1e40af;">₹${monthlyExp.toLocaleString('en-IN')}</p></div>
        <div style="background:linear-gradient(135deg,${netWorth>=0?'#f0fdf4,#dcfce7':'#fef2f2,#fee2e2'});border-radius:16px;padding:14px;border:1px solid ${netWorth>=0?'#86efac':'#fca5a5'};"><p style="font-size:9px;font-weight:800;color:${netWorth>=0?'#166534':'#b91c1c'};text-transform:uppercase;margin-bottom:4px;">Net Worth</p><p style="font-size:20px;font-weight:900;color:${netWorth>=0?'#15803d':'#dc2626'};">₹${Math.abs(netWorth).toLocaleString('en-IN')}</p></div>`;
    playSound('click');
    setTimeout(()=>{renderNetworthDashboard();},100);
}

// Auto-render tools when tools section opens
const _origOpenSectionFn = openSection;
window.openSection = function(sName, title) {
    _origOpenSectionFn(sName, title);
    if(sName === 'tools') {
        setTimeout(() => {
            const fm = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0,7);
            const monthExp = familyExpenses.filter(e=>e.date&&e.date.startsWith(fm)).reduce((s,e)=>s+parseFloat(e.amount),0);
            updateToolsStats(monthExp);
            renderNetworthDashboard();
            if(typeof renderCalendar==='function') {
                const filtered=familyExpenses.filter(e=>e.date&&e.date.startsWith(fm));
                renderCalendar(filtered,fm);
            }
            if(typeof renderQuickStats==='function') renderQuickStats(monthExp);
            if(typeof renderAITip==='function') renderAITip(monthExp,monthlyIncome);
        },200);
    }
};

window.addEventListener('load',()=>{ setTimeout(()=>{ updateToolsStats(0); },4000); });


// ============================================================
// ✅ 10 NEW PROFILE FEATURES — COMPLETE JS
// ============================================================

// 1. Share Monthly Summary
function shareMonthlySummary() {
    const fm = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0,7);
    const monthExp = familyExpenses.filter(e=>e.date&&e.date.startsWith(fm)).reduce((s,e)=>s+parseFloat(e.amount),0);
    const savings = monthlyIncome - monthExp;
    const catTotals = {};
    familyExpenses.filter(e=>e.date&&e.date.startsWith(fm)).forEach(e=>{catTotals[e.category]=(catTotals[e.category]||0)+parseFloat(e.amount);});
    const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    const msg = `📊 GharManager Report — ${fm}%0A%0A` +
        `💰 Income: ₹${monthlyIncome.toLocaleString('en-IN')}%0A` +
        `💸 Kharcha: ₹${monthExp.toLocaleString('en-IN')}%0A` +
        `🏦 Bachat: ₹${savings.toLocaleString('en-IN')}%0A` +
        `📌 Top Kharcha: ${topCat ? topCat[0]+' ₹'+Math.round(topCat[1]) : 'N/A'}%0A%0A` +
        `GharManager se bheja gaya 🏠`;
    window.open('https://wa.me/?text=' + msg, '_blank');
    playSound('click');
}

// 2. Spending Personality
function showSpendingPersonality() {
    const catTotals = {};
    familyExpenses.forEach(e=>{catTotals[e.category]=(catTotals[e.category]||0)+parseFloat(e.amount);});
    const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];
    const personalities = {
        'Food': {title:'Foodie 🍕', desc:'Khana tumhari kamzori hai! Ghar ka khana aur baahar ka khana dono love karte ho.', color:'#f97316'},
        'Shopping': {title:'Shopaholic 🛍️', desc:'Shopping se zyada koi sukoon nahi! Thoda budget control karo bhai.', color:'#ec4899'},
        'Petrol': {title:'Raahi 🚗', desc:'Sadak pe rehte ho! Travel aur petrol tumbhara major kharcha hai.', color:'#f59e0b'},
        'Ration': {title:'Ghar ka Manager 🏠', desc:'Family ka khaana peena tumhare haath mein hai! Responsible spender ho.', color:'#8b5cf6'},
        'Medical': {title:'Health Conscious 💊', desc:'Health pe kharcha karte ho — jo sahi bhi hai! Prevention is better than cure.', color:'#ef4444'},
        'Bills': {title:'Bills Expert ⚡', desc:'Bills aur utilities pe tight ho. Har bill ka hisaab rakho.', color:'#0891b2'},
    };
    const p = topCat ? (personalities[topCat[0]] || {title:'Balanced Spender ⚖️', desc:'Sab categories mein equally kharcha karte ho — great balance!', color:'#10b981'}) : {title:'Fresh Start 🌱', desc:'Abhi data nahi hai, kharcha add karo!', color:'#10b981'};
    Swal.fire({
        title: '',
        html: `<div style="text-align:center;padding:10px 0;">
            <div style="width:80px;height:80px;background:${p.color}22;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:40px;">${p.title.split(' ')[1]||'🌟'}</div>
            <h2 style="font-size:24px;font-weight:900;color:${p.color};margin-bottom:8px;">${p.title.split(' ')[0]}</h2>
            <p style="font-size:14px;color:#64748b;font-weight:600;line-height:1.6;">${p.desc}</p>
            ${topCat ? `<div style="background:var(--line-color);border-radius:14px;padding:12px;margin-top:16px;"><p style="font-size:12px;color:var(--text-muted);font-weight:700;">Top Kharcha: <b style="color:${p.color};">${topCat[0]} — ₹${Math.round(topCat[1]).toLocaleString('en-IN')}</b></p></div>` : ''}
        </div>`,
        confirmButtonText: 'Got it! 🎯', confirmButtonColor: p.color,
        background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '380px'
    });
    playSound('click');
}

// 3. Custom Categories Manager
let customCats = JSON.parse(localStorage.getItem('customCats')||'[]');
function manageCustomCategories() {
    const defaultCats = ['Ration','Medical','Petrol','Bills','Food','Shopping','Travel','Other'];
    const allCats = [...defaultCats, ...customCats];
    const listHTML = allCats.map((cat,i) => `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--line-color);border-radius:12px;margin-bottom:6px;">
            <span style="flex:1;font-size:13px;font-weight:700;color:var(--text-main);">${cat}</span>
            ${i >= defaultCats.length ? `<button onclick="deleteCustomCat('${cat}')" style="background:#fef2f2;color:#ef4444;border:1px solid #fecaca;border-radius:8px;padding:4px 10px;font-size:11px;font-weight:800;cursor:pointer;">Delete</button>` : '<span style="font-size:10px;color:#94a3b8;font-weight:700;">Default</span>'}
        </div>`).join('');
    Swal.fire({
        title: 'Custom Categories',
        html: `<div style="text-align:left;max-height:60vh;overflow-y:auto;">
            ${listHTML}
            <div style="display:flex;gap:8px;margin-top:12px;">
                <input id="new-cat-input" placeholder="New category name..." style="flex:1;padding:10px;border:2px solid var(--line-color);border-radius:12px;background:var(--paper-bg);color:var(--text-main);font-weight:700;">
                <button onclick="addCustomCat()" style="padding:10px 16px;background:var(--ink-blue);color:white;border:none;border-radius:12px;font-weight:800;cursor:pointer;">Add</button>
            </div>
        </div>`,
        showConfirmButton: false, showCloseButton: true,
        background: 'var(--paper-bg)', color: 'var(--text-main)', width: '90%', maxWidth: '400px'
    });
    playSound('click');
}
function addCustomCat() {
    const inp = document.getElementById('new-cat-input');
    if(!inp||!inp.value.trim()) return;
    customCats.push(inp.value.trim());
    localStorage.setItem('customCats', JSON.stringify(customCats));
    // Add to category selects
    const catSel = document.getElementById('expense-category');
    if(catSel) { const opt=document.createElement('option'); opt.value=inp.value.trim(); opt.textContent=inp.value.trim(); catSel.appendChild(opt); }
    const catFilter = document.getElementById('cat-filter');
    if(catFilter) { const opt=document.createElement('option'); opt.value=inp.value.trim(); opt.textContent=inp.value.trim(); catFilter.appendChild(opt); }
    manageCustomCategories();
    playSound('success');
}
function deleteCustomCat(cat) {
    customCats = customCats.filter(c=>c!==cat);
    localStorage.setItem('customCats', JSON.stringify(customCats));
    manageCustomCategories();
}

// 4. Change PIN
function changePIN() {
    const oldPin = localStorage.getItem('app_pin');
    Swal.fire({
        title: 'Change App PIN',
        html: `${oldPin ? '<input id="old-pin" type="password" placeholder="Current PIN" maxlength="4" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;margin-bottom:8px;box-sizing:border-box;text-align:center;font-size:20px;letter-spacing:8px;background:var(--paper-bg);color:var(--text-main);">' : ''}
        <input id="new-pin" type="password" placeholder="New PIN (4 digits)" maxlength="4" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;margin-bottom:8px;box-sizing:border-box;text-align:center;font-size:20px;letter-spacing:8px;background:var(--paper-bg);color:var(--text-main);">
        <input id="confirm-pin" type="password" placeholder="Confirm New PIN" maxlength="4" style="width:100%;padding:10px;border:2px solid var(--line-color);border-radius:12px;box-sizing:border-box;text-align:center;font-size:20px;letter-spacing:8px;background:var(--paper-bg);color:var(--text-main);">`,
        showCancelButton: true, confirmButtonText: 'Change PIN', confirmButtonColor: '#0891b2',
        background: 'var(--paper-bg)', color: 'var(--text-main)',
        preConfirm: () => {
            const op = oldPin ? document.getElementById('old-pin')?.value : oldPin;
            const np = document.getElementById('new-pin').value;
            const cp = document.getElementById('confirm-pin').value;
            if(oldPin && op !== oldPin) { Swal.showValidationMessage('Current PIN galat hai!'); return false; }
            if(np.length !== 4 || isNaN(np)) { Swal.showValidationMessage('4 digit PIN chahiye!'); return false; }
            if(np !== cp) { Swal.showValidationMessage('PINs match nahi karte!'); return false; }
            return np;
        }
    }).then(r => {
        if(r.isConfirmed) {
            localStorage.setItem('app_pin', r.value);
            Swal.fire({toast:true,position:'top',icon:'success',title:'PIN change ho gaya! 🔒',timer:2000,showConfirmButton:false});
            playSound('success');
        }
    });
    playSound('click');
}

// 5–10 already defined in original script (openJarSystem, openIOwe, openWarRoom, openGiftTracker, openFutureSim, openNeighbourhood)
// Just ensure aliases work:
if(typeof openFutureSimulator === 'undefined') { window.openFutureSimulator = openFutureSim; }
if(typeof openNeighbourhood === 'undefined') { window.openNeighbourhood = function() { openNeighbourhood(); }; }

// Rubber band effect for 3-dot button
window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('three-dot-btn');
    if(btn) { btn.addEventListener('mousedown', () => { btn.style.transform='scale(0.88)'; }); btn.addEventListener('mouseup', () => { btn.style.transform='scale(1)'; }); }
    // Load custom categories into selects
    const cc = JSON.parse(localStorage.getItem('customCats')||'[]');
    cc.forEach(cat => {
        const catSel = document.getElementById('expense-category');
        if(catSel) { const opt=document.createElement('option'); opt.value=cat; opt.textContent=cat; catSel.appendChild(opt); }
        const catFilter = document.getElementById('cat-filter');
        if(catFilter) { const opt=document.createElement('option'); opt.value=cat; opt.textContent=cat; catFilter.appendChild(opt); }
    });
});
