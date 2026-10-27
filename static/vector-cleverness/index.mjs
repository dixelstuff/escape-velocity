/** Standalone vector-only scoring. Runs inside the game's assessment worker. */
import {ClevernessV5Analyser} from './cleverness-v5.mjs?v=vector-v1';
import {buildLiveEvidence,evidenceFor,replayCompleted} from './evidence.mjs?v=vector-v1';
import {scoreV6,selectMoments,opportunityCorrection,applyLegEfficiency} from './cleverness-v6.mjs?v=vector-v1';
import {relevance,stageAssessment,PARAMETERS as P} from './cleverness-v6.5.mjs?v=vector-v1';
import {aggregateStages} from './cleverness-v6.6.mjs?v=vector-v1';
import {rescoreV66} from './cleverness-v6.7.mjs?v=vector-v1';
import {makePlaytestReport,playtestKey} from '../cleverness-playtest-data.mjs?v=vector-v1';
export function vectorInput(input){const out=structuredClone(input);for(const pair of out.pairs)delete pair.lexical;if(out.waypoint_pair)delete out.waypoint_pair.lexical;for(const b of out.diagnostics.bridges){const e=b.association_evidence;if(e){delete e.incoming_wordnet;delete e.outgoing_wordnet;}}return out;}
export function vectorEvidence(evidence){const out=structuredClone(evidence);if(out.dogleg_context)out.dogleg_context.lexical=Object.fromEntries(Object.keys(out.dogleg_context.lexical).map(k=>[k,null]));return out;}
export async function scoreVectorInput(input,evidence,modelSha){
 const clean=vectorInput(input),baseline=scoreV6(clean);let score;
 if(clean.state.waypoint){const {scoreV66}=await import('./cleverness-v6.6.mjs?v=vector-v1');score=rescoreV66(scoreV66(clean,vectorEvidence(evidence)),'harmonic');}
 else{
  // A straight hole has one actual departure stage; no invented dogleg or approach credit.
  const c=baseline.config,words=baseline.word_breakdown.map(w=>{const r=relevance(w,null,P);return {...w,stage:'departure',raw_semantic_ingenuity:w.ingenuity,relevance:r,ingenuity:w.ingenuity*r.value};}),candidates=words.filter(w=>w.semantic_available&&w.relevance.eligible).map(w=>({...w,id:'strategic-'+w.id,type:'pivot'}));
  for(const seq of baseline.sequence_breakdown){const members=seq.positions.map(i=>words.find(w=>w.position===i));if(members.some(w=>!w?.semantic_available||!w.relevance.eligible))continue;const peak=Math.max(...members.map(w=>w.ingenuity)),extra=seq.evidence.complement*Math.min(...members.map(w=>w.relevance.value));candidates.push({...seq,stage:'departure',ingenuity:Math.min(1,peak+extra)});}
  const departure=stageAssessment('departure',baseline.route,candidates,words,baseline.coherence.pairs.map(p=>p.value),c,P),aggregation=aggregateStages({departure},c),opportunity=opportunityCorrection(aggregation.raw_ingenuity,baseline.route.length-2,c);
  score=rescoreV66({...baseline,version:'cleverness-score-v6.6-candidate',components:{semantic_ingenuity:opportunity.adjusted_ingenuity,strategic_effectiveness:departure.effectiveness,route_elegance:baseline.components.route_elegance},stages:{departure},aggregation,opportunity,strongest_stage:'departure',strongest_moment:departure.strongest,corner_contribution:null},'harmonic');
 }
 const r=makePlaytestReport(clean.state,score,baseline,modelSha);r.evidence_mode='vectors-only';r.formula_version=r.scorer_version;r.scorer_version='vector-harmonic-v1';r.baseline_label='V6.2 vector-only comparison';r.reproducibility={input:clean,evidence:clean.state.waypoint?vectorEvidence(evidence):null};return r;
}
export class VectorClevernessAnalyser{
 constructor(e,options={}){this.e=e;this.modelSha=options.modelSha;this.v5=new ClevernessV5Analyser(e,undefined,undefined,options);this.cache=new Map();}
 async analyse(state){const key=playtestKey(state,this.modelSha);if(this.cache.has(key))return this.cache.get(key);const task=(async()=>{
  if(!state.waypoint){replayCompleted(this.e,state);const diagnostics=await this.v5.analyse(state);return scoreVectorInput(evidenceFor(state,diagnostics,this.e),null,this.modelSha);}
  const {input,evidence}=await buildLiveEvidence(this.e,this.v5,state,async triples=>triples.map(triple=>({triple,distinct_senses_supported:false,uncertainty:[]})));return scoreVectorInput(input,evidence,this.modelSha);
 })();this.cache.set(key,task);try{const r=await task;if(this.cache.size>12)this.cache.delete(this.cache.keys().next().value);return r;}catch(e){this.cache.delete(key);throw e;}}
}
