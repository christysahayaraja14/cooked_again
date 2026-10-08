'use strict';

/* Local images are served from /images. If a file is missing there,
   fall back to the original remote copy so the site never shows a broken image. */
(function () {
  var REMOTE = 'https://miaoda-site-img.s3cdn.medo.dev/images/';
  document.addEventListener('error', function (e) {
    var el = e.target;
    if (!el || el.tagName !== 'IMG' || el.dataset.fb) return;
    var m = (el.getAttribute('src') || '').match(/^images\/(KLing_[0-9a-f-]+\.jpg)$/);
    if (m) { el.dataset.fb = '1'; el.src = REMOTE + m[1]; }
  }, true);
})();


/* ============================================================
   gallery-store.js - Royal Gallery data store (shared by all pages)
   Load priority:
     1. window.SAVED_GALLERY (from uploaded site-data.js - for ALL visitors)
     2. localStorage          (admin edits saved on this browser)
     3. DEFAULT_GALLERY       (built-in defaults)
   ============================================================ */

const GALLERY_STORAGE_KEY = 'olca_gallery_data';
const GALLERY_MAX_ITEMS = 30;

const DEFAULT_GALLERY = [
  {
    src: 'images/KLing_7a236c0f-db77-48eb-ad78-154dbf886851.jpg',
    alt: 'Crispy golden ghee roast dosa served on a dark plate',
    caption: 'Ghee Roast',
  },
  {
    src: 'images/KLing_070e64ba-2780-40da-b119-bef8e17d16ce.jpg',
    alt: 'Kerala parotta served with rich beef curry',
    caption: 'Parotta with Beef Curry',
  },
  {
    src: 'images/KLing_f8937a31-3488-450e-8e92-c397d47900fa.jpg',
    alt: 'Idli and medu vada served with sambar and chutney on a banana leaf',
    caption: 'Idli & Medu Vada',
  },
  {
    src: 'images/KLing_702440d6-338d-42b7-99ca-cb9f6e5d3f65.jpg',
    alt: 'Traditional South Indian filter coffee in a steel tumbler and davara',
    caption: 'Filter Coffee',
  },
  {
    src: 'images/KLing_d8d2e687-f1b1-4411-8406-9d513b915ced.jpg',
    alt: 'Overhead view of a South Indian veg meal spread on a banana leaf',
    caption: 'Royal Veg Meals',
  },
  {
    src: 'images/KLing_a617852c-cbcc-4a44-9e4f-11b4fe3b58ee.jpg',
    alt: 'Chicken biryani garnished with fried onions alongside Chicken 65',
    caption: 'Chicken Biriyani & Chicken 65',
  },
  {
    src: 'images/KLing_7648361b-017c-4dc1-8250-32d13afcde47.jpg',
    alt: 'Royal falooda with ice cream and rose syrup in an elegant glass',
    caption: 'Falooda',
  },
  {
    src: 'images/KLing_efa77587-efd6-4407-8202-4a7a1b1c54e6.jpg',
    alt: 'A slice of red velvet cake with elegant plating',
    caption: 'Red Velvet Cake',
  },
  {
    src: 'images/KLing_f8f4d8cf-505d-45aa-bf80-f836450911bc.jpg',
    alt: 'Indo-Chinese chicken noodles garnished with spring onions',
    caption: 'Chicken Noodles',
  },
  {
    src: 'images/KLing_c0c6e19b-a96e-4c8b-b403-a9ee7a4f7ae3.jpg',
    alt: 'Golden crispy masala dosa with sambar and chutney',
    caption: 'Masala Dosa',
  },
];

/* ---------- Helpers ---------- */
function cloneGallery(gallery) {
  return JSON.parse(JSON.stringify(gallery));
}

/* Clean shape: trimmed strings, alt fallback, no empty sources, capped length. */
function normalizeGallery(gallery) {
  if (!Array.isArray(gallery)) return [];
  return gallery
    .map(function (g) {
      var src = String((g && g.src) || '').trim();
      var caption = String((g && g.caption) || '').trim();
      var alt = String((g && g.alt) || '').trim() || caption || 'Dish photo at Oops! Life Cooked Again';
      return { src: src, alt: alt, caption: caption };
    })
    .filter(function (g) {
      return g.src !== '';
    })
    .slice(0, GALLERY_MAX_ITEMS);
}

function isValidGallery(gallery) {
  return (
    Array.isArray(gallery) &&
    gallery.length > 0 &&
    gallery.every(function (g) {
      return typeof g.src === 'string' && g.src !== '';
    })
  );
}

/* ---------- Public API ---------- */
function loadGallery() {
  // 1. Published file (site-data.js uploaded by the admin) wins for everyone.
  if (typeof window !== 'undefined' && typeof window.SAVED_GALLERY !== 'undefined') {
    var published = normalizeGallery(window.SAVED_GALLERY);
    if (isValidGallery(published)) return published;
  }
  // 2. Admin edits saved in this browser.
  try {
    var raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    if (raw) {
      var parsed = normalizeGallery(JSON.parse(raw));
      if (isValidGallery(parsed)) return parsed;
    }
  } catch (e) {
    /* storage unavailable or corrupted - fall through */
  }
  // 3. Built-in defaults.
  return cloneGallery(DEFAULT_GALLERY);
}

function saveGallery(gallery) {
  try {
    var clean = normalizeGallery(gallery);
    if (!isValidGallery(clean)) return false;
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch (e) {
    return false; /* quota exceeded or storage unavailable */
  }
}

function hasSavedGallery() {
  try {
    return !!localStorage.getItem(GALLERY_STORAGE_KEY);
  } catch (e) {
    return false;
  }
}

function resetGallery() {
  try {
    localStorage.removeItem(GALLERY_STORAGE_KEY);
  } catch (e) {
    /* nothing to clear */
  }
}

function gallerySource() {
  if (typeof window !== 'undefined' && typeof window.SAVED_GALLERY !== 'undefined') {
    if (isValidGallery(normalizeGallery(window.SAVED_GALLERY))) return 'published';
  }
  if (hasSavedGallery()) return 'browser';
  return 'default';
}
