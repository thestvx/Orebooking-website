// =========================================
// OreBooking Admin Panel Logic — Production Ready (Fixed)
// Synced with final admin.html structure
// =========================================

// =========================================
// Firebase Safe Initialization
// =========================================

let db = null;
let _firebaseReady = false;

function getDb() {
  if (db) return db;
  try {
    if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0) {
      db = firebase.firestore();
      _firebaseReady = true;
      return db;
    }
  } catch (e) {
    console.error("getDb() failed:", e);
  }
  return null;
}

function initFirebase() {
  try {
    if (typeof firebase === "undefined") {
      console.error("Firebase SDK not loaded");
      return false;
    }

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

    db = firebase.firestore();
    _firebaseReady = true;
    console.log("[OreBooking] Firebase initialized successfully ✅");
    return true;

  } catch (err) {
    console.error("Firebase Init Error:", err);
    _firebaseReady = false;
    return false;
  }
}

// تهيئة فورية عند تحميل السكربت
initFirebase();

// إعادة محاولة ربط Firebase بعد تحميل الصفحة (fallback)
window.addEventListener("load", () => {
  if (!_firebaseReady || !db) {
    console.warn("[OreBooking] Retrying Firebase initialization on window.load...");
    initFirebase();
  }
});

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const OWNER_ACCOUNTS_COLLECTION = "ownerAccounts";
const PROPERTIES_COLLECTION = "properties";
const BOOKINGS_COLLECTION = "bookings";
const CHATS_COLLECTION = "chats";

const SESSION_KEYS = {
  role: "adminRole",
  ownerPropId: "ownerPropId",
  ownerPropName: "ownerPropName",
  ownerAccountId: "ownerAccountId",
  ownerUsername: "ownerUsername",
  loginAt: "adminLoginAt"
};

const DOM = {
  loginScreen: document.getElementById("admin-login-screen"),
  adminLayout: document.getElementById("admin-layout"),
  loginForm: document.getElementById("admin-login-form"),
  loginBtn: document.getElementById("admin-login-btn"),
  loginMessage: document.getElementById("admin-login-message"),

  addForm: document.getElementById("add-property-form"),
  submitBtn: document.getElementById("submit-prop-btn"),
  uploadStatus: document.getElementById("upload-status"),

  editForm: document.getElementById("edit-property-form"),
  submitEditBtn: document.getElementById("submit-edit-btn"),
  editModalEl: document.getElementById("edit-modal"),

  pageTitle: document.getElementById("page-title"),
  pageSubtitle: document.getElementById("page-subtitle"),
  adminProfileName: document.getElementById("admin-profile-name"),
  adminProfileRole: document.getElementById("admin-profile-role"),

  propertiesTbody: document.getElementById("properties-tbody"),
  bookingsContainer: document.getElementById("bookings-container"),
  ownerAccountsTbody: document.getElementById("owner-accounts-tbody"),
  ownerAccountForm: document.getElementById("owner-account-form"),
  ownerPropertySelect: document.getElementById("owner-property-id"),
  propertySearchInput: document.getElementById("property-search-input"),

  refreshPropertiesBtn: document.getElementById("refresh-properties-btn"),
  refreshBookingsBtn: document.getElementById("refresh-bookings-btn"),
  refreshOwnerAccountsBtn: document.getElementById("refresh-owner-accounts-btn"),
  logoutBtn: document.getElementById("admin-logout-btn")
};

const APP_STATE = {
  propertiesDocs: [],
  ownerAccountDocs: [],
  bookingDocs: [],
  currentPropertyFilter: "",
  currentBookingFilter: "all"
};

const CHAT_STATE = {
  currentChatId: "",
  currentBookingId: "",
  currentGuestId: "",
  currentGuestName: "",
  currentPropertyId: "",
  currentPropertyTitle: "",
  currentPropertyImage: "",
  currentBookingStatus: "",
  messagesUnsub: null,
  chatUnsub: null,
  sending: false,
  modalReady: false
};

const PAGE_META = {
  "manage-props": {
    title: "إدارة العقارات",
    subtitle: "واجهة حديثة لمتابعة العقارات، تحديث البيانات، ومراجعة الطلبات الواردة بسرعة ووضوح."
  },
  "add-property": {
    title: "إضافة عقار جديد",
    subtitle: "أدخل كل تفاصيل العقار بشكل منظم ثم انشره ليظهر ضمن المنصة بسرعة."
  },
  "owner-accounts": {
    title: "حسابات ملاك العقارات",
    subtitle: "أنشئ حسابات خاصة لأصحاب العقارات وحدد من يمكنه الدخول إلى لوحة التحكم الخاصة بعقاره."
  },
  "bookings": {
    title: "إدارة الحجوزات",
    subtitle: "مراجعة طلبات الحجز، اعتمادها أو رفضها، ومتابعة الحالة الحالية بسهولة."
  }
};

const FIELD_CANDIDATES = {
  bookingPropertyId: ["propertyId", "propId", "propertyDocId", "property_id", "listingId", "listing_id"],
  bookingGuestId: ["guestId", "userId", "customerId", "clientId", "uid"],
  bookingGuestName: ["guestName", "fullName", "name", "billingName"],
  bookingPhone: ["guestPhone", "phone", "guestWhatsapp", "billingPhone", "contactPhone"],
  bookingEmail: ["guestEmail", "email", "billingEmail", "contactEmail"],
  bookingCheckIn: ["checkInDate", "checkIn", "arrivalDate", "arrival_date"],
  bookingCheckOut: ["checkOutDate", "checkOut", "departureDate", "departure_date"],
  bookingPropertyTitle: ["propertyTitle", "propertyName", "listingTitle"],
  bookingPropertyImage: ["propertyImage", "propertyImageUrl", "imageUrl", "image"],
  bookingReceipt: ["receiptUrl", "paymentReceiptUrl", "transferReceiptUrl"],
  bookingPrice: ["totalPrice", "finalTotal", "amount", "price"],
  bookingNights: ["nights", "nightCount"]
};

function qs(selector, root = document) {
  return root.querySelector(selector);
}

function qsa(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-US")} DZD`;
}

function safeDateMs(value) {
  try {
    if (!value) return 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  } catch (_) {
    return 0;
  }
}

function formatDate(value) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (typeof value?.toDate === "function") return value.toDate().toLocaleDateString("ar-DZ");
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-DZ");
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("ar-DZ")} ${d.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function getRelativeTime(value) {
  const ms = safeDateMs(value);
  if (!ms) return "الآن";
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `منذ ${hr} س`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `منذ ${day} يوم`;
  return formatDateTime(value);
}

function getPropertyTypeLabel(type) {
  return {
    apartment: "شقة",
    villa: "فيلا",
    resort: "منتجع",
    pool: "مسبح"
  }[type] || "عقار";
}

function getStatusMeta(status) {
  return {
    pending: { label: "قيد الانتظار", cls: "pending", icon: "ph-hourglass-medium" },
    confirmed: { label: "تم التأكيد", cls: "confirmed", icon: "ph-check-circle" },
    cancelled: { label: "تم الإلغاء", cls: "rejected", icon: "ph-x-circle" },
    rejected: { label: "تم الرفض", cls: "rejected", icon: "ph-x-circle" }
  }[status] || { label: status || "—", cls: "pending", icon: "ph-info" };
}

function getField(data, candidates = [], fallback = "") {
  for (const key of candidates) {
    if (data?.[key] !== undefined && data?.[key] !== null && String(data[key]).trim() !== "") {
      return data[key];
    }
  }
  return fallback;
}

function setButtonLoading(btn, loading, htmlWhenLoading, htmlWhenIdle) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = htmlWhenLoading;
  } else {
    btn.disabled = false;
    btn.innerHTML = htmlWhenIdle || btn.dataset.originalHtml || btn.innerHTML;
  }
}

function showLoginMessage(message, type = "error") {
  if (!DOM.loginMessage) return;
  const iconMap = {
    error: "ph-warning-circle",
    success: "ph-check-circle",
    info: "ph-info"
  };
  DOM.loginMessage.className = `login-message ${type} show`;
  DOM.loginMessage.innerHTML = `<i class="ph ${iconMap[type] || iconMap.info}"></i><span>${escapeHtml(message)}</span>`;
}

function clearLoginMessage() {
  if (!DOM.loginMessage) return;
  DOM.loginMessage.className = "login-message";
  DOM.loginMessage.innerHTML = "";
}

function showToast(message, type = "success") {
  let host = document.getElementById("admin-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "admin-toast-host";
    host.style.cssText = "position:fixed;top:20px;left:20px;z-index:5000;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,380px);";
    document.body.appendChild(host);
  }

  const colors = {
    success: { bg: "#ecfdf5", border: "#10b981", text: "#047857", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "ph-info" }
  };

  const cfg = colors[type] || colors.info;
  const toast = document.createElement("div");
  toast.style.cssText = `background:${cfg.bg};border:1px solid ${cfg.border};color:${cfg.text};padding:14px 16px;border-radius:16px;box-shadow:0 14px 30px rgba(15,23,42,.12);font-weight:700;font-family:inherit;display:flex;align-items:flex-start;gap:10px;line-height:1.6;`;
  toast.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.2rem;flex-shrink:0;margin-top:2px;"></i><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function ensureValidSession() {
  const loginAt = Number(localStorage.getItem(SESSION_KEYS.loginAt) || 0);
  if (!loginAt) return false;
  if (Date.now() - loginAt > SESSION_MAX_AGE_MS) {
    clearAdminSession();
    return false;
  }
  return true;
}

function getIsSuperAdmin() {
  return !localStorage.getItem(SESSION_KEYS.ownerPropId);
}

function getOwnerPropId() {
  return normalizeText(localStorage.getItem(SESSION_KEYS.ownerPropId) || "");
}

function getOwnerPropName() {
  return normalizeText(localStorage.getItem(SESSION_KEYS.ownerPropName) || "");
}

function getOwnerAccountId() {
  return normalizeText(localStorage.getItem(SESSION_KEYS.ownerAccountId) || "");
}

function getOwnerUsername() {
  return normalizeText(localStorage.getItem(SESSION_KEYS.ownerUsername) || "");
}

function getSessionRole() {
  return normalizeText(localStorage.getItem(SESSION_KEYS.role) || "") || (getIsSuperAdmin() ? "superadmin" : "owner");
}

function getAdminActorId() {
  return getIsSuperAdmin() ? "superadmin" : (getOwnerAccountId() || getOwnerPropId());
}

function getAdminActorName() {
  return getIsSuperAdmin() ? "إدارة OreBooking" : (getOwnerPropName() || "صاحب العقار");
}

function setAdminSession(role = "superadmin", ownerPropId = "", ownerPropName = "", ownerAccountId = "", ownerUsername = "") {
  localStorage.setItem(SESSION_KEYS.role, role);
  localStorage.setItem(SESSION_KEYS.loginAt, String(Date.now()));

  if (role === "owner" && ownerPropId) {
    localStorage.setItem(SESSION_KEYS.ownerPropId, ownerPropId);
    localStorage.setItem(SESSION_KEYS.ownerPropName, ownerPropName || "");
    localStorage.setItem(SESSION_KEYS.ownerAccountId, ownerAccountId || "");
    localStorage.setItem(SESSION_KEYS.ownerUsername, ownerUsername || "");
  } else {
    localStorage.removeItem(SESSION_KEYS.ownerPropId);
    localStorage.removeItem(SESSION_KEYS.ownerPropName);
    localStorage.removeItem(SESSION_KEYS.ownerAccountId);
    localStorage.removeItem(SESSION_KEYS.ownerUsername);
  }
}

function clearAdminSession() {
  Object.values(SESSION_KEYS).forEach(key => localStorage.removeItem(key));
}

function canAccessProperty(propertyId) {
  if (getIsSuperAdmin()) return true;
  return normalizeText(propertyId) === getOwnerPropId();
}

function showAdminLayout() {
  if (DOM.loginScreen) DOM.loginScreen.style.display = "none";
  if (DOM.adminLayout) DOM.adminLayout.style.display = "flex";
  updateAdminHeaderForRole();
}

function showLoginLayout() {
  if (DOM.loginScreen) DOM.loginScreen.style.display = "grid";
  if (DOM.adminLayout) DOM.adminLayout.style.display = "none";
}

function updateAdminHeaderForRole() {
  if (DOM.adminProfileName && DOM.adminProfileRole) {
    if (getIsSuperAdmin()) {
      DOM.adminProfileName.textContent = "مدير النظام";
      DOM.adminProfileRole.textContent = "بصلاحيات كاملة";
    } else {
      DOM.adminProfileName.textContent = getOwnerPropName() || "صاحب العقار";
      DOM.adminProfileRole.textContent = getOwnerUsername() ? `حساب مالك • ${getOwnerUsername()}` : "حساب مالك";
    }
  }

  let badge = document.getElementById("owner-session-badge");
  if (!badge && DOM.pageTitle?.parentElement) {
    badge = document.createElement("div");
    badge.id = "owner-session-badge";
    badge.style.cssText = "margin-top:8px;font-size:.88rem;font-weight:800;color:var(--text-muted);";
    DOM.pageTitle.parentElement.appendChild(badge);
  }

  if (badge) {
    if (getIsSuperAdmin()) {
      badge.textContent = "وضع المدير العام";
    } else {
      const ownerPropName = getOwnerPropName();
      const ownerPropId = getOwnerPropId();
      const ownerUsername = getOwnerUsername();
      badge.textContent = `وضع المالك${ownerPropName ? ` — ${ownerPropName}` : ""}${ownerUsername ? ` • ${ownerUsername}` : ""}${ownerPropId ? ` (${ownerPropId})` : ""}`;
    }
  }
}

function updatePageMeta(tabId) {
  const meta = PAGE_META[tabId] || PAGE_META["manage-props"];
  if (DOM.pageTitle) DOM.pageTitle.textContent = meta.title;
  if (DOM.pageSubtitle) DOM.pageSubtitle.textContent = meta.subtitle;
  updateAdminHeaderForRole();
}

function normalizePropertyPayload(source = {}) {
  return {
    titleAr: normalizeText(source.titleAr || source.titlear),
    titleEn: normalizeText(source.titleEn || source.titleen),
    locationAr: normalizeText(source.locationAr || source.locationar),
    locationEn: normalizeText(source.locationEn || source.locationen),
    price: toNumber(source.price, 0),
    type: normalizeText(source.type || "apartment"),
    descAr: normalizeText(source.descAr || source.descar),
    descEn: normalizeText(source.descEn || source.descen),
    imageUrl: normalizeText(source.imageUrl || source.image || ""),
    lat: source.lat !== undefined && source.lat !== null && source.lat !== "" ? parseFloat(source.lat) : null,
    lng: source.lng !== undefined && source.lng !== null && source.lng !== "" ? parseFloat(source.lng) : null,
    visible: source.visible !== false
  };
}

function validatePropertyPayload(payload, { requireImage = false, requireMap = true } = {}) {
  if (!payload.titleAr) return "يرجى إدخال اسم العقار بالعربية.";
  if (!payload.titleEn) return "يرجى إدخال اسم العقار بالإنجليزية.";
  if (!payload.descAr) return "يرجى إدخال وصف العقار بالعربية.";
  if (!payload.descEn) return "يرجى إدخال وصف العقار بالإنجليزية.";
  if (!payload.locationAr) return "يرجى إدخال موقع العقار بالعربية.";
  if (!payload.locationEn) return "يرجى إدخال موقع العقار بالإنجليزية.";
  if (!payload.price || payload.price <= 0) return "يرجى إدخال سعر صحيح أكبر من 0.";
  if (requireMap && (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng))) return "يرجى تحديد موقع صحيح للعقار على الخريطة.";
  if (requireImage && !payload.imageUrl) return "الصورة الرئيسية للعقار مطلوبة.";
  return "";
}

function normalizeOwnerAccountPayload(source = {}) {
  return {
    fullName: normalizeText(source.fullName || source.name),
    username: normalizeText(source.username),
    password: normalizeText(source.password),
    propertyId: normalizeText(source.propertyId || source.propId),
    propertyName: normalizeText(source.propertyName || source.propName),
    role: "owner",
    active: source.active !== false
  };
}

function validateOwnerAccountPayload(payload) {
  if (!payload.fullName) return "يرجى إدخال اسم صاحب العقار.";
  if (!payload.propertyId) return "يرجى اختيار العقار المرتبط بالحساب.";
  if (!payload.username) return "يرجى إدخال اسم المستخدم.";
  if (!payload.password) return "يرجى إدخال كلمة المرور.";
  if (payload.username.length < 3) return "اسم المستخدم يجب أن يكون 3 أحرف على الأقل.";
  if (payload.password.length < 3) return "كلمة المرور يجب أن تكون 3 أحرف على الأقل.";
  return "";
}

function getBookingPropertyId(data = {}) {
  return normalizeText(getField(data, FIELD_CANDIDATES.bookingPropertyId, ""));
}

function getBookingGuestId(data = {}) {
  return normalizeText(getField(data, FIELD_CANDIDATES.bookingGuestId, ""));
}

function getBookingGuestName(data = {}) {
  const direct = normalizeText(getField(data, FIELD_CANDIDATES.bookingGuestName, ""));
  if (direct) return direct;
  const first = normalizeText(data.guestNameFirst || data.firstName || data.givenName || "");
  const father = normalizeText(data.guestFatherName || data.fatherName || "");
  const family = normalizeText(data.guestFamilyName || data.lastName || data.familyName || "");
  return [first, father, family].filter(Boolean).join(" ").trim() || "غير معروف";
}

function getBookingPhone(data = {}) {
  return normalizeText(getField(data, FIELD_CANDIDATES.bookingPhone, "—"));
}

function getBookingEmail(data = {}) {
  return normalizeText(getField(data, FIELD_CANDIDATES.bookingEmail, "—"));
}

function getBookingCheckIn(data = {}) {
  return getField(data, FIELD_CANDIDATES.bookingCheckIn, null);
}

function getBookingCheckOut(data = {}) {
  return getField(data, FIELD_CANDIDATES.bookingCheckOut, null);
}

function getBookingNotes(data = {}) {
  const special = normalizeText(getField(data, ["specialRequests", "notes", "addonNotes", "medicalNotes"], ""));
  const arrival = normalizeText(getField(data, ["arrivalTime", "arrival_time", "expectedArrivalTime"], ""));
  const additionalGuests = normalizeText(getField(data, ["additionalGuests", "additionalGuestNames"], ""));
  const bits = [];
  if (arrival) bits.push(`وقت الوصول: ${arrival}`);
  if (special) bits.push(`ملاحظات: ${special}`);
  if (additionalGuests) bits.push(`أسماء إضافية: ${additionalGuests}`);
  return bits.join(" — ");
}

function getBookingAddons(data = {}) {
  const addOnLabels = {
    restaurant: "المطعم",
    wifi: "إنترنت عالي السرعة",
    spa: "جلسة سبا",
    parking: "موقف سيارات",
    airportTransfer: "نقل المطار",
    lateCheckout: "تسجيل خروج متأخر",
    extraBed: "سرير إضافي",
    events: "تنسيق فعاليات",
    breakfast: "فطور",
    breakfastIncluded: "فطور",
    babyCrib: "سرير أطفال",
    highChair: "كرسي أطفال",
    accessibleRoom: "غرفة مهيأة",
    earlyCheckin: "دخول مبكر"
  };

  let addons = [];
  if (Array.isArray(data.selectedAddons)) {
    addons = data.selectedAddons;
  } else if (data.addons && typeof data.addons === "object") {
    addons = Object.keys(data.addons).filter(key => data.addons[key] === true);
  } else {
    const derived = [];
    if (String(data.breakfastOption || "").toLowerCase() === "yes") derived.push("breakfast");
    if (String(data.airportTransfer || "").toLowerCase() !== "no" && String(data.airportTransfer || "").trim()) derived.push("airportTransfer");
    if (String(data.parkingNeeded || "").toLowerCase() !== "no" && String(data.parkingNeeded || "").trim()) derived.push("parking");
    if (String(data.lateCheckout || "").toLowerCase() === "yes") derived.push("lateCheckout");
    if (String(data.earlyCheckin || "").toLowerCase() === "yes") derived.push("earlyCheckin");
    if (String(data.babyCrib || "").toLowerCase() === "yes") derived.push("babyCrib");
    if (String(data.highChair || "").toLowerCase() === "yes") derived.push("highChair");
    if (String(data.accessibleRoom || "").toLowerCase() !== "no" && String(data.accessibleRoom || "").trim()) derived.push("accessibleRoom");
    addons = derived;
  }

  return addons.map(a => {
    if (a === "restaurant" && data.restaurantPlan) return `${addOnLabels[a] || a} (${data.restaurantPlan})`;
    return addOnLabels[a] || a;
  });
}

function getBookingGuestsMeta(data = {}) {
  const adults = toNumber(getField(data, ["adults", "guestAdults"], 0), 0);
  const children = toNumber(getField(data, ["children", "guestChildren"], 0), 0);
  const infants = toNumber(getField(data, ["infants", "guestInfants"], 0), 0);
  const rooms = toNumber(getField(data, ["rooms", "roomCount"], 0), 0);
  const guests = toNumber(getField(data, ["guests", "guestCount"], adults + children + infants || 1), 1);
  return { adults, children, infants, rooms, guests };
}

function setNavVisibilityByRole() {
  const addTabBtn = document.querySelector('[data-tab-target="add-property"]');
  const ownerAccountsBtn = document.querySelector('[data-tab-target="owner-accounts"]');
  const addTabPane = document.getElementById("tab-add-property");
  const ownerAccountsPane = document.getElementById("tab-owner-accounts");

  if (!getIsSuperAdmin()) {
    if (addTabBtn) addTabBtn.style.display = "none";
    if (ownerAccountsBtn) ownerAccountsBtn.style.display = "none";
    if (addTabPane) addTabPane.style.display = "none";
    if (ownerAccountsPane) ownerAccountsPane.style.display = "none";
    const activePane = document.querySelector(".tab-pane.active");
    if (activePane?.id === "tab-add-property" || activePane?.id === "tab-owner-accounts") switchTab("manage-props");
  } else {
    if (addTabBtn) addTabBtn.style.display = "";
    if (ownerAccountsBtn) ownerAccountsBtn.style.display = "";
    if (addTabPane) addTabPane.style.display = "";
    if (ownerAccountsPane) ownerAccountsPane.style.display = "";
  }
}

function renderPropertiesEmpty(message, isError = false) {
  if (!DOM.propertiesTbody) return;
  DOM.propertiesTbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:36px; color:${isError ? "#e11d48" : "var(--text-muted)"};">
        <i class="ph ${isError ? "ph-warning-circle" : "ph-house-line"}" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
        ${escapeHtml(message)}
      </td>
    </tr>`;
  updateQuickStats();
}

function renderOwnerAccountsEmpty(message, isError = false) {
  if (!DOM.ownerAccountsTbody) return;
  DOM.ownerAccountsTbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:36px; color:${isError ? "#e11d48" : "var(--text-muted)"};">
        <i class="ph ${isError ? "ph-warning-circle" : "ph-users-three"}" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
        ${escapeHtml(message)}
      </td>
    </tr>`;
  updateQuickStats();
}

function renderBookingsEmpty(container, message, extraHtml = "") {
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <i class="ph ph-calendar-blank"></i>
      <div style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:8px;">
        ${escapeHtml(message)}
      </div>
      ${extraHtml}
    </div>`;
  updateQuickStats();
}

function getFilteredPropertyDocs() {
  const term = normalizeText(APP_STATE.currentPropertyFilter).toLowerCase();
  if (!term) return [...APP_STATE.propertiesDocs];

  return APP_STATE.propertiesDocs.filter(doc => {
    const p = normalizePropertyPayload(doc.data() || {});
    const haystack = [
      doc.id,
      p.titleAr,
      p.titleEn,
      p.locationAr,
      p.locationEn,
      p.descAr,
      p.descEn,
      getPropertyTypeLabel(p.type)
    ].join(" ").toLowerCase();
    return haystack.includes(term);
  });
}

function initializeBookingFilters() {
  const container = document.querySelector(".booking-filter-bar");
  if (!container) return;
  const buttons = container.querySelectorAll(".booking-filter-btn");
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      APP_STATE.currentBookingFilter = btn.dataset.filter || "all";
      loadBookings();
    });
  });
}

function updateQuickStats() {
  const filteredProps = getFilteredPropertyDocs();
  const visibleProps = filteredProps.filter(doc => {
    const p = normalizePropertyPayload(doc.data() || {});
    return p.visible !== false;
  });

  const totalProperties = filteredProps.length;
  const activeProperties = visibleProps.length;
  const totalOwnerAccounts = APP_STATE.ownerAccountDocs.length;
  const totalBookings = APP_STATE.bookingDocs.length;

  const map = {
    "stat-total-properties": totalProperties,
    "stat-active-properties": activeProperties,
    "stat-total-bookings": totalBookings,
    "stat-owner-accounts": totalOwnerAccounts
  };

  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  });
}

async function loadPropertiesForSelect() {
  if (!DOM.ownerPropertySelect) return;
  const _db = getDb();
  if (!_db) {
    DOM.ownerPropertySelect.innerHTML = `<option value="">Firebase غير متصل</option>`;
    return;
  }

  const previous = DOM.ownerPropertySelect.value;
  DOM.ownerPropertySelect.innerHTML = `<option value="">جارٍ تحميل العقارات...</option>`;

  try {
    const snapshot = await _db.collection(PROPERTIES_COLLECTION).orderBy("createdAt", "desc").get().catch(async () => {
      return await _db.collection(PROPERTIES_COLLECTION).get();
    });

    if (snapshot.empty) {
      DOM.ownerPropertySelect.innerHTML = `<option value="">لا توجد عقارات</option>`;
      return;
    }

    DOM.ownerPropertySelect.innerHTML = `<option value="">اختر العقار</option>`;
    snapshot.docs.forEach(doc => {
      const data = doc.data() || {};
      const title = normalizeText(data.titleAr || data.titleEn || doc.id);
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = title;
      option.dataset.title = title;
      DOM.ownerPropertySelect.appendChild(option);
    });

    if (previous) {
      const target = Array.from(DOM.ownerPropertySelect.options).find(opt => opt.value === previous);
      if (target) DOM.ownerPropertySelect.value = previous;
    }
  } catch (err) {
    console.error("loadPropertiesForSelect error:", err);
    DOM.ownerPropertySelect.innerHTML = `<option value="">تعذر تحميل العقارات</option>`;
  }
}

function renderPropertiesTable(docsArray) {
  if (!DOM.propertiesTbody) return;

  const visibleDocs = docsArray.filter(doc => {
    if (getIsSuperAdmin()) return true;
    return doc.id === getOwnerPropId();
  });

  if (!visibleDocs.length) {
    renderPropertiesEmpty("لا توجد نتائج مطابقة حالياً.");
    return;
  }

  DOM.propertiesTbody.innerHTML = "";

  visibleDocs.forEach(doc => {
    const p = normalizePropertyPayload(doc.data() || {});
    const isVisible = p.visible !== false;
    const hasLoc = Number.isFinite(p.lat) && Number.isFinite(p.lng);
    const typeLabel = getPropertyTypeLabel(p.type);

    const mapBadge = hasLoc
      ? `<span class="pill-soft" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;"><i class="ph-fill ph-map-pin"></i> موقع محدد</span>`
      : `<span class="pill-soft" style="background:#f8fafc;color:var(--text-muted);border:1px solid var(--border-color);"><i class="ph ph-map-pin-slash"></i> بدون خريطة</span>`;

    const statusBadge = isVisible
      ? `<span class="status-badge visible"><i class="ph ph-eye"></i> ظاهر</span>`
      : `<span class="status-badge hidden"><i class="ph ph-eye-slash"></i> مخفي</span>`;

    const tr = document.createElement("tr");
    tr.setAttribute("data-prop-id", doc.id);
    tr.setAttribute("data-visible", String(isVisible));

    tr.innerHTML = `
      <td>
        <img class="prop-thumb"
             src="${escapeHtml(p.imageUrl || "images/placeholder.jpg")}"
             alt="${escapeHtml(p.titleAr || "Property")}"
             onerror="this.src='images/placeholder.jpg'">
      </td>
      <td>
        <div class="prop-name-cell">
          <strong>${escapeHtml(p.titleAr || "—")}</strong>
          <span>${escapeHtml(p.titleEn || "")}</span>
          <span class="pill-soft" style="width:max-content;background:rgba(67,90,191,.08);color:var(--primary);border:1px solid rgba(67,90,191,.1);">${escapeHtml(typeLabel)}</span>
        </div>
      </td>
      <td>
        <div style="display:grid; gap:8px;">
          <div style="font-weight:600;">${escapeHtml(p.locationAr || "—")}</div>
          <div>${mapBadge}</div>
        </div>
      </td>
      <td>
        <span class="price-pill">${formatCurrency(p.price)}</span>
      </td>
      <td>
        <div style="display:grid; gap:10px;">
          ${statusBadge}
          <label class="switch" style="width:max-content;">
            <input type="checkbox" ${isVisible ? "checked" : ""} onchange="toggleVisibility('${doc.id}', this.checked, this)">
            <span class="slider round"></span>
          </label>
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button type="button" onclick="window.open('property.html?id=${doc.id}','_blank')" title="معاينة">
            <i class="ph ph-eye"></i> معاينة
          </button>
          <button type="button" onclick="openEditModal('${doc.id}')" title="تعديل">
            <i class="ph ph-pencil-simple"></i> تعديل
          </button>
          ${getIsSuperAdmin() ? `
            <button type="button" onclick="deleteProperty('${doc.id}')" title="حذف" style="color:#e11d48;">
              <i class="ph ph-trash"></i> حذف
            </button>` : ""}
        </div>
      </td>
    `;
    DOM.propertiesTbody.appendChild(tr);
  });

  updateQuickStats();
}

async function loadProperties() {
  if (!DOM.propertiesTbody) return;
  const _db = getDb();
  if (!_db) {
    renderPropertiesEmpty("Firebase غير متصل. تحقق من الإنترنت أو أعد تحميل الصفحة.", true);
    return;
  }

  DOM.propertiesTbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:36px; color:var(--text-muted);">
        <i class="ph ph-circle-notch ph-spin" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
        جارٍ تحميل العقارات...
      </td>
    </tr>`;

  try {
    if (!getIsSuperAdmin()) {
      const ownerPropId = getOwnerPropId();
      if (!ownerPropId) {
        APP_STATE.propertiesDocs = [];
        renderPropertiesEmpty("لم يتم العثور على معرّف العقار الخاص بهذا المالك.", true);
        return;
      }

      const doc = await _db.collection(PROPERTIES_COLLECTION).doc(ownerPropId).get();
      if (!doc.exists) {
        APP_STATE.propertiesDocs = [];
        renderPropertiesEmpty("عقارك غير موجود أو تم حذفه.");
        return;
      }

      APP_STATE.propertiesDocs = [doc];
      renderPropertiesTable(getFilteredPropertyDocs());
      return;
    }

    let snapshot;
    try {
      snapshot = await _db.collection(PROPERTIES_COLLECTION).orderBy("createdAt", "desc").get();
    } catch (orderErr) {
      console.warn("orderBy failed, falling back to plain get:", orderErr.message);
      snapshot = await _db.collection(PROPERTIES_COLLECTION).get();
    }

    if (snapshot.empty) {
      APP_STATE.propertiesDocs = [];
      renderPropertiesEmpty("لا توجد عقارات مضافة بعد.");
      return;
    }

    APP_STATE.propertiesDocs = snapshot.docs;
    renderPropertiesTable(getFilteredPropertyDocs());
  } catch (err) {
    console.error("loadProperties error:", err);
    APP_STATE.propertiesDocs = [];
    renderPropertiesEmpty(`حدث خطأ أثناء تحميل العقارات: ${err.message}`, true);
  }
}

async function toggleVisibility(docId, isVisible, checkboxEl) {
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل حالياً", "error");
    if (checkboxEl) checkboxEl.checked = !isVisible;
    return;
  }
  try {
    if (checkboxEl) checkboxEl.disabled = true;
    if (!canAccessProperty(docId)) throw new Error("غير مسموح لك بتعديل هذا العقار");

    const ts = (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date();

    await _db.collection(PROPERTIES_COLLECTION).doc(docId).update({
      visible: isVisible,
      updatedAt: ts
    });

    showToast(`تم ${isVisible ? "إظهار" : "إخفاء"} العقار بنجاح`, "success");
    await loadProperties();
  } catch (err) {
    console.error("toggleVisibility error:", err);
    if (checkboxEl) checkboxEl.checked = !isVisible;
    showToast(err.message || "حدث خطأ أثناء تحديث حالة الظهور", "error");
  } finally {
    if (checkboxEl) checkboxEl.disabled = false;
  }
}

async function openEditModal(docId) {
  const editModal = document.getElementById("edit-modal");
  if (!editModal) return;
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل", "error");
    return;
  }

  try {
    if (!canAccessProperty(docId)) {
      showToast("غير مسموح لك بتعديل هذا العقار", "error");
      return;
    }

    const doc = await _db.collection(PROPERTIES_COLLECTION).doc(docId).get();
    if (!doc.exists) {
      showToast("العقار غير موجود", "error");
      return;
    }

    const p = normalizePropertyPayload(doc.data() || {});
    qs("#edit-prop-id").value = docId;
    qs("#edit-title-ar").value = p.titleAr || "";
    qs("#edit-title-en").value = p.titleEn || "";
    qs("#edit-price").value = p.price || "";
    qs("#edit-desc-ar").value = p.descAr || "";
    qs("#edit-desc-en").value = p.descEn || "";
    qs("#edit-loc-ar").value = p.locationAr || "";
    qs("#edit-loc-en").value = p.locationEn || "";
    qs("#edit-type").value = p.type || "apartment";

    const existingLat = Number.isFinite(p.lat) ? parseFloat(p.lat) : null;
    const existingLng = Number.isFinite(p.lng) ? parseFloat(p.lng) : null;

    qs("#edit-lat").value = existingLat ?? "";
    qs("#edit-lng").value = existingLng ?? "";

    const pickedBadge = qs("#edit-map-picked-badge");
    if (pickedBadge) pickedBadge.classList.toggle("visible", !!(existingLat !== null && existingLng !== null));

    const fileInput = qs("#edit-image");
    if (fileInput) fileInput.value = "";
    resetEditUploadPreview();

    editModal.classList.add("active");
    document.body.classList.add("modal-open");

    if (typeof window.initEditMapFromAdmin === "function") {
      window.initEditMapFromAdmin(existingLat, existingLng);
    }
  } catch (err) {
    console.error("openEditModal error:", err);
    showToast("تعذر تحميل بيانات العقار من السيرفر", "error");
  }
}

function closeEditModal() {
  const editModal = document.getElementById("edit-modal");
  if (editModal) editModal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

async function deleteProperty(docId) {
  if (!getIsSuperAdmin()) {
    showToast("غير مسموح لك بحذف العقار من هذه الجلسة", "error");
    return;
  }
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل", "error");
    return;
  }

  if (!confirm("هل أنت متأكد من حذف هذا العقار نهائياً؟")) return;

  try {
    await _db.collection(PROPERTIES_COLLECTION).doc(docId).delete();
    showToast("تم حذف العقار بنجاح", "success");
    await loadProperties();
    await loadPropertiesForSelect();
  } catch (err) {
    console.error("deleteProperty error:", err);
    showToast(`تعذر حذف العقار: ${err.message}`, "error");
  }
}

async function loadOwnerAccounts() {
  if (!DOM.ownerAccountsTbody) return;
  const _db = getDb();
  if (!_db) {
    renderOwnerAccountsEmpty("Firebase غير متصل. تحقق من الاتصال.", true);
    return;
  }

  if (!getIsSuperAdmin()) {
    APP_STATE.ownerAccountDocs = [];
    renderOwnerAccountsEmpty("إدارة حسابات الملاك متاحة للمدير العام فقط.");
    return;
  }

  DOM.ownerAccountsTbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:36px; color:var(--text-muted);">
        <i class="ph ph-circle-notch ph-spin" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
        جارٍ تحميل حسابات الملاك...
      </td>
    </tr>`;

  try {
    let snapshot;
    try {
      snapshot = await _db.collection(OWNER_ACCOUNTS_COLLECTION).orderBy("createdAt", "desc").get();
    } catch (orderErr) {
      console.warn("orderBy failed for ownerAccounts, fallback to plain get:", orderErr.message);
      snapshot = await _db.collection(OWNER_ACCOUNTS_COLLECTION).get();
    }

    if (snapshot.empty) {
      APP_STATE.ownerAccountDocs = [];
      renderOwnerAccountsEmpty("لا توجد حسابات ملاك مضافة بعد.");
      return;
    }

    APP_STATE.ownerAccountDocs = snapshot.docs;
    renderOwnerAccountsTable(snapshot.docs);
  } catch (err) {
    console.error("loadOwnerAccounts error:", err);
    APP_STATE.ownerAccountDocs = [];
    renderOwnerAccountsEmpty(`حدث خطأ أثناء تحميل الحسابات: ${err.message}`, true);
  }
}

function renderOwnerAccountsTable(docsArray) {
  if (!DOM.ownerAccountsTbody) return;

  DOM.ownerAccountsTbody.innerHTML = "";

  docsArray.forEach(doc => {
    const data = normalizeOwnerAccountPayload(doc.data() || {});
    const isActive = data.active !== false;

    const tr = document.createElement("tr");
    tr.setAttribute("data-owner-id", doc.id);
    tr.setAttribute("data-active", String(isActive));
    tr.innerHTML = `
      <td>${escapeHtml(data.fullName || "—")}</td>
      <td>${escapeHtml(data.username || "—")}</td>
      <td>${escapeHtml(data.password || "—")}</td>
      <td>${escapeHtml(data.propertyName || data.propertyId || "—")}</td>
      <td>
        <span class="status-badge ${isActive ? "visible" : "hidden"}">
          <i class="ph ${isActive ? "ph-check-circle" : "ph-x-circle"}"></i>
          ${isActive ? "نشط" : "معطل"}
        </span>
      </td>
      <td>
        <div class="table-actions">
          <button type="button" onclick="toggleOwnerAccount('${doc.id}', ${!isActive}, this)">
            <i class="ph ph-power"></i> ${isActive ? "تعطيل" : "تفعيل"}
          </button>
          <button type="button" onclick="deleteOwnerAccount('${doc.id}')" style="color:#e11d48;">
            <i class="ph ph-trash"></i> حذف
          </button>
        </div>
      </td>
    `;
    DOM.ownerAccountsTbody.appendChild(tr);
  });

  updateQuickStats();
}

async function createOwnerAccountFromForm(e) {
  e.preventDefault();
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل", "error");
    return;
  }

  if (!getIsSuperAdmin()) {
    showToast("فقط المدير العام يمكنه إنشاء حسابات الملاك", "error");
    return;
  }

  const submitBtn = DOM.ownerAccountForm?.querySelector('button[type="submit"]');
  const selectedOption = DOM.ownerPropertySelect?.selectedOptions?.[0] || null;

  const payload = normalizeOwnerAccountPayload({
    fullName: qs("#owner-full-name")?.value,
    username: qs("#owner-username")?.value,
    password: qs("#owner-password")?.value,
    propertyId: qs("#owner-property-id")?.value,
    propertyName: selectedOption?.dataset?.title || selectedOption?.textContent || ""
  });

  const validationError = validateOwnerAccountPayload(payload);
  if (validationError) {
    showToast(validationError, "error");
    return;
  }

  setButtonLoading(submitBtn, true, `<i class="ph ph-circle-notch ph-spin"></i> جارٍ إنشاء الحساب...`);

  try {
    const propertySnap = await _db.collection(PROPERTIES_COLLECTION).doc(payload.propertyId).get();
    if (!propertySnap.exists) {
      throw new Error("العقار المحدد غير موجود");
    }

    const duplicateSnap = await _db.collection(OWNER_ACCOUNTS_COLLECTION)
      .where("username", "==", payload.username)
      .limit(1)
      .get();

    if (!duplicateSnap.empty) {
      throw new Error("اسم المستخدم مستخدم مسبقاً");
    }

    const ts = (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date();

    await _db.collection(OWNER_ACCOUNTS_COLLECTION).add({
      ...payload,
      createdAt: ts,
      updatedAt: ts
    });

    DOM.ownerAccountForm?.reset();
    showToast("تم إنشاء حساب المالك بنجاح", "success");
    await loadOwnerAccounts();
  } catch (err) {
    console.error("createOwnerAccountFromForm error:", err);
    showToast(`تعذر إنشاء الحساب: ${err.message}`, "error");
  } finally {
    setButtonLoading(submitBtn, false, null, `<i class="ph ph-user-plus"></i> إنشاء حساب المالك`);
  }
}

async function toggleOwnerAccount(docId, newState, clickedBtn = null) {
  if (!getIsSuperAdmin()) {
    showToast("فقط المدير العام يمكنه تعديل حسابات الملاك", "error");
    return;
  }
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل", "error");
    return;
  }

  try {
    if (clickedBtn) clickedBtn.disabled = true;

    const ts = (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date();

    await _db.collection(OWNER_ACCOUNTS_COLLECTION).doc(docId).update({
      active: !!newState,
      updatedAt: ts
    });

    showToast(`تم ${newState ? "تفعيل" : "تعطيل"} الحساب بنجاح`, "success");
    await loadOwnerAccounts();
  } catch (err) {
    console.error("toggleOwnerAccount error:", err);
    showToast(`تعذر تحديث حالة الحساب: ${err.message}`, "error");
  } finally {
    if (clickedBtn) clickedBtn.disabled = false;
  }
}

async function deleteOwnerAccount(docId) {
  if (!getIsSuperAdmin()) {
    showToast("فقط المدير العام يمكنه حذف حسابات الملاك", "error");
    return;
  }
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل", "error");
    return;
  }

  if (!confirm("هل أنت متأكد من حذف حساب المالك نهائياً؟")) return;

  try {
    await _db.collection(OWNER_ACCOUNTS_COLLECTION).doc(docId).delete();
    showToast("تم حذف حساب المالك بنجاح", "success");
    await loadOwnerAccounts();
  } catch (err) {
    console.error("deleteOwnerAccount error:", err);
    showToast(`تعذر حذف الحساب: ${err.message}`, "error");
  }
}

function autoResizeAdminChatTextarea() {
  const textarea = document.getElementById("admin-chat-textarea");
  if (!textarea) return;
  textarea.style.height = "54px";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

function handleAdminChatFileSelect(e) {
  const file = e.target?.files?.[0];
  if (!file) {
    clearAdminChatFilePreview();
    return;
  }

  if (!file.type.startsWith("image/")) {
    showToast("يمكن رفع الصور فقط داخل المحادثة", "error");
    e.target.value = "";
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    showToast("حجم الصورة يتجاوز 5MB", "error");
    e.target.value = "";
    return;
  }

  const preview = document.getElementById("admin-chat-preview");
  const img = document.getElementById("admin-chat-preview-img");
  const name = document.getElementById("admin-chat-preview-name");
  const size = document.getElementById("admin-chat-preview-size");

  if (name) name.textContent = file.name;
  if (size) size.textContent = `${(file.size / 1024 / 1024).toFixed(2)} MB`;

  const reader = new FileReader();
  reader.onload = ev => {
    if (img) img.src = ev.target?.result || "";
    preview?.classList.add("visible");
  };
  reader.readAsDataURL(file);
}

function clearAdminChatFilePreview() {
  const input = document.getElementById("admin-chat-file-input");
  const preview = document.getElementById("admin-chat-preview");
  const img = document.getElementById("admin-chat-preview-img");
  const name = document.getElementById("admin-chat-preview-name");
  const size = document.getElementById("admin-chat-preview-size");

  if (input) input.value = "";
  if (img) img.removeAttribute("src");
  if (name) name.textContent = "";
  if (size) size.textContent = "";
  preview?.classList.remove("visible");
}

function resetAdminChatStateOnly() {
  if (typeof CHAT_STATE.messagesUnsub === "function") {
    try { CHAT_STATE.messagesUnsub(); } catch (_) {}
  }
  if (typeof CHAT_STATE.chatUnsub === "function") {
    try { CHAT_STATE.chatUnsub(); } catch (_) {}
  }

  CHAT_STATE.currentChatId = "";
  CHAT_STATE.currentBookingId = "";
  CHAT_STATE.currentGuestId = "";
  CHAT_STATE.currentGuestName = "";
  CHAT_STATE.currentPropertyId = "";
  CHAT_STATE.currentPropertyTitle = "";
  CHAT_STATE.currentPropertyImage = "";
  CHAT_STATE.currentBookingStatus = "";
  CHAT_STATE.messagesUnsub = null;
  CHAT_STATE.chatUnsub = null;
  CHAT_STATE.sending = false;
}

function closeAdminChatModal() {
  const overlay = document.getElementById("admin-chat-overlay");
  overlay?.classList.remove("active");
  document.body.classList.remove("modal-open");
  resetAdminChatStateOnly();
  clearAdminChatFilePreview();

  const box = document.getElementById("admin-chat-messages");
  if (box) {
    box.innerHTML = `
      <div class="admin-chat-empty">
        <i class="ph ph-chat-circle-dots" style="font-size:2.6rem;color:var(--primary);display:block;margin-bottom:10px;"></i>
        هذه بداية المحادثة. أرسل أول رسالة للعميل من هنا.
      </div>
    `;
  }

  const textarea = document.getElementById("admin-chat-textarea");
  if (textarea) {
    textarea.value = "";
    textarea.style.height = "54px";
  }
}

function ensureAdminChatModal() {
  if (CHAT_STATE.modalReady) return;

  const existing = document.getElementById("admin-chat-overlay");
  if (existing) {
    CHAT_STATE.modalReady = true;
    return;
  }

  if (!document.getElementById("admin-chat-inline-style")) {
    const style = document.createElement("style");
    style.id = "admin-chat-inline-style";
    style.textContent = `
      .admin-chat-overlay{position:fixed; inset:0; background:rgba(15,23,42,.45);backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);z-index:4500; display:none; align-items:center; justify-content:center; padding:18px;}
      .admin-chat-overlay.active{ display:flex; }
      .admin-chat-shell{width:min(980px,96vw); height:min(88vh,760px);background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(248,250,252,.98));border:1px solid rgba(255,255,255,.72); border-radius:28px;box-shadow:0 35px 80px rgba(15,23,42,.22); overflow:hidden;display:grid; grid-template-rows:auto 1fr auto;}
      .dark .admin-chat-shell, body.dark .admin-chat-shell{background:linear-gradient(180deg, rgba(15,23,42,.96), rgba(11,18,32,.98));border-color:rgba(51,65,85,.85);}
      .admin-chat-topbar{display:flex; align-items:center; justify-content:space-between; gap:14px;padding:18px 20px; border-bottom:1px solid rgba(226,232,240,.9);background:linear-gradient(135deg, rgba(67,90,191,.08), rgba(101,123,224,.06));}
      .admin-chat-head{display:flex; align-items:center; gap:14px; min-width:0;}
      .admin-chat-property-thumb{width:58px; height:58px; border-radius:18px; object-fit:cover;border:1px solid rgba(203,213,225,.9); background:#f1f5f9; flex-shrink:0;}
      .admin-chat-head-meta{display:grid; gap:4px; min-width:0;}
      .admin-chat-head-meta strong{font-size:1rem; color:var(--text-main); display:flex; align-items:center; gap:8px;white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
      .admin-chat-head-meta span{color:var(--text-muted); font-size:.84rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
      .admin-verified-badge{display:inline-flex; align-items:center; justify-content:center;width:22px; height:22px; border-radius:999px;background:linear-gradient(135deg,#3b82f6,#2563eb); color:#fff; font-size:.78rem;box-shadow:0 8px 18px rgba(59,130,246,.28);}
      .admin-chat-top-actions{display:flex; align-items:center; gap:10px; flex-shrink:0;}
      .admin-chat-status-chip{display:inline-flex; align-items:center; gap:8px;padding:10px 14px; border-radius:999px; font-size:.8rem; font-weight:800;background:rgba(67,90,191,.08); color:var(--primary); border:1px solid rgba(67,90,191,.1);}
      .admin-chat-close{width:44px; height:44px; border:none; border-radius:14px;background:rgba(255,255,255,.85); color:var(--text-main); cursor:pointer;display:grid; place-items:center; font-size:1.15rem; border:1px solid rgba(203,213,225,.95);}
      .admin-chat-body{display:grid; grid-template-columns:minmax(0,1fr) 300px; min-height:0;background:radial-gradient(circle at top, rgba(67,90,191,.08), transparent 28%),linear-gradient(180deg, rgba(248,250,252,.72), rgba(255,255,255,.92));}
      .dark .admin-chat-body, body.dark .admin-chat-body{background:radial-gradient(circle at top, rgba(67,90,191,.10), transparent 28%),linear-gradient(180deg, rgba(15,23,42,.76), rgba(2,6,23,.9));}
      .admin-chat-main{min-width:0; min-height:0; display:grid; grid-template-rows:1fr;border-inline-end:1px solid rgba(226,232,240,.85);}
      .admin-chat-messages{overflow:auto; padding:20px; display:flex; flex-direction:column; gap:12px;scroll-behavior:smooth;}
      .admin-chat-empty{margin:auto; max-width:420px; text-align:center; color:var(--text-muted);line-height:1.8; font-weight:700;}
      .admin-chat-message{max-width:min(78%, 620px); display:grid; gap:6px;}
      .admin-chat-message.mine{align-self:flex-end;}
      .admin-chat-message.theirs{align-self:flex-start;}
      .admin-chat-bubble{padding:14px 16px; border-radius:22px; box-shadow:0 10px 28px rgba(15,23,42,.08);line-height:1.8; word-break:break-word; font-size:.95rem;border:1px solid rgba(226,232,240,.9); background:#fff; color:var(--text-main);}
      .admin-chat-message.mine .admin-chat-bubble{background:linear-gradient(135deg, var(--primary), var(--accent)); color:#fff; border-color:transparent;box-shadow:0 18px 34px rgba(67,90,191,.22);border-bottom-left-radius:22px; border-bottom-right-radius:8px;}
      .admin-chat-message.theirs .admin-chat-bubble{border-bottom-right-radius:22px; border-bottom-left-radius:8px;background:rgba(255,255,255,.95);}
      .dark .admin-chat-message.theirs .admin-chat-bubble, body.dark .admin-chat-message.theirs .admin-chat-bubble{background:rgba(15,23,42,.82); border-color:rgba(51,65,85,.9);}
      .admin-chat-meta{font-size:.74rem; color:var(--text-muted); font-weight:700;padding-inline:6px; display:flex; align-items:center; gap:6px;}
      .admin-chat-message.mine .admin-chat-meta{justify-content:flex-end;}
      .admin-chat-image{width:min(280px,100%); max-width:100%; border-radius:18px; display:block;border:1px solid rgba(226,232,240,.9); cursor:zoom-in; background:#fff;}
      .admin-chat-side{padding:18px; display:grid; gap:14px; align-content:start;background:rgba(248,250,252,.7);}
      .dark .admin-chat-side, body.dark .admin-chat-side{background:rgba(2,6,23,.45);}
      .admin-chat-side-card{padding:16px; border-radius:20px; border:1px solid var(--border-color);background:rgba(255,255,255,.82); box-shadow:0 12px 28px rgba(15,23,42,.05);display:grid; gap:10px;}
      .dark .admin-chat-side-card, body.dark .admin-chat-side-card{background:rgba(15,23,42,.72); border-color:rgba(51,65,85,.88);}
      .admin-chat-side-card label{font-size:.74rem; color:var(--text-muted); font-weight:800;}
      .admin-chat-side-card strong,.admin-chat-side-card span{color:var(--text-main); line-height:1.7; word-break:break-word;}
      .admin-chat-composer{border-top:1px solid rgba(226,232,240,.9); padding:16px 18px;background:rgba(255,255,255,.9); display:grid; gap:12px;}
      .dark .admin-chat-composer, body.dark .admin-chat-composer{background:rgba(15,23,42,.84); border-color:rgba(51,65,85,.88);}
      .admin-chat-preview{display:none; align-items:center; justify-content:space-between; gap:14px;padding:12px 14px; border-radius:16px; border:1px solid var(--border-color);background:rgba(248,250,252,.86);}
      .admin-chat-preview.visible{display:flex;}
      .admin-chat-preview-main{display:flex; align-items:center; gap:12px; min-width:0;}
      .admin-chat-preview img{width:58px; height:46px; object-fit:cover; border-radius:12px;border:1px solid rgba(203,213,225,.9); background:#fff; flex-shrink:0;}
      .admin-chat-preview-meta{display:grid; gap:4px; min-width:0;}
      .admin-chat-preview-meta strong{font-size:.88rem; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
      .admin-chat-preview-meta span{font-size:.76rem; color:var(--text-muted);}
      .admin-chat-preview-remove{width:36px; height:36px; border:none; border-radius:12px; cursor:pointer;background:#fff; color:#e11d48; border:1px solid #fecdd3;}
      .admin-chat-input-row{display:flex; align-items:flex-end; gap:12px;}
      .admin-chat-attach{width:52px; height:52px; border-radius:16px; border:1px solid var(--border-color);background:rgba(248,250,252,.92); color:var(--primary); cursor:pointer;display:grid; place-items:center; font-size:1.3rem; flex-shrink:0;}
      .admin-chat-textarea{flex:1; min-height:54px; max-height:160px; resize:none; padding:15px 16px;border-radius:18px; border:1px solid var(--border-color); outline:none;background:rgba(248,250,252,.92); color:var(--text-main); font-family:inherit; font-size:.95rem;line-height:1.7;}
      .admin-chat-textarea:focus{border-color:var(--primary); box-shadow:0 0 0 4px rgba(67,90,191,.1); background:#fff;}
      .admin-chat-send{min-width:148px; height:54px; border:none; border-radius:18px;background:linear-gradient(135deg, var(--primary), var(--accent)); color:#fff;font-weight:800; font-family:inherit; cursor:pointer; display:inline-flex;align-items:center; justify-content:center; gap:8px; box-shadow:0 16px 28px rgba(67,90,191,.2);}
      .admin-chat-send:disabled,.admin-chat-attach:disabled,.admin-chat-close:disabled{opacity:.6; cursor:not-allowed;}
      .admin-chat-upload-hint{font-size:.76rem; color:var(--text-muted); font-weight:700;display:flex; align-items:center; gap:8px; flex-wrap:wrap;}
      @media (max-width:980px){.admin-chat-shell{width:min(100vw,100vw); height:min(100vh,100vh); border-radius:0;}.admin-chat-body{grid-template-columns:1fr;}.admin-chat-main{border-inline-end:none; border-bottom:1px solid rgba(226,232,240,.85);}.admin-chat-side{grid-template-columns:1fr 1fr;}}
      @media (max-width:700px){.admin-chat-topbar{padding:14px; align-items:flex-start; flex-direction:column;}.admin-chat-top-actions{width:100%; justify-content:space-between;}.admin-chat-side{grid-template-columns:1fr;}.admin-chat-input-row{flex-wrap:wrap;}.admin-chat-send{width:100%;}.admin-chat-textarea{width:100%;}.admin-chat-message{max-width:92%;}}
    `;
    document.head.appendChild(style);
  }

  const overlay = document.createElement("div");
  overlay.className = "admin-chat-overlay";
  overlay.id = "admin-chat-overlay";
  overlay.innerHTML = `
    <div class="admin-chat-shell">
      <div class="admin-chat-topbar">
        <div class="admin-chat-head">
          <img id="admin-chat-property-image" class="admin-chat-property-thumb" src="images/placeholder.jpg" alt="Property">
          <div class="admin-chat-head-meta">
            <strong id="admin-chat-property-title">محادثة العقار <span class="admin-verified-badge"><i class="ph-fill ph-check"></i></span></strong>
            <span id="admin-chat-guest-line">جاري تحميل بيانات العميل...</span>
            <span id="admin-chat-booking-line">—</span>
          </div>
        </div>
        <div class="admin-chat-top-actions">
          <div id="admin-chat-status-chip" class="admin-chat-status-chip"><i class="ph ph-chat-circle-text"></i> محادثة مباشرة</div>
          <button type="button" id="admin-chat-close-btn" class="admin-chat-close" aria-label="إغلاق">
            <i class="ph ph-x"></i>
          </button>
        </div>
      </div>

      <div class="admin-chat-body">
        <div class="admin-chat-main">
          <div id="admin-chat-messages" class="admin-chat-messages">
            <div class="admin-chat-empty">
              <i class="ph ph-chat-circle-dots" style="font-size:2.6rem;color:var(--primary);display:block;margin-bottom:10px;"></i>
              هذه بداية المحادثة. أرسل أول رسالة للعميل من هنا.
            </div>
          </div>
        </div>

        <aside class="admin-chat-side">
          <div class="admin-chat-side-card">
            <label>اسم العميل</label>
            <strong id="admin-chat-side-guest-name">—</strong>
            <label>رقم الهاتف</label>
            <span id="admin-chat-side-phone">—</span>
            <label>البريد الإلكتروني</label>
            <span id="admin-chat-side-email">—</span>
          </div>
          <div class="admin-chat-side-card">
            <label>العقار</label>
            <strong id="admin-chat-side-property">—</strong>
            <label>الحجز</label>
            <span id="admin-chat-side-booking-id">—</span>
            <label>آخر تحديث</label>
            <span id="admin-chat-side-updated">—</span>
          </div>
        </aside>
      </div>

      <div class="admin-chat-composer">
        <div id="admin-chat-preview" class="admin-chat-preview">
          <div class="admin-chat-preview-main">
            <img id="admin-chat-preview-img" src="" alt="Preview">
            <div class="admin-chat-preview-meta">
              <strong id="admin-chat-preview-name">image.jpg</strong>
              <span id="admin-chat-preview-size">0 KB</span>
            </div>
          </div>
          <button type="button" id="admin-chat-preview-remove" class="admin-chat-preview-remove" aria-label="حذف الصورة">
            <i class="ph ph-x"></i>
          </button>
        </div>

        <div class="admin-chat-input-row">
          <input type="file" id="admin-chat-file-input" accept="image/*" hidden>
          <button type="button" id="admin-chat-attach-btn" class="admin-chat-attach" title="إرفاق صورة">
            <i class="ph ph-image"></i>
          </button>
          <textarea id="admin-chat-textarea" class="admin-chat-textarea" placeholder="اكتب رسالة احترافية للعميل..." rows="1"></textarea>
          <button type="button" id="admin-chat-send-btn" class="admin-chat-send">
            <i class="ph-fill ph-paper-plane-tilt"></i> إرسال
          </button>
        </div>

        <div class="admin-chat-upload-hint">
          <i class="ph ph-info"></i>
          يمكنك إرسال نص أو صورة أو الاثنين معًا. الحد الأقصى للصورة 5MB.
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.addEventListener("click", e => {
    if (e.target === overlay) closeAdminChatModal();
  });

  document.getElementById("admin-chat-close-btn")?.addEventListener("click", closeAdminChatModal);
  document.getElementById("admin-chat-attach-btn")?.addEventListener("click", () => {
    document.getElementById("admin-chat-file-input")?.click();
  });
  document.getElementById("admin-chat-file-input")?.addEventListener("change", handleAdminChatFileSelect);
  document.getElementById("admin-chat-preview-remove")?.addEventListener("click", clearAdminChatFilePreview);
  document.getElementById("admin-chat-send-btn")?.addEventListener("click", sendAdminChatMessage);

  const textarea = document.getElementById("admin-chat-textarea");
  if (textarea) {
    textarea.addEventListener("input", autoResizeAdminChatTextarea);
    textarea.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendAdminChatMessage();
      }
    });
  }

  CHAT_STATE.modalReady = true;
}

function buildChatId(bookingId, propertyId, guestId) {
  const b = normalizeText(bookingId || "");
  const p = normalizeText(propertyId || "");
  const g = normalizeText(guestId || "");
  if (b) return `booking_${b}`;
  return `chat_${[p || "property", g || "guest", Date.now()].join("_")}`;
}

function getServerTimestamp() {
  if (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp) {
    return firebase.firestore.FieldValue.serverTimestamp();
  }
  return new Date();
}

function getIncrement(n) {
  if (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.increment) {
    return firebase.firestore.FieldValue.increment(n);
  }
  return n;
}

async function ensureChatForBooking({
  bookingId,
  bookingData,
  propertyId,
  propertyTitle,
  propertyImage,
  guestId,
  guestName,
  guestEmail,
  guestPhone
}) {
  const _db = getDb();
  if (!_db) throw new Error("Firebase غير متصل");

  const chatId = buildChatId(bookingId, propertyId, guestId);
  const chatRef = _db.collection(CHATS_COLLECTION).doc(chatId);
  const existing = await chatRef.get();

  const basePayload = {
    chatId,
    bookingId: normalizeText(bookingId),
    propertyId: normalizeText(propertyId),
    propertyTitle: normalizeText(propertyTitle || "العقار"),
    propertyImage: normalizeText(propertyImage || ""),
    guestId: normalizeText(guestId),
    guestName: normalizeText(guestName || "العميل"),
    guestEmail: normalizeText(guestEmail || ""),
    guestPhone: normalizeText(guestPhone || ""),
    ownerId: getAdminActorId(),
    ownerName: getAdminActorName(),
    ownerRole: getSessionRole(),
    verified: true,
    status: normalizeText(bookingData.status || "pending"),
    lastMessage: existing.exists ? (existing.data()?.lastMessage || "") : "",
    lastMessageType: existing.exists ? (existing.data()?.lastMessageType || "text") : "text",
    lastSenderId: existing.exists ? (existing.data()?.lastSenderId || "") : "",
    lastMessageAt: existing.exists ? (existing.data()?.lastMessageAt || null) : null,
    unreadCountGuest: existing.exists ? toNumber(existing.data()?.unreadCountGuest, 0) : 0,
    unreadCountOwner: 0,
    bookingCreatedAt: bookingData.createdAt || null,
    updatedAt: getServerTimestamp()
  };

  if (!existing.exists) {
    await chatRef.set({
      ...basePayload,
      createdAt: getServerTimestamp()
    });
  } else {
    await chatRef.set(basePayload, { merge: true });
  }

  return chatId;
}

function setAdminChatHeader(data = {}) {
  const propertyTitle = normalizeText(data.propertyTitle || CHAT_STATE.currentPropertyTitle || "العقار");
  const guestName = normalizeText(data.guestName || CHAT_STATE.currentGuestName || "العميل");
  const bookingId = normalizeText(data.bookingId || CHAT_STATE.currentBookingId || "");
  const propertyImage = normalizeText(data.propertyImage || CHAT_STATE.currentPropertyImage || "");
  const phone = normalizeText(data.guestPhone || "—");
  const email = normalizeText(data.guestEmail || "—");
  const statusMeta = getStatusMeta(data.status || CHAT_STATE.currentBookingStatus || "pending");

  const titleEl = document.getElementById("admin-chat-property-title");
  const guestLineEl = document.getElementById("admin-chat-guest-line");
  const bookingLineEl = document.getElementById("admin-chat-booking-line");
  const imageEl = document.getElementById("admin-chat-property-image");
  const statusChipEl = document.getElementById("admin-chat-status-chip");
  const sideGuestName = document.getElementById("admin-chat-side-guest-name");
  const sidePhone = document.getElementById("admin-chat-side-phone");
  const sideEmail = document.getElementById("admin-chat-side-email");
  const sideProperty = document.getElementById("admin-chat-side-property");
  const sideBooking = document.getElementById("admin-chat-side-booking-id");

  if (titleEl) titleEl.innerHTML = `${escapeHtml(propertyTitle)} <span class="admin-verified-badge"><i class="ph-fill ph-check"></i></span>`;
  if (guestLineEl) guestLineEl.textContent = `محادثة مع: ${guestName}`;
  if (bookingLineEl) bookingLineEl.textContent = bookingId ? `رقم الحجز: #${bookingId.slice(0, 8).toUpperCase()}` : "حجز مباشر";
  if (imageEl) imageEl.src = propertyImage || "images/placeholder.jpg";
  if (statusChipEl) statusChipEl.innerHTML = `<i class="ph ${statusMeta.icon}"></i> ${statusMeta.label}`;
  if (sideGuestName) sideGuestName.textContent = guestName || "—";
  if (sidePhone) sidePhone.textContent = phone || "—";
  if (sideEmail) sideEmail.textContent = email || "—";
  if (sideProperty) sideProperty.textContent = propertyTitle || "—";
  if (sideBooking) sideBooking.textContent = bookingId ? `#${bookingId}` : "—";
}

function renderAdminChatMessages(docs = []) {
  const box = document.getElementById("admin-chat-messages");
  if (!box) return;

  if (!docs.length) {
    box.innerHTML = `
      <div class="admin-chat-empty">
        <i class="ph ph-chat-circle-dots" style="font-size:2.6rem;color:var(--primary);display:block;margin-bottom:10px;"></i>
        لا توجد رسائل بعد. ابدأ أول تواصل مع العميل الآن.
      </div>
    `;
    return;
  }

  box.innerHTML = docs.map(doc => {
    const m = doc.data() || {};
    const isMine = normalizeText(m.senderRole) !== "guest";
    const cls = isMine ? "mine" : "theirs";
    const senderName = normalizeText(m.senderName || (isMine ? getAdminActorName() : CHAT_STATE.currentGuestName) || "مستخدم");
    const timeText = getRelativeTime(m.createdAt);
    const text = normalizeText(m.text || "");
    const imageUrl = normalizeText(m.imageUrl || "");
    const type = normalizeText(m.type || (imageUrl ? "image" : "text"));
    const hasText = !!text;
    const hasImage = !!imageUrl;

    return `
      <div class="admin-chat-message ${cls}">
        <div class="admin-chat-bubble">
          ${hasText ? `<div>${escapeHtml(text).replace(/\n/g, "<br>")}</div>` : ""}
          ${hasImage ? `
            <div style="${hasText ? "margin-top:12px;" : ""}">
              <a href="${escapeHtml(imageUrl)}" target="_blank" rel="noopener noreferrer">
                <img class="admin-chat-image" src="${escapeHtml(imageUrl)}" alt="chat-image" onerror="this.style.display='none'">
              </a>
            </div>` : ""}
          ${!hasText && type === "image" && !hasImage ? `<div>تم إرسال صورة</div>` : ""}
        </div>
        <div class="admin-chat-meta">
          <span>${escapeHtml(senderName)}</span>
          <span>•</span>
          <span>${escapeHtml(timeText)}</span>
        </div>
      </div>
    `;
  }).join("");

  box.scrollTop = box.scrollHeight + 500;
}

async function markChatAsSeenByOwner(chatId) {
  if (!chatId) return;
  const _db = getDb();
  if (!_db) return;
  try {
    await _db.collection(CHATS_COLLECTION).doc(chatId).set({
      unreadCountOwner: 0,
      ownerLastSeenAt: getServerTimestamp(),
      updatedAt: getServerTimestamp()
    }, { merge: true });
  } catch (err) {
    console.warn("markChatAsSeenByOwner:", err);
  }
}

function bindAdminChatStreams(chatId) {
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل — لا يمكن تحميل المحادثة", "error");
    return;
  }

  if (typeof CHAT_STATE.messagesUnsub === "function") {
    try { CHAT_STATE.messagesUnsub(); } catch (_) {}
  }
  if (typeof CHAT_STATE.chatUnsub === "function") {
    try { CHAT_STATE.chatUnsub(); } catch (_) {}
  }

  CHAT_STATE.chatUnsub = _db.collection(CHATS_COLLECTION).doc(chatId).onSnapshot(snap => {
    if (!snap.exists) return;
    const data = snap.data() || {};
    CHAT_STATE.currentBookingStatus = normalizeText(data.status || CHAT_STATE.currentBookingStatus);
    CHAT_STATE.currentPropertyTitle = normalizeText(data.propertyTitle || CHAT_STATE.currentPropertyTitle);
    CHAT_STATE.currentPropertyImage = normalizeText(data.propertyImage || CHAT_STATE.currentPropertyImage);
    CHAT_STATE.currentGuestName = normalizeText(data.guestName || CHAT_STATE.currentGuestName);

    setAdminChatHeader(data);

    const sideUpdated = document.getElementById("admin-chat-side-updated");
    if (sideUpdated) sideUpdated.textContent = data.lastMessageAt ? formatDateTime(data.lastMessageAt) : "—";

    markChatAsSeenByOwner(chatId);
  }, err => {
    console.error("chat snapshot error:", err);
  });

  CHAT_STATE.messagesUnsub = _db.collection(CHATS_COLLECTION).doc(chatId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .onSnapshot(snap => {
      renderAdminChatMessages(snap.docs);
      markChatAsSeenByOwner(chatId);
    }, err => {
      console.error("messages snapshot error:", err);
      showToast(`تعذر تحميل رسائل المحادثة: ${err.message}`, "error");
    });
}

async function openBookingChat(bookingId) {
  ensureAdminChatModal();

  const overlay = document.getElementById("admin-chat-overlay");
  if (overlay) {
    overlay.classList.add("active");
    document.body.classList.add("modal-open");
  }

  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل", "error");
    closeAdminChatModal();
    return;
  }

  try {
    const bookingSnap = await _db.collection(BOOKINGS_COLLECTION).doc(bookingId).get();
    if (!bookingSnap.exists) throw new Error("الحجز غير موجود");

    const bookingData = bookingSnap.data() || {};
    const bookingPropId = getBookingPropertyId(bookingData);

    if (!canAccessProperty(bookingPropId)) {
      throw new Error("غير مسموح لك بفتح محادثة لهذا الحجز");
    }

    const guestId = getBookingGuestId(bookingData);
    const guestName = getBookingGuestName(bookingData);
    const guestEmail = getBookingEmail(bookingData);
    const guestPhone = getBookingPhone(bookingData);
    const propertyTitle = normalizeText(getField(bookingData, FIELD_CANDIDATES.bookingPropertyTitle, getOwnerPropName() || "العقار"));
    let propertyImage = normalizeText(getField(bookingData, FIELD_CANDIDATES.bookingPropertyImage, ""));

    if (!propertyImage && bookingPropId) {
      try {
        const propSnap = await _db.collection(PROPERTIES_COLLECTION).doc(bookingPropId).get();
        if (propSnap.exists) {
          const propData = propSnap.data() || {};
          propertyImage = normalizeText(propData.imageUrl || propData.image || "");
        }
      } catch (_) {}
    }

    CHAT_STATE.currentBookingId = bookingId;
    CHAT_STATE.currentGuestId = guestId;
    CHAT_STATE.currentGuestName = guestName;
    CHAT_STATE.currentPropertyId = bookingPropId;
    CHAT_STATE.currentPropertyTitle = propertyTitle;
    CHAT_STATE.currentPropertyImage = propertyImage;
    CHAT_STATE.currentBookingStatus = normalizeText(bookingData.status || "pending");

    setAdminChatHeader({
      bookingId,
      propertyTitle,
      propertyImage,
      guestName,
      guestEmail,
      guestPhone,
      status: bookingData.status || "pending"
    });

    const chatId = await ensureChatForBooking({
      bookingId,
      bookingData,
      propertyId: bookingPropId,
      propertyTitle,
      propertyImage,
      guestId,
      guestName,
      guestEmail,
      guestPhone
    });

    CHAT_STATE.currentChatId = chatId;
    bindAdminChatStreams(chatId);

    const textarea = document.getElementById("admin-chat-textarea");
    if (textarea) {
      textarea.value = "";
      textarea.focus();
      autoResizeAdminChatTextarea();
    }
    clearAdminChatFilePreview();
  } catch (err) {
    console.error("openBookingChat error:", err);
    showToast(err.message || "تعذر فتح المحادثة", "error");
    closeAdminChatModal();
  }
}

async function uploadToCloudinary(file) {
  const CLOUD_NAME = "dy9bqizhm";
  const UPLOAD_PRESET = "orebooking";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) throw new Error("فشل الاتصال بخادم رفع الصور");
  const data = await res.json();
  if (!data.secure_url) throw new Error("لم يتم استلام رابط الصورة من Cloudinary");
  return data.secure_url;
}

async function sendAdminChatMessage() {
  if (CHAT_STATE.sending) return;
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متصل", "error");
    return;
  }

  const textarea = document.getElementById("admin-chat-textarea");
  const fileInput = document.getElementById("admin-chat-file-input");
  const sendBtn = document.getElementById("admin-chat-send-btn");
  const attachBtn = document.getElementById("admin-chat-attach-btn");

  const text = normalizeText(textarea?.value || "");
  const file = fileInput?.files?.[0] || null;

  if (!CHAT_STATE.currentChatId) {
    showToast("لم يتم تحديد محادثة نشطة", "error");
    return;
  }

  if (!text && !file) {
    showToast("اكتب رسالة أو أرفق صورة أولاً", "error");
    return;
  }

  CHAT_STATE.sending = true;
  if (sendBtn) {
    sendBtn.disabled = true;
    sendBtn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> جاري الإرسال...`;
  }
  if (attachBtn) attachBtn.disabled = true;

  try {
    let imageUrl = "";
    let type = "text";

    if (file) {
      imageUrl = await uploadToCloudinary(file);
      type = text ? "mixed" : "image";
    }

    const msgPayload = {
      bookingId: CHAT_STATE.currentBookingId,
      propertyId: CHAT_STATE.currentPropertyId,
      senderId: getAdminActorId(),
      senderName: getAdminActorName(),
      senderRole: "owner",
      text,
      type,
      imageUrl,
      createdAt: getServerTimestamp(),
      seenByGuest: false,
      seenByOwner: true
    };

    await _db.collection(CHATS_COLLECTION)
      .doc(CHAT_STATE.currentChatId)
      .collection("messages")
      .add(msgPayload);

    await _db.collection(CHATS_COLLECTION).doc(CHAT_STATE.currentChatId).set({
      bookingId: CHAT_STATE.currentBookingId,
      propertyId: CHAT_STATE.currentPropertyId,
      propertyTitle: CHAT_STATE.currentPropertyTitle,
      propertyImage: CHAT_STATE.currentPropertyImage,
      guestId: CHAT_STATE.currentGuestId,
      guestName: CHAT_STATE.currentGuestName,
      ownerId: getAdminActorId(),
      ownerName: getAdminActorName(),
      ownerRole: getSessionRole(),
      verified: true,
      status: CHAT_STATE.currentBookingStatus || "pending",
      lastMessage: text || "تم إرسال صورة",
      lastMessageType: type,
      lastSenderId: getAdminActorId(),
      lastSenderRole: "owner",
      lastMessageAt: getServerTimestamp(),
      unreadCountGuest: getIncrement(1),
      unreadCountOwner: 0,
      ownerLastSeenAt: getServerTimestamp(),
      updatedAt: getServerTimestamp()
    }, { merge: true });

    if (textarea) {
      textarea.value = "";
      autoResizeAdminChatTextarea();
    }
    clearAdminChatFilePreview();
  } catch (err) {
    console.error("sendAdminChatMessage error:", err);
    showToast(`تعذر إرسال الرسالة: ${err.message}`, "error");
  } finally {
    CHAT_STATE.sending = false;
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.innerHTML = `<i class="ph-fill ph-paper-plane-tilt"></i> إرسال`;
    }
    if (attachBtn) attachBtn.disabled = false;
  }
}

async function tryOwnerLogin(username, password) {
  const _db = getDb();
  if (!_db) return { success: false };

  const user = normalizeText(username);
  const pass = normalizeText(password);

  try {
    const snap = await _db.collection(OWNER_ACCOUNTS_COLLECTION)
      .where("username", "==", user)
      .where("password", "==", pass)
      .where("active", "==", true)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0];
      const data = doc.data() || {};
      return {
        success: true,
        accountId: doc.id,
        docId: normalizeText(data.propertyId || ""),
        propName: normalizeText(data.propertyName || "عقار المالك"),
        username: normalizeText(data.username || user)
      };
    }
  } catch (err) {
    console.warn("tryOwnerLogin direct query failed:", err.message);
  }

  try {
    const snap = await _db.collection(OWNER_ACCOUNTS_COLLECTION).get();
    const match = snap.docs.find(doc => {
      const d = doc.data() || {};
      return normalizeText(d.username) === user &&
             normalizeText(d.password) === pass &&
             d.active !== false;
    });

    if (match) {
      const data = match.data() || {};
      return {
        success: true,
        accountId: match.id,
        docId: normalizeText(data.propertyId || ""),
        propName: normalizeText(data.propertyName || "عقار المالك"),
        username: normalizeText(data.username || user)
      };
    }
  } catch (err) {
    console.warn("tryOwnerLogin fallback failed:", err.message);
  }

  return { success: false };
}

function switchTab(tabId) {
  if ((tabId === "add-property" || tabId === "owner-accounts") && !getIsSuperAdmin()) {
    showToast("هذا القسم متاح للمدير العام فقط", "error");
    return;
  }

  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add("active");

  const activeBtn = document.querySelector(`[data-tab-target="${tabId}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  updatePageMeta(tabId);

  if (tabId === "bookings") loadBookings();
  if (tabId === "manage-props") loadProperties();
  if (tabId === "owner-accounts") {
    loadPropertiesForSelect();
    loadOwnerAccounts();
  }
  if (tabId === "add-property") {
    setTimeout(() => {
      if (typeof initAddMap === "function") initAddMap();
    }, 150);
  }

  document.getElementById("admin-sidebar")?.classList.remove("open");
}

function buildBookingCard(doc) {
  const b = doc.data() || {};
  const propertyId = getBookingPropertyId(b);

  if (!getIsSuperAdmin() && !canAccessProperty(propertyId)) {
    return "";
  }

  const propertyTitle = normalizeText(getField(b, FIELD_CANDIDATES.bookingPropertyTitle, "العقار"));
  const propertyImage = normalizeText(getField(b, FIELD_CANDIDATES.bookingPropertyImage, "images/placeholder.jpg"));
  const guestName = getBookingGuestName(b);
  const phone = getBookingPhone(b);
  const email = getBookingEmail(b);
  const ci = formatDate(getBookingCheckIn(b));
  const co = formatDate(getBookingCheckOut(b));
  const totalPrice = toNumber(getField(b, FIELD_CANDIDATES.bookingPrice, 0), 0);
  const nights = toNumber(getField(b, FIELD_CANDIDATES.bookingNights, 0), 0) || 1;
  const statusMeta = getStatusMeta(b.status || "pending");
  const guestsMeta = getBookingGuestsMeta(b);
  const addons = getBookingAddons(b);
  const notes = getBookingNotes(b);
  const receiptUrl = normalizeText(getField(b, FIELD_CANDIDATES.bookingReceipt, ""));
  const createdAt = b.createdAt || b.updatedAt || null;

  const occupancy = `
    <div class="booking-meta-item">
      <label>الضيوف</label>
      <strong>${guestsMeta.guests} ضيف</strong>
      <span>${guestsMeta.adults || 0} بالغ • ${guestsMeta.children || 0} طفل • ${guestsMeta.infants || 0} رضيع</span>
    </div>`;

  const addonsHtml = addons.length ? `
    <div class="booking-meta-item">
      <label>الإضافات</label>
      <strong>${escapeHtml(addons.join("، "))}</strong>
      <span>الخدمات المختارة</span>
    </div>` : "";

  const notesHtml = notes ? `
    <div class="booking-meta-item" style="grid-column:1/-1;">
      <label>ملاحظات</label>
      <strong>${escapeHtml(notes)}</strong>
      <span>تفاصيل إضافية من العميل</span>
    </div>` : "";

  const receipt = receiptUrl
    ? `<a href="${escapeHtml(receiptUrl)}" target="_blank" rel="noopener noreferrer" class="ghost-action" style="min-height:40px;"><i class="ph ph-receipt"></i> إيصال الدفع</a>`
    : `<span class="pill-soft" style="background:#f8fafc;color:var(--text-muted);border:1px solid var(--border-color);"><i class="ph ph-receipt"></i> لا يوجد إيصال</span>`;

  const chatBtn = `
    <button type="button" class="ghost-action" onclick="openBookingChat('${doc.id}')" style="min-height:40px;">
      <i class="ph ph-chat-circle-text"></i> محادثة
    </button>`;

  return `
    <div class="booking-card" data-status="${escapeHtml(normalizeText(b.status || "pending"))}" data-booking-id="${doc.id}">
      <div class="booking-head">
        <div class="booking-title">
          <strong>${escapeHtml(guestName)}</strong>
          <span>${escapeHtml(propertyTitle)} • #${escapeHtml(doc.id.slice(0, 8).toUpperCase())}</span>
        </div>
        <span class="status-badge ${statusMeta.cls}">
          <i class="ph ${statusMeta.icon}"></i> ${escapeHtml(statusMeta.label)}
        </span>
      </div>

      <div style="display:flex; align-items:center; gap:12px;">
        <img src="${escapeHtml(propertyImage || "images/placeholder.jpg")}" alt="${escapeHtml(propertyTitle)}" class="prop-thumb" onerror="this.src='images/placeholder.jpg'">
        <div style="display:grid; gap:4px;">
          <strong style="font-size:.95rem;">${escapeHtml(propertyTitle)}</strong>
          <span style="font-size:.8rem; color:var(--text-muted);">تاريخ الطلب: ${escapeHtml(formatDateTime(createdAt))}</span>
        </div>
      </div>

      <div class="booking-meta-grid">
        <div class="booking-meta-item">
          <label>تاريخ الإقامة</label>
          <strong>${ci} ← ${co}</strong>
          <span>${nights} ليالٍ</span>
        </div>
        ${occupancy}
        <div class="booking-meta-item">
          <label>الهاتف</label>
          <strong dir="ltr">${escapeHtml(phone || "—")}</strong>
          <span>رقم التواصل</span>
        </div>
        <div class="booking-meta-item">
          <label>البريد الإلكتروني</label>
          <strong dir="ltr">${escapeHtml(email || "—")}</strong>
          <span>بيانات العميل</span>
        </div>
        ${addonsHtml}
        ${notesHtml}
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; border-top:1px dashed var(--border-color); padding-top:14px;">
        <div>${receipt}</div>
        <div style="text-align:end;">
          <div style="font-size:.73rem; color:var(--text-muted); font-weight:800;">الإجمالي</div>
          <div style="font-size:1.18rem; color:var(--primary); font-weight:800;">${formatCurrency(totalPrice)}</div>
        </div>
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; margin-top:4px;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          ${chatBtn}
        </div>
      </div>

      ${(b.status || "pending") === "pending" ? `
        <div class="booking-actions-row">
          <button class="btn-approve" onclick="updateBookingStatus('${doc.id}', 'confirmed', this)">
            <i class="ph-fill ph-check-circle"></i> قبول الحجز
          </button>
          <button class="btn-reject" onclick="updateBookingStatus('${doc.id}', 'cancelled', this)">
            <i class="ph-fill ph-x-circle"></i> رفض الحجز
          </button>
        </div>` : ""}
    </div>`;
}

async function loadBookings() {
  const container = DOM.bookingsContainer;
  if (!container) return;
  const _db = getDb();
  if (!_db) {
    renderBookingsEmpty(container, "Firebase غير متصل. تحقق من الإنترنت أو أعد تحميل الصفحة.");
    return;
  }

  container.innerHTML = `
    <div class="empty-state">
      <i class="ph ph-circle-notch ph-spin"></i>
      جارٍ تحميل بيانات الحجوزات...
    </div>`;

  try {
    let snapshot;
    try {
      snapshot = await _db.collection(BOOKINGS_COLLECTION).orderBy("createdAt", "desc").get();
    } catch (orderErr) {
      console.warn("[loadBookings] orderBy failed, fallback to plain get:", orderErr.message);
      snapshot = await _db.collection(BOOKINGS_COLLECTION).get();
    }

    if (snapshot.empty) {
      APP_STATE.bookingDocs = [];
      renderBookingsEmpty(container, "لا توجد طلبات حجز حالياً.");
      return;
    }

    let docs = snapshot.docs;
    if (!getIsSuperAdmin()) {
      docs = docs.filter(doc => canAccessProperty(getBookingPropertyId(doc.data() || {})));
    }

    APP_STATE.bookingDocs = docs;

    const currentFilter = APP_STATE.currentBookingFilter || "all";
    if (currentFilter !== "all") {
      docs = docs.filter(doc => {
        const data = doc.data() || {};
        const status = normalizeText(data.status || "pending");
        if (currentFilter === "rejected") {
          return status === "cancelled" || status === "rejected";
        }
        return status === currentFilter;
      });
    }

    if (!docs.length) {
      renderBookingsEmpty(container, "لا توجد طلبات حجز مرتبطة بهذا العقار.");
      return;
    }

    const cards = docs.map(buildBookingCard).filter(Boolean).join("");
    if (!cards) {
      renderBookingsEmpty(container, "لا توجد طلبات حجز قابلة للعرض حالياً.");
      return;
    }

    container.innerHTML = `<div class="bookings-grid">${cards}</div>`;
    updateQuickStats();
  } catch (err) {
    console.error("[loadBookings] Fatal:", err);
    const isIndexErr = err.code === "failed-precondition" || String(err.message || "").toLowerCase().includes("index");

    if (isIndexErr) {
      container.innerHTML = `
        <div class="empty-state" style="background:#fff7ed;border-color:#fdba74;color:#9a3412;">
          <i class="ph ph-warning"></i>
          <div style="font-weight:800; margin-bottom:8px; color:#9a3412;">هذا الاستعلام يحتاج إلى Index في Firestore</div>
          <div style="font-size:.88rem; line-height:1.8;">افتح الـ Console واضغط على رابط إنشاء الـ Index، ثم أعد تحميل الصفحة.</div>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="empty-state" style="background:#fef2f2;border-color:#fecaca;color:#b91c1c;">
          <i class="ph ph-warning-circle"></i>
          خطأ في تحميل الحجوزات: ${escapeHtml(err.message)}
        </div>`;
    }
    APP_STATE.bookingDocs = [];
    updateQuickStats();
  }
}

window.updateBookingStatus = async function(docId, newStatus, clickedBtn = null) {
  const _db = getDb();
  if (!_db) {
    showToast("Firebase غير متاح داخل الصفحة حالياً.", "error");
    return;
  }

  const isConfirm = newStatus === "confirmed";
  const confirmMsg = isConfirm
    ? "هل أنت متأكد من تأكيد وقبول هذا الحجز؟"
    : "هل أنت متأكد من رفض وإلغاء هذا الحجز؟";

  if (!confirm(confirmMsg)) return;

  const row = clickedBtn?.closest?.(".booking-actions-row") || null;
  const buttons = row ? Array.from(row.querySelectorAll("button")) : [];
  buttons.forEach(btn => { btn.disabled = true; btn.style.opacity = "0.6"; });

  try {
    const bookingRef = _db.collection(BOOKINGS_COLLECTION).doc(docId);
    const snap = await bookingRef.get();

    if (!snap.exists) {
      throw new Error("الحجز غير موجود");
    }

    const bookingData = snap.data() || {};
    const bookingPropId = getBookingPropertyId(bookingData);

    if (!canAccessProperty(bookingPropId)) {
      throw new Error("غير مسموح لك بتحديث هذا الحجز");
    }

    const ts = (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
      ? firebase.firestore.FieldValue.serverTimestamp()
      : new Date();

    await bookingRef.update({
      status: newStatus,
      updatedAt: ts
    });

    showToast(`تم ${isConfirm ? "قبول" : "رفض"} الحجز بنجاح`, "success");
    await loadBookings();
  } catch (err) {
    console.error("[updateBookingStatus]", err);
    showToast(`حدث خطأ أثناء تحديث حالة الحجز: ${err.message}`, "error");
  } finally {
    buttons.forEach(btn => { btn.disabled = false; btn.style.opacity = "1"; });
  }
};

function updateUploadPreview(file) {
  const zoneText = document.querySelector(".upload-zone-text");
  const zoneIcon = document.querySelector(".upload-zone i");
  const previewBox = qs("#upload-preview-box");
  const previewImg = qs("#upload-preview-img");
  const previewName = qs("#upload-preview-name");
  const previewSize = qs("#upload-preview-size");

  if (!file) {
    resetUploadPreview();
    if (DOM.uploadStatus) DOM.uploadStatus.textContent = "";
    return;
  }

  if (zoneText) {
    zoneText.textContent = "✅ " + file.name;
    zoneText.style.color = "var(--primary)";
  }
  if (zoneIcon) zoneIcon.className = "ph-fill ph-check-circle";

  const sizeInMb = (file.size / 1024 / 1024).toFixed(2);
  if (previewName) previewName.textContent = file.name;
  if (previewSize) previewSize.textContent = `الحجم: ${sizeInMb} MB`;
  if (DOM.uploadStatus) DOM.uploadStatus.textContent = "تم اختيار ملف الصورة بنجاح";

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = e => {
      if (previewImg) previewImg.src = e.target.result;
      previewBox?.classList.add("visible");
    };
    reader.readAsDataURL(file);
  } else {
    previewBox?.classList.remove("visible");
  }
}

function resetUploadPreview() {
  const zoneText = document.querySelector(".upload-zone-text");
  const zoneIcon = document.querySelector(".upload-zone i");
  const previewBox = qs("#upload-preview-box");
  const previewImg = qs("#upload-preview-img");
  const previewName = qs("#upload-preview-name");
  const previewSize = qs("#upload-preview-size");

  if (zoneText) {
    zoneText.textContent = "اضغط هنا أو اسحب الصورة";
    zoneText.style.color = "";
  }
  if (zoneIcon) zoneIcon.className = "ph ph-cloud-arrow-up";
  if (previewImg) previewImg.removeAttribute("src");
  if (previewName) previewName.textContent = "معاينة الصورة";
  if (previewSize) previewSize.textContent = "سيظهر اسم وحجم الملف هنا";
  previewBox?.classList.remove("visible");
}

function updateEditUploadPreview(file) {
  const zoneText = qs("#edit-upload-zone-text");
  const previewBox = qs("#edit-upload-preview-box");
  const previewImg = qs("#edit-upload-preview-img");
  const previewName = qs("#edit-upload-preview-name");
  const previewSize = qs("#edit-upload-preview-size");

  if (!file) {
    resetEditUploadPreview();
    return;
  }

  if (zoneText) zoneText.textContent = "✅ " + file.name;

  const sizeInMb = (file.size / 1024 / 1024).toFixed(2);
  if (previewName) previewName.textContent = file.name;
  if (previewSize) previewSize.textContent = `الحجم: ${sizeInMb} MB`;

  if (file.type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = e => {
      if (previewImg) previewImg.src = e.target.result;
      previewBox?.classList.add("visible");
    };
    reader.readAsDataURL(file);
  } else {
    previewBox?.classList.remove("visible");
  }
}

function resetEditUploadPreview() {
  const zoneText = qs("#edit-upload-zone-text");
  const previewBox = qs("#edit-upload-preview-box");
  const previewImg = qs("#edit-upload-preview-img");
  const previewName = qs("#edit-upload-preview-name");
  const previewSize = qs("#edit-upload-preview-size");

  if (zoneText) zoneText.textContent = "اختر صورة جديدة إن أردت استبدال الحالية";
  if (previewImg) previewImg.removeAttribute("src");
  if (previewName) previewName.textContent = "معاينة الصورة الجديدة";
  if (previewSize) previewSize.textContent = "سيظهر اسم وحجم الملف هنا";
  previewBox?.classList.remove("visible");
}

if (DOM.addForm) {
  DOM.addForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    const _db = getDb();
    if (!_db) {
      showToast("Firebase غير متصل — لا يمكن إضافة العقار", "error");
      return;
    }

    if (!getIsSuperAdmin()) {
      showToast("إضافة العقارات متاحة للمدير العام فقط", "error");
      return;
    }

    const latVal = qs("#prop-lat")?.value.trim() || "";
    const lngVal = qs("#prop-lng")?.value.trim() || "";
    const imageFile = qs("#prop-image")?.files?.[0];
    const propType = qs("#prop-type")?.value || "apartment";

    if (!latVal || !lngVal) {
      showToast("يرجى تحديد موقع العقار على الخريطة قبل النشر.", "error");
      return;
    }

    if (!imageFile) {
      showToast("يرجى اختيار الصورة الرئيسية للعقار.", "error");
      return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      showToast("حجم الصورة يتجاوز 5 ميجابايت. اختر صورة أصغر.", "error");
      return;
    }

    setButtonLoading(DOM.submitBtn, true, `<i class="ph ph-circle-notch ph-spin"></i> جاري النشر والرفع...`);

    if (DOM.uploadStatus) {
      DOM.uploadStatus.textContent = "جارٍ رفع الصورة إلى الخادم...";
      DOM.uploadStatus.style.color = "var(--primary)";
    }

    try {
      const imageUrl = await uploadToCloudinary(imageFile);

      if (DOM.uploadStatus) {
        DOM.uploadStatus.textContent = "✅ اكتمل رفع الصورة";
        DOM.uploadStatus.style.color = "#10b981";
      }

      const newProperty = normalizePropertyPayload({
        titleAr: qs("#prop-title-ar")?.value,
        titleEn: qs("#prop-title-en")?.value,
        locationAr: qs("#prop-loc-ar")?.value,
        locationEn: qs("#prop-loc-en")?.value,
        price: qs("#prop-price")?.value,
        type: propType,
        descAr: qs("#prop-desc-ar")?.value,
        descEn: qs("#prop-desc-en")?.value,
        imageUrl,
        lat: latVal,
        lng: lngVal,
        visible: true
      });

      const validationError = validatePropertyPayload(newProperty, { requireImage: true, requireMap: true });
      if (validationError) throw new Error(validationError);

      const ts = (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date();

      await _db.collection(PROPERTIES_COLLECTION).add({
        ...newProperty,
        createdAt: ts,
        updatedAt: ts
      });

      DOM.addForm.reset();
      if (DOM.uploadStatus) DOM.uploadStatus.textContent = "";
      qs("#map-picked-badge")?.classList.remove("visible");
      if (qs("#prop-lat")) qs("#prop-lat").value = "";
      if (qs("#prop-lng")) qs("#prop-lng").value = "";

      resetUploadPreview();
      if (typeof window._resetAddMap === "function") window._resetAddMap();

      showToast("تمت إضافة العقار بنجاح إلى منصة OreBooking", "success");
      switchTab("manage-props");
      await loadProperties();
      await loadPropertiesForSelect();
    } catch (err) {
      console.error("addProperty error:", err);
      showToast(`حدث خطأ أثناء إضافة العقار: ${err.message}`, "error");
      if (DOM.uploadStatus) {
        DOM.uploadStatus.textContent = "❌ فشل الرفع، يرجى المحاولة لاحقاً";
        DOM.uploadStatus.style.color = "#e11d48";
      }
    } finally {
      setButtonLoading(DOM.submitBtn, false, null, `<i class="ph-fill ph-plus-circle"></i> نشر العقار على المنصة`);
    }
  });
}

if (DOM.editModalEl) {
  DOM.editModalEl.addEventListener("click", function(e) {
    if (e.target === this) closeEditModal();
  });
}

if (DOM.editForm) {
  DOM.editForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    const _db = getDb();
    if (!_db) {
      showToast("Firebase غير متصل", "error");
      return;
    }

    const docId = qs("#edit-prop-id")?.value;
    const imageFile = qs("#edit-image")?.files?.[0];

    if (!docId) {
      showToast("معرّف العقار غير صالح", "error");
      return;
    }

    if (!canAccessProperty(docId)) {
      showToast("غير مسموح لك بتعديل هذا العقار", "error");
      return;
    }

    setButtonLoading(DOM.submitEditBtn, true, `<i class="ph ph-circle-notch ph-spin"></i> جارٍ الحفظ...`);

    try {
      const payload = normalizePropertyPayload({
        titleAr: qs("#edit-title-ar")?.value,
        titleEn: qs("#edit-title-en")?.value,
        locationAr: qs("#edit-loc-ar")?.value,
        locationEn: qs("#edit-loc-en")?.value,
        price: qs("#edit-price")?.value,
        descAr: qs("#edit-desc-ar")?.value,
        descEn: qs("#edit-desc-en")?.value,
        type: qs("#edit-type")?.value || "apartment",
        lat: qs("#edit-lat")?.value,
        lng: qs("#edit-lng")?.value
      });

      const validationError = validatePropertyPayload(payload, { requireImage: false, requireMap: true });
      if (validationError) {
        showToast(validationError, "error");
        return;
      }

      const ts = (typeof firebase !== "undefined" && firebase.firestore && firebase.firestore.FieldValue && firebase.firestore.FieldValue.serverTimestamp)
        ? firebase.firestore.FieldValue.serverTimestamp()
        : new Date();

      const updateData = {
        titleAr: payload.titleAr,
        titleEn: payload.titleEn,
        locationAr: payload.locationAr,
        locationEn: payload.locationEn,
        price: payload.price,
        descAr: payload.descAr,
        descEn: payload.descEn,
        type: payload.type,
        lat: payload.lat,
        lng: payload.lng,
        updatedAt: ts
      };

      if (imageFile) {
        if (imageFile.size > 5 * 1024 * 1024) {
          showToast("حجم الصورة الجديدة يتجاوز 5 ميجابايت", "error");
          return;
        }
        updateData.imageUrl = await uploadToCloudinary(imageFile);
      }

      await _db.collection(PROPERTIES_COLLECTION).doc(docId).update(updateData);
      closeEditModal();
      await loadProperties();
      await loadPropertiesForSelect();
      showToast("تم حفظ التعديلات بنجاح", "success");
    } catch (err) {
      console.error("editProperty error:", err);
      showToast(`حدث خطأ أثناء الحفظ: ${err.message}`, "error");
    } finally {
      setButtonLoading(DOM.submitEditBtn, false, null, `حفظ التعديلات <i class="ph ph-floppy-disk"></i>`);
    }
  });
}

if (DOM.ownerAccountForm) {
  DOM.ownerAccountForm.addEventListener("submit", createOwnerAccountFromForm);
}

if (DOM.loginForm) {
  DOM.loginForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    clearLoginMessage();

    const user = qs("#admin-user")?.value.trim() || "";
    const pass = qs("#admin-pass")?.value.trim() || "";

    if (!user || !pass) {
      showLoginMessage("يرجى إدخال اسم المستخدم وكلمة المرور.", "error");
      return;
    }

    setButtonLoading(DOM.loginBtn, true, `<i class="ph ph-circle-notch ph-spin"></i> جارٍ تسجيل الدخول...`);

    try {
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        setAdminSession("superadmin");
        showAdminLayout();
        setNavVisibilityByRole();
        showLoginMessage("تم تسجيل الدخول بنجاح.", "success");
        showToast("تم تسجيل الدخول كمدير عام بنجاح", "success");
        await loadProperties();
        await loadBookings();
        await loadOwnerAccounts();
        await loadPropertiesForSelect();
        return;
      }

      const ownerLogin = await tryOwnerLogin(user, pass);
      if (ownerLogin.success) {
        setAdminSession("owner", ownerLogin.docId, ownerLogin.propName, ownerLogin.accountId, ownerLogin.username);
        showAdminLayout();
        setNavVisibilityByRole();
        showLoginMessage("تم تسجيل الدخول بنجاح.", "success");
        showToast(`تم تسجيل الدخول كمالك: ${ownerLogin.propName}`, "success");
        await loadProperties();
        await loadBookings();
        return;
      }

      showLoginMessage("اسم المستخدم أو كلمة المرور غير صحيحة", "error");
    } catch (err) {
      console.error("login error:", err);
      showLoginMessage("تعذر تسجيل الدخول حالياً، حاول مرة أخرى.", "error");
    } finally {
      setButtonLoading(DOM.loginBtn, false, null, `<i class="ph ph-sign-in"></i> تسجيل الدخول`);
    }
  });
}

function bindSearch() {
  if (!DOM.propertySearchInput || DOM.propertySearchInput.dataset.bound) return;
  DOM.propertySearchInput.dataset.bound = "1";

  DOM.propertySearchInput.addEventListener("input", function() {
    APP_STATE.currentPropertyFilter = this.value || "";
    renderPropertiesTable(getFilteredPropertyDocs());
  });
}

function bindStaticButtons() {
  if (DOM.logoutBtn && !DOM.logoutBtn.dataset.bound) {
    DOM.logoutBtn.dataset.bound = "1";
    DOM.logoutBtn.addEventListener("click", () => {
      if (!confirm("هل تريد تسجيل الخروج من لوحة التحكم؟")) return;
      clearAdminSession();
      showToast("تم تسجيل الخروج بنجاح", "success");
      setTimeout(() => window.location.reload(), 350);
    });
  }

  if (DOM.refreshOwnerAccountsBtn && !DOM.refreshOwnerAccountsBtn.dataset.bound) {
    DOM.refreshOwnerAccountsBtn.dataset.bound = "1";
    DOM.refreshOwnerAccountsBtn.addEventListener("click", async () => {
      await loadOwnerAccounts();
      await loadPropertiesForSelect();
    });
  }

  if (DOM.refreshPropertiesBtn && !DOM.refreshPropertiesBtn.dataset.bound) {
    DOM.refreshPropertiesBtn.dataset.bound = "1";
    DOM.refreshPropertiesBtn.addEventListener("click", async () => {
      await loadProperties();
      if (getIsSuperAdmin()) await loadPropertiesForSelect();
    });
  }

  if (DOM.refreshBookingsBtn && !DOM.refreshBookingsBtn.dataset.bound) {
    DOM.refreshBookingsBtn.dataset.bound = "1";
    DOM.refreshBookingsBtn.addEventListener("click", async () => {
      await loadBookings();
    });
  }

  document.querySelectorAll("[data-tab-target]").forEach(btn => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => switchTab(btn.dataset.tabTarget));
  });

  qs("#close-edit-modal-btn")?.addEventListener("click", closeEditModal);

  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
      const overlay = document.getElementById("admin-chat-overlay");
      if (overlay?.classList.contains("active")) {
        closeAdminChatModal();
        return;
      }
      closeEditModal();
      document.getElementById("admin-sidebar")?.classList.remove("open");
    }
  });
}

function initUploadHooks() {
  const addImageInput = qs("#prop-image");
  if (addImageInput && !addImageInput.dataset.bound) {
    addImageInput.dataset.bound = "1";
    addImageInput.addEventListener("change", function() {
      updateUploadPreview(this.files?.[0] || null);
    });
  }

  const editImageInput = qs("#edit-image");
  if (editImageInput && !editImageInput.dataset.bound) {
    editImageInput.dataset.bound = "1";
    editImageInput.addEventListener("change", function() {
      updateEditUploadPreview(this.files?.[0] || null);
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  ensureAdminChatModal();
  bindSearch();
  initializeBookingFilters();
  bindStaticButtons();
  initUploadHooks();

  const hasSession = (!!localStorage.getItem(SESSION_KEYS.role) || !!localStorage.getItem(SESSION_KEYS.ownerPropId)) && ensureValidSession();

  if (hasSession) {
    showAdminLayout();
    setNavVisibilityByRole();
    await loadProperties();
    await loadBookings();
    if (getIsSuperAdmin()) {
      await loadOwnerAccounts();
      await loadPropertiesForSelect();
    }
  } else {
    clearAdminSession();
    showLoginLayout();
  }

  updatePageMeta("manage-props");
  updateQuickStats();
});

window.fetchProperties = loadProperties;
window.loadProperties = loadProperties;
window.loadBookings = loadBookings;
window.loadOwnerAccounts = loadOwnerAccounts;
window.loadPropertiesForSelect = loadPropertiesForSelect;
window.switchTab = switchTab;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteProperty = deleteProperty;
window.deleteOwnerAccount = deleteOwnerAccount;
window.toggleOwnerAccount = toggleOwnerAccount;
window.toggleVisibility = toggleVisibility;
window.updateAdminQuickStats = updateQuickStats;
window.adminLogout = clearAdminSession;
window.openBookingChat = openBookingChat;
window.buildChatId = buildChatId;
window.getIsSuperAdmin = getIsSuperAdmin;
window.getOwnerPropId = getOwnerPropId;
window.getOwnerPropName = getOwnerPropName;
window.getSessionRole = getSessionRole;
window.getAdminActorId = getAdminActorId;
window.getAdminActorName = getAdminActorName;
window.normalizeText = normalizeText;
window.escapeHtml = escapeHtml;
window.toNumber = toNumber;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.getRelativeTime = getRelativeTime;
window.getStatusMeta = getStatusMeta;
window.getBookingPropertyId = getBookingPropertyId;
window.getBookingGuestId = getBookingGuestId;
window.getBookingGuestName = getBookingGuestName;
window.getBookingPhone = getBookingPhone;
window.getBookingEmail = getBookingEmail;
window.getBookingCheckIn = getBookingCheckIn;
window.getBookingCheckOut = getBookingCheckOut;
window.getBookingNotes = getBookingNotes;
window.getBookingAddons = getBookingAddons;
window.getBookingGuestsMeta = getBookingGuestsMeta;
window.uploadToCloudinary = uploadToCloudinary;
window.resetUploadPreview = resetUploadPreview;
window.resetEditUploadPreview = resetEditUploadPreview;
