// =========================================
//   Advanced Booking Logic — booking.js
//   OreBooking © 2025 | Hotel Edition
//   Enhanced Version v5.2 — Property Data Resolve Fix
// =========================================

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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// ─── Static Reviews Data ───────────────────
const STATIC_REVIEWS = [
  {
    name: "Karim B.", avatar: "KB", rating: 5, date: "2025-03-15",
    stay: "3 nights · March 2025",
    text_en: "Exceptional stay. The room was spotless, the staff incredibly welcoming. The restaurant breakfast was outstanding — fresh juices, variety of pastries. Will definitely return.",
    text_ar: "إقامة استثنائية. الغرفة كانت نظيفة جداً والطاقم رائع في الاستقبال. إفطار المطعم كان رائعاً — عصائر طازجة وتشكيلة متنوعة من المعجنات. سأعود بالتأكيد.",
    country: "Algeria", flag: "🇩🇿", type: "positive"
  },
  {
    name: "Siham M.", avatar: "SM", rating: 4, date: "2025-02-20",
    stay: "2 nights · February 2025",
    text_en: "Very comfortable rooms and the WiFi was fast and stable throughout our stay. The only downside was that the pool area could use more loungers during peak hours. Overall a great experience.",
    text_ar: "غرف مريحة جداً والواي فاي كان سريعاً ومستقراً طوال إقامتنا. السلبية الوحيدة أن منطقة المسبح تحتاج مزيداً من الكراسي في أوقات الذروة. تجربة رائعة بشكل عام.",
    country: "Tunisia", flag: "🇹🇳", type: "constructive"
  },
  {
    name: "Youcef A.", avatar: "YA", rating: 3, date: "2025-01-08",
    stay: "4 nights · January 2025",
    text_en: "The hotel has great potential. Location is perfect and the events team organised a lovely evening. However, room service was slow and our room wasn't cleaned one afternoon. Management should address this.",
    text_ar: "الفندق لديه إمكانات كبيرة. الموقع ممتاز وفريق الفعاليات نظّم أمسية جميلة. لكن خدمة الغرف كانت بطيئة ولم تُنظّف غرفتنا في أحد الأيام. على الإدارة معالجة هذا الأمر.",
    country: "Algeria", flag: "🇩🇿", type: "mixed"
  },
  {
    name: "Nadia L.", avatar: "NL", rating: 5, date: "2024-12-28",
    stay: "5 nights · December 2024",
    text_en: "We celebrated New Year's here and it was magical. The New Year's Eve event was incredible — live music, fireworks, amazing food. Staff went above and beyond for us. Highly recommend.",
    text_ar: "احتفلنا بالسنة الجديدة هنا وكانت تجربة سحرية. حفلة رأس السنة كانت مذهلة — موسيقى حية، ألعاب نارية، طعام رائع. الطاقم قدّم كل ما يمكن من أجلنا. أنصح به بشدة.",
    country: "France", flag: "🇫🇷", type: "positive"
  },
  {
    name: "Mourad T.", avatar: "MT", rating: 2, date: "2024-11-12",
    stay: "1 night · November 2024",
    text_en: "Disappointed with this visit. The air conditioning in our room was broken and despite reporting it twice, it wasn't fixed. The TV also had issues. Front desk staff were polite but couldn't resolve our problems.",
    text_ar: "خرجت مخيّباً من هذه الزيارة. مكيف الهواء في غرفتنا كان معطلاً وبالرغم من إبلاغهم مرتين لم يُصلح. التلفاز أيضاً به مشاكل. موظفو الاستقبال كانوا مؤدبين لكن لم يحلّوا مشاكلنا.",
    country: "Algeria", flag: "🇩🇿", type: "negative"
  },
  {
    name: "Amira K.", avatar: "AK", rating: 4, date: "2024-10-05",
    stay: "3 nights · October 2024",
    text_en: "Beautiful hotel, very clean and modern. The restaurant demi-pension option was worth it — dinner buffet was diverse and delicious. WiFi speed could be improved in the upper floors though.",
    text_ar: "فندق جميل ونظيف وعصري. خيار نصف الإقامة في المطعم كان يستحق — بوفيه العشاء متنوع ولذيذ. لكن سرعة الواي فاي في الطوابق العليا تحتاج تحسيناً.",
    country: "Morocco", flag: "🇲🇦", type: "constructive"
  },
  {
    name: "Salim R.", avatar: "SR", rating: 5, date: "2024-09-18",
    stay: "7 nights · September 2024",
    text_en: "Best hotel stay I've had in years. Came with family including two kids — the animation team kept the children entertained every evening. Kids club is excellent. The suite was enormous and the view stunning.",
    text_ar: "أفضل إقامة فندقية منذ سنوات. جئنا مع العائلة بما فيها طفلين — فريق الأنيماسيون أبقى الأطفال مسلّيين كل مساء. نادي الأطفال ممتاز. الجناح كان فسيحاً جداً والمنظر رائع.",
    country: "Algeria", flag: "🇩🇿", type: "positive"
  },
  {
    name: "Leila F.", avatar: "LF", rating: 3, date: "2024-08-22",
    stay: "2 nights · August 2024",
    text_en: "The hotel is in a great location and check-in was smooth. However, the restaurant lunch service felt rushed and the portions were small for the price. The pool area and spa were highlights though.",
    text_ar: "الفندق في موقع ممتاز وتسجيل الوصول كان سلساً. لكن خدمة الغداء في المطعم بدت متسرّعة والأجزاء كانت صغيرة مقارنة بالسعر. منطقة المسبح والسبا كانا مميزَين.",
    country: "Algeria", flag: "🇩🇿", type: "mixed"
  }
];

// ─── Booking State ─────────────────────────
let currentUser = null;
let lastSuccessfulBooking = null;

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
  bedConfig: "double",
  purposeOfVisit: "leisure",
  lang: safeGet("ore_lang", "en") || "en",
  nationality: "",
  arrivalTime: "",
  specialRequests: ""
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
  step4: document.getElementById("step-4"),

  btnNext1: document.getElementById("btn-next-1"),
  btnNext2: document.getElementById("btn-next-2"),
  btnNext3: document.getElementById("btn-next-3"),
  btnPrev2: document.getElementById("btn-prev-2"),
  btnPrev3: document.getElementById("btn-prev-3"),
  btnPrev4: document.getElementById("btn-prev-4"),
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
  bedSelect: document.getElementById("bed-config-select"),

  calPrev: document.getElementById("cal-prev"),
  calNext: document.getElementById("cal-next"),
  calGrid: document.getElementById("calendar-grid"),
  monthLabel: document.getElementById("calendar-month-label"),

  guestForm: document.getElementById("guest-form"),
  agreePolicy: document.getElementById("agree-policy"),
  payRadios: document.getElementsByName("payment_method"),
  receiptFile: document.getElementById("receipt-file"),
  transferBox: document.getElementById("transfer-details"),

  dispCheckin: document.getElementById("disp-checkin"),
  dispCheckout: document.getElementById("disp-checkout"),
  dispNights: document.getElementById("disp-nights"),
  warnEl: document.getElementById("min-nights-warning"),
  globalAlert: document.getElementById("booking-global-alert"),
  priceBreakdown: document.getElementById("price-breakdown"),

  gName: document.getElementById("g-name"),
  gEmail: document.getElementById("g-email"),
  gPhone: document.getElementById("g-phone"),
  gNotes: document.getElementById("g-notes"),
  gArrival: document.getElementById("g-arrival-time"),
  gNationality: document.getElementById("g-nationality"),
  gPurpose: document.getElementById("g-purpose"),
  authPrompt: document.getElementById("auth-prompt"),
  linkLogin: document.getElementById("link-login-booking"),

  btnCopyRef: document.getElementById("btn-copy-ref"),
  btnShareBooking: document.getElementById("btn-share-booking"),

  propMiniImg: document.getElementById("prop-mini-img"),
  propMiniTitle: document.getElementById("prop-mini-title"),
  propMiniLoc: document.getElementById("prop-mini-loc"),
  propMiniType: document.getElementById("prop-mini-type"),
  sbNightsCount: document.getElementById("sb-nights-count"),
  sbNightPrice: document.getElementById("sb-night-price"),
  sbBaseTotal: document.getElementById("sb-base-total"),
  sbFinalTotal: document.getElementById("sb-final-total"),

  successModal: document.getElementById("booking-success-modal"),
  btnCloseSuccess: document.getElementById("btn-close-success") || document.getElementById("btn-done") || document.getElementById("done-btn") || document.getElementById("success-done-btn"),
  btnCloseSuccess2: document.getElementById("btn-close-success-2") || document.getElementById("btn-done-2"),
  btnPrintReceipt: document.getElementById("btn-print-receipt") || document.getElementById("print-receipt-btn") || document.getElementById("success-print-btn"),
  btnDownloadReceipt: document.getElementById("btn-download-receipt")
};

// ─── Calendar State ────────────────────────
let calViewDate = new Date();
calViewDate.setDate(1);

// ─── Helpers ───────────────────────────────
const t = (en, ar) => bookingState.lang === "ar" ? ar : en;

function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseLocalDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
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

  const fromQuery =
    params.get("id") ||
    params.get("propertyId") ||
    params.get("property") ||
    params.get("pid");

  if (fromQuery && String(fromQuery).trim()) return String(fromQuery).trim();

  const hash = window.location.hash || "";
  const hashMatch = hash.match(/#?(?:prop|property)[-_=]?(.+)/i);
  if (hashMatch && hashMatch[1] && String(hashMatch[1]).trim()) {
    return String(hashMatch[1]).trim();
  }

  const stored =
    safeGet("selectedPropertyId") ||
    safeGet("booking_property_id") ||
    safeGet("last_property_id");

  if (stored && String(stored).trim()) return String(stored).trim();

  return null;
}

function persistPropertyId(id) {
  if (!id) return;
  safeSet("selectedPropertyId", String(id));
  safeSet("booking_property_id", String(id));
  safeSet("last_property_id", String(id));
}

function showGlobalAlert(msg, type = "error") {
  const el = els.globalAlert;
  if (!el) return;
  const icons = {
    error: "warning",
    success: "check-circle",
    info: "info",
    warning: "warning-circle"
  };
  el.className = `booking-alert ${type}`;
  el.innerHTML = `<i class="ph ph-${icons[type] || "info"}" aria-hidden="true"></i><span>${msg}</span>`;
  el.classList.remove("d-none");
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function hideGlobalAlert() {
  els.globalAlert?.classList.add("d-none");
}

function showWarn(msg) {
  if (!els.warnEl) return;
  els.warnEl.textContent = msg;
  els.warnEl.classList.remove("d-none");
}

function hideWarn() {
  els.warnEl?.classList.add("d-none");
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.setAttribute("aria-disabled", String(loading));

  if (loading) {
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.classList.add("loading");
    btn.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span><span>${t("Processing…", "جارٍ المعالجة…")}</span>`;
  } else {
    btn.classList.remove("loading");
    btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
  }
}

function applyStoredTheme() {
  const theme = safeGet("ore_theme");
  const icon = document.querySelector("#theme-toggle i");
  if (theme === "dark") {
    document.body.classList.add("dark");
    document.documentElement.classList.add("dark");
    if (icon) icon.className = "ph ph-sun";
  } else {
    document.body.classList.remove("dark");
    document.documentElement.classList.remove("dark");
    if (icon) icon.className = "ph ph-moon";
  }
}

function showSidebarSkeleton() {
  ["sum-name", "sum-loc", "sum-price-night"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<span class="skeleton skeleton-text" style="width:60%;display:inline-block;height:0.9em;"></span>';
  });
  document.getElementById("sum-img")?.classList.add("skeleton");
}

function showCopyToast(msg) {
  const toast = document.getElementById("copy-toast");
  const txt = document.getElementById("copy-toast-txt");
  if (!toast) {
    const el = document.createElement("div");
    el.id = "copy-toast";
    el.className = "copy-toast";
    el.innerHTML = `<i class="ph-fill ph-check-circle"></i><span id="copy-toast-txt">${msg || t("Copied!", "تم النسخ!")}</span>`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
    return;
  }
  if (txt) txt.textContent = msg || t("Copied!", "تم النسخ!");
  toast.classList.remove("d-none");
  setTimeout(() => toast.classList.add("d-none"), 2200);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function escapeHtml(str = "") {
  const div = document.createElement("div");
  div.textContent = String(str);
  return div.innerHTML;
}

function getSelectedPaymentMethod() {
  return document.querySelector('input[name="payment_method"]:checked')?.value || "";
}

function getPaymentMethodLabel(method) {
  return method === "transfer"
    ? t("Bank Transfer", "تحويل بنكي")
    : t("Pay at Property", "الدفع في الفندق");
}

function buildAddonSummaryText() {
  const items = [];
  const ad = bookingState.addons;
  if (ad.restaurant) {
    const map = {
      breakfast: t("Restaurant - Breakfast", "المطعم - إفطار"),
      halfboard: t("Restaurant - Half Board", "المطعم - نصف إقامة"),
      fullboard: t("Restaurant - Full Board", "المطعم - إقامة كاملة")
    };
    items.push(map[ad.restaurantPlan] || t("Restaurant", "المطعم"));
  }
  if (ad.wifi) items.push(t("WiFi", "واي فاي"));
  if (ad.parking) items.push(t("Parking", "موقف سيارات"));
  if (ad.airportTransfer) items.push(t("Airport Transfer", "نقل المطار"));
  if (ad.spa) items.push(t("Spa", "السبا"));
  if (ad.lateCheckout) items.push(t("Late Checkout", "مغادرة متأخرة"));
  if (ad.extraBed) items.push(t("Extra Bed", "سرير إضافي"));
  if (ad.events) items.push(t("Events", "فعاليات"));
  return items.length ? items.join(" • ") : t("None", "لا شيء");
}

function getBookingDataForReceipt() {
  if (lastSuccessfulBooking) return lastSuccessfulBooking;

  const refId = document.getElementById("succ-ref")?.textContent?.trim() || "";
  const guestName = document.getElementById("succ-name")?.textContent?.trim() || "";
  const guestEmail = document.getElementById("succ-email")?.textContent?.trim() || "";
  const guestPhone = document.getElementById("succ-phone")?.textContent?.trim() || "";
  const totalText = document.getElementById("succ-total")?.textContent?.trim() || "";

  if (!refId && !guestName) return null;

  return {
    refId,
    guestName,
    guestEmail,
    guestPhone,
    checkIn: bookingState.checkIn || "",
    checkOut: bookingState.checkOut || "",
    nights: bookingState.nights || 0,
    rooms: bookingState.rooms || 1,
    adults: bookingState.adults || 0,
    children: bookingState.children || 0,
    paymentMethod: getSelectedPaymentMethod() || "cash",
    roomPrice: bookingState.roomPrice || 0,
    addonsTotal: bookingState.addonsTotal || 0,
    fee: bookingState.fee || 0,
    totalPrice: bookingState.totalPrice || parseFloat(String(totalText).replace(/[^\d.]/g, "")) || 0
  };
}

// ─── Calculate Add-ons Total ────────────────
function calcAddonsTotal() {
  let total = 0;
  const s = bookingState.addons;
  const nights = bookingState.nights || 0;
  const rooms = bookingState.rooms;
  const guests = bookingState.adults + bookingState.children;

  if (s.restaurant) total += (ADDON_PRICES[`restaurant_${s.restaurantPlan}`] || 0) * nights * guests;
  if (s.wifi) total += ADDON_PRICES.wifi * nights * rooms;
  if (s.parking) total += ADDON_PRICES.parking * nights;
  if (s.airportTransfer) total += ADDON_PRICES.airportTransfer;
  if (s.spa) total += ADDON_PRICES.spa * nights;
  if (s.lateCheckout) total += ADDON_PRICES.lateCheckout * rooms;
  if (s.extraBed) total += ADDON_PRICES.extraBed * nights * rooms;
  if (s.events) total += ADDON_PRICES.events * nights * guests;

  bookingState.addonsTotal = total;
  return total;
}

// ─── Render Child Ages Inputs ───────────────
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

  let html = `<p class="child-ages-title">${t("Children's ages (at check-in)", "أعمار الأطفال (عند الوصول)")}</p>`;
  html += '<div class="child-ages-grid">';

  for (let i = 0; i < bookingState.children; i++) {
    const currentAge = bookingState.childAges[i] ?? "";
    html += `
      <div class="child-age-field">
        <label for="child-age-${i}">${t("Child", "طفل")} ${i + 1}</label>
        <select id="child-age-${i}" class="child-age-select" data-child-index="${i}" aria-label="${t("Age of child", "عمر الطفل")} ${i + 1}">
          <option value="">${t("Age?", "العمر؟")}</option>
          ${Array.from({ length: 18 }, (_, j) =>
            `<option value="${j}" ${String(currentAge) === String(j) ? "selected" : ""}>${j === 0 ? t("< 1 yr", "أقل من سنة") : (isAr ? `${j} سنوات` : `${j} yrs`)}</option>`
          ).join("")}
        </select>
      </div>
    `;
  }

  html += "</div>";
  box.innerHTML = html;

  box.querySelectorAll(".child-age-select").forEach(sel => {
    sel.addEventListener("change", e => {
      const idx = parseInt(e.target.dataset.childIndex, 10);
      bookingState.childAges[idx] = e.target.value === "" ? "" : parseInt(e.target.value, 10);
    });
  });
}

// ─── Render Addons Panel ────────────────────
function renderAddonsPanel() {
  const container = document.getElementById("addons-panel");
  if (!container) return;

  const isAr = bookingState.lang === "ar";
  const curr = isAr ? "د.ج" : "DZD";

  const addonItems = [
    { key: "restaurant", icon: "ph-fork-knife", label: t("Restaurant", "المطعم"), desc: t("Add meal plan for all guests", "أضف خطة وجبات لجميع الضيوف"), badge: null, subOptions: true },
    { key: "wifi", icon: "ph-wifi-high", label: t("High-Speed WiFi", "واي فاي عالي السرعة"), desc: t(`${ADDON_PRICES.wifi.toLocaleString()} ${curr}/room/night`, `${ADDON_PRICES.wifi.toLocaleString()} ${curr} / غرفة / ليلة`), badge: t("Popular", "مشهور") },
    { key: "parking", icon: "ph-car", label: t("Secure Parking", "موقف سيارات آمن"), desc: t(`${ADDON_PRICES.parking.toLocaleString()} ${curr}/night`, `${ADDON_PRICES.parking.toLocaleString()} ${curr} / ليلة`), badge: null },
    { key: "airportTransfer", icon: "ph-airplane-takeoff", label: t("Airport Transfer", "نقل المطار"), desc: t(`${ADDON_PRICES.airportTransfer.toLocaleString()} ${curr} one-way`, `${ADDON_PRICES.airportTransfer.toLocaleString()} ${curr} ذهاباً`), badge: null },
    { key: "spa", icon: "ph-flower-lotus", label: t("Spa & Wellness", "السبا والعافية"), desc: t(`${ADDON_PRICES.spa.toLocaleString()} ${curr}/person/night`, `${ADDON_PRICES.spa.toLocaleString()} ${curr} / شخص / ليلة`), badge: null },
    { key: "lateCheckout", icon: "ph-clock-countdown", label: t("Late Checkout (until 4PM)", "مغادرة متأخرة (حتى 4م)"), desc: t(`${ADDON_PRICES.lateCheckout.toLocaleString()} ${curr}/room`, `${ADDON_PRICES.lateCheckout.toLocaleString()} ${curr} / غرفة`), badge: t("Subject to availability", "حسب التوفر") },
    { key: "extraBed", icon: "ph-bed", label: t("Extra Bed", "سرير إضافي"), desc: t(`${ADDON_PRICES.extraBed.toLocaleString()} ${curr}/room/night`, `${ADDON_PRICES.extraBed.toLocaleString()} ${curr} / غرفة / ليلة`), badge: null },
    { key: "events", icon: "ph-confetti", label: t("Entertainment & Events", "الترفيه والفعاليات"), desc: t("Nightly shows, pool parties, cultural evenings", "عروض مسائية، حفلات المسبح، أمسيات ثقافية"), badge: t("Popular", "مشهور") }
  ];

  let html = `<h3 class="addons-title"><i class="ph ph-sparkle" aria-hidden="true"></i> ${t("Enhance Your Stay", "حسّن إقامتك")}</h3>`;
  html += '<div class="addons-grid">';

  addonItems.forEach(item => {
    const checked = bookingState.addons[item.key];
    html += `
      <label class="addon-card ${checked ? "selected" : ""}" for="addon-${item.key}">
        <div class="addon-card-header">
          <div class="addon-icon"><i class="ph ${item.icon}" aria-hidden="true"></i></div>
          <div class="addon-info">
            <span class="addon-label">${item.label}</span>
            ${item.badge ? `<span class="addon-badge">${item.badge}</span>` : ""}
            <span class="addon-desc">${item.desc}</span>
          </div>
          <div class="addon-checkbox ${checked ? "checked" : ""}" aria-hidden="true">
            ${checked ? '<i class="ph-fill ph-check" style="font-size:0.75rem;color:#fff;"></i>' : ""}
          </div>
          <input type="checkbox" id="addon-${item.key}" class="addon-cb-input" data-key="${item.key}" ${checked ? "checked" : ""} aria-label="${item.label}" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;">
        </div>
        ${item.subOptions && checked ? `
          <div class="addon-sub-options">
            <p class="sub-label">${t("Meal Plan:", "خطة الوجبات:")}</p>
            <div class="sub-radio-group">
              <label class="sub-radio ${bookingState.addons.restaurantPlan === "breakfast" ? "active" : ""}">
                <input type="radio" name="restaurant_plan" value="breakfast" ${bookingState.addons.restaurantPlan === "breakfast" ? "checked" : ""}>
                <span>${t("Breakfast", "إفطار")}</span>
                <small>${ADDON_PRICES.restaurant_breakfast.toLocaleString()} ${curr}/${t("pers", "شخص")}</small>
              </label>
              <label class="sub-radio ${bookingState.addons.restaurantPlan === "halfboard" ? "active" : ""}">
                <input type="radio" name="restaurant_plan" value="halfboard" ${bookingState.addons.restaurantPlan === "halfboard" ? "checked" : ""}>
                <span>${t("Half-Board", "نصف إقامة")}</span>
                <small>${ADDON_PRICES.restaurant_halfboard.toLocaleString()} ${curr}/${t("pers", "شخص")}</small>
              </label>
              <label class="sub-radio ${bookingState.addons.restaurantPlan === "fullboard" ? "active" : ""}">
                <input type="radio" name="restaurant_plan" value="fullboard" ${bookingState.addons.restaurantPlan === "fullboard" ? "checked" : ""}>
                <span>${t("Full-Board", "إقامة كاملة")}</span>
                <small>${ADDON_PRICES.restaurant_fullboard.toLocaleString()} ${curr}/${t("pers", "شخص")}</small>
              </label>
            </div>
          </div>` : ""}
      </label>
    `;
  });

  html += "</div>";
  container.innerHTML = html;

  container.querySelectorAll(".addon-card").forEach(card => {
    card.addEventListener("click", e => {
      if (e.target.closest(".addon-sub-options")) return;
      const cb = card.querySelector(".addon-cb-input");
      if (!cb) return;
      const key = cb.dataset.key;
      bookingState.addons[key] = !bookingState.addons[key];
      renderAddonsPanel();
      updateBookingSummary();
    });
  });

  container.querySelectorAll('input[name="restaurant_plan"]').forEach(r => {
    r.addEventListener("change", e => {
      bookingState.addons.restaurantPlan = e.target.value;
      renderAddonsPanel();
      updateBookingSummary();
    });
  });
}

// ─── Render Reviews ─────────────────────────
function renderReviews() {
  const container = document.getElementById("reviews-section");
  if (!container) return;

  const isAr = bookingState.lang === "ar";
  const reviews = STATIC_REVIEWS;
  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);

  const ratingDist = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    pct: Math.round((reviews.filter(r => r.rating === star).length / reviews.length) * 100)
  }));

  const starsHtml = rating => Array.from({ length: 5 }, (_, i) =>
    `<i class="ph-fill ph-star ${i < rating ? "star-filled" : "star-empty"}" aria-hidden="true"></i>`
  ).join("");

  let html = `
    <div class="reviews-header">
      <h3 class="reviews-title">${t("Guest Reviews", "آراء الضيوف")}</h3>
      <div class="reviews-overview">
        <div class="reviews-score">
          <span class="score-big">${avgRating}</span>
          <div class="score-meta">
            <div class="stars-row">${starsHtml(Math.round(avgRating))}</div>
            <span class="score-count">${reviews.length} ${t("reviews", "تقييم")}</span>
          </div>
        </div>
        <div class="rating-bars">
          ${ratingDist.map(d => `
            <div class="rating-bar-row">
              <span class="bar-label">${d.star} <i class="ph-fill ph-star star-filled" aria-hidden="true"></i></span>
              <div class="bar-track"><div class="bar-fill" style="width:${d.pct}%"></div></div>
              <span class="bar-count">${d.count}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
    <div class="reviews-list">
  `;

  reviews.forEach(rev => {
    const text = isAr ? rev.text_ar : rev.text_en;
    const typeClass = {
      positive: "rev-positive",
      negative: "rev-negative",
      mixed: "rev-mixed",
      constructive: "rev-constructive"
    }[rev.type] || "";
    const date = parseLocalDate(rev.date)?.toLocaleDateString(isAr ? "ar-DZ" : "en-GB", { month: "long", year: "numeric" }) || "";

    html += `
      <div class="review-card ${typeClass}">
        <div class="review-top">
          <div class="reviewer-avatar" aria-hidden="true">${rev.avatar}</div>
          <div class="reviewer-info">
            <span class="reviewer-name">${rev.name} <span class="reviewer-flag">${rev.flag}</span></span>
            <span class="reviewer-stay">${rev.stay}</span>
          </div>
          <div class="review-rating" aria-label="${t("Rating", "التقييم")}: ${rev.rating}/5">${starsHtml(rev.rating)}</div>
        </div>
        <p class="review-text">${text}</p>
        <span class="review-date">${date}</span>
      </div>
    `;
  });

  html += "</div>";
  container.innerHTML = html;

  const ratingStrip = document.getElementById("sum-rating");
  const reviewsCount = document.getElementById("sum-reviews-count");
  if (ratingStrip) ratingStrip.textContent = avgRating;
  if (reviewsCount) reviewsCount.textContent = `(${reviews.length} ${t("reviews", "تقييم")})`;
}

// ─── Theme Toggle ───────────────────────────
function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    document.documentElement.classList.toggle("dark", isDark);
    const icon = btn.querySelector("i");
    if (icon) icon.className = isDark ? "ph ph-sun" : "ph ph-moon";
    safeSet("ore_theme", isDark ? "dark" : "light");
  });
}

// ─── Language Toggle ─────────────────────────
function setupLangToggle() {
  const btn = document.getElementById("lang-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    bookingState.lang = bookingState.lang === "ar" ? "en" : "ar";
    safeSet("ore_lang", bookingState.lang);
    translateBookingPage();
    renderCalendar();
    renderAddonsPanel();
    renderReviews();
    updateBookingSummary();
    updateOccupancyCounters();
    renderChildAges();
    updatePaymentUI();

    const span = btn.querySelector("span");
    if (span) span.textContent = bookingState.lang === "ar" ? "English" : "العربية";
  });
}

// ─── Initialization ─────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  bookingState.propertyId = resolvePropertyId();

  if (bookingState.propertyId) {
    persistPropertyId(bookingState.propertyId);
  }

  if (!bookingState.propertyId) {
    showGlobalAlert(t("No property selected. Redirecting…", "لم يتم تحديد عقار. جارٍ التحويل…"), "error");
    setTimeout(() => { window.location.href = "index.html"; }, 2000);
    return;
  }

  applyStoredTheme();
  translateBookingPage();
  setupThemeToggle();
  setupLangToggle();

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      if (els.gName && !els.gName.value) els.gName.value = user.displayName || "";
      if (els.gEmail && !els.gEmail.value) els.gEmail.value = user.email || "";
      els.authPrompt?.classList.add("d-none");
    } else {
      els.authPrompt?.classList.remove("d-none");
    }
  });

  document.getElementById("back-btn")?.addEventListener("click", () => {
    if (document.referrer && document.referrer.includes(window.location.hostname)) history.back();
    else window.location.href = `index.html${bookingState.propertyId ? "#prop-" + bookingState.propertyId : ""}`;
  });

  els.linkLogin?.addEventListener("click", e => {
    e.preventDefault();
    if (window.opener) window.opener.postMessage("open-auth-modal", "*");
    else window.location.href = "index.html?login=1";
  });

  setupEventListeners();
  showSidebarSkeleton();

  await loadPropertyDetails();
  await loadBookedDates();

  updateOccupancyCounters();
  renderChildAges();
  renderAddonsPanel();
  updatePaymentUI();
  updateBookingSummary();
  renderCalendar();
  renderReviews();

  const initialHash = window.location.hash;
  if (/^#step-[1-4]$/.test(initialHash)) {
    const step = parseInt(initialHash.replace("#step-", ""), 10);
    if (step >= 1 && step <= 4) goToStep(step, true);
  } else {
    goToStep(1, true);
  }

  window.addEventListener("popstate", () => {
    const hash = window.location.hash;
    if (hash.startsWith("#step-")) {
      const step = parseInt(hash.replace("#step-", ""), 10);
      if (step >= 1 && step <= 4) goToStep(step, true);
    }
  });
});

// ─── Load Property Data ─────────────────────
async function loadPropertyDetails() {
  try {
    if (!bookingState.propertyId) {
      throw new Error("missing-property-id");
    }

    const docRef = db.collection("properties").doc(String(bookingState.propertyId));
    let doc = await docRef.get();

    if (!doc.exists && Number.isFinite(Number(bookingState.propertyId))) {
      doc = await db.collection("properties").doc(Number(bookingState.propertyId).toString()).get();
    }

    if (!doc.exists) throw new Error("not-found");

    const raw = doc.data() || {};
    const p = {
      ...raw,
      id: raw.id || doc.id,
      docId: doc.id
    };

    bookingState.property = p;
    bookingState.propertyId = p.id || p.docId || bookingState.propertyId;
    persistPropertyId(bookingState.propertyId);

    bookingState.basePrice = Number(p.price || p.basePrice || p.pricePerNight || 0);
    bookingState.minNights = Number(p.minNights || 1);
    bookingState.maxGuests = Number(p.maxGuests || 10);
    bookingState.maxRooms = Number(p.maxRooms || 5);

    const isAr = bookingState.lang === "ar";
    const title = isAr ? (p.titleAr || p.title || p.titleEn) : (p.titleEn || p.title || p.titleAr);
    const loc = isAr ? (p.locationAr || p.location || p.locationEn) : (p.locationEn || p.location || p.locationAr);
    const curr = isAr ? "د.ج" : "DZD";
    const type = isAr ? (p.typeAr || p.type || "") : (p.type || p.typeEn || "");
    const imageSrc =
      p.imageUrl ||
      p.mainImage ||
      p.thumbnail ||
      (Array.isArray(p.images) ? p.images[0] : "") ||
      "images/placeholder.jpg";

    const setTxt = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setTxt("sum-name", title || "—");
    setTxt("sum-price-night", `${bookingState.basePrice.toLocaleString()} ${curr}`);

    const locEl = document.getElementById("sum-loc");
    if (locEl) locEl.innerHTML = `<i class="ph ph-map-pin" aria-hidden="true"></i><span>${loc || ""}</span>`;

    const sumImgEl = document.getElementById("sum-img");
    if (sumImgEl) {
      sumImgEl.src = imageSrc;
      sumImgEl.alt = title || "Property";
      sumImgEl.onerror = () => { sumImgEl.src = "images/placeholder.jpg"; };
      sumImgEl.classList.remove("skeleton");
    }

    if (els.propMiniImg) {
      els.propMiniImg.src = imageSrc;
      els.propMiniImg.alt = title || "Property";
      els.propMiniImg.onerror = () => { els.propMiniImg.src = "images/placeholder.jpg"; };
    }

    if (els.propMiniTitle) els.propMiniTitle.textContent = title || "—";
    if (els.propMiniLoc) els.propMiniLoc.textContent = loc || "—";
    if (els.propMiniType) els.propMiniType.textContent = type || "";
    if (els.sbNightPrice) els.sbNightPrice.textContent = `${bookingState.basePrice.toLocaleString()} ${curr}`;

    document.title = `${t("Book", "احجز")} — ${title || "OreBooking"}`;
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
      .get();

    bookingState.bookedDates = [];
    snap.forEach(docSnap => {
      const b = docSnap.data();
      if (!b.checkIn || !b.checkOut) return;

      let curr = b.checkInDate ? b.checkInDate.toDate() : (b.checkIn?.toDate ? b.checkIn.toDate() : parseLocalDate(b.checkIn));
      const end = b.checkOutDate ? b.checkOutDate.toDate() : (b.checkOut?.toDate ? b.checkOut.toDate() : parseLocalDate(b.checkOut));
      if (!curr || !end) return;

      curr.setHours(0, 0, 0, 0);
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

// ─── Error Handler ──────────────────────────
function handleError(err, context = "") {
  console.error(context, err);
  let msg = t("Unexpected error. Please try again.", "خطأ غير متوقع. يرجى المحاولة مجدداً.");

  if (err?.code === "storage/unauthorized") msg = t("Upload failed: no permission.", "فشل الرفع: غير مصرّح.");
  else if (err?.code === "permission-denied") msg = t("Permission denied. Please log in.", "تم رفض الإذن. يرجى تسجيل الدخول.");
  else if (err?.message === "missing-property-id") msg = t("Property ID is missing.", "معرّف العقار مفقود.");
  else if (String(err?.message || "").includes("NaN")) msg = t("Invalid number in form.", "رقم غير صحيح في النموذج.");
  else if (err?.message === "not-found") msg = t("Property not found.", "العقار غير موجود.");
  else if (err?.message) msg += ` (${err.message})`;

  showGlobalAlert(msg, "error");
  setButtonLoading(els.btnConfirm, false);
}

// ─── Calendar ──────────────────────────────
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
    el.setAttribute("aria-hidden", "true");
    grid.appendChild(el);
  });

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement("div");
    e.className = "cal-cell empty";
    e.setAttribute("aria-hidden", "true");
    grid.appendChild(e);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d);
    const dateStr = formatDateStr(cellDate);
    const isPast = cellDate < now;
    const isBooked = isDateBooked(dateStr);
    const isToday = dateStr === formatDateStr(now);

    const cell = document.createElement("div");
    const classes = ["cal-cell"];
    if (isToday) classes.push("today");

    cell.setAttribute("data-date", dateStr);
    cell.setAttribute("role", "gridcell");

    if (isPast || isBooked) {
      classes.push("disabled");
      cell.setAttribute("aria-disabled", "true");
      cell.setAttribute("tabindex", "-1");
      cell.setAttribute("aria-label", `${dateStr} — ${isBooked ? t("Booked", "محجوز") : t("Unavailable", "غير متاح")}`);
    } else {
      cell.setAttribute("tabindex", "0");
      let label = dateStr;

      if (dateStr === bookingState.checkIn && dateStr === bookingState.checkOut) {
        classes.push("check-in", "check-out");
        label += ` (${t("Same day", "نفس اليوم")})`;
      } else if (dateStr === bookingState.checkIn) {
        classes.push("check-in");
        label += ` (${t("Check-in", "وصول")})`;
      } else if (dateStr === bookingState.checkOut) {
        classes.push("check-out");
        label += ` (${t("Checkout", "مغادرة")})`;
      } else if (bookingState.checkIn && bookingState.checkOut && dateStr > bookingState.checkIn && dateStr < bookingState.checkOut) {
        classes.push("in-range");
        label += ` (${t("Selected", "محدد")})`;
      } else {
        classes.push("available");
      }

      cell.setAttribute("aria-label", label);
      cell.addEventListener("click", () => handleDateClick(dateStr));
      cell.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleDateClick(dateStr);
        }
      });
    }

    cell.className = classes.join(" ");
    cell.innerHTML = `<span aria-hidden="true">${d}</span>`;
    grid.appendChild(cell);
  }
}

function handleDateClick(dateStr) {
  hideWarn();
  const bothSelected = bookingState.checkIn && bookingState.checkOut;
  const noneSelected = !bookingState.checkIn;

  if (noneSelected || bothSelected) {
    bookingState.checkIn = dateStr;
    bookingState.checkOut = null;
  } else {
    if (dateStr <= bookingState.checkIn) {
      bookingState.checkIn = dateStr;
      bookingState.checkOut = null;
    } else if (hasBookedDatesInRange(bookingState.checkIn, dateStr)) {
      showWarn(t("Booked dates exist in this range. Choose different dates.", "يوجد تواريخ محجوزة في هذه الفترة. اختر تواريخ أخرى."));
      return;
    } else {
      bookingState.checkOut = dateStr;
    }
  }

  updateBookingSummary();
  renderCalendar();
}

// ─── Occupancy Counters ─────────────────────
function updateOccupancyCounters() {
  if (els.roomCount) els.roomCount.textContent = bookingState.rooms;
  if (els.adultCount) els.adultCount.textContent = bookingState.adults;
  if (els.childCount) els.childCount.textContent = bookingState.children;

  if (els.btnRoomMinus) els.btnRoomMinus.disabled = bookingState.rooms <= 1;
  if (els.btnRoomPlus) els.btnRoomPlus.disabled = bookingState.rooms >= bookingState.maxRooms;
  if (els.btnAdultMinus) els.btnAdultMinus.disabled = bookingState.adults <= 1;
  if (els.btnAdultPlus) els.btnAdultPlus.disabled = (bookingState.adults + bookingState.children) >= bookingState.maxGuests;
  if (els.btnChildMinus) els.btnChildMinus.disabled = bookingState.children <= 0;
  if (els.btnChildPlus) els.btnChildPlus.disabled = (bookingState.adults + bookingState.children) >= bookingState.maxGuests;

  const badge = document.getElementById("occupancy-summary-badge");
  if (badge) {
    const isAr = bookingState.lang === "ar";
    const roomTxt = `${bookingState.rooms} ${t("room", "غرفة")}${bookingState.rooms > 1 && !isAr ? "s" : ""}`;
    const adultTxt = `${bookingState.adults} ${t("adult", "بالغ")}${bookingState.adults > 1 && !isAr ? "s" : ""}`;
    const childTxt = bookingState.children > 0
      ? ` · ${bookingState.children} ${t("child", "طفل")}${bookingState.children > 1 && !isAr ? "ren" : ""}`
      : "";

    badge.textContent = `${roomTxt} · ${adultTxt}${childTxt}`;
  }
}

// ─── Price & Summary Update ─────────────────
function updateBookingSummary() {
  const isAr = bookingState.lang === "ar";
  const curr = isAr ? "د.ج" : "DZD";

  if (els.dispCheckin) els.dispCheckin.textContent = formatDisplayDate(bookingState.checkIn);
  if (els.dispCheckout) els.dispCheckout.textContent = formatDisplayDate(bookingState.checkOut);

  if (!bookingState.checkIn || !bookingState.checkOut) {
    bookingState.nights = 0;
    bookingState.totalPrice = 0;
    bookingState.fee = 0;
    bookingState.addonsTotal = 0;
    if (els.dispNights) els.dispNights.textContent = "—";
    if (els.btnNext1) {
      els.btnNext1.disabled = true;
      els.btnNext1.setAttribute("aria-disabled", "true");
    }
    renderSidebarPlaceholder();
    return;
  }

  const d1 = parseLocalDate(bookingState.checkIn);
  const d2 = parseLocalDate(bookingState.checkOut);
  if (!d1 || !d2) return;

  bookingState.nights = Math.round((d2 - d1) / 86400000);
  if (els.dispNights) els.dispNights.textContent = bookingState.nights;

  if (bookingState.nights < bookingState.minNights) {
    showWarn(t(`Minimum stay: ${bookingState.minNights} night(s).`, `الحد الأدنى للإقامة: ${bookingState.minNights} ليالٍ.`));
    if (els.btnNext1) {
      els.btnNext1.disabled = true;
      els.btnNext1.setAttribute("aria-disabled", "true");
    }
    renderSidebarPlaceholder();
    return;
  }

  hideWarn();
  if (els.btnNext1) {
    els.btnNext1.disabled = false;
    els.btnNext1.removeAttribute("aria-disabled");
  }

  bookingState.roomPrice = bookingState.basePrice * bookingState.rooms;
  const subtotal = bookingState.roomPrice * bookingState.nights;
  calcAddonsTotal();
  bookingState.fee = Math.round((subtotal + bookingState.addonsTotal) * 0.08);
  bookingState.totalPrice = subtotal + bookingState.addonsTotal + bookingState.fee;

  if (els.sbNightsCount) els.sbNightsCount.textContent = bookingState.nights;
  if (els.sbNightPrice) els.sbNightPrice.textContent = `${bookingState.roomPrice.toLocaleString()} ${curr}`;
  if (els.sbBaseTotal) els.sbBaseTotal.textContent = `${subtotal.toLocaleString()}`;
  if (els.sbFinalTotal) els.sbFinalTotal.textContent = `${bookingState.totalPrice.toLocaleString()}`;

  if (els.priceBreakdown) {
    const ad = bookingState.addons;
    const addonLines = [];

    if (ad.restaurant) {
      const planKey = `restaurant_${ad.restaurantPlan}`;
      const planCost = (ADDON_PRICES[planKey] || 0) * bookingState.nights * (bookingState.adults + bookingState.children);
      const planLabel = {
        breakfast: t("Breakfast", "إفطار"),
        halfboard: t("Half-Board", "نصف إقامة"),
        fullboard: t("Full-Board", "إقامة كاملة")
      }[ad.restaurantPlan];
      addonLines.push([`${t("Restaurant", "المطعم")} (${planLabel})`, planCost]);
    }

    if (ad.wifi) addonLines.push([t("WiFi", "واي فاي"), ADDON_PRICES.wifi * bookingState.nights * bookingState.rooms]);
    if (ad.parking) addonLines.push([t("Parking", "موقف"), ADDON_PRICES.parking * bookingState.nights]);
    if (ad.airportTransfer) addonLines.push([t("Airport Transfer", "نقل المطار"), ADDON_PRICES.airportTransfer]);
    if (ad.spa) addonLines.push([t("Spa", "السبا"), ADDON_PRICES.spa * bookingState.nights]);
    if (ad.lateCheckout) addonLines.push([t("Late Checkout", "مغادرة متأخرة"), ADDON_PRICES.lateCheckout * bookingState.rooms]);
    if (ad.extraBed) addonLines.push([t("Extra Bed", "سرير إضافي"), ADDON_PRICES.extraBed * bookingState.nights * bookingState.rooms]);
    if (ad.events) addonLines.push([t("Events", "فعاليات"), ADDON_PRICES.events * bookingState.nights * (bookingState.adults + bookingState.children)]);

    els.priceBreakdown.innerHTML = `
      <div class="price-row">
        <span>${bookingState.basePrice.toLocaleString()} ${curr} × ${bookingState.rooms} ${t("room", "غرفة")}${bookingState.rooms > 1 && !isAr ? "s" : ""} × ${bookingState.nights} ${t("nights", "ليالٍ")}</span>
        <span>${subtotal.toLocaleString()} ${curr}</span>
      </div>
      ${addonLines.map(([label, cost]) => `
        <div class="price-row price-row--addon">
          <span>+ ${label}</span><span>${cost.toLocaleString()} ${curr}</span>
        </div>
      `).join("")}
      <div class="price-row price-row--fee">
        <span>${t("Service Fee (8%)", "رسوم الخدمة (8%)")}</span>
        <span>${bookingState.fee.toLocaleString()} ${curr}</span>
      </div>
      <div class="price-row price-row--total">
        <span>${t("Total", "الإجمالي")}</span>
        <span class="price-highlight">${bookingState.totalPrice.toLocaleString()} ${curr}</span>
      </div>
    `;
  }

  const locale = isAr ? "ar-DZ" : "en-GB";
  const fmtOpts = { day: "2-digit", month: "short", year: "numeric" };

  const bedLabel = {
    double: t("Double", "مزدوج"),
    twin: t("Twin", "سريران"),
    king: t("King", "كينج"),
    single: t("Single", "فردي")
  }[bookingState.bedConfig] || "";

  setText("rev-val-dates", `${parseLocalDate(bookingState.checkIn)?.toLocaleDateString(locale, fmtOpts) || ""} → ${parseLocalDate(bookingState.checkOut)?.toLocaleDateString(locale, fmtOpts) || ""}`);
  setText("rev-val-nights", `${bookingState.nights} ${t("nights", "ليالٍ")}`);
  setText("rev-val-rooms", `${bookingState.rooms} ${t("room", "غرفة")}${bookingState.rooms > 1 && !isAr ? "s" : ""} · ${bedLabel}`);
  setText("rev-val-guests", `${bookingState.adults} ${t("adults", "بالغين")}${bookingState.children > 0 ? ` + ${bookingState.children} ${t("children", "أطفال")}` : ""}`);
  setText("rev-val-addons", bookingState.addonsTotal > 0 ? `${bookingState.addonsTotal.toLocaleString()} ${curr}` : t("None", "لا شيء"));
  setText("rev-val-base", `${subtotal.toLocaleString()} ${curr}`);
  setText("rev-val-fees", `${bookingState.fee.toLocaleString()} ${curr}`);
  setText("rev-val-total", `${bookingState.totalPrice.toLocaleString()} ${curr}`);

  setText("final-name", els.gName?.value || "—");
  const ciLabel = parseLocalDate(bookingState.checkIn)?.toLocaleDateString(locale, fmtOpts) || bookingState.checkIn;
  const coLabel = parseLocalDate(bookingState.checkOut)?.toLocaleDateString(locale, fmtOpts) || bookingState.checkOut;
  setText("final-dates", `${ciLabel} → ${coLabel}`);
  setText("final-total", `${bookingState.totalPrice.toLocaleString()} ${curr}`);
  setText("earned-points-preview", Math.floor(bookingState.totalPrice / 100).toString());
  setText("final-payment", getPaymentMethodLabel(getSelectedPaymentMethod() || "cash"));
}

function renderSidebarPlaceholder() {
  if (els.priceBreakdown) {
    els.priceBreakdown.innerHTML = `<p class="sum-placeholder-txt"><i class="ph ph-calendar-blank" style="margin-inline-end:6px;" aria-hidden="true"></i>${t("Select dates to see price details", "اختر التواريخ لرؤية تفاصيل السعر")}</p>`;
  }
  if (els.sbNightsCount) els.sbNightsCount.textContent = "0";
  if (els.sbBaseTotal) els.sbBaseTotal.textContent = "0";
  if (els.sbFinalTotal) els.sbFinalTotal.textContent = "0";
}

// ─── Step Navigation ─────────────────────────
function getStepIndicator(n) {
  return document.querySelector(`.step-indicator[data-step="${n}"]`);
}

function updateStepConnectors(activeTo) {
  document.querySelectorAll(".step-connector").forEach((con, idx) => {
    con.classList.toggle("completed", idx < activeTo - 1);
  });
}

function goToStep(stepNum, skipHistory = false) {
  hideGlobalAlert();

  [1, 2, 3, 4].forEach(n => {
    const el = els[`step${n}`];
    const ind = getStepIndicator(n);

    if (el) el.classList.toggle("active", n === stepNum);

    if (ind) {
      ind.classList.toggle("active", n === stepNum);
      ind.classList.toggle("completed", n < stepNum);
      ind.setAttribute("aria-selected", n === stepNum ? "true" : "false");
    }
  });

  updateStepConnectors(stepNum);

  const navH = document.querySelector(".inner-nav")?.offsetHeight || 80;
  window.scrollTo({ top: navH - 10, behavior: "smooth" });

  if (!skipHistory) history.pushState(null, null, `#step-${stepNum}`);

  if (stepNum === 4) populateFinalSummary();
}

// ─── Populate Step 4 Final Summary ──────────
function populateFinalSummary() {
  const isAr = bookingState.lang === "ar";
  const curr = isAr ? "د.ج" : "DZD";
  const locale = isAr ? "ar-DZ" : "en-GB";
  const fmtOpts = { day: "2-digit", month: "short", year: "numeric" };

  setText("final-name", els.gName?.value?.trim() || "—");

  const ci = parseLocalDate(bookingState.checkIn)?.toLocaleDateString(locale, fmtOpts) || bookingState.checkIn || "";
  const co = parseLocalDate(bookingState.checkOut)?.toLocaleDateString(locale, fmtOpts) || bookingState.checkOut || "";
  setText("final-dates", `${ci} → ${co}`);

  const method = getSelectedPaymentMethod() || "cash";
  setText("final-payment", getPaymentMethodLabel(method));
  setText("final-total", `${bookingState.totalPrice.toLocaleString()} ${curr}`);
  setText("earned-points-preview", Math.floor(bookingState.totalPrice / 100).toString());
  setText("final-addons", buildAddonSummaryText());
}

// ─── Step Validation ─────────────────────────
function validateStep1() {
  if (!bookingState.checkIn || !bookingState.checkOut) {
    showGlobalAlert(t("Please select check-in and check-out dates.", "يرجى تحديد تواريخ الوصول والمغادرة."));
    return false;
  }

  if (bookingState.nights < bookingState.minNights) {
    showGlobalAlert(t(`Minimum stay is ${bookingState.minNights} nights.`, `الحد الأدنى للإقامة هو ${bookingState.minNights} ليالٍ.`));
    return false;
  }

  if (bookingState.children > 0 && bookingState.childAges.some(a => a === undefined || a === "")) {
    showGlobalAlert(t("Please select ages for all children.", "يرجى تحديد أعمار جميع الأطفال."));
    els.childAgesBox?.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }

  return true;
}

function validateStep2() {
  const method = getSelectedPaymentMethod();
  if (!method) {
    showGlobalAlert(t("Please select a payment method.", "يرجى اختيار طريقة الدفع."));
    return false;
  }

  if (method === "transfer" && els.receiptFile && !els.receiptFile.files[0]) {
    showGlobalAlert(t("Please upload the transfer receipt.", "يرجى رفع إيصال التحويل البنكي."));
    return false;
  }

  return true;
}

function validateStep3() {
  if (!els.gName?.value?.trim()) {
    showGlobalAlert(t("Please enter your full name.", "يرجى إدخال اسمك الكامل."));
    els.gName?.focus();
    return false;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!els.gEmail?.value?.trim() || !emailRegex.test(els.gEmail.value.trim())) {
    showGlobalAlert(t("Please enter a valid email address.", "يرجى إدخال بريد إلكتروني صحيح."));
    els.gEmail?.focus();
    return false;
  }

  if (!els.gPhone?.value?.trim()) {
    showGlobalAlert(t("Please enter your phone number.", "يرجى إدخال رقم هاتفك."));
    els.gPhone?.focus();
    return false;
  }

  if (els.agreePolicy && !els.agreePolicy.checked) {
    showGlobalAlert(t("You must agree to the house rules.", "يجب الموافقة على قوانين الفندق."));
    return false;
  }

  return true;
}

// ─── Upload Helper ───────────────────────────
async function uploadReceipt(file, refId) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `receipts/${refId}_${Date.now()}.${ext}`;
  const snap = await storage.ref(path).put(file);
  return await snap.ref.getDownloadURL();
}

// ─── Success Modal Helpers ──────────────────
function populateSuccessModal(payload) {
  if (!payload) return;

  const isAr = bookingState.lang === "ar";
  const curr = isAr ? "د.ج" : "DZD";
  const locale = isAr ? "ar-DZ" : "en-GB";
  const fmtOpts = { day: "2-digit", month: "short", year: "numeric" };

  const ci = parseLocalDate(payload.checkIn)?.toLocaleDateString(locale, fmtOpts) || payload.checkIn;
  const co = parseLocalDate(payload.checkOut)?.toLocaleDateString(locale, fmtOpts) || payload.checkOut;

  setText("succ-ref", payload.refId || "—");
  setText("succ-name", payload.guestName || "—");
  setText("succ-dates", `${ci} → ${co}`);
  setText("succ-guests", `${payload.adults} ${t("adults", "بالغين")} · ${payload.rooms} ${t("room", "غرفة")}`);
  setText("succ-total", `${Number(payload.totalPrice || 0).toLocaleString()} ${curr}`);
  setText("succ-email", payload.guestEmail || "—");
  setText("succ-phone", payload.guestPhone || "—");

  const badge = document.getElementById("succ-pay-badge");
  if (badge) {
    if (payload.paymentMethod === "transfer") {
      badge.className = "success-pay-badge transfer";
      badge.innerHTML = `<i class="ph-fill ph-bank" aria-hidden="true"></i> ${t("Awaiting transfer verification", "بانتظار التحقق من التحويل")}`;
    } else {
      badge.className = "success-pay-badge cash";
      badge.innerHTML = `<i class="ph-fill ph-money" aria-hidden="true"></i> ${t("Pay at property", "الدفع في الفندق")}`;
    }
  }
}

function openSuccessModal() {
  if (!els.successModal) return;
  els.successModal.classList.remove("d-none");
  els.successModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeSuccessModal() {
  if (!els.successModal) return;
  els.successModal.classList.add("d-none");
  els.successModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

// ─── Receipt Actions ─────────────────────────
function printBookingReceipt() {
  const p = getBookingDataForReceipt();

  if (!p) {
    showGlobalAlert(t("No booking data available to print.", "لا توجد بيانات حجز للطباعة."), "warning");
    return;
  }

  const isAr = bookingState.lang === "ar";
  const curr = isAr ? "د.ج" : "DZD";
  const locale = isAr ? "ar-DZ" : "en-GB";
  const fmtOpts = { day: "2-digit", month: "short", year: "numeric" };

  const ci = p.checkIn ? (parseLocalDate(p.checkIn)?.toLocaleDateString(locale, fmtOpts) || p.checkIn) : "—";
  const co = p.checkOut ? (parseLocalDate(p.checkOut)?.toLocaleDateString(locale, fmtOpts) || p.checkOut) : "—";
  const hotelTitle = bookingState.property
    ? (bookingState.lang === "ar" ? (bookingState.property.titleAr || bookingState.property.titleEn) : (bookingState.property.titleEn || bookingState.property.titleAr))
    : "OreBooking";

  const win = window.open("", "_blank", "width=960,height=720");
  if (!win) {
    showGlobalAlert(t("Popup blocked. Please allow popups to print.", "تم حظر النافذة المنبثقة. اسمح بها للطباعة."), "warning");
    return;
  }

  win.document.open();
  win.document.write(`
    <!doctype html>
    <html lang="${isAr ? "ar" : "en"}" dir="${isAr ? "rtl" : "ltr"}">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(t("Booking Receipt", "وصل الحجز"))} - ${escapeHtml(p.refId || "BOOKING")}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111827;background:#fff}
        .wrap{max-width:820px;margin:0 auto}
        .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2px solid #e5e7eb;padding-bottom:16px;margin-bottom:24px}
        h1{margin:0 0 8px;font-size:28px}
        .muted{color:#6b7280}
        .box{border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:16px}
        .row{display:flex;justify-content:space-between;gap:16px;padding:10px 0;border-bottom:1px dashed #e5e7eb}
        .row:last-child{border-bottom:none}
        .label{color:#6b7280}
        .value{font-weight:700}
        .total{font-size:22px;color:#1d4ed8}
        @media print{body{padding:0}.wrap{max-width:none}}
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="head">
          <div>
            <h1>${escapeHtml(t("Booking Receipt", "وصل الحجز"))}</h1>
            <div class="muted">${escapeHtml(hotelTitle)}</div>
          </div>
          <div>
            <div class="muted">${escapeHtml(t("Reference", "المرجع"))}</div>
            <div><strong>${escapeHtml(p.refId || "—")}</strong></div>
          </div>
        </div>

        <div class="box">
          <div class="row"><span class="label">${escapeHtml(t("Guest Name", "اسم النزيل"))}</span><span class="value">${escapeHtml(p.guestName || "—")}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Email", "البريد الإلكتروني"))}</span><span class="value">${escapeHtml(p.guestEmail || "—")}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Phone", "الهاتف"))}</span><span class="value">${escapeHtml(p.guestPhone || "—")}</span></div>
        </div>

        <div class="box">
          <div class="row"><span class="label">${escapeHtml(t("Check-in", "الوصول"))}</span><span class="value">${escapeHtml(ci)}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Check-out", "المغادرة"))}</span><span class="value">${escapeHtml(co)}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Nights", "الليالي"))}</span><span class="value">${escapeHtml(String(p.nights || 0))}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Guests", "الضيوف"))}</span><span class="value">${escapeHtml(`${p.adults || 0} ${t("adults", "بالغين")} / ${p.children || 0} ${t("children", "أطفال")}`)}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Rooms", "الغرف"))}</span><span class="value">${escapeHtml(String(p.rooms || 1))}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Payment", "الدفع"))}</span><span class="value">${escapeHtml(getPaymentMethodLabel(p.paymentMethod || "cash"))}</span></div>
        </div>

        <div class="box">
          <div class="row"><span class="label">${escapeHtml(t("Base Price", "السعر الأساسي"))}</span><span class="value">${escapeHtml(Number((p.roomPrice || 0) * (p.nights || 0)).toLocaleString())} ${escapeHtml(curr)}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Add-ons", "الإضافات"))}</span><span class="value">${escapeHtml(Number(p.addonsTotal || 0).toLocaleString())} ${escapeHtml(curr)}</span></div>
          <div class="row"><span class="label">${escapeHtml(t("Fees", "الرسوم"))}</span><span class="value">${escapeHtml(Number(p.fee || 0).toLocaleString())} ${escapeHtml(curr)}</span></div>
          <div class="row"><span class="label total">${escapeHtml(t("Total", "الإجمالي"))}</span><span class="value total">${escapeHtml(Number(p.totalPrice || 0).toLocaleString())} ${escapeHtml(curr)}</span></div>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.focus();
            window.print();
          }, 250);
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
  try { win.focus(); } catch (_) {}
}

function downloadBookingReceipt() {
  const p = getBookingDataForReceipt();

  if (!p) {
    showGlobalAlert(t("No booking data available.", "لا توجد بيانات حجز متاحة."), "warning");
    return;
  }

  const lines = [
    `${t("Booking Reference", "مرجع الحجز")}: ${p.refId || ""}`,
    `${t("Guest Name", "اسم النزيل")}: ${p.guestName || ""}`,
    `${t("Email", "البريد الإلكتروني")}: ${p.guestEmail || ""}`,
    `${t("Phone", "الهاتف")}: ${p.guestPhone || ""}`,
    `${t("Check-in", "الوصول")}: ${p.checkIn || ""}`,
    `${t("Check-out", "المغادرة")}: ${p.checkOut || ""}`,
    `${t("Nights", "الليالي")}: ${p.nights || 0}`,
    `${t("Rooms", "الغرف")}: ${p.rooms || 1}`,
    `${t("Adults", "البالغون")}: ${p.adults || 0}`,
    `${t("Children", "الأطفال")}: ${p.children || 0}`,
    `${t("Payment", "الدفع")}: ${getPaymentMethodLabel(p.paymentMethod || "cash")}`,
    `${t("Total", "الإجمالي")}: ${p.totalPrice || 0}`
  ].join("\n");

  const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${p.refId || "booking-receipt"}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}

// ─── Submit Booking ──────────────────────────
async function submitBooking() {
  if (!validateStep1()) {
    goToStep(1);
    return;
  }

  if (!validateStep2()) {
    goToStep(2);
    return;
  }

  if (!validateStep3()) {
    goToStep(3);
    return;
  }

  if (!bookingState.propertyId || !bookingState.property) {
    showGlobalAlert(t("Property data is missing. Please reload the page.", "بيانات العقار غير موجودة. يرجى إعادة تحميل الصفحة."));
    return;
  }

  if (bookingState.totalPrice <= 0 || bookingState.nights <= 0) {
    showGlobalAlert(t("Booking total is invalid. Please review your dates.", "إجمالي الحجز غير صالح. يرجى مراجعة التواريخ."));
    return;
  }

  setButtonLoading(els.btnConfirm, true);
  hideGlobalAlert();

  try {
    const selectedPayment = getSelectedPaymentMethod() || "cash";
    const isTransfer = selectedPayment === "transfer";
    let receiptUrl = "";
    const refId = `BK-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    if (isTransfer) {
      const file = els.receiptFile?.files?.[0];
      if (!file) {
        throw new Error(t("Transfer receipt is required.", "إيصال التحويل مطلوب."));
      }
      receiptUrl = await uploadReceipt(file, refId);
    }

    const checkInDate = parseLocalDate(bookingState.checkIn);
    const checkOutDate = parseLocalDate(bookingState.checkOut);

    if (!checkInDate || !checkOutDate) {
      throw new Error("Invalid booking dates");
    }

    const payload = {
      propertyId: String(bookingState.propertyId),
      propertyTitleEn: bookingState.property?.titleEn || bookingState.property?.title || "",
      propertyTitleAr: bookingState.property?.titleAr || bookingState.property?.title || "",
      refId,
      userId: currentUser ? currentUser.uid : null,
      guestName: els.gName?.value?.trim() || "",
      guestEmail: els.gEmail?.value?.trim() || "",
      guestPhone: els.gPhone?.value?.trim() || "",
      nationality: els.gNationality?.value || "",
      purpose: bookingState.purposeOfVisit,
      arrivalTime: els.gArrival?.value || "",
      notes: els.gNotes?.value?.trim() || "",
      checkIn: bookingState.checkIn,
      checkOut: bookingState.checkOut,
      checkInDate: firebase.firestore.Timestamp.fromDate(checkInDate),
      checkOutDate: firebase.firestore.Timestamp.fromDate(checkOutDate),
      rooms: bookingState.rooms,
      adults: bookingState.adults,
      children: bookingState.children,
      childAges: bookingState.childAges.filter(v => v !== "" && v !== undefined),
      bedConfig: bookingState.bedConfig,
      nights: bookingState.nights,
      basePrice: bookingState.basePrice,
      roomPrice: bookingState.roomPrice,
      fee: bookingState.fee,
      addonsTotal: bookingState.addonsTotal,
      totalPrice: bookingState.totalPrice,
      addons: bookingState.addons,
      paymentMethod: isTransfer ? "transfer" : "cash",
      receiptUrl,
      status: "pending",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("bookings").add(payload);
    lastSuccessfulBooking = { ...payload, id: docRef.id };

    if (currentUser) {
      const earnedPoints = Math.floor(payload.totalPrice / 100);
      try {
        await db.collection("users").doc(currentUser.uid).set({
          loyaltyPoints: firebase.firestore.FieldValue.increment(earnedPoints)
        }, { merge: true });
      } catch (_) {}
    }

    populateSuccessModal(lastSuccessfulBooking);
    goToStep(4);
    openSuccessModal();

    if (window.confetti) {
      window.confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
    }

    showGlobalAlert(t("Booking submitted successfully.", "تم إرسال الحجز بنجاح."), "success");
  } catch (err) {
    handleError(err, "[submitBooking]");
  } finally {
    setButtonLoading(els.btnConfirm, false);
  }
}

// ─── Events Setup ────────────────────────────
function setupEventListeners() {
  els.btnNext1?.addEventListener("click", () => {
    if (validateStep1()) goToStep(2);
  });

  els.btnNext2?.addEventListener("click", () => {
    if (validateStep2()) goToStep(3);
  });

  els.btnNext3?.addEventListener("click", () => {
    if (!validateStep1()) {
      goToStep(1);
      return;
    }
    if (!validateStep2()) {
      goToStep(2);
      return;
    }
    if (validateStep3()) {
      populateFinalSummary();
      goToStep(4);
    }
  });

  els.btnPrev2?.addEventListener("click", () => goToStep(1));
  els.btnPrev3?.addEventListener("click", () => goToStep(2));
  els.btnPrev4?.addEventListener("click", () => goToStep(3));

  if (els.btnConfirm) {
    els.btnConfirm.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      submitBooking();
    });
  }

  els.calPrev?.addEventListener("click", () => {
    calViewDate.setMonth(calViewDate.getMonth() - 1);
    renderCalendar();
  });

  els.calNext?.addEventListener("click", () => {
    calViewDate.setMonth(calViewDate.getMonth() + 1);
    renderCalendar();
  });

  const handleCounter = (type, dir) => {
    if (type === "room") {
      bookingState.rooms = Math.max(1, Math.min(bookingState.rooms + dir, bookingState.maxRooms));
      if (bookingState.adults < bookingState.rooms) bookingState.adults = bookingState.rooms;
    } else if (type === "adult") {
      const newAdults = bookingState.adults + dir;
      if (newAdults < 1) return;
      if (newAdults + bookingState.children > bookingState.maxGuests) return;
      bookingState.adults = newAdults;
    } else if (type === "child") {
      const newChildren = bookingState.children + dir;
      if (newChildren < 0) return;
      if (bookingState.adults + newChildren > bookingState.maxGuests) return;
      bookingState.children = newChildren;
      if (dir > 0) bookingState.childAges.push("");
      else bookingState.childAges.pop();
      renderChildAges();
    }

    updateOccupancyCounters();
    updateBookingSummary();
  };

  els.btnRoomMinus?.addEventListener("click", () => handleCounter("room", -1));
  els.btnRoomPlus?.addEventListener("click", () => handleCounter("room", 1));
  els.btnAdultMinus?.addEventListener("click", () => handleCounter("adult", -1));
  els.btnAdultPlus?.addEventListener("click", () => handleCounter("adult", 1));
  els.btnChildMinus?.addEventListener("click", () => handleCounter("child", -1));
  els.btnChildPlus?.addEventListener("click", () => handleCounter("child", 1));

  els.bedSelect?.addEventListener("change", e => {
    bookingState.bedConfig = e.target.value;
    updateBookingSummary();
  });

  Array.from(els.payRadios || []).forEach(r => {
    r.addEventListener("change", () => {
      updatePaymentUI();
      document.querySelectorAll(".payment-method-label, .payment-option").forEach(lbl => {
        const rb = lbl.querySelector('input[type="radio"]');
        if (rb) lbl.classList.toggle("selected", rb.checked);
      });
      populateFinalSummary();
    });
  });

  document.querySelectorAll(".payment-method-label, .payment-option").forEach(lbl => {
    const rb = lbl.querySelector('input[type="radio"]');
    if (rb) lbl.classList.toggle("selected", rb.checked);
  });

  document.querySelectorAll(".purpose-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".purpose-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      bookingState.purposeOfVisit = chip.dataset.val || chip.dataset.value || "leisure";
    });
  });

  els.receiptFile?.addEventListener("change", e => {
    const file = e.target.files[0];
    const preview = document.getElementById("receipt-preview");
    const nameEl = document.getElementById("receipt-file-name");

    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showGlobalAlert(t("File too large. Max 5MB.", "الملف كبير جداً. الحد الأقصى 5 ميجابايت."));
        e.target.value = "";
        preview?.classList.add("d-none");
        return;
      }
      if (nameEl) nameEl.textContent = file.name;
      preview?.classList.remove("d-none");
    } else {
      preview?.classList.add("d-none");
    }
  });

  document.getElementById("btn-remove-receipt")?.addEventListener("click", () => {
    if (els.receiptFile) els.receiptFile.value = "";
    document.getElementById("receipt-preview")?.classList.add("d-none");
  });

  els.gNotes?.addEventListener("input", e => {
    const max = 500;
    const counter = document.getElementById("g-notes-counter");
    if (e.target.value.length > max) e.target.value = e.target.value.substring(0, max);
    if (counter) counter.textContent = `${e.target.value.length}/${max}`;
    updateBookingSummary();
  });

  [els.gName, els.gEmail, els.gPhone, els.gArrival, els.gNationality].forEach(input => {
    input?.addEventListener("input", () => updateBookingSummary());
    input?.addEventListener("change", () => updateBookingSummary());
  });

  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const targetId = btn.dataset.copyTarget;
      const text = document.getElementById(targetId)?.textContent || "";
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text.trim());
        showCopyToast();
      } catch (_) {
        showGlobalAlert(t("Copy failed on this browser.", "فشل النسخ في هذا المتصفح."), "warning");
      }
    });
  });

  els.btnCopyRef?.addEventListener("click", async () => {
    const ref = document.getElementById("succ-ref")?.textContent;
    if (!ref) return;
    try {
      await navigator.clipboard.writeText(ref);
      showCopyToast(t("Reference copied!", "تم نسخ رقم الحجز!"));
    } catch (_) {
      showGlobalAlert(t("Copy failed on this browser.", "فشل النسخ في هذا المتصفح."), "warning");
    }
  });

  els.btnShareBooking?.addEventListener("click", async () => {
    const ref = document.getElementById("succ-ref")?.textContent;
    if (!ref) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: t("My OreBooking Reservation", "حجزي في OreBooking"),
          text: `${t("My booking reference is:", "رقم مرجع حجزي هو:")} ${ref}\n${t("Hotel:", "الفندق:")} ${bookingState.property?.titleEn || bookingState.property?.titleAr || bookingState.property?.title || "Hotel"}`,
          url: window.location.href
        });
      } catch (_) {}
    } else {
      showCopyToast(t("Sharing not supported on this browser", "المشاركة غير مدعومة في هذا المتصفح"));
    }
  });

  const fileWrapper = document.querySelector(".file-upload-wrapper");
  if (fileWrapper) {
    fileWrapper.addEventListener("dragover", e => {
      e.preventDefault();
      fileWrapper.classList.add("drag-over");
    });

    fileWrapper.addEventListener("dragleave", () => fileWrapper.classList.remove("drag-over"));

    fileWrapper.addEventListener("drop", e => {
      e.preventDefault();
      fileWrapper.classList.remove("drag-over");
      const file = e.dataTransfer?.files[0];
      if (file && els.receiptFile) {
        const dt = new DataTransfer();
        dt.items.add(file);
        els.receiptFile.files = dt.files;
        els.receiptFile.dispatchEvent(new Event("change"));
      }
    });
  }

  [els.gName, els.gEmail, els.gPhone].forEach(input => {
    if (!input) return;

    input.addEventListener("blur", () => {
      const isEmpty = !input.value.trim();
      const isEmailInvalid = input.type === "email" && input.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());

      input.classList.toggle("invalid", isEmpty || isEmailInvalid);
      input.closest(".input-with-icon, .form-group")?.classList.toggle("invalid", isEmpty || isEmailInvalid);

      const errEl = input.closest(".form-group")?.querySelector(".form-error-msg, .field-error");
      if (errEl) {
        errEl.classList.toggle("visible", isEmpty || isEmailInvalid);
        errEl.textContent = isEmpty
          ? t("This field is required.", "هذا الحقل مطلوب.")
          : isEmailInvalid
            ? t("Please enter a valid email.", "يرجى إدخال بريد صحيح.")
            : "";
      }
    });

    input.addEventListener("input", () => {
      input.classList.remove("invalid");
      input.closest(".input-with-icon, .form-group")?.classList.remove("invalid");
      const errEl = input.closest(".form-group")?.querySelector(".form-error-msg, .field-error");
      if (errEl) {
        errEl.classList.remove("visible");
        errEl.textContent = "";
      }
    });
  });

  document.querySelectorAll('input[name="payment_method"]').forEach(r => {
    r.addEventListener("change", () => {
      const method = r.value;
      const el = document.getElementById("final-payment");
      if (el) el.textContent = getPaymentMethodLabel(method);
    });
  });

  [
    els.btnCloseSuccess,
    els.btnCloseSuccess2,
    document.getElementById("btn-done"),
    document.getElementById("done-btn"),
    document.getElementById("success-done-btn")
  ].filter(Boolean).forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      closeSuccessModal();
    });
  });

  [
    els.btnPrintReceipt,
    document.getElementById("print-receipt-btn"),
    document.getElementById("success-print-btn")
  ].filter(Boolean).forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      e.stopPropagation();
      printBookingReceipt();
    });
  });

  els.btnDownloadReceipt?.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    downloadBookingReceipt();
  });

  els.successModal?.addEventListener("click", e => {
    if (e.target === els.successModal) closeSuccessModal();
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && els.successModal && !els.successModal.classList.contains("d-none")) {
      closeSuccessModal();
    }
  });
}

// ─── Update Payment UI ───────────────────────
function updatePaymentUI() {
  const method = getSelectedPaymentMethod();
  if (els.transferBox) {
    els.transferBox.classList.toggle("d-none", method !== "transfer");
  }

  document.querySelectorAll(".payment-method-label, .payment-option").forEach(lbl => {
    const rb = lbl.querySelector('input[type="radio"]');
    if (rb) lbl.classList.toggle("selected", rb.checked);
  });
}

// ─── Translation Map ─────────────────────────
const TRANSLATIONS = {
  ar: {
    "nav-back-txt": "العودة للعقار",
    "lbl-step1": "التواريخ والغرف",
    "lbl-step2": "الإضافات والدفع",
    "lbl-step3": "بيانات النزيل",
    "lbl-step4": "التأكيد",
    "st-title-1": "متى ستسافر؟",
    "st-sub-1": "حدد تواريخ الوصول وتفضيلات الغرفة.",
    "st-title-2": "حسّن إقامتك",
    "st-sub-2": "اختر الإضافات وطريقة الدفع.",
    "st-title-3": "من يقوم بالحجز؟",
    "st-sub-3": "أدخل بياناتك للتواصل وتأكيد الحجز.",
    "st-title-4": "مراجعة وتأكيد",
    "st-sub-4": "راجع تفاصيل حجزك قبل التأكيد النهائي.",
    "lbl-chk-in": "وصول",
    "lbl-chk-out": "مغادرة",
    "lbl-nights": "ليالٍ",
    "lbl-who-coming": "الإشغال والغرف",
    "lbl-rooms-title": "غرف",
    "lbl-rooms-sub": "الحد الأقصى 5",
    "lbl-adults-title": "بالغون",
    "lbl-adults-sub": "الأعمار 18+",
    "lbl-children-title": "أطفال",
    "lbl-children-sub": "0 - 17",
    "btn-next": "التالي",
    "btn-prev": "السابق",
    "btn-confirm": "تأكيد الحجز"
  },
  en: {}
};

function translateBookingPage() {
  const dict = TRANSLATIONS[bookingState.lang] || {};
  document.documentElement.lang = bookingState.lang;
  document.documentElement.dir = bookingState.lang === "ar" ? "rtl" : "ltr";

  Object.entries(dict).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
}
