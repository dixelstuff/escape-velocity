/** Append fixed word-first proposals; diagnostic routes never enter live settings. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {addDay} from '../static/daily-game.mjs';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {spellingIdentity} from '../static/spelling-equivalence.mjs';
import {isRetiredHole} from '../static/hole-retirement.mjs';
import {loadResearchModel} from './cleverness-research-utils.mjs';

const dir='reports/open-landscapes-30-v2/',batch='open-landscapes-30-v2-2026-11-03';
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=fs.readFileSync(dir+'proposals.json'),ps=JSON.parse(bytes),safety=JSON.parse(fs.readFileSync(dir+'safety.json'));
assert.equal(ps.length,30);
assert.equal(safety.proposalsSha256,sha(bytes));
assert.ok(!dailyManifest.holes.some(h=>h.settings.course_set===batch),'Batch already published');
const {e}=loadResearchModel(),oldCount=dailyManifest.holes.length,oldSha=sha(JSON.stringify(dailyManifest.holes));
const firstDate=addDay(dailyManifest.holes.at(-1).date,1),firstNumber=dailyManifest.holes.filter(h=>!isRetiredHole(h)).length+1;
const keys=new Set(dailyManifest.holes.map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].map(spellingIdentity).join('|')));
const added=ps.map((p,i)=>{
 const words=[p.start,p.waypoint,p.target],key=words.map(spellingIdentity).join('|');
 assert.ok(!keys.has(key),'Duplicate triple');keys.add(key);
 assert.ok(!('route' in p)&&!('verificationWords' in p));
 const date=addDay(firstDate,i),settings={...dailyManifest.holes.at(-1).settings,start:p.start,target:p.target,waypoint:{word:p.waypoint,threshold:.265,turn:i%2?'down':'up'},par:5,course_set:batch,course_number:i+1,golden_paths:[]};
 assert.equal(waypointLegAccess(e,settings).allowed,true);
 const c=safety.checks[i];assert.deepEqual(c.words,words);assert.ok(c.witness);
 const g=new Game(e,p.start,p.target,.27,settings);
 for(const word of c.witness.inputs){assert.equal(g.won,false);assert.equal(g.submit(word).success,true);}
 assert.equal(g.won,true);assert.deepEqual(g.route,c.witness.state.route);
 const h={id:'daily-'+date,date,settings};assert.equal(isRetiredHole(h),false);return h;
});
const next={...dailyManifest,holes:[...dailyManifest.holes,...added]};
assert.equal(sha(JSON.stringify(next.holes.slice(0,oldCount))),oldSha);
fs.writeFileSync(dir+'validation.json',JSON.stringify({batch,oldCount,oldSha,proposalsSha256:sha(bytes),firstDate,lastDate:added.at(-1).date,firstNumber,lastNumber:firstNumber+29,holes:added},null,2)+'\n');
fs.writeFileSync('static/daily-manifest.mjs','/** Fixed one-per-day archive; published dates never depend on player progress. */\nexport const dailyManifest='+JSON.stringify(next)+';\n');
console.log(`Appended #${firstNumber}–#${firstNumber+29}; preserved all ${oldCount} existing definitions.`);
