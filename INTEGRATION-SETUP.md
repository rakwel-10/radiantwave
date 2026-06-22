# GHL ↔ Experience Integration — Setup Guide

This site gates the video experience to **registered GoHighLevel (GHL) contacts**, marks the
contact **video-completed / ready-to-book** at the final CTA, preserves **affiliate
attribution**, and never exposes the GHL API key to the browser. It runs on **Cloudflare Pages
+ Pages Functions**.

> The frontend never calls GHL directly: `Browser → Cloudflare Function → GHL API`.

## How it works
1. GHL registration form submits → GHL creates/updates the contact (affiliate stored on it).
2. GHL **On-Submit → Redirect** sends the user to `/enter?k=…&email=…&fname=…`.
3. `/enter` validates the secret, sets a **signed HttpOnly cookie** (`rw_session`) holding the
   email + first name, and forwards to `/?begin=1&fname=…`.
4. `functions/_middleware.js` gates every page — no valid cookie → `/register`.
5. The user finishes Video 3 and clicks the final CTA → the page POSTs `/api/complete`.
6. `/api/complete` reads the email **from the cookie**, updates the GHL contact, and returns the
   **booking URL**; the page redirects there.

## 1) Deploy on Cloudflare Pages
- Create a Pages project from the `rakwel-10/radiantwave` repo.
- **Build command:** `rm -rf dist && mkdir -p dist && cp -R wwwroot/. dist/ && cp -R videos dist/videos`
- **Build output directory:** `dist`
- Cloudflare auto-detects the root-level **`functions/`** directory (and bundles `lib/`).
- Point your **GoDaddy domain** at the Pages project.

## 2) Environment variables (Pages → Settings → Environment variables)
| Variable | What it is |
|---|---|
| `ENTRY_SECRET` | Random secret you embed in the GHL redirect (`?k=…`). Long & random. |
| `COOKIE_SECRET` | Random string used to sign the session cookie. Long & random. |
| `BOOKING_URL` | Where to send users after completion (your GHL booking/calendar page). |
| `GHL_API_TOKEN` | GHL **Private Integration** token (contacts read/write). |
| `GHL_LOCATION_ID` | Your GHL location (sub-account) ID. |
| `GHL_CF_VIDEO_COMPLETED` | Custom-field **key** for `video_completed` (e.g. `video_completed`). |
| `GHL_CF_READY_FOR_BOOKING` | Custom-field **key** for `ready_for_booking`. |
| `GHL_CF_VIDEO_COMPLETED_AT` | Custom-field **key** for `video_completed_at`. |

Generate secrets with e.g. `openssl rand -hex 32` (or any long random string).

## 3) GoHighLevel setup
1. **Custom fields** (Settings → Custom Fields) — create each as **Text**, and note each field's
   **Unique Key** (the value shown in the GHL UI, e.g. `video_completed`):
   - `video_completed`, `ready_for_booking`, `affiliate_name`, `video_completed_at`.
2. **Private Integration token** (Settings → Private Integrations): create with **contacts
   read/write**; copy the token. Note your **Location ID** (Settings → Business profile / URL).
3. **Affiliate capture:** in the registration form, add a **hidden field** bound to
   `affiliate_name` with **query key `affiliate`**. Then affiliate links like
   `https://register.<domain>?affiliate=jane_doe` auto-store the affiliate on the contact.
4. **Form On-Submit → Redirect to URL:**
   `https://<your-site>/enter?k=ENTRY_SECRET&email={{contact.email}}&fname={{contact.first_name}}`
   (insert email/first-name via GHL's merge-field picker; replace `ENTRY_SECRET` with the real
   value — keep it the same as the Cloudflare env var).

## 4) Update the register page link
In `wwwroot/register.html`, replace the placeholder `https://register.example.com` with your
actual GHL registration page URL.

## Testing
- Visit the site with **no cookie** → redirected to `/register`.
- Visit `/enter?k=<secret>&email=test@example.com&fname=Test` → lands in the experience, greeted
  "Welcome, Test!"; reloading stays in.
- Tamper with the `rw_session` cookie → bounced to `/register`.
- Reach the final CTA → check the GHL contact shows `video_completed`, `ready_for_booking`,
  `video_completed_at`, tags `video-completed` / `ready-booking`; then lands on `BOOKING_URL`.
- Register via `?affiliate=jane_doe` → contact shows `affiliate_name = jane_doe`.

## Notes
- Until the env vars are set, the gate sends everyone to `/register` (expected).
- On non-Cloudflare hosts the `functions/` folder is ignored, so nothing breaks — but the gate
  and GHL update only run on Cloudflare Pages.
- **Video file protection** (Cloudflare Stream signed URLs) is a separate, later phase; videos
  currently stream from public GitHub Releases URLs.
