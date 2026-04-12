// =========================================
//   OreBooking — Booking System (booking.js)
//   Integrated with Firestore + Firebase Auth
// =========================================

// ─── State ────────────────────────────────
const bookingState = {
  step: 1,          // 1: Dates/Guests → 2: Review → 3: Info → 4: Confirm
  prop: null,       // property data from Firestore
  docId: null,
  checkIn: null,
  checkOut: null,
  nights: 0,
  guests: 1,
  totalPrice: 0,
  currency: 'DZD',
  user: null,
  bookedDates: [],  // [{checkIn, checkOut}] — من Firestore
};

// ─── Init ─────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  bookingState.docId = params.get('id');

  if (!bookingState.docId) {
    showBookingError('لم يتم تحديد العقار. يرجى العودة واختيار عقار.');
    return;
  }

  // Auth listener
  firebase.auth().onAuthStateChanged(user => {
    bookingState.user = user;
  });

  await loadProperty();
  await loadBookedDates();
  initCalendar();
  renderStep(1);
  bindNavButtons();
});

// ─── Load Property ────────────────────────
async function loadProperty() {
  try {
    const doc = await db.collection('properties').doc(bookingState.docId).get();
    if (!doc.exists) { showBookingError('العقار غير موجود.'); return; }
    bookingState.prop = doc.data();
    renderPropertySummary();
  } catch (e) {
    showBookingError('فشل تحميل بيانات العقار.');
  }
}

function renderPropertySummary() {
  const p = bookingState.prop;
  const lang = document.documentElement.lang || 'ar';
  const title    = lang === 'en' ? (p.titleEn || p.titleAr) : (p.titleAr || p.titleEn);
  const location = lang === 'en' ? (p.locationEn || p.locationAr) : (p.locationAr || p.locationEn);

  const el = document.getElementById('booking-prop-summary');
  if (!el) return;
  el.innerHTML = `
    <img src="${p.imageUrl || ''}" alt="${title}" class="booking-prop-img"
         width="80" height="60" loading="lazy">
    <div class="booking-prop-info">
      <h3 class="booking-prop-title">${title}</h3>
      <p class="booking-prop-location"><i class="ph ph-map-pin"></i> ${location}</p>
      <p class="booking-prop-price">
        <strong>${Number(p.price).toLocaleString()} DZD</strong>
        <span>/ ليلة</span>
      </p>
    </div>
  `;
}

// ─── Booked Dates ─────────────────────────
async function loadBookedDates() {
  try {
    const snap = await db.collection('bookings')
      .where('propertyId', '==', bookingState.docId)
      .where('status', 'in', ['confirmed', 'pending'])
      .get();

    bookingState.bookedDates = snap.docs.map(d => ({
      checkIn:  d.data().checkIn.toDate(),
      checkOut: d.data().checkOut.toDate(),
    }));
  } catch (e) {
    bookingState.bookedDates = [];
  }
}

function isDateBooked(date) {
  return bookingState.bookedDates.some(range => {
    return date >= range.checkIn && date < range.checkOut;
  });
}

// ─── Calendar ─────────────────────────────
let calendarMonth = new Date();
calendarMonth.setDate(1);

function initCalendar() {
  renderCalendar();
  document.getElementById('cal-prev')?.addEventListener('click', () => {
    calendarMonth.setMonth(calendarMonth.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next')?.addEventListener('click', () => {
    calendarMonth.setMonth(calendarMonth.getMonth() + 1);
    renderCalendar();
  });
}

function renderCalendar() {
  const grid    = document.getElementById('calendar-grid');
  const label   = document.getElementById('calendar-month-label');
  if (!grid || !label) return;

  const today   = new Date(); today.setHours(0,0,0,0);
  const year    = calendarMonth.getFullYear();
  const month   = calendarMonth.getMonth();

  // Month label
  label.textContent = new Date(year, month, 1).toLocaleDateString('ar-DZ', {
    month: 'long', year: 'numeric'
  });

  // Days of week header
  const weekDays = ['أح','إث','ثل','أر','خم','جم','سب'];
  let html = weekDays.map(d => `<div class="cal-day-name">${d}</div>`).join('');

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Empty cells before first day
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-cell empty"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    date.setHours(0,0,0,0);

    const isPast   = date < today;
    const isBooked = isDateBooked(date);
    // Add 12 hours before converting to ISO string to avoid timezone offset issues
    const tzDate = new Date(date.getTime() + 12 * 60 * 60 * 1000);
    const dateStr  = tzDate.toISOString().split('T')[0];

    const isCheckIn  = bookingState.checkIn  && dateStr === bookingState.checkIn;
    const isCheckOut = bookingState.checkOut && dateStr === bookingState.checkOut;
    const isInRange  = bookingState.checkIn && bookingState.checkOut
      && date > new Date(bookingState.checkIn)
      && date < new Date(bookingState.checkOut);

    let cls = 'cal-cell';
    if (isPast || isBooked) cls += ' disabled';
    else                    cls += ' available';
    if (isCheckIn)  cls += ' check-in';
    if (isCheckOut) cls += ' check-out';
    if (isInRange)  cls += ' in-range';

    const label2 = isCheckIn  ? '<span class="cal-label">دخول</span>'
                 : isCheckOut ? '<span class="cal-label">خروج</span>'
                 : '';

    html += `<div class="${cls}" data-date="${dateStr}" onclick="selectDate('${dateStr}')">
               <span>${d}</span>${label2}
             </div>`;
  }

  grid.innerHTML = html;
  updateDateSummary();
}

function selectDate(dateStr) {
  const date = new Date(dateStr); date.setHours(0,0,0,0);
  if (isDateBooked(date)) return;

  if (!bookingState.checkIn || (bookingState.checkIn && bookingState.checkOut)) {
    bookingState.checkIn  = dateStr;
    bookingState.checkOut = null;
  } else {
    if (dateStr <= bookingState.checkIn) {
      bookingState.checkIn = dateStr;
    } else {
      // Validate no booked dates in range
      const ci = new Date(bookingState.checkIn);
      const co = new Date(dateStr);
      let hasConflict = false;
      for (let d = new Date(ci); d < co; d.setDate(d.getDate()+1)) {
        if (isDateBooked(new Date(d))) { hasConflict = true; break; }
      }
      if (hasConflict) {
        showStepError('يوجد حجز سابق في الفترة المحددة. الرجاء اختيار تواريخ أخرى.');
        bookingState.checkIn = dateStr;
        bookingState.checkOut = null;
      } else {
        bookingState.checkOut = dateStr;
      }
    }
  }

  renderCalendar();
  calcPrice();
}

function updateDateSummary() {
  const ciEl = document.getElementById('selected-checkin');
  const coEl = document.getElementById('selected-checkout');
  const niEl = document.getElementById('selected-nights');
  if (ciEl) ciEl.textContent = bookingState.checkIn  || '—';
  if (coEl) coEl.textContent = bookingState.checkOut || '—';
  if (niEl) niEl.textContent = bookingState.nights > 0 ? `${bookingState.nights} ليلة` : '—';
}

// ─── Guests ───────────────────────────────
function changeGuests(delta) {
  const next = bookingState.guests + delta;
  if (next < 1 || next > 20) return;
  bookingState.guests = next;
  const el = document.getElementById('guests-count');
  if (el) el.textContent = bookingState.guests;
  calcPrice();
}

// ─── Price Calculation ────────────────────
function calcPrice() {
  if (!bookingState.checkIn || !bookingState.checkOut || !bookingState.prop) return;
  const ci = new Date(bookingState.checkIn);
  const co = new Date(bookingState.checkOut);
  const nights = Math.round((co - ci) / 86400000);
  bookingState.nights = nights;

  const base    = bookingState.prop.price * nights;
  const service = Math.round(base * 0.08);
  const total   = base + service;

  bookingState.totalPrice = total;

  // Update UI
  const priceBreak = document.getElementById('price-breakdown');
  if (priceBreak) {
    priceBreak.innerHTML = `
      <div class="price-row">
        <span>${Number(bookingState.prop.price).toLocaleString()} DZD × ${nights} ليلة</span>
        <span>${base.toLocaleString()} DZD</span>
      </div>
      <div class="price-row">
        <span>رسوم الخدمة (8%)</span>
        <span>${service.toLocaleString()} DZD</span>
      </div>
      <div class="price-row total">
        <span>الإجمالي</span>
        <span>${total.toLocaleString()} DZD</span>
      </div>
    `;
  }

  updateDateSummary();
}

// ─── Step Navigation ──────────────────────
function bindNavButtons() {
  document.getElementById('btn-step1-next')?.addEventListener('click', goToStep2);
  document.getElementById('btn-step2-back')?.addEventListener('click', () => renderStep(1));
  document.getElementById('btn-step2-next')?.addEventListener('click', goToStep3);
  document.getElementById('btn-step3-back')?.addEventListener('click', () => renderStep(2));
  document.getElementById('btn-step3-next')?.addEventListener('click', submitBooking);
}

function renderStep(n) {
  bookingState.step = n;
  document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
  document.getElementById(`step-${n}`)?.classList.add('active');
  document.querySelectorAll('.step-indicator').forEach((el, i) => {
    el.classList.toggle('active',    i+1 === n);
    el.classList.toggle('completed', i+1 < n);
  });
  clearStepError();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToStep2() {
  if (!bookingState.checkIn || !bookingState.checkOut) {
    showStepError('الرجاء تحديد تاريخ الدخول والخروج.');
    return;
  }
  calcPrice();
  renderReview();
  renderStep(2);
}

function goToStep3() {
  if (bookingState.user) {
    // Pre-fill form
    const nameEl  = document.getElementById('guest-name');
    const emailEl = document.getElementById('guest-email');
    if (nameEl  && bookingState.user.displayName) nameEl.value  = bookingState.user.displayName;
    if (emailEl && bookingState.user.email)        emailEl.value = bookingState.user.email;
  }
  renderStep(3);
}

function renderReview() {
  const p = bookingState.prop;
  const lang = document.documentElement.lang || 'ar';
  const title = lang === 'en' ? (p.titleEn || p.titleAr) : (p.titleAr || p.titleEn);

  const el = document.getElementById('review-summary');
  if (!el) return;
  el.innerHTML = `
    <div class="review-row">
      <span class="review-label">العقار</span>
      <span class="review-value">${title}</span>
    </div>
    <div class="review-row">
      <span class="review-label">تاريخ الدخول</span>
      <span class="review-value">${formatDate(bookingState.checkIn)}</span>
    </div>
    <div class="review-row">
      <span class="review-label">تاريخ الخروج</span>
      <span class="review-value">${formatDate(bookingState.checkOut)}</span>
    </div>
    <div class="review-row">
      <span class="review-label">عدد الليالي</span>
      <span class="review-value">${bookingState.nights} ليلة</span>
    </div>
    <div class="review-row">
      <span class="review-label">عدد الضيوف</span>
      <span class="review-value">${bookingState.guests} ضيف</span>
    </div>
    <div class="review-row total-row">
      <span class="review-label">الإجمالي</span>
      <span class="review-value price-highlight">${bookingState.totalPrice.toLocaleString()} DZD</span>
    </div>
  `;
}

// ─── Submit Booking ────────────────────────
async function submitBooking() {
  const name    = document.getElementById('guest-name')?.value.trim();
  const email   = document.getElementById('guest-email')?.value.trim();
  const phone   = document.getElementById('guest-phone')?.value.trim();
  const notes   = document.getElementById('guest-notes')?.value.trim();

  if (!name || !email || !phone) {
    showStepError('الرجاء ملء جميع الحقول المطلوبة.');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showStepError('الرجاء إدخال بريد إلكتروني صحيح.');
    return;
  }

  const btn = document.getElementById('btn-step3-next');
  if (btn) { btn.disabled = true; btn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> جارٍ الإرسال...`; }

  try {
    const bookingRef = await db.collection('bookings').add({
      propertyId:  bookingState.docId,
      propertyTitle: bookingState.prop.titleAr || bookingState.prop.titleEn,
      checkIn:     firebase.firestore.Timestamp.fromDate(new Date(bookingState.checkIn)),
      checkOut:    firebase.firestore.Timestamp.fromDate(new Date(bookingState.checkOut)),
      nights:      bookingState.nights,
      guests:      bookingState.guests,
      totalPrice:  bookingState.totalPrice,
      guestName:   name,
      guestEmail:  email,
      guestPhone:  phone,
      notes:       notes || '',
      userId:      bookingState.user?.uid || null,
      status:      'pending',
      createdAt:   firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Show confirmation
    renderConfirmation(bookingRef.id);
    renderStep(4);

  } catch (err) {
    console.error(err);
    showStepError('حدث خطأ أثناء إرسال الحجز. يرجى المحاولة مرة أخرى.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = `<i class="ph ph-check-circle"></i> تأكيد الحجز`; }
  }
}

function renderConfirmation(bookingId) {
  const el = document.getElementById('confirm-details');
  if (!el) return;
  const short = bookingId.slice(0,8).toUpperCase();
  el.innerHTML = `
    <div class="confirm-id">
      <i class="ph ph-check-circle confirm-icon"></i>
      <p class="confirm-msg">تم إرسال طلب حجزك بنجاح!</p>
      <p class="confirm-ref">رقم الطلب: <strong>#${short}</strong></p>
    </div>
    <div class="confirm-summary">
      <div class="review-row"><span class="review-label">العقار</span><span class="review-value">${bookingState.prop.titleAr}</span></div>
      <div class="review-row"><span class="review-label">تاريخ الدخول</span><span class="review-value">${formatDate(bookingState.checkIn)}</span></div>
      <div class="review-row"><span class="review-label">تاريخ الخروج</span><span class="review-value">${formatDate(bookingState.checkOut)}</span></div>
      <div class="review-row total-row"><span class="review-label">الإجمالي</span><span class="review-value price-highlight">${bookingState.totalPrice.toLocaleString()} DZD</span></div>
    </div>
    <p class="confirm-note">سيتم التواصل معك قريباً لتأكيد الحجز.</p>
  `;
}

// ─── Helpers ──────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-DZ', {
    weekday: 'short', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function showStepError(msg) {
  const el = document.getElementById('step-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  setTimeout(() => el.style.display = 'none', 5000);
}

function clearStepError() {
  const el = document.getElementById('step-error');
  if (el) el.style.display = 'none';
}

function showBookingError(msg) {
  document.getElementById('booking-wrapper')?.insertAdjacentHTML('afterbegin',
    `<div class="booking-fatal-error"><i class="ph ph-warning-circle"></i> ${msg}</div>`
  );
}
