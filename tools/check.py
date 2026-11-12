"""Static checks for every page (run by .github/workflows/check.yml, or by hand: python3 tools/check.py).

1. Tag balance: every <div>, <section>, <main>, <details>, <table> … that is opened is closed, in order.
   (A stray </div> once pushed the whole "Final prep" term out of #terms on the home page.)
2. Duplicate ids inside one page.
3. Every chapter written question (.exq) has a keyword rule in KEYS / KEYS_MORE, so grading without AI works.
Exits with 1 and prints file:line for every problem found.
"""
import glob, os, re, sys
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
CHECKED = {"div", "section", "main", "details", "table", "tr", "ul", "ol", "header", "nav", "figure", "svg", "g", "a", "button", "label", "summary", "p"}
# tags the HTML parser may legally close by itself (p, tr, li …) are tracked loosely
OPTIONAL_END = {"p", "tr", "li", "td", "th", "option", "dt", "dd"}

class Bal(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack, self.errors, self.ids, self.raw = [], [], {}, 0
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            return
        a = dict(attrs)
        if "id" in a and a["id"]:
            self.ids.setdefault(a["id"], []).append(self.getpos()[0])
        if tag in VOID or tag not in CHECKED:
            return
        if tag == "p" and self.stack and self.stack[-1][0] == "p":
            self.stack.pop()
        self.stack.append((tag, self.getpos()[0]))
    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a and a["id"]:
            self.ids.setdefault(a["id"], []).append(self.getpos()[0])
    def handle_endtag(self, tag):
        if tag not in CHECKED:
            return
        line = self.getpos()[0]
        if not any(t == tag for t, _ in self.stack):
            if tag != "p":
                self.errors.append("line %d: </%s> closes nothing (stray closing tag)" % (line, tag))
            return
        while self.stack and self.stack[-1][0] != tag:
            t, l = self.stack.pop()
            if t not in OPTIONAL_END:
                self.errors.append("line %d: <%s> opened on line %d is closed implicitly by </%s>" % (line, t, l, tag))
        self.stack.pop()

def keys_of(folder):
    names = set()
    for f in ("quiz.js", "app.js"):
        p = os.path.join(folder, f)
        if os.path.exists(p):
            names |= set(re.findall(r'"((?:ch\d+w|past|mock-[a-z])-\d+)"\s*:', open(p, encoding="utf-8").read()))
    return names

def main():
    problems = 0
    pages = sorted(glob.glob(os.path.join(ROOT, "*.html")) + glob.glob(os.path.join(ROOT, "*", "*", "index.html")))
    for path in pages:
        rel = os.path.relpath(path, ROOT)
        text = open(path, encoding="utf-8").read()
        b = Bal()
        b.feed(text)
        b.close()
        errs = list(b.errors)
        for t, l in b.stack:
            if t not in OPTIONAL_END:
                errs.append("line %d: <%s> is never closed" % (l, t))
        for i, lines in b.ids.items():
            if len(lines) > 1:
                errs.append("id \"%s\" is used %d times (lines %s)" % (i, len(lines), ", ".join(map(str, lines[:5]))))
        if os.path.basename(path) == "index.html" and rel.count(os.sep) == 2:
            have = keys_of(os.path.dirname(path))
            for qid in re.findall(r'<div class="exq" id="(ch\d+w-\d+)"', text):
                if qid not in have:
                    errs.append("written question %s has no keyword rule in quiz.js / app.js" % qid)
        for e in errs:
            print("%s: %s" % (rel, e))
        problems += len(errs)
        print("%-45s %s" % (rel, "ok" if not errs else "%d problem(s)" % len(errs)))
    sys.exit(1 if problems else 0)

if __name__ == "__main__":
    main()
