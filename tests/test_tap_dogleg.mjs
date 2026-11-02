import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,canPlayDogleg} from '../static/engine.mjs';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {waypointTargetLie,waypointRetryDisplay} from '../static/attempt-ghosts.mjs';
import {loadResearchModel,researchSettings} from '../scripts/cleverness-research-utils.mjs';

const {e}=loadResearchModel(),settings={...researchSettings('leak','trust','brave'),spelling_equivalence:'uk-us-v1',second_leg_finish_span:.12};
const game=new Game(e,'leak','brave',.27,settings);
assert.equal(canPlayDogleg(game),false,'The tee is not highlighted merely because the target can be named');
assert.equal(game.submit('roof').success,true);assert.equal(game.submit('shelter').success,true);
const before=game.state(),history=game.history,route=game.route,automatic=game.automatic_shots;
for(let i=0;i<3;i++)assert.equal(canPlayDogleg(game),true);
assert.deepEqual(game.state(),before,'Repeated availability checks cannot spend strokes, change targets or alter history');
assert.equal(game.history,history);assert.equal(game.route,route);assert.equal(game.automatic_shots,automatic);
const actual=game.submit('trust');assert.equal(actual.success,true);assert.equal(actual.waypoint_reached,true);
assert.equal(game.stage,1);assert.equal(game.history.length,before.history.length+1);
assert.equal(canPlayDogleg(game),false,'Only first-leg target shots are offered');
const retry=new Game(e,'leak','brave',.27,settings);
retry.submit('roof');retry.submit('shelter');
assert.equal(canPlayDogleg(retry),true,'The earlier lie could genuinely play the target again');
assert.equal(waypointTargetLie(retry.state(),game.state()).attempt,3,'But the played target identifies the existing lie to return to');
assert.deepEqual(waypointRetryDisplay(retry.state(),game.history.at(-1),false,true),{showTarget:true,reference:false,occupied:false},'Returning to that first leg restores the zone even outside text entry');
assert.equal(retry.history.length,2);assert.equal(game.history.length,3,'Selecting a remembered lie cannot add a shot to either route');
assert.equal(canPlayDogleg(Object.assign(Object.create(Game.prototype),game,{stage:0,won:true})),false);
assert.equal(canPlayDogleg(Object.assign(Object.create(Game.prototype),game,{stage:0,challenge_failed:true})),false);
assert.equal(canPlayDogleg(null),false);
assert.equal(canPlayDogleg(new Game(e,'leak','brave',.27,{...settings,waypoint:undefined})),false);

// Across independently selected real hole prefixes, the hint must match actual
// submission, including rescue rules, target switching and automatic finishes.
const checks=JSON.parse(fs.readFileSync('reports/open-landscapes-30/safety.json'));let tested=0,available=0,unavailable=0;
for(const c of checks.checks){
 const def=dailyManifest.holes.find(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].join('|')===c.words.join('|'));
 const g=new Game(e,def.settings.start,def.settings.target,.27,def.settings);
 for(const word of c.witness.inputs){
  const saved=g.state(),probe=Object.assign(Object.create(Game.prototype),g,{history:g.history.slice(),route:g.route.slice(),automatic_shots:g.automatic_shots.slice()});
  let event;try{if(g.stage===0&&!g.won&&!g.challenge_failed)event=probe.submit(g.waypoint.word);}catch{}
  const expected=!!(event?.success&&event.waypoint_reached);
  assert.equal(canPlayDogleg(g),expected,c.words.join(' / ')+' from '+g.current);
  assert.deepEqual(g.state(),saved);tested++;if(expected)available++;else unavailable++;
  assert.equal(g.submit(word).success,true);
 }
}
assert.ok(available>0&&unavailable>0);
console.log(`Tap dogleg passed: ${tested} real prefixes match authoritative submissions (${available} available, ${unavailable} unavailable); probes are read-only, stage/finish/failure guards and one-shot target transition verified.`);
