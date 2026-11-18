"""Builds economics/final/ (index.html, app.js, quiz.js) from tools/src/econ-final/chN.html (the notes),
the figures drawn below and econ_final_widgets.js (the interactive figures). Page frame, styles and page logic come from
economics/midterm. Run: python3 tools/src/econ_final_build.py, then python3 tools/stamp.py"""
import re, os

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
MID = REPO + "/economics/midterm"
OUT = REPO + "/economics/final"
os.makedirs(OUT, exist_ok=True)
lines = open(MID + "/index.html", encoding="utf-8").read().split("\n")
CHAPTERS = ["ch28"]

# ---------- figures (same frame and classes as the midterm figures) ----------
MK = [0]
def X(q): return 44 + 278 * q / 100
def Y(p): return 214 - 198 * p / 100

class Fig:
    def __init__(self, xl, yl, top=None, vb="-22 -22 362 290"):
        MK[0] += 1
        self.id = "ahf_%d" % MK[0]
        self.s = ['<svg viewBox="%s" role="img"><defs><marker id="%s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahd"/></marker></defs>' % (vb, self.id),
                  '<line class="ax" x1="44" y1="214" x2="328" y2="214"/><line class="ax" x1="44" y1="214" x2="44" y2="10"/>',
                  '<text class="axl" x="328" y="253" text-anchor="end">%s</text><text class="axl" x="50" y="14">%s</text>' % (xl, yl)]
        if top:
            self.s.append('<text class="lb" x="322.0" y="-6" text-anchor="end">%s</text>' % top)
    def curve(self, cls, q1, p1, q2, p2, lab):
        self.s.append('<line class="%s" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/><text class="lb" x="%.1f" y="%.1f" text-anchor="start">%s</text>' % (cls, X(q1), Y(p1), X(q2), Y(p2), X(q2) + 2.8, Y(p2), lab))
    def guide(self, q, p, plab=None, qlab=None, cls="gl"):
        self.s.append('<line class="%s" x1="44.0" y1="%.1f" x2="%.1f" y2="%.1f"/><line class="%s" x1="%.1f" y1="214.0" x2="%.1f" y2="%.1f"/>' % (cls, Y(p), X(q), Y(p), cls, X(q), X(q), Y(p)))
        if plab: self.s.append('<text class="tk" x="40" y="%.1f" text-anchor="end">%s</text>' % (Y(p) + 4, plab))
        if qlab: self.s.append('<text class="tk" x="%.1f" y="229" text-anchor="middle">%s</text>' % (X(q), qlab))
    def dot(self, q, p): self.s.append('<circle class="dot" cx="%.1f" cy="%.1f" r="3.5"/>' % (X(q), Y(p)))
    def hline(self, p, lab):
        self.s.append('<line class="cv4" x1="44.0" y1="%.1f" x2="322.0" y2="%.1f"/><text class="tk" x="40" y="%.1f" text-anchor="end">%s</text>' % (Y(p), Y(p), Y(p) + 4, lab))
    def gap(self, q1, q2, p, lab, dy=-8):
        self.s.append('<line class="gapl" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/><text class="lb2" x="%.1f" y="%.1f" text-anchor="middle">%s</text>' % (X(q1), Y(p), X(q2), Y(p), X((q1 + q2) / 2), Y(p) + dy, lab))
    def arrow(self, q1, p1, q2, p2):
        self.s.append('<line class="gl2" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" marker-end="url(#%s)"/>' % (X(q1), Y(p1), X(q2), Y(p2), self.id))
    def text(self, q, p, t, anchor="middle"):
        self.s.append('<text class="lb2" x="%.1f" y="%.1f" text-anchor="%s">%s</text>' % (X(q), Y(p), anchor, t))
    def out(self, cap=None):
        c = "<figcaption>%s</figcaption>" % cap if cap else ""
        return '<figure class="fg">' + "".join(self.s) + "</svg>" + c + "</figure>"

def zh(en, z): return '%s<span class="zhn">%s</span>' % (en, z)

# labor force: boxes and arrows, played in flow order (box → arrow → box)
def fig_lf():
    def box(x, y, w, h, t, sub, step):
        return ('<rect data-step="%d" x="%d" y="%d" width="%d" height="%d" rx="10" fill="var(--paper2)" stroke="var(--ink)" stroke-width="1.4"/>' % (step, x, y, w, h) +
                '<text data-step="%d" x="%d" y="%d" text-anchor="middle" class="lb">%s</text>' % (step, x + w / 2, y + h / 2 - 2, t) +
                '<text data-step="%d" x="%d" y="%d" text-anchor="middle" class="tk">%s</text>' % (step, x + w / 2, y + h / 2 + 15, sub))
    def arr(x1, y1, x2, y2, step):
        return '<line data-step="%d" class="gl2" x1="%d" y1="%d" x2="%d" y2="%d" stroke="var(--ink)" stroke-width="1.6" marker-end="url(#ahf_lf)"/>' % (step, x1, y1, x2, y2)
    s = ('<svg viewBox="0 0 640 250" role="img"><defs><marker id="ahf_lf" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahd"/></marker></defs>' +
         box(220, 8, 200, 52, "Adult population (16+)", "253.4 million", 0) +
         arr(280, 60, 165, 100, 1) + arr(360, 60, 475, 100, 1) +
         box(60, 102, 200, 52, "Labor force", "158.9 million", 2) +
         box(380, 102, 200, 52, "Not in the labor force", "94.5 million", 2) +
         arr(125, 154, 85, 190, 3) + arr(195, 154, 245, 190, 3) +
         box(0, 192, 160, 52, "Employed", "151.1 million", 4) +
         box(180, 192, 160, 52, "Unemployed", "7.8 million", 4) +
         '<text data-step="5" x="500" y="205" text-anchor="middle" class="lb2">u-rate = 7.8 ÷ 158.9 = 4.9%</text>' +
         '<text data-step="5" x="500" y="230" text-anchor="middle" class="lb2">LF part. = 158.9 ÷ 253.4 = 62.7%</text></svg>')
    return '<div class="two" style="display:block"><figure class="fg wide">' + s + "<figcaption>" + zh("The three groups, with the June 2016 numbers of Active Learning 1. The u-rate uses the labor force; the participation rate uses the adult population.",
            "三組人口，用 Active Learning 1 的 2016 年 6 月數字。失業率的分母是勞動力，勞參率的分母是成年人口。") + "</figcaption></figure></div>"

# natural vs actual u-rate (annual averages, approximate)
U = [5.5,6.7,5.5,5.7,5.2,4.5,3.8,3.8,3.6,3.5,4.9,5.9,5.6,4.9,5.6,8.5,7.7,7.1,6.1,5.8,7.1,7.6,9.7,9.6,7.5,7.2,7.0,6.2,5.5,5.3,5.6,6.8,7.5,6.9,6.1,5.6,5.4,4.9,4.5,4.2,4.0,4.7,5.8,6.0,5.5,5.1,4.6,4.6,5.8,9.3,9.6,8.9,8.1,7.4,6.2,5.3,4.9]
NAT = {1960: 5.5, 1970: 5.9, 1978: 6.2, 1990: 5.8, 2000: 5.1, 2008: 5.0, 2016: 4.8}
def nat(y):
    ks = sorted(NAT)
    for a, b in zip(ks, ks[1:]):
        if a <= y <= b: return NAT[a] + (NAT[b] - NAT[a]) * (y - a) / (b - a)
def fig_unat():
    x = lambda y: 50 + (y - 1960) * 560 / 56
    yv = lambda u: 200 - u * 18
    s = ['<svg viewBox="0 0 640 250" role="img">',
         '<line class="ax" x1="50" y1="200" x2="616" y2="200"/><line class="ax" x1="50" y1="200" x2="50" y2="14"/>']
    for u in (2, 4, 6, 8, 10):
        s.append('<line class="gl" x1="50" y1="%.1f" x2="610" y2="%.1f"/><text class="tk" x="44" y="%.1f" text-anchor="end">%d%%</text>' % (yv(u), yv(u), yv(u) + 4, u))
    for y in range(1960, 2017, 10):
        s.append('<text class="tk" x="%.1f" y="216" text-anchor="middle">%d</text>' % (x(y), y))
    s.append('<polyline class="cv2" fill="none" points="%s"/>' % " ".join("%.1f,%.1f" % (x(1960 + i), yv(nat(1960 + i))) for i in range(57)))
    s.append('<polyline class="cv" fill="none" points="%s"/>' % " ".join("%.1f,%.1f" % (x(1960 + i), yv(u)) for i, u in enumerate(U)))
    s.append('<text class="lb" x="%.1f" y="%.1f">Actual u-rate</text>' % (x(1982) + 6, yv(9.7) - 2))
    s.append('<text class="lb" x="%.1f" y="%.1f" text-anchor="middle">Natural rate u*</text>' % (x(1999), yv(5.1) + 34))
    s.append('<text class="lb2" x="%.1f" y="%.1f" text-anchor="middle">recession: u − u* &gt; 0</text>' % (x(2010), yv(10.6)))
    s.append('<text class="lb2" x="%.1f" y="%.1f" text-anchor="middle">boom: u − u* &lt; 0</text>' % (x(1968), yv(2.4)))
    s.append('<text class="axl" x="616" y="240" text-anchor="end">year</text><text class="axl" x="56" y="12">% of labor force</text></svg>')
    return '<div class="two" style="display:block"><figure class="fg wide">' + "".join(s) + "<figcaption>" + zh("U.S. unemployment, 1960–2016 (annual averages, approximate). The actual rate moves above the natural rate in recessions and below it in booms; the gap is cyclical unemployment.",
            "美國失業率 1960–2016（年平均，約略值）。衰退時實際失業率高於自然失業率，繁榮時低於；兩者的差距就是週期性失業。") + "</figcaption></figure></div>"

def fig_struct():
    f = Fig("L labor", "W wage", vb="-22 0 362 268")
    f.curve("cv", 0, 100, 100, 0, "D")
    f.curve("cv2", 0, 0, 100, 100, "S")
    f.guide(50, 50, "W<tspan baseline-shift='sub' font-size='10'>E</tspan>", "L<tspan baseline-shift='sub' font-size='10'>E</tspan>")
    f.dot(50, 50)
    f.hline(70, "W₁")
    f.guide(30, 70, None, "L<tspan baseline-shift='sub' font-size='10'>D</tspan>")
    f.guide(70, 70, None, "L<tspan baseline-shift='sub' font-size='10'>S</tspan>")
    f.gap(30, 70, 70, "unemployment")
    return '<div class="two">' + f.out(zh("At the actual wage W₁ above the equilibrium WE, labor supplied LS exceeds labor demanded LD: the gap is structural unemployment.",
                 "實際工資 W₁ 高於均衡工資 WE 時，勞動供給量 LS 大於勞動需求量 LD，差距就是結構性失業。")) + \
        '<div class="box zh"><span class="lbl">Why the wage stays above WE</span><b>1. Minimum-wage laws</b>: the law sets the floor.<br><b>2. Unions</b>: collective bargaining pushes the wage up.<br><b>3. Efficiency wages</b>: the firm itself chooses to pay more.<br>In all three the wage cannot fall to clear the market, so the surplus of labor stays.<span class="zhn">1. 最低工資法：法律訂下限。2. 工會：集體議價把工資推高。3. 效率工資：廠商自己選擇多付。三種情況工資都降不下來讓市場結清，勞動過剩就一直存在。</span></div></div>'

def fig_union():
    a = Fig("L manufacturing", "W", "Manufacturing: union", vb="-22 -22 362 290")
    a.curve("cv", 0, 100, 100, 0, "D")
    a.curve("cv2", 0, 0, 100, 100, "S")
    a.guide(50, 50, "W₀", "L₀")
    a.dot(50, 50)
    a.hline(70, "W<tspan baseline-shift='sub' font-size='10'>union</tspan>")
    a.guide(30, 70, None, "L₁")
    a.gap(30, 70, 70, "outsiders")
    b = Fig("L services", "W", "Services: outsiders arrive", vb="-22 -22 362 290")
    b.curve("cv", 0, 100, 100, 0, "D")
    b.curve("cv2", 0, 0, 100, 100, "S₁")
    b.guide(50, 50, "W₀", "L₀")
    b.dot(50, 50)
    b.arrow(62, 62, 76, 56)
    b.curve("cv3 dash", 20, 0, 100, 80, "S₂")
    b.guide(60, 40, "W₁", "L₁", "gl2")
    b.dot(60, 40)
    return '<div class="two">' + a.out(zh("The union raises the manufacturing wage to W<sub>union</sub>: employment falls from L₀ to L₁. Insiders gain; outsiders lose their jobs.",
                                       "工會把製造業工資拉到 W<sub>union</sub>：就業從 L₀ 降到 L₁。局內人得利，局外人失業。")) + \
        b.out(zh("Outsiders move to the non-union service market: supply shifts right from S₁ to S₂, the service wage falls and service employment rises.",
                 "局外人移到沒有工會的服務業：供給從 S₁ 右移到 S₂，服務業工資下降、就業增加。")) + "</div>"

def fig_mandate():
    a = Fig("L labor", "W", "(c) workers value the benefit at $4", vb="-22 -22 362 290")
    a.curve("cv", 0, 100, 100, 0, "D₁")
    a.curve("cv2", 0, 0, 100, 100, "S₁")
    a.guide(50, 50, "W₁", "L₁ = L₂")
    a.dot(50, 50)
    a.arrow(25, 75, 25, 57)
    a.arrow(80, 80, 80, 62)
    a.curve("cv3 dash", 0, 80, 80, 0, "D₂")
    a.curve("cv3 dash", 20, 0, 100, 80, "S₂")
    a.guide(50, 30, "W₁ − 4", None, "gl2")
    a.dot(50, 30)
    b = Fig("L labor", "W", "(e) workers do not value it", vb="-22 -22 362 290")
    b.curve("cv", 0, 100, 100, 0, "D₁")
    b.curve("cv2", 0, 0, 100, 100, "S")
    b.guide(50, 50, "W₁", "L₁")
    b.dot(50, 50)
    b.arrow(25, 75, 25, 57)
    b.curve("cv3 dash", 0, 80, 80, 0, "D₂")
    b.guide(40, 40, "W₂", "L₂", "gl2")
    b.dot(40, 40)
    return '<div class="two">' + a.out(zh("Both curves shift down by $4: the wage falls by $4 and employment stays the same.",
                                       "兩條線都下移 $4：工資降 $4，就業不變。")) + \
        b.out(zh("Only demand shifts down: the wage falls by less than $4 and employment falls.",
                 "只有需求下移：工資降不到 $4，就業下降。")) + "</div>"

FIGS = {"FIG_LF": fig_lf, "FIG_UNAT": fig_unat, "FIG_STRUCT": fig_struct, "FIG_UNION": fig_union, "FIG_MANDATE": fig_mandate}
chapters = []
for c in CHAPTERS:
    t = open(os.path.join(HERE, "econ-final", c + ".html"), encoding="utf-8").read()
    t = re.sub(r"\{\{(FIG_\w+)\}\}", lambda m: FIGS[m.group(1)](), t)
    chapters.append(t)

# ---------- head ----------
mi = lines.index("<main>")
head = "\n".join(lines[:mi + 1])
desc = "經濟學期末考衝刺：Mankiw Ch28 失業 詳細講義（含圖形解析）、互動圖與英文選擇題。範圍與日期未定，之後會再加章節。"
head = head.replace("<title>Economics midterm prep｜EZexams</title>", "<title>Economics final prep｜EZexams</title>")
head = head.replace('content="Economics midterm prep｜EZexams"', 'content="Economics final prep｜EZexams"')
head = re.sub(r'(<meta (?:name|property)="(?:og:)?description" content=")[^"]*"', lambda m: m.group(1) + desc + '"', head)
head = head.replace("economics/midterm/", "economics/final/")
head = re.sub(r'<script src="../../assets/ezplan.js[^"]*" defer></script>\n', "", head)
head = head.replace("</style>", ".fg svg tspan{fill:inherit}\n</style>", 1)

home = """<section role="tabpanel" class="view" id="home"><div class="vhead"><div class="pcb" data-pcb="home" role="img"></div><p class="vmeta">Final: <span data-examdate>TBA</span></p><h1>Economics final prep</h1><p>Mankiw, Principles of Economics. For now the page covers Ch28 Unemployment; the exam scope and date are not set yet, and more chapters will be added when they are available. Each chapter follows the teacher's lecture PDF (technical terms in English, every figure explained, interactive figures where needed) and ends with 15 multiple-choice questions in English, with explanations in Chinese.</p></div>
<div class="next" id="nextStep"></div>
<h3>Chapters so far</h3>
<div class="scope">
<div class="c"><b>Ch28 Unemployment</b>Labor force statistics, the u-rate and its limits, duration, natural / frictional / structural / cyclical unemployment, job search, UI, minimum wages, unions, efficiency wages.<br><button class="btn" data-go="ch28">Ch28</button></div>
</div>
<h3>Progress</h3>
<table class="prog" id="progTable"></table>
<p class="small" id="storeNote">Scores are stored only in this device's browser. Switching devices or clearing browsing data resets them to zero.</p>
<h3>How to use these notes</h3>
<div class="box zh"><span class="lbl">How to read</span>Questions are in <b>English</b>; the small grey text is the <b>Chinese translation</b>, shown after you check answers together with the English answer and its Chinese meaning. To simulate the real exam, press “Hide Chinese translation”. <b>Black “Interactive” boxes</b> let you drag sliders to explore the graphs; <b>red boxes</b> mark common mistakes.</div>
<p><button class="btn zhbtn" type="button"></button></p>
</section>"""
scope_css = """<style>
.scope{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;margin:12px 0 20px}
.scope .c{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--paper)}
.scope .c b{display:block;font-size:calc(16px*var(--ts,1));margin-bottom:4px}
.ilab .lab-row input[type=number]{width:6.5em}
.fg.wide,.fg.wide svg{max-width:none!important;width:100%!important;height:auto!important}
</style>"""
head = head.replace("</head>", scope_css + "\n</head>", 1)

traps = '<section role="tabpanel" class="view" id="traps" hidden><div class="vhead"><h1>Summary &amp; Common Traps<span class="zhn">各章總結與易錯點</span></h1><p>Every chapter\'s summary and common traps on one page, in chapter order. Read this the night before.<span class="zhn">把每一章的總結和易錯點集中在同一頁，照章節順序排列，考前一晚看這頁。</span></p></div><div id="trapsBody"></div></section>'

ti = lines.index("</main>")
tail = "\n".join(lines[ti:]).replace('data-key="econ-midterm-v2"', 'data-key="econ-final-v1"')
page = head + "\n" + home + "\n" + "\n".join(chapters) + "\n" + traps + "\n" + tail
open(OUT + "/index.html", "w", encoding="utf-8").write(page)

# ---------- quiz.js ----------
open(OUT + "/quiz.js", "w", encoding="utf-8").write("""/* economics final question bank (QUIZ).
   The chapter exercises are AI practice: questions are made one at a time from the chapter notes by the Worker and each answer is
   revealed only after you answer. Here each set only keeps how many slots it has (progress is saved by slot position, so these
   counts must not change). */
const EZSTUB=n=>Array.from({length:n},()=>({}));
const QUIZ = {
%s
};
const MOCK={};
""" % ",\n".join(' "%s":EZSTUB(15)' % c for c in CHAPTERS))

# ---------- app.js ----------
a = open(MID + "/app.js", encoding="utf-8").read()
def rep(old, new):
    global a
    assert old in a, old[:80]
    a = a.replace(old, new, 1)
rep("/* economics midterm page logic", "/* economics final page logic (built by tools/src/econ_final_build.py from economics/midterm/app.js)")
a = re.sub(r"const CHN=\{.*?\};", 'const CHN={traps:"Summary & traps",ch28:"Ch28 Unemployment"};', a, count=1)
a = re.sub(r"const VIEWS=\[.*?\];", 'const VIEWS=[["home","Home"],["ch28","Ch28 Unemployment"],["traps","Summary & traps"]];', a, count=1)
a = re.sub(r'const KEY="econ-midterm-v2";[^\n]*\n', 'const KEY="econ-final-v1";\n', a, count=1)
a, n = re.subn(r"\n  else\{const o=JSON\.parse\(localStorage\.getItem\(\"econ-midterm-v1\"\).*?\}catch\(e\)\{\}", "}catch(e){}", a, count=1, flags=re.S)
assert n == 1
rep("return {state:\"running\",done:c,n:9};", "return {state:\"running\",done:c,n:CHS.length};")
rep('const EQ=Object.assign({},QUIZ,{mock1mc:MOCK["mock-1"],y110mc:MOCK.y110,y112mc:MOCK.y112,y113mc:MOCK.y113});', "const EQ=Object.assign({},QUIZ);")
rep("const MOCKSET={mock1mc:\"mock-1\"};", "const MOCKSET={};")
a = re.sub(r'EZGEN\.attach\(\{course:"Economics",s:"econ",ai:\[[^\]]*\],batch:\["mock1mc"\],mock:\["mock1mc"\],fixed:\[\],scope:\{mock1mc:CHS\},titles:\{mock1mc:"Economics \(mixed chapters\)"\}',
           'EZGEN.attach({course:"Economics",s:"econf",ai:CHS,batch:[],mock:[],fixed:[],scope:{},titles:{}', a, count=1)
assert 's:"econf"' in a
rep('const EXORD=["y110","y112","y113","mock-1"]', "const EXORD=[]")
rep('else{nb.textContent="Start mock exam 1";nb.dataset.go="mock-1";}', 'else{nb.textContent="Summary & traps";nb.dataset.go="traps";}')
rep('p.textContent="All done. Before the exam, go over Review and clear the top mistakes first.";', 'p.textContent="All done. Before the exam, read Summary & traps and redo the questions you got wrong.";')
a += "\n" + open(os.path.join(HERE, "econ_final_widgets.js"), encoding="utf-8").read()
open(OUT + "/app.js", "w", encoding="utf-8").write(a)
print("built", OUT)
