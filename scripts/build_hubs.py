"""Precompute game-specific hub breadth from the published half-precision model.

No self connections. Smooth top-decile rank is stored as one byte per word.
Run after build_pages.py exports a changed vocabulary/vector model, then rebuild Pages.
"""
from pathlib import Path
import gzip, hashlib, json
import numpy as np
ROOT=Path(__file__).resolve().parents[1]

def main(config=None):
    folder=ROOT/'static/model'
    config=config or json.loads((folder/'config.json').read_text())
    words=json.loads((folder/config['words_file']).read_text())
    packed=gzip.decompress((folder/config['vector_file']).read_bytes())
    x=np.frombuffer(packed,dtype='<f2').astype(np.float32).reshape(len(words),config['dimensions'])
    counts=np.zeros(len(words),dtype=np.int32)
    for start in range(0,len(words),512):
        stop=min(start+512,len(words));similarity=x[start:stop]@x.T
        similarity[np.arange(stop-start),np.arange(start,stop)]=-2
        counts[start:stop]=(similarity>=.21).sum(axis=1)
    ranks=np.searchsorted(np.sort(counts),counts,side='right')/len(words)
    scores=np.floor(255*np.clip((ranks-.9)/.1,0,1)+.5).astype('u1').tobytes()
    digest=hashlib.sha256(scores).hexdigest()
    name=f'hubs-{digest[:16]}.u8'
    (folder/name).write_bytes(scores)
    metadata=dict(version='hub-breadth-v1',file=name,sha256=digest,vector_sha256=config['vector_sha256'],words_file=config['words_file'],reference_contact=.21,rank_start=.9,maximum_surcharge=.035)
    (folder/'hubs.json').write_text(json.dumps(metadata,separators=(',',':')))
    for stale in folder.glob('hubs-*.u8'):
        if stale.name!=name:stale.unlink()
    print(f'Exported {len(scores):,} hub bytes; {sum(v>0 for v in scores):,} nonzero words.')
if __name__=='__main__':main()
