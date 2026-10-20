"""Vector diagnostics for recorded decisions. Deliberately does not invent a skill rating."""
import argparse,json,sys
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from engine import Embeddings

def main():
    parser=argparse.ArgumentParser();parser.add_argument('logs',type=Path);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
    e=Embeddings();v=e.vectors[:19989];words=e.words[:19989];rounds=[]
    for journey in json.loads(args.logs.read_text())['journeys']:
        s=journey['state']
        if s.get('rules')!='golf-distance-v1' or not s['history']:continue
        target=v[e.index[s['target']]];dest=v@target;baseline=s['baseline'];green=s['threshold'];best=baseline;seen={s['start']};shots=[]
        for h in s['history']:
            current=e.cosine(h['origin'],s['target']);contact=v@v[e.index[h['origin']]]
            fraction=np.minimum(1,np.abs(np.minimum(dest,green)-min(current,green))/max(1e-6,green-baseline))
            required=s['launch_min']+(s['launch_max']-s['launch_min'])*fraction
            feasible=(contact+1e-7>=required)&(dest+1e-7>=best-s.get('backward_allowance',0));feasible[e.index[h['origin']]]=False
            chosen=e.index[h['word']];progress=np.minimum(dest,green)-min(current,green)
            # A frontier measures trade-offs; it does not reward unrelated vector dimensions.
            dominates=feasible&(contact>=contact[chosen]-1e-7)&(progress>=progress[chosen]-1e-7)&((contact>contact[chosen]+1e-7)|(progress>progress[chosen]+1e-7))
            if h['word']==s['target']:dominates[:]=False  # No alternative can beat its zero extra finishing-shot cost.
            next_contact=v@v[chosen]
            next_required=s['launch_min']+(s['launch_max']-s['launch_min'])*np.minimum(1,np.abs(np.minimum(dest,green)-min(dest[chosen],green))/max(1e-6,green-baseline))
            finishes=(dest+1e-7>=green)&(next_contact+1e-7>=next_required)
            options=np.flatnonzero(dominates);options=options[np.argsort(dest[options])[::-1]][:3]
            shots.append(dict(origin=h['origin'],word=h['word'],outcome=h['outcome'],contact=float(contact[chosen]),progress=float(progress[chosen]),playable_alternatives=int(feasible.sum()),alternatives_with_both_stronger_contact_and_progress=int(dominates.sum()),example_alternatives=[words[i] for i in options],green_connections_opened=int(finishes.sum()) if h['success'] and not h['won'] else None))
            if h['success']:best=max(best,h['destination']);seen.add(h['word'])
        rounds.append(dict(start=s['start'],target=s['target'],shots=s['attempts'],completed=s['won'],decisions=shots))
    report=dict(method='Historical vocabulary and settings. Contact/progress Pareto comparisons (direct target finishes have no equal-cost alternative), plus one-shot green connections after each successful non-finishing choice. No player rating: no agreed weighting or human familiarity calibration.',rounds=rounds)
    args.output.write_text(json.dumps(report,indent=2)+'\n')
    successes=[h for r in rounds for h in r['decisions'] if h['outcome'] in ['landed','green','recovery']]
    print(f'Analysed {len(rounds)} played golf rounds, {len(successes)} successful decisions; {sum(h["alternatives_with_both_stronger_contact_and_progress"]==0 for h in successes)} on contact/progress frontier. Report: {args.output}')
    for pair in [('gall','giant'),('vice','pelican'),('list','spike')]:
        r=next(r for r in rounds if (r['start'],r['target'])==pair)
        print(pair,[(h['word'],h['alternatives_with_both_stronger_contact_and_progress'],h['green_connections_opened']) for h in r['decisions'] if h['outcome'] in ['landed','recovery','green']])
if __name__=='__main__':main()
