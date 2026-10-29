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

/* ---------- fake GitHub (one gist) and Gemini ---------- */
export const gist = { id: "G", owner: { login: "test" }, files: {} };
/* GitHub shows at most 300 files of a gist; the rest can only be read from the raw URL */
const view = () => ({ ...gist, files: Object.fromEntries(Object.entries(gist.files).slice(0, 300)) });
export const calls = { gemini: 0, github: 0 };
let geminiReply = () => ({ candidates: [{ content: { parts: [{ text: "[]" }] } }] });
export function setGemini(fn) { geminiReply = fn; }
globalThis.fetch = async (u, o = {}) => {
  u = String(u); const m = (o.method || "GET").toUpperCase();
  if (u.startsWith("https://generativelanguage.googleapis.com/")) {
    calls.gemini++;
    if (u.includes("/models?")) return new Response(JSON.stringify({ models: [] }), { status: 200 });
    let body = {}; try { body = JSON.parse(o.body); } catch (e) {}
    return new Response(JSON.stringify(geminiReply(body)), { status: 200, headers: { "content-type": "application/json" } });
  }
  calls.github++;
  if (u.endsWith("/user")) return new Response(JSON.stringify({ login: "test" }), { status: 200, headers: { "github-authentication-token-expiration": "2099-01-01 00:00:00 UTC" } });
  if (u.includes("/gists?per_page=100")) return new Response(JSON.stringify(gist.files["ezexams-sync-codes.json"] ? [view()] : []), { status: 200 });
  if (u.endsWith("/gists") && m === "POST") { Object.assign(gist.files, JSON.parse(o.body).files); return new Response(JSON.stringify(view()), { status: 201 }); }
  if (u.startsWith("https://gist.githubusercontent.com/")) { const f = gist.files[decodeURIComponent(u.split("/raw/")[1].split("?")[0])]; return f ? new Response(f.content, { status: 200 }) : new Response("", { status: 404 }); }
  if (u.endsWith("/gists/G") && m === "GET") return new Response(JSON.stringify(view()), { status: 200 });
  if (u.endsWith("/gists/G") && m === "PATCH") { Object.assign(gist.files, JSON.parse(o.body).files); return new Response(JSON.stringify(gist), { status: 200 }); }
  return new Response("{}", { status: 404 });
};

/* ---------- fake Durable Objects ---------- */
class FakeNS {
  constructor(Cls, env) { this.Cls = Cls; this.env = env; this.inst = new Map(); }
  idFromName(n) { return n; }
  get(id) {
    if (!this.inst.has(id)) { const mem = new Map(); this.inst.set(id, new this.Cls({ storage: { get: async k => mem.get(k), put: async (k, v) => { mem.set(k, structuredClone(v)); } } }, this.env)); }
    const o = this.inst.get(id);
    return { fetch: (u, init) => o.fetch(new Request(u, init)) };
  }
}
export const env = { GITHUB_TOKEN: "t", GEMINI_KEY: "k" };
env.RELAY = new FakeNS(W.GeminiRelay, env); env.GUARD = new FakeNS(W.Guard, env); env.ERRLOG = new FakeNS(W.ErrLog, env);
export const worker = (req, ip = "1.2.3.4") => { const h = new Headers(req.headers); h.set("CF-Connecting-IP", ip); return W.default.fetch(new Request(req, { headers: h }), env); };
export function resetWorker() { gist.files = {}; env.GUARD.inst.clear(); env.ERRLOG.inst.clear(); calls.gemini = calls.github = 0; }

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
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|api\.github\.com|generativelanguage/, r => r.abort());
  const pg = await ctx.newPage(); pg.errs = [];
  pg.on("pageerror", e => pg.errs.push(e.message));
  pg.ctx = ctx;
  return pg;
}
export const typePin = async (pg, row, d) => { await pg.click(`#ezgate .eg-cells[data-row="${row}"] input`); await pg.keyboard.type(d, { delay: 15 }); };
export const settle = async (pg, ms = 1200) => { await pg.waitForNavigation({ timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(ms); };
export const gateUp = pg => pg.evaluate(() => { const g = document.getElementById("ezgate"); return !!g && !g.hidden && !g.classList.contains("out"); });
