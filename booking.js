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
  const totalRatings = reviews.reduce((sum, r) => sum + r.rating, 0);
  const avgRating = (totalRatings / reviews.length).toFixed(1);

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
    location.reload();
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
});

// ─── Load Property Data ─────────────────────
async function loadPropertyDetails() {
  try {
    if (!bookingState.propertyId) {
      throw new Error("missing-property-id");
    }

    let docRef = db.collection("properties").doc(String(bookingState.propertyId));
    let doc = await docRef.get();

    if (!doc.exists && Number.isFinite(Number(bookingState.propertyId))) {
      docRef = db.collection("properties").doc(Number(bookingState.propertyId).toString());
      doc = await docRef.get();
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
    } else {
      if (hasBookedDatesInRange(bookingState.checkIn, dateStr)) {
        showWarn(t("Booked dates exist in this range. Choose different dates.", "توجد تواريخ محجوزة ضمن هذه الفترة. الرجاء اختيار تواريخ مختلفة."));
        return;
      } else {
        bookingState.checkOut = dateStr;
      }
    }
  }

  updateBookingSummary();
  renderCalendar();
}

// ─── Occupancy Counters ────────────────────
function updateOccupancyCounters() {
  if (els.roomCount) els.roomCount.textContent = bookingState.rooms;
  if (els.adultCount) els.adultCount.textContent = bookingState.adults;
  if (els.childCount) els.childCount.textContent = bookingState.children;

  if (els.btnRoomMinus) els.btnRoomMinus.disabled = bookingState.rooms <= 1;
  if (els.btnRoomPlus) els.btnRoomPlus.disabled = bookingState.rooms >= bookingState.maxRooms;

  if (els.btnAdultMinus) els.btnAdultMinus.disabled = bookingState.adults <= 1;
  if (els.btnAdultPlus) els.btnAdultPlus.disabled = bookingState.adults + bookingState.children >= bookingState.maxGuests;

  if (els.btnChildMinus) els.btnChildMinus.disabled = bookingState.children <= 0;
  if (els.btnChildPlus) els.btnChildPlus.disabled = bookingState.adults + bookingState.children >= bookingState.maxGuests;

  const badge = document.getElementById("occupancy-summary-badge");
  if (badge) {
    const isAr = bookingState.lang === "ar";
    badge.textContent = `${bookingState.rooms} ${t("room", bookingState.rooms > 1 && !isAr ? "rooms" : "غرفة")}, ${bookingState.adults} ${t("adult", bookingState.adults > 1 && !isAr ? "adults" : "بالغين")}${bookingState.children > 0 ? `, ${bookingState.children} ${t("child", bookingState.children > 1 && !isAr ? "children" : "أطفال")}` : ""}`;
  }
}

// ─── Price Summary Update ──────────────────
function updateBookingSummary() {
  const isAr = bookingState.lang === "ar";
  const curr = isAr ? "د.ج" : "DZD";

  if (els.dispCheckin) els.dispCheckin.textContent = formatDisplayDate(bookingState.checkIn);
  if (els.dispCheckout) els.dispCheckout.textContent = formatDisplayDate(bookingState.checkOut);

  if (!bookingState.checkIn || !bookingState.checkOut) {
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
  bookingState.nights = Math.round((d2 - d1) / 86400000);

  if (els.dispNights) els.dispNights.textContent = bookingState.nights;

  if (bookingState.nights < bookingState.minNights) {
    showWarn(t(`Minimum stay is ${bookingState.minNights} nights.`, `الحد الأدنى للإقامة هو ${bookingState.minNights} ليالي.`));
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

  if (els.priceBreakdown) {
    const addonLines = [];
    const ad = bookingState.addons;

    if (ad.restaurant) {
      const planKey = `restaurant_${ad.restaurantPlan}`;
      const planCost = (ADDON_PRICES[planKey] || 0) * bookingState.nights * (bookingState.adults + bookingState.children);
      const planLabel = {
        breakfast: t("Breakfast", "إفطار"),
        halfboard: t("Half-Board", "نصف إقامة"),
        fullboard: t("Full-Board", "إقامة كاملة")
      }[ad.restaurantPlan];
      addonLines.push({ label: `${t("Restaurant", "المطعم")} (${planLabel})`, cost: planCost });
    }
    if (ad.wifi) addonLines.push({ label: t("WiFi", "واي فاي"), cost: ADDON_PRICES.wifi * bookingState.nights * bookingState.rooms });
    if (ad.parking) addonLines.push({ label: t("Parking", "موقف سيارات"), cost: ADDON_PRICES.parking * bookingState.nights });
    if (ad.airportTransfer) addonLines.push({ label: t("Airport Transfer", "نقل المطار"), cost: ADDON_PRICES.airportTransfer });
    if (ad.spa) addonLines.push({ label: t("Spa", "السبا"), cost: ADDON_PRICES.spa * bookingState.nights });
    if (ad.lateCheckout) addonLines.push({ label: t("Late Checkout", "مغادرة متأخرة"), cost: ADDON_PRICES.lateCheckout * bookingState.rooms });
    if (ad.extraBed) addonLines.push({ label: t("Extra Bed", "سرير إضافي"), cost: ADDON_PRICES.extraBed * bookingState.nights * bookingState.rooms });
    if (ad.events) addonLines.push({ label: t("Events", "فعاليات"), cost: ADDON_PRICES.events * bookingState.nights * (bookingState.adults + bookingState.children) });

    els.priceBreakdown.innerHTML = `
      <div class="price-row">
        <span>${bookingState.basePrice.toLocaleString()} ${curr} × ${bookingState.rooms} ${t("room", bookingState.rooms > 1 && !isAr ? "rooms" : "غرفة")} × ${bookingState.nights} ${t("nights", "ليالي")}</span>
        <span>${subtotal.toLocaleString()} ${curr}</span>
      </div>
      ${addonLines.map(({ label, cost }) => `
        <div class="price-row price-row--addon">
          <span>+ ${label}</span>
          <span>${cost.toLocaleString()} ${curr}</span>
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
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set("rev-val-dates", `${parseLocalDate(bookingState.checkIn).toLocaleDateString(locale, fmtOpts)} — ${parseLocalDate(bookingState.checkOut).toLocaleDateString(locale, fmtOpts)}`);
  set("rev-val-nights", `${bookingState.nights} ${t("nights", "ليالي")}`);
  set("rev-val-rooms", `${bookingState.rooms} ${t("room", bookingState.rooms > 1 && !isAr ? "rooms" : "غرفة")} (${bookingState.bedConfig === "double" ? t("Double", "مزدوج") : bookingState.bedConfig === "twin" ? t("Twin", "سريرين") : bookingState.bedConfig === "king" ? t("King", "كينغ") : t("Single", "مفرد")})`);
  set("rev-val-guests", `${bookingState.adults} ${t("adults", "بالغين")}${bookingState.children > 0 ? `, ${bookingState.children} ${t("children", "أطفال")}` : ""}`);
  set("rev-val-addons", bookingState.addonsTotal > 0 ? `${bookingState.addonsTotal.toLocaleString()} ${curr}` : t("None", "لا شيء"));
  set("rev-val-base", `${subtotal.toLocaleString()} ${curr}`);
  set("rev-val-fees", `${bookingState.fee.toLocaleString()} ${curr}`);
  set("rev-val-total", `${bookingState.totalPrice.toLocaleString()} ${curr}`);
}

function renderSidebarPlaceholder() {
  if (els.priceBreakdown) {
    const isAr = bookingState.lang === "ar";
    els.priceBreakdown.innerHTML = `<p class="sum-placeholder-txt">${t("Select dates to see price details", "حدد التواريخ لرؤية تفاصيل السعر")}</p>`;
  }
}

// ─── Step Navigation ───────────────────────
function updateStepConnectors(activeTo) {
  document.querySelectorAll(".step-connector").forEach((con, idx) => {
    con.classList.toggle("completed", idx < activeTo - 1);
  });
}

function switchStep(from, to) {
  const fromEl = document.getElementById(`step-${from}`);
  const toEl = document.getElementById(`step-${to}`);

  if (!fromEl || !toEl) return;

  fromEl.classList.remove("active");
  toEl.classList.add("active");

  document.querySelectorAll(".step-indicator").forEach(ind => {
    const n = parseInt(ind.getAttribute("data-step"), 10);
    ind.classList.remove("active", "completed");
    ind.removeAttribute("aria-current");
    if (n < to) ind.classList.add("completed");
    if (n === to) {
      ind.classList.add("active");
      ind.setAttribute("aria-current", "step");
    }
  });

  updateStepConnectors(to);
  hideGlobalAlert();
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (to === 2) renderAddonsPanel();
}

// ─── Payment Method Toggle ─────────────────
function updatePaymentUI() {
  const selected = document.querySelector('input[name="payment_method"]:checked')?.value || "cash";

  document.querySelectorAll(".payment-option").forEach(opt => {
    const radio = opt.querySelector('input[type="radio"]');
    opt.classList.toggle("selected", radio?.value === selected);
  });

  if (els.transferBox) els.transferBox.classList.toggle("d-none", selected !== "transfer");
}

// ─── Receipt File ──────────────────────────
function handleReceiptChange() {
  const file = els.receiptFile?.files[0];
  if (!file) return;

  if (file.size > 5 * 1024 * 1024) {
    showGlobalAlert(t("File too large. Max 5MB.", "الملف كبير جداً. الحد الأقصى 5 ميجابايت."), "error");
    els.receiptFile.value = "";
    return;
  }

  if (!file.type.startsWith("image/")) {
    showGlobalAlert(t("Only image files accepted.", "تُقبل ملفات الصور فقط."), "error");
    els.receiptFile.value = "";
    return;
  }

  const hint = document.getElementById("file-upload-hint");
  if (hint) hint.textContent = file.name;
}

// ─── Form Validation ───────────────────────
function validateField(input, errId, validFn, msg) {
  if (!input) return true;
  const errEl = document.getElementById(errId);
  const valid = validFn(input.value.trim());

  input.classList.toggle("invalid", !valid);
  if (errEl) {
    errEl.textContent = valid ? "" : msg;
    errEl.classList.toggle("visible", !valid);
  }
  return valid;
}

function validateGuestForm() {
  let ok = true;
  ok = validateField(els.gName, "g-name-err", v => v.length >= 2, t("Full name required.", "الاسم الكامل مطلوب.")) && ok;
  ok = validateField(els.gEmail, "g-email-err", v => /^\S+@\S+\.\S+$/.test(v), t("Valid email required.", "البريد الإلكتروني مطلوب.")) && ok;
  ok = validateField(els.gPhone, "g-phone-err", v => /^[0-9\-\+\s\\(\\)]{8,20}$/.test(v), t("Valid phone required.", "رقم الهاتف مطلوب.")) && ok;
  return ok;
}

// ─── Event Listeners ───────────────────────
function setupEventListeners() {
  // Calendar
  els.calPrev?.addEventListener("click", () => { calViewDate.setMonth(calViewDate.getMonth() - 1); renderCalendar(); });
  els.calNext?.addEventListener("click", () => { calViewDate.setMonth(calViewDate.getMonth() + 1); renderCalendar(); });

  // Rooms
  els.btnRoomMinus?.addEventListener("click", () => {
    if (bookingState.rooms > 1) { bookingState.rooms--; updateOccupancyCounters(); updateBookingSummary(); }
  });
  els.btnRoomPlus?.addEventListener("click", () => {
    if (bookingState.rooms < bookingState.maxRooms) { bookingState.rooms++; updateOccupancyCounters(); updateBookingSummary(); }
  });

  // Adults
  els.btnAdultMinus?.addEventListener("click", () => {
    if (bookingState.adults > 1) { bookingState.adults--; updateOccupancyCounters(); updateBookingSummary(); }
  });
  els.btnAdultPlus?.addEventListener("click", () => {
    if (bookingState.adults + bookingState.children < bookingState.maxGuests) { bookingState.adults++; updateOccupancyCounters(); updateBookingSummary(); }
  });

  // Children
  els.btnChildMinus?.addEventListener("click", () => {
    if (bookingState.children > 0) {
      bookingState.children--;
      bookingState.childAges.pop();
      updateOccupancyCounters();
      renderChildAges();
      updateBookingSummary();
    }
  });
  els.btnChildPlus?.addEventListener("click", () => {
    if (bookingState.adults + bookingState.children < bookingState.maxGuests) {
      bookingState.children++;
      bookingState.childAges.push("");
      updateOccupancyCounters();
      renderChildAges();
      updateBookingSummary();
    }
  });

  // Bed config
  els.bedSelect?.addEventListener("change", e => { bookingState.bedConfig = e.target.value; updateBookingSummary(); });

  // Steps
  els.btnNext1?.addEventListener("click", () => switchStep(1, 2));
  els.btnPrev2?.addEventListener("click", () => switchStep(2, 1));
  els.btnNext2?.addEventListener("click", () => switchStep(2, 3));
  els.btnPrev3?.addEventListener("click", () => switchStep(3, 2));

  // Policy checkbox
  els.agreePolicy?.addEventListener("change", e => {
    if (els.btnNext2) {
      els.btnNext2.disabled = !e.target.checked;
      els.btnNext2.setAttribute("aria-disabled", String(!e.target.checked));
    }
  });

  // Payment
  els.payRadios.forEach(r => r.addEventListener("change", updatePaymentUI));
  document.querySelectorAll(".payment-option").forEach(opt => {
    opt.addEventListener("click", () => {
      const r = opt.querySelector('input[type="radio"]');
      if (r && !r.checked) {
        r.checked = true;
        r.dispatchEvent(new Event("change"));
      }
    });
  });

  // Receipt
  els.receiptFile?.addEventListener("change", handleReceiptChange);

  // Blur validation
  els.gName?.addEventListener("blur", () => validateField(els.gName, "g-name-err", v => v.length >= 2, t("Full name required.", "الاسم الكامل مطلوب.")));
  els.gEmail?.addEventListener("blur", () => validateField(els.gEmail, "g-email-err", v => /^\S+@\S+\.\S+$/.test(v), t("Valid email required.", "البريد الإلكتروني مطلوب.")));
  els.gPhone?.addEventListener("blur", () => validateField(els.gPhone, "g-phone-err", v => /^[0-9\-\+\s\\(\\)]{8,20}$/.test(v), t("Valid phone required.", "رقم الهاتف مطلوب.")));

  // Notes char counter
  els.gNotes?.addEventListener("input", () => {
    const counter = document.getElementById("g-notes-counter");
    if (counter) counter.textContent = els.gNotes.value.length;
  });

  // Arrival time
  els.gArrival?.addEventListener("change", e => { bookingState.arrivalTime = e.target.value; });

  // Form submit
  els.guestForm?.addEventListener("submit", handleSubmit);
}

// ─── Form Submission ───────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  hideGlobalAlert();

  if (!validateGuestForm()) {
    showGlobalAlert(t("Please fix the errors above.", "الرجاء إصلاح الأخطاء أعلاه."), "error");
    els.guestForm.querySelector(".invalid")?.focus();
    return;
  }

  const payMethod = document.querySelector('input[name="payment_method"]:checked')?.value || "cash";
  const isTransfer = payMethod === "transfer";
  let receiptUrl = null;

  setButtonLoading(els.btnConfirm, true);

  try {
    // Real-time conflict check
    await loadBookedDates();
    if (hasBookedDatesInRange(bookingState.checkIn, bookingState.checkOut)) {
      showGlobalAlert(t("These dates were just booked. Please choose new dates.", "تم حجز هذه التواريخ للتو. الرجاء اختيار تواريخ جديدة."), "error");
      setButtonLoading(els.btnConfirm, false);
      setTimeout(() => switchStep(3, 1), 2500);
      return;
    }

    // Upload receipt
    if (isTransfer) {
      const file = els.receiptFile?.files[0];
      if (!file) {
        showGlobalAlert(t("Please upload your transfer receipt.", "الرجاء رفع إيصال التحويل الخاص بك."), "error");
        setButtonLoading(els.btnConfirm, false);
        return;
      }
      const ref = storage.ref(`receipts/${Date.now()}_${file.name}`);
      const snap = await ref.put(file);
      receiptUrl = await snap.ref.getDownloadURL();
    }

    const isAr = bookingState.lang === "ar";
    const prop = bookingState.property;
    const propTitle = isAr ? (prop?.titleAr || prop?.titleEn) : (prop?.titleEn || prop?.titleAr);

    // Build selected addons list for storage
    const selectedAddons = Object.entries(bookingState.addons)
      .filter(([k, v]) => v === true)
      .map(([k]) => k);

    const bookingDoc = {
      propertyId: String(bookingState.propertyId),
      propertyTitle: propTitle,
      checkIn: firebase.firestore.Timestamp.fromDate(parseLocalDate(bookingState.checkIn)),
      checkOut: firebase.firestore.Timestamp.fromDate(parseLocalDate(bookingState.checkOut)),
      checkInDate: firebase.firestore.Timestamp.fromDate(parseLocalDate(bookingState.checkIn)),
      checkOutDate: firebase.firestore.Timestamp.fromDate(parseLocalDate(bookingState.checkOut)),

      // Occupancy
      rooms: bookingState.rooms,
      adults: bookingState.adults,
      children: bookingState.children,
      childAges: bookingState.childAges,
      bedConfig: bookingState.bedConfig,

      // Pricing
      nights: bookingState.nights,
      basePrice: bookingState.basePrice,
      roomPrice: bookingState.roomPrice,
      addonsTotal: bookingState.addonsTotal,
      serviceFee: bookingState.fee,
      totalPrice: bookingState.totalPrice,
      currency: "DZD",

      // Add-ons
      addons: bookingState.addons,
      selectedAddons: selectedAddons,
      restaurantPlan: bookingState.addons.restaurant ? bookingState.addons.restaurantPlan : null,

      // Guest Info
      guestName: els.gName.value.trim(),
      guestEmail: els.gEmail.value.trim().toLowerCase(),
      guestPhone: els.gPhone.value.trim(),
      nationality: els.gNationality?.value || "",
      arrivalTime: els.gArrival?.value || "",
      notes: els.gNotes?.value.trim().slice(0, 500) || "",

      // Payment
      paymentMethod: payMethod,
      receiptUrl: receiptUrl || null,
      status: "pending",
      lang: bookingState.lang,
      userId: currentUser ? currentUser.uid : null,
      userEmail: currentUser ? currentUser.email : null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("bookings").add(bookingDoc);

    populateSuccessScreen(docRef.id, bookingDoc, isAr);
    switchStep(3, 4);

  } catch (err) {
    console.error("[handleSubmit]", err);
    const msg = err.code === "storage/unauthorized"
      ? t("Upload failed: no permission.", "فشل الرفع: غير مصرّح.")
      : t("Unexpected error. Please try again.", "خطأ غير متوقع. يرجى المحاولة مجدداً.");
    showGlobalAlert(msg, "error");
    setButtonLoading(els.btnConfirm, false);
  }
}

// ─── Success Screen ────────────────────────
function populateSuccessScreen(docId, data, isAr) {
  const refEl = document.getElementById("succ-ref");
  if (refEl) refEl.textContent = docId.slice(0, 8).toUpperCase();

  const grid = document.getElementById("success-details-grid");
  if (!grid) return;

  const curr = isAr ? "د.ج" : "DZD";
  const locale = isAr ? "ar-DZ" : "en-GB";
  const fmtLong = { day: "2-digit", month: "long", year: "numeric" };

  const ciDate = parseLocalDate(bookingState.checkIn).toLocaleDateString(locale, fmtLong);
  const coDate = parseLocalDate(bookingState.checkOut).toLocaleDateString(locale, fmtLong);

  const planLabels = {
    breakfast: t("Breakfast", "إفطار"),
    halfboard: t("Half-Board", "نصف إقامة"),
    fullboard: t("Full-Board", "إقامة كاملة")
  };

  const addonsStr = data.selectedAddons && data.selectedAddons.length
    ? data.selectedAddons.map(k => t(k, k)).join(" • ")
    : t("None", "لا شيء");

  const cards = [
    { label: t("Check-in", "تاريخ الوصول"), value: ciDate },
    { label: t("Checkout", "تاريخ المغادرة"), value: coDate },
    { label: t("Rooms", "الغرف"), value: `${data.rooms} (${data.bedConfig})` },
    { label: t("Guests", "الضيوف"), value: `${data.adults} ${t("adults", "بالغين")}${data.children > 0 ? `, ${data.children} ${t("children", "أطفال")}` : ""}` },
    { label: t("Nights", "الليالي"), value: data.nights },
    { label: t("Add-ons", "الإضافات"), value: data.restaurantPlan ? `${t("Restaurant", "المطعم")} (${planLabels[data.restaurantPlan]}) • ${addonsStr}` : addonsStr },
    { label: t("Total", "الإجمالي"), value: `${data.totalPrice.toLocaleString()} ${curr}` },
    { label: t("Payment", "الدفع"), value: data.paymentMethod === "cash" ? t("Pay at Property", "الدفع في الفندق") : t("Bank Transfer", "تحويل بنكي") },
    { label: t("Status", "الحالة"), value: `<span class="status-badge pending"><i class="ph-fill ph-clock" aria-hidden="true"></i> ${t("Pending", "قيد المراجعة")}</span>` },
    { label: t("Name", "الاسم"), value: data.guestName },
    { label: t("Email", "البريد الإلكتروني"), value: data.guestEmail },
    { label: t("Phone", "الهاتف"), value: data.guestPhone },
    ...(data.arrivalTime ? [{ label: t("Arrival", "وقت الوصول"), value: data.arrivalTime }] : [])
  ];

  grid.innerHTML = cards.map(({ label, value }) => `
    <div class="confirm-detail-card">
      <p class="confirm-detail-label">${label}</p>
      <p class="confirm-detail-value">${value}</p>
    </div>
  `).join("");

  lastSuccessfulBooking = getBookingDataForReceipt();
}
