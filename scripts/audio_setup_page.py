"""One-use loopback-only credential form. Never calls Google or logs form data."""
import html
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import os
import secrets
import threading
from urllib.parse import parse_qs
from audio_pipeline import ROOT, configure_free_project


def page(message=""):
    return ("""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Nuevo Flow · Private audio setup</title><style>
body{font:18px system-ui;background:#f5f6f7;color:#15191c;max-width:620px;margin:8vh auto;padding:24px;line-height:1.5}
main{background:white;border:1px solid #ccd0d3;border-radius:20px;padding:32px}h1{font-size:30px}label{display:block;margin:24px 0 8px}input[type=password]{box-sizing:border-box;width:100%;padding:20px;font-size:22px;border:2px solid #465864;border-radius:12px}button{margin-top:28px;padding:16px 28px;font:inherit;border:0;border-radius:10px;background:#141a1d;color:white;cursor:pointer}.note{color:#52616b;font-size:15px}
</style><main><h1>Save your Gemini API key</h1><p>Click the large field below and paste normally with <strong>Command+V</strong>. You will see dots when the key is entered.</p>""" + ("<p role='alert'>" + html.escape(message) + "</p>" if message else "") + """
<form method="post"><label for="key">Paste your new API key here</label><input id="key" name="key" type="password" autocomplete="off" spellcheck="false" minlength="20" required autofocus placeholder="Click here, then paste">
<label><input name="free" type="checkbox" value="FREE" required> This key is from my Free-tier project with billing disabled.</label>
<button type="submit">Save key privately</button></form><p class="note">Local setup on your Mac. This page sends nothing to Google. The key is excluded from Git and never included in your app.</p></main></html>""").encode()


def main(port=3188, root=ROOT):
    token = os.environ.get("AUDIO_SETUP_PAGE_TOKEN") or secrets.token_urlsafe(32)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_): pass
        def respond(self, body, status=200):
            self.send_response(status)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Referrer-Policy", "same-origin")
            self.send_header("X-Frame-Options", "DENY")
            self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'")
            self.end_headers(); self.wfile.write(body)
        def valid_target(self):
            return self.path == "/" + token and self.headers.get("Host") == f"127.0.0.1:{port}"
        def do_GET(self):
            self.respond(page() if self.valid_target() else b"Not found", 200 if self.valid_target() else 404)
        def do_POST(self):
            if not self.valid_target() or self.headers.get("Origin") != f"http://127.0.0.1:{port}":
                self.respond(b"Rejected", 403); return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if not 0 < length <= 8192: raise ValueError()
                form = parse_qs(self.rfile.read(length).decode())
                configure_free_project(form.get("key", [""])[0], form.get("free", [""])[0], root)
            except (ValueError, UnicodeError):
                self.respond(page("The key was not saved. Paste the complete key and check the Free-tier box."), 400); return
            self.respond(b"<!doctype html><html><title>Key saved</title><main style='font:22px system-ui;max-width:620px;margin:12vh auto;padding:30px'><h1>Saved privately.</h1><p>The key is configured on this Mac. No API call has been made.</p><p>You can close this tab and tell Codex: Setup complete.</p></main></html>")
            threading.Thread(target=self.server.shutdown, daemon=True).start()
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.timeout = 1
    print(f"http://127.0.0.1:{port}/" + token, flush=True)
    try: server.serve_forever()
    finally: server.server_close()


if __name__ == "__main__": main()
