// =========================================
//   booking.js — OreBooking v12.0
//   Simplified booking flow + auth + payment
//   Compatible with streamlined booking.html
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
  guestCount: 1,
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

const BOOKING_DRAFT_KEY = "ore_booking_draft_v2";
const LOCAL_BOOKINGS_KEY = "ore_bookings_local_v1";

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

function qs(selector, root = document) {
  return root.querySelector(selector);
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

  btnNext1: getById("go-step-2", "btn-next-1"),
  btnNext2: getById("go-step-3", "btn-next-2"),
  btnPrev2: getById("back-step-1", "btn-prev-2"),
  btnPrev3: getById("back-step-2", "btn-prev-3"),
  btnConfirmBooking: getById("confirm-booking-btn", "btn-confirm-booking"),

  editStep1Btns: [
    getById("btn-edit-guest"),
    getById("btn-edit-details"),
    getById("btn-edit-dates")
  ].filter(Boolean),
  editStep2Btns: [
    getById("btn-edit-payment")
  ].filter(Boolean),

  guestName: getById("guest-name", "full-name"),
  guestEmail: getById("guest-email"),
  guestPhone: getById("guest-phone"),
  billingName: getById("billing-name", "sender-name", "cash-payer-name"),
  specialNotes: getById("special-notes", "special-requests", "cash-payment-note"),

  checkInDate: getById("arrival-date", "check-in-date"),
  checkOutDate: getById("departure-date", "check-out-date"),
  guestCount: getById("guest-count", "guests-count", "adult-count", "guest-adults"),

  paymentCards: qsa(".payment-method-card"),
  paymentRadios: qsa('input[name="payment-method"], input[name="paymentmethod"]'),
  bankTransferBox: getById("bank-transfer-box", "ccp-details"),
  cashBox: getById("cash-box", "cash-details"),
  cardBox: getById("card-box", "card-details"),

  copyIbanBtn: getById("copy-iban-btn", "copy-rib-btn"),
  copyReferenceBtn: getById("copy-reference-btn"),
  paymentProof: getById("payment-proof", "receipt-upload"),
  selectedFileBox: getById("selected-file-box", "receipt-selected-box"),
  selectedFileName: getById("selected-file-name", "receipt-selected-name"),

  bankIban: getById("bank-iban"),
  paymentReference: getById("booking-reference-code", "payment-reference"),

  summaryCheckin: getById("summary-checkin"),
  summaryCheckout: getById("summary-checkout"),
  summaryGuests: getById("summary-guests"),
  summaryNights: getById("summary-nights", "sb-nights-count"),

  propMiniImg: getById("summary-prop-img", "prop-mini-img"),
  propMiniTitle: getById("summary-prop-title", "prop-mini-title"),
  propMiniLoc: getById("summary-prop-location", "prop-mini-loc"),
  propMiniType: getById("summary-prop-type", "prop-mini-type"),

  summaryPriceNight: getById("summary-price-night", "sb-night-price"),
  summarySubtotal: getById("summary-subtotal"),
  summaryServiceFee: getById("summary-service-fee", "sb-fee-amount"),
  summaryTaxes: getById("summary-taxes", "sb-addons-amount"),
  summaryTotal: getById("summary-total", "sb-final-total"),

  reviewGuestName: getById("review-guest-name", "rev-name"),
  reviewGuestEmail: getById("review-guest-email", "rev-email"),
  reviewGuestPhone: getById("review-guest-phone", "rev-phone"),
  reviewBillingName: getById("review-billing-name", "rev-billings", "rev-billing"),
  reviewSpecialNotes: getById("review-special-notes", "review-special-requests", "rev-room-preferences"),
  reviewStayDates: getById("review-stay-dates", "rev-dates"),
  reviewGuests: getById("review-guests", "rev-guests"),
  reviewPaymentMethod: getById("review-payment-method", "rev-payment-method"),
  reviewPaymentProof: getById("review-payment-proof", "rev-documents"),
  reviewPoints: getById("review-points", "rev-points"),

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
    host.style.cssText = `
      position:fixed;
      top:18px;
      left:18px;
      z-index:5000;
      display:flex;
      flex-direction:column;
      gap:10px;
      max-width:min(92vw,380px);
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
    background:${cfg.bg};
    border:1px solid ${cfg.border};
    color:${cfg.color};
    padding:14px 16px;
    border-radius:16px;
    box-shadow:0 14px 28px rgba(15,23,42,.12);
    display:flex;
    gap:10px;
    align-items:flex-start;
    font-weight:700;
    line-height:1.6;
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
  const text = bookingState.lang === "ar" ? "EN" : "AR";
  if (span) span.textContent = text;
  else if (els.langToggle) els.langToggle.textContent = text;
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
  return document.querySelector('input[name="payment-method"]:checked, input[name="paymentmethod"]:checked');
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
    case "ccp":
    case "bank":
    case "bank-transfer":
    default:
      return t("Bank Transfer", "تحويل بنكي");
  }
}

function getPaymentIconClass(value) {
  switch (value) {
    case "cash":
      return "ph-money";
    case "card":
      return "ph-credit-card";
    default:
      return "ph-bank";
  }
}

function getFallbackText() {
  return t("Not provided", "غير متوفر");
}

function getSelectedText(el, fallback = "") {
  if (!el) return fallback;
  if (el.tagName === "SELECT" && el.selectedOptions?.length) {
    return cleanText(el.selectedOptions[0].textContent) || fallback;
  }
  return cleanText(el.value) || fallback;
}

function setText(el, value) {
  if (el) el.textContent = value;
}

function setHtml(el, value) {
  if (el) el.innerHTML = value;
}

function persistGuestBasics() {
  safeJsonSet("ore_guest_basics", {
    guestName: cleanText(els.guestName?.value),
    guestEmail: cleanText(els.guestEmail?.value),
    guestPhone: cleanText(els.guestPhone?.value),
    billingName: cleanText(els.billingName?.value)
  });
}

function hydrateGuestBasics() {
  const saved = safeJsonGet("ore_guest_basics", {});
  if (els.guestName && !els.guestName.value && saved?.guestName) els.guestName.value = saved.guestName;
  if (els.guestEmail && !els.guestEmail.value && saved?.guestEmail) els.guestEmail.value = saved.guestEmail;
  if (els.guestPhone && !els.guestPhone.value && saved?.guestPhone) els.guestPhone.value = saved.guestPhone;
  if (els.billingName && !els.billingName.value && saved?.billingName) els.billingName.value = saved.billingName;
}

function setValueIfEmpty(el, value) {
  if (el && !cleanText(el.value) && cleanText(value)) {
    el.value = value;
  }
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

  if (dict.pageTitle) document.title = dict.pageTitle;
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

  const guests = getQueryOrStorage(
    ["guests", "guestCount", "adults"],
    ["booking_guests", "selectedGuests", "booking_adults"],
    ""
  );

  bookingState.guestCount = Math.max(1, parsePositiveInt(guests || 1, 1));
  bookingState.nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);

  if (els.checkInDate && bookingState.checkIn) els.checkInDate.value = bookingState.checkIn;
  if (els.checkOutDate && bookingState.checkOut) els.checkOutDate.value = bookingState.checkOut;
  if (els.guestCount && !els.guestCount.value) els.guestCount.value = String(bookingState.guestCount);
}

function persistStayContext() {
  safeSet("booking_check_in", bookingState.checkIn || "");
  safeSet("booking_check_out", bookingState.checkOut || "");
  safeSet("booking_guests", String(bookingState.guestCount || 1));
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
    propertyId: bookingState.propertyId || "",
    checkIn: cleanText(els.checkInDate?.value) || bookingState.checkIn,
    checkOut: cleanText(els.checkOutDate?.value) || bookingState.checkOut,
    guestCount: parsePositiveInt(els.guestCount?.value, bookingState.guestCount),

    guestName: cleanText(els.guestName?.value),
    guestEmail: cleanText(els.guestEmail?.value),
    guestPhone: cleanText(els.guestPhone?.value),
    billingName: cleanText(els.billingName?.value),
    specialNotes: cleanText(els.specialNotes?.value),

    paymentValue: getSelectedPaymentValue(),
    paymentProofName: bookingState.paymentProofName || "",
    paymentProofUrl: bookingState.paymentProofUrl || "",
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

  setValueIfEmpty(els.checkInDate, draft.checkIn);
  setValueIfEmpty(els.checkOutDate, draft.checkOut);
  setValueIfEmpty(els.guestCount, String(parsePositiveInt(draft.guestCount, 1)));

  setValueIfEmpty(els.guestName, draft.guestName);
  setValueIfEmpty(els.guestEmail, draft.guestEmail);
  setValueIfEmpty(els.guestPhone, draft.guestPhone);
  setValueIfEmpty(els.billingName, draft.billingName);
  setValueIfEmpty(els.specialNotes, draft.specialNotes);

  if (draft.paymentValue) {
    const selector =
      `input[name="payment-method"][value="${draft.paymentValue}"],` +
      `input[name="paymentmethod"][value="${draft.paymentValue}"]`;
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
// Summary / Review
// ──────────────────────────────────────────
function updateBookingStateFromInputs() {
  bookingState.checkIn = cleanText(els.checkInDate?.value) || "";
  bookingState.checkOut = cleanText(els.checkOutDate?.value) || "";
  bookingState.guestCount = Math.max(1, parsePositiveInt(els.guestCount?.value, bookingState.guestCount || 1));
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

function updateSummary() {
  updateBookingStateFromInputs();

  setText(els.summaryCheckin, formatDateDisplay(bookingState.checkIn));
  setText(els.summaryCheckout, formatDateDisplay(bookingState.checkOut));
  setText(els.summaryGuests, String(bookingState.guestCount || 1));
  setText(els.summaryNights, String(bookingState.nights || 0));

  setText(els.summaryPriceNight, formatCurrency(getPropertyPrice()));
  setText(els.summarySubtotal, formatCurrency(getEstimatedSubtotal()));
  setText(els.summaryServiceFee, formatCurrency(getEstimatedServiceFee()));
  setText(els.summaryTaxes, formatCurrency(getEstimatedTaxes()));
  setText(els.summaryTotal, formatCurrency(getEstimatedTotal()));

  if (els.paymentReference) {
    els.paymentReference.textContent = generateBookingReference();
  }
}

function updateReview() {
  updateBookingStateFromInputs();

  const fullName = cleanText(els.guestName?.value) || getFallbackText();
  const email = cleanText(els.guestEmail?.value) || getFallbackText();
  const phone = cleanText(els.guestPhone?.value) || getFallbackText();
  const billingName = cleanText(els.billingName?.value) || getFallbackText();
  const specialNotes = cleanText(els.specialNotes?.value) || t("None", "لا يوجد");
  const paymentProofName =
    bookingState.paymentProofName ||
    els.paymentProof?.files?.[0]?.name ||
    (bookingState.paymentValue === "bank-transfer"
      ? t("No file uploaded", "لم يتم رفع ملف")
      : t("Not required", "غير مطلوب"));

  setText(els.reviewGuestName, fullName);
  setText(els.reviewGuestEmail, email);
  setText(els.reviewGuestPhone, phone);
  setText(els.reviewBillingName, billingName);
  setText(els.reviewSpecialNotes, specialNotes);
  setText(
    els.reviewStayDates,
    `${formatDateDisplay(bookingState.checkIn)} — ${formatDateDisplay(bookingState.checkOut)}`
  );
  setText(els.reviewGuests, String(bookingState.guestCount || 1));
  setText(els.reviewPaymentProof, paymentProofName);
  setText(els.reviewPoints, String(bookingState.rewardPoints || 0));

  if (els.reviewPaymentMethod) {
    els.reviewPaymentMethod.innerHTML =
      `<i class="ph ${getPaymentIconClass(bookingState.paymentValue)}" style="color:var(--primary);margin-inline-end:6px;"></i>${escapeHtml(bookingState.paymentMethod)}`;
  }
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

  if (stepNumber === 3) updateReview();
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

  if (bookingState.guestCount < 1) {
    showGlobalAlert(t("Please enter a valid guest count.", "يرجى إدخال عدد ضيوف صحيح."));
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

  if (selected.value === "bank-transfer" || selected.value === "ccp" || selected.value === "bank") {
    if (!bookingState.paymentProofUrl && !els.paymentProof?.files?.length) {
      showGlobalAlert(t("Please upload payment proof for bank transfer.", "يرجى رفع إثبات التحويل البنكي."));
      return false;
    }
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
  const isBank = value === "bank-transfer" || value === "ccp" || value === "bank";

  if (els.bankTransferBox) {
    const active = isBank;
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

function showSelectedFile(name) {
  if (els.selectedFileBox) {
    els.selectedFileBox.style.display = "flex";
    els.selectedFileBox.classList.add("show", "visible");
  }
  if (els.selectedFileName) {
    els.selectedFileName.textContent = name;
  }
}

async function handlePaymentProofUpload(file) {
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

  bookingState.paymentProofName = file.name;
  showSelectedFile(file.name);

  if (!storage) {
    bookingState.paymentProofUrl = null;
    showToast(t("File selected successfully.", "تم اختيار الملف بنجاح."), "success");
    saveDraft();
    updateReview();
    return null;
  }

  try {
    bookingState.paymentProofUploading = true;
    showToast(t("Uploading payment proof...", "جارٍ رفع إثبات الدفع..."), "info");

    const reference = generateBookingReference();
    const cleanName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const path = `booking_proofs/${reference}/${cleanName}`;
    const ref = storage.ref().child(path);

    await ref.put(file);
    bookingState.paymentProofUrl = await ref.getDownloadURL();
    bookingState.paymentProofUploading = false;

    saveDraft();
    updateReview();
    showToast(t("Payment proof uploaded successfully.", "تم رفع إثبات الدفع بنجاح."), "success");
    return bookingState.paymentProofUrl;
  } catch (error) {
    console.error("Payment proof upload error:", error);
    bookingState.paymentProofUploading = false;
    bookingState.paymentProofUrl = null;
    showToast(t("Failed to upload file.", "تعذر رفع الملف."), "error");
    return null;
  }
}

// ──────────────────────────────────────────
// Auth
// ──────────────────────────────────────────
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

function updateAuthUI(user) {
  currentUser = user || null;

  const name =
    cleanText(user?.displayName) ||
    cleanText(safeJsonGet("ore_guest_basics", {})?.guestName) ||
    t("Guest User", "زائر");
  const email =
    cleanText(user?.email) ||
    t("Sign in to continue", "سجل الدخول للمتابعة");

  setText(els.dropdownUserName, name);
  setText(els.dropdownUserEmail, email);

  if (els.openAuthBtn) {
    const icon = els.openAuthBtn.querySelector("i");
    if (icon) {
      icon.className = user ? "ph ph-user-circle-check" : "ph ph-user";
    }
  }
}

async function loginWithEmail(email, password) {
  if (!auth) {
    showAuthMessage(t("Authentication service is unavailable.", "خدمة المصادقة غير متاحة."));
    return;
  }

  try {
    clearAuthMessage();
    setButtonLoading(qs("#login-submit-btn"), true, t("Signing in...", "جارٍ تسجيل الدخول..."));
    await auth.signInWithEmailAndPassword(email, password);
    closeAuthModal();
    showToast(t("Logged in successfully.", "تم تسجيل الدخول بنجاح."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "login"), "error");
  } finally {
    setButtonLoading(qs("#login-submit-btn"), false);
  }
}

async function registerWithEmail(name, email, password) {
  if (!auth) {
    showAuthMessage(t("Authentication service is unavailable.", "خدمة المصادقة غير متاحة."));
    return;
  }

  try {
    clearAuthMessage();
    setButtonLoading(qs("#register-submit-btn"), true, t("Creating account...", "جارٍ إنشاء الحساب..."));
    const result = await auth.createUserWithEmailAndPassword(email, password);
    if (result?.user && name) {
      await result.user.updateProfile({ displayName: name });
    }
    closeAuthModal();
    showToast(t("Account created successfully.", "تم إنشاء الحساب بنجاح."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "register"), "error");
  } finally {
    setButtonLoading(qs("#register-submit-btn"), false);
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

async function signInWithGoogle() {
  if (!auth || typeof firebase === "undefined" || typeof firebase.auth?.GoogleAuthProvider !== "function") {
    showAuthMessage(t("Google sign-in is unavailable.", "تسجيل الدخول عبر Google غير متاح."));
    return;
  }

  try {
    clearAuthMessage();
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    closeAuthModal();
    showToast(t("Logged in with Google successfully.", "تم تسجيل الدخول عبر Google بنجاح."), "success");
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error, "google"), "error");
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
// Booking Submit
// ──────────────────────────────────────────
function buildBookingPayload() {
  updateBookingStateFromInputs();

  return {
    reference: generateBookingReference(),
    propertyId: bookingState.propertyId || null,
    propertyTitle: getPropertyTitle(),
    propertyLocation: getPropertyLocation(),
    propertyType: getPropertyType(),
    propertyImage: getPropertyImage(),

    userId: currentUser?.uid || null,
    userEmail: currentUser?.email || cleanText(els.guestEmail?.value),

    guest: {
      name: cleanText(els.guestName?.value),
      email: cleanText(els.guestEmail?.value),
      phone: cleanText(els.guestPhone?.value),
      billingName: cleanText(els.billingName?.value),
      specialNotes: cleanText(els.specialNotes?.value)
    },

    stay: {
      checkIn: bookingState.checkIn,
      checkOut: bookingState.checkOut,
      nights: bookingState.nights,
      guests: bookingState.guestCount
    },

    pricing: {
      pricePerNight: getPropertyPrice(),
      subtotal: getEstimatedSubtotal(),
      serviceFee: getEstimatedServiceFee(),
      taxes: getEstimatedTaxes(),
      total: getEstimatedTotal()
    },

    payment: {
      methodValue: bookingState.paymentValue,
      methodLabel: bookingState.paymentMethod,
      proofName: bookingState.paymentProofName || "",
      proofUrl: bookingState.paymentProofUrl || null
    },

    rewardPoints: bookingState.rewardPoints,
    lang: bookingState.lang,
    status: "pending",
    createdAt: new Date().toISOString()
  };
}

async function saveBooking(payload) {
  if (db) {
    const docRef = await db.collection("bookings").add(payload);
    return docRef.id;
  }

  const items = safeJsonGet(LOCAL_BOOKINGS_KEY, []);
  const localId = `local_${Date.now()}`;
  items.unshift({ id: localId, ...payload });
  safeJsonSet(LOCAL_BOOKINGS_KEY, items);
  return localId;
}

function clearDraftAfterSubmit() {
  safeRemove(BOOKING_DRAFT_KEY);
  bookingState.paymentProofName = "";
  bookingState.paymentProofUrl = null;
  bookingState.paymentProofUploading = false;
}

async function confirmBooking() {
  if (!validateStep1()) {
    setStep(1);
    return;
  }

  if (!validateStep2()) {
    setStep(2);
    return;
  }

  if (!validateStep3()) {
    setStep(3);
    return;
  }

  if (bookingState.paymentProofUploading) {
    showGlobalAlert(t("Please wait until the file upload is complete.", "يرجى الانتظار حتى يكتمل رفع الملف."));
    return;
  }

  try {
    setButtonLoading(els.btnConfirmBooking, true, t("Confirming booking...", "جارٍ تأكيد الحجز..."));
    const payload = buildBookingPayload();
    const bookingId = await saveBooking(payload);

    clearDraftAfterSubmit();
    safeSet("lastBookingId", bookingId);
    safeSet("lastBookingReference", payload.reference);

    if (typeof confetti === "function") {
      confetti({
        particleCount: 130,
        spread: 70,
        origin: { y: 0.6 }
      });
    }

    showToast(t("Booking submitted successfully.", "تم إرسال الحجز بنجاح."), "success");

    setTimeout(() => {
      const target = `booking-success.html?id=${encodeURIComponent(bookingId)}&ref=${encodeURIComponent(payload.reference)}`;
      window.location.href = target;
    }, 900);
  } catch (error) {
    console.error("Booking confirmation error:", error);
    showGlobalAlert(t("Failed to confirm booking. Please try again.", "تعذر تأكيد الحجز. حاول مرة أخرى."));
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
    updateDirection();
    updateLangButton();
    applyTranslations();
    renderPropertySummary();
    updateSummary();
    updateReview();
  });

  els.themeToggle?.addEventListener("click", () => {
    bookingState.theme = bookingState.theme === "dark" ? "light" : "dark";
    safeSet("ore_theme", bookingState.theme);
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
    if (!els.profileDropdown?.contains(e.target) && !els.openAuthBtn?.contains(e.target)) {
      toggleProfileDropdown(false);
    }
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

  els.logoutBtn?.addEventListener("click", logoutUser);

  els.myBookingsBtn?.addEventListener("click", () => {
    window.location.href = "my-bookings.html";
  });

  els.myFavoritesBtn?.addEventListener("click", () => {
    window.location.href = "favorites.html";
  });
}

function bindAuthEvents() {
  els.loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = cleanText(els.loginEmail?.value);
    const password = cleanText(els.loginPassword?.value);

    if (!validateEmail(email)) {
      showAuthMessage(t("Please enter a valid email.", "يرجى إدخال بريد صالح."));
      return;
    }

    if (!password) {
      showAuthMessage(t("Please enter your password.", "يرجى إدخال كلمة المرور."));
      return;
    }

    await loginWithEmail(email, password);
  });

  els.registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = cleanText(els.regName?.value);
    const email = cleanText(els.regEmail?.value);
    const password = cleanText(els.regPassword?.value);

    if (!name) {
      showAuthMessage(t("Please enter your full name.", "يرجى إدخال الاسم الكامل."));
      return;
    }

    if (!validateEmail(email)) {
      showAuthMessage(t("Please enter a valid email.", "يرجى إدخال بريد صالح."));
      return;
    }

    if (password.length < 6) {
      showAuthMessage(t("Password must be at least 6 characters.", "كلمة المرور يجب أن تكون 6 أحرف على الأقل."));
      return;
    }

    await registerWithEmail(name, email, password);
  });

  els.forgotForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = cleanText(els.forgotEmail?.value);

    if (!validateEmail(email)) {
      showAuthMessage(t("Please enter a valid email.", "يرجى إدخال بريد صالح."));
      return;
    }

    await sendResetEmail(email);
  });

  getById("google-login-btn")?.addEventListener("click", signInWithGoogle);
  getById("google-register-btn")?.addEventListener("click", signInWithGoogle);

  if (auth) {
    auth.onAuthStateChanged((user) => {
      updateAuthUI(user);
      if (user?.email && els.guestEmail && !els.guestEmail.value) {
        els.guestEmail.value = user.email;
      }
      if (user?.displayName && els.guestName && !els.guestName.value) {
        els.guestName.value = user.displayName;
      }
      updateSummary();
      updateReview();
    });
  } else {
    updateAuthUI(null);
  }
}

function bindPaymentEvents() {
  els.paymentCards.forEach(card => {
    card.addEventListener("click", () => {
      const radio = card.querySelector('input[type="radio"]');
      if (!radio) return;
      radio.checked = true;
      updatePaymentCardsUI();
      saveDraft();
    });
  });

  els.paymentRadios.forEach(radio => {
    radio.addEventListener("change", () => {
      updatePaymentCardsUI();
      saveDraft();
    });
  });

  els.paymentProof?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handlePaymentProofUpload(file);
  });

  els.copyIbanBtn?.addEventListener("click", async () => {
    const value = cleanText(els.bankIban?.textContent);
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      showToast(t("IBAN copied.", "تم نسخ رقم الحساب."), "success");
    } catch (_) {
      showToast(t("Failed to copy.", "تعذر النسخ."), "error");
    }
  });

  els.copyReferenceBtn?.addEventListener("click", async () => {
    const value = generateBookingReference();
    try {
      await navigator.clipboard.writeText(value);
      showToast(t("Reference copied.", "تم نسخ المرجع."), "success");
    } catch (_) {
      showToast(t("Failed to copy.", "تعذر النسخ."), "error");
    }
  });
}

function bindBookingEvents() {
  const liveInputs = [
    els.guestName,
    els.guestEmail,
    els.guestPhone,
    els.billingName,
    els.specialNotes,
    els.checkInDate,
    els.checkOutDate,
    els.guestCount
  ].filter(Boolean);

  liveInputs.forEach(input => {
    const eventName = ["SELECT", "INPUT", "TEXTAREA"].includes(input.tagName) ? "input" : "change";
    input.addEventListener(eventName, () => {
      updateSummary();
      updateReview();
      hideGlobalAlert();
    });

    if (eventName !== "change") {
      input.addEventListener("change", () => {
        updateSummary();
        updateReview();
        hideGlobalAlert();
      });
    }
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

  els.editStep1Btns.forEach(btn => btn.addEventListener("click", () => setStep(1)));
  els.editStep2Btns.forEach(btn => btn.addEventListener("click", () => setStep(2)));

  document.querySelectorAll("[data-edit-step]").forEach(btn => {
    btn.addEventListener("click", () => {
      const step = parsePositiveInt(btn.getAttribute("data-edit-step"), 1);
      setStep(Math.min(3, Math.max(1, step)));
    });
  });
}

// ──────────────────────────────────────────
// Init
// ──────────────────────────────────────────
async function init() {
  if (bookingState.initialized) return;
  bookingState.initialized = true;

  updateDirection();
  applyTheme();
  updateLangButton();
  applyTranslations();
  bindGeneralEvents();
  bindAuthEvents();

  hydrateStayContext();
  hydrateGuestBasics();
  hydrateDraft();

  updateDateConstraints();
  await loadPropertyData();

  bindPaymentEvents();
  bindBookingEvents();

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
