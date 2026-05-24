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
    window.db ||
    (typeof firebase !== "undefined" && typeof firebase.firestore === "function"
      ? firebase.firestore()
      : null);

  const auth =
    window.__auth ||
    window.__frontAuth ||
    window.auth ||
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
    return normalizeEmail(value).replace(/\s+/g, "");
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

  function setStat(id, value) {
    const el = byId(id);
    if (el) el.textContent = value ?? "";
  }

  function getRandomRoomNumber() {
    return String(Math.floor(Math.random() * 900) + 100);
  }

  function getApprovalBaseMessage() {
    return "تم قبول حجزك بنجاح.";
  }

  function getRoomNumberMessage(roomNumber) {
    return `رقم الغرفة: ${roomNumber}`;
  }

  function getAutoApprovalMessage(roomNumber) {
    return `${getApprovalBaseMessage()} ${getRoomNumberMessage(roomNumber)}`;
  }

  function getAutoRejectionMessage(reason) {
    return `تم رفض الحجز. السبب: ${cleanText(reason || "لم يتم تحديد السبب")}`;
  }

  function isPermissionDenied(error) {
    const code = String(error?.code || "");
    const message = String(error?.message || "");
    return code.includes("permission-denied") || message.includes("Missing or insufficient permissions");
  }

  function logLookupWarning(label, error) {
    if (isPermissionDenied(error)) return;
    console.warn(label, error);
  }

  function showPermissionMessage(section) {
    const map = {
      owners: "لا توجد صلاحية لقراءة حسابات الملاك من Firestore.",
      users: "لا توجد صلاحية لقراءة المستخدمين من Firestore.",
      bookings: "لا توجد صلاحية لقراءة الحجوزات من Firestore.",
      properties: "لا توجد صلاحية لقراءة العقارات من Firestore.",
      chats: "لا توجد صلاحية لقراءة المحادثات من Firestore."
    };
    showToast(map[section] || "لا توجد صلاحية للوصول إلى البيانات المطلوبة.", "warning");
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

  function getLoginForm() {
    return q("[data-admin-login-form]") || byId("admin-login-form") || byId("login-form");
  }

  function getLoginUsernameElement() {
    return (
      byId("admin-login-email") ||
      byId("admin-username") ||
      byId("admin-user") ||
      byId("login-username") ||
      byId("username") ||
      byId("email")
    );
  }

  function getLoginPasswordElement() {
    return (
      byId("admin-login-password") ||
      byId("admin-password") ||
      byId("admin-pass") ||
      byId("login-password") ||
      byId("password")
    );
  }

  function setLoginFeedback(message = "", type = "") {
    const status = byId("admin-login-status");
    if (status) {
      status.className = `login-status-text${type ? ` ${type}` : ""}`;
      status.textContent = message;
    }
  }

  function setLoginLoading(loading, message = "جارٍ تسجيل الدخول...") {
    const btn = byId("admin-login-btn") || byId("login-btn");
    const emailInput = getLoginUsernameElement();
    const passwordInput = getLoginPasswordElement();

    if (emailInput) emailInput.disabled = !!loading;
    if (passwordInput) passwordInput.disabled = !!loading;

    if (btn) {
      if (loading) {
        btn.disabled = true;
        if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
        btn.classList.add("is-loading");
        btn.innerHTML = `<span class="login-submit-text"><i class="ph ph-spinner-gap"></i><span>${escapeHtml(message)}</span></span>`;
      } else {
        btn.disabled = false;
        btn.classList.remove("is-loading");
        if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
      }
    }

    if (loading) setLoginFeedback(message, "loading");
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

  function getCheckedValues(selector) {
    try {
      return qa(selector)
        .filter((el) => el.checked)
        .map((el) => cleanText(el.value))
        .filter(Boolean);
    } catch {
      return [];
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
      state.currentOwnerRecord?.fullName ||
      state.currentOwnerRecord?.username ||
      state.currentAuthUser?.displayName ||
      state.currentAuthUser?.email ||
      "الحساب الحالي";

    const role =
      state.adminRole === "admin"
        ? "أدمن عام"
        : state.adminRole === "owner"
          ? "مالك عقار"
          : "غير معروف";

    const email =
      state.currentAuthUser?.email ||
      state.currentOwnerRecord?.email ||
      "—";

    setText(name, "admin-profile-name");
    setText(role, "admin-profile-role", "sidebar-user-role");
    setText(email, "admin-profile-email");
  }

  function updateRoleBasedUI() {
    qa(".admin-only").forEach((el) => {
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

  function getCurrentOwnerIdentity() {
    const owner = state.currentOwnerRecord || {};
    return {
      uid: cleanText(pickFirst(state.currentAuthUser?.uid, owner?.uid, owner?.ownerUid, owner?.userId)),
      email: normalizeEmail(pickFirst(state.currentAuthUser?.email, owner?.email, owner?.ownerEmail, owner?.userEmail)),
      ownerDocId: cleanText(pickFirst(state.ownerAccountDocId, owner?.id, owner?.docId, owner?.ownerDocId)),
      username: cleanText(pickFirst(owner?.username, owner?.ownerUsername, owner?.login, owner?.userName)).toLowerCase(),
      phone: cleanText(pickFirst(owner?.phone, owner?.ownerPhone, owner?.mobile, owner?.whatsapp)),
      role: cleanText(state.adminRole)
    };
  }

  function propertyOwnerMatchesCurrentOwner(property) {
    if (isSuperAdmin()) return true;
    if (!isOwnerAdmin()) return false;

    const current = getCurrentOwnerIdentity();
    const candidates = [
      cleanText(pickFirst(property?.ownerUid, property?.ownerId, property?.hostUid, property?.ownerUserId, property?.userId)),
      normalizeEmail(pickFirst(property?.ownerEmail, property?.hostEmail, property?.email, property?.userEmail)),
      cleanText(pickFirst(property?.ownerAccountDocId, property?.ownerDocId, property?.ownerAccountId)),
      cleanText(pickFirst(property?.ownerUsername, property?.username, property?.hostUsername)).toLowerCase(),
      cleanText(pickFirst(property?.ownerPhone, property?.hostPhone, property?.phone, property?.whatsapp))
    ].filter(Boolean);

    return (
      (current.uid && candidates.includes(current.uid)) ||
      (current.email && candidates.includes(current.email)) ||
      (current.ownerDocId && candidates.includes(current.ownerDocId)) ||
      (current.username && candidates.includes(current.username)) ||
      (current.phone && candidates.includes(current.phone))
    );
  }

  function propertyBelongsToCurrentOwner(property) {
    if (isSuperAdmin()) return true;
    if (!isOwnerAdmin()) return false;
    if (propertyOwnerMatchesCurrentOwner(property)) return true;

    const nestedOwner = isObject(property?.owner) ? property.owner : {};
    const nestedHost = isObject(property?.host) ? property.host : {};

    return propertyOwnerMatchesCurrentOwner({
      ownerUid: pickFirst(nestedOwner?.uid, nestedHost?.uid),
      ownerId: pickFirst(nestedOwner?.id, nestedHost?.id),
      ownerEmail: pickFirst(nestedOwner?.email, nestedHost?.email),
      ownerPhone: pickFirst(nestedOwner?.phone, nestedHost?.phone),
      ownerUsername: pickFirst(nestedOwner?.username, nestedHost?.username),
      ownerAccountDocId: pickFirst(
        nestedOwner?.ownerAccountDocId,
        nestedOwner?.docId,
        nestedHost?.ownerAccountDocId,
        nestedHost?.docId
      )
    });
  }

  function canManageProperty(property) {
    return propertyBelongsToCurrentOwner(property);
  }

  function canAccessBooking(booking) {
    if (isSuperAdmin()) return true;
    if (!isOwnerAdmin()) return false;

    const current = getCurrentOwnerIdentity();
    const bookingPropertyId = cleanText(booking?.propertyId);

    if (bookingPropertyId) {
      const prop = state.properties.find((p) => cleanText(p.id) === bookingPropertyId);
      if (prop && propertyBelongsToCurrentOwner(prop)) return true;
    }

    const bookingOwnerUid = cleanText(
      pickFirst(
        booking?.ownerUid,
        booking?.ownerId,
        booking?.hostUid,
        booking?.propertyOwnerUid,
        deepGet(booking, "property.ownerUid"),
        deepGet(booking, "property.ownerId"),
        deepGet(booking, "owner.uid")
      )
    );

    const bookingOwnerEmail = normalizeEmail(
      pickFirst(
        booking?.ownerEmail,
        booking?.hostEmail,
        booking?.propertyOwnerEmail,
        deepGet(booking, "property.ownerEmail"),
        deepGet(booking, "property.hostEmail"),
        deepGet(booking, "owner.email")
      )
    );

    const bookingOwnerDocId = cleanText(
      pickFirst(
        booking?.ownerAccountDocId,
        booking?.ownerDocId,
        deepGet(booking, "property.ownerAccountDocId"),
        deepGet(booking, "owner.ownerAccountDocId"),
        deepGet(booking, "owner.docId")
      )
    );

    const bookingOwnerUsername = cleanText(
      pickFirst(
        booking?.ownerUsername,
        deepGet(booking, "owner.username"),
        deepGet(booking, "property.ownerUsername")
      )
    ).toLowerCase();

    const bookingOwnerPhone = cleanText(
      pickFirst(
        booking?.ownerPhone,
        deepGet(booking, "owner.phone"),
        deepGet(booking, "property.ownerPhone")
      )
    );

    return (
      (current.uid && bookingOwnerUid && current.uid === bookingOwnerUid) ||
      (current.email && bookingOwnerEmail && current.email === bookingOwnerEmail) ||
      (current.ownerDocId && bookingOwnerDocId && current.ownerDocId === bookingOwnerDocId) ||
      (current.username && bookingOwnerUsername && current.username === bookingOwnerUsername) ||
      (current.phone && bookingOwnerPhone && current.phone === bookingOwnerPhone)
    );
  }

  function canAccessChat(chat) {
    if (isSuperAdmin()) return true;
    if (!isOwnerAdmin()) return false;

    const current = getCurrentOwnerIdentity();

    const chatOwnerUid = cleanText(
      pickFirst(chat?.ownerId, chat?.ownerUid, chat?.hostUid, chat?.adminId, deepGet(chat, "owner.uid"))
    );

    const chatOwnerEmail = normalizeEmail(
      pickFirst(chat?.ownerEmail, chat?.hostEmail, deepGet(chat, "owner.email"))
    );

    const chatOwnerDocId = cleanText(
      pickFirst(chat?.ownerAccountDocId, chat?.ownerDocId, deepGet(chat, "owner.docId"))
    );

    const chatOwnerUsername = cleanText(
      pickFirst(chat?.ownerUsername, deepGet(chat, "owner.username"))
    ).toLowerCase();

    const chatOwnerPhone = cleanText(
      pickFirst(chat?.ownerPhone, deepGet(chat, "owner.phone"))
    );

    if (current.uid && chatOwnerUid && current.uid === chatOwnerUid) return true;
    if (current.email && chatOwnerEmail && current.email === chatOwnerEmail) return true;
    if (current.ownerDocId && chatOwnerDocId && current.ownerDocId === chatOwnerDocId) return true;
    if (current.username && chatOwnerUsername && current.username === chatOwnerUsername) return true;
    if (current.phone && chatOwnerPhone && current.phone === chatOwnerPhone) return true;

    const prop = state.properties.find((p) => cleanText(p.id) === cleanText(chat?.propertyId));
    return !!prop && propertyBelongsToCurrentOwner(prop);
  }

  function normalizeBooking(raw) {
    const guest = isObject(raw?.guest) ? raw.guest : {};
    const stay = isObject(raw?.stay) ? raw.stay : {};
    const pricing = isObject(raw?.pricing) ? raw.pricing : {};
    const property = isObject(raw?.property) ? raw.property : {};
    const owner = isObject(raw?.owner) ? raw.owner : {};

    const guestName = cleanText(
      pickFirst(
        raw?.guestName,
        raw?.userName,
        raw?.customerName,
        guest?.fullName,
        guest?.name,
        `${cleanText(guest?.firstName)} ${cleanText(guest?.familyName)}`.trim(),
        raw?.name
      )
    ) || "غير معروف";

    const guestEmail = cleanText(
      pickFirst(raw?.guestEmail, raw?.userEmail, guest?.email, raw?.email, raw?.customerEmail)
    ) || "—";

    const guestPhone = cleanText(
      pickFirst(raw?.guestPhone, raw?.phone, guest?.phone, raw?.customerPhone)
    ) || "—";

    const propertyTitle = cleanText(
      pickFirst(
        raw?.propertyTitleAr,
        raw?.propertyTitle,
        raw?.propertyName,
        property?.titleAr,
        property?.title,
        property?.name
      )
    ) || "عقار غير معروف";

    const checkIn = cleanText(pickFirst(raw?.checkIn, raw?.arrivalDate, stay?.checkIn)) || "—";
    const checkOut = cleanText(pickFirst(raw?.checkOut, raw?.departureDate, stay?.checkOut)) || "—";
    const total = pickFirst(raw?.total, raw?.totalAmount, raw?.amount, raw?.price, pricing?.total, pricing?.totalAmount) || 0;
    const reference = cleanText(pickFirst(raw?.reference, raw?.bookingReference, raw?.bookingRef, raw?.id)) || cleanText(raw?.id);
    const userId = cleanText(pickFirst(raw?.userId, raw?.uid, guest?.userId, raw?.customerId));
    const propertyId = cleanText(pickFirst(raw?.propertyId, raw?.listingId, property?.id));
    const createdAt = pickFirst(raw?.createdAt, raw?.createdAtServer, raw?.timestamp, raw?.dateCreated, raw?.createdOn);

    return {
      ...raw,
      id: cleanText(raw?.id),
      guest,
      stay,
      pricing,
      property,
      owner,
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
      roomNumber: cleanText(pickFirst(raw?.roomNumber, raw?.roomNo, raw?.room)),
      approvalReply: cleanText(pickFirst(raw?.approvalReply, raw?.ownerReply, raw?.replyMessage)),
      rejectReason: cleanText(pickFirst(raw?.rejectReason, raw?.rejectionReason, raw?.declineReason)),
      ownerUid: cleanText(
        pickFirst(
          raw?.ownerUid,
          raw?.ownerId,
          raw?.hostUid,
          raw?.propertyOwnerUid,
          property?.ownerUid,
          property?.ownerId,
          owner?.uid
        )
      ),
      ownerEmail: cleanText(
        pickFirst(
          raw?.ownerEmail,
          raw?.hostEmail,
          raw?.propertyOwnerEmail,
          property?.ownerEmail,
          property?.hostEmail,
          owner?.email
        )
      ),
      ownerAccountDocId: cleanText(
        pickFirst(
          raw?.ownerAccountDocId,
          raw?.ownerDocId,
          property?.ownerAccountDocId,
          owner?.ownerAccountDocId,
          owner?.docId
        )
      ),
      ownerUsername: cleanText(pickFirst(raw?.ownerUsername, property?.ownerUsername, owner?.username)),
      ownerPhone: cleanText(pickFirst(raw?.ownerPhone, property?.ownerPhone, owner?.phone)),
      status: getBookingStatus(raw?.status)
    };
  }

  function normalizeChat(raw, id = "") {
    return {
      id: cleanText(id || raw?.id),
      ...raw,
      participants: Array.isArray(raw?.participants) ? raw.participants : [],
      participantIds: normalizeArray(raw?.participantIds),
      userId: cleanText(pickFirst(raw?.userId, raw?.customerId, raw?.clientId)),
      ownerId: cleanText(pickFirst(raw?.ownerId, raw?.ownerUid, raw?.hostId, raw?.hostUid, raw?.adminId)),
      ownerEmail: cleanText(pickFirst(raw?.ownerEmail, raw?.hostEmail)),
      ownerAccountDocId: cleanText(pickFirst(raw?.ownerAccountDocId, raw?.ownerDocId)),
      ownerUsername: cleanText(pickFirst(raw?.ownerUsername, deepGet(raw, "owner.username"))),
      ownerPhone: cleanText(pickFirst(raw?.ownerPhone, deepGet(raw, "owner.phone"))),
      bookingId: cleanText(pickFirst(raw?.bookingId, raw?.reservationId)),
      propertyId: cleanText(pickFirst(raw?.propertyId, raw?.listingId)),
      propertyTitle: cleanText(pickFirst(raw?.propertyTitle, raw?.propertyName)),
      userName: cleanText(pickFirst(raw?.userName, raw?.customerName, raw?.clientName, raw?.name)),
      userEmail: cleanText(pickFirst(raw?.userEmail, raw?.customerEmail, raw?.email)),
      lastMessage: cleanText(pickFirst(raw?.lastMessage, raw?.lastText, raw?.lastMessageText)),
      updatedAt: pickFirst(raw?.updatedAt, raw?.lastMessageAt, raw?.createdAt)
    };
  }

  function normalizeUser(raw, id) {
    return {
      id,
      ...raw,
      uid: cleanText(pickFirst(raw?.uid, id)),
      name: cleanText(pickFirst(raw?.name, raw?.fullName, raw?.displayName, raw?.username)),
      email: cleanText(pickFirst(raw?.email, raw?.userEmail)),
      phone: cleanText(pickFirst(raw?.phone, raw?.mobile)),
      role: cleanText(raw?.role).toLowerCase(),
      createdAt: pickFirst(raw?.createdAt, raw?.createdAtServer, raw?.timestamp)
    };
  }

  function sortByCreatedDesc(items) {
    return [...items].sort((a, b) => {
      const at = a?.createdAt?.toMillis?.() || new Date(a?.createdAt || 0).getTime() || 0;
      const bt = b?.createdAt?.toMillis?.() || new Date(b?.createdAt || 0).getTime() || 0;
      return bt - at;
    });
  }

  function sortByUpdatedDesc(items) {
    return [...items].sort((a, b) => {
      const at = a?.updatedAt?.toMillis?.() || new Date(a?.updatedAt || a?.createdAt || 0).getTime() || 0;
      const bt = b?.updatedAt?.toMillis?.() || new Date(b?.updatedAt || b?.createdAt || 0).getTime() || 0;
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

    if (!db) return Array.from(candidates).filter(Boolean);

    try {
      const usersByUsername = await db.collection("users").where("username", "==", input).limit(1).get();
      if (!usersByUsername.empty) {
        const data = usersByUsername.docs[0].data() || {};
        const email = normalizeEmail(data.email);
        if (email) candidates.add(email);
      }
    } catch (error) {
      logLookupWarning("users username lookup failed:", error);
    }

    try {
      const usersByHandle = await db.collection("users").where("handle", "==", input).limit(1).get();
      if (!usersByHandle.empty) {
        const data = usersByHandle.docs[0].data() || {};
        const email = normalizeEmail(data.email);
        if (email) candidates.add(email);
      }
    } catch (error) {
      logLookupWarning("users handle lookup failed:", error);
    }

    try {
      const ownerByUsername = await db.collection("ownerAccounts").where("username", "==", input).limit(1).get();
      if (!ownerByUsername.empty) {
        const data = ownerByUsername.docs[0].data() || {};
        const email = normalizeEmail(data.email);
        if (email) candidates.add(email);
      }
    } catch (error) {
      logLookupWarning("ownerAccounts username lookup failed:", error);
    }

    try {
      const ownerByEmail = await db.collection("ownerAccounts").where("email", "==", normalized).limit(1).get();
      if (!ownerByEmail.empty) {
        const data = ownerByEmail.docs[0].data() || {};
        const email = normalizeEmail(data.email);
        if (email) candidates.add(email);
      }
    } catch (error) {
      logLookupWarning("ownerAccounts email lookup failed:", error);
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
      logLookupWarning("users role lookup failed:", error);
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
      logLookupWarning("users email role lookup failed:", error);
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
            ownerData: { id: doc.id, ...data }
          };
        }
      }
    } catch (error) {
      logLookupWarning("ownerAccounts uid lookup failed:", error);
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
            ownerData: { id: doc.id, ...data }
          };
        }
      }
    } catch (error) {
      logLookupWarning("ownerAccounts email role lookup failed:", error);
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
      setLoginFeedback("أدخل البريد الإلكتروني وكلمة المرور.", "error");
      showToast("أدخل البريد الإلكتروني وكلمة المرور.", "warning");
      return false;
    }

    if (!firebaseReady) {
      setLoginFeedback("Firebase غير جاهز.", "error");
      showToast("Firebase غير جاهز.", "error");
      return false;
    }

    try {
      setLoginLoading(true);
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
        try {
          await auth.signOut();
        } catch {}
        throw new Error("NOT_AUTHORIZED");
      }

      await applyAuthorizedSession(user, roleResult);
      setLoginFeedback("تم تسجيل الدخول بنجاح.", "success");
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

      setLoginFeedback(message, "error");
      showToast(message, "error");
      return false;
    } finally {
      setLoginLoading(false);
    }
  }

  async function logout() {
    if (state.listeners.chats) {
      state.listeners.chats();
      state.listeners.chats = null;
    }
    if (state.listeners.chatMessages) {
      state.listeners.chatMessages();
      state.listeners.chatMessages = null;
    }

    clearAdminSessionState();
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
      "add-property": "add-property",
      "add-property-pane": "add-property",
      bookings: "bookings",
      "bookings-pane": "bookings",
      owners: "owners",
      "owners-pane": "owners",
      messages: "chats",
      "messages-pane": "chats",
      chats: "chats",
      "chats-pane": "chats"
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

    qa("[data-tab-target], .sidebar-nav .nav-item[data-tab], .sidebar-nav .nav-item[data-tab-target]").forEach((btn) => {
      const key = tabAliases(btn.dataset.tabTarget || btn.dataset.tab || "");
      btn.classList.toggle("active", key === state.activeTab);
    });

    qa(".tab-pane").forEach((pane) => pane.classList.remove("active"));

    const explicit =
      byId(`${state.activeTab}-pane`) ||
      byId(state.activeTab) ||
      q(`.tab-pane[id="${state.activeTab}-pane"]`);

    if (explicit && explicit.classList.contains("tab-pane")) explicit.classList.add("active");

    if (state.activeTab === "properties") renderPropertiesTable();
    if (state.activeTab === "bookings") renderBookings();
    if (state.activeTab === "owners") renderOwnerAccounts();
    if (state.activeTab === "chats") {
      renderChatThreads();
      renderCurrentChatMessages();
    }
    if (state.activeTab === "add-property") {
      setTimeout(() => state.maps.add?.invalidateSize?.(), 250);
    }
  }

  async function loadAllData() {
    if (!requireAuth(false)) return;
    if (!firebaseReady) {
      showToast("Firebase غير جاهز.", "error");
      return;
    }

    await Promise.allSettled([
      loadProperties(),
      loadBookings(),
      loadOwnerAccounts(),
      loadUsers(),
      loadChats()
    ]);

    renderDashboardStats();
    updateRoleBasedUI();
    updateProfileUI();
  }

  function renderDashboardStats() {
    const visibleProperties = state.properties.filter((p) => canManageProperty(p));
    const visibleBookings = state.bookings.filter((b) => canAccessBooking(b));
    const visibleChats = state.chats.filter((c) => canAccessChat(c));
    const visibleOwners = isSuperAdmin() ? state.ownerAccounts : [];
    const visibleUsers = isSuperAdmin() ? state.users : [];

    setStat("stat-properties-count", String(visibleProperties.length));
    setStat("stat-bookings-count", String(visibleBookings.length));
    setStat("stat-owners-count", String(visibleOwners.length));
    setStat("stat-chats-count", String(visibleChats.length));

    const pending = visibleBookings.filter((b) => getBookingStatus(b.status) === "pending").length;
    const confirmed = visibleBookings.filter((b) => getBookingStatus(b.status) === "confirmed").length;
    const rejected = visibleBookings.filter((b) => getBookingStatus(b.status) === "rejected").length;

    setText(String(visibleProperties.length), "dashboard-properties-count", "mini-properties-count");
    setText(String(visibleBookings.length), "dashboard-bookings-count", "mini-bookings-count");
    setText(String(pending), "pending-bookings-count", "pending-bookings-filter-count");
    setText(String(confirmed), "confirmed-bookings-count", "confirmed-bookings-filter-count");
    setText(String(rejected), "rejected-bookings-count", "rejected-bookings-filter-count");
    setText(String(visibleUsers.length), "dashboard-users-count", "users-count");

    setText(String(visibleBookings.length), "booking-count-all", "all-bookings-count");
    setText(String(pending), "booking-count-pending");
    setText(String(confirmed), "booking-count-confirmed");
    setText(String(rejected), "booking-count-rejected");
  }

  async function loadProperties() {
    const tbody = byId("properties-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;">جارٍ تحميل العقارات...</td></tr>`;
    }

    try {
      const items = [];
      const snap = await db.collection("properties").get();
      snap.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
      state.properties = sortByCreatedDesc(items);
      renderPropertiesTable();
      renderDashboardStats();
    } catch (error) {
      console.error("loadProperties error:", error);
      state.properties = [];
      renderPropertiesTable();
      renderDashboardStats();

      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;color:#ef4444;">فشل تحميل العقارات.</td></tr>`;
      }

      if (isPermissionDenied(error)) showPermissionMessage("properties");
      else showToast("تعذر تحميل العقارات.", "error");
    }
  }

  function renderPropertiesTable() {
    const tbody = byId("properties-tbody");
    if (!tbody) return;

    const query = cleanText(getValue("properties-search", "property-search")).toLowerCase();
    let rows = state.properties.filter((prop) => canManageProperty(prop));

    if (query) {
      rows = rows.filter((prop) =>
        [
          prop.id,
          getPropertyTitle(prop),
          getPropertyLocation(prop),
          getPropertyType(prop),
          cleanText(prop.ownerName),
          cleanText(prop.ownerEmail)
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:28px;">لا توجد عقارات مطابقة.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((prop) => {
        const visible = prop.isActive !== false && prop.visible !== false;
        return `
          <tr>
            <td>
              <img class="prop-thumb" src="${escapeHtml(getPropertyImage(prop))}" alt="${escapeHtml(getPropertyTitle(prop))}" onerror="this.src='images/placeholder.jpg'">
            </td>
            <td>
              <div class="prop-name-cell">
                <strong>${escapeHtml(getPropertyTitle(prop))}</strong>
                <span>${escapeHtml(prop.id)}</span>
              </div>
            </td>
            <td>${escapeHtml(getPropertyLocation(prop))}</td>
            <td>${escapeHtml(getPropertyType(prop))}</td>
            <td><span class="price-pill">${escapeHtml(formatPrice(prop.price || prop.pricePerNight || prop.basePrice || 0))}</span></td>
            <td>${visible ? '<span class="status-badge visible">نشط</span>' : '<span class="status-badge hidden">مخفي</span>'}</td>
            <td>
              <div class="table-actions">
                <button type="button" class="edit-property-btn" data-id="${escapeHtml(prop.id)}"><i class="ph ph-pencil-simple"></i></button>
                <button type="button" class="toggle-property-btn" data-id="${escapeHtml(prop.id)}" data-visible="${visible ? "1" : "0"}">
                  <i class="ph ${visible ? "ph-eye-slash" : "ph-eye"}"></i>
                  ${visible ? "إخفاء" : "إظهار"}
                </button>
                <button type="button" class="delete-property-btn" data-id="${escapeHtml(prop.id)}"><i class="ph ph-trash"></i></button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
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
    const lat = cleanText(getValue(`${prefix}-lat`, `${prefix}-latitude`));
    const lng = cleanText(getValue(`${prefix}-lng`, `${prefix}-longitude`));
    const amenities = normalizeArray(getValue(`${prefix}-amenities`, `${prefix}-features`));
    const extras = normalizeArray(getValue(`${prefix}-extras`, `${prefix}-property-extras`));

    const allImages = normalizeArray(gallery);
    if (imageUrl && !allImages.includes(imageUrl)) allImages.unshift(imageUrl);

    const title = titleAr || titleEn;
    const location = locationAr || locationEn;
    const type = typeAr || typeEn;

    const current = getCurrentOwnerIdentity();

    return {
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
      hostEmail: ownerEmail,
      hostPhone: ownerPhone,
      ownerUid: current.uid || "",
      ownerUsername: current.username || "",
      ownerAccountDocId: current.ownerDocId || "",
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
      lat: lat ? Number(lat) : null,
      lng: lng ? Number(lng) : null,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null,
      isActive: true,
      visible: true,
      slug: slugify(title),
      updatedAt: getServerTimestamp()
    };
  }

  function validatePropertyData(data) {
    if (!cleanText(data.titleAr || data.title)) return "يرجى إدخال عنوان العقار.";
    if (!cleanText(data.locationAr || data.location)) return "يرجى إدخال موقع العقار.";
    if (!toNumber(data.price, 0)) return "يرجى إدخال سعر صحيح.";
    return "";
  }

  async function handleAddPropertySubmit(e) {
    e.preventDefault();
    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");
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
      clearMapCoords("admin");
      await loadProperties();
      showToast("تمت إضافة العقار بنجاح.", "success");
      activateTab("properties");
    } catch (error) {
      console.error("add property error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("properties");
      else showToast("تعذر إضافة العقار.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function togglePropertyVisibility(id, visibleNow) {
    if (!firebaseReady) return;
    try {
      const prop = state.properties.find((p) => cleanText(p.id) === cleanText(id));
      if (!prop || !canManageProperty(prop)) {
        showToast("لا تملك صلاحية تعديل هذا العقار.", "warning");
        return;
      }

      await db.collection("properties").doc(id).update({
        isActive: !visibleNow,
        visible: !visibleNow,
        updatedAt: getServerTimestamp()
      });
      showToast(visibleNow ? "تم إخفاء العقار." : "تم إظهار العقار.", "success");
      await loadProperties();
    } catch (error) {
      console.error("togglePropertyVisibility error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("properties");
      else showToast("تعذر تحديث حالة العقار.", "error");
    }
  }

  async function deleteProperty(id) {
    if (!firebaseReady) return;
    const ok = window.confirm("هل تريد حذف هذا العقار نهائيًا؟");
    if (!ok) return;

    try {
      const prop = state.properties.find((p) => cleanText(p.id) === cleanText(id));
      if (!prop || !canManageProperty(prop)) {
        showToast("لا تملك صلاحية حذف هذا العقار.", "warning");
        return;
      }

      await db.collection("properties").doc(id).delete();
      state.properties = state.properties.filter((p) => p.id !== id);
      renderPropertiesTable();
      renderDashboardStats();
      showToast("تم حذف العقار.", "success");
    } catch (error) {
      console.error("deleteProperty error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("properties");
      else showToast("تعذر حذف العقار.", "error");
    }
  }

  function openEditPropertyModal(id) {
    const prop = state.properties.find((p) => p.id === id);
    if (!prop) return showToast("العقار غير موجود.", "error");
    if (!canManageProperty(prop)) return showToast("لا تملك صلاحية تعديل هذا العقار.", "warning");

    const modal = byId("edit-modal") || byId("edit-property-modal") || byId("property-edit-modal");
    if (!modal) return showToast("نافذة التعديل غير موجودة.", "warning");

    modal.classList.add("active");
    document.body.classList.add("modal-open");
    modal.dataset.editId = id;

    setValue(prop.titleAr || prop.title, "edit-title-ar", "edit-title", "edit-property-title-ar", "edit-property-title");
    setValue(prop.titleEn || "", "edit-title-en", "edit-property-title-en");
    setValue(prop.locationAr || prop.location, "edit-location-ar", "edit-location", "edit-property-location-ar", "edit-property-location");
    setValue(prop.locationEn || "", "edit-location-en", "edit-property-location-en");
    setValue(prop.typeAr || prop.type, "edit-type-ar", "edit-type", "edit-property-type-ar", "edit-property-type");
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

    updateMapMarkerFromInputs("edit");
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
    if (!docId) return showToast("معرف العقار غير موجود.", "error");

    const prop = state.properties.find((p) => p.id === docId);
    if (!prop || !canManageProperty(prop)) return showToast("لا تملك صلاحية تعديل هذا العقار.", "warning");

    const btn = form.querySelector('button[type="submit"]');
    const data = collectPropertyFormData("edit");
    const validation = validatePropertyData(data);
    if (validation) return showToast(validation, "warning");

    setButtonLoading(btn, true, "جارٍ حفظ التعديلات...");
    try {
      await db.collection("properties").doc(docId).update(data);
      closeModal(modal);
      await loadProperties();
      showToast("تم تحديث العقار بنجاح.", "success");
    } catch (error) {
      console.error("edit property error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("properties");
      else showToast("تعذر تحديث العقار.", "error");
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
      state.bookings = sortByCreatedDesc(items).filter((booking) => canAccessBooking(booking));
      renderBookings();
      renderDashboardStats();
    } catch (error) {
      console.error("loadBookings error:", error);
      state.bookings = [];
      renderBookings();
      renderDashboardStats();

      if (container) {
        container.innerHTML = `<div class="empty-state"><i class="ph ph-warning-circle"></i><div>تعذر تحميل الحجوزات.</div></div>`;
      }

      if (isPermissionDenied(error)) showPermissionMessage("bookings");
      else showToast("تعذر تحميل الحجوزات.", "error");
    }
  }

  function renderBookings() {
    const container = byId("bookings-container");
    if (!container) return;

    const visibleBookings = state.bookings.filter((b) => canAccessBooking(b));
    const counts = {
      all: visibleBookings.length,
      pending: visibleBookings.filter((b) => getBookingStatus(b.status) === "pending").length,
      confirmed: visibleBookings.filter((b) => getBookingStatus(b.status) === "confirmed").length,
      rejected: visibleBookings.filter((b) => getBookingStatus(b.status) === "rejected").length
    };

    setText(String(counts.all), "booking-count-all", "all-bookings-count");
    setText(String(counts.pending), "booking-count-pending", "pending-bookings-filter-count");
    setText(String(counts.confirmed), "booking-count-confirmed", "confirmed-bookings-filter-count");
    setText(String(counts.rejected), "booking-count-rejected", "rejected-bookings-filter-count");

    let rows = [...visibleBookings];
    if (state.bookingFilter !== "all") rows = rows.filter((b) => getBookingStatus(b.status) === state.bookingFilter);

    const query = cleanText(getValue("bookings-search", "booking-search")).toLowerCase();
    if (query) {
      rows = rows.filter((b) => {
        const hay = [
          b.id,
          b.reference,
          b.userName,
          b.guestName,
          b.userEmail,
          b.guestEmail,
          b.propertyTitle,
          b.phone,
          b.guestPhone,
          b.userId,
          deepGet(b, "guest.fullName"),
          deepGet(b, "guest.email"),
          deepGet(b, "guest.phone"),
          deepGet(b, "stay.checkIn"),
          deepGet(b, "stay.checkOut")
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(query);
      });
    }

    if (!rows.length) {
      container.innerHTML = `<div class="empty-state"><i class="ph ph-calendar-x"></i><div>لا توجد حجوزات مطابقة.</div></div>`;
      return;
    }

    const grid = document.createElement("div");
    grid.className = "bookings-grid";
    grid.innerHTML = rows
      .map((booking) => {
        const status = getBookingStatus(booking.status);
        const canOpenChat = !!(booking.userId || booking.guestEmail);
        const room = cleanText(booking.roomNumber);
        const reply = cleanText(booking.approvalReply);
        const rejectReason = cleanText(booking.rejectReason);

        return `
          <div class="booking-card" data-status="${escapeHtml(status)}">
            <div class="booking-head">
              <div class="booking-title">
                <strong>${escapeHtml(booking.propertyTitle)}</strong>
                <span>${escapeHtml(booking.reference || booking.id)}</span>
              </div>
              ${statusBadge(status)}
            </div>

            <div class="booking-meta-grid">
              <div class="booking-meta-item"><label>الضيف</label><strong>${escapeHtml(booking.guestName)}</strong></div>
              <div class="booking-meta-item"><label>البريد</label><span>${escapeHtml(booking.guestEmail)}</span></div>
              <div class="booking-meta-item"><label>الهاتف</label><span>${escapeHtml(booking.guestPhone)}</span></div>
              <div class="booking-meta-item"><label>المبلغ</label><strong>${escapeHtml(formatPrice(booking.total))}</strong></div>
              <div class="booking-meta-item"><label>الدخول</label><span>${escapeHtml(booking.checkIn)}</span></div>
              <div class="booking-meta-item"><label>الخروج</label><span>${escapeHtml(booking.checkOut)}</span></div>
              <div class="booking-meta-item wide"><label>تاريخ الحجز</label><span>${escapeHtml(formatDate(booking.createdAt))}</span></div>
            </div>

            ${
              room || reply || rejectReason
                ? `
              <div class="booking-extra-row">
                ${room ? `<span class="booking-info-pill room"><i class="ph ph-door-open"></i>${escapeHtml(`الغرفة: ${room}`)}</span>` : ""}
                ${rejectReason ? `<span class="booking-info-pill reject"><i class="ph ph-x-circle"></i>${escapeHtml(rejectReason)}</span>` : ""}
              </div>
              ${reply ? `<div class="booking-reply-box"><label>رد الإدارة</label><p>${escapeHtml(reply)}</p></div>` : ""}
            `
                : ""
            }

            <div class="booking-actions-row">
              <button type="button" class="btn-approve" data-booking-id="${escapeHtml(booking.id)}" ${status === "confirmed" ? "disabled" : ""}>
                <i class="ph ph-check"></i>قبول
              </button>
              <button type="button" class="btn-reject" data-booking-id="${escapeHtml(booking.id)}" ${status === "rejected" ? "disabled" : ""}>
                <i class="ph ph-x"></i>رفض
              </button>
              <button type="button" class="btn-open-chat" data-booking-id="${escapeHtml(booking.id)}" ${canOpenChat ? "" : "disabled"}>
                <i class="ph ph-chat-centered-text"></i>محادثة
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    container.innerHTML = "";
    container.appendChild(grid);
  }

  async function updateBookingStatus(id, status) {
    try {
      const booking = state.bookings.find((b) => cleanText(b.id) === cleanText(id));
      if (!booking || !canAccessBooking(booking)) {
        showToast("لا تملك صلاحية تعديل هذا الحجز.", "warning");
        return;
      }

      const payload = {
        status,
        updatedAt: getServerTimestamp()
      };

      if (status === "confirmed") {
        const roomNumber = booking.roomNumber || getRandomRoomNumber();
        payload.roomNumber = roomNumber;
        payload.approvalReply = getAutoApprovalMessage(roomNumber);
        await db.collection("bookings").doc(id).update(payload);
        showToast(`تم تحديث حالة الحجز إلى ${statusLabel(status)}.`, "success");
        await loadBookings();
      }

      if (status === "rejected") {
        // Open reject modal instead of prompt
        openRejectModal(id, booking);
      }

    } catch (error) {
      console.error("updateBookingStatus error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("bookings");
      else showToast("تعذر تحديث حالة الحجز.", "error");
    }
  }

  function openRejectModal(bookingId, booking) {
    const modal = byId("reject-reason-modal");
    if (!modal) return;

    // Reset state
    qa(".reject-reason-chip").forEach((chip) => chip.classList.remove("selected"));
    const customInput = byId("reject-custom-reason");
    if (customInput) customInput.value = "";

    // Pre-fill if existing reason
    if (booking?.rejectReason) {
      const matched = qa(".reject-reason-chip").find((chip) => chip.dataset.reason === booking.rejectReason);
      if (matched) {
        matched.classList.add("selected");
      } else if (customInput) {
        customInput.value = booking.rejectReason;
      }
    }

    modal.dataset.pendingBookingId = bookingId;
    modal.classList.add("active");
    document.body.classList.add("modal-open");
  }

  function closeRejectModal() {
    const modal = byId("reject-reason-modal");
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
    delete modal.dataset.pendingBookingId;
    qa(".reject-reason-chip").forEach((chip) => chip.classList.remove("selected"));
    const customInput = byId("reject-custom-reason");
    if (customInput) customInput.value = "";
  }

  async function confirmRejectBooking() {
    const modal = byId("reject-reason-modal");
    if (!modal) return;

    const bookingId = cleanText(modal.dataset.pendingBookingId);
    if (!bookingId) return;

    const selectedChip = q(".reject-reason-chip.selected");
    const customInput = byId("reject-custom-reason");
    const reason = cleanText(selectedChip?.dataset.reason || customInput?.value || "الحجز غير متاح");

    const btn = byId("confirm-reject-btn");
    setButtonLoading(btn, true, "جارٍ الرفض...");

    try {
      const payload = {
        status: "rejected",
        rejectReason: reason,
        approvalReply: getAutoRejectionMessage(reason),
        updatedAt: getServerTimestamp()
      };

      await db.collection("bookings").doc(bookingId).update(payload);
      closeRejectModal();
      showToast("تم رفض الحجز.", "success");
      await loadBookings();
    } catch (error) {
      console.error("confirmRejectBooking error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("bookings");
      else showToast("تعذر رفض الحجز.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function loadOwnerAccounts() {
    const tbody =
      byId("owner-accounts-tbody") ||
      byId("owners-tbody") ||
      byId("owner-table-body") ||
      byId("accounts-tbody");

    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;">جارٍ تحميل حسابات الملاك...</td></tr>`;
    }

    if (!isSuperAdmin()) {
      state.ownerAccounts = [];
      renderOwnerAccounts();
      renderDashboardStats();
      return;
    }

    const possibleCollections = ["ownerAccounts", "owners", "accounts", "users"];
    let items = [];
    let loaded = false;
    let permissionDenied = false;

    for (const collectionName of possibleCollections) {
      try {
        const snap = await db.collection(collectionName).get();
        const arr = [];
        snap.forEach((doc) => arr.push({ id: doc.id, ...doc.data(), collection: collectionName }));

        if (arr.length || collectionName === "ownerAccounts") {
          items = arr;
          loaded = true;
          break;
        }
      } catch (error) {
        if (isPermissionDenied(error)) {
          permissionDenied = true;
          continue;
        }
        console.warn("loadOwnerAccounts skip collection:", collectionName, error);
      }
    }

    if (!loaded && permissionDenied) {
      state.ownerAccounts = [];
      renderOwnerAccounts();
      renderDashboardStats();

      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="99" style="text-align:center;padding:24px;color:#e11d48;">
              لا توجد صلاحية لقراءة حسابات الملاك. عدّل Firestore Rules أو سجّل الدخول بحساب أدمن صحيح.
            </td>
          </tr>
        `;
      }

      showPermissionMessage("owners");
      return;
    }

    items = items.filter((item) => {
      const role = cleanText(item.role || item.accountType || item.type).toLowerCase();
      return !role || role.includes("owner") || role.includes("مالك") || item.collection !== "users";
    });

    state.ownerAccounts = items;
    renderOwnerAccounts();
    renderDashboardStats();
  }

  function renderOwnerAccounts() {
    const tbody =
      byId("owner-accounts-tbody") ||
      byId("owners-tbody") ||
      byId("owner-table-body") ||
      byId("accounts-tbody");

    if (!tbody) return;

    if (!isSuperAdmin()) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:24px;">هذه الصفحة متاحة فقط للأدمن العام.</td></tr>`;
      return;
    }

    const query = cleanText(getValue("owners-search", "owner-search")).toLowerCase();
    let rows = [...state.ownerAccounts];

    if (query) {
      rows = rows.filter((item) =>
        [item.id, item.name, item.fullName, item.ownerName, item.email, item.phone, item.username]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:24px;">لا توجد حسابات ملاك.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((item) => {
        const name = cleanText(item.name || item.fullName || item.ownerName || "—");
        const email = cleanText(item.email || "—");
        const phone = cleanText(item.phone || "—");
        const username = cleanText(item.username || "—");
        const active = item.isActive !== false;

        return `
          <tr>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(email)}</td>
            <td>${escapeHtml(phone)}</td>
            <td>${escapeHtml(username)}</td>
            <td>${active ? '<span class="status-badge visible">نشط</span>' : '<span class="status-badge hidden">معطل</span>'}</td>
            <td>
              <div class="table-actions">
                <button type="button" class="edit-owner-btn" data-id="${escapeHtml(item.id)}"><i class="ph ph-pencil-simple"></i></button>
                <button type="button" class="delete-owner-btn" data-id="${escapeHtml(item.id)}"><i class="ph ph-trash"></i></button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function collectOwnerFormData(prefix = "owner") {
    return {
      name: getValue(`${prefix}-name`, `${prefix}-full-name`),
      fullName: getValue(`${prefix}-full-name`, `${prefix}-name`),
      email: normalizeEmail(getValue(`${prefix}-email`)),
      phone: getValue(`${prefix}-phone`),
      username: getValue(`${prefix}-username`),
      password: getValue(`${prefix}-password`),
      role: "owner",
      accountType: "owner",
      isActive: true,
      updatedAt: getServerTimestamp()
    };
  }

  async function handleOwnerFormSubmit(e) {
    e.preventDefault();
    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");
    if (!isSuperAdmin()) return showToast("فقط الأدمن العام يمكنه إدارة الملاك.", "warning");

    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    const editId = form.dataset.editId;
    const data = collectOwnerFormData("owner");

    if (!data.name || !data.email) {
      return showToast("يرجى إدخال الاسم والبريد الإلكتروني.", "warning");
    }

    setButtonLoading(btn, true, editId ? "جارٍ تحديث الحساب..." : "جارٍ إنشاء الحساب...");
    try {
      const collectionName = "ownerAccounts";
      if (editId) {
        await db.collection(collectionName).doc(editId).update(data);
        showToast("تم تحديث حساب المالك.", "success");
      } else {
        data.createdAt = getServerTimestamp();
        await db.collection(collectionName).add(data);
        showToast("تم إنشاء حساب المالك.", "success");
      }

      form.reset();
      delete form.dataset.editId;
      await loadOwnerAccounts();
    } catch (error) {
      console.error("owner form error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("owners");
      else showToast("تعذر حفظ حساب المالك.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function fillOwnerForm(id) {
    const item = state.ownerAccounts.find((x) => x.id === id);
    if (!item) return;

    setValue(item.name || item.fullName || "", "owner-name", "owner-full-name");
    setValue(item.fullName || item.name || "", "owner-full-name", "owner-name");
    setValue(item.email || "", "owner-email");
    setValue(item.phone || "", "owner-phone");
    setValue(item.username || "", "owner-username");
    setValue(item.password || "", "owner-password");

    const form = byId("owner-account-form") || byId("owner-form");
    if (form) form.dataset.editId = id;

    activateTab("owners");
    showToast("تم تحميل بيانات المالك للتعديل.", "info");
  }

  async function deleteOwnerAccount(id) {
    if (!isSuperAdmin()) return showToast("فقط الأدمن العام يمكنه حذف حسابات الملاك.", "warning");
    if (!window.confirm("هل تريد حذف هذا الحساب؟")) return;

    try {
      await db.collection("ownerAccounts").doc(id).delete();
      showToast("تم حذف حساب المالك.", "success");
      await loadOwnerAccounts();
    } catch (error) {
      console.error("deleteOwnerAccount error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("owners");
      else showToast("تعذر حذف حساب المالك.", "error");
    }
  }

  async function loadUsers() {
    if (!isSuperAdmin()) {
      state.users = [];
      renderDashboardStats();
      return;
    }

    const candidates = ["users", "customers", "clients"];
    let items = [];
    let permissionDenied = false;

    for (const collectionName of candidates) {
      try {
        const snap = await db.collection(collectionName).get();
        if (!snap.empty) {
          const arr = [];
          snap.forEach((doc) => arr.push(normalizeUser({ collection: collectionName, ...doc.data() }, doc.id)));
          items = arr;
          break;
        }
      } catch (error) {
        if (isPermissionDenied(error)) {
          permissionDenied = true;
          continue;
        }
        console.warn("loadUsers skip collection:", collectionName, error);
      }
    }

    if (permissionDenied && !items.length) {
      state.users = [];
      renderDashboardStats();
      showPermissionMessage("users");
      return;
    }

    state.users = sortByCreatedDesc(items);
    renderDashboardStats();
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
      state.listeners.chats = db.collection("chats").onSnapshot(
        (snap) => {
          const items = [];
          snap.forEach((doc) => items.push(normalizeChat({ id: doc.id, ...doc.data() }, doc.id)));

          const bookingDerivedThreads = derivePseudoChatsFromBookings();
          const merged = mergeChats(items, bookingDerivedThreads)
            .filter((chat) => canAccessChat(chat))
            .sort((a, b) => {
              const at = a?.updatedAt?.toMillis?.() || new Date(a?.updatedAt || 0).getTime() || 0;
              const bt = b?.updatedAt?.toMillis?.() || new Date(b?.updatedAt || 0).getTime() || 0;
              return bt - at;
            });

          state.chats = merged;
          renderChatThreads();

          if (state.currentChatId && !state.chats.find((x) => x.id === state.currentChatId)) {
            state.currentChatId = null;
            state.currentChatMessages = [];
          }

          if (state.currentChatId) {
            if (state.currentChatId.startsWith("booking-thread-")) loadPseudoChatMessages(state.currentChatId);
            else subscribeToChatMessages(state.currentChatId);
          }

          renderDashboardStats();
        },
        (error) => {
          console.error("loadChats listener error:", error);
          const fallback = derivePseudoChatsFromBookings();
          state.chats = fallback.filter((chat) => canAccessChat(chat));
          renderChatThreads();
          if (isPermissionDenied(error)) showPermissionMessage("chats");
        }
      );
    } catch (error) {
      console.error("loadChats error:", error);
      state.chats = derivePseudoChatsFromBookings().filter((chat) => canAccessChat(chat));
      renderChatThreads();
      if (isPermissionDenied(error)) showPermissionMessage("chats");
      else showToast("تعذر تحميل المحادثات.", "error");
    }
  }

  function derivePseudoChatsFromBookings() {
    return state.bookings
      .filter((booking) => canAccessBooking(booking))
      .map((booking) => ({
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
          (chat.userEmail && real.userEmail && chat.userEmail === real.userEmail)
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
    let rows = state.chats.filter((chat) => canAccessChat(chat));

    if (query) {
      rows = rows.filter((chat) =>
        [chat.id, chat.userName, chat.userEmail, chat.lastMessage, chat.bookingId, chat.propertyTitle, chat.userId]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (!rows.length) {
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-centered-dots"></i><div>لا توجد محادثات.</div></div>`;
      return;
    }

    list.innerHTML = rows
      .map((chat) => {
        const name = cleanText(chat.userName || chat.customerName || chat.name || chat.userEmail || chat.id);
        const subtitle = cleanText(chat.lastMessage || chat.lastText || "بدون رسائل");
        const isActive = state.currentChatId === chat.id;
        const smallMeta = cleanText(chat.propertyTitle || chat.bookingId || "");

        return `
          <button
            type="button"
            class="chat-thread-item ${isActive ? "active" : ""}"
            data-chat-id="${escapeHtml(chat.id)}"
            style="width:100%;border:1px solid var(--border-color,#e2e8f0);background:${isActive ? "rgba(67,90,191,.08)" : "#fff"};border-radius:16px;padding:14px;text-align:right;cursor:pointer;display:grid;gap:6px;margin-bottom:10px;"
          >
            <strong style="font-size:.95rem;color:var(--text-main,#0f172a)">${escapeHtml(name)}</strong>
            <span style="font-size:.82rem;color:var(--text-muted,#64748b);line-height:1.6">${escapeHtml(subtitle)}</span>
            ${smallMeta ? `<small style="color:#94a3b8">${escapeHtml(smallMeta)}</small>` : ""}
          </button>
        `;
      })
      .join("");
  }

  function openChat(chatId) {
    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat) return;
    if (!canAccessChat(chat)) return showToast("لا تملك صلاحية الوصول إلى هذه المحادثة.", "warning");

    state.currentChatId = chatId;
    renderChatThreads();

    const titleEl = byId("admin-chat-title") || byId("chat-room-title");
    const subEl = byId("admin-chat-subtitle") || byId("chat-room-subtitle");
    const deleteBtn = byId("delete-current-chat-btn");

    if (titleEl) titleEl.textContent = cleanText(chat?.userName || chat?.customerName || chat?.userEmail || chatId);
    if (subEl) subEl.textContent = cleanText(chat?.propertyTitle || chat?.bookingId || chat?.lastMessage);

    // Show delete button only for real (non-pseudo) chats
    if (deleteBtn) {
      if (!chat.pseudo) {
        deleteBtn.style.display = "inline-flex";
        deleteBtn.dataset.chatId = chatId;
      } else {
        deleteBtn.style.display = "none";
      }
    }

    if (chatId.startsWith("booking-thread-")) loadPseudoChatMessages(chatId);
    else subscribeToChatMessages(chatId);
  }

  function subscribeToChatMessages(chatId) {
    if (state.listeners.chatMessages) {
      state.listeners.chatMessages();
      state.listeners.chatMessages = null;
    }

    const chat = state.chats.find((c) => c.id === chatId);
    if (!chat || !canAccessChat(chat)) {
      state.currentChatMessages = [];
      renderCurrentChatMessages();
      return;
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
        .onSnapshot(
          (snap) => {
            const messages = [];
            snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
            state.currentChatMessages = messages;
            renderCurrentChatMessages();
          },
          async () => {
            try {
              const snap = await db.collection("messages").where("chatId", "==", chatId).get();
              const messages = [];
              snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
              messages.sort((a, b) => {
                const at = a?.createdAt?.toMillis?.() || new Date(a?.createdAt || 0).getTime() || 0;
                const bt = b?.createdAt?.toMillis?.() || new Date(b?.createdAt || 0).getTime() || 0;
                return at - bt;
              });
              state.currentChatMessages = messages;
              renderCurrentChatMessages();
            } catch (err) {
              console.error("messages fallback error:", err);
              state.currentChatMessages = [];
              renderCurrentChatMessages();
            }
          }
        );
    } catch (error) {
      console.error("subscribeToChatMessages error:", error);
      state.currentChatMessages = [];
      renderCurrentChatMessages();
      if (isPermissionDenied(error)) showPermissionMessage("chats");
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

    state.currentChatMessages = [
      {
        id: `pseudo-booking-${booking.id}`,
        system: true,
        text: `تم فتح محادثة مرتبطة بالحجز ${booking.reference || booking.id} للضيف ${booking.guestName} من ${booking.checkIn} إلى ${booking.checkOut}.`,
        senderRole: "system",
        createdAt: booking.createdAt || new Date().toISOString()
      }
    ];

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
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-centered-dots"></i><div>لا توجد رسائل بعد.</div></div>`;
      return;
    }

    list.innerHTML = state.currentChatMessages
      .map((msg) => {
        const mine = ["admin", "owner", "host", "support"].includes(cleanText(msg.senderRole).toLowerCase());
        const text = cleanText(pickFirst(msg.text, msg.message, msg.body, msg.content));
        const sender = cleanText(pickFirst(msg.senderName, msg.name, msg.senderRole, mine ? "الإدارة" : "العميل"));
        const date = formatDate(pickFirst(msg.createdAt, msg.timestamp, msg.sentAt));

        return `
          <div class="chat-bubble ${mine ? "mine" : "theirs"}" style="background:${mine ? "#dbeafe" : "#f8fafc"};border:1px solid ${mine ? "#93c5fd" : "#e2e8f0"};border-radius:16px;padding:12px 14px;margin-bottom:10px;">
            <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(sender)}</div>
            <div style="line-height:1.8;">${escapeHtml(text)}</div>
            <div style="margin-top:8px;font-size:.78rem;color:#64748b;">${escapeHtml(date)}</div>
          </div>
        `;
      })
      .join("");
  }

  function openDeleteChatModal(chatId) {
    const modal = byId("delete-chat-modal");
    if (!modal) return;
    modal.dataset.pendingChatId = chatId;
    modal.classList.add("active");
    document.body.classList.add("modal-open");
  }

  function closeDeleteChatModal() {
    const modal = byId("delete-chat-modal");
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
    delete modal.dataset.pendingChatId;
  }

  async function confirmDeleteChat() {
    const modal = byId("delete-chat-modal");
    if (!modal) return;

    const chatId = cleanText(modal.dataset.pendingChatId);
    if (!chatId) return;

    const btn = byId("confirm-delete-chat-btn");
    setButtonLoading(btn, true, "جارٍ الحذف...");

    try {
      // Delete sub-collection messages first
      try {
        const messagesSnap = await db.collection("chats").doc(chatId).collection("messages").get();
        const batchOp = db.batch();
        messagesSnap.forEach((doc) => batchOp.delete(doc.ref));
        if (!messagesSnap.empty) await batchOp.commit();
      } catch (err) {
        console.warn("Could not delete sub-messages:", err);
      }

      // Delete the chat document
      await db.collection("chats").doc(chatId).delete();

      // Reset UI
      state.chats = state.chats.filter((c) => c.id !== chatId);
      if (state.currentChatId === chatId) {
        if (state.listeners.chatMessages) {
          state.listeners.chatMessages();
          state.listeners.chatMessages = null;
        }
        state.currentChatId = null;
        state.currentChatMessages = [];
        const titleEl = byId("admin-chat-title");
        const subEl = byId("admin-chat-subtitle");
        if (titleEl) titleEl.textContent = "اختر محادثة";
        if (subEl) subEl.textContent = "سيظهر هنا اسم العميل أو بريده الإلكتروني.";
        const deleteBtn = byId("delete-current-chat-btn");
        if (deleteBtn) deleteBtn.style.display = "none";
        renderCurrentChatMessages();
      }

      closeDeleteChatModal();
      renderChatThreads();
      renderDashboardStats();
      showToast("تم حذف المحادثة بنجاح.", "success");
    } catch (error) {
      console.error("confirmDeleteChat error:", error);
      if (isPermissionDenied(error)) showPermissionMessage("chats");
      else showToast("تعذر حذف المحادثة.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function ensureChatForBooking(bookingId) {
    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) {
      showToast("الحجز غير موجود.", "error");
      return;
    }

    if (!canAccessBooking(booking)) {
      showToast("لا تملك صلاحية فتح محادثة لهذا الحجز.", "warning");
      return;
    }

    const existing = state.chats.find((chat) => {
      return (
        (chat.bookingId && chat.bookingId === bookingId) ||
        (booking.userId && chat.userId && chat.userId === booking.userId) ||
        (booking.guestEmail && chat.userEmail && chat.userEmail === booking.guestEmail)
      );
    });

    if (existing && !existing.pseudo) {
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
      const current = getCurrentOwnerIdentity();

      const payload = {
        bookingId,
        propertyId: booking.propertyId || "",
        propertyTitle: booking.propertyTitle || "",
        userId: booking.userId || "",
        userName: booking.guestName || "",
        userEmail: booking.guestEmail || "",
        ownerId: current.uid || "",
        ownerUid: current.uid || "",
        ownerEmail: current.email || "",
        ownerAccountDocId: current.ownerDocId || "",
        ownerUsername: current.username || "",
        ownerPhone: current.phone || "",
        participants: [booking.userId, booking.guestEmail, current.uid, current.email].filter(Boolean),
        participantIds: [booking.userId, booking.guestEmail, current.uid, current.email].filter(Boolean),
        lastMessage: "",
        lastMessageAt: getServerTimestamp(),
        updatedAt: getServerTimestamp(),
        createdAt: getServerTimestamp()
      };

      const ref = await db.collection("chats").add(payload);
      activateTab("chats");
      openChat(ref.id);
      showToast("تم فتح المحادثة.", "success");
    } catch (error) {
      console.error("ensureChatForBooking error:", error);
      activateTab("chats");
      openChat(`booking-thread-${bookingId}`);
      if (isPermissionDenied(error)) showPermissionMessage("chats");
      else showToast("تم فتح محادثة مؤقتة فقط.", "info");
    }
  }

  async function sendAdminMessage(e) {
    if (e?.preventDefault) e.preventDefault();

    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");
    if (!state.currentChatId || state.currentChatId.startsWith("booking-thread-")) {
      return showToast("لا يمكن الإرسال داخل محادثة مؤقتة.", "warning");
    }

    const form = e?.currentTarget || byId("admin-chat-send-form");
    const input =
      form?.querySelector("textarea") ||
      byId("admin-chat-input") ||
      form?.querySelector('input[type="text"]');

    const text = cleanText(input?.value);
    if (!text) return;

    const chat = state.chats.find((c) => c.id === state.currentChatId);
    if (!chat || !canAccessChat(chat)) {
      showToast("لا تملك صلاحية الإرسال في هذه المحادثة.", "warning");
      return;
    }

    const btn =
      form?.querySelector('button[type="submit"]') ||
      byId("admin-chat-send-btn");

    setButtonLoading(btn, true, "جارٍ الإرسال...");
    try {
      const senderName =
        state.currentOwnerRecord?.name ||
        state.currentOwnerRecord?.fullName ||
        state.currentAuthUser?.email ||
        "الإدارة";

      const chatRef = db.collection("chats").doc(state.currentChatId);
      const payload = {
        text,
        message: text,
        senderRole: isSuperAdmin() ? "admin" : "owner",
        senderName,
        createdAt: getServerTimestamp()
      };

      try {
        await chatRef.collection("messages").add(payload);
      } catch {
        await db.collection("messages").add({
          ...payload,
          chatId: state.currentChatId
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
      if (isPermissionDenied(error)) showPermissionMessage("chats");
      else showToast("تعذر إرسال الرسالة.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function clearMapCoords(prefix) {
    setValue("", `${prefix}-lat`, `${prefix}-latitude`);
    setValue("", `${prefix}-lng`, `${prefix}-longitude`);

    const markerKey = prefix === "edit" ? "editMarker" : "addMarker";
    if (state.maps[markerKey]?.remove) {
      try {
        state.maps[markerKey].remove();
      } catch {}
      state.maps[markerKey] = null;
    }
  }

  function updateMapMarkerFromInputs(prefix) {
    const latRaw = getValue(`${prefix}-lat`, `${prefix}-latitude`);
    const lngRaw = getValue(`${prefix}-lng`, `${prefix}-longitude`);
    if (latRaw === "" || lngRaw === "" || typeof L === "undefined") return;

    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const mapKey = prefix === "edit" ? "edit" : "add";
    const markerKey = prefix === "edit" ? "editMarker" : "addMarker";
    const map = state.maps[mapKey];
    if (!map) return;

    try {
      if (state.maps[markerKey]) {
        state.maps[markerKey].setLatLng([lat, lng]);
      } else {
        state.maps[markerKey] = L.marker([lat, lng]).addTo(map);
      }
      map.setView([lat, lng], 13);
    } catch (error) {
      console.warn("updateMapMarkerFromInputs error:", error);
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
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(map);

      map.on("click", (ev) => {
        const { lat, lng } = ev.latlng;
        setValue(String(lat.toFixed(6)), `${prefix}-lat`, `${prefix}-latitude`);
        setValue(String(lng.toFixed(6)), `${prefix}-lng`, `${prefix}-longitude`);

        if (state.maps[markerKey]) {
          state.maps[markerKey].setLatLng([lat, lng]);
        } else {
          state.maps[markerKey] = L.marker([lat, lng]).addTo(map);
        }
      });

      state.maps[mapKey] = map;
      setTimeout(() => map.invalidateSize(), 250);
    } catch (error) {
      console.warn("initMap error:", error);
    }
  }

  function bindStaticEvents() {
    const loginForm = getLoginForm();
    loginForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const username = getValue("admin-login-email", "admin-username", "admin-user", "username", "email");
      const password = getValue("admin-login-password", "admin-password", "admin-pass", "password");
      await login(username, password);
    });

    byId("admin-login-btn")?.addEventListener("click", async () => {
      const username = getValue("admin-login-email", "admin-username", "admin-user", "username", "email");
      const password = getValue("admin-login-password", "admin-password", "admin-pass", "password");
      await login(username, password);
    });

    byId("admin-logout-btn")?.addEventListener("click", logout);
    byId("logout-btn")?.addEventListener("click", logout);

    qa("[data-tab-target]").forEach((btn) =>
      btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget))
    );

    byId("add-property-form")?.addEventListener("submit", handleAddPropertySubmit);
    byId("admin-property-form")?.addEventListener("submit", handleAddPropertySubmit);
    byId("edit-property-form")?.addEventListener("submit", handleEditPropertySubmit);
    byId("property-edit-form")?.addEventListener("submit", handleEditPropertySubmit);
    byId("owner-account-form")?.addEventListener("submit", handleOwnerFormSubmit);
    byId("owner-form")?.addEventListener("submit", handleOwnerFormSubmit);
    byId("admin-chat-send-form")?.addEventListener("submit", sendAdminMessage);
    byId("chat-send-form")?.addEventListener("submit", sendAdminMessage);
    byId("admin-chat-send-btn")?.addEventListener("click", sendAdminMessage);

    // Reject Booking Modal
    byId("close-reject-modal")?.addEventListener("click", closeRejectModal);
    byId("cancel-reject-btn")?.addEventListener("click", closeRejectModal);
    byId("confirm-reject-btn")?.addEventListener("click", confirmRejectBooking);

    document.addEventListener("click", (e) => {
      const chip = e.target.closest(".reject-reason-chip");
      if (chip) {
        qa(".reject-reason-chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        const customInput = byId("reject-custom-reason");
        if (customInput) customInput.value = "";
      }
    });

    // Delete Chat Modal
    byId("delete-current-chat-btn")?.addEventListener("click", (e) => {
      const chatId = e.currentTarget.dataset.chatId || state.currentChatId;
      if (chatId) openDeleteChatModal(chatId);
    });
    byId("close-delete-chat-modal")?.addEventListener("click", closeDeleteChatModal);
    byId("cancel-delete-chat-btn")?.addEventListener("click", closeDeleteChatModal);
    byId("confirm-delete-chat-btn")?.addEventListener("click", confirmDeleteChat);

    ["properties-search", "property-search"].forEach((id) => byId(id)?.addEventListener("input", renderPropertiesTable));
    ["bookings-search", "booking-search"].forEach((id) => byId(id)?.addEventListener("input", renderBookings));
    ["owners-search", "owner-search"].forEach((id) => byId(id)?.addEventListener("input", renderOwnerAccounts));
    ["chats-search", "chat-search"].forEach((id) => byId(id)?.addEventListener("input", renderChatThreads));

    qa("[data-booking-filter], [data-filter]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.bookingFilter = cleanText(btn.dataset.bookingFilter || btn.dataset.filter || "all");
        qa("[data-booking-filter], [data-filter]").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        renderBookings();
      })
    );

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

      const closeModalBtn = e.target.closest("[data-close-modal], .modal-close, .close-modal-btn");
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

  function initAuthObserver() {
    if (!auth || typeof auth.onAuthStateChanged !== "function") {
      state.authReady = true;
      return;
    }

    if (state.listeners.auth) return;

    state.listeners.auth = auth.onAuthStateChanged(async (user) => {
      state.authReady = true;

      if (!user) {
        clearAdminSessionState();
        ensureLoggedInUI();
        updateProfileUI();
        updateRoleBasedUI();
        renderDashboardStats();
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

        state.currentAuthUser = user;
        state.currentOwnerRecord = roleResult.ownerData || roleResult.userData || null;
        state.adminRole = roleResult.role;
        state.ownerAccountDocId = roleResult.ownerDocId || "";
        state.isLoggedIn = true;

        safeSet(ADMIN_SESSION_KEY, "1");
        safeSet(ADMIN_ROLE_KEY, state.adminRole);
        if (state.ownerAccountDocId) safeSet(ADMIN_OWNER_DOC_KEY, state.ownerAccountDocId);

        ensureLoggedInUI();
        updateProfileUI();
        updateRoleBasedUI();

        if (!state.properties.length && !state.bookings.length && !state.chats.length) {
          await loadAllData();
        }
      } catch (error) {
        console.error("auth observer error:", error);
      }
    });
  }

  function initSession() {
    state.isLoggedIn = safeGet(ADMIN_SESSION_KEY) === "1";
    ensureLoggedInUI();
    updateProfileUI();
    updateRoleBasedUI();
  }

  function init() {
    showFirebaseStatus();
    bindStaticEvents();
    initSession();
    initAuthObserver();
    initMap("admin", "admin-map-picker");
    initMap("edit", "edit-map-picker");
    renderCurrentChatMessages();
    renderChatThreads();
    renderDashboardStats();
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
    loadUsers,
    loadChats,
    openChat,
    ensureChatForBooking
  };
})();
