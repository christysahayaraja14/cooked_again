# Connecting the website to Supabase

The site is still plain HTML/CSS/JS (no build step). Supabase now stores the
**accounts, menu, gallery photos, orders, reservations and feedback**.

| File | What it does |
|---|---|
| `schema.sql` | Tables, security rules (RLS), admin logic, photo bucket and the default menu/gallery. Run it once. |
| `.env` | Your Supabase URL + public anon key. |
| `generate-config.js` | Turns `.env` into `supabase-config.js` (the file the browser actually loads). |
| `supabase-client.js` | Creates the Supabase connection (`window.sb`). |
| `auth.js`, `menu-store.js`, `gallery-store.js`, `script.js`, `admin.js` | Updated to read/write Supabase. |

## 1. Create the project and run the schema
1. Create a project at <https://supabase.com/dashboard>.
2. Open **SQL Editor -> New query**, paste all of `schema.sql`, press **Run**.
   (Safe to run again; it never overwrites menu edits.)

## 2. Add your keys
1. In Supabase go to **Project Settings -> API** and copy the **Project URL** and the **anon / publishable** key.
2. Put them in `.env`:
   ```
   SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   SUPABASE_ANON_KEY=eyJ...
   ```
3. Run `node generate-config.js`. It writes `supabase-config.js` and refuses a `service_role` / secret key.
   - No Node? Open `supabase-config.js` and paste the two values straight in.
   - Netlify/Vercel: set the same two variables in the dashboard, use `node generate-config.js` as the build command and `.` as the publish directory.

> Use only the **anon / publishable** key. Browser code is public, so the **service_role** key must never go in this project.
> The anon key is safe because `schema.sql` turns on Row Level Security for every table.

## 3. Auth settings (Supabase -> Authentication)
- **URL Configuration**: set *Site URL* to where the site is hosted (for local testing, e.g. `http://localhost:3000`).
- **Sign In / Providers -> Email -> Confirm email**:
  - **ON** (default): new users must click an email link before they can sign in. The site shows a "check your email" message.
  - **OFF**: users are signed in immediately. Easiest while you test.

## 4. Create the admin account FIRST
Open `login.html` -> **Create Account**. **The very first account becomes the admin**, so do this before you share the website link. Every later account is a normal user.

Promote or demote someone later (SQL Editor):
```sql
update public.profiles set role = 'admin' where email = 'person@example.com';
update public.profiles set role = 'user'  where email = 'person@example.com';
```

## 5. Run it
Serve the folder instead of double-clicking the file, e.g. `npx serve .` or the VS Code *Live Server* extension, then open `index.html`.

Quick test:
1. Sign in as admin -> **Admin Panel** -> change a price -> **Save Changes**. Reload `index.html` in a private window: the new price shows.
2. Upload a gallery photo in the admin panel, **Save Changes**. It lands in Storage bucket `gallery`.
3. Place an order, make a reservation, send feedback. Check **Table Editor -> orders / reservations / feedback**.

## How the pieces behave
- **Menu & gallery**: public to read, only the admin can change them (checked by the database, not just the page).
- **Orders**: anyone can place one. Prices and the total are **recalculated by the database** from the menu, so a tampered browser can't change them. Only the admin (and the user who placed it, if signed in) can read orders.
- **Orders / reservations / feedback are still emailed** through FormSubmit as before; a submission counts as sent if either the database save or the email works.
- If Supabase is not configured or unreachable, the site falls back to the built-in menu/gallery and email-only forms instead of breaking.
- `site-data.js` export is gone: **Save Changes** now publishes to everyone instantly.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Console says "Not configured" | `.env` still has placeholders, or you didn't run `node generate-config.js`. |
| "Access denied" on the admin page | You're not the first account. Promote yourself with the SQL above. |
| Menu stays on defaults | Run `schema.sql` (the seed data lives at the bottom). |
| "Dish ... is no longer on the menu" | The cart had a dish the admin removed/renamed. Refresh and re-add it (the order email still goes out). |
| Sign-up works but sign-in says "Email not confirmed" | Click the email link, or turn **Confirm email** off. |
| Photo upload fails | Re-run `schema.sql` (it creates the `gallery` bucket) and make sure you're signed in as admin. |
