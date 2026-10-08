"""
PulseWave Studio Local Web Server.
Pure Python standard library (http.server, urllib, json).
Serves the Interactive Web DAW and API endpoints.
"""

import json
import os
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from synth_engine import SynthEngine
from theory import format_theory_summary, generate_progression, get_scale_notes

STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")


class StudioHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Keep terminal output clean
        pass

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_HEAD(self):
        self.do_GET()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # -------------------------------------------------------------
        # API Endpoints
        # -------------------------------------------------------------
        if path == "/api/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            data = {"status": "ok", "app": "PulseWave Studio", "engine": "WebAudio + Python WAV"}
            self.wfile.write(json.dumps(data).encode("utf-8"))
            return

        elif path == "/api/theory":
            key = query.get("key", ["A"])[0]
            scale = query.get("scale", ["minor"])[0]
            notes = get_scale_notes(key, scale)
            progression = generate_progression(key, scale)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            res = {"key": key, "scale": scale, "notes": notes, "progression": progression}
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        # -------------------------------------------------------------
        # Static Asset Serving
        # -------------------------------------------------------------
        if path == "/" or path == "/index.html":
            file_path = os.path.join(STATIC_DIR, "index.html")
            content_type = "text/html; charset=utf-8"
        elif path.startswith("/static/"):
            rel_name = path[len("/static/"):]
            file_path = os.path.join(STATIC_DIR, rel_name)
            if file_path.endswith(".css"):
                content_type = "text/css"
            elif file_path.endswith(".js"):
                content_type = "application/javascript"
            elif file_path.endswith(".svg"):
                content_type = "image/svg+xml"
            else:
                content_type = "application/octet-stream"
        else:
            file_path = None

        if file_path and os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_cors_headers()
            self.end_headers()
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(b"404 Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/render":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            payload = json.loads(body) if body else {}

            preset = payload.get("preset", "synthwave")
            bpm = int(payload.get("bpm", 124))
            bars = int(payload.get("bars", 2))

            engine = SynthEngine()
            samples = engine.render_loop(bpm=bpm, bars=bars, preset=preset)
            out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"render_{preset}.wav")
            engine.save_wav(samples, out_path)

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors_headers()
            self.end_headers()
            res = {"status": "success", "file": out_path, "samples": len(samples)}
            self.wfile.write(json.dumps(res).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()


def run_server(port: int = 6060):
    server = HTTPServer(("127.0.0.1", port), StudioHandler)
    return server
