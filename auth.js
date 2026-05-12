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
        if(loginStatus) loginStatus.style.display = 'none'; 
        Swal.fire('Login Error', 'Email ya password galat hai!', 'error');
    });
}

function registerWithEmail() {
    const email = document.getElementById('email-input').value.trim();
    const password = document.getElementById('password-input').value.trim();
    if (!email || password.length < 6) return Swal.fire('Oops!', 'Naya account banane ke liye details daalein.', 'warning');
    if(loginStatus) { loginStatus.style.display = 'block'; loginStatus.innerText = "Naya account bana rahe hain... ⏳"; }
    
    auth.createUserWithEmailAndPassword(email, password).then(() => { 
        Swal.fire('Mubarak ho!', 'Aapka naya account ban gaya hai!', 'success');
    }).catch((error) => {
        if(loginStatus) loginStatus.style.display = 'none'; 
        Swal.fire('Error', 'Account nahi ban paaya. ' + error.message, 'error');
    });
}

function logout() {
    Swal.fire({ 
        title: 'Logout?', text: "Kya aap sach mein logout karna chahte hain?", icon: 'warning', 
        showCancelButton: true, confirmButtonColor: '#e74c3c', confirmButtonText: 'Yes, Logout' 
    }).then((result) => {
        if (result.isConfirmed) { 
            auth.signOut(); 
            document.getElementById('email-input').value = ""; 
            document.getElementById('password-input').value = ""; 
        }
    });
}


