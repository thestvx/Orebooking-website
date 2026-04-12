// =========================================
//   Advanced Booking Logic — booking.js
// =========================================

// 1. Firebase Auth State & DB
const db = firebase.firestore();
let currentUser = null;

// 2. Booking State
const bookingState = {
  propertyId: null,
  property: null,
  checkIn: null,
  checkOut: null,
  guests: 1,
  nights: 0,
  totalPrice: 0,
  basePrice: 0,
  fee: 0,
  bookedDates: [], // Array of string dates 'YYYY-MM-DD' that are already booked
  minNights: 1,
  lang: localStorage.getItem('ore_lang') || 'en'
};

// 3. UI Elements
const els = {
  step1: document.getElementById('step-1'),
  step2: document.getElementById('step-2'),
  step3: document.getElementById('step-3'),
  step4: document.getElementById('step-4'),

  btnNext1: document.getElementById('btn-next-1'),
  btnNext2: document.getElementById('btn-next-2'),
  btnPrev2: document.getElementById('btn-prev-2'),
  btnPrev3: document.getElementById('btn-prev-3'),

  agreePolicy: document.getElementById('agree-policy'),
  payRadios: document.getElementsByName('pay_method'),
  transferDetails: document.getElementById('transfer-details'),

  guestForm: document.getElementById('guest-form'),
  btnConfirm: document.getElementById('btn-confirm-book')
};

// 4. Initialization
document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  bookingState.propertyId = urlParams.get('id');

  if (!bookingState.propertyId) {
    alert(bookingState.lang === 'ar' ? 'لم يتم تحديد عقار!' : 'No property selected!');
    window.location.href = 'index.html';
    return;
  }

  translateBookingPage();
  setupEventListeners();

  auth.onAuthStateChanged(user => {
    currentUser = user;
    if (user) {
      document.getElementById('g-name').value = user.displayName || '';
      document.getElementById('g-email').value = user.email || '';
      document.getElementById('auth-prompt').style.display = 'none';
    } else {
      document.getElementById('auth-prompt').style.display = 'block';
    }
  });

  await loadPropertyDetails();
  await loadBookedDates();
  renderCalendar();
});

// 5. Load Property Data
async function loadPropertyDetails() {
  try {
    let propData;

    // Check if ID is numeric (mock data) or string (Firestore)
    if (!isNaN(bookingState.propertyId) && typeof properties !== 'undefined') {
      const p = properties.find(x => x.id == bookingState.propertyId);
      if(p) {
        propData = {
          titleAr: p.title_ar, titleEn: p.title_en,
          locationAr: p.location_ar, locationEn: p.location_en,
          price: p.price, imageUrl: p.image
        };
      }
    } else {
      const doc = await db.collection('properties').doc(bookingState.propertyId).get();
      if (doc.exists) propData = doc.data();
    }

    if (!propData) throw new Error("Property not found");

    bookingState.property = propData;
    bookingState.basePrice = Number(propData.price || 0);

    // Update Summary UI
    const isAr = bookingState.lang === 'ar';
    document.getElementById('sum-name').textContent = isAr ? (propData.titleAr || propData.titleEn) : (propData.titleEn || propData.titleAr);
    document.getElementById('sum-loc').textContent = isAr ? propData.locationAr : propData.locationEn;
    document.getElementById('sum-price-night').textContent = bookingState.basePrice.toLocaleString() + ' DZD';
    document.getElementById('sum-img').src = propData.imageUrl || propData.images?.[0] || 'images/placeholder.jpg';

  } catch (err) {
    console.error(err);
    alert(bookingState.lang === 'ar' ? 'عذراً، لم نتمكن من تحميل بيانات العقار.' : 'Sorry, could not load property details.');
  }
}

// 6. Load Booked Dates from Firestore
async function loadBookedDates() {
  try {
    const snap = await db.collection('bookings')
      .where('propertyId', '==', bookingState.propertyId)
      .where('status', 'in', ['pending', 'confirmed'])
      .get();

    bookingState.bookedDates = [];

    snap.forEach(doc => {
      const b = doc.data();
      if (!b.checkIn || !b.checkOut) return;

      let start = b.checkIn.toDate();
      let end = b.checkOut.toDate();

      // Add all dates between checkIn and checkOut to bookedDates array
      let curr = new Date(start);
      while (curr < end) { // Don't block the checkout day itself so others can check in
        bookingState.bookedDates.push(formatDateStr(curr));
        curr.setDate(curr.getDate() + 1);
      }
    });
  } catch (err) {
    console.error("Error loading booked dates:", err);
  }
}

// 7. Calendar Logic (Prevent Double Booking)
let currentDate = new Date();
currentDate.setDate(1); // Set to first of month for rendering

function formatDateStr(dateObj) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isDateBooked(dateStr) {
  return bookingState.bookedDates.includes(dateStr);
}

function hasBookedDatesInRange(startStr, endStr) {
  let start = new Date(startStr);
  let end = new Date(endStr);
  let curr = new Date(start);

  while (curr < end) {
    if (isDateBooked(formatDateStr(curr))) return true;
    curr.setDate(curr.getDate() + 1);
  }
  return false;
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const isAr = bookingState.lang === 'ar';
  const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthNamesAr = ['جانفي','فيفري','مارس','أفريل','ماي','جوان','جويلية','أوت','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  const m = currentDate.getMonth();
  const y = currentDate.getFullYear();

  document.getElementById('calendar-month-label').textContent = `${isAr ? monthNamesAr[m] : monthNamesEn[m]} ${y}`;

  const daysEn = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const daysAr = ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'];
  const daysArr = isAr ? daysAr : daysEn;

  daysArr.forEach(d => {
    grid.innerHTML += `<div class="cal-day-name">${d}</div>`;
  });

  const firstDayIndex = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  const today = new Date();
  today.setHours(0,0,0,0);

  for (let i = 0; i < firstDayIndex; i++) {
    grid.innerHTML += `<div class="cal-cell empty"></div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(y, m, d);
    const dateStr = formatDateStr(cellDate);
    const isPast = cellDate < today;
    const isBooked = isDateBooked(dateStr);

    let stateClass = 'available';
    if (isPast || isBooked) stateClass = 'disabled';

    if (bookingState.checkIn === dateStr) stateClass += ' check-in';
    else if (bookingState.checkOut === dateStr) stateClass += ' check-out';
    else if (bookingState.checkIn && bookingState.checkOut && dateStr > bookingState.checkIn && dateStr < bookingState.checkOut) {
      stateClass += ' in-range';
    }

    grid.innerHTML += `
      <div class="cal-cell ${stateClass}" data-date="${dateStr}">
        <span>${d}</span>
      </div>
    `;
  }

  // Add click events to active cells
  document.querySelectorAll('.cal-cell.available, .cal-cell.check-in, .cal-cell.check-out, .cal-cell.in-range').forEach(cell => {
    cell.addEventListener('click', () => handleDateClick(cell.getAttribute('data-date')));
  });
}

function handleDateClick(dateStr) {
  const isAr = bookingState.lang === 'ar';
  const warnEl = document.getElementById('min-nights-warning');
  warnEl.style.display = 'none';

  if (!bookingState.checkIn || (bookingState.checkIn && bookingState.checkOut)) {
    // Start new selection
    bookingState.checkIn = dateStr;
    bookingState.checkOut = null;
  } else {
    // Select checkout
    if (dateStr <= bookingState.checkIn) {
      bookingState.checkIn = dateStr; // Reset start date if clicking before
    } else {
      // Check for conflicts in range
      if (hasBookedDatesInRange(bookingState.checkIn, dateStr)) {
        warnEl.textContent = isAr ? 'عذراً، يوجد أيام محجوزة ضمن هذه الفترة.' : 'Sorry, there are booked days in this range.';
        warnEl.style.display = 'block';
        return;
      }
      bookingState.checkOut = dateStr;
    }
  }

  updateBookingSummary();
  renderCalendar();
}

document.getElementById('cal-prev').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

// 8. Guests Counter
document.getElementById('btn-minus-guest').addEventListener('click', () => {
  if (bookingState.guests > 1) {
    bookingState.guests--;
    document.getElementById('guests-count').textContent = bookingState.guests;
    updateBookingSummary();
  }
});
document.getElementById('btn-plus-guest').addEventListener('click', () => {
  if (bookingState.guests < 10) { // Max 10 guests logic
    bookingState.guests++;
    document.getElementById('guests-count').textContent = bookingState.guests;
    updateBookingSummary();
  }
});

// 9. Update Summary & Prices
function updateBookingSummary() {
  document.getElementById('disp-checkin').textContent = bookingState.checkIn || (bookingState.lang==='ar'?'أضف تاريخ':'Add date');
  document.getElementById('disp-checkout').textContent = bookingState.checkOut || (bookingState.lang==='ar'?'أضف تاريخ':'Add date');

  if (bookingState.checkIn && bookingState.checkOut) {
    const d1 = new Date(bookingState.checkIn);
    const d2 = new Date(bookingState.checkOut);
    const diffTime = Math.abs(d2 - d1);
    bookingState.nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    document.getElementById('disp-nights').textContent = bookingState.nights;

    // Check min nights
    const warnEl = document.getElementById('min-nights-warning');
    if (bookingState.nights < bookingState.minNights) {
      warnEl.textContent = bookingState.lang==='ar' ? `الحد الأدنى للحجز هو ${bookingState.minNights} ليلة.` : `Minimum stay is ${bookingState.minNights} nights.`;
      warnEl.style.display = 'block';
      els.btnNext1.disabled = true;
      return;
    }

    els.btnNext1.disabled = false;

    // Calculate Prices
    const subtotal = bookingState.nights * bookingState.basePrice;
    bookingState.fee = Math.round(subtotal * 0.08); // 8% service fee
    bookingState.totalPrice = subtotal + bookingState.fee;

    const isAr = bookingState.lang === 'ar';
    const curr = isAr ? 'د.ج' : 'DZD';

    // Update Sidebar Breakdown
    document.getElementById('sum-placeholder').style.display = 'none';
    document.getElementById('price-breakdown').innerHTML = `
      <div class="price-row">
        <span>${bookingState.basePrice.toLocaleString()} ${curr} × ${bookingState.nights} ${isAr ? 'ليالي' : 'nights'}</span>
        <span>${subtotal.toLocaleString()} ${curr}</span>
      </div>
      <div class="price-row">
        <span>${isAr ? 'رسوم الخدمة' : 'Service Fee'}</span>
        <span>${bookingState.fee.toLocaleString()} ${curr}</span>
      </div>
      <div class="price-row total">
        <span>${isAr ? 'الإجمالي' : 'Total'}</span>
        <span>${bookingState.totalPrice.toLocaleString()} ${curr}</span>
      </div>
    `;

    // Update Step 2 Review details
    document.getElementById('rev-val-dates').textContent = `${bookingState.checkIn} → ${bookingState.checkOut} (${bookingState.nights} ${isAr?'ليالي':'nights'})`;
    document.getElementById('rev-val-guests').textContent = `${bookingState.guests} ${isAr?'ضيوف':'guests'}`;
    document.getElementById('rev-val-total').textContent = `${bookingState.totalPrice.toLocaleString()} ${curr}`;

  } else {
    document.getElementById('disp-nights').textContent = '-';
    els.btnNext1.disabled = true;
    document.getElementById('sum-placeholder').style.display = 'block';
    document.getElementById('price-breakdown').innerHTML = `<div class="price-placeholder" id="sum-placeholder">Select dates to see price details</div>`;
  }
}

// 10. Navigation & Steps Logic
function switchStep(from, to) {
  els[`step${from}`].classList.remove('active');
  els[`step${to}`].classList.add('active');

  // Update Indicators
  document.querySelectorAll('.step-indicator').forEach(ind => {
    const num = parseInt(ind.getAttribute('data-step'));
    ind.classList.remove('active', 'completed');
    if (num < to) ind.classList.add('completed');
    if (num === to) ind.classList.add('active');
  });
  window.scrollTo({top: 0, behavior: 'smooth'});
}

// Payment method toggle
els.payRadios.forEach(radio => {
  radio.addEventListener('change', (e) => {
    if (e.target.value === 'transfer') {
      els.transferDetails.style.display = 'block';
    } else {
      els.transferDetails.style.display = 'none';
    }
  });
});

// Policy checkbox
els.agreePolicy.addEventListener('change', (e) => {
  els.btnNext2.disabled = !e.target.checked;
});

els.btnNext1.addEventListener('click', () => switchStep(1, 2));
els.btnPrev2.addEventListener('click', () => switchStep(2, 1));
els.btnNext2.addEventListener('click', () => switchStep(2, 3));
els.btnPrev3.addEventListener('click', () => switchStep(3, 2));

// 11. Final Submission
els.guestForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payMethod = document.querySelector('input[name="pay_method"]:checked').value;
  const isTransfer = payMethod === 'transfer';
  let receiptUrl = null;

  els.btnConfirm.disabled = true;
  els.btnConfirm.innerHTML = `<i class="ph ph-spinner ph-spin"></i> ${bookingState.lang === 'ar' ? 'جارٍ المعالجة...' : 'Processing...'}`;

  try {
    // Re-verify availability exactly before booking (Real-time safety)
    await loadBookedDates();
    if (hasBookedDatesInRange(bookingState.checkIn, bookingState.checkOut)) {
      alert(bookingState.lang === 'ar' ? 'عذراً، هذه التواريخ تم حجزها للتو من قبل شخص آخر. يرجى اختيار تواريخ جديدة.' : 'Sorry, these dates were just booked by someone else. Please choose new dates.');
      switchStep(3, 1);
      els.btnConfirm.disabled = false;
      els.btnConfirm.innerHTML = `<i class="ph ph-check-circle"></i> ${bookingState.lang === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}`;
      return;
    }

    // Handle receipt upload if transfer
    if (isTransfer) {
      const fileInput = document.getElementById('receipt-file');
      if (!fileInput.files[0]) {
        alert(bookingState.lang === 'ar' ? 'يرجى رفع وصل التحويل' : 'Please upload the transfer receipt');
        els.btnConfirm.disabled = false;
        els.btnConfirm.innerHTML = `<i class="ph ph-check-circle"></i> ${bookingState.lang === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}`;
        return;
      }

      const file = fileInput.files[0];
      const storageRef = firebase.storage().ref(`receipts/${Date.now()}_${file.name}`);
      const uploadTask = await storageRef.put(file);
      receiptUrl = await uploadTask.ref.getDownloadURL();
    }

    const bookingData = {
      propertyId: String(bookingState.propertyId),
      propertyTitle: bookingState.lang === 'ar' ? (bookingState.property.titleAr || bookingState.property.titleEn) : (bookingState.property.titleEn || bookingState.property.titleAr),
      checkIn: firebase.firestore.Timestamp.fromDate(new Date(bookingState.checkIn)),
      checkOut: firebase.firestore.Timestamp.fromDate(new Date(bookingState.checkOut)),
      guests: bookingState.guests,
      nights: bookingState.nights,
      totalPrice: bookingState.totalPrice,
      guestName: document.getElementById('g-name').value.trim(),
      guestEmail: document.getElementById('g-email').value.trim(),
      guestPhone: document.getElementById('g-phone').value.trim(),
      notes: document.getElementById('g-notes').value.trim(),
      paymentMethod: payMethod,
      receiptUrl: receiptUrl,
      status: 'pending',
      userId: currentUser ? currentUser.uid : null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection('bookings').add(bookingData);

    // Success
    document.getElementById('ref-number').textContent = '#' + docRef.id.slice(0, 8).toUpperCase();
    switchStep(3, 4);

  } catch (err) {
    console.error("Booking failed:", err);
    alert(bookingState.lang === 'ar' ? 'حدث خطأ غير متوقع. حاول مرة أخرى.' : 'An unexpected error occurred. Please try again.');
    els.btnConfirm.disabled = false;
    els.btnConfirm.innerHTML = `<i class="ph ph-check-circle"></i> ${bookingState.lang === 'ar' ? 'تأكيد الحجز' : 'Confirm Booking'}`;
  }
});

// 12. Translations
function translateBookingPage() {
  if (bookingState.lang !== 'ar') return;

  document.documentElement.dir = 'rtl';
  document.getElementById('nav-back-txt').textContent = 'العودة للعقار';

  document.getElementById('lbl-step1').textContent = 'التواريخ والضيوف';
  document.getElementById('lbl-step2').textContent = 'المراجعة والدفع';
  document.getElementById('lbl-step3').textContent = 'بيانات الضيف';
  document.getElementById('lbl-step4').textContent = 'التأكيد';

  document.getElementById('st-title-1').textContent = 'متى ستسافر؟';
  document.getElementById('st-sub-1').textContent = 'اختر تاريخ الوصول والمغادرة.';
  document.getElementById('lbl-chk-in').textContent = 'الوصول';
  document.getElementById('lbl-nights').textContent = 'الليالي';
  document.getElementById('lbl-chk-out').textContent = 'المغادرة';

  document.getElementById('lbl-who-coming').textContent = 'من القادم؟';
  document.getElementById('lbl-guests-title').textContent = 'الضيوف';
  document.getElementById('lbl-guests-sub').textContent = 'أعمار سنتين فما فوق';
  els.btnNext1.innerHTML = 'الخطوة التالية <i class="ph ph-arrow-left"></i>'; // Arrow left for RTL

  document.getElementById('st-title-2').textContent = 'المراجعة والدفع';
  document.getElementById('st-sub-2').textContent = 'راجع تفاصيل الحجز واختر طريقة الدفع.';
  document.getElementById('rev-dates').textContent = 'التواريخ';
  document.getElementById('rev-guests').textContent = 'الضيوف';
  document.getElementById('rev-total').textContent = 'الإجمالي (د.ج)';

  document.getElementById('lbl-pay-method').textContent = 'طريقة الدفع';
  document.getElementById('lbl-pay-cash').textContent = 'الدفع عند الوصول';
  document.getElementById('desc-pay-cash').textContent = 'ادفع المبلغ كاملاً عند وصولك للعقار.';
  document.getElementById('lbl-pay-transfer').textContent = 'تحويل بنكي / بريدي';
  document.getElementById('desc-pay-transfer').textContent = 'قم بالتحويل لحسابنا وارفع صورة الوصل.';
  document.getElementById('txt-bank-info').textContent = 'يرجى تحويل المبلغ الإجمالي إلى الحساب التالي:';
  document.getElementById('lbl-receipt').textContent = 'رفع صورة الوصل';

  document.getElementById('lbl-policy-title').textContent = 'أوافق على سياسة الإلغاء';
  document.getElementById('lbl-policy-desc').textContent = 'إلغاء مجاني حتى 48 ساعة قبل الوصول. بعد ذلك، الليلة الأولى غير مستردة.';

  document.getElementById('btn-back-2').textContent = 'رجوع';
  els.btnNext2.innerHTML = 'الخطوة التالية <i class="ph ph-arrow-left"></i>';

  document.getElementById('st-title-3').textContent = 'من يقوم بالحجز؟';
  document.getElementById('st-sub-3').textContent = 'أدخل بيانات التواصل الخاصة بك.';
  document.getElementById('lbl-fname').innerHTML = 'الاسم الكامل <span class="req">*</span>';
  document.getElementById('lbl-email').innerHTML = 'البريد الإلكتروني <span class="req">*</span>';
  document.getElementById('lbl-phone').innerHTML = 'رقم الهاتف <span class="req">*</span>';
  document.getElementById('lbl-notes').textContent = 'طلبات خاصة (اختياري)';
  document.getElementById('txt-auth-prompt').textContent = 'هل لديك حساب؟ سجل الدخول لحجز أسرع وتتبع حجوزاتك.';
  document.getElementById('link-login-booking').textContent = 'تسجيل الدخول';

  document.getElementById('btn-back-3').textContent = 'رجوع';
  document.getElementById('btn-confirm-txt').textContent = 'تأكيد الحجز';

  document.getElementById('st-title-4').textContent = 'تم تأكيد الحجز!';
  document.getElementById('st-sub-4').textContent = 'شكراً لاختيارك OreBooking. لقد استلمنا طلبك.';
  document.getElementById('lbl-ref').textContent = 'رقم الحجز';
  document.getElementById('btn-go-home').textContent = 'العودة للرئيسية';

  document.getElementById('sum-title').textContent = 'ملخص الحجز';
  document.getElementById('sum-night-lbl').textContent = 'ليلة';
  document.getElementById('sum-placeholder').textContent = 'اختر التواريخ لرؤية السعر';
  document.getElementById('txt-secure').textContent = 'حجز آمن ومشفر';
}
