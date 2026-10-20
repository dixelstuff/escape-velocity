import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Embeddings,Game,decodeHalf,restoreGame} from '../static/engine.mjs';
import {SkillAnalyser,skillHistoryKey,skillScore,SKILL_VERSION,validSkillReport} from '../static/skill.mjs';
import {FlightLog,journeyText} from '../static/flight-log.mjs';
// A controlled connection graph isolates near misses and useful versus harmful returns.
function graph(strongForward=false){
 const words=['tee','flag','approach','near','far',...Array.from({length:8},(_,i)=>'green'+i)];
 const values=new Map(),set=(a,b,v)=>{values.set([a,b].sort().join(','),v);};
 set('tee','flag',0);set('approach','flag',.06);set('tee','approach',.6);
 for(const w of ['near','far']){set(w,'flag',.65);set('tee',w,w==='near'?.20:.01);}
 for(const w of words.filter(w=>w.startsWith('green'))){set(w,'flag',.65);set('tee',w,.5);set('approach',w,strongForward?.5:0);}
 const e={words,index:new Map(words.map((w,i)=>[w,i])),cosine(a,b){return a===b?1:values.get([a,b].sort().join(','))??0;}};
 const analyser=new SkillAnalyser(e);analyser.row=w=>Float64Array.from(words.map(v=>e.cosine(w,v)));
 return {e,analyser,game:()=>new Game(e,'tee','flag',.6,{mode:'distance'})};
}
let {e,analyser,game}=graph();let g=game();g.submit('near');let near=analyser.analyse(g.state());
g=game();g.submit('far');let far=analyser.analyse(g.state());assert.ok(near.score>far.score);assert.ok(near.shots[0].contact_shortfall<far.shots[0].contact_shortfall);
g=game();g.submit('approach');g.submit('tee');let useful=analyser.analyse(g.state()).shots[1];assert.ok(useful.setup_change>0);assert.equal(useful.loop_loss,0);assert.ok(useful.good_moves_after>useful.good_moves_before);
({e,analyser,game}=graph(true));g=game();g.submit('approach');g.submit('tee');let harmful=analyser.analyse(g.state()).shots[1];assert.ok(harmful.setup_change<0);assert.ok(harmful.loss>useful.loss);assert.equal(harmful.loop_loss,.05);
let previous=1000;for(let i=0;i<3;i++){g.submit('approach');g.submit('tee');const result=analyser.analyse(g.state());assert.ok(result.score<=previous);previous=result.score;assert.ok(result.shots.every(s=>s.score>=0&&s.score<=1000));}
g=game();g.submit('green0');const green=analyser.analyse(g.state());assert.equal(green.shots.length,1);assert.equal(g.state().attempts,2);assert.equal(green.score,1000);assert.equal(green.version,SKILL_VERSION);assert.equal(green.history_key,skillHistoryKey(g.state()));
assert.equal(validSkillReport({...green,model_sha:'test'},g.state(),'test'),true);
assert.equal(validSkillReport({...green,model_sha:'test',shots:[{}]},g.state(),'test'),false);
assert.equal(validSkillReport({...green,model_sha:'other'},g.state(),'test'),false);
const storageData=new Map(),storage={getItem:k=>storageData.get(k),setItem:(k,v)=>storageData.set(k,v)};
const log=new FlightLog(storage,()=>new Date(0).toISOString(),()=> 'round');log.begin(g.state(),'test');assert.equal(log.recordSkill('round',green),true);assert.equal(log.recordSkill('round',{...green,history_key:'wrong'}),false);assert.equal(new FlightLog(storage).active.skill.score,1000);assert.equal(JSON.parse(log.exportJSON()).journeys[0].skill.shots.length,1);assert.match(journeyText(log.active),/Experimental skill: 1000\/1000/);
// Fresh batches exclude old assessments; stale worker results cannot attach to a new round.
log.makeId=()=> 'new-round';const fresh=game().state();log.reset(fresh,'test');
assert.equal(log.recordSkill('round',green),false);assert.equal(JSON.parse(log.exportJSON()).journeys.some(j=>j.skill),false);
log.restorePrevious();assert.equal(log.data.journeys.find(j=>j.id==='round').skill.score,1000);assert.equal(log.active.id,'new-round');
assert.equal(skillScore(0),1000);assert.ok(skillScore(1)>skillScore(2));
const config=JSON.parse(readFileSync(new URL('../static/model/config.json',import.meta.url)));
const words=JSON.parse(readFileSync(new URL('../static/model/'+config.words_file,import.meta.url)));
const buf=gunzipSync(readFileSync(new URL('../static/model/'+config.vector_file,import.meta.url)));
e=new Embeddings(words,decodeHalf(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)),config.dimensions);analyser=new SkillAnalyser(e);
const settings={mode:'distance',launch_min:.10,launch_max:.21};
g=new Game(e,'morph','lineage',.28,settings);g.submit('evolve');g.submit('generation');g.submit('lineage');const before=JSON.stringify(g.state()),longer=analyser.analyse(g.state());assert.equal(JSON.stringify(g.state()),before);
g=new Game(e,'morph','lineage',.28,settings);g.submit('evolved');const shortcut=analyser.analyse(g.state());assert.ok(shortcut.score>longer.score);assert.equal(shortcut.shots.length,1);
console.log(`Real vectors: EVOLVE route ${longer.score}; EVOLVED green ${shortcut.score}.`);
// Independently check reported onward-option counts with real Game submissions.
g=new Game(e,'morph','lineage',.28,settings);g.submit('evolve');const saved=g.state();let count=0;
for(const word of words){if(word===saved.current)continue;const trial=restoreGame(e,saved),event=trial.submit(word);if(event.success&&event.destination>saved.progress+1e-7)count++;}
assert.equal(longer.shots[0].good_moves_after,count);
for(let i=0;i<longer.shots.length;i++){
 const prefix=new Game(e,'morph','lineage',.28,settings);for(const word of ['evolve','generation','lineage'].slice(0,i))prefix.submit(word);
 for(const a of longer.shots[i].alternatives){const trial=restoreGame(e,prefix.state()),event=trial.submit(a.word);assert.equal(event.success,true);assert.ok(Math.abs(event.launch-a.contact)<1e-7);assert.ok(Math.abs(event.required-a.required)<1e-7);}
}
assert.throws(()=>analyser.analyse({...saved,rules:'golf-distance-v1'}),/current course rules/);
assert.deepEqual(analyser.analyse(saved),analyser.analyse(saved),'cache must not change assessments');
console.log('Skill passed: near-miss severity, useful/harmful backtracks, loop resistance, automatic-finish exclusion, immutability, persistence/export, real-vector route comparison, exhaustive onward-option parity and legal alternatives.');

// The reported SCOLD case: no duplicate charge for the same underlying mistake.
const scold=()=>new Game(e,'scold','mime',.28,settings);
function scoldRoute(extraMisses=0){const r=scold();for(let i=0;i<extraMisses;i++)r.submit('emotion');for(const w of ['emotion','communicate','express','expressive'])r.submit(w);return r;}
const five=scoldRoute(),fiveState=JSON.stringify(five.state()),fiveScore=analyser.analyse(five.state());
assert.equal(five.state().attempts,5);assert.equal(fiveScore.score,396);assert.equal(JSON.stringify(five.state()),fiveState);
for(const shot of fiveScore.shots){const contactLoss=Math.max(0,Math.min(1,(shot.required-shot.contact)/shot.required));assert.ok(Math.abs(shot.loss-(Math.max(contactLoss,shot.direction_loss,shot.choice_gap,shot.setup_loss)+shot.loop_loss))<1e-10);}
assert.ok(fiveScore.shots[1].choice_score>70,'a setup opening a legal finish must get meaningful credit');
const twenty=analyser.analyse(scoldRoute(15).state()),thirty=analyser.analyse(scoldRoute(25).state());assert.ok(fiveScore.score>twenty.score);assert.ok(twenty.score>thirty.score);
assert.ok(skillScore(100)<50,'there must be no artificial minimum');assert.equal(skillScore(1),500);assert.equal(skillScore(2),333);
assert.equal(validSkillReport({...fiveScore,version:'vector-skill-v1',model_sha:'test'},five.state(),'test'),false,'v1 caches must be recalculated');
console.log(`Skill v2 calibration passed: 5-shot SCOLD route ${fiveScore.score}; controlled 20-shot retry ${twenty.score}; 30-shot retry ${thirty.score}; no floor and no gameplay changes.`);
