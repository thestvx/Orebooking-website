// =========================================
//   booking.js — OreBooking v11.0 Refined
//   Stable booking flow + auth + payment UI
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
let firebaseReady = false;

try {
  if (typeof firebase !== "undefined") {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase.firestore === "function") db = firebase.firestore();
    if (typeof firebase.auth === "function") auth = firebase.auth();
    if (typeof firebase.storage === "function") storage = firebase.storage();
    firebaseReady = true;
  }
} catch (error) {
  console.error("Firebase init error:", error);
}

// ──────────────────────────────────────────
// State
// ──────────────────────────────────────────
let currentUser = null;

const bookingState = {
  initialized: false,
  currentStep: 1,
  lang: safeGet("ore_lang", "ar") || "ar",
  theme: safeGet("ore_theme", "light") || "light",

  propertyId: null,
  property: null,

  checkIn: "",
  checkOut: "",
  adults: 1,
  children: 0,
  infants: 0,
  bags: 0,
  guests: 1,
  nights: 0,

  paymentMethod: "Bank Transfer",
  paymentValue: "bank-transfer",
  paymentProofUrl: null,
  paymentProofName: "",
  paymentProofUploading: false,

  rewardPoints: 0,
  bookingReference: "",

  lastDraftSavedAt: null
};

const BOOKING_DRAFT_KEY = "ore_booking_draft_v1";

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

  passwordStrength: getById("password-strength"),
  strengthLabel: getById("strength-label"),

  dropdownUserName: getById("dropdown-user-name"),
  dropdownUserEmail: getById("dropdown-user-email"),
  logoutBtn: getById("logout-btn"),
  myBookingsBtn: getById("my-bookings-btn"),
  myFavoritesBtn: getById("my-favorites-btn"),

  globalAlert: getById("booking-global-alert"),

  step1: getById("step-1"),
  step2: getById("step-2"),
  step3: getById("step-3"),
  connector1: getById("connector-1"),
  connector2: getById("connector-2"),
  indicators: qsa(".step-indicator"),

  btnNext1: getById("go-step-2"),
  btnNext2: getById("go-step-3"),
  btnPrev2: getById("back-step-1"),
  btnPrev3: getById("back-step-2"),
  btnConfirmBooking: getById("confirm-booking-btn"),
  editButtons: qsa("[data-edit-step]"),

  guestName: getById("guest-name"),
  guestEmail: getById("guest-email"),
  guestPhone: getById("guest-phone"),
  guestWhatsapp: getById("guest-whatsapp"),
  guestNationality: getById("guest-nationality"),
  guestGender: getById("guest-gender"),
  guestPurpose: getById("guest-purpose"),
  guestArrivalTime: getById("guest-arrival-time"),
  guestSpecialDate: getById("guest-special-date"),

  checkInDate: getById("check-in-date", "arrival-date"),
  checkOutDate: getById("check-out-date", "departure-date"),

  adultCount: getById("adult-count"),
  childrenCount: getById("children-count"),
  infantsCount: getById("infants-count"),
  bagsCount: getById("bags-count"),
  companionNotes: getById("companion-notes"),

  roomView: getById("room-view"),
  bedType: getById("bed-type"),
  floorPreference: getById("floor-preference"),
  smokingPreference: getById("smoking-preference"),
  foodPreferences: getById("food-preferences"),
  specialRequests: getById("special-requests"),

  paymentCards: qsa(".payment-method-card"),
  paymentRadios: qsa('input[name="payment-method"]'),
  bankTransferBox: getById("bank-transfer-box"),
  cashBox: getById("cash-box"),
  cardBox: getById("card-box"),

  copyIbanBtn: getById("copy-iban-btn"),
  copyReferenceBtn: getById("copy-reference-btn"),
  paymentProof: getById("payment-proof"),
  selectedFileBox: getById("selected-file-box"),
  selectedFileName: getById("selected-file-name"),

  bankIban: getById("bank-iban"),
  paymentReference: getById("booking-reference-code"),

  statCheckin: getById("stat-checkin"),
  statCheckout: getById("stat-checkout"),
  statNights: getById("stat-nights"),
  statGuests: getById("stat-guests"),

  summaryCheckin: getById("summary-checkin"),
  summaryCheckout: getById("summary-checkout"),
  summaryGuests: getById("summary-guests"),
  summaryNights: getById("summary-nights"),

  propMiniImg: getById("summary-prop-img"),
  propMiniTitle: getById("summary-prop-title"),
  propMiniLoc: getById("summary-prop-location"),
  propMiniType: getById("summary-prop-type"),

  summaryPriceNight: getById("summary-price-night"),
  summarySubtotal: getById("summary-subtotal"),
  summaryServiceFee: getById("summary-service-fee"),
  summaryTaxes: getById("summary-taxes"),
  summaryTotal: getById("summary-total"),

  reviewGuestName: getById("review-guest-name"),
  reviewGuestEmail: getById("review-guest-email"),
  reviewGuestPhone: getById("review-guest-phone"),
  reviewGuestPurpose: getById("review-guest-purpose"),

  reviewRoomView: getById("review-room-view"),
  reviewBedType: getById("review-bed-type"),
  reviewPriorities: getById("review-priorities"),
  reviewFeatures: getById("review-features"),

  reviewPaymentMethod: getById("review-payment-method"),
  reviewPaymentProof: getById("review-payment-proof"),

  reviewFoodPref: getById("review-food-pref"),
  reviewSpecialRequests: getById("review-special-requests"),
  reviewCompanionNotes: getById("review-companion-notes"),

  agreePolicy: getById("agree-policy")
};

// ──────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────
function t(en, ar) {
  return bookingState.lang === "ar" ? ar : en;
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
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

function validatePhone(phone) {
  const cleaned = String(phone || "").replace(/[^\d+]/g, "");
  return cleaned.length >= 8;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
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

function formatDateDisplay(dateStr) {
  const d = parseDate(dateStr);
  if (!d) return t("Not selected", "غير محدد");
  return d.toLocaleDateString(
    bookingState.lang === "ar" ? "ar-DZ" : "en-GB",
    { day: "2-digit", month: "short", year: "numeric" }
  );
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

function formatCurrency(value) {
  const amount = Number(value || 0);
  return bookingState.lang === "ar"
    ? `${amount.toLocaleString("ar-DZ")} د.ج`
    : `${amount.toLocaleString("en-US")} DZD`;
}

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
    host.style.cssText = "position:fixed;top:18px;left:18px;z-index:5000;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,380px);";
    document.body.appendChild(host);
  }

  const types = {
    success: { bg: "#ecfdf5", border: "#10b981", color: "#047857", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", border: "#ef4444", color: "#b91c1c", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8", icon: "ph-info" }
  };

  const cfg = types[type] || types.info;
  const toast = document.createElement("div");
  toast.style.cssText = `background:${cfg.bg};border:1px solid ${cfg.border};color:${cfg.color};padding:14px 16px;border-radius:16px;box-shadow:0 14px 28px rgba(15,23,42,.12);display:flex;gap:10px;align-items:flex-start;font-weight:700;line-height:1.6;`;
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

function updateDirection() {
  els.html.lang = bookingState.lang;
  els.html.dir = bookingState.lang === "ar" ? "rtl" : "ltr";
}

function applyTheme() {
  const isDark = bookingState.theme === "dark";
  els.body.classList.toggle("dark", isDark);
  els.html.style.colorScheme = isDark ? "dark" : "light";
  const icon = els.themeToggle?.querySelector("i");
  if (icon) icon.className = isDark ? "ph ph-sun" : "ph ph-moon";
}

function updateLangButton() {
  const span = els.langToggle?.querySelector("span");
  if (span) {
    span.textContent = bookingState.lang === "ar" ? "EN" : "AR";
  } else if (els.langToggle) {
    els.langToggle.textContent = bookingState.lang === "ar" ? "EN" : "AR";
  }
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

function toggleProfileDropdown(force = null) {
  if (!els.profileDropdown) return;
  const active = typeof force === "boolean"
    ? force
    : !els.profileDropdown.classList.contains("active");

  els.profileDropdown.classList.toggle("active", active);
  els.openAuthBtn?.setAttribute("aria-expanded", active ? "true" : "false");
}

function getSelectedPaymentRadio() {
  return document.querySelector('input[name="payment-method"]:checked');
}

function getSelectedPaymentValue() {
  return getSelectedPaymentRadio()?.value || "bank-transfer";
}

function getPaymentMethodLabel(value) {
  switch (value) {
    case "cash":
      return t("Cash on Arrival", "الدفع نقدًا عند الوصول");
    case "card":
      return t("Card Request", "طلب دفع بالبطاقة");
    case "bank-transfer":
    default:
      return t("Bank Transfer", "تحويل بنكي");
  }
}

function renderTagList(container, items, fallbackText = "—") {
  if (!container) return;
  const values = (items || []).filter(Boolean);
  if (!values.length) {
    container.innerHTML = `<span class="review-tag">${escapeHtml(fallbackText)}</span>`;
    return;
  }
  container.innerHTML = values.map(item => `<span class="review-tag">${escapeHtml(item)}</span>`).join("");
}

function getChipSelections(name) {
  return qsa(`input[name="${name}"]:checked`)
    .map(input => {
      const nested = input.closest(".chip-option")?.querySelector("span span");
      return cleanText(nested?.textContent || input.value);
    })
    .filter(Boolean);
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
    "auth/popup-closed-by-user": t("Google sign-in popup was closed.", "تم إغلاق نافذة Google قبل الإكمال."),
    "auth/network-request-failed": t("Network error. Check your connection.", "خطأ في الشبكة. تحقق من الاتصال.")
  };

  if (map[code]) return map[code];

  if (context === "register") {
    return t("Registration failed. Try another email.", "فشل التسجيل. جرّب بريدًا آخر.");
  }
  if (context === "forgot") {
    return t("Failed to send reset link.", "تعذر إرسال رابط الاستعادة.");
  }
  if (context === "google") {
    return t("Google sign-in failed.", "فشل تسجيل الدخول عبر Google.");
  }

  return t("Login failed. Please check your credentials.", "فشل تسجيل الدخول. تحقق من البيانات.");
}

function persistGuestBasics() {
  safeJsonSet("ore_guest_basics", {
    guestName: cleanText(els.guestName?.value),
    guestEmail: cleanText(els.guestEmail?.value),
    guestPhone: cleanText(els.guestPhone?.value),
    guestWhatsapp: cleanText(els.guestWhatsapp?.value)
  });
}

function hydrateGuestBasics() {
  const saved = safeJsonGet("ore_guest_basics", {});
  if (els.guestName && !els.guestName.value && saved?.guestName) els.guestName.value = saved.guestName;
  if (els.guestEmail && !els.guestEmail.value && saved?.guestEmail) els.guestEmail.value = saved.guestEmail;
  if (els.guestPhone && !els.guestPhone.value && saved?.guestPhone) els.guestPhone.value = saved.guestPhone;
  if (els.guestWhatsapp && !els.guestWhatsapp.value && saved?.guestWhatsapp) els.guestWhatsapp.value = saved.guestWhatsapp;
}

// ──────────────────────────────────────────
// i18n
// ──────────────────────────────────────────
function setTextPreservingIcon(el, text) {
  if (!el) return;
  const icon = Array.from(el.children).find(child => child.tagName === "I");
  if (!icon) {
    el.textContent = text;
    return;
  }
  const iconClone = icon.cloneNode(true);
  el.innerHTML = "";
  el.appendChild(iconClone);
  el.appendChild(document.createTextNode(` ${text}`));
}

function applyTranslations() {
  const dict = window.bookingI18n?.[bookingState.lang];
  if (!dict) return;

  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.getAttribute("data-i18n");
    if (key && dict[key] !== undefined) {
      setTextPreservingIcon(el, dict[key]);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key && dict[key] !== undefined) {
      el.setAttribute("placeholder", dict[key]);
    }
  });

  document.querySelectorAll("[data-i18n-option]").forEach(el => {
    const key = el.getAttribute("data-i18n-option");
    if (key && dict[key] !== undefined) {
      el.textContent = dict[key];
    }
  });

  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const key = el.getAttribute("data-i18n-title");
    if (key && dict[key] !== undefined) {
      el.setAttribute("title", dict[key]);
    }
  });

  document.title = dict.pageTitle || document.title;
}

// ──────────────────────────────────────────
// Stay Context
// ──────────────────────────────────────────
function generateBookingReference() {
  if (bookingState.bookingReference) return bookingState.bookingReference;
  const propPart = cleanText(bookingState.propertyId || "ORE").slice(0, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  bookingState.bookingReference = `ORE-${propPart}-${rand}`;
  return bookingState.bookingReference;
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

  const adults = getQueryOrStorage(
    ["adults"],
    ["booking_adults", "selectedAdults"],
    ""
  );

  const children = getQueryOrStorage(
    ["children"],
    ["booking_children", "selectedChildren"],
    ""
  );

  const infants = getQueryOrStorage(
    ["infants"],
    ["booking_infants", "selectedInfants"],
    ""
  );

  const guests = getQueryOrStorage(
    ["guests", "guestCount"],
    ["booking_guests", "selectedGuests"],
    ""
  );

  bookingState.adults = adults ? Math.max(1, parsePositiveInt(adults, 1)) : 1;
  bookingState.children = parsePositiveInt(children, 0);
  bookingState.infants = parsePositiveInt(infants, 0);

  if (!adults && guests) {
    bookingState.adults = Math.max(1, parsePositiveInt(guests, 1));
  }

  bookingState.guests = bookingState.adults + bookingState.children + bookingState.infants;
  bookingState.nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);

  if (els.checkInDate && bookingState.checkIn) els.checkInDate.value = bookingState.checkIn;
  if (els.checkOutDate && bookingState.checkOut) els.checkOutDate.value = bookingState.checkOut;
  if (els.adultCount) els.adultCount.value = String(bookingState.adults);
  if (els.childrenCount) els.childrenCount.value = String(bookingState.children);
  if (els.infantsCount) els.infantsCount.value = String(bookingState.infants);
  if (els.bagsCount && !els.bagsCount.value) els.bagsCount.value = "0";
}

function persistStayContext() {
  safeSet("booking_check_in", bookingState.checkIn || "");
  safeSet("booking_check_out", bookingState.checkOut || "");
  safeSet("booking_adults", String(bookingState.adults || 1));
  safeSet("booking_children", String(bookingState.children || 0));
  safeSet("booking_infants", String(bookingState.infants || 0));
  safeSet("booking_guests", String(bookingState.guests || 1));
}

function updateDateConstraints() {
  const today = todayInputValue();

  if (els.checkInDate) {
    els.checkInDate.min = today;
  }

  if (els.checkOutDate) {
    els.checkOutDate.min = bookingState.checkIn ? addDays(bookingState.checkIn, 1) : today;
  }

  if (bookingState.checkIn && bookingState.checkOut) {
    const nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);
    if (nights < 1) {
      bookingState.checkOut = "";
      if (els.checkOutDate) els.checkOutDate.value = "";
    }
  }
}

function saveDraft() {
  const draft = {
    checkIn: cleanText(els.checkInDate?.value) || bookingState.checkIn,
    checkOut: cleanText(els.checkOutDate?.value) || bookingState.checkOut,
    adults: parsePositiveInt(els.adultCount?.value, bookingState.adults),
    children: parsePositiveInt(els.childrenCount?.value, bookingState.children),
    infants: parsePositiveInt(els.infantsCount?.value, bookingState.infants),
    bags: parsePositiveInt(els.bagsCount?.value, bookingState.bags),

    guestName: cleanText(els.guestName?.value),
    guestEmail: cleanText(els.guestEmail?.value),
    guestPhone: cleanText(els.guestPhone?.value),
    guestWhatsapp: cleanText(els.guestWhatsapp?.value),
    guestNationality: cleanText(els.guestNationality?.value),
    guestGender: cleanText(els.guestGender?.value),
    guestPurpose: cleanText(els.guestPurpose?.value),
    guestArrivalTime: cleanText(els.guestArrivalTime?.value),
    guestSpecialDate: cleanText(els.guestSpecialDate?.value),

    roomView: cleanText(els.roomView?.value),
    bedType: cleanText(els.bedType?.value),
    floorPreference: cleanText(els.floorPreference?.value),
    smokingPreference: cleanText(els.smokingPreference?.value),
    foodPreferences: cleanText(els.foodPreferences?.value),
    specialRequests: cleanText(els.specialRequests?.value),
    companionNotes: cleanText(els.companionNotes?.value),

    paymentValue: getSelectedPaymentValue(),
    paymentProofName: bookingState.paymentProofName || "",
    propertyId: bookingState.propertyId || "",
    savedAt: new Date().toISOString()
  };

  safeJsonSet(BOOKING_DRAFT_KEY, draft);
  bookingState.lastDraftSavedAt = draft.savedAt;
  persistGuestBasics();
}

function hydrateDraft() {
  const draft = safeJsonGet(BOOKING_DRAFT_KEY, null);
  if (!draft) return;

  if (draft.propertyId && bookingState.propertyId && draft.propertyId !== bookingState.propertyId) return;

  if (els.checkInDate && !els.checkInDate.value && draft.checkIn) els.checkInDate.value = draft.checkIn;
  if (els.checkOutDate && !els.checkOutDate.value && draft.checkOut) els.checkOutDate.value = draft.checkOut;
  if (els.adultCount && !els.adultCount.value) els.adultCount.value = String(parsePositiveInt(draft.adults, 1));
  if (els.childrenCount && !els.childrenCount.value) els.childrenCount.value = String(parsePositiveInt(draft.children, 0));
  if (els.infantsCount && !els.infantsCount.value) els.infantsCount.value = String(parsePositiveInt(draft.infants, 0));
  if (els.bagsCount && !els.bagsCount.value) els.bagsCount.value = String(parsePositiveInt(draft.bags, 0));

  const simpleMap = [
    ["guestName", els.guestName],
    ["guestEmail", els.guestEmail],
    ["guestPhone", els.guestPhone],
    ["guestWhatsapp", els.guestWhatsapp],
    ["guestNationality", els.guestNationality],
    ["guestGender", els.guestGender],
    ["guestPurpose", els.guestPurpose],
    ["guestArrivalTime", els.guestArrivalTime],
    ["guestSpecialDate", els.guestSpecialDate],
    ["roomView", els.roomView],
    ["bedType", els.bedType],
    ["floorPreference", els.floorPreference],
    ["smokingPreference", els.smokingPreference],
    ["foodPreferences", els.foodPreferences],
    ["specialRequests", els.specialRequests],
    ["companionNotes", els.companionNotes]
  ];

  simpleMap.forEach(([key, el]) => {
    if (el && !el.value && draft[key]) el.value = draft[key];
  });

  if (draft.paymentValue) {
    const target = document.querySelector(`input[name="payment-method"][value="${CSS.escape(draft.paymentValue)}"]`);
    if (target) target.checked = true;
  }

  if (draft.paymentProofName) {
    bookingState.paymentProofName = draft.paymentProofName;
    if (els.selectedFileBox) els.selectedFileBox.style.display = "flex";
    if (els.selectedFileName) els.selectedFileName.textContent = draft.paymentProofName;
  }
}

// ──────────────────────────────────────────
// Property Data
// ──────────────────────────────────────────
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

  if (els.propMiniTitle) els.propMiniTitle.textContent = getPropertyTitle();

  if (els.propMiniLoc) {
    const icon = els.propMiniLoc.querySelector("i");
    const text = getPropertyLocation();
    if (icon) {
      els.propMiniLoc.innerHTML = `${icon.outerHTML} ${escapeHtml(text)}`;
    } else {
      els.propMiniLoc.textContent = text;
    }
  }

  if (els.propMiniType) els.propMiniType.textContent = getPropertyType();
}

// ──────────────────────────────────────────
// Stats / Summary / Review
// ──────────────────────────────────────────
function updateBookingStateFromInputs() {
  bookingState.checkIn = cleanText(els.checkInDate?.value) || "";
  bookingState.checkOut = cleanText(els.checkOutDate?.value) || "";

  bookingState.adults = Math.max(1, parsePositiveInt(els.adultCount?.value, bookingState.adults || 1));
  bookingState.children = parsePositiveInt(els.childrenCount?.value, bookingState.children || 0);
  bookingState.infants = parsePositiveInt(els.infantsCount?.value, bookingState.infants || 0);
  bookingState.bags = parsePositiveInt(els.bagsCount?.value, bookingState.bags || 0);

  bookingState.guests = bookingState.adults + bookingState.children + bookingState.infants;
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

function updateStats() {
  updateBookingStateFromInputs();

  if (els.statCheckin) els.statCheckin.textContent = formatDateDisplay(bookingState.checkIn);
  if (els.statCheckout) els.statCheckout.textContent = formatDateDisplay(bookingState.checkOut);
  if (els.statNights) els.statNights.textContent = String(bookingState.nights || 0);
  if (els.statGuests) els.statGuests.textContent = String(bookingState.guests || 1);
}

function updateSummary() {
  updateBookingStateFromInputs();

  if (els.summaryCheckin) els.summaryCheckin.textContent = formatDateDisplay(bookingState.checkIn);
  if (els.summaryCheckout) els.summaryCheckout.textContent = formatDateDisplay(bookingState.checkOut);
  if (els.summaryGuests) els.summaryGuests.textContent = String(bookingState.guests || 1);
  if (els.summaryNights) els.summaryNights.textContent = String(bookingState.nights || 0);

  if (els.summaryPriceNight) els.summaryPriceNight.textContent = formatCurrency(getPropertyPrice());
  if (els.summarySubtotal) els.summarySubtotal.textContent = formatCurrency(getEstimatedSubtotal());
  if (els.summaryServiceFee) els.summaryServiceFee.textContent = formatCurrency(getEstimatedServiceFee());
  if (els.summaryTaxes) els.summaryTaxes.textContent = formatCurrency(getEstimatedTaxes());
  if (els.summaryTotal) els.summaryTotal.textContent = formatCurrency(getEstimatedTotal());

  if (els.paymentReference) {
    els.paymentReference.textContent = generateBookingReference();
  }
}

function updateReview() {
  updateBookingStateFromInputs();

  const fullName = cleanText(els.guestName?.value) || t("Not provided", "غير متوفر");
  const email = cleanText(els.guestEmail?.value) || t("Not provided", "غير متوفر");
  const phone = cleanText(els.guestPhone?.value) || t("Not provided", "غير متوفر");
  const purpose =
    cleanText(els.guestPurpose?.selectedOptions?.[0]?.textContent) ||
    cleanText(els.guestPurpose?.value) ||
    t("Not provided", "غير متوفر");

  const roomView =
    cleanText(els.roomView?.selectedOptions?.[0]?.textContent) ||
    cleanText(els.roomView?.value) ||
    t("No preference", "لا يوجد تفضيل");

  const bedType =
    cleanText(els.bedType?.selectedOptions?.[0]?.textContent) ||
    cleanText(els.bedType?.value) ||
    t("No preference", "لا يوجد تفضيل");

  const priorities = getChipSelections("guest-priority");
  const features = getChipSelections("requested-feature");

  const paymentProofName =
    bookingState.paymentProofName ||
    els.paymentProof?.files?.[0]?.name ||
    (bookingState.paymentValue === "bank-transfer"
      ? t("No file uploaded", "لم يتم رفع ملف")
      : t("Not required", "غير مطلوب"));

  const foodPreferences = cleanText(els.foodPreferences?.value) || t("None", "لا يوجد");
  const specialRequests = cleanText(els.specialRequests?.value) || t("None", "لا يوجد");
  const companionNotes = cleanText(els.companionNotes?.value) || t("None", "لا يوجد");

  if (els.reviewGuestName) els.reviewGuestName.textContent = fullName;
  if (els.reviewGuestEmail) els.reviewGuestEmail.textContent = email;
  if (els.reviewGuestPhone) els.reviewGuestPhone.textContent = phone;
  if (els.reviewGuestPurpose) els.reviewGuestPurpose.textContent = purpose;

  if (els.reviewRoomView) els.reviewRoomView.textContent = roomView;
  if (els.reviewBedType) els.reviewBedType.textContent = bedType;

  renderTagList(els.reviewPriorities, priorities, t("None selected", "لا يوجد"));
  renderTagList(els.reviewFeatures, features, t("None selected", "لا يوجد"));

  if (els.reviewPaymentMethod) {
    els.reviewPaymentMethod.innerHTML =
      `<i class="ph ${bookingState.paymentValue === "cash" ? "ph-money" : bookingState.paymentValue === "card" ? "ph-credit-card" : "ph-bank"}" style="color:var(--primary);margin-inline-end:6px;"></i>${escapeHtml(bookingState.paymentMethod)}`;
  }

  if (els.reviewPaymentProof) els.reviewPaymentProof.textContent = paymentProofName;
  if (els.reviewFoodPref) els.reviewFoodPref.textContent = foodPreferences;
  if (els.reviewSpecialRequests) els.reviewSpecialRequests.textContent = specialRequests;
  if (els.reviewCompanionNotes) els.reviewCompanionNotes.textContent = companionNotes;
}

// ──────────────────────────────────────────
// Step Flow
// ──────────────────────────────────────────
function setStep(stepNumber) {
  bookingState.currentStep = stepNumber;

  [els.step1, els.step2, els.step3].forEach((step, index) => {
    if (!step) return;
    step.classList.toggle("active", index === stepNumber - 1);
  });

  els.indicators.forEach((indicator, index) => {
    indicator.classList.remove("active", "completed");
    if (index < stepNumber - 1) {
      indicator.classList.add("completed");
    } else if (index === stepNumber - 1) {
      indicator.classList.add("active");
    }
  });

  if (els.connector1) els.connector1.classList.toggle("completed", stepNumber >= 2);
  if (els.connector2) els.connector2.classList.toggle("completed", stepNumber >= 3);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateStep1() {
  hideGlobalAlert();
  updateBookingStateFromInputs();

  const name = cleanText(els.guestName?.value);
  const email = cleanText(els.guestEmail?.value);
  const phone = cleanText(els.guestPhone?.value);

  if (!name) {
    showGlobalAlert(t("Please enter your full name.", "يرجى إدخال الاسم الكامل."));
    return false;
  }

  if (!email || !validateEmail(email)) {
    showGlobalAlert(t("Please enter a valid email address.", "يرجى إدخال بريد إلكتروني صحيح."));
    return false;
  }

  if (!phone || !validatePhone(phone)) {
    showGlobalAlert(t("Please enter a valid phone number.", "يرجى إدخال رقم هاتف صحيح."));
    return false;
  }

  if (!bookingState.checkIn || !bookingState.checkOut) {
    showGlobalAlert(t("Please select check-in and check-out dates.", "يرجى تحديد تاريخ الدخول والخروج."));
    return false;
  }

  if (getDiffNights(bookingState.checkIn, bookingState.checkOut) < 1) {
    showGlobalAlert(t("Check-out must be after check-in.", "يجب أن يكون تاريخ الخروج بعد تاريخ الدخول."));
    return false;
  }

  return true;
}

function validateStep2() {
  hideGlobalAlert();
  updateBookingStateFromInputs();

  const selected = getSelectedPaymentRadio();
  if (!selected) {
    showGlobalAlert(t("Please select a payment method.", "يرجى اختيار طريقة الدفع."));
    return false;
  }

  if (selected.value === "bank-transfer" && !bookingState.paymentProofUrl && !els.paymentProof?.files?.length) {
    showGlobalAlert(t("Please upload payment proof for bank transfer.", "يرجى رفع إثبات التحويل البنكي."));
    return false;
  }

  return true;
}

function validateStep3() {
  hideGlobalAlert();

  if (!els.agreePolicy?.checked) {
    showGlobalAlert(t("You must agree to the terms and policies.", "يجب الموافقة على الشروط والسياسات."));
    return false;
  }

  return true;
}

// ──────────────────────────────────────────
// Payment UI
// ──────────────────────────────────────────
function syncPaymentMethodFromSelection() {
  const selectedValue = getSelectedPaymentValue();
  bookingState.paymentValue = selectedValue;
  bookingState.paymentMethod = getPaymentMethodLabel(selectedValue);
  updateSummary();
  updateReview();
}

function updatePaymentCardsUI() {
  els.paymentCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    card.classList.toggle("selected", !!radio?.checked);
  });

  const value = getSelectedPaymentValue();

  if (els.bankTransferBox) {
    const active = value === "bank-transfer";
    els.bankTransferBox.classList.toggle("active", active);
    els.bankTransferBox.style.display = active ? "block" : "none";
  }

  if (els.cashBox) {
    const active = value === "cash";
    els.cashBox.classList.toggle("active", active);
    els.cashBox.style.display = active ? "block" : "none";
  }

  if (els.cardBox) {
    const active = value === "card";
    els.cardBox.classList.toggle("active", active);
    els.cardBox.style.display = active ? "block" : "none";
  }

  syncPaymentMethodFromSelection();
}

async function handlePaymentProofUpload(file, bookingId = "temp") {
  if (!file) return null;

  const allowed = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
  const maxSize = 5 * 1024 * 1024;

  if (!allowed.includes(file.type)) {
    showToast(t("Only JPG, PNG, WEBP, or PDF files are allowed.", "الملفات المسموحة هي JPG وPNG وWEBP وPDF فقط."), "error");
    return null;
  }

  if (file.size > maxSize) {
    showToast(t("File size must be less than 5MB.", "يجب أن يكون حجم الملف أقل من 5MB."), "error");
    return null;
  }

  if (!storage) {
    showToast(t("Upload service is unavailable right now.", "خدمة الرفع غير متاحة الآن."), "error");
    return null;
  }

  bookingState.paymentProofUploading = true;

  try {
    const ext = file.name.split(".").pop() || "file";
    const fileName = `booking_proofs/${bookingId}_${Date.now()}.${ext}`;
    const ref = storage.ref(fileName);
    const snapshot = await ref.put(file);
    const url = await snapshot.ref.getDownloadURL();
    bookingState.paymentProofUploading = false;
    return url;
  } catch (error) {
    bookingState.paymentProofUploading = false;
    console.error("Payment proof upload error:", error);
    showToast(t("Upload failed. Please try again.", "فشل الرفع، يرجى المحاولة مرة أخرى."), "error");
    return null;
  }
}

// ──────────────────────────────────────────
// Copy Bank Info
// ──────────────────────────────────────────
function bindCopyButton(btn, getText) {
  if (!btn || btn.dataset.bound) return;
  btn.dataset.bound = "1";

  btn.addEventListener("click", async () => {
    const text = cleanText(getText());
    if (!text) return;

    try {
      await navigator.clipboard.writeText(text);
      const original = btn.innerHTML;
      btn.innerHTML = `<i class="ph ph-check"></i><span>${t("Copied", "تم النسخ")}</span>`;
      setTimeout(() => {
        btn.innerHTML = original;
      }, 1500);
    } catch (_) {
      showToast(t("Unable to copy.", "تعذر النسخ."), "error");
    }
  });
}

function initCopyBankInfo() {
  bindCopyButton(els.copyIbanBtn, () => els.bankIban?.textContent || "");
  bindCopyButton(els.copyReferenceBtn, () => els.paymentReference?.textContent || "");
}

// ──────────────────────────────────────────
// Auth
// ──────────────────────────────────────────
function initPasswordToggles() {
  qsa(".toggle-pass-btn").forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";

    btn.addEventListener("click", () => {
      const input = btn.parentElement?.querySelector("input");
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";

      const icon = btn.querySelector("i");
      if (icon) icon.className = isPassword ? "ph ph-eye-slash" : "ph ph-eye";
    });
  });
}

function calcPasswordStrength(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 8) score++;
  if (/[A-Z]/.test(value) || /[a-z]/.test(value)) score++;
  if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 4);
}

function renderPasswordStrength() {
  if (!els.regPassword || !els.passwordStrength || !els.strengthLabel) return;

  const bars = qsa(".str-bar", els.passwordStrength);
  const labels = {
    en: ["", "Weak", "Fair", "Good", "Strong"],
    ar: ["", "ضعيفة", "مقبولة", "جيدة", "قوية"]
  };
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  const val = els.regPassword.value;
  const score = calcPasswordStrength(val);

  els.passwordStrength.style.display = val ? "block" : "none";

  bars.forEach((bar, index) => {
    bar.style.background = index < score ? colors[Math.max(score - 1, 0)] : "var(--border-color)";
  });

  els.strengthLabel.textContent = val ? labels[bookingState.lang][score] : "";
  els.strengthLabel.style.color = score ? colors[Math.max(score - 1, 0)] : "var(--text-muted)";
}

function initPasswordStrength() {
  if (!els.regPassword || !els.passwordStrength || !els.strengthLabel) return;
  if (!els.regPassword.dataset.boundStrength) {
    els.regPassword.dataset.boundStrength = "1";
    els.regPassword.addEventListener("input", renderPasswordStrength);
    els.regPassword.addEventListener("change", renderPasswordStrength);
  }
  renderPasswordStrength();
}

async function handleLogin(e) {
  e.preventDefault();
  clearAuthMessage();

  const email = cleanText(els.loginEmail?.value);
  const password = cleanText(els.loginPassword?.value);
  const submitBtn = els.loginForm?.querySelector('button[type="submit"]');

  if (!email || !password) {
    showAuthMessage(t("Please fill in all login fields.", "يرجى ملء جميع حقول تسجيل الدخول."), "error");
    return;
  }

  if (!auth) {
    showAuthMessage(t("Authentication service is unavailable.", "خدمة المصادقة غير متاحة."), "error");
    return;
  }

  setButtonLoading(submitBtn, true, t("Signing in...", "جارٍ تسجيل الدخول..."));

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showAuthMessage(t("Login successful.", "تم تسجيل الدخول بنجاح."), "success");
    showToast(t("Login successful.", "تم تسجيل الدخول بنجاح."), "success");
    setTimeout(closeAuthModal, 700);
  } catch (error) {
    console.error(error);
    showAuthMessage(getAuthErrorMessage(error, "login"), "error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearAuthMessage();

  const name = cleanText(els.regName?.value);
  const email = cleanText(els.regEmail?.value);
  const password = cleanText(els.regPassword?.value);
  const submitBtn = els.registerForm?.querySelector('button[type="submit"]');

  if (!name || !email || !password) {
    showAuthMessage(t("Please complete all registration fields.", "يرجى إكمال كل حقول التسجيل."), "error");
    return;
  }

  if (!validateEmail(email)) {
    showAuthMessage(t("Please enter a valid email address.", "يرجى إدخال بريد إلكتروني صحيح."), "error");
    return;
  }

  if (password.length < 6) {
    showAuthMessage(t("Password must be at least 6 characters.", "يجب أن تكون كلمة المرور 6 أحرف على الأقل."), "error");
    return;
  }

  if (!auth) {
    showAuthMessage(t("Authentication service is unavailable.", "خدمة المصادقة غير متاحة."), "error");
    return;
  }

  setButtonLoading(submitBtn, true, t("Creating account...", "جارٍ إنشاء الحساب..."));

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (cred.user && typeof cred.user.updateProfile === "function") {
      await cred.user.updateProfile({ displayName: name });
    }

    if (db && cred.user) {
      try {
        await db.collection("users").doc(cred.user.uid).set({
          uid: cred.user.uid,
          fullName: name,
          email,
          source: "booking_page",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (profileErr) {
        console.warn("User profile write warning:", profileErr);
      }
    }

    showAuthMessage(t("Account created successfully.", "تم إنشاء الحساب بنجاح."), "success");
    showToast(t("Account created successfully.", "تم إنشاء الحساب بنجاح."), "success");

    setTimeout(() => {
      switchAuthForm("login");
      if (els.loginEmail) els.loginEmail.value = email;
      if (els.loginPassword) els.loginPassword.value = "";
      clearAuthMessage();
    }, 900);
  } catch (error) {
    console.error(error);
    showAuthMessage(getAuthErrorMessage(error, "register"), "error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  clearAuthMessage();

  const email = cleanText(els.forgotEmail?.value);
  const submitBtn = els.forgotForm?.querySelector('button[type="submit"]');

  if (!email || !validateEmail(email)) {
    showAuthMessage(t("Please enter a valid email address.", "يرجى إدخال بريد إلكتروني صحيح."), "error");
    return;
  }

  if (!auth) {
    showAuthMessage(t("Authentication service is unavailable.", "خدمة المصادقة غير متاحة."), "error");
    return;
  }

  setButtonLoading(submitBtn, true, t("Sending...", "جارٍ الإرسال..."));

  try {
    await auth.sendPasswordResetEmail(email);
    showAuthMessage(t("Reset link sent successfully.", "تم إرسال رابط الاستعادة بنجاح."), "success");
    showToast(t("Reset link sent successfully.", "تم إرسال رابط الاستعادة بنجاح."), "success");
  } catch (error) {
    console.error(error);
    showAuthMessage(getAuthErrorMessage(error, "forgot"), "error");
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

async function handleGoogleAuth() {
  if (!auth || typeof firebase === "undefined") {
    showAuthMessage(t("Google sign-in is unavailable.", "تسجيل الدخول عبر Google غير متاح."), "error");
    return;
  }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    closeAuthModal();
    showToast(t("Login successful.", "تم تسجيل الدخول بنجاح."), "success");
  } catch (error) {
    console.error(error);
    showAuthMessage(getAuthErrorMessage(error, "google"), "error");
  }
}

async function handleLogout() {
  if (!auth) return;
  try {
    await auth.signOut();
    toggleProfileDropdown(false);
    showToast(t("Logged out successfully.", "تم تسجيل الخروج بنجاح."), "success");
  } catch (error) {
    console.error(error);
  }
}

function updateUserUI(user) {
  const loggedIn = !!user;

  if (els.dropdownUserName) {
    els.dropdownUserName.textContent = user?.displayName || t("Guest User", "مستخدم ضيف");
  }

  if (els.dropdownUserEmail) {
    els.dropdownUserEmail.textContent = user?.email || "";
  }

  if (els.openAuthBtn) {
    els.openAuthBtn.innerHTML = loggedIn
      ? `<i class="ph ph-user-circle"></i>`
      : `<i class="ph ph-user"></i>`;
  }

  if (loggedIn) {
    if (els.guestName && !els.guestName.value && user.displayName) els.guestName.value = user.displayName;
    if (els.guestEmail && !els.guestEmail.value && user.email) els.guestEmail.value = user.email;
  }

  persistGuestBasics();
  updateStats();
  updateSummary();
  updateReview();
}

// ──────────────────────────────────────────
// Submission
// ──────────────────────────────────────────
function buildBookingPayload(bookingId, paymentProofUrl) {
  return {
    bookingId,
    propertyId: bookingState.propertyId || null,
    propertyTitle: getPropertyTitle(),
    propertyLocation: getPropertyLocation(),
    propertyType: getPropertyType(),
    propertyImage: getPropertyImage(),

    guestName: cleanText(els.guestName?.value),
    guestEmail: cleanText(els.guestEmail?.value),
    guestPhone: cleanText(els.guestPhone?.value),
    guestWhatsapp: cleanText(els.guestWhatsapp?.value),
    guestNationality: cleanText(els.guestNationality?.value),
    guestGender: cleanText(els.guestGender?.value),
    guestPurpose: cleanText(els.guestPurpose?.value),
    guestArrivalTime: cleanText(els.guestArrivalTime?.value),
    guestSpecialDate: cleanText(els.guestSpecialDate?.value),

    checkIn: bookingState.checkIn || null,
    checkOut: bookingState.checkOut || null,
    adults: bookingState.adults || 1,
    children: bookingState.children || 0,
    infants: bookingState.infants || 0,
    bags: bookingState.bags || 0,
    guests: bookingState.guests || 1,
    nights: bookingState.nights || 0,

    roomView: cleanText(els.roomView?.value),
    bedType: cleanText(els.bedType?.value),
    floorPreference: cleanText(els.floorPreference?.value),
    smokingPreference: cleanText(els.smokingPreference?.value),
    guestPriorities: qsa('input[name="guest-priority"]:checked').map(input => input.value),
    requestedFeatures: qsa('input[name="requested-feature"]:checked').map(input => input.value),
    foodPreferences: cleanText(els.foodPreferences?.value),
    specialRequests: cleanText(els.specialRequests?.value),
    companionNotes: cleanText(els.companionNotes?.value),

    paymentMethod: bookingState.paymentMethod,
    paymentValue: bookingState.paymentValue,
    paymentProofUrl: paymentProofUrl || null,
    paymentProofName: bookingState.paymentProofName || null,
    paymentReference: cleanText(els.paymentReference?.textContent) || generateBookingReference(),

    pricePerNight: getPropertyPrice(),
    subtotal: getEstimatedSubtotal(),
    serviceFee: getEstimatedServiceFee(),
    taxes: getEstimatedTaxes(),
    totalPrice: getEstimatedTotal(),
    rewardPoints: bookingState.rewardPoints,

    authUid: currentUser?.uid || null,
    userEmail: currentUser?.email || null,
    status: "pending",
    source: "booking_page",
    lang: bookingState.lang
  };
}

async function submitBooking() {
  if (!validateStep1()) return;
  if (!validateStep2()) return;
  if (!validateStep3()) return;
  if (bookingState.paymentProofUploading) {
    showToast(t("Please wait until the file upload finishes.", "يرجى الانتظار حتى يكتمل رفع الملف."), "error");
    return;
  }

  setButtonLoading(els.btnConfirmBooking, true, t("Confirming...", "جارٍ التأكيد..."));

  try {
    updateBookingStateFromInputs();

    let bookingId = `offline_${Date.now()}`;
    if (db) {
      bookingId = db.collection("bookings").doc().id;
    }

    let paymentProofUrl = bookingState.paymentProofUrl;

    if (bookingState.paymentValue === "bank-transfer" && els.paymentProof?.files?.[0] && !paymentProofUrl) {
      paymentProofUrl = await handlePaymentProofUpload(els.paymentProof.files[0], bookingId);
      bookingState.paymentProofUrl = paymentProofUrl;
      bookingState.paymentProofName = els.paymentProof.files[0].name || "";
      if (!paymentProofUrl) {
        setButtonLoading(els.btnConfirmBooking, false);
        return;
      }
    }

    const payload = buildBookingPayload(bookingId, paymentProofUrl);

    if (db) {
      await db.collection("bookings").doc(bookingId).set({
        ...payload,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } else {
      safeSet(`offline_booking_${bookingId}`, JSON.stringify({
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
    }

    safeSet("last_booking_id", bookingId);
    safeSet("last_booking_property_id", bookingState.propertyId || "");
    safeSet("last_booking_email", payload.guestEmail || "");

    safeRemove(BOOKING_DRAFT_KEY);

    if (typeof window.confetti === "function") {
      window.confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.6 }
      });
    }

    showToast(t("Booking submitted successfully.", "تم إرسال الحجز بنجاح."), "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1400);
  } catch (error) {
    console.error("Booking submit error:", error);
    showToast(
      t("An error occurred while submitting your booking.", "حدث خطأ أثناء إرسال الحجز."),
      "error"
    );
  } finally {
    setButtonLoading(els.btnConfirmBooking, false);
  }
}

// ──────────────────────────────────────────
// Events
// ──────────────────────────────────────────
function initInputWatchers() {
  const watched = [
    els.guestName,
    els.guestEmail,
    els.guestPhone,
    els.guestWhatsapp,
    els.guestNationality,
    els.guestGender,
    els.guestPurpose,
    els.guestArrivalTime,
    els.guestSpecialDate,
    els.checkInDate,
    els.checkOutDate,
    els.adultCount,
    els.childrenCount,
    els.infantsCount,
    els.bagsCount,
    els.roomView,
    els.bedType,
    els.floorPreference,
    els.smokingPreference,
    els.foodPreferences,
    els.specialRequests,
    els.companionNotes
  ].filter(Boolean);

  const syncAll = () => {
    hideGlobalAlert();
    persistGuestBasics();
    updateStats();
    updateSummary();
    updateReview();
  };

  watched.forEach(el => {
    if (el.dataset.bookingBound) return;
    el.dataset.bookingBound = "1";
    el.addEventListener("input", syncAll);
    el.addEventListener("change", syncAll);
  });

  qsa('input[name="guest-priority"], input[name="requested-feature"]').forEach(el => {
    if (el.dataset.bookingBound) return;
    el.dataset.bookingBound = "1";
    el.addEventListener("change", syncAll);
  });
}

function initPaymentUI() {
  els.paymentCards.forEach(card => {
    if (card.dataset.bound) return;
    card.dataset.bound = "1";

    card.addEventListener("click", e => {
      if (e.target.closest('input[type="radio"]')) return;
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        updatePaymentCardsUI();
      }
    });
  });

  els.paymentRadios.forEach(radio => {
    if (radio.dataset.bound) return;
    radio.dataset.bound = "1";
    radio.addEventListener("change", updatePaymentCardsUI);
  });

  if (els.paymentProof && !els.paymentProof.dataset.bound) {
    els.paymentProof.dataset.bound = "1";
    els.paymentProof.addEventListener("change", () => {
      const file = els.paymentProof.files?.[0];

      if (file) {
        bookingState.paymentProofName = file.name;
        bookingState.paymentProofUrl = null;
        if (els.selectedFileBox) els.selectedFileBox.style.display = "flex";
        if (els.selectedFileName) els.selectedFileName.textContent = file.name;
      } else {
        bookingState.paymentProofName = "";
        bookingState.paymentProofUrl = null;
        if (els.selectedFileBox) els.selectedFileBox.style.display = "none";
      }

      saveDraft();
      updateReview();
    });
  }

  updatePaymentCardsUI();
}

function initSteps() {
  if (els.btnNext1 && !els.btnNext1.dataset.bound) {
    els.btnNext1.dataset.bound = "1";
    els.btnNext1.addEventListener("click", () => {
      if (!validateStep1()) return;
      updateStats();
      updateSummary();
      setStep(2);
    });
  }

  if (els.btnPrev2 && !els.btnPrev2.dataset.bound) {
    els.btnPrev2.dataset.bound = "1";
    els.btnPrev2.addEventListener("click", () => {
      hideGlobalAlert();
      setStep(1);
    });
  }

  if (els.btnNext2 && !els.btnNext2.dataset.bound) {
    els.btnNext2.dataset.bound = "1";
    els.btnNext2.addEventListener("click", () => {
      if (!validateStep1()) return;
      if (!validateStep2()) return;
      updateReview();
      updateSummary();
      setStep(3);
    });
  }

  if (els.btnPrev3 && !els.btnPrev3.dataset.bound) {
    els.btnPrev3.dataset.bound = "1";
    els.btnPrev3.addEventListener("click", () => {
      hideGlobalAlert();
      setStep(2);
    });
  }

  els.editButtons.forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const step = Number(btn.dataset.editStep || 1);
      setStep(step >= 1 && step <= 3 ? step : 1);
    });
  });

  if (els.btnConfirmBooking && !els.btnConfirmBooking.dataset.bound) {
    els.btnConfirmBooking.dataset.bound = "1";
    els.btnConfirmBooking.addEventListener("click", submitBooking);
  }
}

function initThemeAndLanguage() {
  updateDirection();
  applyTranslations();
  applyTheme();
  updateLangButton();

  if (els.themeToggle && !els.themeToggle.dataset.bound) {
    els.themeToggle.dataset.bound = "1";
    els.themeToggle.addEventListener("click", () => {
      bookingState.theme = bookingState.theme === "dark" ? "light" : "dark";
      safeSet("ore_theme", bookingState.theme);
      applyTheme();
    });
  }

  if (els.langToggle && !els.langToggle.dataset.bound) {
    els.langToggle.dataset.bound = "1";
    els.langToggle.addEventListener("click", () => {
      bookingState.lang = bookingState.lang === "ar" ? "en" : "ar";
      safeSet("ore_lang", bookingState.lang);

      updateDirection();
      applyTranslations();
      updateLangButton();
      renderPropertySummary();
      updateStats();
      updateSummary();
      updateReview();
      renderPasswordStrength();
    });
  }
}

function initAuthUI() {
  if (els.openAuthBtn && !els.openAuthBtn.dataset.bound) {
    els.openAuthBtn.dataset.bound = "1";
    els.openAuthBtn.addEventListener("click", e => {
      e.preventDefault();
      if (currentUser) {
        toggleProfileDropdown();
      } else {
        openAuthModal("login");
      }
    });
  }

  if (els.closeAuthBtn && !els.closeAuthBtn.dataset.bound) {
    els.closeAuthBtn.dataset.bound = "1";
    els.closeAuthBtn.addEventListener("click", closeAuthModal);
  }

  if (els.authModal && !els.authModal.dataset.bound) {
    els.authModal.dataset.bound = "1";
    els.authModal.addEventListener("click", e => {
      if (e.target === els.authModal) closeAuthModal();
    });
  }

  if (!document.body.dataset.bookingGlobalBinds) {
    document.body.dataset.bookingGlobalBinds = "1";

    document.addEventListener("click", e => {
      if (!e.target.closest(".profile-container")) {
        toggleProfileDropdown(false);
      }
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        closeAuthModal();
        toggleProfileDropdown(false);
      }
    });
  }

  const goToRegister = getById("go-to-register");
  const goToLogin = getById("go-to-login");
  const goToForgot = getById("go-to-forgot");
  const backToLogin = getById("back-to-login");
  const googleLoginBtn = getById("google-login-btn");
  const googleRegisterBtn = getById("google-register-btn");

  if (goToRegister && !goToRegister.dataset.bound) {
    goToRegister.dataset.bound = "1";
    goToRegister.addEventListener("click", e => {
      e.preventDefault();
      switchAuthForm("register");
      clearAuthMessage();
    });
  }

  if (goToLogin && !goToLogin.dataset.bound) {
    goToLogin.dataset.bound = "1";
    goToLogin.addEventListener("click", e => {
      e.preventDefault();
      switchAuthForm("login");
      clearAuthMessage();
    });
  }

  if (goToForgot && !goToForgot.dataset.bound) {
    goToForgot.dataset.bound = "1";
    goToForgot.addEventListener("click", e => {
      e.preventDefault();
      switchAuthForm("forgot");
      clearAuthMessage();
    });
  }

  if (backToLogin && !backToLogin.dataset.bound) {
    backToLogin.dataset.bound = "1";
    backToLogin.addEventListener("click", e => {
      e.preventDefault();
      switchAuthForm("login");
      clearAuthMessage();
    });
  }

  if (els.loginForm && !els.loginForm.dataset.bound) {
    els.loginForm.dataset.bound = "1";
    els.loginForm.addEventListener("submit", handleLogin);
  }

  if (els.registerForm && !els.registerForm.dataset.bound) {
    els.registerForm.dataset.bound = "1";
    els.registerForm.addEventListener("submit", handleRegister);
  }

  if (els.forgotForm && !els.forgotForm.dataset.bound) {
    els.forgotForm.dataset.bound = "1";
    els.forgotForm.addEventListener("submit", handleForgotPassword);
  }

  if (googleLoginBtn && !googleLoginBtn.dataset.bound) {
    googleLoginBtn.dataset.bound = "1";
    googleLoginBtn.addEventListener("click", handleGoogleAuth);
  }

  if (googleRegisterBtn && !googleRegisterBtn.dataset.bound) {
    googleRegisterBtn.dataset.bound = "1";
    googleRegisterBtn.addEventListener("click", handleGoogleAuth);
  }

  if (els.logoutBtn && !els.logoutBtn.dataset.bound) {
    els.logoutBtn.dataset.bound = "1";
    els.logoutBtn.addEventListener("click", handleLogout);
  }

  if (els.myBookingsBtn && !els.myBookingsBtn.dataset.bound) {
    els.myBookingsBtn.dataset.bound = "1";
    els.myBookingsBtn.addEventListener("click", () => {
      toggleProfileDropdown(false);
      window.location.href = "profile.html#bookings";
    });
  }

  if (els.myFavoritesBtn && !els.myFavoritesBtn.dataset.bound) {
    els.myFavoritesBtn.dataset.bound = "1";
    els.myFavoritesBtn.addEventListener("click", () => {
      toggleProfileDropdown(false);
      window.location.href = "profile.html#favorites";
    });
  }

  if (auth) {
    auth.onAuthStateChanged(user => {
      currentUser = user;
      updateUserUI(user);
    });
  } else {
    updateUserUI(null);
  }
}

// ──────────────────────────────────────────
// Init
// ──────────────────────────────────────────
async function init() {
  if (bookingState.initialized) return;
  bookingState.initialized = true;

  bookingState.bookingReference = generateBookingReference();

  hydrateStayContext();
  hydrateGuestBasics();
  updateDateConstraints();

  initThemeAndLanguage();
  initAuthUI();
  initPasswordToggles();
  initPasswordStrength();
  initInputWatchers();
  initPaymentUI();
  initCopyBankInfo();
  initSteps();

  await loadPropertyData();

  hydrateDraft();

  updateDateConstraints();
  updateStats();
  updateSummary();
  updateReview();
  setStep(1);

  if (!firebaseReady) {
    console.warn("Firebase is not fully available. Booking will use graceful fallback mode.");
  }
}

document.addEventListener("DOMContentLoaded", init);

// Optional globals
window.bookingState = bookingState;
window.submitBooking = submitBooking;
window.setBookingStep = setStep;
window.openBookingAuthModal = openAuthModal;
window.closeBookingAuthModal = closeAuthModal;
