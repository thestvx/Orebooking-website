// --- Mock Data & State ---
// تم إضافة قراءة الإعدادات من LocalStorage للحفاظ على المزامنة
const state = {
  lang: localStorage.getItem('ore_lang') || 'en',
  theme: localStorage.getItem('ore_theme') || 'light',
  favorites: []
};

// Translations Dictionary
const translations = {
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
    pts: "Pts",
    night: "night",
    urgency_few: "Only 2 rooms left",
    urgency_hot: "Booked 5 times today"
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
    pts: "نقطة",
    night: "ليلة",
    urgency_few: "بقي غرفتان فقط",
    urgency_hot: "تم حجزه 5 مرات اليوم"
  }
};

const properties = [
  {
    id: 1,
    title_en: "Luxury Skyline Penthouse",
    title_ar: "بنتهاوس فاخر بإطلالة بانورامية",
    location_en: "Dubai, UAE",
    location_ar: "دبي، الإمارات",
    price: 450,
    rating: 4.96,
    image: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
    urgency: "few"
  },
  {
    id: 2,
    title_en: "Modern Forest Cabin",
    title_ar: "كوخ عصري في الغابة",
    location_en: "Aspen, Colorado",
    location_ar: "أسبن، كولورادو",
    price: 280,
    rating: 4.85,
    image: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=800&q=80",
    urgency: "hot"
  },
  {
    id: 3,
    title_en: "Minimalist Beach Villa",
    title_ar: "فيلا شاطئية بتصميم بسيط",
    location_en: "Bali, Indonesia",
    location_ar: "بالي، إندونيسيا",
    price: 320,
    rating: 4.92,
    image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80",
    urgency: null
  }
];

const categories = [
  { icon: 'ph-buildings', label_en: 'Apartments', label_ar: 'شقق' },
  { icon: 'ph-house', label_en: 'Villas', label_ar: 'فلل' },
  { icon: 'ph-tree-evergreen', label_en: 'Cabins', label_ar: 'أكواخ' },
  { icon: 'ph-swimming-pool', label_en: 'Pools', label_ar: 'مسابح' },
];

// --- DOM Elements ---
const langBtn = document.getElementById('lang-toggle');
const themeBtn = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

// --- Initialization ---
function init() {
  applyInitialState(); // Apply state from localStorage
  renderCategories();
  renderListings();
  
  // Event Listeners
  langBtn.addEventListener('click', toggleLanguage);
  themeBtn.addEventListener('click', toggleTheme);
}

function applyInitialState() {
  // Theme
  if (state.theme === 'dark') {
    document.body.classList.add('dark');
    themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove('dark');
    themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }
  
  // Language
  htmlEl.setAttribute('dir', state.lang === 'en' ? 'ltr' : 'rtl');
  htmlEl.setAttribute('lang', state.lang);
  langBtn.textContent = state.lang === 'en' ? 'العربية' : 'English';
  
  updateLanguageUI();
}

// --- Theme Logic ---
function toggleTheme() {
  state.theme = state.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('ore_theme', state.theme); // Save to storage
  
  if (state.theme === 'dark') {
    document.body.classList.add('dark');
    themeBtn.innerHTML = '<i class="ph ph-sun"></i>';
  } else {
    document.body.classList.remove('dark');
    themeBtn.innerHTML = '<i class="ph ph-moon"></i>';
  }
}

// --- Language Logic ---
function toggleLanguage() {
  state.lang = state.lang === 'en' ? 'ar' : 'en';
  localStorage.setItem('ore_lang', state.lang); // Save to storage
  
  htmlEl.setAttribute('dir', state.lang === 'en' ? 'ltr' : 'rtl');
  htmlEl.setAttribute('lang', state.lang);
  
  langBtn.textContent = state.lang === 'en' ? 'العربية' : 'English';
  
  updateLanguageUI();
  renderCategories();
  renderListings();
}

function updateLanguageUI() {
  const dict = translations[state.lang];
  
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.placeholder = dict[key];
  });
}

// --- Render Functions ---
function renderCategories() {
  const container = document.getElementById('categories-container');
  container.innerHTML = categories.map((cat, index) => `
    <div class="category-item ${index === 0 ? 'active' : ''}">
      <i class="ph ${cat.icon}"></i>
      <span class="font-medium">${state.lang === 'en' ? cat.label_en : cat.label_ar}</span>
    </div>
  `).join('');
}

function toggleFavorite(id) {
  const index = state.favorites.indexOf(id);
  if (index > -1) {
    state.favorites.splice(index, 1);
  } else {
    state.favorites.push(id);
  }
  renderListings(); 
}

function renderListings() {
  const container = document.getElementById('listings-grid');
  const dict = translations[state.lang];

  container.innerHTML = properties.map(prop => {
    const isFav = state.favorites.includes(prop.id);
    const title = state.lang === 'en' ? prop.title_en : prop.title_ar;
    const location = state.lang === 'en' ? prop.location_en : prop.location_ar;
    
    let urgencyHtml = '';
    if (prop.urgency) {
      const urgencyText = prop.urgency === 'few' ? dict.urgency_few : dict.urgency_hot;
      urgencyHtml = `
        <div class="urgency-label">
          <i class="ph-fill ph-fire"></i>
          <span>${urgencyText}</span>
        </div>
      `;
    }

    return `
      <div class="card">
        <div class="card-img-wrapper">
          <img src="${prop.image}" alt="${title}" class="card-img">
          ${urgencyHtml}
          <button class="fav-btn ${isFav ? 'active' : ''}" onclick="toggleFavorite(${prop.id})">
            <i class="${isFav ? 'ph-fill' : 'ph'} ph-heart"></i>
          </button>
        </div>
        <div class="card-content">
          <div class="card-header">
            <div>
              <h3 class="card-title font-bold">${title}</h3>
              <p class="card-location">${location}</p>
            </div>
            <div class="card-rating">
              <i class="ph-fill ph-star"></i>
              <span>${prop.rating}</span>
            </div>
          </div>
          <div class="card-footer">
            <div class="card-price">
              $${prop.price} <span>/ ${dict.night}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Run on load
document.addEventListener('DOMContentLoaded', init);
