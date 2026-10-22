"""Join blind CSV ratings to the local key; report paired hole-level comparisons."""
import argparse, csv, json, random, statistics
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('ratings', nargs='+', type=Path)
parser.add_argument('--key', type=Path, default=Path('reports/llm-route-review/private/answer-key.json'))
args = parser.parse_args()
key = json.loads(args.key.read_text())
routes = {r['route_id']: r for r in key['rows']}
lookup = {(r['hole_id'], r['bridge']): r['route_id'] for r in routes.values()}
ratings = {}
for path in args.ratings:
    for r in csv.DictReader(path.open(newline='', encoding='utf-8-sig')):
        rid = r['route_id'].strip()
        if rid not in routes:
            raise ValueError(f'Unknown route: {rid}')
        values = {name: int(r[name]) for name in ['tee_link', 'hole_link', 'satisfaction', 'vague_bridge']}
        if not (0 <= values['tee_link'] <= 4 and 0 <= values['hole_link'] <= 4
                and 1 <= values['satisfaction'] <= 5 and values['vague_bridge'] in (0, 1)):
            raise ValueError(f'Invalid rating: {rid}')
        confidence = r['confidence'].strip().lower()
        if confidence not in ('high', 'medium', 'low'):
            raise ValueError(f'Invalid confidence: {rid}')
        rating = {**values, 'confidence': confidence}
        if rid in ratings and ratings[rid] != rating:
            raise ValueError(f'Conflicting duplicate rating: {rid}; resolve explicitly')
        ratings[rid] = rating

models = ['Current', 'ABTT 1', 'LS 15%']
samples = {(s['hole_id'], s['model']): s for s in key['primarySamples']}
holes = sorted({s['hole_id'] for s in key['primarySamples']})
complete = [h for h in holes if all(samples[h, m]['words'] and all(
    lookup[h, w] in ratings for w in samples[h, m]['words']) for m in models)]

def metrics(h, m):
    rows = [ratings[lookup[h, w]] for w in samples[h, m]['words']]
    return {
        'satisfaction': statistics.mean(r['satisfaction'] for r in rows),
        'vague_rate': statistics.mean(r['vague_bridge'] for r in rows),
        'satisfying_rate': statistics.mean(r['satisfaction'] >= 4 and min(r['tee_link'], r['hole_link']) >= 2
                                           and not r['vague_bridge'] for r in rows),
        'low_confidence_rate': statistics.mean(r['confidence'] == 'low' for r in rows),
    }

summary = {'rated_routes': len(ratings), 'total_routes': len(routes), 'paired_complete_holes': len(complete),
           'total_holes': len(holes), 'note': 'LLM-rated semantic quality, not a human validation. Incomplete pairs excluded; diagnostics excluded from primary rates.',
           'zero_bridge_holes': {m: sum(s['population'] == 0 for s in key['primarySamples'] if s['model'] == m) for m in models}}
if complete:
    values = {(h, m): metrics(h, m) for h in complete for m in models}
    summary['models'] = {m: {k: statistics.mean(values[h, m][k] for h in complete)
                             for k in metrics(complete[0], m)} for m in models}
    # Paired bootstrap over holes, not independently over correlated shared words.
    rng = random.Random(20261022)
    comparisons = {}
    for model in models[1:]:
        comparisons[model + ' minus Current'] = {}
        for metric in ('satisfaction', 'vague_rate', 'satisfying_rate'):
            diff = [values[h, model][metric] - values[h, 'Current'][metric] for h in complete]
            boot = sorted(statistics.mean(rng.choices(diff, k=len(diff))) for _ in range(2000))
            comparisons[model + ' minus Current'][metric] = {'difference': statistics.mean(diff), 'bootstrap_95_interval': [boot[50], boot[1949]]}
    summary['paired_comparisons'] = comparisons
    summary['diagnostic_rated_routes'] = sum(not set(routes[rid]['reasons']) & {'uniform'} for rid in ratings)
print(json.dumps(summary, indent=2))
