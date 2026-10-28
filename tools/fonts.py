"""Self-host the web fonts: downloads the Google Fonts CSS and every font file it points to into assets/fonts/,
(Iansui 芫荽 is the display font: a handwriting-style font that follows Taiwan's standard character forms,
unlike LXGW WenKai TC, which drew e.g. 輸 with the 刂 form.) Writes assets/fonts/fonts.css with local URLs (keeping each file's unicode-range, so a page still downloads only the
slices of the Chinese fonts it actually uses), and points every page at it instead of fonts.googleapis.com.
Run by .github/workflows/fonts.yml (needs network access to Google Fonts). Re-running is safe."""
import hashlib, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "fonts")
FAMILIES = ("family=Noto+Sans+TC:wght@400;500;700&family=Iansui"
            "&family=Source+Serif+4:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;600&display=swap")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
PAGES = ["index.html", "statistics/midterm/index.html", "operating-systems/midterm/index.html",
         "data-structures/midterm/index.html", "economics/midterm/index.html"]


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main():
    os.makedirs(OUT, exist_ok=True)
    css = get("https://fonts.googleapis.com/css2?" + FAMILIES).decode()
    urls = sorted(set(re.findall(r"url\((https://fonts\.gstatic\.com/[^)]+)\)", css)))
    print(len(urls), "font files")
    keep = set()
    for i, u in enumerate(urls):
        name = hashlib.sha1(u.encode()).hexdigest()[:16] + os.path.splitext(u)[1]
        keep.add(name)
        path = os.path.join(OUT, name)
        if not os.path.exists(path):
            with open(path, "wb") as f:
                f.write(get(u))
        css = css.replace(u, name)
        if i % 50 == 0:
            print(" ", i)
    for f in os.listdir(OUT):          # drop files Google no longer lists
        if f not in keep and f != "fonts.css":
            os.remove(os.path.join(OUT, f))
    with open(os.path.join(OUT, "fonts.css"), "w") as f:
        f.write("/* Self-hosted copy of Google Fonts (tools/fonts.py). Each @font-face keeps its unicode-range,\n"
                "   so the browser downloads only the slices of the Chinese fonts a page uses. */\n" + css)
    pat = re.compile(r'<link rel="preconnect" href="https://fonts\.googleapis\.com">\n?'
                     r'|<link rel="preconnect" href="https://fonts\.gstatic\.com" crossorigin>\n?')
    for p in PAGES:
        fp = os.path.join(ROOT, p)
        h = open(fp, encoding="utf-8").read()
        rel = "assets/fonts/fonts.css" if p == "index.html" else "../../assets/fonts/fonts.css"
        h2 = pat.sub("", h)
        h2 = re.sub(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com/css2\?[^"]*">', f'<link rel="stylesheet" href="{rel}">', h2)
        if h2 != h:
            open(fp, "w", encoding="utf-8").write(h2)
            print("updated", p)


if __name__ == "__main__":
    sys.exit(main())
