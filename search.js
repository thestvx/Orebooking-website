// =========================================
//   Smart Search — search.js
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('search-location');
  const searchBtn   = document.getElementById('main-search-btn');
  const dropdown    = document.getElementById('search-dropdown');
  const listingsGrid = document.getElementById('listings-grid');
  const sectionTitle = document.getElementById('section-main-title');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const spinner     = document.getElementById('search-spinner');
  const noResults   = document.getElementById('search-no-results');

  if (!searchInput || !searchBtn || !dropdown) return;

  let allProperties = []; // سيتم تخزين كل العقارات هنا عند أول تحميل
  let isPropertiesLoaded = false;

  // 1. جلب جميع العقارات من فايربيس في الخلفية
  async function fetchAllProperties() {
    if (isPropertiesLoaded) return;
    try {
      const snap = await firebase.firestore().collection('properties').where('visible', '==', true).get();
      allProperties = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      isPropertiesLoaded = true;
    } catch (err) {
      console.error('Error fetching properties for search:', err);
    }
  }

  // استدعاء دالة الجلب فوراً
  fetchAllProperties();

  // 2. البحث أثناء الكتابة (Autocomplete)
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();

    if (val.length < 2) {
      dropdown.classList.remove('active');
      return;
    }

    // تصفية النتائج بناءً على (الاسم بالعربي/انجليزي) أو (الموقع بالعربي/انجليزي)
    const matches = allProperties.filter(p => {
      const titleEn = (p.titleEn || '').toLowerCase();
      const titleAr = (p.titleAr || '').toLowerCase();
      const locEn   = (p.locationEn || '').toLowerCase();
      const locAr   = (p.locationAr || '').toLowerCase();

      return titleEn.includes(val) || titleAr.includes(val) || locEn.includes(val) || locAr.includes(val);
    });

    renderDropdown(matches, val);
  });

  // 3. عرض النتائج في القائمة المنسدلة
  function renderDropdown(matches, query) {
    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="no-results">لم يتم العثور على نتائج لـ "<b>${query}</b>"</div>`;
      dropdown.classList.add('active');
      return;
    }

    // استخراج أسماء المدن/الولايات الفريدة
    const locations = [...new Set(matches.map(p => p.locationAr || p.locationEn))].filter(Boolean).slice(0, 3);

    // الفنادق المطابقة
    const hotels = matches.slice(0, 4);

    let html = '';

    // قسم المدن (أماكن)
    if (locations.length > 0) {
      html += `<div style="padding: 8px 16px; font-size: 0.75rem; color: var(--text-muted); font-weight: bold; text-transform: uppercase;">مدن وولايات</div>`;
      locations.forEach(loc => {
        html += `
          <div class="search-item" data-type="location" data-val="${loc}">
            <div class="search-icon-box" style="border-radius:50%;"><i class="ph ph-map-pin"></i></div>
            <div class="search-item-info">
              <span class="search-item-title">${loc}</span>
              <span class="search-item-sub">الجزائر</span>
            </div>
          </div>
        `;
      });
    }

    // قسم العقارات (فنادق/شقق)
    if (hotels.length > 0) {
      html += `<div style="padding: 8px 16px; font-size: 0.75rem; color: var(--text-muted); font-weight: bold; text-transform: uppercase;">عقارات وفنادق</div>`;
      hotels.forEach(h => {
        const title = h.titleAr || h.titleEn;
        const loc = h.locationAr || h.locationEn;
        html += `
          <div class="search-item" data-type="hotel" data-id="${h.id}" data-val="${title}">
            <img src="${h.imageUrl || 'images/placeholder.jpg'}" style="width:40px; height:40px; border-radius:8px; object-fit:cover;">
            <div class="search-item-info">
              <span class="search-item-title">${title}</span>
              <span class="search-item-sub">${loc} · ${Number(h.price).toLocaleString()} DZD</span>
            </div>
          </div>
        `;
      });
    }

    dropdown.innerHTML = html;
    dropdown.classList.add('active');

    // تفعيل ضغطة المستخدم على أحد الخيارات
    dropdown.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        const val = item.getAttribute('data-val');

        searchInput.value = val;
        dropdown.classList.remove('active');

        if (type === 'hotel') {
          // إذا اختار فندق، توجه لصفحة الحجز مباشرة
          const id = item.getAttribute('data-id');
          window.location.href = `booking.html?id=${id}`;
        } else {
          // إذا اختار مدينة، قم بتنفيذ البحث والفلترة
          executeSearch(val);
        }
      });
    });
  }

  // 4. تنفيذ البحث وفلترة البطاقات المعروضة
  async function executeSearch(query) {
    const val = query.toLowerCase().trim();
    if (!val) return;

    dropdown.classList.remove('active');

    // إخفاء الـ Grid وتدوير الـ Spinner
    listingsGrid.style.display = 'none';
    noResults.style.display = 'none';
    spinner.style.display = 'block';

    // تغيير العنوان
    sectionTitle.innerHTML = `نتائج البحث عن: <span style="color:var(--primary)">${query}</span>`;
    clearSearchBtn.style.display = 'inline-flex';

    // فلترة العقارات
    const matches = allProperties.filter(p => {
      const titleEn = (p.titleEn || '').toLowerCase();
      const titleAr = (p.titleAr || '').toLowerCase();
      const locEn   = (p.locationEn || '').toLowerCase();
      const locAr   = (p.locationAr || '').toLowerCase();
      return titleEn.includes(val) || titleAr.includes(val) || locEn.includes(val) || locAr.includes(val);
    });

    // تأخير وهمي بسيط ليعطي شعوراً بالبحث
    setTimeout(() => {
      spinner.style.display = 'none';

      if (matches.length === 0) {
        noResults.style.display = 'block';
      } else {
        listingsGrid.style.display = 'grid';
        // مسح البطاقات القديمة واستدعاء الدالة المسؤولة عن رسم البطاقات
        // الدالة renderListings موجودة في script.js لديك، نمرر لها المصفوفة الجديدة
        if (typeof window.renderListings === 'function') {
          window.renderListings(matches);
        } else {
          console.error("renderListings function not found in script.js");
        }
      }

      // النزول برفق لنتائج البحث
      sectionTitle.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 600);
  }

  // 5. عند الضغط على زر "بحث" الرئيسي أو الـ Enter
  searchBtn.addEventListener('click', () => executeSearch(searchInput.value));
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      executeSearch(searchInput.value);
    }
  });

  // 6. زر إلغاء البحث والعودة
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    sectionTitle.setAttribute('data-i18n', 'trending'); // يعيد الترجمة
    if (typeof window.applyTranslations === 'function') window.applyTranslations();
    else sectionTitle.textContent = "Trending Destinations"; // fallback

    clearSearchBtn.style.display = 'none';
    noResults.style.display = 'none';
    listingsGrid.style.display = 'grid';

    // إعادة رسم كل العقارات
    if (typeof window.renderListings === 'function') {
      window.renderListings(allProperties);
    }
  });

  // 7. إغلاق القائمة المنسدلة عند النقر خارجها
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('active');
    }
  });
});
