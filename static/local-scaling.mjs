/** Frozen 15% local-scaling trial. Radii use the original published model. */
export function localScalingModel(base,radii,scaling,id='ls15-v1') {
 if(radii.length!==base.words.length||!Array.from(radii).every(r=>Number.isFinite(r)&&r>0))throw Error('Incomplete local-scaling data. Please reload.');
 const {alpha,slope,offset,k}=scaling;
 if(alpha!==.15||k!==10||!Number.isFinite(slope)||slope<=0||!Number.isFinite(offset))throw Error('Invalid local-scaling profile.');
 const model=Object.create(base);
 Object.assign(model,{word_model:id,localScaling:{radii,scaling},
  scaleSimilarity(ai,bi,cosine){
   if(ai===bi)return 1;
   const ls=Math.exp(-((1-cosine)**2)/(radii[ai]*radii[bi]));
   return (1-alpha)*cosine+alpha*(ls-offset)/slope;
  },
  cosine(a,b){
   const ai=this.index.get(a),bi=this.index.get(b);
   if(ai===undefined||bi===undefined)throw Error('Choose words in the supported vocabulary.');
   return this.scaleSimilarity(ai,bi,base.cosine(a,b));
  }
 });
 return model;
}
