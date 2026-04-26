// --- Auth State & Translations ---
const authState = {
  lang: localStorage.getItem('ore_lang') || 'ar', // جعلنا العربي هو الافتراضي
  theme: localStorage.getItem('ore_theme') || 'light'
};

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
    has_account: "Already have an account?"
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
    has_account: "لديك حساب بالفعل؟"
  }
};

// --- DOM Elements ---
const htmlEl = document.documentElement;
const langBtn = document.getElementById('lang-toggle');
const themeBtn = document.getElementById('theme-toggle');

// --- Initialize ---
function initAuth() {
  applyThemeAndLang();
  
  // Form Switching Logic
  const goToRegisterBtn = document.getElementById('go-to-register');
  const goToLoginBtn = document.getElementById('go-to-login');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  if(goToRegisterBtn && loginForm && registerForm) {
    goToRegisterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.classList.remove('active');
      registerForm.classList.add('active');
      
      // إعادة تفعيل الأنيميشن عند التبديل
      registerForm.style.animation = 'none';
      registerForm.offsetHeight; /* trigger reflow */
      registerForm.style.animation = null; 
    });
  }

  if(goToLoginBtn && loginForm && registerForm) {
    goToLoginBtn.addEventListener('click', (e) => {
      e.preventDefault();
      registerForm.classList.remove('active');
      loginForm.classList.add('active');
      
      // إعادة تفعيل الأنيميشن عند التبديل
      loginForm.style.animation = 'none';
      loginForm.offsetHeight; /* trigger reflow */
      loginForm.style.animation = null; 
    });
  }

  // Toggles
  if(langBtn) langBtn.addEventListener('click', toggleLanguage);
  if(themeBtn) themeBtn.addEventListener('click', toggleTheme);
}

// --- Theme & Lang Logic ---
function applyThemeAndLang() {
  // Theme
  if (authState.theme === 'dark') {
    document.body.classList.add('dark');
    if(themeBtn) themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove('dark');
    if(themeBtn) themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }

  // Language
  htmlEl.setAttribute('dir', authState.lang === 'en' ? 'ltr' : 'rtl');
  htmlEl.setAttribute('lang', authState.lang);
  
  if(langBtn) {
    langBtn.textContent = authState.lang === 'en' ? 'العربية' : 'English';
  }
  
  // Update placeholders & text
  updateTexts();
  updatePlaceholders();
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
    if (dict[key]) {
      // المحافظة على الأيقونات بداخل الأزرار إن وجدت
      const icon = el.querySelector('i');
      if (icon) {
        el.innerHTML = '';
        el.appendChild(icon);
        el.appendChild(document.createTextNode(' ' + dict[key]));
      } else {
        el.textContent = dict[key];
      }
    }
  });
}

function updatePlaceholders() {
  const isEn = authState.lang === 'en';
  
  const regName = document.getElementById('reg-name');
  if(regName) regName.placeholder = isEn ? "e.g. John Doe" : "مثال: أحمد محمد";
}

// Run
document.addEventListener('DOMContentLoaded', initAuth);
