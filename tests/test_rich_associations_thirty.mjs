import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';import {adminHoleOrder} from '../static/admin-hole-order.mjs';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';import {holeNumber} from '../static/daily-ui.mjs';import {Game,waypointLegAccess} from '../static/engine.mjs';import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';import {requirePlayableWord} from '../static/playable-vocabulary.mjs';
const dir='reports/rich-associations-thirty/',read=n=>JSON.parse(fs.readFileSync(dir+n)),v=read('validation.json'),checks=read('opening-checks.json'),ps=read('proposals.json'),{e}=loadResearchModel();
const publicCollection={version:1,view:'rich-associations-thirty-v1',entryHoleId:v.holes[0].id,holes:[...v.holes,...v.retainedPublicIds.map(id=>archive.holes.find(h=>h.id===id))]};
assert.equal(v.holes.length,30);assert.equal(publicCollection.holes.length,50);assert.deepEqual(publicCollection.holes.slice(0,30),v.holes);assert.deepEqual(publicCollection.holes.slice(30).map(h=>h.id),v.retainedPublicIds);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(archive.holes.slice(0,v.priorCount))).digest('hex'),v.priorSha);assert.deepEqual(archive.holes.slice(v.priorCount,v.priorCount+30),v.holes);
const admin=adminHoleOrder(archive,publicCollection);assert.deepEqual(admin.holes.slice(0,50),publicCollection.holes);assert.equal(new Set(admin.holes.map(h=>h.id)).size,archive.holes.length);
let advances=0;
for(const [i,h] of v.holes.entries()){
 const s=h.settings;assert.deepEqual([s.start,s.waypoint.word,s.target],ps[i].slice(0,3));assert.ok(waypointLegAccess(e,s).allowed);assert.equal(s.par,5);assert.equal(s.continuous_play,true);assert.deepEqual(s.golden_paths,[]);assert.ok(!('route'in s));
 for(const w of ps[i].slice(0,3)){requirePlayableWord(w);assert.ok(e.index.has(w));}
 let forward=0;for(const idea of checks[i].shots){const g=new Game(e,s.start,s.target,s.threshold,s);let ev;try{requirePlayableWord(idea.word);ev=g.submit(idea.word);}catch{assert.ok(idea.error);continue;}assert.equal(ev.success,idea.success);assert.equal(ev.destination-ev.leg_baseline,idea.progress);if(ev.success&&ev.destination>ev.leg_baseline)forward++;}
 assert.ok(forward>=3,`${s.start}: several familiar opening moves`);advances+=forward;
 for(const manifest of [publicCollection,admin]){const game=new DailyGame(null,manifest);assert.equal(holeNumber(game,h),'#'+(i+1));}
}
// A completed old hole survives the new numbering and remains in the current public view.
const old=publicCollection.holes[30],record={id:old.id,date:old.date,tee:old.settings.start,waypoint:old.settings.waypoint.word,flag:old.settings.target,bestStrokes:{strokes:4,route:[old.settings.start,'saved',old.settings.target]}};
const map=new Map([[DAILY_KEY,JSON.stringify({version:1,selected:old.date,holes:{[old.id]:record}})]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
const game=new DailyGame(storage,publicCollection);assert.deepEqual(game.current(),record);assert.equal(holeNumber(game,old),'#31');assert.equal(game.stats().completed,1);
console.log(`Rich associations passed: 30 new triples, ${advances} legal forward openings from 300 ordinary probes, direct-leg checks, stable archive, new batch first and earlier twenty/progress retained. No complete-route search.`);
