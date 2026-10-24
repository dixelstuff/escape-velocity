import {Game,restoreGame,waypointLegAccess} from './engine.mjs?v=golf-v120';
export const WAYPOINT_PAR_VERSION='waypoint-par-v1';
const caches=new WeakMap();
function similarityRow(e,word){
 let cache=caches.get(e);if(!cache)caches.set(e,cache=new Map());
 if(cache.has(word))return cache.get(word);
 const row=new Float32Array(e.words.length),d=e.dimensions,base=e.index.get(word)*d;
 for(let i=0;i<row.length;i++){
  let v=0;for(let k=0;k<d;k++)v+=e.vectors[base+k]*e.vectors[i*d+k];
  v=Math.max(-1,Math.min(1,v));row[i]=e.scaleSimilarity?e.scaleSimilarity(base/d,i,v):v;
 }
 if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(word,row);return row;
}
function family(e,word){
 const stems=[word,...(word.endsWith('s')?[word.slice(0,-1)]:[]),...(word.endsWith('es')?[word.slice(0,-2)]:[])];
 return stems.filter(w=>e.index.has(w)&&e.cosine(w,word)>.65).sort((a,b)=>a.length-b.length||a.localeCompare(b))[0]??word;
}
/** Bounded legal-route search. Counts describe the sample, never all possible routes. */
export function assessWaypointHole(embeddings,settings,{allowDirectLegs=false}={}){
 const validation=waypointLegAccess(embeddings,settings);
 if(!validation.allowed&&!allowDirectLegs)return {...validation,version:WAYPOINT_PAR_VERSION,estimate:true,suggested_par:null};
 const root=new Game(embeddings,settings.start,settings.target,settings.threshold??.27,{mode:'distance',launch_min:.095,launch_max:.215,...settings,challenge:undefined,golden_paths:[]});
 const e=root.e,routes=[],expanded=new Set();let beam=[{game:root,words:[],margin:1,quality:0}],evaluated=0;
 function choices(g){
  const contact=similarityRow(e,g.current),destination=similarityRow(e,g.target),current=destination[e.index.get(g.current)],candidates=[];
  for(let i=0;i<e.words.length;i++){
   const word=e.words[i];if(word===g.current||!/^([a-z]{2,20})$/.test(word)||g.stage===0&&word===g.final_target||g.stage===1&&word===g.waypoint.word&&g.history.some(h=>h.success&&h.word===word))continue;
   const required=g.requirement(g.current,word,current,destination[i]).required;
   // Keep near-boundary variants for the exact plural-rescue check below.
   if(contact[i]+.025+1e-7<required||destination[i]+.025+1e-7<g.best_progress-g.backward_allowance)continue;
   const gain=(Math.min(destination[i],g.threshold)-Math.min(current,g.threshold))/Math.max(.03,g.threshold-g.baseline),margin=contact[i]-required;
   candidates.push({word,gain,margin,rank:Math.min(1,gain)+.65*Math.min(.3,margin)-.06*(e.hub?.(word)??0)});
  }
  // Include both progress leaders and strongly connected setup choices.
  candidates.sort((a,b)=>b.rank-a.rank||a.word.localeCompare(b.word));
  const strong=[...candidates].sort((a,b)=>(b.margin+.25*b.gain)-(a.margin+.25*a.gain));
  return [...new Set([...candidates.slice(0,12),...strong.slice(0,6)].map(c=>c.word))];
 }
 for(let depth=0;depth<4&&beam.length;depth++){
  const next=[];
  for(const node of beam){
   const g=node.game,key=[g.stage,g.current,g.leg_start,g.baseline,g.best_progress,node.words.join(',')].join('|');
   if(expanded.has(key))continue;expanded.add(key);
   for(const word of choices(g)){
    evaluated++;const trial=restoreGame(e,g.state());let shot;try{shot=trial.submit(word);}catch{continue;}if(!shot.success)continue;
    const words=[...node.words,word],margin=Math.min(node.margin,shot.launch-shot.required,shot.automatic_shot?.launch!==undefined?shot.automatic_shot.launch-shot.automatic_shot.required:1),quality=node.quality+shot.launch-shot.required-.04*(e.hub?.(word)??0);
    if(trial.won){const entry=trial.history.find(h=>h.waypoint_reached);routes.push({words,strokes:trial.state().attempts,margin,quality,family:[words[0],entry.word,words.at(-1)].map(w=>family(e,w)).join('|')});}
    else if(!trial.challenge_failed){const progress=(Math.min(trial.best_progress,trial.threshold)-trial.baseline)/Math.max(.03,trial.threshold-trial.baseline);next.push({game:trial,words,margin,quality,rank:Math.min(1,progress)+.2*quality});}
   }
  }
  // Preserve exploration on both legs rather than letting one crowd out the other.
  const first=next.filter(n=>n.game.stage===0).sort((a,b)=>b.rank-a.rank),last=next.filter(n=>n.game.stage===1).sort((a,b)=>b.rank-a.rank);
  const selected=[...first.slice(0,3),...last.slice(0,3)],selectedSet=new Set(selected);
  for(const n of next.sort((a,b)=>b.rank-a.rank))if(selected.length<6&&!selectedSet.has(n)){selected.push(n);selectedSet.add(n);}
  beam=selected;
 }
 const distinct=new Map();for(const r of routes.sort((a,b)=>a.strokes-b.strokes||b.margin-a.margin))if(!distinct.has(r.family))distinct.set(r.family,r);
 const sampled=[...distinct.values()],robust=sampled.filter(r=>r.margin>=.06),short=robust.filter(r=>r.strokes<=4),quick=robust.filter(r=>r.strokes<=3);
 const openingCount=list=>new Set(list.map(r=>r.family.split('|')[0])).size;
 const quickOpenings=openingCount(quick),strongFourOpenings=openingCount(sampled.filter(r=>r.strokes<=4&&r.margin>=.08));
 const suggested_par=quickOpenings>=2||strongFourOpenings>=3?4:5;
 const reason=suggested_par===4?'Several strong short-route openings were found.':sampled.length?'Fewer strong short-route openings were found.':'No short route found in this limited search.';
 return {...validation,version:WAYPOINT_PAR_VERSION,estimate:true,suggested_par,reason,sampled_routes:sampled.length,robust_short_routes:short.length,quick_opening_families:quickOpenings,strong_four_opening_families:strongFourOpenings,best_sampled_strokes:sampled.length?Math.min(...sampled.map(r=>r.strokes)):null,evaluated,routes:sampled};
}
