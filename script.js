// ==========================================
// ☁️ 1. FIREBASE CONFIGURATION & AUTH
// ==========================================
// NOTE: Yahan apna Firebase config zaroor rakhna agar hat gaya ho to!
const firebaseConfig = {
    // Apni API key aur details yahan dalein (agar pehle se index.html mein nahi hai)
};
if (!firebase.apps.length) {
    // firebase.initializeApp(firebaseConfig); // Ise uncomment kar lena agar initialize error aaye
}

const auth = firebase.auth();
const db = firebase.firestore();

let allExpenses = [];
let allDudh = [];
let allRation = [];
let monthlyBudget = 20000;

// APP START: Check Login Status
auth.onAuthStateChanged((user) => {
    const splash = document.getElementById('splash-screen');
    if (splash) splash.style.display = 'none';

    if (user) {
        localStorage.setItem('familyAppUser', user.email);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        
        let userName = user.email.split('@')[0];
        document.getElementById('smart-greeting').innerText = `Hello, ${userName.charAt(0).toUpperCase() + userName.slice(1)}! ✨`;
        
        // Load All Cloud Data
        loadAllData(user.email);
    } else {
        localStorage.removeItem('familyAppUser');
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

// ==========================================
// 🔐 2. LOGIN & REGISTRATION LOGIC
// ==========================================
function loginWithEmail() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const statusText = document.getElementById('login-status');

    if (!email || password.length < 6) {
        Swal.fire('Opps!', 'Sahi email aur 6 akshar ka password daalein', 'warning');
        return;
    }

    statusText.style.display = 'block';
    statusText.innerText = "Cloud data laa rahe hain... ⏳";
    statusText.style.color = "#2563eb";

    auth.signInWithEmailAndPassword(email, password)
        .then(() => { statusText.style.display = 'none'; })
        .catch((error) => {
            statusText.style.display = 'none';
            Swal.fire('Error!', 'Email ya Password galat hai!', 'error');
        });
}

function registerWithEmail() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const statusText = document.getElementById('login-status');

    if (!email || password.length < 6) {
        Swal.fire('Rukiye!', 'Naya account banane ke liye sahi details bharein', 'info');
        return;
    }

    statusText.style.display = 'block';
    statusText.innerText = "Account bana rahe hain... ☁️";

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => {
            statusText.style.display = 'none';
            Swal.fire('Mubarak ho!', 'Aapka Family Cloud Account ban gaya!', 'success');
        })
        .catch((error) => {
            statusText.style.display = 'none';
            Swal.fire('Oops!', error.message, 'error');
        });
}

function logout() {
    Swal.fire({
        title: 'Logout?',
        text: "Kya aap sach mein bahar jaana chahte hain?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        cancelButtonColor: '#ef4444',
        confirmButtonText: 'Haan, Logout!'
    }).then((result) => {
        if (result.isConfirmed) {
            auth.signOut();
            document.getElementById('email-input').value = "";
            document.getElementById('password-input').value = "";
        }
    });
}

// ==========================================
// 🔄 3. LOAD ALL DATA FROM CLOUD
// ==========================================
function loadAllData(email) {
    const userRef = db.collection('users').doc(email);

    // 1. Load Budget
    userRef.get().then((doc) => {
        if (doc.exists && doc.data().budget) {
            monthlyBudget = doc.data().budget;
            document.getElementById('budget-display').innerText = monthlyBudget;
        }
    });

    // 2. Load Expenses
    userRef.collection('expenses').orderBy('date', 'desc').onSnapshot((snapshot) => {
        allExpenses = [];
        snapshot.forEach(doc => allExpenses.push({ id: doc.id, ...doc.data() }));
        renderHistory();
        updateCharts();
    });

    // 3. Load Dudh Record
    userRef.collection('dudh').orderBy('date', 'desc').onSnapshot((snapshot) => {
        allDudh = [];
        snapshot.forEach(doc => allDudh.push({ id: doc.id, ...doc.data() }));
        renderDudhHistory();
    });

    // 4. Load Ration
    userRef.collection('ration').orderBy('date', 'desc').onSnapshot((snapshot) => {
        allRation = [];
        snapshot.forEach(doc => allRation.push({ id: doc.id, ...doc.data() }));
        renderRationHistory();
    });
}

// ==========================================
// 💰 4. HISAAB (EXPENSES) LOGIC
// ==========================================
async function addExpense() {
    const user = auth.currentUser;
    if (!user) return;

    const desc = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const category = document.getElementById('expense-category').value;
    const member = document.getElementById('member-name').value;
    const date = document.getElementById('date').value || new Date().toISOString().split('T')[0];

    if (!desc || !amount) {
        Swal.fire('Khali hai!', 'Description aur Amount bharna zaroori hai', 'warning');
        return;
    }

    try {
        await db.collection('users').doc(user.email).collection('expenses').add({
            desc, amount, category, member, date, timestamp: Date.now()
        });
        
        document.getElementById('description').value = '';
        document.getElementById('amount').value = '';
        
        document.getElementById('sound-success').play();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        Swal.fire({ title: 'Hisaab Add Ho Gaya!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } catch (e) {
        Swal.fire('Error', 'Data save nahi hua!', 'error');
    }
}

function renderHistoryWithSkeleton() {
    document.getElementById('history-list').innerHTML = `
        <div class="skeleton-box" style="height: 60px; background: #e2e8f0; border-radius: 8px; margin-bottom: 10px; animation: pulse 1.5s infinite;"></div>
        <div class="skeleton-box" style="height: 60px; background: #e2e8f0; border-radius: 8px; margin-bottom: 10px; animation: pulse 1.5s infinite;"></div>
    `;
    setTimeout(renderHistory, 500);
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const totalDisp = document.getElementById('total-expense');
    const filter = document.getElementById('month-filter').value; 
    
    let filtered = allExpenses;
    if (filter) {
        filtered = allExpenses.filter(e => e.date.startsWith(filter));
    }

    let total = 0;
    list.innerHTML = filtered.map(e => {
        total += e.amount;
        return `
            <li>
                <div class="list-left">
                    <strong>${e.desc}</strong>
                    <div style="display:flex; gap:5px; margin-top: 3px;">
                        <span class="member-badge">${e.member}</span>
                        <span class="category-badge cat-${e.category}">${e.category}</span>
                    </div>
                </div>
                <div class="list-right">
                    <span>₹${e.amount}</span>
                    <button class="action-btn delete" onclick="deleteRecord('expenses', '${e.id}')">🗑️</button>
                </div>
            </li>
        `;
    }).join('');

    totalDisp.innerText = `₹${total}`;
    updateBudgetBar(total);
}

// BUDGET LOGIC
async function setBudget() {
    const user = auth.currentUser;
    const { value: newBudget } = await Swal.fire({
        title: 'Naya Budget Set Karein',
        input: 'number',
        inputValue: monthlyBudget,
        showCancelButton: true,
        inputValidator: (value) => { if (!value) return 'Budget daalna zaroori hai!' }
    });

    if (newBudget) {
        monthlyBudget = parseFloat(newBudget);
        document.getElementById('budget-display').innerText = monthlyBudget;
        if(user) await db.collection('users').doc(user.email).set({ budget: monthlyBudget }, { merge: true });
        renderHistory();
    }
}

function updateBudgetBar(total) {
    const bar = document.getElementById('budget-bar');
    let percent = (total / monthlyBudget) * 100;
    if (percent > 100) percent = 100;
    
    bar.style.width = `${percent}%`;
    
    if (percent < 50) bar.style.background = '#10b981'; // Green
    else if (percent < 80) bar.style.background = '#f59e0b'; // Yellow
    else bar.style.background = '#ef4444'; // Red
}

// ==========================================
// 🥛 5. DUDH (MILK) LOGIC
// ==========================================
async function addDudh() {
    const user = auth.currentUser;
    const date = document.getElementById('dudh-date').value || new Date().toISOString().split('T')[0];
    const rate = parseFloat(document.getElementById('dudh-rate').value);
    const morning = parseFloat(document.getElementById('dudh-morning').value) || 0;
    const evening = parseFloat(document.getElementById('dudh-evening').value) || 0;

    if (!rate || (morning === 0 && evening === 0)) {
        Swal.fire('Error', 'Rate aur kam se kam ek time ka dudh dalein!', 'warning');
        return;
    }

    const totalLtr = morning + evening;
    const totalCost = totalLtr * rate;

    try {
        await db.collection('users').doc(user.email).collection('dudh').add({
            date, rate, morning, evening, totalLtr, totalCost, timestamp: Date.now()
        });
        document.getElementById('dudh-morning').value = '';
        document.getElementById('dudh-evening').value = '';
        Swal.fire({ title: 'Dudh Add Hua!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
    } catch (e) {
        Swal.fire('Error', 'Data save nahi hua!', 'error');
    }
}

function renderDudhHistory() {
    const list = document.getElementById('dudh-list');
    let totalBill = 0;
    let totalLiters = 0;

    list.innerHTML = allDudh.map(d => {
        totalBill += d.totalCost;
        totalLiters += d.totalLtr;
        return `
            <li>
                <div class="list-left">
                    <strong>${d.date}</strong>
                    <span style="font-size: 12px; color: #64748b;">Subah: ${d.morning}L | Shaam: ${d.evening}L</span>
                </div>
                <div class="list-right">
                    <span>₹${d.totalCost}</span>
                    <button class="action-btn delete" onclick="deleteRecord('dudh', '${d.id}')">🗑️</button>
                </div>
            </li>
        `;
    }).join('');

    document.getElementById('dudh-total-bill').innerText = `₹${totalBill}`;
    document.getElementById('dudh-total-liter').innerText = totalLiters.toFixed(1);
}

// ==========================================
// 🛒 6. RATION LOGIC
// ==========================================
async function addRation() {
    const user = auth.currentUser;
    const date = document.getElementById('ration-date').value || new Date().toISOString().split('T')[0];
    const item = document.getElementById('ration-item').value;

    if (!item) return Swal.fire('Error', 'Samaan ka naam likhein!', 'warning');

    try {
        await db.collection('users').doc(user.email).collection('ration').add({
            date, item, bought: false, timestamp: Date.now()
        });
        document.getElementById('ration-item').value = '';
    } catch (e) {}
}

function renderRationHistory() {
    const list = document.getElementById('ration-list');
    list.innerHTML = allRation.map(r => `
        <li style="opacity: ${r.bought ? '0.6' : '1'};">
            <div class="list-left" style="flex-direction: row; align-items: center; gap: 10px;">
                <input type="checkbox" ${r.bought ? 'checked' : ''} onchange="toggleRation('${r.id}', this.checked)" style="width: 20px; height: 20px; margin: 0;">
                <strong style="text-decoration: ${r.bought ? 'line-through' : 'none'};">${r.item}</strong>
            </div>
            <div class="list-right">
                <button class="action-btn delete" onclick="deleteRecord('ration', '${r.id}')">🗑️</button>
            </div>
        </li>
    `).join('');
}

async function toggleRation(id, isBought) {
    const user = auth.currentUser;
    await db.collection('users').doc(user.email).collection('ration').doc(id).update({ bought: isBought });
}

// ==========================================
// 🧮 7. EMI & VYAJ CALCULATORS
// ==========================================
function calculateEMI() {
    const p = parseFloat(document.getElementById('emi-principal').value);
    const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100;
    const n = parseFloat(document.getElementById('emi-time').value);

    if (!p || !r || !n) return;
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    document.getElementById('emi-result').style.display = 'block';
    document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`;
    document.getElementById('sound-click').play();
}

function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value);
    const r = parseFloat(document.getElementById('vyaj-rate').value);
    const t = parseFloat(document.getElementById('vyaj-time').value);

    if (!p || !r || !t) return;
    const interest = (p * r * t) / 100;
    
    document.getElementById('vyaj-result').style.display = 'block';
    document.getElementById('vyaj-only').innerText = `₹${interest}`;
    document.getElementById('sound-click').play();
}

// ==========================================
// 🗑️ 8. COMMON DELETE FUNCTION
// ==========================================
async function deleteRecord(collectionName, id) {
    const user = auth.currentUser;
    const result = await Swal.fire({ title: 'Delete?', text: "Hamesha ke liye mita dein?", icon: 'warning', showCancelButton: true });
    if (result.isConfirmed) {
        await db.collection('users').doc(user.email).collection(collectionName).doc(id).delete();
    }
}

// ==========================================
// 📈 9. CHARTS (Category & Member)
// ==========================================
let catChartInstance = null;
function updateCharts() {
    // Category Chart
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const catData = {};
    allExpenses.forEach(e => catData[e.category] = (catData[e.category] || 0) + e.amount);

    if (catChartInstance) catChartInstance.destroy();
    catChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catData),
            datasets: [{ data: Object.values(catData), backgroundColor: ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } }, cutout: '70%' }
    });
}

// ==========================================
// 📄 10. EXPORT PDF, SHARE & BACKUP
// ==========================================
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Family Hisaab Report", 14, 15);
    const rows = allExpenses.map(e => [e.date, e.desc, e.member, e.category, `Rs ${e.amount}`]);
    doc.autoTable({ head: [['Date', 'Item', 'User', 'Cat', 'Amount']], body: rows, startY: 20 });
    doc.save("Family_Hisaab.pdf");
}

function shareReport() {
    const total = document.getElementById('total-expense').innerText;
    const text = `Ghar ka Hisaab Report 💰\nIs mahine ka kharcha: ${total}\nApp link: family-super-app.web.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

function backupData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ expenses: allExpenses, dudh: allDudh, ration: allRation }));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "family_app_backup.json");
    dlAnchorElem.click();
}

function restoreData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        Swal.fire('Restore Backup', 'Firebase connected hai. Restore karne ke liye direct database dashboard use karein ya manual entry karein.', 'info');
    };
    reader.readAsText(file);
}

// ==========================================
// 🎙️ 11. UI TOOLS (Voice & Navigation)
// ==========================================
function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'hi-IN';
    const btn = document.getElementById('mic-btn');
    btn.innerText = "🛑";
    
    recognition.onresult = (event) => {
        document.getElementById('description').value = event.results[0][0].transcript;
        btn.innerText = "🎤";
    };
    recognition.onerror = () => { btn.innerText = "🎤"; Swal.fire('Error', 'Awaz samajh nahi aayi!', 'error'); };
    recognition.start();
}

function openSection(id, title) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(`section-${id}`).classList.add('active-section');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    event.currentTarget.classList.add('active-nav');
    
    document.getElementById('app-title').innerText = title;
    try { document.getElementById('sound-click').play(); } catch(e){}
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-toggle').innerText = isDark ? '☀️' : '🌙';
}
