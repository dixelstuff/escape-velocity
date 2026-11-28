import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';import{execFileSync}from 'node:child_process';
import{dailyManifest as archive}from '../static/daily-manifest.mjs';import{dailyManifest as pub}from '../static/public-manifest.mjs';import{adminHoleOrder}from '../static/admin-hole-order.mjs';
import{Game,waypointLegAccess}from '../static/engine.mjs';import{loadResearchModel}from '../scripts/cleverness-research-utils.mjs';import{spellingIdentity}from '../static/spelling-equivalence.mjs';import{requirePlayableWord}from '../static/playable-vocabulary.mjs';
const d='reports/everyday-pool-thirty/',read=f=>JSON.parse(fs.readFileSync(d+f)),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),v=read('validation.json'),o=read('ordering.json'),r=read('candidate-review.json'),pool=read('pool.json'),original=read('original-candidates.json'),ideas=read('tee-ideas.json'),fresh=read('freshness.json'),live=read('live-settings.json');
execFileSync('python3',[d+'nominate.py','--verify']);assert.equal(original.candidates.length,480);
const hash=sha(fs.readFileSync(d+'design-brief.md'));assert.equal(sha(fs.readFileSync('LEVEL_DESIGN.md')),hash);
for(const h of [pool.designSha256,original.designSha256,r.designSha256,o.generation.designSha256])assert.equal(h,hash);
assert.equal(sha(fs.readFileSync('static/contact-pair-table.mjs')),live.contactPairTableSha256);assert.equal(sha(fs.readFileSync('static/contact-recognized-pairs.mjs')),live.recognizedPairsSha256);
assert.equal(sha(JSON.stringify(archive.holes.slice(0,v.priorCount))),v.priorSha);assert.deepEqual(archive.holes.slice(v.priorCount),v.holes);
assert.equal(sha(JSON.stringify({...archive,holes:archive.holes.slice(0,v.priorCount)})),read('prior-public.json').archiveSha256);
assert.deepEqual(pub.holes.map(h=>h.id),o.finalPublicIds);assert.equal(pub.holes.length,690);assert.deepEqual(pub.holes.slice(0,660).map(h=>h.id),o.priorPublicIds);assert.deepEqual(pub.holes.slice(660),v.holes);assert.equal(pub.entryHoleId,o.priorPublicIds[0]);assert.equal(new Set(o.finalPublicIds).size,690);
assert.deepEqual(fresh.excludedHoleIds,archive.holes.slice(v.priorCount-180,v.priorCount).map(h=>h.id));
const excluded=new Set(archive.holes.slice(v.priorCount-180,v.priorCount).flatMap(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target]).map(spellingIdentity));assert.equal(excluded.size,fresh.excludedWordCount);
const accepted=r.records.filter(x=>x.acceptedPosition);assert.equal(accepted.length,30);
for(const row of r.records){assert.deepEqual(row.words,original.candidates[row.candidate-1].words);assert.ok(row.rejection||row.acceptedPosition);if(row.shots)assert.deepEqual(row.shots.map(s=>s.word),ideas[row.words[0]]);}
const{e}=loadResearchModel(),newWords=[];
for(const[i,h]of v.holes.entries()){
 const s=h.settings;assert.deepEqual([s.start,s.waypoint.word,s.target],accepted[i].words);assert.deepEqual(s.contact_adjustment,{version:'frequency-phrases-v3',after:0});assert.equal(waypointLegAccess(e,s).allowed,true);assert.deepEqual(s.golden_paths,[]);assert.equal(s.second_leg_finish_span,.12);
 newWords.push(...accepted[i].words.map(spellingIdentity));let forward=0;
 for(const shot of accepted[i].shots){const g=new Game(e,s.start,s.target,s.threshold,s);let ev;try{requirePlayableWord(shot.word);ev=g.submit(shot.word);}catch(err){assert.equal(err.message,shot.error);continue;}assert.equal(ev.success,shot.success);assert.equal(ev.destination-ev.leg_baseline,shot.progress);assert.equal(g.won,shot.won);assert.ok(!g.won);if(ev.success&&shot.progress>0)forward++;}
 assert.ok(forward>=3);
}
assert.equal(new Set(newWords).size,90);assert.ok(newWords.every(w=>!excluded.has(w)));
const keys=archive.holes.map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].map(spellingIdentity).join('|'));for(const h of v.holes)assert.equal(keys.filter(k=>k===[h.settings.start,h.settings.waypoint.word,h.settings.target].map(spellingIdentity).join('|')).length,1);
for(const h of pub.holes)assert.deepEqual(h,archive.holes.find(a=>a.id===h.id));const admin=adminHoleOrder(archive,pub);assert.deepEqual(admin.holes.slice(0,690),pub.holes);assert.equal(new Set(admin.holes.map(h=>h.id)).size,archive.holes.length);
console.log('Everyday pool batch passed: seeded nominations, v3 opening replay, fresh identities, unchanged first 660 and archive prefix; new #661–690.');
