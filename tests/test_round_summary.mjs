import assert from 'node:assert/strict';
import {Game} from '../static/engine.mjs';
import {failedShotSummary,mapWordAction} from '../static/round-summary.mjs';
import {FlightLog,journeyText} from '../static/flight-log.mjs';
const words=['double','boats','carrot','kayak','yacht','mast'];
const scores=new Map(Object.entries({'double,mast':.05,'boats,mast':.15,'double,boats':.01,'carrot,mast':-.1,'double,carrot':.6,'kayak,mast':.18,'double,kayak':.6,'yacht,mast':.24,'kayak,yacht':.6}));
const e={index:new Map(words.map(w=>[w,0])),cosine(a,b){return a===b?1:scores.get(`${a},${b}`)??scores.get(`${b},${a}`)??0;}};
const game=new Game(e,'double','mast',.27,{mode:'distance'});
const storage=new Map(),log=new FlightLog({getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)});
log.begin(game.state(),'test');
assert.equal(mapWordAction(game.state(),'mast'),'fill');
for(const word of ['boats','carrot','kayak','yacht','mast']){
 const event=game.submit(word);log.record(word,game.state(),event);
 if(word==='carrot')assert.equal(mapWordAction(game.state(),'mast'),'fill','misses and water do not leave the tee');
 if(word==='kayak')assert.equal(mapWordAction(game.state(),'mast'),'hit');
}
const state=game.state(),before=JSON.stringify(state);
assert.equal(state.attempts,5);assert.equal(state.won,true);
assert.deepEqual(state.route,['double','kayak','yacht','mast']);
assert.equal(failedShotSummary(state),'Miss hits: boats · Penalty hits: carrot');
assert.ok(journeyText(log.active).includes('Miss hits: boats · Penalty hits: carrot'));
assert.equal(JSON.stringify(state),before,'summary does not alter strokes/history');
assert.equal(mapWordAction(state,'mast'),'none');
assert.equal(mapWordAction({...state,won:false},'mast',true),'none');
assert.equal(mapWordAction({...state,won:false,current:'kayak'},'double'),'fill');
assert.equal(mapWordAction({...state,won:false,current:'double'},'mast'),'fill','a return to tee restores the fill-only action');
assert.equal(failedShotSummary({history:[{word:'boats',outcome:'miss'},{word:'boats',outcome:'miss'},{word:'ghost',success:false}]}),'Miss hits: boats, boats');
assert.equal(failedShotSummary({history:[]}), '');
console.log('Round summary passed: five counted shots, successful route, miss/water breakdown, copied result, tee/lie/finished/busy label actions.');
