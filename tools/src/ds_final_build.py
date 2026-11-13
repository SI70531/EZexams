"""Builds data-structures/final/ (index.html, app.js, quiz.js) from tools/src/ds-final/chN.html (the notes) and
ds_labs.js (the interactive figures), using data-structures/midterm/ as the page template.
Run: python3 tools/src/ds_final_build.py
Add a chapter: write tools/src/ds-final/chN.html (end it with <!--CHWN--> after its quiz div) and add it to CHAPTERS below."""
import re, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
MID = REPO + "/data-structures/midterm"
OUT = REPO + "/data-structures/final"
os.makedirs(OUT, exist_ok=True)

# (id, tab label, card title, card text)
CHAPTERS = [
    ("ch3", "Ch3 Lists (3-4+)", "Ch3 Linked Lists, 3-4 to 3-6", "From slide 68: the build-list program (menu, addNode, removeNode, printList), testing, append lists, array of lists, circularly, doubly and multilinked lists."),
    ("ch4", "Ch4 Stacks", "Ch4 Stacks", "Push, pop and stack top; the linked-list stack and its eight algorithms; reversing, parsing, infix to postfix, postfix evaluation, backtracking; array implementation."),
]
IDS = [c[0] for c in CHAPTERS]
src = open(MID + "/index.html", encoding="utf-8").read()
lines = src.split("\n")

# ---------- chapter-end written block: same slots as the midterm's Ch3 block, filled by AI (assets/ezgenw.js) ----------
m = re.search(r'<div class="exam chw" data-exam="ch3w">.*?\n</div>\n(?=</section>)', src, re.S)
assert m, "ch3w block not found"
CHW = m.group(0).rstrip("\n")

chapters = []
for c in IDS:
    t = open(os.path.join(HERE, "ds-final", c + ".html"), encoding="utf-8").read()
    t = t.replace("<!--CHW%s-->" % c[2:], CHW.replace("ch3w", c + "w"))
    chapters.append(t)

# ---------- head ----------
hi = lines.index('<section role="tabpanel" class="view" id="home">')
head = "\n".join(lines[:hi])
desc = "資料與檔案結構期末考衝刺：Gilberg & Forouzan Ch4 Stacks 講義、互動圖、選擇題與手寫題練習（範圍與日期未定，之後再加章節與考古題）。"
head = head.replace("資料結構期中衝刺｜EZexams", "資料結構期末衝刺｜EZexams")
head = re.sub(r'(<meta (?:name|property)="(?:og:)?description" content=")[^"]*"', lambda mm: mm.group(1) + desc + '"', head)
head = head.replace("data-structures/midterm/", "data-structures/final/")
head = re.sub(r'<script src="../../assets/ezplan.js[^"]*" defer></script>\n', "", head)

cards = "\n".join('  <div class="c"><b>%s</b>%s<br><button class="btn" data-go="%s">%s</button></div>' % (t, d, i, i.capitalize()) for i, _, t, d in CHAPTERS)
home = """<section role="tabpanel" class="view" id="home">
  <div class="vhead"><div class="pcb" data-pcb="home" role="img"></div><p class="vmeta">Final: <span data-examdate>TBA</span></p><h1>Data &amp; File Structures final prep</h1>
  <p>Gilberg &amp; Forouzan, Data Structures: A Pseudocode Approach (Prof. Su Kun-Liang's slides). The exam scope and date are not set yet; for now the page covers the chapters below. More chapters and past exams will be added when they are available.</p></div>
  <div class="countdown" id="countdown"></div>
  <div class="next" id="nextStep"></div>
  <h3>Chapters so far</h3>
  <div class="scope">
%s
  </div>
  <h3>Progress</h3>
  <table class="prog" id="progTable"></table>
  <p class="small">Answers and scores are saved only in this device's browser. Switching devices or clearing browsing data resets them.</p>
  <h3>How to study each chapter</h3>
  <div class="box zh"><span class="lbl">Markers</span>The notes follow the slide order. The slide number next to each heading lets you check the PDF; italic English is the slide wording. Boxes marked “Interactive” can be used hands-on. <mark>Highlighted</mark> text is wording or code to memorize first. ★★★ marks the most important sections. <b>Red boxes</b> mark common point deductions.</div>
  <div class="box tip"><span class="lbl">Answer tips</span><ul>
  <li>Multiple-choice options often change one or two words of the slide sentence (e.g., stack top <b>does not</b> delete the node); read carefully for NOT.</li>
  <li>For infix to postfix and postfix evaluation, write the stack after every token; the trace earns partial credit even if the final answer is wrong.</li>
  <li>Write pointer fill-ins with <code>-&gt;</code>, and in pushStack link the new node to the old top before moving top.</li></ul></div>
</section>
""" % cards

traps = '<section role="tabpanel" class="view" id="traps" hidden><div class="vhead"><h1>Summary &amp; Common Traps<span class="zhn">各章總結與易錯點</span></h1><p>Every chapter\'s summary and common traps on one page, in chapter order. Read this the night before.<span class="zhn">把每一章的總結和易錯點集中在同一頁，照章節順序排列。考前一晚看這頁。</span></p></div><div id="trapsBody"></div></section>'

scope_css = """<style>
.scope{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;margin:12px 0 20px}
.scope .c{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--paper)}
.scope .c b{display:block;font-size:calc(16px*var(--ts,1));margin-bottom:4px}
</style>"""
head = head.replace("</head>", scope_css + "\n</head>", 1)

ti = lines.index("</main>")
tail = "\n".join(lines[ti:])
tail = tail.replace('data-key="ds-midterm-v1"', 'data-key="ds-final-v1"')
tail = tail.replace("MC 40 + Fill-in Questions 20 + Quiz 40 = 100, like the exam", "MC 40 + Fill-in Questions 20 + Quiz 40 = 100, like the midterm")

page = head + "\n" + home + "\n" + "\n".join(chapters) + "\n" + traps + "\n\n" + tail
open(OUT + "/index.html", "w", encoding="utf-8").write(page)

# ---------- quiz.js ----------
quiz = """/* data-structures final question bank (QUIZ).
   The chapter exercises are AI practice: questions are made one at a time from the chapter notes by the Worker and each answer is
   revealed only after you answer. Here each set only keeps how many slots it has (progress is saved by slot position, so these
   counts must not change). */
const EZSTUB=n=>Array.from({length:n},()=>({}));
const QUIZ = {
""" + ",\n".join(' "%s":EZSTUB(20)' % c for c in IDS) + "\n};\n"
open(OUT + "/quiz.js", "w", encoding="utf-8").write(quiz)

# ---------- app.js ----------
a = open(MID + "/app.js", encoding="utf-8").read()
def rep(old, new):
    global a
    assert old in a, old[:90]
    a = a.replace(old, new, 1)
def sub(pat, new, flags=0):
    global a
    a2 = re.sub(pat, new, a, count=1, flags=flags)
    assert a2 != a, pat[:90]
    a = a2
Q = lambda xs: ",".join('"%s"' % x for x in xs)
rep("/* data-structures midterm page logic", "/* data-structures final page logic (generated by tools/src/ds_final_build.py from the midterm's app.js)")
sub(r"const VIEWS=\[.*?\];", "const VIEWS=[" + ",".join('["%s","%s"]' % (i, l) for i, l, _, _ in [("home", "Home", 0, 0)] + CHAPTERS) + ',["traps","Summary & traps"]];')
sub(r"const EXMC=\{.*?\};", "const EXMC={};")
sub(r"const CHAPTERS=\[.*?\];", "const CHAPTERS=[" + Q(IDS) + "];")
sub(r"const EXAMS=\[.*?\];", "const EXAMS=[];")
rep("const EXAM_DAY=(window.EZDATES&&EZDATES.day())||new Date(2026,10,6);", "const EXAM_DAY=(window.EZDATES&&EZDATES.day())||null;")
rep("const EXAM_TAG='<span class=\"cdk\">EXAM '+(EXAM_DAY.getMonth()+1)+'/'+EXAM_DAY.getDate()+'</span>';",
    "const EXAM_TAG='<span class=\"cdk\">EXAM '+(EXAM_DAY?(EXAM_DAY.getMonth()+1)+'/'+EXAM_DAY.getDate():'TBA')+'</span>';")
rep('const KEY="ds-midterm-v1";', 'const KEY="ds-final-v1";')
sub(r"const PID=\{.*?\};", "const PID={home:0," + ",".join("%s:%s" % (c, c[2:]) for c in IDS) + ",traps:" + str(int(IDS[-1][2:]) + 1) + "};")
rep("return {state:\"running\",done:c,n:3};", "return {state:\"running\",done:c,n:CHAPTERS.length};")
sub(r'if\(window\.EZGEN\)EZGEN\.attach\(\{course:"Data Structures",s:"ds",ai:\[.*?\],fixed:\[.*?\],scope:\{.*?\},mock:\[.*?\],batch:\[.*?\],',
    'if(window.EZGEN)EZGEN.attach({course:"Data Structures",s:"dsf",ai:[' + Q(IDS) + '],')
rep("Data and File Structures midterm exam (Gilberg & Forouzan, Data Structures: A Pseudocode Approach; chapters: introduction/pseudocode/ADT/Big-O, searching and hashing, linked lists).",
    "Data and File Structures final exam (Gilberg & Forouzan, Data Structures: A Pseudocode Approach; chapters: linked lists (processing a list, append, array of lists, circular, doubly and multilinked lists) and stacks).")
rep("const days=Math.round((EXAM_DAY-today)/86400000);", "if(!EXAM_DAY){cd.innerHTML=EXAM_TAG+'<b>TBA</b><span>Exam date not announced yet</span>';}\n  const days=EXAM_DAY?Math.round((EXAM_DAY-today)/86400000):null;")
rep("cd.innerHTML=days>0?", "if(EXAM_DAY)cd.innerHTML=days>0?")
sub(r'\[\["ch1","Ch1 chapter exercises"\],\["ch2","Ch2 chapter exercises"\],\["ch3","Ch3 chapter exercises"\]\]',
    "[" + ",".join('["%s","%s chapter exercises"]' % (c, c.capitalize()) for c in IDS) + "]")
rep('p.textContent="All done. The day before the exam, read Review, then get some sleep.";ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.textContent="Review";b.dataset.go="review";',
    'p.textContent="All chapters done. Read the Summary & traps tab the night before the exam.";ns.appendChild(p);const b=document.createElement("button");b.className="btn primary";b.textContent="Summary & traps";b.dataset.go="traps";')
# written blocks
sub(r'EZgenw\.attach\(\{course:"Data and File Structures",subject:"data-structures",s:"ds",(.*?)blocks:\[\n.*?\n  \]\.filter',
    lambda mm: 'EZgenw.attach({course:"Data and File Structures",subject:"data-structures",s:"dsf",' + mm.group(1) + "blocks:[\n" +
    ",\n".join("    blk(\"%sw\",\"%s\",[\"%s\"],document.querySelector('[data-exam=\"%sw\"]'),false)" % (c, c, c, c) for c in IDS) + "\n  ].filter", re.S)
rep('["ch1w","ch2w","ch3w"].forEach(key=>{', "[" + Q([c + "w" for c in IDS]) + "].forEach(key=>{")
# interactive figures
labs = open(os.path.join(HERE, "ds_labs.js"), encoding="utf-8").read()
rep("const LABS={", labs + "\nconst LABS={stackops,postfix,")
open(OUT + "/app.js", "w", encoding="utf-8").write(a)
print("ok", len(page), len(a))
