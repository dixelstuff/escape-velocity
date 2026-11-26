import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';
import {dailyManifest as pub} from '../static/public-manifest.mjs';



import {adminHoleOrder} from '../static/admin-hole-order.mjs';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
import {spellingIdentity} from '../static/spelling-equivalence.mjs';
import {requirePlayableWord} from '../static/playable-vocabulary.mjs';
const dir='reports/top160-and-thirty/',read=f=>JSON.parse(fs.readFileSync(dir+f)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const c=read('curation.json'),v=read('validation.json'),o=read('ordering.json'),pool=read('pool.json'),original=read('original-candidates.json'),review=read('candidate-review.json'),ideas=read('tee-ideas.json'),checks=read('opening-checks.json'),proposals=read('proposals.json');

execFileSync('python3',[dir+'nominate.py','--verify']);
const hash=sha(fs.readFileSync(dir+'design-brief.md'));
for(const h of [pool.designSha256,original.designSha256,review.designSha256,o.generation.designSha256])assert.equal(h,hash);

assert.equal(original.candidates.length,420);
assert.deepEqual(original.candidates.slice(0,360),read('initial-candidates.json').candidates);
assert.equal(sha(fs.readFileSync('LEVEL_DESIGN.md')),hash);
assert.equal(sha(fs.readFileSync('static/contact-data.mjs')),read('live-settings.json').contactDataSha256);
const accepted=review.records.filter(x=>x.acceptedPosition);
assert.equal(accepted.length,30);
for(const row of review.records){assert.deepEqual(row.words,original.candidates[row.candidate-1].words);assert.ok(row.rejection||row.acceptedPosition);if(row.shots)assert.deepEqual(row.shots.map(s=>s.word),ideas[row.words[0]]);}
assert.equal(pub.view,'top160-thirty-v1');
assert.deepEqual(pub.holes.map(h=>h.id),o.finalPublicIds);
assert.equal(pub.holes.length,639);
assert.equal(new Set(o.finalPublicIds).size,639);
assert.deepEqual(pub.holes.slice(0,609).map(h=>h.id),c.retainedIds);
assert.deepEqual(pub.holes.slice(609),v.holes);
assert.deepEqual(o.newRange,[610,639]);
assert.deepEqual(pub.holes.slice(0,4).map(h=>h.id),c.priorPublicIds.slice(0,4));
assert.equal(pub.entryHoleId,c.priorPublicIds[0]);
assert.equal(c.promotedIds.length,24);
assert.equal(c.withdrawnPublicIds.length,2);
const ratings=new Map(c.feedback.map(f=>[f.hole_id,Number(f.enjoyment)]));
assert.ok(c.promotedIds.every(id=>ratings.get(id)>=4));
assert.deepEqual(c.promotedIds.map(id=>o.finalPublicIds.indexOf(id)+1),c.promotionPositions);
assert.ok(c.promotionPositions.every(n=>n>=5&&n<=160));
assert.deepEqual(c.withdrawnPublicIds,['daily-2030-03-19','daily-2030-03-21']);
assert.ok(c.withdrawnPublicIds.every(id=>ratings.get(id)<=2&&!o.finalPublicIds.includes(id)));
assert.ok(c.protectedPriorFeaturedIds.every(id=>o.finalPublicIds.includes(id)&&o.finalPublicIds.indexOf(id)<201));
assert.ok(o.finalPublicIds.indexOf('daily-2029-02-02')>=35);
const removed=new Set([...c.promotedIds,...c.withdrawnPublicIds,...c.coreIds]);
assert.deepEqual(c.retainedIds.slice(160),c.priorPublicIds.filter(id=>!removed.has(id)));
assert.equal(sha(JSON.stringify(archive.holes.slice(0,v.priorCount))),v.priorSha);
assert.equal(sha(JSON.stringify({...archive,holes:archive.holes.slice(0,v.priorCount)})),c.archiveSha256);
assert.deepEqual(archive.holes.slice(v.priorCount,v.priorCount+30),v.holes);
const admin=adminHoleOrder(archive,pub);
assert.deepEqual(admin.holes.slice(0,639),pub.holes);
assert.equal(new Set(admin.holes.map(h=>h.id)).size,archive.holes.length);
for(const id of c.withdrawnPublicIds)assert.ok(admin.holes.slice(639).some(h=>h.id===id));
for(const h of pub.holes)assert.deepEqual(h,archive.holes.find(a=>a.id===h.id));
const fresh=read('freshness.json'),oldWords=new Set(archive.holes.filter(h=>fresh.excludedHoleIds.includes(h.id)).flatMap(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target]).map(spellingIdentity));
assert.equal(oldWords.size,fresh.excludedWordCount);
const newWords=v.holes.flatMap(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target]).map(spellingIdentity);
assert.equal(new Set(newWords).size,90);
assert.ok(newWords.every(w=>!oldWords.has(w)));
const {e}=loadResearchModel();let hits=0;
for(const [i,h]of v.holes.entries()){
 const s=h.settings;assert.deepEqual(s.contact_adjustment,{version:'frequency-phrases-v1',after:0});assert.deepEqual([s.start,s.waypoint.word,s.target],accepted[i].words);assert.deepEqual(proposals[i],[...accepted[i].words,ideas[s.start]]);
 assert.equal(waypointLegAccess(e,s).allowed,true);assert.equal(s.par,5);assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.deepEqual(s.golden_paths,[]);
 assert.deepEqual(checks[i].shots,accepted[i].shots);let count=0;
 for(const shot of checks[i].shots){const g=new Game(e,s.start,s.target,s.threshold,s);let ev;try{requirePlayableWord(shot.word);ev=g.submit(shot.word);}catch(error){assert.equal(error.message,shot.error);continue;}assert.equal(ev.success,shot.success);assert.equal(ev.destination-ev.leg_baseline,shot.progress);if(ev.success&&shot.progress>0)count++;}
 assert.ok(count>=3);hits+=count;
}
const ids=[pub.entryHoleId,...c.promotedIds,...c.withdrawnPublicIds],records=Object.fromEntries(ids.map(id=>{const h=archive.holes.find(x=>x.id===id);return[id,{id,date:h.date,tee:h.settings.start,waypoint:h.settings.waypoint.word,flag:h.settings.target,bestStrokes:{strokes:4,route:[h.settings.start,'saved-word',h.settings.target]}}]}));
const memory=new Map([[DAILY_KEY,JSON.stringify({version:1,selected:records[ids[0]].date,holes:records})]]),store={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},game=new DailyGame(store,pub);assert.deepEqual(game.data.holes,records);game.save();assert.deepEqual(new DailyGame(store,admin).data.holes,records);
console.log(`Top 160 batch passed: 24 promotions, two withdrawals, new #610–639, ${hits}/180 forward probes; stable archive and saved progress.`);
