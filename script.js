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

// تأكد من عدم التكرار في حال تحميل الملف مرتين
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db   = firebase.firestore();

// ==========================================
// 🌍 2. GLOBAL STATE & TRANSLATIONS
// ==========================================
const state = {
  lang: localStorage.getItem('ore_lang') || 'en',
  theme: localStorage.getItem('ore_theme') || 'light',
  favorites: [],
  user: null,
  currentView: 'home',
  currentImageIndex: 0,
  liveProperties: []
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
    wont_charged: "You won't be charged yet",
    loading: "Loading properties...",
    no_props: "No properties available yet.",
    location_on_map: "Location on Map",
    no_results: "No results found"
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
    wont_charged: "لن يتم خصم المبلغ الآن",
    loading: "جارٍ تحميل العقارات...",
    no_props: "لا توجد عقارات متاحة بعد.",
    location_on_map: "الموقع على الخريطة",
    no_results: "لا توجد نتائج مطابقة"
  }
};

// ==========================================
// 🏠 3. STATIC MOCK DATA & WILAYAS
// ==========================================
const properties = [
  {
    id: "1",
    title_en: "Camp Palm Garden Resort",
    title_ar: "منتجع بالم قاردن",
    location_en: "Hai Al-Sharqiya, Taghzout - El Oued",
    location_ar: "حي الشرقية، تغزوت – دائرة قمار",
    price: 9500,
    rating: 4.95,
    image: "images/palmgarden/01.jpg",
    images: [
      "images/palmgarden/01.jpg","images/palmgarden/02.jpg",
      "images/palmgarden/03.jpg","images/palmgarden/04.jpg"
    ],
    urgency: "hot",
    desc_en: "Where to find peace and comfort as if you are away from the bustle... but without feeling like you are in the desert! At Palm Garden you will find comfortable rooms, a breakfast fit for royalty, green lawns, and a safe family space.",
    desc_ar: "وين تلقى الهدوء والراحة وكأنك بعيد عن الصخب… لكن بلا ما تحس روحك في الصحراء! في بالم قاردن تلقى غرف مريحة، فطور صباحي يليق بالمقام، قازون أخضر يشرح الخاطر، وفضاء عائلي آمن.",
    features_ar: ["غرف فردية، ثنائية وعائلية","فطور صباحي","قازون أخضر","فضاء عائلي آمن"],
    features_en: ["Single & Family Rooms","Breakfast Included","Green Lawn","Safe Family Space"],
    lat: null,
    lng: null
  },
  {
    id: "2",
    title_en: "Modern Forest Cabin",
    title_ar: "كوخ عصري في الغابة",
    location_en: "Aspen, Colorado",
    location_ar: "أسبن، كولورادو",
    price: 45000,
    rating: 4.85,
    image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
    images: ["https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80"],
    urgency: "few",
    desc_en: "A perfect modern retreat in the heart of nature.",
    desc_ar: "ملاذ عصري مثالي في قلب الطبيعة.",
    features_ar: ["غرفتين نوم","مطبخ مجهز","مدفأة حطب"],
    features_en: ["2 Bedrooms","Equipped Kitchen","Fireplace"],
    lat: null,
    lng: null
  }
];

const categories = [
  { icon: 'ph-buildings',      label_en: 'Apartments', label_ar: 'شقق' },
  { icon: 'ph-house',          label_en: 'Villas',     label_ar: 'فلل' },
  { icon: 'ph-tree-evergreen', label_en: 'Resorts',    label_ar: 'منتجعات' },
  { icon: 'ph-swimming-pool',  label_en: 'Pools',      label_ar: 'مسابح' },
];

const algerianWilayas = [
  { id: 1, ar: "أدرار", en: "Adrar" }, { id: 2, ar: "الشلف", en: "Chlef" },
  { id: 3, ar: "الأغواط", en: "Laghouat" }, { id: 4, ar: "أم البواقي", en: "Oum El Bouaghi" },
  { id: 5, ar: "باتنة", en: "Batna" }, { id: 6, ar: "بجاية", en: "Béjaïa" },
  { id: 7, ar: "بسكرة", en: "Biskra" }, { id: 8, ar: "بشار", en: "Béchar" },
  { id: 9, ar: "البليدة", en: "Blida" }, { id: 10, ar: "البويرة", en: "Bouira" },
  { id: 11, ar: "تمنراست", en: "Tamanrasset" }, { id: 12, ar: "تبسة", en: "Tébessa" },
  { id: 13, ar: "تلمسان", en: "Tlemcen" }, { id: 14, ar: "تيارت", en: "Tiaret" },
  { id: 15, ar: "تيزي وزو", en: "Tizi Ouzou" }, { id: 16, ar: "الجزائر", en: "Algiers" },
  { id: 17, ar: "الجلفة", en: "Djelfa" }, { id: 18, ar: "جيجل", en: "Jijel" },
  { id: 19, ar: "سطيف", en: "Sétif" }, { id: 20, ar: "سعيدة", en: "Saïda" },
  { id: 21, ar: "سكيكدة", en: "Skikda" }, { id: 22, ar: "سيدي بلعباس", en: "Sidi Bel Abbès" },
  { id: 23, ar: "عنابة", en: "Annaba" }, { id: 24, ar: "قالمة", en: "Guelma" },
  { id: 25, ar: "قسنطينة", en: "Constantine" }, { id: 26, ar: "المدية", en: "Médéa" },
  { id: 27, ar: "مستغانم", en: "Mostaganem" }, { id: 28, ar: "المسيلة", en: "M'Sila" },
  { id: 29, ar: "معسكر", en: "Mascara" }, { id: 30, ar: "ورقلة", en: "Ouargla" },
  { id: 31, ar: "وهران", en: "Oran" }, { id: 32, ar: "البيض", en: "El Bayadh" },
  { id: 33, ar: "إليزي", en: "Illizi" }, { id: 34, ar: "برج بوعريريج", en: "Bordj Bou Arréridj" },
  { id: 35, ar: "بومرداس", en: "Boumerdès" }, { id: 36, ar: "الطارف", en: "El Tarf" },
  { id: 37, ar: "تندوف", en: "Tindouf" }, { id: 38, ar: "تيسمسيلت", en: "Tissemsilt" },
  { id: 39, ar: "الوادي", en: "El Oued" }, { id: 40, ar: "خنشلة", en: "Khenchela" },
  { id: 41, ar: "سوق أهراس", en: "Souk Ahras" }, { id: 42, ar: "تيبازة", en: "Tipaza" },
  { id: 43, ar: "ميلة", en: "Mila" }, { id: 44, ar: "عين الدفلى", en: "Aïn Defla" },
  { id: 45, ar: "النعامة", en: "Naâma" }, { id: 46, ar: "عين تموشنت", en: "Aïn Témouchent" },
  { id: 47, ar: "غرداية", en: "Ghardaïa" }, { id: 48, ar: "غليزان", en: "Relizane" },
  { id: 49, ar: "تيميمون", en: "Timimoun" }, { id: 50, ar: "برج باجي مختار", en: "Bordj Badji Mokhtar" },
  { id: 51, ar: "أولاد جلال", en: "Ouled Djellal" }, { id: 52, ar: "بني عباس", en: "Béni Abbès" },
  { id: 53, ar: "إن صالح", en: "In Salah" }, { id: 54, ar: "إن قزام", en: "In Guezzam" },
  { id: 55, ar: "تقرت", en: "Touggourt" }, { id: 56, ar: "جانت", en: "Djanet" },
  { id: 57, ar: "المغير", en: "El M'Ghair" }, { id: 58, ar: "المنيعة", en: "El Meniaa" }
];

// ==========================================
// ⚙️ 4. CORE INITIALIZATION
// ==========================================
const langBtn         = document.getElementById('lang-toggle');
const themeBtn        = document.getElementById('theme-toggle');
const htmlEl          = document.documentElement;
const authModal       = document.getElementById('auth-modal');
const openAuthBtn     = document.getElementById('open-auth-btn');
const closeAuthBtn    = document.getElementById('close-auth-btn');
const loginForm       = document.getElementById('login-form');
const registerForm    = document.getElementById('register-form');
const authMessage     = document.getElementById('auth-message');
const profileDropdown = document.getElementById('profile-dropdown');
const logoutBtn       = document.getElementById('logout-btn');
const myFavoritesBtn  = document.getElementById('my-favorites-btn');
const homeLogoBtn     = document.getElementById('home-logo-btn');

function init() {
  applyInitialState();

  if (document.getElementById('categories-container')) {
    renderCategories();
    loadPropertiesFromFirestore();
    initSmartSearch(); // تفعيل البحث الذكي
  }

  renderPropertyDetails();

  if (langBtn)    langBtn.addEventListener('click', toggleLanguage);
  if (themeBtn)   themeBtn.addEventListener('click', toggleTheme);
  if (openAuthBtn) openAuthBtn.addEventListener('click', handleAuthButtonClick);

  if (homeLogoBtn) {
    homeLogoBtn.addEventListener('click', (e) => {
      if (document.getElementById('hero-section')) {
        e.preventDefault();
        state.currentView = 'home';
        document.getElementById('hero-section').style.display = 'block';
        document.getElementById('categories-container').style.display = 'flex';
        const sectionTitle = document.getElementById('section-main-title');
        if (sectionTitle) sectionTitle.setAttribute('data-i18n', 'trending');
        updateLanguageUI();
        renderListings();
      }
    });
  }

  if (myFavoritesBtn) {
    myFavoritesBtn.addEventListener('click', () => {
      if (profileDropdown) profileDropdown.classList.remove('active');
      state.currentView = 'favorites';
      const hero = document.getElementById('hero-section');
      const cats = document.getElementById('categories-container');
      if (hero) hero.style.display = 'none';
      if (cats) cats.style.display = 'none';
      const sectionTitle = document.getElementById('section-main-title');
      if (sectionTitle) {
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
  document.getElementById('go-to-login')?.addEventListener('click',    (e) => { e.preventDefault(); switchForm('login');    });
  if (loginForm)    loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  document.getElementById('google-login-btn')?.addEventListener('click', handleGoogleLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  auth.onAuthStateChanged((user) => {
    state.user = user;
    loadFavorites();
    updateUserUI();
  });
}

// ==========================================
// 🔍 4.5. SMART SEARCH WITH WILAYAS
// ==========================================
function initSmartSearch() {
  const searchInput = document.querySelector('.search-field input[type="text"]');
  const searchDropdown = document.querySelector('.search-dropdown');
  const searchBtn = document.querySelector('.search-btn');

  if (!searchInput || !searchDropdown) return;

  const renderWilayas = (wilayas) => {
    let html = '';
    
    // إضافة خيار "الكل" في بداية القائمة دائماً
    html += `
      <div class="search-item" onclick="selectWilaya('', '')" style="border-bottom: 1px solid var(--border-color);">
        <div class="search-icon-box" style="color: var(--text-main);"><i class="ph ph-globe-hemisphere-west"></i></div>
        <div class="search-item-info">
          <span class="search-item-title">${state.lang === 'en' ? 'All Wilayas' : 'كل الولايات'}</span>
          <span class="search-item-sub">${state.lang === 'en' ? 'Show all properties' : 'عرض جميع العقارات'}</span>
        </div>
      </div>
    `;

    if (wilayas.length > 0) {
      html += wilayas.map(w => `
        <div class="search-item" onclick="selectWilaya('${w.ar}', '${w.en}')">
          <div class="search-icon-box"><i class="ph ph-map-pin"></i></div>
          <div class="search-item-info">
            <span class="search-item-title">${state.lang === 'en' ? w.en : w.ar}</span>
            <span class="search-item-sub">${state.lang === 'en' ? 'Algeria' : 'الجزائر'} - ${w.id}</span>
          </div>
        </div>
      `).join('');
    } else {
      html += `
        <div class="no-results">
          <i class="ph ph-magnifying-glass"></i>
          <span>${translations[state.lang].no_results}</span>
        </div>
      `;
    }
    
    searchDropdown.innerHTML = html;
    searchDropdown.classList.add('active');
  };

  // إظهار القائمة كاملة عند النقر أو التركيز على الحقل
  searchInput.addEventListener('focus', () => renderWilayas(algerianWilayas));
  searchInput.addEventListener('click', () => renderWilayas(algerianWilayas));

  // الفلترة عند الكتابة
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (!val) {
      renderWilayas(algerianWilayas);
      return;
    }

    const filtered = algerianWilayas.filter(w =>
      (w.ar && w.ar.includes(val)) || 
      (w.en && w.en.toLowerCase().includes(val)) || 
      String(w.id) === val
    );
    renderWilayas(filtered);
  });

  // إغلاق القائمة عند النقر خارجها
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper') && !e.target.closest('.search-bar')) {
      searchDropdown.classList.remove('active');
    }
  });

  // الدالة التي يتم استدعاؤها عند اختيار ولاية من القائمة
  window.selectWilaya = function(arName, enName) {
    searchDropdown.classList.remove('active');

    // إذا اختار "الكل"، نفرغ الحقل ونعرض كل العقارات
    if (!arName && !enName) {
      searchInput.value = '';
      renderListings();
      document.getElementById('listings-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // تعيين الاسم المختار في الحقل حسب لغة الموقع
    searchInput.value = state.lang === 'en' ? enName : arName;
    
    // فلترة العقارات لتطابق الولاية المختارة فقط
    filterAndRender(enName, arName);
  };

  // وظيفة زر البحث الأساسي
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      searchDropdown.classList.remove('active');
      const val = searchInput.value.toLowerCase().trim();
      
      if (val) {
        const filteredGrid = state.liveProperties.filter(p =>
          (p.title_en && p.title_en.toLowerCase().includes(val)) ||
          (p.title_ar && p.title_ar.includes(val)) ||
          (p.location_en && p.location_en.toLowerCase().includes(val)) ||
          (p.location_ar && p.location_ar.includes(val))
        );
        renderListings(filteredGrid);
      } else {
        renderListings();
      }
      document.getElementById('listings-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // دالة مساعدة لتصفية العقارات وعرضها بناءً على الولاية
  function filterAndRender(enName, arName) {
    const enLower = enName ? enName.toLowerCase() : "";
    const arLower = arName || "";
    
    const filteredGrid = state.liveProperties.filter(p => {
      return (p.location_en && p.location_en.toLowerCase().includes(enLower)) ||
             (p.location_ar && p.location_ar.includes(arLower));
    });
    renderListings(filteredGrid);
    document.getElementById('listings-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ==========================================
// 🔥 5. جلب العقارات من Firestore
// ==========================================
async function loadPropertiesFromFirestore() {
  const container = document.getElementById('listings-grid');
  if (!container) return;

  const dict = translations[state.lang];

  container.innerHTML = `
    <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted);">
      <i class="ph ph-circle-notch spin" style="font-size:2.5rem; display:block; margin-bottom:16px;"></i>
      ${dict.loading}
    </div>
  `;

  try {
    const snapshot = await db.collection('properties')
      .where('visible', '==', true)
      .get();

    if (!snapshot.empty) {
      state.liveProperties = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id:          String(doc.id),
          title_en:    d.titleEn    || d.title_en    || '',
          title_ar:    d.titleAr    || d.title_ar    || '',
          location_en: d.locationEn || d.location_en || '',
          location_ar: d.locationAr || d.location_ar || '',
          price:       d.price      || 0,
          rating:      d.rating     || 4.80,
          image:       d.imageUrl   || d.image       || '',
          images:      Array.isArray(d.images) && d.images.length > 0 ? d.images : [d.imageUrl || d.image || ''],
          urgency:     d.urgency    || null,
          desc_en:     d.descEn     || d.desc_en     || '',
          desc_ar:     d.descAr     || d.desc_ar     || '',
          features_en: Array.isArray(d.featuresEn || d.features_en) ? (d.featuresEn || d.features_en) : [],
          features_ar: Array.isArray(d.featuresAr || d.features_ar) ? (d.featuresAr || d.features_ar) : [],
          lat:         d.lat        || null,
          lng:         d.lng        || null,
        };
      });
    } else {
      state.liveProperties = properties;
    }
  } catch (err) {
    console.error('Firestore error:', err);
    state.liveProperties = properties;
  }

  renderListings();
}

// ==========================================
// 🌍 6. THEME, LOGO & LANGUAGE
// ==========================================
function updateLogo() {
  const mainLogo  = document.getElementById('main-logo');
  const modalLogo = document.getElementById('modal-logo');
  const logoPath  = state.theme === 'dark' ? 'logos/orebooking2.png' : 'logos/orebooking.png';
  if (mainLogo)  mainLogo.src  = logoPath;
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
  htmlEl.setAttribute('dir',  state.lang === 'en' ? 'ltr' : 'rtl');
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
  renderPropertyDetails();
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
// 📦 7. FAVORITES
// ==========================================
function loadFavorites() {
  if (state.user) {
    try {
      const saved = localStorage.getItem(`ore_favs_${state.user.uid}`);
      state.favorites = saved ? JSON.parse(saved) : [];
    } catch(e) {
      console.warn("Could not parse favorites", e);
      state.favorites = [];
    }
  } else {
    state.favorites = [];
  }
  if (document.getElementById('listings-grid')) {
    renderListings();
  }
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
  const strId = String(id);
  const index = state.favorites.indexOf(strId);
  if (index > -1) state.favorites.splice(index, 1);
  else state.favorites.push(strId);
  saveFavorites();
  
  // إعادة التحميل مع الحفاظ على البيانات المفلترة في حال كنا نبحث
  const isSearchActive = document.querySelector('.search-field input')?.value.trim() !== "";
  if (!isSearchActive) renderListings();
  else {
    const btn = e.currentTarget;
    if(index > -1) {
      btn.classList.remove('active');
      btn.innerHTML = `<i class="ph ph-heart"></i>`;
    } else {
      btn.classList.add('active');
      btn.innerHTML = `<i class="ph-fill ph-heart"></i>`;
    }
  }
}

function goToProperty(id) {
  window.location.href = `property.html?id=${String(id)}`;
}

// ==========================================
// 🏠 8. RENDER LISTINGS
// ==========================================
function renderCategories() {
  const container = document.getElementById('categories-container');
  if (!container) return;
  container.innerHTML = categories.map((cat, index) => `
    <button class="category-item ${index === 0 ? 'active' : ''}" onclick="selectCategory(this)">
      <i class="ph ${cat.icon}"></i>
      <span class="font-medium">${state.lang === 'en' ? cat.label_en : cat.label_ar}</span>
    </button>
  `).join('');
}

window.selectCategory = function(el) {
  document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
};

function renderListings(customArray = null) {
  const container = document.getElementById('listings-grid');
  if (!container) return;

  const dict     = translations[state.lang];
  const currency = state.lang === 'en' ? 'DZD' : 'د.ج';
  
  let itemsToShow = customArray || state.liveProperties;

  if (state.currentView === 'favorites' && !customArray) {
    itemsToShow = state.liveProperties.filter(p => state.favorites.includes(String(p.id)));
    if (itemsToShow.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:60px 20px;">
          <i class="ph ph-heart-break" style="font-size:3.5rem; color:var(--text-muted); margin-bottom:16px; display:block; opacity: 0.5;"></i>
          <p style="font-size:1.1rem; color:var(--text-muted);">${dict.no_favorites}</p>
        </div>
      `;
      return;
    }
  }

  if (itemsToShow.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:60px 20px; color:var(--text-muted);">
        <i class="ph ph-house-line" style="font-size:3.5rem; display:block; margin-bottom:16px; opacity: 0.5;"></i>
        <p style="font-size:1.1rem;">${customArray ? dict.no_results : dict.no_props}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = itemsToShow.map(prop => {
    const isFav    = state.favorites.includes(String(prop.id));
    const title    = state.lang === 'en' ? (prop.title_en || '') : (prop.title_ar || '');
    const location = state.lang === 'en' ? (prop.location_en || '') : (prop.location_ar || '');

    let urgencyHtml = '';
    if (prop.urgency) {
      const urgencyText = prop.urgency === 'few' ? dict.urgency_few : dict.urgency_hot;
      urgencyHtml = `<div class="urgency-label"><i class="ph-fill ph-fire"></i><span>${urgencyText}</span></div>`;
    }

    return `
      <div class="card" onclick="goToProperty('${prop.id}')">
        <div class="card-img-wrapper">
          <img src="${prop.image}" alt="${title}" class="card-img" loading="lazy" onerror="this.src='images/placeholder.jpg'">
          ${urgencyHtml}
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(event, '${prop.id}')">
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
              ${Number(prop.price).toLocaleString()} ${currency}
              <span>/ ${dict.night}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 🏨 9. PROPERTY DETAILS PAGE
// ==========================================
let currentPropImages = [];

function renderPropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propId    = urlParams.get('id');
  if (!propId) return;

  let prop = properties.find(p => String(p.id) === String(propId));

  if (!prop) {
    db.collection('properties').doc(propId).get()
      .then(doc => {
        if (!doc.exists) return;
        const d = doc.data();
        _fillPropertyPage({
          id:          String(doc.id),
          title_en:    d.titleEn    || '',
          title_ar:    d.titleAr    || '',
          location_en: d.locationEn || '',
          location_ar: d.locationAr || '',
          price:       d.price      || 0,
          rating:      d.rating     || 4.80,
          image:       d.imageUrl   || '',
          images:      Array.isArray(d.images) && d.images.length > 0 ? d.images : [d.imageUrl || ''],
          urgency:     d.urgency    || null,
          desc_en:     d.descEn     || '',
          desc_ar:     d.descAr     || '',
          features_en: Array.isArray(d.featuresEn) ? d.featuresEn : [],
          features_ar: Array.isArray(d.featuresAr) ? d.featuresAr : [],
          lat:         d.lat        || null,
          lng:         d.lng        || null,
        });
      })
      .catch(err => console.error('Property fetch error:', err));
    return;
  }

  _fillPropertyPage(prop);
}

// ==========================================
// 🗺️ تعبئة صفحة التفاصيل + الخريطة
// ==========================================
function _fillPropertyPage(prop) {
  const dict     = translations[state.lang];
  const currency = state.lang === 'en' ? 'DZD' : 'د.ج';

  const titleEl    = document.getElementById('prop-title');
  const ratingEl   = document.getElementById('prop-rating');
  const locationEl = document.getElementById('prop-location');
  const descEl     = document.getElementById('prop-desc');
  const featuresEl = document.getElementById('prop-features');
  const priceEl    = document.getElementById('prop-price');
  const trackEl    = document.getElementById('slider-track');
  const dotsEl     = document.getElementById('slider-dots');

  if (titleEl)    titleEl.textContent    = state.lang === 'en' ? prop.title_en    : prop.title_ar;
  if (ratingEl)   ratingEl.textContent   = prop.rating;
  if (locationEl) locationEl.textContent = state.lang === 'en' ? prop.location_en : prop.location_ar;
  if (descEl)     descEl.textContent     = state.lang === 'en' ? prop.desc_en     : prop.desc_ar;
  if (priceEl)    priceEl.textContent    = Number(prop.price).toLocaleString() + ' ' + currency;

  if (featuresEl) {
    const features = state.lang === 'en' ? prop.features_en : prop.features_ar;
    if (features && Array.isArray(features) && features.length) {
      featuresEl.innerHTML = features.map(f =>
        `<li><i class="ph-fill ph-check-circle"></i> ${f}</li>`
      ).join('');
    }
  }

  if (trackEl && Array.isArray(prop.images) && prop.images.length) {
    currentPropImages       = prop.images;
    state.currentImageIndex = 0;

    trackEl.innerHTML = currentPropImages.map(img =>
      `<img src="${img}" alt="Property Image" onclick="openLightbox()" loading="lazy" onerror="this.src='images/placeholder.jpg'">`
    ).join('');

    if (dotsEl) {
      dotsEl.innerHTML = currentPropImages.map((img, i) =>
        `<button class="slider-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(event, ${i})"></button>`
      ).join('');
    }

    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    if (currentPropImages.length <= 1) {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (dotsEl)  dotsEl.style.display  = 'none';
    } else {
      updateSlider();
    }
  }

  if (typeof window.initPropertyMap === 'function') {
    const locationName = state.lang === 'en' ? prop.location_en : prop.location_ar;
    setTimeout(() => {
      window.initPropertyMap(prop.lat, prop.lng, locationName, state.lang);
    }, 200);
  }
}

// ==========================================
// 🎛️ Slider Controls
// ==========================================
window.prevSlide = function(e) {
  if (e) e.stopPropagation();
  if (!currentPropImages.length) return;
  state.currentImageIndex = state.currentImageIndex > 0
    ? state.currentImageIndex - 1
    : currentPropImages.length - 1;
  updateSlider();
};

window.nextSlide = function(e) {
  if (e) e.stopPropagation();
  if (!currentPropImages.length) return;
  state.currentImageIndex = state.currentImageIndex < currentPropImages.length - 1
    ? state.currentImageIndex + 1
    : 0;
  updateSlider();
};

window.goToSlide = function(e, index) {
  if (e) e.stopPropagation();
  if (!currentPropImages.length || index < 0 || index >= currentPropImages.length) return;
  state.currentImageIndex = index;
  updateSlider();
};

function updateSlider() {
  const trackEl = document.getElementById('slider-track');
  if (trackEl) {
    const direction = state.lang === 'ar' ? 100 : -100;
    trackEl.style.transform = `translateX(${state.currentImageIndex * direction}%)`;
  }
  
  const lbImg = document.getElementById('lightbox-img');
  if (lbImg && document.getElementById('lightbox')?.classList.contains('active')) {
    if (currentPropImages[state.currentImageIndex]) {
      lbImg.src = currentPropImages[state.currentImageIndex];
      lbImg.classList.remove('zoomed');
    }
  }
  
  document.querySelectorAll('.slider-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === state.currentImageIndex);
  });
}

// ==========================================
// 🔍 Lightbox
// ==========================================
window.openLightbox = function() {
  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  if (lb && lbImg && currentPropImages.length > 0) {
    lbImg.src = currentPropImages[state.currentImageIndex];
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
};

window.closeLightbox = function() {
  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  if (lb) {
    lb.classList.remove('active');
    document.body.style.overflow = '';
    if (lbImg) lbImg.classList.remove('zoomed');
  }
};

window.toggleZoom = function(e) {
  e.stopPropagation();
  const img = document.getElementById('lightbox-img');
  if (img) img.classList.toggle('zoomed');
};

// ==========================================
// 🔐 10. FIREBASE AUTH
// ==========================================
function showMessage(msg, type = 'error') {
  if (!authMessage) return;
  authMessage.textContent   = msg;
  authMessage.className     = `auth-message ${type}`;
  authMessage.style.display = 'block';
  // التمرير أعلى المودال إذا لم يكن مرئيًا
  if (authModal) authModal.querySelector('.modal-content')?.scrollTo({top: 0, behavior: 'smooth'});
  setTimeout(() => { authMessage.style.display = 'none'; }, 5000);
}

async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const btn = loginForm.querySelector('button[type="submit"]');
  
  btn.innerHTML = `<i class="ph ph-circle-notch spin"></i>`; // Spinner
  btn.disabled  = true;
  
  try {
    await auth.signInWithEmailAndPassword(email, password);
    closeModal();
    loginForm.reset();
  } catch (error) {
    // توفير رسائل أكثر تفصيلاً 
    let errorMsg = state.lang === 'ar' ? 'البريد أو كلمة المرور غير صحيحة' : 'Invalid email or password';
    if (error.code === 'auth/user-not-found') {
      errorMsg = state.lang === 'ar' ? 'لا يوجد حساب مسجل بهذا البريد' : 'No account found with this email';
    } else if (error.code === 'auth/too-many-requests') {
      errorMsg = state.lang === 'ar' ? 'تم حظر الحساب مؤقتاً بسبب محاولات كثيرة خاطئة' : 'Account temporarily disabled due to many failed login attempts';
    }
    showMessage(errorMsg, 'error');
  } finally {
    btn.innerHTML = `<span data-i18n="sign_in">${state.lang === 'en' ? 'Sign In' : 'تسجيل الدخول'}</span>`;
    btn.disabled  = false;
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value;
  const email    = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const btn = registerForm.querySelector('button[type="submit"]');
  
  btn.innerHTML = `<i class="ph ph-circle-notch spin"></i>`; // Spinner
  btn.disabled  = true;
  
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    await userCredential.user.updateProfile({ displayName: name });
    // إجبار التحديث
    await userCredential.user.reload();
    state.user = auth.currentUser;
    closeModal();
    registerForm.reset();
    updateUserUI();
  } catch (error) {
    let errorMsg = error.message;
    if (error.code === 'auth/email-already-in-use') {
      errorMsg = state.lang === 'ar' ? 'البريد الإلكتروني مسجل مسبقاً' : 'Email is already in use';
    } else if (error.code === 'auth/weak-password') {
      errorMsg = state.lang === 'ar' ? 'كلمة المرور ضعيفة (يجب أن تكون 6 أحرف على الأقل)' : 'Password is too weak (minimum 6 characters)';
    }
    showMessage(errorMsg, 'error');
  } finally {
    btn.innerHTML = `<span data-i18n="sign_up_btn">${state.lang === 'en' ? 'Create Account' : 'إنشاء الحساب'}</span>`;
    btn.disabled  = false;
  }
}

async function handleGoogleLogin() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try { 
    await auth.signInWithPopup(provider); 
    closeModal(); 
  } catch (error) { 
    console.error("Google Auth Error:", error);
    showMessage(state.lang === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول بواسطة جوجل' : 'Error signing in with Google', 'error'); 
  }
}

function handleLogout() {
  auth.signOut().then(() => {
    if (profileDropdown) profileDropdown.classList.remove('active');
    state.currentView = 'home';
    state.favorites   = [];
    if (document.getElementById('listings-grid')) {
      const heroEl = document.getElementById('hero-section');
      const catsEl = document.getElementById('categories-container');
      if (heroEl) heroEl.style.display = 'block';
      if (catsEl) catsEl.style.display = 'flex';
      const sectionTitle = document.getElementById('section-main-title');
      if (sectionTitle) sectionTitle.setAttribute('data-i18n', 'trending');
      updateLanguageUI();
      renderListings();
    }
  });
}

function handleAuthButtonClick() {
  if (state.user) {
    if (profileDropdown) profileDropdown.classList.toggle('active');
  } else {
    openModal();
  }
}

function updateUserUI() {
  if (!openAuthBtn) return;
  if (state.user) {
    const initial = state.user.displayName
      ? state.user.displayName.charAt(0).toUpperCase()
      : (state.user.email ? state.user.email.charAt(0).toUpperCase() : 'U');
    
    openAuthBtn.innerHTML = `<span class="font-bold">${initial}</span>`;
    openAuthBtn.classList.add('auth-btn-logged');
    openAuthBtn.classList.remove('auth-btn-guest');
    
    if (document.getElementById('dropdown-user-name')) {
      document.getElementById('dropdown-user-name').textContent  = state.user.displayName || (state.lang === 'ar' ? 'مستخدم' : 'User');
      document.getElementById('dropdown-user-email').textContent = state.user.email || '';
    }
  } else {
    openAuthBtn.innerHTML = `<i class="ph ph-user"></i>`;
    openAuthBtn.classList.add('auth-btn-guest');
    openAuthBtn.classList.remove('auth-btn-logged');
    if (profileDropdown) profileDropdown.classList.remove('active');
  }
}

function openModal() {
  if (!authModal) return;
  authModal.classList.add('active');
  document.body.classList.add('modal-open');
}

function closeModal() {
  if (!authModal) return;
  authModal.classList.remove('active');
  document.body.classList.remove('modal-open');
  if (authMessage) authMessage.style.display = 'none';
  if (loginForm && registerForm) {
    setTimeout(() => switchForm('login'), 300);
  }
}

function switchForm(type) {
  if (!loginForm || !registerForm) return;
  if (type === 'register') {
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  } else {
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', init);
