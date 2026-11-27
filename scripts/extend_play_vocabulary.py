"""Append the approved vocabulary; freeze old vectors, hubs, rescue and profiles.
Rebuilds static assets only. --sources points to local original preparation data.
"""
from pathlib import Path
import argparse,json,gzip,hashlib,zipfile,struct,sys,time
import numpy as np
from wordfreq import zipf_frequency
from build_semantic_profiles import partition,ari,KS,SHARD
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'static/model';REPORT=ROOT/'reports/vocabulary-expansion'
sha=lambda b:hashlib.sha256(b).hexdigest()
def dump(p,v):p.write_text(json.dumps(v,separators=(',',':'))+'\n')
def packed(stem,raw,suffix='f16'):
 name=f'{stem}-{sha(raw)[:16]}.{suffix}';(OUT/name).write_bytes(raw)
 if suffix=='f16':(OUT/(name+'.gz')).write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
 return name

def main():
 p=argparse.ArgumentParser();p.add_argument('--sources',type=Path,required=True);args=p.parse_args();begin=time.monotonic()
 baseline=REPORT/'baseline.json'
 if not baseline.exists():
  dump(baseline,{'config':json.loads((OUT/'config.json').read_text()),'hubs':json.loads((OUT/'hubs.json').read_text()),'profiles':json.loads((ROOT/'static/semantic-profiles/manifest.json').read_text())})
 saved=json.loads(baseline.read_text());c=saved['config'];old_words=json.loads((OUT/c['words_file']).read_text());n=len(old_words);d=300
 selection=json.loads((REPORT/'selection.json').read_text());extra_words=selection['words'];assert len(extra_words)==1822 and len(set(extra_words))==1822 and not set(extra_words)&set(old_words)
 old_raw=(OUT/c['vector_fallback']).read_bytes();assert sha(old_raw)==c['vector_sha256'];old_x=np.frombuffer(old_raw,dtype='<f2').astype('float32').reshape(n,d)
 print('Extracting original vectors',flush=True);wanted=set(extra_words);found={}
 with zipfile.ZipFile(args.sources/'glove.6B.zip') as z:
  with z.open('glove.6B.300d.txt') as f:
   for line in f:
    w,_,values=line.partition(b' ');word=w.decode()
    if word in wanted:found[word]=np.fromstring(values.decode(),sep=' ',dtype='float32')
 assert set(found)==wanted
 source=np.stack([found[w] for w in extra_words]);assert source.shape==(1822,d) and np.isfinite(source).all()
 extra=source/np.linalg.norm(source,axis=1,keepdims=True);extra_raw=extra.astype('<f2').tobytes();new_raw=old_raw+extra_raw;words=old_words+extra_words;total=len(words)
 words_bytes=json.dumps(words,separators=(',',':')).encode();words_file=f'words-{sha(words_bytes)[:16]}.json';(OUT/words_file).write_bytes(words_bytes);(OUT/'words.json').write_bytes(words_bytes)
 name=packed('vectors',new_raw);new_c={**c,'vocabulary':total,'words_file':words_file,'vector_fallback':name,'vector_file':name+'.gz','vector_bytes':len(new_raw),'vector_sha256':sha(new_raw)}
 # Preserve every old breadth score. New scores use the same frozen reference.
 print('Computing new hub scores against frozen reference',flush=True);meta=saved['hubs'];ref_n=meta['reference_vocabulary'];ref=old_x[:ref_n];counts=[]
 for start in range(0,ref_n,512):
  stop=min(ref_n,start+512);s=ref[start:stop]@ref.T;s[np.arange(stop-start),np.arange(start,stop)]=-2;counts.extend((s>=.21).sum(axis=1))
 ex=np.frombuffer(extra_raw,dtype='<f2').astype('float32').reshape(-1,d);new_counts=np.concatenate([(ex[i:i+256]@ref.T>=.21).sum(axis=1) for i in range(0,len(ex),256)])
 ranks=np.searchsorted(np.sort(counts),new_counts,side='right')/ref_n;hub=(OUT/c['hub_file']).read_bytes()+np.floor(255*np.clip((ranks-.9)/.1,0,1)+.5).astype('u1').tobytes();hub_file=packed('hubs',hub,'u8');new_c.update(hub_file=hub_file,hub_sha256=sha(hub))
 dump(OUT/'hubs.json',{**meta,'file':hub_file,'sha256':sha(hub),'vector_sha256':sha(new_raw),'words_file':words_file,'preserved_vocabulary':n})
 # Extend optional profiles with the frozen transforms/radii; do not refit.
 cache=np.load(args.sources/'abtt-one-component-v1.npz');mean=cache['mean'];axis=cache['axis'];old_abtt=(OUT/c['word_models']['abtt-1-v1']['vector_fallback']).read_bytes();assert cache['vectors'].shape[0]==n and cache['vectors'].astype('<f2').tobytes()==old_abtt
 transformed=source.astype('float64')-mean;transformed-=(transformed@axis)@axis.T;transformed/=np.linalg.norm(transformed,axis=1,keepdims=True);abtt=old_abtt+transformed.astype('<f2').tobytes();aname=packed('abtt1',abtt)
 models={k:dict(v) for k,v in c['word_models'].items()};models['abtt-1-v1'].update(vector_file=aname+'.gz',vector_fallback=aname,vector_bytes=len(abtt),vector_sha256=sha(abtt))
 ls=models['ls15-v1'];old_radius=(OUT/ls['radius_file']).read_bytes();radii=[]
 for start in range(0,len(ex),128):
  s=np.clip(ex[start:start+128].astype('float64')@old_x.astype('float64').T,-1,1);radii.extend(1-np.partition(s,n-10,axis=1)[:,-10])
 radius=old_radius+np.asarray(radii,dtype='<f4').tobytes();rname=packed('ls-k10',radius,'f32');identity=json.dumps(dict(base=sha(new_raw),radius=sha(radius),scaling=ls['scaling']),sort_keys=True,separators=(',',':')).encode();ls.update(base_vector_sha256=sha(new_raw),score_sha256=sha(identity),radius_file=rname,radius_sha256=sha(radius),radius_bytes=len(radius));new_c['word_models']=models
 # Existing progressive packs remain byte-identical and reusable. Append one pack.
 manifest=json.loads((OUT/c['progressive']['manifest_file']).read_text());pname=packed('pack',extra_raw);part={'file':pname+'.gz','raw_file':pname,'rows':list(range(n,total)),'bytes':len(extra_raw),'sha256':sha(extra_raw)}
 manifest={**manifest,'model_sha256':sha(new_raw),'background':manifest['background']+[part]};mraw=json.dumps(manifest,separators=(',',':')).encode();mname=f'packs-{sha(mraw)[:16]}.json';(OUT/mname).write_bytes(mraw);new_c['progressive']={**c['progressive'],'manifest_file':mname}
 new_c['vocabulary_extension']={'version':'play-vocabulary-v2','base_vocabulary':n,'added':len(extra_words),'base_vector_sha256':c['vector_sha256'],'base_words_file':c['words_file'],'base_profile_manifest':'manifest-'+c['vector_sha256'][:16]+'.json'}
 # New frequency data only; all existing canonical frequencies remain frozen.
 freq={w:round(zipf_frequency(w,'en')*100) for w in extra_words};dump(REPORT/'frequencies.json',freq)
 (ROOT/'static/vocabulary-release.mjs').write_text('/** Frozen reference boundary for appended vocabulary. Existing rows retain their meaning. */\nexport const VOCABULARY_REFERENCE='+json.dumps(new_c['vocabulary_extension'],separators=(',',':'))+';\nexport const EXPANDED_MODEL_SHA='+json.dumps(sha(new_raw))+';\nexport const EXPANDED_VOCABULARY='+str(total)+';\n')
 dump(OUT/'config.json',new_c)
 extend_profiles(saved['profiles'],c,new_c,words,old_x,ex,hub,args.sources)
 report={'version':'play-vocabulary-v2','old_words':n,'added':len(extra_words),'total':total,'old_model_sha256':c['vector_sha256'],'new_model_sha256':sha(new_raw),'old_prefix_sha256':sha(new_raw[:len(old_raw)]),'extra_vector_bytes':len(extra_raw),'extra_vector_gzip_bytes':len(gzip.compress(extra_raw,compresslevel=9,mtime=0)),'new_model_gzip_bytes':(OUT/new_c['vector_file']).stat().st_size,'existing_hubs_preserved':hub[:n]==(OUT/c['hub_file']).read_bytes(),'existing_abtt_preserved':abtt[:len(old_abtt)]==old_abtt,'existing_ls_preserved':radius[:len(old_radius)]==old_radius,'existing_progressive_packs_preserved':True,'seconds':round(time.monotonic()-begin,2)}
 dump(REPORT/'build.json',report);print(json.dumps(report,indent=2),flush=True)

def extend_profiles(m,c,new_c,words,old_x,ex,hub,sources):
 print('Building appended semantic profiles on the frozen reference',flush=True);folder=ROOT/'static/semantic-profiles';n=len(old_x);new_n=len(ex);allx=np.concatenate([old_x,ex]);unit=allx/np.linalg.norm(allx,axis=1,keepdims=True)
 # Preserve original manifest and every original record byte.
 old_manifest=folder/new_c['vocabulary_extension']['base_profile_manifest'];old_manifest.write_text(json.dumps(m,indent=2)+'\n')
 old_records=b''.join((folder/f['file']).read_bytes()[12:] for f in m['files']);assert len(old_records)==n*361
 old_graph=np.load(sources/'semantic-profile-neighbours.npz');old_ids=old_graph['ids'];old_sims=old_graph['sims'];assert old_ids.shape==(n,200)
 # Ensure the source graph matches the shipped old profiles.
 for i in [0,n//2,n-1]:
  h=2166136261
  for v in old_ids[i]:h=((h^int(v))*16777619)&0xffffffff
  assert h==struct.unpack_from('<I',old_records,i*361+28)[0]
 gamma=d*(np.finfo(np.float32).eps/2)/(1-d*np.finfo(np.float32).eps/2);maxnorm=np.linalg.norm(old_x,axis=1).max()
 lexrank=np.empty(n,int);lexrank[np.argsort(np.array(words[:n]),kind='stable')]=np.arange(n);ids=np.empty((new_n,200),dtype='uint16');sims=np.empty((new_n,200));broad=np.empty((new_n,4),dtype='int32');occ=np.empty((new_n,2),dtype='int32')
 for start in range(0,new_n,128):
  scores=ex[start:start+128]@old_x.T
  for j,row in enumerate(scores):
   i=start+j;pool=np.argpartition(-row,256)[:256];precise=old_x[pool].astype('float64')@ex[i].astype('float64');order=np.lexsort((lexrank[pool],-precise));pool=pool[order];precise=precise[order]
   if precise[199]-float(row[pool[-1]])<=2*gamma*np.linalg.norm(ex[i])*maxnorm:
    precise_all=old_x.astype('float64')@ex[i].astype('float64');chosen=np.lexsort((lexrank,-precise_all))[:200];ids[i]=chosen;sims[i]=precise_all[chosen]
   else:ids[i]=pool[:200];sims[i]=precise[:200]
   broad[i]=[(row>=t).sum() for t in [.1,.2,.3,.4]];occ[i]=[(row>old_sims[:,k-1]).sum() for k in [100,200]]
 concentrations=[];off=32
 for k in KS:
  concentrations.append(np.sort(np.array([struct.unpack_from('<f',old_records,i*361+off)[0] for i in range(n)])));off+=70+(k+7)//8
 records=[]
 for start in range(0,new_n,32):
  stop=min(start+32,new_n);local=unit[ids[start:stop]];parts=[partition(local[:,:k]) for k in KS]
  for j,i in enumerate(range(start,stop)):
   h=2166136261
   for v in ids[i]:h=((h^int(v))*16777619)&0xffffffff
   record=bytearray(struct.pack('<f7I',hub[n+i]/255,int(occ[i,0]),int(occ[i,1]),*broad[i].tolist(),h))
   for ki,k in enumerate(KS):
    labels,sizes,sil,gain,separation,centers,reps=parts[ki];x=local[j,:k].astype('float64');summ=x.sum(axis=0);conc=float((summ@summ-k)/(k*(k-1)));aff=sims[i,:k];weights=np.exp((aff-aff.max())/.1);weights/=weights.sum();eff=float(np.exp(-(weights*np.log(weights)).sum()));pct=min(1,np.searchsorted(concentrations[ki],conc)/(n-1));reciprocal=sum(sims[i,t]>old_sims[int(ids[i,t]),k-1] for t in range(k));repids=[[int(ids[i,p]) for p in reps[j,cl] if labels[j,p]==cl] for cl in [0,1]];stability=ari(labels[j],parts[-1][0][j,:k]);centroid_dots=centers[j]@unit[n+i]
    record.extend(struct.pack('<6f3H6f8H',conc,float(aff.mean()),float(aff.std()),float(aff.min()),eff,pct,int(reciprocal),*sizes[j].tolist(),float(sil[j]),float(gain[j]),float(separation[j]),*centroid_dots.tolist(),stability,*[*(repids[0]+[65535]*4)[:4],*(repids[1]+[65535]*4)[:4]]));record.extend(np.packbits(labels[j],bitorder='little').tobytes())
   assert len(record)==361;records.append(bytes(record))
 combined=old_records+b''.join(records);files=list(m['files']);start_shard=n//SHARD
 for shard in range(start_shard,(len(words)+SHARD-1)//SHARD):
  start=shard*SHARD;count=min(SHARD,len(words)-start);raw=b'WGP4'+struct.pack('<II',start,count)+combined[start*361:(start+count)*361];name=f'profiles-{shard:03d}-{sha(raw)[:12]}.bin';packed=gzip.compress(raw,mtime=0);(folder/name).write_bytes(raw);(folder/(name+'.gz')).write_bytes(packed);entry={'file':name,'gzip':name+'.gz','sha256':sha(raw),'gzip_sha256':sha(packed),'count':count}
  if shard<len(files):files[shard]=entry
  else:files.append(entry)
 manifest={**m,'model_sha':new_c['vector_sha256'],'words_sha':sha((OUT/new_c['words_file']).read_bytes()),'word_order_sha256':sha('\0'.join(words).encode()),'vocabulary':len(words),'files':files,'reference_vocabulary':n,'reference_model_sha':c['vector_sha256'],'method':{**m['method'],'extension':'Existing records frozen. Added-word geometry/neighbours and percentiles use the original vocabulary reference. Reciprocity/occurrence measure insertion against original kth-neighbour thresholds.'}}
 (folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 assert combined[:len(old_records)]==old_records

if __name__=='__main__':main()
