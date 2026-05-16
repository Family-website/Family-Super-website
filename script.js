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
let userRole = 'Member';
function checkRole(name) { 
    if(!name) return 'Member'; let n = name.toLowerCase(); 
    if(n.includes('aditya') || n.includes('papa')) { userRole = 'Admin'; let b = document.getElementById('role-badge'); if(b){ b.innerText = '👑 Admin'; b.style.background = '#fef08a'; b.style.color = '#b45309'; } }
    else { userRole = 'Member'; let b = document.getElementById('role-badge'); if(b){ b.innerText = '👤 Member'; b.style.background = '#e2e8f0'; b.style.color = '#475569'; } }
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

function loginWithEmail() { const email = document.getElementById('email-input').value.trim(); const password = document.getElementById('password-input').value.trim(); if (!email || password.length < 6) return Swal.fire('Oops!', 'Sahi email aur password daalein.', 'warning'); auth.signInWithEmailAndPassword(email, password).catch(() => Swal.fire('Error', 'Email ya password galat hai!', 'error')); playSound('click'); }
function registerWithEmail() { const email = document.getElementById('email-input').value.trim(); const password = document.getElementById('password-input').value.trim(); if (!email || password.length < 6) return Swal.fire('Oops!', 'Details daalein.', 'warning'); auth.createUserWithEmailAndPassword(email, password).then(() => Swal.fire('Mubarak ho!', 'Account ban gaya!', 'success')).catch(e => Swal.fire('Error', e.message, 'error')); playSound('click'); }
function logout() { Swal.fire({ title: 'Logout?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) auth.signOut(); }); playSound('click'); }

function setupPin() { let pin = document.getElementById('pin-input').value; if(pin.length === 4 && !isNaN(pin)) { localStorage.setItem('app_pin', pin); Swal.fire('Secured! 🔒', 'PIN set ho gaya!', 'success'); document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; playSound('success'); } else Swal.fire('Error', '4 number ka PIN daalein!', 'error'); }
function verifyPin() { let pin = document.getElementById('pin-input').value; let savedPin = localStorage.getItem('app_pin'); if(!savedPin) return Swal.fire('Wait', 'Setup PIN pehle karein', 'info'); if(pin === savedPin) { document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; playSound('success'); } else { Swal.fire('Galat PIN ❌', '', 'error'); document.getElementById('pin-input').value = ""; playSound('click'); } }
function biometricUnlock() { let savedPin = localStorage.getItem('app_pin'); if(!savedPin) return Swal.fire('Wait', 'Pehle PIN setup karein!', 'info'); Swal.fire({ title: 'Scanning...', html: '<div style="font-size: 50px;">☝️</div>', timer: 1500, timerProgressBar: true, showConfirmButton: false }).then(() => { document.getElementById('pin-screen').style.display = 'none'; document.getElementById('main-app').style.display = 'block'; playSound('success'); }); }

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
    familyExpenses.push({ member: "Aditya", category: "Bills", description: `📱 Recharge: ${name}`, amount: amt, date: dDate, receipt: "", gps: null });
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

function openSection(sName, title) { document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section')); document.getElementById('section-'+sName).classList.add('active-section'); document.getElementById('app-title').innerText = title; document.querySelectorAll('.nav-btn').forEach(btn => { btn.classList.remove('active-nav'); if(btn.getAttribute('onclick').includes(`'${sName}'`)) btn.classList.add('active-nav'); }); window.scrollTo({ top: 0, behavior: 'smooth' }); playSound('click'); }
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

function importBankCSV() { const fileInput = document.getElementById('bank-csv-file'); if(!fileInput.files.length) return Swal.fire('File Missing', 'Pehle ek CSV file upload karein!', 'warning'); const reader = new FileReader(); reader.onload = function(e) { let lines = e.target.result.split('\n'); let added = 0; for(let i=1; i<lines.length; i++) { let cols = lines[i].split(','); if(cols.length >= 3) { let dateVal = cols[0].trim(); let descVal = cols[1].trim(); let amtVal = parseFloat(cols[2] || cols[3] || 0); if(!isNaN(amtVal) && amtVal > 0 && descVal.length > 2) { let fDate = todayDateString; try { let d = new Date(dateVal); if(!isNaN(d)) fDate = d.toISOString().split('T')[0]; } catch(err){} familyExpenses.push({ member: "Aditya", category: "Other", description: `🏦 Bank: ${descVal.substring(0,15)}`, amount: amtVal, date: fDate, receipt: "", gps: null }); added++; } } } if(added > 0) { saveToCloud(); updateHisabUI(); playSound('success'); Swal.fire('Imported! 🏦', `${added} naye kharche bank statement se jod diye gaye!`, 'success'); } else { Swal.fire('Error', 'File format sahi nahi hai.', 'error'); } fileInput.value = ""; }; reader.readAsText(fileInput.files[0]); playSound('click'); }

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
    document.getElementById('budget-display').innerText = budgetLimit; document.getElementById('total-income-display').innerText = `₹${monthlyIncome}`;

    const searchInput = document.getElementById('search-expense'); const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
    const familyFilterInput = document.getElementById('family-filter'); const familyQuery = familyFilterInput ? familyFilterInput.value : "All";
    const sortFilterInput = document.getElementById('sort-expense'); const sortQuery = sortFilterInput ? sortFilterInput.value : "date-desc";

    let filteredExpenses = familyExpenses.filter(item => { const matchMonth = item.date && item.date.startsWith(filterMonth); const matchSearch = item.description.toLowerCase().includes(searchQuery) || item.category.toLowerCase().includes(searchQuery) || (item.member && item.member.toLowerCase().includes(searchQuery)); const matchFamily = familyQuery === "All" ? true : (item.member === familyQuery); return matchMonth && matchSearch && matchFamily; });

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
            
            li.setAttribute('ondblclick', `editExpense(${originalIndex})`); li.style.cursor = 'pointer'; 
            li.innerHTML = `<div class="list-left" style="pointer-events:none;"><strong style="font-size: 18px;">${item.description}</strong><div style="display: flex; align-items: center; margin-top: 5px; flex-wrap: wrap; gap: 5px;"><span class="member-badge">👤 ${item.member}</span> <span class="category-badge">${item.category||'Other'}</span></div></div><div class="list-right">${receiptHTML}<span style="font-weight: 800; color: #e74c3c; font-size: 20px; margin: 0 5px;">₹${item.amount}</span><button class="action-btn delete" onclick="event.stopPropagation(); deleteExpense(${originalIndex})">🗑️</button></div>`;
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
    renderCalendar(filteredExpenses, filterMonth); applyLanguageUI();
}

function renderTrendChartProfile(exps) { const ctx = document.getElementById('trendChart'); if(!ctx) return; if(trendChartInstance) trendChartInstance.destroy(); let dt = {}; exps.forEach(e => { let d = e.date.split('-')[2]; dt[d] = (dt[d] || 0) + parseFloat(e.amount); }); const labels = Object.keys(dt).sort((a,b) => parseInt(a) - parseInt(b)); const data = labels.map(d => dt[d]); const tc = isDarkMode ? '#fff' : '#333'; trendChartInstance = new Chart(ctx.getContext('2d'), { type: 'bar', data: { labels: labels.map(l => l + ' Date'), datasets: [{ label: 'Daily Spend (₹)', data: data, backgroundColor: '#8b5cf6', borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { labels: { color: tc } } }, scales: { x: { ticks: { color: tc } }, y: { ticks: { color: tc } } } } }); }
function renderCategoryChart(obj) { const ctx = document.getElementById('categoryChart'); if(!ctx) return; if(categoryChartInstance) categoryChartInstance.destroy(); const lbls = Object.keys(obj); const data = Object.values(obj); const hd = data.some(v => v > 0); const tc = isDarkMode ? '#fff' : '#333'; categoryChartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels: lbls, datasets: [{ data: hd ? data : [1], backgroundColor: hd ? ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: tc, font: {size: 11} } } }, cutout: '70%' } }); }
function renderMemberChart(obj) { const ctx = document.getElementById('memberChart'); if(!ctx) return; if(memberChartInstance) memberChartInstance.destroy(); const lbls = Object.keys(obj); const data = Object.values(obj); const hd = data.some(v => v > 0); const tc = isDarkMode ? '#fff' : '#333'; memberChartInstance = new Chart(ctx.getContext('2d'), { type: 'pie', data: { labels: lbls, datasets: [{ data: hd ? data : [1], backgroundColor: hd ? ['#2980b9', '#e84393', '#27ae60', '#8e44ad', '#16a085'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: tc, font: {size: 12, weight: 'bold'} } } } } }); }

function scrollToAdd() { openSection('hisab', 'GharManager 🏠'); document.getElementById('amount').focus(); window.scrollTo({ top: document.getElementById('amount').offsetTop - 150, behavior: 'smooth' }); playSound('click'); }

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

        let scanBtn = document.getElementById('scan-btn');
        if(scanBtn) scanBtn.style.display = 'none';

        descEl.value = ''; amtEl.value = '';
        if (typeof currentReceiptUrl !== 'undefined') currentReceiptUrl = "";

        let preview = document.getElementById('receipt-preview');
        if(preview) preview.style.display = 'none';

        let rInput = document.getElementById('receipt-img');
        if(rInput) rInput.value = "";

        if (typeof saveToCloud === 'function') saveToCloud();
        if (typeof updateHisabUI === 'function') updateHisabUI();

    } catch (e) {
        console.error("ADD EXPENSE ERROR:", e);
        Swal.fire('Error', 'Kharcha add nahi hua! Reason: ' + e.message, 'error');
    }
}

function editExpense(index) { const item = familyExpenses[index]; document.getElementById('member-name').value = item.member || 'Aditya'; document.getElementById('expense-category').value = item.category || 'Other'; document.getElementById('description').value = item.description; document.getElementById('amount').value = item.amount; document.getElementById('date').value = item.date; editExpenseIndex = index; document.getElementById('btn-add-expense').innerText = "Update Kharcha ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); playSound('click'); }
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
function payEMI(index) { let loan = activeLoans[index]; if(loan.monthsPaid >= loan.time) return; Swal.fire({ title: 'Pay EMI?', text: `Kya tum ${loan.name} ka ₹${loan.emi} Hisaab me add karna chahte ho?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Haan, Pay Karo' }).then(async (result) => { if (result.isConfirmed) { const autoExpense = { member: "Aditya", category: "Bills", description: `🏦 EMI Paid: ${loan.name}`, amount: loan.emi, date: todayDateString, receipt: "", gps: null }; familyExpenses.push(autoExpense); loan.monthsPaid += 1; gainXP(20); playSound('success'); if(loan.monthsPaid >= loan.time) { if(typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); Swal.fire('Mubarak Ho! 🎉', `Tumhara "${loan.name}" poori tarah se chukta ho gaya hai!`, 'success'); } else { Swal.fire('EMI Paid ✅', 'Hisaab mein add ho gaya hai.', 'success'); } await saveToCloud(); updateLoanUI(); updateHisabUI(); } }); playSound('click'); }
function deleteLoan(index) { playSound('click'); Swal.fire({ title: 'Delete Loan?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { activeLoans.splice(index, 1); saveToCloud(); updateLoanUI(); } }); }

function addSubscription() { const name = document.getElementById('sub-name').value; const amt = parseFloat(document.getElementById('sub-amount').value); const due = parseInt(document.getElementById('sub-due').value) || 1; if(!name || isNaN(amt) || amt <= 0) return Swal.fire('Error', 'Sahi details daalein!', 'error'); activeSubs.push({ name: name, amount: amt, dueDate: due }); saveToCloud(); updateSubsUI(); document.getElementById('sub-name').value = ''; document.getElementById('sub-amount').value = ''; playSound('success'); Swal.fire('Saved!', 'Subscription add ho gaya!', 'success'); }
function updateSubsUI() { 
    const list = document.getElementById('sub-list'); if(!list) return; list.innerHTML = ''; 
    if(activeSubs.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">No Subscriptions 📺</h3></div>`;
    activeSubs.forEach((sub, index) => { const li = document.createElement('li'); li.style.borderLeft = "4px solid #6366f1"; li.innerHTML = `<div class="list-left"><strong style="font-size:16px;">${sub.name}</strong><span style="font-size:11px; color:#64748b;">Due: Every ${sub.dueDate}th</span></div><div class="list-right" style="display:flex; gap:5px; align-items:center;"><button onclick="paySubscription(${index})" class="expense-btn" style="background:#6366f1; color:white; border:none; padding:6px; border-radius:8px; font-weight:bold; cursor:pointer; font-size:12px;">Pay ₹${sub.amount}</button><button class="action-btn delete" onclick="deleteSubscription(${index})">🗑️</button></div>`; list.appendChild(li); }); 
}
function deleteSubscription(index) { playSound('click'); activeSubs.splice(index, 1); saveToCloud(); updateSubsUI(); }
function paySubscription(index) { let sub = activeSubs[index]; playSound('click'); Swal.fire({ title: 'Pay Bill?', text: `Pay ₹${sub.amount} for ${sub.name}?`, icon: 'question', showCancelButton: true }).then((result) => { if(result.isConfirmed) { familyExpenses.push({ member: "Aditya", category: "Bills", description: `🔁 Sub Paid: ${sub.name}`, amount: sub.amount, date: todayDateString, receipt: "", gps: null }); saveToCloud(); updateHisabUI(); playSound('success'); gainXP(10); Swal.fire('Paid!', 'Bill hisaab me add ho gaya ✅', 'success'); } }); }

// ==========================================
// 💸 INVESTMENTS, RATION, DUDH, VYAJ
// ==========================================
function calculateVyaj() { const p = parseFloat(document.getElementById('vyaj-principal').value); const rate = parseFloat(document.getElementById('vyaj-rate').value); const time = parseFloat(document.getElementById('vyaj-time').value); if (isNaN(p) || isNaN(rate) || isNaN(time) || p <= 0 || time <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error'); const interest = (p * rate * time) / 100; document.getElementById('vyaj-result').style.display = 'block'; document.getElementById('vyaj-only').innerText = `₹${Math.round(interest)}`; playSound('click'); }

function updateInvestUI() { const list = document.getElementById('invest-list'); if(!list) return; list.innerHTML = ''; let totalInvest = 0; if(investments.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">No Investments Yet 📈</h3></div>`; investments.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((item, index) => { totalInvest += item.amount; const li = document.createElement('li'); li.style.borderLeft = "4px solid #06b6d4"; li.innerHTML = `<div class="list-left"><strong style="font-size:16px;">${item.type}</strong><span style="font-size:12px; color:#64748b; font-weight:bold;">📅 ${item.date}</span></div><div class="list-right"><span style="font-weight:800; color:#0891b2; font-size:18px; margin-right:10px;">₹${item.amount}</span><button class="action-btn delete" onclick="deleteInvestment(${index})">🗑️</button></div>`; list.appendChild(li); }); const totalEl = document.getElementById('invest-total-amount'); if(totalEl) totalEl.innerText = `₹${totalInvest}`; }
function addInvestment() { const type = document.getElementById('invest-type').value; const amt = parseFloat(document.getElementById('invest-amount').value); const date = document.getElementById('invest-date').value || todayDateString; if (isNaN(amt) || amt <= 0 || !date) return Swal.fire('Oops...', 'Sahi amount daalein!', 'warning'); investments.push({ type, amount: amt, date }); saveToCloud(); updateInvestUI(); gainXP(20); document.getElementById('invest-amount').value = ''; playSound('success'); Swal.fire('Great!', 'Investment add ho gaya!', 'success'); }
function deleteInvestment(index) { playSound('click'); Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { investments.splice(index, 1); saveToCloud(); updateInvestUI(); playSound('success'); } }); }

function updateRationUI() { const list = document.getElementById('ration-list'); if(!list) return; list.innerHTML = ''; if(rationItems.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">Ration list is empty 🛒</h3></div>`; rationItems.sort((a, b) => new Date(b.date) - new Date(a.date)); const uniqueDates = [...new Set(rationItems.map(item => item.date))]; uniqueDates.forEach(dateStr => { const parts = dateStr.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`; const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.style.fontWeight = 'bold'; dateHeader.style.color = '#c084fc'; dateHeader.style.margin = '10px 0 5px 0'; dateHeader.innerText = `🛒 ${showDate}`; list.appendChild(dateHeader); rationItems.forEach((item, index) => { if(item.date === dateStr) { const li = document.createElement('li'); li.style.borderLeft = item.lowStock ? "4px solid #ef4444" : "4px solid #8e44ad"; li.style.background = item.lowStock ? "#fef2f2" : "var(--line-color)"; li.innerHTML = `<div class="list-left ration-item" onclick="toggleRation(${index})" style="flex-direction: row; align-items:center; cursor:pointer; opacity: ${item.bought ? '0.5' : '1'}; flex: 2;"><input type="checkbox" ${item.bought ? 'checked' : ''} style="width: 20px; height: 20px; margin-right:10px;"><div style="display:flex; flex-direction:column;"><strong style="font-size: 16px; text-decoration: ${item.bought ? 'line-through' : 'none'}; color: ${item.lowStock ? '#ef4444' : 'var(--text-main)'}">${item.name}</strong>${item.amount > 0 ? `<span style="font-size:12px; color:#64748b; font-weight:bold;">₹${item.amount}</span>` : ''}</div></div><div class="list-right" style="flex: 1; justify-content: flex-end;"><button class="action-btn" onclick="toggleLowStock(${index})" style="background: ${item.lowStock ? '#ef4444' : '#f1f5f9'}; color: ${item.lowStock ? 'white' : 'black'}; font-size:12px; font-weight:bold; width: 60px;">${item.lowStock ? '⚠️ Low' : 'Stock OK'}</button><button class="action-btn delete" onclick="deleteRation(${index})">🗑️</button></div>`; list.appendChild(li); } }); }); }
function addRation() { const name = document.getElementById('ration-item').value; const rDate = document.getElementById('ration-date').value || todayDateString; const amount = parseFloat(document.getElementById('ration-amount').value) || 0; if(!name || !rDate) return Swal.fire('Galti', 'Samaan ka naam likhein!', 'warning'); rationItems.push({ name: name, bought: false, date: rDate, amount: amount, lowStock: false }); saveToCloud(); document.getElementById('ration-item').value = ''; document.getElementById('ration-amount').value = ''; playSound('success'); updateRationUI(); }
async function toggleRation(index) { const item = rationItems[index]; item.bought = !item.bought; playSound('click'); if (item.bought && item.amount > 0) { const autoExpense = { member: "Aditya", category: "Ration", description: `🛒 ${item.name} (Ration)`, amount: item.amount, date: todayDateString, receipt: "", gps: null }; familyExpenses.push(autoExpense); gainXP(5); playSound('success'); Swal.fire({ title: 'Hisaab mein juda!', text: `${item.name} ka ₹${item.amount} 'GharManager' mein add ho gaya hai. ✅`, icon: 'success', timer: 2000, showConfirmButton: false }); } await saveToCloud(); updateRationUI(); updateHisabUI(); }
function toggleLowStock(index) { rationItems[index].lowStock = !rationItems[index].lowStock; playSound('click'); saveToCloud(); updateRationUI(); }
function deleteRation(index) { playSound('click'); rationItems.splice(index, 1); saveToCloud(); updateRationUI(); }

function updateDudhUI() { const list = document.getElementById('dudh-list'); if(!list) return; list.innerHTML = ''; let totalLiter = 0, totalBill = 0; if(dudhRecords.length === 0) list.innerHTML = `<div style="text-align:center; padding: 20px; opacity:0.6;"><h3 style="color:var(--text-main); font-size:14px;">No Milk Records 🥛</h3></div>`; dudhRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((record, index) => { const totalDayLiter = record.morning + record.evening; const dayCost = totalDayLiter * record.rate; totalLiter += totalDayLiter; totalBill += dayCost; const parts = record.date.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`; const li = document.createElement('li'); li.innerHTML = `<div class="list-left"><div style="display:flex; align-items:center; margin-bottom:6px;"><span class="member-badge" style="background:#bfdbfe; color:#2563eb;">📅 ${showDate}</span><strong style="font-size:15px;">S: ${record.morning}L | Sh: ${record.evening}L</strong></div><div style="font-size:12px; color:#64748b; font-weight:600;">Rate: ₹${record.rate}/L | Total: ${totalDayLiter}L</div></div><div class="list-right"><span style="font-weight:800; color:#2563eb; font-size:19px; margin-right:5px;">₹${dayCost}</span><button class="action-btn edit" onclick="editDudh(${index})">✏️</button><button class="action-btn delete" onclick="deleteDudh(${index})">🗑️</button></div>`; list.appendChild(li); }); document.getElementById('dudh-total-liter').innerText = totalLiter.toFixed(2); document.getElementById('dudh-total-bill').innerText = `₹${Math.round(totalBill)}`; }
function addDudh() { const dDate = document.getElementById('dudh-date').value || todayDateString; const rate = parseFloat(document.getElementById('dudh-rate').value); const morn = parseFloat(document.getElementById('dudh-morning').value) || 0; const eve = parseFloat(document.getElementById('dudh-evening').value) || 0; if (!dDate || isNaN(rate) || (morn === 0 && eve === 0)) return Swal.fire('Galti', 'Sahi details daaliye!', 'error'); if(editDudhIndex === -1) { dudhRecords.push({ date: dDate, rate: rate, morning: morn, evening: eve }); playSound('success'); } else { dudhRecords[editDudhIndex] = { date: dDate, rate: rate, morning: morn, evening: eve }; editDudhIndex = -1; document.getElementById('btn-add-dudh').innerText = "Dudh Add Karein"; } saveToCloud(); updateDudhUI(); document.getElementById('dudh-morning').value = ''; document.getElementById('dudh-evening').value = ''; }
function editDudh(index) { const item = dudhRecords[index]; document.getElementById('dudh-date').value = item.date; document.getElementById('dudh-rate').value = item.rate; document.getElementById('dudh-morning').value = item.morning; document.getElementById('dudh-evening').value = item.evening; editDudhIndex = index; document.getElementById('btn-add-dudh').innerText = "Update Dudh ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); playSound('click'); }
function deleteDudh(index) { playSound('click'); Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { dudhRecords.splice(index, 1); saveToCloud(); updateDudhUI(); } }); }

// ==========================================
// 🖨️ BUG FIX 1: SECURE PRINT & PDF
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

    let printFrame = document.getElementById('print-frame');
    if (!printFrame) { printFrame = document.createElement('iframe'); printFrame.id = 'print-frame'; printFrame.style.position = 'absolute'; printFrame.style.top = '-10000px'; document.body.appendChild(printFrame); }
    
    const doc = printFrame.contentWindow.document;
    doc.open(); doc.write('<html><head><title>Print Report</title></head><body>' + html + '</body></html>'); doc.close();
    setTimeout(() => { printFrame.contentWindow.focus(); printFrame.contentWindow.print(); }, 500); playSound('click'); 
}

function backupData() { const dataToBackup = { expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, investments: investments, loans: activeLoans, subscriptions: activeSubs, recharges: rechargeRecords, budget: budgetLimit, income: monthlyIncome, xp: userXP, dailyStreak: dailyStreak, todoItems: todoItems, dreamGoal: dreamGoal }; const encryptedData = btoa(unescape(encodeURIComponent(JSON.stringify(dataToBackup)))); const dataStr = "data:text/plain;charset=utf-8," + encryptedData; const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", "GharManager_Encrypted_Backup.txt"); dlAnchorElem.click(); playSound('success'); }
function restoreData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async function(e) { try { let decryptedStr = e.target.result; try { decryptedStr = decodeURIComponent(escape(atob(e.target.result))); } catch(err) {} const data = JSON.parse(decryptedStr); if (data.expenses) { familyExpenses = data.expenses || []; dudhRecords = data.dudh || []; rationItems = data.ration || []; investments = data.investments || []; activeLoans = data.loans || []; activeSubs = data.subscriptions || []; rechargeRecords = data.recharges || []; budgetLimit = data.budget || 20000; monthlyIncome = data.income || 0; userXP = data.xp || 0; dailyStreak = data.dailyStreak || 0; todoItems = data.todoItems || []; dreamGoal = data.dreamGoal || { name: "No Goal", target: 0 }; await saveToCloud(); Swal.fire('Restored!', 'Aapka purana data wapas aa gaya hai! ✅', 'success'); loadCloudData(currentUser.uid); playSound('success'); } else { Swal.fire('Error', 'Yeh file sahi format mein nahi hai!', 'error'); } } catch(err) { Swal.fire('Error', 'File read nahi ho paayi.', 'error'); } }; reader.readAsText(file); }

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

// 🛡️ 10. REAL GEMINI AI CHAT & VOICE
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
    Swal.fire({
        title: '🤖 AI Assistant',
        html: `<div style="display:flex; flex-direction:column; gap:10px;">
                <button onclick="Swal.close(); startVoice();" class="expense-btn" style="background:#8b5cf6; color:white; border:none; padding:12px; border-radius:12px; font-weight:bold;">🎤 Add Kharcha by Voice</button>
                <hr style="border: 0.5px dashed #cbd5e1; margin: 5px 0;">
                <p style="font-size:12px; font-weight:bold; color:var(--ink-blue); text-align:left; margin:0;">💬 Real AI Chat (Gemini)</p>
                <div id="ai-chat-box" style="background:var(--line-color); height:150px; border-radius:12px; padding:10px; font-size:12px; overflow-y:auto; text-align:left; margin-bottom:5px;">
                    Hello! Mujhse apne kharcho ke baare me kuch bhi poocho...
                </div>
                <div style="display:flex; gap:5px;">
                    <input type="text" id="ai-user-input" placeholder="Type here..." style="flex:1; padding:8px; border-radius:8px; border:1px solid #cbd5e1; font-size:12px; background:var(--paper-bg); color:var(--text-main);">
                    <button onclick="sendToRealAI()" style="background:#10b981; color:white; border:none; padding:8px 12px; border-radius:8px; font-weight:bold;">Send</button>
                </div>
                <p style="font-size:10px; color:#64748b; margin-top:5px; cursor:pointer;" onclick="setAPIKey()">🔑 Set/Change Gemini API Key</p>
               </div>`,
        position: 'bottom', showConfirmButton: false, showCloseButton: true, customClass: { popup: 'animate__animated animate__slideInUp', container: 'bottom-sheet-container' }, width: '100%', background: 'var(--paper-bg)', color: 'var(--text-main)'
    }); 
    playSound('click');
}

async function sendToRealAI() {
    let key = localStorage.getItem('gemini_api_key');
    if(!key) { Swal.fire('API Key Missing', 'Pehle API key set karein (Neeche 🔑 icon pe click karein)', 'warning'); return; }

    let inputEl = document.getElementById('ai-user-input');
    let chatBox = document.getElementById('ai-chat-box');
    let userText = inputEl.value.trim();
    if(!userText) return;

    chatBox.innerHTML += `<div style="margin:5px 0; text-align:right;"><span style="background:#3b82f6; color:white; padding:6px 10px; border-radius:12px; display:inline-block; max-width:80%; word-wrap:break-word;">${userText}</span></div>`;
    inputEl.value = ''; chatBox.scrollTop = chatBox.scrollHeight; playSound('click');

    let filterMonth = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0,7);
    let monthData = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    let totalExp = monthData.reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    // Minified context to save tokens
    let expensesList = monthData.map(e => `${e.category}:${e.amount}`).join(', ');
    let context = `User's total expense this month is ₹${totalExp}. Income is ₹${monthlyIncome}. Expenses summary: ${expensesList}. Answer the user's question very concisely in Roman Hindi (Hinglish) without formatting. Question: ${userText}`;

    let loadingId = 'load-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" style="margin:5px 0; text-align:left;"><span style="background:var(--paper-bg); color:var(--text-main); border:1px solid #cbd5e1; padding:6px 10px; border-radius:12px; display:inline-block;">Typing... ⏳</span></div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        let response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: context }] }] })
        });
        let data = await response.json();
        let aiText = data.candidates[0].content.parts[0].text;

        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div style="margin:5px 0; text-align:left;"><span style="background:var(--paper-bg); color:var(--text-main); border:1px solid #cbd5e1; padding:6px 10px; border-radius:12px; display:inline-block; max-width:90%; word-wrap:break-word;">${aiText}</span></div>`;
        chatBox.scrollTop = chatBox.scrollHeight; playSound('success');
    } catch(e) {
        document.getElementById(loadingId).remove();
        chatBox.innerHTML += `<div style="margin:5px 0; text-align:left;"><span style="background:#fee2e2; color:#991b1b; padding:6px 10px; border-radius:12px; display:inline-block;">Network Error ya Invalid Key!</span></div>`;
    }
}

function setAPIKey() {
    Swal.fire({
        title: 'Gemini API Key',
        input: 'text',
        inputValue: localStorage.getItem('gemini_api_key') || '',
        text: 'Google AI Studio se free API key banakar yahan daalein.',
        showCancelButton: true
    }).then(res => {
        if(res.isConfirmed && res.value) {
            localStorage.setItem('gemini_api_key', res.value.trim());
            Swal.fire('Saved!', 'Real AI Chat activate ho gaya!', 'success');
        }
    });
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