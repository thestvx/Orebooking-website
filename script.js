"use strict";

(function () {
  if (window.__ORE_SCRIPT_INIT__) return;
  window.__ORE_SCRIPT_INIT__ = true;

  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyCA5iauXrIhozRw8MD7JTOLyeQ2v0GGncA",
    authDomain: "orebooking-website.firebaseapp.com",
    projectId: "orebooking-website",
    storageBucket: "orebooking-website.firebasestorage.app",
    messagingSenderId: "1012887567747",
    appId: "1:1012887567747:web:153b57b60cb143d88acab6",
    measurementId: "G-5GKMRMVHC3"
  };

  const STORAGE = {
    lang: "ore_lang",
    theme: "ore_theme",
    favoritesGuest: "ore_favorites_guest",
    selectedPropertyId: "selectedPropertyId",
    selectedPropertyData: "ore_selected_property",
    postAuthRedirect: "ore_post_auth_redirect",
    chatGuestPrefix: "ore_chat_guest_"
  };

  const ROUTES = {
    home: "index.html",
    auth: "auth.html",
    property: "property.html",
    booking: "booking.html",
    favorites: "favorites.html"
  };

  const state = {
    lang: getLocal(STORAGE.lang, "en") === "ar" ? "ar" : "en",
    theme: getLocal(STORAGE.theme, "light") === "dark" ? "dark" : "light",
    user: null,
    db: null,
    auth: null,
    googleProvider: null,
    properties: [],
    favorites: [],
    selectedProperty: null,
    currentPropertyId: "",
    currentChatPropertyId: ""
  };

  const fallbackProperties = [
    {
      id: "setif-city-suite",
      title: "Setif City Suite",
      title_en: "Setif City Suite",
      title_ar: "جناح سطيف سيتي",
      location: "Sétif, Algeria",
      location_en: "Sétif, Algeria",
      location_ar: "سطيف، الجزائر",
      type: "apartment",
      price: 9800,
      rating: 4.7,
      maxGuests: 3,
      bedrooms: 1,
      lat: 36.1904,
      lng: 5.4137,
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"
      ],
      description: "Modern apartment in the city center.",
      desc_en: "Modern apartment in the city center.",
      desc_ar: "شقة عصرية في وسط المدينة.",
      features: ["wifi", "kitchen", "ac", "security"]
    },
    {
      id: "algiers-sky-hotel",
      title: "Algiers Sky Hotel",
      title_en: "Algiers Sky Hotel",
      title_ar: "فندق الجزائر سكاي",
      location: "Algiers, Algeria",
      location_en: "Algiers, Algeria",
      location_ar: "الجزائر العاصمة، الجزائر",
      type: "hotel",
      price: 18500,
      rating: 4.8,
      maxGuests: 4,
      bedrooms: 2,
      lat: 36.7538,
      lng: 3.0588,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
      ],
      description: "Elegant hotel stay with premium amenities.",
      desc_en: "Elegant hotel stay with premium amenities.",
      desc_ar: "إقامة فندقية أنيقة مع مرافق مميزة.",
      features: ["wifi", "breakfast", "parking", "restaurant"]
    },
    {
      id: "bejaia-coast-villa",
      title: "Bejaia Coast Villa",
      title_en: "Bejaia Coast Villa",
      title_ar: "فيلا ساحل بجاية",
      location: "Béjaïa, Algeria",
      location_en: "Béjaïa, Algeria",
      location_ar: "بجاية، الجزائر",
      type: "villa",
      price: 34500,
      rating: 4.9,
      maxGuests: 8,
      bedrooms: 4,
      lat: 36.7515,
      lng: 5.0557,
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
      ],
      description: "Private villa near the coast.",
      desc_en: "Private villa near the coast.",
      desc_ar: "فيلا خاصة قريبة من الساحل.",
      features: ["pool", "parking", "kitchen", "tv"]
    }
  ];

  const translations = {
    en: {
      sign_in: "Sign In",
      sign_out: "Sign Out",
      favorites: "Favorites",
      my_bookings: "My Bookings",
      guest_user: "Guest User",
      search_placeholder: "Search city or property",
      view_details: "View details",
      reserve_now: "Reserve now",
      save: "Save",
      saved: "Saved",
      no_results: "No properties found",
      auth_required: "Please sign in first.",
      login_success: "Login successful.",
      register_success: "Account created successfully.",
      reset_sent: "Password reset link sent.",
      invalid_email: "Please enter a valid email address.",
      fill_required: "Please fill all required fields.",
      logout_success: "You have been signed out.",
      property_not_found: "Property not found.",
      link_copied: "Link copied successfully.",
      copy_failed: "Could not copy link.",
      message_required: "Please type a message first.",
      send: "Send",
      support_reply: "Thanks for your message. We received your request and will reply soon.",
      no_messages: "No messages yet.",
      up_to_guests: "Up to {n} guests",
      bedroom_one: "{n} Bedroom",
      bedroom_many: "{n} Bedrooms",
      loading: "Loading..."
    },
    ar: {
      sign_in: "تسجيل الدخول",
      sign_out: "تسجيل الخروج",
      favorites: "المفضلة",
      my_bookings: "حجوزاتي",
      guest_user: "زائر",
      search_placeholder: "ابحث عن مدينة أو عقار",
      view_details: "عرض التفاصيل",
      reserve_now: "احجز الآن",
      save: "حفظ",
      saved: "تم الحفظ",
      no_results: "لم يتم العثور على عقارات",
      auth_required: "يرجى تسجيل الدخول أولًا.",
      login_success: "تم تسجيل الدخول بنجاح.",
      register_success: "تم إنشاء الحساب بنجاح.",
      reset_sent: "تم إرسال رابط استعادة كلمة المرور.",
      invalid_email: "يرجى إدخال بريد إلكتروني صحيح.",
      fill_required: "يرجى تعبئة جميع الحقول المطلوبة.",
      logout_success: "تم تسجيل الخروج.",
      property_not_found: "العقار غير موجود.",
      link_copied: "تم نسخ الرابط بنجاح.",
      copy_failed: "تعذر نسخ الرابط.",
      message_required: "اكتب رسالة أولًا.",
      send: "إرسال",
      support_reply: "شكرًا لرسالتك. تم استلام طلبك وسنرد عليك قريبًا.",
      no_messages: "لا توجد رسائل بعد.",
      up_to_guests: "حتى {n} ضيوف",
      bedroom_one: "{n} غرفة نوم",
      bedroom_many: "{n} غرف نوم",
      loading: "جارٍ التحميل..."
    }
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function first(selList, root = document) {
    const arr = Array.isArray(selList) ? selList : [selList];
    for (const sel of arr) {
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getLocal(key, fallback = "") {
    try {
      const v = localStorage.getItem(key);
      return v == null ? fallback : v;
    } catch (_) {
      return fallback;
    }
  }

  function setLocal(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  function removeLocal(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  function getJSON(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function t(key, params = {}) {
    const dict = translations[state.lang] || translations.en;
    let value = dict[key] || translations.en[key] || key;
    return String(value).replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? ""));
  }

  function normalizeText(v) {
    return String(v ?? "").trim();
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(email));
  }

  function formatCurrency(value) {
    const locale = state.lang === "ar" ? "ar-DZ" : "en-US";
    return `${Number(value || 0).toLocaleString(locale)} DZD`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function currentPage() {
    return window.location.pathname.split("/").pop() || "index.html";
  }

  function isPropertyPage() {
    const page = currentPage().toLowerCase();
    return page.includes("property") || page.includes("details");
  }

  function isFavoritesPage() {
    return currentPage().toLowerCase().includes("favorite");
  }

  function getCurrentPropertyId() {
    const params = new URLSearchParams(window.location.search);
    return normalizeText(params.get("id")) || normalizeText(getLocal(STORAGE.selectedPropertyId, ""));
  }

  function applyTheme() {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    document.body.classList.toggle("dark", state.theme === "dark");
    setLocal(STORAGE.theme, state.theme);

    const icon = first(["#theme-toggle i", "[data-action='toggle-theme'] i"]);
    if (icon) {
      icon.className = state.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
    }
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme();
  }

  function applyLang() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    setLocal(STORAGE.lang, state.lang);

    qsa("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });

    qsa("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (key) el.setAttribute("placeholder", t(key));
    });

    const langText = first(["#lang-toggle span", "[data-action='toggle-lang'] span"]);
    if (langText) langText.textContent = state.lang.toUpperCase();

    const searchInput = first(["#destination-input", "#search-location"]);
    if (searchInput && !searchInput.hasAttribute("data-i18n-placeholder")) {
      searchInput.placeholder = t("search_placeholder");
    }

    updateProfileUI();
    renderListings();
    renderPropertyPage();
  }

  function toggleLang() {
    state.lang = state.lang === "ar" ? "en" : "ar";
    applyLang();
  }

  function initFirebase() {
    try {
      if (!window.firebase) return;
      if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
      state.auth = firebase.auth();
      state.db = firebase.firestore ? firebase.firestore() : null;
      state.googleProvider = new firebase.auth.GoogleAuthProvider();
      window.db = state.db;
    } catch (err) {
      console.error("Firebase init error:", err);
    }
  }

  function favoritesKey() {
    return state.user?.uid
      ? `ore_favorites_user_${state.user.uid}`
      : STORAGE.favoritesGuest;
  }

  function loadFavorites() {
    const list = getJSON(favoritesKey(), []);
    state.favorites = Array.isArray(list) ? list.map(String) : [];
    updateFavoriteButtons();
  }

  function saveFavorites() {
    setJSON(favoritesKey(), [...new Set(state.favorites.map(String))]);
    updateFavoriteButtons();
  }

  function isFavorite(id) {
    return state.favorites.includes(String(id));
  }

  function toggleFavorite(id) {
    const propId = String(id || "");
    if (!propId) return;

    if (isFavorite(propId)) {
      state.favorites = state.favorites.filter((x) => x !== propId);
      toast(state.lang === "ar" ? "تمت الإزالة من المفضلة" : "Removed from favorites", "success");
    } else {
      state.favorites.push(propId);
      toast(state.lang === "ar" ? "تمت الإضافة إلى المفضلة" : "Added to favorites", "success");
    }

    saveFavorites();
    renderListings();
    renderPropertyPage();
  }

  function updateFavoriteButtons() {
    qsa("[data-fav-toggle], #property-fav-btn").forEach((btn) => {
      const id = btn.getAttribute("data-fav-toggle") || getCurrentPropertyId();
      const active = isFavorite(id);
      btn.classList.toggle("active", active);

      const icon = btn.querySelector("i");
      if (icon) icon.className = active ? "ph-fill ph-heart" : "ph ph-heart";

      const span = btn.querySelector("span");
      if (span) span.textContent = active ? t("saved") : t("save");
    });
  }

  function normalizeProperty(data) {
    return {
      id: String(data.id || data.docId || ""),
      title: data.title || data.title_en || data.title_ar || "OreBooking Stay",
      title_en: data.title_en || data.title || "OreBooking Stay",
      title_ar: data.title_ar || data.title || "إقامة OreBooking",
      location: data.location || data.location_en || data.location_ar || "Algeria",
      location_en: data.location_en || data.location || "Algeria",
      location_ar: data.location_ar || data.location || "الجزائر",
      type: data.type || "hotel",
      price: Number(data.price || 0),
      rating: Number(data.rating || 4.8),
      maxGuests: Number(data.maxGuests || data.guests || 2),
      bedrooms: Number(data.bedrooms || 1),
      lat: data.lat ?? data.latitude ?? null,
      lng: data.lng ?? data.longitude ?? null,
      image: data.image || (Array.isArray(data.images) ? data.images[0] : ""),
      images: Array.isArray(data.images) && data.images.length ? data.images : (data.image ? [data.image] : []),
      description: data.description || data.desc_en || data.desc_ar || "",
      desc_en: data.desc_en || data.description || "",
      desc_ar: data.desc_ar || data.description || "",
      features: Array.isArray(data.features) ? data.features : []
    };
  }

  function getTitle(prop) {
    return state.lang === "ar"
      ? (prop.title_ar || prop.title || prop.title_en)
      : (prop.title_en || prop.title || prop.title_ar);
  }

  function getLocation(prop) {
    return state.lang === "ar"
      ? (prop.location_ar || prop.location || prop.location_en)
      : (prop.location_en || prop.location || prop.location_ar);
  }

  async function loadProperties() {
    if (state.properties.length) return state.properties;

    if (state.db) {
      try {
        const snap = await state.db.collection("properties").get();
        if (!snap.empty) {
          state.properties = snap.docs.map((doc) =>
            normalizeProperty({ id: doc.id, ...doc.data() })
          );
          return state.properties;
        }
      } catch (err) {
        console.warn("Firestore properties load failed:", err);
      }
    }

    state.properties = fallbackProperties.map(normalizeProperty);
    return state.properties;
  }

  function propertyCard(prop) {
    const title = getTitle(prop);
    const location = getLocation(prop);
    const fav = isFavorite(prop.id);

    return `
      <article class="listing-card" data-property-id="${escapeHtml(prop.id)}">
        <div class="listing-card-media" style="position:relative;overflow:hidden;border-radius:20px;">
          <img src="${escapeHtml(prop.image)}" alt="${escapeHtml(title)}" loading="lazy" style="width:100%;aspect-ratio:16/11;object-fit:cover;display:block;">
          <button type="button" class="fav-inline-btn ${fav ? "active" : ""}" data-fav-toggle="${escapeHtml(prop.id)}" style="position:absolute;top:14px;right:14px;width:42px;height:42px;border:none;border-radius:50%;background:rgba(255,255,255,.95);display:flex;align-items:center;justify-content:center;cursor:pointer;">
            <i class="${fav ? "ph-fill ph-heart" : "ph ph-heart"}"></i>
          </button>
        </div>
        <div class="listing-card-body" style="padding:16px 4px 0;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;">
            <div>
              <h3 style="margin:0 0 6px;font-size:1.05rem;">${escapeHtml(title)}</h3>
              <p style="margin:0;color:var(--text-muted);font-size:.92rem;">${escapeHtml(location)}</p>
            </div>
            <div style="font-weight:800;color:#f59e0b;">★ ${Number(prop.rating).toFixed(1)}</div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;flex-wrap:wrap;">
            <div>
              <strong style="font-size:1.15rem;">${escapeHtml(formatCurrency(prop.price))}</strong>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <a href="${ROUTES.property}?id=${encodeURIComponent(prop.id)}" data-view-property="${escapeHtml(prop.id)}" style="padding:10px 14px;border-radius:999px;border:1px solid var(--border-color);font-weight:800;">
                ${escapeHtml(t("view_details"))}
              </a>
              <button type="button" data-book-property="${escapeHtml(prop.id)}" style="padding:10px 14px;border:none;border-radius:999px;background:#435abf;color:#fff;font-weight:800;cursor:pointer;">
                ${escapeHtml(t("reserve_now"))}
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function bindRenderedPropertyEvents() {
    qsa("[data-fav-toggle]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(btn.getAttribute("data-fav-toggle"));
      });
    });

    qsa("[data-view-property]").forEach((link) => {
      link.addEventListener("click", () => {
        const id = link.getAttribute("data-view-property");
        const prop = state.properties.find((p) => String(p.id) === String(id));
        if (prop) saveSelectedProperty(prop);
      });
    });

    qsa("[data-book-property]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const id = btn.getAttribute("data-book-property");
        const prop = state.properties.find((p) => String(p.id) === String(id));
        if (prop) startBooking(prop);
      });
    });
  }

  function renderListings() {
    const grid = first(["#listings-grid", "#properties-grid", ".listings-grid", ".properties-grid"]);
    if (!grid) return;

    let items = [...state.properties];

    if (isFavoritesPage()) {
      items = items.filter((p) => isFavorite(p.id));
    }

    const searchInput = first(["#destination-input", "#search-location"]);
    const term = normalizeText(searchInput?.value || "").toLowerCase();

    if (term) {
      items = items.filter((p) => {
        const haystack = [
          p.id,
          p.title,
          p.title_en,
          p.title_ar,
          p.location,
          p.location_en,
          p.location_ar,
          p.type
        ].join(" ").toLowerCase();
        return haystack.includes(term);
      });
    }

    if (!items.length) {
      grid.innerHTML = `
        <div class="empty-state" style="padding:28px;text-align:center;border:1px dashed var(--border-color);border-radius:22px;">
          <h3 style="margin:0 0 8px;">${escapeHtml(t("no_results"))}</h3>
        </div>
      `;
      return;
    }

    grid.innerHTML = items.map(propertyCard).join("");
    bindRenderedPropertyEvents();
  }

  function saveSelectedProperty(prop) {
    state.selectedProperty = normalizeProperty(prop);
    state.currentPropertyId = state.selectedProperty.id;
    setLocal(STORAGE.selectedPropertyId, state.selectedProperty.id);
    setJSON(STORAGE.selectedPropertyData, state.selectedProperty);
  }

  function startBooking(prop) {
    const property = normalizeProperty(prop);
    saveSelectedProperty(property);

    if (!state.user) {
      setLocal(STORAGE.postAuthRedirect, `${ROUTES.booking}?id=${encodeURIComponent(property.id)}`);
      toast(t("auth_required"), "error");
      openAuthModal("login");
      return;
    }

    window.location.href = `${ROUTES.booking}?id=${encodeURIComponent(property.id)}`;
  }

  async function loadPropertyById(id) {
    const propId = String(id || "");
    if (!propId) return null;

    const local = state.properties.find((p) => String(p.id) === propId);
    if (local) return local;

    const cached = getJSON(STORAGE.selectedPropertyData, null);
    if (cached && String(cached.id) === propId) return normalizeProperty(cached);

    if (state.db) {
      try {
        const doc = await state.db.collection("properties").doc(propId).get();
        if (doc.exists) return normalizeProperty({ id: doc.id, ...doc.data() });
      } catch (err) {
        console.warn("Property fetch failed:", err);
      }
    }

    return fallbackProperties.map(normalizeProperty).find((p) => String(p.id) === propId) || null;
  }

  function renderPropertyGallery(images) {
    const track = qs("#slider-track");
    const thumbs = qs("#gallery-thumbs");
    const count = qs("#slider-count-badge");
    if (!track) return;

    const list = Array.isArray(images) && images.length ? images : [];
    track.innerHTML = list.map((src, i) => `
      <img src="${escapeHtml(src)}" alt="Property image ${i + 1}" style="min-width:100%;width:100%;height:100%;object-fit:cover;">
    `).join("");

    if (thumbs) {
      thumbs.innerHTML = list.map((src, i) => `
        <button type="button" class="gallery-thumb ${i === 0 ? "active" : ""}" data-thumb-index="${i}">
          <img src="${escapeHtml(src)}" alt="Thumb ${i + 1}">
        </button>
      `).join("");

      qsa("[data-thumb-index]", thumbs).forEach((btn) => {
        btn.addEventListener("click", () => {
          const index = Number(btn.getAttribute("data-thumb-index") || 0);
          goToSlide(index);
        });
      });
    }

    if (count) count.textContent = list.length ? `1 / ${list.length}` : "0 / 0";
    window.__oreGallery = { images: list, index: 0 };
  }

  function goToSlide(index) {
    const gallery = window.__oreGallery;
    if (!gallery || !gallery.images?.length) return;

    gallery.index = Math.max(0, Math.min(index, gallery.images.length - 1));
    const track = qs("#slider-track");
    const count = qs("#slider-count-badge");
    const dir = state.lang === "ar" ? 1 : -1;

    if (track) {
      track.style.transform = `translateX(${dir * gallery.index * 100}%)`;
    }

    qsa(".gallery-thumb").forEach((el, i) => {
      el.classList.toggle("active", i === gallery.index);
    });

    qsa(".slider-dot").forEach((el, i) => {
      el.classList.toggle("active", i === gallery.index);
    });

    if (count) count.textContent = `${gallery.index + 1} / ${gallery.images.length}`;

    const lightboxImg = qs("#lightbox-img");
    if (qs("#lightbox")?.classList.contains("active") && lightboxImg) {
      lightboxImg.src = gallery.images[gallery.index];
    }
  }

  function nextSlide() {
    const gallery = window.__oreGallery;
    if (!gallery || !gallery.images?.length) return;
    goToSlide((gallery.index + 1) % gallery.images.length);
  }

  function prevSlide() {
    const gallery = window.__oreGallery;
    if (!gallery || !gallery.images?.length) return;
    goToSlide((gallery.index - 1 + gallery.images.length) % gallery.images.length);
  }

  function openLightbox() {
    const box = qs("#lightbox");
    const img = qs("#lightbox-img");
    const gallery = window.__oreGallery;
    if (!box || !img || !gallery?.images?.length) return;
    img.src = gallery.images[gallery.index];
    box.classList.add("active");
    document.body.classList.add("modal-open");
  }

  function closeLightbox() {
    const box = qs("#lightbox");
    if (!box) return;
    box.classList.remove("active");
    document.body.classList.remove("modal-open");
  }

  async function renderPropertyPage() {
    if (!isPropertyPage()) return;

    const id = getCurrentPropertyId();
    if (!id) return;

    const prop = await loadPropertyById(id);
    if (!prop) {
      toast(t("property_not_found"), "error");
      return;
    }

    saveSelectedProperty(prop);

    const title = getTitle(prop);
    const location = getLocation(prop);
    const desc = state.lang === "ar" ? (prop.desc_ar || prop.description) : (prop.desc_en || prop.description);

    const setText = (selector, value) => {
      const el = qs(selector);
      if (el) el.textContent = value;
    };

    setText("#prop-title", title);
    setText("#prop-location", location);
    setText("#prop-desc", desc || "");
    setText("#prop-price", formatCurrency(prop.price));
    setText("#prop-prices", formatCurrency(prop.price));
    setText("#prop-rating", Number(prop.rating).toFixed(1));
    setText("#chip-guests", t("up_to_guests", { n: prop.maxGuests }));
    setText("#chip-bedrooms", prop.bedrooms === 1 ? t("bedroom_one", { n: prop.bedrooms }) : t("bedroom_many", { n: prop.bedrooms }));
    setText("#booking-stat-guests", t("up_to_guests", { n: prop.maxGuests }));

    const bookNow = qs("#book-now-link");
    if (bookNow) {
      bookNow.href = `${ROUTES.booking}?id=${encodeURIComponent(prop.id)}`;
      bookNow.addEventListener("click", (e) => {
        e.preventDefault();
        startBooking(prop);
      });
    }

    const shareBtn = qs("#share-btn");
    if (shareBtn && !shareBtn.dataset.bound) {
      shareBtn.dataset.bound = "1";
      shareBtn.addEventListener("click", async () => {
        try {
          if (navigator.share) {
            await navigator.share({ title, url: window.location.href });
          } else if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(window.location.href);
            toast(t("link_copied"), "success");
          } else {
            toast(t("copy_failed"), "error");
          }
        } catch (_) {
          toast(t("copy_failed"), "error");
        }
      });
    }

    const favBtn = qs("#property-fav-btn");
    if (favBtn && !favBtn.dataset.bound) {
      favBtn.dataset.bound = "1";
      favBtn.addEventListener("click", () => toggleFavorite(prop.id));
    }

    const hostBtn = first(["#contact-host-btn", "#host-chat-btn", "#booking-chat-btn"]);
    if (hostBtn && !hostBtn.dataset.bound) {
      hostBtn.dataset.bound = "1";
      hostBtn.addEventListener("click", () => openChatModal(prop.id));
    }

    renderPropertyGallery(prop.images || []);
    updateFavoriteButtons();

    const content = qs("#prop-real-content");
    const skeleton = qs("#prop-skeleton");
    if (skeleton) skeleton.style.display = "none";
    if (content) content.style.display = "block";
  }

  function getChatKey(propertyId) {
    return `${STORAGE.chatGuestPrefix}${propertyId || "general"}`;
  }

  function getChatMessages(propertyId) {
    const list = getJSON(getChatKey(propertyId), []);
    return Array.isArray(list) ? list : [];
  }

  function setChatMessages(propertyId, messages) {
    setJSON(getChatKey(propertyId), messages);
  }

  function renderChatMessages(propertyId) {
    const box = first(["#chat-messages", ".chat-body"]);
    if (!box) return;

    const messages = getChatMessages(propertyId);
    if (!messages.length) {
      box.innerHTML = `<div class="chat-empty-state"><p>${escapeHtml(t("no_messages"))}</p></div>`;
      return;
    }

    box.innerHTML = messages.map((msg) => `
      <div class="chat-message ${msg.sender}">
        ${escapeHtml(msg.text).replace(/\n/g, "<br>")}
        <span class="chat-meta">${escapeHtml(msg.sender === "admin" ? "Support" : "You")}</span>
      </div>
    `).join("");

    box.scrollTop = box.scrollHeight;
  }

  function openChatModal(propertyId = "") {
    const modal = first(["#chat-modal", ".chat-modal"]);
    if (!modal) return;

    state.currentChatPropertyId = propertyId || getCurrentPropertyId() || "general";

    const hiddenId = qs("#chat-property-id");
    if (hiddenId) hiddenId.value = state.currentChatPropertyId;

    modal.classList.add("active");
    document.body.classList.add("modal-open");
    renderChatMessages(state.currentChatPropertyId);
  }

  function closeChatModal() {
    const modal = first(["#chat-modal", ".chat-modal"]);
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
  }

  function sendChatMessage() {
    const textarea = first(["#chat-message-input", "#chat-textarea", ".chat-input-area textarea"]);
    if (!textarea) return;

    const text = normalizeText(textarea.value);
    if (!text) {
      toast(t("message_required"), "error");
      return;
    }

    const propertyId = state.currentChatPropertyId || getCurrentPropertyId() || "general";
    const list = getChatMessages(propertyId);

    list.push({
      id: `msg_${Date.now()}`,
      sender: "customer",
      text,
      createdAt: new Date().toISOString()
    });

    setChatMessages(propertyId, list);
    textarea.value = "";
    renderChatMessages(propertyId);

    setTimeout(() => {
      const updated = getChatMessages(propertyId);
      updated.push({
        id: `msg_${Date.now()}_reply`,
        sender: "admin",
        text: t("support_reply"),
        createdAt: new Date().toISOString()
      });
      setChatMessages(propertyId, updated);
      renderChatMessages(propertyId);
    }, 900);
  }

  function openAuthModal(defaultView = "login") {
    const modal = first(["#auth-modal", ".auth-modal"]);
    if (!modal) {
      window.location.href = `${ROUTES.auth}#${defaultView}`;
      return;
    }

    modal.classList.add("active");
    document.body.classList.add("modal-open");
    switchAuthView(defaultView);
  }

  function closeAuthModal() {
    const modal = first(["#auth-modal", ".auth-modal"]);
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
    setAuthMessage("");
  }

  function switchAuthView(view) {
    const target = ["login", "register", "forgot"].includes(view) ? view : "login";
    const forms = {
      login: first(["#login-form"]),
      register: first(["#register-form"]),
      forgot: first(["#forgot-form"])
    };

    Object.keys(forms).forEach((key) => {
      const form = forms[key];
      if (!form) return;
      const active = key === target;
      form.classList.toggle("active", active);
      form.style.display = active ? "" : "none";
    });
  }

  function setAuthMessage(msg, type = "error") {
    const box = qs("#auth-message");
    if (!box) return;
    box.textContent = msg || "";
    box.className = "auth-message";
    if (msg) box.classList.add(type);
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    if (!state.auth) return;

    const email = normalizeText(qs("#login-email")?.value);
    const password = normalizeText(qs("#login-password")?.value);

    if (!isValidEmail(email)) {
      setAuthMessage(t("invalid_email"));
      return;
    }

    if (!password) {
      setAuthMessage(t("fill_required"));
      return;
    }

    try {
      await state.auth.signInWithEmailAndPassword(email, password);
      setAuthMessage(t("login_success"), "success");
      toast(t("login_success"), "success");

      setTimeout(() => {
        const redirect = getLocal(STORAGE.postAuthRedirect, "");
        removeLocal(STORAGE.postAuthRedirect);
        if (redirect) {
          window.location.href = redirect;
        } else {
          closeAuthModal();
        }
      }, 200);
    } catch (err) {
      console.error(err);
      setAuthMessage(state.lang === "ar" ? "فشل تسجيل الدخول." : "Login failed.");
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    if (!state.auth) return;

    const name = normalizeText(qs("#reg-name")?.value);
    const email = normalizeText(qs("#reg-email")?.value);
    const password = normalizeText(qs("#reg-password")?.value);

    if (!name || !isValidEmail(email) || !password) {
      setAuthMessage(t("fill_required"));
      return;
    }

    try {
      const cred = await state.auth.createUserWithEmailAndPassword(email, password);
      if (cred.user && name) {
        await cred.user.updateProfile({ displayName: name });
      }
      setAuthMessage(t("register_success"), "success");
      toast(t("register_success"), "success");

      setTimeout(() => {
        const redirect = getLocal(STORAGE.postAuthRedirect, "");
        removeLocal(STORAGE.postAuthRedirect);
        if (redirect) {
          window.location.href = redirect;
        } else {
          closeAuthModal();
        }
      }, 200);
    } catch (err) {
      console.error(err);
      setAuthMessage(state.lang === "ar" ? "فشل إنشاء الحساب." : "Registration failed.");
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    if (!state.auth) return;

    const email = normalizeText(qs("#forgot-email")?.value);
    if (!isValidEmail(email)) {
      setAuthMessage(t("invalid_email"));
      return;
    }

    try {
      await state.auth.sendPasswordResetEmail(email);
      setAuthMessage(t("reset_sent"), "success");
      toast(t("reset_sent"), "success");
    } catch (err) {
      console.error(err);
      setAuthMessage(state.lang === "ar" ? "فشل إرسال الرابط." : "Could not send reset link.");
    }
  }

  async function signInWithGoogle() {
    if (!state.auth || !state.googleProvider) return;
    try {
      await state.auth.signInWithPopup(state.googleProvider);
      const redirect = getLocal(STORAGE.postAuthRedirect, "");
      removeLocal(STORAGE.postAuthRedirect);
      if (redirect) {
        window.location.href = redirect;
      } else {
        closeAuthModal();
      }
    } catch (err) {
      console.error(err);
      setAuthMessage(state.lang === "ar" ? "تعذر تسجيل الدخول عبر Google." : "Google sign-in failed.");
    }
  }

  async function signOut() {
    if (!state.auth) return;
    try {
      await state.auth.signOut();
      toast(t("logout_success"), "success");
    } catch (err) {
      console.error(err);
    }
  }

  function updateProfileUI() {
    const profileName = first(["#profile-name", "#dropdown-user-name"]);
    const profileEmail = first(["#profile-email", "#dropdown-user-email"]);
    const logoutBtn = first(["#logout-btn", "[data-logout]"]);
    const authBtnText = first(["#auth-btn-text", "#open-auth-btn span"]);

    if (profileName) {
      profileName.textContent = state.user?.displayName || state.user?.email || t("guest_user");
    }

    if (profileEmail) {
      profileEmail.textContent = state.user?.email || "";
    }

    if (logoutBtn) {
      logoutBtn.style.display = state.user ? "" : "none";
    }

    if (authBtnText) {
      authBtnText.textContent = state.user ? (state.user.displayName || t("guest_user")) : t("sign_in");
    }
  }

  function bindStaticEvents() {
    const themeBtn = first(["#theme-toggle", "[data-action='toggle-theme']"]);
    const langBtn = first(["#lang-toggle", "[data-action='toggle-lang']"]);
    const authOpenBtn = first(["#open-auth-btn", "#auth-cta", "[data-auth-open]"]);
    const authCloseBtn = first(["#close-auth-btn", "[data-close-auth]"]);
    const logoutBtn = first(["#logout-btn", "[data-logout]"]);
    const profileTrigger = first(["#open-auth-btn", "#profile-trigger", ".profile-menu"]);
    const profileDropdown = first(["#profile-dropdown", ".profile-dropdown"]);
    const searchBtn = first(["#search-btn", "#main-search-btn"]);
    const clearBtn = first(["#clear-search-btn", "[data-clear-search]"]);
    const chatOpenBtn = first(["#chat-open-btn", "#open-chat-btn", ".chat-fab-btn"]);
    const chatCloseBtn = first(["#chat-close-btn", "#close-chat-btn"]);
    const chatSendBtn = first(["#chat-send-btn", "#send-chat-btn"]);
    const lightbox = qs("#lightbox");
    const lightboxClose = first(["#close-lightbox-btn", ".close-lightbox"]);
    const lightboxPrev = first(["#lightbox-prev-btn"]);
    const lightboxNext = first(["#lightbox-next-btn"]);
    const sliderPrev = first(["#gallery-prev-btn"]);
    const sliderNext = first(["#gallery-next-btn"]);
    const sliderFullscreen = first(["#gallery-fullscreen-btn"]);

    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
    if (langBtn) langBtn.addEventListener("click", toggleLang);

    if (authOpenBtn) {
      authOpenBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!state.user) {
          openAuthModal("login");
          return;
        }
        if (profileDropdown) {
          profileDropdown.classList.toggle("active");
        }
      });
    }

    if (authCloseBtn) authCloseBtn.addEventListener("click", closeAuthModal);
    if (logoutBtn) logoutBtn.addEventListener("click", signOut);

    if (profileTrigger && profileDropdown) {
      document.addEventListener("click", (e) => {
        if (!profileDropdown.contains(e.target) && !profileTrigger.contains(e.target)) {
          profileDropdown.classList.remove("active");
        }
      });
    }

    if (searchBtn) {
      searchBtn.addEventListener("click", renderListings);
    }

    const searchInput = first(["#destination-input", "#search-location"]);
    if (searchInput) {
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") renderListings();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        renderListings();
      });
    }

    if (chatOpenBtn) {
      chatOpenBtn.addEventListener("click", () => openChatModal(getCurrentPropertyId()));
    }

    if (chatCloseBtn) {
      chatCloseBtn.addEventListener("click", closeChatModal);
    }

    if (chatSendBtn) {
      chatSendBtn.addEventListener("click", sendChatMessage);
    }

    const chatInput = first(["#chat-message-input", "#chat-textarea", ".chat-input-area textarea"]);
    if (chatInput) {
      chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendChatMessage();
        }
      });
    }

    if (sliderPrev) sliderPrev.addEventListener("click", prevSlide);
    if (sliderNext) sliderNext.addEventListener("click", nextSlide);
    if (sliderFullscreen) sliderFullscreen.addEventListener("click", openLightbox);
    if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
    if (lightboxPrev) lightboxPrev.addEventListener("click", prevSlide);
    if (lightboxNext) lightboxNext.addEventListener("click", nextSlide);

    if (lightbox) {
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAuthModal();
        closeChatModal();
        closeLightbox();
      }
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    });

    const loginForm = qs("#login-form");
    const registerForm = qs("#register-form");
    const forgotForm = qs("#forgot-form");

    if (loginForm) loginForm.addEventListener("submit", handleLoginSubmit);
    if (registerForm) registerForm.addEventListener("submit", handleRegisterSubmit);
    if (forgotForm) forgotForm.addEventListener("submit", handleForgotSubmit);

    qsa("[data-auth-provider='google'], #google-login-btn, #google-register-btn").forEach((btn) => {
      btn.addEventListener("click", signInWithGoogle);
    });

    const goRegister = qs("#go-to-register");
    const goLogin = qs("#go-to-login");
    const goForgot = qs("#go-to-forgot");

    if (goRegister) goRegister.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthView("register");
    });

    if (goLogin) goLogin.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthView("login");
    });

    if (goForgot) goForgot.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthView("forgot");
    });
  }

  function toast(message, type = "info") {
    let container = qs("#toast-container");

    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      container.style.cssText = `
        position:fixed;
        top:20px;
        right:20px;
        z-index:9999;
        display:flex;
        flex-direction:column;
        gap:10px;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText = `
      min-width:220px;
      max-width:360px;
      padding:12px 14px;
      border-radius:14px;
      color:#fff;
      font-weight:700;
      box-shadow:0 12px 30px rgba(0,0,0,.18);
      opacity:0;
      transform:translateY(-8px);
      transition:all .2s ease;
      background:${type === "error" ? "#ef4444" : type === "success" ? "#10b981" : "#435abf"};
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateY(0)";
    });

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-8px)";
      setTimeout(() => toast.remove(), 220);
    }, 2600);
  }

  function attachAuthObserver() {
    if (!state.auth) return;

    state.auth.onAuthStateChanged((user) => {
      state.user = user || null;
      updateProfileUI();
      loadFavorites();
    });
  }

  async function initApp() {
    initFirebase();
    bindStaticEvents();
    applyTheme();
    applyLang();
    attachAuthObserver();
    loadFavorites();
    await loadProperties();
    renderListings();
    await renderPropertyPage();
  }

  window.toggleTheme = toggleTheme;
  window.toggleLang = toggleLang;
  window.openAuthModal = openAuthModal;
  window.closeAuthModal = closeAuthModal;
  window.openChatModal = openChatModal;
  window.closeChatModal = closeChatModal;
  window.sendChatMessage = sendChatMessage;
  window.nextSlide = nextSlide;
  window.prevSlide = prevSlide;
  window.openLightbox = openLightbox;
  window.closeLightbox = closeLightbox;
  window.updateFavButtonState = updateFavoriteButtons;
  window.loadProperty = renderPropertyPage;
  window.startBooking = startBooking;
  window.initApp = initApp;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
  } else {
    initApp();
  }
})();
