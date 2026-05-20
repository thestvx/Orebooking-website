// OreBooking Admin Bookings Addon - Complete Replacement
(function () {
  "use strict";

  const g = typeof globalThis !== "undefined" ? globalThis : window;
  const DB_COLLECTION = "bookings";
  const CHAT_COLLECTION = "chats";
  const PROPERTY_COLLECTION = "properties";
  const OWNER_COLLECTION = "ownerAccounts";
  const STORAGE_KEY = "orebooking_admin_bookings_filter";
  const STATUS_VALUES = ["all", "pending", "confirmed", "rejected", "cancelled"];
  const STATUS_LOCKS = g.BOOKING_STATUS_LOCKS instanceof Set ? g.BOOKING_STATUS_LOCKS : new Set();

  function db() {
    try {
      if (typeof g.getDB === "function") return g.getDB();
    } catch (_) {}
    return g.__db || null;
  }

  function fb() {
    if (typeof g.firebase !== "undefined") return g.firebase;
    try { return firebase; } catch (_) { return null; }
  }

  function serverTimestamp() {
    const f = fb();
    return f?.firestore?.FieldValue?.serverTimestamp ? f.firestore.FieldValue.serverTimestamp() : new Date();
  }

  function normalizeText(v) { return String(v ?? "").trim(); }
  function escapeHtml(v) { return String(v ?? "").replace(/[&<>"]'/g, s => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":"&#039;"}[s])); }
  function formatDate(v) { try { if (!v) return "—"; if (typeof v?.toDate === "function") return v.toDate().toLocaleDateString("ar-DZ"); const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-DZ"); } catch (_) { return "—"; } }
  function formatDateTime(v) { try { if (!v) return "—"; if (typeof v?.toDate === "function") return v.toDate().toLocaleString("ar-DZ"); const d = new Date(v); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("ar-DZ"); } catch (_) { return "—"; } }
  function formatCurrency(v) { const n = Number(v || 0); return `${n.toLocaleString("en-US")} DZD`; }
  function showToast(message, type = "info") { if (typeof g.showToast === "function") return g.showToast(message, type); console.log(`[${type}]`, message); }
  function canAccessProperty(propertyId) { return typeof g.getIsSuperAdmin === "function" ? g.getIsSuperAdmin() || normalizeText(propertyId) === normalizeText(g.getOwnerPropId?.()) : true; }
  function getCurrentRole() { return typeof g.getSessionRole === "function" ? g.getSessionRole() : (normalizeText(localStorage.getItem("adminRole")) || "superadmin"); }
  function getCurrentOwnerPropId() { return typeof g.getOwnerPropId === "function" ? g.getOwnerPropId() : normalizeText(localStorage.getItem("ownerPropId") || ""); }

  function getField(data, keys = [], fallback = "") {
    for (const key of keys) {
      if (data?.[key] !== undefined && data?.[key] !== null && String(data[key]).trim() !== "") return data[key];
    }
    return fallback;
  }

  function getBookingPropertyId(data = {}) {
    return normalizeText(getField(data, ["propertyId", "propId", "propertyDocId", "property_id", "listingId", "listing_id"], ""));
  }

  function getBookingGuestName(data = {}) {
    const direct = normalizeText(getField(data, ["guestName", "fullName", "name", "billingName"], ""));
    if (direct) return direct;
    const first = normalizeText(data.firstName || data.guestNameFirst || "");
    const father = normalizeText(data.fatherName || data.guestFatherName || "");
    const family = normalizeText(data.lastName || data.familyName || data.guestFamilyName || "");
    return [first, father, family].filter(Boolean).join(" ").trim() || "غير معروف";
  }

  function getBookingGuestEmail(data = {}) { return normalizeText(getField(data, ["guestEmail", "email", "billingEmail", "contactEmail"], "—")); }
  function getBookingGuestPhone(data = {}) { return normalizeText(getField(data, ["guestPhone", "phone", "guestWhatsapp", "billingPhone", "contactPhone"], "—")); }
  function getBookingStatus(data = {}) { return normalizeText(data.status || data.bookingStatus || "pending").toLowerCase(); }
  function getBookingTitle(data = {}) { return normalizeText(getField(data, ["propertyTitle", "propertyName", "listingTitle"], "—")); }
  function getBookingImage(data = {}) { return normalizeText(getField(data, ["propertyImage", "propertyImageUrl", "imageUrl", "image"], "")); }
  function getBookingReceipt(data = {}) { return normalizeText(getField(data, ["receiptUrl", "paymentReceiptUrl", "transferReceiptUrl"], "")); }
  function getBookingPrice(data = {}) { return formatCurrency(getField(data, ["totalPrice", "finalTotal", "amount", "price"], 0)); }
  function getBookingCheckIn(data = {}) { return formatDate(getField(data, ["checkInDate", "checkIn", "arrivalDate", "arrival_date"], null)); }
  function getBookingCheckOut(data = {}) { return formatDate(getField(data, ["checkOutDate", "checkOut", "departureDate", "departure_date"], null)); }
  function getBookingNights(data = {}) { return Number(getField(data, ["nights", "nightCount"], 0)) || 0; }
  function getBookingGuests(data = {}) { return Number(getField(data, ["guests", "guestCount"], 1)) || 1; }

  function getBookingMeta(data = {}) {
    const addons = Array.isArray(data.selectedAddons)
      ? data.selectedAddons
      : Array.isArray(data.addons)
        ? data.addons
        : [];
    const notes = normalizeText(getField(data, ["specialRequests", "notes", "addonNotes", "medicalNotes"], ""));
    const arrival = normalizeText(getField(data, ["arrivalTime", "arrival_time", "expectedArrivalTime"], ""));
    return { addons, notes, arrival };
  }

  function getPropertyCache() { return g.__orePropertyCache instanceof Map ? g.__orePropertyCache : (g.__orePropertyCache = new Map()); }

  async function resolvePropertyName(propertyId) {
    const id = normalizeText(propertyId);
    if (!id) return "—";
    const cache = getPropertyCache();
    if (cache.has(id)) return cache.get(id);
    const dbase = db();
    if (!dbase) return id;
    try {
      const doc = await dbase.collection(PROPERTY_COLLECTION).doc(id).get();
      const data = doc.data() || {};
      const name = normalizeText(data.titleAr || data.titleEn || data.name || id);
      cache.set(id, name);
      return name;
    } catch (_) {
      cache.set(id, id);
      return id;
    }
  }

  function buildBookingCard(doc) {
    const data = doc.data() || {};
    const status = getBookingStatus(data);
    const propertyId = getBookingPropertyId(data);
    const title = getBookingTitle(data);
    const image = getBookingImage(data) || "images/placeholder.jpg";
    const guest = getBookingGuestName(data);
    const email = getBookingGuestEmail(data);
    const phone = getBookingGuestPhone(data);
    const checkIn = getBookingCheckIn(data);
    const checkOut = getBookingCheckOut(data);
    const nights = getBookingNights(data);
    const guests = getBookingGuests(data);
    const notes = getBookingMeta(data).notes;
    const receipt = getBookingReceipt(data);
    const createdAt = formatDateTime(data.createdAt || data.timestamp || data.dateCreated);
    const statusClass = status === "confirmed" ? "confirmed" : (status === "cancelled" || status === "rejected" ? "rejected" : "pending");
    const statusIcon = status === "confirmed" ? "ph-check-circle" : (status === "cancelled" || status === "rejected" ? "ph-x-circle" : "ph-hourglass-medium");
    const canEdit = canAccessProperty(propertyId);

    return `
      <div class="booking-card" data-id="${escapeHtml(doc.id)}" data-status="${escapeHtml(status)}" data-property-id="${escapeHtml(propertyId)}" ${canEdit ? '' : 'style="opacity:.8"'}>
        <div class="booking-head">
          <div style="display:flex; gap:12px; align-items:center; min-width:0;">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" style="width:76px;height:60px;object-fit:cover;border-radius:16px;border:1px solid var(--border-color);background:#f1f5f9;flex-shrink:0;" onerror="this.src='images/placeholder.jpg'" />
            <div class="booking-title" style="min-width:0;">
              <strong title="${escapeHtml(title)}" style="word-break:break-word;">${escapeHtml(title)}</strong>
              <span title="${escapeHtml(propertyId)}" style="word-break:break-word;">${escapeHtml(propertyId)}</span>
            </div>
          </div>
          <span class="status-badge ${statusClass}"><i class="ph ${statusIcon}"></i> ${escapeHtml(status)}</span>
        </div>

        <div class="booking-meta-grid">
          <div class="booking-meta-item"><label>اسم الزبون</label><span>${escapeHtml(guest)}</span></div>
          <div class="booking-meta-item"><label>البريد الإلكتروني</label><span>${escapeHtml(email)}</span></div>
          <div class="booking-meta-item"><label>رقم الهاتف</label><span>${escapeHtml(phone)}</span></div>
          <div class="booking-meta-item"><label>تاريخ الدخول</label><strong>${escapeHtml(checkIn)}</strong></div>
          <div class="booking-meta-item"><label>تاريخ الخروج</label><strong>${escapeHtml(checkOut)}</strong></div>
          <div class="booking-meta-item"><label>السعر الإجمالي</label><strong>${escapeHtml(getBookingPrice(data))}</strong></div>
          <div class="booking-meta-item"><label>عدد الليالي</label><strong>${escapeHtml(String(nights || '—'))}</strong></div>
          <div class="booking-meta-item"><label>عدد الضيوف</label><strong>${escapeHtml(String(guests || '—'))}</strong></div>
        </div>

        <div class="booking-meta-item">
          <label>الملاحظات</label>
          <span>${escapeHtml(notes || '—')}</span>
        </div>

        <div class="booking-meta-item">
          <label>المرفق / الإيصال</label>
          ${receipt ? `<a href="${escapeHtml(receipt)}" target="_blank" rel="noopener noreferrer" style="color:var(--primary);font-weight:800;word-break:break-word;">فتح الإيصال</a>` : '<span>لا يوجد</span>'}
        </div>

        <div class="booking-meta-item">
          <label>وقت الإنشاء</label>
          <span>${escapeHtml(createdAt)}</span>
        </div>

        <div class="booking-actions-row">
          <button type="button" class="btn-approve" data-action="confirm" data-id="${escapeHtml(doc.id)}" ${status === 'confirmed' ? 'disabled' : ''}>
            <i class="ph ph-check"></i><span>تأكيد</span>
          </button>
          <button type="button" class="btn-reject" data-action="reject" data-id="${escapeHtml(doc.id)}" ${status === 'cancelled' || status === 'rejected' ? 'disabled' : ''}>
            <i class="ph ph-x"></i><span>رفض</span>
          </button>
        </div>
      </div>
    `;
  }

  async function updateBookingCounters() {
    const docs = g.__oreBookingDocs || [];
    const counters = { all: 0, pending: 0, confirmed: 0, rejected: 0 };
    docs.forEach(doc => {
      const status = getBookingStatus(doc.data() || {});
      counters.all++;
      if (status === "confirmed") counters.confirmed++;
      else if (status === "rejected" || status === "cancelled") counters.rejected++;
      else counters.pending++;
    });
    const map = {
      "booking-count-all": counters.all,
      "booking-count-pending": counters.pending,
      "booking-count-confirmed": counters.confirmed,
      "booking-count-rejected": counters.rejected
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val);
    });
  }

  function filterBookings(docs, filter) {
    const activeFilter = STATUS_VALUES.includes(filter) ? filter : "all";
    const ownerId = getCurrentOwnerPropId();
    return docs.filter(doc => {
      const data = doc.data() || {};
      const status = getBookingStatus(data);
      if (getCurrentRole() !== "superadmin" && ownerId && getBookingPropertyId(data) !== ownerId) return false;
      if (activeFilter === "all") return true;
      if (activeFilter === "rejected") return status === "rejected" || status === "cancelled";
      return status === activeFilter;
    });
  }

  async function loadBookingDocs() {
    const dbase = db();
    if (!dbase) return [];
    try {
      let snap;
      try {
        snap = await dbase.collection(DB_COLLECTION).orderBy("createdAt", "desc").get();
      } catch (_) {
        snap = await dbase.collection(DB_COLLECTION).get();
      }
      return snap.docs || [];
    } catch (err) {
      console.error("loadBookingDocs", err);
      return [];
    }
  }

  async function renderBookings(filter = null) {
    const container = document.getElementById("bookings-container");
    if (!container) return;
    const activeFilter = filter || localStorage.getItem(STORAGE_KEY) || "all";
    const docs = await loadBookingDocs();
    g.__oreBookingDocs = docs;
    await updateBookingCounters();

    const filtered = filterBookings(docs, activeFilter);
    if (!filtered.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ph ph-calendar-blank"></i>
          <div style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:8px;">لا توجد حجوزات مطابقة حالياً</div>
          <div>جرّب تغيير الفلتر أو تأكد من وجود بيانات في قاعدة البيانات.</div>
        </div>
      `;
      return;
    }

    const fragments = [];
    for (const doc of filtered) fragments.push(buildBookingCard(doc));
    container.innerHTML = `<div class="bookings-grid">${fragments.join("")}</div>`;
  }

  async function updateBookingStatus(docId, newStatus, clickedBtn = null) {
    const dbase = db();
    if (!dbase) return showToast("Firebase غير متصل", "error");
    const normalized = newStatus === "reject" ? "cancelled" : (newStatus === "deny" ? "cancelled" : newStatus);
    if (STATUS_LOCKS.has(docId)) return;
    STATUS_LOCKS.add(docId);
    try {
      const ref = dbase.collection(DB_COLLECTION).doc(docId);
      const snap = await ref.get();
      if (!snap.exists) throw new Error("الحجز غير موجود");
      const data = snap.data() || {};
      const propertyId = getBookingPropertyId(data);
      if (!canAccessProperty(propertyId)) throw new Error("غير مسموح لك بتحديث هذا الحجز");
      const promptMsg = normalized === "confirmed" ? "تأكيد هذا الحجز؟" : "رفض وإلغاء هذا الحجز؟";
      if (!confirm(promptMsg)) return;
      if (clickedBtn) clickedBtn.disabled = true;
      await ref.update({ status: normalized, updatedAt: serverTimestamp() });
      showToast(normalized === "confirmed" ? "تم تأكيد الحجز بنجاح" : "تم رفض الحجز بنجاح", "success");
      await renderBookings(localStorage.getItem(STORAGE_KEY) || "all");
    } catch (err) {
      console.error("updateBookingStatus", err);
      showToast(err.message || "تعذر تحديث الحجز", "error");
    } finally {
      STATUS_LOCKS.delete(docId);
      if (clickedBtn) clickedBtn.disabled = false;
    }
  }
  g.updateBookingStatus = updateBookingStatus;

  async function clearAllBookings() {
    const dbase = db();
    if (!dbase) return showToast("Firebase غير متصل", "error");
    if (typeof g.getIsSuperAdmin === "function" && !g.getIsSuperAdmin()) return showToast("هذا الإجراء متاح للمدير العام فقط", "error");
    if (!confirm("هل تريد حذف جميع الحجوزات نهائياً؟")) return;
    try {
      const snap = await dbase.collection(DB_COLLECTION).get();
      if (snap.empty) return showToast("لا توجد حجوزات للحذف", "info");
      const batch = dbase.batch();
      snap.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      showToast(`تم حذف ${snap.size} حجز بنجاح`, "success");
      await renderBookings(localStorage.getItem(STORAGE_KEY) || "all");
    } catch (err) {
      console.error("clearAllBookings", err);
      showToast(err.message || "تعذر حذف الحجوزات", "error");
    }
  }
  g.clearAllBookings = clearAllBookings;

  function bindEvents() {
    const container = document.getElementById("bookings-container");
    if (container) {
      container.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-action][data-id]");
        if (!btn) return;
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (!id) return;
        if (action === "confirm") updateBookingStatus(id, "confirmed", btn);
        else if (action === "reject") updateBookingStatus(id, "cancelled", btn);
      });
    }

    document.addEventListener("click", (e) => {
      const btn = e.target.closest(".booking-filter-btn");
      if (!btn) return;
      const filter = normalizeText(btn.dataset.filter || "all");
      if (!STATUS_VALUES.includes(filter)) return;
      localStorage.setItem(STORAGE_KEY, filter);
      qsa(".booking-filter-btn").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      renderBookings(filter);
    });

    document.getElementById("refresh-bookings-btn")?.addEventListener("click", () => renderBookings(localStorage.getItem(STORAGE_KEY) || "all"));
    document.getElementById("clear-bookings-btn")?.addEventListener("click", clearAllBookings);

    const refreshOwners = document.getElementById("refresh-owner-accounts-btn");
    if (refreshOwners) refreshOwners.addEventListener("click", async () => {
      if (typeof g.loadOwnerAccounts === "function") await g.loadOwnerAccounts();
    });

    const refreshProps = document.getElementById("refresh-properties-btn");
    if (refreshProps) refreshProps.addEventListener("click", async () => {
      if (typeof g.loadProperties === "function") await g.loadProperties();
    });
  }

  async function hydratePropertyCache() {
    const dbase = db();
    if (!dbase) return;
    try {
      const snap = await dbase.collection(PROPERTY_COLLECTION).get();
      const cache = getPropertyCache();
      snap.docs.forEach(doc => {
        const data = doc.data() || {};
        const name = normalizeText(data.titleAr || data.titleEn || data.name || doc.id);
        cache.set(doc.id, name);
      });
    } catch (_) {}
  }

  async function init() {
    bindEvents();
    const active = localStorage.getItem(STORAGE_KEY) || "all";
    const activeBtn = document.querySelector(`.booking-filter-btn[data-filter="${active}"]`);
    if (activeBtn) qsa(".booking-filter-btn").forEach(x => x.classList.remove("active")), activeBtn.classList.add("active");
    await hydratePropertyCache();
    await renderBookings(active);
  }

  if (!g.renderBookings) g.renderBookings = renderBookings;
  g.loadBookingDocs = g.loadBookingDocs || loadBookingDocs;
  g.updateBookingCounters = g.updateBookingCounters || updateBookingCounters;
  g.clearAllBookings = g.clearAllBookings || clearAllBookings;
  g.bindBookingAddonEvents = g.bindBookingAddonEvents || bindEvents;

  window.addEventListener("DOMContentLoaded", init);
})();
