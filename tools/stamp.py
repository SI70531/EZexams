#!/usr/bin/env python3
"""Stamp every local script/stylesheet link in the site's HTML with a hash of the file's content,
e.g. assets/ezsync.js?v=3f9a12c0, so browsers fetch the new version as soon as a file changes.

Run it from the repo root after editing anything in assets/ or a quiz.js, then commit:
    python3 tools/stamp.py
The GitHub Action in .github/workflows/stamp.yml also runs it automatically on every push."""
import hashlib, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
REF = re.compile(r'((?:src|href)=")([^"?#:]+\.(?:js|css))(?:\?v=[^"]*)?(")')

def stamp(html_path):
    text = html_path.read_text(encoding="utf-8")
    def sub(m):
        target = (html_path.parent / m.group(2)).resolve()
        if not target.is_file() or ROOT not in target.parents:
            return m.group(0)
        h = hashlib.sha1(target.read_bytes()).hexdigest()[:8]
        return f"{m.group(1)}{m.group(2)}?v={h}{m.group(3)}"
    new = REF.sub(sub, text)
    if new != text:
        html_path.write_text(new, encoding="utf-8")
        return True
    return False

changed = [str(p.relative_to(ROOT)) for p in sorted(ROOT.rglob("*.html")) if ".git" not in p.parts and stamp(p)]
print("stamped:", ", ".join(changed) if changed else "nothing changed")
sys.exit(0)
