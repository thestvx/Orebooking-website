// OreBooking Admin Panel Logic - Complete Replacement
(function () {
  "use strict";

  const g = typeof globalThis !== "undefined" ? globalThis : window;
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

  const APP_STATE = {
    propertiesDocs: [],
    ownerAccountDocs: [],
    bookingDocs: [],
    currentPropertyFilter: "",
    currentBookingFilter: "all"
  };

  const BOOKING_STATUS_LOCKS = g.BOOKING_STATUS_LOCKS instanceof Set ? g.BOOKING_STATUS_LOCKS : new Set();

  function qs(selector, root = document) { return root.querySelector(selector); }
  function qsa(selector, root = document) { return Array.from(root.querySelectorAll(selector)); }
  function normalizeText(value) { return String(value ?? "").trim(); }
  function escapeHtml(value) { return String(value ?? "").replace(/[&<>"]'/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[s])); }
  function toNumber(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
  function safeDateMs(value) { try { if (!value) return 0; if (typeof value?.toDate === "function") return value.toDate().getTime(); const d = new Date(value); return Number.isNaN(d.getTime()) ? 0 : d.getTime(); } catch (_) { return 0; } }
  function formatDate(value) { if (!value) return "—"; if (typeof value === "string") return value; if (typeof value?.toDate === "function") return value.toDate().toLocaleDateString("ar-DZ"); const d = new Date(value); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-DZ"); }
  function formatDateTime(value) { if (!value) return "—"; const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value); if (Number.isNaN(d.getTime())) return "—"; return `${d.toLocaleDateString("ar-DZ")} ${d.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`; }
  function formatCurrency(value) { return `${Number(value || 0).toLocaleString("en-US")} DZD`; }
  function getField(data, candidates = [], fallback = "") { for (const key of candidates) { if (data?.[key] !== undefined && data?.[key] !== null && String(data[key]).trim() !== "") return data[key]; } return fallback; }

  function getDb() {
    if (typeof g.getDB === "function") { try { const db = g.getDB(); if (db) return db; } catch (_) {} }
    if (g.__db) return g.__db;
    try { if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length > 0) return firebase.firestore(); } catch (_) {}
    return null;
  }

  function getFirebase() {
    if (typeof g.firebase !== "undefined" && g.firebase) return g.firebase;
    try { if (typeof firebase !== "undefined") return firebase; } catch (_) {}
    return null;
  }

  function serverTimestamp() {
    const fb = getFirebase();
    return fb?.firestore?.FieldValue?.serverTimestamp ? fb.firestore.FieldValue.serverTimestamp() : new Date();
  }

  function showToast(message, type = "success") {
    let host = document.getElementById("admin-toast-host");
    if (!host) return alert(message);
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
    setTimeout(() => { toast.style.transition = "all .25s ease"; toast.style.opacity = "0"; toast.style.transform = "translateY(-6px)"; setTimeout(() => toast.remove(), 250); }, 3500);
  }

  function getIsSuperAdmin() { return !localStorage.getItem(SESSION_KEYS.ownerPropId); }
  function getOwnerPropId() { return normalizeText(localStorage.getItem(SESSION_KEYS.ownerPropId) || ""); }
  function getOwnerPropName() { return normalizeText(localStorage.getItem(SESSION_KEYS.ownerPropName) || ""); }
  function getOwnerAccountId() { return normalizeText(localStorage.getItem(SESSION_KEYS.ownerAccountId) || ""); }
  function getOwnerUsername() { return normalizeText(localStorage.getItem(SESSION_KEYS.ownerUsername) || ""); }
  function getSessionRole() { return normalizeText(localStorage.getItem(SESSION_KEYS.role) || "") || (getIsSuperAdmin() ? "superadmin" : "owner"); }
  function getAdminActorId() { return getIsSuperAdmin() ? "superadmin" : (getOwnerAccountId() || getOwnerPropId()); }
  function getAdminActorName() { return getIsSuperAdmin() ? "إدارة OreBooking" : (getOwnerPropName() || "صاحب العقار"); }

  function clearAdminSession() { Object.values(SESSION_KEYS).forEach(key => localStorage.removeItem(key)); }
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
  function ensureValidSession() { const loginAt = Number(localStorage.getItem(SESSION_KEYS.loginAt) || 0); if (!loginAt) return false; if (Date.now() - loginAt > SESSION_MAX_AGE_MS) { clearAdminSession(); return false; } return true; }

  const DOM = {
    loginScreen: qs("#admin-login-screen"),
    adminLayout: qs("#admin-layout"),
    loginForm: qs("#admin-login-form"),
    loginBtn: qs("#admin-login-btn"),
    loginMessage: qs("#admin-login-message"),
    firebaseBanner: qs("#firebase-status-banner"),
    addForm: qs("#add-property-form"),
    submitBtn: qs("#submit-prop-btn"),
    uploadStatus: qs("#upload-status"),
    editForm: qs("#edit-property-form"),
    submitEditBtn: qs("#submit-edit-btn"),
    editModal: qs("#edit-modal"),
    pageTitle: qs("#page-title"),
    pageSubtitle: qs("#page-subtitle"),
    adminProfileName: qs("#admin-profile-name"),
    adminProfileRole: qs("#admin-profile-role"),
    propertiesTbody: qs("#properties-tbody"),
    bookingsContainer: qs("#bookings-container"),
    ownerAccountsTbody: qs("#owner-accounts-tbody"),
    ownerAccountForm: qs("#owner-account-form"),
    ownerPropertySelect: qs("#owner-property-id"),
    propertySearchInput: qs("#property-search-input"),
    refreshPropertiesBtn: qs("#refresh-properties-btn"),
    refreshBookingsBtn: qs("#refresh-bookings-btn"),
    refreshOwnerAccountsBtn: qs("#refresh-owner-accounts-btn"),
    logoutBtn: qs("#admin-logout-btn")
  };

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
    if (badge) badge.textContent = getIsSuperAdmin() ? "وضع المدير العام" : `وضع المالك${getOwnerPropName() ? ` — ${getOwnerPropName()}` : ""}${getOwnerUsername() ? ` • ${getOwnerUsername()}` : ""}${getOwnerPropId() ? ` (${getOwnerPropId()})` : ""}`;
  }

  function updatePageMeta(tabId) {
    const meta = PAGE_META[tabId] || PAGE_META["manage-props"];
    if (DOM.pageTitle) DOM.pageTitle.textContent = meta.title;
    if (DOM.pageSubtitle) DOM.pageSubtitle.textContent = meta.subtitle;
    updateAdminHeaderForRole();
  }

  function showAdminLayout() { if (DOM.loginScreen) DOM.loginScreen.style.display = "none"; if (DOM.adminLayout) DOM.adminLayout.style.display = "flex"; updateAdminHeaderForRole(); }
  function showLoginLayout() { if (DOM.loginScreen) DOM.loginScreen.style.display = "grid"; if (DOM.adminLayout) DOM.adminLayout.style.display = "none"; }

  function showLoginMessage(message, type = "error") {
    if (!DOM.loginMessage) return;
    const iconMap = { error: "ph-warning-circle", success: "ph-check-circle", info: "ph-info" };
    DOM.loginMessage.className = `login-message ${type} show`;
    DOM.loginMessage.innerHTML = `<i class="ph ${iconMap[type] || iconMap.info}"></i><span>${escapeHtml(message)}</span>`;
  }
  function clearLoginMessage() { if (!DOM.loginMessage) return; DOM.loginMessage.className = "login-message"; DOM.loginMessage.innerHTML = ""; }

  function canAccessProperty(propertyId) { return getIsSuperAdmin() || normalizeText(propertyId) === getOwnerPropId(); }
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

  function switchTab(tabId) {
    qsa('.sidebar-nav .nav-item[data-tab-target]').forEach(btn => btn.classList.toggle('active', btn.dataset.tabTarget === tabId));
    qsa('.tab-pane').forEach(p => p.classList.remove('active'));
    const activePane = document.getElementById('tab-' + tabId);
    if (activePane) activePane.classList.add('active');
    updatePageMeta(tabId);
  }
  g.switchTab = switchTab;

  function getPropertyTypeLabel(type) { return ({ apartment: 'شقة', villa: 'فيلا', resort: 'منتجع', pool: 'مسبح' }[type] || 'عقار'); }
  function normalizePropertyPayload(source = {}) { return { titleAr: normalizeText(source.titleAr || source.titlear), titleEn: normalizeText(source.titleEn || source.titleen), locationAr: normalizeText(source.locationAr || source.locationar), locationEn: normalizeText(source.locationEn || source.locationen), price: toNumber(source.price, 0), type: normalizeText(source.type || 'apartment'), descAr: normalizeText(source.descAr || source.descar), descEn: normalizeText(source.descEn || source.descen), imageUrl: normalizeText(source.imageUrl || source.image || ''), lat: source.lat !== undefined && source.lat !== null && source.lat !== '' ? parseFloat(source.lat) : null, lng: source.lng !== undefined && source.lng !== null && source.lng !== '' ? parseFloat(source.lng) : null, visible: source.visible !== false }; }
  function validatePropertyPayload(payload, { requireImage = false, requireMap = true } = {}) { if (!payload.titleAr) return 'يرجى إدخال اسم العقار بالعربية.'; if (!payload.titleEn) return 'يرجى إدخال اسم العقار بالإنجليزية.'; if (!payload.descAr) return 'يرجى إدخال وصف العقار بالعربية.'; if (!payload.descEn) return 'يرجى إدخال وصف العقار بالإنجليزية.'; if (!payload.locationAr) return 'يرجى إدخال موقع العقار بالعربية.'; if (!payload.locationEn) return 'يرجى إدخال موقع العقار بالإنجليزية.'; if (!payload.price || payload.price <= 0) return 'يرجى إدخال سعر صحيح أكبر من 0.'; if (requireMap && (!Number.isFinite(payload.lat) || !Number.isFinite(payload.lng))) return 'يرجى تحديد موقع صحيح للعقار على الخريطة.'; if (requireImage && !payload.imageUrl) return 'الصورة الرئيسية للعقار مطلوبة.'; return ''; }
  function normalizeOwnerAccountPayload(source = {}) { return { fullName: normalizeText(source.fullName || source.name), username: normalizeText(source.username), password: normalizeText(source.password), propertyId: normalizeText(source.propertyId || source.propId), propertyName: normalizeText(source.propertyName || source.propName), role: 'owner', active: source.active !== false }; }
  function validateOwnerAccountPayload(payload) { if (!payload.fullName) return 'يرجى إدخال اسم صاحب العقار.'; if (!payload.propertyId) return 'يرجى اختيار العقار المرتبط بالحساب.'; if (!payload.username) return 'يرجى إدخال اسم المستخدم.'; if (!payload.password) return 'يرجى إدخال كلمة المرور.'; if (payload.username.length < 3) return 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل.'; if (payload.password.length < 3) return 'كلمة المرور يجب أن تكون 3 أحرف على الأقل.'; return ''; }

  function getBookingPropertyId(data = {}) { return normalizeText(getField(data, FIELD_CANDIDATES.bookingPropertyId, '')); }
  function getBookingGuestId(data = {}) { return normalizeText(getField(data, FIELD_CANDIDATES.bookingGuestId, '')); }
  function getBookingGuestName(data = {}) { const direct = normalizeText(getField(data, FIELD_CANDIDATES.bookingGuestName, '')); if (direct) return direct; const first = normalizeText(data.guestNameFirst || data.firstName || data.givenName || ''); const father = normalizeText(data.guestFatherName || data.fatherName || ''); const family = normalizeText(data.guestFamilyName || data.lastName || data.familyName || ''); return [first, father, family].filter(Boolean).join(' ').trim() || 'غير معروف'; }
  function getBookingPhone(data = {}) { return normalizeText(getField(data, FIELD_CANDIDATES.bookingPhone, '—')); }
  function getBookingEmail(data = {}) { return normalizeText(getField(data, FIELD_CANDIDATES.bookingEmail, '—')); }
  function getBookingCheckIn(data = {}) { return getField(data, FIELD_CANDIDATES.bookingCheckIn, null); }
  function getBookingCheckOut(data = {}) { return getField(data, FIELD_CANDIDATES.bookingCheckOut, null); }
  function getBookingNotes(data = {}) { const special = normalizeText(getField(data, ['specialRequests', 'notes', 'addonNotes', 'medicalNotes'], '')); const arrival = normalizeText(getField(data, ['arrivalTime', 'arrival_time', 'expectedArrivalTime'], '')); const additionalGuests = normalizeText(getField(data, ['additionalGuests', 'additionalGuestNames'], '')); const bits = []; if (arrival) bits.push(`وقت الوصول: ${arrival}`); if (special) bits.push(`ملاحظات: ${special}`); if (additionalGuests) bits.push(`أسماء إضافية: ${additionalGuests}`); return bits.join(' — '); }
  function getBookingAddons(data = {}) { const addOnLabels = { restaurant: 'المطعم', wifi: 'إنترنت عالي السرعة', spa: 'جلسة سبا', parking: 'موقف سيارات', airportTransfer: 'نقل المطار', lateCheckout: 'تسجيل خروج متأخر', extraBed: 'سرير إضافي', events: 'تنسيق فعاليات', breakfast: 'فطور', breakfastIncluded: 'فطور', babyCrib: 'سرير أطفال', highChair: 'كرسي أطفال', accessibleRoom: 'غرفة مهيأة', earlyCheckin: 'دخول مبكر' }; let addons = []; if (Array.isArray(data.selectedAddons)) addons = data.selectedAddons; else if (data.addons && typeof data.addons === 'object') addons = Object.keys(data.addons).filter(key => data.addons[key] === true); else { const derived = []; if (String(data.breakfastOption || '').toLowerCase() === 'yes') derived.push('breakfast'); if (String(data.airportTransfer || '').toLowerCase() !== 'no' && String(data.airportTransfer || '').trim()) derived.push('airportTransfer'); if (String(data.parkingNeeded || '').toLowerCase() !== 'no' && String(data.parkingNeeded || '').trim()) derived.push('parking'); if (String(data.lateCheckout || '').toLowerCase() === 'yes') derived.push('lateCheckout'); if (String(data.earlyCheckin || '').toLowerCase() === 'yes') derived.push('earlyCheckin'); if (String(data.babyCrib || '').toLowerCase() === 'yes') derived.push('babyCrib'); if (String(data.highChair || '').toLowerCase() === 'yes') derived.push('highChair'); if (String(data.accessibleRoom || '').toLowerCase() !== 'no' && String(data.accessibleRoom || '').trim()) derived.push('accessibleRoom'); addons = derived; } return addons.map(a => a === 'restaurant' && data.restaurantPlan ? `${addOnLabels[a] || a} (${data.restaurantPlan})` : (addOnLabels[a] || a)); }
  function getBookingGuestsMeta(data = {}) { const adults = toNumber(getField(data, ['adults', 'guestAdults'], 0), 0); const children = toNumber(getField(data, ['children', 'guestChildren'], 0), 0); const infants = toNumber(getField(data, ['infants', 'guestInfants'], 0), 0); const rooms = toNumber(getField(data, ['rooms', 'roomCount'], 0), 0); const guests = toNumber(getField(data, ['guests', 'guestCount'], adults + children + infants || 1), 1); return { adults, children, infants, rooms, guests }; }

  function setButtonLoading(btn, loading, htmlWhenLoading, htmlWhenIdle) { if (!btn) return; if (loading) { btn.disabled = true; if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML; btn.innerHTML = htmlWhenLoading; } else { btn.disabled = false; btn.innerHTML = htmlWhenIdle || btn.dataset.originalHtml || btn.innerHTML; } }
  function renderPropertiesEmpty(message, isError = false) { if (!DOM.propertiesTbody) return; DOM.propertiesTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:36px; color:${isError ? '#e11d48' : 'var(--text-muted)'};"><i class="ph ${isError ? 'ph-warning-circle' : 'ph-house-line'}" style="font-size:2rem; display:block; margin-bottom:10px;"></i>${escapeHtml(message)}</td></tr>`; updateQuickStats(); }
  function renderOwnerAccountsEmpty(message, isError = false) { if (!DOM.ownerAccountsTbody) return; DOM.ownerAccountsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:36px; color:${isError ? '#e11d48' : 'var(--text-muted)'};"><i class="ph ${isError ? 'ph-warning-circle' : 'ph-users-three'}" style="font-size:2rem; display:block; margin-bottom:10px;"></i>${escapeHtml(message)}</td></tr>`; updateQuickStats(); }
  function renderBookingsEmpty(container, message, extraHtml = '') { if (!container) return; container.innerHTML = `<div class="empty-state"><i class="ph ph-calendar-blank"></i><div style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:8px;">${escapeHtml(message)}</div>${extraHtml}</div>`; updateQuickStats(); }

  function getFilteredPropertyDocs() { const term = normalizeText(APP_STATE.currentPropertyFilter).toLowerCase(); if (!term) return [...APP_STATE.propertiesDocs]; return APP_STATE.propertiesDocs.filter(doc => { const p = normalizePropertyPayload(doc.data() || {}); const haystack = [doc.id, p.titleAr, p.titleEn, p.locationAr, p.locationEn, p.descAr, p.descEn, getPropertyTypeLabel(p.type)].join(' ').toLowerCase(); return haystack.includes(term); }); }

  function updateQuickStats() {
    const filteredProps = getFilteredPropertyDocs();
    const visibleProps = filteredProps.filter(doc => { const p = normalizePropertyPayload(doc.data() || {}); return p.visible !== false; });
    const totalProperties = filteredProps.length;
    const activeProperties = visibleProps.length;
    const totalOwnerAccounts = APP_STATE.ownerAccountDocs.length;
    const totalBookings = APP_STATE.bookingDocs.length;
    const map = { 'stat-total-properties': totalProperties, 'stat-active-properties': activeProperties, 'stat-total-bookings': totalBookings, 'stat-owner-accounts': totalOwnerAccounts };
    Object.entries(map).forEach(([id, val]) => { const el = document.getElementById(id); if (el) el.textContent = String(val); });
    updateBookingCounters();
  }

  function updateBookingCounters() {
    const counts = { all: APP_STATE.bookingDocs.length, pending: 0, confirmed: 0, rejected: 0 };
    APP_STATE.bookingDocs.forEach(doc => { const status = normalizeText(doc.data()?.status || 'pending'); if (status === 'confirmed') counts.confirmed++; else if (status === 'rejected' || status === 'cancelled') counts.rejected++; else counts.pending++; });
    const ids = { all: 'booking-count-all', pending: 'booking-count-pending', confirmed: 'booking-count-confirmed', rejected: 'booking-count-rejected' };
    Object.entries(ids).forEach(([k, id]) => { const el = document.getElementById(id); if (el) el.textContent = String(counts[k]); });
  }

  function renderPropertiesTable(docsArray) {
    if (!DOM.propertiesTbody) return;
    const visibleDocs = docsArray.filter(doc => getIsSuperAdmin() ? true : doc.id === getOwnerPropId());
    if (!visibleDocs.length) { renderPropertiesEmpty('لا توجد نتائج مطابقة حالياً.'); return; }
    DOM.propertiesTbody.innerHTML = '';
    visibleDocs.forEach(doc => {
      const p = normalizePropertyPayload(doc.data() || {});
      const isVisible = p.visible !== false;
      const hasLoc = Number.isFinite(p.lat) && Number.isFinite(p.lng);
      const tr = document.createElement('tr');
      tr.dataset.propId = doc.id;
      tr.dataset.visible = String(isVisible);
      tr.innerHTML = `
        <td><img class="prop-thumb" src="${escapeHtml(p.imageUrl || 'images/placeholder.jpg')}" alt="${escapeHtml(p.titleAr || 'Property')}" onerror="this.src='images/placeholder.jpg'"></td>
        <td><div class="prop-name-cell"><strong>${escapeHtml(p.titleAr || '—')}</strong><span>${escapeHtml(p.titleEn || '')}</span><span class="pill-soft" style="width:max-content;background:rgba(67,90,191,.08);color:var(--primary);border:1px solid rgba(67,90,191,.1);">${escapeHtml(getPropertyTypeLabel(p.type))}</span></div></td>
        <td><div style="display:grid; gap:8px;"><div style="font-weight:600;">${escapeHtml(p.locationAr || '—')}</div><div>${hasLoc ? '<span class="pill-soft" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;"><i class="ph-fill ph-map-pin"></i> موقع محدد</span>' : '<span class="pill-soft" style="background:#f8fafc;color:var(--text-muted);border:1px solid var(--border-color);"><i class="ph ph-map-pin-slash"></i> بدون خريطة</span>'}</div></div></td>
        <td><span class="price-pill">${formatCurrency(p.price)}</span></td>
        <td><div style="display:grid; gap:10px;"><span class="status-badge ${isVisible ? 'visible' : 'hidden'}"><i class="ph ${isVisible ? 'ph-eye' : 'ph-eye-slash'}"></i> ${isVisible ? 'ظاهر' : 'مخفي'}</span><label class="switch" style="width:max-content;"><input type="checkbox" ${isVisible ? 'checked' : ''} onchange="toggleVisibility('${doc.id}', this.checked, this)"><span class="slider round"></span></label></div></td>
        <td><div class="table-actions"><button type="button" onclick="window.open('property.html?id=${doc.id}','_blank')"><i class="ph ph-eye"></i> معاينة</button><button type="button" onclick="openEditModal('${doc.id}')"><i class="ph ph-pencil-simple"></i> تعديل</button>${getIsSuperAdmin() ? `<button type="button" onclick="deleteProperty('${doc.id}')" style="color:#e11d48;"><i class="ph ph-trash"></i> حذف</button>` : ''}</div></td>
      `;
      DOM.propertiesTbody.appendChild(tr);
    });
    updateQuickStats();
  }

  async function loadProperties() {
    if (!DOM.propertiesTbody) return;
    const db = getDb();
    if (!db) { renderPropertiesEmpty('Firebase غير متصل. تحقق من الإنترنت أو أعد تحميل الصفحة.', true); return; }
    DOM.propertiesTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:36px; color:var(--text-muted);"><i class="ph ph-circle-notch ph-spin" style="font-size:2rem; display:block; margin-bottom:10px;"></i>جارٍ تحميل العقارات...</td></tr>`;
    try {
      if (!getIsSuperAdmin()) {
        const ownerPropId = getOwnerPropId();
        if (!ownerPropId) { APP_STATE.propertiesDocs = []; renderPropertiesEmpty('لم يتم العثور على معرّف العقار الخاص بهذا المالك.', true); return; }
        const doc = await db.collection(PROPERTIES_COLLECTION).doc(ownerPropId).get();
        if (!doc.exists) { APP_STATE.propertiesDocs = []; renderPropertiesEmpty('عقارك غير موجود أو تم حذفه.'); return; }
        APP_STATE.propertiesDocs = [doc];
        renderPropertiesTable(getFilteredPropertyDocs());
        return;
      }
      let snapshot;
      try { snapshot = await db.collection(PROPERTIES_COLLECTION).orderBy('createdAt', 'desc').get(); }
      catch (_) { snapshot = await db.collection(PROPERTIES_COLLECTION).get(); }
      if (snapshot.empty) { APP_STATE.propertiesDocs = []; renderPropertiesEmpty('لا توجد عقارات مضافة بعد.'); return; }
      APP_STATE.propertiesDocs = snapshot.docs;
      renderPropertiesTable(getFilteredPropertyDocs());
      await loadPropertiesForSelect();
    } catch (err) { console.error('loadProperties error:', err); APP_STATE.propertiesDocs = []; renderPropertiesEmpty(`حدث خطأ أثناء تحميل العقارات: ${err.message}`, true); }
  }

  async function toggleVisibility(docId, isVisible, checkboxEl) {
    const db = getDb();
    if (!db) { showToast('Firebase غير متصل حالياً', 'error'); if (checkboxEl) checkboxEl.checked = !isVisible; return; }
    try {
      if (checkboxEl) checkboxEl.disabled = true;
      if (!canAccessProperty(docId)) throw new Error('غير مسموح لك بتعديل هذا العقار');
      await db.collection(PROPERTIES_COLLECTION).doc(docId).update({ visible: isVisible, updatedAt: serverTimestamp() });
      showToast(`تم ${isVisible ? 'إظهار' : 'إخفاء'} العقار بنجاح`, 'success');
      await loadProperties();
    } catch (err) { console.error('toggleVisibility error:', err); if (checkboxEl) checkboxEl.checked = !isVisible; showToast(err.message || 'حدث خطأ أثناء تحديث حالة الظهور', 'error'); }
    finally { if (checkboxEl) checkboxEl.disabled = false; }
  }
  g.toggleVisibility = toggleVisibility;

  async function deleteProperty(docId) {
    if (!getIsSuperAdmin()) { showToast('غير مسموح لك بحذف العقار من هذه الجلسة', 'error'); return; }
    const db = getDb();
    if (!db) { showToast('Firebase غير متصل', 'error'); return; }
    if (!confirm('هل أنت متأكد من حذف هذا العقار نهائياً؟')) return;
    try { await db.collection(PROPERTIES_COLLECTION).doc(docId).delete(); showToast('تم حذف العقار بنجاح', 'success'); await loadProperties(); await loadPropertiesForSelect(); }
    catch (err) { console.error('deleteProperty error:', err); showToast(`تعذر حذف العقار: ${err.message}`, 'error'); }
  }
  g.deleteProperty = deleteProperty;

  async function openEditModal(docId) {
    const db = getDb();
    const editModal = document.getElementById('edit-modal');
    if (!editModal || !db) return;
    try {
      if (!canAccessProperty(docId)) { showToast('غير مسموح لك بتعديل هذا العقار', 'error'); return; }
      const doc = await db.collection(PROPERTIES_COLLECTION).doc(docId).get();
      if (!doc.exists) { showToast('العقار غير موجود', 'error'); return; }
      const p = normalizePropertyPayload(doc.data() || {});
      qs('#edit-prop-id').value = docId;
      qs('#edit-title-ar').value = p.titleAr || '';
      qs('#edit-title-en').value = p.titleEn || '';
      qs('#edit-price').value = p.price || '';
      qs('#edit-desc-ar').value = p.descAr || '';
      qs('#edit-desc-en').value = p.descEn || '';
      qs('#edit-loc-ar').value = p.locationAr || '';
      qs('#edit-loc-en').value = p.locationEn || '';
      qs('#edit-type').value = p.type || 'apartment';
      qs('#edit-lat').value = Number.isFinite(p.lat) ? parseFloat(p.lat) : '';
      qs('#edit-lng').value = Number.isFinite(p.lng) ? parseFloat(p.lng) : '';
      const badge = qs('#edit-map-picked-badge'); if (badge) badge.classList.toggle('visible', !!(Number.isFinite(p.lat) && Number.isFinite(p.lng)));
      const fileInput = qs('#edit-image'); if (fileInput) fileInput.value = '';
      if (typeof g.resetEditUploadPreview === 'function') g.resetEditUploadPreview();
      editModal.classList.add('active'); document.body.classList.add('modal-open');
      if (typeof window.initEditMapFromAdmin === 'function') window.initEditMapFromAdmin(p.lat, p.lng);
    } catch (err) { console.error('openEditModal error:', err); showToast('تعذر تحميل بيانات العقار من السيرفر', 'error'); }
  }
  g.openEditModal = openEditModal;
  function closeEditModal() { const editModal = document.getElementById('edit-modal'); if (editModal) editModal.classList.remove('active'); document.body.classList.remove('modal-open'); }
  g.closeEditModal = closeEditModal;

  async function loadPropertiesForSelect() {
    if (!DOM.ownerPropertySelect) return;
    const db = getDb();
    if (!db) { DOM.ownerPropertySelect.innerHTML = `<option value="">Firebase غير متصل</option>`; return; }
    const previous = DOM.ownerPropertySelect.value;
    DOM.ownerPropertySelect.innerHTML = `<option value="">جارٍ تحميل العقارات...</option>`;
    try {
      const snapshot = await db.collection(PROPERTIES_COLLECTION).get();
      if (snapshot.empty) { DOM.ownerPropertySelect.innerHTML = `<option value="">لا توجد عقارات</option>`; return; }
      DOM.ownerPropertySelect.innerHTML = `<option value="">اختر العقار</option>`;
      snapshot.docs.forEach(doc => { const data = doc.data() || {}; const title = normalizeText(data.titleAr || data.titleEn || doc.id); const option = document.createElement('option'); option.value = doc.id; option.textContent = title; option.dataset.title = title; DOM.ownerPropertySelect.appendChild(option); });
      if (previous) DOM.ownerPropertySelect.value = previous;
    } catch (err) { console.error('loadPropertiesForSelect error:', err); DOM.ownerPropertySelect.innerHTML = `<option value="">تعذر تحميل العقارات</option>`; }
  }

  async function loadOwnerAccounts() {
    if (!DOM.ownerAccountsTbody) return;
    const db = getDb();
    if (!db) { renderOwnerAccountsEmpty('Firebase غير متصل. تحقق من الاتصال.', true); return; }
    if (!getIsSuperAdmin()) { APP_STATE.ownerAccountDocs = []; renderOwnerAccountsEmpty('إدارة حسابات الملاك متاحة للمدير العام فقط.'); return; }
    DOM.ownerAccountsTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:36px; color:var(--text-muted);"><i class="ph ph-circle-notch ph-spin" style="font-size:2rem; display:block; margin-bottom:10px;"></i>جارٍ تحميل حسابات الملاك...</td></tr>`;
    try {
      let snapshot = await db.collection(OWNER_ACCOUNTS_COLLECTION).get();
      APP_STATE.ownerAccountDocs = snapshot.docs;
      if (snapshot.empty) { renderOwnerAccountsEmpty('لا توجد حسابات ملاك بعد.'); return; }
      DOM.ownerAccountsTbody.innerHTML = '';
      snapshot.docs.forEach(doc => {
        const data = doc.data() || {};
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${escapeHtml(data.fullName || data.name || '—')}</td><td>${escapeHtml(data.username || '—')}</td><td>${escapeHtml(data.propertyName || data.propertyId || '—')}</td><td><span class="pill-soft" style="background:rgba(67,90,191,.08);color:var(--primary);border:1px solid rgba(67,90,191,.1);">${escapeHtml(data.role || 'owner')}</span></td><td><span class="status-badge ${data.active === false ? 'hidden' : 'visible'}"><i class="ph ${data.active === false ? 'ph-user-slash' : 'ph-user-check'}"></i> ${data.active === false ? 'غير نشط' : 'نشط'}</span></td><td><div class="table-actions"><button type="button" onclick="deleteOwnerAccount('${doc.id}')"><i class="ph ph-trash"></i> حذف</button></div></td>`;
        DOM.ownerAccountsTbody.appendChild(tr);
      });
      updateQuickStats();
    } catch (err) { console.error('loadOwnerAccounts error:', err); renderOwnerAccountsEmpty(`تعذر تحميل حسابات الملاك: ${err.message}`, true); }
  }
  async function deleteOwnerAccount(docId) { const db = getDb(); if (!db) return showToast('Firebase غير متصل', 'error'); if (!confirm('هل تريد حذف هذا الحساب؟')) return; try { await db.collection(OWNER_ACCOUNTS_COLLECTION).doc(docId).delete(); showToast('تم حذف الحساب بنجاح', 'success'); await loadOwnerAccounts(); await loadPropertiesForSelect(); } catch (err) { showToast(`تعذر حذف الحساب: ${err.message}`, 'error'); } }
  g.deleteOwnerAccount = deleteOwnerAccount;

  async function loadBookings() {
    if (!DOM.bookingsContainer) return;
    const db = getDb();
    if (!db) { renderBookingsEmpty(DOM.bookingsContainer, 'Firebase غير متصل.'); return; }
    DOM.bookingsContainer.innerHTML = `<div class="empty-state"><i class="ph ph-circle-notch ph-spin"></i><div>جارٍ تحميل الحجوزات...</div></div>`;
    try {
      let snapshot = await db.collection(BOOKINGS_COLLECTION).get();
      APP_STATE.bookingDocs = snapshot.docs;
      if (snapshot.empty) { renderBookingsEmpty(DOM.bookingsContainer, 'لا توجد حجوزات بعد.'); return; }
      const docs = snapshot.docs.filter(doc => {
        const data = doc.data() || {};
        if (!getIsSuperAdmin() && getBookingPropertyId(data) !== getOwnerPropId()) return false;
        const status = normalizeText(data.status || 'pending');
        const filter = APP_STATE.currentBookingFilter;
        if (filter === 'pending') return status === 'pending';
        if (filter === 'confirmed') return status === 'confirmed';
        if (filter === 'rejected') return status === 'rejected' || status === 'cancelled';
        return true;
      });
      APP_STATE.bookingDocs = docs;
      updateBookingCounters();
      if (!docs.length) { renderBookingsEmpty(DOM.bookingsContainer, 'لا توجد حجوزات مطابقة للفلتر الحالي.'); return; }
      DOM.bookingsContainer.innerHTML = '<div class="bookings-grid"></div>';
      const grid = DOM.bookingsContainer.querySelector('.bookings-grid');
      docs.forEach(doc => {
        const b = doc.data() || {};
        const status = normalizeText(b.status || 'pending');
        const card = document.createElement('div');
        card.className = 'booking-card';
        card.dataset.status = status;
        const meta = { guest: getBookingGuestName(b), email: getBookingEmail(b), phone: getBookingPhone(b), propTitle: normalizeText(getField(b, FIELD_CANDIDATES.bookingPropertyTitle, '—')), checkIn: formatDate(getBookingCheckIn(b)), checkOut: formatDate(getBookingCheckOut(b)), price: formatCurrency(getField(b, FIELD_CANDIDATES.bookingPrice, 0)), notes: getBookingNotes(b), guests: JSON.stringify(getBookingGuestsMeta(b)) };
        card.innerHTML = `
          <div class="booking-head"><div class="booking-title"><strong>${escapeHtml(meta.guest)}</strong><span>${escapeHtml(meta.propTitle)}</span></div><span class="status-badge ${status === 'confirmed' ? 'confirmed' : (status === 'pending' ? 'pending' : 'rejected')}"><i class="ph ph-${status === 'confirmed' ? 'check-circle' : (status === 'pending' ? 'hourglass-medium' : 'x-circle')}"></i> ${escapeHtml(status)}</span></div>
          <div class="booking-meta-grid">
            <div class="booking-meta-item"><label>البريد</label><span>${escapeHtml(meta.email)}</span></div>
            <div class="booking-meta-item"><label>الهاتف</label><span>${escapeHtml(meta.phone)}</span></div>
            <div class="booking-meta-item"><label>تاريخ الدخول</label><strong>${escapeHtml(meta.checkIn)}</strong></div>
            <div class="booking-meta-item"><label>تاريخ الخروج</label><strong>${escapeHtml(meta.checkOut)}</strong></div>
            <div class="booking-meta-item"><label>السعر</label><strong>${escapeHtml(meta.price)}</strong></div>
            <div class="booking-meta-item"><label>ملاحظات</label><span>${escapeHtml(meta.notes || '—')}</span></div>
          </div>
          <div class="booking-actions-row">
            <button type="button" class="btn-approve" onclick="updateBookingStatus('${doc.id}','confirmed',this)"><i class="ph ph-check"></i><span>تأكيد</span></button>
            <button type="button" class="btn-reject" onclick="updateBookingStatus('${doc.id}','cancelled',this)"><i class="ph ph-x"></i><span>رفض</span></button>
          </div>`;
        grid.appendChild(card);
      });
      updateQuickStats();
    } catch (err) { console.error('loadBookings error:', err); renderBookingsEmpty(DOM.bookingsContainer, `حدث خطأ أثناء تحميل الحجوزات: ${err.message}`, ''); }
  }

  async function updateBookingStatus(docId, newStatus, clickedBtn = null) {
    const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'rejected'];
    if (!docId || !allowedStatuses.includes(newStatus) || BOOKING_STATUS_LOCKS.has(docId)) return;
    const db = getDb();
    if (!db) { showToast('Firebase غير متاح داخل الصفحة حالياً.', 'error'); return; }
    const normalizedTargetStatus = newStatus === 'rejected' ? 'cancelled' : newStatus;
    const isConfirm = normalizedTargetStatus === 'confirmed';
    if (!confirm(isConfirm ? 'تأكيد الحجز؟ سيتم اعتماد الحجز.' : 'هل أنت متأكد من رفض وإلغاء هذا الحجز؟')) return;
    BOOKING_STATUS_LOCKS.add(docId);
    const row = clickedBtn?.closest?.('.booking-actions-row') || null;
    row?.querySelectorAll('button').forEach(b => { b.disabled = true; });
    try {
      const bookingRef = db.collection(BOOKINGS_COLLECTION).doc(docId);
      const bookingDoc = await bookingRef.get();
      if (!bookingDoc.exists) throw new Error('الحجز غير موجود أو تم حذفه');
      const booking = bookingDoc.data() || {};
      if (!getIsSuperAdmin() && getBookingPropertyId(booking) !== getOwnerPropId()) throw new Error('غير مسموح لك بتحديث هذا الحجز');
      await bookingRef.update({ status: normalizedTargetStatus, updatedAt: serverTimestamp() });
      showToast(normalizedTargetStatus === 'confirmed' ? 'تم تأكيد الحجز بنجاح.' : 'تم تحديث حالة الحجز بنجاح.', 'success');
      await loadBookings();
    } catch (err) { console.error('updateBookingStatus error:', err); showToast(err.message || 'حدث خطأ أثناء تحديث الحجز', 'error'); }
    finally { BOOKING_STATUS_LOCKS.delete(docId); row?.querySelectorAll('button').forEach(b => { b.disabled = false; }); }
  }
  g.updateBookingStatus = updateBookingStatus;

  async function clearAllBookings() {
    const db = getDb();
    if (!db) return showToast('Firebase غير متاح — لا يمكن تنظيف الحجوزات.', 'error');
    if (!getIsSuperAdmin()) return showToast('فقط المدير العام يمكنه تنظيف الحجوزات.', 'error');
    if (!confirm('⚠️ هل أنت متأكد من حذف ALL الحجوزات؟\n\nهذا الإجراء لا يمكن التراجع عنه!')) return;
    try {
      const snapshot = await db.collection(BOOKINGS_COLLECTION).get();
      if (snapshot.empty) return showToast('لا توجد حجوزات للحذف.', 'info');
      const batch = db.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      showToast(`✅ تم حذف ${snapshot.size} حجز بنجاح.`, 'success');
      await loadBookings();
    } catch (err) { console.error('clearAllBookings error:', err); showToast('حدث خطأ أثناء تنظيف الحجوزات: ' + (err?.message || 'Unknown error'), 'error'); }
  }
  g.clearAllBookings = clearAllBookings;

  function loadThemeFromStorage() {
    try {
      const savedTheme = localStorage.getItem('ore_theme') || 'light';
      if (savedTheme === 'dark') document.body.classList.add('dark');
      const themeBtn = document.getElementById('admin-theme-toggle');
      if (themeBtn) themeBtn.innerHTML = document.body.classList.contains('dark') ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
    } catch (_) {}
  }

  function bindGlobalEvents() {
    DOM.loginForm?.addEventListener('submit', async function (e) {
      e.preventDefault();
      clearLoginMessage();
      const user = normalizeText(qs('#admin-user')?.value);
      const pass = normalizeText(qs('#admin-pass')?.value);
      const db = getDb();
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        setAdminSession('superadmin');
        showToast('تم تسجيل دخول المدير العام بنجاح', 'success');
        showAdminLayout();
        setNavVisibilityByRole();
        await loadProperties();
        await loadBookings();
        await loadOwnerAccounts();
        return;
      }
      if (!db) { showLoginMessage('Firebase غير متصل حالياً.', 'error'); return; }
      try {
        const snap = await db.collection(OWNER_ACCOUNTS_COLLECTION).where('username', '==', user).where('password', '==', pass).limit(1).get();
        if (snap.empty) { showLoginMessage('بيانات الدخول غير صحيحة.', 'error'); return; }
        const doc = snap.docs[0];
        const data = doc.data() || {};
        setAdminSession('owner', normalizeText(data.propertyId || ''), normalizeText(data.propertyName || ''), doc.id, normalizeText(data.username || user));
        showToast('تم تسجيل دخول المالك بنجاح', 'success');
        showAdminLayout();
        setNavVisibilityByRole();
        switchTab('manage-props');
        await loadProperties();
        await loadBookings();
      } catch (err) { console.error('login error:', err); showLoginMessage('تعذر التحقق من بيانات الدخول.', 'error'); }
    });

    DOM.refreshPropertiesBtn?.addEventListener('click', loadProperties);
    DOM.refreshBookingsBtn?.addEventListener('click', loadBookings);
    DOM.refreshOwnerAccountsBtn?.addEventListener('click', loadOwnerAccounts);
    DOM.logoutBtn?.addEventListener('click', function () { clearAdminSession(); showLoginLayout(); showToast('تم تسجيل الخروج', 'info'); });
    DOM.propertySearchInput?.addEventListener('input', function () { APP_STATE.currentPropertyFilter = this.value; renderPropertiesTable(getFilteredPropertyDocs()); });

    document.addEventListener('click', function (e) {
      const filterBtn = e.target.closest('.booking-filter-btn');
      if (filterBtn) {
        qsa('.booking-filter-btn').forEach(b => b.classList.remove('active'));
        filterBtn.classList.add('active');
        APP_STATE.currentBookingFilter = filterBtn.dataset.filter || 'all';
        loadBookings();
      }
    });

    qs('#clear-bookings-btn')?.addEventListener('click', clearAllBookings);
    qs('#admin-theme-toggle')?.addEventListener('click', function () {
      document.body.classList.toggle('dark');
      const mode = document.body.classList.contains('dark') ? 'dark' : 'light';
      try { localStorage.setItem('ore_theme', mode); } catch (_) {}
      this.innerHTML = mode === 'dark' ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
    });

    qsa('[data-tab-target]').forEach(btn => btn.addEventListener('click', function () { switchTab(btn.dataset.tabTarget); }));

    DOM.ownerAccountForm?.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!getIsSuperAdmin()) return showToast('هذا القسم للمدير العام فقط', 'error');
      const db = getDb();
      if (!db) return showToast('Firebase غير متصل', 'error');
      const payload = normalizeOwnerAccountPayload({ fullName: qs('#owner-full-name')?.value, propertyId: qs('#owner-property-id')?.value, username: qs('#owner-username')?.value, password: qs('#owner-password')?.value });
      const validationError = validateOwnerAccountPayload(payload);
      if (validationError) return showToast(validationError, 'error');
      try {
        const propDoc = await db.collection(PROPERTIES_COLLECTION).doc(payload.propertyId).get();
        if (!propDoc.exists) return showToast('العقار المختار غير موجود', 'error');
        payload.propertyName = normalizeText(propDoc.data()?.titleAr || propDoc.data()?.titleEn || payload.propertyId);
        const ref = await db.collection(OWNER_ACCOUNTS_COLLECTION).add({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        showToast('تم حفظ حساب المالك بنجاح', 'success');
        e.target.reset();
        await loadOwnerAccounts();
        await loadPropertiesForSelect();
      } catch (err) { console.error('save owner account error:', err); showToast(`تعذر حفظ الحساب: ${err.message}`, 'error'); }
    });

    DOM.addForm?.addEventListener('submit', async function (e) {
      e.preventDefault();
      const db = getDb();
      if (!db) return showToast('Firebase غير متصل', 'error');
      const payload = normalizePropertyPayload({ titleAr: qs('#title-ar')?.value, titleEn: qs('#title-en')?.value, locationAr: qs('#loc-ar')?.value, locationEn: qs('#loc-en')?.value, price: qs('#price')?.value, type: qs('#type')?.value, descAr: qs('#desc-ar')?.value, descEn: qs('#desc-en')?.value, imageUrl: '', lat: qs('#lat')?.value, lng: qs('#lng')?.value, visible: true });
      const errMsg = validatePropertyPayload(payload, { requireMap: false, requireImage: false });
      if (errMsg) return showToast(errMsg, 'error');
      try {
        await db.collection(PROPERTIES_COLLECTION).add({ ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        showToast('تم حفظ العقار بنجاح', 'success');
        e.target.reset();
        await loadProperties();
        await loadPropertiesForSelect();
      } catch (err) { console.error('add property error:', err); showToast(`تعذر حفظ العقار: ${err.message}`, 'error'); }
    });

    DOM.editForm?.addEventListener('submit', async function (e) {
      e.preventDefault();
      const db = getDb();
      if (!db) return showToast('Firebase غير متصل', 'error');
      const id = qs('#edit-prop-id')?.value;
      if (!id) return showToast('معرّف العقار غير موجود', 'error');
      if (!canAccessProperty(id)) return showToast('غير مسموح لك بتعديل هذا العقار', 'error');
      const payload = normalizePropertyPayload({ titleAr: qs('#edit-title-ar')?.value, titleEn: qs('#edit-title-en')?.value, locationAr: qs('#edit-loc-ar')?.value, locationEn: qs('#edit-loc-en')?.value, price: qs('#edit-price')?.value, type: qs('#edit-type')?.value, descAr: qs('#edit-desc-ar')?.value, descEn: qs('#edit-desc-en')?.value, imageUrl: '', lat: qs('#edit-lat')?.value, lng: qs('#edit-lng')?.value, visible: true });
      const errMsg = validatePropertyPayload(payload, { requireMap: false, requireImage: false });
      if (errMsg) return showToast(errMsg, 'error');
      try {
        await db.collection(PROPERTIES_COLLECTION).doc(id).update({ ...payload, updatedAt: serverTimestamp() });
        showToast('تم حفظ التعديلات بنجاح', 'success');
        closeEditModal();
        await loadProperties();
      } catch (err) { console.error('edit property error:', err); showToast(`تعذر حفظ التعديلات: ${err.message}`, 'error'); }
    });

    if (g.initEditMapFromAdmin === undefined) g.initEditMapFromAdmin = function () {};
    if (g.resetEditUploadPreview === undefined) g.resetEditUploadPreview = function () {};
    g.showToast = g.showToast || showToast;
    g.getDb = g.getDb || getDb;
    g.getDB = g.getDB || function () { return getDb(); };
    g.getIsSuperAdmin = g.getIsSuperAdmin || getIsSuperAdmin;
    g.getOwnerPropId = g.getOwnerPropId || getOwnerPropId;
    g.getOwnerAccountId = g.getOwnerAccountId || getOwnerAccountId;
    g.getOwnerPropName = g.getOwnerPropName || getOwnerPropName;
    g.getOwnerUsername = g.getOwnerUsername || getOwnerUsername;
    g.getSessionRole = g.getSessionRole || getSessionRole;
    g.getAdminActorId = g.getAdminActorId || getAdminActorId;
    g.getAdminActorName = g.getAdminActorName || getAdminActorName;
    g.normalizeText = g.normalizeText || normalizeText;
    g.escapeHtml = g.escapeHtml || escapeHtml;
    g.formatDate = g.formatDate || formatDate;
    g.formatDateTime = g.formatDateTime || formatDateTime;
    g.formatCurrency = g.formatCurrency || formatCurrency;
    g.getBookingPropertyId = g.getBookingPropertyId || getBookingPropertyId;
    g.getBookingGuestId = g.getBookingGuestId || getBookingGuestId;
    g.getBookingGuestName = g.getBookingGuestName || getBookingGuestName;
    g.getBookingEmail = g.getBookingEmail || getBookingEmail;
    g.getBookingPhone = g.getBookingPhone || getBookingPhone;
    g.getBookingCheckIn = g.getBookingCheckIn || getBookingCheckIn;
    g.getBookingCheckOut = g.getBookingCheckOut || getBookingCheckOut;
    g.getBookingAddons = g.getBookingAddons || getBookingAddons;
    g.getBookingGuestsMeta = g.getBookingGuestsMeta || getBookingGuestsMeta;
    g.getPropertyTypeLabel = g.getPropertyTypeLabel || getPropertyTypeLabel;
    g.renderPropertiesTable = g.renderPropertiesTable || renderPropertiesTable;
    g.renderPropertiesEmpty = g.renderPropertiesEmpty || renderPropertiesEmpty;
    g.renderOwnerAccountsEmpty = g.renderOwnerAccountsEmpty || renderOwnerAccountsEmpty;
    g.renderBookingsEmpty = g.renderBookingsEmpty || renderBookingsEmpty;
    g.updateQuickStats = g.updateQuickStats || updateQuickStats;
    g.loadProperties = g.loadProperties || loadProperties;
    g.loadOwnerAccounts = g.loadOwnerAccounts || loadOwnerAccounts;
    g.loadBookings = g.loadBookings || loadBookings;
    g.loadPropertiesForSelect = g.loadPropertiesForSelect || loadPropertiesForSelect;
    g.updateBookingCounters = g.updateBookingCounters || updateBookingCounters;
  }

  async function init() {
    loadThemeFromStorage();
    bindGlobalEvents();
    const status = DOM.firebaseBanner;
    if (status) {
      if (window.__firebaseReady) {
        status.className = 'firebase-status-banner success';
        status.innerHTML = '<i class="ph ph-check-circle"></i><span>تم الاتصال بـ Firebase بنجاح.</span>';
      } else {
        status.className = 'firebase-status-banner error';
        status.innerHTML = '<i class="ph ph-warning-circle"></i><span>تعذر الاتصال بـ Firebase: ' + (window.__firebaseError || 'خطأ غير معروف') + '</span>';
      }
    }

    if (!ensureValidSession()) {
      showLoginLayout();
      return;
    }

    if (getIsSuperAdmin()) setAdminSession('superadmin');
    showAdminLayout();
    setNavVisibilityByRole();
    switchTab('manage-props');
    await loadProperties();
    await loadBookings();
    await loadOwnerAccounts();
    await loadPropertiesForSelect();
  }

  window.addEventListener('DOMContentLoaded', init);
})();
