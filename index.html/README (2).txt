================================================================
  OOPS! LIFE COOKED AGAIN - Restaurant Website
  HTML + CSS + JavaScript, backed by Supabase
================================================================

START HERE:  read SETUP.md  (5-minute Supabase setup)

FILES
-----
  index.html          Main website (menu, ordering, gallery, reservation...)
  login.html          Login portal (Sign In / Create Account)
  admin.html          Admin panel (dishes, prices & gallery photos) - admin only
  style.css           All styling
  script.js           Main site logic (menu, cart, orders, forms)
  auth.js             Supabase Auth (login / accounts / admin role)
  menu-store.js       Menu data  <-> Supabase tables menu_categories, menu_items
  gallery-store.js    Gallery    <-> Supabase table gallery_photos + Storage bucket "gallery"
  admin.js            Admin panel logic
  supabase-client.js  Creates the shared Supabase connection
  supabase-config.js  Your project URL + anon key (generated from .env)
  generate-config.js  node generate-config.js  ->  writes supabase-config.js
  schema.sql          Run once in the Supabase SQL Editor
  .env                SUPABASE_URL and SUPABASE_ANON_KEY (public anon key only!)

THE FIRST ACCOUNT CREATED BECOMES THE ADMIN - create yours before sharing the link.

EMAILS
------
  Orders, reservations and feedback are saved to Supabase AND emailed to
  sahaya25ucs114@gmail.com through FormSubmit (activate it once from the
  first email it sends). Change the address by searching "sahaya25ucs114"
  in script.js.

LOCAL IMAGES
------------
  Run download-images.bat (Windows) or sh download-images.sh (Mac/Linux)
  once to copy the dish photos into the "images" folder. Until then the
  site falls back to the online copies.
================================================================
