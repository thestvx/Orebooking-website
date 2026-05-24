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
      guests: toNumber(pickFirst(raw?.guests, raw?.guestsCount, raw?.numberOfGuests, stay?.guests, pricing?.guests), 0),
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

  function calcNights(checkIn, checkOut) {
    try {
      if (!checkIn || !checkOut || checkIn === "—" || checkOut === "—") return 0;
      const d1 = new Date(checkIn);
      const d2 = new Date(checkOut);
      if (isNaN(d1) || isNaN(d2)) return 0;
      const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    } catch {
      return 0;
    }
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

    if (state.activeTab === "properties") renderProperties();
    if (state.activeTab === "bookings") renderBookings();
    if (state.activeTab === "chats") {
      renderChatThreads();
      renderCurrentChatMessages();
    }
  }

  async function loadProperties() {
    if (!db) { state.properties = []; return []; }
    try {
      const snap = await db.collection("properties").get();
      const items = [];
      snap.forEach((doc) => {
        const data = doc.data() || {};
        const item = { id: doc.id, ...data, titleAr: pickFirst(data.titleAr, data.title, data.name), locationAr: pickFirst(data.locationAr, data.location, data.city), typeAr: pickFirst(data.typeAr, data.type, data.category), imageUrl: pickFirst(data.imageUrl, data.mainImage, Array.isArray(data.images) ? data.images[0] : "") };
        if (propertyBelongsToCurrentOwner(item)) items.push(item);
      });
      state.properties = sortByCreatedDesc(items);
      return state.properties;
    } catch (error) { console.error("loadProperties failed:", error); state.properties = []; return []; }
  }

  async function loadBookings() {
    if (!db) { state.bookings = []; return []; }
    try {
      const snap = await db.collection("bookings").get();
      const items = [];
      snap.forEach((doc) => {
        const booking = normalizeBooking({ id: doc.id, ...(doc.data() || {}) });
        if (canAccessBooking(booking)) items.push(booking);
      });
      state.bookings = sortByCreatedDesc(items);
      return state.bookings;
    } catch (error) { console.error("loadBookings failed:", error); state.bookings = []; return []; }
  }

  async function loadChats() {
    if (!db) { state.chats = []; return []; }
    try {
      const snap = await db.collection("chats").get();
      const items = [];
      snap.forEach((doc) => {
        const chat = normalizeChat(doc.data() || {}, doc.id);
        if (canAccessChat(chat)) items.push(chat);
      });
      state.chats = sortByUpdatedDesc(items);
      return state.chats;
    } catch (error) { console.error("loadChats failed:", error); state.chats = []; return []; }
  }

  function getPropertiesGrid() { return byId("properties-grid") || q("[data-properties-grid]") || q(".properties-grid"); }
  function getChatThreadsHost() { return byId("chat-threads") || q("[data-chat-threads]"); }
  function getChatMessagesHost() { return byId("chat-messages") || q("[data-chat-messages]"); }

  function renderProperties() {
    const host = getPropertiesGrid(); if (!host) return;
    const items = state.properties.filter((p) => canManageProperty(p));
    if (!items.length) { host.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="ph ph-buildings"></i> لا توجد عقارات لعرضها.</div>`; return; }
    host.innerHTML = items.map((prop) => {
      const img = getPropertyImage(prop); const title = getPropertyTitle(prop); const location = getPropertyLocation(prop); const type = getPropertyType(prop);
      return `<article class="booking-card"><div class="booking-head"><div class="booking-title"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(location)}</span></div>${statusBadge(prop.status || prop.visibility || "visible")}</div><img src="${escapeHtml(img)}" alt="${escapeHtml(title)}" style="width:100%;height:180px;object-fit:cover;border-radius:18px;border:1px solid var(--border-color);"><div class="booking-extra-row"><span class="booking-info-pill"><i class="ph ph-tag"></i>${escapeHtml(type)}</span><span class="booking-info-pill"><i class="ph ph-map-pin"></i>${escapeHtml(location)}</span></div></article>`;
    }).join("");
  }

  function renderBookings() {
    const host = getBookingCardGrid(); if (!host) return;
    const items = state.bookings.filter((b) => canAccessBooking(b));
    const filtered = state.bookingFilter === "all" ? items : items.filter((b) => b.status === state.bookingFilter);
    if (!filtered.length) { host.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="ph ph-calendar-x"></i> لا توجد حجوزات لعرضها.</div>`; return; }
    host.innerHTML = filtered.map((booking) => {
      const nights = calcNights(booking.checkIn, booking.checkOut);
      return `<article class="booking-card" data-booking-id="${escapeHtml(booking.id)}" data-status="${escapeHtml(booking.status)}"><div class="booking-head"><div class="booking-title"><strong>${escapeHtml(booking.propertyTitle)}</strong><span>${escapeHtml(booking.reference || booking.id)}</span></div>${statusBadge(booking.status)}</div><div class="booking-meta-grid"><div class="booking-meta-item"><label>الضيف</label><strong>${escapeHtml(booking.guestName)}</strong></div><div class="booking-meta-item"><label>الإيميل</label><strong class="mono">${escapeHtml(booking.guestEmail)}</strong></div><div class="booking-meta-item"><label>رقم الهاتف</label><strong class="mono">${escapeHtml(booking.guestPhone)}</strong></div><div class="booking-meta-item"><label>السعر الإجمالي</label><strong>${escapeHtml(formatPrice(booking.total))}</strong></div><div class="booking-meta-item"><label>تاريخ الدخول</label><strong class="mono">${escapeHtml(booking.checkIn)}</strong></div><div class="booking-meta-item"><label>تاريخ الخروج</label><strong class="mono">${escapeHtml(booking.checkOut)}</strong></div><div class="booking-meta-item"><label>عدد الليالي</label><strong>${nights}</strong></div><div class="booking-meta-item"><label>عدد الضيوف</label><strong>${booking.guests || 0}</strong></div></div><div class="booking-extra-row">${booking.roomNumber ? `<span class="booking-info-pill room"><i class="ph ph-door-open"></i>${escapeHtml(booking.roomNumber)}</span>` : ""}${booking.rejectReason ? `<span class="booking-info-pill reject"><i class="ph ph-prohibit"></i>${escapeHtml(booking.rejectReason)}</span>` : ""}</div>${booking.approvalReply ? `<div class="booking-reply-box"><label>رد المالك</label><p>${escapeHtml(booking.approvalReply)}</p></div>` : ""}<div class="booking-actions-row"><button class="btn-open-chat" data-booking-view="${escapeHtml(booking.id)}" type="button"><i class="ph ph-eye"></i><span>عرض</span></button><button class="btn-approve" data-booking-confirm="${escapeHtml(booking.id)}" type="button"><i class="ph ph-check"></i><span>قبول</span></button><button class="btn-reject" data-booking-reject="${escapeHtml(booking.id)}" type="button"><i class="ph ph-x"></i><span>رفض</span></button></div></article>`;
    }).join("");
    ensureBookingGridLayout(); bindBookingCardEvents();
  }

  function renderChatThreads() {
    const host = getChatThreadsHost(); if (!host) return;
    const items = state.chats.filter((chat) => canAccessChat(chat));
    if (!items.length) { host.innerHTML = `<div class="empty-state"><i class="ph ph-chat-circle-dots"></i> لا توجد محادثات.</div>`; return; }
    host.innerHTML = items.map((chat) => `<button class="chat-thread ${chat.id === state.currentChatId ? "active" : ""}" data-chat-id="${escapeHtml(chat.id)}" type="button"><strong>${escapeHtml(chat.userName || chat.propertyTitle || chat.id)}</strong><span>${escapeHtml(chat.lastMessage || "")}</span></button>`).join("");
  }

  function renderCurrentChatMessages() {
    const host = getChatMessagesHost(); if (!host) return;
    const msgs = state.currentChatMessages || [];
    if (!msgs.length) { host.innerHTML = `<div class="empty-state"><i class="ph ph-chat-teardrop"></i> اختر محادثة لعرض الرسائل.</div>`; return; }
    host.innerHTML = msgs.map((m) => `<div class="chat-message ${m.from === "admin" ? "is-admin" : "is-user"}"><div class="chat-message-text">${escapeHtml(m.text || m.message || "")}</div><div class="chat-message-time">${escapeHtml(formatDate(m.createdAt || m.timestamp))}</div></div>`).join("");
  }

  async function loadCurrentChatMessages(chatId) {
    if (!db || !chatId) { state.currentChatMessages = []; renderCurrentChatMessages(); return []; }
    try {
      const snap = await db.collection("chats").doc(chatId).collection("messages").orderBy("createdAt", "asc").get();
      const items = []; snap.forEach((doc) => items.push({ id: doc.id, ...(doc.data() || {}) }));
      state.currentChatMessages = items; renderCurrentChatMessages(); return items;
    } catch (error) { console.error("loadCurrentChatMessages failed:", error); state.currentChatMessages = []; renderCurrentChatMessages(); return []; }
  }

  async function loadAllData() {
    await Promise.all([loadProperties(), loadBookings(), loadChats()]);
    setStat("stats-properties", String(state.properties.length));
    setStat("stats-bookings", String(state.bookings.length));
    setStat("stats-chats", String(state.chats.length));
    if (state.activeTab === "properties") renderProperties();
    if (state.activeTab === "bookings") renderBookings();
    if (state.activeTab === "chats") renderChatThreads();
    if (!state.currentChatId && state.chats.length) state.currentChatId = state.chats[0].id;
    if (state.currentChatId) await loadCurrentChatMessages(state.currentChatId); else renderCurrentChatMessages();
  }

  function getBookingCardGrid() {
    return q("[data-bookings-grid]") || byId("bookings-grid") || q(".bookings-grid") || q(".booking-list") || q(".bookings-list");
  }

  function ensureBookingGridLayout() {
    const grid = getBookingCardGrid();
    if (!grid) return;
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
    grid.style.gap = "18px";
    grid.style.alignItems = "stretch";
    qa(".booking-card", grid).forEach((card) => {
      card.style.height = "100%";
      card.style.display = "flex";
      card.style.flexDirection = "column";
    });
  }

  function bindBookingCardEvents() {
    qa("[data-booking-view]").forEach((btn) => {
      if (btn.dataset.boundBookingView) return;
      btn.dataset.boundBookingView = "1";
      btn.addEventListener("click", () => showToast(`معرّف الحجز: ${btn.dataset.bookingView}`, "info"));
    });

    qa("[data-booking-confirm]").forEach((btn) => {
      if (btn.dataset.boundBookingConfirm) return;
      btn.dataset.boundBookingConfirm = "1";
      btn.addEventListener("click", () => showToast("تم قبول الحجز.", "success"));
    });

    qa("[data-booking-reject]").forEach((btn) => {
      if (btn.dataset.boundBookingReject) return;
      btn.dataset.boundBookingReject = "1";
      btn.addEventListener("click", () => showToast("تم رفض الحجز.", "warning"));
    });
  }

  function bindStaticEvents() {
    const form = getLoginForm();
    if (form && !form.dataset.boundLogin) {
      form.dataset.boundLogin = "1";
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = getValue("admin-login-email", "admin-username", "admin-user", "login-username", "username", "email");
        const password = getValue("admin-login-password", "admin-password", "admin-pass", "login-password", "password");
        await login(email, password);
      });
    }

    qa("[data-tab-target], .sidebar-nav .nav-item[data-tab]").forEach((btn) => {
      if (btn.dataset.boundTab) return;
      btn.dataset.boundTab = "1";
      btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget || btn.dataset.tab || "dashboard"));
    });

    const logoutBtn = byId("admin-logout-btn");
    if (logoutBtn && !logoutBtn.dataset.boundLogout) {
      logoutBtn.dataset.boundLogout = "1";
      logoutBtn.addEventListener("click", logout);
    }
  }

  async function bindAuthState() {
    if (!auth || typeof auth.onAuthStateChanged !== "function") return;
    if (state.listeners.auth) state.listeners.auth();
    state.listeners.auth = auth.onAuthStateChanged(async (user) => {
      state.authReady = true;
      if (user) {
        const hint = safeGet(ADMIN_LOGIN_HINT_KEY, "");
        if (hint) safeSet(ADMIN_LOGIN_HINT_KEY, hint);
        const roleResult = await getAdminRoleFromFirestore(user);
        if (roleResult.ok) await applyAuthorizedSession(user, roleResult);
        else {
          clearAdminSessionState();
          ensureLoggedInUI();
          updateProfileUI();
        }
      } else {
        clearAdminSessionState();
        ensureLoggedInUI();
        updateProfileUI();
      }
    });
  }

  function initSession() {
    const sessionOn = safeGet(ADMIN_SESSION_KEY, "");
    if (sessionOn === "1") state.isLoggedIn = true;
    const role = safeGet(ADMIN_ROLE_KEY, "");
    if (role) state.adminRole = role;
    const ownerDoc = safeGet(ADMIN_OWNER_DOC_KEY, "");
    if (ownerDoc) state.ownerAccountDocId = ownerDoc;
  }

  function init() {
    initSession();
    showFirebaseStatus();
    ensureLoggedInUI();
    updateProfileUI();
    updateRoleBasedUI();
    bindStaticEvents();
    bindAuthState();
    loadAllData();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
