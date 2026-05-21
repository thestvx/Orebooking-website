// =========================================
// booking.js — OreBooking v16.1
// Simplified booking flow + auth + payment
// =========================================

"use strict";

// ──────────────────────────────────────────
// Safe Storage
// ──────────────────────────────────────────
function safeGet(key, fallback = null) {
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

// ──────────────────────────────────────────
// Firebase
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
let storage = null;

try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase.firestore === "function") db = firebase.firestore();
    if (typeof firebase.auth === "function") auth = firebase.auth();
    if (typeof firebase.storage === "function") storage = firebase.storage();
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function normalizeLang(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "ar" || raw === "arabic" || raw === "rtl") return "ar";
  if (raw === "en" || raw === "english" || raw === "ltr") return "en";
  return "ar";
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function escapeHtml(str = "") {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(email));
}

function validatePhone(phone) {
  const cleaned = cleanText(phone).replace(/[^\d+]/g, "");
  return cleaned.length >= 8;
}

function parseDateParts(dateStr) {
  const value = cleanText(dateStr);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!year || !month || !day) return null;
  return { year, month, day };
}

function parseDate(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return null;

  const d = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function todayInputValue() {
  return formatDateInput(new Date());
}

function addDays(dateStr, days) {
  const d = parseDate(dateStr);
  if (!d) return "";
  d.setDate(d.getDate() + days);
  return formatDateInput(d);
}

function getDiffNights(checkIn, checkOut) {
  const inDate = parseDate(checkIn);
  const outDate = parseDate(checkOut);
  if (!inDate || !outDate) return 0;
  const diff = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function parsePositiveInt(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.floor(num) : fallback;
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function setValueIfEmpty(el, value) {
  if (el && !cleanText(el.value) && cleanText(value)) {
    el.value = value;
  }
}

function safeCall(fn, label = "Unknown task") {
  try {
    return fn();
  } catch (error) {
    console.error(`${label} failed:`, error);
    return null;
  }
}

// ──────────────────────────────────────────
// State
// ──────────────────────────────────────────
let currentUser = null;

const BOOKING_DRAFT_KEY = "ore_booking_draft_v5";
const LOCAL_BOOKINGS_KEY = "ore_bookings_local_v1";

const bookingState = {
  initialized: false,
  currentStep: 1,
  lang: normalizeLang(safeGet("ore_lang", "ar")),
  theme: safeGet("ore_theme", "light") || "light",

  propertyId: null,
  property: null,

  checkIn: "",
  checkOut: "",
  guestCount: 1,
  nights: 0,

  paymentMethod: "Bank Transfer",
  paymentValue: "ccp",
  paymentProofUrl: null,
  paymentProofName: "",
  paymentProofUploading: false,

  rewardPoints: 0,
  bookingReference: ""
};

function t(en, ar) {
  return bookingState.lang === "ar" ? ar : en;
}

function formatDateDisplay(dateStr) {
  const parts = parseDateParts(dateStr);
  if (!parts) return t("Not selected", "غير محدد");

  const monthsAr = [
    "جانفي", "فيفري", "مارس", "أفريل", "ماي", "جوان",
    "جويلية", "أوت", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
  ];

  const monthsEn = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const day = String(parts.day).padStart(2, "0");
  const monthName = bookingState.lang === "ar"
    ? monthsAr[parts.month - 1]
    : monthsEn[parts.month - 1];

  return `${day} ${monthName} ${parts.year}`;
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return bookingState.lang === "ar"
    ? `${amount.toLocaleString("ar-DZ")} د.ج`
    : `${amount.toLocaleString("en-US")} DZD`;
}

// ──────────────────────────────────────────
// DOM Helpers
// ──────────────────────────────────────────
function getById(...ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

// ──────────────────────────────────────────
// DOM
// ──────────────────────────────────────────
const els = {
  html: document.documentElement,
  body: document.body,

  langToggle: getById("lang-toggle"),
  themeToggle: getById("theme-toggle"),

  openAuthBtn: getById("open-auth-btn"),
  closeAuthBtn: getById("close-auth-btn"),
  authModal: getById("auth-modal"),
  profileDropdown: getById("profile-dropdown"),
  profileContainer: qs(".profile-container"),

  loginForm: getById("login-form"),
  registerForm: getById("register-form"),
  forgotForm: getById("forgot-form"),
  authMessage: getById("auth-message"),

  loginEmail: getById("login-email"),
  loginPassword: getById("login-password"),
  regName: getById("reg-name"),
  regEmail: getById("reg-email"),
  regPassword: getById("reg-password"),
  forgotEmail: getById("forgot-email"),

  dropdownUserName: getById("dropdown-user-name"),
  dropdownUserEmail: getById("dropdown-user-email"),
  logoutBtn: getById("logout-btn"),
  myBookingsBtn: getById("my-bookings-btn"),
  myFavoritesBtn: getById("my-favorites-btn"),
  userPoints: getById("user-points"),

  globalAlert: getById("booking-global-alert"),

  step1: getById("step-1"),
  step2: getById("step-2"),
  step3: getById("step-3"),
  connector1: getById("connector-1"),
  connector2: getById("connector-2"),
  indicators: qsa(".step-indicator"),

  btnNext1: getById("btn-next-1"),
  btnNext2: getById("btn-next-2"),
  btnPrev2: getById("btn-prev-2"),
  btnPrev3: getById("btn-prev-3"),
  btnConfirmBooking: getById("btn-confirm-booking"),

  paymentCards: qsa(".payment-method-card"),
  paymentRadios: qsa('input[name="paymentmethod"], input[name="payment-method"]'),
  bankTransferBox: getById("ccp-details", "bank-transfer-box"),
  cashBox: getById("cash-details", "cash-box"),
  cardBox: getById("card-details", "card-box"),
  paymentProof: getById("receipt-upload", "payment-proof"),
  uploadText: getById("upload-text"),

  checkInDate: getById("arrival-date", "check-in-date"),
  checkOutDate: getById("departure-date", "check-out-date"),
  adults: getById("guest-adults", "guest-count"),
  children: getById("guest-children"),

  agreePolicy: getById("agree-policy"),

  copyIbanBtn: getById("copy-rib-btn", "copy-iban-btn"),
  copyReferenceBtn: getById("copy-reference-btn"),
  bankIban: getById("bank-iban"),
  paymentReference: getById("payment-reference", "booking-reference-code"),

  propMiniImg: getById("prop-mini-img", "summary-prop-img"),
  propMiniTitle: getById("prop-mini-title", "summary-prop-title"),
  propMiniLoc: getById("prop-mini-loc", "summary-prop-location"),
  propMiniType: getById("prop-mini-type", "summary-prop-type"),

  summaryPriceNight: getById("sb-night-price", "summary-price-night"),
  summaryNights: getById("sb-nights-count", "summary-nights"),
  summaryServiceFee: getById("sb-fee-amount", "summary-service-fee"),
  summaryTaxes: getById("sb-addons-amount", "summary-taxes"),
  summaryTotal: getById("sb-final-total", "summary-total"),
  summaryCheckin: getById("summary-checkin"),
  summaryCheckout: getById("summary-checkout"),
  summaryGuests: getById("summary-guests"),

  reviewGuestName: getById("rev-name", "review-guest-name"),
  reviewGuestEmail: getById("rev-email", "review-guest-email"),
  reviewGuestPhone: getById("rev-phone", "review-guest-phone"),
  reviewNationalityGender: getById("rev-nationality-gender"),
  reviewStayDates: getById("rev-dates", "review-stay-dates"),
  reviewGuests: getById("rev-guests", "review-guests"),
  reviewPurposeArrival: getById("rev-purpose-arrival"),
  reviewDocuments: getById("rev-documents", "review-payment-proof"),
  reviewBillings: getById("rev-billings", "review-billing-name"),
  reviewRoomPreferences: getById("rev-room-preferences", "review-special-notes"),
  reviewPaymentMethod: getById("rev-payment-method"),
  reviewPoints: getById("rev-points", "review-points"),
  reviewPointsInline: getById("review-points-inline"),

  editStep1Btns: [
    getById("btn-edit-guest"),
    getById("btn-edit-details"),
    getById("btn-edit-dates")
  ].filter(Boolean),

  editStep2Btns: [
    getById("btn-edit-payment")
  ].filter(Boolean)
};

// ──────────────────────────────────────────
// Field Registry
// ──────────────────────────────────────────
const bookingFields = {
  guestName: getById("guest-name"),
  guestEmail: getById("guest-email"),
  guestPhone: getById("guest-phone"),
  guestCountry: getById("guest-country"),

  guestAdults: getById("guest-adults"),
  guestChildren: getById("guest-children"),
  stayPurpose: getById("stay-purpose"),
  arrivalDate: getById("arrival-date"),
  departureDate: getById("departure-date"),
  arrivalTime: getById("arrival-time"),
  specialRequests: getById("special-requests"),

  billingName: getById("billing-name"),
  billingNote: getById("billing-note"),

  senderName: getById("sender-name"),
  transferAmount: getById("transfer-amount"),
  transferDate: getById("transfer-date"),
  transferTime: getById("transfer-time"),

  cashPayerName: getById("cash-payer-name"),
  cashCurrency: getById("cash-currency"),
  cashPaymentNote: getById("cash-payment-note")
};

function getFieldValue(id, fallback = "") {
  return cleanText(bookingFields[id]?.value) || fallback;
}

function getSelectedText(el, fallback = "") {
  if (!el) return fallback;
  if (el.tagName === "SELECT" && el.selectedOptions?.length) {
    return cleanText(el.selectedOptions[0].textContent) || fallback;
  }
  return cleanText(el.value) || fallback;
}

function getFieldSelectedText(id, fallback = "") {
  return getSelectedText(bookingFields[id], fallback);
}

// ──────────────────────────────────────────
// UI Helpers
// ──────────────────────────────────────────
function setButtonLoading(btn, loading, text = null) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner-gap ph-spin"></i><span>${text || t("Processing...", "جارٍ المعالجة...")}</span>`;
  } else {
    btn.disabled = false;
    if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
  }
}

function showToast(message, type = "info") {
  let host = document.getElementById("booking-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "booking-toast-host";
    host.style.cssText = `
      position: fixed;
      top: 18px;
      left: 18px;
      z-index: 5000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: min(92vw,380px);
    `;
    document.body.appendChild(host);
  }

  const types = {
    success: { bg: "#ecfdf5", border: "#10b981", color: "#047857", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", border: "#ef4444", color: "#b91c1c", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8", icon: "ph-info" }
  };

  const cfg = types[type] || types.info;
  const toast = document.createElement("div");
  toast.style.cssText = `
    background: ${cfg.bg};
    border: 1px solid ${cfg.border};
    color: ${cfg.color};
    padding: 14px 16px;
    border-radius: 16px;
    box-shadow: 0 14px 28px rgba(15,23,42,.12);
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-weight: 700;
    line-height: 1.6;
  `;
  toast.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.15rem;flex-shrink:0;margin-top:2px;"></i><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function showAuthMessage(message, type = "error") {
  if (!els.authMessage) return;
  els.authMessage.className = `auth-message ${type}`;
  els.authMessage.textContent = message;
}

function clearAuthMessage() {
  if (!els.authMessage) return;
  els.authMessage.className = "auth-message";
  els.authMessage.textContent = "";
}

function showGlobalAlert(message) {
  if (!els.globalAlert) {
    alert(message);
    return;
  }
  const span = els.globalAlert.querySelector("span");
  if (span) span.textContent = message;
  els.globalAlert.classList.remove("d-none");
}

function hideGlobalAlert() {
  els.globalAlert?.classList.add("d-none");
}

function getFallbackText() {
  return t("Not provided", "غير متوفر");
}

function markInvalid(el, invalid) {
  if (!el) return;
  el.classList.toggle("invalid", !!invalid);
  el.setAttribute("aria-invalid", invalid ? "true" : "false");
}

function clearAllInvalidStates() {
  Object.values(bookingFields).forEach((el) => {
    if (!el) return;
    markInvalid(el, false);
  });
  markInvalid(els.agreePolicy, false);
}

function scrollToFirstInvalid() {
  const target = document.querySelector(".form-control.invalid, [aria-invalid='true']");
  if (target && typeof target.scrollIntoView === "function") {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    if (typeof target.focus === "function") {
      setTimeout(() => target.focus(), 150);
    }
  }
}

// ──────────────────────────────────────────
// Language / Theme / Direction
// ──────────────────────────────────────────
function updateDirection() {
  if (!els.html) return;
  els.html.lang = bookingState.lang;
  els.html.dir = bookingState.lang === "ar" ? "rtl" : "ltr";
}

function applyTheme() {
  const isDark = bookingState.theme === "dark";
  els.body?.classList.toggle("dark", isDark);
  if (els.html) els.html.style.colorScheme = isDark ? "dark" : "light";

  const icon = els.themeToggle?.querySelector("i");
  if (icon) {
    icon.className = isDark ? "ph ph-sun" : "ph ph-moon";
  }
}

function updateLangButton() {
  const span = els.langToggle?.querySelector("span");
  if (!span) return;
  span.textContent = bookingState.lang === "ar" ? "EN" : "AR";
}

function setTextPreservingIcon(el, text) {
  if (!el) return;
  const icon = Array.from(el.children).find((child) => child.tagName === "I");
  if (!icon) {
    el.textContent = text;
    return;
  }
  const clone = icon.cloneNode(true);
  el.innerHTML = "";
  el.appendChild(clone);
  el.appendChild(document.createTextNode(` ${text}`));
}

function cacheOriginalLocalizedContent() {
  document.querySelectorAll("[data-i18n], [data-i18n-placeholder], [data-i18n-option], [data-i18n-title]").forEach((el) => {
    if (el.hasAttribute("data-i18n") && !("i18nOriginalText" in el.dataset)) {
      el.dataset.i18nOriginalText = el.textContent;
    }
    if (el.hasAttribute("data-i18n-placeholder") && !("i18nOriginalPlaceholder" in el.dataset)) {
      el.dataset.i18nOriginalPlaceholder = el.getAttribute("placeholder") || "";
    }
    if (el.hasAttribute("data-i18n-option") && !("i18nOriginalOption" in el.dataset)) {
      el.dataset.i18nOriginalOption = el.textContent;
    }
    if (el.hasAttribute("data-i18n-title") && !("i18nOriginalTitle" in el.dataset)) {
      el.dataset.i18nOriginalTitle = el.getAttribute("title") || "";
    }
  });
}

function resetLocalizedContentToOriginal() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    if ("i18nOriginalText" in el.dataset) {
      setTextPreservingIcon(el, el.dataset.i18nOriginalText);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    if ("i18nOriginalPlaceholder" in el.dataset) {
      el.setAttribute("placeholder", el.dataset.i18nOriginalPlaceholder);
    }
  });

  document.querySelectorAll("[data-i18n-option]").forEach((el) => {
    if ("i18nOriginalOption" in el.dataset) {
      el.textContent = el.dataset.i18nOriginalOption;
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    if ("i18nOriginalTitle" in el.dataset) {
      el.setAttribute("title", el.dataset.i18nOriginalTitle);
    }
  });
}

function getTranslationDictionary() {
  const dict = window.bookingI18n;
  if (!dict || typeof dict !== "object") return null;
  if (bookingState.lang === "ar") return dict.ar || dict.arabic || null;
  return dict.en || dict.english || null;
}

function applyTranslations() {
  resetLocalizedContentToOriginal();

  const dict = getTranslationDictionary();
  if (!dict) return;

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key && dict[key] !== undefined) {
      setTextPreservingIcon(el, dict[key]);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && dict[key] !== undefined) {
      el.setAttribute("placeholder", dict[key]);
    }
  });

  document.querySelectorAll("[data-i18n-option]").forEach((el) => {
    const key = el.getAttribute("data-i18n-option");
    if (key && dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const key = el.getAttribute("data-i18n-title");
    if (key && dict[key] !== undefined) {
      el.setAttribute("title", dict[key]);
    }
  });
}

function refreshLocalizedUI() {
  updateDirection();
  updateLangButton();
  applyTranslations();
  updateAuthUI(currentUser);
  renderPropertySummary();
  updatePaymentCardsUI();
  updateSummary();
  updateReview();
}

// ──────────────────────────────────────────
// Auth Modal / Profile
// ──────────────────────────────────────────
function switchAuthForm(form) {
  const forms = {
    login: els.loginForm,
    register: els.registerForm,
    forgot: els.forgotForm
  };

  Object.entries(forms).forEach(([key, el]) => {
    if (!el) return;
    el.classList.toggle("active", key === form);
  });
}

function openAuthModal(form = "login") {
  switchAuthForm(form);
  clearAuthMessage();
  els.authModal?.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeAuthModal() {
  els.authModal?.classList.remove("active");
  document.body.classList.remove("modal-open");
}

function toggleProfileDropdown(force = null) {
  if (!els.profileDropdown) return;
  const active = typeof force === "boolean"
    ? force
    : !els.profileDropdown.classList.contains("active");

  els.profileDropdown.classList.toggle("active", active);
  els.openAuthBtn?.setAttribute("aria-expanded", active ? "true" : "false");
}

function updateAuthUI(user) {
  currentUser = user || null;

  const guestBasics = safeJsonGet("ore_guest_basics", {});
  const name =
    cleanText(user?.displayName) ||
    cleanText(guestBasics?.guestName) ||
    t("Guest User", "زائر");
  const email =
    cleanText(user?.email) ||
    t("Sign in to continue", "سجل الدخول للمتابعة");

  setText(els.dropdownUserName, name);
  setText(els.dropdownUserEmail, email);

  const icon = els.openAuthBtn?.querySelector("i");
  if (icon) {
    icon.className = user ? "ph ph-user-circle-check" : "ph ph-user";
  }
}

function getAuthErrorMessage(error, context = "login") {
  const code = cleanText(error?.code || "");
  const map = {
    "auth/invalid-email": t("Invalid email address.", "عنوان البريد الإلكتروني غير صالح."),
    "auth/missing-password": t("Please enter your password.", "يرجى إدخال كلمة المرور."),
    "auth/user-not-found": t("No account found with this email.", "لا يوجد حساب بهذا البريد الإلكتروني."),
    "auth/wrong-password": t("Incorrect password.", "كلمة المرور غير صحيحة."),
    "auth/invalid-credential": t("Incorrect login credentials.", "بيانات تسجيل الدخول غير صحيحة."),
    "auth/email-already-in-use": t("This email is already registered.", "هذا البريد مستخدم بالفعل."),
    "auth/weak-password": t("Password is too weak.", "كلمة المرور ضعيفة."),
    "auth/network-request-failed": t("Network error. Check your connection.", "خطأ في الشبكة. تحقق من الاتصال.")
  };

  if (map[code]) return map[code];
  if (context === "register") return t("Registration failed. Try another email.", "فشل التسجيل. جرّب بريدًا آخر.");
  if (context === "forgot") return t("Failed to send reset link.", "تعذر إرسال رابط الاستعادة.");
  return t("Login failed. Please check your credentials.", "فشل تسجيل الدخول. تحقق من البيانات.");
}

async function loginWithEmail(email, password) {
  if (!auth) {
    showAuthMessage(t("Authentication service is unavailable.", "خدمة المصادقة غير متاحة."));
    return;
  }

  try {
    clearAuthMessage();
    setButtonLoading(getById("login-submit-btn"), true, t("Signing in...", "جارٍ تسجيل الدخول..."));
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
    showToast(t("Logged in successfully.", "تم تسجيل الدخول بنجاح."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "login"), "error");
  } finally {
    setButtonLoading(getById("login-submit-btn"), false);
  }
}

async function registerWithEmail(name, email, password) {
  if (!auth) {
    showAuthMessage(t("Authentication service is unavailable.", "خدمة المصادقة غير متاحة."));
    return;
  }

  try {
    clearAuthMessage();
    setButtonLoading(getById("register-submit-btn"), true, t("Creating account...", "جارٍ إنشاء الحساب..."));
    const result = await auth.createUserWithEmailAndPassword(email, password);
    if (result?.user && name) {
      await result.user.updateProfile({ displayName: name });
    }
    closeAuthModal();
    showToast(t("Account created successfully.", "تم إنشاء الحساب بنجاح."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "register"), "error");
  } finally {
    setButtonLoading(getById("register-submit-btn"), false);
  }
}

async function sendResetEmail(email) {
  if (!auth) {
    showAuthMessage(t("Authentication service is unavailable.", "خدمة المصادقة غير متاحة."));
    return;
  }

  try {
    clearAuthMessage();
    await auth.sendPasswordResetEmail(email);
    showAuthMessage(t("Reset link sent successfully.", "تم إرسال رابط الاستعادة بنجاح."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "forgot"), "error");
  }
}

async function logoutUser() {
  try {
    if (auth) await auth.signOut();
    toggleProfileDropdown(false);
    showToast(t("Logged out successfully.", "تم تسجيل الخروج بنجاح."), "success");
  } catch (error) {
    console.error("Logout error:", error);
    showToast(t("Failed to log out.", "تعذر تسجيل الخروج."), "error");
  }
}

// ──────────────────────────────────────────
// Property / Query Context
// ──────────────────────────────────────────
function resolvePropertyId() {
  const params = new URLSearchParams(window.location.search);
  const id =
    params.get("id") ||
    params.get("propertyId") ||
    params.get("listingId") ||
    safeGet("selectedPropertyId");
  return id ? String(id).trim() : null;
}

function getQueryOrStorage(paramNames, storageKeys = [], fallback = "") {
  const params = new URLSearchParams(window.location.search);

  for (const name of paramNames) {
    const value = cleanText(params.get(name));
    if (value) return value;
  }

  for (const key of storageKeys) {
    const value = cleanText(safeGet(key, ""));
    if (value) return value;
  }

  return fallback;
}

function buildFallbackProperty(id = null) {
  return {
    id,
    title: "Selected Property",
    titleEn: "Selected Property",
    titleAr: "العقار المحدد",
    location: "Location unavailable",
    locationEn: "Location unavailable",
    locationAr: "الموقع غير متوفر",
    type: "Stay",
    typeEn: "Stay",
    typeAr: "إقامة",
    imageUrl: "images/placeholder.jpg",
    price: 0
  };
}

async function loadPropertyData() {
  bookingState.propertyId = resolvePropertyId();

  if (!bookingState.propertyId) {
    bookingState.property = buildFallbackProperty(null);
    renderPropertySummary();
    updateSummary();
    return;
  }

  safeSet("selectedPropertyId", bookingState.propertyId);

  if (!db) {
    bookingState.property = buildFallbackProperty(bookingState.propertyId);
    renderPropertySummary();
    updateSummary();
    return;
  }

  try {
    const doc = await db.collection("properties").doc(String(bookingState.propertyId)).get();
    if (!doc.exists) throw new Error("not-found");
    bookingState.property = { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error("Property load error:", error);
    bookingState.property = buildFallbackProperty(bookingState.propertyId);
  }

  renderPropertySummary();
  updateSummary();
}

function getPropertyTitle() {
  const p = bookingState.property || {};
  return bookingState.lang === "ar"
    ? (p.titleAr || p.title || p.titleEn || "العقار المحدد")
    : (p.titleEn || p.title || p.titleAr || "Selected Property");
}

function getPropertyLocation() {
  const p = bookingState.property || {};
  return bookingState.lang === "ar"
    ? (p.locationAr || p.location || p.locationEn || "الموقع غير متوفر")
    : (p.locationEn || p.location || p.locationAr || "Location unavailable");
}

function getPropertyType() {
  const p = bookingState.property || {};
  return bookingState.lang === "ar"
    ? (p.typeAr || p.type || p.typeEn || "إقامة")
    : (p.typeEn || p.type || p.typeAr || "Stay");
}

function getPropertyImage() {
  const p = bookingState.property || {};
  return p.imageUrl || p.mainImage || (Array.isArray(p.images) ? p.images[0] : "") || "images/placeholder.jpg";
}

function getPropertyPrice() {
  const p = bookingState.property || {};
  return Number(p.price || p.basePrice || p.pricePerNight || 0);
}

function renderPropertySummary() {
  if (els.propMiniImg) {
    els.propMiniImg.src = getPropertyImage();
    els.propMiniImg.alt = getPropertyTitle();
    els.propMiniImg.onerror = function () {
      this.src = "images/placeholder.jpg";
    };
  }

  setText(els.propMiniTitle, getPropertyTitle());
  setText(els.propMiniType, getPropertyType());

  if (els.propMiniLoc) {
    const icon = els.propMiniLoc.querySelector("i");
    const text = getPropertyLocation();
    if (icon) {
      els.propMiniLoc.innerHTML = `${icon.outerHTML} <span>${escapeHtml(text)}</span>`;
    } else {
      els.propMiniLoc.textContent = text;
    }
  }
}

// ──────────────────────────────────────────
// Stay / Payment State
// ──────────────────────────────────────────
function getSelectedPaymentRadio() {
  return document.querySelector('input[name="paymentmethod"]:checked, input[name="payment-method"]:checked');
}

function getSelectedPaymentValue() {
  return getSelectedPaymentRadio()?.value || "ccp";
}

function getPaymentMethodLabel(value) {
  switch (value) {
    case "cash":
      return t("Cash on Arrival", "الدفع عند الوصول");
    case "card":
      return t("Card Request", "طلب بطاقة");
    case "ccp":
    case "bank":
    case "bank-transfer":
    default:
      return t("Bank Transfer", "تحويل بنكي");
  }
}

function hydrateStayContext() {
  bookingState.checkIn = getQueryOrStorage(
    ["checkIn", "checkin", "arrival"],
    ["booking_check_in", "selectedCheckIn", "ore_booking_check_in"],
    bookingState.checkIn
  );

  bookingState.checkOut = getQueryOrStorage(
    ["checkOut", "checkout", "departure"],
    ["booking_check_out", "selectedCheckOut", "ore_booking_check_out"],
    bookingState.checkOut
  );

  const guests = getQueryOrStorage(
    ["guests", "guestCount", "adults"],
    ["booking_guests", "selectedGuests", "booking_adults"],
    ""
  );

  bookingState.guestCount = Math.max(1, parsePositiveInt(guests || 1, 1));
  bookingState.nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);

  if (bookingFields.arrivalDate && bookingState.checkIn) bookingFields.arrivalDate.value = bookingState.checkIn;
  if (bookingFields.departureDate && bookingState.checkOut) bookingFields.departureDate.value = bookingState.checkOut;
  if (bookingFields.guestAdults && !bookingFields.guestAdults.value) bookingFields.guestAdults.value = String(bookingState.guestCount);
}

function persistStayContext() {
  safeSet("booking_check_in", bookingState.checkIn || "");
  safeSet("booking_check_out", bookingState.checkOut || "");
  safeSet("booking_guests", String(bookingState.guestCount || 1));
}

function updateDateConstraints() {
  const today = todayInputValue();

  if (bookingFields.arrivalDate) {
    bookingFields.arrivalDate.min = today;
  }

  if (bookingFields.departureDate) {
    bookingFields.departureDate.min = bookingState.checkIn ? addDays(bookingState.checkIn, 1) : today;
  }

  if (bookingState.checkIn && bookingState.checkOut) {
    const nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);
    if (nights < 1) {
      bookingState.checkOut = "";
      if (bookingFields.departureDate) bookingFields.departureDate.value = "";
    }
  }
}

function generateBookingReference() {
  if (bookingState.bookingReference) return bookingState.bookingReference;
  const propPart = cleanText(bookingState.propertyId || "ORE").slice(0, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  bookingState.bookingReference = `ORE-${propPart}-${rand}`;
  return bookingState.bookingReference;
}

function updateBookingStateFromInputs() {
  bookingState.checkIn = getFieldValue("arrivalDate");
  bookingState.checkOut = getFieldValue("departureDate");

  const adults = Math.max(1, parsePositiveInt(getFieldValue("guestAdults", "1"), 1));
  const children = Math.max(0, parsePositiveInt(getFieldValue("guestChildren", "0"), 0));

  bookingState.guestCount = adults + children;
  bookingState.nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);
  bookingState.paymentValue = getSelectedPaymentValue();
  bookingState.paymentMethod = getPaymentMethodLabel(bookingState.paymentValue);
  bookingState.rewardPoints = Math.floor((getEstimatedTotal() || 0) / 100);

  updateDateConstraints();
  persistStayContext();
  saveDraft();
}

function getEstimatedSubtotal() {
  return getPropertyPrice() * bookingState.nights;
}

function getEstimatedServiceFee() {
  const subtotal = getEstimatedSubtotal();
  return subtotal > 0 ? Math.round(subtotal * 0.05) : 0;
}

function getEstimatedTaxes() {
  const subtotal = getEstimatedSubtotal();
  return subtotal > 0 ? 500 : 0;
}

function getEstimatedTotal() {
  return getEstimatedSubtotal() + getEstimatedServiceFee() + getEstimatedTaxes();
}

// ──────────────────────────────────────────
// Draft / Hydration
// ──────────────────────────────────────────
function collectFieldValues() {
  const data = {};
  Object.keys(bookingFields).forEach((key) => {
    const el = bookingFields[key];
    if (!el) return;
    if (el.type === "file") return;
    if (el.type === "checkbox") {
      data[key] = !!el.checked;
      return;
    }
    data[key] = cleanText(el.value);
  });
  return data;
}

function applyFieldValues(values = {}) {
  Object.entries(values).forEach(([key, value]) => {
    const el = bookingFields[key];
    if (!el || el.type === "file") return;

    if (el.type === "checkbox") {
      el.checked = !!value;
      return;
    }

    if (value !== undefined && value !== null && cleanText(el.value) === "") {
      el.value = value;
    }
  });
}

function persistGuestBasics() {
  safeJsonSet("ore_guest_basics", {
    guestName: getFieldValue("guestName"),
    guestEmail: getFieldValue("guestEmail"),
    guestPhone: getFieldValue("guestPhone"),
    guestCountry: getFieldValue("guestCountry"),
    billingName: getFieldValue("billingName")
  });
}

function hydrateGuestBasics() {
  const saved = safeJsonGet("ore_guest_basics", {});
  setValueIfEmpty(bookingFields.guestName, saved?.guestName);
  setValueIfEmpty(bookingFields.guestEmail, saved?.guestEmail);
  setValueIfEmpty(bookingFields.guestPhone, saved?.guestPhone);
  setValueIfEmpty(bookingFields.guestCountry, saved?.guestCountry);
  setValueIfEmpty(bookingFields.billingName, saved?.billingName);
}

function saveDraft() {
  const draft = {
    propertyId: bookingState.propertyId || "",
    paymentValue: getSelectedPaymentValue(),
    paymentProofName: bookingState.paymentProofName || "",
    paymentProofUrl: bookingState.paymentProofUrl || "",
    values: collectFieldValues(),
    savedAt: new Date().toISOString()
  };

  safeJsonSet(BOOKING_DRAFT_KEY, draft);
  persistGuestBasics();
}

function hydrateDraft() {
  const draft = safeJsonGet(BOOKING_DRAFT_KEY, null);
  if (!draft) return;
  if (draft.propertyId && bookingState.propertyId && draft.propertyId !== bookingState.propertyId) return;

  applyFieldValues(draft.values || {});

  if (draft.paymentValue) {
    const selector =
      `input[name="paymentmethod"][value="${draft.paymentValue}"],` +
      `input[name="payment-method"][value="${draft.paymentValue}"]`;
    const target = qs(selector);
    if (target) target.checked = true;
  }

  if (draft.paymentProofName) {
    bookingState.paymentProofName = draft.paymentProofName;
    bookingState.paymentProofUrl = draft.paymentProofUrl || null;
    showSelectedFile(draft.paymentProofName);
  }
}

// ──────────────────────────────────────────
// Summary / Review
// ──────────────────────────────────────────
function updateSummary() {
  updateBookingStateFromInputs();

  setText(els.summaryCheckin, formatDateDisplay(bookingState.checkIn));
  setText(els.summaryCheckout, formatDateDisplay(bookingState.checkOut));
  setText(els.summaryGuests, String(bookingState.guestCount || 1));
  setText(els.summaryNights, String(bookingState.nights || 0));

  setText(els.summaryPriceNight, formatCurrency(getPropertyPrice()));
  setText(els.summaryServiceFee, formatCurrency(getEstimatedServiceFee()));
  setText(els.summaryTaxes, formatCurrency(getEstimatedTaxes()));
  setText(els.summaryTotal, formatCurrency(getEstimatedTotal()));

  if (els.paymentReference) {
    els.paymentReference.textContent = generateBookingReference();
  }
}

function buildGuestFullName() {
  return getFieldValue("guestName") || getFallbackText();
}

function buildNationalityText() {
  return getFieldValue("guestCountry") || getFallbackText();
}

function buildPurposeArrivalText() {
  const purpose = getFieldSelectedText("stayPurpose");
  const arrivalTime = getFieldSelectedText("arrivalTime");
  const items = [purpose, arrivalTime].filter(Boolean);
  return items.join(" — ") || getFallbackText();
}

function buildGuestsText() {
  const adults = Math.max(1, parsePositiveInt(getFieldValue("guestAdults", "1"), 1));
  const children = Math.max(0, parsePositiveInt(getFieldValue("guestChildren", "0"), 0));
  const parts = [
    `${adults} ${t("adult(s)", "بالغ")}`,
    `${children} ${t("child(ren)", "طفل")}`
  ];
  return parts.join(" — ");
}

function buildBillingText() {
  const name = getFieldValue("billingName");
  const note = getFieldValue("billingNote");
  const parts = [name, note].filter(Boolean);
  return parts.join(" — ") || getFallbackText();
}

function buildDocumentsText() {
  if (bookingState.paymentValue === "cash") {
    return t("No receipt required", "لا يوجد إيصال مطلوب");
  }
  return bookingState.paymentProofName || t("No receipt uploaded", "لم يتم رفع إيصال");
}

function buildSpecialRequestsText() {
  return getFieldValue("specialRequests") || getFallbackText();
}

function updateReview() {
  updateBookingStateFromInputs();

  setText(els.reviewGuestName, buildGuestFullName());
  setText(els.reviewGuestEmail, getFieldValue("guestEmail") || getFallbackText());
  setText(els.reviewGuestPhone, getFieldValue("guestPhone") || getFallbackText());
  setText(els.reviewNationalityGender, buildNationalityText());

  setText(
    els.reviewStayDates,
    `${formatDateDisplay(bookingState.checkIn)} — ${formatDateDisplay(bookingState.checkOut)}`
  );

  setText(els.reviewGuests, buildGuestsText());
  setText(els.reviewPurposeArrival, buildPurposeArrivalText());
  setText(els.reviewDocuments, buildDocumentsText());
  setText(els.reviewBillings, buildBillingText());
  setText(els.reviewRoomPreferences, buildSpecialRequestsText());
  setText(els.reviewPaymentMethod, bookingState.paymentMethod);
  setText(els.reviewPoints, String(bookingState.rewardPoints || 0));
  setText(els.reviewPointsInline, String(bookingState.rewardPoints || 0));

  setText(els.userPoints, String(bookingState.rewardPoints || 0));
}

// ──────────────────────────────────────────
// Steps
// ──────────────────────────────────────────
function setStep(step) {
  bookingState.currentStep = Math.min(3, Math.max(1, step));

  const steps = [els.step1, els.step2, els.step3];
  steps.forEach((el, index) => {
    if (!el) return;
    el.classList.toggle("active", index + 1 === bookingState.currentStep);
  });

  els.indicators.forEach((indicator, index) => {
    const n = index + 1;
    indicator.classList.toggle("active", n === bookingState.currentStep);
    indicator.classList.toggle("completed", n < bookingState.currentStep);
  });

  els.connector1?.classList.toggle("completed", bookingState.currentStep > 1);
  els.connector2?.classList.toggle("completed", bookingState.currentStep > 2);

  hideGlobalAlert();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ──────────────────────────────────────────
// Payment UI
// ──────────────────────────────────────────
function updatePaymentCardsUI() {
  const selected = getSelectedPaymentValue();

  els.paymentCards.forEach((card) => {
    const radio = qs('input[type="radio"]', card);
    const active = radio?.value === selected;
    card.classList.toggle("selected", !!active);
  });

  els.bankTransferBox?.classList.toggle("active", selected === "ccp" || selected === "bank" || selected === "bank-transfer");
  els.cashBox?.classList.toggle("active", selected === "cash");
  if (els.cardBox) {
    els.cardBox.classList.remove("active");
    els.cardBox.style.display = "none";
  }

  bookingState.paymentValue = selected;
  bookingState.paymentMethod = getPaymentMethodLabel(selected);
}

function showSelectedFile(name) {
  if (!els.uploadText) return;
  els.uploadText.textContent = name || t("Click to upload payment receipt", "اضغط لرفع إيصال الدفع");
}

async function uploadPaymentProof(file) {
  if (!file) return null;

  bookingState.paymentProofUploading = true;

  try {
    if (!storage) {
      bookingState.paymentProofName = file.name;
      bookingState.paymentProofUrl = null;
      showSelectedFile(file.name);
      saveDraft();
      return null;
    }

    const refPath = `booking-receipts/${Date.now()}-${file.name}`;
    const ref = storage.ref().child(refPath);
    await ref.put(file);
    const url = await ref.getDownloadURL();

    bookingState.paymentProofName = file.name;
    bookingState.paymentProofUrl = url;
    showSelectedFile(file.name);
    saveDraft();

    return url;
  } catch (error) {
    console.error("Upload failed:", error);
    showToast(t("Receipt upload failed.", "فشل رفع الإيصال."), "error");
    return null;
  } finally {
    bookingState.paymentProofUploading = false;
  }
}

// ──────────────────────────────────────────
// Validation
// ──────────────────────────────────────────
function validateStep1() {
  clearAllInvalidStates();
  hideGlobalAlert();

  const requiredFields = [
    bookingFields.guestName,
    bookingFields.guestEmail,
    bookingFields.guestPhone,
    bookingFields.guestCountry,
    bookingFields.arrivalDate,
    bookingFields.departureDate,
    bookingFields.guestAdults,
    bookingFields.arrivalTime,
    bookingFields.stayPurpose
  ];

  let valid = true;

  requiredFields.forEach((el) => {
    const empty = !cleanText(el?.value);
    markInvalid(el, empty);
    if (empty) valid = false;
  });

  if (bookingFields.guestEmail && !validateEmail(bookingFields.guestEmail.value)) {
    markInvalid(bookingFields.guestEmail, true);
    valid = false;
  }

  if (bookingFields.guestPhone && !validatePhone(bookingFields.guestPhone.value)) {
    markInvalid(bookingFields.guestPhone, true);
    valid = false;
  }

  const checkIn = getFieldValue("arrivalDate");
  const checkOut = getFieldValue("departureDate");
  const nights = getDiffNights(checkIn, checkOut);

  if (!checkIn || !checkOut || nights < 1) {
    markInvalid(bookingFields.arrivalDate, !checkIn || nights < 1);
    markInvalid(bookingFields.departureDate, !checkOut || nights < 1);
    valid = false;
  }

  const adults = Math.max(1, parsePositiveInt(getFieldValue("guestAdults", "1"), 1));
  if (adults < 1) {
    markInvalid(bookingFields.guestAdults, true);
    valid = false;
  }

  if (!valid) {
    showGlobalAlert(t("Please complete all required booking details correctly.", "يرجى إكمال بيانات الحجز المطلوبة بشكل صحيح."));
    scrollToFirstInvalid();
    return false;
  }

  updateSummary();
  saveDraft();
  return true;
}

function validateStep2() {
  clearAllInvalidStates();
  hideGlobalAlert();

  let valid = true;

  if (!getFieldValue("billingName")) {
    markInvalid(bookingFields.billingName, true);
    valid = false;
  }

  const payment = getSelectedPaymentValue();

  if (payment === "ccp" || payment === "bank" || payment === "bank-transfer") {
    if (!getFieldValue("senderName")) {
      markInvalid(bookingFields.senderName, true);
      valid = false;
    }
    if (!getFieldValue("transferAmount")) {
      markInvalid(bookingFields.transferAmount, true);
      valid = false;
    }
    if (!getFieldValue("transferDate")) {
      markInvalid(bookingFields.transferDate, true);
      valid = false;
    }
  }

  if (payment === "cash") {
    if (!getFieldValue("cashPayerName")) {
      markInvalid(bookingFields.cashPayerName, true);
      valid = false;
    }
    if (!getFieldValue("cashCurrency")) {
      markInvalid(bookingFields.cashCurrency, true);
      valid = false;
    }
  }

  if (!valid) {
    showGlobalAlert(t("Please complete the required payment details.", "يرجى إكمال بيانات الدفع المطلوبة."));
    scrollToFirstInvalid();
    return false;
  }

  updateReview();
  saveDraft();
  return true;
}

function validateFinalAgreement() {
  if (!els.agreePolicy?.checked) {
    showGlobalAlert(t("Please agree to the booking terms before confirming.", "يرجى الموافقة على الشروط قبل تأكيد الحجز."));
    return false;
  }
  return true;
}

// ──────────────────────────────────────────
// Booking Submission
// ──────────────────────────────────────────
function buildBookingPayload() {
  updateBookingStateFromInputs();

  return {
    bookingReference: generateBookingReference(),
    propertyId: bookingState.propertyId || null,
    propertyTitle: getPropertyTitle(),
    propertyLocation: getPropertyLocation(),
    propertyType: getPropertyType(),
    propertyImage: getPropertyImage(),

    guest: {
      name: getFieldValue("guestName"),
      email: getFieldValue("guestEmail"),
      phone: getFieldValue("guestPhone"),
      country: getFieldValue("guestCountry")
    },

    stay: {
      checkIn: bookingState.checkIn,
      checkOut: bookingState.checkOut,
      nights: bookingState.nights,
      adults: Math.max(1, parsePositiveInt(getFieldValue("guestAdults", "1"), 1)),
      children: Math.max(0, parsePositiveInt(getFieldValue("guestChildren", "0"), 0)),
      purpose: getFieldValue("stayPurpose"),
      purposeLabel: getFieldSelectedText("stayPurpose"),
      arrivalTime: getFieldValue("arrivalTime"),
      arrivalTimeLabel: getFieldSelectedText("arrivalTime"),
      specialRequests: getFieldValue("specialRequests")
    },

    payment: {
      methodValue: bookingState.paymentValue,
      methodLabel: bookingState.paymentMethod,
      billingName: getFieldValue("billingName"),
      billingNote: getFieldValue("billingNote"),
      senderName: getFieldValue("senderName"),
      transferAmount: getFieldValue("transferAmount"),
      transferDate: getFieldValue("transferDate"),
      transferTime: getFieldValue("transferTime"),
      cashPayerName: getFieldValue("cashPayerName"),
      cashCurrency: getFieldValue("cashCurrency"),
      cashPaymentNote: getFieldValue("cashPaymentNote"),
      paymentProofName: bookingState.paymentProofName || "",
      paymentProofUrl: bookingState.paymentProofUrl || ""
    },

    pricing: {
      nightlyPrice: getPropertyPrice(),
      nights: bookingState.nights,
      subtotal: getEstimatedSubtotal(),
      serviceFee: getEstimatedServiceFee(),
      taxes: getEstimatedTaxes(),
      total: getEstimatedTotal(),
      rewardPoints: bookingState.rewardPoints
    },

    userId: currentUser?.uid || null,
    userEmail: currentUser?.email || getFieldValue("guestEmail"),
    status: "pending",
    createdAt: new Date().toISOString()
  };
}

async function saveBookingLocally(payload) {
  const existing = safeJsonGet(LOCAL_BOOKINGS_KEY, []);
  const next = Array.isArray(existing) ? existing : [];
  next.unshift(payload);
  safeJsonSet(LOCAL_BOOKINGS_KEY, next);
}

async function saveBookingToFirestore(payload) {
  if (!db) {
    await saveBookingLocally(payload);
    return { offline: true };
  }

  const data = {
    ...payload,
    createdAtServer: typeof firebase !== "undefined" && firebase.firestore?.FieldValue?.serverTimestamp
      ? firebase.firestore.FieldValue.serverTimestamp()
      : null
  };

  const ref = await db.collection("bookings").add(data);
  return { id: ref.id };
}

function fireSuccessConfetti() {
  if (typeof confetti !== "function") return;

  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });

  setTimeout(() => {
    confetti({
      particleCount: 70,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confetti({
      particleCount: 70,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
  }, 250);
}

async function confirmBooking() {
  hideGlobalAlert();

  if (!validateStep1()) {
    setStep(1);
    return;
  }

  if (!validateStep2()) {
    setStep(2);
    return;
  }

  if (!validateFinalAgreement()) {
    return;
  }

  if (bookingState.paymentProofUploading) {
    showToast(t("Please wait until the receipt upload finishes.", "يرجى الانتظار حتى يكتمل رفع الإيصال."), "info");
    return;
  }

  try {
    setButtonLoading(els.btnConfirmBooking, true, t("Confirming booking...", "جارٍ تأكيد الحجز..."));

    const payload = buildBookingPayload();
    await saveBookingToFirestore(payload);

    safeRemove(BOOKING_DRAFT_KEY);
    fireSuccessConfetti();

    showToast(
      t(
        `Booking confirmed successfully. Reference: ${payload.bookingReference}`,
        `تم إرسال الحجز بنجاح. المرجع: ${payload.bookingReference}`
      ),
      "success"
    );

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1800);
  } catch (error) {
    console.error("Booking confirmation failed:", error);
    showToast(t("Booking confirmation failed. Please try again.", "فشل تأكيد الحجز. حاول مرة أخرى."), "error");
  } finally {
    setButtonLoading(els.btnConfirmBooking, false);
  }
}

// ──────────────────────────────────────────
// Events
// ──────────────────────────────────────────
function bindGeneralEvents() {
  els.langToggle?.addEventListener("click", () => {
    bookingState.lang = bookingState.lang === "ar" ? "en" : "ar";
    safeSet("ore_lang", bookingState.lang);
    safeSet("orelang", bookingState.lang);
    refreshLocalizedUI();
  });

  els.themeToggle?.addEventListener("click", () => {
    bookingState.theme = bookingState.theme === "dark" ? "light" : "dark";
    safeSet("ore_theme", bookingState.theme);
    safeSet("oretheme", bookingState.theme);
    applyTheme();
  });

  els.openAuthBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentUser) {
      toggleProfileDropdown();
    } else {
      openAuthModal("login");
    }
  });

  els.closeAuthBtn?.addEventListener("click", closeAuthModal);

  els.authModal?.addEventListener("click", (e) => {
    if (e.target === els.authModal) closeAuthModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAuthModal();
      toggleProfileDropdown(false);
    }
  });

  document.addEventListener("click", (e) => {
    const insideDropdown = els.profileDropdown?.contains(e.target);
    const insideBtn = els.openAuthBtn?.contains(e.target);
    const insideContainer = els.profileContainer?.contains(e.target);

    if (!insideDropdown && !insideBtn && !insideContainer) {
      toggleProfileDropdown(false);
    }
  });

  els.logoutBtn?.addEventListener("click", logoutUser);

  els.myBookingsBtn?.addEventListener("click", () => {
    window.location.href = "bookings.html";
  });

  els.myFavoritesBtn?.addEventListener("click", () => {
    window.location.href = "favorites.html";
  });

  els.copyIbanBtn?.addEventListener("click", async () => {
    const value = cleanText(els.bankIban?.textContent);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast(t("RIB copied successfully.", "تم نسخ رقم الحساب بنجاح."), "success");
    } catch (_) {
      showToast(value, "info");
    }
  });

  els.copyReferenceBtn?.addEventListener("click", async () => {
    const value = cleanText(els.paymentReference?.textContent);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast(t("Reference copied successfully.", "تم نسخ المرجع بنجاح."), "success");
    } catch (_) {
      showToast(value, "info");
    }
  });

  if (auth) {
    auth.onAuthStateChanged((user) => {
      currentUser = user || null;
      updateAuthUI(currentUser);
    });
  } else {
    updateAuthUI(null);
  }
}

function bindAuthEvents() {
  els.loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = cleanText(els.loginEmail?.value);
    const password = cleanText(els.loginPassword?.value);
    if (!email || !password) {
      showAuthMessage(t("Please enter email and password.", "يرجى إدخال البريد وكلمة المرور."));
      return;
    }
    loginWithEmail(email, password);
  });

  els.registerForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = cleanText(els.regName?.value);
    const email = cleanText(els.regEmail?.value);
    const password = cleanText(els.regPassword?.value);

    if (!name || !email || !password) {
      showAuthMessage(t("Please complete all fields.", "يرجى إكمال جميع الحقول."));
      return;
    }

    if (!validateEmail(email)) {
      showAuthMessage(t("Please enter a valid email.", "يرجى إدخال بريد صالح."));
      return;
    }

    if (password.length < 6) {
      showAuthMessage(t("Password must be at least 6 characters.", "يجب أن تكون كلمة المرور 6 أحرف على الأقل."));
      return;
    }

    registerWithEmail(name, email, password);
  });

  els.forgotForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = cleanText(els.forgotEmail?.value);
    if (!email || !validateEmail(email)) {
      showAuthMessage(t("Please enter a valid email.", "يرجى إدخال بريد صالح."));
      return;
    }
    sendResetEmail(email);
  });

  getById("go-to-register")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("register");
    clearAuthMessage();
  });

  getById("go-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("login");
    clearAuthMessage();
  });

  getById("go-to-forgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("forgot");
    clearAuthMessage();
  });

  getById("back-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("login");
    clearAuthMessage();
  });
}

function bindPaymentEvents() {
  els.paymentRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updatePaymentCardsUI();
      updateSummary();
      updateReview();
    });
  });

  els.paymentCards.forEach((card) => {
    card.addEventListener("click", () => {
      const radio = qs('input[type="radio"]', card);
      if (!radio) return;
      radio.checked = true;
      radio.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });

  els.paymentProof?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    const maxBytes = 5 * 1024 * 1024;

    if (!allowed.includes(file.type)) {
      showToast(t("Unsupported file type.", "نوع الملف غير مدعوم."), "error");
      e.target.value = "";
      return;
    }

    if (file.size > maxBytes) {
      showToast(t("File is too large. Maximum is 5MB.", "الملف كبير جدًا. الحد الأقصى 5MB."), "error");
      e.target.value = "";
      return;
    }

    showSelectedFile(file.name);
    bookingState.paymentProofName = file.name;
    saveDraft();
    await uploadPaymentProof(file);
    updateReview();
  });
}

function bindBookingEvents() {
  Object.values(bookingFields).forEach((el) => {
    if (!el) return;

    const evt = el.tagName === "SELECT" || el.type === "date" ? "change" : "input";

    el.addEventListener(evt, () => {
      markInvalid(el, false);
      updateSummary();
      updateReview();
    });

    if (evt !== "change") {
      el.addEventListener("change", () => {
        markInvalid(el, false);
        updateSummary();
        updateReview();
      });
    }
  });

  bookingFields.arrivalDate?.addEventListener("change", () => {
    bookingState.checkIn = getFieldValue("arrivalDate");
    bookingState.bookingReference = "";
    updateDateConstraints();
    updateSummary();
    updateReview();
  });

  bookingFields.departureDate?.addEventListener("change", () => {
    bookingState.checkOut = getFieldValue("departureDate");
    updateDateConstraints();
    updateSummary();
    updateReview();
  });

  els.btnNext1?.addEventListener("click", () => {
    if (!validateStep1()) return;
    updateSummary();
    setStep(2);
  });

  els.btnPrev2?.addEventListener("click", () => {
    setStep(1);
  });

  els.btnNext2?.addEventListener("click", () => {
    if (!validateStep2()) return;
    updateReview();
    setStep(3);
  });

  els.btnPrev3?.addEventListener("click", () => {
    setStep(2);
  });

  els.btnConfirmBooking?.addEventListener("click", confirmBooking);

  els.editStep1Btns.forEach((btn) => btn.addEventListener("click", () => setStep(1)));
  els.editStep2Btns.forEach((btn) => btn.addEventListener("click", () => setStep(2)));
}

// ──────────────────────────────────────────
// Init
// ──────────────────────────────────────────
async function init() {
  if (bookingState.initialized) return;
  bookingState.initialized = true;

  cacheOriginalLocalizedContent();
  updateDirection();
  updateLangButton();
  applyTheme();
  applyTranslations();

  safeCall(() => hydrateStayContext(), "Hydrate stay context");
  safeCall(() => hydrateGuestBasics(), "Hydrate guest basics");
  safeCall(() => hydrateDraft(), "Hydrate draft");

  bindGeneralEvents();
  bindAuthEvents();
  bindPaymentEvents();
  bindBookingEvents();

  safeCall(() => updateDateConstraints(), "Update date constraints");
  await safeCall(() => loadPropertyData(), "Load property data");

  if (!getSelectedPaymentRadio()) {
    const firstPayment = els.paymentRadios[0];
    if (firstPayment) firstPayment.checked = true;
  }

  updatePaymentCardsUI();
  updateSummary();
  updateReview();
  setStep(1);
}

document.addEventListener("DOMContentLoaded", init);
