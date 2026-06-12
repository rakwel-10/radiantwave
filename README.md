# Radiant Wave Technologies — Interactive Video Qualification App

A premium, single-page, cinematic web application that guides prospects through a
gated video experience: **register → Video 1 → Video 2 + decision → (disqualify |
qualify) → Video 3 → redirect**. Includes a hidden admin panel for videos, timings,
copy, and funnel analytics.

Built as a self-contained **ASP.NET Core 8** app (no external NuGet packages) with a
**vanilla-JS** front end. Persistence is JSON files under `/Data`. Videos live in
`/videos`.

---

## Run it

Requires the **.NET 8 SDK** (already installed on this machine).

```powershell
cd "c:\Users\Rocky\Documents\WORK\Claude\Radiant Wave"
dotnet run -c Release
```

Then open:

| Page | URL |
|------|-----|
| Experience | http://localhost:5099/ |
| Admin panel (hidden route) | http://localhost:5099/rw-control-92x |

> The default port is whatever `ASPNETCORE_URLS` is set to (we used
> `http://localhost:5099`). Without it, .NET picks a port and prints it on startup.

### Admin login
Default password: **`radiantwave`** — change it from the **Change Password** card in
the admin panel after first sign-in.

---

## How it works

- **Single page, no reloads.** All states are `<section data-screen>` blocks toggled
  by `wwwroot/js/app.js`. Transitions play a cinematic wave-sweep + fade.
- **Background.** `wwwroot/js/waves.js` renders flowing waves + particles on a canvas.
  Atmosphere intensifies on the final video and calms on disqualification.
- **Player.** `wwwroot/js/player.js` is a custom glass HTML5 player (play/pause,
  seek/scrub, playback speed). It fires a configurable time trigger to reveal CTAs and
  option cards. It does **not** allow skipping ahead to other application states.

### Branching
- Option 1 / Option 2 → **Disqualification** end screen.
- Option 3 → **Qualification** (congrats + two valuation questions, both required) →
  Video 3 → final CTA → redirect.

---

## Configuration (all editable in the admin panel)

### Videos — `/videos/video1.mp4`, `video2.mp4`, `video3.mp4`
Replace a video by uploading a new file in **Video Manager** (or just drop a file with
the same name into `/videos`). No code changes; caching is disabled so replacements
apply immediately. Short test clips and long production videos are both supported — no
hardcoded durations.

### Timings (seconds after a video starts)
- Video 1 — show Continue button (default **5**)
- Video 2 — show option cards (default **7**)
- Video 3 — show final CTA (default **5**)

Stored in seconds, e.g. `590` = 9m 50s. Changes apply immediately to new sessions.

### GoHighLevel form
Paste the GHL embed iframe into **Settings → GoHighLevel form embed code**. The form
stays a native GHL embed (registrations keep flowing into your CRM). After submission
the experience advances **without a reload**:

- It listens for a `postMessage` from the GHL iframe (best-effort, cross-origin safe).
- A **“Begin Experience”** button is always available as a reliable fallback (works
  well with a GHL thank-you/redirect step).

Until you paste an embed, a placeholder + the Begin button let you test the full flow.

### Final redirect
**Settings → Final redirect URL** (default `https://rhema-wave-website.vercel.app/`).

### Copy
Every user-facing string is editable in **Text Controls**.

---

## Analytics
Tracked per the spec: registrations, video 1/2/3 completions, option 1/2/3 counts,
qualification completions, final CTA clicks, and valuation responses for both questions
(`$10,000 / $100,000 / $1,000,000 / Priceless`). View in the admin **Analytics** card.

---

## Project layout

```
Radiant Wave/
  Program.cs            ASP.NET Core minimal API (config, events, admin auth, uploads)
  RadiantWave.csproj
  AdminUi/admin.html    Hidden admin panel (served only at the secret route)
  wwwroot/
    index.html          The experience
    css/styles.css
    js/waves.js  js/player.js  js/app.js
  videos/               video1.mp4  video2.mp4  video3.mp4  (placeholders included)
  Data/                 config.json + events.json (auto-created; gitignore-able)
```

---

## Security notes (V1)
- Admin is password-protected (PBKDF2-hashed) with an HttpOnly session cookie (8h).
- Admin UI is served only from a non-obvious route and is not linked anywhere.
- All admin API routes require the session; analytics/config edits are rejected with
  401 otherwise. Event and config inputs are validated/whitelisted.
- For production, run behind HTTPS (the session cookie auto-marks `Secure` over HTTPS)
  and change the default admin password.

## Changing the hidden admin route
Edit `HiddenAdminRoute` in `Program.cs` (default `/rw-control-92x`) and rebuild.
