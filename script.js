"use strict";

/* =========================
   OreBooking - script.js
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
  theme: getStoredTheme()
};

/* =========================
   Safe storage
   ========================= */
function safeGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key);
    return v ?? fallback;
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
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

function safeJsonSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function getStoredLang() {
  return safeGet("ore_lang") || safeGet("orelang") || "en";
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

/* =========================
   DOM helpers
   ========================= */
function byId(id) {
  return document.getElementById(id);
}

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function uniqueId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function isArabic() {
  return appState.lang === "ar";
}

function t(ar, en) {
  return isArabic() ? ar : en;
}

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
  const currency = isArabic() ? "د.ج" : "DZD";
  return `${amount.toLocaleString(locale)} ${currency}`;
}

function formatDateTime(value) {
  if (!value) return t("غير محدد", "Not set");
  let date = null;

  if (value?.toDate && typeof value.toDate === "function") {
    date = value.toDate();
  } else {
    date = new Date(value);
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return t("غير محدد", "Not set");
  }

  return date.toLocaleString(isArabic() ? "ar-DZ" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function timestampToMillis(value) {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (value?.toDate && typeof value.toDate === "function") {
    return value.toDate().getTime();
  }
  if (typeof value.seconds === "number") {
    return value.seconds * 1000;
  }
  return 0;
}

/* =========================
   i18n
   ========================= */
const pageI18n = {
  ar: {
    pts: "نقطة",
    mybookings: "حجوزاتي",
    myfavorites: "مفضلتي",
    supportchat: "دردشة الدعم",
    logout: "تسجيل الخروج",
    backhome: "العودة للرئيسية",
    aboutprop: "حول هذا المكان",
    whatoffers: "ماذا يوفّر هذا المكان",
    booknow: "احجز الآن",
    wontcharged: "لن يتم خصم أي مبلغ الآن",
    welcomeback: "مرحبًا بعودتك",
    logindesc: "أدخل بياناتك للوصول إلى حسابك.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    rememberme: "تذكرني",
    forgotpass: "نسيت كلمة المرور؟",
    signin: "تسجيل الدخول",
    noaccount: "ليس لديك حساب؟",
    signup: "إنشاء حساب",
    createaccount: "إنشاء حساب",
    registerdesc: "انضم إلى OreBooking لفتح المزايا الكاملة.",
    fullname: "الاسم الكامل",
    signupbtn: "إنشاء الحساب",
    hasaccount: "لديك حساب بالفعل؟",
    resetpasstitle: "استعادة كلمة المرور",
    resetpassdesc: "أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة.",
    sendlink: "إرسال رابط الاستعادة",
    backtologin: "العودة لتسجيل الدخول"
  },
  en: {
    pts: "Pts",
    mybookings: "My Bookings",
    myfavorites: "My Favorites",
    supportchat: "Support Chat",
    logout: "Log Out",
    backhome: "Back to Home",
    aboutprop: "About this space",
    whatoffers: "What this place offers",
    booknow: "Reserve Now",
    wontcharged: "You won't be charged yet",
    welcomeback: "Welcome back",
    logindesc: "Enter your details to access your account.",
    email: "Email Address",
    password: "Password",
    rememberme: "Remember me",
    forgotpass: "Forgot password?",
    signin: "Sign In",
    noaccount: "Don't have an account?",
    signup: "Sign up",
    createaccount: "Create an account",
    registerdesc: "Join OreBooking to unlock premium features.",
    fullname: "Full Name",
    signupbtn: "Create Account",
    hasaccount: "Already have an account?",
    resetpasstitle: "Reset Password",
    resetpassdesc: "Enter your email and we'll send you a reset link.",
    sendlink: "Send Reset Link",
    backtologin: "Back to login"
  }
};

function applyTranslations() {
  const dict = pageI18n[appState.lang] || pageI18n.en;

  qsa("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
      el.textContent = dict[key];
    }
  });

  qsa("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && Object.prototype.hasOwnProperty.call(dict, key)) {
      el.setAttribute("placeholder", dict[key]);
    }
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

  setText(
    "booking-info-text",
    t(
      "اختر التواريخ وعدد الضيوف في الخطوة التالية لرؤية السعر النهائي وتفاصيل الحجز.",
      "Choose your dates and number of guests on the next page to see the final price and booking details."
    )
  );

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
  setText("highlight-1-desc", t("قريب من النقاط المهمة وسهل الوصول.", "Close to main points of interest and easy to reach."));
  setText("highlight-2-title", t("نظافة وراحة", "Clean and comfortable"));
  setText("highlight-2-desc", t("مجهز لإقامة سلسة ومريحة.", "Prepared for a smooth and pleasant stay."));
  setText("highlight-3-title", t("دعم سريع", "Responsive support"));
  setText("highlight-3-desc", t("تواصل سريع قبل الإقامة وأثناءها.", "Fast communication before and during your stay."));
  setText("highlight-4-title", t("إعلان موثوق", "Trusted listing"));
  setText("highlight-4-desc", t("بيانات موثقة وتجربة حجز مستقرة.", "Managed with verified details and a consistent booking flow."));

  setText("tip-1", t(
    "سيتم استكمال تفاصيل الحجز النهائية وبيانات الضيوف في الخطوة التالية.",
    "Booking details and final guest information are completed on the next step."
  ));
  setText("tip-2", t(
    "قد يختلف السعر النهائي حسب التواريخ وعدد الضيوف والخيارات المختارة.",
    "Final pricing may depend on dates, guests, and selected booking options."
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
  setText("chat-note", t(
    "تم تفعيل واجهة المحادثة مع حفظ محلي ودعم جاهز للربط مع Firestore باستخدام معرف العقار الحالي.",
    "Chat UI is active with local persistence and ready for Firestore using the current property ID."
  ));
  setText("send-chat-text", t("إرسال الرسالة", "Send Message"));
}

/* =========================
   Theme / language
   ========================= */
function applyTheme() {
  document.documentElement.classList.remove("preload-dark");
  document.body.classList.toggle("dark", appState.theme === "dark");
  document.documentElement.style.colorScheme = appState.theme === "dark" ? "dark" : "light";

  const icon = qs("#theme-toggle i");
  if (icon) {
    icon.className = appState.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
  }
}

function toggleTheme() {
  setStoredTheme(appState.theme === "dark" ? "light" : "dark");
  applyTheme();
}

function applyLanguage() {
  document.documentElement.lang = appState.lang;
  document.documentElement.dir = isArabic() ? "rtl" : "ltr";
  applyTranslations();

  if (appState.currentPropertyData) {
    renderPropertyData(appState.currentPropertyData);
  }

  if (byId("bookings-modal")?.classList.contains("active")) {
    loadAndRenderBookings();
  }

  if (byId("chat-modal")?.classList.contains("active")) {
    renderChatMessages();
  }
}

function toggleLanguage() {
  setStoredLang(isArabic() ? "en" : "ar");
  applyLanguage();
}

/* =========================
   Toasts
   ========================= */
function ensureToastContainer() {
  let host = byId("toast-container");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-container";
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

  toast.style.cssText = `
    display:flex; align-items:flex-start; gap:10px;
    background:${cfg.bg}; color:${cfg.color}; border:1px solid ${cfg.border};
    padding:14px 16px; border-radius:16px; box-shadow:0 14px 28px rgba(15,23,42,.14);
    font-weight:700; line-height:1.6; max-width:min(92vw,420px);
  `;
  toast.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.15rem; margin-top:2px;"></i><span>${escapeHtml(message)}</span>`;

  host.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

function showFavToast(message) {
  const favToast = byId("fav-toast");
  if (!favToast) {
    showToast(message, "success");
    return;
  }
  favToast.textContent = message;
  favToast.classList.add("show");
  setTimeout(() => favToast.classList.remove("show"), 2400);
}

window.showToast = showToast;
window.showFavToast = showFavToast;

/* =========================
   Modal helpers
   ========================= */
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

/* =========================
   Firebase
   ========================= */
function initFirebase() {
  try {
    if (typeof firebase === "undefined") return;
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase.firestore === "function") appState.db = firebase.firestore();
    if (typeof firebase.auth === "function") appState.auth = firebase.auth();
    if (typeof firebase.storage === "function") appState.storage = firebase.storage();

    if (appState.auth && firebase.auth?.Auth?.Persistence?.LOCAL) {
      appState.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
    }
  } catch (error) {
    console.error("Firebase init error:", error);
  }
}

/* =========================
   Auth
   ========================= */
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
  const forms = {
    login: byId("login-form"),
    register: byId("register-form"),
    forgot: byId("forgot-form")
  };

  Object.entries(forms).forEach(([key, form]) => {
    if (!form) return;
    form.classList.toggle("active", key === formName);
  });

  clearAuthMessage();
}

function openAuthModal(formName = "login") {
  switchAuthForm(formName);
  openModalEl(byId("auth-modal"));
}

function closeAuthModal() {
  closeModalEl(byId("auth-modal"));
}

window.openModal = openAuthModal;

function setButtonLoading(button, loading, text = null) {
  if (!button) return;
  if (loading) {
    button.disabled = true;
    if (!button.dataset.originalHtml) {
      button.dataset.originalHtml = button.innerHTML;
    }
    button.innerHTML = `<i class="ph ph-spinner-gap ph-spin"></i><span>${escapeHtml(text || t("جارٍ المعالجة...", "Processing..."))}</span>`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
    }
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

  if (mode === "forgot") {
    return t("تعذر إرسال رابط الاستعادة.", "Failed to send reset link.");
  }

  if (mode === "register") {
    return t("تعذر إنشاء الحساب.", "Failed to create account.");
  }

  if (mode === "google") {
    return t("تعذر تسجيل الدخول عبر Google.", "Failed to sign in with Google.");
  }

  return t("حدث خطأ غير متوقع.", "An unexpected error occurred.");
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  clearAuthMessage();

  if (!appState.auth) {
    showAuthMessage(t("خدمة تسجيل الدخول غير متاحة الآن.", "Authentication service is unavailable."));
    return;
  }

  const email = cleanText(byId("login-email")?.value);
  const password = cleanText(byId("login-password")?.value);
  const submitBtn = byId("login-submit-btn");

  if (!email || !password) {
    showAuthMessage(t("يرجى إدخال البريد وكلمة المرور.", "Please enter your email and password."));
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    await appState.auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
    showToast(t("تم تسجيل الدخول بنجاح.", "Signed in successfully."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "login"), "error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleRegisterSubmit(event) {
  event.preventDefault();
  clearAuthMessage();

  if (!appState.auth) {
    showAuthMessage(t("خدمة إنشاء الحساب غير متاحة الآن.", "Registration service is unavailable."));
    return;
  }

  const name = cleanText(byId("reg-name")?.value);
  const email = cleanText(byId("reg-email")?.value);
  const password = cleanText(byId("reg-password")?.value);
  const submitBtn = byId("register-submit-btn");

  if (!name || !email || !password) {
    showAuthMessage(t("يرجى تعبئة جميع الحقول.", "Please complete all fields."));
    return;
  }

  if (password.length < 6) {
    showAuthMessage(t("يجب أن تكون كلمة المرور 6 أحرف على الأقل.", "Password must be at least 6 characters."));
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    const cred = await appState.auth.createUserWithEmailAndPassword(email, password);

    if (cred.user && typeof cred.user.updateProfile === "function") {
      await cred.user.updateProfile({ displayName: name }).catch(() => {});
    }

    if (appState.db && cred.user?.uid) {
      await appState.db.collection("users").doc(cred.user.uid).set({
        uid: cred.user.uid,
        name,
        email,
        points: 0,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }, { merge: true }).catch(() => {});
    }

    closeAuthModal();
    showToast(t("تم إنشاء الحساب بنجاح.", "Account created successfully."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "register"), "error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleForgotSubmit(event) {
  event.preventDefault();
  clearAuthMessage();

  if (!appState.auth) {
    showAuthMessage(t("خدمة الاستعادة غير متاحة الآن.", "Reset service is unavailable."));
    return;
  }

  const email = cleanText(byId("forgot-email")?.value);
  const submitBtn = byId("forgot-submit-btn") || qs("#forgot-form button[type='submit']");

  if (!email) {
    showAuthMessage(t("أدخل بريدك الإلكتروني أولًا.", "Please enter your email first."));
    return;
  }

  setButtonLoading(submitBtn, true);

  try {
    await appState.auth.sendPasswordResetEmail(email);
    showAuthMessage(t("تم إرسال رابط الاستعادة بنجاح.", "Reset link sent successfully."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "forgot"), "error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function signInWithGoogle() {
  clearAuthMessage();

  if (
    !appState.auth ||
    typeof firebase === "undefined" ||
    typeof firebase.auth?.GoogleAuthProvider !== "function"
  ) {
    showAuthMessage(t("تسجيل الدخول عبر Google غير متاح الآن.", "Google sign-in is unavailable."));
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await appState.auth.signInWithPopup(provider);
    closeAuthModal();
    showToast(t("تم تسجيل الدخول عبر Google بنجاح.", "Logged in with Google successfully."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "google"), "error");
  }
}

async function logoutUser() {
  if (!appState.auth) return;

  try {
    await appState.auth.signOut();
    toggleProfileDropdown(false);
    showToast(t("تم تسجيل الخروج بنجاح.", "Logged out successfully."), "success");
  } catch (error) {
    console.error("Logout error:", error);
    showToast(t("تعذر تسجيل الخروج.", "Failed to log out."), "error");
  }
}

function toggleProfileDropdown(force = null) {
  const dropdown = byId("profile-dropdown");
  const button = byId("open-auth-btn");
  if (!dropdown || !button) return;

  const active = typeof force === "boolean" ? force : !dropdown.classList.contains("active");
  dropdown.classList.toggle("active", active);
  button.setAttribute("aria-expanded", active ? "true" : "false");
}

function getStoredUserProfile(uid) {
  return safeJsonGet(`ore_user_profile_${uid}`, {});
}

function saveStoredUserProfile(uid, data) {
  if (!uid) return;
  safeJsonSet(`ore_user_profile_${uid}`, { ...(getStoredUserProfile(uid) || {}), ...(data || {}) });
}

async function loadUserProfile(uid) {
  let profile = getStoredUserProfile(uid);

  if (appState.db && uid) {
    try {
      const doc = await appState.db.collection("users").doc(uid).get();
      if (doc.exists) {
        profile = { ...(profile || {}), ...doc.data() };
        saveStoredUserProfile(uid, profile);
      }
    } catch (_) {}
  }

  return profile || {};
}

function setUserPoints(points) {
  const el = byId("user-points");
  if (!el) return;
  el.textContent = safeNumber(points, 0).toLocaleString(isArabic() ? "ar-DZ" : "en-US");
}

async function updateAuthUI(user) {
  const openAuthBtn = byId("open-auth-btn");
  const nameEl = byId("dropdown-user-name");
  const emailEl = byId("dropdown-user-email");
  const logoutBtn = byId("logout-btn");
  const bookingsBtn = byId("my-bookings-btn");
  const favoritesBtn = byId("my-favorites-btn");

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
    if (bookingsBtn) bookingsBtn.style.display = "";
    if (favoritesBtn) favoritesBtn.style.display = "";
    setUserPoints(profile.points || 0);
  } else {
    if (nameEl) nameEl.textContent = t("مستخدم زائر", "Guest User");
    if (emailEl) emailEl.textContent = t("سجل الدخول للمتابعة", "Sign in to continue");
    if (openAuthBtn) {
      openAuthBtn.classList.add("auth-btn-guest");
      openAuthBtn.innerHTML = `<i class="ph ph-user"></i>`;
    }
    if (logoutBtn) logoutBtn.style.display = "none";
    if (bookingsBtn) bookingsBtn.style.display = "";
    if (favoritesBtn) favoritesBtn.style.display = "";
    setUserPoints(0);
  }

  updateFavButtonState();
}

function bindAuthState() {
  if (!appState.auth) {
    updateAuthUI(null);
    return;
  }

  appState.auth.onAuthStateChanged(async user => {
    appState.currentUser = user || null;
    await updateAuthUI(appState.currentUser);

    if (byId("bookings-modal")?.classList.contains("active")) {
      loadAndRenderBookings();
    }
    if (byId("chat-modal")?.classList.contains("active")) {
      renderChatMessages();
    }
  });
}

/* =========================
   Password UI
   ========================= */
function togglePasswordVisibility(button) {
  const wrapper = button.closest(".pass-wrapper");
  const input = wrapper?.querySelector("input");
  const icon = button.querySelector("i");
  if (!input) return;

  const show = input.type === "password";
  input.type = show ? "text" : "password";
  if (icon) {
    icon.className = show ? "ph ph-eye-slash" : "ph ph-eye";
  }
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
  if (!password) {
    box.style.display = "none";
    bars.forEach(bar => {
      bar.style.background = "var(--border-color)";
      bar.style.opacity = "1";
    });
    label.textContent = "";
    return;
  }

  box.style.display = "block";
  const strength = getPasswordStrength(password);
  const palette = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];

  bars.forEach((bar, idx) => {
    if (idx < strength) {
      bar.style.background = palette[Math.min(strength - 1, palette.length - 1)];
    } else {
      bar.style.background = "var(--border-color)";
    }
  });

  const texts = {
    1: t("ضعيفة", "Weak"),
    2: t("مقبولة", "Fair"),
    3: t("جيدة", "Good"),
    4: t("قوية", "Strong")
  };

  label.textContent = texts[strength] || "";
}

/* =========================
   Property helpers
   ========================= */
function pickFirst(data, keys = []) {
  for (const key of keys) {
    const value = data?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return value;
    }
  }
  return "";
}

function resolvePropertyId() {
  const params = new URLSearchParams(window.location.search);
  const id =
    params.get("id") ||
    params.get("propertyId") ||
    params.get("listingId") ||
    safeGet("selectedPropertyId") ||
    safeGet("ore_selected_property_id");

  return cleanText(id || "");
}

function getLocalizedText(data, arKeys, enKeys, fallback = "") {
  if (isArabic()) {
    return pickFirst(data, arKeys) || pickFirst(data, enKeys) || fallback;
  }
  return pickFirst(data, enKeys) || pickFirst(data, arKeys) || fallback;
}

function getTitleText(data) {
  return getLocalizedText(
    data,
    ["titleAr", "title_ar", "nameAr", "name_ar"],
    ["titleEn", "title", "title_en", "nameEn", "name"],
    t("عقار بدون اسم", "Unnamed property")
  );
}

function getLocationText(data) {
  return getLocalizedText(
    data,
    ["locationAr", "location_ar", "cityAr", "addressAr"],
    ["locationEn", "location", "location_en", "city", "address"],
    t("موقع غير معروف", "Unknown location")
  );
}

function getDescText(data) {
  return getLocalizedText(
    data,
    ["descAr", "descriptionAr", "description_ar", "summaryAr"],
    ["descEn", "desc", "descriptionEn", "description", "summary"],
    t("لا يوجد وصف متاح حاليًا.", "No description available.")
  );
}

function getPropertyTypeText(data) {
  const raw =
    getLocalizedText(data, ["typeAr"], ["typeEn", "type", "category"], "") ||
    String(data?.type || data?.category || "").toLowerCase();

  const rawStr = String(raw).toLowerCase();

  if (/villa|فيلا/.test(rawStr)) return t("فيلا", "Villa");
  if (/apartment|flat|شقة/.test(rawStr)) return t("شقة", "Apartment");
  if (/resort|منتجع/.test(rawStr)) return t("منتجع", "Resort");
  if (/hotel|فندق/.test(rawStr)) return t("فندق", "Hotel");
  if (/cabin|شاليه|كوخ/.test(rawStr)) return t("شاليه", "Cabin");

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
  const key = String(feature || "").trim().toLowerCase();
  const map = {
    wifi: "ph-wifi-high",
    "wi-fi": "ph-wifi-high",
    internet: "ph-wifi-high",
    pool: "ph-swimming-pool",
    parking: "ph-car",
    gym: "ph-barbell",
    restaurant: "ph-fork-knife",
    spa: "ph-flower-lotus",
    kitchen: "ph-cooking-pot",
    ac: "ph-snowflake",
    "air conditioning": "ph-snowflake",
    balcony: "ph-windows",
    breakfast: "ph-coffee",
    security: "ph-shield-check",
    tv: "ph-television",
    beach: "ph-island"
  };
  return map[key] || "ph-check-circle";
}

function normalizeFeatureLabel(feature) {
  const key = String(feature || "").trim().toLowerCase();
  const map = {
    wifi: t("واي فاي", "WiFi"),
    "wi-fi": t("واي فاي", "WiFi"),
    internet: t("إنترنت", "Internet"),
    pool: t("مسبح", "Pool"),
    parking: t("موقف سيارات", "Parking"),
    gym: t("قاعة رياضية", "Gym"),
    restaurant: t("مطعم", "Restaurant"),
    spa: t("سبا", "Spa"),
    kitchen: t("مطبخ", "Kitchen"),
    ac: t("تكييف", "Air conditioning"),
    "air conditioning": t("تكييف", "Air conditioning"),
    balcony: t("شرفة", "Balcony"),
    breakfast: t("إفطار", "Breakfast"),
    security: t("حماية", "Security"),
    tv: t("تلفاز", "TV"),
    beach: t("وصول للشاطئ", "Beach access")
  };
  return map[key] || String(feature || "").trim() || t("ميزة", "Feature");
}

function getFeaturesArray(data) {
  const localized = isArabic()
    ? data?.featuresAr || data?.features_ar
    : data?.featuresEn || data?.features || data?.features_en;

  const fallbackLocalized = isArabic()
    ? data?.featuresEn || data?.features || data?.features_en
    : data?.featuresAr || data?.features_ar;

  const raw = localized || fallbackLocalized || data?.amenities || [];

  if (Array.isArray(raw)) {
    return raw.map(item => cleanText(item)).filter(Boolean);
  }

  if (typeof raw === "string") {
    return raw.split(",").map(item => cleanText(item)).filter(Boolean);
  }

  return ["wifi", "parking", "ac", "kitchen"];
}

function getPropertyImages(data) {
  const candidates = [
    ...(Array.isArray(data?.images) ? data.images : []),
    ...(Array.isArray(data?.gallery) ? data.gallery : []),
    ...(Array.isArray(data?.photos) ? data.photos : []),
    cleanText(data?.imageUrl),
    cleanText(data?.mainImage),
    cleanText(data?.image)
  ].filter(Boolean);

  return [...new Set(candidates)].filter(Boolean).length
    ? [...new Set(candidates)].filter(Boolean)
    : ["images/placeholder.jpg"];
}

function buildFallbackProperty(id = "") {
  return {
    id,
    titleEn: "Selected Property",
    titleAr: "العقار المحدد",
    locationEn: "Location unavailable",
    locationAr: "الموقع غير متوفر",
    descEn: "Property details are not available right now.",
    descAr: "تفاصيل العقار غير متوفرة حاليًا.",
    typeEn: "Stay",
    typeAr: "إقامة",
    price: 0,
    rating: 4.8,
    maxGuests: 4,
    bedrooms: 2,
    images: ["images/placeholder.jpg"],
    featuresEn: ["WiFi", "Parking", "Air conditioning", "Kitchen"],
    featuresAr: ["واي فاي", "موقف سيارات", "تكييف", "مطبخ"],
    hostName: "OreBooking Host"
  };
}

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
      if (!appState.currentPropertyId) {
        appState.currentPropertyId = localId;
      }
    }
  }

  if (appState.db && appState.currentPropertyId) {
    try {
      const doc = await appState.db.collection("properties").doc(String(appState.currentPropertyId)).get();
      if (doc.exists) {
        propertyData = { id: doc.id, ...doc.data() };
      }
    } catch (error) {
      console.error("Property load error:", error);
    }
  }

  if (!propertyData) {
    propertyData = buildFallbackProperty(appState.currentPropertyId);
  }

  renderPropertyData(propertyData);
}

function showPropertyContent() {
  const skeleton = byId("prop-skeleton");
  const realContent = byId("prop-real-content");
  if (skeleton) skeleton.style.display = "none";
  if (realContent) realContent.style.display = "block";
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

  const bookNowLink = byId("book-now-link");
  if (bookNowLink) {
    bookNowLink.href = buildBookingUrl();
  }

  const chatPropId = byId("chat-property-id");
  if (chatPropId) chatPropId.value = appState.currentPropertyId || "";

  const mapLink = byId("map-open-link");
  const lat = Number(data?.lat ?? data?.locationLat ?? data?.latitude);
  const lng = Number(data?.lng ?? data?.locationLng ?? data?.longitude);
  if (mapLink && Number.isFinite(lat) && Number.isFinite(lng)) {
    mapLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
  }

  document.title = `${title} - OreBooking`;
  showPropertyContent();
}

/* =========================
   Gallery / lightbox
   ========================= */
function updateImageBadge(current, total) {
  setText("slider-count-badge", `${current + 1} / ${total}`);
}

function goToSlide(index, updateLightbox = true) {
  if (!appState.currentImages.length) return;

  const total = appState.currentImages.length;
  appState.currentSlide = ((index % total) + total) % total;

  const track = byId("slider-track");
  if (track) {
    const direction = document.documentElement.dir === "rtl" ? 1 : -1;
    track.style.transform = `translateX(${direction * appState.currentSlide * 100}%)`;
  }

  qsa(".slider-dot").forEach((dot, idx) => {
    dot.classList.toggle("active", idx === appState.currentSlide);
  });

  qsa(".gallery-thumb").forEach((thumb, idx) => {
    thumb.classList.toggle("active", idx === appState.currentSlide);
  });

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
    img.onerror = function () {
      this.src = "images/placeholder.jpg";
    };
    img.addEventListener("click", openLightbox);
    track.appendChild(img);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = `slider-dot ${idx === 0 ? "active" : ""}`;
    dot.setAttribute("aria-label", `Go to image ${idx + 1}`);
    dot.addEventListener("click", () => goToSlide(idx));
    dots.appendChild(dot);
  });

  goToSlide(0, false);
}

function setupThumbs(images) {
  const thumbs = byId("gallery-thumbs");
  if (!thumbs) return;

  thumbs.innerHTML = "";

  images.forEach((src, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `gallery-thumb ${idx === 0 ? "active" : ""}`;
    btn.setAttribute("aria-label", `Thumbnail ${idx + 1}`);
    btn.innerHTML = `<img src="${escapeHtml(src)}" alt="Thumbnail ${idx + 1}" loading="lazy">`;
    btn.querySelector("img").onerror = function () {
      this.src = "images/placeholder.jpg";
    };
    btn.addEventListener("click", () => goToSlide(idx));
    thumbs.appendChild(btn);
  });
}

function nextSlide(e) {
  if (e) e.stopPropagation();
  goToSlide(appState.currentSlide + 1);
}

function prevSlide(e) {
  if (e) e.stopPropagation();
  goToSlide(appState.currentSlide - 1);
}

function openLightbox() {
  if (!appState.currentImages.length) return;
  const lightbox = byId("lightbox");
  const img = byId("lightbox-img");
  if (!lightbox || !img) return;

  img.src = appState.currentImages[appState.currentSlide];
  img.classList.remove("zoomed");
  openModalEl(lightbox);
}

function closeLightbox() {
  closeModalEl(byId("lightbox"));
}

function toggleZoom(event) {
  event.stopPropagation();
  event.currentTarget.classList.toggle("zoomed");
}

/* =========================
   Map
   ========================= */
function setupMap(data, locationName) {
  const mapEl = byId("property-map");
  const mapLink = byId("map-open-link");
  if (!mapEl) return;

  const parent = mapEl.parentNode;
  const existingNotice = parent?.querySelector(".map-no-location");
  if (existingNotice) existingNotice.remove();

  const lat = Number(data?.lat ?? data?.locationLat ?? data?.latitude);
  const lng = Number(data?.lng ?? data?.locationLng ?? data?.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    mapEl.style.display = "none";
    if (mapLink) mapLink.style.display = "none";

    const note = document.createElement("div");
    note.className = "map-no-location";
    note.innerHTML = `<i class="ph ph-map-pin-slash"></i><p>${escapeHtml(t("لا توجد إحداثيات متاحة لهذا العقار حاليًا.", "No map coordinates are available for this property yet."))}</p>`;
    parent?.insertBefore(note, mapEl.nextSibling);
    return;
  }

  mapEl.style.display = "";
  if (mapLink) {
    mapLink.style.display = "inline-flex";
    mapLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
  }

  if (typeof L === "undefined") {
    mapEl.innerHTML = `<div class="map-no-location"><i class="ph ph-map-trifold"></i><p>${escapeHtml(t("تعذر تحميل الخريطة الآن.", "Map could not be loaded right now."))}</p></div>`;
    return;
  }

  if (appState.propertyMap) {
    appState.propertyMap.remove();
    appState.propertyMap = null;
  }

  appState.propertyMap = L.map(mapEl, {
    center: [lat, lng],
    zoom: 15,
    scrollWheelZoom: false,
    zoomControl: true
  });

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19
  }).addTo(appState.propertyMap);

  const icon = L.divIcon({
    className: "",
    html: `
      <div style="
        width:38px;height:38px;background:#435abf;border:3px solid white;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        box-shadow:0 4px 14px rgba(0,0,0,0.28);
      "></div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -42]
  });

  L.marker([lat, lng], { icon })
    .addTo(appState.propertyMap)
    .bindPopup(`<strong>${escapeHtml(locationName || t("موقع العقار", "Property Location"))}</strong>`)
    .openPopup();

  setTimeout(() => {
    appState.propertyMap?.invalidateSize();
  }, 250);
}

/* =========================
   Share / booking
   ========================= */
function buildBookingUrl() {
  const id = encodeURIComponent(appState.currentPropertyId || "");
  return `booking.html?id=${id}`;
}

function startBooking() {
  if (appState.currentPropertyId) {
    safeSet("selectedPropertyId", appState.currentPropertyId);
    safeSet("ore_selected_property_id", appState.currentPropertyId);
  }
  window.location.href = buildBookingUrl();
}

window.startBooking = startBooking;

function handleShare() {
  const title = byId("prop-title")?.textContent || "OreBooking Property";
  const url = window.location.href;

  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
    return;
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => showToast(t("تم نسخ الرابط.", "Link copied to clipboard."), "success"))
      .catch(() => showToast(t("تعذر نسخ الرابط.", "Could not copy link."), "error"));
    return;
  }

  showToast(url, "info");
}

/* =========================
   Favorites
   ========================= */
function getFavoritesKeyCandidates(uid) {
  return [
    `ore_favorites_${uid}`,
    `orefavs_${uid}`,
    `orefavs${uid}`
  ];
}

function getUserFavorites() {
  const uid = appState.currentUser?.uid;
  if (!uid) return [];

  const keys = getFavoritesKeyCandidates(uid);
  for (const key of keys) {
    const data = safeJsonGet(key, null);
    if (Array.isArray(data)) {
      return [...new Set(data.map(item => String(item)))];
    }
  }
  return [];
}

function setUserFavorites(list) {
  const uid = appState.currentUser?.uid;
  if (!uid) return;

  const finalList = [...new Set((list || []).map(item => String(item)))];
  getFavoritesKeyCandidates(uid).forEach(key => safeJsonSet(key, finalList));

  if (appState.db) {
    appState.db.collection("users").doc(uid).set({
      favoritePropertyIds: finalList,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});
  }
}

function updateFavButtonState() {
  const btn = byId("property-fav-btn");
  if (!btn || !appState.currentPropertyId) return;

  const isFav = appState.currentUser
    ? getUserFavorites().includes(String(appState.currentPropertyId))
    : false;

  btn.classList.toggle("active", isFav);
  btn.innerHTML = isFav
    ? `<i class="ph-fill ph-heart"></i><span>${escapeHtml(t("محفوظ", "Saved"))}</span>`
    : `<i class="ph ph-heart"></i><span>${escapeHtml(t("حفظ", "Save"))}</span>`;
}

function togglePropertyFavorite() {
  if (!appState.currentPropertyId) return;

  if (!appState.currentUser) {
    openAuthModal("login");
    showToast(t("سجّل الدخول أولًا لحفظ المفضلة.", "Sign in first to save favorites."), "error");
    return;
  }

  const id = String(appState.currentPropertyId);
  const current = getUserFavorites();
  const exists = current.includes(id);
  const next = exists ? current.filter(item => item !== id) : [...current, id];

  setUserFavorites(next);
  updateFavButtonState();

  showFavToast(exists
    ? t("تمت إزالة العقار من المفضلة.", "Property removed from favorites.")
    : t("تم حفظ العقار في المفضلة.", "Property saved to favorites.")
  );
}

function goToFavorites() {
  if (!appState.currentUser) {
    openAuthModal("login");
    return;
  }

  safeSet("ore_open_favorites", "1");
  window.location.href = "index.html?view=favorites";
}

/* =========================
   Bookings modal
   ========================= */
function getLocalBookings() {
  const sources = [
    safeJsonGet("ore_bookings_local_v1", []),
    safeJsonGet("orebookingslocalv1", []),
    safeJsonGet("ore_bookings_local", [])
  ];

  const all = sources.flat().filter(Boolean);
  const uid = appState.currentUser?.uid;
  const email = cleanText(appState.currentUser?.email || "").toLowerCase();

  return all.filter(item => {
    const itemUid = cleanText(item?.userId || item?.uid);
    const itemEmail = cleanText(item?.guestEmail || item?.email).toLowerCase();
    return (uid && itemUid === uid) || (email && itemEmail === email);
  });
}

async function getRemoteBookings() {
  if (!appState.db || !appState.currentUser?.uid) return [];

  try {
    let snapshot;
    try {
      snapshot = await appState.db
        .collection("bookings")
        .where("userId", "==", appState.currentUser.uid)
        .orderBy("createdAt", "desc")
        .get();
    } catch (_) {
      snapshot = await appState.db
        .collection("bookings")
        .where("userId", "==", appState.currentUser.uid)
        .get();
    }

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Bookings load error:", error);
    return [];
  }
}

function normalizeBooking(item, idx = 0) {
  const propertyId = cleanText(item?.propertyId || item?.listingId || item?.idProperty || "");
  const propertyTitle = cleanText(
    item?.propertyTitle ||
    item?.title ||
    item?.propertyName ||
    item?.listingTitle ||
    t("العقار", "Property")
  );

  const propertyLocation = cleanText(
    item?.propertyLocation ||
    item?.location ||
    item?.city ||
    ""
  );

  const checkIn = cleanText(item?.checkIn || item?.arrivalDate || item?.startDate || "");
  const checkOut = cleanText(item?.checkOut || item?.departureDate || item?.endDate || "");
  const guests = safeNumber(item?.guestCount || item?.guests || item?.adults, 1);
  const total = safeNumber(item?.total || item?.finalTotal || item?.amount || 0);
  const status = cleanText(item?.status || t("قيد المراجعة", "Pending review"));
  const createdAt = item?.createdAt || item?.timestamp || item?.date || Date.now();

  return {
    id: cleanText(item?.id || item?.bookingReference || item?.reference || `local_${idx}_${uniqueId()}`),
    propertyId,
    propertyTitle,
    propertyLocation,
    checkIn,
    checkOut,
    guests,
    total,
    status,
    createdAt
  };
}

function renderBookings(list) {
  const container = byId("bookings-list");
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div class="chat-empty-state">
        <i class="ph ph-calendar-check"></i>
        <p>${escapeHtml(t("لا توجد حجوزات محفوظة لهذا الحساب بعد.", "No bookings were found for this account yet."))}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = list.map(item => {
    const statusText = escapeHtml(item.status);
    const propertyTitle = escapeHtml(item.propertyTitle);
    const propertyLocation = escapeHtml(item.propertyLocation || t("الموقع غير محدد", "Location not specified"));
    const checkIn = escapeHtml(item.checkIn || t("غير محدد", "Not set"));
    const checkOut = escapeHtml(item.checkOut || t("غير محدد", "Not set"));
    const guests = escapeHtml(String(item.guests || 1));
    const total = escapeHtml(formatCurrency(item.total || 0));
    const propertyLink = item.propertyId
      ? `?id=${encodeURIComponent(item.propertyId)}`
      : "#";

    return `
      <div style="border:1px solid var(--border-color); border-radius:18px; padding:18px; background:var(--surface-color); margin-bottom:14px;">
        <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
          <div>
            <h4 style="font-size:1.02rem; margin-bottom:6px;">${propertyTitle}</h4>
            <p style="color:var(--text-muted); font-size:.92rem;">${propertyLocation}</p>
          </div>
          <span style="display:inline-flex; align-items:center; padding:8px 12px; border-radius:999px; background:rgba(67,90,191,.1); color:var(--primary); font-weight:800; font-size:.84rem;">
            ${statusText}
          </span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:10px; margin-bottom:14px;">
          <div style="background:var(--bg-color); border-radius:12px; padding:12px;">
            <strong style="display:block; margin-bottom:4px;">${escapeHtml(t("الدخول", "Check-in"))}</strong>
            <span>${checkIn}</span>
          </div>
          <div style="background:var(--bg-color); border-radius:12px; padding:12px;">
            <strong style="display:block; margin-bottom:4px;">${escapeHtml(t("الخروج", "Check-out"))}</strong>
            <span>${checkOut}</span>
          </div>
          <div style="background:var(--bg-color); border-radius:12px; padding:12px;">
            <strong style="display:block; margin-bottom:4px;">${escapeHtml(t("الضيوف", "Guests"))}</strong>
            <span>${guests}</span>
          </div>
          <div style="background:var(--bg-color); border-radius:12px; padding:12px;">
            <strong style="display:block; margin-bottom:4px;">${escapeHtml(t("الإجمالي", "Total"))}</strong>
            <span>${total}</span>
          </div>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <a href="${propertyLink}" class="secondary-action-btn" style="text-decoration:none;">
            <i class="ph ph-house-line"></i>
            <span>${escapeHtml(t("عرض العقار", "View property"))}</span>
          </a>
          <a href="${buildBookingUrl()}" class="primary-btn" style="text-decoration:none;">
            <i class="ph ph-calendar-check"></i>
            <span>${escapeHtml(t("متابعة الحجز", "Continue booking"))}</span>
          </a>
        </div>
      </div>
    `;
  }).join("");
}

async function loadAndRenderBookings() {
  const container = byId("bookings-list");
  if (!container) return;

  if (!appState.currentUser) {
    container.innerHTML = `
      <div class="chat-empty-state">
        <i class="ph ph-user-circle"></i>
        <p>${escapeHtml(t("يجب تسجيل الدخول لرؤية الحجوزات.", "Please sign in to view your bookings."))}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted);">${escapeHtml(t("جارٍ تحميل الحجوزات...", "Loading bookings..."))}</div>`;

  const local = getLocalBookings().map((item, idx) => normalizeBooking(item, idx));
  const remote = (await getRemoteBookings()).map((item, idx) => normalizeBooking(item, idx + 1000));

  const mergedMap = new Map();
  [...remote, ...local].forEach(item => {
    const key = item.id || `${item.propertyId}_${item.checkIn}_${item.checkOut}`;
