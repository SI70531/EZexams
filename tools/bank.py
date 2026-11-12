"""Encrypt / decrypt the question bank of the Worker.

The bank (questions AND answers of the chapter sets that predate AI practice) must not be public, but the repo and
GitHub Pages are. So only the encrypted copy, tools/bank.enc.json, is committed; the Worker decrypts it with the
BANK_KEY secret (AES-256-GCM). tools/bank.json (plain) is git-ignored and only exists on your own machine.

  BANK_KEY=... python3 tools/bank.py decrypt   # bank.enc.json -> bank.json  (to edit questions)
  BANK_KEY=... python3 tools/bank.py encrypt   # bank.json -> bank.enc.json  (then commit bank.enc.json)
"""
import base64, json, os, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

HERE = os.path.dirname(os.path.abspath(__file__))
PLAIN, ENC = os.path.join(HERE, "bank.json"), os.path.join(HERE, "bank.enc.json")

def key():
    k = os.environ.get("BANK_KEY", "")
    if not k:
        sys.exit("Set BANK_KEY (the same value as the Worker secret).")
    return base64.b64decode(k)

def encrypt():
    data = open(PLAIN, "rb").read()
    json.loads(data)  # refuse to encrypt a broken file
    iv = os.urandom(12)
    ct = AESGCM(key()).encrypt(iv, data, None)
    json.dump({"v": 1, "iv": base64.b64encode(iv).decode(), "data": base64.b64encode(ct).decode()}, open(ENC, "w"))
    print("wrote", ENC)

def decrypt():
    e = json.load(open(ENC))
    pt = AESGCM(key()).decrypt(base64.b64decode(e["iv"]), base64.b64decode(e["data"]), None)
    open(PLAIN, "wb").write(pt)
    print("wrote", PLAIN)

if __name__ == "__main__":
    {"encrypt": encrypt, "decrypt": decrypt}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
