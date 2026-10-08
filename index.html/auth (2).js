'use strict';

/* ============================================================
   auth.js - Login portal backed by Supabase Auth (shared by all pages)
   - Accounts live in Supabase (auth.users + public.profiles).
   - The FIRST account created becomes the ADMIN (see schema.sql trigger).
   - Admin rights are enforced by the database (RLS); the checks here
     only decide what the page shows.
   - getCurrentUser() stays synchronous: it returns the cached user, which
     is ready once `authReady` has resolved.
   Requires: supabase-js CDN, supabase-config.js, supabase-client.js first.
   ============================================================ */

const AUTH_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

let currentUser = null; // { id, name, email, role } | null

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

/* ---------- Profile loading ---------- */
async function fetchProfile(authUser) {
  if (!authUser) return null;
  const fallbackName =
    (authUser.user_metadata && authUser.user_metadata.name) || String(authUser.email || '').split('@')[0];
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('id, name, email, role')
      .eq('id', authUser.id)
      .maybeSingle();
    if (!error && data) return { id: data.id, name: data.name || fallbackName, email: data.email, role: data.role };
  } catch (e) {
    /* fall through to the safe default below */
  }
  // Profile row missing/unreachable: treat as a normal (non-admin) user.
  return { id: authUser.id, name: fallbackName, email: authUser.email, role: 'user' };
}

function friendlyAuthError(error) {
  const msg = String((error && error.message) || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Incorrect email or password.';
  if (msg.includes('email not confirmed')) return 'Please confirm your email first - check your inbox for the link.';
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'This email is already registered. Try signing in instead.';
  }
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a minute and try again.';
  if (msg.includes('password')) return error.message;
  return (error && error.message) || 'Something went wrong. Please try again.';
}

/* ---------- Session bootstrap ---------- */
async function initAuth() {
  if (!window.sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    if (data && data.session) currentUser = await fetchProfile(data.session.user);
  } catch (e) {
    currentUser = null;
  }
  // Signed out in another tab -> refresh the navbar here too.
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && currentUser) {
      currentUser = null;
      setTimeout(renderAccountArea, 0);
    }
  });
  return currentUser;
}

/* Await this before reading getCurrentUser(). */
const authReady = initAuth();

/* ---------- Session helpers ---------- */
function getCurrentUser() {
  return currentUser;
}

function isAdminUser(user) {
  return !!user && user.role === 'admin';
}

/* Is there at least one account yet? (drives the "first user = admin" notice) */
async function hasAnyUsers() {
  if (!window.sb) return true;
  try {
    const { data, error } = await sb.rpc('has_any_users');
    return error ? true : !!data;
  } catch (e) {
    return true;
  }
}

/* ---------- Actions ---------- */
/* Returns { ok, user?, needsConfirm?, error? } - the FIRST account becomes admin. */
async function registerUser(name, email, password) {
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();

  if (cleanName.length < 2) return { ok: false, error: 'Please enter your full name.' };
  if (!AUTH_EMAIL_RE.test(cleanEmail)) return { ok: false, error: 'Please enter a valid email address.' };
  if (String(password).length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
  if (!window.sb) return { ok: false, error: 'The website is not connected to Supabase yet. See SETUP.md.' };

  try {
    const { data, error } = await sb.auth.signUp({
      email: cleanEmail,
      password: password,
      options: { data: { name: cleanName } },
    });
    if (error) return { ok: false, error: friendlyAuthError(error) };

    // With "Confirm email" ON, a duplicate sign-up returns a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      return { ok: false, error: 'This email is already registered. Try signing in instead.' };
    }
    // "Confirm email" ON: no session until the link in the email is clicked.
    if (!data.session) return { ok: true, needsConfirm: true };

    currentUser = await fetchProfile(data.user);
    return { ok: true, user: currentUser };
  } catch (e) {
    return { ok: false, error: 'Could not reach the server. Check your internet connection.' };
  }
}

/* Returns { ok, user?, error? } */
async function loginUser(email, password) {
  const cleanEmail = String(email).trim().toLowerCase();
  if (!window.sb) return { ok: false, error: 'The website is not connected to Supabase yet. See SETUP.md.' };
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email: cleanEmail, password: password });
    if (error) return { ok: false, error: friendlyAuthError(error) };
    currentUser = await fetchProfile(data.user);
    return { ok: true, user: currentUser };
  } catch (e) {
    return { ok: false, error: 'Could not reach the server. Check your internet connection.' };
  }
}

async function logoutUser() {
  currentUser = null;
  if (!window.sb) return;
  try {
    await sb.auth.signOut();
  } catch (e) {
    /* local session is cleared by supabase-js regardless */
  }
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
    btn.addEventListener('click', async () => {
      await logoutUser();
      window.location.reload();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  authReady.then(renderAccountArea);
});
