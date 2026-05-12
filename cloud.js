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

// Global Data Variables
let familyExpenses = []; 
let dudhRecords = []; 
let rationItems = []; 
let budgetLimit = 20000;

function loadCloudData(uid) {
    try {
        const docRef = db.collection('familyData').doc(uid);
        docRef.onSnapshot((doc) => {
            if (doc.exists) {
                const data = doc.data(); 
                familyExpenses = data.expenses || []; 
                dudhRecords = data.dudh || []; 
                rationItems = data.ration || []; 
                budgetLimit = data.budget || 20000;
                
                updateHisabUI(); updateDudhUI(); updateRationUI();
            } else { 
                updateHisabUI(); 
            }
        }, (error) => { console.error("Cloud fetch failed:", error); });
    } catch (error) { console.error("Cloud fetch exception:", error); }
}

async function saveToCloud() {
    if(!currentUser) return;
    try { 
        await db.collection('familyData').doc(currentUser.uid).set({ expenses: familyExpenses, dudh: dudhRecords, ration: rationItems, budget: budgetLimit }, { merge: true }); 
    } catch (error) { console.error("Cloud save failed:", error); }
}

async function syncOldLocalData() {
    try {
        const localExp = JSON.parse(localStorage.getItem('familyExpenses')); 
        const localDudh = JSON.parse(localStorage.getItem('dudhRecords')); 
        const localRation = JSON.parse(localStorage.getItem('rationItems'));
        let dataChanged = false;
        
        if (localExp && localExp.length > 0 && familyExpenses.length === 0) { familyExpenses = localExp; dataChanged = true; }
        if (localDudh && localDudh.length > 0 && dudhRecords.length === 0) { dudhRecords = localDudh; dataChanged = true; }
        if (localRation && localRation.length > 0 && rationItems.length === 0) { rationItems = localRation; dataChanged = true; }
        
        if (dataChanged) { 
            await saveToCloud(); 
            localStorage.removeItem('familyExpenses'); 
            localStorage.removeItem('dudhRecords'); 
            localStorage.removeItem('rationItems'); 
        }
    } catch(e) { console.log("Error syncing local data:", e); }

