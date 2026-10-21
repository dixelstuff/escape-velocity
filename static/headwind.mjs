/** Fixed topic projection, shared by play, assessments and saved-round replay. */
export function headwindSettings(value){
 if(!value)return null;
 const word=String(value.word??'').trim().toLowerCase(),strength=Number(value.strength??.5),version=value.version??'topic-projection-v1';
 if(!word||!Number.isFinite(strength)||strength<=0||strength>=1||version!=='topic-projection-v1')throw Error('Invalid headwind settings.');
 return {word,strength,version};
}
export const headwindKey=value=>JSON.stringify(headwindSettings(value));
const cache=new WeakMap();
export function withHeadwind(embeddings,value){
 const wind=headwindSettings(value);
 if(!wind)return embeddings;
 if(embeddings.headwind&&headwindKey(embeddings.headwind)===headwindKey(wind))return embeddings;
 const base=embeddings.headwindBase??embeddings,key=headwindKey(wind),cached=cache.get(base);
 if(cached?.key===key)return cached.model;
 if(!base.index.has(wind.word))throw Error('Choose a headwind word in the supported vocabulary.');
 const {vectors,dimensions:d,words}=base,offset=base.index.get(wind.word)*d,axis=new Float64Array(d);
 let axisNorm=0;for(let k=0;k<d;k++)axisNorm+=vectors[offset+k]**2;
 if(axisNorm<=1e-12)throw Error('The headwind direction is unavailable.');
 for(let k=0;k<d;k++)axis[k]=vectors[offset+k]/Math.sqrt(axisNorm);
 const transformed=new Float32Array(vectors.length);
 for(let i=0;i<words.length;i++){
  const row=i*d;let projection=0,norm=0;
  for(let k=0;k<d;k++)projection+=vectors[row+k]*axis[k];
  for(let k=0;k<d;k++){const v=vectors[row+k]-wind.strength*projection*axis[k];transformed[row+k]=v;norm+=v*v;}
  if(norm<=1e-12)throw Error('The headwind removed a word direction.');
  for(let k=0;k<d;k++)transformed[row+k]/=Math.sqrt(norm);
 }
 const model=Object.create(base);Object.assign(model,{vectors:transformed,headwind:wind,headwindBase:base});
 cache.set(base,{key,model});return model;
}
