'use strict';

/* ============================================================
   Oops! Life Cooked Again — script.js
   Vanilla JS only. No frameworks, no build step.
   ============================================================ */

/* ---------------- Restaurant data ---------------- */
const RESTAURANT = {
  name: 'Oops! Life Cooked Again',
  tagline: 'Life cooked you. So we cooked for you.',
  address: "2nd Bsc CS, St.Joseph's College(Autonomous) Trichy-620002",
  phone: '+91 7010847158',
  phoneHref: '+917010847158',
  email: 'oopslifecookedagain@gmail.com',
  orderEmail: 'sahaya25ucs114@gmail.com',
  footerEmail: 'lifecookedagain@gmail.com',
  instagram: 'https://www.instagram.com',
};

const IMAGES = {
  hero: 'images/KLing_6f54e27f-7ac8-4994-aa77-746ebd186339.jpg',
  about: 'images/KLing_881bc12b-0f2e-46c1-a128-49a95bdcb2e3.jpg',
  interior: 'images/KLing_1e1ff793-0965-441f-98f7-7a5c2e82610a.jpg',
};

const HERO_ALT = 'Royal fine dining table with golden candlelight and elegant black decor';
const ABOUT_ALT = 'Friends enjoying a warm meal together at a cozy restaurant table';
const INTERIOR_ALT = 'Elegant royal restaurant interior with black walls and golden accents';

/* Menu data comes from the shared menu-store.js (stored in Supabase, admin-editable).
   Starts with the built-in defaults and is refreshed from Supabase in loadRemoteData(). */
let MENU_CATEGORIES = loadMenu();

const FEATURED = [
  {
    name: 'Masala Dosa',
    price: 80,
    tagline: 'The golden crisp legend',
    image: 'images/KLing_c0c6e19b-a96e-4c8b-b403-a9ee7a4f7ae3.jpg',
    alt: 'Golden crispy masala dosa served on a dark plate with chutney and sambar',
  },
  {
    name: 'Chicken Biriyani & Chicken 65',
    price: 180,
    tagline: 'The crown combo',
    image: 'images/KLing_a617852c-cbcc-4a44-9e4f-11b4fe3b58ee.jpg',
    alt: 'Royal chicken biryani with Chicken 65 garnished with fried onions',
  },
  {
    name: 'Mutton Biriyani & Mutton gravy',
    price: 300,
    tagline: 'Royal indulgence',
    image: 'images/KLing_a26d7cbc-beab-41d9-8a56-53b043b07dc4.jpg',
    alt: 'Rich mutton biryani with mutton gravy in a royal presentation',
  },
];

const MORE_FAVOURITES = [
  { name: 'Parotta with Beef Curry', price: 110, tagline: 'Flaky layers meet slow-cooked spice' },
  { name: 'Oreo Milkshake', price: 55, tagline: 'Cookies crowned in cream' },
  { name: 'Red Velvet Cake', price: 80, tagline: 'A slice of velvet royalty' },
  { name: 'Coffee', price: 25, tagline: 'The filter coffee that fixes everything' },
  { name: 'Sweet Bun', price: 20, tagline: 'Soft, warm, humble perfection' },
  { name: 'Chapati (3pcs) with Vegetable Curry', price: 40, tagline: 'Comfort, threefold' },
  { name: 'Medu Vada', price: 12, tagline: 'Crisp rings of joy' },
  { name: 'Idli with Sambar & Chutney', price: 40, tagline: 'The morning classic' },
];

/* Gallery photos come from the shared gallery-store.js (stored in Supabase, admin-editable). */
let GALLERY = loadGallery();

/* ---------------- Constants ---------------- */
const MAX_QTY = 30;
const MAX_ITEM_NOTES = 200;
const MAX_ORDER_NOTES = 500;
const PHONE_RE = /^[+]?[0-9][0-9\s-]{7,14}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FORMSUBMIT_URL = 'https://formsubmit.co/ajax/' + RESTAURANT.orderEmail;
const FETCH_TIMEOUT_MS = 12000;

const ICONS = {
  plus: '<svg class="icon" aria-hidden="true"><use href="#icon-plus"/></svg>',
  minus: '<svg class="icon" aria-hidden="true"><use href="#icon-minus"/></svg>',
  trash: '<svg class="icon" aria-hidden="true"><use href="#icon-trash"/></svg>',
  utensils: '<svg class="icon" aria-hidden="true"><use href="#icon-utensils"/></svg>',
  bag: '<svg class="icon" aria-hidden="true"><use href="#icon-bag"/></svg>',
  check: '<svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg>',
  mail: '<svg class="icon" aria-hidden="true"><use href="#icon-mail"/></svg>',
  loader: '<svg class="icon spin" aria-hidden="true"><use href="#icon-loader"/></svg>',
  expand: '<svg class="icon" aria-hidden="true"><use href="#icon-expand"/></svg>',
  calendar: '<svg class="icon" aria-hidden="true"><use href="#icon-calendar"/></svg>',
  heart: '<svg class="icon" aria-hidden="true"><use href="#icon-heart"/></svg>',
};

/* ---------------- Tiny helpers ---------------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const INR = (n) => '\u20B9' + n;
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const todayISO = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

/* ---------------- Toasts ---------------- */
function showToast(title, message, type) {
  const wrap = $('#toasts');
  if (!wrap) return;
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' error' : '');
  toast.innerHTML = `
    ${type === 'error' ? ICONS.mail : ICONS.check}
    <div class="toast-body"><strong>${esc(title)}</strong><span>${esc(message)}</span></div>`;
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 320);
  }, 5200);
}

/* ---------------- Navbar ---------------- */
function initNavbar() {
  const navbar = $('#navbar');
  const onScroll = () => navbar.classList.toggle('scrolled', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const toggle = $('#menu-toggle');
  const mobileNav = $('#mobile-nav');
  const closeNav = () => {
    mobileNav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  };
  toggle.addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('#mobile-nav a').forEach((a) => a.addEventListener('click', closeNav));
  document.addEventListener('click', (e) => {
    if (mobileNav.classList.contains('open') && !mobileNav.contains(e.target) && !toggle.contains(e.target)) {
      closeNav();
    }
  });
}

/* ---------------- Static images ---------------- */
function initImages() {
  const hero = $('#hero-img');
  if (hero) {
    hero.src = IMAGES.hero;
    hero.alt = HERO_ALT;
  }
  const about = $('#about-img');
  if (about) {
    about.src = IMAGES.about;
    about.alt = ABOUT_ALT;
  }
  const interior = $('#interior-img');
  if (interior) {
    interior.src = IMAGES.interior;
    interior.alt = INTERIOR_ALT;
  }
}

/* ---------------- Best sellers ---------------- */
function renderBestSellers() {
  const grid = $('#featured-grid');
  if (grid) {
    grid.innerHTML = FEATURED.map(
      (dish) => { const p = PRICES[dish.name] !== undefined ? PRICES[dish.name] : dish.price; return `
      <article class="card dish-card reveal">
        <div class="dish-card-img">
          <img src="${dish.image}" alt="${esc(dish.alt)}" loading="lazy">
          <span class="dish-badge">Best Seller</span>
        </div>
        <div class="dish-card-body">
          <h3>${esc(dish.name)}</h3>
          <p class="dish-card-desc">&ldquo;${esc(dish.tagline)}&rdquo;</p>
          <div class="dish-card-foot">
            <span class="dish-price">${INR(p)}</span>
            <button type="button" class="btn btn-primary" data-add="${esc(dish.name)}" data-price="${p}">${ICONS.plus} Add</button>
          </div>
        </div>
      </article>`; }
    ).join('');
  }

  const list = $('#best-seller-list');
  if (list) {
    list.innerHTML = MORE_FAVOURITES.map(
      (dish) => { const p = PRICES[dish.name] !== undefined ? PRICES[dish.name] : dish.price; return `
      <div class="price-row">
        <span class="price-row-name">${esc(dish.name)}</span>
        <span class="price-row-leader"></span>
        <span class="price-row-price">${INR(p)}</span>
      </div>`; }
    ).join('');
  }
}

/* ---------------- Menu ---------------- */
function priceLookup() {
  const map = {};
  MENU_CATEGORIES.forEach((cat) => cat.items.forEach((it) => (map[it.name] = it.price)));
  return map;
}
let PRICES = priceLookup();

function renderMenu() {
  const tabs = $('#menu-tabs');
  const panels = $('#menu-panels');
  if (!tabs || !panels) return;

  tabs.innerHTML = MENU_CATEGORIES.map(
    (cat, i) => `
    <button type="button" class="tab-btn${i === 0 ? ' active' : ''}" role="tab"
      aria-selected="${i === 0}" aria-controls="panel-${cat.id}" id="tab-${cat.id}"
      data-tab="${cat.id}">${esc(cat.title)}</button>`
  ).join('');

  panels.innerHTML = MENU_CATEGORIES.map(
    (cat, i) => `
    <div class="menu-panel${i === 0 ? ' active' : ''}" id="panel-${cat.id}"
      role="tabpanel" aria-labelledby="tab-${cat.id}">
      <div class="menu-panel-card">
        <div class="menu-panel-head">
          <h3>${esc(cat.title)}</h3>
          <p>${esc(cat.subtitle)}</p>
          <span class="panel-note">${esc(cat.note)}</span>
        </div>
        <div class="menu-rows">${cat.items.map(menuRowHTML).join('')}</div>
      </div>
    </div>`
  ).join('');

  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-tab]');
    if (!btn) return;
    $$('.tab-btn', tabs).forEach((b) => {
      const active = b === btn;
      b.classList.toggle('active', active);
      b.setAttribute('aria-selected', String(active));
    });
    $$('.menu-panel', panels).forEach((p) =>
      p.classList.toggle('active', p.id === 'panel-' + btn.dataset.tab)
    );
  });
}

function menuRowHTML(item) {
  const qty = cart.find((c) => c.name === item.name)?.quantity || 0;
  const control =
    qty === 0
      ? `<button type="button" class="add-btn" data-add="${esc(item.name)}">${ICONS.plus} Add</button>`
      : `<span class="stepper">
          <button type="button" class="stepper-btn" data-dec="${esc(item.name)}" aria-label="Decrease quantity of ${esc(item.name)}">${ICONS.minus}</button>
          <button type="button" class="stepper-qty" data-open-cart aria-label="${qty} in order, open your order">${qty}</button>
          <button type="button" class="stepper-btn" data-inc="${esc(item.name)}" aria-label="Increase quantity of ${esc(item.name)}">${ICONS.plus}</button>
        </span>`;
  return `
    <div class="menu-row">
      <span class="menu-row-name">${esc(item.name)}</span>
      <span class="menu-row-leader"></span>
      <span class="menu-row-price">${INR(item.price)}</span>
      ${control}
    </div>`;
}

function refreshMenuRows() {
  MENU_CATEGORIES.forEach((cat) => {
    const panel = document.getElementById('panel-' + cat.id);
    if (!panel) return;
    const rows = $('.menu-rows', panel);
    if (rows) rows.innerHTML = cat.items.map(menuRowHTML).join('');
  });
}

/* ---------------- Cart state ---------------- */
let cart = [];

function cartCount() {
  return cart.reduce((sum, it) => sum + it.quantity, 0);
}
function cartTotal() {
  return cart.reduce((sum, it) => sum + it.quantity * it.price, 0);
}

function addToCart(name) {
  const price = PRICES[name];
  if (price === undefined) return;
  const existing = cart.find((it) => it.name === name);
  if (existing) {
    existing.quantity = Math.min(MAX_QTY, existing.quantity + 1);
  } else {
    cart.push({ name, price, quantity: 1, notes: '' });
  }
  syncCart();
}

function changeQty(name, delta) {
  const item = cart.find((it) => it.name === name);
  if (!item) return;
  const next = item.quantity + delta;
  if (next < 1) {
    cart = cart.filter((it) => it.name !== name);
  } else {
    item.quantity = Math.min(MAX_QTY, next);
  }
  syncCart();
}

function removeItem(name) {
  cart = cart.filter((it) => it.name !== name);
  syncCart();
}

function setItemNotes(name, notes) {
  const item = cart.find((it) => it.name === name);
  if (item) item.notes = notes.slice(0, MAX_ITEM_NOTES);
}

/* Re-render every cart-dependent view (except notes typing). */
function syncCart() {
  refreshMenuRows();
  renderCart();
  updateBadge();
  updateSummaryBar();
}

function updateBadge() {
  const badge = $('#cart-badge');
  const count = cartCount();
  badge.textContent = count;
  badge.hidden = count === 0;
  $('#cart-btn').setAttribute(
    'aria-label',
    count > 0 ? `Open your order (${count} items)` : 'Open your order'
  );
}

function updateSummaryBar() {
  const bar = $('#order-summary-bar');
  const count = cartCount();
  bar.hidden = count === 0;
  if (count === 0) return;
  $('#order-summary-text').innerHTML =
    `<strong>${count}</strong> ${count === 1 ? 'dish' : 'dishes'} waiting in your royal order &middot; <strong>${INR(cartTotal())}</strong>`;
}

/* ---------------- Cart drawer ---------------- */
function renderCart() {
  const items = $('#cart-items');
  const empty = $('#cart-empty');
  const scroll = $('#cart-scroll');
  const checkout = $('#cart-checkout');
  const subtitle = $('#cart-subtitle');

  if (cart.length === 0) {
    empty.hidden = false;
    scroll.hidden = true;
    checkout.hidden = true;
    subtitle.textContent = 'Your order awaits its first dish.';
    return;
  }

  empty.hidden = true;
  scroll.hidden = false;
  checkout.hidden = false;
  const count = cartCount();
  subtitle.textContent = `${count} ${count === 1 ? 'item' : 'items'} ready to be served.`;
  $('#cart-total').textContent = INR(cartTotal());

  items.innerHTML = cart
    .map((item) => {
      const lineTotal = item.price * item.quantity;
      return `
      <div class="cart-item">
        <div class="cart-item-top">
          <div>
            <p class="cart-item-name">${esc(item.name)}</p>
            <p class="cart-item-meta">${INR(item.price)} each &middot; ${INR(lineTotal)} total</p>
          </div>
          <button type="button" class="cart-item-remove" data-remove="${esc(item.name)}"
            aria-label="Remove ${esc(item.name)} from order">${ICONS.trash}</button>
        </div>
        <div class="cart-item-controls">
          <span class="stepper">
            <button type="button" class="stepper-btn" data-dec="${esc(item.name)}"
              aria-label="Decrease quantity of ${esc(item.name)}">${ICONS.minus}</button>
            <span class="stepper-qty">${item.quantity}</span>
            <button type="button" class="stepper-btn" data-inc="${esc(item.name)}"
              aria-label="Increase quantity of ${esc(item.name)}">${ICONS.plus}</button>
          </span>
          <span class="cart-item-total">${INR(lineTotal)}</span>
        </div>
        <div class="cart-item-notes">
          <input type="text" maxlength="${MAX_ITEM_NOTES}" value="${esc(item.notes)}"
            placeholder="Special requests \u2014 spice level, extras..."
            data-notes="${esc(item.name)}"
            aria-label="Special requests for ${esc(item.name)}">
        </div>
      </div>`;
    })
    .join('');

  const label = $('#place-order-label');
  if (label) label.textContent = `Place Order \u00B7 ${INR(cartTotal())}`;
}

function openCart() {
  $('#cart-overlay').hidden = false;
  const drawer = $('#cart-drawer');
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
  $('#cart-close').focus();
}

function closeCart() {
  const drawer = $('#cart-drawer');
  drawer.classList.remove('open');
  drawer.setAttribute('aria-hidden', 'true');
  $('#cart-overlay').hidden = true;
  document.body.classList.remove('no-scroll');
}

function initCart() {
  $('#cart-btn').addEventListener('click', openCart);
  $('#cart-close').addEventListener('click', closeCart);
  $('#cart-overlay').addEventListener('click', closeCart);
  $('#cart-empty-link').addEventListener('click', closeCart);
  $('#order-summary-btn').addEventListener('click', openCart);

  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) {
      addToCart(add.dataset.add);
      return;
    }
    const inc = e.target.closest('[data-inc]');
    if (inc) {
      changeQty(inc.dataset.inc, 1);
      return;
    }
    const dec = e.target.closest('[data-dec]');
    if (dec) {
      changeQty(dec.dataset.dec, -1);
      return;
    }
    const remove = e.target.closest('[data-remove]');
    if (remove) {
      removeItem(remove.dataset.remove);
      return;
    }
    if (e.target.closest('[data-open-cart]')) {
      openCart();
    }
  });

  // Notes typing: update state only (no re-render, keeps focus).
  $('#cart-items').addEventListener('input', (e) => {
    const input = e.target.closest('[data-notes]');
    if (input) setItemNotes(input.dataset.notes, input.value);
  });

  syncCart();
}

/* ---------------- Validation helpers ---------------- */
function setError(inputId, errorId, message) {
  const input = document.getElementById(inputId);
  const err = document.getElementById(errorId);
  if (message) {
    input.classList.add('invalid');
    err.textContent = message;
    err.classList.add('visible');
  } else {
    input.classList.remove('invalid');
    err.textContent = '';
    err.classList.remove('visible');
  }
  return !message;
}

/* ---------------- Email dispatch (FormSubmit + mailto fallback) ---------------- */
async function sendEmail(subject, body, fromName, replyTo) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(FORMSUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: fromName,
        email: replyTo || RESTAURANT.orderEmail,
        _subject: subject,
        message: body,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (!data || String(data.success) !== 'true') throw new Error('Unconfirmed');
    return true;
  } finally {
    clearTimeout(timer);
  }
}

function openMailto(subject, body) {
  const url =
    'mailto:' +
    RESTAURANT.orderEmail +
    '?subject=' +
    encodeURIComponent(subject) +
    '&body=' +
    encodeURIComponent(body);
  window.location.href = url;
}

/* ---------------- Checkout ---------------- */
function generateOrderId() {
  const d = new Date();
  const stamp =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0');
  return 'ORD-' + stamp + '-' + Math.floor(1000 + Math.random() * 9000);
}

function buildOrderEmail(table, name, phone, orderId, notes) {
  const placed = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date());

  const lines = [
    '==================================================',
    `  DINE-IN ORDER - TABLE ${table.toUpperCase()}`,
    '  Oops! Life Cooked Again',
    '==================================================',
    '',
    `Order ID:  ${orderId}`,
    `Placed:    ${placed}`,
    '',
    'CUSTOMER DETAILS',
    '--------------------------------------------------',
    `Name:      ${name}`,
    `Phone:     ${phone}`,
    `Table No:  ${table}`,
    '',
    'ORDER ITEMS',
    '--------------------------------------------------',
  ];

  cart.forEach((item, i) => {
    lines.push(`${i + 1}) ${item.name}`);
    lines.push(`   Qty: ${item.quantity} x ${INR(item.price)} = ${INR(item.price * item.quantity)}`);
    if (item.notes.trim()) lines.push(`   Notes: ${item.notes.trim()}`);
    lines.push('');
  });

  lines.push('--------------------------------------------------');
  lines.push(`TOTAL AMOUNT: ${INR(cartTotal())}`);
  if (notes) {
    lines.push('');
    lines.push(`Order Notes: ${notes}`);
  }
  lines.push('');
  lines.push('==================================================');
  lines.push('Sent automatically from the restaurant website.');
  return lines.join('\n');
}

function validateCheckout() {
  const table = $('#co-table').value.trim();
  const name = $('#co-name').value.trim();
  const phone = $('#co-phone').value.trim();

  let ok = true;
  ok = setError('co-table', 'err-co-table',
    table.length >= 1 && table.length <= 10 ? '' : 'Table number is required.') && ok;
  ok = setError('co-name', 'err-co-name',
    name.length >= 2 && name.length <= 80 ? '' : 'Please enter your name.') && ok;
  ok = setError('co-phone', 'err-co-phone',
    PHONE_RE.test(phone) ? '' : 'Please enter a valid phone number.') && ok;
  return ok;
}

async function submitOrder(e) {
  e.preventDefault();
  if (cart.length === 0) {
    showToast('Your order is empty', 'Add at least one dish before checking out.', 'error');
    return;
  }
  if (!validateCheckout()) return;

  const table = $('#co-table').value.trim();
  const name = $('#co-name').value.trim();
  const phone = $('#co-phone').value.trim();
  const notes = $('#co-notes').value.trim().slice(0, MAX_ORDER_NOTES);
  const orderId = generateOrderId();
  const total = cartTotal();

  const subject = `[DINE-IN ORDER] Table ${table} - Oops! Life Cooked Again`;
  const body = buildOrderEmail(table, name, phone, orderId, notes);
  const orderItems = cart.map((it) => ({
    name: it.name,
    price: it.price,
    quantity: it.quantity,
    notes: it.notes.trim(),
  }));

  const btn = $('#place-order-btn');
  btn.disabled = true;
  btn.innerHTML = ICONS.loader + '<span>Placing your order&hellip;</span>';

  // Save to Supabase AND email the restaurant; the order counts as delivered if either works.
  const [dbRes, mailRes] = await Promise.allSettled([
    saveOrderToSupabase(orderId, table, name, phone, notes, orderItems),
    sendEmail(subject, body, name, RESTAURANT.orderEmail),
  ]);
  const delivered =
    (dbRes.status === 'fulfilled' && dbRes.value === true) ||
    (mailRes.status === 'fulfilled' && mailRes.value === true);

  btn.disabled = false;
  btn.innerHTML = ICONS.utensils + `<span id="place-order-label">Place Order \u00B7 ${INR(total)}</span>`;

  // Reset cart + form regardless: the message is in flight one way or another.
  cart = [];
  $('#checkout-form').reset();
  syncCart();
  closeCart();

  if (delivered) {
    showOrderSuccess(orderId, table, total);
  } else {
    openMailto(subject, body);
    showToast(
      'Opening your email app',
      'Automatic dispatch was unavailable \u2014 we have prepared the order email for you. Just press send.',
      'error'
    );
  }
}

function showOrderSuccess(orderId, table, total) {
  $('#order-confirm-number').textContent = '#' + orderId;
  $('#order-confirm-details').innerHTML =
    `Table <strong>${esc(table)}</strong> &middot; Total <strong>${INR(total)}</strong>`;
  const modal = $('#order-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}

/* ---------------- Reservation ---------------- */
function validateReservation() {
  const name = $('#res-name').value.trim();
  const email = $('#res-email').value.trim();
  const phone = $('#res-phone').value.trim();
  const guests = Number($('#res-guests').value);
  const date = $('#res-date').value;
  const time = $('#res-time').value;
  const seating = $('#res-seating').value;

  let ok = true;
  ok = setError('res-name', 'err-res-name', name.length >= 2 ? '' : 'Please enter your name.') && ok;
  ok = setError('res-email', 'err-res-email', EMAIL_RE.test(email) ? '' : 'Please enter a valid email address.') && ok;
  ok = setError('res-phone', 'err-res-phone', PHONE_RE.test(phone) ? '' : 'Please enter a valid phone number.') && ok;
  ok = setError(
    'res-guests',
    'err-res-guests',
    Number.isInteger(guests) && guests >= 1 && guests <= 20 ? '' : 'Guests must be between 1 and 20.'
  ) && ok;

  let dateErr = '';
  if (!date) {
    dateErr = 'Please choose a date.';
  } else if (date < todayISO()) {
    dateErr = 'Reservation date cannot be in the past.';
  } else if (new Date(date + 'T00:00:00').getDay() === 6) {
    dateErr = 'We are closed on Saturdays \u2014 please pick another day.';
  }
  ok = setError('res-date', 'err-res-date', dateErr) && ok;

  let timeErr = '';
  if (!time) {
    timeErr = 'Please choose a time.';
  } else {
    const [h, m] = time.split(':').map(Number);
    const minutes = h * 60 + m;
    if (minutes < 6 * 60 || minutes > 22 * 60) {
      timeErr = 'We serve from 06:00 AM to 10:00 PM only.';
    }
  }
  ok = setError('res-time', 'err-res-time', timeErr) && ok;
  ok = setError('res-seating', 'err-res-seating', seating ? '' : 'Please choose a seating preference.') && ok;

  return ok;
}

function seatingLabel(value) {
  if (value === 'indoor') return 'Indoor (Main dining room)';
  if (value === 'outdoor') return 'Outdoor (Patio)';
  return 'No Preference';
}

async function submitReservation(e) {
  e.preventDefault();
  if (!validateReservation()) return;

  const name = $('#res-name').value.trim();
  const email = $('#res-email').value.trim();
  const phone = $('#res-phone').value.trim();
  const guests = $('#res-guests').value;
  const date = $('#res-date').value;
  const time = $('#res-time').value;
  const seating = $('#res-seating').value;
  const notes = $('#res-notes').value.trim();

  const subject = `[TABLE RESERVATION] ${name} - ${date} ${time}`;
  const body = [
    '==================================================',
    '  NEW TABLE RESERVATION',
    '  Oops! Life Cooked Again',
    '==================================================',
    '',
    `Name:       ${name}`,
    `Email:      ${email}`,
    `Phone:      ${phone}`,
    `Date:       ${date}`,
    `Time:       ${time}`,
    `Guests:     ${guests}`,
    `Seating:    ${seatingLabel(seating)}`,
    notes ? `Notes:      ${notes}` : '',
    '',
    'Sent automatically from the restaurant website.',
  ]
    .filter(Boolean)
    .join('\n');

  const btn = $('#res-submit');
  btn.disabled = true;
  btn.innerHTML = ICONS.loader + '<span>Sending&hellip;</span>';

  const [dbRes, mailRes] = await Promise.allSettled([
    sbInsert('reservations', {
      name: name,
      email: email,
      phone: phone,
      guests: Number(guests),
      res_date: date,
      res_time: time,
      seating: seating,
      notes: notes || null,
    }),
    sendEmail(subject, body, name, email),
  ]);
  const delivered =
    (dbRes.status === 'fulfilled' && dbRes.value === true) ||
    (mailRes.status === 'fulfilled' && mailRes.value === true);

  btn.disabled = false;
  btn.innerHTML = ICONS.calendar + '<span>Book Now</span>';

  if (delivered) {
    showToast('Reservation requested!', `See you on ${date} at ${time}, ${name}. We will confirm by phone.`);
    e.target.reset();
    $('#res-guests').value = 2;
  } else {
    openMailto(subject, body);
    showToast(
      'Opening your email app',
      'Automatic dispatch was unavailable \u2014 your reservation details are pre-filled. Just press send.',
      'error'
    );
  }
}

/* ---------------- Feedback ---------------- */
function validateFeedback() {
  const name = $('#fb-name').value.trim();
  const email = $('#fb-email').value.trim();
  const message = $('#fb-message').value.trim();

  let ok = true;
  ok = setError('fb-name', 'err-fb-name', name.length >= 2 ? '' : 'Please enter your name.') && ok;
  ok = setError('fb-email', 'err-fb-email', EMAIL_RE.test(email) ? '' : 'Please enter a valid email address.') && ok;
  ok = setError('fb-message', 'err-fb-message', message.length >= 5 ? '' : 'Please share a few words with us.') && ok;
  return ok;
}

async function submitFeedback(e) {
  e.preventDefault();
  if (!validateFeedback()) return;

  const name = $('#fb-name').value.trim();
  const email = $('#fb-email').value.trim();
  const message = $('#fb-message').value.trim();

  const subject = `[FEEDBACK] ${name}`;
  const body = [
    '==================================================',
    '  CUSTOMER FEEDBACK',
    '  Oops! Life Cooked Again',
    '==================================================',
    '',
    `Name:   ${name}`,
    `Email:  ${email}`,
    '',
    'Feedback:',
    '--------------------------------------------------',
    message,
    '',
    'Sent automatically from the restaurant website.',
  ].join('\n');

  const btn = $('#fb-submit');
  btn.disabled = true;
  btn.innerHTML = ICONS.loader + '<span>Sending&hellip;</span>';

  const [dbRes, mailRes] = await Promise.allSettled([
    sbInsert('feedback', { name: name, email: email, message: message }),
    sendEmail(subject, body, name, email),
  ]);
  const delivered =
    (dbRes.status === 'fulfilled' && dbRes.value === true) ||
    (mailRes.status === 'fulfilled' && mailRes.value === true);

  btn.disabled = false;
  btn.innerHTML = ICONS.heart + '<span>Submit Feedback</span>';

  if (delivered) {
    showToast('Thank you!', 'Your feedback has been received. Life cooked you \u2014 we cooked it better!');
    e.target.reset();
  } else {
    openMailto(subject, body);
    showToast(
      'Opening your email app',
      'Automatic dispatch was unavailable \u2014 your feedback is pre-filled. Just press send.',
      'error'
    );
  }
}

/* ---------------- Gallery lightbox ---------------- */
function renderGallery() {
  const grid = $('#gallery-grid');
  if (!grid) return;
  grid.innerHTML = GALLERY.map(
    (img, i) => `
    <button type="button" class="gallery-item" data-lb="${i}"
      aria-label="View ${esc(img.caption)} enlarged">
      <img src="${img.src}" alt="${esc(img.alt)}" loading="lazy">
      <span class="gallery-caption">
        <span>${esc(img.caption)}</span>
        ${ICONS.expand}
      </span>
    </button>`
  ).join('');
}

let lbIndex = -1;

function showLightbox(i) {
  lbIndex = ((i % GALLERY.length) + GALLERY.length) % GALLERY.length;
  const img = GALLERY[lbIndex];
  $('#lb-image').src = img.src;
  $('#lb-image').alt = img.alt;
  $('#lb-caption').textContent = `${img.caption} (${lbIndex + 1} / ${GALLERY.length})`;
  const box = $('#lightbox');
  box.classList.add('open');
  box.setAttribute('aria-hidden', 'false');
  document.body.classList.add('no-scroll');
}

function hideLightbox() {
  const box = $('#lightbox');
  box.classList.remove('open');
  box.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('no-scroll');
  lbIndex = -1;
}

function initGallery() {
  renderGallery();
  $('#gallery-grid').addEventListener('click', (e) => {
    const item = e.target.closest('[data-lb]');
    if (item) showLightbox(Number(item.dataset.lb));
  });
  $('#lb-close').addEventListener('click', hideLightbox);
  $('#lb-prev').addEventListener('click', () => showLightbox(lbIndex - 1));
  $('#lb-next').addEventListener('click', () => showLightbox(lbIndex + 1));
  $('#lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') hideLightbox();
  });
}

/* ---------------- Reveal on scroll ---------------- */
function initReveal() {
  const targets = $$('.reveal');
  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('visible'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  targets.forEach((el) => io.observe(el));
}

/* ---------------- Global keyboard ---------------- */
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideLightbox();
      closeCart();
      const modal = $('#order-modal');
      if (modal.classList.contains('open')) {
        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
      }
    }
    if (lbIndex >= 0) {
      if (e.key === 'ArrowLeft') showLightbox(lbIndex - 1);
      if (e.key === 'ArrowRight') showLightbox(lbIndex + 1);
    }
  });
}

/* ---------------- Supabase data ---------------- */
/* Pull the live menu + gallery from Supabase (max ~4s), then refresh the
   in-memory copies. If Supabase is slow/unconfigured the built-in defaults stay. */
async function loadRemoteData() {
  await sbWithTimeout(Promise.all([fetchMenu(), fetchGallery()]), 4000);
  MENU_CATEGORIES = loadMenu();
  PRICES = priceLookup();
  GALLERY = loadGallery();
}

/* Save an order / reservation / feedback row to Supabase. Resolves true/false. */
function saveOrderToSupabase(orderId, table, name, phone, notes, items) {
  return sbInsert('orders', {
    order_code: orderId,
    table_no: table,
    customer_name: name,
    phone: phone,
    notes: notes || null,
    items: items,
    // total + prices are recalculated by the database from menu_items
  });
}

/* ---------------- Init ---------------- */
document.addEventListener('DOMContentLoaded', async () => {
  initNavbar();
  initImages();
  await loadRemoteData();
  renderBestSellers();
  renderMenu();
  initCart();
  renderGallery();
  initGallery();

  $('#checkout-form').addEventListener('submit', submitOrder);
  $('#reservation-form').addEventListener('submit', submitReservation);
  $('#feedback-form').addEventListener('submit', submitFeedback);

  $('#order-modal-close').addEventListener('click', () => {
    const modal = $('#order-modal');
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
  });
  $('#order-modal').addEventListener('click', (e) => {
    if (e.target.id === 'order-modal') {
      e.target.classList.remove('open');
      e.target.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('no-scroll');
    }
  });

  // Reservation date: block past dates in the picker itself.
  const dateInput = $('#res-date');
  if (dateInput) dateInput.min = todayISO();

  initReveal();
  initKeyboard();
});
