/** Offline editorial evidence only. No live imports, gameplay changes or intended routes. */
import fs from 'node:fs';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
import {Game} from '../static/engine.mjs';import {SPELLING_EQUIVALENCE} from '../static/spelling-equivalence.mjs';
import {loadResearchModel,researchSettings} from './cleverness-research-utils.mjs';
import {buildContextGraph,inspectWordLandscape} from './check_word_landscapes.mjs';
export const DOGLEG_CHOICE_VERSION='actual-landing-choices-v1';
export const CHOICE_LIMITS={approachDepth:5,beam:160,landingLimit:64,finishDepth:7};
export function inspectDoglegChoices(e,words,ctx,limits=CHOICE_LIMITS){
 const check=inspectWordLandscape(e,words,ctx,limits);if(!check.allowed)return {...check,choiceVersion:DOGLEG_CHOICE_VERSION};
 const [start,waypoint,target]=words,settings={...researchSettings(...words),second_leg_finish_span:.12,spelling_equivalence:SPELLING_EQUIVALENCE},options=w=>ctx.graph.get(ctx.resolve(w))??new Set();
 // Every reached lie sees the same pool. Differences cannot be attributed just to
 // giving each lie its own different set of proposed shots.
 const pool=[...new Set([target,...check.handoffs.flatMap(h=>[...options(h.landing)])])].sort();
 const profiles=check.handoffs.map(h=>{
  const make=()=>{const g=new Game(e,start,target,.27,settings);for(const w of h.inputs){if(!g.submit(w).success)throw Error('Landing prefix failed independent replay');}return g;};
  const g=make(),shots=[];if(!g.won)for(const word of pool){const probe=make();let event;try{event=probe.submit(word);}catch{}const success=!!event?.success,advances=success&&event.destination>g.baseline;
   const predecessor=probe.history.at(-1)?.word,origin=ctx.resolve(predecessor??'')===ctx.resolve(target)?probe.route.at(-2):predecessor;
   const finalSupported=!probe.won||options(origin??'').has(ctx.resolve(target));
   shots.push({word,success,advances,finishes:success&&probe.won,contextSupported:options(g.current).has(ctx.resolve(word))&&finalSupported});
  }
  let shortFinish=g.won?{inputs:[],remainingStrokes:0}:null;
  const finalSupported=probe=>{const last=probe.history.at(-1)?.word,origin=ctx.resolve(last??'')===ctx.resolve(target)?probe.route.at(-2):last;return options(origin??'').has(ctx.resolve(target));};
  for(const shot of shots.filter(s=>s.advances&&s.contextSupported)){
   const first=make();first.submit(shot.word);
   if(first.won){const evidence={inputs:[shot.word],remainingStrokes:first.route.length-g.route.length};if(!shortFinish||evidence.remainingStrokes<shortFinish.remainingStrokes)shortFinish=evidence;continue;}
   for(const word of options(first.current)){
    const second=Object.assign(Object.create(Game.prototype),first,{history:first.history.slice(),route:first.route.slice(),automatic_shots:first.automatic_shots.slice()});let hit;try{hit=second.submit(word);}catch{}
    if(hit?.success&&second.won&&finalSupported(second)){const evidence={inputs:[shot.word,word],remainingStrokes:second.route.length-g.route.length};if(!shortFinish||evidence.remainingStrokes<shortFinish.remainingStrokes)shortFinish=evidence;}
   }
  }
  return{landing:h.landing,inputs:h.inputs,flagSimilarity:g.baseline,finishedOnArrival:g.won,directFlag:shots.some(s=>s.word===target&&s.finishes),oneWordFinish:g.won||shots.some(s=>s.finishes),naturalOneWordFinish:g.won||shots.some(s=>s.finishes&&s.contextSupported),naturalOptions:shots.filter(s=>s.advances&&s.contextSupported).map(s=>s.word),shortFinish,shots};
 });
 const n=profiles.length,share=key=>n?profiles.filter(p=>p[key]).length/n:null;
 const signatures=new Set(profiles.filter(p=>!p.finishedOnArrival).map(p=>p.naturalOptions.join('|')));
 const similarities=profiles.map(p=>p.flagSimilarity),allOptions=new Set(profiles.flatMap(p=>p.naturalOptions));
 const universal=[...allOptions].filter(w=>profiles.every(p=>p.naturalOptions.includes(w)));
 return{...check,choiceVersion:DOGLEG_CHOICE_VERSION,choices:{scope:'Reached landings and shared context-word pool only; bounded, not an exhaustive solution or enjoyment prediction.',pool,landings:n,waypointFlagSimilarity:e.cosine(ctx.resolve(waypoint),ctx.resolve(target)),entryFinishShare:share('finishedOnArrival'),directFlagShare:share('directFlag'),oneWordFinishShare:share('oneWordFinish'),naturalOneWordFinishShare:share('naturalOneWordFinish'),flagSimilarityRange:n?[Math.min(...similarities),Math.max(...similarities)]:null,distinctNaturalOptionSets:signatures.size,distinctAdvancingOptionSets:new Set(profiles.map(p=>p.shots.filter(s=>s.advances).map(s=>s.word).join('|'))).size,shortFinishProbe:{maxPlayerInputs:2,exhaustive:false,found:profiles.filter(p=>p.shortFinish).length,remainingStrokeCounts:[...new Set(profiles.filter(p=>p.shortFinish).map(p=>p.shortFinish.remainingStrokes))].sort((a,b)=>a-b)},unionNaturalOptions:[...allOptions].sort(),universalNaturalOptions:universal.sort(),profiles}};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const[candidateFile,directionFile,outputFile]=process.argv.slice(2);if(!outputFile)throw Error('Usage: node scripts/check_dogleg_choices.mjs candidates.json directions.json output.json');
 const bytes=fs.readFileSync(candidateFile),directionBytes=fs.readFileSync(directionFile),{e}=loadResearchModel(),ctx=buildContextGraph(e,JSON.parse(directionBytes)),checks=[];
 for(const words of JSON.parse(bytes)){const c=inspectDoglegChoices(e,words,ctx);checks.push(c);console.log(words.join(' / '),!c.allowed?'direct-leg shortcut':`${c.openingCount} openings; ${c.choices.landings} landings; arrival ${c.choices.entryFinishShare?.toFixed(2)} / direct ${c.choices.directFlagShare?.toFixed(2)} / natural-next ${c.choices.naturalOneWordFinishShare?.toFixed(2)}; ${c.choices.distinctNaturalOptionSets} option sets; completed ${!!c.witness}`);}
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex');fs.writeFileSync(outputFile,JSON.stringify({version:DOGLEG_CHOICE_VERSION,candidatesSha256:sha(bytes),directionsSha256:sha(directionBytes),contextWords:ctx.graph.size,missing:ctx.missing,checks},null,2)+'\n');
}
