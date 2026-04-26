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

// FIX: isSuperAdmin يتحدد من localStorage مباشرة عند كل استدعاء
// بدل الاعتماد على متغير عالمي قد يكون خاطئ
function getIsSuperAdmin() {
  return !localStorage.getItem('ownerPropId');
}

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

      if (loginScreen) loginScreen.style.display = "none";
      if (adminLayout) adminLayout.style.display = "flex";
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
    if (loginScreen) loginScreen.style.display = "none";
    if (adminLayout) adminLayout.style.display = "flex";
    loadProperties();
    loadBookings();
  }
});

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
  if (pageTitle) pageTitle.textContent = titles[tabId] || "لوحة التحكم";

  if (tabId === 'bookings') {
    loadBookings();
  }

  if (tabId === 'add-property') {
    setTimeout(() => {
      if (typeof initAddMap === 'function') initAddMap();
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
        <i class="ph ph-circle-notch ph-spin" style="font-size:2rem;"></i><br>جارٍ التحميل...
      </td>
    </tr>`;

  try {
    // FIX: استخدام getIsSuperAdmin() بدل المتغير العالمي
    if (!getIsSuperAdmin()) {
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

function renderPropertiesTable(docsArray) {
  const tbody = document.getElementById("properties-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  docsArray.forEach(doc => {
    const p         = doc.data();
    const isVisible = p.visible !== false;
    const hasLoc    = p.lat && p.lng;

    // إضافة ترجمة لأنواع العقارات لتعرض في الجدول بجانب الاسم
    const typeLabel = {
      apartment: "شقة",
      villa: "فيلا",
      resort: "منتجع",
      pool: "مسبح"
    }[p.type] || "عقار";

    const mapBadge = hasLoc
      ? `<span title="الموقع محدد" style="color:#10b981; font-size:0.85rem; display:inline-flex; align-items:center; gap:4px;">
           <i class="ph-fill ph-map-pin"></i> موقع الخريطة
         </span>`
      : `<span title="لا يوجد موقع" style="color:var(--text-muted); font-size:0.85rem; display:inline-flex; align-items:center; gap:4px;">
           <i class="ph ph-map-pin-slash"></i> بدون خريطة
         </span>`;

    const tr = document.createElement("tr");
    tr.setAttribute('data-prop-id', doc.id);
    tr.innerHTML = `
      <td>
        <img class="admin-table-img"
             src="${p.imageUrl || ''}"
             alt="${p.titleAr || ''}"
             onerror="this.src='images/placeholder.jpg'">
      </td>
      <td>
        <div class="font-bold" style="color:var(--text-main); font-size:1.05rem;">
          ${p.titleAr || '—'} 
          <span style="font-size:0.75rem; background:var(--primary); color:white; padding:2px 6px; border-radius:4px; margin-inline-start:4px;">${typeLabel}</span>
        </div>
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
          <input type="checkbox" ${isVisible ? 'checked' : ''}
                 onchange="toggleVisibility('${doc.id}', this.checked, this)">
          <span class="slider round"></span>
        </label>
      </td>
      <td>
        <div class="action-btns">
          <button class="action-btn view-btn"
                  onclick="window.open('property.html?id=${doc.id}','_blank')"
                  title="معاينة">
            <i class="ph ph-eye"></i>
          </button>
          <button class="action-btn edit-btn"
                  onclick="openEditModal('${doc.id}')"
                  title="تعديل">
            <i class="ph ph-pencil-simple"></i>
          </button>
          <button class="action-btn delete-btn"
                  onclick="deleteProperty('${doc.id}')"
                  title="حذف">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </td>`;
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

      // جلب القيمة من حقل "نوع العقار"
      const typeSelect = document.getElementById("prop-type");
      const propType = typeSelect ? typeSelect.value : "apartment";

      const newProperty = {
        titleAr:    document.getElementById("prop-title-ar").value.trim(),
        titleEn:    document.getElementById("prop-title-en").value.trim(),
        locationAr: document.getElementById("prop-loc-ar").value.trim(),
        locationEn: document.getElementById("prop-loc-en").value.trim(),
        price:      Number(document.getElementById("prop-price").value),
        type:       propType, // حفظ نوع العقار في قاعدة البيانات
        descAr:     document.getElementById("prop-desc-ar").value.trim(),
        descEn:     document.getElementById("prop-desc-en").value.trim(),
        imageUrl,
        lat:       parseFloat(latVal),
        lng:       parseFloat(lngVal),
        visible:   true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("properties").add(newProperty);

      addForm.reset();
      if (uploadStatus) uploadStatus.textContent = "";

      const zoneText = document.querySelector('.upload-zone-text');
      const zoneIcon = document.querySelector('.upload-zone i');
      if (zoneText) { zoneText.textContent = "اضغط هنا أو اسحب الصورة"; zoneText.style.color = "var(--text-main)"; }
      if (zoneIcon) zoneIcon.className = "ph ph-cloud-arrow-up";

      const badge = document.getElementById("map-picked-badge");
      if (badge) badge.classList.remove("visible");

      const latEl = document.getElementById("prop-lat");
      const lngEl = document.getElementById("prop-lng");
      if (latEl) latEl.value = "";
      if (lngEl) lngEl.value = "";

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
    body:   formData
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
    if (!doc.exists) { alert("العقار غير موجود!"); return; }
    const p = doc.data();

    document.getElementById("edit-prop-id").value  = docId;
    document.getElementById("edit-title-ar").value = p.titleAr || "";
    document.getElementById("edit-price").value    = p.price   || "";
    document.getElementById("edit-desc-ar").value  = p.descAr  || "";

    // جلب نوع العقار الحالي وتحديده في المودال (النافذة المنبثقة)
    const editTypeEl = document.getElementById("edit-type");
    if (editTypeEl) {
      editTypeEl.value = p.type || "apartment"; // 'apartment' كقيمة افتراضية لو ما عنده نوع
    }

    const existingLat = p.lat ? parseFloat(p.lat) : null;
    const existingLng = p.lng ? parseFloat(p.lng) : null;

    const editLatEl = document.getElementById("edit-lat");
    const editLngEl = document.getElementById("edit-lng");
    if (editLatEl) editLatEl.value = existingLat || "";
    if (editLngEl) editLngEl.value = existingLng || "";

    const editBadge = document.getElementById("edit-map-picked-badge");
    if (editBadge) editBadge.classList.toggle("visible", !!(existingLat && existingLng));

    editModal.classList.add("active");
    document.body.classList.add("modal-open");

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

const editModalEl = document.getElementById("edit-modal");
if (editModalEl) {
  editModalEl.addEventListener("click", function (e) {
    if (e.target === this) closeEditModal();
  });
}

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
    
    // جلب النوع الجديد في حال تم تعديله
    const editTypeEl = document.getElementById("edit-type");
    const typeValue  = editTypeEl ? editTypeEl.value : "apartment";

    if (!titleAr) { alert("يرجى إدخال اسم العقار"); return; }
    if (!price || isNaN(Number(price))) { alert("يرجى إدخال سعر صحيح"); return; }

    if (submitEditBtn) {
      submitEditBtn.disabled = true;
      submitEditBtn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> جارٍ الحفظ...`;
    }

    try {
      const updateData = {
        titleAr,
        price:     Number(price),
        descAr,
        type:      typeValue, // تحديث نوع العقار
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
  if (!confirm("هل أنت متأكد من حذف هذا العقار نهائياً؟\\nسيتم مسحه من المنصة ولا يمكن التراجع.")) return;

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
//   Load Bookings
//   FIX الرئيسي:
//   1. getIsSuperAdmin() بدل المتغير العالمي
//   2. جلب الحجوزات بـ propertyId + fallback
//      على حقول بديلة إذا ما ضبطت
//   3. Grid أفقي يملأ الشاشة
// =========================================
async function loadBookings() {
  const container = document.getElementById('bookings-container');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:60px; color:var(--text-muted); width:100%;">
      <i class="ph ph-circle-notch ph-spin"
         style="font-size:2.5rem; color:var(--primary); margin-bottom:16px; display:block;"></i>
      جارٍ جلب الحجوزات...
    </div>`;

  try {
    // ─────────────────────────────────────────
    // FIX: قراءة الصلاحية مباشرة من localStorage
    // لا تعتمد على المتغير العالمي isSuperAdmin
    // ─────────────────────────────────────────
    const ownerPropId  = (localStorage.getItem('ownerPropId') || '').trim();
    const isSuperAdmin = !ownerPropId;

    let docs = [];

    if (isSuperAdmin) {
      // ── أدمن عام: كل الحجوزات مرتبة ──────
      try {
        const snap = await db.collection('bookings').orderBy('createdAt', 'desc').get();
        docs = snap.docs;
      } catch (_) {
        const snap = await db.collection('bookings').get();
        docs = snap.docs;
      }

    } else {
      // ── مالك عقار: جرب جميع الحقول الممكنة ──
      // FIX: بعض ملفات الحجز تحفظ الـ ID بأسماء مختلفة
      const FIELD_CANDIDATES = ['propertyId', 'propId', 'propertyDocId', 'property_id'];
      let matched = false;

      for (const field of FIELD_CANDIDATES) {
        try {
          const snap = await db.collection('bookings')
            .where(field, '==', ownerPropId)
            .get();
          if (!snap.empty) {
            docs = snap.docs;
            matched = true;
            console.info(`[loadBookings] ✅ تطابق على الحقل: "${field}" → ${docs.length} حجز`);
            break;
          } else {
            console.info(`[loadBookings] ⬜ الحقل "${field}": لا نتائج`);
          }
        } catch (fieldErr) {
          console.warn(`[loadBookings] ⚠️ الحقل "${field}" يحتاج index:`, fieldErr.message);
        }
      }

      // Fallback: جلب الكل وفلترة كلاينت
      if (!matched) {
        console.warn('[loadBookings] 🔄 Fallback: جلب الكل وفلترة محلية');
        const allSnap = await db.collection('bookings').get();
        docs = allSnap.docs.filter(d => {
          const data = d.data() || {};
          return FIELD_CANDIDATES.some(f =>
            (data[f] || '').toString().trim() === ownerPropId
          );
        });
        console.info(`[loadBookings] نتيجة الفلترة المحلية: ${docs.length} حجز`);
      }
    }

    // ترتيب تنازلي حسب createdAt
    docs.sort((a, b) => {
      const getMs = doc => {
        const v = (doc.data() || {}).createdAt;
        if (!v) return 0;
        if (v.toDate) return v.toDate().getTime();
        return new Date(v).getTime();
      };
      return getMs(b) - getMs(a);
    });

    // ──────────────────────────────────────────
    // لا توجد حجوزات
    // ──────────────────────────────────────────
    if (!docs.length) {
      container.innerHTML = `
        <div style="text-align:center; padding:80px; color:var(--text-muted); width:100%;">
          <i class="ph ph-calendar-blank"
             style="font-size:4rem; margin-bottom:16px; opacity:0.3; display:block;"></i>
          <p style="font-size:1.1rem;">
            ${isSuperAdmin
              ? 'لا توجد حجوزات مسجلة حتى الآن.'
              : 'لا توجد حجوزات لعقارك حتى الآن.'}
          </p>
          ${!isSuperAdmin ? `
            <p style="margin-top:8px; font-size:0.78rem; font-family:monospace;
                      color:var(--text-muted); background:var(--bg-color);
                      display:inline-block; padding:4px 10px; border-radius:6px;">
              Property ID: ${ownerPropId}
            </p>` : ''}
        </div>`;
      return;
    }

    // ──────────────────────────────────────────
    // بناء الكاردات
    // ──────────────────────────────────────────
    const statusLabel = { pending: 'قيد الانتظار', confirmed: 'تم التأكيد', cancelled: 'تم الإلغاء' };
    const statusColor = { pending: '#d97706',       confirmed: '#059669',     cancelled: '#e11d48' };
    const statusBg    = { pending: '#fef3c7',        confirmed: '#ecfdf5',     cancelled: '#ffe4e6' };

    const formatDate = v => {
      if (!v) return '—';
      if (typeof v === 'string') return v;
      if (v.toDate) return v.toDate().toLocaleDateString('ar-DZ');
      return '—';
    };

    const formatDateTime = v => {
      if (!v) return '—';
      const d = v.toDate ? v.toDate() : new Date(v);
      return d.toLocaleDateString('ar-DZ') + ' ' +
             d.toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' });
    };

    // FIX: grid أفقي — 3 أعمدة على الديسكتوب، يتجاوب تلقائياً
    let html = `
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
        gap: 20px;
        width: 100%;
        align-items: start;
      ">`;

    docs.forEach(doc => {
      const b  = doc.data() || {};
      const st = b.status || 'pending';
      const ci = formatDate(b.checkInDate  || b.checkIn);
      const co = formatDate(b.checkOutDate || b.checkOut);
      const createdAtStr = formatDateTime(b.createdAt);
      const docIdShort   = doc.id.slice(0, 8).toUpperCase();

      // الإقامة والأسرّة
      let occupancyHtml = `<span>${b.guests || 1} ضيف</span>`;
      if (b.rooms) {
        const bedMap  = { double:'سرير مزدوج', twin:'سريران منفصلان', king:'سرير كينج', single:'سرير فردي' };
        const bedTxt  = bedMap[b.bedConfig] ? ` · ${bedMap[b.bedConfig]}` : '';
        occupancyHtml = `
          <div style="display:flex; flex-direction:column; gap:2px;">
            <span style="font-weight:700;">${b.rooms} غرف${bedTxt}</span>
            <span style="font-size:0.78rem; color:var(--text-muted);">
              ${b.adults || 0} بالغين${(b.children > 0) ? ` + ${b.children} أطفال` : ''}
            </span>
          </div>`;
      }

      // الإضافات
      let addonsHtml = '';
      if (Array.isArray(b.selectedAddons) && b.selectedAddons.length) {
        const addMap = {
          restaurant:      'المطعم' + (b.restaurantPlan ? ` (${b.restaurantPlan})` : ''),
          wifi:            'إنترنت عالي السرعة',
          spa:             'جلسة سبا',
          parking:         'موقف سيارات',
          airportTransfer: 'نقل المطار',
          lateCheckout:    'تسجيل خروج متأخر',
          extraBed:        'سرير إضافي',
          events:          'تنسيق فعاليات'
        };
        const list = b.selectedAddons.map(a => addMap[a] || a).join('، ');
        addonsHtml = `
          <div style="background:var(--bg-color); padding:10px 12px; border-radius:10px;
                      border:1px solid var(--border-color); margin-top:4px;">
            <div style="font-size:0.78rem; font-weight:700; color:var(--primary); margin-bottom:4px;">
              <i class="ph-fill ph-plus-circle"></i> إضافات مختارة:
            </div>
            <div style="font-size:0.8rem; color:var(--text-main);">${list}</div>
          </div>`;
      }

      // طريقة الدفع والإيصال
      let paymentBadge = '';
      let receiptHtml  = '';
      if (b.paymentMethod === 'transfer') {
        paymentBadge = `
          <span style="font-size:0.7rem; background:#fef3c7; color:#d97706;
                       padding:2px 7px; border-radius:4px; font-weight:700; margin-inline-start:6px;">
            <i class="ph ph-bank"></i> تحويل بنكي
          </span>`;
        receiptHtml = b.receiptUrl
          ? `<a href="${b.receiptUrl}" target="_blank" rel="noopener noreferrer"
               style="background:#fef3c7; color:#d97706; padding:6px 12px; border-radius:8px;
                      font-size:0.8rem; font-weight:700; text-decoration:none;
                      display:inline-flex; align-items:center; gap:6px; border:1px solid #fde68a;">
               <i class="ph ph-receipt"></i> عرض إيصال الدفع
             </a>`
          : `<span style="color:#e11d48; font-size:0.8rem; font-weight:600;
                          display:inline-flex; align-items:center; gap:4px;">
               <i class="ph-fill ph-warning-circle"></i> الإيصال مفقود
             </span>`;
      } else {
        paymentBadge = `
          <span style="font-size:0.7rem; background:#ecfdf5; color:#059669;
                       padding:2px 7px; border-radius:4px; font-weight:700; margin-inline-start:6px;">
            <i class="ph ph-money"></i> الدفع عند الوصول
          </span>`;
      }

      // الملاحظات ووقت الوصول
      let notesHtml = '';
      if (b.arrivalTime || (b.notes && b.notes.trim())) {
        notesHtml = `
          <div style="font-size:0.8rem; color:var(--text-muted); background:#fffbeb;
                      padding:8px 10px; border-inline-start:3px solid #f59e0b;
                      border-radius:0 6px 6px 0; margin-top:4px;">
            ${b.arrivalTime ? `<div><strong style="color:var(--text-main);">وقت الوصول:</strong> ${b.arrivalTime}</div>` : ''}
            ${b.notes && b.notes.trim() ? `<div><strong style="color:var(--text-main);">ملاحظات:</strong> ${b.notes}</div>` : ''}
          </div>`;
      }

      html += `
        <div class="booking-card">

          <!-- هيدر -->
          <div style="display:flex; justify-content:space-between; align-items:flex-start;
                      border-bottom:1px solid var(--border-color); padding-bottom:14px; gap:10px;">
            <div style="min-width:0; flex:1;">
              <div style="font-size:1.05rem; font-weight:700; color:var(--text-main);
                          margin-bottom:4px; word-break:break-word;">
                ${b.guestName || 'غير معروف'}
              </div>
              <div>${paymentBadge}</div>
              <div style="margin-top:6px; font-size:0.72rem; color:var(--text-muted);
                          font-family:monospace; background:var(--bg-color);
                          padding:2px 7px; border-radius:5px; display:inline-block;">
                #${docIdShort}
              </div>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:5px; flex-shrink:0;">
              <span class="status-badge ${st}"
                    style="background:${statusBg[st] || '#f1f5f9'};
                           color:${statusColor[st] || '#64748b'};
                           border:1px solid ${statusColor[st] || '#94a3b8'}40;">
                ${statusLabel[st] || st}
              </span>
              <span style="font-size:0.68rem; color:var(--text-muted); white-space:nowrap;">
                <i class="ph ph-clock"></i> ${createdAtStr}
              </span>
            </div>
          </div>

          <!-- تفاصيل -->
          <div style="display:flex; flex-direction:column; gap:10px; flex:1;">

            <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem;">
              <i class="ph-fill ph-buildings" style="color:var(--primary); font-size:1.1rem; flex-shrink:0;"></i>
              <span style="font-weight:700; color:var(--primary); word-break:break-word;">
                ${b.propertyTitle || '—'}
              </span>
            </div>

            <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--text-main);">
              <i class="ph-fill ph-calendar-check" style="color:var(--text-muted); font-size:1.1rem; flex-shrink:0;"></i>
              <div>
                <div style="font-weight:600;">${ci} ← ${co}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); background:#f1f5f9;
                            padding:1px 7px; border-radius:4px; display:inline-block; margin-top:2px;">
                  ${b.nights || 0} ليالٍ
                </div>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem; color:var(--text-main);">
              <i class="ph-fill ph-users" style="color:var(--text-muted); font-size:1.1rem; flex-shrink:0;"></i>
              ${occupancyHtml}
            </div>

            <div style="display:flex; align-items:center; gap:8px; font-size:0.88rem; min-width:0;">
              <i class="ph-fill ph-phone" style="color:var(--text-muted); font-size:1.1rem; flex-shrink:0;"></i>
              <span dir="ltr" style="font-family:monospace; font-weight:600; overflow-wrap:anywhere;">
                ${b.guestPhone || '—'}
              </span>
            </div>

            <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; min-width:0;">
              <i class="ph-fill ph-envelope" style="color:var(--text-muted); font-size:1.1rem; flex-shrink:0;"></i>
              <span dir="ltr" style="overflow-wrap:anywhere; color:var(--text-muted);">
                ${b.guestEmail || '—'}
              </span>
            </div>

            ${addonsHtml}
            ${notesHtml}

            <!-- الإجمالي -->
            <div style="display:flex; justify-content:space-between; align-items:center;
                        gap:12px; margin-top:auto; padding-top:12px;
                        border-top:1px dashed var(--border-color); flex-wrap:wrap;">
              <div>${receiptHtml}</div>
              <div style="text-align:end;">
                <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase;">
                  الإجمالي
                </div>
                <div style="font-size:1.2rem; font-weight:800; color:var(--primary);">
                  ${Number(b.totalPrice || 0).toLocaleString()} DZD
                </div>
              </div>
            </div>
          </div>

          <!-- أزرار القبول / الرفض -->
          ${st === 'pending' ? `
            <div class="booking-actions-row">
              <button class="btn-approve"
                      onclick="updateBookingStatus('${doc.id}', 'confirmed')">
                <i class="ph-fill ph-check-circle"></i> قبول الحجز
              </button>
              <button class="btn-reject"
                      onclick="updateBookingStatus('${doc.id}', 'cancelled')">
                <i class="ph-fill ph-x-circle"></i> رفض الحجز
              </button>
            </div>` : ''}

        </div>`;
    });

    html += `</div>`;
    container.innerHTML = html;

  } catch (err) {
    console.error('[loadBookings] Fatal:', err);

    const isIndexErr = err.code === 'failed-precondition' ||
      (err.message && err.message.toLowerCase().includes('index'));

    if (isIndexErr) {
      container.innerHTML = `
        <div style="padding:32px; color:#d97706; background:#fef3c7;
                    border-radius:14px; border:1px solid #fde68a; text-align:center; width:100%;">
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
                    border-radius:14px; font-weight:bold; text-align:center; width:100%;">
          خطأ في تحميل الحجوزات: ${err.message}
        </div>`;
    }
  }
}

// =========================================
//   Update Booking Status
// =========================================
window.updateBookingStatus = async function(docId, newStatus) {
  const isConfirm  = newStatus === 'confirmed';
  const confirmMsg = isConfirm
    ? "هل أنت متأكد من تأكيد وقبول هذا الحجز؟"
    : "هل أنت متأكد من رفض وإلغاء هذا الحجز؟";

  if (!confirm(confirmMsg)) return;

  // تعطيل كل الأزرار مؤقتاً
  document.querySelectorAll('.btn-approve, .btn-reject').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.5';
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
    alert('حدث خطأ أثناء تحديث حالة الحجز: ' + err.message);
    document.querySelectorAll('.btn-approve, .btn-reject').forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = '1';
    });
  }
};

// =========================================
//   fetchProperties alias
// =========================================
window.fetchProperties = loadProperties;
