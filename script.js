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
// ☁️ 3. CLOUD DATA SYNC (LIVE LISTENER)
// ==========================================
let familyExpenses = []; let dudhRecords = []; let rationItems = []; let budgetLimit = 20000;

function loadCloudData(uid) {
    try {
        const docRef = db.collection('familyData').doc(uid);
        docRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data(); familyExpenses = data.expenses || []; dudhRecords = data.dudh || []; rationItems = data.ration || []; budgetLimit = data.budget || 20000;
                updateHisabUI(); updateDudhUI(); updateRationUI();
            } else { updateHisabUI(); }
        }, (error) => { console.error("Cloud fetch failed:", error); });
    } catch (error) { console.error("Cloud fetch exception:", error); }
}

async function saveToCloud() {
    if(!currentUser) return;
    try { await db.collection('familyData').doc(currentUser.uid).set({ expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, budget: budgetLimit }, { merge: true }); } catch (error) { console.error("Cloud save failed:", error); }
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

// ==========================================
// 💰 5. HISAAB SECTION
// ==========================================
let editExpenseIndex = -1; let currentReceiptUrl = ""; let categoryChartInstance = null; let memberChartInstance = null; 
const dateInput = document.getElementById('date'); if(dateInput) dateInput.value = todayDateString;
const monthFilter = document.getElementById('month-filter'); if(monthFilter) monthFilter.value = todayDateString.slice(0, 7); 

const receiptInput = document.getElementById('receipt-img');
if(receiptInput) {
    receiptInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(event) {
                currentReceiptUrl = event.target.result;
                const preview = document.getElementById('receipt-preview');
                if(preview) { preview.src = currentReceiptUrl; preview.style.display = 'block'; }
            }; reader.readAsDataURL(file);
        }
    });
}

function setBudget() { Swal.fire({ title: 'Monthly Budget', input: 'number', inputValue: budgetLimit, showCancelButton: true }).then((result) => { if (result.isConfirmed && result.value > 0) { budgetLimit = result.value; saveToCloud(); renderHistoryWithSkeleton(); } }); }
function renderHistoryWithSkeleton() { const list = document.getElementById('history-list'); if(!list) return; list.innerHTML = `<div class="skeleton-box" style="height:60px; background:#e2e8f0; border-radius:8px; margin-bottom:10px; animation: smoothFadeIn 1s infinite alternate;"></div>`; setTimeout(updateHisabUI, 400); }

function updateHisabUI() {
    const list = document.getElementById('history-list'); if(!list) return; list.innerHTML = ''; 
    const filterMonth = document.getElementById('month-filter').value || todayDateString.slice(0, 7);
    const budgetDisplay = document.getElementById('budget-display'); if(budgetDisplay) budgetDisplay.innerText = budgetLimit;
    const filteredExpenses = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
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
    renderCategoryChart(categoryTotals); renderMemberChart(memberTotals);
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

    if(editExpenseIndex === -1) {
        familyExpenses.push(newRecord); playSound('success');
        if(typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); 
    } else {
        familyExpenses[editExpenseIndex] = newRecord; editExpenseIndex = -1; document.getElementById('btn-add-expense').innerText = "Kharcha Add Karein"; Swal.fire('Updated!', 'Update ho gaya.', 'success');
    }
    saveToCloud(); document.getElementById('description').value = ''; document.getElementById('amount').value = ''; currentReceiptUrl = ""; 
    const preview = document.getElementById('receipt-preview'); if(preview) preview.style.display = 'none'; if(receiptInput) receiptInput.value = ""; renderHistoryWithSkeleton();
}

function editExpense(index) {
    const item = familyExpenses[index]; document.getElementById('member-name').value = item.member || 'Aditya'; document.getElementById('expense-category').value = item.category || 'Other'; document.getElementById('description').value = item.description; document.getElementById('amount').value = item.amount; document.getElementById('date').value = item.date; editExpenseIndex = index; document.getElementById('btn-add-expense').innerText = "Update Kharcha ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function deleteExpense(index) { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Haan!' }).then((result) => { if (result.isConfirmed) { familyExpenses.splice(index, 1); saveToCloud(); renderHistoryWithSkeleton(); } }); }

// ==========================================
// 🛒 6. RATION LOGIC
// ==========================================
const rationDateInput = document.getElementById('ration-date'); if(rationDateInput) rationDateInput.value = todayDateString;

function updateRationUI() {
    const list = document.getElementById('ration-list'); if(!list) return; list.innerHTML = '';
    rationItems.sort((a, b) => new Date(b.date) - new Date(a.date)); const uniqueDates = [...new Set(rationItems.map(item => item.date))];
    uniqueDates.forEach(dateStr => {
        const parts = dateStr.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`;
        const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.style.fontWeight = 'bold'; dateHeader.style.color = '#c084fc'; dateHeader.style.margin = '10px 0 5px 0'; dateHeader.innerText = `🛒 ${showDate}`; list.appendChild(dateHeader);
        rationItems.forEach((item, index) => {
            if(item.date === dateStr) {
                const li = document.createElement('li'); li.style.borderLeft = "4px solid #8e44ad";
                li.innerHTML = `<div class="list-left ration-item" onclick="toggleRation(${index})" style="flex-direction: row; align-items:center; cursor:pointer; opacity: ${item.bought ? '0.5' : '1'};"><input type="checkbox" ${item.bought ? 'checked' : ''} style="width: 20px; height: 20px; margin-right:10px;"><div style="display:flex; flex-direction:column;"><strong style="font-size: 16px; text-decoration: ${item.bought ? 'line-through' : 'none'};">${item.name}</strong>${item.amount > 0 ? `<span style="font-size:12px; color:#64748b; font-weight:bold;">₹${item.amount}</span>` : ''}</div></div><div class="list-right"><button class="action-btn delete" onclick="deleteRation(${index})">🗑️</button></div>`;
                list.appendChild(li);
            }
        });
    });
}

function addRation() { 
    const name = document.getElementById('ration-item').value; const rDate = document.getElementById('ration-date').value; const amount = parseFloat(document.getElementById('ration-amount').value) || 0;
    if(!name || !rDate) return Swal.fire('Galti', 'Samaan ka naam likhein!', 'warning'); 
    rationItems.push({ name: name, bought: false, date: rDate, amount: amount }); saveToCloud(); document.getElementById('ration-item').value = ''; document.getElementById('ration-amount').value = ''; updateRationUI(); 
}

async function toggleRation(index) { 
    const item = rationItems[index]; item.bought = !item.bought; 
    playSound('click');
    if (item.bought && item.amount > 0) {
        const autoExpense = { member: "Aditya", category: "Ration", description: `🛒 ${item.name} (Ration)`, amount: item.amount, date: todayDateString, receipt: "" };
        familyExpenses.push(autoExpense);
        playSound('success');
        Swal.fire({ title: 'Hisaab mein juda!', text: `${item.name} ka ₹${item.amount} 'Ghar ka Hisaab' mein add ho gaya hai. ✅`, icon: 'success', timer: 2000, showConfirmButton: false });
    }
    await saveToCloud(); updateRationUI(); updateHisabUI();
}
function deleteRation(index) { rationItems.splice(index, 1); saveToCloud(); updateRationUI(); }

// ==========================================
// 🥛 7. DUDH SECTION
// ==========================================
let editDudhIndex = -1;
const dudhDateInput = document.getElementById('dudh-date'); if(dudhDateInput) dudhDateInput.value = todayDateString;

function updateDudhUI() {
    const list = document.getElementById('dudh-list'); if(!list) return; list.innerHTML = ''; let totalLiter = 0, totalBill = 0;
    dudhRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    dudhRecords.forEach((record, index) => {
        const totalDayLiter = record.morning + record.evening; const dayCost = totalDayLiter * record.rate; totalLiter += totalDayLiter; totalBill += dayCost;
        const parts = record.date.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`;
        const li = document.createElement('li'); 
        li.innerHTML = `<div class="list-left"><div style="display:flex; align-items:center; margin-bottom:6px;"><span class="member-badge" style="background:#bfdbfe; color:#2563eb;">📅 ${showDate}</span><strong style="font-size:15px;">S: ${record.morning}L | Sh: ${record.evening}L</strong></div><div style="font-size:12px; color:#64748b; font-weight:600;">Rate: ₹${record.rate}/L | Total: ${totalDayLiter}L</div></div><div class="list-right"><span style="font-weight:800; color:#2563eb; font-size:19px; margin-right:5px;">₹${dayCost}</span><button class="action-btn edit" onclick="editDudh(${index})">✏️</button><button class="action-btn delete" onclick="deleteDudh(${index})">🗑️</button></div>`;
        list.appendChild(li);
    });
    document.getElementById('dudh-total-liter').innerText = totalLiter.toFixed(2); document.getElementById('dudh-total-bill').innerText = `₹${Math.round(totalBill)}`;
}

function addDudh() {
    const dDate = document.getElementById('dudh-date').value; const rate = parseFloat(document.getElementById('dudh-rate').value); const morn = parseFloat(document.getElementById('dudh-morning').value) || 0; const eve = parseFloat(document.getElementById('dudh-evening').value) || 0;
    if (!dDate || isNaN(rate) || (morn === 0 && eve === 0)) return Swal.fire('Galti', 'Sahi details daaliye!', 'error');
    if(editDudhIndex === -1) { dudhRecords.push({ date: dDate, rate: rate, morning: morn, evening: eve }); playSound('success'); } 
    else { dudhRecords[editDudhIndex] = { date: dDate, rate: rate, morning: morn, evening: eve }; editDudhIndex = -1; document.getElementById('btn-add-dudh').innerText = "Dudh Add Karein"; }
    saveToCloud(); updateDudhUI(); document.getElementById('dudh-morning').value = ''; document.getElementById('dudh-evening').value = '';
}
function editDudh(index) { const item = dudhRecords[index]; document.getElementById('dudh-date').value = item.date; document.getElementById('dudh-rate').value = item.rate; document.getElementById('dudh-morning').value = item.morning; document.getElementById('dudh-evening').value = item.evening; editDudhIndex = index; document.getElementById('btn-add-dudh').innerText = "Update Dudh ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function deleteDudh(index) { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { dudhRecords.splice(index, 1); saveToCloud(); updateDudhUI(); } }); }

// ==========================================
// 🏦 8. EMI AND VYAJ LOGIC
// ==========================================
function calculateEMI() {
    const p = parseFloat(document.getElementById('emi-principal').value); const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100; const n = parseFloat(document.getElementById('emi-time').value);
    if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || n <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); const totalAmount = emi * n;
    document.getElementById('emi-result').style.display = 'block'; document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`; document.getElementById('emi-interest').innerText = `₹${Math.round(totalAmount - p)}`; document.getElementById('emi-total').innerText = `₹${Math.round(totalAmount)}`;
    playSound('click');
}
function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value); const rate = parseFloat(document.getElementById('vyaj-rate').value); const time = parseFloat(document.getElementById('vyaj-time').value);
    if (isNaN(p) || isNaN(rate) || isNaN(time) || p <= 0 || time <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    const interest = (p * rate * time) / 100;
    document.getElementById('vyaj-result').style.display = 'block'; document.getElementById('vyaj-only').innerText = `₹${Math.round(interest)}`; document.getElementById('vyaj-total').innerText = `₹${Math.round(p + interest)}`;
    playSound('click');
}

// ==========================================
// 💾 9. BACKUP & RESTORE SYSTEM
// ==========================================
function backupData() { const dataToBackup = { expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, budget: budgetLimit }; const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToBackup)); const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", "Family_Cloud_Backup.json"); dlAnchorElem.click(); }
function restoreData(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.expenses || data.dudh || data.ration) {
                familyExpenses = data.expenses || []; dudhRecords = data.dudh || []; rationItems = data.ration || []; budgetLimit = data.budget || 20000;
                await saveToCloud(); Swal.fire('Restored!', 'Aapka purana data wapas aa gaya hai! ✅', 'success');
                renderHistoryWithSkeleton(); updateDudhUI(); updateRationUI();
            } else { Swal.fire('Error', 'Yeh file sahi format mein nahi hai!', 'error'); }
        } catch(err) { Swal.fire('Error', 'File read nahi ho paayi.', 'error'); }
    }; reader.readAsText(file);
}

// ==========================================
// 📤 10. SHARE PDF REPORT SYSTEM 
// ==========================================
async function shareReport() {
    if(!window.jspdf) return Swal.fire('Wait', 'PDF library load ho rahi hai.', 'info');
    const filterMonth = document.getElementById('month-filter').value;
    const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Koi record nahi hai.', 'info');
    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFillColor(30, 60, 114); doc.rect(0, 0, 210, 22, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text(`Ghar Ka Hisaab (${filterMonth})`, 14, 15);
    const tableColumn = ["Date", "Name", "Category", "Details", "Amount"]; const tableRows = []; let totalAmount = 0;
    [...dataToExport].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => { const p = exp.date.split('-'); tableRows.push([`${p[2]}/${p[1]}`, exp.member || '-', exp.category || 'Other', exp.description, `Rs ${exp.amount}`]); totalAmount += exp.amount; });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [46, 204, 113] }, foot: [["", "", "", "Total :", `Rs ${totalAmount}`]], footStyles: { fillColor: [231, 76, 60] } });
    const pdfBlob = doc.output('blob'); const fileName = `Hisaab_${filterMonth}.pdf`; const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) { try { await navigator.share({ title: `Hisaab - ${filterMonth}`, text: `Total kharcha: ₹${totalAmount}.`, files: [pdfFile] }); } catch (error) { console.log('Share cancel hua:', error); } } else { doc.save(fileName); }
}
function exportToPDF() { shareReport(); }

// ==========================================
// 🎙️ 11. VOICE TYPING (JADU!)
// ==========================================
function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)(); recognition.lang = 'hi-IN'; const btn = document.getElementById('mic-btn'); btn.innerText = "🛑";
    recognition.onresult = (event) => { document.getElementById('description').value = event.results[0][0].transcript; btn.innerText = "🎤"; playSound('click'); };
    recognition.onerror = () => { btn.innerText = "🎤"; Swal.fire('Error', 'Awaz clear nahi aayi!', 'error'); }; recognition.start();
}

// ==========================================
// 👤 12. USER PROFILE SYSTEM
// ==========================================
function openProfile() {
    const modal = document.getElementById('profile-modal'); if(!modal) return;
    if (currentUser) {
        let userName = currentUser.email.split("@")[0]; const NameFormatted = userName.charAt(0).toUpperCase() + userName.slice(1);
        document.getElementById('profile-name').innerText = NameFormatted; document.getElementById('profile-email').innerText = currentUser.email;
        const firstLetter = userName.charAt(0).toUpperCase(); document.getElementById('profile-avatar-large').innerText = firstLetter;
    }
    let totalExpAllTime = familyExpenses.reduce((sum, item) => sum + item.amount, 0); document.getElementById('profile-total-expense').innerText = `₹${totalExpAllTime}`;
    let totalDudhAllTime = dudhRecords.reduce((sum, item) => sum + ((item.morning + item.evening) * item.rate), 0); document.getElementById('profile-total-dudh').innerText = `₹${Math.round(totalDudhAllTime)}`;
    document.getElementById('profile-total-ration').innerText = rationItems.length;
    modal.style.display = 'flex'; playSound('click');
}

function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; playSound('click'); }

// ==========================================
// 🎨 13. THEME STORE SYSTEM
// ==========================================
function openThemeStore() { closeProfile(); document.getElementById('theme-modal').style.display = 'flex'; playSound('click'); }
function closeThemeStore() { document.getElementById('theme-modal').style.display = 'none'; playSound('click'); }

function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName); localStorage.setItem('appTheme', themeName); closeThemeStore();
    Swal.fire({ title: 'Theme Applied! 🎨', text: 'Naya rang set ho gaya hai!', icon: 'success', timer: 1500, showConfirmButton: false });
    if(typeof confetti !== 'undefined') confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); playSound('success');
}

window.addEventListener('DOMContentLoaded', () => {
    let savedAppTheme = localStorage.getItem('appTheme'); if(savedAppTheme) document.body.setAttribute('data-theme', savedAppTheme);
    updateSoundUI();
});

// ==========================================
// 📲 14. PWA / INSTALL APP SYSTEM (SERVICE WORKER)
// ==========================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered! 😎', reg))
            .catch(err => console.log('Service Worker Error ❌', err));
    });
}

// ==========================================
// 📲 15. CUSTOM PWA INSTALL BUTTON (BRAHMASTRA)
// ==========================================
let deferredPrompt;

// Chrome jab install karne ke liye ready hoga, tab ye button dikhayega
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // Chrome ka apna popup roko
    deferredPrompt = e; // Event ko save karo
    
    // Apna custom button dikhao
    const installBtn = document.getElementById('install-app-btn');
    if(installBtn) installBtn.style.display = 'block'; 
});

// Jab user apne "Install App" button par click karega
function installApp() {
    if (!deferredPrompt) return;
    
    // Install wala popup dikhao
    deferredPrompt.prompt();
    
    // Check karo user ne Install kiya ya Cancel
    deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
            Swal.fire('Mubarak Ho! 🎉', 'GharManager aapke phone mein install ho raha hai!', 'success');
            document.getElementById('install-app-btn').style.display = 'none'; // Button hata do
        } else {
            console.log('User ne cancel kar diya');
        }
        deferredPrompt = null;
    });
}
