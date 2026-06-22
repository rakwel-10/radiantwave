// Cloudflare Pages Function — GHL entry point.
// GHL's form "On Submit" redirects here with the shared secret + the contact's
// email/first name. We validate the secret, set a signed HttpOnly session
// cookie carrying the email + first name, then send the user into the gated
// experience. The email is the tamper-proof identity used later by
// /api/complete to update GHL.
//
// Required env vars (Cloudflare Pages → Settings → Environment variables):
//   ENTRY_SECRET   — the shared secret embedded in the GHL redirect URL (?k=...)
//   COOKIE_SECRET  — random string used to sign the session cookie
import { signSession } from "../lib/session.js";

const SESSION_TTL_SEC = 2 * 60 * 60; // 2 hours

export async function onRequestGet({ request, env }) {
  try {
    const url = new URL(request.url);
    const registerUrl = new URL("/register", url).toString();

    // No/invalid secret → bounce to the "please register" page.
    if (!env.ENTRY_SECRET || (url.searchParams.get("k") || "") !== env.ENTRY_SECRET) {
      return Response.redirect(registerUrl, 302);
    }

    // Clear, specific error if the cookie-signing secret isn't configured.
    if (!env.COOKIE_SECRET) {
      return new Response("Server not configured: COOKIE_SECRET is missing on this deployment.", { status: 500 });
    }

    const email = (url.searchParams.get("email") || "").trim().toLowerCase().slice(0, 200);
    const fname = (url.searchParams.get("fname") || "").trim().slice(0, 60);

    const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
    const token = await signSession({ email, fname, exp }, env.COOKIE_SECRET);

    // Resume directly at Video 1 (the app reads ?begin=1) and pass fname for the
    // on-screen greeting (display only; the authoritative copy is in the cookie).
    const dest = new URL("/", url);
    dest.searchParams.set("begin", "1");
    if (fname) dest.searchParams.set("fname", fname);

    const headers = new Headers({ Location: dest.toString() });
    headers.append(
      "Set-Cookie",
      `rw_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SEC}`
    );
    return new Response(null, { status: 302, headers });
  } catch (err) {
    // Temporary diagnostic: surface the real error instead of a blank 500.
    return new Response("enter error: " + (err && err.message ? err.message : String(err)), { status: 500 });
  }
}
