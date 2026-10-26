/** Read-only, route-local experiments. No alternative words or routes are searched. */
const clamp=x=>Math.max(0,Math.min(1,x));
const positive=x=>Math.max(0,x);
const EPS=1e-12;
export const setupGain=(aToC,bToC)=>bToC-aToC;

/** Objective coordinates are semantic leg progress, not rendered/map distance.
 * Each dogleg leg gets half the interval. Never compare pre-dogleg flag affinity.
 * Recorded destination includes the engine's credited word-form allowance.
 */
export function objectiveProgress(saved,route,bridges,cosine){
 const threshold=saved.final_threshold??saved.threshold;
 if(!saved.rules||!Number.isFinite(threshold))return {available:false,reason:'No saved game objectives; semantic-only diagnostics.',points:[]};
 const flag=saved.final_target??saved.target,wp=saved.waypoint,points=[{position:0,word:route[0],value:0,stage:0,target:wp?.word??flag}];
 let stage=0,baseline=cosine(saved.start,wp?.word??flag);
 for(let i=1;i<route.length;i++){
  const bridge=bridges.find(b=>b.position===i),event=bridge?saved.history?.[bridge.eventIndex]:(saved.history??[]).findLast(h=>h.success&&!h.automatic&&h.word===flag);
  if(!bridge){points.push({position:i,word:route[i],value:1,stage:wp?1:0,target:flag,fixed:true});continue;}
  if(!event||event.stage!==undefined&&event.stage!==stage)return {available:false,reason:'Saved leg transitions are incomplete; semantic-only diagnostics.',points:[]};
  const target=wp&&stage===0?wp.word:flag,legThreshold=wp&&stage===0?(wp.threshold??.265):threshold;
  const destination=Number.isFinite(event.destination)?event.destination:cosine(event.scoring_word??event.word,target);
  const legBaseline=Number.isFinite(event.leg_baseline)?event.leg_baseline:baseline;
  const fraction=clamp((destination-legBaseline)/Math.max(EPS,legThreshold-legBaseline));
  let value=wp?(stage+fraction)/2:fraction;
  if(event.waypoint_reached){value=.5;stage=1;baseline=cosine(event.word,flag);}
  points.push({position:i,word:route[i],value,stage:wp?(event.stage??(event.waypoint_reached?0:stage)):0,target,destination,baseline:legBaseline,threshold:legThreshold,dogleg_reached:!!event.waypoint_reached});
 }
 return {available:true,units:'fraction of objective journey (equal weight per leg)',points};
}

/** All non-adjacent endpoint pairs; at most O(route length cubed), tiny routes only.
 * A return only counts when the interior leaves the endpoint neighbourhood.
 * A close synonym chain is not a loop merely because its endpoints are similar.
 */
export function semanticLoops(route,cosine,progression={available:false,points:[]}){
 const loops=[];
 for(let a=0;a<route.length-2;a++)for(let c=a+2;c<route.length;c++){
  const returned=positive(cosine(route[a],route[c]));let excursion=0,furthest=a+1;
  for(let b=a+1;b<c;b++){const distance=positive(returned-Math.min(cosine(route[a],route[b]),cosine(route[c],route[b])));if(distance>excursion+EPS){excursion=distance;furthest=b;}}
  const raw=clamp(returned*excursion),points=progression.points??[],crossesDogleg=points.slice(a+1,c+1).some(p=>p.dogleg_reached),gain=progression.available?positive(points[c].value-points[a].value):null;
  const effective=crossesDogleg?0:raw*(gain===null?1:1-clamp(gain));
  loops.push({from:a,to:c,sequence:route.slice(a,c+1),return_similarity:returned,excursion,furthest,raw,objective_gain:gain,crosses_dogleg:crossesDogleg,value:effective});
 }
 return loops;
}

export function analyseJourney({route,bridges,saved,cosine}){
 const progression=objectiveProgress(saved,route,bridges,cosine),loops=semanticLoops(route,cosine,progression),words=bridges.map(b=>{
  const p=b.position,incoming=cosine(route[p-1],b.word),outgoing=cosine(b.word,route[p+1]),bypass=cosine(route[p-1],route[p+1]);
  const gain=setupGain(bypass,outgoing),touching=loops.filter(l=>l.from<p&&l.to>p),backtracking=touching.reduce((max,l)=>Math.max(max,l.value),0);
  let pivot=null;
  if(p>=2){
   const setup=route[p-1],before=route[p-2],supportGain=cosine(setup,b.word)-cosine(before,b.word),g=positive(supportGain);
   // Separation is primary; positive setup adds a bounded bonus, never a gate.
   const support=.5+.5*g/(1+g),novelty=1-positive(bypass),end=Math.min(p+1,route.length-2),start=p-2;
   const progress=progression.available?positive(progression.points[end].value-progression.points[start].value):null;
   const progressionFactor=progress===null?1:Math.sqrt(clamp(progress));
   const localLoops=loops.filter(l=>l.from>=start&&l.to<=p+1),loop=localLoops.reduce((max,l)=>Math.max(max,l.value),0);
   const value=clamp(b.separation.value*support*novelty*(1-loop)*progressionFactor);
   pivot={word:b.word,position:p,setup_word:setup,sequence:route.slice(start,p+2),value,separation:b.separation.value,setup_gain:supportGain,setup_factor:support,endpoint_similarity:bypass,conceptual_difference:novelty,backtracking:loop,objective_gain:progress,progression_factor:progressionFactor,progression_available:progression.available,window_start:start,window_end:end};
  }
  return {position:p,word:b.word,setup:{value:gain,incoming,outgoing,bypass},backtracking:{value:backtracking,loop_count:touching.filter(l=>l.raw>EPS).length},pivot};
 });
 const maximum=(items,value)=>items.reduce((best,item)=>!best||value(item)>value(best)+EPS?item:best,null);
 const bestPivot=maximum(words.filter(w=>w.pivot).map(w=>w.pivot),p=>p.value),bestSetup=maximum(words,w=>w.setup.value),worstLoop=maximum(loops,l=>l.value);
 return {progression,loops,words,best_pivot:bestPivot,best_setup:bestSetup?{word:bestSetup.word,position:bestSetup.position,value:bestSetup.setup.value}:null,backtracking:{value:worstLoop?.value??0,strongest_loop:worstLoop,raw_maximum:loops.reduce((n,l)=>Math.max(n,l.raw),0)}};
}
