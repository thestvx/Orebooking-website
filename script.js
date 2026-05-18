"use strict";

/* =========================================
   OreBooking - script.js
   Clean fixed version for homepage, auth,
   listings, favorites, search and bookings
========================================= */

// =========================================
// 1) SAFE STORAGE
// =========================================
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

// =========================================
// 2) FIREBASE
// =========================================
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
    firebaseReady = !!(auth && db);
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

// =========================================
// 3) STATE
// =========================================
const STORAGE_KEYS = {
  lang: "ore_lang",
  theme: "ore_theme",
  favorites: "ore_favorites",
  selectedPropertyId: "selectedPropertyId",
  selectedPropertyDocId: "selectedPropertyDocId",
  selectedPropertyData: "selectedPropertyData",
  oreSelectedProperty: "ore_selected_property",
  bookingPropertySnapshot: "booking_property_snapshot",
  bookingContext: "booking_context"
};

const state = {
  initialized: false,
  lang: safeGet(STORAGE_KEYS.lang, "en") || "en",
  theme: safeGet(STORAGE_KEYS.theme, "light") || "light",
  favorites: safeJsonGet(STORAGE_KEYS.favorites, []),
  user: null,
  currentView: "home",
  activeSearch: "",
  activeCategory: null,
  liveProperties: [],
  loadingProperties: false,
  propertiesLoaded: false,
  currentCollection: "",
  propertyCollectionCandidates: ["properties", "listings", "propertyListings", "stays", "hotels"]
};

// =========================================
// 4) TRANSLATIONS
// =========================================
const translations = {
  en: {
    heroTitle: "Find your next perfect stay",
    heroSubtitle: "Discover premium apartments, villas, and unique homes around the world.",
    location: "Location",
    locationPlaceholder: "Where are you going?",
    dates: "Dates",
    datesPlaceholder: "Add dates",
    guests: "Guests",
    guestsPlaceholder: "Add guests",
    search: "Search",
    trending: "Trending Destinations",
    searchResults: "Search Results",
    pts: "Pts",
    night: "night",
    allWilayas: "All Wilayas",
    allWilayasSub: "Show all properties",
    noResults: "No results found",
    noProps: "No properties available yet.",
    loading: "Loading properties...",
    clearSearch: "Clear Search",
    myFavorites: "My Favorites",
    noFavorites: "You haven't saved any favorites yet.",
    authRequired: "Please log in first",
    favAdded: "Added to favorites",
    favRemoved: "Removed from favorites",
    welcomeBack: "Welcome back",
    loginDesc: "Enter your details to access your account.",
    registerDesc: "Join OreBooking to unlock premium features.",
    createAccount: "Create an account",
    signIn: "Sign In",
    signUp: "Sign up",
    signUpBtn: "Create Account",
    forgotPass: "Forgot password?",
    rememberMe: "Remember me",
    email: "Email Address",
    password: "Password",
    fullName: "Full Name",
    resetPassTitle: "Reset Password",
    resetPassDesc: "Enter your email and we'll send you a reset link.",
    sendLink: "Send Reset Link",
    backToLogin: "Back to login",
    resetSent: "Reset link sent! Check your inbox.",
    invalidCredentials: "Invalid email or password",
    loginSuccess: "Login successful",
    registerSuccess: "Account created successfully",
    logoutSuccess: "Logged out successfully",
    developedBy: "Developed by",
    myBookings: "My Bookings",
    noBookings: "You have no bookings yet.",
    bookingProperty: "Property",
    bookingDates: "Dates",
    bookingGuests: "Guests",
    bookingTotal: "Total",
    bookingPayment: "Payment",
    bookingCreated: "Created",
    bookingNotes: "Notes",
    statusPending: "Pending",
    statusConfirmed: "Confirmed",
    statusCancelled: "Cancelled",
    statusRejected: "Rejected",
    viewDetails: "View Details",
    reserveNow: "Reserve Now",
    propertyLoadError: "Could not load live properties. Showing fallback data.",
    searchHint: "Search by city, wilaya, or property name",
    user: "User",
    guest: "Guest",
    supportChat: "Support Chat"
  },
  ar: {
    heroTitle: "اكتشف إقامتك المثالية القادمة",
    heroSubtitle: "اكتشف شققاً فاخرة، فلل، ومنازل فريدة حول العالم.",
    location: "الموقع",
    locationPlaceholder: "إلى أين ستذهب؟",
    dates: "التواريخ",
    datesPlaceholder: "أضف التواريخ",
    guests: "الضيوف",
    guestsPlaceholder: "أضف الضيوف",
    search: "بحث",
    trending: "الوجهات الشائعة",
    searchResults: "نتائج البحث",
    pts: "نقطة",
    night: "ليلة",
    allWilayas: "كل الولايات",
    allWilayasSub: "عرض جميع العقارات",
    noResults: "لا توجد نتائج مطابقة",
    noProps: "لا توجد عقارات متاحة بعد.",
    loading: "جارٍ تحميل العقارات...",
    clearSearch: "إلغاء البحث",
    myFavorites: "مفضلتي",
    noFavorites: "لا توجد أي عقارات في مفضلتك بعد.",
    authRequired: "يرجى تسجيل الدخول أولاً",
    favAdded: "تمت الإضافة للمفضلة",
    favRemoved: "تمت الإزالة من المفضلة",
    welcomeBack: "مرحباً بعودتك",
    loginDesc: "أدخل بياناتك للوصول إلى حسابك.",
    registerDesc: "انضم إلى OreBooking لفتح ميزات حصرية.",
    createAccount: "إنشاء حساب جديد",
    signIn: "تسجيل الدخول",
    signUp: "إنشاء حساب",
    signUpBtn: "إنشاء الحساب",
    forgotPass: "نسيت كلمة المرور؟",
    rememberMe: "تذكرني",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    resetPassTitle: "استعادة كلمة المرور",
    resetPassDesc: "أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة.",
    sendLink: "إرسال الرابط",
    backToLogin: "العودة لتسجيل الدخول",
    resetSent: "تم الإرسال! تحقق من بريدك الإلكتروني.",
    invalidCredentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    loginSuccess: "تم تسجيل الدخول بنجاح",
    registerSuccess: "تم إنشاء الحساب بنجاح",
    logoutSuccess: "تم تسجيل الخروج بنجاح",
    developedBy: "تم تطوير هذا الموقع من قبل",
    myBookings: "حجوزاتي",
    noBookings: "ليس لديك أي حجوزات بعد.",
    bookingProperty: "العقار",
    bookingDates: "التواريخ",
    bookingGuests: "الضيوف",
    bookingTotal: "الإجمالي",
    bookingPayment: "الدفع",
    bookingCreated: "تاريخ الإنشاء",
    bookingNotes: "الملاحظات",
    statusPending: "قيد الانتظار",
    statusConfirmed: "مؤكد",
    statusCancelled: "ملغي",
    statusRejected: "مرفوض",
    viewDetails: "عرض التفاصيل",
    reserveNow: "احجز الآن",
    propertyLoadError: "تعذر تحميل العقارات المباشرة، تم عرض البيانات البديلة.",
    searchHint: "ابحث بالمدينة أو الولاية أو اسم العقار",
    user: "مستخدم",
    guest: "ضيف",
    supportChat: "دعم المحادثة"
  }
};

function t(key) {
  return translations[state.lang]?.[key] || translations.en?.[key] || key;
}

// =========================================
// 5) STATIC DATA
// =========================================
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
    desc_en:
      "Where to find peace and comfort as if you are away from the bustle. At Palm Garden you will find comfortable rooms, breakfast, green lawns, and a safe family space.",
    desc_ar:
      "مكان تلقى فيه الهدوء والراحة بعيد عن الصخب، مع غرف مريحة، فطور صباحي، قازون أخضر، وفضاء عائلي آمن.",
    features_en: ["Single & Family Rooms", "Breakfast Included", "Green Lawn", "Safe Family Space"],
    features_ar: ["غرف فردية وعائلية", "فطور صباحي", "قازون أخضر", "فضاء عائلي آمن"],
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
    features_en: ["2 Bedrooms", "Equipped Kitchen", "Fireplace"],
    features_ar: ["غرفتا نوم", "مطبخ مجهز", "مدفأة"],
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
  { id: 6, ar: "بجاية", en: "Bejaia" },
  { id: 7, ar: "بسكرة", en: "Biskra" },
  { id: 8, ar: "بشار", en: "Bechar" },
  { id: 9, ar: "البليدة", en: "Blida" },
  { id: 10, ar: "البويرة", en: "Bouira" },
  { id: 11, ar: "تمنراست", en: "Tamanrasset" },
  { id: 12, ar: "تبسة", en: "Tebessa" },
  { id: 13, ar: "تلمسان", en: "Tlemcen" },
  { id: 14, ar: "تيارت", en: "Tiaret" },
  { id: 15, ar: "تيزي وزو", en: "Tizi Ouzou" },
  { id: 16, ar: "الجزائر", en: "Algiers" },
  { id: 17, ar: "الجلفة", en: "Djelfa" },
  { id: 18, ar: "جيجل", en: "Jijel" },
  { id: 19, ar: "سطيف", en: "Setif" },
  { id: 20, ar: "سعيدة", en: "Saida" },
  { id: 21, ar: "سكيكدة", en: "Skikda" },
  { id: 22, ar: "سيدي بلعباس", en: "Sidi Bel Abbes" },
  { id: 23, ar: "عنابة", en: "Annaba" },
  { id: 24, ar: "قالمة", en: "Guelma" },
  { id: 25, ar: "قسنطينة", en: "Constantine" },
  { id: 26, ar: "المدية", en: "Medea" },
  { id: 27, ar: "مستغانم", en: "Mostaganem" },
  { id: 28, ar: "المسيلة", en: "M'Sila" },
  { id: 29, ar: "معسكر", en: "Mascara" },
  { id: 30, ar: "ورقلة", en: "Ouargla" },
  { id: 31, ar: "وهران", en: "Oran" },
  { id: 32, ar: "البيض", en: "El Bayadh" },
  { id: 33, ar: "إليزي", en: "Illizi" },
  { id: 34, ar: "برج بوعريريج", en: "Bordj Bou Arreridj" },
  { id: 35, ar: "بومرداس", en: "Boumerdes" },
  { id: 36, ar: "الطارف", en: "El Tarf" },
  { id: 37, ar: "تندوف", en: "Tindouf" },
  { id: 38, ar: "تيسمسيلت", en: "Tissemsilt" },
  { id: 39, ar: "الوادي", en: "El Oued" },
  { id: 40, ar: "خنشلة", en: "Khenchela" },
  { id: 41, ar: "سوق أهراس", en: "Souk Ahras" },
  { id: 42, ar: "تيبازة", en: "Tipaza" },
  { id: 43, ar: "ميلة", en: "Mila" },
  { id: 44, ar: "عين الدفلى", en: "Ain Defla" },
  { id: 45, ar: "النعامة", en: "Naama" },
  { id: 46, ar: "عين تموشنت", en: "Ain Temouchent" },
  { id: 47, ar: "غرداية", en: "Ghardaia" },
  { id: 48, ar: "غليزان", en: "Relizane" },
  { id: 49, ar: "تيميمون", en: "Timimoun" },
  { id: 50, ar: "برج باجي مختار", en: "Bordj Badji Mokhtar" },
  { id: 51, ar: "أولاد جلال", en: "Ouled Djellal" },
  { id: 52, ar: "بني عباس", en: "Beni Abbes" },
  { id: 53, ar: "إن صالح", en: "In Salah" },
  { id: 54, ar: "إن قزام", en: "In Guezzam" },
  { id: 55, ar: "تقرت", en: "Touggourt" },
  { id: 56, ar: "جانت", en: "Djanet" },
  { id: 57, ar: "المغير", en: "El M'Ghair" },
  { id: 58, ar: "المنيعة", en: "El Meniaa" }
];

// =========================================
// 6) DOM REFS
// =========================================
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

const sortSelect = document.getElementById("sort-select");
const listingsGrid = document.getElementById("listings-grid");
const searchInput = document.getElementById("search-location");
const searchDropdown = document.getElementById("search-dropdown");
const searchBtn = document.getElementById("main-search-btn");

// =========================================
// 7) HELPERS
// =========================================
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

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(email));
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
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(state.lang === "ar" ? "ar-DZ" : "en-GB");
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

function getStatusMeta(status) {
  const map = {
    pending: { label: t("statusPending"), cls: "pending", icon: "ph-hourglass-medium" },
    confirmed: { label: t("statusConfirmed"), cls: "confirmed", icon: "ph-check-circle" },
    cancelled: { label: t("statusCancelled"), cls: "cancelled", icon: "ph-x-circle" },
    rejected: { label: t("statusRejected"), cls: "cancelled", icon: "ph-x-circle" }
  };
  return map[String(status || "").toLowerCase()] || map.pending;
}

function showToast(message, type = "success") {
  let host = document.getElementById("global-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "global-toast-host";
    host.style.cssText =
      "position:fixed;top:20px;left:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,380px)";
    document.body.appendChild(host);
  }

  const cfgMap = {
    success: { bg: "#ecfdf5", border: "#10b981", text: "#047857", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "ph-info" }
  };

  const cfg = cfgMap[type] || cfgMap.info;
  const toast = document.createElement("div");
  toast.style.cssText = `
    background:${cfg.bg};
    border:1px solid ${cfg.border};
    color:${cfg.text};
    padding:14px 16px;
    border-radius:16px;
    box-shadow:0 14px 30px rgba(15,23,42,.12);
    font-weight:700;
    font-family:inherit;
    display:flex;
    align-items:flex-start;
    gap:10px;
    line-height:1.6
  `;
  toast.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.2rem;flex-shrink:0;margin-top:2px"></i><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}

// =========================================
// 8) PROPERTY NORMALIZATION
// =========================================
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
    location_en: locationEn,
    location_ar: locationAr,
    price: Number(p.price || p.basePrice || p.pricePerNight || p.nightlyRate || 0),
    rating: Number(p.rating || p.avgRating || p.reviewScore || 4.8),
    image: baseImage,
    images,
    urgency: p.urgency || null,
    desc_en: p.desc_en || p.descEn || p.descriptionEn || p.description || "",
    desc_ar: p.desc_ar || p.descAr || p.descriptionAr || p.description || "",
    features_en: Array.isArray(p.features_en)
      ? p.features_en
      : Array.isArray(p.featuresEn)
      ? p.featuresEn
      : Array.isArray(p.amenitiesEn)
      ? p.amenitiesEn
      : [],
    features_ar: Array.isArray(p.features_ar)
      ? p.features_ar
      : Array.isArray(p.featuresAr)
      ? p.featuresAr
      : Array.isArray(p.amenitiesAr)
      ? p.amenitiesAr
      : [],
    type: p.type || p.category || "",
    typeEn: p.typeEn || p.categoryEn || p.type || "",
    typeAr: p.typeAr || p.categoryAr || p.type || "",
    lat: lat !== null && lat !== "" ? Number(lat) : null,
    lng: lng !== null && lng !== "" ? Number(lng) : null,
    createdAt: p.createdAt || null,
    updatedAt: p.updatedAt || null
  };
}

function getSourceProperties() {
  return state.liveProperties.length
    ? state.liveProperties
    : properties.map((p) => normalizeProperty(p, p.id, "mock"));
}

function getPropertyTitle(property) {
  if (!property) return "";
  return state.lang === "ar"
    ? property.title_ar || property.title_en || ""
    : property.title_en || property.title_ar || "";
}

function getPropertyLocation(property) {
  if (!property) return "";
  return state.lang === "ar"
    ? property.location_ar || property.location_en || ""
    : property.location_en || property.location_ar || "";
}

function propertyMatchesCategory(property, category) {
  const haystack = [
    property.title_en,
    property.title_ar,
    property.desc_en,
    property.desc_ar,
    property.type,
    property.typeEn,
    property.typeAr,
    ...(property.features_en || []),
    ...(property.features_ar || [])
  ]
    .join(" ")
    .toLowerCase();

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

function getNavigationPropertyId(property) {
  return normalizeText(property?.docId || property?.navId || property?.id || property?.customId || "");
}

function rememberSelectedProperty(property) {
  if (!property) return;
  const navId = getNavigationPropertyId(property);
  const snapshot = { ...property, navId, rememberedAt: new Date().toISOString() };

  safeSet(STORAGE_KEYS.selectedPropertyId, navId);
  safeSet(STORAGE_KEYS.selectedPropertyDocId, normalizeText(property.docId || navId));
  safeJsonSet(STORAGE_KEYS.selectedPropertyData, snapshot);
  safeJsonSet(STORAGE_KEYS.oreSelectedProperty, snapshot);
  safeJsonSet(STORAGE_KEYS.bookingPropertySnapshot, snapshot);
}

// =========================================
// 9) THEME / LANGUAGE
// =========================================
function updateLogo() {
  const mainLogo = document.getElementById("main-logo");
  const modalLogo = document.getElementById("modal-logo");
  const logoPath = state.theme === "dark" ? "logos/orebooking2.png" : "logos/orebooking.png";
  if (mainLogo) mainLogo.src = logoPath;
  if (modalLogo) modalLogo.src = logoPath;
}

function updateLanguageUI() {
  const dict = translations[state.lang];

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (!key) return;
    const mappedKey = {
      herotitle: "heroTitle",
      herosubtitle: "heroSubtitle",
      location: "location",
      dates: "dates",
      guests: "guests",
      search: "search",
      trending: "trending",
      pts: "pts",
      myfavorites: "myFavorites",
      mybookings: "myBookings",
      logout: "logout",
      welcomeback: "welcomeBack",
      logindesc: "loginDesc",
      registerdesc: "registerDesc",
      createaccount: "createAccount",
      signin: "signIn",
      signup: "signUp",
      signupbtn: "signUpBtn",
      forgotpass: "forgotPass",
      rememberme: "rememberMe",
      email: "email",
      password: "password",
      fullname: "fullName",
      resetpasstitle: "resetPassTitle",
      resetpassdesc: "resetPassDesc",
      sendlink: "sendLink",
      backtologin: "backToLogin",
      clearsearch: "clearSearch",
      developedby: "developedBy",
      supportchat: "supportChat"
    }[key.toLowerCase()] || key;

    if (dict[mappedKey] !== undefined) {
      el.textContent = dict[mappedKey];
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (!key) return;
    const mappedKey = {
      locationplaceholder: "locationPlaceholder",
      datesplaceholder: "datesPlaceholder",
      guestsplaceholder: "guestsPlaceholder",
      chatplaceholder: "searchHint"
    }[key.toLowerCase()] || key;

    if (dict[mappedKey] !== undefined) {
      el.placeholder = dict[mappedKey];
    }
  });

  if (langBtn) {
    langBtn.innerHTML = `<i class="ph ph-globe"></i><span>${state.lang === "en" ? "EN" : "AR"}</span>`;
  }

  const sectionTitle = document.getElementById("section-main-title");
  if (sectionTitle && state.currentView === "home") sectionTitle.textContent = t("trending");
  if (sectionTitle && state.currentView === "favorites") sectionTitle.textContent = t("myFavorites");
  if (searchInput) searchInput.setAttribute("placeholder", t("searchHint"));
}

function applyInitialState() {
  htmlEl.setAttribute("lang", state.lang);
  htmlEl.setAttribute("dir", state.lang === "ar" ? "rtl" : "ltr");

  if (state.theme === "dark") {
    bodyEl.classList.add("dark");
    if (themeBtn) themeBtn.innerHTML = `<i class="ph ph-sun"></i>`;
  } else {
    bodyEl.classList.remove("dark");
    if (themeBtn) themeBtn.innerHTML = `<i class="ph ph-moon"></i>`;
  }

  updateLogo();
  updateLanguageUI();
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light";
  safeSet(STORAGE_KEYS.theme, state.theme);
  applyInitialState();
}

function toggleLanguage() {
  state.lang = state.lang === "en" ? "ar" : "en";
  safeSet(STORAGE_KEYS.lang, state.lang);
  applyInitialState();
  renderCategories();

  if (state.currentView === "favorites") {
    renderListings();
  } else if (state.activeSearch) {
    performSearch(state.activeSearch);
  } else {
    renderListings();
  }

  updateUserUI();
}

// =========================================
// 10) AUTH MODAL
// =========================================
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

function openModal() {
  if (!authModal) return;
  authModal.classList.add("active");
  bodyEl.classList.add("modal-open");
  showMessage("", "");
}

function closeModal() {
  if (!authModal) return;
  authModal.classList.remove("active");
  bodyEl.classList.remove("modal-open");
}

function switchForm(formType) {
  const forms = {
    login: loginForm,
    register: registerForm,
    forgot: forgotForm
  };

  Object.entries(forms).forEach(([key, form]) => {
    if (!form) return;
    form.style.display = key === formType ? "flex" : "none";
  });
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
    if (icon) icon.className = "ph-fill ph-user-circle";
    if (dropdownUserName) dropdownUserName.textContent = state.user.displayName || t("user");
    if (dropdownUserEmail) dropdownUserEmail.textContent = state.user.email || "";
  } else {
    if (icon) icon.className = "ph ph-user";
    if (dropdownUserName) dropdownUserName.textContent = t("guest");
    if (dropdownUserEmail) dropdownUserEmail.textContent = "";
    profileDropdown?.classList.remove("active");
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
    showMessage(t("invalidCredentials"), "error");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast(t("loginSuccess"), "success");
    showMessage("", "");
    loginForm?.reset();
    closeModal();
  } catch (error) {
    console.error("Login error:", error);
    showMessage(t("invalidCredentials"), "error");
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

    await db.collection("users").doc(cred.user.uid).set(
      {
        name,
        email,
        points: 1250,
        role: "guest",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    showToast(t("registerSuccess"), "success");
    registerForm?.reset();
    closeModal();
  } catch (error) {
    console.error("Register error:", error);
    showMessage(error.message || "Registration failed", "error");
  }
}

async function handleGoogleLogin() {
  if (!auth || !db || typeof firebase === "undefined") {
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
        await ref.set(
          {
            name: result.user.displayName || "",
            email: result.user.email || "",
            points: 1250,
            role: "guest",
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      }
    }

    showToast(t("loginSuccess"), "success");
    closeModal();
  } catch (error) {
    console.error("Google login error:", error);
    showMessage(error.message || "Google login failed", "error");
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
    showMessage(state.lang === "ar" ? "أدخل بريدك الإلكتروني" : "Please enter your email", "error");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    showMessage(t("resetSent"), "success");
    forgotForm?.reset();
  } catch (error) {
    console.error("Reset password error:", error);
    showMessage(error.message || "Failed to send reset link", "error");
  }
}

async function handleLogout() {
  try {
    if (auth) await auth.signOut();
    showToast(t("logoutSuccess"), "success");
    profileDropdown?.classList.remove("active");
  } catch (error) {
    console.error("Logout error:", error);
  }
}

// =========================================
// 11) FAVORITES
// =========================================
function loadFavorites() {
  state.favorites = safeJsonGet(STORAGE_KEYS.favorites, []);
  if (!Array.isArray(state.favorites)) state.favorites = [];
}

function saveFavorites() {
  safeJsonSet(STORAGE_KEYS.favorites, state.favorites);
}

window.toggleFavorite = function (event, propertyId) {
  event.preventDefault();
  event.stopPropagation();

  if (!state.user) {
    openModal();
    showToast(t("authRequired"), "error");
    return;
  }

  const id = String(propertyId);
  const index = state.favorites.indexOf(id);

  if (index > -1) {
    state.favorites.splice(index, 1);
    showToast(t("favRemoved"), "info");
  } else {
    state.favorites.push(id);
    showToast(t("favAdded"), "success");
  }

  saveFavorites();

  if (state.currentView === "favorites") {
    renderListings();
  } else {
    renderListings();
  }
};

// =========================================
// 12) CATEGORY / SEARCH
// =========================================
function renderCategories() {
  const container = document.getElementById("categories-container");
  if (!container) return;

  container.innerHTML = categories
    .map((cat) => {
      const label = state.lang === "ar" ? cat.label_ar : cat.label_en;
      const isActive = state.activeCategory === cat.label_en;
      return `
        <button class="category-item ${isActive ? "active" : ""}" type="button" onclick="selectCategory('${escapeAttr(
        cat.label_en
      )}')">
          <i class="ph ${escapeAttr(cat.icon)}"></i>
          <span>${escapeHtml(label)}</span>
        </button>
      `;
    })
    .join("");
}

window.selectCategory = function (catName) {
  state.activeCategory = state.activeCategory === catName ? null : catName;
  state.currentView = "category";

  const hero = document.getElementById("hero-section");
  if (hero) hero.style.display = "none";

  showClearSearchBtn();

  const sectionTitle = document.getElementById("section-main-title");
  if (sectionTitle) {
    sectionTitle.removeAttribute("data-i18n");
    const matched = categories.find((c) => c.label_en === state.activeCategory);
    sectionTitle.textContent = matched
      ? state.lang === "ar"
        ? matched.label_ar
        : matched.label_en
      : t("trending");
  }

  renderCategories();

  const source = getSourceProperties();
  const filtered = state.activeCategory ? source.filter((p) => propertyMatchesCategory(p, state.activeCategory)) : source;
  renderListings(filtered);
};

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

function performSearch(rawQuery = "") {
  const query = normalizeText(rawQuery);
  state.activeSearch = query;
  state.currentView = query ? "search" : "home";
  state.activeCategory = null;

  const hero = document.getElementById("hero-section");
  const cats = document.getElementById("categories-container");
  if (hero) hero.style.display = query ? "none" : "block";
  if (cats) cats.style.display = query ? "none" : "flex";

  if (!query) {
    resetToHome();
    return;
  }

  showClearSearchBtn();

  const sectionTitle = document.getElementById("section-main-title");
  if (sectionTitle) {
    sectionTitle.removeAttribute("data-i18n");
    sectionTitle.textContent = t("searchResults");
  }

  const q = query.toLowerCase();
  const filtered = getSourceProperties().filter((p) => {
    const haystack = [
      p.title_en,
      p.title_ar,
      p.location_en,
      p.location_ar,
      p.desc_en,
      p.desc_ar,
      p.type,
      p.typeEn,
      p.typeAr,
      ...(p.features_en || []),
      ...(p.features_ar || [])
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(q);
  });

  renderListings(filtered);
}

function initSmartSearch() {
  if (!searchInput || !searchDropdown) return;

  searchInput.setAttribute("placeholder", t("searchHint"));

  const renderSuggestions = (query = "") => {
    const q = normalizeText(query).toLowerCase();
    const source = getSourceProperties();

    const wilayaMatches = algerianWilayas
      .filter((w) => {
        if (!q) return true;
        return w.en.toLowerCase().includes(q) || w.ar.includes(query);
      })
      .slice(0, 8)
      .map((w) => ({
        type: "wilaya",
        label: state.lang === "ar" ? w.ar : w.en,
        value: state.lang === "ar" ? w.ar : w.en,
        subtitle: t("allWilayasSub")
      }));

    const propertyMatches = source
      .filter((p) => {
        if (!q) return true;
        const title = `${p.title_en} ${p.title_ar}`.toLowerCase();
        const location = `${p.location_en} ${p.location_ar}`.toLowerCase();
        return title.includes(q) || location.includes(q);
      })
      .slice(0, 6)
      .map((p) => ({
        type: "property",
        label: getPropertyTitle(p),
        value: getPropertyTitle(p),
        subtitle: getPropertyLocation(p),
        id: getNavigationPropertyId(p)
      }));

    const merged = [...wilayaMatches, ...propertyMatches].slice(0, 10);

    searchDropdown.innerHTML = merged.length
      ? merged
          .map(
            (item) => `
          <button class="search-suggestion-item" type="button" data-type="${escapeAttr(item.type)}" data-value="${escapeAttr(
              item.value
            )}" ${item.id ? `data-id="${escapeAttr(item.id)}"` : ""}>
            <div class="search-suggestion-main">${escapeHtml(item.label)}</div>
            <div class="search-suggestion-sub">${escapeHtml(item.subtitle || "")}</div>
          </button>
        `
          )
          .join("")
      : `<div class="search-empty">${escapeHtml(t("noResults"))}</div>`;

    searchDropdown.classList.add("active");

    searchDropdown.querySelectorAll(".search-suggestion-item").forEach((btn) => {
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
    searchInput.addEventListener("keydown", (e) => {
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

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#search-location-wrapper")) {
      searchDropdown.classList.remove("active");
    }
  });
}

function resetToHome() {
  state.currentView = "home";
  state.activeSearch = "";
  state.activeCategory = null;

  const hero = document.getElementById("hero-section");
  const cats = document.getElementById("categories-container");
  if (hero) hero.style.display = "flex";
  if (cats) cats.style.display = "flex";

  if (searchInput) searchInput.value = "";
  hideClearSearchBtn();

  const sectionTitle = document.getElementById("section-main-title");
  if (sectionTitle) {
    sectionTitle.setAttribute("data-i18n", "trending");
    sectionTitle.textContent = t("trending");
  }

  document.querySelectorAll(".mob-nav-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector(".mob-nav-btn[data-target='home']")?.classList.add("active");

  renderCategories();
  renderListings();
}

// =========================================
// 13) RENDER LISTINGS
// =========================================
function getFilteredProperties(baseList = null) {
  let list = Array.isArray(baseList) ? [...baseList] : [...getSourceProperties()];

  if (state.currentView === "favorites") {
    list = list.filter((p) => state.favorites.includes(String(getNavigationPropertyId(p))));
  }

  if (state.activeCategory) {
    list = list.filter((p) => propertyMatchesCategory(p, state.activeCategory));
  }

  if (state.activeSearch) {
    const q = state.activeSearch.toLowerCase();
    list = list.filter((p) => {
      const haystack = [
        p.title_en,
        p.title_ar,
        p.location_en,
        p.location_ar,
        p.desc_en,
        p.desc_ar,
        p.type,
        p.typeEn,
        p.typeAr,
        ...(p.features_en || []),
        ...(p.features_ar || [])
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }

  if (sortSelect) {
    switch (sortSelect.value) {
      case "price-asc":
      case "priceasc":
        list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
        break;
      case "price-desc":
      case "pricedesc":
        list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
        break;
      case "rating":
        list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
        break;
      default:
        break;
    }
  }

  return list;
}

function renderListings(customList = null) {
  if (!listingsGrid) return;

  const displayProps = getFilteredProperties(customList);

  if (!displayProps.length) {
    const emptyText = state.currentView === "favorites" ? t("noFavorites") : t("noProps");
    listingsGrid.innerHTML = `
      <div class="listings-empty-state">
        <i class="ph ph-house-line"></i>
        <div>${escapeHtml(emptyText)}</div>
      </div>
    `;
    return;
  }

  listingsGrid.innerHTML = displayProps
    .map((p) => {
      const id = getNavigationPropertyId(p);
      const title = getPropertyTitle(p);
      const location = getPropertyLocation(p);
      const image = p.image || (Array.isArray(p.images) ? p.images[0] : "") || "images/placeholder.jpg";
      const isFav = state.favorites.includes(String(id));
      const urgencyText =
        p.urgency === "few"
          ? state.lang === "ar"
            ? "بقي القليل"
            : "Few left"
          : p.urgency === "hot"
          ? state.lang === "ar"
            ? "طلب مرتفع"
            : "Hot"
          : "";

      return `
        <article class="property-card" onclick="goToProperty('${escapeAttr(id)}')">
          <div class="property-card-media">
            ${urgencyText ? `<div class="property-urgency"><i class="ph ph-fire"></i><span>${escapeHtml(urgencyText)}</span></div>` : ""}
            <button class="favorite-btn ${isFav ? "active" : ""}" type="button" aria-label="Favorite" onclick="toggleFavorite(event, '${escapeAttr(
        id
      )}')">
              <i class="ph ${isFav ? "ph-fill ph-heart" : "ph-heart"}"></i>
            </button>
            <img src="${escapeAttr(image)}" alt="${escapeAttr(title)}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
          </div>
          <div class="property-card-body">
            <div class="property-card-top">
              <h3 class="property-card-title">${escapeHtml(title)}</h3>
              <div class="property-card-rating">
                <i class="ph-fill ph-star" style="color:#f59e0b"></i>
                <span>${Number(p.rating || 0).toFixed(1)}</span>
              </div>
            </div>
            <div class="property-card-location">
              <i class="ph ph-map-pin"></i>
              <span>${escapeHtml(location)}</span>
            </div>
            <div class="property-card-price">
              ${escapeHtml(formatCurrency(p.price))}
              <span> / ${escapeHtml(t("night"))}</span>
            </div>
            <div class="property-card-actions">
              <button type="button" onclick="event.stopPropagation(); goToProperty('${escapeAttr(id)}')">${escapeHtml(
        t("viewDetails")
      )}</button>
              <button class="primary reserve-btn" type="button" onclick="event.stopPropagation(); goToProperty('${escapeAttr(
                id
              )}')">${escapeHtml(t("reserveNow"))}</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

// =========================================
// 14) PROPERTY HANDOFF
// =========================================
function getPropertyByAnyId(id) {
  const target = normalizeText(id);
  if (!target) return null;

  return (
    getSourceProperties().find(
      (p) =>
        normalizeText(p.id) === target ||
        normalizeText(p.navId) === target ||
        normalizeText(p.docId) === target ||
        normalizeText(p.customId) === target
    ) || null
  );
}

function openPropertyDetails(id) {
  const property = getPropertyByAnyId(id);
  if (property) {
    rememberSelectedProperty(property);
  }
  window.location.href = `property.html?id=${encodeURIComponent(id)}`;
}

window.goToProperty = function (id) {
  openPropertyDetails(id);
};

// =========================================
// 15) LOAD PROPERTIES
// =========================================
async function loadCollectionCandidates() {
  if (!db) return [];

  for (const collectionName of state.propertyCollectionCandidates) {
    try {
      const snap = await db.collection(collectionName).get();
      if (!snap.empty) {
        const list = snap.docs
          .map((doc) => normalizeProperty(doc.data(), doc.id, collectionName))
          .filter(isPropertyVisible);

        if (list.length) {
          state.currentCollection = collectionName;
          return list;
        }
      }
    } catch (error) {
      console.warn(`Collection check failed for ${collectionName}:`, error);
    }
  }

  return [];
}

async function loadPropertiesFromFirestore() {
  if (!listingsGrid || state.loadingProperties) return;

  state.loadingProperties = true;
  listingsGrid.innerHTML = `
    <div class="listings-empty-state">
      <i class="ph ph-circle-notch ph-spin"></i>
      <div>${escapeHtml(t("loading"))}</div>
    </div>
  `;

  try {
    if (!db) throw new Error("Firestore unavailable");

    let loaded = [];

    try {
      const primary = await db.collection("properties").where("visible", "==", true).get();
      loaded = primary.docs.map((doc) => normalizeProperty(doc.data(), doc.id, "properties")).filter(isPropertyVisible);
    } catch (error) {
      console.warn("Primary properties query failed:", error);
    }

    if (!loaded.length) {
      loaded = await loadCollectionCandidates();
    }

    state.liveProperties = loaded.length ? loaded : properties.map((p) => normalizeProperty(p, p.id, "mock"));
    state.propertiesLoaded = true;

    if (!loaded.length) {
      showToast(t("propertyLoadError"), "info");
    }
  } catch (error) {
    console.error("Properties load error:", error);
    state.liveProperties = properties.map((p) => normalizeProperty(p, p.id, "mock"));
    state.propertiesLoaded = true;
    showToast(t("propertyLoadError"), "error");
  } finally {
    state.loadingProperties = false;
    renderListings();
  }
}

// =========================================
// 16) BOOKINGS
// =========================================
function ensureBookingsModal() {
  let modal = document.getElementById("bookings-modal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "bookings-modal";
  modal.className = "bookings-modal";
  modal.innerHTML = `
    <div class="bookings-modal-dialog">
      <div class="bookings-modal-header">
        <h3>${escapeHtml(t("myBookings"))}</h3>
        <button type="button" id="close-bookings-btn" aria-label="Close">
          <i class="ph ph-x"></i>
        </button>
      </div>
      <div class="bookings-modal-body" id="bookings-list"></div>
    </div>
  `;
  document.body.appendChild(modal);

  modal.querySelector("#close-bookings-btn")?.addEventListener("click", closeBookingsModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeBookingsModal();
  });

  return modal;
}

function openBookingsModal() {
  const modal = ensureBookingsModal();
  modal.classList.add("active");
  bodyEl.classList.add("modal-open");
}

function closeBookingsModal() {
  const modal = document.getElementById("bookings-modal");
  if (!modal) return;
  modal.classList.remove("active");
  bodyEl.classList.remove("modal-open");
}

async function showMyBookings() {
  if (!state.user) {
    openModal();
    return;
  }

  const modal = ensureBookingsModal();
  const body = modal.querySelector("#bookings-list");
  openBookingsModal();

  if (body) {
    body.innerHTML = `
      <div class="listings-empty-state" style="padding:40px 20px">
        <i class="ph ph-circle-notch ph-spin"></i>
        <div>${escapeHtml(state.lang === "ar" ? "جارٍ تحميل الحجوزات..." : "Loading bookings...")}</div>
      </div>
    `;
  }

  try {
    if (!db) throw new Error("Firestore unavailable");

    const collections = ["bookings", "reservations"];
    let docs = [];

    for (const name of collections) {
      try {
        const snap = await db.collection(name).where("guestId", "==", state.user.uid).get();
        if (!snap.empty) {
          docs = snap.docs.map((doc) => ({ id: doc.id, ...doc.data(), _collection: name }));
          break;
        }
      } catch (error) {
        console.warn(`Bookings query failed for ${name}:`, error);
      }
    }

    if (!docs.length) {
      body.innerHTML = `
        <div class="listings-empty-state" style="padding:50px 20px">
          <i class="ph ph-calendar-x"></i>
          <div>${escapeHtml(t("noBookings"))}</div>
        </div>
      `;
      return;
    }

    docs.sort((a, b) => {
      const aTime = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt || 0).getTime() || 0;
      const bTime = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt || 0).getTime() || 0;
      return bTime - aTime;
    });

    body.innerHTML = docs
      .map((b) => {
        const status = getStatusMeta(b.status);
        const title = b.propertyTitle || b.listingTitle || b.propertyName || t("bookingProperty");
        const checkIn = b.checkIn || b.checkInDate || "—";
        const checkOut = b.checkOut || b.checkOutDate || "—";
        const guests = b.guests || b.totalGuests || b.numberOfGuests || "—";
        const total = b.totalPrice || b.total || 0;
        const payment = b.paymentMethod || b.paymentType || "—";
        const created = formatDateTime(b.createdAt);

        return `
          <div class="booking-card">
            <div class="booking-card-head">
              <div>
                <h4>${escapeHtml(title)}</h4>
                <div class="booking-card-sub">#${escapeHtml(b.id)}</div>
              </div>
              <div class="booking-status ${escapeAttr(status.cls)}">
                <i class="ph ${escapeAttr(status.icon)}"></i>
                <span>${escapeHtml(status.label)}</span>
              </div>
            </div>
            <div class="booking-card-grid">
              <div><strong>${escapeHtml(t("bookingDates"))}:</strong> ${escapeHtml(String(checkIn))} → ${escapeHtml(String(checkOut))}</div>
              <div><strong>${escapeHtml(t("bookingGuests"))}:</strong> ${escapeHtml(String(guests))}</div>
              <div><strong>${escapeHtml(t("bookingTotal"))}:</strong> ${escapeHtml(formatCurrency(total))}</div>
              <div><strong>${escapeHtml(t("bookingPayment"))}:</strong> ${escapeHtml(String(payment))}</div>
              <div><strong>${escapeHtml(t("bookingCreated"))}:</strong> ${escapeHtml(created)}</div>
              <div><strong>${escapeHtml(t("bookingNotes"))}:</strong> ${escapeHtml(b.notes || "—")}</div>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Bookings load error:", error);
    body.innerHTML = `
      <div class="listings-empty-state" style="padding:50px 20px">
        <i class="ph ph-warning-circle"></i>
        <div>${escapeHtml(state.lang === "ar" ? "حدث خطأ أثناء تحميل الحجوزات" : "Error loading bookings")}</div>
      </div>
    `;
  }
}

// =========================================
// 17) PASSWORD UI
// =========================================
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
  document.querySelectorAll(".toggle-pass-btn").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
      const input = btn.closest(".pass-wrapper")?.querySelector("input");
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
  const bars = wrapper?.querySelectorAll(".str-bar");

  if (!input || !wrapper || !bars?.length || input.dataset.boundStrength) return;
  input.dataset.boundStrength = "1";

  const render = () => {
    const val = input.value;
    const score = calcPasswordStrength(val);
    const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];
    const labels = {
      en: ["", "Weak", "Fair", "Good", "Strong"],
      ar: ["", "ضعيفة", "مقبولة", "جيدة", "قوية"]
    };

    wrapper.style.display = val.length ? "flex" : "none";
    bars.forEach((bar, i) => {
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

// =========================================
// 18) UI EXTRAS
// =========================================
function initScrollTopBtn() {
  const btn = document.getElementById("scroll-top-btn");
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";

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

function initMobileNav() {
  const nav = document.getElementById("mobile-bottom-nav");
  if (!nav) return;

  nav.querySelectorAll(".mob-nav-btn[data-target]").forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
      nav.querySelectorAll(".mob-nav-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const target = btn.getAttribute("data-target");
      if (target === "home") resetToHome();
      if (target === "favorites") {
        state.currentView = "favorites";
        const hero = document.getElementById("hero-section");
        const cats = document.getElementById("categories-container");
        if (hero) hero.style.display = "none";
        if (cats) cats.style.display = "none";
        showClearSearchBtn();

        const sectionTitle = document.getElementById("section-main-title");
        if (sectionTitle) {
          sectionTitle.removeAttribute("data-i18n");
          sectionTitle.textContent = t("myFavorites");
        }

        renderListings();
      }
      if (target === "profile") handleAuthButtonClick();
    });
  });
}

function initSort() {
  if (!sortSelect || sortSelect.dataset.bound) return;
  sortSelect.dataset.bound = "1";
  sortSelect.addEventListener("change", () => renderListings());
}

// =========================================
// 19) CHAT SIMPLE UI
// =========================================
function initChatUI() {
  const chatModal = document.getElementById("chat-modal");
  const chatOpenBtn = document.getElementById("chat-open-btn");
  const chatMenuBtn = document.getElementById("open-chat-btn");
  const chatCloseBtn = document.getElementById("close-chat-btn");
  const chatSendBtn = document.getElementById("send-chat-btn");
  const chatInput = document.getElementById("chat-message-input");
  const chatMessages = document.getElementById("chat-messages");
  const chatEmptyState = document.getElementById("chat-empty-state");
  const chatUnreadBadge = document.getElementById("chat-unread-badge");

  if (!chatModal) return;

  const openChat = () => {
    chatModal.classList.add("active");
    bodyEl.classList.add("modal-open");
    if (chatUnreadBadge) chatUnreadBadge.textContent = "0";
  };

  const closeChat = () => {
    chatModal.classList.remove("active");
    bodyEl.classList.remove("modal-open");
  };

  if (chatOpenBtn && !chatOpenBtn.dataset.bound) {
    chatOpenBtn.dataset.bound = "1";
    chatOpenBtn.addEventListener("click", openChat);
  }

  if (chatMenuBtn && !chatMenuBtn.dataset.bound) {
    chatMenuBtn.dataset.bound = "1";
    chatMenuBtn.addEventListener("click", () => {
      profileDropdown?.classList.remove("active");
      openChat();
    });
  }

  if (chatCloseBtn && !chatCloseBtn.dataset.bound) {
    chatCloseBtn.dataset.bound = "1";
    chatCloseBtn.addEventListener("click", closeChat);
  }

  if (!chatModal.dataset.boundOverlay) {
    chatModal.dataset.boundOverlay = "1";
    chatModal.addEventListener("click", (e) => {
      if (e.target === chatModal) closeChat();
    });
  }

  if (chatSendBtn && chatInput && chatMessages && !chatSendBtn.dataset.bound) {
    chatSendBtn.dataset.bound = "1";
    chatSendBtn.addEventListener("click", () => {
      const message = chatInput.value.trim();
      if (!message) return;

      if (chatEmptyState) chatEmptyState.style.display = "none";

      const bubble = document.createElement("div");
      bubble.className = "chat-message customer";
      bubble.innerHTML = `
        ${escapeHtml(message)}
        <span class="chat-meta">${state.lang === "ar" ? "أنت" : "You"} · ${new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      })}</span>
      `;

      chatMessages.appendChild(bubble);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      chatInput.value = "";
    });
  }
}

// =========================================
// 20) INIT
// =========================================
function bindCoreEvents() {
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

  if (logoutBtn && !logoutBtn.dataset.bound) {
    logoutBtn.dataset.bound = "1";
    logoutBtn.addEventListener("click", handleLogout);
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

      showClearSearchBtn();

      const sectionTitle = document.getElementById("section-main-title");
      if (sectionTitle) {
        sectionTitle.removeAttribute("data-i18n");
        sectionTitle.textContent = t("myFavorites");
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

  if (homeLogoBtn && !homeLogoBtn.dataset.bound) {
    homeLogoBtn.dataset.bound = "1";
    homeLogoBtn.addEventListener("click", (e) => {
      if (document.getElementById("hero-section")) {
        e.preventDefault();
        resetToHome();
      }
    });
  }

  document.getElementById("go-to-register")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchForm("register");
  });

  document.getElementById("go-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchForm("login");
  });

  document.getElementById("go-to-forgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchForm("forgot");
  });

  document.getElementById("back-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchForm("login");
  });

  window.addEventListener("click", (e) => {
    if (authModal && e.target === authModal) closeModal();
    if (profileDropdown && !e.target.closest(".profile-container")) {
      profileDropdown.classList.remove("active");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeBookingsModal();
      document.getElementById("chat-modal")?.classList.remove("active");
      bodyEl.classList.remove("modal-open");
      searchDropdown?.classList.remove("active");
    }
  });
}

function initAuthState() {
  if (!auth) {
    updateUserUI();
    return;
  }

  auth.onAuthStateChanged((user) => {
    state.user = user || null;
    loadFavorites();
    updateUserUI();
    renderListings();
  });
}

function init() {
  if (state.initialized) return;
  state.initialized = true;

  loadFavorites();
  applyInitialState();
  bindCoreEvents();
  initAuthState();
  initClearSearchBtn();
  initSmartSearch();
  initPasswordToggles();
  initPasswordStrength();
  initScrollTopBtn();
  initMobileNav();
  initSort();
  initChatUI();
  renderCategories();
  renderListings();
  loadPropertiesFromFirestore();
}

document.addEventListener("DOMContentLoaded", init);
