/* EZexams Worker (Cloudflare): keeps every secret off the website.
   1. Gemini proxy  POST /v1beta/models/<model>:generateContent?t=<Supabase access token>  → adds the secret GEMINI_KEY and
      forwards to Google. The token is checked with Supabase and AI calls are counted per account.
   2. /health (public): does Supabase answer, is SUPABASE_SECRET_KEY set, does GEMINI_KEY work (checked daily by
      .github/workflows/health.yml).   3. POST /log {msg, src, page} (from the site) and GET /errors: recent page errors.
   4. Accounts (Supabase): the site signs people in with Supabase Auth (username + password) and keeps progress in the
      Supabase table `progress` (tools/supabase.sql). This Worker only (a) accepts a Supabase sign-in as the pass for the
      Gemini proxy (checked with Supabase's /auth/v1/user, counted per account), and (b) runs the optional per-device PIN:
        POST /pin/set   {t:<access token>, deviceId, pin}  remember a PIN for this account on this device
        POST /pin/login {uid, deviceId, pin}               right PIN → {token_hash}; the site turns it into a session
        POST /pin/clear {t, deviceId}                      forget this device's PIN
      The PIN is only ever stored as an HMAC (needs the Worker's secret), and 5 wrong tries delete it, so the device must
      use the password again. A right PIN needs SUPABASE_SECRET_KEY (a Worker secret) to ask Supabase for a one-time link.
   5. AI practice (chapter exercises and mock exams are made one question at a time; needs a Supabase sign-in):
        POST /gen/next   {t, subject, chapter, sec:{k,title,text}, n, total, asked:[...], retest:{q,e}, zh}   → {id, q, o, sec}
             Gemini writes ONE multiple-choice question from that section of the notes. The answer and the explanation are kept
             here (Durable Object, per account); the page only gets the question.
        POST /gen/answer {t, id, pick}                                                       → {a, e, right}  (revealed on answering)
        POST /gen/adopt {t, s, key, kind:'mc'|'w', slots:[..]}  → {items:{slot:{id,q,o,...}}}  moves questions of tools/bank.json that were
             answered before the move into this account's question store, content unchanged; the id is fixed by (account, set, slot), so every
             device gets the same one. The answer and the reference stay here (read later with /gen/answer or /gen/wgrade).
        POST /bank/open  {t, s, key, picks:{<slot>:<pick>}}   questions that were answered before the move to AI practice
             (tools/bank.json) and the past-exam answers: the answer of a slot is only returned together with the pick for it.
   Only pages from ALLOWED may use it.
   Secrets (Settings → Variables and Secrets): GEMINI_KEY, SUPABASE_SECRET_KEY (device PINs).
   Deployed by .github/workflows/worker.yml with tools/wrangler.toml. Google does not offer Gemini in Hong Kong, where
   Taiwanese visitors are often served from, so the Gemini call goes through the GeminiRelay Durable Object in North America. */
import BANK from "./bank.json";
const ALLOWED = ["https://si70531.github.io"];
/* the Supabase project; the publishable key is meant to be public (it only works together with Row Level Security) */
const SUPABASE_URL = "https://jyfmolrqxypufwjqexan.supabase.co";
const SUPABASE_KEY = "sb_publishable_YJbE5DyYa6UKsAbfsxjnWg_4VW4HVnr";
const MAX_BODY = 20000;
const GEN_MAX = 60000;          /* /gen/next carries the notes of one section */
const BANK_HOUR = 1500;         /* /gen/answer + /bank/open calls per account and hour */
/* only these Gemini models may be called through the Worker (the site's own list in assets/ezai.js, plus the
   model-list lookup), so a signed-in visitor cannot spend the key on a more expensive model */
const MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
/* AI calls per account: generous enough for heavy grading sessions, but one account cannot drain the key */
const AI_HOUR = 600, AI_DAY = 3000;
/* wrong PINs from everywhere together: changing IP does not give a fresh 10,000-PIN search */
const GLOBAL_FAIL_MAX = 200, GLOBAL_FAIL_WIN = 60 * 60 * 1000;

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
    if ((url.pathname.startsWith("/pin/") || url.pathname.startsWith("/gen/") || url.pathname.startsWith("/bank/")) && req.method === "POST") {
      bodyText = await req.text();
      if (bodyText.length > (url.pathname.startsWith("/pin/") ? MAX_BODY : GEN_MAX)) return fail(413, "TOO_BIG", "Request too large");
      try { const b = JSON.parse(bodyText); if (b && b.t) tokenIn = b.t; } catch (e) {}
    }
    /* a Supabase sign-in (3-part JWT); who = "u<account id>" */
    const acct = await supaUser(tokenIn);
    if (!acct) return fail(401, "NEED_LOGIN", "Sign in first");
    const who = "u" + acct.id.replace(/-/g, "");

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

    /* ---------- AI practice: one question at a time, answers kept here ---------- */
    if (url.pathname === "/gen/next" && req.method === "POST") return genNext(env, acct, who, bodyText, json, fail);
    if (url.pathname === "/gen/wnext" && req.method === "POST") return wgenNext(env, acct, who, bodyText, json, fail);
    if (url.pathname === "/gen/wgrade" && req.method === "POST") return wgrade(env, acct, who, bodyText, json, fail);
    if (url.pathname === "/bank/wopen" && req.method === "POST") return wbankOpen(env, who, bodyText, json, fail);
    if (url.pathname === "/gen/answer" && req.method === "POST") return genAnswer(env, acct, who, bodyText, json, fail);
    if (url.pathname === "/gen/adopt" && req.method === "POST") return genAdopt(env, acct, who, bodyText, json, fail);
    if (url.pathname === "/bank/open" && req.method === "POST") return bankOpen(env, who, bodyText, json, fail);

    /* ---------- 1. Gemini ---------- */
    const m = url.pathname.match(/^\/v1beta\/models\/([\w.-]+):generateContent$/);
    if (m && req.method === "POST") {
      if (!env.GEMINI_KEY) return fail(500, "INTERNAL", "The Worker has no GEMINI_KEY secret yet");
      if (!MODELS.includes(m[1])) return fail(404, "NOT_FOUND", "Model not available here: " + m[1]);   /* 404 makes the site move on to the next model */
      const q = await guard(env, "pin:" + who, "ai");
      if (q.blocked) return fail(429, "RESOURCE_EXHAUSTED", "Limit reached for this sign-in; try again later", { "Retry-After": String(q.aiWait || 60) });
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

/* ---------- device-PIN key: an HMAC key derived from a Worker secret ---------- */
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
async function hmacKey(env, label) {
  const raw = new TextEncoder().encode(label + (env.SESSION_SECRET || env.SUPABASE_SECRET_KEY || ""));
  return crypto.subtle.importKey("raw", await crypto.subtle.digest("SHA-256", raw), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

async function guard(env, ip, op) {
  if (!env.GUARD) return { locked: false };
  const r = await env.GUARD.get(env.GUARD.idFromName(ip === "*" ? "global" : ip.startsWith("pin:") ? ip : "ip:" + ip)).fetch("https://guard/" + op, { method: "POST" });
  return r.json();
}
const PIN_TRIES = 5;   /* wrong tries on one device before its PIN is removed */
const FAIL_WIN = 15 * 60 * 1000, FAIL_MAX = 5, LOG_WIN = 60 * 60 * 1000, LOG_MAX = 20;
export class Guard {
  constructor(state) { this.state = state; }
  async fetch(req) {
    const op = new URL(req.url).pathname.slice(1), now = Date.now();
    if (op.startsWith("pin-")) return this.pin(op, req);
    if (op.startsWith("gen-")) return this.gen(op, req);
    const d = (await this.state.storage.get("d")) || { fails: [], logs: [] };
    d.fails = d.fails.filter(t => now - t < FAIL_WIN); d.logs = (d.logs || []).filter(t => now - t < LOG_WIN);
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
    if (op === "bank") {
      if (!d.bk || d.bk.hr !== hr) d.bk = { hr, n: 0 };
      if (d.bk.n >= BANK_HOUR) { blocked = true; aiWait = Math.ceil(((hr + 1) * 3600000 - now) / 1000); } else d.bk.n++;
    }
    if (op === "fail") d.fails.push(now);
    if (op === "log") { if (d.logs.length >= LOG_MAX) blocked = true; else d.logs.push(now); }
    await this.state.storage.put("d", d);
    const locked = d.fails.length >= FAIL_MAX;
    const wait = locked ? Math.ceil((d.fails[d.fails.length - FAIL_MAX] + FAIL_WIN - now) / 1000) : 0;
    const glocked = d.gfails.length >= GLOBAL_FAIL_MAX;
    const gwait = glocked ? Math.ceil((d.gfails[d.gfails.length - GLOBAL_FAIL_MAX] + GLOBAL_FAIL_WIN - now) / 1000) : 0;
    return Response.json({ glocked, gwait, aiWait, locked, wait, left: Math.max(0, FAIL_MAX - d.fails.length), blocked });
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

/* ---------- AI practice (see the header, part 5) ---------- */
const clip = (v, n) => String(v == null ? "" : v).slice(0, n);
/* the questions of one account live in one Durable Object ("gen:<account id>"): id → {q, o, a, e, ...} */
async function genStore(env, uid, op, body) {
  const r = await env.GUARD.get(env.GUARD.idFromName("gen:" + uid)).fetch("https://guard/gen-" + op, { method: "POST", body: JSON.stringify(body || {}) });
  return r.json();
}
Guard.prototype.gen = async function (op, req) {
  const b = await req.json().catch(() => ({})), st = this.state.storage;
  if (op === "gen-put") {
    await st.put("g:" + b.id, b.rec);
    const all = await st.list({ prefix: "g:" });
    if (all.size > 2600) {   /* an account keeps its latest ~2500 questions */
      const old = [...all.entries()].sort((x, y) => (x[1].at || 0) - (y[1].at || 0)).slice(0, all.size - 2500);
      for (const [k] of old) await st.delete(k);
    }
    return Response.json({ ok: true });
  }
  if (op === "gen-putmany") {
    for (const it of (Array.isArray(b.items) ? b.items : [])) await st.put("g:" + it.id, it.rec);
    const all = await st.list({ prefix: "g:" });
    if (all.size > 2600) {
      const old = [...all.entries()].sort((x, y) => (x[1].at || 0) - (y[1].at || 0)).slice(0, all.size - 2500);
      for (const [k] of old) await st.delete(k);
    }
    return Response.json({ ok: true });
  }
  if (op === "gen-get") return Response.json({ rec: (await st.get("g:" + String(b.id))) || null });
  return Response.json({ ok: false });
};
const rnd = n => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n; };
function permutation(n) { const a = [...Array(n).keys()]; for (let i = n - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/* the JSON in a Gemini reply, even when it comes wrapped in a code fence or has trailing commas */
function parseJson(text) {
  let t = String(text || "").replace(/^﻿/, "").trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (fence) t = fence[1].trim();
  const tries = [t], a = t.indexOf("{"), z = t.lastIndexOf("}");
  if (a >= 0 && z > a) tries.push(t.slice(a, z + 1));
  for (const x of tries.slice()) tries.push(x.replace(/[“”]/g, '"').replace(/,\s*([\]}])/g, "$1"));
  for (const x of tries) { try { return JSON.parse(x); } catch (e) {} }
  return null;
}
/* one Gemini call that moves on to the next model when one is overloaded, over quota or retired */
async function geminiJson(env, prompt, temperature, attempt) {
  const body = JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature, responseMimeType: "application/json" } });
  let last = { status: 502 };
  for (let k = 0; k < MODELS.length; k++) {
    const model = MODELS[(attempt + k) % MODELS.length];
    const target = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent";
    let r;
    try {
      r = env.RELAY ? await env.RELAY.get(env.RELAY.idFromName("gemini-relay-us"), { locationHint: "enam" }).fetch("https://relay/" + encodeURIComponent(target), { method: "POST", body })
                    : await callGemini(env, target, body);
    } catch (e) { last = { status: 502 }; continue; }
    if (!r.ok) { if (r.status !== 404 || last.status === 502) last = { status: r.status }; if ([404, 429, 500, 502, 503, 504].includes(r.status)) continue; return { error: last }; }   /* a retired model (404) must not hide the 429 / 503 the others gave */
    const j = await r.json().catch(() => null), c = j && j.candidates && j.candidates[0];
    const text = c && c.content && Array.isArray(c.content.parts) ? c.content.parts.filter(p => !p.thought).map(p => p.text || "").join("") : "";
    if (text.trim()) return { text };
    last = { status: 502 };
  }
  return { error: last };
}
function DS(subject) { return /Data (and File )?Structures/i.test(String(subject || "")); }
function mcPrompt(b) {
  return [
"You are writing ONE multiple-choice question for a university exam. Course: " + b.subject + ". Chapter: " + b.chapter + ".",
"Base the question ONLY on the COURSE NOTES at the end (the section the student is studying). Use nothing the notes do not support.",
(DS(b.subject)
  ? "Difficulty: exactly like the 2024 and 2025 past-exam multiple-choice questions of this course. Each question tests ONE fact or simple rule from the notes and can be answered in under a minute. Short, plain questions and short options, for example 'What is a precondition for using a binary search?' or 'Which statement is NOT correct?'. Do not combine two ideas and do not write multi-step scenarios or long traces."
  : "Make it a good exam question with some depth:"),
(DS(b.subject) ? "" : "- Prefer application and reasoning (a short scenario, a small calculation, a comparison, 'which statement is correct') over repeating a definition word for word; it may combine two ideas of the section."),
"- Exactly four options and exactly one correct option. The wrong options must be tempting: each one should match a real misconception or a near-miss. No 'all of the above', 'none of the above' or 'both A and B'.",
"- Do not give the answer away: the options are similar in length and style, and the question itself does not contain the answer.",
"- The question and the options are in English (exam style, plain and precise). Never write 'the notes', 'the slides' or 'the lecture' inside the question.",
"- e = the explanation, in Traditional Chinese (Taiwan) with technical terms kept in English: why the correct option is right and why each wrong option is wrong, 3-6 sentences. NEVER refer to an option by its letter or position (no 'option A', '(B)', '第二個'): name it by its content.",
b.zh ? "- Also give qz (the question in Traditional Chinese) and oz (the four options in Traditional Chinese, in the same order as o)." : "",
"This is question " + b.n + " of " + b.total + " in this set.",
b.asked.length ? "Already asked in this set (do NOT repeat these ideas or numbers; test something different):\n- " + b.asked.join("\n- ") : "",
b.retest ? "The student answered the following question WRONG earlier. Write a NEW question on the same underlying concept, from a different angle or with a different situation and different numbers (do not reuse the wording):\nQUESTION: " + b.retest.q + "\nEXPLANATION: " + b.retest.e : "",
"Reply with ONLY a JSON object: {\"q\":\"...\",\"o\":[\"...\",\"...\",\"...\",\"...\"],\"a\":<index 0-3 of the correct option>,\"e\":\"...\"" + (b.zh ? ",\"qz\":\"...\",\"oz\":[\"...\",\"...\",\"...\",\"...\"]" : "") + "}",
"",
"COURSE NOTES - " + b.sec.title + ":",
b.sec.text,
  ].filter(x => x !== "").join("\n");
}
/* is this a usable question? returns the cleaned object or null */
const LETTER_REF = /\b(?:option|choice|answer)\s*\(?[A-D]\)?(?![A-Za-z])|\([A-D]\)|選項\s*\(?[A-D]\)?(?![A-Za-z])|第[一二三四]個選項/i;
function cleanMc(o, zh) {
  if (!o || typeof o !== "object") return null;
  const q = clip(o.q, 1200).trim(), e = clip(o.e, 3000).trim(), a = o.a;
  if (q.length < 20 || e.length < 12 || !Array.isArray(o.o) || o.o.length !== 4 || !Number.isInteger(a) || a < 0 || a > 3) return null;
  const opts = o.o.map(x => clip(x, 400).trim());
  if (opts.some(x => !x) || new Set(opts.map(x => x.toLowerCase())).size !== 4) return null;
  if (opts.some(x => /^(all|none) of the above|^both .* and /i.test(x))) return null;
  if (/according to the (course )?(notes|slides|lecture)|\bthe (notes|slides)\b/i.test(q)) return null;
  if (LETTER_REF.test(e)) return null;
  const out = { q, o: opts, a, e };
  if (zh) {
    const qz = clip(o.qz, 1200).trim(), oz = Array.isArray(o.oz) ? o.oz.map(x => clip(x, 400).trim()) : [];
    if (!qz || oz.length !== 4 || oz.some(x => !x)) return null;
    out.qz = qz; out.oz = oz;
  }
  return out;
}
async function genNext(env, acct, who, bodyText, json, fail) {
  if (!env.GEMINI_KEY) return fail(500, "INTERNAL", "The Worker has no GEMINI_KEY secret yet");
  if (!env.GUARD) return fail(500, "INTERNAL", "The Worker has no GUARD binding");
  let r; try { r = JSON.parse(bodyText); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
  const sec = r && r.sec || {};
  const b = {
    subject: clip(r.subject, 80), chapter: clip(r.chapter, 120), zh: !!r.zh,
    n: Math.max(1, Math.min(500, parseInt(r.n, 10) || 1)), total: Math.max(1, Math.min(500, parseInt(r.total, 10) || 1)),
    sec: { k: clip(sec.k, 40), title: clip(sec.title, 160), text: clip(sec.text, 9000) },
    asked: (Array.isArray(r.asked) ? r.asked : []).slice(-80).map(x => clip(x, 160)).filter(Boolean),
    retest: r.retest && r.retest.q ? { q: clip(r.retest.q, 900), e: clip(r.retest.e, 1200) } : null,
  };
  if (!b.subject || !b.sec.text) return fail(400, "BAD_CODE", "Missing subject or notes");
  const q = await guard(env, "pin:" + who, "ai");
  if (q.blocked) return fail(429, "RESOURCE_EXHAUSTED", "Limit reached for this sign-in; try again later", { "Retry-After": String(q.aiWait || 60) });
  let made = null, err = null;
  for (let attempt = 0; attempt < 4 && !made; attempt++) {
    const g = await geminiJson(env, mcPrompt(b), attempt ? 0.5 : 0.8, attempt);
    if (g.error) { err = g.error; if (![404, 429, 500, 502, 503, 504].includes(g.error.status)) break; continue; }
    made = cleanMc(parseJson(g.text), b.zh);
    if (!made) err = { status: 502, bad: true };
  }
  if (!made) {
    if (err && err.status === 429) return fail(429, "RESOURCE_EXHAUSTED", "Can't be used right now", { "Retry-After": "60" });
    return fail(502, "GEN_FAILED", "No usable question was produced (" + (err && err.status || "?") + "); try again");
  }
  /* shuffle the options here, so the page never sees the order the AI wrote them in */
  const p = permutation(4), o = p.map(i => made.o[i]), a = p.indexOf(made.a);
  const rec = { q: made.q, o, a, e: made.e, sec: b.sec.k, at: Date.now() };
  if (b.zh) { rec.qz = made.qz; rec.oz = p.map(i => made.oz[i]); }
  const id = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join("");
  await genStore(env, acct.id, "put", { id, rec });
  const out = { id, q: rec.q, o: rec.o, sec: rec.sec };
  if (b.zh) { out.qz = rec.qz; out.oz = rec.oz; }
  return json(out);
}
async function genAnswer(env, acct, who, bodyText, json, fail) {
  let r; try { r = JSON.parse(bodyText); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
  const id = String(r.id || ""), pick = r.pick;
  if (!/^[0-9a-f]{32}$/.test(id) || !Number.isInteger(pick) || pick < 0 || pick > 3) return fail(400, "BAD_CODE", "Bad request");
  const g = await guard(env, "pin:" + who, "bank");
  if (g.blocked) return fail(429, "RESOURCE_EXHAUSTED", "Too many requests; try again later", { "Retry-After": String(g.aiWait || 60) });
  const { rec } = await genStore(env, acct.id, "get", { id });
  if (!rec) return fail(404, "GONE", "This question is no longer kept on the server");
  const out = { ok: true, a: rec.a, e: rec.e, right: pick === rec.a };
  return json(out);
}
/* move bank questions into the account's own store (same question, same answer), so they behave like every other question:
   a fixed id, the question travels with the progress, and the answer is read with /gen/answer or /gen/wgrade.
   The id comes from (account, set, slot), so two devices adopting the same slot get the same id and nothing doubles. */
async function adoptId(uid, s, key, slot) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode([uid, s, key, slot].join("|")));
  return [...new Uint8Array(d)].slice(0, 16).map(x => x.toString(16).padStart(2, "0")).join("");
}
async function genAdopt(env, acct, who, bodyText, json, fail) {
  if (!env.GUARD) return fail(500, "INTERNAL", "The Worker has no GUARD binding");
  let r; try { r = JSON.parse(bodyText); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
  const kind = r.kind === "w" ? "w" : "mc", s = String(r.s || ""), key = String(r.key || ""), setKey = kind === "w" ? "w:" + key : key;
  const set = BANK[s] && BANK[s][setKey];
  if (!set) return fail(404, "NOT_FOUND", "Unknown question set");
  const g = await guard(env, "pin:" + who, "bank");
  if (g.blocked) return fail(429, "RESOURCE_EXHAUSTED", "Too many requests; try again later", { "Retry-After": String(g.aiWait || 60) });
  const items = {}, put = [], at = Date.now();
  for (const k of (Array.isArray(r.slots) ? r.slots : []).slice(0, 600)) {
    const i = Number(k), it = set[i];
    if (!Number.isInteger(i) || !it) continue;
    const id = await adoptId(acct.id, s, setKey, i);
    if (kind === "w") {
      put.push({ id, rec: { kind: "w", q: it.q, c: it.c || "", ref: it.r, p: Number(it.p) || 2, l: it.l, sec: "", at, from: "bank" } });
      items[i] = { id, q: it.q, l: it.l, p: Number(it.p) || 2 };
    } else {
      if (!Array.isArray(it.o) || typeof it.q !== "string") continue;
      put.push({ id, rec: Object.assign({}, it, { sec: "", at, from: "bank" }) });
      const out = { id, q: it.q, o: it.o };
      ["qz", "oz", "ch", "h", "fig", "hw"].forEach(f => { if (it[f] !== undefined) out[f] = it[f]; });   /* never a or e */
      items[i] = out;
    }
  }
  if (put.length) await genStore(env, acct.id, "putmany", { items: put });
  return json({ items });
}
/* questions from before AI practice (tools/bank.json), by slot. The answer of a slot is only sent with the pick for it. */
async function bankOpen(env, who, bodyText, json, fail) {
  let r; try { r = JSON.parse(bodyText); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
  const set = BANK[String(r.s || "")] && BANK[String(r.s)][String(r.key || "")];
  if (!set) return fail(404, "NOT_FOUND", "Unknown question set");
  const g = await guard(env, "pin:" + who, "bank");
  if (g.blocked) return fail(429, "RESOURCE_EXHAUSTED", "Too many requests; try again later", { "Retry-After": String(g.aiWait || 60) });
  const picks = r.picks && typeof r.picks === "object" ? r.picks : {}, items = {};
  Object.keys(picks).slice(0, 600).forEach(k => {
    const i = Number(k), it = set[i], pk = picks[k];
    if (!Number.isInteger(i) || !it || !Number.isInteger(pk) || pk < 0 || pk > 7) return;
    items[k] = it;
  });
  return json({ items });
}


/* ---------- written questions (chapter-end written parts and mock exam written parts) ----------
   /gen/wnext  {subject, chapter, sec:{k,title,text}, style, pts, label, n, total, asked} → {id, q, l, p, sec}
               the question and its reference answer are kept on the server (record kind "w")
   /gen/wgrade {id | s,key,slot} + {ans, notes} → {score, verdict, feedback, missing, answer_en, answer_zh}
               grades against the kept reference (or the bank's, for the fixed written parts) and writes a model answer
   /bank/wopen {s, key, slots:[..]} → {items:{slot:{l,q,p}}}   question text of fixed written slots, never the reference */
function wPrompt(b) {
  return [
"You are writing ONE written exam question for a university exam. Course: " + b.subject + ". Chapter: " + b.chapter + ".",
"Base the question ONLY on the COURSE NOTES at the end (the section the student is studying). Use nothing the notes do not support.",
"Question type (copy the form of the past exam, do not invent a different kind of question): " + b.style + ".",
(DS(b.subject) ? "Difficulty: exactly like the Part II and Part III fill-ins of the 2024 and 2025 past exams of this course. These take 5 to 10 minutes: they give concrete data (a key list with a table size, a list of linked nodes, a sorted list, or a code skeleton) and ask the student to complete a full table by applying the procedure step by step, or to fill in several code blanks. Every blank needs a real calculation or a correct code statement from the notes, not a single term or a one-line recall. Do not make it an open essay, and do not combine several chapters. " : "Difficulty: like the past exam of this course. It is a calculation, a table or a trace that takes a few minutes, never a one-line recall and never an open 'explain why' essay.") + " The question is worth " + b.pts + " points: scale the number of blanks or parts to that.",
"If the question has several parts or blanks, label them (a), (b), (c) ... and keep their order.",
"Write it in English, exam style, plain and precise. Never write 'the notes', 'the slides' or 'the lecture' inside the question.",
"Plain text only: no Markdown. Do not use backticks and do not use pipe tables (|). For a table, write each row on its own line as 'Step: value' pairs, and use plain words for code (for example: target less than list[last]).",
"Do not give the answer away in the question. For a fill-in style use one or two blanks written as ______.",
"ref must give the answer to EVERY blank or part, in the same order (for example \"(a) 4 (b) 11\"), short, based only on the notes. It is kept secret and used for grading.",
"Reply with ONLY a JSON object: {\"q\":\"...\",\"ref\":\"...\"}",
b.asked.length ? "Already asked in this set (do NOT repeat these ideas): \n- " + b.asked.join("\n- ") : "",
"This is question " + b.n + " of " + b.total + " in this set.",
"",
"COURSE NOTES (" + b.sec.title + "):",
b.sec.text
  ].filter(x => x !== "").join("\n");
}
async function wgenNext(env, acct, who, bodyText, json, fail) {
  if (!env.GEMINI_KEY) return fail(500, "INTERNAL", "The Worker has no GEMINI_KEY secret yet");
  if (!env.GUARD) return fail(500, "INTERNAL", "The Worker has no GUARD binding");
  let r; try { r = JSON.parse(bodyText); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
  const sec = r && r.sec || {};
  const b = {
    subject: clip(r.subject, 80), chapter: clip(r.chapter, 120), style: clip(r.style, 200) || "short answer",
    pts: Math.max(1, Math.min(50, parseInt(r.pts, 10) || 2)), label: clip(r.label, 20),
    n: Math.max(1, Math.min(500, parseInt(r.n, 10) || 1)), total: Math.max(1, Math.min(500, parseInt(r.total, 10) || 1)),
    sec: { k: clip(sec.k, 40), title: clip(sec.title, 160), text: clip(sec.text, 9000) },
    asked: (Array.isArray(r.asked) ? r.asked : []).slice(-60).map(x => clip(x, 160)).filter(Boolean),
  };
  if (!b.subject || !b.sec.text) return fail(400, "BAD_CODE", "Missing subject or notes");
  const q = await guard(env, "pin:" + who, "ai");
  if (q.blocked) return fail(429, "RESOURCE_EXHAUSTED", "Limit reached for this sign-in; try again later", { "Retry-After": String(q.aiWait || 60) });
  let made = null, err = null;
  for (let attempt = 0; attempt < 4 && !made; attempt++) {
    const g = await geminiJson(env, wPrompt(b), attempt ? 0.5 : 0.8, attempt);
    if (g.error) { err = g.error; if (![404, 429, 500, 502, 503, 504].includes(g.error.status)) break; continue; }
    const o = parseJson(g.text);
    if (o && typeof o.q === "string" && o.q.trim().length > 12 && typeof o.ref === "string" && o.ref.trim().length > 2) {
      made = { q: clip(o.q.trim(), 1600), ref: clip(o.ref.trim(), 1500) };
    } else err = { status: 502, bad: true };
  }
  if (!made) {
    if (err && err.status === 429) return fail(429, "RESOURCE_EXHAUSTED", "Can't be used right now", { "Retry-After": "60" });
    return fail(502, "GEN_FAILED", "No usable question was produced (" + (err && err.status || "?") + "); try again");
  }
  const id = [...crypto.getRandomValues(new Uint8Array(16))].map(x => x.toString(16).padStart(2, "0")).join("");
  const rec = { kind: "w", q: made.q, ref: made.ref, p: b.pts, l: b.label, sec: b.sec.k, at: Date.now() };
  await genStore(env, acct.id, "put", { id, rec });
  return json({ id, q: rec.q, l: rec.l, p: rec.p, sec: rec.sec });
}
function wGradePrompt(item, notes, ans) {
  return [
"You are grading one written answer of a university exam. Points for this question: " + item.p + ".",
"The student may answer in English or Traditional Chinese, or a mix; judge only the content, never the language, spelling or grammar.",
"QUESTION: " + item.q,
"REFERENCE answer (for reference only; the student does not have to match its wording or order):",
item.ref,
"Judge against the COURSE NOTES below. Do not require, and do not reward, ideas that are not in the notes.",
"Scoring (strict): decide the key points a full answer needs; give each an equal share. A key point earns its full share ONLY if the student states it precisely and correctly, using the same concept the reference uses. Give half a share ONLY when the point is clearly and correctly identified but incompletely explained. Vague, hedged, or merely related statements earn 0. Any point that names a different concept, operand, condition, or direction than the reference is WRONG and earns 0, even if it could be made to match under another reading (e.g. the reference says 'first node > target' and the student writes 'lowest node > target': these name different nodes in the search procedure, so 0). Do not give credit for an answer that is right only by coincidence or by an interpretation the notes do not state. If the question has several parts, each part is scored separately. Add the shares and round DOWN to the nearest 0.5. An empty or irrelevant answer scores 0.",
"Verdict rules: 'correct' only if the score equals the full points; 'partial' if some but not all points are earned; 'wrong' if nothing is earned.",
"Also write a model answer based only on the notes: answer_en in English (as long as the question needs), answer_zh the same in Traditional Chinese (Taiwan) with technical terms kept in English.",
"Reply with ONLY a JSON object: {\"score\":<number 0 to " + item.p + " in steps of 0.5>,\"verdict\":\"correct|partial|wrong\",\"feedback\":\"1-3 sentences in Traditional Chinese\",\"missing\":[\"short English keywords\"],\"answer_en\":\"...\",\"answer_zh\":\"...\"}",
"",
"COURSE NOTES:",
notes || "(no notes given)",
"",
"STUDENT ANSWER:",
ans
  ].join("\n");
}
async function wgrade(env, acct, who, bodyText, json, fail) {
  if (!env.GEMINI_KEY) return fail(500, "INTERNAL", "The Worker has no GEMINI_KEY secret yet");
  let r; try { r = JSON.parse(bodyText); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
  const blank = !clip(r.ans, 4000).trim(), notes = clip(r.notes, 9000);
  const ans = blank ? "(the student left this blank: could not answer)" : clip(r.ans, 4000);   /* a blank answer is graded too: 0 points and the model answer */
  let item = null;
  if (/^[0-9a-f]{32}$/.test(String(r.id || ""))) {
    const { rec } = await genStore(env, acct.id, "get", { id: String(r.id) });
    if (!rec || rec.kind !== "w") return fail(404, "GONE", "This question is no longer kept on the server");
    item = { q: (rec.c ? rec.c + "\n" : "") + rec.q, ref: rec.ref, p: rec.p };   /* c: the shared data / heading the sub-question builds on */
  } else {
    const set = BANK[String(r.s || "")] && BANK[String(r.s)]["w:" + String(r.key || "")];
    const it = set && set[Number(r.slot)];
    if (!it) return fail(404, "NOT_FOUND", "Unknown question");
    item = { q: (it.c ? it.c + "\n" : "") + it.q, ref: it.r, p: it.p };
  }
  const q = await guard(env, "pin:" + who, "ai");
  if (q.blocked) return fail(429, "RESOURCE_EXHAUSTED", "Limit reached for this sign-in; try again later", { "Retry-After": String(q.aiWait || 60) });
  let o = null, err = null;
  for (let attempt = 0; attempt < 3 && !o; attempt++) {
    const g = await geminiJson(env, wGradePrompt(item, notes, ans), 0.2, attempt);
    if (g.error) { err = g.error; if (![404, 429, 500, 502, 503, 504].includes(g.error.status)) break; continue; }
    const x = parseJson(g.text);
    if (x && (typeof x.score === "number" || /\d/.test(String(x.score)))) o = x; else err = { status: 502, bad: true };
  }
  if (!o && err && err.status === 429) return fail(429, "RESOURCE_EXHAUSTED", "Can't be used right now", { "Retry-After": "60" });
  if (!o) return fail(502, "GEN_FAILED", "This answer was not graded (" + (err && err.status || "?") + "); try again");
  let sc = Math.max(0, Math.min(item.p, Number(o.score) || 0));
  sc = Math.floor(sc * 2 + 1e-9) / 2;
  if (blank) sc = 0;
  const verdict = sc >= item.p ? "correct" : sc > 0 ? "partial" : "wrong";
  return json({
    score: sc, verdict, feedback: blank ? "沒有作答，這題 0 分。下面是參考解答。" : clip(o.feedback, 600),
    missing: (Array.isArray(o.missing) ? o.missing : []).slice(0, 8).map(x => clip(x, 60)),
    answer_en: clip(o.answer_en, 2000), answer_zh: clip(o.answer_zh, 2000), p: item.p,
  });
}
async function wbankOpen(env, who, bodyText, json, fail) {
  let r; try { r = JSON.parse(bodyText); } catch (e) { return fail(400, "BAD_JSON", "Body is not JSON"); }
  const set = BANK[String(r.s || "")] && BANK[String(r.s)]["w:" + String(r.key || "")];
  if (!set) return fail(404, "NOT_FOUND", "Unknown question set");
  const g = await guard(env, "pin:" + who, "bank");
  if (g.blocked) return fail(429, "RESOURCE_EXHAUSTED", "Too many requests; try again later", { "Retry-After": String(g.aiWait || 60) });
  const items = {};
  (Array.isArray(r.slots) ? r.slots : []).slice(0, 60).forEach(k => {
    const i = Number(k), it = set[i];
    if (Number.isInteger(i) && it) items[i] = { l: it.l, q: it.q, p: it.p };   /* the reference (it.r) is never sent */
  });
  return json({ items });
}

/* ---------- health: is each secret still good? ---------- */
async function health(env) {
  const out = { checkedAt: new Date().toISOString(), gemini: { ok: false }, supabase: { ok: false } };
  try {
    const r = await fetch(SUPABASE_URL + "/auth/v1/health", { headers: { apikey: SUPABASE_KEY } });
    out.supabase.ok = r.ok; out.supabase.status = r.status; out.supabase.secret = !!env.SUPABASE_SECRET_KEY;   /* is the device-PIN secret set? (never its value) */
  } catch (e) { out.supabase.error = String(e.message || e); }
  try {
    const target = "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1";
    let r;
    if (env.RELAY) r = await env.RELAY.get(env.RELAY.idFromName("gemini-relay-us"), { locationHint: "enam" }).fetch("https://relay/" + encodeURIComponent(target), { method: "GET" });
    else r = await fetch(target, { headers: { "x-goog-api-key": env.GEMINI_KEY } });
    out.gemini.ok = r.ok; out.gemini.status = r.status;
  } catch (e) { out.gemini.error = String(e.message || e); }
  return out;
}
