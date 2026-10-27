/** Read-only post-hole diagnostics. No final cleverness score. */
import {ClevernessAnalyser,replaySelection,freshRouteGame} from './cleverness.mjs?v=golf-v184';
import {pairEvidence,phraseCoverage} from './phrase-evidence.mjs?v=golf-v184';
import {ASSOCIATION_VERSION,associationKey} from './association-key.mjs?v=golf-v184';
export {ASSOCIATION_VERSION,associationKey};
const EPS=1e-12,lex=(a,b)=>a<b?-1:a>b?1:0,now=()=>performance.now();
export const COSINE_THRESHOLDS=[.1,.2,.3,.4];
export const RANK_THRESHOLDS=[100,500,1000];
export const LIMITS={replacements_per_bridge:48,replacements_per_route:256,rank_cache_rows:32,report_cache:12};
/** Midranks avoid spurious asymmetry from alphabetical ordering of exact ties. */
export function rankRow(row,self,words){
 const ids=Array.from({length:row.length},(_,i)=>i).filter(i=>i!==self).sort((a,b)=>row[b]-row[a]||lex(words[a],words[b]));
 const ranks=new Float64Array(row.length),ties=new Uint32Array(row.length);ranks[self]=NaN;
 for(let start=0;start<ids.length;){let end=start+1;while(end<ids.length&&Math.abs(row[ids[end]]-row[ids[start]])<=EPS)end++;const mid=(start+1+end)/2;for(let k=start;k<end;k++){ranks[ids[k]]=mid;ties[ids[k]]=end-start;}start=end;}
 return {ranks,ties,count:ids.length,density_top100:ids.slice(0,100).reduce((s,i)=>s+row[i],0)/Math.min(100,ids.length)};
}
export function directionalPair(a,b,sim,ab,ba,count){
 const percentile=r=>count>1?1-(r-1)/(count-1):1;
 return {from:a,to:b,cosine:sim,forward_rank:ab,reverse_rank:ba,forward_percentile:percentile(ab),reverse_percentile:percentile(ba),signed_log2_rank_ratio:Math.log2(ba/ab),absolute_log2_rank_ratio:Math.abs(Math.log2(ba/ab)),reciprocal_prominence:1/Math.sqrt(ab*ba),worse_rank:Math.max(ab,ba),population:count,interpretation:'Asymmetry is descriptive, not creativity credit. Percentiles describe this vocabulary, not players.'};
}
export function substituteRoute(e,saved,manual,position,word){
 const altered=manual.map(n=>n.position===position?{...n,word}:n),proof=replaySelection(e,saved,altered),{game,...publicResult}=proof,shot=proof.events.find(h=>h.position===position),original=manual.find(n=>n.position===position);
 const next=proof.events.find(h=>h.position===position+1);
 return {word,...publicResult,substitution_executed:!!shot,substitution_hit:!!shot?.success,next_shot:next??null,original_dogleg:!!original?.event.waypoint_reached,replacement_dogleg:!!shot?.waypoint_reached,role_preserved:!!shot?.success&&(!original?.event.waypoint_reached||!!shot.waypoint_reached),early_completion:!!game?.won&&proof.events.at(-1)?.position<manual.at(-1)?.position,changed_dogleg_landing:!!original?.event.waypoint_reached&&word!==original.word};
}
export class AssociationAnalyser{
 constructor(e,semantic,cleverness){this.cleverness=cleverness??new ClevernessAnalyser(e,semantic);this.semantic=this.cleverness.semantic;this.ranks=new Map();this.cache=new Map();}
 ranksFor(s,word){
 const key=s.e;let cache=this.ranks.get(key);if(!cache){if(this.ranks.size>=4)this.ranks.delete(this.ranks.keys().next().value);this.ranks.set(key,cache=new Map());}
 if(cache.has(word)){const r=cache.get(word);cache.delete(word);cache.set(word,r);return r;}
 const r=rankRow(s.row(word),s.e.index.get(word),s.e.words);if(cache.size>=LIMITS.rank_cache_rows)cache.delete(cache.keys().next().value);cache.set(word,r);return r;
 }
 analyse(saved,earlier=null,v2Report=null){
 const key=associationKey(saved);if(this.cache.has(key))return this.cache.get(key);
 const begin=now(),v2=v2Report??this.cleverness.analyse(saved,earlier),s=this.semantic.variants.get(JSON.stringify([saved.word_model??'',saved.headwind??null]))??this.semantic,e=s.e,words=e.words;
 const route=v2.route,pairs=route.slice(0,-1).map((a,i)=>{
  const b=route[i+1],ar=this.ranksFor(s,a),br=this.ranksFor(s,b),ai=e.index.get(a),bi=e.index.get(b);
  return {position:i,...directionalPair(a,b,s.row(a)[bi],ar.ranks[bi],br.ranks[ai],ar.count),forward_ties:ar.ties[bi],reverse_ties:br.ties[ai],from_density_top100:ar.density_top100,to_density_top100:br.density_top100,from_hub:e.hub?.(a)??null,to_hub:e.hub?.(b)??null,evidence:pairEvidence(a,b)};
 });
 const pairEnd=now(),manual=(saved.history??[]).map((event,eventIndex)=>({word:event.word,event,eventIndex})).filter(n=>n.event.success&&!n.event.automatic).map((n,i)=>({...n,position:i+1}));let remaining=LIMITS.replacements_per_route;
 const bridges=v2.semantic_pivots.map(p=>{
  const a=s.row(p.predecessor),c=s.row(p.successor),ar=this.ranksFor(s,p.predecessor),cr=this.ranksFor(s,p.successor),chosen=e.index.get(p.word),q=Math.min(a[chosen],c[chosen]);
  const candidates=words.map((word,i)=>({word,index:i,incoming:a[i],outgoing:c[i],quality:Math.min(a[i],c[i]),worse_endpoint_rank:Math.max(ar.ranks[i],cr.ranks[i])})).filter(n=>n.word!==p.predecessor&&n.word!==p.successor);
  const alternatives=candidates.filter(n=>n.word!==p.word),byQ=[...alternatives].sort((x,y)=>y.quality-x.quality||lex(x.word,y.word)),byRank=[...alternatives].sort((x,y)=>x.worse_endpoint_rank-y.worse_endpoint_rank||lex(x.word,y.word));
  const counts=COSINE_THRESHOLDS.map(threshold=>({threshold,alternatives:alternatives.filter(n=>n.quality>=threshold).length,chosen_qualifies:q>=threshold}));
  const rankCounts=RANK_THRESHOLDS.map(cutoff=>({cutoff,alternatives:alternatives.filter(n=>n.worse_endpoint_rank<=cutoff).length,chosen_qualifies:Math.max(ar.ranks[chosen],cr.ranks[chosen])<=cutoff}));
  // Alternate two independent retrieval orders, then exact replay of a fixed
  // replacement and the actual suffix. Never search for a new continuation.
  const selected=[],seen=new Set([p.word]);for(let i=0;i<24;i++)for(const list of [byQ,byRank]){const n=list[i];if(n&&!seen.has(n.word)){seen.add(n.word);selected.push(n);}}
  // Fill the bound after de-duplication; no minimum vector-strength filter.
  for(const n of byQ)if(selected.length<LIMITS.replacements_per_bridge&&!seen.has(n.word)){seen.add(n.word);selected.push(n);}
  let mechanical={available:false,reason:v2.mechanics.reason??'Original route replay unavailable.',tested:0,results:[]};
  if(v2.mechanics.available){
   const eligible=selected.slice(0,Math.min(remaining,LIMITS.replacements_per_bridge));remaining-=eligible.length;
   const results=eligible.map(n=>({...substituteRoute(e,saved,manual,p.position,n.word),conceptual:{incoming:n.incoming,outgoing:n.outgoing,quality:n.quality,worse_endpoint_rank:n.worse_endpoint_rank}}));
   mechanical={available:true,control:substituteRoute(e,saved,manual,p.position,p.word),tested:results.length,eligible_vocabulary_alternatives:alternatives.length,completion_valid:results.filter(n=>n.substitution_executed&&n.valid).length,role_and_completion_valid:results.filter(n=>n.role_preserved&&n.valid).length,selection:'Union of top24 weakest-link and top24 worst-endpoint-rank candidates, filled to48 by weakest link; route budget256; excludes chosen/endpoints. No minimum strength filter.',coverage:'Bounded deterministic candidate sample, not exhaustive mechanical scarcity.',results};
  }
  return {word:p.word,position:p.position,predecessor:p.predecessor,successor:p.successor,dogleg:!!manual.find(n=>n.position===p.position)?.event.waypoint_reached,context:{credited_evidence:p.credited_evidence,raw_evidence:p.raw_evidence,separation:p.separation,left_witnesses:p.left_witnesses,right_witnesses:p.right_witnesses,context_credit_factor:p.context_credit_factor,lexical_shortcuts:p.lexical_shortcuts},incoming_pair:pairs[p.position-1],outgoing_pair:pairs[p.position],conceptual:{criterion:'min(cos(predecessor,X), cos(X,successor)); endpoints excluded, chosen excluded from alternative counts.',vocabulary_candidates_including_choice:candidates.length,chosen_quality:q,chosen_incoming:a[chosen],chosen_outgoing:c[chosen],chosen_rank:1+alternatives.filter(n=>n.quality>q+EPS).length,chosen_ties:1+alternatives.filter(n=>Math.abs(n.quality-q)<=EPS).length,alternatives_at_least_chosen:alternatives.filter(n=>n.quality>=q-EPS).length,cosine_counts:counts,rank_counts:rankCounts,strongest_alternatives:byQ.slice(0,16),rank_alternatives:byRank.slice(0,16),interpretation:'Threshold sensitivity only: these are embedding candidates, not verified meaningful substitutions. Small counts with weak sides are not evidence of creativity.'},mechanical};
 });
 const elapsed=now()-begin,r={version:ASSOCIATION_VERSION,key,experimental:true,route,pairs,bridges,comparison_positions:v2.strongest_pivots.map(p=>p.position),lexical_shortcuts:v2.lexical_shortcuts,dogleg_v2:v2.dogleg?{available:v2.dogleg.available,candidate_count:v2.dogleg.candidate_count,immediate_completions:v2.dogleg.immediate_completions,interpretation:'V2 immediate access evidence retained separately; no flag proximity or dogleg bonus in V3.'}:null,coverage:{vocabulary:words.length,full_vocabulary_ranks:true,conceptual_search:'All supported words, excluding the two endpoints.',phrase:phraseCoverage,mechanical_tests:LIMITS.replacements_per_route-remaining,limits:LIMITS},timing:{elapsed_ms:elapsed,pairs_ms:pairEnd-begin,bridges_ms:now()-pairEnd,v2_elapsed_ms:v2.elapsed_ms,included_v2:!v2Report},memory:{model:'Existing model reused; no new vector matrix.',rank_cache_max_bytes_per_model:LIMITS.rank_cache_rows*words.length*12,cosine_cache_max_bytes_per_model:32*words.length*8,phrase_table:'Lazy-loaded only when V3 is opened.'},limitations:['No final cleverness score. Ranks, strength, context and scarcity remain independent.','High vocabulary percentiles can conceal weak associations; inspect raw cosine and ranks.','Source evidence does not establish the intended sense, expression frequency or human satisfaction.','Closed compounds require verified decomposition; no arbitrary substring matching.','Mechanical samples favour strong embedding bridges and can miss clever dictionary-supported weak links. A valid replacement proves completion, not equivalent meaning.','Candidate counts are not human plausibility judgements. Bounded mechanical tests are not full-vocabulary counts.']};
 if(this.cache.size>=LIMITS.report_cache)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,r);return r;
 }
}
