// =========================================
// script.js — OreBooking Index Page v4.6
// Full Firebase + Auth + Real-time Chat + Listings + Favorites Modal
// Final chat stabilization update
// Compatible with current index.html IDs
// =========================================
"use strict";

// ──────────────────────────────────────────
// Firebase Config
// ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCA5iauXrIhozRw8MD7JTOLyeQ2v0GGncA",
  authDomain: "orebooking-website.firebaseapp.com",
  projectId: "orebooking-website",
  storageBucket: "orebooking-website.firebasestorage.app",
  messagingSenderId: "1012887567747",
  appId: "1:1012887567747:web:153b57b60cb143d88acab6",
  measurementId: "G-5GKMRMVHC3"
};

let db = null;
let auth = null;
let firestoreFieldValue = null;

try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    if (typeof firebase.firestore === "function") {
      db = firebase.firestore();
      firestoreFieldValue = firebase.firestore.FieldValue || null;
    }
    if (typeof firebase.auth === "function") auth = firebase.auth();
  }
} catch (e) {
  console.error("Firebase init:", e);
}

// ──────────────────────────────────────────
// Safe Storage Helpers
// ──────────────────────────────────────────
function safeGet(key, fallback = null) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function safeSet(key, val) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function safeJsonGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeJsonSet(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// ──────────────────────────────────────────
// App State
// ──────────────────────────────────────────
const state = {
  lang: (() => {
    const l = safeGet("ore_lang") || safeGet("orelang") || "en";
    return l === "ar" ? "ar" : "en";
  })(),
  theme: safeGet("ore_theme") || safeGet("oretheme") || "light",
  currentUser: null,
  currentUserProfile: null,
  allProperties: [],
  filteredProperties: [],
  activeCategory: "all",
  searchQuery: "",
  sortBy: "featured",
  favorites: safeJsonGet("ore_favorites", []),
  chatMessages: [],
  chatUnread: 0,
  chatOpen: false,
  authTab: "login",
  currentChatId: safeGet("ore_current_chat_id", ""),
  currentChatUnsub: null,
  chatInitializedForUser: "",
  bookings: []
};

// ──────────────────────────────────────────
// i18n
// ──────────────────────────────────────────
const i18n = {
  en: {
    heroTitle: "Discover Your Perfect Stay",
    heroDesc: "Explore hand-picked hotels, apartments, and villas across Algeria.",
    searchPlaceholder: "Search by name or location...",
    searchBtn: "Search",
    allStays: "All Stays",
    hotels: "Hotels",
    villas: "Villas",
    apartments: "Apartments",
    sortDefault: "Sort: Featured",
    sortPriceLow: "Price: Low to High",
    sortPriceHigh: "Price: High to Low",
    sortRating: "Top Rated",
    sectionTitle: "Available Properties",
    sectionDesc: "Browse our curated selection of premium stays.",
    night: "night",
    viewDetails: "View Details",
    bookNow: "Book Now",
    noResults: "No properties found.",
    noResultsDesc: "Try adjusting your search or filter.",
    loading: "Loading properties...",
    signIn: "Sign In",
    signOut: "Sign Out",
    register: "Register",
    email: "Email",
    password: "Password",
    fullName: "Full Name",
    confirmPass: "Confirm Password",
    forgotPass: "Forgot Password?",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    loginTitle: "Welcome Back",
    loginSubtitle: "Sign in to access your bookings and favorites.",
    registerTitle: "Create Account",
    registerSubtitle: "Join OreBooking for the best deals.",
    forgotTitle: "Reset Password",
    forgotSubtitle: "Enter your email to receive a reset link.",
    sendReset: "Send Reset Link",
    myBookings: "My Bookings",
    myFavorites: "Favorites",
    points: "pts",
    chatTitle: "OreBooking Support",
    chatSubtitle: "Typically replies in minutes",
    chatPlaceholder: "Type a message...",
    sendMsg: "Send",
    chatWelcome: "Hello! How can we help you today?",
    noBookings: "No bookings yet.",
    noBookingsDesc: "Your confirmed bookings will appear here.",
    status_pending: "Pending",
    status_confirmed: "Confirmed",
    status_cancelled: "Cancelled",
    status_rejected: "Rejected",
    clearSearch: "Clear Search",
    favAdded: "Added to favorites!",
    favRemoved: "Removed from favorites.",
    loginRequired: "Please sign in to continue.",
    checkIn: "Check-in",
    checkOut: "Check-out",
    guests: "Guest",
    searchLocation: "Location",
    searchDates: "Dates",
    searchGuests: "Guests",
    supportChat: "Support Chat",
    loyaltyRewards: "Loyalty Rewards",
    featuredProperties: "Featured properties",
    featuredDesc: "Explore handpicked stays with comfort, style, and fast booking.",
    guestUser: "Guest User",
    signInToContinue: "Sign in to continue",
    resetSent: "Reset link sent!",
    signedOut: "Signed out.",
    accountCreated: "Account created!",
    signedInDone: "Signed in!",
    sendMessage: "Send message",
    noMessages: "No messages yet.",
    startConversation: "Start the conversation to contact support and receive replies here directly.",
    chatWorksNow: "Messages in this chat are synced with support through Firebase.",
    searchHint: "Search by city, wilaya, or property name",
    checkInLabel: "Check-in",
    checkOutLabel: "Check-out",
    guestsLabel: "Guests",
    chatPreparing: "Preparing secure connection...",
    chatConnected: "Connected to support.",
    chatSyncing: "Syncing messages...",
    chatError: "Connection issue. Trying again...",
    supportReady: "Support is ready to receive your messages.",
    fillAllFields: "Please fill all fields",
    passwordShort: "Password too short",
    firebaseMissing: "Firebase not available",
    adminFrontendBlocked: "This account is for the admin panel only.",
    destinationLabel: "Destination",
    footerCredits: "Developed by",
    noFavorites: "No favorites yet.",
    noFavoritesDesc: "Properties you save will appear here.",
    remove: "Remove",
    empty: "Empty",
    newBadge: "New"
  },
  ar: {
    heroTitle: "اكتشف إقامتك المثالية",
    heroDesc: "استكشف فنادق وشققاً وفيلات مختارة بعناية عبر الجزائر.",
    searchPlaceholder: "ابحث بالاسم أو الموقع...",
    searchBtn: "بحث",
    allStays: "الكل",
    hotels: "فنادق",
    villas: "فيلات",
    apartments: "شقق",
    sortDefault: "الترتيب: مميز",
    sortPriceLow: "السعر: من الأقل",
    sortPriceHigh: "السعر: من الأعلى",
    sortRating: "الأعلى تقييماً",
    sectionTitle: "العقارات المتاحة",
    sectionDesc: "تصفح مجموعتنا المختارة من أفضل الإقامات.",
    night: "ليلة",
    viewDetails: "عرض التفاصيل",
    bookNow: "احجز الآن",
    noResults: "لا توجد عقارات.",
    noResultsDesc: "جرّب تعديل البحث أو الفلتر.",
    loading: "جاري التحميل...",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    register: "إنشاء حساب",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    fullName: "الاسم الكامل",
    confirmPass: "تأكيد كلمة المرور",
    forgotPass: "نسيت كلمة المرور؟",
    noAccount: "ليس لديك حساب؟",
    haveAccount: "لديك حساب بالفعل؟",
    loginTitle: "مرحباً بعودتك",
    loginSubtitle: "سجّل الدخول للوصول إلى حجوزاتك ومفضلتك.",
    registerTitle: "إنشاء حساب",
    registerSubtitle: "انضم إلى OreBooking للحصول على أفضل العروض.",
    forgotTitle: "استعادة كلمة المرور",
    forgotSubtitle: "أدخل بريدك الإلكتروني لإرسال رابط الاستعادة.",
    sendReset: "إرسال رابط الاستعادة",
    myBookings: "حجوزاتي",
    myFavorites: "المفضلة",
    points: "نقطة",
    chatTitle: "دعم OreBooking",
    chatSubtitle: "يرد عادةً خلال دقائق",
    chatPlaceholder: "اكتب رسالة...",
    sendMsg: "إرسال",
    chatWelcome: "مرحباً! كيف يمكننا مساعدتك اليوم؟",
    noBookings: "لا توجد حجوزات حتى الآن.",
    noBookingsDesc: "ستظهر هنا حجوزاتك المؤكدة.",
    status_pending: "قيد الانتظار",
    status_confirmed: "مؤكد",
    status_cancelled: "ملغى",
    status_rejected: "مرفوض",
    clearSearch: "مسح البحث",
    favAdded: "تمت الإضافة إلى المفضلة!",
    favRemoved: "تمت الإزالة من المفضلة.",
    loginRequired: "يرجى تسجيل الدخول للمتابعة.",
    checkIn: "الدخول",
    checkOut: "الخروج",
    guests: "ضيف",
    searchLocation: "الموقع",
    searchDates: "التواريخ",
    searchGuests: "الضيوف",
    supportChat: "الدعم المباشر",
    loyaltyRewards: "مكافآت الولاء",
    featuredProperties: "العقارات المميزة",
    featuredDesc: "استكشف إقامات مختارة بعناية مع الراحة والأناقة وسرعة الحجز.",
    guestUser: "مستخدم ضيف",
    signInToContinue: "سجل الدخول للمتابعة",
    resetSent: "تم إرسال رابط الاستعادة!",
    signedOut: "تم تسجيل الخروج.",
    accountCreated: "تم إنشاء الحساب!",
    signedInDone: "تم تسجيل الدخول!",
    sendMessage: "إرسال رسالة",
    noMessages: "لا توجد رسائل بعد.",
    startConversation: "ابدأ المحادثة للتواصل مع الدعم وستظهر الردود هنا مباشرة.",
    chatWorksNow: "رسائل هذه المحادثة متزامنة مع الدعم عبر Firebase.",
    searchHint: "ابحث بالمدينة أو الولاية أو اسم العقار",
    checkInLabel: "تاريخ الدخول",
    checkOutLabel: "تاريخ الخروج",
    guestsLabel: "عدد الضيوف",
    chatPreparing: "جارٍ تجهيز الاتصال الآمن...",
    chatConnected: "تم الاتصال بالدعم.",
    chatSyncing: "جارٍ مزامنة الرسائل...",
    chatError: "هناك مشكلة في الاتصال، تتم إعادة المحاولة...",
    supportReady: "الدعم جاهز لاستقبال رسائلك.",
    fillAllFields: "يرجى ملء جميع الحقول",
    passwordShort: "كلمة المرور قصيرة جداً",
    firebaseMissing: "Firebase غير متاح",
    adminFrontendBlocked: "هذا الحساب مخصص للوحة الإدارة فقط.",
    destinationLabel: "الوجهة",
    footerCredits: "تم تطوير هذا الموقع من طرف",
    noFavorites: "لا توجد عناصر في المفضلة بعد.",
    noFavoritesDesc: "العقارات التي تحفظها ستظهر هنا.",
    remove: "إزالة",
    empty: "فارغ",
    newBadge: "جديد"
  }
};

function t(key) {
  return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || key;
}

// ──────────────────────────────────────────
// DOM Helpers
// ──────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

function firstById(...ids) {
  for (const id of ids) {
    const el = $(id);
    if (el) return el;
  }
  return null;
}

function firstQuery(...selectors) {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

// ──────────────────────────────────────────
// DOM Refs
// ──────────────────────────────────────────
const els = {
  body: document.body,
  html: document.documentElement,

  langBtn: firstById("lang-btn", "lang-toggle"),
  langBtnText: firstById("lang-toggle-text"),

  themeBtn: firstById("theme-btn", "theme-toggle"),
  profileMenu: firstById("profile-menu", "open-auth-btn"),
  profileDropdown: firstById("profile-dropdown"),
  profileContainer: firstQuery(".profile-container"),

  dropdownUserName: firstById("dropdown-user-name"),
  dropdownUserEmail: firstById("dropdown-user-email"),
  userPoints: firstById("user-points"),
  rewardsBadge: firstById("rewards-badge", "nav-rewards-badge"),

  logoutBtn: firstById("logout-btn"),
  myBookingsBtn: firstById("my-bookings-btn"),
  myFavoritesBtn: firstById("my-favorites-btn"),
  openChatBtn: firstById("open-chat-btn"),

  heroTitle: firstById("hero-title"),
  heroDesc: firstById("hero-desc"),

  searchInput: firstById("search-input", "destination-input", "search-destination"),
  searchBtn: firstById("search-btn"),
  searchDropdown: firstById("search-dropdown", "search-dropdow", "destination-dropdown"),
  clearSearchBtn: firstById("clear-search-btn"),

  checkInInput: firstById("search-checkin"),
  checkOutInput: firstById("search-checkout"),
  guestsInput: firstById("search-guests"),

  sortSelect: firstById("sort-select"),
  listingsGrid: firstById("listings-grid"),
  sectionTitle: firstById("section-title", "section-main-title"),
  sectionDesc: firstQuery("[data-section-title] + p", "#section-desc"),
  listingsCount: firstById("listings-count"),

  authModal: firstById("auth-modal"),
  loginForm: firstById("login-form"),
  registerForm: firstById("register-form"),
  forgotForm: firstById("forgot-form"),
  authMessage: firstById("auth-message"),

  loginEmail: firstById("login-email"),
  loginPassword: firstById("login-password"),
  regName: firstById("reg-name"),
  regEmail: firstById("reg-email"),
  regPassword: firstById("reg-password"),
  regConfirm: firstById("reg-confirm"),
  forgotEmail: firstById("forgot-email"),

  bookingsModal: firstById("bookings-modal"),
  bookingsList: firstById("bookings-list", "bookings-modal-body"),

  favoritesModal: firstById("favorites-modal"),
  favoritesList: firstById("favorites-list"),

  chatModal: firstById("chat-modal"),
  chatMessages: firstById("chat-messages"),
  chatInput: firstById("chat-input", "chat-textarea"),
  chatSendBtn: firstById("chat-send-btn"),
  chatSendForm: firstById("chat-send-form"),
  chatOpenBtn: firstById("chat-open-btn", "chat-fab-btn"),
  chatUnreadBadge: firstById("chat-unread-badge"),
  chatTitle: firstById("chat-title"),
  chatSubtitle: firstById("chat-subtitle"),
  chatEmptyState: firstById("chat-empty-state"),
  chatEmptyTitle: firstById("chat-empty-title"),
  chatEmptySubtitle: firstById("chat-empty-subtitle"),
  chatConnectionStatus: firstById("chat-connection-status"),
  chatConnectionText: firstById("chat-connection-text"),
  chatNote: firstById("chat-note"),
  chatCurrentId: firstById("chat-current-id"),
  chatCurrentBookingId: firstById("chat-current-booking-id"),
  chatCurrentUserId: firstById("chat-current-user-id"),
  chatCurrentUserEmail: firstById("chat-current-user-email"),
  chatCurrentUserName: firstById("chat-current-user-name"),
  chatPropertyId: firstById("chat-property-id"),

  scrollTopBtn: firstById("scroll-top-btn"),
  toastContainer: firstById("toast-container"),

  navAuthBtn: firstById("nav-auth-btn", "auth-cta"),
  navSignInText: firstById("nav-sign-in-text"),

  siteLogo: firstById("main-logo", "site-logo"),
  authLogo: firstById("modal-logo", "auth-logo"),

  // ── FIX: البحث عن زر الإغلاق بطرق متعددة لضمان إيجاده ──
  closeAuthBtn: firstById("close-auth-btn") ||
                firstQuery(".auth-modal .close-btn, .auth-modal [data-close], .auth-modal .modal-close, #auth-modal .close-btn, #auth-modal [data-close], #auth-modal .modal-close"),

  closeBookingsBtn: firstById("close-bookings-btn"),
  chatCloseBtn: firstById("chat-close-btn"),

  goToRegister: firstById("go-to-register"),
  goToLogin: firstById("go-to-login"),
  goToForgot: firstById("go-to-forgot"),
  backToLogin: firstById("back-to-login")
};

// ──────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────
function showToast(msg, type = "info") {
  let host = $("toast-container");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-container";
    host.style.cssText = `
      position:fixed;
      top:20px;
      right:20px;
      z-index:20000;
      display:flex;
      flex-direction:column;
      gap:10px;
      max-width:min(92vw, 360px);
    `;
    document.body.appendChild(host);
  }

  const colors = {
    success: { bg: "#ecfdf5", border: "#10b981", color: "#047857", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", border: "#ef4444", color: "#b91c1c", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8", icon: "ph-info" },
    warning: { bg: "#fffbeb", border: "#f59e0b", color: "#92400e", icon: "ph-warning" }
  };

  const c = colors[type] || colors.info;
  const toast = document.createElement("div");
  toast.className = "toast " + type;
  toast.innerHTML = `
    <i class="ph ${c.icon}" style="font-size:1.1rem;flex-shrink:0;margin-top:2px;color:${c.color}"></i>
    <span>${escapeHtml(msg)}</span>
  `;
  toast.style.cssText = `
    display:flex;
    align-items:flex-start;
    gap:10px;
    padding:14px 16px;
    border:1px solid ${c.border};
    border-radius:14px;
    box-shadow:0 16px 30px rgba(15,23,42,.12);
    background:${c.bg};
    color:${c.color};
    font-weight:700;
  `;

  host.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    setTimeout(() => toast.remove(), 260);
  }, 3000);
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = String(str ?? "");
  return d.innerHTML;
}

function cleanText(v) {
  return String(v ?? "").trim();
}

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function getServerTimestamp() {
  return firestoreFieldValue?.serverTimestamp ? firestoreFieldValue.serverTimestamp() : new Date();
}

function formatCurrency(amount) {
  const n = Number(amount || 0);
  return state.lang === "ar"
    ? `${n.toLocaleString("ar-DZ")} د.ج`
    : `${n.toLocaleString("en-US")} DZD`;
}

function formatChatTime(value) {
  try {
    if (!value) return "";
    if (typeof value?.toDate === "function") {
      return value.toDate().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (typeof value === "object" && typeof value.seconds === "number") {
      return new Date(value.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function getMessageTimeValue(msg = {}) {
  const value = msg.createdAt || msg.createdAtServer || msg.timestamp || msg.sentAt || msg.time || null;
  try {
    if (!value) return 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    if (typeof value === "object" && typeof value.seconds === "number") {
      return (value.seconds * 1000) + Math.floor((value.nanoseconds || 0) / 1000000);
    }
    const d = new Date(value);
    return Number.isFinite(d.getTime()) ? d.getTime() : 0;
  } catch {
    return 0;
  }
}

function normalizeMessage(msg = {}) {
  const roleRaw = cleanText(msg.senderRole || msg.role || msg.sender || "customer").toLowerCase();
  const role = ["admin", "owner", "host", "support"].includes(roleRaw) ? "admin" : "customer";
  return {
    ...msg,
    role,
    text: cleanText(msg.text || msg.message || msg.body || msg.content || ""),
    time: formatChatTime(msg.createdAt || msg.createdAtServer || msg.timestamp || msg.sentAt || msg.time)
  };
}

function sortChatMessages(list = []) {
  return [...list].sort((a, b) => {
    const diff = getMessageTimeValue(a) - getMessageTimeValue(b);
    if (diff !== 0) return diff;
    return cleanText(a.id).localeCompare(cleanText(b.id));
  });
}

function normalizeRole(value) {
  return cleanText(value).toLowerCase();
}

function isBackofficeRole(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "owner" || r === "property_admin";
}

async function getUserProfile(uid) {
  if (!db || !uid) return null;
  try {
    const doc = await db.collection("users").doc(uid).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (err) {
    console.warn("getUserProfile error:", err);
    return null;
  }
}

function setChatStatus(mode = "syncing", text = "") {
  if (!els.chatConnectionStatus) return;
  els.chatConnectionStatus.classList.remove("connected", "syncing", "error");
  els.chatConnectionStatus.classList.add(mode);
  if (els.chatConnectionText) {
    els.chatConnectionText.textContent =
      text ||
      (mode === "connected" ? t("chatConnected") :
      mode === "error" ? t("chatError") :
      t("chatSyncing"));
  }
}

function setUnreadBadge() {
  if (!els.chatUnreadBadge) return;
  const count = state.chatUnread || 0;
  els.chatUnreadBadge.textContent = String(count);
  els.chatUnreadBadge.style.display = count > 0 ? "inline-flex" : "none";
}

function getCurrentUserName(user = state.currentUser) {
  return cleanText(
    user?.displayName ||
    user?.name ||
    state.currentUserProfile?.name ||
    user?.email ||
    "Guest"
  );
}

function getCurrentUserEmail(user = state.currentUser) {
  return cleanText(user?.email || state.currentUserProfile?.email || "");
}

function updateChatHiddenFields(chatId = state.currentChatId) {
  if (els.chatCurrentId) els.chatCurrentId.value = chatId || "";
  if (els.chatCurrentUserId) els.chatCurrentUserId.value = cleanText(state.currentUser?.uid || "");
  if (els.chatCurrentUserEmail) els.chatCurrentUserEmail.value = getCurrentUserEmail();
  if (els.chatCurrentUserName) els.chatCurrentUserName.value = getCurrentUserName();
}

function stopChatSubscription() {
  if (typeof state.currentChatUnsub === "function") {
    try {
      state.currentChatUnsub();
    } catch {}
  }
  state.currentChatUnsub = null;
}

function resetFrontendUserState() {
  state.currentUser = null;
  state.currentUserProfile = null;
  state.chatMessages = [];
  state.chatUnread = 0;
  state.currentChatId = "";
  state.chatInitializedForUser = "";
  safeRemove("ore_current_chat_id");
  stopChatSubscription();
  setUnreadBadge();
  setChatStatus("syncing", t("chatPreparing"));
  renderChatMessages();
  updateChatHiddenFields("");
}

function applyGuestAuthUI() {
  const navAuthBtn = els.navAuthBtn || $("nav-auth-btn") || $("auth-cta");
  const signInText = els.navSignInText || navAuthBtn?.querySelector("span");

  if (navAuthBtn) {
    const icon = navAuthBtn.querySelector("i");
    if (icon) icon.className = "ph ph-sign-in";
    if (signInText) signInText.textContent = t("signIn");
  }

  if (els.profileMenu) {
    const icon = els.profileMenu.querySelector("i");
    if (icon) icon.className = "ph ph-user";
    // أزل class تسجيل الدخول
    els.profileMenu.classList.remove("auth-btn-logged");
    els.profileMenu.classList.add("auth-btn-guest");
  }

  if (els.dropdownUserName) els.dropdownUserName.textContent = t("guestUser");
  if (els.dropdownUserEmail) els.dropdownUserEmail.textContent = t("signInToContinue");
  if (els.logoutBtn) els.logoutBtn.style.display = "none";
  if (els.myBookingsBtn) els.myBookingsBtn.style.display = "none";
  if (els.myFavoritesBtn) els.myFavoritesBtn.style.display = "none";
  if (els.userPoints) els.userPoints.textContent = "0";
}

// ──────────────────────────────────────────
// Logo + Theme + Lang
// ──────────────────────────────────────────
function getThemeLogoPath() {
  return state.theme === "dark" ? "logos/orebooking2.png" : "logos/orebooking.png";
}

function updateThemeLogos() {
  const nextSrc = getThemeLogoPath();
  [els.siteLogo, els.authLogo].forEach((img) => {
    if (img) img.src = nextSrc;
  });
}

function applyLang() {
  const html = els.html;
  html.lang = state.lang;
  html.dir = state.lang === "ar" ? "rtl" : "ltr";

  const langLabel = els.langBtnText || els.langBtn?.querySelector("span");
  if (langLabel) langLabel.textContent = state.lang === "ar" ? "EN" : "AR";

  if (els.heroTitle) els.heroTitle.textContent = t("heroTitle");
  if (els.heroDesc) els.heroDesc.textContent = t("heroDesc");
  if (els.searchInput) els.searchInput.placeholder = t("searchPlaceholder");
  if (els.sectionTitle) els.sectionTitle.textContent = t("featuredProperties");
  if (els.sectionDesc) els.sectionDesc.textContent = t("featuredDesc");
  if (els.chatInput) els.chatInput.placeholder = t("chatPlaceholder");
  if (els.chatEmptyTitle) els.chatEmptyTitle.textContent = t("noMessages");
  if (els.chatEmptySubtitle) els.chatEmptySubtitle.textContent = t("startConversation");
  if (els.chatNote) els.chatNote.textContent = t("chatWorksNow");
  if (els.chatTitle) els.chatTitle.textContent = t("chatTitle");
  if (els.chatSubtitle) els.chatSubtitle.textContent = t("chatSubtitle");

  if (els.rewardsBadge) {
    const spans = els.rewardsBadge.querySelectorAll("span");
    if (spans[0] && spans.length === 1) spans[0].textContent = t("loyaltyRewards");
    if (spans[1]) spans[1].textContent = t("points");
  }

  if (els.myBookingsBtn) {
    const span = els.myBookingsBtn.querySelector("span");
    if (span) span.textContent = t("myBookings");
  }

  if (els.myFavoritesBtn) {
    const span = els.myFavoritesBtn.querySelector("span");
    if (span) span.textContent = t("myFavorites");
  }

  if (els.openChatBtn) {
    const span = els.openChatBtn.querySelector("span");
    if (span) span.textContent = t("supportChat");
  }

  if (els.logoutBtn) {
    const span = els.logoutBtn.querySelector("span");
    if (span) span.textContent = t("signOut");
  }

  if (els.navAuthBtn && !state.currentUser) {
    const span = els.navAuthBtn.querySelector("span");
    if (span) span.textContent = t("signIn");
  }

  if (els.searchBtn) {
    const span = els.searchBtn.querySelector("span");
    if (span) span.textContent = t("searchBtn");
  }

  if (els.clearSearchBtn) {
    const span = els.clearSearchBtn.querySelector("span");
    if (span) span.textContent = t("clearSearch");
  }

  const sendChatText = $("send-chat-text");
  if (sendChatText) sendChatText.textContent = t("sendMessage");

  if (els.sortSelect) {
    const opts = els.sortSelect.options;
    const order = {
      featured: t("sortDefault"),
      rating: t("sortRating"),
      pricelow: t("sortPriceLow"),
      pricehigh: t("sortPriceHigh")
    };
    Array.from(opts).forEach((opt) => {
      const key = cleanText(opt.value).toLowerCase();
      if (order[key]) opt.text = order[key];
    });
  }

  if (els.checkInInput) {
    const label = document.querySelector('label[for="search-checkin"]');
    if (label) label.textContent = t("checkInLabel");
  }

  if (els.checkOutInput) {
    const label = document.querySelector('label[for="search-checkout"]');
    if (label) label.textContent = t("checkOutLabel");
  }

  if (els.guestsInput) {
    const label = document.querySelector('label[for="search-guests"]');
    if (label) label.textContent = t("guestsLabel");
  }

  if (els.searchInput) {
    const label = document.querySelector(`label[for="${els.searchInput.id}"]`);
    if (label) label.textContent = t("searchHint");
  }

  $$(".category-item").forEach((btn) => {
    const raw = btn.dataset.category || cleanText(btn.textContent).toLowerCase();
    const normalized =
      raw === "hotels" ? "hotel" :
      raw === "villas" ? "villa" :
      raw === "apartments" ? "apartment" :
      raw;

    const key =
      normalized === "all" ? "allStays" :
      normalized === "hotel" ? "hotels" :
      normalized === "villa" ? "villas" :
      "apartments";

    const span = btn.querySelector("span");
    if (span) span.textContent = t(key);
  });

  renderListings();
  renderBookings();
  renderFavorites();
  renderChatMessages();
}

function applyTheme() {
  if (state.theme === "dark") {
    els.body.classList.add("dark");
    els.html.classList.add("dark");
    els.html.classList.remove("preload-dark");
  } else {
    els.body.classList.remove("dark");
    els.html.classList.remove("dark");
    els.html.classList.remove("preload-dark");
  }

  const btn = els.themeBtn || $("theme-toggle");
  if (btn) {
    const icon = btn.querySelector("i");
    if (icon) icon.className = state.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
  }

  updateThemeLogos();
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  safeSet("ore_theme", state.theme);
  safeSet("oretheme", state.theme);
  applyTheme();
}

function toggleLang() {
  state.lang = state.lang === "ar" ? "en" : "ar";
  safeSet("ore_lang", state.lang);
  safeSet("orelang", state.lang);
  applyLang();
}

// ──────────────────────────────────────────
// Modal helpers
// ──────────────────────────────────────────
function openModal(el) {
  if (!el) return;
  el.classList.add("active");
  el.setAttribute("aria-hidden", "false");
  els.body.classList.add("modal-open");
}

function closeModal(el) {
  if (!el) return;
  el.classList.remove("active");
  el.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".modal-overlay.active, .bookings-modal.active, .chat-modal.active")) {
    els.body.classList.remove("modal-open");
  }
}

// ──────────────────────────────────────────
// Profile Dropdown
// ──────────────────────────────────────────
function openProfileDropdown() {
  if (!els.profileDropdown || !els.profileMenu) return;
  els.profileDropdown.classList.add("active");
  els.profileMenu.setAttribute("aria-expanded", "true");
  els.profileDropdown.setAttribute("aria-hidden", "false");
}

function closeProfileDropdown() {
  if (!els.profileDropdown || !els.profileMenu) return;
  els.profileDropdown.classList.remove("active");
  els.profileMenu.setAttribute("aria-expanded", "false");
  els.profileDropdown.setAttribute("aria-hidden", "true");
}

function toggleProfileDropdown(force) {
  if (!els.profileDropdown) return;
  const shouldOpen = typeof force === "boolean" ? force : !els.profileDropdown.classList.contains("active");
  if (shouldOpen) openProfileDropdown();
  else closeProfileDropdown();
}

// ──────────────────────────────────────────
// Auth UI
// ──────────────────────────────────────────
async function updateAuthUI(user) {
  const prevUid = state.currentUser?.uid || "";
  const navAuthBtn = els.navAuthBtn || $("nav-auth-btn") || $("auth-cta");

  if (!user) {
    applyGuestAuthUI();
    resetFrontendUserState();
    state.bookings = [];
    renderBookings();
    renderFavorites();
    return;
  }

  let profile = null;
  let role = "";

  if (db) {
    profile = await getUserProfile(user.uid);
    role = normalizeRole(profile?.role);
  }

  if (isBackofficeRole(role)) {
    applyGuestAuthUI();
    resetFrontendUserState();
    closeProfileDropdown();
    if (els.loginEmail) els.loginEmail.value = user.email || "";
    return;
  }

  state.currentUser = user;
  state.currentUserProfile = profile || null;

  if (navAuthBtn) {
    const icon = navAuthBtn.querySelector("i");
    if (icon) icon.className = "ph ph-user-circle-check";
    const span = navAuthBtn.querySelector("span");
    if (span) span.textContent = profile?.name || user.displayName || user.email || t("myBookings");
  }

  if (els.profileMenu) {
    const icon = els.profileMenu.querySelector("i");
    if (icon) icon.className = "ph ph-user-circle-check";
    // أضف class تدل على أن المستخدم مسجل دخوله (مهمة للـ inline script في index.html)
    els.profileMenu.classList.add("auth-btn-logged");
    els.profileMenu.classList.remove("auth-btn-guest");
  }

  if (els.dropdownUserName) {
    els.dropdownUserName.textContent = profile?.name || user.displayName || user.email || t("guestUser");
  }

  if (els.dropdownUserEmail) {
    els.dropdownUserEmail.textContent = user.email || t("signInToContinue");
  }

  if (els.logoutBtn) els.logoutBtn.style.display = "flex";
  if (els.myBookingsBtn) els.myBookingsBtn.style.display = "flex";
  if (els.myFavoritesBtn) els.myFavoritesBtn.style.display = "flex";
  if (els.userPoints) els.userPoints.textContent = String(profile?.points || 0);
  if (els.loginEmail && user.email) els.loginEmail.value = user.email;

  updateChatHiddenFields();

  if (prevUid !== user.uid) {
    stopChatSubscription();
    state.chatMessages = [];
    state.chatUnread = 0;
    state.currentChatId = "";
    state.chatInitializedForUser = "";
    setUnreadBadge();
    renderChatMessages();
    setChatStatus("syncing", t("chatPreparing"));
  }

  renderFavorites();
}

function showAuthModal(tab = "login") {
  state.authTab = tab;
  if (els.authModal) {
    openModal(els.authModal);
    showAuthForm(tab);
    clearAuthMessage();
    closeProfileDropdown();
  }
}

// ── FIX: دالة إغلاق النافذة المحسّنة ──
function hideAuthModal() {
  // إغلاق النافذة الأساسية
  if (els.authModal) {
    closeModal(els.authModal);
    clearAuthMessage();
    return;
  }
  // fallback: البحث عن أي modal مفتوح وإغلاقه
  const openModal = document.querySelector(".modal-overlay.active, [class*='auth'][class*='modal'].active, #auth-modal.active");
  if (openModal) {
    openModal.classList.remove("active");
    openModal.setAttribute("aria-hidden", "true");
    if (!document.querySelector(".modal-overlay.active, .bookings-modal.active, .chat-modal.active")) {
      document.body.classList.remove("modal-open");
    }
  }
  clearAuthMessage();
}

function showAuthForm(tab) {
  ["login", "register", "forgot"].forEach((f) => {
    const form = $(f + "-form");
    if (form) form.classList.toggle("active", f === tab);
  });
  state.authTab = tab;
}

function showAuthMessage(msg, type = "error") {
  if (!els.authMessage) return;
  els.authMessage.className = "auth-message " + type;
  els.authMessage.textContent = msg;
}

function clearAuthMessage() {
  if (!els.authMessage) return;
  els.authMessage.className = "auth-message";
  els.authMessage.textContent = "";
}

// ──────────────────────────────────────────
// Auth Actions
// ──────────────────────────────────────────
function handleLogin(e) {
  if (e) e.preventDefault();
  if (!auth) return showToast(t("firebaseMissing"), "error");

  const email = els.loginEmail?.value?.trim();
  const pass = els.loginPassword?.value;

  if (!email || !pass) return showAuthMessage(t("fillAllFields"));

  clearAuthMessage();

  const btn = $("login-submit-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i>';
  }

  auth.signInWithEmailAndPassword(email, pass)
    .then(async (cred) => {
      const user = cred?.user;
      const profile = user && db ? await getUserProfile(user.uid) : null;
      const role = normalizeRole(profile?.role);

      if (isBackofficeRole(role)) {
        await auth.signOut();
        showAuthMessage(t("adminFrontendBlocked"));
        applyGuestAuthUI();
        resetFrontendUserState();
        return;
      }

      hideAuthModal();
      showToast(t("signedInDone"), "success");
    })
    .catch((err) => {
      showAuthMessage(getAuthError(err));
    })
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>${t("signIn")}</span>`;
      }
    });
}

function handleRegister(e) {
  if (e) e.preventDefault();
  if (!auth) return showToast(t("firebaseMissing"), "error");

  const name = els.regName?.value?.trim();
  const email = els.regEmail?.value?.trim();
  const pass = els.regPassword?.value;
  const confirm = els.regConfirm?.value;

  if (!name || !email || !pass || !confirm) return showAuthMessage(t("fillAllFields"));
  if (pass !== confirm) return showAuthMessage(state.lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords don't match");
  if (pass.length < 6) return showAuthMessage(t("passwordShort"));

  clearAuthMessage();

  const btn = $("register-submit-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i>';
  }

  auth.createUserWithEmailAndPassword(email, pass)
    .then((cred) => {
      return cred.user.updateProfile({ displayName: name }).then(() => {
        if (db) {
          return db.collection("users").doc(cred.user.uid).set({
            name,
            email,
            role: "user",
            points: 0,
            createdAt: new Date()
          }, { merge: true });
        }
      });
    })
    .then(() => {
      hideAuthModal();
      showToast(t("accountCreated"), "success");
    })
    .catch((err) => showAuthMessage(getAuthError(err)))
    .finally(() => {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = `<span>${t("register")}</span>`;
      }
    });
}

function handleForgot(e) {
  if (e) e.preventDefault();
  if (!auth) return showToast(t("firebaseMissing"), "error");

  const email = els.forgotEmail?.value?.trim();
  if (!email) return showAuthMessage(state.lang === "ar" ? "أدخل بريدك الإلكتروني" : "Enter your email");

  clearAuthMessage();

  const btn = $("forgot-submit-btn");
  if (btn) btn.disabled = true;

  auth.sendPasswordResetEmail(email)
    .then(() => showAuthMessage(t("resetSent"), "success"))
    .catch((err) => showAuthMessage(getAuthError(err)))
    .finally(() => {
      if (btn) btn.disabled = false;
    });
}

function handleLogout() {
  if (!auth) return;
  auth.signOut()
    .then(() => {
      closeProfileDropdown();
      showToast(t("signedOut"), "info");
    })
    .catch((err) => {
      console.warn("signOut error:", err);
      showToast(t("chatError"), "error");
    });
}

function getAuthError(err) {
  const ar = state.lang === "ar";
  const map = {
    "auth/user-not-found": ar ? "لا يوجد حساب بهذا البريد" : "No account with this email",
    "auth/wrong-password": ar ? "كلمة المرور غير صحيحة" : "Incorrect password",
    "auth/email-already-in-use": ar ? "البريد الإلكتروني مستخدم بالفعل" : "Email already in use",
    "auth/invalid-email": ar ? "بريد إلكتروني غير صالح" : "Invalid email address",
    "auth/too-many-requests": ar ? "محاولات كثيرة، حاول لاحقاً" : "Too many attempts, try later",
    "auth/weak-password": ar ? "كلمة المرور ضعيفة جداً" : "Password is too weak",
    "auth/invalid-credential": ar ? "بيانات الدخول غير صحيحة" : "Invalid credentials"
  };

  return map[err?.code] || (ar ? "حدث خطأ، حاول مرة أخرى" : "An error occurred, try again");
}

// ──────────────────────────────────────────
// Properties
// ──────────────────────────────────────────
function showLoadingState() {
  if (!els.listingsGrid) return;
  els.listingsGrid.innerHTML = `
    <div class="listings-empty-state" style="grid-column:1/-1;">
      <i class="ph ph-spinner-gap ph-spin" style="font-size:2.5rem;color:var(--primary);display:block;margin-bottom:14px;"></i>
      <p style="font-weight:700;">${t("loading")}</p>
    </div>
  `;
}

function showEmptyState(msg, desc) {
  if (!els.listingsGrid) return;
  els.listingsGrid.innerHTML = `
    <div class="listings-empty-state" style="grid-column:1/-1;">
      <i class="ph ph-building-apartment"></i>
      <p style="font-weight:800;font-size:1.1rem;margin-bottom:8px;">${escapeHtml(msg)}</p>
      <p>${escapeHtml(desc)}</p>
    </div>
  `;
}

async function loadProperties() {
  if (!db) {
    applyFilters();
    return;
  }

  showLoadingState();

  try {
    let loaded = [];
    const snap = await db.collection("properties").get();
    snap.forEach((doc) => loaded.push({ id: doc.id, ...doc.data() }));
    loaded = loaded.filter((p) => p?.isActive !== false);
    state.allProperties = loaded;
    applyFilters();
  } catch (err) {
    console.error("Load properties error:", err);
    applyFilters();
  }
}

function normalizeCategory(cat = "") {
  const val = String(cat).toLowerCase();
  if (val.includes("hotel") || val.includes("فندق")) return "hotel";
  if (val.includes("villa") || val.includes("فيلا")) return "villa";
  if (val.includes("apartment") || val.includes("شقة")) return "apartment";
  return val || "all";
}

function applyFilters() {
  let list = [...state.allProperties];

  if (state.activeCategory !== "all") {
    list = list.filter((p) => {
      const type = normalizeCategory(p.type || p.typeEn || p.typeAr || "");
      return type === state.activeCategory;
    });
  }

  if (state.searchQuery.trim()) {
    const q = state.searchQuery.trim().toLowerCase();
    list = list.filter((p) => {
      const title = String(p.titleEn || p.titleAr || p.title || "").toLowerCase();
      const loc = String(p.locationEn || p.locationAr || p.location || "").toLowerCase();
      const desc = String(p.descriptionEn || p.descriptionAr || p.description || "").toLowerCase();
      return title.includes(q) || loc.includes(q) || desc.includes(q);
    });
  }

  if (els.checkInInput?.value) {
    list = list.filter((p) => {
      if (!p.availableFrom) return true;
      return new Date(els.checkInInput.value) >= new Date(p.availableFrom);
    });
  }

  if (els.checkOutInput?.value) {
    list = list.filter((p) => {
      if (!p.availableTo) return true;
      return new Date(els.checkOutInput.value) <= new Date(p.availableTo);
    });
  }

  const guestCount = Number(els.guestsInput?.value || 0);
  if (guestCount > 0) {
    list = list.filter((p) => Number(p.guests || p.maxGuests || 0) >= guestCount || !Number(p.guests || p.maxGuests || 0));
  }

  if (state.sortBy === "price_low" || state.sortBy === "price-low" || state.sortBy === "pricelow") {
    list.sort((a, b) => getPrice(a) - getPrice(b));
  } else if (state.sortBy === "price_high" || state.sortBy === "price-high" || state.sortBy === "pricehigh") {
    list.sort((a, b) => getPrice(b) - getPrice(a));
  } else if (state.sortBy === "rating" || state.sortBy === "rating-high") {
    list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  }

  state.filteredProperties = list;
  renderListings();
}

function getPrice(p) {
  return Number(p.price || p.pricePerNight || p.basePrice || 0);
}

function getTitle(p) {
  return state.lang === "ar"
    ? (p.titleAr || p.title || p.titleEn || "Property")
    : (p.titleEn || p.title || p.titleAr || "Property");
}

function getLocation(p) {
  return state.lang === "ar"
    ? (p.locationAr || p.location || p.locationEn || "")
    : (p.locationEn || p.location || p.locationAr || "");
}

function getType(p) {
  return state.lang === "ar"
    ? (p.typeAr || p.type || p.typeEn || "")
    : (p.typeEn || p.type || p.typeAr || "");
}

function getImage(p) {
  if (p.imageUrl) return p.imageUrl;
  if (p.mainImage) return p.mainImage;
  if (Array.isArray(p.images) && p.images.length) return p.images[0];
  return "images/placeholder.jpg";
}

function isFavorite(propertyId) {
  return state.favorites.includes(propertyId);
}

function toggleFavorite(propertyId) {
  if (!propertyId) return;

  const exists = state.favorites.includes(propertyId);
  if (exists) {
    state.favorites = state.favorites.filter((id) => id !== propertyId);
    showToast(t("favRemoved"), "info");
  } else {
    state.favorites.push(propertyId);
    showToast(t("favAdded"), "success");
  }

  safeJsonSet("ore_favorites", state.favorites);
  renderListings();
  renderFavorites();
}

function goToPropertyDetails(propertyId) {
  if (!propertyId) return;
  window.location.href = `details.html?id=${encodeURIComponent(propertyId)}`;
}

function goToBooking(propertyId) {
  if (!propertyId) return;
  window.location.href = `booking.html?id=${encodeURIComponent(propertyId)}`;
}

function renderListings() {
  if (!els.listingsGrid) return;

  if (!state.filteredProperties.length) {
    showEmptyState(t("noResults"), t("noResultsDesc"));
    return;
  }

  els.listingsGrid.innerHTML = state.filteredProperties.map((p) => {
    const id = p.id || "";
    const image = getImage(p);
    const title = getTitle(p);
    const location = getLocation(p);
    const type = getType(p);
    const price = getPrice(p);
    const rating = Number(p.rating || 0).toFixed(1);

    return `
      <article class="property-card">
        <div class="property-card-media">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
          <button class="favorite-btn ${isFavorite(id) ? "active" : ""}" type="button" data-fav-id="${escapeHtml(id)}" aria-label="Favorite">
            <i class="ph ${isFavorite(id) ? "ph-heart-fill" : "ph-heart"}"></i>
          </button>
          <span class="property-urgency">
            <i class="ph ph-sparkle"></i>
            <span>${t("newBadge")}</span>
          </span>
        </div>
        <div class="property-card-body">
          <div class="property-card-top">
            <h3 class="property-card-title">${escapeHtml(title)}</h3>
            <span class="property-card-rating"><i class="ph ph-star-fill"></i>${escapeHtml(rating)}</span>
          </div>
          <p class="property-card-location"><i class="ph ph-map-pin"></i><span>${escapeHtml(location)}</span></p>
          <p class="property-card-meta"><i class="ph ph-buildings"></i><span>${escapeHtml(type)}</span></p>
          <div class="property-card-price">${escapeHtml(formatCurrency(price))} <span>/ ${t("night")}</span></div>
          <div class="property-card-actions">
            <button type="button" onclick="goToPropertyDetails('${escapeHtml(id)}')">
              <i class="ph ph-info"></i><span>${t("viewDetails")}</span>
            </button>
            <button type="button" class="primary" onclick="goToBooking('${escapeHtml(id)}')">
              <i class="ph ph-calendar-check"></i><span>${t("bookNow")}</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  $$("[data-fav-id]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.favId));
  });

  if (els.listingsCount) els.listingsCount.textContent = String(state.filteredProperties.length);
}

// ──────────────────────────────────────────
// Bookings
// ──────────────────────────────────────────
async function loadBookings() {
  if (!db || !state.currentUser?.uid) {
    state.bookings = [];
    renderBookings();
    return;
  }

  try {
    const snap = await db.collection("bookings").where("userId", "==", state.currentUser.uid).get();
    const items = [];
    snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    state.bookings = items;
    renderBookings();
  } catch (err) {
    console.warn("loadBookings error:", err);
    state.bookings = [];
    renderBookings();
  }
}

function renderBookings() {
  if (!els.bookingsList) return;

  if (!state.currentUser) {
    els.bookingsList.innerHTML = `<div class="booking-entry"><p>${escapeHtml(t("loginRequired"))}</p></div>`;
    return;
  }

  if (!state.bookings.length) {
    els.bookingsList.innerHTML = `
      <div class="booking-entry">
        <h4 class="booking-entry-title">${escapeHtml(t("noBookings"))}</h4>
        <p>${escapeHtml(t("noBookingsDesc"))}</p>
      </div>
    `;
    return;
  }

  els.bookingsList.innerHTML = state.bookings.map((b) => {
    const title = cleanText(b.propertyTitle || b.propertyName || "Property");
    const statusRaw = cleanText(b.status || "pending").toLowerCase();
    const statusText = t(`status_${statusRaw}`) || statusRaw;
    const checkIn = cleanText(b.checkIn || b.startDate || "");
    const checkOut = cleanText(b.checkOut || b.endDate || "");
    const total = formatCurrency(b.total || b.totalPrice || 0);

    return `
      <div class="booking-entry">
        <div class="booking-entry-head">
          <div>
            <h4 class="booking-entry-title">${escapeHtml(title)}</h4>
            <div class="booking-entry-meta">
              <span>${escapeHtml(checkIn)}${checkOut ? ` — ${escapeHtml(checkOut)}` : ""}</span>
              <span>${escapeHtml(total)}</span>
            </div>
          </div>
          <span class="booking-status-badge ${escapeHtml(statusRaw)}">${escapeHtml(statusText)}</span>
        </div>
      </div>
    `;
  }).join("");
}

// ──────────────────────────────────────────
// Favorites
// ──────────────────────────────────────────
function renderFavorites() {
  if (!els.favoritesList) return;

  const items = state.allProperties.filter((p) => state.favorites.includes(p.id));

  if (!items.length) {
    els.favoritesList.innerHTML = `
      <div class="booking-entry">
        <h4 class="booking-entry-title">${escapeHtml(t("noFavorites"))}</h4>
        <p>${escapeHtml(t("noFavoritesDesc"))}</p>
      </div>
    `;
    return;
  }

  els.favoritesList.innerHTML = items.map((p) => `
    <div class="booking-entry">
      <div class="booking-entry-head">
        <div>
          <h4 class="booking-entry-title">${escapeHtml(getTitle(p))}</h4>
          <div class="booking-entry-meta">
            <span>${escapeHtml(getLocation(p))}</span>
            <span>${escapeHtml(formatCurrency(getPrice(p)))}</span>
          </div>
        </div>
        <button type="button" class="dropdown-item text-danger" data-remove-fav="${escapeHtml(p.id)}">
          <i class="ph ph-trash"></i>
          <span>${escapeHtml(t("remove"))}</span>
        </button>
      </div>
    </div>
  `).join("");

  $$("[data-remove-fav]").forEach((btn) => {
    btn.addEventListener("click", () => toggleFavorite(btn.dataset.removeFav));
  });
}

// ──────────────────────────────────────────
// Support Chat
// ──────────────────────────────────────────
function getSupportChatDocId(uid = state.currentUser?.uid) {
  return uid ? `support_${uid}` : "";
}

function getSupportChatMeta(user = state.currentUser) {
  return {
    userId: cleanText(user?.uid || ""),
    userEmail: getCurrentUserEmail(user),
    userName: getCurrentUserName(user),
    userRole: "customer",
    source: "website",
    updatedAt: getServerTimestamp()
  };
}

async function ensureSupportChat(openAfterEnsure = false) {
  if (!db) throw new Error("Firestore unavailable");
  if (!state.currentUser?.uid) throw new Error("User not authenticated");

  const uid = state.currentUser.uid;
  const chatId = getSupportChatDocId(uid);
  const chatRef = db.collection("supportChats").doc(chatId);

  if (
    state.chatInitializedForUser === uid &&
    state.currentChatId === chatId &&
    typeof state.currentChatUnsub === "function"
  ) {
    if (openAfterEnsure) openModal(els.chatModal);
    return chatId;
  }

  setChatStatus("syncing", t("chatPreparing"));

  try {
    const existing = await chatRef.get();
    const existingData = existing.exists ? existing.data() || {} : {};

    await chatRef.set({
      chatId,
      userId: uid,
      userEmail: getCurrentUserEmail(),
      userName: getCurrentUserName(),
      status: "open",
      channel: "support",
      lastMessage: cleanText(existingData.lastMessage || ""),
      lastMessageRole: cleanText(existingData.lastMessageRole || ""),
      lastMessageAt: existingData.lastMessageAt || new Date(),
      createdAt: existingData.createdAt || new Date(),
      updatedAt: new Date()
    }, { merge: true });

    state.currentChatId = chatId;
    state.chatInitializedForUser = uid;
    safeSet("ore_current_chat_id", chatId);
    updateChatHiddenFields(chatId);

    subscribeToCurrentChat(chatId);

    if (openAfterEnsure) openModal(els.chatModal);
    return chatId;
  } catch (err) {
    console.error("ensureSupportChat error:", err);
    setChatStatus("error", t("chatError"));
    throw err;
  }
}

function subscribeToCurrentChat(chatId = state.currentChatId) {
  stopChatSubscription();

  if (!db || !chatId || !state.currentUser?.uid) {
    state.chatMessages = [];
    renderChatMessages();
    return;
  }

  const activeUid = state.currentUser.uid;
  setChatStatus("syncing", t("chatSyncing"));

  state.currentChatUnsub = db
    .collection("supportChats")
    .doc(chatId)
    .collection("messages")
    .onSnapshot(
      (snap) => {
        if (!state.currentUser?.uid || state.currentUser.uid !== activeUid) return;

        const items = [];
        snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));

        state.chatMessages = sortChatMessages(items).map(normalizeMessage);

        if (!state.chatOpen) {
          state.chatUnread = state.chatMessages.filter((m) => m.role === "admin" && !m.readByCustomer).length;
        } else {
          state.chatUnread = 0;
          markAdminMessagesAsRead(chatId);
        }

        setUnreadBadge();
        renderChatMessages();
        setChatStatus("connected", t("chatConnected"));
      },
      (err) => {
        console.error("chat snapshot error:", err);

        if (!state.currentUser?.uid || state.currentUser.uid !== activeUid) return;

        stopChatSubscription();
        state.chatInitializedForUser = "";
        setChatStatus("error", t("chatError"));
      }
    );
}

async function markAdminMessagesAsRead(chatId = state.currentChatId) {
  if (!db || !chatId || !state.currentUser?.uid) return;

  try {
    const snap = await db
      .collection("supportChats")
      .doc(chatId)
      .collection("messages")
      .where("role", "==", "admin")
      .where("readByCustomer", "==", false)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    snap.forEach((doc) => {
      batch.update(doc.ref, {
        readByCustomer: true,
        customerReadAt: new Date(),
        customerReadAtServer: getServerTimestamp()
      });
    });
    await batch.commit();
  } catch (err) {
    console.warn("markAdminMessagesAsRead error:", err);
  }
}

async function sendChatMessage(rawText) {
  const text = cleanText(rawText);
  if (!text) return;

  if (!db) {
    showToast(t("firebaseMissing"), "error");
    return;
  }

  if (!state.currentUser?.uid) {
    showToast(t("loginRequired"), "warning");
    showAuthModal("login");
    return;
  }

  const sendBtn = els.chatSendBtn;

  try {
    if (sendBtn) {
      sendBtn.disabled = true;
      if (!sendBtn.dataset.originalHtml) sendBtn.dataset.originalHtml = sendBtn.innerHTML;
      sendBtn.innerHTML = `<i class="ph ph-spinner-gap ph-spin"></i><span>${t("sendMsg")}</span>`;
    }

    const chatId = state.currentChatId || await ensureSupportChat(false);
    const chatRef = db.collection("supportChats").doc(chatId);
    const messagesRef = chatRef.collection("messages");
    const now = new Date();

    await messagesRef.add({
      text,
      role: "customer",
      senderRole: "customer",
      senderId: cleanText(state.currentUser.uid),
      senderEmail: getCurrentUserEmail(),
      senderName: getCurrentUserName(),
      userId: cleanText(state.currentUser.uid),
      userEmail: getCurrentUserEmail(),
      userName: getCurrentUserName(),
      propertyId: cleanText(els.chatPropertyId?.value || ""),
      createdAt: now,
      createdAtServer: getServerTimestamp(),
      readByAdmin: false,
      readByCustomer: true,
      source: "website"
    });

    await chatRef.set({
      ...getSupportChatMeta(),
      status: "open",
      lastMessage: text,
      lastMessageRole: "customer",
      lastMessageAt: now,
      lastMessageAtServer: getServerTimestamp(),
      updatedAt: now
    }, { merge: true });

    if (els.chatInput) els.chatInput.value = "";
    setChatStatus("connected", t("supportReady"));
  } catch (err) {
    console.error("sendChatMessage error:", err);
    setChatStatus("error", t("chatError"));
    showToast(t("chatError"), "error");
  } finally {
    if (sendBtn) {
      sendBtn.disabled = false;
      if (sendBtn.dataset.originalHtml) sendBtn.innerHTML = sendBtn.dataset.originalHtml;
    }
  }
}

function renderChatMessages() {
  if (!els.chatMessages) return;

  const existingList = els.chatMessages.querySelector(".chat-list");
  if (existingList) existingList.remove();

  if (!state.chatMessages.length) {
    if (els.chatEmptyState) els.chatEmptyState.style.display = "";
    return;
  }

  if (els.chatEmptyState) els.chatEmptyState.style.display = "none";

  const list = document.createElement("div");
  list.className = "chat-list";

  state.chatMessages.forEach((msg) => {
    const row = document.createElement("div");
    row.className = `chat-message ${msg.role === "admin" ? "admin" : "customer"}`;
    row.innerHTML = `
      <div>${escapeHtml(msg.text || "")}</div>
      <span class="chat-meta">${escapeHtml(msg.time || "")}</span>
    `;
    list.appendChild(row);
  });

  els.chatMessages.appendChild(list);
  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function openSupportChat() {
  if (!state.currentUser?.uid) {
    showToast(t("loginRequired"), "warning");
    showAuthModal("login");
    return;
  }

  state.chatOpen = true;
  state.chatUnread = 0;
  setUnreadBadge();
  openModal(els.chatModal);

  ensureSupportChat(true)
    .then(() => markAdminMessagesAsRead())
    .catch((err) => {
      console.warn("openSupportChat error:", err);
      setChatStatus("error", t("chatError"));
    });
}

function closeSupportChat() {
  state.chatOpen = false;
  closeModal(els.chatModal);
}

// ──────────────────────────────────────────
// Events
// ──────────────────────────────────────────
function bindUIEvents() {
  els.themeBtn?.addEventListener("click", toggleTheme);
  els.langBtn?.addEventListener("click", toggleLang);

  els.profileMenu?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (state.currentUser) {
      // المستخدم مسجل دخوله — نفتح/نغلق الـ dropdown فقط
      toggleProfileDropdown();
    } else {
      // المستخدم غير مسجل — نفتح نافذة تسجيل الدخول
      showAuthModal("login");
    }
  });

  document.addEventListener("click", (e) => {
    if (els.profileContainer && !els.profileContainer.contains(e.target)) {
      closeProfileDropdown();
    }
  });

  // ── FIX: ربط زر الإغلاق بكل الطرق الممكنة ──
  // 1. عبر els.closeAuthBtn إذا وُجد
  if (els.closeAuthBtn) {
    els.closeAuthBtn.addEventListener("click", hideAuthModal);
  }

  // 2. ربط أي زر إغلاق داخل auth-modal بشكل مباشر بعد تحميل الـ DOM
  const authModalEl = els.authModal || $("auth-modal");
  if (authModalEl) {
    // ربط كل أزرار الإغلاق المحتملة داخل النافذة
    const closeBtns = authModalEl.querySelectorAll(
      ".close-btn, [data-close], .modal-close, .close-modal, [aria-label='Close'], [aria-label='إغلاق']"
    );
    closeBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        hideAuthModal();
      });
    });

    // 3. إغلاق عند النقر على الخلفية (backdrop) — التأكد من أن النقرة على النافذة نفسها وليس داخلها
    authModalEl.addEventListener("click", (e) => {
      // إذا كانت النقرة على عنصر النافذة مباشرة (الـ overlay) وليس على المحتوى الداخلي
      if (e.target === authModalEl) {
        hideAuthModal();
      }
    });
  }

  // 4. إغلاق بمفتاح Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const authModal = els.authModal || $("auth-modal");
      if (authModal && authModal.classList.contains("active")) {
        hideAuthModal();
        return;
      }
      if (els.bookingsModal && els.bookingsModal.classList.contains("active")) {
        closeModal(els.bookingsModal);
        return;
      }
      if (els.favoritesModal && els.favoritesModal.classList.contains("active")) {
        closeModal(els.favoritesModal);
        return;
      }
      if (els.chatModal && els.chatModal.classList.contains("active")) {
        closeSupportChat();
      }
    }
  });

  els.chatCloseBtn?.addEventListener("click", closeSupportChat);
  els.closeBookingsBtn?.addEventListener("click", () => closeModal(els.bookingsModal));

  // FIX: ربط زر X في نافذة المفضلة
  const closeFavoritesBtn = document.getElementById("close-favorites-btn");
  if (closeFavoritesBtn) {
    closeFavoritesBtn.addEventListener("click", () => closeModal(els.favoritesModal));
  }

  els.favoritesModal?.addEventListener("click", (e) => {
    if (e.target === els.favoritesModal) closeModal(els.favoritesModal);
  });

  els.chatModal?.addEventListener("click", (e) => {
    if (e.target === els.chatModal) closeSupportChat();
  });

  els.logoutBtn?.addEventListener("click", handleLogout);

  els.loginForm?.addEventListener("submit", handleLogin);
  els.registerForm?.addEventListener("submit", handleRegister);
  els.forgotForm?.addEventListener("submit", handleForgot);

  els.goToRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("register");
  });

  els.goToLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("login");
  });

  els.goToForgot?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("forgot");
  });

  els.backToLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("login");
  });

  els.searchBtn?.addEventListener("click", () => {
    state.searchQuery = cleanText(els.searchInput?.value || "");
    applyFilters();
  });

  els.searchInput?.addEventListener("input", () => {
    state.searchQuery = cleanText(els.searchInput?.value || "");
    if (!state.searchQuery) applyFilters();
  });

  els.clearSearchBtn?.addEventListener("click", () => {
    state.searchQuery = "";
    if (els.searchInput) els.searchInput.value = "";
    applyFilters();
  });

  els.sortSelect?.addEventListener("change", () => {
    state.sortBy = cleanText(els.sortSelect.value || "featured").toLowerCase();
    applyFilters();
  });

  els.checkInInput?.addEventListener("change", applyFilters);
  els.checkOutInput?.addEventListener("change", applyFilters);
  els.guestsInput?.addEventListener("input", applyFilters);

  $$(".category-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".category-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      state.activeCategory = normalizeCategory(btn.dataset.category || "all");
      applyFilters();
    });
  });

  els.myBookingsBtn?.addEventListener("click", () => {
    closeProfileDropdown();
    openModal(els.bookingsModal);
  });

  els.myFavoritesBtn?.addEventListener("click", () => {
    closeProfileDropdown();
    if (els.favoritesModal) openModal(els.favoritesModal);
  });

  els.openChatBtn?.addEventListener("click", () => {
    closeProfileDropdown();
    openSupportChat();
  });

  els.chatOpenBtn?.addEventListener("click", openSupportChat);

  els.chatSendBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    sendChatMessage(els.chatInput?.value);
  });

  els.chatSendForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendChatMessage(els.chatInput?.value);
  });

  els.chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage(els.chatInput?.value);
    }
  });

  els.scrollTopBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", () => {
    if (!els.scrollTopBtn) return;
    els.scrollTopBtn.classList.toggle("visible", window.scrollY > 280);
  });
}

// ──────────────────────────────────────────
// Auth listener
// ──────────────────────────────────────────
function initAuthListener() {
  if (!auth) {
    applyGuestAuthUI();
    resetFrontendUserState();
    return;
  }

  auth.onAuthStateChanged(async (user) => {
    try {
      await updateAuthUI(user);
      applyLang();

      if (user?.uid) {
        await loadBookings();
        // ابدأ مراقبة تغييرات الحجوزات لإرسال إشعارات البريد
        startBookingStatusListener(user.uid);

        // إذا كان عنده chat سابق مخزّن، اشترك فيه لاستقبال الإشعارات تلقائياً
        const savedChatId = safeGet("ore_current_chat_id", "");
        if (savedChatId && savedChatId !== state.currentChatId) {
          state.currentChatId = savedChatId;
          state.chatInitializedForUser = user.uid;
          updateChatHiddenFields(savedChatId);
          subscribeToCurrentChat(savedChatId);
        } else if (!savedChatId) {
          // ابدأ chat جديد في الخلفية بدون فتح النافذة
          ensureSupportChat(false).catch(() => {});
        }
      } else {
        stopBookingStatusListener();
        resetFrontendUserState();
      }
    } catch (err) {
      console.error("onAuthStateChanged error:", err);
    }
  });
}


// ──────────────────────────────────────────
// Booking Status Notifications (إشعارات البريد المراسلة)
// ──────────────────────────────────────────
let bookingStatusUnsub = null;

function stopBookingStatusListener() {
  if (typeof bookingStatusUnsub === "function") {
    try { bookingStatusUnsub(); } catch {}
  }
  bookingStatusUnsub = null;
}

function generateRoomNumber() {
  // رقم غرفة عشوائي مكون من رقمين (10-99)
  return String(Math.floor(Math.random() * 90) + 10);
}

function renderBookingNotification(booking, newStatus, roomNumber) {
  const lang = state.lang;
  const propertyName = cleanText(booking.propertyTitle || booking.propertyName || (lang === "ar" ? "الفندق" : "the property"));
  const refId = cleanText(booking.id || "");
  const checkIn = cleanText(booking.checkIn || booking.startDate || "");
  const checkOut = cleanText(booking.checkOut || booking.endDate || "");
  const rejectionReason = cleanText(booking.rejectionReason || booking.cancelReason || "");

  if (newStatus === "confirmed") {
    if (lang === "ar") {
      return `✅ تم تأكيد حجزك في ${propertyName}!
` +
             `رقم المرجع: ${refId}
` +
             (roomNumber ? `رقم الغرفة: ${roomNumber}
` : "") +
             (checkIn ? `تاريخ الدخول: ${checkIn}
` : "") +
             (checkOut ? `تاريخ الخروج: ${checkOut}` : "");
    } else {
      return `✅ Your booking at ${propertyName} has been confirmed!
` +
             `Reference #: ${refId}
` +
             (roomNumber ? `Room Number: ${roomNumber}
` : "") +
             (checkIn ? `Check-in: ${checkIn}
` : "") +
             (checkOut ? `Check-out: ${checkOut}` : "");
    }
  }

  if (newStatus === "rejected" || newStatus === "cancelled") {
    if (lang === "ar") {
      return `❌ تم رفض حجزك في ${propertyName}.
` +
             `رقم المرجع: ${refId}
` +
             (rejectionReason ? `السبب: ${rejectionReason}` : "");
    } else {
      return `❌ Your booking at ${propertyName} has been rejected.
` +
             `Reference #: ${refId}
` +
             (rejectionReason ? `Reason: ${rejectionReason}` : "");
    }
  }

  return "";
}

async function sendBookingNotificationToChat(booking, newStatus) {
  if (!db || !state.currentUser?.uid) return;

  const roomNumber = newStatus === "confirmed" ? generateRoomNumber() : null;
  const message = renderBookingNotification(booking, newStatus, roomNumber);
  if (!message) return;

  try {
    const uid = state.currentUser.uid;

    // 1. تأكد من إنشاء chat doc + subscribe — يضمن أن الرسائل تظهر فوراً
    const chatId = `support_${uid}`;
    const chatRef = db.collection("supportChats").doc(chatId);
    const messagesRef = chatRef.collection("messages");
    const now = new Date();
    const serverTs = firestoreFieldValue?.serverTimestamp
      ? firestoreFieldValue.serverTimestamp()
      : now;

    // أنشئ/حدّث chat document أولاً
    await chatRef.set({
      chatId,
      userId: uid,
      userEmail: getCurrentUserEmail(),
      userName: getCurrentUserName(),
      status: "open",
      channel: "support",
      source: "website",
      updatedAt: now
    }, { merge: true });

    // تأكد من الـ subscription حتى تظهر الرسائل الجديدة في الـ UI فوراً
    if (state.currentChatId !== chatId || typeof state.currentChatUnsub !== "function") {
      state.currentChatId = chatId;
      state.chatInitializedForUser = uid;
      safeSet("ore_current_chat_id", chatId);
      updateChatHiddenFields(chatId);
      subscribeToCurrentChat(chatId);
    }

    // 2. احفظ رقم الغرفة في document الحجز
    if (newStatus === "confirmed" && roomNumber && booking.id) {
      try {
        await db.collection("bookings").doc(booking.id).update({
          roomNumber,
          roomAssignedAt: serverTs,
          notificationSentAt: serverTs
        });
      } catch (e) {
        console.warn("Could not save room number:", e);
      }
    }

    // 3. أضف الرسالة في subcollection messages
    await messagesRef.add({
      text: message,
      role: "admin",
      senderRole: "admin",
      senderId: "system",
      senderName: state.lang === "ar" ? "إشعار الحجز" : "Booking Notification",
      userId: uid,
      userEmail: getCurrentUserEmail(),
      userName: getCurrentUserName(),
      bookingId: cleanText(booking.id || ""),
      notificationType: "booking_status",
      bookingStatus: newStatus,
      roomNumber: roomNumber || null,
      createdAt: now,
      createdAtServer: serverTs,
      readByAdmin: true,
      readByCustomer: false,
      source: "system_notification"
    });

    // 4. حدّث lastMessage في chat document
    await chatRef.update({
      lastMessage: message.split("
")[0],
      lastMessageRole: "admin",
      lastMessageAt: now,
      updatedAt: now
    });

    // 5. حدّث الـ unread badge
    if (!state.chatOpen) {
      state.chatUnread += 1;
      setUnreadBadge();
    }

    // 6. Toast إشعار واضح
    const propName = cleanText(booking.propertyTitle || booking.propertyName || "");
    if (newStatus === "confirmed") {
      showToast(
        state.lang === "ar"
          ? `✅ تم تأكيد حجزك${propName ? " في " + propName : ""} — رقم الغرفة: ${roomNumber}`
          : `✅ Booking confirmed${propName ? " at " + propName : ""} — Room: ${roomNumber}`,
        "success"
      );
    } else {
      showToast(
        state.lang === "ar"
          ? `❌ تم رفض حجزك${propName ? " في " + propName : ""}`
          : `❌ Booking rejected${propName ? " at " + propName : ""}`,
        "error"
      );
    }

    console.log("[OreBooking] Booking notification sent:", newStatus, booking.id);

  } catch (err) {
    console.error("[OreBooking] sendBookingNotificationToChat error:", err);
    // لا نرمي الخطأ حتى لا يمنع loadBookings من الاستمرار
  }
}

function startBookingStatusListener(uid) {
  stopBookingStatusListener();
  if (!db || !uid) return;

  // نبحث عن الحجوزات بكل الحقول المحتملة لـ userId
  // لأن لوحة التحكم قد تحفظ بحقول مختلفة
  const knownStatuses = {};
  let initialized = false;

  function handleSnapshot(snap) {
    snap.forEach((doc) => {
      const data = doc.data();
      const docId = doc.id;
      const newStatus = cleanText(data.status || "").toLowerCase();

      if (!initialized) {
        // أول مرة: سجّل الـ statuses الحالية + تحقق من أي حجز تم تأكيده/رفضه
        // وما أُرسل له إشعار بعد (notifSent غير موجود في doc)
        const notifKey = `ore_notif_${docId}_${newStatus}`;
        const alreadySent = safeGet(notifKey);
        const isTarget = newStatus === "confirmed" || newStatus === "rejected";

        if (isTarget && !alreadySent) {
          // حجز تم البت فيه لكن الزبون ما استلم إشعار — أرسله الآن
          const booking = { id: docId, ...data };
          safeSet(notifKey, "1");
          sendBookingNotificationToChat(booking, newStatus).catch(console.warn);
        }

        knownStatuses[docId] = newStatus;
        return;
      }

      // بعد التهيئة: تحقق من التغيير
      const prevStatus = knownStatuses[docId];
      knownStatuses[docId] = newStatus;

      const isTarget = newStatus === "confirmed" || newStatus === "rejected";
      const changed = prevStatus !== undefined && prevStatus !== newStatus;

      if (isTarget && changed) {
        const notifKey = `ore_notif_${docId}_${newStatus}`;
        if (safeGet(notifKey)) return;
        safeSet(notifKey, "1");

        const booking = { id: docId, ...data };
        sendBookingNotificationToChat(booking, newStatus)
          .then(() => loadBookings())
          .catch(console.warn);
      }
    });

    if (!initialized) {
      initialized = true;
    }
  }

  // الاستماع بحقل userId
  const unsub1 = db
    .collection("bookings")
    .where("userId", "==", uid)
    .onSnapshot(handleSnapshot, (err) => console.warn("bookingListener userId error:", err));

  // الاستماع بحقل customerId (لو لوحة التحكم تستخدم حقلاً مختلفاً)
  const unsub2 = db
    .collection("bookings")
    .where("customerId", "==", uid)
    .onSnapshot(handleSnapshot, (err) => console.warn("bookingListener customerId error:", err));

  // نخزّن دالة إلغاء الاشتراكين معاً
  bookingStatusUnsub = () => {
    try { unsub1(); } catch {}
    try { unsub2(); } catch {}
  };
}

// ──────────────────────────────────────────
// Init
// ──────────────────────────────────────────
function init() {
  applyTheme();
  applyLang();
  bindUIEvents();
  initAuthListener();
  loadProperties();
  setUnreadBadge();
  renderFavorites();
  renderBookings();
  renderChatMessages();
}

document.addEventListener("DOMContentLoaded", init);
