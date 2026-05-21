// =========================================
//   Smart Search — search.js
// =========================================

document.addEventListener('DOMContentLoaded', () => {
  const searchInput    = document.getElementById('search-location');
  const searchBtn      = document.getElementById('main-search-btn');
  const dropdown       = document.getElementById('search-dropdown');
  const listingsGrid   = document.getElementById('listings-grid');
  const sectionTitle   = document.getElementById('section-main-title');
  const clearSearchBtn = document.getElementById('clear-search-btn');
  const spinner        = document.getElementById('search-spinner');
  const noResults      = document.getElementById('search-no-results');

  if (!searchInput || !searchBtn || !dropdown) return;

  let allProperties      = [];
  let isPropertiesLoaded = false;

  // ─────────────────────────────────────────
  function applyMobileReadonly() {
    searchInput.setAttribute('inputmode', 'none');
    searchInput.setAttribute('autocomplete', 'off');
    searchInput.setAttribute('autocorrect', 'off');
    searchInput.setAttribute('autocapitalize', 'off');
    searchInput.setAttribute('spellcheck', 'false');

    if (window.innerWidth <= 768) {
      searchInput.setAttribute('readonly', 'true');
    } else {
      searchInput.removeAttribute('readonly');
    }
  }

  applyMobileReadonly();
  window.addEventListener('resize', applyMobileReadonly);

  // على الكمبيوتر: رفع readonly لحظة الـ focus للسماح بالكتابة
  searchInput.addEventListener('focus', () => {
    if (window.innerWidth > 768) {
      searchInput.removeAttribute('readonly');
    }
  });
  searchInput.addEventListener('blur', () => {
    if (window.innerWidth <= 768) {
      searchInput.setAttribute('readonly', 'true');
    }
  });

  // ─────────────────────────────────────────
  // دالة مساعدة: اللغة الحالية
  // ─────────────────────────────────────────
  function getLang() {
    return (typeof state !== 'undefined' && state.lang) ? state.lang : 'ar';
  }

  // ─────────────────────────────────────────
  // 1. جلب العقارات من Firestore
  // ─────────────────────────────────────────
  async function fetchAllProperties() {
    if (isPropertiesLoaded) return;
    try {
      const snap = await firebase.firestore()
        .collection('properties')
        .where('visible', '==', true)
        .get();
      allProperties = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      isPropertiesLoaded = true;
    } catch (err) {
      console.error('Error fetching properties for search:', err);
      // fallback: استخدم liveProperties من script.js إن وُجدت
      if (typeof state !== 'undefined' && state.liveProperties?.length) {
        allProperties = state.liveProperties;
        isPropertiesLoaded = true;
      }
    }
  }

  fetchAllProperties();

  // ─────────────────────────────────────────
  // 2. البحث أثناء الكتابة (Autocomplete)
  //    يعمل فقط على الكمبيوتر (على الجوال
  //    المستخدم لا يكتب — يختار من القائمة)
  // ─────────────────────────────────────────
  searchInput.addEventListener('input', (e) => {
    if (window.innerWidth <= 768) return; // الجوال: لا input، فقط click
    const val = e.target.value.trim().toLowerCase();
    if (val.length < 2) {
      dropdown.classList.remove('active');
      return;
    }
    const lang    = getLang();
    const matches = allProperties.filter(p => filterProperty(p, val));
    renderDropdown(matches, e.target.value.trim(), lang);
  });

  // ─────────────────────────────────────────
  // على الجوال: النقر يفتح dropdown الولايات
  // (يتعاون مع initSmartSearch في script.js)
  // ─────────────────────────────────────────
  searchInput.addEventListener('click', () => {
    if (window.innerWidth <= 768) {
      if (typeof window.selectWilaya === 'function') return; // script.js يتولى
    }
  });

  // ─────────────────────────────────────────
  // دالة فلترة عقار بحسب query
  // ─────────────────────────────────────────
  function filterProperty(p, val) {
    const fields = [
      p.titleEn    || p.title_en    || '',
      p.titleAr    || p.title_ar    || '',
      p.locationEn || p.location_en || '',
      p.locationAr || p.location_ar || '',
    ];
    return fields.some(f => f.toLowerCase().includes(val));
  }

  // ─────────────────────────────────────────
  // 3. عرض النتائج في القائمة المنسدلة
  // ─────────────────────────────────────────
  function renderDropdown(matches, query, lang) {
    const isAr = lang === 'ar';

    if (matches.length === 0) {
      dropdown.innerHTML = `
        <div class="no-results" style="padding: 16px; text-align: center; color: var(--text-muted);">
          <i class="ph ph-magnifying-glass" style="font-size: 1.5rem; margin-bottom: 8px;"></i>
          <span style="display: block;">${isAr ? `لم يتم العثور على نتائج لـ "${query}"` : `No results for "${query}"`}</span>
        </div>
      `;
      dropdown.classList.add('active');
      return;
    }

    // استخراج أسماء الولايات/المواقع الفريدة
    const locationField = isAr
      ? p => p.locationAr || p.location_ar || p.locationEn || p.location_en
      : p => p.locationEn || p.location_en || p.locationAr || p.location_ar;

    const locations = [
      ...new Set(matches.map(locationField).filter(Boolean))
    ].slice(0, 3);

    const hotels = matches.slice(0, 4);

    let html = '';

    // ─── قسم المواقع ───
    if (locations.length > 0) {
      html += `
        <div class="search-dropdown-section-title" style="padding: 8px 20px; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
          ${isAr ? 'مواقع وولايات' : 'Locations'}
        </div>
      `;
      locations.forEach(loc => {
        // ✅ FIX: لا sub-text "الجزائر" هنا
        html += `
          <div class="search-item" data-type="location" data-val="${escAttr(loc)}" style="padding: 12px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.2s;">
            <div class="search-icon-box" style="width: 32px; height: 32px; border-radius: 8px; background: rgba(67,90,191,0.1); color: var(--primary); display: flex; align-items: center; justify-content: center;">
              <i class="ph ph-map-pin"></i>
            </div>
            <div class="search-item-info">
              <span class="search-item-title" style="font-weight: 600; display: block; color: var(--text-main);">${loc}</span>
            </div>
          </div>
        `;
      });
    }

    // ─── قسم العقارات ───
    if (hotels.length > 0) {
      html += `
        <div class="search-dropdown-section-title" style="padding: 8px 20px; font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 8px;">
          ${isAr ? 'عقارات وفنادق' : 'Properties'}
        </div>
      `;
      hotels.forEach(h => {
        const title    = isAr
          ? (h.titleAr    || h.title_ar    || h.titleEn    || h.title_en    || '')
          : (h.titleEn    || h.title_en    || h.titleAr    || h.title_ar    || '');
        const loc      = isAr
          ? (h.locationAr || h.location_ar || h.locationEn || h.location_en || '')
          : (h.locationEn || h.location_en || h.locationAr || h.location_ar || '');
        const currency = isAr ? 'د.ج' : 'DZD';
        const imgSrc   = h.imageUrl || h.image || 'images/placeholder.jpg';

        html += `
          <div class="search-item" data-type="hotel" data-id="${escAttr(h.id)}" data-val="${escAttr(title)}" style="padding: 12px 20px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.2s;">
            <img
              src="${escAttr(imgSrc)}"
              style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;"
              onerror="this.src='images/placeholder.jpg'"
              alt="${escAttr(title)}"
            >
            <div class="search-item-info">
              <span class="search-item-title" style="font-weight: 600; display: block; color: var(--text-main);">${title}</span>
              <span class="search-item-sub" style="font-size: 0.8rem; color: var(--text-muted); display: block; margin-top: 2px;">
                ${loc}${loc && h.price ? ' · ' : ''}${h.price ? Number(h.price).toLocaleString() + ' ' + currency : ''}
              </span>
            </div>
          </div>
        `;
      });
    }

    dropdown.innerHTML = html;
    dropdown.classList.add('active');

    // ─── ضغطة على خيار ───
    dropdown.querySelectorAll('.search-item').forEach(item => {
      item.addEventListener('click', () => {
        const type = item.getAttribute('data-type');
        const val  = item.getAttribute('data-val');

        searchInput.value = val;
        dropdown.classList.remove('active');

        if (type === 'hotel') {
          const id = item.getAttribute('data-id');
          window.location.href = `property.html?id=${id}`;
        } else {
          executeSearch(val);
        }
      });
    });
  }

  // ─────────────────────────────────────────
  // escape للـ HTML attributes
  // ─────────────────────────────────────────
  function escAttr(str) {
    return String(str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ─────────────────────────────────────────
  // 4. تنفيذ البحث وفلترة البطاقات
  // ─────────────────────────────────────────
  async function executeSearch(query) {
    const val  = (query || '').trim();
    const lang = getLang();
    const isAr = lang === 'ar';

    if (!val) {
      handleClear();
      return;
    }

    const valLow = val.toLowerCase();
    dropdown.classList.remove('active');

    if (listingsGrid)   listingsGrid.style.display = 'none';
    if (noResults)      noResults.style.display    = 'none';
    if (spinner)        spinner.style.display      = 'block';

    if (sectionTitle) {
      sectionTitle.removeAttribute('data-i18n');
      sectionTitle.innerHTML = isAr
        ? `نتائج البحث عن: <span style="color:var(--primary)">${val}</span>`
        : `Results for: <span style="color:var(--primary)">${val}</span>`;
    }
    
    // Always hide the clearSearchBtn in layout to prevent breaking design 
    // It's already hidden in CSS with !important, but just enforcing state
    if (clearSearchBtn) clearSearchBtn.style.setProperty('display', 'none', 'important');

    // تأكد من تحميل العقارات
    if (!isPropertiesLoaded) await fetchAllProperties();

    const matches = allProperties.filter(p => filterProperty(p, valLow));

    setTimeout(() => {
      if (spinner) spinner.style.display = 'none';

      if (matches.length === 0) {
        if (noResults)    noResults.style.display    = 'block';
        if (listingsGrid) listingsGrid.style.display = 'none';
      } else {
        if (noResults)    noResults.style.display    = 'none';
        if (listingsGrid) listingsGrid.style.display = 'grid';

        if (typeof window.renderListings === 'function') {
          // نحوّل المفاتيح لتتوافق مع renderListings في script.js
          const normalized = matches.map(p => ({
            id:          String(p.id),
            title_en:    p.titleEn    || p.title_en    || '',
            title_ar:    p.titleAr    || p.title_ar    || '',
            location_en: p.locationEn || p.location_en || '',
            location_ar: p.locationAr || p.location_ar || '',
            price:       p.price      || 0,
            rating:      p.rating     || 4.80,
            image:       p.imageUrl   || p.image       || '',
            images:      Array.isArray(p.images) && p.images.length ? p.images : [p.imageUrl || p.image || ''],
            urgency:     p.urgency    || null,
            desc_en:     p.descEn     || p.desc_en     || '',
            desc_ar:     p.descAr     || p.desc_ar     || '',
            features_en: Array.isArray(p.featuresEn || p.features_en) ? (p.featuresEn || p.features_en) : [],
            features_ar: Array.isArray(p.featuresAr || p.features_ar) ? (p.featuresAr || p.features_ar) : [],
            lat:         p.lat || null,
            lng:         p.lng || null,
          }));
          window.renderListings(normalized);
        } else {
          console.error('renderListings not found in script.js');
        }
      }

      sectionTitle?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
  }

  // ─────────────────────────────────────────
  // 5. زر البحث + Enter
  // ─────────────────────────────────────────
  searchBtn.addEventListener('click', (e) => {
    e.preventDefault();
    executeSearch(searchInput.value);
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      dropdown.classList.remove('active');
      executeSearch(searchInput.value);
    }
    if (e.key === 'Escape') {
      dropdown.classList.remove('active');
    }
  });

  // ─────────────────────────────────────────
  // 6. زر إلغاء البحث
  // ─────────────────────────────────────────
  function handleClear() {
    // Try to trigger global reset if exists
    if (typeof resetToHome === 'function') {
      resetToHome();
    } else if (typeof window.resetToHome === 'function') {
      window.resetToHome();
    } else {
      // fallback
      searchInput.value = '';
      if (clearSearchBtn) clearSearchBtn.style.setProperty('display', 'none', 'important');
      if (noResults)      noResults.style.display      = 'none';
      if (listingsGrid)   listingsGrid.style.display   = 'grid';
      if (spinner)        spinner.style.display        = 'none';

      if (sectionTitle) {
        sectionTitle.setAttribute('data-i18n', 'trending');
        sectionTitle.textContent = getLang() === 'ar' ? 'الوجهات الشائعة' : 'Trending Destinations';
      }

      if (typeof window.renderListings === 'function') {
        const src = (typeof state !== 'undefined' && state.liveProperties?.length)
          ? state.liveProperties
          : allProperties;
        window.renderListings(src);
      }
    }
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', handleClear);
  }

  // ─────────────────────────────────────────
  // 7. إغلاق dropdown عند النقر خارجه
  // ─────────────────────────────────────────
  document.addEventListener('click', (e) => {
    if (
      !searchInput.contains(e.target) &&
      !dropdown.contains(e.target) &&
      !searchBtn.contains(e.target)
    ) {
      dropdown.classList.remove('active');
    }
  });
});
