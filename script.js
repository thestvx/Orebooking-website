"use strict";

/* =========================================
   OreBooking - script.js
   Unified + resilient + Firebase compatible
   Works with homepage, auth, search, favorites,
   bookings, chat, profile and theme/lang sync
========================================= */

(function () {
  if (window.__OREBOOKING_SCRIPT_INITIALIZED__) return;
  window.__OREBOOKING_SCRIPT_INITIALIZED__ = true;

  /* =========================================
     1) SAFE STORAGE
  ========================================= */
  function safeGet(key, fallback = "") {
    try {
      const value = localStorage.getItem(key);
      return value ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  function safeRemove(key) {
    try {
      localStorage.removeItem(key);
    } catch (_) {}
  }

  function safeJsonGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function safeJsonSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  /* =========================================
     2) CONFIG / ROUTES
  ========================================= */
  const STORAGE_KEYS = {
    lang: "ore_lang",
    theme: "ore_theme",
    favorites: "ore_favorites",
    remember: "ore_auth_remember",
    selectedPropertyId: "selectedPropertyId",
    selectedPropertyDocId: "selectedPropertyDocId",
    selectedPropertyData: "selectedPropertyData",
    oreSelectedProperty: "ore_selected_property",
    bookingPropertySnapshot: "booking_property_snapshot",
    bookingContext: "booking_context"
  };

  const ROUTES = {
    home: "index.html",
    auth: "auth.html",
    details: safeGet("ore_property_page", "details.html"),
    booking: safeGet("ore_booking_page", "booking.html")
  };

  const FIREBASE_CONFIG =
    window.OREBOOKING_FIREBASE_CONFIG ||
    window.firebaseConfig || {
      apiKey: "AIzaSyCA5iauXrIhozRw8MD7JTOLyeQ2v0GGncA",
      authDomain: "orebooking-website.firebaseapp.com",
      projectId: "orebooking-website",
      storageBucket: "orebooking-website.firebasestorage.app",
      messagingSenderId: "1012887567747",
      appId: "1:1012887567747:web:153b57b60cb143d88acab6",
      measurementId: "G-5GKMRMVHC3"
    };

  /* =========================================
     3) STATE
  ========================================= */
  const state = {
    initialized: false,
    lang: safeGet(STORAGE_KEYS.lang, "en") || "en",
    theme: safeGet(STORAGE_KEYS.theme, "light") || "light",
    favorites: Array.isArray(safeJsonGet(STORAGE_KEYS.favorites, []))
      ? safeJsonGet(STORAGE_KEYS.favorites, [])
      : [],
    user: null,
    currentView: "home",
    activeSearch: "",
    activeCategory: "all",
    sort: "featured",
    liveProperties: [],
    loadingProperties: false,
    propertiesLoaded: false,
    currentCollection: "",
    propertyCollectionCandidates: ["properties", "listings", "propertyListings", "stays", "hotels"],
    authReady: false,
    firestoreReady: false
  };

  /* =========================================
     4) FIREBASE
  ========================================= */
  let firebaseReady = false;
  let auth = null;
  let db = null;

  function isFirebaseConfigUsable(cfg) {
    if (!cfg || typeof cfg !== "object") return false;
    const required = ["apiKey", "authDomain", "projectId", "appId"];
    return required.every((key) => cfg[key] && !String(cfg[key]).includes("YOUR_"));
  }

  function initFirebase() {
    try {
      if (typeof window.firebase === "undefined") return false;
      if (!isFirebaseConfigUsable(FIREBASE_CONFIG)) return false;

      if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
      }

      auth = typeof firebase.auth === "function" ? firebase.auth() : null;
      db = typeof firebase.firestore === "function" ? firebase.firestore() : null;

      firebaseReady = !!window.firebase;
      state.authReady = !!auth;
      state.firestoreReady = !!db;

      if (auth && state.lang) {
        try {
          auth.languageCode = state.lang;
        } catch (_) {}
      }

      return state.authReady;
    } catch (error) {
      console.error("Firebase init error:", error);
      firebaseReady = false;
      state.authReady = false;
      state.firestoreReady = false;
      auth = null;
      db = null;
      return false;
    }
  }

  /* =========================================
     5) TRANSLATIONS
  ========================================= */
  const translations = {
    en: {
      page_title: "OreBooking - Premium Stays",
      hero_title: "Discover premium stays for every trip.",
      hero_text: "Browse hotels, apartments, and villas with smooth booking, secure access, and one elegant travel experience.",
      rewards_badge: "Loyalty Rewards",
      sign_in: "Sign In",
      sign_out: "Sign out",
      my_bookings: "My bookings",
      favorites: "Favorites",
      guest_user: "Guest User",
      logged_in_as: "Signed in",
      where_label: "Where",
      where_placeholder: "Search city or property",
      checkin_label: "Check in",
      checkout_label: "Check out",
      guests_label: "Guests",
      search_btn: "Search",
      clear_search: "Clear search",
      cat_all: "All stays",
      cat_hotels: "Hotels",
      cat_apartments: "Apartments",
      cat_villas: "Villas",
      featured_title: "Featured properties",
      sort_featured: "Featured",
      sort_rating: "Top rated",
      sort_price_low: "Price: low to high",
      sort_price_high: "Price: high to low",
      no_results_title: "No properties found",
      no_results_text: "Try another city, category, or clear the search.",
      view_details: "View details",
      reserve_now: "Reserve now",
      reserve_cta_signed_out: "Sign in to book",
      auth_required: "Please sign in first.",
      auth_redirect_book: "Sign in to continue your booking.",
      auth_redirect_profile: "Sign in to access your profile.",
      fav_added: "Added to favorites",
      fav_removed: "Removed from favorites",
      logout_success: "You have been signed out.",
      login_success: "Login successful.",
      register_success: "Account created successfully.",
      reset_sent: "Reset link sent! Check your inbox.",
      auth_unavailable: "Authentication is unavailable right now.",
      invalid_credentials: "Invalid email or password.",
      invalid_email: "Please enter a valid email address.",
      fill_required: "Please fill all required fields.",
      loading: "Loading properties...",
      no_props: "No properties available yet.",
      property_load_error: "Could not load live properties. Showing fallback data.",
      support_toast: "Message sent. Our team will reply soon.",
      chat_title: "Support chat",
      chat_subtitle: "We usually reply quickly",
      chat_placeholder: "Type your message",
      send_message: "Send message",
      mobile_profile: "Profile",
      mobile_favorites: "Favorites",
      mobile_stays: "Stays",
      night_suffix: "/night",
      booking_status_confirmed: "Confirmed",
      booking_status_pending: "Pending",
      booking_status_cancelled: "Cancelled",
      booking_status_rejected: "Rejected",
      booking_checkin: "Check-in:",
      booking_checkout: "Check-out:",
      booking_guests: "Guests:",
      booking_total: "Total:",
      search_hint: "Search by city, wilaya, or property name",
      email: "Email Address",
      password: "Password",
      full_name: "Full Name",
      remember_me: "Remember me",
      forgot_pass: "Forgot password?"
    },
    ar: {
      page_title: "OreBooking - إقامات مميزة",
      hero_title: "اكتشف إقامات مميزة لكل رحلة.",
      hero_text: "تصفح الفنادق والشقق والفلل مع تجربة حجز سلسة، ودخول آمن، وتجربة سفر أنيقة.",
      rewards_badge: "مكافآت الولاء",
      sign_in: "تسجيل الدخول",
      sign_out: "تسجيل الخروج",
      my_bookings: "حجوزاتي",
      favorites: "المفضلة",
      guest_user: "زائر",
      logged_in_as: "تم تسجيل الدخول",
      where_label: "إلى أين",
      where_placeholder: "ابحث عن مدينة أو عقار",
      checkin_label: "تسجيل الوصول",
      checkout_label: "تسجيل المغادرة",
      guests_label: "الضيوف",
      search_btn: "ابحث",
      clear_search: "مسح البحث",
      cat_all: "كل الإقامات",
      cat_hotels: "فنادق",
      cat_apartments: "شقق",
      cat_villas: "فلل",
      featured_title: "العقارات المميزة",
      sort_featured: "المميزة",
      sort_rating: "الأعلى تقييمًا",
      sort_price_low: "السعر: من الأقل إلى الأعلى",
      sort_price_high: "السعر: من الأعلى إلى الأقل",
      no_results_title: "لم يتم العثور على عقارات",
      no_results_text: "جرّب مدينة أخرى، أو فئة مختلفة، أو امسح البحث.",
      view_details: "عرض التفاصيل",
      reserve_now: "احجز الآن",
      reserve_cta_signed_out: "سجّل الدخول للحجز",
      auth_required: "يرجى تسجيل الدخول أولًا.",
      auth_redirect_book: "سجّل الدخول لإكمال الحجز.",
      auth_redirect_profile: "سجّل الدخول للوصول إلى حسابك.",
      fav_added: "تمت الإضافة إلى المفضلة",
      fav_removed: "تمت الإزالة من المفضلة",
      logout_success: "تم تسجيل الخروج.",
      login_success: "تم تسجيل الدخول بنجاح.",
      register_success: "تم إنشاء الحساب بنجاح.",
      reset_sent: "تم إرسال رابط الاستعادة. تحقق من بريدك الإلكتروني.",
      auth_unavailable: "المصادقة غير متاحة الآن.",
      invalid_credentials: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      invalid_email: "يرجى إدخال بريد إلكتروني صحيح.",
      fill_required: "يرجى تعبئة جميع الحقول المطلوبة.",
      loading: "جارٍ تحميل العقارات...",
      no_props: "لا توجد عقارات متاحة بعد.",
      property_load_error: "تعذر تحميل العقارات المباشرة، وتم عرض البيانات البديلة.",
      support_toast: "تم إرسال الرسالة، وسيرد فريقنا قريبًا.",
      chat_title: "دردشة الدعم",
      chat_subtitle: "نرد عادة بسرعة",
      chat_placeholder: "اكتب رسالتك",
      send_message: "إرسال الرسالة",
      mobile_profile: "الحساب",
      mobile_favorites: "المفضلة",
      mobile_stays: "الإقامات",
      night_suffix: "/ليلة",
      booking_status_confirmed: "مؤكد",
      booking_status_pending: "قيد الانتظار",
      booking_status_cancelled: "ملغي",
      booking_status_rejected: "مرفوض",
      booking_checkin: "تسجيل الوصول:",
      booking_checkout: "تسجيل المغادرة:",
      booking_guests: "الضيوف:",
      booking_total: "الإجمالي:",
      search_hint: "ابحث بالمدينة أو الولاية أو اسم العقار",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      full_name: "الاسم الكامل",
      remember_me: "تذكرني",
      forgot_pass: "نسيت كلمة المرور؟"
    }
  };

  function normalizeKey(key) {
    return String(key || "")
      .trim()
      .replace(/[\s-]+/g, "_")
      .toLowerCase();
  }

  function keyAliases(key) {
    const k = normalizeKey(key);
    const aliases = new Set([k]);

    const custom = {
      herotitle: "hero_title",
      herosubtitle: "hero_text",
      hero_title: "hero_title",
      hero_text: "hero_text",
      signin: "sign_in",
      signout: "sign_out",
      mybookings: "my_bookings",
      clearsearch: "clear_search",
      searchhint: "search_hint",
      whereplaceholder: "where_placeholder",
      chatplaceholder: "chat_placeholder",
      where_label: "where_label",
      guests_label: "guests_label"
    };

    if (custom[k]) aliases.add(custom[k]);

    return Array.from(aliases);
  }

  function t(key) {
    const langDict = translations[state.lang] || translations.en;
    const baseDict = translations.en;

    const keys = keyAliases(key);
    for (const candidate of keys) {
      if (candidate in langDict) return langDict[candidate];
      if (candidate in baseDict) return baseDict[candidate];
    }

    return key;
  }

  /* =========================================
     6) STATIC DATA
  ========================================= */
  const fallbackProperties = [
    {
      id: "skyline-hotel",
      title_en: "Skyline Hotel",
      title_ar: "فندق سكاي لاين",
      location_en: "Algiers, Algeria",
      location_ar: "الجزائر العاصمة، الجزائر",
      price: 18000,
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"],
      urgency: "Only 2 rooms left",
      type: "hotel",
      typeEn: "Hotel",
      typeAr: "فندق",
      desc_en: "Elegant city stay with fast check-in and premium comfort.",
      desc_ar: "إقامة أنيقة داخل المدينة مع تسجيل دخول سريع وراحة مميزة."
    },
    {
      id: "sea-breeze-apartment",
      title_en: "Sea Breeze Apartment",
      title_ar: "شقة نسيم البحر",
      location_en: "Oran, Algeria",
      location_ar: "وهران، الجزائر",
      price: 12000,
      rating: 4.7,
      image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"],
      urgency: "Popular this week",
      type: "apartment",
      typeEn: "Apartment",
      typeAr: "شقة",
      desc_en: "A bright apartment close to the coast and city center.",
      desc_ar: "شقة مشرقة قريبة من الساحل ووسط المدينة."
    },
    {
      id: "palm-villa",
      title_en: "Palm Villa Retreat",
      title_ar: "فيلا بالم ريتريت",
      location_en: "Annaba, Algeria",
      location_ar: "عنابة، الجزائر",
      price: 32000,
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"],
      urgency: "Weekend favorite",
      type: "villa",
      typeEn: "Villa",
      typeAr: "فيلا",
      desc_en: "Private villa with space, privacy, and premium amenities.",
      desc_ar: "فيلا خاصة بمساحة واسعة وخصوصية ومرافق مميزة."
    },
    {
      id: "city-loft",
      title_en: "City Loft Suites",
      title_ar: "أجنحة سيتي لوفت",
      location_en: "Sétif, Algeria",
      location_ar: "سطيف، الجزائر",
      price: 9500,
      rating: 4.6,
      image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"],
      urgency: "Great value",
      type: "apartment",
      typeEn: "Apartment",
      typeAr: "شقة",
      desc_en: "A clean modern stay ideal for short city trips.",
      desc_ar: "إقامة عصرية ونظيفة مناسبة للرحلات القصيرة داخل المدينة."
    },
    {
      id: "desert-grand",
      title_en: "Desert Grand Hotel",
      title_ar: "فندق ديزرت جراند",
      location_en: "Ghardaïa, Algeria",
      location_ar: "غرداية، الجزائر",
      price: 21000,
      rating: 4.5,
      image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80"],
      urgency: "Breakfast included",
      type: "hotel",
      typeEn: "Hotel",
      typeAr: "فندق",
      desc_en: "Classic hotel with comfortable rooms and breakfast included.",
      desc_ar: "فندق مريح بغرف أنيقة مع إفطار مشمول."
    },
    {
      id: "azure-villa",
      title_en: "Azure Coast Villa",
      title_ar: "فيلا الساحل الأزرق",
      location_en: "Bejaia, Algeria",
      location_ar: "بجاية، الجزائر",
      price: 39000,
      rating: 5.0,
      image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80",
      images: ["https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80"],
      urgency: "Luxury pick",
      type: "villa",
      typeEn: "Villa",
      typeAr: "فيلا",
      desc_en: "Luxury beachfront villa for premium family getaways.",
      desc_ar: "فيلا فاخرة على الساحل لعطلات عائلية مميزة."
    }
  ];

  const categories = [
    { key: "all", label_en: "All stays", label_ar: "كل الإقامات" },
    { key: "hotel", label_en: "Hotels", label_ar: "فنادق" },
    { key: "apartment", label_en: "Apartments", label_ar: "شقق" },
    { key: "villa", label_en: "Villas", label_ar: "فلل" }
  ];

  const algerianWilayas = [
    { id: 16, ar: "الجزائر", en: "Algiers" },
    { id: 31, ar: "وهران", en: "Oran" },
    { id: 19, ar: "سطيف", en: "Setif" },
    { id: 23, ar: "عنابة", en: "Annaba" },
    { id: 47, ar: "غرداية", en: "Ghardaia" },
    { id: 6, ar: "بجاية", en: "Bejaia" },
    { id: 39, ar: "الوادي", en: "El Oued" },
    { id: 25, ar: "قسنطينة", en: "Constantine" }
  ];

  /* =========================================
     7) DOM HELPERS
  ========================================= */
  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function firstExisting(selectors, root = document) {
    for (const selector of selectors) {
      const el = root.querySelector(selector);
      if (el) return el;
    }
    return null;
  }

  function currentPage() {
    const path = window.location.pathname.split("/").pop();
    return path || ROUTES.home;
  }

  function currentPageWithSearch() {
    return currentPage() + (window.location.search || "");
  }

  function getAuthUrl(view = "login") {
    const redirect = encodeURIComponent(currentPageWithSearch());
    const hash = view ? `#${encodeURIComponent(view)}` : "";
    return `${ROUTES.auth}?redirect=${redirect}${hash}`;
  }

  function getDom() {
    return {
      html: document.documentElement,
      body: document.body,

      themeBtn: firstExisting(["#theme-toggle", "[data-action='toggle-theme']"]),
      langBtn: firstExisting(["#lang-toggle", "[data-action='toggle-lang']"]),

      authCta: firstExisting(["#auth-cta", "#open-auth-btn", "[data-auth-open]"]),
      profileTrigger: firstExisting(["#profile-trigger", ".profile-menu", "[data-profile-trigger]"]),
      profileDropdown: firstExisting(["#profile-dropdown", ".profile-dropdown"]),
      logoutBtn: firstExisting(["#logout-btn", "[data-logout]"]),
      myFavoritesBtn: firstExisting(["#my-favorites-btn", "#profile-favorites-btn", "[data-open-favorites]"]),
      myBookingsBtn: firstExisting(["#my-bookings-btn", "#open-bookings-btn", "[data-open-bookings]"]),
      homeLogoBtn: firstExisting(["#home-logo-btn", ".logo", "a.logo"]),
      profileName: firstExisting(["#profile-name", "#dropdown-user-name", "[data-profile-name]"]),
      profileEmail: firstExisting(["#profile-email", "#dropdown-user-email", "[data-profile-email]"]),

      authModal: firstExisting(["#auth-modal", ".auth-modal"]),
      closeAuthBtn: firstExisting(["#close-auth-btn", ".close-modal-btn"]),
      authMessage: firstExisting(["#auth-message", ".auth-message"]),
      loginForm: firstExisting(["#login-form", "form[data-auth-form='login']"]),
      registerForm: firstExisting(["#register-form", "form[data-auth-form='register']"]),
      forgotForm: firstExisting(["#forgot-form", "form[data-auth-form='forgot']"]),
      googleLoginBtn: firstExisting(["#google-login-btn", "[data-auth-provider='google']"]),

      listingsGrid: firstExisting(["#listings-grid", ".listings-grid"]),
      sortSelect: firstExisting(["#sort-select", "[data-sort-select]"]),
      clearSearchBtn: firstExisting(["#clear-search-btn", "[data-clear-search]"]),

      destinationInput: firstExisting(["#destination-input", "#search-location", "input[data-search='destination']"]),
      searchInput: firstExisting(["#destination-input", "#search-location", "input[data-search='destination']"]),
      searchBtn: firstExisting(["#search-btn", "#main-search-btn", "[data-main-search]"]),
      searchDropdown: firstExisting(["#search-dropdown", "[data-search-dropdown]"]),
      searchWrapper: firstExisting(["#search-location-wrapper", ".search-field", "[data-search-wrapper]"]),

      categoryButtons: $all(".category-item[data-category], [data-category-btn]"),

      sectionTitle: firstExisting(["#section-main-title", "[data-section-title]", ".section-header-wrapper h2"]),

      bookingsModal: firstExisting(["#bookings-modal", ".bookings-modal"]),
      closeBookingsBtn: firstExisting(["#close-bookings-btn", "[data-close-bookings]"]),
      bookingsList: firstExisting(["#bookings-list", "[data-bookings-list]"]),

      chatModal: firstExisting(["#chat-modal", ".chat-modal"]),
      chatOpenBtn: firstExisting(["#chat-open-btn", "[data-chat-open]"]),
      chatCloseBtn: firstExisting(["#chat-close-btn", "[data-chat-close]"]),
      chatSendBtn: firstExisting(["#chat-send-btn", "[data-chat-send]"]),
      chatTextarea: firstExisting(["#chat-textarea", "[data-chat-textarea]"]),

      scrollTopBtn: firstExisting(["#scroll-top-btn", "[data-scroll-top]"]),
      favToast: firstExisting(["#fav-toast"]),
      toastContainer: firstExisting(["#toast-container"]),

      mobileFavBtn: firstExisting(["#mob-fav-btn"]),
      mobileProfileBtn: firstExisting(["#mob-profile-btn"]),
      mobileStaysBtn: firstExisting(["#mob-stays-btn"]),

      heroSection: firstExisting(["#hero-section", ".hero"]),
      categoriesContainer: firstExisting(["#categories-container", ".categories"])
    };
  }

  /* =========================================
     8) HELPERS
  ========================================= */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function normalizeText(value) {
    return String(value ?? "").trim();
  }

  function slugify(value) {
    return normalizeText(value)
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w\u0600-\u06FF-]/g, "");
  }

  function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeText(email));
  }

  function isStrongPassword(password) {
    const value = String(password || "");
    return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
  }

  function formatCurrency(value) {
    const locale = state.lang === "ar" ? "ar-DZ" : "en-US";
    return `${Number(value || 0).toLocaleString(locale)} DZD`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(state.lang === "ar" ? "ar-DZ" : "en-GB");
  }

  function formatDateTime(value) {
    if (!value) return "—";
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString(state.lang === "ar" ? "ar-DZ" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function showToast(message, type = "success") {
    const dom = getDom();
    let host = dom.toastContainer || document.getElementById("global-toast-host");

    if (!host) {
      host = document.createElement("div");
      host.id = "global-toast-host";
      host.style.cssText =
        "position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,360px)";
      document.body.appendChild(host);
    }

    const toast = document.createElement("div");
    toast.className =
      host === dom.toastContainer
        ? `toast ${type}`
        : `toast toast-${type}`;
    toast.textContent = message;

    if (host.id === "global-toast-host") {
      toast.style.cssText = `
        background:${type === "error" ? "#fef2f2" : type === "info" ? "#eff6ff" : "#ecfdf5"};
        border:1px solid ${type === "error" ? "rgba(239,68,68,.28)" : type === "info" ? "rgba(59,130,246,.28)" : "rgba(16,185,129,.28)"};
        color:${type === "error" ? "#b91c1c" : type === "info" ? "#1d4ed8" : "#047857"};
        padding:14px 16px;
        border-radius:16px;
        box-shadow:0 14px 30px rgba(15,23,42,.12);
        font-weight:700;
        line-height:1.6;
        font-family:inherit;
      `;
    }

    host.appendChild(toast);

    setTimeout(() => {
      toast.style.transition = "all .25s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(-6px)";
      setTimeout(() => toast.remove(), 250);
    }, 2600);
  }

  function showFavToast(message) {
    const dom = getDom();
    if (!dom.favToast) {
      showToast(message, "success");
      return;
    }
    dom.favToast.textContent = message;
    dom.favToast.classList.add("show");
    clearTimeout(showFavToast._timer);
    showFavToast._timer = setTimeout(() => {
      dom.favToast.classList.remove("show");
    }, 1800);
  }

  function humanFirebaseError(code) {
    const map = {
      "auth/invalid-email": t("invalid_email"),
      "auth/missing-email": t("invalid_email"),
      "auth/user-not-found": t("invalid_credentials"),
      "auth/wrong-password": t("invalid_credentials"),
      "auth/invalid-credential": t("invalid_credentials"),
      "auth/email-already-in-use": state.lang === "ar" ? "هذا البريد مستخدم بالفعل." : "This email is already in use.",
      "auth/weak-password": state.lang === "ar" ? "كلمة المرور ضعيفة جدًا." : "Password is too weak.",
      "auth/too-many-requests": state.lang === "ar" ? "عدد المحاولات كبير جدًا. حاول لاحقًا." : "Too many attempts. Please try again later.",
      "auth/popup-closed-by-user": state.lang === "ar" ? "تم إغلاق نافذة تسجيل الدخول." : "Popup was closed before completing sign-in.",
      "auth/network-request-failed": state.lang === "ar" ? "خطأ في الشبكة. تحقق من الاتصال." : "Network error. Check your connection."
    };
    return map[code] || (state.lang === "ar" ? "حدث خطأ غير متوقع." : "Something went wrong.");
  }

  /* =========================================
     9) PROPERTY NORMALIZATION
  ========================================= */
  function isPropertyVisible(p = {}) {
    const status = String(p.status || p.propertyStatus || "").toLowerCase();
    if (p.visible === false) return false;
    if (p.hidden === true) return false;
    if (p.archived === true) return false;
    if (p.isArchived === true) return false;
    if (p.active === false) return false;
    if (p.isActive === false) return false;
    if (p.published === false) return false;
    if (p.isPublished === false) return false;
    if (["draft", "archived", "inactive", "rejected", "deleted"].includes(status)) return false;
    return true;
  }

  function normalizeProperty(p = {}, docId = "", collectionName = "") {
    const titleEn = p.title_en || p.titleEn || p.nameEn || p.title || "";
    const titleAr = p.title_ar || p.titleAr || p.nameAr || p.title || "";
    const locationEn = p.location_en || p.locationEn || p.cityEn || p.location || p.address || "";
    const locationAr = p.location_ar || p.locationAr || p.cityAr || p.location || p.address || "";
    const baseImage = p.image || p.imageUrl || p.mainImage || p.coverImage || "images/placeholder.jpg";
    const images = Array.isArray(p.images) && p.images.length ? p.images.filter(Boolean) : [baseImage];
    const customId = normalizeText(p.id);
    const realDocId = normalizeText(docId || p.docId || "");
    const navId = realDocId || customId || slugify(titleEn || titleAr || Date.now());

    return {
      id: navId,
      navId,
      docId: realDocId,
      customId,
      collection: collectionName || p.collection || "",
      title_en: titleEn,
      title_ar: titleAr,
      location_en: locationEn,
      location_ar: locationAr,
      price: Number(p.price || p.basePrice || p.pricePerNight || p.nightlyRate || 0),
      rating: Number(p.rating || p.avgRating || p.reviewScore || 4.8),
      image: baseImage,
      images,
      urgency: p.urgency || "",
      desc_en: p.desc_en || p.descEn || p.descriptionEn || p.description || "",
      desc_ar: p.desc_ar || p.descAr || p.descriptionAr || p.description || "",
      features_en: Array.isArray(p.features_en)
        ? p.features_en
        : Array.isArray(p.featuresEn)
        ? p.featuresEn
        : Array.isArray(p.amenitiesEn)
        ? p.amenitiesEn
        : [],
      features_ar: Array.isArray(p.features_ar)
        ? p.features_ar
        : Array.isArray(p.featuresAr)
        ? p.featuresAr
        : Array.isArray(p.amenitiesAr)
        ? p.amenitiesAr
        : [],
      type: String(p.type || p.category || "").toLowerCase(),
      typeEn: p.typeEn || p.categoryEn || p.type || "",
      typeAr: p.typeAr || p.categoryAr || p.type || "",
      createdAt: p.createdAt || null,
      updatedAt: p.updatedAt || null
    };
  }

  function getSourceProperties() {
    const source = state.liveProperties.length ? state.liveProperties : fallbackProperties.map((p) => normalizeProperty(p, p.id, "fallback"));
    return source;
  }

  function getPropertyById(id) {
    const target = String(id || "");
    return getSourceProperties().find((p) => String(p.id) === target || String(p.docId) === target || String(p.navId) === target) || null;
  }

  function getPropertyTitle(property) {
    if (!property) return "";
    return state.lang === "ar"
      ? property.title_ar || property.title_en || ""
      : property.title_en || property.title_ar || "";
  }

  function getPropertyLocation(property) {
    if (!property) return "";
    return state.lang === "ar"
      ? property.location_ar || property.location_en || ""
      : property.location_en || property.location_ar || "";
  }

  function getPropertyType(property) {
    if (!property) return "";
    const value =
      state.lang === "ar"
        ? property.typeAr || property.type || ""
        : property.typeEn || property.type || "";
    return String(value || "").toLowerCase();
  }

  function propertyMatchesCategory(property, category) {
    if (!category || category === "all") return true;
    const raw = String(category).toLowerCase();
    const haystack = [
      property.type,
      property.typeEn,
      property.typeAr,
      property.title_en,
      property.title_ar,
      property.desc_en,
      property.desc_ar
    ]
      .join(" ")
      .toLowerCase();

    if (raw === "hotel") return /hotel|فندق/.test(haystack);
    if (raw === "apartment") return /apartment|suite|loft|شقة|أجنحة/.test(haystack);
    if (raw === "villa") return /villa|فيلا/.test(haystack);
    return haystack.includes(raw);
  }

  function getNavigationPropertyId(property) {
    return normalizeText(property?.docId || property?.navId || property?.id || property?.customId || "");
  }

  function rememberSelectedProperty(property) {
    if (!property) return;
    const navId = getNavigationPropertyId(property);
    const snapshot = { ...property, navId, rememberedAt: new Date().toISOString() };

    safeSet(STORAGE_KEYS.selectedPropertyId, navId);
    safeSet(STORAGE_KEYS.selectedPropertyDocId, normalizeText(property.docId || navId));
    safeJsonSet(STORAGE_KEYS.selectedPropertyData, snapshot);
    safeJsonSet(STORAGE_KEYS.oreSelectedProperty, snapshot);
    safeJsonSet(STORAGE_KEYS.bookingPropertySnapshot, snapshot);
  }

  async function loadLiveProperties() {
    if (!db) return false;
    if (state.loadingProperties || state.propertiesLoaded) return state.liveProperties.length > 0;

    state.loadingProperties = true;

    try {
      for (const collectionName of state.propertyCollectionCandidates) {
        try {
          const snap = await db.collection(collectionName).limit(60).get();
          if (snap.empty) continue;

          const items = [];
          snap.forEach((doc) => {
            const data = doc.data() || {};
            if (isPropertyVisible(data)) {
              items.push(normalizeProperty(data, doc.id, collectionName));
            }
          });

          if (items.length) {
            state.liveProperties = items;
            state.currentCollection = collectionName;
            state.propertiesLoaded = true;
            state.loadingProperties = false;
            return true;
          }
        } catch (err) {
          console.warn(`Collection ${collectionName} read failed`, err);
        }
      }

      state.propertiesLoaded = true;
      state.loadingProperties = false;
      return false;
    } catch (error) {
      console.error("Property load error:", error);
      state.propertiesLoaded = true;
      state.loadingProperties = false;
      return false;
    }
  }

  /* =========================================
     10) THEME / LANGUAGE
  ========================================= */
  function updateLogo() {
    const mainLogo = firstExisting(["#main-logo", ".logo-img"]);
    const modalLogo = firstExisting(["#modal-logo"]);
    const logoPath = state.theme === "dark" ? "logos/orebooking2.png" : "logos/orebooking.png";

    if (mainLogo) mainLogo.src = logoPath;
    if (modalLogo) modalLogo.src = logoPath;
  }

  function updateTextNodes() {
    const dom = getDom();
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key));
    });

    document.title = t("page_title");

    if (dom.langBtn) {
      dom.langBtn.innerHTML = dom.langBtn.querySelector("i")
        ? `<i class="ph ph-translate"></i><span>${state.lang === "en" ? "AR" : "EN"}</span>`
        : state.lang === "en"
        ? "AR"
        : "EN";
    }

    if (dom.themeBtn) {
      dom.themeBtn.innerHTML = state.theme === "dark"
        ? `<i class="ph ph-sun"></i>`
        : `<i class="ph ph-moon"></i>`;
    }

    if (dom.destinationInput && !dom.destinationInput.value) {
      dom.destinationInput.setAttribute("placeholder", t("where_placeholder"));
    }

    if (dom.sectionTitle) {
      if (state.currentView === "favorites") dom.sectionTitle.textContent = t("favorites");
      else if (state.currentView === "search") dom.sectionTitle.textContent = t("featured_title");
      else dom.sectionTitle.textContent = t("featured_title");
    }
  }

  function applyTheme() {
    const dom = getDom();
    dom.body.classList.toggle("dark", state.theme === "dark");
    safeSet(STORAGE_KEYS.theme, state.theme);
    updateLogo();

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute("content", state.theme === "dark" ? "#020617" : "#435abf");
    }

    updateTextNodes();
  }

  function applyLanguage() {
    const dom = getDom();
    dom.html.lang = state.lang;
    dom.html.dir = state.lang === "ar" ? "rtl" : "ltr";
    safeSet(STORAGE_KEYS.lang, state.lang);

    if (auth) {
      try {
        auth.languageCode = state.lang;
      } catch (_) {}
    }

    updateTextNodes();
    updateUserUI();
  }

  function applyInitialState() {
    applyTheme();
    applyLanguage();
  }

  function toggleTheme() {
    state.theme = state.theme === "light" ? "dark" : "light";
    applyTheme();
  }

  function toggleLanguage() {
    state.lang = state.lang === "en" ? "ar" : "en";
    applyLanguage();
    syncCategoryButtons();
    renderListings();
    updateSmartSearchPlaceholder();
    renderBookingsPreview();
  }

  /* =========================================
     11) AUTH
  ========================================= */
  function showAuthMessage(message = "", type = "error") {
    const dom = getDom();
    if (!dom.authMessage) return;

    if (!message) {
      dom.authMessage.textContent = "";
      dom.authMessage.className = "auth-message";
      dom.authMessage.style.display = "none";
      return;
    }

    dom.authMessage.textContent = message;
    dom.authMessage.className = `auth-message ${type}`;
    dom.authMessage.style.display = "block";
  }

  function openAuthModal(view = "login") {
    const dom = getDom();
    if (!dom.authModal) {
      window.location.href = getAuthUrl(view);
      return;
    }

    dom.authModal.classList.add("active");
    dom.body.classList.add("modal-open");
    switchAuthForm(view);
    showAuthMessage("", "");
  }

  function closeAuthModal() {
    const dom = getDom();
    if (!dom.authModal) return;
    dom.authModal.classList.remove("active");
    dom.body.classList.remove("modal-open");
    showAuthMessage("", "");
  }

  function switchAuthForm(formType = "login") {
    const dom = getDom();
    const forms = {
      login: dom.loginForm,
      register: dom.registerForm,
      forgot: dom.forgotForm
    };

    Object.entries(forms).forEach(([key, form]) => {
      if (!form) return;
      form.style.display = key === formType ? "flex" : "none";
      form.classList.toggle("active", key === formType);
    });
  }

  function updateUserUI() {
    const dom = getDom();

    if (dom.profileName) {
      dom.profileName.textContent = state.user?.displayName || t("guest_user");
    }

    if (dom.profileEmail) {
      dom.profileEmail.textContent = state.user?.email || "";
    }

    if (dom.authCta && dom.profileTrigger && dom.authCta !== dom.profileTrigger) {
      dom.authCta.classList.toggle("hidden", !!state.user);
      dom.profileTrigger.classList.toggle("hidden", !state.user);
    } else if (dom.authCta && !dom.profileTrigger) {
      const icon = dom.authCta.querySelector("i");
      const span = dom.authCta.querySelector("span");

      if (state.user) {
        if (icon) icon.className = "ph-fill ph-user-circle";
        if (span) span.textContent = state.user.displayName || t("logged_in_as");
      } else {
        if (icon) icon.className = "ph ph-sign-in";
        if (span) span.textContent = t("sign_in");
      }
    }

    if (!state.user && dom.profileDropdown) {
      dom.profileDropdown.classList.remove("active");
    }
  }

  function requireAuth(message = t("auth_required"), view = "login") {
    showToast(message, "error");
    const dom = getDom();
    if (dom.authModal) openAuthModal(view);
    else window.location.href = getAuthUrl(view);
  }

  async function handleLogin(event) {
    event.preventDefault();

    if (!auth) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    const email = $("#login-email")?.value.trim() || $("#auth-login-email")?.value.trim() || "";
    const password = $("#login-password")?.value || $("#auth-login-password")?.value || "";
    const remember = ($("#login-remember")?.checked ?? $("#remember-me")?.checked ?? safeGet(STORAGE_KEYS.remember, "1") !== "0");

    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    if (!password) {
      showAuthMessage(t("invalid_credentials"), "error");
      return;
    }

    try {
      const persistence = remember
        ? firebase.auth.Auth.Persistence.LOCAL
        : firebase.auth.Auth.Persistence.SESSION;

      await auth.setPersistence(persistence);
      safeSet(STORAGE_KEYS.remember, remember ? "1" : "0");
      await auth.signInWithEmailAndPassword(email, password);

      showToast(t("login_success"), "success");
      showAuthMessage("", "");
      getDom().loginForm?.reset();
      closeAuthModal();
    } catch (error) {
      console.error("Login error:", error);
      showAuthMessage(humanFirebaseError(error.code), "error");
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    if (!auth || !db) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    const name =
      $("#reg-name")?.value.trim() ||
      $("#register-name")?.value.trim() ||
      $("#auth-register-name")?.value.trim() ||
      "";

    const email =
      $("#reg-email")?.value.trim() ||
      $("#register-email")?.value.trim() ||
      $("#auth-register-email")?.value.trim() ||
      "";

    const password =
      $("#reg-password")?.value ||
      $("#register-password")?.value ||
      $("#auth-register-password")?.value ||
      "";

    const confirmPassword =
      $("#reg-confirm-password")?.value ||
      $("#register-confirm-password")?.value ||
      $("#auth-register-confirm-password")?.value ||
      password;

    if (!name || !email || !password) {
      showAuthMessage(t("fill_required"), "error");
      return;
    }

    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    if (!isStrongPassword(password)) {
      showAuthMessage(
        state.lang === "ar"
          ? "يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حروف وأرقام."
          : "Password must be at least 8 characters and contain letters and numbers.",
        "error"
      );
      return;
    }

    if (password !== confirmPassword) {
      showAuthMessage(state.lang === "ar" ? "كلمتا المرور غير متطابقتين." : "Passwords do not match.", "error");
      return;
    }

    try {
      const cred = await auth.createUserWithEmailAndPassword(email, password);

      if (cred?.user?.updateProfile) {
        await cred.user.updateProfile({ displayName: name });
      }

      await db.collection("users").doc(cred.user.uid).set(
        {
          name,
          email,
          points: 0,
          role: "guest",
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );

      showToast(t("register_success"), "success");
      showAuthMessage("", "");
      getDom().registerForm?.reset();
      closeAuthModal();
    } catch (error) {
      console.error("Register error:", error);
      showAuthMessage(humanFirebaseError(error.code), "error");
    }
  }

  async function handleGoogleLogin() {
    if (!auth || !db || typeof firebase === "undefined") {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(provider);

      if (result?.user) {
        const userRef = db.collection("users").doc(result.user.uid);
        const snap = await userRef.get();

        if (!snap.exists) {
          await userRef.set(
            {
              name: result.user.displayName || "",
              email: result.user.email || "",
              points: 0,
              role: "guest",
              createdAt: firebase.firestore.FieldValue.serverTimestamp(),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
          );
        }
      }

      showToast(t("login_success"), "success");
      closeAuthModal();
    } catch (error) {
      console.error("Google login error:", error);
      showAuthMessage(humanFirebaseError(error.code), "error");
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();

    if (!auth) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    const email = $("#forgot-email")?.value.trim() || $("#auth-forgot-email")?.value.trim() || "";

    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      showAuthMessage(t("reset_sent"), "success");
      getDom().forgotForm?.reset();
    } catch (error) {
      console.error("Reset error:", error);
      showAuthMessage(humanFirebaseError(error.code), "error");
    }
  }

  async function handleLogout() {
    try {
      if (auth) {
        await auth.signOut();
      }
      state.user = null;
      updateUserUI();
      showToast(t("logout_success"), "success");
    } catch (error) {
      console.error("Logout error:", error);
      showToast(t("auth_unavailable"), "error");
    }
  }

  function watchAuthState() {
    if (!auth) return;

    auth.onAuthStateChanged((user) => {
      state.user = user || null;
      updateUserUI();
      renderListings();
      renderBookingsPreview();
    });
  }

  /* =========================================
     12) FAVORITES
  ========================================= */
  function loadFavorites() {
    const raw = safeJsonGet(STORAGE_KEYS.favorites, []);
    state.favorites = Array.isArray(raw) ? raw.map(String) : [];
  }

  function saveFavorites() {
    safeJsonSet(STORAGE_KEYS.favorites, state.favorites);
  }

  function isFavorite(propertyId) {
    return state.favorites.includes(String(propertyId));
  }

  function toggleFavoriteById(propertyId) {
    const id = String(propertyId);

    if (!state.user) {
      requireAuth(t("auth_required"), "login");
      return;
    }

    const index = state.favorites.indexOf(id);
    if (index > -1) {
      state.favorites.splice(index, 1);
      showFavToast(t("fav_removed"));
    } else {
      state.favorites.push(id);
      showFavToast(t("fav_added"));
    }

    saveFavorites();
    renderListings();
  }

  window.toggleFavorite = function (event, propertyId) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    toggleFavoriteById(propertyId);
  };

  /* =========================================
     13) SEARCH / FILTER / SORT
  ========================================= */
  function updateSmartSearchPlaceholder() {
    const dom = getDom();
    if (dom.searchInput && !dom.searchInput.value) {
      dom.searchInput.setAttribute("placeholder", t("search_hint"));
    }
  }

  function setCurrentView(view) {
    state.currentView = view;
    const dom = getDom();

    if (!dom.sectionTitle) return;

    if (view === "favorites") dom.sectionTitle.textContent = t("favorites");
    else dom.sectionTitle.textContent = t("featured_title");
  }

  function syncCategoryButtons() {
    const dom = getDom();
    dom.categoryButtons.forEach((btn) => {
      const key = btn.getAttribute("data-category") || btn.getAttribute("data-category-btn");
      btn.classList.toggle("active", (key || "all") === state.activeCategory);
    });
  }

  function showClearSearchBtn() {
    const dom = getDom();
    if (dom.clearSearchBtn) dom.clearSearchBtn.style.display = "inline-flex";
  }

  function hideClearSearchBtn() {
    const dom = getDom();
    if (dom.clearSearchBtn) dom.clearSearchBtn.style.display = "none";
  }

  function getFilteredProperties() {
    let items = getSourceProperties().slice();

    if (state.currentView === "favorites") {
      items = items.filter((item) => isFavorite(getNavigationPropertyId(item)));
    }

    if (state.activeCategory && state.activeCategory !== "all") {
      items = items.filter((item) => propertyMatchesCategory(item, state.activeCategory));
    }

    const query = normalizeText(state.activeSearch).toLowerCase();
    if (query) {
      items = items.filter((item) => {
        const haystack = [
          item.title_en,
          item.title_ar,
          item.location_en,
          item.location_ar,
          item.desc_en,
          item.desc_ar,
          item.type,
          item.typeEn,
          item.typeAr,
          ...(item.features_en || []),
          ...(item.features_ar || [])
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      });
    }

    switch (state.sort) {
      case "rating":
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "price-asc":
        items.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case "price-desc":
        items.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        items.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }

    return items;
  }

  function renderEmptyState() {
    const dom = getDom();
    if (!dom.listingsGrid) return;
    dom.listingsGrid.innerHTML = `
      <div class="listings-empty-state">
        <i class="ph ph-magnifying-glass"></i>
        <strong>${escapeHtml(t("no_results_title"))}</strong>
        <p>${escapeHtml(t("no_results_text"))}</p>
      </div>
    `;
  }

  function propertyUrgencyText(property) {
    if (property.urgency && typeof property.urgency === "string") return property.urgency;
    const type = String(property.type || "").toLowerCase();
    if (type.includes("villa")) return state.lang === "ar" ? "خيار فاخر" : "Luxury pick";
    if (type.includes("apartment")) return state.lang === "ar" ? "قيمة ممتازة" : "Great value";
    return state.lang === "ar" ? "الأكثر طلبًا" : "Popular stay";
  }

  function renderListings() {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    const items = getFilteredProperties();
    syncCategoryButtons();

    if (!items.length) {
      renderEmptyState();
      return;
    }

    dom.listingsGrid.innerHTML = items
      .map((property) => {
        const id = getNavigationPropertyId(property);
        return `
          <article class="property-card" data-property-id="${escapeAttr(id)}">
            <div class="property-card-media">
              <img src="${escapeAttr(property.image)}" alt="${escapeAttr(getPropertyTitle(property))}">
              <button class="favorite-btn ${isFavorite(id) ? "active" : ""}" type="button" data-action="favorite" data-property-id="${escapeAttr(id)}" aria-label="favorite">
                <i class="ph-fill ph-heart"></i>
              </button>
              <div class="property-urgency">
                <i class="ph ph-fire"></i>
                <span>${escapeHtml(propertyUrgencyText(property))}</span>
              </div>
            </div>

            <div class="property-card-body">
              <div class="property-card-top">
                <h3 class="property-card-title">${escapeHtml(getPropertyTitle(property))}</h3>
                <div class="property-card-rating">
                  <i class="ph-fill ph-star"></i>
                  <span>${Number(property.rating || 0).toFixed(1)}</span>
                </div>
              </div>

              <div class="property-card-location">
                <i class="ph ph-map-pin"></i>
                <span>${escapeHtml(getPropertyLocation(property))}</span>
              </div>

              <div class="property-card-price">
                ${escapeHtml(formatCurrency(property.price))}
                <span>${escapeHtml(t("night_suffix"))}</span>
              </div>

              <div class="property-card-actions">
                <button type="button" class="details-btn" data-action="details" data-property-id="${escapeAttr(id)}">
                  ${escapeHtml(t("view_details"))}
                </button>
                <button type="button" class="reserve-btn primary" data-action="reserve" data-property-id="${escapeAttr(id)}">
                  ${escapeHtml(state.user ? t("reserve_now") : t("reserve_cta_signed_out"))}
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function performSearch(rawQuery = "") {
    const query = normalizeText(rawQuery);
    state.activeSearch = query;
    state.activeCategory = "all";
    setCurrentView(query ? "search" : "home");

    if (query) showClearSearchBtn();
    else hideClearSearchBtn();

    const dom = getDom();
    if (dom.searchInput && dom.searchInput.value !== query) {
      dom.searchInput.value = query;
    }

    renderListings();
  }

  function resetToHome() {
    const dom = getDom();

    state.currentView = "home";
    state.activeSearch = "";
    state.activeCategory = "all";

    if (dom.searchInput) dom.searchInput.value = "";
    hideClearSearchBtn();
    syncCategoryButtons();
    setCurrentView("home");
    renderListings();

    if (dom.heroSection) dom.heroSection.style.display = "";
    if (dom.categoriesContainer) dom.categoriesContainer.style.display = "";
  }

  function showFavoritesView() {
    state.currentView = "favorites";
    state.activeSearch = "";
    state.activeCategory = "all";
    hideClearSearchBtn();
    setCurrentView("favorites");
    renderListings();
  }

  function openPropertyDetails(propertyId) {
    const property = getPropertyById(propertyId);
    if (!property) return;

    rememberSelectedProperty(property);
    try {
      window.location.href = ROUTES.details;
    } catch (_) {
      showToast(getPropertyTitle(property), "info");
    }
  }

  function proceedToBooking(propertyId) {
    const property = getPropertyById(propertyId);
    if (!property) return;

    if (!state.user) {
      requireAuth(t("auth_redirect_book"), "login");
      return;
    }

    rememberSelectedProperty(property);
    safeJsonSet(STORAGE_KEYS.bookingContext, {
      propertyId: getNavigationPropertyId(property),
      createdAt: new Date().toISOString()
    });

    try {
      window.location.href = ROUTES.booking;
    } catch (_) {
      showToast(getPropertyTitle(property), "success");
    }
  }

  function renderSearchSuggestions(query = "") {
    const dom = getDom();
    if (!dom.searchDropdown || !dom.searchInput) return;

    const q = normalizeText(query).toLowerCase();
    const source = getSourceProperties();

    const wilayaMatches = algerianWilayas
      .filter((w) => !q || w.en.toLowerCase().includes(q) || w.ar.includes(query))
      .slice(0, 6)
      .map((w) => ({
        type: "wilaya",
        label: state.lang === "ar" ? w.ar : w.en,
        value: state.lang === "ar" ? w.ar : w.en,
        subtitle: state.lang === "ar" ? "عرض العقارات في هذه الولاية" : "Show stays in this wilaya"
      }));

    const propertyMatches = source
      .filter((p) => {
        if (!q) return true;
        const haystack = `${p.title_en} ${p.title_ar} ${p.location_en} ${p.location_ar}`.toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, 6)
      .map((p) => ({
        type: "property",
        label: getPropertyTitle(p),
        value: getPropertyTitle(p),
        subtitle: getPropertyLocation(p),
        id: getNavigationPropertyId(p)
      }));

    const results = [...wilayaMatches, ...propertyMatches].slice(0, 10);

    dom.searchDropdown.innerHTML = results.length
      ? results
          .map(
            (item) => `
            <button class="search-suggestion-item" type="button" data-type="${escapeAttr(item.type)}" data-value="${escapeAttr(item.value)}" ${item.id ? `data-id="${escapeAttr(item.id)}"` : ""}>
              <div class="search-suggestion-main">${escapeHtml(item.label)}</div>
              <div class="search-suggestion-sub">${escapeHtml(item.subtitle || "")}</div>
            </button>
          `
          )
          .join("")
      : `<div class="search-empty">${escapeHtml(t("no_results_title"))}</div>`;

    dom.searchDropdown.classList.add("active");
  }

  /* =========================================
     14) BOOKINGS
  ========================================= */
  function getStatusMeta(status) {
    const map = {
      pending: { label: t("booking_status_pending"), cls: "pending", icon: "ph-hourglass-medium" },
      confirmed: { label: t("booking_status_confirmed"), cls: "confirmed", icon: "ph-check-circle" },
      cancelled: { label: t("booking_status_cancelled"), cls: "cancelled", icon: "ph-x-circle" },
      rejected: { label: t("booking_status_rejected"), cls: "cancelled", icon: "ph-x-circle" }
    };
    return map[String(status || "").toLowerCase()] || map.pending;
  }

  function renderBookingsPreview() {
    const dom = getDom();
    if (!dom.bookingsList) return;

    if (!state.user) return;

    const demoTitle = $("#booking-demo-title");
    const demoLocation = $("#booking-demo-location");
    const demoStatus = $("#booking-demo-status");

    if (demoTitle) demoTitle.textContent = state.lang === "ar" ? "فندق سكاي لاين" : "Skyline Hotel";
    if (demoLocation) demoLocation.textContent = state.lang === "ar" ? "الجزائر العاصمة، الجزائر" : "Algiers, Algeria";
    if (demoStatus) demoStatus.textContent = t("booking_status_confirmed");
  }

  async function openBookingsModal() {
    const dom = getDom();

    if (!state.user) {
      requireAuth(t("auth_redirect_profile"), "login");
      return;
    }

    if (!dom.bookingsModal) return;

    dom.bookingsModal.classList.add("active");
    dom.body.classList.add("modal-open");

    if (!db || !dom.bookingsList) return;

    dom.bookingsList.innerHTML = `<div class="booking-card">${escapeHtml(t("loading"))}</div>`;

    try {
      const snap = await db
        .collection("bookings")
        .where("userId", "==", state.user.uid)
        .limit(20)
        .get();

      if (snap.empty) {
        dom.bookingsList.innerHTML = `
          <div class="booking-card">
            <div class="booking-card-sub">${escapeHtml(state.lang === "ar" ? "لا توجد حجوزات بعد." : "No bookings yet.")}</div>
          </div>
        `;
        return;
      }

      const cards = [];
      snap.forEach((doc) => {
        const data = doc.data() || {};
        const status = getStatusMeta(data.status);
        cards.push(`
          <div class="booking-card">
            <div class="booking-card-head">
              <div>
                <h4>${escapeHtml(data.propertyTitle || data.title || "OreBooking Stay")}</h4>
                <div class="booking-card-sub">${escapeHtml(data.location || "")}</div>
              </div>
              <span class="booking-status ${escapeAttr(status.cls)}">
                <i class="ph ${escapeAttr(status.icon)}"></i>
                ${escapeHtml(status.label)}
              </span>
            </div>

            <div class="booking-card-grid">
              <div><strong>${escapeHtml(t("booking_checkin"))}</strong> ${escapeHtml(formatDate(data.checkIn || data.checkin))}</div>
              <div><strong>${escapeHtml(t("booking_checkout"))}</strong> ${escapeHtml(formatDate(data.checkOut || data.checkout))}</div>
              <div><strong>${escapeHtml(t("booking_guests"))}</strong> ${escapeHtml(String(data.guests || "—"))}</div>
              <div><strong>${escapeHtml(t("booking_total"))}</strong> ${escapeHtml(formatCurrency(data.total || data.amount || 0))}</div>
            </div>
          </div>
        `);
      });

      dom.bookingsList.innerHTML = cards.join("");
    } catch (error) {
      console.error("Bookings load error:", error);
      dom.bookingsList.innerHTML = `
        <div class="booking-card">
          <div class="booking-card-sub">${escapeHtml(state.lang === "ar" ? "تعذر تحميل الحجوزات." : "Could not load bookings.")}</div>
        </div>
      `;
    }
  }

  function closeBookingsModal() {
    const dom = getDom();
    if (!dom.bookingsModal) return;
    dom.bookingsModal.classList.remove("active");
    dom.body.classList.remove("modal-open");
  }

  /* =========================================
     15) CHAT
  ========================================= */
  function openChatModal() {
    const dom = getDom();
    if (!dom.chatModal) return;
    dom.chatModal.classList.add("active");
    dom.body.classList.add("modal-open");
  }

  function closeChatModal() {
    const dom = getDom();
    if (!dom.chatModal) return;
    dom.chatModal.classList.remove("active");
    dom.body.classList.remove("modal-open");
  }

  function sendChatMessage() {
    const dom = getDom();
    if (!dom.chatTextarea) return;

    const value = dom.chatTextarea.value.trim();
    if (!value) return;

    const body = $(".chat-modal-body");
    if (body) {
      const message = document.createElement("div");
      message.className = "chat-message customer";
      message.innerHTML = `${escapeHtml(value)}<span class="chat-meta">${escapeHtml(new Date().toLocaleTimeString(state.lang === "ar" ? "ar-DZ" : "en-GB", { hour: "2-digit", minute: "2-digit" }))}</span>`;
      body.appendChild(message);
      body.scrollTop = body.scrollHeight;
    }

    dom.chatTextarea.value = "";
    showToast(t("support_toast"), "success");
  }

  /* =========================================
     16) EVENTS
  ========================================= */
  function bindCoreEvents() {
    const dom = getDom();

    if (dom.themeBtn && !dom.themeBtn.dataset.bound) {
      dom.themeBtn.dataset.bound = "1";
      dom.themeBtn.addEventListener("click", toggleTheme);
    }

    if (dom.langBtn && !dom.langBtn.dataset.bound) {
      dom.langBtn.dataset.bound = "1";
      dom.langBtn.addEventListener("click", toggleLanguage);
    }

    if (dom.authCta && !dom.authCta.dataset.bound) {
      dom.authCta.dataset.bound = "1";
      dom.authCta.addEventListener("click", (e) => {
        if (state.user && dom.profileDropdown) {
          e.preventDefault();
          dom.profileDropdown.classList.toggle("active");
        } else if (dom.authModal) {
          e.preventDefault();
          openAuthModal("login");
        }
      });
    }

    if (dom.profileTrigger && !dom.profileTrigger.dataset.bound) {
      dom.profileTrigger.dataset.bound = "1";
      dom.profileTrigger.addEventListener("click", (e) => {
        e.preventDefault();
        if (!state.user) {
          requireAuth(t("auth_required"), "login");
          return;
        }
        dom.profileDropdown?.classList.toggle("active");
      });
    }

    if (dom.closeAuthBtn && !dom.closeAuthBtn.dataset.bound) {
      dom.closeAuthBtn.dataset.bound = "1";
      dom.closeAuthBtn.addEventListener("click", closeAuthModal);
    }

    if (dom.loginForm && !dom.loginForm.dataset.bound) {
      dom.loginForm.dataset.bound = "1";
      dom.loginForm.addEventListener("submit", handleLogin);
    }

    if (dom.registerForm && !dom.registerForm.dataset.bound) {
      dom.registerForm.dataset.bound = "1";
      dom.registerForm.addEventListener("submit", handleRegister);
    }

    if (dom.forgotForm && !dom.forgotForm.dataset.bound) {
      dom.forgotForm.dataset.bound = "1";
      dom.forgotForm.addEventListener("submit", handleForgotPassword);
    }

    if (dom.googleLoginBtn && !dom.googleLoginBtn.dataset.bound) {
      dom.googleLoginBtn.dataset.bound = "1";
      dom.googleLoginBtn.addEventListener("click", handleGoogleLogin);
    }

    if (dom.logoutBtn && !dom.logoutBtn.dataset.bound) {
      dom.logoutBtn.dataset.bound = "1";
      dom.logoutBtn.addEventListener("click", handleLogout);
    }

    if (dom.myFavoritesBtn && !dom.myFavoritesBtn.dataset.bound) {
      dom.myFavoritesBtn.dataset.bound = "1";
      dom.myFavoritesBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!state.user) {
          requireAuth(t("auth_redirect_profile"), "login");
          return;
        }
        showFavoritesView();
        dom.profileDropdown?.classList.remove("active");
      });
    }

    if (dom.myBookingsBtn && !dom.myBookingsBtn.dataset.bound) {
      dom.myBookingsBtn.dataset.bound = "1";
      dom.myBookingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        openBookingsModal();
        dom.profileDropdown?.classList.remove("active");
      });
    }

    if (dom.sortSelect && !dom.sortSelect.dataset.bound) {
      dom.sortSelect.dataset.bound = "1";
      dom.sortSelect.addEventListener("change", () => {
        state.sort = dom.sortSelect.value || "featured";
        renderListings();
      });
    }

    if (dom.searchInput && !dom.searchInput.dataset.bound) {
      dom.searchInput.dataset.bound = "1";
      dom.searchInput.addEventListener("focus", () => renderSearchSuggestions(dom.searchInput.value));
      dom.searchInput.addEventListener("input", () => renderSearchSuggestions(dom.searchInput.value));
      dom.searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          performSearch(dom.searchInput.value);
          dom.searchDropdown?.classList.remove("active");
        }
      });
    }

    if (dom.searchBtn && !dom.searchBtn.dataset.bound) {
      dom.searchBtn.dataset.bound = "1";
      dom.searchBtn.addEventListener("click", () => {
        performSearch(dom.searchInput?.value || "");
        dom.searchDropdown?.classList.remove("active");
      });
    }

    if (dom.clearSearchBtn && !dom.clearSearchBtn.dataset.bound) {
      dom.clearSearchBtn.dataset.bound = "1";
      dom.clearSearchBtn.addEventListener("click", resetToHome);
    }

    dom.categoryButtons.forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        const key = btn.getAttribute("data-category") || btn.getAttribute("data-category-btn") || "all";
        state.activeCategory = key;
        state.currentView = "home";
        state.activeSearch = "";
        if (dom.searchInput) dom.searchInput.value = "";
        hideClearSearchBtn();
        renderListings();
      });
    });

    if (dom.closeBookingsBtn && !dom.closeBookingsBtn.dataset.bound) {
      dom.closeBookingsBtn.dataset.bound = "1";
      dom.closeBookingsBtn.addEventListener("click", closeBookingsModal);
    }

    if (dom.chatOpenBtn && !dom.chatOpenBtn.dataset.bound) {
      dom.chatOpenBtn.dataset.bound = "1";
      dom.chatOpenBtn.addEventListener("click", openChatModal);
    }

    if (dom.chatCloseBtn && !dom.chatCloseBtn.dataset.bound) {
      dom.chatCloseBtn.dataset.bound = "1";
      dom.chatCloseBtn.addEventListener("click", closeChatModal);
    }

    if (dom.chatSendBtn && !dom.chatSendBtn.dataset.bound) {
      dom.chatSendBtn.dataset.bound = "1";
      dom.chatSendBtn.addEventListener("click", sendChatMessage);
    }

    if (dom.scrollTopBtn && !dom.scrollTopBtn.dataset.bound) {
      dom.scrollTopBtn.dataset.bound = "1";
      dom.scrollTopBtn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }

    if (dom.mobileFavBtn && !dom.mobileFavBtn.dataset.bound) {
      dom.mobileFavBtn.dataset.bound = "1";
      dom.mobileFavBtn.addEventListener("click", () => {
        if (!state.user) {
          requireAuth(t("auth_redirect_profile"), "login");
          return;
        }
        showFavoritesView();
      });
    }

    if (dom.mobileProfileBtn && !dom.mobileProfileBtn.dataset.bound) {
      dom.mobileProfileBtn.dataset.bound = "1";
      dom.mobileProfileBtn.addEventListener("click", () => {
        if (!state.user) {
          window.location.href = getAuthUrl("login");
          return;
        }
        dom.profileDropdown?.classList.toggle("active");
      });
    }

    if (dom.mobileStaysBtn && !dom.mobileStaysBtn.dataset.bound) {
      dom.mobileStaysBtn.dataset.bound = "1";
      dom.mobileStaysBtn.addEventListener("click", () => {
        const section = dom.listingsGrid?.closest(".container") || dom.listingsGrid;
        section?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    document.addEventListener("click", (e) => {
      const favoriteBtn = e.target.closest("[data-action='favorite']");
      const detailsBtn = e.target.closest("[data-action='details']");
      const reserveBtn = e.target.closest("[data-action='reserve']");
      const suggestionBtn = e.target.closest(".search-suggestion-item");

      if (favoriteBtn) {
        e.preventDefault();
        e.stopPropagation();
        toggleFavoriteById(favoriteBtn.getAttribute("data-property-id"));
        return;
      }

      if (detailsBtn) {
        e.preventDefault();
        openPropertyDetails(detailsBtn.getAttribute("data-property-id"));
        return;
      }

      if (reserveBtn) {
        e.preventDefault();
        proceedToBooking(reserveBtn.getAttribute("data-property-id"));
        return;
      }

      if (suggestionBtn) {
        const type = suggestionBtn.getAttribute("data-type");
        const value = suggestionBtn.getAttribute("data-value") || "";
        const id = suggestionBtn.getAttribute("data-id") || "";

        if (type === "property" && id) {
          openPropertyDetails(id);
          return;
        }

        if (dom.searchInput) dom.searchInput.value = value;
        performSearch(value);
        dom.searchDropdown?.classList.remove("active");
        return;
      }

      if (!e.target.closest(".profile-container")) {
        dom.profileDropdown?.classList.remove("active");
      }

      if (dom.searchDropdown && dom.searchInput && !e.target.closest("#search-location-wrapper") && !e.target.closest(".search-bar")) {
        dom.searchDropdown.classList.remove("active");
      }

      if (dom.authModal && e.target === dom.authModal) {
        closeAuthModal();
      }

      if (dom.bookingsModal && e.target === dom.bookingsModal) {
        closeBookingsModal();
      }

      if (dom.chatModal && e.target === dom.chatModal) {
        closeChatModal();
      }
    });

    window.addEventListener("scroll", () => {
      if (!dom.scrollTopBtn) return;
      if (window.scrollY > 320) dom.scrollTopBtn.classList.add("visible");
      else dom.scrollTopBtn.classList.remove("visible");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeAuthModal();
      closeBookingsModal();
      closeChatModal();
      dom.profileDropdown?.classList.remove("active");
      dom.searchDropdown?.classList.remove("active");
    });

    document.querySelectorAll("[data-switch-auth]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        switchAuthForm(btn.getAttribute("data-switch-auth") || "login");
      });
    });

    document.querySelectorAll("[data-pass-toggle]").forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        const targetId = btn.getAttribute("data-pass-toggle");
        const input = targetId ? document.getElementById(targetId) : btn.parentElement?.querySelector("input");
        if (!input) return;
        input.type = input.type === "password" ? "text" : "password";
        btn.innerHTML = input.type === "password"
          ? `<i class="ph ph-eye"></i>`
          : `<i class="ph ph-eye-slash"></i>`;
      });
    });
  }

  /* =========================================
     17) PAGE INIT
  ========================================= */
  async function initPageData() {
    const dom = getDom();
    if (dom.listingsGrid) {
      dom.listingsGrid.innerHTML = `
        <div class="listings-empty-state">
          <i class="ph ph-circle-notch ph-spin"></i>
          <p>${escapeHtml(t("loading"))}</p>
        </div>
      `;
    }

    const loaded = await loadLiveProperties();
    if (!loaded && db) {
      showToast(t("property_load_error"), "info");
    }

    renderListings();
  }

  function initRememberToggle() {
    const checkbox = $("#login-remember") || $("#remember-me");
    if (!checkbox) return;
    checkbox.checked = safeGet(STORAGE_KEYS.remember, "1") !== "0";
    checkbox.addEventListener("change", () => {
      safeSet(STORAGE_KEYS.remember, checkbox.checked ? "1" : "0");
    });
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;

    initFirebase();
    loadFavorites();
    applyInitialState();
    bindCoreEvents();
    initRememberToggle();
    updateSmartSearchPlaceholder();
    updateUserUI();
    renderBookingsPreview();
    initPageData();

    if (auth) {
      watchAuthState();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
