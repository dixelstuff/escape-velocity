/** Replay recorded random nominations, rejecting whole triples. No continuation or score search. */
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {loadResearchModel,researchSettings}from '../../scripts/cleverness-research-utils.mjs';
import {dailyManifest as archive}from '../../static/daily-manifest.mjs';
import {Game,waypointLegAccess,DOGLEG_FINISH_RULE}from '../../static/engine.mjs';
import {requirePlayableWord}from '../../static/playable-vocabulary.mjs';
import {spellingIdentity}from '../../static/spelling-equivalence.mjs';
const dir='reports/random-replacement-twenty/',read=f=>JSON.parse(fs.readFileSync(dir+f));
const pool=read('pool.json'),original=read('original-candidates.json'),editorial=read('editorial-review.json'),ideas=new Map(pool.pool.map(p=>[p.word,p.ideas])),{e}=loadResearchModel();
assert.equal(original.designSha256,crypto.createHash('sha256').update(fs.readFileSync('LEVEL_DESIGN.md')).digest('hex'));
const cached=new Map((fs.existsSync(dir+'candidate-review.json')?read('candidate-review.json').records:[]).map(r=>[r.candidate,r]));
const keys=new Set(archive.holes.map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].map(spellingIdentity).join('|'))),used=new Set(),accepted=[],records=[];
for(const candidate of original.candidates){
 if(candidate.candidate>editorial.reviewedThrough||accepted.length===20)break;
 const row={...candidate};records.push(row);
 if(editorial.rejections[candidate.candidate]){row.rejection=editorial.rejections[candidate.candidate];continue;}
 if(candidate.words.some(w=>used.has(spellingIdentity(w)))){row.rejection='Endpoint already selected in this batch';continue;}
 if(keys.has(candidate.words.map(spellingIdentity).join('|'))){row.rejection='Existing duplicate triple';continue;}
 const [tee,dogleg,flag]=candidate.words;for(const w of candidate.words){requirePlayableWord(w);assert.ok(e.index.has(w));}
 const settings={...researchSettings(tee,dogleg,flag),spelling_equivalence:'uk-us-v1',dogleg_finish_rule:{version:DOGLEG_FINISH_RULE,after:0}},access=cached.get(candidate.candidate)?.access??waypointLegAccess(e,settings);row.access=access;
 if(!access.allowed){row.rejection='Direct-leg rule: '+access.message;continue;}
 row.shots=cached.get(candidate.candidate)?.shots??ideas.get(tee).map(word=>{try{const g=new Game(e,tee,flag,.27,settings),ev=g.submit(word);return {word,success:ev.success,progress:ev.destination-ev.leg_baseline,connected:ev.connected,forward:ev.forward,waypoint:!!ev.waypoint_reached};}catch(error){return {word,error:error.message};}});
 row.forwardHits=row.shots.filter(s=>s.success&&s.progress>0).length;
 if(row.forwardHits<3){row.rejection='Restricted opening: fewer than three legal forward moves among the fixed six';continue;}
 row.acceptedPosition=accepted.length+1;accepted.push(row);for(const w of candidate.words)used.add(spellingIdentity(w));
}
fs.writeFileSync(dir+'candidate-review.json',JSON.stringify({designSha256:original.designSha256,seed:original.seed,reviewedThrough:editorial.reviewedThrough,accepted:accepted.map(r=>r.candidate),records},null,2)+'\n');
fs.writeFileSync(dir+'proposals.json',JSON.stringify(accepted.map(r=>[...r.words,ideas.get(r.words[0])]),null,2)+'\n');
console.log('Considered',records.length,'accepted',accepted.length,'next candidate',records.at(-1)?.candidate+1);
for(const row of accepted)console.log(row.candidate,row.words.join(' / '),'forward',row.forwardHits,'hits',row.shots.filter(s=>s.success&&s.progress>0).map(s=>s.word).join(','),'arrivals',row.shots.filter(s=>s.waypoint).map(s=>s.word).join(','));
console.log('Rejections',records.filter(r=>r.rejection).reduce((a,r)=>{const key=r.rejection.startsWith('Direct-leg')?'direct-leg':r.rejection.startsWith('Restricted')?'restricted':r.rejection==='Endpoint already selected in this batch'?'repetition':'editorial';a[key]=(a[key]??0)+1;return a;},{}));
