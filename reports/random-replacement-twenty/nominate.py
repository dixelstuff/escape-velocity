"""Reproduce the original random order; never select or tune triples here."""
import json
import random
import sys
from pathlib import Path

folder = Path(__file__).resolve().parent
pool = json.loads((folder / 'pool.json').read_text())
seed = 2026111306
rng = random.Random(seed)
words = [row['word'] for row in pool['pool']]
result = {
    'seed': seed,
    'algorithm': 'Python random.Random(seed).sample(pool_in_recorded_order, 3), repeated 200 times before checks',
    'designSha256': pool['designSha256'],
    'candidates': [{'candidate': i + 1, 'words': rng.sample(words, 3)} for i in range(200)],
}
path = folder / 'original-candidates.json'
if '--verify' in sys.argv:
    assert result == json.loads(path.read_text()), 'Random order differs from recorded nominations'
    print('Recorded random seed, pool and original order reproduce exactly.')
elif path.exists():
    raise SystemExit('Original nominations already exist; refusing to replace them.')
else:
    path.write_text(json.dumps(result, indent=2) + '\n')
