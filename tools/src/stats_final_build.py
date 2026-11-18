"""Builds statistics/final/ (index.html, app.js, quiz.js) from tools/src/stats-final/chN.html (the notes), the figures and
written Problems below, and stats_final_widgets.js (the interactive figures). Page frame, styles and page logic come from
statistics/midterm. Run: python3 tools/src/stats_final_build.py, then python3 tools/stamp.py"""
import re, os, json, html, math

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
MID = REPO + "/statistics/midterm"
OUT = REPO + "/statistics/final"
os.makedirs(OUT, exist_ok=True)
lines = open(MID + "/index.html", encoding="utf-8").read().split("\n")
CHAPTERS = ["ch5", "ch6"]


def zh(en, z): return '%s<span class="zhn">%s</span>' % (en, z)
def fig(svg, cap_en, cap_zh, wide=True):
    # wrapped in .two (display:block) so assets/ezsidefig.js leaves it on its own row
    return '<div class="two" style="display:block"><figure class="fg%s">%s<figcaption>%s</figcaption></figure></div>' % (" wide" if wide else "", svg, zh(cap_en, cap_zh))
def marker(i): return '<defs><marker id="%s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="ahd"/></marker></defs>' % i

# ---------- Ch5 figures ----------
def bar_fig(xs, ps, hit, xl, yl, w=640, h=250):
    L, B, T = 56, 40, 18
    mx = max(ps) * 1.15
    X = lambda i: L + 20 + i * (w - L - 40) / len(xs)
    bw = min(56, (w - L - 40) / len(xs) * 0.62)
    Y = lambda p: h - B - p / mx * (h - B - T)
    s = ['<svg viewBox="0 0 %d %d" role="img">' % (w, h),
         '<line class="ax" x1="%d" y1="%d" x2="%d" y2="%d"/><line class="ax" x1="%d" y1="%d" x2="%d" y2="%d"/>' % (L, h - B, w - 8, h - B, L, T - 6, L, h - B)]
    for k in range(5):
        p = mx / 1.15 * k / 4
        s.append('<text x="%d" y="%.1f" text-anchor="end">%.2f</text>' % (L - 6, Y(p) + 4, p))
    for i, (x, p) in enumerate(zip(xs, ps)):
        cx = X(i) + ((w - L - 40) / len(xs) - bw) / 2
        s.append('<rect class="%s" x="%.1f" y="%.1f" width="%.1f" height="%.1f"/>' % ("bar2" if hit(x) else "bar", cx, Y(p), bw, h - B - Y(p)))
        s.append('<text x="%.1f" y="%d" text-anchor="middle">%s</text>' % (cx + bw / 2, h - B + 16, x))
        s.append('<text class="t-ink" x="%.1f" y="%.1f" text-anchor="middle">%s</text>' % (cx + bw / 2, Y(p) - 5, (("%.3f" if len(xs) > 6 else "%.4f") % p).rstrip("0").rstrip(".")))
    s.append('<text class="axl" x="%d" y="%d" text-anchor="end">%s</text><text class="axl" x="%d" y="12">%s</text></svg>' % (w - 8, h - 6, xl, L + 6, yl))
    return "".join(s)

def fig_jsl():
    return fig(bar_fig([0, 1, 2, 3, 4], [.40, .25, .20, .05, .10], lambda x: False, "x = TVs sold in a day", "f(x)"),
               "Graph of the JSL Appliances distribution: one bar per value of x, its height is f(x). The heights add up to 1.",
               "JSL 家電機率分配圖：每個 x 一根長條，高度就是 f(x)，全部加起來等於 1。")

def fig_tree():
    """Evans Electronics, 3 employees. Flow order: root, arrows, level-1 nodes, arrows, level-2, arrows, leaves, outcome text."""
    s = ['<svg viewBox="0 0 640 340" role="img">' + marker("ah_tree")]
    def node(x, y, t, step, cls=""):
        return ('<circle data-step="%d" cx="%d" cy="%d" r="13" fill="var(--paper2)" stroke="var(--ink)" stroke-width="1.4"/>' % (step, x, y) +
                '<text data-step="%d" x="%d" y="%d" text-anchor="middle" class="%s">%s</text>' % (step, x, y + 4, cls or "t-ink", t))
    def arr(x1, y1, x2, y2, step, p):
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy)
        ax, ay, bx, by = x1 + dx / L * 15, y1 + dy / L * 15, x2 - dx / L * 16, y2 - dy / L * 16
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        return ('<line data-step="%d" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" stroke="var(--ink)" stroke-width="1.3" marker-end="url(#ah_tree)"/>' % (step, ax, ay, bx, by) +
                '<text data-step="%d" x="%.1f" y="%.1f" text-anchor="middle" class="tk">%s</text>' % (step + 1, mx - 6, my - 9 if dy < 0 else my + 16, p))
    s.append('<text data-step="0" x="30" y="13" text-anchor="middle" class="axl">Start</text>')
    s.append(node(30, 165, "", 0))
    xs = [30, 150, 270, 390]
    levels = [[165], [90, 240], [52, 128, 202, 278], [33, 71, 109, 147, 183, 221, 259, 297]]
    for d in range(1, 4):
        s.append('<text data-step="%d" x="%d" y="13" text-anchor="middle" class="axl">Employee %d</text>' % (2 * d, xs[d], d))
        for j, y in enumerate(levels[d]):
            py = levels[d - 1][j // 2]
            lab = "S" if j % 2 == 0 else "F"
            s.append(arr(xs[d - 1], py, xs[d], y, 2 * d - 1, "p = .1" if lab == "S" else ".9") if d < 3 else arr(xs[d - 1], py, xs[d], y, 2 * d - 1, ""))
            s.append(node(xs[d], y, lab, 2 * d, "t-seal" if lab == "S" else "t-ink"))
    seqs = ["SSS", "SSF", "SFS", "SFF", "FSS", "FSF", "FFS", "FFF"]
    for y, q in zip(levels[3], seqs):
        k = q.count("S")
        pr = 0.1 ** k * 0.9 ** (3 - k)
        cls = "t-seal" if k == 1 else ""
        s.append('<text data-step="7" x="418" y="%d" class="%s">(%s)  x = %d  %s</text>' % (y + 4, cls, ", ".join(q), k, ("%.3f" % pr)))
    s.append('<text data-step="8" x="636" y="330" text-anchor="end" class="t-seal">P(x = 1) = .081 + .081 + .081 = .243</text></svg>')
    return fig("".join(s), "Tree diagram for Evans Electronics (S = the employee leaves, p = .1; F = stays, .9). The three outcomes with exactly one S each have probability (.1)(.9)² = .081.",
               "Evans 電子的樹狀圖（S = 離職，p = .1；F = 留下，.9）。恰好一個 S 的三種結果，每種機率都是 (.1)(.9)² = .081。")

def fig_pois():
    ps = [3 ** x * math.exp(-3) / math.factorial(x) for x in range(10)]
    return fig(bar_fig(list(range(10)), ps, lambda x: x == 4, "x = arrivals in 30 minutes", "f(x)"),
               "Poisson distribution with μ = 3 arrivals per half-hour (Mercy Hospital). The highlighted bar is f(4) = .1680; the bars go on without end but soon become negligible.",
               "μ = 每半小時 3 人的卜瓦松分配（Mercy 醫院）。標色的是 f(4) = .1680；長條無限延伸，但很快就小到可以忽略。")

# ---------- Ch6 figures ----------
class Curve:
    """A density figure: data x-range [lo, hi], height range [0, ym]."""
    def __init__(self, lo, hi, ym, w=640, h=250, L=40, R=20, B=46, T=20):
        self.lo, self.hi, self.ym, self.w, self.h, self.L, self.R, self.B, self.T = lo, hi, ym, w, h, L, R, B, T
        self.s = ['<svg viewBox="0 0 %d %d" role="img">' % (w, h)]
    def X(self, v): return self.L + (v - self.lo) / (self.hi - self.lo) * (self.w - self.L - self.R)
    def Y(self, v): return self.h - self.B - v / self.ym * (self.h - self.B - self.T)
    def axis(self):
        self.s.append('<line class="ax" x1="%d" y1="%.1f" x2="%d" y2="%.1f"/>' % (self.L - 10, self.Y(0), self.w - self.R + 6, self.Y(0)))
    def area(self, f, a, b, cls="soft", n=160):
        pts = ["%.1f,%.1f" % (self.X(a), self.Y(0))] + ["%.1f,%.1f" % (self.X(a + (b - a) * i / n), self.Y(f(a + (b - a) * i / n))) for i in range(n + 1)] + ["%.1f,%.1f" % (self.X(b), self.Y(0))]
        self.s.append('<polygon class="%s" points="%s"/>' % (cls, " ".join(pts)))
    def line(self, f, a=None, b=None, n=240):
        a = self.lo if a is None else a; b = self.hi if b is None else b
        self.s.append('<polyline class="line" points="%s"/>' % " ".join("%.1f,%.1f" % (self.X(a + (b - a) * i / n), self.Y(f(a + (b - a) * i / n))) for i in range(n + 1)))
    def tick(self, v, t, t2=None, cls=""):
        self.s.append('<line class="ax" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/><text class="%s" x="%.1f" y="%.1f" text-anchor="middle">%s</text>' % (self.X(v), self.Y(0), self.X(v), self.Y(0) + 5, cls, self.X(v), self.Y(0) + 18, t))
        if t2: self.s.append('<text class="tk" x="%.1f" y="%.1f" text-anchor="middle">%s</text>' % (self.X(v), self.Y(0) + 33, t2))
    def vline(self, v, y, cls="gl"):
        self.s.append('<line class="%s" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f"/>' % (cls, self.X(v), self.Y(0), self.X(v), self.Y(y)))
    def text(self, v, y, t, cls="t-seal", anchor="middle"):
        self.s.append('<text class="%s" x="%.1f" y="%.1f" text-anchor="%s">%s</text>' % (cls, self.X(v), self.Y(y), anchor, t))
    def raw(self, t): self.s.append(t)
    def out(self): return "".join(self.s) + "</svg>"

def npdf(mu, sd): return lambda x: math.exp(-0.5 * ((x - mu) / sd) ** 2) / (sd * math.sqrt(2 * math.pi))

def fig_unif():
    c = Curve(2, 18, 0.13)
    c.axis()
    f = lambda x: 0.1
    c.area(f, 12, 15, "warnf", 4)
    c.raw('<polyline class="line" points="%.1f,%.1f %.1f,%.1f %.1f,%.1f %.1f,%.1f"/>' % (c.X(5), c.Y(0), c.X(5), c.Y(.1), c.X(15), c.Y(.1), c.X(15), c.Y(0)))
    c.raw('<line class="gl" x1="%d" y1="%.1f" x2="%.1f" y2="%.1f"/><text x="%d" y="%.1f" text-anchor="end">.1</text>' % (c.L, c.Y(.1), c.X(5), c.Y(.1), c.L - 4, c.Y(.1) + 4))
    for v in (5, 10, 12, 15): c.tick(v, str(v))
    c.raw('<line class="ax" x1="%d" y1="%.1f" x2="%d" y2="%d"/>' % (c.L, c.Y(0), c.L, c.T - 4))
    c.text(13.5, .108, "P = 3 × .1 = .30")
    c.text(7.5, .108, "f(x) = 1/10 = .1", "t-ink")
    c.raw('<text class="axl" x="%d" y="%d" text-anchor="end">x = salad (ounces)</text>' % (c.w - c.R, c.h - 4))
    return fig(c.out(), "Slater's Buffet: f(x) = .1 between 5 and 15 ounces. The shaded rectangle from 12 to 15 has area 3 × .1 = .30, which is P(12 ≤ x ≤ 15).",
               "Slater 自助餐：5 到 15 盎司之間 f(x) = .1。12 到 15 的長方形面積 = 3 × .1 = .30，就是 P(12 ≤ x ≤ 15)。")

def fig_er():
    f = npdf(0, 1)
    c = Curve(-3.6, 3.6, 0.62, h=300, B=40, T=16)
    c.area(f, -3, 3, "soft")
    c.area(f, -2, 2, "soft")
    c.area(f, -1, 1, "soft")
    c.line(f)
    c.axis()
    for k in range(-3, 4):
        c.tick(k, ("μ" if k == 0 else "μ %s %sσ" % ("+" if k > 0 else "−", "" if abs(k) == 1 else abs(k))))
    for k, lab, y in ((1, "68.26%", .47), (2, "95.44%", .53), (3, "99.72%", .59)):
        c.raw('<line class="gl2" x1="%.1f" y1="%.1f" x2="%.1f" y2="%.1f" marker-start="url(#ah_er)" marker-end="url(#ah_er)"/>' % (c.X(-k), c.Y(y), c.X(k), c.Y(y)))
        c.text(0, y + .015, lab)
    c.s[0] += marker("ah_er")
    return fig(c.out(), "Empirical rule: about 68.26% of the values lie within μ ± 1σ, 95.44% within μ ± 2σ and 99.72% within μ ± 3σ. The curve is symmetric, so half of the area is on each side of μ.",
               "經驗法則：約 68.26% 落在 μ ± 1σ、95.44% 在 μ ± 2σ、99.72% 在 μ ± 3σ。曲線對稱，μ 兩邊各一半面積。")

def fig_pep():
    f = npdf(15, 6)
    c = Curve(-5, 35, f(15) * 1.18)
    c.area(f, 20, 35, "warnf")
    c.line(f)
    c.axis()
    c.vline(15, f(15))
    c.vline(20, f(20), "mk-mean")
    c.tick(15, "15", "z = 0")
    c.tick(20, "20", "z = .83", "t-seal")
    c.text(34.5, f(15) * .88, "P(x &gt; 20) = 1 − .7967 = .2033", "t-seal", "end")
    c.text(11.5, f(15) * .3, ".7967", "t-ink")
    c.raw('<text class="axl" x="%d" y="%d" text-anchor="end">x = demand (liters)</text>' % (c.w - c.R, 14))
    return fig(c.out(), "Pep Zone: demand during the lead time is normal with μ = 15 and σ = 6. The table gives the area left of z = .83 (.7967); the stockout probability is the right tail, .2033.",
               "Pep Zone：補貨期間需求為常態，μ = 15、σ = 6。查表得到 z = .83 左邊面積 .7967；缺貨機率是右尾 .2033。")

def fig_reorder():
    f = npdf(15, 6)
    c = Curve(-5, 35, f(15) * 1.18)
    c.area(f, 24.87, 35, "warnf")
    c.line(f)
    c.axis()
    c.vline(15, f(15))
    c.vline(24.87, f(24.87), "mk-mean")
    c.tick(15, "15", "z = 0")
    c.tick(24.87, "24.87 → 25", "z = 1.645", "t-seal")
    c.text(27.5, f(15) * .3, "area .05", "t-seal", "start")
    c.text(11.5, f(15) * .3, ".95", "t-ink")
    c.raw('<text class="axl" x="%d" y="%d" text-anchor="end">x = demand (liters)</text>' % (c.w - c.R, 14))
    return fig(c.out(), "Reorder point: the right tail must be .05, so look up .95 inside the table (z = 1.645); x = 15 + 1.645 × 6 = 24.87, rounded up to 25 liters.",
               "再訂購點：右尾要 .05，所以在表內找 .95（z = 1.645）；x = 15 + 1.645 × 6 = 24.87，進位到 25 公升。")

def fig_exp():
    f = lambda x: math.exp(-x / 3) / 3
    c = Curve(0, 15, 0.38)
    c.area(f, 0, 2, "warnf")
    c.line(f)
    c.axis()
    c.raw('<line class="ax" x1="%d" y1="%.1f" x2="%d" y2="%d"/>' % (c.L, c.Y(0), c.L, c.T - 4))
    for v in (0, 2, 3, 6, 9, 12, 15): c.tick(v, str(v), cls="t-seal" if v == 2 else "")
    c.vline(2, f(2), "mk-mean")
    c.text(1, f(1) * .3, ".4866", "t-ink")
    c.text(6, f(4) + .02, "f(x) = (1/3) e^(−x/3)", "t-ink", "start")
    c.raw('<text x="%d" y="%.1f" text-anchor="end">1/3</text>' % (c.L - 4, c.Y(1 / 3) + 4))
    c.raw('<text class="axl" x="%d" y="%d" text-anchor="end">x = minutes between arrivals</text>' % (c.w - c.R, c.h - 4))
    return fig(c.out(), "Alan's pump: exponential with μ = 3 minutes. The curve starts at 1/μ and falls to the right (right-skewed). The shaded area from 0 to 2 is 1 − e^(−2/3) = .4866.",
               "Alan 加油站：μ = 3 分鐘的指數分配。曲線從 1/μ 開始往右下降（右偏）。0 到 2 的面積 = 1 − e^(−2/3) = .4866。")

def fig_pe():
    """Timeline: arrival ticks first, then the gap arrows (from one arrival to the next, in time order), then the labels."""
    arr_t = [3, 5.5, 11, 12.5, 18, 24, 25.5, 31, 37, 42, 43.5, 50, 55, 58.5]
    X = lambda t: 40 + t * 560 / 60
    s = ['<svg viewBox="0 0 660 200" role="img">' + marker("ah_pe"),
         '<line data-step="0" class="ax" x1="40" y1="110" x2="600" y2="110"/>']
    for t in (0, 15, 30, 45, 60):
        s.append('<line data-step="0" class="ax" x1="%.1f" y1="110" x2="%.1f" y2="116"/><text data-step="0" x="%.1f" y="131" text-anchor="middle">%d min</text>' % (X(t), X(t), X(t), t))
    for t in arr_t:
        s.append('<circle data-step="1" cx="%.1f" cy="110" r="5" fill="var(--seal)" stroke="var(--ink)"/>' % X(t))
    for i, (a, b) in enumerate(zip(arr_t, arr_t[1:])):
        if b - a >= 2.5:
            s.append('<line data-step="%d" x1="%.1f" y1="92" x2="%.1f" y2="92" stroke="var(--ink)" stroke-width="1.3" marker-end="url(#ah_pe)"/>' % (2 + i // 5, X(a) + 3, X(b) - 3))
    s.append('<text data-step="5" x="320" y="70" text-anchor="middle" class="t-ink">Exponential: the time between one car and the next (mean 3 min)</text>')
    s.append('<path data-step="6" d="M40,150 Q40,162 52,162 L308,162 Q320,162 320,174 Q320,162 332,162 L588,162 Q600,162 600,150" fill="none" stroke="var(--ink)" stroke-width="1.3"/>')
    s.append('<text data-step="7" x="320" y="192" text-anchor="middle" class="t-seal">Poisson: the number of cars in the hour (here 14; mean 20 per hour)</text></svg>')
    return fig("".join(s), "One process, two questions. Each dot is a car arriving. The Poisson counts the dots in a fixed hour; the exponential measures each gap from one dot to the next. 20 cars per hour on average ↔ 3 minutes between cars on average.",
               "同一個過程、兩種問題。每個點是一輛車抵達。卜瓦松數一小時內有幾個點；指數量相鄰兩點之間的間隔。平均每小時 20 輛 ↔ 平均每 3 分鐘一輛。")

FIGS = {"FIG_JSL": fig_jsl, "FIG_TREE": fig_tree, "FIG_POIS": fig_pois, "FIG_UNIF": fig_unif, "FIG_ER": fig_er,
        "FIG_PEP": fig_pep, "FIG_REORDER": fig_reorder, "FIG_EXP": fig_exp, "FIG_PE": fig_pe}

# ---------- written Problems: (title, data html, [(pts, question, english answer, chinese answer, [(weight, regex, label)])]) ----------
N = r"(?<![\d.])"
W = {
"ch5": [
 ("Discrete Probability Distribution (12 pts)", "<p>A random variable x has the probability distribution below.</p><table><tr><th>x</th><td>1</td><td>2</td><td>3</td><td>4</td></tr><tr><th>f(x)</th><td>0.2</td><td>0.3</td><td>0.4</td><td>?</td></tr></table>", [
  (2, "Find f(4). Explain which required condition you used.", "f(4) = 1 − (0.2 + 0.3 + 0.4) = 0.1, because the probabilities must sum to 1 (and each f(x) ≥ 0).", "機率總和必須為 1：f(4) = 1 − 0.9 = 0.1。", [(1.5, N + r"0?\.1(?!\d)", "f(4) = 0.1"), (0.5, r"sum|add|total|總和|加起來|= ?1\b", "sum to 1")]),
  (3, "Compute the expected value E(x).", "E(x) = Σx f(x) = 1(0.2) + 2(0.3) + 3(0.4) + 4(0.1) = 0.2 + 0.6 + 1.2 + 0.4 = 2.4.", "E(x) = 0.2 + 0.6 + 1.2 + 0.4 = 2.4。", [(3, N + r"2\.4(?!\d)", "E(x) = 2.4")]),
  (4, "Compute the variance and the standard deviation of x.", "Var(x) = Σ(x − μ)² f(x) = (1.96)(0.2) + (0.16)(0.3) + (0.36)(0.4) + (2.56)(0.1) = 0.392 + 0.048 + 0.144 + 0.256 = 0.84; σ = √0.84 = 0.9165.", "Var(x) = 0.84（或 E(x²) − μ² = 6.6 − 5.76）；σ = 0.9165。", [(2, N + r"0?\.84(?!\d)", "Var = 0.84"), (2, N + r"0?\.91[67]", "σ = 0.9165")]),
  (3, "Is f(x) = x/10 for x = 1, 2, 3, 4 a valid probability function? Explain.", "Yes. f(1) = .1, f(2) = .2, f(3) = .3, f(4) = .4: every value is ≥ 0 and they sum to 1.", "是：每個 f(x) ≥ 0，且 .1 + .2 + .3 + .4 = 1。", [(1, r"\byes\b|valid|是|有效|可以", "yes"), (1, r"≥ ?0|>= ?0|non-?negative|nonnegative|不為負|大於等於 ?0|非負", "f(x) ≥ 0"), (1, r"sum|total|= ?1\b|總和|加起來", "sum = 1")]),
 ]),
 ("Binomial Distribution (14 pts)", "<p>30% of the customers who enter a store make a purchase. Ten customers enter, and their decisions are independent. Let x = the number who make a purchase.</p>", [
  (3, "Explain why x has a binomial distribution.", "There are n = 10 identical trials, each with two outcomes (buy or not), the probability of success p = 0.3 is the same on every trial, and the trials are independent.", "n = 10 次相同試驗、每次兩種結果、p = 0.3 不變、彼此獨立，所以是二項分配。", [(0.75, r"10|identical|相同", "n identical trials"), (0.75, r"two outcomes|success|兩種|成功", "two outcomes"), (0.75, r"0?\.3|same|constant|不變|相同", "p constant"), (0.75, r"independ|獨立", "independent")]),
  (4, "Compute P(x = 2).", "f(2) = C(10, 2)(0.3)²(0.7)⁸ = 45 × 0.09 × 0.05765 = 0.2335.", "f(2) = 45 × 0.09 × 0.05765 = 0.2335。", [(1, r"\b45\b|C\(10, ?2\)", "C(10, 2) = 45"), (3, N + r"0?\.233|0?\.2335", "0.2335")]),
  (3, "Compute the probability that at least one customer makes a purchase.", "P(x ≥ 1) = 1 − P(x = 0) = 1 − (0.7)¹⁰ = 1 − 0.0282 = 0.9718.", "至少一人：1 − 0.7¹⁰ = 1 − 0.0282 = 0.9718。", [(1, r"1 ?[-−] ?|complement|補|0?\.028", "1 − P(0)"), (2, N + r"0?\.971[78]?|0?\.972", "0.9718")]),
  (4, "Compute the expected value, the variance and the standard deviation of x.", "E(x) = np = 10(0.3) = 3; Var(x) = np(1 − p) = 10(0.3)(0.7) = 2.1; σ = √2.1 = 1.449.", "E(x) = 3、Var(x) = 2.1、σ = 1.449。", [(1, r"\b3\b", "E = 3"), (1.5, N + r"2\.1(?!\d)", "Var = 2.1"), (1.5, N + r"1\.449|1\.45", "σ = 1.449")]),
 ]),
 ("Poisson Distribution (12 pts)", "<p>Calls arrive at a help desk at an average rate of 4 per hour, following a Poisson distribution.</p>", [
  (4, "What is the probability of exactly 2 calls in one hour?", "μ = 4: f(2) = 4² e⁻⁴ / 2! = 16(0.0183)/2 = 0.1465.", "μ = 4：f(2) = 16 × 0.0183 / 2 = 0.1465。", [(1, r"μ ?= ?4|mu ?= ?4|\b16\b", "μ = 4"), (3, N + r"0?\.146|0?\.1465", "0.1465")]),
  (4, "What is the probability of no calls in a 30-minute period?", "Rescale: μ = 4/2 = 2 per 30 minutes. f(0) = 2⁰ e⁻² / 0! = e⁻² = 0.1353.", "先換區間：30 分鐘 μ = 2。f(0) = e⁻² = 0.1353。", [(1.5, r"μ ?= ?2|mu ?= ?2|e\^?\(?[-−]2|e⁻²", "μ = 2 for 30 minutes"), (2.5, N + r"0?\.135", "0.1353")]),
  (4, "Give the mean, the variance and the standard deviation of the number of calls in 30 minutes.", "For a Poisson distribution the mean equals the variance: mean = 2, variance = 2, σ = √2 = 1.414.", "卜瓦松平均數＝變異數＝2，σ = 1.414。", [(1, r"mean|平均", "mean"), (1.5, r"variance ?= ?2|變異數 ?=? ?2|\b2\b", "variance = 2"), (1.5, N + r"1\.41", "σ = 1.414")]),
 ]),
 ("Hypergeometric Distribution (12 pts)", "<p>A box holds 10 parts, 3 of which are defective. An inspector selects 4 parts at random without replacement. Let x = the number of defective parts selected.</p>", [
  (4, "Compute P(x = 1).", "N = 10, r = 3, n = 4: f(1) = C(3, 1)C(7, 3)/C(10, 4) = 3 × 35 / 210 = 0.5.", "f(1) = 3 × 35 / 210 = 0.5。", [(1, r"\b210\b", "C(10, 4) = 210"), (1, r"\b35\b", "C(7, 3) = 35"), (2, N + r"0?\.5(?!\d)|1/2", "0.5")]),
  (3, "Compute P(x = 0).", "f(0) = C(3, 0)C(7, 4)/C(10, 4) = 1 × 35 / 210 = 0.1667.", "f(0) = 35 / 210 = 0.1667。", [(3, N + r"0?\.1667?|1/6|0?\.167", "0.1667")]),
  (5, "Compute E(x) and Var(x). Why is this not a binomial distribution?", "E(x) = n(r/N) = 4(0.3) = 1.2; Var(x) = n(r/N)(1 − r/N)(N − n)/(N − 1) = 4(0.3)(0.7)(6/9) = 0.56. Sampling is without replacement from a small population, so the trials are not independent and p changes from trial to trial.", "E(x) = 1.2；Var(x) = 4(0.3)(0.7)(6/9) = 0.56。抽出不放回、母體小，試驗不獨立、p 會改變，所以不是二項。", [(1.5, N + r"1\.2(?!\d)", "E = 1.2"), (2, N + r"0?\.56(?!\d)", "Var = 0.56"), (1.5, r"without replacement|not independent|不放回|不獨立|changes|改變", "without replacement / not independent")]),
 ]),
],
"ch6": [
 ("Uniform Distribution (12 pts)", "<p>The flight time between two cities is uniformly distributed between 120 and 140 minutes.</p>", [
  (3, "Give the probability density function of the flight time x.", "f(x) = 1/(140 − 120) = 1/20 = 0.05 for 120 ≤ x ≤ 140, and 0 elsewhere.", "f(x) = 1/20 = 0.05（120 ≤ x ≤ 140），其他為 0。", [(2, N + r"0?\.05(?!\d)|1/20", "f(x) = 1/20"), (1, r"120[^\n]{0,20}140", "120 ≤ x ≤ 140")]),
  (3, "What is the probability that the flight takes no more than 125 minutes?", "P(x ≤ 125) = (125 − 120)(0.05) = 0.25.", "P(x ≤ 125) = 5 × 0.05 = 0.25。", [(3, N + r"0?\.25(?!\d)", "0.25")]),
  (3, "What is the probability that the flight takes between 128 and 136 minutes?", "P(128 ≤ x ≤ 136) = (136 − 128)(0.05) = 8 × 0.05 = 0.40.", "P = 8 × 0.05 = 0.40。", [(3, N + r"0?\.40?(?!\d)", "0.40")]),
  (3, "Compute the expected flight time and its variance.", "E(x) = (120 + 140)/2 = 130 minutes; Var(x) = (140 − 120)²/12 = 400/12 = 33.33.", "E(x) = 130 分鐘；Var(x) = 400/12 = 33.33。", [(1.5, r"\b130\b", "E = 130"), (1.5, N + r"33\.3", "Var = 33.33")]),
 ]),
 ("Normal Distribution (20 pts)", "<p>Exam scores are normally distributed with μ = 70 and σ = 8.</p>", [
  (2, "What is P(x &gt; 70)?", "0.5, because the normal curve is symmetric and half of the area lies to the right of the mean.", "0.5：常態曲線對稱，平均數右邊占一半面積。", [(2, N + r"0?\.5(?!\d)|50 ?%|half|一半", "0.5")]),
  (4, "What is the probability that a score is below 82?", "z = (82 − 70)/8 = 1.5; P(x &lt; 82) = P(z &lt; 1.5) = 0.9332.", "z = 1.5，查表 0.9332。", [(1.5, N + r"1\.5(?!\d)", "z = 1.5"), (2.5, N + r"0?\.9332", "0.9332")]),
  (4, "What is the probability that a score is between 62 and 82?", "z = (62 − 70)/8 = −1 and z = 1.5: P = 0.9332 − 0.1587 = 0.7745.", "z = −1 與 1.5：0.9332 − 0.1587 = 0.7745。", [(1, r"[-−] ?1(?![\d.])|0?\.1587", "z = −1 (0.1587)"), (3, N + r"0?\.774", "0.7745")]),
  (4, "Using the empirical rule, what percentage of scores lie between 54 and 86?", "54 and 86 are μ ± 2σ (70 ± 16), so about 95.44% of the scores.", "54 到 86 是 μ ± 2σ，所以約 95.44%（約 95%）。", [(1.5, r"2 ?σ|2 ?sigma|two standard|兩個標準差|± ?2|±16", "μ ± 2σ"), (2.5, r"95(\.4)?", "95.44%")]),
  (6, "What score is needed to be in the top 10% of the class?", "The right tail is 0.10, so find 0.90 inside the table: z ≈ 1.28. x = μ + zσ = 70 + 1.28 × 8 = 80.24, so a score of about 80.24 or more.", "右尾 0.10 → 表內找 0.90，z ≈ 1.28；x = 70 + 1.28 × 8 = 80.24。", [(1, r"0?\.90?\b|0?\.8997|0?\.9015", "look up 0.90"), (2, N + r"1\.28", "z = 1.28"), (3, N + r"80\.2", "x = 80.24")]),
 ]),
 ("Exponential Distribution (12 pts)", "<p>The service time at a bank teller is exponentially distributed with a mean of 4 minutes.</p>", [
  (3, "Write the probability density function of the service time x.", "f(x) = (1/4) e^(−x/4) for x ≥ 0.", "f(x) = (1/4)e^(−x/4)，x ≥ 0。", [(1.5, r"1/4|0?\.25", "1/μ = 1/4"), (1.5, r"e\^?\(?[-−] ?x ?/ ?4|e[-−]x/4|x/4", "e^(−x/4)")]),
  (3, "What is the probability that a customer is served within 2 minutes?", "P(x ≤ 2) = 1 − e^(−2/4) = 1 − 0.6065 = 0.3935.", "P(x ≤ 2) = 1 − e^(−0.5) = 0.3935。", [(3, N + r"0?\.393", "0.3935")]),
  (3, "What is the probability that the service takes more than 6 minutes?", "P(x &gt; 6) = e^(−6/4) = e^(−1.5) = 0.2231.", "P(x > 6) = e^(−1.5) = 0.2231。", [(3, N + r"0?\.223", "0.2231")]),
  (3, "What is the standard deviation of the service time? On average, how many customers per hour can the teller serve, and which distribution describes that number?", "σ = μ = 4 minutes. On average 60/4 = 15 customers per hour; the number served per hour follows a Poisson distribution.", "σ = μ = 4 分鐘；平均每小時 60/4 = 15 人，人數服從卜瓦松分配。", [(1, r"σ ?= ?4|\b4\b", "σ = 4"), (1, r"\b15\b", "15 per hour"), (1, r"poisson|卜瓦松", "Poisson")]),
 ]),
 ("Standard Normal Table (6 pts)", "<p>z is a standard normal random variable.</p>", [
  (3, "Compute P(z ≥ −0.5).", "P(z ≥ −0.5) = 1 − P(z &lt; −0.5) = 1 − 0.3085 = 0.6915 (or, by symmetry, P(z ≤ 0.5) = 0.6915).", "1 − 0.3085 = 0.6915（或用對稱 P(z ≤ 0.5)）。", [(3, N + r"0?\.6915", "0.6915")]),
  (3, "Find the z value that cuts off an area of 0.025 in the upper tail.", "Look up 1 − 0.025 = 0.975 inside the table: z = 1.96.", "表內找 0.975：z = 1.96。", [(1, r"0?\.975", "look up 0.975"), (2, N + r"1\.96", "z = 1.96")]),
 ]),
],
}

KEYS_MORE = {}
def plain(s): return html.unescape(re.sub(r"<[^>]+>", "", s))
def chw(ch):
    key = ch + "w"
    total = sum(q[0] for t, d, qs in W[ch] for q in qs)
    out = ['<div class="exam chw noshuf" data-exam="%s">' % key, "<h2>Problems (%d pts)</h2>" % total,
           '<div class="examtools"><span class="score"></span><span class="timer" hidden></span><button class="btn tbtn" type="button" hidden>Start timer</button><button class="btn primary gradeall" type="button">Grade all</button><button class="btn reset" type="button">Clear answer</button><span class="gmsg"></span></div><p class="box tip nogradenote">This uses keyword matching for automatic grading: you get credit for including the required terms (English or Chinese) or numbers. The score is only a reference; always open the reference answer to compare.</p>']
    for qi, (title, data, qs) in enumerate(W[ch], 1):
        out.append("<h3>Question %d　%s</h3>" % (qi, title))
        out.append(data)
        for j, (pts, q, en, zhs, keys) in enumerate(qs, 1):
            qid = "%s-%d-%d" % (key, qi, j)
            out.append('<div class="exq" id="%s" data-pts="%g"><div class="qtext"><p class="q"><span class="pts">%d-%d</span>%s (%g points)</p></div><label class="small" for="%s-a">Your answer</label><textarea id="%s-a" rows="4" placeholder="Write your answer here (English or Chinese is fine)"></textarea><div class="gradebar"><button class="btn grade" type="button">Grade this question</button><span class="gstat"></span></div><div class="gres" hidden></div><details class="qa"><summary>Show reference answer</summary><div class="inner">' % (qid, pts, qi, j, q, pts, qid, qid))
            out.append('<div class="box en"><span class="lbl">ENGLISH ANSWER</span>%s<div class="zhtr"><span>中文</span>%s</div></div>' % (en, zhs))
            out.append("</div></details></div>")
            tw = sum(k[0] for k in keys)
            KEYS_MORE[qid] = [{"w": round(k[0] * pts / tw, 4), "re": k[1], "k": plain(k[2])} for k in keys]
    out.append("</div>")
    return "\n".join(out)

chapters = []
for c in CHAPTERS:
    t = open(os.path.join(HERE, "stats-final", c + ".html"), encoding="utf-8").read()
    t = re.sub(r"\{\{(FIG_\w+)\}\}", lambda m: FIGS[m.group(1)](), t)
    t = t.replace("<!--CHW-->", chw(c))
    chapters.append(t)

# ---------- head ----------
mi = lines.index("<main>")
head = "\n".join(lines[:mi + 1])
desc = "統計學期末考衝刺：Anderson 14e Ch5 離散機率分配、Ch6 連續機率分配 講義（含圖形解析）、互動圖、選擇題與計算題。日期未定，之後會再加章節。"
head = head.replace("<title>Statistics midterm prep｜EZexams</title>", "<title>Statistics final prep｜EZexams</title>")
head = head.replace('content="Statistics midterm prep｜EZexams"', 'content="Statistics final prep｜EZexams"')
head = re.sub(r'(<meta (?:name|property)="(?:og:)?description" content=")[^"]*"', lambda m: m.group(1) + desc + '"', head)
head = head.replace("statistics/midterm/", "statistics/final/")
head = re.sub(r'<script src="../../assets/ezplan.js[^"]*" defer></script>\n', "", head)
extra_css = """<style>
.scope{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:12px 0 20px}
.scope .c{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--paper)}
.scope .c b{display:block;font-size:calc(16px*var(--ts,1));margin-bottom:4px}
.fg{margin:20px 0}
.fg svg{display:block;width:100%;height:auto;margin:0 auto}
.fg.wide,.fg.wide svg{max-width:none;width:100%}
.fg svg text{font-family:var(--f-mono);font-size:calc(12px*var(--ts,1));fill:var(--ink70)}
.fg svg .ax{stroke:var(--ink);stroke-width:1.2}
.fg svg .bar{fill:var(--indigo);fill-opacity:.75;stroke:var(--ink);stroke-width:1}
.fg svg .bar2{fill:var(--seal);fill-opacity:.7;stroke:var(--ink);stroke-width:1}
.fg svg .soft{fill:var(--indigo-mid)}
.fg svg .warnf{fill:var(--warn);fill-opacity:.4}
.fg svg .line{fill:none;stroke:var(--ink);stroke-width:1.8}
.fg svg .gl{stroke:var(--line-strong);stroke-width:1;stroke-dasharray:4 3}
.fg svg .gl2{stroke:var(--ink);stroke-width:1.2}
.fg svg .mk-mean{stroke:var(--seal);stroke-width:2}
.fg svg .ahd{fill:var(--ink)}
.fg svg .t-seal{fill:var(--seal);font-weight:600}
.fg svg .t-ink{fill:var(--ink)}
.fg svg .axl{fill:var(--ink);font-weight:600}
.fg svg .tk{fill:var(--muted);font-size:calc(11px*var(--ts,1))}
.fg figcaption{font-size:calc(14px*var(--ts,1));color:var(--ink70);margin-top:8px;line-height:1.6}
.ilab .calc{white-space:pre-line;font-family:var(--f-mono);font-size:calc(13px*var(--ts,1))}
.ilab input[type=number]{width:90px}
</style>"""
head = head.replace("</head>", extra_css + "\n</head>", 1)

home = """<section role="tabpanel" class="view" id="home">
  <div class="vhead"><div class="pcb" data-pcb="home" role="img"></div><p class="vmeta">Final: <span data-examdate>TBA</span></p><h1>Statistics final prep</h1>
  <p>Anderson, Statistics for Business and Economics, 14e. For now the page covers Ch5 and Ch6; the exam date is not set yet, and more chapters will be added when they are available. Each chapter follows the teacher's slides (every example worked through, every figure explained, interactive figures for the distributions), then has 20 multiple-choice questions and a Problems section of calculations like the exam.</p></div>
  <div class="next" id="nextStep"></div>
  <h3>Chapters so far</h3>
  <div class="scope">
  <div class="c"><b>Ch5 Discrete Probability Distributions</b>Random variables, f(x), expected value and variance, bivariate distributions, covariance and correlation, binomial, Poisson, hypergeometric.<br><button class="btn" data-go="ch5">Ch5</button></div>
  <div class="c"><b>Ch6 Continuous Probability Distributions</b>Area as probability, uniform, normal and standard normal (z, table look-ups both ways, reorder point), exponential, Poisson vs exponential.<br><button class="btn" data-go="ch6">Ch6</button></div>
  </div>
  <h3>Progress</h3>
  <table class="prog" id="progTable"></table>
  <p class="small" id="storeNote">Scores are stored only in this device's browser. Switching devices or clearing browsing data resets them to zero.</p>
  <h3>How to use these notes</h3>
  <div class="box zh"><span class="lbl">Box types</span><b>Blue boxes</b> hold the formulas and English answers to memorize (Chinese below). Black “Interactive” boxes let you change the numbers and see the distribution and the working. <b>Yellow boxes</b> are answer tips; <b>red boxes</b> mark mistakes in the slides or common traps.</div>
  <div class="box tip"><span class="lbl">Answer tips</span><ul>
  <li>Show your work: name the distribution, write the formula, plug in the numbers, then give the answer.</li>
  <li>Poisson: rescale μ to the interval in the question first. Hypergeometric: sampling without replacement from a small population.</li>
  <li>The z-table gives the area to the left. Right tail = 1 − table value; to find z from an area, look the area up inside the table.</li>
  <li>Round a reorder point (or any “at most 5%” cut-off) up, not down.</li></ul></div>
  <p><button class="btn zhbtn" type="button"></button></p>
</section>"""

traps = '<section role="tabpanel" class="view" id="traps" hidden><div class="vhead"><h1>Summary &amp; Common Traps<span class="zhn">各章總結與易錯點</span></h1><p>Every chapter\'s summary and common traps on one page, in chapter order. Read this the night before.<span class="zhn">把每一章的總結和易錯點集中在同一頁，照章節順序排列，考前一晚看這頁。</span></p></div><div id="trapsBody"></div></section>'

ti = lines.index("</main>")
tail = "\n".join(lines[ti:]).replace('data-key="stats-midterm-v1"', 'data-key="stats-final-v1"')
assert 'data-key="stats-final-v1"' in tail
page = head + "\n" + home + "\n" + "\n".join(chapters) + "\n" + traps + "\n" + tail
open(OUT + "/index.html", "w", encoding="utf-8").write(page)

# ---------- quiz.js ----------
open(OUT + "/quiz.js", "w", encoding="utf-8").write("""/* statistics final question bank (QUIZ).
   The chapter exercises are AI practice: questions are made one at a time from the chapter notes by the Worker and each answer is
   revealed only after you answer. Here each set only keeps how many slots it has (progress is saved by slot position, so these
   counts must not change). Built by tools/src/stats_final_build.py. */
const EZSTUB=n=>Array.from({length:n},()=>({}));
const QUIZ = {
%s
};

/* Keyword rules for each chapter's Problems (merged into KEYS in app.js). */
const KEYS_MORE=%s;
""" % (",\n".join(' "%s":EZSTUB(20)' % c for c in CHAPTERS), json.dumps(KEYS_MORE, ensure_ascii=False)))

# ---------- app.js ----------
a = open(MID + "/app.js", encoding="utf-8").read()
def rep(old, new):
    global a
    assert old in a, old[:80]
    a = a.replace(old, new, 1)
rep("/* statistics midterm page logic", "/* statistics final page logic (built by tools/src/stats_final_build.py from statistics/midterm/app.js)")
a = re.sub(r"const VIEWS=\[.*?\];", 'const VIEWS=[["home","Home"],["ch5","Ch5 Discrete distributions"],["ch6","Ch6 Continuous distributions"],["traps","Summary & traps"]];', a, count=1)
rep('const KEY="stats-midterm-v1";', 'const KEY="stats-final-v1";')
a = re.sub(r'window\.EZLAST=\{[^}]*\};', 'window.EZLAST={ch:"ch6",label:"Summary & traps",go:"traps"};', a, count=1)
rep("const PID={home:0,ch1:1,ch2:2,ch3:3,ch4:4,confuse:5,hw:6,review:7};", "const PID={home:0,ch5:1,ch6:2,traps:3};")
rep('const c=["ch1","ch2","ch3","ch4"].filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:4};',
    'const c=["ch5","ch6"].filter(c=>procState(c).state==="terminated").length;return {state:"running",done:c,n:2};')
rep('EZGEN.attach({course:"Statistics",s:"stats",ai:["ch1","ch2","ch3","ch4"]', 'EZGEN.attach({course:"Statistics",s:"statsf",ai:["ch5","ch6"]')
a, n = re.subn(r"const KEYS=\{\n.*?\n\};", "const KEYS={};", a, count=1, flags=re.S)
assert n == 1
rep("Business Statistics midterm assignment (Anderson et al., Statistics for Business and Economics 14e, Chapters 1-4)", "Business Statistics final exam practice problems (Anderson et al., Statistics for Business and Economics 14e, Chapters 5-6)")
rep('[["ch1","Ch1 chapter exercises"],["ch2","Ch2 chapter exercises"],["ch3","Ch3 chapter exercises"],["ch4","Ch4 chapter exercises"]]', '[["ch5","Ch5 chapter exercises"],["ch6","Ch6 chapter exercises"]]')
a, n = re.subn(r'  \[\["hw","Midterm assignment"\]\]\.forEach\(.*?\n  \}\);\n', "", a, count=1, flags=re.S)
assert n == 1
rep('p.textContent="All done. Review the 32 confusable-concept groups once more before the exam, then get some sleep.";', 'p.textContent="All done. Before the exam, read Summary & traps and redo the questions you got wrong.";')
a, n = re.subn(r'EZgenw\.attach\(\{course:"Statistics",subject:"statistics",s:"stats",get:\(\)=>S,save:\(\)=>save\(\),blocks:\[.*?\]\.filter',
              'EZgenw.attach({course:"Statistics",subject:"statistics",s:"statsf",get:()=>S,save:()=>save(),blocks:[\n    blk("ch5w","ch5",["ch5"],document.querySelector(\'[data-exam="ch5w"]\')),\n    blk("ch6w","ch6",["ch6"],document.querySelector(\'[data-exam="ch6w"]\'))\n  ].filter', a, count=1, flags=re.S)
assert n == 1
i = a.index("/* ---------- interactive labs ---------- */")
a = a[:i] + open(os.path.join(HERE, "stats_final_widgets.js"), encoding="utf-8").read()
for bad in ('"ch1"', "confuse", "midterm assignment"):
    if bad in a: print("note: app.js still mentions", bad)
open(OUT + "/app.js", "w", encoding="utf-8").write(a)
print("built", OUT)
