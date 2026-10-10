"""GWL receiver, visualization host and timestamped JSONL gesture recorder. Localhost only."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Lock
import json
import re
import time
import datetime

ROOT = Path(__file__).resolve().parents[1]
CAPTURE = ROOT / 'artifacts' / 'gesture-recordings'
lock = Lock()
state = {'connected': False, 'received': 0, 'unique_samples': 0, 'duplicate_samples': 0}
recording = {'active': False, 'count': 0, 'label': '', 'path': ''}
fh = None
last_stamp = None

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        if self.path == '/state':
            with lock:
                response = dict(state)
            response['age_ms'] = round((time.monotonic() - response.get('_received_monotonic', 0)) * 1000)
            response['connected'] = response['received'] > 0 and response['age_ms'] < 2000
            response['sensor_fresh'] = response['connected'] and response.get('sensor_age_ms', 999999) < 2000 and response.get('sample_advanced_ms', 999999) < 2000
            response.pop('_received_monotonic', None)
            response.pop('_advanced_monotonic', None)
            return self.send_json(response)
        if self.path == '/record/status':
            with lock: response = dict(recording)
            return self.send_json(response)
        super().do_GET()

    def do_POST(self):
        global fh, last_stamp
        if self.path not in ('/ingest', '/record/start', '/record/stop'):
            return self.send_error(404)
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length > 4096 or length < 0: raise ValueError('bad size')
            raw = self.rfile.read(length)
            if self.path == '/record/start':
                data = json.loads(raw or b'{}')
                label = re.sub(r'[^a-zA-Z0-9_-]', '_', str(data.get('label', 'gesture')))[:50] or 'gesture'
                with lock:
                    if recording['active']: return self.send_error(409, 'Already recording')
                    CAPTURE.mkdir(parents=True, exist_ok=True)
                    name = datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f') + '_' + label + '.jsonl'
                    path = CAPTURE / name
                    fh = path.open('w', encoding='utf-8')
                    recording.update(active=True, count=0, label=label, path=str(path))
                return self.send_json(dict(recording))
            if self.path == '/record/stop':
                with lock:
                    recording['active'] = False
                    if fh: fh.close(); fh = None
                    result = dict(recording)
                return self.send_json(result)
            data = json.loads(raw)
            q = data['quat_xyzw']
            stamp = data['timestamp_ns']
            if data.get('schema') != 1 or not isinstance(stamp, int) or stamp <= 0 or len(q) != 4 or any(not isinstance(v, (int, float)) or not -1.1 <= v <= 1.1 for v in q):
                raise ValueError('bad packet')
            with lock:
                now = time.monotonic()
                advanced = stamp != last_stamp
                last_stamp = stamp
                state.update(data)
                state['received'] += 1
                state['unique_samples' if advanced else 'duplicate_samples'] += 1
                state['_received_monotonic'] = now
                if advanced: state['_advanced_monotonic'] = now
                state['sample_advanced_ms'] = round((now - state.get('_advanced_monotonic', now)) * 1000)
                if recording['active'] and fh and advanced:
                    fh.write(json.dumps({'pc_wall_time': time.time(), **data}, ensure_ascii=False) + '\n')
                    fh.flush()
                    recording['count'] += 1
            self.send_response(204)
            self.send_header('Content-Length', '0')
            self.end_headers()
        except (ValueError, KeyError, TypeError, json.JSONDecodeError):
            self.send_error(400, 'Invalid request')

    def send_json(self, data):
        payload = json.dumps(data, separators=(',', ':')).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, fmt, *args):
        if not self.path.startswith(('/state', '/ingest', '/record')):
            super().log_message(fmt, *args)

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 8766), Handler)
    print('GWL_RECEIVER_READY=http://127.0.0.1:8766/', flush=True)
    print('GWL_RECORDING_DIR=' + str(CAPTURE), flush=True)
    server.serve_forever()
