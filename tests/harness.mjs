/* Test harness: serves the site from the repo, and answers the EZexams Worker's URL with the real Worker code
   (tools/ezexams-worker.js) running in Node, with GitHub, Gemini and the Durable Objects replaced by in-memory fakes.
   Nothing here talks to the network. */
import { createRequire } from "module";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const W = await import(path.join(ROOT, "tools/ezexams-worker.js"));

/* ---------- static server ---------- */
const TYPES = { ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
export function serve(port) {
  const srv = http.createServer((q, r) => {
    let p = decodeURIComponent(q.url.split("?")[0]).replace(/^\/EZexams/, "");
    if (p.endsWith("/")) p += "index.html";
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { r.writeHead(403); return r.end(); }
    fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(d); });
  }).listen(port);
  return { url: `http://localhost:${port}/EZexams/`, close: () => srv.close() };
}


/* ---------- fake Supabase (Auth + the progress table with Row Level Security) ---------- */
export const MAIL = "@ezexams.example.com";   /* must match MAIL in assets/ezsync.js */
export const SB_URL = "https://jyfmolrqxypufwjqexan.supabase.co", SECRET = "sb_secret_test";
export const sbs = { users: new Map(), tokens: new Map(), refresh: new Map(), links: new Map(), rows: new Map(), ttl: 3600, log: [] };
const b64 = o => Buffer.from(JSON.stringify(o)).toString("base64url");
let sbN = 0;
function mkSession(u) {
  const exp = Math.floor(Date.now() / 1000) + sbs.ttl, at = `eyJh.${b64({ sub: u.id, exp, n: ++sbN })}.sig${sbN}`, rt = "rt" + (++sbN) + Math.random().toString(36).slice(2);
  sbs.tokens.set(at, { uid: u.id, exp }); sbs.refresh.set(rt, u.id);
  return { access_token: at, token_type: "bearer", expires_in: sbs.ttl, expires_at: exp, refresh_token: rt, user: { id: u.id, email: u.email, user_metadata: u.meta } };
}
const uidOf = h => { const t = (h.authorization || h.Authorization || "").replace(/^Bearer\s+/i, ""), r = sbs.tokens.get(t); return r && r.exp > Date.now() / 1000 ? r.uid : null; };
export function supabase(method, urlStr, headers = {}, text = "") {
  const u = new URL(urlStr), p = u.pathname, q = u.searchParams; let b = {}; try { b = text ? JSON.parse(text) : {}; } catch (e) {}
  const out = (status, body) => ({ status, body: body === undefined ? "" : JSON.stringify(body) });
  sbs.log.push(method + " " + p);
  if (p === "/auth/v1/health") return out(200, { ok: true });
  if (p === "/auth/v1/signup") {
    const email = String(b.email || "").toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return out(400, { error_code: "validation_failed", msg: "Unable to validate email address: invalid format" });
    if (sbs.users.has(email)) return out(422, { error_code: "user_already_exists", msg: "User already registered" });
    if (String(b.password || "").length < 6) return out(422, { error_code: "weak_password", msg: "Password should be at least 6 characters." });
    const user = { id: crypto.randomUUID(), email, password: b.password, meta: b.data || {} }; sbs.users.set(email, user);
    return out(200, mkSession(user));
  }
  if (p === "/auth/v1/token") {
    if (q.get("grant_type") === "password") {
      const user = sbs.users.get(String(b.email || "").toLowerCase());
      return user && user.password === b.password ? out(200, mkSession(user)) : out(400, { error_code: "invalid_credentials", msg: "Invalid login credentials" });
    }
    const uid = sbs.refresh.get(b.refresh_token);
    if (!uid) return out(400, { error_code: "refresh_token_not_found", msg: "Invalid Refresh Token: Refresh Token Not Found" });
    sbs.refresh.delete(b.refresh_token);   /* a refresh token works once */
    return out(200, mkSession([...sbs.users.values()].find(x => x.id === uid)));
  }
  if (p === "/auth/v1/verify") {
    const email = sbs.links.get(b.token_hash); if (!email || b.type !== "magiclink") return out(403, { error_code: "otp_expired", msg: "Email link is invalid or has expired" });
    sbs.links.delete(b.token_hash); return out(200, mkSession(sbs.users.get(email)));
  }
  if (p === "/auth/v1/logout") { const t = (headers.authorization || "").replace(/^Bearer\s+/i, ""); sbs.tokens.delete(t); return out(204); }
  if (p === "/auth/v1/user") { const uid = uidOf(headers); const user = uid && [...sbs.users.values()].find(x => x.id === uid); return user ? out(200, { id: user.id, email: user.email }) : out(401, { msg: "invalid JWT" }); }
  if (p === "/auth/v1/admin/generate_link") {
    if (headers.apikey !== SECRET) return out(401, { msg: "not admin" });
    if (!sbs.users.has(b.email)) return out(404, { msg: "User not found" });
    const h = "hash" + (++sbN); sbs.links.set(h, b.email); return out(200, { hashed_token: h, email_otp: "123456" });
  }
  if (p === "/rest/v1/progress") {
    const uid = uidOf(headers); if (!uid) return out(401, { code: "PGRST301", message: "JWT expired" });
    if (method === "GET") {
      const key = (q.get("key") || "").replace(/^eq\./, ""), rows = [...sbs.rows.entries()].filter(([k]) => k.startsWith(uid + "|") && (!key || k === uid + "|" + key)).map(([k, v]) => ({ key: k.split("|")[1], payload: v }));
      return out(200, q.get("select") === "key" ? rows.map(r => ({ key: r.key })).slice(0, +q.get("limit") || 99) : rows.map(r => ({ payload: r.payload })).slice(0, +q.get("limit") || 99));
    }
    if (method === "POST") {
      if (b.user_id !== uid) return out(403, { code: "42501", message: "new row violates row-level security policy for table \"progress\"" });
      if (JSON.stringify(b.payload).length > 400000) return out(400, { code: "23514", message: "violates check constraint \"progress_payload_check\"" });
      sbs.rows.set(uid + "|" + b.key, b.payload); return out(201);
    }
  }
  return out(404, { msg: "no such fake route " + p });
}

/* ---------- fake Gemini ---------- */
export const calls = { gemini: 0 };
let geminiReply = () => ({ candidates: [{ content: { parts: [{ text: "[]" }] } }] });
export function setGemini(fn) { geminiReply = fn; }
globalThis.fetch = async (u, o = {}) => {
  u = String(u); const m = (o.method || "GET").toUpperCase();
  if (u.startsWith(SB_URL)) { const r = supabase(m, u, Object.fromEntries(Object.entries(o.headers || {}).map(([k, v]) => [k.toLowerCase(), v])), o.body ? String(o.body) : ""); return new Response(r.status === 204 ? null : r.body, { status: r.status, headers: { "content-type": "application/json" } }); }
  if (u.startsWith("https://generativelanguage.googleapis.com/")) {
    calls.gemini++;
    if (u.includes("/models?")) return new Response(JSON.stringify({ models: [] }), { status: 200 });
    let body = {}; try { body = JSON.parse(o.body); } catch (e) {}
    return new Response(JSON.stringify(geminiReply(body)), { status: 200, headers: { "content-type": "application/json" } });
  }
  return new Response("{}", { status: 404 });
};

/* ---------- fake Durable Objects ---------- */
class FakeNS {
  constructor(Cls, env) { this.Cls = Cls; this.env = env; this.inst = new Map(); this.mems = new Map(); }
  idFromName(n) { return n; }
  get(id) {
    if (!this.inst.has(id)) { const mem = new Map(); this.mems.set(id, mem); this.inst.set(id, new this.Cls({ storage: { get: async k => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); }, delete: async k => { mem.delete(k); } } }, this.env)); }
    const o = this.inst.get(id);
    return { fetch: (u, init) => o.fetch(new Request(u, init)) };
  }
}
export const env = { GEMINI_KEY: "k", SUPABASE_SECRET_KEY: SECRET };
env.RELAY = new FakeNS(W.GeminiRelay, env); env.GUARD = new FakeNS(W.Guard, env); env.ERRLOG = new FakeNS(W.ErrLog, env);
export const worker = (req, ip = "1.2.3.4") => { const h = new Headers(req.headers); h.set("CF-Connecting-IP", ip); return W.default.fetch(new Request(req, { headers: h }), env); };
export function resetWorker() { for (const m of [sbs.users, sbs.tokens, sbs.refresh, sbs.links, sbs.rows]) m.clear(); sbs.ttl = 3600; sbs.log = []; env.GUARD.inst.clear(); env.GUARD.mems.clear(); env.ERRLOG.inst.clear(); calls.gemini = 0; }

/* ---------- browser ---------- */
let browser = null;
export async function launch() { browser = browser || await chromium.launch(); return browser; }
export async function closeBrowser() { if (browser) await browser.close(); browser = null; }
/* a fresh browser profile ("device"); opts.ip sets the visitor IP the Worker sees */
export async function device(opts = {}) {
  const b = await launch();
  const ctx = await b.newContext(Object.assign({ serviceWorkers: "block", viewport: { width: 1100, height: 850 } }, opts.ctx || {}));
  if (!opts.tour) await ctx.addInitScript(() => { try { localStorage.setItem("eztour-v1", "1"); } catch (e) {} });
  if (opts.skipGate) await ctx.addInitScript(() => { try { sessionStorage.setItem("ezgate-skip", "1"); } catch (e) {} });
  await ctx.route(/workers\.dev/, async r => {
    const q = r.request(); const h = Object.assign({}, q.headers(), { origin: "https://si70531.github.io" });
    const res = await worker(new Request(q.url(), { method: q.method(), headers: h, body: ["GET", "HEAD"].includes(q.method()) ? undefined : q.postData() }), opts.ip || "1.2.3.4");
    r.fulfill({ status: res.status, headers: Object.fromEntries([...res.headers, ["access-control-allow-origin", "*"]]), body: await res.text() });
  });
  await ctx.route(/supabase\.co/, async r => {
    const q = r.request(), cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "GET,POST,OPTIONS", "access-control-expose-headers": "*" };
    if (q.method() === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    const res = supabase(q.method(), q.url(), q.headers(), q.postData() || "");
    r.fulfill({ status: res.status, headers: Object.assign({ "content-type": "application/json" }, cors), body: res.body });
  });
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|api\.github\.com|generativelanguage/, r => r.abort());
  const pg = await ctx.newPage(); pg.errs = [];
  pg.on("pageerror", e => pg.errs.push(e.message));
  pg.ctx = ctx;
  return pg;
}
export const typePin = async (pg, row, d) => { await pg.click(`#ezgate .eg-cells[data-row="${row}"] input`); await pg.keyboard.type(d, { delay: 15 }); };
export const settle = async (pg, ms = 1200) => { await pg.waitForNavigation({ timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(ms); };
export const gateUp = pg => pg.evaluate(() => { const g = document.getElementById("ezgate"); return !!g && !g.hidden && !g.classList.contains("out"); });

/* ---------- gate helpers: the account screens ---------- */
const flip = pg => pg.waitForTimeout(800);   /* the ticket flips between screens */
/* from the login screen: register, then set a device PIN or skip it; ends signed in on a reloaded page */
export async function signUp(pg, user, { pass = "password1", pin = null } = {}) {
  await pg.click("#egSw"); await flip(pg);
  await pg.fill("#egUser", user); await pg.fill("#egPass", pass); await pg.fill("#egPass2", pass); await pg.click("#egGo");
  await pg.waitForSelector('.eg-ticket[data-mode="setpin"]', { timeout: 10000 }); await flip(pg);
  if (pin) { await typePin(pg, 1, pin); await typePin(pg, 2, pin); } else await pg.click("#egAlt");
  await settle(pg, 1500);
}
/* from the login screen with an existing account (one that already holds progress), declining the PIN offer */
export async function signIn(pg, user, pass = "password1") {
  await pg.fill("#egUser", user); await pg.fill("#egPass", pass); await pg.click("#egGo");
  await pg.waitForSelector('.eg-ticket[data-mode="setpin"]', { timeout: 10000 }).catch(() => {});
  await flip(pg); if (await pg.locator('.eg-ticket[data-mode="setpin"]').count() && await gateUp(pg)) await pg.click("#egAlt").catch(() => {});
  await settle(pg, 1500);
}
/* an account made directly in the fake Supabase (no browser) */
export function addUser(name, pass = "password1") { const email = name + MAIL; const u = { id: crypto.randomUUID(), email, password: pass, meta: { username: name } }; sbs.users.set(email, u); return u; }
