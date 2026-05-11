// =========================================
//   booking.js — OreBooking v9.0
//   Synced with latest booking.html structure
//   Responsive booking flow + auth + payment UI
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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// ──────────────────────────────────────────
// State
// ──────────────────────────────────────────
let currentUser = null;

const bookingState = {
  lang: safeGet("ore_lang", "en") || "en",
  theme: safeGet("ore_theme", "light") || "light",

  propertyId: null,
  property: null,

  checkIn: "",
  checkOut: "",
  guests: 1,
  nights: 0,

  paymentMethod: "Bank Transfer",
  paymentValue: "Bank Transfer",
  paymentProofUrl: null,

  rewardPoints: 0
};

// ──────────────────────────────────────────
// DOM
// ──────────────────────────────────────────
const els = {
  html: document.documentElement,
  body: document.body,

  langToggle: document.getElementById("lang-toggle"),
  themeToggle: document.getElementById("theme-toggle"),
  openAuthBtn: document.getElementById("open-auth-btn"),
  closeAuthBtn: document.getElementById("close-auth-btn"),
  authModal: document.getElementById("auth-modal"),
  profileDropdown: document.getElementById("profile-dropdown"),

  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  forgotForm: document.getElementById("forgot-form"),
  authMessage: document.getElementById("auth-message"),

  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  regName: document.getElementById("reg-name"),
  regEmail: document.getElementById("reg-email"),
  regPassword: document.getElementById("reg-password"),
  forgotEmail: document.getElementById("forgot-email"),

  passwordStrength: document.getElementById("password-strength"),
  strengthLabel: document.getElementById("strength-label"),

  dropdownUserName: document.getElementById("dropdown-user-name"),
  dropdownUserEmail: document.getElementById("dropdown-user-email"),
  logoutBtn: document.getElementById("logout-btn"),
  myBookingsBtn: document.getElementById("my-bookings-btn"),
  myFavoritesBtn: document.getElementById("my-favorites-btn"),

  step1: document.getElementById("step-1"),
  step2: document.getElementById("step-2"),
  step3: document.getElementById("step-3"),
  connector1: document.getElementById("connector-1"),
  connector2: document.getElementById("connector-2"),
  indicators: [...document.querySelectorAll(".step-indicator")],

  btnNext1: document.getElementById("btn-next-1"),
  btnNext2: document.getElementById("btn-next-2"),
  btnPrev2: document.getElementById("btn-prev-2"),
  btnPrev3: document.getElementById("btn-prev-3"),
  btnEditGuest: document.getElementById("btn-edit-guest"),
  btnEditDates: document.getElementById("btn-edit-dates"),
  btnEditPayment: document.getElementById("btn-edit-payment"),
  btnConfirmBooking: document.getElementById("btn-confirm-booking"),

  guestName: document.getElementById("guest-name"),
  guestEmail: document.getElementById("guest-email"),
  guestPhone: document.getElementById("guest-phone"),
  guestNationality: document.getElementById("guest-nationality"),
  guestGender: document.getElementById("guest-gender"),
  guestPurpose: document.getElementById("guest-purpose"),

  checkInDate: document.getElementById("check-in-date"),
  checkOutDate: document.getElementById("check-out-date"),
  guestCount: document.getElementById("guest-count"),
  arrivalTime: document.getElementById("arrival-time"),
  additionalGuests: document.getElementById("additional-guests"),

  roomPreference: document.getElementById("room-preference"),
  billingRequest: document.getElementById("billing-request"),
  specialRequests: document.getElementById("special-requests"),

  paymentCards: [...document.querySelectorAll(".payment-method-card")],
  paymentRadios: [...document.querySelectorAll('input[name="payment-method"]')],
  bankTransferDetails: document.getElementById("bank-transfer-details"),
  cashDetails: document.getElementById("cash-details"),
  cardDetails: document.getElementById("card-details"),

  copyBankInfoBtn: document.getElementById("copy-bank-info-btn"),
  paymentProof: document.getElementById("payment-proof"),
  selectedProofFile: document.getElementById("selected-proof-file"),
  selectedProofFileName: document.getElementById("selected-proof-file-name"),

  bankName: document.getElementById("bank-name"),
  bankHolder: document.getElementById("bank-holder"),
  bankIban: document.getElementById("bank-iban"),
  paymentReference: document.getElementById("payment-reference"),

  statCheckin: document.getElementById("stat-checkin"),
  statCheckout: document.getElementById("stat-checkout"),
  statNights: document.getElementById("stat-nights"),
  statGuests: document.getElementById("stat-guests"),

  summaryCheckin: document.getElementById("summary-checkin"),
  summaryCheckout: document.getElementById("summary-checkout"),
  summaryGuests: document.getElementById("summary-guests"),
  summaryPayment: document.getElementById("summary-payment"),

  propMiniImg: document.getElementById("prop-mini-img"),
  propMiniTitle: document.getElementById("prop-mini-title"),
  propMiniLoc: document.getElementById("prop-mini-loc"),
  propMiniType: document.getElementById("prop-mini-type"),

  sbNightPrice: document.getElementById("sb-night-price"),
  sbNightsCount: document.getElementById("sb-nights-count"),
  sbFeeRow: document.getElementById("sb-fee-row"),
  sbFeeAmount: document.getElementById("sb-fee-amount"),
  sbAddonsRow: document.getElementById("sb-addons-row"),
  sbAddonsAmount: document.getElementById("sb-addons-amount"),
  sbFinalTotal: document.getElementById("sb-final-total"),

  revName: document.getElementById("rev-name"),
  revEmail: document.getElementById("rev-email"),
  revPhone: document.getElementById("rev-phone"),
  revNationalityGender: document.getElementById("rev-nationality-gender"),
  revDates: document.getElementById("rev-dates"),
  revGuests: document.getElementById("rev-guests"),
  revPurposeArrival: document.getElementById("rev-purpose-arrival"),
  revAdditionalGuests: document.getElementById("rev-additional-guests"),
  revDocuments: document.getElementById("rev-documents"),
  revBilling: document.getElementById("rev-billing"),
  revRoomPreferences: document.getElementById("rev-room-preferences"),
  revPaymentMethod: document.getElementById("rev-payment-method"),
  revPoints: document.getElementById("rev-points"),

  agreePolicy: document.getElementById("agree-policy")
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

function formatCurrency(value) {
  const amount = Number(value || 0);
  return bookingState.lang === "ar"
    ? `${amount.toLocaleString("ar-DZ")} د.ج`
    : `${amount.toLocaleString("en-US")} DZD`;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
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

function resolvePropertyId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id") || params.get("propertyId") || safeGet("selectedPropertyId");
  return id ? String(id).trim() : null;
}

function updateDirection() {
  els.html.lang = bookingState.lang;
  els.html.dir = bookingState.lang === "ar" ? "rtl" : "ltr";
}

function applyTheme() {
  const isDark = bookingState.theme === "dark";
  els.body.classList.toggle("dark", isDark);
  const icon = els.themeToggle?.querySelector("i");
  if (icon) {
    icon.className = isDark ? "ph ph-sun" : "ph ph-moon";
  }
}

function updateLangButton() {
  const span = els.langToggle?.querySelector("span");
  if (span) span.textContent = bookingState.lang === "ar" ? "EN" : "AR";
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
  if (typeof force === "boolean") {
    els.profileDropdown.classList.toggle("active", force);
  } else {
    els.profileDropdown.classList.toggle("active");
  }
}

// ──────────────────────────────────────────
// Property Data
// ──────────────────────────────────────────
async function loadPropertyData() {
  bookingState.propertyId = resolvePropertyId();

  if (!bookingState.propertyId) {
    bookingState.property = {
      title: "Selected Property",
      location: "Location unavailable",
      type: "Stay",
      imageUrl: "images/placeholder.jpg",
      price: 0
    };
    renderPropertySummary();
    updateSummary();
    return;
  }

  safeSet("selectedPropertyId", bookingState.propertyId);

  try {
    const doc = await db.collection("properties").doc(String(bookingState.propertyId)).get();
    if (!doc.exists) throw new Error("not-found");
    bookingState.property = { id: doc.id, ...doc.data() };
  } catch (_) {
    bookingState.property = {
      id: bookingState.propertyId,
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
  }
  if (els.propMiniTitle) els.propMiniTitle.textContent = getPropertyTitle();
  if (els.propMiniLoc) els.propMiniLoc.textContent = getPropertyLocation();
  if (els.propMiniType) els.propMiniType.textContent = getPropertyType();
}

// ──────────────────────────────────────────
// Stats / Summary / Review
// ──────────────────────────────────────────
function updateBookingStateFromInputs() {
  bookingState.checkIn = cleanText(els.checkInDate?.value);
  bookingState.checkOut = cleanText(els.checkOutDate?.value);
  bookingState.guests = Math.max(1, Number(els.guestCount?.value || 1));
  bookingState.nights = getDiffNights(bookingState.checkIn, bookingState.checkOut);
  bookingState.rewardPoints = Math.floor((getEstimatedTotal() || 0) / 100);
}

function getEstimatedFee() {
  const subtotal = getPropertyPrice() * bookingState.nights;
  return subtotal > 0 ? Math.round(subtotal * 0.05) : 0;
}

function getEstimatedTotal() {
  return (getPropertyPrice() * bookingState.nights) + getEstimatedFee();
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
  if (els.summaryPayment) els.summaryPayment.textContent = bookingState.paymentMethod || t("Not selected", "غير محدد");

  if (els.sbNightPrice) els.sbNightPrice.textContent = formatCurrency(getPropertyPrice());
  if (els.sbNightsCount) els.sbNightsCount.textContent = String(bookingState.nights || 0);

  const fee = getEstimatedFee();
  if (els.sbFeeRow && els.sbFeeAmount) {
    if (fee > 0) {
      els.sbFeeRow.style.display = "flex";
      els.sbFeeAmount.textContent = formatCurrency(fee);
    } else {
      els.sbFeeRow.style.display = "none";
    }
  }

  if (els.sbAddonsRow && els.sbAddonsAmount) {
    els.sbAddonsRow.style.display = "none";
    els.sbAddonsAmount.textContent = formatCurrency(0);
  }

  if (els.sbFinalTotal) els.sbFinalTotal.textContent = formatCurrency(getEstimatedTotal());
}

function updateReview() {
  updateBookingStateFromInputs();

  const fullName = cleanText(els.guestName?.value);
  const email = cleanText(els.guestEmail?.value);
  const phone = cleanText(els.guestPhone?.value);
  const nationality = cleanText(els.guestNationality?.value);
  const gender = cleanText(els.guestGender?.value);
  const purpose = cleanText(els.guestPurpose?.value);
  const arrival = cleanText(els.arrivalTime?.value);
  const additionalGuests = cleanText(els.additionalGuests?.value);
  const billing = cleanText(els.billingRequest?.value);
  const roomPreference = cleanText(els.roomPreference?.value);
  const paymentProofName = els.paymentProof?.files?.[0]?.name || t("No file uploaded", "لم يتم رفع ملف");
  const specialRequests = cleanText(els.specialRequests?.value);

  if (els.revName) els.revName.textContent = fullName || t("Not provided", "غير متوفر");
  if (els.revEmail) els.revEmail.textContent = email || t("Not provided", "غير متوفر");
  if (els.revPhone) els.revPhone.textContent = phone || t("Not provided", "غير متوفر");
  if (els.revNationalityGender) {
    els.revNationalityGender.textContent = [nationality, gender].filter(Boolean).join(" • ") || t("Not provided", "غير متوفر");
  }
  if (els.revDates) {
    els.revDates.textContent = `${formatDateDisplay(bookingState.checkIn)} → ${formatDateDisplay(bookingState.checkOut)}`;
  }
  if (els.revGuests) {
    els.revGuests.textContent = `${bookingState.guests} ${t("guest(s)", "ضيف/ضيوف")} • ${bookingState.nights} ${t("night(s)", "ليلة/ليالٍ")}`;
  }
  if (els.revPurposeArrival) {
    els.revPurposeArrival.textContent = [purpose, arrival].filter(Boolean).join(" • ") || t("Not provided", "غير متوفر");
  }
  if (els.revAdditionalGuests) {
    els.revAdditionalGuests.textContent = additionalGuests || t("None", "لا يوجد");
  }
  if (els.revDocuments) {
    els.revDocuments.textContent = paymentProofName;
  }
  if (els.revBilling) {
    els.revBilling.textContent = billing || t("Standard receipt", "إيصال عادي");
  }
  if (els.revRoomPreferences) {
    els.revRoomPreferences.textContent = [roomPreference, specialRequests].filter(Boolean).join(" • ") || t("No preference", "لا يوجد تفضيل");
  }
  if (els.revPaymentMethod) {
    const icon =
      bookingState.paymentValue === "Cash"
        ? "money"
        : bookingState.paymentValue === "Card"
        ? "credit-card"
        : "bank";
    els.revPaymentMethod.innerHTML = `<i class="ph ph-${icon}" style="color:var(--primary);margin-inline-end:6px;"></i>${escapeHtml(bookingState.paymentMethod)}`;
  }
  if (els.revPoints) {
    els.revPoints.textContent = String(bookingState.rewardPoints || 0);
  }
}

// ──────────────────────────────────────────
// Step Flow
// ──────────────────────────────────────────
function setStep(stepNumber) {
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
  const name = cleanText(els.guestName?.value);
  const email = cleanText(els.guestEmail?.value);
  const phone = cleanText(els.guestPhone?.value);
  const checkIn = cleanText(els.checkInDate?.value);
  const checkOut = cleanText(els.checkOutDate?.value);
  const guests = Number(els.guestCount?.value || 0);

  if (!name) {
    alert(t("Please enter your full name.", "يرجى إدخال الاسم الكامل."));
    return false;
  }

  if (!email || !validateEmail(email)) {
    alert(t("Please enter a valid email address.", "يرجى إدخال بريد إلكتروني صحيح."));
    return false;
  }

  if (!phone) {
    alert(t("Please enter your phone number.", "يرجى إدخال رقم الهاتف."));
    return false;
  }

  if (!checkIn || !checkOut) {
    alert(t("Please select check-in and check-out dates.", "يرجى تحديد تاريخ الدخول والخروج."));
    return false;
  }

  if (getDiffNights(checkIn, checkOut) < 1) {
    alert(t("Check-out must be after check-in.", "يجب أن يكون تاريخ الخروج بعد تاريخ الدخول."));
    return false;
  }

  if (!guests || guests < 1) {
    alert(t("Please enter at least 1 guest.", "يرجى إدخال ضيف واحد على الأقل."));
    return false;
  }

  return true;
}

function validateStep2() {
  const selected = document.querySelector('input[name="payment-method"]:checked');
  if (!selected) {
    alert(t("Please select a payment method.", "يرجى اختيار طريقة الدفع."));
    return false;
  }

  if (selected.value === "Bank Transfer" && !bookingState.paymentProofUrl && !els.paymentProof?.files?.length) {
    alert(t("Please upload payment proof for bank transfer.", "يرجى رفع إثبات التحويل البنكي."));
    return false;
  }

  return true;
}

function validateStep3() {
  if (!els.agreePolicy?.checked) {
    alert(t("You must agree to the terms and policies.", "يجب الموافقة على الشروط والسياسات."));
    return false;
  }
  return true;
}

// ──────────────────────────────────────────
// Payment UI
// ──────────────────────────────────────────
function syncPaymentMethodFromSelection() {
  const selectedRadio = document.querySelector('input[name="payment-method"]:checked');
  if (!selectedRadio) return;

  bookingState.paymentValue = selectedRadio.value;

  const label = selectedRadio.closest(".payment-method-card")?.querySelector(".payment-method-title")?.textContent?.trim();
  bookingState.paymentMethod = label || selectedRadio.value;

  updateSummary();
  updateReview();
}

function updatePaymentCardsUI() {
  els.paymentCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    card.classList.toggle("selected", !!radio?.checked);
  });

  const value = document.querySelector('input[name="payment-method"]:checked')?.value;

  if (els.bankTransferDetails) {
    const active = value === "Bank Transfer";
    els.bankTransferDetails.classList.toggle("active", active);
    els.bankTransferDetails.style.display = active ? "block" : "none";
  }

  if (els.cashDetails) {
    const active = value === "Cash";
    els.cashDetails.classList.toggle("active", active);
    els.cashDetails.style.display = active ? "block" : "none";
  }

  if (els.cardDetails) {
    const active = value === "Card";
    els.cardDetails.classList.toggle("active", active);
    els.cardDetails.style.display = active ? "block" : "none";
  }

  syncPaymentMethodFromSelection();
}

async function handlePaymentProofUpload(file) {
  if (!file) return null;

  const allowed = ["image/jpeg", "image/png", "application/pdf", "image/webp"];
  const maxSize = 5 * 1024 * 1024;

  if (!allowed.includes(file.type)) {
    alert(t("Only JPG, PNG, WEBP, or PDF files are allowed.", "الملفات المسموحة هي JPG وPNG وWEBP وPDF فقط."));
    return null;
  }

  if (file.size > maxSize) {
    alert(t("File size must be less than 5MB.", "يجب أن يكون حجم الملف أقل من 5MB."));
    return null;
  }

  try {
    const ext = file.name.split(".").pop() || "file";
    const fileName = `booking_proofs/${Date.now()}.${ext}`;
    const ref = storage.ref(fileName);
    const snapshot = await ref.put(file);
    return await snapshot.ref.getDownloadURL();
  } catch (error) {
    console.error("Payment proof upload error:", error);
    alert(t("Upload failed. Please try again.", "فشل الرفع، يرجى المحاولة مرة أخرى."));
    return null;
  }
}

// ──────────────────────────────────────────
// Copy Bank Info
// ──────────────────────────────────────────
function initCopyBankInfo() {
  if (!els.copyBankInfoBtn) return;

  els.copyBankInfoBtn.addEventListener("click", async () => {
    const text = [
      `Bank Name: ${els.bankName?.textContent || ""}`,
      `Account Holder: ${els.bankHolder?.textContent || ""}`,
      `IBAN / RIB: ${els.bankIban?.textContent || ""}`,
      `Reference: ${els.paymentReference?.textContent || ""}`
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      els.copyBankInfoBtn.innerHTML = `<i class="ph ph-check"></i><span>${t("Copied", "تم النسخ")}</span>`;
      setTimeout(() => {
        els.copyBankInfoBtn.innerHTML = `<i class="ph ph-copy"></i><span>${t("Copy info", "نسخ المعلومات")}</span>`;
      }, 1600);
    } catch (_) {
      alert(t("Unable to copy bank info.", "تعذر نسخ معلومات البنك."));
    }
  });
}

// ──────────────────────────────────────────
// Auth
// ──────────────────────────────────────────
function initPasswordToggles() {
  document.querySelectorAll(".toggle-pass-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement?.querySelector("input");
      if (!input) return;

      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";

      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = isPassword ? "ph ph-eye-slash" : "ph ph-eye";
      }
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

function initPasswordStrength() {
  if (!els.regPassword || !els.passwordStrength || !els.strengthLabel) return;

  const bars = [...els.passwordStrength.querySelectorAll(".str-bar")];
  const labels = {
    en: ["", "Weak", "Fair", "Good", "Strong"],
    ar: ["", "ضعيفة", "مقبولة", "جيدة", "قوية"]
  };
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e"];

  els.regPassword.addEventListener("input", () => {
    const val = els.regPassword.value;
    const score = calcPasswordStrength(val);

    els.passwordStrength.style.display = val ? "block" : "none";

    bars.forEach((bar, index) => {
      bar.style.background = index < score ? colors[score - 1] : "var(--border-color)";
    });

    els.strengthLabel.textContent = val ? labels[bookingState.lang][score] : "";
    els.strengthLabel.style.color = score ? colors[score - 1] : "var(--text-muted)";
  });
}

async function handleLogin(e) {
  e.preventDefault();
  clearAuthMessage();

  const email = cleanText(els.loginEmail?.value);
  const password = cleanText(els.loginPassword?.value);

  if (!email || !password) {
    showAuthMessage(t("Please fill in all login fields.", "يرجى ملء جميع حقول تسجيل الدخول."), "error");
    return;
  }

  try {
    await auth.signInWithEmailAndPassword(email, password);
    showAuthMessage(t("Login successful.", "تم تسجيل الدخول بنجاح."), "success");
    setTimeout(closeAuthModal, 700);
  } catch (error) {
    console.error(error);
    showAuthMessage(t("Login failed. Please check your credentials.", "فشل تسجيل الدخول. تحقق من البيانات."), "error");
  }
}

async function handleRegister(e) {
  e.preventDefault();
  clearAuthMessage();

  const name = cleanText(els.regName?.value);
  const email = cleanText(els.regEmail?.value);
  const password = cleanText(els.regPassword?.value);

  if (!name || !email || !password) {
    showAuthMessage(t("Please complete all registration fields.", "يرجى إكمال كل حقول التسجيل."), "error");
    return;
  }

  if (!validateEmail(email)) {
    showAuthMessage(t("Please enter a valid email address.", "يرجى إدخال بريد إلكتروني صحيح."), "error");
    return;
  }

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: name });
    showAuthMessage(t("Account created successfully.", "تم إنشاء الحساب بنجاح."), "success");
    setTimeout(() => {
      switchAuthForm("login");
      if (els.loginEmail) els.loginEmail.value = email;
    }, 900);
  } catch (error) {
    console.error(error);
    showAuthMessage(t("Registration failed. Try another email.", "فشل التسجيل. جرب بريدًا آخر."), "error");
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();
  clearAuthMessage();

  const email = cleanText(els.forgotEmail?.value);
  if (!email || !validateEmail(email)) {
    showAuthMessage(t("Please enter a valid email address.", "يرجى إدخال بريد إلكتروني صحيح."), "error");
    return;
  }

  try {
    await auth.sendPasswordResetEmail(email);
    showAuthMessage(t("Reset link sent successfully.", "تم إرسال رابط الاستعادة بنجاح."), "success");
  } catch (error) {
    console.error(error);
    showAuthMessage(t("Failed to send reset link.", "تعذر إرسال رابط الاستعادة."), "error");
  }
}

async function handleGoogleAuth() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    await auth.signInWithPopup(provider);
    closeAuthModal();
  } catch (error) {
    console.error(error);
    showAuthMessage(t("Google sign-in failed.", "فشل تسجيل الدخول عبر Google."), "error");
  }
}

async function handleLogout() {
  try {
    await auth.signOut();
    toggleProfileDropdown(false);
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

  updateStats();
  updateSummary();
  updateReview();
}

// ──────────────────────────────────────────
// Submission
// ──────────────────────────────────────────
async function submitBooking() {
  if (!validateStep1()) return;
  if (!validateStep2()) return;
  if (!validateStep3()) return;

  setButtonLoading(els.btnConfirmBooking, true, t("Confirming...", "جارٍ التأكيد..."));

  try {
    let paymentProofUrl = bookingState.paymentProofUrl;

    if (bookingState.paymentValue === "Bank Transfer" && els.paymentProof?.files?.[0] && !paymentProofUrl) {
      paymentProofUrl = await handlePaymentProofUpload(els.paymentProof.files[0]);
      bookingState.paymentProofUrl = paymentProofUrl;
      if (!paymentProofUrl) {
        setButtonLoading(els.btnConfirmBooking, false);
        return;
      }
    }

    updateBookingStateFromInputs();

    const bookingRef = db.collection("bookings").doc();
    const payload = {
      bookingId: bookingRef.id,
      propertyId: bookingState.propertyId || null,
      propertyTitle: getPropertyTitle(),
      propertyLocation: getPropertyLocation(),
      propertyType: getPropertyType(),
      propertyImage: getPropertyImage(),

      guestName: cleanText(els.guestName?.value),
      guestEmail: cleanText(els.guestEmail?.value),
      guestPhone: cleanText(els.guestPhone?.value),
      guestNationality: cleanText(els.guestNationality?.value),
      guestGender: cleanText(els.guestGender?.value),
      guestPurpose: cleanText(els.guestPurpose?.value),

      checkIn: bookingState.checkIn || null,
      checkOut: bookingState.checkOut || null,
      guests: bookingState.guests || 1,
      nights: bookingState.nights || 0,
      arrivalTime: cleanText(els.arrivalTime?.value),
      additionalGuests: cleanText(els.additionalGuests?.value),

      roomPreference: cleanText(els.roomPreference?.value),
      billingRequest: cleanText(els.billingRequest?.value),
      specialRequests: cleanText(els.specialRequests?.value),

      paymentMethod: bookingState.paymentMethod,
      paymentValue: bookingState.paymentValue,
      paymentProofUrl: paymentProofUrl || null,
      paymentReference: cleanText(els.paymentReference?.textContent),

      basePrice: getPropertyPrice(),
      serviceFee: getEstimatedFee(),
      totalPrice: getEstimatedTotal(),
      rewardPoints: bookingState.rewardPoints,

      authUid: currentUser?.uid || null,
      userEmail: currentUser?.email || null,
      status: "pending",
      source: "booking_page",
      lang: bookingState.lang,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    await bookingRef.set(payload);

    safeSet("last_booking_id", bookingRef.id);
    safeSet("last_booking_property_id", bookingState.propertyId || "");
    safeSet("last_booking_email", payload.guestEmail || "");

    if (typeof window.confetti === "function") {
      window.confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.6 }
      });
    }

    alert(t("Booking submitted successfully.", "تم إرسال الحجز بنجاح."));
    setButtonLoading(els.btnConfirmBooking, false);

    setTimeout(() => {
      window.location.href = "index.html";
    }, 1500);
  } catch (error) {
    console.error("Booking submit error:", error);
    setButtonLoading(els.btnConfirmBooking, false);
    alert(t("An error occurred while submitting your booking.", "حدث خطأ أثناء إرسال الحجز."));
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
    els.guestNationality,
    els.guestGender,
    els.guestPurpose,
    els.checkInDate,
    els.checkOutDate,
    els.guestCount,
    els.arrivalTime,
    els.additionalGuests,
    els.roomPreference,
    els.billingRequest,
    els.specialRequests
  ].filter(Boolean);

  watched.forEach(el => {
    el.addEventListener("input", () => {
      updateStats();
      updateSummary();
      updateReview();
    });
    el.addEventListener("change", () => {
      updateStats();
      updateSummary();
      updateReview();
    });
  });
}

function initPaymentUI() {
  els.paymentCards.forEach(card => {
    card.addEventListener("click", () => {
      const radio = card.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        updatePaymentCardsUI();
      }
    });
  });

  els.paymentRadios.forEach(radio => {
    radio.addEventListener("change", updatePaymentCardsUI);
  });

  if (els.paymentProof) {
    els.paymentProof.addEventListener("change", () => {
      const file = els.paymentProof.files?.[0];
      if (file && els.selectedProofFile && els.selectedProofFileName) {
        els.selectedProofFile.style.display = "flex";
        els.selectedProofFileName.textContent = file.name;
      } else if (els.selectedProofFile) {
        els.selectedProofFile.style.display = "none";
      }
      updateReview();
    });
  }

  updatePaymentCardsUI();
}

function initSteps() {
  els.btnNext1?.addEventListener("click", () => {
    if (!validateStep1()) return;
    updateStats();
    updateSummary();
    setStep(2);
  });

  els.btnPrev2?.addEventListener("click", () => setStep(1));

  els.btnNext2?.addEventListener("click", () => {
    if (!validateStep1()) return;
    if (!validateStep2()) return;
    updateReview();
    updateSummary();
    setStep(3);
  });

  els.btnPrev3?.addEventListener("click", () => setStep(2));

  els.btnEditGuest?.addEventListener("click", () => setStep(1));
  els.btnEditDates?.addEventListener("click", () => setStep(1));
  els.btnEditPayment?.addEventListener("click", () => setStep(2));

  els.btnConfirmBooking?.addEventListener("click", submitBooking);
}

function initThemeAndLanguage() {
  updateDirection();
  applyTheme();
  updateLangButton();

  els.themeToggle?.addEventListener("click", () => {
    bookingState.theme = bookingState.theme === "dark" ? "light" : "dark";
    safeSet("ore_theme", bookingState.theme);
    applyTheme();
  });

  els.langToggle?.addEventListener("click", () => {
    bookingState.lang = bookingState.lang === "ar" ? "en" : "ar";
    safeSet("ore_lang", bookingState.lang);
    location.reload();
  });
}

function initAuthUI() {
  els.openAuthBtn?.addEventListener("click", (e) => {
    e.preventDefault();
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

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".profile-container")) {
      toggleProfileDropdown(false);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeAuthModal();
      toggleProfileDropdown(false);
    }
  });

  document.getElementById("go-to-register")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("register");
    clearAuthMessage();
  });

  document.getElementById("go-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("login");
    clearAuthMessage();
  });

  document.getElementById("go-to-forgot")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("forgot");
    clearAuthMessage();
  });

  document.getElementById("back-to-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    switchAuthForm("login");
    clearAuthMessage();
  });

  els.loginForm?.addEventListener("submit", handleLogin);
  els.registerForm?.addEventListener("submit", handleRegister);
  els.forgotForm?.addEventListener("submit", handleForgotPassword);

  document.getElementById("google-login-btn")?.addEventListener("click", handleGoogleAuth);
  document.getElementById("google-register-btn")?.addEventListener("click", handleGoogleAuth);

  els.logoutBtn?.addEventListener("click", handleLogout);

  els.myBookingsBtn?.addEventListener("click", () => {
    toggleProfileDropdown(false);
    window.location.href = "profile.html#bookings";
  });

  els.myFavoritesBtn?.addEventListener("click", () => {
    toggleProfileDropdown(false);
    window.location.href = "profile.html#favorites";
  });

  auth.onAuthStateChanged((user) => {
    currentUser = user;
    updateUserUI(user);
  });
}

// ──────────────────────────────────────────
// Init
// ──────────────────────────────────────────
async function init() {
  initThemeAndLanguage();
  initAuthUI();
  initPasswordToggles();
  initPasswordStrength();
  initInputWatchers();
  initPaymentUI();
  initCopyBankInfo();
  initSteps();

  await loadPropertyData();

  updateStats();
  updateSummary();
  updateReview();
  setStep(1);
}

document.addEventListener("DOMContentLoaded", init);
