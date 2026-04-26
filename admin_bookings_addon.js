
// =========================================
//   admin_bookings_addon.js
//   ⚠️ هذا الملف utilities فقط
//   دالة loadBookings الرئيسية موجودة
//   في admin.js ولا يجب تكرارها هنا
// =========================================

const BOOKING_STATUS_META = {
  pending: { label: 'قيد الانتظار', className: 'pending', bg: '#fef3c7', color: '#d97706' },
  confirmed: { label: 'مؤكد', className: 'confirmed', bg: '#ecfdf5', color: '#059669' },
  cancelled: { label: 'ملغي', className: 'cancelled', bg: '#ffe4e6', color: '#e11d48' }
};

const BOOKING_STATUS_LOCKS = new Set();

// =========================================
//   Utility — Text / Escape
// =========================================
function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
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

// =========================================
//   Utility — Date / Time
// =========================================
function toTimestampMs(value) {
  try {
    if (!value) return 0;
    if (typeof value.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    if (value instanceof Date) return !Number.isNaN(value.getTime()) ? value.getTime() : 0;
    if (typeof value === 'number') { const d = new Date(value); return !Number.isNaN(d.getTime()) ? d.getTime() : 0; }
    if (typeof value === 'string') { const d = new Date(value); return !Number.isNaN(d.getTime()) ? d.getTime() : 0; }
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
    if (dateField instanceof Date) return !Number.isNaN(dateField.getTime()) ? dateField.toLocaleDateString('ar-DZ') : '—';
    if (typeof dateField.toDate === 'function') {
      const d = dateField.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('ar-DZ') : '—';
    }
    if (typeof dateField === 'number') {
      const d = new Date(dateField);
      return !Number.isNaN(d.getTime()) ? d.toLocaleDateString('ar-DZ') : '—';
    }
  } catch (_) {}
  return '—';
}

function formatDateTimeField(dateField) {
  try {
    if (!dateField) return '—';
    let d = null;
    if (typeof dateField.toDate === 'function') d = dateField.toDate();
    else if (dateField instanceof Date) d = dateField;
    else if (typeof dateField === 'number' || typeof dateField === 'string') d = new Date(dateField);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('ar-DZ') + ' ' + d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
  } catch (_) { return '—'; }
}

function formatMoney(value) {
  return safeNumber(value, 0).toLocaleString('ar-DZ');
}

// =========================================
//   Utility — Translators
// =========================================
function translateAddon(key) {
  const dic = {
    wifi: 'واي فاي', parking: 'موقف سيارات', airportTransfer: 'نقل مطار', spa: 'سبا',
    lateCheckout: 'مغادرة متأخرة', extraBed: 'سرير إضافي', events: 'فعاليات', restaurant: 'المطعم'
  };
  return dic[key] || normalizeText(key) || 'غير محدد';
}

function translatePlan(plan) {
  const dic = { breakfast: 'إفطار', halfboard: 'نصف إقامة', fullboard: 'إقامة كاملة' };
  return dic[plan] || normalizeText(plan) || 'غير محددة';
}

function translateBed(bed) {
  const dic = { double: 'مزدوج', twin: 'سريران', king: 'كينج', single: 'فردي' };
  return dic[bed] || normalizeText(bed) || 'غير محدد';
}

function getStatusMeta(status) {
  return BOOKING_STATUS_META[status] || {
    label: normalizeText(status) || 'غير معروف', className: 'pending', bg: '#e2e8f0', color: '#475569'
  };
}

// =========================================
//   Update Booking Status - With REAL Points System
// =========================================
window.updateBookingStatus = async function updateBookingStatus(docId, newStatus) {
  const allowedStatuses = ['pending', 'confirmed', 'cancelled'];
  if (!docId || !allowedStatuses.includes(newStatus)) return;
  if (BOOKING_STATUS_LOCKS.has(docId)) return;

  const isConfirm  = newStatus === 'confirmed';
  const confirmMsg = isConfirm
    ? 'تأكيد الحجز؟ (سيتم إضافة نقاط ولاء للعميل إن كان مسجلاً)'
    : 'هل أنت متأكد من رفض وإلغاء هذا الحجز؟';

  if (!confirm(confirmMsg)) return;

  BOOKING_STATUS_LOCKS.add(docId);

  document.querySelectorAll('.btn-approve, .btn-reject').forEach(btn => {
    btn.disabled      = true;
    btn.style.opacity = '0.5';
    btn.style.cursor  = 'not-allowed';
  });

  try {
    if (isConfirm) {
      const bookingDoc = await db.collection('bookings').doc(docId).get();
      if (bookingDoc.exists) {
        const b = bookingDoc.data();
        const price = Number(b.totalPrice || b.basePrice || 0);

        // نظام النقاط: نقطة واحدة عن كل 500 دينار
        const earnedPoints = Math.floor(price / 500);

        if (b.userId) {
          const userRef = db.collection('users').doc(b.userId);
          await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            let currentPoints = 0;
            if (userDoc.exists) {
              currentPoints = userDoc.data().points || 0;
              transaction.update(userRef, { points: currentPoints + earnedPoints });
            } else {
              transaction.set(userRef, {
                email: b.guestEmail || '',
                points: earnedPoints,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
              });
            }
            transaction.update(db.collection('bookings').doc(docId), {
              status: newStatus,
              pointsAwarded: earnedPoints,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
          });
          alert(`✅ تم قبول الحجز بنجاح! \nتم مكافأة العميل بـ ${earnedPoints} نقطة ولاء 🎁`);
        } else {
          await db.collection('bookings').doc(docId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          alert(`✅ تم تأكيد الحجز بنجاح.\n(العميل طلب كزائر لذا لم تُضَف له نقاط)`);
        }
      }
    } else {
      // إما إلغاء أو معلق
      await db.collection('bookings').doc(docId).update({
        status: newStatus,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      alert(`✅ تم تحديث حالة الحجز إلى "ملغي".`);
    }

    if (typeof loadBookings === 'function') await loadBookings();

  } catch (err) {
    console.error('[updateBookingStatus]', err);
    alert('حدث خطأ أثناء التحديث: ' + (err?.message || 'Unknown error'));
  } finally {
    BOOKING_STATUS_LOCKS.delete(docId);
    document.querySelectorAll('.btn-approve, .btn-reject').forEach(btn => {
      btn.disabled      = false;
      btn.style.opacity = '1';
      btn.style.cursor  = 'pointer';
    });
  }
};
