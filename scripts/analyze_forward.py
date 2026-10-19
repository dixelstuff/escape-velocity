"""Verify current menu routes with exact, forward-only, on-demand cosine search."""
from pathlib import Path
import json, sys
from collections import deque
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import Embeddings, Game, DATA

def search_forward(e,p):
    scores=e.vectors@e.vectors[e.index[p['target']]]
    start=e.index[p['start']];baseline=float(scores[start]);previous={start:None};queue=deque([start])
    while queue:
        current=queue.popleft()
        launch=e.vectors@e.vectors[current]
        fraction=np.minimum(1,np.abs(np.minimum(scores,p['threshold'])-min(scores[current],p['threshold']))/max(1e-6,p['threshold']-baseline))
        required=p['launch_min']+(p['launch_max']-p['launch_min'])*fraction
        for raw in np.flatnonzero((scores+1e-7>=scores[current])&(launch+1e-7>=required)):
            nxt=int(raw)
            if nxt in previous:continue
            previous[nxt]=current
            if scores[nxt]+1e-7>=p['threshold']:
                route=[];node=nxt
                while node is not None:route.append(e.words[node]);node=previous[node]
                return list(reversed(route))
            queue.append(nxt)
    return []

def main():
    e=Embeddings();results=[]
    for p in json.loads((DATA/'puzzles.json').read_text()):
        route=search_forward(e,p)
        if not route:raise RuntimeError(f'Unreachable puzzle: {p}')
        game=Game(e,**p)
        for word in route[1:]:
            assert game.submit(word)['success']
        assert game.won
        results.append(dict(**p,attempts=len(route)-1,route=route))
    (ROOT/'reports/forward-analysis.json').write_text(json.dumps(dict(rules='golf-distance-v1',results=results),indent=2)+'\n')
    print(f'Verified {len(results)} menu routes at green .27, shot .10–.20, forward only.')
if __name__=='__main__':main()
