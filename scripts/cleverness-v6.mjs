/** Local, experimental V6 scoring. No browser/engine imports or external calls. */
export const VERSION='cleverness-score-v6.2';
export const DEFAULT_CONFIG={
 ranges:{'-3':[80,100],'-2':[70,100],'-1':[50,90],'0':[30,80],'1':[15,65],'2':[0,50],'3':[0,35]},
 other:{under_three_floor:85,under_step:5,under_floor_cap:95,over_three_ceiling:35,over_step:10},
 range_basis:'actual',
 pair:{unknown:.70,unsupported:.60,cosine_start:.08,cosine_full:.40,lexical_floor:.95},
 pivot:{gap_similar:.60,gap_distant:.05,context_mass_full:2,base_context:.75,context_weight:.25,morphology_factor:.20,synonym_factor:.15},
 moments:{sequence_complement:.20,second_gain:.12,third_gain:.06,additional_minimum:.60},
 opportunity:{free_positions:1,rate:.12},
 legs:{approach_factors:[1,1,.80,.40],departure_factors:[1,1,.80,.40],approach_ceilings:[1,1,1,.35],departure_ceilings:[1,1,1,.35],beyond_four_decay:.65,hard_ceiling_from:4},
 strategy:{ordinary_role:.30,specificity_weight:.15,full_sample:48,removable_factor:.50},
 elegance:{ordinary_credibility:.70,credibility_gain:1.40,weakest_weight:.40,redundancy_penalty:.20,redundancy_saturation:2,generic_penalty:.08},
 quality:{ingenuity_gain:1.30,strategy_gain:.50,strategy_gate:.35,elegance_gain:.40}
};
const clip=x=>Math.max(0,Math.min(1,x)),finite=x=>typeof x==='number'&&Number.isFinite(x),ramp=(x,a,b)=>clip((x-a)/(b-a));
const copy=x=>structuredClone(x);
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}};freeze(DEFAULT_CONFIG);
export function configure(overrides={}){
 const merge=(a,b,path='')=>{const r=copy(a);for(const [k,v]of Object.entries(b)){if(!(k in a)&&path!=='ranges')throw Error('Unknown configuration field: '+k);r[k]=v&&typeof v==='object'&&!Array.isArray(v)&&a[k]&&typeof a[k]==='object'&&!Array.isArray(a[k])?merge(a[k],v,path?path+'/'+k:k):copy(v);}return r;};
 const c=merge(DEFAULT_CONFIG,overrides);
 if(!['actual','recorded'].includes(c.range_basis))throw Error('Unknown range basis');
 for(const [name,range]of Object.entries(c.ranges))if(!Number.isInteger(Number(name))||!Array.isArray(range)||range.length!==2||!range.every(finite)||range[0]<0||range[1]>100||range[0]>range[1])throw Error('Invalid golf range');
 for(const key of ['pair','pivot','moments','strategy','elegance','quality','other','opportunity'])for(const value of Object.values(c[key]))if(!finite(value)||value<0)throw Error('Scoring parameters must be finite and nonnegative');
 if(c.pair.cosine_full<=c.pair.cosine_start||c.pivot.gap_similar<=c.pivot.gap_distant||c.pivot.context_mass_full<=0||c.strategy.full_sample<=0||c.elegance.redundancy_saturation<=0)throw Error('Invalid scoring scale');
 for(const [key,names]of Object.entries({pair:['unknown','unsupported','lexical_floor'],pivot:['base_context','context_weight','morphology_factor','synonym_factor'],moments:['sequence_complement','second_gain','third_gain','additional_minimum'],strategy:['ordinary_role','specificity_weight','removable_factor'],elegance:['weakest_weight','redundancy_penalty','generic_penalty'],quality:['strategy_gate']}))for(const name of names)if(c[key][name]>1)throw Error('Normalized parameter exceeds one');
 if(c.other.under_three_floor>c.other.under_floor_cap||c.other.under_floor_cap>100||c.other.over_three_ceiling>100)throw Error('Invalid extended golf ranges');
 for(const name of ['approach_factors','departure_factors','approach_ceilings','departure_ceilings']){const xs=c.legs[name];if(!Array.isArray(xs)||xs.length!==4||xs.some(x=>!finite(x)||x<0||x>1)||xs.some((x,i)=>i&&x>xs[i-1]))throw Error('Leg factors/ceilings must be four nonincreasing normalized values');}
 if(!finite(c.legs.beyond_four_decay)||c.legs.beyond_four_decay<=0||c.legs.beyond_four_decay>=1||!Number.isInteger(c.legs.hard_ceiling_from)||c.legs.hard_ceiling_from<3||!Number.isInteger(c.opportunity.free_positions)||c.opportunity.free_positions<1)throw Error('Invalid leg/opportunity parameters');
 if(c.pivot.base_context+c.pivot.context_weight>1+1e-12)throw Error('Context coefficients exceed one');
 return c;
}
export function golfOutcome(strokes,par,c){
 if(!Number.isInteger(strokes)||strokes<1||!Number.isInteger(par)||par<2)throw Error('Completed stroke count and par are required');
 const actual=strokes-par,recorded=Math.min(actual,2),difference=c.range_basis==='recorded'?recorded:actual;
 const names={'-4':'Condor','-3':'Albatross','-2':'Eagle','-1':'Birdie','0':'Par','1':'Bogey','2':'Double bogey','3':'Triple bogey'};
 const range=c.ranges[String(difference)]??(difference < -3?[Math.min(c.other.under_floor_cap,c.other.under_three_floor+(-difference-4)*c.other.under_step),100]:[0,Math.max(0,c.other.over_three_ceiling-(difference-3)*c.other.over_step)]);
 return {strokes,par,actual_difference:actual,recorded_capped_difference:recorded,range_basis:c.range_basis,difference,outcome:names[difference]??`${Math.abs(difference)} ${difference<0?'under':'over'} par`,range,ace:strokes===1};
}
/** Missing dictionary evidence never subtracts; positive evidence can support a
 * low-cosine expression. Unsupported low cosine means uncertainty, not falsity. */
export function pairCredibility(pair,c){
 const lexical=pair?.lexical?.source_scope==='Full-vocabulary WordNet only'?pair.lexical:null,attested=!!lexical?.matches?.length||!!lexical?.morphology;
 const cosine=finite(pair?.cosine)?pair.cosine:null;
 const vector=cosine===null?c.pair.unknown:c.pair.unsupported+(1-c.pair.unsupported)*ramp(cosine,c.pair.cosine_start,c.pair.cosine_full);
 return {from:pair?.from??null,to:pair?.to??null,cosine,value:Math.max(vector,attested?c.pair.lexical_floor:0),attested,phrase:!!lexical?.phrase_matches?.length,synonym:!!lexical?.dictionary_semantic?.length,morphology:!!lexical?.morphology,uncertain:cosine===null||!attested&&cosine<c.pair.cosine_start,lexical:lexical??null,interpretation:attested?'Uniform WordNet support; intended sense is not established.':cosine===null?'Missing pair evidence: neutral fallback.':'Vector-supported confidence only; no lexical match is neutral and low cosine does not prove implausibility.'};
}
const gap=(cos,c)=>finite(cos)?1-ramp(cos,c.pivot.gap_distant,c.pivot.gap_similar):.5;
const scale200=b=>b?.context?.scales?.find(x=>x.k===200)??null;
function pivot(b,pairs,input,c){
 const left=pairs[b.position-1],right=pairs[b.position],local=input.diagnostics.retained_v4?.bridges?.find(x=>x.position===b.position),scale=scale200(local);
 const endpoint=input.pairs.find(p=>p.from_position===b.position-1&&p.to_position===b.position+1)?.cosine??local?.context?.endpoint_cosine;
 const incoming=finite(scale?.incoming?.mass)?scale.incoming.mass:0,outgoing=finite(scale?.outgoing?.mass)?scale.outgoing.mass:0,total=incoming+outgoing;
 const balance=total>0?2*Math.min(incoming,outgoing)/total:0,mass=clip(Math.min(incoming,outgoing)/c.pivot.context_mass_full);
 const difference=finite(scale?.exclusive_cluster_difference)?scale.exclusive_cluster_difference:0;
 const context=difference*balance*mass;
 const credible=Math.min(left?.value??c.pair.unknown,right?.value??c.pair.unknown),g=gap(endpoint,c);
 const morph=!!left?.morphology&&!!right?.morphology,synonyms=!!left?.synonym&&!!right?.synonym;
 const conventional=morph?c.pivot.morphology_factor:synonyms?c.pivot.synonym_factor:1;
 const semanticAvailable=(finite(left?.cosine)||left?.attested)&&(finite(right?.cosine)||right?.attested)&&finite(endpoint);
 const raw=g*credible*(c.pivot.base_context+c.pivot.context_weight*context)*conventional;
 const f=b.strategic_functions??{},sample=b.alternative_roles??{},tested=sample.tested??0,valid=sample.completed_with_role??0;
 const specificity=sample.available&&tested>0?clip(1-valid/tested)*Math.min(1,tested/c.strategy.full_sample):null;
 const demonstrated=!!f.necessary_for_observed_next||!!f.required_objective_switch;
 let role=demonstrated?1:c.strategy.ordinary_role;
 if(f.removable_while_completing===true)role*=c.strategy.removable_factor;
 if(specificity!==null)role*=1-c.strategy.specificity_weight+c.strategy.specificity_weight*specificity;
 const available=f.necessary_for_observed_next!==null&&f.necessary_for_observed_next!==undefined;
 return {id:'pivot-'+b.position,type:'pivot',word:b.word,position:b.position,sequence:b.sequence,from_edge:b.position-1,to_edge:b.position,positions:[b.position],semantic_available:!!semanticAvailable,ingenuity:semanticAvailable?clip(raw):.5,strategic:available?clip(raw*role):.5,role:available?role:null,evidence:{endpoint_cosine:finite(endpoint)?endpoint:null,endpoint_gap:g,incoming_directional_ranks:b.association_evidence?.incoming_ranks??null,outgoing_directional_ranks:b.association_evidence?.outgoing_ranks??null,pair_credibility:credible,context_switch:context,context_difference:difference,incoming_mass:incoming,outgoing_mass:outgoing,support_balance:balance,mass_reliability:mass,conventional_factor:conventional,necessary_next:!!f.necessary_for_observed_next,objective_switch:!!f.required_objective_switch,removable:f.removable_while_completing??null,specificity,sampled_alternatives:tested,completed_alternatives:valid,hub:local?.global_profile?.hub??null},uncertainty:[...(!semanticAvailable?['Insufficient pair/endpoint evidence: this moment is not eligible for positive ingenuity credit.']:[]),...(!scale?['Local context evidence unavailable; no context uplift.']:[]),...(!finite(endpoint)?['Endpoint similarity missing: neutral gap.']:[]),...(!available?['Exact setup replay unavailable: strategic component neutral for this moment.']:[]),...(!left?.attested||!right?.attested?['One or both links lack lexical annotation; no deduction is applied for absence.']:[])]};
}
/** Positive evidence is selected as disjoint edge intervals; a sequence replaces
 * its overlapping single pivots rather than collecting three separate bonuses. */
export function selectMoments(candidates,c){
 const order=[...candidates].sort((a,b)=>b.ingenuity-a.ingenuity||(a.to_edge-a.from_edge)-(b.to_edge-b.from_edge)||a.from_edge-b.from_edge),selected=[],seen=new Set();
 for(const moment of order){const key=moment.sequence.join('\0');if(selected.length&&moment.ingenuity<c.moments.additional_minimum)continue;if(seen.has(key)||selected.some(x=>moment.from_edge<=x.to_edge&&moment.to_edge>=x.from_edge))continue;selected.push(moment);seen.add(key);if(selected.length===3)break;}
 let ingenuity=selected[0]?.ingenuity??.5;const contributions=selected.length?[{id:selected[0].id,contribution:ingenuity}]:[];
 for(let i=1;i<selected.length;i++){const contribution=(i===1?c.moments.second_gain:c.moments.third_gain)*selected[i].ingenuity*(1-ingenuity);ingenuity+=contribution;contributions.push({id:selected[i].id,contribution});}
 return {selected,contributions,ingenuity:clip(ingenuity),unselected_candidates:order.filter(x=>!selected.includes(x)).map(x=>({id:x.id,reason:selected.some(s=>x.from_edge<=s.to_edge&&x.to_edge>=s.from_edge)?'overlapping association evidence':selected.some(s=>s.sequence.join('\0')===x.sequence.join('\0'))?'repeated semantic moment':x.ingenuity<c.moments.additional_minimum?'below additional-moment minimum':'three-moment cap'}))};
}
export function combinedQuality(ingenuity,strategy,elegance,c){
 const terms={baseline:.5,ingenuity:c.quality.ingenuity_gain*(ingenuity-.5),strategy_interaction:c.quality.strategy_gain*Math.max(0,ingenuity-c.quality.strategy_gate)*(strategy-.5),elegance:c.quality.elegance_gain*(elegance-.5)};
 const unbounded=Object.values(terms).reduce((a,b)=>a+b,0);return {value:clip(unbounded),unbounded,terms};
}
/** Deterministic opportunity allowance, not a chance/luck probability. */
export function opportunityCorrection(raw,positions,c){const count=Math.max(0,positions),excess=Math.max(0,count-c.opportunity.free_positions),factor=1/(1+c.opportunity.rate*excess);return {raw_ingenuity:raw,pivot_positions:count,extra_positions:excess,factor,adjusted_ingenuity:raw*factor,interpretation:'Count played intermediate positions once; sequences are not extra independent opportunities. Previous failed attempts are not part of this route.'};}
export function legEfficiency(state,c){
 if(!state)return {available:false,legs:[],factor:1,ceiling:1,hard_ceiling:false,exempt_redundant_positions:[],interpretation:'No completed game trace: no leg efficiency inferred for a semantic-only probe.'};
 const history=state.history??[],total=history.length+(state.automatic_shots?.length??0),index=history.findIndex(h=>h.waypoint_reached),landingPosition=history.slice(0,index+1).filter(h=>h.success&&!h.automatic).length;
 if(state.waypoint&&index<0)throw Error('Completed dogleg route has no recorded landing');
 const counts=state.waypoint?[['tee_to_dogleg',index+1,'approach'],['dogleg_to_flag',total-index-1,'departure']]:[['tee_to_flag',total,'departure']];
 const legs=counts.map(([name,strokes,kind])=>{if(strokes<1)throw Error('Invalid completed leg stroke count');const table=c.legs[kind+'_factors'],caps=c.legs[kind+'_ceilings'],extra=Math.max(0,strokes-4),decay=c.legs.beyond_four_decay**extra;return {name,strokes,factor:table[Math.min(strokes,4)-1]*decay,ceiling:caps[Math.min(strokes,4)-1]*decay,hard:strokes>=c.legs.hard_ceiling_from};});
 const hard=legs.filter(l=>l.hard),factor=Math.min(...legs.map(l=>l.factor)),ceiling=Math.min(...legs.map(l=>l.ceiling)),exempt=[];
 if(hard.length)for(let position=1;position<state.route.length-1;position++){const name=state.waypoint?(position<=landingPosition?'tee_to_dogleg':'dogleg_to_flag'):'tee_to_flag';if(hard.some(l=>l.name===name))exempt.push(position);}
 return {available:true,legs,total_strokes:total,dogleg_manual_stroke:index<0?null:index+1,dogleg_route_position:state.waypoint?landingPosition:null,factor,ceiling,hard_ceiling:hard.length>0,exempt_redundant_positions:exempt,applied_operator:hard.length?'ceiling_only':'factor_then_ceiling',interpretation:hard.length?'Hard leg ceiling replaces the soft efficiency factor. Redundancy within this capped leg is not charged again.':'The worst-leg factor limits range earning once. No symmetry or balanced-split bonus.'};
}
export function applyLegEfficiency(quality,legs){const before=quality.value,scaled=legs.hard_ceiling?before:before*legs.factor,value=Math.min(scaled,legs.ceiling);return {value,unbounded:quality.unbounded,terms:quality.terms,before_leg:before,soft_factor_applied:legs.hard_ceiling?1:legs.factor,ceiling:legs.ceiling,effective_quality_ceiling:Math.min(legs.ceiling,legs.hard_ceiling?1:legs.factor),ceiling_binding:scaled>legs.ceiling,leg_reduction:before-value};}
export function analyseV6(input,overrides={}){
 const c=configure(overrides),v5=input.diagnostics;
 if(!v5||!Array.isArray(v5.route)||input.state&&JSON.stringify(v5.route)!==JSON.stringify(input.state.route)||!Array.isArray(input.pairs))throw Error('Diagnostic route identity mismatch or missing pair collection');
 const route=v5.route,adjacent=route.slice(0,-1).map((_,i)=>pairCredibility(input.pairs.find(p=>p.from_position===i&&p.to_position===i+1),c));
 const words=(v5.bridges??[]).map(b=>pivot(b,adjacent,input,c)),sequences=[];
 for(let i=0;i<words.length-1;i++){
  const a=words[i],b=words[i+1];if(b.position!==a.position+1||!a.semantic_available||!b.semantic_available)continue;
  const left=a.from_edge,right=b.to_edge,edges=adjacent.slice(left,right+1),outer=input.pairs.find(p=>p.from_position===left&&p.to_position===right+1),credible=Math.min(...edges.map(x=>x.value));
  const peak=Math.max(a.ingenuity,b.ingenuity),complement=Math.min(a.ingenuity,b.ingenuity)>=c.moments.additional_minimum?c.moments.sequence_complement*Math.min(a.ingenuity,b.ingenuity)*gap(outer?.cosine,c)*credible*(1-peak):0,strength=clip(peak+complement),roles=[a.role,b.role].filter(finite);
  sequences.push({id:`sequence-${a.position}-${b.position}`,type:'sequence',sequence:route.slice(left,right+2),from_edge:left,to_edge:right,positions:[a.position,b.position],ingenuity:strength,strategic:roles.length?strength*Math.max(...roles):.5,role:roles.length?Math.max(...roles):null,evidence:{peak,complement,outer_cosine:outer?.cosine??null,union_pair_credibility:credible,shared_edges_counted_once:true},uncertainty:['Connected sequence proxy, not proof of different meanings.']});
 }
 const moments=selectMoments([...words.filter(w=>w.semantic_available),...sequences],c),opportunity=opportunityCorrection(moments.ingenuity,Math.max(0,route.length-2),c),ingenuity=opportunity.adjusted_ingenuity,legs=legEfficiency(input.state,c);
 const strategyEvidence=[...words.filter(w=>w.semantic_available),...sequences].filter(m=>m.role!==null).sort((a,b)=>b.strategic-a.strategic||a.from_edge-b.from_edge),strategy=strategyEvidence[0]?.strategic??.5;
 const landing=v5.dogleg_strategy,pairWaypoint=landing?pairCredibility(input.waypoint_pair,c):null,cred=adjacent.concat(pairWaypoint?[pairWaypoint]:[]).map(x=>x.value),weakest=cred.length?Math.min(...cred):c.pair.unknown,mean=cred.length?cred.reduce((a,b)=>a+b)/cred.length:c.pair.unknown,coherence=c.elegance.weakest_weight*weakest+(1-c.elegance.weakest_weight)*mean;
 const proven=v5.whole_route?.verified_removal?.valid===true,chargedRemovals=proven?(v5.whole_route.removed_positions??[]).filter(p=>!legs.exempt_redundant_positions.includes(p)):[],removed=chargedRemovals.length,redundancy=clip(removed/c.elegance.redundancy_saturation);
 const generic=words.reduce((best,m)=>{if(!m.semantic_available)return best;const e=m.evidence,rate=e.sampled_alternatives?e.completed_alternatives/e.sampled_alternatives:0;return Math.max(best,finite(e.hub)?e.hub*rate*(1-m.ingenuity):0);},0);
 const eleganceTerms={baseline:.5,credible_links:c.elegance.credibility_gain*(coherence-c.elegance.ordinary_credibility),verified_redundancy:-c.elegance.redundancy_penalty*redundancy,generic_risk:-c.elegance.generic_penalty*generic};
 const elegance=clip(Object.values(eleganceTerms).reduce((a,b)=>a+b,0)),quality=applyLegEfficiency(combinedQuality(ingenuity,strategy,elegance,c),legs);
 const influences=Object.entries(quality.terms).filter(([k])=>k!=='baseline').map(([source,contribution])=>({source,contribution}));
 return {version:VERSION,route:copy(route),components:{semantic_ingenuity:ingenuity,strategic_bridging:clip(strategy),route_elegance:elegance},quality,opportunity,leg_efficiency:legs,config:c,strongest_moment:moments.selected[0]??null,selected_moments:moments.selected,moment_contributions:moments.contributions,strongest_strategy:strategyEvidence[0]??null,word_breakdown:words,sequence_breakdown:sequences,overlap_policy:{excluded:moments.unselected_candidates,interpretation:'Overlapping single/sequence evidence competes for one slot; additional moments use disjoint edges with diminishing gains.'},coherence:{charged_removal_positions:chargedRemovals,suppressed_removal_positions:proven?(v5.whole_route.removed_positions??[]).filter(p=>legs.exempt_redundant_positions.includes(p)):[],pairs:adjacent,waypoint:pairWaypoint,weakest,mean,soft_weakest:coherence,removed_positions:proven?v5.whole_route.removed_positions:[],removal_proof:proven?v5.whole_route.verified_removal:null,generic_risk:generic,terms:eleganceTerms},influential_positive:influences.filter(x=>x.contribution>0).sort((a,b)=>b.contribution-a.contribution),influential_negative:influences.filter(x=>x.contribution<0).sort((a,b)=>a.contribution-b.contribution),elegance_influences:copy(eleganceTerms),uncertainty:[...new Set([...(words.length?[]:['No intermediate-word diagnostics: neutral ingenuity and strategy.']),...words.flatMap(w=>w.uncertainty),...adjacent.filter(p=>p.uncertain).map(p=>`Uncertain association: ${p.from??'?'} → ${p.to??'?'}.`),...(proven?[]:['No verified removal proof: no redundancy penalty.']), 'This is a first computational approximation, not a player percentile or validated human rating.','Low cosine is treated as uncertain, not proof an association is implausible.','Static vectors and limited WordNet coverage can miss familiar expressions and secondary senses.','The bounded replacement sample is not exhaustive uniqueness.','Total strokes choose the golf band; leg distribution and route opportunities restrict how much of it can be earned.'])]};
}

export function scoreV6(input,overrides={}){
 if(!input.state?.won)throw Error('V6 requires a completed route');
 if(!Array.isArray(input.state.history))throw Error('Complete stroke history is required');
 const result=analyseV6(input,overrides),state=input.state,strokes=state.history.length+(state.automatic_shots?.length??0),golf=golfOutcome(strokes,state.challenge?.par??input.par,result.config),unrounded=golf.range[0]+(golf.range[1]-golf.range[0])*result.quality.value;
 return {...result,golf,score_ceiling:golf.range[0]+(golf.range[1]-golf.range[0])*result.quality.effective_quality_ceiling,score:Math.round(unrounded),unrounded_score:unrounded};
}
