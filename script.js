// ==========================================
// 0. SMART GREETING & SECURITY 🔐
// ==========================================
function updateGreeting() {
    const hrs = new Date().getHours();
    let greet = 'Good Evening';
    if (hrs < 12) greet = 'Good Morning';
    else if (hrs < 17) greet = 'Good Afternoon';
    const greetEl = document.getElementById('smart-greeting');
    if(greetEl) greetEl.innerText = `${greet}, Aditya! ✨`;
}

window.onload = () => {
    updateGreeting();
    const savedPin = localStorage.getItem('appPin');
    if(!savedPin) {
        document.getElementById('lock-title').innerText = "Create New PIN";
        document.getElementById('lock-desc').innerText = "Pehli baar 4-digit PIN banayein";
    }
};

function handlePinInput(currentId, nextId) {
    const currentBox = document.getElementById(currentId);
    currentBox.value = currentBox.value.replace(/[^0-9]/g, '');
    if (currentBox.value.length === 1 && nextId) document.getElementById(nextId).focus();
    else if (currentBox.value.length === 1 && !nextId) checkPin(); 
}

function handleBackspace(e, currentId, prevId) {
    const currentBox = document.getElementById(currentId);
    if (e.key === 'Backspace' && currentBox.value === '' && prevId) document.getElementById(prevId).focus();
}

function checkPin() {
    const inputPin = document.getElementById('pin1').value + document.getElementById('pin2').value + document.getElementById('pin3').value + document.getElementById('pin4').value;
    if(inputPin.length !== 4) return; 
    const savedPin = localStorage.getItem('appPin');

    if(!savedPin) {
        localStorage.setItem('appPin', inputPin);
        Swal.fire('Set!', 'Aapka PIN set ho gaya hai.', 'success');
        unlockApp();
    } else {
        if(inputPin === savedPin) unlockApp();
        else {
            if(navigator.vibrate) navigator.vibrate([200, 100, 200]); 
            document.querySelectorAll('.pin-box').forEach(box => {
                box.classList.add('shake-error');
                setTimeout(() => { box.classList.remove('shake-error'); box.value = ''; }, 500);
            });
            document.getElementById('pin1').focus(); 
        }
    }
}

function unlockApp() {
    const lockScreen = document.getElementById('lock-screen');
    lockScreen.style.transition = "opacity 0.3s ease";
    lockScreen.style.opacity = "0";
    setTimeout(() => {
        lockScreen.style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        renderHistoryWithSkeleton(); 
    }, 300);
}

function resetPin() {
    Swal.fire({
        title: 'Reset Everything?', text: "Data delete karke naya PIN banayein?", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Yes, Delete!'
    }).then((result) => { if (result.isConfirmed) { localStorage.clear(); location.reload(); } });
}

// ☁️ BACKUP & RESTORE
function backupData() {
    const allData = { expenses: localStorage.getItem('familyExpensesData'), dudh: localStorage.getItem('familyDudhData'), ration: localStorage.getItem('familyRationData'), budget: localStorage.getItem('familyBudget') };
    const blob = new Blob([JSON.stringify(allData)], {type: "application/json"});
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob);
    link.download = `FamilyApp_Backup.json`; link.click();
    Swal.fire('Saved!', 'Backup JSON file me save ho gaya.', 'success');
}
function restoreData(event) {
    const file = event.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            if(data.expenses) localStorage.setItem('familyExpensesData', data.expenses);
            if(data.dudh) localStorage.setItem('familyDudhData', data.dudh);
            if(data.ration) localStorage.setItem('familyRationData', data.ration);
            if(data.budget) localStorage.setItem('familyBudget', data.budget);
            Swal.fire('Restored!', 'Data wapas aa gaya.', 'success').then(() => location.reload());
        } catch(err) { Swal.fire('Error', 'Galat file!', 'error'); }
    };
    reader.readAsText(file);
}

// ==========================================
// 1. THEME & APP SETUP
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

// 🔥 NAV BAR BUG FIXED HERE
function openSection(sectionName, title) {
    document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section'));
    document.getElementById('section-' + sectionName).classList.add('active-section');
    document.getElementById('app-title').innerText = title;
    
    // Highlight active nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active-nav');
        if(btn.getAttribute('onclick').includes(`'${sectionName}'`)) {
            btn.classList.add('active-nav');
        }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Upar scroll kar dega tab badalne pe
}

const now = new Date();
const todayDateString = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

// ==========================================
// 2. ADVANCED HISAAB
// ==========================================
let familyExpenses = [];
try { familyExpenses = JSON.parse(localStorage.getItem('familyExpensesData')) || []; } catch(e) { familyExpenses = []; }

let editExpenseIndex = -1;
let currentReceiptUrl = ""; 
let categoryChartInstance = null; let memberChartInstance = null; 

const dateInput = document.getElementById('date');
if(dateInput) dateInput.value = todayDateString;
const monthFilter = document.getElementById('month-filter');
if(monthFilter) monthFilter.value = todayDateString.slice(0, 7); 

function playSuccessSound() {
    try {
        const context = new (window.AudioContext || window.webkitAudioContext)();
        const osc = context.createOscillator(); const gain = context.createGain();
        osc.connect(gain); gain.connect(context.destination);
        osc.type = 'sine'; osc.frequency.setValueAtTime(800, context.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, context.currentTime + 0.1);
        gain.gain.setValueAtTime(0.5, context.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
        osc.start(context.currentTime); osc.stop(context.currentTime + 0.1);
    } catch(e) {}
}

function startVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return Swal.fire('Oops!', 'Voice support nahi hai.', 'error');
    try {
        const recognition = new SpeechRecognition(); recognition.lang = 'hi-IN'; 
        const micBtn = document.getElementById('mic-btn');
        recognition.onstart = () => micBtn.classList.add('mic-active');
        recognition.onresult = (event) => { document.getElementById('description').value = event.results[0][0].transcript; };
        recognition.onend = () => micBtn.classList.remove('mic-active');
        recognition.start();
    } catch(err) {}
}

const receiptImgInput = document.getElementById('receipt-img');
if(receiptImgInput) {
    receiptImgInput.addEventListener('change', async function(e) {
        const file = e.target.files[0]; if(!file) return;
        Swal.fire({ title: 'Uploading...', text: 'Wait karein', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        const imgbbApiKey = "YAHAN_APNI_IMGBB_API_KEY_PASTE_KAREIN"; 
        const formData = new FormData(); formData.append("image", file);
        try {
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbApiKey}`, { method: "POST", body: formData });
            const data = await response.json();
            if (data.success) {
                currentReceiptUrl = data.data.url; 
                document.getElementById('receipt-preview').src = currentReceiptUrl;
                document.getElementById('receipt-preview').style.display = 'block';
                Swal.fire({ icon: 'success', title: 'Uploaded!', timer: 1500, showConfirmButton: false });
            } else Swal.fire('Error', 'Upload fail!', 'error');
        } catch(err) { Swal.fire('Error', 'Internet check karein.', 'error'); }
    });
}

function setBudget() {
    Swal.fire({ title: 'Monthly Budget Set Karein', input: 'number', inputValue: localStorage.getItem('familyBudget') || 20000, showCancelButton: true }).then((result) => {
        if (result.isConfirmed && result.value > 0) { localStorage.setItem('familyBudget', result.value); renderHistoryWithSkeleton(); }
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
    const budgetLimit = parseFloat(localStorage.getItem('familyBudget')) || 20000;
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
        playSuccessSound(); 
        if(typeof confetti !== 'undefined') confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); 
    } else {
        familyExpenses[editExpenseIndex] = newRecord;
        editExpenseIndex = -1;
        document.getElementById('btn-add-expense').innerText = "Kharcha Add Karein";
        Swal.fire('Updated!', 'Update ho gaya.', 'success');
    }

    localStorage.setItem('familyExpensesData', JSON.stringify(familyExpenses));
    document.getElementById('description').value = ''; document.getElementById('amount').value = ''; 
    const rImg = document.getElementById('receipt-img'); if(rImg) rImg.value = ''; 
    const rPrev = document.getElementById('receipt-preview'); if(rPrev) rPrev.style.display = 'none';
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
    if(item.receipt) { currentReceiptUrl = item.receipt; document.getElementById('receipt-preview').src = currentReceiptUrl; document.getElementById('receipt-preview').style.display = 'block'; } 
    else { currentReceiptUrl = ""; document.getElementById('receipt-preview').style.display = 'none'; }
    editExpenseIndex = index;
    document.getElementById('btn-add-expense').innerText = "Update Kharcha ✏️";
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function deleteExpense(index) {
    Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Haan!' }).then((result) => {
        if (result.isConfirmed) { familyExpenses.splice(index, 1); localStorage.setItem('familyExpensesData', JSON.stringify(familyExpenses)); renderHistoryWithSkeleton(); }
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
    Swal.fire({ icon: 'success', title: 'Downloaded!', timer: 2000, showConfirmButton: false });
}

// ==========================================
// 3. EMI & VYAJ CALCULATOR
// ==========================================
function calculateEMI() {
    const p = parseFloat(document.getElementById('emi-principal').value); const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100; const n = parseFloat(document.getElementById('emi-time').value);
    if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || n <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); const totalAmount = emi * n;
    document.getElementById('emi-result').style.display = 'block'; document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`; document.getElementById('emi-interest').innerText = `₹${Math.round(totalAmount - p)}`; document.getElementById('emi-total').innerText = `₹${Math.round(totalAmount)}`;
}
function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value); const r