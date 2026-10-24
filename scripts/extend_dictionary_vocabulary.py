"""Append rarer dictionary vectors; freeze every existing vector, hub score and trial row."""
from pathlib import Path
import gzip,hashlib,json,re,zipfile
import numpy as np
from wordfreq import top_n_list,zipf_frequency
from build_ls import build_ls
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'data';OUT=ROOT/'static/model'
sha=lambda raw:hashlib.sha256(raw).hexdigest()
def dump(path,value):path.write_text(json.dumps(value,separators=(',',':')))
def packed(name,raw):
    filename=f'{name}-{sha(raw)[:16]}.f16';(OUT/filename).write_bytes(raw);(OUT/(filename+'.gz')).write_bytes(gzip.compress(raw,compresslevel=9,mtime=0));return filename
def main():
    c=json.loads((OUT/'config.json').read_text());old_words=json.loads((OUT/c['words_file']).read_text());old_count=len(old_words);existing=set(old_words)
    old_raw=(OUT/c['vector_fallback']).read_bytes();old_hubs=(OUT/c['hub_file']).read_bytes();profiles=c['word_models'];old_abtt=(OUT/profiles['abtt-1-v1']['vector_fallback']).read_bytes();old_radii=(OUT/profiles['ls15-v1']['radius_file']).read_bytes()
    lemmas=set()
    with zipfile.ZipFile(DATA/'wordnet.zip')as z:
        for pos in ['noun','verb','adj','adv']:
            for line in z.read('wordnet/data.'+pos).decode().splitlines():
                if not line or line.startswith(' '):continue
                f=line.split('|',1)[0].split();n=int(f[3],16);lemmas.update(re.sub(r'\([a-z]+\)$','',w)for w in f[4:4+2*n:2])
    excluded=set('john james william robert david michael mary peter paul george thomas richard charles joseph andrew mark jesus christ america american english british french german chinese indian christian islamic muslim jewish roman russian european african asian london paris china india japan italy canada australia california york washington fuck fucking shit bullshit asshole cunt nigger nigga faggot'.split())
    priority='abseil abseiled abseiling rappel rappelling carabiner belay belaying bouldering crampon crampons piton pitons bivouac wetsuit'.split()
    candidates=[w for w in top_n_list('en',200000)if w not in existing and w in lemmas and w not in excluded and re.fullmatch('[a-z]{3,18}',w)and zipf_frequency(w,'en')>=2]
    wanted=set(candidates)|{w for w in priority if w not in existing};found={}
    if not wanted:print('No additional vocabulary requested.');return
    with zipfile.ZipFile(DATA/'glove.6B.zip')as z:
        with z.open('glove.6B.300d.txt')as source:
            for line in source:
                name,_,values=line.partition(b' ');word=name.decode()
                if word in wanted:
                    row=np.fromstring(values.decode(),sep=' ',dtype=np.float32)
                    if len(row)==300 and np.isfinite(row).all()and np.linalg.norm(row)>0:found[word]=row
    additions=list(dict.fromkeys(w for w in priority+candidates if w not in existing and w in found));n=len(additions)
    if not n:print('Vocabulary already extended.');return
    print(f'Appending {n:,} source-backed words to {old_count:,}; preserving all existing rows.',flush=True)
    source=np.stack([found[w]for w in additions]);extra=source/np.linalg.norm(source,axis=1)[:,None];words=old_words+additions;raw=old_raw+extra.astype('<f2').tobytes()
    baseline=dict(words=old_count,vector_sha256=sha(old_raw),hub_sha256=sha(old_hubs),abtt_sha256=sha(old_abtt),ls_radius_sha256=sha(old_radii),word_list_sha256=sha(json.dumps(old_words,separators=(',',':')).encode()))
    # The old reference distribution continues to define hubness for new words.
    old_x=np.frombuffer(old_raw,dtype='<f2').astype('float32').reshape(old_count,300);extra_x=extra.astype('<f2').astype('float32')
    ref_count=json.loads((OUT/'hubs.json').read_text()).get('reference_vocabulary',old_count);ref=old_x[:ref_count];counts=np.empty(ref_count,dtype='int32')
    for a in range(0,ref_count,512):
        b=min(a+512,ref_count);scores=ref[a:b]@ref.T;scores[np.arange(b-a),np.arange(a,b)]=-2;counts[a:b]=(scores>=.21).sum(axis=1)
    new_counts=np.concatenate([(extra_x[a:a+512]@ref.T>=.21).sum(axis=1)for a in range(0,n,512)]);ranks=np.searchsorted(np.sort(counts),new_counts,side='right')/ref_count
    hub=old_hubs+np.floor(255*np.clip((ranks-.9)/.1,0,1)+.5).astype('u1').tobytes();hub_name=f'hubs-{sha(hub)[:16]}.u8';(OUT/hub_name).write_bytes(hub)
    print('Existing hub bytes preserved; new hub scores use the frozen reference.',flush=True)
    vector_file=packed('vectors',raw);words_json=json.dumps(words,separators=(',',':'));words_file=f'words-{sha(words_json.encode())[:16]}.json';(OUT/words_file).write_text(words_json);(OUT/'words.json').write_text(words_json)
    c.update(vector_file=vector_file+'.gz',vector_fallback=vector_file,vector_bytes=len(raw),vector_sha256=sha(raw),words_file=words_file,vocabulary=len(words),hub_file=hub_name,hub_sha256=sha(hub))
    dump(OUT/'hubs.json',dict(version=c['hub_version'],file=hub_name,sha256=sha(hub),vector_sha256=sha(raw),words_file=words_file,reference_contact=.21,rank_start=.9,maximum_surcharge=.035,reference_vocabulary=ref_count,preserved_vocabulary=old_count))
    # Extend ABTT using its original fitted mean/component, without refitting any rows.
    cache=np.load(DATA/'abtt-one-component-v1.npz');mean=cache['mean'].copy();axis=cache['axis'].copy();count=cache['count'].copy();prior_vectors=cache['vectors'].copy()
    assert prior_vectors.shape[0]==old_count and prior_vectors.astype('<f2').tobytes()==old_abtt
    transformed=source.astype('float64')-mean;transformed-=(transformed@axis)@axis.T;transformed/=np.linalg.norm(transformed,axis=1)[:,None];abtt=old_abtt+transformed.astype('<f2').tobytes();abtt_name=packed('abtt1',abtt)
    profiles['abtt-1-v1'].update(vector_file=abtt_name+'.gz',vector_fallback=abtt_name,vector_bytes=len(abtt),vector_sha256=sha(abtt))
    np.savez(DATA/'abtt-one-component-v1.npz',vectors=np.concatenate([prior_vectors,transformed.astype('float32')]),mean=mean,axis=axis,count=count,words_sha=sha('\n'.join(words).encode()))
    # Preserve every old LS radius; new radii use the same frozen base vocabulary.
    new_radius=np.empty(n)
    for a in range(0,n,256):
        b=min(a+256,n);similarities=np.clip(extra_x[a:b].astype('float64')@old_x.astype('float64').T,-1,1);new_radius[a:b]=1-np.partition(similarities,old_count-10,axis=1)[:,-10]
    radius=np.concatenate([np.frombuffer(old_radii,dtype='<f4'),new_radius.astype('<f4')]);np.save(DATA/('ls-k10-'+c['vector_sha256'][:16]+'.npy'),radius);profiles['ls15-v1']=build_ls(c,radius)
    endpoints=set()
    def collect(v):
        if isinstance(v,dict):
            for k,item in v.items():
                if k in ('start','target','word')and isinstance(item,str):endpoints.add(item)
                else:collect(item)
        elif isinstance(v,list):
            for item in v:collect(item)
    collect(c['puzzles']);collect(c['courses']);seed=[i for i,w in enumerate(words)if w in endpoints];common=set(sorted(range(len(words)),key=lambda i:zipf_frequency(words[i],'en'),reverse=True)[:5000]);starter=sorted(common-set(seed));remaining=sorted(set(range(len(words)))-set(seed)-common)
    def pack(rows):
        content=b''.join(raw[i*600:(i+1)*600]for i in rows);name=packed('pack',content);return dict(file=name+'.gz',raw_file=name,rows=rows,bytes=len(content),sha256=sha(content))
    manifest=dict(model_sha256=c['vector_sha256'],dimensions=300,seed=pack(seed),starter=pack(starter),background=[pack(remaining[i:i+2000])for i in range(0,len(remaining),2000)]);content=json.dumps(manifest,separators=(',',':')).encode();manifest_name='packs-'+sha(content)[:16]+'.json';(OUT/manifest_name).write_bytes(content);c['progressive']=dict(manifest_file=manifest_name,starter_words=5000)
    dump(OUT/'config.json',c)
    assert json.loads((DATA/'words.json').read_text())==old_words
    np.save(DATA/'vectors.npy',np.concatenate([np.load(DATA/'vectors.npy'),extra]));(DATA/'words.json').write_text(json.dumps(words))
    metadata=json.loads((DATA/'metadata.json').read_text());metadata.update(words=len(words),expansion='Appended lowercase WordNet lemmas with wordfreq Zipf >=2.0 plus source-backed outdoor/inflected additions; original rows and hub scores preserved',expansion_frequency_floor=2.0);dump(DATA/'metadata.json',metadata)
    dump(DATA/'vocabulary-extension.json',dict(version='dictionary-extension-v1',baseline=baseline,added=n,total=len(words),floor=2.0,priority=priority,added_words=additions,source='Stanford GloVe 6B 300d; original vectors only',preserved_model_data=True))
    # Prune only superseded generated files, as build_pages does.
    retained={c['vector_fallback'],c['vector_file'],words_file,hub_name,profiles['abtt-1-v1']['vector_file'],profiles['abtt-1-v1']['vector_fallback'],manifest_name}|{p[k]for p in [manifest['seed'],manifest['starter'],*manifest['background']]for k in ['file','raw_file']}
    for pattern in ['vectors-*.f16*','abtt1-*.f16*','words-*.json','hubs-*.u8','pack-*.f16*','packs-*.json']:
        for file in OUT.glob(pattern):
            if file.name not in retained:file.unlink()
    from build_word_families import main as build_families
    build_families(c)
    print(json.dumps(dict(added=n,total=len(words),raw_extra_bytes=n*600,compressed_model_bytes=(OUT/c['vector_file']).stat().st_size,seed_bytes=manifest['seed']['bytes'],starter_words=5000),indent=2),flush=True)
if __name__=='__main__':main()
