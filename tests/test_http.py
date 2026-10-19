"""Exercise the real server, including validation and independent browser sessions."""
import json, socket, subprocess, sys, time, unittest
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
ROOT=Path(__file__).resolve().parents[1]
class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with socket.socket() as s:
            s.bind(('127.0.0.1',0));port=s.getsockname()[1]
        cls.base=f'http://127.0.0.1:{port}'
        cls.process=subprocess.Popen([sys.executable,str(ROOT/'server.py'),'--port',str(port)],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                with urlopen(cls.base+'/api/config',timeout=1) as r:cls.config=json.load(r)
                return
            except URLError:
                if cls.process.poll() is not None:raise RuntimeError('Server failed to start; prepare embeddings and puzzles first.')
                time.sleep(.05)
        cls.process.terminate();raise RuntimeError('Server startup timed out.')
    @classmethod
    def tearDownClass(cls):cls.process.terminate();cls.process.wait(timeout=5)
    def post(self,path,data):
        with urlopen(Request(self.base+'/api/'+path,data=json.dumps(data).encode(),headers={'Content-Type':'application/json'})) as r:return json.load(r)
    def new(self):return self.post('new',dict(start='cheese',target='language',threshold=.45))
    def test_config_does_not_leak_solutions(self):
        self.assertGreater(self.config['vocabulary'],10000)
        for p in self.config['puzzles']:self.assertEqual(set(p),{'start','target','threshold','mode','launch_min','launch_max'})
    def test_validation_and_session_isolation(self):
        a,b=self.new(),self.new();self.assertNotEqual(a['token'],b['token'])
        with self.assertRaises(HTTPError) as caught:self.post('submit',dict(token=a['token'],word='zxqunknown'))
        caught.exception.close()
        result=self.post('submit',dict(token=a['token'],word='milk'));self.assertEqual(result['state']['attempts'],1)
        with self.assertRaises(HTTPError) as caught:self.post('submit',dict(token=a['token'],word='milk'))
        caught.exception.close()
        result=self.post('submit',dict(token=a['token'],word='bread'));self.assertEqual(result['state']['attempts'],2)
        result=self.post('submit',dict(token=b['token'],word='milk'));self.assertEqual(result['state']['attempts'],1)
    def test_distance_launches_and_repeated_failures(self):
        game=self.post('new',dict(start='forest',target='money',threshold=.45,mode='distance'))
        for attempt in [1,2]:
            result=self.post('submit',dict(token=game['token'],word='milk'))
            self.assertFalse(result['event']['success']);self.assertEqual(result['state']['attempts'],attempt)
            self.assertGreaterEqual(result['event']['required'],.10);self.assertLessEqual(result['event']['required'],.20)
    def test_no_embedding_files_served(self):
        with self.assertRaises(HTTPError) as caught:urlopen(self.base+'/data/vectors.npy')
        caught.exception.close()
    def test_static_interface(self):
        with urlopen(self.base) as r:self.assertIn(b'Word golf',r.read())
if __name__=='__main__':unittest.main()
