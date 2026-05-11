// =========================================
//   OreBooking Admin Panel Logic — Enhanced
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

const ADMIN_USER = "admin";
const ADMIN_PASS = "admin";

const loginScreen = document.getElementById("admin-login-screen");
const adminLayout = document.getElementById("admin-layout");
const loginForm = document.getElementById("admin-login-form");
const addForm = document.getElementById("add-property-form");
const submitBtn = document.getElementById("submit-prop-btn");
const uploadStatus = document.getElementById("upload-status");
const editForm = document.getElementById("edit-property-form");
const submitEditBtn = document.getElementById("submit-edit-btn");
const editModalEl = document.getElementById("edit-modal");

function getIsSuperAdmin() {
  return !localStorage.getItem("ownerPropId");
}

function getOwnerPropId() {
  return (localStorage.getItem("ownerPropId") || "").trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("en-US")} DZD`;
}

function safeDateMs(value) {
  try {
    if (!value) return 0;
    if (typeof value?.toDate === "function") return value.toDate().getTime();
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? 0 : d.getTime();
  } catch (_) {
    return 0;
  }
}

function formatDate(value) {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (typeof value?.toDate === "function") {
    return value.toDate().toLocaleDateString("ar-DZ");
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("ar-DZ");
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.toLocaleDateString("ar-DZ")} ${d.toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}`;
}

function getPropertyTypeLabel(type) {
  return {
    apartment: "شقة",
    villa: "فيلا",
    resort: "منتجع",
    pool: "مسبح"
  }[type] || "عقار";
}

function getStatusMeta(status) {
  return {
    pending: { label: "قيد الانتظار", cls: "pending", icon: "ph-hourglass-medium" },
    confirmed: { label: "تم التأكيد", cls: "confirmed", icon: "ph-check-circle" },
    cancelled: { label: "تم الإلغاء", cls: "rejected", icon: "ph-x-circle" },
    rejected: { label: "تم الرفض", cls: "rejected", icon: "ph-x-circle" }
  }[status] || { label: status || "—", cls: "pending", icon: "ph-info" };
}

function setButtonLoading(btn, loading, htmlWhenLoading, htmlWhenIdle) {
  if (!btn) return;
  if (loading) {
    btn.disabled = true;
    if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = htmlWhenLoading;
  } else {
    btn.disabled = false;
    btn.innerHTML = htmlWhenIdle || btn.dataset.originalHtml || btn.innerHTML;
  }
}

function showToast(message, type = "success") {
  let host = document.getElementById("admin-toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "admin-toast-host";
    host.style.cssText = "position:fixed;top:20px;left:20px;z-index:5000;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,380px);";
    document.body.appendChild(host);
  }

  const colors = {
    success: { bg: "#ecfdf5", border: "#10b981", text: "#047857", icon: "ph-check-circle" },
    error: { bg: "#fef2f2", border: "#ef4444", text: "#b91c1c", icon: "ph-warning-circle" },
    info: { bg: "#eff6ff", border: "#3b82f6", text: "#1d4ed8", icon: "ph-info" }
  };

  const cfg = colors[type] || colors.info;
  const toast = document.createElement("div");
  toast.style.cssText = `background:${cfg.bg};border:1px solid ${cfg.border};color:${cfg.text};padding:14px 16px;border-radius:16px;box-shadow:0 14px 30px rgba(15,23,42,.12);font-weight:700;font-family:inherit;display:flex;align-items:flex-start;gap:10px;line-height:1.6;`;
  toast.innerHTML = `<i class="ph ${cfg.icon}" style="font-size:1.2rem;flex-shrink:0;margin-top:2px;"></i><span>${escapeHtml(message)}</span>`;
  host.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = "all .25s ease";
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-6px)";
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function showLoginError(msg) {
  const old = loginForm ? loginForm.querySelector(".auth-message") : null;
  if (old) old.remove();

  const div = document.createElement("div");
  div.className = "auth-message error";
  div.textContent = msg;
  div.style.display = "block";
  div.style.marginBottom = "20px";
  div.style.padding = "12px 14px";
  div.style.borderRadius = "14px";
  div.style.background = "#fef2f2";
  div.style.border = "1px solid #fecaca";
  div.style.color = "#b91c1c";
  div.style.fontWeight = "700";
  if (loginForm) loginForm.prepend(div);

  setTimeout(() => div.remove(), 4000);
}

function updateQuickStats() {
  const propertyRows = Array.from(document.querySelectorAll("#properties-tbody tr[data-prop-id]"));
  const bookingCards = Array.from(document.querySelectorAll("#bookings-container .booking-card"));

  const totalProperties = propertyRows.length;
  let activeProperties = 0;
  propertyRows.forEach(row => {
    const status = row.getAttribute("data-visible");
    if (status === "true") activeProperties += 1;
  });

  let pendingBookings = 0;
  bookingCards.forEach(card => {
    const st = card.getAttribute("data-status");
    if (st === "pending") pendingBookings += 1;
  });

  const map = {
    "stat-total-properties": totalProperties,
    "stat-active-properties": activeProperties,
    "stat-total-bookings": bookingCards.length,
    "stat-pending-bookings": pendingBookings
  };

  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  });

  if (typeof window.updateAdminQuickStats === "function" && window.updateAdminQuickStats !== updateQuickStats) {
    try { window.updateAdminQuickStats(); } catch (_) {}
  }
}

function renderPropertiesEmpty(message, isError = false) {
  const tbody = document.getElementById("properties-tbody");
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:36px; color:${isError ? "#e11d48" : "var(--text-muted)"};">
        <i class="ph ${isError ? "ph-warning-circle" : "ph-house-line"}" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
        ${escapeHtml(message)}
      </td>
    </tr>`;
  updateQuickStats();
}

if (loginForm) {
  loginForm.addEventListener("submit", function(e) {
    e.preventDefault();

    const user = document.getElementById("admin-user").value.trim();
    const pass = document.getElementById("admin-pass").value.trim();

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
      localStorage.removeItem("ownerPropId");
      localStorage.removeItem("ownerPropName");
      if (loginScreen) loginScreen.style.display = "none";
      if (adminLayout) adminLayout.style.display = "flex";
      showToast("تم تسجيل الدخول بنجاح", "success");
      loadProperties();
      loadBookings();
      return;
    }

    showLoginError("اسم المستخدم أو كلمة المرور غير صحيحة");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("ownerPropId")) {
    if (loginScreen) loginScreen.style.display = "none";
    if (adminLayout) adminLayout.style.display = "flex";
    loadProperties();
    loadBookings();
  }
});

function switchTab(tabId) {
  document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

  const targetTab = document.getElementById(`tab-${tabId}`);
  if (targetTab) targetTab.classList.add("active");

  const activeBtn = document.querySelector(`[onclick="switchTab('${tabId}')"]`);
  if (activeBtn) activeBtn.classList.add("active");

  const titles = {
    "manage-props": "إدارة العقارات",
    "add-property": "إضافة عقار جديد",
    bookings: "الحجوزات"
  };

  const pageTitle = document.getElementById("page-title");
  if (pageTitle) pageTitle.textContent = titles[tabId] || "لوحة التحكم";

  if (tabId === "bookings") loadBookings();
  if (tabId === "manage-props") loadProperties();
  if (tabId === "add-property") {
    setTimeout(() => {
      if (typeof initAddMap === "function") initAddMap();
    }, 150);
  }
}

async function loadProperties() {
  const tbody = document.getElementById("properties-tbody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="text-align:center; padding:36px; color:var(--text-muted);">
        <i class="ph ph-circle-notch ph-spin" style="font-size:2rem; display:block; margin-bottom:10px;"></i>
        جارٍ تحميل العقارات...
      </td>
    </tr>`;

  try {
    if (!getIsSuperAdmin()) {
      const ownerPropId = getOwnerPropId();
      if (!ownerPropId) {
        renderPropertiesEmpty("لم يتم العثور على معرّف العقار الخاص بهذا المالك.", true);
        return;
      }

      const doc = await db.collection("properties").doc(ownerPropId).get();
      if (!doc.exists) {
        renderPropertiesEmpty("عقارك غير موجود أو تم حذفه.");
        return;
      }

      renderPropertiesTable([doc]);
      return;
    }

    const snapshot = await db.collection("properties").orderBy("createdAt", "desc").get().catch(async () => {
      return await db.collection("properties").get();
    });

    if (snapshot.empty) {
      renderPropertiesEmpty("لا توجد عقارات مضافة بعد.");
      return;
    }

    renderPropertiesTable(snapshot.docs);
  } catch (err) {
    console.error("loadProperties error:", err);
    renderPropertiesEmpty(`حدث خطأ أثناء تحميل العقارات: ${err.message}`, true);
  }
}

function renderPropertiesTable(docsArray) {
  const tbody = document.getElementById("properties-tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  docsArray.forEach(doc => {
    const p = doc.data() || {};
    const isVisible = p.visible !== false;
    const hasLoc = p.lat && p.lng;
    const typeLabel = getPropertyTypeLabel(p.type);
    const mapBadge = hasLoc
      ? `<span class="pill-soft" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;"><i class="ph-fill ph-map-pin"></i> موقع محدد</span>`
      : `<span class="pill-soft" style="background:#f8fafc;color:var(--text-muted);border:1px solid var(--border-color);"><i class="ph ph-map-pin-slash"></i> بدون خريطة</span>`;

    const statusBadge = isVisible
      ? `<span class="status-badge visible"><i class="ph ph-eye"></i> ظاهر</span>`
      : `<span class="status-badge hidden"><i class="ph ph-eye-slash"></i> مخفي</span>`;

    const tr = document.createElement("tr");
    tr.setAttribute("data-prop-id", doc.id);
    tr.setAttribute("data-visible", String(isVisible));
    tr.innerHTML = `
      <td>
        <img class="prop-thumb"
             src="${escapeHtml(p.imageUrl || "images/placeholder.jpg")}" 
             alt="${escapeHtml(p.titleAr || "Property")}" 
             onerror="this.src='images/placeholder.jpg'">
      </td>
      <td>
        <div class="prop-name-cell">
          <strong>${escapeHtml(p.titleAr || "—")}</strong>
          <span>${escapeHtml(p.titleEn || "")}</span>
          <span class="pill-soft" style="width:max-content;background:rgba(67,90,191,.08);color:var(--primary);border:1px solid rgba(67,90,191,.1);">${escapeHtml(typeLabel)}</span>
        </div>
      </td>
      <td>
        <div style="display:grid; gap:8px;">
          <div style="font-weight:600;">${escapeHtml(p.locationAr || "—")}</div>
          <div>${mapBadge}</div>
        </div>
      </td>
      <td>
        <span class="price-pill">${formatCurrency(p.price)}</span>
      </td>
      <td>
        <div style="display:grid; gap:10px;">
          ${statusBadge}
          <label class="switch" style="width:max-content;">
            <input type="checkbox" ${isVisible ? "checked" : ""} onchange="toggleVisibility('${doc.id}', this.checked, this)">
            <span class="slider round"></span>
          </label>
        </div>
      </td>
      <td>
        <div class="table-actions">
          <button type="button" onclick="window.open('property.html?id=${doc.id}','_blank')" title="معاينة">
            <i class="ph ph-eye"></i> معاينة
          </button>
          <button type="button" onclick="openEditModal('${doc.id}')" title="تعديل">
            <i class="ph ph-pencil-simple"></i> تعديل
          </button>
          ${getIsSuperAdmin() ? `
            <button type="button" onclick="deleteProperty('${doc.id}')" title="حذف" style="color:#e11d48;">
              <i class="ph ph-trash"></i> حذف
            </button>` : ""}
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  updateQuickStats();
}

async function toggleVisibility(docId, isVisible, checkboxEl) {
  try {
    if (checkboxEl) checkboxEl.disabled = true;
    await db.collection("properties").doc(docId).update({
      visible: isVisible,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`تم ${isVisible ? "إظهار" : "إخفاء"} العقار بنجاح`, "success");
    await loadProperties();
  } catch (err) {
    console.error("toggleVisibility error:", err);
    if (checkboxEl) checkboxEl.checked = !isVisible;
    showToast("حدث خطأ أثناء تحديث حالة الظهور", "error");
  } finally {
    if (checkboxEl) checkboxEl.disabled = false;
  }
}

if (addForm) {
  addForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const latVal = document.getElementById("prop-lat")?.value.trim() || "";
    const lngVal = document.getElementById("prop-lng")?.value.trim() || "";
    const imageFile = document.getElementById("prop-image")?.files?.[0];
    const propType = document.getElementById("prop-type")?.value || "apartment";

    if (!latVal || !lngVal) {
      showToast("يرجى تحديد موقع العقار على الخريطة قبل النشر.", "error");
      return;
    }

    if (!imageFile) {
      showToast("يرجى اختيار الصورة الرئيسية للعقار.", "error");
      return;
    }

    if (imageFile.size > 5 * 1024 * 1024) {
      showToast("حجم الصورة يتجاوز 5 ميجابايت. اختر صورة أصغر.", "error");
      return;
    }

    setButtonLoading(
      submitBtn,
      true,
      `<i class="ph ph-circle-notch ph-spin"></i> جاري النشر والرفع...`
    );

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
        titleAr: document.getElementById("prop-title-ar")?.value.trim() || "",
        titleEn: document.getElementById("prop-title-en")?.value.trim() || "",
        locationAr: document.getElementById("prop-loc-ar")?.value.trim() || "",
        locationEn: document.getElementById("prop-loc-en")?.value.trim() || "",
        price: Number(document.getElementById("prop-price")?.value || 0),
        type: propType,
        descAr: document.getElementById("prop-desc-ar")?.value.trim() || "",
        descEn: document.getElementById("prop-desc-en")?.value.trim() || "",
        imageUrl,
        lat: parseFloat(latVal),
        lng: parseFloat(lngVal),
        visible: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("properties").add(newProperty);

      addForm.reset();
      if (uploadStatus) uploadStatus.textContent = "";
      document.getElementById("map-picked-badge")?.classList.remove("visible");
      const latEl = document.getElementById("prop-lat");
      const lngEl = document.getElementById("prop-lng");
      if (latEl) latEl.value = "";
      if (lngEl) lngEl.value = "";

      if (typeof window.resetUploadPreview === "function") window.resetUploadPreview();
      if (typeof window._resetAddMap === "function") window._resetAddMap();

      showToast("تمت إضافة العقار بنجاح إلى منصة OreBooking", "success");
      switchTab("manage-props");
      loadProperties();
    } catch (err) {
      console.error("addProperty error:", err);
      showToast(`حدث خطأ أثناء إضافة العقار: ${err.message}`, "error");
      if (uploadStatus) {
        uploadStatus.textContent = "❌ فشل الرفع، يرجى المحاولة لاحقاً";
        uploadStatus.style.color = "#e11d48";
      }
    } finally {
      setButtonLoading(submitBtn, false, null, `<i class="ph-fill ph-plus-circle"></i> نشر العقار على المنصة`);
    }
  });
}

async function uploadToCloudinary(file) {
  const CLOUD_NAME = "dy9bqizhm";
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

async function openEditModal(docId) {
  const editModal = document.getElementById("edit-modal");
  if (!editModal) return;

  try {
    const doc = await db.collection("properties").doc(docId).get();
    if (!doc.exists) {
      showToast("العقار غير موجود", "error");
      return;
    }

    const p = doc.data() || {};
    document.getElementById("edit-prop-id").value = docId;
    document.getElementById("edit-title-ar").value = p.titleAr || "";
    document.getElementById("edit-price").value = p.price || "";
    document.getElementById("edit-desc-ar").value = p.descAr || "";

    const editTypeEl = document.getElementById("edit-type");
    if (editTypeEl) editTypeEl.value = p.type || "apartment";

    const existingLat = p.lat ? parseFloat(p.lat) : null;
    const existingLng = p.lng ? parseFloat(p.lng) : null;

    const editLatEl = document.getElementById("edit-lat");
    const editLngEl = document.getElementById("edit-lng");
    if (editLatEl) editLatEl.value = existingLat || "";
    if (editLngEl) editLngEl.value = existingLng || "";

    document.getElementById("edit-map-picked-badge")?.classList.toggle("visible", !!(existingLat && existingLng));

    editModal.classList.add("active");
    document.body.classList.add("modal-open");

    if (typeof window.initEditMapFromAdmin === "function") {
      window.initEditMapFromAdmin(existingLat, existingLng);
    }
  } catch (err) {
    console.error("openEditModal error:", err);
    showToast("تعذر تحميل بيانات العقار من السيرفر", "error");
  }
}

function closeEditModal() {
  const editModal = document.getElementById("edit-modal");
  if (editModal) editModal.classList.remove("active");
  document.body.classList.remove("modal-open");
}

if (editModalEl) {
  editModalEl.addEventListener("click", function(e) {
    if (e.target === this) closeEditModal();
  });
}

if (editForm) {
  editForm.addEventListener("submit", async function(e) {
    e.preventDefault();

    const docId = document.getElementById("edit-prop-id")?.value;
    const latVal = document.getElementById("edit-lat")?.value.trim() || "";
    const lngVal = document.getElementById("edit-lng")?.value.trim() || "";
    const titleAr = document.getElementById("edit-title-ar")?.value.trim() || "";
    const price = document.getElementById("edit-price")?.value;
    const descAr = document.getElementById("edit-desc-ar")?.value.trim() || "";
    const typeValue = document.getElementById("edit-type")?.value || "apartment";

    if (!docId) {
      showToast("معرّف العقار غير صالح", "error");
      return;
    }
    if (!titleAr) {
      showToast("يرجى إدخال اسم العقار", "error");
      return;
    }
    if (!price || Number.isNaN(Number(price))) {
      showToast("يرجى إدخال سعر صحيح", "error");
      return;
    }

    setButtonLoading(
      submitEditBtn,
      true,
      `<i class="ph ph-circle-notch ph-spin"></i> جارٍ الحفظ...`
    );

    try {
      const updateData = {
        titleAr,
        price: Number(price),
        descAr,
        type: typeValue,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (latVal && lngVal && !Number.isNaN(parseFloat(latVal)) && !Number.isNaN(parseFloat(lngVal))) {
        updateData.lat = parseFloat(latVal);
        updateData.lng = parseFloat(lngVal);
      }

      await db.collection("properties").doc(docId).update(updateData);
      closeEditModal();
      await loadProperties();
      showToast("تم حفظ التعديلات بنجاح", "success");
    } catch (err) {
      console.error("editProperty error:", err);
      showToast(`حدث خطأ أثناء الحفظ: ${err.message}`, "error");
    } finally {
      setButtonLoading(submitEditBtn, false, null, `حفظ التعديلات <i class="ph ph-floppy-disk"></i>`);
    }
  });
}

async function deleteProperty(docId) {
  if (!getIsSuperAdmin()) {
    showToast("غير مسموح لك بحذف العقار من هذه الجلسة", "error");
    return;
  }

  if (!confirm("هل أنت متأكد من حذف هذا العقار نهائياً؟\nسيتم مسحه من المنصة ولا يمكن التراجع.")) return;

  try {
    await db.collection("properties").doc(docId).delete();
    showToast("تم حذف العقار بنجاح", "success");
    loadProperties();
  } catch (err) {
    console.error("deleteProperty error:", err);
    showToast(`حدث خطأ أثناء الحذف: ${err.message}`, "error");
  }
}

async function loadBookings() {
  const container = document.getElementById("bookings-container");
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <i class="ph ph-circle-notch ph-spin"></i>
      جارٍ جلب الحجوزات...
    </div>`;

  try {
    const ownerPropId = getOwnerPropId();
    const isSuperAdmin = !ownerPropId;
    let docs = [];

    if (isSuperAdmin) {
      try {
        const snap = await db.collection("bookings").orderBy("createdAt", "desc").get();
        docs = snap.docs;
      } catch (_) {
        const snap = await db.collection("bookings").get();
        docs = snap.docs;
      }
    } else {
      const FIELD_CANDIDATES = ["propertyId", "propId", "propertyDocId", "property_id"];
      let matched = false;

      for (const field of FIELD_CANDIDATES) {
        try {
          const snap = await db.collection("bookings").where(field, "==", ownerPropId).get();
          if (!snap.empty) {
            docs = snap.docs;
            matched = true;
            break;
          }
        } catch (fieldErr) {
          console.warn(`[loadBookings] field ${field} failed:`, fieldErr.message);
        }
      }

      if (!matched) {
        const allSnap = await db.collection("bookings").get();
        docs = allSnap.docs.filter(d => {
          const data = d.data() || {};
          return FIELD_CANDIDATES.some(f => String(data[f] || "").trim() === ownerPropId);
        });
      }
    }

    docs.sort((a, b) => safeDateMs((b.data() || {}).createdAt) - safeDateMs((a.data() || {}).createdAt));

    if (!docs.length) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="ph ph-calendar-blank"></i>
          <div style="font-size:1.05rem; font-weight:800; color:var(--text-main); margin-bottom:8px;">
            ${isSuperAdmin ? "لا توجد حجوزات مسجلة حتى الآن." : "لا توجد حجوزات لعقارك حتى الآن."}
          </div>
          ${!isSuperAdmin ? `<div style="font-size:.8rem; color:var(--text-muted); font-family:monospace;">Property ID: ${escapeHtml(ownerPropId)}</div>` : ""}
        </div>`;
      updateQuickStats();
      return;
    }

    const addOnLabels = {
      restaurant: "المطعم",
      wifi: "إنترنت عالي السرعة",
      spa: "جلسة سبا",
      parking: "موقف سيارات",
      airportTransfer: "نقل المطار",
      lateCheckout: "تسجيل خروج متأخر",
      extraBed: "سرير إضافي",
      events: "تنسيق فعاليات"
    };

    const cards = docs.map(doc => {
      const b = doc.data() || {};
      const meta = getStatusMeta(b.status || "pending");
      const ci = formatDate(b.checkInDate || b.checkIn);
      const co = formatDate(b.checkOutDate || b.checkOut);
      const createdAtStr = formatDateTime(b.createdAt);
      const docIdShort = doc.id.slice(0, 8).toUpperCase();
      const adults = Number(b.adults || 0);
      const children = Number(b.children || 0);
      const rooms = Number(b.rooms || 0);
      const guests = Number(b.guests || adults + children || 1);
      const addons = Array.isArray(b.selectedAddons)
        ? b.selectedAddons
        : (b.addons && typeof b.addons === "object"
            ? Object.keys(b.addons).filter(key => b.addons[key] === true)
            : []);

      const occupancy = rooms
        ? `
          <div class="booking-meta-item">
            <label>الإقامة</label>
            <strong>${rooms} غرف</strong>
            <span>${adults} بالغين${children > 0 ? ` + ${children} أطفال` : ""}</span>
          </div>`
        : `
          <div class="booking-meta-item">
            <label>الضيوف</label>
            <strong>${guests} ضيف</strong>
            <span>إجمالي عدد المسافرين</span>
          </div>`;

      const paymentMethod = b.paymentMethod === "transfer" || b.paymentMethod === "ccp"
        ? `<span class="pill-soft" style="background:#fef3c7;color:#d97706;border:1px solid #fde68a;"><i class="ph ph-bank"></i> تحويل بنكي</span>`
        : `<span class="pill-soft" style="background:#ecfdf5;color:#059669;border:1px solid #a7f3d0;"><i class="ph ph-money"></i> الدفع عند الوصول</span>`;

      const receipt = (b.paymentMethod === "transfer" || b.paymentMethod === "ccp")
        ? (b.receiptUrl
            ? `<a href="${escapeHtml(b.receiptUrl)}" target="_blank" rel="noopener noreferrer" class="ghost-action" style="min-height:40px;padding:0 14px;font-size:.82rem;"><i class="ph ph-receipt"></i> عرض الإيصال</a>`
            : `<span class="pill-soft" style="background:#fef2f2;color:#e11d48;border:1px solid #fecdd3;"><i class="ph ph-warning-circle"></i> الإيصال مفقود</span>`)
        : "";

      const notes = b.specialRequests || b.notes || "";
      const addonsHtml = addons.length
        ? `<div class="booking-meta-item" style="grid-column:1/-1;">
            <label>الإضافات المختارة</label>
            <span>${escapeHtml(addons.map(a => {
              if (a === "restaurant" && b.restaurantPlan) return `${addOnLabels[a] || a} (${b.restaurantPlan})`;
              return addOnLabels[a] || a;
            }).join("، "))}</span>
          </div>`
        : "";

      const notesHtml = (b.arrivalTime || notes)
        ? `<div class="booking-meta-item" style="grid-column:1/-1;">
            <label>ملاحظات الحجز</label>
            <span>${b.arrivalTime ? `وقت الوصول: ${escapeHtml(b.arrivalTime)}` : ""}${b.arrivalTime && notes ? " — " : ""}${notes ? `ملاحظات: ${escapeHtml(notes)}` : ""}</span>
          </div>`
        : "";

      return `
        <div class="booking-card" data-status="${escapeHtml(b.status || "pending")}">
          <div class="booking-head">
            <div class="booking-title">
              <strong>${escapeHtml(b.guestName || "غير معروف")}</strong>
              <span>#${docIdShort} · ${createdAtStr}</span>
            </div>
            <span class="status-badge ${meta.cls}"><i class="ph ${meta.icon}"></i> ${meta.label}</span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div class="pill-soft" style="background:rgba(67,90,191,.08);color:var(--primary);border:1px solid rgba(67,90,191,.1);">
              <i class="ph ph-buildings"></i> ${escapeHtml(b.propertyTitle || "—")}
            </div>
            ${paymentMethod}
          </div>

          <div class="booking-meta-grid">
            <div class="booking-meta-item">
              <label>تاريخ الإقامة</label>
              <strong>${ci} ← ${co}</strong>
              <span>${Number(b.nights || 0)} ليالٍ</span>
            </div>
            ${occupancy}
            <div class="booking-meta-item">
              <label>الهاتف</label>
              <strong dir="ltr">${escapeHtml(b.guestPhone || "—")}</strong>
              <span>رقم التواصل</span>
            </div>
            <div class="booking-meta-item">
              <label>البريد الإلكتروني</label>
              <strong dir="ltr">${escapeHtml(b.guestEmail || "—")}</strong>
              <span>بيانات العميل</span>
            </div>
            ${addonsHtml}
            ${notesHtml}
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; border-top:1px dashed var(--border-color); padding-top:14px;">
            <div>${receipt}</div>
            <div style="text-align:end;">
              <div style="font-size:.73rem; color:var(--text-muted); font-weight:800;">الإجمالي</div>
              <div style="font-size:1.18rem; color:var(--primary); font-weight:800;">${formatCurrency(b.totalPrice)}</div>
            </div>
          </div>

          ${(b.status || "pending") === "pending" ? `
            <div class="booking-actions-row">
              <button class="btn-approve" onclick="updateBookingStatus('${doc.id}', 'confirmed', this)">
                <i class="ph-fill ph-check-circle"></i> قبول الحجز
              </button>
              <button class="btn-reject" onclick="updateBookingStatus('${doc.id}', 'cancelled', this)">
                <i class="ph-fill ph-x-circle"></i> رفض الحجز
              </button>
            </div>` : ""}
        </div>`;
    }).join("");

    container.innerHTML = `<div class="bookings-grid">${cards}</div>`;
    updateQuickStats();
  } catch (err) {
    console.error("[loadBookings] Fatal:", err);
    const isIndexErr = err.code === "failed-precondition" || String(err.message || "").toLowerCase().includes("index");

    if (isIndexErr) {
      container.innerHTML = `
        <div class="empty-state" style="background:#fff7ed;border-color:#fdba74;color:#9a3412;">
          <i class="ph ph-warning"></i>
          <div style="font-weight:800; margin-bottom:8px; color:#9a3412;">هذا الاستعلام يحتاج إلى Index في Firestore</div>
          <div style="font-size:.88rem; line-height:1.8;">افتح الـ Console واضغط على رابط إنشاء الـ Index، ثم أعد تحميل الصفحة.</div>
        </div>`;
    } else {
      container.innerHTML = `
        <div class="empty-state" style="background:#fef2f2;border-color:#fecaca;color:#b91c1c;">
          <i class="ph ph-warning-circle"></i>
          خطأ في تحميل الحجوزات: ${escapeHtml(err.message)}
        </div>`;
    }
    updateQuickStats();
  }
}

window.updateBookingStatus = async function(docId, newStatus, clickedBtn = null) {
  const isConfirm = newStatus === "confirmed";
  const confirmMsg = isConfirm
    ? "هل أنت متأكد من تأكيد وقبول هذا الحجز؟"
    : "هل أنت متأكد من رفض وإلغاء هذا الحجز؟";

  if (!confirm(confirmMsg)) return;

  const row = clickedBtn?.closest?.(".booking-actions-row") || null;
  const buttons = row ? Array.from(row.querySelectorAll("button")) : Array.from(document.querySelectorAll(".btn-approve, .btn-reject"));
  buttons.forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = "0.6";
  });

  try {
    await db.collection("bookings").doc(docId).update({
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast(`تم ${isConfirm ? "قبول" : "رفض"} الحجز بنجاح`, "success");
    await loadBookings();
  } catch (err) {
    console.error("[updateBookingStatus]", err);
    showToast(`حدث خطأ أثناء تحديث حالة الحجز: ${err.message}`, "error");
    buttons.forEach(btn => {
      btn.disabled = false;
      btn.style.opacity = "1";
    });
  }
};

window.fetchProperties = loadProperties;
window.loadProperties = loadProperties;
window.loadBookings = loadBookings;
window.switchTab = switchTab;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.deleteProperty = deleteProperty;
window.toggleVisibility = toggleVisibility;
window.updateAdminQuickStats = updateQuickStats;
