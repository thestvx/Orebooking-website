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
    no_bookings: "You have no bookings yet.",
    auth_required: "Please log in first",
    login_success: "Login successful",
    register_success: "Account created successfully",
    logout_success: "Logged out successfully",
    invalid_credentials: "Invalid email or password"
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
    no_bookings: "ليس لديك أي حجوزات بعد.",
    auth_required: "يرجى تسجيل الدخول أولاً",
    login_success: "تم تسجيل الدخول بنجاح",
    register_success: "تم إنشاء الحساب بنجاح",
    logout_success: "تم تسجيل الخروج بنجاح",
    invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة"
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
let propertyMap = null;

function init() {
  applyInitialState();

  if (document.getElementById("categories-container")) {
    renderCategories();
    loadPropertiesFromFirestore();
    initSmartSearch();
    initClearSearchBtn();
  }

  if (typeof renderPropertyDetails === "function") {
    renderPropertyDetails();
  }

  initScrollTopBtn();
  initMobileNav();
  if (typeof initSliderTouch === "function") initSliderTouch();
  initPasswordToggles();
  initPasswordStrength();
  initBookingsModal();

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
      const bookingsModal = document.getElementById("bookings-modal");
      const sd = document.getElementById("search-dropdown");

      if (lb && lb.classList.contains("active") && typeof closeLightbox === "function") {
        closeLightbox();
      } else if (bookingsModal && bookingsModal.classList.contains("active")) {
        closeBookingsModal();
      } else if (authModal && authModal.classList.contains("active")) {
        closeModal();
      }

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

  if (loginForm) loginForm.addEventListener("submit", handleLogin);
  if (registerForm) registerForm.addEventListener("submit", handleRegister);
  if (forgotForm) forgotForm.addEventListener("submit", handleForgotPassword);

  document.getElementById("google-login-btn")?.addEventListener("click", handleGoogleLogin);
  document.getElementById("google-register-btn")?.addEventListener("click", handleGoogleLogin);

  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

  auth.onAuthStateChanged(user => {
    state.user = user;
    loadFavorites();
    updateUserUI();
  });
}

document.addEventListener("DOMContentLoaded", init);

// ==========================================
// 4.1 AUTH MODAL
// ==========================================
function openModal() {
  if (authModal) {
    authModal.classList.add("active");
    document.body.classList.add("modal-open");
    showMessage("", "");
  }
}

function closeModal() {
  if (authModal) {
    authModal.classList.remove("active");
    document.body.classList.remove("modal-open");
  }
}

function switchForm(formType) {
  const login = document.getElementById("login-form");
  const register = document.getElementById("register-form");
  const forgot = document.getElementById("forgot-form");

  if (login) login.style.display = formType === "login" ? "block" : "none";
  if (register) register.style.display = formType === "register" ? "block" : "none";
  if (forgot) forgot.style.display = formType === "forgot" ? "block" : "none";
}

function handleAuthButtonClick(e) {
  if (e) e.preventDefault();

  if (state.user) {
    if (profileDropdown) profileDropdown.classList.toggle("active");
  } else {
    switchForm("login");
    openModal();
  }
}

function showMessage(message, type = "error") {
  if (!authMessage) return;

  if (!message) {
    authMessage.style.display = "none";
    authMessage.textContent = "";
    authMessage.className = "auth-message";
    return;
  }

  authMessage.textContent = message;
  authMessage.className = `auth-message ${type}`;
  authMessage.style.display = "block";
}

function updateUserUI() {
  const dropdownUserName = document.getElementById("dropdown-user-name");
  const dropdownUserEmail = document.getElementById("dropdown-user-email");
  const icon = openAuthBtn?.querySelector("i");

  if (state.user) {
    if (openAuthBtn) {
      openAuthBtn.classList.remove("auth-btn-guest");
      openAuthBtn.classList.add("auth-btn-logged");
    }
    if (icon) icon.className = "ph-fill ph-user-circle";

    if (dropdownUserName) dropdownUserName.textContent = state.user.displayName || "User";
    if (dropdownUserEmail) dropdownUserEmail.textContent = state.user.email || "";

    closeModal();
  } else {
    if (openAuthBtn) {
      openAuthBtn.classList.remove("auth-btn-logged");
      openAuthBtn.classList.add("auth-btn-guest");
    }
    if (icon) icon.className = "ph ph-user";
    if (profileDropdown) profileDropdown.classList.remove("active");

    if (dropdownUserName) dropdownUserName.textContent = "Guest";
    if (dropdownUserEmail) dropdownUserEmail.textContent = "";
  }
}

// ==========================================
// 4.2 AUTH HANDLERS
// ==========================================
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    showMessage(translations[state.lang].invalid_credentials, "error");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast(translations[state.lang].login_success, "success");
    showMessage("", "");
    closeModal();
    loginForm?.reset();
  } catch (error) {
    console.error("Login error:", error);
    showMessage(translations[state.lang].invalid_credentials, "error");
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById("reg-name")?.value.trim();
  const email = document.getElementById("reg-email")?.value.trim();
  const password = document.getElementById("reg-password")?.value;

  if (!name || !email || !password) {
    showMessage(state.lang === "ar" ? "يرجى تعبئة جميع الحقول" : "Please fill all fields", "error");
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });

    await db.collection("users").doc(cred.user.uid).set({
      name,
      email,
      points: 1250,
      role: "guest",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showToast(translations[state.lang].register_success, "success");
    showMessage("", "");
    registerForm?.reset();
    closeModal();
  } catch (error) {
    console.error("Register error:", error);
    showMessage(error.message, "error");
  }
}

async function handleGoogleLogin() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);

    if (result?.user) {
      const ref = db.collection("users").doc(result.user.uid);
      const snap = await ref.get();

      if (!snap.exists) {
        await ref.set({
          name: result.user.displayName || "User",
          email: result.user.email || "",
          points: 1250,
          role: "guest",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    closeModal();
    showToast(translations[state.lang].login_success, "success");
  } catch (error) {
    console.error("Google login error:", error);
    showMessage(error.message, "error");
  }
}

async function handleLogout() {
  try {
    await auth.signOut();
    if (profileDropdown) profileDropdown.classList.remove("active");
    showToast(translations[state.lang].logout_success, "success");
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// ==========================================
// 4.5 CATEGORY RENDER
// ==========================================
function renderCategories() {
  const container = document.getElementById("categories-container");
  if (!container) return;

  container.innerHTML = categories.map((cat, idx) => {
    const isAr = state.lang === "ar";
    const label = isAr ? cat.label_ar : cat.label_en;
    const isActive = state.activeCategory === cat.label_en;

    return `
      <button class="category-item ${isActive ? "active" : ""}" onclick="selectCategory('${escapeAttr(cat.label_en)}')" data-idx="${idx}">
        <i class="ph ${escapeAttr(cat.icon)}"></i>
        <span>${escapeHtml(label)}</span>
      </button>
    `;
  }).join("");
}

window.selectCategory = function (catName) {
  if (state.activeCategory === catName) {
    state.activeCategory = null;
  } else {
    state.activeCategory = catName;
  }

  renderCategories();

  if (state.activeCategory) {
    showClearSearchBtn();

    const sectionTitle = document.getElementById("section-main-title");
    const isAr = state.lang === "ar";
    const matchedCat = categories.find(c => c.label_en === state.activeCategory);

    if (sectionTitle && matchedCat) {
      sectionTitle.removeAttribute("data-i18n");
      sectionTitle.textContent = isAr ? matchedCat.label_ar : matchedCat.label_en;
    }

    const filtered = state.liveProperties.filter(p => propertyMatchesCategory(p, state.activeCategory));
    renderListings(filtered);
    document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (!state.activeSearch) {
    resetToHome();
  } else {
    document.getElementById("main-search-btn")?.click();
  }
};

// ==========================================
// 5. HELPERS
// ==========================================
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function propertyMatchesCategory(property, category) {
  const haystack = [
    property.title_en, property.title_ar,
    property.titleEn, property.titleAr,
    property.desc_en, property.desc_ar,
    property.descEn, property.descAr,
    ...(property.features_en || property.featuresEn || []),
    ...(property.features_ar || property.featuresAr || [])
  ].join(" ").toLowerCase();

  switch (category) {
    case "Apartments":
      return /apartment|شقة/.test(haystack);
    case "Villas":
      return /villa|فيلا/.test(haystack);
    case "Resorts":
      return /resort|camp|منتجع/.test(haystack);
    case "Pools":
      return /pool|swimming|مسبح/.test(haystack);
    default:
      return true;
  }
}

function normalizeProperty(p) {
  const lat = p.lat ?? p.locationLat ?? p.latitude ?? p.coords?.lat ?? null;
  const lng = p.lng ?? p.locationLng ?? p.longitude ?? p.coords?.lng ?? null;

  return {
    id: String(p.id || ""),
    title_en: p.title_en || p.titleEn || "",
    title_ar: p.title_ar || p.titleAr || "",
    location_en: p.location_en || p.locationEn || "",
    location_ar: p.location_ar || p.locationAr || "",
    price: Number(p.price || 0),
    rating: Number(p.rating || 4.8),
    image: p.image || p.imageUrl || "images/placeholder.jpg",
    images: Array.isArray(p.images) && p.images.length ? p.images : [p.image || p.imageUrl || "images/placeholder.jpg"],
    urgency: p.urgency || null,
    desc_en: p.desc_en || p.descEn || "",
    desc_ar: p.desc_ar || p.descAr || "",
    features_en: p.features_en || p.featuresEn || [],
    features_ar: p.features_ar || p.featuresAr || [],
    lat: lat !== null ? Number(lat) : null,
    lng: lng !== null ? Number(lng) : null
  };
}

// ==========================================
// 6. SCROLL TOP
// ==========================================
function initScrollTopBtn() {
  const btn = document.getElementById("scroll-top-btn");
  if (!btn) return;

  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

// ==========================================
// 7. MOBILE NAV
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
      if (target === "profile") handleAuthButtonClick();
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

  if (!input || !wrapper || !barsEl?.length) return;

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

  const emailInput = document.getElementById("forgot-email") || forgotForm?.querySelector('input[type="email"]');
  const email = emailInput?.value.trim();

  if (!email) {
    showMessage(state.lang === "ar" ? "يرجى إدخال بريدك الإلكتروني" : "Please enter your email", "error");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    showMessage(translations[state.lang].reset_sent, "success");
    forgotForm?.reset();
  } catch (error) {
    const isAr = state.lang === "ar";
    const map = {
      "auth/user-not-found": isAr ? "لا يوجد حساب بهذا البريد الإلكتروني" : "No account found with this email",
      "auth/invalid-email": isAr ? "صيغة البريد الإلكتروني غير صحيحة" : "Invalid email format",
      "auth/network-request-failed": isAr ? "تحقق من اتصال الإنترنت" : "Check your internet connection"
    };

    showMessage(map[error.code] || error.message, "error");
  }
}

// ==========================================
// 10. RESET HOME
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

  renderCategories();
  renderListings();
}

// ==========================================
// 11. CLEAR SEARCH
// ==========================================
function initClearSearchBtn() {
  const clearBtn = document.getElementById("clear-search-btn");
  if (!clearBtn) return;

  clearBtn.addEventListener("click", () => {
    resetToHome();
  });
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
// 12. SMART SEARCH
// ==========================================
function initSmartSearch() {
  const searchInput = document.getElementById("search-location");
  const searchDropdown = document.getElementById("search-dropdown");
  const searchBtn = document.getElementById("main-search-btn");
  if (!searchInput || !searchDropdown) return;

  const dict = translations[state.lang];

  const renderWilayas = wilayas => {
    let html = `
      <div class="search-item" onclick="selectWilaya('', '')" style="border-bottom:1px solid var(--border-color)">
        <div class="search-icon-box"><i class="ph ph-globe-hemisphere-west"></i></div>
        <div class="search-item-info">
          <span class="search-item-title">${escapeHtml(dict.all_wilayas)}</span>
          <span class="search-item-sub">${escapeHtml(dict.all_wilayas_sub)}</span>
        </div>
      </div>
    `;

    if (wilayas.length > 0) {
      html += wilayas.map(w => `
        <div class="search-item" onclick="selectWilaya('${escapeAttr(w.ar)}', '${escapeAttr(w.en)}')">
          <div class="search-icon-box"><i class="ph ph-map-pin"></i></div>
          <div class="search-item-info">
            <span class="search-item-title">${escapeHtml(state.lang === "en" ? w.en : w.ar)}</span>
            <span class="search-item-sub">${escapeHtml(state.lang === "en" ? "Algeria" : `الجزائر • ${w.id}`)}</span>
          </div>
        </div>
      `).join("");
    } else {
      html += `
        <div class="no-results">
          <i class="ph ph-magnifying-glass"></i>
          <span>${escapeHtml(dict.no_results)}</span>
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

    const filtered = algerianWilayas.filter(w =>
      (w.ar && w.ar.includes(e.target.value.trim())) ||
      (w.en && w.en.toLowerCase().includes(val)) ||
      String(w.id) === val
    );

    renderWilayas(filtered);
  });

  document.addEventListener("click", e => {
    if (!e.target.closest(".search-location-wrapper") && !e.target.closest(".search-bar")) {
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

      renderListings();
      document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    searchInput.value = state.lang === "en" ? enName : arName;
    state.activeSearch = enName;
    showClearSearchBtn();

    const sectionTitle = document.getElementById("section-main-title");
    if (sectionTitle) {
      sectionTitle.removeAttribute("data-i18n");
      sectionTitle.textContent = state.lang === "en" ? `Results: ${enName}` : arName;
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
        sectionTitle.textContent = state.lang === "en" ? `Results: ${val}` : val;
      }

      const filtered = state.liveProperties.filter(p =>
        (p.title_en && p.title_en.toLowerCase().includes(valLow)) ||
        (p.title_ar && p.title_ar.includes(val)) ||
        (p.location_en && p.location_en.toLowerCase().includes(valLow)) ||
        (p.location_ar && p.location_ar.includes(val))
      );

      renderListings(filtered);
      document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function filterAndRender(enName, arName) {
    const enLow = enName ? enName.toLowerCase() : "";
    const arTrim = arName || "";

    const filtered = state.liveProperties.filter(p =>
      (p.location_en && p.location_en.toLowerCase().includes(enLow)) ||
      (p.location_ar && p.location_ar.includes(arTrim))
    );

    renderListings(filtered);
    document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ==========================================
// 13. LOAD PROPERTIES
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
        return normalizeProperty({
          id: String(doc.id),
          titleEn: d.titleEn || d.titleen,
          titleAr: d.titleAr || d.titlear,
          locationEn: d.locationEn || d.locationen,
          locationAr: d.locationAr || d.locationar,
          price: Number(d.price || 0),
          rating: Number(d.rating || 4.8),
          imageUrl: d.imageUrl || d.image,
          images: Array.isArray(d.images) && d.images.length > 0 ? d.images : [d.imageUrl || d.image || "images/placeholder.jpg"],
          urgency: d.urgency || null,
          descEn: d.descEn || d.descen,
          descAr: d.descAr || d.descar,
          featuresEn: Array.isArray(d.featuresEn) ? d.featuresEn : (Array.isArray(d.featuresen) ? d.featuresen : []),
          featuresAr: Array.isArray(d.featuresAr) ? d.featuresAr : (Array.isArray(d.featuresar) ? d.featuresar : []),
          lat: d.lat ?? d.locationLat ?? d.latitude ?? null,
          lng: d.lng ?? d.locationLng ?? d.longitude ?? null
        });
      });
    } else {
      state.liveProperties = properties.map(normalizeProperty);
    }
  } catch (err) {
    console.error("Firestore error:", err);
    state.liveProperties = properties.map(normalizeProperty);
  }

  renderListings();
}

// ==========================================
// 14. THEME / LANGUAGE
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

  if (langBtn) {
    langBtn.innerHTML = state.lang === "en"
      ? '<i class="ph ph-globe"></i><span>العربية</span>'
      : '<i class="ph ph-globe"></i><span>English</span>';
  }

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
    renderCategories();

    if (state.activeSearch && state.currentView !== "favorites") {
      const val = state.activeSearch.toLowerCase();
      const filtered = state.liveProperties.filter(p =>
        (p.title_en && p.title_en.toLowerCase().includes(val)) ||
        (p.title_ar && p.title_ar.includes(state.activeSearch)) ||
        (p.location_en && p.location_en.toLowerCase().includes(val)) ||
        (p.location_ar && p.location_ar.includes(state.activeSearch))
      );
      renderListings(filtered);
    } else {
      renderListings();
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

  if (typeof renderPropertyDetails === "function") renderPropertyDetails();
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

  updatePropertyPageTexts();
}

function updatePropertyPageTexts() {
  const isAr = state.lang === "ar";
  const infoText = document.getElementById("booking-info-text");
  if (infoText) {
    infoText.textContent = isAr
      ? "اختر التواريخ وعدد الضيوف في الصفحة التالية لرؤية السعر النهائي."
      : "Choose your dates and number of guests on the next page to see the final price.";
  }
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
    renderListings();
  }
}

function saveFavorites() {
  if (state.user) {
    localStorage.setItem(`ore_favs_${state.user.uid}`, JSON.stringify(state.favorites));
  }
}

window.toggleFavorite = function (e, id) {
  e.stopPropagation();
  e.preventDefault();

  if (!state.user) {
    openModal();
    showMessage(translations[state.lang].auth_required, "error");
    return;
  }

  const strId = String(id);
  const index = state.favorites.indexOf(strId);
  const wasFav = index > -1;

  if (wasFav) {
    state.favorites.splice(index, 1);
  } else {
    state.favorites.push(strId);
  }

  saveFavorites();

  const btn = e.currentTarget;
  const icon = btn.querySelector("i");
  if (icon) {
    icon.className = wasFav ? "ph ph-heart" : "ph-fill ph-heart";
  }
  btn.classList.toggle("active", !wasFav);

  showFavToast(wasFav ? translations[state.lang].fav_removed : translations[state.lang].fav_added);

  if (state.currentView === "favorites") {
    renderListings();
  }
};

window.goToProperty = function (id) {
  window.location.href = `property.html?id=${String(id)}`;
};

// ==========================================
// 16. TOASTS
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
  toast.innerHTML = `<i class="ph ${icons[type] || icons.info}"></i><span>${escapeHtml(message)}</span>`;
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
  clearTimeout(el.timer);
  el.timer = setTimeout(() => el.classList.remove("show"), 2200);
}

// ==========================================
// 17. BOOKINGS
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
    openModal();
    return;
  }

  const modal = document.getElementById("bookings-modal");
  if (!modal) {
    showToast(state.lang === "ar" ? "جارٍ تحميل الحجوزات..." : "Loading bookings...", "info");
    return;
  }

  modal.classList.add("active");
  document.body.classList.add("modal-open");

  const body = document.getElementById("bookings-list") || modal.querySelector(".bookings-body") || modal.querySelector(".modal-content");
  if (body) {
    body.innerHTML = `
      <div style="text-align:center;padding:40px">
        <i class="ph ph-circle-notch ph-spin" style="font-size:2rem;color:var(--primary)"></i>
      </div>
    `;
  }

  try {
    const snap = await db
      .collection("bookings")
      .where("guestId", "==", state.user.uid)
      .orderBy("createdAt", "desc")
      .get();

    if (snap.empty) {
      if (body) {
        body.innerHTML = `
          <div style="text-align:center;padding:40px;color:var(--text-muted)">
            <i class="ph ph-calendar-x" style="font-size:3rem;display:block;margin-bottom:12px;opacity:.4"></i>
            <p>${escapeHtml(translations[state.lang].no_bookings)}</p>
          </div>
        `;
      }
      return;
    }

    if (body) {
      body.innerHTML = snap.docs.map(doc => {
        const b = doc.data();
        const isAr = state.lang === "ar";
        const title = b.propertyTitle || `Booking #${doc.id.slice(0, 6)}`;
        const curr = isAr ? "د.ج" : "DZD";

        return `
          <div class="booking-card" style="padding:16px;border:1px solid var(--border-color);border-radius:12px;margin-bottom:12px">
            <strong style="display:block;margin-bottom:8px;font-size:1.1rem;color:var(--text-main)">${escapeHtml(title)}</strong>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;gap:10px;flex-wrap:wrap">
              <span class="text-muted" style="font-size:0.9rem">
                <i class="ph ph-calendar-blank"></i>
                ${escapeHtml(b.checkIn || "-")} → ${escapeHtml(b.checkOut || "-")}
              </span>
              <span class="status-badge" style="padding:4px 10px;background:rgba(67,90,191,0.1);color:var(--primary);border-radius:99px;font-size:0.8rem;font-weight:600">
                ${escapeHtml(b.status || "pending")}
              </span>
            </div>
            <div style="font-size:0.9rem;color:var(--text-main)">
              <strong>${isAr ? "الإجمالي:" : "Total:"}</strong>
              ${Number(b.totalPrice || 0).toLocaleString()} ${curr}
            </div>
          </div>
        `;
      }).join("");
    }
  } catch (err) {
    console.error(err);
    if (body) {
      body.innerHTML = `
        <div style="text-align:center;padding:40px;color:var(--error)">
          <p>${state.lang === "ar" ? "حدث خطأ أثناء تحميل الحجوزات" : "Error loading bookings"}</p>
        </div>
      `;
    }
  }
}

// ==========================================
// 18. RENDER LISTINGS
// ==========================================
window.renderListings = function (props = null) {
  const container = document.getElementById("listings-grid");
  if (!container) return;

  let displayProps = Array.isArray(props) ? props : [...state.liveProperties];

  if (state.currentView === "favorites") {
    displayProps = state.liveProperties.filter(p => state.favorites.includes(String(p.id)));
  }

  if (!displayProps.length) {
    const emptyText =
      state.currentView === "favorites"
        ? translations[state.lang].no_favorites
        : (state.activeSearch || state.activeCategory)
          ? translations[state.lang].no_results
          : translations[state.lang].no_props;

    container.innerHTML = `
      <div class="listings-empty">
        <i class="ph ph-house-line"></i>
        <p>${escapeHtml(emptyText)}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = displayProps.map(raw => {
    const p = normalizeProperty(raw);
    const isAr = state.lang === "ar";
    const title = isAr ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar);
    const loc = isAr ? (p.location_ar || p.location_en) : (p.location_en || p.location_ar);
    const curr = isAr ? "د.ج" : "DZD";
    const img = p.image || (p.images && p.images[0]) || "images/placeholder.jpg";
    const isFav = state.favorites.includes(String(p.id));
    const urgencyText =
      p.urgency === "few"
        ? translations[state.lang].urgency_few
        : p.urgency === "hot"
          ? translations[state.lang].urgency_hot
          : "";

    return `
      <article class="card" onclick="goToProperty('${escapeAttr(p.id)}')">
        <div class="card-img-wrapper">
          <img
            src="${escapeAttr(img)}"
            alt="${escapeAttr(title)}"
            class="card-img"
            loading="lazy"
            onerror="this.src='images/placeholder.jpg'"
          />

          ${urgencyText ? `
            <div class="urgency-label">
              <i class="ph ph-fire"></i>
              <span>${escapeHtml(urgencyText)}</span>
            </div>
          ` : ""}

          <button class="fav-btn ${isFav ? "active" : ""}" onclick="toggleFavorite(event, '${escapeAttr(p.id)}')" aria-label="Favorite">
            <i class="${isFav ? "ph-fill ph-heart" : "ph ph-heart"}"></i>
          </button>
        </div>

        <div class="card-content">
          <div class="card-header">
            <div style="flex:1;min-width:0">
              <h3 class="card-title">${escapeHtml(title)}</h3>
              <div class="card-location">
                <i class="ph ph-map-pin"></i>
                <span>${escapeHtml(loc)}</span>
              </div>
            </div>

            <div class="card-rating">
              <i class="ph-fill ph-star"></i>
              <span>${Number(p.rating || 4.8).toFixed(1)}</span>
            </div>
          </div>

          <div class="card-footer">
            <div class="card-price">
              ${Number(p.price || 0).toLocaleString()} ${curr}
              <span>/ ${escapeHtml(translations[state.lang].night)}</span>
            </div>

            <div class="card-arrow">
              <i class="ph ph-arrow-right"></i>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");
};

// ==========================================
// 19. PROPERTY DETAILS + MAP
// ==========================================
async function renderPropertyDetails() {
  const page = document.getElementById("property-page");
  if (!page) return;

  const params = new URLSearchParams(window.location.search);
  const propertyId = params.get("id");

  if (!propertyId) {
    page.innerHTML = `
      <div class="container property-container">
        <p style="text-align:center;color:var(--text-muted);padding:40px;">
          ${state.lang === "ar" ? "لم يتم تحديد العقار." : "No property selected."}
        </p>
      </div>
    `;
    return;
  }

  let prop = null;

  try {
    const doc = await db.collection("properties").doc(String(propertyId)).get();
    if (doc.exists) {
      prop = normalizeProperty({ id: doc.id, ...doc.data() });
    }
  } catch (err) {
    console.error("Property fetch error:", err);
  }

  if (!prop) {
    const localProp = (state.liveProperties || []).find(p => String(p.id) === String(propertyId))
      || properties.find(p => String(p.id) === String(propertyId));

    if (localProp) {
      prop = normalizeProperty(localProp);
    }
  }

  if (!prop) {
    page.innerHTML = `
      <div class="container property-container">
        <p style="text-align:center;color:var(--text-muted);padding:40px;">
          ${state.lang === "ar" ? "العقار غير موجود." : "Property not found."}
        </p>
      </div>
    `;
    return;
  }

  const isAr = state.lang === "ar";
  const title = isAr ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar);
  const location = isAr ? (prop.location_ar || prop.location_en) : (prop.location_en || prop.location_ar);
  const description = isAr ? (prop.desc_ar || prop.desc_en) : (prop.desc_en || prop.desc_ar);
  const features = isAr ? (prop.features_ar || prop.features_en || []) : (prop.features_en || prop.features_ar || []);
  const currency = isAr ? "د.ج" : "DZD";
  const mainImage = (prop.images && prop.images[0]) || prop.image || "images/placeholder.jpg";

  currentPropImages = Array.isArray(prop.images) ? prop.images : [mainImage];

  page.innerHTML = `
    <div class="container property-container">
      <div class="prop-header">
        <h1 class="prop-title">${escapeHtml(title)}</h1>
        <div class="prop-meta">
          <div class="prop-rating">
            <i class="ph-fill ph-star"></i>
            <span>${Number(prop.rating || 4.8).toFixed(1)}</span>
          </div>
          <div class="prop-location">
            <i class="ph ph-map-pin"></i>
            <span>${escapeHtml(location)}</span>
          </div>
        </div>
      </div>

      <div class="prop-content-grid">
        <div class="prop-details">
          <img
            src="${escapeAttr(mainImage)}"
            alt="${escapeAttr(title)}"
            style="width:100%;border-radius:20px;max-height:420px;object-fit:cover;margin-bottom:24px;"
            onerror="this.src='images/placeholder.jpg'"
          />

          <h2>${escapeHtml(translations[state.lang].about_prop)}</h2>
          <p class="prop-description">${escapeHtml(description || "")}</p>

          <div class="prop-features">
            <h3>${escapeHtml(translations[state.lang].what_offers)}</h3>
            <ul class="features-list">
              ${features.map(item => `
                <li>
                  <i class="ph ph-check-circle"></i>
                  <span>${escapeHtml(item)}</span>
                </li>
              `).join("")}
            </ul>
          </div>

          <div class="prop-map-section">
            <h3>${escapeHtml(translations[state.lang].location_on_map)}</h3>
            <div id="property-map" style="height:340px;border-radius:20px;overflow:hidden;border:1px solid var(--border-color);"></div>
          </div>
        </div>

        <aside class="booking-card-side" style="background:var(--surface-color);border:1px solid var(--border-color);border-radius:20px;padding:24px;box-shadow:var(--shadow-sm);position:sticky;top:100px;">
          <div style="font-size:1.8rem;font-weight:800;margin-bottom:8px;">
            ${Number(prop.price || 0).toLocaleString()} ${currency}
            <span style="font-size:0.95rem;color:var(--text-muted);font-weight:500;">/ ${escapeHtml(translations[state.lang].night)}</span>
          </div>
          <p id="booking-info-text" style="color:var(--text-muted);line-height:1.7;">
            ${isAr
              ? "اختر التواريخ وعدد الضيوف في الصفحة التالية لرؤية السعر النهائي."
              : "Choose your dates and number of guests on the next page to see the final price."}
          </p>
          <button class="primary-btn" style="margin-top:18px;">
            <i class="ph ph-calendar-check"></i>
            <span>${escapeHtml(translations[state.lang].book_now)}</span>
          </button>
        </aside>
      </div>
    </div>
  `;

  initPropertyMap(prop);
}

function initPropertyMap(prop) {
  const mapEl = document.getElementById("property-map");
  if (!mapEl) return;

  const lat = Number(prop?.lat);
  const lng = Number(prop?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    mapEl.innerHTML = `
      <div style="
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:24px;
        color:var(--text-muted);
        background:var(--bg-color);
      ">
        ${state.lang === "ar"
          ? "لم يتم تحديد إحداثيات هذا العقار بعد."
          : "This property does not have map coordinates yet."}
      </div>
    `;
    return;
  }

  if (typeof L === "undefined") {
    mapEl.innerHTML = `
      <div style="
        height:100%;
        display:flex;
        align-items:center;
        justify-content:center;
        text-align:center;
        padding:24px;
        color:var(--text-muted);
        background:var(--bg-color);
      ">
        ${state.lang === "ar"
          ? "مكتبة الخريطة غير محمّلة. تأكد من إضافة Leaflet داخل property.html."
          : "Map library not loaded. Make sure Leaflet is included in property.html."}
      </div>
    `;
    return;
  }

  if (propertyMap) {
    propertyMap.remove();
    propertyMap = null;
  }

  propertyMap = L.map("property-map", {
    center: [lat, lng],
    zoom: 14,
    scrollWheelZoom: false
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap"
  }).addTo(propertyMap);

  L.marker([lat, lng]).addTo(propertyMap);

  setTimeout(() => {
    propertyMap.invalidateSize();
  }, 200);
}
