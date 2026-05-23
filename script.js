// =========================================
// script.js — OreBooking Index Page v4.0
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
    firebaseMissing: "Firebase not available"
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
    firebaseMissing: "Firebase غير متاح"
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

  searchInput: firstById("search-input", "destination-input"),
  searchBtn: firstById("search-btn"),
  searchDropdown: firstById("search-dropdown"),
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
  bookingsList: firstById("bookings-list"),

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
  navSignInText: firstById("nav-sign-in-text")
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
  return cleanText(user?.displayName || user?.name || user?.email || "Guest");
}

function getCurrentUserEmail(user = state.currentUser) {
  return cleanText(user?.email || "");
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

// ──────────────────────────────────────────
// Lang & Theme
// ──────────────────────────────────────────
function applyLang() {
  const html = els.html;
  html.lang = state.lang;
  html.dir = state.lang === "ar" ? "rtl" : "ltr";

  const langLabel = els.langBtnText || els.langBtn?.querySelector("span");
  if (langLabel) {
    langLabel.textContent = state.lang === "ar" ? "English" : "العربية";
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
    const span = els.rewardsBadge.querySelector("span");
    if (span) span.textContent = t("loyaltyRewards");
  }

  if (els.sortSelect) {
    const opts = els.sortSelect.options;
    if (opts[0]) opts[0].text = t("sortDefault");
    if (opts[1]) opts[1].text = t("sortRating");
    if (opts[2]) opts[2].text = t("sortPriceLow");
    if (opts[3]) opts[3].text = t("sortPriceHigh");
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

  const destinationLabel = document.querySelector('label[for="destination-input"]');
  if (destinationLabel) destinationLabel.textContent = t("searchHint");

  $$(".category-item").forEach((btn) => {
    const cat = btn.dataset.category;
    const normalized = cat === "hotels" ? "hotel" : cat === "villas" ? "villa" : cat === "apartments" ? "apartment" : cat;
    const key =
      normalized === "all" ? "allStays" :
      normalized === "hotel" ? "hotels" :
      normalized === "villa" ? "villas" :
      "apartments";
    const span = btn.querySelector("span") || btn;
    span.textContent = t(key);
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
    els.html.classList.remove("preload-dark");
  } else {
    els.body.classList.remove("dark");
  }

  const btn = els.themeBtn || $("theme-toggle");
  if (btn) {
    const icon = btn.querySelector("i");
    if (icon) icon.className = state.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
  }
}

// ──────────────────────────────────────────
// Auth UI
// ──────────────────────────────────────────
function updateAuthUI(user) {
  const prevUid = state.currentUser?.uid || "";
  state.currentUser = user || null;
  const isLoggedIn = !!user;
  const navAuthBtn = els.navAuthBtn || $("nav-auth-btn") || $("open-auth-btn") || $("auth-cta");
  const signInText = els.navSignInText || navAuthBtn?.querySelector("span");

  if (navAuthBtn) {
    const icon = navAuthBtn.querySelector("i");
    if (icon) icon.className = isLoggedIn ? "ph ph-user-circle-check" : "ph ph-user";
    if (signInText) {
      signInText.textContent = isLoggedIn
        ? (user.displayName || user.email || t("myBookings"))
        : t("signIn");
    }
  }

  if (els.dropdownUserName) {
    els.dropdownUserName.textContent = user?.displayName || user?.email || t("guestUser");
  }

  if (els.dropdownUserEmail) {
    els.dropdownUserEmail.textContent = user?.email || t("signInToContinue");
  }

  if (els.logoutBtn) {
    els.logoutBtn.style.display = isLoggedIn ? "flex" : "none";
  }

  if (isLoggedIn && db) {
    db.collection("users").doc(user.uid).get()
      .then((doc) => {
        const pts = doc.exists ? (doc.data().points || 0) : 0;
        if (els.userPoints) els.userPoints.textContent = pts;
      })
      .catch(() => {});
  } else {
    if (els.userPoints) els.userPoints.textContent = "0";
  }

  if (isLoggedIn && els.loginEmail && user.email) {
    els.loginEmail.value = user.email;
  }

  updateChatHiddenFields();

  if (!isLoggedIn) {
    state.chatMessages = [];
    state.chatUnread = 0;
    state.currentChatId = "";
    safeRemove("ore_current_chat_id");
    stopChatSubscription();
    setUnreadBadge();
    setChatStatus("syncing", t("chatPreparing"));
    renderChatMessages();
    return;
  }

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
    els.body.classList.add("modal-open");
    showAuthForm(tab);
    clearAuthMessage();
  }
}

function hideAuthModal() {
  if (els.authModal) {
    els.authModal.classList.remove("active");
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
    .then(() => {
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
    showEmptyState(t("noResults"), t("noResultsDesc"));
    return;
  }

  showLoadingState();

  try {
    const snap = await db.collection("properties").where("isActive", "!=", false).get();
    state.allProperties = [];
    snap.forEach((doc) => state.allProperties.push({ id: doc.id, ...doc.data() }));

    if (!state.allProperties.length) {
      const snap2 = await db.collection("properties").get();
      snap2.forEach((doc) => state.allProperties.push({ id: doc.id, ...doc.data() }));
    }

    applyFilters();
  } catch (err) {
    console.error("Load properties error:", err);
    showEmptyState(t("noResults"), t("noResultsDesc"));
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
  } else if (state.sortBy === "rating") {
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
    if (icon) icon.className = isFav(id) ? "ph ph-heart-straight ph-fill" : "ph ph-heart-straight";
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
            <i class="ph ${fav ? "ph-heart-straight ph-fill" : "ph-heart-straight"}"></i>
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

  if ("IntersectionObserver" in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("ore-reveal-in");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 });

    $$(".ore-reveal").forEach((el) => obs.observe(el));
  }
}

function goToProperty(id) {
  window.location.href = `property.html?id=${encodeURIComponent(id)}`;
}

// ──────────────────────────────────────────
// Search Suggestions
// ──────────────────────────────────────────
let searchTimeout = null;

function buildSuggestions(q) {
  if (!q || q.length < 2) {
    closeSuggestions();
    return;
  }

  const results = state.allProperties.filter((p) => {
    const title = getTitle(p).toLowerCase();
    const loc = getLocation(p).toLowerCase();
    return title.includes(q.toLowerCase()) || loc.includes(q.toLowerCase());
  }).slice(0, 6);

  if (!els.searchDropdown) return;

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
    btn.addEventListener("click", () => selectSuggestion(btn.dataset.title));
  });
}

function closeSuggestions() {
  if (els.searchDropdown) els.searchDropdown.classList.remove("active");
}

function selectSuggestion(title) {
  if (els.searchInput) els.searchInput.value = title;
  state.searchQuery = title;
  closeSuggestions();
  applyFilters();
  toggleClearBtn();
}

function toggleClearBtn() {
  if (els.clearSearchBtn) {
    els.clearSearchBtn.style.display = state.searchQuery ? "inline-flex" : "none";
  }
}

// ──────────────────────────────────────────
// Bookings Modal
// ──────────────────────────────────────────
async function openBookingsModal() {
  closeProfileDropdown();

  if (!state.currentUser) {
    showAuthModal("login");
    return;
  }

  if (!els.bookingsModal) return;

  els.bookingsModal.classList.add("active");
  els.body.classList.add("modal-open");

  if (els.bookingsList) {
    els.bookingsList.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-muted)">
        <i class="ph ph-spinner-gap ph-spin" style="font-size:2rem"></i>
      </div>
    `;
  }

  if (!db) {
    renderBookings([]);
    return;
  }

  try {
    const snap = await db.collection("bookings")
      .where("userId", "==", state.currentUser.uid)
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const bookings = [];
    snap.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
    renderBookings(bookings);
  } catch {
    try {
      const snap2 = await db.collection("bookings")
        .where("userId", "==", state.currentUser.uid)
        .get();

      const bookings = [];
      snap2.forEach((doc) => bookings.push({ id: doc.id, ...doc.data() }));
      renderBookings(bookings);
    } catch {
      renderBookings([]);
    }
  }
}

function renderBookings(bookings) {
  if (!els.bookingsList) return;

  if (!bookings.length) {
    els.bookingsList.innerHTML = `
      <div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
        <i class="ph ph-suitcase-rolling" style="font-size:2.5rem;display:block;margin-bottom:14px;color:var(--primary)"></i>
        <p style="font-weight:800;margin-bottom:8px;">${t("noBookings")}</p>
        <p>${t("noBookingsDesc")}</p>
      </div>
    `;
    return;
  }

  els.bookingsList.innerHTML = bookings.map((b) => {
    const rawStatus = cleanText(b.status || "pending").toLowerCase();
    const status =
      rawStatus === "approved" ? "confirmed" :
      rawStatus === "accepted" ? "confirmed" :
      rawStatus === "rejected" ? "rejected" :
      rawStatus === "canceled" ? "cancelled" :
      rawStatus;
    const propTitle = state.lang === "ar"
      ? (b.propertyTitleAr || b.propertyTitle || b.titleAr || b.propertyTitleEn || "عقار")
      : (b.propertyTitleEn || b.propertyTitle || b.titleEn || b.title || "Property");
    const checkIn = b.checkIn || b.arrivalDate || "";
    const checkOut = b.checkOut || b.departureDate || "";
    const ref = b.reference || b.bookingReference || b.id?.substring(0, 8) || "";

    return `
      <div class="booking-entry">
        <div class="booking-entry-head">
          <div>
            <h4 class="booking-entry-title">${escapeHtml(propTitle)}</h4>
            <div class="booking-entry-meta">
              ${checkIn ? `<span><i class="ph ph-calendar"></i> ${escapeHtml(checkIn)}${checkOut ? ` → ${escapeHtml(checkOut)}` : ""}</span>` : ""}
              ${ref ? `<span><i class="ph ph-tag"></i> ${escapeHtml(ref)}</span>` : ""}
            </div>
          </div>
          <span class="booking-status-badge ${escapeHtml(status)}">${t(`status_${status}`)}</span>
        </div>
      </div>
    `;
  }).join("");
}

function closeBookingsModal() {
  if (els.bookingsModal) {
    els.bookingsModal.classList.remove("active");
    els.body.classList.remove("modal-open");
  }
}

// ──────────────────────────────────────────
// Chat
// ──────────────────────────────────────────
async function findExistingSupportChat(user) {
  if (!db || !user) return null;

  try {
    const byUser = await db.collection("chats").where("userId", "==", user.uid).limit(1).get();
    if (!byUser.empty) {
      const doc = byUser.docs[0];
      return { id: doc.id, ...doc.data() };
    }
  } catch (error) {
    console.warn("findExistingSupportChat byUser:", error);
  }

  try {
    if (user.email) {
      const byEmail = await db.collection("chats").where("userEmail", "==", user.email).limit(1).get();
      if (!byEmail.empty) {
        const doc = byEmail.docs[0];
        return { id: doc.id, ...doc.data() };
      }
    }
  } catch (error) {
    console.warn("findExistingSupportChat byEmail:", error);
  }

  return null;
}

async function createSupportChat(user) {
  if (!db || !user) return null;

  const payload = {
    bookingId: "",
    propertyId: cleanText(els.chatPropertyId?.value || "global"),
    propertyTitle: "Support Chat",
    userId: user.uid,
    userName: getCurrentUserName(user),
    userEmail: getCurrentUserEmail(user),
    participants: [user.uid, "admin"].filter(Boolean),
    participantIds: [user.uid, "admin"].filter(Boolean),
    lastMessage: "",
    lastText: "",
    lastMessageAt: getServerTimestamp(),
    updatedAt: getServerTimestamp(),
    createdAt: getServerTimestamp()
  };

  const ref = await db.collection("chats").add(payload);
  return { id: ref.id, ...payload };
}

async function ensureSupportChat(subscribeAfter = true) {
  if (!state.currentUser || !db) return null;

  setChatStatus("syncing", t("chatPreparing"));

  if (state.currentChatId && state.chatInitializedForUser === state.currentUser.uid) {
    updateChatHiddenFields(state.currentChatId);
    if (subscribeAfter) subscribeToCurrentChat(state.currentChatId);
    return state.currentChatId;
  }

  let chat = null;

  if (state.currentChatId) {
    try {
      const doc = await db.collection("chats").doc(state.currentChatId).get();
      if (doc.exists) {
        const data = doc.data() || {};
        if (
          cleanText(data.userId) === state.currentUser.uid ||
          cleanText(data.userEmail).toLowerCase() === getCurrentUserEmail().toLowerCase()
        ) {
          chat = { id: doc.id, ...data };
        }
      }
    } catch (error) {
      console.warn("ensureSupportChat existing doc check:", error);
    }
  }

  if (!chat) {
    chat = await findExistingSupportChat(state.currentUser);
  }

  if (!chat) {
    chat = await createSupportChat(state.currentUser);
  }

  if (!chat?.id) return null;

  state.currentChatId = chat.id;
  state.chatInitializedForUser = state.currentUser.uid;
  safeSet("ore_current_chat_id", chat.id);
  updateChatHiddenFields(chat.id);

  await db.collection("chats").doc(chat.id).set({
    userId: state.currentUser.uid,
    userName: getCurrentUserName(state.currentUser),
    userEmail: getCurrentUserEmail(state.currentUser),
    participants: [state.currentUser.uid, "admin"].filter(Boolean),
    participantIds: [state.currentUser.uid, "admin"].filter(Boolean),
    updatedAt: getServerTimestamp()
  }, { merge: true });

  if (subscribeAfter) subscribeToCurrentChat(chat.id);
  return chat.id;
}

function subscribeToCurrentChat(chatId) {
  if (!db || !chatId) return;

  stopChatSubscription();
  updateChatHiddenFields(chatId);
  setChatStatus("syncing", t("chatSyncing"));

  try {
    state.currentChatUnsub = db
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "asc")
      .onSnapshot(
        async (snap) => {
          const messages = [];
          snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));

          if (!messages.length) {
            try {
              const fallback = await db.collection("messages").where("chatId", "==", chatId).get();
              fallback.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
              messages.sort((a, b) => {
                const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
                const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
                return at - bt;
              });
            } catch (err) {
              console.warn("fallback root messages failed:", err);
            }
          }

          const prevLen = state.chatMessages.length;
          state.chatMessages = messages.map(normalizeMessage);

          if (!state.chatOpen && state.chatMessages.length > prevLen) {
            const newIncoming = state.chatMessages.slice(prevLen).filter((msg) => msg.role === "admin").length;
            if (newIncoming > 0) {
              state.chatUnread += newIncoming;
            }
          }

          setUnreadBadge();
          setChatStatus("connected", t("chatConnected"));
          renderChatMessages();
        },
        async (error) => {
          console.error("chat subscription error:", error);
          setChatStatus("error", t("chatError"));

          try {
            const fallback = await db.collection("messages").where("chatId", "==", chatId).get();
            const messages = [];
            fallback.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
            messages.sort((a, b) => {
              const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
              const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
              return at - bt;
            });
            state.chatMessages = messages.map(normalizeMessage);
            renderChatMessages();
          } catch (err) {
            console.warn("chat fallback load failed:", err);
          }
        }
      );
  } catch (error) {
    console.error("subscribeToCurrentChat fatal:", error);
    setChatStatus("error", t("chatError"));
  }
}

async function openChat() {
  if (!state.currentUser) {
    showAuthModal("login");
    return;
  }

  state.chatOpen = true;
  state.chatUnread = 0;
  setUnreadBadge();

  if (els.chatModal) els.chatModal.classList.add("active");
  els.body.classList.add("modal-open");

  renderChatMessages();

  try {
    await ensureSupportChat(true);
  } catch (error) {
    console.error("openChat ensureSupportChat:", error);
    setChatStatus("error", t("chatError"));
  }

  setTimeout(() => {
    if (els.chatMessages) els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }, 80);
}

function closeChat() {
  state.chatOpen = false;
  if (els.chatModal) els.chatModal.classList.remove("active");
  els.body.classList.remove("modal-open");
}

function renderChatMessages() {
  if (!els.chatMessages) return;

  if (!state.chatMessages.length) {
    els.chatMessages.innerHTML = `
      <div class="chat-empty-state" id="chat-empty-state">
        <i class="ph ph-chat-dots" style="font-size:2rem;display:block;margin-bottom:10px;color:var(--primary)"></i>
        <p style="font-weight:700">${t("noMessages")}</p>
        <p>${t("startConversation")}</p>
      </div>
    `;
    return;
  }

  els.chatMessages.innerHTML = state.chatMessages.map((msg) => {
    const role = msg.role || "customer";
    const text = msg.text || "";
    const time = msg.time || "";

    return `
      <div class="chat-message ${escapeHtml(role)}">
        ${escapeHtml(text)}
        ${time ? `<span class="chat-meta">${escapeHtml(time)}</span>` : ""}
      </div>
    `;
  }).join("");

  setTimeout(() => {
    els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
  }, 60);
}

async function sendChatMessage(e) {
  if (e) e.preventDefault();

  if (!state.currentUser) {
    showAuthModal("login");
    return;
  }

  const text = els.chatInput?.value?.trim();
  if (!text) return;
  if (!db) return showToast(t("firebaseMissing"), "error");

  const btn = els.chatSendBtn;
  if (btn) {
    btn.disabled = true;
    btn.dataset.originalHtml = btn.dataset.originalHtml || btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner-gap ph-spin"></i><span>${escapeHtml(t("sendMessage"))}</span>`;
  }

  try {
    const chatId = await ensureSupportChat(true);
    if (!chatId) {
      showToast(t("chatError"), "error");
      return;
    }

    const payload = {
      text,
      message: text,
      senderRole: "customer",
      senderName: getCurrentUserName(state.currentUser),
      userId: state.currentUser.uid,
      userEmail: getCurrentUserEmail(state.currentUser),
      createdAt: getServerTimestamp()
    };

    const chatRef = db.collection("chats").doc(chatId);

    try {
      await chatRef.collection("messages").add(payload);
    } catch {
      await db.collection("messages").add({
        ...payload,
        chatId
      });
    }

    await chatRef.set({
      userId: state.currentUser.uid,
      userName: getCurrentUserName(state.currentUser),
      userEmail: getCurrentUserEmail(state.currentUser),
      lastMessage: text,
      lastText: text,
      lastMessageAt: getServerTimestamp(),
      updatedAt: getServerTimestamp()
    }, { merge: true });

    if (els.chatInput) els.chatInput.value = "";
    setChatStatus("connected", t("supportReady"));
  } catch (error) {
    console.error("sendChatMessage error:", error);
    showToast(t("chatError"), "error");
    setChatStatus("error", t("chatError"));
  } finally {
    if (btn) {
      btn.disabled = false;
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
  }
}

// ──────────────────────────────────────────
// Profile Dropdown
// ──────────────────────────────────────────
function toggleProfileDropdown() {
  if (!els.profileDropdown) return;

  const isOpen = els.profileDropdown.classList.contains("active");
  closeAllDropdowns();

  if (!isOpen) {
    if (state.currentUser) {
      els.profileDropdown.classList.add("active");
    } else {
      showAuthModal("login");
    }
  }
}

function closeProfileDropdown() {
  if (els.profileDropdown) els.profileDropdown.classList.remove("active");
}

function closeAllDropdowns() {
  closeProfileDropdown();
  closeSuggestions();
}

// ──────────────────────────────────────────
// Scroll Top
// ──────────────────────────────────────────
function handleScroll() {
  if (!els.scrollTopBtn) return;
  if (window.scrollY > 400) {
    els.scrollTopBtn.classList.add("visible");
  } else {
    els.scrollTopBtn.classList.remove("visible");
  }
}

// ──────────────────────────────────────────
// Bottom Nav
// ──────────────────────────────────────────
function setupBottomNav() {
  $$(".mob-nav-btn, .bottom-nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".mob-nav-btn, .bottom-nav-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const id = btn.id || "";
      const target = btn.dataset.target || id;

      if (target.includes("profile")) {
        if (state.currentUser) toggleProfileDropdown();
        else showAuthModal("login");
      } else if (target.includes("fav")) {
        state.filteredProperties = state.allProperties.filter((p) => isFav(p.id));
        renderListings();
        document.querySelector(".categories")?.scrollIntoView({ behavior: "smooth" });
      } else {
        state.activeCategory = "all";
        applyFilters();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  });
}

// ──────────────────────────────────────────
// Password Strength
// ──────────────────────────────────────────
function calcPasswordStrength(pass) {
  if (!pass) return 0;
  let score = 0;
  if (pass.length >= 8) score++;
  if (/[A-Z]/.test(pass)) score++;
  if (/[0-9]/.test(pass)) score++;
  if (/[^A-Za-z0-9]/.test(pass)) score++;
  return score;
}

function updateStrengthUI(score) {
  const bars = $$(".str-bar");
  const label = $("strength-label");
  const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  const labels = state.lang === "ar"
    ? ["ضعيف", "مقبول", "جيد", "قوي"]
    : ["Weak", "Fair", "Good", "Strong"];

  bars.forEach((bar, i) => {
    bar.style.background = i < score ? colors[Math.max(score - 1, 0)] : "var(--border-color)";
  });

  if (label) {
    label.textContent = score > 0 ? labels[score - 1] : "";
  }
}

// ──────────────────────────────────────────
// Scroll Reveal
// ──────────────────────────────────────────
function setupScrollReveal() {
  if (!("IntersectionObserver" in window)) {
    $$(".ore-reveal").forEach((el) => el.classList.add("ore-reveal-in"));
    return;
  }

  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("ore-reveal-in");
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.06 });

  $$(".ore-reveal").forEach((el) => obs.observe(el));
}

// ──────────────────────────────────────────
// Setup
// ──────────────────────────────────────────
function setupEventListeners() {
  const langBtn = els.langBtn || $("lang-btn") || $("lang-toggle");
  if (langBtn) {
    langBtn.addEventListener("click", () => {
      state.lang = state.lang === "ar" ? "en" : "ar";
      safeSet("ore_lang", state.lang);
      safeSet("orelang", state.lang);
      applyLang();
    });
  }

  const themeBtn = els.themeBtn || $("theme-btn") || $("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      safeSet("ore_theme", state.theme);
      safeSet("oretheme", state.theme);
      applyTheme();
    });
  }

  const profileMenu = els.profileMenu || $("profile-menu") || $("open-auth-btn");
  if (profileMenu) profileMenu.addEventListener("click", toggleProfileDropdown);

  const navAuthBtn = els.navAuthBtn || $("nav-auth-btn") || $("auth-cta");
  if (navAuthBtn && navAuthBtn !== profileMenu) {
    navAuthBtn.addEventListener("click", (e) => {
      const href = navAuthBtn.getAttribute("href");
      if (!state.currentUser) {
        e.preventDefault();
        showAuthModal("login");
        return;
      }
      if (!href || href === "#" || href.includes("auth.html") === false) {
        e.preventDefault();
        toggleProfileDropdown();
      }
    });
  }

  const closeAuth = $("close-auth-modal") || $("close-auth-btn");
  if (closeAuth) closeAuth.addEventListener("click", hideAuthModal);

  if (els.authModal) {
    els.authModal.addEventListener("click", (e) => {
      if (e.target === els.authModal) hideAuthModal();
    });
  }

  if (els.loginForm) els.loginForm.addEventListener("submit", handleLogin);
  if (els.registerForm) els.registerForm.addEventListener("submit", handleRegister);
  if (els.forgotForm) els.forgotForm.addEventListener("submit", handleForgot);

  $("login-submit-btn")?.addEventListener("click", handleLogin);
  $("register-submit-btn")?.addEventListener("click", handleRegister);
  $("forgot-submit-btn")?.addEventListener("click", handleForgot);

  $("go-to-register")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("register");
  });

  $("go-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("login");
  });

  $("go-to-forgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("forgot");
  });

  $("back-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("login");
  });

  if (els.logoutBtn) {
    els.logoutBtn.addEventListener("click", () => {
      auth?.signOut()
        .then(() => {
          closeProfileDropdown();
          showToast(t("signedOut"), "info");
        })
        .catch(() => {});
    });
  }

  if (els.myBookingsBtn) els.myBookingsBtn.addEventListener("click", openBookingsModal);
  if (els.myFavoritesBtn) {
    els.myFavoritesBtn.addEventListener("click", () => {
      closeProfileDropdown();
      state.filteredProperties = state.allProperties.filter((p) => isFav(p.id));
      renderListings();
      document.querySelector(".container")?.scrollIntoView({ behavior: "smooth" });
    });
  }

  if (els.openChatBtn) {
    els.openChatBtn.addEventListener("click", () => {
      closeProfileDropdown();
      openChat();
    });
  }

  $("bookings-close-btn")?.addEventListener("click", closeBookingsModal);
  $("close-bookings-btn")?.addEventListener("click", closeBookingsModal);

  if (els.bookingsModal) {
    els.bookingsModal.addEventListener("click", (e) => {
      if (e.target === els.bookingsModal) closeBookingsModal();
    });
  }

  $$(".category-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      $$(".category-item").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      const raw = btn.dataset.category || "all";
      state.activeCategory =
        raw === "hotels" ? "hotel" :
        raw === "villas" ? "villa" :
        raw === "apartments" ? "apartment" :
        raw;

      applyFilters();
    });
  });

  if (els.searchInput) {
    els.searchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => buildSuggestions(state.searchQuery), 220);
      toggleClearBtn();
    });

    els.searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        closeSuggestions();
        applyFilters();
      }
      if (e.key === "Escape") {
        closeSuggestions();
      }
    });

    els.searchInput.addEventListener("focus", () => {
      if (state.searchQuery) buildSuggestions(state.searchQuery);
    });
  }

  if (els.searchBtn) {
    els.searchBtn.addEventListener("click", () => {
      state.searchQuery = els.searchInput?.value?.trim() || "";
      closeSuggestions();
      applyFilters();
    });
  }

  if (els.clearSearchBtn) {
    els.clearSearchBtn.addEventListener("click", () => {
      state.searchQuery = "";
      if (els.searchInput) els.searchInput.value = "";
      toggleClearBtn();
      closeSuggestions();
      applyFilters();
    });
  }

  if (els.checkInInput) els.checkInInput.addEventListener("change", applyFilters);
  if (els.checkOutInput) els.checkOutInput.addEventListener("change", applyFilters);
  if (els.guestsInput) els.guestsInput.addEventListener("input", applyFilters);

  if (els.sortSelect) {
    els.sortSelect.addEventListener("change", (e) => {
      state.sortBy = e.target.value;
      applyFilters();
    });
  }

  if (els.chatOpenBtn) els.chatOpenBtn.addEventListener("click", openChat);
  $("chat-close-btn")?.addEventListener("click", closeChat);

  if (els.chatModal) {
    els.chatModal.addEventListener("click", (e) => {
      if (e.target === els.chatModal) closeChat();
    });
  }

  if (els.chatSendForm) {
    els.chatSendForm.addEventListener("submit", sendChatMessage);
  } else if (els.chatSendBtn) {
    els.chatSendBtn.addEventListener("click", sendChatMessage);
  }

  if (els.chatInput) {
    els.chatInput.placeholder = t("chatPlaceholder");
    els.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage(e);
      }
    });
  }

  if (els.scrollTopBtn) {
    els.scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.addEventListener("scroll", handleScroll, { passive: true });

  document.addEventListener("click", (e) => {
    if (els.profileDropdown?.classList.contains("active")) {
      const container = document.querySelector(".profile-container");
      if (container && !container.contains(e.target)) closeProfileDropdown();
    }

    if (els.searchDropdown?.classList.contains("active")) {
      const bar = document.querySelector(".search-bar");
      if (bar && !bar.contains(e.target)) closeSuggestions();
    }
  });

  $$(".toggle-pass-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.closest(".pass-wrapper")?.querySelector("input");
      if (!input) return;

      input.type = input.type === "password" ? "text" : "password";
      const icon = btn.querySelector("i");
      if (icon) icon.className = input.type === "password" ? "ph ph-eye" : "ph ph-eye-slash";
    });
  });

  if (els.regPassword) {
    els.regPassword.addEventListener("input", (e) => {
      const strength = calcPasswordStrength(e.target.value);
      updateStrengthUI(strength);
    });
  }

  setupBottomNav();
}

// ──────────────────────────────────────────
// Init
// ──────────────────────────────────────────
function init() {
  applyTheme();
  applyLang();
  setupEventListeners();
  setupScrollReveal();
  handleScroll();
  setUnreadBadge();
  setChatStatus("syncing", t("chatPreparing"));

  if (auth) {
    auth.onAuthStateChanged((user) => {
      updateAuthUI(user);
    });
  } else {
    updateAuthUI(null);
  }

  loadProperties();
}

document.addEventListener("DOMContentLoaded", init);

window.goToProperty = goToProperty;
window.toggleFav = toggleFav;
window.selectSuggestion = selectSuggestion;
