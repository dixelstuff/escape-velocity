"""Append suitable completed scorecard holes; never replace the existing menu.

Usage: .venv/bin/python scripts/import_scorecard_holes.py /path/to/scorecards.json ...
Eligibility is conservative editorial screening, not a claim about player skill:
<=7 total shots, <=half manual attempts missed/water, no top-decile hub endpoint.
A route must also exist under current rules, without a direct tee-to-hole finish.
Only endpoints/settings go into the public menu; personal scorecards stay local.
"""
from pathlib import Path
import argparse,json,sys
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from engine import Embeddings,Game,DATA
from scripts.analyze_forward import search_forward

def eligible(e,s):
    a,b=s.get('start'),s.get('target');history=s.get('history',[])
    if not s.get('won') or not history or a==b or a not in e.index or b not in e.index:return False
    if e.hub(a)>0 or e.hub(b)>0:return False
    if s.get('attempts',999)>7:return False
    return sum(not h.get('success') for h in history)<=len(history)/2

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('scorecards',nargs='+',type=Path);args=parser.parse_args()
    e=Embeddings();menu=json.loads((DATA/'puzzles.json').read_text());seen={(p['start'],p['target']) for p in menu};added=[]
    for file in args.scorecards:
        for journey in json.loads(file.read_text()).get('journeys',[]):
            s=journey.get('state',{});key=(s.get('start'),s.get('target'))
            if key in seen or not eligible(e,s):continue
            p=dict(start=key[0],target=key[1],threshold=.28,mode='distance',launch_min=.10,launch_max=.21)
            if Game(e,**p).submit(p['target'])['won']:continue
            route=search_forward(e,p)
            if not route:continue
            check=Game(e,**p)
            if not all(check.submit(word)['success'] for word in route[1:]) or not check.won:continue
            menu.append(p);seen.add(key);added.append(key)
    (DATA/'puzzles.json').write_text(json.dumps(menu,indent=2)+'\n')
    print(f'Added {len(added)} holes; menu now has {len(menu)}. Existing entries retained.')
    print(', '.join(a+' → '+b for a,b in added))
if __name__=='__main__':main()
