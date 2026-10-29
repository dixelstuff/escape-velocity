/** Maintained browser-only vector evidence adapter. No server or lexical queries. */
/** Arbitrary completed-route evidence. Same operations as V6.4/V6.5 builders. */
import {Game} from '../engine.mjs?v=page-cards-v1';
const wordnetPairEvidence=()=>({matches:[],phrase_matches:[],dictionary_semantic:[],morphology:null,source_scope:'Vectors only'}),wordnetCoverage={source:'Vectors only; lexical evidence excluded'};
import {strategyStateKey} from './cleverness-v6.5.mjs?v=page-cards-v1';
function evidenceFor(state,diagnostics,e){const pairs=[];for(let i=0;i<diagnostics.route.length;i++)for(let j=i+1;j<Math.min(diagnostics.route.length,i+4);j++)pairs.push({from_position:i,to_position:j,from:diagnostics.route[i],to:diagnostics.route[j],cosine:e.cosine(diagnostics.route[i],diagnostics.route[j])});const d=diagnostics.dogleg_strategy;return {state,diagnostics,pairs,waypoint_pair:d?{from:diagnostics.route[d.position],to:d.waypoint,cosine:e.cosine(diagnostics.route[d.position],d.waypoint)}:null};}
import {scoreV6} from './cleverness-v6.mjs?v=page-cards-v1';
import {scoreV67} from './cleverness-v6.7.mjs?v=page-cards-v1';
import {playtestKey,makePlaytestReport} from '../cleverness-playtest-data.mjs?v=page-cards-v1';
const clone=g=>Object.assign(Object.create(Object.getPrototypeOf(g)),g,{history:structuredClone(g.history),route:[...g.route],automatic_shots:structuredClone(g.automatic_shots)}),angular=c=>Math.acos(Math.max(-1,Math.min(1,c)));
export function replayCompleted(e,s){
 if(!s?.won||!Array.isArray(s.history)||!s.history.length)throw Error('A successfully completed attempt is required.');
 if((s.word_model??'current')!=='current'||s.headwind)throw Error('Full V6.7 evidence currently supports the unmodified Current word model only.');
 const {history,...options}=s,g=new Game(e,s.start,s.final_target??s.target,s.final_threshold??s.threshold,{...options,second_leg_finish_span:s.second_leg_finish_span??0});let post=null,landing=null;
 for(const h of history){if(g.won)throw Error('Completed history contains a discarded branch after the finish.');const event=g.submit(h.word);if(!event.success)throw Error('Completed history contains an unsuccessful or discarded shot: '+h.word);if(event.waypoint_reached){landing=event;post=clone(g);}}
 if(!g.won||JSON.stringify(g.route)!==JSON.stringify(s.route)||g.history.length+g.automatic_shots.length!==history.length+(s.automatic_shots?.length??0))throw Error('Completed attempt does not match authoritative engine replay.');
 return {game:g,post,landing};
}
export function strategyEvidence(e,s,{post,landing},doglegContext){
 if(!post||!landing?.inside)throw Error('V6.6 requires a completed dogleg route. Par 3 scoring is not defined by this scorer.');
 const history=s.history,index=post.history.length-1,B=post.route[index+1],W=s.waypoint.word,F=s.final_target,bf=e.cosine(B,F),wf=e.cosine(W,F),bw=e.cosine(B,W),suffix=history.slice(index+1).map(h=>h.word),wp=clone(post);
 Object.assign(wp,{current:W,leg_start:W,baseline:wf,best_progress:wf,won:false,challenge_failed:false,automatic_shots:[]});wp.route[wp.route.length-(post.won&&post.route.at(-1)===F?2:1)]=W;if(wp.route.at(-1)===F)wp.route.pop();wp.history.at(-1).word=W;delete wp.history.at(-1).scoring_word;
 const sfB=post.finishShortfall(B,bf),sfW=wp.finishShortfall(W,wf),events=[];let error=null,completed=false,strokes=0,kind=null;
 if(wp.finishesFrom(W,wf)){completed=true;strokes=1;kind='automatic_finish_from_waypoint';}else for(const word of suffix){try{const event=wp.submit(word);events.push(event);strokes++;if(!event.success){kind=event.connected?'backward':'connection';break;}if(wp.won){completed=true;strokes+=wp.automatic_shots.length;kind='completed_suffix';break;}}catch(ex){error=ex.message;kind='restriction';break;}}
 if(!kind)kind='incomplete_suffix';const first=history[index+1],next=first?post.finishShortfall(first.scoring_word??first.word,first.destination):sfB;
 return {state_key:strategyStateKey(s),scope:'Authoritative recorded-route replay; only observed suffix tested from literal waypoint.',route:[...s.route],position:index+1,tee:s.start,waypoint:W,landing:B,flag:F,validated:true,landing_event:landing,approach_strokes:index+1,departure_strokes:history.length+(s.automatic_shots?.length??0)-index-1,departure_use:{finished_on_arrival:post.won,first_word:first?.word??F,initial_shortfall:sfB,first_word_shortfall:next,shortfall_reduction:sfB-next},geometry:{landing_waypoint_cosine:bw,effective_landing_waypoint_cosine:landing.destination,waypoint_threshold:s.waypoint.threshold,landing_flag_cosine:bf,waypoint_flag_cosine:wf,flag_cosine_gain:bf-wf,landing_flag_angular_distance:angular(bf),waypoint_flag_angular_distance:angular(wf),relative_angular_advantage:(angular(wf)-angular(bf))/Math.max(1e-6,angular(wf)),threshold_relative_advantage:(bf-wf)/Math.max(1e-6,s.final_threshold-wf),landing_finish_shortfall:sfB,waypoint_finish_shortfall:sfW,normalized_shortfall_advantage:Math.min(1,Math.max(0,(sfW-sfB)/Math.max(1e-6,sfW)))},counterfactual:{description:'Same recorded suffix from stipulated literal-waypoint lie, not a proposed legal prefix.',words:suffix,completed,strokes,kind,error,events,restriction_confounded:kind==='restriction'||history.some(h=>h.golden_holed)},steps:history.map((h,i)=>({position:i+1,word:h.word,origin:h.origin,target:h.leg_target??(i<=index?W:F),before:e.cosine(h.origin,h.leg_target??(i<=index?W:F)),after:h.destination,threshold:h.leg_threshold??(i<=index?s.waypoint.threshold:s.final_threshold),scoring_word:h.scoring_word??h.word,success:h.success})),dogleg_context:doglegContext};
}
export async function buildLiveEvidence(e,analyser,state,queryTriples){
 const s=structuredClone(state),replayed=replayCompleted(e,s);
 if(!s.waypoint)throw Error('V6.6 requires a completed dogleg route. Par 3 scoring is not defined by this scorer.');
 const diagnostics=await analyser.analyse(s),d=diagnostics.dogleg_strategy,i=d.position,[A,B,C]=diagnostics.route.slice(i-1,i+2),W=d.waypoint,profile=(await analyser.v4.store.forWords(e,[B])).get(B),triples={approach_departure:[A,B,C],approach_waypoint:[A,B,W],waypoint_departure:[W,B,C]},lex=await queryTriples(Object.values(triples));
 if(!Array.isArray(lex)||lex.length!==3||lex.some((x,i)=>JSON.stringify(x?.triple)!==JSON.stringify(Object.values(triples)[i])))throw Error('Full WordNet relationship evidence is unavailable or mismatched.');
 const context={position:i,waypoint:W,sequence:[A,B,C],contexts:Object.fromEntries(Object.entries(triples).map(([k,t])=>[k,analyser.v4.contextTriple(...t,profile)])),lexical:Object.fromEntries(Object.keys(triples).map((k,i)=>[k,lex[i]])),pairs:Object.fromEntries([['incoming',A,B],['waypoint',B,W],['outgoing',B,C]].map(([k,from,to])=>[k,{from,to,cosine:e.cosine(from,to),lexical:wordnetPairEvidence(from,to)}])),endpoint_cosines:{approach_waypoint:e.cosine(A,W),waypoint_departure:e.cosine(W,C),approach_departure:e.cosine(A,C)},mechanical:{setup:d.bridge.strategic_functions,replacements:d.alternative_roles,observed_suffix:d.observed_suffix,automatic_completion:d.automatic_completion}};
 return {input:evidenceFor(s,diagnostics,e),evidence:strategyEvidence(e,s,replayed,context)};
}
export function scoreLiveEvidence(input,evidence,modelSha){return makePlaytestReport(input.state,scoreV67(input,evidence,'harmonic'),scoreV6(input),modelSha);}
export class LiveClevernessService{
 constructor({e,analyser,modelSha,queryTriples}){Object.assign(this,{e,analyser,modelSha,queryTriples});this.cache=new Map();}
 async analyse(state){const key=playtestKey(state,this.modelSha);if(this.cache.has(key))return this.cache.get(key);const pending=(async()=>{const {input,evidence}=await buildLiveEvidence(this.e,this.analyser,state,this.queryTriples);return {...scoreLiveEvidence(input,evidence,this.modelSha),reproducibility:{input,evidence}};})();this.cache.set(key,pending);try{const result=await pending;if(this.cache.size>16)this.cache.delete(this.cache.keys().next().value);return result;}catch(e){this.cache.delete(key);throw e;}}
}

export {evidenceFor};
