// Cloudflare Pages Function — access gate.
// Runs in front of every request. The experience requires a valid signed
// session cookie (set by /enter after a verified GHL registration). Requests
// without one are bounced to /register. Public paths, API routes, and static
// assets pass through untouched.
//
// NOTE: until COOKIE_SECRET is set in the Cloudflare env, every gated request
// will be redirected to /register (verifySession returns null). Set the env
// vars before relying on the gate.
import { verifySession, getCookie } from "../lib/session.js";

const PUBLIC_PATHS = new Set([
  "/enter",
  "/register", "/register.html",
  "/continue", "/continue.html",
]);

// Static assets the gate must never block (otherwise the register page itself
// couldn't load its styles, and videos/fonts would break).
const ASSET_RE = /\.(?:css|js|mjs|json|map|svg|png|jpe?g|gif|webp|ico|woff2?|ttf|mp4|webm|m3u8|ts)$/i;

export async function onRequest({ request, env, next }) {
  const { pathname } = new URL(request.url);

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/api/") ||   // API functions validate the cookie themselves
    pathname.startsWith("/assets/") ||
    pathname.startsWith("/css/") ||
    pathname.startsWith("/js/") ||
    pathname.startsWith("/videos/") ||
    ASSET_RE.test(pathname)
  ) {
    return next();
  }

  const session = await verifySession(getCookie(request, "rw_session"), env.COOKIE_SECRET);
  if (!session) {
    return Response.redirect(new URL("/register", request.url).toString(), 302);
  }
  return next();
}
