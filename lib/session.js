// Shared signed-cookie helpers for Cloudflare Pages Functions (Workers runtime).
// A session token is `<base64url(payload)>.<base64url(HMAC-SHA256(payload))>`.
// The payload is JSON: { email, fname, exp } (exp = unix seconds).
const enc = new TextEncoder();

function b64urlEncode(bytes) {
  const arr = new Uint8Array(bytes);
  let bin = "";
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function hmac(payloadB64, secret) {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payloadB64));
  return b64urlEncode(sig);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export async function signSession(obj, secret) {
  const payload = b64urlEncode(enc.encode(JSON.stringify(obj)));
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

// Returns the decoded payload object if the signature is valid and not expired,
// otherwise null.
export async function verifySession(token, secret) {
  if (!token || !secret) return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = await hmac(payload, secret);
  if (!timingSafeEqual(sig, expected)) return null;
  let obj;
  try { obj = JSON.parse(new TextDecoder().decode(b64urlDecode(payload))); }
  catch (_) { return null; }
  if (!obj || typeof obj.exp !== "number" || obj.exp < Math.floor(Date.now() / 1000)) return null;
  return obj;
}

export function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const m = header.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
