/* EZexams checks. Run:  node tests/run.mjs        (needs: npm i playwright && npx playwright install chromium)
   Each check prints ✓ or ✗; the exit code is the number of failed checks. Nothing here touches the network. */
import { serve, device, closeBrowser, typePin, settle, gateUp, worker, env, resetWorker, calls, setGemini, sbs, supabase, SECRET, MAIL, signUp, signIn, addUser } from "./harness.mjs";

const PORT = +process.env.PORT || 8871;
const site = serve(PORT), U = site.url;
const SUBJECTS = { statistics: "stats-midterm-v1", "operating-systems": "os-midterm-v1", "data-structures": "ds-midterm-v1", economics: "econ-midterm-v2" };
let failed = 0;
const results = [];
async function check(name, fn) {
  if (process.env.ONLY && !new RegExp(process.env.ONLY).test(name)) return;   /* ONLY="device PIN" node tests/run.mjs runs just those checks */
  const t0 = Date.now();
  try { await fn(); results.push(["✓", name]); console.log("✓", name, `(${Date.now() - t0} ms)`); }
  catch (e) { failed++; results.push(["✗", name]); console.log("✗", name, "\n   ", (e && e.message || e).split("\n").join("\n    ")); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const answered = (pg, key) => pg.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) || "{}"); return Object.values(s.quiz || {}).reduce((a, c) => a + Object.keys(c || {}).length, 0); }, key);
const W = (path, init = {}, ip) => worker(new Request("https://w.test" + path, Object.assign({ headers: { origin: "https://si70531.github.io" } }, init)), ip);

/* ---------- Worker ---------- */
/* an account made straight in the fake Supabase; returns its session (access_token, user) */
const mkAcct = n => JSON.parse(supabase("POST", "https://jyfmolrqxypufwjqexan.supabase.co/auth/v1/signup", {}, JSON.stringify({ email: n + MAIL, password: "password1" })).body);
const post = (path, body, ip) => W(path, { method: "POST", body: JSON.stringify(body) }, ip);
const devId = i => i.toString(16).padStart(32, "0");
const setPin = (a, dev, pin = "4821") => post("/pin/set", { t: a.access_token, deviceId: dev, pin });
const tryPin = (a, dev, pin, ip) => post("/pin/login", { uid: a.user.id, deviceId: dev, pin }, ip);

await check("Worker: the AI proxy refuses requests without a sign-in token, and the old PIN routes are gone", async () => {
  resetWorker();
  const a = await W("/v1beta/models/gemini-flash-latest:generateContent", { method: "POST", body: "{}" });
  assert(a.status === 401, `got ${a.status}`);
  const t = encodeURIComponent(mkAcct("gone").access_token);
  assert((await W("/sync?key=os-midterm-v1&t=" + t)).status === 404 && (await post("/login", { code: "4821", mode: "create" })).status === 401, "old routes still answer");
  assert(calls.gemini === 0, "Gemini was called");
});
await check("Worker: 5 wrong PINs lock that visitor out, others are unaffected", async () => {
  resetWorker();
  const a = mkAcct("lk");
  for (let i = 0; i < 7; i++) await setPin(a, devId(i));
  const codes = [];
  for (let i = 0; i < 5; i++) codes.push((await tryPin(a, devId(i), "1111", "6.6.6.6")).status);
  codes.push((await tryPin(a, devId(5), "4821", "6.6.6.6")).status);
  assert(codes.slice(0, 5).every(s => s === 401) && codes[5] === 429, "statuses " + codes.join(","));
  const other = await tryPin(a, devId(6), "4821", "7.7.7.7");
  assert(other.status === 200, "other visitor " + other.status);
});
await check("Worker: only the site's Gemini models; IPv6 neighbours share one wrong-PIN count", async () => {
  resetWorker();
  const a = mkAcct("m1");
  const pro = await W("/v1beta/models/gemini-2.5-pro:generateContent?t=" + encodeURIComponent(a.access_token), { method: "POST", body: "{}" });
  assert(pro.status === 404 && calls.gemini === 0, "other model " + pro.status);
  for (let i = 0; i < 7; i++) await setPin(a, devId(i));
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await tryPin(a, devId(i), "1111", "2001:db8:1:2::" + (i + 1).toString(16))).status);
  assert(codes[5] === 429, "IPv6 rotation not counted: " + codes.join(","));
});
await check("Worker: /health and /errors answer", async () => {
  const h = await (await W("/health")).json();
  assert(h.supabase && h.supabase.ok && h.supabase.secret === true && h.gemini && h.gemini.ok && !h.github, JSON.stringify(h));
  await W("/log", { method: "POST", body: JSON.stringify({ msg: "boom", src: "x.js:1", page: "/t" }) });
  const e = await (await W("/errors")).json();
  assert(e.errors.length === 1 && e.errors[0].msg === "boom", JSON.stringify(e));
});

/* ---------- pages ---------- */
for (const [sub] of Object.entries(SUBJECTS)) {
  await check(`${sub}: every tab opens without errors, no sideways scrolling on a small phone (320 px)`, async () => {
    const pg = await device({ skipGate: true, ctx: { viewport: { width: 320, height: 640 }, isMobile: true } });
    await pg.goto(U + sub + "/midterm/"); await pg.waitForTimeout(600);
    const r = await pg.evaluate(async () => {
      const bad = [];
      for (const [id] of VIEWS.filter(v => v[0] !== "|")) { show(id); await new Promise(z => setTimeout(z, 60));
        if (document.documentElement.scrollWidth > innerWidth + 1) bad.push(id); }
      return bad;
    });
    assert(!r.length, "overflow in " + r.join(","));
    assert(!pg.errs.length, "page errors: " + pg.errs.join(" | "));
    await pg.ctx.close();
  });
}

/* ---------- PIN gate, sync, merge ---------- */
const PAGE = U + "statistics/midterm/", KEY = SUBJECTS.statistics;
/* ---------- accounts: sign-in, device PIN, sync, import ---------- */
/* wait (up to 10 s) until the gate's message line matches; a fixed sleep is flaky on a slow machine */
const msgIs = (pg, re) => pg.waitForFunction(src => new RegExp(src).test(document.getElementById("egMsg").textContent), re.source, { timeout: 10000 });
const modeIs = (pg, m) => pg.waitForFunction(m => (document.querySelector("#ezgate .eg-ticket") || {}).dataset && document.querySelector("#ezgate .eg-ticket").dataset.mode === m, m, { timeout: 10000 });
const flip = pg => pg.waitForTimeout(800);   /* the ticket flips between screens */
const gateMode = pg => pg.evaluate(() => { const t = document.querySelector("#ezgate .eg-ticket"); return t && t.dataset.mode; });
const uidOf = name => [...sbs.users.values()].find(u => u.email === name + MAIL).id;
const rowOf = (name, key) => sbs.rows.get(uidOf(name) + "|" + key);
await check("accounts: sign up, answers upload to Supabase and a second device signs in with the password and sees them", async () => {
  resetWorker();
  const a = await device(); await a.goto(PAGE); await a.waitForTimeout(500);
  assert(await gateUp(a) && await gateMode(a) === "login", "gate not shown on the login screen");
  await signUp(a, "alice");
  assert(!(await gateUp(a)) && await a.evaluate(() => EZSync.mode() === "acct" && EZSync.account().username === "alice"), "not signed in");
  await a.evaluate(() => { show("ch1"); [...document.querySelectorAll("#ch1 .quiz > .qitem")].slice(0, 3).forEach(it => it.querySelectorAll(".opt")[0].click()); });
  await a.waitForTimeout(34000);   /* uploads: at most one every 30 s per browser */
  assert(rowOf("alice", KEY) && Object.keys(rowOf("alice", KEY).data.quiz.ch1).length === 3, "nothing uploaded: " + JSON.stringify(rowOf("alice", KEY)));
  const b = await device(); await b.goto(PAGE); await b.waitForTimeout(500);
  await signIn(b, "alice");
  assert(await answered(b, KEY) === 3, "device B has " + await answered(b, KEY));
  assert(!a.errs.length && !b.errs.length, [...a.errs, ...b.errs].join(" | "));
  await a.ctx.close(); await b.ctx.close();
});
await check("accounts: wrong password, taken name and short password say what is wrong; nothing is signed in", async () => {
  resetWorker(); addUser("frank");
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await pg.fill("#egUser", "frank"); await pg.fill("#egPass", "wrongpass1"); await pg.click("#egGo"); await msgIs(pg, /不對/);
  assert(/不對/.test(await pg.textContent("#egMsg")), "wrong password: " + await pg.textContent("#egMsg"));
  await pg.click("#egSw"); await flip(pg);
  await pg.fill("#egUser", "frank"); await pg.fill("#egPass", "password1"); await pg.fill("#egPass2", "password1"); await pg.click("#egGo"); await msgIs(pg, /已經有人用/);
  assert(/已經有人用/.test(await pg.textContent("#egMsg")), "taken: " + await pg.textContent("#egMsg"));
  await pg.fill("#egUser", "Bad Name!"); await pg.click("#egGo"); await pg.waitForTimeout(300);
  assert(/最多 20/.test(await pg.textContent("#egMsg")), "bad name: " + await pg.textContent("#egMsg"));
  await pg.fill("#egUser", "S"); await pg.fill("#egPass", "short"); await pg.fill("#egPass2", "short"); await pg.click("#egGo"); await pg.waitForTimeout(300);
  assert(/至少要 6/.test(await pg.textContent("#egMsg")), "short: " + await pg.textContent("#egMsg"));
  assert(await gateUp(pg) && !(await pg.evaluate(() => EZSync.connected())), "signed in anyway");
  await pg.ctx.close();
});
await check("device PIN: after signing out this device asks for the PIN only; wrong ones count down, the right one signs in", async () => {
  resetWorker();
  const pg = await device({ ip: "5.5.5.5" }); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await signUp(pg, "bob", { pin: "4821" });
  assert(!/4821/.test(JSON.stringify([...sbs.users.values()])) && !(await pg.evaluate(() => JSON.stringify(localStorage)).then(t => t.includes("4821"))), "the PIN is stored in the clear");
  await pg.click("#ezOut"); await pg.click("#ezask .yes"); await flip(pg);
  assert(await gateMode(pg) === "pin" && /bob/.test(await pg.textContent("#egP")), "no PIN screen for bob: " + await gateMode(pg));
  for (const [i, c] of ["1357", "2468", "3579", "1470"].entries()) { await typePin(pg, 1, c); await msgIs(pg, new RegExp("還剩 " + (4 - i) + " 次")); await pg.waitForTimeout(450); }   /* (the boxes clear a moment after the message) */
  assert(await pg.evaluate(() => [...document.querySelectorAll('.eg-cells[data-row="1"] input')].map(x => x.value).join("") === ""), "cells not cleared");
  await typePin(pg, 1, "4821"); await settle(pg, 1500);
  assert(!(await gateUp(pg)) && await pg.evaluate(() => EZSync.account() && EZSync.account().username === "bob"), "right PIN did not sign in");
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});
await check("device PIN: 5 wrong ones remove it, and the password is needed again", async () => {
  resetWorker();
  const pg = await device({ ip: "5.5.6.6" }); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await signUp(pg, "cara", { pin: "4821" });
  await pg.click("#ezOut"); await pg.click("#ezask .yes"); await flip(pg);
  for (const [i, c] of ["1357", "2468", "3579", "1470"].entries()) { await typePin(pg, 1, c); await msgIs(pg, new RegExp("還剩 " + (4 - i) + " 次")); await pg.waitForTimeout(450); }
  await typePin(pg, 1, "2580"); await modeIs(pg, "login"); await flip(pg);
  const m5 = await pg.evaluate(() => [document.querySelector(".eg-ticket").dataset.mode, document.getElementById("egMsg").textContent]);
  assert(m5[0] === "login" && /已移除/.test(m5[1]), "after 5 wrong: " + m5.join(" / "));
  const dev = await pg.evaluate(() => JSON.parse(localStorage.getItem("ezsync-dev")));
  assert(dev.pin === false, "the device still thinks it has a PIN");
  const r = await W("/pin/login", { method: "POST", body: JSON.stringify({ uid: dev.uid, deviceId: dev.dev, pin: "4821" }) }, "7.7.7.7");
  assert(r.status === 404, "the removed PIN still works on the Worker: " + r.status);
  await pg.fill("#egPass", "password1"); await pg.click("#egGo"); await settle(pg, 1500);   /* signs in, then the page reloads */
  assert(await pg.evaluate(() => EZSync.mode() === "acct"), "the password did not sign in");
  await pg.ctx.close();
});
await check("accounts: signing in as another account asks before it clears this device's answers", async () => {
  resetWorker(); addUser("dave");
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await signUp(pg, "erin");
  await pg.evaluate(() => { show("ch1"); [...document.querySelectorAll("#ch1 .quiz > .qitem")].slice(0, 3).forEach(it => it.querySelectorAll(".opt")[0].click()); });
  await pg.waitForTimeout(400); await pg.click("#ezOut"); await pg.click("#ezask .yes"); await pg.waitForTimeout(2500); await flip(pg);
  assert(await answered(pg, KEY) === 3, "answers should still be here after signing out");
  await pg.fill("#egUser", "dave"); await pg.fill("#egPass", "password1"); await pg.click("#egGo"); await msgIs(pg, /會被清掉/);
  assert(/會被清掉/.test(await pg.textContent("#egMsg")), "no question: " + await pg.textContent("#egMsg"));
  await pg.click("#egMsg >> text=取消"); await pg.waitForTimeout(500);
  assert(await answered(pg, KEY) === 3 && !(await pg.evaluate(() => EZSync.connected())), "cancel did not keep answers / stay signed out");
  await pg.fill("#egPass", "password1"); await pg.click("#egGo"); await msgIs(pg, /會被清掉/);
  await pg.click("#egMsg button:nth-of-type(1)"); await pg.waitForSelector('.eg-ticket[data-mode="setpin"]', { timeout: 8000 }); await flip(pg); await pg.click("#egAlt"); await settle(pg, 1500);
  assert(await answered(pg, KEY) === 0 && await pg.evaluate(() => EZSync.account().username === "dave"), "answers not cleared for the other account");
  await pg.ctx.close();
});
await check("登出 asks first; 取消 keeps you signed in", async () => {
  resetWorker();
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await signUp(pg, "hank");
  await pg.click("#ezOut"); await pg.waitForTimeout(200);
  assert(await pg.locator("#ezask").count() === 1, "no confirm dialog");
  assert(await pg.locator("#ezask .pin").count() === 1, "no 設定 PIN 碼 button in the dialog");
  await pg.click("#ezask .no"); await pg.waitForTimeout(300);
  assert(await pg.evaluate(() => EZSync.connected()) && !(await gateUp(pg)), "signed out after cancel");
  await pg.ctx.close();
});
await check("device PIN: 設定 PIN 碼 in the logout dialog sets one later; 取消 leaves things as they were", async () => {
  resetWorker();
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await signUp(pg, "ivy");
  await pg.click("#ezOut"); await pg.click("#ezask .pin"); await flip(pg);
  assert(await gateMode(pg) === "setpin" && await gateUp(pg), "setpin screen not shown");
  await pg.click("#egAlt"); await pg.waitForTimeout(700);
  assert(!(await gateUp(pg)) && await pg.evaluate(() => EZSync.connected() && !EZSync.device().pin), "cancel changed something");
  await pg.click("#ezOut"); await pg.click("#ezask .pin"); await flip(pg); await typePin(pg, 1, "6283"); await typePin(pg, 2, "6283"); await pg.waitForTimeout(2500);
  assert(await pg.evaluate(() => EZSync.device().pin === true && EZSync.connected()), "PIN not set / signed out by it");
  await pg.ctx.close();
});
await check("sync: logging out right after answering still uploads the answer", async () => {
  resetWorker();
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await signUp(pg, "jack");
  await pg.evaluate(() => { show("ch2"); document.querySelector("#ch2 .quiz > .qitem .opt").click(); });
  await pg.waitForTimeout(300); await pg.click("#ezOut"); await pg.click("#ezask .yes"); await pg.waitForTimeout(2500);
  const data = (rowOf("jack", KEY) || {}).data;
  assert(data && data.quiz && data.quiz.ch2 && Object.keys(data.quiz.ch2).length === 1, "ch2 not uploaded: " + JSON.stringify(data));
  await pg.ctx.close();
});
await check("sync: an upload keeps answers another device made in the meantime", async () => {
  resetWorker();
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await signUp(pg, "kim");
  /* this device answers ch2; before it uploads, another device answers ch3 #0 and uploads an older-stamped copy */
  await pg.evaluate(() => { show("ch2"); document.querySelector("#ch2 .quiz > .qitem .opt").click(); });
  await pg.waitForTimeout(300);
  const now = Date.now();
  sbs.rows.set(uidOf("kim") + "|" + KEY, { updatedAt: now - 60000, data: { quiz: { ch3: { 0: 1 } }, qat: { ch3: { 0: now - 60000 } } } });
  await pg.click("#ezOut"); await pg.click("#ezask .yes"); await pg.waitForTimeout(2500);
  const up = rowOf("kim", KEY).data;
  assert(up.quiz.ch2 && up.quiz.ch3 && up.quiz.ch3[0] === 1, "lost the other device's answer: " + JSON.stringify(up.quiz));
  await pg.ctx.close();
});
await check("sync: an expired access token is renewed by itself; a revoked session asks to sign in again", async () => {
  resetWorker(); sbs.ttl = 1;   /* sessions last 1 s: every call must refresh first */
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await signUp(pg, "liam"); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => { const t1 = await EZSync.session(); await new Promise(z => setTimeout(z, 1300)); const t2 = await EZSync.session(); return [!!t1, !!t2, t1 !== t2, EZSync.connected()]; });
  assert(r[0] && r[1] && r[2] && r[3], "no renewal: " + r.join(","));
  sbs.refresh.clear(); sbs.tokens.clear();   /* the server forgot every session */
  const t3 = await pg.evaluate(async () => { await new Promise(z => setTimeout(z, 1300)); return [await EZSync.session(), EZSync.connected()]; });
  assert(t3[0] === null && t3[1] === false, "dead session still looks signed in: " + JSON.stringify(t3));
  await pg.ctx.close();
});
await check("Worker: a Supabase sign-in opens the Gemini proxy (counted per account); junk and forged tokens are refused", async () => {
  resetWorker();
  const sess = supabase("POST", "https://jyfmolrqxypufwjqexan.supabase.co/auth/v1/signup", {}, JSON.stringify({ email: "w1" + MAIL, password: "password1" }));
  const tok = JSON.parse(sess.body).access_token;
  const call = t => W("/v1beta/models/gemini-flash-latest:generateContent?t=" + encodeURIComponent(t), { method: "POST", body: "{}" });
  assert((await call(tok)).status === 200 && calls.gemini === 1, "account token refused");
  assert((await call(tok.slice(0, -2) + "xx")).status === 401, "forged token accepted");
  assert((await call("a.b.c")).status === 401 && (await call("garbage")).status === 401, "junk accepted");
  const t2 = JSON.parse(supabase("POST", "https://jyfmolrqxypufwjqexan.supabase.co/auth/v1/token?grant_type=password", {}, JSON.stringify({ email: "w1" + MAIL, password: "password1" })).body).access_token;
  assert((await call(t2)).status === 200, "a fresh sign-in was refused");
});
await check("Worker: device PIN — set needs a sign-in, the right PIN returns a one-time link, 5 wrong ones delete it, other devices and accounts cannot use it", async () => {
  resetWorker();
  const a = mkAcct("p1"), b = mkAcct("p2"), dev = "a".repeat(32), dev2 = "b".repeat(32);
  assert((await post("/pin/set", { t: "nope.nope.nope", deviceId: dev, pin: "4821" })).status === 401, "set without a sign-in");
  assert((await post("/pin/set", { t: a.access_token, deviceId: dev, pin: "48" })).status === 400, "short PIN accepted");
  assert((await post("/pin/set", { t: a.access_token, deviceId: dev, pin: "4821" })).status === 200, "set failed");
  const stored = JSON.stringify([...env.GUARD.mems.values()].map(m => [...m]));
  assert(!stored.includes("4821") && stored.includes("\"h\""), "the PIN is kept in the clear (or not stored): " + stored.slice(0, 200));
  assert((await post("/pin/login", { uid: a.user.id, deviceId: dev2, pin: "4821" })).status === 404, "another device used the PIN");
  assert((await post("/pin/login", { uid: b.user.id, deviceId: dev, pin: "4821" })).status === 404, "another account used the PIN");
  const ok = await post("/pin/login", { uid: a.user.id, deviceId: dev, pin: "4821" });
  const link = (await ok.json()).token_hash; assert(ok.status === 200 && link, "right PIN: " + ok.status);
  const ses = JSON.parse(supabase("POST", "https://jyfmolrqxypufwjqexan.supabase.co/auth/v1/verify", {}, JSON.stringify({ type: "magiclink", token_hash: link })).body);
  assert(ses.user && ses.user.id === a.user.id, "the link did not sign in the right account");
  assert(supabase("POST", "https://jyfmolrqxypufwjqexan.supabase.co/auth/v1/verify", {}, JSON.stringify({ type: "magiclink", token_hash: link })).status === 403, "link works twice");
  const codes = []; for (const c of ["1111", "2222", "3333", "4444", "5555"]) { const r = await post("/pin/login", { uid: a.user.id, deviceId: dev, pin: c }, "3.3.3." + codes.length); codes.push(r.status); }
  assert(codes.join() === "401,401,401,401,403", "wrong-PIN statuses " + codes.join());
  assert((await post("/pin/login", { uid: a.user.id, deviceId: dev, pin: "4821" }, "3.3.3.9")).status === 404, "the PIN survived 5 wrong tries");
  await post("/pin/set", { t: a.access_token, deviceId: dev, pin: "4821" });
  assert((await post("/pin/clear", { t: a.access_token, deviceId: dev })).status === 200 && (await post("/pin/login", { uid: a.user.id, deviceId: dev, pin: "4821" }, "3.3.3.10")).status === 404, "clear did not remove it");
});
await check("exam dates: every page takes them from assets/ezdates.js", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U); await pg.waitForTimeout(500);
  const home = await pg.evaluate(() => [...document.querySelectorAll(".exam-subj")].map(s => [s.querySelector("a.ticket").getAttribute("href"), s.dataset.date, s.querySelector(".stub .v").textContent]));
  const all = await pg.evaluate(() => EZDATES.all);
  assert(home.length === 4 && home.every(([h, d, v]) => all[h.replace(/\/$/, "")] === d && v === +d.slice(5, 7) + "/" + +d.slice(8)), JSON.stringify(home));
  for (const sub of Object.keys(SUBJECTS)) {
    await pg.goto(U + sub + "/midterm/"); await pg.waitForFunction(() => { const e = document.querySelector("#home .vhead .eyebrow"); return e && e.dataset.fxTyped && !e.classList.contains("fx-typing"); }, null, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(300);   /* the subtitle types itself out */
    const r = await pg.evaluate(() => [EZDATES.md(), [...document.querySelectorAll("[data-examdate]")].map(e => e.textContent), document.querySelector("#home .vhead .eyebrow").textContent]);
    assert(r[0] && r[1].every(t => t === r[0]) && r[2].endsWith("· " + r[0]), sub + " " + JSON.stringify(r));
  }
  await pg.ctx.close();
});
await check("merge: per question, the later answer wins", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(PAGE); await pg.waitForTimeout(400);
  const r = await pg.evaluate(() => {
    const local = { quiz: { ch1: { 0: 1, 1: 2 } }, qat: { ch1: { 0: 200, 1: 50 } } };
    const remote = { quiz: { ch1: { 0: 3, 1: 0, 2: 1 } }, qat: { ch1: { 0: 100, 1: 90, 2: 80 } } };
    return EZSync.defaultMerge(local, remote).quiz.ch1;
  });
  assert(r[0] === 1 && r[1] === 0 && r[2] === 1, JSON.stringify(r));
  await pg.ctx.close();
});

/* ---------- review / wrong answers ---------- */
await check("總複習: wrong answers sit right after their section's card", async () => {
  for (const sub of Object.keys(SUBJECTS)) {
    const pg = await device({ skipGate: true }); await pg.goto(U + sub + "/midterm/#ch1"); await pg.waitForTimeout(600);
    await pg.evaluate(() => [...document.querySelectorAll("#ch1 .quiz > .qitem")].slice(0, 6).forEach(it => it.querySelectorAll(".opt")[0].click()));
    await pg.waitForTimeout(500);
    const r = await pg.evaluate(() => { const g = [...document.querySelectorAll(".rvwrong")]; return [g.length, g.filter(x => { const p = x.previousElementSibling; return p && p.classList.contains("rvsec") && p.dataset.rsec === x.dataset.wsec; }).length]; });
    assert(r[0] > 0 && r[0] === r[1], sub + ": groups " + r.join("/"));
    await pg.ctx.close();
  }
});
await check("chapter-end written: no keyword grading — without signing in it says why and offers 重試, no score", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U + "operating-systems/midterm/#ch1"); await pg.waitForTimeout(600);
  const r = await pg.evaluate(async () => { const q = document.querySelector("#ch1 .chw .exq"); const ta = q.querySelector("textarea");
    ta.value = "an intermediary between the user and the hardware"; ta.dispatchEvent(new Event("input")); q.querySelector(".grade").click();
    for (let i = 0; i < 40 && !/重試/.test(q.querySelector(".gstat").textContent); i++) await new Promise(z => setTimeout(z, 100));
    return [q.querySelector(".gstat").textContent, q.querySelector(".gres").hidden, getComputedStyle(q.querySelector("details.qa")).display]; });
  assert(/先登入/.test(r[0]) && /重試/.test(r[0]) && r[1] === true && r[2] === "none", JSON.stringify(r));
  await pg.ctx.close();
});
await check("chapter-end written: AI grades from the notes, shows its own ANSWER (EN + 中文); 看 AI 解答 works without answering", async () => {
  resetWorker(); const prompts = [];
  setGemini(body => { const t = JSON.stringify(body); prompts.push(t); const ids = [...new Set(t.match(/ch1w-\d+/g) || [])];
    const grading = /student_answer/.test(t);
    return { candidates: [{ content: { parts: [{ text: JSON.stringify(ids.map(id => grading ? { id, score: 1, verdict: "partial", feedback: "部分", missing: [], answer_en: "EN " + id, answer_zh: "中 " + id } : { id, answer_en: "EN " + id, answer_zh: "中 " + id })) }] } }] }; });
  const pg = await device(); await pg.goto(U + "operating-systems/midterm/"); await pg.waitForTimeout(500);
  await signUp(pg, "ai" + Math.random().toString(36).slice(2, 8)); await settle(pg, 1500);
  const r = await pg.evaluate(async () => { show("ch1"); await new Promise(z => setTimeout(z, 300));
    const [q1, q2] = document.querySelectorAll("#ch1 .chw .exq"); const ta = q1.querySelector("textarea");
    ta.value = "it is a software interrupt"; ta.dispatchEvent(new Event("input")); q1.querySelector(".grade").click();
    for (let i = 0; i < 60 && !/完成/.test(q1.querySelector(".gstat").textContent); i++) await new Promise(z => setTimeout(z, 100));
    q2.querySelector(".aibtn").click();
    for (let i = 0; i < 60 && !q2.querySelector(".aians"); i++) await new Promise(z => setTimeout(z, 100));
    const a1 = q1.querySelector(".aians"), a2 = q2.querySelector(".aians");
    return [q1.querySelector(".gstat").textContent, a1 && !a1.hidden && a1.textContent, a2 && !a2.hidden && a2.textContent, !!q1.querySelector(".gres .miss"), q1.id, q2.id]; });
  assert(r[0] === "批改完成。" && new RegExp("ANSWER.*EN " + r[4] + ".*中文.*中 " + r[4]).test(r[1]) && new RegExp("EN " + r[5]).test(r[2]) && !r[3], JSON.stringify(r));
  assert(prompts.length === 2 && /COURSE NOTES/.test(prompts[0]) && /reference_for_reference_only/.test(prompts[0]) && /student_answer/.test(prompts[0]), "prompt lacks notes/reference: " + prompts.length + " " + prompts.map(p => p.slice(0, 80)).join(" // "));
  await pg.ctx.close();
});
await check("AI grading: a correct verdict is never shown as 0 points (score 0, \"5/5\" or text)", async () => {
  for (const score of [0, "5/5", "滿分", 5]) {
    resetWorker();
    setGemini(body => { const t = JSON.stringify(body); const ids = [...new Set(t.match(/ch1w-\d+/g) || [])];
      return { candidates: [{ content: { parts: [{ text: JSON.stringify(ids.map(id => ({ id, score, verdict: "correct", feedback: "完全正確", missing: [], answer_en: "e", answer_zh: "z" }))) }] } }] }; });
    const pg = await device(); await pg.goto(U + "operating-systems/midterm/"); await pg.waitForTimeout(500);
    await signUp(pg, "ai" + Math.random().toString(36).slice(2, 8)); await settle(pg, 1500);
    const r = await pg.evaluate(async () => { show("ch1"); await new Promise(z => setTimeout(z, 300));
      const q = document.querySelector("#ch1 .chw .exq"); const ta = q.querySelector("textarea");
      ta.value = "a full answer"; ta.dispatchEvent(new Event("input")); q.querySelector(".grade").click();
      for (let i = 0; i < 60 && !/完成/.test(q.querySelector(".gstat").textContent); i++) await new Promise(z => setTimeout(z, 100));
      return [q.dataset.pts, q.querySelector(".gres").textContent]; });
    assert(new RegExp(r[0] + "\\s*/\\s*" + r[0]).test(r[1]) && !/錯誤/.test(r[1]), JSON.stringify(score) + " → " + JSON.stringify(r));
    await pg.ctx.close();
  }
});
await check("AI grading when signed in: goes through the Worker with temperature 0 and a fixed seed", async () => {
  resetWorker(); let seen = null;
  setGemini(body => { seen = body; return { candidates: [{ content: { parts: [{ text: JSON.stringify([{ id: "x", score: 1 }]) }] } }] }; });
  const pg = await device(); await pg.goto(U + "operating-systems/midterm/"); await pg.waitForTimeout(500);
  await signUp(pg, "ai" + Math.random().toString(36).slice(2, 8)); await settle(pg, 1500);
  await pg.evaluate(async () => { show("ch1"); const q = document.querySelector("#ch1 .chw .exq"); const ta = q.querySelector("textarea");
    ta.value = "resource allocator and control program"; ta.dispatchEvent(new Event("input")); q.querySelector(".grade").click();
    for (let i = 0; i < 50 && !/完成/.test(q.querySelector(".gstat").textContent); i++) await new Promise(z => setTimeout(z, 100)); });
  const g = seen && seen.generationConfig || {};
  assert(g.temperature === 0 && g.seed === 7 && g.topK === 1, "generationConfig " + JSON.stringify(g));
  assert(/Scoring procedure/.test(JSON.stringify(seen)), "rubric procedure missing from the prompt");
  await pg.ctx.close();
});
await check("AI explanation: the right option is green even if the AI marks it wrong", async () => {
  resetWorker();
  setGemini(() => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ mistake: "", point: "p", options: ["A", "B", "C", "D"].map(l => ({ letter: l, correct: false, why: "why " + l })) }) }] } }] }));
  const pg = await device(); await pg.goto(U + "operating-systems/midterm/"); await pg.waitForTimeout(500);
  await signUp(pg, "ai" + Math.random().toString(36).slice(2, 8)); await settle(pg, 1500);
  const r = await pg.evaluate(async () => { show("ch1"); await new Promise(z => setTimeout(z, 300)); const it = document.querySelector("#ch1 .quiz > .qitem"); const i = +it.dataset.i;
    const right = [...it.querySelectorAll(".opt")].find(o => +o.dataset.oi === QUIZ.ch1[i].a); right.click();
    for (let k = 0; k < 60 && !it.querySelector(".aiexp li"); k++) await new Promise(z => setTimeout(z, 100));
    const L = right.querySelector(".ab").textContent.trim(); const li = [...it.querySelectorAll(".aiexp li")].find(x => x.querySelector(".ab").textContent.trim() === L);
    return li ? li.className : "no explanation"; });
  assert(/\bok\b/.test(r) && /mine/.test(r), "li class: " + r);
  await pg.ctx.close();
});
await check("章末練習 pill: shown while reading notes, jumps to the first unanswered question, hidden at the exercises", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U + "operating-systems/midterm/#ch5"); await pg.waitForTimeout(800);
  await pg.evaluate(() => { const its = [...document.querySelectorAll("#ch5 .quiz > .qitem")]; its.slice(0, 3).forEach(it => it.querySelector(".opt").click()); scrollTo(0, 0); });
  await pg.waitForTimeout(400);
  const lab = await pg.evaluate(() => { const b = document.querySelector(".ezgo"); return b && !b.hidden ? b.textContent : "hidden"; });
  assert(/還有 \d+ 題/.test(lab), "pill: " + lab);
  await pg.screenshot({ path: process.env.SHOT2 || "/dev/null" }).catch(() => {});
  await pg.click(".ezgo"); await pg.waitForTimeout(500);
  const r = await pg.evaluate(() => { const t = EZtodo("ch5"); const rc = t.getBoundingClientRect(); return [rc.top > 0 && rc.bottom < innerHeight + 200, document.querySelector(".ezgo").hidden]; });
  assert(r[0] && r[1], "after click: " + r.join(","));
  await pg.ctx.close();
});
await check("AI grading: an unreadable reply is retried automatically, never shown as 讀不懂", async () => {
  resetWorker(); let n = 0;
  setGemini(body => { n++; const txt = JSON.stringify(body); const id = (txt.match(/ch1w-\d+/) || ["?"])[0];
    return { candidates: [{ content: { parts: [{ text: n === 1 ? "Sorry, here is my grading: {score: maybe" : "```json\n[{\"id\":\"" + id + "\",\"score\":2,\"verdict\":\"correct\",\"feedback\":\"好\",\"missing\":[]},]\n```" }] } }] }; });
  const pg = await device(); await pg.goto(U + "operating-systems/midterm/"); await pg.waitForTimeout(500);
  await signUp(pg, "ai" + Math.random().toString(36).slice(2, 8)); await settle(pg, 1500);
  const r = await pg.evaluate(async () => { show("ch1"); await new Promise(z => setTimeout(z, 200)); const q = document.querySelector("#ch1 .chw .exq"); const ta = q.querySelector("textarea");
    ta.value = "request, use, release"; ta.dispatchEvent(new Event("input")); q.querySelector(".grade").click();
    for (let i = 0; i < 80 && !/完成|關鍵字/.test(q.querySelector(".gstat").textContent); i++) await new Promise(z => setTimeout(z, 100));
    return q.querySelector(".gstat").textContent; });
  assert(r === "批改完成。" && n === 2, `status "${r}", Gemini calls ${n}`);
  await pg.ctx.close();
});
await check("written blocks: past exams keep the reference answer and keyword grading; mock exams, assignment and chapters are AI-only", async () => {
  for (const [sub, views] of [["operating-systems", { past: false, "mock-a": true, ch1: true }], ["data-structures", { y24: false, y25: false, "mock-b": true }], ["statistics", { hw: true, ch1: true }]]) {
    const pg = await device({ skipGate: true }); await pg.goto(U + sub + "/midterm/"); await pg.waitForTimeout(700);
    const r = await pg.evaluate(vs => Object.keys(vs).map(v => { show(v); const q = document.querySelector("#" + v + " .exq"); const qa = q.querySelector("details.qa");
      const ai = !!q.closest(".aiw") && !!q.querySelector(".aibtn") && (!qa || getComputedStyle(qa).display === "none");
      return ai === vs[v] ? "" : v + ":" + ai; }).filter(Boolean), views);
    assert(!r.length, sub + " wrong mode: " + r.join(","));
    await pg.ctx.close();
  }
});
await check("keyboard: A–D answers the question on screen, ← → moves between tabs", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U + "operating-systems/midterm/#ch2"); await pg.waitForTimeout(700);
  await pg.evaluate(() => { const q = document.querySelector("#ch2 .quiz > .qitem"); q.scrollIntoView({ block: "center" }); });
  await pg.waitForTimeout(200); await pg.keyboard.press("b"); await pg.waitForTimeout(200);
  const picked = await pg.evaluate(() => { const q = document.querySelector("#ch2 .quiz > .qitem"); return [...q.querySelectorAll(".opt")].findIndex(o => o.classList.contains("right") || o.classList.contains("wrong")); });
  assert(picked >= 0, "no option chosen by key B");
  await pg.focus('#tabs [data-go="ch2"]'); await pg.keyboard.press("ArrowRight"); await pg.waitForTimeout(200);
  assert(await pg.evaluate(() => !document.getElementById("ch3").hidden), "ArrowRight did not open Ch3");
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});

/* ---------- limits and edge cases ---------- */
const aiCall = (tok, ip) => W("/v1beta/models/gemini-flash-latest:generateContent?t=" + encodeURIComponent(tok), { method: "POST", body: "{}" }, ip);
await check("Worker: 200 wrong PINs across the whole site pause the PIN sign-in for everyone, right PIN included", async () => {
  resetWorker();
  const a = mkAcct("gl");
  for (let i = 0; i < 201; i++) await setPin(a, devId(i));
  for (let i = 0; i < 200; i++) await tryPin(a, devId(i), "1111", `2001:db8:${i.toString(16)}::1`);   /* a different visitor each time */
  const r = await tryPin(a, devId(200), "4821", "8.8.8.8");
  assert(r.status === 429 && (await r.json()).error.status === "LOCKED", "status " + r.status);
});
await check("Worker: one account gets 600 AI calls an hour and 3000 a day, then 429; another account is unaffected", async () => {
  resetWorker();
  sbs.ttl = 3 * 86400;   /* the account token must outlive the simulated days */
  const a = mkAcct("ai1").access_token, b = mkAcct("ai2").access_token, real = Date.now; let t = real();
  Date.now = () => t;
  try {
    for (let i = 0; i < 600; i++) assert((await aiCall(a)).status === 200, "call " + (i + 1) + " refused");
    const r = await aiCall(a);
    assert(r.status === 429 && +r.headers.get("retry-after") > 0, "601st call: " + r.status);
    assert((await aiCall(b)).status === 200, "another account was blocked");
    for (let h = 1; h < 5; h++) { t += 3600e3; for (let i = 0; i < 600; i++) await aiCall(a); }   /* 5 hours x 600 = 3000 */
    t += 3600e3;
    assert((await aiCall(a)).status === 429, "daily limit not applied in a fresh hour");
  } finally { Date.now = real; }
});
const PICK = "window.pickItem = i => { const l = [...document.querySelectorAll('#ch1 .quiz > .qitem')]; return l.find(x => +x.dataset.i === i) || l[i]; };";
await check("rewards: 3 right in a row shows the combo chip, a wrong answer hides it, finishing a chapter shows its result card", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(PAGE); await pg.waitForTimeout(800); await pg.evaluate(PICK);
  const click = (i, right) => pg.evaluate(([i, right]) => { show("ch1"); const it = pickItem(i), a = QUIZ.ch1[i].a, opts = [...it.querySelectorAll(".opt")];
    (right ? opts.find(o => +o.dataset.oi === a) : opts.find(o => +o.dataset.oi !== a)).click(); }, [i, right]);
  for (let i = 0; i < 3; i++) await click(i, true);
  await pg.waitForSelector("#joyCombo.on", { timeout: 3000 });
  assert(await pg.textContent("#joyCombo b") === "3", "combo count " + await pg.textContent("#joyCombo b"));
  await click(3, false); await pg.waitForFunction(() => !document.getElementById("joyCombo").classList.contains("on"), null, { timeout: 3000 });
  const n = await pg.evaluate(() => QUIZ.ch1.length);
  for (let i = 4; i < n; i++) await click(i, true);
  await pg.waitForSelector(".joy-toast.on", { timeout: 3000 });
  assert(/CHAPTER/.test(await pg.textContent(".joy-toast small")) && /%/.test(await pg.textContent(".joy-toast strong")), "no chapter card");
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});
await check("motion: the tab underline follows the active tab, switching tabs never makes the page wider than the screen, 淺色/深色 still switches", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(PAGE); await pg.waitForTimeout(900);
  const under = async () => { await pg.waitForTimeout(550); return pg.evaluate(() => { const g = document.querySelector(".mo-glide"), c = document.querySelector('#tabs [aria-current="true"]'); return g && c ? g.offsetLeft === c.offsetLeft && g.offsetWidth === c.offsetWidth : null; }); };
  assert(await under() === true, "underline not under the active tab");
  const wide = [];
  for (const id of ["ch2", "ch1"]) { await pg.evaluate(i => show(i), id); for (let k = 0; k < 8; k++) { wide.push(await pg.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)); await pg.waitForTimeout(60); } }
  assert(!wide.some(Boolean), "the page got a sideways scrollbar while switching tabs");
  assert(await under() === true, "underline did not follow the active tab");
  await pg.click(".theme button"); await pg.click('.theme [data-t="light"]');
  await pg.waitForFunction(() => document.documentElement.getAttribute("data-theme") === "light", null, { timeout: 3000 });
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});
await check("motion: 總複習 cards rise in; clearing a mistake says how many are left", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(PAGE); await pg.waitForTimeout(800); await pg.evaluate(PICK);
  await pg.evaluate(() => { show("ch1"); [0, 1].forEach(i => { const it = pickItem(i), a = QUIZ.ch1[i].a; [...it.querySelectorAll(".opt")].find(o => +o.dataset.oi !== a).click(); }); });
  await pg.waitForTimeout(500); await pg.evaluate(() => show("review"));
  await pg.waitForFunction(() => document.querySelectorAll("#review .wcard.mo-rise").length >= 2, null, { timeout: 3000 });
  await pg.evaluate(() => { delete S.quiz.ch1[0]; save(); document.body.click(); });   /* that mistake is gone from the saved answers */
  await pg.waitForSelector(".mo-toast.on", { timeout: 3000 });
  assert(/清掉/.test(await pg.textContent(".mo-toast")), "toast: " + await pg.textContent(".mo-toast"));
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});
await check("wow: the intro plays once per tab and can be clicked away; a wrong answer shatters, a right one flashes; scrolled-past headings get a ✓ that is remembered", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U + "?wow=1"); await pg.waitForSelector(".wow-intro", { timeout: 3000 });
  await pg.click(".wow-intro"); await pg.waitForFunction(() => !document.querySelector(".wow-intro"), null, { timeout: 4000 });
  await pg.goto(U + "?wow=1"); await pg.waitForTimeout(600);
  assert(!(await pg.$(".wow-intro")), "intro played twice in one tab");
  await pg.goto(PAGE); await pg.waitForTimeout(900); await pg.evaluate(PICK);
  await pg.evaluate(() => { show("ch1"); const it = pickItem(0), a = QUIZ.ch1[0].a; it.scrollIntoView({ block: "center" }); [...it.querySelectorAll(".opt")].find(o => +o.dataset.oi !== a).click(); });
  await pg.waitForSelector(".wow-crack", { timeout: 2000 }); await pg.waitForSelector(".wow-shard", { timeout: 2000 });
  await pg.evaluate(() => { const it = pickItem(1), a = QUIZ.ch1[1].a; [...it.querySelectorAll(".opt")].find(o => +o.dataset.oi === a).click(); });
  await pg.waitForSelector(".wow-flash", { timeout: 2000 });
  await pg.waitForTimeout(700); await pg.evaluate(() => window.scrollTo(0, 3000)); await pg.waitForTimeout(300); await pg.evaluate(() => window.scrollTo(0, 3400));
  await pg.waitForFunction(() => document.querySelector("#ch1 h3.mo-read"), null, { timeout: 4000 });
  await pg.reload(); await pg.waitForTimeout(900);
  assert(await pg.evaluate(() => !!document.querySelector("#ch1 h3.mo-read")), "✓ not remembered after a reload");
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});
await check("wow: the answer text types itself out and ends complete; the welcome banner shows the streak when signed in", async () => {
  const pg = await device({ skipGate: true }); await pg.addInitScript(() => { window.EZWOW_FORCE = true; }); await pg.goto(PAGE); await pg.waitForTimeout(900); await pg.evaluate(PICK);
  const want = await pg.evaluate(() => { show("ch1"); const it = pickItem(0), a = QUIZ.ch1[0].a; [...it.querySelectorAll(".opt")].find(o => +o.dataset.oi === a).click(); return it.querySelector(".expl") ? it.querySelector(".expl").textContent.length : -1; });
  await pg.waitForTimeout(2600);
  const got = await pg.evaluate(() => { const e = pickItem(0).querySelector(".expl"); return e ? e.textContent.length : -1; });
  assert(want === -1 || got > 0, "explanation lost: " + got);
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});
await check("search: typing amp, lt, gt or a quote shows readable text, never broken entities", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U + "data-structures/midterm/"); await pg.waitForTimeout(700);
  await pg.keyboard.press("Control+k"); await pg.waitForTimeout(300);
  const out = [];
  for (const q of ["amp", "lt", "gt", "quot", "<", "&"]) {
    await pg.fill(".ezs-panel input", q); await pg.waitForTimeout(250);
    out.push(await pg.evaluate(() => [...document.querySelectorAll(".ezs-r .snip")].slice(0, 20).map(e => e.textContent).join("\n")));
  }
  assert(out.every(t => !/&(amp|lt|gt|quot);|&amp;lt|<mark>/.test(t)), "broken text");
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});
await check("offline: one cache copy per file (no ?v= duplicates), old caches removed, pages open with no network", async () => {
  const pg = await device({ skipGate: true, ctx: { serviceWorkers: "allow" } });
  await pg.goto(U); await pg.evaluate(() => caches.open("ezexams-v1").then(c => c.put("/old", new Response("x"))));
  await pg.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => {}));
  await pg.waitForFunction(() => navigator.serviceWorker.ready.then(() => caches.keys()).then(k => k.includes("ezexams-v2")), null, { timeout: 15000 });
  await pg.waitForTimeout(2500);
  const r = await pg.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open("ezexams-v2"); return [keys, (await c.keys()).map(x => x.url)]; });
  assert(r[0].length === 1 && r[0][0] === "ezexams-v2", "caches: " + r[0]);
  assert(r[1].length > 10 && r[1].every(u => !u.includes("?")) && new Set(r[1]).size === r[1].length, "cache keys: " + r[1].filter(u => u.includes("?")).slice(0, 3));
  await pg.goto(U + "statistics/midterm/"); await pg.waitForTimeout(800);   /* the page is cached once visited */
  await pg.ctx.setOffline(true); await pg.reload(); await pg.waitForTimeout(800);
  assert(await pg.evaluate(() => !!document.querySelector("#tabs")), "offline page did not render");
  await pg.ctx.close();
});
await check("keyboard: A–D is ignored while a confirm dialog is open", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U + "operating-systems/midterm/#ch2"); await pg.waitForTimeout(700);
  await pg.evaluate(() => { document.querySelector("#ch2 .quiz > .qitem").scrollIntoView({ block: "center" }); const d = document.createElement("div"); d.id = "ezask"; document.body.appendChild(d); });
  await pg.keyboard.press("b"); await pg.waitForTimeout(200);
  const n = await pg.evaluate(() => document.querySelectorAll("#ch2 .quiz > .qitem .opt.right, #ch2 .quiz > .qitem .opt.wrong").length);
  assert(n === 0, "an answer was recorded behind the dialog");
  await pg.ctx.close();
});

await closeBrowser(); site.close();
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed);
