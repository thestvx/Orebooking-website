// =========================================
//   Admin — Bookings Tab (Addon)
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

    // دالة للتعامل مع التواريخ سواء كانت نصاً (String) أو Object (Timestamp)
    const formatDate = (dateField) => {
      if (!dateField) return '—';
      if (typeof dateField === 'string') return dateField;
      if (dateField.toDate) return dateField.toDate().toLocaleDateString('ar-DZ');
      return '—';
    };

    // ترجمة أنواع الإضافات للعربية
    const translateAddon = (k) => {
      const dic = {
        wifi: 'واي فاي', parking: 'موقف سيارات', airportTransfer: 'نقل مطار',
        spa: 'سبا', lateCheckout: 'مغادرة متأخرة', extraBed: 'سرير إضافي', events: 'فعاليات'
      };
      return dic[k] || k;
    };

    // ترجمة خطة المطعم
    const translatePlan = (p) => {
      const dic = { breakfast: 'إفطار', halfboard: 'نصف إقامة', fullboard: 'إقامة كاملة' };
      return dic[p] || p;
    };

    // ترجمة نوع السرير
    const translateBed = (b) => {
      const dic = { double: 'مزدوج', twin: 'سريران', king: 'كينج', single: 'فردي' };
      return dic[b] || b;
    };

    container.innerHTML = `<div class="bookings-grid">` +
      snap.docs.map(doc => {
        const b = doc.data();

        const ci = formatDate(b.checkInDate || b.checkIn);
        const co = formatDate(b.checkOutDate || b.checkOut);
        const st = b.status || 'pending';
        const createdAt = formatDate(b.createdAt);

        // -- تجهيز تفاصيل الغرف والإشغال --
        let occupancyHtml = `<span>${b.guests || 1} ضيف</span>`;
        if (b.rooms) {
            occupancyHtml = `
              <div style="display:flex; flex-direction:column; line-height:1.4;">
                <span class="font-medium">${b.rooms} غرف · ${translateBed(b.bedConfig)}</span>
                <span style="font-size:0.75rem; color:var(--text-muted);">${b.adults || 1} بالغين ${b.children > 0 ? `+ ${b.children} أطفال` : ''}</span>
              </div>
            `;
        }

        // -- تجهيز الإضافات (إن وجدت) --
        let addonsHtml = '';
        if (b.selectedAddons && b.selectedAddons.length > 0) {
            const addonsList = b.selectedAddons.map(a => {
              if (a === 'restaurant') return `المطعم (${translatePlan(b.restaurantPlan)})`;
              return translateAddon(a);
            }).join('، ');

            addonsHtml = `
              <div class="booking-detail-row" style="background:color-mix(in srgb, var(--primary) 5%, transparent); padding:6px 10px; border-radius:8px; margin-top:4px;">
                <i class="ph-fill ph-plus-circle" style="color:var(--primary);"></i>
                <span style="font-size:0.8rem; font-weight:600; color:var(--primary);">${addonsList}</span>
              </div>
            `;
        }

        // -- تجهيز وصل الدفع البنكي --
        let paymentBadge = '';
        let receiptHtml = '';
        if (b.paymentMethod === 'transfer') {
            paymentBadge = `<span style="font-size:0.7rem; background:color-mix(in srgb, #f59e0b 15%, transparent); color:#d97706; padding:2px 6px; border-radius:4px; font-weight:700; margin-right:6px;"><i class="ph ph-bank"></i> تحويل بنكي</span>`;
            if (b.receiptUrl) {
                receiptHtml = `<a href="${b.receiptUrl}" target="_blank" class="action-btn" style="font-size:0.8rem; background:var(--surface-color); color:var(--primary); border:1px solid var(--border-color); padding:4px 10px; border-radius:20px; text-decoration:none;"><i class="ph ph-receipt"></i> عرض الإيصال</a>`;
            } else {
                receiptHtml = `<span style="font-size:0.75rem; color:#e11d48; font-weight:600;"><i class="ph ph-warning"></i> إيصال مفقود</span>`;
            }
        } else {
            paymentBadge = `<span style="font-size:0.7rem; background:color-mix(in srgb, #10b981 15%, transparent); color:#059669; padding:2px 6px; border-radius:4px; font-weight:700; margin-right:6px;"><i class="ph ph-money"></i> الدفع باليد</span>`;
        }

        // -- تجهيز الملاحظات (إن وجدت) --
        let notesHtml = '';
        if (b.notes && b.notes.trim() !== '') {
            notesHtml = `
              <div class="booking-detail-row" style="align-items:flex-start;">
                <i class="ph ph-chat-text" style="margin-top:2px;"></i>
                <div style="font-size:0.8rem; color:var(--text-muted); font-style:italic;">
                  <strong style="color:var(--text-main); font-style:normal;">ملاحظات:</strong> ${b.notes}
                </div>
              </div>
            `;
        }

        // -- تجهيز وقت الوصول --
        let arrivalHtml = '';
        if (b.arrivalTime && b.arrivalTime.trim() !== '') {
            arrivalHtml = `
              <div class="booking-detail-row">
                <i class="ph ph-clock"></i>
                <span style="font-size:0.85rem;">وقت الوصول: <strong>${b.arrivalTime}</strong></span>
              </div>
            `;
        }

        return `
          <div class="booking-card" id="bcard-${doc.id}">
            <div class="booking-card-header">
              <div>
                <div class="font-medium" style="font-size:1rem;">
                  ${b.guestName || '—'}
                  ${paymentBadge}
                </div>
                <div style="font-size:0.75rem;color:var(--text-muted); font-family:monospace; margin-top:2px;">#${doc.id.slice(0,8).toUpperCase()} · ${createdAt}</div>
              </div>
              <span class="booking-status ${statusClass[st]}">${statusLabel[st] || st}</span>
            </div>

            <div class="booking-card-details">
              <div class="booking-detail-row">
                <i class="ph-fill ph-buildings" style="color:var(--text-muted);"></i>
                <span class="font-medium">${b.propertyTitle || '—'}</span>
              </div>

              <div class="booking-detail-row">
                <i class="ph-fill ph-calendar-check" style="color:var(--text-muted);"></i>
                <span>${ci} <i class="ph ph-arrow-left" style="font-size:0.7rem; color:var(--text-muted); margin:0 4px;"></i> ${co}
                  <strong style="color:var(--primary);">(${b.nights || 0} ليالٍ)</strong>
                </span>
              </div>

              <div class="booking-detail-row" style="align-items:flex-start;">
                <i class="ph-fill ph-users" style="color:var(--text-muted); margin-top:3px;"></i>
                ${occupancyHtml}
              </div>

              <div class="booking-detail-row">
                <i class="ph-fill ph-phone" style="color:var(--text-muted);"></i>
                <span dir="ltr">${b.guestPhone || '—'}</span>
              </div>

              <div class="booking-detail-row">
                <i class="ph-fill ph-envelope" style="color:var(--text-muted);"></i>
                <span dir="ltr">${b.guestEmail || '—'}</span>
              </div>

              ${arrivalHtml}
              ${addonsHtml}
              ${notesHtml}

              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:12px; border-top:1px dashed var(--border-color);">
                ${receiptHtml}
                <div style="text-align:left; flex:1;">
                  <span style="font-size:1.15rem; font-weight:800; color:var(--primary);">${Number(b.totalPrice || 0).toLocaleString()} DZD</span>
                </div>
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
