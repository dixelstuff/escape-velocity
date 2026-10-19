"""Generate Python-authoritative scoring fixtures for every browser rule version."""
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import Embeddings,Game,DATA

def main():
    e=Embeddings();analysis=json.loads((ROOT/'reports/distance-analysis.json').read_text());fixtures=[]
    def add(settings,words):
        game=Game(e,**settings);fixture=dict(**settings,steps=[])
        for word in words:
            step=dict(word=word)
            try:step['event']=game.submit(word)
            except ValueError:step['error']=True
            step['state']=json.loads(json.dumps(game.state()));fixture['steps'].append(step)
        fixtures.append(fixture)
    for p in json.loads((DATA/'puzzles.json').read_text()):
        row=next(r for r in analysis['results'] if all(r[k]==v for k,v in p.items()))
        add(p,['unknownwordxyz',p['start'],p['target'],*row['route'][1:]])
    add(dict(start='forest',target='money',threshold=.4,mode='fixed'),['milk','milk','area','forest','area','have'])
    add(dict(start='forest',target='money',threshold=.4,mode='fixed',rules='fixed-threshold-v1'),['milk','milk','area','forest','have'])
    add(dict(start='penalty',target='ability',threshold=.45,mode='distance'),['goal','skill','skill','goal','aim','achieve'])
    (ROOT/'tests/browser-fixtures.json').write_text(json.dumps(fixtures,indent=2))
if __name__=='__main__':main()
