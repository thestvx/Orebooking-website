// =========================================
//   Advanced Booking Logic — booking.js
//   OreBooking © 2025
// =========================================

// ─── Firebase Config ───────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyCA5iauXrIhozRw8MD7JTOLyeQ2v0GGncA",
  authDomain:        "orebooking-website.firebaseapp.com",
  projectId:         "orebooking-website",
  storageBucket:     "orebooking-website.firebasestorage.app",
  messagingSenderId: "1012887567747",
  appId:             "1:1012887567747:web:153b57b60cb143d88acab6",
  measurementId:     "G-5GKMRMVHC3"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db      = firebase.firestore();
const auth    = firebase.auth();
const storage = firebase.storage();

// ─── Booking State ─────────────────────────
let currentUser = null;

const bookingState = {
  propertyId:  null,
  property:    null,
  checkIn:     null,
  checkOut:    null,
  guests:      1,
  nights:      0,
  totalPrice:  0,
  basePrice:   0,
  fee:         0,
  maxGuests:   10,
  minNights:   1,
  bookedDates: [],
  lang:        localStorage.getItem('ore_lang') || 'en'
};

// ─── Cached DOM Elements ───────────────────
const els = {
  step1: document.getElementById('step-1'),
  step2: document.getElementById('step-2'),
  step3: document.getElementById('step-3'),
  step4: document.getElementById('step-4'),

  btnNext1:   document.getElementById('btn-next-1'),
  btnNext2:   document.getElementById('btn-next-2'),
  btnPrev2:   document.getElementById('btn-prev-2'),
  btnPrev3:   document.getElementById('btn-prev-3'),
  btnConfirm: document.getElementById('btn-confirm-book'),
  btnMinus:   document.getElementById('btn-minus-guest'),
  btnPlus:    document.getElementById('btn-plus-guest'),
  calPrev:    document.getElementById('cal-prev'),
  calNext:    document.getElementById('cal-next'),

  guestForm:     document.getElementById('guest-form'),
  agreePolicy:   document.getElementById('agree-policy'),
  payRadios:     document.getElementsByName('pay_method'),
  receiptFile:   document.getElementById('receipt-file'),
  transferBox:   document.getElementById('transfer-details'),

  guestCount:     document.getElementById('guests-count'),
  dispCheckin:    document.getElementById('disp-checkin'),
  dispCheckout:   document.getElementById('disp-checkout'),
  dispNights:     document.getElementById('disp-nights'),
  warnEl:         document.getElementById('min-nights-warning'),
  globalAlert:    document.getElementById('booking-global-alert'),
  calGrid:        document.getElementById('calendar-grid'),
  monthLabel:     document.getElementById('calendar-month-label'),
  priceBreakdown: document.getElementById('price-breakdown'),
  sumPlaceholder: document.getElementById('sum-placeholder'),

  gName:      document.getElementById('g-name'),
  gEmail:     document.getElementById('g-email'),
  gPhone:     document.getElementById('g-phone'),
  gNotes:     document.getElementById('g-notes'),
  authPrompt: document.getElementById('auth-prompt'),
  linkLogin:  document.getElementById('link-login-booking'),
};

// ─── Calendar State ────────────────────────
let calViewDate = new Date();
calViewDate.setDate(1);

// ─── Helpers ───────────────────────────────
const t = (en, ar) => bookingState.lang === 'ar' ? ar : en;

function formatDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDisplayDate(str) {
  if (!str) return t('Add date', 'أضف تاريخ');
  return parseLocalDate(str).toLocaleDateString(
    bookingState.lang === 'ar' ? 'ar-DZ' : 'en-GB',
    { day: '2-digit', month: 'short', year: 'numeric' }
  );
}

function showGlobalAlert(msg, type = 'error') {
  const el = els.globalAlert;
  if (!el) return;
  const iconMap = { error: 'warning', success: 'check-circle', info: 'info' };
  el.className = `booking-alert ${type}`;
  el.innerHTML = `<i class="ph ph-${iconMap[type] || 'info'}" aria-hidden="true"></i><span>${msg}</span>`;
  el.classList.remove('d-none');
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideGlobalAlert() {
  els.globalAlert?.classList.add('d-none');
}

function setButtonLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.setAttribute('aria-disabled', String(loading));
  if (loading) {
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-circle-notch ph-spin" aria-hidden="true"></i> ${t('Processing…', 'جارٍ المعالجة…')}`;
  } else {
    btn.innerHTML = btn.dataset.originalHtml || btn.innerHTML;
  }
}

function showWarn(msg) {
  if (!els.warnEl) return;
  els.warnEl.textContent = msg;
  els.warnEl.classList.remove('d-none');
}

function hideWarn() {
  els.warnEl?.classList.add('d-none');
}

function applyStoredTheme() {
  const theme = localStorage.getItem('ore_theme');
  const icon  = document.querySelector('#theme-toggle i');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    if (icon) icon.className = 'ph ph-sun';
  } else {
    document.documentElement.classList.remove('dark');
    if (icon) icon.className = 'ph ph-moon';
  }
}

function showSidebarSkeleton() {
  const nameEl  = document.getElementById('sum-name');
  const locEl   = document.getElementById('sum-loc');
  const priceEl = document.getElementById('sum-price-night');
  const imgEl   = document.getElementById('sum-img');

  if (nameEl)  nameEl.innerHTML  = '<span class="skeleton skeleton-text" style="width:70%;display:inline-block;height:1em;"></span>';
  if (locEl)   locEl.innerHTML   = '<span class="skeleton skeleton-text" style="width:50%;display:inline-block;height:0.8em;"></span>';
  if (priceEl) priceEl.innerHTML = '<span class="skeleton skeleton-text" style="width:40%;display:inline-block;height:0.9em;"></span>';
  if (imgEl)   imgEl.classList.add('skeleton');
}

// ─── Initialization ─────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  bookingState.propertyId = params.get('id');

  if (!bookingState.propertyId) {
    showGlobalAlert(t('No property selected. Redirecting…', 'لم يتم تحديد عقار. جارٍ التحويل…'), 'error');
    setTimeout(() => { window.location.href = 'index.html'; }, 2000);
    return;
  }

  applyStoredTheme();
  translateBookingPage();

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      if (els.gName && !els.gName.value) els.gName.value = user.displayName || '';
      if (els.gEmail && !els.gEmail.value) els.gEmail.value = user.email || '';
      els.authPrompt?.classList.add('d-none');
    } else {
      els.authPrompt?.classList.remove('d-none');
    }
  });

  document.getElementById('back-btn')?.addEventListener('click', () => {
    if (document.referrer && document.referrer.includes(window.location.hostname)) {
      history.back();
    } else {
      window.location.href = `index.html${bookingState.propertyId ? '#prop-' + bookingState.propertyId : ''}`;
    }
  });

  els.linkLogin?.addEventListener('click', e => {
    e.preventDefault();
    if (window.opener) {
      window.opener.postMessage('open-auth-modal', '*');
    } else {
      window.location.href = 'index.html?login=1';
    }
  });

  setupEventListeners();
  showSidebarSkeleton();

  await loadPropertyDetails();
  await loadBookedDates();
  updateGuestCount();
  updatePaymentUI();
  updateBookingSummary();
  renderCalendar();
});

// ─── Load Property Data ─────────────────────
async function loadPropertyDetails() {
  try {
    const doc = await db.collection('properties').doc(String(bookingState.propertyId)).get();
    if (!doc.exists) throw new Error('not-found');

    const propData = doc.data();
    bookingState.property  = propData;
    bookingState.basePrice = Number(propData.price || 0);
    bookingState.minNights = Number(propData.minNights || 1);
    bookingState.maxGuests = Number(propData.maxGuests || 10);

    const isAr  = bookingState.lang === 'ar';
    const title = isAr ? (propData.titleAr || propData.titleEn) : (propData.titleEn || propData.titleAr);
    const loc   = isAr ? (propData.locationAr || propData.locationEn) : (propData.locationEn || propData.locationAr);

    const nameEl  = document.getElementById('sum-name');
    const locEl   = document.getElementById('sum-loc');
    const priceEl = document.getElementById('sum-price-night');
    const imgEl   = document.getElementById('sum-img');

    if (nameEl) nameEl.textContent = title || '—';
    if (priceEl) priceEl.textContent = bookingState.basePrice.toLocaleString() + (isAr ? ' د.ج' : ' DZD');

    if (locEl) {
      locEl.innerHTML = `<i class="ph ph-map-pin" aria-hidden="true"></i><span>${loc || ''}</span>`;
    }

    if (imgEl) {
      const imgSrc = propData.imageUrl || (Array.isArray(propData.images) ? propData.images[0] : '') || 'images/placeholder.jpg';
      imgEl.src = imgSrc;
      imgEl.alt = title || 'Property';
      imgEl.onerror = () => { imgEl.src = 'images/placeholder.jpg'; };
      imgEl.classList.remove('skeleton');
    }

    document.title = `${t('Book', 'احجز')} — ${title || 'OreBooking'}`;
  } catch (err) {
    console.error('[loadPropertyDetails]', err);
    showGlobalAlert(
      t('Could not load property details. Please go back and try again.', 'تعذّر تحميل بيانات العقار. يرجى الرجوع والمحاولة مجدداً.'),
      'error'
    );
  }
}

// ─── Load Booked Dates ──────────────────────
async function loadBookedDates() {
  try {
    const snap = await db.collection('bookings')
      .where('propertyId', '==', String(bookingState.propertyId))
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    bookingState.bookedDates = [];

    snap.forEach(docSnap => {
      const b = docSnap.data();
      if (!b.checkIn || !b.checkOut) return;

      let curr = b.checkIn.toDate();
      const end = b.checkOut.toDate();
      curr.setHours(0, 0, 0, 0);

      while (curr < end) {
        bookingState.bookedDates.push(formatDateStr(curr));
        curr = new Date(curr);
        curr.setDate(curr.getDate() + 1);
      }
    });
  } catch (err) {
    console.error('[loadBookedDates]', err);
  }
}

function isDateBooked(dateStr) {
  return bookingState.bookedDates.includes(dateStr);
}

function hasBookedDatesInRange(startStr, endStr) {
  const start = parseLocalDate(startStr);
  const end   = parseLocalDate(endStr);
  let curr = new Date(start);

  while (curr < end) {
    if (isDateBooked(formatDateStr(curr))) return true;
    curr.setDate(curr.getDate() + 1);
  }
  return false;
}

// ─── Calendar Render ───────────────────────
const MONTH_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_AR = ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const DAYS_EN  = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DAYS_AR  = ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'];

function renderCalendar() {
  const grid = els.calGrid;
  if (!grid) return;
  grid.innerHTML = '';

  const isAr = bookingState.lang === 'ar';
  const m = calViewDate.getMonth();
  const y = calViewDate.getFullYear();

  if (els.monthLabel) {
    els.monthLabel.textContent = `${isAr ? MONTH_AR[m] : MONTH_EN[m]} ${y}`;
  }

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const viewingMonthStart = new Date(y, m, 1);
  if (els.calPrev) {
    els.calPrev.disabled = viewingMonthStart <= currentMonthStart;
  }

  const days = isAr ? DAYS_AR : DAYS_EN;
  days.forEach(d => {
    const el = document.createElement('div');
    el.className = 'cal-day-name';
    el.textContent = d;
    el.setAttribute('aria-hidden', 'true');
    grid.appendChild(el);
  });

  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-cell empty';
    empty.setAttribute('aria-hidden', 'true');
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d);
    const dateStr = formatDateStr(cellDate);
    const isPast = cellDate < today;
    const isBooked = isDateBooked(dateStr);
    const isToday = dateStr === formatDateStr(today);

    const cell = document.createElement('div');
    cell.setAttribute('data-date', dateStr);
    cell.setAttribute('role', 'gridcell');

    const classes = ['cal-cell'];
    if (isToday) classes.push('today');

    if (isPast || isBooked) {
      classes.push('disabled');
      cell.setAttribute('aria-disabled', 'true');
      cell.setAttribute('tabindex', '-1');
      cell.setAttribute('aria-label', `${dateStr} — ${isBooked ? t('Booked','محجوز') : t('Unavailable','غير متاح')}`);
    } else {
      cell.setAttribute('tabindex', '0');
      let stateLabel = dateStr;

      if (dateStr === bookingState.checkIn && dateStr === bookingState.checkOut) {
        classes.push('check-in', 'check-out');
        stateLabel += ` (${t('Check-in & out','وصول ومغادرة')})`;
      } else if (dateStr === bookingState.checkIn) {
        classes.push('check-in');
        stateLabel += ` (${t('Check-in','وصول')})`;
      } else if (dateStr === bookingState.checkOut) {
        classes.push('check-out');
        stateLabel += ` (${t('Checkout','مغادرة')})`;
      } else if (bookingState.checkIn && bookingState.checkOut && dateStr > bookingState.checkIn && dateStr < bookingState.checkOut) {
        classes.push('in-range');
        stateLabel += ` (${t('Selected','محدد')})`;
      } else {
        classes.push('available');
      }

      cell.setAttribute('aria-label', stateLabel);
      cell.addEventListener('click', () => handleDateClick(dateStr));
      cell.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleDateClick(dateStr);
        }
      });
    }

    cell.className = classes.join(' ');
    cell.innerHTML = `<span aria-hidden="true">${d}</span>`;
    grid.appendChild(cell);
  }
}

function handleDateClick(dateStr) {
  hideWarn();

  const bothSelected = bookingState.checkIn && bookingState.checkOut;
  const noneSelected = !bookingState.checkIn;

  if (noneSelected || bothSelected) {
    bookingState.checkIn = dateStr;
    bookingState.checkOut = null;
  } else {
    if (dateStr <= bookingState.checkIn) {
      bookingState.checkIn = dateStr;
      bookingState.checkOut = null;
    } else if (hasBookedDatesInRange(bookingState.checkIn, dateStr)) {
      showWarn(t(
        'There are booked days within this range. Please choose different dates.',
        'يوجد أيام محجوزة ضمن هذه الفترة. يرجى اختيار تواريخ أخرى.'
      ));
      return;
    } else {
      bookingState.checkOut = dateStr;
    }
  }

  updateBookingSummary();
  renderCalendar();
}

// ─── Guests Counter ─────────────────────────
function updateGuestCount() {
  const count = bookingState.guests;
  const max = bookingState.maxGuests;

  if (els.guestCount) els.guestCount.textContent = count;
  if (els.btnMinus) els.btnMinus.disabled = count <= 1;
  if (els.btnPlus) els.btnPlus.disabled = count >= max;

  const hintEl = document.getElementById('guests-max-hint');
  if (hintEl) {
    if (count >= max) {
      hintEl.textContent = t(`Max ${max} guests for this property.`, `الحد الأقصى ${max} ضيوف لهذا العقار.`);
      hintEl.classList.remove('d-none');
    } else {
      hintEl.classList.add('d-none');
    }
  }
}

// ─── Price & Summary Update ─────────────────
function updateBookingSummary() {
  const isAr = bookingState.lang === 'ar';
  const curr = isAr ? 'د.ج' : 'DZD';

  if (els.dispCheckin) els.dispCheckin.textContent = formatDisplayDate(bookingState.checkIn);
  if (els.dispCheckout) els.dispCheckout.textContent = formatDisplayDate(bookingState.checkOut);

  if (!bookingState.checkIn || !bookingState.checkOut) {
    if (els.dispNights) els.dispNights.textContent = '—';
    if (els.btnNext1) {
      els.btnNext1.disabled = true;
      els.btnNext1.setAttribute('aria-disabled', 'true');
    }
    renderSidebarPlaceholder();
    return;
  }

  const d1 = parseLocalDate(bookingState.checkIn);
  const d2 = parseLocalDate(bookingState.checkOut);
  bookingState.nights = Math.round((d2 - d1) / 86400000);

  if (els.dispNights) els.dispNights.textContent = bookingState.nights;

  if (bookingState.nights < bookingState.minNights) {
    showWarn(t(
      `Minimum stay is ${bookingState.minNights} night${bookingState.minNights > 1 ? 's' : ''}.`,
      `الحد الأدنى للإقامة هو ${bookingState.minNights} ${bookingState.minNights === 1 ? 'ليلة' : 'ليالٍ'}.`
    ));
    if (els.btnNext1) {
      els.btnNext1.disabled = true;
      els.btnNext1.setAttribute('aria-disabled', 'true');
    }
    renderSidebarPlaceholder();
    return;
  }

  hideWarn();
  if (els.btnNext1) {
    els.btnNext1.disabled = false;
    els.btnNext1.removeAttribute('aria-disabled');
  }

  const subtotal = bookingState.nights * bookingState.basePrice;
  bookingState.fee = Math.round(subtotal * 0.08);
  bookingState.totalPrice = subtotal + bookingState.fee;

  if (els.priceBreakdown) {
    els.priceBreakdown.innerHTML = `
      <div class="price-row">
        <span>${bookingState.basePrice.toLocaleString()} ${curr} × ${bookingState.nights} ${t('nights','ليالٍ')}</span>
        <span>${subtotal.toLocaleString()} ${curr}</span>
      </div>
      <div class="price-row">
        <span>${t('Service Fee (8%)','رسوم الخدمة (8%)')}</span>
        <span>${bookingState.fee.toLocaleString()} ${curr}</span>
      </div>
      <div class="price-row price-row--total">
        <span class="font-bold">${t('Total','الإجمالي')}</span>
        <span class="font-bold price-highlight">${bookingState.totalPrice.toLocaleString()} ${curr}</span>
      </div>
    `;
  }

  const fmtOpts = { day: '2-digit', month: 'short', year: 'numeric' };
  const locale = isAr ? 'ar-DZ' : 'en-GB';
  const checkInFmt = parseLocalDate(bookingState.checkIn).toLocaleDateString(locale, fmtOpts);
  const checkOutFmt = parseLocalDate(bookingState.checkOut).toLocaleDateString(locale, fmtOpts);

  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  set('rev-val-dates', `${checkInFmt} → ${checkOutFmt}`);
  set('rev-val-nights', `${bookingState.nights} ${t('nights','ليالٍ')}`);
  set('rev-val-guests', `${bookingState.guests} ${t('guests','ضيوف')}`);
  set('rev-val-base', `${subtotal.toLocaleString()} ${curr}`);
  set('rev-val-fees', `${bookingState.fee.toLocaleString()} ${curr}`);
  set('rev-val-total', `${bookingState.totalPrice.toLocaleString()} ${curr}`);
}

function renderSidebarPlaceholder() {
  if (els.priceBreakdown) {
    els.priceBreakdown.innerHTML = `<p class="sum-placeholder-txt" id="sum-placeholder">${t('Select dates to see price details','اختر التواريخ لرؤية تفاصيل السعر')}</p>`;
  }
}

// ─── Step Connectors ───────────────────────
function updateStepConnectors(activeTo) {
  document.querySelectorAll('.step-connector').forEach((con, idx) => {
    con.classList.toggle('completed', idx < activeTo - 1);
  });
}

// ─── Step Navigation ─────────────────────────
function switchStep(from, to) {
  const fromEl = document.getElementById(`step-${from}`);
  const toEl = document.getElementById(`step-${to}`);
  if (!fromEl || !toEl) return;

  fromEl.classList.remove('active');
  toEl.classList.add('active');

  document.querySelectorAll('.step-indicator').forEach(ind => {
    const n = parseInt(ind.getAttribute('data-step'), 10);
    ind.classList.remove('active', 'completed');
    ind.removeAttribute('aria-current');
    if (n < to) ind.classList.add('completed');
    if (n === to) {
      ind.classList.add('active');
      ind.setAttribute('aria-current', 'step');
    }
  });

  updateStepConnectors(to);
  hideGlobalAlert();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Payment Method Toggle ──────────────────
function updatePaymentUI() {
  const selected = document.querySelector('input[name="pay_method"]:checked')?.value || 'cash';

  document.querySelectorAll('.payment-option').forEach(opt => {
    const radio = opt.querySelector('input[type="radio"]');
    opt.classList.toggle('selected', radio?.value === selected);
  });

  if (els.transferBox) {
    els.transferBox.classList.toggle('d-none', selected !== 'transfer');
  }
}

// ─── Receipt File ────────────────────────────
function handleReceiptChange() {
  const file = els.receiptFile?.files[0];
  const displayEl = document.getElementById('receipt-file-name');
  const hintEl = document.getElementById('file-upload-hint');
  if (!file) return;

  const maxMB = 5;
  if (file.size > maxMB * 1024 * 1024) {
    showGlobalAlert(t(`File too large. Max ${maxMB}MB.`, `الملف كبير جداً. الحد الأقصى ${maxMB}MB.`), 'error');
    els.receiptFile.value = '';
    return;
  }

  if (displayEl) displayEl.textContent = `✔ ${file.name}`;
  if (hintEl) hintEl.textContent = file.name;
}

// ─── Form Validation ─────────────────────────
function validateField(input, errId, validFn, msg) {
  if (!input) return true;
  const errEl = document.getElementById(errId);
  const valid = validFn(input.value.trim());
  input.classList.toggle('invalid', !valid);
  if (errEl) {
    errEl.textContent = valid ? '' : msg;
    errEl.classList.toggle('visible', !valid);
  }
  return valid;
}

function validateGuestForm() {
  let ok = true;

  ok = validateField(
    els.gName, 'g-name-err',
    v => v.length >= 2,
    t('Please enter your full name.', 'يرجى إدخال الاسم الكامل.')
  ) && ok;

  ok = validateField(
    els.gEmail, 'g-email-err',
    v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    t('Please enter a valid email address.', 'يرجى إدخال بريد إلكتروني صحيح.')
  ) && ok;

  ok = validateField(
    els.gPhone, 'g-phone-err',
    v => /^[+0-9\s\-()\u0660-\u0669]{7,20}$/.test(v),
    t('Please enter a valid phone number.', 'يرجى إدخال رقم هاتف صحيح.')
  ) && ok;

  return ok;
}

// ─── Event Listeners Setup ──────────────────
function setupEventListeners() {
  els.calPrev?.addEventListener('click', () => {
    calViewDate.setMonth(calViewDate.getMonth() - 1);
    renderCalendar();
  });

  els.calNext?.addEventListener('click', () => {
    calViewDate.setMonth(calViewDate.getMonth() + 1);
    renderCalendar();
  });

  els.btnMinus?.addEventListener('click', () => {
    if (bookingState.guests > 1) {
      bookingState.guests--;
      updateGuestCount();
      updateBookingSummary();
    }
  });

  els.btnPlus?.addEventListener('click', () => {
    if (bookingState.guests < bookingState.maxGuests) {
      bookingState.guests++;
      updateGuestCount();
      updateBookingSummary();
    }
  });

  els.btnNext1?.addEventListener('click', () => switchStep(1, 2));
  els.btnPrev2?.addEventListener('click', () => switchStep(2, 1));
  els.btnNext2?.addEventListener('click', () => switchStep(2, 3));
  els.btnPrev3?.addEventListener('click', () => switchStep(3, 2));

  els.agreePolicy?.addEventListener('change', e => {
    if (els.btnNext2) {
      els.btnNext2.disabled = !e.target.checked;
      els.btnNext2.setAttribute('aria-disabled', String(!e.target.checked));
    }
  });

  els.payRadios.forEach(radio => radio.addEventListener('change', updatePaymentUI));

  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const radio = opt.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    });
  });

  els.receiptFile?.addEventListener('change', handleReceiptChange);

  els.gName?.addEventListener('blur', () =>
    validateField(els.gName, 'g-name-err', v => v.length >= 2, t('Full name required.','الاسم الكامل مطلوب.'))
  );

  els.gEmail?.addEventListener('blur', () =>
    validateField(els.gEmail, 'g-email-err', v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), t('Valid email required.','بريد إلكتروني صحيح مطلوب.'))
  );

  els.gPhone?.addEventListener('blur', () =>
    validateField(els.gPhone, 'g-phone-err', v => /^[+0-9\s\-()\u0660-\u0669]{7,20}$/.test(v), t('Valid phone required.','رقم هاتف صحيح مطلوب.'))
  );

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('ore_theme', isDark ? 'dark' : 'light');
    const icon = document.querySelector('#theme-toggle i');
    if (icon) icon.className = isDark ? 'ph ph-sun' : 'ph ph-moon';
  });

  document.getElementById('lang-toggle')?.addEventListener('click', () => {
    localStorage.setItem('ore_lang', bookingState.lang === 'ar' ? 'en' : 'ar');
    location.reload();
  });

  els.gNotes?.addEventListener('input', () => {
    const counter = document.getElementById('g-notes-counter');
    if (counter) counter.textContent = `${els.gNotes.value.length} / 500`;
  });

  els.guestForm?.addEventListener('submit', handleSubmit);
}

// ─── Form Submission ─────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  hideGlobalAlert();

  if (!validateGuestForm()) {
    showGlobalAlert(t('Please fix the errors above.', 'يرجى تصحيح الأخطاء أعلاه.'), 'error');
    const firstInvalid = els.guestForm.querySelector('.invalid');
    firstInvalid?.focus();
    return;
  }

  const payMethod = document.querySelector('input[name="pay_method"]:checked')?.value || 'cash';
  const isTransfer = payMethod === 'transfer';
  let receiptUrl = null;

  setButtonLoading(els.btnConfirm, true);

  try {
    await loadBookedDates();

    if (hasBookedDatesInRange(bookingState.checkIn, bookingState.checkOut)) {
      showGlobalAlert(t(
        'These dates were just booked by someone else. Please go back and choose new dates.',
        'تم حجز هذه التواريخ للتو من شخص آخر. يرجى الرجوع واختيار تواريخ جديدة.'
      ), 'error');
      setButtonLoading(els.btnConfirm, false);
      setTimeout(() => switchStep(3, 1), 2500);
      return;
    }

    if (isTransfer) {
      const file = els.receiptFile?.files[0];
      if (!file) {
        showGlobalAlert(t('Please upload your transfer receipt.', 'يرجى رفع صورة وصل التحويل.'), 'error');
        setButtonLoading(els.btnConfirm, false);
        return;
      }

      if (!file.type.startsWith('image/')) {
        showGlobalAlert(t('Only image files are accepted for receipt.', 'الوصل يجب أن يكون صورة (jpg, png…).'), 'error');
        setButtonLoading(els.btnConfirm, false);
        return;
      }

      const storageRef = storage.ref(`receipts/${Date.now()}_${file.name}`);
      const uploadSnap = await storageRef.put(file);
      receiptUrl = await uploadSnap.ref.getDownloadURL();
    }

    const isAr = bookingState.lang === 'ar';
    const propTitle = isAr
      ? (bookingState.property?.titleAr || bookingState.property?.titleEn || '')
      : (bookingState.property?.titleEn || bookingState.property?.titleAr || '');

    const nationality = document.getElementById('g-nationality')?.value || '';
    const notesVal = els.gNotes?.value.trim().slice(0, 500) || '';

    const bookingDoc = {
      propertyId:    String(bookingState.propertyId),
      propertyTitle: propTitle,
      checkIn:       firebase.firestore.Timestamp.fromDate(parseLocalDate(bookingState.checkIn)),
      checkOut:      firebase.firestore.Timestamp.fromDate(parseLocalDate(bookingState.checkOut)),
      guests:        bookingState.guests,
      nights:        bookingState.nights,
      basePrice:     bookingState.basePrice,
      serviceFee:    bookingState.fee,
      totalPrice:    bookingState.totalPrice,
      currency:      'DZD',
      guestName:     els.gName.value.trim(),
      guestEmail:    els.gEmail.value.trim().toLowerCase(),
      guestPhone:    els.gPhone.value.trim(),
      nationality:   nationality,
      notes:         notesVal,
      paymentMethod: payMethod,
      receiptUrl:    receiptUrl || null,
      status:        'pending',
      lang:          bookingState.lang,
      userId:        currentUser ? currentUser.uid : null,
      userEmail:     currentUser ? currentUser.email : null,
      createdAt:     firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('bookings').add(bookingDoc);

    populateSuccessScreen(docRef.id, bookingDoc, isAr);
    switchStep(3, 4);
  } catch (err) {
    console.error('[handleSubmit]', err);
    const msg = err.code === 'storage/unauthorized'
      ? t('Upload failed: permission denied.', 'فشل الرفع: غير مصرح.')
      : t('An unexpected error occurred. Please try again.', 'حدث خطأ غير متوقع. يرجى المحاولة مجدداً.');
    showGlobalAlert(msg, 'error');
    setButtonLoading(els.btnConfirm, false);
  }
}

// ─── Success Screen ───────────────────────────
function populateSuccessScreen(docId, data, isAr) {
  const refEl = document.getElementById('ref-number');
  if (refEl) refEl.textContent = '#' + docId.slice(0, 8).toUpperCase();

  const grid = document.getElementById('success-details-grid');
  if (!grid) return;

  const curr = isAr ? 'د.ج' : 'DZD';
  const locale = isAr ? 'ar-DZ' : 'en-GB';
  const fmtLong = { day: '2-digit', month: 'long', year: 'numeric' };

  const ciDate = parseLocalDate(bookingState.checkIn).toLocaleDateString(locale, fmtLong);
  const coDate = parseLocalDate(bookingState.checkOut).toLocaleDateString(locale, fmtLong);

  const cards = [
    [t('Check-in', 'الوصول'), ciDate],
    [t('Checkout', 'المغادرة'), coDate],
    [t('Guests', 'الضيوف'), `${data.guests}`],
    [t('Nights', 'الليالي'), `${data.nights}`],
    [t('Total', 'الإجمالي'), `${data.totalPrice.toLocaleString()} ${curr}`],
    [t('Payment', 'الدفع'), data.paymentMethod === 'cash' ? t('Pay at Property','عند الوصول') : t('Bank Transfer','تحويل بنكي')],
    [t('Status', 'الحالة'), `<span class="status-badge pending"><i class="ph-fill ph-clock" aria-hidden="true"></i> ${t('Pending','قيد الانتظار')}</span>`],
    [t('Name', 'الاسم'), data.guestName],
    [t('Email', 'البريد'), data.guestEmail],
    [t('Phone', 'الهاتف'), data.guestPhone],
  ];

  grid.innerHTML = cards.map(([label, value]) => `
    <div class="confirm-detail-card">
      <p class="confirm-detail-label">${label}</p>
      <p class="confirm-detail-value">${value}</p>
    </div>
  `).join('');
}

// ─── Translations ────────────────────────────
function translateBookingPage() {
  if (bookingState.lang !== 'ar') return;

  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');

  const s = (id, txt) => {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  };

  const h = (id, html) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  };

  s('nav-back-txt', 'العودة للعقار');

  const langBtn = document.getElementById('lang-toggle');
  if (langBtn) {
    const sp = langBtn.querySelector('span');
    if (sp) sp.textContent = 'English';
  }

  s('lbl-step1', 'التواريخ والضيوف');
  s('lbl-step2', 'المراجعة والدفع');
  s('lbl-step3', 'بيانات الضيف');
  s('lbl-step4', 'التأكيد');

  s('st-title-1', 'متى ستسافر؟');
  s('st-sub-1', 'اختر تاريخ الوصول والمغادرة.');
  s('lbl-chk-in', 'تاريخ الوصول');
  s('lbl-nights', 'الليالي');
  s('lbl-chk-out', 'تاريخ المغادرة');
  s('lbl-who-coming', 'من القادم؟');
  s('lbl-guests-title', 'الضيوف');
  s('lbl-guests-sub', 'أعمار سنتين فأكثر');
  h('btn-next-1-txt', 'الخطوة التالية');

  s('st-title-2', 'المراجعة والدفع');
  s('st-sub-2', 'راجع التفاصيل واختر طريقة الدفع.');
  s('rev-dates', 'التواريخ');
  s('rev-nights-lbl', 'الليالي');
  s('rev-guests', 'الضيوف');
  s('rev-base', 'المجموع الفرعي');
  s('rev-fees', 'رسوم الخدمة (8%)');
  s('rev-total', 'الإجمالي');
  s('lbl-pay-method', 'طريقة الدفع');
  s('lbl-pay-cash', 'الدفع عند الوصول');
  s('desc-pay-cash', 'ادفع المبلغ كاملاً عند وصولك للعقار.');
  s('lbl-pay-transfer', 'تحويل بنكي / بريدي');
  s('desc-pay-transfer', 'قم بالتحويل لحسابنا وارفع صورة الوصل.');
  s('txt-bank-info', 'يرجى تحويل المبلغ الإجمالي إلى الحساب التالي:');
  s('lbl-receipt', 'رفع صورة الوصل');
  s('file-upload-hint', 'انقر أو اسحب لرفع الوصل');
  s('lbl-bank-name', 'اسم الحساب');
  s('lbl-policy-title', 'أوافق على سياسة الإلغاء');
  s('lbl-policy-desc', 'إلغاء مجاني حتى 48 ساعة قبل الوصول. بعد ذلك، تُستقطع رسوم أول ليلة.');
  s('btn-back-2', 'رجوع');
  h('btn-next-2-txt', 'الخطوة التالية');

  s('st-title-3', 'من يقوم بالحجز؟');
  s('st-sub-3', 'أدخل بيانات التواصل الخاصة بك.');
  h('lbl-fname', 'الاسم الكامل <span class="req-star" aria-hidden="true">*</span>');
  h('lbl-email', 'البريد الإلكتروني <span class="req-star" aria-hidden="true">*</span>');
  h('lbl-phone', 'رقم الهاتف <span class="req-star" aria-hidden="true">*</span>');
  h('lbl-nationality', 'الجنسية');
  h('lbl-notes', 'طلبات خاصة <span class="optional-tag">(اختياري)</span>');

  const notesHint = document.getElementById('g-notes-hint');
  const notesCounter = document.getElementById('g-notes-counter');
  if (notesHint) notesHint.textContent = 'الحد الأقصى 500 حرف. الطلبات غير مضمونة.';
  if (notesCounter) notesCounter.textContent = '0 / 500';

  document.getElementById('g-name')?.setAttribute('placeholder', 'محمد الأمين');
  document.getElementById('g-email')?.setAttribute('placeholder', 'example@email.com');
  document.getElementById('g-phone')?.setAttribute('placeholder', '+213 5XX XXX XXX');
  document.getElementById('g-notes')?.setAttribute('placeholder', 'أي احتياجات خاصة أو وقت وصول متوقع؟');

  s('txt-auth-prompt', 'هل لديك حساب؟ سجّل الدخول لحجز أسرع ومتابعة حجوزاتك.');
  s('link-login-booking', 'تسجيل الدخول / إنشاء حساب');
  s('btn-back-3', 'رجوع');
  s('btn-confirm-txt', 'تأكيد الحجز');

  s('st-title-4', 'تم استلام طلبك!');
  s('st-sub-4', 'شكراً لاختيارك OreBooking. استلمنا طلبك وسنؤكده قريباً.');
  s('lbl-ref', 'رقم الحجز');
  s('btn-go-home', 'العودة للرئيسية');
  s('btn-print-txt', 'طباعة التأكيد');

  s('sum-title', 'ملخص الحجز');
  s('sum-night-lbl', 'ليلة');
  s('txt-secure', 'حجز آمن ومشفر');

  const sumPl = document.getElementById('sum-placeholder');
  if (sumPl) sumPl.textContent = 'اختر التواريخ لرؤية تفاصيل السعر';
}
