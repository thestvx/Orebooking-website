// =========================================
// booking.js — OreBooking v17.1
// Safe booking flow + auth + payment
// Fixed stale customer name/email leak
// User-scoped draft storage
// FIXED: Language switching (AR <-> EN)
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
  if (Number.isNaN(d.getTime())) return null;

  if (
    d.getFullYear() !== parts.year ||
    d.getMonth() !== parts.month - 1 ||
    d.getDate() !== parts.day
  ) {
    return null;
  }

  return d;
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

function isPastDate(dateStr) {
  const d = parseDate(dateStr);
  const today = parseDate(todayInputValue());
  if (!d || !today) return false;
  return d.getTime() < today.getTime();
}

function getSafeCheckIn(dateStr) {
  const value = cleanText(dateStr);
  if (!value) return "";
  if (isPastDate(value)) return "";
  return parseDate(value) ? value : "";
}

function getSafeCheckOut(checkIn, checkOut) {
  const inDate = getSafeCheckIn(checkIn);
  const out = cleanText(checkOut);

  if (!inDate) return "";
  if (!out) return "";
  if (isPastDate(out)) return "";
  if (!parseDate(out)) return "";

  const nights = getDiffNights(inDate, out);
  if (nights < 1) return "";

  return out;
}

function clearLegacyDateStorage() {
  [
    "booking_check_in",
    "booking_check_out",
    "selectedCheckIn",
    "selectedCheckOut",
    "ore_booking_check_in",
    "ore_booking_check_out",
    "ore_guest_basics",
    "ore_booking_draft_v4"
  ].forEach((key) => safeRemove(key));
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

function generateReference(prefix = "ORE") {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${y}${m}${d}-${rand}`;
}

function getCurrentUserScope() {
  return currentUser?.uid ? `user_${currentUser.uid}` : "guest";
}

function getBookingDraftKey() {
  return `ore_booking_draft_v6_${getCurrentUserScope()}`;
}

function getGuestBasicsKey() {
  return `ore_guest_basics_v2_${getCurrentUserScope()}`;
}

function clearGuestIdentityFields() {
  if (bookingFields.guestName) bookingFields.guestName.value = "";
  if (bookingFields.guestEmail) bookingFields.guestEmail.value = "";
}

function clearAllBookingFields() {
  Object.values(bookingFields).forEach((el) => {
    if (!el) return;
    if (el.tagName === "SELECT") {
      el.selectedIndex = 0;
    } else if (el.type === "number") {
      if (el.id === "guest-adults") el.value = "1";
      else if (el.id === "guest-children") el.value = "0";
      else el.value = "";
    } else if ("value" in el) {
      el.value = "";
    }
  });

  if (els.agreePolicy) els.agreePolicy.checked = false;
  if (els.paymentProof) els.paymentProof.value = "";
}

function clearScopedDrafts(scope = getCurrentUserScope()) {
  safeRemove(`ore_booking_draft_v6_${scope}`);
  safeRemove(`ore_guest_basics_v2_${scope}`);
}

// ──────────────────────────────────────────
// Date Input Enhancement
// ──────────────────────────────────────────
function sanitizeDateDigits(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

function formatDateDigits(digits) {
  const clean = sanitizeDateDigits(digits);
  if (!clean) return "";
  if (clean.length <= 4) return clean;
  if (clean.length <= 6) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
  return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`;
}

function normalizeDateInputLoose(value) {
  const raw = cleanText(value);
  if (!raw) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }

  return formatDateDigits(raw);
}

function normalizeDateInputStrict(value) {
  const formatted = normalizeDateInputLoose(value);
  const parsed = parseDate(formatted);
  if (!parsed) return formatted;
  return formatDateInput(parsed);
}

function getCaretOffsetFromDigits(value, caretPos) {
  const before = String(value || "").slice(0, caretPos);
  return (before.match(/\d/g) || []).length;
}

function getCaretPositionFromDigitsCount(formattedValue, digitsCount) {
  if (digitsCount <= 0) return 0;
  let seen = 0;
  for (let i = 0; i < formattedValue.length; i += 1) {
    if (/\d/.test(formattedValue[i])) {
      seen += 1;
      if (seen >= digitsCount) return i + 1;
    }
  }
  return formattedValue.length;
}

function handleDateTypingInput(el) {
  if (!el) return;

  const rawValue = el.value;
  const caret = typeof el.selectionStart === "number" ? el.selectionStart : rawValue.length;
  const digitOffset = getCaretOffsetFromDigits(rawValue, caret);
  const formatted = formatDateDigits(rawValue);

  if (formatted !== rawValue) {
    el.value = formatted;
    const nextCaret = getCaretPositionFromDigitsCount(formatted, digitOffset);
    try {
      el.setSelectionRange(nextCaret, nextCaret);
    } catch (_) {}
  }
}

function enhanceDateInput(el, options = {}) {
  if (!el || el.dataset.dateEnhanced === "true") return;

  const { allowPast = false, onCommit = null } = options;

  el.dataset.dateEnhanced = "true";
  el.setAttribute("type", "text");
  el.setAttribute("inputmode", "numeric");
  el.setAttribute("autocomplete", "off");
  el.setAttribute("autocapitalize", "off");
  el.setAttribute("autocorrect", "off");
  el.setAttribute("spellcheck", "false");
  el.setAttribute("dir", "ltr");

  if (!el.getAttribute("placeholder")) {
    el.setAttribute("placeholder", "YYYY-MM-DD");
  }

  el.addEventListener("input", () => {
    handleDateTypingInput(el);
    markInvalid(el, false);
  });

  el.addEventListener("paste", () => {
    requestAnimationFrame(() => {
      handleDateTypingInput(el);
    });
  });

  el.addEventListener("blur", () => {
    const normalized = normalizeDateInputStrict(el.value);
    if (!normalized) {
      el.value = "";
    } else if (!allowPast && isPastDate(normalized)) {
      el.value = "";
    } else {
      el.value = normalized;
    }

    if (typeof onCommit === "function") onCommit();
  });

  el.addEventListener("change", () => {
    const normalized = normalizeDateInputStrict(el.value);
    if (!normalized) {
      el.value = "";
    } else if (!allowPast && isPastDate(normalized)) {
      el.value = "";
    } else {
      el.value = normalized;
    }

    if (typeof onCommit === "function") onCommit();
  });

  el.addEventListener("keydown", (e) => {
    const allowed = [
      "Backspace",
      "Delete",
      "Tab",
      "Escape",
      "Enter",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End"
    ];

    if (allowed.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (/^\d$/.test(e.key)) return;
    if (e.key === "-") return;

    e.preventDefault();
  });
}

function setupDateInputs() {
  enhanceDateInput(bookingFields.arrivalDate, {
    allowPast: false,
    onCommit: () => {
      updateBookingStateFromInputs();
      updateDateConstraints();
      updateSummary();
      updateReview();
      saveDraft();
    }
  });

  enhanceDateInput(bookingFields.departureDate, {
    allowPast: false,
    onCommit: () => {
      updateBookingStateFromInputs();
      updateDateConstraints();
      updateSummary();
      updateReview();
      saveDraft();
    }
  });

  enhanceDateInput(bookingFields.transferDate, {
    allowPast: false,
    onCommit: () => {
      updateBookingStateFromInputs();
      updateSummary();
      updateReview();
      saveDraft();
    }
  });
}

// ──────────────────────────────────────────
// State
// ──────────────────────────────────────────
let currentUser = null;
let isUpdatingUI = false;

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
  bookingReference: "",

  stayDetails: {
    bedType: ""
  }
};

// ──────────────────────────────────────────
// FIX: Translation helper t() reads live lang
// ──────────────────────────────────────────
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

  navLogoImg: qs(".navbar .logo img"),
  authLogoImg: qs(".auth-header img"),

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
  summaryBedType: getById("summary-bed-type"),

  reviewGuestName: getById("rev-name", "review-guest-name"),
  reviewGuestEmail: getById("rev-email", "review-guest-email"),
  reviewGuestPhone: getById("rev-phone", "review-guest-phone"),
  reviewNationalityGender: getById("rev-nationality-gender"),
  reviewStayDates: getById("rev-dates", "review-stay-dates"),
  reviewGuests: getById("rev-guests", "review-guests"),
  reviewPurposeArrival: getById("rev-purpose-arrival"),
  reviewAdditionalGuests: getById("rev-additional-guests"),
  reviewDocuments: getById("rev-documents", "review-payment-proof"),
  reviewBillings: getById("rev-billings", "review-billing-name"),
  reviewSpecialRequests: getById("rev-special-requests", "review-special-notes"),
  reviewPaymentMethod: getById("rev-payment-method"),
  reviewPoints: getById("rev-points", "review-points"),
  reviewPointsInline: getById("review-points-inline"),
  reviewBedType: getById("rev-bed-type"),

  editStep1Btns: [
    getById("btn-edit-guest"),
    getById("btn-edit-details"),
    getById("btn-edit-dates")
  ].filter(Boolean),

  editStep2Btns: [getById("btn-edit-payment")].filter(Boolean)
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
  bedType: getById("bed-type"),
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

function showBookingSuccessPopup(reference = "") {
  const old = document.getElementById("booking-success-popup-backdrop");
  if (old) old.remove();

  const backdrop = document.createElement("div");
  backdrop.id = "booking-success-popup-backdrop";
  backdrop.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.38);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    z-index: 8000;
    animation: oreFadeIn .2s ease;
  `;

  const card = document.createElement("div");
  card.style.cssText = `
    width: min(92vw, 420px);
    background: ${bookingState.theme === "dark" ? "#111827" : "#ffffff"};
    color: ${bookingState.theme === "dark" ? "#f9fafb" : "#111827"};
    border-radius: 24px;
    padding: 24px 22px;
    box-shadow: 0 28px 60px rgba(15,23,42,.22);
    text-align: center;
    border: 1px solid rgba(148,163,184,.18);
    animation: oreScaleIn .22s ease;
  `;

  const title = t("Booking received", "تم استلام الحجز");
  const message = t(
    "We received your booking and it will be reviewed soon. We will contact you shortly.",
    "وصلنا حجزك وسيتم النظر فيه والرد عليك قريبًا."
  );
  const refLabel = t("Reference", "رقم المرجع");
  const closeText = t("Done", "تم");

  card.innerHTML = `
    <div style="width:72px;height:72px;border-radius:50%;margin:0 auto 16px;background:linear-gradient(135deg,#10b981,#34d399);display:flex;align-items:center;justify-content:center;color:#fff;">
      <i class="ph ph-check" style="font-size:2rem;"></i>
    </div>
    <h3 style="margin:0 0 10px;font-size:1.35rem;font-weight:800;">${escapeHtml(title)}</h3>
    <p style="margin:0 0 14px;line-height:1.8;color:${bookingState.theme === "dark" ? "#d1d5db" : "#4b5563"};">${escapeHtml(message)}</p>
    ${reference ? `<div style="margin:0 0 18px;padding:12px 14px;border-radius:14px;background:${bookingState.theme === "dark" ? "rgba(31,41,55,.9)" : "#f8fafc"};font-weight:700;">${escapeHtml(refLabel)}: ${escapeHtml(reference)}</div>` : ""}
    <button type="button" id="booking-success-popup-close" style="border:none;background:#10b981;color:#fff;padding:12px 18px;border-radius:14px;font-weight:800;cursor:pointer;min-width:120px;">
      ${escapeHtml(closeText)}
    </button>
  `;

  backdrop.appendChild(card);
  document.body.appendChild(backdrop);
  document.body.classList.add("modal-open");

  if (!document.getElementById("booking-success-popup-styles")) {
    const style = document.createElement("style");
    style.id = "booking-success-popup-styles";
    style.textContent = `
      @keyframes oreFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes oreScaleIn {
        from { opacity: 0; transform: scale(.96) translateY(6px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  function closePopup() {
    backdrop.remove();
    document.body.classList.remove("modal-open");
  }

  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closePopup();
  });

  card.querySelector("#booking-success-popup-close")?.addEventListener("click", closePopup);
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
  if (els.agreePolicy) markInvalid(els.agreePolicy, false);
}

function scrollToFirstInvalid() {
  const target = document.querySelector(".invalid, [aria-invalid='true']");
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

function updateThemeLogos() {
  const isDark = bookingState.theme === "dark";
  const lightLogo = "logos/orebooking.png";
  const darkLogo = "logos/orebooking2.png";
  const logoPath = isDark ? darkLogo : lightLogo;

  if (els.navLogoImg) {
    els.navLogoImg.src = logoPath;
    els.navLogoImg.setAttribute("src", logoPath);
    els.navLogoImg.setAttribute("alt", "OreBooking");
  }

  if (els.authLogoImg) {
    els.authLogoImg.src = logoPath;
    els.authLogoImg.setAttribute("src", logoPath);
    els.authLogoImg.setAttribute("alt", "OreBooking");
  }
}

function applyTheme() {
  const isDark = bookingState.theme === "dark";
  els.body?.classList.toggle("dark", isDark);
  if (els.html) els.html.style.colorScheme = isDark ? "dark" : "light";

  const icon = els.themeToggle?.querySelector("i");
  if (icon) {
    icon.className = isDark ? "ph ph-sun" : "ph ph-moon";
  }

  updateThemeLogos();
}

function updateLangButton() {
  const span = els.langToggle?.querySelector("span");
  if (!span) return;
  // FIX: show the OTHER language (the one you can switch TO)
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

// ──────────────────────────────────────────
// FIX: refreshLocalizedUI — full redraw on
//      language change, no stale text left
// ──────────────────────────────────────────
function refreshLocalizedUI() {
  updateDirection();
  updateLangButton();
  applyTranslations();
  updateAuthUI(currentUser);
  renderPropertySummary();
  updatePaymentCardsUI();

  // Re-render all dynamic text that uses t()
  updateBookingStateFromInputs();
  updateSummary();
  updateReview();

  // Re-render upload label if no file chosen yet
  if (els.uploadText && !bookingState.paymentProofName) {
    els.uploadText.textContent = t(
      "Click to upload payment receipt",
      "اضغط لرفع إيصال الدفع"
    );
  }

  // Re-render any visible global alert text
  hideGlobalAlert();
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
  toggleProfileDropdown(false);
  els.authModal?.classList.add("active");
  document.body.classList.add("modal-open");
}

function closeAuthModal() {
  els.authModal?.classList.remove("active");
  document.body.classList.remove("modal-open");
}

function toggleProfileDropdown(force = null) {
  if (!els.profileDropdown || !els.openAuthBtn) return;

  const active = typeof force === "boolean"
    ? force
    : !els.profileDropdown.classList.contains("active");

  els.profileDropdown.classList.toggle("active", active);
  els.openAuthBtn.setAttribute("aria-expanded", active ? "true" : "false");
}

function handleProfileButtonClick(e) {
  e.preventDefault();
  e.stopPropagation();

  if (currentUser) {
    toggleProfileDropdown();
  } else {
    toggleProfileDropdown(false);
    openAuthModal("login");
  }
}

function fillAuthenticatedGuestFields(user) {
  if (!user) return;

  setValueIfEmpty(bookingFields.guestName, cleanText(user.displayName));
  setValueIfEmpty(bookingFields.guestEmail, cleanText(user.email));
  setValueIfEmpty(bookingFields.billingName, cleanText(user.displayName));
}

function updateAuthUI(user) {
  currentUser = user || null;

  const name = cleanText(user?.displayName) || t("Guest User", "زائر");
  const email = cleanText(user?.email) || t("Sign in to continue", "سجل الدخول للمتابعة");

  setText(els.dropdownUserName, name);
  setText(els.dropdownUserEmail, email);

  const icon = els.openAuthBtn?.querySelector("i");
  if (icon) {
    icon.className = user ? "ph ph-user-circle-check" : "ph ph-user";
  }

  if (els.myBookingsBtn) {
    els.myBookingsBtn.style.display = user ? "flex" : "none";
  }

  if (els.myFavoritesBtn) {
    els.myFavoritesBtn.style.display = user ? "flex" : "none";
  }

  if (els.logoutBtn) {
    els.logoutBtn.style.display = user ? "flex" : "none";
  }

  if (user) {
    fillAuthenticatedGuestFields(user);
  }

  toggleProfileDropdown(false);
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
    const oldScope = getCurrentUserScope();

    clearScopedDrafts(oldScope);
    clearAllBookingFields();
    clearGuestIdentityFields();

    if (auth) await auth.signOut();

    toggleProfileDropdown(false);
    updateSummary();
    updateReview();
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
    const span = els.propMiniLoc.querySelector("span");
    if (span) span.textContent = getPropertyLocation();
    else els.propMiniLoc.textContent = getPropertyLocation();
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

function updatePaymentCardsUI() {
  const selected = getSelectedPaymentValue();

  els.paymentCards.forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    card.classList.toggle("selected", !!radio && radio.value === selected);
  });

  bookingState.paymentValue = selected;
  // FIX: re-evaluate label using current lang
  bookingState.paymentMethod = getPaymentMethodLabel(selected);

  if (els.bankTransferBox) els.bankTransferBox.classList.toggle("active", selected === "ccp" || selected === "bank");
  if (els.cashBox) els.cashBox.classList.toggle("active", selected === "cash");
  if (els.cardBox) els.cardBox.classList.toggle("active", selected === "card");
}

function updateBookingStateFromInputs() {
  const checkIn = getSafeCheckIn(getFieldValue("arrivalDate"));
  const checkOut = getSafeCheckOut(checkIn, getFieldValue("departureDate"));

  bookingState.checkIn = checkIn;
  bookingState.checkOut = checkOut;
  bookingState.nights = checkIn && checkOut ? getDiffNights(checkIn, checkOut) : 0;

  const adults = parsePositiveInt(getFieldValue("guestAdults", "1"), 1);
  const children = parsePositiveInt(getFieldValue("guestChildren", "0"), 0);
  bookingState.guestCount = Math.max(1, adults + children);

  bookingState.stayDetails.bedType = getFieldSelectedText("bedType", getFallbackText());
  bookingState.paymentValue = getSelectedPaymentValue();
  // FIX: always re-evaluate label with current lang
  bookingState.paymentMethod = getPaymentMethodLabel(bookingState.paymentValue);

  if (!bookingState.bookingReference) {
    bookingState.bookingReference = generateReference();
  }

  if (els.paymentReference) {
    els.paymentReference.textContent = bookingState.bookingReference;
  }
}

function updateDateConstraints() {
  const today = todayInputValue();

  if (bookingFields.arrivalDate && !cleanText(bookingFields.arrivalDate.value)) {
    bookingFields.arrivalDate.placeholder = today;
  }

  if (bookingFields.departureDate && bookingState.checkIn) {
    const nextDay = addDays(bookingState.checkIn, 1);
    if (!cleanText(bookingFields.departureDate.value)) {
      bookingFields.departureDate.placeholder = nextDay || "YYYY-MM-DD";
    }
  }
}

function updateSummary() {
  updateBookingStateFromInputs();

  const nightly = getPropertyPrice();
  const nights = bookingState.nights;
  const serviceFee = nights > 0 ? Math.round(nightly * nights * 0.08) : 0;
  const taxes = nights > 0 ? Math.round(nightly * nights * 0.06) : 0;
  const total = nightly * nights + serviceFee + taxes;

  // FIX: formatDateDisplay and t() now use live bookingState.lang
  setText(els.summaryCheckin, bookingState.checkIn ? formatDateDisplay(bookingState.checkIn) : "-");
  setText(els.summaryCheckout, bookingState.checkOut ? formatDateDisplay(bookingState.checkOut) : "-");
  setText(els.summaryGuests, String(bookingState.guestCount || 1));
  setText(els.summaryBedType, bookingState.stayDetails.bedType || "-");

  setText(els.summaryPriceNight, formatCurrency(nightly));
  setText(els.summaryNights, String(nights));
  setText(els.summaryServiceFee, formatCurrency(serviceFee));
  setText(els.summaryTaxes, formatCurrency(taxes));
  setText(els.summaryTotal, formatCurrency(total));

  bookingState.rewardPoints = total > 0 ? Math.max(10, Math.round(total / 1000)) : 0;
  setText(els.reviewPoints, String(bookingState.rewardPoints));
  setText(els.reviewPointsInline, String(bookingState.rewardPoints));
}

function updateReview() {
  // FIX: getFallbackText() and t() now use live bookingState.lang
  setText(els.reviewGuestName, getFieldValue("guestName", getFallbackText()));
  setText(els.reviewGuestEmail, getFieldValue("guestEmail", getFallbackText()));
  setText(els.reviewGuestPhone, getFieldValue("guestPhone", getFallbackText()));
  setText(els.reviewNationalityGender, getFieldValue("guestCountry", getFallbackText()));

  const datesText = bookingState.checkIn && bookingState.checkOut
    ? `${formatDateDisplay(bookingState.checkIn)} — ${formatDateDisplay(bookingState.checkOut)}`
    : getFallbackText();
  setText(els.reviewStayDates, datesText);

  const adults = parsePositiveInt(getFieldValue("guestAdults", "1"), 1);
  const children = parsePositiveInt(getFieldValue("guestChildren", "0"), 0);
  setText(els.reviewGuests, `${adults} + ${children}`);

  const purpose = getFieldSelectedText("stayPurpose", getFallbackText());
  const arrival = getFieldSelectedText("arrivalTime", getFallbackText());
  setText(els.reviewPurposeArrival, `${purpose} / ${arrival}`);

  setText(els.reviewBedType, getFieldSelectedText("bedType", getFallbackText()));
  setText(els.reviewDocuments, bookingState.paymentProofName || t("Not uploaded", "لم يتم الرفع"));
  setText(els.reviewBillings, getFieldValue("billingName", getFallbackText()));
  setText(els.reviewSpecialRequests, getFieldValue("specialRequests", getFallbackText()));
  setText(els.reviewPaymentMethod, bookingState.paymentMethod || getFallbackText());
  setText(els.reviewPoints, String(bookingState.rewardPoints || 0));
}

function setCurrentStep(step) {
  bookingState.currentStep = Math.max(1, Math.min(3, Number(step) || 1));

  [els.step1, els.step2, els.step3].forEach((section, idx) => {
    if (!section) return;
    section.classList.toggle("active", idx + 1 === bookingState.currentStep);
  });

  els.indicators.forEach((indicator, idx) => {
    indicator.classList.toggle("active", idx + 1 <= bookingState.currentStep);
  });

  if (els.connector1) els.connector1.classList.toggle("active", bookingState.currentStep >= 2);
  if (els.connector2) els.connector2.classList.toggle("active", bookingState.currentStep >= 3);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function validateStep1() {
  clearAllInvalidStates();
  hideGlobalAlert();

  const required = [
    bookingFields.guestName,
    bookingFields.guestEmail,
    bookingFields.guestPhone,
    bookingFields.guestCountry,
    bookingFields.arrivalDate,
    bookingFields.departureDate,
    bookingFields.guestAdults,
    bookingFields.arrivalTime,
    bookingFields.stayPurpose,
    bookingFields.bedType
  ];

  let valid = true;

  required.forEach((el) => {
    if (!el) return;
    const empty = !cleanText(el.value);
    if (empty) {
      markInvalid(el, true);
      valid = false;
    }
  });

  if (bookingFields.guestEmail && !validateEmail(bookingFields.guestEmail.value)) {
    markInvalid(bookingFields.guestEmail, true);
    valid = false;
  }

  if (bookingFields.guestPhone && !validatePhone(bookingFields.guestPhone.value)) {
    markInvalid(bookingFields.guestPhone, true);
    valid = false;
  }

  updateBookingStateFromInputs();

  if (!bookingState.checkIn || !bookingState.checkOut || bookingState.nights < 1) {
    markInvalid(bookingFields.arrivalDate, true);
    markInvalid(bookingFields.departureDate, true);
    valid = false;
  }

  if (!valid) {
    showGlobalAlert(t("Please complete the required fields correctly.", "يرجى إكمال الحقول المطلوبة بشكل صحيح."));
    scrollToFirstInvalid();
  }

  return valid;
}

function validateStep2() {
  clearAllInvalidStates();
  hideGlobalAlert();

  let valid = true;

  if (!cleanText(getFieldValue("billingName"))) {
    markInvalid(bookingFields.billingName, true);
    valid = false;
  }

  const payment = getSelectedPaymentValue();

  if (payment === "ccp" || payment === "bank") {
    if (!cleanText(getFieldValue("senderName"))) {
      markInvalid(bookingFields.senderName, true);
      valid = false;
    }

    if (!cleanText(getFieldValue("transferAmount"))) {
      markInvalid(bookingFields.transferAmount, true);
      valid = false;
    }

    if (!cleanText(getFieldValue("transferDate"))) {
      markInvalid(bookingFields.transferDate, true);
      valid = false;
    }
  }

  if (payment === "cash") {
    if (!cleanText(getFieldValue("cashPayerName"))) {
      markInvalid(bookingFields.cashPayerName, true);
      valid = false;
    }

    if (!cleanText(getFieldValue("cashCurrency"))) {
      markInvalid(bookingFields.cashCurrency, true);
      valid = false;
    }
  }

  if (!valid) {
    showGlobalAlert(t("Please complete the payment details.", "يرجى إكمال بيانات الدفع."));
    scrollToFirstInvalid();
  }

  return valid;
}

function validateStep3() {
  clearAllInvalidStates();
  hideGlobalAlert();

  if (!els.agreePolicy?.checked) {
    markInvalid(els.agreePolicy, true);
    showGlobalAlert(t("Please agree to the policy first.", "يرجى الموافقة على الشروط أولاً."));
    scrollToFirstInvalid();
    return false;
  }

  return true;
}

// ──────────────────────────────────────────
// Draft Save / Load
// ──────────────────────────────────────────
function buildDraftPayload() {
  updateBookingStateFromInputs();

  return {
    propertyId: bookingState.propertyId,
    currentStep: bookingState.currentStep,
    bookingReference: bookingState.bookingReference,

    guestName: currentUser?.displayName ? "" : getFieldValue("guestName"),
    guestEmail: currentUser?.email ? "" : getFieldValue("guestEmail"),
    guestPhone: getFieldValue("guestPhone"),
    guestCountry: getFieldValue("guestCountry"),

    guestAdults: getFieldValue("guestAdults", "1"),
    guestChildren: getFieldValue("guestChildren", "0"),
    stayPurpose: getFieldValue("stayPurpose"),
    bedType: getFieldValue("bedType"),
    arrivalDate: getFieldValue("arrivalDate"),
    departureDate: getFieldValue("departureDate"),
    arrivalTime: getFieldValue("arrivalTime"),
    specialRequests: getFieldValue("specialRequests"),

    billingName: getFieldValue("billingName"),
    billingNote: getFieldValue("billingNote"),

    paymentValue: getSelectedPaymentValue(),
    senderName: getFieldValue("senderName"),
    transferAmount: getFieldValue("transferAmount"),
    transferDate: getFieldValue("transferDate"),
    transferTime: getFieldValue("transferTime"),
    cashPayerName: getFieldValue("cashPayerName"),
    cashCurrency: getFieldValue("cashCurrency"),
    cashPaymentNote: getFieldValue("cashPaymentNote"),

    paymentProofUrl: bookingState.paymentProofUrl || null,
    paymentProofName: bookingState.paymentProofName || ""
  };
}

function saveDraft() {
  const payload = buildDraftPayload();
  safeJsonSet(getBookingDraftKey(), payload);

  const guestBasics = {
    guestPhone: payload.guestPhone,
    guestCountry: payload.guestCountry
  };

  if (!currentUser?.displayName) guestBasics.guestName = payload.guestName;
  if (!currentUser?.email) guestBasics.guestEmail = payload.guestEmail;

  safeJsonSet(getGuestBasicsKey(), guestBasics);
}

function applyDraftToFields(draft) {
  if (!draft || typeof draft !== "object") return;

  if (!currentUser?.displayName) setValueIfEmpty(bookingFields.guestName, draft.guestName);
  if (!currentUser?.email) setValueIfEmpty(bookingFields.guestEmail, draft.guestEmail);

  setValueIfEmpty(bookingFields.guestPhone, draft.guestPhone);
  setValueIfEmpty(bookingFields.guestCountry, draft.guestCountry);

  setValueIfEmpty(bookingFields.guestAdults, draft.guestAdults || "1");
  setValueIfEmpty(bookingFields.guestChildren, draft.guestChildren || "0");
  setValueIfEmpty(bookingFields.arrivalDate, draft.arrivalDate);
  setValueIfEmpty(bookingFields.departureDate, draft.departureDate);
  setValueIfEmpty(bookingFields.arrivalTime, draft.arrivalTime);
  setValueIfEmpty(bookingFields.stayPurpose, draft.stayPurpose);
  setValueIfEmpty(bookingFields.bedType, draft.bedType);
  setValueIfEmpty(bookingFields.specialRequests, draft.specialRequests);

  setValueIfEmpty(bookingFields.billingName, draft.billingName);
  setValueIfEmpty(bookingFields.billingNote, draft.billingNote);

  setValueIfEmpty(bookingFields.senderName, draft.senderName);
  setValueIfEmpty(bookingFields.transferAmount, draft.transferAmount);
  setValueIfEmpty(bookingFields.transferDate, draft.transferDate);
  setValueIfEmpty(bookingFields.transferTime, draft.transferTime);

  setValueIfEmpty(bookingFields.cashPayerName, draft.cashPayerName);
  setValueIfEmpty(bookingFields.cashCurrency, draft.cashCurrency);
  setValueIfEmpty(bookingFields.cashPaymentNote, draft.cashPaymentNote);

  bookingState.paymentProofUrl = draft.paymentProofUrl || null;
  bookingState.paymentProofName = draft.paymentProofName || "";

  if (els.uploadText && bookingState.paymentProofName) {
    els.uploadText.textContent = bookingState.paymentProofName;
  }

  if (draft.paymentValue) {
    const radio = document.querySelector(`input[name="paymentmethod"][value="${CSS.escape(draft.paymentValue)}"], input[name="payment-method"][value="${CSS.escape(draft.paymentValue)}"]`);
    if (radio) radio.checked = true;
  }

  bookingState.bookingReference = draft.bookingReference || bookingState.bookingReference;
  if (els.paymentReference && bookingState.bookingReference) {
    els.paymentReference.textContent = bookingState.bookingReference;
  }

  setCurrentStep(draft.currentStep || 1);
  updatePaymentCardsUI();
  updateBookingStateFromInputs();
  updateSummary();
  updateReview();
}

function loadDraft() {
  const draft = safeJsonGet(getBookingDraftKey(), null);
  if (draft) {
    applyDraftToFields(draft);
    return;
  }

  const guestBasics = safeJsonGet(getGuestBasicsKey(), null);
  if (guestBasics && typeof guestBasics === "object") {
    if (!currentUser?.displayName) setValueIfEmpty(bookingFields.guestName, guestBasics.guestName);
    if (!currentUser?.email) setValueIfEmpty(bookingFields.guestEmail, guestBasics.guestEmail);
    setValueIfEmpty(bookingFields.guestPhone, guestBasics.guestPhone);
    setValueIfEmpty(bookingFields.guestCountry, guestBasics.guestCountry);
  }

  updateBookingStateFromInputs();
  updateSummary();
  updateReview();
}

// ──────────────────────────────────────────
// Upload
// ──────────────────────────────────────────
async function handlePaymentProofUpload(file) {
  if (!file) return;

  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  const maxSize = 5 * 1024 * 1024;

  if (!allowed.includes(file.type)) {
    showToast(t("Unsupported file type.", "نوع الملف غير مدعوم."), "error");
    return;
  }

  if (file.size > maxSize) {
    showToast(t("File is too large.", "الملف كبير جدًا."), "error");
    return;
  }

  if (!storage) {
    bookingState.paymentProofName = file.name;
    bookingState.paymentProofUrl = null;
    if (els.uploadText) els.uploadText.textContent = file.name;
    saveDraft();
    showToast(t("File attached locally.", "تم إرفاق الملف محليًا."), "success");
    return;
  }

  try {
    bookingState.paymentProofUploading = true;
    if (els.uploadText) els.uploadText.textContent = t("Uploading...", "جارٍ الرفع...");

    const ref = storage.ref().child(`booking-proofs/${getCurrentUserScope()}/${Date.now()}_${file.name}`);
    await ref.put(file);
    const url = await ref.getDownloadURL();

    bookingState.paymentProofUrl = url;
    bookingState.paymentProofName = file.name;
    if (els.uploadText) els.uploadText.textContent = file.name;

    saveDraft();
    updateReview();
    showToast(t("Receipt uploaded successfully.", "تم رفع الإيصال بنجاح."), "success");
  } catch (error) {
    console.error("Upload error:", error);
    if (els.uploadText) els.uploadText.textContent = t("Upload failed", "فشل الرفع");
    showToast(t("Failed to upload file.", "تعذر رفع الملف."), "error");
  } finally {
    bookingState.paymentProofUploading = false;
  }
}

// ──────────────────────────────────────────
// Booking Persistence
// ──────────────────────────────────────────
function buildBookingPayload() {
  updateBookingStateFromInputs();
  updateSummary();

  const nightly = getPropertyPrice();
  const nights = bookingState.nights;
  const serviceFee = nights > 0 ? Math.round(nightly * nights * 0.08) : 0;
  const taxes = nights > 0 ? Math.round(nightly * nights * 0.06) : 0;
  const total = nightly * nights + serviceFee + taxes;

  return {
    reference: bookingState.bookingReference || generateReference(),
    userId: currentUser?.uid || null,
    userEmail: cleanText(currentUser?.email) || getFieldValue("guestEmail"),
    userDisplayName: cleanText(currentUser?.displayName) || getFieldValue("guestName"),

    propertyId: bookingState.propertyId || null,
    propertyTitle: getPropertyTitle(),
    propertyLocation: getPropertyLocation(),
    propertyType: getPropertyType(),
    propertyImage: getPropertyImage(),

    guestName: getFieldValue("guestName"),
    guestEmail: getFieldValue("guestEmail"),
    guestPhone: getFieldValue("guestPhone"),
    guestCountry: getFieldValue("guestCountry"),

    checkIn: bookingState.checkIn,
    checkOut: bookingState.checkOut,
    nights,
    adults: parsePositiveInt(getFieldValue("guestAdults", "1"), 1),
    children: parsePositiveInt(getFieldValue("guestChildren", "0"), 0),
    guestCount: bookingState.guestCount,

    arrivalTime: getFieldValue("arrivalTime"),
    stayPurpose: getFieldValue("stayPurpose"),
    bedType: getFieldValue("bedType"),
    specialRequests: getFieldValue("specialRequests"),

    billingName: getFieldValue("billingName"),
    billingNote: getFieldValue("billingNote"),

    paymentMethod: bookingState.paymentMethod,
    paymentValue: bookingState.paymentValue,
    senderName: getFieldValue("senderName"),
    transferAmount: getFieldValue("transferAmount"),
    transferDate: getFieldValue("transferDate"),
    transferTime: getFieldValue("transferTime"),
    cashPayerName: getFieldValue("cashPayerName"),
    cashCurrency: getFieldValue("cashCurrency"),
    cashPaymentNote: getFieldValue("cashPaymentNote"),
    paymentProofUrl: bookingState.paymentProofUrl || null,
    paymentProofName: bookingState.paymentProofName || "",

    nightlyPrice: nightly,
    serviceFee,
    taxes,
    total,
    rewardPoints: bookingState.rewardPoints || 0,
    status: "pending",
    createdAt: new Date()
  };
}

function saveBookingLocally(payload) {
  const list = safeJsonGet(LOCAL_BOOKINGS_KEY, []);
  list.unshift({
    ...payload,
    createdAt: new Date().toISOString()
  });
  safeJsonSet(LOCAL_BOOKINGS_KEY, list);
}

async function saveBookingRemotely(payload) {
  if (!db) return false;

  try {
    await db.collection("bookings").add(payload);
    return true;
  } catch (error) {
    console.error("Remote booking save error:", error);
    return false;
  }
}

async function confirmBooking() {
  if (!validateStep1()) {
    setCurrentStep(1);
    return;
  }

  if (!validateStep2()) {
    setCurrentStep(2);
    return;
  }

  if (!validateStep3()) {
    setCurrentStep(3);
    return;
  }

  if (bookingState.paymentProofUploading) {
    showToast(t("Please wait until upload finishes.", "يرجى الانتظار حتى ينتهي الرفع."), "info");
    return;
  }

  try {
    setButtonLoading(els.btnConfirmBooking, true, t("Confirming...", "جارٍ تأكيد الحجز..."));

    const payload = buildBookingPayload();
    bookingState.bookingReference = payload.reference;

    const savedRemote = await saveBookingRemotely(payload);
    if (!savedRemote) saveBookingLocally(payload);

    clearScopedDrafts(getCurrentUserScope());
    showBookingSuccessPopup(payload.reference);
    showToast(
      savedRemote
        ? t("Booking submitted successfully.", "تم إرسال الحجز بنجاح.")
        : t("Booking saved locally.", "تم حفظ الحجز محليًا."),
      "success"
    );

    clearAllBookingFields();
    fillAuthenticatedGuestFields(currentUser);
    bookingState.paymentProofName = "";
    bookingState.paymentProofUrl = null;
    bookingState.bookingReference = generateReference();
    if (els.paymentReference) els.paymentReference.textContent = bookingState.bookingReference;
    if (els.uploadText) els.uploadText.textContent = t("Click to upload payment receipt", "اضغط لرفع إيصال الدفع");

    updatePaymentCardsUI();
    setCurrentStep(1);
    updateBookingStateFromInputs();
    updateSummary();
    updateReview();
  } catch (error) {
    console.error("Confirm booking error:", error);
    showToast(t("Failed to confirm booking.", "تعذر تأكيد الحجز."), "error");
  } finally {
    setButtonLoading(els.btnConfirmBooking, false);
  }
}

// ──────────────────────────────────────────
// Events
// ──────────────────────────────────────────
function setupFieldAutosave() {
  Object.values(bookingFields).forEach((el) => {
    if (!el) return;

    const eventName = el.tagName === "SELECT" ? "change" : "input";

    el.addEventListener(eventName, () => {
      updateBookingStateFromInputs();
      updatePaymentCardsUI();
      updateSummary();
      updateReview();
      saveDraft();
      markInvalid(el, false);
    });

    if (eventName !== "change") {
      el.addEventListener("change", () => {
        updateBookingStateFromInputs();
        updatePaymentCardsUI();
        updateSummary();
        updateReview();
        saveDraft();
        markInvalid(el, false);
      });
    }
  });
}

function setupAuthForms() {
  els.loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await loginWithEmail(cleanText(els.loginEmail?.value), cleanText(els.loginPassword?.value));
  });

  els.registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await registerWithEmail(
      cleanText(els.regName?.value),
      cleanText(els.regEmail?.value),
      cleanText(els.regPassword?.value)
    );
  });

  els.forgotForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    await sendResetEmail(cleanText(els.forgotEmail?.value));
  });

  getById("go-to-register")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("register");
  });

  getById("go-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("login");
  });

  getById("go-to-forgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("forgot");
  });

  getById("back-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("login");
  });
}

function setupEventListeners() {
  // ──────────────────────────────────────
  // FIX: Language toggle — update lang FIRST,
  //      then call refreshLocalizedUI() which
  //      now redraws ALL dynamic text via t()
  // ──────────────────────────────────────
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

  els.openAuthBtn?.addEventListener("click", handleProfileButtonClick);
  els.closeAuthBtn?.addEventListener("click", closeAuthModal);
  els.authModal?.addEventListener("click", (e) => {
    if (e.target === els.authModal) closeAuthModal();
  });

  els.logoutBtn?.addEventListener("click", logoutUser);

  els.paymentRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updatePaymentCardsUI();
      updateSummary();
      updateReview();
      saveDraft();
    });
  });

  els.copyIbanBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cleanText(els.bankIban?.textContent));
      showToast(t("RIB copied.", "تم نسخ الحساب."), "success");
    } catch (_) {
      showToast(t("Failed to copy.", "تعذر النسخ."), "error");
    }
  });

  els.copyReferenceBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(cleanText(els.paymentReference?.textContent));
      showToast(t("Reference copied.", "تم نسخ المرجع."), "success");
    } catch (_) {
      showToast(t("Failed to copy.", "تعذر النسخ."), "error");
    }
  });

  els.paymentProof?.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (file) handlePaymentProofUpload(file);
  });

  els.btnNext1?.addEventListener("click", () => {
    if (!validateStep1()) return;
    setCurrentStep(2);
    saveDraft();
  });

  els.btnPrev2?.addEventListener("click", () => {
    setCurrentStep(1);
    saveDraft();
  });

  els.btnNext2?.addEventListener("click", () => {
    if (!validateStep2()) return;
    setCurrentStep(3);
    updateReview();
    saveDraft();
  });

  els.btnPrev3?.addEventListener("click", () => {
    setCurrentStep(2);
    saveDraft();
  });

  els.btnConfirmBooking?.addEventListener("click", confirmBooking);

  els.editStep1Btns.forEach((btn) => {
    btn.addEventListener("click", () => setCurrentStep(1));
  });

  els.editStep2Btns.forEach((btn) => {
    btn.addEventListener("click", () => setCurrentStep(2));
  });

  els.agreePolicy?.addEventListener("change", () => {
    markInvalid(els.agreePolicy, false);
    saveDraft();
  });

  document.addEventListener("click", (e) => {
    if (
      els.profileDropdown?.classList.contains("active") &&
      els.profileContainer &&
      !els.profileContainer.contains(e.target)
    ) {
      toggleProfileDropdown(false);
    }
  });

  setupFieldAutosave();
  setupAuthForms();
}

// ──────────────────────────────────────────
// Init
// ──────────────────────────────────────────
function init() {
  clearLegacyDateStorage();
  cacheOriginalLocalizedContent();

  bookingState.bookingReference = generateReference();

  if (els.paymentReference) {
    els.paymentReference.textContent = bookingState.bookingReference;
  }

  applyTheme();
  refreshLocalizedUI();
  setupDateInputs();
  setupEventListeners();
  updatePaymentCardsUI();
  updateDateConstraints();
  updateSummary();
  updateReview();
  loadPropertyData();

  if (auth) {
    auth.onAuthStateChanged((user) => {
      const previousScope = getCurrentUserScope();

      currentUser = user || null;
      updateAuthUI(currentUser);

      if (user) {
        fillAuthenticatedGuestFields(user);
      } else {
        clearGuestIdentityFields();
      }

      const nextScope = getCurrentUserScope();

      if (previousScope !== nextScope) {
        clearAllBookingFields();
        if (user) fillAuthenticatedGuestFields(user);
        loadDraft();
      } else {
        loadDraft();
      }

      updateSummary();
      updateReview();
    });
  } else {
    updateAuthUI(null);
    clearGuestIdentityFields();
    loadDraft();
  }

  bookingState.initialized = true;
}

document.addEventListener("DOMContentLoaded", init);
