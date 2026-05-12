// ==========================================
// 💰 5. HISAAB, RATION, DUDH, EMI & BACKUP
// ==========================================
const todayDateString = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
let editExpenseIndex = -1; 
let currentReceiptUrl = ""; 
let editDudhIndex = -1;

const dateInput = document.getElementById('date'); if(dateInput) dateInput.value = todayDateString;
const monthFilter = document.getElementById('month-filter'); if(monthFilter) monthFilter.value = todayDateString.slice(0, 7); 
const dudhDateInput = document.getElementById('dudh-date'); if(dudhDateInput) dudhDateInput.value = todayDateString;
const rationDateInput = document.getElementById('ration-date'); if(rationDateInput) rationDateInput.value = todayDateString;

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
    if(typeof renderCategoryChart === 'function') { renderCategoryChart(categoryTotals); renderMemberChart(memberTotals); }
}

function addExpense() {
    const member = document.getElementById('member-name').value; const category = document.getElementById('expense-category').value; const desc = document.getElementById('description').value; const amt = parseFloat(document.getElementById('amount').value); const date = document.getElementById('date').value;
    if (!desc || isNaN(amt) || amt <= 0 || !date) return Swal.fire('Oops...', 'Sahi details bhariye!', 'warning');
    const newRecord = { member, category, description: desc, amount: amt, date, receipt: currentReceiptUrl };

    if(editExpenseIndex === -1) {
        familyExpenses.push(newRecord); if(typeof playSound === 'function') playSound('success');
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

// Ration Logic
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
    if(typeof playSound === 'function') playSound('click');
    if (item.bought && item.amount > 0) {
        const autoExpense = { member: "Aditya", category: "Ration", description: `🛒 ${item.name} (Ration)`, amount: item.amount, date: todayDateString, receipt: "" };
        familyExpenses.push(autoExpense);
        if(typeof playSound === 'function') playSound('success');
        Swal.fire({ title: 'Hisaab mein juda!', text: `${item.name} ka ₹${item.amount} 'GharManager' mein add ho gaya hai. ✅`, icon: 'success', timer: 2000, showConfirmButton: false });
    }
    await saveToCloud(); updateRationUI(); updateHisabUI();
}
function deleteRation(index) { rationItems.splice(index, 1); saveToCloud(); updateRationUI(); }

// Dudh Logic
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
    if(editDudhIndex === -1) { dudhRecords.push({ date: dDate, rate: rate, morning: morn, evening: eve }); if(typeof playSound === 'function') playSound('success'); } 
    else { dudhRecords[editDudhIndex] = { date: dDate, rate: rate, morning: morn, evening: eve }; editDudhIndex = -1; document.getElementById('btn-add-dudh').innerText = "Dudh Add Karein"; }
    saveToCloud(); updateDudhUI(); document.getElementById('dudh-morning').value = ''; document.getElementById('dudh-evening').value = '';
}
function editDudh(index) { const item = dudhRecords[index]; document.getElementById('dudh-date').value = item.date; document.getElementById('dudh-rate').value = item.rate; document.getElementById('dudh-morning').value = item.morning; document.getElementById('dudh-evening').value = item.evening; editDudhIndex = index; document.getElementById('btn-add-dudh').innerText = "Update Dudh ✏️"; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function deleteDudh(index) { Swal.fire({ title: 'Delete?', icon: 'warning', showCancelButton: true }).then((result) => { if (result.isConfirmed) { dudhRecords.splice(index, 1); saveToCloud(); updateDudhUI(); } }); }

// EMI & Vyaj
function calculateEMI() {
    const p = parseFloat(document.getElementById('emi-principal').value); const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100; const n = parseFloat(document.getElementById('emi-time').value);
    if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || n <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1); const totalAmount = emi * n;
    document.getElementById('emi-result').style.display = 'block'; document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`; 
    if(typeof playSound === 'function') playSound('click');
}
function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value); const rate = parseFloat(document.getElementById('vyaj-rate').value); const time = parseFloat(document.getElementById('vyaj-time').value);
    if (isNaN(p) || isNaN(rate) || isNaN(time) || p <= 0 || time <= 0) return Swal.fire('Galti', 'Sahi details bhariye!', 'error');
    const interest = (p * rate * time) / 100;
    document.getElementById('vyaj-result').style.display = 'block'; document.getElementById('vyaj-only').innerText = `₹${Math.round(interest)}`; 
    if(typeof playSound === 'function') playSound('click');
}

// Backup & Restore
function backupData() { const dataToBackup = { expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, budget: budgetLimit }; const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToBackup)); const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", "GharManager_Cloud_Backup.json"); dlAnchorElem.click(); }
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

