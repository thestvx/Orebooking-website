// =========================================
// OreBooking Auth UI Logic — Production Ready
// Theme / Language / View Switching / Firebase Auth
// Supports login / register / forgot password
// =========================================

(function () {
  "use strict";

  const g = typeof globalThis !== "undefined" ? globalThis : window;

  // -----------------------------------------
  // Storage Keys
  // -----------------------------------------
  const AUTH_STORAGE_KEYS = {
    lang: "ore_lang",
    theme: "ore_theme",
    view: "ore_auth_view"
  };

  // -----------------------------------------
  // Auth State
  // -----------------------------------------
  const authState = {
    lang: safeStorageGet(AUTH_STORAGE_KEYS.lang, "en"),
    theme: safeStorageGet(AUTH_STORAGE_KEYS.theme, "light"),
    activeView: safeStorageGet(AUTH_STORAGE_KEYS.view, "login"),
    initialized: false,
    authReady: false,
    auth: null,
    firebaseAppReady: false,
    listenersBound: false
  };

  // -----------------------------------------
  // Translations
  // -----------------------------------------
  const authTranslations = {
    en: {
      page_title: "OreBooking - Sign In / Sign Up",
      welcome_back: "Welcome back!",
      welcome_back_small: "Welcome back",
      login_desc: "Enter your details to access your account and enjoy exclusive offers.",
      email: "Email Address",
      password: "Password",
      remember_me: "Remember me",
      forgot_pass: "Forgot password?",
      sign_in: "Sign In",
      or_continue: "Or continue with",
      no_account: "Don’t have an account?",
      sign_up: "Create one",
      create_account: "Create new account",
      create_account_small: "Create your profile",
      register_desc: "Join OreBooking and start collecting loyalty points now.",
      full_name: "Full Name",
      phone_optional: "Phone Number (Optional)",
      sign_up_btn: "Create Account",
      has_account: "Already have an account?",
      reset_title: "Reset your password",
      reset_desc: "Enter your email address and we will send you a password reset link.",
      reset_short: "Reset",
      reset_small: "Password reset",
      send_reset_link: "Send reset link",
      remembered_password: "Remembered your password?",
      password_hint: "Use at least 8 characters with letters and numbers.",
      weak: "Weak",
      fair: "Fair",
      good: "Good",
      strong: "Strong",
      confirm_password: "Confirm Password",
      agree_terms: "I agree to the Terms of Service and Privacy Policy.",
      email_placeholder: "Enter your email address",
      password_placeholder: "Enter your password",
      full_name_placeholder: "e.g. John Doe",
      phone_placeholder: "Optional phone number",
      confirm_password_placeholder: "Confirm your password",
      lang_label: "AR",
      firebase_missing: "Firebase configuration is missing. Add your project settings first.",
      invalid_email: "Please enter a valid email address.",
      invalid_name: "Please enter your full name.",
      invalid_password: "Password must be at least 8 characters.",
      invalid_confirm_password: "Passwords do not match.",
      must_accept_terms: "You need to agree to the terms before creating your account.",
      login_success: "Logged in successfully.",
      register_success: "Account created successfully.",
      reset_success: "Password reset link sent successfully.",
      login_failed: "Unable to sign in. Please check your details.",
      register_failed: "Unable to create account right now.",
      reset_failed: "Unable to send reset email right now.",
      google_not_ready: "Google sign-in is not available until Firebase is configured.",
      apple_not_ready: "Apple sign-in is not enabled on this page yet.",
      coming_soon: "Coming soon.",
      loading: "Please wait...",
      redirecting: "Redirecting...",
      already_logged_in: "You are already signed in. Redirecting now.",
      cancelled_popup: "Sign-in window was closed before completing the process.",
      switch_light: "Switch to light mode",
      switch_dark: "Switch to dark mode"
    },
    ar: {
      page_title: "OreBooking - تسجيل الدخول / إنشاء حساب",
      welcome_back: "مرحباً بعودتك!",
      welcome_back_small: "مرحبًا بعودتك",
      login_desc: "أدخل بياناتك للوصول إلى حسابك والاستمتاع بعروضنا الحصرية.",
      email: "البريد الإلكتروني",
      password: "كلمة المرور",
      remember_me: "تذكرني",
      forgot_pass: "نسيت كلمة المرور؟",
      sign_in: "تسجيل الدخول",
      or_continue: "أو تابع باستخدام",
      no_account: "ليس لديك حساب؟",
      sign_up: "إنشاء حساب جديد",
      create_account: "إنشاء حساب جديد",
      create_account_small: "أنشئ ملفك الشخصي",
      register_desc: "انضم إلى OreBooking وابدأ بتجميع نقاط الولاء الآن.",
      full_name: "الاسم الكامل",
      phone_optional: "رقم الهاتف (اختياري)",
      sign_up_btn: "إنشاء حساب",
      has_account: "لديك حساب بالفعل؟",
      reset_title: "إعادة تعيين كلمة المرور",
      reset_desc: "أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور.",
      reset_short: "استعادة",
      reset_small: "استعادة كلمة المرور",
      send_reset_link: "إرسال رابط التعيين",
      remembered_password: "تذكرت كلمة المرور؟",
      password_hint: "استخدم 8 أحرف على الأقل مع حروف وأرقام.",
      weak: "ضعيفة",
      fair: "مقبولة",
      good: "جيدة",
      strong: "قوية",
      confirm_password: "تأكيد كلمة المرور",
      agree_terms: "أوافق على شروط الخدمة وسياسة الخصوصية.",
      email_placeholder: "أدخل بريدك الإلكتروني",
      password_placeholder: "أدخل كلمة المرور",
      full_name_placeholder: "مثال: أحمد محمد",
      phone_placeholder: "رقم هاتف اختياري",
      confirm_password_placeholder: "أكد كلمة المرور",
      lang_label: "EN",
      firebase_missing: "إعدادات Firebase غير موجودة. أضف إعدادات مشروعك أولاً.",
      invalid_email: "يرجى إدخال بريد إلكتروني صحيح.",
      invalid_name: "يرجى إدخال الاسم الكامل.",
      invalid_password: "يجب أن تكون كلمة المرور 8 أحرف على الأقل.",
      invalid_confirm_password: "كلمتا المرور غير متطابقتين.",
      must_accept_terms: "يجب الموافقة على الشروط قبل إنشاء الحساب.",
      login_success: "تم تسجيل الدخول بنجاح.",
      register_success: "تم إنشاء الحساب بنجاح.",
      reset_success: "تم إرسال رابط إعادة التعيين بنجاح.",
      login_failed: "تعذر تسجيل الدخول. تحقق من بياناتك.",
      register_failed: "تعذر إنشاء الحساب حالياً.",
      reset_failed: "تعذر إرسال بريد إعادة التعيين حالياً.",
      google_not_ready: "تسجيل الدخول عبر Google غير متاح حتى تتم إضافة إعدادات Firebase.",
      apple_not_ready: "تسجيل الدخول عبر Apple غير مفعّل في هذه الصفحة حالياً.",
      coming_soon: "قريباً.",
      loading: "يرجى الانتظار...",
      redirecting: "جارٍ التحويل...",
      already_logged_in: "أنت مسجل الدخول بالفعل. جارٍ تحويلك الآن.",
      cancelled_popup: "تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.",
      switch_light: "التبديل إلى الوضع الفاتح",
      switch_dark: "التبديل إلى الوضع الداكن"
    }
  };

  // -----------------------------------------
  // DOM Cache
  // -----------------------------------------
  const authDOM = {
    htmlEl: document.documentElement,
    body: document.body,
    langBtn: document.getElementById("lang-toggle"),
    themeBtn: document.getElementById("theme-toggle"),
    authMessage: document.getElementById("auth-message"),

    loginForm: document.getElementById("login-form"),
    registerForm: document.getElementById("register-form"),
    forgotForm: document.getElementById("forgot-form"),

    loginTab: document.getElementById("tab-login"),
    registerTab: document.getElementById("tab-register"),
    forgotTab: document.getElementById("tab-forgot"),

    goToRegisterBtn: document.getElementById("go-to-register"),
    goToLoginBtn: document.getElementById("go-to-login"),
    goToForgotBtn: document.getElementById("go-to-forgot"),
    backToLoginBtn: document.getElementById("back-to-login"),

    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    rememberMe: document.getElementById("remember-me"),
    loginBtn: document.getElementById("login-btn"),

    regName: document.getElementById("reg-name"),
    regEmail: document.getElementById("reg-email"),
    regPhone: document.getElementById("reg-phone"),
    regPassword: document.getElementById("reg-password"),
    regConfirmPassword: document.getElementById("reg-confirm-password"),
    agreeTerms: document.getElementById("agree-terms"),
    registerBtn: document.getElementById("register-btn"),

    forgotEmail: document.getElementById("forgot-email"),
    forgotBtn: document.getElementById("forgot-btn"),

    googleBtn: document.getElementById("google-btn"),
    appleBtn: document.getElementById("apple-btn"),

    passwordStrength: document.getElementById("password-strength"),
    strengthLabel: document.getElementById("strength-label")
  };

  // -----------------------------------------
  // Helpers
  // -----------------------------------------
  function getAuthDict() {
    return authTranslations[authState.lang] || authTranslations.en;
  }

  function t(key) {
    const dict = getAuthDict();
    return dict[key] || authTranslations.en[key] || key;
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  function safeStorageGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function normalizeView(view) {
    return ["login", "register", "forgot"].includes(view) ? view : "login";
  }

  function safeGetHashView() {
    const hash = String(window.location.hash || "").replace("#", "").trim().toLowerCase();
    return normalizeView(hash);
  }

  function retriggerAnimation(el) {
    if (!el) return;
    el.style.animation = "none";
    void el.offsetHeight;
    el.style.animation = "";
  }

  function preserveIconAndSetText(el, text) {
    if (!el) return;

    const directIcon = Array.from(el.children).find(child => child.tagName === "I" || child.tagName === "IMG");
    if (!directIcon) {
      el.textContent = text;
      return;
    }

    const iconClone = directIcon.cloneNode(true);
    el.innerHTML = "";
    el.appendChild(iconClone);
    el.appendChild(document.createTextNode(` ${text}`));
  }

  function setElementText(el, text) {
    if (!el || typeof text !== "string") return;

    const hasSimpleIcon = Array.from(el.children).some(child => child.tagName === "I" || child.tagName === "IMG");
    if (hasSimpleIcon && el.children.length <= 2) {
      preserveIconAndSetText(el, text);
      return;
    }

    el.textContent = text;
  }

  function setInputPlaceholder(id, value) {
    const el = document.getElementById(id);
    if (el && typeof value === "string") el.placeholder = value;
  }

  function sanitizeText(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getFirebaseConfig() {
    return g.OREBOOKING_FIREBASE_CONFIG || {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      appId: "YOUR_APP_ID"
    };
  }

  function isFirebaseConfigured(cfg) {
    if (!cfg || typeof cfg !== "object") return false;
    const values = ["apiKey", "authDomain", "projectId", "appId"].map(k => String(cfg[k] || ""));
    return values.every(v => v && !v.includes("YOUR_"));
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function scorePassword(password) {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password) || /[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score++;
    return Math.min(score, 4);
  }

  function getRedirectUrl() {
    const params = new URLSearchParams(location.search);
    const redirect = params.get("redirect") || params.get("returnUrl") || "index.html";

    try {
      const url = new URL(redirect, window.location.origin);
      if (url.origin !== window.location.origin) return "index.html";
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return "index.html";
    }
  }

  function redirectAfterAuth(delay = 700) {
    showMessage("success", t("redirecting"), "ph ph-arrow-right");
    setTimeout(() => {
      window.location.href = getRedirectUrl();
    }, delay);
  }

  // -----------------------------------------
  // Theme & Lang
  // -----------------------------------------
  function applyThemeAndLang() {
    const isDark = authState.theme === "dark";
    const isEn = authState.lang === "en";
    const dict = getAuthDict();

    authDOM.body?.classList.toggle("dark", isDark);
    authDOM.body?.setAttribute("data-theme", authState.theme);
    authDOM.htmlEl.setAttribute("dir", isEn ? "ltr" : "rtl");
    authDOM.htmlEl.setAttribute("lang", authState.lang);
    authDOM.htmlEl.style.colorScheme = isDark ? "dark" : "light";

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", isDark ? "#081120" : "#435abf");

    if (authDOM.themeBtn) {
      authDOM.themeBtn.innerHTML = isDark
        ? '<i class="ph ph-sun"></i>'
        : '<i class="ph ph-moon"></i>';
      authDOM.themeBtn.setAttribute("aria-label", isDark ? dict.switch_light : dict.switch_dark);
      authDOM.themeBtn.setAttribute("title", isDark ? dict.switch_light : dict.switch_dark);
    }

    if (authDOM.langBtn) {
      authDOM.langBtn.textContent = dict.lang_label;
      authDOM.langBtn.setAttribute("aria-label", dict.lang_label);
      authDOM.langBtn.setAttribute("title", dict.lang_label);
    }

    updateTexts();
    updatePlaceholders();
    updateStrengthMeter(authDOM.regPassword?.value || "");
  }

  function toggleTheme() {
    authState.theme = authState.theme === "light" ? "dark" : "light";
    safeStorageSet(AUTH_STORAGE_KEYS.theme, authState.theme);
    applyThemeAndLang();
  }

  function toggleLanguage() {
    authState.lang = authState.lang === "en" ? "ar" : "en";
    safeStorageSet(AUTH_STORAGE_KEYS.lang, authState.lang);
    applyThemeAndLang();
  }

  function updateTexts() {
    const dict = getAuthDict();

    document.title = t("page_title");

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (!key || !dict[key]) return;

      if (el.children.length === 0) {
        el.textContent = dict[key];
      } else if (el.matches("button, a")) {
        setElementText(el, dict[key]);
      } else {
        el.textContent = dict[key];
      }
    });

    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      const key = el.getAttribute("data-i18n-html");
      if (!key || !dict[key]) return;
      el.innerHTML = dict[key];
    });

    document.querySelectorAll("[data-i18n-title]").forEach(el => {
      const key = el.getAttribute("data-i18n-title");
      if (!key || !dict[key]) return;
      el.setAttribute("title", dict[key]);
    });

    document.querySelectorAll("[data-i18n-aria-label]").forEach(el => {
      const key = el.getAttribute("data-i18n-aria-label");
      if (!key || !dict[key]) return;
      el.setAttribute("aria-label", dict[key]);
    });
  }

  function updatePlaceholders() {
    const dict = getAuthDict();

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (!key || !dict[key]) return;
      el.placeholder = dict[key];
    });

    setInputPlaceholder("login-email", dict.email_placeholder);
    setInputPlaceholder("login-password", dict.password_placeholder);
    setInputPlaceholder("reg-name", dict.full_name_placeholder);
    setInputPlaceholder("reg-email", dict.email_placeholder);
    setInputPlaceholder("reg-phone", dict.phone_placeholder);
    setInputPlaceholder("reg-password", dict.password_placeholder);
    setInputPlaceholder("reg-confirm-password", dict.confirm_password_placeholder);
    setInputPlaceholder("forgot-email", dict.email_placeholder);
  }

  // -----------------------------------------
  // UI Messages
  // -----------------------------------------
  function showMessage(type, text, icon = null) {
    const box = authDOM.authMessage;
    if (!box) return;

    const iconClass =
      icon ||
      (type === "success"
        ? "ph ph-check-circle"
        : type === "info"
          ? "ph ph-info"
          : "ph ph-warning-circle");

    box.className = `auth-message ${type}`;
    box.innerHTML = `<i class="${iconClass}"></i><span>${sanitizeText(text)}</span>`;
  }

  function clearMessage() {
    const box = authDOM.authMessage;
    if (!box) return;
    box.className = "auth-message";
    box.innerHTML = "";
  }

  function setLoading(button, loading) {
    if (!button) return;
    if (!button.dataset.originalHtml) button.dataset.originalHtml = button.innerHTML;
    button.disabled = !!loading;
    button.innerHTML = loading
      ? `<i class="ph ph-spinner-gap ph-spin"></i><span>${t("loading")}</span>`
      : button.dataset.originalHtml;
  }

  function markInvalid(input, invalid) {
    const wrap = input?.closest(".input-icon-wrap");
    if (wrap) wrap.classList.toggle("invalid", !!invalid);
  }

  function clearInvalids(form) {
    form?.querySelectorAll(".input-icon-wrap.invalid").forEach(el => el.classList.remove("invalid"));
  }

  function updateStrengthMeter(password) {
    const wrapper = authDOM.passwordStrength;
    const label = authDOM.strengthLabel;
    if (!wrapper || !label) return;

    const bars = wrapper.querySelectorAll(".str-bar");
    if (!password) {
      wrapper.classList.remove("active");
      bars.forEach(bar => { bar.style.background = "var(--border)"; });
      label.textContent = "";
      return;
    }

    wrapper.classList.add("active");
    const score = scorePassword(password);
    const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
    const textMap = ["weak", "fair", "good", "strong"];

    bars.forEach((bar, index) => {
      bar.style.background = index < score
        ? colors[Math.min(score - 1, colors.length - 1)]
        : "var(--border)";
    });

    label.textContent = t(textMap[Math.max(score - 1, 0)]);
  }

  // -----------------------------------------
  // Forms / Tabs
  // -----------------------------------------
  function syncTabs(view) {
    const map = {
      login: authDOM.loginTab,
      register: authDOM.registerTab,
      forgot: authDOM.forgotTab
    };

    Object.entries(map).forEach(([key, btn]) => {
      if (!btn) return;
      const active = key === view;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function setActiveForm(view, options = {}) {
    const { save = true, animate = true, updateHash = true } = options;
    const nextView = normalizeView(view);

    authState.activeView = nextView;
    if (save) safeStorageSet(AUTH_STORAGE_KEYS.view, nextView);

    if (updateHash) {
      try {
        history.replaceState(null, "", `#${nextView}`);
      } catch (_) {
        window.location.hash = nextView;
      }
    }

    const { loginForm, registerForm, forgotForm } = authDOM;
    if (!loginForm || !registerForm || !forgotForm) return;

    loginForm.classList.toggle("active", nextView === "login");
    registerForm.classList.toggle("active", nextView === "register");
    forgotForm.classList.toggle("active", nextView === "forgot");

    loginForm.setAttribute("aria-hidden", nextView === "login" ? "false" : "true");
    registerForm.setAttribute("aria-hidden", nextView === "register" ? "false" : "true");
    forgotForm.setAttribute("aria-hidden", nextView === "forgot" ? "false" : "true");

    syncTabs(nextView);
    clearMessage();

    if (animate) {
      const activeForm =
        nextView === "login"
          ? loginForm
          : nextView === "register"
            ? registerForm
            : forgotForm;
      retriggerAnimation(activeForm);
    }
  }

  function switchToRegister(e) {
    if (e) e.preventDefault();
    setActiveForm("register");
  }

  function switchToLogin(e) {
    if (e) e.preventDefault();
    setActiveForm("login");
  }

  function switchToForgot(e) {
    if (e) e.preventDefault();
    setActiveForm("forgot");
  }

  // -----------------------------------------
  // Firebase
  // -----------------------------------------
  function initFirebaseAuth() {
    try {
      const cfg = getFirebaseConfig();

      if (!isFirebaseConfigured(cfg)) {
        authState.authReady = false;
        authState.auth = null;
        authState.firebaseAppReady = false;
        return;
      }

      if (!g.firebase || !g.firebase.auth) {
        authState.authReady = false;
        authState.auth = null;
        authState.firebaseAppReady = false;
        return;
      }

      if (!g.firebase.apps.length) {
        g.firebase.initializeApp(cfg);
      }

      authState.auth = g.firebase.auth();
      authState.authReady = true;
      authState.firebaseAppReady = true;
    } catch (_) {
      authState.authReady = false;
      authState.auth = null;
      authState.firebaseAppReady = false;
    }
  }

  function getErrorMessage(error, fallbackKey) {
    const code = error?.code || "";
    const map = {
      "auth/invalid-email": t("invalid_email"),
      "auth/user-not-found": t("login_failed"),
      "auth/wrong-password": t("login_failed"),
      "auth/invalid-credential": t("login_failed"),
      "auth/email-already-in-use":
        authState.lang === "ar" ? "هذا البريد مستخدم بالفعل." : "This email is already in use.",
      "auth/weak-password": t("invalid_password"),
      "auth/popup-closed-by-user": t("cancelled_popup"),
      "auth/cancelled-popup-request": t("cancelled_popup"),
      "auth/too-many-requests":
        authState.lang === "ar"
          ? "تمت محاولات كثيرة. حاول لاحقاً."
          : "Too many attempts. Please try again later.",
      "auth/network-request-failed":
        authState.lang === "ar"
          ? "تعذر الاتصال بالشبكة. تحقق من الإنترنت ثم أعد المحاولة."
          : "Network request failed. Please check your connection and try again."
    };

    return map[code] || t(fallbackKey);
  }

  function watchAuthState() {
    if (!authState.authReady || !authState.auth || g.__oreAuthWatcherBound) return;
    g.__oreAuthWatcherBound = true;

    authState.auth.onAuthStateChanged(user => {
      if (!user) return;
      const params = new URLSearchParams(location.search);
      const forceStay = params.get("stay") === "1";
      if (!forceStay) {
        showMessage("info", t("already_logged_in"));
        setTimeout(() => {
          window.location.href = getRedirectUrl();
        }, 650);
      }
    });
  }

  // -----------------------------------------
  // Handlers
  // -----------------------------------------
  async function handleLogin(event) {
    event.preventDefault();
    clearMessage();
    const form = event.currentTarget;
    clearInvalids(form);

    const email = authDOM.loginEmail?.value.trim() || "";
    const password = authDOM.loginPassword?.value || "";
    const btn = authDOM.loginBtn;

    let ok = true;

    if (!validEmail(email)) {
      markInvalid(authDOM.loginEmail, true);
      ok = false;
    }

    if (!password || password.length < 8) {
      markInvalid(authDOM.loginPassword, true);
      ok = false;
    }

    if (!ok) {
      showMessage("error", !validEmail(email) ? t("invalid_email") : t("invalid_password"));
      return;
    }

    if (!authState.authReady || !authState.auth) {
      showMessage("info", t("firebase_missing"));
      return;
    }

    try {
      setLoading(btn, true);

      const persistence = authDOM.rememberMe?.checked
        ? g.firebase.auth.Auth.Persistence.LOCAL
        : g.firebase.auth.Auth.Persistence.SESSION;

      await authState.auth.setPersistence(persistence);
      await authState.auth.signInWithEmailAndPassword(email, password);
      showMessage("success", t("login_success"));
      redirectAfterAuth(850);
    } catch (error) {
      showMessage("error", getErrorMessage(error, "login_failed"));
    } finally {
      setLoading(btn, false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    clearMessage();
    const form = event.currentTarget;
    clearInvalids(form);

    const name = authDOM.regName?.value.trim() || "";
    const email = authDOM.regEmail?.value.trim() || "";
    const password = authDOM.regPassword?.value || "";
    const confirmPassword = authDOM.regConfirmPassword?.value || "";
    const agreed = !!authDOM.agreeTerms?.checked;
    const btn = authDOM.registerBtn;

    let ok = true;

    if (name.length < 3) {
      markInvalid(authDOM.regName, true);
      ok = false;
    }

    if (!validEmail(email)) {
      markInvalid(authDOM.regEmail, true);
      ok = false;
    }

    if (!password || password.length < 8) {
      markInvalid(authDOM.regPassword, true);
      ok = false;
    }

    if (!confirmPassword || password !== confirmPassword) {
      markInvalid(authDOM.regConfirmPassword, true);
      ok = false;
    }

    if (!ok) {
      if (name.length < 3) showMessage("error", t("invalid_name"));
      else if (!validEmail(email)) showMessage("error", t("invalid_email"));
      else if (!password || password.length < 8) showMessage("error", t("invalid_password"));
      else showMessage("error", t("invalid_confirm_password"));
      return;
    }

    if (!agreed) {
      showMessage("error", t("must_accept_terms"));
      return;
    }

    if (!authState.authReady || !authState.auth) {
      showMessage("info", t("firebase_missing"));
      return;
    }

    try {
      setLoading(btn, true);

      const cred = await authState.auth.createUserWithEmailAndPassword(email, password);
      if (cred.user) {
        await cred.user.updateProfile({
          displayName: name
        }).catch(() => {});
      }

      showMessage("success", t("register_success"));
      redirectAfterAuth(950);
    } catch (error) {
      showMessage("error", getErrorMessage(error, "register_failed"));
    } finally {
      setLoading(btn, false);
    }
  }

  async function handleForgot(event) {
    event.preventDefault();
    clearMessage();
    const form = event.currentTarget;
    clearInvalids(form);

    const email = authDOM.forgotEmail?.value.trim() || "";
    const btn = authDOM.forgotBtn;

    if (!validEmail(email)) {
      markInvalid(authDOM.forgotEmail, true);
      showMessage("error", t("invalid_email"));
      return;
    }

    if (!authState.authReady || !authState.auth) {
      showMessage("info", t("firebase_missing"));
      return;
    }

    try {
      setLoading(btn, true);
      await authState.auth.sendPasswordResetEmail(email);
      showMessage("success", t("reset_success"));
    } catch (error) {
      showMessage("error", getErrorMessage(error, "reset_failed"));
    } finally {
      setLoading(btn, false);
    }
  }

  async function handleGoogleLogin() {
    clearMessage();

    if (!authState.authReady || !authState.auth) {
      showMessage("info", t("google_not_ready"));
      return;
    }

    const btn = authDOM.googleBtn;

    try {
      setLoading(btn, true);
      const provider = new g.firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await authState.auth.signInWithPopup(provider);
      showMessage("success", t("login_success"));
      redirectAfterAuth(700);
    } catch (error) {
      showMessage("error", getErrorMessage(error, "login_failed"));
    } finally {
      setLoading(btn, false);
    }
  }

  // -----------------------------------------
  // Binding
  // -----------------------------------------
  function bindFormSwitching() {
    if (authDOM.goToRegisterBtn && !authDOM.goToRegisterBtn.dataset.bound) {
      authDOM.goToRegisterBtn.dataset.bound = "1";
      authDOM.goToRegisterBtn.addEventListener("click", switchToRegister);
    }

    if (authDOM.goToLoginBtn && !authDOM.goToLoginBtn.dataset.bound) {
      authDOM.goToLoginBtn.dataset.bound = "1";
      authDOM.goToLoginBtn.addEventListener("click", switchToLogin);
    }

    if (authDOM.goToForgotBtn && !authDOM.goToForgotBtn.dataset.bound) {
      authDOM.goToForgotBtn.dataset.bound = "1";
      authDOM.goToForgotBtn.addEventListener("click", switchToForgot);
    }

    if (authDOM.backToLoginBtn && !authDOM.backToLoginBtn.dataset.bound) {
      authDOM.backToLoginBtn.dataset.bound = "1";
      authDOM.backToLoginBtn.addEventListener("click", switchToLogin);
    }

    [authDOM.loginTab, authDOM.registerTab, authDOM.forgotTab].forEach(btn => {
      if (!btn || btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        setActiveForm(btn.dataset.formTarget || "login");
      });
    });
  }

  function bindToggles() {
    if (authDOM.langBtn && !authDOM.langBtn.dataset.bound) {
      authDOM.langBtn.dataset.bound = "1";
      authDOM.langBtn.addEventListener("click", toggleLanguage);
    }

    if (authDOM.themeBtn && !authDOM.themeBtn.dataset.bound) {
      authDOM.themeBtn.dataset.bound = "1";
      authDOM.themeBtn.addEventListener("click", toggleTheme);
    }

    document.querySelectorAll("[data-toggle-password]").forEach(btn => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        const inputId = btn.dataset.togglePassword;
        const input = document.getElementById(inputId);
        const icon = btn.querySelector("i");
        if (!input || !icon) return;

        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";
        icon.className = isPassword ? "ph ph-eye-slash" : "ph ph-eye";
      });
    });
  }

  function bindForms() {
    if (authDOM.loginForm && !authDOM.loginForm.dataset.bound) {
      authDOM.loginForm.dataset.bound = "1";
      authDOM.loginForm.addEventListener("submit", handleLogin);
    }

    if (authDOM.registerForm && !authDOM.registerForm.dataset.bound) {
      authDOM.registerForm.dataset.bound = "1";
      authDOM.registerForm.addEventListener("submit", handleRegister);
    }

    if (authDOM.forgotForm && !authDOM.forgotForm.dataset.bound) {
      authDOM.forgotForm.dataset.bound = "1";
      authDOM.forgotForm.addEventListener("submit", handleForgot);
    }

    if (authDOM.googleBtn && !authDOM.googleBtn.dataset.bound) {
      authDOM.googleBtn.dataset.bound = "1";
      authDOM.googleBtn.addEventListener("click", handleGoogleLogin);
    }

    if (authDOM.appleBtn && !authDOM.appleBtn.dataset.bound) {
      authDOM.appleBtn.dataset.bound = "1";
      authDOM.appleBtn.addEventListener("click", () => {
        showMessage("info", t("apple_not_ready"));
      });
    }

    authDOM.regPassword?.addEventListener("input", e => {
      markInvalid(e.target, false);
      updateStrengthMeter(e.target.value);
    });

    [
      authDOM.loginEmail,
      authDOM.loginPassword,
      authDOM.regName,
      authDOM.regEmail,
      authDOM.regPhone,
      authDOM.regPassword,
      authDOM.regConfirmPassword,
      authDOM.forgotEmail
    ].forEach(input => {
      if (!input || input.dataset.boundInput) return;
      input.dataset.boundInput = "1";
      input.addEventListener("input", e => {
        markInvalid(e.target, false);
      });
    });
  }

  function bindHashSync() {
    if (g.__oreAuthHashBound) return;
    g.__oreAuthHashBound = true;

    window.addEventListener("hashchange", () => {
      const hashView = safeGetHashView();
      setActiveForm(hashView, { save: true, animate: false, updateHash: false });
    });
  }

  // -----------------------------------------
  // Initialize
  // -----------------------------------------
  function initAuth() {
    if (authState.initialized) return;
    authState.initialized = true;

    authState.activeView = safeGetHashView() || normalizeView(authState.activeView);

    bindFormSwitching();
    bindToggles();
    bindForms();
    bindHashSync();

    initFirebaseAuth();
    applyThemeAndLang();
    setActiveForm(authState.activeView, { save: true, animate: false, updateHash: true });
    watchAuthState();

    if (!authState.authReady) {
      showMessage("info", t("firebase_missing"));
    }
  }

  // -----------------------------------------
  // Run
  // -----------------------------------------
  document.addEventListener("DOMContentLoaded", initAuth);

  // -----------------------------------------
  // Global Access
  // -----------------------------------------
  g.authState = authState;
  g.toggleTheme = toggleTheme;
  g.toggleLanguage = toggleLanguage;
  g.setActiveForm = setActiveForm;
  g.initAuth = initAuth;
})();
