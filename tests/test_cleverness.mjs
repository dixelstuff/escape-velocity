import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Embeddings,Game,decodeHalf} from '../static/engine.mjs';
import {ClevernessAnalyser,mechanicalDiagnostics,replaySelection} from '../static/cleverness.mjs';
import {completedBridgeRoute} from '../static/semantic-analysis.mjs';
import {lexicalRelation} from '../static/lexical-relations.mjs';
const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),b=read(config.vector_fallback),e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file))),analyser=new ClevernessAnalyser(e);
const examples=[
 ['A','squid','printing','espionage',['ink','document']],['B','prawn','tyrant','salesman',['king','ruler','head']],['C','robot','manic','stairs',['activity','disorder','chaotic','spiral']],['D','hamster','exercise','electricity',['wheel','power']],['E','flute','plumbing','botany',['pipe','water','plant']],['F','apricot','perfumery','chemistry',['smell','perfume','chemical']],['G','honeycomb','architecture','orchestra',['lattice','pattern','design','notes','music']],['H','rabbit','computing','bakery',['bunny','mat','pad','mouse','computer','electric','cook','oven']],['I','rabbit','computing','bakery',['mouse','computer','engineer','baker']],['J','rabbit','computing','bakery',['mouse','chips','pie']],['K','almond','confectionery','statue',['sugar','hard','stone']],['L','tortoise','navigation','wedding',['sea','beach']],['M','mate','plate','fate',['friend','dinner','date']],
];
const reports=new Map(),states=new Map();
for(const [id,start,wp,target,words] of examples){
 const settings=config.puzzles.find(h=>h.start===start&&h.target===target&&h.waypoint?.word===wp)??{mode:'distance',threshold:.27,launch_min:.095,launch_max:.215,waypoint:{word:wp,threshold:.265}},g=new Game(e,start,target,settings.threshold,{...settings,finish_mode:'range',challenge:{version:'stroke-play-v1',par:settings.par??5,attempt:1,id:'clever-test'}});
 for(const word of words){assert.ok(!g.won,`${id}: early finish is a discrepancy`);assert.equal(g.submit(word).success,true,`${id}: ${word}`);}
 if(!g.won)assert.equal(g.submit(target).success,true);
 assert.equal(g.won,true,id);assert.deepEqual(g.route,[start,...words,target],id);
 const saved=g.state(),before=structuredClone(saved),r=analyser.analyse(saved);reports.set(id,r);states.set(id,saved);assert.deepEqual(saved,before,'diagnostics never mutate the game');assert.equal(r.mechanics.available,true,id);assert.equal(analyser.analyse(saved),r,'completed-route cache');
 for(const p of r.semantic_pivots){assert.ok(p.position>=1);assert.ok(Number.isFinite(p.context_support));assert.equal(p.raw_evidence,(p.separation+p.context_support)/2);assert.equal(p.credited_evidence,p.raw_evidence*p.context_credit_factor);}
 for(const o of r.mechanics.opportunities)assert.equal(o.proof.valid,true,'no speculative economy claims');
 assert.equal(r.mechanics.combined.proof.valid,true);assert.equal(r.mechanics.avoidable_strokes,r.mechanics.original_strokes-r.mechanics.combined.proof.strokes);
}
assert.equal(reports.get('A').strongest_pivots[0].word,'ink');assert.equal(reports.get('A').semantic_pivots[0].first_played,true);
assert.equal(reports.get('A').mechanics.words[0].same_objective,false);assert.equal(reports.get('A').mechanics.words[0].hit_margin_gain,null,'do not compare contact margins across a target switch');
assert.ok(reports.get('B').strongest_pivots.some(p=>p.word==='king'),'secondary-meaning candidate retained without claiming a human interpretation');
const chaotic=reports.get('C').mechanics.words.find(w=>w.word==='chaotic');assert.equal(chaotic.necessary_for_next,true);assert.equal(chaotic.direct.success,false);assert.ok(chaotic.direct.hit_margin<0);assert.ok(chaotic.actual_next.hit_margin>0);assert.equal(reports.get('C').strongest_pivots[0].word,'spiral');
assert.equal(reports.get('D').mechanics.words.find(w=>w.word==='wheel').necessary_for_next,true);const power=reports.get('D').dogleg;assert.equal(power.actual.immediate_completion,true);assert.equal(power.actual.automatic_finish,true);assert.equal(power.candidate_count,287);assert.equal(power.immediate_completions,64);assert.equal(power.complete_coverage,true);
assert.equal(reports.get('E').strongest_pivots[0].word,'pipe');
assert.deepEqual(reports.get('F').lexical_shortcuts.map(s=>[s.from,s.to]),[['perfume','perfumery'],['chemical','chemistry']]);for(const p of reports.get('F').semantic_pivots.filter(p=>p.lexical_shortcuts.length))assert.equal(p.objective_association_factor,.1);
const perfume=reports.get('F').semantic_pivots.find(p=>p.word==='perfume'),chemical=reports.get('F').semantic_pivots.find(p=>p.word==='chemical');assert.equal(perfume.context_credit_factor,1,'unplayed objective morphology does not erase other conceptual associations');assert.equal(chemical.context_credit_factor,.1,'direct flag-form link receives substantial discount');
const honey=reports.get('G').mechanics;assert.ok(honey.individually_removable.some(w=>w.word==='pattern'));assert.ok(honey.individually_removable.some(w=>w.word==='notes'));assert.equal(honey.avoidable_strokes,2);assert.deepEqual(honey.combined.removed_positions,[2,4]);assert.equal(honey.combined.proof.dogleg,'design');assert.deepEqual(honey.combined.proof.route,['honeycomb','lattice','design','music','orchestra']);assert.ok(honey.individually_removable.length>honey.avoidable_strokes,'independent removals cannot simply be added');
const rabbit=reports.get('H').mechanics;assert.ok(rabbit.opportunities.some(o=>o.from_word==='rabbit'&&o.to_word==='mouse'&&o.removed_words.join(',')==='bunny,mat,pad'));assert.equal(rabbit.avoidable_strokes,3);
assert.ok(reports.get('I').lexical_shortcuts.some(s=>s.from==='baker'&&s.to==='bakery'));assert.equal(reports.get('J').strongest_pivots[0].word,'chips');assert.equal(reports.get('L').dogleg.candidate_count,1);assert.equal(reports.get('L').dogleg.other_candidates,0,'a tiny pool is explicit, not a uniqueness award');
for(const [a,b]of [['stone','statue'],['pipe','plumbing'],['car','carpet'],['art','party'],['bird','avian']])assert.equal(lexicalRelation(a,b),null,`${a}/${b} is not a lexical shortcut`);
for(const [a,b]of [['perfume','perfumery'],['chemical','chemistry'],['baker','bakery'],['drum','drums']]){assert.ok(lexicalRelation(a,b));assert.equal(lexicalRelation(a,b).evidence,lexicalRelation(b,a).evidence);}
const clone=structuredClone(states.get('A'));clone.challenge={...clone.challenge,par:5,attempt:12};const changed=analyser.analyse(clone);assert.deepEqual(changed.semantic_pivots,reports.get('A').semantic_pivots,'stroke/par/attempts do not feed semantic evidence');
// Authoritative synthetic engine fixture: changing landing changes second-leg
// baseline and hit requirement. A local same-position approximation gets it wrong.
function landingFixture(contact){
 const names=['tee','bend','curve','done','waypoint','flag'],index=new Map(names.map((w,i)=>[w,i])),values=new Map(),put=(a,b,x)=>values.set([a,b].sort().join(','),x);
 for(const [a,b,x]of [['tee','bend',.5],['tee','curve',.5],['bend','waypoint',.3],['curve','waypoint',.3],['bend','flag',.05],['curve','flag',.1],['bend','curve',.5],['curve','done',contact],['done','flag',.3]])put(a,b,x);
 const model={words:names,index,cosine:(a,b)=>a===b?1:values.get([a,b].sort().join(','))??0,hub:()=>0};
 const game=new Game(model,'tee','flag',.27,{mode:'distance',launch_min:.095,launch_max:.215,finish_mode:'range',waypoint:{word:'waypoint',threshold:.265}});for(const w of ['bend','curve','done'])assert.equal(game.submit(w).success,true);
 const saved=game.state();return mechanicalDiagnostics(model,saved,completedBridgeRoute(saved));
}
let fixture=landingFixture(.2),bend=fixture.words.find(w=>w.word==='bend');assert.equal(bend.direct.success,true,'direct new landing is legal');assert.equal(bend.removable,false,'changed baseline invalidates later shot');
fixture=landingFixture(.5);bend=fixture.words.find(w=>w.word==='bend');assert.equal(bend.removable,true);assert.equal(bend.changed_dogleg,true);assert.equal(bend.removal.dogleg,'curve');assert.equal(bend.removal.events.find(e=>e.word==='done').leg_baseline,.1);
const invalid=structuredClone(states.get('C'));invalid.history.find(h=>h.word==='disorder').waypoint_reached=false;const mismatched=analyser.analyse(invalid);assert.equal(mismatched.mechanics.available,false,'historical discrepancies are reported rather than silently repaired');
console.log('Cleverness v2 passed: all 13 supplied routes, first-word pivots, necessary setups, exact margins, multiple-removal proof, bounded multiword compression, recalculated dogleg baselines, lexical evidence/false-positive controls, complete vs tiny candidate pools, immutable/cached state and no stroke-count creativity factor.');
