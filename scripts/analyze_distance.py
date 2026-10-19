"""Exact target-dependent graph search for distance-based launches; old calibration is preserved."""
from pathlib import Path
import sys,json
from collections import deque,Counter
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import Embeddings,Game,DATA

def weighted_graph(v, minimum=.25):
    adjacency=[];weights=[]
    for offset in range(0,len(v),256):
        cos=v[offset:offset+256]@v.T
        for row in cos:
            indices=np.flatnonzero(row>=minimum-1e-7).astype(np.int32)
            adjacency.append(indices);weights.append(row[indices])
    return adjacency,weights

def search_distance(e,adjacency,weights,start,target,arrival=.45,minimum=.25,maximum=.40):
    s,t=e.index[start],e.index[target];similarities=e.vectors@e.vectors[t];baseline=float(similarities[s])
    allowed=similarities>=baseline-1e-7;inside=similarities>=arrival-1e-7
    previous={s:None};depths={s:0};ways={s:1};first={s:set()};queue=deque([s]);wins=[];depth=None
    while queue:
        u=queue.popleft()
        if depth is not None and depths[u]>=depth:continue
        neighbors=adjacency[u]
        required=minimum+(maximum-minimum)*np.minimum(1,np.abs(similarities[neighbors]-similarities[u])/max(1e-6,arrival-baseline))
        valid=allowed[neighbors]&(weights[u]+1e-7>=required)&(neighbors!=u)
        for raw in neighbors[valid]:
            v=int(raw);d=depths[u]+1;opening={v} if u==s else first[u]
            if v in previous:
                if depths[v]==d:ways[v]+=ways[u];first[v].update(opening)
                continue
            previous[v]=u;depths[v]=d;ways[v]=ways[u];first[v]=set(opening)
            if inside[v]:depth=d;wins.append(v)
            else:queue.append(v)
    if not wins:return dict(attempts=None,route=[],shortest_routes=0,first_moves=0,winning_planets=0)
    route=[];u=wins[0]
    while u is not None:route.append(e.words[u]);u=previous[u]
    return dict(attempts=depth,route=list(reversed(route)),shortest_routes=sum(ways[w] for w in wins),first_moves=len(set().union(*(first[w] for w in wins))),winning_planets=len(wins))

def main():
    e=Embeddings();old=json.loads((ROOT/'reports/analysis.json').read_text());pairs=[(r['start'],r['target']) for r in old[0]['results']]
    print('Building exact candidate graph at .25',flush=True);adjacency,weights=weighted_graph(e.vectors)
    results=[];distribution=Counter()
    for start,target in pairs:
        r=dict(start=start,target=target,threshold=.45,mode='distance',**search_distance(e,adjacency,weights,start,target))
        results.append(r);distribution['unreachable' if r['attempts'] is None else str(r['attempts']) if r['attempts']<5 else '5+']+=1
    # Keep familiar test journeys; use a concrete starter instead of FOREST → MONEY.
    choices=[('coffee','science'),('cheese','language'),('penalty','ability'),('everyday','affection'),('moon','kitchen'),('garden','computer'),('bread','democracy'),('forest','money')]
    for pair in choices:
        if pair not in pairs:
            a,b=pair;results.append(dict(start=a,target=b,threshold=.45,mode='distance',**search_distance(e,adjacency,weights,a,b)))
    chosen=[]
    for a,b in choices:
        row=next(r for r in results if r['start']==a and r['target']==b)
        if row['attempts'] is not None and row['attempts']>=2:chosen.append({k:row[k] for k in ['start','target','threshold','mode']})
    # Historical calibration only; current menu settings live in data/puzzles.json.
    output=dict(mode='distance',launch_min=.25,launch_max=.40,arrival=.45,pairs=len(pairs),distribution=dict(distribution),results=results)
    (ROOT/'reports/distance-analysis.json').write_text(json.dumps(output,indent=2))
    lines=['# Distance-based launch experiment','','Rules: `distance-v1`. Normalized trip length is `min(1, abs(destination_cosine - current_target_cosine) / max(0.000001, arrival_threshold - starting_target_cosine))`. Required launch similarity is `0.25 + 0.15 * trip_length`. Forward and backward trips use the same formula. The fixed arrival threshold is 0.45. Revisited planets cost an attempt; entering the current word costs nothing.','',f'The same {len(pairs)} endpoint pairs from the original calibration were searched over all {len(e.words):,} words. Candidate edges have launch cosine ≥ 0.25; exact target-dependent requirements and the starting boundary are then applied at each BFS expansion. Revisits do not improve an optimal route because edges depend only on the current word and fixed puzzle settings. The search ends on the first reachable arrival-zone planet. No hop to the target is required.','','| Rules | 1 | 2 | 3 | 4 | 5+ | Unreachable |','|---|---|---|---|---|---|---|']
    for oldrow in old[:2]:
        d=oldrow['distribution'];lines.append('| Fixed '+str(oldrow['threshold'])+' | '+' | '.join(str(d.get(k,0)) for k in ['1','2','3','4','5+','unreachable'])+' |')
    lines.append('| Distance .25–.40, arrival .45 | '+' | '.join(str(distribution.get(k,0)) for k in ['1','2','3','4','5+','unreachable'])+' |')
    lines+=['','This compares complete rule settings, including different arrival thresholds where shown. These are model experiments, not player statistics. The new rule should make stepping-stone play more forgiving; it does not establish typical human scores. A one-attempt win still requires a launch cosine of at least 0.40 because any arrival-zone word is a full start-to-arrival jump.','','## Selected puzzles (spoilers)','']
    for p in chosen:
        r=next(r for r in results if all(r[k]==v for k,v in p.items()))
        lines.append(f"- {p['start']} → {p['target']}: minimum {r['attempts']} attempts, {r['shortest_routes']} shortest routes, {r['first_moves']} optimal opening moves. Route: {' → '.join(r['route'])} (arrival zone reached).")
        game=Game(e,**p,rules='distance-v1')
        for word in r['route'][1:]:
            event=game.submit(word)
            if not event['success']:raise RuntimeError('Search/engine disagreement')
            lines.append(f"  - {event['origin']} → {word}: launch {event['launch']:.4f}, required {event['required']:.4f}, destination {event['destination']:.4f}.")
        if not game.won:raise RuntimeError('Search failed to reach arrival zone')
    lines+=['','FOREST → MONEY remains available for comparison, but is no longer the opening puzzle. Flight lab can choose fixed mode and adjust the arrival threshold and short/long launch requirements. Older saved journeys retain their original rule version and are never silently rescored.','']
    (ROOT/'reports/distance-calibration.md').write_text('\n'.join(lines));print(dict(distribution),flush=True)
if __name__=='__main__':main()
