// --- Auth State & Translations ---
const authState = {
  lang: localStorage.getItem('ore_lang') || 'en',
  theme: localStorage.getItem('ore_theme') || 'light'
};

const authTranslations = {
  en: {
    welcome_back: "Welcome back",
    login_desc: "Enter your details to access your account.",
    email: "Email Address",
    password: "Password",
    remember_me: "Remember me",
    forgot_pass: "Forgot password?",
    sign_in: "Sign In",
    or_continue: "or continue with",
    no_account: "Don't have an account?",
    sign_up: "Sign up",
    create_account: "Create an account",
    register_desc: "Join OreBooking to unlock premium features.",
    full_name: "Full Name",
    sign_up_btn: "Create Account",
    has_account: "Already have an account?"
  },
  ar: {
    welcome_back: "مرحباً بعودتك",
    login_desc: "أدخل بياناتك للوصول إلى حسابك.",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    remember_me: "تذكرني",
    forgot_pass: "نسيت كلمة المرور؟",
    sign_in: "تسجيل الدخول",
    or_continue: "أو المتابعة باستخدام",
    no_account: "ليس لديك حساب؟",
    sign_up: "إنشاء حساب",
    create_account: "إنشاء حساب جديد",
    register_desc: "انضم إلى OreBooking لفتح ميزات حصرية.",
    full_name: "الاسم الكامل",
    sign_up_btn: "إنشاء الحساب",
    has_account: "لديك حساب بالفعل؟"
  }
};

// --- DOM Elements ---
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const goToRegisterBtn = document.getElementById('go-to-register');
const goToLoginBtn = document.getElementById('go-to-login');

const langBtn = document.getElementById('lang-toggle');
const themeBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

// --- Initialize ---
function initAuth() {
  applyThemeAndLang();
  
  // Form Switching
  goToRegisterBtn.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('active');
    registerForm.classList.add('active');
  });

  goToLoginBtn.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.remove('active');
    loginForm.classList.add('active');
  });

  // Toggles
  langBtn.addEventListener('click', toggleLanguage);
  themeBtn.addEventListener('click', toggleTheme);
}

// --- Theme & Lang Logic ---
function applyThemeAndLang() {
  // Theme
  if (authState.theme === 'dark') {
    document.body.classList.add('dark');
    themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove('dark');
    themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }

  // Language
  htmlEl.setAttribute('dir', authState.lang === 'en' ? 'ltr' : 'rtl');
  htmlEl.setAttribute('lang', authState.lang);
  langBtn.textContent = authState.lang === 'en' ? 'العربية' : 'English';
  
  updateTexts();
}

function toggleTheme() {
  authState.theme = authState.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('ore_theme', authState.theme);
  applyThemeAndLang();
}

function toggleLanguage() {
  authState.lang = authState.lang === 'en' ? 'ar' : 'en';
  localStorage.setItem('ore_lang', authState.lang);
  applyThemeAndLang();
}

function updateTexts() {
  const dict = authTranslations[authState.lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
}

// Run
document.addEventListener('DOMContentLoaded', initAuth);
