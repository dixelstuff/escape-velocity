"""Local-only prototype server. Each browser owns a separate opaque game session."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import argparse, json, secrets, threading
from engine import Embeddings, Game, DATA
ROOT = Path(__file__).parent

def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--port', type=int, default=8000); args = parser.parse_args()
    embeddings = Embeddings(); sessions = {}; lock = threading.Lock()
    puzzles = json.loads((DATA/'puzzles.json').read_text())
    class Handler(SimpleHTTPRequestHandler):
        def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT/'static'),**kw)
        def reply(self,obj,status=200):
            body=json.dumps(obj).encode(); self.send_response(status); self.send_header('Content-Type','application/json'); self.send_header('Cache-Control','no-store'); self.send_header('Content-Length',str(len(body))); self.end_headers(); self.wfile.write(body)
        def do_GET(self):
            if self.path == '/api/config': return self.reply(dict(puzzles=puzzles, vocabulary=len(embeddings.words), model='GloVe 6B · 300 dimensions'))
            return super().do_GET()
        def do_POST(self):
            try:
                size=int(self.headers.get('Content-Length',0))
                if size > 10000: raise ValueError('Request too large.')
                body=json.loads(self.rfile.read(size))
                with lock:
                    if self.path == '/api/new':
                        game=Game(embeddings,body['start'].strip().lower(),body['target'].strip().lower(),float(body['threshold']))
                        token=secrets.token_urlsafe(24)
                        if len(sessions)>1000: sessions.pop(next(iter(sessions)))
                        sessions[token]=game
                        return self.reply(dict(token=token,state=game.state()))
                    if self.path == '/api/submit':
                        game=sessions.get(body.get('token'))
                        if game is None: raise ValueError('Session expired. Start a new journey.')
                        event=game.submit(body['word'])
                        return self.reply(dict(event=event,state=game.state()))
                self.reply({'error':'Unknown endpoint'},404)
            except (ValueError,KeyError,TypeError) as e: self.reply({'error':str(e)},400)
    print(f'ESCAPE VELOCITY → http://localhost:{args.port}',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
if __name__=='__main__': main()
