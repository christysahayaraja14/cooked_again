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
   Source of truth: Supabase table gallery_photos (+ Storage bucket "gallery"
   for photos the admin uploads).
   Load priority:
     1. Supabase (after fetchGallery() has run)
     2. DEFAULT_GALLERY below (offline / Supabase not configured yet)
   ============================================================ */

let galleryFromDb = null; // last gallery fetched from Supabase (normalized)

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

/* Download the gallery from Supabase. Resolves true on success, false otherwise. */
async function fetchGallery() {
  if (!window.sb) return false;
  try {
    var res = await sb
      .from('gallery_photos')
      .select('src, alt, caption, sort_order')
      .order('sort_order', { ascending: true });
    if (res.error || !Array.isArray(res.data) || res.data.length === 0) return false;
    var clean = normalizeGallery(res.data);
    if (!isValidGallery(clean)) return false;
    galleryFromDb = clean;
    return true;
  } catch (e) {
    return false;
  }
}

function loadGallery() {
  return cloneGallery(galleryFromDb || DEFAULT_GALLERY);
}

/* Admin only (the database enforces it). Resolves { ok, error? }. */
async function saveGallery(gallery) {
  if (!window.sb) return { ok: false, error: 'Supabase is not configured.' };
  var clean = normalizeGallery(gallery);
  if (!isValidGallery(clean)) return { ok: false, error: 'The gallery has invalid entries.' };
  try {
    var res = await sb.rpc('save_gallery', { payload: clean });
    if (res.error) return { ok: false, error: res.error.message };
    galleryFromDb = clean;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'Could not reach the server.' };
  }
}

/* Admin only: write the built-in default gallery back to the database. */
async function resetGallery() {
  return saveGallery(cloneGallery(DEFAULT_GALLERY));
}

/* Admin only: upload a compressed image Blob to Storage, resolve its public URL. */
async function uploadGalleryImage(blob) {
  if (!window.sb) throw new Error('Supabase is not configured.');
  var path = 'photos/' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
  var up = await sb.storage.from('gallery').upload(path, blob, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });
  if (up.error) throw new Error(up.error.message);
  return sb.storage.from('gallery').getPublicUrl(path).data.publicUrl;
}

function gallerySource() {
  return galleryFromDb ? 'supabase' : 'default';
}
