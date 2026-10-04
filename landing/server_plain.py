"""
Minimal local server for the "plain" zib zib translator landing page - same
dictionary and security hardening as server.py, but backed by
translator_plain (no word-coining, unknown words left as English).

Serves static files from site/ (index.html, css/, js/, img/) and the
/api/translate + /api/translate-tweet endpoints.

Run:
    python3 server_plain.py
Then open:
    http://localhost:8788
"""
import json
import re
import html as htmllib
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import urlparse

import requests

from translator_plain import translate_to_alien, translate_to_english

HERE = Path(__file__).resolve().parent
SITE_DIR = (HERE / "site").resolve()

PORT = 8788
MAX_BODY_BYTES = 20_000  # generous for any tweet/bio-length paste, blocks huge payloads
MAX_TEXT_LENGTH = 4000  # X Premium (verified) post limit, used as the translation input cap

TAG_RE = re.compile(r"<[^>]+>")
PIC_LINK_RE = re.compile(r"\s*pic\.twitter\.com/\S+")

ALLOWED_HOSTS = {"twitter.com", "www.twitter.com", "x.com", "www.x.com", "mobile.twitter.com"}

CONTENT_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}


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
        if length < 0:
            raise ValueError("Invalid Content-Length.")
        if length > MAX_BODY_BYTES:
            raise ValueError(f"Request too large (max {MAX_BODY_BYTES} bytes).")
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw or b"{}")

    def _serve_static(self, rel_path: str):
        rel_path = rel_path.lstrip("/") or "index.html"
        target = (SITE_DIR / rel_path).resolve()
        if not target.is_relative_to(SITE_DIR) or not target.is_file():
            self.send_response(404)
            self.end_headers()
            return
        content_type = CONTENT_TYPES.get(target.suffix, "application/octet-stream")
        body = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        self._serve_static(path)

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
    print(f"Zib Zib translator (plain, no coining) running at http://localhost:{PORT}")
    HTTPServer(("localhost", PORT), Handler).serve_forever()
