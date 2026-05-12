// =========================================
//   admin_bookings_addon.js
//   Utilities + Enhanced Booking Status Logic
//   Safe addon layer for admin.js
// =========================================

(function () {
  "use strict";

  const g = window;

  const BOOKING_STATUS_META = {
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

  const BOOKING_STATUS_LOCKS = g.BOOKING_STATUS_LOCKS instanceof Set ? g.BOOKING_STATUS_LOCKS : new Set();

  const BOOKING_FIELD_CANDIDATES = {
    guestId: ["guestId", "userId", "uid", "customerId", "clientId"],
    guestName: ["guestName", "customerName", "fullName", "name", "billingName"],
    guestEmail: ["guestEmail", "email", "billingEmail", "contactEmail"],
    guestPhone: ["guestPhone", "phone", "guestWhatsapp", "billingPhone", "contactPhone"],
    propertyId: ["propertyId", "propId", "propertyDocId", "property_id", "listingId", "listing_id"],
    propertyTitle: ["propertyTitle", "propertyName", "listingTitle", "title"],
    checkIn: ["checkInDate", "checkIn", "arrivalDate", "arrival_date"],
    checkOut: ["checkOutDate", "checkOut", "departureDate", "departure_date"],
    totalPrice: ["totalPrice", "finalTotal", "amount", "price", "basePrice"],
    receiptUrl: ["receiptUrl", "paymentReceiptUrl", "transferReceiptUrl"],
    paymentMethod: ["paymentMethod", "payment_method"],
    notes: ["specialRequests", "notes", "addonNotes", "medicalNotes"],
    arrivalTime: ["arrivalTime", "arrival_time", "expectedArrivalTime"],
    bedConfig: ["bedConfig", "bedType", "preferredBed"]
  };

  function normalizeText(value) {
    if (typeof g.normalizeText === "function" && g.normalizeText !== normalizeText) {
      return g.normalizeText(value);
    }
    if (value === null || value === undefined) return "";
    return String(value).trim();
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
        "'": "&#39;"
      };
      return map[ch];
    });
  }

  function safeText(value, fallback = "—") {
    const text = normalizeText(value);
    return text ? escapeHtml(text) : fallback;
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
      const url = new URL(raw, window.location.origin);
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
    try {
      if (!dateField) return "—";
      let d = null;
      if (typeof dateField?.toDate === "function") d = dateField.toDate();
      else if (dateField instanceof Date) d = dateField;
      else if (typeof dateField === "number" || typeof dateField === "string") d = new Date(dateField);
      if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "—";
      return `${d.toLocaleDateString("ar-DZ")} ${d.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`;
    } catch (_) {
      return "—";
    }
  }

  function formatMoney(value, suffix = "DZD") {
    return `${safeNumber(value, 0).toLocaleString("en-US")} ${suffix}`;
  }

  function getField(booking, candidates = [], fallback = "") {
    for (const key of candidates) {
      const val = booking?.[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") return val;
    }
    return fallback;
  }

  function translateAddon(key) {
    const dic = {
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
    return dic[key] || normalizeText(key) || "غير محدد";
  }

  function translatePlan(plan) {
    const dic = {
      breakfast: "إفطار",
      halfboard: "نصف إقامة",
      fullboard: "إقامة كاملة"
    };
    return dic[plan] || normalizeText(plan) || "غير محددة";
  }

  function translateBed(bed) {
    const dic = {
      double: "مزدوج",
      twin: "سريران",
      king: "كينج",
      single: "فردي"
    };
    return dic[bed] || normalizeText(bed) || "غير محدد";
  }

  function getStatusMeta(status) {
    if (typeof g.getStatusMeta === "function" && g.getStatusMeta !== getStatusMeta) {
      return g.getStatusMeta(status);
    }
    return BOOKING_STATUS_META[status] || {
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
    return normalizeText(getField(booking, BOOKING_FIELD_CANDIDATES.guestId, ""));
  }

  function getBookingPropertyId(booking) {
    if (typeof g.getBookingPropertyId === "function") {
      return normalizeText(g.getBookingPropertyId(booking));
    }
    return normalizeText(getField(booking, BOOKING_FIELD_CANDIDATES.propertyId, ""));
  }

  function getBookingGuestName(booking) {
    if (typeof g.getBookingGuestName === "function") {
      return normalizeText(g.getBookingGuestName(booking));
    }
    const direct = normalizeText(getField(booking, BOOKING_FIELD_CANDIDATES.guestName, ""));
    if (direct) return direct;
    const first = normalizeText(booking?.guestNameFirst || booking?.firstName || booking?.givenName || "");
    const father = normalizeText(booking?.guestFatherName || booking?.fatherName || "");
    const family = normalizeText(booking?.guestFamilyName || booking?.lastName || booking?.familyName || "");
    return [first, father, family].filter(Boolean).join(" ").trim() || "غير معروف";
  }

  function getBookingEmail(booking) {
    if (typeof g.getBookingEmail === "function") {
      return normalizeText(g.getBookingEmail(booking));
    }
    return normalizeText(getField(booking, BOOKING_FIELD_CANDIDATES.guestEmail, ""));
  }

  function getBookingPhone(booking) {
    if (typeof g.getBookingPhone === "function") {
      return normalizeText(g.getBookingPhone(booking));
    }
    return normalizeText(getField(booking, BOOKING_FIELD_CANDIDATES.guestPhone, ""));
  }

  function getBookingAddonsList(booking) {
    if (typeof g.getBookingAddonsList === "function" && g.getBookingAddonsList !== getBookingAddonsList) {
      const external = g.getBookingAddonsList(booking);
      return Array.isArray(external) ? external : [];
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
    const totalPrice = safeNumber(
      getField(booking, BOOKING_FIELD_CANDIDATES.totalPrice, booking?.basePrice),
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
      propertyTitle: safeText(getField(booking, BOOKING_FIELD_CANDIDATES.propertyTitle)),
      totalPriceText: formatMoney(getField(booking, BOOKING_FIELD_CANDIDATES.totalPrice, 0)),
      checkInText: formatDateField(getField(booking, BOOKING_FIELD_CANDIDATES.checkIn)),
      checkOutText: formatDateField(getField(booking, BOOKING_FIELD_CANDIDATES.checkOut)),
      createdAtText: formatDateTimeField(booking?.createdAt),
      status: getStatusMeta(booking?.status),
      addonsText: addons.join("، "),
      arrivalTime: safeText(getField(booking, BOOKING_FIELD_CANDIDATES.arrivalTime)),
      notes: safeText(getField(booking, BOOKING_FIELD_CANDIDATES.notes)),
      bedText: translateBed(getField(booking, BOOKING_FIELD_CANDIDATES.bedConfig)),
      nights: safeNumber(booking?.nights || booking?.nightCount, 0),
      adults: safeNumber(booking?.adults || booking?.guestAdults, 0),
      children: safeNumber(booking?.children || booking?.guestChildren, 0),
      rooms: safeNumber(booking?.rooms || booking?.roomCount, 0),
      receiptUrl: safeUrl(getField(booking, BOOKING_FIELD_CANDIDATES.receiptUrl))
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
      btn.disabled = disabled;
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

  function canAccessBooking(booking) {
    if (getIsSuperAdminSafe()) return true;
    return getBookingPropertyId(booking) === getOwnerPropIdSafe();
  }

  function buildChatIdSafe(bookingId, propertyId, guestId) {
    if (typeof g.buildChatId === "function") return g.buildChatId(bookingId, propertyId, guestId);
    const b = normalizeText(bookingId || "");
    const p = normalizeText(propertyId || "");
    const gu = normalizeText(guestId || "");
    if (b) return `booking_${b}`;
    return `chat_${[p || "property", gu || "guest", Date.now()].join("_")}`;
  }

  async function syncChatStatusForBooking(docId, booking, newStatus) {
    if (typeof db === "undefined") return;

    const propertyId = getBookingPropertyId(booking);
    const guestId = getBookingGuestId(booking);

    const candidateIds = [
      buildChatIdSafe(docId, propertyId, guestId),
      normalizeText(booking?.chatId || "")
    ].filter(Boolean);

    const updates = candidateIds.map(async chatId => {
      try {
        const ref = db.collection("chats").doc(chatId);
        const snap = await ref.get();
        if (!snap.exists) return false;
        await ref.set({
          status: newStatus,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        return true;
      } catch (_) {
        return false;
      }
    });

    await Promise.all(updates);
  }

  async function applyStatusOnly(bookingRef, booking, docId, newStatus) {
    await bookingRef.update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    await syncChatStatusForBooking(docId, booking, newStatus);
  }

  async function applyConfirmWithPoints(bookingRef, booking, docId) {
    const guestId = getBookingGuestId(booking);
    const guestEmail = normalizeText(getBookingEmail(booking));
    const earnedPoints = calculateLoyaltyPoints(booking);

    if (!guestId || guestId === "guest") {
      await bookingRef.update({
        status: "confirmed",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      await syncChatStatusForBooking(docId, booking, "confirmed");

      showAddonToast(
        "تم تأكيد الحجز بنجاح. هذا الحجز لضيف زائر لذلك لم تُضف نقاط ولاء.",
        "success"
      );
      return;
    }

    const userRef = db.collection("users").doc(guestId);

    let pointsAddedNow = 0;
    await db.runTransaction(async transaction => {
      const userDoc = await transaction.get(userRef);
      const bookingSnapshot = await transaction.get(bookingRef);

      if (!bookingSnapshot.exists) throw new Error("الحجز غير موجود");

      const freshBooking = bookingSnapshot.data() || {};
      const freshStatus = normalizeText(freshBooking.status || "pending");
      const alreadyAwarded = safeNumber(freshBooking.pointsAwarded, 0);

      const shouldAwardPoints =
        freshStatus !== "confirmed" &&
        alreadyAwarded <= 0 &&
        earnedPoints > 0;

      const bookingUpdate = {
        status: "confirmed",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (shouldAwardPoints) {
        bookingUpdate.pointsAwarded = earnedPoints;
        bookingUpdate.pointsAwardedAt = firebase.firestore.FieldValue.serverTimestamp();
        pointsAddedNow = earnedPoints;
      }

      if (userDoc.exists) {
        const currentPoints = safeNumber(userDoc.data()?.points, 0);
        const userUpdate = {
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (shouldAwardPoints) userUpdate.points = currentPoints + earnedPoints;
        transaction.set(userRef, userUpdate, { merge: true });
      } else {
        transaction.set(userRef, {
          email: guestEmail || "",
          points: shouldAwardPoints ? earnedPoints : 0,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      }

      transaction.update(bookingRef, bookingUpdate);
    });

    await syncChatStatusForBooking(docId, booking, "confirmed");

    if (pointsAddedNow > 0) {
      showAddonToast(`تم تأكيد الحجز بنجاح، وتمت إضافة ${pointsAddedNow} نقطة ولاء للعميل.`, "success");
    } else if (earnedPoints > 0) {
      showAddonToast("تم تأكيد الحجز بنجاح. نقاط الولاء كانت مضافة مسبقًا لهذا الحجز.", "info");
    } else {
      showAddonToast("تم تأكيد الحجز بنجاح، ولا توجد نقاط مضافة لأن قيمة الحجز لا تولد نقاطاً.", "success");
    }
  }

  g.updateBookingStatus = async function updateBookingStatus(docId, newStatus, clickedBtn = null) {
    const allowedStatuses = ["pending", "confirmed", "cancelled", "rejected"];
    if (!docId || !allowedStatuses.includes(newStatus)) return;
    if (BOOKING_STATUS_LOCKS.has(docId)) return;

    if (typeof db === "undefined" || typeof firebase === "undefined") {
      showAddonToast("Firebase غير متاح داخل الصفحة حالياً.", "error");
      return;
    }

    const isConfirm = newStatus === "confirmed";
    const confirmMsg = isConfirm
      ? "تأكيد الحجز؟ سيتم اعتماد الحجز، وتسجيل نقاط الولاء للعميل إن كان لديه حساب."
      : newStatus === "cancelled" || newStatus === "rejected"
        ? "هل أنت متأكد من رفض وإلغاء هذا الحجز؟"
        : "هل تريد إعادة الحجز إلى حالة الانتظار؟";

    if (!confirm(confirmMsg)) return;

    BOOKING_STATUS_LOCKS.add(docId);
    const actionRow = clickedBtn?.closest?.(".booking-actions-row") || null;
    setBookingActionButtonsDisabled(true, actionRow);

    try {
      const bookingRef = db.collection("bookings").doc(docId);
      const bookingDoc = await bookingRef.get();

      if (!bookingDoc.exists) throw new Error("الحجز غير موجود أو تم حذفه");

      const booking = bookingDoc.data() || {};
      const currentStatus = normalizeText(booking.status || "pending");

      if (!canAccessBooking(booking)) {
        throw new Error("غير مسموح لك بتحديث هذا الحجز");
      }

      if (currentStatus === newStatus) {
        showAddonToast("هذه الحالة مطبقة بالفعل على الحجز.", "info");
        return;
      }

      if (isConfirm) {
        await applyConfirmWithPoints(bookingRef, booking, docId);
      } else {
        const targetStatus = newStatus === "rejected" ? "cancelled" : newStatus;
        await applyStatusOnly(bookingRef, booking, docId, targetStatus);

        showAddonToast(
          targetStatus === "cancelled"
            ? "تم إلغاء الحجز بنجاح."
            : "تمت إعادة الحجز إلى حالة الانتظار بنجاح.",
          "success"
        );
      }

      if (typeof g.loadBookings === "function") await g.loadBookings();
      if (typeof g.updateAdminQuickStats === "function") g.updateAdminQuickStats();
    } catch (err) {
      console.error("[updateBookingStatus:addon]", err);
      showAddonToast("حدث خطأ أثناء تحديث الحجز: " + (err?.message || "Unknown error"), "error");
    } finally {
      BOOKING_STATUS_LOCKS.delete(docId);
      setBookingActionButtonsDisabled(false, actionRow);
    }
  };

  g.BOOKING_STATUS_META = BOOKING_STATUS_META;
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
  g.calculateLoyaltyPoints = g.calculateLoyaltyPoints || calculateLoyaltyPoints;
  g.getBookingAddonsList = g.getBookingAddonsList || getBookingAddonsList;
  g.buildBookingSummaryMeta = g.buildBookingSummaryMeta || buildBookingSummaryMeta;
})();
