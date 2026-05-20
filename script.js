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
    chatGuest: "ore_chat_guest",
    chatUserPrefix: "ore_chat_user_",
    unreadGuest: "ore_chat_unread_guest",
    unreadUserPrefix: "ore_chat_unread_user_"
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
    home: safeGet("ore_home_page", "index.html"),
    auth: safeGet("ore_auth_page", "auth.html"),
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
  const PROPERTY_COLLECTION_CANDIDATES = ["properties", "listings", "propertyListings", "stays", "hotels"];
  const SUPPORT_COLLECTION_CANDIDATES = ["supportMessages", "supportInbox", "conversations"];
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
    propertyCollectionCandidates: [...PROPERTY_COLLECTION_CANDIDATES],
    authReady: false,
    firestoreReady: false,
    loadingBookings: false,
    bookings: [],
    chatMessages: [],
    favorites: [],
    selectedProperty: null,
    galleryImages: [],
    galleryIndex: 0,
    propertyMapInstance: null,
    currentChatPropertyId: "",
    profileDropdownOpen: false
  };

  let firebaseReady = false;
  let auth = null;
  let db = null;
  let googleProvider = null;
  let authObserverAttached = false;
  let autoReplyTimer = null;

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
      message_too_long: "Message is too long.",
      home: "Home",
      pts: "Pts",
      supportchat: "Support Chat",
      backhome: "Back to Home",
      aboutprop: "About this space",
      whatoffers: "What this place offers",
      booknow: "Reserve Now",
      wontcharged: "You won't be charged yet",
      welcomeback: "Welcome back",
      logindesc: "Enter your details to access your account.",
      noaccount: "Don't have an account?",
      signup: "Sign up",
      createaccount: "Create an account",
      registerdesc: "Join OreBooking to unlock premium features.",
      signupbtn: "Create Account",
      hasaccount: "Already have an account?",
      resetpasstitle: "Reset Password",
      resetpassdesc: "Enter your email and we'll send you a reset link.",
      backtologin: "Back to login",
      support_chat: "Support Chat",
      contact_host: "Contact Host",
      message_host: "Message Host",
      ask_about_property: "Ask about this property",
      verified_host: "Verified Host",
      hosting_since: "Hosting since 2024",
      share: "Share",
      save: "Save",
      saved: "Saved",
      why_guests_like_it: "Why guests like it",
      where_youll_be: "Where you'll be",
      open_google_maps: "Open in Google Maps",
      good_to_know: "Good to know",
      trusted_listing: "Trusted listing",
      responsive_support: "Responsive support",
      clean_and_comfortable: "Clean and comfortable",
      great_location: "Great location",
      trusted_listing_desc: "Managed with verified details and a consistent booking flow.",
      responsive_support_desc: "Fast communication before and during your stay.",
      clean_and_comfortable_desc: "Prepared for a smooth and pleasant stay.",
      great_location_desc: "Close to main points of interest and easy to reach.",
      free_cancellation_24h: "Free cancellation within 24h",
      instant_confirmation: "Instant confirmation",
      support_247: "24/7 support",
      choose_dates_next_page:
        "Choose your dates and number of guests on the next page to see the final price.",
      trust_note:
        "Your request stays secure and you can review full booking details before payment is finalized.",
      instant_booking_request: "Instant booking request",
      verified_listing: "Verified listing",
      up_to_guests: "Up to {n} guests",
      bedrooms_count_one: "{n} Bedroom",
      bedrooms_count_many: "{n} Bedrooms",
      capacity_label: "Capacity: {n} guests",
      type_label: "Type: {type}",
      premium_stay: "Premium stay",
      hotel: "Hotel",
      apartment: "Apartment",
      villa: "Villa",
      resort: "Resort",
      cabin: "Cabin",
      unknown_location: "Unknown location",
      unnamed_property: "Unnamed property",
      no_description: "No description available.",
      wifi: "Wi‑Fi",
      pool: "Pool",
      parking: "Parking",
      gym: "Gym",
      restaurant: "Restaurant",
      spa: "Spa",
      kitchen: "Kitchen",
      ac: "Air conditioning",
      balcony: "Balcony",
      breakfast: "Breakfast",
      security: "Security",
      tv: "TV",
      beach: "Beach access",
      save_property: "Save property",
      property_link_copied: "Link copied to clipboard!",
      copy_failed: "Could not copy link.",
      property_not_found: "Property not found.",
      no_property_id: "No property ID found.",
      loading_property: "Loading property...",
      you: "You",
      support_agent: "Support",
      no_messages_yet: "No messages yet.",
      start_chat_hint: "Start the conversation and mention this property to contact support.",
      chat_ready_note: "This chat works now and can also be connected to Firestore later.",
      quick_auto_reply:
        "Thanks for your message. We received your request and will get back to you shortly.",
      details: "Details",
      choose_dates: "Choose dates",
      date_not_available: "—",
      sign_in_google_failed: "Google sign-in could not be completed.",
      account: "Account",
      stays: "Stays"
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
      message_too_long: "الرسالة طويلة جدًا.",
      home: "الرئيسية",
      pts: "نقطة",
      supportchat: "دردشة الدعم",
      backhome: "العودة للرئيسية",
      aboutprop: "حول هذا المكان",
      whatoffers: "ماذا يوفر هذا المكان",
      booknow: "احجز الآن",
      wontcharged: "لن يتم خصم أي مبلغ الآن",
      welcomeback: "مرحبًا بعودتك",
      logindesc: "أدخل بياناتك للوصول إلى حسابك.",
      noaccount: "ليس لديك حساب؟",
      signup: "إنشاء حساب",
      createaccount: "إنشاء حساب",
      registerdesc: "انضم إلى OreBooking للوصول إلى ميزات إضافية.",
      signupbtn: "إنشاء الحساب",
      hasaccount: "لديك حساب بالفعل؟",
      resetpasstitle: "استعادة كلمة المرور",
      resetpassdesc: "أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة.",
      backtologin: "العودة لتسجيل الدخول",
      support_chat: "دردشة الدعم",
      contact_host: "تواصل مع المضيف",
      message_host: "مراسلة المضيف",
      ask_about_property: "اسأل عن هذا العقار",
      verified_host: "مضيف موثّق",
      hosting_since: "يستضيف منذ 2024",
      share: "مشاركة",
      save: "حفظ",
      saved: "تم الحفظ",
      why_guests_like_it: "لماذا يحب الضيوف هذا المكان",
      where_youll_be: "مكان الإقامة",
      open_google_maps: "فتح في خرائط Google",
      good_to_know: "معلومات مهمة",
      trusted_listing: "إعلان موثوق",
      responsive_support: "دعم سريع",
      clean_and_comfortable: "نظيف ومريح",
      great_location: "موقع ممتاز",
      trusted_listing_desc: "تتم إدارة هذا العقار ببيانات موثقة وتجربة حجز مستقرة.",
      responsive_support_desc: "تواصل سريع قبل الإقامة وأثناءها.",
      clean_and_comfortable_desc: "تم تجهيز المكان لإقامة مريحة وسلسة.",
      great_location_desc: "قريب من أهم الأماكن ويسهل الوصول إليه.",
      free_cancellation_24h: "إلغاء مجاني خلال 24 ساعة",
      instant_confirmation: "تأكيد أولي سريع",
      support_247: "دعم على مدار الساعة",
      choose_dates_next_page:
        "اختر التواريخ وعدد الضيوف في الصفحة التالية لرؤية السعر النهائي.",
      trust_note:
        "يبقى طلبك آمنًا ويمكنك مراجعة تفاصيل الحجز كاملة قبل تثبيت الدفع.",
      instant_booking_request: "طلب حجز فوري",
      verified_listing: "إعلان موثّق",
      up_to_guests: "حتى {n} ضيوف",
      bedrooms_count_one: "{n} غرفة نوم",
      bedrooms_count_many: "{n} غرف نوم",
      capacity_label: "السعة: {n} ضيوف",
      type_label: "النوع: {type}",
      premium_stay: "إقامة مميزة",
      hotel: "فندق",
      apartment: "شقة",
      villa: "فيلا",
      resort: "منتجع",
      cabin: "كوخ",
      unknown_location: "موقع غير معروف",
      unnamed_property: "عقار بدون اسم",
      no_description: "لا يوجد وصف متاح.",
      wifi: "واي فاي",
      pool: "مسبح",
      parking: "موقف سيارات",
      gym: "قاعة رياضية",
      restaurant: "مطعم",
      spa: "سبا",
      kitchen: "مطبخ",
      ac: "تكييف",
      balcony: "شرفة",
      breakfast: "إفطار",
      security: "حماية",
      tv: "تلفاز",
      beach: "وصول للشاطئ",
      save_property: "حفظ العقار",
      property_link_copied: "تم نسخ الرابط.",
      copy_failed: "تعذر نسخ الرابط.",
      property_not_found: "العقار غير موجود.",
      no_property_id: "لم يتم العثور على معرف العقار.",
      loading_property: "جارٍ تحميل العقار...",
      you: "أنت",
      support_agent: "الدعم",
      no_messages_yet: "لا توجد رسائل بعد.",
      start_chat_hint: "ابدأ المحادثة واذكر هذا العقار للتواصل مع الدعم.",
      chat_ready_note: "هذه الدردشة تعمل الآن ويمكن ربطها بـ Firestore لاحقًا.",
      quick_auto_reply:
        "شكرًا لرسالتك. تم استلام طلبك وسنرد عليك في أقرب وقت.",
      details: "التفاصيل",
      choose_dates: "اختر التواريخ",
      date_not_available: "—",
      sign_in_google_failed: "تعذر إكمال تسجيل الدخول عبر Google.",
      account: "الحساب",
      stays: "الإقامات"
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
      viewdetails: "view_details",
      supportchat: "support_chat",
      backhome: "backhome",
      booknow: "booknow",
      wontcharged: "wontcharged",
      welcomeback: "welcomeback"
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

  function t(key, vars = null) {
    let text = translateOptional(key) ?? key;
    if (vars && typeof vars === "object") {
      Object.keys(vars).forEach((k) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
      });
    }
    return text;
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
      desc_ar: "إقامة أنيقة داخل المدينة مع تسجيل دخول سريع وراحة مميزة.",
      maxGuests: 4,
      bedrooms: 2,
      lat: 36.7538,
      lng: 3.0588,
      features_en: ["wifi", "breakfast", "parking", "security"],
      features_ar: ["واي فاي", "إفطار", "موقف سيارات", "حماية"]
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
      desc_ar: "شقة مشرقة قريبة من الساحل ووسط المدينة.",
      maxGuests: 4,
      bedrooms: 2,
      lat: 35.6971,
      lng: -0.6308,
      features_en: ["wifi", "kitchen", "ac", "balcony"],
      features_ar: ["واي فاي", "مطبخ", "تكييف", "شرفة"]
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
      desc_ar: "فيلا خاصة بمساحة واسعة وخصوصية ومرافق مميزة.",
      maxGuests: 8,
      bedrooms: 4,
      lat: 36.9,
      lng: 7.7667,
      features_en: ["pool", "parking", "kitchen", "tv"],
      features_ar: ["مسبح", "موقف سيارات", "مطبخ", "تلفاز"]
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
      desc_ar: "إقامة عصرية ونظيفة مناسبة للرحلات القصيرة داخل المدينة.",
      maxGuests: 3,
      bedrooms: 1,
      lat: 36.1904,
      lng: 5.4137,
      features_en: ["wifi", "ac", "kitchen", "security"],
      features_ar: ["واي فاي", "تكييف", "مطبخ", "حماية"]
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
      desc_ar: "فندق مريح بغرف أنيقة مع إفطار مشمول.",
      maxGuests: 2,
      bedrooms: 1,
      lat: 32.4902,
      lng: 3.6735,
      features_en: ["breakfast", "restaurant", "parking", "wifi"],
      features_ar: ["إفطار", "مطعم", "موقف سيارات", "واي فاي"]
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
      desc_ar: "فيلا فاخرة على الساحل لعطلات عائلية مميزة.",
      maxGuests: 10,
      bedrooms: 5,
      lat: 36.7515,
      lng: 5.0557,
      features_en: ["pool", "beach", "tv", "security"],
      features_ar: ["مسبح", "وصول للشاطئ", "تلفاز", "حماية"]
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
    return currentPage() + (window.location.search || "") + (window.location.hash || "");
  }

  function isAuthPage() {
    const page = currentPage().toLowerCase();
    return page === ROUTES.auth.toLowerCase() || /auth/i.test(page);
  }

  function detectCurrentView() {
    const page = currentPage().toLowerCase();
    const bodyView = String(document.body?.dataset?.view || "").toLowerCase();

    if (bodyView.includes("favorite") || page.includes("favorite")) return "favorites";
    if (bodyView.includes("property") || page.includes("property") || page.includes("details")) return "property";
    if (bodyView.includes("auth") || page.includes("auth")) return "auth";
    if (bodyView.includes("booking") || page.includes("booking")) return "booking";
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
      chatOpenBtn: firstExisting(["#chat-open-btn", "[data-chat-open]", ".chat-fab-btn", "#open-chat-btn"]),
      chatCloseBtn: firstExisting(["#chat-close-btn", "#close-chat-btn", "[data-chat-close]"]),
      chatSendBtn: firstExisting(["#chat-send-btn", "#send-chat-btn", "[data-chat-send]"]),
      chatTextarea: firstExisting(["#chat-textarea", "#chat-message-input", "[data-chat-textarea]"]),
      chatMessages: firstExisting(["#chat-messages", "[data-chat-messages]"]),
      chatEmptyState: firstExisting(["#chat-empty-state", "[data-chat-empty]"]),
      chatPropertyId: firstExisting(["#chat-property-id"]),
      chatUnreadBadge: firstExisting(["#chat-unread-badge"]),

      scrollTopBtn: firstExisting(["#scroll-top-btn", "[data-scroll-top]"]),
      favToast: firstExisting(["#fav-toast"]),
      toastContainer: firstExisting(["#toast-container"]),

      mobileFavBtn: firstExisting(["#mob-fav-btn"]),
      mobileProfileBtn: firstExisting(["#mob-profile-btn"]),
      mobileStaysBtn: firstExisting(["#mob-stays-btn"]),

      propertySkeleton: firstExisting(["#prop-skeleton"]),
      propertyContent: firstExisting(["#prop-real-content"]),
      propertyFavBtn: firstExisting(["#property-fav-btn"]),
      shareBtn: firstExisting(["#share-btn"]),
      contactHostBtn: firstExisting(["#contact-host-btn", "#host-chat-btn", "#booking-chat-btn"]),
      bookNowLink: firstExisting(["#book-now-link"]),
      mapEl: firstExisting(["#property-map"]),
      mapOpenLink: firstExisting(["#map-open-link"]),
      galleryTrack: firstExisting(["#slider-track"]),
      galleryThumbs: firstExisting(["#gallery-thumbs"]),
      galleryDots: firstExisting(["#slider-dots"]),
      galleryCount: firstExisting(["#slider-count-badge"]),
      galleryPrev: firstExisting(["#gallery-prev-btn"]),
      galleryNext: firstExisting(["#gallery-next-btn"]),
      galleryFullscreen: firstExisting(["#gallery-fullscreen-btn"]),

      lightbox: firstExisting(["#lightbox"]),
      lightboxImg: firstExisting(["#lightbox-img"]),
      lightboxClose: firstExisting(["#close-lightbox-btn"]),
      lightboxPrev: firstExisting(["#lightbox-prev-btn"]),
      lightboxNext: firstExisting(["#lightbox-next-btn"])
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

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function formatCurrency(value) {
    const locale = state.lang === "ar" ? "ar-DZ" : "en-US";
    return `${Number(value || 0).toLocaleString(locale)} DZD`;
  }

  function formatDate(value) {
    if (!value) return t("date_not_available");
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return t("date_not_available");
    return date.toLocaleDateString(state.lang === "ar" ? "ar-DZ" : "en-GB");
  }

  function formatTime(value) {
    const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString(state.lang === "ar" ? "ar-DZ" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit"
    });
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

  function truncate(str, length = 80) {
    const clean = normalizeText(str);
    if (clean.length <= length) return clean;
    return `${clean.slice(0, length - 1)}…`;
  }

  function getInitials(name) {
    const parts = normalizeText(name).split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    return parts
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join("");
  }

  function syncPhosphorIcons() {
    safeCall(() => {
      if (window.PhosphorIcons && typeof window.PhosphorIcons.replace === "function") {
        window.PhosphorIcons.replace();
      }
    });
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

  function isArabic() {
    return state.lang === "ar";
  }

  function renderInlineIconButton(el, iconClass, label) {
    if (!el) return;
    const span = label ? `<span>${escapeHtml(label)}</span>` : "";
    el.innerHTML = `<i class="${escapeHtml(iconClass)}"></i>${span}`;
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

  async function setAuthPersistenceFromRemember() {
    if (!auth || !firebase?.auth?.Auth?.Persistence) return;
    const remember = !!safeJsonGet(STORAGE_KEYS.remember, true);
    const persistence = remember
      ? firebase.auth.Auth.Persistence.LOCAL
      : firebase.auth.Auth.Persistence.SESSION;

    try {
      await auth.setPersistence(persistence);
    } catch (error) {
      console.warn("Failed to set auth persistence:", error);
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

  function normalizeArray(value) {
    if (!Array.isArray(value)) return [];
    return value.map((item) => normalizeText(item)).filter(Boolean);
  }

  function normalizeProperty(p = {}, docId = "", collectionName = "") {
    const titleEn = p.title_en || p.titleEn || p.nameEn || p.title || "";
    const titleAr = p.title_ar || p.titleAr || p.nameAr || p.title || "";
    const locationEn =
      p.location_en || p.locationEn || p.cityEn || p.location || p.address || "";
    const locationAr =
      p.location_ar || p.locationAr || p.cityAr || p.location || p.address || "";
    const galleryImages = normalizeArray(p.images)
      .concat(normalizeArray(p.gallery))
      .concat(normalizeArray(p.photos));

    const baseImage =
      p.image ||
      p.imageUrl ||
      p.mainImage ||
      p.coverImage ||
      galleryImages[0] ||
      "images/placeholder.jpg";

    const images = Array.from(new Set([baseImage, ...galleryImages].filter(Boolean)));
    const customId = normalizeText(p.id || p.slug || p.propertyId);
    const realDocId = normalizeText(docId || p.docId || p.documentId || "");
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
      type: String(p.type || p.category || p.propertyType || "").toLowerCase(),
      typeEn: p.typeEn || p.categoryEn || p.propertyTypeEn || p.type || "",
      typeAr: p.typeAr || p.categoryAr || p.propertyTypeAr || p.type || "",
      features_en: normalizeArray(
        p.features_en || p.featuresEn || p.amenitiesEn || p.amenities_en
      ),
      features_ar: normalizeArray(
        p.features_ar || p.featuresAr || p.amenitiesAr || p.amenities_ar
      ),
      maxGuests: safeNumber(p.maxGuests || p.guests || p.capacity || 4, 4),
      bedrooms: safeNumber(p.bedrooms || p.rooms || 2, 2),
      hostName: p.hostName || p.host || p.ownerName || "OreBooking Host",
      hostSince: p.hostSince || "2024",
      lat: p.lat ?? p.locationLat ?? p.latitude ?? null,
      lng: p.lng ?? p.locationLng ?? p.longitude ?? null,
      mapLink: p.mapLink || "",
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
    const raw = String(
      state.lang === "ar"
        ? property.typeAr || property.type || property.typeEn || ""
        : property.typeEn || property.type || property.typeAr || ""
    ).toLowerCase();

    if (/hotel|فندق/.test(raw)) return t("hotel");
    if (/apartment|suite|loft|flat|شقة|أجنحة/.test(raw)) return t("apartment");
    if (/villa|فيلا/.test(raw)) return t("villa");
    if (/resort|منتجع/.test(raw)) return t("resort");
    if (/cabin|كوخ/.test(raw)) return t("cabin");
    return state.lang === "ar"
      ? property.typeAr || property.typeEn || t("premium_stay")
      : property.typeEn || property.typeAr || t("premium_stay");
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
    if (raw === "apartment" || raw === "apartments") return /apartment|suite|loft|flat|شقة|أجنحة/.test(haystack);
    if (raw === "villa" || raw === "villas") return /villa|فيلا/.test(haystack);

    return haystack.includes(raw);
  }

  function propertyMatchesSearch(property, search) {
    const q = normalizeText(search).toLowerCase();
    if (!q) return true;
    const bag = [
      property.title_en,
      property.title_ar,
      property.location_en,
      property.location_ar,
      property.desc_en,
      property.desc_ar,
      property.type,
      property.typeEn,
      property.typeAr
    ]
      .join(" ")
      .toLowerCase();
    return bag.includes(q);
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
    if (snapshot) {
      return normalizeProperty(
        snapshot,
        snapshot.docId || snapshot.id || "",
        snapshot.collection || ""
      );
    }
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

  async function fetchPropertyByIdFromFirestore(id) {
    if (!db || !id) return null;

    for (const collectionName of PROPERTY_COLLECTION_CANDIDATES) {
      try {
        const direct = await db.collection(collectionName).doc(String(id)).get();
        if (direct.exists) {
          const data = direct.data() || {};
          if (isPropertyVisible(data)) {
            return normalizeProperty(data, direct.id, collectionName);
          }
        }
      } catch (_) {}

      try {
        const queries = [
          db.collection(collectionName).where("id", "==", String(id)).limit(1),
          db.collection(collectionName).where("slug", "==", String(id)).limit(1),
          db.collection(collectionName).where("propertyId", "==", String(id)).limit(1)
        ];

        for (const query of queries) {
          try {
            const snap = await query.get();
            if (!snap.empty) {
              const doc = snap.docs[0];
              const data = doc.data() || {};
              if (isPropertyVisible(data)) {
                return normalizeProperty(data, doc.id, collectionName);
              }
            }
          } catch (_) {}
        }
      } catch (_) {}
    }

    return null;
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

  function normalizeFavoriteList(list) {
    return Array.from(
      new Set(
        (Array.isArray(list) ? list : [])
          .map((item) => normalizeText(item))
          .filter(Boolean)
      )
    );
  }

  function getStoredFavorites(uid = state.user?.uid || "") {
    const primary = safeJsonGet(getFavoritesKeyForUser(uid), null);
    const legacy = safeJsonGet(getLegacyFavoritesKey(uid), null);
    const common = safeJsonGetAny(STORAGE_ALIASES.favoritesCommon, []);
    return normalizeFavoriteList([...(primary || []), ...(legacy || []), ...(common || [])]);
  }

  function setStoredFavorites(list, uid = state.user?.uid || "") {
    const normalized = normalizeFavoriteList(list);
    safeJsonSet(getFavoritesKeyForUser(uid), normalized);
    safeJsonSet(getLegacyFavoritesKey(uid), normalized);
    if (!uid) {
      safeJsonSetMany(STORAGE_ALIASES.favoritesCommon, normalized);
    }
    state.favorites = normalized;
    updateFavoriteButtonsEverywhere();
  }

  function getFavoriteIds() {
    const uid = state.user?.uid || "";
    state.favorites = getStoredFavorites(uid);
    return state.favorites;
  }

  function isFavoriteId(id) {
    return getFavoriteIds().includes(String(id));
  }

  function addFavoriteId(id) {
    const current = getFavoriteIds();
    if (!current.includes(String(id))) {
      setStoredFavorites([...current, String(id)]);
    }
  }

  function removeFavoriteId(id) {
    const current = getFavoriteIds();
    setStoredFavorites(current.filter((x) => x !== String(id)));
  }

  function toggleFavorite(property) {
    const propertyId = getNavigationPropertyId(property);
    if (!propertyId) return false;

    const exists = isFavoriteId(propertyId);
    if (exists) {
      removeFavoriteId(propertyId);
      showFavToast(t("fav_removed"));
      return false;
    }

    addFavoriteId(propertyId);
    showFavToast(t("fav_added"));
    return true;
  }

  function migrateGuestFavoritesToUser(uid) {
    if (!uid) return;
    const guestFavs = normalizeFavoriteList(safeJsonGet(STORAGE_KEYS.favoritesGuest, []));
    if (!guestFavs.length) return;

    const userFavs = normalizeFavoriteList(safeJsonGet(getFavoritesKeyForUser(uid), []));
    const merged = normalizeFavoriteList([...userFavs, ...guestFavs]);

    safeJsonSet(getFavoritesKeyForUser(uid), merged);
    safeJsonSet(getLegacyFavoritesKey(uid), merged);
    safeRemove(STORAGE_KEYS.favoritesGuest);
    safeRemoveMany(STORAGE_ALIASES.favoritesCommon);
    state.favorites = merged;
  }

  function updateFavoriteButtonsEverywhere() {
    const favIds = getFavoriteIds();

    $all("[data-fav-id]").forEach((btn) => {
      const id = normalizeText(btn.getAttribute("data-fav-id"));
      const active = favIds.includes(id);
      btn.classList.toggle("active", active);
      const label = active ? t("saved") : t("save");
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute("aria-label", `${label}`);
      const icon = active ? "ph-fill ph-heart" : "ph ph-heart";

      if (btn.classList.contains("fav-btn") || btn.classList.contains("favorite-btn")) {
        btn.innerHTML = `<i class="${icon}"></i>`;
      } else if (btn.id === "property-fav-btn") {
        btn.innerHTML = `<i class="${icon}"></i><span>${escapeHtml(label)}</span>`;
      }
    });

    syncPhosphorIcons();
  }

  /* =========================================
     11) LISTINGS
  ========================================= */
  function getFilteredProperties() {
    const search = state.activeSearch;
    const category = state.activeCategory;
    const sort = state.sort;

    let list = [...getSourceProperties()];

    if (state.currentView === "favorites") {
      const favs = getFavoriteIds();
      list = list.filter((p) => favs.includes(getNavigationPropertyId(p)));
    }

    list = list.filter((property) => {
      return propertyMatchesCategory(property, category) && propertyMatchesSearch(property, search);
    });

    list.sort((a, b) => {
      if (sort === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sort === "price_low") return (a.price || 0) - (b.price || 0);
      if (sort === "price_high") return (b.price || 0) - (a.price || 0);
      const dateA = safeNumber(
        typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime(),
        0
      );
      const dateB = safeNumber(
        typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime(),
        0
      );
      return dateB - dateA || (b.rating || 0) - (a.rating || 0);
    });

    return list;
  }

  function renderListingSkeletons(count = 6) {
    const dom = getDom();
    if (!dom.listingsGrid) return;
    dom.listingsGrid.innerHTML = "";
    for (let i = 0; i < count; i += 1) {
      const item = document.createElement("div");
      item.className = "card-skeleton";
      dom.listingsGrid.appendChild(item);
    }
  }

  function renderEmptyListings(message = t("no_results_text")) {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    dom.listingsGrid.innerHTML = `
      <div class="listings-empty-state">
        <i class="ph ph-house-line"></i>
        <h3>${escapeHtml(t("no_results_title"))}</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
    syncPhosphorIcons();
  }

  function renderPropertyCard(property) {
    const propertyId = getNavigationPropertyId(property);
    const title = getPropertyTitle(property);
    const location = getPropertyLocation(property);
    const urgency = localizeUrgency(property.urgency);
    const rating = safeNumber(property.rating, 4.8).toFixed(1);
    const reserveLabel = state.user ? t("reserve_now") : t("reserve_cta_signed_out");
    const isFav = isFavoriteId(propertyId);

    return `
      <article class="property-card" data-property-id="${escapeHtml(propertyId)}">
        <div class="property-card-media">
          <img src="${escapeHtml(property.image)}" alt="${escapeHtml(title)}" loading="lazy" onerror="this.src='images/placeholder.jpg'">
          ${
            urgency
              ? `<div class="property-urgency"><i class="ph-fill ph-fire"></i><span>${escapeHtml(
                  urgency
                )}</span></div>`
              : ""
          }
          <button
            type="button"
            class="favorite-btn ${isFav ? "active" : ""}"
            data-fav-id="${escapeHtml(propertyId)}"
            aria-label="${escapeHtml(t("save_property"))}"
            aria-pressed="${isFav ? "true" : "false"}"
          >
            <i class="${isFav ? "ph-fill ph-heart" : "ph ph-heart"}"></i>
          </button>
        </div>

        <div class="property-card-body">
          <div class="property-card-top">
            <div class="card-title-wrapper">
              <h3 class="property-card-title">${escapeHtml(title)}</h3>
              <div class="property-card-location">
                <i class="ph ph-map-pin"></i>
                <span>${escapeHtml(location)}</span>
              </div>
            </div>

            <div class="property-card-rating">
              <i class="ph-fill ph-star"></i>
              <span>${escapeHtml(rating)}</span>
            </div>
          </div>

          <div class="property-card-price">
            ${escapeHtml(formatCurrency(property.price))}
            <span>${escapeHtml(t("night_suffix"))}</span>
          </div>

          <div class="property-card-actions">
            <button type="button" class="details-btn" data-action="details" data-property-id="${escapeHtml(propertyId)}">
              <i class="ph ph-arrow-up-right"></i>
              <span>${escapeHtml(t("view_details"))}</span>
            </button>
            <button type="button" class="reserve-btn" data-action="reserve" data-property-id="${escapeHtml(propertyId)}">
              <i class="ph ph-calendar-check"></i>
              <span>${escapeHtml(reserveLabel)}</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function updateSectionHeading() {
    const dom = getDom();
    if (!dom.sectionTitle) return;
    dom.sectionTitle.textContent =
      state.currentView === "favorites" ? t("favorites") : t("featured_title");
  }

  function updateCategoryButtons() {
    const dom = getDom();
    dom.categoryButtons.forEach((btn) => {
      const category = normalizeText(btn.dataset.category || btn.dataset.categoryBtn || "");
      btn.classList.toggle("active", category === state.activeCategory);
    });
  }

  function updateClearSearchButton() {
    const dom = getDom();
    if (!dom.clearSearchBtn) return;
    const active = !!normalizeText(state.activeSearch);
    dom.clearSearchBtn.style.display = active ? "inline-flex" : "none";
  }

  function renderListings() {
    const dom = getDom();
    if (!dom.listingsGrid) return;

    updateSectionHeading();
    updateCategoryButtons();
    updateClearSearchButton();

    const list = getFilteredProperties();

    if (!list.length) {
      renderEmptyListings(
        state.currentView === "favorites" ? t("no_bookings").replace("حجوزات", "عناصر").replace("bookings", "favorites") : t("no_results_text")
      );
      return;
    }

    dom.listingsGrid.innerHTML = list.map(renderPropertyCard).join("");
    updateFavoriteButtonsEverywhere();
    syncPhosphorIcons();
  }

  /* =========================================
     12) PROPERTY PAGE
  ========================================= */
  function getFeatureIcon(feature) {
    const key = normalizeText(feature).toLowerCase();
    const iconMap = {
      wifi: "ph-wifi-high",
      "واي فاي": "ph-wifi-high",
      pool: "ph-swimming-pool",
      "مسبح": "ph-swimming-pool",
      parking: "ph-car",
      "موقف سيارات": "ph-car",
      gym: "ph-barbell",
      "قاعة رياضية": "ph-barbell",
      restaurant: "ph-fork-knife",
      "مطعم": "ph-fork-knife",
      spa: "ph-flower-lotus",
      "سبا": "ph-flower-lotus",
      kitchen: "ph-cooking-pot",
      "مطبخ": "ph-cooking-pot",
      ac: "ph-snowflake",
      "تكييف": "ph-snowflake",
      balcony: "ph-windows",
      "شرفة": "ph-windows",
      breakfast: "ph-coffee",
      "إفطار": "ph-coffee",
      security: "ph-shield-check",
      "حماية": "ph-shield-check",
      tv: "ph-television",
      "تلفاز": "ph-television",
      beach: "ph-island",
      "وصول للشاطئ": "ph-island"
    };
    return iconMap[key] || "ph-check-circle";
  }

  function normalizeFeatureLabel(feature) {
    const key = normalizeText(feature).toLowerCase();
    const map = {
      wifi: t("wifi"),
      pool: t("pool"),
      parking: t("parking"),
      gym: t("gym"),
      restaurant: t("restaurant"),
      spa: t("spa"),
      kitchen: t("kitchen"),
      ac: t("ac"),
      balcony: t("balcony"),
      breakfast: t("breakfast"),
      security: t("security"),
      tv: t("tv"),
      beach: t("beach")
    };
    return map[key] || normalizeText(feature);
  }

  function getPropertyImages(property) {
    const arr = Array.isArray(property?.images) ? property.images : [];
    return arr.length ? arr.filter(Boolean) : [property?.image || "images/placeholder.jpg"];
  }

  function getFeaturesArray(property) {
    if (!property) return ["wifi", "parking", "ac", "kitchen"];
    if (state.lang === "ar" && Array.isArray(property.features_ar) && property.features_ar.length) {
      return property.features_ar;
    }
    if (state.lang !== "ar" && Array.isArray(property.features_en) && property.features_en.length) {
      return property.features_en;
    }
    if (Array.isArray(property.features_en) && property.features_en.length) return property.features_en;
    if (Array.isArray(property.features_ar) && property.features_ar.length) return property.features_ar;
    return ["wifi", "parking", "ac", "kitchen"];
  }

  function getBedroomText(property) {
    const n = safeNumber(property?.bedrooms, 2);
    return t(n === 1 ? "bedrooms_count_one" : "bedrooms_count_many", { n });
  }

  function getGuestCountText(property) {
    const n = safeNumber(property?.maxGuests, 4);
    return t("up_to_guests", { n });
  }

  function showPropertyContent() {
    const dom = getDom();
    if (dom.propertySkeleton) dom.propertySkeleton.style.display = "none";
    if (dom.propertyContent) dom.propertyContent.style.display = "block";
  }

  function showPropertyLoading() {
    const dom = getDom();
    if (dom.propertySkeleton) dom.propertySkeleton.style.display = "";
    if (dom.propertyContent) dom.propertyContent.style.display = "none";
  }

  function destroyPropertyMap() {
    if (state.propertyMapInstance) {
      safeCall(() => state.propertyMapInstance.remove());
      state.propertyMapInstance = null;
    }
  }

  function initPropertyMap(lat, lng, locationName) {
    const dom = getDom();
    if (!dom.mapEl) return;

    destroyPropertyMap();

    const mapParent = dom.mapEl.parentElement;
    const existingNoLocation = mapParent?.querySelector(".map-no-location");
    if (existingNoLocation) existingNoLocation.remove();

    const latitude = safeNumber(lat, NaN);
    const longitude = safeNumber(lng, NaN);
    const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);

    if (!hasCoords || typeof window.L === "undefined") {
      dom.mapEl.style.display = "none";
      if (dom.mapOpenLink) dom.mapOpenLink.style.display = "none";

      if (mapParent) {
        const box = document.createElement("div");
        box.className = "map-no-location";
        box.innerHTML = `
          <i class="ph ph-map-pin-line"></i>
          <span>${escapeHtml(locationName || t("unknown_location"))}</span>
        `;
        mapParent.appendChild(box);
      }
      syncPhosphorIcons();
      return;
    }

    dom.mapEl.style.display = "";
    state.propertyMapInstance = L.map(dom.mapEl, {
      scrollWheelZoom: false,
      zoomControl: true
    }).setView([latitude, longitude], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(state.propertyMapInstance);

    const marker = L.marker([latitude, longitude]).addTo(state.propertyMapInstance);
    marker.bindPopup(`<strong>${escapeHtml(locationName || t("unknown_location"))}</strong>`);

    setTimeout(() => {
      safeCall(() => state.propertyMapInstance.invalidateSize());
    }, 250);

    if (dom.mapOpenLink) {
      dom.mapOpenLink.href = `https://www.google.com/maps?q=${latitude},${longitude}`;
      dom.mapOpenLink.style.display = "inline-flex";
    }
  }

  function updateGalleryCounter() {
    const dom = getDom();
    if (!dom.galleryCount) return;
    const total = state.galleryImages.length || 1;
    const index = state.galleryIndex + 1;
    dom.galleryCount.textContent = `${index} / ${total}`;
  }

  function updateGalleryDots() {
    const dom = getDom();
    if (!dom.galleryDots) return;
    $all(".slider-dot", dom.galleryDots).forEach((dot, index) => {
      dot.classList.toggle("active", index === state.galleryIndex);
    });
  }

  function updateGalleryThumbs() {
    const dom = getDom();
    if (!dom.galleryThumbs) return;
    $all(".gallery-thumb", dom.galleryThumbs).forEach((thumb, index) => {
      thumb.classList.toggle("active", index === state.galleryIndex);
    });
  }

  function updateGalleryTrack(animate = true) {
    const dom = getDom();
    if (!dom.galleryTrack) return;
    dom.galleryTrack.style.transition = animate ? "" : "none";
    dom.galleryTrack.style.transform = `translateX(${isArabic() ? "" : "-"}${state.galleryIndex * 100}%)`;
    if (isArabic()) {
      dom.galleryTrack.style.transform = `translateX(${state.galleryIndex * 100}%)`;
    }
    updateGalleryCounter();
    updateGalleryDots();
    updateGalleryThumbs();

    if (dom.lightbox?.classList.contains("active") && dom.lightboxImg) {
      dom.lightboxImg.src = state.galleryImages[state.galleryIndex] || "images/placeholder.jpg";
      dom.lightboxImg.classList.remove("zoomed");
    }
  }

  function goToSlide(index, animate = true) {
    const total = state.galleryImages.length;
    if (!total) return;
    state.galleryIndex = (index + total) % total;
    updateGalleryTrack(animate);
  }

  function nextSlide(e) {
    if (e) e.preventDefault();
    goToSlide(state.galleryIndex + 1);
  }

  function prevSlide(e) {
    if (e) e.preventDefault();
    goToSlide(state.galleryIndex - 1);
  }

  function openLightbox() {
    const dom = getDom();
    if (!dom.lightbox || !dom.lightboxImg || !state.galleryImages.length) return;
    dom.lightboxImg.src = state.galleryImages[state.galleryIndex] || "images/placeholder.jpg";
    dom.lightboxImg.classList.remove("zoomed");
    openModal(dom.lightbox);
  }

  function closeLightbox() {
    const dom = getDom();
    if (!dom.lightbox) return;
    closeModal(dom.lightbox);
  }

  function toggleZoom(e) {
    e?.stopPropagation?.();
    e?.currentTarget?.classList.toggle("zoomed");
  }

  function setupGallery(images) {
    const dom = getDom();
    if (!dom.galleryTrack) return;

    state.galleryImages = images.length ? images : ["images/placeholder.jpg"];
    state.galleryIndex = 0;

    dom.galleryTrack.innerHTML = state.galleryImages
      .map(
        (src, index) => `
          <img
            src="${escapeHtml(src)}"
            alt="${escapeHtml(`${t("details")} ${index + 1}`)}"
            loading="${index === 0 ? "eager" : "lazy"}"
            onerror="this.src='images/placeholder.jpg'"
          >
        `
      )
      .join("");

    if (dom.galleryDots) {
      dom.galleryDots.innerHTML = state.galleryImages
        .map(
          (_, index) => `
            <button
              type="button"
              class="slider-dot ${index === 0 ? "active" : ""}"
              data-slide-index="${index}"
              aria-label="${escapeHtml(`${t("details")} ${index + 1}`)}"
            ></button>
          `
        )
        .join("");
    }

    if (dom.galleryThumbs) {
      dom.galleryThumbs.innerHTML = state.galleryImages
        .map(
          (src, index) => `
            <button
              type="button"
              class="gallery-thumb ${index === 0 ? "active" : ""}"
              data-thumb-index="${index}"
              aria-label="${escapeHtml(`${t("details")} ${index + 1}`)}"
            >
              <img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.src='images/placeholder.jpg'">
            </button>
          `
        )
        .join("");
    }

    updateGalleryTrack(false);
  }

  async function renderPropertyPage(property) {
    const dom = getDom();
    if (!property) {
      showToast(t("property_not_found"), "error");
      return;
    }

    state.selectedProperty = property;
    rememberSelectedProperty(property);

    const title = getPropertyTitle(property) || t("unnamed_property");
    const location = getPropertyLocation(property) || t("unknown_location");
    const description =
      (state.lang === "ar" ? property.desc_ar : property.desc_en) ||
      property.desc_en ||
      property.desc_ar ||
      t("no_description");
    const type = getPropertyType(property);
    const guestsText = getGuestCountText(property);
    const bedroomsText = getBedroomText(property);

    const $id = (id) => document.getElementById(id);

    if ($id("prop-title")) $id("prop-title").textContent = title;
    if ($id("prop-location")) $id("prop-location").textContent = location;
    if ($id("prop-desc")) $id("prop-desc").textContent = description;
    if ($id("prop-price")) $id("prop-price").textContent = formatCurrency(property.price);
    if ($id("prop-rating")) $id("prop-rating").textContent = safeNumber(property.rating, 4.8).toFixed(1);
    if ($id("prop-type-text")) $id("prop-type-text").textContent = type;

    if ($id("chip-guests")) $id("chip-guests").textContent = guestsText;
    if ($id("chip-bedrooms")) $id("chip-bedrooms").textContent = bedroomsText;
    if ($id("chip-verified")) $id("chip-verified").textContent = t("verified_listing");
    if ($id("chip-instant")) $id("chip-instant").textContent = t("instant_booking_request");

    if ($id("booking-stat-guests")) $id("booking-stat-guests").textContent = t("capacity_label", { n: property.maxGuests });
    if ($id("booking-stat-type")) $id("booking-stat-type").textContent = t("type_label", { type });

    if ($id("host-name")) $id("host-name").textContent = property.hostName || "OreBooking Host";
    if ($id("host-since")) $id("host-since").textContent = t("hosting_since");
    if ($id("host-badge-text")) $id("host-badge-text").textContent = t("verified_host");

    if ($id("share-text")) $id("share-text").textContent = t("share");
    if ($id("fav-btn-text")) $id("fav-btn-text").textContent = isFavoriteId(getNavigationPropertyId(property)) ? t("saved") : t("save");
    if ($id("contact-host-text")) $id("contact-host-text").textContent = t("contact_host");
    if ($id("host-chat-text")) $id("host-chat-text").textContent = t("message_host");
    if ($id("booking-chat-text")) $id("booking-chat-text").textContent = t("ask_about_property");

    if ($id("highlights-title")) $id("highlights-title").textContent = t("why_guests_like_it");
    if ($id("highlight-1-title")) $id("highlight-1-title").textContent = t("great_location");
    if ($id("highlight-1-desc")) $id("highlight-1-desc").textContent = t("great_location_desc");
    if ($id("highlight-2-title")) $id("highlight-2-title").textContent = t("clean_and_comfortable");
    if ($id("highlight-2-desc")) $id("highlight-2-desc").textContent = t("clean_and_comfortable_desc");
    if ($id("highlight-3-title")) $id("highlight-3-title").textContent = t("responsive_support");
    if ($id("highlight-3-desc")) $id("highlight-3-desc").textContent = t("responsive_support_desc");
    if ($id("highlight-4-title")) $id("highlight-4-title").textContent = t("trusted_listing");
    if ($id("highlight-4-desc")) $id("highlight-4-desc").textContent = t("trusted_listing_desc");

    if ($id("perk-1")) $id("perk-1").textContent = t("free_cancellation_24h");
    if ($id("perk-2")) $id("perk-2").textContent = t("instant_confirmation");
    if ($id("perk-3")) $id("perk-3").textContent = t("support_247");
    if ($id("booking-info-text")) $id("booking-info-text").textContent = t("choose_dates_next_page");
    if ($id("map-title")) $id("map-title").textContent = t("where_youll_be");
    if ($id("open-maps-text")) $id("open-maps-text").textContent = t("open_google_maps");
    if ($id("tips-title")) $id("tips-title").textContent = t("good_to_know");
    if ($id("trust-note")) $id("trust-note").textContent = t("trust_note");

    if ($id("tip-1")) {
      $id("tip-1").textContent =
        state.lang === "ar"
          ? "يتم استكمال تفاصيل الحجز والمعلومات النهائية للضيوف في الخطوة التالية."
          : "Booking details and final guest information are completed on the next step.";
    }

    if ($id("tip-2")) {
      $id("tip-2").textContent =
        state.lang === "ar"
          ? "قد يعتمد السعر النهائي على التواريخ وعدد الضيوف وخيارات الحجز المحددة."
          : "Final pricing may depend on dates, guests, and selected booking options.";
    }

    if ($id("tip-3")) {
      $id("tip-3").textContent =
        state.lang === "ar"
          ? "استخدم زر المشاركة لنسخ رابط الإعلان أو إرساله بسرعة."
          : "Use the share button to copy or send the listing link quickly.";
    }

    const features = getFeaturesArray(property);
    const featuresList = $id("prop-features-list");
    if (featuresList) {
      featuresList.innerHTML = features
        .map(
          (feature) => `
            <li>
              <i class="ph ${escapeHtml(getFeatureIcon(feature))}"></i>
              <span>${escapeHtml(normalizeFeatureLabel(feature))}</span>
            </li>
          `
        )
        .join("");
    }

    const images = getPropertyImages(property);
    setupGallery(images);
    initPropertyMap(property.lat, property.lng, location);

    if (dom.bookNowLink) {
      dom.bookNowLink.href = buildBookingUrl(property);
      dom.bookNowLink.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          handleReserveNow(property);
        },
        { once: true }
      );
    }

    if (dom.chatPropertyId) {
      dom.chatPropertyId.value = getNavigationPropertyId(property);
    }

    if (dom.mapOpenLink && property.mapLink) {
      dom.mapOpenLink.href = property.mapLink;
      dom.mapOpenLink.style.display = "inline-flex";
    }

    updateFavoriteButtonsEverywhere();
    document.title = `${title} - OreBooking`;
    showPropertyContent();
    syncPhosphorIcons();
  }

  async function loadPropertyPage() {
    if (state.currentView !== "property") return;
    showPropertyLoading();

    const propertyId = resolveSelectedPropertyIdFromUrlOrStorage();
    if (!propertyId) {
      showToast(t("no_property_id"), "error");
      showPropertyContent();
      return;
    }

    await loadLiveProperties();

    let property = getPropertyById(propertyId) || resolveSelectedProperty();
    if (!property) {
      property = await fetchPropertyByIdFromFirestore(propertyId);
    }
    if (!property && state.liveProperties.length) {
      property =
        state.liveProperties.find((p) => String(p.id) === String(propertyId)) || null;
    }
    if (!property) {
      showToast(t("property_not_found"), "error");
      showPropertyContent();
      return;
    }

    await renderPropertyPage(property);
  }

  function handleShare() {
    const title = document.getElementById("prop-title")?.textContent || "OreBooking Property";
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(() => showToast(t("property_link_copied"), "success"))
        .catch(() => showToast(t("copy_failed"), "error"));
      return;
    }

    showToast(t("copy_failed"), "error");
  }

  /* =========================================
     13) AUTH / MODALS
  ========================================= */
  function isElementVisible(el) {
    return !!el && !el.classList.contains("hidden");
  }

  function getOpenModalCount() {
    return $all(".modal-overlay.active, .lightbox-overlay.active").length;
  }

  function syncBodyModalState() {
    const body = document.body;
    if (!body) return;
    body.classList.toggle("modal-open", getOpenModalCount() > 0);
  }

  function openModal(el) {
    if (!el) return;
    el.classList.add("active");
    el.setAttribute("aria-hidden", "false");
    syncBodyModalState();
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove("active");
    el.setAttribute("aria-hidden", "true");
    syncBodyModalState();
  }

  function setAuthMessage(message = "", type = "") {
    const dom = getDom();
    if (!dom.authMessage) return;
    dom.authMessage.className = "auth-message";
    dom.authMessage.textContent = message;
    if (message && type) dom.authMessage.classList.add(type);
    dom.authMessage.style.display = message ? "block" : "none";
  }

  function switchAuthView(view = "login") {
    const dom = getDom();
    const forms = [
      { key: "login", el: dom.loginForm },
      { key: "register", el: dom.registerForm },
      { key: "forgot", el: dom.forgotForm }
    ];

    forms.forEach(({ key, el }) => {
      if (!el) return;
      el.classList.toggle("active", key === view);
    });

    if (isAuthPage()) {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${view}`);
    }

    setAuthMessage("");
  }

  function openAuthModal(view = "login", message = "") {
    const dom = getDom();

    if (dom.authModal) {
      switchAuthView(view);
      openModal(dom.authModal);
      if (message) setAuthMessage(message, "error");
      return;
    }

    if (!isAuthPage()) {
      window.location.href = getAuthUrl(view);
    }
  }

  function closeAuthModal() {
    const dom = getDom();
    if (dom.authModal) closeModal(dom.authModal);
  }

  function requireAuth(message = "", view = "login") {
    if (state.user) return true;
    openAuthModal(view, message || t("auth_required"));
    return false;
  }

  function handlePasswordToggleClick(button) {
    const wrapper = button.closest(".pass-wrapper");
    const input = wrapper?.querySelector("input");
    const icon = button.querySelector("i");
    if (!input) return;

    const nextType = input.type === "password" ? "text" : "password";
    input.type = nextType;
    if (icon) {
      icon.className = nextType === "password" ? "ph ph-eye" : "ph ph-eye-slash";
    }
  }

  function updatePasswordStrength(input) {
    const strengthBox = document.getElementById("password-strength");
    const label = document.getElementById("strength-label");
    const bars = $all(".str-bar", strengthBox || document);

    if (!strengthBox || !bars.length || !input) return;

    const value = input.value || "";
    let score = 0;

    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    const colors = ["#e2e8f0", "#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
    bars.forEach((bar, index) => {
      bar.style.background = index < score ? colors[score] : "var(--border-color)";
    });

    let text = "";
    if (!value) text = "";
    else if (score <= 1) text = state.lang === "ar" ? "ضعيفة" : "Weak";
    else if (score === 2) text = state.lang === "ar" ? "متوسطة" : "Medium";
    else if (score === 3) text = state.lang === "ar" ? "جيدة" : "Good";
    else text = state.lang === "ar" ? "قوية" : "Strong";

    label.textContent = text;
  }

  async function loginWithEmail(form) {
    if (!auth) throw new Error("Auth unavailable");

    const emailInput = form.querySelector("input[type='email']");
    const passwordInput = form.querySelector("input[type='password']");
    const remember = form.querySelector("input[type='checkbox']");

    const email = normalizeText(emailInput?.value);
    const password = normalizeText(passwordInput?.value);

    if (!validateEmail(email)) {
      setAuthMessage(t("invalid_email"), "error");
      return;
    }
    if (!password) {
      setAuthMessage(t("fill_required"), "error");
      return;
    }

    safeJsonSet(STORAGE_KEYS.remember, !!remember?.checked);
    await setAuthPersistenceFromRemember();
    await auth.signInWithEmailAndPassword(email, password);
  }

  async function registerWithEmail(form) {
    if (!auth) throw new Error("Auth unavailable");

    const nameInput = form.querySelector("input[type='text']");
    const emailInput = form.querySelector("input[type='email']");
    const passwordInput = form.querySelector("input[type='password']");
    const name = normalizeText(nameInput?.value);
    const email = normalizeText(emailInput?.value);
    const password = normalizeText(passwordInput?.value);

    if (!name || !validateEmail(email) || !password) {
      setAuthMessage(t("fill_required"), "error");
      return;
    }

    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (cred.user && name) {
      await cred.user.updateProfile({ displayName: name });
    }
  }

  async function sendPasswordReset(form) {
    if (!auth) throw new Error("Auth unavailable");

    const emailInput = form.querySelector("input[type='email']");
    const email = normalizeText(emailInput?.value);

    if (!validateEmail(email)) {
      setAuthMessage(t("invalid_email"), "error");
      return;
    }

    await auth.sendPasswordResetEmail(email);
    setAuthMessage(t("reset_sent"), "success");
  }

  async function signInWithGoogle() {
    if (!auth || !googleProvider) throw new Error("Auth unavailable");

    safeJsonSet(STORAGE_KEYS.remember, true);
    await setAuthPersistenceFromRemember();

    try {
      await auth.signInWithPopup(googleProvider);
    } catch (error) {
      if (error?.code === "auth/popup-blocked" || error?.code === "auth/cancelled-popup-request") {
        await auth.signInWithRedirect(googleProvider);
        return;
      }
      throw error;
    }
  }

  async function handleLogout() {
    if (!auth || !state.user) {
      state.user = null;
      updateAuthUI();
      return;
    }

    try {
      await auth.signOut();
      state.user = null;
      updateAuthUI();
      showToast(t("logout_success"), "success");
    } catch (error) {
      console.error("Logout failed:", error);
      showToast(humanFirebaseError(error?.code), "error");
    }
  }

  function updateProfileTrigger() {
    const dom = getDom();
    if (!dom.profileTrigger) return;

    const icon = state.user ? "ph ph-user-circle" : "ph ph-user";
    dom.profileTrigger.classList.toggle("auth-btn-logged", !!state.user);
    dom.profileTrigger.classList.toggle("auth-btn-guest", !state.user);

    if (dom.profileTrigger.matches(".profile-menu")) {
      dom.profileTrigger.innerHTML = `<i class="${icon}"></i>`;
    } else {
      renderInlineIconButton(dom.profileTrigger, icon, state.user ? t("account") : t("sign_in"));
    }
  }

  function updateAuthUI() {
    const dom = getDom();
    const user = state.user;

    updateProfileTrigger();

    if (dom.profileName) {
      dom.profileName.textContent = user?.displayName || user?.email || t("guest_user");
    }

    if (dom.profileEmail) {
      dom.profileEmail.textContent = user?.email || t("sign_in_to_continue");
    }

    if (dom.logoutBtn) {
      dom.logoutBtn.style.display = user ? "" : "none";
    }

    if (dom.myBookingsBtn) {
      dom.myBookingsBtn.style.display = user ? "" : "";
    }

    if (dom.authCta && !dom.authCta.matches(".profile-menu")) {
      dom.authCta.textContent = user ? t("account") : t("sign_in");
    }

    getFavoriteIds();
    updateFavoriteButtonsEverywhere();
  }

  function handlePostLoginRedirect() {
    if (continuePendingBookingAfterAuth()) return true;

    const target = getRedirectTargetFromUrl();
    if (isAuthPage() && target && target !== currentPage()) {
      window.location.href = target;
      return true;
    }

    return false;
  }

  function attachAuthObserver() {
    if (!auth || authObserverAttached) return;
    authObserverAttached = true;

    auth.onAuthStateChanged(async (user) => {
      state.user = user || null;

      if (user?.uid) {
        migrateGuestFavoritesToUser(user.uid);
      }

      updateAuthUI();

      if (user) {
        closeAuthModal();
        setAuthMessage("");
        if (!handlePostLoginRedirect()) {
          if (isAuthPage()) {
            showToast(t("login_success"), "success");
          }
        }
      }
    });
  }

  /* =========================================
     14) BOOKINGS
  ========================================= */
  function normalizeBooking(docId, data = {}) {
    const property =
      data.propertySnapshot
        ? normalizeProperty(
            data.propertySnapshot,
            data.propertySnapshot.docId || data.propertySnapshot.id || "",
            data.propertySnapshot.collection || ""
          )
        : getPropertyById(data.propertyId || data.propertyDocId || data.listingId || "") || null;

    return {
      id: docId || data.id || data.bookingId || slugify(`${data.createdAt || Date.now()}`),
      propertyId: data.propertyId || data.propertyDocId || data.listingId || property?.id || "",
      propertyTitle:
        data.propertyTitle ||
        data.title ||
        property?.title_en ||
        property?.title_ar ||
        t("unnamed_property"),
      propertyLocation:
        data.propertyLocation ||
        data.location ||
        property?.location_en ||
        property?.location_ar ||
        t("unknown_location"),
      checkIn: data.checkIn || data.checkin || data.startDate || data.arrivalDate || null,
      checkOut: data.checkOut || data.checkout || data.endDate || data.departureDate || null,
      guests: safeNumber(data.guests || data.guestCount || data.totalGuests || 1, 1),
      total: safeNumber(data.total || data.totalPrice || data.amount || 0, 0),
      status: String(data.status || data.bookingStatus || "pending").toLowerCase(),
      createdAt: data.createdAt || data.submittedAt || null,
      property
    };
  }

  function getStatusLabel(status) {
    const normalized = String(status || "").toLowerCase();
    if (normalized === "confirmed") return t("booking_status_confirmed");
    if (normalized === "cancelled" || normalized === "canceled") return t("booking_status_cancelled");
    if (normalized === "rejected") return t("booking_status_rejected");
    return t("booking_status_pending");
  }

  async function queryBookingsByField(collectionName, field, value) {
    if (!db || !value) return [];
    try {
      const snap = await db.collection(collectionName).where(field, "==", value).limit(50).get();
      return snap.docs.map((doc) => normalizeBooking(doc.id, doc.data() || {}));
    } catch (_) {
      return [];
    }
  }

  async function loadUserBookings() {
    if (!state.user) {
      state.bookings = [];
      return [];
    }

    if (!db) {
      state.bookings = [];
      return [];
    }

    if (state.loadingBookings) return state.bookings;
    state.loadingBookings = true;

    const uid = state.user.uid;
    const email = state.user.email || "";
    const all = [];

    try {
      for (const collectionName of BOOKINGS_COLLECTION_CANDIDATES) {
        const chunks = await Promise.all([
          queryBookingsByField(collectionName, "userId", uid),
          queryBookingsByField(collectionName, "uid", uid),
          queryBookingsByField(collectionName, "userUid", uid),
          email ? queryBookingsByField(collectionName, "email", email) : Promise.resolve([])
        ]);

        chunks.flat().forEach((item) => all.push(item));
      }

      const map = new Map();
      all.forEach((item) => {
        if (!map.has(item.id)) map.set(item.id, item);
      });

      state.bookings = Array.from(map.values()).sort((a, b) => {
        const timeA = safeNumber(
          typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : new Date(a.createdAt || 0).getTime(),
          0
        );
        const timeB = safeNumber(
          typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : new Date(b.createdAt || 0).getTime(),
          0
        );
        return timeB - timeA;
      });

      return state.bookings;
    } catch (error) {
      console.error("Failed loading bookings:", error);
      state.bookings = [];
      return [];
    } finally {
      state.loadingBookings = false;
    }
  }

  function renderBookings() {
    const dom = getDom();
    if (!dom.bookingsList) return;

    if (state.loadingBookings) {
      dom.bookingsList.innerHTML = `
        <div class="bookings-empty-state">
          <i class="ph ph-spinner-gap spin"></i>
          <p>${escapeHtml(t("loading_bookings"))}</p>
        </div>
      `;
      syncPhosphorIcons();
      return;
    }

    if (!state.bookings.length) {
      dom.bookingsList.innerHTML = `
        <div class="bookings-empty-state">
          <i class="ph ph-calendar-blank"></i>
          <p>${escapeHtml(t("no_bookings"))}</p>
        </div>
      `;
      syncPhosphorIcons();
      return;
    }

    dom.bookingsList.innerHTML = state.bookings
      .map((booking) => {
        const propertyTitle =
          booking.property && getPropertyTitle(booking.property)
            ? getPropertyTitle(booking.property)
            : booking.propertyTitle;
        const statusClass =
          booking.status === "confirmed"
            ? "confirmed"
            : booking.status === "cancelled" || booking.status === "canceled"
            ? "cancelled"
            : booking.status === "rejected"
            ? "cancelled"
            : "pending";

        return `
          <article class="booking-entry">
            <div class="booking-entry-head">
              <div>
                <div class="booking-entry-title">${escapeHtml(propertyTitle)}</div>
                <div class="booking-entry-meta">
                  <span>${escapeHtml(t("booking_checkin"))} ${escapeHtml(formatDate(booking.checkIn))}</span>
                  <span>${escapeHtml(t("booking_checkout"))} ${escapeHtml(formatDate(booking.checkOut))}</span>
                  <span>${escapeHtml(t("booking_guests"))} ${escapeHtml(String(booking.guests))}</span>
                  <span>${escapeHtml(t("booking_total"))} ${escapeHtml(formatCurrency(booking.total))}</span>
                </div>
              </div>
              <span class="booking-status-badge ${escapeHtml(statusClass)}">${escapeHtml(
          getStatusLabel(booking.status)
        )}</span>
            </div>
          </article>
        `;
      })
      .join("");

    syncPhosphorIcons();
  }

  async function openBookingsModal() {
    const dom = getDom();
    if (!requireAuth(t("auth_redirect_profile"), "login")) return;

    if (!dom.bookingsModal) {
      if (currentPage().toLowerCase() !== ROUTES.bookings.toLowerCase()) {
        window.location.href = ROUTES.bookings;
      }
      return;
    }

    state.loadingBookings = true;
    renderBookings();
    openModal(dom.bookingsModal);

    try {
      await loadUserBookings();
    } catch (_) {
      showToast(t("bookings_load_error"), "error");
    } finally {
      renderBookings();
    }
  }

  /* =========================================
     15) CHAT
  ========================================= */
  function getChatStorageKey() {
    return state.user?.uid
      ? `${STORAGE_KEYS.chatUserPrefix}${state.user.uid}`
      : STORAGE_KEYS.chatGuest;
  }

  function getUnreadStorageKey() {
    return state.user?.uid
      ? `${STORAGE_KEYS.unreadUserPrefix}${state.user.uid}`
      : STORAGE_KEYS.unreadGuest;
  }

  function normalizeMessage(message) {
    return {
      id: message.id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sender: message.sender === "admin" ? "admin" : "customer",
      text: truncate(normalizeText(message.text), MAX_CHAT_MESSAGE_LENGTH),
      propertyId: normalizeText(message.propertyId),
      createdAt: message.createdAt || new Date().toISOString()
    };
  }

  function getChatBucket() {
    return safeJsonGet(getChatStorageKey(), {});
  }

  function setChatBucket(data) {
    safeJsonSet(getChatStorageKey(), data || {});
  }

  function getUnreadBucket() {
    return safeJsonGet(getUnreadStorageKey(), {});
  }

  function setUnreadBucket(data) {
    safeJsonSet(getUnreadStorageKey(), data || {});
  }

  function getCurrentChatPropertyId() {
    return (
      normalizeText(getDom().chatPropertyId?.value) ||
      normalizeText(state.currentChatPropertyId) ||
      normalizeText(getNavigationPropertyId(state.selectedProperty)) ||
      "global"
    );
  }

  function loadChatMessages(propertyId = getCurrentChatPropertyId()) {
    const bucket = getChatBucket();
    const list = Array.isArray(bucket[propertyId]) ? bucket[propertyId] : [];
    state.chatMessages = list.map(normalizeMessage);
    state.currentChatPropertyId = propertyId;
    return state.chatMessages;
  }

  function saveChatMessages(propertyId = getCurrentChatPropertyId(), list = state.chatMessages) {
    const bucket = getChatBucket();
    bucket[propertyId] = normalizeFavoriteList([]).concat(list.map((m) => normalizeMessage(m)));
    setChatBucket(bucket);
  }

  function incrementUnread(propertyId) {
    const bucket = getUnreadBucket();
    bucket[propertyId] = safeNumber(bucket[propertyId], 0) + 1;
    setUnreadBucket(bucket);
    updateChatUnreadBadge();
  }

  function clearUnread(propertyId) {
    const bucket = getUnreadBucket();
    bucket[propertyId] = 0;
    setUnreadBucket(bucket);
    updateChatUnreadBadge();
  }

  function getUnreadTotal() {
    const bucket = getUnreadBucket();
    return Object.values(bucket).reduce((sum, v) => sum + safeNumber(v, 0), 0);
  }

  function updateChatUnreadBadge() {
    const dom = getDom();
    if (!dom.chatUnreadBadge) return;
    const total = getUnreadTotal();
    dom.chatUnreadBadge.textContent = String(total);
    dom.chatUnreadBadge.style.display = total > 0 ? "inline-flex" : "none";
  }

  function renderChatMessages() {
    const dom = getDom();
    if (!dom.chatMessages) return;

    const currentPropertyId = getCurrentChatPropertyId();
    const list = loadChatMessages(currentPropertyId);

    if (dom.chatEmptyState) {
      dom.chatEmptyState.style.display = list.length ? "none" : "";
      const title = document.getElementById("chat-empty-title");
      const sub = document.getElementById("chat-empty-subtitle");
      if (title) title.textContent = t("no_messages_yet");
      if (sub) sub.textContent = t("start_chat_hint");
    }

    dom.chatMessages.innerHTML = list
      .map((msg) => {
        const who = msg.sender === "admin" ? t("support_agent") : t("you");
        return `
          <div class="chat-message ${escapeHtml(msg.sender)}">
            ${escapeHtml(msg.text).replace(/\n/g, "<br>")}
            <span class="chat-meta">${escapeHtml(who)} • ${escapeHtml(
          formatTime(msg.createdAt)
        )}</span>
          </div>
        `;
      })
      .join("");

    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
    syncPhosphorIcons();
  }

  async function maybeMirrorChatToFirestore(message) {
    if (!db) return;
    const payload = {
      ...message,
      uid: state.user?.uid || "",
      email: state.user?.email || "",
      propertyId: message.propertyId || "",
      createdAt: new Date().toISOString()
    };

    for (const collectionName of SUPPORT_COLLECTION_CANDIDATES) {
      try {
        await db.collection(collectionName).add(payload);
        break;
      } catch (_) {}
    }
  }

  function buildAutoReply(property) {
    const title = property ? getPropertyTitle(property) : "";
    const base = t("quick_auto_reply");
    return title ? `${base} ${state.lang === "ar" ? `بخصوص "${title}".` : `Regarding "${title}".`}` : base;
  }

  function pushChatMessage(message) {
    const propertyId = message.propertyId || getCurrentChatPropertyId();
    const list = loadChatMessages(propertyId);
    list.push(normalizeMessage(message));
    state.chatMessages = list;
    saveChatMessages(propertyId, list);
    renderChatMessages();
  }

  function openChatModal(propertyId = "") {
    const dom = getDom();
    if (!dom.chatModal) return;

    const finalPropertyId =
      normalizeText(propertyId) ||
      normalizeText(getNavigationPropertyId(state.selectedProperty)) ||
      normalizeText(dom.chatPropertyId?.value) ||
      "global";

    state.currentChatPropertyId = finalPropertyId;
    if (dom.chatPropertyId) dom.chatPropertyId.value = finalPropertyId;

    const titleEl = document.getElementById("chat-title");
    const subtitleEl = document.getElementById("chat-subtitle");
    const noteEl = document.getElementById("chat-note");
    const sendTextEl = document.getElementById("send-chat-text");

    if (titleEl) titleEl.textContent = t("chat_title");
    if (subtitleEl) subtitleEl.textContent = t("chat_subtitle");
    if (noteEl) noteEl.textContent = t("chat_ready_note");
    if (sendTextEl) sendTextEl.textContent = t("send_message");
    if (dom.chatTextarea) dom.chatTextarea.placeholder = t("chat_placeholder");

    openModal(dom.chatModal);
    clearUnread(finalPropertyId);
    renderChatMessages();
    dom.chatTextarea?.focus();
  }

  function closeChatModal() {
    const dom = getDom();
    if (!dom.chatModal) return;
    closeModal(dom.chatModal);
  }

  function sendChatMessage() {
    const dom = getDom();
    const input = dom.chatTextarea;
    if (!input) return;

    const text = normalizeText(input.value);
    if (!text) {
      showToast(t("message_required"), "error");
      return;
    }
    if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
      showToast(t("message_too_long"), "error");
      return;
    }

    const propertyId = getCurrentChatPropertyId();
    const property = getPropertyById(propertyId) || state.selectedProperty || null;
    const enrichedText = property
      ? `${text}${state.lang === "ar" ? ` — بخصوص: ${getPropertyTitle(property)}` : ` — About: ${getPropertyTitle(property)}`}`
      : text;

    const userMessage = {
      sender: "customer",
      text: enrichedText,
      propertyId,
      createdAt: new Date().toISOString()
    };

    pushChatMessage(userMessage);
    input.value = "";
    maybeMirrorChatToFirestore(userMessage);

    clearTimeout(autoReplyTimer);
    autoReplyTimer = setTimeout(() => {
      const reply = {
        sender: "admin",
        text: buildAutoReply(property),
        propertyId,
        createdAt: new Date().toISOString()
      };
      pushChatMessage(reply);

      const domNow = getDom();
      if (!domNow.chatModal?.classList.contains("active")) {
        incrementUnread(propertyId);
      }
    }, CHAT_REPLY_DELAY);

    showToast(t("support_toast"), "success");
  }

  /* =========================================
     16) THEME / LANGUAGE
  ========================================= */
    function applyTheme(theme, persist = true) {
    const dom = getDom();
    state.theme = theme === "dark" ? "dark" : "light";

    if (dom.html) {
      dom.html.classList.toggle("dark", state.theme === "dark");
      dom.html.dataset.theme = state.theme;
    }

    if (dom.body) {
      dom.body.classList.toggle("dark", state.theme === "dark");
      dom.body.dataset.theme = state.theme;
    }

    if (persist) {
      safeSetMany(STORAGE_ALIASES.theme, state.theme);
    }

    if (dom.themeBtn) {
      dom.themeBtn.setAttribute(
        "aria-label",
        state.theme === "dark"
          ? state.lang === "ar"
            ? "تبديل إلى الوضع الفاتح"
            : "Switch to light mode"
          : state.lang === "ar"
          ? "تبديل إلى الوضع الداكن"
          : "Switch to dark mode"
      );

      const icon = dom.themeBtn.querySelector("i");
      if (icon) {
        icon.className = state.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
      }
    }
  }

  function applyLanguage(lang, persist = true) {
    const dom = getDom();
    state.lang = lang === "ar" ? "ar" : "en";

    if (dom.html) {
      dom.html.lang = state.lang;
      dom.html.dir = state.lang === "ar" ? "rtl" : "ltr";
    }

    if (persist) {
      safeSetMany(STORAGE_ALIASES.lang, state.lang);
    }

    if (auth) {
      try {
        auth.languageCode = state.lang;
      } catch (_) {}
    }

    if (dom.langBtn) {
      const span = dom.langBtn.querySelector("span");
      if (span) span.textContent = state.lang === "ar" ? "AR" : "EN";
      dom.langBtn.setAttribute(
        "aria-label",
        state.lang === "ar" ? "Switch language" : "تبديل اللغة"
      );
    }

    applyTranslations();
    renderListings();
    updateAuthUI();
    renderBookings();
    renderChatMessages();

    if (state.currentView === "property" && state.selectedProperty) {
      renderPropertyPage(state.selectedProperty);
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === "dark" ? "light" : "dark", true);
  }

  function toggleLanguage() {
    applyLanguage(state.lang === "ar" ? "en" : "ar", true);
  }

  /* =========================================
     17) I18N DOM
  ========================================= */
  function translateElement(el) {
    if (!el) return;

    const key =
      el.getAttribute("data-i18n") ||
      el.dataset.i18n ||
      el.getAttribute("data-translate");

    if (key) {
      const translated = translateOptional(key);
      if (translated !== null) {
        el.textContent = translated;
      }
    }

    const placeholderKey =
      el.getAttribute("data-i18n-placeholder") || el.dataset.i18nPlaceholder;
    if (placeholderKey) {
      const translated = translateOptional(placeholderKey);
      if (translated !== null) {
        el.setAttribute("placeholder", translated);
      }
    }

    const titleKey = el.getAttribute("data-i18n-title") || el.dataset.i18nTitle;
    if (titleKey) {
      const translated = translateOptional(titleKey);
      if (translated !== null) {
        el.setAttribute("title", translated);
      }
    }

    const ariaKey =
      el.getAttribute("data-i18n-aria-label") || el.dataset.i18nAriaLabel;
    if (ariaKey) {
      const translated = translateOptional(ariaKey);
      if (translated !== null) {
        el.setAttribute("aria-label", translated);
      }
    }
  }

  function applyTranslations() {
    document.title = t("page_title");

    $all("[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]").forEach(
      translateElement
    );

    const dom = getDom();

    if (dom.destinationInput && !dom.destinationInput.value) {
      dom.destinationInput.placeholder = t("where_placeholder");
    }

    if (dom.chatTextarea && !dom.chatTextarea.value) {
      dom.chatTextarea.placeholder = t("chat_placeholder");
    }

    if (dom.clearSearchBtn) {
      dom.clearSearchBtn.textContent = t("clear_search");
    }

    if (dom.searchBtn) {
      const span = dom.searchBtn.querySelector("span");
      if (span) span.textContent = t("search_btn");
    }

    const backHome = document.querySelector("[data-i18n='backhome']");
    if (backHome) backHome.textContent = t("backhome");

    syncPhosphorIcons();
  }

  /* =========================================
     18) EVENTS
  ========================================= */
  function bindThemeAndLanguage() {
    const dom = getDom();

    dom.themeBtn?.addEventListener("click", toggleTheme);
    dom.langBtn?.addEventListener("click", toggleLanguage);
  }

  function setProfileDropdown(open) {
    const dom = getDom();
    state.profileDropdownOpen = !!open;

    if (dom.profileDropdown) {
      dom.profileDropdown.classList.toggle("active", !!open);
    }

    if (dom.profileTrigger) {
      dom.profileTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  function bindProfileMenu() {
    const dom = getDom();

    dom.profileTrigger?.addEventListener("click", (e) => {
      e.preventDefault();

      if (!state.user && !dom.profileDropdown) {
        openAuthModal("login");
        return;
      }

      if (!dom.profileDropdown) {
        openAuthModal("login");
        return;
      }

      setProfileDropdown(!state.profileDropdownOpen);
    });

    document.addEventListener("click", (e) => {
      if (!dom.profileContainer) return;
      if (!dom.profileContainer.contains(e.target)) {
        setProfileDropdown(false);
      }
    });

    dom.logoutBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      setProfileDropdown(false);
      await handleLogout();
    });

    dom.myFavoritesBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      setProfileDropdown(false);
      if (currentPage().toLowerCase() === ROUTES.favorites.toLowerCase()) {
        state.currentView = "favorites";
        renderListings();
      } else {
        window.location.href = ROUTES.favorites;
      }
    });

    dom.myBookingsBtn?.addEventListener("click", async (e) => {
      e.preventDefault();
      setProfileDropdown(false);
      await openBookingsModal();
    });

    dom.homeLogoBtn?.addEventListener("click", () => {
      setProfileDropdown(false);
    });
  }

  function bindAuthForms() {
    const dom = getDom();

    dom.closeAuthBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      closeAuthModal();
    });

    dom.authModal?.addEventListener("click", (e) => {
      if (e.target === dom.authModal) closeAuthModal();
    });

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("#go-to-register, [data-auth-view='register']");
      if (trigger) {
        e.preventDefault();
        switchAuthView("register");
      }
    });

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("#go-to-login, [data-auth-view='login']");
      if (trigger) {
        e.preventDefault();
        switchAuthView("login");
      }
    });

    document.addEventListener("click", (e) => {
      const trigger = e.target.closest("#go-to-forgot, [data-auth-view='forgot']");
      if (trigger) {
        e.preventDefault();
        switchAuthView("forgot");
      }
    });

    $all(".toggle-pass-btn").forEach((btn) => {
      btn.addEventListener("click", () => handlePasswordToggleClick(btn));
    });

    const registerPassword =
      dom.registerForm?.querySelector("input[type='password']") || $("#reg-password");
    registerPassword?.addEventListener("input", () =>
      updatePasswordStrength(registerPassword)
    );

    dom.loginForm?.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!auth) {
        setAuthMessage(t("auth_unavailable"), "error");
        return;
      }

      setAuthMessage(t("loading"), "success");
      try {
        await loginWithEmail(dom.loginForm);
        setAuthMessage(t("login_success"), "success");
      } catch (error) {
        setAuthMessage(humanFirebaseError(error?.code), "error");
      }
    });

    dom.registerForm?.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!auth) {
        setAuthMessage(t("auth_unavailable"), "error");
        return;
      }

      setAuthMessage(t("loading"), "success");
      try {
        await registerWithEmail(dom.registerForm);
        setAuthMessage(t("register_success"), "success");
      } catch (error) {
        setAuthMessage(humanFirebaseError(error?.code), "error");
      }
    });

    dom.forgotForm?.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!auth) {
        setAuthMessage(t("auth_unavailable"), "error");
        return;
      }

      setAuthMessage(t("loading"), "success");
      try {
        await sendPasswordReset(dom.forgotForm);
      } catch (error) {
        setAuthMessage(humanFirebaseError(error?.code), "error");
      }
    });

    dom.googleButtons.forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();

        if (!auth || !googleProvider) {
          setAuthMessage(t("auth_unavailable"), "error");
          return;
        }

        setAuthMessage(t("loading"), "success");
        try {
          await signInWithGoogle();
        } catch (error) {
          setAuthMessage(
            humanFirebaseError(error?.code) || t("sign_in_google_failed"),
            "error"
          );
        }
      });
    });

    if (isAuthPage()) {
      switchAuthView(readHashView());
    }
  }

  function bindListingsEvents() {
    const dom = getDom();

    dom.searchBtn?.addEventListener("click", () => {
      state.activeSearch = normalizeText(dom.destinationInput?.value);
      renderListings();
    });

    dom.destinationInput?.addEventListener(
      "input",
      debounce(() => {
        state.activeSearch = normalizeText(dom.destinationInput?.value);
        renderListings();
      }, 180)
    );

    dom.destinationInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        state.activeSearch = normalizeText(dom.destinationInput?.value);
        renderListings();
      }
    });

    dom.clearSearchBtn?.addEventListener("click", () => {
      state.activeSearch = "";
      if (dom.destinationInput) dom.destinationInput.value = "";
      renderListings();
    });

    dom.sortSelect?.addEventListener("change", () => {
      const raw = normalizeText(dom.sortSelect.value).toLowerCase();
      state.sort =
        raw === "rating" || raw === "price_low" || raw === "price_high"
          ? raw
          : "featured";
      renderListings();
    });

    dom.categoryButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        state.activeCategory = normalizeText(
          btn.dataset.category || btn.dataset.categoryBtn || "all"
        ).toLowerCase();
        renderListings();
      });
    });

    document.addEventListener("click", (e) => {
      const favBtn = e.target.closest("[data-fav-id]");
      if (favBtn) {
        e.preventDefault();
        const propertyId = favBtn.getAttribute("data-fav-id");
        const property = getPropertyById(propertyId) || resolveSelectedProperty();
        if (property) toggleFavorite(property);
        else {
          if (isFavoriteId(propertyId)) removeFavoriteId(propertyId);
          else addFavoriteId(propertyId);
          showFavToast(isFavoriteId(propertyId) ? t("fav_added") : t("fav_removed"));
        }
        updateFavoriteButtonsEverywhere();

        if (state.currentView === "favorites") {
          renderListings();
        }
        return;
      }

      const detailsBtn = e.target.closest("[data-action='details']");
      if (detailsBtn) {
        e.preventDefault();
        const propertyId = detailsBtn.getAttribute("data-property-id");
        const property = getPropertyById(propertyId);
        if (property) openPropertyDetails(property);
        return;
      }

      const reserveBtn = e.target.closest("[data-action='reserve']");
      if (reserveBtn) {
        e.preventDefault();
        const propertyId = reserveBtn.getAttribute("data-property-id");
        const property = getPropertyById(propertyId);
        if (property) handleReserveNow(property);
      }
    });
  }

  function bindPropertyPageEvents() {
    const dom = getDom();

    dom.propertyFavBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (!state.selectedProperty) return;
      toggleFavorite(state.selectedProperty);
      updateFavoriteButtonsEverywhere();
    });

    dom.shareBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      handleShare();
    });

    [dom.contactHostBtn, $("#host-chat-btn"), $("#booking-chat-btn"), dom.chatOpenBtn]
      .filter(Boolean)
      .forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const propertyId =
            getNavigationPropertyId(state.selectedProperty) ||
            resolveSelectedPropertyIdFromUrlOrStorage();
          openChatModal(propertyId);
        });
      });

    dom.galleryPrev?.addEventListener("click", prevSlide);
    dom.galleryNext?.addEventListener("click", nextSlide);
    dom.galleryFullscreen?.addEventListener("click", openLightbox);

    dom.galleryDots?.addEventListener("click", (e) => {
      const dot = e.target.closest("[data-slide-index]");
      if (!dot) return;
      goToSlide(Number(dot.getAttribute("data-slide-index")) || 0);
    });

    dom.galleryThumbs?.addEventListener("click", (e) => {
      const thumb = e.target.closest("[data-thumb-index]");
      if (!thumb) return;
      goToSlide(Number(thumb.getAttribute("data-thumb-index")) || 0);
    });

    dom.lightboxClose?.addEventListener("click", closeLightbox);
    dom.lightboxPrev?.addEventListener("click", prevSlide);
    dom.lightboxNext?.addEventListener("click", nextSlide);

    dom.lightbox?.addEventListener("click", (e) => {
      if (e.target === dom.lightbox) closeLightbox();
    });

    dom.lightboxImg?.addEventListener("click", toggleZoom);

    document.addEventListener("keydown", (e) => {
      const lightboxOpen = !!dom.lightbox?.classList.contains("active");
      const chatOpen = !!dom.chatModal?.classList.contains("active");
      const authOpen = !!dom.authModal?.classList.contains("active");
      const bookingsOpen = !!dom.bookingsModal?.classList.contains("active");

      if (e.key === "Escape") {
        if (lightboxOpen) closeLightbox();
        else if (chatOpen) closeChatModal();
        else if (bookingsOpen) closeModal(dom.bookingsModal);
        else if (authOpen) closeAuthModal();
      }

      if (lightboxOpen) {
        if (e.key === "ArrowRight") {
          if (isArabic()) prevSlide();
          else nextSlide();
        }
        if (e.key === "ArrowLeft") {
          if (isArabic()) nextSlide();
          else prevSlide();
        }
      }
    });
  }

  function bindBookingsEvents() {
    const dom = getDom();

    dom.closeBookingsBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal(dom.bookingsModal);
    });

    dom.bookingsModal?.addEventListener("click", (e) => {
      if (e.target === dom.bookingsModal) closeModal(dom.bookingsModal);
    });
  }

  function bindChatEvents() {
    const dom = getDom();

    dom.chatOpenBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      openChatModal(
        getNavigationPropertyId(state.selectedProperty) ||
          resolveSelectedPropertyIdFromUrlOrStorage()
      );
    });

    dom.chatCloseBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      closeChatModal();
    });

    dom.chatModal?.addEventListener("click", (e) => {
      if (e.target === dom.chatModal) closeChatModal();
    });

    dom.chatSendBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      sendChatMessage();
    });

    dom.chatTextarea?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }

  function bindMiscEvents() {
    const dom = getDom();

    dom.mobileFavBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = ROUTES.favorites;
    });

    dom.mobileProfileBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (state.user) {
        setProfileDropdown(!state.profileDropdownOpen);
      } else {
        openAuthModal("login");
      }
    });

    dom.mobileStaysBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = ROUTES.home;
    });

    dom.scrollTopBtn?.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("storage", (e) => {
      if (!e.key) return;

      const themeKeys = new Set(STORAGE_ALIASES.theme);
      const langKeys = new Set(STORAGE_ALIASES.lang);

      if (themeKeys.has(e.key)) {
        applyTheme(safeGetAny(STORAGE_ALIASES.theme, "light"), false);
      }

      if (langKeys.has(e.key)) {
        applyLanguage(safeGetAny(STORAGE_ALIASES.lang, "en"), false);
      }

      if (
        e.key === STORAGE_KEYS.favoritesGuest ||
        e.key === getFavoritesKeyForUser(state.user?.uid || "") ||
        e.key === getLegacyFavoritesKey(state.user?.uid || "")
      ) {
        state.favorites = getFavoriteIds();
        updateFavoriteButtonsEverywhere();
        if (state.currentView === "favorites") renderListings();
      }
    });
  }

  /* =========================================
     19) INIT
  ========================================= */
  async function initializeData() {
    await loadLiveProperties();

    if (state.currentView === "home" || state.currentView === "favorites") {
      renderListings();
    }

    if (state.currentView === "property") {
      await loadPropertyPage();
    }
  }

  async function init() {
    if (state.initialized) return;
    state.initialized = true;
    state.currentView = detectCurrentView();

    initFirebase();
    await setAuthPersistenceFromRemember();
    attachAuthObserver();

    applyTheme(state.theme, false);
    applyLanguage(state.lang, false);

    bindThemeAndLanguage();
    bindProfileMenu();
    bindAuthForms();
    bindListingsEvents();
    bindPropertyPageEvents();
    bindBookingsEvents();
    bindChatEvents();
    bindMiscEvents();

    updateAuthUI();
    updateChatUnreadBadge();
    applyTranslations();

    try {
      await initializeData();
    } catch (error) {
      console.error("Initialization error:", error);
      if (state.currentView === "home" || state.currentView === "favorites") {
        renderListings();
      }
      showToast(t("property_load_error"), "info");
    }

    syncPhosphorIcons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
