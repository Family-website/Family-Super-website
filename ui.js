// ==========================================
// 🎨 4. APP UI, THEME, SOUND & INSTALL
// ==========================================
let isSoundEnabled = localStorage.getItem('appSound') !== 'false';
let isDarkMode = localStorage.getItem('darkMode') === 'true';
if(isDarkMode) document.body.classList.add('dark-mode');

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

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    if(typeof renderHistoryWithSkeleton === 'function' && categoryChartInstance) renderHistoryWithSkeleton(); 
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

function startVoice() {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)(); 
    recognition.lang = 'hi-IN'; const btn = document.getElementById('mic-btn'); btn.innerText = "🛑";
    recognition.onresult = (event) => { document.getElementById('description').value = event.results[0][0].transcript; btn.innerText = "🎤"; playSound('click'); };
    recognition.onerror = () => { btn.innerText = "🎤"; Swal.fire('Error', 'Awaz clear nahi aayi!', 'error'); }; recognition.start();
}

function openProfile() {
    const modal = document.getElementById('profile-modal'); if(!modal) return;
    if (typeof currentUser !== 'undefined' && currentUser) {
        let userName = currentUser.email.split("@")[0]; const NameFormatted = userName.charAt(0).toUpperCase() + userName.slice(1);
        document.getElementById('profile-name').innerText = NameFormatted; document.getElementById('profile-email').innerText = currentUser.email;
        const firstLetter = userName.charAt(0).toUpperCase(); document.getElementById('profile-avatar-large').innerText = firstLetter;
    }
    let totalExpAllTime = typeof familyExpenses !== 'undefined' ? familyExpenses.reduce((sum, item) => sum + item.amount, 0) : 0; 
    document.getElementById('profile-total-expense').innerText = `₹${totalExpAllTime}`;
    let totalDudhAllTime = typeof dudhRecords !== 'undefined' ? dudhRecords.reduce((sum, item) => sum + ((item.morning + item.evening) * item.rate), 0) : 0; 
    document.getElementById('profile-total-dudh').innerText = `₹${Math.round(totalDudhAllTime)}`;
    document.getElementById('profile-total-ration').innerText = typeof rationItems !== 'undefined' ? rationItems.length : 0;
    modal.style.display = 'flex'; playSound('click');
}

function closeProfile() { document.getElementById('profile-modal').style.display = 'none'; playSound('click'); }
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

// PWA Install System
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredPrompt = e; });

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') { Swal.fire('Mubarak Ho! 🎉', 'GharManager phone mein install ho gaya hai!', 'success'); }
            deferredPrompt = null;
        });
    } else {
        Swal.fire({ title: 'Install Kaise Karein?', text: 'Bhai, upar Right corner mein 3-dots (⋮) par click karo aur wahan se "Add to Home screen" daba do!', icon: 'info', confirmButtonText: 'Theek hai 👍' });
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => console.log('✅ Service Worker Active!')).catch(err => console.error('❌ Service Worker Error', err));
    });
}
