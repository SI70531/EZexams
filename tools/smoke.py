"""Browser smoke test (run by .github/workflows/check.yml; by hand: pip install playwright && playwright install chromium,
then python3 tools/smoke.py). Serves the repo locally and opens the home page and every subject page in headless Chromium:

- no uncaught script errors
- every interactive figure (.widget / .ilab) actually built its content
- every tab listed in the tab bar has its panel
- the home page keeps every term inside #terms, and a term whose exams are all over is folded and sits last
- the keyword grader gives full marks to the reference answers listed in tools/smoke_cases.json
Exits with 1 when anything fails.
"""
import functools, glob, http.server, json, os, sys, threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8799

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    h = functools.partial(Quiet, directory=ROOT)
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

def main():
    srv = serve()
    pages = [""] + sorted(os.path.relpath(os.path.dirname(p), ROOT) + "/" for p in glob.glob(os.path.join(ROOT, "*", "*", "index.html")))
    cases = json.load(open(os.path.join(ROOT, "tools", "smoke_cases.json"), encoding="utf-8"))
    fails = []
    exe = os.environ.get("CHROME")
    with sync_playwright() as p:
        b = p.chromium.launch(**({"executable_path": exe} if exe else {}), args=["--no-sandbox"])
        for page in pages:
            pg = b.new_page(viewport={"width": 1180, "height": 900})
            errs = []
            pg.on("pageerror", lambda e, errs=errs: errs.append(str(e)))
            pg.route("**/*", lambda r: r.abort() if not r.request.url.startswith("http://127.0.0.1") else r.continue_())
            pg.goto("http://127.0.0.1:%d/%s" % (PORT, page), wait_until="load")
            pg.wait_for_timeout(1500)
            name = page or "home"
            for e in errs:
                fails.append("%s: script error: %s" % (name, e))
            if not page:
                r = pg.evaluate("""(()=>{const t=document.getElementById('terms');const all=[...document.querySelectorAll('.term')];
                  return {outside:all.filter(x=>x.parentElement!==t).map(x=>x.dataset.term),
                          order:[...t.children].map(x=>x.dataset.term+':'+([...x.querySelectorAll('.exam-subj')].every(s=>s.classList.contains('past'))?'done':'open'))}})()""")
                if r["outside"]:
                    fails.append("home: term(s) outside #terms: %s" % r["outside"])
                order = r["order"]
                if any(o.endswith(":done") for o in order) and not all(o.endswith(":done") for o in order):
                    first_done = next(i for i, o in enumerate(order) if o.endswith(":done"))
                    if any(o.endswith(":open") for o in order[first_done:]):
                        fails.append("home: a finished term is above an open one: %s" % order)
            else:
                r = pg.evaluate("""(()=>({
                  empty:[...document.querySelectorAll('.widget[data-w],.ilab')].filter(w=>w.children.length===0||/failed to load/i.test(w.textContent)).map(w=>w.dataset.w||w.className),
                  missing:(typeof VIEWS!=='undefined'?VIEWS:[]).filter(v=>v[0]!=='|'&&!document.getElementById(v[0])).map(v=>v[0])}))()""")
                for w in r["empty"]:
                    fails.append("%s: interactive figure did not build: %s" % (name, w))
                for v in r["missing"]:
                    fails.append("%s: tab %s has no panel" % (name, v))
                for c in cases.get(page.rstrip("/"), []):
                    got = pg.evaluate("([q,p,a])=>typeof keywordGrade==='function'?keywordGrade(q,p,a):null", [c["id"], c["pts"], c["answer"]])
                    if not got or got["score"] < c["pts"]:
                        fails.append("%s: keyword rule %s gives %s for its model answer" % (name, c["id"], got and got["score"]))
            print("%-36s %s" % (name, "ok" if not any(f.startswith(name + ":") for f in fails) else "FAIL"))
            pg.close()
        b.close()
    srv.shutdown()
    for f in fails:
        print(f)
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
