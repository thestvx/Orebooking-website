/* =========================================
   OreBooking v4.3 - Full Core JS (Fixed)
   ========================================= */
"use strict";

/* ===============================
   1) FIREBASE
================================ */
const firebaseConfig = {
  apiKey: "AIzaSyCA5iauXrIhozRw8MD7JTOLyeQ2v0GGncA",
  authDomain: "orebooking-website.firebaseapp.com",
  projectId: "orebooking-website",
  storageBucket: "orebooking-website.firebasestorage.app"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();

/* ===============================
   2) STATE
================================ */
const appState = {
  lang: localStorage.getItem("ore_lang") || "en",
  theme: localStorage.getItem("ore_theme") || "light",
  user: null,
  properties: [],
  filteredProperties: [],
  favorites: JSON.parse(localStorage.getItem("ore_favorites") || "[]"),
  activeCategory: "all",
  searchQuery: "",
  sortBy: "default",
  loading: false,
  hasMore: true,
  pageSize: 12,
  lastVisible: null
};

/* ===============================
   3) ELEMENTS
================================ */
const el = {
  body: document.body,
  html: document.documentElement,

  themeToggle: document.getElementById("theme-toggle"),
  langToggle: document.getElementById("lang-toggle"),
  userPoints: document.getElementById("user-points"),

  listingsGrid: document.getElementById("listings-grid"),
  loadMoreBtn: document.getElementById("load-more-btn"),
  searchSpinner: document.getElementById("search-spinner"),
  searchNoResults: document.getElementById("search-no-results"),

  categoriesContainer: document.getElementById("categories-container"),
  sortSelect: document.getElementById("sort-select"),
  sectionMainTitle: document.getElementById("section-main-title"),

  searchLocation: document.getElementById("search-location"),
  searchDates: document.getElementById("search-dates"),
  searchGuests: document.getElementById("search-guests"),
  mainSearchBtn: document.getElementById("main-search-btn"),
  clearSearchBtn: document.getElementById("clear-search-btn"),
  searchDropdown: document.getElementById("search-dropdown"),
  searchLocationWrapper: document.getElementById("search-location-wrapper"),

  openAuthBtn: document.getElementById("open-auth-btn"),
  profileDropdown: document.getElementById("profile-dropdown"),
  dropdownUserName: document.getElementById("dropdown-user-name"),
  dropdownUserEmail: document.getElementById("dropdown-user-email"),
  myBookingsBtn: document.getElementById("my-bookings-btn"),
  myFavoritesBtn: document.getElementById("my-favorites-btn"),
  logoutBtn: document.getElementById("fixed-logout-btn") || document.getElementById("logout-btn"),

  authModal: document.getElementById("auth-modal"),
  closeAuthBtn: document.getElementById("close-auth-btn"),
  authMessage: document.getElementById("auth-message"),

  loginForm: document.getElementById("login-form"),
  registerForm: document.getElementById("register-form"),
  forgotForm: document.getElementById("forgot-form"),

  loginEmail: document.getElementById("login-email"),
  loginPassword: document.getElementById("login-password"),
  registerName: document.getElementById("reg-name"),
  registerEmail: document.getElementById("reg-email"),
  registerPassword: document.getElementById("reg-password"),
  forgotEmail: document.getElementById("forgot-email"),

  loginSubmitBtn: document.getElementById("login-submit-btn"),
  registerSubmitBtn: document.getElementById("register-submit-btn"),
  forgotSubmitBtn: document.getElementById("forgot-submit-btn"),
  googleLoginBtn: document.getElementById("google-login-btn"),

  goToRegister: document.getElementById("go-to-register"),
  goToLogin: document.getElementById("go-to-login"),
  showForgotLink: document.getElementById("show-forgot-link"),
  backToLoginLink: document.getElementById("back-to-login-link"),

  toastContainer: document.getElementById("toast-container"),
  favToast: document.getElementById("fav-toast"),

  scrollTopBtn: document.getElementById("scroll-top-btn"),

  mobileNavHome: document.getElementById("mob-nav-home"),
  mobileNavSearch: document.getElementById("mob-nav-search"),
  mobileNavFavorites: document.getElementById("mob-nav-favorites"),
  mobileNavProfile: document.getElementById("mob-nav-profile")
};

/* ===============================
   4) TRANSLATIONS
================================ */
const i18n = {
  en: {
    hero_title: "Find your next perfect stay",
    hero_subtitle: "Discover premium apartments, villas, and unique homes around the world.",
    location: "Location",
    location_placeholder: "Where are you going?",
    dates: "Dates",
    dates_placeholder: "Add dates",
    guests: "Guests",
    guests_placeholder: "Add guests",
    search: "Search",
    trending: "Trending Destinations",
    sort_default: "Sort: Default",
    sort_price_asc: "Price ↑",
    sort_price_desc: "Price ↓",
    sort_rating: "Top Rated",
    no_results_title: "No results found",
    no_results_sub: "Try a different city or hotel name.",
    load_more: "Load More",
    pts: "Pts",
    my_bookings: "My Bookings",
    my_favorites: "My Favorites",
    logout: "Log Out",
    sign_in: "Sign In",
    sign_up: "Sign Up",
    forgot_pass: "Forgot?",
    no_account: "Don't have an account?",
    welcome_back: "Welcome back",
    create_account: "Create Account",
    developed_by: "Developed by:",
    home: "Home",
    saved: "Saved",
    profile: "Profile",
    clear_search: "Clear Search",
    night: "night",
    cat_all: "All",
    cat_apartments: "Apartments",
    cat_villas: "Villas",
    cat_resorts: "Resorts",
    cat_pools: "Pools",
    login_success: "Login successful!",
    register_success: "Account created successfully!",
    logout_success: "Logged out successfully.",
    reset_sent: "Password reset email sent.",
    auth_failed: "Authentication failed. Check your data.",
    required_fields: "Please fill in all required fields.",
    google_failed: "Google sign-in failed.",
    error_fetch: "Error loading properties.",
    added_fav: "Added to favorites",
    removed_fav: "Removed from favorites",
    email: "Email",
    password: "Password",
    remember_me: "Remember me"
  },
  ar: {
    hero_title: "اكتشف إقامتك المثالية القادمة",
    hero_subtitle: "اكتشف شققاً فاخرة، فلل، ومنازل فريدة حول العالم.",
    location: "الموقع",
    location_placeholder: "إلى أين ستذهب؟",
    dates: "التواريخ",
    dates_placeholder: "أضف التواريخ",
    guests: "الضيوف",
    guests_placeholder: "أضف الضيوف",
    search: "بحث",
    trending: "الوجهات الشائعة",
    sort_default: "الترتيب: الافتراضي",
    sort_price_asc: "السعر ↑",
    sort_price_desc: "السعر ↓",
    sort_rating: "الأعلى تقييماً",
    no_results_title: "لم يتم العثور على نتائج",
    no_results_sub: "جرّب مدينة أخرى أو اسم فندق مختلف.",
    load_more: "تحميل المزيد",
    pts: "نقطة",
    my_bookings: "حجوزاتي",
    my_favorites: "مفضلتي",
    logout: "تسجيل الخروج",
    sign_in: "تسجيل الدخول",
    sign_up: "إنشاء حساب",
    forgot_pass: "نسيت؟",
    no_account: "ليس لديك حساب؟",
    welcome_back: "مرحباً بعودتك",
    create_account: "إنشاء حساب",
    developed_by: "تم التطوير بواسطة:",
    home: "الرئيسية",
    saved: "المحفوظة",
    profile: "الحساب",
    clear_search: "إلغاء البحث",
    night: "ليلة",
    cat_all: "الكل",
    cat_apartments: "شقق",
    cat_villas: "فلل",
    cat_resorts: "منتجعات",
    cat_pools: "مسابح",
    login_success: "تم تسجيل الدخول بنجاح!",
    register_success: "تم إنشاء الحساب بنجاح!",
    logout_success: "تم تسجيل الخروج بنجاح.",
    reset_sent: "تم إرسال رابط إعادة تعيين كلمة المرور.",
    auth_failed: "فشل تسجيل الدخول. تحقق من البيانات.",
    required_fields: "يرجى تعبئة جميع الحقول المطلوبة.",
    google_failed: "فشل تسجيل الدخول عبر Google.",
    error_fetch: "حدث خطأ أثناء تحميل العقارات.",
    added_fav: "تمت الإضافة للمفضلة",
    removed_fav: "تمت الإزالة من المفضلة",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    remember_me: "تذكرني"
  }
};

function t(key) {
  return i18n[appState.lang]?.[key] || key;
}

/* ===============================
   5) HELPERS
================================ */
function safeText(v, fallback = "—") {
  return v === undefined || v === null || v === "" ? fallback : v;
}

function formatPrice(num) {
  const n = Number(num || 0);
  return n.toLocaleString(appState.lang === "ar" ? "ar-DZ" : "en-US");
}

function showToast(message, type = "info") {
  if (!el.toastContainer) return;

  const icons = {
    success: "ph-check-circle",
    error: "ph-warning-circle",
    info: "ph-info"
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<i class="ph-fill ${icons[type] || icons.info}"></i><span>${message}</span>`;
  el.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

let favToastTimer;
function showFavToast(message) {
  if (!el.favToast) return;
  el.favToast.textContent = message;
  el.favToast.classList.add("show");
  clearTimeout(favToastTimer);
  favToastTimer = setTimeout(() => {
    el.favToast.classList.remove("show");
  }, 1800);
}

function setBtnLoading(btn, isLoading, originalText = "") {
  if (!btn) return;
  if (isLoading) {
    btn.disabled = true;
    if (!btn.dataset.originalText) btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = `<i class="ph ph-spinner ph-spin"></i>`;
  } else {
    btn.disabled = false;
    btn.innerHTML = originalText || btn.dataset.originalText || btn.innerHTML;
  }
}

function showAuthMessage(message = "", type = "error") {
  if (!el.authMessage) return;
  if (!message) {
    el.authMessage.style.display = "none";
    el.authMessage.className = "auth-message";
    el.authMessage.textContent = "";
    return;
  }
  el.authMessage.textContent = message;
  el.authMessage.className = `auth-message ${type}`;
  el.authMessage.style.display = "block";
}

/* ===============================
   6) UI LANGUAGE / THEME
================================ */
function applyTheme() {
  document.body.classList.toggle("dark", appState.theme === "dark");
}

function applyLanguage() {
  document.documentElement.dir = appState.lang === "ar" ? "rtl" : "ltr";
  document.documentElement.lang = appState.lang;

  document.querySelectorAll("[data-i18n]").forEach(node => {
    const key = node.getAttribute("data-i18n");
    if (i18n[appState.lang]?.[key]) node.textContent = i18n[appState.lang][key];
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach(node => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (i18n[appState.lang]?.[key]) node.placeholder = i18n[appState.lang][key];
  });

  if (el.langToggle) {
    el.langToggle.innerHTML = appState.lang === "ar" ? "English" : "العربية";
  }
}

/* ===============================
   7) AUTH MODAL
================================ */
function openAuthModal() {
  if (!el.authModal) return;
  showAuthMessage("");
  el.authModal.style.opacity = "1";
  el.authModal.style.pointerEvents = "auto";
  el.authModal.classList.add("active");
}

function closeAuthModal() {
  if (!el.authModal) return;
  el.authModal.style.opacity = "0";
  el.authModal.style.pointerEvents = "none";
  el.authModal.classList.remove("active");
  showAuthMessage("");
}

function showAuthForm(formId) {
  [el.loginForm, el.registerForm, el.forgotForm].forEach(form => {
    if (!form) return;
    form.style.display = "none";
    form.classList.remove("active");
  });

  const form = document.getElementById(formId);
  if (form) {
    form.style.display = "flex";
    form.classList.add("active");
  }

  showAuthMessage("");
}

/* ===============================
   8) AUTH STATE
================================ */
function updateAuthUI(user) {
  appState.user = user || null;

  if (user) {
    if (el.dropdownUserName) {
      el.dropdownUserName.textContent = safeText(user.displayName, "User");
    }
    if (el.dropdownUserEmail) {
      el.dropdownUserEmail.textContent = safeText(user.email, "");
    }

    if (el.openAuthBtn) {
      el.openAuthBtn.innerHTML = `<i class="ph-fill ph-user-circle"></i>`;
      el.openAuthBtn.setAttribute("aria-label", "Profile menu");
    }

    closeAuthModal();
  } else {
    if (el.dropdownUserName) el.dropdownUserName.textContent = "User Name";
    if (el.dropdownUserEmail) el.dropdownUserEmail.textContent = "user@email.com";

    if (el.openAuthBtn) {
      el.openAuthBtn.innerHTML = `<i class="ph ph-user"></i>`;
      el.openAuthBtn.setAttribute("aria-label", "Open login");
    }

    if (el.profileDropdown) {
      el.profileDropdown.classList.remove("active");
    }
  }
}

auth.onAuthStateChanged(async (user) => {
  updateAuthUI(user);

  if (user) {
    try {
      const userDoc = await db.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        const data = userDoc.data();
        if (el.userPoints) {
          el.userPoints.textContent = formatPrice(data.points || 1250);
        }
      } else {
        if (el.userPoints) el.userPoints.textContent = formatPrice(1250);
      }
    } catch (err) {
      if (el.userPoints) el.userPoints.textContent = formatPrice(1250);
    }
  } else {
    if (el.userPoints) el.userPoints.textContent = formatPrice(1250);
  }
});

/* ===============================
   9) AUTH ACTIONS
================================ */
async function handleLogin(e) {
  e.preventDefault();

  const email = el.loginEmail?.value.trim();
  const password = el.loginPassword?.value.trim();

  if (!email || !password) {
    showAuthMessage(t("required_fields"), "error");
    return;
  }

  try {
    setBtnLoading(el.loginSubmitBtn, true);
    await auth.signInWithEmailAndPassword(email, password);
    showToast(t("login_success"), "success");
    closeAuthModal();
  } catch (error) {
    console.error("Login error:", error);
    showAuthMessage(t("auth_failed"), "error");
  } finally {
    setBtnLoading(el.loginSubmitBtn, false, `<span data-i18n="sign_in">${t("sign_in")}</span>`);
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const name = el.registerName?.value.trim();
  const email = el.registerEmail?.value.trim();
  const password = el.registerPassword?.value.trim();

  if (!name || !email || !password) {
    showAuthMessage(t("required_fields"), "error");
    return;
  }

  try {
    setBtnLoading(el.registerSubmitBtn, true);
    const cred = await auth.createUserWithEmailAndPassword(email, password);

    await cred.user.updateProfile({ displayName: name });

    await db.collection("users").doc(cred.user.uid).set({
      name,
      email,
      points: 1250,
      role: "guest",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    showToast(t("register_success"), "success");
    closeAuthModal();
  } catch (error) {
    console.error("Register error:", error);
    showAuthMessage(error.message || t("auth_failed"), "error");
  } finally {
    setBtnLoading(el.registerSubmitBtn, false, t("sign_up"));
  }
}

async function handleForgotPassword(e) {
  e.preventDefault();

  const email = el.forgotEmail?.value.trim();
  if (!email) {
    showAuthMessage(t("required_fields"), "error");
    return;
  }

  try {
    setBtnLoading(el.forgotSubmitBtn, true);
    await auth.sendPasswordResetEmail(email);
    showAuthMessage(t("reset_sent"), "success");
  } catch (error) {
    console.error("Reset error:", error);
    showAuthMessage(error.message || t("auth_failed"), "error");
  } finally {
    setBtnLoading(el.forgotSubmitBtn, false, "Send Reset Link");
  }
}

async function handleGoogleLogin() {
  try {
    setBtnLoading(el.googleLoginBtn, true);
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    if (user) {
      await db.collection("users").doc(user.uid).set({
        name: user.displayName || "Google User",
        email: user.email || "",
        points: 1250,
        role: "guest",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      showToast(t("login_success"), "success");
      closeAuthModal();
    }
  } catch (error) {
    console.error("Google login error:", error);
    showAuthMessage(t("google_failed"), "error");
  } finally {
    setBtnLoading(el.googleLoginBtn, false, `<i class="ph-fill ph-google-logo" style="color:#ea4335; font-size: 1.2rem;"></i> Google`);
  }
}

async function handleLogout() {
  try {
    await auth.signOut();
    if (el.profileDropdown) el.profileDropdown.classList.remove("active");
    showToast(t("logout_success"), "info");
  } catch (error) {
    console.error("Logout error:", error);
    showToast("Logout failed", "error");
  }
}

/* ===============================
   10) PROPERTIES FETCH
================================ */
async function fetchProperties(reset = false) {
  if (appState.loading) return;
  appState.loading = true;

  if (reset) {
    appState.properties = [];
    appState.filteredProperties = [];
    appState.lastVisible = null;
    appState.hasMore = true;
    if (el.listingsGrid) el.listingsGrid.innerHTML = "";
  }

  if (el.searchSpinner) el.searchSpinner.style.display = "block";
  if (el.loadMoreBtn) el.loadMoreBtn.style.display = "none";

  try {
    let query = db.collection("properties").where("status", "==", "active");

    if (appState.activeCategory !== "all") {
      query = query.where("category", "==", appState.activeCategory);
    }

    query = query.limit(appState.pageSize);

    if (appState.lastVisible) {
      query = query.startAfter(appState.lastVisible);
    }

    const snap = await query.get();

    if (snap.empty) {
      appState.hasMore = false;
      if (appState.properties.length === 0) renderGrid([]);
      return;
    }

    appState.lastVisible = snap.docs[snap.docs.length - 1];

    const items = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    appState.properties = reset ? items : [...appState.properties, ...items];
    applyFiltersAndRender();

    if (snap.docs.length < appState.pageSize) {
      appState.hasMore = false;
    }
  } catch (error) {
    console.error("Fetch properties error:", error);
    showToast(t("error_fetch"), "error");
  } finally {
    appState.loading = false;
    if (el.searchSpinner) el.searchSpinner.style.display = "none";
    if (el.loadMoreBtn) {
      el.loadMoreBtn.style.display = appState.hasMore ? "inline-flex" : "none";
    }
  }
}

/* ===============================
   11) FILTER / SORT
================================ */
function applyFiltersAndRender() {
  let list = [...appState.properties];

  if (appState.searchQuery) {
    const q = appState.searchQuery.toLowerCase();
    list = list.filter(item => {
      const titleEn = (item.titleEn || "").toLowerCase();
      const titleAr = (item.titleAr || "").toLowerCase();
      const locationEn = (item.locationEn || "").toLowerCase();
      const locationAr = (item.locationAr || "").toLowerCase();
      return (
        titleEn.includes(q) ||
        titleAr.includes(q) ||
        locationEn.includes(q) ||
        locationAr.includes(q)
      );
    });
  }

  if (appState.sortBy === "price_asc") {
    list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  } else if (appState.sortBy === "price_desc") {
    list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  } else if (appState.sortBy === "rating") {
    list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  }

  appState.filteredProperties = list;
  renderGrid(list);
}

function filterBySearch(query) {
  appState.searchQuery = query || "";
  applyFiltersAndRender();
}

function setSort(value) {
  appState.sortBy = value || "default";
  applyFiltersAndRender();
}

/* ===============================
   12) RENDER CATEGORIES
================================ */
function renderCategories() {
  if (!el.categoriesContainer) return;

  const cats = [
    { id: "all", icon: "ph-squares-four", label: t("cat_all") },
    { id: "Apartment", icon: "ph-buildings", label: t("cat_apartments") },
    { id: "Villa", icon: "ph-house", label: t("cat_villas") },
    { id: "Resort", icon: "ph-tree-evergreen", label: t("cat_resorts") },
    { id: "Pool", icon: "ph-swimming-pool", label: t("cat_pools") }
  ];

  el.categoriesContainer.innerHTML = cats.map(cat => `
    <button class="category-btn ${appState.activeCategory === cat.id ? "active" : ""}" data-cat="${cat.id}">
      <i class="ph ${cat.icon}"></i>
      <span>${cat.label}</span>
    </button>
  `).join("");

  el.categoriesContainer.querySelectorAll(".category-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      appState.activeCategory = btn.dataset.cat;
      renderCategories();
      await fetchProperties(true);
    });
  });
}

/* ===============================
   13) RENDER GRID
================================ */
function renderGrid(items) {
  if (!el.listingsGrid) return;

  if (!items.length) {
    el.listingsGrid.innerHTML = "";
    if (el.searchNoResults) el.searchNoResults.style.display = "block";
    return;
  }

  if (el.searchNoResults) el.searchNoResults.style.display = "none";

  const isAr = appState.lang === "ar";

  el.listingsGrid.innerHTML = items.map(item => {
    const title = isAr ? (item.titleAr || item.titleEn || "OreBooking") : (item.titleEn || item.titleAr || "OreBooking");
    const location = isAr ? (item.locationAr || item.locationEn || "—") : (item.locationEn || item.locationAr || "—");
    const image = item.imageUrl || (Array.isArray(item.images) ? item.images[0] : "") || "logos/orebooking.png";
    const price = formatPrice(item.price || 0);
    const rating = safeText(item.rating, "4.8");
    const isFav = appState.favorites.includes(item.id);

    return `
      <div class="card listing-card-animate is-visible" data-id="${item.id}">
        <div class="card-img-wrapper">
          <img src="${image}" alt="${title}" class="card-img" loading="lazy">
          <button class="fav-btn ${isFav ? "active" : ""}" data-fav-id="${item.id}" aria-label="Favorite">
            <i class="${isFav ? "ph-fill ph-heart" : "ph ph-heart"}"></i>
          </button>
        </div>
        <div class="card-content">
          <div class="card-header">
            <div style="flex:1; min-width:0;">
              <h3 class="card-title">${title}</h3>
              <div class="card-location">
                <i class="ph ph-map-pin"></i>
                <span>${location}</span>
              </div>
            </div>
            <div class="card-rating">
              <i class="ph-fill ph-star"></i>
              <span>${rating}</span>
            </div>
          </div>
          <div class="card-footer">
            <div class="card-price">${price} ${isAr ? "د.ج" : "DZD"} <span>/ ${t("night")}</span></div>
          </div>
        </div>
      </div>
    `;
  }).join("");

  el.listingsGrid.querySelectorAll(".card").forEach(card => {
    card.addEventListener("click", (e) => {
      if (e.target.closest(".fav-btn")) return;
      const id = card.dataset.id;
      window.location.href = `property.html?id=${id}`;
    });
  });

  el.listingsGrid.querySelectorAll(".fav-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(btn.dataset.favId, btn);
    });
  });
}

/* ===============================
   14) FAVORITES
================================ */
function toggleFavorite(id, btn) {
  const found = appState.favorites.indexOf(id);

  if (found > -1) {
    appState.favorites.splice(found, 1);
    showFavToast(t("removed_fav"));
  } else {
    appState.favorites.push(id);
    showFavToast(t("added_fav"));
  }

  localStorage.setItem("ore_favorites", JSON.stringify(appState.favorites));

  if (btn) {
    const icon = btn.querySelector("i");
    const active = appState.favorites.includes(id);
    btn.classList.toggle("active", active);
    if (icon) icon.className = active ? "ph-fill ph-heart" : "ph ph-heart";
  }
}

/* ===============================
   15) SEARCH DROPDOWN
================================ */
function renderSearchSuggestions() {
  if (!el.searchDropdown || !el.searchLocation) return;

  const q = el.searchLocation.value.trim().toLowerCase();
  if (!q) {
    el.searchDropdown.classList.remove("active");
    el.searchDropdown.innerHTML = "";
    return;
  }

  const suggestions = appState.properties
    .filter(item => {
      const titleEn = (item.titleEn || "").toLowerCase();
      const titleAr = (item.titleAr || "").toLowerCase();
      const locationEn = (item.locationEn || "").toLowerCase();
      const locationAr = (item.locationAr || "").toLowerCase();
      return titleEn.includes(q) || titleAr.includes(q) || locationEn.includes(q) || locationAr.includes(q);
    })
    .slice(0, 6);

  if (!suggestions.length) {
    el.searchDropdown.innerHTML = `<div class="no-results"><i class="ph ph-map-pin"></i>${t("no_results_title")}</div>`;
    el.searchDropdown.classList.add("active");
    return;
  }

  const isAr = appState.lang === "ar";

  el.searchDropdown.innerHTML = suggestions.map(item => {
    const title = isAr ? (item.titleAr || item.titleEn || "OreBooking") : (item.titleEn || item.titleAr || "OreBooking");
    const location = isAr ? (item.locationAr || item.locationEn || "—") : (item.locationEn || item.locationAr || "—");
    const price = formatPrice(item.price || 0);

    return `
      <div class="search-item" data-search-id="${item.id}" data-search-title="${title.replace(/"/g, "&quot;")}">
        <div class="search-icon-box"><i class="ph ph-map-pin"></i></div>
        <div class="search-item-info">
          <div class="search-item-title">${title}</div>
          <div class="search-item-sub">${location}</div>
        </div>
        <div class="search-item-price">${price}</div>
      </div>
    `;
  }).join("");

  el.searchDropdown.classList.add("active");

  el.searchDropdown.querySelectorAll(".search-item").forEach(item => {
    item.addEventListener("click", () => {
      el.searchLocation.value = item.dataset.searchTitle || "";
      appState.searchQuery = el.searchLocation.value.trim().toLowerCase();
      filterBySearch(appState.searchQuery);
      el.searchDropdown.classList.remove("active");
    });
  });
}

/* ===============================
   16) EVENTS
================================ */
function setupEvents() {
  el.themeToggle?.addEventListener("click", () => {
    appState.theme = appState.theme === "dark" ? "light" : "dark";
    localStorage.setItem("ore_theme", appState.theme);
    applyTheme();
  });

  el.langToggle?.addEventListener("click", () => {
    appState.lang = appState.lang === "ar" ? "en" : "ar";
    localStorage.setItem("ore_lang", appState.lang);
    applyLanguage();
    renderCategories();
    applyFiltersAndRender();
  });

  el.openAuthBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (appState.user) {
      el.profileDropdown?.classList.toggle("active");
    } else {
      openAuthModal();
    }
  });

  el.closeAuthBtn?.addEventListener("click", closeAuthModal);

  document.addEventListener("click", (e) => {
    if (el.profileDropdown && !e.target.closest(".profile-container")) {
      el.profileDropdown.classList.remove("active");
    }

    if (el.searchDropdown && !e.target.closest("#search-location-wrapper")) {
      el.searchDropdown.classList.remove("active");
    }
  });

  el.loginForm?.addEventListener("submit", handleLogin);
  el.registerForm?.addEventListener("submit", handleRegister);
  el.forgotForm?.addEventListener("submit", handleForgotPassword);
  el.googleLoginBtn?.addEventListener("click", handleGoogleLogin);
  el.logoutBtn?.addEventListener("click", handleLogout);

  el.goToRegister?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("register-form");
  });

  el.goToLogin?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("login-form");
  });

  el.showForgotLink?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("forgot-form");
  });

  el.backToLoginLink?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuthForm("login-form");
  });

  el.searchLocation?.addEventListener("input", () => {
    renderSearchSuggestions();
  });

  el.mainSearchBtn?.addEventListener("click", () => {
    const q = el.searchLocation?.value.trim().toLowerCase() || "";
    appState.searchQuery = q;
    filterBySearch(q);
  });

  el.clearSearchBtn?.addEventListener("click", () => {
    if (el.searchLocation) el.searchLocation.value = "";
    appState.searchQuery = "";
    applyFiltersAndRender();
  });

  el.sortSelect?.addEventListener("change", (e) => {
    setSort(e.target.value);
  });

  el.loadMoreBtn?.addEventListener("click", () => {
    fetchProperties(false);
  });

  window.addEventListener("scroll", () => {
    if (el.scrollTopBtn) {
      el.scrollTopBtn.classList.toggle("visible", window.scrollY > 400);
    }
  }, { passive: true });

  el.scrollTopBtn?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.querySelectorAll(".toggle-pass-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      const icon = btn.querySelector("i");
      if (!input) return;
      const isPassword = input.type === "password";
      input.type = isPassword ? "text" : "password";
      if (icon) icon.className = isPassword ? "ph ph-eye-slash" : "ph ph-eye";
    });
  });

  el.mobileNavHome?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  el.mobileNavSearch?.addEventListener("click", () => {
    document.getElementById("hero-section")?.scrollIntoView({ behavior: "smooth" });
  });

  el.mobileNavFavorites?.addEventListener("click", () => {
    if (!appState.favorites.length) {
      showToast(t("no_results_title"), "info");
      return;
    }
    const favItems = appState.properties.filter(p => appState.favorites.includes(p.id));
    renderGrid(favItems);
  });

  el.mobileNavProfile?.addEventListener("click", () => {
    if (appState.user) {
      el.profileDropdown?.classList.toggle("active");
    } else {
      openAuthModal();
    }
  });
}

/* ===============================
   17) INIT
================================ */
async function initApp() {
  applyTheme();
  applyLanguage();
  setupEvents();
  renderCategories();
  await fetchProperties(true);
}

document.addEventListener("DOMContentLoaded", initApp);
