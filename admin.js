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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// =========================================
//   Admin Credentials
// =========================================
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

let isSuperAdmin = false;

// =========================================
//   Login Logic
// =========================================
const loginScreen = document.getElementById("admin-login-screen");
const adminLayout = document.getElementById("admin-layout");
const loginForm   = document.getElementById("admin-login-form");

if (loginForm) {
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const user = document.getElementById("admin-user").value.trim();
    const pass = document.getElementById("admin-pass").value.trim();

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      localStorage.removeItem('ownerPropId');
      localStorage.removeItem('ownerPropName');
      isSuperAdmin = true;

      loginScreen.style.display = "none";
      adminLayout.style.display = "flex";
      loadProperties();
      loadBookings();
    } else {
      showLoginError("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  });
}

function showLoginError(msg) {
  const old = loginForm ? loginForm.querySelector(".auth-message") : null;
  if (old) old.remove();

  const div = document.createElement("div");
  div.className = "auth-message error";
  div.textContent = msg;
  div.style.display = "block";
  div.style.marginBottom = "20px";
  if (loginForm) loginForm.prepend(div);

  setTimeout(() => div.remove(), 4000);
}

// الدخول التلقائي إذا كان هناك جلسة مفتوحة (حساب مالك)
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem('ownerPropId')) {
    isSuperAdmin = false;
    if (loginScreen) loginScreen.style.display = "none";
    if (adminLayout) adminLayout.style.display = "flex";
    loadProperties();
    loadBookings();
  }
});

// =========================================
//   Tab Switching
//   FIX: يتم تعريف switchTab هنا ويُربط بالخريطة
//        عبر hookSwitchTab في admin.html بعد defer
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
  if (pageTitle) pageTitle.textContent = titles[tabId] || "لوحة التحكم";

  if (tabId === 'bookings') {
    loadBookings();
  }

  // FIX: تشغيل الخريطة مباشرة من هنا إذا كانت الدالة محملة
  if (tabId === 'add-property') {
    setTimeout(() => {
      if (typeof initAddMap === 'function') {
        initAddMap();
      }
    }, 150);
  }
}

// =========================================
//   Load Properties from Firestore
// =========================================
async function loadProperties() {
  const tbody = document.getElementById("properties-tbody");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">
        <i class="ph ph-circle-notch ph-spin" style="font-size: 2rem;"></i><br>جارٍ التحميل...
      </td>
    </tr>`;

  try {
    if (!isSuperAdmin) {
      const ownerPropId = localStorage.getItem('ownerPropId');
      if (!ownerPropId) return;
      const doc = await db.collection("properties").doc(ownerPropId).get();
      if (!doc.exists) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">
              عقارك غير موجود أو تم حذفه
            </td>
          </tr>`;
        return;
      }
      renderPropertiesTable([doc]);
      return;
    }

    const snapshot = await db.collection("properties").get();
    if (snapshot.empty) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">
            لا توجد عقارات مضافة بعد
          </td>
        </tr>`;
      return;
    }

    renderPropertiesTable(snapshot.docs);

  } catch (err) {
    console.error("loadProperties error:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; padding:32px; color:#e11d48;">
          حدث خطأ أثناء تحميل العقارات: ${err.message}
        </td>
      </tr>`;
  }
}

// دالة مساعدة لرسم جدول العقارات
function renderPropertiesTable(docsArray) {
  const tbody = document.getElementById("properties-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  docsArray.forEach(doc => {
    const p         = doc.data();
    const isVisible = p.visible !== false;
    const hasLoc    = p.lat && p.lng;

    const mapBadge = hasLoc
      ? `<span title="الموقع محدد (${parseFloat(p.lat).toFixed(4)}, ${parseFloat(p.lng).toFixed(4)})" style="color:#10b981; font-size:0.85rem; display:inline-flex; align-items:center; gap:4px;">
           <i class="ph-fill ph-map-pin"></i> موقع الخريطة
         </span>`
      : `<span title="لا يوجد موقع محدد" style="color:var(--text-muted); font-size:0.85rem; display:inline-flex; align-items:center; gap:4px;">
           <i class="ph ph-map-pin-slash"></i> بدون خريطة
         </span>`;

    const tr = document.createElement("tr");
    tr.setAttribute('data-prop-id', doc.id);
    tr.innerHTML = `
      <td>
        <img
          class="admin-table-img"
          src="${p.imageUrl || ''}"
          alt="${p.titleAr || ''}"
          style="width:70px; height:50px; border-radius:10px; object-fit:cover;"
          onerror="this.src='images/placeholder.jpg'">
      </td>
      <td>
        <div class="font-bold" style="color:var(--text-main); font-size:1.05rem;">${p.titleAr || '—'}</div>
        <div style="font-size:0.8rem; color:var(--text-muted);">${p.titleEn || ''}</div>
      </td>
      <td>
        <div style="font-weight:500;">${p.locationAr || '—'}</div>
        <div style="margin-top:6px;">${mapBadge}</div>
      </td>
      <td class="font-bold" style="color:var(--primary); font-size:1.1rem;">
        ${Number(p.price || 0).toLocaleString()} DZD
      </td>
      <td>
        <label class="switch">
          <input type="checkbox" ${isVisible ? 'checked' : ''} onchange="toggleVisibility('${doc.id}', this.checked, this)">
          <span class="slider round"></span>
        </label>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn view-btn" onclick="window.open('property.html?id=${doc.id}','_blank')" title="معاينة">
            <i class="ph ph-eye"></i>
          </button>
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
}

// =========================================
//   Toggle Property Visibility
// =========================================
async function toggleVisibility(docId, isVisible, checkboxEl) {
  try {
    checkboxEl.disabled = true;
    await db.collection("properties").doc(docId).update({ visible: isVisible });
  } catch (err) {
    console.error("toggleVisibility error:", err);
    alert("حدث خطأ أثناء تحديث حالة الظهور");
    checkboxEl.checked = !isVisible;
  } finally {
    checkboxEl.disabled = false;
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

    // التحقق من وجود الإحداثيات
    const latVal = document.getElementById("prop-lat").value.trim();
    const lngVal = document.getElementById("prop-lng").value.trim();
    if (!latVal || !lngVal) {
      alert("⚠️ يرجى تحديد موقع العقار على الخريطة قبل النشر.");
      return;
    }

    const imageFile = document.getElementById("prop-image").files[0];
    if (!imageFile) {
      alert("يرجى اختيار الصورة الرئيسية للعقار");
      return;
    }

    // التحقق من حجم الملف (5 ميجابايت)
    if (imageFile.size > 5 * 1024 * 1024) {
      alert("⚠️ حجم الصورة يتجاوز 5 ميجابايت. يرجى اختيار صورة أصغر.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> جاري النشر والرفع...`;
    if (uploadStatus) {
      uploadStatus.textContent = "جارٍ رفع الصورة إلى الخادم...";
      uploadStatus.style.color = "var(--primary)";
    }

    try {
      const imageUrl = await uploadToCloudinary(imageFile);
      if (uploadStatus) {
        uploadStatus.textContent = "✅ اكتمل رفع الصورة";
        uploadStatus.style.color = "#10b981";
      }

      const newProperty = {
        titleAr:    document.getElementById("prop-title-ar").value.trim(),
        titleEn:    document.getElementById("prop-title-en").value.trim(),
        locationAr: document.getElementById("prop-loc-ar").value.trim(),
        locationEn: document.getElementById("prop-loc-en").value.trim(),
        price:      Number(document.getElementById("prop-price").value),
        descAr:     document.getElementById("prop-desc-ar").value.trim(),
        descEn:     document.getElementById("prop-desc-en").value.trim(),
        imageUrl:   imageUrl,
        lat:        parseFloat(latVal),
        lng:        parseFloat(lngVal),
        visible:    true,
        createdAt:  firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("properties").add(newProperty);

      // إعادة ضبط النموذج
      addForm.reset();
      if (uploadStatus) uploadStatus.textContent = "";

      const zoneText = document.querySelector('.upload-zone-text');
      const zoneIcon = document.querySelector('.upload-zone i');
      if (zoneText) {
        zoneText.textContent = "اضغط هنا أو اسحب الصورة";
        zoneText.style.color = "var(--text-main)";
      }
      if (zoneIcon) zoneIcon.className = "ph ph-cloud-arrow-up";

      const badge = document.getElementById("map-picked-badge");
      if (badge) badge.classList.remove("visible");

      const latEl = document.getElementById("prop-lat");
      const lngEl = document.getElementById("prop-lng");
      if (latEl) latEl.value = "";
      if (lngEl) lngEl.value = "";

      // إعادة تهيئة الخريطة للاستخدام التالي
      if (typeof window._resetAddMap === 'function') window._resetAddMap();

      alert("✅ تمت إضافة العقار بنجاح إلى منصة OreBooking!");
      switchTab("manage-props");
      loadProperties();

    } catch (err) {
      console.error("addProperty error:", err);
      alert("حدث خطأ أثناء إضافة العقار: " + err.message);
      if (uploadStatus) {
        uploadStatus.textContent = "❌ فشل الرفع، يرجى المحاولة لاحقاً";
        uploadStatus.style.color = "#e11d48";
      }
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<i class="ph-fill ph-plus-circle"></i> نشر العقار على المنصة`;
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

  if (!res.ok) throw new Error("فشل الاتصال بخادم رفع الصور");
  const data = await res.json();
  if (!data.secure_url) throw new Error("لم يتم استلام رابط الصورة من Cloudinary");
  return data.secure_url;
}

// =========================================
//   Edit Property Modal
// =========================================
async function openEditModal(docId) {
  const editModal = document.getElementById("edit-modal");
  if (!editModal) return;

  try {
    const doc = await db.collection("properties").doc(docId).get();
    if (!doc.exists) {
      alert("العقار غير موجود!");
      return;
    }
    const p = doc.data();

    document.getElementById("edit-prop-id").value  = docId;
    document.getElementById("edit-title-ar").value = p.titleAr || "";
    document.getElementById("edit-price").value    = p.price   || "";
    document.getElementById("edit-desc-ar").value  = p.descAr  || "";

    const existingLat = p.lat ? parseFloat(p.lat) : null;
    const existingLng = p.lng ? parseFloat(p.lng) : null;

    const editLatEl = document.getElementById("edit-lat");
    const editLngEl = document.getElementById("edit-lng");
    if (editLatEl) editLatEl.value = existingLat || "";
    if (editLngEl) editLngEl.value = existingLng || "";

    const editBadge = document.getElementById("edit-map-picked-badge");
    if (editBadge) {
      editBadge.classList.toggle("visible", !!(existingLat && existingLng));
    }

    editModal.classList.add("active");
    document.body.classList.add("modal-open");

    // FIX: تفعيل خريطة التعديل مع تأخير كافٍ بعد ظهور المودال
    if (typeof window.initEditMapFromAdmin === "function") {
      window.initEditMapFromAdmin(existingLat, existingLng);
    }

  } catch (err) {
    console.error("openEditModal error:", err);
    alert("تعذّر تحميل بيانات العقار من السيرفر");
  }
}

function closeEditModal() {
  const editModal = document.getElementById("edit-modal");
  if (editModal) editModal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

// إغلاق المودال بالنقر على الخلفية
const editModalEl = document.getElementById("edit-modal");
if (editModalEl) {
  editModalEl.addEventListener("click", function (e) {
    if (e.target === this) closeEditModal();
  });
}

// نموذج التعديل
const editForm      = document.getElementById("edit-property-form");
const submitEditBtn = document.getElementById("submit-edit-btn");

if (editForm) {
  editForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const docId   = document.getElementById("edit-prop-id").value;
    const latVal  = document.getElementById("edit-lat").value.trim();
    const lngVal  = document.getElementById("edit-lng").value.trim();
    const titleAr = document.getElementById("edit-title-ar").value.trim();
    const price   = document.getElementById("edit-price").value;
    const descAr  = document.getElementById("edit-desc-ar").value.trim();

    if (!titleAr) { alert("يرجى إدخال اسم العقار"); return; }
    if (!price || isNaN(Number(price))) { alert("يرجى إدخال سعر صحيح"); return; }

    if (submitEditBtn) {
      submitEditBtn.disabled = true;
      submitEditBtn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> جارٍ الحفظ...`;
    }

    try {
      const updateData = {
        titleAr: titleAr,
        price:   Number(price),
        descAr:  descAr,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (latVal && lngVal && !isNaN(parseFloat(latVal)) && !isNaN(parseFloat(lngVal))) {
        updateData.lat = parseFloat(latVal);
        updateData.lng = parseFloat(lngVal);
      }

      await db.collection("properties").doc(docId).update(updateData);

      closeEditModal();
      loadProperties();
      alert("✅ تم حفظ التعديلات بنجاح!");

    } catch (err) {
      console.error("editProperty error:", err);
      alert("حدث خطأ أثناء الحفظ: " + err.message);
    } finally {
      if (submitEditBtn) {
        submitEditBtn.disabled = false;
        submitEditBtn.innerHTML = `حفظ التعديلات <i class="ph ph-floppy-disk"></i>`;
      }
    }
  });
}

// =========================================
//   Delete Property
// =========================================
async function deleteProperty(docId) {
  if (!confirm("هل أنت متأكد من حذف هذا العقار نهائياً؟\nسيتم مسحه من المنصة ولا يمكن التراجع عن هذا الإجراء.")) return;

  try {
    await db.collection("properties").doc(docId).delete();
    alert("✅ تم حذف العقار بنجاح.");
    loadProperties();
  } catch (err) {
    console.error("deleteProperty error:", err);
    alert("حدث خطأ أثناء الحذف: " + err.message);
  }
}

// =========================================
//   Bookings Tab
// =========================================
async function loadBookings() {
  const container = document.getElementById('bookings-container');
  if (!container) return;

  container.innerHTML = `
    <p style="text-align:center; padding:60px; color:var(--text-muted); width:100%;">
      <i class="ph ph-circle-notch ph-spin" style="font-size:2.5rem; color:var(--primary); margin-bottom:16px; display:block;"></i>
      جارٍ جلب الحجوزات...
    </p>`;

  try {
    let query = db.collection('bookings');

    if (!isSuperAdmin) {
      const ownerPropId = localStorage.getItem('ownerPropId');
      if (!ownerPropId) return;
      // FIX: جلب حجوزات العقار المحدد فقط (لا يحتاج orderBy فلا يحتاج index مركّب)
      query = query.where('propertyId', '==', ownerPropId);
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    const snap = await query.get();

    if (snap.empty) {
      container.innerHTML = `
        <div style="text-align:center; padding:80px; color:var(--text-muted); width:100%;">
          <i class="ph ph-calendar-blank" style="font-size:4rem; margin-bottom:16px; opacity:0.3; display:block;"></i>
          <p style="font-size:1.1rem;">لا توجد أي حجوزات مسجلة حتى الآن.</p>
        </div>`;
      return;
    }

    // FIX: ترتيب الحجوزات في الكلاينت لتجنب الحاجة لـ Firestore composite index
    const docsArray = snap.docs.sort((a, b) => {
      const getTime = doc => {
        const val = doc.data().createdAt;
        if (!val) return 0;
        if (val.toDate) return val.toDate().getTime();
        return new Date(val).getTime();
      };
      return getTime(b) - getTime(a);
    });

    const statusLabel = { pending: 'قيد الانتظار', confirmed: 'تم التأكيد', cancelled: 'تم الإلغاء' };
    const statusColor = { pending: '#d97706',      confirmed: '#059669',     cancelled: '#e11d48'  };
    const statusBg    = { pending: '#fef3c7',       confirmed: '#ecfdf5',     cancelled: '#ffe4e6'  };

    const formatDate = (dateField) => {
      if (!dateField) return '—';
      if (typeof dateField === 'string') return dateField;
      if (dateField.toDate) return dateField.toDate().toLocaleDateString('ar-DZ');
      return '—';
    };

    let html = `<div class="bookings-grid">`;

    docsArray.forEach(doc => {
      const b  = doc.data();
      const ci = formatDate(b.checkInDate  || b.checkIn);
      const co = formatDate(b.checkOutDate || b.checkOut);

      let createdAtStr = '—';
      if (b.createdAt) {
        const d = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        createdAtStr = d.toLocaleDateString('ar-DZ') + ' ' + d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
      }

      const st          = b.status || 'pending';
      const docIdShort  = doc.id.slice(0, 8).toUpperCase();

      // قسم الإقامة والأسرّة
      let occupancyHtml = `<span>${b.guests || 1} ضيف</span>`;
      if (b.rooms && (b.adults || b.children !== undefined)) {
        const bedLabels = { double: 'سرير مزدوج', twin: 'سريران منفصلان', king: 'سرير كينج', single: 'سرير فردي' };
        const bedLabel  = bedLabels[b.bedConfig] || '';
        const bedHtml   = bedLabel ? ` · ${bedLabel}` : '';
        occupancyHtml = `
          <div style="display:flex; flex-direction:column; gap:3px; font-size:0.85rem;">
            <span style="font-weight:700; color:var(--text-main);">${b.rooms} غرف${bedHtml}</span>
            <span style="color:var(--text-muted);">${b.adults || 0} بالغين${b.children > 0 ? ` + ${b.children} أطفال` : ''}</span>
          </div>`;
      }

      // الإضافات المختارة
      let addonsHtml = '';
      if (b.selectedAddons && b.selectedAddons.length > 0) {
        const addOnLabels = {
          restaurant:      'المطعم' + (b.restaurantPlan ? ` (${b.restaurantPlan})` : ''),
          wifi:            'إنترنت عالي السرعة',
          spa:             'جلسة سبا',
          parking:         'موقف سيارات',
          airportTransfer: 'نقل المطار',
          lateCheckout:    'تسجيل خروج متأخر',
          extraBed:        'سرير إضافي',
          events:          'تنسيق فعاليات'
        };
        const translatedAddons = b.selectedAddons.map(a => addOnLabels[a] || a).join('، ');
        addonsHtml = `
          <div style="margin-top:10px; background:var(--bg-color); padding:10px 12px; border-radius:10px; border:1px solid var(--border-color);">
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
              <i class="ph-fill ph-plus-circle" style="color:var(--primary);"></i>
              <span style="font-size:0.8rem; font-weight:700; color:var(--primary);">إضافات مختارة:</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-main); line-height:1.5;">${translatedAddons}</div>
          </div>`;
      }

      // الإيصال أو طريقة الدفع
      let receiptHtml = '';
      if (b.paymentMethod === 'transfer') {
        receiptHtml = b.receiptUrl
          ? `<a href="${b.receiptUrl}" target="_blank"
               style="background:#fef3c7; color:#d97706; padding:6px 12px; border-radius:8px;
                      font-size:0.8rem; font-weight:700; text-decoration:none;
                      display:inline-flex; align-items:center; gap:6px; border:1px solid #fde68a;">
               <i class="ph ph-receipt"></i> عرض إيصال الدفع
             </a>`
          : `<span style="color:#e11d48; font-size:0.8rem; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
               <i class="ph-fill ph-warning-circle"></i> الإيصال مفقود
             </span>`;
      } else if (b.paymentMethod === 'cash') {
        receiptHtml = `
          <span style="background:var(--bg-color); color:var(--text-muted); padding:4px 10px;
                       border-radius:8px; font-size:0.75rem; font-weight:600; border:1px solid var(--border-color);
                       display:inline-flex; align-items:center; gap:5px;">
            <i class="ph ph-money"></i> الدفع نقداً عند الوصول
          </span>`;
      }

      // ملاحظات ووقت الوصول
      let notesHtml = '';
      if ((b.notes && b.notes.trim()) || b.arrivalTime) {
        const arrivalHtml = b.arrivalTime
          ? `<div style="margin-bottom:4px;"><strong>وقت الوصول:</strong> ${b.arrivalTime}</div>` : '';
        const userNoteHtml = (b.notes && b.notes.trim())
          ? `<div><strong>ملاحظة الضيف:</strong> ${b.notes}</div>` : '';
        notesHtml = `
          <div style="margin-top:10px; font-size:0.8rem; color:var(--text-muted);
                      background:rgba(245,158,11,0.1); padding:10px;
                      border-inline-start:3px solid #f59e0b; border-radius:6px;">
            ${arrivalHtml}${userNoteHtml}
          </div>`;
      }

      html += `
        <div class="booking-card"
          style="background:var(--surface-color); border:1px solid var(--border-color);
                 border-radius:16px; padding:20px; display:flex; flex-direction:column;
                 gap:12px; box-shadow:var(--shadow-soft);">

          <!-- هيدر الكارد -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start;
                      border-bottom:1px solid var(--border-color); padding-bottom:14px;">
            <div>
              <div style="font-size:1.15rem; font-weight:700; color:var(--text-main); margin-bottom:4px;">
                ${b.guestName || 'غير معروف'}
              </div>
              <div style="font-size:0.75rem; color:var(--text-muted); font-family:monospace;
                          background:var(--bg-color); padding:3px 8px; border-radius:6px; display:inline-block;">
                رقم: #${docIdShort}
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
              <span style="font-size:0.75rem; font-weight:700; padding:6px 12px; border-radius:8px;
                           background:${statusBg[st] || '#f1f5f9'}; color:${statusColor[st] || '#64748b'};
                           border:1px solid ${statusColor[st] || '#94a3b8'}40;">
                ${statusLabel[st] || st}
              </span>
              <span style="font-size:0.7rem; color:var(--text-muted);">
                <i class="ph ph-clock"></i> ${createdAtStr}
              </span>
            </div>
          </div>

          <!-- تفاصيل -->
          <div style="display:flex; flex-direction:column; gap:12px;">

            <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem;">
              <i class="ph-fill ph-house-line" style="color:var(--text-muted); font-size:1.2rem;"></i>
              <span style="font-weight:700; color:var(--primary);">${b.propertyTitle || '—'}</span>
            </div>

            <div style="display:flex; align-items:flex-start; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-calendar-blank" style="color:var(--text-muted); font-size:1.2rem; margin-top:2px;"></i>
              <div style="display:flex; flex-direction:column; gap:3px;">
                <span style="font-weight:600;">
                  ${ci}
                  <i class="ph ph-arrow-left" style="font-size:0.7rem; color:var(--text-muted); margin:0 4px;"></i>
                  ${co}
                </span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;
                             background:var(--bg-color); padding:2px 8px; border-radius:4px;
                             display:inline-block; width:fit-content;">
                  ${b.nights || 0} ليالٍ إقامة
                </span>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-users" style="color:var(--text-muted); font-size:1.2rem;"></i>
              ${occupancyHtml}
            </div>

            <div style="display:flex; align-items:center; gap:10px; font-size:0.9rem; color:var(--text-main);">
              <i class="ph-fill ph-phone" style="color:var(--text-muted); font-size:1.2rem;"></i>
              <span dir="ltr" style="font-family:monospace; font-size:0.95rem; font-weight:600;">
                ${b.guestPhone || '—'}
              </span>
            </div>

            ${addonsHtml}
            ${notesHtml}

            <!-- السعر وطريقة الدفع -->
            <div style="display:flex; align-items:center; justify-content:space-between;
                        margin-top:8px; padding-top:14px; border-top:1px dashed var(--border-color);">
              <div>${receiptHtml}</div>
              <div style="text-align:left;">
                <div style="font-size:0.75rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">الإجمالي</div>
                <div style="font-size:1.25rem; font-weight:800; color:var(--primary);">
                  ${Number(b.totalPrice || 0).toLocaleString()} DZD
                </div>
              </div>
            </div>
          </div>

          <!-- أزرار القبول والرفض (للحجوزات قيد الانتظار فقط) -->
          ${st === 'pending' ? `
          <div class="booking-actions-row">
            <button class="btn-approve" onclick="updateBookingStatus('${doc.id}', 'confirmed')">
              <i class="ph-fill ph-check-circle" style="font-size:1.2rem;"></i> قبول الحجز
            </button>
            <button class="btn-reject" onclick="updateBookingStatus('${doc.id}', 'cancelled')">
              <i class="ph-fill ph-x-circle" style="font-size:1.2rem;"></i> رفض الحجز
            </button>
          </div>` : ''}

        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error("loadBookings error:", err);
    // FIX: رسالة خاصة إذا كان Firestore يطلب index
    if (err.code === 'failed-precondition' || (err.message && err.message.includes('index'))) {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#d97706; background:#fef3c7;
                    border-radius:12px; font-weight:bold; border:1px solid #fde68a;">
          <i class="ph ph-warning" style="font-size:2rem; display:block; margin-bottom:8px;"></i>
          يحتاج هذا الاستعلام إلى إنشاء Index في Firestore.<br>
          <small style="font-weight:400; color:var(--text-muted); margin-top:8px; display:block;">
            افتح الـ Console وانقر على الرابط الذي يظهر لإنشاء الـ Index تلقائياً.
          </small>
        </div>`;
    } else {
      container.innerHTML = `
        <div style="text-align:center; padding:40px; color:#e11d48; background:#ffe4e6;
                    border-radius:12px; font-weight:bold;">
          خطأ في تحميل الحجوزات: ${err.message}
        </div>`;
    }
  }
}

// =========================================
//   Update Booking Status (قبول / رفض)
// =========================================
window.updateBookingStatus = async function(docId, newStatus) {
  const isConfirm  = newStatus === 'confirmed';
  const confirmMsg = isConfirm
    ? "هل أنت متأكد من تأكيد وقبول هذا الحجز؟"
    : "هل أنت متأكد من رفض وإلغاء هذا الحجز؟";

  if (!confirm(confirmMsg)) return;

  // FIX: تعطيل الأزرار فوراً لمنع الضغط المزدوج
  const allBtns = document.querySelectorAll('.btn-approve, .btn-reject');
  allBtns.forEach(btn => { btn.disabled = true; });

  try {
    await db.collection('bookings').doc(docId).update({
      status:    newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert(`✅ تم ${isConfirm ? 'قبول' : 'رفض'} الحجز بنجاح.`);
    loadBookings();
  } catch (err) {
    console.error("updateBookingStatus error:", err);
    alert('حدث خطأ أثناء تحديث حالة الحجز: ' + err.message);
    allBtns.forEach(btn => { btn.disabled = false; });
  }
};

// =========================================
//   fetchProperties alias (للـ RBAC)
// =========================================
window.fetchProperties = loadProperties;
