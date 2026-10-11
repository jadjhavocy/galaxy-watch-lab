"""Bounded token-authenticated LAN ingest relay for Galaxy Watch Lab."""
import argparse
import hmac
import json
import secrets
import socket
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

CONFIG = Path(__file__).resolve().parents[1] / 'artifacts' / 'lan-bridge-key.txt'


def local_ipv4():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(('192.0.2.1', 80))
        return sock.getsockname()[0]
    except OSError:
        return 'CHECK_PC_IPV4'
    finally:
        sock.close()


def new_or_existing_token():
    CONFIG.parent.mkdir(parents=True, exist_ok=True)
    if CONFIG.exists():
        token = CONFIG.read_text(encoding='utf-8').strip()
        if len(token) >= 16:
            return token
        raise ValueError('Token file is too short; inspect artifacts/lan-bridge-key.txt')
    token = secrets.token_hex(8)
    # Avoid writing into repository-controlled paths; artifacts is local-only.
    with CONFIG.open('x', encoding='utf-8') as file:
        file.write(token + '\n')
    return token


def make_handler(token):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/health':
                payload = b'{"service":"GWL_LAN_BRIDGE","ready":true}'
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Content-Length', str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            else:
                self.send_error(404)

        def do_POST(self):
            if self.path != '/ingest':
                return self.send_error(404)
            candidate = self.headers.get('X-GWL-Token', '')
            if not hmac.compare_digest(candidate, token):
                return self.send_error(403)
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 1 <= length <= 4096:
                    return self.send_error(413)
                body = self.rfile.read(length)
                packet = json.loads(body)
                if packet.get('schema') != 1:
                    return self.send_error(400)
                req = Request('http://127.0.0.1:8766/ingest', data=body,
                              headers={'Content-Type':'application/json'}, method='POST')
                with urlopen(req, timeout=1.0) as response:
                    if response.status != 204:
                        return self.send_error(502)
                self.send_response(204)
                self.send_header('Content-Length','0')
                self.end_headers()
            except (ValueError, TypeError, json.JSONDecodeError):
                self.send_error(400)
            except (OSError, URLError, HTTPError):
                self.send_error(502)

        def log_message(self, fmt, *args):
            return  # Never print token or IMU content.
    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--bind', default='0.0.0.0')
    parser.add_argument('--port', type=int, default=8767)
    args = parser.parse_args()
    if not 1024 <= args.port <= 65535:
        parser.error('invalid port')
    token = new_or_existing_token()
    print('GWL_LAN_BRIDGE=READY', flush=True)
    print('WATCH_HOST=' + local_ipv4(), flush=True)
    print('WATCH_PORT=' + str(args.port), flush=True)
    print('WATCH_TOKEN=' + token, flush=True)
    print('NOTE=Use only trusted private Wi-Fi; plaintext HTTP with token; stop bridge when unused.', flush=True)
    with ThreadingHTTPServer((args.bind, args.port), make_handler(token)) as server:
        server.daemon_threads = True
        server.serve_forever()

if __name__ == '__main__':
    main()
