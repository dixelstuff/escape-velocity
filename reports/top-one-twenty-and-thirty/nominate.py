"""Reproduce weighted random nomination; no route or slot tuning."""
import json,random,sys
from pathlib import Path
folder=Path(__file__).resolve().parent
pool=json.loads((folder/'pool.json').read_text())
seed=2026112130
rng=random.Random(seed)
rows=[]
for i in range(360):
    available=pool['pool'].copy()
    chosen=[]
    for slot in range(3):
        word=rng.choices(available,weights=[pool['nominationWeights'].get(w,1) for w in available],k=1)[0]
        chosen.append(word)
        available.remove(word)
    rows.append({'candidate':i+1,'words':chosen})
result={'seed':seed,'algorithm':'Python random.Random(seed).choices, weights 1.4 or 1, removing the selected word within each triple; 360 triples recorded before checks','designSha256':pool['designSha256'],'candidates':rows}
path=folder/'original-candidates.json'
if '--verify' in sys.argv:
    assert result==json.loads(path.read_text())
    print('Recorded weighted random nominations reproduce exactly.')
elif path.exists():
    raise SystemExit('Refusing to overwrite recorded nominations')
else:
    path.write_text(json.dumps(result,indent=2)+'\n')
