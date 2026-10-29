import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Game,restoreGame,createBrowserClient,SECOND_LEG_FINISH_SPAN} from '../static/engine.mjs';
import {chipRange} from '../static/chip-range.mjs';
import {semanticRouteKey} from '../static/semantic-analysis.mjs';
import {replayCompleted} from '../static/vector-cleverness/evidence.mjs';
import {loadResearchModel,researchSettings} from '../scripts/cleverness-research-utils.mjs';
const {e}=loadResearchModel();
const settings=researchSettings('golf','panic','barbecue');
function game(span=SECOND_LEG_FINISH_SPAN,s=settings){return new Game(e,s.start,s.target,s.threshold,{...s,second_leg_finish_span:span});}
function prefix(g,words){for(const w of words){assert.equal(g.won,false);assert.equal(g.submit(w).success,true);}return g;}
const fresh=new Game(e,'golf','barbecue',.27,settings);assert.equal(fresh.second_leg_finish_span,.12);
const old=prefix(game(0),['trees','fire']),current=prefix(game(),['trees','fire']);
assert.equal(current.won,false,'FIRE must not newly finish on dogleg entry');assert.equal(current.baseline,old.baseline);
assert.equal(current.finishesFrom('fire'),old.finishesFrom('fire'));assert.deepEqual(current.finishRequirement('fire'),old.finishRequirement('fire'),'Current dogleg lie uses its unchanged entry finish');
const before=current.state();assert.equal(before.second_leg_finish_span,.12);
const restored=restoreGame(e,JSON.parse(JSON.stringify(before)));assert.deepEqual(restored.state(),before);
const actual=current.submit('park'),legacy=old.submit('park');
assert.equal(actual.success,true);assert.equal(legacy.success,true);assert.equal(actual.won,true);assert.equal(legacy.won,false);assert.equal(actual.required,legacy.required);assert.equal(actual.launch,legacy.launch);assert.equal(actual.destination,legacy.destination);assert.equal(actual.scoring_word,undefined);
assert.deepEqual(current.route,['golf','trees','fire','park','barbecue']);assert.equal(current.state().attempts,4);assert.ok(actual.automatic_shot.required<old.requirement('park','barbecue',legacy.destination,1).required);
assert.equal(actual.automatic_shot.required,current.finishRequirement('park').required);assert.ok(actual.automatic_shot.launch>=actual.automatic_shot.required);assert.equal(actual.automatic_shot.outcome,'chip');
assert.equal(restored.submit('park').won,true);assert.deepEqual(restoreGame(e,current.state()).state(),current.state());assert.deepEqual(replayCompleted(e,current.state()).game.route,current.route);
// Older records without a flag keep old rules and remain valid in standalone analysis.
const unversioned=game(0);prefix(unversioned,['trees','fire']);const oldSave=unversioned.state();delete oldSave.second_leg_finish_span;
const oldRestored=restoreGame(e,oldSave);assert.equal(oldRestored.second_leg_finish_span,0);assert.equal(oldRestored.submit('park').won,false);
const completedOld=prefix(game(0),['trees','fire','burn']).state();delete completedOld.second_leg_finish_span;assert.deepEqual(replayCompleted(e,completedOld).game.route,completedOld.route);
// Starting a fresh try from ordinary hole settings adopts the new default.
assert.equal(game().second_leg_finish_span,.12);assert.throws(()=>game(.11),/Unknown second-leg finish/);
// Long second legs are identical, including the already successful CRASH→PARK finish.
const distant=prefix(game(),['drive','crash']),distantOld=prefix(game(0),['drive','crash']);assert.deepEqual(distant.submit('park'),distantOld.submit('park'));
// Protect CREAM and existing immediate dogleg finishes.
const cucumber=researchSettings('cucumber','cosmetics','iceberg'),cream=game(.12,cucumber),creamOld=game(0,cucumber);
assert.deepEqual(cream.submit('cream'),creamOld.submit('cream'));assert.equal(cream.won,false);assert.equal(cream.submit('lettuce').won,true);assert.equal(cream.state().attempts,3);assert.deepEqual(cream.route,['cucumber','cream','lettuce','iceberg']);
const beeSettings=researchSettings('bee','politics','radio'),bee=game(.12,beeSettings),beeOld=game(0,beeSettings);prefix(bee,['worker']);prefix(beeOld,['worker']);assert.deepEqual(bee.submit('leader'),beeOld.submit('leader'),'Already-earned dogleg-entry finishes remain identical');assert.equal(bee.won,true);
// A future candidate can match the previous entry's credited family word.
const credited=prefix(game(),['trees','fire']);credited.history.at(-1).scoring_word='park';assert.equal(credited.submit('park').won,true,'A subsequent candidate must not be mistaken for the entry finish');
// The chip-in guide predicts the subsequent-shot finish, not the entry check or normal contact.
const guide=chipRange(prefix(game(),['trees','fire'])),oldGuide=chipRange(prefix(game(0),['trees','fire']));assert.ok(guide.first<oldGuide.first);assert.ok(e.cosine('park','barbecue')>=guide.first);assert.ok(e.cosine('park','barbecue')<oldGuide.first);
const noMutation=JSON.stringify(before);chipRange(restoreGame(e,before));assert.equal(JSON.stringify(before),noMutation);
// Ordinary flag shots have the original contact requirement, even though auto finishes are eased.
const normal=prefix(game(),['trees','fire']),normalOld=prefix(game(0),['trees','fire']);assert.deepEqual(normal.requirement('fire','barbecue'),normalOld.requirement('fire','barbecue'));
for(const mode of ['fixed','distance']){const s={...settings,mode,rules:mode==='fixed'?'golf-fixed-v3':'golf-distance-v2'},g=new Game(e,'golf','barbecue',.27,{...s,second_leg_finish_span:.12});g.stage=1;g.target='barbecue';g.threshold=.27;g.baseline=.18;assert.deepEqual(g.finishRequirement('park'),g.requirement('park','barbecue',e.cosine('park','barbecue'),1),'Fixed/older modes unchanged');}
// Saved rule identity isolates semantic caches without changing cleverness coefficients.
assert.notEqual(semanticRouteKey(current.state()),semanticRouteKey({...current.state(),second_leg_finish_span:0}));
console.log('Short second-leg finish passed: FIRE/PARK, unchanged CREAM/LETTUCE, ordinary contact, entry checks, long legs, guide, current/legacy restores, saved metadata and standalone scoring replay.');

// The real browser retry path adopts the new rule only beyond an old assumed prefix.
const originalFetch=globalThis.fetch;globalThis.fetch=async url=>{try{return new Response(fs.readFileSync(new URL(url)));}catch{return new Response('',{status:404});}};
try{
 const client=await createBrowserClient({progressive:false}),source=prefix(game(0),['trees','fire','park']).state(),snapshot=JSON.stringify(source);
 const fromFire=client.retryNow(source,2,2).state;assert.equal(fromFire.current,'fire');assert.equal(fromFire.won,false);assert.equal(fromFire.second_leg_finish_span,.12);assert.equal(fromFire.second_leg_finish_after,2);assert.equal((await client.request('submit',{word:'park'})).event.won,true);
 const fromPark=client.retryNow(source,3,2).state;assert.equal(fromPark.current,'park');assert.equal(fromPark.won,false,'An old assumed PARK shot must not retroactively finish');assert.equal(fromPark.second_leg_finish_after,3);assert.deepEqual(restoreGame(e,fromPark).state(),fromPark);
 const backAgain=client.retryNow(fromPark,2,3).state;assert.equal(backAgain.second_leg_finish_after,2);assert.equal((await client.request('submit',{word:'park'})).event.won,true);
 const tee=client.retryNow(source,0,2).state;assert.equal(tee.second_leg_finish_span,.12);assert.equal(tee.second_leg_finish_after,0);assert.equal(tee.current,'golf');assert.equal(JSON.stringify(source),snapshot,'Old stored history stays intact');
}finally{globalThis.fetch=originalFetch;}
console.log('Browser retries passed: old lies adopt the relaxation on the next played shot, assumed prefixes remain intact, backtracking selections and tee retries preserve versioned restores.');
