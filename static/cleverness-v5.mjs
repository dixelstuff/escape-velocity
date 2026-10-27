/** Diagnostic combinations of existing evidence. Never called by gameplay. */
import {ClevernessV4Analyser} from './cleverness-v4.mjs?v=golf-v189';
import {CLEVERNESS_V5_VERSION,clevernessV5Key} from './cleverness-v5-key.mjs?v=golf-v189';
export {CLEVERNESS_V5_VERSION,clevernessV5Key};
const pos=x=>Math.max(0,x),clamp=x=>Math.min(1,Math.max(0,x));
/** Competing transparent indices, deliberately NOT a route or cleverness score.
 * Weak-side support cannot be replaced with endpoint distance or scarcity.
 */
export function bridgeExperiments(b){
 const c=b.context,scales=c.scales.map(s=>{
  const l=s.incoming.mass,r=s.outgoing.mass,total=l+r,balance=total>0?2*Math.min(l,r)/total:0;
  // |cos(A,n)-cos(C,n)| <= 2 and positive cos(B,n) <= 1.
  // A fixed 2K bound keeps tiny exclusive masses visibly tiny.
  const affinityMass=2*s.k;
  const supportedFraction=affinityMass>0?clamp(total/affinityMass):0;
  const strength=pos(c.weakest_association),gap=1-clamp(c.endpoint_cosine),difference=s.exclusive_cluster_difference??0;
  const overlap=c.endpoint_neighbourhood_overlap100.jaccard;
  return {k:s.k,weakest_positive_link:strength,endpoint_gap:gap,endpoint_overlap100:overlap,exclusive_difference:s.exclusive_cluster_difference,incoming_mass:l,outgoing_mass:r,support_balance:balance,exclusive_mass_fraction:supportedFraction,partition_silhouette:s.partition_silhouette,partition_stability:s.partition_stability,
   strength_gap:strength*gap,
   supported_context_switch:strength*gap*difference*balance*supportedFraction,
   overlap_adjusted_switch:strength*gap*difference*balance*supportedFraction*(1-overlap),
   interpretation:'Raw comparison indices; not percentages, cleverness ratings, human credibility judgements or validated thresholds.'};
 });
 const s=b.setup,sub=b.mechanical_substitution,results=sub.results??[],role=results.filter(x=>x.role_preserved),next=role.filter(x=>x.next_shot?.success||x.early_completion||x.valid);
 return {word:b.word,position:b.position,sequence:[b.predecessor,b.word,b.successor],dogleg:b.dogleg,
  experiments:scales,
  association_evidence:{incoming_cosine:c.incoming_cosine,outgoing_cosine:c.outgoing_cosine,weakest_cosine:c.weakest_association,incoming_ranks:[b.incoming_pair.forward_rank,b.incoming_pair.reverse_rank],outgoing_ranks:[b.outgoing_pair.forward_rank,b.outgoing_pair.reverse_rank],incoming_wordnet:b.lexical_annotations.incoming,outgoing_wordnet:b.lexical_annotations.outgoing,absence:'neutral'},
  alternative_roles:{available:sub.available,tested:sub.tested,failed_landing_or_role:results.length-role.length,preserved_role:role.length,supported_next_or_early_finish:next.length,completed_with_role:role.filter(x=>x.valid).length,failed_after_next:next.filter(x=>!x.valid).length,coverage:sub.coverage??sub.reason,interpretation:'Exact observed-suffix replays; counts are nested mechanical facts, not semantic equivalence or uniqueness.'},
  strategic_functions:{satisfies_dogleg:!!b.dogleg,necessary_for_observed_next:s?.necessary_for_next??null,required_objective_switch:s?.required_dogleg_transition??null,removable_while_completing:s?.removable??null,observed_next:s?.actual_next??null,hit_margin_gain:s?.same_objective?s.hit_margin_gain:null,same_objective:s?.same_objective??null,interpretation:'Functions are reported together, never added as multiple ingenuity credits.'},
  limitations:['Static cosine and lexical matches do not prove the intended association.','High separation can occur for synonyms; gap and overlap expose but do not solve that failure.','Low exclusive mass or a missing sense can suppress a genuine pivot.','All three indices share V4 inputs and are correlated, not independent evidence.']};
}
export function v5FromV4(saved,v4,v2){
 const bridges=v4.bridges.map(bridgeExperiments),lookup=p=>bridges.find(x=>x.position===p),setupSequences=v4.bridges.filter(b=>b.setup?.necessary_for_next||b.setup?.required_dogleg_transition).map(b=>({setup_word:b.word,position:b.position,sequence:b.setup.sequence,necessary_for_next:b.setup.necessary_for_next,objective_switch:b.setup.required_dogleg_transition,same_objective:b.setup.same_objective,hit_margin_gain:b.setup.hit_margin_gain,removable:b.setup.removable,payoff:lookup(b.position+1)??null,interpretation:'An enabling step plus the following bridge evidence, not proof of ingenious setup.'}));
 const dogleg=v4.dogleg,landing=dogleg?lookup(dogleg.position):null,manual=saved.history.filter(h=>h.success&&!h.automatic),weakest=[...v4.pairs].sort((a,b)=>a.cosine-b.cosine||a.position-b.position).slice(0,3).map(p=>({from:p.from,to:p.to,cosine:p.cosine,forward_rank:p.forward_rank,reverse_rank:p.reverse_rank}));
 return {version:CLEVERNESS_V5_VERSION,key:clevernessV5Key(saved),experimental:true,route:v4.route,strokes:manual.length+(saved.automatic_shots?.length??0),bridges,setup_sequences:setupSequences,
  dogleg_strategy:landing?{waypoint:saved.waypoint.word,position:landing.position,approach_landing_departure:landing.sequence,approach_strokes:landing.position,finishing_strokes:manual.length+(saved.automatic_shots?.length??0)-landing.position,observed_suffix:dogleg.observed_continuation,automatic_completion:dogleg.automatic_completion,bridge:landing,alternative_roles:landing.alternative_roles,mechanical_removal:v4.bridges.find(b=>b.position===landing.position).setup?.removable??null,interpretation:'Landing, context change and observed continuation describe one multi-function choice. No extra dogleg ingenuity bonus.'}:null,
  whole_route:{weakest_links:weakest,mechanical_replay_available:!!v2?.mechanics.available,observed_strokes:v2?.mechanics.original_strokes??null,verified_avoidable_strokes:v4.mechanical_economy.avoidable_strokes??null,verified_removal:v4.mechanical_economy.proof??null,removed_positions:v4.mechanical_economy.removed_positions??[],necessary_setup_positions:v4.necessary_setups,backtracking:v2?.secondary.backtracking??null,objective_progression:v2?.secondary.progression??null,interpretation:'Replay proves some extra strokes removable using this route’s words. It neither finds a globally shortest route nor judges the extra associations dull. Dogleg progress is retained separately from flag progress.'},
  retained_v4:v4,coverage:{source:'Uniform WordNet only, missing evidence neutral; no targeted Wiktionary snapshot.',search:'Completed route, existing V4 full-vocabulary conceptual counts and bounded fixed-word replacements. No route enumeration in the browser.',landscape:'Separate local research utility; no landscape data enters this report.'},
  limitations:['There is no final cleverness score or automatic ordering of complete routes.','Combining a credible link, a context switch and a useful role is an experimental hypothesis, not evidence of human satisfaction.','Useful setup and mechanical necessity are not themselves ingenuity.','Short-solution rarity is not semantic originality.','Endpoint gap is bounded at zero for identical concepts; weak/nonpositive sides do not gain positive switch indices.','Support normalization can still miss familiar expressions or secondary senses.']};
}
export class ClevernessV5Analyser{
 constructor(e,semantic,cleverness,options={}){this.v4=options.v4??new ClevernessV4Analyser(e,semantic,cleverness,options);this.cache=new Map();}
 async analyse(saved,earlier=null,v2=null){const key=clevernessV5Key(saved);if(this.cache.has(key))return this.cache.get(key);const begin=performance.now(),base=await this.v4.analyse(saved,earlier,v2),old=v2??this.v4.association.cleverness.analyse(saved,earlier),report=v5FromV4(saved,base,old);report.timing={elapsed_ms:performance.now()-begin,v4:base.timing};if(this.cache.size>=12)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,report);return report;}
}
