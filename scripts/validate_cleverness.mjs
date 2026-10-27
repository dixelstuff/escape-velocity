/** Exact engine replay of user-supplied cases. Discrepancies are findings. */
import fs from 'node:fs';
import {Embeddings,Game,decodeHalf} from '../static/engine.mjs';
import {ClevernessAnalyser} from '../static/cleverness.mjs';
const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),b=read(config.vector_fallback);
const e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file))),analyser=new ClevernessAnalyser(e);
export const cases=[
 ['A','squid','printing','espionage',['ink','document']],
 ['B','prawn','tyrant','salesman',['king','ruler','head']],
 ['C','robot','manic','stairs',['activity','disorder','chaotic','spiral']],
 ['D','hamster','exercise','electricity',['wheel','power']],
 ['E','flute','plumbing','botany',['pipe','water','plant']],
 ['F','apricot','perfumery','chemistry',['smell','perfume','chemical']],
 ['G','honeycomb','architecture','orchestra',['lattice','pattern','design','notes','music']],
 ['H','rabbit','computing','bakery',['bunny','mat','pad','mouse','computer','electric','cook','oven']],
 ['I','rabbit','computing','bakery',['mouse','computer','engineer','baker']],
 ['J','rabbit','computing','bakery',['mouse','chips','pie']],
 ['K','almond','confectionery','statue',['sugar','hard','stone']],
 ['L','tortoise','navigation','wedding',['sea','beach']],
 ['M','mate','plate','fate',['friend','dinner','date']],
];
// Optional real scorecards are used only for matching this supplied path, never
// as untrusted instructions. No entire scorecard export is copied into reports.
const archives=[];
for(const name of ['word-golf-scorecards (18).json','word-golf-scorecards (17).json']){
 const path='/Users/andrew/Downloads/'+name;
 if(fs.existsSync(path)){const x=JSON.parse(fs.readFileSync(path));for(const j of x.journeys??[])if(j.state?.won)archives.push({state:j.state,model_sha:j.model_sha,source:name});}
}
const results=[];
for(const [id,tee,wp,flag,words] of cases){
 const requested=[tee,...words,flag],historical=archives.find(j=>j.state.start===tee&&j.state.waypoint?.word===wp&&(j.state.final_target??j.state.target)===flag&&JSON.stringify(j.state.route)===JSON.stringify(requested));
 const settings=config.puzzles.find(h=>h.start===tee&&h.target===flag&&h.waypoint?.word===wp)??{mode:'distance',threshold:.27,launch_min:.095,launch_max:.215,waypoint:{word:wp,threshold:.265}};
 const g=new Game(e,tee,flag,settings.threshold,{...settings,finish_mode:'range',challenge:{version:'stroke-play-v1',par:settings.par??5,attempt:1,id:'cleverness-validation'}}),events=[];let discrepancy=null;
 for(const word of words){
  if(g.won){discrepancy=`Automatic completion before supplied ${word.toUpperCase()}.`;break;}
  try{const shot=g.submit(word);events.push(shot);if(!shot.success){discrepancy=`${word.toUpperCase()} is not playable under the current rules.`;break;}}catch(error){discrepancy=error.message;break;}
 }
 if(!g.won&&!discrepancy){try{events.push(g.submit(flag));}catch(error){discrepancy=error.message;}}
 const exact=g.won&&JSON.stringify(g.route)===JSON.stringify(requested);
 if(!exact&&!discrepancy)discrepancy='The supplied path does not finish as written under current rules.';
 const saved=g.state(),report=g.won?analyser.analyse(saved):null;
 let historicalReplay=null;
 if(historical){try{const old=analyser.analyse(historical.state);historicalReplay={source:historical.source,recorded_model_sha:historical.model_sha,current_model_matches:historical.model_sha===config.vector_sha256,mechanics_available:old.mechanics.available,reason:old.mechanics.reason??null};}catch(error){historicalReplay={reason:error.message};}}
 results.push({id,hole:[tee,wp,flag],requested_route:requested,exact_current_reproduction:exact,discrepancy,historical:historicalReplay,events,actual_route:g.route,report});
}
const compact=r=>r.report?{...r,report:{...r.report,semantic_pivots:r.report.semantic_pivots.map(p=>({...p})),dogleg:r.report.dogleg?.available?{...r.report.dogleg,candidates:r.report.dogleg.candidates}:r.report.dogleg}}:r;
fs.writeFileSync(new URL('../reports/cleverness-v2/validation.json',import.meta.url),JSON.stringify({model_sha:config.vector_sha256,vocabulary:e.words.length,source:'Supplied cases reconstructed with current config/settings; historical matches noted separately.',results:results.map(compact)},null,2)+'\n');
const lines=['# Cleverness v2 — supplied-route validation','','Current model `'+config.vector_sha256+'`. No example-word special cases or threshold changes. All comparisons call Game.submit/pluralShot through the live engine.','','| Case | Exact path reproduced | Mechanical finding | Semantic evidence leader |','|---|---|---|---|',...results.map(r=>'| '+r.id+' · '+r.hole.join(' / ')+' | '+(r.exact_current_reproduction?'Yes':r.discrepancy)+' | '+(r.report?.mechanics.available?r.report.mechanics.avoidable_strokes+' avoidable strokes; setups: '+r.report.mechanics.words.filter(w=>w.necessary_for_next).map(w=>w.word).join(', '):'Not claimed')+' | '+(r.report?.strongest_pivots.map(p=>p.word).join(', ')??'Not assessed')+' |'),'','## Interpretation','','The ordering is diagnostic evidence, not a cleverness score or human sense classification. First played words are eligible. No stroke count or objective progress enters the semantic ordering. Lexical discounts affect only evidence at the matched objective association; original semantic data remains available.','','Detailed JSON retains every submitted shot, actual vs requested routes, full bypass proofs, combined-removal proofs, per-word witnesses and dogleg candidate counts. A discrepancy is not silently patched by changing rules. The longer rabbit path demonstrates large compressions; the honeycomb path tests two removals together. Dogleg landing changes are replayed through the second leg.','','Historical scorecards (when a matching supplied path is found) are noted with the recorded model hash. A mismatch is not treated as proof that the historical game was wrong.',''];
fs.writeFileSync(new URL('../reports/cleverness-v2/VALIDATION.md',import.meta.url),lines.join('\n'));
console.log(lines.join('\n'));
