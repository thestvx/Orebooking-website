// =========================================
//   Admin — Bookings Tab (أضف داخل admin.js أو استدعيه بشكل منفصل)
// =========================================

async function loadBookings() {
  const container = document.getElementById('bookings-container');
  if (!container) return;
  container.innerHTML = `<p style="text-align:center;padding:40px;color:var(--text-muted)">جارٍ التحميل...</p>`;

  try {
    const snap = await db.collection('bookings')
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) {
      container.innerHTML = `<p style="text-align:center;padding:40px;color:var(--text-muted)">لا توجد حجوزات بعد.</p>`;
      return;
    }

    const statusLabel = { pending: 'قيد الانتظار', confirmed: 'مؤكد', cancelled: 'ملغي' };
    const statusClass = { pending: 'pending', confirmed: 'confirmed', cancelled: 'cancelled' };

    container.innerHTML = `<div class="bookings-grid">` +
      snap.docs.map(doc => {
        const b = doc.data();
        const ci = b.checkIn?.toDate?.()?.toLocaleDateString('ar-DZ') || '—';
        const co = b.checkOut?.toDate?.()?.toLocaleDateString('ar-DZ') || '—';
        const st = b.status || 'pending';
        const createdAt = b.createdAt?.toDate?.()?.toLocaleDateString('ar-DZ') || '—';
        return `
          <div class="booking-card" id="bcard-${doc.id}">
            <div class="booking-card-header">
              <div>
                <div class="font-medium" style="font-size:0.9rem">${b.guestName || '—'}</div>
                <div style="font-size:0.75rem;color:var(--text-muted)">#${doc.id.slice(0,8).toUpperCase()}</div>
              </div>
              <span class="booking-status ${statusClass[st]}">${statusLabel[st] || st}</span>
            </div>
            <div class="booking-card-details">
              <div class="booking-detail-row">
                <i class="ph ph-buildings"></i>
                <span>${b.propertyTitle || '—'}</span>
              </div>
              <div class="booking-detail-row">
                <i class="ph ph-calendar-check"></i>
                <span>${ci} → ${co}
                  <strong>(${b.nights || 0} ليلة)</strong>
                </span>
              </div>
              <div class="booking-detail-row">
                <i class="ph ph-users"></i>
                <span>${b.guests || 1} ضيف</span>
              </div>
              <div class="booking-detail-row">
                <i class="ph ph-phone"></i>
                <span>${b.guestPhone || '—'}</span>
              </div>
              <div class="booking-detail-row">
                <i class="ph ph-envelope"></i>
                <span dir="ltr">${b.guestEmail || '—'}</span>
              </div>
              <div class="booking-detail-row" style="font-size:0.92rem;font-weight:700;color:var(--primary)">
                <i class="ph-fill ph-money"></i>
                <span>${Number(b.totalPrice || 0).toLocaleString()} DZD</span>
              </div>
            </div>
            ${st === 'pending' ? `
            <div class="booking-card-actions">
              <button class="btn-confirm-booking" onclick="updateBookingStatus('${doc.id}','confirmed')">
                <i class="ph ph-check-circle"></i> تأكيد
              </button>
              <button class="btn-cancel-booking" onclick="updateBookingStatus('${doc.id}','cancelled')">
                <i class="ph ph-x-circle"></i> إلغاء
              </button>
            </div>` : ''}
          </div>
        `;
      }).join('') + `</div>`;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<p style="text-align:center;padding:40px;color:#e11d48">خطأ في التحميل: ${err.message}</p>`;
  }
}

async function updateBookingStatus(docId, newStatus) {
  const labels = { confirmed: 'تأكيد', cancelled: 'إلغاء' };
  if (!confirm(`هل أنت متأكد من ${labels[newStatus]} هذا الحجز؟`)) return;
  try {
    await db.collection('bookings').doc(docId).update({ status: newStatus });
    loadBookings();
  } catch (err) {
    alert('حدث خطأ: ' + err.message);
  }
}
