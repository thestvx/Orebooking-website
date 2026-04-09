// --- Global State ---
const state = {
  lang: localStorage.getItem('ore_lang') || 'en',
  theme: localStorage.getItem('ore_theme') || 'light',
  favorites: []
};

// --- Consolidated Translations (Main + Auth + Footer) ---
const translations = {
  en: {
    // Main Page
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
    // Auth Modal
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
    has_account: "Already have an account?"
  },
  ar: {
    // Main Page
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
    // Auth Modal
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
    has_account: "لديك حساب بالفعل؟"
  }
};

// Mock Data
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

// --- DOM Elements ---
const langBtn = document.getElementById('lang-toggle');
const themeBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

// Modal Elements
const authModal = document.getElementById('auth-modal');
const openAuthBtn = document.getElementById('open-auth-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const goToRegisterBtn = document.getElementById('go-to-register');
const goToLoginBtn = document.getElementById('go-to-login');

// --- Initialization ---
function init() {
  applyInitialState();
  renderCategories();
  renderListings();
  
  // Toggles
  langBtn.addEventListener('click', toggleLanguage);
  themeBtn.addEventListener('click', toggleTheme);

  // Modal Events
  openAuthBtn.addEventListener('click', openModal);
  closeAuthBtn.addEventListener('click', closeModal);
  
  // Close modal when clicking outside the card
  authModal.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
  });

  // Form Switch Events
  goToRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  });

  goToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  });
}

// --- Modal Logic ---
function openModal() {
  authModal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeModal() {
  authModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  
  // Reset forms to login view after closing
  setTimeout(() => {
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  }, 300);
}

// --- Theme & Language Logic ---
function applyInitialState() {
  // Theme
  if (state.theme === 'dark') {
    document.body.classList.add('dark');
    themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove('dark');
    themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }
  
  // Language
  htmlEl.setAttribute('dir', state.lang === 'en' ? 'ltr' : 'rtl');
  htmlEl.setAttribute('lang', state.lang);
  langBtn.textContent = state.lang === 'en' ? 'العربية' : 'English';
  
  updateLanguageUI();
}

function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('ore_theme', state.theme);
  
  if (state.theme === 'dark') {
    document.body.classList.add('dark');
    themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove('dark');
    themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }
}

function toggleLanguage() {
  state.lang = state.lang === 'en' ? 'ar' : 'en';
  localStorage.setItem('ore_lang', state.lang);
  
  htmlEl.setAttribute('dir', state.lang === 'en' ? 'ltr' : 'rtl');
  htmlEl.setAttribute('lang', state.lang);
  
  langBtn.textContent = state.lang === 'en' ? 'العربية' : 'English';
  
  updateLanguageUI();
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

// --- Render Functions ---
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
      <div class="card">
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

// Run on load
document.addEventListener('DOMContentLoaded', init);
