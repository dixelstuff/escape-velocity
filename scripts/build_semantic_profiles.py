"""Complete-vocabulary geometric profiles, frozen against the current vectors.
No model/shot changes. numpy + host BLAS only; bounded working matrices.
"""
from pathlib import Path
import json,gzip,time,hashlib,resource,os,struct,sys
import numpy as np
ROOT=Path(__file__).resolve().parents[1];KS=[25,50,100,200];ITERATIONS=8;SHARD=128

def partition(x):
 # x: batch x neighbours x dimensions; true unit vectors for geometry only.
 b,k,d=x.shape;first=x[:,0];score=np.einsum('bkd,bd->bk',x,first);far=np.argmin(score,axis=1)
 centers=np.stack([first,x[np.arange(b),far]],axis=1)
 labels=np.zeros((b,k),dtype=np.uint8)
 for _ in range(ITERATIONS):
  affinity=np.einsum('bkd,bcd->bkc',x,centers);labels=(affinity[:,:,1]>affinity[:,:,0]).astype(np.uint8)
  sums=np.stack([np.einsum('bk,bkd->bd',(labels==c).astype(np.float32),x) for c in [0,1]],axis=1)
  norms=np.linalg.norm(sums,axis=2,keepdims=True);centers=np.divide(sums,norms,out=centers.copy(),where=norms>1e-12)
 # Final assignments to final centroids, then statistics for those assignments.
 labels=(np.einsum('bkd,bd->bk',x,centers[:,1]-centers[:,0])>0).astype(np.uint8)
 sizes=np.stack([(labels==c).sum(axis=1) for c in [0,1]],axis=1)
 sums=np.stack([np.einsum('bk,bkd->bd',(labels==c).astype(np.float32),x) for c in [0,1]],axis=1)
 means=sums/np.maximum(sizes[:,:,None],1);norms=np.linalg.norm(means,axis=2,keepdims=True);centers=np.divide(means,norms,out=np.zeros_like(means),where=norms>1e-12)
 # Exact average cosine-distance silhouette using sum identities, no K^2 matrix.
 dots=np.einsum('bkd,bcd->bkc',x,sums);own=np.take_along_axis(dots,labels[:,:,None],axis=2)[:,:,0];other=np.take_along_axis(dots,(1-labels)[:,:,None],axis=2)[:,:,0]
 own_n=np.take_along_axis(sizes,labels,axis=1);other_n=np.take_along_axis(sizes,1-labels,axis=1)
 a=1-(own-1)/np.maximum(own_n-1,1);bb=1-other/np.maximum(other_n,1);sil=(bb-a)/np.maximum(np.maximum(a,bb),1e-12);sil[(own_n<=1)|(other_n==0)]=0
 total=x.sum(axis=1);one_loss=k-np.linalg.norm(total,axis=1);two_loss=k-np.linalg.norm(sums,axis=2).sum(axis=1);gain=(one_loss-two_loss)/np.maximum(one_loss,1e-12)
 separation=1-np.einsum('bd,bd->b',centers[:,0],centers[:,1]);separation[(sizes==0).any(axis=1)]=0
 reps=np.empty((b,2,4),dtype=np.int32)
 for c in [0,1]:
  score=np.einsum('bkd,bd->bk',x,centers[:,c]);score[labels!=c]=-np.inf
  reps[:,c]=np.argsort(-score,axis=1,kind='stable')[:,:4]
 return labels,sizes,sil.mean(axis=1),gain,separation,centers,reps

def ari(a,b):
 table=np.array([[( (a==i)&(b==j)).sum() for j in [0,1]] for i in [0,1]],float);comb=lambda z:z*(z-1)/2
 total=comb(len(a));observed=comb(table).sum();rows=comb(table.sum(axis=1)).sum();cols=comb(table.sum(axis=0)).sum();expected=rows*cols/total;den=(rows+cols)/2-expected
 return float((observed-expected)/den) if abs(den)>1e-12 else 1.0

def main():
 begin=time.perf_counter();config=json.loads((ROOT/'static/model/config.json').read_text());words=json.loads((ROOT/'static/model'/config['words_file']).read_text());n=len(words);d=config['dimensions']
 raw=np.fromfile(ROOT/'static/model'/config['vector_fallback'],dtype='<f2').astype(np.float32).reshape(n,d);unit=raw/np.linalg.norm(raw,axis=1,keepdims=True);hub=np.fromfile(ROOT/'static/model'/config['hub_file'],dtype=np.uint8)
 lexical=np.argsort(np.array(words),kind='stable');lexrank=np.empty(n,int);lexrank[lexical]=np.arange(n)
 ids=np.empty((n,200),dtype=np.uint16);sims=np.empty((n,200),np.float32);counts=np.empty((n,4),np.int32);fallbacks=0
 # Float32 BLAS retrieval, then double-precision refinement of a guarded top256.
 # A conservative reduction error bound triggers a full float64 row if needed.
 gamma=d*(np.finfo(np.float32).eps/2)/(1-d*np.finfo(np.float32).eps/2);norms=np.linalg.norm(raw,axis=1);maxnorm=norms.max()
 for start in range(0,n,256):
  stop=min(n,start+256);scores=raw[start:stop]@raw.T;scores[np.arange(stop-start),np.arange(start,stop)]=-np.inf
  for j,row in enumerate(scores):
   index=start+j;pool=np.argpartition(-row,256)[:256];precise=raw[pool].astype(np.float64)@raw[index].astype(np.float64);order=np.lexsort((lexrank[pool],-precise));pool=pool[order];precise=precise[order]
   if precise[199]-float(row[pool[-1]])<=2*gamma*norms[index]*maxnorm:
    full=raw.astype(np.float64)@raw[index].astype(np.float64);full[index]=-np.inf;order=np.lexsort((lexrank,-full))[:200];chosen=order;values=full[order];fallbacks+=1
   else:chosen=pool[:200];values=precise[:200]
   ids[index]=chosen;sims[index]=values
   # Broad association counts are a sensitivity diagnostic, approximate float32.
   counts[index]=[(row>=t).sum() for t in [.1,.2,.3,.4]]
  if start%4096==0:print(f'Neighbours {stop}/{n} ({time.perf_counter()-begin:.1f}s)',flush=True)
 np.savez_compressed(ROOT/'data/semantic-profile-neighbours.npz',ids=ids,sims=sims)
 print('Neighbour retrieval complete',time.perf_counter()-begin,'s; guarded fallbacks',fallbacks,flush=True)
 indegree={k:np.bincount(ids[:,:k].ravel(),minlength=n) for k in [100,200]}
 # Packed directed edges permit reciprocal counts without a dense adjacency.
 reciprocal={}
 for k in KS:
  sources=np.repeat(np.arange(n,dtype=np.uint64),k);targets=ids[:,:k].ravel().astype(np.uint64);edges=np.sort(sources*n+targets);reverse=targets*n+sources;loc=np.searchsorted(edges,reverse);mutual=(loc<len(edges))&(edges[np.minimum(loc,len(edges)-1)]==reverse);reciprocal[k]=np.bincount(sources.astype(int),weights=mutual,minlength=n).astype(int)
 del edges,sources,targets,reverse,loc,mutual
 records=[None]*n;concentrations=np.empty((n,4));silhouettes=np.empty((n,4));gains=np.empty((n,4))
 for start in range(0,n,64):
  stop=min(n,start+64);allx=unit[ids[start:stop]];local=[{'neighbours':ids[i].astype(int).tolist(),'hub':int(hub[i])/255,'occurrence100':int(indegree[100][i]),'occurrence200':int(indegree[200][i]),'broad_counts':counts[i].tolist(),'scales':[]} for i in range(start,stop)];labels_all=[]
  for ki,k in enumerate(KS):
   x=allx[:,:k];labels,sizes,sil,gain,separation,centers,reps=partition(x);labels_all.append(labels)
   total=x.astype(np.float64).sum(axis=1);concentration=(np.einsum('bd,bd->b',total,total)-k)/(k*(k-1));concentrations[start:stop,ki]=concentration;silhouettes[start:stop,ki]=sil;gains[start:stop,ki]=gain
   for j,index in enumerate(range(start,stop)):
    repids=[[int(ids[index,pos]) for pos in reps[j,c] if labels[j,pos]==c] for c in [0,1]]
    # Affinity entropy is not a count of semantic meanings.
    affinity=sims[index,:k].astype(float);weights=np.exp((affinity-affinity.max())/.1);weights/=weights.sum();eff=float(np.exp(-(weights*np.log(weights)).sum()))
    local[j]['scales'].append({'k':k,'concentration':float(concentration[j]),'dispersion':float(1-concentration[j]),'density_mean':float(affinity.mean()),'density_sd':float(affinity.std()),'density_min':float(affinity.min()),'affinity_effective_size':eff,'reciprocal':int(reciprocal[k][index]),'partition':{'hypotheses':2,'labels':np.packbits(labels[j],bitorder='little').astype(int).tolist(),'sizes':sizes[j].astype(int).tolist(),'silhouette':float(sil[j]),'spherical_loss_gain':float(gain[j]),'centroid_separation':float(separation[j]),'word_to_centroids':(centers[j]@unit[index]).astype(float).tolist(),'representatives':repids}})
  for j,index in enumerate(range(start,stop)):
   for ki,k in enumerate(KS):local[j]['scales'][ki]['partition']['ari_to_200']=ari(labels_all[ki][j],labels_all[-1][j,:k])
   records[index]=local[j]
  if start%4096==0:print(f'Profiles {stop}/{n} ({time.perf_counter()-begin:.1f}s)',flush=True)
 # Descriptive vocabulary percentiles, not validated narrowness or player scores.
 for ki,k in enumerate(KS):
  order=np.argsort(concentrations[:,ki],kind='stable');ranks=np.empty(n);ranks[order]=np.arange(n)/(n-1)
  for i in range(n):records[i]['scales'][ki]['concentration_percentile']=float(ranks[i])
 output=ROOT/'static/semantic-profiles';output.mkdir(exist_ok=True);files=[];rawbytes=zipbytes=0
 for start in range(0,n,SHARD):
  subset=records[start:start+SHARD];name=f'profiles-{start//SHARD:03d}.bin';data=bytearray(b'WGP4'+struct.pack('<II',start,len(subset)))
  for record in subset:
   fingerprint=2166136261
   for neighbour in record['neighbours']:fingerprint=((fingerprint^neighbour)*16777619)&0xffffffff
   data.extend(struct.pack('<f7I',record['hub'],record['occurrence100'],record['occurrence200'],*record['broad_counts'],fingerprint))
   for scale in record['scales']:
    p=scale['partition'];data.extend(struct.pack('<6f3H6f8H',*[scale[x] for x in ['concentration','density_mean','density_sd','density_min','affinity_effective_size','concentration_percentile']],scale['reciprocal'],*p['sizes'],p['silhouette'],p['spherical_loss_gain'],p['centroid_separation'],*p['word_to_centroids'],p['ari_to_200'],*[*(p['representatives'][0]+[65535]*4)[:4],*(p['representatives'][1]+[65535]*4)[:4]]));data.extend(bytes(p['labels']))
  data=bytes(data);packed=gzip.compress(data,mtime=0);(output/name).write_bytes(data);(output/(name+'.gz')).write_bytes(packed);rawbytes+=len(data);zipbytes+=len(packed);files.append({'file':name,'gzip':name+'.gz','sha256':hashlib.sha256(data).hexdigest(),'gzip_sha256':hashlib.sha256(packed).hexdigest(),'count':len(subset)})
 def rank(a):
  order=np.argsort(a,kind='stable');result=np.empty(len(a),float);start=0
  while start<len(a):
   end=start+1
   while end<len(a) and a[order[end]]==a[order[start]]:end+=1
   result[order[start:end]]=(start+end-1)/2;start=end
  return result
 corr=lambda a,b:float(np.corrcoef(rank(a),rank(b))[0,1])
 stats={'concentration200_quantiles':np.quantile(concentrations[:,-1],[0,.1,.25,.5,.75,.9,1]).tolist(),'concentration200_vs_density200_spearman':corr(concentrations[:,-1],sims.mean(axis=1)),'concentration200_vs_indegree200_spearman':corr(concentrations[:,-1],indegree[200]),'silhouette200_quantiles':np.quantile(silhouettes[:,-1],[0,.1,.5,.9,1]).tolist(),'loss_gain200_quantiles':np.quantile(gains[:,-1],[0,.1,.5,.9,1]).tolist()}
 manifest={'version':'semantic-profiles-v4','model_sha':config['vector_sha256'],'word_order_sha256':hashlib.sha256('\0'.join(words).encode()).hexdigest(),'words_sha':hashlib.sha256((ROOT/'static/model'/config['words_file']).read_bytes()).hexdigest(),'vocabulary':n,'dimensions':d,'scales':KS,'shard_size':SHARD,'record_bytes':361,'format':'WGP4 little-endian fixed records; neighbour IDs reconstructed from the existing model, checked by FNV1a-ID fingerprint','files':files,'method':{'neighbours':'Raw game-vector dot products; top256 float32 BLAS candidates refined in float64, conservative error-bound fallback; self excluded, lexical ties.','geometry':'Unit-normalized existing vectors for diagnostics only. No game model changes.','clustering':'Deterministic two-way spherical partition, first/farthest seeds,8 iterations; not identified dictionary senses.','silhouette':'Exact mean cosine-distance silhouette from cluster sums; singleton silhouette0.','stability':'Adjusted Rand index against k200 on shared neighbours; labels can swap.','broad_counts':'Float32 similarity threshold sensitivity; possible boundary rounding.','entropy_temperature':.1,'no_global_narrowness_score':True},'build':{'seconds':time.perf_counter()-begin,'max_rss_bytes':resource.getrusage(resource.RUSAGE_SELF).ru_maxrss*(1 if sys.platform=='darwin' else 1024),'numpy':np.__version__,'guarded_full_rows':fallbacks,'raw_bytes':rawbytes,'gzip_bytes':zipbytes},'statistics':stats}
 (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(ROOT/'reports/cleverness-v4/profile-build.json').write_text(json.dumps({k:v for k,v in manifest.items() if k!='files'},indent=2)+'\n');print(json.dumps(manifest['build']),flush=True);print(json.dumps(stats),flush=True)
if __name__=='__main__':main()
