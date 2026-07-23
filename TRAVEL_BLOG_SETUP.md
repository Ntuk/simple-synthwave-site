# Travel blog setup

The blog is a React frontend (in `src/`) plus a small PHP + MySQL API (in `api/`).
Photos are stored in an `uploads/` folder on the server, trip data in MySQL.

## Routes

- `/travels` — grid of trip cards
- `/travels/:slug` — single trip: story + photo gallery + month/year
- `/admin` — password login, then add/delete trips

Reachable from the home page via the **Travels** nav link and the terminal `travels` command.

## One-time Hostinger setup

1. **Create the database.** hPanel → Databases → MySQL Databases. Create a DB and user,
   note the DB name, user, password, and host (usually `localhost`).
2. **Create the tables.** hPanel → phpMyAdmin → select the DB → SQL tab → paste and run
   the contents of `api/schema.sql`.
3. **Make your admin password hash.** On your machine (PHP installed):
   ```
   php -r "echo password_hash('your-chosen-password', PASSWORD_DEFAULT), PHP_EOL;"
   ```
4. **Create `api/config.php`.** Copy `api/config.example.php` to `api/config.php` and fill in
   the DB credentials and the password hash. This file is gitignored — never commit it.

## Deploying (manual FTP / File Manager)

Your `public_html` on the server should look like:

```
public_html/
  index.html          <- from dist/
  assets/             <- from dist/
  .htaccess           <- from dist/ (SPA routing)
  favicon.ico
  api/                <- the whole api/ folder, incl. your real config.php
  uploads/            <- created automatically on first upload (writable)
```

Steps:

1. `pnpm build` locally.
2. Upload everything inside `dist/` to `public_html/` (including the hidden `.htaccess`).
3. Upload the `api/` folder to `public_html/api/`, and make sure `api/config.php` exists
   there with real values.
4. Make sure `public_html/uploads/` exists and is writable (the API tries to create it;
   if it can't, create it manually and set permissions to 755).

## Local development

The frontend runs with Vite; the API needs PHP + MySQL.

- Frontend only (no live data): `pnpm dev`. The travels page will show "could not load trips"
  until the API is running, which is fine for styling work.
- Full stack: create `api/config.php` pointing at a local MySQL, then from the project root run:
  ```
  php -S localhost:8000
  ```
  Vite proxies `/api` and `/uploads` to it (see `vite.config.ts`).

## Security notes

- Admin is a single password, hashed with `password_hash` and checked server-side. Sessions
  are used for the logged-in state.
- Uploads are validated by real MIME type (jpg/png/webp only) and capped at 8 MB each.
- `config.php` and `schema.sql` are blocked from direct web access by `api/.htaccess`.
