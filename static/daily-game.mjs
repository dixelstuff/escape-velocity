import {BAND_FREE_VERSION} from './cleverness-score-config.mjs?v=opportunity08-bonus2-v1';
/** Personal daily archive. No attempt budgets, submission state or scoring formulas. */
export const DAILY_KEY='word-golf.personal-daily.v1';
export const dayUTC=(date=new Date())=>date.toISOString().slice(0,10);
export const addDay=(day,n)=>new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
export function golfResult(strokes){const diff=strokes-5;return diff<=-3?'Albatross':diff===-2?'Eagle':diff===-1?'Birdie':diff===0?'Par':diff===1?'Bogey':diff===2?'Double bogey':`${diff} over par`;}
export class DailyGame{
 constructor(storage,manifest,{today=()=>dayUTC(),now=()=>new Date().toISOString()}={}){
  this.storage=storage;this.manifest=manifest;this.today=today;this.now=now;this.warning='';this.data={version:1,selected:null,holes:{}};
  try{const raw=storage?.getItem(DAILY_KEY);if(raw){const saved=JSON.parse(raw);if(saved.version!==1||!saved.holes||typeof saved.holes!=='object'||Array.isArray(saved.holes))throw Error('Invalid daily history');this.data=saved;}}
  catch(error){this.saveError=error.name+': '+error.message;this.warning='Saved daily progress could not be read. Export your play data before closing this page.';this.unreadable=true;}
 }
 published(){return this.manifest.holes.filter(h=>h.date<=this.today());}
 available(){return this.manifest.holes.concat(this.data.customHoles??[]);}
 definition(day){return this.available().find(h=>h.date===day);}
 addCustom(settings){const key='custom-'+[settings.start,settings.waypoint.word,settings.target].map(encodeURIComponent).join('~');this.data.customHoles??=[];let def=this.data.customHoles.find(h=>h.id===key);if(!def){def={id:key,date:key,custom:true,settings:{...settings,par:5,continuous_play:true,golden_paths:[]}};this.data.customHoles.push(def);this.save();}return def;}
 latest(){return this.published().at(-1);}
 selected(){return this.definition(this.data.selected)??this.latest();}
 save(){try{if(!this.storage||this.unreadable)throw Error();this.storage.setItem(DAILY_KEY,JSON.stringify(this.data));this.warning='';this.saveError='';}catch(error){this.saveError=error.name+': '+error.message;this.warning=error.code==='STALE_PLAY_BATCH'?error.message:error.name==='QuotaExceededError'?'Device storage is full. Export your play data before closing this page.':'Progress could not be saved on this device. Export your play data before closing this page.';}}
 visit(day){const def=this.definition(day);if(!def)throw Error('That daily hole is not available.');this.data.selected=day;const h=this.data.holes[def.id]??={id:def.id,date:def.date,tee:def.settings.start,waypoint:def.settings.waypoint.word,flag:def.settings.target};h.lastPlayedAt=this.now();this.save();return def;}
 record(journey){const s=journey?.state,def=this.available().find(h=>h.id===s?.challenge?.id);if(!def||!s.challenge.unlimited||!s.waypoint)return;
  const h=this.data.holes[def.id]??={id:def.id,date:def.date,tee:s.start,waypoint:s.waypoint.word,flag:s.final_target??s.target};h.journeyId=journey.id;
  if(h.updatedAt!==journey.updatedAt){h.updatedAt=journey.updatedAt;h.lastPlayedAt=journey.updatedAt;}
  if(s.won){h.completedAt=journey.updatedAt;const candidate={journeyId:journey.id,strokes:s.attempts,route:[...s.route],attempt:s.challenge.attempt,completedAt:journey.updatedAt,...(journey.cleverness_playtest?.band_free?.version===BAND_FREE_VERSION&&Number.isFinite(journey.cleverness_playtest.band_free.unrounded_score)?{cleverness:journey.cleverness_playtest.band_free.unrounded_score}:{})};if(!h.bestStrokes||candidate.strokes<h.bestStrokes.strokes||candidate.strokes===h.bestStrokes.strokes&&(candidate.cleverness??-1)>(h.bestStrokes.cleverness??-1))h.bestStrokes=candidate;
   const report=journey.cleverness_playtest,score=report?.band_free;
   if(score?.version===BAND_FREE_VERSION&&Number.isFinite(score.unrounded_score)&&(!h.bestCleverness||h.bestCleverness.version!==BAND_FREE_VERSION||score.unrounded_score>h.bestCleverness.unrounded))h.bestCleverness={...candidate,score:score.score,unrounded:score.unrounded_score,version:score.version};
  }this.save();
 }
 recordReport(journey){const selected=this.data.selected,h=this.data.holes[journey?.state?.challenge?.id],latest=h?.journeyId,at=h?.lastPlayedAt,updated=h?.updatedAt,completedAt=h?.completedAt;this.record(journey);if(h){h.journeyId=latest;h.lastPlayedAt=at;h.updatedAt=updated;h.completedAt=completedAt;}this.data.selected=selected;this.save();}
 refreshCompletedAt(journeys){
  let changed=false;
  for(const h of Object.values(this.data.holes))if(h.bestStrokes&&!h.completedAt){const dates=journeys.filter(j=>j.state?.won&&j.state.challenge?.id===h.id).map(j=>j.updatedAt).sort();if(dates.length){h.completedAt=dates.at(-1);changed=true;}}
  if(changed)this.save();
 }
 refreshClevernessBests(journeys){
  let changed=false;
  for(const h of Object.values(this.data.holes)){
   const quality=j=>j.cleverness_playtest?.band_free?.version===BAND_FREE_VERSION&&Number.isFinite(j.cleverness_playtest.band_free.unrounded_score)?j.cleverness_playtest.band_free.unrounded_score:-1;
   const strokeRoutes=journeys.filter(j=>j.state?.won&&j.state.challenge?.id===h.id).sort((a,b)=>a.state.attempts-b.state.attempts||quality(b)-quality(a)||String(a.updatedAt).localeCompare(String(b.updatedAt)));
   const stroke=strokeRoutes[0];
   if(stroke&&(!h.bestStrokes||stroke.state.attempts<h.bestStrokes.strokes||stroke.state.attempts===h.bestStrokes.strokes&&quality(stroke)>=(h.bestStrokes.cleverness??-1))){const best={journeyId:stroke.id,strokes:stroke.state.attempts,route:[...stroke.state.route],attempt:stroke.state.challenge.attempt,completedAt:stroke.updatedAt,...(quality(stroke)>=0?{cleverness:quality(stroke)}:{})};if(JSON.stringify(h.bestStrokes)!==JSON.stringify(best)){h.bestStrokes=best;changed=true;}}
   const candidates=journeys.filter(j=>j.state?.won&&j.state.challenge?.id===h.id&&j.cleverness_playtest?.band_free?.version===BAND_FREE_VERSION&&Number.isFinite(j.cleverness_playtest.band_free.unrounded_score));
   candidates.sort((a,b)=>b.cleverness_playtest.band_free.unrounded_score-a.cleverness_playtest.band_free.unrounded_score);
   const j=candidates[0],score=j?.cleverness_playtest.band_free,best=j?{journeyId:j.id,strokes:j.state.attempts,route:[...j.state.route],attempt:j.state.challenge.attempt,score:score.score,unrounded:score.unrounded_score,version:score.version}:null;
   if(best&&(!h.bestCleverness||h.bestCleverness.version!==BAND_FREE_VERSION||best.unrounded>=h.bestCleverness.unrounded)&&JSON.stringify(h.bestCleverness)!==JSON.stringify(best)){h.bestCleverness=best;changed=true;}
  }if(changed)this.save();
 }
 current(){return this.data.holes[this.selected()?.id];}
 recent(){return Object.values(this.data.holes).sort((a,b)=>String(b.lastPlayedAt).localeCompare(String(a.lastPlayedAt))||b.date.localeCompare(a.date)).slice(0,9);}
 stats(){
  const completed=Object.values(this.data.holes).filter(h=>h.bestStrokes),counts={Eagle:0,Birdie:0,Par:0,Bogey:0,'Double bogey+':0};
  const group=h=>{const s=h.bestStrokes.strokes;return s<=3?'Eagle':s===4?'Birdie':s===5?'Par':s===6?'Bogey':'Double bogey+';};
  for(const h of completed)counts[group(h)]++;
  const clever=completed.filter(h=>h.bestCleverness);
  // Result averages use the route that earned that stroke result, not a longer route's score.
  const routeScore=h=>Number.isFinite(h.bestStrokes.cleverness)?h.bestStrokes.cleverness:h.bestCleverness?.journeyId===h.bestStrokes.journeyId?h.bestCleverness?.unrounded??h.bestCleverness?.score:null;
  const clevernessByResult=Object.fromEntries(Object.keys(counts).map(name=>{const scores=completed.filter(h=>group(h)===name).map(routeScore).filter(Number.isFinite);return [name,scores.length?Math.round(scores.reduce((sum,n)=>sum+n,0)/scores.length):null];}));
  return {completed:completed.length,counts,clevernessByResult,averageBestCleverness:clever.length?Math.round(clever.reduce((n,h)=>n+h.bestCleverness.score,0)/clever.length):null};
 }
}
