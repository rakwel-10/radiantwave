// Cloudflare Pages Function — funnel completion → GHL update.
// Called by the frontend at the final CTA. The user's email is read from the
// SIGNED SESSION COOKIE (not the request body), so completion cannot be spoofed
// for another contact. Updates the GHL contact's custom fields + tags, then
// returns the booking URL for the frontend to redirect to.
//
// Required env vars (Cloudflare Pages → Settings → Environment variables):
//   COOKIE_SECRET            — same secret used by /enter to sign the session
//   GHL_API_TOKEN            — GHL Private Integration token (contacts read/write)
//   GHL_LOCATION_ID          — GHL location (sub-account) id
//   BOOKING_URL              — where to send the user after completion
//   GHL_CF_VIDEO_COMPLETED      — custom-field id for "video_completed"
//   GHL_CF_READY_FOR_BOOKING    — custom-field id for "ready_for_booking"
//   GHL_CF_VIDEO_COMPLETED_AT   — custom-field id for "video_completed_at"
//
// NOTE: GHL v2 (LeadConnector) endpoints + custom-field value formats can vary
// by account; verify against your account during live testing.
import { verifySession, getCookie } from "../../lib/session.js";

const GHL_BASE = "https://services.leadconnectorhq.com";
const GHL_VERSION = "2021-07-28";

export async function onRequestPost({ request, env }) {
  const session = await verifySession(getCookie(request, "rw_session"), env.COOKIE_SECRET);
  if (!session || !session.email) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const bookingUrl = env.BOOKING_URL || "";

  try {
    await updateGhlContact(session.email, env);
  } catch (err) {
    // Don't trap the user — still hand back the booking URL, but flag the miss
    // so it can be retried/alerted on.
    return json({ ok: false, error: "ghl_update_failed", detail: String(err), bookingUrl }, 200);
  }

  return json({ ok: true, bookingUrl }, 200);
}

async function updateGhlContact(email, env) {
  const headers = {
    Authorization: `Bearer ${env.GHL_API_TOKEN}`,
    Version: GHL_VERSION,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  // 1) Find the contact by email within the location.
  const lookupUrl =
    `${GHL_BASE}/contacts/?locationId=${encodeURIComponent(env.GHL_LOCATION_ID)}` +
    `&query=${encodeURIComponent(email)}&limit=20`;
  const lookup = await fetch(lookupUrl, { headers });
  if (!lookup.ok) throw new Error(`lookup ${lookup.status}`);
  const found = await lookup.json();
  const list = found.contacts || found.contact || [];
  const contact =
    list.find((c) => (c.email || "").toLowerCase() === email) || list[0];
  if (!contact || !contact.id) throw new Error("contact_not_found");

  // 2) Update custom fields + tags.
  const customFields = [
    { id: env.GHL_CF_VIDEO_COMPLETED, value: "true" },
    { id: env.GHL_CF_READY_FOR_BOOKING, value: "true" },
    { id: env.GHL_CF_VIDEO_COMPLETED_AT, value: new Date().toISOString() },
  ].filter((f) => f.id);

  const body = {
    customFields,
    tags: ["video-completed", "ready-booking"],
  };

  const upd = await fetch(`${GHL_BASE}/contacts/${contact.id}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
  if (!upd.ok) throw new Error(`update ${upd.status}`);
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
