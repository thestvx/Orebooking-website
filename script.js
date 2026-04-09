// ==========================================
// 🔥 1. YOUR REAL FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCA5iauXrIhozRw8MD7JTOLyeQ2v0GGncA",
  authDomain: "orebooking-website.firebaseapp.com",
  projectId: "orebooking-website",
  storageBucket: "orebooking-website.firebasestorage.app",
  messagingSenderId: "1012887567747",
  appId: "1:1012887567747:web:153b57b60cb143d88acab6",
  measurementId: "G-5GKMRMVHC3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ==========================================
// 🌍 2. GLOBAL STATE & TRANSLATIONS
// ==========================================
const state = {
  lang: localStorage.getItem('ore_lang') || 'en',
  theme: localStorage.getItem('ore_theme') || 'light',
  favorites: [],
  user: null // Stores logged-in user data
};

const translations = {
  en: {
    hero_title: "Find your next perfect stay",
    hero_subtitle: "Discover premium apartments, villas, and unique homes around the world.",
    location: "Location",
    location_placeholder: "Where are you going?",
    dates: "Dates",
    dates_placeholder: "Add dates",
    guests: "Guests",
    guests_placeholder: "Add guests",
    search: "Search",
    trending: "Trending Destinations",
    pts: "Pts",
    night: "night",
    urgency_few: "Only 2 rooms left",
    urgency_hot: "Booked 5 times today",
    developed_by: "Developed by:",
    welcome_back: "Welcome back",
    login_desc: "Enter your details to access your account.",
    email: "Email Address",
    password: "Password",
    remember_me: "Remember me",
    forgot_pass: "Forgot password?",
    sign_in: "Sign In",
    or_continue: "or continue with",
    no_account: "Don't have an account?",
    sign_up: "Sign up",
    create_account: "Create an account",
    register_desc: "Join OreBooking to unlock premium features.",
    full_name: "Full Name",
    sign_up_btn: "Create Account",
    has_account: "Already have an account?",
    logout: "Log Out",
    my_favorites: "My Favorites"
  },
  ar: {
    hero_title: "اكتشف إقامتك المثالية القادمة",
    hero_subtitle: "اكتشف شققاً فاخرة، فلل، ومنازل فريدة حول العالم.",
    location: "الموقع",
    location_placeholder: "إلى أين ستذهب؟",
    dates: "التواريخ",
    dates_placeholder: "أضف التواريخ",
    guests: "الضيوف",
    guests_placeholder: "أضف الضيوف",
    search: "بحث",
    trending: "الوجهات الشائعة",
    pts: "نقطة",
    night: "ليلة",
    urgency_few: "بقي غرفتان فقط",
    urgency_hot: "تم حجزه 5 مرات اليوم",
    developed_by: "تم تطوير هذا الموقع من قبل:",
    welcome_back: "مرحباً بعودتك",
    login_desc: "أدخل بياناتك للوصول إلى حسابك.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    remember_me: "تذكرني",
    forgot_pass: "نسيت كلمة المرور؟",
    sign_in: "تسجيل الدخول",
    or_continue: "أو المتابعة باستخدام",
    no_account: "ليس لديك حساب؟",
    sign_up: "إنشاء حساب",
    create_account: "إنشاء حساب جديد",
    register_desc: "انضم إلى OreBooking لفتح ميزات حصرية.",
    full_name: "الاسم الكامل",
    sign_up_btn: "إنشاء الحساب",
    has_account: "لديك حساب بالفعل؟",
    logout: "تسجيل الخروج",
    my_favorites: "مفضلتي"
  }
};

// ==========================================
// 🏠 3. MOCK DATA
// ==========================================
const properties = [
  { 
    id: 1, 
    title_en: "Luxury Skyline Penthouse", 
    title_ar: "بنتهاوس فاخر بإطلالة بانورامية", 
    location_en: "Dubai, UAE", 
    location_ar: "دبي، الإمارات", 
    price: 450, 
    rating: 4.96, 
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80", 
    urgency: "few" 
  },
  { 
    id: 2, 
    title_en: "Modern Forest Cabin", 
    title_ar: "كوخ عصري في الغابة", 
    location_en: "Aspen, Colorado", 
    location_ar: "أسبن، كولورادو", 
    price: 280, 
    rating: 4.85, 
    image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80", 
    urgency: "hot" 
  },
  { 
    id: 3, 
    title_en: "Minimalist Beach Villa", 
    title_ar: "فيلا شاطئية بتصميم بسيط", 
    location_en: "Bali, Indonesia", 
    location_ar: "بالي، إندونيسيا", 
    price: 320, 
    rating: 4.92, 
    image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80", 
    urgency: null 
  }
];

const categories = [
  { icon: 'ph-buildings', label_en: 'Apartments', label_ar: 'شقق' },
  { icon: 'ph-house', label_en: 'Villas', label_ar: 'فلل' },
  { icon: 'ph-tree-evergreen', label_en: 'Cabins', label_ar: 'أكواخ' },
  { icon: 'ph-swimming-pool', label_en: 'Pools', label_ar: 'مسابح' },
];

// ==========================================
// ⚙️ 4. CORE INITIALIZATION
// ==========================================
const langBtn = document.getElementById('lang-toggle');
const themeBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

// Auth Modal & Dropdown DOM Elements
const authModal = document.getElementById('auth-modal');
const openAuthBtn = document.getElementById('open-auth-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const goToRegisterBtn = document.getElementById('go-to-register');
const goToLoginBtn = document.getElementById('go-to-login');
const authMessage = document.getElementById('auth-message');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');

function init() {
  applyInitialState();
  renderCategories();
  renderListings();
  
  // Theme & Language
  langBtn.addEventListener('click', toggleLanguage);
  themeBtn.addEventListener('click', toggleTheme);

  // Profile Menu Click
  openAuthBtn.addEventListener('click', handleAuthButtonClick);
  
  // Close Modals & Dropdowns on outside click
  window.addEventListener('click', (e) => {
    if (e.target === authModal) {
        closeModal();
    }
    // Close dropdown if clicking outside of profile container
    if (!e.target.closest('.profile-container')) {
      profileDropdown.classList.remove('active');
    }
  });

  closeAuthBtn.addEventListener('click', closeModal);
  
  // Switch Forms
  goToRegisterBtn.addEventListener('click', (e) => { 
      e.preventDefault(); 
      switchForm('register'); 
  });
  
  goToLoginBtn.addEventListener('click', (e) => { 
      e.preventDefault(); 
      switchForm('login'); 
  });

  // Form Submissions
  loginForm.addEventListener('submit', handleLogin);
  registerForm.addEventListener('submit', handleRegister);
  
  // Google Login & Log Out
  document.getElementById('google-login-btn').addEventListener('click', handleGoogleLogin);
  logoutBtn.addEventListener('click', handleLogout);

  // Listen to Firebase Auth State Changes
  auth.onAuthStateChanged((user) => {
    state.user = user;
    updateUserUI();
  });
}

// ==========================================
// 🔐 5. FIREBASE AUTHENTICATION LOGIC
// ==========================================

function showMessage(msg, type = 'error') {
  authMessage.textContent = msg;
  authMessage.className = `auth-message ${type}`;
  authMessage.style.display = 'block';
  
  setTimeout(() => { 
      authMessage.style.display = 'none'; 
  }, 5000);
}

// Email/Password Login
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = loginForm.querySelector('button');
  
  btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i>`;
  btn.disabled = true;

  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeModal();
    loginForm.reset();
  } catch (error) {
    console.error(error);
    const msg = state.lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.';
    showMessage(msg, 'error');
  } finally {
    btn.innerHTML = `<span data-i18n="sign_in">${state.lang === 'en' ? 'Sign In' : 'تسجيل الدخول'}</span>`;
    btn.disabled = false;
  }
}

// Email/Password Registration
async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const btn = registerForm.querySelector('button');

  btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i>`;
  btn.disabled = true;

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    // Update profile with name
    await userCredential.user.updateProfile({ displayName: name });
    
    closeModal();
    registerForm.reset();
    
    // Force UI update to show the new name in the dropdown
    updateUserUI();
  } catch (error) {
    console.error(error);
    const msg = state.lang === 'ar' ? 'حدث خطأ أثناء التسجيل، ربما البريد مستخدم مسبقاً.' : error.message;
    showMessage(msg, 'error');
  } finally {
    btn.innerHTML = `<span data-i18n="sign_up_btn">${state.lang === 'en' ? 'Create Account' : 'إنشاء الحساب'}</span>`;
    btn.disabled = false;
  }
}

// Google Login
async function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await auth.signInWithPopup(provider);
    closeModal();
  } catch (error) {
    console.error(error);
    showMessage(error.message, 'error');
  }
}

// Log Out function
function handleLogout() {
    auth.signOut().then(() => {
        profileDropdown.classList.remove('active');
        state.favorites = []; // Clear favorites from UI on logout
        renderListings();
    }).catch((error) => {
        console.error("Logout Error:", error);
    });
}

// Handle clicking the top-right user icon
function handleAuthButtonClick() {
  if (state.user) {
    // If logged in, toggle dropdown visibility
    profileDropdown.classList.toggle('active');
  } else {
    // If not logged in, open the Auth Modal
    openModal();
  }
}

// Update UI based on Auth State (Dropdown & Icon)
function updateUserUI() {
  if (state.user) {
    // 1. Update Profile Button Icon (Show Initial of Name or Email)
    let initial = 'U';
    if (state.user.displayName) {
        initial = state.user.displayName.charAt(0).toUpperCase();
    } else if (state.user.email) {
        initial = state.user.email.charAt(0).toUpperCase();
    }
    
    openAuthBtn.innerHTML = `<span class="font-bold">${initial}</span>`;
    openAuthBtn.style.backgroundColor = 'var(--accent)';
    
    // 2. Update Dropdown Header Data
    document.getElementById('dropdown-user-name').textContent = state.user.displayName || 'OreBooking User';
    document.getElementById('dropdown-user-email').textContent = state.user.email || '';
    
  } else {
    // Reset to default user icon
    openAuthBtn.innerHTML = `<i class="ph ph-user"></i>`;
    openAuthBtn.style.backgroundColor = 'var(--primary)';
    profileDropdown.classList.remove('active'); // Hide dropdown
  }
}

// ==========================================
// 🎨 6. UI & MODAL LOGIC
// ==========================================
function openModal() {
  authModal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeModal() {
  authModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  authMessage.style.display = 'none';
  
  // Reset back to Login form after modal closes
  setTimeout(() => switchForm('login'), 300);
}

function switchForm(type) {
  if (type === 'register') {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  } else {
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  }
}

// ==========================================
// 🌍 7. THEME & LANGUAGE LOGIC
// ==========================================
function applyInitialState() {
  if (state.theme === 'dark') {
    document.body.classList.add('dark');
    themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove('dark');
    themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }
  
  htmlEl.setAttribute('dir', state.lang === 'en' ? 'ltr' : 'rtl');
  htmlEl.setAttribute('lang', state.lang);
  langBtn.textContent = state.lang === 'en' ? 'العربية' : 'English';
  
  updateLanguageUI();
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('ore_theme', state.theme);
  applyInitialState();
}

function toggleLanguage() {
  state.lang = state.lang === 'en' ? 'ar' : 'en';
  localStorage.setItem('ore_lang', state.lang);
  applyInitialState();
  renderCategories();
  renderListings();
}

function updateLanguageUI() {
  const dict = translations[state.lang];
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
}

// ==========================================
// 📦 8. RENDER LISTINGS & CATEGORIES
// ==========================================
function renderCategories() {
  const container = document.getElementById('categories-container');
  container.innerHTML = categories.map((cat, index) => `
    <div class="category-item ${index === 0 ? 'active' : ''}">
      <i class="ph ${cat.icon}"></i>
      <span class="font-medium">${state.lang === 'en' ? cat.label_en : cat.label_ar}</span>
    </div>
  `).join('');
}

function toggleFavorite(id) {
  // Prevent favoriting if the user is not logged in
  if (!state.user) {
    openModal();
    const errorMsg = state.lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً لإضافة العقار للمفضلة' : 'Please log in first to save favorites';
    showMessage(errorMsg, 'error');
    return;
  }
  
  const index = state.favorites.indexOf(id);
  if (index > -1) {
      state.favorites.splice(index, 1);
  } else {
      state.favorites.push(id);
  }
  renderListings(); 
}

function renderListings() {
  const container = document.getElementById('listings-grid');
  const dict = translations[state.lang];

  container.innerHTML = properties.map(prop => {
    const isFav = state.favorites.includes(prop.id);
    const title = state.lang === 'en' ? prop.title_en : prop.title_ar;
    const location = state.lang === 'en' ? prop.location_en : prop.location_ar;
    
    let urgencyHtml = '';
    if (prop.urgency) {
      const urgencyText = prop.urgency === 'few' ? dict.urgency_few : dict.urgency_hot;
      urgencyHtml = `
        <div class="urgency-label">
          <i class="ph-fill ph-fire"></i>
          <span>${urgencyText}</span>
        </div>
      `;
    }

    return `
      <div class="card" onclick="alert('Navigating to property ${prop.id}')">
        <div class="card-img-wrapper">
          <img src="${prop.image}" alt="${title}" class="card-img">
          ${urgencyHtml}
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); toggleFavorite(${prop.id})">
            <i class="${isFav ? 'ph-fill' : 'ph'} ph-heart"></i>
          </button>
        </div>
        <div class="card-content">
          <div class="card-header">
            <div>
              <h3 class="card-title font-bold">${title}</h3>
              <p class="card-location">${location}</p>
            </div>
            <div class="card-rating">
              <i class="ph-fill ph-star"></i>
              <span>${prop.rating}</span>
            </div>
          </div>
          <div class="card-footer">
            <div class="card-price">
              $${prop.price} <span>/ ${dict.night}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 🚀 9. INIT APP ON LOAD
// ==========================================
document.addEventListener('DOMContentLoaded', init);
