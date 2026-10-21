import assert from 'node:assert/strict';
import {Game,restoreGame} from '../static/engine.mjs';
import {successTitle} from '../static/success-mode.mjs';
import {FlightLog,journeyText} from '../static/flight-log.mjs';
const values=new Map(Object.entries({'tee,hole':0,'tee,step':.4,'step,hole':.1,'tee,bridge':.4,'step,bridge':.4,'bridge,hole':.2,'tee,miss':0,'step,miss':0,'miss,hole':.01}));
const e={index:new Map(['tee','hole','step','bridge','miss'].map((w,i)=>[w,i])),cosine(a,b){return a===b?1:values.get(`${a},${b}`)??values.get(`${b},${a}`)??0;},hub(){return 0;}};
const settings={mode:'distance',launch_min:.095,launch_max:.215,finish_mode:'range',challenge:{version:'par-challenge-v1',par:3,attempt:2,id:'run-1'}};
const fresh=(extra={})=>new Game(e,'tee','hole',.27,{...settings,...extra});
let g=fresh();assert.equal(g.submit('bridge').won,true);assert.equal(g.state().attempts,2);assert.equal(successTitle(g.state()),'Success! Birdie on attempt 2');assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
g=fresh();assert.equal(g.submit('step').won,false);assert.equal(g.challenge_failed,false);g.submit('bridge');assert.equal(g.state().attempts,3);assert.equal(successTitle(g.state()),'Success! Par on attempt 2');
g=fresh();g.submit('miss');g.submit('step');assert.equal(g.challenge_failed,true);assert.equal(g.won,false);assert.equal(g.state().attempts,2);assert.throws(()=>g.submit('bridge'),/Par is out of reach/);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};let seq=0;const log=new FlightLog(storage,undefined,()=>String(++seq));
let first=fresh();log.begin(first.state(),'test');for(const word of ['miss','step']){const event=first.submit(word);log.record(word,first.state(),event);}const failedId=log.active.id;
g=fresh({challenge:{...settings.challenge,attempt:3}});log.begin(g.state(),'test');const event=g.submit('bridge');log.record('bridge',g.state(),event);
assert.equal(log.data.journeys[0].id,failedId);assert.equal(log.data.journeys[0].challenge_result,'failed');assert.equal(log.active.challenge_result,'success');assert.equal(log.active.state.challenge.attempt,3);assert.equal(log.active.state.challenge.id,log.data.journeys[0].state.challenge.id);assert.match(journeyText(log.active),/Success! Birdie on attempt 3/);assert.match(journeyText(log.data.journeys[0]),/Par is out of reach/);
// Four-shot budgets remain available for later courses; ordinary rounds stay unlimited.
g=fresh({challenge:{...settings.challenge,par:4}});g.submit('miss');g.submit('step');assert.equal(g.challenge_failed,false);g.submit('bridge');assert.equal(g.state().attempts,4);assert.ok(g.won);
g=fresh({challenge:undefined});for(let i=0;i<5;i++)g.submit('miss');g.submit('bridge');assert.equal(g.state().attempts,7);assert.equal(successTitle(g.state()),'Holed in 7 shots!');assert.ok(!('challenge' in g.state()));
assert.throws(()=>fresh({challenge:{...settings.challenge,attempt:0}}),/Invalid Success/);
// If a direct final stroke is possible, choosing an indirect finish cannot exceed par.
values.set('tee,hole',.3);g=fresh({challenge:{...settings.challenge,par:2}});g.submit('miss');assert.equal(g.challenge_failed,false);g.submit('bridge');assert.equal(g.won,false);assert.equal(g.challenge_failed,true);assert.equal(g.state().attempts,2);assert.equal(g.automatic_shots.length,0);
console.log('Success mode: par/birdie, automatic stroke budget, early failure, replay, attempts, complete scorecard history and legacy rounds passed.');
// Version 2 ends on the first miss/penalty, without changing historical v1 replays.
values.set('tee,hole',0);
const v2={...settings.challenge,version:'par-challenge-v2',par:5};
g=fresh({challenge:v2});const miss=g.submit('miss');assert.equal(miss.outcome,'miss');assert.equal(g.challenge_failed,true);assert.equal(g.state().attempts,1);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());assert.throws(()=>g.submit('bridge'),/Attempt over/);
values.set('step,miss',.4);values.set('miss,hole',-.1);
g=fresh({challenge:v2});g.submit('step');assert.equal(g.challenge_failed,false);assert.equal(g.submit('miss').outcome,'water');assert.equal(g.challenge_failed,true);assert.equal(g.current,'step');assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
g=fresh({challenge:v2});assert.throws(()=>g.submit('unknown'),/No shot used/);assert.throws(()=>g.submit('tee'),/No shot used/);assert.equal(g.challenge_failed,false);assert.equal(g.state().attempts,0);g.submit('bridge');assert.ok(g.won);assert.equal(g.challenge_failed,false);
console.log('Immediate-retry rules: first miss, water penalty, unknown/current-word exceptions and deterministic versioned replay passed.');
