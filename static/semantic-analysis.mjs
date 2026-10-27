/** Completed-route semantic experiments. Never used by shots, strokes or ranks. */
import {Game} from './engine.mjs?v=golf-v181';
import {withWordModel} from './word-model.mjs?v=golf-v181';
import {withHeadwind} from './headwind.mjs?v=golf-v181';
import {analyseJourney} from './semantic-journey.mjs?v=golf-v181';
export const SEMANTIC_VERSION='bridge-journey-v2';
export const NEIGHBOUR_COUNT=100;
const EPS=1e-12;
const lexical=(a,b)=>a<b?-1:a>b?1:0;
const clamp=n=>Math.max(0,Math.min(1,n));
export const bridgeQuality=(a,b)=>Math.min(a,b);
/** Strictly lower, not a midrank. Ties receive no distinctiveness credit. */
export function distinctiveness(chosen,qualities){
 const count=qualities.length,lower=qualities.filter(q=>q<chosen-EPS).length,tied=qualities.filter(q=>Math.abs(q-chosen)<=EPS).length;
 return {value:count?lower/count:null,lower,tied,higher:count-lower-tied,count};
}
/** Continuous balanced, non-shared positive affinity. No fitted/binary cutoffs.
 * L=sum(max(x-y,0)), R=sum(max(y-x,0)), O=sum(min(x,y)), x=max(0,cos(A,n)), y=max(0,cos(C,n)).
 * S=[4LR/(L+R)^2]*[(L+R)/(L+R+2O)]. Empty/one-sided/shared profiles score zero.
 */
export function neighbourhoodSeparation(pairs){
 let left=0,right=0,shared=0;
 for(const [a,c] of pairs){const x=Math.max(0,a),y=Math.max(0,c);left+=Math.max(0,x-y);right+=Math.max(0,y-x);shared+=Math.min(x,y);}
 const exclusive=left+right,total=exclusive+2*shared;
 const balance=exclusive>EPS?4*left*right/(exclusive*exclusive):0,nonoverlap=total>EPS?exclusive/total:0;
 return {value:clamp(balance*nonoverlap),left_affinity:left,right_affinity:right,shared_affinity:shared,balance,nonoverlap,mean_positive_affinity:pairs.length?total/(2*pairs.length):0,count:pairs.length};
}
/** Reconstruct played positions, never insert an unplayed waypoint word. */
export function completedBridgeRoute(saved){
 if(!saved?.won)throw Error('Semantic analysis is available after holing out.');
 const flag=saved.final_target??saved.target,chosen=(saved.history??[]).map((event,eventIndex)=>({event,eventIndex})).filter(({event})=>event.success&&!event.automatic);
 const nodes=[{word:saved.start,fixed:true},...chosen.map(({event,eventIndex})=>({word:event.word,eventIndex,dogleg:!!event.waypoint_reached,scoring_word:event.scoring_word??event.word}))];
 if(nodes.at(-1).word===flag)nodes.at(-1).fixed=true;else nodes.push({word:flag,fixed:true});
 return {flag,route:nodes.map(n=>n.word),bridges:nodes.slice(1,-1).map((n,i)=>({...n,position:i+1,predecessor:nodes[i].word,successor:nodes[i+2].word}))};
}
export function semanticRouteKey(saved){
 if(!saved?.won)return null;
 return JSON.stringify([SEMANTIC_VERSION,saved.start,saved.final_target??saved.target,saved.waypoint??null,saved.final_threshold??saved.threshold,saved.mode,saved.rules,saved.launch_min,saved.launch_max,saved.word_model??'',saved.headwind??null,saved.plural_rescue,saved.plural_tolerance,saved.family_rescue,saved.allow_backtracking,saved.finish_mode,saved.waypoint_auto_finish,(saved.history??[]).map(h=>[h.word,!!h.success,!!h.automatic,!!h.waypoint_reached,h.scoring_word??null,h.stage??null,h.destination??null,h.leg_baseline??null,h.leg_threshold??null])]);
}
const highest=(bridges,key)=>bridges.reduce((best,b)=>b[key].value!==null&&(!best||b[key].value>best.value+EPS)?{word:b.word,position:b.position,value:b[key].value}:best,null);
export class SemanticAnalyser{
 constructor(e){this.e=e;this.rows=new Map();this.neighbours=new Map();this.variants=new Map();}
 row(word){
  if(this.rows.has(word)){const value=this.rows.get(word);this.rows.delete(word);this.rows.set(word,value);return value;}
  const {words,vectors,dimensions:d,index}=this.e,id=index.get(word);if(id===undefined)throw Error(`The word ${word} is not in this model.`);
  const row=new Float64Array(words.length),offset=id*d;
  for(let i=0;i<words.length;i++){let dot=0;for(let k=0;k<d;k++)dot+=vectors[offset+k]*vectors[i*d+k];dot=Math.max(-1,Math.min(1,dot));row[i]=this.e.scaleSimilarity?this.e.scaleSimilarity(id,i,dot):dot;}
  if(this.rows.size>=32)this.rows.delete(this.rows.keys().next().value);this.rows.set(word,row);return row;
 }
 nearest(word){
  if(this.neighbours.has(word))return this.neighbours.get(word);
  const row=this.row(word),ids=Array.from({length:this.e.words.length},(_,i)=>i).filter(i=>this.e.words[i]!==word);
  ids.sort((a,b)=>row[b]-row[a]||lexical(this.e.words[a],this.e.words[b]));
  const result=ids.slice(0,NEIGHBOUR_COUNT).map(i=>({word:this.e.words[i],index:i,similarity:row[i]}));
  if(this.neighbours.size>=256)this.neighbours.delete(this.neighbours.keys().next().value);this.neighbours.set(word,result);return result;
 }
 analyse(saved){
  const selected=withHeadwind(withWordModel(this.e,saved.word_model),saved.headwind);
  if(selected!==this.e){const key=JSON.stringify([saved.word_model??'',saved.headwind??null]);if(!this.variants.has(key)){if(this.variants.size>=3)this.variants.delete(this.variants.keys().next().value);this.variants.set(key,new SemanticAnalyser(selected));}return this.variants.get(key).analyse(saved);}
  const begin=typeof performance==='undefined'?Date.now():performance.now(),{route,bridges}=completedBridgeRoute(saved),e=this.e;
  const results=bridges.map(b=>{
   const incoming=this.row(b.predecessor),outgoing=this.row(b.successor),index=e.index.get(b.word),quality=bridgeQuality(incoming[index],outgoing[index]);
   const neighbours=this.nearest(b.word).map(n=>({...n,incoming:incoming[n.index],outgoing:outgoing[n.index],quality:bridgeQuality(incoming[n.index],outgoing[n.index])}));
   return {...b,quality,distinctiveness:distinctiveness(quality,neighbours.map(n=>n.quality)),separation:neighbourhoodSeparation(neighbours.map(n=>[n.incoming,n.outgoing])),neighbours};
  });
  const bestDistinctiveness=highest(results,'distinctiveness'),bestSeparation=highest(results,'separation');
  const journey=analyseJourney({route,bridges:results,saved,cosine:(a,b)=>e.cosine(a,b)});
  for(const b of results){const w=journey.words.find(w=>w.position===b.position);Object.assign(b,{setup:w.setup,backtracking:w.backtracking,pivot:w.pivot});}
  let dogleg=null;if(saved.waypoint){try{dogleg=this.dogleg(saved,results);}catch(error){dogleg={available:false,reason:'The saved dogleg prefix could not be reproduced. General neighbourhood measures are still shown.'};}}
  return {version:SEMANTIC_VERSION,key:semanticRouteKey(saved),experimental:true,neighbour_count:NEIGHBOUR_COUNT,vocabulary:e.words.length,route,bridges:results,journey,best_distinctiveness:bestDistinctiveness,best_separation:bestSeparation,same_best_word:!!bestDistinctiveness&&bestDistinctiveness.word===bestSeparation?.word,same_best_position:!!bestDistinctiveness&&bestDistinctiveness.position===bestSeparation?.position,dogleg,elapsed_ms:(typeof performance==='undefined'?Date.now():performance.now())-begin};
 }
 dogleg(saved,bridges){
  const chosen=bridges.find(b=>b.dogleg);if(!chosen)return {available:false,reason:'This saved route does not identify its dogleg landing.'};
  // Reuse exact single-shot legality at the incoming lie. This scans alternative
  // landing words, never possible routes or a replacement outgoing route.
  const e=Object.create(this.e);e.cosine=(a,b)=>this.rows.has(a)?this.rows.get(a)[this.e.index.get(b)]:this.rows.has(b)?this.rows.get(b)[this.e.index.get(a)]:this.e.cosine(a,b);
  const game=new Game(e,saved.start,saved.final_target??saved.target,saved.final_threshold??saved.threshold,saved);
  for(const event of saved.history.slice(0,chosen.eventIndex))game.submit(event.word);
  if(game.stage!==0)throw Error('The saved dogleg transition could not be reconstructed.');
  const incoming=this.row(chosen.predecessor),outgoing=this.row(chosen.successor);this.row(game.target);this.row(game.current);
  const quality=chosen.quality,qualities=[],alternatives=[];let regionCount=0,chosenLegal=false;
  for(let i=0;i<e.words.length;i++){
   const word=e.words[i];if(word===game.current||word===game.final_target)continue;
   const shot=game.pluralShot(word);if(!shot.success||!shot.inside)continue;
   regionCount++;if(word===chosen.word){chosenLegal=true;continue;}
   const q=bridgeQuality(incoming[i],outgoing[i]);qualities.push(q);alternatives.push({word,quality:q,incoming:incoming[i],outgoing:outgoing[i],scoring_word:shot.scoring_word??word});
  }
  if(!chosenLegal)return {available:false,word:chosen.word,position:chosen.position,reason:'This saved landing could not be reproduced with these rules.'};
  alternatives.sort((a,b)=>b.quality-a.quality||lexical(a.word,b.word));
  return {available:true,word:chosen.word,position:chosen.position,waypoint:saved.waypoint.word,threshold:saved.waypoint.threshold??.265,predecessor:chosen.predecessor,successor:chosen.successor,scoring_word:chosen.scoring_word,quality,region_words_including_choice:regionCount,distinctiveness:distinctiveness(quality,qualities),alternatives};
 }
}
