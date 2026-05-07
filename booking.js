// =========================================
//   Advanced Booking Logic — booking.js
//   OreBooking © 2025 | Hotel Edition
//   Enhanced Version v6.0 — Complete & Fixed
// =========================================

"use strict";

// ─── Safe Storage Helpers ───────────────────
function safeGet(key, fallback = null) {
  try {
    const v = window.localStorage.getItem(key);
    return v ?? fallback;
  } catch (_) {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {}
}

// ─── Firebase Config ───────────────────────
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

// ─── Booking State ─────────────────────────
let currentUser = null;

const bookingState = {
  propertyId: null,
  property: null,
  checkIn: null,
  checkOut: null,
  rooms: 1,
  adults: 2,
  children: 0,
  childAges: [],
  beds: 1,
  nights: 0,
  totalPrice: 0,
  basePrice: 0,
  roomPrice: 0,
  fee: 0,
  addonsTotal: 0,
  maxGuests: 10,
  maxRooms: 5,
  minNights: 1,
  bookedDates: [],
  addons: {
    restaurant: false,
    restaurantPlan: "breakfast",
    wifi: false,
    parking: false,
    airportTransfer: false,
    spa: false,
    lateCheckout: false,
    extraBed: false,
    events: false
  },
  lang: safeGet("ore_lang", "en") || "en",
  paymentMethod: "ccp", // Defaulting to the HTML default
  receiptUrl: null
};

// ─── Add-on Prices ──────────────────────────
const ADDON_PRICES = {
  restaurant_breakfast: 800,
  restaurant_halfboard: 1800,
  restaurant_fullboard: 3200,
  wifi: 300,
  parking: 500,
  airportTransfer: 2500,
  spa: 2000,
  lateCheckout: 1200,
  extraBed: 1000,
  events: 500
};

// ─── Cached DOM Elements ───────────────────
const els = {
  step1: document.getElementById("step-1"),
  step2: document.getElementById("step-2"),
  step3: document.getElementById("step-3"),

  btnNext1: document.getElementById("btn-next-1"),
  btnNext2: document.getElementById("btn-next-2"),
  btnPrev2: document.getElementById("btn-prev-2"),
  btnPrev3: document.getElementById("btn-prev-3"),
  btnConfirm: document.getElementById("btn-confirm-booking"),

  btnRoomMinus: document.getElementById("btn-minus-room"),
  btnRoomPlus: document.getElementById("btn-plus-room"),
  roomCount: document.getElementById("rooms-count"),
  btnAdultMinus: document.getElementById("btn-minus-adult"),
  btnAdultPlus: document.getElementById("btn-plus-adult"),
  adultCount: document.getElementById("adults-count"),
  btnChildMinus: document.getElementById("btn-minus-child"),
  btnChildPlus: document.getElementById("btn-plus-child"),
  childCount: document.getElementById("children-count"),
  childAgesBox: document.getElementById("child-ages-box"),

  calPrev: document.getElementById("cal-prev"),
  calNext: document.getElementById("cal-next"),
  calGrid: document.getElementById("calendar-grid"),
  monthLabel: document.getElementById("calendar-month-label"),

  payRadios: document.getElementsByName("payment_method"),
  receiptFile: document.getElementById("receipt-upload"),
  transferBox: document.getElementById("ccp-details"),

  globalAlert: document.getElementById("booking-global-alert"),

  // Review Elements
  revName: document.getElementById("rev-name"),
  revEmail: document.getElementById("rev-email"),
  revPhone: document.getElementById("rev-phone"),
  revCheckin: document.getElementById("rev-checkin"),
  revCheckout: document.getElementById("rev-checkout"),
  revGuests: document.getElementById("rev-guests"),
  revPaymentMethod: document.getElementById("rev-payment-method"),
  revPoints: document.getElementById("rev-points"),
  agreePolicy: document.getElementById("agree-policy"),

  // Summary Sidebar Elements
  propMiniImg: document.getElementById("prop-mini-img"),
  propMiniTitle: document.getElementById("prop-mini-title"),
  propMiniLoc: document.getElementById("prop-mini-loc"),
  propMiniType: document.getElementById("prop-mini-type"),
  sbNightsCount: document.getElementById("sb-nights-count"),
  sbNightPrice: document.getElementById("sb-night-price"),
  sbFeeAmount: document.getElementById("sb-fee-amount"),
  sbFeeRow: document.getElementById("sb-fee-row"),
  sbAddonsAmount: document.getElementById("sb-addons-amount"),
  sbAddonsRow: document.getElementById("sb-addons-row"),
  sbFinalTotal: document.getElementById("sb-final-total"),

  // Guest inputs
  gName: document.getElementById("guest-name"),
  gEmail: document.getElementById("guest-email"),
  gPhone: document.getElementById("guest-phone"),
  gArrivalTime: document.getElementById("arrival-time"),
  gSpecialReq: document.getElementById("special-requests")
};

// ─── Calendar State ────────────────────────
let calViewDate = new Date();
calViewDate.setDate(1);
calViewDate.setHours(12, 0, 0, 0);

// ─── Helpers ───────────────────────────────
const t = (en, ar) => bookingState.lang === "ar" ? ar : en;

function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function formatDisplayDate(str) {
  if (!str) return t("Add date", "أضف تاريخ");
  const d = parseLocalDate(str);
  if (!d || Number.isNaN(d.getTime())) return t("Add date", "أضف تاريخ");
  return d.toLocaleDateString(
    bookingState.lang === "ar" ? "ar-DZ" : "en-GB",
    { day: "2-digit", month: "short", year: "numeric" }
  );
}

function resolvePropertyId() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get("id") || params.get("propertyId") || params.get("pid");
  if (fromQuery && String(fromQuery).trim()) return String(fromQuery).trim();

  const hash = window.location.hash || "";
  const hashMatch = hash.match(/#?(?:prop|property)[-_=]?(.+)/i);
  if (hashMatch && hashMatch[1] && String(hashMatch[1]).trim()) {
    return String(hashMatch[1]).trim();
  }

  const stored = safeGet("selectedPropertyId") || safeGet("booking_property_id");
  if (stored && String(stored).trim()) return String(stored).trim();
  return null;
}

function persistPropertyId(id) {
  if (!id) return;
  safeSet("selectedPropertyId", String(id));
  safeSet("booking_property_id", String(id));
}

function showGlobalAlert(msg, type = "error") {
  const el = els.globalAlert;
  if (!el) return;
  const icons = { error: "warning", success: "check-circle", info: "info" };
  el.className = `booking-alert ${type}`;
  el.innerHTML = `<i class="ph ph-${icons[type] || "info"}"></i> <span>${msg}</span>`;
  el.classList.remove("d-none");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideGlobalAlert() {
  els.globalAlert?.classList.add("d-none");
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  if (loading) {
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> ${t("Processing...", "جارٍ المعالجة...")}`;
  } else {
    btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
  }
}

function applyStoredTheme() {
  const theme = safeGet("ore_theme");
  const icon = document.querySelector("#theme-toggle i");
  if (theme === "dark") {
    document.body.classList.add("dark");
    if (icon) icon.className = "ph ph-sun";
  } else {
    document.body.classList.remove("dark");
    if (icon) icon.className = "ph ph-moon";
  }
}

// ─── Initialization ─────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  bookingState.propertyId = resolvePropertyId();

  if (bookingState.propertyId) persistPropertyId(bookingState.propertyId);

  if (!bookingState.propertyId) {
    showGlobalAlert(t("No property selected. Redirecting…", "لم يتم تحديد عقار. جارٍ التحويل…"), "error");
    setTimeout(() => { window.location.href = "index.html"; }, 2000);
    return;
  }

  applyStoredTheme();

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    safeSet("ore_theme", isDark ? "dark" : "light");
    const icon = document.querySelector("#theme-toggle i");
    if (icon) icon.className = isDark ? "ph ph-sun" : "ph ph-moon";
  });

  document.getElementById("lang-toggle")?.addEventListener("click", () => {
    bookingState.lang = bookingState.lang === "ar" ? "en" : "ar";
    safeSet("ore_lang", bookingState.lang);
    location.reload();
  });

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      if (els.gName && !els.gName.value) els.gName.value = user.displayName || "";
      if (els.gEmail && !els.gEmail.value) els.gEmail.value = user.email || "";
    }
  });

  document.getElementById("back-btn")?.addEventListener("click", () => {
    if (document.referrer.includes(window.location.hostname)) history.back();
    else window.location.href = `property.html?id=${bookingState.propertyId}`;
  });

  setupNavigation();
  setupGuestControls();

  await loadPropertyDetails();
  await loadBookedDates();

  updateOccupancyCounters();
  renderChildAges();
  renderAddonsPanel();
  renderCalendar();
  updateBookingSummary();
});

// ─── Load Property Data ─────────────────────
async function loadPropertyDetails() {
  try {
    let docRef = db.collection("properties").doc(String(bookingState.propertyId));
    let doc;

    try { doc = await docRef.get({ source: 'server' }); } 
    catch (e) { doc = await docRef.get(); }

    if (!doc.exists) throw new Error("not-found");

    const p = { ...doc.data(), id: doc.id };
    bookingState.property = p;
    bookingState.basePrice = Number(p.price || p.basePrice || p.pricePerNight || 0);
    bookingState.minNights = Number(p.minNights || 1);
    bookingState.maxGuests = Number(p.maxGuests || 10);
    bookingState.maxRooms = Number(p.maxRooms || 5);

    const isAr = bookingState.lang === "ar";
    const title = isAr ? (p.titleAr || p.title) : (p.titleEn || p.title);
    const loc = isAr ? (p.locationAr || p.location) : (p.locationEn || p.location);
    const curr = isAr ? "د.ج" : "DZD";
    const imageSrc = p.imageUrl || p.mainImage || (Array.isArray(p.images) ? p.images[0] : "") || "images/placeholder.jpg";

    if (els.propMiniImg) {
      els.propMiniImg.src = imageSrc;
      els.propMiniImg.classList.remove("skeleton");
    }
    if (els.propMiniTitle) els.propMiniTitle.textContent = title || "—";
    if (els.propMiniLoc) els.propMiniLoc.textContent = loc || "—";
    if (els.propMiniType) els.propMiniType.textContent = isAr ? (p.typeAr || p.type) : (p.typeEn || p.type);
    if (els.sbNightPrice) els.sbNightPrice.textContent = `${bookingState.basePrice.toLocaleString()} ${curr}`;

  } catch (err) {
    handleError(err, "[loadPropertyDetails]");
  }
}

// ─── Load Booked Dates ──────────────────────
async function loadBookedDates() {
  try {
    const snap = await db.collection("bookings")
      .where("propertyId", "==", String(bookingState.propertyId))
      .where("status", "in", ["pending", "confirmed"])
      .get({ source: 'server' });

    bookingState.bookedDates = [];
    snap.forEach(docSnap => {
      const b = docSnap.data();
      if (!b.checkIn || !b.checkOut) return;

      let curr = b.checkInDate ? b.checkInDate.toDate() : parseLocalDate(b.checkIn);
      const end = b.checkOutDate ? b.checkOutDate.toDate() : parseLocalDate(b.checkOut);
      if (!curr || !end) return;

      curr.setHours(12, 0, 0, 0); 
      end.setHours(12, 0, 0, 0);

      while (curr < end) {
        bookingState.bookedDates.push(formatDateStr(curr));
        curr = new Date(curr);
        curr.setDate(curr.getDate() + 1);
      }
    });
  } catch (err) {
    handleError(err, "[loadBookedDates]");
  }
}

function isDateBooked(dateStr) {
  return bookingState.bookedDates.includes(dateStr);
}

function hasBookedDatesInRange(startStr, endStr) {
  let curr = parseLocalDate(startStr);
  const end = parseLocalDate(endStr);
  if (!curr || !end) return false;

  while (curr < end) {
    if (isDateBooked(formatDateStr(curr))) return true;
    curr.setDate(curr.getDate() + 1);
  }
  return false;
}

// ─── Calendar Functions ──────────────────────
const MONTH_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_AR = ["جانفي","فيفري","مارس","أفريل","ماي","جوان","جويلية","أوت","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
const DAYS_EN = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const DAYS_AR = ["أحد","إثن","ثلا","أرب","خمي","جمع","سبت"];

function renderCalendar() {
  const grid = els.calGrid;
  if (!grid) return;

  grid.innerHTML = "";
  const isAr = bookingState.lang === "ar";
  const m = calViewDate.getMonth();
  const y = calViewDate.getFullYear();

  if (els.monthLabel) els.monthLabel.textContent = `${isAr ? MONTH_AR[m] : MONTH_EN[m]} ${y}`;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (els.calPrev) els.calPrev.disabled = new Date(y, m, 1) <= currentMonthStart;

  (isAr ? DAYS_AR : DAYS_EN).forEach(d => {
    const el = document.createElement("div");
    el.className = "cal-day-name";
    el.textContent = d;
    grid.appendChild(el);
  });

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement("div");
    e.className = "cal-cell empty";
    grid.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d, 12, 0, 0, 0);
    const dateStr = formatDateStr(cellDate);
    const isPast = cellDate < now;
    const isBooked = isDateBooked(dateStr);
    const isToday = dateStr === formatDateStr(now);

    const cell = document.createElement("div");
    const classes = ["cal-cell"];
    if (isToday) classes.push("today");

    cell.setAttribute("data-date", dateStr);

    if (isPast || isBooked) {
      classes.push("disabled");
    } else {
      if (dateStr === bookingState.checkIn && dateStr === bookingState.checkOut) {
        classes.push("check-in", "check-out");
      } else if (dateStr === bookingState.checkIn) {
        classes.push("check-in");
      } else if (dateStr === bookingState.checkOut) {
        classes.push("check-out");
      } else if (bookingState.checkIn && bookingState.checkOut && dateStr > bookingState.checkIn && dateStr < bookingState.checkOut) {
        classes.push("in-range");
      }

      cell.addEventListener("click", () => handleDateClick(dateStr));
    }

    cell.className = classes.join(" ");
    cell.textContent = d;
    grid.appendChild(cell);
  }
}

if (els.calPrev) els.calPrev.addEventListener("click", () => {
  calViewDate.setMonth(calViewDate.getMonth() - 1);
  renderCalendar();
});
if (els.calNext) els.calNext.addEventListener("click", () => {
  calViewDate.setMonth(calViewDate.getMonth() + 1);
  renderCalendar();
});

function handleDateClick(dateStr) {
  if (!bookingState.checkIn || (bookingState.checkIn && bookingState.checkOut)) {
    // Start new selection
    bookingState.checkIn = dateStr;
    bookingState.checkOut = null;
    bookingState.nights = 0;
  } else {
    // End selection
    if (dateStr < bookingState.checkIn) {
      bookingState.checkOut = bookingState.checkIn;
      bookingState.checkIn = dateStr;
    } else {
      bookingState.checkOut = dateStr;
    }

    if (hasBookedDatesInRange(bookingState.checkIn, bookingState.checkOut)) {
      showGlobalAlert(t("Selected range contains unavailable dates.", "النطاق المحدد يحتوي على تواريخ غير متاحة."));
      bookingState.checkOut = null;
    } else {
      const start = parseLocalDate(bookingState.checkIn);
      const end = parseLocalDate(bookingState.checkOut);
      bookingState.nights = Math.round((end - start) / (1000 * 60 * 60 * 24));

      if (bookingState.nights < bookingState.minNights) {
        showGlobalAlert(t(`Minimum stay is ${bookingState.minNights} nights.`, `الحد الأدنى للإقامة هو ${bookingState.minNights} ليالي.`));
        bookingState.checkOut = null;
        bookingState.nights = 0;
      } else {
        hideGlobalAlert();
      }
    }
  }

  renderCalendar();
  updateBookingSummary();
}

// ─── Guest & Room Controls ──────────────────
function updateOccupancyCounters() {
  if (els.roomCount) els.roomCount.textContent = bookingState.rooms;
  if (els.adultCount) els.adultCount.textContent = bookingState.adults;
  if (els.childCount) els.childCount.textContent = bookingState.children;
  updateBookingSummary();
}

function setupGuestControls() {
  const updateState = (key, delta, min, max) => {
    const newVal = bookingState[key] + delta;
    if (newVal >= min && newVal <= max) {
      bookingState[key] = newVal;

      if (key === "children") {
        if (delta > 0) bookingState.childAges.push("");
        else bookingState.childAges.pop();
        renderChildAges();
      }

      updateOccupancyCounters();
      calcAddonsTotal(); // Recalculate if addons depend on guests
      updateBookingSummary();
    }
  };

  els.btnRoomMinus?.addEventListener("click", () => updateState("rooms", -1, 1, bookingState.maxRooms));
  els.btnRoomPlus?.addEventListener("click", () => updateState("rooms", 1, 1, bookingState.maxRooms));

  els.btnAdultMinus?.addEventListener("click", () => updateState("adults", -1, 1, bookingState.maxGuests));
  els.btnAdultPlus?.addEventListener("click", () => updateState("adults", 1, 1, bookingState.maxGuests));

  els.btnChildMinus?.addEventListener("click", () => updateState("children", -1, 0, bookingState.maxGuests - 1));
  els.btnChildPlus?.addEventListener("click", () => updateState("children", 1, 0, bookingState.maxGuests - 1));
}

function renderChildAges() {
  const box = els.childAgesBox;
  if (!box) return;

  if (bookingState.children === 0) {
    box.classList.add("d-none");
    box.innerHTML = "";
    return;
  }

  box.classList.remove("d-none");
  const isAr = bookingState.lang === "ar";
  let html = `<p style="font-size:0.85rem; font-weight:600; margin-bottom:8px;">${t("Children's ages", "أعمار الأطفال")}</p><div style="display:flex; gap:10px; flex-wrap:wrap;">`;

  for (let i = 0; i < bookingState.children; i++) {
    const currentAge = bookingState.childAges[i] ?? "";
    html += `<select style="padding:6px; border-radius:6px; border:1px solid var(--border);" class="child-age-select" data-index="${i}">
               <option value="">${t("Age?", "العمر؟")}</option>`;
    for (let j = 0; j < 18; j++) {
      html += `<option value="${j}" ${String(currentAge) === String(j) ? "selected" : ""}>${j === 0 ? t("< 1 yr", "أقل من سنة") : j}</option>`;
    }
    html += `</select>`;
  }
  html += "</div>";
  box.innerHTML = html;

  box.querySelectorAll(".child-age-select").forEach(sel => {
    sel.addEventListener("change", e => {
      bookingState.childAges[e.target.dataset.index] = e.target.value;
    });
  });
}

// ─── Add-ons Calculation & Rendering ────────
function calcAddonsTotal() {
  let total = 0;
  const s = bookingState.addons;
  const nights = bookingState.nights || 0;
  const guests = bookingState.adults + bookingState.children;

  if (s.restaurant) total += (ADDON_PRICES[`restaurant_${s.restaurantPlan}`] || 0) * nights * guests;
  if (s.wifi) total += ADDON_PRICES.wifi * nights * bookingState.rooms;
  if (s.parking) total += ADDON_PRICES.parking * nights;
  if (s.events) total += ADDON_PRICES.events * nights * guests;

  bookingState.addonsTotal = total;
  return total;
}

function renderAddonsPanel() {
  const container = document.getElementById("addons-panel");
  if (!container) return;
  const isAr = bookingState.lang === "ar";

  const items = [
    { key: "wifi", label: t("High-Speed WiFi", "واي فاي عالي السرعة") },
    { key: "parking", label: t("Secure Parking", "موقف سيارات آمن") },
    { key: "events", label: t("Events & Entertainment", "فعاليات وترفيه") }
  ];

  let html = `<div style="display:grid; gap:12px; margin-top:20px;">`;
  items.forEach(item => {
    const checked = bookingState.addons[item.key] ? "checked" : "";
    html += `<label style="display:flex; align-items:center; gap:10px; background:var(--surface); padding:12px; border:1px solid var(--border); border-radius:var(--radius-sm); cursor:pointer;">
              <input type="checkbox" class="addon-cb" data-key="${item.key}" ${checked}>
              <span style="font-weight:600;">${item.label}</span>
            </label>`;
  });
  html += `</div>`;
  container.innerHTML = html;

  container.querySelectorAll(".addon-cb").forEach(cb => {
    cb.addEventListener("change", e => {
      bookingState.addons[e.target.dataset.key] = e.target.checked;
      updateBookingSummary();
    });
  });
}

// ─── Booking Summary Update ─────────────────
function updateBookingSummary() {
  const isAr = bookingState.lang === "ar";
  const curr = isAr ? "د.ج" : "DZD";

  // Force at least 1 night for calculation if user hasn't selected dates, but only for display purpose
  const displayNights = bookingState.nights > 0 ? bookingState.nights : 1; 

  bookingState.roomPrice = bookingState.basePrice * displayNights * bookingState.rooms;
  calcAddonsTotal();
  bookingState.fee = bookingState.roomPrice * 0.05; // 5% fee
  bookingState.totalPrice = bookingState.roomPrice + bookingState.fee + bookingState.addonsTotal;

  if (els.sbNightsCount) els.sbNightsCount.textContent = bookingState.nights > 0 ? bookingState.nights : "—";

  if (els.sbFeeAmount && els.sbFeeRow) {
    if (bookingState.fee > 0) {
      els.sbFeeAmount.textContent = `${bookingState.fee.toLocaleString()} ${curr}`;
      els.sbFeeRow.style.display = "flex";
    } else {
      els.sbFeeRow.style.display = "none";
    }
  }

  if (els.sbAddonsAmount && els.sbAddonsRow) {
    if (bookingState.addonsTotal > 0) {
      els.sbAddonsAmount.textContent = `${bookingState.addonsTotal.toLocaleString()} ${curr}`;
      els.sbAddonsRow.style.display = "flex";
    } else {
      els.sbAddonsRow.style.display = "none";
    }
  }

  if (els.sbFinalTotal) {
    els.sbFinalTotal.textContent = bookingState.totalPrice > 0 ? `${bookingState.totalPrice.toLocaleString()} ${curr}` : "—";
  }
}

// ─── Setup Navigation ───────────────────────
function setupNavigation() {
  const navigateToStep = (stepNum) => {
    document.querySelectorAll('.booking-step').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.step-indicator').forEach((ind, idx) => {
      ind.classList.remove('active');
      if (idx < stepNum - 1) ind.classList.add('completed');
      else if (idx === stepNum - 1) {
        ind.classList.add('active');
        ind.classList.remove('completed');
      } else ind.classList.remove('completed', 'active');
    });

    const targetStep = document.getElementById(`step-${stepNum}`);
    if (targetStep) targetStep.classList.add('active');
    hideGlobalAlert();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  els.btnNext1?.addEventListener("click", () => {
    if (els.gName && !els.gName.value.trim()) {
      showGlobalAlert(t("Please enter your Full Name.", "يرجى إدخال اسمك الكامل."));
      return;
    }
    if (els.gEmail && !els.gEmail.value.trim()) {
      showGlobalAlert(t("Please enter your Email Address.", "يرجى إدخال بريدك الإلكتروني."));
      return;
    }
    if (els.gPhone && !els.gPhone.value.trim()) {
      showGlobalAlert(t("Please enter your Phone Number.", "يرجى إدخال رقم هاتفك."));
      return;
    }

    // If calendar exists in step 1, validate dates here. If not, bypass date validation.
    // Right now booking.html does not have a calendar in step 1, it assumes dates are handled elsewhere 
    // or passed via URL. Assuming standard flow:
    
    navigateToStep(2);
  });

  els.btnNext2?.addEventListener("click", () => {
    bookingState.paymentMethod = document.querySelector('input[name="payment_method"]:checked')?.value || "ccp";

    if (bookingState.paymentMethod === "ccp" && !bookingState.receiptUrl && els.receiptFile?.files.length === 0) {
      showGlobalAlert(t("Please upload your transfer receipt to proceed.", "يرجى إرفاق وصل التحويل للمتابعة."));
      return;
    }

    // Populate Review Step
    if (els.revName) els.revName.textContent = els.gName?.value || "—";
    if (els.revEmail) els.revEmail.textContent = els.gEmail?.value || "—";
    if (els.revPhone) els.revPhone.textContent = els.gPhone?.value || "—";
    
    // In our new flow, dates might not be selected in step 1 if the calendar was removed from the HTML.
    // Provide a fallback for dates:
    if (els.revCheckin) els.revCheckin.textContent = bookingState.checkIn ? formatDisplayDate(bookingState.checkIn) : t("Not Selected", "غير محدد");
    if (els.revCheckout) els.revCheckout.textContent = bookingState.checkOut ? formatDisplayDate(bookingState.checkOut) : t("Not Selected", "غير محدد");
    
    if (els.revGuests) els.revGuests.textContent = `${bookingState.adults} ${t("Adults", "بالغين")}, ${bookingState.children} ${t("Children", "أطفال")}`;
    if (els.revPaymentMethod) {
      els.revPaymentMethod.innerHTML = bookingState.paymentMethod === "ccp" 
        ? `<i class="ph ph-bank" style="color:var(--primary); margin-right:4px;"></i> ${t("Bank Transfer", "تحويل بنكي")}`
        : `<i class="ph ph-money" style="color:var(--primary); margin-right:4px;"></i> ${t("Pay at Property", "الدفع في الفندق")}`;
    }

    const earnedPoints = Math.floor(bookingState.totalPrice / 100);
    if (els.revPoints) els.revPoints.textContent = earnedPoints;

    navigateToStep(3);
  });

  els.btnPrev2?.addEventListener("click", () => navigateToStep(1));
  els.btnPrev3?.addEventListener("click", () => navigateToStep(2));

  // Edit Buttons logic from Review Step
  document.getElementById("btn-edit-guest")?.addEventListener("click", () => navigateToStep(1));
  document.getElementById("btn-edit-dates")?.addEventListener("click", () => navigateToStep(1)); // or wherever the calendar is
  document.getElementById("btn-edit-payment")?.addEventListener("click", () => navigateToStep(2));

  // Receipt File Upload Handler
  els.receiptFile?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      showGlobalAlert(t("Uploading receipt...", "جاري رفع الإيصال..."), "info");
      const storageRef = storage.ref(`receipts/booking_${Date.now()}_${file.name}`);
      const snapshot = await storageRef.put(file);
      bookingState.receiptUrl = await snapshot.ref.getDownloadURL();
      showGlobalAlert(t("Receipt uploaded successfully.", "تم رفع الإيصال بنجاح."), "success");
    } catch (err) {
      handleError(err, "[Receipt Upload]");
    }
  });

  // Final Submit
  els.btnConfirm?.addEventListener("click", async () => {
    if (els.agreePolicy && !els.agreePolicy.checked) {
      showGlobalAlert(t("You must agree to the Terms and Policies.", "يجب الموافقة على الشروط والسياسات."));
      return;
    }

    setButtonLoading(els.btnConfirm, true);

    try {
      const bookingRef = db.collection("bookings").doc();
      const payload = {
        bookingId: bookingRef.id,
        propertyId: String(bookingState.propertyId),
        guestId: currentUser ? currentUser.uid : "guest",
        guestName: els.gName?.value || "Guest",
        guestEmail: els.gEmail?.value || "",
        guestPhone: els.gPhone?.value || "",
        checkIn: bookingState.checkIn || null,
        checkOut: bookingState.checkOut || null,
        nights: bookingState.nights || 0,
        rooms: bookingState.rooms || 1,
        adults: bookingState.adults || 1,
        children: bookingState.children || 0,
        totalPrice: bookingState.totalPrice || 0,
        paymentMethod: bookingState.paymentMethod,
        receiptUrl: bookingState.receiptUrl || null,
        status: "pending",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await bookingRef.set(payload);

      if (typeof window.confetti === "function") {
        window.confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }

      showGlobalAlert(t("Booking Confirmed Successfully!", "تم تأكيد الحجز بنجاح!"), "success");

      setTimeout(() => {
        window.location.href = "index.html"; 
      }, 4000);

    } catch (err) {
      handleError(err, "[Booking Submit]");
    }
  });
}

// ─── Error Handler ──────────────────────────
function handleError(err, context = "") {
  console.error(context, err);
  let msg = t("Unexpected error. Please try again.", "خطأ غير متوقع. يرجى المحاولة مجدداً.");
  showGlobalAlert(msg, "error");
  setButtonLoading(els.btnConfirm, false);
}
