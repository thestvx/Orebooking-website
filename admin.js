"use strict";

(function () {
  const ADMIN_SESSION_KEY = "ore_admin_logged_in";
  const ADMIN_ROLE_KEY = "ore_admin_role";
  const ADMIN_OWNER_DOC_KEY = "ore_admin_owner_doc";

  const db =
    window.__db ||
    (typeof firebase !== "undefined" && firebase.firestore
      ? firebase.firestore()
      : null);

  const auth =
    window.__auth ||
    (typeof firebase !== "undefined" && firebase.auth
      ? firebase.auth()
      : null);

  const firebaseReady = !!db && !!auth;

  const firestoreFieldValue =
    typeof firebase !== "undefined" &&
    firebase.firestore &&
    firebase.firestore.FieldValue
      ? firebase.firestore.FieldValue
      : null;

  const state = {
    isLoggedIn: false,
    authReady: false,
    activeTab: "dashboard",
    adminRole: safeGet(ADMIN_ROLE_KEY, ""),
    ownerAccountDocId: safeGet(ADMIN_OWNER_DOC_KEY, ""),
    currentAuthUser: null,
    currentOwnerRecord: null,
    properties: [],
    bookings: [],
    ownerAccounts: [],
    chats: [],
    users: [],
    currentChatId: null,
    currentChatMessages: [],
    bookingFilter: "all",
    listeners: {
      chats: null,
      chatMessages: null
    },
    maps: {
      add: null,
      edit: null,
      addMarker: null,
      editMarker: null
    }
  };

  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const byId = (id) => document.getElementById(id);

  function safeGet(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {}
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  }

  function safeJsonGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function safeJsonSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }

  function escapeHtml(value) {
    const div = document.createElement("div");
    div.textContent = String(value ?? "");
    return div.innerHTML;
  }

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function normalizeEmail(value) {
    return cleanText(value).toLowerCase();
  }

  function toNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === "") return fallback;
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function getServerTimestamp() {
    return firestoreFieldValue?.serverTimestamp
      ? firestoreFieldValue.serverTimestamp()
      : new Date().toISOString();
  }

  function isObject(value) {
    return value && typeof value === "object" && !Array.isArray(value);
  }

  function pickFirst(...values) {
    for (const value of values) {
      if (value === 0 || value === false) return value;
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function formatDate(value) {
    if (!value) return "—";
    try {
      if (typeof value?.toDate === "function") return value.toDate().toLocaleString("ar-DZ");
      if (typeof value === "object" && typeof value.seconds === "number") {
        return new Date(value.seconds * 1000).toLocaleString("ar-DZ");
      }
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return String(value);
      return d.toLocaleString("ar-DZ");
    } catch {
      return String(value);
    }
  }

  function formatPrice(value) {
    const n = toNumber(value, 0);
    return `${n.toLocaleString("en-US")} دج`;
  }

  function slugify(value) {
    return cleanText(value)
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function showToast(message, type = "info") {
    let host = byId("admin-toast-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "admin-toast-host";
      host.style.cssText = `
        position: fixed;
        top: 18px;
        left: 18px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: min(92vw, 420px);
      `;
      document.body.appendChild(host);
    }

    const map = {
      success: { bg: "#ecfdf5", border: "#10b981", color: "#047857", icon: "ph-check-circle" },
      error: { bg: "#fef2f2", border: "#ef4444", color: "#b91c1c", icon: "ph-warning-circle" },
      info: { bg: "#eff6ff", border: "#3b82f6", color: "#1d4ed8", icon: "ph-info" },
      warning: { bg: "#fff7ed", border: "#f59e0b", color: "#c2410c", icon: "ph-warning" }
    };

    const cfg = map[type] || map.info;
    const item = document.createElement("div");
    item.style.cssText = `
      background:${cfg.bg};
      color:${cfg.color};
      border:1px solid ${cfg.border};
      border-radius:16px;
      padding:14px 16px;
      box-shadow:0 16px 30px rgba(15,23,42,.12);
      display:flex;
      align-items:flex-start;
      gap:10px;
      font-weight:700;
      line-height:1.65;
    `;
    item.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.15rem;margin-top:2px;"></i><span>${escapeHtml(message)}</span>`;
    host.appendChild(item);

    setTimeout(() => {
      item.style.transition = "all .25s ease";
      item.style.opacity = "0";
      item.style.transform = "translateY(-6px)";
      setTimeout(() => item.remove(), 250);
    }, 3200);
  }

  function setButtonLoading(btn, loading, text = "جارٍ المعالجة...") {
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = `<i class="ph ph-spinner-gap ph-spin"></i><span>${escapeHtml(text)}</span>`;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
  }

  function showFirebaseStatus() {
    const banner = byId("firebase-status-banner");
    if (!banner) return;
    if (firebaseReady) {
      banner.className = "firebase-status-banner success";
      banner.innerHTML = `<i class="ph ph-check-circle"></i><span>تم الاتصال بـ Firebase بنجاح.</span>`;
    } else {
      banner.className = "firebase-status-banner error";
      banner.innerHTML = `<i class="ph ph-warning-circle"></i><span>فشل الاتصال بـ Firebase. تأكد من الإعدادات داخل admin.html.</span>`;
    }
  }

  function setStat(id, value) {
    const el = byId(id);
    if (el) el.textContent = value;
  }

  function getValue(...ids) {
    for (const id of ids) {
      const el = byId(id);
      if (el) return cleanText(el.value);
    }
    return "";
  }

  function setValue(value, ...ids) {
    for (const id of ids) {
      const el = byId(id);
      if (el) {
        el.value = value ?? "";
        return;
      }
    }
  }

  function setText(value, ...ids) {
    for (const id of ids) {
      const el = byId(id);
      if (el) {
        el.textContent = value ?? "";
        return;
      }
    }
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean).map((v) => cleanText(v)).filter(Boolean);
    if (typeof value === "string") return value.split(",").map((v) => cleanText(v)).filter(Boolean);
    return [];
  }

  function getPropertyTitle(prop) {
    return cleanText(prop?.titleAr || prop?.title || prop?.titleEn || "بدون عنوان");
  }

  function getPropertyLocation(prop) {
    return cleanText(prop?.locationAr || prop?.location || prop?.locationEn || "غير محدد");
  }

  function getPropertyType(prop) {
    return cleanText(prop?.typeAr || prop?.type || prop?.typeEn || "إقامة");
  }

  function getPropertyImage(prop) {
    return cleanText(
      prop?.imageUrl ||
      prop?.mainImage ||
      (Array.isArray(prop?.images) ? prop.images[0] : "") ||
      "images/placeholder.jpg"
    );
  }

  function getBookingStatus(status) {
    const s = cleanText(status || "pending").toLowerCase();
    if (["confirmed", "approved", "accept", "accepted"].includes(s)) return "confirmed";
    if (["rejected", "cancelled", "canceled", "declined"].includes(s)) return "rejected";
    return "pending";
  }

  function statusLabel(status) {
    const s = getBookingStatus(status);
    if (s === "confirmed") return "مؤكد";
    if (s === "rejected") return "مرفوض";
    return "قيد الانتظار";
  }

  function statusBadge(status) {
    const s = getBookingStatus(status);
    return `<span class="status-badge ${s}">${statusLabel(s)}</span>`;
  }

  function ensureLoggedInUI() {
    const loginScreen = byId("admin-login-screen") || q(".admin-login-screen");
    const layout = byId("admin-layout") || q(".admin-layout");
    if (loginScreen) loginScreen.classList.toggle("hidden", state.isLoggedIn);
    if (layout) layout.classList.toggle("hidden", !state.isLoggedIn);
  }

  function updateProfileUI() {
    const name =
      state.currentOwnerRecord?.name ||
      state.currentAuthUser?.displayName ||
      state.currentAuthUser?.email ||
      "الحساب الحالي";

    const role = state.adminRole === "admin" ? "أدمن عام" : state.adminRole === "owner" ? "مالك عقار" : "غير معروف";

    setText(name, "admin-profile-name");
    setText(role, "admin-profile-role");
  }

  function updateRoleBasedUI() {
    const adminOnlyEls = qa(".admin-only");
    adminOnlyEls.forEach((el) => {
      el.classList.toggle("hidden", !isSuperAdmin());
    });

    if (state.adminRole === "owner" && state.activeTab === "owners") {
      activateTab("dashboard", { silentAuth: true });
    }
  }

  function requireAuth(showMessage = true) {
    if (state.isLoggedIn && state.currentAuthUser) return true;
    ensureLoggedInUI();
    if (showMessage) showToast("يرجى تسجيل الدخول أولاً.", "warning");
    return false;
  }

  function isSuperAdmin() {
    return state.adminRole === "admin";
  }

  function isOwnerAdmin() {
    return state.adminRole === "owner";
  }

  function canManageProperty(property) {
    if (isSuperAdmin()) return true;
    if (!isOwnerAdmin()) return false;
    const uid = cleanText(state.currentAuthUser?.uid);
    return cleanText(property?.ownerUid) === uid || normalizeEmail(property?.ownerEmail) === normalizeEmail(state.currentAuthUser?.email);
  }

  function canAccessBooking(booking) {
    if (isSuperAdmin()) return true;
    if (!isOwnerAdmin()) return false;
    const prop = state.properties.find((p) => p.id === cleanText(booking?.propertyId));
    return !!prop && canManageProperty(prop);
  }

  function canAccessChat(chat) {
    if (isSuperAdmin()) return true;
    if (!isOwnerAdmin()) return false;
    if (cleanText(chat.ownerId) === cleanText(state.currentAuthUser?.uid)) return true;
    const prop = state.properties.find((p) => p.id === cleanText(chat?.propertyId));
    return !!prop && canManageProperty(prop);
  }

  function normalizeBooking(raw) {
    const guest = isObject(raw?.guest) ? raw.guest : {};
    const stay = isObject(raw?.stay) ? raw.stay : {};
    const pricing = isObject(raw?.pricing) ? raw.pricing : {};
    const property = isObject(raw?.property) ? raw.property : {};

    const guestName = cleanText(
      pickFirst(
        raw.guestName,
        raw.userName,
        raw.customerName,
        guest.fullName,
        guest.name,
        `${cleanText(guest.firstName)} ${cleanText(guest.familyName)}`.trim(),
        raw.name
      )
    ) || "غير معروف";

    const guestEmail = cleanText(
      pickFirst(raw.guestEmail, raw.userEmail, guest.email, raw.email, raw.customerEmail)
    ) || "—";

    const guestPhone = cleanText(
      pickFirst(raw.guestPhone, raw.phone, guest.phone, raw.customerPhone)
    ) || "—";

    const propertyTitle = cleanText(
      pickFirst(
        raw.propertyTitleAr,
        raw.propertyTitle,
        raw.propertyName,
        property.titleAr,
        property.title,
        property.name
      )
    ) || "عقار غير معروف";

    const checkIn = cleanText(pickFirst(raw.checkIn, raw.arrivalDate, stay.checkIn)) || "—";
    const checkOut = cleanText(pickFirst(raw.checkOut, raw.departureDate, stay.checkOut)) || "—";
    const total = pickFirst(raw.total, raw.totalAmount, raw.amount, raw.price, pricing.total, pricing.totalAmount) || 0;
    const reference = cleanText(pickFirst(raw.reference, raw.bookingReference, raw.bookingRef, raw.id)) || raw.id;
    const userId = cleanText(pickFirst(raw.userId, raw.uid, guest.userId, raw.customerId));
    const propertyId = cleanText(pickFirst(raw.propertyId, raw.listingId, property.id));
    const createdAt = pickFirst(raw.createdAt, raw.createdAtServer, raw.timestamp, raw.dateCreated, raw.createdOn);

    return {
      ...raw,
      guest,
      stay,
      pricing,
      guestName,
      guestEmail,
      guestPhone,
      propertyTitle,
      checkIn,
      checkOut,
      total,
      reference,
      userId,
      propertyId,
      createdAt,
      status: getBookingStatus(raw.status)
    };
  }

  function normalizeChat(raw, id = "") {
    return {
      id: cleanText(id || raw?.id),
      ...raw,
      participants: Array.isArray(raw?.participants) ? raw.participants : [],
      participantIds: normalizeArray(raw?.participantIds),
      userId: cleanText(pickFirst(raw.userId, raw.customerId, raw.clientId)),
      ownerId: cleanText(pickFirst(raw.ownerId, raw.hostId, raw.adminId)),
      bookingId: cleanText(pickFirst(raw.bookingId, raw.reservationId)),
      propertyId: cleanText(pickFirst(raw.propertyId, raw.listingId)),
      userName: cleanText(pickFirst(raw.userName, raw.customerName, raw.clientName, raw.name)),
      userEmail: cleanText(pickFirst(raw.userEmail, raw.customerEmail, raw.email)),
      lastMessage: cleanText(pickFirst(raw.lastMessage, raw.lastText, raw.lastMessageText)),
      updatedAt: pickFirst(raw.updatedAt, raw.lastMessageAt, raw.createdAt)
    };
  }

  function normalizeUser(raw, id) {
    return {
      id,
      ...raw,
      uid: cleanText(pickFirst(raw.uid, id)),
      name: cleanText(pickFirst(raw.name, raw.fullName, raw.displayName, raw.username)),
      email: cleanText(pickFirst(raw.email, raw.userEmail)),
      phone: cleanText(pickFirst(raw.phone, raw.mobile)),
      role: cleanText(raw.role).toLowerCase(),
      createdAt: pickFirst(raw.createdAt, raw.createdAtServer, raw.timestamp)
    };
  }

  async function getAdminRoleFromFirestore(user) {
    if (!user || !db) return { ok: false, role: "" };

    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data() || {};
        const role = cleanText(data.role).toLowerCase();
        if (role === "admin") return { ok: true, role: "admin", userData: data };
        if (role === "owner" || role === "property_admin") {
          return { ok: true, role: "owner", userData: data };
        }
      }
    } catch (error) {
      console.warn("users role lookup failed:", error);
    }

    try {
      const ownerByUid = await db.collection("ownerAccounts").where("uid", "==", user.uid).limit(1).get();
      if (!ownerByUid.empty) {
        const doc = ownerByUid.docs[0];
        const data = doc.data() || {};
        const role = cleanText(data.role || "owner").toLowerCase();
        if (role === "owner" || role === "property_admin" || role === "admin") {
          return {
            ok: true,
            role: role === "admin" ? "admin" : "owner",
            ownerDocId: doc.id,
            ownerData: data
          };
        }
      }
    } catch (error) {
      console.warn("ownerAccounts uid lookup failed:", error);
    }

    try {
      const ownerByEmail = await db.collection("ownerAccounts").where("email", "==", normalizeEmail(user.email)).limit(1).get();
      if (!ownerByEmail.empty) {
        const doc = ownerByEmail.docs[0];
        const data = doc.data() || {};
        const role = cleanText(data.role || "owner").toLowerCase();
        if (role === "owner" || role === "property_admin" || role === "admin") {
          return {
            ok: true,
            role: role === "admin" ? "admin" : "owner",
            ownerDocId: doc.id,
            ownerData: data
          };
        }
      }
    } catch (error) {
      console.warn("ownerAccounts email lookup failed:", error);
    }

    return { ok: false, role: "" };
  }

  async function login(email, password) {
    email = normalizeEmail(email);
    password = cleanText(password);

    if (!email || !password) {
      showToast("أدخل البريد الإلكتروني وكلمة المرور.", "warning");
      return false;
    }

    if (!firebaseReady) {
      showToast("Firebase غير جاهز.", "error");
      return false;
    }

    try {
      const cred = await auth.signInWithEmailAndPassword(email, password);
      const user = cred?.user;
      if (!user) throw new Error("AUTH_USER_NOT_FOUND");

      const roleResult = await getAdminRoleFromFirestore(user);
      if (!roleResult.ok) {
        try { await auth.signOut(); } catch {}
        throw new Error("NOT_AUTHORIZED");
      }

      state.currentAuthUser = user;
      state.currentOwnerRecord = roleResult.ownerData || null;
      state.adminRole = roleResult.role;
      state.ownerAccountDocId = roleResult.ownerDocId || "";
      state.isLoggedIn = true;
      state.activeTab = "dashboard";

      safeSet(ADMIN_SESSION_KEY, "1");
      safeSet(ADMIN_ROLE_KEY, state.adminRole);
      if (state.ownerAccountDocId) safeSet(ADMIN_OWNER_DOC_KEY, state.ownerAccountDocId);
      else safeRemove(ADMIN_OWNER_DOC_KEY);

      ensureLoggedInUI();
      updateProfileUI();
      updateRoleBasedUI();
      activateTab("dashboard", { silentAuth: true });
      await loadAllData();
      showToast("تم تسجيل الدخول بنجاح.", "success");
      return true;
    } catch (error) {
      console.error("admin login error:", error);
      state.isLoggedIn = false;
      state.currentAuthUser = null;
      state.currentOwnerRecord = null;
      state.adminRole = "";
      state.ownerAccountDocId = "";
      safeRemove(ADMIN_SESSION_KEY);
      safeRemove(ADMIN_ROLE_KEY);
      safeRemove(ADMIN_OWNER_DOC_KEY);
      ensureLoggedInUI();
      updateProfileUI();

      let message = "بيانات الدخول غير صحيحة.";
      const code = String(error?.code || "");
      const msg = String(error?.message || "");

      if (msg.includes("NOT_AUTHORIZED")) {
        message = "هذا الحساب لا يملك صلاحية الدخول إلى لوحة التحكم.";
      } else if (code.includes("wrong-password")) {
        message = "كلمة المرور غير صحيحة.";
      } else if (code.includes("user-not-found")) {
        message = "الحساب غير موجود داخل Firebase Authentication.";
      } else if (code.includes("invalid-email")) {
        message = "البريد الإلكتروني غير صالح.";
      } else if (code.includes("too-many-requests")) {
        message = "تمت محاولات كثيرة. حاول مرة أخرى لاحقًا.";
      }

      showToast(message, "error");
      return false;
    }
  }

  async function logout() {
    state.isLoggedIn = false;
    state.activeTab = "dashboard";
    state.adminRole = "";
    state.ownerAccountDocId = "";
    state.currentAuthUser = null;
    state.currentOwnerRecord = null;
    state.properties = [];
    state.bookings = [];
    state.ownerAccounts = [];
    state.chats = [];
    state.users = [];
    state.currentChatId = null;
    state.currentChatMessages = [];

    safeRemove(ADMIN_SESSION_KEY);
    safeRemove(ADMIN_ROLE_KEY);
    safeRemove(ADMIN_OWNER_DOC_KEY);

    if (state.listeners.chats) {
      state.listeners.chats();
      state.listeners.chats = null;
    }
    if (state.listeners.chatMessages) {
      state.listeners.chatMessages();
      state.listeners.chatMessages = null;
    }

    ensureLoggedInUI();
    updateProfileUI();
    updateRoleBasedUI();
    renderCurrentChatMessages();
    renderChatThreads();

    try {
      if (auth?.currentUser) await auth.signOut();
    } catch (error) {
      console.warn("auth signOut failed:", error);
    }

    showToast("تم تسجيل الخروج.", "info");
  }

  function activateTab(tabName, options = {}) {
    if (!options.silentAuth && !requireAuth()) return;

    const requested = cleanText(tabName || "dashboard") || "dashboard";
    state.activeTab = requested;

    if (state.adminRole === "owner" && requested === "owners") {
      state.activeTab = "dashboard";
    }

    qa("[data-tab-target]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tabTarget === state.activeTab);
    });

    qa(".tab-pane").forEach((pane) => pane.classList.remove("active"));
    const explicit = byId(`${state.activeTab}-pane`) || byId(state.activeTab);
    if (explicit && explicit.classList.contains("tab-pane")) explicit.classList.add("active");

    if (state.activeTab === "chats" && state.currentChatId) {
      renderChatThreads();
      renderCurrentChatMessages();
    }
    if (state.activeTab === "add-property") {
      setTimeout(() => state.maps.add?.invalidateSize?.(), 250);
    }
    if (state.activeTab === "properties") renderPropertiesTable();
    if (state.activeTab === "bookings") renderBookings();
    if (state.activeTab === "owners") renderOwnerAccounts();
  }

  async function loadAllData() {
    if (!requireAuth(false) || !firebaseReady) return;

    await loadProperties();
    await Promise.all([
      loadBookings(),
      loadUsers(),
      loadChats(),
      isSuperAdmin() ? loadOwnerAccounts() : Promise.resolve()
    ]);

    if (!isSuperAdmin()) {
      state.ownerAccounts = state.currentOwnerRecord ? [{ id: state.ownerAccountDocId, ...state.currentOwnerRecord }] : [];
    }

    renderDashboardStats();
    updateProfileUI();
    updateRoleBasedUI();
  }

  function renderDashboardStats() {
    const pending = state.bookings.filter((b) => getBookingStatus(b.status) === "pending").length;
    const confirmed = state.bookings.filter((b) => getBookingStatus(b.status) === "confirmed").length;
    const rejected = state.bookings.filter((b) => getBookingStatus(b.status) === "rejected").length;

    setText(String(state.properties.length), "dashboard-properties-count", "mini-properties-count", "stat-properties-count");
    setText(String(state.bookings.length), "dashboard-bookings-count", "mini-bookings-count", "stat-bookings-count");
    setText(String(state.ownerAccounts.length), "stat-owners-count");
    setText(String(state.chats.length), "stat-chats-count");
    setText(String(pending), "pending-bookings-count");
    setText(String(confirmed), "confirmed-bookings-count");
    setText(String(rejected), "rejected-bookings-count");
    setText(String(state.users.length), "dashboard-users-count", "users-count");
  }

  async function loadProperties() {
    const tbody = byId("properties-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;">جارٍ تحميل العقارات...</td></tr>`;
    }

    try {
      const items = [];
      let snap;

      if (isSuperAdmin()) {
        snap = await db.collection("properties").get();
      } else {
        try {
          snap = await db.collection("properties").where("ownerUid", "==", cleanText(state.currentAuthUser?.uid)).get();
        } catch {
          snap = await db.collection("properties").get();
        }
      }

      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));

      let filtered = items;
      if (isOwnerAdmin()) filtered = items.filter(canManageProperty);

      state.properties = filtered.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
        const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
        return bt - at;
      });

      renderPropertiesTable();
      renderDashboardStats();
    } catch (error) {
      console.error("loadProperties error:", error);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;color:#ef4444;">فشل تحميل العقارات.</td></tr>`;
      }
      showToast("تعذر تحميل العقارات.", "error");
    }
  }

  function renderPropertiesTable() {
    const tbody = byId("properties-tbody");
    if (!tbody) return;

    const query = cleanText(getValue("properties-search")).toLowerCase();
    let rows = [...state.properties];

    if (query) {
      rows = rows.filter((prop) =>
        [
          prop.id,
          getPropertyTitle(prop),
          getPropertyLocation(prop),
          getPropertyType(prop),
          cleanText(prop.ownerName),
          cleanText(prop.ownerEmail),
          cleanText(prop.ownerUid)
        ].join(" ").toLowerCase().includes(query)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:28px;">لا توجد عقارات حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((prop) => {
      const visible = prop.isActive !== false && prop.visible !== false;
      const canDelete = isSuperAdmin();
      return `
        <tr>
          <td>
            <img class="prop-thumb" src="${escapeHtml(getPropertyImage(prop))}" alt="${escapeHtml(getPropertyTitle(prop))}" onerror="this.src='images/placeholder.jpg'">
          </td>
          <td>
            <div class="prop-name-cell">
              <strong>${escapeHtml(getPropertyTitle(prop))}</strong>
              <span>#${escapeHtml(prop.id)}</span>
            </div>
          </td>
          <td>${escapeHtml(getPropertyLocation(prop))}</td>
          <td>${escapeHtml(getPropertyType(prop))}</td>
          <td><span class="price-pill">${formatPrice(prop.price || prop.pricePerNight || prop.basePrice || 0)}</span></td>
          <td>${visible ? `<span class="status-badge visible">مرئي</span>` : `<span class="status-badge hidden">مخفي</span>`}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="edit-property-btn" data-id="${escapeHtml(prop.id)}">
                <i class="ph ph-pencil-simple"></i> تعديل
              </button>
              <button type="button" class="toggle-property-btn" data-id="${escapeHtml(prop.id)}" data-visible="${visible ? "1" : "0"}">
                <i class="ph ${visible ? "ph-eye-slash" : "ph-eye"}"></i>
                ${visible ? "إخفاء" : "إظهار"}
              </button>
              ${canDelete ? `
                <button type="button" class="delete-property-btn" data-id="${escapeHtml(prop.id)}">
                  <i class="ph ph-trash"></i> حذف
                </button>
              ` : ``}
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function collectPropertyFormData(prefix = "admin") {
    const titleAr = getValue(`${prefix}-title-ar`);
    const titleEn = getValue(`${prefix}-title-en`);
    const locationAr = getValue(`${prefix}-location-ar`);
    const locationEn = getValue(`${prefix}-location-en`);
    const typeAr = getValue(`${prefix}-type-ar`);
    const typeEn = getValue(`${prefix}-type-en`);
    const descriptionAr = getValue(`${prefix}-description-ar`);
    const descriptionEn = getValue(`${prefix}-description-en`);
    const ownerName = getValue(`${prefix}-owner-name`);
    const ownerEmail = getValue(`${prefix}-owner-email`);
    const ownerPhone = getValue(`${prefix}-owner-phone`);
    const imageUrl = getValue(`${prefix}-image-url`);
    const gallery = getValue(`${prefix}-gallery`);
    const price = toNumber(getValue(`${prefix}-price`), 0);
    const guests = toNumber(getValue(`${prefix}-guests`), 1);
    const bedrooms = toNumber(getValue(`${prefix}-bedrooms`), 0);
    const bathrooms = toNumber(getValue(`${prefix}-bathrooms`), 0);
    const lat = cleanText(getValue(`${prefix}-lat`));
    const lng = cleanText(getValue(`${prefix}-lng`));
    const amenities = normalizeArray(getValue(`${prefix}-amenities`));
    const extras = normalizeArray(getValue(`${prefix}-extras`));

    const allImages = normalizeArray(gallery);
    if (imageUrl && !allImages.includes(imageUrl)) allImages.unshift(imageUrl);

    const title = titleAr || titleEn || "بدون عنوان";
    const location = locationAr || locationEn || "غير محدد";
    const type = typeAr || typeEn || "إقامة";

    const latNum = lat !== "" ? Number(lat) : null;
    const lngNum = lng !== "" ? Number(lng) : null;

    const payload = {
      title,
      titleAr: titleAr || title,
      titleEn: titleEn || title,
      location,
      locationAr: locationAr || location,
      locationEn: locationEn || location,
      type,
      typeAr: typeAr || type,
      typeEn: typeEn || type,
      description: descriptionAr || descriptionEn || "",
      descriptionAr: descriptionAr || descriptionEn || "",
      descriptionEn: descriptionEn || descriptionAr || "",
      ownerName,
      ownerEmail: normalizeEmail(ownerEmail),
      ownerPhone,
      hostName: ownerName,
      imageUrl: imageUrl || allImages[0] || "images/placeholder.jpg",
      mainImage: imageUrl || allImages[0] || "images/placeholder.jpg",
      images: allImages.length ? allImages : ["images/placeholder.jpg"],
      gallery: allImages,
      price,
      basePrice: price,
      pricePerNight: price,
      guests,
      maxGuests: guests,
      bedrooms,
      bathrooms,
      amenities,
      features: amenities,
      extras,
      lat: Number.isFinite(latNum) ? latNum : null,
      lng: Number.isFinite(lngNum) ? lngNum : null,
      latitude: Number.isFinite(latNum) ? latNum : null,
      longitude: Number.isFinite(lngNum) ? lngNum : null,
      slug: slugify(title),
      updatedAt: getServerTimestamp()
    };

    if (isOwnerAdmin()) {
      payload.ownerUid = cleanText(state.currentAuthUser?.uid);
      payload.ownerEmail = normalizeEmail(state.currentAuthUser?.email || ownerEmail);
      payload.ownerName = state.currentOwnerRecord?.name || ownerName;
      payload.hostName = payload.ownerName;
    }

    return payload;
  }

  function validatePropertyData(data) {
    if (!cleanText(data.titleAr || data.title)) return "عنوان العقار مطلوب.";
    if (!cleanText(data.locationAr || data.location)) return "موقع العقار مطلوب.";
    if (!toNumber(data.price, 0)) return "سعر العقار مطلوب.";
    return "";
  }

  async function handleAddPropertySubmit(e) {
    e.preventDefault();
    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");
    if (!requireAuth()) return;

    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    const data = collectPropertyFormData("admin");
    const validation = validatePropertyData(data);
    if (validation) return showToast(validation, "warning");

    setButtonLoading(btn, true, "جارٍ إضافة العقار...");
    try {
      data.createdAt = getServerTimestamp();
      data.isActive = true;
      data.visible = true;
      await db.collection("properties").add(data);
      form.reset();
      resetUploadPreview("admin");
      clearMapCoords("admin");
      hideMapPickedBadge("admin");
      await loadProperties();
      showToast("تمت إضافة العقار بنجاح.", "success");
      activateTab("properties");
    } catch (error) {
      console.error("add property error:", error);
      showToast("تعذر إضافة العقار.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function togglePropertyVisibility(id, visibleNow) {
    if (!firebaseReady) return;
    const prop = state.properties.find((p) => p.id === id);
    if (!prop || !canManageProperty(prop)) {
      showToast("ليست لديك صلاحية تعديل هذا العقار.", "error");
      return;
    }
    try {
      await db.collection("properties").doc(id).update({
        isActive: !visibleNow,
        visible: !visibleNow,
        updatedAt: getServerTimestamp()
      });
      showToast(visibleNow ? "تم إخفاء العقار." : "تم إظهار العقار.", "success");
      await loadProperties();
    } catch (error) {
      console.error("togglePropertyVisibility error:", error);
      showToast("تعذر تحديث حالة العقار.", "error");
    }
  }

  async function deleteProperty(id) {
    if (!firebaseReady) return;
    const prop = state.properties.find((p) => p.id === id);
    if (!prop || !canManageProperty(prop) || !isSuperAdmin()) {
      showToast("حذف العقار متاح للأدمن العام فقط.", "error");
      return;
    }
    if (!window.confirm("هل أنت متأكد من حذف هذا العقار؟")) return;
    try {
      await db.collection("properties").doc(id).delete();
      state.properties = state.properties.filter((p) => p.id !== id);
      renderPropertiesTable();
      renderDashboardStats();
      showToast("تم حذف العقار.", "success");
    } catch (error) {
      console.error("deleteProperty error:", error);
      showToast("تعذر حذف العقار.", "error");
    }
  }

  function openEditPropertyModal(id) {
    const prop = state.properties.find((p) => p.id === id);
    if (!prop) return showToast("العقار غير موجود.", "error");
    if (!canManageProperty(prop)) return showToast("ليست لديك صلاحية تعديل هذا العقار.", "error");

    const modal = byId("edit-modal");
    if (!modal) return showToast("مودال التعديل غير موجود في الصفحة.", "warning");

    modal.classList.add("active");
    document.body.classList.add("modal-open");
    modal.dataset.editId = id;

    setValue(prop.titleAr || prop.title || "", "edit-title-ar");
    setValue(prop.titleEn || "", "edit-title-en");
    setValue(prop.locationAr || prop.location || "", "edit-location-ar");
    setValue(prop.locationEn || "", "edit-location-en");
    setValue(prop.typeAr || prop.type || "", "edit-type-ar");
    setValue(prop.typeEn || "", "edit-type-en");
    setValue(prop.descriptionAr || prop.description || "", "edit-description-ar");
    setValue(prop.descriptionEn || "", "edit-description-en");
    setValue(prop.ownerName || prop.hostName || "", "edit-owner-name");
    setValue(prop.ownerEmail || "", "edit-owner-email");
    setValue(prop.ownerPhone || "", "edit-owner-phone");
    setValue(prop.imageUrl || prop.mainImage || "", "edit-image-url");
    setValue(normalizeArray(prop.images || prop.gallery).join(", "), "edit-gallery");
    setValue(prop.price || prop.basePrice || prop.pricePerNight || "", "edit-price");
    setValue(prop.guests || prop.maxGuests || "", "edit-guests");
    setValue(prop.bedrooms || "", "edit-bedrooms");
    setValue(prop.bathrooms || "", "edit-bathrooms");
    setValue(prop.lat ?? prop.latitude ?? "", "edit-lat");
    setValue(prop.lng ?? prop.longitude ?? "", "edit-lng");
    setValue(normalizeArray(prop.amenities || prop.features).join(", "), "edit-amenities");
    setValue(normalizeArray(prop.extras).join(", "), "edit-extras");

    setUploadPreviewFromUrl("edit", prop.imageUrl || prop.mainImage || "");
    updateMapMarkerFromInputs("edit");
    if ((prop.lat ?? prop.latitude) && (prop.lng ?? prop.longitude)) showMapPickedBadge("edit");
    else hideMapPickedBadge("edit");

    setTimeout(() => state.maps.edit?.invalidateSize?.(), 250);
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
    delete modal.dataset.editId;
  }

  async function handleEditPropertySubmit(e) {
    e.preventDefault();
    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");

    const form = e.currentTarget;
    const modal = form.closest(".modal-overlay") || byId("edit-modal");
    const docId = modal?.dataset.editId;
    if (!docId) return showToast("لم يتم تحديد العقار المراد تعديله.", "error");

    const prop = state.properties.find((p) => p.id === docId);
    if (!prop || !canManageProperty(prop)) return showToast("ليست لديك صلاحية تعديل هذا العقار.", "error");

    const btn = form.querySelector('button[type="submit"]');
    const data = collectPropertyFormData("edit");
    const validation = validatePropertyData(data);
    if (validation) return showToast(validation, "warning");

    if (isOwnerAdmin()) {
      data.ownerUid = cleanText(state.currentAuthUser?.uid);
      data.ownerEmail = normalizeEmail(state.currentAuthUser?.email || data.ownerEmail);
    }

    setButtonLoading(btn, true, "جارٍ حفظ التعديلات...");
    try {
      await db.collection("properties").doc(docId).update(data);
      closeModal(modal);
      await loadProperties();
      showToast("تم تحديث بيانات العقار.", "success");
    } catch (error) {
      console.error("edit property error:", error);
      showToast("تعذر حفظ التعديلات.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function loadBookings() {
    const container = byId("bookings-container");
    if (container) {
      container.innerHTML = `<div class="empty-state"><i class="ph ph-spinner-gap ph-spin"></i><div>جارٍ تحميل الحجوزات...</div></div>`;
    }

    try {
      const items = [];
      let snap;
      try {
        snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
      } catch {
        snap = await db.collection("bookings").get();
      }

      snap.forEach((doc) => items.push(normalizeBooking({ id: doc.id, ...doc.data() })));

      state.bookings = items
        .filter((booking) => isSuperAdmin() || canAccessBooking(booking))
        .sort((a, b) => {
          const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
          const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
          return bt - at;
        });

      renderBookings();
      renderDashboardStats();
    } catch (error) {
      console.error("loadBookings error:", error);
      if (container) {
        container.innerHTML = `<div class="empty-state"><i class="ph ph-warning-circle"></i><div>تعذر تحميل الحجوزات.</div></div>`;
      }
      showToast("تعذر تحميل الحجوزات.", "error");
    }
  }

  function renderBookings() {
    const container = byId("bookings-container");
    if (!container) return;

    const query = cleanText(getValue("bookings-search")).toLowerCase();
    let items = [...state.bookings];

    const counts = {
      all: state.bookings.length,
      pending: state.bookings.filter((b) => getBookingStatus(b.status) === "pending").length,
      confirmed: state.bookings.filter((b) => getBookingStatus(b.status) === "confirmed").length,
      rejected: state.bookings.filter((b) => getBookingStatus(b.status) === "rejected").length
    };

    setText(String(counts.all), "booking-count-all");
    setText(String(counts.pending), "booking-count-pending");
    setText(String(counts.confirmed), "booking-count-confirmed");
    setText(String(counts.rejected), "booking-count-rejected");

    qa("[data-booking-filter]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.bookingFilter === state.bookingFilter);
    });

    if (state.bookingFilter !== "all") {
      items = items.filter((b) => getBookingStatus(b.status) === state.bookingFilter);
    }

    if (query) {
      items = items.filter((b) =>
        [
          b.reference,
          b.guestName,
          b.guestEmail,
          b.guestPhone,
          b.propertyTitle,
          b.propertyId
        ].join(" ").toLowerCase().includes(query)
      );
    }

    if (!items.length) {
      container.innerHTML = `<div class="empty-state"><i class="ph ph-calendar-x"></i><div>لا توجد حجوزات مطابقة حالياً.</div></div>`;
      return;
    }

    container.innerHTML = `
      <div class="bookings-grid">
        ${items.map((booking) => `
          <div class="booking-card" data-status="${escapeHtml(getBookingStatus(booking.status))}">
            <div class="booking-head">
              <div class="booking-title">
                <strong>${escapeHtml(booking.propertyTitle)}</strong>
                <span>المرجع: ${escapeHtml(booking.reference || booking.id)}</span>
              </div>
              ${statusBadge(booking.status)}
            </div>

            <div class="booking-meta-grid">
              <div class="booking-meta-item">
                <label>العميل</label>
                <strong>${escapeHtml(booking.guestName)}</strong>
                <span>${escapeHtml(booking.guestEmail)}</span>
              </div>

              <div class="booking-meta-item">
                <label>الهاتف</label>
                <strong>${escapeHtml(booking.guestPhone)}</strong>
              </div>

              <div class="booking-meta-item">
                <label>تاريخ الدخول</label>
                <strong>${escapeHtml(booking.checkIn)}</strong>
              </div>

              <div class="booking-meta-item">
                <label>تاريخ الخروج</label>
                <strong>${escapeHtml(booking.checkOut)}</strong>
              </div>

              <div class="booking-meta-item">
                <label>الإجمالي</label>
                <strong>${escapeHtml(formatPrice(booking.total))}</strong>
              </div>

              <div class="booking-meta-item">
                <label>تاريخ الإنشاء</label>
                <strong>${escapeHtml(formatDate(booking.createdAt))}</strong>
              </div>
            </div>

            <div class="booking-actions-row">
              <button type="button" class="btn-approve" data-booking-action="approve" data-id="${escapeHtml(booking.id)}" ${getBookingStatus(booking.status) === "confirmed" ? "disabled" : ""}>
                <i class="ph ph-check-circle"></i>
                <span>تأكيد</span>
              </button>

              <button type="button" class="btn-reject" data-booking-action="reject" data-id="${escapeHtml(booking.id)}" ${getBookingStatus(booking.status) === "rejected" ? "disabled" : ""}>
                <i class="ph ph-x-circle"></i>
                <span>رفض</span>
              </button>

              <button type="button" class="btn-open-chat" data-booking-action="chat" data-id="${escapeHtml(booking.id)}">
                <i class="ph ph-chat-centered-dots"></i>
                <span>فتح المحادثة</span>
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }

  async function updateBookingStatus(id, nextStatus) {
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking || !canAccessBooking(booking)) {
      showToast("ليست لديك صلاحية تعديل هذا الحجز.", "error");
      return;
    }

    try {
      await db.collection("bookings").doc(id).update({
        status: nextStatus,
        updatedAt: getServerTimestamp()
      });
      showToast(nextStatus === "confirmed" ? "تم تأكيد الحجز." : "تم رفض الحجز.", "success");
      await loadBookings();
    } catch (error) {
      console.error("updateBookingStatus error:", error);
      showToast("تعذر تحديث حالة الحجز.", "error");
    }
  }

  async function loadUsers() {
    try {
      const items = [];
      const snap = await db.collection("users").get();
      snap.forEach((doc) => items.push(normalizeUser(doc.data() || {}, doc.id)));
      state.users = items;
      renderDashboardStats();
    } catch (error) {
      console.warn("loadUsers error:", error);
      state.users = [];
    }
  }

  async function loadOwnerAccounts() {
    const tbody = byId("owner-accounts-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:26px;">جارٍ تحميل حسابات الملاك...</td></tr>`;
    }

    if (!isSuperAdmin()) {
      state.ownerAccounts = state.currentOwnerRecord ? [{ id: state.ownerAccountDocId, ...state.currentOwnerRecord }] : [];
      renderOwnerAccounts();
      renderDashboardStats();
      return;
    }

    try {
      const items = [];
      const snap = await db.collection("ownerAccounts").get();
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      state.ownerAccounts = items.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
        const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
        return bt - at;
      });
      renderOwnerAccounts();
      renderDashboardStats();
    } catch (error) {
      console.error("loadOwnerAccounts error:", error);
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:26px;color:#ef4444;">تعذر تحميل حسابات الملاك.</td></tr>`;
      }
      showToast("تعذر تحميل حسابات الملاك.", "error");
    }
  }

  function renderOwnerAccounts() {
    const tbody = byId("owner-accounts-tbody");
    if (!tbody) return;

    let rows = [...state.ownerAccounts];
    const query = cleanText(getValue("owners-search")).toLowerCase();

    if (query) {
      rows = rows.filter((owner) =>
        [
          owner.id,
          owner.name,
          owner.email,
          owner.phone,
          owner.username,
          owner.uid
        ].join(" ").toLowerCase().includes(query)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:26px;">لا توجد حسابات ملاك حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((owner) => {
      const active = owner.active !== false;
      return `
        <tr>
          <td>${escapeHtml(owner.name || "—")}</td>
          <td>${escapeHtml(owner.email || "—")}</td>
          <td>${escapeHtml(owner.phone || "—")}</td>
          <td>${escapeHtml(owner.username || "—")}</td>
          <td>${active ? `<span class="status-badge visible">نشط</span>` : `<span class="status-badge hidden">موقوف</span>`}</td>
          <td>
            <div class="table-actions">
              ${isSuperAdmin() ? `
                <button type="button" class="toggle-owner-btn" data-id="${escapeHtml(owner.id)}" data-active="${active ? "1" : "0"}">
                  <i class="ph ${active ? "ph-user-minus" : "ph-user-check"}"></i>
                  ${active ? "إيقاف" : "تفعيل"}
                </button>
              ` : ``}
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function handleOwnerAccountSubmit(e) {
    e.preventDefault();
    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");
    if (!requireAuth()) return;
    if (!isSuperAdmin()) return showToast("إنشاء حسابات الملاك متاح للأدمن العام فقط.", "error");

    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');

    const name = cleanText(getValue("owner-name"));
    const email = normalizeEmail(getValue("owner-email"));
    const phone = cleanText(getValue("owner-phone"));
    const username = cleanText(getValue("owner-username"));
    const password = cleanText(getValue("owner-password"));

    if (!name || !email || !password) {
      return showToast("الاسم والبريد وكلمة المرور مطلوبة.", "warning");
    }

    if (password.length < 6) {
      return showToast("كلمة المرور يجب أن تكون 6 أحرف على الأقل.", "warning");
    }

    setButtonLoading(btn, true, "جارٍ إنشاء الحساب...");

    try {
      let existingOwner = null;
      try {
        const existingSnap = await db.collection("ownerAccounts").where("email", "==", email).limit(1).get();
        if (!existingSnap.empty) existingOwner = { id: existingSnap.docs[0].id, ...existingSnap.docs[0].data() };
      } catch {}

      let uid = cleanText(existingOwner?.uid);

      if (!uid) {
        uid = `owner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }

      const payload = {
        uid,
        name,
        email,
        phone,
        username: username || email.split("@")[0],
        role: "owner",
        active: true,
        createdAt: existingOwner?.createdAt || getServerTimestamp(),
        updatedAt: getServerTimestamp()
      };

      if (existingOwner?.id) {
        await db.collection("ownerAccounts").doc(existingOwner.id).set(payload, { merge: true });
      } else {
        await db.collection("ownerAccounts").add(payload);
      }

      await db.collection("users").doc(uid).set({
        uid,
        name,
        fullName: name,
        displayName: name,
        email,
        phone,
        role: "owner",
        active: true,
        updatedAt: getServerTimestamp(),
        createdAt: existingOwner?.createdAt || getServerTimestamp()
      }, { merge: true });

      form.reset();
      await loadOwnerAccounts();
      showToast("تم حفظ بيانات المالك. أنشئ حساب Auth من Firebase Console أو Cloud Function إن لم يكن موجودًا.", "success");
    } catch (error) {
      console.error("handleOwnerAccountSubmit error:", error);
      showToast("تعذر حفظ حساب المالك.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function toggleOwnerAccount(id, activeNow) {
    if (!isSuperAdmin()) return showToast("هذا الإجراء متاح للأدمن العام فقط.", "error");
    try {
      await db.collection("ownerAccounts").doc(id).update({
        active: !activeNow,
        updatedAt: getServerTimestamp()
      });
      showToast(activeNow ? "تم إيقاف الحساب." : "تم تفعيل الحساب.", "success");
      await loadOwnerAccounts();
    } catch (error) {
      console.error("toggleOwnerAccount error:", error);
      showToast("تعذر تحديث حالة الحساب.", "error");
    }
  }

  async function loadChats() {
    if (state.listeners.chats) {
      state.listeners.chats();
      state.listeners.chats = null;
    }

    try {
      state.listeners.chats = db.collection("chats").onSnapshot(
        (snap) => {
          const items = [];
          snap.forEach((doc) => items.push(normalizeChat(doc.data() || {}, doc.id)));

          state.chats = items
            .filter((chat) => isSuperAdmin() || canAccessChat(chat))
            .sort((a, b) => {
              const at = a.updatedAt?.toMillis?.() || new Date(a.updatedAt || 0).getTime() || 0;
              const bt = b.updatedAt?.toMillis?.() || new Date(b.updatedAt || 0).getTime() || 0;
              return bt - at;
            });

          renderChatThreads();
          renderDashboardStats();

          if (state.currentChatId) {
            const exists = state.chats.some((c) => c.id === state.currentChatId);
            if (!exists) {
              state.currentChatId = null;
              if (state.listeners.chatMessages) {
                state.listeners.chatMessages();
                state.listeners.chatMessages = null;
              }
              state.currentChatMessages = [];
              renderCurrentChatMessages();
            }
          }
        },
        (error) => {
          console.error("loadChats snapshot error:", error);
          showToast("تعذر متابعة المحادثات.", "error");
        }
      );
    } catch (error) {
      console.error("loadChats error:", error);
      showToast("تعذر تحميل المحادثات.", "error");
    }
  }

  function renderChatThreads() {
    const host = byId("admin-chat-list");
    if (!host) return;

    const query = cleanText(getValue("chats-search")).toLowerCase();
    let chats = [...state.chats];

    if (query) {
      chats = chats.filter((chat) =>
        [
          chat.id,
          chat.userName,
          chat.userEmail,
          chat.lastMessage,
          chat.propertyId,
          chat.bookingId
        ].join(" ").toLowerCase().includes(query)
      );
    }

    if (!chats.length) {
      host.innerHTML = `
        <div class="empty-state" style="padding:24px;">
          <i class="ph ph-chat-centered-text"></i>
          <div>لا توجد محادثات حالياً.</div>
        </div>
      `;
      return;
    }

    host.innerHTML = chats.map((chat) => {
      const active = chat.id === state.currentChatId;
      return `
        <button type="button" class="nav-item ${active ? "active" : ""} open-chat-thread-btn" data-chat-id="${escapeHtml(chat.id)}" style="justify-content:space-between;">
          <span style="display:grid;gap:4px;text-align:right;">
            <strong>${escapeHtml(chat.userName || chat.userEmail || "محادثة")}</strong>
            <span style="font-size:.8rem;color:${active ? "#fff" : "var(--text-muted)"};">${escapeHtml(chat.lastMessage || "لا توجد رسائل بعد")}</span>
          </span>
          <i class="ph ph-chat-circle-text"></i>
        </button>
      `;
    }).join("");
  }

  function renderCurrentChatMessages() {
    const titleEl = byId("admin-chat-title");
    const subEl = byId("admin-chat-subtitle");
    const messagesEl = byId("admin-chat-messages");
    if (!messagesEl) return;

    const currentChat = state.chats.find((c) => c.id === state.currentChatId);

    if (!currentChat) {
      setText("اختر محادثة", "admin-chat-title");
      setText("سيظهر هنا اسم العميل أو بريده الإلكتروني.", "admin-chat-subtitle");
      messagesEl.innerHTML = `
        <div class="chat-empty-state">
          <i class="ph ph-chat-circle-dots"></i>
          <div>اختر محادثة من القائمة لعرض الرسائل.</div>
        </div>
      `;
      return;
    }

    if (titleEl) titleEl.textContent = currentChat.userName || currentChat.userEmail || "محادثة";
    if (subEl) subEl.textContent = `العقار: ${currentChat.propertyId || "غير محدد"}${currentChat.bookingId ? ` • الحجز: ${currentChat.bookingId}` : ""}`;

    if (!state.currentChatMessages.length) {
      messagesEl.innerHTML = `
        <div class="chat-empty-state">
          <i class="ph ph-chat-centered"></i>
          <div>لا توجد رسائل في هذه المحادثة بعد.</div>
        </div>
      `;
      return;
    }

    messagesEl.innerHTML = state.currentChatMessages.map((msg) => {
      const senderId = cleanText(msg.senderId || msg.userId || msg.uid);
      const isMine = senderId === cleanText(state.currentAuthUser?.uid) || cleanText(msg.senderRole) === "admin";
      const text = cleanText(msg.text || msg.message || msg.content);
      return `
        <div style="
          align-self:${isMine ? "flex-end" : "flex-start"};
          max-width:min(85%, 520px);
          background:${isMine ? "linear-gradient(135deg,#435abf,#657be0)" : "var(--surface-color)"};
          color:${isMine ? "#fff" : "var(--text-main)"};
          border:${isMine ? "none" : "1px solid var(--border-color)"};
          padding:12px 14px;
          border-radius:18px;
          box-shadow:var(--shadow-sm);
        ">
          <div style="line-height:1.8;">${escapeHtml(text || "—")}</div>
          <div style="margin-top:6px;font-size:.75rem;opacity:${isMine ? ".85" : ".65"};">${escapeHtml(formatDate(msg.createdAt || msg.timestamp))}</div>
        </div>
      `;
    }).join("");

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function openChatThread(chatId) {
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return showToast("المحادثة غير موجودة.", "error");
    if (!canAccessChat(chat)) return showToast("ليست لديك صلاحية الوصول إلى هذه المحادثة.", "error");

    state.currentChatId = chatId;
    renderChatThreads();
    renderCurrentChatMessages();

    if (state.listeners.chatMessages) {
      state.listeners.chatMessages();
      state.listeners.chatMessages = null;
    }

    try {
      state.listeners.chatMessages = db
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .onSnapshot(
          (snap) => {
            const items = [];
            snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
            state.currentChatMessages = items;
            renderCurrentChatMessages();
          },
          (error) => {
            console.error("chat messages snapshot error:", error);
            showToast("تعذر تحميل رسائل المحادثة.", "error");
          }
        );
    } catch (error) {
      console.error("openChatThread error:", error);
      showToast("تعذر فتح المحادثة.", "error");
    }
  }

  async function openBookingChat(bookingId) {
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) return showToast("الحجز غير موجود.", "error");

    let chat = state.chats.find((c) => cleanText(c.bookingId) === bookingId);

    if (!chat) {
      try {
        const payload = {
          bookingId,
          propertyId: cleanText(booking.propertyId),
          ownerId: cleanText(state.currentAuthUser?.uid),
          userId: cleanText(booking.userId),
          userName: cleanText(booking.guestName),
          userEmail: cleanText(booking.guestEmail),
          lastMessage: "",
          createdAt: getServerTimestamp(),
          updatedAt: getServerTimestamp()
        };
        const ref = await db.collection("chats").add(payload);
        chat = { id: ref.id, ...payload };
      } catch (error) {
        console.error("openBookingChat create error:", error);
        return showToast("تعذر إنشاء المحادثة.", "error");
      }
    }

    activateTab("chats");
    await openChatThread(chat.id);
  }

  async function handleSendChatMessage(e) {
    e.preventDefault();
    if (!requireAuth()) return;
    if (!state.currentChatId) return showToast("اختر محادثة أولاً.", "warning");

    const form = e.currentTarget;
    const input = byId("admin-chat-input");
    const btn = byId("admin-chat-send-btn");
    const text = cleanText(input?.value);

    if (!text) return showToast("اكتب رسالة أولاً.", "warning");

    setButtonLoading(btn, true, "جارٍ الإرسال...");

    try {
      const chat = state.chats.find((c) => c.id === state.currentChatId);
      if (!chat || !canAccessChat(chat)) throw new Error("CHAT_ACCESS_DENIED");

      const message = {
        text,
        message: text,
        senderId: cleanText(state.currentAuthUser?.uid),
        senderRole: isSuperAdmin() ? "admin" : "owner",
        senderName: state.currentOwnerRecord?.name || state.currentAuthUser?.displayName || state.currentAuthUser?.email || "الإدارة",
        createdAt: getServerTimestamp()
      };

      await db.collection("chats").doc(state.currentChatId).collection("messages").add(message);
      await db.collection("chats").doc(state.currentChatId).set({
        lastMessage: text,
        updatedAt: getServerTimestamp()
      }, { merge: true });

      form.reset();
    } catch (error) {
      console.error("handleSendChatMessage error:", error);
      showToast("تعذر إرسال الرسالة.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function resetUploadPreview(prefix) {
    const wrap = byId(`${prefix}-upload-preview`);
    const img = byId(`${prefix}-upload-preview-img`);
    const name = byId(`${prefix}-upload-preview-name`);
    const meta = byId(`${prefix}-upload-preview-meta`);
    if (wrap) wrap.classList.remove("visible");
    if (img) img.removeAttribute("src");
    if (name) name.textContent = "";
    if (meta) meta.textContent = "";
  }

  function setUploadPreviewFromFile(prefix, file) {
    const wrap = byId(`${prefix}-upload-preview`);
    const img = byId(`${prefix}-upload-preview-img`);
    const name = byId(`${prefix}-upload-preview-name`);
    const meta = byId(`${prefix}-upload-preview-meta`);
    if (!wrap || !img || !file) return;

    const reader = new FileReader();
    reader.onload = () => {
      img.src = reader.result;
      wrap.classList.add("visible");
      if (name) name.textContent = file.name || "image";
      if (meta) meta.textContent = `${Math.round((file.size || 0) / 1024)} KB`;
    };
    reader.readAsDataURL(file);
  }

  function setUploadPreviewFromUrl(prefix, url) {
    const wrap = byId(`${prefix}-upload-preview`);
    const img = byId(`${prefix}-upload-preview-img`);
    const name = byId(`${prefix}-upload-preview-name`);
    const meta = byId(`${prefix}-upload-preview-meta`);
    if (!wrap || !img) return;
    const cleanUrl = cleanText(url);
    if (!cleanUrl) return resetUploadPreview(prefix);
    img.src = cleanUrl;
    wrap.classList.add("visible");
    if (name) name.textContent = "رابط الصورة";
    if (meta) meta.textContent = cleanUrl;
  }

  function showMapPickedBadge(prefix) {
    byId(`${prefix}-map-picked-badge`)?.classList.add("visible");
  }

  function hideMapPickedBadge(prefix) {
    byId(`${prefix}-map-picked-badge`)?.classList.remove("visible");
  }

  function clearMapCoords(prefix) {
    setValue("", `${prefix}-lat`);
    setValue("", `${prefix}-lng`);
    const key = prefix === "edit" ? "editMarker" : "addMarker";
    if (state.maps[key]) {
      state.maps[key].remove();
      state.maps[key] = null;
    }
  }

  function setMapCoords(prefix, lat, lng) {
    setValue(Number(lat).toFixed(6), `${prefix}-lat`);
    setValue(Number(lng).toFixed(6), `${prefix}-lng`);
    showMapPickedBadge(prefix);
  }

  function updateMapMarker(prefix, lat, lng) {
    if (typeof L === "undefined") return;
    const map = state.maps[prefix];
    const markerKey = prefix === "edit" ? "editMarker" : "addMarker";
    if (!map || !Number.isFinite(lat) || !Number.isFinite(lng)) return;

    if (state.maps[markerKey]) {
      state.maps[markerKey].setLatLng([lat, lng]);
    } else {
      state.maps[markerKey] = L.marker([lat, lng]).addTo(map);
    }
    map.setView([lat, lng], 13);
  }

  function updateMapMarkerFromInputs(prefix) {
    const lat = Number(getValue(`${prefix}-lat`));
    const lng = Number(getValue(`${prefix}-lng`));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    updateMapMarker(prefix, lat, lng);
  }

  async function geocodeQuery(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error("geocode failed");
    return res.json();
  }

  function initMap(prefix, defaultLat = 33.3561, defaultLng = 6.8632, zoom = 6) {
    if (typeof L === "undefined") return;
    const el = byId(`${prefix}-map-picker`);
    if (!el || state.maps[prefix]) return;

    const map = L.map(el).setView([defaultLat, defaultLng], zoom);
    state.maps[prefix] = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    map.on("click", (ev) => {
      const lat = ev.latlng.lat;
      const lng = ev.latlng.lng;
      setMapCoords(prefix, lat, lng);
      updateMapMarker(prefix, lat, lng);
    });
  }

  async function handleMapSearch(prefix) {
    const input = byId(`${prefix}-map-search`);
    const queryText = cleanText(input?.value);
    if (!queryText) return showToast("أدخل موقعًا للبحث.", "warning");

    try {
      const results = await geocodeQuery(queryText);
      if (!Array.isArray(results) || !results.length) {
        return showToast("لم يتم العثور على نتائج لهذا الموقع.", "warning");
      }
      const first = results[0];
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error("invalid geocode result");
      setMapCoords(prefix, lat, lng);
      updateMapMarker(prefix, lat, lng);
    } catch (error) {
      console.error("handleMapSearch error:", error);
      showToast("تعذر البحث عن الموقع.", "error");
    }
  }

  function bindStaticEvents() {
    q("#admin-login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = getValue("admin-user");
      const password = getValue("admin-pass");
      const btn = e.currentTarget.querySelector('button[type="submit"]');
      setButtonLoading(btn, true, "جارٍ تسجيل الدخول...");
      try {
        await login(email, password);
      } finally {
        setButtonLoading(btn, false);
      }
    });

    byId("admin-logout-btn")?.addEventListener("click", logout);

    qa("[data-tab-target]").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget));
    });

    byId("add-property-form")?.addEventListener("submit", handleAddPropertySubmit);
    byId("edit-property-form")?.addEventListener("submit", handleEditPropertySubmit);
    byId("owner-account-form")?.addEventListener("submit", handleOwnerAccountSubmit);
    byId("admin-chat-send-form")?.addEventListener("submit", handleSendChatMessage);

    byId("refresh-properties-btn")?.addEventListener("click", loadProperties);
    byId("refresh-bookings-btn")?.addEventListener("click", loadBookings);
    byId("refresh-owners-btn")?.addEventListener("click", loadOwnerAccounts);
    byId("refresh-chats-btn")?.addEventListener("click", loadChats);

    byId("properties-search")?.addEventListener("input", renderPropertiesTable);
    byId("bookings-search")?.addEventListener("input", renderBookings);
    byId("owners-search")?.addEventListener("input", renderOwnerAccounts);
    byId("chats-search")?.addEventListener("input", renderChatThreads);

    qa("[data-booking-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.bookingFilter = btn.dataset.bookingFilter || "all";
        renderBookings();
      });
    });

    byId("admin-image-file")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) setUploadPreviewFromFile("admin", file);
      else resetUploadPreview("admin");
    });

    byId("edit-image-file")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) setUploadPreviewFromFile("edit", file);
      else resetUploadPreview("edit");
    });

    byId("admin-image-url")?.addEventListener("input", (e) => setUploadPreviewFromUrl("admin", e.target.value));
    byId("edit-image-url")?.addEventListener("input", (e) => setUploadPreviewFromUrl("edit", e.target.value));

    byId("admin-map-search-btn")?.addEventListener("click", () => handleMapSearch("admin"));
    byId("edit-map-search-btn")?.addEventListener("click", () => handleMapSearch("edit"));

    byId("admin-lat")?.addEventListener("change", () => updateMapMarkerFromInputs("admin"));
    byId("admin-lng")?.addEventListener("change", () => updateMapMarkerFromInputs("admin"));
    byId("edit-lat")?.addEventListener("change", () => updateMapMarkerFromInputs("edit"));
    byId("edit-lng")?.addEventListener("change", () => updateMapMarkerFromInputs("edit"));

    qa("[data-close-modal]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.closest(".modal-overlay")));
    });

    qa(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    document.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".edit-property-btn");
      if (editBtn) return openEditPropertyModal(editBtn.dataset.id);

      const toggleBtn = e.target.closest(".toggle-property-btn");
      if (toggleBtn) return togglePropertyVisibility(toggleBtn.dataset.id, toggleBtn.dataset.visible === "1");

      const deleteBtn = e.target.closest(".delete-property-btn");
      if (deleteBtn) return deleteProperty(deleteBtn.dataset.id);

      const bookingActionBtn = e.target.closest("[data-booking-action]");
      if (bookingActionBtn) {
        const id = bookingActionBtn.dataset.id;
        const action = bookingActionBtn.dataset.bookingAction;
        if (action === "approve") return updateBookingStatus(id, "confirmed");
        if (action === "reject") return updateBookingStatus(id, "rejected");
        if (action === "chat") return openBookingChat(id);
      }

      const chatThreadBtn = e.target.closest(".open-chat-thread-btn");
      if (chatThreadBtn) return openChatThread(chatThreadBtn.dataset.chatId);

      const ownerToggleBtn = e.target.closest(".toggle-owner-btn");
      if (ownerToggleBtn) return toggleOwnerAccount(ownerToggleBtn.dataset.id, ownerToggleBtn.dataset.active === "1");
    });
  }

  function restoreSessionUIOnly() {
    const hasSession = safeGet(ADMIN_SESSION_KEY) === "1";
    if (!hasSession) {
      state.isLoggedIn = false;
      ensureLoggedInUI();
      updateProfileUI();
      return;
    }
    state.isLoggedIn = true;
    ensureLoggedInUI();
    updateProfileUI();
    updateRoleBasedUI();
  }

  function bindAuthStateListener() {
    if (!auth) return;

    auth.onAuthStateChanged(async (user) => {
      state.authReady = true;

      if (!user) {
        if (safeGet(ADMIN_SESSION_KEY) === "1") {
          await logout();
        } else {
          state.isLoggedIn = false;
          state.currentAuthUser = null;
          state.currentOwnerRecord = null;
          ensureLoggedInUI();
          updateProfileUI();
        }
        return;
      }

      const hasStoredSession = safeGet(ADMIN_SESSION_KEY) === "1";
      if (!hasStoredSession) return;

      try {
        const roleResult = await getAdminRoleFromFirestore(user);
        if (!roleResult.ok) {
          await auth.signOut();
          return;
        }

        state.currentAuthUser = user;
        state.currentOwnerRecord = roleResult.ownerData || null;
        state.adminRole = roleResult.role;
        state.ownerAccountDocId = roleResult.ownerDocId || "";
        state.isLoggedIn = true;

        safeSet(ADMIN_ROLE_KEY, state.adminRole);
        if (state.ownerAccountDocId) safeSet(ADMIN_OWNER_DOC_KEY, state.ownerAccountDocId);
        else safeRemove(ADMIN_OWNER_DOC_KEY);

        ensureLoggedInUI();
        updateProfileUI();
        updateRoleBasedUI();
        await loadAllData();
      } catch (error) {
        console.error("auth state sync error:", error);
      }
    });
  }

  function init() {
    showFirebaseStatus();
    ensureLoggedInUI();
    updateProfileUI();
    bindStaticEvents();
    initMap("admin");
    initMap("edit");
    restoreSessionUIOnly();
    bindAuthStateListener();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
