"use strict";

/* =========================================
   OreBooking - script.js
   Shared app script
   - public listings / property helpers
   - protected booking redirect
   - Firebase auth
   - favorites / bookings / chat
   - theme / language sync
   - resilient DOM handling
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

  function safeGetAny(keys, fallback = "") {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const value = safeGet(key, "");
      if (value !== "") return value;
    }
    return fallback;
  }

  function safeJsonGetAny(keys, fallback = null) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const key of list) {
      const value = safeJsonGet(key, null);
      if (value !== null) return value;
    }
    return fallback;
  }

  function safeSetMany(keys, value) {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => safeSet(key, value));
  }

  function safeJsonSetMany(keys, value) {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => safeJsonSet(key, value));
  }

  function safeRemoveMany(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => safeRemove(key));
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
    bookingContext: "booking_context",
    chatGuest: "ore_chat_guest"
  };

  const STORAGE_ALIASES = {
    lang: [STORAGE_KEYS.lang, "orelang"],
    theme: [STORAGE_KEYS.theme, "oretheme"],
    favoritesCommon: [STORAGE_KEYS.favorites, "ore_favorites_common", "orefavorites"],
    selectedPropertyData: [
      STORAGE_KEYS.selectedPropertyData,
      STORAGE_KEYS.oreSelectedProperty,
      STORAGE_KEYS.bookingPropertySnapshot
    ]
  };

  const ROUTES = {
    home: "index.html",
    auth: "auth.html",
    details: safeGet("ore_property_page", "property.html"),
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

  const BOOKINGS_COLLECTION_CANDIDATES = ["bookings", "reservations", "userBookings"];
  const CHAT_REPLY_DELAY = 900;
  const MAX_CHAT_MESSAGE_LENGTH = 1200;

  /* =========================================
     3) STATE
  ========================================= */
  const state = {
    initialized: false,
    lang: safeGetAny(STORAGE_ALIASES.lang, "en") === "ar" ? "ar" : "en",
    theme: safeGetAny(STORAGE_ALIASES.theme, "light") === "dark" ? "dark" : "light",
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
    loadingBookings: false,
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
      logout: "Log Out",
      my_bookings: "My bookings",
      favorites: "Favorites",
      myfavorites: "Favorites",
      mybookings: "My Bookings",
      guest_user: "Guest User",
      guestuser: "Guest User",
      logged_in_as: "Signed in",
      sign_in_to_continue: "Sign in to continue",
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
      loading: "Loading...",
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
      emailaddress: "Email Address",
      password: "Password",
      full_name: "Full Name",
      fullname: "Full Name",
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
      message_required: "Please type a message first.",
      home: "Home",
      pts: "Pts"
    },
    ar: {
      page_title: "OreBooking - إقامات مميزة",
      sign_in: "تسجيل الدخول",
      sign_out: "تسجيل الخروج",
      logout: "تسجيل الخروج",
      my_bookings: "حجوزاتي",
      favorites: "المفضلة",
      myfavorites: "المفضلة",
      mybookings: "حجوزاتي",
      guest_user: "زائر",
      guestuser: "زائر",
      logged_in_as: "تم تسجيل الدخول",
      sign_in_to_continue: "سجّل الدخول للمتابعة",
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
      loading: "جارٍ التحميل...",
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
      emailaddress: "البريد الإلكتروني",
      password: "كلمة المرور",
      full_name: "الاسم الكامل",
      fullname: "الاسم الكامل",
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
      message_required: "اكتب رسالة أولًا.",
      home: "الرئيسية",
      pts: "نقطة"
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
      logout: "sign_out",
      mybookings: "my_bookings",
      myfavorites: "favorites",
      clearsearch: "clear_search",
      searchhint: "search_hint",
      whereplaceholder: "where_placeholder",
      chatplaceholder: "chat_placeholder",
      fullname: "full_name",
      forgotpassword: "forgot_pass",
      rememberme: "remember_me",
      guestuser: "guest_user",
      signintocontinue: "sign_in_to_continue",
      emailaddress: "email",
      reservenow: "reserve_now",
      viewdetails: "view_details"
    };

    if (custom[k]) aliases.add(custom[k]);
    return Array.from(aliases);
  }

  function translateOptional(key) {
    const langDict = translations[state.lang] || translations.en;
    const baseDict = translations.en;
    const keys = keyAliases(key);

    for (const candidate of keys) {
      if (candidate in langDict) return langDict[candidate];
      if (candidate in baseDict) return baseDict[candidate];
    }

    return null;
  }

  function t(key) {
    return translateOptional(key) ?? key;
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
      rating: 5,
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
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const selector of list) {
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

  function isAuthPage() {
    return currentPage().toLowerCase() === ROUTES.auth.toLowerCase() || /auth/i.test(currentPage());
  }

  function detectCurrentView() {
    const page = currentPage().toLowerCase();
    const bodyView = String(document.body?.dataset?.view || "").toLowerCase();

    if (bodyView.includes("favorite") || page.includes("favorite")) return "favorites";
    return "home";
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
      closeAuthBtn: firstExisting(["#close-auth-btn", ".close-modal-btn[data-close-auth]", "#auth-modal .close-modal-btn"]),
      authMessage: firstExisting(["#auth-message", ".auth-message"]),
      loginForm: firstExisting(["#login-form", "form[data-auth-form='login']"]),
      registerForm: firstExisting(["#register-form", "form[data-auth-form='register']"]),
      forgotForm: firstExisting(["#forgot-form", "form[data-auth-form='forgot']"]),
      googleButtons: $all("[data-auth-provider='google'], #google-login-btn, #google-register-btn"),

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
      chatMessages: firstExisting(["#chat-messages", "[data-chat-messages]"]),
      chatEmptyState: firstExisting(["#chat-empty-state", "[data-chat-empty]"]),
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

  function debounce(fn, delay = 220) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function safeCall(fn) {
    try {
      return fn();
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  function getRedirectTargetFromUrl() {
    try {
      const url = new URL(window.location.href);
      const redirect = url.searchParams.get("redirect");
      if (!redirect) return "";

      const decoded = decodeURIComponent(redirect);
      if (!decoded) return "";
      if (/^https?:\/\//i.test(decoded)) return "";
      if (decoded.startsWith("//")) return "";
      return decoded.replace(/^\//, "");
    } catch (_) {
      return "";
    }
  }

  function readHashView() {
    const hash = decodeURIComponent(window.location.hash || "").replace(/^#/, "").trim();
    if (["login", "register", "forgot"].includes(hash)) return hash;
    return "login";
  }

  function localizeUrgency(value) {
    const str = normalizeText(value).toLowerCase();

    if (str === "popular this week") return t("popular_this_week");
    if (str === "great value") return t("great_value");
    if (str === "luxury pick") return t("luxury_pick");
    if (str === "breakfast included") return t("breakfast_included");
    if (str === "weekend favorite") return t("weekend_favorite");
    if (str === "only 2 rooms left") return t("only_rooms_left");

    return value || "";
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
      const bg =
        type === "error" ? "#fef2f2" : type === "info" ? "#eff6ff" : "#ecfdf5";
      const border =
        type === "error"
          ? "rgba(239,68,68,.28)"
          : type === "info"
          ? "rgba(59,130,246,.28)"
          : "rgba(16,185,129,.28)";
      const color =
        type === "error" ? "#b91c1c" : type === "info" ? "#1d4ed8" : "#047857";

      toast.style.cssText = `
        background:${bg};
        border:1px solid ${border};
        color:${color};
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
      "auth/email-already-in-use":
        state.lang === "ar" ? "هذا البريد مستخدم بالفعل." : "This email is already in use.",
      "auth/weak-password":
        state.lang === "ar" ? "كلمة المرور ضعيفة جدًا." : "Password is too weak.",
      "auth/too-many-requests":
        state.lang === "ar"
          ? "عدد المحاولات كبير جدًا. حاول لاحقًا."
          : "Too many attempts. Please try again later.",
      "auth/popup-closed-by-user":
        state.lang === "ar"
          ? "تم إغلاق نافذة تسجيل الدخول."
          : "Popup was closed before completing sign-in.",
      "auth/network-request-failed":
        state.lang === "ar"
          ? "خطأ في الشبكة. تحقق من الاتصال."
          : "Network error. Check your connection."
    };

    return map[code] || (state.lang === "ar" ? "حدث خطأ غير متوقع." : "Something went wrong.");
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

      if (googleProvider?.setCustomParameters) {
        googleProvider.setCustomParameters({ prompt: "select_account" });
      }

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
      updatedAt: p.updatedAt || null,
      raw: p
    };
  }

  function getSourceProperties() {
    if (state.liveProperties.length) return state.liveProperties;
    return fallbackProperties.map((p) => normalizeProperty(p, p.id, "fallback"));
  }

  function getNavigationPropertyId(property) {
    return normalizeText(property?.docId || property?.navId || property?.id || property?.customId || "");
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

    if (raw === "hotel" || raw === "hotels") return /hotel|فندق/.test(haystack);
    if (raw === "apartment" || raw === "apartments") return /apartment|suite|loft|شقة|أجنحة/.test(haystack);
    if (raw === "villa" || raw === "villas") return /villa|فيلا/.test(haystack);

    return haystack.includes(raw);
  }

  function rememberSelectedProperty(property) {
    if (!property) return;

    const navId = getNavigationPropertyId(property);
    const snapshot = { ...property, navId, rememberedAt: new Date().toISOString() };

    safeSet(STORAGE_KEYS.selectedPropertyId, navId);
    safeSet(STORAGE_KEYS.selectedPropertyDocId, normalizeText(property.docId || navId));
    safeJsonSetMany(STORAGE_ALIASES.selectedPropertyData, snapshot);
  }

  function resolveSelectedPropertyIdFromUrlOrStorage() {
    const params = new URLSearchParams(window.location.search);
    return (
      params.get("id") ||
      safeGet(STORAGE_KEYS.selectedPropertyId, "") ||
      safeGet(STORAGE_KEYS.selectedPropertyDocId, "")
    );
  }

  function resolveSelectedProperty() {
    const urlId = resolveSelectedPropertyIdFromUrlOrStorage();
    const directMatch = getPropertyById(urlId);
    if (directMatch) return directMatch;

    const snapshot = safeJsonGetAny(STORAGE_ALIASES.selectedPropertyData, null);
    if (snapshot) return normalizeProperty(snapshot, snapshot.docId || snapshot.id || "", snapshot.collection || "");
    return null;
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
    const common = safeJsonGetAny(STORAGE_ALIASES.favoritesCommon, null);

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
    safeJsonSetMany(STORAGE_ALIASES.favoritesCommon, unique);

    state.favorites = unique;
  }

  function mergeGuestFavoritesIntoUser() {
    if (!state.user?.uid) return;

    const guest = safeJsonGet(STORAGE_KEYS.favoritesGuest, []);
    if (!Array.isArray(guest) || !guest.length) return;

    const existing = getFavoriteIds();
    const merged = [...new Set([...existing, ...guest.map(String)])];
    saveFavoriteIds(merged);
    safeRemove(STORAGE_KEYS.favoritesGuest);
  }

  function isFavorite(propertyId) {
    const id = String(propertyId || "");
    return getFavoriteIds().includes(id);
  }

  function updateFavButtonState() {
    const current = resolveSelectedProperty();
    const currentId = current ? getNavigationPropertyId(current) : "";

    $all("[data-favorite-id], [data-fav-id], #fav-property-btn, .favorite-btn, .fav-btn").forEach((btn) => {
      const targetId =
        btn.dataset.favoriteId ||
        btn.dataset.favId ||
        btn.dataset.id ||
        currentId ||
        "";
      if (!targetId) return;
      btn.classList.toggle("active", isFavorite(targetId));
      btn.setAttribute("aria-pressed", isFavorite(targetId) ? "true" : "false");
    });
  }

  function toggleFavorite(property) {
    if (!property) return;

    const propertyId = getNavigationPropertyId(property);
    const list = getFavoriteIds();
    const exists = list.includes(propertyId);
    const next = exists ? list.filter((x) => x !== propertyId) : [...list, propertyId];

    saveFavoriteIds(next);
    updateFavButtonState();
    renderListings();

    showFavToast(exists ? t("fav_removed") : t("fav_added"));
  }

  /* =========================================
     11) THEME / LANGUAGE
  ========================================= */
  function updateLogo() {
    const mainLogo = firstExisting(["#main-logo", ".logo-img"]);
    const modalLogo = firstExisting(["#modal-logo", ".auth-header img"]);
    const logoPath = state.theme === "dark" ? "logos/orebooking2.png" : "logos/orebooking.png";

    if (mainLogo && !/favicon/i.test(mainLogo.src || "")) mainLogo.src = logoPath;
    if (modalLogo && !/favicon/i.test(modalLogo.src || "")) modalLogo.src = logoPath;
  }

  function updateTextNodes() {
    const dom = getDom();

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const translated = translateOptional(key);
      if (translated !== null) el.textContent = translated;
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      const translated = translateOptional(key);
      if (translated !== null) el.setAttribute("placeholder", translated);
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
    safeSetMany(STORAGE_ALIASES.theme, state.theme);
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
    safeSetMany(STORAGE_ALIASES.lang, state.lang);

    if (auth) {
      try {
        auth.languageCode = state.lang;
      } catch (_) {}
    }

    updateTextNodes();
    updateUserUI();
  }

  function applyInitialState() {
    state.currentView = detectCurrentView();
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
    syncSortOptions();
    renderListings();
    renderBookingsPreview();
    renderChatMessages();
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
      form.classList.toggle("active", key === formType);
      form.style.display = key === formType ? "" : "none";
    });

    showAuthMessage("");
  }

  function openAuthModal(view = "login", message = "") {
    const dom = getDom();

    if (!dom.authModal) {
      window.location.href = getAuthUrl(view);
      return;
    }

    switchAuthForm(view);
    dom.authModal.classList.add("active");
    dom.body?.classList.add("modal-open");
    if (message) showAuthMessage(message, "error");
  }

  function closeAuthModal() {
    const dom = getDom();
    dom.authModal?.classList.remove("active");
    dom.body?.classList.remove("modal-open");
    showAuthMessage("");
  }

  function requireAuth(message = "", view = "login") {
    if (state.user) return true;

    if (isAuthPage()) {
      switchAuthForm(view);
      if (message) showAuthMessage(message, "error");
      return false;
    }

    const dom = getDom();
    if (dom.authModal) {
      openAuthModal(view, message || t("auth_required"));
      return false;
    }

    window.location.href = getAuthUrl(view);
    return false;
  }

  async function setAuthPersistenceFromRemember() {
    if (!auth || !firebase?.auth?.Auth?.Persistence) return;

    const remember = safeGet(STORAGE_KEYS.remember, "1") !== "0";
    const persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    try {
      await auth.setPersistence(persistence);
    } catch (error) {
      console.warn("Auth persistence error:", error);
    }
  }

  async function handlePostAuthSuccess(type = "login") {
    closeAuthModal();
    showAuthMessage("");

    if (type === "register") {
      showToast(t("register_success"), "success");
    } else {
      showToast(t("login_success"), "success");
    }

    if (continuePendingBookingAfterAuth()) return;

    const redirect = getRedirectTargetFromUrl();
    if (redirect && isAuthPage()) {
      window.location.href = redirect;
      return;
    }

    if (isAuthPage()) {
      window.location.href = ROUTES.home;
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    if (!auth) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    const email = normalizeText($("#login-email")?.value);
    const password = normalizeText($("#login-password")?.value);
    const remember = !!($("#remember-me")?.checked || safeGet(STORAGE_KEYS.remember, "1") === "1");

    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    if (!password) {
      showAuthMessage(t("fill_required"), "error");
      return;
    }

    safeSet(STORAGE_KEYS.remember, remember ? "1" : "0");

    try {
      await setAuthPersistenceFromRemember();
      await auth.signInWithEmailAndPassword(email, password);
      await handlePostAuthSuccess("login");
    } catch (error) {
      console.error("Login error:", error);
      showAuthMessage(humanFirebaseError(error?.code), "error");
    }
  }

  async function handleRegisterSubmit(event) {
    event.preventDefault();

    if (!auth) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    const name = normalizeText($("#reg-name")?.value);
    const email = normalizeText($("#reg-email")?.value);
    const password = normalizeText($("#reg-password")?.value);

    if (!name || !validateEmail(email) || !password) {
      showAuthMessage(t("fill_required"), "error");
      return;
    }

    if (password.length < 6) {
      showAuthMessage(humanFirebaseError("auth/weak-password"), "error");
      return;
    }

    try {
      await setAuthPersistenceFromRemember();
      const cred = await auth.createUserWithEmailAndPassword(email, password);

      if (cred?.user && name) {
        try {
          await cred.user.updateProfile({ displayName: name });
        } catch (_) {}
      }

      if (db && cred?.user) {
        try {
          await db.collection("users").doc(cred.user.uid).set(
            {
              uid: cred.user.uid,
              name,
              email,
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
            },
            { merge: true }
          );
        } catch (_) {}
      }

      await handlePostAuthSuccess("register");
    } catch (error) {
      console.error("Register error:", error);
      showAuthMessage(humanFirebaseError(error?.code), "error");
    }
  }

  async function handleForgotSubmit(event) {
    event.preventDefault();

    if (!auth) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    const email = normalizeText($("#forgot-email")?.value);
    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    try {
      await auth.sendPasswordResetEmail(email);
      showAuthMessage(t("reset_sent"), "success");
    } catch (error) {
      console.error("Reset error:", error);
      showAuthMessage(humanFirebaseError(error?.code), "error");
    }
  }

  async function handleGoogleAuth(event) {
    if (event) event.preventDefault();

    if (!auth || !googleProvider) {
      showAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    try {
      await setAuthPersistenceFromRemember();
      await auth.signInWithPopup(googleProvider);
      await handlePostAuthSuccess("login");
    } catch (error) {
      console.error("Google auth error:", error);
      showAuthMessage(humanFirebaseError(error?.code), "error");
    }
  }

  async function handleLogout() {
    if (!auth) {
      state.user = null;
      updateUserUI();
      showToast(t("logout_success"), "success");
      return;
    }

    try {
      await auth.signOut();
      state.user = null;
      updateUserUI();
      renderBookingsPreview();
      renderChatMessages();
      renderListings();
      showToast(t("logout_success"), "success");
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  function closeProfileDropdown() {
    const dom = getDom();
    if (!dom.profileDropdown) return;
    dom.profileDropdown.classList.remove("active");
    dom.profileTrigger?.setAttribute("aria-expanded", "false");
  }

  function toggleProfileDropdown() {
    const dom = getDom();
    if (!dom.profileDropdown) return;

    const active = dom.profileDropdown.classList.toggle("active");
    dom.profileTrigger?.setAttribute("aria-expanded", active ? "true" : "false");
  }

  function updateUserUI() {
    const dom = getDom();
    const user = state.user;

    const name =
      normalizeText(user?.displayName) ||
      normalizeText(user?.email?.split("@")[0]) ||
      t("guest_user");

    if (dom.profileName) {
      dom.profileName.textContent = user ? name : t("guest_user");
    }

    if (dom.profileEmail) {
      dom.profileEmail.textContent = user ? user.email || "" : t("sign_in_to_continue");
    }

    if (dom.logoutBtn) {
      dom.logoutBtn.style.display = user ? "" : "none";
    }

    if (dom.profileTrigger) {
      dom.profileTrigger.setAttribute(
        "aria-label",
        user ? `${t("logged_in_as")}: ${name}` : t("sign_in")
      );
      dom.profileTrigger.setAttribute("title", user ? name : t("sign_in"));
    }

    if (dom.authCta && dom.authCta !== dom.profileTrigger) {
      dom.authCta.textContent = user ? t("sign_out") : t("sign_in");
    }

    updateFavButtonState();
  }

  function attachAuthStateListener() {
    if (!auth) return;

    auth.onAuthStateChanged(async (user) => {
      state.user = user || null;
      updateUserUI();

      if (state.user) {
        mergeGuestFavoritesIntoUser();
        getFavoriteIds();
        await loadUserBookings();
      } else {
        state.bookings = [];
        getFavoriteIds();
      }

      renderBookingsPreview();
      renderChatMessages();
      renderListings();
    });
  }

  /* =========================================
     13) LISTINGS
  ========================================= */
  function syncCategoryButtons() {
    const dom = getDom();
    dom.categoryButtons.forEach((btn) => {
      const cat = String(btn.dataset.category || btn.dataset.categoryBtn || "").toLowerCase();
      const normalized = cat === "hotels" ? "hotel" : cat === "apartments" ? "apartment" : cat === "villas" ? "villa" : cat;
      btn.classList.toggle("active", normalized === state.activeCategory);
    });
  }

  function syncSortOptions() {
    const dom = getDom();
    if (dom.sortSelect) dom.sortSelect.value = state.sort;
  }

  function getFilteredProperties() {
    const search = normalizeText(state.activeSearch).toLowerCase();
    let list = getSourceProperties().slice();

    if (state.currentView === "favorites") {
      const favs = new Set(getFavoriteIds().map(String));
      list = list.filter((property) => favs.has(getNavigationPropertyId(property)));
    }

    list = list.filter((property) => propertyMatchesCategory(property, state.activeCategory));

    if (search) {
      list = list.filter((property) => {
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

        return haystack.includes(search);
      });
    }

    if (state.sort === "rating") {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (state.sort === "price_low") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (state.sort === "price_high") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    return list;
  }

  function renderLoadingListings() {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    dom.listingsGrid.innerHTML = Array.from({ length: 6 })
      .map(() => `<div class="card-skeleton" aria-hidden="true"></div>`)
      .join("");
  }

  function renderListingsEmpty(isFavoritesView = false) {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    const title = isFavoritesView ? t("favorites") : t("no_results_title");
    const text = isFavoritesView
      ? state.lang === "ar"
        ? "لم تقم بإضافة أي عقار إلى المفضلة بعد."
        : "You have not added any property to favorites yet."
      : state.activeSearch || state.activeCategory !== "all"
      ? t("no_results_text")
      : t("no_props");

    dom.listingsGrid.innerHTML = `
      <div class="listings-empty-state">
        <i class="ph ph-house-line"></i>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
  }

  function renderPropertyCard(property) {
    const propertyId = getNavigationPropertyId(property);
    const favorite = isFavorite(propertyId);
    const title = getPropertyTitle(property);
    const location = getPropertyLocation(property);
    const urgency = localizeUrgency(property.urgency);
    const reserveLabel = state.user ? t("reserve_now") : t("reserve_cta_signed_out");

    return `
      <article class="property-card" data-property-id="${escapeHtml(propertyId)}">
        <div class="property-card-media">
          <img src="${escapeHtml(property.image)}" alt="${escapeHtml(title)}" loading="lazy" />
          ${
            urgency
              ? `<span class="property-urgency"><i class="ph ph-clock-countdown"></i>${escapeHtml(urgency)}</span>`
              : ""
          }
          <button
            type="button"
            class="favorite-btn ${favorite ? "active" : ""}"
            data-action="favorite"
            data-id="${escapeHtml(propertyId)}"
            aria-label="${escapeHtml(t("favorites"))}"
            aria-pressed="${favorite ? "true" : "false"}"
          >
            <i class="ph ph-heart${favorite ? "-straight-fill" : ""}"></i>
          </button>
        </div>

        <div class="property-card-body">
          <div class="property-card-top">
            <div class="card-title-wrapper">
              <h3 class="property-card-title">${escapeHtml(title)}</h3>
              <div class="property-card-location">
                <i class="ph ph-map-pin"></i>
                <span>${escapeHtml(location || "—")}</span>
              </div>
            </div>

            <div class="property-card-rating">
              <i class="ph ph-star-fill"></i>
              <span>${Number(property.rating || 0).toFixed(1)}</span>
            </div>
          </div>

          <div class="property-card-price">
            ${escapeHtml(formatCurrency(property.price))}
            <span>${escapeHtml(t("night_suffix"))}</span>
          </div>

          <div class="property-card-actions">
            <button type="button" class="details-btn" data-action="details" data-id="${escapeHtml(propertyId)}">
              <i class="ph ph-eye"></i>
              <span>${escapeHtml(t("view_details"))}</span>
            </button>

            <button type="button" class="reserve-btn" data-action="reserve" data-id="${escapeHtml(propertyId)}">
              <i class="ph ph-calendar-plus"></i>
              <span>${escapeHtml(reserveLabel)}</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderListings() {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    if (state.loadingProperties && !state.propertiesLoaded && !state.liveProperties.length) {
      renderLoadingListings();
      return;
    }

    const list = getFilteredProperties();
    const isFavoritesView = state.currentView === "favorites";

    if (dom.clearSearchBtn) {
      const active = !!state.activeSearch || state.activeCategory !== "all";
      dom.clearSearchBtn.style.display = active ? "inline-flex" : "none";
    }

    if (dom.sectionTitle) {
      dom.sectionTitle.textContent = isFavoritesView ? t("favorites") : t("featured_title");
    }

    if (!list.length) {
      renderListingsEmpty(isFavoritesView);
      return;
    }

    dom.listingsGrid.innerHTML = list.map(renderPropertyCard).join("");
    updateFavButtonState();
  }

  async function initialLoadProperties() {
    if (db) {
      const success = await loadLiveProperties();
      if (!success && firebaseReady) {
        showToast(t("property_load_error"), "info");
      }
    }
    renderListings();
  }

  /* =========================================
     14) BOOKINGS
  ========================================= */
  function normalizeBooking(data = {}, id = "") {
    const propertyId = normalizeText(
      data.propertyId || data.propertyDocId || data.selectedPropertyId || data.listingId || ""
    );
    const property =
      getPropertyById(propertyId) ||
      normalizeBooking.snapshotToProperty(data.propertySnapshot || data.property || null);

    const propertyTitle = property
      ? getPropertyTitle(property)
      : data.propertyTitle ||
        data.title ||
        (state.lang === "ar" ? "عقار غير معروف" : "Unknown Property");

    const status = String(data.status || data.bookingStatus || "pending").toLowerCase();

    return {
      id: normalizeText(id || data.id || `booking-${Date.now()}`),
      propertyId,
      propertyTitle,
      propertyLocation: property ? getPropertyLocation(property) : normalizeText(data.location || ""),
      propertyImage: property?.image || data.image || "images/placeholder.jpg",
      checkIn: data.checkIn || data.checkin || data.arrivalDate || data.startDate || "",
      checkOut: data.checkOut || data.checkout || data.departureDate || data.endDate || "",
      guests: Number(data.guests || data.totalGuests || data.adults || 1),
      total: Number(data.total || data.totalAmount || data.amount || data.finalTotal || 0),
      status,
      createdAt: data.createdAt || data.timestamp || null
    };
  }

  normalizeBooking.snapshotToProperty = function (snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null;
    return normalizeProperty(snapshot, snapshot.docId || snapshot.id || "", snapshot.collection || "");
  };

  async function loadUserBookings() {
    if (!db || !state.user?.uid) {
      state.bookings = [];
      return [];
    }

    state.loadingBookings = true;
    renderBookingsPreview();

    try {
      for (const collection of BOOKINGS_COLLECTION_CANDIDATES) {
        try {
          const snap = await db.collection(collection).where("userId", "==", state.user.uid).limit(50).get();

          if (!snap.empty) {
            const items = [];
            snap.forEach((doc) => items.push(normalizeBooking(doc.data() || {}, doc.id)));

            items.sort((a, b) => {
              const ad = typeof a.createdAt?.toDate === "function" ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
              const bd = typeof b.createdAt?.toDate === "function" ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
              return bd - ad;
            });

            state.bookings = items;
            state.loadingBookings = false;
            return items;
          }
        } catch (err) {
          console.warn(`Bookings collection "${collection}" failed`, err);
        }
      }

      state.bookings = [];
      state.loadingBookings = false;
      return [];
    } catch (error) {
      console.error("Bookings load error:", error);
      state.bookings = [];
      state.loadingBookings = false;
      return [];
    }
  }

  function getBookingStatusLabel(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "confirmed") return t("booking_status_confirmed");
    if (normalized === "cancelled") return t("booking_status_cancelled");
    if (normalized === "rejected") return t("booking_status_rejected");
    return t("booking_status_pending");
  }

  function renderBookingsPreview() {
    const dom = getDom();
    if (!dom.bookingsList) return;

    if (!state.user) {
      dom.bookingsList.innerHTML = `
        <div class="listings-empty-state">
          <i class="ph ph-lock"></i>
          <p>${escapeHtml(t("auth_required"))}</p>
        </div>
      `;
      return;
    }

    if (state.loadingBookings) {
      dom.bookingsList.innerHTML = `
        <div class="listings-empty-state">
          <i class="ph ph-spinner-gap spin"></i>
          <p>${escapeHtml(t("loading_bookings"))}</p>
        </div>
      `;
      return;
    }

    if (!state.bookings.length) {
      dom.bookingsList.innerHTML = `
        <div class="listings-empty-state">
          <i class="ph ph-calendar-blank"></i>
          <p>${escapeHtml(t("no_bookings"))}</p>
        </div>
      `;
      return;
    }

    dom.bookingsList.innerHTML = state.bookings
      .map((booking) => {
        return `
          <article class="booking-card">
            <div class="booking-card-head">
              <div>
                <h4>${escapeHtml(booking.propertyTitle)}</h4>
                <p class="booking-card-sub">${escapeHtml(booking.propertyLocation || "—")}</p>
              </div>
              <span class="booking-status ${escapeHtml(booking.status)}">
                <i class="ph ph-dot-outline-fill"></i>
                ${escapeHtml(getBookingStatusLabel(booking.status))}
              </span>
            </div>

            <div class="booking-card-grid">
              <div><strong>${escapeHtml(t("booking_checkin"))}</strong> ${escapeHtml(formatDate(booking.checkIn))}</div>
              <div><strong>${escapeHtml(t("booking_checkout"))}</strong> ${escapeHtml(formatDate(booking.checkOut))}</div>
              <div><strong>${escapeHtml(t("booking_guests"))}</strong> ${escapeHtml(String(booking.guests || 1))}</div>
              <div><strong>${escapeHtml(t("booking_total"))}</strong> ${escapeHtml(formatCurrency(booking.total))}</div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function openBookings() {
    const dom = getDom();
    if (!state.user) {
      requireAuth(t("auth_redirect_profile"), "login");
      return;
    }

    if (dom.bookingsModal) {
      dom.bookingsModal.classList.add("active");
      dom.body?.classList.add("modal-open");
      renderBookingsPreview();
      return;
    }

    if (currentPage().toLowerCase() !== ROUTES.bookings.toLowerCase()) {
      window.location.href = ROUTES.bookings;
    }
  }

  function closeBookings() {
    const dom = getDom();
    dom.bookingsModal?.classList.remove("active");
    dom.body?.classList.remove("modal-open");
  }

  /* =========================================
     15) CHAT
  ========================================= */
  function getChatStorageKey() {
    return state.user?.uid ? `ore_chat_${state.user.uid}` : STORAGE_KEYS.chatGuest;
  }

  function loadChatMessages() {
    state.chatMessages = safeJsonGet(getChatStorageKey(), []);
    if (!Array.isArray(state.chatMessages)) state.chatMessages = [];
    return state.chatMessages;
  }

  function saveChatMessages() {
    safeJsonSet(getChatStorageKey(), state.chatMessages);
  }

  function appendChatMessage(message) {
    state.chatMessages.push(message);
    saveChatMessages();
    renderChatMessages();
  }

  function renderChatMessages() {
    const dom = getDom();
    if (!dom.chatMessages) return;

    loadChatMessages();

    if (!state.chatMessages.length) {
      dom.chatMessages.innerHTML = "";
      if (dom.chatEmptyState) dom.chatEmptyState.style.display = "";
      return;
    }

    if (dom.chatEmptyState) dom.chatEmptyState.style.display = "none";

    dom.chatMessages.innerHTML = state.chatMessages
      .map((msg) => {
        const role = msg.role === "admin" ? "admin" : "customer";
        return `
          <div class="chat-message ${role}">
            <div>${escapeHtml(msg.text || "")}</div>
            <small class="chat-meta">${escapeHtml(formatDate(msg.createdAt))}</small>
          </div>
        `;
      })
      .join("");

    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  function openChat() {
    const dom = getDom();
    if (!dom.chatModal) return;

    const selectedProperty = resolveSelectedProperty();
    if (dom.chatPropertyId && selectedProperty) {
      dom.chatPropertyId.value = getNavigationPropertyId(selectedProperty);
    }

    dom.chatModal.classList.add("active");
    dom.body?.classList.add("modal-open");
    renderChatMessages();
    dom.chatTextarea?.focus();
  }

  function closeChat() {
    const dom = getDom();
    dom.chatModal?.classList.remove("active");
    dom.body?.classList.remove("modal-open");
  }

  function sendChatMessage() {
    const dom = getDom();
    const text = normalizeText(dom.chatTextarea?.value);

    if (!text) {
      showToast(t("message_required"), "error");
      return;
    }

    if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
      showToast(
        state.lang === "ar"
          ? "الرسالة طويلة جدًا."
          : "Message is too long.",
        "error"
      );
      return;
    }

    appendChatMessage({
      id: `msg_${Date.now()}`,
      role: "customer",
      text,
      propertyId: normalizeText(dom.chatPropertyId?.value),
      createdAt: new Date().toISOString()
    });

    if (dom.chatTextarea) dom.chatTextarea.value = "";
    showToast(t("support_toast"), "success");

    setTimeout(() => {
      appendChatMessage({
        id: `msg_${Date.now()}_reply`,
        role: "admin",
        text:
          state.lang === "ar"
            ? "تم استلام رسالتك، وسيقوم فريقنا بالرد عليك قريبًا."
            : "We received your message and our team will reply shortly.",
        createdAt: new Date().toISOString()
      });
    }, CHAT_REPLY_DELAY);
  }

  /* =========================================
     16) SEARCH / VIEW ACTIONS
  ========================================= */
  function setHomeView() {
    state.currentView = "home";
    renderListings();
    syncMobileButtons();
  }

  function setFavoritesViewOrRoute() {
    if (getDom().listingsGrid) {
      state.currentView = "favorites";
      renderListings();
      syncMobileButtons();
    } else if (currentPage().toLowerCase() !== ROUTES.favorites.toLowerCase()) {
      window.location.href = ROUTES.favorites;
    }
  }

  function syncMobileButtons() {
    const dom = getDom();
    dom.mobileFavBtn?.classList.toggle("active", state.currentView === "favorites");
    dom.mobileStaysBtn?.classList.toggle("active", state.currentView !== "favorites");
    dom.mobileProfileBtn?.classList.toggle("active", false);
  }

  function applySearchFromDom() {
    const dom = getDom();
    state.activeSearch = normalizeText(dom.destinationInput?.value || "");
    renderListings();
  }

  function clearSearchAndFilters() {
    const dom = getDom();
    state.activeSearch = "";
    state.activeCategory = "all";
    state.sort = "featured";

    if (dom.destinationInput) dom.destinationInput.value = "";
    if (dom.sortSelect) dom.sortSelect.value = state.sort;

    syncCategoryButtons();
    renderListings();
  }

  function hydrateStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const destination = params.get("destination") || params.get("q") || "";
    const category = params.get("category") || "";
    const sort = params.get("sort") || "";

    if (destination) state.activeSearch = destination.trim();
    if (category) {
      const normalized =
        category === "hotels" ? "hotel" : category === "apartments" ? "apartment" : category === "villas" ? "villa" : category;
      state.activeCategory = normalized.toLowerCase();
    }
    if (["featured", "rating", "price_low", "price_high"].includes(sort)) {
      state.sort = sort;
    }

    const dom = getDom();
    if (dom.destinationInput && state.activeSearch) dom.destinationInput.value = state.activeSearch;
    if (dom.sortSelect) dom.sortSelect.value = state.sort;
  }

  /* =========================================
     17) EVENTS
  ========================================= */
  function bindGlobalButtons() {
    const dom = getDom();

    dom.themeBtn?.addEventListener("click", toggleTheme);
    dom.langBtn?.addEventListener("click", toggleLanguage);

    dom.homeLogoBtn?.addEventListener("click", () => {
      closeProfileDropdown();
    });

    dom.scrollTopBtn?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => {
      if (!dom.scrollTopBtn) return;
      dom.scrollTopBtn.classList.toggle("visible", window.scrollY > 320);
    });

    dom.mobileStaysBtn?.addEventListener("click", () => {
      if (getDom().listingsGrid) {
        setHomeView();
      } else {
        window.location.href = ROUTES.home;
      }
    });

    dom.mobileFavBtn?.addEventListener("click", () => {
      setFavoritesViewOrRoute();
    });

    dom.mobileProfileBtn?.addEventListener("click", () => {
      if (state.user) {
        closeProfileDropdown();
        openBookings();
      } else {
        requireAuth(t("auth_redirect_profile"), "login");
      }
    });
  }

  function bindAuthUI() {
    const dom = getDom();

    dom.authCta?.addEventListener("click", (event) => {
      if (dom.authCta !== dom.profileTrigger && !state.user) {
        event.preventDefault();
        openAuthModal("login");
      }
    });

    dom.profileTrigger?.addEventListener("click", (event) => {
      event.preventDefault();
      if (!state.user) {
        openAuthModal("login");
        return;
      }
      toggleProfileDropdown();
    });

    dom.closeAuthBtn?.addEventListener("click", closeAuthModal);
    dom.logoutBtn?.addEventListener("click", async (event) => {
      event.preventDefault();
      closeProfileDropdown();
      await handleLogout();
    });

    $("#go-to-register")?.addEventListener("click", (event) => {
      event.preventDefault();
      switchAuthForm("register");
    });

    $("#go-to-login")?.addEventListener("click", (event) => {
      event.preventDefault();
      switchAuthForm("login");
    });

    $("#go-to-forgot")?.addEventListener("click", (event) => {
      event.preventDefault();
      switchAuthForm("forgot");
    });

    $("#back-to-login")?.addEventListener("click", (event) => {
      event.preventDefault();
      switchAuthForm("login");
    });

    dom.googleButtons.forEach((btn) => btn.addEventListener("click", handleGoogleAuth));
    dom.loginForm?.addEventListener("submit", handleLoginSubmit);
    dom.registerForm?.addEventListener("submit", handleRegisterSubmit);
    dom.forgotForm?.addEventListener("submit", handleForgotSubmit);

    $("#remember-me")?.addEventListener("change", (event) => {
      safeSet(STORAGE_KEYS.remember, event.target.checked ? "1" : "0");
    });

    const remember = safeGet(STORAGE_KEYS.remember, "1") !== "0";
    if ($("#remember-me")) $("#remember-me").checked = remember;
  }

  function bindSearchAndFilters() {
    const dom = getDom();

    dom.searchBtn?.addEventListener("click", applySearchFromDom);
    dom.destinationInput?.addEventListener("input", debounce(applySearchFromDom, 180));
    dom.destinationInput?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        applySearchFromDom();
      }
    });

    dom.clearSearchBtn?.addEventListener("click", clearSearchAndFilters);

    dom.sortSelect?.addEventListener("change", (event) => {
      const value = String(event.target.value || "featured");
      if (["featured", "rating", "price_low", "price_high"].includes(value)) {
        state.sort = value;
        renderListings();
      }
    });

    dom.categoryButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const raw = String(btn.dataset.category || btn.dataset.categoryBtn || "all").toLowerCase();
        const normalized =
          raw === "hotels" ? "hotel" : raw === "apartments" ? "apartment" : raw === "villas" ? "villa" : raw;
        state.activeCategory = normalized || "all";
        syncCategoryButtons();
        renderListings();
      });
    });
  }

  function bindListingsDelegation() {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    dom.listingsGrid.addEventListener("click", (event) => {
      const actionBtn = event.target.closest("[data-action]");
      if (!actionBtn) return;

      const action = actionBtn.dataset.action;
      const id = actionBtn.dataset.id;
      const property = getPropertyById(id);
      if (!property) return;

      if (action === "favorite") {
        event.preventDefault();
        toggleFavorite(property);
      } else if (action === "details") {
        event.preventDefault();
        openPropertyDetails(property);
      } else if (action === "reserve") {
        event.preventDefault();
        handleReserveNow(property);
      }
    });
  }

  function bindBookingsUI() {
    const dom = getDom();
    dom.myBookingsBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      closeProfileDropdown();
      openBookings();
    });

    dom.closeBookingsBtn?.addEventListener("click", closeBookings);
  }

  function bindFavoritesUI() {
    const dom = getDom();

    dom.myFavoritesBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      closeProfileDropdown();
      setFavoritesViewOrRoute();
    });

    document.addEventListener("click", (event) => {
      const btn = event.target.closest("#fav-property-btn, [data-favorite-id], [data-fav-id]");
      if (!btn) return;

      const current = resolveSelectedProperty();
      const id = btn.dataset.favoriteId || btn.dataset.favId || btn.dataset.id || getNavigationPropertyId(current);
      const property = getPropertyById(id) || current;
      if (!property) return;

      event.preventDefault();
      toggleFavorite(property);
    });

    document.addEventListener("click", (event) => {
      const reserveBtn = event.target.closest("#reserve-now-btn, [data-reserve-current]");
      if (!reserveBtn) return;
      const property = resolveSelectedProperty();
      if (!property) return;
      event.preventDefault();
      handleReserveNow(property);
    });
  }

  function bindChatUI() {
    const dom = getDom();

    dom.chatOpenBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      openChat();
    });

    dom.chatCloseBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      closeChat();
    });

    dom.chatSendBtn?.addEventListener("click", (event) => {
      event.preventDefault();
      sendChatMessage();
    });

    dom.chatTextarea?.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendChatMessage();
      }
    });
  }

  function bindOverlaysAndOutsideClicks() {
    document.addEventListener("click", (event) => {
      const dom = getDom();

      if (
        dom.profileDropdown &&
        dom.profileDropdown.classList.contains("active") &&
        !event.target.closest(".profile-container")
      ) {
        closeProfileDropdown();
      }

      if (dom.authModal && event.target === dom.authModal) {
        closeAuthModal();
      }

      if (dom.bookingsModal && event.target === dom.bookingsModal) {
        closeBookings();
      }

      if (dom.chatModal && event.target === dom.chatModal) {
        closeChat();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      closeProfileDropdown();
      closeAuthModal();
      closeBookings();
      closeChat();
    });
  }

  /* =========================================
     18) INIT
  ========================================= */
  async function init() {
    if (state.initialized) return;
    state.initialized = true;

    initFirebase();
    applyInitialState();
    hydrateStateFromUrl();

    bindGlobalButtons();
    bindAuthUI();
    bindSearchAndFilters();
    bindListingsDelegation();
    bindBookingsUI();
    bindFavoritesUI();
    bindChatUI();
    bindOverlaysAndOutsideClicks();

    if (auth) {
      await setAuthPersistenceFromRemember();
      attachAuthStateListener();
    } else {
      getFavoriteIds();
      updateUserUI();
      renderBookingsPreview();
      renderChatMessages();
      renderListings();
    }

    renderChatMessages();
    syncCategoryButtons();
    syncSortOptions();
    syncMobileButtons();
    updateFavButtonState();

    await initialLoadProperties();

    if (isAuthPage()) {
      switchAuthForm(readHashView());
    }
  }

  /* =========================================
     19) PUBLIC API
  ========================================= */
  window.updateFavButtonState = updateFavButtonState;
  window.OreBookingApp = {
    state,
    t,
    authReady: () => !!auth,
    dbReady: () => !!db,
    getPropertyById,
    getSourceProperties,
    resolveSelectedProperty,
    rememberSelectedProperty,
    openPropertyDetails,
    handleReserveNow,
    toggleFavorite,
    isFavorite,
    buildDetailsUrl,
    buildBookingUrl,
    requireAuth,
    renderListings,
    renderBookingsPreview,
    openBookings,
    openChat,
    formatCurrency,
    formatDate
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
