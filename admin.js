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

  document.getElementById("tab-" + tabId).classList.add("active");

  const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
  if (activeBtn) activeBtn.classList.add("active");

  const titles = {
    "manage-props": "إدارة العقارات",
    "add-property": "إضافة عقار جديد",
    "bookings":     "الحجوزات"
  };
  document.getElementById("page-title").textContent = titles[tabId] || "";
}

// =========================================
//   Load Properties from Firestore
// =========================================
async function loadProperties() {
  const tbody = document.getElementById("properties-tbody");
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
      // ✅ عرض أيقونة الخريطة إذا كان الموقع محدداً
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

addForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const imageFile = document.getElementById("prop-image").files[0];
  if (!imageFile) { alert("يرجى اختيار صورة"); return; }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="ph ph-circle-notch"></i> جارٍ الرفع...`;
  uploadStatus.textContent = "جارٍ رفع الصورة...";

  try {
    const imageUrl = await uploadToCloudinary(imageFile);
    uploadStatus.textContent = "✅ تم رفع الصورة";

    // ✅ قراءة الإحداثيات من الخريطة (اختياري)
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

    // ✅ أضف lat/lng فقط إذا تم تحديدهما
    if (latVal && lngVal) {
      newProperty.lat = parseFloat(latVal);
      newProperty.lng = parseFloat(lngVal);
    }

    await db.collection("properties").add(newProperty);

    addForm.reset();
    uploadStatus.textContent = "";
    // إعادة تعيين badge الخريطة
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

    // ✅ تحميل الإحداثيات الموجودة في حقول التعديل
    const existingLat = p.lat ? parseFloat(p.lat) : null;
    const existingLng = p.lng ? parseFloat(p.lng) : null;

    document.getElementById("edit-lat").value = existingLat || "";
    document.getElementById("edit-lng").value = existingLng || "";

    // إظهار badge إذا كان الموقع محدداً مسبقاً
    const editBadge = document.getElementById("edit-map-picked-badge");
    if (editBadge) {
      editBadge.classList.toggle("visible", !!(existingLat && existingLng));
    }

    document.getElementById("edit-modal").classList.add("active");
    document.body.classList.add("modal-open");

    // ✅ تهيئة خريطة التعديل مع الموقع الحالي
    if (typeof window.initEditMapFromAdmin === "function") {
      window.initEditMapFromAdmin(existingLat, existingLng);
    }

  } catch (err) {
    console.error(err);
    alert("تعذّر تحميل بيانات العقار");
  }
}

function closeEditModal() {
  document.getElementById("edit-modal").classList.remove("active");
  document.body.classList.remove("modal-open");
}

const editForm      = document.getElementById("edit-property-form");
const submitEditBtn = document.getElementById("submit-edit-btn");

editForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const docId = document.getElementById("edit-prop-id").value;
  submitEditBtn.disabled    = true;
  submitEditBtn.textContent = "جارٍ الحفظ...";

  try {
    // ✅ قراءة الإحداثيات المحدّثة من خريطة التعديل
    const latVal = document.getElementById("edit-lat").value;
    const lngVal = document.getElementById("edit-lng").value;

    const updateData = {
      titleAr: document.getElementById("edit-title-ar").value.trim(),
      price:   Number(document.getElementById("edit-price").value),
      descAr:  document.getElementById("edit-desc-ar").value.trim()
    };

    // ✅ أضف lat/lng إذا تم تحديدهما
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

// إغلاق المودال عند الضغط خارجه
document.getElementById("edit-modal").addEventListener("click", function (e) {
  if (e.target === this) closeEditModal();
});

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
