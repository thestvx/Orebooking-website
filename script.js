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
    invalid_credentials: "Invalid email or password",
    booking_status_pending: "Pending",
    booking_status_confirmed: "Confirmed",
    booking_status_cancelled: "Cancelled",
    booking_status_rejected: "Rejected",
    booking_property: "Property",
    booking_dates: "Dates",
    booking_total: "Total",
    booking_guests: "Guests",
    booking_payment: "Payment",
    booking_created: "Created",
    booking_addons: "Add-ons",
    booking_notes: "Notes"
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
    invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    booking_status_pending: "قيد الانتظار",
    booking_status_confirmed: "مؤكد",
    booking_status_cancelled: "ملغي",
    booking_status_rejected: "مرفوض",
    booking_property: "العقار",
    booking_dates: "التواريخ",
    booking_total: "الإجمالي",
    booking_guests: "الضيوف",
    booking_payment: "الدفع",
    booking_created: "تاريخ الإنشاء",
    booking_addons: "الإضافات",
    booking_notes: "الملاحظات"
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

  auth.onAuthStateChanged(async user => {
    state.user = user;
    await loadFavorites();
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
function t(key) {
  return translations[state.lang]?.[key] || key;
}

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

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString(state.lang === "ar" ? "ar-DZ" : "en-US")} DZD`;
}

function formatDate(value) {
  if (!value) return "—";
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString(state.lang === "ar" ? "ar-DZ" : "en-GB");
  }
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString(state.lang === "ar" ? "ar-DZ" : "en-GB");
  }
  return String(value);
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString(state.lang === "ar" ? "ar-DZ" : "en-GB")} ${d.toLocaleTimeString(state.lang === "ar" ? "ar-DZ" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function safeDateMs(value) {
  try {
    if (!value) return 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  } catch (_) {
    return 0;
  }
}

function getStatusMeta(status) {
  const map = {
    pending: {
      label: t("booking_status_pending"),
      cls: "pending",
      icon: "ph-hourglass-medium"
    },
    confirmed: {
      label: t("booking_status_confirmed"),
      cls: "confirmed",
      icon: "ph-check-circle"
    },
    cancelled: {
      label: t("booking_status_cancelled"),
      cls: "cancelled",
      icon: "ph-x-circle"
    },
    rejected: {
      label: t("booking_status_rejected"),
      cls: "cancelled",
      icon: "ph-x-circle"
    }
  };
  return map[String(status || "").toLowerCase()] || map.pending;
}

function propertyMatchesCategory(property, category) {
  const haystack = [
    property.title_en, property.title_ar,
    property.titleEn, property.titleAr,
    property.desc_en, property.desc_ar,
    property.descEn, property.descAr,
    property.type, property.typeEn, property.typeAr,
    ...(property.features_en || property.featuresEn || []),
    ...(property.features_ar || property.featuresAr || [])
  ].join(" ").toLowerCase();

  switch (category) {
    case "Apartments":
      return /apartment|شقة|شقق/.test(haystack);
    case "Villas":
      return /villa|فيلا|فلل/.test(haystack);
    case "Resorts":
      return /resort|camp|منتجع|كوخ/.test(haystack);
    case "Pools":
      return /pool|swimming|مسبح|مسابح/.test(haystack);
    default:
      return true;
  }
}

function normalizeProperty(p) {
  const lat = p.lat ?? p.locationLat ?? p.latitude ?? p.coords?.lat ?? null;
  const lng = p.lng ?? p.locationLng ?? p.longitude ?? p.coords?.lng ?? null;
  const baseImage = p.image || p.imageUrl || p.mainImage || "images/placeholder.jpg";
  const imgs = Array.isArray(p.images) && p.images.length ? p.images : [baseImage];

  return {
    id: String(p.id || p.docId || ""),
    title_en: p.title_en || p.titleEn || p.title || "",
    title_ar: p.title_ar || p.titleAr || p.title || "",
    location_en: p.location_en || p.locationEn || p.location || "",
    location_ar: p.location_ar || p.locationAr || p.location || "",
    price: Number(p.price || p.basePrice || p.pricePerNight || 0),
    rating: Number(p.rating || 4.8),
    image: baseImage,
    images: imgs,
    urgency: p.urgency || null,
    desc_en: p.desc_en || p.descEn || "",
    desc_ar: p.desc_ar || p.descAr || "",
    features_en: p.features_en || p.featuresEn || [],
    features_ar: p.features_ar || p.featuresAr || [],
    type: p.type || "",
    typeEn: p.typeEn || "",
    typeAr: p.typeAr || "",
    visible: p.visible !== false,
    lat: lat !== null ? Number(lat) : null,
    lng: lng !== null ? Number(lng) : null
  };
}

function getBookingField(data, candidates = [], fallback = "") {
  for (const key of candidates) {
    if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") {
      return data[key];
    }
  }
  return fallback;
}

function getBookingPropertyId(data = {}) {
  return normalizeText(
    getBookingField(data, ["propertyId", "propId", "propertyDocId", "property_id", "listingId", "listing_id"], "")
  );
}

function getBookingGuestName(data = {}) {
  const direct = normalizeText(getBookingField(data, ["guestName", "fullName", "name", "billingName"], ""));
  if (direct) return direct;

  const first = normalizeText(data.guestNameFirst || data.firstName || data.givenName || "");
  const father = normalizeText(data.guestFatherName || data.fatherName || "");
  const family = normalizeText(data.guestFamilyName || data.lastName || data.familyName || "");
  return [first, father, family].filter(Boolean).join(" ").trim() || "—";
}

function getBookingPhone(data = {}) {
  return normalizeText(
    getBookingField(data, ["guestPhone", "phone", "guestWhatsapp", "billingPhone", "contactPhone"], "—")
  );
}

function getBookingEmail(data = {}) {
  return normalizeText(
    getBookingField(data, ["guestEmail", "email", "billingEmail", "contactEmail"], "—")
  );
}

function getBookingCheckIn(data = {}) {
  return getBookingField(data, ["checkInDate", "checkIn", "arrivalDate", "arrival_date"], null);
}

function getBookingCheckOut(data = {}) {
  return getBookingField(data, ["checkOutDate", "checkOut", "departureDate", "departure_date"], null);
}

function getBookingGuestsMeta(data = {}) {
  const adults = toNumber(getBookingField(data, ["adults", "guestAdults"], 0), 0);
  const children = toNumber(getBookingField(data, ["children", "guestChildren"], 0), 0);
  const infants = toNumber(getBookingField(data, ["infants", "guestInfants"], 0), 0);
  const rooms = toNumber(getBookingField(data, ["rooms", "roomCount"], 0), 0);
  const guests = toNumber(getBookingField(data, ["guests", "guestCount"], adults + children + infants || 1), 1);

  return { adults, children, infants, rooms, guests };
}

function getBookingNotes(data = {}) {
  const special = normalizeText(getBookingField(data, ["specialRequests", "notes", "addonNotes", "medicalNotes"], ""));
  const arrival = normalizeText(getBookingField(data, ["arrivalTime", "arrival_time", "expectedArrivalTime"], ""));
  const additionalGuests = normalizeText(getBookingField(data, ["additionalGuests", "additionalGuestNames"], ""));
  const bits = [];
  if (arrival) bits.push(`${state.lang === "ar" ? "وقت الوصول" : "Arrival"}: ${arrival}`);
  if (special) bits.push(`${state.lang === "ar" ? "ملاحظات" : "Notes"}: ${special}`);
  if (additionalGuests) bits.push(`${state.lang === "ar" ? "أسماء إضافية" : "Additional guests"}: ${additionalGuests}`);
  return bits.join(" — ");
}

function getBookingAddons(data = {}) {
  const addOnLabels = {
    restaurant: state.lang === "ar" ? "المطعم" : "Restaurant",
    wifi: state.lang === "ar" ? "إنترنت عالي السرعة" : "WiFi",
    spa: state.lang === "ar" ? "جلسة سبا" : "Spa",
    parking: state.lang === "ar" ? "موقف سيارات" : "Parking",
    airportTransfer: state.lang === "ar" ? "نقل المطار" : "Airport transfer",
    lateCheckout: state.lang === "ar" ? "تسجيل خروج متأخر" : "Late checkout",
    extraBed: state.lang === "ar" ? "سرير إضافي" : "Extra bed",
    events: state.lang === "ar" ? "تنسيق فعاليات" : "Events",
    breakfast: state.lang === "ar" ? "فطور" : "Breakfast",
    breakfastIncluded: state.lang === "ar" ? "فطور" : "Breakfast",
    babyCrib: state.lang === "ar" ? "سرير أطفال" : "Baby crib",
    highChair: state.lang === "ar" ? "كرسي أطفال" : "High chair",
    accessibleRoom: state.lang === "ar" ? "غرفة مهيأة" : "Accessible room",
    earlyCheckin: state.lang === "ar" ? "دخول مبكر" : "Early check-in"
  };

  let addons = [];

  if (Array.isArray(data.selectedAddons)) {
    addons = data.selectedAddons;
  } else if (data.addons && typeof data.addons === "object") {
    addons = Object.keys(data.addons).filter(key => data.addons[key] === true);
  } else {
    const derived = [];
    if (String(data.breakfastOption || "").toLowerCase() === "yes") derived.push("breakfast");
    if (String(data.airportTransfer || "").toLowerCase() !== "no" && String(data.airportTransfer || "").trim()) derived.push("airportTransfer");
    if (String(data.parkingNeeded || "").toLowerCase() !== "no" && String(data.parkingNeeded || "").trim()) derived.push("parking");
    if (String(data.lateCheckout || "").toLowerCase() === "yes") derived.push("lateCheckout");
    if (String(data.earlyCheckin || "").toLowerCase() === "yes") derived.push("earlyCheckin");
    if (String(data.babyCrib || "").toLowerCase() === "yes") derived.push("babyCrib");
    if (String(data.highChair || "").toLowerCase() === "yes") derived.push("highChair");
    if (String(data.accessibleRoom || "").toLowerCase() !== "no" && String(data.accessibleRoom || "").trim()) derived.push("accessibleRoom");
    addons = derived;
  }

  return addons.map(a => {
    if (a === "restaurant" && data.restaurantPlan) return `${addOnLabels[a] || a} (${data.restaurantPlan})`;
    return addOnLabels[a] || a;
  });
}

function showToast(message, type = "success") {
  let host = document.getElementById("global-toast-host");

  if (!host) {
    host = document.createElement("div");
    host.id = "global-toast-host";
    host.style.cssText = "position:fixed;top:20px;left:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,380px);";
    document.body.appendChild(host);
  }

  const cfg = {
    success: { bg: "#ecfdf5", border: "#10b981", text: "#047857", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "ph-info" }
  }[type] || { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "ph-info" };

  const toast = document.createElement("div");
  toast.style.cssText = `background:${cfg.bg};border:1px solid ${cfg.border};color:${cfg.text};padding:14px 16px;border-radius:16px;box-shadow:0 14px 30px rgba(15,23,42,.12);font-weight:700;font-family:inherit;display:flex;align-items:flex-start;gap:10px;line-height:1.6;`;
  toast.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.2rem;flex-shrink:0;margin-top:2px;"></i><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
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
    showMessage(state.lang === "ar" ? "أدخل بريدك الإلكتروني أولاً" : "Please enter your email", "error");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    showMessage(translations[state.lang].reset_sent, "success");
    forgotForm?.reset();
  } catch (error) {
    const isAr = state.lang === "ar";
    const map = {
      "auth/user-not-found": isAr ? "لا يوجد حساب بهذا البريد" : "No account found with this email",
      "auth/invalid-email": isAr ? "صيغة البريد غير صحيحة" : "Invalid email format",
      "auth/network-request-failed": isAr ? "تحقق من اتصال الإنترنت" : "Check your internet connection"
    };
    showMessage(map[error.code] || error.message, "error");
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

  renderCategories();
  renderListings();
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
// 12. SMART SEARCH
// ==========================================
function initSmartSearch() {
  const searchInput = document.getElementById("search-location");
  const searchDropdown = document.getElementById("search-dropdown");
  const searchBtn = document.getElementById("main-search-btn");

  if (!searchInput || !searchDropdown) return;

  const renderWilayas = wilayas => {
    const topLabel = state.lang === "ar" ? "كل الولايات" : "All Wilayas";
    const topSub = state.lang === "ar" ? "عرض جميع العقارات" : "Show all properties";

    let html = `
      <button class="search-suggestion" data-value="">
        <i class="ph ph-globe-hemisphere-west"></i>
        <div>
          <strong>${escapeHtml(topLabel)}</strong>
          <small>${escapeHtml(topSub)}</small>
        </div>
      </button>
    `;

    html += wilayas.map(w => `
      <button class="search-suggestion" data-value="${escapeAttr(state.lang === "ar" ? w.ar : w.en)}">
        <i class="ph ph-map-pin"></i>
        <div>
          <strong>${escapeHtml(state.lang === "ar" ? w.ar : w.en)}</strong>
        </div>
      </button>
    `).join("");

    searchDropdown.innerHTML = html;
    searchDropdown.classList.add("active");

    searchDropdown.querySelectorAll(".search-suggestion").forEach(btn => {
      btn.addEventListener("click", () => {
        searchInput.value = btn.getAttribute("data-value") || "";
        searchDropdown.classList.remove("active");
        runSearch();
      });
    });
  };

  const runSearch = () => {
    const q = searchInput.value.trim().toLowerCase();
    state.activeSearch = q;

    const hero = document.getElementById("hero-section");
    const cats = document.getElementById("categories-container");
    if (hero) hero.style.display = "none";
    if (cats) cats.style.display = "none";

    const sectionTitle = document.getElementById("section-main-title");
    if (sectionTitle) {
      sectionTitle.removeAttribute("data-i18n");
      sectionTitle.textContent = q ? translations[state.lang].search_results : translations[state.lang].trending;
    }

    if (q) showClearSearchBtn();
    else hideClearSearchBtn();

    let filtered = [...state.liveProperties];

    if (q) {
      filtered = filtered.filter(p => {
        const haystack = [
          p.title_en, p.title_ar,
          p.location_en, p.location_ar,
          p.desc_en, p.desc_ar,
          p.type, p.typeEn, p.typeAr
        ].join(" ").toLowerCase();

        return haystack.includes(q);
      });
    }

    if (state.activeCategory) {
      filtered = filtered.filter(p => propertyMatchesCategory(p, state.activeCategory));
    }

    state.currentView = q || state.activeCategory ? "search" : "home";
    renderListings(filtered);
  };

  searchInput.addEventListener("focus", () => renderWilayas(algerianWilayas.slice(0, 12)));

  searchInput.addEventListener("input", () => {
    const value = searchInput.value.trim().toLowerCase();
    const filtered = algerianWilayas.filter(w =>
      w.ar.toLowerCase().includes(value) || w.en.toLowerCase().includes(value)
    ).slice(0, 12);

    renderWilayas(filtered.length ? filtered : algerianWilayas.slice(0, 12));
  });

  searchBtn?.addEventListener("click", runSearch);

  searchInput.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchDropdown.classList.remove("active");
      runSearch();
    }
  });
}

// ==========================================
// 13. THEME & LANGUAGE
// ==========================================
function applyInitialState() {
  document.body.classList.toggle("dark", state.theme === "dark");
  htmlEl.lang = state.lang;
  htmlEl.dir = state.lang === "ar" ? "rtl" : "ltr";

  const themeIcon = themeBtn?.querySelector("i");
  if (themeIcon) themeIcon.className = state.theme === "dark" ? "ph ph-sun" : "ph ph-moon";

  applyTranslations();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("ore_theme", state.theme);
  document.body.classList.toggle("dark", state.theme === "dark");

  const themeIcon = themeBtn?.querySelector("i");
  if (themeIcon) themeIcon.className = state.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
}

function toggleLanguage() {
  state.lang = state.lang === "ar" ? "en" : "ar";
  localStorage.setItem("ore_lang", state.lang);
  htmlEl.lang = state.lang;
  htmlEl.dir = state.lang === "ar" ? "rtl" : "ltr";
  applyTranslations();
  renderCategories();
  renderListings();
  if (document.getElementById("property-details-page")) renderPropertyDetails();
}

function applyTranslations() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (translations[state.lang][key]) {
      el.textContent = translations[state.lang][key];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (translations[state.lang][key]) {
      el.setAttribute("placeholder", translations[state.lang][key]);
    }
  });
}

// ==========================================
// 14. LOAD PROPERTIES
// ==========================================
async function loadPropertiesFromFirestore() {
  const grid = document.getElementById("listings-grid");
  if (grid) {
    grid.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-circle-notch ph-spin"></i>
        <div>${escapeHtml(translations[state.lang].loading)}</div>
      </div>
    `;
  }

  try {
    const snap = await db.collection("properties").get();
    const firestoreProps = snap.docs
      .map(doc => normalizeProperty({ ...doc.data(), id: doc.id }))
      .filter(p => p.visible !== false);

    state.liveProperties = firestoreProps.length ? firestoreProps : properties.map(normalizeProperty);
    renderListings();
  } catch (error) {
    console.error("loadPropertiesFromFirestore error:", error);
    state.liveProperties = properties.map(normalizeProperty);
    renderListings();
  }
}

// ==========================================
// 15. RENDER LISTINGS
// ==========================================
function getCurrentListings() {
  if (state.currentView === "favorites") {
    return state.liveProperties.filter(p => state.favorites.includes(String(p.id)));
  }
  return state.liveProperties;
}

function renderListings(customList = null) {
  const grid = document.getElementById("listings-grid");
  if (!grid) return;

  const items = Array.isArray(customList) ? customList : getCurrentListings();

  if (!items.length) {
    const msg = state.currentView === "favorites"
      ? translations[state.lang].no_favorites
      : (state.currentView === "search" ? translations[state.lang].no_results : translations[state.lang].no_props);

    grid.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-house-line"></i>
        <div>${escapeHtml(msg)}</div>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(p => {
    const title = state.lang === "ar" ? (p.title_ar || p.title_en) : (p.title_en || p.title_ar);
    const location = state.lang === "ar" ? (p.location_ar || p.location_en) : (p.location_en || p.location_ar);
    const isFav = state.favorites.includes(String(p.id));
    const urgencyText = p.urgency === "few"
      ? translations[state.lang].urgency_few
      : p.urgency === "hot"
        ? translations[state.lang].urgency_hot
        : "";

    return `
      <article class="listing-card" onclick="openPropertyPage('${escapeAttr(String(p.id))}')">
        <div class="listing-thumb-wrap">
          <img src="${escapeAttr(p.image)}" alt="${escapeAttr(title)}" class="listing-thumb">
          <button class="fav-btn ${isFav ? "active" : ""}" onclick="event.stopPropagation(); toggleFavorite('${escapeAttr(String(p.id))}')">
            <i class="ph ${isFav ? "ph-fill ph-heart" : "ph-heart"}"></i>
          </button>
          ${urgencyText ? `<span class="urgency-chip">${escapeHtml(urgencyText)}</span>` : ""}
        </div>
        <div class="listing-body">
          <div class="listing-top">
            <h3>${escapeHtml(title)}</h3>
            <span class="listing-rating"><i class="ph-fill ph-star"></i>${Number(p.rating || 4.8).toFixed(2)}</span>
          </div>
          <div class="listing-location">
            <i class="ph ph-map-pin"></i>
            <span>${escapeHtml(location)}</span>
          </div>
          <div class="listing-price">
            <strong>${escapeHtml(formatCurrency(p.price))}</strong>
            <span> / ${escapeHtml(translations[state.lang].night)}</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

window.openPropertyPage = function (id) {
  window.location.href = `property.html?id=${encodeURIComponent(id)}`;
};

// ==========================================
// 16. PROPERTY DETAILS
// ==========================================
function getPropertyIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || params.get("propertyId") || params.get("pid");
}

async function renderPropertyDetails() {
  const page = document.getElementById("property-details-page");
  if (!page) return;

  const propId = getPropertyIdFromUrl();
  if (!propId) return;

  let prop = null;

  try {
    const doc = await db.collection("properties").doc(String(propId)).get();
    if (doc.exists) {
      prop = normalizeProperty({ ...doc.data(), id: doc.id });
    }
  } catch (error) {
    console.error("renderPropertyDetails error:", error);
  }

  if (!prop) {
    prop = state.liveProperties.find(p => String(p.id) === String(propId)) || properties.map(normalizeProperty).find(p => String(p.id) === String(propId));
  }

  if (!prop) return;

  currentPropImages = prop.images || [prop.image];

  const title = state.lang === "ar" ? (prop.title_ar || prop.title_en) : (prop.title_en || prop.title_ar);
  const location = state.lang === "ar" ? (prop.location_ar || prop.location_en) : (prop.location_en || prop.location_ar);
  const desc = state.lang === "ar" ? (prop.desc_ar || prop.desc_en) : (prop.desc_en || prop.desc_ar);
  const features = state.lang === "ar" ? (prop.features_ar || []) : (prop.features_en || []);
  const isFav = state.favorites.includes(String(prop.id));

  const titleEl = document.getElementById("prop-title");
  const locationEl = document.getElementById("prop-location");
  const descEl = document.getElementById("prop-description");
  const featuresEl = document.getElementById("prop-features");
  const mainImg = document.getElementById("prop-main-img");
  const thumbs = document.getElementById("prop-thumbs");
  const priceEl = document.getElementById("prop-price");
  const favBtn = document.getElementById("prop-fav-btn");
  const bookBtn = document.getElementById("book-now-btn");

  if (titleEl) titleEl.textContent = title;
  if (locationEl) locationEl.textContent = location;
  if (descEl) descEl.textContent = desc;
  if (priceEl) priceEl.textContent = formatCurrency(prop.price);

  if (mainImg) {
    mainImg.src = currentPropImages[0] || prop.image;
    mainImg.alt = title;
    mainImg.addEventListener("click", () => openLightbox(0));
  }

  if (thumbs) {
    thumbs.innerHTML = currentPropImages.map((img, idx) => `
      <button class="prop-thumb-btn ${idx === 0 ? "active" : ""}" onclick="setActivePropImage(${idx})">
        <img src="${escapeAttr(img)}" alt="thumb-${idx + 1}">
      </button>
    `).join("");
  }

  if (featuresEl) {
    featuresEl.innerHTML = features.map(f => `
      <li><i class="ph ph-check-circle"></i><span>${escapeHtml(f)}</span></li>
    `).join("");
  }

  if (favBtn) {
    favBtn.classList.toggle("active", isFav);
    favBtn.innerHTML = `<i class="ph ${isFav ? "ph-fill ph-heart" : "ph-heart"}"></i>`;
    favBtn.onclick = () => toggleFavorite(String(prop.id), true);
  }

  if (bookBtn) {
    bookBtn.onclick = () => {
      localStorage.setItem("selectedPropertyId", String(prop.id));
      window.location.href = `booking.html?id=${encodeURIComponent(prop.id)}`;
    };
  }

  if (prop.lat && prop.lng && typeof L !== "undefined") {
    setTimeout(() => initPropertyMap(prop.lat, prop.lng, title), 150);
  }
}

window.setActivePropImage = function (idx) {
  const mainImg = document.getElementById("prop-main-img");
  const thumbBtns = document.querySelectorAll(".prop-thumb-btn");
  if (!mainImg || !currentPropImages[idx]) return;

  state.currentImageIndex = idx;
  mainImg.src = currentPropImages[idx];

  thumbBtns.forEach((btn, i) => btn.classList.toggle("active", i === idx));
};

function initPropertyMap(lat, lng, title) {
  const mapEl = document.getElementById("property-map");
  if (!mapEl) return;

  if (propertyMap) {
    propertyMap.remove();
    propertyMap = null;
  }

  propertyMap = L.map(mapEl).setView([lat, lng], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(propertyMap);

  L.marker([lat, lng]).addTo(propertyMap).bindPopup(escapeHtml(title)).openPopup();
}

// ==========================================
// 17. LIGHTBOX
// ==========================================
function openLightbox(index = 0) {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  if (!lb || !img || !currentPropImages.length) return;

  state.currentImageIndex = index;
  img.src = currentPropImages[index];
  lb.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.classList.remove("active");
  document.body.classList.remove("modal-open");
}

function changeLightboxImage(step) {
  if (!currentPropImages.length) return;
  state.currentImageIndex = (state.currentImageIndex + step + currentPropImages.length) % currentPropImages.length;
  const img = document.getElementById("lightbox-img");
  if (img) img.src = currentPropImages[state.currentImageIndex];
}

window.openLightbox = openLightbox;
window.closeLightbox = closeLightbox;
window.changeLightboxImage = changeLightboxImage;

// ==========================================
// 18. FAVORITES
// ==========================================
async function loadFavorites() {
  if (!state.user) {
    state.favorites = JSON.parse(localStorage.getItem("ore_favorites_guest") || "[]");
    return;
  }

  try {
    const doc = await db.collection("users").doc(state.user.uid).get();
    const data = doc.data() || {};
    state.favorites = Array.isArray(data.favorites) ? data.favorites.map(String) : [];
  } catch (error) {
    console.error("loadFavorites error:", error);
    state.favorites = [];
  }
}

async function toggleFavorite(propId, rerender = false) {
  const id = String(propId);

  if (!state.user) {
    const current = new Set(JSON.parse(localStorage.getItem("ore_favorites_guest") || "[]").map(String));
    const exists = current.has(id);

    if (exists) current.delete(id);
    else current.add(id);

    state.favorites = [...current];
    localStorage.setItem("ore_favorites_guest", JSON.stringify(state.favorites));

    showToast(exists ? translations[state.lang].fav_removed : translations[state.lang].fav_added, "success");
    renderListings();
    if (rerender) renderPropertyDetails();
    return;
  }

  try {
    const current = new Set(state.favorites.map(String));
    const exists = current.has(id);

    if (exists) current.delete(id);
    else current.add(id);

    state.favorites = [...current];

    await db.collection("users").doc(state.user.uid).set({
      favorites: state.favorites,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showToast(exists ? translations[state.lang].fav_removed : translations[state.lang].fav_added, "success");
    renderListings();
    if (rerender) renderPropertyDetails();
  } catch (error) {
    console.error("toggleFavorite error:", error);
    showToast(error.message, "error");
  }
}

window.toggleFavorite = toggleFavorite;

// ==========================================
// 19. BOOKINGS MODAL
// ==========================================
function initBookingsModal() {
  const closeBtn = document.getElementById("close-bookings-modal");
  closeBtn?.addEventListener("click", closeBookingsModal);
}

function openBookingsModal() {
  const modal = document.getElementById("bookings-modal");
  if (!modal) return;
  modal.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeBookingsModal() {
  const modal = document.getElementById("bookings-modal");
  if (!modal) return;
  modal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

window.closeBookingsModal = closeBookingsModal;

// ==========================================
// 20. MY BOOKINGS
// ==========================================
async function showMyBookings() {
  if (!state.user) {
    showToast(translations[state.lang].auth_required, "error");
    switchForm("login");
    openModal();
    return;
  }

  openBookingsModal();

  const container = document.getElementById("bookings-list");
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <i class="ph ph-circle-notch ph-spin"></i>
      <div>${escapeHtml(state.lang === "ar" ? "جارٍ تحميل الحجوزات..." : "Loading bookings...")}</div>
    </div>
  `;

  try {
    const snap = await db.collection("bookings").get();
    const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const mine = all.filter(b => {
      const guestId = String(b.guestId || "");
      const guestEmail = String(b.guestEmail || "").toLowerCase();
      const email = String(state.user?.email || "").toLowerCase();

      return guestId === state.user.uid || guestEmail === email;
    }).sort((a, b) => safeDateMs(b.createdAt) - safeDateMs(a.createdAt));

    if (!mine.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ph ph-calendar-blank"></i>
          <div>${escapeHtml(translations[state.lang].no_bookings)}</div>
        </div>
      `;
      return;
    }

    const propIds = [...new Set(mine.map(getBookingPropertyId).filter(Boolean))];
    const propMap = new Map();

    await Promise.all(propIds.map(async pid => {
      try {
        const doc = await db.collection("properties").doc(pid).get();
        if (doc.exists) propMap.set(pid, { id: doc.id, ...doc.data() });
      } catch (_) {}
    }));

    container.innerHTML = mine.map(b => {
      const propId = getBookingPropertyId(b);
      const prop = propMap.get(propId) || null;
      const propTitle = state.lang === "ar"
        ? (prop?.titleAr || prop?.title || prop?.titleEn || b.propertyTitle || "—")
        : (prop?.titleEn || prop?.title || prop?.titleAr || b.propertyTitle || "—");

      const status = getStatusMeta(b.status);
      const checkIn = getBookingCheckIn(b);
      const checkOut = getBookingCheckOut(b);
      const g = getBookingGuestsMeta(b);
      const addons = getBookingAddons(b);
      const notes = getBookingNotes(b);

      return `
        <article class="booking-card booking-status-${escapeAttr(status.cls)}">
          <div class="booking-card-top">
            <div>
              <h3>${escapeHtml(propTitle)}</h3>
              <div class="booking-subline">${escapeHtml(getBookingGuestName(b))} • ${escapeHtml(getBookingEmail(b))}</div>
            </div>
            <span class="booking-status-chip ${escapeAttr(status.cls)}">
              <i class="ph ${escapeAttr(status.icon)}"></i>
              ${escapeHtml(status.label)}
            </span>
          </div>

          <div class="booking-grid">
            <div><strong>${escapeHtml(t("booking_dates"))}:</strong> ${escapeHtml(formatDate(checkIn))} → ${escapeHtml(formatDate(checkOut))}</div>
            <div><strong>${escapeHtml(t("booking_total"))}:</strong> ${escapeHtml(formatCurrency(b.totalPrice || 0))}</div>
            <div><strong>${escapeHtml(t("booking_guests"))}:</strong> ${escapeHtml(`${g.guests} / ${g.rooms || 1}`)}</div>
            <div><strong>${escapeHtml(t("booking_payment"))}:</strong> ${escapeHtml(b.paymentMethod || "—")}</div>
            <div><strong>${escapeHtml(t("booking_created"))}:</strong> ${escapeHtml(formatDateTime(b.createdAt))}</div>
            <div><strong>${escapeHtml(state.lang === "ar" ? "الهاتف" : "Phone")}:</strong> ${escapeHtml(getBookingPhone(b))}</div>
          </div>

          ${addons.length ? `
            <div class="booking-extra-line">
              <strong>${escapeHtml(t("booking_addons"))}:</strong> ${escapeHtml(addons.join(" • "))}
            </div>
          ` : ""}

          ${notes ? `
            <div class="booking-extra-line">
              <strong>${escapeHtml(t("booking_notes"))}:</strong> ${escapeHtml(notes)}
            </div>
          ` : ""}

          ${b.receiptUrl ? `
            <div class="booking-actions">
              <a href="${escapeAttr(b.receiptUrl)}" target="_blank" rel="noopener" class="booking-link-btn">
                <i class="ph ph-paperclip"></i>
                ${escapeHtml(state.lang === "ar" ? "عرض الإيصال" : "View receipt")}
              </a>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");
  } catch (error) {
    console.error("showMyBookings error:", error);
    container.innerHTML = `
      <div class="empty-state">
        <i class="ph ph-warning-circle"></i>
        <div>${escapeHtml(state.lang === "ar" ? "حدث خطأ أثناء تحميل الحجوزات" : "Error loading bookings")}</div>
      </div>
    `;
  }
}

// ==========================================
// 21. EXTRA UTILITIES
// ==========================================
function initSliderTouch() {
  const mainImg = document.getElementById("prop-main-img");
  if (!mainImg) return;

  let startX = 0;

  mainImg.addEventListener("touchstart", e => {
    startX = e.changedTouches[0].clientX;
  }, { passive: true });

  mainImg.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;

    if (Math.abs(diff) < 40 || !currentPropImages.length) return;

    if (diff < 0) {
      const next = (state.currentImageIndex + 1) % currentPropImages.length;
      window.setActivePropImage(next);
    } else {
      const prev = (state.currentImageIndex - 1 + currentPropImages.length) % currentPropImages.length;
      window.setActivePropImage(prev);
    }
  }, { passive: true });
}

// ==========================================
// 22. GLOBAL EXPORTS
// ==========================================
window.renderPropertyDetails = renderPropertyDetails;
window.showMyBookings = showMyBookings;
window.resetToHome = resetToHome;
window.openModal = openModal;
window.closeModal = closeModal;
window.switchForm = switchForm;
window.handleAuthButtonClick = handleAuthButtonClick;
