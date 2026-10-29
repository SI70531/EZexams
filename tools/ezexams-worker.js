/* EZexams Worker (Cloudflare): keeps every secret off the website.
   1. Gemini proxy  POST /v1beta/models/<model>:generateContent  → adds the secret GEMINI_KEY and forwards to Google.
   2. Sign in       POST /login {code:<4-digit PIN (older 6-digit codes still work)>, mode:"join"|"create"} → {ok, token, exists}
      Wrong PINs are counted per visitor (IP): 5 misses in 15 minutes lock that visitor out for the rest of the window,
      and one visitor may set up at most 5 new PINs an hour. The token (HMAC-signed, 12 hours) is what everything else needs.
   3. Sync          GET  /sync?key=<subject key>&t=<token>  → {updatedAt, data} or {}
                    POST /sync  {t, key, payload:{updatedAt, data}}   (sent as text/plain, so no CORS preflight)
      The Gemini proxy also needs ?t=<token>, so the Worker URL alone is no way into the Gemini quota.
   4. /health (public): is GITHUB_TOKEN valid and when does it expire, does GEMINI_KEY work (checked daily by
      .github/workflows/health.yml).   5. POST /log {msg, src, page} (from the site) and GET /errors: recent page errors.
      Progress is stored in one private Gist of the GitHub account behind the secret GITHUB_TOKEN (gist scope).
      Each file is "<first 24 hex of SHA-256(code)>--<subject key>.json", so the codes themselves are never stored.
   6. Accounts (Supabase): the site signs people in with Supabase Auth (username + password) and keeps progress in the
      Supabase table `progress` (tools/supabase.sql). This Worker only (a) accepts a Supabase sign-in as the pass for the
      Gemini proxy (checked with Supabase's /auth/v1/user, counted per account), and (b) runs the optional per-device PIN:
        POST /pin/set   {t:<access token>, deviceId, pin}  remember a PIN for this account on this device
        POST /pin/login {uid, deviceId, pin}               right PIN → {token_hash}; the site turns it into a session
        POST /pin/clear {t, deviceId}                      forget this device's PIN
      The PIN is only ever stored as an HMAC (needs the Worker's secret), and 5 wrong tries delete it, so the device must
      use the password again. A right PIN needs SUPABASE_SECRET_KEY (a Worker secret) to ask Supabase for a one-time link.
   Only pages from ALLOWED may use it.
   Secrets (Settings → Variables and Secrets): GEMINI_KEY, GITHUB_TOKEN (old PIN sync, kept until everyone has moved to an
   account), SUPABASE_SECRET_KEY (device PINs); optional GIST_ID to pin the Gist.
   Deployed by .github/workflows/worker.yml with tools/wrangler.toml. Google does not offer Gemini in Hong Kong, where
   Taiwanese visitors are often served from, so the Gemini call goes through the GeminiRelay Durable Object in North America. */
const ALLOWED = ["https://si70531.github.io"];
/* the Supabase project; the publishable key is meant to be public (it only works together with Row Level Security) */
const SUPABASE_URL = "https://jyfmolrqxypufwjqexan.supabase.co";
const SUPABASE_KEY = "sb_publishable_YJbE5DyYa6UKsAbfsxjnWg_4VW4HVnr";
const MAX_BODY = 1000000;
const MARK = "ezexams-sync-codes.json";
/* only these Gemini models may be called through the Worker (the site's own list in assets/ezai.js, plus the
   model-list lookup), so a signed-in visitor cannot spend the key on a more expensive model */
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
/* AI calls per PIN: generous enough for heavy grading sessions, but a stranger's PIN cannot drain the key */
const AI_HOUR = 600, AI_DAY = 3000;
/* wrong PINs from everywhere together: changing IP does not give a fresh 10,000-PIN search */
const GLOBAL_FAIL_MAX = 200, GLOBAL_FAIL_WIN = 60 * 60 * 1000;
let cachedGist = null;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const ok = ALLOWED.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": ok ? origin : ALLOWED[0],
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Expose-Headers": "Retry-After",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const json = (obj, status = 200, extra = {}) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });
    const fail = (status, code, message, extra, more) => json({ error: { code: status, status: code, message, ...more } }, status, extra);

    if (req.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: cors });
    const url = new URL(req.url);

    /* ---------- public: health check and the error list ---------- */
    if (url.pathname === "/health" && req.method === "GET") return json(await health(env));
    if (url.pathname === "/errors" && req.method === "GET") {
      if (!env.ERRLOG) return json({ errors: [] });
      const r = await env.ERRLOG.get(env.ERRLOG.idFromName("errors")).fetch("https://log/list?since=" + encodeURIComponent(url.searchParams.get("since") || "0"));
      return new Response(r.body, { status: r.status, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (!ok) return fail(403, "PERMISSION_DENIED", "This service only serves " + ALLOWED.join(", "));
    /* IPv6 visitors are counted per /64 (one home or phone gets a whole /64, so rotating addresses inside it is free) */
    const rawIp = req.headers.get("CF-Connecting-IP") || "anon";
    const ip = rawIp.includes(":") ? rawIp.split(":").slice(0, 4).join(":") + "::/64" : rawIp;

    /* ---------- page errors ---------- */
    if (url.pathname === "/log" && req.method === "POST") {
      const text = await req.text();
      if (text.length > 4000 || !env.ERRLOG) return json({ ok: false });
      const g = await guard(env, ip, "log");
      if (g.blocked) return json({ ok: false });
      let e; try { e = JSON.parse(text); } catch (x) { return json({ ok: false }); }
      await env.ERRLOG.get(env.ERRLOG.idFromName("errors")).fetch("https://log/add", { method: "POST", body: JSON.stringify({
        msg: String(e.msg || "").slice(0, 300), src: String(e.src || "").slice(0, 200), page: String(e.page || "").slice(0, 120),
        ua: (req.headers.get("User-Agent") || "").slice(0, 120) }) });   /* kept inside; /errors does not show it */
      return json({ ok: true });
    }

    /* ---------- sign in with a PIN ---------- */
    if (url.pathname === "/login" && req.method === "POST") {
      if (!env.GITHUB_TOKEN) return fail(500, "NO_TOKEN", "The Worker has no GITHUB_TOKEN secret yet");
      let b; try { b = JSON.parse(await req.text()); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
      const code = String(b.code || "").trim(), mode = b.mode === "create" ? "create" : "join";
      if (!/^\d{4}(\d{2})?$/.test(code)) return fail(400, "BAD_CODE", "The PIN must be 4 digits");
      const g0 = await guard(env, ip, "check");
      const gAll = await guard(env, "*", "gcheck");
      if (mode === "join" && gAll.glocked) return fail(429, "LOCKED", "Too many wrong PINs on the site right now; try again later", { "Retry-After": String(gAll.gwait) });
      if (g0.locked) return fail(429, "LOCKED", "Too many wrong PINs; try again later", { "Retry-After": String(g0.wait) });
      if (mode === "create" && gAll.glocked) return fail(429, "LOCKED", "Too many wrong PINs on the site right now; try again later", { "Retry-After": String(gAll.gwait) });
      if (mode === "create" && g0.creates >= 5) return fail(429, "LOCKED", "Too many new PINs from here; try again later", { "Retry-After": String(g0.createWait) });
      const h = (await sha(code)).slice(0, 24);
      try {
        const id = await gistId(env);
        const gist = await gh(env, "/gists/" + id);
        const listed = Object.keys(gist.files || {}).some(n => n.startsWith(h + "--"));
        /* GitHub lists at most 300 files of a gist; past that, look the PIN's marker file up directly */
        const exists = listed || (Object.keys(gist.files || {}).length >= 300 && (await rawFile(gist, h + "--meta.json")) != null);
        /* every PIN gets a marker file, so it can still be found once the gist holds more than 300 files */
        if (mode === "join" && listed && !gist.files[h + "--meta.json"])
          await gh(env, "/gists/" + id, { method: "PATCH", body: JSON.stringify({ files: { [h + "--meta.json"]: { content: JSON.stringify({ createdAt: Date.now() }) } } }) }).catch(() => {});
        if (mode === "join" && !exists) { await guard(env, "*", "gfail"); const g = await guard(env, ip, "fail"); return fail(404, "NO_SUCH_CODE", "No progress under this PIN", g.locked ? { "Retry-After": String(g.wait) } : {}); }
        if (mode === "create" && exists) { await guard(env, "*", "gfail"); const g = await guard(env, ip, "fail"); return fail(409, "TAKEN", "This PIN is already in use", g.locked ? { "Retry-After": String(g.wait) } : {}); }
        if (mode === "create") {
          await guard(env, ip, "create");
          await gh(env, "/gists/" + id, { method: "PATCH", body: JSON.stringify({ files: { [h + "--meta.json"]: { content: JSON.stringify({ createdAt: Date.now() }) } } }) });
        }
        return json({ ok: true, exists, token: await sign(env, h) });
      } catch (e) {
        if (e.rate) return fail(429, "RATE_LIMITED", e.message, e.wait ? { "Retry-After": String(e.wait) } : {});
        if (e.status === 401) return fail(500, "BAD_TOKEN", "The Worker's GITHUB_TOKEN is invalid or expired");
        return fail(502, "GITHUB", e.message);
      }
    }

    /* ---------- device PIN sign-in: right PIN → a one-time Supabase link the site turns into a session ---------- */
    if (url.pathname === "/pin/login" && req.method === "POST") {
      let b; try { b = JSON.parse(await req.text()); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
      const uid = String(b.uid || ""), dev = String(b.deviceId || ""), pin = String(b.pin || "");
      if (!/^[0-9a-f-]{36}$/.test(uid) || !/^[0-9a-f]{32}$/.test(dev) || !/^\d{4}$/.test(pin)) return fail(400, "BAD_CODE", "Bad request");
      const g0 = await guard(env, ip, "check"), gAll = await guard(env, "*", "gcheck");
      if (gAll.glocked) return fail(429, "LOCKED", "Too many wrong PINs on the site right now; try again later", { "Retry-After": String(gAll.gwait) });
      if (g0.locked) return fail(429, "LOCKED", "Too many wrong PINs; try again later", { "Retry-After": String(g0.wait) });
      const r = await pinStore(env, uid + ":" + dev, "check", { h: await pinHash(env, uid, dev, pin) });
      if (r.state === "none") return fail(404, "NO_PIN", "This device has no PIN (any more); sign in with your password");
      if (r.state === "bad" || r.state === "gone") {
        await guard(env, "*", "gfail"); const g = await guard(env, ip, "fail");
        if (r.state === "gone") return fail(403, "PIN_LOCKED", "Too many wrong PINs: this device's PIN was removed. Sign in with your password.");
        return fail(401, "BAD_PIN", "Wrong PIN", g.locked ? { "Retry-After": String(g.wait) } : {}, { left: r.left });
      }
      if (!env.SUPABASE_SECRET_KEY) return fail(500, "NO_SECRET", "The Worker has no SUPABASE_SECRET_KEY secret yet");
      try {
        const hk = { "Content-Type": "application/json", apikey: env.SUPABASE_SECRET_KEY };
        if (/^eyJ/.test(env.SUPABASE_SECRET_KEY)) hk.Authorization = "Bearer " + env.SUPABASE_SECRET_KEY;   /* old-style service_role key */
        const lr = await fetch(SUPABASE_URL + "/auth/v1/admin/generate_link", { method: "POST", headers: hk, body: JSON.stringify({ type: "magiclink", email: r.email }) });
        const lj = await lr.json().catch(() => ({}));
        if (!lr.ok || !lj.hashed_token) return fail(502, "SUPABASE", "Supabase refused (" + lr.status + "): " + String(lj.msg || lj.message || lj.error_description || "").slice(0, 120));
        return json({ ok: true, token_hash: lj.hashed_token });
      } catch (e) { return fail(502, "SUPABASE", String(e.message || e)); }
    }

    /* everything below needs a valid sign-in token */
    let tokenIn = url.searchParams.get("t") || (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let bodyText = null;
    if ((url.pathname === "/sync" || url.pathname.startsWith("/pin/")) && req.method === "POST") {
      bodyText = await req.text();
      if (bodyText.length > MAX_BODY) return fail(413, "TOO_BIG", "Progress file too large");
      try { const b = JSON.parse(bodyText); if (b && b.t) tokenIn = b.t; } catch (e) {}
    }
    /* a Supabase sign-in (3-part JWT) or an old PIN token (2 parts); who = "u<account id>" or the PIN's 24-hex hash */
    let who = await verify(env, tokenIn), acct = null;
    if (!who) { acct = await supaUser(tokenIn); if (acct) who = "u" + acct.id.replace(/-/g, ""); }
    if (!who) return fail(401, "NEED_LOGIN", "Sign in first");

    /* ---------- device PIN: set / clear (needs an account sign-in) ---------- */
    if (url.pathname === "/pin/set" || url.pathname === "/pin/clear") {
      if (req.method !== "POST" || !acct) return fail(401, "NEED_LOGIN", "Sign in to your account first");
      let b; try { b = JSON.parse(bodyText); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
      const dev = String(b.deviceId || "");
      if (!/^[0-9a-f]{32}$/.test(dev)) return fail(400, "BAD_CODE", "Bad device id");
      if (url.pathname === "/pin/clear") { await pinStore(env, acct.id + ":" + dev, "del"); return json({ ok: true }); }
      const pin = String(b.pin || "");
      if (!/^\d{4}$/.test(pin)) return fail(400, "BAD_CODE", "The PIN must be 4 digits");
      await pinStore(env, acct.id + ":" + dev, "put", { h: await pinHash(env, acct.id, dev, pin), email: acct.email });
      return json({ ok: true });
    }

    /* ---------- 1. Gemini ---------- */
    const m = url.pathname.match(/^\/v1beta\/models\/([\w.-]+):generateContent$/);
    if (m && req.method === "POST") {
      if (!env.GEMINI_KEY) return fail(500, "INTERNAL", "The Worker has no GEMINI_KEY secret yet");
      if (!MODELS.includes(m[1])) return fail(404, "NOT_FOUND", "Model not available here: " + m[1]);   /* 404 makes the site move on to the next model */
      const q = await guard(env, "pin:" + who, "ai");
      if (q.blocked) return fail(429, "RESOURCE_EXHAUSTED", "AI limit reached for this sign-in; try again later", { "Retry-After": String(q.aiWait || 60) });
      const body = await req.text();
      if (body.length > 200000) return fail(413, "INVALID_ARGUMENT", "Request too large");
      const target = "https://generativelanguage.googleapis.com/v1beta/models/" + m[1] + ":generateContent";
      /* Google refuses Gemini to some places (e.g. Hong Kong, where Taiwanese visitors are often served from),
         so the call to Google is made from a Durable Object pinned to North America. */
      let r;
      if (env.RELAY) {
        const stub = env.RELAY.get(env.RELAY.idFromName("gemini-relay-us"), { locationHint: "enam" });
        r = await stub.fetch("https://relay/" + encodeURIComponent(target), { method: "POST", body });
      } else r = await callGemini(env, target, body);
      return new Response(r.body, { status: r.status, headers: { ...cors, "Content-Type": r.headers.get("Content-Type") || "application/json", "X-EZ-Colo": (req.cf && req.cf.colo) || "" } });
    }

    /* ---------- 2. Sync ---------- */
    if (url.pathname === "/sync") {
      if (!/^[0-9a-f]{24}$/.test(who)) return fail(403, "BAD_TOKEN", "Old PIN sync needs an old PIN sign-in (accounts sync through Supabase)");
      if (!env.GITHUB_TOKEN) return fail(500, "NO_TOKEN", "The Worker has no GITHUB_TOKEN secret yet");
      let key, payload;
      if (req.method === "GET") key = url.searchParams.get("key");
      else if (req.method === "POST") {
        try { ({ key, payload } = JSON.parse(bodyText)); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
        if (!payload || typeof payload !== "object") return fail(400, "BAD_JSON", "Missing payload");
      } else return fail(405, "METHOD", "GET or POST only");
      if (!/^[a-z0-9-]{1,40}$/.test(String(key || "")) || key === "meta") return fail(400, "BAD_KEY", "Bad subject key");
      const name = who + "--" + key + ".json";
      try {
        const id = await gistId(env);
        if (req.method === "GET") {
          const g = await gh(env, "/gists/" + id);
          /* ping: does this code already hold any progress? (setting up a new code vs joining one) */
          const many = Object.keys(g.files || {}).length >= 300;
          if (key === "ping") return json({ ok: true, exists: Object.keys(g.files || {}).some(n => n.startsWith(who + "--")) || (many && (await rawFile(g, who + "--meta.json")) != null) });
          const f = g.files && g.files[name];
          let content;
          if (f) content = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
          else if (many) content = await rawFile(g, name);
          if (content == null) return json({});
          return new Response(content, { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
        }
        await gh(env, "/gists/" + id, { method: "PATCH", body: JSON.stringify({ files: { [name]: { content: JSON.stringify(payload) } } }) });
        return json({ ok: true });
      } catch (e) {
        if (e.rate) return fail(429, "RATE_LIMITED", e.message, e.wait ? { "Retry-After": String(e.wait) } : {});
        if (e.status === 401) return fail(500, "BAD_TOKEN", "The Worker's GITHUB_TOKEN is invalid or expired");
        return fail(502, "GITHUB", e.message);
      }
    }
    return fail(404, "NOT_FOUND", "Unknown path");
  },
};

function callGemini(env, target, body) {
  return fetch(target, { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY }, body });
}
/* Durable Object that makes the Gemini call from North America (see wrangler.toml for the binding) */
export class GeminiRelay {
  constructor(state, env) { this.env = env; }
  async fetch(req) {
    const target = decodeURIComponent(new URL(req.url).pathname.slice(1));
    if (!target.startsWith("https://generativelanguage.googleapis.com/")) return new Response("bad target", { status: 400 });
    if (req.method === "GET") return fetch(target, { headers: { "x-goog-api-key": this.env.GEMINI_KEY } });
    return callGemini(this.env, target, await req.text());
  }
}

/* one file of a secret gist read straight from its raw URL (works for files past the 300 GitHub lists); null if absent */
async function rawFile(gist, name) {
  const owner = gist.owner && gist.owner.login;
  if (!owner) return null;
  const r = await fetch("https://gist.githubusercontent.com/" + owner + "/" + gist.id + "/raw/" + encodeURIComponent(name) + "?t=" + Date.now(), { headers: { "User-Agent": "ezexams-sync" } });
  return r.ok ? r.text() : null;
}
async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
async function gh(env, path, opt = {}) {
  const r = await fetch("https://api.github.com" + path, {
    ...opt,
    headers: { "Authorization": "Bearer " + env.GITHUB_TOKEN, "Accept": "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "ezexams-sync" },
  });
  if (r.ok) return r.json();
  let why = ""; try { why = (await r.json()).message || ""; } catch (e) {}
  const left = r.headers.get("x-ratelimit-remaining"), reset = +r.headers.get("x-ratelimit-reset") || 0;
  const rate = r.status === 429 || (r.status === 403 && (/rate limit|abuse/i.test(why) || left === "0"));
  const wait = +r.headers.get("retry-after") || (left === "0" && reset ? Math.max(1, Math.ceil(reset - Date.now() / 1000)) : 0);
  throw Object.assign(new Error(why || "GitHub HTTP " + r.status), { status: r.status, rate, wait });
}
async function gistId(env) {
  if (env.GIST_ID) return env.GIST_ID;
  if (cachedGist) return cachedGist;
  for (let page = 1; page <= 10; page++) {
    const list = await gh(env, "/gists?per_page=100&page=" + page);
    const g = list.find(x => x.files && x.files[MARK]);
    if (g) return (cachedGist = g.id);
    if (list.length < 100) break;
  }
  const g = await gh(env, "/gists", { method: "POST", body: JSON.stringify({
    public: false, description: "EZexams sync by code (do not delete)",
    files: { [MARK]: { content: JSON.stringify({ app: "EZexams", note: "Each <hash>--<key>.json holds one sync code's progress for one subject." }, null, 2) } },
  }) });
  return (cachedGist = g.id);
}

/* ---------- Supabase accounts ---------- */
/* who is behind a Supabase access token? Asked of Supabase itself (so a deleted or signed-out account stops working),
   and remembered for a minute so a grading session does not ask on every call */
const userCache = new Map();
async function supaUser(jwt) {
  if (!jwt || typeof jwt !== "string" || jwt.length > 4000 || jwt.split(".").length !== 3) return null;
  const hit = userCache.get(jwt);
  if (hit && hit.until > Date.now()) return hit.user;
  let r; try { r = await fetch(SUPABASE_URL + "/auth/v1/user", { headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + jwt } }); } catch (e) { return null; }
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  if (!u || !/^[0-9a-f-]{36}$/.test(String(u.id || ""))) return null;
  const user = { id: u.id, email: String(u.email || "") };
  if (userCache.size > 500) userCache.clear();
  userCache.set(jwt, { user, until: Date.now() + 60000 });
  return user;
}
/* a device PIN is kept only as an HMAC of account + device + PIN, made with a key only this Worker has */
async function pinHash(env, uid, dev, pin) {
  return b64u(await crypto.subtle.sign("HMAC", await hmacKey(env, "ezexams-pin:"), new TextEncoder().encode(uid + "|" + dev + "|" + pin)));
}
/* one Durable Object per account + device holds the PIN record and counts wrong tries atomically */
async function pinStore(env, name, op, body) {
  const r = await env.GUARD.get(env.GUARD.idFromName("pin:" + name)).fetch("https://guard/pin-" + op, { method: "POST", body: JSON.stringify(body || {}) });
  return r.json();
}

/* ---------- sign-in tokens: base64url({h, exp}).HMAC, signed with a key derived from the GitHub secret ---------- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmacKey(env, label = "ezexams-session:") {
  const raw = new TextEncoder().encode(label + (env.SESSION_SECRET || env.GITHUB_TOKEN || env.SUPABASE_SECRET_KEY || ""));
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", raw), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}
async function sign(env, h) {
  const body = b64u(new TextEncoder().encode(JSON.stringify({ h, exp: Date.now() + 12 * 3600 * 1000 })));
  return body + "." + b64u(await crypto.subtle.sign("HMAC", await hmacKey(env), new TextEncoder().encode(body)));
}
async function verify(env, t) {
  if (!t || typeof t !== "string" || t.length > 400 || !t.includes(".")) return null;
  const [body, mac] = t.split(".");
  const want = b64u(await crypto.subtle.sign("HMAC", await hmacKey(env), new TextEncoder().encode(body)));
  if (want.length !== mac.length) return null;
  let diff = 0; for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ mac.charCodeAt(i);
  if (diff) return null;
  try {
    const p = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    return p.exp > Date.now() && /^[0-9a-f]{24}$/.test(p.h) ? p.h : null;
  } catch (e) { return null; }
}

/* ---------- per-visitor counters (wrong PINs, new PINs, error reports) in a Durable Object ---------- */
async function guard(env, ip, op) {
  if (!env.GUARD) return { locked: false, creates: 0 };
  const r = await env.GUARD.get(env.GUARD.idFromName(ip === "*" ? "global" : ip.startsWith("pin:") ? ip : "ip:" + ip)).fetch("https://guard/" + op, { method: "POST" });
  return r.json();
}
const PIN_TRIES = 5;   /* wrong tries on one device before its PIN is removed */
const FAIL_WIN = 15 * 60 * 1000, FAIL_MAX = 5, CREATE_WIN = 60 * 60 * 1000, LOG_MAX = 20;
export class Guard {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1), now = Date.now();
    if (op.startsWith("pin-")) return this.pin(op, req);
    const d = (await this.state.storage.get("d")) || { fails: [], creates: [], logs: [] };
    d.fails = d.fails.filter(t => now - t < FAIL_WIN); d.creates = d.creates.filter(t => now - t < CREATE_WIN); d.logs = (d.logs || []).filter(t => now - t < CREATE_WIN);
    d.gfails = (d.gfails || []).filter(t => now - t < GLOBAL_FAIL_WIN);
    /* AI calls per PIN: a running count per hour and per day (counts, not timestamps, to stay small) */
    const hr = Math.floor(now / 3600000), day = Math.floor(now / 86400000);
    if (!d.ai || d.ai.hr !== hr) d.ai = { hr, n: 0, day: d.ai && d.ai.day === day ? d.ai.day : day, dn: d.ai && d.ai.day === day ? d.ai.dn : 0 };
    if (d.ai.day !== day) { d.ai.day = day; d.ai.dn = 0; }
    let blocked = false, aiWait = 0;
    if (op === "gfail") d.gfails.push(now);
    if (op === "ai") {
      if (d.ai.n >= AI_HOUR) { blocked = true; aiWait = Math.ceil(((hr + 1) * 3600000 - now) / 1000); }
      else if (d.ai.dn >= AI_DAY) { blocked = true; aiWait = Math.ceil(((day + 1) * 86400000 - now) / 1000); }
      else { d.ai.n++; d.ai.dn++; }
    }
    if (op === "fail") d.fails.push(now);
    if (op === "create") d.creates.push(now);
    if (op === "log") { if (d.logs.length >= LOG_MAX) blocked = true; else d.logs.push(now); }
    await this.state.storage.put("d", d);
    const locked = d.fails.length >= FAIL_MAX;
    const wait = locked ? Math.ceil((d.fails[d.fails.length - FAIL_MAX] + FAIL_WIN - now) / 1000) : 0;
    const createWait = d.creates.length ? Math.ceil((d.creates[0] + CREATE_WIN - now) / 1000) : 0;
    const glocked = d.gfails.length >= GLOBAL_FAIL_MAX;
    const gwait = glocked ? Math.ceil((d.gfails[d.gfails.length - GLOBAL_FAIL_MAX] + GLOBAL_FAIL_WIN - now) / 1000) : 0;
    return Response.json({ glocked, gwait, aiWait, locked, wait, left: Math.max(0, FAIL_MAX - d.fails.length), creates: d.creates.length, createWait, blocked });
  }
}

/* the device-PIN record (see pinStore): {h, email, fails}. Five wrong tries delete it. */
Guard.prototype.pin = async function (op, req) {
  const b = await req.json().catch(() => ({})), st = this.state.storage;
  if (op === "pin-put") { await st.put("pin", { h: String(b.h || ""), email: String(b.email || ""), fails: 0 }); return Response.json({ ok: true }); }
  if (op === "pin-del") { await st.delete("pin"); return Response.json({ ok: true }); }
  const rec = await st.get("pin");
  if (!rec) return Response.json({ state: "none" });
  const a = String(rec.h), c = String(b.h || "");
  let diff = a.length ^ c.length; for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ c.charCodeAt(i);
  if (!diff) { if (rec.fails) { rec.fails = 0; await st.put("pin", rec); } return Response.json({ state: "ok", email: rec.email }); }
  rec.fails = (rec.fails || 0) + 1;
  if (rec.fails >= PIN_TRIES) { await st.delete("pin"); return Response.json({ state: "gone" }); }
  await st.put("pin", rec);
  return Response.json({ state: "bad", left: PIN_TRIES - rec.fails });
};

/* ---------- recent page errors (one Durable Object keeps the last 300, merged by message + place) ---------- */
export class ErrLog {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const u = new URL(req.url);
    const list = (await this.state.storage.get("list")) || [];
    if (u.pathname === "/add") {
      const e = await req.json(), k = e.msg + "|" + e.src;
      const hit = list.find(x => x.k === k);
      if (hit) { hit.n++; hit.last = Date.now(); hit.page = e.page; }
      else list.push({ k, msg: e.msg, src: e.src, page: e.page, ua: e.ua, n: 1, first: Date.now(), last: Date.now() });
      list.sort((a, b) => b.last - a.last); list.length = Math.min(list.length, 300);
      await this.state.storage.put("list", list);
      return Response.json({ ok: true });
    }
    const since = +u.searchParams.get("since") || 0;
    return Response.json({ errors: list.filter(x => x.last > since).map(({ k, ua, ...x }) => x) });
  }
}

/* ---------- health: is each secret still good? ---------- */
async function health(env) {
  const out = { checkedAt: new Date().toISOString(), github: { ok: false }, gemini: { ok: false }, supabase: { ok: false } };
  try {
    const r = await fetch(SUPABASE_URL + "/auth/v1/health", { headers: { apikey: SUPABASE_KEY } });
    out.supabase.ok = r.ok; out.supabase.status = r.status; out.supabase.secret = !!env.SUPABASE_SECRET_KEY;   /* is the device-PIN secret set? (never its value) */
  } catch (e) { out.supabase.error = String(e.message || e); }
  try {
    const r = await fetch("https://api.github.com/user", { headers: { "Authorization": "Bearer " + env.GITHUB_TOKEN, "Accept": "application/vnd.github+json", "User-Agent": "ezexams-sync" } });
    out.github.ok = r.ok; out.github.status = r.status;
    const exp = r.headers.get("github-authentication-token-expiration");
    if (exp) { out.github.expires = exp; out.github.daysLeft = Math.floor((Date.parse(exp.replace(" UTC", "Z").replace(" ", "T")) - Date.now()) / 864e5); }
    /* scopes are not reported: /health is public */
  } catch (e) { out.github.error = String(e.message || e); }
  try {
    const target = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";
    let r;
    if (env.RELAY) r = await env.RELAY.get(env.RELAY.idFromName("gemini-relay-us"), { locationHint: "enam" }).fetch("https://relay/" + encodeURIComponent(target), { method: "GET" });
    else r = await fetch(target, { headers: { "x-goog-api-key": env.GEMINI_KEY } });
    out.gemini.ok = r.ok; out.gemini.status = r.status;
  } catch (e) { out.gemini.error = String(e.message || e); }
  return out;
}
