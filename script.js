// ==========================================
// OreBooking script.js — Fixed property handoff + full improvements
// ==========================================
"use strict";

// ==========================================
// 1) SAFE STORAGE
// ==========================================
function safeGet(key, fallback = "") {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {}
}

function safeJsonGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) {
    return fallback;
  }
}

function safeJsonSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

// ==========================================
// 2) FIREBASE CONFIGURATION
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

let firebaseReady = false;
let auth = null;
let db = null;

try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    auth = typeof firebase.auth === "function" ? firebase.auth() : null;
    db = typeof firebase.firestore === "function" ? firebase.firestore() : null;
    firebaseReady = true;
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

// ==========================================
// 3) GLOBAL STATE
// ==========================================
const state = {
  initialized: false,
  lang: safeGet("ore_lang", "en") || "en",
  theme: safeGet("ore_theme", "light") || "light",
  favorites: safeJsonGet("ore_favorites", []),
  user: null,
  currentView: "home",
  currentImageIndex: 0,
  liveProperties: [],
  activeSearch: "",
  activeCategory: null,
  loadingProperties: false,
  propertiesLoaded: false,
  currentProperty: null,
  currentCollection: "",
  propertyCollectionCandidates: [
    "properties",
    "listings",
    "propertyListings",
    "stays",
    "hotels"
  ]
};

const STORAGE_KEYS = {
  selectedPropertyId: "selectedPropertyId",
  selectedPropertyDocId: "selectedPropertyDocId",
  selectedPropertyData: "selectedPropertyData",
  oreSelectedProperty: "ore_selected_property",
  bookingPropertySnapshot: "booking_property_snapshot",
  bookingContext: "booking_context",
  favorites: "ore_favorites"
};

// ==========================================
// 4) TRANSLATIONS
// ==========================================
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
    nights: "nights",
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
    booking_notes: "Notes",
    property_load_error: "Could not load live properties. Showing fallback data.",
    property_not_found: "Property not found",
    view_details: "View Details",
    from: "from",
    per_night: "per night",
    search_hint: "Search by city, wilaya, or property name",
    bookings_title: "Your bookings",
    close: "Close",
    payment: "Payment",
    status: "Status",
    guest: "Guest",
    user: "User"
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
    nights: "ليالٍ",
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
    booking_notes: "الملاحظات",
    property_load_error: "تعذر تحميل العقارات المباشرة، تم عرض البيانات البديلة.",
    property_not_found: "العقار غير موجود",
    view_details: "عرض التفاصيل",
    from: "ابتداءً من",
    per_night: "لكل ليلة",
    search_hint: "ابحث بالمدينة أو الولاية أو اسم العقار",
    bookings_title: "حجوزاتك",
    close: "إغلاق",
    payment: "الدفع",
    status: "الحالة",
    guest: "الضيف",
    user: "مستخدم"
  }
};

// ==========================================
// 5) STATIC MOCK DATA
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
    type: "resort",
    typeEn: "Resort",
    typeAr: "منتجع",
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
    type: "cabin",
    typeEn: "Cabin",
    typeAr: "كوخ",
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
  { id: 1, ar: "أدرار", en: "Adrar" },
  { id: 2, ar: "الشلف", en: "Chlef" },
  { id: 3, ar: "الأغواط", en: "Laghouat" },
  { id: 4, ar: "أم البواقي", en: "Oum El Bouaghi" },
  { id: 5, ar: "باتنة", en: "Batna" },
  { id: 6, ar: "بجاية", en: "Béjaïa" },
  { id: 7, ar: "بسكرة", en: "Biskra" },
  { id: 8, ar: "بشار", en: "Béchar" },
  { id: 9, ar: "البليدة", en: "Blida" },
  { id: 10, ar: "البويرة", en: "Bouira" },
  { id: 11, ar: "تمنراست", en: "Tamanrasset" },
  { id: 12, ar: "تبسة", en: "Tébessa" },
  { id: 13, ar: "تلمسان", en: "Tlemcen" },
  { id: 14, ar: "تيارت", en: "Tiaret" },
  { id: 15, ar: "تيزي وزو", en: "Tizi Ouzou" },
  { id: 16, ar: "الجزائر", en: "Algiers" },
  { id: 17, ar: "الجلفة", en: "Djelfa" },
  { id: 18, ar: "جيجل", en: "Jijel" },
  { id: 19, ar: "سطيف", en: "Sétif" },
  { id: 20, ar: "سعيدة", en: "Saïda" },
  { id: 21, ar: "سكيكدة", en: "Skikda" },
  { id: 22, ar: "سيدي بلعباس", en: "Sidi Bel Abbès" },
  { id: 23, ar: "عنابة", en: "Annaba" },
  { id: 24, ar: "قالمة", en: "Guelma" },
  { id: 25, ar: "قسنطينة", en: "Constantine" },
  { id: 26, ar: "المدية", en: "Médéa" },
  { id: 27, ar: "مستغانم", en: "Mostaganem" },
  { id: 28, ar: "المسيلة", en: "M'Sila" },
  { id: 29, ar: "معسكر", en: "Mascara" },
  { id: 30, ar: "ورقلة", en: "Ouargla" },
  { id: 31, ar: "وهران", en: "Oran" },
  { id: 32, ar: "البيض", en: "El Bayadh" },
  { id: 33, ar: "إليزي", en: "Illizi" },
  { id: 34, ar: "برج بوعريريج", en: "Bordj Bou Arréridj" },
  { id: 35, ar: "بومرداس", en: "Boumerdès" },
  { id: 36, ar: "الطارف", en: "El Tarf" },
  { id: 37, ar: "تندوف", en: "Tindouf" },
  { id: 38, ar: "تيسمسيلت", en: "Tissemsilt" },
  { id: 39, ar: "الوادي", en: "El Oued" },
  { id: 40, ar: "خنشلة", en: "Khenchela" },
  { id: 41, ar: "سوق أهراس", en: "Souk Ahras" },
  { id: 42, ar: "تيبازة", en: "Tipaza" },
  { id: 43, ar: "ميلة", en: "Mila" },
  { id: 44, ar: "عين الدفلى", en: "Aïn Defla" },
  { id: 45, ar: "النعامة", en: "Naâma" },
  { id: 46, ar: "عين تموشنت", en: "Aïn Témouchent" },
  { id: 47, ar: "غرداية", en: "Ghardaïa" },
  { id: 48, ar: "غليزان", en: "Relizane" },
  { id: 49, ar: "تيميمون", en: "Timimoun" },
  { id: 50, ar: "برج باجي مختار", en: "Bordj Badji Mokhtar" },
  { id: 51, ar: "أولاد جلال", en: "Ouled Djellal" },
  { id: 52, ar: "بني عباس", en: "Béni Abbès" },
  { id: 53, ar: "إن صالح", en: "In Salah" },
  { id: 54, ar: "إن قزام", en: "In Guezzam" },
  { id: 55, ar: "تقرت", en: "Touggourt" },
  { id: 56, ar: "جانت", en: "Djanet" },
  { id: 57, ar: "المغير", en: "El M'Ghair" },
  { id: 58, ar: "المنيعة", en: "El Meniaa" }
];

// ==========================================
// 6) DOM REFS
// ==========================================
const htmlEl = document.documentElement;
const bodyEl = document.body;

const langBtn = document.getElementById("lang-toggle");
const themeBtn = document.getElementById("theme-toggle");

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

// ==========================================
// 7) HELPERS
// ==========================================
function t(key) {
  return translations[state.lang]?.[key] || translations.en?.[key] || key;
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

function slugify(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w\u0600-\u06FF-]/g, "");
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
  return `${d.toLocaleDateString(state.lang === "ar" ? "ar-DZ" : "en-GB")} ${d.toLocaleTimeString(
    state.lang === "ar" ? "ar-DZ" : "en-GB",
    { hour: "2-digit", minute: "2-digit" }
  )}`;
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

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(email));
}

function getStatusMeta(status) {
  const map = {
    pending: { label: t("booking_status_pending"), cls: "pending", icon: "ph-hourglass-medium" },
    confirmed: { label: t("booking_status_confirmed"), cls: "confirmed", icon: "ph-check-circle" },
    cancelled: { label: t("booking_status_cancelled"), cls: "cancelled", icon: "ph-x-circle" },
    rejected: { label: t("booking_status_rejected"), cls: "cancelled", icon: "ph-x-circle" }
  };
  return map[String(status || "").toLowerCase()] || map.pending;
}

function showToast(message, type = "success") {
  let host = document.getElementById("global-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "global-toast-host";
    host.style.cssText = "position:fixed;top:20px;left:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,380px)";
    document.body.appendChild(host);
  }

  const cfgMap = {
    success: { bg: "#ecfdf5", border: "#10b981", text: "#047857", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "ph-info" }
  };
  const cfg = cfgMap[type] || cfgMap.info;

  const toast = document.createElement("div");
  toast.style.cssText = `background:${cfg.bg};border:1px solid ${cfg.border};color:${cfg.text};padding:14px 16px;border-radius:16px;box-shadow:0 14px 30px rgba(15,23,42,.12);font-weight:700;font-family:inherit;display:flex;align-items:flex-start;gap:10px;line-height:1.6`;
  toast.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.2rem;flex-shrink:0;margin-top:2px"></i><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ==========================================
// 8) PROPERTY NORMALIZATION / HANDOFF
// ==========================================
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

function isPropertyVisible(p = {}) {
  const status = String(p.status || p.propertyStatus || "").toLowerCase();

  if (p.visible === false) return false;
  if (p.hidden === true) return false;
  if (p.archived === true) return false;
  if (p.isArchived === true) return false;
  if (p.active === false) return false;
  if (p.isActive === false) return false;
  if (p.published === false) return false;
  if (p.isPublished === false) return false;
  if (["draft", "archived", "inactive", "rejected", "deleted"].includes(status)) return false;

  return true;
}

function normalizeProperty(p = {}, docId = "", collectionName = "") {
  const titleEn = p.title_en || p.titleEn || p.nameEn || p.title || "";
  const titleAr = p.title_ar || p.titleAr || p.nameAr || p.title || "";
  const locationEn = p.location_en || p.locationEn || p.cityEn || p.location || p.address || "";
  const locationAr = p.location_ar || p.locationAr || p.cityAr || p.location || p.address || "";

  const baseImage = p.image || p.imageUrl || p.mainImage || p.coverImage || "images/placeholder.jpg";
  const images = Array.isArray(p.images) && p.images.length ? p.images.filter(Boolean) : [baseImage];

  const customId = normalizeText(p.id);
  const realDocId = normalizeText(docId || p.docId || "");
  const navId = realDocId || customId || slugify(titleEn || titleAr || Date.now());

  const lat = p.lat ?? p.locationLat ?? p.latitude ?? p.coords?.lat ?? null;
  const lng = p.lng ?? p.locationLng ?? p.longitude ?? p.coords?.lng ?? null;

  return {
    id: navId,
    navId,
    docId: realDocId,
    customId,
    collection: collectionName || p.collection || "",
    title_en: titleEn,
    title_ar: titleAr,
    titleEn,
    titleAr,
    location_en: locationEn,
    location_ar: locationAr,
    locationEn,
    locationAr,
    price: Number(p.price || p.basePrice || p.pricePerNight || p.nightlyRate || 0),
    rating: Number(p.rating || p.avgRating || p.reviewScore || 4.8),
    image: baseImage,
    imageUrl: baseImage,
    images,
    urgency: p.urgency || null,
    desc_en: p.desc_en || p.descEn || p.descriptionEn || p.description || "",
    desc_ar: p.desc_ar || p.descAr || p.descriptionAr || p.description || "",
    features_en: Array.isArray(p.features_en) ? p.features_en : Array.isArray(p.featuresEn) ? p.featuresEn : Array.isArray(p.amenitiesEn) ? p.amenitiesEn : [],
    features_ar: Array.isArray(p.features_ar) ? p.features_ar : Array.isArray(p.featuresAr) ? p.featuresAr : Array.isArray(p.amenitiesAr) ? p.amenitiesAr : [],
    type: p.type || p.category || "",
    typeEn: p.typeEn || p.categoryEn || p.type || "",
    typeAr: p.typeAr || p.categoryAr || p.type || "",
    visible: p.visible !== false,
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null,
    lat: lat !== null && lat !== "" ? Number(lat) : null,
    lng: lng !== null && lng !== "" ? Number(lng) : null
  };
}

function getSourceProperties() {
  return state.liveProperties.length ? state.liveProperties : properties.map(p => normalizeProperty(p, p.id, "mock"));
}

function getPropertyTitle(property) {
  if (!property) return "";
  return state.lang === "ar"
    ? (property.title_ar || property.titleAr || property.title_en || property.titleEn || "")
    : (property.title_en || property.titleEn || property.title_ar || property.titleAr || "");
}

function getPropertyLocation(property) {
  if (!property) return "";
  return state.lang === "ar"
    ? (property.location_ar || property.locationAr || property.location_en || property.locationEn || "")
    : (property.location_en || property.locationEn || property.location_ar || property.locationAr || "");
}

function getPropertyDesc(property) {
  if (!property) return "";
  return state.lang === "ar"
    ? (property.desc_ar || property.descAr || property.desc_en || property.descEn || "")
    : (property.desc_en || property.descEn || property.desc_ar || property.descAr || "");
}

function getPropertyFeatures(property) {
  if (!property) return [];
  return state.lang === "ar"
    ? (property.features_ar || property.featuresAr || property.features_en || property.featuresEn || [])
    : (property.features_en || property.featuresEn || property.features_ar || property.featuresAr || []);
}

function getNavigationPropertyId(property) {
  if (!property) return "";
  return normalizeText(property.docId || property.navId || property.id || property.customId || "");
}

function rememberSelectedProperty(property) {
  if (!property) return;

  const navId = getNavigationPropertyId(property);
  const snapshot = {
    ...property,
    navId,
    rememberedAt: new Date().toISOString()
  };

  safeSet(STORAGE_KEYS.selectedPropertyId, navId);
  safeSet(STORAGE_KEYS.selectedPropertyDocId, normalizeText(property.docId || navId));
  safeJsonSet(STORAGE_KEYS.selectedPropertyData, snapshot);
  safeJsonSet(STORAGE_KEYS.oreSelectedProperty, snapshot);
  safeJsonSet(STORAGE_KEYS.bookingPropertySnapshot, snapshot);
}

function getStoredSelectedProperty() {
  return (
    safeJsonGet(STORAGE_KEYS.bookingPropertySnapshot, null) ||
    safeJsonGet(STORAGE_KEYS.selectedPropertyData, null) ||
    safeJsonGet(STORAGE_KEYS.oreSelectedProperty, null) ||
    null
  );
}

function getPropertyByAnyId(id) {
  const target = normalizeText(id);
  if (!target) return null;

  return getSourceProperties().find(p =>
    normalizeText(p.id) === target ||
    normalizeText(p.navId) === target ||
    normalizeText(p.docId) === target ||
    normalizeText(p.customId) === target
  ) || null;
}

function getUrlPropertyId() {
  const params = new URLSearchParams(window.location.search);
  return normalizeText(
    params.get("id") ||
    params.get("propertyId") ||
    params.get("listingId") ||
    safeGet(STORAGE_KEYS.selectedPropertyDocId, "") ||
    safeGet(STORAGE_KEYS.selectedPropertyId, "")
  );
}

function collectBookingContextFromPage() {
  const byId = id => document.getElementById(id);

  const checkIn =
    byId("check-in-date")?.value ||
    byId("arrival-date")?.value ||
    safeGet("booking_check_in", "");

  const checkOut =
    byId("check-out-date")?.value ||
    byId("departure-date")?.value ||
    safeGet("booking_check_out", "");

  const adults =
    byId("guest-adults")?.value ||
    byId("adult-count")?.value ||
    safeGet("booking_adults", "1");

  const children =
    byId("guest-children")?.value ||
    byId("children-count")?.value ||
    safeGet("booking_children", "0");

  const infants =
    byId("guest-infants")?.value ||
    byId("infants-count")?.value ||
    safeGet("booking_infants", "0");

  const guests = String(
    Math.max(1, toNumber(adults, 1)) +
    Math.max(0, toNumber(children, 0)) +
    Math.max(0, toNumber(infants, 0))
  );

  const payload = {
    checkIn: normalizeText(checkIn),
    checkOut: normalizeText(checkOut),
    adults: String(Math.max(1, toNumber(adults, 1))),
    children: String(Math.max(0, toNumber(children, 0))),
    infants: String(Math.max(0, toNumber(infants, 0))),
    guests
  };

  safeJsonSet(STORAGE_KEYS.bookingContext, payload);
  safeSet("booking_check_in", payload.checkIn);
  safeSet("booking_check_out", payload.checkOut);
  safeSet("booking_adults", payload.adults);
  safeSet("booking_children", payload.children);
  safeSet("booking_infants", payload.infants);
  safeSet("booking_guests", payload.guests);

  return payload;
}

// ==========================================
// 9) AUTH MODAL
// ==========================================
function openModal() {
  if (!authModal) return;
  authModal.classList.add("active");
  document.body.classList.add("modal-open");
  showMessage("", "");
}

function closeModal() {
  if (!authModal) return;
  authModal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

function switchForm(formType) {
  const forms = {
    login: document.getElementById("login-form"),
    register: document.getElementById("register-form"),
    forgot: document.getElementById("forgot-form")
  };

  Object.entries(forms).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("active", key === formType);
    el.style.display = key === formType ? "flex" : "none";
  });
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

function handleAuthButtonClick(e) {
  if (e) e.preventDefault();

  if (state.user) {
    profileDropdown?.classList.toggle("active");
  } else {
    switchForm("login");
    openModal();
  }
}

function updateUserUI() {
  const dropdownUserName = document.getElementById("dropdown-user-name");
  const dropdownUserEmail = document.getElementById("dropdown-user-email");
  const icon = openAuthBtn?.querySelector("i");

  if (state.user) {
    openAuthBtn?.classList.remove("auth-btn-guest");
    openAuthBtn?.classList.add("auth-btn-logged");
    if (icon) icon.className = "ph-fill ph-user-circle";
    if (dropdownUserName) dropdownUserName.textContent = state.user.displayName || t("user");
    if (dropdownUserEmail) dropdownUserEmail.textContent = state.user.email || "";
    closeModal();
  } else {
    openAuthBtn?.classList.remove("auth-btn-logged");
    openAuthBtn?.classList.add("auth-btn-guest");
    if (icon) icon.className = "ph ph-user";
    profileDropdown?.classList.remove("active");
    if (dropdownUserName) dropdownUserName.textContent = state.lang === "ar" ? "ضيف" : "Guest";
    if (dropdownUserEmail) dropdownUserEmail.textContent = "";
  }
}

async function handleLogin(e) {
  e.preventDefault();

  if (!auth) {
    showMessage("Auth is unavailable", "error");
    return;
  }

  const email = document.getElementById("login-email")?.value.trim();
  const password = document.getElementById("login-password")?.value;

  if (!email || !password) {
    showMessage(t("invalid_credentials"), "error");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast(t("login_success"), "success");
    showMessage("", "");
    loginForm?.reset();
    closeModal();
  } catch (error) {
    console.error("Login error:", error);
    showMessage(t("invalid_credentials"), "error");
  }
}

async function handleRegister(e) {
  e.preventDefault();

  if (!auth || !db) {
    showMessage("Auth is unavailable", "error");
    return;
  }

  const name = document.getElementById("reg-name")?.value.trim();
  const email = document.getElementById("reg-email")?.value.trim();
  const password = document.getElementById("reg-password")?.value;

  if (!name || !email || !password) {
    showMessage(state.lang === "ar" ? "يرجى تعبئة جميع الحقول" : "Please fill all fields", "error");
    return;
  }

  if (!validateEmail(email)) {
    showMessage(state.lang === "ar" ? "يرجى إدخال بريد صحيح" : "Please enter a valid email", "error");
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (cred?.user?.updateProfile) {
      await cred.user.updateProfile({ displayName: name });
    }

    await db.collection("users").doc(cred.user.uid).set({
      name,
      email,
      points: 1250,
      role: "guest",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showToast(t("register_success"), "success");
    showMessage("", "");
    registerForm?.reset();
    closeModal();
  } catch (error) {
    console.error("Register error:", error);
    showMessage(error.message || "Registration failed", "error");
  }
}

async function handleGoogleLogin() {
  if (!auth || !db) {
    showMessage("Auth is unavailable", "error");
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);

    if (result?.user) {
      const ref = db.collection("users").doc(result.user.uid);
      const snap = await ref.get();

      if (!snap.exists) {
        await ref.set({
          name: result.user.displayName || t("user"),
          email: result.user.email || "",
          points: 1250,
          role: "guest",
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }
    }

    closeModal();
    showToast(t("login_success"), "success");
  } catch (error) {
    console.error("Google login error:", error);
    showMessage(error.message || "Google sign-in failed", "error");
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();

  if (!auth) {
    showMessage("Auth is unavailable", "error");
    return;
  }

  const email = document.getElementById("forgot-email")?.value.trim();
  if (!email) {
    showMessage(state.lang === "ar" ? "يرجى إدخال البريد الإلكتروني" : "Please enter your email", "error");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    showMessage(t("reset_sent"), "success");
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

async function handleLogout() {
  if (!auth) return;
  try {
    await auth.signOut();
    profileDropdown?.classList.remove("active");
    showToast(t("logout_success"), "success");
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// ==========================================
// 10) FAVORITES
// ==========================================
async function loadFavorites() {
  if (!state.user || !db) {
    state.favorites = safeJsonGet(STORAGE_KEYS.favorites, []);
    return state.favorites;
  }

  try {
    const snap = await db.collection("users").doc(state.user.uid).get();
    const data = snap.data() || {};
    const serverFavs = Array.isArray(data.favorites) ? data.favorites.map(String) : [];
    state.favorites = serverFavs;
    safeJsonSet(STORAGE_KEYS.favorites, state.favorites);
  } catch (error) {
    console.error("loadFavorites error:", error);
    state.favorites = safeJsonGet(STORAGE_KEYS.favorites, []);
  }

  return state.favorites;
}

async function saveFavorites() {
  safeJsonSet(STORAGE_KEYS.favorites, state.favorites);

  if (state.user && db) {
    try {
      await db.collection("users").doc(state.user.uid).set({
        favorites: state.favorites,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error("saveFavorites error:", error);
    }
  }
}

async function toggleFavorite(propertyId) {
  const id = String(propertyId || "");
  if (!id) return;

  const exists = state.favorites.includes(id);
  if (exists) {
    state.favorites = state.favorites.filter(f => String(f) !== id);
    showToast(t("fav_removed"), "info");
  } else {
    state.favorites.push(id);
    showToast(t("fav_added"), "success");
  }

  await saveFavorites();
  renderListings();
}

window.toggleFavorite = toggleFavorite;

// ==========================================
// 11) PROPERTIES LOADING
// ==========================================
async function loadPropertiesFromFirestore() {
  state.loadingProperties = true;

  const gridExists = !!document.getElementById("listings-grid");
  if (gridExists) renderListings([], { loading: true });

  if (!db) {
    state.liveProperties = properties.map(p => normalizeProperty(p, p.id, "mock"));
    state.propertiesLoaded = true;
    state.loadingProperties = false;
    if (gridExists) renderListings();
    return state.liveProperties;
  }

  try {
    let loaded = [];
    let usedCollection = "";

    for (const collectionName of state.propertyCollectionCandidates) {
      try {
        const snap = await db.collection(collectionName).get();

        if (!snap.empty) {
          loaded = snap.docs
            .map(doc => normalizeProperty({ ...doc.data(), docId: doc.id }, doc.id, collectionName))
            .filter(isPropertyVisible);

          if (loaded.length) {
            usedCollection = collectionName;
            break;
          }
        }
      } catch (innerError) {
        console.warn(`Collection read failed: ${collectionName}`, innerError);
      }
    }

    if (!loaded.length) {
      loaded = properties.map(p => normalizeProperty(p, p.id, "mock"));
    }

    loaded.sort((a, b) => {
      const aDate = safeDateMs(a.createdAt || a.updatedAt);
      const bDate = safeDateMs(b.createdAt || b.updatedAt);
      if (aDate && bDate) return bDate - aDate;
      return Number(b.rating || 0) - Number(a.rating || 0);
    });

    state.liveProperties = loaded;
    state.propertiesLoaded = true;
    state.currentCollection = usedCollection;

    if (!usedCollection) {
      console.warn("No Firestore properties found, fallback data used.");
    } else {
      console.info(`Properties loaded from collection: ${usedCollection}`, loaded.length);
    }

    if (gridExists) renderListings();
    return state.liveProperties;
  } catch (error) {
    console.error("loadPropertiesFromFirestore error:", error);
    state.liveProperties = properties.map(p => normalizeProperty(p, p.id, "mock"));
    state.propertiesLoaded = true;
    if (gridExists) renderListings();
    showToast(t("property_load_error"), "info");
    return state.liveProperties;
  } finally {
    state.loadingProperties = false;
  }
}

async function loadSinglePropertyById(propertyId) {
  const id = normalizeText(propertyId);
  if (!id) return null;

  const inMemory = getPropertyByAnyId(id);
  if (inMemory) return inMemory;

  const stored = getStoredSelectedProperty();
  if (stored) {
    const normalizedStored = normalizeProperty(stored, stored.docId || stored.id || "", stored.collection || "");
    if (
      normalizeText(normalizedStored.id) === id ||
      normalizeText(normalizedStored.navId) === id ||
      normalizeText(normalizedStored.docId) === id ||
      normalizeText(normalizedStored.customId) === id
    ) {
      return normalizedStored;
    }
  }

  if (!db) return stored ? normalizeProperty(stored, stored.docId || stored.id || "", stored.collection || "") : null;

  for (const collectionName of state.propertyCollectionCandidates) {
    try {
      const directDoc = await db.collection(collectionName).doc(id).get();
      if (directDoc.exists) {
        const prop = normalizeProperty({ ...directDoc.data(), docId: directDoc.id }, directDoc.id, collectionName);
        if (isPropertyVisible(prop)) return prop;
      }
    } catch (error) {
      console.warn(`Direct doc lookup failed in ${collectionName}:`, error);
    }

    for (const fieldName of ["id", "customId", "slug"]) {
      try {
        const snap = await db.collection(collectionName).where(fieldName, "==", id).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const prop = normalizeProperty({ ...doc.data(), docId: doc.id }, doc.id, collectionName);
          if (isPropertyVisible(prop)) return prop;
        }
      } catch (error) {
        console.warn(`Field ${fieldName} lookup failed in ${collectionName}:`, error);
      }
    }
  }

  return stored ? normalizeProperty(stored, stored.docId || stored.id || "", stored.collection || "") : null;
}

// ==========================================
// 12) LISTINGS RENDER
// ==========================================
function renderCategories() {
  const container = document.getElementById("categories-container");
  if (!container) return;

  container.innerHTML = categories.map((cat, idx) => {
    const isAr = state.lang === "ar";
    const label = isAr ? cat.label_ar : cat.label_en;
    const isActive = state.activeCategory === cat.label_en;

    return `
      <button class="category-item ${isActive ? "active" : ""}" onclick="selectCategory('${escapeAttr(cat.label_en)}')" data-idx="${idx}" type="button">
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

    const filtered = getSourceProperties().filter(p => propertyMatchesCategory(p, state.activeCategory));
    renderListings(filtered);
    document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  } else if (!state.activeSearch) {
    resetToHome();
  } else {
    performSearch(state.activeSearch);
  }
};

function renderListings(list = null, options = {}) {
  const grid = document.getElementById("listings-grid");
  if (!grid) return;

  if (options.loading) {
    grid.innerHTML = `<div class="listings-empty-state"><i class="ph ph-spinner-gap ph-spin"></i><p>${escapeHtml(t("loading"))}</p></div>`;
    return;
  }

  let source = Array.isArray(list) ? list : getSourceProperties();

  if (state.currentView === "favorites") {
    source = source.filter(p => {
      const navId = getNavigationPropertyId(p);
      return state.favorites.includes(String(navId)) || state.favorites.includes(String(p.customId));
    });
  }

  if (state.activeCategory) {
    source = source.filter(p => propertyMatchesCategory(p, state.activeCategory));
  }

  if (state.activeSearch) {
    const q = state.activeSearch.toLowerCase();
    source = source.filter(p => {
      const haystack = [
        p.title_en, p.title_ar,
        p.location_en, p.location_ar,
        p.desc_en, p.desc_ar,
        p.type, p.typeEn, p.typeAr,
        ...(p.features_en || []),
        ...(p.features_ar || [])
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  if (!source.length) {
    const msg = state.currentView === "favorites"
      ? t("no_favorites")
      : state.activeSearch
      ? t("no_results")
      : t("no_props");

    grid.innerHTML = `<div class="listings-empty-state"><i class="ph ph-house-line"></i><p>${escapeHtml(msg)}</p></div>`;
    return;
  }

  grid.innerHTML = source.map(renderPropertyCard).join("");
}

function renderPropertyCard(property) {
  const title = getPropertyTitle(property);
  const location = getPropertyLocation(property);
  const navId = getNavigationPropertyId(property);
  const favorite = state.favorites.includes(String(navId)) || state.favorites.includes(String(property.customId));
  const urgencyKey = property.urgency === "few" ? "urgency_few" : property.urgency === "hot" ? "urgency_hot" : "";
  const urgencyText = urgencyKey ? t(urgencyKey) : "";
  const image = property.image || property.imageUrl || "images/placeholder.jpg";

  return `
    <article class="property-card" data-id="${escapeAttr(navId)}" tabindex="0" role="button" aria-label="${escapeAttr(title)}">
      <div class="property-card-media">
        <img src="${escapeAttr(image)}" alt="${escapeAttr(title)}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
        <button class="favorite-btn ${favorite ? "active" : ""}" type="button" data-id="${escapeAttr(navId)}" aria-label="Favorite">
          <i class="ph ${favorite ? "ph-fill ph-heart" : "ph-heart"}"></i>
        </button>
        ${urgencyText ? `<div class="property-urgency">${escapeHtml(urgencyText)}</div>` : ""}
      </div>

      <div class="property-card-body">
        <div class="property-card-top">
          <h3 class="property-card-title">${escapeHtml(title)}</h3>
          <div class="property-card-rating">
            <i class="ph ph-star-fill"></i>
            <span>${Number(property.rating || 0).toFixed(2)}</span>
          </div>
        </div>

        <div class="property-card-location">
          <i class="ph ph-map-pin"></i>
          <span>${escapeHtml(location)}</span>
        </div>

        <div class="property-card-price">
          <strong>${escapeHtml(formatCurrency(property.price))}</strong>
          <span>${escapeHtml(t("night"))}</span>
        </div>

        <div class="property-card-actions">
          <button class="view-details-btn" type="button" data-id="${escapeAttr(navId)}">${escapeHtml(t("view_details"))}</button>
          <button class="reserve-btn primary" type="button" data-id="${escapeAttr(navId)}">${escapeHtml(t("book_now"))}</button>
        </div>
      </div>
    </article>
  `;
}

// ==========================================
// 13) PROPERTY DETAILS / NAVIGATION
// ==========================================
function persistNavigationSelection(property) {
  if (!property) return;

  rememberSelectedProperty(property);
  collectBookingContextFromPage();

  safeSet("selectedPropertyTitle", getPropertyTitle(property));
  safeSet("selectedPropertyLocation", getPropertyLocation(property));
  safeSet("selectedPropertyPrice", String(property.price || 0));
  safeSet("selectedPropertyImage", property.image || property.imageUrl || "");
}

function openPropertyDetails(propertyId) {
  const property = getPropertyByAnyId(propertyId) || getStoredSelectedProperty();
  if (property) {
    persistNavigationSelection(property);
  } else {
    safeSet(STORAGE_KEYS.selectedPropertyId, String(propertyId));
    safeSet(STORAGE_KEYS.selectedPropertyDocId, String(propertyId));
  }

  const currentDetailShell = document.getElementById("property-details-container") || document.getElementById("property-details-view");

  if (currentDetailShell) {
    const params = new URLSearchParams(window.location.search);
    params.set("id", String(propertyId));
    history.replaceState({}, "", `${window.location.pathname}?${params.toString()}`);
    renderPropertyDetails();
  } else {
    window.location.href = `property.html?id=${encodeURIComponent(propertyId)}`;
  }
}

function goToBooking(propertyId) {
  const property = getPropertyByAnyId(propertyId) || getStoredSelectedProperty();
  const selected = property || { id: String(propertyId), docId: String(propertyId), navId: String(propertyId) };

  persistNavigationSelection(selected);

  const navId = getNavigationPropertyId(selected) || String(propertyId);
  const params = new URLSearchParams();
  params.set("id", navId);

  const ctx = collectBookingContextFromPage();
  if (ctx.checkIn) params.set("checkIn", ctx.checkIn);
  if (ctx.checkOut) params.set("checkOut", ctx.checkOut);
  if (ctx.adults) params.set("adults", ctx.adults);
  if (ctx.children) params.set("children", ctx.children);
  if (ctx.infants) params.set("infants", ctx.infants);
  if (ctx.guests) params.set("guests", ctx.guests);

  window.location.href = `booking.html?${params.toString()}`;
}

window.openPropertyDetails = openPropertyDetails;
window.goToBooking = goToBooking;

async function renderPropertyDetails() {
  const shell = document.getElementById("property-details-container") || document.getElementById("property-details-view");
  const pageTitleEl = document.getElementById("property-title");
  const hasDetailUI = !!shell || !!pageTitleEl;
  if (!hasDetailUI) return;

  const propertyId = getUrlPropertyId();
  if (!propertyId) return;

  let property = getPropertyByAnyId(propertyId);
  if (!property) property = await loadSinglePropertyById(propertyId);

  if (!property) {
    if (shell) {
      shell.innerHTML = `<div class="property-details-empty"><i class="ph ph-warning-circle"></i><p>${escapeHtml(t("property_not_found"))}</p></div>`;
    }
    return;
  }

  state.currentProperty = property;
  currentPropImages = Array.isArray(property.images) && property.images.length
    ? property.images
    : [property.image || property.imageUrl || "images/placeholder.jpg"];

  persistNavigationSelection(property);

  const title = getPropertyTitle(property);
  const location = getPropertyLocation(property);
  const desc = getPropertyDesc(property);
  const features = getPropertyFeatures(property);
  const price = formatCurrency(property.price);
  const reserveUrl = `booking.html?id=${encodeURIComponent(getNavigationPropertyId(property))}`;

  if (shell) {
    shell.innerHTML = `
      <div class="property-details-layout">
        <div class="property-gallery">
          <div class="property-gallery-main">
            <img id="detail-main-image" src="${escapeAttr(currentPropImages[0] || "images/placeholder.jpg")}" alt="${escapeAttr(title)}" onerror="this.src='images/placeholder.jpg'">
          </div>
          <div class="property-gallery-thumbs">
            ${currentPropImages.map((img, index) => `
              <button class="property-thumb ${index === 0 ? "active" : ""}" type="button" data-index="${index}">
                <img src="${escapeAttr(img)}" alt="${escapeAttr(title)} ${index + 1}" onerror="this.src='images/placeholder.jpg'">
              </button>
            `).join("")}
          </div>
        </div>

        <div class="property-content">
          <div class="property-head">
            <h1>${escapeHtml(title)}</h1>
            <div class="property-meta-line">
              <span><i class="ph ph-map-pin"></i> ${escapeHtml(location)}</span>
              <span><i class="ph ph-star-fill"></i> ${Number(property.rating || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="property-price-box">
            <strong>${escapeHtml(price)}</strong>
            <span>${escapeHtml(t("per_night"))}</span>
          </div>

          <section class="property-section">
            <h3>${escapeHtml(t("about_prop"))}</h3>
            <p>${escapeHtml(desc || "—")}</p>
          </section>

          <section class="property-section">
            <h3>${escapeHtml(t("what_offers"))}</h3>
            <div class="property-features-list">
              ${features.length ? features.map(f => `<span class="feature-chip">${escapeHtml(f)}</span>`).join("") : `<span class="feature-chip">—</span>`}
            </div>
          </section>

          <section class="property-section">
            <h3>${escapeHtml(t("location_on_map"))}</h3>
            <div class="property-map-box">
              ${
                property.lat != null && property.lng != null
                  ? `<iframe title="map" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://www.google.com/maps?q=${encodeURIComponent(property.lat + "," + property.lng)}&z=15&output=embed" style="width:100%;height:320px;border:0;border-radius:18px;"></iframe>`
                  : `<div class="property-map-placeholder">${escapeHtml(location || "—")}</div>`
              }
            </div>
          </section>

          <div class="property-action-box">
            <a href="${escapeAttr(reserveUrl)}" class="primary-btn detail-reserve-btn" id="detail-reserve-link">${escapeHtml(t("book_now"))}</a>
            <div class="property-sub-note">${escapeHtml(t("wont_charged"))}</div>
          </div>
        </div>
      </div>
    `;

    shell.querySelectorAll(".property-thumb").forEach(btn => {
      btn.addEventListener("click", () => {
        const index = Number(btn.getAttribute("data-index") || 0);
        state.currentImageIndex = index;
        const main = document.getElementById("detail-main-image");
        if (main) main.src = currentPropImages[index] || currentPropImages[0] || "images/placeholder.jpg";
        shell.querySelectorAll(".property-thumb").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    shell.querySelector("#detail-reserve-link")?.addEventListener("click", e => {
      e.preventDefault();
      goToBooking(getNavigationPropertyId(property));
    });
  }

  const detailTitle = document.getElementById("property-title");
  const detailLocation = document.getElementById("property-location");
  const detailPrice = document.getElementById("property-price");
  const detailRating = document.getElementById("property-rating");
  const detailDesc = document.getElementById("property-description");
  const detailFeatures = document.getElementById("property-features");
  const detailGallery = document.getElementById("property-gallery");
  const bookBtn = document.getElementById("book-now-btn");

  if (detailTitle) detailTitle.textContent = title;
  if (detailLocation) detailLocation.textContent = location;
  if (detailPrice) detailPrice.textContent = price;
  if (detailRating) detailRating.textContent = Number(property.rating || 0).toFixed(2);
  if (detailDesc) detailDesc.textContent = desc || "—";
  if (detailFeatures) {
    detailFeatures.innerHTML = features.length
      ? features.map(f => `<span class="feature-chip">${escapeHtml(f)}</span>`).join("")
      : `<span class="feature-chip">—</span>`;
  }
  if (detailGallery) {
    detailGallery.innerHTML = currentPropImages.map((img, index) => `
      <img src="${escapeAttr(img)}" alt="${escapeAttr(title)} ${index + 1}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
    `).join("");
  }
  if (bookBtn) {
    bookBtn.setAttribute("href", `booking.html?id=${encodeURIComponent(getNavigationPropertyId(property))}`);
    bookBtn.addEventListener("click", e => {
      e.preventDefault();
      goToBooking(getNavigationPropertyId(property));
    });
  }

  document.title = `${title} — OreBooking`;
}

// ==========================================
// 14) BOOKINGS MODAL
// ==========================================
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
  const arrival = normalizeText(getBookingField(data, ["arrivalTime", "arrivaltime", "expectedArrivalTime"], ""));
  const additionalGuests = normalizeText(getBookingField(data, ["additionalGuests", "additionalGuestNames"], ""));

  const bits = [];
  if (arrival) bits.push(`${state.lang === "ar" ? "الوصول" : "Arrival"}: ${arrival}`);
  if (special) bits.push(`${state.lang === "ar" ? "ملاحظات" : "Notes"}: ${special}`);
  if (additionalGuests) bits.push(`${state.lang === "ar" ? "ضيوف إضافيون" : "Additional guests"}: ${additionalGuests}`);

  return bits.join(" • ") || "—";
}

function getBookingAddons(data = {}) {
  const addOnLabels = {
    restaurant: state.lang === "ar" ? "مطعم" : "Restaurant",
    wifi: state.lang === "ar" ? "واي فاي" : "WiFi",
    spa: state.lang === "ar" ? "سبا" : "Spa",
    parking: state.lang === "ar" ? "موقف سيارات" : "Parking",
    airportTransfer: state.lang === "ar" ? "نقل مطار" : "Airport transfer",
    lateCheckout: state.lang === "ar" ? "خروج متأخر" : "Late checkout",
    extraBed: state.lang === "ar" ? "سرير إضافي" : "Extra bed",
    events: state.lang === "ar" ? "فعاليات" : "Events",
    breakfast: state.lang === "ar" ? "فطور" : "Breakfast",
    breakfastIncluded: state.lang === "ar" ? "فطور" : "Breakfast",
    babyCrib: state.lang === "ar" ? "سرير طفل" : "Baby crib",
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
    if (String(data.breakfastOption).toLowerCase() === "yes") derived.push("breakfast");
    if (String(data.airportTransfer).toLowerCase() !== "no" && String(data.airportTransfer).trim()) derived.push("airportTransfer");
    if (String(data.parkingNeeded).toLowerCase() !== "no" && String(data.parkingNeeded).trim()) derived.push("parking");
    if (String(data.lateCheckout).toLowerCase() === "yes") derived.push("lateCheckout");
    if (String(data.earlyCheckin).toLowerCase() === "yes") derived.push("earlyCheckin");
    if (String(data.babyCrib).toLowerCase() === "yes") derived.push("babyCrib");
    if (String(data.highChair).toLowerCase() === "yes") derived.push("highChair");
    if (String(data.accessibleRoom).toLowerCase() !== "no" && String(data.accessibleRoom).trim()) derived.push("accessibleRoom");
    addons = derived;
  }

  return addons.map(a => addOnLabels[a] || a);
}

function initBookingsModal() {
  let modal = document.getElementById("bookings-modal");
  if (modal) return;

  modal = document.createElement("div");
  modal.id = "bookings-modal";
  modal.className = "bookings-modal";
  modal.innerHTML = `
    <div class="bookings-modal-dialog">
      <div class="bookings-modal-header">
        <h3>${escapeHtml(t("bookings_title"))}</h3>
        <button type="button" id="close-bookings-modal-btn"><i class="ph ph-x"></i></button>
      </div>
      <div class="bookings-modal-body" id="bookings-modal-body">
        <div class="listings-empty-state"><i class="ph ph-spinner-gap ph-spin"></i><p>${escapeHtml(t("loading"))}</p></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  document.getElementById("close-bookings-modal-btn")?.addEventListener("click", closeBookingsModal);
}

function openBookingsModal() {
  const modal = document.getElementById("bookings-modal");
  if (modal) {
    modal.classList.add("active");
    document.body.classList.add("modal-open");
  }
}

function closeBookingsModal() {
  const modal = document.getElementById("bookings-modal");
  if (modal) {
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
  }
}

window.closeBookingsModal = closeBookingsModal;

function renderBookingCard(booking) {
  const status = getStatusMeta(booking.status);
  const propertyTitle = booking.propertyTitle || booking.propertyName || t("booking_property");
  const guestsMeta = getBookingGuestsMeta(booking);
  const addons = getBookingAddons(booking);
  const notes = getBookingNotes(booking);
  const propId = getBookingPropertyId(booking);

  return `
    <article class="booking-card">
      <div class="booking-card-head">
        <div>
          <h4>${escapeHtml(propertyTitle)}</h4>
          <div class="booking-card-sub">${escapeHtml(getBookingGuestName(booking))}</div>
        </div>
        <span class="booking-status ${escapeAttr(status.cls)}">
          <i class="ph ${escapeAttr(status.icon)}"></i>
          ${escapeHtml(status.label)}
        </span>
      </div>

      <div class="booking-card-grid">
        <div><strong>${escapeHtml(t("booking_dates"))}</strong> ${escapeHtml(formatDate(getBookingCheckIn(booking)))} — ${escapeHtml(formatDate(getBookingCheckOut(booking)))}</div>
        <div><strong>${escapeHtml(t("booking_guests"))}</strong> ${escapeHtml(String(guestsMeta.guests || 1))}</div>
        <div><strong>${escapeHtml(t("booking_total"))}</strong> ${escapeHtml(formatCurrency(booking.totalPrice || booking.total || booking.price || 0))}</div>
        <div><strong>${escapeHtml(t("booking_payment"))}</strong> ${escapeHtml(booking.paymentMethod || booking.paymentValue || "—")}</div>
        <div><strong>${escapeHtml(t("booking_created"))}</strong> ${escapeHtml(formatDateTime(booking.createdAt))}</div>
        <div><strong>${escapeHtml(t("booking_notes"))}</strong> ${escapeHtml(notes)}</div>
        <div><strong>${escapeHtml(t("booking_addons"))}</strong> ${escapeHtml(addons.length ? addons.join(", ") : "—")}</div>
        <div><strong>${escapeHtml(t("guest"))}</strong> ${escapeHtml(getBookingEmail(booking))}</div>
      </div>

      ${propId ? `
        <div class="booking-card-actions">
          <button class="view-details-btn" type="button" data-id="${escapeAttr(propId)}">${escapeHtml(t("view_details"))}</button>
        </div>
      ` : ""}
    </article>
  `;
}

async function showMyBookings() {
  if (!state.user) {
    showToast(t("auth_required"), "info");
    openModal();
    return;
  }

  openBookingsModal();

  const body = document.getElementById("bookings-modal-body");
  if (body) {
    body.innerHTML = `<div class="listings-empty-state"><i class="ph ph-spinner-gap ph-spin"></i><p>${escapeHtml(t("loading"))}</p></div>`;
  }

  if (!db) {
    if (body) {
      body.innerHTML = `<div class="listings-empty-state"><i class="ph ph-calendar-x"></i><p>${escapeHtml(t("no_bookings"))}</p></div>`;
    }
    return;
  }

  try {
    const [byUid, byEmail] = await Promise.all([
      db.collection("bookings").where("authUid", "==", state.user.uid).get().catch(() => ({ docs: [] })),
      state.user.email
        ? db.collection("bookings").where("guestEmail", "==", state.user.email).get().catch(() => ({ docs: [] }))
        : Promise.resolve({ docs: [] })
    ]);

    const map = new Map();
    [...byUid.docs, ...byEmail.docs].forEach(doc => {
      map.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const bookings = [...map.values()].sort((a, b) => safeDateMs(b.createdAt) - safeDateMs(a.createdAt));

    if (!body) return;

    if (!bookings.length) {
      body.innerHTML = `<div class="listings-empty-state"><i class="ph ph-calendar-x"></i><p>${escapeHtml(t("no_bookings"))}</p></div>`;
      return;
    }

    body.innerHTML = bookings.map(renderBookingCard).join("");
    body.querySelectorAll(".view-details-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const propId = btn.getAttribute("data-id");
        if (propId) {
          closeBookingsModal();
          openPropertyDetails(propId);
        }
      });
    });
  } catch (error) {
    console.error("showMyBookings error:", error);
    if (body) {
      body.innerHTML = `<div class="listings-empty-state"><i class="ph ph-warning-circle"></i><p>${escapeHtml(state.lang === "ar" ? "خطأ أثناء تحميل الحجوزات" : "Error loading bookings")}</p></div>`;
    }
  }
}

// ==========================================
// 15) SEARCH / HOME HELPERS
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
    sectionTitle.textContent = t("trending");
  }

  document.querySelectorAll(".mob-nav-btn").forEach(b => b.classList.remove("active"));
  document.querySelector(".mob-nav-btn[data-target='home']")?.classList.add("active");

  renderCategories();
  renderListings();
}

function initClearSearchBtn() {
  const clearBtn = document.getElementById("clear-search-btn");
  if (!clearBtn || clearBtn.dataset.bound) return;
  clearBtn.dataset.bound = "1";
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

function initSmartSearch() {
  const searchInput = document.getElementById("search-location");
  const searchDropdown = document.getElementById("search-dropdown");
  const searchBtn = document.getElementById("main-search-btn");

  if (!searchInput || !searchDropdown) return;

  searchInput.setAttribute("placeholder", t("search_hint"));

  const renderSuggestions = (query = "") => {
    const q = normalizeText(query).toLowerCase();
    const source = getSourceProperties();

    const wilayaMatches = algerianWilayas
      .filter(w => {
        if (!q) return true;
        return w.en.toLowerCase().includes(q) || w.ar.includes(query);
      })
      .slice(0, 8)
      .map(w => ({
        type: "wilaya",
        label: state.lang === "ar" ? w.ar : w.en,
        value: state.lang === "ar" ? w.ar : w.en,
        subtitle: t("all_wilayas_sub")
      }));

    const propertyMatches = source
      .filter(p => {
        if (!q) return true;
        const title = `${p.title_en} ${p.title_ar}`.toLowerCase();
        const location = `${p.location_en} ${p.location_ar}`.toLowerCase();
        return title.includes(q) || location.includes(q);
      })
      .slice(0, 6)
      .map(p => ({
        type: "property",
        label: getPropertyTitle(p),
        value: getPropertyTitle(p),
        subtitle: getPropertyLocation(p),
        id: getNavigationPropertyId(p)
      }));

    const merged = [...wilayaMatches, ...propertyMatches].slice(0, 10);

    searchDropdown.innerHTML = merged.length
      ? merged.map(item => `
        <button class="search-suggestion-item" type="button" data-type="${escapeAttr(item.type)}" data-value="${escapeAttr(item.value)}" ${item.id ? `data-id="${escapeAttr(item.id)}"` : ""}>
          <div class="search-suggestion-main">${escapeHtml(item.label)}</div>
          <div class="search-suggestion-sub">${escapeHtml(item.subtitle || "")}</div>
        </button>
      `).join("")
      : `<div class="search-empty">${escapeHtml(t("no_results"))}</div>`;

    searchDropdown.classList.add("active");

    searchDropdown.querySelectorAll(".search-suggestion-item").forEach(btn => {
      btn.addEventListener("click", () => {
        const type = btn.getAttribute("data-type");
        const value = btn.getAttribute("data-value") || "";
        const id = btn.getAttribute("data-id") || "";

        if (type === "property" && id) {
          openPropertyDetails(id);
          return;
        }

        searchInput.value = value;
        searchDropdown.classList.remove("active");
        performSearch(value);
      });
    });
  };

  if (!searchInput.dataset.bound) {
    searchInput.dataset.bound = "1";

    searchInput.addEventListener("focus", () => renderSuggestions(searchInput.value));
    searchInput.addEventListener("input", () => renderSuggestions(searchInput.value));
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        performSearch(searchInput.value);
        searchDropdown.classList.remove("active");
      }
    });
  }

  if (searchBtn && !searchBtn.dataset.bound) {
    searchBtn.dataset.bound = "1";
    searchBtn.addEventListener("click", () => {
      performSearch(searchInput.value);
      searchDropdown.classList.remove("active");
    });
  }
}

function performSearch(rawQuery = "") {
  const query = normalizeText(rawQuery);
  state.activeSearch = query;
  state.currentView = "search";
  state.activeCategory = null;

  const hero = document.getElementById("hero-section");
  const cats = document.getElementById("categories-container");
  if (hero) hero.style.display = "none";
  if (cats) cats.style.display = "none";

  showClearSearchBtn();

  const sectionTitle = document.getElementById("section-main-title");
  if (sectionTitle) {
    sectionTitle.removeAttribute("data-i18n");
    sectionTitle.textContent = t("search_results");
  }

  const q = query.toLowerCase();
  const filtered = getSourceProperties().filter(p => {
    if (!q) return true;
    const haystack = [
      p.title_en, p.title_ar,
      p.location_en, p.location_ar,
      p.desc_en, p.desc_ar,
      p.type, p.typeEn, p.typeAr,
      ...(p.features_en || []),
      ...(p.features_ar || [])
    ].join(" ").toLowerCase();

    return haystack.includes(q);
  });

  renderListings(filtered);
  document.getElementById("listings-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ==========================================
// 16) PASSWORD UI
// ==========================================
function calcPasswordStrength(val) {
  if (!val) return 0;
  if (val.length < 6) return 1;
  let score = 1;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val) || /[a-z]/.test(val)) score++;
  if (/[0-9]/.test(val) || /[^A-Za-z0-9]/.test(val)) score++;
  return Math.min(score, 4);
}

function initPasswordToggles() {
  document.querySelectorAll(".toggle-pass-btn").forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
      const input = btn.closest(".pass-wrapper")?.querySelector("input") || btn.parentElement?.querySelector("input");
      if (!input) return;
      const isText = input.type === "text";
      input.type = isText ? "password" : "text";
      btn.innerHTML = isText ? `<i class="ph ph-eye"></i>` : `<i class="ph ph-eye-slash"></i>`;
    });
  });
}

function initPasswordStrength() {
  const input = document.getElementById("reg-password");
  const wrapper = document.getElementById("password-strength");
  const label = document.getElementById("strength-label");
  const barsEl = wrapper?.querySelectorAll(".str-bar");

  if (!input || !wrapper || !barsEl?.length || input.dataset.boundStrength) return;
  input.dataset.boundStrength = "1";

  const render = () => {
    const val = input.value;
    const score = calcPasswordStrength(val);
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
    const labels = {
      en: ["", "Weak", "Fair", "Good", "Strong"],
      ar: ["", "ضعيفة", "مقبولة", "جيدة", "قوية"]
    };

    wrapper.style.display = val.length ? "block" : "none";
    barsEl.forEach((bar, i) => {
      bar.style.background = i < score ? colors[Math.max(score - 1, 0)] : "var(--border-color)";
    });

    if (label) {
      label.textContent = val.length ? labels[state.lang][score] : "";
      label.style.color = score > 0 ? colors[Math.max(score - 1, 0)] : "var(--text-muted)";
    }
  };

  input.addEventListener("input", render);
  render();
}

// ==========================================
// 17) THEME / LANGUAGE / I18N
// ==========================================
function updateThemeIcon() {
  const icon = themeBtn?.querySelector("i");
  if (icon) icon.className = state.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
}

function updateLangButton() {
  const label = langBtn?.querySelector("span");
  if (label) label.textContent = state.lang === "ar" ? "EN" : "AR";
}

function applyTranslations() {
  const dict = translations[state.lang] || translations.en;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key && dict[key] !== undefined) el.textContent = dict[key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && dict[key] !== undefined) el.setAttribute("placeholder", dict[key]);
  });
}

function applyInitialState() {
  htmlEl.lang = state.lang;
  htmlEl.dir = state.lang === "ar" ? "rtl" : "ltr";
  bodyEl.classList.toggle("dark", state.theme === "dark");
  updateThemeIcon();
  updateLangButton();
  applyTranslations();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  safeSet("ore_theme", state.theme);
  bodyEl.classList.toggle("dark", state.theme === "dark");
  updateThemeIcon();
}

function toggleLanguage() {
  state.lang = state.lang === "ar" ? "en" : "ar";
  safeSet("ore_lang", state.lang);
  applyInitialState();
  renderCategories();
  renderListings();
  renderPropertyDetails();
  updateUserUI();
  initPasswordStrength();

  const sectionTitle = document.getElementById("section-main-title");
  if (sectionTitle) {
    if (state.currentView === "home") {
      sectionTitle.setAttribute("data-i18n", "trending");
      sectionTitle.textContent = t("trending");
    } else if (state.currentView === "favorites") {
      sectionTitle.removeAttribute("data-i18n");
      sectionTitle.textContent = t("my_favorites");
    } else if (state.currentView === "search") {
      sectionTitle.removeAttribute("data-i18n");
      sectionTitle.textContent = t("search_results");
    }
  }

  const searchInput = document.getElementById("search-location");
  if (searchInput) searchInput.setAttribute("placeholder", t("search_hint"));
}

// ==========================================
// 18) SCROLL / MOBILE / PLACEHOLDERS
// ==========================================
function initScrollTopBtn() {
  const btn = document.getElementById("scroll-top-btn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";

  window.addEventListener("scroll", () => {
    btn.classList.toggle("visible", window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

function initMobileNav() {
  const nav = document.getElementById("mobile-bottom-nav");
  if (!nav || nav.dataset.bound) return;
  nav.dataset.bound = "1";

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

function initSliderTouch() {
  return;
}

function closeLightbox() {
  document.getElementById("lightbox")?.classList.remove("active");
}

// ==========================================
// 19) GLOBAL BINDINGS
// ==========================================
function bindGlobalEvents() {
  if (langBtn && !langBtn.dataset.bound) {
    langBtn.dataset.bound = "1";
    langBtn.addEventListener("click", toggleLanguage);
  }

  if (themeBtn && !themeBtn.dataset.bound) {
    themeBtn.dataset.bound = "1";
    themeBtn.addEventListener("click", toggleTheme);
  }

  if (openAuthBtn && !openAuthBtn.dataset.bound) {
    openAuthBtn.dataset.bound = "1";
    openAuthBtn.addEventListener("click", handleAuthButtonClick);
  }

  if (closeAuthBtn && !closeAuthBtn.dataset.bound) {
    closeAuthBtn.dataset.bound = "1";
    closeAuthBtn.addEventListener("click", closeModal);
  }

  if (homeLogoBtn && !homeLogoBtn.dataset.bound) {
    homeLogoBtn.dataset.bound = "1";
    homeLogoBtn.addEventListener("click", e => {
      if (document.getElementById("hero-section")) {
        e.preventDefault();
        resetToHome();
      }
    });
  }

  if (myFavoritesBtn && !myFavoritesBtn.dataset.bound) {
    myFavoritesBtn.dataset.bound = "1";
    myFavoritesBtn.addEventListener("click", () => {
      profileDropdown?.classList.remove("active");
      state.currentView = "favorites";

      const hero = document.getElementById("hero-section");
      const cats = document.getElementById("categories-container");
      if (hero) hero.style.display = "none";
      if (cats) cats.style.display = "none";

      hideClearSearchBtn();

      const sectionTitle = document.getElementById("section-main-title");
      if (sectionTitle) {
        sectionTitle.removeAttribute("data-i18n");
        sectionTitle.textContent = t("my_favorites");
      }

      renderListings();
    });
  }

  if (myBookingsBtn && !myBookingsBtn.dataset.bound) {
    myBookingsBtn.dataset.bound = "1";
    myBookingsBtn.addEventListener("click", () => {
      profileDropdown?.classList.remove("active");
      showMyBookings();
    });
  }

  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "1";
    logoutBtn.addEventListener("click", handleLogout);
  }

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

  if (loginForm && !loginForm.dataset.bound) {
    loginForm.dataset.bound = "1";
    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm && !registerForm.dataset.bound) {
    registerForm.dataset.bound = "1";
    registerForm.addEventListener("submit", handleRegister);
  }

  if (forgotForm && !forgotForm.dataset.bound) {
    forgotForm.dataset.bound = "1";
    forgotForm.addEventListener("submit", handleForgotPassword);
  }

  document.getElementById("google-login-btn")?.addEventListener("click", handleGoogleLogin);
  document.getElementById("google-register-btn")?.addEventListener("click", handleGoogleLogin);

  window.addEventListener("click", e => {
    if (authModal && e.target === authModal) closeModal();

    if (profileDropdown && !e.target.closest(".profile-container")) {
      profileDropdown.classList.remove("active");
    }

    const searchDropdown = document.getElementById("search-dropdown");
    if (
      searchDropdown &&
      !e.target.closest("#search-dropdown") &&
      !e.target.closest("#search-location")
    ) {
      searchDropdown.classList.remove("active");
    }

    const favBtn = e.target.closest(".favorite-btn");
    if (favBtn) {
      const propId = favBtn.getAttribute("data-id");
      if (propId) toggleFavorite(propId);
      return;
    }

    const reserveBtn = e.target.closest(".reserve-btn");
    if (reserveBtn) {
      const propId = res لكن بلا ما تحس روحك في الصحd");
      if (propId) goToBooking(propId);
      return;
    }

    const detailsBtn = e.target.closest(".view-details-btn");
    if (detailsBtn) {
      const propId = detailsBtn.getAttribute("data-id");
      if (propId) openPropertyDetails(propId);
      return;
    }

    const card = e.target.closest(".property-card");
    if (card) {
      const propId = card.getAttribute("data-id");
      if (propId) openPropertyDetails(propId);
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;

    const lb = document.getElementById("lightbox");
    const bookingsModal = document.getElementById("bookings-modal");
    const sd = document.getElementById("search-dropdown");

    if (lb && lb.classList.contains("active")) {
      closeLightbox();
    } else if (bookingsModal && bookingsModal.classList.contains("active")) {
      closeBookingsModal();
    } else if (authModal && authModal.classList.contains("active")) {
      closeModal();
    }

    if (sd) sd.classList.remove("active");
  });
}

// ==========================================
// 20) INIT
// ==========================================
async function init() {
  if (state.initialized) return;
  state.initialized = true;

  applyInitialState();
  initScrollTopBtn();
  initMobileNav();
  initSliderTouch();
  initPasswordToggles();
  initPasswordStrength();
  initBookingsModal();
  bindGlobalEvents();

  const hasListingsUI = !!document.getElementById("categories-container");
  const hasDetailUI = !!document.getElementById("property-details-container") || !!document.getElementById("property-details-view") || !!document.getElementById("property-title");

  if (hasListingsUI) {
    renderCategories();
    renderListings([], { loading: true });
    await loadPropertiesFromFirestore();
    initSmartSearch();
    initClearSearchBtn();
  } else if (hasDetailUI) {
    await loadPropertiesFromFirestore();
    await renderPropertyDetails();
  } else {
    await loadPropertiesFromFirestore();
  }

  if (auth) {
    auth.onAuthStateChanged(async user => {
      state.user = user;
      await loadFavorites();
      updateUserUI();
      renderListings();
    });
  } else {
    await loadFavorites();
    updateUserUI();
    renderListings();
  }

  if (!firebaseReady) {
    console.warn("Firebase is not fully available. Using fallback mode.");
  }
}

document.addEventListener("DOMContentLoaded", init);
