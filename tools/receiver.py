"""Local ADB-reverse sensor receiver and static Motion Studio host, stdlib only."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Lock
import json, time

ROOT = Path(__file__).resolve().parents[1]
lock = Lock()
state = {'connected': False, 'received': 0}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)
    def do_GET(self):
        if self.path == '/state':
            with lock:
                response = dict(state)
            response['age_ms'] = round((time.monotonic() - response.get('_received_monotonic', 0)) * 1000)
            response['connected'] = response['received'] > 0 and response['age_ms'] < 2000
            response.pop('_received_monotonic', None)
            return self.send_json(response)
        super().do_GET()
    def do_POST(self):
        if self.path != '/ingest':
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length < 1 or length > 4096: raise ValueError('bad size')
            data = json.loads(self.rfile.read(length))
            q = data['quat_xyzw']
            if data.get('schema') != 1 or len(q) != 4 or any(not isinstance(v, (int,float)) or not -1.1 <= v <= 1.1 for v in q):
                raise ValueError('bad packet')
            with lock:
                state.update(data)
                state['received'] = state.get('received',0) + 1
                state['_received_monotonic'] = time.monotonic()
            self.send_response(204)
            self.send_header('Content-Length','0')
            self.end_headers()
        except (ValueError,KeyError,TypeError,json.JSONDecodeError):
            self.send_error(400, 'Invalid telemetry')
    def send_json(self, data):
        payload=json.dumps(data, separators=(',',':')).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type','application/json')
        self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)
    def log_message(self, fmt, *args):
        if not self.path.startswith('/state') and not self.path.startswith('/ingest'):
            super().log_message(fmt,*args)

if __name__ == '__main__':
    server=ThreadingHTTPServer(('127.0.0.1', 8766), Handler)
    print('GWL_RECEIVER_READY=http://127.0.0.1:8766/',flush=True)
    print('ADB reverse tcp:8766 tcp:8766 required',flush=True)
    server.serve_forever()
