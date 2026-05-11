// ==========================================
// ☁️ 1. FIREBASE INITIALIZATION & AUTH
// ==========================================
const auth = firebase.auth();
const db = firebase.firestore();

// Check Login Status on Page Load
auth.onAuthStateChanged((user) => {
    if (user) {
        // User is logged in
        localStorage.setItem('familyAppUser', user.email);
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('main-app').style.display = 'block';
        document.getElementById('smart-greeting').innerText = `Hello, ${user.email.split('@')[0]}! ✨`;
        loadAllData(user.email); // Database se saara data lao
    } else {
        // User is logged out
        localStorage.removeItem('familyAppUser');
        document.getElementById('main-app').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    }
});

// LOGIN FUNCTION
function loginWithEmail() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;
    const btn = document.querySelector("#login-screen .expense-btn");

    if (!email || password.length < 6) {
        Swal.fire('Opps!', 'Sahi email aur 6 akshar ka password daalein', 'warning');
        return;
    }

    btn.innerText = "Cloud data laa rahe hain... ⏳";
    btn.disabled = true;

    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            btn.innerText = "🚀 Login Karein";
            btn.disabled = false;
            Swal.fire('Error!', 'Email ya Password galat hai!', 'error');
        });
}

// REGISTER FUNCTION
function registerWithEmail() {
    const email = document.getElementById('email-input').value;
    const password = document.getElementById('password-input').value;

    if (!email || password.length < 6) {
        Swal.fire('Halt!', 'Naya account banane ke liye sahi details bharein', 'info');
        return;
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(() => Swal.fire('Mubarak ho!', 'Aapka Family Cloud Account ban gaya!', 'success'))
        .catch((error) => Swal.fire('Oops!', error.message, 'error'));
}

// LOGOUT
function logout() {
    Swal.fire({
        title: 'Logout?',
        text: "Kya aap sach mein bahar jaana chahte hain?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Haan, Niklo!'
    }).then((result) => {
        if (result.isConfirmed) auth.signOut();
    });
}

// ==========================================
// 💰 2. HISAAB (EXPENSES) LOGIC
// ==========================================
let allExpenses = [];

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

    const newExpense = { desc, amount, category, member, date, timestamp: Date.now() };

    try {
        await db.collection('users').doc(user.email).collection('expenses').add(newExpense);
        document.getElementById('description').value = '';
        document.getElementById('amount').value = '';
        
        // Success Sound & Confetti
        document.getElementById('sound-success').play();
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        
        Swal.fire({ title: 'Hisaab Likha Gaya!', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    } catch (e) {
        Swal.fire('Error', 'Data save nahi hua!', 'error');
    }
}

function loadAllData(email) {
    // Real-time listener for Expenses
    db.collection('users').doc(email).collection('expenses').orderBy('date', 'desc')
        .onSnapshot((snapshot) => {
            allExpenses = [];
            snapshot.forEach(doc => allExpenses.push({ id: doc.id, ...doc.data() }));
            renderHistory();
            updateCharts();
        });
}

function renderHistory() {
    const list = document.getElementById('history-list');
    const totalDisp = document.getElementById('total-expense');
    const filter = document.getElementById('month-filter').value; // YYYY-MM
    
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
                    <div style="display:flex; gap:5px;">
                        <span class="member-badge">${e.member}</span>
                        <span class="category-badge cat-${e.category}">${e.category}</span>
                    </div>
                </div>
                <div class="list-right">
                    <span>₹${e.amount}</span>
                    <button class="action-btn delete" onclick="deleteExpense('${e.id}')">🗑️</button>
                </div>
            </li>
        `;
    }).join('');

    totalDisp.innerText = `₹${total}`;
}

async function deleteExpense(id) {
    const user = auth.currentUser;
    const result = await Swal.fire({ title: 'Delete?', text: "Yeh kharcha mita dein?", icon: 'warning', showCancelButton: true });
    
    if (result.isConfirmed) {
        await db.collection('users').doc(user.email).collection('expenses').doc(id).delete();
    }
}

// ==========================================
// 📈 3. CHARTS & TOOLS
// ==========================================
function updateCharts() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    const catData = {};
    allExpenses.forEach(e => catData[e.category] = (catData[e.category] || 0) + e.amount);

    if (window.myChart) window.myChart.destroy();
    window.myChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(catData),
            datasets: [{ data: Object.values(catData), backgroundColor: ['#2563eb', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'] }]
        },
        options: { plugins: { legend: { position: 'bottom' } } }
    });
}

// SECTION SWITCHING
function openSection(id, title) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active-section'));
    document.getElementById(`section-${id}`).classList.add('active-section');
    
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active-nav'));
    event.currentTarget.classList.add('active-nav');
    
    document.getElementById('app-title').innerText = title;
    document.getElementById('sound-click').play();
}

// ==========================================
// 🎙️ 4. VOICE TYPING (Jadu!)
// ==========================================
function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'hi-IN';
    document.getElementById('mic-btn').innerText = "🛑";

    recognition.onresult = (event) => {
        document.getElementById('description').value = event.results[0][0].transcript;
        document.getElementById('mic-btn').innerText = "🎤";
    };
    recognition.start();
}

// ==========================================
// 🧮 5. EMI & VYAJ CALCULATORS
// ==========================================
function calculateEMI() {
    const p = parseFloat(document.getElementById('emi-principal').value);
    const r = parseFloat(document.getElementById('emi-rate').value) / 12 / 100;
    const n = parseFloat(document.getElementById('emi-time').value);

    if (!p || !r || !n) return;
    const emi = (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    document.getElementById('emi-result').style.display = 'block';
    document.getElementById('emi-amount').innerText = `₹${Math.round(emi)}`;
}

function calculateVyaj() {
    const p = parseFloat(document.getElementById('vyaj-principal').value);
    const r = parseFloat(document.getElementById('vyaj-rate').value);
    const t = parseFloat(document.getElementById('vyaj-time').value);

    if (!p || !r || !t) return;
    const interest = (p * r * t) / 100;
    
    document.getElementById('vyaj-result').style.display = 'block';
    document.getElementById('vyaj-only').innerText = `₹${interest}`;
}

// ==========================================
// 📄 6. EXPORT & SHARE
// ==========================================
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Family Expense Report", 14, 15);
    
    const rows = allExpenses.map(e => [e.date, e.desc, e.member, e.category, e.amount]);
    doc.autoTable({ head: [['Date', 'Item', 'User', 'Cat', 'Amount']], body: rows, startY: 20 });
    doc.save("Family_Report.pdf");
}

function shareReport() {
    const total = document.getElementById('total-expense').innerText;
    const text = `Family Hisaab Report 💰\nIs mahine ka kharcha: ${total}\nApp link: family-super-app.web.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// Dark Mode Toggle
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-toggle').innerText = isDark ? '☀️' : '🌙';
}