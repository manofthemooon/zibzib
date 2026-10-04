"""
Minimal local server for the zib zib alien translator landing page.
No external dependencies beyond `requests` (already installed).

Run:
    python3 server.py
Then open:
    http://localhost:8787
"""
import json
import re
import html as htmllib
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

import requests

from translator import translate_to_alien, translate_to_english

HERE = Path(__file__).resolve().parent
INDEX_HTML = (HERE / "index.html").read_text(encoding="utf-8")

PORT = 8787
MAX_BODY_BYTES = 20_000  # generous for any tweet/bio-length paste, blocks huge payloads
MAX_TEXT_LENGTH = 4000  # X Premium (verified) post limit, used as the translation input cap

TAG_RE = re.compile(r"<[^>]+>")
PIC_LINK_RE = re.compile(r"\s*pic\.twitter\.com/\S+")

ALLOWED_HOSTS = {"twitter.com", "www.twitter.com", "x.com", "www.x.com", "mobile.twitter.com"}


def extract_tweet_text(tweet_url: str) -> str:
    parsed = urlparse(tweet_url)
    if parsed.netloc.lower() not in ALLOWED_HOSTS:
        raise ValueError("Link must point to x.com")

    resp = requests.get(
        "https://publish.twitter.com/oembed",
        params={"url": tweet_url, "omit_script": "true"},
        headers={"User-Agent": "Mozilla/5.0 (compatible; ZibZibTranslator/1.0)"},
        timeout=10,
    )
    if resp.status_code != 200:
        raise ValueError(f"Couldn't fetch the post (status {resp.status_code}). It may be private or deleted.")

    data = resp.json()
    embed_html = data.get("html", "")

    match = re.search(r"<p[^>]*>(.*?)</p>", embed_html, re.S)
    if not match:
        raise ValueError("Couldn't find post text in the response.")

    inner = match.group(1)
    inner = TAG_RE.sub("", inner)
    inner = htmllib.unescape(inner)
    inner = PIC_LINK_RE.sub("", inner).strip()
    return inner


class Handler(BaseHTTPRequestHandler):
    def _send_json(self, payload, status=200):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            length = 0
        # A negative/garbage Content-Length would make rfile.read() block
        # waiting for data that never comes, freezing the whole (single
        # threaded) server for every client - reject it outright instead.
        if length < 0:
            raise ValueError("Invalid Content-Length.")
        if length > MAX_BODY_BYTES:
            raise ValueError(f"Request too large (max {MAX_BODY_BYTES} bytes).")
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw or b"{}")

    def do_GET(self):
        if self.path == "/" or self.path == "/index.html":
            body = INDEX_HTML.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        try:
            data = self._read_json()
            if self.path == "/api/translate":
                text = data.get("text", "")
                if not isinstance(text, str):
                    raise ValueError("Field text must be a string")
                if len(text) > MAX_TEXT_LENGTH:
                    raise ValueError(f"Text too long (max {MAX_TEXT_LENGTH} characters, same as a verified X post)")
                direction = data.get("direction", "to_alien")
                fn = translate_to_english if direction == "to_english" else translate_to_alien
                self._send_json({"translated": fn(text)})
                return

            if self.path == "/api/translate-tweet":
                url = data.get("url", "")
                if not isinstance(url, str):
                    raise ValueError("Field url must be a string")
                url = url.strip()
                if not url:
                    self._send_json({"error": "Empty link"}, status=400)
                    return
                original = extract_tweet_text(url)
                if len(original) > MAX_TEXT_LENGTH:
                    raise ValueError(f"Post text longer than {MAX_TEXT_LENGTH} characters, translation skipped")
                self._send_json({
                    "original": original,
                    "translated": translate_to_english(original),
                })
                return

            self._send_json({"error": "Unknown endpoint"}, status=404)
        except ValueError as e:
            self._send_json({"error": str(e)}, status=400)
        except Exception as e:
            self._send_json({"error": f"Internal error: {e}"}, status=500)

    def log_message(self, format, *args):
        pass


if __name__ == "__main__":
    print(f"Zib Zib translator running at http://localhost:{PORT}")
    HTTPServer(("localhost", PORT), Handler).serve_forever()
