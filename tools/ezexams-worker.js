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
   Only pages from ALLOWED may use it.
   Secrets (Settings → Variables and Secrets): GEMINI_KEY, GITHUB_TOKEN; optional GIST_ID to pin the Gist.
   Deployed by .github/workflows/worker.yml with tools/wrangler.toml. Google does not offer Gemini in Hong Kong, where
   Taiwanese visitors are often served from, so the Gemini call goes through the GeminiRelay Durable Object in North America. */
const ALLOWED = ["https://si70531.github.io"];
const MAX_BODY = 1000000;
const MARK = "ezexams-sync-codes.json";
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
    const fail = (status, code, message, extra) => json({ error: { code: status, status: code, message } }, status, extra);

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
    const ip = req.headers.get("CF-Connecting-IP") || "anon";

    /* ---------- page errors ---------- */
    if (url.pathname === "/log" && req.method === "POST") {
      const text = await req.text();
      if (text.length > 4000 || !env.ERRLOG) return json({ ok: false });
      const g = await guard(env, ip, "log");
      if (g.blocked) return json({ ok: false });
      let e; try { e = JSON.parse(text); } catch (x) { return json({ ok: false }); }
      await env.ERRLOG.get(env.ERRLOG.idFromName("errors")).fetch("https://log/add", { method: "POST", body: JSON.stringify({
        msg: String(e.msg || "").slice(0, 300), src: String(e.src || "").slice(0, 200), page: String(e.page || "").slice(0, 120),
        ua: (req.headers.get("User-Agent") || "").slice(0, 120) }) });
      return json({ ok: true });
    }

    /* ---------- sign in with a PIN ---------- */
    if (url.pathname === "/login" && req.method === "POST") {
      if (!env.GITHUB_TOKEN) return fail(500, "NO_TOKEN", "The Worker has no GITHUB_TOKEN secret yet");
      let b; try { b = JSON.parse(await req.text()); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
      const code = String(b.code || "").trim(), mode = b.mode === "create" ? "create" : "join";
      if (!/^\d{4}(\d{2})?$/.test(code)) return fail(400, "BAD_CODE", "The PIN must be 4 digits");
      const g0 = await guard(env, ip, "check");
      if (g0.locked) return fail(429, "LOCKED", "Too many wrong PINs; try again later", { "Retry-After": String(g0.wait) });
      if (mode === "create" && g0.creates >= 5) return fail(429, "LOCKED", "Too many new PINs from here; try again later", { "Retry-After": String(g0.createWait) });
      const h = (await sha(code)).slice(0, 24);
      try {
        const id = await gistId(env);
        const gist = await gh(env, "/gists/" + id);
        const exists = Object.keys(gist.files || {}).some(n => n.startsWith(h + "--"));
        if (mode === "join" && !exists) { const g = await guard(env, ip, "fail"); return fail(404, "NO_SUCH_CODE", "No progress under this PIN", g.locked ? { "Retry-After": String(g.wait) } : {}); }
        if (mode === "create" && exists) { const g = await guard(env, ip, "fail"); return fail(409, "TAKEN", "This PIN is already in use", g.locked ? { "Retry-After": String(g.wait) } : {}); }
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

    /* everything below needs a valid sign-in token */
    let tokenIn = url.searchParams.get("t") || (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let bodyText = null;
    if (url.pathname === "/sync" && req.method === "POST") {
      bodyText = await req.text();
      if (bodyText.length > MAX_BODY) return fail(413, "TOO_BIG", "Progress file too large");
      try { const b = JSON.parse(bodyText); if (b && b.t) tokenIn = b.t; } catch (e) {}
    }
    const who = await verify(env, tokenIn);
    if (!who) return fail(401, "NEED_LOGIN", "Sign in with your PIN first");

    /* ---------- 1. Gemini ---------- */
    const m = url.pathname.match(/^\/v1beta\/models\/([\w.-]+):generateContent$/);
    if (m && req.method === "POST") {
      if (!env.GEMINI_KEY) return fail(500, "INTERNAL", "The Worker has no GEMINI_KEY secret yet");
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
          if (key === "ping") return json({ ok: true, exists: Object.keys(g.files || {}).some(n => n.startsWith(name.split("--")[0] + "--")) });
          const f = g.files && g.files[name];
          if (!f) return json({});
          const content = f.truncated ? await (await fetch(f.raw_url)).text() : f.content;
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

/* ---------- sign-in tokens: base64url({h, exp}).HMAC, signed with a key derived from the GitHub secret ---------- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmacKey(env) {
  const raw = new TextEncoder().encode("ezexams-session:" + (env.SESSION_SECRET || env.GITHUB_TOKEN || ""));
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
  const r = await env.GUARD.get(env.GUARD.idFromName("ip:" + ip)).fetch("https://guard/" + op, { method: "POST" });
  return r.json();
}
const FAIL_WIN = 15 * 60 * 1000, FAIL_MAX = 5, CREATE_WIN = 60 * 60 * 1000, LOG_MAX = 20;
export class Guard {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1), now = Date.now();
    const d = (await this.state.storage.get("d")) || { fails: [], creates: [], logs: [] };
    d.fails = d.fails.filter(t => now - t < FAIL_WIN); d.creates = d.creates.filter(t => now - t < CREATE_WIN); d.logs = (d.logs || []).filter(t => now - t < CREATE_WIN);
    let blocked = false;
    if (op === "fail") d.fails.push(now);
    if (op === "create") d.creates.push(now);
    if (op === "log") { if (d.logs.length >= LOG_MAX) blocked = true; else d.logs.push(now); }
    await this.state.storage.put("d", d);
    const locked = d.fails.length >= FAIL_MAX;
    const wait = locked ? Math.ceil((d.fails[d.fails.length - FAIL_MAX] + FAIL_WIN - now) / 1000) : 0;
    const createWait = d.creates.length ? Math.ceil((d.creates[0] + CREATE_WIN - now) / 1000) : 0;
    return Response.json({ locked, wait, left: Math.max(0, FAIL_MAX - d.fails.length), creates: d.creates.length, createWait, blocked });
  }
}

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
    return Response.json({ errors: list.filter(x => x.last > since).map(({ k, ...x }) => x) });
  }
}

/* ---------- health: is each secret still good? ---------- */
async function health(env) {
  const out = { checkedAt: new Date().toISOString(), github: { ok: false }, gemini: { ok: false } };
  try {
    const r = await fetch("https://api.github.com/user", { headers: { "Authorization": "Bearer " + env.GITHUB_TOKEN, "Accept": "application/vnd.github+json", "User-Agent": "ezexams-sync" } });
    out.github.ok = r.ok; out.github.status = r.status;
    const exp = r.headers.get("github-authentication-token-expiration");
    if (exp) { out.github.expires = exp; out.github.daysLeft = Math.floor((Date.parse(exp.replace(" UTC", "Z").replace(" ", "T")) - Date.now()) / 864e5); }
    out.github.scopes = r.headers.get("x-oauth-scopes") || "";
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
