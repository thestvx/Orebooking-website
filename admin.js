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
    if (!requireAuth(false) || !firebaseReady) return;
    await Promise.all([
      loadProperties(),
      loadOwnerAccounts(),
      loadUsers()
    ]);
    await loadBookings();
    await loadChats();
    renderDashboardStats();
    updateProfileUI();
    updateRoleBasedUI();
  }

  function renderDashboardStats() {
    const pending = state.bookings.filter((b) => getBookingStatus(b.status) === "pending").length;
    const confirmed = state.bookings.filter((b) => getBookingStatus(b.status) === "confirmed").length;
    const rejected = state.bookings.filter((b) => getBookingStatus(b.status) === "rejected").length;

    setStat("stat-properties-count", String(state.properties.length));
    setStat("stat-bookings-count", String(state.bookings.length));
    setStat("stat-owners-count", String(state.ownerAccounts.length));
    setStat("stat-chats-count", String(state.chats.length));

    setText(String(state.properties.length), "dashboard-properties-count", "mini-properties-count");
    setText(String(state.bookings.length), "dashboard-bookings-count", "mini-bookings-count");
    setText(String(pending), "pending-bookings-count");
    setText(String(confirmed), "confirmed-bookings-count");
    setText(String(rejected), "rejected-bookings-count");
    setText(String(state.users.length), "dashboard-users-count", "users-count");
  }

  async function loadProperties() {
    const tbody = byId("properties-tbody") || byId("properties-table-body");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:22px;">جارٍ تحميل العقارات...</td></tr>`;
    }

    try {
      let items = [];
      const snap = await db.collection("properties").get();
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });

      items = items.filter((prop) => canManageProperty(prop));
      state.properties = sortByCreatedDesc(items);
      renderPropertiesTable();
      renderDashboardStats();
    } catch (error) {
      console.error("loadProperties error:", error);
      state.properties = [];
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:22px;color:#ef4444;">تعذر تحميل العقارات.</td></tr>`;
      }
      showToast("تعذر تحميل العقارات.", "error");
    }
  }

  function renderPropertiesTable() {
    const tbody = byId("properties-tbody") || byId("properties-table-body");
    if (!tbody) return;

    const query = cleanText(getValue("properties-search", "property-search")).toLowerCase();

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
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:28px;">لا توجد عقارات حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((prop) => {
        const visible = prop.isActive !== false && prop.visible !== false;
        return `
          <tr>
            <td>
              <img
                class="prop-thumb"
                src="${escapeHtml(getPropertyImage(prop))}"
                alt="${escapeHtml(getPropertyTitle(prop))}"
                onerror="this.onerror=null;this.src='images/placeholder.jpg';"
              />
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
            <td>${visible ? '<span class="status-badge visible">ظاهر</span>' : '<span class="status-badge hidden">مخفي</span>'}</td>
            <td>
              <div class="table-actions">
                <button type="button" class="edit-property-btn" data-id="${escapeHtml(prop.id)}"><i class="ph ph-pencil-simple"></i> تعديل</button>
                <button type="button" class="toggle-property-btn" data-id="${escapeHtml(prop.id)}" data-visible="${visible ? "1" : "0"}">
                  <i class="ph ${visible ? "ph-eye-slash" : "ph-eye"}"></i>
                  ${visible ? "إخفاء" : "إظهار"}
                </button>
                <button type="button" class="delete-property-btn" data-id="${escapeHtml(prop.id)}"><i class="ph ph-trash"></i> حذف</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  function collectPropertyFormData(prefix = "admin") {
    const titleAr = getValue(`${prefix}-title-ar`, `${prefix}-title`);
    const titleEn = getValue(`${prefix}-title-en`);
    const locationAr = getValue(`${prefix}-location-ar`, `${prefix}-location`);
    const locationEn = getValue(`${prefix}-location-en`);
    const typeAr = getValue(`${prefix}-type-ar`, `${prefix}-type`);
    const typeEn = getValue(`${prefix}-type-en`);
    const descriptionAr = getValue(`${prefix}-description-ar`, `${prefix}-description`);
    const descriptionEn = getValue(`${prefix}-description-en`);
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
    const amenitiesText = getValue(`${prefix}-amenities`, `${prefix}-features`);
    const selectedAmenities = getCheckedValues(`[name="${prefix}-amenities"]:checked, [name="${prefix}-features"]:checked`);
    const amenities = selectedAmenities.length ? selectedAmenities : normalizeArray(amenitiesText);
    const extras = normalizeArray(getValue(`${prefix}-extras`, `${prefix}-property-extras`));

    const allImages = normalizeArray(gallery);
    if (imageUrl && !allImages.includes(imageUrl)) allImages.unshift(imageUrl);

    const title = titleAr || titleEn;
    const location = locationAr || locationEn;
    const type = typeAr || typeEn;
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
      payload.ownerEmail = cleanText(state.currentAuthUser?.email || ownerEmail);
      if (state.ownerAccountDocId) payload.ownerAccountDocId = state.ownerAccountDocId;
      if (state.currentOwnerRecord?.username) payload.ownerUsername = cleanText(state.currentOwnerRecord.username);
      if (state.currentOwnerRecord?.phone) payload.ownerPhone = cleanText(state.currentOwnerRecord.phone);
    }

    return payload;
  }

  function validatePropertyData(data) {
    if (!cleanText(data.titleAr || data.title)) return "يرجى إدخال اسم العقار.";
    if (!cleanText(data.locationAr || data.location)) return "يرجى إدخال موقع العقار.";
    if (!toNumber(data.price, 0)) return "يرجى إدخال السعر.";
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
      showToast("لا تملك صلاحية تعديل هذا العقار.", "error");
      return;
    }

    try {
      await db.collection("properties").doc(id).update({
        isActive: !visibleNow,
        visible: !visibleNow,
        updatedAt: getServerTimestamp()
      });
      await loadProperties();
      showToast(`تم ${!visibleNow ? "إظهار" : "إخفاء"} العقار بنجاح.`, "success");
    } catch (error) {
      console.error("toggle visibility error:", error);
      showToast("تعذر تعديل حالة العقار.", "error");
    }
  }

  async function deleteProperty(id) {
    if (!firebaseReady) return;
    const prop = state.properties.find((p) => p.id === id);
    if (!prop || !canManageProperty(prop)) {
      showToast("لا تملك صلاحية حذف هذا العقار.", "error");
      return;
    }

    if (!confirm("هل أنت متأكد من حذف هذا العقار؟")) return;

    try {
      await db.collection("properties").doc(id).delete();
      await loadProperties();
      showToast("تم حذف العقار بنجاح.", "success");
    } catch (error) {
      console.error("delete property error:", error);
      showToast("تعذر حذف العقار.", "error");
    }
  }

  function openEditPropertyModal(id) {
    const prop = state.properties.find((p) => p.id === id);
    if (!prop) return;

    setValue(getPropertyTitle(prop), "edit-title-ar");
    setValue(cleanText(prop.titleEn || ""), "edit-title-en");
    setValue(getPropertyLocation(prop), "edit-location-ar");
    setValue(cleanText(prop.locationEn || ""), "edit-location-en");
    setValue(getPropertyType(prop), "edit-type-ar");
    setValue(cleanText(prop.typeEn || ""), "edit-type-en");
    setValue(cleanText(prop.descriptionAr || prop.description || ""), "edit-description-ar");
    setValue(cleanText(prop.ownerName || ""), "edit-owner-name");
    setValue(cleanText(prop.ownerEmail || ""), "edit-owner-email");
    setValue(cleanText(prop.ownerPhone || ""), "edit-owner-phone");
    setValue(cleanText(prop.imageUrl || prop.mainImage || ""), "edit-image-url");
    setValue(normalizeArray(prop.gallery || prop.images || []).join(", "), "edit-gallery");
    setValue(String(toNumber(prop.price || prop.pricePerNight || prop.basePrice || 0)), "edit-price");
    setValue(String(toNumber(prop.guests || prop.maxGuests || 1)), "edit-guests");
    setValue(String(toNumber(prop.bedrooms || 0)), "edit-bedrooms");
    setValue(String(toNumber(prop.bathrooms || 0)), "edit-bathrooms");
    setValue(normalizeArray(prop.amenities || prop.features || []).join(", "), "edit-amenities");
    setValue(normalizeArray(prop.extras || []).join(", "), "edit-extras");
    setValue(prop.lat != null ? String(prop.lat) : "", "edit-lat");
    setValue(prop.lng != null ? String(prop.lng) : "", "edit-lng");

    setUploadPreviewFromUrl("edit", cleanText(prop.imageUrl || prop.mainImage || ""));

    const modal = byId("edit-property-modal");
    if (modal) {
      modal.classList.add("active");
      document.body.classList.add("modal-open");
      modal.dataset.editId = id;

      setTimeout(() => {
        if (!state.maps.edit) {
          initMap("edit", "edit-map-picker");
        } else {
          state.maps.edit.invalidateSize?.();
        }
        if (prop.lat && prop.lng) {
          const latNum = toNumber(prop.lat);
          const lngNum = toNumber(prop.lng);
          if (latNum && lngNum) {
            state.maps.edit.setView([latNum, lngNum], 13);
            if (state.maps.editMarker) {
              state.maps.editMarker.setLatLng([latNum, lngNum]);
            } else {
              state.maps.editMarker = window.L?.marker([latNum, lngNum], { draggable: true }).addTo(state.maps.edit);
              state.maps.editMarker?.on("dragend", (ev) => {
                const pos = ev.target.getLatLng();
                setValue(String(pos.lat.toFixed(6)), "edit-lat");
                setValue(String(pos.lng.toFixed(6)), "edit-lng");
                showMapPickedBadge("edit");
              });
            }
            showMapPickedBadge("edit");
          }
        }
      }, 250);
    }
  }

  async function handleEditPropertySubmit(e) {
    e.preventDefault();
    if (!firebaseReady) return showToast("Firebase غير جاهز.", "error");
    if (!requireAuth()) return;

    const modal = byId("edit-property-modal");
    const id = modal?.dataset.editId;
    if (!id) return showToast("تعذر تحديد العقار.", "error");

    const prop = state.properties.find((p) => p.id === id);
    if (!prop || !canManageProperty(prop)) return showToast("لا تملك صلاحية تعديل هذا العقار.", "error");

    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    const data = collectPropertyFormData("edit");
    const validation = validatePropertyData(data);
    if (validation) return showToast(validation, "warning");

    setButtonLoading(btn, true, "جارٍ حفظ التعديلات...");
    try {
      await db.collection("properties").doc(id).update(data);
      closeModal(modal);
      await loadProperties();
      showToast("تم حفظ التعديلات بنجاح.", "success");
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
      const snap = await db.collection("bookings").get();
      snap.forEach((doc) => items.push(normalizeBooking({ id: doc.id, ...doc.data() })));
      state.bookings = sortByCreatedDesc(items).filter((booking) => canAccessBooking(booking));
      renderBookings();
      renderDashboardStats();
    } catch (error) {
      console.error("loadBookings error:", error);
      state.bookings = [];
      if (container) {
        container.innerHTML = `<div class="empty-state"><i class="ph ph-warning-circle"></i><div>تعذر تحميل الحجوزات.</div></div>`;
      }
      showToast("تعذر تحميل الحجوزات.", "error");
    }
  }

  // =============================================
  // ✅ renderBookings — 3 بطاقات في كل صف
  // =============================================
  function renderBookings() {
    const container = byId("bookings-container");
    if (!container) return;

    const counts = {
      all: state.bookings.length,
      pending: state.bookings.filter((b) => getBookingStatus(b.status) === "pending").length,
      confirmed: state.bookings.filter((b) => getBookingStatus(b.status) === "confirmed").length,
      rejected: state.bookings.filter((b) => getBookingStatus(b.status) === "rejected").length
    };

    setText(String(counts.all), "booking-count-all", "all-bookings-count");
    setText(String(counts.pending), "booking-count-pending", "pending-bookings-filter-count");
    setText(String(counts.confirmed), "booking-count-confirmed", "confirmed-bookings-filter-count");
    setText(String(counts.rejected), "booking-count-rejected", "rejected-bookings-filter-count");

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
          b.ownerUid,
          b.ownerEmail,
          b.ownerAccountDocId,
          b.ownerUsername,
          deepGet(b, "guest.fullName"),
          deepGet(b, "guest.email"),
          deepGet(b, "guest.phone"),
          deepGet(b, "stay.checkIn"),
          deepGet(b, "stay.checkOut"),
          b.roomNumber,
          b.approvalReply,
          b.rejectReason
        ].join(" ").toLowerCase();

        return hay.includes(query);
      });
    }

    if (!rows.length) {
      container.innerHTML = `
        <div style="
          display:grid;
          grid-template-columns:repeat(3,1fr);
          gap:20px;
        ">
          <div class="empty-state" style="grid-column:1/-1;">
            <i class="ph ph-calendar-x"></i>
            <div>لا توجد حجوزات حالياً.</div>
          </div>
        </div>
      `;
      return;
    }

    const cards = rows.map((booking) => {
      const status = getBookingStatus(booking.status);
      const title = cleanText(booking.propertyTitle || "عقار غير معروف");
      const guest = cleanText(booking.guestName || "غير معروف");
      const email = cleanText(booking.guestEmail || "—");
      const phone = cleanText(booking.guestPhone || "—");
      const checkIn = cleanText(booking.checkIn || "—");
      const checkOut = cleanText(booking.checkOut || "—");
      const total = booking.total || 0;
      const reference = cleanText(booking.reference || booking.id);
      const roomNumber = cleanText(booking.roomNumber || "");
      const approvalReply = cleanText(booking.approvalReply || "");
      const rejectReason = cleanText(booking.rejectReason || "");
      const createdAt = formatDate(booking.createdAt || booking.timestamp || booking.dateCreated);
      const canOpenChat = !!(booking.userId || booking.guestEmail);
      const guestsCount = toNumber(booking.guests, 0);
      const nights = calcNights(checkIn, checkOut);

      return `
        <div class="booking-card" data-booking-id="${escapeHtml(booking.id)}" data-status="${escapeHtml(status)}" style="
          background:#fff;
          border:1px solid #e2e8f0;
          border-radius:20px;
          padding:20px;
          display:flex;
          flex-direction:column;
          gap:14px;
          box-shadow:0 2px 12px rgba(15,23,42,.06);
          transition:box-shadow .2s;
        ">

          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;">
            <div style="display:flex;flex-direction:column;gap:4px;min-width:0;">
              <strong style="font-size:.95rem;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title)}</strong>
              <span style="font-size:.78rem;color:#94a3b8;">#${escapeHtml(reference)}</span>
            </div>
            ${statusBadge(status)}
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <div style="display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:.72rem;color:#94a3b8;font-weight:600;"><i class="ph ph-user"></i> الضيف</label>
              <span style="font-size:.85rem;font-weight:700;color:#1e293b;">${escapeHtml(guest)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:.72rem;color:#94a3b8;font-weight:600;"><i class="ph ph-currency-circle-dollar"></i> الإجمالي</label>
              <span style="font-size:.85rem;font-weight:700;color:#1e293b;">${escapeHtml(formatPrice(total))}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:.72rem;color:#94a3b8;font-weight:600;"><i class="ph ph-calendar-blank"></i> الدخول</label>
              <span style="font-size:.82rem;color:#334155;">${escapeHtml(checkIn)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:.72rem;color:#94a3b8;font-weight:600;"><i class="ph ph-calendar-check"></i> الخروج</label>
              <span style="font-size:.82rem;color:#334155;">${escapeHtml(checkOut)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:.72rem;color:#94a3b8;font-weight:600;"><i class="ph ph-envelope-simple"></i> البريد</label>
              <span style="font-size:.78rem;color:#64748b;word-break:break-all;">${escapeHtml(email)}</span>
            </div>
            <div style="display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:.72rem;color:#94a3b8;font-weight:600;"><i class="ph ph-phone"></i> الهاتف</label>
              <span style="font-size:.82rem;color:#334155;">${escapeHtml(phone)}</span>
            </div>
            ${guestsCount > 0 ? `
            <div style="display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:.72rem;color:#94a3b8;font-weight:600;"><i class="ph ph-users"></i> الأشخاص</label>
              <span style="font-size:.82rem;color:#334155;">${escapeHtml(String(guestsCount))} شخص</span>
            </div>` : ""}
            ${nights > 0 ? `
            <div style="display:flex;flex-direction:column;gap:3px;">
              <label style="font-size:.72rem;color:#94a3b8;font-weight:600;"><i class="ph ph-moon"></i> الإقامة</label>
              <span style="font-size:.82rem;color:#334155;">${escapeHtml(String(nights))} ليلة</span>
            </div>` : ""}
          </div>

          ${roomNumber || nights > 0 || guestsCount > 0 ? `
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${roomNumber ? `<span style="background:#eff6ff;color:#3b82f6;border:1px solid #bfdbfe;border-radius:10px;padding:4px 10px;font-size:.75rem;font-weight:700;"><i class="ph ph-door"></i> غرفة ${escapeHtml(roomNumber)}</span>` : ""}
            ${nights > 0 ? `<span style="background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:10px;padding:4px 10px;font-size:.75rem;font-weight:700;"><i class="ph ph-moon-stars"></i> ${escapeHtml(String(nights))} ليلة</span>` : ""}
            ${guestsCount > 0 ? `<span style="background:#faf5ff;color:#7c3aed;border:1px solid #ddd6fe;border-radius:10px;padding:4px 10px;font-size:.75rem;font-weight:700;"><i class="ph ph-users-three"></i> ${escapeHtml(String(guestsCount))} شخص</span>` : ""}
          </div>` : ""}

          <div style="font-size:.72rem;color:#94a3b8;"><i class="ph ph-clock"></i> ${escapeHtml(createdAt)}</div>

          ${approvalReply ? `
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:10px 12px;">
            <div style="font-size:.72rem;color:#16a34a;font-weight:700;margin-bottom:4px;"><i class="ph ph-chat-circle-text"></i> رد الموافقة</div>
            <p style="font-size:.82rem;color:#166534;margin:0;">${escapeHtml(approvalReply)}</p>
          </div>` : ""}

          ${rejectReason ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:10px 12px;">
            <div style="font-size:.72rem;color:#dc2626;font-weight:700;margin-bottom:4px;"><i class="ph ph-x-circle"></i> سبب الرفض</div>
            <p style="font-size:.82rem;color:#991b1b;margin:0;">${escapeHtml(rejectReason)}</p>
          </div>` : ""}

          <div style="display:flex;gap:8px;margin-top:auto;padding-top:4px;border-top:1px solid #f1f5f9;">
            <button
              type="button"
              class="btn-approve"
              data-booking-id="${escapeHtml(booking.id)}"
              ${status === "confirmed" ? "disabled" : ""}
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 6px;border-radius:12px;border:none;background:${status === "confirmed" ? "#d1fae5" : "#ecfdf5"};color:${status === "confirmed" ? "#6ee7b7" : "#059669"};font-size:.8rem;font-weight:700;cursor:${status === "confirmed" ? "not-allowed" : "pointer"};"
            >
              <i class="ph ph-check-circle"></i> قبول
            </button>
            <button
              type="button"
              class="btn-reject"
              data-booking-id="${escapeHtml(booking.id)}"
              ${status === "rejected" ? "disabled" : ""}
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 6px;border-radius:12px;border:none;background:${status === "rejected" ? "#fee2e2" : "#fef2f2"};color:${status === "rejected" ? "#fca5a5" : "#dc2626"};font-size:.8rem;font-weight:700;cursor:${status === "rejected" ? "not-allowed" : "pointer"};"
            >
              <i class="ph ph-x-circle"></i> رفض
            </button>
            <button
              type="button"
              class="btn-open-chat"
              data-booking-id="${escapeHtml(booking.id)}"
              ${!canOpenChat ? "disabled" : ""}
              style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:8px 6px;border-radius:12px;border:none;background:#eff6ff;color:#3b82f6;font-size:.8rem;font-weight:700;cursor:${!canOpenChat ? "not-allowed" : "pointer"};"
            >
              <i class="ph ph-chat-circle-dots"></i> محادثة
            </button>
          </div>

        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div style="
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:20px;
        align-items:start;
      ">
        ${cards}
      </div>
    `;
  }

  async function updateBookingStatus(bookingId, newStatus) {
    if (!firebaseReady || !bookingId) return;

    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) return showToast("الحجز غير موجود.", "error");
    if (!canAccessBooking(booking)) return showToast("لا تملك صلاحية تعديل هذا الحجز.", "error");

    const normalizedStatus = getBookingStatus(newStatus);

    try {
      const updateData = {
        status: normalizedStatus,
        updatedAt: getServerTimestamp()
      };

      if (normalizedStatus === "confirmed") {
        const roomNumber = booking.roomNumber || getRandomRoomNumber();
        updateData.roomNumber = roomNumber;
        updateData.approvalReply = getAutoApprovalMessage(roomNumber);
      } else if (normalizedStatus === "rejected") {
        if (state.pendingRejectBookingId !== bookingId) {
          state.pendingRejectBookingId = bookingId;
          const reason = prompt("أدخل سبب الرفض (اختياري):") ?? "";
          updateData.rejectReason = cleanText(reason) || "لم يتم تحديد السبب";
          updateData.approvalReply = getAutoRejectionMessage(updateData.rejectReason);
          state.pendingRejectBookingId = "";
        }
      }

      await db.collection("bookings").doc(bookingId).update(updateData);
      await loadBookings();

      const label = normalizedStatus === "confirmed" ? "تم قبول الحجز بنجاح." : "تم رفض الحجز.";
      showToast(label, normalizedStatus === "confirmed" ? "success" : "warning");

      if (normalizedStatus === "confirmed" && (booking.userId || booking.guestEmail)) {
        await ensureChatForBooking(bookingId);
      }
    } catch (error) {
      console.error("updateBookingStatus error:", error);
      showToast("تعذر تحديث حالة الحجز.", "error");
    }
  }

  async function ensureChatForBooking(bookingId) {
    if (!firebaseReady || !bookingId) return;

    const booking = state.bookings.find((b) => b.id === bookingId);
    if (!booking) return;

    try {
      const existingChat = state.chats.find(
        (c) => cleanText(c.bookingId) === bookingId || cleanText(c.reservationId) === bookingId
      );

      if (existingChat) {
        activateTab("chats");
        openChat(existingChat.id);
        return;
      }

      const identity = getCurrentOwnerIdentity();
      const chatData = {
        bookingId,
        propertyId: booking.propertyId || "",
        propertyTitle: booking.propertyTitle || "",
        userId: booking.userId || "",
        userEmail: booking.guestEmail || "",
        userName: booking.guestName || "",
        ownerId: identity.uid || "",
        ownerEmail: identity.email || "",
        ownerUsername: identity.username || "",
        ownerPhone: identity.phone || "",
        ownerAccountDocId: identity.ownerDocId || "",
        participants: [booking.userId, identity.uid].filter(Boolean),
        participantIds: [booking.userId, identity.uid].filter(Boolean),
        lastMessage: "",
        createdAt: getServerTimestamp(),
        updatedAt: getServerTimestamp()
      };

      const ref = await db.collection("chats").add(chatData);
      await loadChats();
      activateTab("chats");
      openChat(ref.id);
    } catch (error) {
      console.error("ensureChatForBooking error:", error);
      showToast("تعذر فتح المحادثة.", "error");
    }
  }

  async function loadOwnerAccounts() {
    if (!isSuperAdmin()) return;

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
      showToast("تعذر تحميل حسابات الملاك.", "error");
    }
  }

  function renderOwnerAccounts() {
    const tbody = byId("owner-accounts-tbody");
    if (!tbody) return;

    const query = cleanText(getValue("owners-search")).toLowerCase();
    let rows = [...state.ownerAccounts];

    if (query) {
      rows = rows.filter((o) =>
        [o.id, o.name, o.email, o.phone, o.username]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;">لا توجد حسابات حالياً.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows
      .map((o) => {
        const active = o.isActive !== false;
        return `
          <tr>
            <td>${escapeHtml(cleanText(o.name || "—"))}</td>
            <td>${escapeHtml(cleanText(o.email || "—"))}</td>
            <td>${escapeHtml(cleanText(o.phone || "—"))}</td>
            <td>${escapeHtml(cleanText(o.username || "—"))}</td>
            <td>${active ? '<span class="status-badge confirmed">نشط</span>' : '<span class="status-badge rejected">معطّل</span>'}</td>
            <td>
              <div class="table-actions">
                <button type="button" class="edit-owner-btn" data-id="${escapeHtml(o.id)}"><i class="ph ph-pencil-simple"></i> تعديل</button>
                <button type="button" class="delete-owner-btn" data-id="${escapeHtml(o.id)}"><i class="ph ph-trash"></i> حذف</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function handleOwnerAccountSubmit(e) {
    e.preventDefault();
    if (!isSuperAdmin()) return showToast("غير مصرح.", "error");

    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');

    const name = getValue("owner-name");
    const email = normalizeEmail(getValue("owner-email"));
    const phone = cleanText(getValue("owner-phone"));
    const username = cleanText(getValue("owner-username")).toLowerCase();
    const password = cleanText(getValue("owner-password"));

    if (!name || !email || !password) {
      return showToast("يرجى ملء الاسم والبريد وكلمة المرور.", "warning");
    }

    const editId = form.dataset.editId;

    setButtonLoading(btn, true, "جارٍ الحفظ...");
    try {
      const payload = {
        name,
        email,
        phone,
        username,
        role: "owner",
        isActive: true,
        updatedAt: getServerTimestamp()
      };

      if (editId) {
        await db.collection("ownerAccounts").doc(editId).update(payload);
        delete form.dataset.editId;
        showToast("تم تحديث الحساب بنجاح.", "success");
      } else {
        payload.createdAt = getServerTimestamp();
        payload.passwordHint = password;
        await db.collection("ownerAccounts").add(payload);
        showToast("تم إنشاء الحساب بنجاح.", "success");
      }

      form.reset();
      await loadOwnerAccounts();
    } catch (error) {
      console.error("owner account submit error:", error);
      showToast("تعذر حفظ الحساب.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function fillOwnerForm(id) {
    const owner = state.ownerAccounts.find((o) => o.id === id);
    if (!owner) return;

    setValue(cleanText(owner.name || ""), "owner-name");
    setValue(cleanText(owner.email || ""), "owner-email");
    setValue(cleanText(owner.phone || ""), "owner-phone");
    setValue(cleanText(owner.username || ""), "owner-username");
    setValue("", "owner-password");

    const form = byId("owner-account-form") || byId("owner-form");
    if (form) form.dataset.editId = id;

    activateTab("owners");
    showToast("تم تحميل بيانات الحساب للتعديل.", "info");
  }

  async function deleteOwnerAccount(id) {
    if (!isSuperAdmin()) {
      showToast("حذف حسابات المُلّاك متاح فقط للأدمن العام.", "error");
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
      const snap = await db.collection("users").get();
      snap.forEach((doc) => items.push(normalizeUser(doc.data(), doc.id)));
      state.users = sortByCreatedDesc(items);
    } catch (error) {
      console.error("loadUsers error:", error);
      state.users = [];
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
      lastMessage: booking.approvalReply || booking.rejectReason || booking.reference,
      updatedAt: booking.updatedAt || booking.createdAt,
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
      const items = [];
      const snap = await db.collection("chats").get();
      snap.forEach((doc) => items.push(normalizeChat(doc.data(), doc.id)));

      const filteredReal = items.filter((chat) => isSuperAdmin() || canAccessChat(chat));
      const bookingDerivedThreads = derivePseudoChatsFromBookings();
      state.chats = sortByUpdatedDesc(mergeChats(filteredReal, bookingDerivedThreads));

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
    } catch (error) {
      console.error("loadChats error:", error);
      state.chats = derivePseudoChatsFromBookings();
      renderChatThreads();
      showToast("تعذر تحميل المحادثات.", "error");
    }
  }

  function renderChatThreads() {
    const list = byId("admin-chat-list") || byId("chats-list") || byId("chat-threads-list");
    if (!list) return;

    const query = cleanText(getValue("chats-search", "chat-search")).toLowerCase();
    let rows = [...state.chats];

    if (query) {
      rows = rows.filter((chat) =>
        [
          chat.id,
          chat.userName,
          chat.userEmail,
          chat.lastMessage,
          chat.bookingId,
          chat.propertyTitle,
          chat.userId
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }

    if (!rows.length) {
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-centered-dots"></i><div>لا توجد محادثات حالياً.</div></div>`;
      return;
    }

    list.innerHTML = rows.map((chat) => {
      const name = cleanText(chat.userName || chat.customerName || chat.name || chat.userEmail || chat.id);
      const subtitle = cleanText(chat.lastMessage || chat.lastText || "بدون رسائل بعد");
      const isActive = state.currentChatId === chat.id;
      const smallMeta = cleanText(chat.propertyTitle || chat.bookingId || "");

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
    if (subEl) subEl.textContent = cleanText(chat?.propertyTitle || chat?.bookingId || chat?.lastMessage || "");

    if (chatId.startsWith("booking-thread-")) loadPseudoChatMessages(chatId);
    else subscribeToChatMessages(chatId);
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
        .onSnapshot(
          async (snap) => {
            const messages = [];
            snap.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));

            if (!messages.length) {
              try {
                const fallback = await db.collection("messages").where("chatId", "==", chatId).get();
                fallback.forEach((doc) => messages.push({ id: doc.id, ...doc.data() }));
                messages.sort((a, b) => {
                  const at = a?.createdAt?.toMillis?.() || new Date(a?.createdAt || 0).getTime() || 0;
                  const bt = b?.createdAt?.toMillis?.() || new Date(b?.createdAt || 0).getTime() || 0;
                  return at - bt;
                });
              } catch (err) {
                console.warn("messages fallback error:", err);
              }
            }

            state.currentChatMessages = messages;
            renderCurrentChatMessages();
          },
          async (error) => {
            console.error("subscribeToChatMessages error:", error);
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
            } catch {
              state.currentChatMessages = [];
            }
            renderCurrentChatMessages();
          }
        );
    } catch (error) {
      console.error("subscribeToChatMessages setup error:", error);
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
        text: `الحجز مرتبط بالضيف ${booking.guestName} ورقم المرجع ${booking.reference}.`,
        senderRole: "system",
        senderName: "النظام",
        createdAt: booking.createdAt || new Date().toISOString()
      }
    ];

    if (booking.approvalReply) {
      messages.push({
        id: `pseudo-approval-${booking.id}`,
        text: booking.approvalReply,
        senderRole: "admin",
        senderName: "الإدارة",
        createdAt: booking.updatedAt || booking.createdAt || new Date().toISOString()
      });
    }

    if (booking.rejectReason) {
      messages.push({
        id: `pseudo-reject-${booking.id}`,
        text: getAutoRejectionMessage(booking.rejectReason),
        senderRole: "admin",
        senderName: "الإدارة",
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
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-circle"></i><div>لا توجد محادثة محددة بعد.</div></div>`;
      return;
    }

    if (!state.currentChatMessages.length) {
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-centered-dots"></i><div>لا توجد رسائل في هذه المحادثة بعد.</div></div>`;
      return;
    }

    list.innerHTML = state.currentChatMessages.map((msg) => {
      const mine = ["admin", "owner", "host", "support"].includes(cleanText(msg.senderRole).toLowerCase());
      const text = cleanText(pickFirst(msg.text, msg.message, msg.body, msg.content));
      const sender = cleanText(pickFirst(msg.senderName, msg.name, msg.senderRole, mine ? "الإدارة" : "الضيف"));
      const time = formatDate(msg.createdAt || msg.timestamp);

      return `
        <div style="display:flex;justify-content:${mine ? "flex-start" : "flex-end"};margin-bottom:14px;">
          <div style="
            max-width:72%;
            padding:12px 16px;
            border-radius:${mine ? "18px 18px 18px 4px" : "18px 18px 4px 18px"};
            background:${mine ? "rgba(67,90,191,.09)" : "#f8fafc"};
            border:1px solid ${mine ? "rgba(67,90,191,.15)" : "#e2e8f0"};
          ">
            <div style="font-size:.78rem;font-weight:700;color:${mine ? "#4361bf" : "#64748b"};margin-bottom:4px;">${escapeHtml(sender)}</div>
            <div style="font-size:.9rem;line-height:1.7;color:#1e293b;">${escapeHtml(text)}</div>
            <div style="font-size:.7rem;color:#94a3b8;margin-top:6px;text-align:${mine ? "left" : "right"};">${escapeHtml(time)}</div>
          </div>
        </div>
      `;
    }).join("");

    list.scrollTop = list.scrollHeight;
  }

  async function sendAdminMessage(e) {
    e.preventDefault();
    if (!requireAuth()) return;

    const form = e.currentTarget;
    const input = form.querySelector("textarea") || form.querySelector("input[type='text']");
    const btn = form.querySelector("button[type='submit']");
    const text = cleanText(input?.value || "");

    if (!text) return showToast("أدخل رسالة.", "warning");

    let actualChatId = state.currentChatId;

    if (!actualChatId) return showToast("اختر محادثة أولاً.", "warning");

    setButtonLoading(btn, true, "جارٍ الإرسال...");

    try {
      if (actualChatId.startsWith("booking-thread-")) {
        const bookingId = actualChatId.replace("booking-thread-", "
        const bookingId = actualChatId.replace("booking-thread-", "");
        const booking = state.bookings.find((b) => b.id === bookingId);
        if (!booking) return showToast("الحجز غير موجود.", "error");

        const identity = getCurrentOwnerIdentity();
        const chatData = {
          bookingId,
          propertyId: booking.propertyId || "",
          propertyTitle: booking.propertyTitle || "",
          userId: booking.userId || "",
          userEmail: booking.guestEmail || "",
          userName: booking.guestName || "",
          ownerId: identity.uid || "",
          ownerEmail: identity.email || "",
          ownerUsername: identity.username || "",
          ownerPhone: identity.phone || "",
          ownerAccountDocId: identity.ownerDocId || "",
          participants: [booking.userId, identity.uid].filter(Boolean),
          participantIds: [booking.userId, identity.uid].filter(Boolean),
          lastMessage: text,
          createdAt: getServerTimestamp(),
          updatedAt: getServerTimestamp()
        };

        const ref = await db.collection("chats").add(chatData);
        actualChatId = ref.id;
        state.currentChatId = actualChatId;
        await loadChats();
      }

      const identity = getCurrentOwnerIdentity();
      const messageData = {
        text,
        senderId: identity.uid || "",
        senderEmail: identity.email || "",
        senderRole: state.adminRole || "admin",
        senderName:
          state.currentOwnerRecord?.name ||
          state.currentOwnerRecord?.username ||
          state.currentAuthUser?.displayName ||
          state.currentAuthUser?.email ||
          "الإدارة",
        createdAt: getServerTimestamp(),
        isAdmin: true
      };

      await db.collection("chats").doc(actualChatId).collection("messages").add(messageData);
      await db.collection("chats").doc(actualChatId).update({
        lastMessage: text,
        updatedAt: getServerTimestamp()
      });

      if (input) input.value = "";
      showToast("تم إرسال الرسالة.", "success");
    } catch (error) {
      console.error("sendAdminMessage error:", error);
      showToast("تعذر إرسال الرسالة.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
  }

  function resetUploadPreview(prefix = "admin") {
    const preview = byId(`${prefix}-image-preview`) || byId(`${prefix}-photo-preview`);
    if (preview) {
      preview.src = "";
      preview.style.display = "none";
    }
  }

  function setUploadPreviewFromUrl(prefix = "admin", url = "") {
    const preview = byId(`${prefix}-image-preview`) || byId(`${prefix}-photo-preview`);
    if (preview && url) {
      preview.src = url;
      preview.style.display = "block";
    }
  }

  function clearMapCoords(prefix = "admin") {
    setValue("", `${prefix}-lat`, `${prefix}-latitude`);
    setValue("", `${prefix}-lng`, `${prefix}-longitude`);
  }

  function showMapPickedBadge(prefix = "admin") {
    const badge = byId(`${prefix}-map-picked-badge`) || byId(`${prefix}-map-badge`);
    if (badge) badge.classList.remove("hidden");
  }

  function hideMapPickedBadge(prefix = "admin") {
    const badge = byId(`${prefix}-map-picked-badge`) || byId(`${prefix}-map-badge`);
    if (badge) badge.classList.add("hidden");
  }

  function initMap(prefix = "admin", containerId = "admin-map-picker") {
    const el = byId(containerId);
    if (!el || !window.L) return;

    if (state.maps[prefix]) {
      state.maps[prefix].invalidateSize?.();
      return;
    }

    const map = window.L.map(containerId).setView([36.75, 3.05], 6);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap"
    }).addTo(map);

    state.maps[prefix] = map;
    const markerKey = `${prefix}Marker`;

    map.on("click", (e) => {
      const { lat, lng } = e.latlng;
      setValue(String(lat.toFixed(6)), `${prefix}-lat`, `${prefix}-latitude`);
      setValue(String(lng.toFixed(6)), `${prefix}-lng`, `${prefix}-longitude`);
      showMapPickedBadge(prefix);

      if (state.maps[markerKey]) {
        state.maps[markerKey].setLatLng([lat, lng]);
      } else {
        state.maps[markerKey] = window.L.marker([lat, lng], { draggable: true }).addTo(map);
        state.maps[markerKey].on("dragend", (ev) => {
          const pos = ev.target.getLatLng();
          setValue(String(pos.lat.toFixed(6)), `${prefix}-lat`, `${prefix}-latitude`);
          setValue(String(pos.lng.toFixed(6)), `${prefix}-lng`, `${prefix}-longitude`);
          showMapPickedBadge(prefix);
        });
      }
    });
  }

  function searchLocationOnMap(prefix = "admin") {
    const query = cleanText(getValue(`${prefix}-location-search`, `${prefix}-map-search`));
    if (!query) return showToast("أدخل اسم المنطقة للبحث.", "warning");
    if (!state.maps[prefix]) return showToast("الخريطة غير مُهيّأة بعد.", "warning");

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`)
      .then((r) => r.json())
      .then((results) => {
        if (!results.length) return showToast("لم يتم العثور على الموقع.", "warning");
        const { lat, lon, display_name } = results[0];
        const latNum = parseFloat(lat);
        const lngNum = parseFloat(lon);

        state.maps[prefix].setView([latNum, lngNum], 13);

        setValue(String(latNum.toFixed(6)), `${prefix}-lat`, `${prefix}-latitude`);
        setValue(String(lngNum.toFixed(6)), `${prefix}-lng`, `${prefix}-longitude`);
        showMapPickedBadge(prefix);

        const markerKey = `${prefix}Marker`;
        if (state.maps[markerKey]) {
          state.maps[markerKey].setLatLng([latNum, lngNum]);
        } else {
          state.maps[markerKey] = window.L.marker([latNum, lngNum], { draggable: true }).addTo(state.maps[prefix]);
          state.maps[markerKey].on("dragend", (ev) => {
            const pos = ev.target.getLatLng();
            setValue(String(pos.lat.toFixed(6)), `${prefix}-lat`, `${prefix}-latitude`);
            setValue(String(pos.lng.toFixed(6)), `${prefix}-lng`, `${prefix}-longitude`);
            showMapPickedBadge(prefix);
          });
        }

        showToast(`تم تحديد الموقع: ${display_name}`, "success");
      })
      .catch(() => showToast("تعذر البحث عن الموقع.", "error"));
  }

  async function uploadImageToCloudinary(file, prefix = "admin") {
    const CLOUD_NAME = "your_cloud_name";
    const UPLOAD_PRESET = "your_upload_preset";

    const preview = byId(`${prefix}-image-preview`) || byId(`${prefix}-photo-preview`);
    const btn = byId(`${prefix}-upload-btn`) || byId(`${prefix}-photo-upload-btn`);

    if (!file) return showToast("لم يتم اختيار ملف.", "warning");
    if (!file.type.startsWith("image/")) return showToast("يرجى اختيار ملف صورة.", "warning");
    if (file.size > 10 * 1024 * 1024) return showToast("حجم الملف أكبر من 10MB.", "warning");

    setButtonLoading(btn, true, "جارٍ رفع الصورة...");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      const url = cleanText(data.secure_url);

      setValue(url, `${prefix}-image-url`, `${prefix}-main-image`, `${prefix}-photo-url`);

      if (preview && url) {
        preview.src = url;
        preview.style.display = "block";
      }

      showToast("تم رفع الصورة بنجاح.", "success");
    } catch (error) {
      console.error("uploadImageToCloudinary error:", error);
      showToast("تعذر رفع الصورة.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function bindEvents() {
    document.addEventListener("click", (e) => {
      const target = e.target.closest("[data-tab-target], .nav-item[data-tab]");
      if (target) {
        const tab = target.dataset.tabTarget || target.dataset.tab;
        activateTab(tab);
        return;
      }
    });

    document.addEventListener("click", (e) => {
      const logoutBtn = e.target.closest("[data-logout], #admin-logout-btn, .logout-btn");
      if (logoutBtn) {
        logout();
        return;
      }
    });

    const loginForm = getLoginForm();
    if (loginForm) {
      loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const emailInput = getLoginUsernameElement();
        const passwordInput = getLoginPasswordElement();
        await login(emailInput?.value || "", passwordInput?.value || "");
      });
    }

    document.addEventListener("submit", async (e) => {
      if (e.target.matches("#add-property-form, [data-add-property-form]")) {
        await handleAddPropertySubmit(e);
      } else if (e.target.matches("#edit-property-form, [data-edit-property-form]")) {
        await handleEditPropertySubmit(e);
      } else if (e.target.matches("#owner-account-form, [data-owner-form]")) {
        await handleOwnerAccountSubmit(e);
      } else if (e.target.matches("#admin-chat-form, #chat-send-form, [data-chat-send-form]")) {
        await sendAdminMessage(e);
      }
    });

    document.addEventListener("click", (e) => {
      const editBtn = e.target.closest(".edit-property-btn");
      if (editBtn) {
        openEditPropertyModal(editBtn.dataset.id);
        return;
      }

      const toggleBtn = e.target.closest(".toggle-property-btn");
      if (toggleBtn) {
        const visibleNow = toggleBtn.dataset.visible === "1";
        togglePropertyVisibility(toggleBtn.dataset.id, visibleNow);
        return;
      }

      const deleteBtn = e.target.closest(".delete-property-btn");
      if (deleteBtn) {
        deleteProperty(deleteBtn.dataset.id);
        return;
      }

      const editOwnerBtn = e.target.closest(".edit-owner-btn");
      if (editOwnerBtn) {
        fillOwnerForm(editOwnerBtn.dataset.id);
        return;
      }

      const deleteOwnerBtn = e.target.closest(".delete-owner-btn");
      if (deleteOwnerBtn) {
        deleteOwnerAccount(deleteOwnerBtn.dataset.id);
        return;
      }

      const approveBtn = e.target.closest(".btn-approve");
      if (approveBtn && !approveBtn.disabled) {
        updateBookingStatus(approveBtn.dataset.bookingId, "confirmed");
        return;
      }

      const rejectBtn = e.target.closest(".btn-reject");
      if (rejectBtn && !rejectBtn.disabled) {
        updateBookingStatus(rejectBtn.dataset.bookingId, "rejected");
        return;
      }

      const chatBtn = e.target.closest(".btn-open-chat");
      if (chatBtn && !chatBtn.disabled) {
        const bookingId = chatBtn.dataset.bookingId;
        const booking = state.bookings.find((b) => b.id === bookingId);
        if (booking) {
          const existing = state.chats.find(
            (c) => cleanText(c.bookingId) === bookingId || cleanText(c.reservationId) === bookingId
          );
          activateTab("chats");
          if (existing) openChat(existing.id);
          else openChat(`booking-thread-${bookingId}`);
        }
        return;
      }

      const chatThread = e.target.closest(".chat-thread-item[data-chat-id]");
      if (chatThread) {
        openChat(chatThread.dataset.chatId);
        return;
      }

      const modalClose = e.target.closest("[data-modal-close], .modal-close-btn");
      if (modalClose) {
        const modal = modalClose.closest(".modal");
        closeModal(modal);
        return;
      }

      const modalOverlay = e.target.closest(".modal");
      if (modalOverlay && e.target === modalOverlay) {
        closeModal(modalOverlay);
        return;
      }

      const mapSearchBtn = e.target.closest("[data-map-search]");
      if (mapSearchBtn) {
        const prefix = mapSearchBtn.dataset.mapSearch || "admin";
        searchLocationOnMap(prefix);
        return;
      }
    });

    document.addEventListener("change", (e) => {
      const fileInput = e.target.closest("[data-upload-image]");
      if (fileInput && fileInput.files?.[0]) {
        const prefix = fileInput.dataset.uploadImage || "admin";
        uploadImageToCloudinary(fileInput.files[0], prefix);
        return;
      }

      const filterSelect = e.target.closest("[data-booking-filter]");
      if (filterSelect) {
        state.bookingFilter = cleanText(filterSelect.value) || "all";
        renderBookings();
        return;
      }
    });

    document.addEventListener("click", (e) => {
      const filterBtn = e.target.closest("[data-booking-filter]");
      if (filterBtn && filterBtn.tagName !== "SELECT") {
        state.bookingFilter = cleanText(filterBtn.dataset.bookingFilter) || "all";
        qa("[data-booking-filter]").forEach((btn) => {
          btn.classList.toggle("active", cleanText(btn.dataset.bookingFilter) === state.bookingFilter);
        });
        renderBookings();
        return;
      }
    });

    document.addEventListener("input", (e) => {
      if (
        e.target.matches(
          "#bookings-search, #booking-search, #properties-search, #property-search, #owners-search, #chats-search, #chat-search"
        )
      ) {
        const id = cleanText(e.target.id);
        if (id.includes("booking")) renderBookings();
        else if (id.includes("propert")) renderPropertiesTable();
        else if (id.includes("owner")) renderOwnerAccounts();
        else if (id.includes("chat")) renderChatThreads();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const modal = q(".modal.active");
        if (modal) closeModal(modal);
      }
    });
  }

  function bindAuthState() {
    if (!auth) {
      showFirebaseStatus();
      ensureLoggedInUI();
      return;
    }

    state.listeners.auth = auth.onAuthStateChanged(async (user) => {
      state.authReady = true;

      if (!user) {
        if (safeGet(ADMIN_SESSION_KEY) === "1") {
          clearAdminSessionState();
          ensureLoggedInUI();
          updateProfileUI();
          updateRoleBasedUI();
          showToast("انتهت جلستك. يرجى تسجيل الدخول مجدداً.", "warning");
        } else {
          ensureLoggedInUI();
        }
        return;
      }

      if (state.isLoggedIn && state.currentAuthUser?.uid === user.uid) return;

      const roleResult = await getAdminRoleFromFirestore(user);
      if (roleResult.ok) {
        await applyAuthorizedSession(user, roleResult);
      } else {
        clearAdminSessionState();
        ensureLoggedInUI();
        updateProfileUI();
        try {
          await auth.signOut();
        } catch {}
      }
    });
  }

  function init() {
    showFirebaseStatus();
    ensureLoggedInUI();
    updateProfileUI();
    updateRoleBasedUI();
    bindEvents();
    bindAuthState();

    setTimeout(() => {
      if (state.isLoggedIn) {
        activateTab(state.activeTab || "dashboard", { silentAuth: true });
      }
    }, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
