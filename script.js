// ==========================================
// 🔥 1. FIREBASE CONFIGURATION
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

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ==========================================
// 🌍 2. GLOBAL STATE & TRANSLATIONS
// ==========================================
const state = {
  lang: localStorage.getItem('ore_lang') || 'en',
  theme: localStorage.getItem('ore_theme') || 'light',
  favorites: [], // Will load from LocalStorage based on User ID
  user: null,
  currentView: 'home' // 'home' or 'favorites'
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
    my_favorites: "My Favorites",
    no_favorites: "You haven't saved any favorites yet.",
    back_home: "Back to Home",
    about_prop: "About this space",
    what_offers: "What this place offers",
    book_now: "Reserve Now",
    wont_charged: "You won't be charged yet"
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
    my_favorites: "مفضلتي",
    no_favorites: "لا توجد أي عقارات في مفضلتك بعد.",
    back_home: "العودة للرئيسية",
    about_prop: "حول هذا المكان",
    what_offers: "ماذا يوفر هذا المكان",
    book_now: "احجز الآن",
    wont_charged: "لن يتم خصم المبلغ الآن"
  }
};

// ==========================================
// 🏠 3. MOCK DATA (With PALM GARDEN)
// ==========================================
const properties = [
  { 
    id: 1, 
    title_en: "Camp Palm Garden Resort", 
    title_ar: "منتجع بالم قاردن", 
    location_en: "Hai Al-Sharqiya, Taghzout - El Oued", 
    location_ar: "حي الشرقية، تغزوت – دائرة قمار – ولاية الوادي", 
    price: 45, 
    rating: 4.95, 
    image: "images/palmgarden/01.jpg", 
    images: ["images/palmgarden/01.jpg", "images/palmgarden/02.jpg", "images/palmgarden/03.jpg", "images/palmgarden/04.jpg"],
    urgency: "hot", 
    desc_en: "Where to find peace and comfort as if you are away from the bustle... but without feeling like you are in the desert! At Palm Garden you will find comfortable rooms, a breakfast fit for royalty, green lawns, and a safe family space.", 
    desc_ar: "وين تلقى الهدوء والراحة وكأنك بعيد عن الصخب… لكن بلا ما تحس روحك في الصحراء! في بالم قاردن تلقى غرف مريحة، فطور صباحي يليق بالمقام، قازون أخضر يشرح الخاطر، وفضاء عائلي آمن ومناظر طبيعية تصحي العين.",
    features_ar: ["غرف فردية، ثنائية وعائلية", "فطور صباحي", "قازون أخضر", "فضاء عائلي آمن"],
    features_en: ["Single & Family Rooms", "Breakfast Included", "Green Lawn", "Safe Family Space"]
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
    images: ["https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80"],
    urgency: "few", 
    desc_en: "A perfect modern retreat in the heart of nature.", 
    desc_ar: "ملاذ عصري مثالي في قلب الطبيعة.",
    features_ar: ["غرفتين نوم", "مطبخ مجهز", "مدفأة حطب"],
    features_en: ["2 Bedrooms", "Equipped Kitchen", "Fireplace"]
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
    images: ["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80"],
    urgency: null, 
    desc_en: "Wake up to the sound of waves in this beautiful villa.", 
    desc_ar: "استيقظ على صوت الأمواج في هذه الفيلا الجميلة.",
    features_ar: ["إطلالة على البحر", "مسبح خاص", "واي فاي سريع"],
    features_en: ["Sea View", "Private Pool", "Fast WiFi"]
  }
];

const categories = [
  { icon: 'ph-buildings', label_en: 'Apartments', label_ar: 'شقق' },
  { icon: 'ph-house', label_en: 'Villas', label_ar: 'فلل' },
  { icon: 'ph-tree-evergreen', label_en: 'Resorts', label_ar: 'منتجعات' },
  { icon: 'ph-swimming-pool', label_en: 'Pools', label_ar: 'مسابح' },
];

// ==========================================
// ⚙️ 4. CORE INITIALIZATION
// ==========================================
const langBtn = document.getElementById('lang-toggle');
const themeBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

const authModal = document.getElementById('auth-modal');
const openAuthBtn = document.getElementById('open-auth-btn');
const closeAuthBtn = document.getElementById('close-auth-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const authMessage = document.getElementById('auth-message');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn = document.getElementById('logout-btn');
const myFavoritesBtn = document.getElementById('my-favorites-btn');
const homeLogoBtn = document.getElementById('home-logo-btn');

function init() {
  applyInitialState();
  
  // Render Index page elements if they exist
  if (document.getElementById('categories-container')) {
    renderCategories();
    renderListings();
  }

  // Render Property details page elements if we are on property.html
  renderPropertyDetails();
  
  if (langBtn) langBtn.addEventListener('click', toggleLanguage);
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  if (openAuthBtn) openAuthBtn.addEventListener('click', handleAuthButtonClick);
  
  // Navigate to Home when logo clicked
  if (homeLogoBtn) {
    homeLogoBtn.addEventListener('click', (e) => {
      // Only do this if we are on index.html
      if(document.getElementById('hero-section')) {
        e.preventDefault();
        state.currentView = 'home';
        document.getElementById('hero-section').style.display = 'block';
        document.getElementById('categories-container').style.display = 'flex';
        const sectionTitle = document.getElementById('section-main-title');
        if(sectionTitle) sectionTitle.setAttribute('data-i18n', 'trending');
        updateLanguageUI();
        renderListings();
      }
    });
  }

  // Show My Favorites
  if (myFavoritesBtn) {
    myFavoritesBtn.addEventListener('click', () => {
      profileDropdown.classList.remove('active');
      state.currentView = 'favorites';
      const hero = document.getElementById('hero-section');
      const cats = document.getElementById('categories-container');
      if(hero) hero.style.display = 'none';
      if(cats) cats.style.display = 'none';
      
      const sectionTitle = document.getElementById('section-main-title');
      if(sectionTitle) {
        sectionTitle.removeAttribute('data-i18n'); 
        sectionTitle.textContent = state.lang === 'en' ? 'My Favorites' : 'مفضلتي';
      }
      renderListings();
    });
  }
  
  window.addEventListener('click', (e) => {
    if (e.target === authModal) closeModal();
    if (profileDropdown && !e.target.closest('.profile-container')) {
      profileDropdown.classList.remove('active');
    }
  });

  if (closeAuthBtn) closeAuthBtn.addEventListener('click', closeModal);
  document.getElementById('go-to-register')?.addEventListener('click', (e) => { e.preventDefault(); switchForm('register'); });
  document.getElementById('go-to-login')?.addEventListener('click', (e) => { e.preventDefault(); switchForm('login'); });

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  document.getElementById('google-login-btn')?.addEventListener('click', handleGoogleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  // Listen to Firebase Auth
  auth.onAuthStateChanged((user) => {
    state.user = user;
    loadFavorites(); 
    updateUserUI();
  });
}

// ==========================================
// 🌍 5. THEME, LOGO & LANGUAGE LOGIC
// ==========================================
function updateLogo() {
  const mainLogo = document.getElementById('main-logo');
  const modalLogo = document.getElementById('modal-logo');
  const logoPath = state.theme === 'dark' ? 'logos/orebooking2.png' : 'logos/orebooking.png';
  if (mainLogo) mainLogo.src = logoPath;
  if (modalLogo) modalLogo.src = logoPath;
}

function applyInitialState() {
  if (state.theme === 'dark') {
    document.body.classList.add('dark');
    if (themeBtn) themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove('dark');
    if (themeBtn) themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }
  updateLogo();
  htmlEl.setAttribute('dir', state.lang === 'en' ? 'ltr' : 'rtl');
  htmlEl.setAttribute('lang', state.lang);
  if (langBtn) langBtn.textContent = state.lang === 'en' ? 'العربية' : 'English';
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
  if (document.getElementById('categories-container')) {
    renderCategories();
    renderListings();
  }
  renderPropertyDetails(); // Re-render details if we are on property page
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
// 📦 6. FAVORITES DATA MANAGEMENT
// ==========================================
function loadFavorites() {
  if (state.user) {
    const saved = localStorage.getItem(`ore_favs_${state.user.uid}`);
    if (saved) state.favorites = JSON.parse(saved);
    else state.favorites = [];
  } else {
    state.favorites = [];
  }
  if(document.getElementById('listings-grid')) renderListings();
}

function saveFavorites() {
  if (state.user) {
    localStorage.setItem(`ore_favs_${state.user.uid}`, JSON.stringify(state.favorites));
  }
}

function toggleFavorite(e, id) {
  e.stopPropagation(); 
  if (!state.user) {
    openModal();
    showMessage(state.lang === 'ar' ? 'الرجاء تسجيل الدخول أولاً' : 'Please log in first', 'error');
    return;
  }
  
  const index = state.favorites.indexOf(id);
  if (index > -1) state.favorites.splice(index, 1);
  else state.favorites.push(id);
  
  saveFavorites(); 
  renderListings(); 
}

function goToProperty(id) {
  window.location.href = `property.html?id=${id}`;
}

// ==========================================
// 🏠 7. RENDER LISTINGS (INDEX PAGE)
// ==========================================
function renderCategories() {
  const container = document.getElementById('categories-container');
  if(!container) return;
  container.innerHTML = categories.map((cat, index) => `
    <div class="category-item ${index === 0 ? 'active' : ''}">
      <i class="ph ${cat.icon}"></i>
      <span class="font-medium">${state.lang === 'en' ? cat.label_en : cat.label_ar}</span>
    </div>
  `).join('');
}

function renderListings() {
  const container = document.getElementById('listings-grid');
  if(!container) return;
  const dict = translations[state.lang];

  let itemsToShow = properties;
  if (state.currentView === 'favorites') {
    itemsToShow = properties.filter(p => state.favorites.includes(p.id));
    
    if (itemsToShow.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px;">
          <i class="ph ph-heart-break" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 16px;"></i>
          <p style="font-size: 1.1rem; color: var(--text-muted);">${state.lang === 'en' ? dict.no_favorites : dict.no_favorites}</p>
        </div>
      `;
      return;
    }
  }

  container.innerHTML = itemsToShow.map(prop => {
    const isFav = state.favorites.includes(prop.id);
    const title = state.lang === 'en' ? prop.title_en : prop.title_ar;
    const location = state.lang === 'en' ? prop.location_en : prop.location_ar;
    
    let urgencyHtml = '';
    if (prop.urgency) {
      const urgencyText = prop.urgency === 'few' ? dict.urgency_few : dict.urgency_hot;
      urgencyHtml = `<div class="urgency-label"><i class="ph-fill ph-fire"></i><span>${urgencyText}</span></div>`;
    }

    return `
      <div class="card" onclick="goToProperty(${prop.id})">
        <div class="card-img-wrapper">
          <img src="${prop.image}" alt="${title}" class="card-img">
          ${urgencyHtml}
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, ${prop.id})">
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
            <div class="card-price">$${prop.price} <span>/ ${dict.night}</span></div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 🏨 8. RENDER PROPERTY DETAILS (PROPERTY PAGE)
// ==========================================
function renderPropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propId = parseInt(urlParams.get('id'));
  
  if(!propId) return; // Not on property page or no ID

  const prop = properties.find(p => p.id === propId);
  if(!prop) return;

  const titleEl = document.getElementById('prop-title');
  const ratingEl = document.getElementById('prop-rating');
  const locationEl = document.getElementById('prop-location');
  const mainImgEl = document.getElementById('prop-main-img');
  const descEl = document.getElementById('prop-desc');
  const featuresEl = document.getElementById('prop-features');
  const priceEl = document.getElementById('prop-price');

  if(titleEl) titleEl.textContent = state.lang === 'en' ? prop.title_en : prop.title_ar;
  if(ratingEl) ratingEl.textContent = prop.rating;
  if(locationEl) locationEl.textContent = state.lang === 'en' ? prop.location_en : prop.location_ar;
  if(mainImgEl) mainImgEl.src = prop.image; 
  if(descEl) descEl.textContent = state.lang === 'en' ? prop.desc_en : prop.desc_ar;
  if(priceEl) priceEl.textContent = '$' + prop.price;

  if(featuresEl) {
    const features = state.lang === 'en' ? prop.features_en : prop.features_ar;
    if(features) {
      featuresEl.innerHTML = features.map(f => `<li><i class="ph-fill ph-check-circle"></i> ${f}</li>`).join('');
    }
  }
}

// ==========================================
// 🔐 9. FIREBASE AUTH LOGIC
// ==========================================
function showMessage(msg, type = 'error') {
  if(!authMessage) return;
  authMessage.textContent = msg;
  authMessage.className = `auth-message ${type}`;
  authMessage.style.display = 'block';
  setTimeout(() => { authMessage.style.display = 'none'; }, 5000);
}

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
    showMessage(state.lang === 'ar' ? 'البريد أو كلمة المرور غير صحيحة' : 'Invalid email or password', 'error');
  } finally {
    btn.innerHTML = `<span data-i18n="sign_in">${state.lang === 'en' ? 'Sign In' : 'تسجيل الدخول'}</span>`;
    btn.disabled = false;
  }
}

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
    await userCredential.user.updateProfile({ displayName: name });
    closeModal();
    registerForm.reset();
    updateUserUI();
  } catch (error) {
    showMessage(error.message, 'error');
  } finally {
    btn.innerHTML = `<span data-i18n="sign_up_btn">${state.lang === 'en' ? 'Create Account' : 'إنشاء الحساب'}</span>`;
    btn.disabled = false;
  }
}

async function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try { await auth.signInWithPopup(provider); closeModal(); } 
  catch (error) { showMessage(error.message, 'error'); }
}

function handleLogout() {
  auth.signOut().then(() => {
    profileDropdown.classList.remove('active');
    state.currentView = 'home'; 
    state.favorites = [];
    if(document.getElementById('listings-grid')) {
      document.getElementById('hero-section').style.display = 'block';
      document.getElementById('categories-container').style.display = 'flex';
      const sectionTitle = document.getElementById('section-main-title');
      if(sectionTitle) sectionTitle.setAttribute('data-i18n', 'trending');
      updateLanguageUI();
      renderListings();
    }
  });
}

function handleAuthButtonClick() {
  if (state.user) profileDropdown.classList.toggle('active');
  else openModal();
}

function updateUserUI() {
  if(!openAuthBtn) return;
  if (state.user) {
    let initial = state.user.displayName ? state.user.displayName.charAt(0).toUpperCase() : state.user.email.charAt(0).toUpperCase();
    openAuthBtn.innerHTML = `<span class="font-bold">${initial}</span>`;
    openAuthBtn.style.backgroundColor = 'var(--accent)';
    if(document.getElementById('dropdown-user-name')){
        document.getElementById('dropdown-user-name').textContent = state.user.displayName || 'OreBooking User';
        document.getElementById('dropdown-user-email').textContent = state.user.email || '';
    }
  } else {
    openAuthBtn.innerHTML = `<i class="ph ph-user"></i>`;
    openAuthBtn.style.backgroundColor = 'var(--primary)';
    if(profileDropdown) profileDropdown.classList.remove('active');
  }
}

function openModal() {
  authModal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeModal() {
  authModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  if(authMessage) authMessage.style.display = 'none';
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

document.addEventListener('DOMContentLoaded', init);
