// =========================================
//   Admin — Bookings Tab (Addon)
//   FIX: RBAC support + owner filtering +
//        updatedAt on status update +
//        index error handling
// =========================================

const BOOKING_STATUS_META = {
  pending: {
    label: 'قيد الانتظار',
    className: 'pending',
    bg: '#fef3c7',
    color: '#d97706'
  },
  confirmed: {
    label: 'مؤكد',
    className: 'confirmed',
    bg: '#ecfdf5',
    color: '#059669'
  },
  cancelled: {
    label: 'ملغي',
    className: 'cancelled',
    bg: '#ffe4e6',
    color: '#e11d48'
  }
};

const BOOKING_STATUS_LOCKS = new Set();

// =========================================
//   Utility Functions
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

function toTimestampMs(value) {
  try {
    if (!value) return 0;
    if (typeof value.toDate === 'function') {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    if (value instanceof Date) return !Number.isNaN(value.getTime()) ? value.getTime() : 0;
    if (typeof value === 'number') {
      const d = new Date(value);
      return !Number.isNaN(d.getTime()) ? d.getTime() : 0;
    }
    if (typeof value === 'string') {
      const d = new Date(value);
      return !Number.isNaN(d.getTime()) ? d.getTime() : 0;
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
    if (dateField instanceof Date) {
      return !Number.isNaN(dateField.getTime()) ? dateField.toLocaleDateString('ar-DZ') : '—';
    }
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
    return (
      d.toLocaleDateString('ar-DZ') + ' ' +
      d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })
    );
  } catch (_) {
    return '—';
  }
}

function formatMoney(value) {
  return safeNumber(value, 0).toLocaleString('ar-DZ');
}

function translateAddon(key) {
  const dic = {
    wifi:            'واي فاي',
    parking:         'موقف سيارات',
    airportTransfer: 'نقل مطار',
    spa:             'سبا',
    lateCheckout:    'مغادرة متأخرة',
    extraBed:        'سرير إضافي',
    events:          'فعاليات',
    restaurant:      'المطعم'
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
    label:     normalizeText(status) || 'غير معروف',
    className: 'pending',
    bg:        '#e2e8f0',
    color:     '#475569'
  };
}

// =========================================
//   Card Builder Helpers
// =========================================

function buildOccupancyHtml(booking) {
  const rooms    = safeNumber(booking.rooms, 0);
  const adults   = safeNumber(booking.adults, 1);
  const children = safeNumber(booking.children, 0);
  const guests   = safeNumber(booking.guests, Math.max(adults + children, 1));
  const bedLabel = escapeHtml(translateBed(booking.bedConfig));

  if (rooms > 0) {
    return `
      <div style="display:flex; flex-direction:column; line-height:1.4;">
        <span class="font-medium" style="color:var(--text-main); font-weight:700;">${rooms} غرف · ${bedLabel}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">
          ${adults} بالغين${children > 0 ? ` + ${children} أطفال` : ''}
        </span>
      </div>`;
  }

  return `<span>${guests} ضيف</span>`;
}

function buildAddonsHtml(booking) {
  const selectedAddons = safeArray(booking.selectedAddons);
  if (!selectedAddons.length) return '';

  const addonsList = selectedAddons.map(addonKey => {
    if (addonKey === 'restaurant') {
      return `المطعم (${escapeHtml(translatePlan(booking.restaurantPlan))})`;
    }
    return escapeHtml(translateAddon(addonKey));
  }).join('، ');

  return `
    <div style="margin-top:10px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
      <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
        <i class="ph-fill ph-plus-circle" style="color:var(--primary);"></i>
        <span style="font-size:0.8rem; font-weight:700; color:var(--primary);">إضافات مختارة:</span>
      </div>
      <div style="font-size:0.8rem; color:var(--text-main); line-height:1.4;">${addonsList}</div>
    </div>`;
}

function buildPaymentHtml(booking) {
  const paymentMethod = normalizeText(booking.paymentMethod) || 'cash';
  const receiptUrl    = safeUrl(booking.receiptUrl);

  if (paymentMethod === 'transfer') {
    return {
      badge: `
        <span style="font-size:0.7rem; background:#fef3c7; color:#d97706; padding:2px 6px;
                     border-radius:4px; font-weight:700; margin-inline-start:6px;">
          <i class="ph ph-bank"></i> تحويل بنكي
        </span>`,
      receipt: receiptUrl
        ? `<a href="${escapeHtml(receiptUrl)}" target="_blank" rel="noopener noreferrer"
               style="background:#fef3c7; color:#d97706; padding:6px 12px; border-radius:8px;
                      font-size:0.8rem; font-weight:700; text-decoration:none;
                      display:inline-flex; align-items:center; gap:6px; border:1px solid #fde68a;">
             <i class="ph ph-receipt"></i> عرض إيصال الدفع
           </a>`
        : `<span style="color:#e11d48; font-size:0.8rem; font-weight:600;
                        display:inline-flex; align-items:center; gap:4px;">
             <i class="ph-fill ph-warning-circle"></i> الإيصال مفقود
           </span>`
    };
  }

  return {
    badge: `
      <span style="font-size:0.7rem; background:#ecfdf5; color:#059669; padding:2px 6px;
                   border-radius:4px; font-weight:700; margin-inline-start:6px;">
        <i class="ph ph-money"></i> الدفع عند الوصول
      </span>`,
    receipt: ''
  };
}

function buildNotesHtml(booking) {
  const notes = normalizeText(booking.notes);
  if (!notes) return '';
  return `
    <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted);
                background:#fffbeb; padding:8px 10px;
                border-inline-start:3px solid #f59e0b; border-radius:0 6px 6px 0;">
      <strong style="color:var(--text-main);">ملاحظات:</strong> ${escapeHtml(notes)}
    </div>`;
}

function buildArrivalHtml(booking) {
  const arrivalTime = normalizeText(booking.arrivalTime);
  if (!arrivalTime) return '';
  return `
    <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
      <i class="ph-fill ph-clock" style="color:var(--text-muted); font-size:1.2rem;"></i>
      <span>وقت الوصول المتوقع:
        <strong style="color:var(--primary);">${escapeHtml(arrivalTime)}</strong>
      </span>
    </div>`;
}

// =========================================
//   Render Single Booking Card
// =========================================

function renderBookingCard(doc) {
  const booking      = doc.data() || {};
  const statusKey    = normalizeText(booking.status) || 'pending';
  const status       = getStatusMeta(statusKey);
  const checkIn      = formatDateField(booking.checkInDate  || booking.checkIn);
  const checkOut     = formatDateField(booking.checkOutDate || booking.checkOut);
  const createdAt    = formatDateTimeField(booking.createdAt);
  const docIdShort   = safeText(String(doc.id).slice(0, 8).toUpperCase());
  const payment      = buildPaymentHtml(booking);
  const guestName    = safeText(booking.guestName);
  const propertyTitle = safeText(booking.propertyTitle);
  const guestPhone   = safeText(booking.guestPhone);
  const guestEmail   = safeText(booking.guestEmail);
  const totalPrice   = formatMoney(booking.totalPrice);
  const nights       = safeNumber(booking.nights, 0);

  return `
    <div class="booking-card"
         id="bcard-${encodeURIComponent(doc.id)}"
         style="background:var(--surface-color); border:1px solid var(--border-color);
                border-radius:16px; padding:20px; display:flex; flex-direction:column;
                gap:12px; box-shadow:var(--shadow-soft);">

      <!-- هيدر الكارد -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start;
                  border-bottom:1px solid var(--border-color); padding-bottom:14px; gap:12px;">
        <div style="min-width:0;">
          <div style="font-size:1.15rem; font-weight:700; color:var(--text-main);
                      margin-bottom:4px; word-break:break-word;">
            ${guestName}
          </div>
          <div style="margin-bottom:6px;">${payment.badge}</div>
          <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;
                      background:var(--bg-color); padding:3px 8px; border-radius:6px; display:inline-block;">
            رقم: #${docIdShort}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px; flex-shrink:0;">
          <span class="status-badge ${status.className}"
                style="font-size:0.75rem; font-weight:700; padding:6px 12px; border-radius:8px;
                       background:${status.bg}; color:${status.color}; border:1px solid ${status.color}40;">
            ${escapeHtml(status.label)}
          </span>
          <span style="font-size:0.7rem; color:var(--text-muted);">
            <i class="ph ph-clock"></i> ${createdAt}
          </span>
        </div>
      </div>

      <!-- تفاصيل الحجز -->
      <div style="display:flex; flex-direction:column; gap:12px;">

        <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
          <i class="ph-fill ph-buildings" style="color:var(--text-muted); font-size:1.2rem;"></i>
          <span style="font-weight:700; color:var(--primary); word-break:break-word;">${propertyTitle}</span>
        </div>

        <div style="display:flex; align-items:flex-start; gap:10px; font-size:0.9rem; color:var(--text-main);">
          <i class="ph-fill ph-calendar-check" style="color:var(--text-muted); font-size:1.2rem; margin-top:2px;"></i>
          <div style="display:flex; flex-direction:column; gap:3px;">
            <span style="font-weight:600;">
              ${checkIn}
              <i class="ph ph-arrow-left" style="font-size:0.7rem; color:var(--text-muted); margin:0 4px;"></i>
              ${checkOut}
            </span>
            <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;
                         background:#f1f5f9; padding:2px 8px; border-radius:4px;
                         display:inline-block; width:fit-content;">
              ${nights} ليالٍ
            </span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
          <i class="ph-fill ph-users" style="color:var(--text-muted); font-size:1.2rem;"></i>
          ${buildOccupancyHtml(booking)}
        </div>

        <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem;
                    color:var(--text-main); min-width:0;">
          <i class="ph-fill ph-phone" style="color:var(--text-muted); font-size:1.2rem;"></i>
          <span dir="ltr" style="font-family:monospace; font-weight:600; overflow-wrap:anywhere;">
            ${guestPhone}
          </span>
        </div>

        <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem;
                    color:var(--text-main); min-width:0;">
          <i class="ph-fill ph-envelope" style="color:var(--text-muted); font-size:1.2rem;"></i>
          <span dir="ltr" style="overflow-wrap:anywhere;">${guestEmail}</span>
        </div>

        ${buildArrivalHtml(booking)}
        ${buildAddonsHtml(booking)}
        ${buildNotesHtml(booking)}

        <!-- السعر وطريقة الدفع -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;
                    margin-top:8px; padding-top:14px; border-top:1px dashed var(--border-color); flex-wrap:wrap;">
          <div>${payment.receipt}</div>
          <div style="text-align:left; flex:1; min-width:140px;">
            <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">الإجمالي</div>
            <span style="font-size:1.25rem; font-weight:800; color:var(--primary);">${totalPrice} DZD</span>
          </div>
        </div>
      </div>

      <!-- أزرار القبول والرفض -->
      ${statusKey === 'pending' ? `
        <div class="booking-actions-row"
             style="display:flex; gap:10px; margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color);">
          <button type="button"
                  class="btn-approve"
                  data-booking-action="confirmed"
                  data-doc-id="${escapeHtml(doc.id)}"
                  style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px;
                         padding:10px; border-radius:10px; font-weight:700; font-size:0.9rem;
                         cursor:pointer; background:#ecfdf5; color:#059669;
                         border:1px solid #10b981; font-family:inherit; transition:0.2s;"
                  onmouseover="this.style.background='#10b981'; this.style.color='white';"
                  onmouseout="this.style.background='#ecfdf5'; this.style.color='#059669';">
            <i class="ph-fill ph-check-circle" style="font-size:1.1rem;"></i> قبول الحجز
          </button>
          <button type="button"
                  class="btn-reject"
                  data-booking-action="cancelled"
                  data-doc-id="${escapeHtml(doc.id)}"
                  style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px;
                         padding:10px; border-radius:10px; font-weight:700; font-size:0.9rem;
                         cursor:pointer; background:#fef2f2; color:#e11d48;
                         border:1px solid #ef4444; font-family:inherit; transition:0.2s;"
                  onmouseover="this.style.background='#ef4444'; this.style.color='white';"
                  onmouseout="this.style.background='#fef2f2'; this.style.color='#e11d48';">
            <i class="ph-fill ph-x-circle" style="font-size:1.1rem;"></i> رفض الحجز
          </button>
        </div>` : ''}
    </div>`;
}

// =========================================
//   Load Bookings
//   FIX: دعم RBAC (owner vs super admin)
//        + client-side sort fallback
//        + Firestore index error message
// =========================================
async function loadBookings() {
  const container = document.getElementById('bookings-container');
  if (!container) return;

  container.innerHTML = `
    <p style="text-align:center; padding:60px; color:var(--text-muted);">
      <i class="ph ph-circle-notch ph-spin"
         style="font-size:2.5rem; color:var(--primary); margin-bottom:16px; display:block;"></i>
      جارٍ جلب الحجوزات...
    </p>`;

  try {
    let docs = [];

    // FIX: تحديد ما إذا كان المستخدم مالكاً أم أدمن عام
    const ownerPropId  = localStorage.getItem('ownerPropId');
    const isSuperAdmin = !ownerPropId;

    if (!isSuperAdmin) {
      // =============================================
      // مالك عقار: جلب حجوزاته فقط بدون orderBy
      // (لتفادي الحاجة لـ Firestore composite index)
      // =============================================
      const snap = await db.collection('bookings')
        .where('propertyId', '==', ownerPropId)
        .get();

      // ترتيب الكلاينت بعد الجلب
      docs = snap.docs.sort((a, b) => {
        return toTimestampMs((b.data() || {}).createdAt) -
               toTimestampMs((a.data() || {}).createdAt);
      });

    } else {
      // =============================================
      // أدمن عام: جلب كل الحجوزات مع orderBy
      // مع fallback للكلاينت إذا لم يوجد index
      // =============================================
      try {
        const snap = await db.collection('bookings').orderBy('createdAt', 'desc').get();
        docs = snap.docs;
      } catch (orderErr) {
        console.warn('[loadBookings] orderBy failed, using client-side sort:', orderErr.message);
        const fallbackSnap = await db.collection('bookings').get();
        docs = fallbackSnap.docs.sort((a, b) => {
          return toTimestampMs((b.data() || {}).createdAt) -
                 toTimestampMs((a.data() || {}).createdAt);
        });
      }
    }

    if (!docs.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:80px; color:var(--text-muted);">
          <i class="ph ph-calendar-blank" style="font-size:4rem; margin-bottom:16px; opacity:0.3; display:block;"></i>
          <p style="font-size:1.1rem;">
            ${isSuperAdmin ? 'لا توجد حجوزات مسجلة حتى الآن.' : 'لا توجد حجوزات لعقارك حتى الآن.'}
          </p>
        </div>`;
      return;
    }

    let html = `
      <div class="bookings-grid"
           style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr));
                  gap:20px; width:100%;">`;

    docs.forEach(doc => { html += renderBookingCard(doc); });
    html += `</div>`;

    container.innerHTML = html;

    // تفويض الأحداث لأزرار القبول والرفض
    container.onclick = event => {
      const button = event.target.closest('[data-booking-action][data-doc-id]');
      if (!button || !container.contains(button)) return;
      window.updateBookingStatus(button.dataset.docId, button.dataset.bookingAction);
    };

  } catch (err) {
    console.error('[loadBookings] Error:', err);

    // FIX: رسالة مخصصة لخطأ Firestore Index
    const isIndexError = err.code === 'failed-precondition' ||
      (err.message && err.message.toLowerCase().includes('index'));

    if (isIndexError) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#d97706; background:#fef3c7;
                    border-radius:12px; border:1px solid #fde68a;">
          <i class="ph ph-warning" style="font-size:2.5rem; display:block; margin-bottom:12px;"></i>
          <div style="font-weight:700; font-size:1rem; margin-bottom:8px;">
            يحتاج هذا الاستعلام إلى إنشاء Index في Firestore
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted); margin:0;">
            افتح الـ Console (F12) وانقر على الرابط الأزرق لإنشاء الـ Index تلقائياً،
            ثم أعد تحميل الصفحة.
          </p>
        </div>`;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#e11d48; background:#ffe4e6;
                    border-radius:12px; font-weight:bold;">
          خطأ في تحميل الحجوزات: ${safeText(err?.message || 'Unknown error')}
        </div>`;
    }
  }
}

// =========================================
//   Update Booking Status
//   FIX: إضافة updatedAt + تعطيل الأزرار
//        أثناء المعالجة لمنع الضغط المزدوج
// =========================================
window.updateBookingStatus = async function updateBookingStatus(docId, newStatus) {
  const allowedStatuses = ['pending', 'confirmed', 'cancelled'];
  if (!docId || !allowedStatuses.includes(newStatus)) return;
  if (BOOKING_STATUS_LOCKS.has(docId)) return;

  const isConfirm  = newStatus === 'confirmed';
  const confirmMsg = isConfirm
    ? 'هل أنت متأكد من تأكيد وقبول هذا الحجز؟'
    : 'هل أنت متأكد من رفض وإلغاء هذا الحجز؟';

  if (!confirm(confirmMsg)) return;

  BOOKING_STATUS_LOCKS.add(docId);

  // FIX: تعطيل الأزرار المرتبطة بهذا الحجز أثناء المعالجة
  const cardEl = document.getElementById(`bcard-${encodeURIComponent(docId)}`);
  const actionBtns = cardEl ? cardEl.querySelectorAll('[data-booking-action]') : [];
  actionBtns.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    btn.style.cursor  = 'not-allowed';
  });

  try {
    await db.collection('bookings').doc(docId).update({
      status:    newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp() // FIX: تتبع وقت التحديث
    });
    alert(`✅ تم ${isConfirm ? 'قبول' : 'رفض'} الحجز بنجاح.`);
    await loadBookings();
  } catch (err) {
    console.error('[updateBookingStatus] Error:', err);
    alert('حدث خطأ أثناء التحديث: ' + (err?.message || 'Unknown error'));

    // إعادة تفعيل الأزرار في حال الفشل
    actionBtns.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor  = 'pointer';
    });
  } finally {
    BOOKING_STATUS_LOCKS.delete(docId);
  }
};
