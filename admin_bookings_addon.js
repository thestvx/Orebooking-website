// =========================================
//   Admin — Bookings Tab (Addon)
// =========================================

async function loadBookings() {
  const container = document.getElementById('bookings-container');
  if (!container) return;
  container.innerHTML = `<p style="text-align:center;padding:60px;color:var(--text-muted)"><i class="ph ph-circle-notch ph-spin" style="font-size: 2.5rem; color:var(--primary); margin-bottom:16px; display:block;"></i>جارٍ جلب الحجوزات...</p>`;

  try {
    const snap = await db.collection('bookings')
      .orderBy('createdAt', 'desc')
      .get();

    if (snap.empty) {
      container.innerHTML = `
        <div style="text-align:center; padding:80px; color:var(--text-muted);">
          <i class="ph ph-calendar-blank" style="font-size:4rem; margin-bottom:16px; opacity:0.3;"></i>
          <p style="font-size:1.1rem;">لا توجد حجوزات مسجلة حتى الآن.</p>
        </div>`;
      return;
    }

    const statusLabel = { pending: 'قيد الانتظار', confirmed: 'مؤكد', cancelled: 'ملغي' };
    const statusClass = { pending: 'pending', confirmed: 'confirmed', cancelled: 'cancelled' };
    
    // ألوان خلفية خاصة للحالات
    const statusBg = { pending: '#fef3c7', confirmed: '#ecfdf5', cancelled: '#ffe4e6' };
    const statusColor = { pending: '#d97706', confirmed: '#059669', cancelled: '#e11d48' };

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

    let html = `<div class="bookings-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; width: 100%;">`;

    snap.docs.forEach(doc => {
      const b = doc.data();

      const ci = formatDate(b.checkInDate || b.checkIn);
      const co = formatDate(b.checkOutDate || b.checkOut);
      const st = b.status || 'pending';
      
      let createdAt = '—';
      if (b.createdAt) {
        const d = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        createdAt = d.toLocaleDateString('ar-DZ') + ' ' + d.toLocaleTimeString('ar-DZ', {hour: '2-digit', minute:'2-digit'});
      }

      const docIdShort = doc.id.slice(0, 8).toUpperCase();

      // -- تجهيز تفاصيل الغرف والإشغال --
      let occupancyHtml = `<span>${b.guests || 1} ضيف</span>`;
      if (b.rooms) {
          occupancyHtml = `
            <div style="display:flex; flex-direction:column; line-height:1.4;">
              <span class="font-medium" style="color:var(--text-main); font-weight:700;">${b.rooms} غرف · ${translateBed(b.bedConfig)}</span>
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
            <div style="margin-top:10px; background:#f8fafc; padding:10px 12px; border-radius:10px; border:1px solid #e2e8f0;">
              <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <i class="ph-fill ph-plus-circle" style="color:var(--primary);"></i>
                <span style="font-size:0.8rem; font-weight:700; color:var(--primary);">إضافات مختارة:</span>
              </div>
              <div style="font-size:0.8rem; color:var(--text-main); line-height:1.4;">
                ${addonsList}
              </div>
            </div>
          `;
      }

      // -- تجهيز وصل الدفع البنكي --
      let paymentBadge = '';
      let receiptHtml = '';
      if (b.paymentMethod === 'transfer') {
          paymentBadge = `<span style="font-size:0.7rem; background:color-mix(in srgb, #f59e0b 15%, transparent); color:#d97706; padding:2px 6px; border-radius:4px; font-weight:700; margin-right:6px;"><i class="ph ph-bank"></i> تحويل بنكي</span>`;
          if (b.receiptUrl) {
              receiptHtml = `<a href="${b.receiptUrl}" target="_blank" style="background:#fef3c7; color:#d97706; padding:6px 12px; border-radius:8px; font-size:0.8rem; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:6px; border:1px solid #fde68a;"><i class="ph ph-receipt"></i> عرض إيصال الدفع</a>`;
          } else {
              receiptHtml = `<span style="color:#e11d48; font-size:0.8rem; font-weight:600; display:inline-flex; align-items:center; gap:4px;"><i class="ph-fill ph-warning-circle"></i> الإيصال مفقود</span>`;
          }
      } else {
          paymentBadge = `<span style="font-size:0.7rem; background:color-mix(in srgb, #10b981 15%, transparent); color:#059669; padding:2px 6px; border-radius:4px; font-weight:700; margin-right:6px;"><i class="ph ph-money"></i> الدفع عند الوصول</span>`;
      }

      // -- تجهيز الملاحظات (إن وجدت) --
      let notesHtml = '';
      if (b.notes && b.notes.trim() !== '') {
          notesHtml = `
            <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted); background:#fffbeb; padding:8px 10px; border-left:3px solid #f59e0b; border-radius:0 6px 6px 0;">
              <strong style="color:var(--text-main);">ملاحظات:</strong> ${b.notes}
            </div>
          `;
      }

      // -- تجهيز وقت الوصول --
      let arrivalHtml = '';
      if (b.arrivalTime && b.arrivalTime.trim() !== '') {
          arrivalHtml = `
            <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-clock" style="color:var(--text-muted); font-size:1.2rem;"></i>
              <span>وقت الوصول المتوقع: <strong style="color:var(--primary);">${b.arrivalTime}</strong></span>
            </div>
          `;
      }

      html += `
        <div class="booking-card" id="bcard-${doc.id}" style="background:var(--surface-color); border:1px solid var(--border-color); border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:12px; box-shadow:var(--shadow-soft);">
          
          <!-- Header -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <div style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:4px;">
                ${b.guestName || '—'}
              </div>
              <div style="margin-bottom:6px;">${paymentBadge}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace; background:var(--bg-color); padding:3px 8px; border-radius:6px; display:inline-block;">رقم: #${docIdShort}</div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
              <span style="font-size:0.75rem; font-weight:700; padding:6px 12px; border-radius:8px; background:${statusBg[st]}; color:${statusColor[st]}; border:1px solid ${statusColor[st]}40;">${statusLabel[st] || st}</span>
              <span style="font-size:0.7rem; color:var(--text-muted);"><i class="ph ph-clock"></i> ${createdAt}</span>
            </div>
          </div>

          <!-- Body -->
          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-buildings" style="color:var(--text-muted); font-size:1.2rem;"></i>
              <span style="font-weight:700; color:var(--primary);">${b.propertyTitle || '—'}</span>
            </div>

            <div style="display:flex; align-items:flex-start; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-calendar-check" style="color:var(--text-muted); font-size:1.2rem; margin-top:2px;"></i>
              <div style="display:flex; flex-direction:column; gap:3px;">
                <span style="font-weight:600;">${ci} <i class="ph ph-arrow-left" style="font-size:0.7rem; color:var(--text-muted); margin:0 4px;"></i> ${co}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600; background:#f1f5f9; padding:2px 8px; border-radius:4px; display:inline-block; width:fit-content;">${b.nights || 0} ليالٍ</span>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-users" style="color:var(--text-muted); font-size:1.2rem;"></i>
              ${occupancyHtml}
            </div>

            <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-phone" style="color:var(--text-muted); font-size:1.2rem;"></i>
              <span dir="ltr" style="font-family:monospace; font-weight:600;">${b.guestPhone || '—'}</span>
            </div>

            <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-envelope" style="color:var(--text-muted); font-size:1.2rem;"></i>
              <span dir="ltr">${b.guestEmail || '—'}</span>
            </div>

            ${arrivalHtml}
            ${addonsHtml}
            ${notesHtml}

            <!-- Footer (Total Price) -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px; padding-top:14px; border-top:1px dashed var(--border-color);">
              ${receiptHtml}
              <div style="text-align:left; flex:1;">
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">الإجمالي</div>
                <span style="font-size:1.25rem; font-weight:800; color:var(--primary);">${Number(b.totalPrice || 0).toLocaleString()} DZD</span>
              </div>
            </div>
          </div>

          <!-- Actions -->
          ${st === 'pending' ? `
          <div class="booking-actions-row" style="display:flex; gap:10px; margin-top:16px; padding-top:16px; border-top:1px solid var(--border-color);">
            <button class="btn-approve" onclick="updateBookingStatus('${doc.id}','confirmed')" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:10px; border-radius:10px; font-weight:700; font-size:0.9rem; border:none; cursor:pointer; background:#ecfdf5; color:#059669; border:1px solid #10b981; font-family:inherit;">
              <i class="ph-fill ph-check-circle" style="font-size:1.1rem;"></i> تأكيد
            </button>
            <button class="btn-reject" onclick="updateBookingStatus('${doc.id}','cancelled')" style="flex:1; display:flex; align-items:center; justify-content:center; gap:8px; padding:10px; border-radius:10px; font-weight:700; font-size:0.9rem; border:none; cursor:pointer; background:#fef2f2; color:#e11d48; border:1px solid #ef4444; font-family:inherit;">
              <i class="ph-fill ph-x-circle" style="font-size:1.1rem;"></i> إلغاء
            </button>
          </div>` : ''}
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div style="text-align:center; padding:40px; color:#e11d48; background:#ffe4e6; border-radius:12px; font-weight:bold;">خطأ في تحميل الحجوزات: ${err.message}</div>`;
  }
}

// الدالة الخاصة بتغيير حالة الحجز (متاحة عالمياً)
window.updateBookingStatus = async function(docId, newStatus) {
  const isConfirm = newStatus === 'confirmed';
  const labelText = isConfirm ? 'تأكيد وقبول' : 'رفض وإلغاء';
  const confirmMsg = isConfirm 
    ? "هل أنت متأكد من تأكيد هذا الحجز؟" 
    : "هل أنت متأكد من إلغاء هذا الحجز؟";

  if (!confirm(confirmMsg)) return;

  try {
    await db.collection('bookings').doc(docId).update({ status: newStatus });
    alert(`✅ تم ${labelText} الحجز بنجاح.`);
    loadBookings();
  } catch (err) {
    alert('حدث خطأ أثناء التحديث: ' + err.message);
  }
}
