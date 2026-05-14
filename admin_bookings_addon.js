// =========================================
// admin_bookings_addon.js
// Production-ready addon for admin.js
// Real Firestore data + hardened booking status logic
// =========================================

(function () {
  "use strict";

  const g = typeof globalThis !== "undefined" ? globalThis : window;

  const COLLECTIONS = {
    bookings: "bookings",
    chats: "chats",
    users: "users"
  };

  const STATUS_META = {
    pending: {
      label: "قيد الانتظار",
      className: "pending",
      bg: "#fef3c7",
      color: "#d97706",
      icon: "ph-hourglass-medium"
    },
    confirmed: {
      label: "مؤكد",
      className: "confirmed",
      bg: "#ecfdf5",
      color: "#059669",
      icon: "ph-check-circle"
    },
    cancelled: {
      label: "ملغي",
      className: "rejected",
      bg: "#ffe4e6",
      color: "#e11d48",
      icon: "ph-x-circle"
    },
    rejected: {
      label: "مرفوض",
      className: "rejected",
      bg: "#ffe4e6",
      color: "#e11d48",
      icon: "ph-x-circle"
    }
  };

  const BOOKING_STATUS_LOCKS =
    g.BOOKING_STATUS_LOCKS instanceof Set ? g.BOOKING_STATUS_LOCKS : new Set();

  const FIELD_CANDIDATES = {
    guestId: ["guestId", "userId", "uid", "customerId", "clientId"],
    guestName: ["guestName", "customerName", "fullName", "name", "billingName"],
    guestEmail: ["guestEmail", "email", "billingEmail", "contactEmail"],
    guestPhone: ["guestPhone", "phone", "guestWhatsapp", "billingPhone", "contactPhone"],
    propertyId: ["propertyId", "propId", "propertyDocId", "property_id", "listingId", "listing_id"],
    propertyTitle: ["propertyTitle", "propertyName", "listingTitle", "title"],
    propertyImage: ["propertyImage", "propertyImageUrl", "imageUrl", "image"],
    checkIn: ["checkInDate", "checkIn", "arrivalDate", "arrival_date"],
    checkOut: ["checkOutDate", "checkOut", "departureDate", "departure_date"],
    totalPrice: ["totalPrice", "finalTotal", "amount", "price", "basePrice"],
    receiptUrl: ["receiptUrl", "paymentReceiptUrl", "transferReceiptUrl"],
    paymentMethod: ["paymentMethod", "payment_method"],
    notes: ["specialRequests", "notes", "addonNotes", "medicalNotes"],
    arrivalTime: ["arrivalTime", "arrival_time", "expectedArrivalTime"],
    bedConfig: ["bedConfig", "bedType", "preferredBed"],
    nights: ["nights", "nightCount"],
    adults: ["adults", "guestAdults"],
    children: ["children", "guestChildren"],
    infants: ["infants", "guestInfants"],
    rooms: ["rooms", "roomCount"],
    guests: ["guests", "guestCount"]
  };

  function getDbSafe() {
    return g.db || null;
  }

  function getFirebaseSafe() {
    return g.firebase || null;
  }

  function serverTimestamp() {
    const firebaseObj = getFirebaseSafe();
    return firebaseObj?.firestore?.FieldValue?.serverTimestamp
      ? firebaseObj.firestore.FieldValue.serverTimestamp()
      : new Date();
  }

  function incrementBy(value) {
    const firebaseObj = getFirebaseSafe();
    return firebaseObj?.firestore?.FieldValue?.increment
      ? firebaseObj.firestore.FieldValue.increment(value)
      : value;
  }

  function normalizeText(value) {
    if (typeof g.normalizeText === "function" && g.normalizeText !== normalizeText) {
      return g.normalizeText(value);
    }
    return String(value ?? "").trim();
  }

  function escapeHtml(value) {
    if (typeof g.escapeHtml === "function" && g.escapeHtml !== escapeHtml) {
      return g.escapeHtml(value);
    }
    return String(value ?? "").replace(/[&<>"']/g, ch => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };
      return map[ch];
    });
  }

  function safeText(value, fallback = "—") {
    const txt = normalizeText(value);
    return txt ? escapeHtml(txt) : fallback;
  }

  function safeNumber(value, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function safeUrl(value) {
    const raw = normalizeText(value);
    if (!raw) return "";
    try {
      const url = new URL(raw, g.location?.origin || "http://localhost");
      if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch (_) {}
    return "";
  }

  function toTimestampMs(value) {
    try {
      if (!value) return 0;
      if (typeof value?.toDate === "function") {
        const d = value.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
      }
      if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? 0 : value.getTime();
      }
      if (typeof value === "number" || typeof value === "string") {
        const d = new Date(value);
        return Number.isNaN(d.getTime()) ? 0 : d.getTime();
      }
    } catch (_) {}
    return 0;
  }

  function formatDateField(dateField) {
    if (typeof g.formatDate === "function") {
      try {
        const out = g.formatDate(dateField);
        if (out) return escapeHtml(out);
      } catch (_) {}
    }

    try {
      if (!dateField) return "—";
      if (typeof dateField === "string") {
        const raw = dateField.trim();
        if (!raw) return "—";
        const parsed = new Date(raw);
        return !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString("ar-DZ") : escapeHtml(raw);
      }
      if (dateField instanceof Date) {
        return Number.isNaN(dateField.getTime()) ? "—" : dateField.toLocaleDateString("ar-DZ");
      }
      if (typeof dateField?.toDate === "function") {
        const d = dateField.toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("ar-DZ") : "—";
      }
      if (typeof dateField === "number") {
        const d = new Date(dateField);
        return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-DZ");
      }
    } catch (_) {}
    return "—";
  }

  function formatDateTimeField(dateField) {
    if (typeof g.formatDateTime === "function") {
      try {
        const out = g.formatDateTime(dateField);
        if (out) return escapeHtml(out);
      } catch (_) {}
    }

    try {
      if (!dateField) return "—";
      let d = null;
      if (typeof dateField?.toDate === "function") d = dateField.toDate();
      else if (dateField instanceof Date) d = dateField;
      else if (typeof dateField === "number" || typeof dateField === "string") d = new Date(dateField);
      if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
      return `${d.toLocaleDateString("ar-DZ")} ${d.toLocaleTimeString("ar-DZ", {
        hour: "2-digit",
        minute: "2-digit"
      })}`;
    } catch (_) {
      return "—";
    }
  }

  function formatMoney(value, suffix = "DZD") {
    if (typeof g.formatCurrency === "function") {
      try {
        return g.formatCurrency(value);
      } catch (_) {}
    }
    return `${safeNumber(value, 0).toLocaleString("en-US")} ${suffix}`;
  }

  function getField(source, candidates = [], fallback = "") {
    for (const key of candidates) {
      const value = source?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return fallback;
  }

  function translateAddon(key) {
    const dict = {
      wifi: "واي فاي",
      parking: "موقف سيارات",
      airportTransfer: "نقل مطار",
      spa: "سبا",
      lateCheckout: "مغادرة متأخرة",
      extraBed: "سرير إضافي",
      events: "فعاليات",
      restaurant: "المطعم",
      breakfast: "فطور",
      breakfastIncluded: "فطور",
      babyCrib: "سرير أطفال",
      highChair: "كرسي أطفال",
      accessibleRoom: "غرفة مهيأة",
      earlyCheckin: "دخول مبكر"
    };
    return dict[key] || normalizeText(key) || "غير محدد";
  }

  function translatePlan(plan) {
    const dict = {
      breakfast: "إفطار",
      halfboard: "نصف إقامة",
      fullboard: "إقامة كاملة"
    };
    return dict[plan] || normalizeText(plan) || "غير محددة";
  }

  function translateBed(bed) {
    const dict = {
      double: "مزدوج",
      twin: "سريران",
      king: "كينج",
      single: "فردي"
    };
    return dict[bed] || normalizeText(bed) || "غير محدد";
  }

  function getStatusMeta(status) {
    if (typeof g.getStatusMeta === "function" && g.getStatusMeta !== getStatusMeta) {
      try {
        const external = g.getStatusMeta(status);
        if (external && typeof external === "object") return external;
      } catch (_) {}
    }

    return STATUS_META[status] || {
      label: normalizeText(status) || "غير معروف",
      className: "pending",
      bg: "#e2e8f0",
      color: "#475569",
      icon: "ph-info"
    };
  }

  function getBookingGuestId(booking) {
    if (typeof g.getBookingGuestId === "function" && g.getBookingGuestId !== getBookingGuestId) {
      return normalizeText(g.getBookingGuestId(booking));
    }
    return normalizeText(getField(booking, FIELD_CANDIDATES.guestId, ""));
  }

  function getBookingPropertyId(booking) {
    if (typeof g.getBookingPropertyId === "function" && g.getBookingPropertyId !== getBookingPropertyId) {
      return normalizeText(g.getBookingPropertyId(booking));
    }
    return normalizeText(getField(booking, FIELD_CANDIDATES.propertyId, ""));
  }

  function getBookingGuestName(booking) {
    if (typeof g.getBookingGuestName === "function" && g.getBookingGuestName !== getBookingGuestName) {
      return normalizeText(g.getBookingGuestName(booking));
    }

    const direct = normalizeText(getField(booking, FIELD_CANDIDATES.guestName, ""));
    if (direct) return direct;

    const first = normalizeText(booking?.guestNameFirst || booking?.firstName || booking?.givenName || "");
    const father = normalizeText(booking?.guestFatherName || booking?.fatherName || "");
    const family = normalizeText(booking?.guestFamilyName || booking?.lastName || booking?.familyName || "");
    return [first, father, family].filter(Boolean).join(" ").trim() || "غير معروف";
  }

  function getBookingEmail(booking) {
    if (typeof g.getBookingEmail === "function" && g.getBookingEmail !== getBookingEmail) {
      return normalizeText(g.getBookingEmail(booking));
    }
    return normalizeText(getField(booking, FIELD_CANDIDATES.guestEmail, ""));
  }

  function getBookingPhone(booking) {
    if (typeof g.getBookingPhone === "function" && g.getBookingPhone !== getBookingPhone) {
      return normalizeText(g.getBookingPhone(booking));
    }
    return normalizeText(getField(booking, FIELD_CANDIDATES.guestPhone, ""));
  }

  function getBookingAddonsList(booking) {
    if (typeof g.getBookingAddons === "function") {
      try {
        const ext = g.getBookingAddons(booking);
        if (Array.isArray(ext)) return ext;
      } catch (_) {}
    }

    if (typeof g.getBookingAddonsList === "function" && g.getBookingAddonsList !== getBookingAddonsList) {
      try {
        const ext = g.getBookingAddonsList(booking);
        if (Array.isArray(ext)) return ext;
      } catch (_) {}
    }

    if (Array.isArray(booking?.selectedAddons)) return booking.selectedAddons;

    if (booking?.addons && typeof booking.addons === "object") {
      const direct = Object.keys(booking.addons).filter(key => booking.addons[key] === true);
      if (direct.length) return direct;
    }

    const derived = [];
    if (String(booking?.breakfastOption || "").toLowerCase() === "yes") derived.push("breakfast");
    if (String(booking?.airportTransfer || "").toLowerCase() !== "no" && String(booking?.airportTransfer || "").trim()) derived.push("airportTransfer");
    if (String(booking?.parkingNeeded || "").toLowerCase() !== "no" && String(booking?.parkingNeeded || "").trim()) derived.push("parking");
    if (String(booking?.lateCheckout || "").toLowerCase() === "yes") derived.push("lateCheckout");
    if (String(booking?.earlyCheckin || "").toLowerCase() === "yes") derived.push("earlyCheckin");
    if (String(booking?.babyCrib || "").toLowerCase() === "yes") derived.push("babyCrib");
    if (String(booking?.highChair || "").toLowerCase() === "yes") derived.push("highChair");
    if (String(booking?.accessibleRoom || "").toLowerCase() !== "no" && String(booking?.accessibleRoom || "").trim()) derived.push("accessibleRoom");

    return derived;
  }

  function calculateLoyaltyPoints(booking) {
    if (typeof g.calculateLoyaltyPoints === "function" && g.calculateLoyaltyPoints !== calculateLoyaltyPoints) {
      try {
        const points = Number(g.calculateLoyaltyPoints(booking));
        if (Number.isFinite(points)) return Math.max(0, Math.floor(points));
      } catch (_) {}
    }

    const totalPrice = safeNumber(
      getField(booking, FIELD_CANDIDATES.totalPrice, booking?.basePrice),
      0
    );

    return Math.max(0, Math.floor(totalPrice / 500));
  }

  function buildBookingSummaryMeta(booking) {
    const addons = getBookingAddonsList(booking).map(key => {
      if (key === "restaurant" && booking?.restaurantPlan) {
        return `${translateAddon(key)} (${translatePlan(booking.restaurantPlan)})`;
      }
      if (key === "restaurant" && booking?.addons?.restaurantPlan) {
        return `${translateAddon(key)} (${translatePlan(booking.addons.restaurantPlan)})`;
      }
      return translateAddon(key);
    });

    return {
      guestName: safeText(getBookingGuestName(booking) || "غير معروف"),
      guestEmail: safeText(getBookingEmail(booking)),
      guestPhone: safeText(getBookingPhone(booking)),
      propertyTitle: safeText(getField(booking, FIELD_CANDIDATES.propertyTitle)),
      propertyImage: safeUrl(getField(booking, FIELD_CANDIDATES.propertyImage)),
      totalPriceText: formatMoney(getField(booking, FIELD_CANDIDATES.totalPrice, 0)),
      checkInText: formatDateField(getField(booking, FIELD_CANDIDATES.checkIn)),
      checkOutText: formatDateField(getField(booking, FIELD_CANDIDATES.checkOut)),
      createdAtText: formatDateTimeField(booking?.createdAt),
      updatedAtText: formatDateTimeField(booking?.updatedAt),
      status: getStatusMeta(booking?.status),
      addonsText: addons.join("، "),
      arrivalTime: safeText(getField(booking, FIELD_CANDIDATES.arrivalTime)),
      notes: safeText(getField(booking, FIELD_CANDIDATES.notes)),
      bedText: translateBed(getField(booking, FIELD_CANDIDATES.bedConfig)),
      nights: safeNumber(getField(booking, FIELD_CANDIDATES.nights, 0), 0),
      adults: safeNumber(getField(booking, FIELD_CANDIDATES.adults, 0), 0),
      children: safeNumber(getField(booking, FIELD_CANDIDATES.children, 0), 0),
      infants: safeNumber(getField(booking, FIELD_CANDIDATES.infants, 0), 0),
      rooms: safeNumber(getField(booking, FIELD_CANDIDATES.rooms, 0), 0),
      guests: safeNumber(getField(booking, FIELD_CANDIDATES.guests, 0), 0),
      receiptUrl: safeUrl(getField(booking, FIELD_CANDIDATES.receiptUrl)),
      paymentMethod: safeText(getField(booking, FIELD_CANDIDATES.paymentMethod, "cash")),
      loyaltyPoints: calculateLoyaltyPoints(booking)
    };
  }

  function showAddonToast(message, type = "success") {
    if (typeof g.showToast === "function") {
      g.showToast(message, type);
      return;
    }
    alert(message);
  }

  function setBookingActionButtonsDisabled(disabled, scopeElement = null) {
    const buttons = scopeElement
      ? scopeElement.querySelectorAll(".btn-approve, .btn-reject")
      : document.querySelectorAll(".btn-approve, .btn-reject");

    buttons.forEach(btn => {
      btn.disabled = !!disabled;
      btn.style.opacity = disabled ? "0.55" : "1";
      btn.style.cursor = disabled ? "not-allowed" : "pointer";
    });
  }

  function getIsSuperAdminSafe() {
    if (typeof g.getIsSuperAdmin === "function") return !!g.getIsSuperAdmin();
    return !localStorage.getItem("ownerPropId");
  }

  function getOwnerPropIdSafe() {
    if (typeof g.getOwnerPropId === "function") return normalizeText(g.getOwnerPropId());
    return normalizeText(localStorage.getItem("ownerPropId") || "");
  }

  function getOwnerAccountIdSafe() {
    if (typeof g.getOwnerAccountId === "function") return normalizeText(g.getOwnerAccountId());
    return normalizeText(localStorage.getItem("ownerAccountId") || "");
  }

  function getSessionRoleSafe() {
    if (typeof g.getSessionRole === "function") return normalizeText(g.getSessionRole());
    return getIsSuperAdminSafe() ? "superadmin" : "owner";
  }

  function getAdminActorIdSafe() {
    if (typeof g.getAdminActorId === "function") return normalizeText(g.getAdminActorId());
    return getIsSuperAdminSafe() ? "superadmin" : (getOwnerAccountIdSafe() || getOwnerPropIdSafe());
  }

  function getAdminActorNameSafe() {
    if (typeof g.getAdminActorName === "function") return normalizeText(g.getAdminActorName());
    return getIsSuperAdminSafe() ? "إدارة OreBooking" : "صاحب العقار";
  }

  function canAccessBooking(booking) {
    if (getIsSuperAdminSafe()) return true;
    return getBookingPropertyId(booking) === getOwnerPropIdSafe();
  }

  function buildChatIdSafe(bookingId, propertyId, guestId) {
    if (typeof g.buildChatId === "function") {
      try {
        return g.buildChatId(bookingId, propertyId, guestId);
      } catch (_) {}
    }

    const b = normalizeText(bookingId || "");
    const p = normalizeText(propertyId || "");
    const gu = normalizeText(guestId || "");
    if (b) return `booking_${b}`;
    return `chat_${[p || "property", gu || "guest", Date.now()].join("_")}`;
  }

  async function getPropertyImageFallback(propertyId) {
    const db = getDbSafe();
    if (!db || !propertyId) return "";
    try {
      const snap = await db.collection("properties").doc(propertyId).get();
      if (!snap.exists) return "";
      const data = snap.data() || {};
      return normalizeText(data.imageUrl || data.image || "");
    } catch (_) {
      return "";
    }
  }

  async function syncChatStatusForBooking(docId, booking, newStatus) {
    const db = getDbSafe();
    if (!db) return;

    const propertyId = getBookingPropertyId(booking);
    const guestId = getBookingGuestId(booking);

    const candidateIds = Array.from(new Set([
      buildChatIdSafe(docId, propertyId, guestId),
      normalizeText(booking?.chatId || "")
    ].filter(Boolean)));

    if (!candidateIds.length) return;

    const payload = {
      status: newStatus,
      propertyId,
      propertyTitle: normalizeText(getField(booking, FIELD_CANDIDATES.propertyTitle, "")),
      guestId,
      guestName: getBookingGuestName(booking),
      guestEmail: getBookingEmail(booking),
      guestPhone: getBookingPhone(booking),
      ownerId: getAdminActorIdSafe(),
      ownerName: getAdminActorNameSafe(),
      ownerRole: getSessionRoleSafe(),
      updatedAt: serverTimestamp()
    };

    const propertyImage =
      normalizeText(getField(booking, FIELD_CANDIDATES.propertyImage, "")) ||
      (await getPropertyImageFallback(propertyId));

    if (propertyImage) payload.propertyImage = propertyImage;

    const updates = candidateIds.map(async chatId => {
      try {
        const ref = db.collection(COLLECTIONS.chats).doc(chatId);
        const snap = await ref.get();
        if (!snap.exists) return false;
        await ref.set(payload, { merge: true });
        return true;
      } catch (_) {
        return false;
      }
    });

    await Promise.allSettled(updates);
  }

  async function addSystemChatMessageIfPossible(docId, booking, newStatus) {
    const db = getDbSafe();
    if (!db) return;

    const propertyId = getBookingPropertyId(booking);
    const guestId = getBookingGuestId(booking);
    const chatId = normalizeText(booking?.chatId || "") || buildChatIdSafe(docId, propertyId, guestId);
    if (!chatId) return;

    try {
      const chatRef = db.collection(COLLECTIONS.chats).doc(chatId);
      const chatSnap = await chatRef.get();
      if (!chatSnap.exists) return;

      const statusMeta = getStatusMeta(newStatus);
      const text = `تم تحديث حالة الحجز إلى: ${statusMeta.label}`;

      await chatRef.collection("messages").add({
        bookingId: normalizeText(docId),
        propertyId,
        senderId: getAdminActorIdSafe(),
        senderName: getAdminActorNameSafe(),
        senderRole: "system",
        type: "system",
        text,
        createdAt: serverTimestamp(),
        seenByGuest: false,
        seenByOwner: true
      });

      await chatRef.set({
        lastMessage: text,
        lastMessageType: "system",
        lastSenderId: getAdminActorIdSafe(),
        lastSenderRole: "system",
        lastMessageAt: serverTimestamp(),
        unreadCountGuest: incrementBy(1),
        unreadCountOwner: 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (_) {
      // silent on purpose
    }
  }

  async function applyStatusOnly(bookingRef, booking, docId, newStatus) {
    await bookingRef.update({
      status: newStatus,
      updatedAt: serverTimestamp()
    });

    await syncChatStatusForBooking(docId, booking, newStatus);
    await addSystemChatMessageIfPossible(docId, booking, newStatus);
  }

  async function applyConfirmWithPoints(bookingRef, booking, docId) {
    const db = getDbSafe();
    if (!db) throw new Error("قاعدة البيانات غير متاحة");

    const guestId = getBookingGuestId(booking);
    const guestEmail = normalizeText(getBookingEmail(booking));
    const earnedPoints = calculateLoyaltyPoints(booking);

    if (!guestId || guestId === "guest") {
      await bookingRef.update({
        status: "confirmed",
        updatedAt: serverTimestamp()
      });

      await syncChatStatusForBooking(docId, booking, "confirmed");
      await addSystemChatMessageIfPossible(docId, booking, "confirmed");

      showAddonToast(
        "تم تأكيد الحجز بنجاح. هذا الحجز لضيف زائر لذلك لم تتم إضافة نقاط ولاء.",
        "success"
      );
      return;
    }

    const userRef = db.collection(COLLECTIONS.users).doc(guestId);
    let pointsAddedNow = 0;

    await db.runTransaction(async transaction => {
      const bookingSnapshot = await transaction.get(bookingRef);
      if (!bookingSnapshot.exists) throw new Error("الحجز غير موجود");

      const freshBooking = bookingSnapshot.data() || {};
      const freshStatus = normalizeText(freshBooking.status || "pending");
      const alreadyAwarded = safeNumber(
        freshBooking.pointsAwarded ?? freshBooking.loyaltyPointsAwarded ?? 0,
        0
      );

      const shouldAwardPoints =
        freshStatus !== "confirmed" &&
        alreadyAwarded <= 0 &&
        earnedPoints > 0;

      const bookingUpdate = {
        status: "confirmed",
        updatedAt: serverTimestamp()
      };

      if (shouldAwardPoints) {
        bookingUpdate.pointsAwarded = earnedPoints;
        bookingUpdate.pointsAwardedAt = serverTimestamp();
        pointsAddedNow = earnedPoints;
      }

      const userDoc = await transaction.get(userRef);

      if (userDoc.exists) {
        const currentPoints = safeNumber(userDoc.data()?.points, 0);
        const userUpdate = {
          email: guestEmail || userDoc.data()?.email || "",
          updatedAt: serverTimestamp()
        };

        if (shouldAwardPoints) {
          userUpdate.points = currentPoints + earnedPoints;
        }

        transaction.set(userRef, userUpdate, { merge: true });
      } else {
        transaction.set(userRef, {
          email: guestEmail || "",
          points: shouldAwardPoints ? earnedPoints : 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      transaction.update(bookingRef, bookingUpdate);
    });

    await syncChatStatusForBooking(docId, booking, "confirmed");
    await addSystemChatMessageIfPossible(docId, booking, "confirmed");

    if (pointsAddedNow > 0) {
      showAddonToast(`تم تأكيد الحجز بنجاح، وتمت إضافة ${pointsAddedNow} نقطة ولاء للعميل.`, "success");
    } else if (earnedPoints > 0) {
      showAddonToast("تم تأكيد الحجز بنجاح. نقاط الولاء كانت مضافة مسبقًا لهذا الحجز.", "info");
    } else {
      showAddonToast("تم تأكيد الحجز بنجاح، ولا توجد نقاط مضافة لأن قيمة الحجز لا تولّد نقاطًا.", "success");
    }
  }

  async function refreshAdminViews() {
    if (typeof g.loadBookings === "function") {
      await g.loadBookings();
    }
    if (typeof g.updateAdminQuickStats === "function") {
      g.updateAdminQuickStats();
      return;
    }
    if (typeof g.updateQuickStats === "function") {
      g.updateQuickStats();
    }
  }

  g.updateBookingStatus = async function updateBookingStatus(docId, newStatus, clickedBtn = null) {
    const allowedStatuses = ["pending", "confirmed", "cancelled", "rejected"];
    if (!docId || !allowedStatuses.includes(newStatus)) return;
    if (BOOKING_STATUS_LOCKS.has(docId)) return;

    const db = getDbSafe();
    const firebaseObj = getFirebaseSafe();

    if (!db || !firebaseObj?.firestore) {
      showAddonToast("Firebase غير متاح داخل الصفحة حالياً.", "error");
      return;
    }

    const normalizedTargetStatus = newStatus === "rejected" ? "cancelled" : newStatus;
    const isConfirm = normalizedTargetStatus === "confirmed";

    const confirmMsg = isConfirm
      ? "تأكيد الحجز؟ سيتم اعتماد الحجز وإضافة نقاط الولاء إن كان العميل يملك حساباً."
      : normalizedTargetStatus === "cancelled"
        ? "هل أنت متأكد من رفض وإلغاء هذا الحجز؟"
        : "هل تريد إعادة الحجز إلى حالة الانتظار؟";

    if (!confirm(confirmMsg)) return;

    BOOKING_STATUS_LOCKS.add(docId);
    const actionRow = clickedBtn?.closest?.(".booking-actions-row") || null;
    setBookingActionButtonsDisabled(true, actionRow);

    try {
      const bookingRef = db.collection(COLLECTIONS.bookings).doc(docId);
      const bookingDoc = await bookingRef.get();

      if (!bookingDoc.exists) {
        throw new Error("الحجز غير موجود أو تم حذفه");
      }

      const booking = bookingDoc.data() || {};
      const currentStatus = normalizeText(booking.status || "pending");

      if (!canAccessBooking(booking)) {
        throw new Error("غير مسموح لك بتحديث هذا الحجز");
      }

      if (currentStatus === normalizedTargetStatus) {
        showAddonToast("هذه الحالة مطبقة بالفعل على الحجز.", "info");
        return;
      }

      if (isConfirm) {
        await applyConfirmWithPoints(bookingRef, booking, docId);
      } else {
        await applyStatusOnly(bookingRef, booking, docId, normalizedTargetStatus);

        showAddonToast(
          normalizedTargetStatus === "cancelled"
            ? "تم إلغاء الحجز بنجاح."
            : "تمت إعادة الحجز إلى حالة الانتظار بنجاح.",
          "success"
        );
      }

      await refreshAdminViews();
    } catch (err) {
      console.error("[admin_bookings_addon:updateBookingStatus]", err);
      showAddonToast(
        "حدث خطأ أثناء تحديث الحجز: " + (err?.message || "Unknown error"),
        "error"
      );
    } finally {
      BOOKING_STATUS_LOCKS.delete(docId);
      setBookingActionButtonsDisabled(false, actionRow);
    }
  };

  g.BOOKING_STATUS_META = STATUS_META;
  g.BOOKING_STATUS_LOCKS = BOOKING_STATUS_LOCKS;
  g.normalizeText = g.normalizeText || normalizeText;
  g.escapeHtml = g.escapeHtml || escapeHtml;
  g.safeText = g.safeText || safeText;
  g.safeNumber = g.safeNumber || safeNumber;
  g.safeArray = g.safeArray || safeArray;
  g.safeUrl = g.safeUrl || safeUrl;
  g.toTimestampMs = g.toTimestampMs || toTimestampMs;
  g.formatDateField = g.formatDateField || formatDateField;
  g.formatDateTimeField = g.formatDateTimeField || formatDateTimeField;
  g.formatMoney = g.formatMoney || formatMoney;
  g.translateAddon = g.translateAddon || translateAddon;
  g.translatePlan = g.translatePlan || translatePlan;
  g.translateBed = g.translateBed || translateBed;
  g.getStatusMeta = g.getStatusMeta || getStatusMeta;
  g.getBookingGuestId = g.getBookingGuestId || getBookingGuestId;
  g.getBookingPropertyId = g.getBookingPropertyId || getBookingPropertyId;
  g.getBookingGuestName = g.getBookingGuestName || getBookingGuestName;
  g.getBookingEmail = g.getBookingEmail || getBookingEmail;
  g.getBookingPhone = g.getBookingPhone || getBookingPhone;
  g.calculateLoyaltyPoints = g.calculateLoyaltyPoints || calculateLoyaltyPoints;
  g.getBookingAddonsList = g.getBookingAddonsList || getBookingAddonsList;
  g.buildBookingSummaryMeta = g.buildBookingSummaryMeta || buildBookingSummaryMeta;
})();
