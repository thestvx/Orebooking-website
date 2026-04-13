// =========================================
//   Firebase Configuration
// =========================================
const firebaseConfig = {
  apiKey: "AIzaSyCA5iauXrIhozRw8MD7JTOLyeQ2v0GGncA",
  authDomain: "orebooking-website.firebaseapp.com",
  projectId: "orebooking-website",
  storageBucket: "orebooking-website.firebasestorage.app",
  messagingSenderId: "1012887567747",
  appId: "1:1012887567747:web:153b57b60cb143d88acab6",
  measurementId: "G-5GKMRMVHC3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// =========================================
//   Admin Credentials
// =========================================
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

// =========================================
//   Login Logic
// =========================================
const loginScreen = document.getElementById("admin-login-screen");
const adminLayout = document.getElementById("admin-layout");
const loginForm   = document.getElementById("admin-login-form");

loginForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const user = document.getElementById("admin-user").value.trim();
  const pass = document.getElementById("admin-pass").value.trim();

  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    loginScreen.style.display = "none";
    adminLayout.style.display = "flex";
    loadProperties();
  } else {
    showLoginError("اسم المستخدم أو كلمة المرور غير صحيحة");
  }
});

function showLoginError(msg) {
  const old = loginForm.querySelector(".auth-message");
  if (old) old.remove();

  const div = document.createElement("div");
  div.className = "auth-message error";
  div.textContent = msg;
  loginForm.prepend(div);

  setTimeout(() => div.remove(), 4000);
}

// =========================================
//   Tab Switching
// =========================================
function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const targetTab = document.getElementById("tab-" + tabId);
  if (targetTab) targetTab.classList.add("active");

  const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
  if (activeBtn) activeBtn.classList.add("active");

  const titles = {
    "manage-props": "إدارة العقارات",
    "add-property": "إضافة عقار جديد",
    "bookings":     "الحجوزات"
  };
  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = titles[tabId] || "";

  if (tabId === 'bookings') {
    loadBookings();
  }
}

// =========================================
//   Load Properties from Firestore
// =========================================
async function loadProperties() {
  const tbody = document.getElementById("properties-tbody");
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">جارٍ التحميل...</td></tr>`;

  try {
    const snapshot = await db.collection("properties").get();

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">لا توجد عقارات مضافة بعد</td></tr>`;
      return;
    }

    tbody.innerHTML = "";

    snapshot.forEach(doc => {
      const p = doc.data();
      const isVisible = p.visible !== false;
      const hasLocation = p.lat && p.lng;
      const mapBadge = hasLocation
        ? `<span title="الموقع محدد (${parseFloat(p.lat).toFixed(4)}, ${parseFloat(p.lng).toFixed(4)})" style="color:var(--primary); font-size:1rem;"><i class="ph-fill ph-map-pin"></i></span>`
        : `<span title="لا يوجد موقع" style="color:var(--text-muted); font-size:1rem;"><i class="ph ph-map-pin-slash"></i></span>`;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>
          <img class="admin-table-img" src="${p.imageUrl || ""}" alt="${p.titleAr || ""}">
        </td>
        <td>
          <div class="font-medium">${p.titleAr || "-"}</div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${p.titleEn || ""}</div>
        </td>
        <td>
          <div>${p.locationAr || "-"}</div>
          <div style="margin-top:4px;">${mapBadge}</div>
        </td>
        <td class="font-bold" style="color:var(--primary);">${Number(p.price || 0).toLocaleString()} DZD</td>
        <td>
          <label class="switch">
            <input type="checkbox" ${isVisible ? "checked" : ""} onchange="toggleVisibility('${doc.id}', this.checked)">
            <span class="slider round"></span>
          </label>
        </td>
        <td>
          <div class="action-btns">
            <button class="action-btn edit-btn" onclick="openEditModal('${doc.id}')" title="تعديل">
              <i class="ph ph-pencil-simple"></i>
            </button>
            <button class="action-btn delete-btn" onclick="deleteProperty('${doc.id}')" title="حذف">
              <i class="ph ph-trash"></i>
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

  } catch (err) {
    console.error(err);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:#e11d48;">حدث خطأ أثناء التحميل</td></tr>`;
  }
}

// =========================================
//   Toggle Property Visibility
// =========================================
async function toggleVisibility(docId, isVisible) {
  try {
    await db.collection("properties").doc(docId).update({ visible: isVisible });
  } catch (err) {
    console.error("Toggle error:", err);
    alert("حدث خطأ أثناء تحديث الحالة");
  }
}

// =========================================
//   Add Property Form
// =========================================
const addForm      = document.getElementById("add-property-form");
const submitBtn    = document.getElementById("submit-prop-btn");
const uploadStatus = document.getElementById("upload-status");

if (addForm) {
  addForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const imageFile = document.getElementById("prop-image").files[0];
    if (!imageFile) { alert("يرجى اختيار صورة"); return; }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> جارٍ الرفع...`;
    uploadStatus.textContent = "جارٍ رفع الصورة...";

    try {
      const imageUrl = await uploadToCloudinary(imageFile);
      uploadStatus.textContent = "✅ تم رفع الصورة";

      const latVal = document.getElementById("prop-lat").value;
      const lngVal = document.getElementById("prop-lng").value;

      const newProperty = {
        titleAr:    document.getElementById("prop-title-ar").value.trim(),
        titleEn:    document.getElementById("prop-title-en").value.trim(),
        locationAr: document.getElementById("prop-loc-ar").value.trim(),
        locationEn: document.getElementById("prop-loc-en").value.trim(),
        price:      Number(document.getElementById("prop-price").value),
        descAr:     document.getElementById("prop-desc-ar").value.trim(),
        descEn:     document.getElementById("prop-desc-en").value.trim(),
        imageUrl:   imageUrl,
        visible:    true,
        createdAt:  firebase.firestore.FieldValue.serverTimestamp()
      };

      if (latVal && lngVal) {
        newProperty.lat = parseFloat(latVal);
        newProperty.lng = parseFloat(lngVal);
      }

      await db.collection("properties").add(newProperty);

      addForm.reset();
      uploadStatus.textContent = "";
      const badge = document.getElementById("map-picked-badge");
      if (badge) badge.classList.remove("visible");
      document.getElementById("prop-lat").value = "";
      document.getElementById("prop-lng").value = "";

      alert("✅ تم إضافة العقار بنجاح!");
      switchTab("manage-props");
      loadProperties();

    } catch (err) {
      console.error(err);
      alert("حدث خطأ: " + err.message);
      uploadStatus.textContent = "❌ فشل الرفع";
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="ph ph-plus-circle"></i> إضافة العقار`;
    }
  });
}

// =========================================
//   Upload Image to Cloudinary
// =========================================
async function uploadToCloudinary(file) {
  const CLOUD_NAME    = "dy9bqizhm";
  const UPLOAD_PRESET = "orebooking";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });

  if (!res.ok) throw new Error("فشل رفع الصورة إلى Cloudinary");
  const data = await res.json();
  return data.secure_url;
}

// =========================================
//   Edit Property Modal
// =========================================
async function openEditModal(docId) {
  try {
    const doc = await db.collection("properties").doc(docId).get();
    const p   = doc.data();

    document.getElementById("edit-prop-id").value  = docId;
    document.getElementById("edit-title-ar").value = p.titleAr || "";
    document.getElementById("edit-price").value    = p.price   || "";
    document.getElementById("edit-desc-ar").value  = p.descAr  || "";

    const existingLat = p.lat ? parseFloat(p.lat) : null;
    const existingLng = p.lng ? parseFloat(p.lng) : null;

    document.getElementById("edit-lat").value = existingLat || "";
    document.getElementById("edit-lng").value = existingLng || "";

    const editBadge = document.getElementById("edit-map-picked-badge");
    if (editBadge) {
      editBadge.classList.toggle("visible", !!(existingLat && existingLng));
    }

    document.getElementById("edit-modal").classList.add("active");
    document.body.classList.add("modal-open");

    if (typeof window.initEditMapFromAdmin === "function") {
      window.initEditMapFromAdmin(existingLat, existingLng);
    }

  } catch (err) {
    console.error(err);
    alert("تعذّر تحميل بيانات العقار");
  }
}

function closeEditModal() {
  const editModal = document.getElementById("edit-modal");
  if (editModal) editModal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

const editForm      = document.getElementById("edit-property-form");
const submitEditBtn = document.getElementById("submit-edit-btn");

if (editForm) {
  editForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const docId = document.getElementById("edit-prop-id").value;
    submitEditBtn.disabled    = true;
    submitEditBtn.textContent = "جارٍ الحفظ...";

    try {
      const latVal = document.getElementById("edit-lat").value;
      const lngVal = document.getElementById("edit-lng").value;

      const updateData = {
        titleAr: document.getElementById("edit-title-ar").value.trim(),
        price:   Number(document.getElementById("edit-price").value),
        descAr:  document.getElementById("edit-desc-ar").value.trim()
      };

      if (latVal && lngVal) {
        updateData.lat = parseFloat(latVal);
        updateData.lng = parseFloat(lngVal);
      }

      await db.collection("properties").doc(docId).update(updateData);

      closeEditModal();
      loadProperties();
      alert("✅ تم حفظ التعديلات بنجاح!");

    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    } finally {
      submitEditBtn.disabled    = false;
      submitEditBtn.textContent = "حفظ التعديلات";
    }
  });
}

const editModalEl = document.getElementById("edit-modal");
if (editModalEl) {
  editModalEl.addEventListener("click", function (e) {
    if (e.target === this) closeEditModal();
  });
}

// =========================================
//   Delete Property
// =========================================
async function deleteProperty(docId) {
  if (!confirm("هل أنت متأكد من حذف هذا العقار؟ لا يمكن التراجع عن هذا الإجراء.")) return;

  try {
    await db.collection("properties").doc(docId).delete();
    loadProperties();
  } catch (err) {
    console.error(err);
    alert("حدث خطأ أثناء الحذف: " + err.message);
  }
}

// =========================================
//   Admin — Bookings Tab (UPDATED FOR NEW BOOKING SYSTEM)
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

    // Function to safely format dates (handles both strings and Firebase Timestamps)
    const formatDate = (dateField) => {
      if (!dateField) return '—';
      if (typeof dateField === 'string') return dateField; // "2025-04-15"
      if (dateField.toDate) return dateField.toDate().toLocaleDateString('ar-DZ'); // Timestamp
      return '—';
    };

    container.innerHTML = `<div class="bookings-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px;">` +
      snap.docs.map(doc => {
        const b = doc.data();

        // Parse Dates
        const ci = formatDate(b.checkInDate || b.checkIn);
        const co = formatDate(b.checkOutDate || b.checkOut);
        const createdAt = formatDate(b.createdAt);

        const st = b.status || 'pending';
        const docIdShort = doc.id.slice(0, 8).toUpperCase();

        // Handle Occupancy 
        let occupancyHtml = `<span>${b.guests || 1} ضيف</span>`;
        if (b.rooms && (b.adults || b.children)) {
            occupancyHtml = `
              <div style="display:flex; flex-direction:column; gap:2px; font-size:0.8rem;">
                <span style="font-weight:bold; color:var(--text-main);">${b.rooms} غرف · ${b.bedConfig === 'double' ? 'مزدوج' : b.bedConfig === 'twin' ? 'سريران' : b.bedConfig === 'king' ? 'كينج' : 'فردي'}</span>
                <span style="color:var(--text-muted);">${b.adults} بالغين ${b.children > 0 ? ` + ${b.children} أطفال` : ''}</span>
              </div>
            `;
        }

        // Handle Addons
        let addonsHtml = '';
        if (b.selectedAddons && b.selectedAddons.length > 0) {
            addonsHtml = `
              <div class="booking-detail-row" style="margin-top:6px; background:color-mix(in srgb, var(--primary) 5%, transparent); padding:8px; border-radius:8px;">
                <i class="ph-fill ph-plus-circle" style="color:var(--primary);"></i>
                <div style="font-size:0.8rem; color:var(--primary); font-weight:600;">
                  إضافات: ${b.selectedAddons.map(a => a === 'restaurant' ? 'المطعم (' + b.restaurantPlan + ')' : a).join('، ')}
                </div>
              </div>
            `;
        }

        // Handle Transfer Receipt
        let receiptHtml = '';
        if (b.paymentMethod === 'transfer') {
            receiptHtml = b.receiptUrl 
              ? `<a href="${b.receiptUrl}" target="_blank" style="font-size:0.75rem; background:color-mix(in srgb, #f59e0b 15%, transparent); color:#d97706; padding:4px 8px; border-radius:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px; font-weight:bold;"><i class="ph ph-receipt"></i> عرض الإيصال</a>`
              : `<span style="font-size:0.75rem; color:#e11d48;"><i class="ph ph-warning"></i> الإيصال مفقود</span>`;
        }

        return `
          <div class="booking-card" id="bcard-${doc.id}" style="background:var(--surface-color); border:1px solid var(--border-color); border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px; box-shadow:0 2px 8px rgba(0,0,0,0.04);">

            <div class="booking-card-header" style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
              <div>
                <div style="font-size:1.05rem; font-weight:700; color:var(--text-main); margin-bottom:4px;">${b.guestName || '—'}</div>
                <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace; background:var(--bg-color); padding:2px 6px; border-radius:4px; display:inline-block;">#${docIdShort}</div>
              </div>
              <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
                <span class="booking-status ${statusClass[st]}" style="font-size:0.75rem; font-weight:700; padding:4px 10px; border-radius:12px; text-transform:uppercase;">${statusLabel[st] || st}</span>
                <span style="font-size:0.7rem; color:var(--text-muted);"><i class="ph ph-clock"></i> ${createdAt}</span>
              </div>
            </div>

            <div class="booking-card-details" style="display:flex; flex-direction:column; gap:10px;">
              <div class="booking-detail-row" style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-main);">
                <i class="ph-fill ph-buildings" style="color:var(--text-muted); font-size:1.1rem;"></i>
                <span style="font-weight:600;">${b.propertyTitle || '—'}</span>
              </div>

              <div class="booking-detail-row" style="display:flex; align-items:flex-start; gap:8px; font-size:0.85rem; color:var(--text-main);">
                <i class="ph-fill ph-calendar-check" style="color:var(--text-muted); font-size:1.1rem; margin-top:2px;"></i>
                <div style="display:flex; flex-direction:column; gap:2px;">
                  <span style="font-weight:600;">${ci} <i class="ph ph-arrow-left" style="font-size:0.7rem; margin:0 4px; color:var(--text-muted);"></i> ${co}</span>
                  <span style="font-size:0.75rem; color:var(--primary); font-weight:700;">${b.nights || 0} ليالٍ</span>
                </div>
              </div>

              <div class="booking-detail-row" style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-main);">
                <i class="ph-fill ph-users" style="color:var(--text-muted); font-size:1.1rem;"></i>
                ${occupancyHtml}
              </div>

              <div class="booking-detail-row" style="display:flex; align-items:center; gap:8px; font-size:0.85rem; color:var(--text-main);">
                <i class="ph-fill ph-phone" style="color:var(--text-muted); font-size:1.1rem;"></i>
                <span dir="ltr">${b.guestPhone || '—'}</span>
              </div>

              ${addonsHtml}

              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px; padding-top:12px; border-top:1px dashed var(--border-color);">
                <div style="display:flex; align-items:center; gap:6px;">
                  <span style="font-size:0.8rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">الإجمالي</span>
                  ${receiptHtml}
                </div>
                <div style="font-size:1.1rem; font-weight:800; color:var(--primary);">
                  ${Number(b.totalPrice || 0).toLocaleString()} DZD
                </div>
              </div>
            </div>

            ${st === 'pending' ? `
            <div class="booking-card-actions" style="display:flex; gap:8px; margin-top:8px;">
              <button class="btn-confirm-booking" onclick="updateBookingStatus('${doc.id}','confirmed')" style="flex:1; padding:10px; border:none; border-radius:8px; background:#10b981; color:#fff; font-weight:bold; font-family:inherit; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                <i class="ph ph-check-circle" style="font-size:1.1rem;"></i> تأكيد
              </button>
              <button class="btn-cancel-booking" onclick="updateBookingStatus('${doc.id}','cancelled')" style="flex:1; padding:10px; border:none; border-radius:8px; background:color-mix(in srgb, #e11d48 10%, transparent); color:#e11d48; font-weight:bold; font-family:inherit; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px;">
                <i class="ph ph-x-circle" style="font-size:1.1rem;"></i> إلغاء
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
