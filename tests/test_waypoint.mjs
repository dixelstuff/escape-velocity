import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,Embeddings,decodeHalf,restoreGame,createBrowserClient} from '../static/engine.mjs';
import {restartSettings,startupAction} from '../static/startup.mjs';
import {chipRange} from '../static/chip-range.mjs';
import {mapLayout} from '../static/map.mjs';
import {waypointPosition,waypointZone,waypointLandscape} from '../static/waypoint-map.mjs';
import {previousAttempts,previousWordLabels} from '../static/attempt-ghosts.mjs';
const dir=new URL('../static/model/',import.meta.url),read=f=>readFileSync(new URL(f,dir)),c=JSON.parse(read('config.json')),b=read(c.vector_fallback),e=new Embeddings(JSON.parse(read(c.words_file)),decodeHalf(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),300,new Uint8Array(read(c.hub_file)));
const holes=JSON.parse(readFileSync(new URL('../data/waypoint-holes.json',import.meta.url)));
const options=(h,attempt=1)=>({...h,finish_mode:'range',challenge:{version:'waypoint-trial-v1',par:h.par,attempt,id:'waypoint-test'}});
const fresh=(i=0,attempt=1)=>new Game(e,holes[i].start,holes[i].target,holes[i].threshold,options(holes[i],attempt));
let g=fresh();assert.equal(g.target,'library');assert.equal(g.stage,0);
assert.throws(()=>g.submit('galaxy'),/Reach LIBRARY/);assert.equal(g.history.length,0);
const reached=g.submit('books');assert.equal(reached.waypoint_reached,true);assert.equal(reached.won,false);assert.equal(reached.automatic_shot,undefined);
assert.equal(g.target,'galaxy');assert.equal(g.current,'books');assert.equal(g.stage,1);assert.equal(g.history.length,1);assert.equal(g.baseline,e.cosine('books','galaxy'));assert.equal(g.best_progress,g.baseline);
const saved=g.state();assert.deepEqual(restoreGame(e,saved).state(),saved);assert.equal(startupAction({state:saved},{}),'restore');
for(const narrow of [false,true]){
 const d=mapLayout(narrow),initial={...saved,stage:0,target:'library',history:[]};
 assert.ok(waypointZone(initial,d).includes('LAND HERE FIRST'));assert.equal(waypointZone(saved,d),'');assert.ok(waypointLandscape(saved,d).includes('url(#fairway-mown)'));
 const p=waypointPosition(saved,'books',d);g.submit('space');assert.deepEqual(waypointPosition(g.state(),'books',d),p,'earlier anchors do not move after the target switches');g=restoreGame(e,saved);
}
g.submit('space');assert.equal(g.won,true);assert.equal(g.state().attempts,3);assert.deepEqual(g.route,['penguin','books','space','galaxy']);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
g=fresh();g.submit('books');g.submit('stars');assert.equal(g.challenge_failed,true);const failed=g.state();
const restarted=restartSettings(failed,{});g=new Game(e,restarted.start,restarted.target,restarted.threshold,{...restarted,finish_mode:'range',challenge:{...failed.challenge,attempt:2}});
assert.equal(g.stage,0);assert.equal(g.current,'penguin');assert.equal(g.target,'library');assert.equal(g.history.length,0);
assert.equal(previousAttempts([{id:'failed',state:failed}],g.state(),'new').length,1,'second-leg failure remains available as previous attempt');
assert.ok(previousWordLabels(failed,mapLayout(true)).some(l=>l.word==='books'));
for(let n=1;n<=12;n++){g=fresh(0,n);assert.equal(g.challenge.attempt,n);assert.equal(g.submit('stars').success,false);assert.equal(g.challenge_failed,true);}
// Par is advisory during this individual trial: legal shots can continue beyond it.
g=fresh();g.submit('books');g.challenge.par=2;assert.equal(g.challenge_failed,false);g.submit('space');assert.equal(g.won,true);assert.equal(g.state().attempts,3);
for(const [index,route] of [[1,['paper','tree','wood','violin']],[2,['diamond','crystal']]]){
 g=fresh(index);for(const word of route)g.submit(word);assert.equal(g.won,true);assert.equal(g.state().attempts,index===1?5:3);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
}
console.log('Waypoint trial: mandatory zone, target/baseline switch, no free shot, saved replay, full resets, 12 attempts, advisory par, stable mobile/desktop anchors, and three real routes passed.');

const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{try{return new Response(readFileSync(new URL(url)));}catch{return new Response('',{status:404});}};
try{
 const client=await createBrowserClient();await client.request('new',options(holes[0]));
 const {state}=await client.request('submit',{word:'books'}),probe=restoreGame(e,state);
 assert.deepEqual(client.chipRange(state),chipRange(probe),'second-leg guide uses the final target and new baseline');
 assert.equal(client.canFinish(state),probe.finishesFrom(probe.current,state.progress));
}finally{globalThis.fetch=originalFetch;}
console.log('Waypoint browser client: final-leg chip boundary and finish check use restored leg state.');
