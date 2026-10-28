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
await check("Worker: only the site's Gemini models; IPv6 neighbours share one wrong-PIN count", async () => {
  resetWorker();
  const r = await (await W("/login", { method: "POST", body: JSON.stringify({ code: "4821", mode: "create" }) })).json();
  const pro = await W("/v1beta/models/gemini-2.5-pro:generateContent?t=" + encodeURIComponent(r.token), { method: "POST", body: "{}" });
  assert(pro.status === 404 && calls.gemini === 0, "other model " + pro.status);
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await W("/login", { method: "POST", body: JSON.stringify({ code: "100" + i, mode: "join" }) }, "2001:db8:1:2::" + (i + 1).toString(16))).status);
  assert(codes[5] === 429, "IPv6 rotation not counted: " + codes.join(","));
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
  await a.waitForTimeout(34000);   /* uploads: at most one every 30 s per browser */
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
  await pg.click("#ezOut"); await pg.click("#ezask .yes"); await pg.waitForTimeout(600);
  await pg.click("#egSw"); await pg.waitForTimeout(800); await typePin(pg, 1, "6283"); await typePin(pg, 2, "6283"); await pg.waitForTimeout(1500);
  const msg = await pg.textContent("#egMsg"); assert(/會被清掉/.test(msg), "no question: " + msg);
  await pg.click("#egMsg >> text=取消"); await pg.waitForTimeout(600);
  assert(await answered(pg, KEY) === 3, "answers gone after cancel");
  await pg.ctx.close();
});
await check("登出 asks first; 取消 keeps you signed in", async () => {
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await typePin(pg, 1, "4821"); await settle(pg, 1500);
  await pg.click("#ezOut"); await pg.waitForTimeout(200);
  assert(await pg.locator("#ezask").count() === 1, "no confirm dialog");
  await pg.screenshot({ path: process.env.SHOT || "/dev/null" }).catch(() => {});
  await pg.click("#ezask .no"); await pg.waitForTimeout(300);
  assert(await pg.evaluate(() => EZSync.connected()) && !(await gateUp(pg)), "signed out after cancel");
  await pg.ctx.close();
});
await check("sync: logging out right after answering still uploads the answer", async () => {
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await typePin(pg, 1, "4821"); await settle(pg, 1500);
  await pg.evaluate(() => { show("ch2"); document.querySelector("#ch2 .quiz > .qitem .opt").click(); });
  await pg.waitForTimeout(300); await pg.click("#ezOut"); await pg.click("#ezask .yes"); await pg.waitForTimeout(2500);
  const f = Object.entries(gist.files).find(([n]) => n.endsWith("--" + KEY + ".json"));
  const data = JSON.parse(f[1].content).data;
  assert(data.quiz && data.quiz.ch2 && Object.keys(data.quiz.ch2).length === 1, "ch2 not uploaded: " + JSON.stringify(data.quiz));
  await pg.ctx.close();
});
await check("sync: an upload keeps answers another device made in the meantime", async () => {
  resetWorker(); await W("/login", { method: "POST", body: JSON.stringify({ code: "4821", mode: "create" }) });
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await typePin(pg, 1, "4821"); await settle(pg, 1500);
  /* this device answers ch2; before it uploads, another device answers ch3 #0 and uploads an older-stamped copy */
  await pg.evaluate(() => { show("ch2"); document.querySelector("#ch2 .quiz > .qitem .opt").click(); });
  await pg.waitForTimeout(300);
  const name = Object.keys(gist.files).find(n => n.endsWith("--meta.json")).replace("meta", KEY);
  const now = Date.now();
  gist.files[name] = { filename: name, content: JSON.stringify({ updatedAt: now - 60000, data: { quiz: { ch3: { 0: 1 } }, qat: { ch3: { 0: now - 60000 } } } }) };
  await pg.click("#ezOut"); await pg.click("#ezask .yes"); await pg.waitForTimeout(2500);
  const up = JSON.parse(gist.files[name].content).data;
  assert(up.quiz.ch2 && up.quiz.ch3 && up.quiz.ch3[0] === 1, "lost the other device's answer: " + JSON.stringify(up.quiz));
  await pg.ctx.close();
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
await check("PIN cells: number pad (masked text field), 顯示 reveals the digits", async () => {
  const pg = await device(); await pg.goto(PAGE); await pg.waitForTimeout(500);
  await typePin(pg, 1, "12");
  const r = await pg.evaluate(() => { const x = document.querySelector("#ezgate .eg-cell input"); const a = [x.type, x.inputMode, getComputedStyle(x).webkitTextSecurity];
    document.getElementById("egEye").click(); return a.concat(getComputedStyle(x).webkitTextSecurity, x.value); });
  assert(r[0] === "text" && r[1] === "numeric" && r[2] === "disc" && r[3] === "none" && r[4] === "1", JSON.stringify(r));
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
  assert(/PIN/.test(r[0]) && /重試/.test(r[0]) && r[1] === true && r[2] === "none", JSON.stringify(r));
  await pg.ctx.close();
});
await check("chapter-end written: AI grades from the notes, shows its own ANSWER (EN + 中文); 看 AI 解答 works without answering", async () => {
  resetWorker(); const prompts = [];
  setGemini(body => { const t = JSON.stringify(body); prompts.push(t); const ids = [...new Set(t.match(/ch1w-\d+/g) || [])];
    const grading = /student_answer/.test(t);
    return { candidates: [{ content: { parts: [{ text: JSON.stringify(ids.map(id => grading ? { id, score: 1, verdict: "partial", feedback: "部分", missing: [], answer_en: "EN " + id, answer_zh: "中 " + id } : { id, answer_en: "EN " + id, answer_zh: "中 " + id })) }] } }] }; });
  const pg = await device(); await pg.goto(U + "operating-systems/midterm/"); await pg.waitForTimeout(500);
  await pg.click("#egSw"); await pg.waitForTimeout(800); await typePin(pg, 1, "8462"); await typePin(pg, 2, "8462"); await settle(pg, 1500);
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
    await pg.click("#egSw"); await pg.waitForTimeout(800); await typePin(pg, 1, "8462"); await typePin(pg, 2, "8462"); await settle(pg, 1500);
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
  await pg.click("#egSw"); await pg.waitForTimeout(800); await typePin(pg, 1, "3917"); await typePin(pg, 2, "3917"); await settle(pg, 1500);
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
  await pg.click("#egSw"); await pg.waitForTimeout(800); await typePin(pg, 1, "7351"); await typePin(pg, 2, "7351"); await settle(pg, 1500);
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
  await pg.click("#egSw"); await pg.waitForTimeout(800); await typePin(pg, 1, "6194"); await typePin(pg, 2, "6194"); await settle(pg, 1500);
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
await check("keyboard: A–D answers the question on screen, ← → moves between tabs; 減少動畫 switch works", async () => {
  const pg = await device({ skipGate: true }); await pg.goto(U + "operating-systems/midterm/#ch2"); await pg.waitForTimeout(700);
  await pg.evaluate(() => { const q = document.querySelector("#ch2 .quiz > .qitem"); q.scrollIntoView({ block: "center" }); });
  await pg.waitForTimeout(200); await pg.keyboard.press("b"); await pg.waitForTimeout(200);
  const picked = await pg.evaluate(() => { const q = document.querySelector("#ch2 .quiz > .qitem"); return [...q.querySelectorAll(".opt")].findIndex(o => o.classList.contains("right") || o.classList.contains("wrong")); });
  assert(picked >= 0, "no option chosen by key B");
  await pg.focus('#tabs [data-go="ch2"]'); await pg.keyboard.press("ArrowRight"); await pg.waitForTimeout(200);
  assert(await pg.evaluate(() => !document.getElementById("ch3").hidden), "ArrowRight did not open Ch3");
  await pg.click("#themeBtn"); await pg.click('#themeMenu [data-m="calm"]');
  assert(await pg.evaluate(() => document.documentElement.classList.contains("ezcalm") && localStorage.getItem("ezexams-motion") === "calm"), "calm not applied");
  assert(!pg.errs.length, pg.errs.join(" | "));
  await pg.ctx.close();
});

await closeBrowser(); site.close();
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed);
