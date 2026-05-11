// =========================================
//   admin_bookings_addon.js
//   Utilities + Enhanced Booking Status Logic
//   لا يحتوي على loadBookings الرئيسية
// =========================================

const BOOKING_STATUS_META = {
  pending: {
    label: 'قيد الانتظار',
    className: 'pending',
    bg: '#fef3c7',
    color: '#d97706',
    icon: 'ph-hourglass-medium'
  },
  confirmed: {
    label: 'مؤكد',
    className: 'confirmed',
    bg: '#ecfdf5',
    color: '#059669',
    icon: 'ph-check-circle'
  },
  cancelled: {
    label: 'ملغي',
    className: 'rejected',
    bg: '#ffe4e6',
    color: '#e11d48',
    icon: 'ph-x-circle'
  },
  rejected: {
    label: 'مرفوض',
    className: 'rejected',
    bg: '#ffe4e6',
    color: '#e11d48',
    icon: 'ph-x-circle'
  }
};

const BOOKING_STATUS_LOCKS = new Set();

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[ch];
  });
}

function safeText(value, fallback = '—') {
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
  if (!raw) return '';
  try {
    const url = new URL(raw, window.location.origin);
    if (url.protocol === 'http:' || url.protocol === 'https:') return url.href;
  } catch (_) {}
  return '';
}

function toTimestampMs(value) {
  try {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? 0 : value.getTime();
    if (typeof value === 'number' || typeof value === 'string') {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }
  } catch (_) {}
  return 0;
}

function formatDateField(dateField) {
  try {
    if (!dateField) return '—';
    if (typeof dateField === 'string') {
      const raw = dateField.trim();
      if (!raw) return '—';
      const parsed = new Date(raw);
      return !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString('ar-DZ') : escapeHtml(raw);
    }
    if (dateField instanceof Date) return Number.isNaN(dateField.getTime()) ? '—' : dateField.toLocaleDateString('ar-DZ');
    if (typeof dateField?.toDate === 'function') {
      const d = dateField.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('ar-DZ') : '—';
    }
    if (typeof dateField === 'number') {
      const d = new Date(dateField);
      return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('ar-DZ');
    }
  } catch (_) {}
  return '—';
}

function formatDateTimeField(dateField) {
  try {
    if (!dateField) return '—';
    let d = null;
    if (typeof dateField?.toDate === 'function') d = dateField.toDate();
    else if (dateField instanceof Date) d = dateField;
    else if (typeof dateField === 'number' || typeof dateField === 'string') d = new Date(dateField);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-DZ') + ' ' + d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  } catch (_) {
    return '—';
  }
}

function formatMoney(value, suffix = 'DZD') {
  return `${safeNumber(value, 0).toLocaleString('en-US')} ${suffix}`;
}

function translateAddon(key) {
  const dic = {
    wifi: 'واي فاي',
    parking: 'موقف سيارات',
    airportTransfer: 'نقل مطار',
    spa: 'سبا',
    lateCheckout: 'مغادرة متأخرة',
    extraBed: 'سرير إضافي',
    events: 'فعاليات',
    restaurant: 'المطعم'
  };
  return dic[key] || normalizeText(key) || 'غير محدد';
}

function translatePlan(plan) {
  const dic = {
    breakfast: 'إفطار',
    halfboard: 'نصف إقامة',
    fullboard: 'إقامة كاملة'
  };
  return dic[plan] || normalizeText(plan) || 'غير محددة';
}

function translateBed(bed) {
  const dic = {
    double: 'مزدوج',
    twin: 'سريران',
    king: 'كينج',
    single: 'فردي'
  };
  return dic[bed] || normalizeText(bed) || 'غير محدد';
}

function getStatusMeta(status) {
  return BOOKING_STATUS_META[status] || {
    label: normalizeText(status) || 'غير معروف',
    className: 'pending',
    bg: '#e2e8f0',
    color: '#475569',
    icon: 'ph-info'
  };
}

function getBookingGuestId(booking) {
  return normalizeText(
    booking?.guestId ||
    booking?.userId ||
    booking?.uid ||
    booking?.customerId ||
    ''
  );
}

function calculateLoyaltyPoints(booking) {
  const totalPrice = safeNumber(booking?.totalPrice, safeNumber(booking?.basePrice, 0));
  return Math.max(0, Math.floor(totalPrice / 500));
}

function getBookingAddonsList(booking) {
  if (Array.isArray(booking?.selectedAddons)) return booking.selectedAddons;
  if (booking?.addons && typeof booking.addons === 'object') {
    return Object.keys(booking.addons).filter(key => booking.addons[key] === true);
  }
  return [];
}

function buildBookingSummaryMeta(booking) {
  const addons = getBookingAddonsList(booking).map(key => {
    if (key === 'restaurant' && booking?.restaurantPlan) {
      return `${translateAddon(key)} (${translatePlan(booking.restaurantPlan)})`;
    }
    if (key === 'restaurant' && booking?.addons?.restaurantPlan) {
      return `${translateAddon(key)} (${translatePlan(booking.addons.restaurantPlan)})`;
    }
    return translateAddon(key);
  });

  return {
    guestName: safeText(booking?.guestName || booking?.customerName || 'غير معروف'),
    guestEmail: safeText(booking?.guestEmail),
    guestPhone: safeText(booking?.guestPhone),
    propertyTitle: safeText(booking?.propertyTitle),
    totalPriceText: formatMoney(booking?.totalPrice || booking?.basePrice || 0),
    checkInText: formatDateField(booking?.checkInDate || booking?.checkIn),
    checkOutText: formatDateField(booking?.checkOutDate || booking?.checkOut),
    createdAtText: formatDateTimeField(booking?.createdAt),
    status: getStatusMeta(booking?.status),
    addonsText: addons.join('، '),
    arrivalTime: safeText(booking?.arrivalTime),
    notes: safeText(booking?.specialRequests || booking?.notes),
    bedText: translateBed(booking?.bedConfig),
    nights: safeNumber(booking?.nights, 0),
    adults: safeNumber(booking?.adults, 0),
    children: safeNumber(booking?.children, 0),
    rooms: safeNumber(booking?.rooms, 0),
    receiptUrl: safeUrl(booking?.receiptUrl)
  };
}

function showAddonToast(message, type = 'success') {
  if (typeof window.showToast === 'function') {
    window.showToast(message, type);
    return;
  }
  alert(message);
}

function setBookingActionButtonsDisabled(disabled, scopeElement = null) {
  const buttons = scopeElement
    ? scopeElement.querySelectorAll('.btn-approve, .btn-reject')
    : document.querySelectorAll('.btn-approve, .btn-reject');

  buttons.forEach(btn => {
    btn.disabled = disabled;
    btn.style.opacity = disabled ? '0.55' : '1';
    btn.style.cursor = disabled ? 'not-allowed' : 'pointer';
  });
}

window.updateBookingStatus = async function updateBookingStatus(docId, newStatus, clickedBtn = null) {
  const allowedStatuses = ['pending', 'confirmed', 'cancelled'];
  if (!docId || !allowedStatuses.includes(newStatus)) return;
  if (BOOKING_STATUS_LOCKS.has(docId)) return;

  const isConfirm = newStatus === 'confirmed';
  const confirmMsg = isConfirm
    ? 'تأكيد الحجز؟ سيتم اعتماد الحجز، وتسجيل نقاط الولاء للعميل إن كان لديه حساب.'
    : newStatus === 'cancelled'
      ? 'هل أنت متأكد من رفض وإلغاء هذا الحجز؟'
      : 'هل تريد إعادة الحجز إلى حالة الانتظار؟';

  if (!confirm(confirmMsg)) return;

  BOOKING_STATUS_LOCKS.add(docId);
  const actionRow = clickedBtn?.closest?.('.booking-actions-row') || null;
  setBookingActionButtonsDisabled(true, actionRow);

  try {
    const bookingRef = db.collection('bookings').doc(docId);
    const bookingDoc = await bookingRef.get();
    if (!bookingDoc.exists) throw new Error('الحجز غير موجود أو تم حذفه');

    const booking = bookingDoc.data() || {};
    const currentStatus = normalizeText(booking.status || 'pending');

    if (currentStatus === newStatus) {
      showAddonToast('هذه الحالة مطبقة بالفعل على الحجز.', 'info');
      return;
    }

    if (isConfirm) {
      const guestId = getBookingGuestId(booking);
      const earnedPoints = calculateLoyaltyPoints(booking);
      const guestEmail = normalizeText(booking.guestEmail || '');

      if (guestId && guestId !== 'guest') {
        const userRef = db.collection('users').doc(guestId);

        await db.runTransaction(async transaction => {
          const userDoc = await transaction.get(userRef);
          const bookingSnapshot = await transaction.get(bookingRef);
          if (!bookingSnapshot.exists) throw new Error('الحجز غير موجود');

          const freshBooking = bookingSnapshot.data() || {};
          const freshStatus = normalizeText(freshBooking.status || 'pending');
          const alreadyAwarded = safeNumber(freshBooking.pointsAwarded, 0);
          const shouldAwardPoints = freshStatus !== 'confirmed' && alreadyAwarded <= 0 && earnedPoints > 0;

          const bookingUpdate = {
            status: 'confirmed',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };

          if (shouldAwardPoints) bookingUpdate.pointsAwarded = earnedPoints;

          if (userDoc.exists) {
            const currentPoints = safeNumber(userDoc.data()?.points, 0);
            const userUpdate = {
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (shouldAwardPoints) userUpdate.points = currentPoints + earnedPoints;
            transaction.update(userRef, userUpdate);
          } else {
            transaction.set(userRef, {
              email: guestEmail,
              points: shouldAwardPoints ? earnedPoints : 0,
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          }

          transaction.update(bookingRef, bookingUpdate);
        });

        showAddonToast(
          earnedPoints > 0
            ? `تم تأكيد الحجز بنجاح، وتمت إضافة ${earnedPoints} نقطة ولاء للعميل.`
            : 'تم تأكيد الحجز بنجاح، ولا توجد نقاط مضافة لأن قيمة الحجز لا تولد نقاطاً.',
          'success'
        );
      } else {
        await bookingRef.update({
          status: 'confirmed',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showAddonToast('تم تأكيد الحجز بنجاح. هذا الحجز لضيف زائر لذلك لم تُضف نقاط ولاء.', 'success');
      }
    } else {
      await bookingRef.update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      showAddonToast(
        newStatus === 'cancelled'
          ? 'تم إلغاء الحجز بنجاح.'
          : 'تمت إعادة الحجز إلى حالة الانتظار بنجاح.',
        'success'
      );
    }

    if (typeof window.loadBookings === 'function') await window.loadBookings();
    if (typeof window.updateAdminQuickStats === 'function') window.updateAdminQuickStats();
  } catch (err) {
    console.error('[updateBookingStatus:addon]', err);
    showAddonToast('حدث خطأ أثناء تحديث الحجز: ' + (err?.message || 'Unknown error'), 'error');
  } finally {
    BOOKING_STATUS_LOCKS.delete(docId);
    setBookingActionButtonsDisabled(false, actionRow);
  }
};

window.BOOKING_STATUS_META = BOOKING_STATUS_META;
window.BOOKING_STATUS_LOCKS = BOOKING_STATUS_LOCKS;
window.normalizeText = normalizeText;
window.escapeHtml = escapeHtml;
window.safeText = safeText;
window.safeNumber = safeNumber;
window.safeArray = safeArray;
window.safeUrl = safeUrl;
window.toTimestampMs = toTimestampMs;
window.formatDateField = formatDateField;
window.formatDateTimeField = formatDateTimeField;
window.formatMoney = formatMoney;
window.translateAddon = translateAddon;
window.translatePlan = translatePlan;
window.translateBed = translateBed;
window.getStatusMeta = getStatusMeta;
window.getBookingGuestId = getBookingGuestId;
window.calculateLoyaltyPoints = calculateLoyaltyPoints;
window.getBookingAddonsList = getBookingAddonsList;
window.buildBookingSummaryMeta = buildBookingSummaryMeta;
