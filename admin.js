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
    return `تم قبول حجزك بنجاح. رقم الغرفة: ${roomNumber}`;
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

  function setLoginFeedback(message = "", type = "") {
    const status = byId("admin-login-status");
    if (status) {
      status.className = `login-status-text${type ? ` ${type}` : ""}`;
      status.textContent = message;
    }
  }

  function setLoginLoading(loading, message = "جارٍ تسجيل الدخول...") {
    const btn = byId("admin-login-btn");
    const emailInput = getLoginUsernameElement();
    const passwordInput = getLoginPasswordElement();

    if (typeof window.__setAdminLoginLoading === "function") {
      window.__setAdminLoginLoading(loading, loading ? message : "", loading ? "loading" : "");
      if (!loading && !message) setLoginFeedback("", "");
      return;
    }

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

  function getCurrentOwnerIdentity() {
    const owner = state.currentOwnerRecord || {};

    return {
      uid: cleanText(
        pickFirst(
          state.currentAuthUser?.uid,
          owner?.uid,
          owner?.ownerUid,
          owner?.userId
        )
      ),
      email: normalizeEmail(
        pickFirst(
          state.currentAuthUser?.email,
          owner?.email,
          owner?.ownerEmail,
          owner?.userEmail
        )
      ),
      ownerDocId: cleanText(
        pickFirst(
          state.ownerAccountDocId,
          owner?.id,
          owner?.docId,
          owner?.ownerDocId
        )
      ),
      username: cleanText(
        pickFirst(
          owner?.username,
          owner?.ownerUsername,
          owner?.login,
          owner?.userName
        )
      ).toLowerCase(),
      phone: cleanText(
        pickFirst(
          owner?.phone,
          owner?.ownerPhone,
          owner?.mobile,
          owner?.whatsapp
        )
      ),
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
    ].filter((v) => v !== "");

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
      pickFirst(
        chat?.ownerId,
        chat?.ownerUid,
        chat?.hostUid,
        chat?.adminId,
        deepGet(chat, "owner.uid")
      )
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
      ownerUsername: cleanText(
        pickFirst(
          raw?.ownerUsername,
          property?.ownerUsername,
          owner?.username
        )
      ),
      ownerPhone: cleanText(
        pickFirst(
          raw?.ownerPhone,
          property?.ownerPhone,
          owner?.phone
        )
      ),
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

    if (state.activeTab === "chats" && state.currentChatId) {
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
    await Promise.all([loadBookings(), loadUsers(), loadChats(), loadOwnerAccounts()]);
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
    setText(String(pending), "pending-bookings-count", "bookings-count-pending", "booking-count-pending", "pending-bookings-filter-count");
    setText(String(confirmed), "confirmed-bookings-count", "bookings-count-confirmed", "booking-count-confirmed", "confirmed-bookings-filter-count");
    setText(String(rejected), "rejected-bookings-count", "bookings-count-rejected", "booking-count-rejected", "rejected-bookings-filter-count");
    setText(String(state.users.length), "dashboard-users-count", "users-count");
    setText(String(state.bookings.length), "bookings-count-all", "booking-count-all", "all-bookings-count");

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
      const seen = new Set();

      function pushDoc(doc) {
        if (!doc || seen.has(doc.id)) return;
        seen.add(doc.id);
        items.push({ id: doc.id, ...doc.data() });
      }

      if (isSuperAdmin()) {
        const snap = await db.collection("properties").get();
        snap.forEach(pushDoc);
      } else {
        const current = getCurrentOwnerIdentity();
        const candidateQueries = [
          ["ownerUid", current.uid],
          ["ownerId", current.uid],
          ["hostUid", current.uid],
          ["userId", current.uid],
          ["ownerEmail", current.email],
          ["hostEmail", current.email],
          ["email", current.email],
          ["ownerAccountDocId", current.ownerDocId],
          ["ownerDocId", current.ownerDocId],
          ["ownerUsername", current.username],
          ["username", current.username],
          ["ownerPhone", current.phone],
          ["phone", current.phone]
        ].filter(([, value]) => cleanText(value));

        for (const [field, value] of candidateQueries) {
          try {
            const part = await db.collection("properties").where(field, "==", value).get();
            part.forEach(pushDoc);
          } catch (error) {
            logLookupWarning(`properties ${field} lookup failed:`, error);
          }
        }

        if (!items.length) {
          try {
            const fullSnap = await db.collection("properties").get();
            fullSnap.forEach(pushDoc);
          } catch (error) {
            console.warn("properties fallback full scan failed:", error);
          }
        }
      }

      let filtered = items;
      if (isOwnerAdmin()) {
        filtered = items.filter(propertyBelongsToCurrentOwner);
      }

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
          cleanText(prop.ownerUid),
          cleanText(prop.ownerId),
          cleanText(prop.hostUid),
          cleanText(prop.ownerAccountDocId),
          cleanText(prop.ownerUsername),
          cleanText(prop.ownerPhone)
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
          <td>${escapeHtml(formatPrice(prop.price || prop.pricePerNight || prop.basePrice || 0))}</td>
          <td>${visible ? '<span class="status-badge confirmed">ظاهر</span>' : '<span class="status-badge rejected">مخفي</span>'}</td>
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
              ` : ""}
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
      const current = getCurrentOwnerIdentity();
      payload.ownerUid = current.uid;
      payload.ownerId = current.uid;
      payload.hostUid = current.uid;
      payload.ownerAccountDocId = current.ownerDocId;
      payload.ownerDocId = current.ownerDocId;
      payload.ownerUsername = current.username;
      if (!payload.ownerEmail) payload.ownerEmail = current.email;
      if (!payload.ownerPhone) payload.ownerPhone = current.phone;
    }

    return payload;
  }

  function validatePropertyData(data) {
    if (!cleanText(data.titleAr || data.title)) return "اسم العقار مطلوب.";
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
      showToast("لا تملك صلاحية تعديل هذا العقار.", "error");
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
      showToast("تعذر تعديل حالة العقار.", "error");
    }
  }

  async function deleteProperty(id) {
    if (!firebaseReady) return;
    const prop = state.properties.find((p) => p.id === id);
    if (!prop || !canManageProperty(prop) || !isSuperAdmin()) {
      showToast("لا تملك صلاحية حذف هذا العقار.", "error");
      return;
    }

    const ok = window.confirm("هل تريد حذف هذا العقار؟");
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
    if (!canManageProperty(prop)) return showToast("لا تملك صلاحية تعديل هذا العقار.", "error");

    const modal = byId("edit-modal") || byId("edit-property-modal") || byId("property-edit-modal");
    if (!modal) return showToast("نافذة التعديل غير موجودة في الصفحة.", "warning");

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

    setUploadPreviewFromUrl("edit", prop.imageUrl || prop.mainImage);
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
    const modal = form.closest(".modal-overlay") || byId("edit-modal") || byId("edit-property-modal");
    const docId = modal?.dataset.editId;
    if (!docId) return showToast("معرّف العقار غير موجود.", "error");

    const prop = state.properties.find((p) => p.id === docId);
    if (!prop || !canManageProperty(prop)) return showToast("لا تملك صلاحية تعديل هذا العقار.", "error");

    const btn = form.querySelector('button[type="submit"]');
    const data = collectPropertyFormData("edit");
    const validation = validatePropertyData(data);
    if (validation) return showToast(validation, "warning");

    if (isOwnerAdmin()) {
      const current = getCurrentOwnerIdentity();
      data.ownerUid = current.uid;
      data.ownerId = current.uid;
      data.hostUid = current.uid;
      data.ownerAccountDocId = current.ownerDocId;
      data.ownerDocId = current.ownerDocId;
      data.ownerUsername = current.username;
      if (!data.ownerEmail) data.ownerEmail = current.email;
      if (!data.ownerPhone) data.ownerPhone = current.phone;
    }

    setButtonLoading(btn, true, "جارٍ حفظ التعديلات...");

    try {
      await db.collection("properties").doc(docId).update(data);
      closeModal(modal);
      await loadProperties();
      showToast("تم تحديث العقار بنجاح.", "success");
    } catch (error) {
      console.error("edit property error:", error);
      showToast("تعذر تحديث العقار.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  async function loadBookings() {
    const container = byId("bookings-container");
    if (container) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="ph ph-spinner-gap ph-spin"></i><div>جارٍ تحميل الحجوزات...</div></div>`;
    }

    try {
      const items = [];
      const seen = new Set();

      function pushBooking(doc) {
        if (!doc || seen.has(doc.id)) return;
        seen.add(doc.id);
        items.push(normalizeBooking({ id: doc.id, ...doc.data() }));
      }

      if (isSuperAdmin()) {
        let snap;
        try {
          snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
        } catch {
          snap = await db.collection("bookings").get();
        }
        snap.forEach(pushBooking);
      } else {
        const propertyIds = state.properties.map((p) => cleanText(p.id)).filter(Boolean);
        const current = getCurrentOwnerIdentity();

        for (const propertyId of propertyIds) {
          try {
            const part = await db.collection("bookings").where("propertyId", "==", propertyId).get();
            part.forEach(pushBooking);
          } catch (error) {
            logLookupWarning(`bookings propertyId lookup failed:`, error);
          }
        }

        const ownerQueries = [
          ["ownerUid", current.uid],
          ["ownerId", current.uid],
          ["hostUid", current.uid],
          ["propertyOwnerUid", current.uid],
          ["ownerEmail", current.email],
          ["hostEmail", current.email],
          ["propertyOwnerEmail", current.email],
          ["ownerAccountDocId", current.ownerDocId],
          ["ownerDocId", current.ownerDocId]
        ].filter(([, value]) => cleanText(value));

        for (const [field, value] of ownerQueries) {
          try {
            const part = await db.collection("bookings").where(field, "==", value).get();
            part.forEach(pushBooking);
          } catch (error) {
            logLookupWarning(`bookings ${field} lookup failed:`, error);
          }
        }

        if (!items.length) {
          try {
            const allSnap = await db.collection("bookings").get();
            allSnap.forEach(pushBooking);
          } catch (error) {
            console.warn("bookings fallback full scan failed:", error);
          }
        }
      }

      state.bookings = sortByCreatedDesc(items.filter(canAccessBooking));
      renderBookings();
      renderDashboardStats();
    } catch (error) {
      console.error("loadBookings error:", error);
      if (container) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><i class="ph ph-warning-circle"></i><div>فشل تحميل الحجوزات.</div></div>`;
      }
      showToast("تعذر تحميل الحجوزات.", "error");
    }
  }

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
          deepGet(b, "guest.fullName"),
          deepGet(b, "guest.email"),
          deepGet(b, "guest.phone"),
          deepGet(b, "stay.checkIn"),
          deepGet(b, "stay.checkOut")
        ].join(" ").toLowerCase();
        return hay.includes(query);
      });
    }

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

      return `
        <div class="booking-card" data-status="${escapeHtml(status)}">
          <div class="booking-head">
            <div class="booking-title">
              <strong>${escapeHtml(title)}</strong>
              <span>${escapeHtml(reference)}</span>
            </div>
            ${statusBadge(status)}
          </div>

          <div class="booking-meta-grid">
            <div class="booking-meta-item">
              <label>الضيف</label>
              <strong>${escapeHtml(guest)}</strong>
            </div>
            <div class="booking-meta-item">
              <label>البريد</label>
              <span>${escapeHtml(email)}</span>
            </div>
            <div class="booking-meta-item">
              <label>الهاتف</label>
              <span>${escapeHtml(phone)}</span>
            </div>
            <div class="booking-meta-item">
              <label>السعر</label>
              <strong>${escapeHtml(formatPrice(total))}</strong>
            </div>
            <div class="booking-meta-item">
              <label>تاريخ الدخول</label>
              <span>${escapeHtml(checkIn)}</span>
            </div>
            <div class="booking-meta-item">
              <label>تاريخ الخروج</label>
              <span>${escapeHtml(checkOut)}</span>
            </div>
            <div class="booking-meta-item" style="grid-column:1/-1;">
              <label>تاريخ الإنشاء</label>
              <span>${escapeHtml(formatDate(booking.createdAt || booking.timestamp || booking.dateCreated))}</span>
            </div>
          </div>

          <div class="booking-actions-row">
            <button type="button" class="btn-approve" data-booking-id="${escapeHtml(booking.id)}" ${status === "confirmed" ? "disabled" : ""}>
              <i class="ph ph-check"></i> قبول
            </button>
            <button type="button" class="btn-reject" data-booking-id="${escapeHtml(booking.id)}" ${status === "rejected" ? "disabled" : ""}>
              <i class="ph ph-x"></i> رفض
            </button>
            <button type="button" class="btn-open-chat" data-booking-id="${escapeHtml(booking.id)}" ${canOpenChat ? "" : "disabled"}>
              <i class="ph ph-chat-centered-text"></i> فتح المحادثة
            </button>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = "";
    container.appendChild(grid);
  }

  async function updateBookingStatus(id, status) {
    const booking = state.bookings.find((b) => b.id === id);
    if (!booking || !canAccessBooking(booking)) {
      showToast("لا تملك صلاحية تعديل هذا الحجز.", "error");
      return;
    }

    try {
      const payload = {
        status,
        updatedAt: getServerTimestamp()
      };

      if (status === "confirmed" && !booking.roomNumber) {
        const roomNumber = getRandomRoomNumber();
        payload.roomNumber = roomNumber;
        payload.approvalReply = getAutoApprovalMessage(roomNumber);
      }

      if (status === "rejected") {
        payload.rejectReason = booking.rejectReason || "تم رفض الحجز من طرف الإدارة";
      }

      await db.collection("bookings").doc(id).update(payload);
      showToast(`تم تحديث حالة الحجز إلى ${statusLabel(status)}.`, "success");
      await loadBookings();
    } catch (error) {
      console.error("updateBookingStatus error:", error);
      showToast("تعذر تحديث حالة الحجز.", "error");
    }
  }

  async function loadOwnerAccounts() {
    const tbody = byId("owner-accounts-tbody") || byId("owners-tbody") || byId("owner-table-body") || byId("accounts-tbody");
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;">جارٍ تحميل حسابات المُلّاك...</td></tr>`;
    }

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
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="99" style="text-align:center;padding:22px;color:#ef4444;">فشل تحميل حسابات المُلّاك.</td></tr>`;
      }
      showToast("تعذر تحميل حسابات المُلّاك.", "error");
    }
  }

  function renderOwnerAccounts() {
    const tbody = byId("owner-accounts-tbody") || byId("owners-tbody") || byId("owner-table-body") || byId("accounts-tbody");
    if (!tbody) return;

    const query = cleanText(getValue("owners-search", "owner-search")).toLowerCase();
    let rows = [...state.ownerAccounts];

    if (query) {
      rows = rows.filter((item) =>
        [
          item.id,
          item.name,
          item.fullName,
          item.ownerName,
          item.email,
          item.phone,
          item.username,
          item.propertyName,
          item.propertyId
        ].join(" ").toLowerCase().includes(query)
      );
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
          <td>${active ? '<span class="status-badge confirmed">نشط</span>' : '<span class="status-badge rejected">معطل</span>'}</td>
          <td>
            <div class="table-actions">
              <button type="button" class="edit-owner-btn" data-id="${escapeHtml(item.id)}">
                <i class="ph ph-pencil-simple"></i> تعديل
              </button>
              ${isSuperAdmin() ? `
                <button type="button" class="delete-owner-btn" data-id="${escapeHtml(item.id)}">
                  <i class="ph ph-trash"></i> حذف
                </button>
              ` : ""}
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
    if (!isSuperAdmin() && !isOwnerAdmin()) return showToast("لا تملك صلاحية تعديل المُلّاك.", "error");

    const form = e.currentTarget;
    const btn = form.querySelector('button[type="submit"]');
    const editId = form.dataset.editId;
    const data = collectOwnerFormData("owner");

    if (!data.name || !data.email) return showToast("الاسم والبريد الإلكتروني مطلوبان.", "warning");
    if (!isSuperAdmin() && editId && editId !== state.ownerAccountDocId) return showToast("لا تملك صلاحية تعديل هذا الحساب.", "error");

    setButtonLoading(btn, true, editId ? "جارٍ حفظ التعديلات..." : "جارٍ إنشاء الحساب...");

    try {
      const collectionName = "ownerAccounts";
      if (editId) {
        await db.collection(collectionName).doc(editId).update(data);
        showToast("تم تحديث الحساب بنجاح.", "success");
      } else {
        if (!isSuperAdmin()) {
          showToast("إنشاء حسابات جديدة متاح للأدمن العام فقط.", "error");
          return;
        }
        data.createdAt = getServerTimestamp();
        await db.collection(collectionName).add(data);
        showToast("تم إنشاء الحساب بنجاح.", "success");
      }

      form.reset();
      delete form.dataset.editId;
      await loadOwnerAccounts();
    } catch (error) {
      console.error("owner form error:", error);
      showToast("تعذر حفظ بيانات المالك.", "error");
    } finally {
      setButtonLoading(btn, false);
    }
  }

  function fillOwnerForm(id) {
    const item = state.ownerAccounts.find((x) => x.id === id);
    if (!item) return;

    if (!isSuperAdmin() && id !== state.ownerAccountDocId) {
      showToast("لا تملك صلاحية تعديل هذا الحساب.", "error");
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
      showToast("الحذف متاح للأدمن العام فقط.", "error");
      return;
    }

    if (!window.confirm("هل تريد حذف هذا الحساب؟")) return;

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
        snap.forEach((doc) => items.push(normalizeUser({ ...doc.data() }, doc.id)));
      }
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

      state.listeners.chats = queryRef.onSnapshot(
        (snap) => {
          const items = [];
          snap.forEach((doc) => items.push(normalizeChat({ ...doc.data() }, doc.id)));

          const bookingDerivedThreads = derivePseudoChatsFromBookings();
          const merged = mergeChats(items, bookingDerivedThreads)
            .filter((chat) => isSuperAdmin() || canAccessChat(chat) || chat.pseudo);

          state.chats = sortByUpdatedDesc(merged);
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
        },
        (error) => {
          console.error("loadChats listener error:", error);
          const fallback = derivePseudoChatsFromBookings();
          state.chats = fallback.filter((chat) => isSuperAdmin() || canAccessChat(chat) || chat.pseudo);
          renderChatThreads();
        }
      );
    } catch (error) {
      console.error("loadChats error:", error);
      state.chats = derivePseudoChatsFromBookings().filter((chat) => isSuperAdmin() || canAccessChat(chat) || chat.pseudo);
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
        ].join(" ").toLowerCase().includes(query)
      );
    }

    if (!rows.length) {
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-centered-dots"></i><div>لا توجد محادثات حالياً.</div></div>`;
      return;
    }

    list.innerHTML = rows.map((chat) => {
      const name = cleanText(chat.userName || chat.customerName || chat.name || chat.userEmail || chat.id);
      const subtitle = cleanText(chat.lastMessage || chat.lastText || "بدون رسائل");
      const isActive = state.currentChatId === chat.id;
      const smallMeta = cleanText(chat.propertyTitle || chat.bookingId);

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
        text: `حجز جديد من ${booking.guestName || "ضيف"} للعقار ${booking.propertyTitle || "غير محدد"} من ${booking.checkIn || "—"} إلى ${booking.checkOut || "—"}.`,
        senderRole: "system",
        senderName: "النظام",
        createdAt: booking.createdAt || new Date().toISOString()
      }
    ];

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
      list.innerHTML = `<div class="empty-state"><i class="ph ph-chat-centered-dots"></i><div>لا توجد رسائل في هذه المحادثة.</div></div>`;
      return;
    }

    list.innerHTML = state.currentChatMessages.map((msg) => {
      const mine = ["admin", "owner", "host", "support"].includes(cleanText(msg.senderRole).toLowerCase());
      const text = cleanText(pickFirst(msg.text, msg.message, msg.body, msg.content));
      const sender = cleanText(pickFirst(msg.senderName, msg.name, msg.senderRole, mine ? "الإدارة" : "العميل"));
      const date = formatDate(pickFirst(msg.createdAt, msg.timestamp, msg.sentAt));

      return `
        <div class="chat-bubble ${mine ? "mine" : "theirs"}" style="background:${mine ? "#dbeafe" : "#f8fafc"};border:1px solid ${mine ? "#93c5fd" : "#e2e8f0"};border-radius:16px;padding:12px 14px;margin-bottom:10px;">
          <div style="font-weight:700;margin-bottom:6px;">${escapeHtml(sender)}</div>
          <div style="line-height:1.8">${escapeHtml(text)}</div>
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
        (booking.id && chat.bookingId === booking.id) ||
        (booking.userId && chat.userId === booking.userId) ||
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
          return normalizeChat({ ...doc.data() }, doc.id);
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
      showToast("لا تملك صلاحية الوصول لهذه المحادثة.", "error");
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
      ownerUid: booking.ownerUid || cleanText(state.currentAuthUser?.uid),
      ownerEmail: booking.ownerEmail || normalizeEmail(state.currentAuthUser?.email),
      ownerAccountDocId: booking.ownerAccountDocId || cleanText(state.ownerAccountDocId),
      participants: [booking.userId, booking.guestEmail, cleanText(state.currentAuthUser?.uid)].filter(Boolean),
      participantIds: [booking.userId, booking.guestEmail, cleanText(state.currentAuthUser?.uid)].filter(Boolean),
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
      showToast("لا تملك صلاحية فتح هذه المحادثة.", "error");
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
    const input = form.querySelector("textarea, input[type='text']");
    const text = cleanText(input?.value);
    if (!text) return;

    const btn = form.querySelector("button[type='submit']");
    setButtonLoading(btn, true, "جارٍ الإرسال...");

    try {
      let actualChatId = state.currentChatId;

      if (actualChatId.startsWith("booking-thread-")) {
        const bookingId = actualChatId.replace("booking-thread-", "");
        const createdChatId = await createRealChatFromBooking(bookingId);
        if (!createdChatId) {
          showToast("تعذر إنشاء المحادثة الفعلية.", "warning");
          return;
        }
        actualChatId = createdChatId;
        state.currentChatId = actualChatId;
        activateTab("chats");
        openChat(actualChatId);
      }

      const chat = state.chats.find((c) => c.id === actualChatId);
      if (chat && !chat.pseudo && !canAccessChat(chat)) {
        showToast("لا تملك صلاحية إرسال رسالة في هذه المحادثة.", "error");
        return;
      }

      const chatRef = db.collection("chats").doc(actualChatId);
      const payload = {
        text,
        message: text,
        senderRole: isSuperAdmin() ? "admin" : "owner",
        senderName: isSuperAdmin() ? "الإدارة" : "المالك",
        createdAt: getServerTimestamp()
      };

      try {
        await chatRef.collection("messages").add(payload);
      } catch {
        await db.collection("messages").add({
          ...payload,
          chatId: actualChatId,
          propertyId: cleanText(chat?.propertyId),
          userId: cleanText(chat?.userId)
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
    if (name) name.textContent = "الصورة الحالية";
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
    if (!query) return showToast("أدخل اسم المكان أولاً.", "warning");

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();

      if (!Array.isArray(data) || !data.length) {
        showToast("لم يتم العثور على الموقع.", "warning");
        return;
      }

      const item = data[0];
      const lat = Number(item.lat);
      const lng = Number(item.lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        showToast("إحداثيات الموقع غير صالحة.", "error");
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

  async function handleLoginSubmit(e) {
    if (e?.preventDefault) e.preventDefault();

    const username = cleanText(
      getLoginUsernameElement()?.value ||
      getValue("admin-login-email", "admin-username", "admin-user", "login-username", "username", "email")
    );

    const password = cleanText(
      getLoginPasswordElement()?.value ||
      getValue("admin-login-password", "admin-password", "admin-pass", "login-password", "password")
    );

    setLoginLoading(true, "جارٍ تسجيل الدخول...");

    try {
      const ok = await login(username, password);
      if (!ok) setLoginLoading(false, "");
    } catch (error) {
      console.error("handleLoginSubmit error:", error);
      setLoginFeedback("حدث خطأ أثناء تسجيل الدخول.", "error");
      setLoginLoading(false, "");
    }
  }

  function bindStaticEvents() {
    const loginForm = getLoginForm();
    if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);

    byId("admin-login-btn")?.addEventListener("click", handleLoginSubmit);
    byId("login-btn")?.addEventListener("click", handleLoginSubmit);

    getLoginUsernameElement()?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });

    getLoginPasswordElement()?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLoginSubmit(e);
    });

    getLoginUsernameElement()?.addEventListener("input", () => {
      const status = byId("admin-login-status");
      if (status && status.classList.contains("error")) setLoginFeedback("", "");
    });

    getLoginPasswordElement()?.addEventListener("input", () => {
      const status = byId("admin-login-status");
      if (status && status.classList.contains("error")) setLoginFeedback("", "");
    });

    byId("admin-logout-btn")?.addEventListener("click", logout);
    byId("logout-btn")?.addEventListener("click", logout);

    qa("[data-tab-target]").forEach((btn) => {
      btn.addEventListener("click", () => activateTab(btn.dataset.tabTarget));
    });

    byId("add-property-form")?.addEventListener("submit", handleAddPropertySubmit);
    byId("admin-property-form")?.addEventListener("submit", handleAddPropertySubmit);
    byId("edit-property-form")?.addEventListener("submit", handleEditPropertySubmit);
    byId("property-edit-form")?.addEventListener("submit", handleEditPropertySubmit);
    byId("owner-account-form")?.addEventListener("submit", handleOwnerFormSubmit);
    byId("owner-form")?.addEventListener("submit", handleOwnerFormSubmit);
    byId("admin-chat-send-form")?.addEventListener("submit", sendAdminMessage);
    byId("chat-send-form")?.addEventListener("submit", sendAdminMessage);

    ["properties-search", "property-search", "properties-search-input"].forEach((id) => {
      byId(id)?.addEventListener("input", renderPropertiesTable);
    });

    ["bookings-search", "booking-search"].forEach((id) => {
      byId(id)?.addEventListener("input", renderBookings);
    });

    ["owners-search", "owner-search"].forEach((id) => {
      byId(id)?.addEventListener("input", renderOwnerAccounts);
    });

    ["chats-search", "chat-search"].forEach((id) => {
      byId(id)?.addEventListener("input", renderChatThreads);
    });

    qa("[data-booking-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.bookingFilter = cleanText(btn.dataset.bookingFilter || "all");
        qa("[data-booking-filter]").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        renderBookings();
      });
    });

    ["admin-image-file", "edit-image-file"].forEach((id) =>
      byId(id)?.addEventListener("change", (e) => {
        const prefix = id.startsWith("edit") ? "edit" : "admin";
        const file = e.target?.files?.[0];
        setUploadPreviewFromFile(prefix, file);
      })
    );

    ["admin-image-url", "edit-image-url"].forEach((id) =>
      byId(id)?.addEventListener("input", (e) => {
        const prefix = id.startsWith("edit") ? "edit" : "admin";
        setUploadPreviewFromUrl(prefix, e.target?.value);
      })
    );

    ["admin-map-search-btn", "edit-map-search-btn"].forEach((id) =>
      byId(id)?.addEventListener("click", () => {
        const prefix = id.startsWith("edit") ? "edit" : "admin";
        searchLocationOnMap(prefix);
      })
    );

    ["admin-map-search", "edit-map-search"].forEach((id) =>
      byId(id)?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const prefix = id.startsWith("edit") ? "edit" : "admin";
          searchLocationOnMap(prefix);
        }
      })
    );

    ["admin-lat", "admin-lng", "edit-lat", "edit-lng"].forEach((id) =>
      byId(id)?.addEventListener("input", () => {
        const prefix = id.startsWith("edit") ? "edit" : "admin";
        updateMapMarkerFromInputs(prefix);
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

      const closeModalBtn = e.target.closest("[data-close-modal], .modal-close, .close-modal");
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
    if (!auth || typeof auth.onAuthStateChanged !== "function") return;

    state.listeners.auth = auth.onAuthStateChanged(async (user) => {
      state.authReady = true;
      state.currentAuthUser = user || null;

      if (!user) {
        state.isLoggedIn = false;
        ensureLoggedInUI();
        updateProfileUI();
        return;
      }

      const roleResult = await getAdminRoleFromFirestore(user);
      if (roleResult.ok) {
        state.adminRole = roleResult.role;
        state.currentOwnerRecord = roleResult.ownerData || roleResult.userData || null;
        safeSet(ADMIN_ROLE_KEY, roleResult.role);

        if (roleResult.ownerDocId) {
          state.ownerAccountDocId = roleResult.ownerDocId;
          safeSet(ADMIN_OWNER_DOC_KEY, roleResult.ownerDocId);
        }

        state.isLoggedIn = true;
        ensureLoggedInUI();
        updateProfileUI();
        updateRoleBasedUI();

        if (safeGet(ADMIN_SESSION_KEY) === "1") {
          await loadAllData();
        }
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
    renderChatThreads();
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
