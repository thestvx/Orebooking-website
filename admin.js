"use strict";

(function () {
  const ADMIN_SESSION_KEY = "ore_admin_logged_in";
  const ADMIN_ROLE_KEY = "ore_admin_role";
  const ADMIN_OWNER_DOC_KEY = "ore_admin_owner_doc";
  const ADMIN_LOGIN_HINT_KEY = "ore_admin_login_hint";
  const ADMIN_EMAIL_DOMAIN = "@orebooking.com";

  const OWNER_DIRECTORY = [
    {
      name: "PALM GARDEN",
      email: "palmgarden@orebooking.com",
      username: "palmgarden",
      role: "owner"
    },
    {
      name: "Tedjani Hotel",
      email: "tedjanihotel@orebooking.com",
      username: "tedjanihotel",
      role: "owner"
    },
    {
      name: "Gazel D’or",
      email: "gazeldor@orebooking.com",
      username: "gazeldor",
      role: "owner"
    }
  ];

  const db =
    window.__db ||
    window.__frontDb ||
    (typeof firebase !== "undefined" && typeof firebase.firestore === "function"
      ? firebase.firestore()
      : null);

  const auth =
    window.__auth ||
    window.__frontAuth ||
    (typeof firebase !== "undefined" && typeof firebase.auth === "function"
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
    pendingRejectBookingId: "",
    listeners: {
      auth: null,
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

  function normalizeAdminEmail(value) {
    const raw = normalizeEmail(value).replace(/\s+/g, "");
    if (!raw) return "";
    return raw;
  }

  function maybeBuildDomainEmail(value) {
    const raw = normalizeAdminEmail(value);
    if (!raw) return "";
    if (raw.includes("@")) return raw;
    return `${raw}${ADMIN_EMAIL_DOMAIN}`;
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

  function getRandomRoomNumber() {
    return String(Math.floor(Math.random() * 90) + 10);
  }

  function getAutoApprovalMessage(roomNumber) {
    return `تم قبول حجزك بنجاح. رقم الغرفة: ${roomNumber}`;
  }

  function getOwnerDirectoryRecords() {
    return OWNER_DIRECTORY.map((owner) => ({
      id: slugify(owner.name) || owner.email,
      ...owner,
      createdAt: null
    }));
  }

  function mergeOwnerAccounts(rawItems = []) {
    const merged = new Map();

    getOwnerDirectoryRecords().forEach((item) => {
      const key = normalizeEmail(item.email) || cleanText(item.id);
      merged.set(key, item);
    });

    rawItems.forEach((item) => {
      const normalized = {
        id: cleanText(item.id),
        ...item,
        name: cleanText(item.name || item.ownerName || item.displayName),
        email: normalizeEmail(item.email || item.ownerEmail),
        role: cleanText(item.role || "owner").toLowerCase() || "owner"
      };
      const key = normalized.email || normalized.id;
      if (!key) return;

      const base = merged.get(key) || {};
      merged.set(key, {
        ...base,
        ...normalized,
        name: normalized.name || base.name || "",
        email: normalized.email || base.email || "",
        role: normalized.role || base.role || "owner"
      });
    });

    return Array.from(merged.values());
  }

  function inferOwnerRecordFromEmail(email) {
    const normalized = normalizeEmail(email);
    if (!normalized) return null;
    return OWNER_DIRECTORY.find((owner) => normalizeEmail(owner.email) === normalized) || null;
  }

  function getPropertyOwnerDisplayName(property) {
    const ownerEmail = normalizeEmail(property?.ownerEmail || property?.hostEmail);
    const ownerByEmail = inferOwnerRecordFromEmail(ownerEmail);
    return cleanText(
      pickFirst(
        property?.ownerName,
        property?.hostName,
        ownerByEmail?.name,
        "مالك العقار"
      )
    );
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
    qa('img[src*="logos/orebooking"]').forEach((img) => {
      img.loading = "eager";
      img.decoding = "async";
      img.onerror = function () {
        this.style.display = "none";
      };
      const parent = img.parentElement;
      if (parent && getComputedStyle(parent).display === "none") {
        parent.style.display = "flex";
      }
    });
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
    ensureAdminLogosVisible();
  }

  function updateProfileUI() {
    const name =
      state.currentOwnerRecord?.name ||
      state.currentAuthUser?.displayName ||
      state.currentAuthUser?.email ||
      "الحساب الحالي";

    const role =
      state.adminRole === "admin"
        ? "أدمن عام"
        : state.adminRole === "owner"
          ? "مالك عقار"
          : "غير معروف";

    const email = state.currentAuthUser?.email || "—";

    setText(name, "admin-profile-name");
    setText(role, "admin-profile-role", "sidebar-user-role");
    setText(email, "admin-profile-email");
  }

  function updateRoleBasedUI() {
    const adminOnlyEls = qa(".admin-only");
    adminOnlyEls.forEach((el) => {
      el.classList.toggle("hidden", !isSuperAdmin());
    });

    const addPropertyBtn =
      byId("add-property-btn") ||
      byId("open-add-property-btn") ||
      q('[data-tab="add-property-pane"]') ||
      q('[data-tab-target="add-property"]');

    if (addPropertyBtn) {
      addPropertyBtn.classList.toggle("hidden", isOwnerAdmin());
    }

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
    const email = normalizeEmail(state.currentAuthUser?.email);

    return (
      cleanText(property?.ownerUid) === uid ||
      normalizeEmail(property?.ownerEmail) === email
    );
  }

  function canAccessBooking(booking) {
    if (isSuperAdmin()) return true;
    if (!isOwnerAdmin()) return false;

    const bookingPropertyId = cleanText(booking?.propertyId);
    if (!bookingPropertyId) return false;

    const prop = state.properties.find((p) => cleanText(p.id) === bookingPropertyId);
    if (prop) return canManageProperty(prop);

    const bookingOwnerUid = cleanText(booking?.ownerUid || booking?.hostUid);
    const bookingOwnerEmail = normalizeEmail(booking?.ownerEmail || booking?.hostEmail);
    return (
      bookingOwnerUid === cleanText(state.currentAuthUser?.uid) ||
      (bookingOwnerEmail && bookingOwnerEmail === normalizeEmail(state.currentAuthUser?.email))
    );
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
      id: cleanText(raw.id),
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
      roomNumber: cleanText(pickFirst(raw.roomNumber, raw.roomNo, raw.room)),
      approvalReply: cleanText(pickFirst(raw.approvalReply, raw.ownerReply, raw.replyMessage)),
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

  function sortByCreatedDesc(items) {
    return [...items].sort((a, b) => {
      const at = a?.createdAt?.toMillis?.() || new Date(a?.createdAt || 0).getTime() || 0;
      const bt = b?.createdAt?.toMillis?.() || new Date(b?.createdAt || 0).getTime() || 0;
      return bt - at;
    });
  }

  async function setAdminSessionPersistence() {
    if (!auth || typeof auth.setPersistence !== "function") return;
    try {
      if (typeof firebase !== "undefined" && firebase.auth?.Auth?.Persistence?.SESSION) {
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
      }
    } catch (error) {
      console.warn("setPersistence SESSION failed:", error);
    }
  }

  async function findPossibleLoginEmails(identifier) {
    const input = cleanText(identifier);
    const normalized = normalizeAdminEmail(input);
    const candidates = new Set();

    if (!normalized) return [];

    if (normalized.includes("@")) {
      candidates.add(normalized);
    } else {
      candidates.add(normalized);
      candidates.add(maybeBuildDomainEmail(normalized));
    }

    const ownerHint = OWNER_DIRECTORY.find((owner) => {
      return (
        normalizeEmail(owner.email) === normalized ||
        cleanText(owner.username).toLowerCase() === normalized ||
        slugify(owner.name) === slugify(normalized) ||
        cleanText(owner.name).toLowerCase() === normalized
      );
    });

    if (ownerHint?.email) candidates.add(normalizeEmail(ownerHint.email));

    try {
      const usersByUsername = await db.collection("users").where("username", "==", input).limit(1).get();
      if (!usersByUsername.empty) {
        const data = usersByUsername.docs[0].data() || {};
        const email = normalizeEmail(data.email);
        if (email) candidates.add(email);
      }
    } catch (error) {
      console.warn("users username lookup failed:", error);
    }

    try {
      const usersByHandle = await db.collection("users").where("handle", "==", input).limit(1).get();
      if (!usersByHandle.empty) {
        const data = usersByHandle.docs[0].data() || {};
        const email = normalizeEmail(data.email);
        if (email) candidates.add(email);
      }
    } catch (error) {
      console.warn("users handle lookup failed:", error);
    }

    try {
      const ownerByUsername = await db.collection("ownerAccounts").where("username", "==", input).limit(1).get();
      if (!ownerByUsername.empty) {
        const data = ownerByUsername.docs[0].data() || {};
        const email = normalizeEmail(data.email);
        if (email) candidates.add(email);
      }
    } catch (error) {
      console.warn("ownerAccounts username lookup failed:", error);
    }

    try {
      const ownerByEmail = await db.collection("ownerAccounts").where("email", "==", normalized).limit(1).get();
      if (!ownerByEmail.empty) {
        const data = ownerByEmail.docs[0].data() || {};
        const email = normalizeEmail(data.email);
        if (email) candidates.add(email);
      }
    } catch (error) {
      console.warn("ownerAccounts email lookup failed:", error);
    }

    return Array.from(candidates).filter(Boolean);
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
      const usersByEmail = await db.collection("users").where("email", "==", normalizeEmail(user.email)).limit(1).get();
      if (!usersByEmail.empty) {
        const data = usersByEmail.docs[0].data() || {};
        const role = cleanText(data.role).toLowerCase();
        if (role === "admin") return { ok: true, role: "admin", userData: data };
        if (role === "owner" || role === "property_admin") {
          return { ok: true, role: "owner", userData: data };
        }
      }
    } catch (error) {
      console.warn("users email role lookup failed:", error);
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

    const ownerDirectoryRecord = inferOwnerRecordFromEmail(user.email);
    if (ownerDirectoryRecord) {
      return {
        ok: true,
        role: "owner",
        ownerDocId: slugify(ownerDirectoryRecord.name),
        ownerData: ownerDirectoryRecord
      };
    }

    return { ok: false, role: "" };
  }

  async function applyAuthorizedSession(user, roleResult) {
    state.currentAuthUser = user;
    state.currentOwnerRecord = roleResult.ownerData || roleResult.userData || null;
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
  }

  function clearAdminSessionState() {
    state.isLoggedIn = false;
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
    state.pendingRejectBookingId = "";

    safeRemove(ADMIN_SESSION_KEY);
    safeRemove(ADMIN_ROLE_KEY);
    safeRemove(ADMIN_OWNER_DOC_KEY);
  }

  async function login(email, password) {
    const rawLogin = cleanText(email);
    password = cleanText(password);

    if (!rawLogin || !password) {
      showToast("أدخل البريد الإلكتروني وكلمة المرور.", "warning");
      return false;
    }

    if (!firebaseReady) {
      showToast("Firebase غير جاهز.", "error");
      return false;
    }

    try {
      await setAdminSessionPersistence();

      const candidates = await findPossibleLoginEmails(rawLogin);
      if (!candidates.length) {
        candidates.push(normalizeAdminEmail(rawLogin));
        const withDomain = maybeBuildDomainEmail(rawLogin);
        if (withDomain) candidates.push(withDomain);
      }

      let signedUser = null;
      let lastError = null;

      for (const candidateEmail of Array.from(new Set(candidates)).filter(Boolean)) {
        try {
          const cred = await auth.signInWithEmailAndPassword(candidateEmail, password);
          if (cred?.user) {
            signedUser = cred.user;
            safeSet(ADMIN_LOGIN_HINT_KEY, candidateEmail);
            break;
          }
        } catch (error) {
          lastError = error;
          const code = String(error?.code || "");
          if (!code.includes("user-not-found") && !code.includes("invalid-email")) {
            if (code.includes("wrong-password") || code.includes("invalid-credential")) break;
          }
        }
      }

      const user = signedUser || auth.currentUser;
      if (!user) throw lastError || new Error("AUTH_USER_NOT_FOUND");

      const roleResult = await getAdminRoleFromFirestore(user);
      if (!roleResult.ok) {
        try { await auth.signOut(); } catch {}
        throw new Error("NOT_AUTHORIZED");
      }

      await applyAuthorizedSession(user, roleResult);
      showToast("تم تسجيل الدخول بنجاح.", "success");
      return true;
    } catch (error) {
      console.error("admin login error:", error);
      clearAdminSessionState();
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
      } else if (code.includes("invalid-credential")) {
        message = "بيانات الدخول غير صحيحة.";
      }

      showToast(message, "error");
      return false;
    }
  }

  async function logout() {
    clearAdminSessionState();

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

  function tabAliases(name) {
    const raw = cleanText(name);
    const map = {
      dashboard: "dashboard",
      "dashboard-pane": "dashboard",
      properties: "properties",
      "properties-pane": "properties",
      bookings: "bookings",
      "bookings-pane": "bookings",
      owners: "owners",
      "owners-pane": "owners",
      messages: "messages",
      "messages-pane": "messages",
      chats: "messages",
      "chats-pane": "messages",
      "add-property": "properties",
      "add-property-pane": "properties"
    };
    return map[raw] || raw || "dashboard";
  }

  function activateTab(tabName, options = {}) {
    if (!options.silentAuth && !requireAuth()) return;

    const requested = tabAliases(tabName || "dashboard");
    state.activeTab = requested;

    if (state.adminRole === "owner" && requested === "owners") {
      state.activeTab = "dashboard";
    }

    qa("[data-tab-target], .sidebar-nav .nav-item[data-tab]").forEach((btn) => {
      const key = tabAliases(btn.dataset.tabTarget || btn.dataset.tab || "");
      btn.classList.toggle("active", key === state.activeTab);
    });

    qa(".tab-pane").forEach((pane) => pane.classList.remove("active"));
    const explicit =
      byId(`${state.activeTab}-pane`) ||
      byId(state.activeTab) ||
      q(`.tab-pane[id="${state.activeTab}-pane"]`);

    if (explicit && explicit.classList.contains("tab-pane")) explicit.classList.add("active");

    if (state.activeTab === "messages" && state.currentChatId) {
      renderChatThreads();
      renderCurrentChatMessages();
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
      state.ownerAccounts = mergeOwnerAccounts(
        state.currentOwnerRecord
          ? [{ id: state.ownerAccountDocId || cleanText(state.currentAuthUser?.uid), ...state.currentOwnerRecord }]
          : []
      );
    } else {
      state.ownerAccounts = mergeOwnerAccounts(state.ownerAccounts);
    }

    renderDashboardStats();
    updateProfileUI();
    updateRoleBasedUI();
  }

  function renderDashboardStats() {
    const pending = state.bookings.filter((b) => getBookingStatus(b.status) === "pending").length;
    const confirmed = state.bookings.filter((b) => getBookingStatus(b.status) === "confirmed").length;
    const rejected = state.bookings.filter((b) => getBookingStatus(b.status) === "rejected").length;

    setText(String(state.properties.length), "dashboard-properties-count", "mini-properties-count", "stat-properties-count", "total-properties-count");
    setText(String(state.bookings.length), "dashboard-bookings-count", "mini-bookings-count", "stat-bookings-count", "total-bookings-count");
    setText(String(state.ownerAccounts.length || OWNER_DIRECTORY.length), "stat-owners-count", "owners-count");
    setText(String(state.chats.length), "stat-chats-count");
    setText(String(pending), "pending-bookings-count", "bookings-count-pending");
    setText(String(confirmed), "confirmed-bookings-count", "bookings-count-confirmed");
    setText(String(rejected), "rejected-bookings-count", "bookings-count-rejected");
    setText(String(state.users.length), "dashboard-users-count", "users-count");
    setText(String(state.bookings.length), "bookings-count-all");

    const visibleCount = state.properties.filter((p) => p.isActive !== false && p.visible !== false).length;
    const hiddenCount = Math.max(0, state.properties.length - visibleCount);
    setText(`${visibleCount} عقار ظاهر`, "visible-properties-count");
    setText(`${hiddenCount} عقار مخفي`, "hidden-properties-count");
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
        try {
          snap = await db.collection("properties").where("ownerUid", "==", cleanText(state.currentAuthUser?.uid)).get();
        } catch {
          snap = await db.collection("properties").get();
        }
      }

      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));

      let filtered = items;
      if (isOwnerAdmin()) filtered = items.filter(canManageProperty);

      state.properties = sortByCreatedDesc(filtered);

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

    const query = cleanText(getValue("properties-search", "property-search", "properties-search-input")).toLowerCase();
    let rows = [...state.properties];

    if (query) {
      rows = rows.filter((prop) =>
        [
          prop.id,
          getPropertyTitle(prop),
          getPropertyLocation(prop),
          getPropertyType(prop),
          getPropertyOwnerDisplayName(prop),
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
          <td>${escapeHtml(getPropertyOwnerDisplayName(prop))}</td>
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

    const resolvedOwnerEmail = isOwnerAdmin()
      ? normalizeEmail(state.currentAuthUser?.email || ownerEmail)
      : normalizeEmail(ownerEmail);

    const directoryOwner = inferOwnerRecordFromEmail(resolvedOwnerEmail);

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
      ownerName: directoryOwner?.name || ownerName,
      ownerEmail: resolvedOwnerEmail,
      ownerPhone,
      hostName: directoryOwner?.name || ownerName,
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
      payload.ownerName = directoryOwner?.name || state.currentOwnerRecord?.name || ownerName;
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
    if (isOwnerAdmin()) return showToast("إضافة العقار متاحة للأدمن العام فقط.", "warning");

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
      if (typeof resetUploadPreview === "function") resetUploadPreview("admin");
      if (typeof clearMapCoords === "function") clearMapCoords("admin");
      if (typeof hideMapPickedBadge === "function") hideMapPickedBadge("admin");
      await loadProperties();
      await loadBookings();
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

  async function createBookingApprovalArtifacts(booking) {
    const roomNumber = getRandomRoomNumber();
    const approvalReply = getAutoApprovalMessage(roomNumber);
    const payload = {
      status: "confirmed",
      roomNumber,
      approvalReply,
      ownerReply: approvalReply,
      approvalMessage: approvalReply,
      replyMessage: approvalReply,
      approvedAt: getServerTimestamp(),
      updatedAt: getServerTimestamp()
    };

    await db.collection("bookings").doc(booking.id).set(payload, { merge: true });

    if (booking.userId) {
      try {
        await db.collection("notifications").add({
          userId: booking.userId,
          bookingId: booking.id,
          propertyId: booking.propertyId || "",
          type: "booking_confirmed",
          title: "تم قبول الحجز",
          message: approvalReply,
          roomNumber,
          read: false,
          createdAt: getServerTimestamp(),
          updatedAt: getServerTimestamp()
        });
      } catch (error) {
        console.warn("notifications add failed:", error);
      }
    }

    if (booking.userId || booking.guestEmail) {
      try {
        await db.collection("bookingReplies").add({
          bookingId: booking.id,
          propertyId: booking.propertyId || "",
          userId: booking.userId || "",
          guestEmail: booking.guestEmail || "",
          ownerId: cleanText(state.currentAuthUser?.uid),
          ownerEmail: normalizeEmail(state.currentAuthUser?.email),
          message: approvalReply,
          roomNumber,
          type: "approval",
          createdAt: getServerTimestamp()
        });
      } catch (error) {
        console.warn("bookingReplies add failed:", error);
      }
    }

    return { roomNumber, approvalReply };
  }

  async function updateBookingStatus(bookingId, status, extraData = {}) {
    if (!firebaseReady) return false;
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking || !canAccessBooking(booking)) {
      showToast("ليست لديك صلاحية تعديل هذا الحجز.", "error");
      return false;
    }

    try {
      if (getBookingStatus(status) === "confirmed") {
        const result = await createBookingApprovalArtifacts(booking);
        showToast(`تم قبول الحجز وإرسال رقم الغرفة ${result.roomNumber}.`, "success");
      } else {
        await db.collection("bookings").doc(bookingId).set({
          status: getBookingStatus(status),
          updatedAt: getServerTimestamp(),
          ...extraData
        }, { merge: true });
        showToast("تم تحديث حالة الحجز.", "success");
      }

      await loadBookings();
      renderDashboardStats();
      return true;
    } catch (error) {
      console.error("updateBookingStatus error:", error);
      showToast("تعذر تحديث حالة الحجز.", "error");
      return false;
    }
  }

  async function loadBookings() {
    try {
      const items = [];
      const snap = await db.collection("bookings").get();
      snap.forEach((doc) => items.push(normalizeBooking({ id: doc.id, ...doc.data() })));
      state.bookings = sortByCreatedDesc(items).filter((booking) => canAccessBooking(booking));
      renderBookings();
      renderDashboardStats();
    } catch (error) {
      console.error("loadBookings error:", error);
      state.bookings = [];
      renderBookings();
    }
  }

  function renderBookings() {
    const tbody =
      byId("bookings-tbody") ||
      byId("bookings-table-body") ||
      byId("booking-list-body");

    if (!tbody) return;

    let rows = [...state.bookings];
    const search = cleanText(getValue("bookings-search", "booking-search")).toLowerCase();

    if (state.bookingFilter !== "all") {
      rows = rows.filter((b) => getBookingStatus(b.status) === state.bookingFilter);
    }

    if (search) {
      rows = rows.filter((booking) =>
        [
          booking.id,
          booking.reference,
          booking.guestName,
          booking.guestEmail,
          booking.propertyTitle,
          booking.checkIn,
          booking.checkOut,
          booking.roomNumber,
          booking.approvalReply
        ].join(" ").toLowerCase().includes(search)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:28px;">لا توجد حجوزات حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((booking) => `
      <tr>
        <td>#${escapeHtml(booking.reference || booking.id)}</td>
        <td>
          <div class="guest-cell">
            <strong>${escapeHtml(booking.guestName)}</strong>
            <span>${escapeHtml(booking.guestEmail)}</span>
          </div>
        </td>
        <td>${escapeHtml(booking.propertyTitle)}</td>
        <td>${escapeHtml(booking.checkIn)} → ${escapeHtml(booking.checkOut)}</td>
        <td>${formatPrice(booking.total)}</td>
        <td>${booking.roomNumber ? `<span class="price-pill">غرفة ${escapeHtml(booking.roomNumber)}</span>` : "—"}</td>
        <td>${statusBadge(booking.status)}</td>
        <td>${escapeHtml(booking.approvalReply || "—")}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="approve-booking-btn" data-id="${escapeHtml(booking.id)}">
              <i class="ph ph-check"></i> قبول
            </button>
            <button type="button" class="reject-booking-btn" data-id="${escapeHtml(booking.id)}">
              <i class="ph ph-x"></i> رفض
            </button>
          </div>
        </td>
      </tr>
    `).join("");

    qa(".approve-booking-btn", tbody).forEach((btn) => {
      btn.addEventListener("click", () => updateBookingStatus(btn.dataset.id, "confirmed"));
    });

    qa(".reject-booking-btn", tbody).forEach((btn) => {
      btn.addEventListener("click", () =>
        updateBookingStatus(btn.dataset.id, "rejected", {
          ownerReply: "تم رفض الحجز.",
          replyMessage: "تم رفض الحجز."
        })
      );
    });
  }

  async function loadOwnerAccounts() {
    try {
      const items = [];
      const snap = await db.collection("ownerAccounts").get();
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      state.ownerAccounts = mergeOwnerAccounts(items);
      renderOwnerAccounts();
      renderDashboardStats();
    } catch (error) {
      console.error("loadOwnerAccounts error:", error);
      state.ownerAccounts = mergeOwnerAccounts([]);
      renderOwnerAccounts();
    }
  }

  function renderOwnerAccounts() {
    const tbody =
      byId("owners-tbody") ||
      byId("owners-table-body") ||
      byId("owner-accounts-body") ||
      byId("owners-list-body");

    if (!tbody) return;

    const rows = mergeOwnerAccounts(state.ownerAccounts);

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:28px;">لا يوجد ملاك حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((owner) => `
      <tr>
        <td><strong>${escapeHtml(owner.name || "—")}</strong></td>
        <td>${escapeHtml(owner.email || "—")}</td>
        <td>${escapeHtml(owner.role || "owner")}</td>
        <td>${escapeHtml(formatDate(owner.createdAt))}</td>
      </tr>
    `).join("");
  }

  async function loadUsers() {
    try {
      const items = [];
      const snap = await db.collection("users").get();
      snap.forEach((doc) => items.push(normalizeUser(doc.data() || {}, doc.id)));
      state.users = sortByCreatedDesc(items);
    } catch (error) {
      console.error("loadUsers error:", error);
      state.users = [];
    }
  }

  async function loadChats() {
    try {
      const items = [];
      const snap = await db.collection("chats").get();
      snap.forEach((doc) => items.push(normalizeChat(doc.data() || {}, doc.id)));
      state.chats = sortByCreatedDesc(items).filter((chat) => canAccessChat(chat));
      renderChatThreads();
    } catch (error) {
      console.error("loadChats error:", error);
      state.chats = [];
      renderChatThreads();
    }
  }

  function renderChatThreads() {
    const list =
      byId("chat-threads-list") ||
      byId("messages-threads") ||
      byId("chat-list");

    if (!list) return;

    if (!state.chats.length) {
      list.innerHTML = `<div class="empty-state">لا توجد محادثات حالياً.</div>`;
      return;
    }

    list.innerHTML = state.chats.map((chat) => `
      <button type="button" class="chat-thread-item ${state.currentChatId === chat.id ? "active" : ""}" data-chat-id="${escapeHtml(chat.id)}">
        <strong>${escapeHtml(chat.userName || chat.userEmail || "محادثة")}</strong>
        <span>${escapeHtml(chat.lastMessage || "بدون رسائل")}</span>
      </button>
    `).join("");

    qa(".chat-thread-item", list).forEach((btn) => {
      btn.addEventListener("click", () => {
        state.currentChatId = btn.dataset.chatId;
        renderChatThreads();
        renderCurrentChatMessages();
      });
    });
  }

  function renderCurrentChatMessages() {
    const box =
      byId("chat-messages-body") ||
      byId("current-chat-messages") ||
      byId("messages-body");

    if (!box) return;

    if (!state.currentChatId) {
      box.innerHTML = `<div class="empty-state">اختر محادثة لعرض الرسائل.</div>`;
      return;
    }

    if (!state.currentChatMessages.length) {
      box.innerHTML = `<div class="empty-state">لا توجد رسائل في هذه المحادثة.</div>`;
      return;
    }

    box.innerHTML = state.currentChatMessages.map((msg) => `
      <div class="chat-message-item">
        <strong>${escapeHtml(msg.senderName || msg.senderEmail || "مستخدم")}</strong>
        <p>${escapeHtml(msg.text || msg.message || "")}</p>
        <span>${escapeHtml(formatDate(msg.createdAt))}</span>
      </div>
    `).join("");
  }

  function bindStaticEvents() {
    const loginForm = byId("admin-login-form");
    if (loginForm && !loginForm.dataset.bound) {
      loginForm.dataset.bound = "1";
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = getValue("admin-email", "login-email", "admin-login-email");
        const password = getValue("admin-password", "login-password", "admin-login-password");
        const submitBtn = q('button[type="submit"]', loginForm);
        setButtonLoading(submitBtn, true, "جارٍ تسجيل الدخول...");
        try {
          await login(email, password);
        } finally {
          setButtonLoading(submitBtn, false);
        }
      });
    }

    const logoutBtn = byId("logout-btn") || byId("admin-logout-btn");
    if (logoutBtn && !logoutBtn.dataset.bound) {
      logoutBtn.dataset.bound = "1";
      logoutBtn.addEventListener("click", logout);
    }

    qa("[data-tab-target], .sidebar-nav .nav-item[data-tab]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        activateTab(btn.dataset.tabTarget || btn.dataset.tab || "dashboard");
      });
    });

    const addPropertyForm = byId("add-property-form") || byId("admin-add-property-form");
    if (addPropertyForm && !addPropertyForm.dataset.bound) {
      addPropertyForm.dataset.bound = "1";
      addPropertyForm.addEventListener("submit", handleAddPropertySubmit);
    }

    const bookingFilterBtns = qa("[data-booking-filter]");
    bookingFilterBtns.forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        state.bookingFilter = cleanText(btn.dataset.bookingFilter || "all");
        bookingFilterBtns.forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        renderBookings();
      });
    });

    ["properties-search", "property-search", "properties-search-input"].forEach((id) => {
      const input = byId(id);
      if (!input || input.dataset.bound) return;
      input.dataset.bound = "1";
      input.addEventListener("input", renderPropertiesTable);
    });

    ["bookings-search", "booking-search"].forEach((id) => {
      const input = byId(id);
      if (!input || input.dataset.bound) return;
      input.dataset.bound = "1";
      input.addEventListener("input", renderBookings);
    });
  }

  async function initAuthListener() {
    if (!firebaseReady || !auth || typeof auth.onAuthStateChanged !== "function") return;

    state.listeners.auth = auth.onAuthStateChanged(async (user) => {
      state.authReady = true;

      if (!user) {
        clearAdminSessionState();
        ensureLoggedInUI();
        updateProfileUI();
        updateRoleBasedUI();
        return;
      }

      const roleResult = await getAdminRoleFromFirestore(user);
      if (!roleResult.ok) {
        clearAdminSessionState();
        ensureLoggedInUI();
        updateProfileUI();
        updateRoleBasedUI();
        try { await auth.signOut(); } catch {}
        showToast("هذا الحساب غير مصرح له بالدخول إلى لوحة التحكم.", "error");
        return;
      }

      await applyAuthorizedSession(user, roleResult);
    });
  }

  function init() {
    showFirebaseStatus();
    ensureAdminLogosVisible();
    ensureLoggedInUI();
    updateProfileUI();
    updateRoleBasedUI();
    bindStaticEvents();
    initAuthListener();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.oreAdmin = {
    login,
    logout,
    loadAllData,
    activateTab,
    updateBookingStatus
  };
})();
