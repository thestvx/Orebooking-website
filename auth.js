// =========================================
// OreBooking Auth UI Logic — React Edition
// Works with React + ReactDOM + Babel CDN
// Mounts into #auth-app
// =========================================

(function () {
  "use strict";

  const g = typeof globalThis !== "undefined" ? globalThis : window;

  const STORAGE = {
    lang: "ore_lang",
    theme: "ore_theme",
    view: "ore_auth_view",
    remember: "ore_auth_remember",
    profilePrefix: "ore_profile_"
  };

  const authTranslations = {
    en: {
      page_title: "OreBooking - Sign In / Sign Up",
      brand_microcopy: "Smart stays, smooth bookings, and one elegant account for everything.",
      brand_pill: "Secure access for your bookings and rewards",
      brand_title: "Your next stay starts with one clean, secure account.",
      brand_text: "Sign in to manage reservations, track your booking history, save favorites, and enjoy a faster experience every time you return.",
      feature_1_title: "Booking access",
      feature_1_text: "Review your reservations, check important trip details, and stay updated in one place.",
      feature_2_title: "Loyalty points",
      feature_2_text: "Create an account and start collecting reward points from eligible bookings.",
      feature_3_title: "Saved favorites",
      feature_3_text: "Keep the properties you like ready for later without searching all over again.",
      feature_4_title: "Protected sign-in",
      feature_4_text: "A professional and reliable authentication flow built for real users and real data.",
      stat_1: "Access to your account and reset tools whenever you need them.",
      stat_2: "Use one profile to manage bookings, rewards, and saved details.",
      mobile_brand_text: "Professional authentication experience",

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
      switch_light: "Switch to light mode",
      switch_dark: "Switch to dark mode",

      firebase_missing: "Firebase configuration is missing. Add your project settings first.",
      invalid_email: "Please enter a valid email address.",
      invalid_name: "Please enter your full name.",
      invalid_password: "Password must be at least 8 characters and contain letters and numbers.",
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
      loading_login: "Signing in...",
      loading_register: "Creating account...",
      loading_reset: "Sending link...",
      loading_google: "Connecting Google...",
      redirecting: "Redirecting...",
      already_logged_in: "You are already signed in. Redirecting now.",
      cancelled_popup: "Sign-in window was closed before completing the process.",
      back_home: "OreBooking Home"
    },

    ar: {
      page_title: "OreBooking - تسجيل الدخول / إنشاء حساب",
      brand_microcopy: "إقامات ذكية، حجوزات سلسة، وحساب واحد أنيق لكل شيء.",
      brand_pill: "دخول آمن لحجوزاتك ومكافآتك",
      brand_title: "إقامتك القادمة تبدأ بحساب واحد آمن وواضح.",
      brand_text: "سجّل الدخول لإدارة الحجوزات، متابعة سجل الإقامات، حفظ المفضلة، والاستمتاع بتجربة أسرع في كل مرة تعود فيها.",
      feature_1_title: "الوصول إلى الحجوزات",
      feature_1_text: "راجع حجوزاتك، وتحقق من تفاصيل الرحلة المهمة، وابقَ على اطلاع من مكان واحد.",
      feature_2_title: "نقاط الولاء",
      feature_2_text: "أنشئ حسابًا وابدأ بجمع نقاط المكافآت من الحجوزات المؤهلة.",
      feature_3_title: "العقارات المفضلة",
      feature_3_text: "احتفظ بالعقارات التي أعجبتك للعودة إليها لاحقًا بسهولة.",
      feature_4_title: "تسجيل دخول محمي",
      feature_4_text: "تجربة مصادقة احترافية وموثوقة مبنية لمستخدمين حقيقيين وبيانات حقيقية.",
      stat_1: "إمكانية الوصول إلى حسابك وأدوات الاستعادة في أي وقت تحتاجه.",
      stat_2: "استخدم حسابًا واحدًا لإدارة الحجوزات والمكافآت والبيانات المحفوظة.",
      mobile_brand_text: "تجربة مصادقة احترافية",

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
      switch_light: "التبديل إلى الوضع الفاتح",
      switch_dark: "التبديل إلى الوضع الداكن",

      firebase_missing: "إعدادات Firebase غير موجودة. أضف إعدادات مشروعك أولاً.",
      invalid_email: "يرجى إدخال بريد إلكتروني صحيح.",
      invalid_name: "يرجى إدخال الاسم الكامل.",
      invalid_password: "يجب أن تكون كلمة المرور 8 أحرف على الأقل وتحتوي على حروف وأرقام.",
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
      loading_login: "جارٍ تسجيل الدخول...",
      loading_register: "جارٍ إنشاء الحساب...",
      loading_reset: "جارٍ إرسال الرابط...",
      loading_google: "جارٍ الاتصال بجوجل...",
      redirecting: "جارٍ التحويل...",
      already_logged_in: "أنت مسجل الدخول بالفعل. جارٍ تحويلك الآن.",
      cancelled_popup: "تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية.",
      back_home: "الرئيسية"
    }
  };

  function safeStorageGet(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch (_) {
      return fallback;
    }
  }

  function safeStorageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (_) {}
  }

  function normalizeView(view) {
    return ["login", "register", "forgot"].includes(view) ? view : "login";
  }

  function getInitialView() {
    const hash = String(window.location.hash || "").replace("#", "").trim().toLowerCase();
    if (["login", "register", "forgot"].includes(hash)) return hash;
    return normalizeView(safeStorageGet(STORAGE.view, "login"));
  }

  function getInitialTheme() {
    return safeStorageGet(STORAGE.theme, "light");
  }

  function getInitialLang() {
    return safeStorageGet(STORAGE.lang, "en");
  }

  function getDict(lang) {
    return authTranslations[lang] || authTranslations.en;
  }

  function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
  }

  function isStrongEnoughPassword(password) {
    const value = String(password || "");
    return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
  }

  function scorePassword(password) {
    const value = String(password || "");
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Za-z]/.test(value) && /\d/.test(value)) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value) || value.length >= 12) score++;
    return Math.max(0, Math.min(4, score));
  }

  function getRedirectUrl() {
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect") || params.get("returnUrl") || "index.html";

    try {
      const url = new URL(redirect, window.location.origin);
      if (url.origin !== window.location.origin) return "index.html";
      return url.pathname + url.search + url.hash;
    } catch (_) {
      return "index.html";
    }
  }

  function getFirebaseConfig() {
    return g.OREBOOKING_FIREBASE_CONFIG || g.firebaseConfig || {
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_PROJECT.firebaseapp.com",
      projectId: "YOUR_PROJECT_ID",
      appId: "YOUR_APP_ID"
    };
  }

  function isFirebaseConfigured(cfg) {
    if (!cfg || typeof cfg !== "object") return false;
    const required = ["apiKey", "authDomain", "projectId", "appId"];
    return required.every((key) => {
      const value = String(cfg[key] || "");
      return value && !value.includes("YOUR_");
    });
  }

  function initFirebaseAuth() {
    try {
      const cfg = getFirebaseConfig();

      if (!isFirebaseConfigured(cfg)) {
        return { ready: false, auth: null };
      }

      if (!g.firebase || !g.firebase.auth) {
        return { ready: false, auth: null };
      }

      if (!g.firebase.apps.length) {
        g.firebase.initializeApp(cfg);
      }

      return {
        ready: true,
        auth: g.firebase.auth()
      };
    } catch (_) {
      return { ready: false, auth: null };
    }
  }

  function saveProfile(email, data) {
    if (!email) return;
    try {
      localStorage.setItem(
        STORAGE.profilePrefix + String(email).toLowerCase(),
        JSON.stringify(data || {})
      );
    } catch (_) {}
  }

  function humanFirebaseError(error, dict, lang) {
    const code = error?.code || "";

    const map = {
      "auth/invalid-email": dict.invalid_email,
      "auth/missing-email": dict.invalid_email,
      "auth/user-not-found": dict.login_failed,
      "auth/wrong-password": dict.login_failed,
      "auth/invalid-credential": dict.login_failed,
      "auth/email-already-in-use": lang === "ar" ? "هذا البريد مستخدم بالفعل." : "This email is already in use.",
      "auth/weak-password": dict.invalid_password,
      "auth/popup-closed-by-user": dict.cancelled_popup,
      "auth/cancelled-popup-request": dict.cancelled_popup,
      "auth/too-many-requests": lang === "ar"
        ? "تمت محاولات كثيرة. حاول لاحقاً."
        : "Too many attempts. Please try again later.",
      "auth/network-request-failed": lang === "ar"
        ? "تعذر الاتصال بالشبكة. تحقق من الإنترنت ثم أعد المحاولة."
        : "Network request failed. Please check your connection and try again."
    };

    return map[code] || dict.coming_soon || "Something went wrong.";
  }

  function applyDocumentThemeAndLang(theme, lang, dict) {
    const isDark = theme === "dark";
    const isEn = lang === "en";

    document.documentElement.lang = lang;
    document.documentElement.dir = isEn ? "ltr" : "rtl";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";

    if (document.body) {
      document.body.classList.toggle("dark", isDark);
      document.body.setAttribute("data-theme", theme);
    }

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", isDark ? "#081120" : "#435abf");
    }

    document.title = dict.page_title;
  }

  function getGoogleIcon() {
    return "https://www.svgrepo.com/show/475656/google-color.svg";
  }

  function AuthApp() {
    const [lang, setLang] = React.useState(getInitialLang());
    const [theme, setTheme] = React.useState(getInitialTheme());
    const [activeView, setActiveView] = React.useState(getInitialView());
    const [message, setMessage] = React.useState(null);
    const [firebaseState, setFirebaseState] = React.useState({ ready: false, auth: null });
    const [showPass, setShowPass] = React.useState({
      login: false,
      register: false,
      confirm: false
    });
    const [loading, setLoading] = React.useState({
      login: false,
      register: false,
      forgot: false,
      google: false
    });

    const [loginForm, setLoginForm] = React.useState({
      email: "",
      password: "",
      remember: safeStorageGet(STORAGE.remember, "1") !== "0"
    });

    const [registerForm, setRegisterForm] = React.useState({
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      agreeTerms: false
    });

    const [forgotForm, setForgotForm] = React.useState({
      email: ""
    });

    const dict = getDict(lang);
    const strength = scorePassword(registerForm.password);

    React.useEffect(() => {
      setFirebaseState(initFirebaseAuth());
    }, []);

    React.useEffect(() => {
      applyDocumentThemeAndLang(theme, lang, dict);
      safeStorageSet(STORAGE.theme, theme);
      safeStorageSet(STORAGE.lang, lang);
    }, [theme, lang]);

    React.useEffect(() => {
      const normalized = normalizeView(activeView);
      safeStorageSet(STORAGE.view, normalized);

      try {
        history.replaceState(null, "", "#" + normalized);
      } catch (_) {
        window.location.hash = normalized;
      }
    }, [activeView]);

    React.useEffect(() => {
      safeStorageSet(STORAGE.remember, loginForm.remember ? "1" : "0");
    }, [loginForm.remember]);

    React.useEffect(() => {
      const handleHash = () => {
        const hash = String(window.location.hash || "").replace("#", "").trim().toLowerCase();
        if (["login", "register", "forgot"].includes(hash)) {
          setActiveView(hash);
          setMessage(null);
        }
      };

      window.addEventListener("hashchange", handleHash);
      return () => window.removeEventListener("hashchange", handleHash);
    }, []);

    React.useEffect(() => {
      if (!firebaseState.ready || !firebaseState.auth) return;

      const unsubscribe = firebaseState.auth.onAuthStateChanged((user) => {
        if (!user) return;
        const params = new URLSearchParams(window.location.search);
        const forceStay = params.get("stay") === "1";
        if (!forceStay) {
          setMessage({ type: "info", text: dict.already_logged_in });
          setTimeout(() => {
            window.location.href = getRedirectUrl();
          }, 650);
        }
      });

      return () => {
        if (typeof unsubscribe === "function") unsubscribe();
      };
    }, [firebaseState.ready, firebaseState.auth, dict.already_logged_in]);

    React.useEffect(() => {
      g.authState = {
        lang,
        theme,
        activeView,
        initialized: true,
        authReady: firebaseState.ready,
        auth: firebaseState.auth,
        firebaseAppReady: firebaseState.ready
      };

      g.toggleTheme = () => setTheme((prev) => (prev === "light" ? "dark" : "light"));
      g.toggleLanguage = () => setLang((prev) => (prev === "en" ? "ar" : "en"));
      g.setActiveForm = (view) => {
        setActiveView(normalizeView(view));
        setMessage(null);
      };
      g.initAuth = mountAuthApp;
    }, [lang, theme, activeView, firebaseState]);

    function showMessage(type, text) {
      setMessage({ type, text });
    }

    function clearMessage() {
      setMessage(null);
    }

    function openView(view) {
      setActiveView(normalizeView(view));
      clearMessage();
    }

    function updateLogin(field, value) {
      setLoginForm((prev) => ({ ...prev, [field]: value }));
    }

    function updateRegister(field, value) {
      setRegisterForm((prev) => ({ ...prev, [field]: value }));
    }

    function updateForgot(field, value) {
      setForgotForm((prev) => ({ ...prev, [field]: value }));
    }

    function togglePassword(field) {
      setShowPass((prev) => ({ ...prev, [field]: !prev[field] }));
    }

    function strengthClass(index) {
      if (index >= strength) return "";
      if (strength <= 1) return "filled weak";
      if (strength === 2) return "filled fair";
      if (strength === 3) return "filled good";
      return "filled strong";
    }

    function strengthText() {
      if (!registerForm.password) return "";
      if (strength <= 1) return dict.weak;
      if (strength === 2) return dict.fair;
      if (strength === 3) return dict.good;
      return dict.strong;
    }

    function redirectAfterAuth(delay = 700) {
      showMessage("success", dict.redirecting);
      setTimeout(() => {
        window.location.href = getRedirectUrl();
      }, delay);
    }

    async function handleLogin(event) {
      event.preventDefault();
      clearMessage();

      const email = loginForm.email.trim();
      const password = loginForm.password;

      if (!validEmail(email)) {
        showMessage("error", dict.invalid_email);
        return;
      }

      if (!isStrongEnoughPassword(password)) {
        showMessage("error", dict.invalid_password);
        return;
      }

      if (!firebaseState.ready || !firebaseState.auth) {
        showMessage("info", dict.firebase_missing);
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, login: true }));

        const persistence = loginForm.remember
          ? g.firebase.auth.Auth.Persistence.LOCAL
          : g.firebase.auth.Auth.Persistence.SESSION;

        await firebaseState.auth.setPersistence(persistence);
        await firebaseState.auth.signInWithEmailAndPassword(email, password);

        showMessage("success", dict.login_success);
        redirectAfterAuth(850);
      } catch (error) {
        showMessage("error", humanFirebaseError(error, dict, lang) || dict.login_failed);
      } finally {
        setLoading((prev) => ({ ...prev, login: false }));
      }
    }

    async function handleRegister(event) {
      event.preventDefault();
      clearMessage();

      const name = registerForm.name.trim();
      const email = registerForm.email.trim();
      const phone = registerForm.phone.trim();
      const password = registerForm.password;
      const confirmPassword = registerForm.confirmPassword;

      if (name.length < 3) {
        showMessage("error", dict.invalid_name);
        return;
      }

      if (!validEmail(email)) {
        showMessage("error", dict.invalid_email);
        return;
      }

      if (!isStrongEnoughPassword(password)) {
        showMessage("error", dict.invalid_password);
        return;
      }

      if (password !== confirmPassword) {
        showMessage("error", dict.invalid_confirm_password);
        return;
      }

      if (!registerForm.agreeTerms) {
        showMessage("error", dict.must_accept_terms);
        return;
      }

      if (!firebaseState.ready || !firebaseState.auth) {
        showMessage("info", dict.firebase_missing);
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, register: true }));

        const cred = await firebaseState.auth.createUserWithEmailAndPassword(email, password);

        if (cred.user && name) {
          await cred.user.updateProfile({ displayName: name }).catch(() => {});
        }

        saveProfile(email, { name, email, phone });

        showMessage("success", dict.register_success);

        setLoginForm((prev) => ({
          ...prev,
          email,
          password: ""
        }));

        setRegisterForm({
          name: "",
          email: "",
          phone: "",
          password: "",
          confirmPassword: "",
          agreeTerms: false
        });

        setTimeout(() => {
          openView("login");
        }, 700);
      } catch (error) {
        showMessage("error", humanFirebaseError(error, dict, lang) || dict.register_failed);
      } finally {
        setLoading((prev) => ({ ...prev, register: false }));
      }
    }

    async function handleForgot(event) {
      event.preventDefault();
      clearMessage();

      const email = forgotForm.email.trim();

      if (!validEmail(email)) {
        showMessage("error", dict.invalid_email);
        return;
      }

      if (!firebaseState.ready || !firebaseState.auth) {
        showMessage("info", dict.firebase_missing);
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, forgot: true }));
        await firebaseState.auth.sendPasswordResetEmail(email);
        showMessage("success", dict.reset_success);
      } catch (error) {
        showMessage("error", humanFirebaseError(error, dict, lang) || dict.reset_failed);
      } finally {
        setLoading((prev) => ({ ...prev, forgot: false }));
      }
    }

    async function handleGoogleLogin() {
      clearMessage();

      if (!firebaseState.ready || !firebaseState.auth) {
        showMessage("info", dict.google_not_ready);
        return;
      }

      try {
        setLoading((prev) => ({ ...prev, google: true }));

        const provider = new g.firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });

        const result = await firebaseState.auth.signInWithPopup(provider);
        const user = result && result.user ? result.user : null;

        if (user) {
          saveProfile(user.email, {
            name: user.displayName || "",
            email: user.email || "",
            phone: user.phoneNumber || ""
          });
        }

        showMessage("success", dict.login_success);
        redirectAfterAuth(700);
      } catch (error) {
        showMessage("error", humanFirebaseError(error, dict, lang) || dict.login_failed);
      } finally {
        setLoading((prev) => ({ ...prev, google: false }));
      }
    }

    function handleAppleLogin() {
      showMessage("info", dict.apple_not_ready);
    }

    const isDark = theme === "dark";

    return (
      <main className="auth-shell" aria-label="OreBooking Authentication">
        <section className="auth-brand-panel" aria-hidden="false">
          <div className="brand-top">
            <a href="index.html" className="brand-logo-link" aria-label={dict.back_home}>
              <div className="brand-logo-badge">
                <i className="ph-fill ph-buildings"></i>
              </div>
              <div className="brand-logo-copy">
                <strong>OreBooking</strong>
                <span>{dict.brand_microcopy}</span>
              </div>
            </a>

            <div className="auth-controls">
              <button
                id="theme-toggle"
                className="icon-btn"
                type="button"
                aria-label={isDark ? dict.switch_light : dict.switch_dark}
                title={isDark ? dict.switch_light : dict.switch_dark}
                onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}
              >
                <i className={isDark ? "ph ph-sun" : "ph ph-moon"}></i>
              </button>

              <button
                id="lang-toggle"
                className="lang-btn"
                type="button"
                aria-label={dict.lang_label}
                title={dict.lang_label}
                onClick={() => setLang((prev) => (prev === "en" ? "ar" : "en"))}
              >
                {dict.lang_label}
              </button>
            </div>
          </div>

          <div className="brand-middle">
            <div className="brand-pill">
              <i className="ph-fill ph-shield-check"></i>
              <span>{dict.brand_pill}</span>
            </div>

            <h1 className="brand-title">{dict.brand_title}</h1>
            <p className="brand-text">{dict.brand_text}</p>

            <div className="brand-feature-grid">
              <div className="brand-feature">
                <i className="ph ph-calendar-check"></i>
                <strong>{dict.feature_1_title}</strong>
                <p>{dict.feature_1_text}</p>
              </div>

              <div className="brand-feature">
                <i className="ph ph-gift"></i>
                <strong>{dict.feature_2_title}</strong>
                <p>{dict.feature_2_text}</p>
              </div>

              <div className="brand-feature">
                <i className="ph ph-heart-straight"></i>
                <strong>{dict.feature_3_title}</strong>
                <p>{dict.feature_3_text}</p>
              </div>

              <div className="brand-feature">
                <i className="ph ph-lock-key"></i>
                <strong>{dict.feature_4_title}</strong>
                <p>{dict.feature_4_text}</p>
              </div>
            </div>
          </div>

          <div className="brand-bottom">
            <div className="brand-stat-row">
              <div className="brand-stat">
                <strong>24/7</strong>
                <span>{dict.stat_1}</span>
              </div>
              <div className="brand-stat">
                <strong>{lang === "ar" ? "حساب واحد" : "1 Account"}</strong>
                <span>{dict.stat_2}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="auth-panel">
          <div className="auth-panel-inner">
            <a href="index.html" className="mobile-brand-link" aria-label={dict.back_home}>
              <div className="badge"><i className="ph-fill ph-buildings"></i></div>
              <div>
                <strong>OreBooking</strong>
                <span>{dict.mobile_brand_text}</span>
              </div>
            </a>

            <div className="form-tabs" role="tablist" aria-label="Authentication forms">
              <button
                type="button"
                className={`form-tab ${activeView === "login" ? "active" : ""}`}
                role="tab"
                aria-selected={activeView === "login"}
                onClick={() => openView("login")}
              >
                {dict.sign_in}
              </button>

              <button
                type="button"
                className={`form-tab ${activeView === "register" ? "active" : ""}`}
                role="tab"
                aria-selected={activeView === "register"}
                onClick={() => openView("register")}
              >
                {dict.sign_up_btn}
              </button>

              <button
                type="button"
                className={`form-tab ${activeView === "forgot" ? "active" : ""}`}
                role="tab"
                aria-selected={activeView === "forgot"}
                onClick={() => openView("forgot")}
              >
                {dict.reset_short}
              </button>
            </div>

            {message && (
              <div id="auth-message" className={`auth-message ${message.type}`} role="alert" aria-live="polite">
                <i
                  className={
                    message.type === "success"
                      ? "ph ph-check-circle"
                      : message.type === "info"
                        ? "ph ph-info"
                        : "ph ph-warning-circle"
                  }
                ></i>
                <span>{message.text}</span>
              </div>
            )}

            {activeView === "login" && (
              <form id="login-form" className="auth-form" onSubmit={handleLogin} noValidate>
                <div className="auth-kicker">
                  <i className="ph ph-sign-in"></i>
                  <span>{dict.welcome_back_small}</span>
                </div>

                <h2 className="auth-title">{dict.welcome_back}</h2>
                <p className="auth-subtitle">{dict.login_desc}</p>

                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="login-email">
                      <span>{dict.email}</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-icon-wrap">
                      <i className="ph ph-envelope"></i>
                      <input
                        type="email"
                        id="login-email"
                        placeholder={dict.email_placeholder}
                        required
                        autoComplete="email"
                        value={loginForm.email}
                        onChange={(e) => updateLogin("email", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="login-password">
                      <span>{dict.password}</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-icon-wrap password-field">
                      <i className="ph ph-lock"></i>
                      <input
                        type={showPass.login ? "text" : "password"}
                        id="login-password"
                        placeholder={dict.password_placeholder}
                        required
                        autoComplete="current-password"
                        value={loginForm.password}
                        onChange={(e) => updateLogin("password", e.target.value)}
                      />
                      <button
                        type="button"
                        className="pass-toggle"
                        aria-label="Toggle password visibility"
                        onClick={() => togglePassword("login")}
                      >
                        <i className={showPass.login ? "ph ph-eye-slash" : "ph ph-eye"}></i>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="auth-options">
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={loginForm.remember}
                      onChange={(e) => updateLogin("remember", e.target.checked)}
                    />
                    <span className="checkmark"></span>
                    <span>{dict.remember_me}</span>
                  </label>

                  <button type="button" className="forgot-link" onClick={() => openView("forgot")}>
                    {dict.forgot_pass}
                  </button>
                </div>

                <button type="submit" id="login-btn" className="primary-btn" disabled={loading.login}>
                  <i className={loading.login ? "ph ph-spinner-gap ph-spin" : "ph ph-sign-in"}></i>
                  <span>{loading.login ? dict.loading_login : dict.sign_in}</span>
                </button>

                <div className="auth-divider">
                  <span>{dict.or_continue}</span>
                </div>

                <div className="social-logins">
                  <button
                    type="button"
                    id="google-btn"
                    className="social-btn"
                    onClick={handleGoogleLogin}
                    disabled={loading.google}
                  >
                    <img src={getGoogleIcon()} width="20" height="20" alt="Google" />
                    <span>{loading.google ? dict.loading_google : "Google"}</span>
                  </button>

                  <button
                    type="button"
                    id="apple-btn"
                    className="social-btn"
                    onClick={handleAppleLogin}
                  >
                    <i className="ph-fill ph-apple-logo"></i>
                    <span>{dict.coming_soon}</span>
                  </button>
                </div>

                <p className="switch-form-text">
                  <span>{dict.no_account}</span>
                  <button type="button" id="go-to-register" onClick={() => openView("register")}>
                    {dict.sign_up}
                  </button>
                </p>
              </form>
            )}

            {activeView === "register" && (
              <form id="register-form" className="auth-form" onSubmit={handleRegister} noValidate>
                <div className="auth-kicker">
                  <i className="ph ph-user-plus"></i>
                  <span>{dict.create_account_small}</span>
                </div>

                <h2 className="auth-title">{dict.create_account}</h2>
                <p className="auth-subtitle">{dict.register_desc}</p>

                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="reg-name">
                      <span>{dict.full_name}</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-icon-wrap">
                      <i className="ph ph-user"></i>
                      <input
                        type="text"
                        id="reg-name"
                        placeholder={dict.full_name_placeholder}
                        required
                        autoComplete="name"
                        value={registerForm.name}
                        onChange={(e) => updateRegister("name", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="two-cols">
                    <div className="input-group">
                      <label htmlFor="reg-email">
                        <span>{dict.email}</span>
                        <span className="required-star">*</span>
                      </label>
                      <div className="input-icon-wrap">
                        <i className="ph ph-envelope"></i>
                        <input
                          type="email"
                          id="reg-email"
                          placeholder={dict.email_placeholder}
                          required
                          autoComplete="email"
                          value={registerForm.email}
                          onChange={(e) => updateRegister("email", e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="input-group">
                      <label htmlFor="reg-phone">
                        <span>{dict.phone_optional}</span>
                      </label>
                      <div className="input-icon-wrap">
                        <i className="ph ph-phone"></i>
                        <input
                          type="tel"
                          id="reg-phone"
                          placeholder={dict.phone_placeholder}
                          autoComplete="tel"
                          value={registerForm.phone}
                          onChange={(e) => updateRegister("phone", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="reg-password">
                      <span>{dict.password}</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-icon-wrap password-field">
                      <i className="ph ph-lock"></i>
                      <input
                        type={showPass.register ? "text" : "password"}
                        id="reg-password"
                        placeholder={dict.password_placeholder}
                        required
                        autoComplete="new-password"
                        value={registerForm.password}
                        onChange={(e) => updateRegister("password", e.target.value)}
                      />
                      <button
                        type="button"
                        className="pass-toggle"
                        aria-label="Toggle password visibility"
                        onClick={() => togglePassword("register")}
                      >
                        <i className={showPass.register ? "ph ph-eye-slash" : "ph ph-eye"}></i>
                      </button>
                    </div>

                    <div className="helper-row">
                      <span className="field-hint">{dict.password_hint}</span>
                    </div>

                    <div id="password-strength" className="password-strength">
                      <div className="strength-bars">
                        <div className={`str-bar ${strengthClass(0)}`}></div>
                        <div className={`str-bar ${strengthClass(1)}`}></div>
                        <div className={`str-bar ${strengthClass(2)}`}></div>
                        <div className={`str-bar ${strengthClass(3)}`}></div>
                      </div>
                      <div id="strength-label" className="strength-label">{strengthText()}</div>
                    </div>
                  </div>

                  <div className="input-group">
                    <label htmlFor="reg-confirm-password">
                      <span>{dict.confirm_password}</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-icon-wrap password-field">
                      <i className="ph ph-password"></i>
                      <input
                        type={showPass.confirm ? "text" : "password"}
                        id="reg-confirm-password"
                        placeholder={dict.confirm_password_placeholder}
                        required
                        autoComplete="new-password"
                        value={registerForm.confirmPassword}
                        onChange={(e) => updateRegister("confirmPassword", e.target.value)}
                      />
                      <button
                        type="button"
                        className="pass-toggle"
                        aria-label="Toggle password visibility"
                        onClick={() => togglePassword("confirm")}
                      >
                        <i className={showPass.confirm ? "ph ph-eye-slash" : "ph ph-eye"}></i>
                      </button>
                    </div>
                  </div>

                  <div className="input-group">
                    <label className="checkbox-container" style={{ alignItems: "flex-start" }}>
                      <input
                        type="checkbox"
                        id="agree-terms"
                        checked={registerForm.agreeTerms}
                        onChange={(e) => updateRegister("agreeTerms", e.target.checked)}
                      />
                      <span className="checkmark"></span>
                      <span>{dict.agree_terms}</span>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  id="register-btn"
                  className="primary-btn"
                  style={{ marginTop: "6px" }}
                  disabled={loading.register}
                >
                  <i className={loading.register ? "ph ph-spinner-gap ph-spin" : "ph ph-user-plus"}></i>
                  <span>{loading.register ? dict.loading_register : dict.sign_up_btn}</span>
                </button>

                <p className="switch-form-text">
                  <span>{dict.has_account}</span>
                  <button type="button" id="go-to-login" onClick={() => openView("login")}>
                    {dict.sign_in}
                  </button>
                </p>
              </form>
            )}

            {activeView === "forgot" && (
              <form id="forgot-form" className="auth-form" onSubmit={handleForgot} noValidate>
                <div className="auth-kicker">
                  <i className="ph ph-key"></i>
                  <span>{dict.reset_small}</span>
                </div>

                <h2 className="auth-title">{dict.reset_title}</h2>
                <p className="auth-subtitle">{dict.reset_desc}</p>

                <div className="input-grid">
                  <div className="input-group">
                    <label htmlFor="forgot-email">
                      <span>{dict.email}</span>
                      <span className="required-star">*</span>
                    </label>
                    <div className="input-icon-wrap">
                      <i className="ph ph-envelope"></i>
                      <input
                        type="email"
                        id="forgot-email"
                        placeholder={dict.email_placeholder}
                        required
                        autoComplete="email"
                        value={forgotForm.email}
                        onChange={(e) => updateForgot("email", e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button type="submit" id="forgot-btn" className="primary-btn" disabled={loading.forgot}>
                  <i className={loading.forgot ? "ph ph-spinner-gap ph-spin" : "ph ph-paper-plane-tilt"}></i>
                  <span>{loading.forgot ? dict.loading_reset : dict.send_reset_link}</span>
                </button>

                <p className="switch-form-text">
                  <span>{dict.remembered_password}</span>
                  <button type="button" id="back-to-login" onClick={() => openView("login")}>
                    {dict.sign_in}
                  </button>
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
    );
  }

  let __oreAuthRoot = null;

  function mountAuthApp() {
    const mountNode = document.getElementById("auth-app");
    if (!mountNode || !g.React || !g.ReactDOM) return;

    if (!__oreAuthRoot) {
      __oreAuthRoot = g.ReactDOM.createRoot(mountNode);
    }

    __oreAuthRoot.render(<AuthApp />);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAuthApp);
  } else {
    mountAuthApp();
  }

  g.initAuth = mountAuthApp;
})();
