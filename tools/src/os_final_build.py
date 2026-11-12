"""Builds operating-systems/final/ (index.html, app.js, quiz.js) from tools/src/os-final/chN.html (the notes),
written.py (the written questions) and widgets.js (the interactive figures). Run: python3 tools/src/os_final_build.py
Then, if tools/bank.json was updated: BANK_KEY=... python3 tools/bank.py encrypt"""
import json, re, html, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from written import W

REPO = os.path.dirname(os.path.dirname(HERE))
MID = REPO + "/operating-systems/midterm"
OUT = REPO + "/operating-systems/final"
os.makedirs(OUT, exist_ok=True)
lines = open(MID + "/index.html", encoding="utf-8").read().split("\n")

# ---------- written blocks ----------
def plain(s):
    return html.unescape(re.sub(r"<[^>]+>", "", s))

KEYS_MORE = {}
BANK_W = {}
def chw(ch):
    qs = W[ch]
    short = [q for q in qs if q[0] == 2]
    essay = [q for q in qs if q[0] != 2]
    etot = sum(q[0] for q in essay)
    total = 2 * len(short) + etot
    key = ch + "w"
    h1 = "I. Short Answer (%d questions, 2 pts each, %d pts total)" % (len(short), 2 * len(short))
    h2 = "II. Essay (%d questions, %d pts total)" % (len(essay), etot)
    out = ['<div class="exam chw" data-exam="%s">' % key,
           "<h2>Short Answer &amp; Essay (%d pts)</h2>" % total,
           '<div class="examtools"><span class="score"></span><span class="timer" hidden></span><button class="btn tbtn" type="button" hidden>Start timer</button><button class="btn primary gradeall" type="button">Grade all</button><button class="btn reset" type="button">Clear answer</button><span class="gmsg"></span></div><p class="box tip nogradenote">This uses keyword matching for automatic grading: you get credit for including the required terms (English or Chinese) or numbers. The score is only a reference; always open the reference answer to compare.</p>']
    bank = []
    n = 0
    for part, head, group, pre in ((1, h1, short, "S"), (2, h2, essay, "E")):
        out.append("<h3>%s</h3>" % head)
        for j, (pts, q, en, zh, keys) in enumerate(group, 1):
            n += 1
            qid = "%s-%d" % (key, n)
            lab = "%s%d · %g" % (pre, j, pts)
            rows = 3 if pts == 2 else 5
            out.append('<div class="exq" id="%s" data-pts="%g"><div class="qtext"><p class="q"><span class="pts">%s</span>%s</p></div><label class="small" for="%s-a">Your answer</label><textarea id="%s-a" rows="%d" placeholder="Write your answer here (English or Chinese is fine)"></textarea><div class="gradebar"><button class="btn grade" type="button">Grade this question</button><span class="gstat"></span></div><div class="gres" hidden></div><details class="qa"><summary>Show reference answer</summary><div class="inner">' % (qid, pts, lab, q, qid, qid, rows))
            out.append('<div class="box en"><span class="lbl">ANSWER</span>%s<div class="zhtr"><span>中文</span>%s</div></div>' % (en, zh))
            out.append("</div></details></div>")
            tw = sum(k[0] for k in keys)
            KEYS_MORE[qid] = [{"w": round(k[0] * pts / tw, 4), "re": k[1], "k": plain(k[2])} for k in keys]
            bank.append({"l": lab, "q": plain(q), "r": "ANSWER\n" + plain(en) + "\n中文\n" + plain(zh), "p": pts, "c": head})
    out.append("</div>")
    BANK_W["w:" + key] = bank
    return "\n".join(out)

chapters = []
for c in ("ch6", "ch7", "ch8"):
    t = open(os.path.join(HERE, "os-final", "%s.html" % c), encoding="utf-8").read()
    t = t.replace("<!--CHW%s-->" % c[2], chw(c))
    chapters.append(t)

# ---------- head ----------
head = "\n".join(lines[:133])
desc = "作業系統期末考衝刺：Silberschatz 9th Ch6 to Ch8 講義（記憶體管理、虛擬記憶體、大量儲存）、每章選擇題與簡答申論，寫完直接批改。"
head = head.replace("<title>Operating Systems midterm prep｜EZexams</title>", "<title>Operating Systems final prep｜EZexams</title>")
head = head.replace('content="Operating Systems midterm prep｜EZexams"', 'content="Operating Systems final prep｜EZexams"')
head = re.sub(r'(<meta (?:name|property)="(?:og:)?description" content=")[^"]*"', lambda m: m.group(1) + desc + '"', head)
head = head.replace("operating-systems/midterm/", "operating-systems/final/")
head = head.replace('<script src="../../assets/ezplan.js?v=d1988ff1" defer></script>\n', "")
extra_css = """<style>
:root{--lit-rgba-255-255-255-65:rgba(255,255,255,.65);--lit-rgba-255-255-255-62:rgba(255,255,255,.62);--lit-rgba-255-255-255-28:rgba(255,255,255,.28);--lit-rgba-40-50-90-12:rgba(40,50,90,.12);--lit-rgba-255-255-255-7:rgba(255,255,255,.7);--lit-rgba-60-70-140-22:rgba(60,70,140,.22);--lit-rgba-255-255-255-8:rgba(255,255,255,.8);--lit-rgba-90-100-200-12:rgba(90,100,200,.12);--lit-rgba-255-255-255-5:rgba(255,255,255,.5)}
.algmenu{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;margin:14px 0 26px}
.algmenu[hidden],.algp[hidden]{display:none}
.algcard{position:relative;overflow:hidden;display:grid;grid-template-columns:1fr auto;grid-template-areas:"an sl" "t t" "z z";align-items:center;gap:8px 10px;text-align:left;padding:14px 16px 16px;border:1px solid var(--lit-rgba-255-255-255-65);border-radius:16px;background:linear-gradient(145deg,var(--lit-rgba-255-255-255-62),var(--lit-rgba-255-255-255-28));-webkit-backdrop-filter:blur(14px) saturate(1.4);backdrop-filter:blur(14px) saturate(1.4);color:var(--ink);font:inherit;cursor:pointer;box-shadow:0 6px 22px var(--lit-rgba-40-50-90-12),inset 0 1px 0 var(--lit-rgba-255-255-255-7);transition:transform .18s,border-color .18s}
.algcard::before{content:"";position:absolute;left:0;top:14px;bottom:14px;width:4px;border-radius:0 4px 4px 0;background:var(--indigo)}
.algcard::after{content:"→";position:absolute;right:14px;bottom:10px;font-size:calc(18px*var(--ts,1));color:var(--indigo);opacity:0;transform:translateX(-6px);transition:.18s}
.algcard:hover,.algcard:focus-visible{transform:translateY(-3px);box-shadow:0 12px 30px var(--lit-rgba-60-70-140-22),inset 0 1px 0 var(--lit-rgba-255-255-255-8);border-color:var(--indigo);outline:none}
.algcard:hover::after,.algcard:focus-visible::after{opacity:1;transform:none}
.algcard:active{transform:translateY(0)}
.algcard .an{grid-area:an;justify-self:start;font-family:var(--f-mono);font-size:calc(12px*var(--ts,1));font-weight:700;letter-spacing:.3px;color:var(--indigo);background:var(--lit-rgba-90-100-200-12);padding:3px 10px;border-radius:999px}
.algcard .sl{grid-area:sl}
.algcard b{grid-area:t;font-size:calc(18px*var(--ts,1));line-height:1.3}
.algcard .zhn2{grid-area:z;font-size:calc(13px*var(--ts,1));color:var(--muted);padding-right:22px}
:root[data-theme="dark"] .algcard{background:var(--paper2);border-color:var(--line)}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .algcard{background:var(--paper2);border-color:var(--line)}}
.algback{margin:28px 0 8px;padding-top:16px;border-top:2px dotted var(--line-strong);text-align:center}
.algback .btn{font-size:calc(15px*var(--ts,1));padding:10px 22px}
.alg{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px;margin:34px 0 10px;padding:8px 12px;border:1.5px solid var(--ink);border-left-width:6px;border-radius:6px;background:var(--paper);font-size:calc(18px*var(--ts,1))}
.alg .an{font-family:var(--f-mono);font-size:calc(13px*var(--ts,1));font-weight:700;background:var(--ink);color:var(--paper);padding:2px 8px;border-radius:4px}
.sl{display:inline-block;font-family:var(--f-mono);font-size:calc(11px*var(--ts,1));font-weight:500;color:var(--muted);border:1px solid var(--line-strong);border-radius:4px;padding:0 6px;margin-left:6px;vertical-align:2px;letter-spacing:0;white-space:nowrap}
:root table.refstr{width:100%;table-layout:fixed;font-family:var(--f-mono)}
table.refstr tr>:first-child{width:3.6em}
table.refstr th,table.refstr td{padding:4px 2px!important;text-align:center;font-size:calc(13px*var(--ts,1))}
table.refstr tr:first-child th,table.refstr tr:first-child td{font-weight:700;background:var(--indigo-soft)}
details.box>summary{cursor:pointer;font-weight:700}
.scope{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin:12px 0 20px}
.scope .c{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--paper)}
.scope .c b{display:block;font-size:calc(16px*var(--ts,1));margin-bottom:4px}
</style>"""
head = head.replace("</head>", extra_css + "\n</head>", 1)

home = """<section role="tabpanel" class="view" id="home">
  <div class="vhead"><div class="pcb" data-pcb="home" role="img"></div><p class="vmeta">Final: <span data-examdate>TBA</span></p><h1>Operating Systems final prep</h1>
  <p>Silberschatz, Operating System Concepts 9th ed. For now the page covers the three chapters below; the exam scope and date are not set yet. More chapters and past exams will be added when they are available.</p></div>
  <div class="next" id="nextStep"></div>
  <h3>Chapters so far</h3>
  <div class="scope">
  <div class="c"><b>Ch6 Memory management</b>Address binding, swapping, first / best / worst fit, fragmentation, segmentation, paging, TLB and EAT, page-table structures.<br><button class="btn" data-go="ch6">Ch6</button></div>
  <div class="c"><b>Ch7 Virtual memory</b>Demand paging, page faults, copy-on-write, FIFO / OPT / LRU, frame allocation, thrashing, working sets, buddy and slab.<br><button class="btn" data-go="ch7">Ch7</button></div>
  <div class="c"><b>Ch8 Mass storage</b>Disk timing, NAS and SAN, FCFS / SSTF / SCAN / C-SCAN / LOOK / C-LOOK, RAID levels, stable storage.<br><button class="btn" data-go="ch8">Ch8</button></div>
  </div>
  <h3>Progress</h3>
  <table class="prog" id="progTable"></table>
  <p class="small" id="storeNote">Scores are stored only in this device's browser. Switching devices or clearing browsing data resets them to zero.</p>
  <h3>How to read each chapter</h3>
  <div class="box zh"><span class="lbl">Box types</span><b>Green boxes</b> are plain-language Chinese; <b>blue boxes</b> are English answers you can copy onto the exam, memorize first; <b>yellow and red boxes</b> mark common point deductions. ★★★ marks topics that almost always appear.</div>
  <div class="box tip"><span class="lbl">Answer tips</span><ul>
  <li>Write in English. For "list" questions, just list the terms; add a short explanation if you have time.</li>
  <li>Always show your work on calculation questions (page replacement, EAT, disk scheduling): formula → numbers → answer. Even a wrong answer can earn partial credit for the work.</li>
  <li>For disk scheduling, always write the head direction and whether you count the return trip.</li></ul></div>
</section>
"""

traps = '<section role="tabpanel" class="view" id="traps" hidden><div class="vhead"><h1>Summary &amp; Common Traps<span class="zhn">各章總結與易錯點</span></h1><p>Every chapter\'s summary and common traps on one page, in chapter order. Read this the night before.<span class="zhn">把每一章的總結和易錯點集中在同一頁，照章節順序排列。考前一晚看這頁。</span></p></div><div id="trapsBody"></div></section>'

tail_i = lines.index("</main>")
tail = "\n".join(lines[tail_i:])
tail = tail.replace('data-key="os-midterm-v1"', 'data-key="os-final-v1"')

page = head + "\n\n" + home + "\n" + "\n".join(chapters) + "\n" + traps + "\n\n" + tail
open(OUT + "/index.html", "w", encoding="utf-8").write(page)

# ---------- quiz.js ----------
quiz = """/* operating-systems final question bank (QUIZ).
   The chapter exercises are AI practice: questions are made one at a time from the chapter notes by the Worker and each answer is
   revealed only after you answer. Here each set only keeps how many slots it has (progress is saved by slot position, so these
   counts must not change). */
const EZSTUB=n=>Array.from({length:n},()=>({}));
const QUIZ = {
 "ch6":EZSTUB(20),
 "ch7":EZSTUB(20),
 "ch8":EZSTUB(20)
};

/* Keyword rules for each chapter's Short Answer and Essay questions (used when Gemini grading is not available). */
const KEYS_MORE=""" + json.dumps(KEYS_MORE, ensure_ascii=False) + ";\n"
open(OUT + "/quiz.js", "w", encoding="utf-8").write(quiz)

# ---------- bank ----------
bp = REPO + "/tools/bank.json"   # plain copy, see tools/bank.py; skipped when it is not decrypted on this machine
raw = open(bp, encoding="utf-8").read() if os.path.exists(bp) else None
if raw is not None:
    bank = json.loads(raw)
    bank["osf"] = BANK_W
    open(bp, "w", encoding="utf-8").write(json.dumps(bank, ensure_ascii=False, separators=(",", ":")))

# ---------- app.js ----------
a = open(MID + "/app.js", encoding="utf-8").read()
def rep(old, new, count=1):
    global a
    assert a.count(old) >= 1, old[:80]
    a = a.replace(old, new) if count == 0 else a.replace(old, new, count)
rep("/* operating-systems midterm page logic", "/* operating-systems final page logic")
a = re.sub(r'const VIEWS=\[.*?\];', 'const VIEWS=[["home","Home"],["ch6","Ch6 Memory"],["ch7","Ch7 Virtual Mem"],["ch8","Ch8 Storage"],["traps","Summary & traps"]];', a, count=1)
rep('const KEY="os-midterm-v1";', 'const KEY="os-final-v1";')
a = re.sub(r"/\* 2026-10-26: some ch1/ch2/ch5.*?\n\(function\(\)\{const MIG=.*?\n.*?save\(\);\}\)\(\);\n", "", a, count=1, flags=re.S)
rep('const PID={home:0,ch1:1,ch2:2,ch3:3,ch4:4,ch5:5,past:6,"mock-a":7,"mock-b":8,review:9};', 'const PID={home:0,ch6:6,ch7:7,ch8:8,traps:9,review:10};')
rep('const c=["ch1","ch2","ch3","ch4","ch5"].filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:5};', 'const c=["ch6","ch7","ch8"].filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:3};')
rep('EZGEN.attach({course:"Operating Systems",s:"os",ai:["ch1","ch2","ch3","ch4","ch5"]', 'EZGEN.attach({course:"Operating Systems",s:"osf",ai:["ch6","ch7","ch8"]')
rep('window.EZLAST={ch:"ch5",label:"Start past exam",go:"past"};', 'window.EZLAST={ch:"ch8",label:"Summary & traps",go:"traps"};')
a = re.sub(r"const KEYS=\{\n.*?\n\};\n", "const KEYS={};\n", a, count=1, flags=re.S)
rep("Operating Systems midterm exam", "Operating Systems final exam")
# widgets
i0 = a.index("/* ---------- interactive figures ---------- */")
i1 = a.index('document.querySelectorAll(".widget[data-w]")')
i1 = a.index("\n", i1) + 1
a = a[:i0] + open(os.path.join(HERE, "widgets.js"), encoding="utf-8").read() + a[i1:]
# home
rep('[["ch1","Ch1 chapter exercises"],["ch2","Ch2 chapter exercises"],["ch3","Ch3 chapter exercises"],["ch4","Ch4 chapter exercises"],["ch5","Ch5 chapter exercises"]]', '[["ch6","Ch6 chapter exercises"],["ch7","Ch7 chapter exercises"],["ch8","Ch8 chapter exercises"]]')
a = re.sub(r'  \[\["past","Last year\'s past exam"\].*?\n  \}\);\n', "", a, count=1, flags=re.S)
rep('"Write "+next[1]+" (60 min; press “Grade all” when done)"', '"Do "+next[1]')
rep("All done. The day before the exam, read the Review cheat notes and must-draw diagrams, then get some sleep.", "All chapters done. Read the Summary & traps tab the night before the exam.")
# written blocks
a = re.sub(r'EZgenw\.attach\(\{course:"Operating Systems",subject:"operating-systems",s:"os",get:\(\)=>S,save:\(\)=>save\(\),blocks:\[\n.*?\n  \]\.filter',
           'EZgenw.attach({course:"Operating Systems",subject:"operating-systems",s:"osf",get:()=>S,save:()=>save(),blocks:[\n'
           '    blk("ch6w","ch6",["ch6"],document.querySelector(\'[data-exam="ch6w"]\')),\n'
           '    blk("ch7w","ch7",["ch7"],document.querySelector(\'[data-exam="ch7w"]\')),\n'
           '    blk("ch8w","ch8",["ch8"],document.querySelector(\'[data-exam="ch8w"]\'))\n  ].filter', a, count=1, flags=re.S)
open(OUT + "/app.js", "w", encoding="utf-8").write(a)
print("ok", len(page), len(a), len(KEYS_MORE))
