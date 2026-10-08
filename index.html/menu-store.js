'use strict';

/* ============================================================
   menu-store.js — Central menu data store (shared by all pages)
   Load priority:
     1. window.SAVED_MENU  (from uploaded menu-data.js — for ALL visitors)
     2. localStorage       (admin edits saved on this browser)
     3. DEFAULT_MENU       (built-in defaults)
   ============================================================ */

const MENU_STORAGE_KEY = 'olca_menu_data';

/* ---------- Built-in default menu (editable from the Admin Panel) ---------- */
const DEFAULT_MENU = [
  {
    id: 'breakfast',
    title: 'Breakfast Specials',
    subtitle: 'Dawn delights, steamed, crisp & golden',
    note: 'Served fresh every morning from 06:00 AM',
    items: [
      { name: 'Idli with Sambar & Chutney', price: 40 },
      { name: 'Medu Vada', price: 12 },
      { name: 'Idiyappam with Coconut Milk', price: 30 },
      { name: 'Upma', price: 35 },
      { name: 'Poori Masala', price: 45 },
      { name: 'Dosa', price: 55 },
      { name: 'Poori Masala (Royal Portion)', price: 55 },
      { name: 'Masala Dosa', price: 80 },
    ],
  },
  {
    id: 'lunch',
    title: 'Lunch Combos',
    subtitle: 'Hearty plates that heal the day\u2019s damage',
    note: 'Generous meals, served with love',
    items: [
      { name: 'Curd Rice', price: 50 },
      { name: 'South Indian Veg-Meals', price: 90 },
      { name: 'North Indian Veg-Meals', price: 90 },
      { name: 'Non-veg Meals', price: 150 },
      { name: 'Fish Meals (2 pcs of fish)', price: 150 },
      { name: 'Chicken Biriyani & Chicken 65', price: 180 },
      { name: 'Mutton Biriyani & Mutton gravy', price: 300 },
    ],
  },
  {
    id: 'dinner',
    title: 'Dinner Delights',
    subtitle: 'Evening feasts worth staying up for',
    note: 'Served until 10:00 PM',
    items: [
      { name: 'Chapati (3pcs) with Vegetable Curry', price: 40 },
      { name: 'Idli with Sambar & Chutney', price: 40 },
      { name: 'Ghee Roast', price: 90 },
      { name: 'Veg Fried Rice', price: 90 },
      { name: 'Veg Noodles', price: 90 },
      { name: 'Parotta with Beef Curry', price: 110 },
      { name: 'Combo (Chicken 65, Mutton Soup, Half-Boil Egg)', price: 120 },
      { name: 'Chicken Noodles', price: 120 },
      { name: 'Chicken Fried Rice', price: 120 },
    ],
  },
  {
    id: 'desserts',
    title: 'Desserts & Beverages',
    subtitle: 'Sweet endings & sips of joy',
    note: 'Life is short \u2014 dessert first',
    items: [
      { name: 'Tea', price: 15 },
      { name: 'Coffee', price: 25 },
      { name: 'Lemon Juice', price: 20 },
      { name: 'Rose Milk', price: 35 },
      { name: 'Badam Milk', price: 35 },
      { name: 'Oreo Milkshake', price: 55 },
      { name: 'Falooda', price: 80 },
      { name: 'Sweet Bun', price: 20 },
      { name: 'Carrot Halwa', price: 35 },
      { name: 'Chocolate Cake', price: 35 },
      { name: 'Black Forest Cake', price: 60 },
      { name: 'White Forest Cake', price: 60 },
      { name: 'Red Velvet Cake', price: 80 },
    ],
  },
];

/* ---------- Helpers ---------- */
function cloneMenu(menu) {
  return JSON.parse(JSON.stringify(menu));
}

/* Ensure clean shape: trimmed names, integer prices >= 0. */
function normalizeMenu(menu) {
  return menu.map((cat) => ({
    id: String(cat.id || 'cat').trim(),
    title: String(cat.title || '').trim(),
    subtitle: String(cat.subtitle || '').trim(),
    note: String(cat.note || '').trim(),
    items: (cat.items || [])
      .map((it) => ({ name: String(it.name || '').trim(), price: Math.max(0, Math.round(Number(it.price) || 0)) }))
      .filter((it) => it.name !== ''),
  }));
}

function isValidMenu(menu) {
  if (!Array.isArray(menu) || menu.length === 0) return false;
  return menu.every(
    (cat) =>
      cat &&
      typeof cat.title === 'string' &&
      cat.title.trim() !== '' &&
      Array.isArray(cat.items) &&
      cat.items.every(
        (it) => it && typeof it.name === 'string' && it.name.trim() !== '' && Number.isFinite(Number(it.price)) && Number(it.price) >= 0
      )
  );
}

/* ---------- Public API ---------- */
function loadMenu() {
  // 1. Published file (menu-data.js uploaded by the admin) wins for everyone.
  if (typeof window !== 'undefined' && typeof window.SAVED_MENU !== 'undefined') {
    const published = normalizeMenu(window.SAVED_MENU);
    if (published.length > 0 && isValidMenu(published)) return published;
  }
  // 2. Admin edits saved in this browser.
  try {
    const raw = localStorage.getItem(MENU_STORAGE_KEY);
    if (raw) {
      const parsed = normalizeMenu(JSON.parse(raw));
      if (parsed.length > 0 && isValidMenu(parsed)) return parsed;
    }
  } catch (e) {
    /* storage unavailable or corrupted — fall through */
  }
  // 3. Built-in defaults.
  return cloneMenu(DEFAULT_MENU);
}

function saveMenu(menu) {
  try {
    const clean = normalizeMenu(menu);
    if (!isValidMenu(clean)) return false;
    localStorage.setItem(MENU_STORAGE_KEY, JSON.stringify(clean));
    return true;
  } catch (e) {
    return false;
  }
}

function hasSavedMenu() {
  try {
    return !!localStorage.getItem(MENU_STORAGE_KEY);
  } catch (e) {
    return false;
  }
}

function resetMenu() {
  try {
    localStorage.removeItem(MENU_STORAGE_KEY);
  } catch (e) {
    /* nothing to clear */
  }
}

/* Human-readable label of where the current menu comes from. */
function menuSource() {
  if (typeof window !== 'undefined' && typeof window.SAVED_MENU !== 'undefined') {
    const published = normalizeMenu(window.SAVED_MENU);
    if (published.length > 0 && isValidMenu(published)) return 'published';
  }
  if (hasSavedMenu()) return 'browser';
  return 'default';
}
