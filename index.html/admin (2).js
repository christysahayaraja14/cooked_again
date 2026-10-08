'use strict';

/* ============================================================
   admin.js - Admin Panel logic (admin.html only)
   Requires supabase-client.js, auth.js, menu-store.js and gallery-store.js first.
   All data is saved to Supabase (menu, gallery, uploaded photos).
   Two workspaces: "Menu & Prices" and "Gallery Photos".
   ============================================================ */

(function () {
  var menu = [];
  var gallery = [];
  var currentCatIndex = 0;
  var currentView = 'menu';
  var dirty = false;

  var byId = function (id) { return document.getElementById(id); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- Dirty state ---------- */
  function markDirty() {
    dirty = true;
    var b = byId('dirty-badge');
    if (b) b.hidden = false;
  }
  function clearDirty() {
    dirty = false;
    var b = byId('dirty-badge');
    if (b) b.hidden = true;
  }

  /* ---------- Source line ---------- */
  function sourceLabel(kind) {
    return kind === 'supabase' ? 'live from Supabase' : 'built-in defaults (Supabase has no data yet)';
  }
  function renderSource() {
    var el = byId('menu-source');
    if (el) el.textContent = 'Menu: ' + sourceLabel(menuSource()) + ' \u00B7 Gallery: ' + sourceLabel(gallerySource());
  }

  /* ============================================================
     MENU VIEW
     ============================================================ */
  function renderTabs() {
    byId('admin-tabs').innerHTML = menu
      .map(function (cat, i) {
        return (
          '<button type="button" class="tab-btn' + (i === currentCatIndex ? ' active' : '') +
          '" data-cat="' + i + '" role="tab" aria-selected="' + (i === currentCatIndex) + '">' +
          esc(cat.title) + ' (' + cat.items.length + ')</button>'
        );
      })
      .join('');
  }

  function renderEditor() {
    var cat = menu[currentCatIndex];
    var editor = byId('admin-editor');

    var dishRows = cat.items
      .map(function (item, i) {
        return (
          '<div class="admin-dish-row">' +
          '<input type="text" class="dish-name" data-index="' + i + '" value="' + esc(item.name) + '" placeholder="Dish name" aria-label="Dish ' + (i + 1) + ' name">' +
          '<div class="price-wrap"><span aria-hidden="true">&#8377;</span>' +
          '<input type="number" class="dish-price" data-index="' + i + '" value="' + esc(item.price) + '" min="0" step="1" aria-label="Price of dish ' + (i + 1) + '"></div>' +
          '<button type="button" class="icon-btn dish-delete" data-delete="' + i + '" aria-label="Delete ' + esc(item.name) + '">' +
          '<svg class="icon" aria-hidden="true"><use href="#icon-trash"/></svg></button>' +
          '</div>'
        );
      })
      .join('');

    editor.innerHTML =
      '<section class="card admin-cat-card">' +
      '<h2 class="card-title">Category Details</h2>' +
      '<div class="admin-meta-grid">' +
      '<div class="field"><label for="cat-title">Title <span class="req">*</span></label>' +
      '<input id="cat-title" type="text" data-meta="title" value="' + esc(cat.title) + '"></div>' +
      '<div class="field"><label for="cat-subtitle">Subtitle</label>' +
      '<input id="cat-subtitle" type="text" data-meta="subtitle" value="' + esc(cat.subtitle) + '"></div>' +
      '</div>' +
      '<div class="field"><label for="cat-note">Note (shown under the category title)</label>' +
      '<input id="cat-note" type="text" data-meta="note" value="' + esc(cat.note) + '"></div>' +
      '</section>' +

      '<section class="card admin-dishes-card">' +
      '<h2 class="card-title">Dishes (' + cat.items.length + ')</h2>' +
      (dishRows || '<p class="admin-empty">No dishes in this category yet &mdash; add the first one below.</p>') +
      '<div class="admin-add-row">' +
      '<input type="text" id="new-dish-name" placeholder="New dish name" aria-label="New dish name">' +
      '<div class="price-wrap"><span aria-hidden="true">&#8377;</span>' +
      '<input type="number" id="new-dish-price" placeholder="Price" min="0" step="1" aria-label="New dish price"></div>' +
      '<button type="button" id="add-dish-btn" class="btn btn-primary">' +
      '<svg class="icon" aria-hidden="true"><use href="#icon-plus"/></svg>Add Dish</button>' +
      '</div>' +
      '</section>';
  }

  /* ============================================================
     GALLERY VIEW
     ============================================================ */
  function renderGalleryEditor() {
    var wrap = byId('gallery-editor');
    if (!wrap) return;
    var count = byId('gallery-count-admin');
    if (count) count.textContent = String(gallery.length);

    var html = gallery
      .map(function (g, i) {
        var hasSrc = /^(https?:\/\/|data:image\/|images\/)/i.test(String(g.src || '').trim());
        return (
          '<div class="g-item" data-gitem="' + i + '">' +
          '<div class="g-thumb">' + (hasSrc ? '<img src="' + esc(g.src) + '" alt="">' : '<span class="g-thumb-empty">No photo yet</span>') + '</div>' +
          '<div class="g-fields">' +
          '<div class="field"><label>Caption (shown on the photo &amp; in the lightbox)</label>' +
          '<input type="text" data-g="caption" data-i="' + i + '" value="' + esc(g.caption) + '" placeholder="e.g. Royal Mutton Biriyani"></div>' +
          '<div class="field"><label>Alt text (accessibility &amp; SEO)</label>' +
          '<input type="text" data-g="alt" data-i="' + i + '" value="' + esc(g.alt) + '" placeholder="Describe the photo"></div>' +
          '<div class="field"><label>Photo &mdash; paste an image link or upload</label>' +
          '<div class="g-src-row">' +
          '<input type="text" data-g="src" data-i="' + i + '" value="' + esc(g.src) + '" placeholder="https://your-hosting.com/photo.jpg">' +
          '<label class="btn btn-outline-gold btn-sm g-upload">Upload' +
          '<input type="file" accept="image/*" data-gupload="' + i + '" hidden></label>' +
          '</div>' +
          '<p class="g-hint">Uploads go to your Supabase Storage (compressed to max 1400px JPEG). Links keep full quality.</p>' +
          '</div>' +
          '</div>' +
          '<div class="g-actions">' +
          '<button type="button" class="icon-btn" data-gup="' + i + '" aria-label="Move photo up"' + (i === 0 ? ' disabled' : '') + '><svg class="icon" aria-hidden="true"><use href="#icon-arrow-up"/></svg></button>' +
          '<button type="button" class="icon-btn" data-gdown="' + i + '" aria-label="Move photo down"' + (i === gallery.length - 1 ? ' disabled' : '') + '><svg class="icon" aria-hidden="true"><use href="#icon-arrow-down"/></svg></button>' +
          '<button type="button" class="icon-btn dish-delete" data-gdelete="' + i + '" aria-label="Delete photo"><svg class="icon" aria-hidden="true"><use href="#icon-trash"/></svg></button>' +
          '</div>' +
          '</div>'
        );
      })
      .join('');

    if (!gallery.length) html = '<p class="admin-empty">No photos yet &mdash; add the first one below.</p>';

    html +=
      '<div class="g-add">' +
      '<button type="button" id="add-photo-btn" class="btn btn-primary"' + (gallery.length >= GALLERY_MAX_ITEMS ? ' disabled' : '') + '>' +
      '<svg class="icon" aria-hidden="true"><use href="#icon-camera"/></svg>Add Photo</button>' +
      '</div>';

    wrap.innerHTML = html;
  }

  function refreshThumb(itemEl, src) {
    var thumb = itemEl ? itemEl.querySelector('.g-thumb') : null;
    if (!thumb) return;
    var ok = /^(https?:\/\/|data:image\/|images\/)/i.test(String(src || '').trim());
    thumb.innerHTML = ok ? '<img src="' + esc(src) + '" alt="">' : '<span class="g-thumb-empty">No photo yet</span>';
  }

  /* Client-side compression: image file -> JPEG Blob (max ~1400px). */
  function fileToCompressedBlob(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('Could not read the file.')); };
      reader.onload = function () {
        var img = new Image();
        img.onerror = function () { reject(new Error('That file is not a valid image.')); };
        img.onload = function () {
          try {
            var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
            var w = Math.max(1, Math.round(img.width * scale));
            var h = Math.max(1, Math.round(img.height * scale));
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff'; // PNGs with transparency -> white background
            ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            canvas.toBlob(function (blob) {
              if (blob) resolve(blob);
              else reject(new Error('Could not compress that image.'));
            }, 'image/jpeg', quality);
          } catch (err) {
            reject(err);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function handleUpload(input) {
    var i = Number(input.dataset.gupload);
    var file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (!gallery[i]) return;
    if (!/^image\//.test(file.type)) {
      notify('Not an image', 'Please choose an image file (JPG, PNG, WebP...).', 'error');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      notify('Photo too large', 'Please choose an image smaller than 15 MB.', 'error');
      return;
    }
    notify('Uploading\u2026', 'Compressing and uploading your photo.');
    fileToCompressedBlob(file, 1400, 0.8)
      .then(function (blob) { return uploadGalleryImage(blob); })
      .then(function (publicUrl) {
        gallery[i].src = publicUrl;
        var item = byId('gallery-editor').querySelector('[data-gitem="' + i + '"]');
        if (item) {
          var srcInput = item.querySelector('[data-g="src"]');
          if (srcInput) srcInput.value = publicUrl;
          refreshThumb(item, publicUrl);
        }
        markDirty();
        notify('Photo uploaded', 'Stored in Supabase. Press Save Changes to publish it.');
      })
      .catch(function (err) {
        notify('Upload failed', (err && err.message) || 'Could not upload that image.', 'error');
      });
  }

  /* ---------- Validation ---------- */
  function validateMenu() {
    var errors = [];
    menu.forEach(function (cat) {
      var label = String(cat.title).trim() || 'Untitled category';
      if (!String(cat.title).trim()) errors.push('A category is missing its title.');
      if (!cat.items.length) errors.push('"' + label + '" has no dishes.');
      cat.items.forEach(function (item) {
        if (!String(item.name).trim()) {
          errors.push('"' + label + '" has a dish without a name.');
          return;
        }
        var p = Number(item.price);
        if (!Number.isFinite(p) || p < 0) errors.push('"' + label + '" has an invalid price.');
        else if (Math.round(p) !== p) errors.push('Prices must be whole rupees - check "' + label + '".');
      });
    });
    return errors;
  }

  function validateGallery() {
    var errors = [];
    if (!gallery.length) {
      errors.push('The gallery needs at least one photo.');
      return errors;
    }
    gallery.forEach(function (g, i) {
      var src = String((g && g.src) || '').trim();
      if (!src) errors.push('Photo #' + (i + 1) + ' has no image - paste a link or upload a file.');
      else if (!/^(https?:\/\/|images\/)/i.test(src)) errors.push('Photo #' + (i + 1) + ': the link must start with http:// or https://.');
    });
    return errors;
  }

  function firstError(errors) {
    if (!errors.length) return null;
    return errors[0] + (errors.length > 1 ? ' (and ' + (errors.length - 1) + ' more issue' + (errors.length > 2 ? 's' : '') + ')' : '');
  }

  /* ---------- Actions ---------- */
  async function doSave() {
    var msg = firstError(validateMenu().concat(validateGallery()));
    if (msg) {
      notify('Cannot save yet', msg, 'error');
      return;
    }
    var btn = byId('admin-save');
    btn.disabled = true;
    var menuRes = await saveMenu(menu);
    var galleryRes = await saveGallery(gallery);
    btn.disabled = false;

    if (menuRes.ok && galleryRes.ok) {
      clearDirty();
      renderSource();
      notify('Changes saved', 'Menu and gallery are now live for every visitor.');
    } else {
      var why = (!menuRes.ok ? 'Menu: ' + menuRes.error : '') + (!menuRes.ok && !galleryRes.ok ? ' | ' : '') + (!galleryRes.ok ? 'Gallery: ' + galleryRes.error : '');
      notify('Save failed', why || 'Please try again.', 'error');
    }
  }

  async function doReset() {
    if (!window.confirm('Reset the menu AND gallery to the built-in defaults? This replaces what is currently live in Supabase.')) return;
    var menuRes = await resetMenu();
    var galleryRes = await resetGallery();
    if (!menuRes.ok || !galleryRes.ok) {
      notify('Reset failed', (menuRes.error || galleryRes.error || 'Please try again.'), 'error');
      return;
    }
    menu = loadMenu();
    gallery = loadGallery();
    currentCatIndex = 0;
    clearDirty();
    renderTabs();
    renderEditor();
    renderGalleryEditor();
    renderSource();
    notify('Everything reset', 'The default menu and gallery are live again.');
  }

  /* ---------- View switching ---------- */
  function setView(view) {
    currentView = view;
    $$('[data-view]').forEach(function (btn) {
      var active = btn.dataset.view === view;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', String(active));
    });
    byId('menu-view').hidden = view !== 'menu';
    byId('gallery-view').hidden = view !== 'gallery';
  }

  /* ---------- Init ---------- */
  async function init() {
    await authReady;
    var user = getCurrentUser();
    if (!isAdminUser(user)) {
      byId('admin-workspace').hidden = true;
      byId('admin-toolbar').hidden = true;
      byId('admin-access').hidden = false;
      notify('Access denied', 'Only the administrator can open the Admin Panel.', 'error');
      setTimeout(function () { window.location.href = 'login.html'; }, 2400);
      return;
    }

    byId('admin-user').textContent = user.name + ' \u00B7 Admin';
    byId('admin-logout').addEventListener('click', async function () {
      await logoutUser();
      window.location.href = 'index.html';
    });

    await Promise.all([fetchMenu(), fetchGallery()]);
    menu = loadMenu();
    gallery = loadGallery();
    renderTabs();
    renderEditor();
    renderGalleryEditor();
    renderSource();

    // Top-level view tabs.
    $$('[data-view]').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(btn.dataset.view); });
    });

    // Menu category tabs.
    byId('admin-tabs').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cat]');
      if (!btn) return;
      currentCatIndex = Number(btn.dataset.cat);
      renderTabs();
      renderEditor();
    });

    // Menu editor: live model updates (no re-render so typing stays smooth).
    byId('admin-editor').addEventListener('input', function (e) {
      var cat = menu[currentCatIndex];
      var target = e.target;
      if (!target || !target.dataset) return;

      if (target.dataset.meta) {
        cat[target.dataset.meta] = target.value;
        markDirty();
        return;
      }
      if (target.classList.contains('dish-name') && target.dataset.index !== undefined) {
        cat.items[Number(target.dataset.index)].name = target.value;
        markDirty();
        return;
      }
      if (target.classList.contains('dish-price') && target.dataset.index !== undefined) {
        if (target.value !== '') {
          var n = Number(target.value);
          if (Number.isFinite(n)) cat.items[Number(target.dataset.index)].price = n;
        }
        markDirty();
      }
    });

    // Menu editor: delete + add dishes.
    byId('admin-editor').addEventListener('click', function (e) {
      var del = e.target.closest('[data-delete]');
      if (del) {
        var idx = Number(del.dataset.delete);
        var item = menu[currentCatIndex].items[idx];
        var label = item ? item.name : 'this dish';
        if (window.confirm('Delete "' + label + '" from ' + menu[currentCatIndex].title + '?')) {
          menu[currentCatIndex].items.splice(idx, 1);
          markDirty();
          renderTabs();
          renderEditor();
        }
        return;
      }

      if (e.target.closest('#add-dish-btn')) {
        var nameInput = byId('new-dish-name');
        var priceInput = byId('new-dish-price');
        var name = nameInput.value.trim();
        var price = Math.round(Number(priceInput.value));

        if (name.length < 2) {
          notify('Missing name', 'Please enter a dish name (at least 2 characters).', 'error');
          nameInput.focus();
          return;
        }
        if (!Number.isFinite(price) || price < 0 || priceInput.value === '') {
          notify('Invalid price', 'Please enter a valid price in whole rupees (0 or more).', 'error');
          priceInput.focus();
          return;
        }
        menu[currentCatIndex].items.push({ name: name, price: price });
        markDirty();
        renderTabs();
        renderEditor();
        notify('Dish added', name + ' added to ' + menu[currentCatIndex].title + '. Remember to save.');
      }
    });

    // Gallery editor: live text updates.
    var gwrap = byId('gallery-editor');
    gwrap.addEventListener('input', function (e) {
      var t = e.target;
      if (t && t.dataset && t.dataset.g && t.dataset.i !== undefined) {
        var item = gallery[Number(t.dataset.i)];
        if (!item) return;
        item[t.dataset.g] = t.value;
        markDirty();
      }
    });

    // Gallery editor: file uploads + refresh thumbnail when a link is pasted.
    gwrap.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.dataset && t.dataset.gupload !== undefined) {
        handleUpload(t);
        return;
      }
      if (t && t.dataset && t.dataset.g === 'src') {
        refreshThumb(t.closest('[data-gitem]'), t.value);
      }
    });

    // Gallery editor: reorder / delete / add.
    gwrap.addEventListener('click', function (e) {
      var up = e.target.closest('[data-gup]');
      var down = e.target.closest('[data-gdown]');
      var del = e.target.closest('[data-gdelete]');
      var add = e.target.closest('#add-photo-btn');

      if (up) {
        var i = Number(up.dataset.gup);
        if (i > 0) {
          var tmp = gallery[i - 1];
          gallery[i - 1] = gallery[i];
          gallery[i] = tmp;
          markDirty();
          renderGalleryEditor();
        }
        return;
      }
      if (down) {
        var j = Number(down.dataset.gdown);
        if (j < gallery.length - 1) {
          var t2 = gallery[j + 1];
          gallery[j + 1] = gallery[j];
          gallery[j] = t2;
          markDirty();
          renderGalleryEditor();
        }
        return;
      }
      if (del) {
        var k = Number(del.dataset.gdelete);
        var g = gallery[k];
        var label = g && (g.caption || g.alt) ? g.caption || g.alt : 'this photo';
        if (window.confirm('Delete "' + label + '" from the gallery?')) {
          gallery.splice(k, 1);
          markDirty();
          renderGalleryEditor();
        }
        return;
      }
      if (add) {
        if (gallery.length >= GALLERY_MAX_ITEMS) {
          notify('Gallery is full', 'You can keep up to ' + GALLERY_MAX_ITEMS + ' photos.', 'error');
          return;
        }
        gallery.push({ src: '', alt: '', caption: '' });
        markDirty();
        renderGalleryEditor();
        var last = byId('gallery-editor').querySelector('[data-gitem="' + (gallery.length - 1) + '"]');
        if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });

    // Toolbar.
    byId('admin-save').addEventListener('click', doSave);
    byId('admin-reset').addEventListener('click', doReset);

    // Warn before leaving with unsaved changes.
    window.addEventListener('beforeunload', function (e) {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
