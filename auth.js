// =========================================
// OreBooking Auth UI Logic — Refined
// Theme / Language / Form Switching
// =========================================

// --- Storage Keys ---
const AUTH_STORAGE_KEYS = {
  lang: 'ore_lang',
  theme: 'ore_theme',
  view: 'ore_auth_view'
};

// --- Auth State ---
const authState = {
  lang: localStorage.getItem(AUTH_STORAGE_KEYS.lang) || 'ar',
  theme: localStorage.getItem(AUTH_STORAGE_KEYS.theme) || 'light',
  activeView: localStorage.getItem(AUTH_STORAGE_KEYS.view) || 'login',
  initialized: false
};

// --- Translations ---
const authTranslations = {
  en: {
    welcome_back: "Welcome back!",
    login_desc: "Enter your details to access your account and enjoy our exclusive offers.",
    email: "Email Address",
    password: "Password",
    remember_me: "Remember me",
    forgot_pass: "Forgot password?",
    sign_in: "Sign In",
    or_continue: "or continue with",
    no_account: "Don't have an account?",
    sign_up: "Create an account",
    create_account: "Create a new account",
    register_desc: "Join OreBooking and start collecting loyalty points now.",
    full_name: "Full Name",
    sign_up_btn: "Create Account",
    has_account: "Already have an account?",
    email_placeholder: "Enter your email address",
    password_placeholder: "Enter your password",
    full_name_placeholder: "e.g. John Doe",
    lang_label: "العربية"
  },
  ar: {
    welcome_back: "مرحباً بعودتك!",
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
    register_desc: "انضم إلى OreBooking وابدأ بتجميع نقاط الولاء الآن.",
    full_name: "الاسم الكامل",
    sign_up_btn: "إنشاء حساب",
    has_account: "لديك حساب بالفعل؟",
    email_placeholder: "أدخل بريدك الإلكتروني",
    password_placeholder: "أدخل كلمة المرور",
    full_name_placeholder: "مثال: أحمد محمد",
    lang_label: "English"
  }
};

// --- DOM Cache ---
const authDOM = {
  htmlEl: document.documentElement,
  body: document.body,
  langBtn: document.getElementById('lang-toggle'),
  themeBtn: document.getElementById('theme-toggle'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  goToRegisterBtn: document.getElementById('go-to-register'),
  goToLoginBtn: document.getElementById('go-to-login')
};

// --- Helpers ---
function getAuthDict() {
  return authTranslations[authState.lang] || authTranslations.ar;
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_) {}
}

function safeGetHashView() {
  const hash = String(window.location.hash || '').replace('#', '').trim().toLowerCase();
  if (hash === 'register') return 'register';
  if (hash === 'login') return 'login';
  return null;
}

function retriggerAnimation(el) {
  if (!el) return;
  el.style.animation = 'none';
  void el.offsetHeight;
  el.style.animation = '';
}

function preserveIconAndSetText(el, text) {
  if (!el) return;

  const directIcon = Array.from(el.children).find(child => child.tagName === 'I');
  if (!directIcon) {
    el.textContent = text;
    return;
  }

  const iconClone = directIcon.cloneNode(true);
  el.innerHTML = '';
  el.appendChild(iconClone);
  el.appendChild(document.createTextNode(` ${text}`));
}

function setElementText(el, text) {
  if (!el || typeof text !== 'string') return;
  if (el.children.length && Array.from(el.children).some(child => child.tagName === 'I')) {
    preserveIconAndSetText(el, text);
  } else {
    el.textContent = text;
  }
}

function setInputPlaceholder(id, value) {
  const el = document.getElementById(id);
  if (el) el.placeholder = value;
}

function normalizeView(view) {
  return view === 'register' ? 'register' : 'login';
}

// --- Theme & Lang Logic ---
function applyThemeAndLang() {
  const dict = getAuthDict();
  const isDark = authState.theme === 'dark';
  const isEn = authState.lang === 'en';

  authDOM.body?.classList.toggle('dark', isDark);
  authDOM.body?.setAttribute('data-theme', authState.theme);
  authDOM.htmlEl.setAttribute('dir', isEn ? 'ltr' : 'rtl');
  authDOM.htmlEl.setAttribute('lang', authState.lang);
  authDOM.htmlEl.style.colorScheme = isDark ? 'dark' : 'light';

  if (authDOM.themeBtn) {
    authDOM.themeBtn.innerHTML = isDark
      ? '<i class="ph ph-sun"></i>'
      : '<i class="ph ph-moon"></i>';
    authDOM.themeBtn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'التبديل إلى الوضع الداكن');
    authDOM.themeBtn.setAttribute('title', isDark ? 'Light Mode' : 'Dark Mode');
  }

  if (authDOM.langBtn) {
    authDOM.langBtn.textContent = dict.lang_label;
    authDOM.langBtn.setAttribute('aria-label', dict.lang_label);
    authDOM.langBtn.setAttribute('title', dict.lang_label);
  }

  updateTexts();
  updatePlaceholders();
}

function toggleTheme() {
  authState.theme = authState.theme === 'light' ? 'dark' : 'light';
  safeSetStorage(AUTH_STORAGE_KEYS.theme, authState.theme);
  applyThemeAndLang();
}

function toggleLanguage() {
  authState.lang = authState.lang === 'en' ? 'ar' : 'en';
  safeSetStorage(AUTH_STORAGE_KEYS.lang, authState.lang);
  applyThemeAndLang();
}

function updateTexts() {
  const dict = getAuthDict();

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (!key || !dict[key]) return;
    setElementText(el, dict[key]);
  });

  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html');
    if (!key || !dict[key]) return;
    el.innerHTML = dict[key];
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (!key || !dict[key]) return;
    el.setAttribute('title', dict[key]);
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label');
    if (!key || !dict[key]) return;
    el.setAttribute('aria-label', dict[key]);
  });
}

function updatePlaceholders() {
  const dict = getAuthDict();

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (!key || !dict[key]) return;
    el.placeholder = dict[key];
  });

  setInputPlaceholder('login-email', dict.email_placeholder);
  setInputPlaceholder('login-password', dict.password_placeholder);
  setInputPlaceholder('reg-name', dict.full_name_placeholder);
  setInputPlaceholder('reg-email', dict.email_placeholder);
  setInputPlaceholder('reg-password', dict.password_placeholder);
}

// --- Form Switching ---
function setActiveForm(view, options = {}) {
  const { save = true, animate = true, updateHash = true } = options;
  const nextView = normalizeView(view);

  authState.activeView = nextView;
  if (save) safeSetStorage(AUTH_STORAGE_KEYS.view, nextView);
  if (updateHash) {
    try {
      history.replaceState(null, '', `#${nextView}`);
    } catch (_) {
      window.location.hash = nextView;
    }
  }

  const { loginForm, registerForm } = authDOM;
  if (!loginForm || !registerForm) return;

  const showLogin = nextView === 'login';

  loginForm.classList.toggle('active', showLogin);
  registerForm.classList.toggle('active', !showLogin);
  loginForm.setAttribute('aria-hidden', showLogin ? 'false' : 'true');
  registerForm.setAttribute('aria-hidden', showLogin ? 'true' : 'false');

  if (animate) {
    retriggerAnimation(showLogin ? loginForm : registerForm);
  }
}

function switchToRegister(e) {
  if (e) e.preventDefault();
  setActiveForm('register');
}

function switchToLogin(e) {
  if (e) e.preventDefault();
  setActiveForm('login');
}

// --- Events ---
function bindFormSwitching() {
  if (authDOM.goToRegisterBtn && !authDOM.goToRegisterBtn.dataset.bound) {
    authDOM.goToRegisterBtn.dataset.bound = '1';
    authDOM.goToRegisterBtn.addEventListener('click', switchToRegister);
  }

  if (authDOM.goToLoginBtn && !authDOM.goToLoginBtn.dataset.bound) {
    authDOM.goToLoginBtn.dataset.bound = '1';
    authDOM.goToLoginBtn.addEventListener('click', switchToLogin);
  }
}

function bindToggles() {
  if (authDOM.langBtn && !authDOM.langBtn.dataset.bound) {
    authDOM.langBtn.dataset.bound = '1';
    authDOM.langBtn.addEventListener('click', toggleLanguage);
  }

  if (authDOM.themeBtn && !authDOM.themeBtn.dataset.bound) {
    authDOM.themeBtn.dataset.bound = '1';
    authDOM.themeBtn.addEventListener('click', toggleTheme);
  }
}

function bindHashSync() {
  if (window.__oreAuthHashBound) return;
  window.__oreAuthHashBound = true;

  window.addEventListener('hashchange', () => {
    const hashView = safeGetHashView();
    if (hashView) {
      setActiveForm(hashView, { save: true, animate: false, updateHash: false });
    }
  });
}

// --- Initialize ---
function initAuth() {
  if (authState.initialized) return;
  authState.initialized = true;

  bindFormSwitching();
  bindToggles();
  bindHashSync();

  const hashView = safeGetHashView();
  if (hashView) {
    authState.activeView = hashView;
  } else {
    authState.activeView = normalizeView(authState.activeView);
  }

  applyThemeAndLang();
  setActiveForm(authState.activeView, { save: true, animate: false, updateHash: true });
}

// --- Run ---
document.addEventListener('DOMContentLoaded', initAuth);

// --- Optional Global Access ---
window.authState = authState;
window.toggleTheme = toggleTheme;
window.toggleLanguage = toggleLanguage;
window.setActiveForm = setActiveForm;
window.initAuth = initAuth;
