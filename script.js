"use strict";

/* =========================================
   OreBooking - script.js
   Shared app script
   - public property details
   - protected booking redirect
   - Firebase auth
   - listings / favorites / bookings / chat
   - theme / language sync
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
    favoritesGuest: "ore_favorites_guest",
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
    details: safeGet("ore_property_page", "property.html"), // غيّرها إلى details.html لو هذا اسم صفحتك
    booking: safeGet("ore_booking_page", "booking.html"),
    favorites: safeGet("ore_favorites_page", "favorites.html"),
    bookings: safeGet("ore_bookings_page", "bookings.html")
  };

  const firebaseConfig = {
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
    firestoreReady: false,
    bookings: [],
    chatMessages: [],
    favorites: []
  };

  let firebaseReady = false;
  let auth = null;
  let db = null;
  let googleProvider = null;

  /* =========================================
     4) TRANSLATIONS
  ========================================= */
  const translations = {
    en: {
      page_title: "OreBooking - Premium Stays",
      sign_in: "Sign In",
      sign_out: "Sign out",
      my_bookings: "My bookings",
      favorites: "Favorites",
      guest_user: "Guest User",
      logged_in_as: "Signed in",
      where_placeholder: "Search city or property",
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
      forgot_pass: "Forgot password?",
      send_link: "Send reset link",
      continue_google: "Continue with Google",
      popular_this_week: "Popular this week",
      great_value: "Great value",
      luxury_pick: "Luxury pick",
      breakfast_included: "Breakfast included",
      weekend_favorite: "Weekend favorite",
      only_rooms_left: "Only 2 rooms left",
      no_bookings: "No bookings yet.",
      bookings_load_error: "Could not load your bookings.",
      loading_bookings: "Loading bookings...",
      message_required: "Please type a message first."
    },
    ar: {
      page_title: "OreBooking - إقامات مميزة",
      sign_in: "تسجيل الدخول",
      sign_out: "تسجيل الخروج",
      my_bookings: "حجوزاتي",
      favorites: "المفضلة",
      guest_user: "زائر",
      logged_in_as: "تم تسجيل الدخول",
      where_placeholder: "ابحث عن مدينة أو عقار",
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
      forgot_pass: "نسيت كلمة المرور؟",
      send_link: "إرسال الرابط",
      continue_google: "المتابعة عبر Google",
      popular_this_week: "شائع هذا الأسبوع",
      great_value: "قيمة ممتازة",
      luxury_pick: "خيار فاخر",
      breakfast_included: "الإفطار مشمول",
      weekend_favorite: "مفضل عطلة نهاية الأسبوع",
      only_rooms_left: "تبقّت غرفتان فقط",
      no_bookings: "لا توجد حجوزات بعد.",
      bookings_load_error: "تعذر تحميل الحجوزات.",
      loading_bookings: "جارٍ تحميل الحجوزات...",
      message_required: "اكتب رسالة أولًا."
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
      signin: "sign_in",
      signout: "sign_out",
      mybookings: "my_bookings",
      clearsearch: "clear_search",
      searchhint: "search_hint",
      whereplaceholder: "where_placeholder",
      chatplaceholder: "chat_placeholder",
      fullname: "full_name",
      forgotpassword: "forgot_pass",
      rememberme: "remember_me"
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
     5) FALLBACK DATA
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

  /* =========================================
     6) DOM HELPERS
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
      profileContainer: firstExisting([".profile-container"]),
      profileTrigger: firstExisting(["#profile-trigger", "#open-auth-btn", ".profile-menu", "[data-profile-trigger]"]),
      profileDropdown: firstExisting(["#profile-dropdown", ".profile-dropdown"]),
      logoutBtn: firstExisting(["#logout-btn", "[data-logout]"]),
      myFavoritesBtn: firstExisting(["#my-favorites-btn", "#profile-favorites-btn", "[data-open-favorites]"]),
      myBookingsBtn: firstExisting(["#my-bookings-btn", "#open-bookings-btn", "[data-open-bookings]"]),
      homeLogoBtn: firstExisting(["#home-logo-btn", ".logo", "a.logo"]),
      profileName: firstExisting(["#profile-name", "#dropdown-user-name", "[data-profile-name]"]),
      profileEmail: firstExisting(["#profile-email", "#dropdown-user-email", "[data-profile-email]"]),

      authModal: firstExisting(["#auth-modal", ".auth-modal", ".modal-overlay.auth-modal"]),
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
      searchBtn: firstExisting(["#search-btn", "#main-search-btn", "[data-main-search]"]),
      categoryButtons: $all(".category-item[data-category], [data-category-btn], .category-chip[data-category]"),

      sectionTitle: firstExisting(["#section-main-title", "[data-section-title]", ".section-header-wrapper h2"]),

      bookingsModal: firstExisting(["#bookings-modal", ".bookings-modal"]),
      closeBookingsBtn: firstExisting(["#close-bookings-btn", "[data-close-bookings]", ".close-bookings-btn"]),
      bookingsList: firstExisting(["#bookings-list", "[data-bookings-list]"]),

      chatModal: firstExisting(["#chat-modal", ".chat-modal"]),
      chatOpenBtn: firstExisting(["#chat-open-btn", "[data-chat-open]", ".chat-fab-btn"]),
      chatCloseBtn: firstExisting(["#chat-close-btn", "#close-chat-btn", "[data-chat-close]"]),
      chatSendBtn: firstExisting(["#chat-send-btn", "#send-chat-btn", "[data-chat-send]"]),
      chatTextarea: firstExisting(["#chat-textarea", "#chat-message-input", "[data-chat-textarea]"]),
      chatMessages: firstExisting(["#chat-messages"]),
      chatEmptyState: firstExisting(["#chat-empty-state"]),
      chatPropertyId: firstExisting(["#chat-property-id"]),

      scrollTopBtn: firstExisting(["#scroll-top-btn", "[data-scroll-top]"]),
      favToast: firstExisting(["#fav-toast"]),
      toastContainer: firstExisting(["#toast-container"]),

      mobileFavBtn: firstExisting(["#mob-fav-btn"]),
      mobileProfileBtn: firstExisting(["#mob-profile-btn"]),
      mobileStaysBtn: firstExisting(["#mob-stays-btn"])
    };
  }

  /* =========================================
     7) HELPERS
  ========================================= */
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = String(str ?? "");
    return div.innerHTML;
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
    toast.className = `toast toast-${type}`;
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

  function safeCall(fn) {
    try {
      return fn();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  /* =========================================
     8) FIREBASE
  ========================================= */
  function isFirebaseConfigUsable(cfg) {
    if (!cfg || typeof cfg !== "object") return false;
    const required = ["apiKey", "authDomain", "projectId", "appId"];
    return required.every((key) => cfg[key] && !String(cfg[key]).includes("YOUR_"));
  }

  function initFirebase() {
    try {
      if (typeof window.firebase === "undefined") return false;
      if (!isFirebaseConfigUsable(firebaseConfig)) return false;

      if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
      }

      auth = typeof firebase.auth === "function" ? firebase.auth() : null;
      db = typeof firebase.firestore === "function" ? firebase.firestore() : null;
      googleProvider =
        typeof firebase.auth?.GoogleAuthProvider === "function"
          ? new firebase.auth.GoogleAuthProvider()
          : null;

      firebaseReady = !!window.firebase;
      state.authReady = !!auth;
      state.firestoreReady = !!db;

      if (auth && state.lang) {
        try {
          auth.languageCode = state.lang;
        } catch (_) {}
      }

      return true;
    } catch (error) {
      console.error("Firebase init error:", error);
      firebaseReady = false;
      state.authReady = false;
      state.firestoreReady = false;
      auth = null;
      db = null;
      googleProvider = null;
      return false;
    }
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
    const baseImage =
      p.image ||
      p.imageUrl ||
      p.mainImage ||
      p.coverImage ||
      (Array.isArray(p.images) && p.images[0]) ||
      "images/placeholder.jpg";

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
      type: String(p.type || p.category || "").toLowerCase(),
      typeEn: p.typeEn || p.categoryEn || p.type || "",
      typeAr: p.typeAr || p.categoryAr || p.type || "",
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
      createdAt: p.createdAt || null,
      updatedAt: p.updatedAt || null
    };
  }

  function getSourceProperties() {
    if (state.liveProperties.length) return state.liveProperties;
    return fallbackProperties.map((p) => normalizeProperty(p, p.id, "fallback"));
  }

  function getPropertyById(id) {
    const target = String(id || "");
    return (
      getSourceProperties().find(
        (p) =>
          String(p.id) === target ||
          String(p.docId) === target ||
          String(p.navId) === target ||
          String(p.customId) === target
      ) || null
    );
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
    return state.lang === "ar"
      ? property.typeAr || property.type || ""
      : property.typeEn || property.type || "";
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

  function buildDetailsUrl(property) {
    const propertyId = encodeURIComponent(getNavigationPropertyId(property));
    return `${ROUTES.details}?id=${propertyId}`;
  }

  function buildBookingUrl(property) {
    const propertyId = encodeURIComponent(getNavigationPropertyId(property));
    const params = new URLSearchParams();
    params.set("id", propertyId);

    const dom = getDom();
    const destinationInput = dom.destinationInput?.value?.trim();
    const checkIn =
      firstExisting(["#checkin-date", "#arrival-date", "#search-checkin", "input[name='checkin']"])?.value || "";
    const checkOut =
      firstExisting(["#checkout-date", "#departure-date", "#search-checkout", "input[name='checkout']"])?.value || "";
    const guests =
      firstExisting(["#guest-count", "#guest-adults", "#search-guests", "input[name='guests']"])?.value || "";

    if (destinationInput) params.set("destination", destinationInput);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);

    return `${ROUTES.booking}?${params.toString()}`;
  }

  function openPropertyDetails(property) {
    if (!property) return;
    rememberSelectedProperty(property);
    window.location.href = buildDetailsUrl(property);
  }

  function continuePendingBookingAfterAuth() {
    const ctx = safeJsonGet(STORAGE_KEYS.bookingContext, null);
    if (!ctx || !ctx.redirectTo) return false;

    safeRemove(STORAGE_KEYS.bookingContext);
    window.location.href = ctx.redirectTo;
    return true;
  }

  function handleReserveNow(property) {
    if (!property) return;

    rememberSelectedProperty(property);
    const redirectTo = buildBookingUrl(property);

    if (!state.user) {
      safeJsonSet(STORAGE_KEYS.bookingContext, {
        type: "booking",
        propertyId: getNavigationPropertyId(property),
        redirectTo,
        createdAt: new Date().toISOString()
      });

      requireAuth(t("auth_redirect_book"), "login");
      return;
    }

    window.location.href = redirectTo;
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
     10) FAVORITES
  ========================================= */
  function getFavoritesKeyForUser(uid) {
    return uid ? `orefavs_${uid}` : STORAGE_KEYS.favoritesGuest;
  }

  function getLegacyFavoritesKey(uid) {
    return uid ? `orefavs-${uid}` : STORAGE_KEYS.favorites;
  }

  function getFavoriteIds() {
    const uid = state.user?.uid || "";
    const key = getFavoritesKeyForUser(uid);
    const legacy = getLegacyFavoritesKey(uid);

    const primary = safeJsonGet(key, null);
    const secondary = safeJsonGet(legacy, null);
    const common = safeJsonGet(STORAGE_KEYS.favorites, null);

    const merged = []
      .concat(Array.isArray(primary) ? primary : [])
      .concat(Array.isArray(secondary) ? secondary : [])
      .concat(Array.isArray(common) ? common : []);

    const unique = [...new Set(merged.map((x) => String(x)))];
    state.favorites = unique;
    return unique;
  }

  function saveFavoriteIds(list) {
    const uid = state.user?.uid || "";
    const unique = [...new Set((Array.isArray(list) ? list : []).map((x) => String(x)))];

    safeJsonSet(getFavoritesKeyForUser(uid), unique);
    safeJsonSet(getLegacyFavoritesKey(uid), unique);
    safeJsonSet(STORAGE_KEYS.favorites, unique);

    state.favorites = unique;
  }

  function isFavorite(propertyId) {
    const id = String(propertyId || "");
    return getFavoriteIds().includes(id);
  }

  function toggleFavorite(property) {
    if (!property) return;

    const propertyId = getNavigationPropertyId(property);
    const list = getFavoriteIds();
    const exists = list.includes(propertyId);
    const next = exists ? list.filter((x) => x !== propertyId) : [...list, propertyId];

    saveFavoriteIds(next);
    renderListings();

    if (typeof window.updateFavButtonState === "function") {
      safeCall(() => window.updateFavButtonState());
    }

    showFavToast(exists ? t("fav_removed") : t("fav_added"));
  }

  /* =========================================
     11) THEME / LANGUAGE
  ========================================= */
  function updateLogo() {
    const mainLogo = firstExisting(["#main-logo", ".logo-img"]);
    const modalLogo = firstExisting(["#modal-logo", ".auth-header img"]);
    const logoPath = state.theme === "dark" ? "logos/orebooking2.png" : "logos/orebooking.png";

    if (mainLogo && !/favicon/i.test(mainLogo.src)) mainLogo.src = logoPath;
    if (modalLogo && !/favicon/i.test(modalLogo.src)) modalLogo.src = logoPath;
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
      const hasIcon = !!dom.langBtn.querySelector("i");
      dom.langBtn.innerHTML = hasIcon
        ? `<i class="ph ph-translate"></i><span>${state.lang === "en" ? "AR" : "EN"}</span>`
        : state.lang === "en"
        ? "AR"
        : "EN";
    }

    if (dom.themeBtn) {
      dom.themeBtn.innerHTML =
        state.theme === "dark" ? `<i class="ph ph-sun"></i>` : `<i class="ph ph-moon"></i>`;
    }

    if (dom.destinationInput && !dom.destinationInput.value) {
      dom.destinationInput.setAttribute("placeholder", t("where_placeholder"));
    }

    if (dom.sectionTitle) {
      dom.sectionTitle.textContent = state.currentView === "favorites" ? t("favorites") : t("featured_title");
    }
  }

  function applyTheme() {
    const dom = getDom();
    dom.body?.classList.toggle("dark", state.theme === "dark");
    dom.html?.classList.toggle("dark", state.theme === "dark");
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
    renderBookingsPreview();
  }

  /* =========================================
     12) AUTH
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

  function updateUserUI() {
    const dom = getDom();
    const name = state.user?.displayName || t("guest_user");
    const email = state.user?.email || "";

    if (dom.profileName) dom.profileName.textContent = name;
    if (dom.profileEmail) dom.profileEmail.textContent = email;

    if (dom.authCta && dom.profileTrigger && dom.authCta !== dom.profileTrigger) {
      dom.authCta.classList.toggle("hidden", !!state.user);
      dom.profileTrigger.classList.toggle("hidden", !state.user);
    } else if (dom.authCta) {
      const icon = dom.authCta.querySelector("i");
      const span = dom.authCta.querySelector("span");

      if (state.user) {
        if (icon) icon.className = "ph ph-user-circle-check";
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
    const remember =
      $("#login-remember")?.checked ??
      $("#remember-me")?.checked ??
      safeGet(STORAGE_KEYS.remember, "1") !== "0";

    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    if (!password) {
      showAuthMessage(t("invalid_credentials"), "error");
      return;
    }

    try {
      const persistence =
        remember && firebase?.auth?.Auth?.Persistence?.LOCAL
          ? firebase.auth.Auth.Persistence.LOCAL
          : firebase?.auth?.Auth?.Persistence?.SESSION || undefined;

      if (persistence) {
        await auth.setPersistence(persistence);
      }

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

    if (!auth) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    const fullName =
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

    if (!fullName || !email || !password) {
      showAuthMessage(t("fill_required"), "error");
      return;
    }

    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    if (String(password).length < 6) {
      showAuthMessage(state.lang === "ar" ? "كلمة المرور قصيرة جدًا." : "Password is too short.", "error");
      return;
    }

    try {
      const result = await auth.createUserWithEmailAndPassword(email, password);

      if (result?.user && fullName) {
        await result.user.updateProfile({ displayName: fullName });
      }

      showToast(t("register_success"), "success");
      showAuthMessage("", "");
      getDom().registerForm?.reset();
      closeAuthModal();
    } catch (error) {
      console.error("Register error:", error);
      showAuthMessage(humanFirebaseError(error.code), "error");
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();

    if (!auth) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    const email = $("#forgot-email")?.value.trim() || $("#reset-email")?.value.trim() || "";

    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      showAuthMessage(t("reset_sent"), "success");
    } catch (error) {
      console.error("Reset error:", error);
      showAuthMessage(humanFirebaseError(error.code), "error");
    }
  }

  async function handleGoogleLogin(event) {
    event?.preventDefault?.();

    if (!auth || !googleProvider) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    try {
      await auth.signInWithPopup(googleProvider);
      closeAuthModal();
      showToast(t("login_success"), "success");
    } catch (error) {
      console.error("Google login error:", error);
      showAuthMessage(humanFirebaseError(error.code), "error");
    }
  }

  async function handleLogout() {
    try {
      if (auth) await auth.signOut();
      state.user = null;
      getFavoriteIds();
      updateUserUI();
      renderListings();
      showToast(t("logout_success"), "success");
    } catch (error) {
      console.error("Logout error:", error);
      showToast(state.lang === "ar" ? "تعذر تسجيل الخروج." : "Could not sign out.", "error");
    }
  }

  /* =========================================
     13) BOOKINGS PREVIEW
  ========================================= */
  function bookingStatusText(status) {
    const raw = String(status || "pending").toLowerCase();

    if (raw === "confirmed") return t("booking_status_confirmed");
    if (raw === "cancelled") return t("booking_status_cancelled");
    if (raw === "rejected") return t("booking_status_rejected");
    return t("booking_status_pending");
  }

  function getLocalBookings() {
    const list = safeJsonGet("orebookingslocalv1", []);
    return Array.isArray(list) ? list : [];
  }

  async function loadUserBookings() {
    if (!state.user) {
      state.bookings = [];
      return [];
    }

    const local = getLocalBookings().filter((item) => {
      return (
        String(item?.userId || "") === String(state.user.uid || "") ||
        String(item?.userEmail || "").toLowerCase() === String(state.user.email || "").toLowerCase()
      );
    });

    if (!db) {
      state.bookings = local;
      return local;
    }

    try {
      let remote = [];

      try {
        const byUserId = await db
          .collection("bookings")
          .where("userId", "==", state.user.uid)
          .limit(20)
          .get();

        byUserId.forEach((doc) => remote.push({ id: doc.id, ...doc.data() }));
      } catch (_) {}

      if (!remote.length && state.user.email) {
        try {
          const byEmail = await db
            .collection("bookings")
            .where("userEmail", "==", state.user.email)
            .limit(20)
            .get();

          byEmail.forEach((doc) => remote.push({ id: doc.id, ...doc.data() }));
        } catch (_) {}
      }

      const mergedMap = new Map();

      [...remote, ...local].forEach((item) => {
        const key = String(item?.id || item?.bookingReference || item?.createdAt || Math.random());
        mergedMap.set(key, item);
      });

      state.bookings = Array.from(mergedMap.values()).sort((a, b) => {
        const da = new Date(a?.createdAt?.toDate ? a.createdAt.toDate() : a?.createdAt || 0).getTime();
        const dbb = new Date(b?.createdAt?.toDate ? b.createdAt.toDate() : b?.createdAt || 0).getTime();
        return dbb - da;
      });

      return state.bookings;
    } catch (error) {
      console.error("Bookings load error:", error);
      state.bookings = local;
      return local;
    }
  }

  function renderBookingsPreview() {
    const dom = getDom();
    if (!dom.bookingsList) return;

    if (!state.user) {
      dom.bookingsList.innerHTML = `
        <div style="text-align:center;padding:28px;color:var(--text-muted);">
          ${escapeHtml(t("auth_required"))}
        </div>
      `;
      return;
    }

    const bookings = Array.isArray(state.bookings) ? state.bookings : [];

    if (!bookings.length) {
      dom.bookingsList.innerHTML = `
        <div style="text-align:center;padding:28px;color:var(--text-muted);">
          ${escapeHtml(t("no_bookings"))}
        </div>
      `;
      return;
    }

    dom.bookingsList.innerHTML = bookings
      .map((item) => {
        const title =
          item?.propertyTitle ||
          item?.propertyName ||
          item?.title ||
          (state.lang === "ar" ? "عقار" : "Property");

        const checkIn = item?.stay?.checkIn || item?.checkIn || item?.arrivalDate || "";
        const checkOut = item?.stay?.checkOut || item?.checkOut || item?.departureDate || "";
        const guests =
          item?.stay?.adults + item?.stay?.children ||
          item?.guestCount ||
          item?.guests ||
          item?.stay?.adults ||
          1;

        const total = item?.pricing?.total || item?.total || item?.amount || 0;
        const status = bookingStatusText(item?.status);

        return `
          <article style="padding:16px;border:1px solid var(--border-color,#e2e8f0);border-radius:16px;background:var(--surface-color,#fff);margin-bottom:12px;">
            <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
              <div>
                <strong style="display:block;margin-bottom:6px;">${escapeHtml(title)}</strong>
                <div style="color:var(--text-muted,#64748b);font-size:.92rem;line-height:1.8;">
                  <div>${escapeHtml(t("booking_checkin"))} ${escapeHtml(formatDate(checkIn))}</div>
                  <div>${escapeHtml(t("booking_checkout"))} ${escapeHtml(formatDate(checkOut))}</div>
                  <div>${escapeHtml(t("booking_guests"))} ${escapeHtml(String(guests || 1))}</div>
                  <div>${escapeHtml(t("booking_total"))} ${escapeHtml(formatCurrency(total))}</div>
                </div>
              </div>
              <span style="padding:6px 10px;border-radius:999px;background:rgba(67,90,191,.08);color:#435abf;font-weight:800;font-size:.82rem;">
                ${escapeHtml(status)}
              </span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function openBookingsModal() {
    const dom = getDom();

    if (!state.user) {
      requireAuth(t("auth_redirect_profile"), "login");
      return;
    }

    if (dom.bookingsModal) {
      dom.bookingsModal.classList.add("active");
      dom.body.classList.add("modal-open");
    }

    if (dom.bookingsList) {
      dom.bookingsList.innerHTML = `
        <div style="text-align:center;padding:28px;color:var(--text-muted);">
          ${escapeHtml(t("loading_bookings"))}
        </div>
      `;
    }

    try {
      await loadUserBookings();
      renderBookingsPreview();
    } catch (_) {
      if (dom.bookingsList) {
        dom.bookingsList.innerHTML = `
          <div style="text-align:center;padding:28px;color:var(--text-muted);">
            ${escapeHtml(t("bookings_load_error"))}
          </div>
        `;
      }
    }
  }

  function closeBookingsModal() {
    const dom = getDom();
    dom.bookingsModal?.classList.remove("active");
    dom.body.classList.remove("modal-open");
  }

  /* =========================================
     14) CHAT
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

  function appendChatMessage(text, from = "user") {
    const dom = getDom();
    if (!dom.chatMessages) return;

    if (dom.chatEmptyState) dom.chatEmptyState.style.display = "none";

    const item = document.createElement("div");
    item.style.cssText = `
      display:flex;
      justify-content:${from === "user" ? "flex-end" : "flex-start"};
      margin-bottom:10px;
    `;

    const bubble = document.createElement("div");
    bubble.style.cssText = `
      max-width:min(85%,420px);
      padding:12px 14px;
      border-radius:16px;
      line-height:1.7;
      font-weight:600;
      background:${from === "user" ? "#435abf" : "rgba(148,163,184,.14)"};
      color:${from === "user" ? "#fff" : "inherit"};
    `;
    bubble.textContent = text;

    item.appendChild(bubble);
    dom.chatMessages.appendChild(item);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  function handleChatSend() {
    const dom = getDom();
    const text = normalizeText(dom.chatTextarea?.value || "");

    if (!text) {
      showToast(t("message_required"), "error");
      return;
    }

    appendChatMessage(text, "user");
    if (dom.chatTextarea) dom.chatTextarea.value = "";

    setTimeout(() => {
      appendChatMessage(
        state.lang === "ar"
          ? "تم استلام رسالتك، وسيرد فريق الدعم قريبًا."
          : "Your message has been received. Our support team will reply soon.",
        "support"
      );
    }, 500);

    showToast(t("support_toast"), "success");
  }

  /* =========================================
     15) LISTINGS RENDER
  ========================================= */
  function renderStars(rating) {
    const val = Number(rating || 0).toFixed(1);
    return `
      <span style="display:inline-flex;align-items:center;gap:6px;">
        <i class="ph-fill ph-star" style="color:#f59e0b;"></i>
        <span>${escapeHtml(val)}</span>
      </span>
    `;
  }

  function getUrgencyText(property) {
    if (property?.urgency) return property.urgency;
    const type = String(property?.type || "").toLowerCase();

    if (type === "hotel") return t("only_rooms_left");
    if (type === "apartment") return t("great_value");
    if (type === "villa") return t("luxury_pick");
    return "";
  }

  function buildPropertyCard(property) {
    const title = getPropertyTitle(property);
    const location = getPropertyLocation(property);
    const type = getPropertyType(property);
    const isFav = isFavorite(getNavigationPropertyId(property));
    const reserveLabel = state.user ? t("reserve_now") : t("reserve_cta_signed_out");
    const urgency = getUrgencyText(property);

    return `
      <article class="listing-card" data-property-id="${escapeHtml(getNavigationPropertyId(property))}" style="
        background:var(--surface-color,#fff);
        border:1px solid var(--border-color,#e2e8f0);
        border-radius:24px;
        overflow:hidden;
        box-shadow:0 10px 30px rgba(15,23,42,.06);
      ">
        <div style="position:relative;">
          <img
            src="${escapeHtml(property.image)}"
            alt="${escapeHtml(title)}"
            style="width:100%;height:240px;object-fit:cover;background:#f8fafc;"
            onerror="this.src='images/placeholder.jpg'"
          />
          <button
            type="button"
            data-action="favorite"
            data-id="${escapeHtml(getNavigationPropertyId(property))}"
            style="
              position:absolute;top:14px;${state.lang === "ar" ? "left" : "right"}:14px;
              width:44px;height:44px;border:none;border-radius:999px;cursor:pointer;
              background:${isFav ? "rgba(225,29,72,.12)" : "rgba(255,255,255,.92)"};
              color:${isFav ? "#e11d48" : "#0f172a"};
              box-shadow:0 8px 24px rgba(15,23,42,.12);
              display:flex;align-items:center;justify-content:center;
            "
            aria-label="favorite"
          >
            <i class="${isFav ? "ph-fill ph-heart" : "ph ph-heart"}"></i>
          </button>
        </div>

        <div style="padding:18px;">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px;">
            <div style="min-width:0;">
              <h3 style="margin:0 0 6px;font-size:1.15rem;line-height:1.3;">${escapeHtml(title)}</h3>
              <p style="margin:0;color:var(--text-muted,#64748b);display:flex;align-items:center;gap:6px;">
                <i class="ph ph-map-pin"></i>
                <span>${escapeHtml(location)}</span>
              </p>
            </div>
            <div style="white-space:nowrap;font-weight:800;">${renderStars(property.rating)}</div>
          </div>

          <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">
            <span style="padding:6px 10px;border-radius:999px;background:rgba(67,90,191,.08);color:#435abf;font-weight:800;font-size:.82rem;">
              ${escapeHtml(type)}
            </span>
            ${urgency ? `
              <span style="color:var(--text-muted,#64748b);font-size:.86rem;font-weight:700;">
                ${escapeHtml(urgency)}
              </span>
            ` : ""}
          </div>

          <div style="display:flex;justify-content:space-between;align-items:end;gap:16px;margin-bottom:16px;">
            <div>
              <strong style="font-size:1.25rem;">${escapeHtml(formatCurrency(property.price))}</strong>
              <span style="color:var(--text-muted,#64748b);">${escapeHtml(t("night_suffix"))}</span>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <button
              type="button"
              data-action="details"
              data-id="${escapeHtml(getNavigationPropertyId(property))}"
              class="listing-details-btn"
              style="
                min-height:48px;border-radius:14px;border:1px solid var(--border-color,#e2e8f0);
                background:var(--surface-color,#fff);cursor:pointer;font-weight:800;
              "
            >
              ${escapeHtml(t("view_details"))}
            </button>

            <button
              type="button"
              data-action="reserve"
              data-id="${escapeHtml(getNavigationPropertyId(property))}"
              class="listing-reserve-btn"
              style="
                min-height:48px;border-radius:14px;border:none;cursor:pointer;font-weight:800;color:#fff;
                background:linear-gradient(135deg,#435abf,#34459c);
              "
            >
              ${escapeHtml(reserveLabel)}
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function getFilteredProperties() {
    const source = getSourceProperties();
    const searchText = normalizeText(state.activeSearch).toLowerCase();

    let filtered = source.filter((property) => {
      const inCategory = propertyMatchesCategory(property, state.activeCategory);

      const haystack = [
        property.title_en,
        property.title_ar,
        property.location_en,
        property.location_ar,
        property.type,
        property.typeEn,
        property.typeAr,
        property.desc_en,
        property.desc_ar
      ]
        .join(" ")
        .toLowerCase();

      const inSearch = !searchText || haystack.includes(searchText);
      return inCategory && inSearch;
    });

    if (state.currentView === "favorites") {
      const ids = getFavoriteIds();
      filtered = filtered.filter((item) => ids.includes(getNavigationPropertyId(item)));
    }

    if (state.sort === "rating") {
      filtered.sort((a, b) => b.rating - a.rating);
    } else if (state.sort === "price-low") {
      filtered.sort((a, b) => a.price - b.price);
    } else if (state.sort === "price-high") {
      filtered.sort((a, b) => b.price - a.price);
    }

    return filtered;
  }

  function renderEmptyState() {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    dom.listingsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text-muted,#64748b);">
        <h3 style="margin-bottom:10px;">${escapeHtml(t("no_results_title"))}</h3>
        <p style="margin:0;">${escapeHtml(t("no_results_text"))}</p>
      </div>
    `;
  }

  function renderLoadingState() {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    dom.listingsGrid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px 20px;color:var(--text-muted,#64748b);">
        ${escapeHtml(t("loading"))}
      </div>
    `;
  }

  function renderListings() {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    const items = getFilteredProperties();

    if (!items.length) {
      renderEmptyState();
      return;
    }

    dom.listingsGrid.innerHTML = items.map(buildPropertyCard).join("");
  }

  function syncCategoryButtons() {
    const dom = getDom();

    dom.categoryButtons.forEach((btn) => {
      const category = btn.getAttribute("data-category") || btn.getAttribute("data-category-btn") || "all";
      const isActive = category === state.activeCategory;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function updateCurrentViewFromPage() {
    const page = currentPage().toLowerCase();
    if (page.includes("favorite")) state.currentView = "favorites";
    else state.currentView = "home";
  }

  /* =========================================
     16) EVENTS
  ========================================= */
  function bindListingActions() {
    document.addEventListener("click", (event) => {
      const actionBtn = event.target.closest("[data-action]");
      if (!actionBtn) return;

      const action = actionBtn.getAttribute("data-action");
      const id = actionBtn.getAttribute("data-id");
      const property = getPropertyById(id);

      if (action === "favorite") {
        event.preventDefault();
        if (property) toggleFavorite(property);
      }

      if (action === "details") {
        event.preventDefault();
        if (property) openPropertyDetails(property);
      }

      if (action === "reserve") {
        event.preventDefault();
        if (property) handleReserveNow(property);
      }

      if (action === "toggle-theme") {
        toggleTheme();
      }

      if (action === "toggle-lang") {
        toggleLanguage();
      }
    });
  }

  function bindGeneralEvents() {
    const dom = getDom();

    dom.themeBtn?.addEventListener("click", toggleTheme);
    dom.langBtn?.addEventListener("click", toggleLanguage);

    dom.searchBtn?.addEventListener("click", () => {
      state.activeSearch = normalizeText(dom.destinationInput?.value || "");
      renderListings();
    });

    dom.destinationInput?.addEventListener("input", (e) => {
      state.activeSearch = normalizeText(e.target.value || "");
      renderListings();
    });

    dom.destinationInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        state.activeSearch = normalizeText(dom.destinationInput?.value || "");
        renderListings();
      }
    });

    dom.clearSearchBtn?.addEventListener("click", () => {
      state.activeSearch = "";
      if (dom.destinationInput) dom.destinationInput.value = "";
      renderListings();
    });

    dom.sortSelect?.addEventListener("change", (e) => {
      const value = String(e.target.value || "featured").toLowerCase();
      const map = {
        featured: "featured",
        rating: "rating",
        "top-rated": "rating",
        price_low: "price-low",
        "price-low": "price-low",
        price_high: "price-high",
        "price-high": "price-high"
      };

      state.sort = map[value] || "featured";
      renderListings();
    });

    dom.categoryButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeCategory =
          btn.getAttribute("data-category") || btn.getAttribute("data-category-btn") || "all";
        syncCategoryButtons();
        renderListings();
      });
    });

    dom.authCta?.addEventListener("click", (e) => {
      if (!state.user) {
        e.preventDefault();
        openAuthModal("login");
      } else if (dom.profileDropdown) {
        dom.profileDropdown.classList.toggle("active");
      }
    });

    dom.profileTrigger?.addEventListener("click", (e) => {
      if (!state.user) {
        e.preventDefault();
        openAuthModal("login");
        return;
      }

      if (dom.profileDropdown) {
        e.preventDefault();
        dom.profileDropdown.classList.toggle("active");
      }
    });

    dom.closeAuthBtn?.addEventListener("click", closeAuthModal);
    dom.authModal?.addEventListener("click", (e) => {
      if (e.target === dom.authModal) closeAuthModal();
    });

    dom.logoutBtn?.addEventListener("click", handleLogout);
    dom.myFavoritesBtn?.addEventListener("click", () => {
      window.location.href = ROUTES.favorites;
    });
    dom.myBookingsBtn?.addEventListener("click", openBookingsModal);

    dom.closeBookingsBtn?.addEventListener("click", closeBookingsModal);
    dom.bookingsModal?.addEventListener("click", (e) => {
      if (e.target === dom.bookingsModal) closeBookingsModal();
    });

    dom.chatOpenBtn?.addEventListener("click", openChatModal);
    dom.chatCloseBtn?.addEventListener("click", closeChatModal);
    dom.chatModal?.addEventListener("click", (e) => {
      if (e.target === dom.chatModal) closeChatModal();
    });
    dom.chatSendBtn?.addEventListener("click", handleChatSend);
    dom.chatTextarea?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleChatSend();
      }
    });

    dom.mobileFavBtn?.addEventListener("click", () => {
      window.location.href = ROUTES.favorites;
    });

    dom.mobileProfileBtn?.addEventListener("click", () => {
      if (!state.user) openAuthModal("login");
      else if (dom.profileDropdown) dom.profileDropdown.classList.toggle("active");
    });

    dom.mobileStaysBtn?.addEventListener("click", () => {
      window.location.href = ROUTES.home;
    });

    dom.homeLogoBtn?.addEventListener("click", (e) => {
      const tag = dom.homeLogoBtn?.tagName?.toLowerCase();
      if (tag !== "a") {
        e.preventDefault();
        window.location.href = ROUTES.home;
      }
    });

    document.addEventListener("click", (event) => {
      if (!dom.profileDropdown || !dom.profileTrigger || !dom.profileContainer) return;
      const insideDropdown = dom.profileDropdown.contains(event.target);
      const insideTrigger = dom.profileTrigger.contains(event.target);
      const insideContainer = dom.profileContainer.contains(event.target);

      if (!insideDropdown && !insideTrigger && !insideContainer) {
        dom.profileDropdown.classList.remove("active");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAuthModal();
        closeBookingsModal();
        closeChatModal();
        dom.profileDropdown?.classList.remove("active");
      }
    });

    dom.scrollTopBtn?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("storage", (e) => {
      if ([STORAGE_KEYS.lang, STORAGE_KEYS.theme, STORAGE_KEYS.favorites].includes(e.key)) {
        if (e.key === STORAGE_KEYS.lang) {
          state.lang = safeGet(STORAGE_KEYS.lang, state.lang);
          applyLanguage();
        }

        if (e.key === STORAGE_KEYS.theme) {
          state.theme = safeGet(STORAGE_KEYS.theme, state.theme);
          applyTheme();
        }

        getFavoriteIds();
        renderListings();
      }
    });
  }

  function bindAuthEvents() {
    const dom = getDom();

    dom.loginForm?.addEventListener("submit", handleLogin);
    dom.registerForm?.addEventListener("submit", handleRegister);
    dom.forgotForm?.addEventListener("submit", handleForgotPassword);
    dom.googleLoginBtn?.addEventListener("click", handleGoogleLogin);

    $("#go-to-register")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm("register");
      showAuthMessage("", "");
    });

    $("#go-to-login")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm("login");
      showAuthMessage("", "");
    });

    $("#go-to-forgot")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm("forgot");
      showAuthMessage("", "");
    });

    $("#back-to-login")?.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthForm("login");
      showAuthMessage("", "");
    });
  }

  function bindFirebaseAuthState() {
    if (!auth) {
      updateUserUI();
      return;
    }

    auth.onAuthStateChanged(async (user) => {
      state.user = user || null;
      getFavoriteIds();
      updateUserUI();
      renderListings();

      if (state.user) {
        await loadUserBookings();
        renderBookingsPreview();

        if (continuePendingBookingAfterAuth()) return;
      } else {
        state.bookings = [];
        renderBookingsPreview();
      }
    });
  }

  /* =========================================
     17) PAGE HELPERS
  ========================================= */
  function handleAuthPageRedirectIfNeeded() {
    if (currentPage() !== ROUTES.auth) return;

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    const hashView = decodeURIComponent((window.location.hash || "").replace(/^#/, "") || "login");

    if (hashView) switchAuthForm(hashView);

    if (!state.user || !redirect) return;

    window.location.href = redirect;
  }

  function exposePublicApi() {
    window.showToast = showToast;
    window.showFavToast = showFavToast;
    window.openModal = openAuthModal;
    window.closeModal = closeAuthModal;
    window.requireAuth = requireAuth;

    window.OreBooking = {
      state,
      t,
      openAuthModal,
      closeAuthModal,
      openPropertyDetails,
      handleReserveNow,
      toggleFavorite,
      rememberSelectedProperty,
      getPropertyById,
      getFavoriteIds
    };
  }

  /* =========================================
     18) INIT
  ========================================= */
  async function init() {
    if (state.initialized) return;
    state.initialized = true;

    updateCurrentViewFromPage();
    initFirebase();
    applyInitialState();
    getFavoriteIds();
    updateUserUI();
    bindGeneralEvents();
    bindAuthEvents();
    bindListingActions();
    bindFirebaseAuthState();
    exposePublicApi();

    const dom = getDom();
    if (dom.listingsGrid) renderLoadingState();

    const loaded = await loadLiveProperties();

    if (!loaded && dom.listingsGrid) {
      showToast(t("property_load_error"), "info");
    }

    syncCategoryButtons();
    renderListings();
    handleAuthPageRedirectIfNeeded();

    if (!auth) {
      renderBookingsPreview();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
