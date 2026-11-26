/** Release validation against private local exports; commits only compact cases. */
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {Game,restoreGame} from '../static/engine.mjs';
import {newContactRule,LEGACY_CONTACT_ADJUSTMENT_VERSION} from '../static/contact-adjustments.mjs';
import {loadResearchModel} from './cleverness-research-utils.mjs';
const research=process.argv[2];if(!research)throw Error('Pass the local additional-contact-pairs research directory.');
const source=JSON.parse(fs.readFileSync(path.join(research,'unplayed-audit/sample.json'))).source_files;
const expected=new Map(JSON.parse(fs.readFileSync(path.join(research,'pruned-packet/new-hit-review.json'))).rows.map(r=>[r.id,r]));
const {e,config}=loadResearchModel(),seen=new Set(),cases=[];let observations=0,newHits=0,lostHits=0,changedSuccessfulFinish=0,changedSuccessfulArrival=0;
const stable=x=>Array.isArray(x)?x.map(stable):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,stable(x[k])])):x;
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function compare(a,b,label){
 for(const k of ['success','won','origin','stage','waypoint_reached','scoring_word','contact_word','destination_word'])assert.equal(a[k]??null,b[k]??null,label+' '+k);
 for(const k of ['launch','required','destination'])assert.ok(Math.abs((a[k]??0)-(b[k]??0))<1e-6,label+' '+k);
}
const publicSettings=state=>{
 const out=structuredClone(state);
 for(const k of ['current','history','route','won','progress','best_progress','attempts','automatic_shots','resumed_from','abandoned','challenge_failed'])delete out[k];
 out.history=[];
 if(out.challenge)out.challenge={...out.challenge,id:'contact-pairs-v2-fixture'};
 return out;
};
for(const file of source)for(const j of JSON.parse(fs.readFileSync(file)).play?.journeys??[]){
 const s=j.state;if(!s?.waypoint||s.rules!=='golf-distance-v3'||s.dogleg_finish_rule?.version!=='strong-arrival-v1'||s.semantic_bunker||s.headwind||(s.word_model??'current')!=='current'||(s.challenge?.par??5)!==5)continue;
 const g=new Game(e,s.start,s.final_target,s.final_threshold,s),prefix=[];
 for(const h of s.history){
  const before=g.state(),mechanical=structuredClone(before);delete mechanical.resumed_from;delete mechanical.abandoned;
  if(mechanical.challenge){delete mechanical.challenge.id;delete mechanical.challenge.attempt;}for(const p of mechanical.history)delete p.assumed;
  const id=sha(JSON.stringify(stable({state:mechanical,word:h.word})));
  const actual=g.submit(h.word);compare(actual,h,'frozen historical replay');observations++;
  if(!seen.has(id)){
   seen.add(id);
   const v1=restoreGame(e,before);v1.contact_adjustment=before.contact_adjustment??{version:LEGACY_CONTACT_ADJUSTMENT_VERSION,after:v1.history.length};const old=v1.submit(h.word);
   const v2=restoreGame(e,before);v2.contact_adjustment=newContactRule(v2.history.length,v2.contact_adjustment);const revised=v2.submit(h.word);
   assert.ok(Math.abs(old.destination-revised.destination)<1e-7,'Destinations remain fixed');
   newHits+=!old.success&&revised.success;lostHits+=old.success&&!revised.success;
   if(old.success&&revised.success){changedSuccessfulFinish+=old.won!==revised.won;changedSuccessfulArrival+=!!old.waypoint_reached!==!!revised.waypoint_reached;}
   if(expected.has(id)){
    const wanted=expected.get(id);compare(old,wanted.baseline,'reviewed v1');compare(revised,wanted.adjusted,'reviewed v2');
    assert.deepEqual(restoreGame(e,v2.state()).state(),v2.state(),'Mixed-version replay');
    cases.push({id:wanted.reviewId,settings:publicSettings(before),prefix:[...prefix],word:h.word,legacy:old,revised});
   }
  }
  prefix.push(h.word);
 }
}
assert.equal(seen.size,7288);assert.equal(newHits,101);assert.equal(lostHits,0);assert.equal(changedSuccessfulFinish,0);assert.equal(changedSuccessfulArrival,0);assert.equal(cases.length,101);
cases.sort((a,b)=>a.id.localeCompare(b.id));fs.mkdirSync('tests/fixtures',{recursive:true});
fs.writeFileSync('tests/fixtures/contact-pairs-v2.json',JSON.stringify({scope:'Reviewed single-shot counterfactuals. Anonymous mechanical settings and word prefixes only; no source export files or player IDs.',model_sha256:config.vector_sha256,cases},null,2)+'\n');
const result={observations,distinctContexts:seen.size,reviewedCases:cases.length,newHits,lostHits,changedSuccessfulFinish,changedSuccessfulArrival,historicalReplayMismatches:0,destinationMismatches:0,
 model_sha256:config.vector_sha256,source_count:source.length,source_sha256:source.map(f=>sha(fs.readFileSync(f))),fixture_sha256:sha(fs.readFileSync('tests/fixtures/contact-pairs-v2.json'))};
fs.writeFileSync('reports/contact-pairs-v2/replay-verification.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({...result,source_sha256:undefined},null,2));
