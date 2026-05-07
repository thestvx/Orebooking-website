// ==========================================
// 1. FIREBASE CONFIGURATION
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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// 2. GLOBAL STATE & TRANSLATIONS
// ==========================================
const state = {
  lang: localStorage.getItem("ore_lang") || "en",
  theme: localStorage.getItem("ore_theme") || "light",
  favorites: [],
  user: null,
  currentView: "home",
  currentImageIndex: 0,
  liveProperties: [],
  activeSearch: "",
  activeCategory: null
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
    search_results: "Search Results",
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
    no_results: "No results found",
    clear_search: "Clear Search",
    all_wilayas: "All Wilayas",
    all_wilayas_sub: "Show all properties",
    fav_added: "Added to favorites",
    fav_removed: "Removed from favorites",
    reset_pass_title: "Reset Password",
    reset_pass_desc: "Enter your email and we'll send you a reset link.",
    send_link: "Send Reset Link",
    back_to_login: "Back to login",
    reset_sent: "Reset link sent! Check your inbox.",
    my_bookings: "My Bookings",
    no_bookings: "You have no bookings yet."
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
    search_results: "نتائج البحث",
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
    no_results: "لا توجد نتائج مطابقة",
    clear_search: "إلغاء البحث",
    all_wilayas: "كل الولايات",
    all_wilayas_sub: "عرض جميع العقارات",
    fav_added: "تمت الإضافة للمفضلة",
    fav_removed: "تمت الإزالة من المفضلة",
    reset_pass_title: "استعادة كلمة المرور",
    reset_pass_desc: "أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة.",
    send_link: "إرسال الرابط",
    back_to_login: "العودة لتسجيل الدخول",
    reset_sent: "تم الإرسال! تحقق من بريدك الإلكتروني.",
    my_bookings: "حجوزاتي",
    no_bookings: "ليس لديك أي حجوزات بعد."
  }
};

// ==========================================
// 3. STATIC MOCK DATA & WILAYAS
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
      "images/palmgarden/01.jpg",
      "images/palmgarden/02.jpg",
      "images/palmgarden/03.jpg",
      "images/palmgarden/04.jpg"
    ],
    urgency: "hot",
    desc_en: "Where to find peace and comfort as if you are away from the bustle... but without feeling like you are in the desert! At Palm Garden you will find comfortable rooms, a breakfast fit for royalty, green lawns, and a safe family space.",
    desc_ar: "وين تلقى الهدوء والراحة وكأنك بعيد عن الصخب… لكن بلا ما تحس روحك في الصحراء! في بالم قاردن تلقى غرف مريحة، فطور صباحي يليق بالمقام، قازون أخضر يشرح الخاطر، وفضاء عائلي آمن.",
    features_ar: ["غرف فردية، ثنائية وعائلية", "فطور صباحي", "قازون أخضر", "فضاء عائلي آمن"],
    features_en: ["Single & Family Rooms", "Breakfast Included", "Green Lawn", "Safe Family Space"],
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
    features_ar: ["غرفتين نوم", "مطبخ مجهز", "مدفأة حطب"],
    features_en: ["2 Bedrooms", "Equipped Kitchen", "Fireplace"],
    lat: null,
    lng: null
  }
];

const categories = [
  { icon: "ph-buildings", label_en: "Apartments", label_ar: "شقق" },
  { icon: "ph-house", label_en: "Villas", label_ar: "فلل" },
  { icon: "ph-tree-evergreen", label_en: "Resorts", label_ar: "منتجعات" },
  { icon: "ph-swimming-pool", label_en: "Pools", label_ar: "مسابح" }
];

const algerianWilayas = [
  { id: 1, ar: "أدرار", en: "Adrar" }, { id: 2, ar: "الشلف", en: "Chlef" }, { id: 3, ar: "الأغواط", en: "Laghouat" },
  { id: 4, ar: "أم البواقي", en: "Oum El Bouaghi" }, { id: 5, ar: "باتنة", en: "Batna" }, { id: 6, ar: "بجاية", en: "Béjaïa" },
  { id: 7, ar: "بسكرة", en: "Biskra" }, { id: 8, ar: "بشار", en: "Béchar" }, { id: 9, ar: "البليدة", en: "Blida" },
  { id: 10, ar: "البويرة", en: "Bouira" }, { id: 11, ar: "تمنراست", en: "Tamanrasset" }, { id: 12, ar: "تبسة", en: "Tébessa" },
  { id: 13, ar: "تلمسان", en: "Tlemcen" }, { id: 14, ar: "تيارت", en: "Tiaret" }, { id: 15, ar: "تيزي وزو", en: "Tizi Ouzou" },
  { id: 16, ar: "الجزائر", en: "Algiers" }, { id: 17, ar: "الجلفة", en: "Djelfa" }, { id: 18, ar: "جيجل", en: "Jijel" },
  { id: 19, ar: "سطيف", en: "Sétif" }, { id: 20, ar: "سعيدة", en: "Saïda" }, { id: 21, ar: "سكيكدة", en: "Skikda" },
  { id: 22, ar: "سيدي بلعباس", en: "Sidi Bel Abbès" }, { id: 23, ar: "عنابة", en: "Annaba" }, { id: 24, ar: "قالمة", en: "Guelma" },
  { id: 25, ar: "قسنطينة", en: "Constantine" }, { id: 26, ar: "المدية", en: "Médéa" }, { id: 27, ar: "مستغانم", en: "Mostaganem" },
  { id: 28, ar: "المسيلة", en: "M'Sila" }, { id: 29, ar: "معسكر", en: "Mascara" }, { id: 30, ar: "ورقلة", en: "Ouargla" },
  { id: 31, ar: "وهران", en: "Oran" }, { id: 32, ar: "البيض", en: "El Bayadh" }, { id: 33, ar: "إليزي", en: "Illizi" },
  { id: 34, ar: "برج بوعريريج", en: "Bordj Bou Arréridj" }, { id: 35, ar: "بومرداس", en: "Boumerdès" },
  { id: 36, ar: "الطارف", en: "El Tarf" }, { id: 37, ar: "تندوف", en: "Tindouf" }, { id: 38, ar: "تيسمسيلت", en: "Tissemsilt" },
  { id: 39, ar: "الوادي", en: "El Oued" }, { id: 40, ar: "خنشلة", en: "Khenchela" }, { id: 41, ar: "سوق أهراس", en: "Souk Ahras" },
  { id: 42, ar: "تيبازة", en: "Tipaza" }, { id: 43, ar: "ميلة", en: "Mila" }, { id: 44, ar: "عين الدفلى", en: "Aïn Defla" },
  { id: 45, ar: "النعامة", en: "Naâma" }, { id: 46, ar: "عين تموشنت", en: "Aïn Témouchent" }, { id: 47, ar: "غرداية", en: "Ghardaïa" },
  { id: 48, ar: "غليزان", en: "Relizane" }, { id: 49, ar: "تيميمون", en: "Timimoun" }, { id: 50, ar: "برج باجي مختار", en: "Bordj Badji Mokhtar" },
  { id: 51, ar: "أولاد جلال", en: "Ouled Djellal" }, { id: 52, ar: "بني عباس", en: "Béni Abbès" }, { id: 53, ar: "إن صالح", en: "In Salah" },
  { id: 54, ar: "إن قزام", en: "In Guezzam" }, { id: 55, ar: "تقرت", en: "Touggourt" }, { id: 56, ar: "جانت", en: "Djanet" },
  { id: 57, ar: "المغير", en: "El M'Ghair" }, { id: 58, ar: "المنيعة", en: "El Meniaa" }
];

// ==========================================
// 4. CORE INITIALIZATION
// ==========================================
const langBtn = document.getElementById("lang-toggle");
const themeBtn = document.getElementById("theme-toggle");
const htmlEl = document.documentElement;
const authModal = document.getElementById("auth-modal");
const openAuthBtn = document.getElementById("open-auth-btn");
const closeAuthBtn = document.getElementById("close-auth-btn");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const forgotForm = document.getElementById("forgot-form");
const authMessage = document.getElementById("auth-message");
const profileDropdown = document.getElementById("profile-dropdown");
const logoutBtn = document.getElementById("logout-btn");
const myFavoritesBtn = document.getElementById("my-favorites-btn");
const myBookingsBtn = document.getElementById("my-bookings-btn");
const homeLogoBtn = document.getElementById("home-logo-btn");

let currentPropImages = [];

function init() {
  applyInitialState();

  if (document.getElementById("categories-container")) {
    renderCategories();
    loadPropertiesFromFirestore();
    initSmartSearch();
    initClearSearchBtn();
  }

  // Check if we are in property detail view and render if so
  if (typeof renderPropertyDetails === 'function') {
      renderPropertyDetails();
  }

  initScrollTopBtn();
  initMobileNav();
  if (typeof initSliderTouch === 'function') initSliderTouch();
  initPasswordToggles();
  initPasswordStrength();
  
  if (typeof initBookingsModal === 'function') {
      initBookingsModal();
  }

  if (langBtn) langBtn.addEventListener("click", toggleLanguage);
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
  if (openAuthBtn) openAuthBtn.addEventListener("click", handleAuthButtonClick);
  if (closeAuthBtn) closeAuthBtn.addEventListener("click", closeModal);

  if (homeLogoBtn) {
    homeLogoBtn.addEventListener("click", e => {
      if (document.getElementById("hero-section")) {
        e.preventDefault();
        resetToHome();
      }
    });
  }

  if (myFavoritesBtn) {
    myFavoritesBtn.addEventListener("click", () => {
      if (profileDropdown) profileDropdown.classList.remove("active");
      state.currentView = "favorites";

      const hero = document.getElementById("hero-section");
      const cats = document.getElementById("categories-container");
      if (hero) hero.style.display = "none";
      if (cats) cats.style.display = "none";

      hideClearSearchBtn();

      const sectionTitle = document.getElementById("section-main-title");
      if (sectionTitle) {
        sectionTitle.removeAttribute("data-i18n");
        sectionTitle.textContent = translations[state.lang].my_favorites;
      }

      renderListings();
    });
  }

  if (myBookingsBtn) {
    myBookingsBtn.addEventListener("click", () => {
      if (profileDropdown) profileDropdown.classList.remove("active");
      showMyBookings();
    });
  }

  window.addEventListener("click", e => {
    if (authModal && e.target === authModal) closeModal();
    if (profileDropdown && !e.target.closest(".profile-container")) {
      profileDropdown.classList.remove("active");
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      const lb = document.getElementById("lightbox");
      if (lb && lb.classList.contains("active") && typeof closeLightbox === 'function') {
        closeLightbox();
      } else if (authModal && authModal.classList.contains("active")) {
        closeModal();
      }

      const bookingsModal = document.getElementById("bookings-modal");
      if (bookingsModal && bookingsModal.classList.contains("active") && typeof closeBookingsModal === 'function') {
        closeBookingsModal();
      }

      const sd = document.getElementById("search-dropdown");
      if (sd) sd.classList.remove("active");
    }
  });

  document.getElementById("go-to-register")?.addEventListener("click", e => {
    e.preventDefault();
    switchForm("register");
  });

  document.getElementById("go-to-login")?.addEventListener("click", e => {
    e.preventDefault();
    switchForm("login");
  });

  document.getElementById("go-to-forgot")?.addEventListener("click", e => {
    e.preventDefault();
    switchForm("forgot");
  });

  document.getElementById("back-to-login")?.addEventListener("click", e => {
    e.preventDefault();
    switchForm("login");
  });

  if (loginForm && typeof handleLogin === 'function') loginForm.addEventListener("submit", handleLogin);
  if (registerForm && typeof handleRegister === 'function') registerForm.addEventListener("submit", handleRegister);
  if (forgotForm) forgotForm.addEventListener("submit", handleForgotPassword);

  if (typeof handleGoogleLogin === 'function') {
      document.getElementById("google-login-btn")?.addEventListener("click", handleGoogleLogin);
      document.getElementById("google-register-btn")?.addEventListener("click", handleGoogleLogin);
  }

  if (logoutBtn && typeof handleLogout === 'function') logoutBtn.addEventListener("click", handleLogout);

  auth.onAuthStateChanged(user => {
    state.user = user;
    loadFavorites();
    if (typeof updateUserUI === 'function') updateUserUI();
  });
}

// Ensure init is called
document.addEventListener("DOMContentLoaded", init);

// ==========================================
// 5. GENERAL HELPERS
// ==========================================
function escapeHtml(str = "") {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function escapeAttr(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function propertyMatchesCategory(property, category) {
  const haystack = [
    property.title_en,
    property.title_ar,
    property.desc_en,
    property.desc_ar,
    ...(property.features_en || []),
    ...(property.features_ar || [])
  ]
    .join(" ")
    .toLowerCase();

  switch (category) {
    case "Apartments":
      return /apartment|شقة|شقق/.test(haystack);
    case "Villas":
      return /villa|فلل|فيلا/.test(haystack);
    case "Resorts":
      return /resort|camp|منتجع|كوخ/.test(haystack);
    case "Pools":
      return /pool|swimming|مسبح|مسابح/.test(haystack);
    default:
      return true;
  }
}

// ==========================================
// 6. SCROLL-TO-TOP BUTTON
// ==========================================
function initScrollTopBtn() {
  const btn = document.getElementById("scroll-top-btn");
  if (!btn) return;

  window.addEventListener(
    "scroll",
    () => {
      btn.classList.toggle("visible", window.scrollY > 400);
    },
    { passive: true }
  );

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ==========================================
// 7. MOBILE BOTTOM NAV
// ==========================================
function initMobileNav() {
  const nav = document.getElementById("mobile-bottom-nav");
  if (!nav) return;

  nav.querySelectorAll(".mob-nav-btn[data-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      nav.querySelectorAll(".mob-nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.getAttribute("data-target");
      if (target === "home") resetToHome();
      if (target === "favorites") myFavoritesBtn?.click();
      if (target === "profile" && typeof handleAuthButtonClick === 'function') handleAuthButtonClick();
    });
  });
}

// ==========================================
// 8. PASSWORD UI
// ==========================================
function initPasswordToggles() {
  document.querySelectorAll(".toggle-pass-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".pass-wrapper")?.querySelector("input");
      if (!input) return;

      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      btn.innerHTML = isText
        ? '<i class="ph ph-eye"></i>'
        : '<i class="ph ph-eye-slash"></i>';
    });
  });
}

function initPasswordStrength() {
  const input = document.getElementById("reg-password");
  const wrapper = document.getElementById("password-strength");
  const label = document.getElementById("strength-label");
  const barsEl = wrapper?.querySelectorAll(".str-bar");
  if (!input || !wrapper || !barsEl) return;

  input.addEventListener("input", () => {
    const val = input.value;
    const score = calcPasswordStrength(val);
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
    const labels = {
      en: ["", "Weak", "Fair", "Good", "Strong"],
      ar: ["", "ضعيفة", "مقبولة", "جيدة", "قوية"]
    };

    barsEl.forEach((bar, i) => {
      bar.style.background = i < score ? colors[score - 1] : "var(--border-color)";
    });

    if (label) {
      label.textContent = val.length ? labels[state.lang][score] : "";
      label.style.color = score > 0 ? colors[score - 1] : "var(--text-muted)";
    }
  });
}

function calcPasswordStrength(val) {
  if (!val) return 0;
  if (val.length < 6) return 1;

  let score = 1;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val) && /[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  return Math.min(score, 4);
}

// ==========================================
// 9. FORGOT PASSWORD
// ==========================================
async function handleForgotPassword(e) {
  e.preventDefault();

  const emailInput =
    document.getElementById("forgot-email") ||
    forgotForm?.querySelector('input[type="email"]');

  const email = emailInput?.value.trim();
  if (!email) {
    if (typeof showMessage === 'function') showMessage(state.lang === "ar" ? "أدخل بريدك الإلكتروني أولاً" : "Please enter your email", "error");
    else alert(state.lang === "ar" ? "أدخل بريدك الإلكتروني أولاً" : "Please enter your email");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    if (typeof showMessage === 'function') showMessage(translations[state.lang].reset_sent, "success");
    forgotForm?.reset();
  } catch (error) {
    const isAr = state.lang === "ar";
    const map = {
      "auth/user-not-found": isAr ? "لا يوجد حساب بهذا البريد" : "No account found with this email",
      "auth/invalid-email": isAr ? "صيغة البريد غير صحيحة" : "Invalid email format",
      "auth/network-request-failed": isAr ? "تحقق من اتصال الإنترنت" : "Check your internet connection"
    };
    if (typeof showMessage === 'function') showMessage(map[error.code] || error.message, "error");
    else alert(map[error.code] || error.message);
  }
}

// ==========================================
// 10. RESET TO HOME
// ==========================================
function resetToHome() {
  state.currentView = "home";
  state.activeSearch = "";
  state.activeCategory = null;

  const hero = document.getElementById("hero-section");
  const cats = document.getElementById("categories-container");
  if (hero) hero.style.display = "block";
  if (cats) cats.style.display = "flex";

  const searchInput = document.getElementById("search-location");
  if (searchInput) searchInput.value = "";

  hideClearSearchBtn();

  const sectionTitle = document.getElementById("section-main-title");
  if (sectionTitle) {
    sectionTitle.setAttribute("data-i18n", "trending");
    sectionTitle.textContent = translations[state.lang].trending;
  }

  document.querySelectorAll(".mob-nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelector('.mob-nav-btn[data-target="home"]')?.classList.add("active");

  if (typeof renderCategories === 'function') renderCategories();
  if (typeof renderListings === 'function') renderListings();
}

// ==========================================
// 11. CLEAR SEARCH BUTTON
// ==========================================
function initClearSearchBtn() {
  const clearBtn = document.getElementById("clear-search-btn");
  if (!clearBtn) return;
  clearBtn.addEventListener("click", resetToHome);
}

function showClearSearchBtn() {
  const clearBtn = document.getElementById("clear-search-btn");
  if (clearBtn) clearBtn.style.display = "inline-flex";
}

function hideClearSearchBtn() {
  const clearBtn = document.getElementById("clear-search-btn");
  if (clearBtn) clearBtn.style.display = "none";
}

// ==========================================
// 12. SMART SEARCH WITH WILAYAS
// ==========================================
function initSmartSearch() {
  const searchInput = document.getElementById("search-location");
  const searchDropdown = document.getElementById("search-dropdown");
  const searchBtn = document.getElementById("main-search-btn");

  if (!searchInput || !searchDropdown) return;

  const dict = () => translations[state.lang];

  const renderWilayas = wilayas => {
    let html = `
      <div class="search-item" onclick="selectWilaya('', '')" style="border-bottom:1px solid var(--border-color);">
        <div class="search-icon-box" style="color:var(--text-main);">
          <i class="ph ph-globe-hemisphere-west"></i>
        </div>
        <div class="search-item-info">
          <span class="search-item-title">${dict().all_wilayas}</span>
          <span class="search-item-sub">${dict().all_wilayas_sub}</span>
        </div>
      </div>
    `;

    if (wilayas.length > 0) {
      html += wilayas
        .map(
          w => `
        <div class="search-item" onclick="selectWilaya('${w.ar.replace(/'/g, "\\'")}', '${w.en.replace(/'/g, "\\'")}')">
          <div class="search-icon-box"><i class="ph ph-map-pin"></i></div>
          <div class="search-item-info">
            <span class="search-item-title">${state.lang === "en" ? w.en : w.ar}</span>
            <span class="search-item-sub">${state.lang === "en" ? "Algeria" : "الجزائر"} — ${w.id}</span>
          </div>
        </div>
      `
        )
        .join("");
    } else {
      html += `
        <div class="no-results">
          <i class="ph ph-magnifying-glass"></i>
          <span>${dict().no_results}</span>
        </div>
      `;
    }

    searchDropdown.innerHTML = html;
    searchDropdown.classList.add("active");
  };

  searchInput.addEventListener("focus", () => renderWilayas(algerianWilayas));
  searchInput.addEventListener("click", () => renderWilayas(algerianWilayas));

  searchInput.addEventListener("input", e => {
    const val = e.target.value.trim().toLowerCase();

    if (!val) {
      renderWilayas(algerianWilayas);
      return;
    }

    const filtered = algerianWilayas.filter(
      w =>
        (w.ar && w.ar.includes(e.target.value.trim())) ||
        (w.en && w.en.toLowerCase().includes(val)) ||
        String(w.id) === val
    );

    renderWilayas(filtered);
  });

  document.addEventListener("click", e => {
    if (!e.target.closest("#search-location-wrapper") && !e.target.closest(".search-bar")) {
      searchDropdown.classList.remove("active");
    }
  });

  let focusedIndex = -1;

  searchInput.addEventListener("keydown", e => {
    const items = searchDropdown.querySelectorAll(".search-item");
    if (!items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusedIndex = Math.min(focusedIndex + 1, items.length - 1);
      updateKeyboardFocus(items, focusedIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusedIndex = Math.max(focusedIndex - 1, 0);
      updateKeyboardFocus(items, focusedIndex);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIndex >= 0 && items[focusedIndex]) {
        items[focusedIndex].click();
      } else {
        searchBtn?.click();
      }
      focusedIndex = -1;
    } else if (e.key === "Escape") {
      searchDropdown.classList.remove("active");
      focusedIndex = -1;
    }
  });

  function updateKeyboardFocus(items, index) {
    items.forEach((item, i) => item.classList.toggle("selected", i === index));
    if (items[index]) items[index].scrollIntoView({ block: "nearest" });
  }

  window.selectWilaya = function (arName, enName) {
    searchDropdown.classList.remove("active");
    focusedIndex = -1;

    if (!arName && !enName) {
      searchInput.value = "";
      state.activeSearch = "";
      hideClearSearchBtn();

      const sectionTitle = document.getElementById("section-main-title");
      if (sectionTitle) {
        sectionTitle.setAttribute("data-i18n", "trending");
        sectionTitle.textContent = translations[state.lang].trending;
      }

      if (typeof renderListings === 'function') renderListings();
      document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    searchInput.value = state.lang === "en" ? enName : arName;
    state.activeSearch = enName;
    showClearSearchBtn();

    const sectionTitle = document.getElementById("section-main-title");
    if (sectionTitle) {
      sectionTitle.removeAttribute("data-i18n");
      sectionTitle.textContent = state.lang === "en" ? `Results: ${enName}` : `نتائج: ${arName}`;
    }

    filterAndRender(enName, arName);
  };

  if (searchBtn) {
    searchBtn.addEventListener("click", e => {
      e.preventDefault();
      searchDropdown.classList.remove("active");

      const val = searchInput.value.trim();
      const valLow = val.toLowerCase();

      if (!val) {
        resetToHome();
        return;
      }

      state.activeSearch = val;
      showClearSearchBtn();

      const sectionTitle = document.getElementById("section-main-title");
      if (sectionTitle) {
        sectionTitle.removeAttribute("data-i18n");
        sectionTitle.textContent = state.lang === "en" ? `Results: "${val}"` : `نتائج: "${val}"`;
      }

      const filtered = state.liveProperties.filter(
        p =>
          (p.title_en && p.title_en.toLowerCase().includes(valLow)) ||
          (p.title_ar && p.title_ar.includes(val)) ||
          (p.location_en && p.location_en.toLowerCase().includes(valLow)) ||
          (p.location_ar && p.location_ar.includes(val))
      );

      if (typeof renderListings === 'function') renderListings(filtered);
      document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function filterAndRender(enName, arName) {
    const enLow = enName ? enName.toLowerCase() : "";
    const arTrim = arName || "";

    const filtered = state.liveProperties.filter(
      p =>
        (p.location_en && p.location_en.toLowerCase().includes(enLow)) ||
        (p.location_ar && p.location_ar.includes(arTrim))
    );

    if (typeof renderListings === 'function') renderListings(filtered);
    document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ==========================================
// 13. LOAD PROPERTIES FROM FIRESTORE
// ==========================================
async function loadPropertiesFromFirestore() {
  const container = document.getElementById("listings-grid");
  if (!container) return;

  container.innerHTML = `
    <div class="card-skeleton"></div>
    <div class="card-skeleton"></div>
    <div class="card-skeleton"></div>
    <div class="card-skeleton"></div>
  `;

  try {
    const snapshot = await db.collection("properties").where("visible", "==", true).get();

    if (!snapshot.empty) {
      state.liveProperties = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: String(doc.id),
          title_en: d.titleEn || d.title_en || "",
          title_ar: d.titleAr || d.title_ar || "",
          location_en: d.locationEn || d.location_en || "",
          location_ar: d.locationAr || d.location_ar || "",
          price: Number(d.price || 0),
          rating: Number(d.rating || 4.8),
          image: d.imageUrl || d.image || "",
          images: Array.isArray(d.images) && d.images.length > 0 ? d.images : [d.imageUrl || d.image || ""],
          urgency: d.urgency || null,
          desc_en: d.descEn || d.desc_en || "",
          desc_ar: d.descAr || d.desc_ar || "",
          features_en: Array.isArray(d.featuresEn || d.features_en) ? (d.featuresEn || d.features_en) : [],
          features_ar: Array.isArray(d.featuresAr || d.features_ar) ? (d.featuresAr || d.features_ar) : [],
          lat: d.lat || null,
          lng: d.lng || null
        };
      });
    } else {
      state.liveProperties = [...properties];
    }
  } catch (err) {
    console.error("Firestore error:", err);
    state.liveProperties = [...properties];
  }

  if (typeof renderListings === 'function') renderListings();
}

// ==========================================
// 14. THEME, LOGO & LANGUAGE
// ==========================================
function updateLogo() {
  const mainLogo = document.getElementById("main-logo");
  const modalLogo = document.getElementById("modal-logo");
  const logoPath = state.theme === "dark" ? "logos/orebooking2.png" : "logos/orebooking.png";

  if (mainLogo) mainLogo.src = logoPath;
  if (modalLogo) modalLogo.src = logoPath;
}

function applyInitialState() {
  if (state.theme === "dark") {
    document.body.classList.add("dark");
    if (themeBtn) themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove("dark");
    if (themeBtn) themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }

  updateLogo();
  htmlEl.setAttribute("dir", state.lang === "en" ? "ltr" : "rtl");
  htmlEl.setAttribute("lang", state.lang);

  if (langBtn) langBtn.textContent = state.lang === "en" ? "العربية" : "English";

  updateLanguageUI();
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  localStorage.setItem("ore_theme", state.theme);
  applyInitialState();
}

function toggleLanguage() {
  state.lang = state.lang === "en" ? "ar" : "en";
  localStorage.setItem("ore_lang", state.lang);
  applyInitialState();

  if (document.getElementById("categories-container")) {
    if (typeof renderCategories === 'function') renderCategories();

    if (state.activeSearch && state.currentView !== "favorites") {
      const val = state.activeSearch.toLowerCase();
      const filtered = state.liveProperties.filter(
        p =>
          (p.title_en && p.title_en.toLowerCase().includes(val)) ||
          (p.title_ar && p.title_ar.includes(state.activeSearch)) ||
          (p.location_en && p.location_en.toLowerCase().includes(val)) ||
          (p.location_ar && p.location_ar.includes(state.activeSearch))
      );
      if (typeof renderListings === 'function') renderListings(filtered);
    } else {
      if (typeof renderListings === 'function') renderListings();
    }

    const searchInput = document.getElementById("search-location");
    if (searchInput && state.activeSearch) {
      const matched = algerianWilayas.find(w => w.en.toLowerCase() === state.activeSearch.toLowerCase());
      if (matched) {
        searchInput.value = state.lang === "en" ? matched.en : matched.ar;
      }
    }

    const sectionTitle = document.getElementById("section-main-title");
    if (sectionTitle && state.currentView === "favorites") {
      sectionTitle.textContent = translations[state.lang].my_favorites;
    }
  }

  if (typeof renderPropertyDetails === 'function') renderPropertyDetails();
}

function updateLanguageUI() {
  const dict = translations[state.lang];

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (dict[key] !== undefined) el.textContent = dict[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (dict[key] !== undefined) el.placeholder = dict[key];
  });

  _updatePropertyPageTexts();
}

function _updatePropertyPageTexts() {
  const isAr = state.lang === "ar";

  const infoText = document.getElementById("booking-info-text");
  if (infoText) {
    infoText.textContent = isAr
      ? "اختر تواريخ رحلتك وعدد الضيوف في الصفحة التالية لمعرفة السعر النهائي."
      : "Choose your dates and number of guests on the next page to see the final price.";
  }

  const perk1 = document.getElementById("perk-1");
  const perk2 = document.getElementById("perk-2");
  const perk3 = document.getElementById("perk-3");
  if (perk1) perk1.textContent = isAr ? "إلغاء مجاني خلال 24 ساعة" : "Free cancellation within 24h";
  if (perk2) perk2.textContent = isAr ? "تأكيد فوري للحجز" : "Instant confirmation";
  if (perk3) perk3.textContent = isAr ? "دعم على مدار الساعة" : "24/7 support";

  const shareText = document.getElementById("share-text");
  if (shareText) shareText.textContent = isAr ? "مشاركة" : "Share";

  const hostSince = document.getElementById("host-since");
  const hostBadgeText = document.getElementById("host-badge-text");
  if (hostSince) hostSince.textContent = isAr ? "مضيف منذ 2024" : "Hosting since 2024";
  if (hostBadgeText) hostBadgeText.textContent = isAr ? "مضيف موثوق" : "Verified Host";

  const mapTitle = document.getElementById("map-title");
  const mapsText = document.getElementById("open-maps-text");
  if (mapTitle) mapTitle.textContent = isAr ? "موقع العقار" : "Where you'll be";
  if (mapsText) mapsText.textContent = isAr ? "فتح في خرائط قوقل" : "Open in Google Maps";
}

// ==========================================
// 15. FAVORITES
// ==========================================
function loadFavorites() {
  if (state.user) {
    try {
      const saved = localStorage.getItem(`ore_favs_${state.user.uid}`);
      state.favorites = saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Could not parse favorites:", e);
      state.favorites = [];
    }
  } else {
    state.favorites = [];
  }

  if (document.getElementById("listings-grid")) {
    if (typeof renderListings === 'function') renderListings();
  }
}

function saveFavorites() {
  if (state.user) {
    localStorage.setItem(`ore_favs_${state.user.uid}`, JSON.stringify(state.favorites));
  }
}

window.toggleFavorite = function(e, id) {
  e.stopPropagation();
  e.preventDefault(); // Prevent navigating to property if clicking the heart icon

  if (!state.user) {
    if (typeof openModal === 'function') openModal();
    if (typeof showMessage === 'function') showMessage(state.lang === "ar" ? "الرجاء تسجيل الدخول أولاً" : "Please log in first", "error");
    else alert(state.lang === "ar" ? "الرجاء تسجيل الدخول أولاً" : "Please log in first");
    return;
  }

  const strId = String(id);
  const index = state.favorites.indexOf(strId);
  const wasFav = index > -1;

  if (wasFav) state.favorites.splice(index, 1);
  else state.favorites.push(strId);

  saveFavorites();

  const btn = e.currentTarget;
  if (wasFav) {
    btn.classList.remove("active");
    btn.innerHTML = `<i class="ph ph-heart"></i>`;
  } else {
    btn.classList.add("active");
    btn.innerHTML = `<i class="ph-fill ph-heart"></i>`;
  }

  showFavToast(wasFav ? translations[state.lang].fav_removed : translations[state.lang].fav_added);

  if (state.currentView === "favorites") {
    if (typeof renderListings === 'function') renderListings();
  }
};

window.goToProperty = function(id) {
  window.location.href = `property.html?id=${String(id)}`;
};

// ==========================================
// 16. TOAST NOTIFICATIONS
// ==========================================
function showToast(message, type = "info", duration = 3000) {
  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const icons = {
    success: "ph-check-circle",
    error: "ph-x-circle",
    info: "ph-info"
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="ph ${icons[type] || "ph-info"}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function showFavToast(message) {
  let el = document.getElementById("fav-toast");

  if (!el) {
    el = document.createElement("div");
    el.id = "fav-toast";
    document.body.appendChild(el);
  }

  el.textContent = message;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 2200);
}

// ==========================================
// 17. MY BOOKINGS (COMPLETED)
// ==========================================
function initBookingsModal() {
  const modal = document.getElementById("bookings-modal");
  if (!modal) return;

  modal.querySelectorAll("[data-close-bookings], .close-bookings-btn, #close-bookings-btn").forEach(btn => {
    btn.addEventListener("click", closeBookingsModal);
  });

  modal.addEventListener("click", e => {
    if (e.target === modal) closeBookingsModal();
  });
}

function closeBookingsModal() {
  const modal = document.getElementById("bookings-modal");
  if (!modal) return;

  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

async function showMyBookings() {
  if (!state.user) {
    if (typeof openModal === 'function') openModal();
    return;
  }

  const modal = document.getElementById("bookings-modal");
  if (!modal) {
    showToast(state.lang === "ar" ? "جاري تحميل الحجوزات..." : "Loading bookings...", "info");
    return;
  }

  modal.classList.add("active");
  document.body.classList.add("modal-open");

  const body = document.getElementById("bookings-list") || modal.querySelector(".bookings-body") || modal.querySelector(".modal-content");
  if (body) {
    body.innerHTML = `
      <div style="text-align:center;padding:40px;">
        <i class="ph ph-circle-notch ph-spin" style="font-size:2rem;color:var(--primary);"></i>
      </div>
    `;
  }

  try {
    const snap = await db
      .collection("bookings")
      .where("guestId", "==", state.user.uid) // Note: Changed to guestId which matches booking payload
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      if (body) {
        body.innerHTML = `
          <div style="text-align:center;padding:40px;color:var(--text-muted);">
            <i class="ph ph-calendar-x" style="font-size:3rem;display:block;margin-bottom:12px;opacity:0.4;"></i>
            <p>${translations[state.lang].no_bookings}</p>
          </div>
        `;
      }
      return;
    }

    if (body) {
      body.innerHTML = snap.docs
        .map(doc => {
          const b = doc.data();
          const isAr = state.lang === "ar";
          // Try to get title from property or fallback
          const title = "Booking: " + (b.propertyId || "Property");
          const curr = isAr ? "د.ج" : "DZD";
          
          return `
            <div class="booking-card" style="padding:16px;border:1px solid var(--border-color);border-radius:12px;margin-bottom:12px;">
              <strong style="display:block;margin-bottom:8px;font-size:1.1rem;color:var(--text-main);">${escapeHtml(title)}</strong>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="text-muted" style="font-size:0.9rem;">
                  <i class="ph ph-calendar-blank"></i> ${escapeHtml(b.checkIn || "")} &rarr; ${escapeHtml(b.checkOut || "")}
                </span>
                <span class="status-badge" style="padding:4px 10px;background:rgba(108,99,255,0.1);color:var(--primary);border-radius:99px;font-size:0.8rem;font-weight:600;">
                  ${escapeHtml(b.status || "pending")}
                </span>
              </div>
              <div style="font-size:0.9rem;color:var(--text-main);">
                <strong>Total:</strong> ${Number(b.totalPrice || 0).toLocaleString()} ${curr}
              </div>
            </div>
          `;
        })
        .join("");
    }
  } catch (err) {
    console.error(err);
    if (body) {
      body.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--error);">
          <p>${state.lang === "ar" ? "حدث خطأ أثناء تحميل الحجوزات" : "Error loading bookings"}</p>
        </div>
      `;
    }
  }
}

// Ensure any missing rendering functions (like renderListings) that might be in another file don't cause errors by stubbing them if missing
if (typeof window.renderListings !== 'function') {
  window.renderListings = function(props = state.liveProperties) {
    const container = document.getElementById("listings-grid");
    if (!container) return;
    
    let displayProps = props;
    if (state.currentView === "favorites") {
      displayProps = state.liveProperties.filter(p => state.favorites.includes(p.id));
    }
    
    if (displayProps.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-muted);">${translations[state.lang].no_props}</div>`;
      return;
    }
    
    container.innerHTML = displayProps.map(p => {
      const isAr = state.lang === "ar";
      const title = isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar);
      const loc = isAr ? (p.location_ar || p.location_en) : (p.location_en || p.location_ar);
      const curr = isAr ? "د.ج" : "DZD";
      const img = p.image || (p.images && p.images[0]) || "images/placeholder.jpg";
      const isFav = state.favorites.includes(p.id);
      const favClass = isFav ? "active" : "";
      const favIcon = isFav ? "ph-fill ph-heart" : "ph ph-heart";
      
      return `
        <div class="property-card" onclick="goToProperty('${p.id}')" style="cursor:pointer;">
          <div class="property-img-wrap">
            <img src="${escapeAttr(img)}" alt="${escapeAttr(title)}" class="property-img">
            <button class="fav-btn ${favClass}" onclick="toggleFavorite(event, '${p.id}')">
              <i class="${favIcon}"></i>
            </button>
          </div>
          <div class="property-info">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <h3 class="property-title" style="margin:0;font-size:1.1rem;font-weight:600;">${escapeHtml(title)}</h3>
              <div style="display:flex;align-items:center;gap:4px;font-size:0.9rem;font-weight:600;">
                <i class="ph-fill ph-star" style="color:#f59e0b;"></i> ${p.rating || "New"}
              </div>
            </div>
            <p class="property-location" style="color:var(--text-muted);font-size:0.9rem;margin:4px 0;">${escapeHtml(loc)}</p>
            <div class="property-price" style="margin-top:8px;">
              <span style="font-weight:700;font-size:1.1rem;">${Number(p.price).toLocaleString()} ${curr}</span> 
              <span style="color:var(--text-muted);font-size:0.9rem;">/ ${translations[state.lang].night}</span>
            </div>
          </div>
        </div>
      `;
    }).join("");
  };
}
