// ==========================================
// 1. LOGIN & SECURITY LOGIC
// ==========================================
const correctPIN = "1234"; // Yahan tum apna PIN change kar sakte ho

function checkPIN() {
    const enteredPIN = document.getElementById('pin-input').value;
    if (enteredPIN === correctPIN) {
        document.getElementById('login-screen').style.display = 'none';
    } else {
        document.getElementById('login-error').style.display = 'block';
        document.getElementById('pin-input').value = '';
    }
}

// ==========================================
// 2. TAB SWITCHING LOGIC
// ==========================================
function openSection(sectionName, title) {
    document.querySelectorAll('.app-section').forEach(sec => sec.classList.remove('active-section'));
    document.getElementById('section-' + sectionName).classList.add('active-section');
    document.getElementById('app-title').innerText = title;
    
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active-nav'));
    event.currentTarget.classList.add('active-nav');
}

// Aaj ki date nikalne ka global variable (YYYY-MM-DD)
const todayDateString = new Date().toISOString().split('T')[0];

// ==========================================
// 3. GHAR KA HISAAB (EXPENSE TRACKER)
// ==========================================
let familyExpenses = JSON.parse(localStorage.getItem('familyExpensesData')) || [];
const dateInput = document.getElementById('date');
if(dateInput) dateInput.value = todayDateString;

function updateHisabUI() {
    const list = document.getElementById('history-list');
    if(!list) return;
    list.innerHTML = ''; 
    let totalExpense = 0;

    // Date ke hisaab se group banana (Newest First)
    const uniqueDates = [...new Set(familyExpenses.map(item => item.date))];
    uniqueDates.sort((a, b) => new Date(b) - new Date(a)); 

    uniqueDates.forEach(dateStr => {
        const parts = dateStr.split('-'); 
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); 
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const showDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()} (${days[dateObj.getDay()]})`;

        const dateHeader = document.createElement('div');
        dateHeader.className = 'date-header';
        dateHeader.innerText = `🗓️ ${showDate}`;
        list.appendChild(dateHeader);

        familyExpenses.forEach((item, index) => {
            if (item.date === dateStr) {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="list-left">
                        <div>
                            <span class="member-badge">${item.member}</span> 
                            <strong style="font-size: 15px; color: #2c3e50;">${item.description}</strong>
                        </div>
                    </div>
                    <div class="list-right">
                        <span style="font-weight: bold; color: #e74c3c; font-size: 16px;">₹${item.amount}</span> 
                        <button class="delete-btn" onclick="deleteExpense(${index})">X</button>
                    </div>
                `;
                list.appendChild(li);
            }
        });
    });

    familyExpenses.forEach(item => totalExpense += item.amount);
    document.getElementById('total-expense').innerText = `₹${totalExpense}`;
}

function addExpense() {
    const member = document.getElementById('member-name').value;
    const desc = document.getElementById('description').value;
    const amt = parseFloat(document.getElementById('amount').value);
    const date = document.getElementById('date').value;

    if (!member || !desc || isNaN(amt) || amt <= 0 || !date) return alert("Sahi details daalo!");
    
    familyExpenses.push({ member: member, description: desc, amount: amt, date: date });
    localStorage.setItem('familyExpensesData', JSON.stringify(familyExpenses));
    updateHisabUI();

    document.getElementById('description').value = '';
    document.getElementById('amount').value = '';
}

function deleteExpense(index) {
    if(confirm("Kya tum sach mein is kharche ko delete karna chahte ho?")) {
        familyExpenses.splice(index, 1);
        localStorage.setItem('familyExpensesData', JSON.stringify(familyExpenses));
        updateHisabUI();
    }
}
updateHisabUI();

// ==========================================
// 4. EMI CALCULATOR
// ==========================================
function calculateEMI() {
    const p = parseFloat(document.getElementById('emi-principal').value);
    const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100;
    const n = parseFloat(document.getElementById('emi-time').value);

    if (isNaN(p) || isNaN(r) || isNaN(n) || p <= 0 || n <= 0) return alert("Sahi details bhariye!");

    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalAmount = emi * n;
    const totalInterest = totalAmount - p;

    document.getElementById('emi-result').style.display = 'block';
    document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`;
    document.getElementById('emi-interest').innerText = `₹${Math.round(totalInterest)}`;
    document.getElementById('emi-total').innerText = `₹${Math.round(totalAmount)}`;
}

// ==========================================
// 5. GAON KA VYAJ (Rupay Saikra)
// ==========================================
function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value);
    const rate = parseFloat(document.getElementById('vyaj-rate').value);
    const time = parseFloat(document.getElementById('vyaj-time').value);

    if (isNaN(p) || isNaN(rate) || isNaN(time) || p <= 0 || time <= 0) return alert("Sahi details bhariye!");

    const interest = (p * rate * time) / 100;
    const total = p + interest;

    document.getElementById('vyaj-result').style.display = 'block';
    document.getElementById('vyaj-only').innerText = `₹${Math.round(interest)}`;
    document.getElementById('vyaj-total').innerText = `₹${Math.round(total)}`;
}

// ==========================================
// 6. DUDH KA HISAAB & CHECKLIST
// ==========================================
let dudhRecords = JSON.parse(localStorage.getItem('familyDudhData')) || [];

const dudhDateInput = document.getElementById('dudh-date');
if(dudhDateInput) dudhDateInput.value = todayDateString;

const monthPicker = document.getElementById('checklist-month-picker');
if(monthPicker) {
    // Shuruat mein aaj ka mahina set karna (e.g., "2026-02")
    monthPicker.value = todayDateString.slice(0, 7);
    monthPicker.addEventListener('change', updateChecklist);
}

function updateDudhUI() {
    const list = document.getElementById('dudh-list');
    if(!list) return;
    list.innerHTML = '';
    let totalLiter = 0;
    let totalBill = 0;

    dudhRecords.sort((a, b) => new Date(b.date) - new Date(a.date));

    dudhRecords.forEach((record, index) => {
        const totalDayLiter = record.morning + record.evening;
        const dayCost = totalDayLiter * record.rate;
        
        totalLiter += totalDayLiter;
        totalBill += dayCost;

        const parts = record.date.split('-'); 
        const dateObj = new Date(parts[0], parts[1] - 1, parts[2]); 
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const showDate = `${dateObj.getDate()} ${months[dateObj.getMonth()]} (${days[dateObj.getDay()]})`;

        const li = document.createElement('li');
        li.style.borderLeftColor = '#3498db'; 
        li.innerHTML = `
            <div class="list-left">
                <div>
                    <span class="member-badge" style="background-color: #34495e;">🗓️ ${showDate}</span> 
                    <strong style="font-size: 14px; color: #2c3e50;">S: ${record.morning}L | Sh: ${record.evening}L</strong>
                </div>
                <div style="font-size: 12px; color: gray; margin-top: 5px;">Rate: ₹${record.rate}/L | Total: ${totalDayLiter}L</div>
            </div>
            <div class="list-right">
                <span style="font-weight: bold; color: #3498db; font-size: 16px;">₹${dayCost}</span> 
                <button class="delete-btn" onclick="deleteDudh(${index})">X</button>
            </div>
        `;
        list.appendChild(li);
    });

    document.getElementById('dudh-total-liter').innerText = totalLiter.toFixed(2); 
    document.getElementById('dudh-total-bill').innerText = `₹${Math.round(totalBill)}`;
    
    // UI update hone ke baad Checklist ko bhi update karna
    updateChecklist();
}

function updateChecklist() {
    const grid = document.getElementById('checklist-grid');
    if(!grid || !monthPicker.value) return;

    grid.innerHTML = '';
    
    const yearStr = monthPicker.value.split('-')[0];
    const monthStr = monthPicker.value.split('-')[1];
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    
    // Mahine mein kitne din hain (28, 29, 30, 31)
    const daysInMonth = new Date(year, month, 0).getDate();
    
    // Kis-kis din dudh aaya uski list banana
    const enteredDates = new Set(dudhRecords.map(record => record.date));

    // 1 se lekar aakhri din tak ke dabbe (boxes) banana
    for (let i = 1; i <= daysInMonth; i++) {
        const dayBox = document.createElement('div');
        dayBox.className = 'day-box';
        dayBox.innerText = i; 

        // String banakar check karna aasaan hota hai (e.g., "2026-02-05")
        const checkDateString = `${yearStr}-${monthStr}-${String(i).padStart(2, '0')}`;

        if (enteredDates.has(checkDateString)) {
            dayBox.classList.add('day-yes'); // Aaya (Green)
        } else if (checkDateString > todayDateString) {
            dayBox.classList.add('day-future'); // Future Dates (Gray)
        } else {
            dayBox.classList.add('day-no'); // Nahi Aaya (Red)
        }

        grid.appendChild(dayBox);
    }
}

function addDudh() {
    const dDate = document.getElementById('dudh-date').value;
    const rate = parseFloat(document.getElementById('dudh-rate').value);
    const morn = parseFloat(document.getElementById('dudh-morning').value) || 0; 
    const eve = parseFloat(document.getElementById('dudh-evening').value) || 0;

    if (!dDate || isNaN(rate) || (morn === 0 && eve === 0)) {
        return alert("Date, Rate aur dudh ki quantity daaliye!");
    }

    if (morn > 5 || eve > 5) {
        return alert("Bhai, dudh ki limit 5 Litre tak hi hai. Kripaya sahi hisaab daalein!");
    }

    dudhRecords.push({ date: dDate, rate: rate, morning: morn, evening: eve });
    localStorage.setItem('familyDudhData', JSON.stringify(dudhRecords));
    
    updateDudhUI();
    
    document.getElementById('dudh-morning').value = '';
    document.getElementById('dudh-evening').value = '';
}

function deleteDudh(index) {
    if(confirm("Kya tum sach mein is din ka dudh record delete karna chahte ho?")) {
        dudhRecords.splice(index, 1);
        localStorage.setItem('familyDudhData', JSON.stringify(dudhRecords));
        updateDudhUI();
    }
}
updateDudhUI();
