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
    guestBasics: "ore_guest_basics",
    supportCollection: "ore_support_collection",
    propertyCollection: "ore_property_collection"
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
  const USER_META_COLLECTION_CANDIDATES = ["users", "members", "customers"];
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
    currentCollection: safeGet(STORAGE_KEYS.propertyCollection, ""),
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
    currentSupportCollection: safeGet(STORAGE_KEYS.supportCollection, ""),
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
      chat_ready_note: "This chat is connected with local fallback and cloud sync when available.",
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
      continue_booking: "Continue booking",
      added_to_bookings: "Booking saved successfully.",
      support_inbox_empty: "No messages for this property yet."
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
      chat_ready_note: "الدردشة تعمل مع حفظ محلي ومزامنة سحابية عند توفرها.",
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
      continue_booking: "إكمال الحجز",
      added_to_bookings: "تم حفظ الحجز بنجاح.",
      support_inbox_empty: "لا توجد رسائل لهذا العقار بعد."
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

      authModal: firstExisting(["#auth-modal", ".auth-modal", ".modal-overlay.auth-modal", ".modal-overlay#auth-modal"]),
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
      chatTitle: firstExisting(["#chat-title"]),
      chatSubtitle: firstExisting(["#chat-subtitle"]),
      chatNote: firstExisting(["#chat-note"]),
      sendChatText: firstExisting(["#send-chat-text"]),

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
      logout: "logout",
      mybookings: "my_bookings",
      myfavorites: "favorites",
      clearsearch: "clear_search",
      searchhint: "search_hint",
      whereplaceholder: "where_placeholder",
      chatplaceholder: "chat_placeholder",
      fullname: "full_name",
      forgotpassword: "forgot_pass",
      forgotpass: "forgot_pass",
      rememberme: "remember_me",
      guestuser: "guest_user",
      signintocontinue: "sign_in_to_continue",
      emailaddress: "email",
      reservenow: "reserve_now",
      viewdetails: "view_details",
      supportchat: "support_chat",
      booknow: "booknow",
      wontcharged: "wontcharged",
      welcomeback: "welcomeback",
      noaccount: "noaccount",
      signupbtn: "signupbtn",
      hasaccount: "hasaccount",
      resetpasstitle: "resetpasstitle",
      resetpassdesc: "resetpassdesc",
      backtologin: "backtologin",
      coninuegoogle: "continue_google",
      contacthost: "contact_host",
      messagehost: "message_host",
      askaboutproperty: "ask_about_property",
      verifiedhost: "verified_host",
      hostingsince: "hosting_since",
      goodtoknow: "good_to_know",
      trustedlisting: "trusted_listing",
      responsive_support: "responsive_support",
      cleanandcomfortable: "clean_and_comfortable",
      greatlocation: "great_location",
      propertylinkcopied: "property_link_copied",
      no_property_id: "no_property_id",
      signingoooglefailed: "sign_in_google_failed",
      googlesigninunavailable: "google_signin_unavailable",
      continuetobooking: "continue_booking"
    };

    if (custom[k]) aliases.add(custom[k]);

    if (k.endsWith("_title")) aliases.add(k);
    if (k.endsWith("_text")) aliases.add(k);
    if (k.endsWith("_desc")) aliases.add(k);

    return Array.from(aliases);
  }

  function t(key, params = {}) {
    const dict = translations[state.lang] || translations.en;
    const fallbackDict = translations.en;

    let value = "";
    for (const candidate of keyAliases(key)) {
      if (candidate in dict) {
        value = dict[candidate];
        break;
      }
      if (candidate in fallbackDict) {
        value = fallbackDict[candidate];
        break;
      }
    }
    if (!value) value = key;

    return String(value).replace(/\{(\w+)\}/g, (_, token) => {
      const replacement = params[token];
      return replacement === 0 ? "0" : String(replacement ?? "");
    });
  }

  function isArabic() {
    return state.lang === "ar";
  }

  function matchesPropertyType(type, activeCategory) {
    if (activeCategory === "all") return true;
    const value = normalizeText(type).toLowerCase();
    if (activeCategory === "hotels") return /hotel|resort/.test(value);
    if (activeCategory === "apartments") return /apartment|flat|loft/.test(value);
    if (activeCategory === "villas") return /villa|house/.test(value);
    return value.includes(activeCategory);
  }

  function updateDocumentLanguageAttrs() {
    document.documentElement.lang = state.lang;
    document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
    safeSetMany(STORAGE_ALIASES.lang, state.lang);
  }

  function updateDocumentThemeAttrs() {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    document.body?.classList.toggle("dark", state.theme === "dark");
    safeSetMany(STORAGE_ALIASES.theme, state.theme);
  }

  function toggleBodyModalLock() {
    const activeModal = document.querySelector(
      ".modal-overlay.active, .auth-modal.active, .chat-modal.active, .bookings-modal.active, #lightbox.active"
    );
    document.body?.classList.toggle("modal-open", !!activeModal);
  }

  /* =========================================
     8) FIREBASE
  ========================================= */
  function initFirebase() {
    try {
      if (!window.firebase) return;
      if (!window.firebase.apps?.length) {
        window.firebase.initializeApp(firebaseConfig);
      }
      auth = window.firebase.auth();
      db = window.firebase.firestore ? window.firebase.firestore() : null;
      googleProvider = new window.firebase.auth.GoogleAuthProvider();
      firebaseReady = true;
      state.firestoreReady = !!db;
    } catch (err) {
      console.error("Firebase init error:", err);
      firebaseReady = false;
      state.firestoreReady = false;
    }
  }

  function authIsAvailable() {
    return firebaseReady && !!auth;
  }

  function dbIsAvailable() {
    return firebaseReady && !!db;
  }

  async function detectPropertyCollection() {
    if (!dbIsAvailable()) return "";
    if (state.currentCollection) return state.currentCollection;

    const cached = safeGet(STORAGE_KEYS.propertyCollection, "");
    if (cached) {
      state.currentCollection = cached;
      return cached;
    }

    for (const candidate of PROPERTY_COLLECTION_CANDIDATES) {
      try {
        const snap = await db.collection(candidate).limit(12).get();
        if (!snap.empty) {
          state.currentCollection = candidate;
          safeSet(STORAGE_KEYS.propertyCollection, candidate);
          return candidate;
        }
      } catch (_) {}
    }

    state.currentCollection = PROPERTY_COLLECTION_CANDIDATES[0];
    return state.currentCollection;
  }

  async function detectSupportCollection() {
    if (!dbIsAvailable()) return "";
    if (state.currentSupportCollection) return state.currentSupportCollection;

    const cached = safeGet(STORAGE_KEYS.supportCollection, "");
    if (cached) {
      state.currentSupportCollection = cached;
      return cached;
    }

    for (const candidate of SUPPORT_COLLECTION_CANDIDATES) {
      try {
        const snap = await db.collection(candidate).limit(1).get();
        state.currentSupportCollection = candidate;
        safeSet(STORAGE_KEYS.supportCollection, candidate);
        return candidate;
      } catch (_) {}
    }

    state.currentSupportCollection = SUPPORT_COLLECTION_CANDIDATES[0];
    return state.currentSupportCollection;
  }

  async function saveUserMetaPartial(payload = {}) {
    if (!dbIsAvailable() || !state.user?.uid) return false;
    const data = {
      uid: state.user.uid,
      email: state.user.email || "",
      displayName: state.user.displayName || "",
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      ...payload
    };

    for (const candidate of USER_META_COLLECTION_CANDIDATES) {
      try {
        await db.collection(candidate).doc(state.user.uid).set(data, { merge: true });
        return true;
      } catch (_) {}
    }
    return false;
  }

  /* =========================================
     9) APP UI
  ========================================= */
  function showToast(message, type = "info", timeout = 2600) {
    if (!message) return;

    if (dom?.toastContainer) {
      const toast = document.createElement("div");
      toast.className = `ore-toast ore-toast-${type}`;
      toast.setAttribute(
        "style",
        [
          "padding:12px 14px",
          "border-radius:14px",
          "color:#fff",
          "font-weight:700",
          "box-shadow:0 10px 30px rgba(0,0,0,.15)",
          "background:" +
            (type === "error" ? "#ef4444" : type === "success" ? "#10b981" : "#435abf"),
          "opacity:0",
          "transform:translateY(-8px)",
          "transition:all .2s ease"
        ].join(";")
      );
      toast.textContent = message;
      dom.toastContainer.appendChild(toast);
      requestAnimationFrame(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
      });
      setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(-8px)";
        setTimeout(() => toast.remove(), 250);
      }, timeout);
      return;
    }

    if (dom?.favToast) {
      dom.favToast.textContent = message;
      dom.favToast.classList.add("show");
      setTimeout(() => dom.favToast.classList.remove("show"), timeout);
      return;
    }

    safeCall(() => window.alert(message));
  }

  function showAuthMessage(message, type = "error") {
    if (!dom?.authMessage) {
      showToast(message, type);
      return;
    }
    dom.authMessage.textContent = message || "";
    dom.authMessage.className = "auth-message";
    if (message) dom.authMessage.classList.add(type);
  }

  function clearAuthMessage() {
    if (!dom?.authMessage) return;
    dom.authMessage.textContent = "";
    dom.authMessage.className = "auth-message";
  }

  function openModal(el) {
    if (!el) return;
    el.classList.add("active");
    el.setAttribute?.("aria-hidden", "false");
    toggleBodyModalLock();
  }

  function closeModal(el) {
    if (!el) return;
    el.classList.remove("active");
    el.setAttribute?.("aria-hidden", "true");
    toggleBodyModalLock();
  }

  function openAuthModal(targetView = "login", message = "") {
    clearAuthMessage();
    if (message) showAuthMessage(message, "error");
    if (dom?.authModal) {
      switchAuthForm(targetView);
      openModal(dom.authModal);
      return;
    }
    window.location.href = getAuthUrl(targetView);
  }

  function closeAuthModal() {
    closeModal(dom?.authModal);
  }

  function openBookingsModal() {
    if (!dom?.bookingsModal) {
      window.location.href = ROUTES.bookings;
      return;
    }
    openModal(dom.bookingsModal);
    renderBookingsList();
    loadBookings();
  }

  function closeBookingsModal() {
    closeModal(dom?.bookingsModal);
  }

  function openChatModal(propertyId = "") {
    const currentId = normalizeText(propertyId) || getCurrentPropertyId();
    state.currentChatPropertyId = currentId;
    if (dom?.chatPropertyId) dom.chatPropertyId.value = currentId;
    if (!dom?.chatModal) return;
    openModal(dom.chatModal);
    renderChatMessages([]);
    loadChatMessages(currentId);
    clearUnreadForProperty(currentId);
  }

  function closeChatModal() {
    closeModal(dom?.chatModal);
  }

  function applyTheme() {
    updateDocumentThemeAttrs();
    if (dom?.themeBtn) {
      const icon = dom.themeBtn.querySelector("i");
      if (icon) {
        icon.className = state.theme === "dark" ? "ph ph-sun" : "ph ph-moon";
      }
    }
    syncPhosphorIcons();
  }

  function applyLanguage() {
    updateDocumentLanguageAttrs();
    document.title = t("page_title");

    if (dom?.langBtn) {
      const span = dom.langBtn.querySelector("span");
      if (span) span.textContent = state.lang === "ar" ? "AR" : "EN";
    }

    $all("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      el.textContent = t(key);
    });

    $all("[data-i18n-placeholder]").forEach((el) => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key) return;
      el.setAttribute("placeholder", t(key));
    });

    if (dom?.destinationInput && !dom.destinationInput.getAttribute("data-i18n-placeholder")) {
      dom.destinationInput.setAttribute("placeholder", t("where_placeholder"));
    }

    if (dom?.chatTextarea && !dom.chatTextarea.getAttribute("data-i18n-placeholder")) {
      dom.chatTextarea.setAttribute("placeholder", t("chat_placeholder"));
    }

    updateProfileUi();
    renderListings();
    renderFavoritesPage();
    updatePropertyActionTexts();
    if (state.selectedProperty && state.currentView === "property") renderPropertyData(state.selectedProperty);
    renderBookingsList();
    renderChatMessages(state.chatMessages);
    syncPhosphorIcons();
  }

  function setTheme(theme) {
    state.theme = theme === "dark" ? "dark" : "light";
    applyTheme();
  }

  function toggleTheme() {
    setTheme(state.theme === "dark" ? "light" : "dark");
  }

  function setLang(lang) {
    state.lang = normalizeLang(lang);
    applyLanguage();
  }

  function toggleLang() {
    setLang(state.lang === "ar" ? "en" : "ar");
  }

  function updateProfileUi() {
    const user = state.user;
    const isGuest = !user;

    setText(dom?.profileName, isGuest ? t("guest_user") : user.displayName || user.email || t("account"));
    setText(dom?.profileEmail, isGuest ? t("sign_in_to_continue") : user.email || t("logged_in_as"));

    if (dom?.profileTrigger) {
      dom.profileTrigger.classList.toggle("auth-btn-guest", isGuest);
      dom.profileTrigger.setAttribute("aria-label", isGuest ? t("sign_in") : t("account"));

      const icon = dom.profileTrigger.querySelector("i");
      if (icon) {
        icon.className = isGuest ? "ph ph-user" : "ph ph-user-circle";
      }

      if (!icon && !dom.profileTrigger.querySelector(".ore-avatar-text")) {
        const text = document.createElement("span");
        text.className = "ore-avatar-text";
        text.textContent = isGuest ? "?" : getInitials(user.displayName || user.email || "U");
        dom.profileTrigger.appendChild(text);
      }

      const avatarText = dom.profileTrigger.querySelector(".ore-avatar-text");
      if (avatarText) {
        avatarText.textContent = isGuest ? "?" : getInitials(user.displayName || user.email || "U");
      }
    }

    if (dom?.logoutBtn) {
      dom.logoutBtn.style.display = isGuest ? "none" : "";
    }
  }

  function closeProfileDropdown() {
    if (!dom?.profileDropdown || !dom?.profileTrigger) return;
    dom.profileDropdown.classList.remove("active");
    dom.profileTrigger.setAttribute("aria-expanded", "false");
    state.profileDropdownOpen = false;
  }

  function toggleProfileDropdown() {
    if (!dom?.profileDropdown || !dom?.profileTrigger) return;
    state.profileDropdownOpen = !dom.profileDropdown.classList.contains("active");
    dom.profileDropdown.classList.toggle("active", state.profileDropdownOpen);
    dom.profileTrigger.setAttribute("aria-expanded", state.profileDropdownOpen ? "true" : "false");
  }

  function switchAuthForm(view = "login") {
    const target = ["login", "register", "forgot"].includes(view) ? view : "login";
    [dom?.loginForm, dom?.registerForm, dom?.forgotForm].forEach((form) => {
      if (!form) return;
      const id = form.id || "";
      const active = id.includes(target);
      form.classList.toggle("active", active);
      form.style.display = active ? "" : "none";
    });
    if (isAuthPage()) {
      window.location.hash = target;
    }
  }

  /* =========================================
     10) DATA NORMALIZATION
  ========================================= */
  function normalizeFeatureLabel(feature) {
    const key = normalizeText(feature).toLowerCase();
    const directMap = {
      wifi: t("wifi"),
      "wi-fi": t("wifi"),
      internet: t("wifi"),
      pool: t("pool"),
      parking: t("parking"),
      gym: t("gym"),
      restaurant: t("restaurant"),
      spa: t("spa"),
      kitchen: t("kitchen"),
      ac: t("ac"),
      air: t("ac"),
      balcony: t("balcony"),
      breakfast: t("breakfast"),
      security: t("security"),
      tv: t("tv"),
      beach: t("beach")
    };
    return directMap[key] || feature || "";
  }

  function getFeatureIcon(feature) {
    const key = normalizeText(feature).toLowerCase();
    const iconMap = {
      wifi: "ph ph-wifi-high",
      "wi-fi": "ph ph-wifi-high",
      internet: "ph ph-wifi-high",
      pool: "ph ph-swimming-pool",
      parking: "ph ph-car",
      gym: "ph ph-barbell",
      restaurant: "ph ph-fork-knife",
      spa: "ph ph-flower-lotus",
      kitchen: "ph ph-cooking-pot",
      ac: "ph ph-snowflake",
      air: "ph ph-snowflake",
      balcony: "ph ph-windows",
      breakfast: "ph ph-coffee",
      security: "ph ph-shield-check",
      tv: "ph ph-television",
      beach: "ph ph-island"
    };
    return iconMap[key] || "ph ph-check-circle";
  }

  function getPropertyTitleText(data) {
    return pick(
      state.lang === "ar" ? data.title_ar : data.title_en,
      state.lang === "ar" ? data.titleAr : data.titleEn,
      data[`title_${state.lang}`],
      data.title,
      t("unnamed_property")
    );
  }

  function getPropertyLocationText(data) {
    return pick(
      state.lang === "ar" ? data.location_ar : data.location_en,
      state.lang === "ar" ? data.locationAr : data.locationEn,
      data[`location_${state.lang}`],
      data.location,
      data.city,
      t("unknown_location")
    );
  }

  function getPropertyTypeText(data) {
    const type = normalizeText(data.type || data.category || data.typeEn || data.typeAr).toLowerCase();
    if (/villa/.test(type)) return t("villa");
    if (/apartment|flat|loft/.test(type)) return t("apartment");
    if (/resort/.test(type)) return t("resort");
    if (/hotel/.test(type)) return t("hotel");
    if (/cabin/.test(type)) return t("cabin");
    return t("premium_stay");
  }

  function getPropertyImages(data) {
    const images = unique(
      []
        .concat(data.images || [])
        .concat(data.gallery || [])
        .concat(data.photos || [])
        .concat(data.image ? [data.image] : [])
        .filter(Boolean)
    );
    return images.length ? images : ["https://via.placeholder.com/1200x800?text=OreBooking"];
  }

  function getPropertyFeatures(data) {
    const raw = []
      .concat(data.features || [])
      .concat(data.features_en || [])
      .concat(data.features_ar || [])
      .concat(data.amenities || [])
      .filter(Boolean);

    const normalized = unique(
      raw.map((item) => {
        const lower = normalizeText(item).toLowerCase();
        if (/wifi|wi-fi|internet/.test(lower)) return "wifi";
        if (/pool|swimming/.test(lower)) return "pool";
        if (/parking|car/.test(lower)) return "parking";
        if (/gym/.test(lower)) return "gym";
        if (/restaurant/.test(lower)) return "restaurant";
        if (/spa/.test(lower)) return "spa";
        if (/kitchen/.test(lower)) return "kitchen";
        if (/air|ac|condition/.test(lower)) return "ac";
        if (/balcony/.test(lower)) return "balcony";
        if (/breakfast|coffee/.test(lower)) return "breakfast";
        if (/security|guard/.test(lower)) return "security";
        if (/tv|television/.test(lower)) return "tv";
        if (/beach/.test(lower)) return "beach";
        return lower;
      })
    );

    return normalized.length ? normalized : ["wifi", "parking", "security"];
  }

  function normalizePropertyRecord(input) {
    const data = input || {};
    const id = String(
      pick(
        data.id,
        data.docId,
        data.slug,
        slugify(data.title || data.title_en || data.title_ar || data.name || "property")
      )
    );

    const titleEn = pick(data.title_en, data.titleEn, data.title, data.name, "OreBooking Stay");
    const titleAr = pick(data.title_ar, data.titleAr, data.title, data.name, "إقامة OreBooking");
    const locationEn = pick(data.location_en, data.locationEn, data.location, data.city, "Algeria");
    const locationAr = pick(data.location_ar, data.locationAr, data.location, data.city, "الجزائر");
    const image = pick(data.image, data.coverImage, data.thumbnail, getPropertyImages(data)[0]);
    const images = getPropertyImages(data);
    const features = getPropertyFeatures(data);

    return {
      ...data,
      id,
      docId: String(pick(data.docId, data.id, id)),
      title_en: titleEn,
      title_ar: titleAr,
      titleEn,
      titleAr,
      location_en: locationEn,
      location_ar: locationAr,
      locationEn,
      locationAr,
      title: pick(data.title, titleEn),
      location: pick(data.location, locationEn),
      image,
      images,
      type: pick(data.type, data.category, "hotel"),
      typeEn: pick(data.typeEn, data.type, "Hotel"),
      typeAr: pick(data.typeAr, data.type, "فندق"),
      desc_en: pick(data.desc_en, data.description_en, data.description, t("no_description")),
      desc_ar: pick(data.desc_ar, data.description_ar, data.description, t("no_description")),
      price: safeNumber(data.price ?? data.pricePerNight, 0),
      rating: safeNumber(data.rating, 4.8),
      maxGuests: safeNumber(data.maxGuests ?? data.guests ?? data.capacity, 4),
      bedrooms: safeNumber(data.bedrooms ?? data.rooms, 1),
      lat: data.lat ?? data.latitude ?? data.locationLat ?? null,
      lng: data.lng ?? data.longitude ?? data.locationLng ?? null,
      urgency: pick(data.urgency, data.badge, ""),
      features
    };
  }

  function buildPropertyCard(property) {
    const title = escapeHtml(getPropertyTitleText(property));
    const location = escapeHtml(getPropertyLocationText(property));
    const typeText = escapeHtml(getPropertyTypeText(property));
    const image = escapeHtml(property.image);
    const isFav = state.favorites.includes(String(property.id));

    return `
      <article class="listing-card" data-property-id="${escapeHtml(property.id)}" data-category="${escapeHtml(
      normalizeText(property.type).toLowerCase()
    )}">
        <div class="listing-card-media" style="position:relative;overflow:hidden;border-radius:20px;">
          <img src="${image}" alt="${title}" loading="lazy" style="width:100%;aspect-ratio:16/11;object-fit:cover;display:block;">
          ${
            property.urgency
              ? `<span style="position:absolute;top:14px;${state.lang === "ar" ? "right" : "left"}:14px;background:#fff;padding:8px 12px;border-radius:999px;font-weight:800;font-size:.78rem;box-shadow:0 6px 20px rgba(0,0,0,.08);">${escapeHtml(
                  localizeUrgency(property.urgency)
                )}</span>`
              : ""
          }
          <button class="fav-inline-btn" type="button" data-fav-toggle="${escapeHtml(
            property.id
          )}" aria-label="${escapeHtml(t("save_property"))}" style="position:absolute;top:14px;${state.lang === "ar" ? "left" : "right"}:14px;width:42px;height:42px;border:none;border-radius:50%;background:rgba(255,255,255,.92);cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <i class="${isFav ? "ph-fill ph-heart" : "ph ph-heart"}" style="color:${isFav ? "#e11d48" : "#0f172a"};"></i>
          </button>
        </div>
        <div class="listing-card-body" style="padding:16px 6px 0;">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
            <div>
              <h3 style="margin:0 0 6px;font-size:1.08rem;line-height:1.3;">${title}</h3>
              <p style="margin:0;color:#64748b;font-size:.92rem;">${location}</p>
            </div>
            <div style="white-space:nowrap;font-weight:800;color:#f59e0b;">★ ${property.rating.toFixed(1)}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
            <span style="padding:6px 10px;border-radius:999px;background:#f8fafc;border:1px solid #e2e8f0;font-size:.78rem;font-weight:700;">${typeText}</span>
            <span style="padding:6px 10px;border-radius:999px;background:#f8fafc;border:1px solid #e2e8f0;font-size:.78rem;font-weight:700;">${escapeHtml(
              t("up_to_guests", { n: property.maxGuests })
            )}</span>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:16px;">
            <div>
              <strong style="font-size:1.2rem;">${escapeHtml(formatCurrency(property.price))}</strong>
              <span style="color:#64748b;font-size:.9rem;"> ${escapeHtml(t("night_suffix"))}</span>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <a href="${ROUTES.details}?id=${encodeURIComponent(
      property.id
    )}" class="prop-view-link" data-prop-open="${escapeHtml(
      property.id
    )}" style="padding:10px 14px;border-radius:999px;border:1px solid #e2e8f0;text-decoration:none;font-weight:800;">${escapeHtml(
      t("view_details")
    )}</a>
              <button type="button" class="prop-book-btn" data-book-property="${escapeHtml(
                property.id
              )}" style="padding:10px 14px;border:none;border-radius:999px;background:#435abf;color:#fff;font-weight:800;cursor:pointer;">${escapeHtml(
      state.user ? t("reserve_now") : t("reserve_cta_signed_out")
    )}</button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  /* =========================================
     11) FAVORITES
  ========================================= */
  function getCurrentUid() {
    return state.user?.uid || "";
  }

  function getFavoritesStorageKey() {
    return state.user?.uid ? `${STORAGE_KEYS.favorites}_user_${state.user.uid}` : STORAGE_KEYS.favoritesGuest;
  }

  function loadFavoritesLocal() {
    const primary = safeJsonGet(getFavoritesStorageKey(), []);
    if (Array.isArray(primary)) return primary.map(String);

    const common = safeJsonGetAny(STORAGE_ALIASES.favoritesCommon, []);
    return Array.isArray(common) ? common.map(String) : [];
  }

  function persistFavoritesLocal(list) {
    const clean = unique((list || []).map(String));
    safeJsonSet(getFavoritesStorageKey(), clean);
    if (!state.user) safeJsonSetMany(STORAGE_ALIASES.favoritesCommon, clean);
  }

  async function syncFavoritesFromCloud() {
    if (!dbIsAvailable() || !state.user?.uid) return [];
    try {
      const userDoc = await db.collection("users").doc(state.user.uid).get();
      const cloudList = userDoc.data()?.favorites;
      if (Array.isArray(cloudList)) {
        persistFavoritesLocal(cloudList);
        return cloudList.map(String);
      }
    } catch (_) {}

    try {
      const altDoc = await db.collection("favorites").doc(state.user.uid).get();
      const cloudList = altDoc.data()?.items;
      if (Array.isArray(cloudList)) {
        persistFavoritesLocal(cloudList);
        return cloudList.map(String);
      }
    } catch (_) {}

    return loadFavoritesLocal();
  }

  async function syncFavoritesToCloud(list) {
    if (!dbIsAvailable() || !state.user?.uid) return false;
    const items = unique((list || []).map(String));
    const payload = {
      favorites: items,
      updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection("users").doc(state.user.uid).set(payload, { merge: true });
      return true;
    } catch (_) {}

    try {
      await db.collection("favorites").doc(state.user.uid).set(
        {
          uid: state.user.uid,
          email: state.user.email || "",
          items,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  function loadFavorites() {
    state.favorites = unique(loadFavoritesLocal().map(String));
    updateFavoriteButtons();
    return state.favorites;
  }

  async function refreshFavoritesFromBestSource() {
    const local = loadFavoritesLocal();
    if (local.length) {
      state.favorites = unique(local);
      updateFavoriteButtons();
    }
    if (state.user) {
      const synced = await syncFavoritesFromCloud();
      state.favorites = unique(synced);
      updateFavoriteButtons();
    }
  }

  async function setFavorites(nextList) {
    state.favorites = unique((nextList || []).map(String));
    persistFavoritesLocal(state.favorites);
    updateFavoriteButtons();
    renderFavoritesPage();
    await syncFavoritesToCloud(state.favorites);
  }

  async function toggleFavorite(propertyId, silent = false) {
    const id = String(propertyId || "");
    if (!id) return;

    if (!state.user && state.currentView === "booking") {
      safeSet(STORAGE_KEYS.postAuthRedirect, currentPageWithSearch());
      openAuthModal("login", t("auth_required"));
      return;
    }

    const exists = state.favorites.includes(id);
    const next = exists ? state.favorites.filter((x) => x !== id) : [...state.favorites, id];
    await setFavorites(next);

    if (!silent) {
      showToast(exists ? t("fav_removed") : t("fav_added"), "success");
    }
  }

  function updateFavoriteButtons() {
    $all("[data-fav-toggle], #property-fav-btn").forEach((btn) => {
      const propertyId = btn.getAttribute("data-fav-toggle") || getCurrentPropertyId();
      const isFav = state.favorites.includes(String(propertyId));
      btn.classList.toggle("active", isFav);

      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = isFav ? "ph-fill ph-heart" : "ph ph-heart";
        if (btn.id === "property-fav-btn") {
          icon.style.color = isFav ? "#e11d48" : "";
        }
      }

      const textTarget = btn.querySelector("span");
      if (textTarget) {
        textTarget.textContent = isFav ? t("saved") : t("save");
      }
    });
    syncPhosphorIcons();
  }

  /* =========================================
     12) BOOKINGS
  ========================================= */
  function getBookingsStorageKey() {
    return state.user?.uid ? `${STORAGE_KEYS.bookingsUserPrefix}${state.user.uid}` : STORAGE_KEYS.bookingsGuest;
  }

  function readBookingsLocal() {
    const list = safeJsonGet(getBookingsStorageKey(), []);
    return Array.isArray(list) ? list : [];
  }

  function saveBookingsLocal(list) {
    safeJsonSet(getBookingsStorageKey(), Array.isArray(list) ? list : []);
  }

  function normalizeBookingRecord(input = {}) {
    const property = input.property || input.propertySnapshot || {};
    const propertyId = String(
      pick(input.propertyId, property.id, input.selectedPropertyId, input.listingId, "")
    );

    return {
      id: String(pick(input.id, input.bookingId, `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)),
      propertyId,
      propertyTitle: pick(
        input.propertyTitle,
        property.title,
        property.title_en,
        property.title_ar,
        state.lang === "ar" ? property.title_ar : property.title_en,
        t("unnamed_property")
      ),
      propertyLocation: pick(
        input.propertyLocation,
        property.location,
        property.location_en,
        property.location_ar,
        t("unknown_location")
      ),
      propertyImage: pick(input.propertyImage, property.image, property.images?.[0], ""),
      total: safeNumber(input.total ?? input.amount ?? property.price, 0),
      guests: safeNumber(input.guests ?? input.adults ?? input.guestCount, 1),
      adults: safeNumber(input.adults, 0),
      children: safeNumber(input.children, 0),
      checkIn: pick(input.checkIn, input.arrivalDate, input.checkin, input.arrival_date, ""),
      checkOut: pick(input.checkOut, input.departureDate, input.checkout, input.departure_date, ""),
      status: normalizeText(input.status || "pending").toLowerCase(),
      createdAt: input.createdAt || new Date().toISOString(),
      userId: pick(input.userId, state.user?.uid, ""),
      userEmail: pick(input.userEmail, state.user?.email, ""),
      raw: input
    };
  }

  async function saveBookingToCloud(booking) {
    if (!dbIsAvailable() || !state.user?.uid) return false;
    const record = normalizeBookingRecord({
      ...booking,
      userId: state.user.uid,
      userEmail: state.user.email || ""
    });

    for (const collection of BOOKINGS_COLLECTION_CANDIDATES) {
      try {
        await db.collection(collection).doc(record.id).set({
          ...record,
          updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });
        return true;
      } catch (_) {}
    }
    return false;
  }

  async function loadBookingsFromCloud() {
    if (!dbIsAvailable() || !state.user?.uid) return [];
    for (const collection of BOOKINGS_COLLECTION_CANDIDATES) {
      try {
        const snap = await db
          .collection(collection)
          .where("userId", "==", state.user.uid)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();

        if (!snap.empty) {
          return snap.docs.map((doc) => normalizeBookingRecord({ id: doc.id, ...doc.data() }));
        }
      } catch (_) {
        try {
          const snapByEmail = await db
            .collection(collection)
            .where("userEmail", "==", state.user.email || "__none__")
            .limit(50)
            .get();

          if (!snapByEmail.empty) {
            return snapByEmail.docs.map((doc) => normalizeBookingRecord({ id: doc.id, ...doc.data() }));
          }
        } catch (_) {}
      }
    }
    return [];
  }

  async function loadBookings() {
    state.loadingBookings = true;
    renderBookingsList();

    let list = readBookingsLocal().map(normalizeBookingRecord);

    if (state.user) {
      const cloud = await loadBookingsFromCloud();
      if (cloud.length) {
        list = cloud;
        saveBookingsLocal(list);
      }
    }

    state.bookings = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    state.loadingBookings = false;
    renderBookingsList();
    return state.bookings;
  }

  async function addBookingRecord(data) {
    const record = normalizeBookingRecord(data);
    const current = readBookingsLocal().map(normalizeBookingRecord);
    const next = [record, ...current.filter((b) => b.id !== record.id)];
    saveBookingsLocal(next);
    state.bookings = next;
    renderBookingsList();
    await saveBookingToCloud(record);
    return record;
  }

  function getStatusLabel(status) {
    const normalized = normalizeText(status).toLowerCase();
    if (normalized === "confirmed") return t("booking_status_confirmed");
    if (normalized === "cancelled") return t("booking_status_cancelled");
    if (normalized === "rejected") return t("booking_status_rejected");
    return t("booking_status_pending");
  }

  function renderBookingsList() {
    if (!dom?.bookingsList) return;

    if (state.loadingBookings) {
      dom.bookingsList.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">${escapeHtml(
        t("loading_bookings")
      )}</div>`;
      return;
    }

    const items = state.bookings || [];
    if (!items.length) {
      dom.bookingsList.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">${escapeHtml(
        t("no_bookings")
      )}</div>`;
      return;
    }

    dom.bookingsList.innerHTML = items
      .map((booking) => {
        const image = booking.propertyImage || "https://via.placeholder.com/200x140?text=OreBooking";
        return `
          <article class="booking-item-card" style="display:grid;grid-template-columns:110px 1fr;gap:14px;padding:14px;border:1px solid var(--border-color);border-radius:18px;background:var(--surface-color);margin-bottom:12px;">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(
          booking.propertyTitle
        )}" style="width:110px;height:84px;object-fit:cover;border-radius:14px;border:1px solid var(--border-color);">
            <div>
              <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap;">
                <div>
                  <h4 style="margin:0 0 6px;font-size:1rem;">${escapeHtml(booking.propertyTitle)}</h4>
                  <p style="margin:0;color:var(--text-muted);font-size:.88rem;">${escapeHtml(booking.propertyLocation)}</p>
                </div>
                <span style="padding:6px 10px;border-radius:999px;font-size:.78rem;font-weight:800;background:rgba(67,90,191,.08);color:var(--primary);">${escapeHtml(
                  getStatusLabel(booking.status)
                )}</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px;font-size:.88rem;">
                <div><strong>${escapeHtml(t("booking_checkin"))}</strong> ${escapeHtml(formatDate(booking.checkIn))}</div>
                <div><strong>${escapeHtml(t("booking_checkout"))}</strong> ${escapeHtml(formatDate(booking.checkOut))}</div>
                <div><strong>${escapeHtml(t("booking_guests"))}</strong> ${escapeHtml(String(booking.guests || 1))}</div>
                <div><strong>${escapeHtml(t("booking_total"))}</strong> ${escapeHtml(formatCurrency(booking.total))}</div>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  /* =========================================
     13) CHAT
  ========================================= */
  function getChatStorageKey(propertyId = "") {
    const suffix = propertyId ? `_${propertyId}` : "_general";
    return state.user?.uid ? `${STORAGE_KEYS.chatUserPrefix}${state.user.uid}${suffix}` : `${STORAGE_KEYS.chatGuest}${suffix}`;
  }

  function getUnreadStorageKey(propertyId = "") {
    const suffix = propertyId ? `_${propertyId}` : "_general";
    return state.user?.uid ? `${STORAGE_KEYS.unreadUserPrefix}${state.user.uid}${suffix}` : `${STORAGE_KEYS.unreadGuest}${suffix}`;
  }

  function readChatLocal(propertyId) {
    const list = safeJsonGet(getChatStorageKey(propertyId), []);
    return Array.isArray(list) ? list : [];
  }

  function saveChatLocal(propertyId, list) {
    safeJsonSet(getChatStorageKey(propertyId), Array.isArray(list) ? list : []);
  }

  function readUnread(propertyId) {
    return safeNumber(safeGet(getUnreadStorageKey(propertyId), "0"), 0);
  }

  function writeUnread(propertyId, count) {
    safeSet(getUnreadStorageKey(propertyId), String(Math.max(0, safeNumber(count, 0))));
    updateUnreadBadge();
  }

  function clearUnreadForProperty(propertyId) {
    writeUnread(propertyId, 0);
  }

  function updateUnreadBadge() {
    if (!dom?.chatUnreadBadge) return;
    const propertyId = state.currentChatPropertyId || getCurrentPropertyId();
    const total = readUnread(propertyId);
    dom.chatUnreadBadge.textContent = String(total);
    dom.chatUnreadBadge.style.display = total > 0 ? "inline-flex" : "none";
  }

  function normalizeChatMessage(input = {}) {
    return {
      id: String(pick(input.id, `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`)),
      propertyId: String(pick(input.propertyId, state.currentChatPropertyId, getCurrentPropertyId(), "general")),
      sender: normalizeText(input.sender || "customer").toLowerCase() === "admin" ? "admin" : "customer",
      text: normalizeText(input.text),
      userId: pick(input.userId, state.user?.uid, ""),
      userEmail: pick(input.userEmail, state.user?.email, ""),
      createdAt: input.createdAt || new Date().toISOString(),
      synced: !!input.synced
    };
  }

  async function saveChatMessageToCloud(message) {
    if (!dbIsAvailable()) return false;
    const collection = await detectSupportCollection();
    if (!collection) return false;

    const data = normalizeChatMessage(message);

    try {
      await db.collection(collection).doc(data.id).set({
        ...data,
        createdAt: window.firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  async function loadChatMessagesFromCloud(propertyId) {
    if (!dbIsAvailable()) return [];
    const collection = await detectSupportCollection();
    if (!collection) return [];

    const pid = String(propertyId || "general");
    try {
      let query = db.collection(collection).where("propertyId", "==", pid).limit(100);

      if (state.user?.uid) {
        try {
          query = query.where("userId", "==", state.user.uid);
        } catch (_) {}
      }

      try {
        query = query.orderBy("createdAt", "asc");
      } catch (_) {}

      const snap = await query.get();
      if (snap.empty) return [];
      return snap.docs.map((doc) => normalizeChatMessage({ id: doc.id, ...doc.data(), synced: true }));
    } catch (_) {
      return [];
    }
  }

  async function loadChatMessages(propertyId = "") {
    const pid = String(propertyId || getCurrentPropertyId() || "general");
    let list = readChatLocal(pid).map(normalizeChatMessage);

    if (dbIsAvailable()) {
      const cloud = await loadChatMessagesFromCloud(pid);
      if (cloud.length) {
        list = cloud;
        saveChatLocal(pid, list);
      }
    }

    state.chatMessages = list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    renderChatMessages(state.chatMessages);
    updateUnreadBadge();
    return state.chatMessages;
  }

  function renderChatMessages(messages = []) {
    if (!dom?.chatMessages) return;
    const list = Array.isArray(messages) ? messages : [];

    if (!list.length) {
      dom.chatMessages.innerHTML = `
        <div class="chat-empty-state" id="chat-empty-state">
          <i class="ph ph-chat-centered-text"></i>
          <p style="font-weight:800;margin:0 0 6px;">${escapeHtml(t("no_messages_yet"))}</p>
          <p style="margin:0;">${escapeHtml(t("start_chat_hint"))}</p>
        </div>
      `;
      syncPhosphorIcons();
      return;
    }

    dom.chatMessages.innerHTML = list
      .map((msg) => {
        const senderName = msg.sender === "admin" ? t("support_agent") : t("you");
        return `
          <div class="chat-message ${escapeHtml(msg.sender)}">
            ${escapeHtml(msg.text).replace(/\n/g, "<br>")}
            <span class="chat-meta">${escapeHtml(senderName)} • ${escapeHtml(formatTime(msg.createdAt))}</span>
          </div>
        `;
      })
      .join("");

    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  function scheduleFallbackAutoReply(propertyId) {
    clearTimeout(autoReplyTimer);
    autoReplyTimer = setTimeout(async () => {
      const reply = normalizeChatMessage({
        propertyId,
        sender: "admin",
        text: t("quick_auto_reply"),
        createdAt: new Date().toISOString()
      });

      const current = readChatLocal(propertyId).map(normalizeChatMessage);
      current.push(reply);
      saveChatLocal(propertyId, current);

      if (!dom?.chatModal?.classList.contains("active")) {
        writeUnread(propertyId, readUnread(propertyId) + 1);
      }

      state.chatMessages = current;
      renderChatMessages(current);
    }, CHAT_REPLY_DELAY);
  }

  async function sendChatMessage() {
    if (!dom?.chatTextarea) return;
    const text = normalizeText(dom.chatTextarea.value);
    const propertyId = String(
      dom?.chatPropertyId?.value || state.currentChatPropertyId || getCurrentPropertyId() || "general"
    );

    if (!text) {
      showToast(t("message_required"), "error");
      return;
    }
    if (text.length > MAX_CHAT_MESSAGE_LENGTH) {
      showToast(t("message_too_long"), "error");
      return;
    }

    const enrichedText =
      state.currentView === "property" && state.selectedProperty
        ? `${text}\n\n[${getPropertyTitleText(state.selectedProperty)}]`
        : text;

    if (dom.chatSendBtn) {
      dom.chatSendBtn.disabled = true;
      const span = dom.chatSendBtn.querySelector("span");
      if (span) span.textContent = t("sending");
    }

    const message = normalizeChatMessage({
      propertyId,
      text: enrichedText,
      sender: "customer",
      userId: state.user?.uid || "",
      userEmail: state.user?.email || "",
      createdAt: new Date().toISOString(),
      synced: false
    });

    const list = readChatLocal(propertyId).map(normalizeChatMessage);
    list.push(message);
    saveChatLocal(propertyId, list);
    state.chatMessages = list;
    renderChatMessages(list);
    dom.chatTextarea.value = "";

    const saved = await saveChatMessageToCloud(message);
    if (!saved) {
      scheduleFallbackAutoReply(propertyId);
    }

    if (dom.chatSendBtn) {
      dom.chatSendBtn.disabled = false;
      const span = dom.chatSendBtn.querySelector("span");
      if (span) span.textContent = t("send_message");
    }

    showToast(t("support_toast"), "success");
  }

  /* =========================================
     14) PROPERTY CONTEXT / REDIRECT
  ========================================= */
  function getCurrentPropertyId() {
    const params = new URLSearchParams(window.location.search);
    return (
      normalizeText(params.get("id")) ||
      normalizeText(safeGet(STORAGE_KEYS.selectedPropertyId, "")) ||
      normalizeText(state.selectedProperty?.id || "")
    );
  }

  function saveSelectedPropertyContext(property) {
    if (!property) return;
    const record = normalizePropertyRecord(property);
    state.selectedProperty = record;
    safeSet(STORAGE_KEYS.selectedPropertyId, record.id);
    safeSet(STORAGE_KEYS.selectedPropertyDocId, record.docId || record.id);
    safeJsonSetMany(STORAGE_ALIASES.selectedPropertyData, record);
    safeJsonSet(STORAGE_KEYS.bookingContext, {
      propertyId: record.id,
      property: record,
      updatedAt: new Date().toISOString()
    });
  }

  function readSelectedPropertyContext() {
    const stored = safeJsonGetAny(STORAGE_ALIASES.selectedPropertyData, null);
    if (stored) return normalizePropertyRecord(stored);
    return null;
  }

  function requireAuthThen(action, redirectTarget = "") {
    if (state.user) {
      action();
      return;
    }
    if (redirectTarget) safeSet(STORAGE_KEYS.postAuthRedirect, redirectTarget);
    openAuthModal("login", t("auth_required"));
  }

  function startProtectedBooking(property) {
    const record = normalizePropertyRecord(property || state.selectedProperty || readSelectedPropertyContext() || {});
    if (!record.id) {
      showToast(t("property_not_found"), "error");
      return;
    }

    saveSelectedPropertyContext(record);

    const target = `${ROUTES.booking}?id=${encodeURIComponent(record.id)}`;
    const go = () => {
      window.location.href = target;
    };

    requireAuthThen(go, target);
  }

  function restorePostAuthRedirect() {
    const redirect = safeGet(STORAGE_KEYS.postAuthRedirect, "") || getRedirectTargetFromUrl();
    if (!redirect) return false;
    safeRemove(STORAGE_KEYS.postAuthRedirect);
    window.location.href = redirect;
    return true;
  }

  /* =========================================
     15) AUTH
  ========================================= */
  async function signInWithEmail(email, password, remember) {
    if (!authIsAvailable()) throw new Error("auth-unavailable");
    await auth.setPersistence(
      remember
        ? window.firebase.auth.Auth.Persistence.LOCAL
        : window.firebase.auth.Auth.Persistence.SESSION
    );
    return auth.signInWithEmailAndPassword(email, password);
  }

  async function registerWithEmail(name, email, password) {
    if (!authIsAvailable()) throw new Error("auth-unavailable");
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    if (name && cred.user) {
      await cred.user.updateProfile({ displayName: name });
    }
    return cred;
  }

  async function sendPasswordReset(email) {
    if (!authIsAvailable()) throw new Error("auth-unavailable");
    return auth.sendPasswordResetEmail(email);
  }

  async function signInWithGoogle() {
    if (!authIsAvailable() || !googleProvider) throw new Error("google-unavailable");
    return auth.signInWithPopup(googleProvider);
  }

  async function signOutUser() {
    if (!authIsAvailable()) return;
    await auth.signOut();
    showToast(t("logout_success"), "success");
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    clearAuthMessage();

    const email = normalizeText($("#login-email")?.value);
    const password = normalizeText($("#login-password")?.value);
    const remember = !!$("#login-form input[type='checkbox']")?.checked;

    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }
    if (!password) {
      showAuthMessage(t("fill_required"), "error");
      return;
    }

    try {
      if (dom?.loginSubmitBtn) dom.loginSubmitBtn.disabled = true;
      await signInWithEmail(email, password, remember);
      safeSet(STORAGE_KEYS.remember, remember ? "1" : "0");
      showAuthMessage(t("login_success"), "success");
      setTimeout(() => {
        closeAuthModal();
        if (!restorePostAuthRedirect() && isAuthPage()) {
          window.location.href = ROUTES.home;
        }
      }, 250);
    } catch (err) {
      console.error(err);
      showAuthMessage(t("invalid_credentials"), "error");
    } finally {
      if (dom?.loginSubmitBtn) dom.loginSubmitBtn.disabled = false;
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    clearAuthMessage();

    const name = normalizeText($("#reg-name")?.value);
    const email = normalizeText($("#reg-email")?.value);
    const password = normalizeText($("#reg-password")?.value);

    if (!name || !validateEmail(email) || !password) {
      showAuthMessage(t("fill_required"), "error");
      return;
    }

    try {
      if (dom?.registerSubmitBtn) dom.registerSubmitBtn.disabled = true;
      await registerWithEmail(name, email, password);
      showAuthMessage(t("register_success"), "success");
      setTimeout(() => {
        closeAuthModal();
        if (!restorePostAuthRedirect() && isAuthPage()) {
          window.location.href = ROUTES.home;
        }
      }, 250);
    } catch (err) {
      console.error(err);
      showAuthMessage(t("auth_unavailable"), "error");
    } finally {
      if (dom?.registerSubmitBtn) dom.registerSubmitBtn.disabled = false;
    }
  }

  async function handleForgotSubmit(e) {
    e.preventDefault();
    clearAuthMessage();

    const email = normalizeText($("#forgot-email")?.value);
    if (!validateEmail(email)) {
      showAuthMessage(t("invalid_email"), "error");
      return;
    }

    try {
      if (dom?.forgotSubmitBtn) dom.forgotSubmitBtn.disabled = true;
      await sendPasswordReset(email);
      showAuthMessage(t("reset_sent"), "success");
    } catch (err) {
      console.error(err);
      showAuthMessage(t("auth_unavailable"), "error");
    } finally {
      if (dom?.forgotSubmitBtn) dom.forgotSubmitBtn.disabled = false;
    }
  }

  async function handleGoogleAuth() {
    clearAuthMessage();
    try {
      await signInWithGoogle();
      closeAuthModal();
      if (!restorePostAuthRedirect() && isAuthPage()) {
        window.location.href = ROUTES.home;
      }
    } catch (err) {
      console.error(err);
      showAuthMessage(t("sign_in_google_failed"), "error");
    }
  }

  function attachAuthObserver() {
    if (!authIsAvailable() || authObserverAttached) return;
    authObserverAttached = true;

    auth.onAuthStateChanged(async (user) => {
      state.user = user || null;
      state.authReady = true;
      updateProfileUi();

      if (state.user) {
        await saveUserMetaPartial({
          lastSeenAt: window.firebase.firestore.FieldValue.serverTimestamp()
        });

        await refreshFavoritesFromBestSource();
        await loadBookings();
        updateUnreadBadge();

        if (isAuthPage()) {
          if (!restorePostAuthRedirect()) {
            window.location.href = ROUTES.home;
          }
          return;
        }
      } else {
        loadFavorites();
        state.bookings = readBookingsLocal().map(normalizeBookingRecord);
        renderBookingsList();
        updateUnreadBadge();
      }

      updateFavoriteButtons();
    });
  }

  /* =========================================
     16) PROPERTIES / LISTINGS
  ========================================= */
  async function loadLiveProperties() {
    if (state.loadingProperties) return state.liveProperties;
    if (state.propertiesLoaded && state.liveProperties.length) return state.liveProperties;

    state.loadingProperties = true;

    try {
      const collection = await detectPropertyCollection();
      if (dbIsAvailable() && collection) {
        const snap = await db.collection(collection).limit(100).get();
        if (!snap.empty) {
          state.liveProperties = snap.docs.map((doc) => normalizePropertyRecord({ id: doc.id, docId: doc.id, ...doc.data() }));
          state.propertiesLoaded = true;
          state.loadingProperties = false;
          return state.liveProperties;
        }
      }
    } catch (err) {
      console.error("Property load error:", err);
      showToast(t("property_load_error"), "error");
    }

    state.liveProperties = fallbackProperties.map(normalizePropertyRecord);
    state.propertiesLoaded = true;
    state.loadingProperties = false;
    return state.liveProperties;
  }

  function getFilteredProperties() {
    const source = (state.liveProperties || []).slice();
    const search = normalizeText(state.activeSearch).toLowerCase();

    let result = source.filter((prop) => {
      const haystack = [
        prop.id,
        prop.title_en,
        prop.title_ar,
        prop.location_en,
        prop.location_ar,
        prop.type,
        prop.city
      ]
        .join(" ")
        .toLowerCase();

      const searchMatch = !search || haystack.includes(search);
      const categoryMatch = matchesPropertyType(prop.type, state.activeCategory);
      return searchMatch && categoryMatch;
    });

    if (state.currentView === "favorites") {
      result = result.filter((prop) => state.favorites.includes(String(prop.id)));
    }

    if (state.sort === "rating") result.sort((a, b) => b.rating - a.rating);
    if (state.sort === "price_low") result.sort((a, b) => a.price - b.price);
    if (state.sort === "price_high") result.sort((a, b) => b.price - a.price);

    return result;
  }

  function renderListings() {
    if (!dom?.listingsGrid) return;

    const properties = getFilteredProperties();

    if (dom.sectionTitle) {
      dom.sectionTitle.textContent = state.currentView === "favorites" ? t("favorites_title") : t("featured_title");
    }

    if (!properties.length) {
      const title = state.currentView === "favorites" ? t("no_favorites_title") : t("no_results_title");
      const text = state.currentView === "favorites" ? t("no_favorites_text") : t("no_results_text");

      dom.listingsGrid.innerHTML = `
        <div class="empty-state" style="padding:28px;border:1px dashed var(--border-color);border-radius:22px;background:var(--surface-color);text-align:center;">
          <h3 style="margin:0 0 8px;">${escapeHtml(title)}</h3>
          <p style="margin:0;color:var(--text-muted);">${escapeHtml(text)}</p>
        </div>
      `;
      syncPhosphorIcons();
      return;
    }

    dom.listingsGrid.innerHTML = properties.map(buildPropertyCard).join("");
    bindDynamicListingEvents();
    syncPhosphorIcons();
  }

  function renderFavoritesPage() {
    if (state.currentView !== "favorites") return;
    renderListings();
  }

  function bindDynamicListingEvents() {
    $all("[data-fav-toggle]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite(btn.getAttribute("data-fav-toggle"));
      };
    });

    $all("[data-book-property]").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        const propertyId = btn.getAttribute("data-book-property");
        const property = state.liveProperties.find((p) => String(p.id) === String(propertyId));
        startProtectedBooking(property);
      };
    });

    $all("[data-prop-open]").forEach((link) => {
      link.onclick = () => {
        const propertyId = link.getAttribute("data-prop-open");
        const property = state.liveProperties.find((p) => String(p.id) === String(propertyId));
        if (property) saveSelectedPropertyContext(property);
      };
    });
  }

  /* =========================================
     17) PROPERTY PAGE
  ========================================= */
  function updatePropertyActionTexts() {
    if (dom?.bookNowLink) {
      const span = dom.bookNowLink.querySelector("span");
      if (span) span.textContent = t("booknow");
    }
    if (dom?.shareBtn) {
      const span = dom.shareBtn.querySelector("span");
      if (span) span.textContent = t("share");
    }
    if (dom?.propertyFavBtn) {
      const span = dom.propertyFavBtn.querySelector("span");
      if (span) {
        const currentId = getCurrentPropertyId();
        span.textContent = state.favorites.includes(String(currentId)) ? t("saved") : t("save");
      }
    }
    if (dom?.contactHostBtn) {
      const span = dom.contactHostBtn.querySelector("span");
      if (span) span.textContent = t("contact_host");
    }
    if (dom?.chatTitle) setText(dom.chatTitle, t("chat_title"));
    if (dom?.chatSubtitle) setText(dom.chatSubtitle, t("chat_subtitle"));
    if (dom?.chatNote) setText(dom.chatNote, t("chat_ready_note"));
    if (dom?.sendChatText) setText(dom.sendChatText, t("send_message"));
  }

  function showPropertyContent() {
    if (dom?.propertySkeleton) dom.propertySkeleton.style.display = "none";
    if (dom?.propertyContent) dom.propertyContent.style.display = "block";
  }

  function handleShare() {
    const title = state.selectedProperty ? getPropertyTitleText(state.selectedProperty) : "OreBooking Property";
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

  function updateGallery() {
    if (!dom?.galleryTrack || !state.galleryImages.length) return;

    const width = 100 * state.galleryIndex;
    dom.galleryTrack.style.transform = `translateX(${state.lang === "ar" ? width : -width}%)`;

    if (dom.galleryCount) {
      dom.galleryCount.textContent = `${state.galleryIndex + 1} / ${state.galleryImages.length}`;
    }

    $all(".slider-dot", dom.galleryDots || document).forEach((dot, idx) => {
      dot.classList.toggle("active", idx === state.galleryIndex);
    });

    $all(".gallery-thumb", dom.galleryThumbs || document).forEach((thumb, idx) => {
      thumb.classList.toggle("active", idx === state.galleryIndex);
    });

    if (dom?.lightbox?.classList.contains("active") && dom?.lightboxImg) {
      dom.lightboxImg.src = state.galleryImages[state.galleryIndex];
    }
  }

  function goToSlide(index) {
    if (!state.galleryImages.length) return;
    const max = state.galleryImages.length - 1;
    state.galleryIndex = Math.min(max, Math.max(0, index));
    updateGallery();
  }

  function nextSlide(e) {
    if (e) e.preventDefault();
    if (!state.galleryImages.length) return;
    state.galleryIndex = (state.galleryIndex + 1) % state.galleryImages.length;
    updateGallery();
  }

  function prevSlide(e) {
    if (e) e.preventDefault();
    if (!state.galleryImages.length) return;
    state.galleryIndex = (state.galleryIndex - 1 + state.galleryImages.length) % state.galleryImages.length;
    updateGallery();
  }

  function setupSlider(images) {
    if (!dom?.galleryTrack || !dom?.galleryDots) return;

    state.galleryImages = images.slice();
    state.galleryIndex = 0;
    dom.galleryTrack.innerHTML = "";
    dom.galleryDots.innerHTML = "";

    images.forEach((src, idx) => {
      const img = document.createElement("img");
      img.src = src;
      img.alt = `Property image ${idx + 1}`;
      img.loading = idx === 0 ? "eager" : "lazy";
      img.style.minWidth = "100%";
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "cover";
      img.addEventListener("click", openLightbox);
      dom.galleryTrack.appendChild(img);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `slider-dot ${idx === 0 ? "active" : ""}`;
      dot.setAttribute("aria-label", `Go to image ${idx + 1}`);
      dot.addEventListener("click", () => goToSlide(idx));
      dom.galleryDots.appendChild(dot);
    });

    updateGallery();
  }

  function setupThumbs(images) {
    if (!dom?.galleryThumbs) return;
    dom.galleryThumbs.innerHTML = images
      .map(
        (src, idx) => `
        <button type="button" class="gallery-thumb ${idx === 0 ? "active" : ""}" data-thumb-index="${idx}">
          <img src="${escapeHtml(src)}" alt="Thumb ${idx + 1}">
        </button>
      `
      )
      .join("");

    $all("[data-thumb-index]", dom.galleryThumbs).forEach((btn) => {
      btn.addEventListener("click", () => goToSlide(Number(btn.getAttribute("data-thumb-index") || 0)));
    });
  }

  function openLightbox() {
    if (!state.galleryImages.length || !dom?.lightbox || !dom?.lightboxImg) return;
    dom.lightboxImg.src = state.galleryImages[state.galleryIndex];
    dom.lightboxImg.classList.remove("zoomed");
    openModal(dom.lightbox);
  }

  function closeLightbox() {
    closeModal(dom?.lightbox);
  }

  function toggleZoom(e) {
    e.stopPropagation();
    e.currentTarget.classList.toggle("zoomed");
  }

  function initPropertyMap(lat, lng, locationName) {
    if (!dom?.mapEl) return;

    if (state.propertyMapInstance) {
      safeCall(() => state.propertyMapInstance.remove());
      state.propertyMapInstance = null;
    }

    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || !window.L) {
      dom.mapEl.innerHTML = `<div class="map-no-location"><i class="ph ph-map-pin-line"></i><span>${escapeHtml(
        t("unknown_location")
      )}</span></div>`;
      if (dom.mapOpenLink) dom.mapOpenLink.style.display = "none";
      syncPhosphorIcons();
      return;
    }

    const map = window.L.map(dom.mapEl, { zoomControl: true }).setView([lat, lng], 14);
    state.propertyMapInstance = map;

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    window.L.marker([lat, lng]).addTo(map).bindPopup(escapeHtml(locationName || t("unknown_location")));

    if (dom.mapOpenLink) {
      dom.mapOpenLink.href = `https://www.google.com/maps?q=${lat},${lng}`;
      dom.mapOpenLink.style.display = "inline-flex";
    }

    setTimeout(() => safeCall(() => map.invalidateSize()), 200);
  }

  function renderPropertyData(data) {
    const property = normalizePropertyRecord(data);
    state.selectedProperty = property;
    saveSelectedPropertyContext(property);

    const title = getPropertyTitleText(property);
    const location = getPropertyLocationText(property);
    const description = state.lang === "ar" ? property.desc_ar : property.desc_en;
    const propType = getPropertyTypeText(property);
    const images = getPropertyImages(property);
    const features = getPropertyFeatures(property);
    const guestsText = t("up_to_guests", { n: property.maxGuests });
    const bedroomsText =
      property.bedrooms === 1 ? t("bedrooms_count_one", { n: property.bedrooms }) : t("bedrooms_count_many", { n: property.bedrooms });

    setText($("#prop-title"), title);
    setText($("#prop-location"), location);
    setText($("#prop-desc"), description || t("no_description"));
    setText($("#prop-price"), formatCurrency(property.price));
    setText($("#prop-prices"), formatCurrency(property.price));
    setText($("#prop-rating"), property.rating.toFixed(1));
    setText($("#prop-type-text"), propType);
    setText($("#chip-guests"), guestsText);
    setText($("#chip-bedrooms"), bedroomsText);
    setText($("#booking-stat-guests"), guestsText);
    setText($("#booking-stat-type"), propType);

    setText($("#host-name"), property.hostName || "OreBooking Host");
    setText($("#host-since"), t("hosting_since"));
    setText($("#host-badge-text"), t("verified_host"));
    setText($("#booking-info-text"), t("choose_dates_next_page"));
    setText($("#perk-1"), t("free_cancellation_24h"));
    setText($("#perk-2"), t("instant_confirmation"));
    setText($("#perk-3"), t("support_247"));
    setText($("#map-title"), t("where_youll_be"));
    setText($("#open-maps-text"), t("open_google_maps"));
    setText($("#tips-title"), t("good_to_know"));
    setText($("#trust-note"), t("trust_note"));
    setText($("#highlights-title"), t("why_guests_like_it"));
    setText($("#highlight-1-title"), t("great_location"));
    setText($("#highlight-1-desc"), t("great_location_desc"));
    setText($("#highlight-2-title"), t("clean_and_comfortable"));
    setText($("#highlight-2-desc"), t("clean_and_comfortable_desc"));
    setText($("#highlight-3-title"), t("responsive_support"));
    setText($("#highlight-3-desc"), t("responsive_support_desc"));
    setText($("#highlight-4-title"), t("trusted_listing"));
    setText($("#highlight-4-desc"), t("trusted_listing_desc"));
    setText($("#tip-1"), t("choose_dates_next_page"));
    setText($("#tip-2"), t("trust_note"));
    setText($("#tip-3"), t("property_link_copied"));
    setText($("#chip-verified"), t("verified_listing"));
    setText($("#chip-instant"), t("instant_booking_request"));

    const imgEl = $("#prop-main-img");
    if (imgEl) setSrc(imgEl, images[0]);

    const miniImg = $("#prop-mini-img");
    if (miniImg) setSrc(miniImg, images[0]);

    setText($("#prop-mini-title"), title);
    setText($("#prop-mini-loc"), location);
    setText($("#prop-mini-type"), propType);

    if (dom?.bookNowLink) {
      dom.bookNowLink.href = `${ROUTES.booking}?id=${encodeURIComponent(property.id)}`;
    }

    if (dom?.chatPropertyId) dom.chatPropertyId.value = property.id;
    state.currentChatPropertyId = property.id;

    const featContainer = $("#prop-features-list");
    if (featContainer) {
      featContainer.innerHTML = features
        .map(
          (feature) => `
            <li>
              <i class="${escapeHtml(getFeatureIcon(feature))}"></i>
              <span>${escapeHtml(normalizeFeatureLabel(feature))}</span>
            </li>
          `
        )
        .join("");
    }

    setupSlider(images);
    setupThumbs(images);
    initPropertyMap(Number(property.lat), Number(property.lng), location);
    updateFavoriteButtons();
    updatePropertyActionTexts();
    showPropertyContent();
    syncPhosphorIcons();
  }

  async function loadPropertyPage() {
    if (state.currentView !== "property") return;

    const propertyId = getCurrentPropertyId();
    if (!propertyId) {
      showToast(t("no_property_id"), "error");
      return;
    }

    const fromContext = readSelectedPropertyContext();
    if (fromContext && String(fromContext.id) === String(propertyId)) {
      renderPropertyData(fromContext);
    }

    await loadLiveProperties();

    const localMatch = state.liveProperties.find((p) => String(p.id) === String(propertyId));
    if (localMatch) {
      renderPropertyData(localMatch);
      return;
    }

    try {
      const collection = await detectPropertyCollection();
      if (dbIsAvailable() && collection) {
        const doc = await db.collection(collection).doc(String(propertyId)).get();
        if (doc.exists) {
          renderPropertyData({ id: doc.id, docId: doc.id, ...doc.data() });
          return;
        }
      }
    } catch (err) {
      console.error("Property fetch error:", err);
    }

    const fallback = fallbackProperties.map(normalizePropertyRecord).find((p) => String(p.id) === String(propertyId));
    if (fallback) {
      renderPropertyData(fallback);
      return;
    }

    showToast(t("property_not_found"), "error");
  }

  /* =========================================
     18) BOOKING PAGE SHARED HOOKS
  ========================================= */
  function syncBookingPageSharedContext() {
    if (state.currentView !== "booking") return;

    const property = readSelectedPropertyContext();
    if (!property) return;

    const currentQueryId = getCurrentPropertyId();
    if (currentQueryId && String(property.id) !== String(currentQueryId)) {
      safeSet(STORAGE_KEYS.selectedPropertyId, currentQueryId);
    }

    const miniImg = $("#prop-mini-img");
    const miniTitle = $("#prop-mini-title");
    const miniLoc = $("#prop-mini-loc");
    const miniType = $("#prop-mini-type");
    const nightPrice = $("#sb-night-price");
    const nightPriceAlt = $("#sb-night-prices");
    const finalTotal = $("#sb-final-total");

    if (miniImg) setSrc(miniImg, getPropertyImages(property)[0]);
    if (miniTitle) setText(miniTitle, getPropertyTitleText(property));
    if (miniLoc) setText(miniLoc, getPropertyLocationText(property));
    if (miniType) setText(miniType, getPropertyTypeText(property));
    if (nightPrice) setText(nightPrice, formatCurrency(property.price));
    if (nightPriceAlt) setText(nightPriceAlt, formatCurrency(property.price));
    if (finalTotal) setText(finalTotal, formatCurrency(property.price));

    const guestEmail = $("#guest-email");
    const guestName = $("#guest-name");
    const billingName = $("#billing-name");

    if (state.user) {
      if (guestEmail && !guestEmail.value) guestEmail.value = state.user.email || "";
      if (guestName && !guestName.value) guestName.value = state.user.displayName || "";
      if (billingName && !billingName.value) billingName.value = state.user.displayName || "";
    }
  }

  /* =========================================
     19) SEARCH / FILTER
  ========================================= */
  function handleSearch() {
    state.activeSearch = normalizeText(dom?.destinationInput?.value || "");
    renderListings();
  }

  function clearSearch() {
    state.activeSearch = "";
    if (dom?.destinationInput) dom.destinationInput.value = "";
    renderListings();
  }

  function setActiveCategory(category) {
    state.activeCategory
