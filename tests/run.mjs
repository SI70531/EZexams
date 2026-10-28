/* EZexams checks. Run:  node tests/run.mjs        (needs: npm i playwright && npx playwright install chromium)
   Each check prints ✓ or ✗; the exit code is the number of failed checks. Nothing here touches the network. */
import { serve, device, closeBrowser, typePin, settle, gateUp, worker, resetWorker, gist, calls, setGemini } from "./harness.mjs";

const PORT = +process.env.PORT || 8871;
const site = serve(PORT), U = site.url;
const SUBJECTS = { statistics: "stats-midterm-v1", "operating-systems": "os-midterm-v1", "data-structures": "ds-midterm-v1", economics: "econ-midterm-v1" };
let failed = 0;
const results = [];
async function check(name, fn) {
  const t0 = Date.now();
  try { await fn(); results.push(["✓", name]); console.log("✓", name, `(${Date.now() - t0} ms)`); }
  catch (e) { failed++; results.push(["✗", name]); console.log("✗", name, "\n   ", (e && e.message || e).split("\n").join("\n    ")); }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };
const answered = (pg, key) => pg.evaluate(k => { const s = JSON.parse(localStorage.getItem(k) || "{}"); return Object.values(s.quiz || {}).reduce((a, c) => a + Object.keys(c || {}).length, 0); }, key);
const W = (path, init = {}, ip) => worker(new Request("https://w.test" + path, Object.assign({ headers: { origin: "https://si70531.github.io" } }, init)), ip);

/* ---------- Worker ---------- */
await check("Worker: AI proxy and sync refuse requests without a sign-in token", async () => {
  resetWorker();
  const a = await W("/v1beta/models/gemini-flash-latest:generateContent", { method: "POST", body: "{}" });
  const b = await W("/sync?key=os-midterm-v1");
  assert(a.status === 401 && b.status === 401, `got ${a.status} / ${b.status}`);
  assert(calls.gemini === 0, "Gemini was called");
});
await check("Worker: a signed-in token reaches Gemini and sync", async () => {
  resetWorker();
  const r = await (await W("/login", { method: "POST", body: JSON.stringify({ code: "4821", mode: "create" }) })).json();
  assert(r.token, "no token: " + JSON.stringify(r));
  const g = await W("/v1beta/models/gemini-flash-latest:generateContent?t=" + encodeURIComponent(r.token), { method: "POST", body: "{}" });
  assert(g.status === 200 && calls.gemini === 1, "gemini " + g.status);
  const p = await W("/sync", { method: "POST", body: JSON.stringify({ t: r.token, key: "os-midterm-v1", payload: { updatedAt: 1, data: { quiz: {} } } }) });
  assert(p.status === 200, "sync post " + p.status);
  const bad = await W("/sync?key=os-midterm-v1&t=" + encodeURIComponent(r.token.slice(0, -2) + "xx"));
  assert(bad.status === 401, "tampered token accepted");
});
await check("Worker: 5 wrong PINs lock that visitor out, others are unaffected", async () => {
  resetWorker();
  await W("/login", { method: "POST", body: JSON.stringify({ code: "4821", mode: "create" }) }, "9.9.9.9");
  const codes = [];
  for (const c of ["1111", "2222", "3333", "4444", "5555", "4821"]) codes.push((await W("/login", { method: "POST", body: JSON.stringify({ code: c, mode: "join" }) }, "6.6.6.6")).status);
  assert(codes.slice(0, 5).every(s => s === 404) && codes[5] === 429, "statuses " + codes.join(","));
  const other = await W("/login", { method: "POST", body: JSON.stringify({ code: "4821", mode: "join" }) }, "7.7.7.7");
  assert(other.status === 200, "other visitor " + other.status);
});
await check("Worker: /health and /errors answer", async () => {
  const h = await (await W("/health")).json();
  assert(h.github && h.github.ok && h.github.daysLeft > 1000 && h.gemini && h.gemini.ok, JSON.stringify(h));
  await W("/log", { method: "POST", body: JSON.stringify({ msg: "boom", src: "x.js:1", page: "/t" }) });
  const e = await (await W("/errors")).json();
  assert(e.errors.length === 1 && e.errors[0].msg === "boom", JSON.stringify(e));
});

/* ---------- pages ---------- */
for (const [sub] of Object.entries(SUBJECTS)) {
  await check(`${sub}: every tab opens without errors, no sideways scrolling on a phone`, async () => {
    const pg = await device({ skipGate: true, ctx: { viewport: { width: 390, height: 800 }, isMobile: true } });
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
await check("home: loads without errors", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U); await pg.waitForTimeout(500);
  assert(!pg.errs.length, pg.errs.join(" | ")); assert(await pg.locator(".ticket").count() >= 3, "tickets missing");
  await pg.ctx.close();
});

/* ---------- PIN gate, sync, merge ---------- */
const PAGE = U + "statistics/midterm/", KEY = SUBJECTS.statistics;
await check("gate: a new PIN starts at zero, answers sync to another device", async () => {
  resetWorker();
  const a = await device(); await a.goto(PAGE); await a.waitForTimeout(500);
  assert(await gateUp(a), "gate not shown");
  await a.click("#egSw"); await a.waitForTimeout(800); await typePin(a, 1, "4821"); await typePin(a, 2, "4821"); await settle(a);
  assert(!(await gateUp(a)), "still at the gate");
  await a.evaluate(() => { show("ch1"); [...document.querySelectorAll("#ch1 .quiz > .qitem")].slice(0, 3).forEach(it => it.querySelectorAll(".opt")[0].click()); });
  await a.waitForTimeout(9000);   /* uploads are spaced 7.2 s apart */
  const b = await device(); await b.goto(PAGE); await b.waitForTimeout(500);
  await typePin(b, 1, "4821"); await settle(b, 1800);
  assert(await answered(b, KEY) === 3, "device B has " + await answered(b, KEY));
  assert(!a.errs.length && !b.errs.length, [...a.errs, ...b.errs].join(" | "));
  await a.ctx.close(); await b.ctx.close();
});
await check("gate: wrong PIN shakes and clears; 5 wrong ones lock with a message", async () => {
  const pg = await device({ ip: "5.5.5.5" }); await pg.goto(PAGE); await pg.waitForTimeout(500);
  for (const c of ["1357", "2468", "3579", "1470", "2580"]) { await typePin(pg, 1, c); await pg.waitForTimeout(700); }
  await typePin(pg, 1, "9753"); await pg.waitForTimeout(700);
  const msg = await pg.textContent("#egMsg"), cells = await pg.evaluate(() => [...document.querySelectorAll('.eg-cells[data-row="1"] input')].map(x => x.value).join(""));
  assert(/錯太多次/.test(msg), "message: " + msg); assert(cells === "", "cells not cleared: " + cells);
  await pg.ctx.close();
});
await check("gate: switching to another PIN asks before clearing this device's answers", async () => {
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await typePin(pg, 1, "4821"); await settle(pg, 1500);
  const n0 = await answered(pg, KEY); assert(n0 === 3, "expected 3 answers, got " + n0);
  await pg.click("#ezOut"); await pg.waitForTimeout(600);
  await pg.click("#egSw"); await pg.waitForTimeout(800); await typePin(pg, 1, "6283"); await typePin(pg, 2, "6283"); await pg.waitForTimeout(1500);
  const msg = await pg.textContent("#egMsg"); assert(/會被清掉/.test(msg), "no question: " + msg);
  await pg.click("#egMsg >> text=取消"); await pg.waitForTimeout(600);
  assert(await answered(pg, KEY) === 3, "answers gone after cancel");
  await pg.ctx.close();
});
await check("sync: logging out right after answering still uploads the answer", async () => {
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await typePin(pg, 1, "4821"); await settle(pg, 1500);
  await pg.evaluate(() => { show("ch2"); document.querySelector("#ch2 .quiz > .qitem .opt").click(); });
  await pg.waitForTimeout(300); await pg.click("#ezOut"); await pg.waitForTimeout(2500);
  const f = Object.entries(gist.files).find(([n]) => n.endsWith("--" + KEY + ".json"));
  const data = JSON.parse(f[1].content).data;
  assert(data.quiz && data.quiz.ch2 && Object.keys(data.quiz.ch2).length === 1, "ch2 not uploaded: " + JSON.stringify(data.quiz));
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
await check("AI grading without signing in falls back to keyword grading", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U + "operating-systems/midterm/#ch1"); await pg.waitForTimeout(600);
  const r = await pg.evaluate(async () => { const q = document.querySelector("#ch1 .chw .exq"); const ta = q.querySelector("textarea");
    ta.value = "an intermediary between the user and the hardware"; ta.dispatchEvent(new Event("input")); q.querySelector(".grade").click();
    for (let i = 0; i < 40 && !/關鍵字/.test(q.querySelector(".gstat").textContent); i++) await new Promise(z => setTimeout(z, 100));
    return q.querySelector(".gstat").textContent; });
  assert(/PIN/.test(r) && /關鍵字/.test(r), "status: " + r);
  await pg.ctx.close();
});

await closeBrowser(); site.close();
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed);
