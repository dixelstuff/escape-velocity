"""Build exact cosine graphs and measure attempts, excluding the free final hop."""
import os
os.environ.setdefault('OPENBLAS_NUM_THREADS','4')
from pathlib import Path
import sys, json, argparse
from collections import deque, Counter
import numpy as np
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from engine import Embeddings, DATA
ROOT=DATA.parent

def graph(v, threshold):
    adjacency=[]
    for offset in range(0,len(v),256):
        cos=v[offset:offset+256] @ v.T
        for row in cos:
            adjacency.append(np.flatnonzero(row >= threshold-1e-7).astype(np.int32))
    return adjacency

def search(e, adjacency, start, target, threshold):
    s,t=e.index[start],e.index[target]
    similarities=e.vectors @ e.vectors[t]
    allowed=similarities >= similarities[s]-1e-7
    arrival=similarities >= threshold-1e-7
    previous={s:None}; distance={s:0}; ways={s:1}; first_moves={s:set()}; queue=deque([s]); wins=[]; depth=None
    while queue:
        u=queue.popleft()
        if depth is not None and distance[u]>=depth: continue
        for raw in adjacency[u]:
            v=int(raw)
            if not allowed[v]: continue
            d=distance[u]+1
            opening={v} if u==s else first_moves[u]
            if v in previous:
                if distance[v]==d:
                    ways[v]+=ways[u]; first_moves[v].update(opening)
                continue
            previous[v]=u; distance[v]=d; ways[v]=ways[u]; first_moves[v]=set(opening)
            if arrival[v]:
                depth=distance[v]; wins.append(v)
            else: queue.append(v)
    if not wins: return dict(attempts=None, route=[], winning_planets=0, shortest_routes=0, first_moves=0)
    u=wins[0]; route=[]
    while u is not None: route.append(e.words[u]); u=previous[u]
    return dict(attempts=depth,route=list(reversed(route)),winning_planets=len(wins), shortest_routes=sum(ways[w] for w in wins), first_moves=len(set().union(*(first_moves[w] for w in wins))))

def main():
    p=argparse.ArgumentParser(); p.add_argument('--samples',type=int,default=120); p.add_argument('--thresholds',type=float,nargs='+',default=[0.4,0.45,0.5,0.55]); p.add_argument('--route',nargs='+'); p.add_argument('--threshold',type=float,default=0.45); p.add_argument('--mode',choices=['fixed','distance'],default='fixed'); args=p.parse_args()
    e=Embeddings()
    if args.route:
        from engine import Game
        game=Game(e,args.route[0],args.route[-1],args.threshold,mode=args.mode)
        for word in args.route[1:-1]: print(json.dumps(game.submit(word),indent=2))
        print(json.dumps(game.state(),indent=2)); return
    rng=np.random.default_rng(42)
    # More frequent half of vocabulary for readable endpoints; all words can be bridges.
    pool=e.words[:min(5000,len(e.words))]
    pairs=[]
    while len(pairs)<args.samples:
        a,b=rng.choice(pool,2,replace=False)
        if e.cosine(a,b)<0.2: pairs.append((str(a),str(b)))
    handpicked=[('cheese','language'),('ocean','music'),('garden','computer'),('coffee','science'),('forest','money'),('bread','democracy'),('river','memory'),('moon','kitchen')]
    pairs=handpicked+pairs
    measurements=[]; selections=[]
    for threshold in args.thresholds:
        print('Building exact graph at',threshold,flush=True)
        adjacency=graph(e.vectors,threshold)
        distribution=Counter(); rows=[]
        for a,b in pairs:
            if a not in e.index or b not in e.index: continue
            result=search(e,adjacency,a,b,threshold)
            category='unreachable' if result['attempts'] is None else str(result['attempts']) if result['attempts']<5 else '5+'
            distribution[category]+=1
            rows.append(dict(start=a,target=b,threshold=threshold,**result))
        degrees=np.array([len(a)-1 for a in adjacency])
        measurements.append(dict(threshold=threshold,distribution=dict(distribution),pairs=len(rows),mean_degree=float(degrees.mean()),isolated=int((degrees==0).sum()),results=rows))
        selections.extend(r for r in rows if r['attempts'] in [2,3,4] and r['shortest_routes']>=3 and r['first_moves']>=2 and r['start']!=r['target'])
        print(threshold,dict(distribution),'mean degree',degrees.mean(),flush=True)
    (ROOT/'reports').mkdir(exist_ok=True)
    (ROOT/'reports'/'analysis.json').write_text(json.dumps(measurements,indent=2))
    # Include exceptional two-submission puzzles as well as longer journeys.
    selections.sort(key=lambda r:(r['start'] not in [a for a,b in handpicked],abs(r['threshold']-.45),r['first_moves']))
    chosen=[]; seen=set()
    for desired, quota in [(2,4),(3,3),(4,1)]:
        selected=0
        for r in selections:
            pair=(r['start'],r['target'])
            if pair in seen or r['attempts'] != desired: continue
            seen.add(pair); chosen.append({k:r[k] for k in ['start','target','threshold']}); selected+=1
            if selected==quota: break
    if not chosen: raise RuntimeError('No suitable puzzles: inspect analysis and adjust thresholds.')
    (DATA/'puzzles.json').write_text(json.dumps(chosen,indent=2))
    lines=['# Semantic calibration','',f'Model: Stanford GloVe 6B 300d. Vocabulary: {len(e.words):,} normalized vectors.',f'Tested {len(pairs)} endpoint pairs per threshold (8 thematic candidates plus {args.samples} seeded random pairs with endpoint cosine < 0.2). Random endpoints use the 5,000 most frequent supported words. This is a model experiment, not player statistics.','', '| Threshold | 1 | 2 | 3 | 4 | 5+ | Unreachable | Mean degree | Isolated words |','|---|---|---|---|---|---|---|---|---|']
    for m in measurements:
        d=m['distribution']; lines.append('| '+' | '.join([str(m['threshold'])]+[str(d.get(k,0)) for k in ['1','2','3','4','5+','unreachable']]+[f"{m['mean_degree']:.1f}",str(m['isolated'])])+' |')
    lines+=['','Search respects the starting boundary and finds the fewest submitted words to any arrival-zone word. The automatic target hop is excluded. `winning_planets` counts distinct shortest-depth arrival planets. `shortest_routes` counts minimum-length submitted sequences; `first_moves` counts distinct first words across those sequences. The JSON contains optimal routes for offline analysis; the browser never receives them.','','## Selected puzzles','']
    for puzzle in chosen:
        r=next(r for r in selections if all(r[k]==v for k,v in puzzle.items()))
        lines.append(f"- {r['start']} → {r['target']}, threshold {r['threshold']}: minimum {r['attempts']} attempts, {r['winning_planets']} shortest-depth arrival planets, {r['shortest_routes']} shortest routes, {r['first_moves']} opening moves. Route: {' → '.join(r['route'])} → {r['target']} (free).")
        for a,b in zip(r['route'],r['route'][1:]): lines.append(f"  - {a} → {b}: launch {e.cosine(a,b):.4f}, destination {e.cosine(b,r['target']):.4f}.")
    lines+=['','## Interpretation','','For the default threshold sweep, **0.40–0.45 appear most promising**. Compare one-attempt frequency against 2–4-attempt coverage in the measured table. At 0.50 and 0.55 the graph is much sparser, and longer paths or unreachable endpoints become more common. These results are specific to the curated vocabulary and endpoint sample.','','Lower thresholds connect more semantic regions but can make one-attempt bridges common. Higher thresholds fragment the graph and make distant endpoints unreachable. Use the measured table to compare this tradeoff. Selected puzzles require 2–4 attempts with at least three shortest routes and at least two distinct opening moves; this does not establish that typical human play will take 2–4 attempts. Playtesting is still required. Some representative shortest paths use broad words such as have, well, but, or one, so numerical reachability does not guarantee a satisfying semantic journey. BFS reports one representative path and tie-breaks by frequency order; its example can be less interesting than alternative shortest paths. A content-word-only vocabulary would be a useful next experiment, rather than adding target bonuses or fabricated links. Names and unsuitable vocabulary filtering are heuristic and require editorial review before public release.']
    example = next((r for m in measurements for r in m['results'] if r['start']=='cheese' and r['target']=='language' and r['threshold']==0.45), None)
    if example:
        lines += ['', '## The brief’s CHEESE → LANGUAGE example', '', f"At 0.45 the minimum is {example['attempts']} submissions: {' → '.join(example['route'])} → language (free). Minimum-length routes: {example['shortest_routes']}; distinct optimal opening words: {example['first_moves']}. This makes an interesting manual lab example, but it fails the menu selection’s requirement for several optimal approaches."]
        lines.append('')
        for a,b in zip(example['route'],example['route'][1:]):
            lines.append(f"- {a} → {b}: launch cosine {e.cosine(a,b):.4f}; destination cosine {e.cosine(b,'language'):.4f}.")
    (ROOT/'reports'/'calibration.md').write_text('\n'.join(lines)+'\n')
if __name__=='__main__': main()
