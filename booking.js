/**
 * Complete Booking Logic - OreBooking
 */

// 1. Firebase Init & Auth (Assumes firebase is loaded globally via HTML)
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

let currentUser = null;
let currentProperty = null;
let propertyId = new URLSearchParams(window.location.search).get('id');

// Booking State
let bookingState = {
  checkIn: null,
  checkOut: null,
  nights: 0,
  rooms: 1,
  adults: 2,
  children: 0,
  childAges: [],
  bedConfig: 'double',
  addons: [], // Array of selected addon IDs
  restaurantPlan: 'none', // none, breakfast, half, full
  receiptFile: null,
  payMethod: 'cash',
  basePrice: 0,
  totalPrice: 0
};

// Available Add-ons Definitions
const ADDONS_CONFIG = [
  { id: 'wifi', icon: 'ph-wifi-high', name: 'Premium WiFi', desc: 'High-speed internet access per room per night', price: 500, type: 'per_room_night' },
  { id: 'parking', icon: 'ph-car', name: 'Secure Parking', desc: 'Reserved parking spot per night', price: 800, type: 'per_night' },
  { id: 'spa', icon: 'ph-flower-lotus', name: 'Spa Access', desc: 'Unlimited spa access per person per night', price: 1500, type: 'per_person_night' },
  { id: 'transfer', icon: 'ph-airplane-tilt', name: 'Airport Transfer', desc: 'One-way pickup from the airport', price: 2500, type: 'fixed' },
  { id: 'entertainment', icon: 'ph-confetti', name: 'Evening Events', desc: 'Access to nightly entertainment programs', price: 1000, type: 'per_person_night' },
  { id: 'late_checkout', icon: 'ph-clock', name: 'Late Check-out', desc: 'Check out up to 4:00 PM', price: 2000, type: 'per_room' }
];

const RESTAURANT_PLANS = [
  { id: 'none', label: 'No Meals Included', price: 0 },
  { id: 'breakfast', label: 'Breakfast Only', price: 800 },
  { id: 'half', label: 'Half Board (Breakfast & Dinner)', price: 2500 },
  { id: 'full', label: 'Full Board (All meals)', price: 4000 }
];

// Initialize on Load
document.addEventListener('DOMContentLoaded', async () => {
  if (!propertyId) {
    showGlobalAlert('No property selected. Redirecting...', 'error');
    setTimeout(() => window.location.href = 'index.html', 2000);
    return;
  }

  setupAuth();
  await loadPropertyDetails();
  initCalendar();
  initCounters();
  initAddonsPanel();
  initReviews();
  setupNavigation();
  updateSummarySidebar();
});

// Auth Setup
function setupAuth() {
  auth.onAuthStateChanged(user => {
    currentUser = user;
    const authPrompt = document.getElementById('auth-prompt');
    if (user) {
      authPrompt?.classList.add('d-none');
      if (document.getElementById('g-name')) document.getElementById('g-name').value = user.displayName || '';
      if (document.getElementById('g-email')) document.getElementById('g-email').value = user.email || '';
    } else {
      authPrompt?.classList.remove('d-none');
    }
  });
}

// Load Property Data
async function loadPropertyDetails() {
  try {
    const doc = await db.collection('properties').doc(propertyId).get();
    if (!doc.exists) throw new Error('Property not found');
    currentProperty = doc.data();
    bookingState.basePrice = currentProperty.price || 5000;

    document.getElementById('sum-name').textContent = currentProperty.title || 'Hotel Stay';
    document.getElementById('sum-loc').innerHTML = `<i class="ph ph-map-pin"></i> <span>${currentProperty.location || 'Unknown'}</span>`;
    document.getElementById('sum-price-night').textContent = `${bookingState.basePrice.toLocaleString()} DZD`;
    if(currentProperty.images && currentProperty.images.length > 0) {
      document.getElementById('sum-img').src = currentProperty.images[0];
    }
  } catch (error) {
    showGlobalAlert(error.message, 'error');
  }
}

// Global Alerts
function showGlobalAlert(msg, type = 'info') {
  const alertBox = document.getElementById('booking-global-alert');
  alertBox.className = `booking-alert ${type}`;
  alertBox.innerHTML = `<i class="ph ph-info"></i> <span>${msg}</span>`;
  alertBox.classList.remove('d-none');
  setTimeout(() => alertBox.classList.add('d-none'), 5000);
}

// Formatting
function formatDate(date) {
  if (!date) return 'Add date';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Navigation (Steps)
let currentStep = 1;
function goToStep(step) {
  document.querySelectorAll('.booking-step').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.step-indicator').forEach(el => {
    let s = parseInt(el.getAttribute('data-step'));
    if (s === step) el.classList.add('active');
    else el.classList.remove('active');
    if (s < step) el.classList.add('completed');
    else el.classList.remove('completed');
  });

  document.querySelectorAll('.step-connector').forEach((el, index) => {
    if (index < step - 1) el.classList.add('completed');
    else el.classList.remove('completed');
  });

  document.getElementById(`step-${step}`).classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  currentStep = step;

  if(step === 2) updateAddonsAndReview();
}

function setupNavigation() {
  document.getElementById('btn-next-1').addEventListener('click', () => {
    if(!bookingState.checkIn || !bookingState.checkOut) {
      document.getElementById('min-nights-warning').textContent = 'Please select check-in and check-out dates.';
      document.getElementById('min-nights-warning').classList.remove('d-none');
      return;
    }
    goToStep(2);
  });
  document.getElementById('btn-prev-2').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-next-2').addEventListener('click', () => goToStep(3));
  document.getElementById('btn-prev-3').addEventListener('click', () => goToStep(2));

  // Payment methods
  document.querySelectorAll('input[name="pay_method"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      bookingState.payMethod = e.target.value;
      document.querySelectorAll('.payment-option').forEach(opt => opt.classList.remove('selected'));
      e.target.closest('.payment-option').classList.add('selected');

      const transferDetails = document.getElementById('transfer-details');
      if (e.target.value === 'transfer') {
        transferDetails.classList.remove('d-none');
      } else {
        transferDetails.classList.add('d-none');
      }
      validateStep2();
    });
  });

  document.getElementById('agree-policy').addEventListener('change', validateStep2);

  // File upload
  document.getElementById('receipt-file').addEventListener('change', (e) => {
    if(e.target.files.length > 0) {
      bookingState.receiptFile = e.target.files[0];
      document.getElementById('receipt-file-name').textContent = bookingState.receiptFile.name;
    }
    validateStep2();
  });

  // Form Submit
  document.getElementById('guest-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if(!e.target.checkValidity()) {
      e.stopPropagation();
      return;
    }
    await processBooking();
  });
}

function validateStep2() {
  const policyAgreed = document.getElementById('agree-policy').checked;
  let canProceed = policyAgreed;
  if(bookingState.payMethod === 'transfer' && !bookingState.receiptFile) {
    canProceed = false;
  }
  document.getElementById('btn-next-2').disabled = !canProceed;
}

/* ========================================================
   CALENDAR LOGIC
======================================================== */
let currentDate = new Date();
currentDate.setHours(0,0,0,0);
let displayMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

function initCalendar() {
  document.getElementById('cal-prev').addEventListener('click', () => {
    displayMonth.setMonth(displayMonth.getMonth() - 1);
    renderCalendar();
  });
  document.getElementById('cal-next').addEventListener('click', () => {
    displayMonth.setMonth(displayMonth.getMonth() + 1);
    renderCalendar();
  });
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  grid.innerHTML = '';

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  document.getElementById('calendar-month-label').textContent = `${monthNames[displayMonth.getMonth()]} ${displayMonth.getFullYear()}`;

  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  days.forEach(d => {
    let div = document.createElement('div');
    div.className = 'cal-day-name';
    div.textContent = d;
    grid.appendChild(div);
  });

  const firstDayIndex = displayMonth.getDay();
  const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    let div = document.createElement('div');
    div.className = 'cal-cell empty';
    grid.appendChild(div);
  }

  let today = new Date();
  today.setHours(0,0,0,0);

  for (let d = 1; d <= daysInMonth; d++) {
    let cellDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), d);
    let div = document.createElement('div');
    div.className = 'cal-cell available';
    div.textContent = d;

    if (cellDate < today) {
      div.classList.add('disabled');
      div.classList.remove('available');
    }
    if (cellDate.getTime() === today.getTime()) div.classList.add('today');

    if (bookingState.checkIn && cellDate.getTime() === bookingState.checkIn.getTime()) div.classList.add('check-in');
    if (bookingState.checkOut && cellDate.getTime() === bookingState.checkOut.getTime()) div.classList.add('check-out');

    if (bookingState.checkIn && bookingState.checkOut && cellDate > bookingState.checkIn && cellDate < bookingState.checkOut) {
      div.classList.add('in-range');
    }

    div.addEventListener('click', () => handleDateClick(cellDate));
    grid.appendChild(div);
  }
}

function handleDateClick(date) {
  if (date < currentDate) return;

  if (!bookingState.checkIn || (bookingState.checkIn && bookingState.checkOut)) {
    bookingState.checkIn = date;
    bookingState.checkOut = null;
    bookingState.nights = 0;
  } else if (date <= bookingState.checkIn) {
    bookingState.checkIn = date;
  } else {
    bookingState.checkOut = date;
    const diffTime = Math.abs(bookingState.checkOut - bookingState.checkIn);
    bookingState.nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  document.getElementById('disp-checkin').textContent = formatDate(bookingState.checkIn);
  document.getElementById('disp-checkout').textContent = formatDate(bookingState.checkOut);
  document.getElementById('disp-nights').textContent = bookingState.nights > 0 ? bookingState.nights : '—';

  document.getElementById('btn-next-1').disabled = !(bookingState.checkIn && bookingState.checkOut);
  document.getElementById('min-nights-warning').classList.add('d-none');

  renderCalendar();
  updateSummarySidebar();
}

/* ========================================================
   OCCUPANCY COUNTERS (Rooms, Adults, Children)
======================================================== */
function initCounters() {
  setupCounter('room', 'rooms-count', 1, 10);
  setupCounter('adult', 'adults-count', 1, 20);
  setupCounter('child', 'children-count', 0, 10, updateChildAges);
  document.getElementById('bed-config-select').addEventListener('change', (e) => {
    bookingState.bedConfig = e.target.value;
  });
  updateOccupancyBadge();
}

function setupCounter(type, outId, min, max, callback = null) {
  const btnMinus = document.getElementById(`btn-minus-${type}`);
  const btnPlus = document.getElementById(`btn-plus-${type}`);
  const output = document.getElementById(outId);

  btnMinus.addEventListener('click', () => {
    let val = parseInt(output.value);
    if(val > min) {
      val--;
      output.value = val;
      if(type === 'room') bookingState.rooms = val;
      if(type === 'adult') bookingState.adults = val;
      if(type === 'child') bookingState.children = val;
      btnPlus.disabled = false;
      if(val === min) btnMinus.disabled = true;
      if(callback) callback();
      updateOccupancyBadge();
      updateSummarySidebar();
    }
  });

  btnPlus.addEventListener('click', () => {
    let val = parseInt(output.value);
    if(val < max) {
      val++;
      output.value = val;
      if(type === 'room') bookingState.rooms = val;
      if(type === 'adult') bookingState.adults = val;
      if(type === 'child') bookingState.children = val;
      btnMinus.disabled = false;
      if(val === max) btnPlus.disabled = true;
      if(callback) callback();
      updateOccupancyBadge();
      updateSummarySidebar();
    }
  });
}

function updateChildAges() {
  const box = document.getElementById('child-ages-box');
  const num = bookingState.children;

  if(num === 0) {
    box.classList.add('d-none');
    box.innerHTML = '';
    bookingState.childAges = [];
    return;
  }

  box.classList.remove('d-none');
  let html = `<p class="child-ages-title">Ages of children upon check-in</p><div class="child-ages-grid">`;

  for(let i = 0; i < num; i++) {
    html += `
      <div class="child-age-item">
        <label><i class="ph ph-user"></i> Child ${i+1}</label>
        <select class="child-age-select" onchange="bookingState.childAges[${i}] = parseInt(this.value)">
          <option value="0">Under 1 year</option>
          ${[...Array(12)].map((_, idx) => `<option value="${idx+1}" ${bookingState.childAges[i]===idx+1?'selected':''}>${idx+1} years old</option>`).join('')}
        </select>
      </div>`;
    if(bookingState.childAges[i] === undefined) bookingState.childAges[i] = 0;
  }
  html += `</div>`;
  box.innerHTML = html;
}

function updateOccupancyBadge() {
  const rs = bookingState.rooms;
  const ad = bookingState.adults;
  const ch = bookingState.children;
  let text = `${rs} room${rs>1?'s':''} &middot; ${ad} adult${ad>1?'s':''}`;
  if(ch > 0) text += ` &middot; ${ch} child${ch>1?'ren':''}`;
  document.getElementById('occupancy-summary-badge').innerHTML = text;
}

/* ========================================================
   ADD-ONS PANEL
======================================================== */
function initAddonsPanel() {
  const panel = document.getElementById('addons-panel');
  let html = `
    <h3 class="addons-panel-title"><i class="ph ph-sparkle"></i> Enhance Your Stay</h3>

    <!-- Restaurant Plan Add-on (Special Card) -->
    <label class="addon-card" id="card-restaurant">
      <input type="checkbox" id="check-restaurant" onchange="toggleRestaurant(this)">
      <div class="addon-card-header">
        <div class="addon-card-icon-wrap"><i class="ph ph-fork-knife"></i></div>
        <div style="flex:1;">
          <div class="addon-card-name">Restaurant Meals</div>
          <div class="addon-card-desc">Add dining options to your reservation</div>
        </div>
        <div class="addon-check-badge"><i class="ph ph-check"></i></div>
      </div>
      <select class="addon-plan-select mt-16" id="sel-restaurant-plan" onchange="updateRestaurantPlan(this.value)">
        ${RESTAURANT_PLANS.map(p => `<option value="${p.id}">${p.label} (+${p.price.toLocaleString()} DZD/person/night)</option>`).join('')}
      </select>
    </label>

    <div class="addons-grid mt-16">
  `;

  ADDONS_CONFIG.forEach(addon => {
    let suffix = addon.type === 'per_night' ? '/night' : 
                 addon.type === 'per_room_night' ? '/room/night' : 
                 addon.type === 'per_person_night' ? '/person/night' : '';
    html += `
      <label class="addon-card" id="card-${addon.id}">
        <input type="checkbox" value="${addon.id}" onchange="toggleAddon(this, '${addon.id}')">
        <div class="addon-card-header">
          <div class="addon-card-icon-wrap"><i class="ph ${addon.icon}"></i></div>
          <div style="flex:1;">
            <div class="addon-card-name">${addon.name}</div>
            <div class="addon-card-desc">${addon.desc}</div>
          </div>
          <div class="addon-check-badge"><i class="ph ph-check"></i></div>
        </div>
        <div class="addon-card-footer">
          <span class="addon-card-tag">${addon.type.replace(/_/g, ' ')}</span>
          <span class="addon-card-price">+${addon.price.toLocaleString()} DZD ${suffix}</span>
        </div>
      </label>
    `;
  });

  html += `</div>`;
  panel.innerHTML = html;
}

window.toggleRestaurant = (chk) => {
  const card = document.getElementById('card-restaurant');
  if(chk.checked) {
    card.classList.add('selected');
    bookingState.restaurantPlan = document.getElementById('sel-restaurant-plan').value;
  } else {
    card.classList.remove('selected');
    bookingState.restaurantPlan = 'none';
  }
  updateAddonsAndReview();
};

window.updateRestaurantPlan = (val) => {
  bookingState.restaurantPlan = val;
  updateAddonsAndReview();
};

window.toggleAddon = (chk, id) => {
  const card = document.getElementById(`card-${id}`);
  if(chk.checked) {
    card.classList.add('selected');
    if(!bookingState.addons.includes(id)) bookingState.addons.push(id);
  } else {
    card.classList.remove('selected');
    bookingState.addons = bookingState.addons.filter(a => a !== id);
  }
  updateAddonsAndReview();
};

function calculateAddonsTotal() {
  let total = 0;
  let persons = bookingState.adults + bookingState.children;
  let nights = bookingState.nights || 1;
  let rooms = bookingState.rooms;

  // Restaurant
  if (bookingState.restaurantPlan !== 'none') {
    let plan = RESTAURANT_PLANS.find(p => p.id === bookingState.restaurantPlan);
    if (plan) total += (plan.price * persons * nights);
  }

  // Other addons
  bookingState.addons.forEach(addonId => {
    let ad = ADDONS_CONFIG.find(a => a.id === addonId);
    if(ad) {
      if(ad.type === 'per_night') total += ad.price * nights;
      else if(ad.type === 'per_room_night') total += ad.price * rooms * nights;
      else if(ad.type === 'per_person_night') total += ad.price * persons * nights;
      else if(ad.type === 'per_room') total += ad.price * rooms;
      else total += ad.price; // fixed
    }
  });
  return total;
}

function updateAddonsAndReview() {
  updateSummarySidebar();

  document.getElementById('rev-val-dates').textContent = bookingState.checkIn ? `${formatDate(bookingState.checkIn)} to ${formatDate(bookingState.checkOut)}` : '—';
  document.getElementById('rev-val-nights').textContent = bookingState.nights || '—';
  document.getElementById('rev-val-rooms').textContent = bookingState.rooms;
  let persons = bookingState.adults + bookingState.children;
  document.getElementById('rev-val-guests').textContent = `${persons} Guest${persons>1?'s':''}`;

  let addonCount = bookingState.addons.length + (bookingState.restaurantPlan!=='none'?1:0);
  document.getElementById('rev-val-addons').textContent = addonCount > 0 ? `${addonCount} Selected` : 'None';
}

function updateSummarySidebar() {
  let nights = bookingState.nights || 0;
  let rooms = bookingState.rooms;
  let subtotal = bookingState.basePrice * nights * rooms;
  let addonsTotal = calculateAddonsTotal();
  let baseWithAddons = subtotal + addonsTotal;
  let fee = Math.round(baseWithAddons * 0.08); // 8% fee
  bookingState.totalPrice = baseWithAddons + fee;

  const pb = document.getElementById('price-breakdown');
  if(nights === 0) {
    pb.innerHTML = `<p class="sum-placeholder-txt">Select dates to see price details</p>`;
    return;
  }

  let html = `
    <div class="price-row">
      <span>${bookingState.basePrice.toLocaleString()} DZD x ${nights} night${nights>1?'s':''} x ${rooms} room${rooms>1?'s':''}</span>
      <span>${subtotal.toLocaleString()} DZD</span>
    </div>
  `;

  if(bookingState.restaurantPlan !== 'none') {
    let p = RESTAURANT_PLANS.find(p=>p.id===bookingState.restaurantPlan);
    html += `<div class="price-row addon-line"><span>${p.label}</span><span>${(p.price*(bookingState.adults+bookingState.children)*nights).toLocaleString()} DZD</span></div>`;
  }

  bookingState.addons.forEach(id => {
    let ad = ADDONS_CONFIG.find(a=>a.id===id);
    if(ad) {
      let val = ad.type === 'per_night' ? ad.price * nights : 
                ad.type === 'per_room_night' ? ad.price * rooms * nights : 
                ad.type === 'per_person_night' ? ad.price * (bookingState.adults+bookingState.children) * nights : 
                ad.type === 'per_room' ? ad.price * rooms : ad.price;
      html += `<div class="price-row addon-line"><span>${ad.name}</span><span>${val.toLocaleString()} DZD</span></div>`;
    }
  });

  html += `
    <div class="price-row"><span>Service Fee (8%)</span><span>${fee.toLocaleString()} DZD</span></div>
    <div class="price-row total"><span>Total (DZD)</span><span>${bookingState.totalPrice.toLocaleString()} DZD</span></div>
  `;
  pb.innerHTML = html;

  // Sync to step 2 summary if it exists
  const revBase = document.getElementById('rev-val-base');
  if(revBase) {
    revBase.textContent = `${subtotal.toLocaleString()} DZD`;
    document.getElementById('rev-val-fees').textContent = `${fee.toLocaleString()} DZD`;
    document.getElementById('rev-val-total').textContent = `${bookingState.totalPrice.toLocaleString()} DZD`;
  }
}

/* ========================================================
   SUBMIT BOOKING
======================================================== */
async function processBooking() {
  const btn = document.getElementById('btn-confirm-book');
  btn.disabled = true;
  btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i> Processing...`;

  try {
    let receiptUrl = null;
    if(bookingState.payMethod === 'transfer' && bookingState.receiptFile) {
      const storageRef = storage.ref(`receipts/${Date.now()}_${bookingState.receiptFile.name}`);
      await storageRef.put(bookingState.receiptFile);
      receiptUrl = await storageRef.getDownloadURL();
    }

    const bookingData = {
      propertyId: propertyId,
      propertyName: currentProperty.title || 'Hotel',
      userId: currentUser ? currentUser.uid : 'guest',
      guestDetails: {
        fullName: document.getElementById('g-name').value,
        email: document.getElementById('g-email').value,
        phone: document.getElementById('g-phone').value,
        nationality: document.getElementById('g-nationality').value,
        arrivalTime: document.getElementById('g-arrival-time').value,
        notes: document.getElementById('g-notes').value
      },
      stayDetails: {
        checkIn: firebase.firestore.Timestamp.fromDate(bookingState.checkIn),
        checkOut: firebase.firestore.Timestamp.fromDate(bookingState.checkOut),
        nights: bookingState.nights,
        rooms: bookingState.rooms,
        adults: bookingState.adults,
        children: bookingState.children,
        childAges: bookingState.childAges,
        bedConfig: bookingState.bedConfig
      },
      addons: {
        items: bookingState.addons,
        restaurantPlan: bookingState.restaurantPlan
      },
      payment: {
        method: bookingState.payMethod,
        totalPrice: bookingState.totalPrice,
        receiptUrl: receiptUrl,
        status: bookingState.payMethod === 'cash' ? 'pending_arrival' : 'pending_verification'
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: 'pending'
    };

    const docRef = await db.collection('bookings').add(bookingData);
    showSuccessScreen(docRef.id, bookingData);

  } catch(error) {
    showGlobalAlert('Failed to submit booking: ' + error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = `<i class="ph ph-check-circle"></i> Confirm Booking`;
  }
}

function showSuccessScreen(refId, data) {
  document.getElementById('ref-number').textContent = `#${refId.substring(0,8).toUpperCase()}`;

  const grid = document.getElementById('success-details-grid');
  grid.innerHTML = `
    <div class="confirm-detail-card"><p class="confirm-detail-label">Check-in</p><p class="confirm-detail-value">${formatDate(bookingState.checkIn)}</p></div>
    <div class="confirm-detail-card"><p class="confirm-detail-label">Check-out</p><p class="confirm-detail-value">${formatDate(bookingState.checkOut)}</p></div>
    <div class="confirm-detail-card"><p class="confirm-detail-label">Rooms</p><p class="confirm-detail-value">${data.stayDetails.rooms} Room(s), ${data.stayDetails.bedConfig} bed</p></div>
    <div class="confirm-detail-card"><p class="confirm-detail-label">Guests</p><p class="confirm-detail-value">${data.stayDetails.adults} Adults, ${data.stayDetails.children} Children</p></div>
    <div class="confirm-detail-card"><p class="confirm-detail-label">Payment</p><p class="confirm-detail-value">${data.payment.method === 'cash' ? 'Pay at property' : 'Bank Transfer'}</p></div>
    <div class="confirm-detail-card"><p class="confirm-detail-label">Total</p><p class="confirm-detail-value">${data.payment.totalPrice.toLocaleString()} DZD</p></div>
  `;

  const badge = document.getElementById('success-payment-badge');
  if(data.payment.method === 'transfer') {
    badge.innerHTML = `<div class="booking-alert info" style="margin:0"><i class="ph ph-clock"></i> <span>We are verifying your receipt. A confirmation email will be sent shortly.</span></div>`;
  }

  goToStep(4);
  document.querySelector('.booking-steps-header').classList.add('d-none');
}

/* ========================================================
   REVIEWS (Random Generator)
======================================================== */
function initReviews() {
  const container = document.getElementById('reviews-section');
  if(!container) return;

  const reviews = [
    { name: "Ahmed K.", country: "DZ", score: 5, date: "Oct 2025", type: "positive", text: "Amazing stay! The rooms were incredibly clean and the staff was extremely welcoming. Will definitely come back!" },
    { name: "Sarah M.", country: "TN", score: 4, date: "Sep 2025", type: "positive", text: "Great location and very good breakfast. The WiFi was a bit slow in the evening, but overall a solid experience." },
    { name: "John D.", country: "GB", score: 3, date: "Aug 2025", type: "neutral", text: "The hotel is decent, but the pictures make it look slightly bigger than it is. Good for a short business trip." },
    { name: "Lina B.", country: "FR", score: 5, date: "Jul 2025", type: "positive", text: "Parfait! The spa add-on was definitely worth it. Truly relaxing weekend." },
    { name: "Omar R.", country: "DZ", score: 2, date: "Jun 2025", type: "negative", text: "Disappointed with the parking situation. It was full and I had to park far away despite reserving in advance." },
    { name: "Emma T.", country: "IT", score: 4, date: "May 2025", type: "positive", text: "Beautiful views from the balcony. Check-in took a bit long, but the staff was apologetic and offered free drinks." },
  ];

  let html = `
    <div class="reviews-header">
      <div class="reviews-header-left">
        <h3 class="reviews-title">Guest Reviews</h3>
        <p class="reviews-subtitle">Real experiences from recent guests</p>
      </div>
      <div class="reviews-overall-badge">
        <div class="reviews-overall-score">4.2</div>
        <div class="reviews-overall-stars"><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star"></i><i class="ph-fill ph-star-half"></i></div>
        <div class="reviews-overall-count">Based on 128 reviews</div>
      </div>
    </div>
    <div class="reviews-bars">
      <div class="reviews-bar-row"><div class="reviews-bar-label">5</div><div class="reviews-bar-track"><div class="reviews-bar-fill" style="width: 65%;"></div></div><div class="reviews-bar-count">85</div></div>
      <div class="reviews-bar-row"><div class="reviews-bar-label">4</div><div class="reviews-bar-track"><div class="reviews-bar-fill" style="width: 20%;"></div></div><div class="reviews-bar-count">25</div></div>
      <div class="reviews-bar-row"><div class="reviews-bar-label">3</div><div class="reviews-bar-track"><div class="reviews-bar-fill" style="width: 8%;"></div></div><div class="reviews-bar-count">10</div></div>
      <div class="reviews-bar-row"><div class="reviews-bar-label">2</div><div class="reviews-bar-track"><div class="reviews-bar-fill" style="width: 5%;"></div></div><div class="reviews-bar-count">6</div></div>
      <div class="reviews-bar-row"><div class="reviews-bar-label">1</div><div class="reviews-bar-track"><div class="reviews-bar-fill" style="width: 2%;"></div></div><div class="reviews-bar-count">2</div></div>
    </div>
    <div class="reviews-list">
  `;

  reviews.forEach(r => {
    let stars = '';
    for(let i=1; i<=5; i++) {
      stars += i <= r.score ? '<i class="ph-fill ph-star"></i>' : '<i class="ph ph-star"></i>';
    }
    let tag = `<span class="review-tag ${r.type}">${r.type === 'positive' ? 'Recommended' : r.type === 'neutral' ? 'Mixed Experience' : 'Room for Improvement'}</span>`;

    html += `
      <div class="review-card ${r.type === 'negative' ? 'negative' : ''}">
        <div class="review-card-top">
          <div class="reviewer-avatar">${r.name.charAt(0)}</div>
          <div class="review-card-meta">
            <div class="reviewer-name">${r.name}</div>
            <div class="reviewer-info">
              <span><i class="ph-fill ph-flag"></i> ${r.country}</span> • <span>${r.date}</span>
            </div>
          </div>
          <div class="review-stars">${stars}</div>
        </div>
        <p class="review-card-text">${r.text}</p>
        ${tag}
      </div>
    `;
  });

  html += `</div>`;
  container.innerHTML = html;
}
