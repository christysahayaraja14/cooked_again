================================================================
  OOPS! LIFE COOKED AGAIN - Restaurant Website
  Pure HTML + CSS + JavaScript. No server. No database.
================================================================

FILES
-----
  index.html       Main website (menu, ordering, gallery, reservation...)
  login.html       Login portal (Sign In / Create Account)
  admin.html       Admin panel (dishes, prices & gallery photos) - admin only
  style.css        All styling (royal gold & black Art Nouveau theme)
  script.js        Main site logic (menu render, cart, orders, forms)
  auth.js          Login/accounts (shared by every page)
  menu-store.js    Menu data store (shared by every page)
  gallery-store.js Gallery photo data store (shared by every page)
  admin.js         Admin panel logic
  site-data.js     (Optional) published menu + gallery - see PUBLISHING

HOW TO USE
----------
  1. Unzip all files into one folder.
  2. Open index.html in any browser - the site works immediately.
  3. For hosting: upload the whole folder to Netlify Drop, GitHub
     Pages, Vercel, or your cPanel - no build step needed.

LOGIN PORTAL - FIRST USER BECOMES ADMIN
---------------------------------------
  * Open login.html and click "Create Account".
  * THE VERY FIRST account you create becomes the ADMIN.
  * Every account created after that is a normal user.
  * Passwords are hashed (SHA-256) before being saved - never
    stored as plain text.
  * IMPORTANT: accounts live in the browser's local storage.
    Keep your admin account private, and create it on the
    browser/device you use to manage the restaurant site.

ADMIN PANEL - DISHES, PRICES & GALLERY PHOTOS
---------------------------------------------
  1. Sign in with your admin account (you are redirected to
     admin.html automatically).
  2. "Menu & Prices" tab: pick a category (Breakfast, Lunch,
     Dinner, Desserts), edit dish names, prices, category
     titles, subtitles and notes. Add or delete dishes.
  3. "Gallery Photos" tab: for each photo you can
       - paste an image link (http/https), OR
       - click "Upload" and choose a photo from your device
         (compressed automatically - max 1400px JPEG),
       - edit the caption and the alt text,
       - reorder photos with the up/down arrows,
       - delete photos, or add new ones (up to 30).
  4. Click "Save Changes" - the site updates INSTANTLY on this
     browser.

PUBLISHING YOUR CHANGES TO ALL VISITORS
---------------------------------------
  Browser storage is private to each device, so "Save" only
  changes the site on the admin's own browser. To publish your
  edited menu AND photos to EVERYONE:
  1. In the admin panel click "Export site-data.js".
  2. A file named site-data.js downloads (it contains your menu
     and gallery, including uploaded photos).
  3. Upload it into the SAME folder as index.html on your
     hosting (replace the old file if one exists).
  4. Done - all visitors now see the new dishes, prices and
     photos.
  (An older menu-data.js file still works for the menu part;
  new exports are always named site-data.js.)

A NOTE ON PHOTO UPLOADS
-----------------------
  Uploaded photos are stored inside your browser, which has
  limited space (roughly 10-15 compressed photos). If you see a
  "gallery too large" warning, use image links instead of
  uploads, or press Export right away - the exported file
  contains the photos, so you can safely publish them.

ORDERS, RESERVATIONS & FEEDBACK EMAILS
--------------------------------------
  * All forms send to: sahaya25ucs114@gmail.com
  * Uses FormSubmit (https://formsubmit.co). The FIRST time a
    form is submitted, FormSubmit emails you an activation link -
    open that email and click it ONCE. After that every order,
    reservation and feedback arrives automatically.
  * If FormSubmit is ever unreachable, the website automatically
    opens the visitor's email app with the full message already
    written - nothing is ever lost.

CUSTOMIZING
-----------
  * Change the restaurant email: search for "sahaya25ucs114"
    in script.js and replace it.
  * Change address / phone / hours: search for the text in
    index.html.
  * Default menu (before any admin edits): edit DEFAULT_MENU at
    the top of menu-store.js.
  * Default gallery photos: edit DEFAULT_GALLERY at the top of
    gallery-store.js.
  * Colors & fonts: edit the ":root" variables at the top of
    style.css.
================================================================

LOCAL IMAGES (so the site no longer depends on medo.dev)
--------------------------------------------------------
  Images now load from the "images" folder. To download them once:
    Windows: double-click download-images.bat
    Mac/Linux: run  sh download-images.sh   in this folder
  Until the files are downloaded, the site automatically falls back to
  the original online copies, so nothing breaks.
  NOTE: the "by Medo" badge is added by Medo's hosting, not by this code.
  It will not appear when you host the folder on Netlify/Vercel/GitHub Pages/cPanel.
