"use strict";

(function () {
  const ADMIN_USER = "admin";
  const ADMIN_PASS = "123456";
  const ADMIN_SESSION_KEY = "ore_admin_logged_in";
  const ADMIN_ROLE_KEY = "ore_admin_role";
  const ADMIN_OWNER_DOC_KEY = "ore_admin_owner_doc";

  const firebaseApp =
    typeof firebase !== "undefined" && firebase.apps && firebase.apps.length
      ? firebase.app()
      : null;

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
      if (value === 0) return value;
      if (value === false) return value;
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function deepGet(obj, path) {
    try {
      return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
    } catch {
      return undefined;
    }
  }

  function formatDate(value) {
    if (!value) return "—";
    try {
      if (typeof value?.toDate === "function") {
        return value.toDate().toLocaleString("ar-DZ");
      }
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

  function getRandomRoomNumber() {
    return String(Math.floor(Math.random() * 90) + 10);
  }

  function getApprovalBaseMessage() {
    return "تم قبول حجزك بنجاح.";
  }

  function getRoomNumberMessage(roomNumber) {
    return `رقم الغرفة: ${roomNumber}`;
  }

  function getAutoApprovalMessage(roomNumber) {
    return `تم قبول حجزك بنجاح. رقم الغرفة: ${roomNumber}`;
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

  function ensureAdminLogosVisible() {
    qa('img[src*="orebooking"], img[src*="logo"]').forEach((img) => {
      img.loading = "eager";
      img.decoding = "async";

      if (!img.dataset.logoFallbackBound) {
        img.dataset.logoFallbackBound = "1";
        img.addEventListener("error", function () {
          const steps = [
            "logos/orebooking.png",
            "./logos/orebooking.png",
            "logos/logo.png",
            "./logos/logo.png",
            "./images/logo.png"
          ];

          const current = cleanText(this.getAttribute("src"));
          let index = steps.indexOf(current);
          if (index === -1) index = Number(this.dataset.logoStep || 0);

          const nextIndex = index + 1;
          if (nextIndex < steps.length) {
            this.dataset.logoStep = String(nextIndex);
            this.src = steps[nextIndex];
            return;
          }

          this.style.display = "none";
        });
      }

      const parent = img.parentElement;
      if (parent && getComputedStyle(parent).display === "none") {
        parent.style.display = "flex";
      }
    });
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

  function setHtml(value, ...ids) {
    for (const id of ids) {
      const el = byId(id);
      if (el) {
        el.innerHTML = value ?? "";
        return;
      }
    }
  }

  function getCheckedValues(selector) {
    return qa(selector)
      .filter((el) => el.checked)
      .map((el) => cleanText(el.value))
      .filter(Boolean);
  }

  function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter(Boolean).map((v) => cleanText(v)).filter(Boolean);
    if (typeof value === "string") {
      return value.split(",").map((v) => cleanText(v)).filter(Boolean);
    }
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
    ensureAdminLogosVisible();
  }

  function requireAuth(action = true) {
    if (state.isLoggedIn && state.currentAuthUser) return true;
    ensureLoggedInUI();
    if (action) showToast("يرجى تسجيل الدخول أولاً.", "warning");
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
    return cleanText(property?.ownerUid) === cleanText(state.currentAuthUser?.uid);
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
    const prop = state.properties.find((p) => p.id === cleanText(chat?.propertyId));
    return !!prop && canManageProperty(prop);
  }

  function normalizeBooking(raw) {
    const guest = isObject(raw?.guest) ? raw.guest : {};
    const stay = isObject(raw?.stay) ? raw.stay : {};
    const pricing = isObject(raw?.pricing) ? raw.pricing : {};
    const payment = isObject(raw?.payment) ? raw.payment : {};
    const property = isObject(raw?.property) ? raw.property : {};

    const guestName = cleanText(
      pickFirst(
        raw.guestName,
        raw.userName,
        raw.customerName,
        guest.fullName,
        guest.name,
        `${cleanText(guest.firstName)} ${cleanText(guest.fatherName)} ${cleanText(guest.familyName)}`.trim(),
        raw.name
      )
    ) || "غير معروف";

    const guestEmail = cleanText(
      pickFirst(raw.guestEmail, raw.userEmail, guest.email, raw.email, raw.customerEmail)
    ) || "—";

    const guestPhone = cleanText(
      pickFirst(raw.guestPhone, raw.phone, guest.phone, guest.whatsapp, raw.customerPhone)
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

    const checkIn = cleanText(
      pickFirst(raw.checkIn, raw.arrivalDate, stay.checkIn, stay.arrivalDate)
    ) || "—";

    const checkOut = cleanText(
      pickFirst(raw.checkOut, raw.departureDate, stay.checkOut, stay.departureDate)
    ) || "—";

    const total =
      pickFirst(
        raw.total,
        raw.totalAmount,
        raw.amount,
        raw.price,
        pricing.total,
        pricing.totalAmount,
        pricing.finalTotal,
        pricing.subtotal
      ) || 0;

    const reference = cleanText(
      pickFirst(raw.reference, raw.bookingReference, raw.bookingRef, raw.id)
    ) || raw.id;

    const userId = cleanText(
      pickFirst(raw.userId, raw.uid, guest.userId, raw.customerId)
    );

    const createdAt = pickFirst(raw.createdAt, raw.createdAtServer, raw.timestamp, raw.dateCreated, raw.createdOn);

    return {
      ...raw,
      guest,
      stay,
      pricing,
      payment,
      property,
      guestName,
      guestEmail,
      guestPhone,
      propertyTitle,
      checkIn,
      checkOut,
      total,
      reference,
      userId,
      createdAt,
      roomNumber: cleanText(pickFirst(raw.roomNumber, raw.roomNo, raw.room)),
      approvalReply: cleanText(pickFirst(raw.approvalReply, raw.ownerReply, raw.replyMessage)),
      status: getBookingStatus(raw.status)
    };
  }

  function normalizeChat(raw) {
    return {
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
      createdAt: pickFirst(raw.createdAt, raw.createdAtServer, raw.timestamp)
    };
  }

  async function getAdminRoleFromFirestore(user) {
    if (!user || !db) return { ok: false, role: "" };

    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const role = cleanText(userDoc.data()?.role).toLowerCase();
        if (role === "admin") {
          return { ok: true, role: "admin" };
        }
      }
    } catch (error) {
      console.warn("users role lookup failed:", error);
    }

    try {
      const ownerSnap = await db
        .collection("ownerAccounts")
        .where("uid", "==", user.uid)
        .limit(1)
        .get();

      if (!ownerSnap.empty) {
        const doc = ownerSnap.docs[0];
        const data = doc.data() || {};
        const role = cleanText(data.role || "owner").toLowerCase();
        if (role === "owner" || role === "property_admin") {
          return { ok: true, role: "owner", ownerDocId: doc.id, ownerData: data };
        }
      }
    } catch (error) {
      console.warn("ownerAccounts uid lookup failed:", error);
    }

    return { ok: false, role: "" };
  }

  async function signInWithFirebaseForAdmin(username, password) {
    if (!auth || !db) {
      throw new Error("Firebase Auth not ready");
    }

    username = cleanText(username);
    password = cleanText(password);

    if (username === ADMIN_USER && password === ADMIN_PASS) {
      const adminCandidates = [
        "admin@orebooking.com",
        "admin@orebooking.dz",
        "orebooking.admin@gmail.com"
      ];

      let signed = null;
      for (const email of adminCandidates) {
        try {
          const cred = await auth.signInWithEmailAndPassword(email, password);
          signed = cred;
          break;
        } catch (error) {
          continue;
        }
      }

      if (!signed) {
        throw new Error("ADMIN_FIREBASE_ACCOUNT_NOT_FOUND");
      }

      const roleResult = await getAdminRoleFromFirestore(signed.user);
      if (!roleResult.ok || roleResult.role !== "admin") {
        throw new Error("NOT_AUTHORIZED_ADMIN");
      }

      state.adminRole = "admin";
      state.ownerAccountDocId = "";
      safeSet(ADMIN_ROLE_KEY, "admin");
      safeRemove(ADMIN_OWNER_DOC_KEY);
      return signed.user;
    }

    const ownerSnap = await db
      .collection("ownerAccounts")
      .where("username", "==", username)
      .where("password", "==", password)
      .limit(1)
      .get();

    if (ownerSnap.empty) {
      throw new Error("INVALID_OWNER_CREDENTIALS");
    }

    const ownerDoc = ownerSnap.docs[0];
    const ownerData = ownerDoc.data() || {};
    const ownerEmail = cleanText(ownerData.email);
    const ownerUid = cleanText(ownerData.uid);

    if (!ownerEmail) {
      throw new Error("OWNER_EMAIL_REQUIRED");
    }

    const cred = await auth.signInWithEmailAndPassword(ownerEmail, password);
    if (!cred?.user) {
      throw new Error("OWNER_FIREBASE_LOGIN_FAILED");
    }

    if (ownerUid && ownerUid !== cred.user.uid) {
      throw new Error("OWNER_UID_MISMATCH");
    }

    state.adminRole = "owner";
    state.ownerAccountDocId = ownerDoc.id;
    safeSet(ADMIN_ROLE_KEY, "owner");
    safeSet(ADMIN_OWNER_DOC_KEY, ownerDoc.id);

    return cred.user;
  }

  async function login(username, password) {
    username = cleanText(username);
    password = cleanText(password);

    if (!username || !password) {
      showToast("أدخل اسم المستخدم وكلمة المرور.", "warning");
      return false;
    }

    if (!firebaseReady) {
      showToast("Firebase غير جاهز.", "error");
      return false;
    }

    try {
      const user = await signInWithFirebaseForAdmin(username, password);
      state.currentAuthUser = user;
      state.isLoggedIn = true;
      state.activeTab = "dashboard";
      safeSet(ADMIN_SESSION_KEY, "1");
      ensureLoggedInUI();
      activateTab("dashboard", { silentAuth: true });
      await loadAllData();
      showToast("تم تسجيل الدخول بنجاح.", "success");
      return true;
    } catch (error) {
      console.error("admin login error:", error);
      state.isLoggedIn = false;
      state.currentAuthUser = null;
      state.adminRole = "";
      state.ownerAccountDocId = "";
      safeRemove(ADMIN_SESSION_KEY);
      safeRemove(ADMIN_ROLE_KEY);
      safeRemove(ADMIN_OWNER_DOC_KEY);
      ensureLoggedInUI();

      let message = "بيانات الدخول غير صحيحة.";
      if (String(error?.message || "").includes("ADMIN_FIREBASE_ACCOUNT_NOT_FOUND")) {
        message = "حساب أدمن الموقع غير موجود داخل Firebase Auth.";
      } else if (String(error?.message || "").includes("NOT_AUTHORIZED_ADMIN")) {
        message = "هذا الحساب ليس لديه صلاحية أدمن عام داخل users.role.";
      } else if (String(error?.message || "").includes("OWNER_EMAIL_REQUIRED")) {
        message = "حساب المالك يحتاج email داخل ownerAccounts.";
      } else if (String(error?.message || "").includes("OWNER_UID_MISMATCH")) {
        message = "uid داخل ownerAccounts لا يطابق حساب Firebase Auth.";
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

    state.currentChatId = null;
    state.currentChatMessages = [];
    ensureLoggedInUI();
    renderCurrentChatMessages();

    try {
      if (auth?.currentUser) await auth.signOut();
    } catch (error) {
      console.warn("auth signOut failed:", error);
    }

    showToast("تم تسجيل الخروج.", "info");
  }

  function activateTab(tabName, options = {}) {
    if (!options.silentAuth && !requireAuth()) return;

    state.activeTab = cleanText(tabName || "dashboard") || "dashboard";

    qa("[data-tab-target]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tabTarget === state.activeTab);
    });

    qa(".tab-pane").forEach((pane) => {
      const paneId = pane.id || "";
      const normalized = paneId.replace(/-pane$|tab-|^tab-/g, "");
      const match =
        pane.dataset.tab === state.activeTab ||
        paneId === state.activeTab ||
        normalized === state.activeTab ||
        paneId === `${state.activeTab}-pane`;
      pane.classList.toggle("active", !!match);
    });

    const explicit = byId(`${state.activeTab}-pane`) || byId(state.activeTab);
    if (explicit && explicit.classList.contains("tab-pane")) {
      qa(".tab-pane").forEach((pane) => pane.classList.remove("active"));
      explicit.classList.add("active");
    }

    if (state.activeTab === "chats" && state.currentChatId) {
      renderChatThreads();
      renderCurrentChatMessages();
    }

    if (state.activeTab === "add-property") {
      setTimeout(() => state.maps.add?.invalidateSize?.(), 250);
    }
    if (state.activeTab === "properties") {
      renderPropertiesTable();
    }
    if (state.activeTab === "bookings") {
      renderBookings();
    }
    if (state.activeTab === "owners") {
      renderOwnerAccounts();
    }
  }

  async function loadAllData() {
    if (!requireAuth(false)) return;
    if (!firebaseReady) return;

    await Promise.all([
      loadProperties(),
      loadBookings(),
      loadOwnerAccounts(),
      loadUsers(),
      loadChats()
    ]);

    renderDashboardStats();
  }

  function renderDashboardStats() {
    setStat("stat-properties-count", String(state.properties.length));
    setStat("stat-bookings-count", String(state.bookings.length));
    setStat("stat-owners-count", String(state.ownerAccounts.length));
    setStat("stat-chats-count", String(state.chats.length));

    const pending = state.bookings.filter((b) => getBookingStatus(b.status) === "pending").length;
    const confirmed = state.bookings.filter((b) => getBookingStatus(b.status) === "confirmed").length;
    const rejected = state.bookings.filter((b) => getBookingStatus(b.status) === "rejected").length;

    setText(String(state.properties.length), "dashboard-properties-count", "mini-properties-count");
    setText(String(state.bookings.length), "dashboard-bookings-count", "mini-bookings-count");
    setText(String(pending), "pending-bookings-count", "bookings-count-pending");
    setText(String(confirmed), "confirmed-bookings-count", "bookings-count-confirmed");
    setText(String(rejected), "rejected-bookings-count", "bookings-count-rejected");
    setText(String(state.users.length), "dashboard-users-count", "users-count");
    setText(String(state.bookings.length), "bookings-count-all");
  }

  async function loadProperties() {
    const tbody =
      byId("properties-tbody") ||
      byId("properties-table-body") ||
      byId("properties-list-body") ||
      byId("properties-table-tbody");

    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;">جارٍ تحميل العقارات...</td></tr>`;
    }

    try {
      const items = [];
      let snap;

      if (isSuperAdmin()) {
        snap = await db.collection("properties").get();
      } else {
        snap = await db.collection("properties")
          .where("ownerUid", "==", cleanText(state.currentAuthUser?.uid))
          .get();
      }

      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      state.properties = items.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || 0;
        const bt = b.createdAt?.toMillis?.() || 0;
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
    const tbody =
      byId("properties-tbody") ||
      byId("properties-table-body") ||
      byId("properties-list-body") ||
      byId("properties-table-tbody");

    if (!tbody) return;

    const query = cleanText(getValue("properties-search", "property-search")).toLowerCase();
    let rows = [...state.properties];

    if (query) {
      rows = rows.filter((prop) => {
        return [
          prop.id,
          getPropertyTitle(prop),
          getPropertyLocation(prop),
          getPropertyType(prop),
          cleanText(prop.ownerName),
          cleanText(prop.ownerEmail),
          cleanText(prop.ownerUid)
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:28px;">لا توجد عقارات حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((prop) => {
      const visible = prop.isActive !== false && prop.visible !== false;
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
              <button type="button" class="delete-property-btn" data-id="${escapeHtml(prop.id)}">
                <i class="ph ph-trash"></i> حذف
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function collectPropertyFormData(prefix = "admin") {
    const titleAr = getValue(`${prefix}-title-ar`, `${prefix}-title`, `${prefix}-property-title-ar`, `${prefix}-property-title`);
    const titleEn = getValue(`${prefix}-title-en`, `${prefix}-property-title-en`);
    const locationAr = getValue(`${prefix}-location-ar`, `${prefix}-location`, `${prefix}-property-location-ar`, `${prefix}-property-location`);
    const locationEn = getValue(`${prefix}-location-en`, `${prefix}-property-location-en`);
    const typeAr = getValue(`${prefix}-type-ar`, `${prefix}-type`, `${prefix}-property-type-ar`, `${prefix}-property-type`);
    const typeEn = getValue(`${prefix}-type-en`, `${prefix}-property-type-en`);
    const descriptionAr = getValue(`${prefix}-description-ar`, `${prefix}-description`, `${prefix}-property-description-ar`, `${prefix}-property-description`);
    const descriptionEn = getValue(`${prefix}-description-en`, `${prefix}-property-description-en`);
    const ownerName = getValue(`${prefix}-owner-name`, `${prefix}-host-name`);
    const ownerEmail = getValue(`${prefix}-owner-email`, `${prefix}-host-email`);
    const ownerPhone = getValue(`${prefix}-owner-phone`, `${prefix}-host-phone`);
    const imageUrl = getValue(`${prefix}-image-url`, `${prefix}-main-image`, `${prefix}-photo-url`);
    const gallery = getValue(`${prefix}-gallery`, `${prefix}-images`, `${prefix}-gallery-urls`);
    const price = toNumber(getValue(`${prefix}-price`, `${prefix}-price-per-night`, `${prefix}-night-price`), 0);
    const guests = toNumber(getValue(`${prefix}-guests`, `${prefix}-max-guests`), 1);
    const bedrooms = toNumber(getValue(`${prefix}-bedrooms`, `${prefix}-rooms`), 0);
    const bathrooms = toNumber(getValue(`${prefix}-bathrooms`, `${prefix}-baths`), 0);
    const latRaw = getValue(`${prefix}-lat`, `${prefix}-latitude`);
    const lngRaw = getValue(`${prefix}-lng`, `${prefix}-longitude`);
    const lat = cleanText(latRaw);
    const lng = cleanText(lngRaw);
    const amenitiesText = getValue(`${prefix}-amenities`, `${prefix}-features`);
    const selectedAmenities = getCheckedValues(`[name="${prefix}-amenities"]:checked, [name="${prefix}-features"]:checked`);
    const amenities = selectedAmenities.length ? selectedAmenities : normalizeArray(amenitiesText);
    const extras = normalizeArray(getValue(`${prefix}-extras`, `${prefix}-property-extras`));

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
      ownerEmail,
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
      isActive: true,
      visible: true,
      slug: slugify(title),
      updatedAt: getServerTimestamp()
    };

    if (isOwnerAdmin()) {
      payload.ownerUid = cleanText(state.currentAuthUser?.uid);
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
    const ok = window.confirm("هل أنت متأكد من حذف هذا العقار؟");
    if (!ok) return;
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

    const modal = byId("edit-modal") || byId("edit-property-modal") || byId("property-edit-modal");
    if (!modal) return showToast("مودال التعديل غير موجود في الصفحة.", "warning");

    modal.classList.add("active");
    document.body.classList.add("modal-open");
    modal.dataset.editId = id;

    setValue(prop.titleAr || prop.title || "", "edit-title-ar", "edit-title", "edit-property-title-ar", "edit-property-title");
    setValue(prop.titleEn || "", "edit-title-en", "edit-property-title-en");
    setValue(prop.locationAr || prop.location || "", "edit-location-ar", "edit-location", "edit-property-location-ar", "edit-property-location");
    setValue(prop.locationEn || "", "edit-location-en", "edit-property-location-en");
    setValue(prop.typeAr || prop.type || "", "edit-type-ar", "edit-type", "edit-property-type-ar", "edit-property-type");
    setValue(prop.typeEn || "", "edit-type-en", "edit-property-type-en");
    setValue(prop.descriptionAr || prop.description || "", "edit-description-ar", "edit-description", "edit-property-description-ar", "edit-property-description");
    setValue(prop.descriptionEn || "", "edit-description-en", "edit-property-description-en");
    setValue(prop.ownerName || prop.hostName || "", "edit-owner-name", "edit-host-name");
    setValue(prop.ownerEmail || "", "edit-owner-email", "edit-host-email");
    setValue(prop.ownerPhone || "", "edit-owner-phone", "edit-host-phone");
    setValue(prop.imageUrl || prop.mainImage || "", "edit-image-url", "edit-main-image", "edit-photo-url");
    setValue(normalizeArray(prop.images || prop.gallery).join(", "), "edit-gallery", "edit-images", "edit-gallery-urls");
    setValue(prop.price || prop.basePrice || prop.pricePerNight || "", "edit-price", "edit-price-per-night", "edit-night-price");
    setValue(prop.guests || prop.maxGuests || "", "edit-guests", "edit-max-guests");
    setValue(prop.bedrooms || "", "edit-bedrooms", "edit-rooms");
    setValue(prop.bathrooms || "", "edit-bathrooms", "edit-baths");
    setValue(prop.lat ?? prop.latitude ?? "", "edit-lat", "edit-latitude");
    setValue(prop.lng ?? prop.longitude ?? "", "edit-lng", "edit-longitude");
    setValue(normalizeArray(prop.amenities || prop.features).join(", "), "edit-amenities", "edit-features");
    setValue(normalizeArray(prop.extras).join(", "), "edit-extras", "edit-property-extras");

    setUploadPreviewFromUrl("edit", prop.imageUrl || prop.mainImage || "");
    updateMapMarkerFromInputs("edit");
    if ((prop.lat ?? prop.latitude) && (prop.lng ?? prop.longitude)) {
      showMapPickedBadge("edit");
    } else {
      hideMapPickedBadge("edit");
    }

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
    const modal = form.closest(".modal-overlay") || byId("edit-modal") || byId("edit-property-modal");
    const docId = modal?.dataset.editId;
    if (!docId) return showToast("لم يتم تحديد العقار المراد تعديله.", "error");

    const prop = state.properties.find((p) => p.id === docId);
    if (!prop || !canManageProperty(prop)) {
      return showToast("ليست لديك صلاحية تعديل هذا العقار.", "error");
    }

    const btn = form.querySelector('button[type="submit"]');
    const data = collectPropertyFormData("edit");
    const validation = validatePropertyData(data);
    if (validation) return showToast(validation, "warning");

    if (isOwnerAdmin()) {
      data.ownerUid = cleanText(state.currentAuthUser?.uid);
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
    const tbody = byId("bookings-tbody");

    if (container) {
      container.innerHTML = `<div class="empty-state"><i class="ph ph-spinner-gap ph-spin"></i><div>جارٍ تحميل الحجوزات...</div></div>`;
    }
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;">جارٍ تحميل الحجوزات...</td></tr>`;
    }

    try {
      const items = [];
      let snap;

      if (isSuperAdmin()) {
        try {
          snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
        } catch {
          snap = await db.collection("bookings").get();
        }
      } else {
        const propertyIds = state.properties.map((p) => p.id).filter(Boolean);
        if (!propertyIds.length) {
          state.bookings = [];
          renderBookings();
          renderDashboardStats();
          return;
        }

        const all = [];
        for (const propertyId of propertyIds) {
          const part = await db.collection("bookings").where("propertyId", "==", propertyId).get();
          part.forEach((doc) => all.push(normalizeBooking({ id: doc.id, ...doc.data() })));
        }
        state.bookings = all.sort((a, b) => {
          const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
          const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
          return bt - at;
        });
        renderBookings();
        renderDashboardStats();
        return;
      }

      snap.forEach((doc) => items.push(normalizeBooking({ id: doc.id, ...doc.data() })));
      items.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
        const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
        return bt - at;
      });

      state.bookings = items;
      renderBookings();
      renderDashboardStats();
    } catch (error) {
      console.error("loadBookings error:", error);
      if (container) {
        container.innerHTML = `<div class="empty-state"><i class="ph ph-warning-circle"></i><div>تعذر تحميل الحجوزات.</div></div>`;
      }
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;color:#ef4444;">تعذر تحميل الحجوزات.</td></tr>`;
      }
      showToast("تعذر تحميل الحجوزات.", "error");
    }
  }

  function renderBookings() {
    const container = byId("bookings-container");
    const tbody = byId("bookings-tbody");

    const counts = {
      all: state.bookings.length,
      pending: state.bookings.filter((b) => getBookingStatus(b.status) === "pending").length,
      confirmed: state.bookings.filter((b) => getBookingStatus(b.status) === "confirmed").length,
      rejected: state.bookings.filter((b) => getBookingStatus(b.status) === "rejected").length
    };

    setText(String(counts.all), "booking-count-all", "all-bookings-count", "bookings-count-all");
    setText(String(counts.pending), "booking-count-pending", "pending-bookings-filter-count", "bookings-count-pending");
    setText(String(counts.confirmed), "booking-count-confirmed", "confirmed-bookings-filter-count", "bookings-count-confirmed");
    setText(String(counts.rejected), "booking-count-rejected", "rejected-bookings-filter-count", "bookings-count-rejected");

    let rows = [...state.bookings];

    if (state.bookingFilter !== "all") {
      rows = rows.filter((b) => getBookingStatus(b.status) === state.bookingFilter);
    }

    const query = cleanText(getValue("bookings-search", "booking-search")).toLowerCase();
    if (query) {
      rows = rows.filter((b) => {
        const hay = [
          b.id,
          b.reference,
          b.bookingReference,
          b.userName,
          b.guestName,
          b.userEmail,
          b.guestEmail,
          b.propertyTitle,
          b.propertyTitleAr,
          b.propertyName,
          b.phone,
          b.guestPhone,
          b.userId,
          b.roomNumber,
          b.approvalReply,
          deepGet(b, "guest.fullName"),
          deepGet(b, "guest.email"),
          deepGet(b, "guest.phone"),
          deepGet(b, "stay.checkIn"),
          deepGet(b, "stay.checkOut")
        ].join(" ").toLowerCase();
        return hay.includes(query);
      });
    }

    if (tbody) {
      if (!rows.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:28px;">لا توجد حجوزات حالياً.</td></tr>`;
      } else {
        tbody.innerHTML = rows.map((booking) => {
          const status = getBookingStatus(booking.status);
          return `
            <tr>
              <td>${escapeHtml(cleanText(booking.reference || booking.id))}</td>
              <td>${escapeHtml(cleanText(booking.guestName))}</td>
              <td>${escapeHtml(cleanText(booking.propertyTitle))}</td>
              <td>${escapeHtml(`${cleanText(booking.checkIn)} ← ${cleanText(booking.checkOut)}`)}</td>
              <td><span class="price-pill">${formatPrice(booking.total || 0)}</span></td>
              <td>${escapeHtml(cleanText(booking.roomNumber || "—"))}</td>
              <td>${statusBadge(status)}</td>
              <td>${escapeHtml(cleanText(booking.approvalReply || booking.ownerReply || booking.replyMessage || "—"))}</td>
              <td>
                <div class="table-actions">
                  <button type="button" class="btn-approve" data-booking-id="${escapeHtml(booking.id)}" ${status === "confirmed" ? "disabled" : ""}>
                    <i class="ph ph-check"></i> قبول
                  </button>
                  <button type="button" class="btn-reject" data-booking-id="${escapeHtml(booking.id)}" ${status === "rejected" ? "disabled" : ""}>
                    <i class="ph ph-x"></i> رفض
                  </button>
                  <button type="button" class="btn-open-chat" data-booking-id="${escapeHtml(booking.id)}" ${!(booking.userId || booking.guestEmail) ? "disabled" : ""}>
                    <i class="ph ph-chat-centered-text"></i> محادثة
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join("");
      }
    }

    if (!container) return;

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state"><i class="ph ph-calendar-x"></i><div>لا توجد حجوزات حالياً.</div></div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "bookings-grid";

    grid.innerHTML = rows.map((booking) => {
      const status = getBookingStatus(booking.status);
      const title = cleanText(booking.propertyTitle);
      const guest = cleanText(booking.guestName);
      const email = cleanText(booking.guestEmail);
      const phone = cleanText(booking.guestPhone);
      const checkIn = cleanText(booking.checkIn);
      const checkOut = cleanText(booking.checkOut);
      const total = booking.total || 0;
      const reference = cleanText(booking.reference || booking.id);
      const canOpenChat = !!(booking.userId || booking.guestEmail);
      const roomNumber = cleanText(booking.roomNumber || "—");
      const reply = cleanText(booking.approvalReply || booking.ownerReply || booking.replyMessage || "—");

      return `
        <div class="booking-card" data-status="${status}">
          <div class="booking-head">
            <div class="booking-title">
              <strong>${escapeHtml(title)}</strong>
              <span>مرجع الحجز: ${escapeHtml(reference)}</span>
            </div>
            ${statusBadge(status)}
          </div>

          <div class="booking-meta-grid">
            <div class="booking-meta-item"><label>الضيف</label><strong>${escapeHtml(guest)}</strong></div>
            <div class="booking-meta-item"><label>البريد</label><span>${escapeHtml(email)}</span></div>
            <div class="booking-meta-item"><label>الهاتف</label><span>${escapeHtml(phone)}</span></div>
            <div class="booking-meta-item"><label>الإجمالي</label><strong>${formatPrice(total)}</strong></div>
            <div class="booking-meta-item"><label>تاريخ الدخول</label><span>${escapeHtml(checkIn)}</span></div>
            <div class="booking-meta-item"><label>تاريخ الخروج</label><span>${escapeHtml(checkOut)}</span></div>
            <div class="booking-meta-item"><label>رقم الغرفة</label><strong>${escapeHtml(roomNumber)}</strong></div>
            <div class="booking-meta-item"><label>الرد</label><span>${escapeHtml(reply)}</span></div>
          </div>

          <div class="booking-actions-row">
            <button type="button" class="btn-approve" data-booking-id="${escapeHtml(booking.id)}" ${status === "confirmed" ? "disabled" : ""}>
              <i class="ph ph-check"></i> قبول
            </button>
            <button type="button" class="btn-reject" data-booking-id="${escapeHtml(booking.id)}" ${status === "rejected" ? "disabled" : ""}>
              <i class="ph ph-x"></i> رفض
            </button>
            <button type="button" class="btn-open-chat" data-booking-id="${escapeHtml(booking.id)}" ${canOpenChat ? "" : "disabled"}>
              <i class="ph ph-chat-centered-text"></i> محادثة
            </button>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = "";
    container.appendChild(grid);
  }

  async function addBookingApprovalMessages(booking, approvalReply, roomNumberReply, roomNumber) {
    if (!firebaseReady || !booking) return;

    const tasks = [];

    try {
      if (booking.userId) {
        tasks.push(
          db.collection("notifications").add({
            userId: booking.userId,
            bookingId: booking.id,
            propertyId: booking.propertyId || "",
            type: "booking_confirmed",
            title: "تم قبول الحجز",
            message: approvalReply,
            read: false,
            createdAt: getServerTimestamp()
          })
        );

        tasks.push(
          db.collection("notifications").add({
            userId: booking.userId,
            bookingId: booking.id,
            propertyId: booking.propertyId || "",
            type: "room_number",
            title: "رقم الغرفة",
            message: roomNumberReply,
            roomNumber,
            read: false,
            createdAt: getServerTimestamp()
          })
        );
      }
    } catch (error) {
      console.warn("notifications add failed:", error);
    }

    try {
      tasks.push(
        db.collection("bookingReplies").add({
          bookingId: booking.id,
          propertyId: booking.propertyId || "",
          userId: booking.userId || "",
          guestEmail: booking.guestEmail || "",
          guestName: booking.guestName || "",
          ownerId: cleanText(state.currentAuthUser?.uid),
          ownerEmail: normalizeEmail(state.currentAuthUser?.email),
          message: approvalReply,
          type: "approval",
          createdAt: getServerTimestamp()
        })
      );

      tasks.push(
        db.collection("bookingReplies").add({
          bookingId: booking.id,
          propertyId: booking.propertyId || "",
          userId: booking.userId || "",
          guestEmail: booking.guestEmail || "",
          guestName: booking.guestName || "",
          ownerId: cleanText(state.currentAuthUser?.uid),
          ownerEmail: normalizeEmail(state.currentAuthUser?.email),
          message: roomNumberReply,
          roomNumber,
          type: "room_number",
          createdAt: getServerTimestamp()
        })
      );
    } catch (error) {
      console.warn("bookingReplies add failed:", error);
    }

    try {
      const existingChat = await findExistingChatForBooking(booking);
      let actualChatId = existingChat?.id || "";

      if (!actualChatId) {
        actualChatId = await createRealChatFromBooking(booking.id);
      }

      if (actualChatId) {
        const chatRef = db.collection("chats").doc(actualChatId);

        const approvalPayload = {
          text: approvalReply,
          message: approvalReply,
          senderRole: isSuperAdmin() ? "admin" : "owner",
          senderName: isSuperAdmin() ? "الإدارة" : "مالك العقار",
          bookingId: booking.id,
          propertyId: booking.propertyId || "",
          userId: booking.userId || "",
          createdAt: getServerTimestamp()
        };

        const roomPayload = {
          text: roomNumberReply,
          message: roomNumberReply,
          senderRole: isSuperAdmin() ? "admin" : "owner",
          senderName: isSuperAdmin() ? "الإدارة" : "مالك العقار",
          bookingId: booking.id,
          propertyId: booking.propertyId || "",
          userId: booking.userId || "",
          roomNumber,
          createdAt: getServerTimestamp()
        };

        try {
          await chatRef.collection("messages").add(approvalPayload);
          await chatRef.collection("messages").add(roomPayload);
        } catch {
          await db.collection("messages").add({ ...approvalPayload, chatId: actualChatId });
          await db.collection("messages").add({ ...roomPayload, chatId: actualChatId });
        }

        await chatRef.set(
          {
            lastMessage: roomNumberReply,
            lastText: roomNumberReply,
            lastMessageAt: getServerTimestamp(),
            updatedAt: getServerTimestamp()
          },
          { merge: true }
        );
      }
    } catch (error) {
      console.warn("chat approval messages failed:", error);
    }

    await Promise.allSettled(tasks);
  }

  async function updateBookingStatus(id, status) {
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking || !canAccessBooking(booking)) {
      showToast("ليست لديك صلاحية تعديل هذا الحجز.", "error");
      return;
    }

    try {
      const normalizedStatus = getBookingStatus(status);

      if (normalizedStatus === "confirmed") {
        const roomNumber = getRandomRoomNumber();
        const approvalBaseMessage = getApprovalBaseMessage();
        const roomNumberMessage = getRoomNumberMessage(roomNumber);
        const autoApprovalMessage = getAutoApprovalMessage(roomNumber);

        await db.collection("bookings").doc(id).set(
          {
            status: "confirmed",
            roomNumber,
            approvalReply: approvalBaseMessage,
            replyMessage: roomNumberMessage,
            ownerReply: autoApprovalMessage,
            approvedAt: getServerTimestamp(),
            updatedAt: getServerTimestamp()
          },
          { merge: true }
        );

        await addBookingApprovalMessages(
          booking,
          approvalBaseMessage,
          roomNumberMessage,
          roomNumber
        );

        showToast(`تم قبول الحجز وإرسال رقم الغرفة ${roomNumber}`, "success");
        await loadBookings();
        return;
      }

      await db.collection("bookings").doc(id).set(
        {
          status: normalizedStatus,
          updatedAt: getServerTimestamp()
        },
        { merge: true }
      );

      showToast(`تم تحديث حالة الحجز إلى: ${statusLabel(normalizedStatus)}`, "success");
      await loadBookings();
    } catch (error) {
      console.error("updateBookingStatus error:", error);
      showToast("تعذر تحديث حالة الحجز.", "error");
    }
  }

  async function loadOwnerAccounts() {
    const tbody = byId("owner-accounts-tbody") || byId("owners-tbody") || byId("owner-table-body") || byId("accounts-tbody");
    if (tbody) tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;">جارٍ تحميل الحسابات...</td></tr>`;

    try {
      let items = [];
      if (isSuperAdmin()) {
        const snap = await db.collection("ownerAccounts").get();
        snap.forEach((doc) => items.push({ id: doc.id, ...doc.data(), collection: "ownerAccounts" }));
      } else if (state.ownerAccountDocId) {
        const doc = await db.collection("ownerAccounts").doc(state.ownerAccountDocId).get();
        if (doc.exists) items.push({ id: doc.id, ...doc.data(), collection: "ownerAccounts" });
      }

      items = items.filter((item) => {
        const role = cleanText(item.role || item.accountType || item.type).toLowerCase();
        return !role || role.includes("owner") || role.includes("property");
      });

      state.ownerAccounts = items;
      renderOwnerAccounts();
      renderDashboardStats();
    } catch (error) {
      console.error("loadOwnerAccounts error:", error);
      if (tbody) tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;color:#ef4444;">فشل تحميل الحسابات.</td></tr>`;
      showToast("تعذر تحميل حسابات الملاك.", "error");
    }
  }

  function renderOwnerAccounts() {
    const tbody = byId("owner-accounts-tbody") || byId("owners-tbody") || byId("owner-table-body") || byId("accounts-tbody");
    if (!tbody) return;

    const query = cleanText(getValue("owners-search", "owner-search")).toLowerCase();
    let rows = [...state.ownerAccounts];

    if (query) {
      rows = rows.filter((item) => {
        return [
          item.id,
          item.name,
          item.fullName,
          item.ownerName,
          item.email,
          item.phone,
          item.username,
          item.propertyName,
          item.propertyId
        ].join(" ").toLowerCase().includes(query);
      });
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:24px;">لا توجد حسابات حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((item) => {
      const name = cleanText(item.name || item.fullName || item.ownerName);
      const email = cleanText(item.email);
      const phone = cleanText(item.phone);
      const username = cleanText(item.username);
      const active = item.isActive !== false && item.active !== false;

      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(email)}</td>
          <td>${escapeHtml(phone)}</td>
          <td>${escapeHtml(username)}</td>
          <td>${active ? `<span class="status-badge visible">نشط</span>` : `<span class="status-badge hidden">معطل</span>`}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="edit-owner-btn" data-id="${escapeHtml(item.id)}">
                <i class="ph ph-pencil-simple"></i> تعديل
              </button>
              ${isSuperAdmin() ? `
                <button type="button" class="delete-owner-btn" data-id="${escapeHtml(item.id)}">
                  <i class="ph ph-trash"></i> حذف
                </button>
              ` : ``}
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  function collectOwnerFormData(prefix = "owner") {
    return {
      name: getValue(`${prefix}-name`, `${prefix}-full-name`),
      fullName: getValue(`${prefix}-full-name`, `${prefix}-name`),
      email: getValue(`${prefix}-email`),
      phone: getValue(`${prefix}-phone`),
      username: getValue(`${prefix}-username`),
      password: getValue(`${prefix}-password`),
      role: "owner",
      accountType: "owner",
      isActive: true,
      active: true,
      updatedAt: getServerTimestamp()
    };
  }

  async function handleOwnerFormSubmit(e) {
    e.preventDefault();
    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");
    if (!isSuperAdmin() && !isOwnerAdmin()) return showToast("ليست لديك صلاحية.", "error");

    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    const editId = form.dataset.editId;
    const data = collectOwnerFormData("owner");

    if (!data.name || !data.email) return showToast("الاسم والبريد مطلوبان.", "warning");
    if (!isSuperAdmin() && editId && editId !== state.ownerAccountDocId) return showToast("ليست لديك صلاحية تعديل هذا الحساب.", "error");

    setButtonLoading(btn, true, editId ? "جارٍ حفظ التعديلات..." : "جارٍ إضافة الحساب...");
    try {
      const collectionName = "ownerAccounts";
      if (editId) {
        await db.collection(collectionName).doc(editId).update(data);
        showToast("تم تحديث الحساب.", "success");
      } else {
        if (!isSuperAdmin()) {
          showToast("إضافة حساب مالك متاحة للأدمن العام فقط.", "error");
          return;
        }
        data.createdAt = getServerTimestamp();
        await db.collection(collectionName).add(data);
        showToast("تمت إضافة الحساب.", "success");
      }

      form.reset();
      delete form.dataset.editId;
      await loadOwnerAccounts();
    } catch (error) {
      console.error("owner form error:", error);
      showToast("تعذر حفظ الحساب.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function fillOwnerForm(id) {
    const item = state.ownerAccounts.find((x) => x.id === id);
    if (!item) return;
    if (!isSuperAdmin() && id !== state.ownerAccountDocId) {
      showToast("ليست لديك صلاحية تعديل هذا الحساب.", "error");
      return;
    }

    setValue(item.name || item.fullName || "", "owner-name", "owner-full-name");
    setValue(item.email || "", "owner-email");
    setValue(item.phone || "", "owner-phone");
    setValue(item.username || "", "owner-username");
    setValue(item.password || "", "owner-password");

    const form = byId("owner-account-form") || byId("owner-form");
    if (form) form.dataset.editId = id;
    activateTab("owners");
    showToast("تم تحميل بيانات الحساب للتعديل.", "info");
  }

  async function deleteOwnerAccount(id) {
    if (!isSuperAdmin()) {
      showToast("حذف الحسابات متاح للأدمن العام فقط.", "error");
      return;
    }
    if (!window.confirm("هل أنت متأكد من حذف هذا الحساب؟")) return;

    try {
      await db.collection("ownerAccounts").doc(id).delete();
      showToast("تم حذف الحساب.", "success");
      await loadOwnerAccounts();
    } catch (error) {
      console.error("deleteOwnerAccount error:", error);
      showToast("تعذر حذف الحساب.", "error");
    }
  }

  async function loadUsers() {
    try {
      let items = [];
      if (isSuperAdmin()) {
        const snap = await db.collection("users").get();
        snap.forEach((doc) => items.push(normalizeUser({ collection: "users", ...doc.data() }, doc.id)));
      } else {
        items = state.users;
      }

      state.users = items.sort((a, b) => {
        const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
        const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
        return bt - at;
      });
    } catch (error) {
      console.error("loadUsers error:", error);
      state.users = [];
    }
  }

  async function loadChats() {
    const list = byId("admin-chat-list") || byId("chats-list") || byId("chat-threads-list");
    if (list) {
      list.innerHTML = `<div class="empty-state" style="padding:24px;"><i class="ph ph-spinner-gap ph-spin"></i><div>جارٍ تحميل المحادثات...</div></div>`;
    }

    if (state.listeners.chats) {
      state.listeners.chats();
      state.listeners.chats = null;
    }

    try {
      let queryRef = db.collection("chats");

      if (!isSuperAdmin()) {
        const propertyIds = state.properties.map((p) => p.id).filter(Boolean).slice(0, 10);
        if (propertyIds.length) {
          queryRef = queryRef.where("propertyId", "in", propertyIds);
        }
      }

      state.listeners.chats = queryRef.onSnapshot(async (snap) => {
        const items = [];
        snap.forEach((doc) => items.push(normalizeChat({ id: doc.id, ...doc.data() })));

        const bookingDerivedThreads = derivePseudoChatsFromBookings();
        const merged = mergeChats(items, bookingDerivedThreads);

        merged.sort((a, b) => {
          const at = a.updatedAt?.toMillis?.() || new Date(a.updatedAt || 0).getTime() || 0;
          const bt = b.updatedAt?.toMillis?.() || new Date(b.updatedAt || 0).getTime() || 0;
          return bt - at;
        });

        state.chats = merged.filter((chat) => isSuperAdmin() || canAccessChat(chat) || chat.pseudo);
        renderChatThreads();

        if (state.currentChatId && !state.chats.find((x) => x.id === state.currentChatId)) {
          state.currentChatId = null;
          state.currentChatMessages = [];
        }

        if (state.currentChatId) {
          if (state.currentChatId.startsWith("booking-thread-")) {
            loadPseudoChatMessages(state.currentChatId);
          } else {
            subscribeToChatMessages(state.currentChatId);
          }
        }

        renderDashboardStats();
      }, async (error) => {
        console.error("loadChats listener error:", error);
        const fallback = derivePseudoChatsFromBookings();
        state.chats = fallback.filter((chat) => isSuperAdmin() || canAccessChat(chat) || chat.pseudo);
        renderChatThreads();
      });
    } catch (error) {
      console.error("loadChats error:", error);
      state.chats = derivePseudoChatsFromBookings().filter((chat) => isSuperAdmin() || canAccessChat(chat) || chat.pseudo);
      renderChatThreads();
      showToast("تعذر تحميل المحادثات.", "error");
    }
  }

  function derivePseudoChatsFromBookings() {
    return state.bookings.map((booking) => ({
      id: `booking-thread-${booking.id}`,
      pseudo: true,
      bookingId: booking.id,
      userId: booking.userId,
      userEmail: booking.guestEmail,
      userName: booking.guestName,
      propertyId: booking.propertyId,
      propertyTitle: booking.propertyTitle,
      lastMessage: booking.reference,
      updatedAt: booking.createdAt,
      booking
    }));
  }

  function mergeChats(realChats, derivedChats) {
    const map = new Map();

    realChats.forEach((chat) => map.set(chat.id, chat));

    derivedChats.forEach((chat) => {
      const exists = realChats.some((real) => {
        return (
          (chat.bookingId && real.bookingId && chat.bookingId === real.bookingId) ||
          (chat.userId && real.userId && chat.userId === real.userId) ||
          (chat.userEmail && real.userEmail && normalizeEmail(chat.userEmail) === normalizeEmail(real.userEmail))
        );
      });
      if (!exists) map.set(chat.id, chat);
    });

    return Array.from(map.values());
  }

  function renderChatThreads() {
    const list = byId("admin-chat-list") || byId("chats-list") || byId("chat-threads-list");
    if (!list) return;

    const query = cleanText(getValue("chats-search", "chat-search")).toLowerCase();
    let rows = [...state.chats];

    if (query) {
      rows = rows.filter((chat) => {
        return [
          chat.id,
          chat.userName,
          chat.userEmail,
          chat.lastMessage,
          chat.bookingId,
          chat.propertyTitle,
          chat.userId
        ].join(" ").toLowerCase().includes(query);
      });
    }

    if (!rows.length) {
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-centered-dots"></i><div>لا توجد محادثات حالياً.</div></div>`;
      return;
    }

    list.innerHTML = rows.map((chat) => {
      const name = cleanText(chat.userName || chat.customerName || chat.name || chat.userEmail || chat.id);
      const subtitle = cleanText(chat.lastMessage || chat.lastText);
      const isActive = state.currentChatId === chat.id;
      const smallMeta = cleanText(chat.propertyTitle || chat.bookingId);

      return `
        <button
          type="button"
          class="chat-thread-item ${isActive ? "active" : ""}"
          data-chat-id="${escapeHtml(chat.id)}"
          style="
            width:100%;
            border:1px solid var(--border-color,#e2e8f0);
            background:${isActive ? "rgba(67,90,191,.08)" : "#fff"};
            border-radius:16px;
            padding:14px;
            text-align:right;
            cursor:pointer;
            display:grid;
            gap:6px;
            margin-bottom:10px;
          "
        >
          <strong style="font-size:.95rem;color:var(--text-main,#0f172a);">${escapeHtml(name)}</strong>
          <span style="font-size:.82rem;color:var(--text-muted,#64748b);line-height:1.6;">${escapeHtml(subtitle)}</span>
          ${smallMeta ? `<small style="color:#94a3b8;">${escapeHtml(smallMeta)}</small>` : ""}
        </button>
      `;
    }).join("");
  }

  function openChat(chatId) {
    if (!requireAuth()) return;

    state.currentChatId = chatId;
    renderChatThreads();

    const titleEl = byId("admin-chat-title") || byId("chat-room-title");
    const subEl = byId("admin-chat-subtitle") || byId("chat-room-subtitle");
    const chat = state.chats.find((c) => c.id === chatId);

    if (titleEl) titleEl.textContent = cleanText(chat?.userName || chat?.customerName || chat?.userEmail || chatId);
    if (subEl) subEl.textContent = cleanText(chat?.propertyTitle || chat?.bookingId || chat?.lastMessage);

    if (chatId.startsWith("booking-thread-")) {
      loadPseudoChatMessages(chatId);
    } else {
      subscribeToChatMessages(chatId);
    }
  }

  function subscribeToChatMessages(chatId) {
    if (state.listeners.chatMessages) {
      state.listeners.chatMessages();
      state.listeners.chatMessages = null;
    }

    const list = byId("admin-chat-messages") || byId("chat-messages-list") || byId("chat-messages");
    if (list) {
      list.innerHTML = `<div class="empty-state"><i class="ph ph-spinner-gap ph-spin"></i><div>جارٍ تحميل الرسائل...</div></div>`;
    }

    try {
      state.listeners.chatMessages = db
        .collection("chats")
        .doc(chatId)
        .collection("messages")
        .orderBy("createdAt", "asc")
        .onSnapshot(async (snap) => {
          const messages = [];
          snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
          state.currentChatMessages = messages;
          renderCurrentChatMessages();
        }, async () => {
          try {
            const snap = await db.collection("messages").where("chatId", "==", chatId).get();
            const messages = [];
            snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
            messages.sort((a, b) => {
              const at = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
              const bt = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
              return at - bt;
            });
            state.currentChatMessages = messages;
            renderCurrentChatMessages();
          } catch (err) {
            console.error("messages fallback error:", err);
            state.currentChatMessages = [];
            renderCurrentChatMessages();
          }
        });
    } catch (error) {
      console.error("subscribeToChatMessages error:", error);
      state.currentChatMessages = [];
      renderCurrentChatMessages();
    }
  }

  function loadPseudoChatMessages(chatId) {
    const bookingId = chatId.replace("booking-thread-", "");
    const booking = state.bookings.find((b) => b.id === bookingId);

    if (!booking) {
      state.currentChatMessages = [];
      renderCurrentChatMessages();
      return;
    }

    const messages = [
      {
        id: `pseudo-booking-${booking.id}`,
        system: true,
        text: `طلب حجز من ${booking.guestName} - المرجع ${booking.reference} - من ${booking.checkIn} إلى ${booking.checkOut}`,
        senderRole: "system",
        createdAt: booking.createdAt || new Date().toISOString()
      }
    ];

    if (booking.approvalReply) {
      messages.push({
        id: `pseudo-approval-${booking.id}`,
        text: booking.approvalReply,
        senderRole: "owner",
        senderName: isSuperAdmin() ? "الإدارة" : "مالك العقار",
        createdAt: booking.updatedAt || booking.createdAt || new Date().toISOString()
      });
    }

    if (booking.roomNumber) {
      messages.push({
        id: `pseudo-room-${booking.id}`,
        text: `رقم الغرفة: ${booking.roomNumber}`,
        senderRole: "owner",
        senderName: isSuperAdmin() ? "الإدارة" : "مالك العقار",
        createdAt: booking.updatedAt || booking.createdAt || new Date().toISOString()
      });
    }

    state.currentChatMessages = messages;
    renderCurrentChatMessages();
  }

  function renderCurrentChatMessages() {
    const list = byId("admin-chat-messages") || byId("chat-messages-list") || byId("chat-messages");
    if (!list) return;

    if (!state.currentChatId) {
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-circle"></i><div>اختر محادثة لعرض الرسائل.</div></div>`;
      return;
    }

    if (!state.currentChatMessages.length) {
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-centered-dots"></i><div>لا توجد رسائل في هذه المحادثة.</div></div>`;
      return;
    }

    list.innerHTML = state.currentChatMessages.map((msg) => {
      const mine = ["admin", "owner", "host", "support"].includes(cleanText(msg.senderRole).toLowerCase());
      const text = cleanText(pickFirst(msg.text, msg.message, msg.body, msg.content, ""));
      const sender = cleanText(pickFirst(msg.senderName, msg.name, msg.senderRole, mine ? "الإدارة" : "العميل"));
      const date = formatDate(pickFirst(msg.createdAt, msg.timestamp, msg.sentAt));

      return `
        <div class="chat-bubble ${mine ? "mine" : "theirs"}"
          style="
            background:${mine ? "#dbeafe" : "#f8fafc"};
            border:1px solid ${mine ? "#93c5fd" : "#e2e8f0"};
            border-radius:16px;
            padding:12px 14px;
            margin-bottom:10px;
          "
        >
          <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(sender)}</div>
          <div style="line-height:1.8;">${escapeHtml(text)}</div>
          <div style="margin-top:8px;font-size:.78rem;color:#64748b;">${escapeHtml(date)}</div>
        </div>
      `;
    }).join("");

    list.scrollTop = list.scrollHeight;
  }

  async function findExistingChatForBooking(booking) {
    const local = state.chats.find((chat) => {
      if (chat.pseudo) return false;
      return (
        (booking.id && chat.bookingId && booking.id === chat.bookingId) ||
        (booking.userId && chat.userId && chat.userId === booking.userId) ||
        (booking.guestEmail && chat.userEmail && normalizeEmail(chat.userEmail) === normalizeEmail(booking.guestEmail))
      );
    });

    if (local) return local;
    if (!firebaseReady) return null;

    try {
      if (booking.id) {
        const byBooking = await db.collection("chats").where("bookingId", "==", booking.id).limit(1).get();
        if (!byBooking.empty) {
          const doc = byBooking.docs[0];
          return normalizeChat({ id: doc.id, ...doc.data() });
        }
      }
    } catch (error) {
      console.warn("findExistingChatForBooking bookingId lookup failed:", error);
    }

    return null;
  }

  async function createRealChatFromBooking(bookingId) {
    if (!requireAuth()) return null;

    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      showToast("الحجز غير موجود.", "error");
      return null;
    }
    if (!canAccessBooking(booking)) {
      showToast("ليست لديك صلاحية الوصول إلى هذه المحادثة.", "error");
      return null;
    }

    const existing = await findExistingChatForBooking(booking);
    if (existing) return existing.id;
    if (!firebaseReady) return null;

    const payload = {
      bookingId,
      propertyId: booking.propertyId || "",
      propertyTitle: booking.propertyTitle || "",
      userId: booking.userId || "",
      userName: booking.guestName || "",
      userEmail: booking.guestEmail || "",
      participants: [booking.userId || booking.guestEmail || "", cleanText(state.currentAuthUser?.uid)].filter(Boolean),
      participantIds: [booking.userId || booking.guestEmail || "", cleanText(state.currentAuthUser?.uid)].filter(Boolean),
      lastMessage: "",
      lastText: "",
      lastMessageAt: getServerTimestamp(),
      updatedAt: getServerTimestamp(),
      createdAt: getServerTimestamp()
    };

    const ref = await db.collection("chats").add(payload);
    return ref.id;
  }

  async function ensureChatForBooking(bookingId) {
    if (!requireAuth()) return;

    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      showToast("الحجز غير موجود.", "error");
      return;
    }
    if (!canAccessBooking(booking)) {
      showToast("ليست لديك صلاحية الوصول إلى هذه المحادثة.", "error");
      return;
    }

    const existing = await findExistingChatForBooking(booking);
    if (existing) {
      activateTab("chats");
      openChat(existing.id);
      return;
    }

    if (!firebaseReady) {
      activateTab("chats");
      openChat(`booking-thread-${bookingId}`);
      return;
    }

    try {
      const chatId = await createRealChatFromBooking(bookingId);
      if (chatId) {
        activateTab("chats");
        openChat(chatId);
        showToast("تم فتح المحادثة.", "success");
        return;
      }

      activateTab("chats");
      openChat(`booking-thread-${bookingId}`);
      showToast("تم فتح محادثة مؤقتة.", "info");
    } catch (error) {
      console.error("ensureChatForBooking error:", error);
      activateTab("chats");
      openChat(`booking-thread-${bookingId}`);
      showToast("تم فتح محادثة مؤقتة.", "info");
    }
  }

  async function sendAdminMessage(e) {
    e.preventDefault();
    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");
    if (!state.currentChatId) return showToast("اختر محادثة أولاً.", "warning");

    const form = e.currentTarget;
    const input = form.querySelector('textarea, input[type="text"]');
    const text = cleanText(input?.value);
    if (!text) return;

    const btn = form.querySelector('button[type="submit"]');
    setButtonLoading(btn, true, "جارٍ الإرسال...");

    try {
      let actualChatId = state.currentChatId;

      if (actualChatId.startsWith("booking-thread-")) {
        const bookingId = actualChatId.replace("booking-thread-", "");
        const createdChatId = await createRealChatFromBooking(bookingId);
        if (!createdChatId) {
          showToast("تعذر إنشاء المحادثة.", "warning");
          return;
        }
        actualChatId = createdChatId;
        state.currentChatId = actualChatId;
        activateTab("chats");
        openChat(actualChatId);
      }

      const chat = state.chats.find((c) => c.id === actualChatId);
      if (chat && !chat.pseudo && !canAccessChat(chat)) {
        showToast("ليست لديك صلاحية الإرسال في هذه المحادثة.", "error");
        return;
      }

      const chatRef = db.collection("chats").doc(actualChatId);
      const payload = {
        text,
        message: text,
        senderRole: isSuperAdmin() ? "admin" : "owner",
        senderName: isSuperAdmin() ? "الإدارة" : "مالك العقار",
        createdAt: getServerTimestamp()
      };

      try {
        await chatRef.collection("messages").add(payload);
      } catch {
        await db.collection("messages").add({
          ...payload,
          chatId: actualChatId,
          propertyId: cleanText(chat?.propertyId || ""),
          userId: cleanText(chat?.userId || "")
        });
      }

      await chatRef.set(
        {
          lastMessage: text,
          lastText: text,
          lastMessageAt: getServerTimestamp(),
          updatedAt: getServerTimestamp()
        },
        { merge: true }
      );

      if (input) input.value = "";
      showToast("تم إرسال الرسالة.", "success");
    } catch (error) {
      console.error("sendAdminMessage error:", error);
      showToast("تعذر إرسال الرسالة.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function getPreviewElements(prefix) {
    return {
      wrapper: byId(`${prefix}-upload-preview`) || byId(`${prefix}-image-preview-wrapper`) || byId(`${prefix}-preview-wrapper`),
      img: byId(`${prefix}-upload-preview-img`) || byId(`${prefix}-image-preview`) || byId(`${prefix}-preview-image`),
      name: byId(`${prefix}-upload-preview-name`) || byId(`${prefix}-preview-name`),
      meta: byId(`${prefix}-upload-preview-meta`) || byId(`${prefix}-preview-meta`)
    };
  }

  function resetUploadPreview(prefix) {
    const { wrapper, img, name, meta } = getPreviewElements(prefix);
    if (wrapper) wrapper.classList.remove("visible");
    if (img) img.src = "";
    if (name) name.textContent = "";
    if (meta) meta.textContent = "";
  }

  function setUploadPreviewFromUrl(prefix, url) {
    const cleanUrl = cleanText(url);
    const { wrapper, img, name, meta } = getPreviewElements(prefix);
    if (!img) return;

    if (!cleanUrl) {
      resetUploadPreview(prefix);
      return;
    }

    img.src = cleanUrl;
    img.onerror = function () {
      this.src = "images/placeholder.jpg";
    };

    if (wrapper) wrapper.classList.add("visible");
    if (name) name.textContent = "رابط الصورة";
    if (meta) meta.textContent = cleanUrl;
  }

  function setUploadPreviewFromFile(prefix, file) {
    const { wrapper, img, name, meta } = getPreviewElements(prefix);
    if (!file || !img) {
      resetUploadPreview(prefix);
      return;
    }

    const reader = new FileReader();
    reader.onload = function (ev) {
      img.src = ev.target?.result;
      if (wrapper) wrapper.classList.add("visible");
      if (name) name.textContent = file.name || "image";
      if (meta) meta.textContent = `${Math.round((file.size || 0) / 1024)} KB`;
    };
    reader.readAsDataURL(file);
  }

  function getMapPickedBadge(prefix) {
    return byId(`${prefix}-map-picked-badge`);
  }

  function showMapPickedBadge(prefix) {
    getMapPickedBadge(prefix)?.classList.add("visible");
  }

  function hideMapPickedBadge(prefix) {
    getMapPickedBadge(prefix)?.classList.remove("visible");
  }

  function clearMapCoords(prefix) {
    setValue("", `${prefix}-lat`, `${prefix}-latitude`);
    setValue("", `${prefix}-lng`, `${prefix}-longitude`);

    const markerKey = prefix === "edit" ? "editMarker" : "addMarker";
    if (state.maps[markerKey]?.remove) {
      try {
        state.maps[markerKey].remove();
      } catch {}
    }
    state.maps[markerKey] = null;
  }

  function updateMapMarkerFromInputs(prefix) {
    const lat = toNumber(getValue(`${prefix}-lat`, `${prefix}-latitude`), null);
    const lng = toNumber(getValue(`${prefix}-lng`, `${prefix}-longitude`), null);

    if (lat === null || lng === null || typeof L === "undefined") return;

    const mapKey = prefix === "edit" ? "edit" : "add";
    const markerKey = prefix === "edit" ? "editMarker" : "addMarker";
    const map = state.maps[mapKey];
    if (!map) return;

    try {
      if (state.maps[markerKey]) state.maps[markerKey].setLatLng([lat, lng]);
      else state.maps[markerKey] = L.marker([lat, lng]).addTo(map);

      map.setView([lat, lng], 13);
      showMapPickedBadge(prefix);
    } catch (error) {
      console.warn("updateMapMarkerFromInputs error:", error);
    }
  }

  async function searchLocationOnMap(prefix) {
    const qInput = byId(`${prefix}-map-search`);
    const query = cleanText(qInput?.value);
    if (!query) return showToast("اكتب اسم المكان أولاً.", "warning");

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url, {
        headers: { Accept: "application/json" }
      });
      const data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        showToast("لم يتم العثور على الموقع.", "warning");
        return;
      }

      const item = data[0];
      const lat = Number(item.lat);
      const lng = Number(item.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        showToast("إحداثيات غير صالحة.", "error");
        return;
      }

      setValue(String(lat.toFixed(6)), `${prefix}-lat`, `${prefix}-latitude`);
      setValue(String(lng.toFixed(6)), `${prefix}-lng`, `${prefix}-longitude`);
      updateMapMarkerFromInputs(prefix);
      showToast("تم تحديد الموقع على الخريطة.", "success");
    } catch (error) {
      console.error("searchLocationOnMap error:", error);
      showToast("تعذر البحث عن الموقع.", "error");
    }
  }

  function initMap(prefix, mapId) {
    if (typeof L === "undefined") return;
    const el = byId(mapId);
    if (!el) return;

    const mapKey = prefix === "edit" ? "edit" : "add";
    const markerKey = prefix === "edit" ? "editMarker" : "addMarker";
    if (state.maps[mapKey]) return;

    try {
      const map = L.map(el).setView([31.95, 5.33], 6);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap"
      }).addTo(map);

      map.on("click", (ev) => {
        const { lat, lng } = ev.latlng;
        setValue(String(lat.toFixed(6)), `${prefix}-lat`, `${prefix}-latitude`);
        setValue(String(lng.toFixed(6)), `${prefix}-lng`, `${prefix}-longitude`);

        if (state.maps[markerKey]) state.maps[markerKey].setLatLng([lat, lng]);
        else state.maps[markerKey] = L.marker([lat, lng]).addTo(map);

        showMapPickedBadge(prefix);
      });

      state.maps[mapKey] = map;
      setTimeout(() => map.invalidateSize(), 250);
    } catch (error) {
      console.warn("initMap error:", error);
    }
  }

  function getLoginForm() {
    return q("[data-admin-login-form]") || byId("admin-login-form") || byId("login-form");
  }

  async function handleLoginSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    const username = getValue("admin-login-email", "admin-username", "admin-user", "login-username", "username", "email");
    const password = getValue("admin-login-password", "admin-password", "admin-pass", "login-password", "password");
    await login(username, password);
  }

  function bindStaticEvents() {
    getLoginForm()?.addEventListener("submit", handleLoginSubmit);
    byId("admin-login-btn")?.addEventListener("click", handleLoginSubmit);
    byId("login-btn")?.addEventListener("click", handleLoginSubmit);

    byId("admin-login-email")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });
    byId("admin-login-password")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });
    byId("admin-username")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });
    byId("admin-password")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });
    byId("admin-user")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });
    byId("admin-pass")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });

    byId("admin-logout-btn")?.addEventListener("click", logout);
    byId("logout-btn")?.addEventListener("click", logout);

    qa("[data-tab-target]").forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget)));
    qa(".sidebar-nav .nav-item[data-tab]").forEach((btn) => btn.addEventListener("click", () => activateTab(btn.dataset.tab)));

    byId("add-property-form")?.addEventListener("submit", handleAddPropertySubmit);
    byId("admin-property-form")?.addEventListener("submit", handleAddPropertySubmit);
    byId("edit-property-form")?.addEventListener("submit", handleEditPropertySubmit);
    byId("property-edit-form")?.addEventListener("submit", handleEditPropertySubmit);
    byId("owner-account-form")?.addEventListener("submit", handleOwnerFormSubmit);
    byId("owner-form")?.addEventListener("submit", handleOwnerFormSubmit);
    byId("admin-chat-send-form")?.addEventListener("submit", sendAdminMessage);
    byId("chat-send-form")?.addEventListener("submit", sendAdminMessage);

    ["properties-search", "property-search"].forEach((id) => byId(id)?.addEventListener("input", renderPropertiesTable));
    ["bookings-search", "booking-search"].forEach((id) => byId(id)?.addEventListener("input", renderBookings));
    ["owners-search", "owner-search"].forEach((id) => byId(id)?.addEventListener("input", renderOwnerAccounts));
    ["chats-search", "chat-search"].forEach((id) => byId(id)?.addEventListener("input", renderChatThreads));

    qa("[data-booking-filter]").forEach((btn) => btn.addEventListener("click", () => {
      state.bookingFilter = cleanText(btn.dataset.bookingFilter || "all");
      qa("[data-booking-filter]").forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      renderBookings();
    }));

    ["admin-image-file", "edit-image-file"].forEach((id) => byId(id)?.addEventListener("change", (e) => {
      const prefix = id.startsWith("edit") ? "edit" : "admin";
      const file = e.target?.files?.[0];
      setUploadPreviewFromFile(prefix, file);
    }));

    ["admin-image-url", "edit-image-url"].forEach((id) => byId(id)?.addEventListener("input", (e) => {
      const prefix = id.startsWith("edit") ? "edit" : "admin";
      setUploadPreviewFromUrl(prefix, e.target?.value);
    }));

    ["admin-map-search-btn", "edit-map-search-btn"].forEach((id) => byId(id)?.addEventListener("click", () => {
      const prefix = id.startsWith("edit") ? "edit" : "admin";
      searchLocationOnMap(prefix);
    }));

    ["admin-map-search", "edit-map-search"].forEach((id) => byId(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const prefix = id.startsWith("edit") ? "edit" : "admin";
        searchLocationOnMap(prefix);
      }
    }));

    ["admin-lat", "admin-lng", "edit-lat", "edit-lng"].forEach((id) => byId(id)?.addEventListener("input", () => {
      const prefix = id.startsWith("edit") ? "edit" : "admin";
      updateMapMarkerFromInputs(prefix);
    }));

    document.addEventListener("click", async (e) => {
      const editPropBtn = e.target.closest(".edit-property-btn");
      if (editPropBtn) {
        openEditPropertyModal(editPropBtn.dataset.id);
        return;
      }

      const toggleBtn = e.target.closest(".toggle-property-btn");
      if (toggleBtn) {
        const id = toggleBtn.dataset.id;
        const visibleNow = toggleBtn.dataset.visible === "1";
        await togglePropertyVisibility(id, visibleNow);
        return;
      }

      const deletePropBtn = e.target.closest(".delete-property-btn");
      if (deletePropBtn) {
        await deleteProperty(deletePropBtn.dataset.id);
        return;
      }

      const approveBtn = e.target.closest(".btn-approve");
      if (approveBtn) {
        await updateBookingStatus(approveBtn.dataset.bookingId, "confirmed");
        return;
      }

      const rejectBtn = e.target.closest(".btn-reject");
      if (rejectBtn) {
        await updateBookingStatus(rejectBtn.dataset.bookingId, "rejected");
        return;
      }

      const openChatBtn = e.target.closest(".btn-open-chat");
      if (openChatBtn) {
        await ensureChatForBooking(openChatBtn.dataset.bookingId);
        return;
      }

      const editOwnerBtn = e.target.closest(".edit-owner-btn");
      if (editOwnerBtn) {
        fillOwnerForm(editOwnerBtn.dataset.id);
        return;
      }

      const deleteOwnerBtn = e.target.closest(".delete-owner-btn");
      if (deleteOwnerBtn) {
        await deleteOwnerAccount(deleteOwnerBtn.dataset.id);
        return;
      }

      const chatThreadBtn = e.target.closest(".chat-thread-item");
      if (chatThreadBtn) {
        openChat(chatThreadBtn.dataset.chatId);
        return;
      }

      const closeModalBtn = e.target.closest("[data-close-modal], .modal-close, .close-modal, .close-modal-btn");
      if (closeModalBtn) {
        closeModal(closeModalBtn.closest(".modal-overlay, .modal"));
        return;
      }

      if (e.target.classList?.contains("modal-overlay")) {
        closeModal(e.target);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        qa(".modal-overlay.active, .modal.active").forEach((modal) => closeModal(modal));
      }
    });
  }

  function bindAuthState() {
    if (!auth) return;

    auth.onAuthStateChanged(async (user) => {
      state.authReady = true;
      state.currentAuthUser = user || null;

      if (!user) {
        state.isLoggedIn = false;
        ensureLoggedInUI();
        return;
      }

      const roleResult = await getAdminRoleFromFirestore(user);
      if (roleResult.ok) {
        state.adminRole = roleResult.role;
        safeSet(ADMIN_ROLE_KEY, roleResult.role);

        if (roleResult.ownerDocId) {
          state.ownerAccountDocId = roleResult.ownerDocId;
          safeSet(ADMIN_OWNER_DOC_KEY, roleResult.ownerDocId);
        }

        state.isLoggedIn = true;
        ensureLoggedInUI();
      }
    });
  }

  function initSession() {
    state.isLoggedIn = safeGet(ADMIN_SESSION_KEY) === "1";
    ensureLoggedInUI();

    if (state.isLoggedIn && auth?.currentUser) {
      state.currentAuthUser = auth.currentUser;
      activateTab(state.activeTab || "dashboard", { silentAuth: true });
      loadAllData();
    }
  }

  function init() {
    showFirebaseStatus();
    bindStaticEvents();
    bindAuthState();
    initSession();
    initMap("admin", "admin-map-picker");
    initMap("edit", "edit-map-picker");
    renderCurrentChatMessages();
    ensureAdminLogosVisible();
  }

  document.addEventListener("DOMContentLoaded", init);

  window.adminApp = {
    state,
    login,
    logout,
    activateTab,
    loadAllData,
    loadProperties,
    loadBookings,
    loadOwnerAccounts,
    loadChats,
    openChat,
    ensureChatForBooking
  };
})();
