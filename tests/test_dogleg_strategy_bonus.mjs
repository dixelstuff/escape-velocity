import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bandFreeScore} from '../static/vector-cleverness/band-free.mjs';
import {applyLiveCleverness} from '../static/cleverness-live-score.mjs';
import {BAND_FREE_VERSION,PREVIOUS_BAND_FREE_VERSION,LEGACY_BAND_FREE_VERSION} from '../static/cleverness-score-config.mjs';
import {applyDoglegStrategyBonus,doglegAccessEvidence,DOGLEG_STRATEGY_POINTS} from '../static/dogleg-strategy-bonus.mjs';
import {replayCompleted} from '../static/vector-cleverness/evidence.mjs';
import {Game} from '../static/engine.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
import {compactPlaytestReport} from '../static/cleverness-playtest-data.mjs';
import {DailyGame} from '../static/daily-game.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`),components={semantic_ingenuity:.55,strategic_effectiveness:.8,route_elegance:.65};
const raw=bandFreeScore(components,[2,2]),evidence=(a,b)=>({available:true,eligible:true,incoming_gain:a,outgoing_gain:b});
const add=(a,b,base=raw,c=components)=>applyDoglegStrategyBonus(base,c,evidence(a,b));
near(add(0,0).unrounded_score,raw.unrounded_score);
near(add(1,0).strategic_bonus.raw_amount,3*raw.quality*raw.applied_factor);
assert.ok(add(0,1).strategic_bonus.raw_amount>0);
assert.ok(add(0,1).strategic_bonus.raw_amount<3*raw.quality,'Outgoing credit is a conservative top-up, not another full award');
assert.ok(add(.1,0).unrounded_score<add(.8,0).unrounded_score);
near(add(1,1).unrounded_score,add(1,0).unrounded_score,'Two failures cannot earn two full bonuses');
assert.ok(add(.5,1).unrounded_score>=add(.5,0).unrounded_score);
assert.ok(add(.5,1).strategic_bonus.raw_amount<=3*raw.quality);
near(applyDoglegStrategyBonus(raw,components,{...evidence(1,1),eligible:false}).unrounded_score,raw.unrounded_score);
near(applyDoglegStrategyBonus(raw,components,{available:false}).unrounded_score,raw.unrounded_score);
for(const split of [[1,2],[2,1],[2,2],[2,3],[3,3],[4,4],[6,7]]){
 const base=bandFreeScore(components,split),out=add(1,1,base);
 near(out.strategic_bonus.maximum_budget,DOGLEG_STRATEGY_POINTS*base.quality*base.applied_factor);
 assert.ok(out.unrounded_score<=base.maximum_for_legs);assert.deepEqual(out.legs,base.legs);assert.deepEqual(out.one_stroke_bonus,base.one_stroke_bonus);
}
const ceiling=bandFreeScore({semantic_ingenuity:1,strategic_effectiveness:1,route_elegance:1},[1,2]);
const capped=add(1,1,ceiling,{semantic_ingenuity:1,strategic_effectiveness:1,route_elegance:1});assert.equal(capped.unrounded_score,100);assert.equal(capped.strategic_bonus.applied_amount,0);
const legacy={components,opportunity:{raw_ingenuity:.55,pivot_positions:1},leg_efficiency:{legs:[{strokes:2},{strokes:2}]}};
assert.equal(applyLiveCleverness(legacy).primary_scorer,LEGACY_BAND_FREE_VERSION,'Missing historical evidence must not be relabelled as a complete new score');
const current=applyLiveCleverness({...legacy,dogleg_access:evidence(1,1)});const compact=compactPlaytestReport({...current,diagnostics:{aggregation:{},uncertainty:[]}});assert.deepEqual(compact.dogleg_access,current.dogleg_access);assert.deepEqual(compact.band_free.strategic_bonus,current.band_free.strategic_bonus);assert.equal(current.primary_scorer,PREVIOUS_BAND_FREE_VERSION);near(applyLiveCleverness(current).band_free.unrounded_score,current.band_free.unrounded_score);

const {e}=loadResearchModel(),data=JSON.parse(fs.readFileSync('tests/dogleg-strategy-fixtures.json'));
const find=tee=>data[tee];
const analyse=state=>{const before=JSON.stringify(state),r=replayCompleted(e,state),out=doglegAccessEvidence(r.post.e,state,r.post);assert.equal(JSON.stringify(state),before);return out;};
const free=analyse(find('breeze'));assert.equal(free.landing,'free');assert.equal(free.incoming.works,true);assert.equal(free.outgoing.works,false);assert.ok(free.outgoing_gain>0);assert.equal(free.removable,false);
const funding=analyse(find('applause'));assert.equal(funding.incoming.works,false);assert.equal(funding.outgoing.works,true);assert.ok(funding.incoming_gain>0);
const window=analyse(find('claim'));assert.equal(window.incoming.works,true);assert.equal(window.outgoing.works,true);assert.equal(window.incoming_gain,0);assert.equal(window.outgoing_gain,0);
const literal=analyse(find('stamp'));assert.equal(literal.eligible,false);assert.equal(literal.reason,'Literal dogleg played');
// A tempting access gain cannot reward a landing that the engine can skip.
const pairs={'tee,middle':0,'setup,middle':.15,'landing,middle':.4,'next,middle':.4,'tee,setup':.6,'setup,landing':.6,'setup,next':.6,'landing,next':.6,'landing,flag':.05,'middle,flag':0,'next,flag':.3,'middle,next':.1};
const fake={index:new Map(['tee','middle','setup','landing','next','flag'].map(w=>[w,0])),cosine:(a,b)=>a===b?1:pairs[a+','+b]??pairs[b+','+a]??0};
const g=new Game(fake,'tee','flag',.27,{rules:'golf-distance-v3',mode:'distance',finish_mode:'range',waypoint:{word:'middle',threshold:.265},waypoint_auto_finish:true,launch_min:.095,launch_max:.215,continuous_play:true});let post;
for(const w of ['setup','landing','next']){const hit=g.submit(w);assert.equal(hit.success,true);if(hit.waypoint_reached)post=Object.assign(Object.create(Game.prototype),g,{history:structuredClone(g.history),route:[...g.route],automatic_shots:structuredClone(g.automatic_shots)});}
assert.equal(g.won,true);const skippable=doglegAccessEvidence(fake,g.state(),post);assert.equal(skippable.removable,true);assert.equal(skippable.eligible,false);assert.equal(skippable.incoming_gain,0);assert.equal(skippable.outgoing_gain,0);

// Durable bests survive export reset and delayed, differently ordered rescoring.
const a=find('breeze'),b=structuredClone(a);b.route=[...a.route.slice(0,-1),'other',a.route.at(-1)];b.attempts=a.attempts+1;
const id=a.challenge.id,def={id,date:'2026-11-03',settings:{start:a.start,waypoint:a.waypoint,target:a.final_target}},mem=new Map(),storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
const daily=new DailyGame(storage,{holes:[def]},{today:()=>def.date});daily.visit(def.date);const h=daily.current();h.lastPlayedAt='unchanged';h.journeyId='active';h.bestStrokes={state:a,strokes:a.attempts,route:a.route,journeyId:'low',cleverness:75,scoreVersion:LEGACY_BAND_FREE_VERSION};h.bestCleverness={state:b,strokes:b.attempts,route:b.route,journeyId:'clever',score:90,unrounded:90,version:LEGACY_BAND_FREE_VERSION};
const report=(s,n)=>({route:s.route,band_free:{version:BAND_FREE_VERSION,score:Math.round(n),unrounded_score:n}});
assert.equal(daily.recordRetainedReport(a,report(a,80)),true);assert.equal(h.bestCleverness.journeyId,'clever','Do not discard the old best before it can be rescored');assert.equal(h.pendingCleverness.journeyId,'low');
assert.equal(daily.recordRetainedReport(b,report(b,92)),true);assert.equal(h.bestCleverness.journeyId,'clever');assert.equal(h.bestCleverness.score,92);assert.equal(h.pendingCleverness,undefined);assert.equal(h.bestStrokes.cleverness,80);assert.equal(h.lastPlayedAt,'unchanged');assert.equal(h.journeyId,'active');
assert.equal(new DailyGame(storage,{holes:[def]},{today:()=>def.date}).current().bestCleverness.score,92);
console.log('Dogleg strategy passed: bounded/graded quality-scaled bonus, conservative outgoing-credit deduction, ceilings/legs/one-stroke bonus preserved, idempotence, exact real incoming/outgoing controls, literal neutrality and durable-best rescoring without synthetic play.');
