import importlib.util
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from pathlib import Path

spec=importlib.util.spec_from_file_location('lan_bridge',str(Path(__file__).resolve().parents[1]/'tools/lan_bridge.py'))
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

class TestBridge(unittest.TestCase):
    def test_missing_token_rejected(self):
        server=ThreadingHTTPServer(('127.0.0.1',0),mod.make_handler('0123456789abcdef'))
        t=threading.Thread(target=server.serve_forever,daemon=True)
        t.start()
        try:
            base=f'http://127.0.0.1:{server.server_port}'
            with urlopen(base+'/health', timeout=2) as r:
                self.assertEqual(json.load(r)['ready'],True)
            request=Request(base+'/ingest', data=b'{}', method='POST')
            with self.assertRaises(HTTPError) as err:urlopen(request,timeout=2)
            self.assertEqual(err.exception.code,403)
        finally:
            server.shutdown()
            server.server_close()

if __name__=='__main__': unittest.main()
