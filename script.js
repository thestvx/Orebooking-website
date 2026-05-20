"use strict";

/* =========================
   OreBooking - script.js v3.0
   Full property details page logic
   ========================= */

const firebaseConfig = {
  apiKey: "AIzaSyCA5iauXrIhozRw8MD7JTOLyeQ2v0GGncA",
  authDomain: "orebooking-website.firebaseapp.com",
  projectId: "orebooking-website",
  storageBucket: "orebooking-website.firebasestorage.app",
  messagingSenderId: "1012887567747",
  appId: "1:1012887567747:web:153b57b60cb143d88acab6",
  measurementId: "G-5GKMRMVHC3"
};

const appState = {
  db: null,
  auth: null,
  storage: null,
  currentUser: null,
  currentPropertyId: null,
  currentPropertyData: null,
  currentImages: [],
  currentSlide: 0,
  propertyMap: null,
  lang: getStoredLang(),
  theme: getStoredTheme(),
  chatMessages: [],
  favPropertyIds: [],
  bookings: [],
  sliderAutoplayTimer: null
};

/* ========================= Safe storage ========================= */
function safeGet(key, fallback = null) {
  try { return localStorage.getItem(key) ?? fallback; } catch (_) { return fallback; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch (_) {}
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch (_) {}
}
function safeJsonGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) { return fallback; }
}
function safeJsonSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function getStoredLang() {
  return safeGet("ore_lang") || safeGet("orelang") || "ar";
}
function setStoredLang(lang) {
  safeSet("ore_lang", lang);
  safeSet("orelang", lang);
  appState.lang = lang;
}
function getStoredTheme() {
  return safeGet("ore_theme") || safeGet("oretheme") || "light";
}
function setStoredTheme(theme) {
  safeSet("ore_theme", theme);
  safeSet("oretheme", theme);
  appState.theme = theme;
}

/* ========================= DOM helpers ========================= */
function byId(id) { return document.getElementById(id); }
function qs(selector, root = document) { return root.querySelector(selector); }
function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function cleanText(value) { return String(value ?? "").trim(); }
function uniqueId() { return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`; }
function isArabic() { return appState.lang === "ar"; }
function t(ar, en) { return isArabic() ? ar : en; }
function setText(target, text) {
  const el = typeof target === "string" ? byId(target) : target;
  if (el) el.textContent = text;
}
function setHTML(target, html) {
  const el = typeof target === "string" ? byId(target) : target;
  if (el) el.innerHTML = html;
}
function formatCurrency(value) {
  const amount = safeNumber(value, 0);
  const locale = isArabic() ? "ar-DZ" : "en-US";
  return `${amount.toLocaleString(locale)} ${t("د.ج", "DZD")}`;
}
function formatDateTime(value) {
  if (!value) return t("غير محدد", "Not set");
  let date = null;
  if (value?.toDate) date = value.toDate();
  else date = new Date(value);
  if (!(date instanceof Date) || isNaN(date.getTime())) return t("غير محدد", "Not set");
  return date.toLocaleString(isArabic() ? "ar-DZ" : "en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  });
}
function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") { const d = new Date(value); return isNaN(d.getTime()) ? 0 : d.getTime(); }
  if (value?.toDate) return value.toDate().getTime();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

/* ========================= i18n ========================= */
const pageI18n = {
  ar: {
    pts: "نقطة", mybookings: "حجوزاتي", myfavorites: "مفضلتي",
    supportchat: "دردشة الدعم", logout: "تسجيل الخروج", backhome: "العودة للرئيسية",
    aboutprop: "حول هذا المكان", whatoffers: "ماذا يوفّر هذا المكان",
    booknow: "احجز الآن", wontcharged: "لن يتم خصم أي مبلغ الآن",
    welcomeback: "مرحبًا بعودتك", logindesc: "أدخل بياناتك للوصول إلى حسابك.",
    email: "البريد الإلكتروني", password: "كلمة المرور",
    rememberme: "تذكرني", forgotpass: "نسيت كلمة المرور؟",
    signin: "تسجيل الدخول", noaccount: "ليس لديك حساب؟",
    signup: "إنشاء حساب", createaccount: "إنشاء حساب",
    registerdesc: "انضم إلى OreBooking لفتح المزايا الكاملة.",
    fullname: "الاسم الكامل", signupbtn: "إنشاء الحساب",
    hasaccount: "لديك حساب بالفعل؟", resetpasstitle: "استعادة كلمة المرور",
    resetpassdesc: "أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة.",
    sendlink: "إرسال رابط الاستعادة", backtologin: "العودة لتسجيل الدخول"
  },
  en: {
    pts: "Pts", mybookings: "My Bookings", myfavorites: "My Favorites",
    supportchat: "Support Chat", logout: "Log Out", backhome: "Back to Home",
    aboutprop: "About this space", whatoffers: "What this place offers",
    booknow: "Reserve Now", wontcharged: "You won't be charged yet",
    welcomeback: "Welcome back", logindesc: "Enter your details to access your account.",
    email: "Email Address", password: "Password",
    rememberme: "Remember me", forgotpass: "Forgot password?",
    signin: "Sign In", noaccount: "Don't have an account?",
    signup: "Sign up", createaccount: "Create an account",
    registerdesc: "Join OreBooking to unlock premium features.",
    fullname: "Full Name", signupbtn: "Create Account",
    hasaccount: "Already have an account?", resetpasstitle: "Reset Password",
    resetpassdesc: "Enter your email and we'll send you a reset link.",
    sendlink: "Send Reset Link", backtologin: "Back to login"
  }
};

function applyTranslations() {
  const dict = pageI18n[appState.lang] || pageI18n.en;
  qsa("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key && key in dict) el.textContent = dict[key];
  });
  qsa("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && key in dict) el.setAttribute("placeholder", dict[key]);
  });
  const langBtnSpan = qs("#lang-toggle span");
  if (langBtnSpan) langBtnSpan.textContent = isArabic() ? "EN" : "AR";
  updateStaticTexts();
}

function updateStaticTexts() {
  setText("share-text", t("مشاركة", "Share"));
  setText("fav-btn-text", t("حفظ", "Save"));
  setText("host-since", t("يستضيف منذ 2024", "Hosting since 2024"));
  setText("host-badge-text", t("مضيف موثّق", "Verified Host"));
  setText("booking-info-text", t(
    "اختر التواريخ وعدد الضيوف في الخطوة التالية لرؤية السعر النهائي وتفاصيل الحجز.",
    "Choose your dates and number of guests on the next page to see the final price and booking details."
  ));
  setText("perk-1", t("إلغاء مجاني خلال 24 ساعة", "Free cancellation within 24h"));
  setText("perk-2", t("تأكيد أولي سريع", "Fast initial confirmation"));
  setText("perk-3", t("دعم 24/7", "24/7 support"));
  setText("map-title", t("موقع الإقامة", "Where you'll be"));
  setText("open-maps-text", t("فتح في خرائط Google", "Open in Google Maps"));
  setText("tips-title", t("معلومات مهمة", "Good to know"));
  setText("trust-note", t(
    "طلبك يبقى آمنًا ويمكنك مراجعة كل تفاصيل الحجز قبل إنهاء الدفع.",
    "Your request stays secure and you can review all booking details before payment is finalized."
  ));
  setText("highlights-title", t("لماذا أعجب الضيوف بهذا المكان", "Why guests like it"));
  setText("highlight-1-title", t("موقع ممتاز", "Great location"));
  setText("highlight-1-desc", t("قريب من النقاط المهمة وسهل الوصول.", "Close to main points of interest."));
  setText("highlight-2-title", t("نظافة وراحة", "Clean and comfortable"));
  setText("highlight-2-desc", t("مجهز لإقامة سلسة ومريحة.", "Prepared for a smooth and pleasant stay."));
  setText("highlight-3-title", t("دعم سريع", "Responsive support"));
  setText("highlight-3-desc", t("تواصل سريع قبل الإقامة وأثناءها.", "Fast communication before and during your stay."));
  setText("highlight-4-title", t("إعلان موثوق", "Trusted listing"));
  setText("highlight-4-desc", t("بيانات موثقة وتجربة حجز مستقرة.", "Verified details and consistent booking flow."));
  setText("tip-1", t(
    "سيتم استكمال تفاصيل الحجز النهائية وبيانات الضيوف في الخطوة التالية.",
    "Booking details and final guest information are completed on the next step."
  ));
  setText("tip-2", t(
    "قد يختلف السعر النهائي حسب التواريخ وعدد الضيوف والخيارات المختارة.",
    "Final pricing may depend on dates, guests, and selected options."
  ));
  setText("tip-3", t(
    "استخدم زر المشاركة لنسخ الرابط أو إرساله بسرعة.",
    "Use the share button to copy or send the listing link quickly."
  ));
  setText("chip-verified", t("إعلان موثّق", "Verified listing"));
  setText("chip-instant", t("طلب حجز فوري", "Instant booking request"));
  setText("contact-host-text", t("تواصل مع المضيف", "Contact Host"));
  setText("host-chat-text", t("مراسلة المضيف", "Message Host"));
  setText("booking-chat-text", t("اسأل عن هذا العقار", "Ask about this property"));
  setText("chat-title", t("دردشة الدعم", "Support Chat"));
  setText("chat-subtitle", t(
    "اسأل عن هذا العقار أو التوفر أو تفاصيل الحجز.",
    "Ask about this property, availability, or booking details."
  ));
  setText("chat-empty-title", t("لا توجد رسائل بعد.", "No messages yet."));
  setText("chat-empty-subtitle", t(
    "ابدأ المحادثة واذكر هذا العقار للتواصل مع الدعم.",
    "Start the conversation and mention this property to contact support."
  ));
  setText("send-chat-text", t("إرسال", "Send"));
  setText("bookings-modal-title", t("حجوزاتي", "My Bookings"));
  setText("favorites-modal-title", t("مفضلتي", "My Favorites"));
}

/* ========================= Theme / Language ========================= */
function applyTheme() {
  document.documentElement.classList.remove("preload-dark");
  document.body.classList.toggle("dark", appState.theme === "dark");
  document.documentElement.style.colorScheme = appState.theme === "dark" ? "dark" : "light";
  const icon = qs("#theme-toggle i");
  if (icon) icon.className = appState.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
}

function toggleTheme() {
  setStoredTheme(appState.theme === "dark" ? "light" : "dark");
  applyTheme();
}

function applyLanguage() {
  document.documentElement.lang = appState.lang;
  document.documentElement.dir = isArabic() ? "rtl" : "ltr";
  applyTranslations();
  if (appState.currentPropertyData) renderPropertyData(appState.currentPropertyData);
  if (byId("bookings-modal")?.classList.contains("active")) loadAndRenderBookings();
  if (byId("chat-modal")?.classList.contains("active")) renderChatMessages();
  if (byId("favorites-modal")?.classList.contains("active")) renderFavorites();
}

function toggleLanguage() {
  setStoredLang(isArabic() ? "en" : "ar");
  applyLanguage();
}

/* ========================= Toasts ========================= */
function ensureToastContainer() {
  let host = byId("toast-container");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-container";
    Object.assign(host.style, {
      position: "fixed", top: "24px", insetInlineEnd: "24px",
      zIndex: "99999", display: "flex", flexDirection: "column", gap: "10px"
    });
    document.body.appendChild(host);
  }
  return host;
}

function showToast(message, type = "info") {
  const host = ensureToastContainer();
  const toast = document.createElement("div");
  const styles = {
    success: { bg: "#ecfdf5", color: "#047857", border: "#10b981", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", color: "#b91c1c", border: "#ef4444", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", color: "#1d4ed8", border: "#3b82f6", icon: "ph-info" }
  };
  const cfg = styles[type] || styles.info;
  Object.assign(toast.style, {
    display: "flex", alignItems: "flex-start", gap: "10px",
    background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
    padding: "14px 16px", borderRadius: "16px",
    boxShadow: "0 14px 28px rgba(15,23,42,.14)",
    fontWeight: "700", lineHeight: "1.6",
    maxWidth: "min(92vw,420px)", opacity: "1",
    transition: "all .3s ease", fontFamily: "inherit"
  });
  toast.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.15rem;margin-top:2px;flex-shrink:0"></i><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

function showFavToast(message) {
  const favToast = byId("fav-toast");
  if (!favToast) { showToast(message, "success"); return; }
  favToast.textContent = message;
  favToast.classList.add("show");
  setTimeout(() => favToast.classList.remove("show"), 2400);
}

window.showToast = showToast;
window.showFavToast = showFavToast;

/* ========================= Modal helpers ========================= */
function refreshBodyLock() {
  const active = qsa(".modal-overlay.active, .auth-modal.active, .lightbox-overlay.active").length > 0;
  document.body.classList.toggle("modal-open", active);
}
function openModalEl(el) {
  if (!el) return;
  el.classList.add("active");
  el.setAttribute("aria-hidden", "false");
  refreshBodyLock();
}
function closeModalEl(el) {
  if (!el) return;
  el.classList.remove("active");
  el.setAttribute("aria-hidden", "true");
  refreshBodyLock();
}
function closeAllOverlays() {
  qsa(".modal-overlay.active, .auth-modal.active, .lightbox-overlay.active").forEach(closeModalEl);
}

/* ========================= Firebase ========================= */
function initFirebase() {
  try {
    if (typeof firebase === "undefined") return;
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    if (typeof firebase.firestore === "function") appState.db = firebase.firestore();
    if (typeof firebase.auth === "function") appState.auth = firebase.auth();
    if (typeof firebase.storage === "function") appState.storage = firebase.storage();
    if (appState.auth) {
      appState.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    }
  } catch (error) { console.error("Firebase init error:", error); }
}

/* ========================= Auth UI ========================= */
function clearAuthMessage() {
  const box = byId("auth-message");
  if (!box) return;
  box.className = "auth-message";
  box.textContent = "";
}
function showAuthMessage(message, type = "error") {
  const box = byId("auth-message");
  if (!box) return;
  box.className = `auth-message ${type}`;
  box.textContent = message;
}
function switchAuthForm(formName = "login") {
  ["login", "register", "forgot"].forEach(name => {
    const form = byId(`${name}-form`);
    if (form) form.classList.toggle("active", name === formName);
  });
  clearAuthMessage();
}
function openAuthModal(formName = "login") {
  switchAuthForm(formName);
  openModalEl(byId("auth-modal"));
}
function closeAuthModal() { closeModalEl(byId("auth-modal")); }
window.openModal = openAuthModal;

function setButtonLoading(button, loading, text = null) {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
    button.innerHTML = `<i class="ph ph-spinner-gap" style="animation:spin .7s linear infinite"></i><span>${escapeHtml(text || t("جارٍ المعالجة...", "Processing..."))}</span>`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) { button.innerHTML = button.dataset.originalHtml; delete button.dataset.originalHtml; }
  }
}

function getAuthErrorMessage(error, mode = "login") {
  const code = String(error?.code || "");
  const map = {
    "auth/invalid-email": t("البريد الإلكتروني غير صالح.", "Invalid email address."),
    "auth/user-disabled": t("تم تعطيل هذا الحساب.", "This account has been disabled."),
    "auth/user-not-found": t("الحساب غير موجود.", "Account not found."),
    "auth/wrong-password": t("كلمة المرور غير صحيحة.", "Incorrect password."),
    "auth/invalid-credential": t("بيانات الدخول غير صحيحة.", "Incorrect login credentials."),
    "auth/email-already-in-use": t("هذا البريد مستخدم بالفعل.", "This email is already in use."),
    "auth/weak-password": t("كلمة المرور ضعيفة جدًا.", "Password is too weak."),
    "auth/popup-closed-by-user": t("تم إغلاق نافذة تسجيل الدخول.", "Sign-in popup was closed."),
    "auth/too-many-requests": t("محاولات كثيرة جدًا، حاول لاحقًا.", "Too many attempts. Try again later.")
  };
  if (map[code]) return map[code];
  if (mode === "forgot") return t("تعذر إرسال رابط الاستعادة.", "Failed to send reset link.");
  if (mode === "register") return t("تعذر إنشاء الحساب.", "Failed to create account.");
  if (mode === "google") return t("تعذر تسجيل الدخول عبر Google.", "Failed to sign in with Google.");
  return t("حدث خطأ غير متوقع.", "An unexpected error occurred.");
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  clearAuthMessage();
  if (!appState.auth) { showAuthMessage(t("خدمة تسجيل الدخول غير متاحة.", "Authentication service unavailable.")); return; }
  const email = cleanText(byId("login-email")?.value);
  const password = cleanText(byId("login-password")?.value);
  const btn = byId("login-submit-btn");
  if (!email || !password) { showAuthMessage(t("يرجى إدخال البريد وكلمة المرور.", "Please enter email and password.")); return; }
  setButtonLoading(btn, true);
  try {
    await appState.auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
    showToast(t("تم تسجيل الدخول بنجاح.", "Signed in successfully."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "login"), "error");
  } finally { setButtonLoading(btn, false); }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  clearAuthMessage();
  if (!appState.auth) { showAuthMessage(t("خدمة إنشاء الحساب غير متاحة.", "Registration service unavailable.")); return; }
  const name = cleanText(byId("reg-name")?.value);
  const email = cleanText(byId("reg-email")?.value);
  const password = cleanText(byId("reg-password")?.value);
  const btn = byId("register-submit-btn");
  if (!name || !email || !password) { showAuthMessage(t("يرجى تعبئة جميع الحقول.", "Please complete all fields.")); return; }
  if (password.length < 6) { showAuthMessage(t("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "Password must be at least 6 characters.")); return; }
  setButtonLoading(btn, true);
  try {
    const cred = await appState.auth.createUserWithEmailAndPassword(email, password);
    if (cred.user) await cred.user.updateProfile({ displayName: name }).catch(() => {});
    if (appState.db && cred.user?.uid) {
      await appState.db.collection("users").doc(cred.user.uid).set({
        uid: cred.user.uid, name, email, points: 0,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }
    closeAuthModal();
    showToast(t("تم إنشاء الحساب بنجاح.", "Account created successfully."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "register"), "error");
  } finally { setButtonLoading(btn, false); }
}

async function handleForgotSubmit(event) {
  event.preventDefault();
  clearAuthMessage();
  if (!appState.auth) { showAuthMessage(t("خدمة الاستعادة غير متاحة.", "Reset service unavailable.")); return; }
  const email = cleanText(byId("forgot-email")?.value);
  const btn = byId("forgot-submit-btn") || qs("#forgot-form button[type='submit']");
  if (!email) { showAuthMessage(t("أدخل بريدك الإلكتروني أولًا.", "Please enter your email first.")); return; }
  setButtonLoading(btn, true);
  try {
    await appState.auth.sendPasswordResetEmail(email);
    showAuthMessage(t("تم إرسال رابط الاستعادة بنجاح.", "Reset link sent successfully."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "forgot"), "error");
  } finally { setButtonLoading(btn, false); }
}

async function signInWithGoogle() {
  clearAuthMessage();
  if (!appState.auth || typeof firebase === "undefined" || typeof firebase.auth?.GoogleAuthProvider !== "function") {
    showAuthMessage(t("تسجيل الدخول عبر Google غير متاح.", "Google sign-in is unavailable.")); return;
  }
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await appState.auth.signInWithPopup(provider);
    closeAuthModal();
    showToast(t("تم تسجيل الدخول عبر Google بنجاح.", "Logged in with Google successfully."), "success");
  } catch (error) { showAuthMessage(getAuthErrorMessage(error, "google"), "error"); }
}

async function logoutUser() {
  if (!appState.auth) return;
  try {
    await appState.auth.signOut();
    toggleProfileDropdown(false);
    showToast(t("تم تسجيل الخروج بنجاح.", "Logged out successfully."), "success");
  } catch (error) { showToast(t("تعذر تسجيل الخروج.", "Failed to log out."), "error"); }
}

function toggleProfileDropdown(force = null) {
  const dropdown = byId("profile-dropdown");
  const button = byId("open-auth-btn");
  if (!dropdown || !button) return;
  const active = typeof force === "boolean" ? force : !dropdown.classList.contains("active");
  dropdown.classList.toggle("active", active);
  button.setAttribute("aria-expanded", String(active));
}

function getStoredUserProfile(uid) { return safeJsonGet(`ore_user_profile_${uid}`, {}); }
function saveStoredUserProfile(uid, data) {
  if (!uid) return;
  safeJsonSet(`ore_user_profile_${uid}`, { ...(getStoredUserProfile(uid) || {}), ...(data || {}) });
}

async function loadUserProfile(uid) {
  let profile = getStoredUserProfile(uid) || {};
  if (appState.db && uid) {
    try {
      const doc = await appState.db.collection("users").doc(uid).get();
      if (doc.exists) { profile = { ...profile, ...doc.data() }; saveStoredUserProfile(uid, profile); }
    } catch (_) {}
  }
  return profile;
}

function setUserPoints(points) {
  const el = byId("user-points");
  if (el) el.textContent = safeNumber(points, 0).toLocaleString(isArabic() ? "ar-DZ" : "en-US");
}

async function updateAuthUI(user) {
  const openAuthBtn = byId("open-auth-btn");
  const nameEl = byId("dropdown-user-name");
  const emailEl = byId("dropdown-user-email");
  const logoutBtn = byId("logout-btn");

  if (user) {
    const profile = await loadUserProfile(user.uid);
    const name = cleanText(profile.name || user.displayName || t("مستخدم OreBooking", "OreBooking User"));
    const email = cleanText(profile.email || user.email || "");
    if (nameEl) nameEl.textContent = name;
    if (emailEl) emailEl.textContent = email || t("تم تسجيل الدخول", "Signed in");
    if (openAuthBtn) {
      openAuthBtn.classList.remove("auth-btn-guest");
      openAuthBtn.innerHTML = `<i class="ph ph-user-circle"></i>`;
    }
    if (logoutBtn) logoutBtn.style.display = "";
    setUserPoints(profile.points || 0);
    loadFavorites();
  } else {
    if (nameEl) nameEl.textContent = t("مستخدم زائر", "Guest User");
    if (emailEl) emailEl.textContent = t("سجل الدخول للمتابعة", "Sign in to continue");
    if (openAuthBtn) {
      openAuthBtn.classList.add("auth-btn-guest");
      openAuthBtn.innerHTML = `<i class="ph ph-user"></i>`;
    }
    if (logoutBtn) logoutBtn.style.display = "none";
    setUserPoints(0);
  }
  updateFavButtonState();
}

function bindAuthState() {
  if (!appState.auth) { updateAuthUI(null); return; }
  appState.auth.onAuthStateChanged(async user => {
    appState.currentUser = user || null;
    await updateAuthUI(appState.currentUser);
    if (byId("bookings-modal")?.classList.contains("active")) loadAndRenderBookings();
    if (byId("chat-modal")?.classList.contains("active")) renderChatMessages();
  });
}

/* ========================= Password UI ========================= */
function togglePasswordVisibility(button) {
  const wrapper = button.closest(".pass-wrapper");
  const input = wrapper?.querySelector("input");
  const icon = button.querySelector("i");
  if (!input) return;
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  if (icon) icon.className = show ? "ph ph-eye-slash" : "ph ph-eye";
}

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) || /[a-z]/.test(password)) score++;
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
}

function updatePasswordStrengthUI() {
  const input = byId("reg-password");
  const box = byId("password-strength");
  const label = byId("strength-label");
  const bars = qsa(".str-bar", box || document);
  if (!input || !box || !label || !bars.length) return;
  const password = input.value || "";
  if (!password) { box.style.display = "none"; label.textContent = ""; return; }
  box.style.display = "block";
  const strength = getPasswordStrength(password);
  const palette = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
  bars.forEach((bar, idx) => {
    bar.style.background = idx < strength ? palette[Math.min(strength - 1, 3)] : "var(--border-color)";
  });
  const texts = { 1: t("ضعيفة", "Weak"), 2: t("مقبولة", "Fair"), 3: t("جيدة", "Good"), 4: t("قوية", "Strong") };
  label.textContent = texts[strength] || "";
}

/* ========================= Property helpers ========================= */
function pickFirst(data, keys = []) {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return "";
}

function resolvePropertyId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("propertyId") || params.get("listingId") ||
    safeGet("selectedPropertyId") || safeGet("ore_selected_property_id");
  return cleanText(id || "");
}

function getLocalizedText(data, arKeys, enKeys, fallback = "") {
  if (isArabic()) return pickFirst(data, arKeys) || pickFirst(data, enKeys) || fallback;
  return pickFirst(data, enKeys) || pickFirst(data, arKeys) || fallback;
}

function getTitleText(data) {
  return getLocalizedText(data,
    ["titleAr", "title_ar", "nameAr", "name_ar"],
    ["titleEn", "title", "title_en", "nameEn", "name"],
    t("عقار بدون اسم", "Unnamed property"));
}
function getLocationText(data) {
  return getLocalizedText(data,
    ["locationAr", "location_ar", "cityAr", "addressAr"],
    ["locationEn", "location", "location_en", "city", "address"],
    t("موقع غير معروف", "Unknown location"));
}
function getDescText(data) {
  return getLocalizedText(data,
    ["descAr", "descriptionAr", "description_ar", "summaryAr"],
    ["descEn", "desc", "descriptionEn", "description", "summary"],
    t("لا يوجد وصف متاح حاليًا.", "No description available."));
}
function getPropertyTypeText(data) {
  const raw = getLocalizedText(data, ["typeAr"], ["typeEn", "type", "category"], "") ||
    String(data?.type || data?.category || "").toLowerCase();
  const s = String(raw).toLowerCase();
  if (/villa|فيلا/.test(s)) return t("فيلا", "Villa");
  if (/apartment|flat|شقة/.test(s)) return t("شقة", "Apartment");
  if (/resort|منتجع/.test(s)) return t("منتجع", "Resort");
  if (/hotel|فندق/.test(s)) return t("فندق", "Hotel");
  if (/cabin|شاليه|كوخ/.test(s)) return t("شاليه", "Cabin");
  return cleanText(raw) || t("إقامة مميزة", "Premium stay");
}
function getGuestCountText(data) {
  const guests = safeNumber(data?.maxGuests ?? data?.guests ?? data?.capacity, 4);
  return isArabic() ? `حتى ${guests} ضيوف` : `Up to ${guests} guests`;
}
function getBedroomText(data) {
  const bedrooms = safeNumber(data?.bedrooms ?? data?.rooms, 2);
  if (isArabic()) {
    if (bedrooms === 1) return "غرفة نوم واحدة";
    if (bedrooms === 2) return "غرفتا نوم";
    return `${bedrooms} غرف نوم`;
  }
  return bedrooms === 1 ? "1 Bedroom" : `${bedrooms} Bedrooms`;
}

function getFeatureIcon(feature) {
  const key = String(feature || "").toLowerCase();
  const map = {
    wifi: "ph-wifi-high", "wi-fi": "ph-wifi-high", internet: "ph-wifi-high",
    pool: "ph-swimming-pool", parking: "ph-car", gym: "ph-barbell",
    restaurant: "ph-fork-knife", spa: "ph-flower-lotus", kitchen: "ph-cooking-pot",
    ac: "ph-snowflake", "air conditioning": "ph-snowflake", "تكييف": "ph-snowflake",
    balcony: "ph-windows", breakfast: "ph-coffee", security: "ph-shield-check",
    tv: "ph-television", beach: "ph-island",
    "واي فاي": "ph-wifi-high", "مسبح": "ph-swimming-pool", "موقف سيارات": "ph-car",
    "مطبخ": "ph-cooking-pot", "مطعم": "ph-fork-knife", "سبا": "ph-flower-lotus",
    "شرفة": "ph-windows", "إفطار": "ph-coffee", "حماية": "ph-shield-check", "تلفاز": "ph-television"
  };
  return map[key] || "ph-check-circle";
}

function normalizeFeatureLabel(feature) {
  const key = String(feature || "").toLowerCase().trim();
  const map = {
    wifi: t("واي فاي", "WiFi"), "wi-fi": t("واي فاي", "WiFi"), internet: t("إنترنت", "Internet"),
    pool: t("مسبح", "Pool"), parking: t("موقف سيارات", "Parking"), gym: t("قاعة رياضية", "Gym"),
    restaurant: t("مطعم", "Restaurant"), spa: t("سبا", "Spa"), kitchen: t("مطبخ", "Kitchen"),
    ac: t("تكييف", "Air Conditioning"), "air conditioning": t("تكييف", "Air Conditioning"),
    balcony: t("شرفة", "Balcony"), breakfast: t("إفطار", "Breakfast"),
    security: t("حماية", "Security"), tv: t("تلفاز", "TV"), beach: t("وصول للشاطئ", "Beach Access")
  };
  return map[key] || String(feature || "").trim() || t("ميزة", "Feature");
}

function getFeaturesArray(data) {
  const localized = isArabic()
    ? data?.featuresAr || data?.features_ar
    : data?.featuresEn || data?.features || data?.features_en;
  const fallback = isArabic()
    ? data?.featuresEn || data?.features || data?.features_en
    : data?.featuresAr || data?.features_ar;
  const raw = localized || fallback || data?.amenities || [];
  if (Array.isArray(raw)) return raw.map(i => cleanText(i)).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map(i => cleanText(i)).filter(Boolean);
  return ["wifi", "parking", "ac", "kitchen"];
}

function getPropertyImages(data) {
  const candidates = [
    ...(Array.isArray(data?.images) ? data.images : []),
    ...(Array.isArray(data?.gallery) ? data.gallery : []),
    ...(Array.isArray(data?.photos) ? data.photos : []),
    cleanText(data?.imageUrl), cleanText(data?.mainImage), cleanText(data?.image)
  ].filter(Boolean);
  const unique = [...new Set(candidates)].filter(Boolean);
  return unique.length ? unique : ["images/placeholder.jpg"];
}

function buildFallbackProperty(id = "") {
  return {
    id, titleEn: "Selected Property", titleAr: "العقار المحدد",
    locationEn: "Location unavailable", locationAr: "الموقع غير متوفر",
    descEn: "Property details are not available right now.",
    descAr: "تفاصيل العقار غير متوفرة حاليًا.",
    typeEn: "Stay", typeAr: "إقامة", price: 0, rating: 4.8,
    maxGuests: 4, bedrooms: 2, images: ["images/placeholder.jpg"],
    featuresEn: ["WiFi", "Parking", "Air Conditioning", "Kitchen"],
    featuresAr: ["واي فاي", "موقف سيارات", "تكييف", "مطبخ"],
    hostName: "OreBooking Host"
  };
}

/* ========================= Load property ========================= */
async function loadPropertyData() {
  appState.currentPropertyId = resolvePropertyId();
  if (appState.currentPropertyId) {
    safeSet("selectedPropertyId", appState.currentPropertyId);
    safeSet("ore_selected_property_id", appState.currentPropertyId);
  }

  let propertyData = null;
  const locallySelected = safeJsonGet("selectedPropertyData") || safeJsonGet("ore_selected_property_data");
  if (locallySelected) {
    const localId = cleanText(locallySelected.id || locallySelected.propertyId || "");
    if (!appState.currentPropertyId || localId === appState.currentPropertyId) {
      propertyData = { ...locallySelected };
      if (!appState.currentPropertyId) appState.currentPropertyId = localId;
    }
  }

  if (appState.db && appState.currentPropertyId) {
    try {
      const doc = await appState.db.collection("properties").doc(String(appState.currentPropertyId)).get();
      if (doc.exists) propertyData = { id: doc.id, ...doc.data() };
    } catch (error) { console.error("Property load error:", error); }
  }

  if (!propertyData) propertyData = buildFallbackProperty(appState.currentPropertyId);
  renderPropertyData(propertyData);
}

function showPropertyContent() {
  const skeleton = byId("prop-skeleton");
  const realContent = byId("prop-real-content");
  if (skeleton) skeleton.style.display = "none";
  if (realContent) realContent.style.display = "block";
}

function buildBookingUrl() {
  const base = "booking.html";
  const params = new URLSearchParams();
  if (appState.currentPropertyId) params.set("id", appState.currentPropertyId);
  const data = appState.currentPropertyData;
  if (data) {
    const price = safeNumber(data?.price ?? data?.pricePerNight ?? data?.basePrice, 0);
    params.set("price", String(price));
    params.set("title", encodeURIComponent(getTitleText(data)));
    params.set("location", encodeURIComponent(getLocationText(data)));
    const imgs = getPropertyImages(data);
    if (imgs.length) params.set("img", encodeURIComponent(imgs[0]));
  }
  return `${base}?${params.toString()}`;
}

function renderPropertyData(data) {
  appState.currentPropertyData = data;
  const title = getTitleText(data);
  const location = getLocationText(data);
  const desc = getDescText(data);
  const price = safeNumber(data?.price ?? data?.pricePerNight ?? data?.basePrice, 0);
  const rating = safeNumber(data?.rating, 4.8).toFixed(1);
  const guestsText = getGuestCountText(data);
  const bedroomsText = getBedroomText(data);
  const propType = getPropertyTypeText(data);
  const host = cleanText(data?.hostName || data?.host || data?.ownerName || "OreBooking Host");
  const features = getFeaturesArray(data);
  const images = getPropertyImages(data);

  setText("prop-title", title);
  setText("prop-location", location);
  setText("prop-desc", desc);
  setText("prop-price", formatCurrency(price));
  setText("prop-rating", rating);
  setText("prop-type-text", propType);
  setText("chip-guests", guestsText);
  setText("chip-bedrooms", bedroomsText);
  setText("booking-stat-guests", isArabic() ? `السعة: ${guestsText}` : `Capacity: ${guestsText}`);
  setText("booking-stat-type", isArabic() ? `النوع: ${propType}` : `Type: ${propType}`);
  setText("host-name", host);

  // Meta breadcrumb
  const meta = byId("prop-meta-location");
  if (meta) meta.textContent = location;

  // Features list
  const list = byId("prop-features-list");
  if (list) {
    list.innerHTML = "";
    features.forEach(feature => {
      const li = document.createElement("li");
      li.innerHTML = `<i class="ph ${getFeatureIcon(feature)}"></i><span>${escapeHtml(normalizeFeatureLabel(feature))}</span>`;
      list.appendChild(li);
    });
  }

  appState.currentImages = images;
  appState.currentSlide = 0;
  setupSlider(images);
  setupThumbs(images);
  updateFavButtonState();
  setupMap(data, location);

  // Book now link
  const bookNowLink = byId("book-now-link");
  if (bookNowLink) bookNowLink.href = buildBookingUrl();

  // All other "book now" buttons
  qsa("[data-book-now]").forEach(btn => {
    btn.addEventListener("click", () => { window.location.href = buildBookingUrl(); });
  });

  // Chat property id
  const chatPropId = byId("chat-property-id");
  if (chatPropId) chatPropId.value = appState.currentPropertyId || "";

  // Map link
  const mapLink = byId("map-open-link");
  const lat = Number(data?.lat ?? data?.locationLat ?? data?.latitude);
  const lng = Number(data?.lng ?? data?.locationLng ?? data?.longitude);
  if (mapLink && Number.isFinite(lat) && Number.isFinite(lng)) {
    mapLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
  }

  document.title = `${title} — OreBooking`;
  showPropertyContent();
}

/* ========================= Gallery / Slider ========================= */
function updateImageBadge(current, total) {
  setText("slider-count-badge", `${current + 1} / ${total}`);
}

function goToSlide(index, updateLightbox = true) {
  if (!appState.currentImages.length) return;
  const total = appState.currentImages.length;
  appState.currentSlide = ((index % total) + total) % total;
  const track = byId("slider-track");
  if (track) {
    const dir = document.documentElement.dir === "rtl" ? 1 : -1;
    track.style.transform = `translateX(${dir * appState.currentSlide * 100}%)`;
  }
  qsa(".slider-dot").forEach((dot, idx) => dot.classList.toggle("active", idx === appState.currentSlide));
  qsa(".gallery-thumb").forEach((thumb, idx) => thumb.classList.toggle("active", idx === appState.currentSlide));
  updateImageBadge(appState.currentSlide, total);
  const lightbox = byId("lightbox");
  const lightboxImg = byId("lightbox-img");
  if (updateLightbox && lightbox?.classList.contains("active") && lightboxImg) {
    lightboxImg.src = appState.currentImages[appState.currentSlide];
    lightboxImg.classList.remove("zoomed");
  }
}

function setupSlider(images) {
  const track = byId("slider-track");
  const dots = byId("slider-dots");
  if (!track || !dots) return;
  track.innerHTML = "";
  dots.innerHTML = "";
  images.forEach((src, idx) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `Property image ${idx + 1}`;
    img.loading = idx === 0 ? "eager" : "lazy";
    img.onerror = function () { this.src = "images/placeholder.jpg"; };
    img.addEventListener("click", openLightbox);
    track.appendChild(img);
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `slider-dot${idx === 0 ? " active" : ""}`;
    dot.setAttribute("aria-label", `Go to image ${idx + 1}`);
    dot.addEventListener("click", () => goToSlide(idx));
    dots.appendChild(dot);
  });
  goToSlide(0, false);
  startSliderAutoplay();
}

function setupThumbs(images) {
  const thumbs = byId("gallery-thumbs");
  if (!thumbs) return;
  thumbs.innerHTML = "";
  images.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `gallery-thumb${idx === 0 ? " active" : ""}`;
    btn.setAttribute("aria-label", `Thumbnail ${idx + 1}`);
    btn.innerHTML = `<img src="${escapeHtml(src)}" alt="Thumbnail ${idx + 1}" loading="lazy">`;
    btn.querySelector("img").onerror = function () { this.src = "images/placeholder.jpg"; };
    btn.addEventListener("click", () => goToSlide(idx));
    thumbs.appendChild(btn);
  });
}

function nextSlide(e) { if (e) e.stopPropagation(); goToSlide(appState.currentSlide + 1); }
function prevSlide(e) { if (e) e.stopPropagation(); goToSlide(appState.currentSlide - 1); }

function startSliderAutoplay() {
  stopSliderAutoplay();
  if (appState.currentImages.length <= 1) return;
  appState.sliderAutoplayTimer = setInterval(() => {
    if (!byId("lightbox")?.classList.contains("active")) goToSlide(appState.currentSlide + 1, false);
  }, 4500);
}
function stopSliderAutoplay() {
  if (appState.sliderAutoplayTimer) { clearInterval(appState.sliderAutoplayTimer); appState.sliderAutoplayTimer = null; }
}

/* ========================= Lightbox ========================= */
function openLightbox() {
  if (!appState.currentImages.length) return;
  const lightbox = byId("lightbox");
  const img = byId("lightbox-img");
  if (!lightbox || !img) return;
  img.src = appState.currentImages[appState.currentSlide];
  img.classList.remove("zoomed");
  stopSliderAutoplay();
  openModalEl(lightbox);
}

function closeLightbox() {
  closeModalEl(byId("lightbox"));
  startSliderAutoplay();
}

function nextLightboxImage(e) { if (e) e.stopPropagation(); goToSlide(appState.currentSlide + 1); }
function prevLightboxImage(e) { if (e) e.stopPropagation(); goToSlide(appState.currentSlide - 1); }

function toggleLightboxZoom() {
  const img = byId("lightbox-img");
  if (img) img.classList.toggle("zoomed");
}

/* ========================= Map ========================= */
function setupMap(data, locationText) {
  const lat = safeNumber(data?.lat ?? data?.locationLat ?? data?.latitude, null);
  const lng = safeNumber(data?.lng ?? data?.locationLng ?? data?.longitude, null);

  if (lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng)) {
    renderLeafletMap(lat, lng, locationText);
  } else {
    const mapBox = byId("prop-map");
    if (mapBox) {
      mapBox.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.9rem;gap:8px;flex-direction:column">
        <i class="ph ph-map-pin" style="font-size:2rem;opacity:0.5"></i>
        <span>${t("الموقع على الخريطة غير محدد", "Map location not specified")}</span>
      </div>`;
    }
  }
}

function renderLeafletMap(lat, lng, title) {
  const mapEl = byId("prop-map");
  if (!mapEl) return;
  if (appState.propertyMap) {
    try { appState.propertyMap.remove(); } catch (_) {}
    appState.propertyMap = null;
  }
  if (typeof L === "undefined") {
    mapEl.innerHTML = `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--primary);font-weight:600;gap:8px">
      <i class="ph ph-map-pin-line"></i> ${t("فتح الموقع في خرائط Google", "Open location in Google Maps")}
    </a>`;
    return;
  }
  try {
    mapEl.innerHTML = "";
    const map = L.map(mapEl, { zoomControl: true, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors", maxZoom: 18
    }).addTo(map);
    const icon = L.divIcon({
      className: "custom-map-marker",
      html: `<div style="background:var(--primary,#435abf);color:#fff;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(67,90,191,.35);border:3px solid #fff"><i class="ph ph-map-pin" style="font-size:1.1rem"></i></div>`,
      iconSize: [36, 36], iconAnchor: [18, 36]
    });
    L.marker([lat, lng], { icon }).addTo(map).bindPopup(`<strong>${escapeHtml(title || "")}</strong>`).openPopup();
    map.setView([lat, lng], 14);
    appState.propertyMap = map;
  } catch (err) { console.error("Map render error:", err); }
}

/* ========================= Favorites ========================= */
function getFavKey() {
  const uid = appState.currentUser?.uid;
  return uid ? `ore_favs_${uid}` : "ore_favs_guest";
}
function loadFavorites() {
  appState.favPropertyIds = safeJsonGet(getFavKey(), []);
}
function saveFavorites() {
  safeJsonSet(getFavKey(), appState.favPropertyIds);
}
function isFavorite(propertyId) {
  return appState.favPropertyIds.includes(String(propertyId));
}
function updateFavButtonState() {
  const btn = byId("fav-btn");
  const icon = byId("fav-icon");
  const text = byId("fav-btn-text");
  const pid = appState.currentPropertyId;
  if (!btn || !pid) return;
  const saved = isFavorite(pid);
  btn.classList.toggle("saved", saved);
  if (icon) icon.className = saved ? "ph ph-heart-fill" : "ph ph-heart";
  if (text) text.textContent = saved ? t("محفوظ", "Saved") : t("حفظ", "Save");
}

function toggleFavorite() {
  const pid = cleanText(appState.currentPropertyId);
  if (!pid) { showToast(t("لم يتم تحديد العقار.", "No property selected."), "error"); return; }
  const idx = appState.favPropertyIds.indexOf(pid);
  if (idx === -1) {
    appState.favPropertyIds.push(pid);
    // Store full data for display
    const stored = safeJsonGet("ore_fav_data", {});
    if (appState.currentPropertyData) stored[pid] = { ...appState.currentPropertyData };
    safeJsonSet("ore_fav_data", stored);
    showFavToast(t("تم حفظ العقار في المفضلة.", "Property saved to favorites."));
  } else {
    appState.favPropertyIds.splice(idx, 1);
    const stored = safeJsonGet("ore_fav_data", {});
    delete stored[pid];
    safeJsonSet("ore_fav_data", stored);
    showFavToast(t("تم إزالة العقار من المفضلة.", "Property removed from favorites."));
  }
  saveFavorites();
  updateFavButtonState();
  if (appState.db && appState.currentUser?.uid) {
    appState.db.collection("users").doc(appState.currentUser.uid).set({ favorites: appState.favPropertyIds }, { merge: true }).catch(() => {});
  }
}

/* ========================= Favorites Modal ========================= */
function openFavoritesModal() {
  loadFavorites();
  renderFavorites();
  openModalEl(byId("favorites-modal"));
}

function renderFavorites() {
  const list = byId("favorites-list");
  const empty = byId("favorites-empty");
  if (!list) return;
  list.innerHTML = "";
  const favData = safeJsonGet("ore_fav_data", {});
  const ids = appState.favPropertyIds;
  if (!ids.length) {
    if (empty) empty.style.display = "flex";
    return;
  }
  if (empty) empty.style.display = "none";
  ids.forEach(pid => {
    const data = favData[pid] || { titleEn: pid, titleAr: pid };
    const title = getTitleText(data);
    const location = getLocationText(data);
    const price = safeNumber(data?.price ?? data?.pricePerNight, 0);
    const imgs = getPropertyImages(data);
    const card = document.createElement("div");
    card.className = "fav-item";
    card.innerHTML = `
      <div class="fav-item-img">
        <img src="${escapeHtml(imgs[0])}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
      </div>
      <div class="fav-item-info">
        <strong class="fav-item-title">${escapeHtml(title)}</strong>
        <span class="fav-item-loc"><i class="ph ph-map-pin"></i> ${escapeHtml(location)}</span>
        <span class="fav-item-price">${formatCurrency(price)} ${t("/ ليلة", "/ night")}</span>
      </div>
      <div class="fav-item-actions">
        <button class="fav-remove-btn" aria-label="${t("إزالة من المفضلة", "Remove from favorites")}" data-pid="${escapeHtml(pid)}">
          <i class="ph ph-trash"></i>
        </button>
      </div>`;
    card.querySelector(".fav-remove-btn").addEventListener("click", () => removeFavorite(pid));
    list.appendChild(card);
  });
}

function removeFavorite(pid) {
  const idx = appState.favPropertyIds.indexOf(pid);
  if (idx !== -1) {
    appState.favPropertyIds.splice(idx, 1);
    saveFavorites();
    const stored = safeJsonGet("ore_fav_data", {});
    delete stored[pid];
    safeJsonSet("ore_fav_data", stored);
    renderFavorites();
    updateFavButtonState();
  }
}

/* ========================= Bookings Modal ========================= */
function openBookingsModal() {
  loadAndRenderBookings();
  openModalEl(byId("bookings-modal"));
}

async function loadAndRenderBookings() {
  const list = byId("bookings-list");
  const empty = byId("bookings-empty");
  const loading = byId("bookings-loading");
  if (!list) return;

  if (loading) loading.style.display = "flex";
  list.innerHTML = "";
  if (empty) empty.style.display = "none";

  let bookings = [];

  if (appState.db && appState.currentUser?.uid) {
    try {
      const snap = await appState.db.collection("bookings")
        .where("userId", "==", appState.currentUser.uid)
        .orderBy("createdAt", "desc")
        .limit(30)
        .get();
      snap.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
    } catch (_) {}
  }

  // Fallback to local
  if (!bookings.length) {
    const local = safeJsonGet("ore_bookings_local_v1", []);
    bookings = local.filter(b => !appState.currentUser || b.userId === appState.currentUser.uid).slice(0, 30);
  }

  if (loading) loading.style.display = "none";

  if (!bookings.length) {
    if (empty) empty.style.display = "flex";
    return;
  }

  bookings.forEach(booking => {
    const card = document.createElement("div");
    card.className = "booking-item";
    const status = cleanText(booking.status || "pending");
    const statusLabel = {
      pending: t("قيد الانتظار", "Pending"),
      confirmed: t("مؤكد", "Confirmed"),
      cancelled: t("ملغى", "Cancelled"),
      completed: t("مكتمل", "Completed")
    }[status] || status;
    const statusClass = { pending: "status-pending", confirmed: "status-confirmed", cancelled: "status-cancelled", completed: "status-completed" }[status] || "status-pending";
    const img = cleanText(booking.propertyImage || booking.property?.image || "images/placeholder.jpg");
    const title = cleanText(booking.propertyTitle || booking.property?.title || t("عقار محجوز", "Booked Property"));
    const location = cleanText(booking.propertyLocation || booking.property?.location || "");
    const checkIn = formatDateTime(booking.stay?.checkIn || booking.checkIn);
    const checkOut = formatDateTime(booking.stay?.checkOut || booking.checkOut);
    const total = formatCurrency(booking.pricing?.total || booking.totalPrice || 0);
    const ref = cleanText(booking.reference || booking.id || "");
    card.innerHTML = `
      <div class="booking-item-img">
        <img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
      </div>
      <div class="booking-item-info">
        <div class="booking-item-header">
          <strong class="booking-item-title">${escapeHtml(title)}</strong>
          <span class="booking-status ${statusClass}">${escapeHtml(statusLabel)}</span>
        </div>
        ${location ? `<span class="booking-item-loc"><i class="ph ph-map-pin"></i> ${escapeHtml(location)}</span>` : ""}
        <div class="booking-item-dates">
          <span><i class="ph ph-calendar-check"></i> ${escapeHtml(checkIn)}</span>
          <span><i class="ph ph-calendar-x"></i> ${escapeHtml(checkOut)}</span>
        </div>
        <div class="booking-item-footer">
          <span class="booking-item-total">${escapeHtml(total)}</span>
          ${ref ? `<span class="booking-item-ref"># ${escapeHtml(ref)}</span>` : ""}
        </div>
      </div>`;
    list.appendChild(card);
  });
}

/* ========================= Chat ========================= */
const CHAT_STORAGE_KEY = "ore_chat_messages_v2";

function loadChatMessages() {
  const pid = appState.currentPropertyId;
  const key = pid ? `${CHAT_STORAGE_KEY}_${pid}` : CHAT_STORAGE_KEY;
  appState.chatMessages = safeJsonGet(key, []);
}

function saveChatMessages() {
  const pid = appState.currentPropertyId;
  const key = pid ? `${CHAT_STORAGE_KEY}_${pid}` : CHAT_STORAGE_KEY;
  safeJsonSet(key, appState.chatMessages);
}

function openChatModal() {
  loadChatMessages();
  renderChatMessages();
  openModalEl(byId("chat-modal"));
  setTimeout(() => {
    const inp = byId("chat-input");
    if (inp) inp.focus();
    scrollChatToBottom();
  }, 150);
}

function renderChatMessages() {
  const container = byId("chat-messages");
  const empty = byId("chat-empty");
  if (!container) return;
  container.innerHTML = "";
  if (!appState.chatMessages.length) {
    if (empty) empty.style.display = "flex";
    return;
  }
  if (empty) empty.style.display = "none";
  appState.chatMessages.forEach(msg => {
    const bubble = document.createElement("div");
    const isOwn = msg.role === "user";
    bubble.className = `chat-bubble ${isOwn ? "chat-bubble-user" : "chat-bubble-support"}`;
    bubble.innerHTML = `
      <div class="chat-bubble-text">${escapeHtml(msg.text)}</div>
      <div class="chat-bubble-meta">
        ${msg.senderName ? `<span class="chat-sender">${escapeHtml(msg.senderName)}</span>` : ""}
        <span class="chat-time">${formatDateTime(msg.createdAt)}</span>
      </div>`;
    container.appendChild(bubble);
  });
  scrollChatToBottom();
}

function scrollChatToBottom() {
  const container = byId("chat-messages");
  if (container) container.scrollTop = container.scrollHeight;
}

async function sendChatMessage(event) {
  if (event) event.preventDefault();
  const input = byId("chat-input");
  const sendBtn = byId("send-chat-btn");
  const text = cleanText(input?.value);
  if (!text) return;

  const senderName = cleanText(
    appState.currentUser?.displayName ||
    appState.currentUser?.email?.split("@")[0] ||
    t("مستخدم", "User")
  );

  const msg = {
    id: uniqueId(),
    role: "user",
    text,
    senderName,
    propertyId: appState.currentPropertyId || "",
    userId: appState.currentUser?.uid || "guest",
    createdAt: new Date().toISOString()
  };

  appState.chatMessages.push(msg);
  saveChatMessages();
  renderChatMessages();
  if (input) input.value = "";
  if (sendBtn) sendBtn.disabled = true;

  // Try Firestore
  if (appState.db) {
    try {
      await appState.db.collection("chats").add(msg);
    } catch (_) {}
  }

  // Auto reply
  setTimeout(() => {
    const autoMsg = {
      id: uniqueId(),
      role: "support",
      text: t(
        `شكرًا على تواصلك بخصوص هذا العقار. سنرد عليك في أقرب وقت ممكن.`,
        `Thank you for contacting us about this property. We'll get back to you shortly.`
      ),
      senderName: t("دعم OreBooking", "OreBooking Support"),
      createdAt: new Date().toISOString()
    };
    appState.chatMessages.push(autoMsg);
    saveChatMessages();
    renderChatMessages();
    if (sendBtn) sendBtn.disabled = false;
  }, 1200);
}

/* ========================= Share ========================= */
async function shareProperty() {
  const url = window.location.href;
  const title = getTitleText(appState.currentPropertyData || {});
  const text = t(`شاهد هذا العقار: ${title}`, `Check out this property: ${title}`);

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (_) {}
  }

  try {
    await navigator.clipboard.writeText(url);
    showToast(t("تم نسخ الرابط!", "Link copied!"), "success");
  } catch (_) {
    showToast(t("تعذر النسخ، يرجى نسخه يدويًا.", "Copy failed, please copy manually."), "error");
  }
}

/* ========================= Event bindings ========================= */
function bindNavButtons() {
  // Theme
  const themeBtn = byId("theme-toggle");
  if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

  // Language
  const langBtn = byId("lang-toggle");
  if (langBtn) langBtn.addEventListener("click", toggleLanguage);

  // Auth button (open dropdown or login modal)
  const openAuthBtn = byId("open-auth-btn");
  if (openAuthBtn) {
    openAuthBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (appState.currentUser) {
        toggleProfileDropdown();
      } else {
        openAuthModal("login");
      }
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    const dropdown = byId("profile-dropdown");
    const btn = byId("open-auth-btn");
    if (dropdown?.classList.contains("active") && !dropdown.contains(e.target) && e.target !== btn) {
      toggleProfileDropdown(false);
    }
  });

  // Logout
  const logoutBtn = byId("logout-btn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

  // My Bookings in dropdown
  const myBookingsBtn = byId("my-bookings-btn");
  if (myBookingsBtn) {
    myBookingsBtn.addEventListener("click", () => { toggleProfileDropdown(false); openBookingsModal(); });
  }

  // My Favorites in dropdown
  const myFavoritesBtn = byId("my-favorites-btn");
  if (myFavoritesBtn) {
    myFavoritesBtn.addEventListener("click", () => { toggleProfileDropdown(false); openFavoritesModal(); });
  }
}

function bindAuthForms() {
  // Login form
  const loginForm = byId("login-form");
  if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

  // Register form
  const registerForm = byId("register-form");
  if (registerForm) registerForm.addEventListener("submit", handleRegisterSubmit);

  // Forgot form
  const forgotForm = byId("forgot-form");
  if (forgotForm) forgotForm.addEventListener("submit", handleForgotSubmit);

  // Form switch links
  qsa("[data-auth-switch]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm(el.getAttribute("data-auth-switch") || "login");
    });
  });

  // Close auth modal
  const closeAuthBtn = byId("close-auth-btn");
  if (closeAuthBtn) closeAuthBtn.addEventListener("click", closeAuthModal);

  // Close on backdrop click
  const authModal = byId("auth-modal");
  if (authModal) {
    authModal.addEventListener("click", (e) => {
      if (e.target === authModal) closeAuthModal();
    });
  }

  // Google sign in
  const googleBtns = qsa("[data-google-signin]");
  googleBtns.forEach(btn => btn.addEventListener("click", signInWithGoogle));

  // Password visibility toggle
  qsa(".pass-toggle-btn").forEach(btn => {
    btn.addEventListener("click", () => togglePasswordVisibility(btn));
  });

  // Password strength
  const regPassword = byId("reg-password");
  if (regPassword) regPassword.addEventListener("input", updatePasswordStrengthUI);
}

function bindPropertyButtons() {
  // Prev / Next slider
  const prevBtn = byId("slider-prev");
  const nextBtn = byId("slider-next");
  if (prevBtn) prevBtn.addEventListener("click", prevSlide);
  if (nextBtn) nextBtn.addEventListener("click", nextSlide);

  // Lightbox
  const lightbox = byId("lightbox");
  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }
  const closeLightboxBtn = byId("close-lightbox");
  if (closeLightboxBtn) closeLightboxBtn.addEventListener("click", closeLightbox);
  const lightboxPrev = byId("lightbox-prev");
  const lightboxNext = byId("lightbox-next");
  if (lightboxPrev) lightboxPrev.addEventListener("click", prevLightboxImage);
  if (lightboxNext) lightboxNext.addEventListener("click", nextLightboxImage);
  const lightboxImg = byId("lightbox-img");
  if (lightboxImg) lightboxImg.addEventListener("click", toggleLightboxZoom);

  // Favorite
  const favBtn = byId("fav-btn");
  if (favBtn) favBtn.addEventListener("click", toggleFavorite);

  // Share
  const shareBtn = byId("share-btn");
  if (shareBtn) shareBtn.addEventListener("click", shareProperty);

  // Book now
  const bookNowBtn = byId("book-now-btn");
  if (bookNowBtn) bookNowBtn.addEventListener("click", () => { window.location.href = buildBookingUrl(); });

  // Contact / Chat buttons
  const chatBtns = qsa("[data-open-chat], #contact-host-btn, #host-chat-btn, #booking-chat-btn");
  chatBtns.forEach(btn => btn.addEventListener("click", openChatModal));
}

function bindChatModal() {
  // Close
  const closeBtn = byId("close-chat-btn") || byId("close-chat-modal");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModalEl(byId("chat-modal")));

  // Backdrop
  const modal = byId("chat-modal");
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModalEl(modal); });

  // Send button
  const sendBtn = byId("send-chat-btn");
  if (sendBtn) sendBtn.addEventListener("click", sendChatMessage);

  // Enter key in input
  const chatInput = byId("chat-input");
  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
    });
    chatInput.addEventListener("input", () => {
      const sendBtnEl = byId("send-chat-btn");
      if (sendBtnEl) sendBtnEl.disabled = !cleanText(chatInput.value);
    });
  }
}

function bindBookingsModal() {
  const closeBtn = byId("close-bookings-btn") || byId("close-bookings-modal");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModalEl(byId("bookings-modal")));
  const modal = byId("bookings-modal");
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModalEl(modal); });
}

function bindFavoritesModal() {
  const closeBtn = byId("close-favorites-btn") || byId("close-favorites-modal");
  if (closeBtn) closeBtn.addEventListener("click", () => closeModalEl(byId("favorites-modal")));
  const modal = byId("favorites-modal");
  if (modal) modal.addEventListener("click", (e) => { if (e.target === modal) closeModalEl(modal); });
}

function bindKeyboard() {
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllOverlays();
    const lightbox = byId("lightbox");
    if (lightbox?.classList.contains("active")) {
      if (e.key === "ArrowRight") isArabic() ? prevLightboxImage() : nextLightboxImage();
      if (e.key === "ArrowLeft") isArabic() ? nextLightboxImage() : prevLightboxImage();
    }
  });
}

function bindSwipeGestures() {
  const sliderEl = byId("slider-track")?.parentElement || byId("prop-slider");
  if (!sliderEl) return;
  let startX = 0, startY = 0;
  sliderEl.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  sliderEl.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      const isRtl = document.documentElement.dir === "rtl";
      if (dx < 0) isRtl ? prevSlide() : nextSlide();
      else isRtl ? nextSlide() : prevSlide();
    }
  }, { passive: true });
}

/* ========================= Init ========================= */
function init() {
  initFirebase();
  applyTheme();
  applyLanguage();
  bindNavButtons();
  bindAuthForms();
  bindPropertyButtons();
  bindChatModal();
  bindBookingsModal();
  bindFavoritesModal();
  bindKeyboard();
  bindSwipeGestures();
  loadFavorites();
  bindAuthState();
  loadPropertyData();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

/* ========================= Global exports ========================= */
window.OreBooking = {
  openAuthModal, closeAuthModal, openBookingsModal, openFavoritesModal,
  openChatModal, toggleFavorite, shareProperty, toggleTheme, toggleLanguage,
  nextSlide, prevSlide, goToSlide, openLightbox, closeLightbox,
  signInWithGoogle, logoutUser, showToast
};
