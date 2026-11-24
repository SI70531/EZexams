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
CHAPTERS = ["ch12", "ch22", "ch28"]
TITLES = {"ch12": "Ch12 Tax system", "ch22": "Ch22 Micro frontiers", "ch28": "Ch28 Unemployment"}
import sys, json
sys.path.insert(0, HERE)
from econ_final_hw import HW

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


# ---------- Ch12 / Ch22 figures ----------
def _mk(i): return '<defs><marker id="%s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahd"/></marker></defs>' % i
def _box(x, y, w, h, t, sub, step, hl=False):
    st = ' stroke="var(--seal)" stroke-width="1.8"' if hl else ' stroke="var(--ink)" stroke-width="1.4"'
    s = '<rect data-step="%d" x="%d" y="%d" width="%d" height="%d" rx="10" fill="var(--paper2)"%s/>' % (step, x, y, w, h, st)
    if sub:
        s += '<text data-step="%d" x="%d" y="%d" text-anchor="middle" class="lb">%s</text>' % (step, x + w / 2, y + h / 2 - 3, t)
        s += '<text data-step="%d" x="%d" y="%d" text-anchor="middle" class="tk">%s</text>' % (step, x + w / 2, y + h / 2 + 14, sub)
    else:
        s += '<text data-step="%d" x="%d" y="%d" text-anchor="middle" class="lb">%s</text>' % (step, x + w / 2, y + h / 2 + 4, t)
    return s
def _arr(mid, x1, y1, x2, y2, step, lab=None, lx=None, ly=None):
    s = '<line data-step="%d" class="gl2" x1="%d" y1="%d" x2="%d" y2="%d" stroke="var(--ink)" stroke-width="1.6" marker-end="url(#%s)"/>' % (step, x1, y1, x2, y2, mid)
    if lab:
        s += '<text data-step="%d" x="%d" y="%d" text-anchor="middle" class="lb2">%s</text>' % (step, lx if lx is not None else (x1 + x2) / 2, ly if ly is not None else (y1 + y2) / 2 - 6, lab)
    return s
def _wide(svg, en, z):
    return '<div class="two" style="display:block"><figure class="fg wide">' + svg + "<figcaption>" + zh(en, z) + "</figcaption></figure></div>"

def fig_intl():
    data = [("Denmark", 49), ("France", 45), ("Sweden", 43), ("Italy", 43), ("Germany", 37), ("Greece", 34), ("U.K.", 33), ("Spain", 33),
            ("Canada", 31), ("Japan", 29), ("Australia", 27), ("U.S.", 25), ("Chile", 20), ("Mexico", 20)]
    s = ['<svg viewBox="0 0 640 260" role="img">', '<line class="ax" x1="50" y1="210" x2="626" y2="210"/><line class="ax" x1="50" y1="210" x2="50" y2="14"/>']
    yv = lambda v: 210 - v * 3.6
    for v in (10, 20, 30, 40, 50):
        s.append('<line class="gl" x1="50" y1="%.1f" x2="620" y2="%.1f"/><text class="tk" x="44" y="%.1f" text-anchor="end">%d%%</text>' % (yv(v), yv(v), yv(v) + 4, v))
    for i, (c, v) in enumerate(data):
        x = 60 + i * 40.5
        us = c == "U.S."
        s.append('<rect x="%.1f" y="%.1f" width="28" height="%.1f" fill="%s" fill-opacity="%s"/>' % (x, yv(v), v * 3.6, "var(--seal)" if us else "var(--indigo)", ".85" if us else ".55"))
        s.append('<text class="tk" x="%.1f" y="%.1f" text-anchor="middle">%d%%</text>' % (x + 14, yv(v) - 4, v))
        s.append('<text class="tk" x="%.1f" y="228" text-anchor="end" transform="rotate(-35 %.1f 228)">%s</text>' % (x + 18, x + 18, c))
    s.append('<text class="axl" x="56" y="12">total tax revenue, % of GDP</text></svg>')
    return _wide("".join(s), "Total government tax revenue as a percentage of GDP in OECD countries. The U.S. (red) is near the bottom, at about 25%.",
                 "OECD 國家政府總稅收佔 GDP 的比例。美國（紅色）約 25%，排在後段。")

def fig_pizza():
    # demand steps: Jack 8, Jane 6; price 5 → 7 with a $2 tax. q 0..2 → 0..100, p 0..10 → 0..100
    X2 = lambda q: X(q * 40 + 5)
    Y2 = lambda p: Y(p * 9)
    def r(cls, q1, q2, p1, p2):
        return '<rect class="%s" x="%.1f" y="%.1f" width="%.1f" height="%.1f"/>' % (cls, X2(q1), Y2(p2), X2(q2) - X2(q1), Y2(p1) - Y2(p2))
    def panel(title, after):
        s = ['<svg viewBox="-22 -22 362 290" role="img">', '<line class="ax" x1="44" y1="214" x2="328" y2="214"/><line class="ax" x1="44" y1="214" x2="44" y2="10"/>',
             '<text class="axl" x="328" y="253" text-anchor="end">pizzas</text><text class="axl" x="50" y="14">$</text>',
             '<text class="lb" x="322.0" y="-6" text-anchor="end">%s</text>' % title]
        if not after:
            s += [r("csf", 0, 1, 5, 8), r("csf", 1, 2, 5, 6)]
        else:
            s += [r("csf", 0, 1, 7, 8), r("revf", 0, 1, 5, 7), r("dwlf", 1, 2, 5, 6)]
        s.append('<polyline class="cv" fill="none" points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f"/>' % (
            X2(0), Y2(8), X2(1), Y2(8), X2(1), Y2(6), X2(2), Y2(6), X2(2), Y2(0)))
        s.append('<line class="cv2" x1="44" y1="%.1f" x2="%.1f" y2="%.1f"/><text class="tk" x="40" y="%.1f" text-anchor="end">$5</text>' % (Y2(5), X2(2.5), Y2(5), Y2(5) + 4))
        if after:
            s.append('<line class="cv4" x1="44" y1="%.1f" x2="%.1f" y2="%.1f"/><text class="tk" x="40" y="%.1f" text-anchor="end">$7</text>' % (Y2(7), X2(2.5), Y2(7), Y2(7) + 4))
        s.append('<text class="tk" x="40" y="%.1f" text-anchor="end">$8</text><text class="tk" x="40" y="%.1f" text-anchor="end">$6</text>' % (Y2(8) + 4, Y2(6) + 4))
        s.append('<text class="tk" x="%.1f" y="229" text-anchor="middle">Jack</text><text class="tk" x="%.1f" y="229" text-anchor="middle">Jane</text>' % ((X2(0) + X2(1)) / 2, (X2(1) + X2(2)) / 2))
        if not after:
            s.append('<text class="lb2" x="%.1f" y="%.1f" text-anchor="middle">CS $3</text><text class="lb2" x="%.1f" y="%.1f" text-anchor="middle">CS $1</text>' % ((X2(0) + X2(1)) / 2, Y2(6.5) + 4, (X2(1) + X2(2)) / 2, Y2(5.5) + 4))
        else:
            s.append('<text class="lb2" x="%.1f" y="%.1f" text-anchor="middle">CS $1</text><text class="lb2" x="%.1f" y="%.1f" text-anchor="middle">tax $2</text><text class="lb2" x="%.1f" y="%.1f" text-anchor="middle">DWL $1</text>' % (
                (X2(0) + X2(1)) / 2, Y2(7.5) + 4, (X2(0) + X2(1)) / 2, Y2(6) + 4, (X2(1) + X2(2)) / 2, Y2(5.5) + 4))
        s.append("</svg>")
        return "".join(s)
    return ('<div class="two"><figure class="fg">' + panel("No tax: price $5", False) + "<figcaption>" + zh("Both buy. Total surplus = 3 + 1 = $4.", "兩人都買，總剩餘 = 3 + 1 = $4。") + "</figcaption></figure>" +
            '<figure class="fg">' + panel("$2 tax: price $7", True) + "<figcaption>" + zh("Jane stops buying. Jack's surplus $1 + tax $2 = $3; the lost $1 is the deadweight loss.", "Jane 不買了。Jack 剩餘 $1 + 稅收 $2 = $3；消失的 $1 就是無謂損失。") + "</figcaption></figure></div>")

def fig_three():
    f = Fig("income ($1,000)", "average tax rate", vb="-22 -22 362 290")
    xi = lambda inc: (inc - 25) / 270 * 100
    yr = lambda r: (r - 10) / 25 * 100
    for r in (20, 25, 30):
        f.s.append('<line class="gl" x1="44" y1="%.1f" x2="322" y2="%.1f"/><text class="tk" x="40" y="%.1f" text-anchor="end">%d%%</text>' % (Y(yr(r)), Y(yr(r)), Y(yr(r)) + 4, r))
    for inc in (50, 100, 200):
        f.s.append('<text class="tk" x="%.1f" y="229" text-anchor="middle">%d</text>' % (X(xi(inc)), inc))
    for cls, pts, lab in (("cv2", (30, 25, 20), "regressive"), ("cv", (25, 25, 25), "proportional"), ("cv3", (20, 25, 30), "progressive")):
        P = [(X(xi(i)), Y(yr(r))) for i, r in zip((50, 100, 200), pts)]
        f.s.append('<polyline class="%s" fill="none" points="%s"/>' % (cls, " ".join("%.1f,%.1f" % p for p in P)))
        for p in P:
            f.s.append('<circle class="dot" cx="%.1f" cy="%.1f" r="3.5"/>' % p)
        f.s.append('<text class="lb" x="%.1f" y="%.1f" text-anchor="start">%s</text>' % (P[-1][0] + 6, P[-1][1] + 4, lab))
    return '<div class="two">' + f.out(zh("Average tax rate as income rises: it falls for a regressive tax, stays flat for a proportional tax and rises for a progressive tax.",
                                          "所得上升時的平均稅率：累退稅下降、比例稅不變、累進稅上升。")) + \
        '<div class="box zh"><span class="lbl">How to tell them apart</span>Look at the <b>% of income</b> column, not the dollar amounts.<br>% falls as income rises → <b>regressive</b> (a lump-sum tax is an extreme case).<br>% stays the same → <b>proportional</b> (flat tax).<br>% rises → <b>progressive</b> (U.S. federal income tax).<span class="zhn">看<b>佔所得的比例</b>那欄，不要看金額。比例隨所得下降 → 累退（定額稅是極端例子）；比例不變 → 比例稅；比例上升 → 累進（美國聯邦所得稅）。</span></div></div>'

def fig_corp():
    m = "ahf_corp"
    s = ('<svg viewBox="0 0 640 210" role="img">' + _mk(m) +
         _box(225, 6, 190, 44, "Tax on automakers", None, 0, True) +
         _arr(m, 270, 50, 110, 84, 1) + _arr(m, 320, 50, 320, 84, 1) + _arr(m, 370, 50, 530, 84, 1) +
         _box(10, 86, 200, 52, "Owners: less profit", "move wealth out", 2) +
         _box(220, 86, 200, 52, "Supply of cars falls", "car prices rise", 2) +
         _box(430, 86, 200, 52, "Demand for auto workers", "falls, wages fall", 2) +
         _arr(m, 320, 138, 320, 164, 3) + _arr(m, 530, 138, 530, 164, 3) +
         _box(220, 166, 200, 38, "Car buyers worse off", None, 4) +
         _box(430, 166, 200, 38, "Workers worse off", None, 4) + "</svg>")
    return _wide(s, "Who pays a tax on automakers? Over time the burden spreads from the owners to car buyers and auto workers: people pay all taxes.",
                 "誰負擔對汽車廠的稅？隨時間經過，負擔從股東擴散到買車的人和汽車工人：所有的稅最後都是人在繳。")

def fig_asym():
    m = "ahf_asym"
    s = ('<svg viewBox="0 0 640 300" role="img">' + _mk(m) +
         _box(210, 6, 220, 46, "Asymmetric information", "one side knows more", 0, True) +
         _arr(m, 270, 52, 165, 84, 1) + _arr(m, 370, 52, 475, 84, 1) +
         _box(40, 86, 250, 50, "Hidden action", "what the agent does", 2) +
         _box(350, 86, 250, 50, "Hidden characteristic", "what the good is like", 2) +
         _arr(m, 165, 136, 165, 160, 3) + _arr(m, 475, 136, 475, 160, 3) +
         _box(40, 162, 250, 50, "Moral hazard", "workers shirk, insured are careless", 4) +
         _box(350, 162, 250, 50, "Adverse selection", "lemons, sick buyers of insurance", 4) +
         _arr(m, 165, 212, 165, 236, 5) + _arr(m, 475, 212, 475, 236, 5) +
         _box(40, 238, 250, 56, "Monitoring, higher wages,", "delayed payment, board of directors", 6) +
         _box(350, 238, 250, 56, "Signaling (informed side)", "screening (uninformed side)", 6) + "</svg>")
    return _wide(s, "The two kinds of asymmetric information, the problem each one causes, and how the market responds.",
                 "兩種資訊不對稱、各自造成的問題，以及市場怎麼回應。")

def fig_lemon():
    m = "ahf_lemon"
    s = ('<svg viewBox="0 0 640 230" role="img">' + _mk(m) +
         _box(20, 20, 270, 52, "Price set for the average buyer", "insurer can't tell who is sick", 0) +
         _arr(m, 290, 46, 345, 46, 1) +
         _box(350, 20, 270, 52, "Healthy people find it too dear", "they drop out", 2) +
         _arr(m, 485, 72, 485, 140, 3) +
         _box(350, 142, 270, 52, "The pool is sicker", "average claims rise", 4, True) +
         _arr(m, 345, 168, 290, 168, 5) +
         _box(20, 142, 270, 52, "The price rises again", "", 6) +
         _arr(m, 155, 142, 155, 76, 7) + "</svg>")
    return _wide(s, "Adverse selection in insurance feeds on itself: each price rise drives out the healthiest buyers that are left, so some mutually beneficial trades never happen.",
                 "保險的逆選擇會自我強化：每次漲價都把剩下最健康的人趕走，一些對雙方有利的交易就做不成。")

def fig_cycle():
    m = "ahf_cyc"
    s = ('<svg viewBox="0 0 640 230" role="img">' + _mk(m) +
         '<circle data-step="0" cx="320" cy="40" r="28" fill="var(--paper2)" stroke="var(--ink)" stroke-width="1.4"/><text data-step="0" x="320" y="46" text-anchor="middle" class="lb">A</text>' +
         _arr(m, 345, 58, 440, 160, 1, "A beats B 55%", 450, 100) +
         '<circle data-step="2" cx="460" cy="185" r="28" fill="var(--paper2)" stroke="var(--ink)" stroke-width="1.4"/><text data-step="2" x="460" y="191" text-anchor="middle" class="lb">B</text>' +
         _arr(m, 430, 190, 212, 190, 3, "B beats C 80%", 320, 182) +
         '<circle data-step="4" cx="182" cy="185" r="28" fill="var(--paper2)" stroke="var(--seal)" stroke-width="1.8"/><text data-step="4" x="182" y="191" text-anchor="middle" class="lb">C</text>' +
         _arr(m, 200, 160, 295, 58, 5, "C beats A 65%", 190, 100) + "</svg>")
    return _wide(s, "Majority rule goes round in a circle: A beats B, B beats C, yet C beats A. Whatever is voted on last decides the winner.",
                 "多數決繞成一個圈：A 贏 B、B 贏 C，C 卻贏 A。最後才表決的那一場決定贏家。")

MED = [(20, 5), (30, 10), (40, 20), (50, 25), (60, 20), (70, 10), (80, 10)]
def fig_median():
    s = ['<svg viewBox="0 0 640 272" role="img">', '<line class="ax" x1="60" y1="200" x2="620" y2="200"/><line class="ax" x1="60" y1="200" x2="60" y2="14"/>']
    yv = lambda v: 200 - v * 5.4
    for v in (10, 20, 30):
        s.append('<line class="gl" x1="60" y1="%.1f" x2="614" y2="%.1f"/><text class="tk" x="54" y="%.1f" text-anchor="end">%d%%</text>' % (yv(v), yv(v), yv(v) + 4, v))
    for i, (b, v) in enumerate(MED):
        x = 80 + i * 76
        s.append('<rect x="%d" y="%.1f" width="52" height="%.1f" fill="%s" fill-opacity="%s"/>' % (x, yv(v), v * 5.4, "var(--seal)" if b == 50 else "var(--indigo)", ".8" if b == 50 else ".5"))
        s.append('<text class="tk" x="%d" y="%.1f" text-anchor="middle">%d%%</text><text class="tk" x="%d" y="218" text-anchor="middle">$%d</text>' % (x + 26, yv(v) - 4, v, x + 26, b))
    s.append('<text class="lb2" x="%d" y="%.1f" text-anchor="middle">median voter: $50</text>' % (80 + 3 * 76 + 26, yv(25) - 20))
    s.append('<text class="lb2" x="340" y="266" text-anchor="middle">cumulative: $20–40 = 35%, $20–50 = 60% → the 50th percentile falls at $50</text>')
    s.append('<text class="axl" x="66" y="12">% of voters</text><text class="axl" x="620" y="242" text-anchor="end">preferred budget (billions)</text></svg>')
    return _wide("".join(s), "Voters' preferred government budget (an example distribution). The median voter wants $50 billion: in a vote between $40 and $70, everyone at $50 or below picks $40 (60%), so $40 wins.",
                 "選民理想的政府預算（示範分配）。中位選民要 500 億：$40 對 $70 時，偏好 $50 以下的人都選 $40（60%），所以 $40 勝。")

FIGS = {"FIG_LF": fig_lf, "FIG_UNAT": fig_unat, "FIG_STRUCT": fig_struct, "FIG_UNION": fig_union, "FIG_MANDATE": fig_mandate,
        "FIG_INTL": fig_intl, "FIG_PIZZA": fig_pizza, "FIG_THREE": fig_three, "FIG_CORP": fig_corp,
        "FIG_ASYM": fig_asym, "FIG_LEMON": fig_lemon, "FIG_CYCLE": fig_cycle, "FIG_MEDIAN": fig_median}
chapters = []
for c in CHAPTERS:
    t = open(os.path.join(HERE, "econ-final", c + ".html"), encoding="utf-8").read()
    t = re.sub(r"\{\{(FIG_\w+)\}\}", lambda m: FIGS[m.group(1)](), t)
    chapters.append(t)

# ---------- head ----------
mi = lines.index("<main>")
head = "\n".join(lines[:mi + 1])
desc = "經濟學期末考衝刺：Mankiw Ch12 稅制設計、Ch22 個體經濟學新領域、Ch28 失業 詳細講義（含圖形解析）、互動圖、作業原題與英文選擇題。範圍與日期未定，之後會再加章節。"
head = head.replace("<title>Economics midterm prep｜EZexams</title>", "<title>Economics final prep｜EZexams</title>")
head = head.replace('content="Economics midterm prep｜EZexams"', 'content="Economics final prep｜EZexams"')
head = re.sub(r'(<meta (?:name|property)="(?:og:)?description" content=")[^"]*"', lambda m: m.group(1) + desc + '"', head)
head = head.replace("economics/midterm/", "economics/final/")
head = re.sub(r'<script src="../../assets/ezplan.js[^"]*" defer></script>\n', "", head)
head = head.replace("</style>", ".fg svg tspan{fill:inherit}\n</style>", 1)

home = """<section role="tabpanel" class="view" id="home"><div class="vhead"><div class="pcb" data-pcb="home" role="img"></div><p class="vmeta">Final: <span data-examdate>TBA</span></p><h1>Economics final prep</h1><p>Mankiw, Principles of Economics. For now the page covers Ch12 The Design of the Tax System, Ch22 Frontiers of Microeconomics and Ch28 Unemployment; the exam scope and date are not set yet, and more chapters will be added when they are available. Each chapter follows the teacher's lecture PDF (technical terms in English, every figure explained, interactive figures where needed) and ends with the teacher's homework questions plus multiple-choice practice (15 questions in all per chapter), in English with explanations in Chinese.</p></div>
<div class="next" id="nextStep"></div>
<h3>Chapters so far</h3>
<div class="scope">
<div class="c"><b>Ch12 The Design of the Tax System</b>U.S. tax revenue, deadweight loss and administrative burden, average vs. marginal tax rates, lump-sum taxes, income vs. consumption taxes, benefits and ability-to-pay principles, vertical and horizontal equity, tax incidence; plus the cost formulas (TC, ATC, MC, MP).<br><button class="btn" data-go="ch12">Ch12</button></div>
<div class="c"><b>Ch22 Frontiers of Microeconomics</b>Moral hazard and the principal-agent problem, adverse selection, signaling and screening, the Condorcet paradox, Arrow's impossibility theorem, the median voter theorem, behavioral economics.<br><button class="btn" data-go="ch22">Ch22</button></div>
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
   hwNN = the teacher's homework-sheet questions (fixed, from tools/src/econ_final_hw.py). chNN = the chapter exercises, AI practice:
   questions are made one at a time from the chapter notes by the Worker and each answer is revealed only after you answer; each
   chNN set only keeps how many slots it has (15 minus the homework count). Progress is saved by slot position. */
const EZSTUB=n=>Array.from({length:n},()=>({}));
const QUIZ = {
%s
};
const MOCK={};
""" % ",\n".join((' "hw%s":%s,\n' % (c[2:], json.dumps(HW["hw" + c[2:]], ensure_ascii=False)) if "hw" + c[2:] in HW else "") + ' "%s":EZSTUB(%d)' % (c, 15 - len(HW.get("hw" + c[2:], []))) for c in CHAPTERS))

# ---------- app.js ----------
a = open(MID + "/app.js", encoding="utf-8").read()
def rep(old, new):
    global a
    assert old in a, old[:80]
    a = a.replace(old, new, 1)
rep("/* economics midterm page logic", "/* economics final page logic (built by tools/src/econ_final_build.py from economics/midterm/app.js)")
a = re.sub(r"const CHN=\{.*?\};", lambda m: "const CHN=" + json.dumps(dict([("traps", "Summary & traps")] + [(c, TITLES[c]) for c in CHAPTERS]), ensure_ascii=False) + ";", a, count=1)
a = re.sub(r"const VIEWS=\[.*?\];", lambda m: "const VIEWS=" + json.dumps([["home", "Home"]] + [[c, TITLES[c]] for c in CHAPTERS] + [["traps", "Summary & traps"]], ensure_ascii=False) + ";", a, count=1)
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
