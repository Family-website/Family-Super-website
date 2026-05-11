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

// Initialize Firebase (Compat Version)
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// ==========================================
// 🔐 2. GOOGLE LOGIN SYSTEM (Redirect Method)
// ==========================================
const loginScreen = document.getElementById('login-screen');
const mainApp = document.getElementById('main-app');
const loginStatus = document.getElementById('login-status');

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        if(loginStatus) {
            loginStatus.style.display = 'block';
            loginStatus.innerText = "Cloud se data laa rahe hain... ⏳";
        }
        document.getElementById('smart-greeting').innerText = `Hello, ${user.displayName.split(" ")[0]}! ✨`;
        
        // 1. Cloud se data laao
        await loadCloudData(user.uid);
        
        // 2. Agar phone mein purana data hai toh usko cloud par bhej do
        await syncOldLocalData();
        
        // UI Dikhao
        loginScreen.style.opacity = "0";
        setTimeout(() => {
            loginScreen.style.display = 'none';
            mainApp.style.display = 'block';
            renderHistoryWithSkeleton(); 
            updateDudhUI();
            updateRationUI();
        }, 300);
    } else {
        currentUser = null;
        mainApp.style.display = 'none';
        loginScreen.style.display = 'flex';
        loginScreen.style.opacity = "1";
        if(loginStatus) loginStatus.style.display = 'none';
    }
});

function loginWithGoogle() {
    if(loginStatus) {
        loginStatus.style.display = 'block';
        loginStatus.innerText = "Google par jaa rahe hain... ⏳";
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithRedirect(provider); // Mobile ke liye Redirect best hai
}

function logout() {
    Swal.fire({
        title: 'Logout?',
        text: "Kya aap sach mein logout karna chahte hain?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        confirmButtonText: 'Yes, Logout'
    }).then((result) => {
        if (result.isConfirmed) {
            auth.signOut();
        }
    });
}

// ==========================================
// ☁️ 3. CLOUD DATA SYNC & LOCAL MIGRATION
// ==========================================
let familyExpenses = [];
let dudhRecords = [];
let rationItems = [];
let budgetLimit = 20000;

async function loadCloudData(uid) {
    try {
        const docRef = db.collection('familyData').doc(uid);
        const doc = await docRef.get();
        if (doc.exists) {
            const data = doc.data();
            familyExpenses = data.expenses || [];
            dudhRecords = data.dudh || [];
            rationItems = data.ration || [];
            budgetLimit = data.budget || 20000;
        }
    } catch (error) {
        console.error("Cloud fetch failed:", error);
    }
}

async function saveToCloud() {
    if(!currentUser) return;
    try {
        await db.collection('familyData').doc(currentUser.uid).set({
            expenses: familyExpenses,
            dudh: dudhRecords,
            ration: rationItems,
            budget: budgetLimit
        }, { merge: true });
    } catch (error) {
        console.error("Cloud save failed:", error);
    }
}

async function syncOldLocalData() {
    try {
        const localExp = JSON.parse(localStorage.getItem('familyExpenses'));
        const localDudh = JSON.parse(localStorage.getItem('dudhRecords'));
        const localRation = JSON.parse(localStorage.getItem('rationItems'));
        
        let dataChanged = false;

        if (localExp && localExp.length > 0 && familyExpenses.length === 0) {
            familyExpenses = localExp; dataChanged = true;
        }
        if (localDudh && localDudh.length > 0 && dudhRecords.length === 0) {
            dudhRecords = localDudh; dataChanged = true;
        }
        if (localRation && localRation.length > 0 && rationItems.length === 0) {
            rationItems = localRation; dataChanged = true;
        }

        if (dataChanged) {
            await saveToCloud();
            console.log("Old Local Data Synced to Cloud Successfully! ✅");
            // Sync hone ke baad phone ki memory khali kar do taaki double na ho
            localStorage.removeItem('familyExpenses');
            localStorage.removeItem('dudhRecords');
            localStorage.removeItem('rationItems');
        }
    } catch(e) {
        console.log("Error syncing local data:", e);
    }
}

// ==========================================
// 🎨 4. APP LOGIC & UI (Theme, Nav)
// ==========================================
let isDarkMode = localStorage.getItem('darkMode') === 'true';
if(isDarkMode) document.body.classList.add('dark-mode');
const themeBtn = document.getElementById('theme-toggle');
if(themeBtn) themeBtn.innerText = isDarkMode ? '☀️' : '🌙';

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.getElementById('theme-toggle').innerText = isDarkMode ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDarkMode);
    if(categoryChartInstance) renderHistoryWithSkeleton(); 
}

function openSection(sectionName, title) {
    document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section'));
    document.getElementById('section-' + sectionName).classList.add('active-section');
    document.getElementById('app-title').innerText = title;
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
        if(btn.getAttribute('onclick').includes(`'${sectionName}'`)) {
            btn.classList.add('active-nav');
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

const now = new Date();
const todayDateString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

// ==========================================
// 💰 5. HISAAB SECTION
// ==========================================
let editExpenseIndex = -1;
let currentReceiptUrl = ""; 
let categoryChartInstance = null; let memberChartInstance = null; 

const dateInput = document.getElementById('date');
if(dateInput) dateInput.value = todayDateString;
const monthFilter = document.getElementById('month-filter');
if(monthFilter) monthFilter.value = todayDateString.slice(0, 7); 

function setBudget() {
    Swal.fire({ title: 'Monthly Budget', input: 'number', inputValue: budgetLimit, showCancelButton: true }).then((result) => {
        if (result.isConfirmed && result.value > 0) { 
            budgetLimit = result.value; 
            saveToCloud(); 
            renderHistoryWithSkeleton(); 
        }
    });
}

function renderHistoryWithSkeleton() {
    const list = document.getElementById('history-list');
    if(!list) return;
    list.innerHTML = `<div class="skeleton-box"></div><div class="skeleton-box"></div>`;
    setTimeout(updateHisabUI, 400); 
}

function updateHisabUI() {
    const list = document.getElementById('history-list');
    if(!list) return;
    list.innerHTML = ''; 
    
    const filterMonth = document.getElementById('month-filter').value || todayDateString.slice(0, 7);
    const budgetDisplay = document.getElementById('budget-display');
    if(budgetDisplay) budgetDisplay.innerText = budgetLimit;

    const filteredExpenses = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    let totalExpense = 0; let categoryTotals = { "Ration": 0, "Medical": 0, "Petrol": 0, "Shopping": 0, "Bills": 0, "Other": 0 }; let memberTotals = {};

    const uniqueDates = [...new Set(filteredExpenses.map(item => item.date))].sort((a, b) => new Date(b) - new Date(a));

    uniqueDates.forEach(dateStr => {
        const parts = dateStr.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); 
        const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`;

        const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.innerText = `📅 ${showDate}`;
        list.appendChild(dateHeader);

        filteredExpenses.forEach((item) => {
            if (item.date === dateStr) {
                totalExpense += item.amount;
                let cat = item.category || "Other"; if(categoryTotals[cat] !== undefined) categoryTotals[cat] += item.amount;
                let mem = item.member || "Unknown"; if(!memberTotals[mem]) memberTotals[mem] = 0; memberTotals[mem] += item.amount;

                const originalIndex = familyExpenses.indexOf(item);
                const li = document.createElement('li');
                let receiptHTML = item.receipt ? `<img src="${item.receipt}" class="receipt-thumb" onclick="Swal.fire({imageUrl: '${item.receipt}', imageWidth: '100%'})">` : '';

                li.innerHTML = `
                    <div class="list-left">
                        <div style="display: flex; align-items: center; margin-bottom: 5px; flex-wrap: wrap; gap: 5px;">
                            <span class="member-badge">👤 ${item.member}</span> 
                            <span class="category-badge cat-${cat}">${cat}</span>
                        </div>
                        <strong style="font-size: 15px;">${item.description}</strong>
                    </div>
                    <div class="list-right">
                        ${receiptHTML}
                        <span style="font-weight: 800; color: #e74c3c; font-size: 17px; margin: 0 5px;">₹${item.amount}</span> 
                        <button class="action-btn edit" onclick="editExpense(${originalIndex})" title="Edit">✏️</button>
                        <button class="action-btn delete" onclick="deleteExpense(${originalIndex})" title="Delete">🗑️</button>
                    </div>
                `;
                list.appendChild(li);
            }
        });
    });

    const totalEl = document.getElementById('total-expense');
    if(totalEl) totalEl.innerText = `₹${totalExpense}`;

    let budgetPercent = (totalExpense / budgetLimit) * 100;
    if(budgetPercent > 100) budgetPercent = 100;
    const bar = document.getElementById('budget-bar'); 
    if(bar) {
        bar.style.width = `${budgetPercent}%`;
        if(budgetPercent < 50) bar.style.background = '#2ecc71'; else if(budgetPercent < 80) bar.style.background = '#f39c12'; else { bar.style.background = '#e74c3c'; document.getElementById('budget-warning').style.display = 'block'; }
        if(budgetPercent < 80) document.getElementById('budget-warning').style.display = 'none';
    }

    renderCategoryChart(categoryTotals); renderMemberChart(memberTotals);
}

function renderCategoryChart(dataObj) {
    const ctx = document.getElementById('categoryChart'); if(!ctx) return;
    if(categoryChartInstance) categoryChartInstance.destroy(); 
    const labels = Object.keys(dataObj); const data = Object.values(dataObj); const hasData = data.some(val => val > 0); const textColor = isDarkMode ? '#fff' : '#333';
    categoryChartInstance = new Chart(ctx.getContext('2d'), { type: 'doughnut', data: { labels: labels, datasets: [{ data: hasData ? data : [1], backgroundColor: hasData ? ['#f2994a', '#eb3349', '#4b6cb7', '#b06ab3', '#f8b500', '#bdc3c7'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#111' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'right', labels: { color: textColor, font: {size: 11} } } } } });
}

function renderMemberChart(dataObj) {
    const ctx = document.getElementById('memberChart'); if(!ctx) return;
    if(memberChartInstance) memberChartInstance.destroy(); 
    const labels = Object.keys(dataObj); const data = Object.values(dataObj); const hasData = data.some(val => val > 0); const textColor = isDarkMode ? '#fff' : '#333';
    memberChartInstance = new Chart(ctx.getContext('2d'), { type: 'pie', data: { labels: labels, datasets: [{ data: hasData ? data : [1], backgroundColor: hasData ? ['#2980b9', '#e84393', '#27ae60', '#8e44ad', '#16a085'] : ['#ecf0f1'], borderWidth: 2, borderColor: isDarkMode ? '#111' : '#fff' }] }, options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: textColor, font: {size: 12, weight: 'bold'} } } } } });
}

function addExpense() {
    const member = document.getElementById('member-name').value;
    const category = document.getElementById('expense-category').value;
    const desc = document.getElementById('description').value;
    const amt = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;

    if (!desc || isNaN(amt) || amt <= 0 || !date) return Swal.fire('Oops...', 'Sahi details bhariye!', 'warning');
    const newRecord = { member, category, description: desc, amount: amt, date, receipt: currentReceiptUrl };

    if(editExpenseIndex === -1) {
        familyExpenses.push(newRecord);
        if(typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); 
    } else {
        familyExpenses[editExpenseIndex] = newRecord;
        editExpenseIndex = -1;
        document.getElementById('btn-add-expense').innerText = "Kharcha Add Karein";
        Swal.fire('Updated!', 'Update ho gaya.', 'success');
    }

    saveToCloud(); 
    document.getElementById('description').value = ''; document.getElementById('amount').value = ''; 
    currentReceiptUrl = ""; 
    renderHistoryWithSkeleton();
}

function editExpense(index) {
    const item = familyExpenses[index];
    document.getElementById('member-name').value = item.member || 'Aditya';
    document.getElementById('expense-category').value = item.category || 'Other';
    document.getElementById('description').value = item.description;
    document.getElementById('amount').value = item.amount;
    document.getElementById('date').value = item.date;
    editExpenseIndex = index;
    document.getElementById('btn-add-expense').innerText = "Update Kharcha ✏️";
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function deleteExpense(index) {
    Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Haan!' }).then((result) => {
        if (result.isConfirmed) { 
            familyExpenses.splice(index, 1); 
            saveToCloud(); 
            renderHistoryWithSkeleton(); 
        }
    });
}

function exportToPDF() {
    if(!window.jspdf) return Swal.fire('Wait', 'PDF library load ho rahi hai.', 'info');
    const filterMonth = document.getElementById('month-filter').value;
    const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Koi record nahi hai.', 'info');

    const { jsPDF } = window.jspdf; const doc = new jsPDF();
    doc.setFillColor(30, 60, 114); doc.rect(0, 0, 210, 22, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text(`Ghar Ka Hisaab (${filterMonth})`, 14, 15);
    const tableColumn = ["Date", "Name", "Category", "Details", "Amount"]; const tableRows = []; let totalAmount = 0;
    [...dataToExport].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => { const p = exp.date.split('-'); tableRows.push([`${p[2]}/${p[1]}`, exp.member || '-', exp.category || 'Other', exp.description, `Rs ${exp.amount}`]); totalAmount += exp.amount; });
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [46, 204, 113] }, foot: [["", "", "", "Total :", `Rs ${totalAmount}`]], footStyles: { fillColor: [231, 76, 60] } });
    doc.save(`Hisaab_${filterMonth}.pdf`);
}

// ==========================================
// 🥛 6. DUDH & RATION SECTIONS
// ==========================================
let editDudhIndex = -1;
const dudhDateInput = document.getElementById('dudh-date'); if(dudhDateInput) dudhDateInput.value = todayDateString;

function updateDudhUI() {
    const list = document.getElementById('dudh-list'); if(!list) return; list.innerHTML = ''; let totalLiter = 0, totalBill = 0;
    dudhRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    dudhRecords.forEach((record, index) => {
        const totalDayLiter = record.morning + record.evening; const dayCost = totalDayLiter * record.rate; totalLiter += totalDayLiter; totalBill += dayCost;
        const parts = record.date.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`;
        const li = document.createElement('li'); li.style.borderLeftColor = '#3498db'; 
        li.innerHTML = `
            <div class="list-left"><div style="display:flex; align-items:center; margin-bottom:6px;"><span class="member-badge" style="background:#e0f2fe; color:#3498db;">📅 ${showDate}</span><strong style="font-size:15px;">S: ${record.morning}L | Sh: ${record.evening}L</strong></div><div style="font-size:12px; color:#64748b; font-weight:600;">Rate: ₹${record.rate}/L | Total: ${totalDayLiter}L</div></div>
            <div class="list-right">
                <span style="font-weight:800; color:#3498db; font-size:19px; margin-right:5px;">₹${dayCost}</span>
                <button class="action-btn edit" onclick="editDudh(${index})">✏️</button>
                <button class="action-btn delete" onclick="deleteDudh(${index})">🗑️</button>
            </div>`;
        list.appendChild(li);
    });
    document.getElementById('dudh-total-liter').innerText = totalLiter.toFixed(2); document.getElementById('dudh-total-bill').innerText = `₹${Math.round(totalBill)}`;
}

function addDudh() {
    const dDate = document.getElementById('dudh-date').value; const rate = parseFloat(document.getElementById('dudh-rate').value); const morn = parseFloat(document.getElementById('dudh-morning').value) || 0; const eve = parseFloat(document.getElementById('dudh-evening').value) || 0;
    if (!dDate || isNaN(rate) || (morn === 0 && eve === 0)) return Swal.fire('Galti', 'Sahi details daaliye!', 'error');
    if(editDudhIndex === -1) { dudhRecords.push({ date: dDate, rate: rate, morning: morn, evening: eve }); } 
    else { dudhRecords[editDudhIndex] = { date: dDate, rate: rate, morning: morn, evening: eve }; editDudhIndex = -1; document.getElementById('btn-add-dudh').innerText = "Dudh Add Karein"; }
    
    saveToCloud(); 
    updateDudhUI(); 
    document.getElementById('dudh-morning').value = ''; document.getElementById('dudh-evening').value = '';
}
function editDudh(index) { const item = dudhRecords[index]; document.getElementById('dudh-date').value = item.date; document.getElementById('dudh-rate').value = item.rate; document.getElementById('dudh-morning').value = item.morning; document.getElementById('dudh-evening').value = item.evening; editDudhIndex = index; document.getElementById('btn-add-dudh').innerText = "Update Dudh ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function deleteDudh(index) { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { dudhRecords.splice(index, 1); saveToCloud(); updateDudhUI(); } }); }

const rationDateInput = document.getElementById('ration-date'); if(rationDateInput) rationDateInput.value = todayDateString;

function updateRationUI() {
    const list = document.getElementById('ration-list'); if(!list) return; list.innerHTML = '';
    rationItems.sort((a, b) => new Date(b.date) - new Date(a.date)); const uniqueDates = [...new Set(rationItems.map(item => item.date))];
    uniqueDates.forEach(dateStr => {
        const parts = dateStr.split('-'); const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); const showDate = `${dateObj.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dateObj.getMonth()]}`;
        const dateHeader = document.createElement('div'); dateHeader.className = 'date-header'; dateHeader.innerText = `🛒 ${showDate}`; list.appendChild(dateHeader);
        rationItems.forEach((item, index) => {
            if(item.date === dateStr) {
                const li = document.createElement('li'); li.style.borderLeftColor = '#8e44ad';
                li.innerHTML = `
                    <div class="list-left ration-item ${item.bought ? 'bought' : ''}" onclick="toggleRation(${index})" style="flex-direction: row; align-items:center; cursor:pointer;">
                        <div class="checkbox-custom"></div><strong style="font-size: 16px;">${item.name}</strong>
                    </div>
                    <div class="list-right"><button class="action-btn delete" onclick="deleteRation(${index})">🗑️</button></div>`;
                list.appendChild(li);
            }
        });
    });
}
function addRation() { const name = document.getElementById('ration-item').value; const rDate = document.getElementById('ration-date').value; if(!name || !rDate) return; rationItems.push({ name: name, bought: false, date: rDate }); saveToCloud(); document.getElementById('ration-item').value = ''; updateRationUI(); }
function toggleRation(index) { rationItems[index].bought = !rationItems[index].bought; saveToCloud(); updateRationUI(); }
function deleteRation(index) { rationItems.splice(index, 1); saveToCloud(); updateRationUI(); }

// ==========================================
// 🏦 7. EMI AND VYAJ LOGIC
// ==========================================
function calculateEMI() {
    const p = parseFloat(document.getElementById('emi-principal').value); const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100; const n = parseFloat(document.getElementById('emi-time').value);
    if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || n <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); const totalAmount = emi * n;
    document.getElementById('emi-result').style.display = 'block'; document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`; document.getElementById('emi-interest').innerText = `₹${Math.round(totalAmount - p)}`; document.getElementById('emi-total').innerText = `₹${Math.round(totalAmount)}`;
}

function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value); const rate = parseFloat(document.getElementById('vyaj-rate').value); const time = parseFloat(document.getElementById('vyaj-time').value);
    if (isNaN(p) || isNaN(rate) || isNaN(time) || p <= 0 || time <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    const interest = (p * rate * time) / 100;
    document.getElementById('vyaj-result').style.display = 'block'; document.getElementById('vyaj-only').innerText = `₹${Math.round(interest)}`; document.getElementById('vyaj-total').innerText = `₹${Math.round(p + interest)}`;
}
// ==========================================
// 📤 9. SHARE PDF REPORT SYSTEM 
// ==========================================
async function shareReport() {
    if(!window.jspdf) return Swal.fire('Wait', 'PDF library load ho rahi hai.', 'info');
    
    const filterMonth = document.getElementById('month-filter').value;
    const dataToExport = familyExpenses.filter(item => item.date && item.date.startsWith(filterMonth));
    
    if(dataToExport.length === 0) return Swal.fire('Khali hai!', 'Koi record nahi hai share karne ke liye.', 'info');

    // 1. PDF Design Banayein (Download wale ki tarah)
    const { jsPDF } = window.jspdf; 
    const doc = new jsPDF();
    doc.setFillColor(30, 60, 114); doc.rect(0, 0, 210, 22, 'F'); doc.setTextColor(255, 255, 255); doc.setFontSize(18); doc.text(`Ghar Ka Hisaab (${filterMonth})`, 14, 15);
    
    const tableColumn = ["Date", "Name", "Category", "Details", "Amount"]; 
    const tableRows = []; let totalAmount = 0;
    
    [...dataToExport].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(exp => { 
        const p = exp.date.split('-'); 
        tableRows.push([`${p[2]}/${p[1]}`, exp.member || '-', exp.category || 'Other', exp.description, `Rs ${exp.amount}`]); 
        totalAmount += exp.amount; 
    });
    
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 30, theme: 'grid', headStyles: { fillColor: [46, 204, 113] }, foot: [["", "", "", "Total :", `Rs ${totalAmount}`]], footStyles: { fillColor: [231, 76, 60] } });
    
    // 2. PDF ko File Format mein badlein (Taki share ho sake)
    const pdfBlob = doc.output('blob');
    const fileName = `Hisaab_${filterMonth}.pdf`;
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    // 3. Mobile ka Share Menu Kholein
    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        try {
            await navigator.share({
                title: `Ghar Ka Hisaab - ${filterMonth}`,
                text: `Is mahine ka total kharcha: ₹${totalAmount}. Puri details PDF mein check karein!`,
                files: [pdfFile]
            });
        } catch (error) {
            console.log('Share cancel hua:', error);
        }
    } else {
        // Agar browser PDF share support na kare, toh download kar dega
        Swal.fire('Browser Support Nahi Hai', 'Aapka browser direct PDF share karna support nahi karta. File download ho gayi hai, usey WhatsApp par bhej dein.', 'info');
        doc.save(fileName); 
    }
}
