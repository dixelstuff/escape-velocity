"""Generate Python-authoritative scoring fixtures for the browser engine."""
from pathlib import Path
import json, sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import Embeddings, Game, DATA

def main():
    e=Embeddings()
    analysis=json.loads((ROOT/'reports/analysis.json').read_text())
    puzzles=json.loads((DATA/'puzzles.json').read_text())
    fixtures=[]
    for p in puzzles:
        row=next(r for m in analysis for r in m['results'] if all(r[k]==v for k,v in p.items()))
        game=Game(e,**p)
        fixture=dict(**p,steps=[])
        for word in ['unknownwordxyz',p['start'],p['target'],*row['route'][1:]]:
            step=dict(word=word)
            try: step['event']=game.submit(word)
            except ValueError: step['error']=True
            # JSON roundtrip freezes mutable route/history before subsequent submits.
            step['state']=json.loads(json.dumps(game.state()))
            fixture['steps'].append(step)
        fixtures.append(fixture)
    (ROOT/'tests/browser-fixtures.json').write_text(json.dumps(fixtures,indent=2))
if __name__=='__main__': main()
