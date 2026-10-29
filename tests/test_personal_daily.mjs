import assert from 'node:assert/strict';
import {FlightLog} from '../static/flight-log.mjs';
import {DailyGame,DAILY_KEY,dayUTC,addDay} from '../static/daily-game.mjs';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {successSettings,parUnreachable} from '../static/success-mode.mjs';
import {challengeAttemptLimit,retryPrefix,exhausted,STROKE_PLAY} from '../static/stroke-play.mjs';
const data=new Map([['escape-velocity.flight-log.v1','untouched legacy data']]),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)},now=()=> '2026-10-28T12:00:00Z';
let today='2026-10-28';const game=new DailyGame(storage,dailyManifest,{today:()=>today,now});
assert.ok(dailyManifest.holes.length>=100);assert.equal(new Set(dailyManifest.holes.map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].join('|'))).size,dailyManifest.holes.length);
for(const [i,h]of dailyManifest.holes.entries()){assert.equal(h.date,addDay(dailyManifest.epoch,i));assert.equal(h.settings.par,5);assert.ok(h.settings.waypoint);assert.deepEqual(h.settings.golden_paths,[]);assert.equal(h.settings.continuous_play,true);}
assert.equal(game.latest().date,today);assert.equal(dayUTC(new Date('2026-10-29T00:30:00+11:00')),'2026-10-28');assert.ok(game.available().filter(h=>h.date>today).length>=50);assert.equal(game.definition(addDay(today,50)).date,addDay(today,50));assert.equal(game.definition(dailyManifest.holes.at(-1).date).id,dailyManifest.holes.at(-1).id);
const def=game.visit(today),challenge=successSettings({version:STROKE_PLAY,par:5,attempt:1000,id:def.id,unlimited:true});assert.equal(challenge.unlimited,true);assert.equal(challengeAttemptLimit(challenge),Infinity);
assert.equal(exhausted({challenge,won:true}),false);assert.equal(retryPrefix({challenge,history:[]},0,1001).challenge.attempt,1001);
assert.equal(parUnreachable({challenge,won:false,continuous_play:true,history:Array.from({length:50},()=>({outcome:'landed'}))}),false);
assert.equal(parUnreachable({challenge,won:false,continuous_play:true,history:[{outcome:'miss'}]}),true);
function journey(id,strokes,score,at='2026-10-28T12:01:00Z'){return {id,updatedAt:at,state:{challenge,won:true,start:def.settings.start,waypoint:def.settings.waypoint,final_target:def.settings.target,attempts:strokes,route:['tee',id,'flag']},cleverness_playtest:score===null?null:{band_free:{version:'band-free-harmonic-v5-cubic70-slope2',score:Math.round(score),unrounded_score:score}}};}
game.record(journey('quick',3,76));game.record(journey('clever',4,91.1));game.record(journey('later-tie',3,91.2));
assert.equal(game.current().bestStrokes.journeyId,'later-tie');assert.equal(game.current().bestCleverness.journeyId,'later-tie');assert.equal(game.current().bestCleverness.unrounded,91.2);
game.record(journey('meander',12,30));assert.equal(game.current().bestStrokes.strokes,3);assert.equal(game.stats().completed,1);assert.equal(game.stats().counts.Eagle,1);
const before=game.current().lastPlayedAt,latest=game.current().journeyId;game.recordReport(journey('late-analysis',5,95,'2026-10-27T00:00:00Z'));assert.equal(game.current().journeyId,latest);assert.equal(game.current().lastPlayedAt,before);assert.equal(game.current().bestCleverness.score,95);assert.equal(game.stats().averageBestCleverness,95);assert.equal(game.stats().clevernessByResult.Eagle,91);assert.equal(game.stats().clevernessByResult.Birdie,null);
const restored=new DailyGame(storage,dailyManifest,{today:()=>today,now});assert.deepEqual(restored.data,game.data);assert.equal(data.get('escape-velocity.flight-log.v1'),'untouched legacy data');
// A long route is recorded exactly, not capped at double bogey; unfinished holes have no score.
const older=game.visit('2026-10-27'),long=journey('long',12,15);long.state.challenge={...challenge,id:older.id};game.record(long);assert.equal(game.current().bestStrokes.strokes,12);assert.equal(game.stats().counts['Double bogey+'],1);
const unfinished=game.visit('2026-10-26');assert.equal(game.current().bestStrokes,undefined);assert.equal(game.stats().completed,2);
// Recent history limits the view, not retained records; repeat visits never add a second row.
today='2026-11-05';for(const h of dailyManifest.holes.slice(0,12))game.visit(h.date);assert.equal(game.recent().length,9);assert.ok(Object.keys(game.data.holes).length>=12);game.visit(unfinished.date);assert.equal(game.recent().filter(h=>h.id===unfinished.id).length,1);
assert.ok(data.has(DAILY_KEY));console.log('Personal daily tests passed: fixed UTC archive, all waypoint Par 5, future-preview access, unlimited strokes/retries, independent raw-score bests, delayed report isolation, persistence, nine distinct rows, uncapped scores and once-per-hole stats.');

const logMemory=new Map(),logStorage={getItem:k=>logMemory.get(k)??null,setItem:(k,v)=>logMemory.set(k,v)},log=new FlightLog(logStorage,now,()=> 'long-export');
log.begin(long.state,'Current');log.record('flag',long.state,{success:true,won:true,origin:'approach',word:'flag'});
assert.equal(log.active.scored_strokes,12);assert.equal(log.active.maximum_strokes,null);assert.equal(log.active.attempt_limit,null);assert.equal(log.active.score_to_par,7);
const failed=structuredClone(long.state);failed.won=false;failed.challenge_failed=true;log.record('miss',failed,{outcome:'miss',success:false});assert.equal(log.active.scored_strokes,null);
console.log('Personal export records actual strokes beyond seven; failed/unfinished attempts receive no default score.');

const own=game.addCustom({...def.settings,start:'rabbit',waypoint:{...def.settings.waypoint,word:'computing'},target:'bakery'});
assert.equal(game.addCustom(own.settings).id,own.id);assert.equal(game.data.customHoles.length,1);game.visit(own.date);
const ownJourney=journey('own',4,82);ownJourney.state.challenge={...challenge,id:own.id};ownJourney.state.start='rabbit';ownJourney.state.waypoint=own.settings.waypoint;ownJourney.state.final_target='bakery';game.record(ownJourney);
assert.equal(game.current().bestStrokes.strokes,4);assert.equal(game.current().bestCleverness.score,82);
const customReload=new DailyGame(storage,dailyManifest,{today:()=>today,now});assert.equal(customReload.selected().id,own.id);assert.equal(customReload.current().bestStrokes.strokes,4);
console.log('Full future-schedule access and saved custom-hole bests survive refresh.');
