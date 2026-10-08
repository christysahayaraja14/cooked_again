'use strict';

/* ============================================================
   supabase-client.js - creates the shared Supabase client (window.sb).
   Load order on every page:
     1. @supabase/supabase-js (CDN)   2. supabase-config.js   3. this file
   If the config is still the placeholder, window.sb is null and the site
   keeps working in "offline" mode (default menu/gallery, email-only forms).
   ============================================================ */
(function () {
  var cfg = window.SUPABASE_CONFIG || {};
  var configured =
    typeof cfg.url === 'string' && typeof cfg.anonKey === 'string' &&
    cfg.url !== '' && cfg.anonKey !== '' &&
    !/YOUR-/i.test(cfg.url + cfg.anonKey);

  window.SUPABASE_READY = !!(configured && window.supabase && typeof window.supabase.createClient === 'function');

  window.sb = window.SUPABASE_READY
    ? window.supabase.createClient(cfg.url, cfg.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
      })
    : null;

  if (!window.SUPABASE_READY) {
    console.warn('[supabase] Not configured - fill in .env, run "node generate-config.js", then reload. Running in offline mode.');
  }
})();

/* Insert one row (used by orders / reservations / feedback). Never throws.
   Do NOT chain .select() here: anonymous visitors may insert but not read. */
async function sbInsert(table, row) {
  if (!window.sb) return false;
  try {
    var res = await window.sb.from(table).insert(row);
    if (res.error) {
      console.warn('[supabase] insert into "' + table + '" failed:', res.error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[supabase] insert into "' + table + '" failed:', e);
    return false;
  }
}

/* Resolve with the promise's value, or null if it takes longer than ms. */
function sbWithTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function (resolve) { setTimeout(function () { resolve(null); }, ms); }),
  ]);
}
