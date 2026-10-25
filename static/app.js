import {completedCourseLift,completedCardOverlap,holePanelHeight,resultContext} from './result-presentation.mjs?v=golf-v175';
import {SCORING_CLOSED,PRACTICE_MODE,scoringReminder,currentStrokeText} from './scoring-status.mjs?v=golf-v175';
import {createViewportDiagnostics} from './viewport-diagnostics.mjs?v=golf-v175';
import {bestHoleResult} from './practice-scorecard.mjs?v=golf-v175';
import {treeOverlapsControls} from './control-trees.mjs?v=golf-v175';
import {holeAttemptLog,remainingHoleAttempts} from './hole-attempt-log.mjs?v=golf-v175';
import {wordLieKey,currentLieKey} from './word-lies.mjs?v=golf-v175';
import {collectSavedHoles} from './saved-holes.mjs?v=golf-v175';
import {STROKE_PLAY,attemptLimit as baseAttemptLimit,maximumStrokes,isStrokePlay,exhausted,retryLieThrough,returnsToOriginalLie} from './stroke-play.mjs?v=golf-v175';
import {waypointLayout,waypointLake,waypointAnchors,waypointPosition,waypointLandscape,waypointGreen,waypointZone,waypointChipGuide} from './waypoint-map.mjs?v=golf-v175';
import {CourseRounds,bestAttempt,postedAttempt,attemptResult,roundTotal,scoreText,resultText} from './course-round.mjs?v=golf-v175';
import {typingCourseWidth,stableTypingViewport,shouldReturnHoleHeader,keyboardLayoutVisible,keyboardRestingHeight} from './typing-layout.mjs?v=golf-v175';
import {courseSurrounds,courseTrees,par3PathArt,courseBunkers,courseLake,courseArtDefs,approachLandscape,courseContinuation} from './course-art.mjs?v=golf-v175';
import { pinPlacement, greenPath, greenContains, courseStyle, lakeGeometry } from './course-appearance.mjs?v=golf-v175';
import { shotMotion, shotTrail, automaticFinishMotion } from './shot-motion.mjs?v=golf-v175';
import { hubWarningText } from './hub-warning.mjs?v=golf-v175';
import { createBrowserClient } from './engine.mjs?v=golf-v175';
import { mapLayout, par3CentreTrace, projectX, projectPoint, chipArcBands, visibleAttempts, layoutLabels } from './map.mjs?v=golf-v175';
import { startupAction, restartSettings, bankRestartSettings } from './startup.mjs?v=golf-v175';
import { FlightLog, outcome, journeyText } from './flight-log.mjs?v=golf-v175';
import { bridgeKey, openingGreenShots } from './bridge-feedback.mjs?v=golf-v175';
import {previousAttempts,previousWordLabels,showPreviousLabels,waypointRetryDisplay} from './attempt-ghosts.mjs?v=golf-v175';
import {attemptNotice,usefulForwardMiss,entryNotice,shortSecondShot} from './play-feedback.mjs?v=golf-v175';
import {nearestWordTarget} from './word-taps.mjs?v=golf-v175';
const $=id=>document.getElementById(id);
const rollingParams=new URLSearchParams(location.search),rollingMode=rollingParams.get('mode')==='rolling';
const rollingTestDay=rollingParams.get('date'),rollingSimulation=rollingMode&&/^\d{4}-\d{2}-\d{2}$/.test(rollingTestDay??'')&&Number.isFinite(Date.parse(rollingTestDay+'T00:00:00Z'));
const [{RollingCourse,scopedStorage,utcDay,holeBest,endedAttempts},{rollingManifest},{mountRollingUI}]=rollingMode?await Promise.all([import('./rolling-course.mjs?v=golf-v175'),import('./rolling-manifest.mjs?v=golf-v175'),import('./rolling-ui.mjs?v=golf-v175')]):[{},{},{}];
let rollingUI;
function attemptLimit(par){return rollingMode&&rounds?.hole?rounds.hole.allowance:baseAttemptLimit(par);}
const windKey=p=>JSON.stringify(p.headwind??null);
const holeLabel=p=>`${p.start} → ${p.waypoint?p.waypoint.word+' → ':''}${p.final_target??p.target}${p.word_model==='ls15-v1'?' · LS 15%':p.word_model?' · ABTT 1':''}${p.headwind?` · ${p.headwind.word.toUpperCase()} headwind`:''}`;
let config,state,client,busy=false,shownEvent=null,noticeDismissed=false,bridgeViewVersion=0;
let reviewingSubmittedHole=false,justHoled=false;
const viewportDiagnostics=createViewportDiagnostics();
let entryDiagnosticUntil=0;
function recordEntryDiagnostic(type){
 const viewport=window.visualViewport;
 viewportDiagnostics.record(type,{time:Math.round(performance.now()),focused:document.activeElement?.id??'',typing:document.body.classList.contains('typing'),scrollY:Math.round(scrollY),innerHeight,restingHeight:typingRestHeight,viewportHeight:viewport?.height??innerHeight,viewportTop:viewport?.offsetTop??0,scale:viewport?.scale??1});
}
let typingScroll=0,typingMaxWidth=0,typingFitFrame=0,restoreEntryScroll=true,typingRestHeight=keyboardRestingHeight(window.visualViewport,innerHeight);
let retryTimer,activeNotice='',retryPreview=null,restoring=false,committingRetry=false,changingRetry=false;
const modelConfig=s=>config?.word_models?.[s?.word_model]??config;
const modelHash=s=>modelConfig(s)?.score_sha256??modelConfig(s)?.vector_sha256;
const modelName=s=>modelConfig(s)?.model;
const savedHolesKey='word-golf.saved-holes.v1';
function refreshSavedHoles(){
 if(!config)return;
 let stored=[];try{stored=JSON.parse(storage?.getItem(savedHolesKey)||'[]');}catch{}
 const saved=collectSavedHoles(stored,[...(flightLog.backup?.journeys??[]),...flightLog.data.journeys],config.puzzles,config.retired_waypoint_holes);
 config.puzzles=config.puzzles.filter(h=>!h.saved_custom).concat(saved);
 try{storage?.setItem(savedHolesKey,JSON.stringify(saved));}catch{}
 const old=document.querySelector('#puzzle optgroup[data-saved-holes]');old?.remove();
 if(saved.length){const group=document.createElement('optgroup');group.label='Your saved holes';group.dataset.savedHoles='true';group.innerHTML=config.puzzles.map((h,i)=>h.saved_custom?`<option value="${i}">${esc(holeLabel(h))}</option>`:'').join('');$('puzzle').prepend(group);}
}
function courseSettings(p,profile=state?.word_model??''){
 const par=p.par??(p.waypoint?5:3),golden=config?.golden_holes?.find(h=>h.start===p.start&&h.target===(p.final_target??p.target)&&h.waypoint===p.waypoint?.word);
 return {...p,par,word_model:'',golden_paths:par<=4?(golden?.paths??p.golden_paths??[]):[]};
}
let storage;try{storage=window.localStorage;}catch{}
if(rollingMode)storage=scopedStorage(storage,rollingSimulation?'word-golf.rolling-sim.':'word-golf.rolling-live.');
let showChipRange=false;
$('show-chip-range').checked=showChipRange;
$('chip-range-note').hidden=!showChipRange||!!state?.waypoint&&state.stage===0;
$('show-chip-range').addEventListener('change',()=>{showChipRange=$('show-chip-range').checked;$('chip-range-note').hidden=!showChipRange||!!state?.waypoint&&state.stage===0;if(state)map();});
const flightLog=new FlightLog(storage);
const rounds=rollingMode?new RollingCourse(storage,rollingManifest,rollingSimulation?rollingTestDay:utcDay(Date.now())):new CourseRounds(storage);
const inCourse=()=>rounds.belongs(state);
const courseExhausted=()=>exhausted(state);
const practising=()=>!!state?.challenge?.practice;
const holeResult=()=>state?.won||rollingMode&&inCourse()&&!rounds.playable(state)||inCourse()&&rounds.hole.locked&&!practising()&&!retryPreview;
const courseResult=()=>inCourse()&&(holeResult()||rounds.active.finished&&!practising());
const roundSummary=()=>inCourse()&&rounds.active.finished&&!reviewingSubmittedHole;
function leaveCourse(){rounds.data.activeId=null;rounds.save();$('round-scorecard').hidden=true;}
function courseInputLocks(){
 if(rollingMode){if(inCourse()&&!rounds.playable(state)){$('word').disabled=true;$('launch').disabled=true;}return;}
 $('submit-scorecard').disabled=!rounds.canSubmit();
 if(!inCourse()||rounds.active.finished)return;
 for(const id of ['word-model','puzzle','new-game','custom-start','custom-waypoint','custom-target','custom-par','lab-start','lab-target','threshold','launch-mode','launch-min','launch-max'])$(id).disabled=true;
 for(const selector of ['#custom-form button','#lab-form button'])document.querySelector(selector).disabled=true;
}
function renderStrokeScore(node,par,score,withUnit=false){
 node.textContent=score===null||score===undefined?'—':withUnit?`${par+score} ${par+score===1?'stroke':'strokes'}`:String(par+score);
 if(score!==null&&score!==undefined){const caption=document.createElement('span'),inline=node.id==='arrival-skill-value';caption.className=inline?'stroke-result-inline':'stroke-result-caption';caption.textContent=inline?` (${resultText(score)})`:resultText(score);node.append(caption);}
}
function renderBestRoute(bestState){
 const words=bestState?.won&&Array.isArray(bestState.route)?bestState.route:[];
 $('result-route-section').hidden=roundSummary()||!words.length;
 $('result-route-heading').hidden=!words.length;$('result-best-route').hidden=!words.length;
 $('result-best-route').textContent=words.map(word=>word.toUpperCase()).join(' →\u00a0');
}
function styleResultButtonLabels(){
 for(const button of $('arrival-actions').querySelectorAll('button')){
  if(button.querySelector('.result-button-label'))continue;
  const label=document.createElement('span');label.className='result-button-label';label.textContent=button.textContent;button.replaceChildren(label);
 }
}
function renderCourseOutcome(){
 if(!inCourse())return;
 const r=rounds.active,h=rounds.hole,best=bestAttempt(h),remaining=attemptLimit(h.settings.par)-h.attempts.filter(a=>a.ended).length;
 $('arrival-skill').hidden=false;
 $('arrival-attempt-cell').hidden=roundSummary();
 renderBestRoute(best?.state);
 const labels=document.querySelectorAll('#arrival-banner .scorecard-grid .scorecard-label');
 if(r.finished&&!reviewingSubmittedHole){
  $('arrival-title').textContent='Scorecard submitted';$('arrival-par').textContent=`${r.holes.length} HOLES`;
  labels[0].textContent='TOTAL';labels[1].textContent='HOLES COMPLETED';
  $('arrival-skill-value').textContent=scoreText(roundTotal(r));
  $('arrival-attempt').textContent=`${r.holes.filter(h=>h.attempts.some(a=>a.state.won)).length}/${r.holes.length}`;
  $('replay-hole').hidden=false;$('replay-hole').textContent='TRY AGAIN';$('next-hole').textContent='NEXT COURSE';
 }else{
  if(!state.won)$('arrival-title').textContent=courseExhausted()?'Hole score':'Attempt ended';
  $('arrival-par').textContent=`HOLE ${r.index+1} · PAR ${h.settings.par}`;
  labels[0].textContent='BEST STROKES';labels[1].textContent='ON ATTEMPT';
  renderStrokeScore($('arrival-skill-value'),h.settings.par,best?attemptResult(best,h.settings.par):null);
  $('arrival-attempt').textContent=best?.state.won?best.number:h.attempts.filter(a=>a.ended&&!a.state.default_score).length;
  if(!best?.state.won)labels[1].textContent='ATTEMPTS';
  $('replay-hole').hidden=false;$('replay-hole').textContent='TRY AGAIN';
  $('next-hole').textContent=r.index===r.holes.length-1?'VIEW SCORECARD':'NEXT HOLE';
 }
 styleResultButtonLabels();
}
function renderCourseScorecard(){
 if(rollingMode){rollingUI?.render(!inCourse());if(inCourse())renderCourseOutcome();return;}
 const visible=inCourse();$('round-scorecard').hidden=!visible;if(!visible)return;
 const r=rounds.active;
 $('round-course-name').textContent=r.name;
 $('round-running-score').textContent=`Total: ${scoreText(roundTotal(r))}`;
 $('round-rows').innerHTML=r.holes.map((hole,i)=>{
  const best=postedAttempt(hole),score=best?attemptResult(best,hole.settings.par):null,visitable=rounds.canVisit(i);
  return `<tr ${visitable?`data-course-row="${i}"`:""} ${i===r.index?'class="current-hole" aria-current="step"':''}><td>${visitable?`<button type="button" data-course-hole="${i}" aria-label="View hole ${i+1}">${i+1}<span class="course-hole-par">Par ${hole.settings.par}</span></button>`:`${i+1}<span class="course-hole-par">Par ${hole.settings.par}</span>`}</td><th scope="row">${visitable?`<button type="button" data-course-hole="${i}" aria-label="View hole ${i+1}: ${esc(hole.settings.start)} to ${esc(hole.settings.target)}">`:''}${esc(hole.settings.start)} <span>→</span> ${esc(hole.settings.target)}${visitable?'</button>':''}</th><td>${score===null?'—':`<strong class="course-hole-score">${hole.settings.par+score}</strong><span class="course-score-label">${resultText(score)}</span>`}</td><td>${hole.attempts.filter(a=>a.ended&&!a.state.default_score).length}/${attemptLimit(hole.settings.par)}</td></tr>`;
 }).join('');
 $('round-status').textContent=rounds.warning||(r.finished?'Scorecard submitted · saved on this device.':'');
 $('submit-scorecard').hidden=r.finished;
 $('submit-scorecard').disabled=!rounds.canSubmit();
 $('submit-scorecard-note').hidden=r.finished||rounds.canSubmit();
 $('submit-scorecard-note').textContent='Play more holes before you submit.';
 renderCourseOutcome();
}
$('round-rows').addEventListener('click',event=>{
 const button=event.target.closest('[data-course-hole],[data-course-row]');if(button){event.preventDefault();if(rollingMode){if(!checkRollingDay())return;rounds.returnToDaily();}void navigateCourseHoleFromCard(Number(button.dataset.courseHole??button.dataset.courseRow));}
});
function submitCourse(){
 if(rollingMode){if(!checkRollingDay()||busy)return;recordCourseState();$('submit-course-detail').textContent=`Submit today’s nine scores? ${rounds.unfinished()} unfinished holes will receive double bogey for today only. All nine holes will then lock until 00:00 UTC. Your saved routes and best scores carry forward.`;$('submit-course-dialog').showModal();return;}
 if(busy||!inCourse()||rounds.active.finished)return;
 clearTimeout(retryTimer);recordCourseState();
 if(!rounds.canSubmit())return;
 const count=rounds.unfinished();
 if(count){$('submit-course-detail').textContent=`${count} ${count===1?'hole has':'holes have'} no completed score. Those holes will receive double bogey. Your round will then be locked.`;$('submit-course-dialog').showModal();}
 else confirmCourseSubmission();
}
function confirmCourseSubmission(){
 if(rollingMode){if(!checkRollingDay())return;const wasPractice=!inCourse();rounds.returnToDaily();recordCourseState();rounds.submit();if(wasPractice){rounds.data.activeId=null;rounds.save();}$('submit-course-dialog').close();clearTimeout(retryTimer);leaveWordEntry();update();courseInputLocks();rollingUI.lockMessage();return;}
 if(!inCourse()||rounds.active.finished)return;
 recordCourseState();if(!rounds.canSubmit())return;
 $('submit-course-dialog').close();clearTimeout(retryTimer);rounds.submit();reviewingSubmittedHole=false;setHoleLog(false);update();anchorCourseHole();
}
$('submit-scorecard').onclick=submitCourse;
$('cancel-submit-course').onclick=()=>$('submit-course-dialog').close();
$('confirm-submit-course').onclick=confirmCourseSubmission;

function recordCourseState(){
 if(!inCourse()||retryPreview||restoring)return;
 const d=dimensions();if(rounds.hole.arrivalFraction===null){rounds.hole.arrivalFraction=d.arrivalDistance/d.axisLength;rounds.save();}rounds.record(state,flightLog.active?.id,d.arrivalDistance/d.axisLength);
 if(flightLog.active){flightLog.active.course_round={id:rounds.active.id,course:rounds.active.courseId,hole:rounds.active.index+1};flightLog.save();}
 renderCourseScorecard();
}
async function startCourse(courseId,profile=state?.word_model??''){
 if(busy)return;
 profile='';
 const course=config.courses.find(c=>c.id===courseId);if(!course)return;
 clearTimeout(retryTimer);reviewingSubmittedHole=false;
 const existing=rounds.data.rounds.findLast(r=>r.courseId===courseId&&!r.finished&&!r.model&&r.version==='five-hole-v2');
 if(existing){rounds.data.activeId=existing.id;rounds.save();$('course-select').value=course.id;return navigateCourseHole(existing.index);}
 rounds.begin(course,profile,config.word_models?.[profile]?.defaults??{});
 $('course-select').value=course.id;
 if(await newGame(rounds.settings()))anchorCourseHole();
}
async function advanceCourse(){
 if(rounds.active.index===rounds.active.holes.length-1){rounds.advance();update();$('round-scorecard').scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});return;}
 if(rounds.hole.locked&&!rounds.active.finished)return navigateCourseHole(rounds.active.index+1);
 if(!rounds.advance())return;
 if(rounds.active.finished){update();anchorCourseHole();}
 else await navigateCourseHole(rounds.active.index);
}
async function initialiseCourses(){
 if(rollingMode)return initialiseRolling();
 $('course-select').innerHTML=(config.courses??[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${c.holes.length} holes</option>`).join('')+'<option value="practice">Individual holes</option>';
 if(!rounds.active)return;
 if(rounds.active.model||rounds.active.version!=='five-hole-v2'){leaveCourse();return;}
 if(!config.courses.some(c=>c.id===rounds.active.courseId)){leaveCourse();return;}
 $('course-select').value=rounds.active.courseId;
 if(!inCourse())await navigateCourseHole(rounds.active.index);
 if(inCourse()){update();if(state.challenge_failed)scheduleRetry();}
}
$('course-select').onchange=()=>{$('start-course').textContent=$('course-select').value==='practice'?'PLAY INDIVIDUAL HOLES':'START COURSE';};
$('start-course').onclick=()=>{if($('course-select').value==='practice'){leaveCourse();return playFromResult(config.puzzles[0]);}return startCourse($('course-select').value);};

function checkRollingDay(){
 if(!rollingMode)return true;
 if(!rounds.hasExternalChanges()&&(rollingSimulation||utcDay(Date.now())<=rounds.day))return true;
 location.reload();return false;
}
function rollingCanPlay(){
 if(!checkRollingDay())return false;
 if(!inCourse()||rounds.playable(retryPreview?.original.state??state))return true;
 rollingUI?.lockMessage();return false;
}
async function startRollingPractice(){
 if(busy||!checkRollingDay())return;
 clearTimeout(retryTimer);setBag(false);setHoleLog(false);leaveWordEntry();
 recordCourseState();const def=rounds.pickPractice();if(!def)return;
 const challenge={id:'practice-'+def.id,version:STROKE_PLAY,par:def.settings.par,attempt:1,practice:true,locked_result:{score:2,attempt:1}};
 await playFromResult({...def.settings,challenge});rollingUI.render(true);
}
async function returnRollingDaily(){
 if(busy||!checkRollingDay())return;
 rounds.returnToDaily();await navigateCourseHoleFromCard(rounds.current.index);rollingUI.render(false);
}
async function initialiseRolling(){
 rollingUI=mountRollingUI(rounds,{simulation:rollingSimulation,onDaily:returnRollingDaily,onPractice:startRollingPractice,onView:()=>{leaveWordEntry();$('round-scorecard').scrollIntoView({behavior:reduced?'instant':'smooth',block:'start'});},onSubmit:submitCourse,onLocked:()=>leaveWordEntry()});
 // Recover a retired live hole as unrestricted practice; never erase its route.
 const retiredLive=state?.challenge?.rolling&&!state.won&&rounds.retired().find(h=>h.id===state.challenge.id);
 if(retiredLive&&!rounds.store.practice){rounds.data.activeId=null;rounds.store.practice=true;rounds.store.practiceId=retiredLive.id;rounds.save();const saved={...state,challenge:{...state.challenge,rolling:false,practice:true,locked_result:{score:2,attempt:state.challenge.attempt}}};state=(await api('restore',{state:saved})).state;selectedLogId=flightLog.begin(state,modelName(state),modelHash(state)).id;update();}
 const matching=rounds.current.holes.some(h=>h.challengeId===state?.challenge?.id);
 if(rounds.store.practice){
  if(!state?.challenge?.practice)await startRollingPractice();
 }else if(rounds.current.finished){
  if(matching)await navigateCourseHole(rounds.current.index,{preserveScroll:true});rollingUI.render(!inCourse());
 }else await navigateCourseHole(rounds.current.index,{preserveScroll:true});
 rollingUI.render(!inCourse());
 window.addEventListener('storage',event=>{if(event.key?.endsWith('rolling-course-v1')&&!busy)checkRollingDay();});
 if(!rollingSimulation){setInterval(()=>{if(!busy)checkRollingDay();},30000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!busy)checkRollingDay();});}
}
let selectedLogId=flightLog.data.activeId;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){
 if(rollingMode&&body?.state?.challenge?.rolling){const saved=body.state,h=rounds.store.bank[saved.challenge.id];if(h)body={...body,state:{...saved,challenge:{...saved.challenge,attempt_limit:h.allowance}}};}
 return client.request(path,body);
}
function lock(value){if(!value&&rollingMode&&rollingUI&&!checkRollingDay())return;busy=value;for(const e of document.querySelectorAll('button,input,select'))if(!['copy-log','download-log','log-journey'].includes(e.id))e.disabled=value&&!(changingRetry&&e.id==='word');$('word').readOnly=false;if(!value){courseInputLocks();if(state){renderBag();renderNotice();}}}
const narrow=()=>matchMedia('(max-width:650px)').matches;
const desktopInteraction=()=>matchMedia('(hover: hover) and (pointer: fine)').matches;
let appearanceKey,appearanceLayout,backdropLayout;
function dimensions(){const seed=state?.challenge?state.challenge.id:flightLog.active?.id??'opening';const key=`${narrow()}:${seed}:${!!state?.waypoint}`;if(key!==appearanceKey){appearanceKey=key;const style=courseStyle(seed);const placement=pinPlacement(seed),base=mapLayout(narrow(),{...placement,...(!state?.waypoint?{greenHeight:222,par3:true}:{}),teeY:state?.waypoint?style.teeY:style.par3TeeY,greenCentreY:style.greenCentreY});appearanceLayout={...(state?.waypoint?waypointLayout(base,state,placement):base),style};}return appearanceLayout;}
const COURSE_HEIGHT=430,TEE_MARKER_OFFSET=78;
const x=similarity=>projectX(similarity,state.baseline,state.threshold,dimensions());
function goldenLanding(a,b,d){let lo=0,hi=1;for(let i=0;i<32;i++){const t=(lo+hi)/2;if(greenContains({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},d))hi=t;else lo=t;}const fraction=hi+(1-hi)*.22;return {fraction,x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};}
function position(word,event=null){const landed=event??state.history.findLast(e=>e.word===word);if(landed?.golden_holed){const d=dimensions();return goldenLanding(position(landed.origin),{x:d.right,y:d.holeY},d);}if(state.waypoint)return waypointPosition(state,word,dimensions(),event);if(word===state.start)return {x:dimensions().left,y:dimensions().teeY};if(word===state.target)return {x:dimensions().right,y:dimensions().holeY};const h=event??state.history.findLast(e=>e.word===word);return projectPoint(h.destination,state.baseline,state.threshold,dimensions(),.88*[-62,54,-104,97,-28,15][(h.attempt-1)%6]);}
// Word positions are ground anchors; lift the teed ball above its shadow.
// A proposed shot must not relocate the current ball or its label-clearance obstacle.
function ballPosition(word,event=null){const matching=event?.word===word?event:null,p=position(word,matching),landed=matching??state.history.findLast(h=>h.success&&h.word===word);return {...p,y:p.y-(word===state.start&&landed?.stage!==1?16*(dimensions().artScale??1):0)};}

const path=(a,b)=>`M ${a.x},${a.y} Q ${(a.x+b.x)/2},${Math.min(a.y,b.y)-65} ${b.x},${b.y}`;
function noticeForAttempt(event,saved){
 if(event?.outcome==='miss'&&attemptNotice(event,saved.target,saved)==='Miss! The connection was too weak.')return `${event.word.toUpperCase()} needed a stronger link to ${event.origin.toUpperCase()}.`;
 return !isStrokePlay(saved)&&shortSecondShot(saved,client.canFinish(saved))?'The shot landed short of chip-in range. Try again.':attemptNotice(event,saved.target,saved);
}
function chipShading(d,zone){
 if(!showChipRange||!client||!state||restoring)return '';
 if(state.waypoint)return showChipRange?waypointChipGuide(state,d,client.chipRange(state)):'';
 const range=client.chipRange(state);if(!range)return '';
 const bands=chipArcBands(x(range.first),x(range.last),d);
 return `<defs><clipPath id="chip-range-clip"><rect x="20" y="54" width="${d.edge-20}" height="324"/></clipPath></defs><g id="chip-range-shading" clip-path="url(#chip-range-clip)" pointer-events="none" aria-hidden="true">${bands.map(b=>`<path d="${b.path}" fill="${b.stroke?'none':'#b94b46'}" stroke="${b.stroke?'#b94b46':'none'}" stroke-width="${b.stroke?1:0}" opacity="${b.opacity}"/>`).join('')}</g>`;
}

let labelLayoutKey,labelLayout=new Map();
function captureWordLabels(d){
 const previous=new Map();
 if(reduced||labelLayoutKey!==appearanceKey||$('map').viewBox.baseVal.width!==d.width)return previous;
 const matrix=$('map').getScreenCTM();if(!matrix?.a||!matrix?.d)return previous;
 for(const label of $('map').querySelectorAll('[data-label-word]')){
  const rect=label.querySelector('rect');if(!rect)continue;
  const box=rect.getBoundingClientRect();previous.set(label.dataset.lieKey,{x:(box.left-matrix.e)/matrix.a,y:(box.top-matrix.f)/matrix.d,path:label.querySelector('path')?.getAttribute('d')});
 }
 return previous;
}
function moveWordLabels(previous){
 for(const label of $('map').querySelectorAll('[data-label-word]')){
  const old=previous.get(label.dataset.lieKey),rect=label.querySelector('rect'),body=label.querySelector('.label-body');
  if(!old||!rect||!body)continue;
  const dx=old.x-Number(rect.getAttribute('x')),dy=old.y-Number(rect.getAttribute('y'));
  if(Math.hypot(dx,dy)<.25)continue;
  body.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0px,0px)'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'});
  const connector=label.querySelector('path');if(!connector||!old.path)continue;
  const motion=document.createElementNS('http://www.w3.org/2000/svg','animate');
  for(const [key,value] of Object.entries({attributeName:'d',from:old.path,to:connector.getAttribute('d'),dur:'.36s',begin:'indefinite',calcMode:'spline',keyTimes:'0;1',keySplines:'.2 .8 .2 1'}))motion.setAttribute(key,value);
  connector.append(motion);motion.beginElement?.();
 }
}
let retryTipUsed=false;
try{retryTipUsed=sessionStorage.getItem('word-golf-retry-tip-used')==='true';}catch{}
function renderRetryTip(planets,layout,d,currentKey,preview){
 const tip=$('retry-guidance');tip.hidden=true;
 if(preview||retryTipUsed||state.won||holeResult()||document.activeElement===$('word'))return;
 const earlier=planets.find(p=>p.resumeThrough>0&&p.key!==currentKey&&!p.waypointReference&&layout.labels.has(p.key));
 if(!earlier)return;
 const box=layout.labels.get(earlier.key),below=box.y<75;
 tip.replaceChildren(document.createTextNode(`Tap ${earlier.word.toUpperCase()} to retry`),document.createElement('br'),document.createTextNode('from here.'));
 tip.style.left=`clamp(88px,${box.textX/d.width*100}%,calc(100% - 88px))`;
 tip.style.top=`calc(${(below?box.y+box.height:box.y)/layout.height*100}% ${below?'+':'-'} 8px)`;
 tip.classList.toggle('below-label',below);tip.hidden=false;
}
function learnWordRetry(){retryTipUsed=true;try{sessionStorage.setItem('word-golf-retry-tip-used','true');}catch{}$('retry-guidance').hidden=true;}
function retrySource(){
 if(practising())return null;
 if(!state?.challenge||retryPreview||state.won||state.challenge_failed||state.history.some(h=>!h.assumed)||(flightLog.active?.previous_labels_dismissed&&!flightLog.active?.auto_retry))return null;
 const previous=previousAttempts(flightLog.data.journeys,state,flightLog.active?.id)[0];
 if(!previous||!previous.state.history.some(h=>h.success))return null;
 return {...previous,id:flightLog.data.journeys.find(j=>j.state===previous.state)?.id};
}
function retryFromWord(through,{focusEntry=true}={}){
 if(rollingMode&&!rollingCanPlay())return;
 if(busy||restoring)return;
 if(inCourse()&&!practising()&&rounds.hole.locked&&(rounds.active.finished||Math.max(0,...rounds.hole.attempts.map(a=>a.number))>=attemptLimit(state.challenge.par)))return void keepPractising({focusEntry});
 const switching=retryPreview,previous=switching?null:retrySource(),source=switching?.source??previous??{state,id:flightLog.active?.id};
 if(returnsToOriginalLie(switching,through)){cancelRetry();if(focusEntry)$('word').focus({preventScroll:true});return;}
 if(!switching&&!previous&&through===state.history.length&&!state.won&&!state.challenge_failed){if(focusEntry)$('word').focus({preventScroll:true});return;}
 const nextAttempt=inCourse()&&!practising()?Math.max(state.challenge.attempt+1,...rounds.hole.attempts.map(a=>a.number+1)):state.challenge.attempt+1;
 const attempt=switching?.attempt??(previous?state.challenge.attempt:nextAttempt);
 if(rollingMode&&inCourse()&&attempt>rounds.hole.allowance){rollingUI.lockMessage();return;}
 const practicePreview=!practising()&&attempt>attemptLimit(state.challenge.par);
 const sourceState={...source.state,continuous_play:true,...(rollingMode&&inCourse()?{challenge:{...source.state.challenge,attempt_limit:rounds.hole.allowance}}:{}),...(practicePreview?{challenge:{...source.state.challenge,practice:true,locked_result:lockedHoleResult(source.state)}}:{})};
 const original=switching?.original??{state:structuredClone(state),id:flightLog.active?.id,shownEvent,activeNotice,noticeDismissed,entry:$('word').value};
 changingRetry=true;
 try{
  const data=client.retryNow(sourceState,through,attempt);
  if(through>0)learnWordRetry();
  retryPreview={source,through,attempt,original};state=data.state;$('word').disabled=!!state.challenge_failed;$('launch').disabled=!!(state.won||state.challenge_failed);shownEvent=state.history.at(-1)??null;activeNotice='';noticeDismissed=true;$('word').value='';update();
  $('status').textContent=`Retry from ${state.current.toUpperCase()}. Play your next word.`;
 }catch(error){$('status').textContent=error.message;}finally{changingRetry=false;if(focusEntry&&retryPreview&&document.activeElement!==$('word'))$('word').focus({preventScroll:true});}
}
function cancelRetry(){
 if(!retryPreview||committingRetry||changingRetry||busy)return;
 const original=retryPreview.original;retryPreview=null;
 try{state=client.restoreRetry(original.state).state;shownEvent=original.shownEvent;activeNotice=original.activeNotice;noticeDismissed=original.noticeDismissed;$('word').value=original.entry??'';update();$('status').textContent='';}finally{$('word').disabled=!!state.challenge_failed;$('launch').disabled=!!(state.won||state.challenge_failed);}
}
function commitRetry(){
 if(!retryPreview)return false;
 let spentAttempt=false;
 const {source,through,original}=retryPreview;
 if(inCourse()&&!practising()&&rounds.hole.locked)rounds.reopen();
 if(!original.state.won&&!original.state.challenge_failed&&original.state.history.length){
  spentAttempt=true;const abandoned={...original.state,challenge_failed:true,abandoned:true};
  const old=flightLog.data.journeys.find(j=>j.id===original.id);old.state=abandoned;old.challenge_result='failed';old.scored_strokes=abandoned.challenge.practice?null:maximumStrokes(abandoned.challenge.par);old.score_to_par=old.scored_strokes===null?null:old.scored_strokes-abandoned.challenge.par;
  if(inCourse())rounds.record(abandoned,old.id,dimensions().arrivalDistance/dimensions().axisLength);
 }
 const entries=structuredClone(flightLog.data.journeys.find(j=>j.id===source.id)?.entries.filter(entry=>entry.event?.success&&entry.event.attempt<=through)??[]);
 retryPreview=null;selectedLogId=flightLog.begin(state,modelName(state),modelHash(state)).id;
 for(const entry of entries){entry.assumed=true;entry.event.assumed=true;entry.assumed_from=source.id;}
 flightLog.active.entries=entries;flightLog.active.previous_labels_dismissed=true;flightLog.save();
 return spentAttempt;
}
document.addEventListener('pointerdown',event=>{if(retryPreview&&!busy&&!event.target.closest('#launch-form,[data-resume-through],button,[data-course-row],#hole-attempt-log'))void cancelRetry();});
function tappedWord(event){
 const labels=[...$('map').querySelectorAll('[data-resume-through],[data-focus-entry]')].filter(label=>getComputedStyle(label).visibility!=='hidden');
 const targets=labels.map(label=>{
  const rect=label.querySelector('.label-body rect'),dot=[...$('map').querySelectorAll('[data-lie-dot]')].find(n=>n.dataset.lieKey===label.dataset.lieKey)?.querySelector('circle');
  return {word:label.dataset.lieKey,boxes:[rect,dot].filter(Boolean).map(node=>node.getBoundingClientRect())};
 });
 const word=nearestWordTarget(targets,{x:event.clientX,y:event.clientY});
 return labels.find(label=>label.dataset.lieKey===word);
}
function activateWord(label){
 if(!label||!$('hole-attempt-log').hidden&&(holeResult()||courseResult()))return;
 if(label.hasAttribute('data-resume-through'))void retryFromWord(Number(label.dataset.resumeThrough));
 else if(!busy)$('word').focus({preventScroll:true});
}
let pendingWordTap=null;
$('map').addEventListener('pointerdown',event=>{
 if(event.isPrimary===false){pendingWordTap=null;return;}
 if(event.button!==0||busy)return;
 const label=tappedWord(event);if(!label)return;
 event.preventDefault();event.stopPropagation();
 pendingWordTap={label,id:event.pointerId,x:event.clientX,y:event.clientY};
});
$('map').addEventListener('pointerup',event=>{
 const pending=pendingWordTap;
 if(!pending||pending.id!==event.pointerId||busy||Math.hypot(event.clientX-pending.x,event.clientY-pending.y)>12)pendingWordTap=null;
 // Rebuild the SVG only at click, after touch-up has completed. Replacing its
 // target during pointerup can make Safari drop focus from the text field.
});
$('map').addEventListener('pointercancel',()=>{pendingWordTap=null;});
$('map').addEventListener('click',event=>{
 const label=event.detail===0?event.target.closest('[data-resume-through],[data-focus-entry]'):pendingWordTap?.label??tappedWord(event);
 pendingWordTap=null;if(!label||busy)return;
 event.preventDefault();event.stopPropagation();activateWord(label);
});
$('map').addEventListener('keydown',event=>{if(!$('hole-attempt-log').hidden&&(holeResult()||courseResult()))return;if(!['Enter',' '].includes(event.key))return;const label=event.target.closest('[data-resume-through]');if(label){event.preventDefault();void retryFromWord(Number(label.dataset.resumeThrough));}else if(event.target.closest('[data-focus-entry]')&&!busy){event.preventDefault();$('word').focus({preventScroll:true});}});
function syncControlTrees(){
 const buttons=[...document.querySelectorAll('#toggle-bag')].filter(button=>getComputedStyle(button).visibility!=='hidden').map(button=>button.getBoundingClientRect()).filter(b=>b.width>0&&b.height>0);
 for(const tree of $('map').querySelectorAll('[data-course-tree]'))tree.toggleAttribute('data-hidden-for-control',treeOverlapsControls(tree.getBoundingClientRect(),buttons));
}
if(typeof ResizeObserver!=='undefined'){
 const observer=new ResizeObserver(syncControlTrees);
 for(const node of document.querySelectorAll('#map,#toggle-bag'))observer.observe(node);
}
function map(preview=null){
 const d=dimensions(),previousLabels=captureWordLabels(d);$('map').setAttribute('viewBox',`0 0 ${d.width} ${COURSE_HEIGHT}`);
 const zone=d.zoneLeft,lake=state.waypoint?waypointLake(d,d.style):lakeGeometry(d,d.style),scale=d.artScale??1,teeOffset=state.waypoint?44:d.par3?64:TEE_MARKER_OFFSET;
 const retry=preview?null:retrySource(),previousEntry=(retry?.state??retryPreview?.source.state)?.history.find(h=>h.waypoint_reached),waypointDisplay=waypointRetryDisplay(state,previousEntry,document.activeElement===$('word'));$('retry-guidance').hidden=true;
 const chipArt=chipShading(d,zone),waypointArt=state.waypoint?waypointZone(state,d,waypointDisplay.occupied):'';
 let svg=`<defs><radialGradient id="ball-shade" cx="30%" cy="25%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#f4f5ed"/><stop offset="1" stop-color="#cbd6bd"/></radialGradient><pattern id="fairway-mown" width="${100*scale}" height="${COURSE_HEIGHT}" patternUnits="userSpaceOnUse"><rect width="${100*scale}" height="${COURSE_HEIGHT}" fill="#d8e7c4"/><rect width="${50*scale}" height="${COURSE_HEIGHT}" fill="#e1edcf"/></pattern><pattern id="green-mown" width="${22*scale}" height="${22*scale}" patternUnits="userSpaceOnUse"><rect width="${22*scale}" height="${22*scale}" fill="#95c87b"/><rect width="${11*scale}" height="${22*scale}" fill="#a5d18d"/></pattern>${courseArtDefs}</defs><g class="course-scenery">${state.waypoint?waypointLandscape(state,d,d.style):courseSurrounds(d,d.style,lake)}</g>${chipArt}<g class="course-scenery">${state.waypoint?waypointGreen(d,d.style):`${courseBunkers(d,d.style)}<path id="green-fringe" d="${greenPath(d,7)}" fill="#b8cf94"/><path id="putting-green" d="${greenPath(d)}" fill="url(#green-mown)" stroke="#70a35d" stroke-width="2"/>`}${state.waypoint?'':`<path d="${par3CentreTrace(d)}" stroke="#a7bb9b" fill="none" stroke-dasharray="3 8"/>`}${state.waypoint?'':courseLake(d,d.style,lake)+approachLandscape(d,d.style)}${d.par3?par3PathArt(d,d.style):''}${courseTrees(d,d.style,lake)}</g>${waypointArt}`;
 const worldArt=svg.replace(chipArt,'').replace(waypointArt,'');
 for(const offset of [-teeOffset,teeOffset])svg+=`<g class="tee-marker" aria-label="Tee marker"><ellipse cx="${d.left}" cy="${d.teeY+offset+5*scale}" rx="${6*scale}" ry="${2*scale}" fill="#a9bf8d" opacity=".18"/><circle cx="${d.left}" cy="${d.teeY+offset}" r="${4.5*scale}" fill="#b8cf94" stroke="#aec58f" stroke-width="1.2"/></g>`;



 const previousNodes=new Map();
 if(!flightLog.active?.previous_labels_dismissed&&showPreviousLabels(state,preview))for(const attempt of previousAttempts(flightLog.data.journeys,state,flightLog.active?.id)){
  for(const label of previousWordLabels(attempt.state,d))previousNodes.set(label.key,{...label,previous:true,failed:true});
 }
 for(const h of [...visibleAttempts(state).filter(h=>h.success||usefulForwardMiss(h,state)),...(state.automatic_shots??[])]){const origin=state.history.findLast(e=>e.success&&e.word===h.origin&&e.attempt<h.attempt),a=position(h.origin,origin),b=position(h.word,h);svg+=`<path data-shot-path="${h.attempt}" d="${h.golden_holed?shotTrail('golden',a,{x:d.right,y:d.holeY},{tee:h.origin===state.start,landingFraction:goldenLanding(a,{x:d.right,y:d.holeY},d).fraction}):h.automatic&&automaticFinishMotion(a,d)==='putt'?`M ${a.x},${a.y} L ${b.x},${b.y}`:path(a,b)}" fill="none" stroke="${h.success?'#7d9f73':'#b7bfb1'}" stroke-width="1.4" ${h.success?'':'stroke-dasharray="3 5"'} opacity=".6"/>`;}
 const currentKey=currentLieKey(state),targetKey=wordLieKey(state.target,state.stage??0),teeKey=wordLieKey(state.start),finalKey=wordLieKey(state.final_target??state.target,state.waypoint?1:0),waypointKey=wordLieKey(state.waypoint?.word);
 const nodes=new Map([[teeKey,{key:teeKey,word:state.start,pos:state.waypoint?waypointAnchors(d).tee:position(state.start),...(state.challenge?{resumeThrough:0}:{})}]]);
 for(const h of visibleAttempts(state).filter(h=>h.success||usefulForwardMiss(h,state))){const key=wordLieKey(h.word,h);if(key===targetKey)continue;const old=nodes.get(key);if(!old)nodes.set(key,{key,word:h.word,pos:position(h.word,h),failed:!h.success,...(h.success&&!h.won?{resumeThrough:h.attempt}:{})});else if(h.success)Object.assign(old,{pos:position(h.word,h),failed:false,...(!h.won?{resumeThrough:h.attempt}:{})});}
 if(retryPreview)for(const h of retryPreview.source.state.history.filter(h=>h.success&&!h.automatic)){
  const key=wordLieKey(h.word,h);if(nodes.has(key)||key===targetKey)continue;
  const source=retryPreview.source.state,pos=source.waypoint?waypointPosition(source,h.word,d,h):projectPoint(h.destination,source.baseline,source.threshold,d,.88*[-62,54,-104,97,-28,15][(h.attempt-1)%6]);
  nodes.set(key,{key,word:h.word,pos,...(!h.won?{resumeThrough:h.attempt}:{}),retryFuture:true});
 }
 if(!state.waypoint||state.stage!==0||waypointDisplay.showTarget)nodes.set(targetKey,{key:targetKey,word:state.target,pos:position(state.target),...(waypointDisplay.reference?{waypointReference:true}:{})});
 if(state.waypoint){nodes.set(finalKey,{key:finalKey,word:state.final_target,pos:position(state.final_target)});if(!nodes.has(waypointKey)&&((state.stage===0&&!previousEntry)||state.won))nodes.set(waypointKey,{key:waypointKey,word:state.waypoint.word,pos:waypointAnchors(d).bend,...(state.won?{waypointReference:true}:{})});}
 if(preview&&(preview.success||usefulForwardMiss(preview,state))){const key=wordLieKey(preview.word,preview),old=nodes.get(key);if(old)old.preview=true;else nodes.set(key,{key,word:preview.word,pos:position(preview.word,preview),preview:true});}
 for(const [key,node] of previousNodes){if(!nodes.has(key))nodes.set(key,node);else if(retry&&node.resumeThrough!==undefined)nodes.get(key).resumeThrough=node.resumeThrough;}
 const planets=[...nodes.values()];
 for(const p of planets){if(p.waypointReference)continue;const active=p.key===currentKey;
 const ball=p.key===finalKey?`<g transform="translate(${p.pos.x},${p.pos.y}) scale(${scale})"><ellipse rx="10" ry="5" fill="#294d35"/><path d="M0 0 v-48" stroke="#f9fff2" stroke-width="3"/><path d="M2 -48 l25 9 -25 9Z" fill="#d66a4c"/></g>`:`<circle cx="${p.pos.x}" cy="${p.pos.y}" r="${(p.preview?9:6)*scale}" fill="${p.preview?'#fff7df':'#d5e3c5'}" stroke="${p.preview?'#a89965':active?'#25715a':'#63845a'}" stroke-width="2"/>`;
 svg+=`<g data-lie-dot="${esc(p.word)}" data-lie-key="${esc(p.key)}" ${active&&p.key===teeKey?'visibility="hidden"':''} ${p.previous?`class="previous-word-dot previous-attempt-element" data-previous-word="${esc(p.word)}"`:''} opacity="${p.retryFuture?.65:p.failed?.4:1}">${ball}</g>`;
 }
 // Measure the actual font before packing labels; semantic ball positions never move.
 for(const p of planets)svg+=`<text data-word-label="${esc(p.word)}" x="${p.pos.x}" y="${p.pos.y+35}" text-anchor="middle" class="planet-label">${esc(p.word.toUpperCase())}</text>`;

 const r=ballPosition(state.current);
 svg+=`<g id="golf-ball" transform="translate(${r.x},${r.y})" aria-label="Your golf ball" opacity="${state.won&&state.current===state.target?0:1}" aria-hidden="${state.won&&state.current===state.target}"><g id="ball-size" transform="scale(${scale})"><ellipse id="ball-shadow" cy="18" rx="17" ry="4" fill="#45663e" opacity=".2"/><g id="ball-body"><circle r="16" fill="url(#ball-shade)" stroke="#728363" stroke-width="1"/><g id="ball-dimples">${[[-4,-5],[3,-6],[-7,1],[0,0],[6,1],[-3,6],[4,6]].map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="1.2" fill="#d4ddc8"/>`).join('')}</g></g></g></g>`;
 $('map').innerHTML=svg;
 if(backdropLayout!==d){document.querySelector('.map-card').style.backgroundImage=`url("data:image/svg+xml,${encodeURIComponent(courseContinuation(d,d.style,{foreground:worldArt,lake}))}")`;backdropLayout=d;}
 const textNodes=[...$('map').querySelectorAll('[data-word-label]')];
 const needsBallSpace=p=>p.key!==finalKey&&(p.key===currentKey||state.waypoint&&p.key===waypointKey||preview?.success&&p.key===wordLieKey(preview.word,preview));
 const obstacles=planets.filter(p=>!p.previous&&!p.waypointReference).map(p=>{if(needsBallSpace(p)||p.resumeThrough!==undefined){const b=p.key===currentKey?ballPosition(p.word,preview):{x:p.pos.x,y:p.pos.y-(p.key===teeKey?16*scale:0)};return {x:b.x-17,y:b.y-17,width:34,height:40};}const radius=p.key===targetKey?10:8;return {x:p.pos.x-radius,y:p.pos.y-radius,width:2*radius,height:2*radius};});
 obstacles.push(...lake.obstacles,{x:d.right-3,y:d.holeY-51,width:33,height:52},...[-teeOffset,teeOffset].map(offset=>({x:d.left-7,y:d.teeY+offset-7,width:14,height:16})));
 const measured=textNodes.map((node,i)=>{const p=planets[i],box=node.getBBox();return {word:p.key,optional:!!p.previous,failed:!!p.failed,...p.pos,...(state.waypoint&&(d.waypointTurn==='up'?p.pos.y<215:p.pos.y>215)?{preferAbove:d.waypointTurn==='down'}:{}),radius:(needsBallSpace(p)?16:p.key===finalKey?10:6)*scale,gap:needsBallSpace(p)?(p.key===teeKey?8:12):5,width:box.width,height:box.height,priority:p.previous?-1:p.key===teeKey?5:p.key===currentKey?4:p.key===targetKey?3:p.failed?0:1};});
 if(labelLayoutKey!==appearanceKey){labelLayoutKey=appearanceKey;labelLayout=new Map();}
 const layout=layoutLabels(measured,obstacles,d.width,COURSE_HEIGHT,labelLayout);
 labelLayout=layout.labels;
 for(const node of textNodes)node.remove();
 let labels='';
 for(const p of planets){const box=layout.labels.get(p.key);if(!box)continue;const endX=Math.max(box.x,Math.min(box.x+box.width,p.pos.x)),endY=Math.max(box.y,Math.min(box.y+box.height,p.pos.y));const length=Math.hypot(endX-p.pos.x,endY-p.pos.y)||1;const markerRadius=(p.key===currentKey?16:p.key===finalKey?10:6)*scale;const startX=p.pos.x+markerRadius*(endX-p.pos.x)/length,startY=p.pos.y+markerRadius*(endY-p.pos.y)/length;
 labels+=`<g class="word-label${!p.previous&&(state.won?(p.key===teeKey||p.key===finalKey||p.word===state.waypoint?.word&&state.history.some(h=>h.waypoint_reached&&h.word===p.word)):(p.key===currentKey||p.key===targetKey))?' active-word-label':''}${p.previous?' previous-word-label previous-attempt-element':''}${p.waypointReference?' waypoint-reference-label':''}" ${p.waypointReference?'data-waypoint-reference="true"':''} data-label-word="${esc(p.word)}" data-lie-key="${esc(p.key)}" ${p.key===currentKey?'data-focus-entry="true"':''} ${p.resumeThrough!==undefined?`data-resume-through="${p.resumeThrough}" role="button" tabindex="0" aria-label="Retry from ${esc(p.word.toUpperCase())}"`: p.key===currentKey?`role="button" tabindex="0" aria-label="${state.current===state.start?'Play your first word':'Play your next word'}"`:''} opacity="${p.retryFuture?.7:p.failed?.72:1}">${p.previous||p.waypointReference?'':`<path d="M${startX} ${startY} L${endX} ${endY}" stroke="#8ba17e" stroke-width="1"/>`}<g class="label-body"><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="5" fill="#f4f7ee" fill-opacity=".96"/><text x="${box.textX}" y="${box.textY}" dominant-baseline="central" text-anchor="middle" class="planet-label">${esc(p.word.toUpperCase())}</text></g></g>`;
 }
 $('map').insertAdjacentHTML('beforeend',labels);
 $('map').setAttribute('viewBox',`0 0 ${d.width} ${layout.height}`);
 $('map').style.minHeight='';$('map').dataset.teeWord=state.start;
 const highest=Math.min(d.holeY-52*scale,d.teeY-teeOffset-6*scale,...[...layout.labels.values()].map(box=>box.y)),lowest=Math.max(d.teeY+teeOffset+6*scale,...[...layout.labels.values()].map(box=>box.y+box.height));
 const screenScale=$('map').clientWidth/d.width,lift=completedCourseLift(state.won,highest,screenScale),card=document.querySelector('.map-card');
 card.style.setProperty('--result-course-lift',`${lift}px`);
 card.style.setProperty('--result-card-overlap',`${state.won?completedCardOverlap($('map').clientHeight,lowest,screenScale,lift):36}px`);
 moveWordLabels(previousLabels);renderRetryTip(planets,layout,d,currentKey,preview);syncControlTrees();syncMapOverlay();
}
function telemetry(){
 const last=shownEvent;
 $('telemetry').textContent=JSON.stringify({current:state.current,proposed:last?.word??null,target:state.target,word_model:state.word_model??'current',headwind:state.headwind??null,shot_outcome:last?.outcome??null,destination_target:last?.leg_target??state.target,waypoint_finish:last?.waypoint_finish??false,automatic_finish_contact:last?.automatic_shot?.launch??null,contact_made:last?.connected??null,safe_landing:last?.safe??null,contact_cosine:last?.launch??null,destination_cosine:last?.destination??null,shot_mode:state.mode,rules:state.rules,finish_mode:state.finish_mode??'green',finish_reason:last?.finish_reason??null,automatic_finish:last?.automatic_shot?.outcome??null,required_contact:last?.required??state.threshold,trip_fraction:last?.trip_fraction??null,hub_surcharge:last?.hub_surcharge??null,green_threshold:state.threshold,short_shot:state.launch_min,long_shot:state.launch_max,water_boundary:state.best_progress-state.backward_allowance,progress:state.progress,starting_boundary:state.baseline,inside_arrival_zone:last?.inside??null,attempts:state.attempts,successful_route:state.route,failed_attempts:state.history.filter(e=>!e.success).map(e=>({word:e.word,launch:e.launch,destination:e.destination,reason:e.outcome==='water'?'water hazard':e.outcome==='miss'?'weak contact':e.forward===false?'backward shot':'previous course boundary'}))},null,2);
}
function returnToHoleHeader(){
 if(!narrow())return;
 requestAnimationFrame(()=>requestAnimationFrame(()=>{
  if(document.activeElement===$('word')||holeResult()||courseResult())return;
  const header=document.querySelector('.mission');
  if(shouldReturnHoleHeader(header.getBoundingClientRect(),window.visualViewport?.height??innerHeight))header.scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
 }));
}
let holePanelMode='log';
function setHoleLog(open,{returnToPlay=false,mode='log'}={}){
 if(open&&(holeResult()||courseResult()))return;
 if(open)holePanelMode=mode;
 const wasOpen=!$('hole-attempt-log').hidden;
 $('hole-attempt-log').hidden=!open;
 setBag(false);
 document.querySelector('.map-card').classList.toggle('attempt-log-open',open);syncMapOverlay();
 requestAnimationFrame(syncControlTrees);
 if(open){if(narrow())leaveWordEntry();renderHoleLog();requestAnimationFrame(()=>requestAnimationFrame(fitHoleLog));}
 else{document.querySelector('.hole-play-area').style.removeProperty('--hole-panel-height');if(wasOpen&&returnToPlay)returnToHoleHeader();}
}
function fitHoleLog(){
 syncMapOverlay();
 const panel=$('hole-attempt-log');if(panel.hidden)return;
 const card=panel.querySelector('.hole-log-card'),rows=$('hole-log-rows'),frame=document.querySelector('.hole-play-area');
 const content=card.getBoundingClientRect().height-rows.clientHeight+rows.scrollHeight;
 const inset=parseFloat(getComputedStyle(panel).top)||18;
 const height=holePanelHeight($('map').getBoundingClientRect().height,content,window.visualViewport?.height??innerHeight,inset);
 frame.style.setProperty('--hole-panel-height',`${height}px`);requestAnimationFrame(syncControlTrees);
}
function placeHoleLog(){
 const result=holeResult()||courseResult(),panel=$('hole-attempt-log'),host=document.querySelector('.hole-play-area');
 if(panel.parentElement!==host){setHoleLog(false);host.append(panel);}
 document.querySelector('.hole-tools').hidden=result;
 if(result){setBag(false);setHoleLog(false);}syncMapOverlay();
}
function bestRouteState(){
 let recorded;
 if(inCourse())recorded=bestAttempt(rounds.hole)?.state;
 else{
  const best=bestHoleResult(flightLog.data.journeys,state);
  recorded=state.won&&!practising()&&state.challenge.attempt===best?.attempt?state:flightLog.data.journeys.find(j=>j.state.won&&!j.state.challenge?.practice&&j.state.challenge?.id===state.challenge?.id&&j.state.challenge.attempt===best?.attempt)?.state;
 }
 if(recorded?.won)return recorded;
 // A completed practice route is still useful when no scoring route was holed.
 return [state,...flightLog.data.journeys.map(j=>j.state)].filter(s=>s.won&&s.challenge?.id===state.challenge?.id).sort((a,b)=>a.attempts-b.attempts||a.challenge.attempt-b.challenge.attempt)[0]??null;
}
function renderHoleLog(){
 $('close-attempt-log').setAttribute('aria-label',holePanelMode==='tips'?'Close how to play':holePanelMode==='route'?'Close best route':'Close attempt log');
 if(holePanelMode==='tips'){
  $('hole-log-title').textContent='How to play';$('hole-log-remaining').hidden=true;
  $('hole-log-rows').innerHTML=`<li class="bag-tip"><h3>Hitting the ball</h3><p>The word you play must connect strongly enough to the <strong>BALL WORD</strong> for your shot to hit.</p></li><li class="bag-tip"><h3>Shot distance</h3><p>The more strongly your played word relates to the <strong>TARGET WORD</strong>, the further your shot will advance.</p></li><li class="bag-tip"><h3>Here's the key</h3><p>Longer shots need a stronger connection to the <strong>BALL WORD</strong> to hit. Shorter shots can succeed with weaker links and help set up your next move.</p></li><li class="bag-tip"><h3>Dogleg holes</h3><p>On longer holes, the dogleg word is your initial <strong>TARGET WORD</strong>. You need to land within the shaded dogleg area before the active target switches to the flag.</p><p>You can play the dogleg word itself, or find another word that lands in the zone while potentially setting you up for an easier shot towards the flag!</p></li><li class="bag-tip"><h3>Attempts</h3><p>You have multiple attempts to achieve your best stroke score on each hole, and can keep trying even after holing out. The number of scoring attempts depends on the hole:</p><table class="how-to-attempts"><thead><tr><th scope="col">Hole</th><th scope="col">Attempts</th></tr></thead><tbody><tr><td>Par 3</td><td>10</td></tr><tr><td>Par 4</td><td>15</td></tr><tr><td>Par 5</td><td>20</td></tr></tbody></table><p>A missed shot ends your current attempt, but you can try again from your last lie.</p><p><strong>Tap any word you've landed on, or the tee, to try a different route.</strong> This only uses another attempt when you play your next word.</p></li><li class="bag-tip"><h3>Scoring</h3><p>Your <strong>best stroke score</strong> across all attempts is the one that counts. <strong>Scores are capped at double bogey</strong> for each hole.</p><p>Once you've used all your scoring attempts, your best score is locked in. You can continue playing the hole, but your recorded score won't change.</p></li>`;
  if(rollingMode)$('hole-log-rows').querySelector('.bag-tip:last-child p:last-child').textContent='Played daily holes gain +3 attempts when you return on a later UTC day. Exhausted holes pause until more attempts are available. Submitting locks all nine holes until 00:00 UTC; unfinished holes receive double bogey for that submission only. Retired practice holes have unlimited attempts.';
  return;
 }
 if(holePanelMode==='route'){
  const best=bestRouteState();$('hole-log-title').textContent='Your best route';
  $('hole-log-remaining').hidden=!best;$('hole-log-remaining').textContent=best?`${best.attempts} ${best.attempts===1?'stroke':'strokes'} · ${best.challenge.practice?'Practice attempt':'Attempt'} ${best.challenge.attempt}`:'';
  $('hole-log-rows').innerHTML=best?`<li class="bag-route">${best.route.map(w=>esc(w.toUpperCase())).join(' → ')}</li>`:'<li class="hole-log-empty">Finish the hole to record your best route here.</li>';
  return;
 }
 const remaining=remainingHoleAttempts(state),hole=inCourse()?rounds.active.index+1:1;
 $('hole-log-title').textContent=`HOLE ${hole} - Attempts Log`;
 $('hole-log-remaining').textContent=practising()?'Practice':`${remaining??0} ${remaining===1?'attempt':'attempts'} remaining`;
 $('hole-log-remaining').hidden=false;
 const rows=holeAttemptLog(flightLog.data.journeys,state,flightLog.active?.id);
 $('hole-log-rows').innerHTML=rows.map(row=>`<li class="hole-log-attempt"><div class="hole-log-attempt-heading"><strong>${row.practice?'Practice '+(row.number-attemptLimit(state.challenge.par)):'Attempt '+row.number}</strong><span>${esc(row.result)}</span></div>${row.from!==state.start?`<p class="hole-log-from">From ${esc(row.from.toUpperCase())}</p>`:''}${row.shots.length?`<ul>${row.shots.map(shot=>`<li><span>${esc(shot.origin.toUpperCase())} <span class="hole-log-arrow">→</span> <strong>${esc(shot.word.toUpperCase())}</strong></span><span class="hole-log-outcome${['Miss','Backwards','Not allowed','Not played'].includes(shot.result)?' missed':''}">${esc(shot.result)}</span></li>`).join('')}</ul>`:'<p class="hole-log-empty">No words tried yet.</p>'}</li>`).join('')||'<li class="hole-log-empty">Your tried words will appear here.</li>';
}
$('map').addEventListener('pointerdown',()=>{if(!holeResult()&&!courseResult()&&!$('hole-attempt-log').hidden)setHoleLog(false,{returnToPlay:true});});
$('close-attempt-log').onclick=()=>setHoleLog(false,{returnToPlay:true});
function renderLog(){
 if(state)renderHoleLog();
 const journeys=flightLog.data.journeys;
 $('restore-log').hidden=!flightLog.backup?.journeys?.length&&!flightLog.backup?.bridgeFeedback?.length;
 if(!journeys.some(j=>j.id===selectedLogId))selectedLogId=flightLog.data.activeId;
 $('log-journey').innerHTML=[...journeys].reverse().map(j=>`<option value="${esc(j.id)}" ${j.id===selectedLogId?'selected':''}>${esc(holeLabel(j.state))} · ${j.state.attempts} ${j.state.attempts===1?'shot':'shots'} · ${j.state.won?'completed':j.state.challenge_failed?'attempt ended':'in progress'}${j.state.challenge?' · attempt '+j.state.challenge.attempt:''} · ${esc(new Date(j.startedAt).toLocaleString())}</option>`).join('');
 const journey=journeys.find(j=>j.id===selectedLogId);
 const submissions=journey?.entries.filter(e=>!e.event?.automatic).length??0;
 $('log-summary').textContent=journey?`${journey.state.attempts} ${journey.state.attempts===1?'shot':'shots'} · ${submissions} ${submissions===1?'submission':'submissions'} · ${journey.state.mode==='distance'?'distance shots · green':'fixed strength'} ${journey.state.threshold}`:'Your shots will appear here.';
 $('log-entries').innerHTML=journey?.entries.map(entry=>`<li><div class="log-entry-heading"><strong>${entry.event?'#'+entry.event.attempt:'No shot'} · ${esc(entry.origin)} → ${esc(entry.word)}</strong><span>${esc(outcome(entry))}</span></div>${entry.event?`<p>${entry.assumed?'Carried forward from the previous attempt · one shot counted':entry.event.automatic?'Automatic finish · one shot counted':entry.event.waypoint_reached?'Waypoint reached · target changed':entry.event.outcome==='backtrack'?'Returned to a previously reached word':entry.event.connected===false?'Weak contact':entry.event.outcome==='water'?'Good contact, wrong direction':entry.event.outcome==='recovery'?'Small recovery shot':entry.event.success?'Ball landed':'Ball stayed put'}${entry.event.inside&&!entry.event.waypoint_reached?(entry.event.success?' · On the green':' · Aimed at green'):''}</p>`:''}</li>`).join('')||'<li class="subtle">No shots yet.</li>';
 renderSkill(journey);renderBridgeFeedback();
 $('log-storage').textContent=flightLog.warning||'Saved in this browser. Download your scorecards to keep or share them.';
}
function updateArrivalSkill(){
 if(!state)return;
 if(inCourse()){renderCourseOutcome();return;}
 $('arrival-attempt-cell').hidden=false;
 const labels=document.querySelectorAll('#arrival-banner .scorecard-grid .scorecard-label'),best=bestHoleResult(flightLog.data.journeys,state);
 labels[0].textContent='BEST STROKES';labels[1].textContent='ON ATTEMPT';
 $('arrival-skill').hidden=!holeResult();renderStrokeScore($('arrival-skill-value'),state.challenge?.par??3,best?.score??null);$('arrival-attempt').textContent=best?.attempt??'—';
 renderBestRoute(bestRouteState());
}
function renderSkill(){ $('skill-panel').hidden=true;updateArrivalSkill(); }
function syncPuzzleSelection(){
 const index=config.puzzles.findIndex(p=>p.start===state.start&&p.target===(state.final_target??state.target)&&p.waypoint?.word===state.waypoint?.word&&windKey(p)===windKey(state)&&courseSettings(p).threshold===(state.final_threshold??state.threshold)&&(p.mode||'fixed')===state.mode);
 $('puzzle').querySelector('option[value="custom"]')?.remove();
 if(index<0){const option=document.createElement('option');option.value='custom';option.textContent=inCourse()?`${rounds.active.name} · Hole ${rounds.active.index+1}`:`${holeLabel(state)} (custom)`;$('puzzle').append(option);$('puzzle').value='custom';}
 else $('puzzle').value=String(index);
}
function renderAttemptCounter(){renderBag();}
function update(){
 $('chip-range-note').hidden=!showChipRange||!!state?.waypoint&&state.stage===0;
 renderBag();
 const prompt=state.current===state.start?'Play your first word':'Play your next word';$('word').placeholder=prompt;document.querySelector('label[for="word"]').textContent=prompt;
 $('word-model').value=state.word_model??'';
 $('model-info').textContent=`${modelName(state)} / ${config.vocabulary.toLocaleString()} WORDS · ${config.release}`;
 $('hole-number').textContent=rollingMode&&!inCourse()?'PRACTICE':`HOLE ${inCourse()?rounds.active.index+1:1}`;$('hole-par').textContent=`(PAR ${state.challenge?.par??3})`;renderAttemptCounter();
 for(const label of document.querySelectorAll('[data-current-word]'))label.textContent=state.current.toUpperCase();
 for(const label of document.querySelectorAll('[data-target-word]'))label.textContent=state.target.toUpperCase();
 $('headwind-note').hidden=!state.headwind;
 $('headwind-note').textContent=state.headwind?`Headwind: ${state.headwind.word.toUpperCase()} · ${Math.round(state.headwind.strength*100)}% topic reduction`:'';
 $('lab-start').value=state.start;$('lab-target').value=state.target;$('threshold').value=state.threshold;$('launch-mode').value=state.mode;$('launch-min').value=state.launch_min;$('launch-max').value=state.launch_max;
 document.querySelector('.controls').hidden=holeResult()||courseResult();
 $('arrival-banner').hidden=!(holeResult()||courseResult());$('arrival-actions').hidden=!(holeResult()||courseResult());
 document.querySelector('.map-card').classList.toggle('arrived',holeResult()||courseResult());document.querySelector('.map-card').classList.toggle('course-mode',inCourse());placeHoleLog();
 if(holeResult()){
  $('arrival-title').textContent=state.won?`Holed in ${state.attempts} ${state.attempts===1?'stroke':'strokes'}!`:'Hole score';
  $('arrival-detail').textContent='';$('arrival-detail').hidden=true;
  $('arrival-attempt').textContent=state.challenge?.attempt??1;$('arrival-par').textContent=`PAR ${state.challenge?.par??3}`;
 }
 renderNotice();
 recordCourseState();map();telemetry();renderLog();updateArrivalSkill();
 if(!inCourse()){$('round-scorecard').hidden=true;$('replay-hole').hidden=false;$('replay-hole').textContent='TRY AGAIN';$('next-hole').textContent='NEXT HOLE';}
 renderScoringStatus();
 styleResultButtonLabels();
 if(rollingMode&&rollingUI){rollingUI.render(!inCourse());renderRollingResult();}
 renderResultContext();
}
function renderResultContext(){
 const context=resultContext(justHoled,state?.won,roundSummary()),moment=context==='just-now';
 $('arrival-context').textContent=moment?'JUST NOW':'SCORECARD';$('arrival-context').hidden=context==='review';
 $('arrival-title').hidden=context==='review';if(context==='review')$('arrival-title').textContent='Your best result';
 $('arrival-banner').classList.toggle('result-review',context==='review');
}
function renderRollingResult(){
 if(!inCourse()){
  const best=lockedHoleResult();if(holeResult()){const labels=document.querySelectorAll('#arrival-banner .scorecard-grid .scorecard-label');labels[0].textContent='BEST STROKES';renderStrokeScore($('arrival-skill-value'),state.challenge.par,best?.score??null);$('arrival-attempt').textContent=best?.attempt??'—';}
  $('bag-scoring-status').textContent='Practice hole · unlimited attempts';
  $('result-attempts-remaining').textContent='Retired practice hole · unlimited attempts';
  $('next-hole').textContent='ANOTHER PRACTICE HOLE';return;
 }
 const submitted=rounds.store.submissions[rounds.day];
 if(submitted){
  $('replay-hole').hidden=true;$('next-hole').textContent='PRACTICE HOLES';
  $('result-attempts-remaining').hidden=true;
  if(roundSummary())$('arrival-skill-value').textContent=`${submitted.total} strokes`;
  else{
   const posted=submitted.rows.find(h=>h.id===rounds.hole.challengeId),labels=document.querySelectorAll('#arrival-banner .scorecard-grid .scorecard-label');
   labels[0].textContent='BEST STROKES';labels[1].textContent='ON ATTEMPT';
   renderStrokeScore($('arrival-skill-value'),state.challenge.par,posted?posted.strokes-state.challenge.par:null);
   $('arrival-attempt').textContent=posted?.bestAttempt??'—';
  }
 }else if(!rounds.playable(state)){
  $('replay-hole').hidden=true;$('result-attempts-remaining').textContent='Return on a later UTC day for +3 attempts';
 }
 styleResultButtonLabels();
}
function courseScoringFinished(){
 return inCourse()&&(rounds.active.finished||Math.max(0,...rounds.hole.attempts.filter(a=>a.ended).map(a=>a.number))>=attemptLimit(state.challenge.par));
}
function renderScoringStatus(){
 const remaining=inCourse()&&!practising()?Math.max(0,attemptLimit(state.challenge.par)-Math.max(0,...rounds.hole.attempts.filter(a=>a.ended).map(a=>a.number))):remainingHoleAttempts(state);
 $('result-attempts-remaining').textContent=practising()||remaining===0?'Scoring attempts exhausted':`${remaining??0} scoring ${remaining===1?'attempt':'attempts'} remaining`;
 $('result-attempts-remaining').hidden=roundSummary();
 renderBag();
}
function lockedHoleResult(saved=state){
 if(rollingMode&&!inCourse()){const won=flightLog.data.journeys.filter(j=>j.state.challenge?.id===saved.challenge.id&&j.state.won).sort((a,b)=>a.state.attempts-b.state.attempts)[0]?.state;return won?{score:Math.min(2,won.attempts-won.challenge.par),attempt:won.challenge.attempt}:null;}
 if(inCourse()){const best=bestAttempt(rounds.hole);return {score:best?attemptResult(best,saved.challenge.par):2,attempt:best?.number??saved.challenge.attempt};}
 return bestHoleResult(flightLog.data.journeys,saved)??{score:2,attempt:saved.challenge.attempt};
}
function keepPractising({focusEntry=false,automatic=false,fromTee=false}={}){
 if(rollingMode&&inCourse()){rollingUI?.lockMessage();return;}
 if(busy||!(courseExhausted()||courseScoringFinished()||inCourse()&&rounds.hole.locked))return;
 if(!automatic)leaveWordEntry({anchor:!resultNavigationActive});
 const saved=structuredClone(state),locked_result=lockedHoleResult(saved);
 saved.challenge={...saved.challenge,attempt:Math.max(saved.challenge.attempt,attemptLimit(saved.challenge.par),...flightLog.data.journeys.filter(j=>j.state.challenge?.id===saved.challenge.id).map(j=>j.state.challenge.attempt)),practice:true,locked_result};
 saved.continuous_play=true;
 const finish=saved.history.findIndex(h=>!h.success||h.won||h.automatic),through=fromTee?0:finish<0?saved.history.length:finish;
 lock(true);clearTimeout(retryTimer);setHoleLog(false);retryPreview=null;
 try{
  state=client.retryNow(saved,through,saved.challenge.attempt+1).state;
  selectedLogId=flightLog.begin(state,modelName(state),modelHash(state)).id;
  shownEvent=null;noticeDismissed=false;if(!automatic)activeNotice='';$('word').value='';update();$('status').textContent='';
 }finally{lock(false);}
 if(focusEntry)$('word').focus({preventScroll:true});

}
let scoringEntryKey='',scoringEntryText='';
function entryScoringNotice(){
 if(rollingMode&&!inCourse())return desktopInteraction()||document.body.classList.contains('word-entry-active')?'Practice hole · unlimited attempts':'';
 if(!state||state.challenge_failed||holeResult()||courseResult())return '';
 const active=document.body.classList.contains('word-entry-active');
 if(!desktopInteraction()&&!active)return '';
 if(busy)return desktopInteraction()&&scoringEntryKey.startsWith(state.challenge.id+':')?scoringEntryText:'';
 const saved=retryPreview?.original.state??state,remaining=remainingHoleAttempts(saved);
 const key=`${saved.challenge.id}:${saved.challenge.attempt}:${saved.history.length}:${!!saved.challenge.practice}`;
 if(key!==scoringEntryKey){
  scoringEntryKey=key;scoringEntryText=scoringReminder(remaining);
  if(saved.challenge.practice){
   const seen=flightLog.data.practiceIntroductions??=[];
   if(!seen.includes(saved.challenge.id)){scoringEntryText=SCORING_CLOSED;seen.push(saved.challenge.id);flightLog.save();}
  }
 }
 return scoringEntryText;
}
function renderBag(){
 if(!state)return;
 $('bag-current').textContent=currentStrokeText(state);
 const best=lockedHoleResult(state)??{score:2,attempt:1},hasBest=practising()||!!(inCourse()?bestAttempt(rounds.hole):bestHoleResult(flightLog.data.journeys,state));
 $('bag-best').textContent=hasBest?`${state.challenge.par+best.score} (${resultText(best.score)})`:'—';
 const counterState=retryPreview?.original.state??state,remaining=remainingHoleAttempts(counterState);
 $('bag-scoring-status').textContent=counterState.challenge?.practice?PRACTICE_MODE:`${remaining} scoring ${remaining===1?'attempt':'attempts'} remaining`;
 if(rollingMode&&!inCourse()){$('bag-scoring-status').textContent='Practice hole · unlimited attempts';if(!lockedHoleResult())$('bag-best').textContent='—';}
 $('bag-return-tee').disabled=busy;
 $('bag-best-route').disabled=busy||!bestRouteState();
}
function syncMapOverlay(){
 const panel=$('hole-attempt-log'),frame=document.querySelector('.hole-play-area'),card=document.querySelector('.map-card');
 const overlay=!panel.hidden&&panel.parentElement===frame,bag=!$('golf-bag-menu').hidden;
 card.classList.toggle('hole-panel-overlay',overlay);card.classList.toggle('bag-open',bag);
 $('map-scrim').hidden=!(overlay||bag);$('map').toggleAttribute('inert',overlay||bag);
 $('map').setAttribute('aria-hidden',String(overlay||bag));
 for(const label of $('map').querySelectorAll('[role="button"]'))label.setAttribute('tabindex',overlay||bag?'-1':'0');
}
$('map-scrim').addEventListener('pointerdown',event=>{event.preventDefault();event.stopPropagation();});
$('map-scrim').addEventListener('click',event=>{event.preventDefault();event.stopPropagation();setBag(false);if(document.querySelector('.map-card').classList.contains('hole-panel-overlay'))setHoleLog(false);});
function setBag(open){
 if($('golf-bag-menu').hidden===!open)return;
 if(open&&(!state||holeResult()||courseResult()))return;
 if(open&&narrow())leaveWordEntry();
 $('golf-bag-menu').hidden=!open;$('toggle-bag').setAttribute('aria-expanded',String(open));syncMapOverlay();
 if(open)renderBag();
 requestAnimationFrame(syncControlTrees);
}
$('toggle-bag').addEventListener('pointerdown',event=>{if(event.button!==0||event.isPrimary===false)return;event.preventDefault();setBag($('golf-bag-menu').hidden);});
$('toggle-bag').onclick=event=>{if(event.detail===0)setBag($('golf-bag-menu').hidden);};
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#golf-bag-menu,#toggle-bag'))setBag(false);});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){setBag(false);if(document.querySelector('.map-card').classList.contains('hole-panel-overlay'))setHoleLog(false);}});
$('bag-tips').onclick=()=>setHoleLog(true,{mode:'tips'});
function openShotHelp(){
 if(busy||!state)return;
 leaveWordEntry();setHoleLog(true,{mode:'tips'});
}
$('shot-context-help').addEventListener('pointerdown',event=>{
 if(event.button!==0||event.isPrimary===false)return;
 event.preventDefault();event.stopPropagation();openShotHelp();
});
$('shot-context-help').onclick=event=>{
 event.preventDefault();event.stopPropagation();
 if(event.detail===0)openShotHelp();
};
$('bag-best-route').onclick=()=>setHoleLog(true,{mode:'route'});
$('bag-hole-log').onclick=()=>{setBag(false);setHoleLog(true);};
let returnTeeTipShown=false;
try{returnTeeTipShown=sessionStorage.getItem('word-golf-return-tee-tip-shown')==='true';}catch{}
function showReturnTeeTip(){
 if(returnTeeTipShown)return;
 returnTeeTipShown=true;try{sessionStorage.setItem('word-golf-return-tee-tip-shown','true');}catch{}
 activeNotice='Did you know: you can tap any previous lie to restart an attempt from there.';noticeDismissed=false;renderNotice();
}
$('bag-return-tee').onclick=()=>{setBag(false);if(state.history.length){retryFromWord(0,{focusEntry:false});returnToHoleHeader();}showReturnTeeTip();};
$('word').addEventListener('focus',()=>{setBag(false);if(!$('hole-attempt-log').hidden&&!holeResult()&&!courseResult())setHoleLog(false);});
// Observe entry emphasis without changing keyboard, focus or anchoring handlers.
let scoringEntryActive=document.body.classList.contains('word-entry-active');
new MutationObserver(()=>{
 const active=document.body.classList.contains('word-entry-active');
 if(active===scoringEntryActive)return;
 scoringEntryActive=active;if(!desktopInteraction())scoringEntryKey='';renderNotice();
}).observe(document.body,{attributes:true,attributeFilter:['class']});
function renderNotice(){
 const entry=entryScoringNotice(),desktop=desktopInteraction(),message=!desktop&&entry?entry:activeNotice;
 const note=$('entry-scoring-note');note.textContent=desktop?entry:'';note.hidden=!desktop||!entry;
 document.querySelector('.course-feedback').classList.toggle('entry-scoring-notice',!desktop&&!!entry);
 $('shot-notice').hidden=(!entry&&noticeDismissed)||!message||holeResult()||courseResult();
 $('shot-notice').classList.remove('miss-notice');
 const text=message.replace(/^Miss!\s*/i,'');
 $('shot-notice-text').replaceChildren(...text.split(/(\b[A-Z][A-Z’'\-]*\b)/g).filter(Boolean).map(part=>{if(/^[A-Z][A-Z’'\-]*$/.test(part)){const word=document.createElement('strong');word.textContent=part;return word;}return document.createTextNode(part);}));
}
async function newGame(puzzle,{notice=''}={}){
 if(busy)return false;
 clearTimeout(retryTimer);setBag(false);retryPreview=null;setHoleLog(false);
 if(rollingMode&&puzzle.challenge?.rolling){const h=rounds.store.bank[puzzle.challenge.id];if(h)puzzle={...puzzle,challenge:{...puzzle.challenge,attempt_limit:h.allowance}};}
 puzzle=courseSettings(puzzle);
 puzzle={...puzzle,word_model:''};
 puzzle.challenge??={version:STROKE_PLAY,par:puzzle.par??state?.challenge?.par??3,attempt:1,id:crypto.randomUUID()};
 lock(true);$('status').textContent=puzzle.word_model==='ls15-v1'?'Preparing 15% LS trial…':puzzle.word_model?'Preparing ABTT trial (about 14 MB on first use)…':'';
 try{const data=await api('new',{...puzzle,finish_mode:'range'});state=data.state;justHoled=false;shownEvent=null;activeNotice=notice;noticeDismissed=false;resetBridgeView();selectedLogId=flightLog.begin(state,modelName(state),modelHash(state)).id;$('copy-fallback').hidden=true;$('log-feedback').textContent='';refreshSavedHoles();syncPuzzleSelection();update();$('word').value='';$('status').textContent='';return true;}
 catch(error){$('word-model').value=state?.word_model??'';$('status').textContent=error.message;return false;}finally{lock(false);if(state?.won||state?.challenge_failed)$('launch').disabled=true;}
}
function bezier(a,b,t){return {x:(1-t)**2*a.x+2*(1-t)*t*(a.x+b.x)/2+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*(Math.min(a.y,b.y)-65)+t*t*b.y};}
async function animate(event){
 const a=ballPosition(state.current),b=event.golden_holed?position(state.final_target??state.target):ballPosition(event.word,event),ball=$('golf-ball');
 if(event.success){const originDot=[...$('map').querySelectorAll('[data-lie-dot]')].find(node=>node.dataset.lieKey===currentLieKey(state));originDot?.removeAttribute('visibility');}
 if(reduced)return;
 const kind=event.golden_holed?'golden':event.automatic?automaticFinishMotion(position(event.origin),dimensions()):event.success&&event.word===(state.final_target??state.target)?'chip':'flight';
 ball.setAttribute('data-motion',kind);
 const duration=event.outcome==='miss'?450:kind==='golden'?1850:kind==='putt'?850:kind==='chip'?1350:1000;
 await new Promise(resolve=>{const start=performance.now();function frame(now){const t=Math.min(1,(now-start)/duration);let point=a;
 if(event.success){
  const pose=shotMotion(kind,a,b,t,{tee:event.origin===state.start,...(event.golden_holed?{landingFraction:goldenLanding(a,b,dimensions()).fraction}:{})});point=pose;
  $('ball-body').setAttribute('transform',`translate(0,${-pose.lift}) scale(${pose.scale})`);
  $('ball-dimples').setAttribute('transform',`rotate(${pose.rotation})`);
  $('ball-shadow').setAttribute('transform',`translate(0,18) scale(${pose.shadowScale}) translate(0,-18)`);
  $('ball-shadow').setAttribute('opacity',String(pose.shadowOpacity));
 }
 else if(event.outcome==='miss')point={x:a.x+Math.sin(t*Math.PI*4)*(1-t)*4,y:a.y};
 else point=bezier(a,b,t<.5?t*1.1:(1-t)*1.1);
 ball.setAttribute('transform',`translate(${point.x},${point.y})`);
 if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
}

async function fadePreviousLabels(){
 const labels=[...document.querySelectorAll('.previous-attempt-element,[data-previous-range]')];
 if(!reduced)await Promise.all(labels.map(node=>node.animate([{opacity:Number(node.getAttribute('opacity')??1)},{opacity:0}],{duration:220,fill:'forwards'}).finished.catch(()=>{})));
 for(const node of labels)node.remove();
}
async function submit(word){
 if(!String(word??'').trim()||busy||!state||state.won||state.challenge_failed||(inCourse()&&rounds.active.finished&&!practising()))return false;
 if(rollingMode&&!rollingCanPlay())return false;
 setBag(false);if(!$('hole-attempt-log').hidden)setHoleLog(false);committingRetry=true;leaveWordEntry({anchor:true});committingRetry=false;lock(true);noticeDismissed=false;$('shot-notice').hidden=true;renderAttemptCounter();
 try{
 let data;try{data=await api('submit',{word});}catch(error){if(!retryPreview){flightLog.record(word,state,null,error.message);selectedLogId=flightLog.data.activeId;renderLog();}throw error;}
 commitRetry();delete flightLog.active.auto_retry;const event=data.event;flightLog.record(word,data.state,event);if(data.state.challenge_failed){delete flightLog.active.notice_dismissed;flightLog.save();}selectedLogId=flightLog.data.activeId;await fadePreviousLabels();
 // Keep the old state visible until the proposal and flight have played out.
 if(event.outcome||event.forward!==false){map(event);$('status').textContent=`Playing ${event.word.toUpperCase()}…`;
 await delay(reduced?150:350);await animate(event.outcome==='water'?{...event,outcome:'miss'}:event);}
 if(event.waypoint_reached){$('status').textContent=`${data.state.waypoint.word.toUpperCase()} reached. Next target: ${data.state.final_target.toUpperCase()}.`;const zone=$('waypoint-zone');if(zone&&!reduced)await zone.animate([{opacity:1},{opacity:0}],{duration:900,fill:'forwards'}).finished.catch(()=>{});else await delay(500);resetBridgeView();}
 if(event.automatic_shot){
   state={...data.state,current:event.word,won:false,attempts:event.attempt,route:data.state.route.slice(0,-1),automatic_shots:[]};map();renderAttemptCounter();for(const label of document.querySelectorAll('[data-current-word]'))label.textContent=state.current.toUpperCase();for(const label of document.querySelectorAll('[data-target-word]'))label.textContent=state.target.toUpperCase();$('status').textContent='Ball settling…';
   await delay(reduced?250:1100);$('status').textContent='Lining up the finish…';renderAttemptCounter();await animate(event.automatic_shot);
 }

 state=data.state;justHoled=!!state.won;shownEvent=event;activeNotice=state.challenge_failed?noticeForAttempt(event,data.state):event.waypoint_reached&&!event.won?`Dogleg reached! Now aim for ${state.target.toUpperCase()}.`:'';update();$('word').value='';
 if(event.won&&!desktopInteraction())window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});
 $('status').textContent=event.waypoint_reached&&!event.won?`Waypoint reached. Aim for ${state.target.toUpperCase()} now.`:event.won||['water','miss'].includes(event.outcome)?'':event.outcome==='backtrack'?`Returned to ${event.word}.`:event.outcome==='recovery'?`Recovered to ${event.word}.`:event.success?`Landed on ${event.word}.`:'Ball stayed put. One shot counted.';

 if(state.challenge_failed)scheduleRetry();


 return true;
 }catch(error){renderAttemptCounter();activeNotice=entryNotice(error,state.current);noticeDismissed=false;renderNotice();return false;}
 finally{lock(false);$('word').disabled=!!state.challenge_failed;if(state.won||state.challenge_failed)$('launch').disabled=true;else if(desktopInteraction())$('word').focus({preventScroll:true});}
}
function scheduleRetry(){
 if(rollingMode&&inCourse()&&!rounds.playable(state)){clearTimeout(retryTimer);rollingUI?.lockMessage();return;}
 clearTimeout(retryTimer);if(inCourse()&&rounds.active.finished&&!practising())return;if(courseExhausted()){retryTimer=setTimeout(()=>keepPractising({automatic:true}),0);return;}const failed=flightLog.active?.id;
 retryTimer=setTimeout(async()=>{
  if(busy||!state.challenge_failed||flightLog.active?.id!==failed)return;
  const saved=state,notice=activeNotice,prefix=retryLieThrough(saved);
  const attempt=inCourse()&&!practising()?rounds.settings().challenge.attempt:saved.challenge.attempt+1;
  lock(true);
  try{
   const data=await api('retry-prefix',{state:{...saved,continuous_play:true},through:prefix,attempt});state=data.state;
   selectedLogId=flightLog.begin(state,modelName(state),modelHash(state)).id;
   const source=flightLog.data.journeys.find(j=>j.id===failed);
   flightLog.active.entries=structuredClone(source?.entries.filter(e=>e.event?.success&&e.event.attempt<=prefix)??[]);
   for(const entry of flightLog.active.entries){entry.assumed=true;entry.event.assumed=true;entry.assumed_from=failed;}
   flightLog.active.auto_retry=prefix>0;flightLog.save();shownEvent=null;activeNotice=notice;noticeDismissed=false;$('word').value='';update();$('status').textContent='';
  }catch(error){$('status').textContent=error.message;}finally{lock(false);}
 },0);
}
$('launch-form').addEventListener('submit',event=>{event.preventDefault();submit($('word').value);});
$('lab-form').onsubmit=event=>{event.preventDefault();leaveCourse();newGame({start:$('lab-start').value,target:$('lab-target').value,threshold:Number($('threshold').value),mode:$('launch-mode').value,launch_min:Number($('launch-min').value),launch_max:Number($('launch-max').value),...(state.word_model?{word_model:state.word_model}:{}),...(state.headwind?{headwind:state.headwind}:{})});};
$('new-game').onclick=()=>{leaveCourse();newGame(bankRestartSettings(state,config.puzzles[0],config.puzzles));};
async function playFromResult(puzzle,{sameHole=false,preserveScroll=false}={}){
 if(await newGame(puzzle)&&!preserveScroll)anchorCourseHole({sameHole});
}
function retryCourseHole(){
 const live=rounds.hole.attempts.findLast(a=>!a.ended&&!a.state.history.length);
 if(live&&!rounds.active.finished&&!courseScoringFinished()) {rounds.hole.locked=false;rounds.save();return playFromResult({...rounds.hole.settings,challenge:{...live.state.challenge,practice:undefined}},{sameHole:true});}
 if(rounds.active.finished&&!reviewingSubmittedHole)reviewingSubmittedHole=true;
 if(rounds.active.finished||courseScoringFinished()||courseExhausted()||!rounds.reopen())return keepPractising({fromTee:true});
 return playFromResult(rounds.settings(),{sameHole:true});
}
async function retryResultHole(){
 if(rollingMode&&!rollingCanPlay())return;
 if(inCourse()&&rounds.active.finished)reviewingSubmittedHole=true;
 if(practising())return retryFromWord(0,{focusEntry:false});
 if(inCourse())return retryCourseHole();
 if(courseExhausted())return keepPractising({fromTee:true});
 return playFromResult({...restartSettings(state,config.puzzles[0]),challenge:{...state.challenge,version:STROKE_PLAY,attempt:state.challenge.attempt+1}},{sameHole:true});
}
$('replay-hole').onclick=()=>resultControlNavigation(retryResultHole);
async function nextResultHole(){
 if(rollingMode){if(!inCourse()||rounds.current.finished)return startRollingPractice();return advanceCourse();}
 if(inCourse()&&rounds.active.finished&&reviewingSubmittedHole){if(rounds.active.index<rounds.active.holes.length-1)return navigateCourseHole(rounds.active.index+1);reviewingSubmittedHole=false;update();return $('round-scorecard').scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});}
 if(inCourse()){if(!rounds.active.finished)return advanceCourse();const i=config.courses.findIndex(c=>c.id===rounds.active.courseId);return startCourse(config.courses[(i+1)%config.courses.length].id,rounds.active.model);}
 const index=config.puzzles.findIndex(p=>p.start===state.start&&p.target===(state.final_target??state.target)&&p.waypoint?.word===state.waypoint?.word&&windKey(p)===windKey(state));
 return playFromResult(config.puzzles[(index+1)%config.puzzles.length]);
}
$('next-hole').onclick=()=>resultControlNavigation(nextResultHole,{pageTop:$('next-hole').textContent.trim()!=='VIEW SCORECARD'});
let resultNavigationActive=false;
async function resultControlNavigation(action,{pageTop=true}={}){
 if(busy||resultNavigationActive)return;
 leaveWordEntry();resultNavigationActive=true;
 try{
  await action();leaveWordEntry();
  if(pageTop)window.scrollTo({top:0,behavior:reduced?'instant':'smooth'});
 }finally{resultNavigationActive=false;}
}
function puzzleIndex(){return config.puzzles.findIndex(p=>p.start===state.start&&p.target===(state.final_target??state.target)&&p.waypoint?.word===state.waypoint?.word&&windKey(p)===windKey(state));}
function anchorCourseHole({sameHole=false}={}){
 if(resultNavigationActive){leaveWordEntry();return;}
 leaveWordEntry({anchor:true});
 if(desktopInteraction()&&!sameHole)window.scrollTo({top:0,behavior:'instant'});
}
// Course-card navigation owns this one scroll. Input stays locked until the
// animation finishes, so it cannot overlap native keyboard activation.
async function navigateCourseHoleFromCard(index){
 if(busy||!rounds.canVisit(index))return;
 leaveWordEntry();lock(true);
 try{
  const top=0;
  if(reduced||top>=scrollY){window.scrollTo({top,behavior:'instant'});}
  else await new Promise(resolve=>{
   const started=performance.now();let settled=0;
   window.scrollTo({top,behavior:'smooth'});
   const finish=()=>{
    settled=Math.abs(scrollY-top)<1?settled+1:0;
    if(settled>=2||performance.now()-started>=1000){resolve();return;}
    requestAnimationFrame(finish);
   };
   requestAnimationFrame(finish);
  });
 }finally{lock(false);}
 if(!narrow()||reduced||index===rounds.active.index)return navigateCourseHole(index,{preserveScroll:true});
 const views=['.mission','.map-card','.controls'].map(selector=>document.querySelector(selector)),animations=[];
 document.body.classList.add('course-hole-changing');lock(true);
 try{
  const outgoing=views.map(view=>view.animate([{opacity:1},{opacity:0}],{duration:160,easing:'ease-out',fill:'forwards'}));
  animations.push(...outgoing);await Promise.all(outgoing.map(animation=>animation.finished));
  lock(false);await navigateCourseHole(index,{preserveScroll:true});lock(true);
  const incoming=views.map(view=>view.animate([{opacity:0},{opacity:1}],{duration:200,easing:'ease-in-out',fill:'forwards'}));
  animations.push(...incoming);await Promise.all(incoming.map(animation=>animation.finished));
 }finally{
  for(const animation of animations)animation.cancel();
  document.body.classList.remove('course-hole-changing');lock(false);
 }
}
async function navigateCourseHole(index,{preserveScroll=false}={}){
 if(rollingMode){if(!checkRollingDay())return;rounds.returnToDaily();}
 if(busy||!rounds.canVisit(index))return;
 justHoled=false;
 setBag(false);leaveWordEntry();clearTimeout(retryTimer);recordCourseState();setHoleLog(false);retryPreview=null;
 const hole=rounds.active.holes[index];
 if(!postedAttempt(hole)&&!rounds.active.finished)hole.locked=false;
 const best=bestAttempt(hole),review=(!!postedAttempt(hole)&&!(rollingMode&&hole.attempts.some(a=>!a.ended)))||rounds.active.finished,record=review?best:[...hole.attempts].sort((a,b)=>b.number-a.number)[0],journey=(review?flightLog.data.journeys.find(j=>j.id===best?.journeyId):null)??flightLog.data.journeys.findLast(j=>j.state.challenge?.id===hole.challengeId&&(!review||!j.state.challenge.practice));
 if(rollingMode&&rounds.active.finished&&!journey&&!record){
  reviewingSubmittedHole=true;rounds.active.index=index;rounds.save();
  await playFromResult({...hole.settings,challenge:{version:STROKE_PLAY,par:hole.settings.par,id:hole.challengeId,attempt:1,rolling:true,attempt_limit:hole.allowance}},{preserveScroll});return;
 }
 if(!journey&&!record&&!hole.locked){reviewingSubmittedHole=false;rounds.active.index=index;rounds.save();await playFromResult(rounds.settings(),{preserveScroll});return;}
 lock(true);
 try{
  const restored=(await api('restore',{state:journey?.state??record.state})).state;
  rounds.active.index=index;rounds.save();reviewingSubmittedHole=rounds.active.finished;state=restored;if(!journey)flightLog.begin(state,modelName(state),modelHash(state));else flightLog.data.activeId=journey.id;selectedLogId=flightLog.data.activeId;flightLog.save();shownEvent=state.history.at(-1)||null;activeNotice='';noticeDismissed=false;syncPuzzleSelection();update();$('status').textContent='';
 }finally{lock(false);}
 if(!preserveScroll)anchorCourseHole();
 if(state.challenge_failed&&!holeResult())scheduleRetry();
}
$('header-next-hole').onclick=()=>resultControlNavigation(async()=>{
 if(busy||!state)return;
 if(rollingMode&&inCourse()&&rounds.current.finished)return navigateCourseHole((rounds.active.index+1)%9);
 if(retryPreview)cancelRetry();
 clearTimeout(retryTimer);
 if(inCourse()&&!rounds.active.finished){
  if(rounds.hole.locked)return rounds.active.index===rounds.active.holes.length-1?advanceCourse():navigateCourseHole(rounds.active.index+1);
  const skipped=rounds.skip(state,flightLog.active?.id,dimensions().arrivalDistance/dimensions().axisLength);
  if(!skipped)return;
  if(rounds.active.finished||rounds.active.completed&&rounds.active.index===rounds.active.holes.length-1){update();$('round-scorecard').scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});}else await navigateCourseHole(rounds.active.index);
 }else return nextResultHole();
});
$('word-model').onchange=async()=>{
 const profile=$('word-model').value;leaveCourse();
 if(await newGame(courseSettings({...config.puzzles[0],...restartSettings(state,config.puzzles[0]),...(state.word_model?{word_model:state.word_model}:{}),...(state.headwind?{headwind:state.headwind}:{})},profile)))previewHole();
};
$('puzzle').onchange=()=>{leaveCourse();return playFromResult(config.puzzles[Number($('puzzle').value)]);};
const assessments=new Map();
function assess(settings){
 settings={finish_mode:'range',...settings};
 const key=JSON.stringify([settings.start,settings.target,settings.threshold,settings.mode,settings.launch_min,settings.launch_max,settings.finish_mode,settings.rules??(settings.mode==='fixed'?'golf-fixed-v3':'golf-distance-v3'),windKey(settings),settings.word_model??'',settings.family_rescue??true]);
 if(!assessments.has(key)){
  if(assessments.size>=20)assessments.delete(assessments.keys().next().value);
  const pending=api('assess',settings).catch(error=>{assessments.delete(key);throw error;});
  assessments.set(key,pending);
 }
 return assessments.get(key);
}
let currentBridgeResult=null;
function bridgeList(result){
 const rows=result.opening_bridges.map(b=>{
  const key=bridgeKey(result.settings,b.word,modelHash(result.settings)),review=flightLog.data.bridgeFeedback.find(r=>r.key===key);
  return `<li data-review-key="${esc(key)}" data-bridge-word="${esc(b.word)}"><div class="bridge-route">${esc(result.start)} <span>→</span> <strong>${esc(b.word)}</strong>${b.direct?' <small>direct hole in one</small>':` <span>→</span> ${esc(result.target)} <small>automatic finish</small>`}</div><div class="bridge-scores"><span>From tee <b>${b.contact.toFixed(3)}</b> · needs ${b.required.toFixed(3)}</span><span>To hole <b>${b.destination.toFixed(3)}</b> · green ${result.green_threshold.toFixed(3)}</span></div><button type="button" class="quiet bridge-flag" data-flag-bridge aria-pressed="${!!review}" aria-label="${review?'Undo flag for':'Flag poor bridge'} ${esc(b.word)}">${review?'Flagged · undo':'Flag poor bridge'}</button>${review?reviewNote(review):''}</li>`;
 }).join('');
 return `<p class="bridge-explanation">${result.green_bridges} opening ${result.green_bridges===1?'bridge':'bridges'} for <strong>${esc(result.start)} → ${esc(result.target)}</strong>. ${rows?'All pass the current requirements, strongest tee links first. Flag any that feel wrong. The puzzle and both connection strengths are saved with your scorecards; flagging does not change play.':'No word reaches the green directly from this tee. A longer route may still work.'}</p>${rows?`<ol class="bridge-list">${rows}</ol>`:''}<p class="bridge-feedback-status subtle" role="status"></p>`;
}
function reviewNote(review){return `<div class="bridge-note"><label>Why does ${esc(review.word)} feel wrong? <span>(optional)</span><input data-bridge-note aria-label="Note for ${esc(review.word)}" maxlength="500" value="${esc(review.note)}" placeholder="Weak tee link, weak hole link, or something else"></label><button type="button" class="quiet" data-save-bridge-note>Save note</button></div>`;}
function renderBridgeFeedback(){
 const reviews=flightLog.data.bridgeFeedback,played=openingGreenShots(flightLog.data);
 $('bridge-feedback-title').textContent=`Bridge feedback (${reviews.length})`;
 const panel=$('bridge-feedback-content'),signature=JSON.stringify([reviews,played.length]);
 if(panel.dataset.rendered===signature)return;panel.dataset.rendered=signature;
 panel.innerHTML=`<p class="subtle">${reviews.length} flagged poor ${reviews.length===1?'bridge':'bridges'} · ${played.length} recorded first-shot ${played.length===1?'finishing route':'finishing routes'} (including direct finishes). These are played examples, not endorsements. Both groups, their tee/green margins and known spoiler exposure are included in Download all scorecards. Saved on this device; share an export for analysis. No cutoff is changed automatically.</p>${reviews.length?`<ol class="bridge-review-list">${[...reviews].reverse().map(r=>`<li data-review-key="${esc(r.key)}"><div class="bridge-route">${esc(r.puzzle.start)} → <strong>${esc(r.word)}</strong> → ${esc(r.puzzle.target)}</div><p class="subtle">Tee ${r.metrics.contact.toFixed(3)} / needs ${r.metrics.required.toFixed(3)} · hole ${r.metrics.destination.toFixed(3)} / green ${r.metrics.green_threshold.toFixed(3)}</p>${reviewNote(r)}<button type="button" class="quiet" data-remove-bridge-flag aria-label="Undo flag for ${esc(r.word)}">Undo flag</button></li>`).join('')}</ol>`:'<p class="subtle">Open Opening bridges and use Flag poor bridge beside a word.</p>'}<p class="bridge-feedback-status subtle" role="status"></p>`;
}
function refreshBridgeFlags(){
 for(const [id,result,open] of [['current-bridge-list',currentBridgeResult,$('current-bridges').open],['custom-bridge-list',customBridgeResult,$('custom-bridges').open]]){
  if(!result||!open)continue;const scroll=$(id).querySelector('.bridge-list')?.scrollTop??0;
  $(id).innerHTML=bridgeList(result);$(id).querySelector('.bridge-list')?.scrollTo({top:scroll});
 }
 renderBridgeFeedback();$('log-storage').textContent=flightLog.warning||'Saved in this browser. Download your scorecards to keep or share them.';
}
for(const id of ['current-bridge-list','custom-bridge-list','bridge-feedback-content'])$(id).addEventListener('input',event=>{if(event.target.matches('[data-bridge-note]'))event.target.closest('.bridge-note').querySelector('[data-save-bridge-note]').textContent='Save note';});
for(const id of ['current-bridge-list','custom-bridge-list','bridge-feedback-content'])$(id).addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('[data-bridge-note]')){event.preventDefault();event.target.closest('.bridge-note').querySelector('[data-save-bridge-note]').click();}});
for(const id of ['current-bridge-list','custom-bridge-list','bridge-feedback-content'])$(id).addEventListener('click',event=>{
 const button=event.target.closest('button'),row=button?.closest('[data-review-key]');if(!row)return;
 const key=row.dataset.reviewKey;
 if(button.hasAttribute('data-save-bridge-note')){
  flightLog.noteBridge(key,row.querySelector('[data-bridge-note]').value);
  const other=document.querySelectorAll('[data-review-key]');for(const r of other)if(r.dataset.reviewKey===key){const input=r.querySelector('[data-bridge-note]');if(input)input.value=row.querySelector('[data-bridge-note]').value;}
  $('bridge-feedback-content').dataset.rendered='';button.textContent='Saved';
  $(id).querySelector('.bridge-feedback-status').textContent=flightLog.warning||'Note saved with your scorecards.';
  $('log-storage').textContent=flightLog.warning||'Saved in this browser. Download your scorecards to keep or share them.';return;
 }
 let message='Flag removed.';
 if(button.hasAttribute('data-remove-bridge-flag')||flightLog.data.bridgeFeedback.some(r=>r.key===key))flightLog.unflagBridge(key);
 else {
  const result=id==='current-bridge-list'?currentBridgeResult:customBridgeResult,bridge=result?.opening_bridges.find(b=>b.word===row.dataset.bridgeWord);
  if(!bridge)return;
  flightLog.flagBridge(result,bridge,{model:modelName(result.settings),model_sha:modelHash(result.settings),source:id==='current-bridge-list'?'active':'preview'});message='Flag saved with your scorecards.';
 }
 refreshBridgeFlags();$(id).querySelector('.bridge-feedback-status').textContent=flightLog.warning||message;
 const replacement=[...$(id).querySelectorAll('[data-review-key]')].find(r=>r.dataset.reviewKey===key);replacement?.querySelector('[data-flag-bridge]')?.focus({preventScroll:true});
});
function resetBridgeView(){
 currentBridgeResult=null;bridgeViewVersion++;$('current-bridges').open=false;$('current-bridge-list').textContent='';
}
$('current-bridges').addEventListener('toggle',async()=>{
 if(!$('current-bridges').open)return;
 if(state?.waypoint){$('current-bridge-list').textContent='Waypoint trial: reach the shaded landing zone first. Your entry word becomes the lie for the second leg.';return;}
 if(!state||!client){$('current-bridge-list').textContent='The course is still loading.';return;}
 const version=bridgeViewVersion;
 const settings={start:state.start,target:state.target,threshold:state.threshold,mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max,rules:state.rules,finish_mode:state.finish_mode??'green',...(state.word_model?{word_model:state.word_model}:{}),...(state.headwind?{headwind:state.headwind}:{})};
 $('current-bridge-list').textContent='Calculating opening bridges…';
 try{const result=await assess(settings);if(version===bridgeViewVersion){currentBridgeResult=result;$('current-bridge-list').innerHTML=bridgeList(result);if($('current-bridges').open)flightLog.markBridgeView(result.settings,'active',modelHash(result.settings));}}
 catch(error){if(version===bridgeViewVersion)$('current-bridge-list').textContent=error.message;}
});
$('word').addEventListener('beforeinput',event=>{if(changingRetry)event.preventDefault();});
$('word').addEventListener('input',()=>{
 void client?.prefetch($('word').value).catch(()=>{});
 if(!retryPreview&&$('word').value.trim()&&(retrySource()||document.querySelector('.previous-attempt-element,[data-previous-range]'))){
  if(flightLog.active){flightLog.active.previous_labels_dismissed=true;flightLog.save();}
  $('retry-guidance').hidden=true;void fadePreviousLabels().then(()=>{syncEntryWaypoint();});
 }
 if(activeNotice&&flightLog.active){flightLog.active.notice_dismissed=true;flightLog.save();}
 activeNotice='';noticeDismissed=true;renderNotice();fitTypingView();
});
const waypointAssessments=new Map();
let customParEstimate=null,creatingCustom=false;
const customWordsKey=()=>[$('custom-start').value,$('custom-waypoint').value,$('custom-target').value].map(w=>w.trim().toLowerCase()).join('|');
function customWaypointSettings(start,waypoint,target){return {...config.puzzles[0],start,target,waypoint:{word:waypoint,threshold:.265,turn:'up'},par:5,validate_direct:false,validate_waypoint:true};}
function assessWaypoint(settings){
 const key=JSON.stringify([settings.start,settings.waypoint,settings.target,settings.threshold,settings.launch_min,settings.launch_max,settings.mode]);
 if(!waypointAssessments.has(key)){
  if(waypointAssessments.size>=12)waypointAssessments.delete(waypointAssessments.keys().next().value);
  waypointAssessments.set(key,api('assess-waypoint',settings).catch(error=>{waypointAssessments.delete(key);throw error;}));
 }
 return waypointAssessments.get(key);
}
function renderCustomPar(){
 if(!customParEstimate)return;
 const suggested=customParEstimate.suggested_par,par=$('custom-par').value==='auto'?suggested:Number($('custom-par').value);
 $('custom-par').querySelector('[value="auto"]').textContent=`Suggested: par ${suggested}`;
 $('custom-par-details').textContent=`Par ${par}: ${attemptLimit(par)} attempts · maximum ${maximumStrokes(par)} shots.`;
 $('custom-assessment').textContent=`Suggested par ${suggested}. ${customParEstimate.reason}`;
}
$('custom-par').addEventListener('change',renderCustomPar);
let assessmentTimer,assessmentSequence=0,customBridgeResult=null;
$('custom-bridges').addEventListener('toggle',()=>{if($('custom-bridges').open&&customBridgeResult){$('custom-bridge-list').innerHTML=bridgeList(customBridgeResult);flightLog.markBridgeView(customBridgeResult.settings,'preview',modelHash(customBridgeResult.settings));}});
function previewHole(){
 clearTimeout(assessmentTimer);const sequence=++assessmentSequence;$('custom-feedback').textContent='';
 const start=$('custom-start').value.trim().toLowerCase(),target=$('custom-target').value.trim().toLowerCase(),waypoint=$('custom-waypoint').value.trim().toLowerCase();
 const warning=$('custom-hub-warning');warning.textContent='';warning.hidden=true;
 if(client)api('breadth',{start,target}).then(endpoints=>{if(sequence!==assessmentSequence)return;warning.textContent=hubWarningText(endpoints);warning.hidden=!endpoints.length;});
 $('custom-assessment').dataset.valid='pending';customParEstimate=null;$('custom-par-control').hidden=!waypoint;$('custom-par').value='auto';$('custom-par').querySelector('[value="auto"]').textContent='Suggested par';$('custom-par-details').textContent='';document.querySelector('#custom-form button').disabled=false;
 customBridgeResult=null;$('custom-bridges').hidden=true;$('custom-bridges').open=false;$('custom-bridge-list').textContent='';
 if(!start||!target||!client){$('custom-assessment').textContent='';return;}
 $('custom-assessment').textContent='Assessing these words…';
 assessmentTimer=setTimeout(async()=>{
  try{
   if(waypoint){
    if(new Set([start,waypoint,target]).size!==3)throw Error('Choose three different words.');
    const settings=customWaypointSettings(start,waypoint,target),validation=await api('waypoint-access',settings);
    if(sequence!==assessmentSequence)return;
    if(!validation.allowed){$('custom-assessment').dataset.valid='false';$('custom-assessment').textContent=`Not allowed. ${validation.message} Choose a less directly connected pair.`;document.querySelector('#custom-form button').disabled=true;return;}
    $('custom-assessment').textContent='Checking routes for a suggested par…';
    const result=await assessWaypoint(settings);if(sequence!==assessmentSequence)return;
    customParEstimate=result;$('custom-assessment').dataset.valid='true';renderCustomPar();return;
   }
   const result=await assess(courseSettings({...config.puzzles[0],start,target}));if(sequence!==assessmentSequence)return;
   $('custom-assessment').textContent=result.direct_hole_in_one?'Direct hole in one available. Choose a more distant pair.':!result.playable?'No playable opening found. Choose another pair.':`${result.separation_degrees.toFixed(0)}° word separation · ${result.green_bridges} opening ${result.green_bridges===1?'route':'routes'} within finishing range. Connection counts do not measure human difficulty.`;
   $('custom-assessment').dataset.valid=String(result.playable);
   $('custom-bridges').hidden=false;$('custom-bridges').querySelector('summary').textContent=`View ${result.green_bridges} opening ${result.green_bridges===1?'bridge':'bridges'} (spoilers)`;
   customBridgeResult=result;
  }catch(error){if(sequence===assessmentSequence){$('custom-assessment').textContent=error.message;$('custom-assessment').dataset.valid='false';}}
 },200);
}
for(const id of ['custom-start','custom-waypoint','custom-target'])$(id).addEventListener('input',previewHole);
$('custom-form').onsubmit=async event=>{
 event.preventDefault();if(busy||!config||creatingCustom)return;
 const start=$('custom-start').value.trim().toLowerCase(),middle=$('custom-waypoint').value.trim().toLowerCase(),target=$('custom-target').value.trim().toLowerCase(),key=customWordsKey();
 $('custom-start').blur();$('custom-waypoint').blur();$('custom-target').blur();$('custom-feedback').textContent='';creatingCustom=true;
 const button=document.querySelector('#custom-form button');button.disabled=true;
 try{
  let settings;
  if(middle){
   settings=customWaypointSettings(start,middle,target);
   const validation=await api('waypoint-access',settings);
   if(key!==customWordsKey())return;
   if(!validation.allowed){$('custom-assessment').dataset.valid='false';$('custom-assessment').textContent=`Not allowed. ${validation.message} Choose a less directly connected pair.`;return;}
   if($('custom-par').value==='auto'){
    $('custom-feedback').textContent='Choosing suggested par…';
    const result=await assessWaypoint(settings);if(key!==customWordsKey())return;
    customParEstimate=result;settings.par=result.suggested_par;renderCustomPar();
   }else settings.par=Number($('custom-par').value);
  }else settings={...config.puzzles[0],start,target,validate_direct:true};
  if(key!==customWordsKey())return;
  leaveCourse();const started=await newGame(courseSettings(settings));
  if(!started){$('custom-feedback').textContent=$('status').textContent;return;}
  $('custom-start').value=state.start;$('custom-waypoint').value=state.waypoint?.word??'';$('custom-target').value=state.final_target??state.target;
  $('custom-feedback').textContent=`Your ${holeLabel(state)} hole is ready.${state.waypoint?` Par ${state.challenge.par} · ${attemptLimit(state.challenge.par)} attempts.`:''}`;
  anchorCourseHole();
 }catch(error){$('custom-feedback').textContent=error.message;}
 finally{creatingCustom=false;button.disabled=$('custom-assessment').dataset.valid==='false'&&$('custom-assessment').textContent.startsWith('Not allowed.');}
};

$('route-form').onsubmit=async event=>{event.preventDefault();if(busy)return;const words=$('route-input').value.split(',').map(w=>w.trim()).filter(Boolean);for(const word of words){if(state.won||state.challenge_failed||!await submit(word))break;}};
$('reset-log').onclick=()=>{$('reset-confirmation').hidden=false;};
$('cancel-reset').onclick=()=>{$('reset-confirmation').hidden=true;};
$('confirm-reset').onclick=async()=>{
 if(busy||!state)return;
 lock(true);const previous=state;let candidate;
 try{
  candidate=(await api('new',{...restartSettings(state,config.puzzles[0]),challenge:{version:STROKE_PLAY,par:state.challenge?.par??3,attempt:1,id:crypto.randomUUID()},start:state.start,target:state.final_target??state.target,threshold:state.threshold,mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max,rules:state.rules,finish_mode:'range',...(state.word_model?{word_model:state.word_model}:{}),...(state.headwind?{headwind:state.headwind}:{})})).state;
  const journey=flightLog.reset(candidate,modelName(candidate),modelHash(candidate));rounds.reset();
  state=candidate;shownEvent=null;activeNotice='';noticeDismissed=false;resetBridgeView();selectedLogId=journey.id;
  $('reset-confirmation').hidden=true;$('copy-fallback').hidden=true;$('word').value='';
  update();refreshBridgeFlags();$('status').textContent='';$('log-feedback').textContent='Scorecards reset. Future downloads contain only new rounds.';
 }catch(error){
  if(candidate)try{await api('restore',{state:previous});}catch{}
  $('log-feedback').textContent=error.message;
 }finally{lock(false);if(state.won)$('launch').disabled=true;}
};
$('restore-log').onclick=()=>{
 try{if(flightLog.restorePrevious()){rounds.restore();$('reset-confirmation').hidden=true;renderLog();refreshBridgeFlags();$('log-feedback').textContent='Previous scorecards restored. New rounds were kept too.';}}
 catch(error){$('log-feedback').textContent=error.message;}
};
$('log-journey').onchange=()=>{selectedLogId=$('log-journey').value;$('copy-fallback').hidden=true;renderLog();};
$('copy-log').onclick=async()=>{
 const journey=flightLog.data.journeys.find(j=>j.id===selectedLogId);if(!journey)return;
 const text=journeyText(journey,flightLog.data.bridgeFeedback);
 try{await navigator.clipboard.writeText(text);$('log-feedback').textContent='Scorecard copied. Paste it into our chat.';}
 catch{$('copy-fallback').hidden=false;$('log-copy-text').value=text;$('log-copy-text').focus();$('log-copy-text').select();$('log-feedback').textContent='Select and copy the scorecard text below.';}
};
$('download-log').onclick=()=>{
 const exported=JSON.parse(flightLog.exportJSON());exported.course_rounds=rounds.exportData();exported.keyboard_diagnostics={release:config.release,browser:navigator.userAgent,events:viewportDiagnostics.export()};
 const blob=new Blob([JSON.stringify(exported,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='word-golf-scorecards.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('log-feedback').textContent='Scorecards download requested. If it does not appear, use Copy scorecard.';
};
renderLog();
try{lock(true);$('status').textContent='Preparing the hole…';client=await createBrowserClient({onProgress:progress=>{const note=$('word-loading-note');note.hidden=progress.complete;note.textContent=progress.error?'Some words are still loading. You can keep playing.':'More words are loading in the background…';}});config=client.config;lock(false);const options=predicate=>config.puzzles.map((p,i)=>predicate(p)?`<option value="${i}">${(p.course_number??p.comparison_number)?String(p.course_number??p.comparison_number).padStart(2,'0')+' · ':''}${esc(holeLabel(p))}</option>`:'').join('');$('puzzle').innerHTML=`<optgroup label="New discoveries · 20 holes">${options(p=>p.course_set==='new-discoveries-v1')}</optgroup><optgroup label="24 October · 9 holes">${options(p=>p.course_set==='24-october')}</optgroup><optgroup label="More waypoint holes · 20">${options(p=>p.course_set==='waypoint-discovery-v3')}</optgroup><optgroup label="New waypoint holes · 20">${options(p=>p.course_set==='waypoint-discovery-v2')}</optgroup><optgroup label="Player-created waypoint holes · 18">${options(p=>p.course_set==='player-waypoints-v1')}</optgroup><optgroup label="New waypoint tests · 12 holes">${options(p=>p.course_set==='waypoint-discovery-v1')}</optgroup><optgroup label="Waypoint trials · 3 longer holes">${options(p=>p.course_set==='waypoint-trial-v1')}</optgroup><optgroup label="Fresh course · 10 holes">${options(p=>p.course_set==='fresh-course-v1')}</optgroup><optgroup label="Player discoveries · 4 holes">${options(p=>p.course_set==='player-discoveries-v1')}</optgroup><optgroup label="Discovery holes · set 2">${options(p=>p.comparison_set==='current-ls15-v1')}</optgroup><optgroup label="Discovery holes · set 1">${options(p=>p.comparison_set==='current-abtt-v1')}</optgroup><optgroup label="Regular course">${options(p=>!p.comparison_set&&!p.course_set)}</optgroup>`;refreshSavedHoles();$('model-info').textContent=`${config.model} / ${config.vocabulary.toLocaleString()} WORDS · ${config.release||'golf-v175'}`;if(startupAction(flightLog.active,config.puzzles[0],config.retired_waypoint_holes)==='removed'){await newGame(config.puzzles[0]);$('status').textContent='That hole was removed because a leg could be played directly. Your scorecards are saved.';}else if(flightLog.active?.state.word_model){const saved=flightLog.active.state;await newGame(courseSettings({...config.puzzles[0],...restartSettings(saved,config.puzzles[0])}));}else if(startupAction(flightLog.active,config.puzzles[0],config.retired_waypoint_holes)==='upgrade'){const saved=flightLog.active.state;await newGame(courseSettings({...config.puzzles[0],...restartSettings(saved,config.puzzles[0]),...(saved.headwind?{headwind:saved.headwind}:{})}));$('status').textContent='Teed up this hole with the new scoring rules. Earlier scorecards are saved below.';}else if(startupAction(flightLog.active,config.puzzles[0],config.retired_waypoint_holes)==='restore'){try{state=(await api('display',{state:flightLog.active.state})).state;restoring=true;shownEvent=state.history.at(-1)||null;update();lock(true);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));state=(await api('restore',{state})).state;restoring=false;lock(false);shownEvent=state.history.at(-1)||null;noticeDismissed=!!flightLog.active.notice_dismissed;const previous=previousAttempts(flightLog.data.journeys,state,flightLog.active?.id)[0]?.state;activeNotice=state.challenge_failed?noticeForAttempt(shownEvent,state):state.history.every(h=>h.assumed)&&previous?noticeForAttempt(previous.history.at(-1),previous):'';syncPuzzleSelection();update();$('status').textContent='';if(state.won||state.challenge_failed)$('launch').disabled=true;if(state.challenge_failed)scheduleRetry();}catch{restoring=false;lock(false);await newGame(config.puzzles[0]);$('status').textContent='Teed up a fresh hole. Your earlier scorecards are still available below.';}}else await newGame(config.puzzles[0]);await initialiseCourses();requestAnimationFrame(()=>requestAnimationFrame(()=>{void client.startBackground().catch(()=>{});}));}
catch(error){$('status').textContent=`Course unavailable: ${error.message}. Please reload to try again.`;}

window.addEventListener('resize',()=>{if(state&&!busy&&document.activeElement!==$('word')&&!document.body.classList.contains('typing'))map();});

// Keep the map and input in the visible area above mobile software keyboards.
function fitTypingView(){
 if(typingFitFrame||desktopInteraction()||!narrow()||document.activeElement!==$('word')&&!document.body.classList.contains('typing'))return;
 typingFitFrame=requestAnimationFrame(()=>{typingFitFrame=0;applyTypingView();});
}
function applyTypingView(){
 if(desktopInteraction())return;
 const focused=document.activeElement===$('word');
 if(!keyboardLayoutVisible(focused,window.visualViewport,typingRestHeight)){if(document.body.classList.contains('typing'))leaveWordEntry({anchor:true});return;}
 document.body.classList.add('typing');
 const frame=stableTypingViewport(window.visualViewport,innerHeight);if(!frame)return;
 document.documentElement.style.setProperty('--typing-height',`${frame.height}px`);
 document.documentElement.style.setProperty('--typing-top',`${frame.top}px`);
 const main=document.querySelector('main'),mission=document.querySelector('.mission'),controls=document.querySelector('.controls');
 const ms=getComputedStyle(main),hs=getComputedStyle(mission),cs=getComputedStyle(controls),px=v=>parseFloat(v)||0;
 const available=main.clientHeight-px(ms.paddingTop)-px(ms.paddingBottom)-mission.getBoundingClientRect().height-px(hs.marginTop)-px(hs.marginBottom)-controls.getBoundingClientRect().height-px(cs.marginTop)-px(cs.marginBottom)-document.querySelector('.course-feedback').getBoundingClientRect().height;
 const box=$('map').viewBox.baseVal,limit=Math.min(typingMaxWidth,main.clientWidth-px(ms.paddingLeft)-px(ms.paddingRight));
 document.documentElement.style.setProperty('--typing-course-width',`${typingCourseWidth(limit,available,box.width,box.height)}px`);
 requestAnimationFrame(syncControlTrees);
}
$('launch').addEventListener('pointerdown',event=>{
 if(document.body.classList.contains('typing'))event.preventDefault();
});
// Focus changes emphasis only; keep the SVG and label positions intact while
// the keyboard animates. Rebuilding the course here forces extra layout work.
function syncEntryWaypoint(){
 if(!state?.waypoint||busy||state.stage!==0)return;
 const retry=retrySource(),previousEntry=(retry?.state??retryPreview?.source.state)?.history.find(h=>h.waypoint_reached);
 const display=waypointRetryDisplay(state,previousEntry,document.activeElement===$('word'));
 const target=[...$('map').querySelectorAll('.word-label[data-lie-key]')].find(node=>node.dataset.lieKey===wordLieKey(state.target,state.stage??0));
 if(target){target.classList.toggle('waypoint-reference-label',display.reference);target.toggleAttribute('data-waypoint-reference',display.reference);}
}
function clearEntryLayout(){
 const wasTyping=document.body.classList.contains('typing');
 document.body.classList.remove('typing','word-entry-active');
 if(typingFitFrame){cancelAnimationFrame(typingFitFrame);typingFitFrame=0;}
 if(wasTyping&&restoreEntryScroll)window.scrollTo({top:typingScroll,behavior:'instant'});
 requestAnimationFrame(syncControlTrees);
}
function leaveWordEntry({anchor=false}={}){
 const previous=restoreEntryScroll;restoreEntryScroll=false;
 $('word').blur();clearEntryLayout();restoreEntryScroll=previous;
 if(anchor&&!desktopInteraction())document.querySelector('.mission').scrollIntoView({block:'start',behavior:'instant'});
}
$('word').addEventListener('focus',()=>{
 entryDiagnosticUntil=performance.now()+1200;recordEntryDiagnostic('focus');
 if(narrow())setHoleLog(false);
 if(!document.body.classList.contains('typing')){
  typingScroll=window.scrollY;typingMaxWidth=document.querySelector('.map-card').getBoundingClientRect().width;
  typingRestHeight=keyboardRestingHeight(window.visualViewport,innerHeight);
  document.documentElement.style.setProperty('--typing-course-width',`${typingMaxWidth}px`);
 }
 document.body.classList.add('word-entry-active');syncEntryWaypoint();
 if(narrow())applyTypingView();
});
$('word').addEventListener('blur',()=>{entryDiagnosticUntil=performance.now()+1200;recordEntryDiagnostic('blur');clearEntryLayout();syncEntryWaypoint();});
window.visualViewport?.addEventListener('resize',fitTypingView);
window.visualViewport?.addEventListener('resize',fitHoleLog);
window.visualViewport?.addEventListener('scroll',fitTypingView);
window.addEventListener('resize',fitTypingView);
window.addEventListener('resize',fitHoleLog);

// Safari's gesture events and multi-touch fallback supplement touch-action.
for(const type of ['gesturestart','gesturechange','gestureend'])document.querySelector('.map-card').addEventListener(type,event=>{if(document.body.classList.contains('typing')&&event.cancelable)event.preventDefault();},{passive:false});
document.querySelector('.map-card').addEventListener('touchmove',event=>{if(document.body.classList.contains('typing')&&event.touches.length>1&&event.cancelable)event.preventDefault();},{passive:false});

for(const type of ['resize','scroll'])window.visualViewport?.addEventListener(type,()=>{if(document.activeElement===$('word')||document.body.classList.contains('typing')||performance.now()<entryDiagnosticUntil)recordEntryDiagnostic('viewport-'+type);});
