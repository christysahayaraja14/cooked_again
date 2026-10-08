'use strict';

/* ============================================================
   auth.js — Client-side login portal (shared by all pages)
   - First registered account becomes the ADMIN, others are users.
   - Passwords are hashed (SHA-256 via Web Crypto; safe fallback
     for non-secure contexts like file://) before being stored.
   - Users live in localStorage "olca_users"; session in "olca_session".
   NOTE: purely client-side by design (HTML/CSS/JS-only requirement).
   ============================================================ */

const AUTH_KEYS = {
  users: 'olca_users',
  session: 'olca_session',
};

const AUTH_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Small helpers (namespaced to avoid collisions) ---------- */
function authEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/* Toast notifications on pages that don't load script.js. */
function notify(title, message, type) {
  const wrap = document.getElementById('toasts');
  if (!wrap) return;
  const toast = document.createElement('div');
  toast.className = 'toast' + (type === 'error' ? ' error' : '');
  const icon =
    type === 'error'
      ? '<svg class="icon" aria-hidden="true"><use href="#icon-mail"/></svg>'
      : '<svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg>';
  toast.innerHTML = icon + '<div class="toast-body"><strong>' + authEsc(title) + '</strong><span>' + authEsc(message) + '</span></div>';
  wrap.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('leaving');
    setTimeout(() => toast.remove(), 320);
  }, 4800);
}

/* ---------- Password hashing ---------- */
async function hashPassword(password) {
  const text = 'olca::' + password;
  // Preferred: SHA-256 (available on https and localhost).
  if (window.crypto && window.crypto.subtle && window.TextEncoder) {
    try {
      const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      const hex = Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      return 'sha256:' + hex;
    } catch (e) {
      /* fall through to fallback */
    }
  }
  // Fallback for file:// contexts without crypto.subtle: strong non-crypto hash.
  // Still never stores plain text.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'fallback:' + ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0'));
}

/* ---------- Storage ---------- */
function getUsers() {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.users);
    const users = raw ? JSON.parse(raw) : [];
    return Array.isArray(users) ? users : [];
  } catch (e) {
    return [];
  }
}

function saveUsers(users) {
  try {
    localStorage.setItem(AUTH_KEYS.users, JSON.stringify(users));
    return true;
  } catch (e) {
    return false;
  }
}

function getSession() {
  try {
    const raw = localStorage.getItem(AUTH_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setSession(userId) {
  try {
    localStorage.setItem(AUTH_KEYS.session, JSON.stringify({ userId: userId, at: Date.now() }));
  } catch (e) {
    /* storage unavailable */
  }
}

function clearSession() {
  try {
    localStorage.removeItem(AUTH_KEYS.session);
  } catch (e) {
    /* nothing to clear */
  }
}

/* ---------- Session helpers ---------- */
function getCurrentUser() {
  const session = getSession();
  if (!session || !session.userId) return null;
  return getUsers().find((u) => u && u.id === session.userId) || null;
}

function isAdminUser(user) {
  return !!user && user.role === 'admin';
}

/* ---------- Actions ---------- */
/* Returns { ok, user? , error? } — the FIRST account becomes admin. */
async function registerUser(name, email, password) {
  const users = getUsers();
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();

  if (cleanName.length < 2) return { ok: false, error: 'Please enter your full name.' };
  if (!AUTH_EMAIL_RE.test(cleanEmail)) return { ok: false, error: 'Please enter a valid email address.' };
  if (String(password).length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  if (users.some((u) => u.email === cleanEmail)) {
    return { ok: false, error: 'This email is already registered. Try signing in instead.' };
  }

  const user = {
    id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    name: cleanName,
    email: cleanEmail,
    passHash: await hashPassword(password),
    role: users.length === 0 ? 'admin' : 'user',
    createdAt: new Date().toISOString(),
  };

  if (!saveUsers(users.concat(user))) {
    return { ok: false, error: 'Could not save the account (browser storage unavailable).' };
  }
  setSession(user.id);
  return { ok: true, user: user };
}

/* Returns { ok, user?, error? } */
async function loginUser(email, password) {
  const cleanEmail = String(email).trim().toLowerCase();
  const user = getUsers().find((u) => u.email === cleanEmail);
  if (!user) return { ok: false, error: 'No account found with this email.' };
  const hash = await hashPassword(password);
  if (hash !== user.passHash) return { ok: false, error: 'Incorrect password. Please try again.' };
  setSession(user.id);
  return { ok: true, user: user };
}

function logoutUser() {
  clearSession();
}

/* ---------- Navbar account area (all pages) ---------- */
function renderAccountArea() {
  const desktop = document.getElementById('nav-account');
  const mobile = document.getElementById('mobile-nav-account');
  const user = getCurrentUser();

  if (desktop) {
    if (user) {
      desktop.innerHTML =
        (isAdminUser(user) ? '<a href="admin.html" class="account-link admin-link">Admin Panel</a>' : '') +
        '<span class="account-name" title="' + authEsc(user.email) + '">Hi, ' + authEsc(user.name.split(' ')[0]) + '</span>' +
        '<button type="button" class="account-logout" data-logout>Logout</button>';
    } else {
      desktop.innerHTML = '<a href="login.html" class="account-link">Login</a>';
    }
  }

  if (mobile) {
    if (user) {
      mobile.innerHTML =
        '<span class="mobile-account-name">Signed in as ' + authEsc(user.name) + (isAdminUser(user) ? ' (Admin)' : '') + '</span>' +
        (isAdminUser(user) ? '<a href="admin.html">Admin Panel</a>' : '') +
        '<button type="button" class="mobile-logout" data-logout>Logout</button>';
    } else {
      mobile.innerHTML = '<a href="login.html">Login</a>';
    }
  }

  document.querySelectorAll('[data-logout]').forEach((btn) => {
    btn.addEventListener('click', () => {
      logoutUser();
      window.location.reload();
    });
  });
}

document.addEventListener('DOMContentLoaded', renderAccountArea);
