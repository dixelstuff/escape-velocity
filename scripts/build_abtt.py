"""One-component ABTT fitted to all 400,000 original, unnormalised GloVe rows."""
import hashlib
import zipfile
import numpy as np

def build_abtt(words, data):
    cache=data/'abtt-one-component-v1.npz'
    words_sha=hashlib.sha256('\n'.join(words).encode()).hexdigest()
    if cache.exists():
        saved=np.load(cache)
        if str(saved['words_sha'])==words_sha:
            return saved['vectors']
    index={w:i for i,w in enumerate(words)}
    selected=np.zeros((len(words),300),dtype=np.float32)
    found=np.zeros(len(words),dtype=bool)
    total=np.zeros(300);cross=np.zeros((300,300));count=0;batch=[]
    with zipfile.ZipFile(data/'glove.6B.zip') as archive:
        with archive.open('glove.6B.300d.txt') as stream:
            for line in stream:
                token,_,values=line.partition(b' ')
                row=np.fromstring(values.decode('ascii'),sep=' ',dtype=np.float64)
                if len(row)!=300 or not np.isfinite(row).all():raise ValueError('Invalid source vector')
                word=token.decode('utf8')
                if word in index:selected[index[word]]=row;found[index[word]]=True
                batch.append(row);count+=1
                if len(batch)==1024:
                    block=np.stack(batch);total+=block.sum(axis=0);cross+=block.T@block;batch=[]
    if batch:
        block=np.stack(batch);total+=block.sum(axis=0);cross+=block.T@block
    if count!=400000 or not found.all():raise ValueError('Incomplete original GloVe source')
    mean=total/count
    _,pcs=np.linalg.eigh(cross/count-np.outer(mean,mean));axis=pcs[:,-1:]
    vectors=selected.astype(np.float64)-mean
    vectors-=(vectors@axis)@axis.T
    vectors/=np.linalg.norm(vectors,axis=1)[:,None]
    vectors=vectors.astype(np.float32)
    np.savez(cache,vectors=vectors,mean=mean,axis=axis,count=count,words_sha=words_sha)
    return vectors
