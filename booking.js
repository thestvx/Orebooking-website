// =========================================
// booking.js — OreBooking v16.2
// Simplified booking flow + auth + payment
// Fixed stale dates + success popup
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

function isPastDate(dateStr) {
  const d = parseDate(dateStr);
  const today = parseDate(todayInputValue());
  if (!d || !today) return false;
  return d.getTime() < today.getTime();
}

function normalizeCheckInDate(dateStr) {
  const value = cleanText(dateStr);
  if (!value || isPastDate(value)) return todayInputValue();
  return value;
}

function normalizeCheckOutDate(checkIn, checkOut) {
  const normalizedCheckIn = normalizeCheckInDate(checkIn);
  const out = cleanText(checkOut);
  if (!out) return addDays(normalizedCheckIn, 1);

  const nights = getDiffNights(normalizedCheckIn, out);
  if (nights < 1) return addDays(normalizedCheckIn, 1);

  if (isPastDate(out)) return addDays(normalizedCheckIn, 1);

  return out;
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
  reviewAdditionalGuests: getById("rev-additional-guests"),
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
  const rawCheckIn = getQueryOrStorage(
    ["checkIn", "checkin", "arrival"],
    ["booking_check_in", "selectedCheckIn", "ore_booking_check_in"],
    bookingState.checkIn
  );

  const rawCheckOut = getQueryOrStorage(
    ["checkOut", "checkout", "departure"],
    ["booking_check_out", "selectedCheckOut", "ore_booking_check_out"],
    bookingState.checkOut
  );

  const guests = getQueryOrStorage(
    ["guests", "guestCount", "adults"],
    ["booking_guests", "selectedGuests", "booking_adults"],
    ""
  );

  bookingState.checkIn = normalizeCheckInDate(rawCheckIn);
  bookingState.checkOut = normalizeCheckOutDate(bookingState.checkIn, rawCheckOut);
  bookingState.guestCount = Math.max(1, parsePositiveInt(guests || 1, 1));
  bookingState.nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);

  if (bookingFields.arrivalDate) bookingFields.arrivalDate.value = bookingState.checkIn;
  if (bookingFields.departureDate) bookingFields.departureDate.value = bookingState.checkOut;
  if (bookingFields.guestAdults && !bookingFields.guestAdults.value) {
    bookingFields.guestAdults.value = String(bookingState.guestCount);
  }

  persistStayContext();
}

function persistStayContext() {
  safeSet("booking_check_in", bookingState.checkIn || "");
  safeSet("booking_check_out", bookingState.checkOut || "");
  safeSet("booking_guests", String(bookingState.guestCount || 1));
}

function updateDateConstraints() {
  const today = todayInputValue();

  bookingState.checkIn = normalizeCheckInDate(bookingState.checkIn || getFieldValue("arrivalDate"));
  bookingState.checkOut = normalizeCheckOutDate(
    bookingState.checkIn,
    bookingState.checkOut || getFieldValue("departureDate")
  );

  if (bookingFields.arrivalDate) {
    bookingFields.arrivalDate.min = today;
    bookingFields.arrivalDate.value = bookingState.checkIn;
  }

  if (bookingFields.departureDate) {
    bookingFields.departureDate.min = addDays(bookingState.checkIn, 1);
    bookingFields.departureDate.value = bookingState.checkOut;
  }

  bookingState.nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);
  persistStayContext();
}

function generateBookingReference() {
  if (bookingState.bookingReference) return bookingState.bookingReference;
  const propPart = cleanText(bookingState.propertyId || "ORE").slice(0, 6).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  bookingState.bookingReference = `ORE-${propPart}-${rand}`;
  return bookingState.bookingReference;
}

function updateBookingStateFromInputs() {
  bookingState.checkIn = normalizeCheckInDate(getFieldValue("arrivalDate"));
  bookingState.checkOut = normalizeCheckOutDate(bookingState.checkIn, getFieldValue("departureDate"));

  if (bookingFields.arrivalDate) bookingFields.arrivalDate.value = bookingState.checkIn;
  if (bookingFields.departureDate) bookingFields.departureDate.value = bookingState.checkOut;

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

    if (key === "arrivalDate") {
      const normalized = normalizeCheckInDate(value);
      if (cleanText(el.value) === "") el.value = normalized;
      bookingState.checkIn = normalized;
      return;
    }

    if (key === "departureDate") {
      const baseCheckIn = bookingState.checkIn || getFieldValue("arrivalDate") || todayInputValue();
      const normalized = normalizeCheckOutDate(baseCheckIn, value);
      if (cleanText(el.value) === "") el.value = normalized;
      bookingState.checkOut = normalized;
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
    const radio = els.paymentRadios.find((r) => r.value === draft.paymentValue);
    if (radio) radio.checked = true;
  }

  bookingState.paymentProofName = cleanText(draft.paymentProofName || "");
  bookingState.paymentProofUrl = cleanText(draft.paymentProofUrl || "") || null;

  if (els.uploadText && bookingState.paymentProofName) {
    els.uploadText.textContent = bookingState.paymentProofName;
  }

  updateBookingStateFromInputs();
}

// ──────────────────────────────────────────
// Payment Upload
// ──────────────────────────────────────────
function validateProofFile(file) {
  if (!file) {
    return {
      valid: false,
      message: t("Please choose a file first.", "يرجى اختيار ملف أولاً.")
    };
  }

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf"
  ];

  const ext = file.name.split(".").pop()?.toLowerCase();
  const allowedExt = ["jpg", "jpeg", "png", "webp", "pdf"];

  if (!allowedTypes.includes(file.type) && !allowedExt.includes(ext)) {
    return {
      valid: false,
      message: t("Only JPG, PNG, WEBP, or PDF files are allowed.", "يسمح فقط بملفات JPG أو PNG أو WEBP أو PDF.")
    };
  }

  if (file.size > 5 * 1024 * 1024) {
    return {
      valid: false,
      message: t("File size must be under 5MB.", "يجب أن يكون حجم الملف أقل من 5MB.")
    };
  }

  return { valid: true };
}

async function uploadPaymentProof(file) {
  const validation = validateProofFile(file);
  if (!validation.valid) {
    showToast(validation.message, "error");
    return null;
  }

  bookingState.paymentProofUploading = true;
  if (els.uploadText) {
    els.uploadText.textContent = t("Uploading receipt...", "جارٍ رفع الإيصال...");
  }

  try {
    if (!storage) {
      bookingState.paymentProofName = file.name;
      bookingState.paymentProofUrl = `local-proof://${file.name}`;
      saveDraft();
      showToast(t("Receipt saved locally.", "تم حفظ الإيصال محليًا."), "success");
      return bookingState.paymentProofUrl;
    }

    const refPath = `payment-proofs/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const ref = storage.ref().child(refPath);
    await ref.put(file);
    const url = await ref.getDownloadURL();

    bookingState.paymentProofName = file.name;
    bookingState.paymentProofUrl = url;
    saveDraft();

    showToast(t("Receipt uploaded successfully.", "تم رفع الإيصال بنجاح."), "success");
    return url;
  } catch (error) {
    console.error("Upload error:", error);
    showToast(t("Failed to upload receipt.", "تعذر رفع الإيصال."), "error");
    return null;
  } finally {
    bookingState.paymentProofUploading = false;
    if (els.uploadText) {
      els.uploadText.textContent = bookingState.paymentProofName || t("Click to upload payment receipt", "اضغط لرفع إيصال الدفع");
    }
    updateReview();
  }
}

// ──────────────────────────────────────────
// Steps UI
// ──────────────────────────────────────────
function setStep(step) {
  bookingState.currentStep = step;

  [els.step1, els.step2, els.step3].forEach((el, index) => {
    if (!el) return;
    el.classList.toggle("active", index + 1 === step);
  });

  els.indicators.forEach((indicator, index) => {
    indicator.classList.toggle("active", index + 1 === step);
    indicator.classList.toggle("done", index + 1 < step);
  });

  if (els.connector1) {
    els.connector1.classList.toggle("active", step >= 2);
  }
  if (els.connector2) {
    els.connector2.classList.toggle("active", step >= 3);
  }

  hideGlobalAlert();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function updatePaymentCardsUI() {
  const value = getSelectedPaymentValue();

  els.paymentCards.forEach((card) => {
    const radio = card.querySelector('input[type="radio"]');
    card.classList.toggle("selected", !!radio?.checked);
  });

  els.bankTransferBox?.classList.toggle("active", value === "ccp" || value === "bank" || value === "bank-transfer");
  els.cashBox?.classList.toggle("active", value === "cash");
  els.cardBox?.classList.toggle("active", value === "card");

  bookingState.paymentValue = value;
  bookingState.paymentMethod = getPaymentMethodLabel(value);
}

// ──────────────────────────────────────────
// Summary / Review
// ──────────────────────────────────────────
function updateSummary() {
  updateBookingStateFromInputs();

  setText(els.summaryCheckin, bookingState.checkIn ? formatDateDisplay(bookingState.checkIn) : "-");
  setText(els.summaryCheckout, bookingState.checkOut ? formatDateDisplay(bookingState.checkOut) : "-");
  setText(els.summaryGuests, String(bookingState.guestCount || 1));
  setText(els.summaryPriceNight, formatCurrency(getPropertyPrice()));
  setText(els.summaryNights, String(bookingState.nights || 0));
  setText(els.summaryServiceFee, formatCurrency(getEstimatedServiceFee()));
  setText(els.summaryTaxes, formatCurrency(getEstimatedTaxes()));
  setText(els.summaryTotal, formatCurrency(getEstimatedTotal()));

  const reference = generateBookingReference();
  setText(els.paymentReference, reference);
}

function updateReview() {
  updateBookingStateFromInputs();

  setText(els.reviewGuestName, getFieldValue("guestName") || getFallbackText());
  setText(els.reviewGuestEmail, getFieldValue("guestEmail") || getFallbackText());
  setText(els.reviewGuestPhone, getFieldValue("guestPhone") || getFallbackText());
  setText(els.reviewNationalityGender, getFieldValue("guestCountry") || getFallbackText());

  const datesText = bookingState.checkIn && bookingState.checkOut
    ? `${formatDateDisplay(bookingState.checkIn)} → ${formatDateDisplay(bookingState.checkOut)}`
    : getFallbackText();

  const guestsText = `${Math.max(1, parsePositiveInt(getFieldValue("guestAdults", "1"), 1))} ${t("adults", "بالغ")} / ${Math.max(0, parsePositiveInt(getFieldValue("guestChildren", "0"), 0))} ${t("children", "أطفال")}`;

  const purposeText = [
    getFieldSelectedText("stayPurpose"),
    getFieldSelectedText("arrivalTime")
  ].filter(Boolean).join(" — ") || getFallbackText();

  setText(els.reviewStayDates, datesText);
  setText(els.reviewGuests, guestsText);
  setText(els.reviewPurposeArrival, purposeText);
  setText(els.reviewAdditionalGuests, getFieldValue("specialRequests") || getFallbackText());

  setText(els.reviewPaymentMethod, bookingState.paymentMethod || getFallbackText());
  setText(
    els.reviewDocuments,
    bookingState.paymentProofName ||
      (bookingState.paymentValue === "cash"
        ? t("Cash payment selected", "تم اختيار الدفع النقدي")
        : getFallbackText())
  );
  setText(els.reviewBillings, getFieldValue("billingName") || getFallbackText());
  setText(
    els.reviewRoomPreferences,
    getFieldValue("billingNote") ||
      getFieldValue("cashPaymentNote") ||
      getFallbackText()
  );

  const points = Math.floor((getEstimatedTotal() || 0) / 100);
  bookingState.rewardPoints = points;
  setText(els.reviewPoints, String(points));
  setText(els.reviewPointsInline, String(points));
}

// ──────────────────────────────────────────
// Validation
// ──────────────────────────────────────────
function validateStep1() {
  clearAllInvalidStates();
  hideGlobalAlert();

  let valid = true;

  if (!getFieldValue("guestName")) {
    markInvalid(bookingFields.guestName, true);
    valid = false;
  }

  if (!validateEmail(getFieldValue("guestEmail"))) {
    markInvalid(bookingFields.guestEmail, true);
    valid = false;
  }

  if (!validatePhone(getFieldValue("guestPhone"))) {
    markInvalid(bookingFields.guestPhone, true);
    valid = false;
  }

  if (!getFieldValue("guestCountry")) {
    markInvalid(bookingFields.guestCountry, true);
    valid = false;
  }

  const normalizedCheckIn = normalizeCheckInDate(getFieldValue("arrivalDate"));
  const normalizedCheckOut = normalizeCheckOutDate(normalizedCheckIn, getFieldValue("departureDate"));

  if (!normalizedCheckIn) {
    markInvalid(bookingFields.arrivalDate, true);
    valid = false;
  } else {
    bookingFields.arrivalDate.value = normalizedCheckIn;
    bookingState.checkIn = normalizedCheckIn;
  }

  if (!normalizedCheckOut || getDiffNights(normalizedCheckIn, normalizedCheckOut) < 1) {
    markInvalid(bookingFields.departureDate, true);
    valid = false;
  } else {
    bookingFields.departureDate.value = normalizedCheckOut;
    bookingState.checkOut = normalizedCheckOut;
  }

  if (!getFieldValue("arrivalTime")) {
    markInvalid(bookingFields.arrivalTime, true);
    valid = false;
  }

  if (!getFieldValue("stayPurpose")) {
    markInvalid(bookingFields.stayPurpose, true);
    valid = false;
  }

  if (!valid) {
    showGlobalAlert(t("Please complete the required details.", "يرجى إكمال البيانات المطلوبة."));
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
    markInvalid(els.agreePolicy, true);
    return false;
  }
  markInvalid(els.agreePolicy, false);
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
    particleCount: 110,
    spread: 90,
    origin: { y: 0.65 }
  });

  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.25, y: 0.62 }
    });
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { x: 0.75, y: 0.62 }
    });
  }, 220);
}

function resetBookingDraftState() {
  safeRemove(BOOKING_DRAFT_KEY);
  safeRemove("booking_check_in");
  safeRemove("booking_check_out");
  safeRemove("booking_guests");
  bookingState.bookingReference = "";
  bookingState.paymentProofName = "";
  bookingState.paymentProofUrl = null;
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

  const btn = els.btnConfirmBooking;
  setButtonLoading(btn, true, t("Confirming booking...", "جارٍ تأكيد الحجز..."));

  try {
    const payload = buildBookingPayload();
    await saveBookingToFirestore(payload);
    await saveBookingLocally(payload);

    resetBookingDraftState();
    fireSuccessConfetti();
    showToast(t("Booking submitted successfully.", "تم إرسال الحجز بنجاح."), "success");
    showBookingSuccessPopup(payload.bookingReference);
  } catch (error) {
    console.error("Booking submission error:", error);
    showToast(t("Failed to submit booking. Please try again.", "تعذر إرسال الحجز. حاول مرة أخرى."), "error");
  } finally {
    setButtonLoading(btn, false);
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

  document.addEventListener("click", (e) => {
    if (els.profileContainer && !els.profileContainer.contains(e.target)) {
      toggleProfileDropdown(false);
    }
  });

  els.authModal?.addEventListener("click", (e) => {
    if (e.target === els.authModal) closeAuthModal();
  });

  qsa("[data-auth-switch]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.getAttribute("data-auth-switch");
      if (target) switchAuthForm(target);
    });
  });
}

function bindAuthEvents() {
  els.loginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    loginWithEmail(cleanText(els.loginEmail?.value), cleanText(els.loginPassword?.value));
  });

  els.registerForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    registerWithEmail(
      cleanText(els.regName?.value),
      cleanText(els.regEmail?.value),
      cleanText(els.regPassword?.value)
    );
  });

  els.forgotForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    sendResetEmail(cleanText(els.forgotEmail?.value));
  });

  els.logoutBtn?.addEventListener("click", logoutUser);

  if (auth) {
    auth.onAuthStateChanged(async (user) => {
      updateAuthUI(user);

      if (user?.uid && db && els.userPoints) {
        try {
          const doc = await db.collection("users").doc(user.uid).get();
          setText(els.userPoints, String(doc.data()?.points || 0));
        } catch (_) {
          setText(els.userPoints, "0");
        }
      } else {
        setText(els.userPoints, "0");
      }
    });
  } else {
    updateAuthUI(null);
  }
}

function bindPaymentEvents() {
  els.paymentRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      updatePaymentCardsUI();
      updateSummary();
      updateReview();
      saveDraft();
    });
  });

  els.paymentProof?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPaymentProof(file);
    }
  });

  els.copyIbanBtn?.addEventListener("click", async () => {
    const value = cleanText(els.bankIban?.textContent);
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast(t("RIB copied successfully.", "تم نسخ الـ RIB بنجاح."), "success");
    } catch (_) {
      showToast(t("Failed to copy RIB.", "تعذر نسخ الـ RIB."), "error");
    }
  });

  els.copyReferenceBtn?.addEventListener("click", async () => {
    const value = cleanText(els.paymentReference?.textContent || generateBookingReference());
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      showToast(t("Reference copied successfully.", "تم نسخ المرجع بنجاح."), "success");
    } catch (_) {
      showToast(t("Failed to copy reference.", "تعذر نسخ المرجع."), "error");
    }
  });
}

function bindBookingEvents() {
  Object.values(bookingFields).forEach((el) => {
    if (!el) return;
    const eventName = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(eventName, () => {
      markInvalid(el, false);
      updateSummary();
      updateReview();
      saveDraft();
    });
  });

  bookingFields.arrivalDate?.addEventListener("change", () => {
    bookingState.checkIn = normalizeCheckInDate(getFieldValue("arrivalDate"));
    bookingFields.arrivalDate.value = bookingState.checkIn;
    bookingState.bookingReference = "";
    updateDateConstraints();
    updateSummary();
    updateReview();
  });

  bookingFields.departureDate?.addEventListener("change", () => {
    bookingState.checkOut = normalizeCheckOutDate(
      bookingState.checkIn || getFieldValue("arrivalDate"),
      getFieldValue("departureDate")
    );
    bookingFields.departureDate.value = bookingState.checkOut;
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
