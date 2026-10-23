import {STROKE_PLAY,attemptLimit,maximumStrokes,maximumName,maximumScoreText,isStrokePlay,exhausted,retryLieThrough,returnsToOriginalLie} from './stroke-play.mjs?v=golf-v99';
import {waypointLayout,waypointLake,waypointAnchors,waypointPosition,waypointLandscape,waypointGreen,waypointZone,waypointChipGuide} from './waypoint-map.mjs?v=golf-v99';
import {CourseRounds,bestAttempt,attemptResult,roundTotal,scoreText,resultText} from './course-round.mjs?v=golf-v99';
import {typingCourseWidth,stableTypingViewport} from './typing-layout.mjs?v=golf-v99';
import {courseSurrounds,courseTrees,par3PathArt,courseBunkers,courseLake,courseArtDefs,approachLandscape,courseContinuation} from './course-art.mjs?v=golf-v99';
import { pinPlacement, greenPath, greenContains, courseStyle, lakeGeometry } from './course-appearance.mjs?v=golf-v99';
import { shotMotion } from './shot-motion.mjs?v=golf-v99';
import { hubWarningText } from './hub-warning.mjs?v=golf-v99';
import { createBrowserClient } from './engine.mjs?v=golf-v99';
import { mapLayout, par3CentreTrace, projectX, projectPoint, chipArcBands, visibleAttempts, layoutLabels } from './map.mjs?v=golf-v99';
import { startupAction, restartSettings } from './startup.mjs?v=golf-v99';
import { FlightLog, outcome, journeyText } from './flight-log.mjs?v=golf-v99';
import { bridgeKey, openingGreenShots } from './bridge-feedback.mjs?v=golf-v99';
import {previousAttempts,previousWordLabels,showPreviousLabels} from './attempt-ghosts.mjs?v=golf-v99';
import {successOutcome} from './success-mode.mjs?v=golf-v99';
import {attemptNotice,usefulForwardMiss,entryNotice,shortSecondShot} from './play-feedback.mjs?v=golf-v99';
import {nearestWordTarget} from './word-taps.mjs?v=golf-v99';
const $=id=>document.getElementById(id);
const windKey=p=>JSON.stringify(p.headwind??null);
const holeLabel=p=>`${p.start} → ${p.waypoint?p.waypoint.word+' → ':''}${p.final_target??p.target}${p.word_model==='ls15-v1'?' · LS 15%':p.word_model?' · ABTT 1':''}${p.headwind?` · ${p.headwind.word.toUpperCase()} headwind`:''}`;
let config,state,client,busy=false,shownEvent=null,noticeDismissed=false,bridgeViewVersion=0;
let retryTimer,activeNotice='',retryPreview=null,restoring=false,committingRetry=false,changingRetry=false;
const modelConfig=s=>config?.word_models?.[s?.word_model]??config;
const modelHash=s=>modelConfig(s)?.score_sha256??modelConfig(s)?.vector_sha256;
const modelName=s=>modelConfig(s)?.model;
function courseSettings(p,profile=state?.word_model??''){
 const par=p.par??(p.waypoint?5:3),golden=config?.golden_holes?.find(h=>h.start===p.start&&h.target===(p.final_target??p.target)&&h.waypoint===p.waypoint?.word);
 return {...p,par,word_model:'',golden_paths:par<=4?(golden?.paths??p.golden_paths??[]):[]};
}
let storage;try{storage=window.localStorage;}catch{}
let showChipRange=false,autoRangeFeedback=false;
$('show-chip-range').checked=showChipRange;
$('chip-range-note').hidden=!showChipRange||!!state?.waypoint&&state.stage===0;
$('show-chip-range').addEventListener('change',()=>{showChipRange=$('show-chip-range').checked;$('chip-range-note').hidden=!showChipRange||!!state?.waypoint&&state.stage===0;if(state)map();});
const flightLog=new FlightLog(storage);
const rounds=new CourseRounds(storage);
const inCourse=()=>rounds.belongs(state);
const courseExhausted=()=>exhausted(state);
const bestScoreText=value=>`${resultText(value)} (${value===0?'EVEN':value>0?'+'+value:String(value)})`;
const maxed=()=>isStrokePlay(state)&&state.challenge_failed&&state.history.length>=maximumStrokes(state.challenge.par);
const holeResult=()=>state?.won||maxed()||courseExhausted();
const courseResult=()=>inCourse()&&(holeResult()||rounds.active.finished);
function leaveCourse(){rounds.data.activeId=null;rounds.save();$('round-scorecard').hidden=true;}
function courseInputLocks(){
 if(!inCourse()||rounds.active.finished)return;
 for(const id of ['word-model','puzzle','new-game','custom-start','custom-waypoint','custom-target','lab-start','lab-target','threshold','launch-mode','launch-min','launch-max'])$(id).disabled=true;
 for(const selector of ['#custom-form button','#lab-form button'])document.querySelector(selector).disabled=true;
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
 const labels=document.querySelectorAll('#arrival-banner .scorecard-grid .scorecard-label');
 if(r.finished){
  $('arrival-title').textContent='Round complete!';$('arrival-par').textContent='5 HOLES';
  labels[0].textContent='SCORE';labels[1].textContent='ATTEMPTS';
  $('arrival-skill-value').textContent=scoreText(roundTotal(r));
  $('arrival-attempt').textContent=r.holes.reduce((sum,h)=>sum+h.attempts.filter(a=>a.ended).length,0);
  $('replay-hole').hidden=false;$('replay-hole').textContent='PLAY AGAIN';$('next-hole').textContent='NEXT COURSE';
 }else{
  if(!state.won)$('arrival-title').textContent=courseExhausted()?'Attempt limit reached':maximumScoreText(h.settings.par);
  $('arrival-par').textContent=`HOLE ${r.index+1} OF 5 · PAR ${h.settings.par}`;
  labels[0].textContent='BEST';labels[1].textContent='ATTEMPTS LEFT';
  $('arrival-skill-value').textContent=best?bestScoreText(attemptResult(best,h.settings.par)):'—';$('arrival-attempt').textContent=remaining;
  $('replay-hole').hidden=remaining<=0;$('replay-hole').textContent='TRY AGAIN';
  $('next-hole').textContent=r.index===4?'FINISH ROUND':'NEXT HOLE';
 }
 styleResultButtonLabels();
}
function renderCourseScorecard(){
 const visible=inCourse();$('round-scorecard').hidden=!visible;if(!visible)return;
 const r=rounds.active,h=rounds.hole,ended=h.attempts.filter(a=>a.ended).length;
 $('round-course-name').textContent=r.name;
 $('round-running-score').textContent=`${r.finished?'Final':'Score'}: ${scoreText(roundTotal(r))}`;
 $('round-rows').innerHTML=r.holes.map((hole,i)=>{
  const best=bestAttempt(hole),score=best?attemptResult(best,hole.settings.par):null;
  return `<tr ${i===r.index&&!r.finished?'class="current-hole" aria-current="step"':''}><td>${i+1}${hole.locked?' ✓':''}</td><th scope="row">${esc(hole.settings.start)} <span>→</span> ${esc(hole.settings.target)}</th><td>${score===null?'—':`${resultText(score)} <strong>${scoreText(score)}</strong>`}</td><td>${hole.attempts.filter(a=>a.ended).length}/${attemptLimit(hole.settings.par)}</td></tr>`;
 }).join('');
 $('round-status').textContent=rounds.warning||(r.finished?'Five holes complete. Best score on each hole counts.':`${Math.max(0,attemptLimit(h.settings.par)-ended)} attempts remaining on hole ${r.index+1}.`);
 $('round-rule-note').hidden=false;$('round-rule-note').textContent='Best score counts. Equal course scores are ranked by fewer attempts.';
 $('round-next').hidden=r.finished||courseResult()||!h.attempts.some(a=>a.ended);$('round-next').textContent=r.index===4?'FINISH ROUND':'NEXT HOLE';
 renderCourseOutcome();
}
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
 clearTimeout(retryTimer);rounds.begin(course,profile,config.word_models?.[profile]?.defaults??{});
 $('course-select').value=course.id;
 if(await newGame(rounds.settings()))document.querySelector('.mission').scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
}
async function advanceCourse(){
 if(!rounds.advance())return;
 if(rounds.active.finished){update();document.querySelector('.map-card').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});}
 else await playFromResult(rounds.settings());
}
async function initialiseCourses(){
 $('course-select').innerHTML=(config.courses??[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · five holes</option>`).join('')+'<option value="practice">Individual holes</option>';
 if(!rounds.active)return;
 if(rounds.active.model||rounds.active.version!=='five-hole-v2'){leaveCourse();return;}
 if(!config.courses.some(c=>c.id===rounds.active.courseId)){leaveCourse();return;}
 $('course-select').value=rounds.active.courseId;
 if(!inCourse()){
  const journey=flightLog.data.journeys.findLast(j=>j.state.challenge?.id===rounds.hole.challengeId);
  if(journey){state=(await api('restore',{state:journey.state})).state;flightLog.data.activeId=journey.id;selectedLogId=journey.id;flightLog.save();shownEvent=state.history.at(-1)||null;}
  else if(!rounds.active.finished)await newGame(rounds.settings());
 }
 if(inCourse()){update();if(state.challenge_failed&&!courseExhausted())scheduleRetry();}
}
$('round-next').onclick=()=>advanceCourse();
$('course-select').onchange=()=>{$('start-course').textContent=$('course-select').value==='practice'?'PLAY INDIVIDUAL HOLES':'START COURSE';};
$('start-course').onclick=()=>{if($('course-select').value==='practice'){leaveCourse();return playFromResult(config.puzzles[0]);}return startCourse($('course-select').value);};

let selectedLogId=flightLog.data.activeId;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){return client.request(path,body);}
function lock(value){busy=value;for(const e of document.querySelectorAll('button,input,select'))if(!['copy-log','download-log','log-journey'].includes(e.id))e.disabled=value&&!(changingRetry&&e.id==='word');$('word').readOnly=false;if(!value)courseInputLocks();}
const narrow=()=>matchMedia('(max-width:650px)').matches;
let appearanceKey,appearanceLayout,backdropLayout;
function dimensions(){const seed=state?.challenge?state.challenge.id:flightLog.active?.id??'opening';const key=`${narrow()}:${seed}:${!!state?.waypoint}`;if(key!==appearanceKey){appearanceKey=key;const style=courseStyle(seed);const placement=pinPlacement(seed),base=mapLayout(narrow(),{...placement,...(!state?.waypoint?{greenHeight:222,par3:true}:{}),teeY:state?.waypoint?style.teeY:style.par3TeeY,greenCentreY:style.greenCentreY});appearanceLayout={...(state?.waypoint?waypointLayout(base,state,placement):base),style};}return appearanceLayout;}
const COURSE_HEIGHT=430,TEE_MARKER_OFFSET=78;
const x=similarity=>projectX(similarity,state.baseline,state.threshold,dimensions());
function goldenLanding(a,b,d){let lo=0,hi=1;for(let i=0;i<32;i++){const t=(lo+hi)/2;if(greenContains({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},d))hi=t;else lo=t;}const fraction=hi+(1-hi)*.22;return {fraction,x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction};}
function position(word,event=null){const landed=event??state.history.findLast(e=>e.word===word);if(landed?.golden_holed){const d=dimensions();return goldenLanding(position(landed.origin),{x:d.right,y:d.holeY},d);}if(state.waypoint)return waypointPosition(state,word,dimensions(),event);if(word===state.start)return {x:dimensions().left,y:dimensions().teeY};if(word===state.target)return {x:dimensions().right,y:dimensions().holeY};const h=event??state.history.findLast(e=>e.word===word);return projectPoint(h.destination,state.baseline,state.threshold,dimensions(),.88*[-62,54,-104,97,-28,15][(h.attempt-1)%6]);}
// Word positions are ground anchors; lift the teed ball above its shadow.
function ballPosition(word,event=null){const p=position(word,event);return {...p,y:p.y-(word===state.start?16*(dimensions().artScale??1):0)};}

const path=(a,b)=>`M ${a.x},${a.y} Q ${(a.x+b.x)/2},${Math.min(a.y,b.y)-65} ${b.x},${b.y}`;
function rangeRevealState(){
 if(restoring)return null;
 if(!client||!state)return null;
 if(shortSecondShot(state,client.canFinish(state)))return state;
 if(!flightLog.active?.previous_labels_dismissed&&showPreviousLabels(state)){
  const previous=previousAttempts(flightLog.data.journeys,state,flightLog.active?.id)[0]?.state;
  if(previous&&shortSecondShot(previous,client.canFinish(previous)))return previous;
 }
 return null;
}
function noticeForAttempt(event,saved){
 return !isStrokePlay(saved)&&shortSecondShot(saved,client.canFinish(saved))?'The shot landed short of chip-in range. Try again.':attemptNotice(event,saved.target,saved);
}
function chipShading(d,zone){
 if(!client||!state||restoring)return '';
 if(state.waypoint)return showChipRange?waypointChipGuide(state,d,client.chipRange(state)):'';
 const reveal=autoRangeFeedback?rangeRevealState():null;if(!showChipRange&&!reveal)return '';
 const range=client.chipRange(reveal??state);if(!range)return '';
 const bands=chipArcBands(x(range.first),x(range.last),d);
 return `<defs><clipPath id="chip-range-clip"><rect x="20" y="54" width="${d.edge-20}" height="324"/></clipPath></defs><g id="chip-range-shading" ${!showChipRange&&reveal?`data-auto-revealed="true" ${!state.history.length?'data-previous-range="true"':''}`:''} clip-path="url(#chip-range-clip)" pointer-events="none" aria-hidden="true">${bands.map(b=>`<path d="${b.path}" fill="${b.stroke?'none':'#b94b46'}" stroke="${b.stroke?'#b94b46':'none'}" stroke-width="${b.stroke?1:0}" opacity="${b.opacity}"/>`).join('')}</g>`;
}

let labelLayoutKey,labelLayout=new Map();
function captureWordLabels(d){
 const previous=new Map();
 if(reduced||labelLayoutKey!==appearanceKey||$('map').viewBox.baseVal.width!==d.width)return previous;
 const matrix=$('map').getScreenCTM();if(!matrix?.a||!matrix?.d)return previous;
 for(const label of $('map').querySelectorAll('[data-label-word]')){
  const rect=label.querySelector('rect');if(!rect)continue;
  const box=rect.getBoundingClientRect();previous.set(label.dataset.labelWord,{x:(box.left-matrix.e)/matrix.a,y:(box.top-matrix.f)/matrix.d,path:label.querySelector('path')?.getAttribute('d')});
 }
 return previous;
}
function moveWordLabels(previous){
 for(const label of $('map').querySelectorAll('[data-label-word]')){
  const old=previous.get(label.dataset.labelWord),rect=label.querySelector('rect'),body=label.querySelector('.label-body');
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
function retrySource(){
 if(!state?.challenge||retryPreview||state.won||state.challenge_failed||state.history.some(h=>!h.assumed)||(flightLog.active?.previous_labels_dismissed&&!flightLog.active?.auto_retry))return null;
 const previous=previousAttempts(flightLog.data.journeys,state,flightLog.active?.id)[0];
 if(!previous||!previous.state.history.some(h=>h.success))return null;
 return {...previous,id:flightLog.data.journeys.find(j=>j.state===previous.state)?.id};
}
function retryFromWord(through){
 if(busy||restoring)return;
 const switching=retryPreview,previous=switching?null:retrySource(),source=switching?.source??previous??{state,id:flightLog.active?.id};
 if(returnsToOriginalLie(switching,through)){cancelRetry();$('word').focus({preventScroll:true});return;}
 if(!switching&&!previous&&through===state.history.length&&!state.won&&!state.challenge_failed){$('word').focus();return;}
 const attempt=switching?.attempt??(previous?state.challenge.attempt:state.challenge.attempt+1);
 if(attempt>attemptLimit(state.challenge.par)){$('status').textContent='Attempt limit reached.';return;}
 const original=switching?.original??{state:structuredClone(state),id:flightLog.active?.id,shownEvent,activeNotice,noticeDismissed,entry:$('word').value};
 changingRetry=true;
 try{
  const data=client.retryNow(source.state,through,attempt);
  retryPreview={source,through,attempt,original};state=data.state;$('word').disabled=!!state.challenge_failed;$('launch').disabled=!!(state.won||state.challenge_failed);shownEvent=state.history.at(-1)??null;activeNotice='';noticeDismissed=true;$('word').value='';update();
  $('status').textContent=`Retry from ${state.current.toUpperCase()}. Play your next word.`;
 }catch(error){$('status').textContent=error.message;}finally{changingRetry=false;if(retryPreview)$('word').focus({preventScroll:true});}
}
function cancelRetry(){
 if(!retryPreview||committingRetry||changingRetry||busy)return;
 const original=retryPreview.original;retryPreview=null;
 try{state=client.restoreRetry(original.state).state;shownEvent=original.shownEvent;activeNotice=original.activeNotice;noticeDismissed=original.noticeDismissed;$('word').value=original.entry??'';update();$('status').textContent='';}finally{$('word').disabled=!!state.challenge_failed;$('launch').disabled=!!(state.won||state.challenge_failed);}
}
function commitRetry(){
 if(!retryPreview)return;
 const {source,through,original}=retryPreview;
 if(!original.state.won&&!original.state.challenge_failed&&original.state.history.length){
  const abandoned={...original.state,challenge_failed:true,abandoned:true};
  const old=flightLog.data.journeys.find(j=>j.id===original.id);old.state=abandoned;old.challenge_result='failed';old.scored_strokes=maximumStrokes(abandoned.challenge.par);old.score_to_par=old.scored_strokes-abandoned.challenge.par;
  if(inCourse())rounds.record(abandoned,old.id,dimensions().arrivalDistance/dimensions().axisLength);
 }
 const entries=structuredClone(flightLog.data.journeys.find(j=>j.id===source.id)?.entries.filter(entry=>entry.event?.success&&entry.event.attempt<=through)??[]);
 retryPreview=null;selectedLogId=flightLog.begin(state,modelName(state),modelHash(state)).id;
 for(const entry of entries){entry.assumed=true;entry.event.assumed=true;entry.assumed_from=source.id;}
 flightLog.active.entries=entries;flightLog.active.previous_labels_dismissed=true;flightLog.save();
}
document.addEventListener('pointerdown',event=>{if(retryPreview&&!busy&&!event.target.closest('#launch-form,[data-resume-through]'))void cancelRetry();});
function tappedWord(event){
 const labels=[...$('map').querySelectorAll('[data-resume-through],[data-focus-entry]')].filter(label=>getComputedStyle(label).visibility!=='hidden');
 const targets=labels.map(label=>{
  const rect=label.querySelector('.label-body rect'),dot=[...$('map').querySelectorAll('[data-lie-dot]')].find(n=>n.dataset.lieDot===label.dataset.labelWord)?.querySelector('circle');
  return {word:label.dataset.labelWord,boxes:[rect,dot].filter(Boolean).map(node=>node.getBoundingClientRect())};
 });
 const word=nearestWordTarget(targets,{x:event.clientX,y:event.clientY});
 return labels.find(label=>label.dataset.labelWord===word);
}
function activateWord(label){
 if(!label)return;
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
 const pending=pendingWordTap;pendingWordTap=null;
 if(!pending||pending.id!==event.pointerId||busy||Math.hypot(event.clientX-pending.x,event.clientY-pending.y)>12)return;
 event.preventDefault();event.stopPropagation();activateWord(pending.label);
});
$('map').addEventListener('pointercancel',()=>{pendingWordTap=null;});
$('map').addEventListener('click',event=>{if(event.detail===0)activateWord(event.target.closest('[data-resume-through],[data-focus-entry]'));});
$('map').addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;const label=event.target.closest('[data-resume-through]');if(label){event.preventDefault();void retryFromWord(Number(label.dataset.resumeThrough));}else if(event.target.closest('[data-focus-entry]')&&!busy){event.preventDefault();$('word').focus();}});
function map(preview=null){
 const d=dimensions(),previousLabels=captureWordLabels(d);$('map').setAttribute('viewBox',`0 0 ${d.width} ${COURSE_HEIGHT}`);
 const zone=d.zoneLeft,lake=state.waypoint?waypointLake(d,d.style):lakeGeometry(d,d.style),scale=d.artScale??1,teeOffset=state.waypoint?44:d.par3?64:TEE_MARKER_OFFSET;
 const retry=preview?null:retrySource(),previousEntry=retry?.state.history.find(h=>h.waypoint_reached);$('retry-guidance').hidden=!retry&&!retryPreview&&!flightLog.active?.auto_retry;
 let svg=`<defs><radialGradient id="ball-shade" cx="30%" cy="25%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#f4f5ed"/><stop offset="1" stop-color="#cbd6bd"/></radialGradient><pattern id="fairway-mown" width="${100*scale}" height="${COURSE_HEIGHT}" patternUnits="userSpaceOnUse"><rect width="${100*scale}" height="${COURSE_HEIGHT}" fill="#d8e7c4"/><rect width="${50*scale}" height="${COURSE_HEIGHT}" fill="#e1edcf"/></pattern><pattern id="green-mown" width="${22*scale}" height="${22*scale}" patternUnits="userSpaceOnUse"><rect width="${22*scale}" height="${22*scale}" fill="#95c87b"/><rect width="${11*scale}" height="${22*scale}" fill="#a5d18d"/></pattern>${courseArtDefs}</defs>${state.waypoint?waypointLandscape(state,d,d.style):courseSurrounds(d,d.style,lake)}${chipShading(d,zone)}${state.waypoint?waypointGreen(d,d.style):`${courseBunkers(d,d.style)}<path id="green-fringe" d="${greenPath(d,7)}" fill="#b8cf94"/><path id="putting-green" d="${greenPath(d)}" fill="url(#green-mown)" stroke="#70a35d" stroke-width="2"/>`}${state.waypoint?'':`<path d="${par3CentreTrace(d)}" stroke="#a7bb9b" fill="none" stroke-dasharray="3 8"/>`}${state.waypoint?'':courseLake(d,d.style,lake)+approachLandscape(d,d.style)}${d.par3?par3PathArt(d,d.style):''}${courseTrees(d,d.style,lake)}${state.waypoint?waypointZone(state,d,!!previousEntry):''}`;
 const worldArt=svg;
 for(const offset of [-teeOffset,teeOffset])svg+=`<g class="tee-marker" aria-label="Tee marker"><ellipse cx="${d.left}" cy="${d.teeY+offset+5*scale}" rx="${6*scale}" ry="${2*scale}" fill="#a9bf8d" opacity=".18"/><circle cx="${d.left}" cy="${d.teeY+offset}" r="${4.5*scale}" fill="#b8cf94" stroke="#aec58f" stroke-width="1.2"/></g>`;



 const previousNodes=new Map();
 if(!flightLog.active?.previous_labels_dismissed&&showPreviousLabels(state,preview))for(const attempt of previousAttempts(flightLog.data.journeys,state,flightLog.active?.id)){
  for(const label of previousWordLabels(attempt.state,d))previousNodes.set(label.word,{...label,previous:true,failed:true});
 }
 for(const h of [...visibleAttempts(state).filter(h=>h.success||usefulForwardMiss(h,state)),...(state.automatic_shots??[])]){const origin=state.history.findLast(e=>e.success&&e.word===h.origin&&e.attempt<h.attempt),a=position(h.origin,origin),b=position(h.word,h);svg+=`<path data-shot-path="${h.attempt}" d="${h.golden_holed?`M ${a.x},${a.y} L ${b.x},${b.y} L ${d.right},${d.holeY}`:h.automatic&&h.outcome!=='chip'?`M ${a.x},${a.y} L ${b.x},${b.y}`:path(a,b)}" fill="none" stroke="${h.success?'#7d9f73':'#b7bfb1'}" stroke-width="1.4" ${h.success?'':'stroke-dasharray="3 5"'} opacity=".6"/>`;}
 const nodes=new Map([[state.start,{word:state.start,pos:position(state.start),...(state.challenge?{resumeThrough:0}:{})}]]);
 for(const h of visibleAttempts(state).filter(h=>h.success||usefulForwardMiss(h,state))){if(h.word===state.target)continue;const old=nodes.get(h.word);if(!old)nodes.set(h.word,{word:h.word,pos:position(h.word,h),failed:!h.success,...(h.success&&!h.won?{resumeThrough:h.attempt}:{})});else if(h.success)Object.assign(old,{pos:position(h.word,h),failed:false,...(!h.won?{resumeThrough:h.attempt}:{})});}
 if(retryPreview)for(const h of retryPreview.source.state.history.filter(h=>h.success&&!h.won)){
  if(nodes.has(h.word)||h.word===state.target)continue;
  const source=retryPreview.source.state,pos=source.waypoint?waypointPosition(source,h.word,d,h):projectPoint(h.destination,source.baseline,source.threshold,d,.88*[-62,54,-104,97,-28,15][(h.attempt-1)%6]);
  nodes.set(h.word,{word:h.word,pos,resumeThrough:h.attempt});
 }
 if(!state.waypoint||state.stage!==0||!previousEntry)nodes.set(state.target,{word:state.target,pos:position(state.target)});
 if(state.waypoint){nodes.set(state.final_target,{word:state.final_target,pos:position(state.final_target)});if(state.stage===0&&!previousEntry&&!nodes.has(state.waypoint.word))nodes.set(state.waypoint.word,{word:state.waypoint.word,pos:waypointAnchors(d).bend});}
 if(preview&&(preview.success||usefulForwardMiss(preview,state))){const old=nodes.get(preview.word);if(old)old.preview=true;else nodes.set(preview.word,{word:preview.word,pos:position(preview.word,preview),preview:true});}
 for(const [word,node] of previousNodes){if(!nodes.has(word))nodes.set(word,node);else if(retry&&node.resumeThrough!==undefined)nodes.get(word).resumeThrough=node.resumeThrough;}
 const planets=[...nodes.values()];
 for(const p of planets){const active=p.word===state.current;
 const ball=p.word===(state.final_target??state.target)?`<g transform="translate(${p.pos.x},${p.pos.y}) scale(${scale})"><ellipse rx="10" ry="5" fill="#294d35"/><path d="M0 0 v-48" stroke="#f9fff2" stroke-width="3"/><path d="M2 -48 l25 9 -25 9Z" fill="#d66a4c"/></g>`:`<circle cx="${p.pos.x}" cy="${p.pos.y}" r="${(p.preview?9:6)*scale}" fill="${p.preview?'#fff7df':'#d5e3c5'}" stroke="${p.preview?'#a89965':active?'#25715a':'#63845a'}" stroke-width="2"/>`;
 svg+=`<g data-lie-dot="${esc(p.word)}" ${active&&p.word===state.start?'visibility="hidden"':''} ${p.previous?`class="previous-word-dot previous-attempt-element" data-previous-word="${esc(p.word)}"`:''} opacity="${p.failed?.4:1}">${ball}</g>`;
 }
 // Measure the actual font before packing labels; semantic ball positions never move.
 for(const p of planets)svg+=`<text data-word-label="${esc(p.word)}" x="${p.pos.x}" y="${p.pos.y+35}" text-anchor="middle" class="planet-label">${esc(p.word.toUpperCase())}</text>`;

 const r=ballPosition(state.current);
 svg+=`<g id="golf-ball" transform="translate(${r.x},${r.y})" aria-label="Your golf ball" opacity="${state.won&&state.current===state.target?0:1}" aria-hidden="${state.won&&state.current===state.target}"><g id="ball-size" transform="scale(${scale})"><ellipse id="ball-shadow" cy="18" rx="17" ry="4" fill="#45663e" opacity=".2"/><g id="ball-body"><circle r="16" fill="url(#ball-shade)" stroke="#728363" stroke-width="1"/><g id="ball-dimples">${[[-4,-5],[3,-6],[-7,1],[0,0],[6,1],[-3,6],[4,6]].map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="1.2" fill="#d4ddc8"/>`).join('')}</g></g></g></g>`;
 $('map').innerHTML=svg;
 if(backdropLayout!==d){document.querySelector('.map-card').style.backgroundImage=`url("data:image/svg+xml,${encodeURIComponent(courseContinuation(d,d.style,{foreground:worldArt,lake}))}")`;backdropLayout=d;}
 const textNodes=[...$('map').querySelectorAll('[data-word-label]')];
 const needsBallSpace=p=>p.word!==(state.final_target??state.target)&&(p.word===state.current||preview?.success&&p.word===preview.word);
 const obstacles=planets.filter(p=>!p.previous).map(p=>{if(needsBallSpace(p)||p.resumeThrough!==undefined){const b=p.word===state.current?ballPosition(p.word,preview):{x:p.pos.x,y:p.pos.y-(p.word===state.start?16*scale:0)};return {x:b.x-17,y:b.y-17,width:34,height:40};}const radius=p.word===state.target?10:8;return {x:p.pos.x-radius,y:p.pos.y-radius,width:2*radius,height:2*radius};});
 obstacles.push(...lake.obstacles,{x:d.right-3,y:d.holeY-51,width:33,height:52},...[-teeOffset,teeOffset].map(offset=>({x:d.left-7,y:d.teeY+offset-7,width:14,height:16})));
 const measured=textNodes.map((node,i)=>{const p=planets[i],box=node.getBBox();return {word:p.word,optional:!!p.previous,failed:!!p.failed,...p.pos,...(state.waypoint&&(d.waypointTurn==='up'?p.pos.y<215:p.pos.y>215)?{preferAbove:d.waypointTurn==='down'}:{}),radius:(needsBallSpace(p)?16:p.word===(state.final_target??state.target)?10:6)*scale,gap:needsBallSpace(p)?(p.word===state.start?8:12):5,width:box.width,height:box.height,priority:p.previous?-1:p.word===state.start?5:p.word===state.current?4:p.word===state.target?3:p.failed?0:1};});
 if(labelLayoutKey!==appearanceKey){labelLayoutKey=appearanceKey;labelLayout=new Map();}
 const layout=layoutLabels(measured,obstacles,d.width,COURSE_HEIGHT,labelLayout);
 labelLayout=layout.labels;
 for(const node of textNodes)node.remove();
 let labels='';
 for(const p of planets){const box=layout.labels.get(p.word);if(!box)continue;const endX=Math.max(box.x,Math.min(box.x+box.width,p.pos.x)),endY=Math.max(box.y,Math.min(box.y+box.height,p.pos.y));const length=Math.hypot(endX-p.pos.x,endY-p.pos.y)||1;const markerRadius=(p.word===state.current?16:p.word===(state.final_target??state.target)?10:6)*scale;const startX=p.pos.x+markerRadius*(endX-p.pos.x)/length,startY=p.pos.y+markerRadius*(endY-p.pos.y)/length;
 labels+=`<g class="word-label${!p.previous&&(state.won?(p.word===state.start||p.word===(state.final_target??state.target)):(p.word===state.current||p.word===state.target))?' active-word-label':''}${p.previous?' previous-word-label previous-attempt-element':''}" data-label-word="${esc(p.word)}" ${p.word===state.current?'data-focus-entry="true"':''} ${p.resumeThrough!==undefined?`data-resume-through="${p.resumeThrough}" role="button" tabindex="0" aria-label="Retry from ${esc(p.word.toUpperCase())}"`: p.word===state.current?`role="button" tabindex="0" aria-label="${state.current===state.start?'Play your first word':'Play your next word'}"`:''} opacity="${p.failed?.72:1}">${p.previous?'':`<path d="M${startX} ${startY} L${endX} ${endY}" stroke="#8ba17e" stroke-width="1"/>`}<g class="label-body"><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="5" fill="#f4f7ee" fill-opacity=".96"/><text x="${box.textX}" y="${box.textY}" dominant-baseline="central" text-anchor="middle" class="planet-label">${esc(p.word.toUpperCase())}</text></g></g>`;
 }
 $('map').insertAdjacentHTML('beforeend',labels);
 $('map').setAttribute('viewBox',`0 0 ${d.width} ${layout.height}`);
 $('map').style.minHeight='';$('map').dataset.teeWord=state.start;moveWordLabels(previousLabels);
}
function telemetry(){
 const last=shownEvent;
 $('telemetry').textContent=JSON.stringify({current:state.current,proposed:last?.word??null,target:state.target,word_model:state.word_model??'current',headwind:state.headwind??null,shot_outcome:last?.outcome??null,destination_target:last?.leg_target??state.target,waypoint_finish:last?.waypoint_finish??false,automatic_finish_contact:last?.automatic_shot?.launch??null,contact_made:last?.connected??null,safe_landing:last?.safe??null,contact_cosine:last?.launch??null,destination_cosine:last?.destination??null,shot_mode:state.mode,rules:state.rules,finish_mode:state.finish_mode??'green',finish_reason:last?.finish_reason??null,automatic_finish:last?.automatic_shot?.outcome??null,required_contact:last?.required??state.threshold,trip_fraction:last?.trip_fraction??null,hub_surcharge:last?.hub_surcharge??null,green_threshold:state.threshold,short_shot:state.launch_min,long_shot:state.launch_max,water_boundary:state.best_progress-state.backward_allowance,progress:state.progress,starting_boundary:state.baseline,inside_arrival_zone:last?.inside??null,attempts:state.attempts,successful_route:state.route,failed_attempts:state.history.filter(e=>!e.success).map(e=>({word:e.word,launch:e.launch,destination:e.destination,reason:e.outcome==='water'?'water hazard':e.outcome==='miss'?'weak contact':e.forward===false?'backward shot':'previous course boundary'}))},null,2);
}
function renderLog(){
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
 const labels=document.querySelectorAll('#arrival-banner .scorecard-grid .scorecard-label');labels[0].textContent='SCORE';labels[1].textContent='ATTEMPTS';
 $('arrival-skill').hidden=!holeResult();const played=flightLog.data.journeys.filter(j=>j.state.challenge?.id===state.challenge?.id&&(j.state.won||j.state.challenge_failed)).map(j=>j.state.won?j.state.attempts-j.state.challenge.par:maximumStrokes(j.state.challenge.par)-j.state.challenge.par);labels[0].textContent='BEST';$('arrival-skill-value').textContent=played.length?bestScoreText(Math.min(...played)):'—';
}
function renderSkill(){ $('skill-panel').hidden=true;updateArrivalSkill(); }
function syncPuzzleSelection(){
 const index=config.puzzles.findIndex(p=>p.start===state.start&&p.target===(state.final_target??state.target)&&p.waypoint?.word===state.waypoint?.word&&windKey(p)===windKey(state)&&courseSettings(p).threshold===(state.final_threshold??state.threshold)&&(p.mode||'fixed')===state.mode);
 $('puzzle').querySelector('option[value="custom"]')?.remove();
 if(index<0){const option=document.createElement('option');option.value='custom';option.textContent=inCourse()?`${rounds.active.name} · Hole ${rounds.active.index+1}`:`${holeLabel(state)} (custom)`;$('puzzle').append(option);$('puzzle').value='custom';}
 else $('puzzle').value=String(index);
}
function renderAttemptCounter(){
 $('attempts').textContent=state.challenge?`${state.challenge.attempt} of ${attemptLimit(state.challenge.par)}`:state.attempts;
 $('counter-label').textContent=state.challenge?'ATTEMPT':'SHOTS';
}
function update(){
 $('chip-range-note').hidden=!showChipRange||!!state?.waypoint&&state.stage===0;
 const prompt=state.current===state.start?'Play your first word':'Play your next word';$('word').placeholder=prompt;document.querySelector('label[for="word"]').textContent=prompt;
 $('word-model').value=state.word_model??'';
 $('model-info').textContent=`${modelName(state)} / ${config.vocabulary.toLocaleString()} WORDS · ${config.release}`;
 $('hole-number').textContent=`HOLE ${inCourse()?rounds.active.index+1:1}`;$('hole-par').textContent=`(PAR ${state.challenge?.par??3})`;renderAttemptCounter();
 for(const label of document.querySelectorAll('[data-current-word]'))label.textContent=state.current.toUpperCase();
 for(const label of document.querySelectorAll('[data-target-word]'))label.textContent=state.target.toUpperCase();
 $('headwind-note').hidden=!state.headwind;
 $('headwind-note').textContent=state.headwind?`Headwind: ${state.headwind.word.toUpperCase()} · ${Math.round(state.headwind.strength*100)}% topic reduction`:'';
 $('lab-start').value=state.start;$('lab-target').value=state.target;$('threshold').value=state.threshold;$('launch-mode').value=state.mode;$('launch-min').value=state.launch_min;$('launch-max').value=state.launch_max;
 document.querySelector('.controls').hidden=holeResult()||courseResult();
 document.querySelector('.attempts').hidden=!!state.won;
 $('arrival-banner').hidden=!(holeResult()||courseResult());$('arrival-actions').hidden=!(holeResult()||courseResult());
 document.querySelector('.map-card').classList.toggle('arrived',holeResult()||courseResult());document.querySelector('.map-card').classList.toggle('course-mode',inCourse());
 if(holeResult()){
  const result=successOutcome(state).replace(/ on attempt \d+$/,'');
  $('arrival-title').textContent=state.won?(state.attempts===1?'Hole in one!':`You got ${/^[AEIOU]/i.test(result)?'an':'a'} ${result}!`):courseExhausted()?'Attempt limit reached':maximumScoreText(state.challenge.par);
  const final=state.history.at(-1);$('arrival-detail').textContent=(courseExhausted()&&!state.won?`Maximum score: ${maximumScoreText(state.challenge.par)}. `:'')+(state.challenge_failed&&final?(['miss','water'].includes(final.outcome)?attemptNotice(final,state.target,state):`${final.word.toUpperCase()} landed short of the hole.`):'');$('arrival-detail').hidden=!$('arrival-detail').textContent;
  $('arrival-attempt').textContent=state.challenge?.attempt??1;$('arrival-par').textContent=`PAR ${state.challenge?.par??3}`;
 }
 renderNotice();
 recordCourseState();map();telemetry();renderLog();updateArrivalSkill();
 if(!inCourse()){$('round-scorecard').hidden=true;$('replay-hole').hidden=false;$('replay-hole').textContent='REPLAY';$('next-hole').textContent='NEXT HOLE';$('replay-hole').hidden=!!state.challenge&&state.challenge.attempt>=attemptLimit(state.challenge.par);}
 styleResultButtonLabels();
}
function renderNotice(){
 $('shot-notice').hidden=noticeDismissed||!activeNotice||holeResult()||courseResult();
 const text=$('shot-notice-text');
 if(activeNotice.startsWith('Miss!')){
  const lead=document.createElement('strong');lead.className='notice-lead';lead.textContent='MISS!';
  text.replaceChildren(lead,document.createTextNode(activeNotice.slice(5)));
 }else text.textContent=activeNotice;
}
async function newGame(puzzle,{notice=''}={}){
 if(busy)return false;
 clearTimeout(retryTimer);retryPreview=null;autoRangeFeedback=false;
 puzzle=courseSettings(puzzle);
 puzzle={...puzzle,word_model:''};
 puzzle.challenge??={version:STROKE_PLAY,par:puzzle.par??state?.challenge?.par??3,attempt:1,id:crypto.randomUUID()};
 lock(true);$('status').textContent=puzzle.word_model==='ls15-v1'?'Preparing 15% LS trial…':puzzle.word_model?'Preparing ABTT trial (about 14 MB on first use)…':'';
 try{const data=await api('new',{...puzzle,finish_mode:'range'});state=data.state;shownEvent=null;activeNotice=notice;noticeDismissed=false;resetBridgeView();selectedLogId=flightLog.begin(state,modelName(state),modelHash(state)).id;$('copy-fallback').hidden=true;$('log-feedback').textContent='';syncPuzzleSelection();update();$('word').value='';$('status').textContent='';return true;}
 catch(error){$('word-model').value=state?.word_model??'';$('status').textContent=error.message;return false;}finally{lock(false);if(state?.won||state?.challenge_failed)$('launch').disabled=true;}
}
function bezier(a,b,t){return {x:(1-t)**2*a.x+2*(1-t)*t*(a.x+b.x)/2+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*(Math.min(a.y,b.y)-65)+t*t*b.y};}
async function animate(event){
 const a=ballPosition(state.current),b=event.golden_holed?position(state.final_target??state.target):ballPosition(event.word,event),ball=$('golf-ball');
 if(event.success){const originDot=[...$('map').querySelectorAll('[data-lie-dot]')].find(node=>node.dataset.lieDot===event.origin);originDot?.removeAttribute('visibility');}
 if(reduced)return;
 const kind=event.golden_holed?'golden':event.automatic?(event.outcome==='chip'?'chip':'putt'):event.success&&event.word===(state.final_target??state.target)?'chip':'flight';
 ball.setAttribute('data-motion',kind);
 const duration=event.outcome==='miss'?450:kind==='golden'?2300:kind==='putt'?850:kind==='chip'?1350:1000;
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
 if(busy||!state||state.won||state.challenge_failed||(inCourse()&&rounds.active.finished))return false;
 lock(true);committingRetry=true;$('word').blur();committingRetry=false;noticeDismissed=false;$('shot-notice').hidden=true;renderAttemptCounter();
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

 state=data.state;autoRangeFeedback=shortSecondShot(state,client.canFinish(state));shownEvent=event;activeNotice=state.challenge_failed?(maxed()?`Maximum score: ${maximumScoreText(state.challenge.par)}.`:noticeForAttempt(event,data.state)):isStrokePlay(state)&&!state.won&&state.history.length===maximumStrokes(state.challenge.par)-1?`Final shot · maximum score: ${maximumScoreText(state.challenge.par)}.`:'';update();$('word').value='';
 if(event.won)document.querySelector('.map-card').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
 $('status').textContent=event.waypoint_reached&&!event.won?`Waypoint reached. Aim for ${state.target.toUpperCase()} now.`:event.won||['water','miss'].includes(event.outcome)?'':event.outcome==='backtrack'?`Returned to ${event.word}.`:event.outcome==='recovery'?`Recovered to ${event.word}.`:event.success?`Landed on ${event.word}.`:'Ball stayed put. One shot counted.';

 if(state.challenge_failed&&!maxed())scheduleRetry();
 return true;
 }catch(error){renderAttemptCounter();$('status').textContent=entryNotice(error,state.current);return false;}
 finally{lock(false);$('word').disabled=!!state.challenge_failed;if(state.won||state.challenge_failed)$('launch').disabled=true;else if(!narrow())$('word').focus({preventScroll:true});}
}
function scheduleRetry(){
 clearTimeout(retryTimer);if(maxed()||courseExhausted()||inCourse()&&rounds.active.finished)return;const failed=flightLog.active?.id;
 retryTimer=setTimeout(async()=>{
  if(busy||!state.challenge_failed||flightLog.active?.id!==failed)return;
  const saved=state,notice=activeNotice,prefix=retryLieThrough(saved);
  const attempt=inCourse()?rounds.settings().challenge.attempt:saved.challenge.attempt+1;
  lock(true);
  try{
   const data=await api('retry-prefix',{state:saved,through:prefix,attempt});state=data.state;
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
$('new-game').onclick=()=>{leaveCourse();newGame(restartSettings(state,config.puzzles[0]));};
async function playFromResult(puzzle){
 if(await newGame(puzzle))document.querySelector('.mission').scrollIntoView({block:'start',behavior:reduced?'instant':'smooth'});
}
$('replay-hole').onclick=()=>inCourse()?(rounds.active.finished?startCourse(rounds.active.courseId,rounds.active.model):playFromResult(rounds.settings())):playFromResult({...restartSettings(state,config.puzzles[0]),challenge:{...state.challenge,version:STROKE_PLAY,attempt:state.challenge.attempt+1}});
$('next-hole').onclick=()=>{
 if(inCourse()){if(!rounds.active.finished)return advanceCourse();const i=config.courses.findIndex(c=>c.id===rounds.active.courseId);return startCourse(config.courses[(i+1)%config.courses.length].id,rounds.active.model);}
 const index=config.puzzles.findIndex(p=>p.start===state.start&&p.target===(state.final_target??state.target)&&p.waypoint?.word===state.waypoint?.word&&windKey(p)===windKey(state));
 return playFromResult(config.puzzles[(index+1)%config.puzzles.length]);
};
$('word-model').onchange=async()=>{
 const profile=$('word-model').value;leaveCourse();
 if(await newGame(courseSettings({...config.puzzles[0],...restartSettings(state,config.puzzles[0]),...(state.word_model?{word_model:state.word_model}:{}),...(state.headwind?{headwind:state.headwind}:{})},profile)))previewHole();
};
$('puzzle').onchange=()=>{leaveCourse();newGame(config.puzzles[Number($('puzzle').value)]);};
const assessments=new Map();
function assess(settings){
 settings={finish_mode:'range',...settings};
 const key=JSON.stringify([settings.start,settings.target,settings.threshold,settings.mode,settings.launch_min,settings.launch_max,settings.finish_mode,settings.rules??(settings.mode==='fixed'?'golf-fixed-v3':'golf-distance-v3'),windKey(settings),settings.word_model??'']);
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
  $('retry-guidance').hidden=true;void fadePreviousLabels();
 }
 if(activeNotice&&flightLog.active){flightLog.active.notice_dismissed=true;flightLog.save();}
 activeNotice='';noticeDismissed=true;renderNotice();fitTypingView();
});
let assessmentTimer,assessmentSequence=0,customBridgeResult=null;
$('custom-bridges').addEventListener('toggle',()=>{if($('custom-bridges').open&&customBridgeResult){$('custom-bridge-list').innerHTML=bridgeList(customBridgeResult);flightLog.markBridgeView(customBridgeResult.settings,'preview',modelHash(customBridgeResult.settings));}});
function previewHole(){
 clearTimeout(assessmentTimer);const sequence=++assessmentSequence;
 const start=$('custom-start').value.trim().toLowerCase(),target=$('custom-target').value.trim().toLowerCase(),waypoint=$('custom-waypoint').value.trim().toLowerCase();
 const warning=$('custom-hub-warning');warning.textContent='';warning.hidden=true;
 if(client)api('breadth',{start,target}).then(endpoints=>{if(sequence!==assessmentSequence)return;warning.textContent=hubWarningText(endpoints);warning.hidden=!endpoints.length;});
 $('custom-assessment').dataset.valid='false';
 customBridgeResult=null;$('custom-bridges').hidden=true;$('custom-bridges').open=false;$('custom-bridge-list').textContent='';
 if(!start||!target||!client){$('custom-assessment').textContent='';return;}
 $('custom-assessment').textContent='Assessing these words…';
 assessmentTimer=setTimeout(async()=>{
  try{
   if(waypoint){
    if(new Set([start,waypoint,target]).size!==3)throw Error('Choose three different words.');
    const legs=await Promise.all([[start,waypoint],[waypoint,target]].map(([start,target])=>assess(courseSettings({...config.puzzles[0],start,target}))));
    if(sequence!==assessmentSequence)return;
    $('custom-assessment').textContent=`Tee → waypoint: ${legs[0].separation_degrees.toFixed(0)}° · waypoint → hole: ${legs[1].separation_degrees.toFixed(0)}°. Mandatory waypoint · 18 attempts · maximum 8 strokes.`;
    $('custom-assessment').dataset.valid='true';return;
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
 event.preventDefault();if(busy||!config)return;
 $('custom-start').blur();$('custom-waypoint').blur();$('custom-target').blur();$('custom-feedback').textContent='';
 const middle=$('custom-waypoint').value.trim().toLowerCase();
 leaveCourse();const started=await newGame(courseSettings({...config.puzzles[0],start:$('custom-start').value,target:$('custom-target').value,...(middle?{waypoint:{word:middle,threshold:.27,turn:'up'},par:5,validate_direct:false}:{validate_direct:true})}));
 if(!started){$('custom-feedback').textContent=$('status').textContent;return;}
 $('custom-start').value=state.start;$('custom-waypoint').value=state.waypoint?.word??'';$('custom-target').value=state.final_target??state.target;
 $('custom-feedback').textContent=`Your ${holeLabel(state)} hole is ready.${state.waypoint?` ${attemptLimit(state.challenge.par)} attempts.`:''}`;
 document.querySelector('.map-card').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
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
 const exported=JSON.parse(flightLog.exportJSON());exported.course_rounds=rounds.exportData();
 const blob=new Blob([JSON.stringify(exported,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='word-golf-scorecards.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('log-feedback').textContent='Scorecards download requested. If it does not appear, use Copy scorecard.';
};
renderLog();
try{lock(true);$('status').textContent='Preparing the hole…';client=await createBrowserClient({onProgress:progress=>{const note=$('word-loading-note');note.hidden=progress.complete;note.textContent=progress.error?'Some words are still loading. You can keep playing.':'More words are loading in the background…';}});config=client.config;lock(false);const options=predicate=>config.puzzles.map((p,i)=>predicate(p)?`<option value="${i}">${(p.course_number??p.comparison_number)?String(p.course_number??p.comparison_number).padStart(2,'0')+' · ':''}${esc(holeLabel(p))}</option>`:'').join('');$('puzzle').innerHTML=`<optgroup label="New waypoint tests · 15 holes">${options(p=>p.course_set==='waypoint-discovery-v1')}</optgroup><optgroup label="Waypoint trials · 3 longer holes">${options(p=>p.course_set==='waypoint-trial-v1')}</optgroup><optgroup label="Fresh course · 10 holes">${options(p=>p.course_set==='fresh-course-v1')}</optgroup><optgroup label="Player discoveries · 4 holes">${options(p=>p.course_set==='player-discoveries-v1')}</optgroup><optgroup label="Discovery holes · set 2">${options(p=>p.comparison_set==='current-ls15-v1')}</optgroup><optgroup label="Discovery holes · set 1">${options(p=>p.comparison_set==='current-abtt-v1')}</optgroup><optgroup label="Regular course">${options(p=>!p.comparison_set&&!p.course_set)}</optgroup>`;$('model-info').textContent=`${config.model} / ${config.vocabulary.toLocaleString()} WORDS · ${config.release||'golf-v99'}`;if(flightLog.active?.state.word_model){const saved=flightLog.active.state;await newGame(courseSettings({...config.puzzles[0],...restartSettings(saved,config.puzzles[0])}));}else if(startupAction(flightLog.active,config.puzzles[0])==='upgrade'){const saved=flightLog.active.state;await newGame(courseSettings({...config.puzzles[0],...restartSettings(saved,config.puzzles[0]),...(saved.headwind?{headwind:saved.headwind}:{})}));$('status').textContent='Teed up this hole with the new scoring rules. Earlier scorecards are saved below.';}else if(startupAction(flightLog.active,config.puzzles[0])==='restore'){try{state=(await api('display',{state:flightLog.active.state})).state;restoring=true;shownEvent=state.history.at(-1)||null;update();lock(true);await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));state=(await api('restore',{state})).state;restoring=false;lock(false);shownEvent=state.history.at(-1)||null;noticeDismissed=!!flightLog.active.notice_dismissed;const previous=previousAttempts(flightLog.data.journeys,state,flightLog.active?.id)[0]?.state;activeNotice=state.challenge_failed?noticeForAttempt(shownEvent,state):state.history.every(h=>h.assumed)&&previous?noticeForAttempt(previous.history.at(-1),previous):'';syncPuzzleSelection();update();$('status').textContent='';if(state.won||state.challenge_failed)$('launch').disabled=true;if(state.challenge_failed&&!maxed())scheduleRetry();}catch{restoring=false;lock(false);await newGame(config.puzzles[0]);$('status').textContent='Teed up a fresh hole. Your earlier scorecards are still available below.';}}else await newGame(config.puzzles[0]);await initialiseCourses();requestAnimationFrame(()=>requestAnimationFrame(()=>{void client.startBackground().catch(()=>{});}));}
catch(error){$('status').textContent=`Course unavailable: ${error.message}. Please reload to try again.`;}

window.addEventListener('resize',()=>{if(state&&!busy){map();}});

// Keep the map and input in the visible area above mobile software keyboards.
let typingScroll=0,typingMaxWidth=0;
function fitTypingView(){
 if(!document.body.classList.contains('typing'))return;
 const frame=stableTypingViewport(window.visualViewport,innerHeight);if(!frame)return;
 document.documentElement.style.setProperty('--typing-height',`${frame.height}px`);
 document.documentElement.style.setProperty('--typing-top',`${frame.top}px`);
 const main=document.querySelector('main'),mission=document.querySelector('.mission'),controls=document.querySelector('.controls');
 const ms=getComputedStyle(main),hs=getComputedStyle(mission),cs=getComputedStyle(controls),px=v=>parseFloat(v)||0;
 const available=main.clientHeight-px(ms.paddingTop)-px(ms.paddingBottom)-mission.getBoundingClientRect().height-px(hs.marginTop)-px(hs.marginBottom)-controls.getBoundingClientRect().height-px(cs.marginTop)-px(cs.marginBottom)-document.querySelector('.course-feedback').getBoundingClientRect().height;
 const box=$('map').viewBox.baseVal,limit=Math.min(typingMaxWidth,main.clientWidth-px(ms.paddingLeft)-px(ms.paddingRight));
 document.documentElement.style.setProperty('--typing-course-width',`${typingCourseWidth(limit,available,box.width,box.height)}px`);
}
$('launch').addEventListener('pointerdown',event=>{
 if(document.body.classList.contains('typing'))event.preventDefault();
});
$('word').addEventListener('focus',()=>{
 document.body.classList.add('word-entry-active');
 if(!narrow())return;
 if(document.body.classList.contains('typing')){fitTypingView();return;}
 typingScroll=window.scrollY;typingMaxWidth=document.querySelector('.map-card').getBoundingClientRect().width;document.body.classList.add('typing');fitTypingView();
});
$('word').addEventListener('blur',event=>{
 if(changingRetry)return;
 document.body.classList.remove('word-entry-active');
 if(!document.body.classList.contains('typing'))return;
 document.body.classList.remove('typing');window.scrollTo({top:typingScroll,behavior:'instant'});
});
window.visualViewport?.addEventListener('resize',fitTypingView);
window.visualViewport?.addEventListener('scroll',fitTypingView);
window.addEventListener('resize',fitTypingView);

// Safari's gesture events and multi-touch fallback supplement touch-action.
for(const type of ['gesturestart','gesturechange','gestureend'])document.querySelector('.map-card').addEventListener(type,event=>{if(document.body.classList.contains('typing')&&event.cancelable)event.preventDefault();},{passive:false});
document.querySelector('.map-card').addEventListener('touchmove',event=>{if(document.body.classList.contains('typing')&&event.touches.length>1&&event.cancelable)event.preventDefault();},{passive:false});
