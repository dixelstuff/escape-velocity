import assert from 'node:assert/strict';
import {FlightLog} from '../static/flight-log.mjs';
import {Game} from '../static/engine.mjs';
import {SkillAnalyser,linkStrength,connectionRegret,validSkillReport} from '../static/skill.mjs';
const words=['tee','flag','weak','strong','unbalanced','balanced','small','strongsetup'];
const values=new Map(),set=(a,b,v)=>values.set([a,b].sort().join(','),v);
set('tee','flag',0);
for(const [w,contact,destination] of [['weak',.22,.23],['strong',.6,.6],['unbalanced',.8,.22],['balanced',.5,.5],['small',.15,.03],['strongsetup',.7,.03]]){set('tee',w,contact);set(w,'flag',destination);}
set('small','strong',.5);set('strongsetup','strong',.5);
const e={words,index:new Map(words.map((w,i)=>[w,i])),cosine(a,b){return a===b?1:values.get([a,b].sort().join(','))??0;}};
const analyser=new SkillAnalyser(e);analyser.row=w=>Float64Array.from(words.map(v=>e.cosine(w,v)));
const settings={mode:'distance',rules:'golf-distance-v3',finish_mode:'range',launch_min:.1,launch_max:.2,challenge:{version:'par-challenge-v2',par:3,id:'connections',attempt:1}};
function route(path,attempt=1){const g=new Game(e,'tee','flag',.6,{...settings,challenge:{...settings.challenge,attempt}});for(const w of path)assert.ok(g.submit(w).success);return {g,r:analyser.analyse(g.state())};}
const strong=route(['strong']),weak=route(['weak']),balanced=route(['balanced']),unbalanced=route(['unbalanced']);
assert.ok(strong.r.score>balanced.r.score&&balanced.r.score>unbalanced.r.score&&unbalanced.r.score>weak.r.score,'passing bridges must still distinguish both link strengths');
assert.equal(strong.r.score,1000);assert.equal(strong.r.shots.length,1,'automatic finish adds no scored decision');
assert.ok(linkStrength(.5,.5,true)>linkStrength(.8,.22,true),'one large link must not hide a much weaker other link');
// Remove direct finishes so both small moves genuinely open a useful next shot.
for(const w of ['weak','strong','unbalanced','balanced'])set('tee',w,0);analyser.rows.clear();
const small=route(['small','strong']),strongsetup=route(['strongsetup','strong']);
assert.equal(small.r.shots[0].connection_loss,0,'small setup is protected even with weaker contact');
assert.equal(strongsetup.r.shots[0].connection_loss,0);
assert.equal(small.r.score,strongsetup.r.score,'equally useful small setups receive equal scores');
assert.ok(small.r.shots[0].setup_change>0);
assert.equal(route(['small','strong'],9).r.score,small.r.score,'attempt count does not affect final path');
const before=JSON.stringify(small.g.state());analyser.analyse(small.g.state());assert.equal(JSON.stringify(small.g.state()),before);
assert.equal(validSkillReport({...small.r,model_sha:'test'},small.g.state(),'test'),true);
const broken=structuredClone(small.r);delete broken.shots[0].connection_loss;assert.equal(validSkillReport({...broken,model_sha:'test'},small.g.state(),'test'),false);
assert.equal(connectionRegret(.4,[.2,.3]).connection_loss,0);
console.log(`Skill connection tests passed: strong ${strong.r.score}, balanced ${balanced.r.score}, unbalanced ${unbalanced.r.score}, marginal ${weak.r.score}; useful weak-contact small setup ${small.r.score} equals strong-contact setup ${strongsetup.r.score}.`);

const storage=new Map(),log=new FlightLog({getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},()=>new Date(0).toISOString(),()=> 'success');
log.begin(small.g.state(),'test','test');assert.equal(log.recordSkill('success',{...small.r,model_sha:'test'}),true,'new success key must persist');
assert.equal(validSkillReport(new FlightLog({getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}).active.skill,small.g.state(),'test'),true,'reload accepts the saved success report');
