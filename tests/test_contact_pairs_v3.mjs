import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {Game,restoreGame,createBrowserClient} from '../static/engine.mjs';
import {CONTACT_ADJUSTMENT_VERSION as V3,PREVIOUS_CONTACT_ADJUSTMENT_VERSION as V2,LEGACY_CONTACT_ADJUSTMENT_VERSION as V1,contactAdjustmentTerms,recognizedContactPairFlags,contactAdjustmentSettings,activeContactVersion,newContactRule,contactRuleForRetry,submittedContact,standardContactEligible} from '../static/contact-adjustments.mjs';
import {loadResearchModel,researchSettings} from '../scripts/cleverness-research-utils.mjs';
import {SPELLING_EQUIVALENCE,spellingResolver} from '../static/spelling-equivalence.mjs';
import {semanticRouteKey} from '../static/semantic-analysis.mjs';
const {e}=loadResearchModel(),resolve=spellingResolver(e).resolve;
const selection=JSON.parse(fs.readFileSync('reports/contact-pairs-v3/selection.json')),manifest=JSON.parse(fs.readFileSync('reports/contact-pairs-v3/data-manifest.json'));
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(sha('static/contact-data.mjs'),manifest.v1_sha256);assert.equal(sha('static/contact-pair-table.mjs'),manifest.v2_sha256);
assert.equal(sha('static/contact-recognized-pairs.mjs'),manifest.module_sha256);assert.equal(sha('reports/contact-pairs-v3/selection.json'),manifest.selection_sha256);
assert.equal(selection.floor,.18);assert.equal(selection.pairs.length,605);assert.equal(manifest.incoming,604);
const key=(a,b)=>[resolve(a),resolve(b)].sort().join('|'),known=new Set(selection.pairs.map(r=>key(...r.pair)));
const review=JSON.parse(fs.readFileSync('reports/word-centred-modern-associations-2026-11-28/user-review.json'));
for(const r of review.reviews){const flags=recognizedContactPairFlags(r.anchor,r.partner,e);assert.equal(!!flags,r.decision==='acceptable');}
for(const r of review.phrase_floor_reviews){const flags=recognizedContactPairFlags(...r.pair,e);assert.equal(!!flags,r.decision==='acceptable');}
let invariantChecks=0;
function fixture(a,b,target,version){const flag=['grass','stone','paper'].find(w=>![a,b,target].includes(w)),s={...researchSettings(a,target,flag),spelling_equivalence:SPELLING_EQUIVALENCE,waypoint_auto_finish:false,waypoint_rescue:{version:'fixed-destination-v1',after:0},dogleg_finish_rule:{version:'strong-arrival-v1',after:0},second_leg_finish_span:.12,contact_adjustment:{version,after:0}};return new Game(e,a,flag,.27,s);}
for(const r of selection.pairs)for(const [a,b]of [r.pair,[...r.pair].reverse()]){
 assert.equal(recognizedContactPairFlags(a,b,e),r.role==='outgoing_only'?2:3);
 const target=['computer','bank','danger','woods'].find(w=>![a,b].includes(w));
 const base=fixture(a,b,target,V2),g=fixture(a,b,target,V3),terms=g.contactTerms(b);
 if(r.role==='outgoing_only'){assert.equal(terms.contact_floor,undefined);continue;}
 assert.equal(terms.incoming,.13);assert.equal(terms.contact_floor,.18);
 const finish=g.finishRequirement(b);g._contactAdjustment=terms;const direct=g.shotResult(b);delete g._contactAdjustment;
 assert.equal(direct.launch,g.e.cosine(a,b),'Keep raw cosine');assert.equal(direct.effective_contact,Math.max(direct.launch+.13,.18));
 assert.equal(direct.required,Math.max(0,g.requirement(a,b,undefined,direct.destination).required-(terms.net-terms.incoming)),'Incoming credit exactly once');
 assert.equal(direct.connected,direct.effective_contact+1e-7>=direct.required);
 const cutoff=g.contactRequirement(a,b,undefined,direct.destination).required;assert.equal(direct.launch+1e-7>=cutoff,direct.connected,'Raw assessment cutoff matches effective contact');
 const before=base.pluralShot(b),after=g.pluralShot(b);assert.equal(after.destination,before.destination);assert.equal(after.safe,before.safe);assert.ok(!(before.success&&!after.success));assert.deepEqual(g.finishRequirement(b),finish);invariantChecks++;
}
for(const [a,b,target]of [['part','timer','clock'],['rust','free','metal'],['book','token','money'],['bot','net','computer'],['mining','wallet','token'],['farm','click','mouse']]){
 assert.equal(recognizedContactPairFlags(a,b,e),0);assert.deepEqual(contactAdjustmentTerms(e,a,b,target,7,V3),contactAdjustmentTerms(e,a,b,target,7,V2),'Excluded pairs retain ordinary v2 treatment');
}
assert.equal(contactAdjustmentTerms(e,'data','centre','computer',7,V3).contact_floor,undefined);
assert.ok(contactAdjustmentTerms(e,'answer','data','centre',7,V3).outgoing>0);
assert.equal(recognizedContactPairFlags('colour','filter',e),recognizedContactPairFlags('color','filter',e));
assert.equal(contactAdjustmentTerms(e,'bench','clamp','tight',1,V3).contact_floor,undefined,'Source-restricted research does not inherit reviewed pairs');

const examples=[['hop','kangaroo','cat',true],['bench','clamp','tight',true],['thread','reply','argument',true],['agent','reasoning','think',true],['hop','kangaroo','rabbit',false],['bot','agent','computer',true],['bot','agent','spy',false],['towel','rail','bathroom',null]];
for(const [a,b,target,expected]of examples){const g=fixture(a,b,target,V3),old=fixture(a,b,target,V2),event=g.submit(b),prior=old.submit(b);if(expected!=null)assert.equal(event.success,expected,[a,b,target].join('/'));assert.equal(event.destination,prior.destination);assert.equal(event.safe,prior.safe);if(event.success){assert.equal(g.current,b);assert.equal(g.e.cosine(g.current,target),old.e.cosine(b,target));const next=['stone','grass','paper'].find(w=>!known.has(key(b,w)));assert.equal(g.contactTerms(next).contact_floor,undefined,'No floor carried into next shot');}assert.equal(g._contactAdjustment,undefined);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());}
assert.deepEqual(submittedContact(-.05,.17,{net:.13,incoming:.13,contact_floor:.18}),{required:.17,effective_contact:.18,contact_floor:.18});
const v1={version:V1,after:1},v2={version:V2,after:3,previous:v1},mixed=newContactRule(5,v2);
assert.deepEqual(mixed,{version:V3,after:5,previous:v2});assert.deepEqual([0,1,2,3,4,5,6].map(i=>activeContactVersion(mixed,i)),[null,V1,V1,V2,V2,V3,V3]);
assert.deepEqual(contactRuleForRetry(mixed,4),{version:V3,after:4,previous:v2});assert.deepEqual(contactRuleForRetry(mixed,3),{version:V3,after:3,previous:v1});assert.deepEqual(contactRuleForRetry(mixed,1),{version:V3,after:1});assert.deepEqual(contactRuleForRetry(mixed,0),newContactRule(0));assert.deepEqual(contactRuleForRetry(mixed,6),mixed);
assert.deepEqual(contactAdjustmentSettings(mixed),mixed);assert.throws(()=>contactAdjustmentSettings({version:V2,after:3,previous:{version:V3,after:1}}),/previous/);assert.throws(()=>contactAdjustmentSettings({version:V3,after:3,previous:{version:V2,after:3}}),/previous/);
const s=researchSettings('doubtful','studio','cuff'),old=new Game(e,s.start,s.target,.27,{...s,contact_adjustment:{version:V1,after:0}});old.submit('dubious');old.contact_adjustment={version:V2,after:1,previous:old.contact_adjustment};old.submit('talent');const saved=old.state(),snapshot=structuredClone(saved);
const fetchBefore=globalThis.fetch,cacheBefore=globalThis.caches;globalThis.caches=undefined;globalThis.fetch=async url=>new Response(fs.readFileSync(new URL(url)));
try{const client=await createBrowserClient({progressive:false});await client.request('restore',{state:saved});assert.deepEqual(client.restoreRetry(saved).state,saved);await assert.rejects(client.request('submit',{word:'like'}),/Word not allowed/);await assert.rejects(client.request('submit',{word:'zzzzunsupported'}),/supported vocabulary/);assert.deepEqual(client.restoreRetry(saved).state,saved);
 const continued=await client.request('submit',{word:'skill'});assert.deepEqual(continued.state.contact_adjustment,{version:V3,after:2,previous:saved.contact_adjustment});assert.deepEqual(continued.state.history.slice(0,2),saved.history);assert.deepEqual(restoreGame(e,continued.state).state(),continued.state);const complete=restoreGame(e,continued.state);complete.submit('hand');const completeState=complete.state();assert.ok(completeState.won);assert.notEqual(semanticRouteKey(completeState),semanticRouteKey({...completeState,contact_adjustment:{version:V3,after:2}}));
 const retry=client.retryNow(continued.state,1,2).state;assert.deepEqual(retry.contact_adjustment,{version:V3,after:1,previous:{version:V1,after:0}});assert.deepEqual(retry.history,[{...saved.history[0],assumed:true}]);assert.deepEqual(restoreGame(e,retry).state(),retry);assert.deepEqual(client.retryNow(continued.state,0,2).state.contact_adjustment,newContactRule(0));assert.deepEqual(saved,snapshot);
 const fresh=await client.request('new',{...s,validate_waypoint:false});assert.deepEqual(fresh.state.contact_adjustment,newContactRule(0));
}finally{globalThis.fetch=fetchBefore;globalThis.caches=cacheBefore;}
assert.equal(standardContactEligible({...s,semantic_bunker:{}}),false);assert.equal(standardContactEligible({...s,headwind:{}}),false);assert.equal(standardContactEligible({...s,word_model:'alternate'}),false);
console.log(`V3 contact floor passed: 605 exact memberships, 604 incoming roles, ${invariantChecks} directional geometry/safety/assessment checks, raw evidence, no carry/finishing leak, exclusions and nested v1/v2/v3 replay/adoption/retries.`);
