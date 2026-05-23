// =========================================
// script.js — OreBooking Index Page v4.1
// Full Firebase + Auth + Real-time Chat + Listings
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
  chatInitializedForUser: ""
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
    footerCredits: "Developed by"
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
    footerCredits: "تم تطوير هذا الموقع من طرف"
  }
};

function t(key) {
  return (i18n[state.lang] && i18n[state.lang][key]) || (i18n.en[key]) || key;
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
  searchDropdown: firstById("search-dropdown", "destination-dropdown"),
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

  chatModal: firstById("chat-modal"),
  chatMessages: firstById("chat-messages"),
  chatInput: firstById("chat-input", "chat-textarea"),
  chatSendBtn: firstById("chat-send-btn"),
  chatSendForm: firstById("chat-send-form"),
  chatOpenBtn: firstById("chat-open-btn"),
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

  navAuthBtn: firstById("nav-auth-btn", "auth-cta", "open-auth-btn"),
  navSignInText: firstById("nav-sign-in-text"),

  siteLogo: firstById("site-logo"),
  authLogo: firstById("auth-logo")
};

// ──────────────────────────────────────────
// Utilities
// ──────────────────────────────────────────
function showToast(msg, type = "info") {
  let host = $("toast-container");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-container";
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
  toast.style.cssText = `background:${c.bg};border-color:${c.border};color:${c.color};`;

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

function normalizeMessage(msg = {}) {
  const roleRaw = cleanText(msg.senderRole || msg.role || msg.sender || "customer").toLowerCase();
  const role = ["admin", "owner", "host", "support"].includes(roleRaw) ? "admin" : "customer";
  return {
    ...msg,
    role,
    text: cleanText(msg.text || msg.message || msg.body || msg.content || ""),
    time: formatChatTime(msg.createdAt || msg.timestamp || msg.sentAt || msg.time)
  };
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
  safeRemove("ore_current_chat_id");
  stopChatSubscription();
  setUnreadBadge();
  setChatStatus("syncing", t("chatPreparing"));
  renderChatMessages();
  updateChatHiddenFields("");
}

function applyGuestAuthUI() {
  const navAuthBtn = els.navAuthBtn || $("nav-auth-btn") || $("open-auth-btn") || $("auth-cta");
  const signInText = els.navSignInText || navAuthBtn?.querySelector("span");

  if (navAuthBtn) {
    const icon = navAuthBtn.querySelector("i");
    if (icon) icon.className = "ph ph-user";
    if (signInText) signInText.textContent = t("signIn");
  }

  if (els.dropdownUserName) {
    els.dropdownUserName.textContent = t("guestUser");
  }

  if (els.dropdownUserEmail) {
    els.dropdownUserEmail.textContent = t("signInToContinue");
  }

  if (els.logoutBtn) {
    els.logoutBtn.style.display = "none";
  }

  if (els.myBookingsBtn) {
    els.myBookingsBtn.style.display = "none";
  }

  if (els.myFavoritesBtn) {
    els.myFavoritesBtn.style.display = "none";
  }

  if (els.userPoints) {
    els.userPoints.textContent = "0";
  }
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
  if (langLabel) {
    langLabel.textContent = state.lang === "ar" ? "EN" : "AR";
  }

  if (els.heroTitle) els.heroTitle.textContent = t("heroTitle");
  if (els.heroDesc) els.heroDesc.textContent = t("heroDesc");
  if (els.searchInput) els.searchInput.placeholder = t("searchPlaceholder");
  if (els.sectionTitle) els.sectionTitle.textContent = t("sectionTitle");
  if (els.sectionDesc) els.sectionDesc.textContent = t("sectionDesc");
  if (els.chatInput) els.chatInput.placeholder = t("chatPlaceholder");
  if (els.chatEmptyTitle) els.chatEmptyTitle.textContent = t("noMessages");
  if (els.chatEmptySubtitle) els.chatEmptySubtitle.textContent = t("startConversation");
  if (els.chatNote) els.chatNote.textContent = t("chatWorksNow");

  if (els.rewardsBadge) {
    const spans = els.rewardsBadge.querySelectorAll("span");
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

  if (els.logoutBtn) {
    const span = els.logoutBtn.querySelector("span");
    if (span) span.textContent = t("signOut");
  }

  if (els.sortSelect) {
    const opts = els.sortSelect.options;
    if (opts[0]) opts[0].text = t("sortDefault");
    if (opts[1]) opts[1].text = t("sortPriceLow");
    if (opts[2]) opts[2].text = t("sortPriceHigh");
    if (opts[3]) opts[3].text = t("sortRating");
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
    const searchLabel = document.querySelector(`label[for="${els.searchInput.id}"]`);
    if (searchLabel) searchLabel.textContent = t("destinationLabel");
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

    const icon = btn.querySelector("i");
    const textNode = btn.querySelector("span") || btn;
    if (textNode) {
      if (icon && !btn.querySelector("span")) {
        btn.innerHTML = `${icon.outerHTML} <span>${t(key)}</span>`;
      } else {
        textNode.textContent = t(key);
      }
    }
  });

  $$("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (t(key) !== key) el.textContent = t(key);
  });

  if (state.currentChatId) {
    setChatStatus(state.currentChatUnsub ? "connected" : "syncing");
  }

  renderListings();
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
  renderBookings();
}

// ──────────────────────────────────────────
// Profile Dropdown
// ──────────────────────────────────────────
function openProfileDropdown() {
  if (!els.profileDropdown || !els.profileMenu) return;
  els.profileDropdown.classList.add("active");
  els.profileMenu.setAttribute("aria-expanded", "true");
}

function closeProfileDropdown() {
  if (!els.profileDropdown || !els.profileMenu) return;
  els.profileDropdown.classList.remove("active");
  els.profileMenu.setAttribute("aria-expanded", "false");
}

function toggleProfileDropdown(force) {
  if (!els.profileDropdown) return;
  const shouldOpen =
    typeof force === "boolean"
      ? force
      : !els.profileDropdown.classList.contains("active");

  if (shouldOpen) openProfileDropdown();
  else closeProfileDropdown();
}

// ──────────────────────────────────────────
// Auth UI
// ──────────────────────────────────────────
async function updateAuthUI(user) {
  const prevUid = state.currentUser?.uid || "";
  const navAuthBtn = els.navAuthBtn || $("nav-auth-btn") || $("open-auth-btn") || $("auth-cta");
  const signInText = els.navSignInText || navAuthBtn?.querySelector("span");

  if (!user) {
    applyGuestAuthUI();
    resetFrontendUserState();
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
    if (signInText) {
      signInText.textContent =
        profile?.name ||
        user.displayName ||
        user.email ||
        t("myBookings");
    }
  }

  if (els.dropdownUserName) {
    els.dropdownUserName.textContent =
      profile?.name ||
      user.displayName ||
      user.email ||
      t("guestUser");
  }

  if (els.dropdownUserEmail) {
    els.dropdownUserEmail.textContent = user.email || t("signInToContinue");
  }

  if (els.logoutBtn) {
    els.logoutBtn.style.display = "flex";
  }

  if (els.myBookingsBtn) {
    els.myBookingsBtn.style.display = "flex";
  }

  if (els.myFavoritesBtn) {
    els.myFavoritesBtn.style.display = "flex";
  }

  if (els.userPoints) {
    els.userPoints.textContent = String(profile?.points || 0);
  }

  if (els.loginEmail && user.email) {
    els.loginEmail.value = user.email;
  }

  updateChatHiddenFields();

  if (prevUid !== user.uid) {
    state.chatMessages = [];
    state.chatUnread = 0;
    setUnreadBadge();
    ensureSupportChat(false).catch((err) => console.warn("ensureSupportChat after auth:", err));
  }
}

function showAuthModal(tab = "login") {
  state.authTab = tab;
  if (els.authModal) {
    els.authModal.classList.add("active");
    els.authModal.setAttribute("aria-hidden", "false");
    els.body.classList.add("modal-open");
    showAuthForm(tab);
    clearAuthMessage();
    closeProfileDropdown();
  }
}

function hideAuthModal() {
  if (els.authModal) {
    els.authModal.classList.remove("active");
    els.authModal.setAttribute("aria-hidden", "true");
    els.body.classList.remove("modal-open");
    clearAuthMessage();
  }
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

  if (!email || !pass) {
    return showAuthMessage(t("fillAllFields"));
  }

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

  if (!name || !email || !pass) {
    return showAuthMessage(t("fillAllFields"));
  }

  if (els.regConfirm && pass !== confirm) {
    return showAuthMessage(state.lang === "ar" ? "كلمتا المرور غير متطابقتين" : "Passwords don't match");
  }

  if (pass.length < 6) {
    return showAuthMessage(t("passwordShort"));
  }

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
  if (!email) {
    return showAuthMessage(state.lang === "ar" ? "أدخل بريدك الإلكتروني" : "Enter your email");
  }

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
    const snap = await db.collection("properties").where("isActive", "!=", false).get();
    snap.forEach((doc) => loaded.push({ id: doc.id, ...doc.data() }));

    if (!loaded.length) {
      const snap2 = await db.collection("properties").get();
      snap2.forEach((doc) => loaded.push({ id: doc.id, ...doc.data() }));
    }

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
  return val;
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
  return p.imageUrl || p.mainImage || (Array.isArray(p.images) ? p.images[0] : "") || "images/placeholder.jpg";
}

function isFav(id) {
  return state.favorites.includes(id);
}

function toggleFav(id, e) {
  if (e) e.stopPropagation();

  if (!state.currentUser) {
    showToast(t("loginRequired"), "warning");
    return;
  }

  const idx = state.favorites.indexOf(id);
  if (idx === -1) {
    state.favorites.push(id);
    showToast(t("favAdded"), "success");
  } else {
    state.favorites.splice(idx, 1);
    showToast(t("favRemoved"), "info");
  }

  safeJsonSet("ore_favorites", state.favorites);

  const btn = document.querySelector(`.favorite-btn[data-id="${CSS.escape(id)}"]`);
  if (btn) {
    btn.classList.toggle("active", isFav(id));
    const icon = btn.querySelector("i");
    if (icon) icon.className = isFav(id) ? "ph ph-heart-fill" : "ph ph-heart";
  }
}

function renderListings() {
  if (!els.listingsGrid) return;

  const list = state.filteredProperties;
  if (els.listingsCount) els.listingsCount.textContent = String(list.length);

  if (!list.length) {
    showEmptyState(t("noResults"), t("noResultsDesc"));
    return;
  }

  els.listingsGrid.innerHTML = list.map((p, i) => {
    const price = getPrice(p);
    const title = getTitle(p);
    const loc = getLocation(p);
    const img = getImage(p);
    const rating = Number(p.rating || 4.8).toFixed(1);
    const fav = isFav(p.id);
    const currency = state.lang === "ar" ? "د.ج" : "DZD";
    const delay = Math.min(i * 60, 400);
    const type = getType(p);
    const guests = p.guests || p.maxGuests;

    return `
      <article class="property-card ore-reveal" style="--ore-delay:${delay}ms;" tabindex="0" data-id="${escapeHtml(p.id)}">
        <div class="property-card-media">
          <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
          <button class="favorite-btn ${fav ? "active" : ""}" data-id="${escapeHtml(p.id)}" aria-label="Favorite">
            <i class="ph ${fav ? "ph-heart-fill" : "ph-heart"}"></i>
          </button>
          ${(p.isNew || p.badge) ? `
            <span class="property-urgency">
              <i class="ph ph-fire"></i>
              ${escapeHtml(state.lang === "ar" ? "جديد" : "New")}
            </span>
          ` : ""}
        </div>

        <div class="property-card-body">
          <div class="property-card-top">
            <h3 class="property-card-title">${escapeHtml(title)}</h3>
            <span class="property-card-rating"><i class="ph ph-star-fill"></i>${rating}</span>
          </div>

          ${loc ? `<p class="property-card-location"><i class="ph ph-map-pin"></i>${escapeHtml(loc)}</p>` : ""}
          <p class="property-card-meta">
            ${type ? `<span><i class="ph ph-building-apartment"></i>${escapeHtml(type)}</span>` : ""}
            ${guests ? `<span><i class="ph ph-users"></i>${escapeHtml(String(guests))}</span>` : ""}
          </p>

          <p class="property-card-price">
            ${price ? `${price.toLocaleString()} ${currency} <span>/ ${t("night")}</span>` : ""}
          </p>

          <div class="property-card-actions">
            <a href="property.html?id=${encodeURIComponent(p.id)}" class="secondary-btn">
              <i class="ph ph-eye"></i>${t("viewDetails")}
            </a>
            <a href="booking.html?id=${encodeURIComponent(p.id)}" class="primary">
              <i class="ph ph-calendar-check"></i>${t("bookNow")}
            </a>
          </div>
        </div>
      </article>
    `;
  }).join("");

  els.listingsGrid.querySelectorAll(".property-card").forEach((card) => {
    const id = card.dataset.id;
    card.addEventListener("click", (e) => {
      if (e.target.closest(".favorite-btn") || e.target.closest("a")) return;
      goToProperty(id);
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter") goToProperty(id);
    });
  });

  els.listingsGrid.querySelectorAll(".favorite-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => toggleFav(btn.dataset.id, e));
  });

  requestAnimationFrame(() => {
    $$(".ore-reveal").forEach((el) => {
      const delay = parseInt(el.style.getPropertyValue("--ore-delay")) || 0;
      setTimeout(() => el.classList.add("ore-reveal-in"), delay);
    });
  });
}

function goToProperty(id) {
  window.location.href = `property.html?id=${encodeURIComponent(id)}`;
}

// ──────────────────────────────────────────
// Search Suggestions
// ──────────────────────────────────────────
let searchTimeout = null;

function buildSuggestions(q) {
  if (!els.searchDropdown) return;

  if (!q || q.length < 2) {
    closeSuggestions();
    return;
  }

  const results = state.allProperties.filter((p) => {
    const title = getTitle(p).toLowerCase();
    const loc = getLocation(p).toLowerCase();
    return title.includes(q.toLowerCase()) || loc.includes(q.toLowerCase());
  }).slice(0, 6);

  if (!results.length) {
    els.searchDropdown.innerHTML = `<p class="search-empty">${t("noResults")}</p>`;
    els.searchDropdown.classList.add("active");
    return;
  }

  els.searchDropdown.innerHTML = results.map((p) => `
    <button class="search-suggestion-item" type="button" data-title="${escapeHtml(getTitle(p))}">
      <div class="search-suggestion-main">${escapeHtml(getTitle(p))}</div>
      <div class="search-suggestion-sub"><i class="ph ph-map-pin"></i> ${escapeHtml(getLocation(p))}</div>
    </button>
  `).join("");

  els.searchDropdown.classList.add("active");

  els.searchDropdown.querySelectorAll(".search-suggestion-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (els.searchInput) els.searchInput.value = btn.dataset.title || "";
      state.searchQuery = btn.dataset.title || "";
      closeSuggestions();
      applyFilters();
    });
  });
}

function closeSuggestions() {
  if (!els.searchDropdown) return;
  els.searchDropdown.classList.remove("active");
  els.searchDropdown.innerHTML = "";
}

// ──────────────────────────────────────────
// Bookings
// ──────────────────────────────────────────
function openBookingsModal() {
  if (!els.bookingsModal) return;
  els.bookingsModal.classList.add("active");
  els.bookingsModal.setAttribute("aria-hidden", "false");
  els.body.classList.add("modal-open");
  closeProfileDropdown();
  renderBookings();
}

function closeBookingsModal() {
  if (!els.bookingsModal) return;
  els.bookingsModal.classList.remove("active");
  els.bookingsModal.setAttribute("aria-hidden", "true");
  els.body.classList.remove("modal-open");
}

async function renderBookings() {
  if (!els.bookingsList) return;

  if (!state.currentUser || !db) {
    els.bookingsList.innerHTML = `
      <div class="booking-entry">
        <div class="booking-entry-head">
          <div>
            <h4 class="booking-entry-title">${t("noBookings")}</h4>
            <div class="booking-entry-meta">
              <span>${t("noBookingsDesc")}</span>
            </div>
          </div>
          <span class="booking-status-badge pending">
            <i class="ph ph-clock"></i>
            <span>${state.lang === "ar" ? "فارغ" : "Empty"}</span>
          </span>
        </div>
      </div>
    `;
    return;
  }

  try {
    const snap = await db.collection("bookings")
      .where("userId", "==", state.currentUser.uid)
      .get();

    if (snap.empty) {
      els.bookingsList.innerHTML = `
        <div class="booking-entry">
          <div class="booking-entry-head">
            <div>
              <h4 class="booking-entry-title">${t("noBookings")}</h4>
              <div class="booking-entry-meta">
                <span>${t("noBookingsDesc")}</span>
              </div>
            </div>
            <span class="booking-status-badge pending">
              <i class="ph ph-clock"></i>
              <span>${state.lang === "ar" ? "فارغ" : "Empty"}</span>
            </span>
          </div>
        </div>
      `;
      return;
    }

    const rows = [];
    snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));

    els.bookingsList.innerHTML = rows.map((b) => {
      const status = cleanText(b.status || "pending").toLowerCase();
      const title = b.propertyName || b.propertyTitle || (state.lang === "ar" ? "حجز" : "Booking");
      const checkIn = b.checkIn || b.startDate || "-";
      const checkOut = b.checkOut || b.endDate || "-";

      return `
        <div class="booking-entry">
          <div class="booking-entry-head">
            <div>
              <h4 class="booking-entry-title">${escapeHtml(title)}</h4>
              <div class="booking-entry-meta">
                <span><strong>${t("checkIn")}:</strong> ${escapeHtml(String(checkIn))}</span>
                <span><strong>${t("checkOut")}:</strong> ${escapeHtml(String(checkOut))}</span>
              </div>
            </div>
            <span class="booking-status-badge ${escapeHtml(status)}">
              <i class="ph ph-ticket"></i>
              <span>${t(`status_${status}`)}</span>
            </span>
          </div>
        </div>
      `;
    }).join("");
  } catch (err) {
    console.warn("renderBookings error:", err);
    els.bookingsList.innerHTML = `
      <div class="booking-entry">
        <div class="booking-entry-head">
          <div>
            <h4 class="booking-entry-title">${t("noBookings")}</h4>
            <div class="booking-entry-meta">
              <span>${t("noBookingsDesc")}</span>
            </div>
          </div>
          <span class="booking-status-badge pending">
            <i class="ph ph-warning"></i>
            <span>${state.lang === "ar" ? "تعذر التحميل" : "Unavailable"}</span>
          </span>
        </div>
      </div>
    `;
  }
}

// ──────────────────────────────────────────
// Favorites Page Nav
// ──────────────────────────────────────────
function openFavoritesPage() {
  closeProfileDropdown();
  window.location.href = "favorites.html";
}

// ──────────────────────────────────────────
// Chat
// ──────────────────────────────────────────
function renderChatMessages() {
  if (!els.chatMessages) return;

  if (!state.chatMessages.length) {
    els.chatMessages.innerHTML = `
      <div class="chat-empty-state" id="chat-empty-state">
        <p id="chat-empty-title" style="font-weight:800;margin-bottom:8px;">${t("noMessages")}</p>
        <p id="chat-empty-subtitle">${t("startConversation")}</p>
      </div>
    `;
    return;
  }

  els.chatMessages.innerHTML = state.chatMessages.map((msg) => {
    const data = normalizeMessage(msg);
    return `
      <div class="chat-message ${data.role}">
        <div>${escapeHtml(data.text)}</div>
        <small class="chat-meta">${escapeHtml(data.time)}</small>
      </div>
    `;
  }).join("");

  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function openChatModal() {
  if (!els.chatModal) return;
  els.chatModal.classList.add("active");
  els.chatModal.setAttribute("aria-hidden", "false");
  els.body.classList.add("modal-open");
  state.chatOpen = true;
  state.chatUnread = 0;
  setUnreadBadge();
  renderChatMessages();
}

function closeChatModal() {
  if (!els.chatModal) return;
  els.chatModal.classList.remove("active");
  els.chatModal.setAttribute("aria-hidden", "true");
  els.body.classList.remove("modal-open");
  state.chatOpen = false;
}

async function ensureSupportChat(openAfter = false) {
  if (!state.currentUser || !db) {
    if (openAfter) showToast(t("loginRequired"), "warning");
    return;
  }

  if (state.currentChatId && state.chatInitializedForUser === state.currentUser.uid) {
    subscribeToChat(state.currentChatId);
    if (openAfter) openChatModal();
    return;
  }

  try {
    setChatStatus("syncing", t("chatPreparing"));

    const chatId = `support_${state.currentUser.uid}`;
    state.currentChatId = chatId;
    state.chatInitializedForUser = state.currentUser.uid;
    safeSet("ore_current_chat_id", chatId);

    const ref = db.collection("supportChats").doc(chatId);
    const existing = await ref.get();

    if (!existing.exists) {
      await ref.set({
        id: chatId,
        userId: state.currentUser.uid,
        userEmail: getCurrentUserEmail(),
        userName: getCurrentUserName(),
        createdAt: getServerTimestamp(),
        updatedAt: getServerTimestamp(),
        lastMessage: "",
        status: "open"
      }, { merge: true });
    }

    updateChatHiddenFields(chatId);
    subscribeToChat(chatId);

    if (openAfter) openChatModal();
  } catch (err) {
    console.warn("ensureSupportChat error:", err);
    setChatStatus("error", t("chatError"));
  }
}

function subscribeToChat(chatId) {
  if (!db || !chatId) return;

  stopChatSubscription();
  setChatStatus("syncing", t("chatSyncing"));

  state.currentChatUnsub = db.collection("supportChats")
    .doc(chatId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .onSnapshot((snap) => {
      const items = [];
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));

      const previousCount = state.chatMessages.length;
      state.chatMessages = items.map(normalizeMessage);

      if (!state.chatOpen && items.length > previousCount) {
        state.chatUnread += Math.max(0, items.length - previousCount);
        setUnreadBadge();
      }

      renderChatMessages();
      setChatStatus("connected", t("chatConnected"));
    }, (err) => {
      console.warn("chat subscription error:", err);
      setChatStatus("error", t("chatError"));
    });
}

async function sendChatMessage(e) {
  if (e) e.preventDefault();

  if (!state.currentUser) {
    showToast(t("loginRequired"), "warning");
    return;
  }

  const text = cleanText(els.chatInput?.value);
  if (!text) return;

  await ensureSupportChat(false);
  if (!db || !state.currentChatId) return;

  try {
    const payload = {
      text,
      senderRole: "customer",
      senderId: state.currentUser.uid,
      senderName: getCurrentUserName(),
      senderEmail: getCurrentUserEmail(),
      createdAt: getServerTimestamp()
    };

    await db.collection("supportChats")
      .doc(state.currentChatId)
      .collection("messages")
      .add(payload);

    await db.collection("supportChats")
      .doc(state.currentChatId)
      .set({
        updatedAt: getServerTimestamp(),
        lastMessage: text,
        userName: getCurrentUserName(),
        userEmail: getCurrentUserEmail()
      }, { merge: true });

    if (els.chatInput) els.chatInput.value = "";
  } catch (err) {
    console.warn("sendChatMessage error:", err);
    showToast(t("chatError"), "error");
  }
}

// ──────────────────────────────────────────
// Events
// ──────────────────────────────────────────
function bindEvents() {
  els.langBtn?.addEventListener("click", toggleLang);
  els.themeBtn?.addEventListener("click", toggleTheme);

  els.profileMenu?.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!state.currentUser) {
      showAuthModal("login");
      return;
    }

    toggleProfileDropdown();
  });

  els.myBookingsBtn?.addEventListener("click", openBookingsModal);
  els.myFavoritesBtn?.addEventListener("click", openFavoritesPage);

  els.logoutBtn?.addEventListener("click", async () => {
    try {
      closeProfileDropdown();
      if (auth) await auth.signOut();
      showToast(t("signedOut"), "success");
    } catch (err) {
      console.warn("signOut error:", err);
      showToast(t("chatError"), "error");
    }
  });

  els.searchBtn?.addEventListener("click", () => {
    state.searchQuery = cleanText(els.searchInput?.value);
    applyFilters();
    closeSuggestions();
  });

  els.searchInput?.addEventListener("input", () => {
    state.searchQuery = cleanText(els.searchInput?.value);

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      buildSuggestions(state.searchQuery);
      applyFilters();
    }, 180);

    if (els.clearSearchBtn) {
      els.clearSearchBtn.style.display = state.searchQuery ? "inline-flex" : "none";
    }
  });

  els.searchInput?.addEventListener("focus", () => {
    buildSuggestions(cleanText(els.searchInput?.value));
  });

  els.clearSearchBtn?.addEventListener("click", () => {
    state.searchQuery = "";
    if (els.searchInput) els.searchInput.value = "";
    els.clearSearchBtn.style.display = "none";
    closeSuggestions();
    applyFilters();
  });

  els.checkInInput?.addEventListener("change", applyFilters);
  els.checkOutInput?.addEventListener("change", applyFilters);
  els.guestsInput?.addEventListener("input", applyFilters);

  els.sortSelect?.addEventListener("change", () => {
    state.sortBy = els.sortSelect.value || "featured";
    applyFilters();
  });

  $$(".category-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".category-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const cat = cleanText(btn.dataset.category || "").toLowerCase();
      state.activeCategory =
        cat === "hotels" ? "hotel" :
        cat === "villas" ? "villa" :
        cat === "apartments" ? "apartment" :
        (cat || "all");

      applyFilters();
    });
  });

  els.loginForm?.addEventListener("submit", handleLogin);
  els.registerForm?.addEventListener("submit", handleRegister);
  els.forgotForm?.addEventListener("submit", handleForgot);

  document.querySelectorAll("[data-auth-tab]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showAuthForm(btn.dataset.authTab);
      clearAuthMessage();
    });
  });

  els.bookingsModal?.addEventListener("click", (e) => {
    if (e.target === els.bookingsModal) closeBookingsModal();
  });

  els.chatOpenBtn?.addEventListener("click", () => {
    if (!state.currentUser) {
      showAuthModal("login");
      return;
    }
    ensureSupportChat(true);
  });

  els.chatSendForm?.addEventListener("submit", sendChatMessage);
  els.chatSendBtn?.addEventListener("click", sendChatMessage);

  els.chatModal?.addEventListener("click", (e) => {
    if (e.target === els.chatModal) closeChatModal();
  });

  els.authModal?.addEventListener("click", (e) => {
    if (e.target === els.authModal) hideAuthModal();
  });

  document.addEventListener("click", (e) => {
    if (els.profileContainer && !els.profileContainer.contains(e.target)) {
      closeProfileDropdown();
    }

    if (els.searchDropdown && !els.searchDropdown.contains(e.target) && e.target !== els.searchInput) {
      closeSuggestions();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideAuthModal();
      closeBookingsModal();
      closeChatModal();
      closeProfileDropdown();
      closeSuggestions();
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
// Init
// ──────────────────────────────────────────
function initStaticFallbackListings() {
  if (state.allProperties.length) return;

  state.allProperties = [
    {
      id: "demo-1",
      titleEn: "Luxury Apartment",
      titleAr: "شقة فاخرة",
      locationEn: "El Oued, Algeria",
      locationAr: "الوادي، الجزائر",
      typeEn: "Apartment",
      typeAr: "شقة",
      guests: 4,
      rating: 4.9,
      price: 12000,
      imageUrl: "images/placeholder.jpg",
      isNew: true
    },
    {
      id: "demo-2",
      titleEn: "Modern Villa",
      titleAr: "فيلا عصرية",
      locationEn: "Biskra, Algeria",
      locationAr: "بسكرة، الجزائر",
      typeEn: "Villa",
      typeAr: "فيلا",
      guests: 8,
      rating: 4.8,
      price: 24000,
      imageUrl: "images/placeholder.jpg"
    },
    {
      id: "demo-3",
      titleEn: "Elegant Hotel Suite",
      titleAr: "جناح فندقي أنيق",
      locationEn: "Algiers, Algeria",
      locationAr: "الجزائر العاصمة، الجزائر",
      typeEn: "Hotel",
      typeAr: "فندق",
      guests: 2,
      rating: 4.7,
      price: 18500,
      imageUrl: "images/placeholder.jpg"
    }
  ];
}

function init() {
  applyTheme();
  applyLang();
  bindEvents();
  initStaticFallbackListings();
  applyFilters();

  if (auth && typeof auth.onAuthStateChanged === "function") {
    auth.onAuthStateChanged(async (user) => {
      await updateAuthUI(user);
    });
  } else {
    applyGuestAuthUI();
    resetFrontendUserState();
  }

  loadProperties().catch((err) => console.warn("loadProperties init error:", err));
}

document.addEventListener("DOMContentLoaded", init);
