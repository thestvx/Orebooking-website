// =========================================
//   Admin — Bookings Tab (Addon)
//   FIX v2:
//     - RBAC: مطابقة ownerPropId مع propertyId
//     - Grid أفقي يملأ الشاشة (3 أعمدة)
//     - updatedAt + تعطيل أزرار
//     - رسالة Firestore Index واضحة
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
    wifi: 'واي فاي', parking: 'موقف سيارات', airportTransfer: 'نقل مطار',
    spa: 'سبا', lateCheckout: 'مغادرة متأخرة', extraBed: 'سرير إضافي',
    events: 'فعاليات', restaurant: 'المطعم'
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
    label: normalizeText(status) || 'غير معروف',
    className: 'pending',
    bg: '#e2e8f0',
    color: '#475569'
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
        <span style="color:var(--text-main); font-weight:700;">${rooms} غرف · ${bedLabel}</span>
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
  const booking       = doc.data() || {};
  const statusKey     = normalizeText(booking.status) || 'pending';
  const status        = getStatusMeta(statusKey);
  const checkIn       = formatDateField(booking.checkInDate  || booking.checkIn);
  const checkOut      = formatDateField(booking.checkOutDate || booking.checkOut);
  const createdAt     = formatDateTimeField(booking.createdAt);
  const docIdShort    = safeText(String(doc.id).slice(0, 8).toUpperCase());
  const payment       = buildPaymentHtml(booking);
  const guestName     = safeText(booking.guestName);
  const propertyTitle = safeText(booking.propertyTitle);
  const guestPhone    = safeText(booking.guestPhone);
  const guestEmail    = safeText(booking.guestEmail);
  const totalPrice    = formatMoney(booking.totalPrice);
  const nights        = safeNumber(booking.nights, 0);

  return `
    <div class="booking-card"
         id="bcard-${encodeURIComponent(doc.id)}">

      <!-- ── هيدر الكارد ── -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start;
                  border-bottom:1px solid var(--border-color); padding-bottom:14px; gap:12px;">
        <div style="min-width:0; flex:1;">
          <div style="font-size:1.05rem; font-weight:700; color:var(--text-main);
                      margin-bottom:4px; word-break:break-word; line-height:1.3;">
            ${guestName}
          </div>
          <div style="margin-bottom:6px;">${payment.badge}</div>
          <div style="font-size:0.72rem; color:var(--text-muted); font-family:monospace;
                      background:var(--bg-color); padding:2px 7px; border-radius:5px;
                      display:inline-block;">
            #${docIdShort}
          </div>
        </div>
        <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0;">
          <span class="status-badge ${status.className}"
                style="background:${status.bg}; color:${status.color}; border:1px solid ${status.color}40;">
            ${escapeHtml(status.label)}
          </span>
          <span style="font-size:0.68rem; color:var(--text-muted); white-space:nowrap;">
            <i class="ph ph-clock"></i> ${createdAt}
          </span>
        </div>
      </div>

      <!-- ── تفاصيل الحجز ── -->
      <div style="display:flex; flex-direction:column; gap:10px; flex:1;">

        <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem;">
          <i class="ph-fill ph-buildings" style="color:var(--primary); font-size:1.1rem; flex-shrink:0;"></i>
          <span style="font-weight:700; color:var(--primary); word-break:break-word;">${propertyTitle}</span>
        </div>

        <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--text-main);">
          <i class="ph-fill ph-calendar-check" style="color:var(--text-muted); font-size:1.1rem; flex-shrink:0;"></i>
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-weight:600;">${checkIn} ← ${checkOut}</span>
            <span style="font-size:0.72rem; color:var(--text-muted); background:#f1f5f9;
                         padding:1px 7px; border-radius:4px; width:fit-content;">
              ${nights} ليالٍ
            </span>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--text-main);">
          <i class="ph-fill ph-users" style="color:var(--text-muted); font-size:1.1rem; flex-shrink:0;"></i>
          ${buildOccupancyHtml(booking)}
        </div>

        <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem; min-width:0;">
          <i class="ph-fill ph-phone" style="color:var(--text-muted); font-size:1.1rem; flex-shrink:0;"></i>
          <span dir="ltr" style="font-family:monospace; font-weight:600; overflow-wrap:anywhere;">
            ${guestPhone}
          </span>
        </div>

        <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; min-width:0;">
          <i class="ph-fill ph-envelope" style="color:var(--text-muted); font-size:1.1rem; flex-shrink:0;"></i>
          <span dir="ltr" style="overflow-wrap:anywhere; color:var(--text-muted);">${guestEmail}</span>
        </div>

        ${buildArrivalHtml(booking)}
        ${buildAddonsHtml(booking)}
        ${buildNotesHtml(booking)}

        <!-- ── الإجمالي وطريقة الدفع ── -->
        <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;
                    margin-top:auto; padding-top:12px;
                    border-top:1px dashed var(--border-color); flex-wrap:wrap;">
          <div>${payment.receipt}</div>
          <div style="text-align:end;">
            <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
              الإجمالي
            </div>
            <span style="font-size:1.2rem; font-weight:800; color:var(--primary);">${totalPrice} DZD</span>
          </div>
        </div>
      </div>

      <!-- ── أزرار القبول والرفض (pending فقط) ── -->
      ${statusKey === 'pending' ? `
        <div class="booking-actions-row">
          <button type="button"
                  class="btn-approve"
                  data-booking-action="confirmed"
                  data-doc-id="${escapeHtml(doc.id)}">
            <i class="ph-fill ph-check-circle"></i> قبول الحجز
          </button>
          <button type="button"
                  class="btn-reject"
                  data-booking-action="cancelled"
                  data-doc-id="${escapeHtml(doc.id)}">
            <i class="ph-fill ph-x-circle"></i> رفض الحجز
          </button>
        </div>` : ''}
    </div>`;
}

// =========================================
//   FIX: جلب ownerPropId بطريقة موثوقة
//   يدعم: localStorage / window.ADMIN_CONFIG
//   / dataset على body
// =========================================
function getOwnerPropId() {
  // 1. من window.ADMIN_CONFIG إذا موجود
  if (window.ADMIN_CONFIG && window.ADMIN_CONFIG.ownerPropId) {
    return normalizeText(window.ADMIN_CONFIG.ownerPropId);
  }

  // 2. من localStorage
  const fromStorage = normalizeText(localStorage.getItem('ownerPropId'));
  if (fromStorage) return fromStorage;

  // 3. من data attribute على الـ body
  const fromBody = normalizeText(document.body.dataset.ownerPropId);
  if (fromBody) return fromBody;

  return ''; // أدمن عام
}

// =========================================
//   FIX: بناء الـ Query حسب الصلاحية
//   المالك: يفلتر بـ propertyId فقط (بدون
//   orderBy لتجنب composite index)
//   الأدمن: يجلب الكل مع orderBy
// =========================================
async function fetchBookingDocs(ownerPropId) {
  if (ownerPropId) {
    // ── مالك عقار: جلب حجوزاته فقط ──────
    // FIX: نجرب أولاً propertyId، وإذا ما رجع نتائج نجرب propId و propertyDocId
    // (لأن بعض الكود يحفظ الـ ID بأسماء مختلفة)
    const fields = ['propertyId', 'propId', 'propertyDocId'];
    let docs = [];

    for (const field of fields) {
      try {
        const snap = await db.collection('bookings')
          .where(field, '==', ownerPropId)
          .get();
        if (!snap.empty) {
          docs = snap.docs;
          console.info(`[loadBookings] Matched on field: "${field}" → ${docs.length} booking(s)`);
          break;
        }
      } catch (fieldErr) {
        // هذا الحقل غير مفهرس — تجاهل وجرب التالي
        console.warn(`[loadBookings] Field "${field}" error:`, fieldErr.message);
      }
    }

    // إذا كل الحقول فشلت → fallback: جلب الكل وفلترة على الكلاينت
    if (!docs.length) {
      console.warn('[loadBookings] No indexed field matched. Falling back to client-side filter.');
      const allSnap = await db.collection('bookings').get();
      docs = allSnap.docs.filter(d => {
        const data = d.data() || {};
        return fields.some(f => normalizeText(data[f]) === ownerPropId);
      });
    }

    // ترتيب الكلاينت تنازلياً
    return docs.sort((a, b) =>
      toTimestampMs((b.data() || {}).createdAt) -
      toTimestampMs((a.data() || {}).createdAt)
    );

  } else {
    // ── أدمن عام: جلب الكل ───────────────
    try {
      const snap = await db.collection('bookings').orderBy('createdAt', 'desc').get();
      return snap.docs;
    } catch (orderErr) {
      console.warn('[loadBookings] orderBy failed, client-side sort:', orderErr.message);
      const fallback = await db.collection('bookings').get();
      return fallback.docs.sort((a, b) =>
        toTimestampMs((b.data() || {}).createdAt) -
        toTimestampMs((a.data() || {}).createdAt)
      );
    }
  }
}

// =========================================
//   Load Bookings — الدالة الرئيسية
// =========================================
async function loadBookings() {
  const container = document.getElementById('bookings-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:60px; color:var(--text-muted);">
      <i class="ph ph-circle-notch ph-spin"
         style="font-size:2.5rem; color:var(--primary); margin-bottom:16px; display:block;"></i>
      جارٍ جلب الحجوزات...
    </div>`;

  try {
    const ownerPropId  = getOwnerPropId();
    const isSuperAdmin = !ownerPropId;

    console.info(`[loadBookings] Role: ${isSuperAdmin ? 'Super Admin' : `Owner (${ownerPropId})`}`);

    const docs = await fetchBookingDocs(ownerPropId);

    if (!docs.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:80px; color:var(--text-muted);">
          <i class="ph ph-calendar-blank"
             style="font-size:4rem; margin-bottom:16px; opacity:0.3; display:block;"></i>
          <p style="font-size:1.05rem;">
            ${isSuperAdmin
              ? 'لا توجد حجوزات مسجلة حتى الآن.'
              : 'لا توجد حجوزات لعقارك حتى الآن.'}
          </p>
          ${!isSuperAdmin ? `
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:8px; font-family:monospace;">
              Property ID: ${escapeHtml(ownerPropId)}
            </p>` : ''}
        </div>`;
      return;
    }

    // FIX: grid أفقي يملأ الشاشة — 3 أعمدة على الديسكتوب
    // minmax(0, 1fr) بدل minmax(320px, 1fr) لمنع التراص العمودي
    container.innerHTML = `
      <div style="
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 20px;
        width: 100%;
        align-items: start;
      ">
        ${docs.map(doc => renderBookingCard(doc)).join('')}
      </div>`;

    // تفويض الأحداث
    container.onclick = event => {
      const button = event.target.closest('[data-booking-action][data-doc-id]');
      if (!button || !container.contains(button)) return;
      window.updateBookingStatus(button.dataset.docId, button.dataset.bookingAction);
    };

  } catch (err) {
    console.error('[loadBookings] Fatal:', err);

    const isIndexError =
      err.code === 'failed-precondition' ||
      (err.message && err.message.toLowerCase().includes('index'));

    if (isIndexError) {
      container.innerHTML = `
        <div style="padding:32px; color:#d97706; background:#fef3c7;
                    border-radius:14px; border:1px solid #fde68a; text-align:center;">
          <i class="ph ph-warning" style="font-size:2.5rem; display:block; margin-bottom:12px;"></i>
          <div style="font-weight:700; font-size:1rem; margin-bottom:8px;">
            يحتاج هذا الاستعلام إلى إنشاء Index في Firestore
          </div>
          <p style="font-size:0.85rem; color:var(--text-muted);">
            افتح الـ Console (F12) وانقر على الرابط الأزرق لإنشاء الـ Index تلقائياً،
            ثم أعد تحميل الصفحة.
          </p>
        </div>`;
    } else {
      container.innerHTML = `
        <div style="padding:32px; color:#e11d48; background:#ffe4e6;
                    border-radius:14px; font-weight:bold; text-align:center;">
          خطأ في تحميل الحجوزات: ${safeText(err?.message || 'Unknown error')}
        </div>`;
    }
  }
}

// =========================================
//   Update Booking Status
//   FIX: updatedAt + تعطيل الأزرار
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

  // تعطيل الأزرار أثناء المعالجة
  const cardEl     = document.getElementById(`bcard-${encodeURIComponent(docId)}`);
  const actionBtns = cardEl ? cardEl.querySelectorAll('[data-booking-action]') : [];
  actionBtns.forEach(btn => {
    btn.disabled      = true;
    btn.style.opacity = '0.5';
    btn.style.cursor  = 'not-allowed';
  });

  try {
    await db.collection('bookings').doc(docId).update({
      status:    newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert(`✅ تم ${isConfirm ? 'قبول' : 'رفض'} الحجز بنجاح.`);
    await loadBookings();
  } catch (err) {
    console.error('[updateBookingStatus]', err);
    alert('حدث خطأ أثناء التحديث: ' + (err?.message || 'Unknown error'));
    // إعادة تفعيل الأزرار عند الفشل
    actionBtns.forEach(btn => {
      btn.disabled      = false;
      btn.style.opacity = '1';
      btn.style.cursor  = 'pointer';
    });
  } finally {
    BOOKING_STATUS_LOCKS.delete(docId);
  }
};
