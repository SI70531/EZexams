/* EZexams Worker (Cloudflare): keeps every secret off the website.
   1. Gemini proxy  POST /v1beta/models/<model>:generateContent  → adds the secret GEMINI_KEY and forwards to Google.
   2. Sync by code  GET  /sync?code=<4 digits (older 6-digit codes still work)>&key=<subject key>  → {updatedAt, data} or {}   (key=ping → {exists})
                    POST /sync  {code, key, payload:{updatedAt, data}}
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
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Expose-Headers": "Retry-After",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const json = (obj, status = 200, extra = {}) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json", ...extra } });
    const fail = (status, code, message, extra) => json({ error: { code: status, status: code, message } }, status, extra);

    if (req.method === "OPTIONS") return new Response(null, { status: ok ? 204 : 403, headers: cors });
    if (!ok) return fail(403, "PERMISSION_DENIED", "This service only serves " + ALLOWED.join(", "));
    const url = new URL(req.url);

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
      let code, key, payload;
      if (req.method === "GET") { code = url.searchParams.get("code"); key = url.searchParams.get("key"); }
      else if (req.method === "POST") {
        const text = await req.text();
        if (text.length > MAX_BODY) return fail(413, "TOO_BIG", "Progress file too large");
        try { ({ code, key, payload } = JSON.parse(text)); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
        if (!payload || typeof payload !== "object") return fail(400, "BAD_JSON", "Missing payload");
      } else return fail(405, "METHOD", "GET or POST only");
      code = String(code || "").trim();
      if (!/^\d{4}(\d{2})?$/.test(code)) return fail(400, "BAD_CODE", "The PIN must be 4 digits");
      if (!/^[a-z0-9-]{1,40}$/.test(String(key || ""))) return fail(400, "BAD_KEY", "Bad subject key");
      const name = (await sha(code)).slice(0, 24) + "--" + key + ".json";
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
