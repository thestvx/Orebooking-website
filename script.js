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
   - fixed / completed / production-safe
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
    postAuthRedirect: "ore_post_auth_redirect",
    bookingsGuest: "ore_bookings_guest",
    bookingsUserPrefix: "ore_bookings_user_",
    chatGuest: "ore_chat_guest",
    chatUserPrefix: "ore_chat_user_",
    unreadGuest: "ore_chat_unread_guest",
    unreadUserPrefix: "ore_chat_unread_user_",
    guestBasics: "ore_guest_basics"
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
    profileDropdownOpen: false,
    revealObserver: null
  };

  let firebaseReady = false;
  let auth = null;
  let db = null;
  let googleProvider = null;
  let authObserverAttached = false;
  let autoReplyTimer = null;
  let dom = null;

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
      favorites_title: "Saved properties",
      sort_featured: "Featured",
      sort_rating: "Top rated",
      sort_price_low: "Price: low to high",
      sort_price_high: "Price: high to low",
      no_results_title: "No properties found",
      no_results_text: "Try another city, category, or clear the search.",
      no_favorites_title: "No favorites yet",
      no_favorites_text: "Save properties to access them quickly later.",
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
      google_signin_unavailable: "Google sign-in is unavailable right now.",
      account: "Account",
      stays: "Stays",
      sending: "Sending...",
      creating: "Creating...",
      processing: "Processing...",
      copied: "Copied successfully.",
      clear: "Clear",
      adults: "Adults",
      children: "Children",
      continue_booking: "Continue booking"
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
      favorites_title: "العقارات المحفوظة",
      sort_featured: "المميزة",
      sort_rating: "الأعلى تقييمًا",
      sort_price_low: "السعر: من الأقل إلى الأعلى",
      sort_price_high: "السعر: من الأعلى إلى الأقل",
      no_results_title: "لم يتم العثور على عقارات",
      no_results_text: "جرّب مدينة أخرى، أو فئة مختلفة، أو امسح البحث.",
      no_favorites_title: "لا توجد مفضلة بعد",
      no_favorites_text: "احفظ بعض العقارات لتصل إليها بسرعة لاحقًا.",
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
      google_signin_unavailable: "تسجيل الدخول عبر Google غير متاح الآن.",
      account: "الحساب",
      stays: "الإقامات",
      sending: "جارٍ الإرسال...",
      creating: "جارٍ الإنشاء...",
      processing: "جارٍ المعالجة...",
      copied: "تم النسخ بنجاح.",
      clear: "مسح",
      adults: "بالغون",
      children: "أطفال",
      continue_booking: "إكمال الحجز"
    }
  };

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

  function refreshDom() {
    dom = {
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
      loginSubmitBtn: firstExisting(["#login-submit-btn", "#login-form button[type='submit']"]),
      registerSubmitBtn: firstExisting(["#register-submit-btn", "#register-form button[type='submit']"]),
      forgotSubmitBtn: firstExisting(["#forgot-submit-btn", "#forgot-form button[type='submit']"]),

      listingsGrid: firstExisting(["#listings-grid", ".listings-grid"]),
      sortSelect: firstExisting(["#sort-select", "[data-sort-select]"]),
      clearSearchBtn: firstExisting(["#clear-search-btn", "[data-clear-search]"]),

      destinationInput: firstExisting(["#destination-input", "#search-location", "input[data-search='destination']"]),
      searchBtn: firstExisting(["#search-btn", "#main-search-btn", "[data-main-search]"]),
      categoryButtons: $all(".category-item[data-category], [data-category-btn], .category-chip[data-category]"),

      sectionTitle: firstExisting(["#section-main-title", "[data-section-title]", ".section-header-wrapper h2"]),
      sectionSubtext: firstExisting(["#section-subtitle", ".section-header-wrapper p"]),

      bookingsModal: firstExisting(["#bookings-modal", ".bookings-modal", "[data-bookings-modal]"]),
      closeBookingsBtn: firstExisting(["#close-bookings-btn", "[data-close-bookings]", ".close-bookings-btn"]),
      bookingsList: firstExisting(["#bookings-list", "[data-bookings-list]", ".bookings-body"]),

      chatModal: firstExisting(["#chat-modal", ".chat-modal", "[data-chat-modal]"]),
      chatOpenBtn: firstExisting(["#chat-open-btn", "[data-chat-open]", ".chat-fab-btn", "#open-chat-btn"]),
      chatCloseBtn: firstExisting(["#chat-close-btn", "#close-chat-btn", "[data-chat-close]"]),
      chatSendBtn: firstExisting(["#chat-send-btn", "#send-chat-btn", "[data-chat-send]"]),
      chatTextarea: firstExisting(["#chat-textarea", "#chat-message-input", "[data-chat-textarea]", ".chat-input-area textarea"]),
      chatMessages: firstExisting(["#chat-messages", "[data-chat-messages]", ".chat-body"]),
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

      lightbox: firstExisting(["#lightbox", ".lightbox-overlay"]),
      lightboxImg: firstExisting(["#lightbox-img", ".lightbox-img"]),
      lightboxClose: firstExisting(["#close-lightbox-btn", ".close-lightbox"]),
      lightboxPrev: firstExisting(["#lightbox-prev-btn", ".lightbox-btn.prev-btn"]),
      lightboxNext: firstExisting(["#lightbox-next-btn", ".lightbox-btn.next-btn"])
    };
    return dom;
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

  function unique(arr) {
    return Array.from(new Set((arr || []).filter(Boolean)));
  }

  function normalizeLang(value) {
    const raw = normalizeText(value).toLowerCase();
    if (raw === "ar" || raw === "arabic" || raw === "rtl") return "ar";
    return "en";
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

  function safeCall(fn, fallback = null) {
    try {
      return fn();
    } catch (err) {
      console.error(err);
      return fallback;
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

  function setText(el, value) {
    if (el) el.textContent = value;
  }

  function setHtml(el, value) {
    if (el) el.innerHTML = value;
  }

  function setValue(el, value) {
    if (el) el.value = value;
  }

  function setSrc(el, value, fallback = "") {
    if (!el) return;
    el.src = value || fallback;
    if (fallback) {
      el.onerror = function () {
        this.onerror = null;
        this.src = fallback;
      };
    }
  }

  function pick(...values) {
    for (const value of values) {
      if (Array.isArray(value) && value.length) return value;
      if (normalizeText(value) !== "") return value;
    }
    return "";
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

  function setButtonLoading(btn, loading, label = "") {
    if (!btn) return;
    if (loading) {
      btn.disabled = true;
      if (!btn.dataset.originalHtml) btn.dataset.originalHtml = btn.innerHTML;
      btn.innerHTML = `<i class="ph ph-spinner-gap ph-spin"></i><span>${escapeHtml(label || t("processing"))}</span>`;
    } else {
      btn.disabled = false;
      if (btn.dataset.originalHtml) btn.innerHTML = btn.dataset.originalHtml;
    }
    syncPhosphorIcons();
  }

  function showToast(message, type = "success") {
    refreshDom();
    let host = dom.toastContainer || document.getElementById("global-toast-host");

    if (!host) {
      host = document.createElement("div");
      host.id = "global-toast-host";
      host.style.cssText =
        "position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:min(92vw,360px)";
      document.body.appendChild(host);
    }

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;

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
    refreshDom();
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
      "auth/missing-password": t("fill_required"),
      "auth/user-not-found": t("invalid_credentials"),
      "auth/wrong-password": t("invalid_credentials"),
      "auth/invalid-credential": t("invalid_credentials"),
      "auth/invalid-login-credentials": t("invalid_credentials"),
      "auth/email-already-in-use": state.lang === "ar" ? "هذا البريد مستخدم بالفعل." : "This email is already in use.",
      "auth/weak-password": state.lang === "ar" ? "كلمة المرور ضعيفة جدًا." : "Password is too weak.",
      "auth/network-request-failed": state.lang === "ar" ? "تحقق من الاتصال بالإنترنت." : "Check your internet connection.",
      "auth/popup-closed-by-user": state.lang === "ar" ? "تم إغلاق نافذة Google قبل إكمال العملية." : "Google popup was closed before completion.",
      "auth/popup-blocked": state.lang === "ar" ? "تم حظر نافذة Google من المتصفح." : "Google popup was blocked by the browser.",
      "auth/too-many-requests": state.lang === "ar" ? "عدد المحاولات كبير، حاول لاحقًا." : "Too many attempts. Try again later.",
      "permission-denied": state.lang === "ar" ? "ليس لديك صلاحية لتنفيذ هذه العملية." : "You do not have permission to perform this action."
    };

    return map[normalizeText(code)] || t("auth_unavailable");
  }

  /* =========================================
     8) FIREBASE
  ========================================= */
  function initFirebase() {
    try {
      if (typeof window.firebase === "undefined") {
        state.authReady = false;
        state.firestoreReady = false;
        return;
      }

      if (!window.firebase.apps?.length) {
        window.firebase.initializeApp(firebaseConfig);
      }

      auth = typeof window.firebase.auth === "function" ? window.firebase.auth() : null;
      db = typeof window.firebase.firestore === "function" ? window.firebase.firestore() : null;
      googleProvider =
        typeof window.firebase.auth?.GoogleAuthProvider === "function"
          ? new window.firebase.auth.GoogleAuthProvider()
          : null;

      firebaseReady = !!(auth || db);
      state.authReady = !!auth;
      state.firestoreReady = !!db;
    } catch (err) {
      console.error("Firebase init error:", err);
      firebaseReady = false;
      state.authReady = false;
      state.firestoreReady = false;
    }
  }

  /* =========================================
     9) THEME / LANGUAGE / I18N
  ========================================= */
  function applyTheme() {
    refreshDom();
    const isDark = state.theme === "dark";
    dom.html.classList.toggle("dark", isDark);
    dom.body?.classList.toggle("dark", isDark);
    dom.html.style.colorScheme = isDark ? "dark" : "light";
    dom.html.classList.remove("preload-dark");

    const icon = dom.themeBtn?.querySelector("i");
    if (icon) {
      icon.className = isDark ? "ph ph-sun" : "ph ph-moon";
    }

    syncPhosphorIcons();
  }

  function updateDirection() {
    refreshDom();
    dom.html.lang = state.lang;
    dom.html.dir = state.lang === "ar" ? "rtl" : "ltr";
  }

  function updateLangButton() {
    refreshDom();
    const span = dom.langBtn?.querySelector("span");
    const label = state.lang === "ar" ? "EN" : "AR";
    if (span) span.textContent = label;
    else if (dom.langBtn) dom.langBtn.textContent = label;
  }

  function setTextPreservingIcon(el, text) {
    if (!el) return;
    const icon = Array.from(el.children).find((child) => child.tagName === "I");
    if (!icon) {
      el.textContent = text;
      return;
    }

    const iconClone = icon.cloneNode(true);
    el.innerHTML = "";
    el.appendChild(iconClone);
    el.appendChild(document.createTextNode(` ${text}`));
  }

  function cacheOriginalLocalizedContent() {
    document.querySelectorAll("[data-i18n], [data-i18n-placeholder], [data-i18n-title]").forEach((el) => {
      if (el.hasAttribute("data-i18n") && !("i18nOriginalText" in el.dataset)) {
        el.dataset.i18nOriginalText = el.textContent || "";
      }
      if (el.hasAttribute("data-i18n-placeholder") && !("i18nOriginalPlaceholder" in el.dataset)) {
        el.dataset.i18nOriginalPlaceholder = el.getAttribute("placeholder") || "";
      }
      if (el.hasAttribute("data-i18n-title") && !("i18nOriginalTitle" in el.dataset)) {
        el.dataset.i18nOriginalTitle = el.getAttribute("title") || "";
      }
    });
  }

  function applyTranslations() {
    cacheOriginalLocalizedContent();

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const translated = translateOptional(key);
      if (translated != null) setTextPreservingIcon(el, translated);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      const translated = translateOptional(key);
      if (translated != null) el.setAttribute("placeholder", translated);
    });

    document.querySelectorAll("[data-i18n-title]").forEach((el) => {
      const key = el.getAttribute("data-i18n-title");
      const translated = translateOptional(key);
      if (translated != null) el.setAttribute("title", translated);
    });

    if (!state.selectedProperty) {
      document.title = t("page_title");
    }
  }

  function applyLanguageAndTheme() {
    updateDirection();
    updateLangButton();
    applyTheme();
    applyTranslations();
    renderDynamicText();
    syncPhosphorIcons();
  }

  /* =========================================
     10) UI / MODALS
  ========================================= */
  function openModal(el) {
    if (!el) return;
    el.classList.add("active");
    document.body.classList.add("modal-open");
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove("active");
    const hasActive = $all(".modal-overlay.active, .lightbox-overlay.active, .profile-dropdown.active").length > 0;
    if (!hasActive) document.body.classList.remove("modal-open");
  }

  function openAuthModal(view = "login") {
    refreshDom();
    switchAuthForm(view);
    clearAuthMessage();
    if (dom.authModal) {
      openModal(dom.authModal);
      return;
    }
    window.location.href = getAuthUrl(view);
  }

  function closeAuthModal() {
    refreshDom();
    closeModal(dom.authModal);
  }

  function switchAuthForm(view = "login") {
    refreshDom();
    const forms = {
      login: dom.loginForm,
      register: dom.registerForm,
      forgot: dom.forgotForm
    };

    Object.entries(forms).forEach(([key, form]) => {
      if (!form) return;
      form.classList.toggle("active", key === view);
      form.hidden = key !== view;
    });

    try {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${encodeURIComponent(view)}`);
    } catch (_) {}
  }

  function toggleProfileDropdown(force = null) {
    refreshDom();
    if (!dom.profileDropdown) return;

    const isActive =
      typeof force === "boolean"
        ? force
        : !dom.profileDropdown.classList.contains("active");

    dom.profileDropdown.classList.toggle("active", isActive);
    dom.profileTrigger?.setAttribute("aria-expanded", isActive ? "true" : "false");
    state.profileDropdownOpen = isActive;
  }

  function setAuthMessage(message, type = "error") {
    refreshDom();
    if (!dom.authMessage) {
      showToast(message, type === "error" ? "error" : "success");
      return;
    }

    dom.authMessage.className = `auth-message ${type}`;
    dom.authMessage.textContent = message;
  }

  function clearAuthMessage() {
    refreshDom();
    if (!dom.authMessage) return;
    dom.authMessage.className = "auth-message";
    dom.authMessage.textContent = "";
  }

  /* =========================================
     11) AUTH
  ========================================= */
  function getCurrentUserId() {
    return state.user?.uid || "guest";
  }

  function getGuestBasics() {
    return safeJsonGet(STORAGE_KEYS.guestBasics, {});
  }

  function saveGuestBasics(data) {
    const current = getGuestBasics();
    safeJsonSet(STORAGE_KEYS.guestBasics, { ...current, ...data });
  }

  function updateAuthUI() {
    refreshDom();

    const guestBasics = getGuestBasics();
    const name = normalizeText(state.user?.displayName || guestBasics.name || t("guest_user"));
    const email = normalizeText(state.user?.email || guestBasics.email || t("sign_in_to_continue"));

    setText(dom.profileName, name);
    setText(dom.profileEmail, email);

    if (dom.authCta) {
      const isLogged = !!state.user;
      dom.authCta.classList.toggle("auth-btn-guest", !isLogged);
      dom.authCta.classList.toggle("auth-btn-logged", isLogged);
      dom.authCta.setAttribute("aria-label", isLogged ? t("account") : t("sign_in"));

      const icon = dom.authCta.querySelector("i");
      if (icon) {
        icon.className = isLogged ? "ph ph-user-circle-check" : "ph ph-user";
      }
    }

    renderUnreadBadge();
    syncPhosphorIcons();
  }

  function readRememberMe() {
    return safeGet(STORAGE_KEYS.remember, "0") === "1";
  }

  function handlePostAuthRedirect() {
    const fromStorage = safeGet(STORAGE_KEYS.postAuthRedirect, "");
    const fromUrl = getRedirectTargetFromUrl();
    const redirect = fromStorage || fromUrl;

    safeRemove(STORAGE_KEYS.postAuthRedirect);

    if (!redirect) return;
    if (redirect === currentPageWithSearch()) return;

    setTimeout(() => {
      window.location.href = redirect;
    }, 250);
  }

  async function signInWithEmail(email, password) {
    if (!auth) {
      setAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    try {
      clearAuthMessage();
      setButtonLoading(dom.loginSubmitBtn, true, t("sign_in"));
      await auth.signInWithEmailAndPassword(email, password);
      saveGuestBasics({ email });
      showToast(t("login_success"), "success");
      closeAuthModal();
      handlePostAuthRedirect();
    } catch (err) {
      setAuthMessage(humanFirebaseError(err?.code), "error");
    } finally {
      setButtonLoading(dom.loginSubmitBtn, false);
    }
  }

  async function registerWithEmail(name, email, password) {
    if (!auth) {
      setAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    try {
      clearAuthMessage();
      setButtonLoading(dom.registerSubmitBtn, true, t("creating"));
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      if (cred?.user && name) {
        await cred.user.updateProfile({ displayName: name });
      }
      saveGuestBasics({ name, email });
      showToast(t("register_success"), "success");
      closeAuthModal();
      handlePostAuthRedirect();
    } catch (err) {
      setAuthMessage(humanFirebaseError(err?.code), "error");
    } finally {
      setButtonLoading(dom.registerSubmitBtn, false);
    }
  }

  async function sendPasswordReset(email) {
    if (!auth) {
      setAuthMessage(t("auth_unavailable"), "error");
      return;
    }

    try {
      clearAuthMessage();
      setButtonLoading(dom.forgotSubmitBtn, true, t("send_link"));
      await auth.sendPasswordResetEmail(email);
      setAuthMessage(t("reset_sent"), "success");
    } catch (err) {
      setAuthMessage(humanFirebaseError(err?.code), "error");
    } finally {
      setButtonLoading(dom.forgotSubmitBtn, false);
    }
  }

  async function signInWithGoogle() {
    if (!auth || !googleProvider) {
      setAuthMessage(t("google_signin_unavailable"), "error");
      return;
    }

    try {
      clearAuthMessage();
      await auth.signInWithPopup(googleProvider);
      showToast(t("login_success"), "success");
      closeAuthModal();
      handlePostAuthRedirect();
    } catch (err) {
      setAuthMessage(humanFirebaseError(err?.code) || t("sign_in_google_failed"), "error");
    }
  }

  async function logoutUser() {
    try {
      if (auth) await auth.signOut();
      toggleProfileDropdown(false);
      showToast(t("logout_success"), "success");
    } catch (err) {
      console.error("Logout error:", err);
      showToast(t("auth_unavailable"), "error");
    }
  }

  function attachAuthObserver() {
    if (!auth || authObserverAttached) return;
    authObserverAttached = true;

    auth.onAuthStateChanged(async (user) => {
      state.user = user || null;
      mergeGuestFavoritesIntoUser();
      loadFavorites();
      updateAuthUI();
      if (state.currentView === "favorites" || state.currentView === "home") {
        renderListings();
      }
      if (state.currentView === "property") {
        updatePropertyActionButtons();
      }
      if (state.bookings.length || state.currentView === "property") {
        await loadBookings();
      }
    });
  }

  /* =========================================
     12) FAVORITES
  ========================================= */
  function getFavoritesStorageKey() {
    return state.user
      ? `${STORAGE_KEYS.favorites}_${state.user.uid}`
      : STORAGE_KEYS.favoritesGuest;
  }

  function loadFavorites() {
    const fromCurrent = safeJsonGet(getFavoritesStorageKey(), null);
    const common = safeJsonGetAny(STORAGE_ALIASES.favoritesCommon, []);
    state.favorites = unique([...(fromCurrent || []), ...(common || [])].map(String));
  }

  function saveFavorites() {
    safeJsonSet(getFavoritesStorageKey(), state.favorites);
    safeJsonSetMany(STORAGE_ALIASES.favoritesCommon, state.favorites);
  }

  function mergeGuestFavoritesIntoUser() {
    if (!state.user) return;
    const guest = safeJsonGet(STORAGE_KEYS.favoritesGuest, []);
    const userKey = getFavoritesStorageKey();
    const currentUserFavorites = safeJsonGet(userKey, []);
    const merged = unique([...(currentUserFavorites || []), ...(guest || [])].map(String));

    safeJsonSet(userKey, merged);
    safeJsonSetMany(STORAGE_ALIASES.favoritesCommon, merged);
    if ((guest || []).length) safeRemove(STORAGE_KEYS.favoritesGuest);
  }

  function isFavorite(propertyId) {
    return state.favorites.includes(String(propertyId));
  }

  function toggleFavorite(property) {
    if (!property?.id) return;

    const id = String(property.id);
    if (isFavorite(id)) {
      state.favorites = state.favorites.filter((x) => String(x) !== id);
      saveFavorites();
      showFavToast(t("fav_removed"));
    } else {
      state.favorites = unique([...state.favorites, id]);
      saveFavorites();
      showFavToast(t("fav_added"));
    }

    updateAllFavoriteButtons(id);
    if (state.currentView === "favorites") renderListings();
  }

  function favoriteIconHtml(propertyId) {
    const active = isFavorite(propertyId);
    return `<i class="${active ? "ph-fill" : "ph"} ph-heart"></i>`;
  }

  function updateAllFavoriteButtons(propertyId = "") {
    $all("[data-action='toggle-favorite']").forEach((btn) => {
      const btnId = String(btn.dataset.propertyId || "");
      const isActive = isFavorite(btnId);
      btn.classList.toggle("active", isActive);
      if (!propertyId || btnId === String(propertyId)) {
        btn.innerHTML = favoriteIconHtml(btnId);
      }
    });

    if (dom?.propertyFavBtn && state.selectedProperty?.id) {
      const active = isFavorite(state.selectedProperty.id);
      dom.propertyFavBtn.classList.toggle("active", active);
      const labelEl = $("#fav-btn-text", dom.propertyFavBtn) || $("span", dom.propertyFavBtn);
      const icon = $("i", dom.propertyFavBtn);
      if (icon) icon.className = active ? "ph-fill ph-heart" : "ph ph-heart";
      if (labelEl) labelEl.textContent = active ? t("saved") : t("save");
    }

    syncPhosphorIcons();
  }

  /* =========================================
     13) PROPERTY NORMALIZATION
  ========================================= */
  function featureIcon(featureKey) {
    const key = normalizeText(featureKey).toLowerCase();
    const map = {
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
      balcony: "ph-buildings",
      "شرفة": "ph-buildings",
      breakfast: "ph-coffee",
      "إفطار": "ph-coffee",
      security: "ph-shield-check",
      "حماية": "ph-shield-check",
      tv: "ph-television",
      "تلفاز": "ph-television",
      beach: "ph-wave-sine",
      "وصول للشاطئ": "ph-wave-sine"
    };
    return map[key] || "ph-check-circle";
  }

  function translateFeature(feature) {
    const raw = normalizeText(feature).toLowerCase();
    const englishKeys = [
      "wifi",
      "pool",
      "parking",
      "gym",
      "restaurant",
      "spa",
      "kitchen",
      "ac",
      "balcony",
      "breakfast",
      "security",
      "tv",
      "beach"
    ];

    if (englishKeys.includes(raw)) return t(raw);
    return feature;
  }

  function normalizeFeatures(raw) {
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === "string") {
      return raw
        .split(/[|,]/)
        .map((x) => x.trim())
        .filter(Boolean);
    }
    return [];
  }

  function normalizeImages(raw) {
    const list = [];
    const candidates = [
      ...(Array.isArray(raw?.images) ? raw.images : []),
      ...(Array.isArray(raw?.gallery) ? raw.gallery : []),
      ...(Array.isArray(raw?.photos) ? raw.photos : []),
      ...(Array.isArray(raw?.media) ? raw.media : [])
    ];

    const mainImage = pick(raw?.image, raw?.imageUrl, raw?.cover, raw?.thumbnail);
    if (mainImage) list.push(mainImage);

    candidates.forEach((item) => {
      if (typeof item === "string") list.push(item);
      else if (item && typeof item === "object") {
        list.push(item.url || item.src || item.image || "");
      }
    });

    const cleaned = unique(list.filter((x) => /^https?:\/\//i.test(String(x))));
    return cleaned.length ? cleaned : ["https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80"];
  }

  function normalizeProperty(raw = {}, docId = "") {
    const titleEn = pick(raw.title_en, raw.titleEn, raw.name_en, raw.nameEn, raw.title, raw.name, t("unnamed_property"));
    const titleAr = pick(raw.title_ar, raw.titleAr, raw.name_ar, raw.nameAr, raw.titleArAlt, titleEn);
    const locationEn = pick(
      raw.location_en,
      raw.locationEn,
      raw.location,
      raw.city,
      [raw.city, raw.wilaya].filter(Boolean).join(", "),
      t("unknown_location")
    );
    const locationAr = pick(
      raw.location_ar,
      raw.locationAr,
      raw.location,
      raw.cityAr,
      [raw.cityAr, raw.wilayaAr].filter(Boolean).join("، "),
      locationEn
    );

    const typeRaw = normalizeText(pick(raw.type, raw.category, raw.kind, raw.propertyType, "hotel")).toLowerCase();
    const typeKey = ["hotel", "apartment", "villa", "resort", "cabin"].includes(typeRaw)
      ? typeRaw
      : "hotel";

    const images = normalizeImages(raw);
    const id = String(
      pick(raw.id, raw.slug, raw.propertyId, raw.listingId, raw.docId, docId, slugify(titleEn) || "property")
    );

    const featuresEn = normalizeFeatures(raw.features_en || raw.featuresEn || raw.amenities_en || raw.amenities || raw.features);
    const featuresAr = normalizeFeatures(raw.features_ar || raw.featuresAr);

    const maxGuests = Math.max(
      1,
      safeNumber(pick(raw.maxGuests, raw.capacity, raw.guests, raw.max_guests, raw.adults), 2)
    );

    const bedrooms = Math.max(
      1,
      safeNumber(pick(raw.bedrooms, raw.rooms, raw.roomCount, raw.beds), 1)
    );

    return {
      id,
      docId: String(docId || raw.docId || raw.id || ""),
      title_en: titleEn,
      title_ar: titleAr,
      location_en: locationEn,
      location_ar: locationAr,
      price: safeNumber(pick(raw.price, raw.pricePerNight, raw.basePrice, raw.amount), 0),
      rating: Math.max(0, safeNumber(pick(raw.rating, raw.stars, raw.score), 4.6)),
      image: images[0],
      images,
      urgency: pick(raw.urgency, raw.badge, raw.label, ""),
      type: typeKey,
      typeEn: translateOptional(typeKey) && state.lang === "ar" ? translations.en[typeKey] : (raw.typeEn || t(typeKey)),
      typeAr: raw.typeAr || translations.ar[typeKey] || raw.type || t("premium_stay"),
      desc_en: pick(raw.desc_en, raw.descEn, raw.description_en, raw.descriptionEn, raw.description, t("no_description")),
      desc_ar: pick(raw.desc_ar, raw.descAr, raw.description_ar, raw.descriptionAr, raw.description, t("no_description")),
      maxGuests,
      bedrooms,
      lat: safeNumber(pick(raw.lat, raw.latitude), 0),
      lng: safeNumber(pick(raw.lng, raw.longitude), 0),
      features_en: featuresEn.length ? featuresEn : ["wifi", "parking", "security"],
      features_ar: featuresAr.length ? featuresAr : [],
      hostName: pick(raw.hostName, raw.host_name, "OreBooking Host"),
      hostSince: pick(raw.hostSince, raw.host_since, "2024"),
      verified: raw.verified !== false
    };
  }

  function propertyTitle(property) {
    return state.lang === "ar"
      ? property.title_ar || property.title_en || t("unnamed_property")
      : property.title_en || property.title_ar || t("unnamed_property");
  }

  function propertyLocation(property) {
    return state.lang === "ar"
      ? property.location_ar || property.location_en || t("unknown_location")
      : property.location_en || property.location_ar || t("unknown_location");
  }

  function propertyDescription(property) {
    return state.lang === "ar"
      ? property.desc_ar || property.desc_en || t("no_description")
      : property.desc_en || property.desc_ar || t("no_description");
  }

  function propertyTypeLabel(property) {
    const key = normalizeText(property.type).toLowerCase();
    if (["hotel", "apartment", "villa", "resort", "cabin"].includes(key)) return t(key);
    return state.lang === "ar" ? property.typeAr || property.typeEn || t("premium_stay") : property.typeEn || property.typeAr || t("premium_stay");
  }

  function propertyFeatures(property) {
    const list =
      state.lang === "ar"
        ? (property.features_ar?.length ? property.features_ar : property.features_en?.map(translateFeature))
        : (property.features_en?.length ? property.features_en.map(translateFeature) : property.features_ar);

    return (list || []).map((item) => ({
      label: state.lang === "ar" ? translateFeature(item) : translateFeature(item),
      icon: featureIcon(item)
    }));
  }

  function getPropertyById(id) {
    const normalized = String(id || "");
    return state.liveProperties.find(
      (prop) => String(prop.id) === normalized || String(prop.docId) === normalized
    );
  }

  function storeSelectedProperty(property) {
    if (!property) return;
    state.selectedProperty = property;
    safeSet(STORAGE_KEYS.selectedPropertyId, property.id);
    safeSet(STORAGE_KEYS.selectedPropertyDocId, property.docId || "");
    safeJsonSetMany(STORAGE_ALIASES.selectedPropertyData, property);
  }

  function readStoredSelectedProperty() {
    const data = safeJsonGetAny(STORAGE_ALIASES.selectedPropertyData, null);
    return data ? normalizeProperty(data, data.docId || data.id || "") : null;
  }

  function currentPropertyIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return (
      normalizeText(params.get("id")) ||
      normalizeText(params.get("propertyId")) ||
      normalizeText(params.get("listingId")) ||
      normalizeText(safeGet(STORAGE_KEYS.selectedPropertyId, ""))
    );
  }

  /* =========================================
     14) LOAD LIVE PROPERTIES
  ========================================= */
  async function fetchCollectionProperties(collectionName) {
    if (!db) return [];
    try {
      const snapshot = await db.collection(collectionName).limit(60).get();
      if (!snapshot || snapshot.empty) return [];
      return snapshot.docs.map((docItem) => normalizeProperty(docItem.data(), docItem.id));
    } catch (err) {
      console.warn(`Collection "${collectionName}" failed`, err);
      return [];
    }
  }

  async function loadLiveProperties() {
    if (state.loadingProperties) return state.liveProperties;
    state.loadingProperties = true;

    try {
      if (db) {
        for (const collectionName of state.propertyCollectionCandidates) {
          const result = await fetchCollectionProperties(collectionName);
          if (result.length) {
            state.liveProperties = result;
            state.currentCollection = collectionName;
            state.propertiesLoaded = true;
            state.loadingProperties = false;
            return state.liveProperties;
          }
        }
      }

      state.liveProperties = fallbackProperties.map((item) => normalizeProperty(item, item.id));
      state.currentCollection = "fallback";
      state.propertiesLoaded = true;
      return state.liveProperties;
    } catch (err) {
      console.error("Properties load error:", err);
      state.liveProperties = fallbackProperties.map((item) => normalizeProperty(item, item.id));
      state.currentCollection = "fallback";
      state.propertiesLoaded = true;
      showToast(t("property_load_error"), "info");
      return state.liveProperties;
    } finally {
      state.loadingProperties = false;
    }
  }

  /* =========================================
     15) LISTINGS / HOME / FAVORITES PAGE
  ========================================= */
  function filteredProperties() {
    let items = [...state.liveProperties];

    if (state.currentView === "favorites") {
      items = items.filter((item) => isFavorite(item.id));
    }

    if (state.activeCategory && state.activeCategory !== "all") {
      items = items.filter((item) => normalizeText(item.type).toLowerCase() === state.activeCategory);
    }

    if (state.activeSearch) {
      const query = normalizeText(state.activeSearch).toLowerCase();
      items = items.filter((item) => {
        const haystack = [
          item.id,
          item.docId,
          item.title_en,
          item.title_ar,
          item.location_en,
          item.location_ar,
          item.type,
          item.typeEn,
          item.typeAr
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(query);
      });
    }

    switch (state.sort) {
      case "rating":
        items.sort((a, b) => b.rating - a.rating);
        break;
      case "price_low":
        items.sort((a, b) => a.price - b.price);
        break;
      case "price_high":
        items.sort((a, b) => b.price - a.price);
        break;
      default:
        items.sort((a, b) => b.rating - a.rating || a.price - b.price);
        break;
    }

    return items;
  }

  function cardHtml(property) {
    return `
      <article class="property-card ore-reveal" data-property-id="${escapeHtml(property.id)}">
        <div class="property-card-media">
          <img src="${escapeHtml(property.image)}" alt="${escapeHtml(propertyTitle(property))}" loading="lazy" />
          ${property.urgency ? `<span class="property-urgency"><i class="ph ph-fire"></i>${escapeHtml(localizeUrgency(property.urgency))}</span>` : ""}
          <button
            type="button"
            class="favorite-btn ${isFavorite(property.id) ? "active" : ""}"
            data-action="toggle-favorite"
            data-property-id="${escapeHtml(property.id)}"
            aria-label="${escapeHtml(t("save_property"))}"
          >
            ${favoriteIconHtml(property.id)}
          </button>
        </div>

        <div class="property-card-body">
          <div class="property-card-top">
            <div class="card-title-wrapper">
              <h3 class="property-card-title">${escapeHtml(propertyTitle(property))}</h3>
              <div class="property-card-location">
                <i class="ph ph-map-pin"></i>
                <span>${escapeHtml(propertyLocation(property))}</span>
              </div>
            </div>

            <div class="property-card-rating">
              <i class="ph-fill ph-star"></i>
              <span>${escapeHtml(property.rating.toFixed(1))}</span>
            </div>
          </div>

          <div class="property-card-meta">
            <i class="ph ph-house-line"></i>
            <span>${escapeHtml(propertyTypeLabel(property))}</span>
          </div>

          <div class="property-card-price">
            <strong>${escapeHtml(formatCurrency(property.price))}</strong>
            <span>${escapeHtml(t("night_suffix"))}</span>
          </div>

          <div class="property-card-actions">
            <button
              type="button"
              class="details-btn"
              data-action="view-details"
              data-property-id="${escapeHtml(property.id)}"
            >
              <i class="ph ph-arrow-square-out"></i>
              <span>${escapeHtml(t("view_details"))}</span>
            </button>

            <button
              type="button"
              class="reserve-btn"
              data-action="reserve-now"
              data-property-id="${escapeHtml(property.id)}"
            >
              <i class="ph ph-calendar-check"></i>
              <span>${escapeHtml(state.user ? t("reserve_now") : t("reserve_cta_signed_out"))}</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }

  function renderEmptyState() {
    if (!dom?.listingsGrid) return;

    const isFavoritesPage = state.currentView === "favorites";
    const title = isFavoritesPage ? t("no_favorites_title") : t("no_results_title");
    const text = isFavoritesPage ? t("no_favorites_text") : t("no_results_text");

    dom.listingsGrid.innerHTML = `
      <div class="listings-empty-state">
        <i class="ph ph-house-line"></i>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
      </div>
    `;
    syncPhosphorIcons();
  }

  function renderSectionHeading() {
    if (!dom?.sectionTitle) return;

    if (state.currentView === "favorites") {
      dom.sectionTitle.textContent = t("favorites_title");
      if (dom.sectionSubtext) dom.sectionSubtext.textContent = t("no_favorites_text");
      return;
    }

    dom.sectionTitle.textContent = t("featured_title");
    if (dom.sectionSubtext) {
      dom.sectionSubtext.textContent = state.activeSearch
        ? `${t("search_hint")}: ${state.activeSearch}`
        : "";
    }
  }

  function renderListings() {
    refreshDom();
    if (!dom.listingsGrid) return;

    renderSectionHeading();

    const items = filteredProperties();
    if (!items.length) {
      renderEmptyState();
      return;
    }

    dom.listingsGrid.innerHTML = items.map(cardHtml).join("");
    updateAllFavoriteButtons();
    initRevealAnimations();
    syncPhosphorIcons();
  }

  function setCategoryButtonsUI() {
    refreshDom();
    dom.categoryButtons.forEach((btn) => {
      const key = normalizeText(btn.dataset.category || btn.dataset.categoryBtn || "").toLowerCase();
      btn.classList.toggle("active", key === state.activeCategory);
    });
  }

  function setSortSelectUI() {
    refreshDom();
    if (dom.sortSelect) dom.sortSelect.value = state.sort;
  }

  function setSearchUI() {
    refreshDom();
    if (dom.destinationInput) dom.destinationInput.value = state.activeSearch;
    if (dom.clearSearchBtn) {
      dom.clearSearchBtn.style.display = state.activeSearch ? "inline-flex" : "none";
    }
  }

  function runSearch() {
    refreshDom();
    state.activeSearch = normalizeText(dom.destinationInput?.value || "");
    setSearchUI();
    renderListings();
  }

  function clearSearch() {
    state.activeSearch = "";
    setSearchUI();
    renderListings();
  }

  /* =========================================
     16) PROPERTY DETAILS PAGE
  ========================================= */
  async function resolvePropertyForDetails() {
    const urlId = currentPropertyIdFromUrl();
    const stored = readStoredSelectedProperty();

    if (urlId) {
      let candidate = getPropertyById(urlId);
      if (!candidate && stored && (String(stored.id) === urlId || String(stored.docId) === urlId)) {
        candidate = stored;
      }
      if (!candidate) {
        candidate = fallbackProperties
          .map((item) => normalizeProperty(item, item.id))
          .find((item) => item.id === urlId || item.docId === urlId);
      }

      if (candidate) {
        storeSelectedProperty(candidate);
        return candidate;
      }

      if (db) {
        for (const collectionName of PROPERTY_COLLECTION_CANDIDATES) {
          try {
            const docRef = await db.collection(collectionName).doc(urlId).get();
            if (docRef?.exists) {
              const property = normalizeProperty(docRef.data(), docRef.id);
              storeSelectedProperty(property);
              return property;
            }
          } catch (_) {}
        }
      }
    }

    if (stored) {
      storeSelectedProperty(stored);
      return stored;
    }

    const fallback = fallbackProperties.map((item) => normalizeProperty(item, item.id))[0];
    storeSelectedProperty(fallback);
    return fallback;
  }

  function updatePropertyActionButtons() {
    refreshDom();
    if (!state.selectedProperty) return;

    const active = isFavorite(state.selectedProperty.id);
    if (dom.propertyFavBtn) {
      dom.propertyFavBtn.classList.toggle("active", active);
      const icon = dom.propertyFavBtn.querySelector("i");
      const textEl = $("#fav-btn-text", dom.propertyFavBtn) || $("span", dom.propertyFavBtn);
      if (icon) icon.className = active ? "ph-fill ph-heart" : "ph ph-heart";
      if (textEl) textEl.textContent = active ? t("saved") : t("save");
    }

    if (dom.bookNowLink) {
      dom.bookNowLink.setAttribute("href", buildBookingUrl(state.selectedProperty));
      const labelEl = $("span", dom.bookNowLink);
      if (labelEl) labelEl.textContent = state.user ? t("reserve_now") : t("reserve_cta_signed_out");
    }

    syncPhosphorIcons();
  }

  function buildBookingUrl(property) {
    const id = encodeURIComponent(property?.id || "");
    return `${ROUTES.booking}?id=${id}`;
  }

  function requireAuthForBooking(property) {
    storeSelectedProperty(property);
    safeSet(STORAGE_KEYS.postAuthRedirect, buildBookingUrl(property));
    safeJsonSet(STORAGE_KEYS.bookingContext, {
      propertyId: property.id,
      propertyTitle: propertyTitle(property),
      createdAt: new Date().toISOString()
    });

    if (dom?.authModal) {
      openAuthModal("login");
      showToast(t("auth_redirect_book"), "info");
    } else {
      window.location.href = getAuthUrl("login");
    }
  }

  function goToDetails(property) {
    storeSelectedProperty(property);
    const id = encodeURIComponent(property.docId || property.id);
    window.location.href = `${ROUTES.details}?id=${id}`;
  }

  function startBooking(property) {
    if (!property) return;
    storeSelectedProperty(property);

    if (!state.user) {
      requireAuthForBooking(property);
      return;
    }

    window.location.href = buildBookingUrl(property);
  }

  function fillPropertyText() {
    const property = state.selectedProperty;
    if (!property) return;

    setText($("#prop-title"), propertyTitle(property));
    setText($("#prop-rating"), property.rating.toFixed(1));
    setText($("#prop-location"), propertyLocation(property));
    setText($("#prop-type-text"), propertyTypeLabel(property));

    const bedroomsLabel =
      property.bedrooms === 1
        ? t("bedrooms_count_one", { n: property.bedrooms })
        : t("bedrooms_count_many", { n: property.bedrooms });

    setText($("#chip-bedrooms"), bedroomsLabel);
    setText($("#chip-guests"), t("up_to_guests", { n: property.maxGuests }));
    setText($("#chip-verified"), t("verified_listing"));
    setText($("#chip-instant"), t("instant_booking_request"));
    setText($("#prop-desc"), propertyDescription(property));

    setText($("#host-name"), property.hostName || "OreBooking Host");
    setText($("#host-since"), `${t("hosting_since")}`.includes("2024") ? t("hosting_since") : `${t("hosting_since")} ${property.hostSince || "2024"}`);
    setText($("#host-badge-text"), t("verified_host"));

    setText($("#highlight-1-title"), t("great_location"));
    setText($("#highlight-1-desc"), t("great_location_desc"));
    setText($("#highlight-2-title"), t("clean_and_comfortable"));
    setText($("#highlight-2-desc"), t("clean_and_comfortable_desc"));
    setText($("#highlight-3-title"), t("responsive_support"));
    setText($("#highlight-3-desc"), t("responsive_support_desc"));
    setText($("#highlight-4-title"), t("trusted_listing"));
    setText($("#highlight-4-desc"), t("trusted_listing_desc"));

    setText($("#perk-1"), t("free_cancellation_24h"));
    setText($("#perk-2"), t("instant_confirmation"));
    setText($("#perk-3"), t("support_247"));
    setText($("#booking-info-text"), t("choose_dates_next_page"));
    setText($("#trust-note"), t("trust_note"));

    setText($("#prop-price"), formatCurrency(property.price));
    setText($("#booking-stat-guests"), t("up_to_guests", { n: property.maxGuests }));
    setText($("#booking-stat-type"), propertyTypeLabel(property));

    document.title = `${propertyTitle(property)} | OreBooking`;
  }

  function renderFeatures() {
    const property = state.selectedProperty;
    const listEl = $("#prop-features-list");
    if (!property || !listEl) return;

    const items = propertyFeatures(property);
    listEl.innerHTML = items
      .map(
        (item) => `
          <li>
            <i class="ph ${escapeHtml(item.icon)}"></i>
            <span>${escapeHtml(item.label)}</span>
          </li>
        `
      )
      .join("");
  }

  function renderGallery() {
    const property = state.selectedProperty;
    refreshDom();
    if (!property || !dom.galleryTrack) return;

    state.galleryImages = property.images?.length ? property.images : [property.image];
    state.galleryIndex = 0;

    dom.galleryTrack.innerHTML = state.galleryImages
      .map(
        (src, index) => `
          <img
            src="${escapeHtml(src)}"
            alt="${escapeHtml(propertyTitle(property))} ${index + 1}"
            loading="${index === 0 ? "eager" : "lazy"}"
            data-gallery-index="${index}"
          />
        `
      )
      .join("");

    if (dom.galleryThumbs) {
      dom.galleryThumbs.innerHTML = state.galleryImages
        .map(
          (src, index) => `
            <button
              type="button"
              class="gallery-thumb ${index === 0 ? "active" : ""}"
              data-action="gallery-thumb"
              data-index="${index}"
              aria-label="${escapeHtml(`${propertyTitle(property)} ${index + 1}`)}"
            >
              <img src="${escapeHtml(src)}" alt="${escapeHtml(propertyTitle(property))} ${index + 1}" loading="lazy" />
            </button>
          `
        )
        .join("");
    }

    if (dom.galleryDots) {
      dom.galleryDots.innerHTML = state.galleryImages
        .map(
          (_, index) => `
            <button
              type="button"
              class="slider-dot ${index === 0 ? "active" : ""}"
              data-action="gallery-dot"
              data-index="${index}"
              aria-label="Slide ${index + 1}"
            ></button>
          `
        )
        .join("");
    }

    updateGalleryUI();
  }

  function updateGalleryUI() {
    refreshDom();
    if (!dom.galleryTrack) return;

    const count = state.galleryImages.length || 1;
    const index = Math.max(0, Math.min(state.galleryIndex, count - 1));

    dom.galleryTrack.style.transform = `translateX(-${index * 100}%)`;

    if (dom.galleryCount) {
      dom.galleryCount.textContent = `${index + 1} / ${count}`;
    }

    $all("[data-action='gallery-thumb']", dom.galleryThumbs || document).forEach((btn) => {
      btn.classList.toggle("active", safeNumber(btn.dataset.index, 0) === index);
    });

    $all("[data-action='gallery-dot']", dom.galleryDots || document).forEach((btn) => {
      btn.classList.toggle("active", safeNumber(btn.dataset.index, 0) === index);
    });
  }

  function goGallery(delta) {
    const total = state.galleryImages.length || 1;
    state.galleryIndex = (state.galleryIndex + delta + total) % total;
    updateGalleryUI();
    if (dom?.lightbox?.classList.contains("active")) {
      updateLightbox();
    }
  }

  function openLightbox() {
    refreshDom();
    if (!dom.lightbox || !dom.lightboxImg || !state.galleryImages.length) return;
    openModal(dom.lightbox);
    updateLightbox();
  }

  function closeLightbox() {
    refreshDom();
    closeModal(dom.lightbox);
  }

  function updateLightbox() {
    refreshDom();
    if (!dom.lightboxImg || !state.galleryImages.length) return;
    const src = state.galleryImages[state.galleryIndex];
    dom.lightboxImg.src = src;
    dom.lightboxImg.alt = `${propertyTitle(state.selectedProperty || {})} ${state.galleryIndex + 1}`;
  }

  function destroyPropertyMap() {
    if (state.propertyMapInstance && typeof state.propertyMapInstance.remove === "function") {
      state.propertyMapInstance.remove();
    }
    state.propertyMapInstance = null;
  }

  function renderPropertyMap() {
    refreshDom();
    const property = state.selectedProperty;
    if (!dom.mapEl || !property) return;

    destroyPropertyMap();

    if (!property.lat || !property.lng || typeof window.L === "undefined") {
      if (dom.mapEl) {
        dom.mapEl.innerHTML = `
          <div class="map-no-location">
            <i class="ph ph-map-pin"></i>
            <span>${escapeHtml(t("unknown_location"))}</span>
          </div>
        `;
      }
      if (dom.mapOpenLink) dom.mapOpenLink.style.display = "none";
      syncPhosphorIcons();
      return;
    }

    const coords = [property.lat, property.lng];
    state.propertyMapInstance = window.L.map(dom.mapEl, { scrollWheelZoom: false }).setView(coords, 13);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap"
    }).addTo(state.propertyMapInstance);

    window.L.marker(coords)
      .addTo(state.propertyMapInstance)
      .bindPopup(`<strong>${escapeHtml(propertyTitle(property))}</strong><br>${escapeHtml(propertyLocation(property))}`);

    if (dom.mapOpenLink) {
      dom.mapOpenLink.href = `https://www.google.com/maps?q=${encodeURIComponent(`${property.lat},${property.lng}`)}`;
      dom.mapOpenLink.style.display = "inline-flex";
    }
  }

  async function renderPropertyPage() {
    refreshDom();
    if (!dom.propertyContent && !dom.propertySkeleton) return;

    if (dom.propertySkeleton) dom.propertySkeleton.style.display = "block";
    if (dom.propertyContent) dom.propertyContent.style.display = "none";

    const property = await resolvePropertyForDetails();
    state.selectedProperty = property;

    fillPropertyText();
    renderFeatures();
    renderGallery();
    renderPropertyMap();
    updatePropertyActionButtons();

    if (dom.propertySkeleton) dom.propertySkeleton.style.display = "none";
    if (dom.propertyContent) dom.propertyContent.style.display = "";

    initRevealAnimations();
    syncPhosphorIcons();
  }

  /* =========================================
     17) BOOKINGS
  ========================================= */
  function localBookingsKey() {
    return state.user
      ? `${STORAGE_KEYS.bookingsUserPrefix}${state.user.uid}`
      : STORAGE_KEYS.bookingsGuest;
  }

  function localBookingSnapshotToDisplay(item) {
    return {
      id: item.id || item.reference || item.bookingId || `BK-${Date.now()}`,
      propertyTitle: item.propertyTitle || item.title || t("unnamed_property"),
      status: normalizeText(item.status || "pending").toLowerCase(),
      checkIn: item.checkIn || item.checkin || "",
      checkOut: item.checkOut || item.checkout || "",
      guests: safeNumber(item.guests || item.guestCount || item.adults, 1),
      total: safeNumber(item.total || item.amount || item.price, 0),
      createdAt: item.createdAt || item.timestamp || new Date().toISOString()
    };
  }

  async function loadBookings() {
    state.loadingBookings = true;
    const local = (safeJsonGet(localBookingsKey(), []) || []).map(localBookingSnapshotToDisplay);

    if (!db || !state.user) {
      state.bookings = local;
      state.loadingBookings = false;
      return state.bookings;
    }

    const merged = [...local];

    for (const collectionName of BOOKINGS_COLLECTION_CANDIDATES) {
      try {
        const snapshot = await db
          .collection(collectionName)
          .where("userId", "==", state.user.uid)
          .limit(20)
          .get();

        if (!snapshot.empty) {
          snapshot.docs.forEach((docItem) => {
            merged.push(
              localBookingSnapshotToDisplay({
                id: docItem.id,
                ...docItem.data()
              })
            );
          });
          break;
        }
      } catch (_) {}
    }

    state.bookings = unique(
      merged.map((item) => JSON.stringify(item))
    ).map((row) => JSON.parse(row));

    state.loadingBookings = false;
    return state.bookings;
  }

  function bookingStatusClass(status) {
    const key = normalizeText(status).toLowerCase();
    if (["confirmed", "مؤكد"].includes(key)) return "confirmed";
    if (["cancelled", "canceled", "ملغي"].includes(key)) return "cancelled";
    if (["rejected", "مرفوض"].includes(key)) return "cancelled";
    return "pending";
  }

  function bookingStatusLabel(status) {
    const key = normalizeText(status).toLowerCase();
    if (["confirmed", "مؤكد"].includes(key)) return t("booking_status_confirmed");
    if (["cancelled", "canceled", "ملغي"].includes(key)) return t("booking_status_cancelled");
    if (["rejected", "مرفوض"].includes(key)) return t("booking_status_rejected");
    return t("booking_status_pending");
  }

  function renderBookings() {
    refreshDom();
    if (!dom.bookingsList) return;

    if (state.loadingBookings) {
      dom.bookingsList.innerHTML = `<p class="text-muted">${escapeHtml(t("loading_bookings"))}</p>`;
      return;
    }

    if (!state.bookings.length) {
      dom.bookingsList.innerHTML = `<p class="text-muted">${escapeHtml(t("no_bookings"))}</p>`;
      return;
    }

    dom.bookingsList.innerHTML = state.bookings
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(
        (item) => `
          <article class="booking-card ore-reveal">
            <div class="booking-card-head">
              <div>
                <h4>${escapeHtml(item.propertyTitle)}</h4>
                <div class="booking-card-sub">#${escapeHtml(item.id)}</div>
              </div>
              <span class="booking-status-badge ${escapeHtml(bookingStatusClass(item.status))}">
                ${escapeHtml(bookingStatusLabel(item.status))}
              </span>
            </div>

            <div class="booking-card-grid">
              <div><strong>${escapeHtml(t("booking_checkin"))}</strong> ${escapeHtml(formatDate(item.checkIn))}</div>
              <div><strong>${escapeHtml(t("booking_checkout"))}</strong> ${escapeHtml(formatDate(item.checkOut))}</div>
              <div><strong>${escapeHtml(t("booking_guests"))}</strong> ${escapeHtml(String(item.guests || 1))}</div>
              <div><strong>${escapeHtml(t("booking_total"))}</strong> ${escapeHtml(formatCurrency(item.total))}</div>
           
