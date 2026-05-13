// ==========================================
// 🔥 1. FIREBASE SETUP & CLOUD ENGINE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCej-idbSFHr3WVokG3sdpmdWPWgz5PkQk",
  authDomain: "super-family-appp.firebaseapp.com",
  projectId: "super-family-appp",
  storageBucket: "super-family-appp.firebasestorage.app",
  messagingSenderId: "250506329447",
  appId: "1:250506329447:web:cf9ac2e4d6d24b37e903c2",
  measurementId: "G-0E3C8289HF"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

// ==========================================
// 🔊 SOUND SYSTEM MANAGER
// ==========================================
let isSoundEnabled = localStorage.getItem('appSound') !== 'false';

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    localStorage.setItem('appSound', isSoundEnabled);
    updateSoundUI();
    if(isSoundEnabled) playSound('click');
}

function updateSoundUI() {
    const btn = document.getElementById('sound-toggle-btn');
    if(btn) {
        btn.innerHTML = isSoundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF';
        btn.style.color = isSoundEnabled ? '#10b981' : '#64748b';
        btn.style.borderColor = isSoundEnabled ? '#10b981' : '#64748b';
    }
}

function playSound(type) {
    if(!isSoundEnabled) return;
    try {
        if(type === 'click') document.getElementById('sound-click').play();
        if(type === 'success') document.getElementById('sound-success').play();
    } catch(e) {}
}

// ==========================================
// 🔐 2. EMAIL / PASSWORD LOGIN SYSTEM
// ==========================================
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginStatus = document.getElementById('login-status');

auth.onAuthStateChanged(async (user) => {
    const splash = document.getElementById('splash-screen');
    if(splash) splash.style.display = 'none';

    if (user) {
        currentUser = user;
        if(loginStatus) { loginStatus.style.display = 'block'; loginStatus.innerText = "Cloud se data laa rahe hain... ⏳"; }
        
        let userName = user.email.split("@")[0];
        document.getElementById('smart-greeting').innerText = `Hello! ✨`;
        const firstLetter = userName.charAt(0).toUpperCase();
        document.getElementById('user-avatar').innerText = firstLetter;
        
        loadCloudData(user.uid);
        await syncOldLocalData();
        
        if(loginScreen) loginScreen.style.opacity = "0";
        setTimeout(() => {
            if(loginScreen) loginScreen.style.display = 'none';
            if(mainApp) mainApp.style.display = 'block';
            checkSmartReminders(); 
        }, 300);
    } else {
        currentUser = null;
        if(mainApp) mainApp.style.display = 'none';
        if(loginScreen) { loginScreen.style.display = 'flex'; loginScreen.style.opacity = "1"; }
        if(loginStatus) loginStatus.style.display = 'none';
    }
});

function loginWithEmail() {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    if (!email || password.length < 6) return Swal.fire('Oops!', 'Sahi email aur password daalein.', 'warning');
    if(loginStatus) { loginStatus.style.display = 'block'; loginStatus.innerText = "Login kar rahe hain... ⏳"; }
    auth.signInWithEmailAndPassword(email, password).catch((error) => {
        if(loginStatus) loginStatus.style.display = 'none'; Swal.fire('Login Error', 'Email ya password galat hai!', 'error');
    });
}

function registerWithEmail() {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    if (!email || password.length < 6) return Swal.fire('Oops!', 'Naya account banane ke liye details daalein.', 'warning');
    if(loginStatus) { loginStatus.style.display = 'block'; loginStatus.innerText = "Naya account bana rahe hain... ⏳"; }
    auth.createUserWithEmailAndPassword(email, password).then(() => { Swal.fire('Mubarak ho!', 'Aapka naya account ban gaya hai!', 'success');
    }).catch((error) => {
        if(loginStatus) loginStatus.style.display = 'none'; Swal.fire('Error', 'Account nahi ban paaya. ' + error.message, 'error');
    });
}

function logout() {
    Swal.fire({ title: 'Logout?', text: "Kya aap sach mein logout karna chahte hain?", icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Yes, Logout' }).then((result) => {
        if (result.isConfirmed) { auth.signOut(); document.getElementById('email-input').value = ""; document.getElementById('password-input').value = ""; }
    });
}

// ==========================================
// ☁️ 3. CLOUD DATA SYNC & GLOBALS
// ==========================================
let familyExpenses = []; let dudhRecords = []; let rationItems = []; let investments = [];
let activeLoans = []; // NAYA: EMI Portfolio ke liye
let budgetLimit = 20000; 
let customDisplayName = ""; 
let monthlyIncome = 0; 
let userXP = 0; 
let challengeDays = 0; 

function showSyncSuccess() {
    const syncEl = document.getElementById('sync-status');
    if(syncEl) {
        syncEl.innerText = "☁️ Synced Just Now";
        syncEl.style.color = "#10b981";
        setTimeout(() => { syncEl.style.color = "#94a3b8"; syncEl.innerText = "☁️ Cloud Active"; }, 3000);
    }
}

function loadCloudData(uid) {
    try {
        const docRef = db.collection('familyData').doc(uid);
        docRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data(); 
                familyExpenses = data.expenses || []; 
                dudhRecords = data.dudh || []; 
                rationItems = data.ration || []; 
                investments = data.investments || [];
                activeLoans = data.loans || []; // Load Loans
                budgetLimit = data.budget || 20000;
                customDisplayName = data.displayName || ""; 
                monthlyIncome = data.income || 0; 
                userXP = data.xp || 0; 
                challengeDays = data.challengeDays || 0; 
                
                updateHisabUI(); updateDudhUI(); updateRationUI(); updateInvestUI(); updateLoanUI();
                updateGreetingName(); updateChallengeUI();
            } else { updateHisabUI(); }
        }, (error) => { console.error("Cloud fetch failed:", error); });
    } catch (error) { console.error("Cloud fetch exception:", error); }
}

async function saveToCloud() {
    if(!currentUser) return;
    try { 
        await db.collection('familyData').doc(currentUser.uid).set({ 
            expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, investments: investments,
            loans: activeLoans, // Save Loans
            budget: budgetLimit, displayName: customDisplayName,
            income: monthlyIncome, xp: userXP, challengeDays: challengeDays
        }, { merge: true }); 
        showSyncSuccess();
    } catch (error) { console.error("Cloud save failed:", error); }
}

async function syncOldLocalData() {
    try {
        const localExp = JSON.parse(localStorage.getItem('familyExpenses')); const localDudh = JSON.parse(localStorage.getItem('dudhRecords')); const localRation = JSON.parse(localStorage.getItem('rationItems'));
        let dataChanged = false;
        if (localExp && localExp.length > 0 && familyExpenses.length === 0) { familyExpenses = localExp; dataChanged = true; }
        if (localDudh && localDudh.length > 0 && dudhRecords.length === 0) { dudhRecords = localDudh; dataChanged = true; }
        if (localRation && localRation.length > 0 && rationItems.length === 0) { rationItems = localRation; dataChanged = true; }
        if (dataChanged) { await saveToCloud(); localStorage.removeItem('familyExpenses'); localStorage.removeItem('dudhRecords'); localStorage.removeItem('rationItems'); }
    } catch(e) { console.log("Error syncing local data:", e); }
}

// ==========================================
// 🔔 3.2. SMART REMINDERS (Updated for Loans)
// ==========================================
function checkSmartReminders() {
    let todayDate = new Date().getDate();
    let reminderShown = sessionStorage.getItem('reminderShownToday');
    if(!reminderShown) {
        // Loan Reminders Check
        let loanAlerts = [];
        activeLoans.forEach(loan => {
            if(loan.monthsPaid < loan.time) {
                // Agar due date aaj se 2 din aage ya peeche hai
                if(Math.abs(loan.dueDate - todayDate) <= 2) {
                    loanAlerts.push(loan.name);
                }
            }
        });

        if(loanAlerts.length > 0) {
            Swal.fire({ title: '🔔 EMI Alert!', text: `Mahaul tight hai! Tumhari "${loanAlerts.join(', ')}" ki EMI aane wali hai. Bank balance theek rakhna!`, icon: 'warning', confirmButtonText: 'Theek Hai', confirmButtonColor: '#3b82f6' });
        } else if(todayDate >= 1 && todayDate <= 5) {
            Swal.fire({ title: '🔔 Mahine ki shuruat!', text: 'Kiraya ya bills baaki hain toh clear kar lo!', icon: 'info', confirmButtonText: 'Theek Hai', confirmButtonColor: '#3b82f6' });
        }

        let lowStockCount = rationItems.filter(i => i.lowStock).length;
        if(lowStockCount >= 3) {
            setTimeout(() => { Swal.fire({ title: '🛒 Ration Khatam!', text: `Tumhare ${lowStockCount} ration items low stock par hain. Market jaane ka time aa gaya hai!`, icon: 'warning', confirmButtonColor: '#a855f7' }); }, 3000);
        }
        sessionStorage.setItem('reminderShownToday', 'true');
    }
}

// ==========================================
// 🏆 3.8. XP & SAVINGS CHALLENGE
// ==========================================
function updateProfileName() {
    const currentName = customDisplayName || (currentUser ? currentUser.email.split("@")[0] : "User");
    Swal.fire({ title: 'Apna Naam Likhein', input: 'text', inputValue: currentName, showCancelButton: true, confirmButtonText: 'Save Karein', confirmButtonColor: '#2563eb', inputValidator: (value) => { if (!value.trim()) return 'Naam khali nahi chhod sakte!'; }
    }).then((result) => { if (result.isConfirmed) { customDisplayName = result.value.trim(); saveToCloud(); updateGreetingName(); Swal.fire('Saved!', 'Aapka naam update ho gaya hai.', 'success'); } });
}

function updateGreetingName() {
    if (!currentUser) return;
    const finalName = customDisplayName || currentUser.email.split("@")[0];
    const NameFormatted = finalName.charAt(0).toUpperCase() + finalName.slice(1);
    const firstLetter = finalName.charAt(0).toUpperCase();
    const profileNameEl = document.getElementById('profile-name'); const avatarEl = document.getElementById('user-avatar'); const largeAvatarEl = document.getElementById('profile-avatar-large');
    if(profileNameEl) profileNameEl.innerText = NameFormatted; if(avatarEl) avatarEl.innerText = firstLetter; if(largeAvatarEl) largeAvatarEl.innerText = firstLetter;
}

function gainXP(amount) {
    userXP += amount; saveToCloud();
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true });
    Toast.fire({ icon: 'success', title: `+${amount} XP Earned!` });
}

function progressChallenge() {
    if(challengeDays >= 30) { Swal.fire('Wah Bhai Wah! 🎉', 'Tumne 30 din ka challenge poora kar liya! You are a Finance Ninja!', 'success'); return; }
    challengeDays += 1; gainXP(50); saveToCloud(); updateChallengeUI(); playSound('success');
    if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 50, origin: { y: 0.6 } });
}

function updateChallengeUI() {
    let bar = document.getElementById('challenge-bar'); let text = document.getElementById('challenge-days');
    if(bar && text) { let percent = (challengeDays / 30) * 100; bar.style.width = `${percent}%`; text.innerText = challengeDays; }
}

// ==========================================
// 🎨 4. APP LOGIC & UI (Theme, Nav)
// ==========================================
let isDarkMode = localStorage.getItem('darkMode') === 'true';
if(isDarkMode) document.body.classList.add('dark-mode');

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    if(categoryChartInstance) renderHistoryWithSkeleton(); 
    playSound('click');
}

function autoDarkMode() {
    const hour = new Date().getHours();
    if(hour >= 18 || hour < 6) {
        if(localStorage.getItem('appTheme') === 'default' || !localStorage.getItem('appTheme')) { applyTheme('night'); }
    }
}

function openSection(sectionName, title) {
    document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section'));
    document.getElementById('section-' + sectionName).classList.add('active-section');
    document.getElementById('app-title').innerText = title;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
        if(btn.getAttribute('onclick').includes(`'${sectionName}'`)) btn.classList.add('active-nav');
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
    playSound('click');
}

const todayDateString = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];

function updatePrediction(totalMonthExpense) {
    let currentDay = new Date().getDate(); let daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    let predicted = (totalMonthExpense / currentDay) * daysInMonth;
    if(isNaN(predicted) || !isFinite(predicted)) predicted = 0;
    
    const predEl = document.getElementById('predicted-expense');
    if(predEl) {
        predEl.innerText = `₹${Math.round(predicted)} lagne ki umeed hai`;
        if (predicted > budgetLimit) predEl.style.color = '#ef4444'; else predEl.style.color = '#3730a3';
    }
}

function renderCalendar(expenses, filterMonth) {
    const calEl = document.getElementById('expense-calendar'); if(!calEl) return;
    calEl.innerHTML = '';
    const year = parseInt(filterMonth.split('-')[0]); const month = parseInt(filterMonth.split('-')[1]) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    days.forEach(d => { const el = document.createElement('div'); el.innerText = d; el.style.fontWeight = 'bold'; el.style.color = 'var(--text-muted)'; el.style.fontSize = '12px'; calEl.appendChild(el); });
    let firstDay = new Date(year, month, 1).getDay();
    for(let i=0; i<firstDay; i++) calEl.appendChild(document.createElement('div'));
    let dailyTotals = {};
    expenses.forEach(exp => { let day = parseInt(exp.date.split('-')[2]); dailyTotals[day] = (dailyTotals[day] || 0) + exp.amount; });
    for(let i=1; i<=daysInMonth; i++) {
        const el = document.createElement('div'); el.innerText = i; el.style.padding = '6px 0'; el.style.borderRadius = '8px'; el.style.fontSize = '12px'; el.style.fontWeight = 'bold';
        if(dailyTotals[i]) {
            if(dailyTotals[i] > 1000) { el.style.background = '#ef4444'; el.style.color = 'white'; } 
            else if(dailyTotals[i] > 300) { el.style.background = '#f59e0b'; el.style.color = 'white'; } 
            else { el.style.background = '#10b981'; el.style.color = 'white'; } 
        } else { el.style.background = 'var(--line-color)'; el.style.color = 'var(--text-main)'; }
        calEl.appendChild(el);
    }
}

// ==========================================
// 💰 5. HISAAB SECTION
// ==========================================
let editExpenseIndex = -1; let currentReceiptUrl = ""; let categoryChartInstance = null; let memberChartInstance = null; let trendChartInstance = null;
const dateInput = document.getElementById('date'); if(dateInput) dateInput.value = todayDateString;
const monthFilter = document.getElementById('month-filter'); if(monthFilter) monthFilter.value = todayDateString.slice(0, 7); 

const receiptInput = document.getElementById('receipt-img');
if(receiptInput) {
    receiptInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) { const reader = new FileReader(); reader.onload = function(event) { currentReceiptUrl = event.target.result; const preview = document.getElementById('receipt-preview'); if(preview) { preview.src = currentReceiptUrl; preview.style.display = 'block'; } }; reader.readAsDataURL(file); }
    });
}

function setBudget() { Swal.fire({ title: 'Monthly Budget', input: 'number', inputValue: budgetLimit, showCancelButton: true }).then((result) => { if (result.isConfirmed && result.value > 0) { budgetLimit = result.value; saveToCloud(); renderHistoryWithSkeleton(); } }); }
function setIncome() { Swal.fire({ title: 'Is Mahine Ki Kamai (Income)', input: 'number', inputValue: monthlyIncome, showCancelButton: true }).then((result) => { if (result.isConfirmed && result.value >= 0) { monthlyIncome = parseFloat(result.value); saveToCloud(); updateHisabUI(); } }); }

function renderHistoryWithSkeleton() { const list = document.getElementById('history-list'); if(!list) return; list.innerHTML = `<div class="skeleton-box"></div>`; setTimeout(updateHisabUI, 400); }

function updateHisabUI() {
    const list = document.getElementById('history-list'); if(!list) return; list.innerHTML = ''; 
    const filterMonth = document.getElementById('month-filter').value || todayDateString.slice(0, 7);
    const budgetDisplay = document.getElementById('budget-display'); if(budgetDisplay) budgetDisplay.innerText = budgetLimit;
    const incomeDisplay = document.getElementById('total-income-display'); if(incomeDisplay) incomeDisplay.innerText = `₹${monthlyIncome}`;

    const searchInput = document.getElementById('search-expense'); const searchQuery = searchInput ? searchInput.value.toLowerCase() : "";
    const familyFilterInput = document.getElementById('family-filter'); const familyQuery = familyFilterInput ? familyFilterInput.value : "All";

    const filteredExpenses = familyExpenses.filter(item => {
        const matchMonth = item.date && item.date.startsWith(filterMonth);
        const matchSearch = item.description.toLowerCase().includes(searchQuery) || item.category.toLowerCase().includes(searchQuery) || (item.member && item.member.toLowerCase().includes(searchQuery));
        const matchFamily = familyQuery === "All" ? true : (item.member === familyQuery); 
        return matchMonth && matchSearch && matchFamily;
    });

    let totalExpense = 0; let categoryTotals = { "Ration": 0, "Medical": 0, "Petrol": 0, "Shopping": 0, "Bills": 0, "Other": 0 }; let memberTotals = {};
    const uniqueDates = [...new Set(filteredExpenses.map(item => item.date))].sort((a, b) => new Date(b) - new Date(a));

    uniqueDates.forEach(dateStr => {
        const parts = dateStr.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`;
        const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.style.fontWeight = 'bold'; dateHeader.style.color = 'var(--ink-blue)'; dateHeader.style.margin = '10px 0 5px 0'; dateHeader.innerText = `📅 ${showDate}`; list.appendChild(dateHeader);

        filteredExpenses.forEach((item) => {
            if (item.date === dateStr) {
                totalExpense += item.amount;
                let cat = item.category || "Other"; if(categoryTotals[cat] !== undefined) categoryTotals[cat] += item.amount;
                let mem = item.member || "Unknown"; if(!memberTotals[mem]) memberTotals[mem] = 0; memberTotals[mem] += item.amount;

                const originalIndex = familyExpenses.indexOf(item); const li = document.createElement('li');
                let receiptHTML = item.receipt ? `<img src="${item.receipt}" class="receipt-thumb" style="width:30px; height:30px; border-radius:5px; object-fit:cover; margin-right:5px; cursor:pointer;" onclick="Swal.fire({imageUrl: '${item.receipt}', imageWidth: '100%'})">` : '';

                li.innerHTML = `<div class="list-left"><strong style="font-size: 18px;">${item.description}</strong><div style="display: flex; align-items: center; margin-top: 5px; flex-wrap: wrap; gap: 5px;"><span class="member-badge">👤 ${item.member}</span> <span class="category-badge">${cat}</span></div></div><div class="list-right">${receiptHTML}<span style="font-weight: 800; color: #e74c3c; font-size: 20px; margin: 0 5px;">₹${item.amount}</span><button class="action-btn edit" onclick="editExpense(${originalIndex})">✏️</button><button class="action-btn delete" onclick="deleteExpense(${originalIndex})">🗑️</button></div>`;
                list.appendChild(li);
            }
        });
    });

    const totalEl = document.getElementById('total-expense'); if(totalEl) totalEl.innerText = `₹${totalExpense}`;
    let budgetPercent = (totalExpense / budgetLimit) * 100; if(budgetPercent > 100) budgetPercent = 100;
    const bar = document.getElementById('budget-bar'); 
    if(bar) {
        bar.style.width = `${budgetPercent}%`; if(budgetPercent < 50) bar.style.background = '#2ecc71'; else if(budgetPercent < 80) bar.style.background = '#f39c12'; else bar.style.background = '#e74c3c';
        const warning = document.getElementById('budget-warning'); if(warning) warning.style.display = (budgetPercent >= 80) ? 'block' : 'none';
    }
    
    updatePrediction(totalExpense); renderCalendar(filteredExpenses, filterMonth); renderCategoryChart(categoryTotals); renderMemberChart(memberTotals); renderTrendChart(filteredExpenses);
}

function renderTrendChart(expenses) {
    const ctx = document.getElementById('trendChart'); if(!ctx) return; if(trendChartInstance) trendChartInstance.destroy();
    let dailyTotals = {}; expenses.forEach(exp => { let day = exp.date.split('-')[2]; dailyTotals[day] = (dailyTotals[day] || 0) + exp.amount; });
    const labels = Object.keys(dailyTotals).sort((a,b) => parseInt(a) - parseInt(b)); const data = labels.map(day => dailyTotals[day]); const textColor = isDarkMode ? '#fff' : '#333';
    trendChartInstance = new Chart(ctx.getContext('2d'), { type: 'bar', data: { labels: labels.map(l => l + ' Date'), datasets: [{ label: 'Daily Spend (₹)', data: data, backgroundColor: '#8b5cf6', borderRadius: 6 }] }, options: { responsive: true, plugins: { legend: { labels: { color: textColor } } }, scales: { x: { ticks: { color: textColor } }, y: { ticks: { color: textColor } } } } });
}
function renderCategoryChart(dataObj) {
    const ctx = document.getElementById('categoryChart'); if(!ctx) return; if(categoryChartInstance) categoryChartInstance.destroy(); 
    const labels = Object.keys(dataObj); const data = Object.values(dataObj); const hasData = data.some(val => val > 0); const textColor = isDarkMode ? '#fff' : '#333';
    categoryChartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels: labels, datasets: [{ data: hasData ? data : [1], backgroundColor: hasData ? ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor, font: {size: 11} } } }, cutout: '70%' } });
}
function renderMemberChart(dataObj) {
    const ctx = document.getElementById('memberChart'); if(!ctx) return; if(memberChartInstance) memberChartInstance.destroy(); 
    const labels = Object.keys(dataObj); const data = Object.values(dataObj); const hasData = data.some(val => val > 0); const textColor = isDarkMode ? '#fff' : '#333';
    memberChartInstance = new Chart(ctx.getContext('2d'), { type: 'pie', data: { labels: labels, datasets: [{ data: hasData ? data : [1], backgroundColor: hasData ? ['#2980b9', '#e84393', '#27ae60', '#8e44ad', '#16a085'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#1e293b' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor, font: {size: 12, weight: 'bold'} } } } } });
}

function addExpense() {
    const member = document.getElementById('member-name').value; const category = document.getElementById('expense-category').value; const desc = document.getElementById('description').value; const amt = parseFloat(document.getElementById('amount').value); const date = document.getElementById('date').value;
    if (!desc || isNaN(amt) || amt <= 0 || !date) return Swal.fire('Oops...', 'Sahi details bhariye!', 'warning');
    const newRecord = { member, category, description: desc, amount: amt, date, receipt: currentReceiptUrl };
    if(editExpenseIndex === -1) { familyExpenses.push(newRecord); gainXP(10); playSound('success'); if(typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); } 
    else { familyExpenses[editExpenseIndex] = newRecord; editExpenseIndex = -1; document.getElementById('btn-add-expense').innerText = "Kharcha Add Karein"; Swal.fire('Updated!', 'Update ho gaya.', 'success'); }
    saveToCloud(); document.getElementById('description').value = ''; document.getElementById('amount').value = ''; currentReceiptUrl = ""; 
    const preview = document.getElementById('receipt-preview'); if(preview) preview.style.display = 'none'; if(receiptInput) receiptInput.value = ""; renderHistoryWithSkeleton();
}

function editExpense(index) { const item = familyExpenses[index]; document.getElementById('member-name').value = item.member || 'Aditya'; document.getElementById('expense-category').value = item.category || 'Other'; document.getElementById('description').value = item.description; document.getElementById('amount').value = item.amount; document.getElementById('date').value = item.date; editExpenseIndex = index; document.getElementById('btn-add-expense').innerText = "Update Kharcha ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function deleteExpense(index) { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Haan!' }).then((result) => { if (result.isConfirmed) { familyExpenses.splice(index, 1); saveToCloud(); renderHistoryWithSkeleton(); } }); }

// ==========================================
// 🏦 6. THE DEBT MANAGER (ACTIVE EMI SYSTEM - PHASE 5)
// ==========================================
let tempLoanData = null;

function calculateEMI() {
    const name = document.getElementById('emi-name').value || 'My Loan';
    const p = parseFloat(document.getElementById('emi-principal').value); 
    const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100; 
    const n = parseFloat(document.getElementById('emi-time').value);
    const dueDate = parseInt(document.getElementById('emi-due-date').value) || 5;

    if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || n <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); 
    const totalAmount = emi * n;
    const totalInterest = totalAmount - p;

    tempLoanData = { name: name, principal: p, rate: document.getElementById('emi-rate').value, time: n, emi: Math.round(emi), totalInterest: Math.round(totalInterest), dueDate: dueDate, monthsPaid: 0 };

    document.getElementById('emi-result').style.display = 'block'; 
    document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`; 
    
    // Break Down UI
    document.getElementById('emi-break-principal').innerText = Math.round(p);
    document.getElementById('emi-break-interest').innerText = Math.round(totalInterest);
    let pPercent = (p / totalAmount) * 100;
    document.getElementById('emi-break-bar').style.width = `${pPercent}%`;

    playSound('click');
}

function saveLoan() {
    if(!tempLoanData) return;
    activeLoans.push(tempLoanData);
    saveToCloud(); updateLoanUI(); tempLoanData = null;
    Swal.fire('Saved! 🏦', 'Yeh loan list me add ho gaya hai.', 'success');
    document.getElementById('emi-result').style.display = 'none';
    
    // Clear inputs
    document.getElementById('emi-name').value = ''; document.getElementById('emi-principal').value = '';
    document.getElementById('emi-rate').value = ''; document.getElementById('emi-time').value = '';
}

function updateLoanUI() {
    const list = document.getElementById('loan-list'); if(!list) return; list.innerHTML = '';
    
    activeLoans.forEach((loan, index) => {
        let percentPaid = (loan.monthsPaid / loan.time) * 100;
        let isComplete = loan.monthsPaid >= loan.time;
        
        const li = document.createElement('li'); 
        li.style.flexDirection = 'column'; li.style.alignItems = 'stretch'; li.style.borderLeft = isComplete ? "4px solid #10b981" : "4px solid #f472b6";
        
        li.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="display: flex; flex-direction: column;">
                    <strong style="font-size: 16px;">${loan.name}</strong>
                    <span style="font-size: 11px; color: #64748b;">Due: Every ${loan.dueDate}th | EMI: ₹${loan.emi}</span>
                </div>
                <button class="action-btn delete" onclick="deleteLoan(${index})">🗑️</button>
            </div>
            
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">
                <span>Paid: ${loan.monthsPaid}/${loan.time} Mnth</span>
                <span style="color: ${isComplete ? '#10b981' : '#f59e0b'}">${isComplete ? 'Loan Clear! 🎉' : Math.round(percentPaid)+'% Done'}</span>
            </div>
            <div style="width:100%; background: var(--line-color); border-radius:10px; height:6px; overflow:hidden; margin-bottom: 10px;">
                <div style="height:100%; width:${percentPaid}%; background: ${isComplete ? '#10b981' : '#f472b6'}; transition: width 0.5s;"></div>
            </div>
            
            ${!isComplete ? `<button onclick="payEMI(${index})" style="background: #ec4899; color: white; border: none; padding: 8px; border-radius: 8px; font-weight: bold; width: 100%; cursor: pointer;">1-Click Pay ₹${loan.emi} ✅</button>` : ''}
        `;
        list.appendChild(li);
    });
}

function payEMI(index) {
    let loan = activeLoans[index];
    if(loan.monthsPaid >= loan.time) return;

    Swal.fire({ title: 'Pay EMI?', text: `Kya tum ${loan.name} ka ₹${loan.emi} Hisaab me add karna chahte ho?`, icon: 'question', showCancelButton: true, confirmButtonText: 'Haan, Pay Karo' }).then(async (result) => {
        if (result.isConfirmed) {
            // Hisaab me add
            const autoExpense = { member: "Aditya", category: "Bills", description: `🏦 EMI Paid: ${loan.name}`, amount: loan.emi, date: todayDateString, receipt: "" };
            familyExpenses.push(autoExpense);
            
            // Loan progress
            loan.monthsPaid += 1;
            gainXP(20); 
            playSound('success');
            
            if(loan.monthsPaid >= loan.time) {
                if(typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
                Swal.fire('Mubarak Ho! 🎉', `Tumhara "${loan.name}" poori tarah se chukta ho gaya hai!`, 'success');
            } else {
                Swal.fire('EMI Paid ✅', 'Hisaab mein add ho gaya hai.', 'success');
            }
            await saveToCloud(); updateLoanUI(); updateHisabUI();
        }
    });
}

function deleteLoan(index) { Swal.fire({ title: 'Delete Loan?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { activeLoans.splice(index, 1); saveToCloud(); updateLoanUI(); } }); }

// ==========================================
// 💸 7. VYAJ CALCULATOR
// ==========================================
function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value); const rate = parseFloat(document.getElementById('vyaj-rate').value); const time = parseFloat(document.getElementById('vyaj-time').value);
    if (isNaN(p) || isNaN(rate) || isNaN(time) || p <= 0 || time <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    const interest = (p * rate * time) / 100;
    document.getElementById('vyaj-result').style.display = 'block'; document.getElementById('vyaj-only').innerText = `₹${Math.round(interest)}`; 
    playSound('click');
}

// ==========================================
// 💾 8. BACKUP & RESTORE SYSTEM
// ==========================================
function backupData() { const dataToBackup = { expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, investments: investments, loans: activeLoans, budget: budgetLimit }; const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToBackup)); const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", "GharManager_Cloud_Backup.json"); dlAnchorElem.click(); }
function restoreData(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.expenses || data.dudh) {
                familyExpenses = data.expenses || []; dudhRecords = data.dudh || []; rationItems = data.ration || []; investments = data.investments || []; activeLoans = data.loans || []; budgetLimit = data.budget || 20000;
                await saveToCloud(); Swal.fire('Restored!', 'Aapka purana data wapas aa gaya hai! ✅', 'success');
                renderHistoryWithSkeleton(); updateDudhUI(); updateRationUI(); updateInvestUI(); updateLoanUI();
            } else { Swal.fire('Error', 'Yeh file sahi format mein nahi hai!', 'error'); }
        } catch(err) { Swal.fire('Error', 'File read nahi ho paayi.', 'error'); }
    }; reader.readAsText(file);
}

// ==========================================
// 📤 9. SHARE PDF REPORT SYSTEM 
// ==========================================
async function shareReport() {
    if(!window.jspdf) return Swal.fire('Wait', 'PDF library load ho rahi hai.', 'info');
    const filterMonth = document.getElementById('month-filter').value;
    const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Koi record nahi hai.', 'info');
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFillColor(30, 60, 114); doc.rect(0, 0, 210, 22, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text(`GharManager (${filterMonth})`, 14, 15);
    const tableColumn = ["Date", "Name", "Category", "Details", "Amount"]; const tableRows = []; let totalAmount = 0;
    [...dataToExport].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => { const p = exp.date.split('-'); tableRows.push([`${p[2]}/${p[1]}`, exp.member || '-', exp.category || 'Other', exp.description, `Rs ${exp.amount}`]); totalAmount += exp.amount; });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [46, 204, 113] }, foot: [["", "", "", "Total :", `Rs ${totalAmount}`]], footStyles: { fillColor: [231, 76, 60] } });
    const pdfBlob = doc.output('blob'); const fileName = `GharManager_${filterMonth}.pdf`; const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) { try { await navigator.share({ title: `Hisaab - ${filterMonth}`, text: `Total kharcha: ₹${totalAmount}.`, files: [pdfFile] }); } catch (error) { console.log('Share cancel hua:', error); } } else { doc.save(fileName); }
}
function exportToPDF() { shareReport(); }

// ==========================================
// 🎙️ 10. VOICE TYPING (JADU!)
// ==========================================
function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)(); recognition.lang = 'hi-IN'; const btn = document.getElementById('mic-btn'); btn.innerText = "🛑";
    recognition.onresult = (event) => { document.getElementById('description').value = event.results[0][0].transcript; btn.innerText = "🎤"; playSound('click'); };
    recognition.onerror = () => { btn.innerText = "🎤"; Swal.fire('Error', 'Awaz clear nahi aayi!', 'error'); }; recognition.start();
}

// ==========================================
// 👤 11. USER PROFILE SYSTEM 
// ==========================================
function openProfile() {
    const modal = document.getElementById('profile-modal'); if(!modal) return;
    if (currentUser) { document.getElementById('profile-email').innerText = currentUser.email; updateGreetingName(); }
    const lvlBadge = document.getElementById('profile-level-badge');
    if(lvlBadge) { let level = Math.floor(userXP / 100) + 1; let title = level < 3 ? "Beginner 🥉" : level < 6 ? "Pro Saver 🥈" : "Finance Ninja 🥇"; lvlBadge.innerText = `Level ${level} | ${title} (XP: ${userXP})`; }
    let totalExpAllTime = familyExpenses.reduce((sum, item) => sum + item.amount, 0); document.getElementById('profile-total-expense').innerText = `₹${totalExpAllTime}`;
    let totalDudhAllTime = dudhRecords.reduce((sum, item) => sum + ((item.morning + item.evening) * item.rate), 0); document.getElementById('profile-total-dudh').innerText = `₹${Math.round(totalDudhAllTime)}`;
    modal.style.display = 'flex'; playSound('click');
}
function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; playSound('click'); }

// ==========================================
// 🤖 12. LOCAL AI FINANCIAL ASSISTANT
// ==========================================
function askFinanceAI() {
    if(familyExpenses.length === 0) return Swal.fire('🤖 AI', 'Bhai, pehle kuch kharcha toh add karo, tabhi toh hisaab bataunga!', 'info');
    let catTotals = {}; let maxCat = ""; let maxAmt = 0;
    familyExpenses.forEach(exp => { catTotals[exp.category] = (catTotals[exp.category] || 0) + exp.amount; if(catTotals[exp.category] > maxAmt) { maxAmt = catTotals[exp.category]; maxCat = exp.category; } });
    let filterMonth = document.getElementById('month-filter') ? document.getElementById('month-filter').value : todayDateString.slice(0,7);
    let monthExpenses = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    let totalExpMonth = monthExpenses.reduce((sum, item) => sum + item.amount, 0);
    let savings = monthlyIncome - totalExpMonth;
    let savingsMsg = savings > 0 ? `<span style="color:#16a34a; font-weight:bold;">Badiya! Tumne is mahine ₹${savings} bacha liye hain. 🤑</span>` : `<span style="color:#e74c3c; font-weight:bold;">Alert! Tumhari kamai se zyada kharcha (₹${Math.abs(savings)} extra) ho raha hai! 📉</span>`;
    Swal.fire({ title: '🤖 AI Finance Tips', html: `<div style="text-align: left; font-size: 14px; line-height: 1.6;"><p>📊 <b>Top Kharcha:</b> Sabse zyada paisa <b>${maxCat} (₹${maxAmt})</b> mein gaya hai. Thoda control karo!</p><hr style="margin: 10px 0; border: 0.5px dashed #cbd5e1;"><p>💰 <b>Savings:</b> ${savingsMsg}</p><hr style="margin: 10px 0; border: 0.5px dashed #cbd5e1;"><p>💡 <b>AI Tip:</b> "Rule of 50-30-20 yaad rakho. 50% zaroorat, 30% shauk, aur 20% future ke liye save karo."</p></div>`, icon: 'info', confirmButtonText: 'Thanks AI! 👍', confirmButtonColor: '#6366f1' });
}

// ==========================================
// 🎨 13. THEME STORE SYSTEM
// ==========================================
function openThemeStore() { closeProfile(); document.getElementById('theme-modal').style.display = 'flex'; playSound('click'); }
function closeThemeStore() { document.getElementById('theme-modal').style.display = 'none'; playSound('click'); }
function applyTheme(themeName) { document.body.setAttribute('data-theme', themeName); localStorage.setItem('appTheme', themeName); closeThemeStore(); Swal.fire({ title: 'Theme Applied! 🎨', text: 'Naya rang set ho gaya hai!', icon: 'success', timer: 1500, showConfirmButton: false }); if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); playSound('success'); }
window.addEventListener('DOMContentLoaded', () => { let savedAppTheme = localStorage.getItem('appTheme'); if(savedAppTheme) document.body.setAttribute('data-theme', savedAppTheme); updateSoundUI(); autoDarkMode(); });

// ==========================================
// 📲 14. PWA INSTALL LOGIC
// ==========================================
let deferredPrompt; window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });
function installApp() { if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.then((choiceResult) => { if (choiceResult.outcome === 'accepted') { Swal.fire('Mubarak Ho! 🎉', 'GharManager phone mein install ho gaya hai!', 'success'); } deferredPrompt = null; }); } else { Swal.fire({ title: 'Install Kaise Karein?', text: 'Bhai, upar Right corner mein 3-dots (⋮) par click karo aur wahan se "Add to Home screen" daba do!', icon: 'info', confirmButtonText: 'Theek hai 👍' }); } }
if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').then(reg => console.log('✅ SW Active!')).catch(err => console.error('❌ SW Error', err)); }); }
