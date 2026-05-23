"use strict";

(function () {
  const ADMIN_SESSION_KEY = "ore_admin_logged_in";
  const ADMIN_ROLE_KEY = "ore_admin_role";
  const ADMIN_OWNER_DOC_KEY = "ore_admin_owner_doc";
  const ADMIN_LOGIN_HINT_KEY = "ore_admin_login_hint";
  const ADMIN_EMAIL_DOMAIN = "@orebooking.com";

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
      state.ownerAccounts = state.currentOwnerRecord
        ? [{ id: state.ownerAccountDocId || cleanText(state.currentAuthUser?.uid), ...state.currentOwnerRecord }]
        : [];
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
    setText(String(state.ownerAccounts.length), "stat-owners-count", "owners-count");
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
      resetUploadPreview("admin");
      clearMapCoords("admin");
      hideMapPickedBadge("admin");
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
      await loadBookings();
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
      data.ownerName = state.currentOwnerRecord?.name || data.ownerName;
      data.hostName = data.ownerName;
    }

    setButtonLoading(btn, true, "جارٍ حفظ التعديلات...");
    try {
      await db.collection("properties").doc(docId).update(data);
      closeModal(modal);
      await loadProperties();
      await loadBookings();
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
      if (isOwnerAdmin() && !state.properties.length) {
        await loadProperties();
      }

      const items = [];
      let snap;

      if (isSuperAdmin()) {
        try {
          snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
        } catch {
          snap = await db.collection("bookings").get();
        }

        snap.forEach((doc) => items.push(normalizeBooking({ id: doc.id, ...doc.data() })));
        state.bookings = sortByCreatedDesc(items);
        renderBookings();
        renderDashboardStats();
        return;
      }

      const propertyIds = state.properties.map((p) => cleanText(p.id)).filter(Boolean);

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

      const unique = new Map();
      all.forEach((booking) => {
        unique.set(cleanText(booking.id), booking);
      });

      state.bookings = sortByCreatedDesc(
        Array.from(unique.values()).filter((booking) => canAccessBooking(booking))
      );

      renderBookings();
      renderDashboardStats();
    } catch (error) {
      console.error("loadBookings error:", error);
      state.bookings = [];
      renderBookings();
      showToast("تعذر تحميل الحجوزات.", "error");
    }
  }

  function getFilteredBookings() {
    const filter = cleanText(state.bookingFilter || "all").toLowerCase();
    if (filter === "all") return [...state.bookings];
    return state.bookings.filter((booking) => getBookingStatus(booking.status) === filter);
  }

  function renderBookings() {
    const container = byId("bookings-container");
    if (!container) return;

    const rows = getFilteredBookings();

    if (!rows.length) {
      container.innerHTML = `
        <div class="bookings-grid">
          <div class="empty-state">
            <i class="ph ph-calendar-blank"></i>
            <div>لا توجد حجوزات ضمن هذا التصنيف.</div>
          </div>
        </div>
      `;
      renderDashboardStats();
      updateBookingFilterButtons();
      return;
    }

    container.innerHTML = `
      <div class="bookings-grid">
        ${rows.map((booking) => {
          const status = getBookingStatus(booking.status);
          const canApprove = status !== "confirmed";
          const canReject = status !== "rejected";
          return `
            <div class="booking-card" data-status="${escapeHtml(status)}">
              <div class="booking-head">
                <div class="booking-title">
                  <strong>${escapeHtml(booking.propertyTitle || "عقار غير معروف")}</strong>
                  <span>مرجع: ${escapeHtml(booking.reference || booking.id || "—")}</span>
                </div>
                ${statusBadge(status)}
              </div>

              <div class="booking-meta-grid">
                <div class="booking-meta-item">
                  <label>الزبون</label>
                  <strong>${escapeHtml(booking.guestName || "غير معروف")}</strong>
                </div>
                <div class="booking-meta-item">
                  <label>البريد</label>
                  <span>${escapeHtml(booking.guestEmail || "—")}</span>
                </div>
                <div class="booking-meta-item">
                  <label>الهاتف</label>
                  <span>${escapeHtml(booking.guestPhone || "—")}</span>
                </div>
                <div class="booking-meta-item">
                  <label>المبلغ</label>
                  <strong>${escapeHtml(formatPrice(booking.total || booking.pricing?.total || 0))}</strong>
                </div>
                <div class="booking-meta-item">
                  <label>الدخول</label>
                  <span>${escapeHtml(booking.checkIn || "—")}</span>
                </div>
                <div class="booking-meta-item">
                  <label>الخروج</label>
                  <span>${escapeHtml(booking.checkOut || "—")}</span>
                </div>
                <div class="booking-meta-item">
                  <label>أنشئ في</label>
                  <span>${escapeHtml(formatDate(booking.createdAt))}</span>
                </div>
                <div class="booking-meta-item">
                  <label>الحالة</label>
                  <strong>${escapeHtml(statusLabel(status))}</strong>
                </div>
              </div>

              <div class="booking-actions-row">
                <button type="button" class="btn-approve approve-booking-btn" data-id="${escapeHtml(booking.id)}" ${canApprove ? "" : "disabled"}>
                  <i class="ph ph-check-circle"></i>
                  <span>قبول</span>
                </button>

                <button type="button" class="btn-reject reject-booking-btn" data-id="${escapeHtml(booking.id)}" ${canReject ? "" : "disabled"}>
                  <i class="ph ph-x-circle"></i>
                  <span>رفض</span>
                </button>

                <button type="button" class="btn-open-chat open-booking-chat-btn" data-id="${escapeHtml(booking.id)}">
                  <i class="ph ph-chat-circle-text"></i>
                  <span>مراسلة الزبون</span>
                </button>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;

    updateBookingFilterButtons();
  }

  function updateBookingFilterButtons() {
    qa("[data-bookings-filter]").forEach((btn) => {
      const val = cleanText(btn.dataset.bookingsFilter || "all");
      btn.classList.toggle("active", val === state.bookingFilter);
    });

    const counts = {
      all: state.bookings.length,
      pending: state.bookings.filter((b) => getBookingStatus(b.status) === "pending").length,
      confirmed: state.bookings.filter((b) => getBookingStatus(b.status) === "confirmed").length,
      rejected: state.bookings.filter((b) => getBookingStatus(b.status) === "rejected").length
    };

    setText(String(counts.all), "bookings-count-all");
    setText(String(counts.pending), "bookings-count-pending");
    setText(String(counts.confirmed), "bookings-count-confirmed");
    setText(String(counts.rejected), "bookings-count-rejected");
  }

  async function loadOwnerAccounts() {
    try {
      const items = [];
      const snap = await db.collection("ownerAccounts").get();
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      state.ownerAccounts = sortByCreatedDesc(items);
      renderOwnerAccounts();
      renderDashboardStats();
    } catch (error) {
      console.error("loadOwnerAccounts error:", error);
      state.ownerAccounts = [];
      renderOwnerAccounts();
    }
  }

  function renderOwnerAccounts() {
    const tbody = byId("owners-table-body") || byId("owners-tbody");
    if (!tbody) return;

    const rows = isSuperAdmin()
      ? [...state.ownerAccounts]
      : state.ownerAccounts.filter((row) => normalizeEmail(row.email) === normalizeEmail(state.currentAuthUser?.email));

    if (!rows.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5">
            <div class="empty-state">
              <i class="ph ph-users-three"></i>
              لا يوجد مُلّاك لعرضهم حالياً.
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rows.map((owner) => {
      const linkedProperties = state.properties.filter((p) => normalizeEmail(p.ownerEmail) === normalizeEmail(owner.email)).length;
      return `
        <tr>
          <td>${escapeHtml(owner.name || "—")}</td>
          <td>${escapeHtml(owner.email || "—")}</td>
          <td>${escapeHtml(owner.role || "owner")}</td>
          <td>${escapeHtml(String(linkedProperties))}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="open-owner-properties-btn" data-email="${escapeHtml(owner.email || "")}">
                <i class="ph ph-buildings"></i> العقارات
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  async function loadUsers() {
    try {
      const items = [];
      const snap = await db.collection("users").get();
      snap.forEach((doc) => items.push(normalizeUser(doc.data() || {}, doc.id)));
      state.users = sortByCreatedDesc(items);
      renderDashboardStats();
    } catch (error) {
      console.error("loadUsers error:", error);
      state.users = [];
    }
  }

  async function loadChats() {
    try {
      if (state.listeners.chats) {
        state.listeners.chats();
        state.listeners.chats = null;
      }

      state.listeners.chats = db.collection("chats").onSnapshot((snap) => {
        const items = [];
        snap.forEach((doc) => items.push(normalizeChat(doc.data() || {}, doc.id)));
        state.chats = sortByCreatedDesc(items.filter(canAccessChat));
        renderChatThreads();

        if (state.currentChatId && !state.chats.some((c) => c.id === state.currentChatId)) {
          state.currentChatId = null;
          state.currentChatMessages = [];
          renderCurrentChatMessages();
        }
      }, (error) => {
        console.error("chat listener error:", error);
      });
    } catch (error) {
      console.error("loadChats error:", error);
      state.chats = [];
      renderChatThreads();
    }
  }

  function renderChatThreads() {
    const list = byId("chat-threads-list");
    if (!list) return;

    if (!state.chats.length) {
      list.innerHTML = `
        <div class="empty-state" style="padding:24px;">
          <i class="ph ph-chat-teardrop-dots"></i>
          لا توجد محادثات حالياً.
        </div>
      `;
      return;
    }

    list.innerHTML = state.chats.map((chat) => {
      const active = chat.id === state.currentChatId;
      return `
        <button type="button" class="ghost-action chat-thread-btn ${active ? "active" : ""}" data-chat-id="${escapeHtml(chat.id)}" style="width:100%;justify-content:flex-start;text-align:right;">
          <span style="display:grid;gap:4px;text-align:right;">
            <strong>${escapeHtml(chat.userName || chat.userEmail || "محادثة")}</strong>
            <small style="color:#64748b;">${escapeHtml(chat.lastMessage || "لا توجد رسالة بعد")}</small>
          </span>
        </button>
      `;
    }).join("");
  }

  async function openChat(chatId) {
    if (!chatId) return;
    state.currentChatId = chatId;
    renderChatThreads();

    const chat = state.chats.find((c) => c.id === chatId);
    setText(chat?.userName || "بريد الرسائل", "chat-active-title");
    setText(chat?.userEmail || "اختر محادثة لعرض الرسائل.", "chat-active-subtitle");

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
        .onSnapshot((snap) => {
          const items = [];
          snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
          state.currentChatMessages = items;
          renderCurrentChatMessages();
        }, (error) => {
          console.error("chat messages listener error:", error);
        });
    } catch (error) {
      console.error("openChat error:", error);
      state.currentChatMessages = [];
      renderCurrentChatMessages();
    }
  }

  function renderCurrentChatMessages() {
    const box = byId("chat-messages-list");
    if (!box) return;

    if (!state.currentChatId) {
      box.innerHTML = `
        <div class="chat-empty-state">
          <i class="ph ph-chat-circle"></i>
          اختر محادثة لعرض الرسائل.
        </div>
      `;
      return;
    }

    if (!state.currentChatMessages.length) {
      box.innerHTML = `
        <div class="chat-empty-state">
          <i class="ph ph-chat-circle"></i>
          لا توجد رسائل لعرضها.
        </div>
      `;
      return;
    }

    box.innerHTML = state.currentChatMessages.map((msg) => {
      const fromAdmin = cleanText(msg.senderRole || msg.role) === "admin";
      return `
        <div style="
          max-width:78%;
          align-self:${fromAdmin ? "flex-end" : "flex-start"};
          background:${fromAdmin ? "#dbeafe" : "#ffffff"};
          color:#0f172a;
          border:1px solid ${fromAdmin ? "#93c5fd" : "#e2e8f0"};
          border-radius:18px;
          padding:12px 14px;
          line-height:1.8;
          box-shadow:0 8px 18px rgba(15,23,42,.05);
        ">
          <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(msg.senderName || (fromAdmin ? "الإدارة" : "الزبون"))}</div>
          <div>${escapeHtml(msg.text || msg.message || "")}</div>
          <div style="margin-top:8px;font-size:.76rem;color:#64748b;">${escapeHtml(formatDate(msg.createdAt))}</div>
        </div>
      `;
    }).join("");

    box.scrollTop = box.scrollHeight;
  }

  async function ensureChatForBooking(booking) {
    if (!booking || !booking.id) throw new Error("BOOKING_REQUIRED");

    const userId = cleanText(booking.userId);
    const ownerId = cleanText(
      pickFirst(
        booking.ownerUid,
        state.properties.find((p) => cleanText(p.id) === cleanText(booking.propertyId))?.ownerUid,
        state.currentAuthUser?.uid
      )
    );

    const existing = state.chats.find((chat) => cleanText(chat.bookingId) === cleanText(booking.id));
    if (existing) return existing.id;

    const payload = {
      bookingId: cleanText(booking.id),
      propertyId: cleanText(booking.propertyId),
      userId,
      ownerId,
      userName: cleanText(booking.guestName),
      userEmail: cleanText(booking.guestEmail),
      participantIds: [userId, ownerId].filter(Boolean),
      participants: [userId, ownerId].filter(Boolean),
      lastMessage: "",
      createdAt: getServerTimestamp(),
      updatedAt: getServerTimestamp()
    };

    const ref = await db.collection("chats").add(payload);
    return ref.id;
  }

  async function sendSystemMessageToBookingUser(booking, text, extra = {}) {
    if (!firebaseReady || !booking?.id || !cleanText(text)) return;

    const chatId = await ensureChatForBooking(booking);

    const msg = {
      text: cleanText(text),
      message: cleanText(text),
      senderId: cleanText(state.currentAuthUser?.uid || "admin"),
      senderName: cleanText(state.currentAuthUser?.displayName || state.currentAuthUser?.email || "إدارة OreBooking"),
      senderRole: "admin",
      type: extra.type || "system",
      bookingId: cleanText(booking.id),
      propertyId: cleanText(booking.propertyId),
      createdAt: getServerTimestamp()
    };

    await db.collection("chats").doc(chatId).collection("messages").add(msg);
    await db.collection("chats").doc(chatId).set({
      bookingId: cleanText(booking.id),
      propertyId: cleanText(booking.propertyId),
      userId: cleanText(booking.userId),
      ownerId: cleanText(
        pickFirst(
          booking.ownerUid,
          state.properties.find((p) => cleanText(p.id) === cleanText(booking.propertyId))?.ownerUid,
          state.currentAuthUser?.uid
        )
      ),
      userName: cleanText(booking.guestName),
      userEmail: cleanText(booking.guestEmail),
      lastMessage: cleanText(text),
      updatedAt: getServerTimestamp()
    }, { merge: true });
  }

  function getRejectModal() {
    return byId("reject-booking-modal");
  }

  function clearRejectReasonSelection() {
    qa('input[name="reject-reason"]').forEach((input) => {
      input.checked = false;
    });
    byId("reject-reason-error")?.classList.remove("show");
  }

  function getSelectedRejectReason() {
    const selected = q('input[name="reject-reason"]:checked');
    return cleanText(selected?.value);
  }

  function openRejectBookingModal(bookingId) {
    const booking = state.bookings.find((b) => cleanText(b.id) === cleanText(bookingId));
    if (!booking) {
      showToast("الحجز غير موجود.", "error");
      return;
    }
    if (!canAccessBooking(booking)) {
      showToast("ليست لديك صلاحية تعديل هذا الحجز.", "error");
      return;
    }

    state.pendingRejectBookingId = bookingId;
    clearRejectReasonSelection();

    const modal = getRejectModal();
    if (!modal) {
      showToast("مودال الرفض غير موجود في الصفحة.", "error");
      return;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeRejectBookingModal() {
    const modal = getRejectModal();
    if (!modal) return;
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    state.pendingRejectBookingId = "";
    clearRejectReasonSelection();
  }

  async function approveBooking(bookingId) {
    if (!firebaseReady) return;
    const booking = state.bookings.find((b) => cleanText(b.id) === cleanText(bookingId));
    if (!booking) return showToast("الحجز غير موجود.", "error");
    if (!canAccessBooking(booking)) return showToast("ليست لديك صلاحية تعديل هذا الحجز.", "error");

    try {
      await db.collection("bookings").doc(bookingId).update({
        status: "confirmed",
        approvedAt: getServerTimestamp(),
        approvedBy: cleanText(state.currentAuthUser?.uid),
        updatedAt: getServerTimestamp()
      });

      const msg = `تم قبول حجزك للعقار "${booking.propertyTitle}". المرجع: ${booking.reference || booking.id}.`;
      await sendSystemMessageToBookingUser(booking, msg, { type: "booking-approved" });

      showToast("تم قبول الحجز وإرسال إشعار للزبون.", "success");
      await loadBookings();
    } catch (error) {
      console.error("approveBooking error:", error);
      showToast("تعذر قبول الحجز.", "error");
    }
  }

  async function confirmRejectBooking() {
    if (!firebaseReady) return;

    const bookingId = cleanText(state.pendingRejectBookingId);
    const reason = getSelectedRejectReason();
    const errorBox = byId("reject-reason-error");

    if (!reason) {
      errorBox?.classList.add("show");
      showToast("يجب اختيار سبب الرفض أولاً.", "warning");
      return;
    }

    const booking = state.bookings.find((b) => cleanText(b.id) === cleanText(bookingId));
    if (!booking) return showToast("الحجز غير موجود.", "error");
    if (!canAccessBooking(booking)) return showToast("ليست لديك صلاحية تعديل هذا الحجز.", "error");

    const btn = byId("confirm-reject-booking-btn");
    setButtonLoading(btn, true, "جارٍ رفض الحجز...");

    try {
      await db.collection("bookings").doc(bookingId).update({
        status: "rejected",
        rejectionReason: reason,
        rejectedAt: getServerTimestamp(),
        rejectedBy: cleanText(state.currentAuthUser?.uid),
        updatedAt: getServerTimestamp()
      });

      const msg = `تم رفض حجزك للعقار "${booking.propertyTitle}". السبب: ${reason}. المرجع: ${booking.reference || booking.id}.`;
      await sendSystemMessageToBookingUser(booking, msg, { type: "booking-rejected" });

      closeRejectBookingModal();
      showToast("تم رفض الحجز وإرسال السبب للزبون.", "success");
      await loadBookings();
    } catch (error) {
      console.error("confirmRejectBooking error:", error);
      showToast("تعذر رفض الحجز.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function openChatFromBooking(bookingId) {
    const booking = state.bookings.find((b) => cleanText(b.id) === cleanText(bookingId));
    if (!booking) return showToast("الحجز غير موجود.", "error");

    try {
      const chatId = await ensureChatForBooking(booking);
      activateTab("messages", { silentAuth: true });
      await openChat(chatId);
    } catch (error) {
      console.error("openChatFromBooking error:", error);
      showToast("تعذر فتح المحادثة.", "error");
    }
  }

  async function sendCurrentChatMessage() {
    if (!firebaseReady) return;
    if (!state.currentChatId) return showToast("اختر محادثة أولاً.", "warning");

    const textarea = byId("chat-message-input");
    const btn = byId("send-chat-message-btn");
    const text = cleanText(textarea?.value);

    if (!text) return showToast("اكتب رسالة أولاً.", "warning");

    setButtonLoading(btn, true, "جارٍ الإرسال...");
    try {
      const payload = {
        text,
        message: text,
        senderId: cleanText(state.currentAuthUser?.uid || "admin"),
        senderName: cleanText(state.currentAuthUser?.displayName || state.currentAuthUser?.email || "إدارة OreBooking"),
        senderRole: "admin",
        createdAt: getServerTimestamp()
      };

      await db.collection("chats").doc(state.currentChatId).collection("messages").add(payload);
      await db.collection("chats").doc(state.currentChatId).set({
        lastMessage: text,
        updatedAt: getServerTimestamp()
      }, { merge: true });

      if (textarea) textarea.value = "";
    } catch (error) {
      console.error("sendCurrentChatMessage error:", error);
      showToast("تعذر إرسال الرسالة.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function resetUploadPreview(prefix = "admin") {
    const img = byId(`${prefix}-preview-image`);
    if (img) img.src = "images/placeholder.jpg";
  }

  function setUploadPreviewFromUrl(prefix = "admin", url = "") {
    const img = byId(`${prefix}-preview-image`);
    if (img) img.src = cleanText(url) || "images/placeholder.jpg";
  }

  function clearMapCoords(prefix = "admin") {
    setValue("", `${prefix}-lat`);
    setValue("", `${prefix}-lng`);
  }

  function hideMapPickedBadge(prefix = "admin") {
    const badge = byId(`${prefix}-map-picked-badge`);
    if (badge) badge.classList.add("hidden");
  }

  function showMapPickedBadge(prefix = "admin") {
    const badge = byId(`${prefix}-map-picked-badge`);
    if (badge) badge.classList.remove("hidden");
  }

  function updateMapMarkerFromInputs(prefix = "admin") {
    const lat = Number(getValue(`${prefix}-lat`));
    const lng = Number(getValue(`${prefix}-lng`));
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const map = state.maps[prefix];
    const markerKey = `${prefix}Marker`;
    if (map && typeof L !== "undefined") {
      if (!state.maps[markerKey]) {
        state.maps[markerKey] = L.marker([lat, lng]).addTo(map);
      } else {
        state.maps[markerKey].setLatLng([lat, lng]);
      }
      map.setView([lat, lng], 13);
    }
  }

  function initMap(prefix = "admin") {
    const mapEl = byId(`${prefix}-map`);
    if (!mapEl || typeof L === "undefined") return;

    if (state.maps[prefix]) return;

    const defaultLat = 33.3678;
    const defaultLng = 6.8517;

    state.maps[prefix] = L.map(mapEl).setView([defaultLat, defaultLng], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(state.maps[prefix]);

    state.maps[prefix].on("click", (e) => {
      const { lat, lng } = e.latlng || {};
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      setValue(String(lat), `${prefix}-lat`);
      setValue(String(lng), `${prefix}-lng`);
      updateMapMarkerFromInputs(prefix);
      showMapPickedBadge(prefix);
    });
  }

  function wireTabs() {
    qa("[data-tab-target], .sidebar-nav .nav-item[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = btn.dataset.tabTarget || btn.dataset.tab;
        activateTab(target);
      });
    });
  }

  function wirePropertyActions() {
    document.addEventListener("click", async (e) => {
      const editBtn = e.target.closest(".edit-property-btn");
      if (editBtn) {
        openEditPropertyModal(editBtn.dataset.id);
        return;
      }

      const toggleBtn = e.target.closest(".toggle-property-btn");
      if (toggleBtn) {
        await togglePropertyVisibility(toggleBtn.dataset.id, toggleBtn.dataset.visible === "1");
        return;
      }

      const deleteBtn = e.target.closest(".delete-property-btn");
      if (deleteBtn) {
        await deleteProperty(deleteBtn.dataset.id);
        return;
      }

      const approveBtn = e.target.closest(".approve-booking-btn");
      if (approveBtn) {
        await approveBooking(approveBtn.dataset.id);
        return;
      }

      const rejectBtn = e.target.closest(".reject-booking-btn");
      if (rejectBtn) {
        openRejectBookingModal(rejectBtn.dataset.id);
        return;
      }

      const openChatBtn = e.target.closest(".open-booking-chat-btn");
      if (openChatBtn) {
        await openChatFromBooking(openChatBtn.dataset.id);
        return;
      }

      const threadBtn = e.target.closest(".chat-thread-btn");
      if (threadBtn) {
        await openChat(threadBtn.dataset.chatId);
        return;
      }

      const ownerPropsBtn = e.target.closest(".open-owner-properties-btn");
      if (ownerPropsBtn) {
        activateTab("properties", { silentAuth: true });
        const search = byId("properties-search") || byId("property-search") || byId("properties-search-input");
        if (search) {
          search.value = ownerPropsBtn.dataset.email || "";
          renderPropertiesTable();
        }
      }
    });
  }

  function wireBookingFilters() {
    qa("[data-bookings-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.bookingFilter = cleanText(btn.dataset.bookingsFilter || "all");
        renderBookings();
      });
    });
  }

  function wireSearches() {
    const propSearch = byId("properties-search") || byId("property-search") || byId("properties-search-input");
    if (propSearch) {
      propSearch.addEventListener("input", renderPropertiesTable);
    }
  }

  function wireForms() {
    const loginForm = byId("admin-login-form") || byId("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button[type="submit"]');
        const email = getValue("admin-login-email", "login-email", "admin-email");
        const password = getValue("admin-login-password", "login-password", "admin-password");

        setButtonLoading(btn, true, "جارٍ تسجيل الدخول...");
        try {
          await login(email, password);
        } finally {
          setButtonLoading(btn, false);
        }
      });
    }

    const addForm = byId("add-property-form") || byId("admin-property-form");
    if (addForm) addForm.addEventListener("submit", handleAddPropertySubmit);

    const editForm = byId("edit-property-form") || byId("edit-form");
    if (editForm) editForm.addEventListener("submit", handleEditPropertySubmit);

    const logoutBtn = byId("admin-logout-btn") || byId("logout-btn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);

    const sendChatBtn = byId("send-chat-message-btn");
    if (sendChatBtn) sendChatBtn.addEventListener("click", sendCurrentChatMessage);

    const chatInput = byId("chat-message-input");
    if (chatInput) {
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendCurrentChatMessage();
        }
      });
    }

    const confirmRejectBtn = byId("confirm-reject-booking-btn");
    if (confirmRejectBtn) confirmRejectBtn.addEventListener("click", confirmRejectBooking);

    const cancelRejectBtn = byId("cancel-reject-booking-btn");
    if (cancelRejectBtn) cancelRejectBtn.addEventListener("click", closeRejectBookingModal);

    qa("[data-close-modal], .modal-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        const modal = btn.closest(".modal-overlay");
        if (modal?.id === "reject-booking-modal") closeRejectBookingModal();
        else closeModal(modal);
      });
    });

    qa(".modal-overlay").forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target !== modal) return;
        if (modal.id === "reject-booking-modal") closeRejectBookingModal();
        else closeModal(modal);
      });
    });
  }

  function setupAuthObserver() {
    if (!auth || typeof auth.onAuthStateChanged !== "function") {
      state.authReady = true;
      ensureLoggedInUI();
      return;
    }

    if (state.listeners.auth) {
      try { state.listeners.auth(); } catch {}
      state.listeners.auth = null;
    }

    state.listeners.auth = auth.onAuthStateChanged(async (user) => {
      state.authReady = true;

      if (!user) {
        clearAdminSessionState();
        ensureLoggedInUI();
        updateProfileUI();
        updateRoleBasedUI();
        return;
      }

      try {
        const roleResult = await getAdminRoleFromFirestore(user);
        if (!roleResult.ok) {
          clearAdminSessionState();
          ensureLoggedInUI();
          updateProfileUI();
          updateRoleBasedUI();
          return;
        }

        await applyAuthorizedSession(user, roleResult);
      } catch (error) {
        console.error("auth observer restore failed:", error);
        clearAdminSessionState();
        ensureLoggedInUI();
        updateProfileUI();
        updateRoleBasedUI();
      }
    });
  }

  function preloadRememberedLogin() {
    const remembered = safeGet(ADMIN_LOGIN_HINT_KEY, "");
    if (!remembered) return;
    const input = byId("admin-login-email") || byId("login-email") || byId("admin-email");
    if (input && !cleanText(input.value)) input.value = remembered;
  }

  function boot() {
    showFirebaseStatus();
    ensureLoggedInUI();
    updateProfileUI();
    updateRoleBasedUI();
    preloadRememberedLogin();
    initMap("add");
    initMap("edit");
    wireTabs();
    wirePropertyActions();
    wireBookingFilters();
    wireSearches();
    wireForms();
    setupAuthObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();