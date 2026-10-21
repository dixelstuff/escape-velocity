"""Frozen LS15 profile: top-10 distance radii on the published float16 model."""
from pathlib import Path
import hashlib,json
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SCALING=dict(alpha=.15,slope=.5912053921108603,offset=.004275184227927229,k=10)
DEFAULTS=dict(launch_min=.07535575526565894,launch_max=.2193557552656589,threshold=.255080630816617)
def build_ls(config, radius=None):
    output=ROOT/'static/model'
    if radius is None:
        cached=ROOT/'data'/('ls-k10-'+config['vector_sha256'][:16]+'.npy')
        if cached.exists():radius=np.load(cached)
        else:
            x=np.fromfile(output/config['vector_fallback'],dtype='<f2').astype('float64').reshape(config['vocabulary'],config['dimensions'])
            radius=np.empty(len(x))
            for a in range(0,len(x),256):
                b=min(len(x),a+256);s=np.clip(x[a:b]@x.T,-1,1);s[np.arange(b-a),np.arange(a,b)]=-np.inf
                radius[a:b]=1-np.partition(s,len(x)-10,axis=1)[:,-10]
            np.save(cached,radius)
    raw=np.asarray(radius,dtype='<f4').tobytes();sha=hashlib.sha256(raw).hexdigest();name='ls-k10-'+sha[:16]+'.f32'
    (output/name).write_bytes(raw)
    identity=json.dumps(dict(base=config['vector_sha256'],radius=sha,scaling=SCALING),sort_keys=True,separators=(',',':')).encode()
    return dict(model='GloVe 6B · 15% Local Scaling (trial)',algorithm='ls15-v1',base_vector_sha256=config['vector_sha256'],score_sha256=hashlib.sha256(identity).hexdigest(),radius_file=name,radius_sha256=sha,radius_bytes=len(raw),scaling=SCALING,defaults=DEFAULTS)
if __name__=='__main__':
    path=ROOT/'static/model/config.json';config=json.loads(path.read_text());config.setdefault('word_models',{})['ls15-v1']=build_ls(config);path.write_text(json.dumps(config,separators=(',',':')))
