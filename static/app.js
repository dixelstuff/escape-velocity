import {courseSurrounds,courseTrees,courseBunkers,courseLake,courseArtDefs,approachLandscape,courseContinuation} from './course-art.mjs?v=golf-v40';
import { pinPlacement, greenPath, courseStyle, lakeGeometry } from './course-appearance.mjs?v=golf-v40';
import { shotMotion } from './shot-motion.mjs?v=golf-v40';
import { failedShotSummary } from './round-summary.mjs?v=golf-v40';
import { markedRoute, shortcutNote } from './route-review.mjs?v=golf-v40';
import { hubWarningText } from './hub-warning.mjs?v=golf-v40';
import { createBrowserClient } from './engine.mjs?v=golf-v40';
import { mapLayout, axisPoint, projectX, projectPoint, chipArcBands, visibleAttempts, layoutLabels } from './map.mjs?v=golf-v40';
import { startupAction, restartSettings } from './startup.mjs?v=golf-v40';
import { FlightLog, outcome, journeyText } from './flight-log.mjs?v=golf-v40';
import { validSkillReport, skillHistoryKey } from './skill.mjs?v=golf-v40';
import { bridgeKey, openingGreenShots } from './bridge-feedback.mjs?v=golf-v40';
import { currentSkillFeedback } from './skill-feedback.mjs?v=golf-v40';
const $=id=>document.getElementById(id);
let config,state,client,busy=false,shownEvent=null,resultDismissed=false,noticeDismissed=false,bridgeViewVersion=0;
let storage;try{storage=window.localStorage;}catch{}
let showChipRange=true;try{showChipRange=storage?.getItem('word-golf-chip-range')!=='off';}catch{}
$('show-chip-range').checked=showChipRange;
$('chip-range-note').hidden=!showChipRange;
$('show-chip-range').addEventListener('change',()=>{showChipRange=$('show-chip-range').checked;try{storage?.setItem('word-golf-chip-range',showChipRange?'on':'off');}catch{}$('chip-range-note').hidden=!showChipRange;if(state)map();});
const flightLog=new FlightLog(storage);
let selectedLogId=flightLog.data.activeId;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){return client.request(path,body);}
function lock(value){busy=value;for(const e of document.querySelectorAll('button,input,select'))if(!['copy-log','download-log','log-journey'].includes(e.id))e.disabled=value;}
const narrow=()=>matchMedia('(max-width:650px)').matches;
let appearanceKey,appearanceLayout,backdropLayout;
function dimensions(){const key=`${narrow()}:${flightLog.active?.id}`;if(key!==appearanceKey){appearanceKey=key;const seed=flightLog.active?.id??'opening',style=courseStyle(seed);appearanceLayout={...mapLayout(narrow(),{...pinPlacement(seed),teeY:style.teeY,greenCentreY:style.greenCentreY}),style};}return appearanceLayout;}
const COURSE_HEIGHT=430,TEE_MARKER_OFFSET=78;
const x=similarity=>projectX(similarity,state.baseline,state.threshold,dimensions());
function position(word,event=null){if(word===state.start)return {x:dimensions().left,y:dimensions().teeY};if(word===state.target)return {x:dimensions().right,y:dimensions().holeY};const h=state.history.find(e=>e.word===word)||event;return projectPoint(h.destination,state.baseline,state.threshold,dimensions(),1.1*[-62,54,-104,97,-28,15][(h.attempt-1)%6]);}
// Word positions are ground anchors; lift the teed ball above its shadow.
function ballPosition(word,event=null){const p=position(word,event);return {...p,y:p.y-(word===state.start?16:0)};}
function waterPoint(event){const d=dimensions();return {x:Math.max(48,Math.min(d.zoneLeft*.65,axisPoint(x(event.destination)-d.left,0,d).x)),y:407};}
const path=(a,b)=>`M ${a.x},${a.y} Q ${(a.x+b.x)/2},${Math.min(a.y,b.y)-65} ${b.x},${b.y}`;
function chipShading(d,zone){
 if(!showChipRange||!client||!state)return '';
 const range=client.chipRange(state);if(!range)return '';
 const bands=chipArcBands(x(range.first),x(range.last),d);
 return `<defs><clipPath id="chip-range-clip"><rect x="20" y="54" width="${d.edge-20}" height="324"/></clipPath></defs><g id="chip-range-shading" clip-path="url(#chip-range-clip)" pointer-events="none" aria-hidden="true">${bands.map(b=>`<path d="${b.path}" fill="${b.stroke?'none':'#b94b46'}" stroke="${b.stroke?'#b94b46':'none'}" stroke-width="${b.stroke?1:0}" opacity="${b.opacity}"/>`).join('')}</g>`;
}

function captureTeeLabel(d){
 if(reduced||$('map').dataset.teeWord!==state.start||$('map').viewBox.baseVal.width!==d.width)return null;
 const label=[...$('map').querySelectorAll('[data-label-word]')].find(e=>e.dataset.labelWord===state.start),rect=label?.querySelector('rect');
 const matrix=$('map').getScreenCTM();if(!rect||!matrix?.a||!matrix?.d)return null;
 const box=rect.getBoundingClientRect();return {x:(box.left-matrix.e)/matrix.a,y:(box.top-matrix.f)/matrix.d,path:label.querySelector('path').getAttribute('d')};
}
function moveTeeLabel(previous){
 if(!previous)return;
 const label=[...$('map').querySelectorAll('[data-label-word]')].find(e=>e.dataset.labelWord===state.start),rect=label?.querySelector('rect'),body=label?.querySelector('.label-body');
 if(!rect||!body)return;
 const dx=previous.x-Number(rect.getAttribute('x')),dy=previous.y-Number(rect.getAttribute('y'));
 if(Math.hypot(dx,dy)<.25)return;
 body.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0px,0px)'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)'});
 const connector=label.querySelector('path'),motion=document.createElementNS('http://www.w3.org/2000/svg','animate');
 for(const [key,value] of Object.entries({attributeName:'d',from:previous.path,to:connector.getAttribute('d'),dur:'.36s',begin:'indefinite',calcMode:'spline',keyTimes:'0;1',keySplines:'.2 .8 .2 1'}))motion.setAttribute(key,value);
 connector.append(motion);motion.beginElement?.();
}
function map(preview=null){
 const d=dimensions(),previousTee=captureTeeLabel(d);$('map').setAttribute('viewBox',`0 0 ${d.width} ${COURSE_HEIGHT}`);
 const zone=d.zoneLeft,lake=lakeGeometry(d,d.style);
 let svg=`<defs><radialGradient id="ball-shade" cx="30%" cy="25%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#f4f5ed"/><stop offset="1" stop-color="#cbd6bd"/></radialGradient><pattern id="fairway-mown" width="100" height="${COURSE_HEIGHT}" patternUnits="userSpaceOnUse"><rect width="100" height="${COURSE_HEIGHT}" fill="#d8e7c4"/><rect width="50" height="${COURSE_HEIGHT}" fill="#e1edcf"/></pattern><pattern id="green-mown" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#95c87b"/><rect width="11" height="22" fill="#a5d18d"/></pattern>${courseArtDefs}</defs><rect width="${d.width}" height="${COURSE_HEIGHT}" fill="url(#fairway-mown)"/>${courseSurrounds(d,d.style,lake)}${chipShading(d,zone)}${courseBunkers(d,d.style)}<path id="green-fringe" d="${greenPath(d,7)}" fill="#b8cf94"/><path id="putting-green" d="${greenPath(d)}" fill="url(#green-mown)" stroke="#70a35d" stroke-width="2"/><path d="M${d.left} ${d.teeY} L${d.right-12*d.axisX} ${d.holeY-12*d.axisY}" stroke="#a7bb9b" stroke-dasharray="3 8"/>${courseLake(d,d.style,lake)}${approachLandscape(d,d.style)}${courseTrees(d,d.style,lake)}`;
 for(const offset of [-TEE_MARKER_OFFSET,TEE_MARKER_OFFSET])svg+=`<g class="tee-marker" aria-label="Tee marker"><ellipse cx="${d.left}" cy="${d.teeY+offset+5}" rx="6" ry="2" fill="#a9bf8d" opacity=".18"/><circle cx="${d.left}" cy="${d.teeY+offset}" r="4.5" fill="#b8cf94" stroke="#aec58f" stroke-width="1.2"/></g>`;
 if(preview?.outcome==='water'){const splash=waterPoint(preview);svg+=`<circle id="water-splash" cx="${splash.x}" cy="${splash.y}" r="8" fill="none" stroke="#fff" stroke-width="3" opacity="0"/>`;}


 for(const h of [...visibleAttempts(state),...(state.automatic_shots??[])]){const a=position(h.origin),b=position(h.word,h);svg+=`<path data-shot-path="${h.attempt}" d="${h.automatic&&h.outcome!=='chip'?`M ${a.x},${a.y} L ${b.x},${b.y}`:path(a,b)}" fill="none" stroke="${h.success?'#7d9f73':'#b7bfb1'}" stroke-width="1.4" ${h.success?'':'stroke-dasharray="3 5"'} opacity=".6"/>`;}
 const nodes=new Map([[state.start,{word:state.start,pos:position(state.start)}]]);
 for(const h of visibleAttempts(state)){if(h.word===state.target)continue;const old=nodes.get(h.word);if(!old)nodes.set(h.word,{word:h.word,pos:position(h.word,h),failed:!h.success});else if(h.success)old.failed=false;}
 nodes.set(state.target,{word:state.target,pos:position(state.target)});
 if(preview&&preview.outcome!=='water'&&(preview.forward!==false||preview.success)){const old=nodes.get(preview.word);if(old)old.preview=true;else nodes.set(preview.word,{word:preview.word,pos:position(preview.word,preview),preview:true});}
 const planets=[...nodes.values()];
 for(const p of planets){const active=p.word===state.current;
 if(active&&p.word===state.start)continue;
 const ball=p.word===state.target?`<ellipse cx="${p.pos.x}" cy="${p.pos.y}" rx="10" ry="5" fill="#294d35"/><path d="M${p.pos.x} ${p.pos.y} v-48" stroke="#f9fff2" stroke-width="3"/><path d="M${p.pos.x+2} ${p.pos.y-48} l25 9 -25 9Z" fill="#d66a4c"/>`:`<circle cx="${p.pos.x}" cy="${p.pos.y}" r="${p.preview?9:6}" fill="${p.preview?'#fff7df':'#d5e3c5'}" stroke="${p.preview?'#a89965':active?'#25715a':'#63845a'}" stroke-width="2"/>`;
 svg+=`<g opacity="${p.failed?.4:1}">${ball}</g>`;
 }
 // Measure the actual font before packing labels; semantic ball positions never move.
 for(const p of planets)svg+=`<text data-word-label="${esc(p.word)}" x="${p.pos.x}" y="${p.pos.y+35}" text-anchor="middle" class="planet-label">${esc(p.word.toUpperCase())}</text>`;

 const r=ballPosition(state.current);
 svg+=`<g id="golf-ball" transform="translate(${r.x},${r.y})" aria-label="Your golf ball" opacity="${state.won&&state.current===state.target?0:1}" aria-hidden="${state.won&&state.current===state.target}"><ellipse id="ball-shadow" cy="18" rx="17" ry="4" fill="#45663e" opacity=".2"/><g id="ball-body"><circle r="16" fill="url(#ball-shade)" stroke="#728363" stroke-width="1"/><g id="ball-dimples">${[[-4,-5],[3,-6],[-7,1],[0,0],[6,1],[-3,6],[4,6]].map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="1.2" fill="#d4ddc8"/>`).join('')}</g></g></g>`;
 $('map').innerHTML=svg;
 if(backdropLayout!==d){document.querySelector('.course-feedback').style.backgroundImage=`url("data:image/svg+xml,${encodeURIComponent(courseContinuation(d,d.style))}")`;backdropLayout=d;}
 const textNodes=[...$('map').querySelectorAll('[data-word-label]')];
 const obstacles=planets.map(p=>{if(p.word===state.current){const b=ballPosition(p.word);return {x:b.x-17,y:b.y-17,width:34,height:40};}const radius=p.word===state.target?10:8;return {x:p.pos.x-radius,y:p.pos.y-radius,width:2*radius,height:2*radius};});
 obstacles.push(...lake.obstacles,{x:d.right-3,y:d.holeY-51,width:33,height:52},...[-TEE_MARKER_OFFSET,TEE_MARKER_OFFSET].map(offset=>({x:d.left-7,y:d.teeY+offset-7,width:14,height:16})));
 const measured=textNodes.map((node,i)=>{const p=planets[i],box=node.getBBox();return {word:p.word,failed:!!p.failed,...p.pos,radius:p.word===state.current?16:p.word===state.target?10:6,gap:p.word===state.current?(p.word===state.start?8:12):5,width:box.width,height:box.height,priority:p.word===state.start?5:p.word===state.current?4:p.word===state.target?3:p.failed?0:1};});
 const layout=layoutLabels(measured,obstacles,d.width,COURSE_HEIGHT);
 for(const node of textNodes)node.remove();
 let labels='';
 for(const p of planets){const box=layout.labels.get(p.word);const endX=Math.max(box.x,Math.min(box.x+box.width,p.pos.x)),endY=Math.max(box.y,Math.min(box.y+box.height,p.pos.y));const length=Math.hypot(endX-p.pos.x,endY-p.pos.y)||1;const markerRadius=p.word===state.current?16:p.word===state.target?10:6;const startX=p.pos.x+markerRadius*(endX-p.pos.x)/length,startY=p.pos.y+markerRadius*(endY-p.pos.y)/length;
 labels+=`<g class="word-label" data-label-word="${esc(p.word)}" opacity="${p.failed?.72:1}"><path d="M${startX} ${startY} L${endX} ${endY}" stroke="#8ba17e" stroke-width="1"/><g class="label-body"><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="5" fill="#f4f7ee" fill-opacity=".96"/><text x="${box.textX}" y="${box.textY}" dominant-baseline="central" text-anchor="middle" class="planet-label">${esc(p.word.toUpperCase())}</text></g></g>`;
 }
 $('map').insertAdjacentHTML('beforeend',labels);
 $('map').setAttribute('viewBox',`0 0 ${d.width} ${layout.height}`);
 $('map').style.minHeight='';$('map').dataset.teeWord=state.start;moveTeeLabel(previousTee);
}
function telemetry(){
 const last=shownEvent;
 $('telemetry').textContent=JSON.stringify({current:state.current,proposed:last?.word??null,target:state.target,shot_outcome:last?.outcome??null,contact_made:last?.connected??null,safe_landing:last?.safe??null,contact_cosine:last?.launch??null,destination_cosine:last?.destination??null,shot_mode:state.mode,rules:state.rules,finish_mode:state.finish_mode??'green',finish_reason:last?.finish_reason??null,automatic_finish:last?.automatic_shot?.outcome??null,required_contact:last?.required??state.threshold,trip_fraction:last?.trip_fraction??null,hub_surcharge:last?.hub_surcharge??null,green_threshold:state.threshold,short_shot:state.launch_min,long_shot:state.launch_max,water_boundary:state.best_progress-state.backward_allowance,progress:state.progress,starting_boundary:state.baseline,inside_arrival_zone:last?.inside??null,attempts:state.attempts,successful_route:state.route,failed_attempts:state.history.filter(e=>!e.success).map(e=>({word:e.word,launch:e.launch,destination:e.destination,reason:e.outcome==='water'?'water hazard':e.outcome==='miss'?'weak contact':e.forward===false?'backward shot':'previous course boundary'}))},null,2);
}
function renderLog(){
 const journeys=flightLog.data.journeys;
 $('restore-log').hidden=!flightLog.backup?.journeys?.length&&!flightLog.backup?.bridgeFeedback?.length;
 if(!journeys.some(j=>j.id===selectedLogId))selectedLogId=flightLog.data.activeId;
 $('log-journey').innerHTML=[...journeys].reverse().map(j=>`<option value="${esc(j.id)}" ${j.id===selectedLogId?'selected':''}>${esc(j.state.start)} → ${esc(j.state.target)} · ${j.state.attempts} ${j.state.attempts===1?'shot':'shots'} · ${j.state.won?'completed':'in progress'} · ${esc(new Date(j.startedAt).toLocaleString())}</option>`).join('');
 const journey=journeys.find(j=>j.id===selectedLogId);
 const submissions=journey?.entries.filter(e=>!e.event?.automatic).length??0;
 $('log-summary').textContent=journey?`${journey.state.attempts} ${journey.state.attempts===1?'shot':'shots'} · ${submissions} ${submissions===1?'submission':'submissions'} · ${journey.state.mode==='distance'?'distance shots · green':'fixed strength'} ${journey.state.threshold}`:'Your shots will appear here.';
 $('log-entries').innerHTML=journey?.entries.map(entry=>`<li><div class="log-entry-heading"><strong>${entry.event?'#'+entry.event.attempt:'No shot'} · ${esc(entry.origin)} → ${esc(entry.word)}</strong><span>${esc(outcome(entry))}</span></div>${entry.event?`<p>${entry.event.automatic?'Automatic finish · one shot counted':entry.event.outcome==='backtrack'?'Returned to a previously reached word':entry.event.connected===false?'Weak contact':entry.event.outcome==='water'?'Good contact, wrong direction':entry.event.outcome==='recovery'?'Small recovery shot':entry.event.success?'Ball landed':'Ball stayed put'}${entry.event.inside?(entry.event.success?' · On the green':' · Aimed at green'):''}</p>`:''}</li>`).join('')||'<li class="subtle">No shots yet.</li>';
 renderRouteReview(journey);renderSkill(journey);renderBridgeFeedback();
 $('log-storage').textContent=flightLog.warning||'Saved in this browser. Download your scorecards to keep or share them.';
}
const routeReviews=new Map();
function reviewFor(journey){
 if(!client||!journey?.state.won||!['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(journey.state.rules))return null;
 const key=skillHistoryKey(journey.state);
 if(!routeReviews.has(key)){
  routeReviews.set(key,{pending:true});
  api('route-review',{state:journey.state}).then(report=>{
   routeReviews.set(key,report);
   if(state?.won&&flightLog.active&&skillHistoryKey(state)===key)renderArrivalRoute();
   if(selectedLogId===journey.id)renderRouteReview(journey);
  }).catch(()=>{
   routeReviews.set(key,{error:true});
   if(state?.won&&skillHistoryKey(state)===key)renderArrivalRoute();
   if(selectedLogId===journey.id)renderRouteReview(journey);
  });
 }
 return routeReviews.get(key);
}
function renderArrivalRoute(){
 const report=state?.won?reviewFor(flightLog.active):null;
 $('arrival-route').textContent=state?.won?markedRoute(state.route,report).toUpperCase():'';
 const note=$('arrival-shortcuts'),message=report?.complete?shortcutNote(report):'';note.hidden=!message;note.textContent=message;
}
function renderRouteReview(journey){
 const element=$('log-route-review'),report=reviewFor(journey);element.hidden=!report;
 if(!report){element.textContent='';return;}
 if(report.pending||report.error){element.textContent=report.pending?'Checking your route for shortcuts…':'Shortcut review could not finish.';return;}
 element.innerHTML=`<p class="reviewed-route">${esc(markedRoute(journey.state.route,report))}</p>${failedShotSummary(journey.state)?`<p>${esc(failedShotSummary(journey.state))}</p>`:''}${shortcutNote(report)?`<p>${esc(shortcutNote(report))}</p>`:''}${report.skips.length?`<details><summary>See shortcuts</summary><ul>${report.skips.map(s=>`<li>Skip ${esc(s.word.toUpperCase())}: ${esc(s.from.toUpperCase())} → ${esc(s.to.toUpperCase())}</li>`).join('')}</ul></details>`:''}`;
}
const skillRequests=new Map();
const skillPercent=score=>`${Math.round(score/10)}%`;
function skillReportValid(journey){return !!config&&!!journey&&validSkillReport(journey.skill,journey.state,config.vector_sha256);}
function updateArrivalSkill(){
 const journey=flightLog.active,ready=state?.won&&skillReportValid(journey);
 $('arrival-skill').hidden=!ready;
 $('arrival-skill').textContent=ready?`SKILL ${skillPercent(journey.skill.score)}`:'';
 $('arrival-skill-feedback').hidden=!ready;$('arrival-skill-feedback').innerHTML=ready?skillFeedbackHTML(journey,'arrival'):'';
}
function renderSkill(journey){
 const panel=$('skill-panel');updateArrivalSkill();
 panel.hidden=!journey?.state.won||!['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(journey?.state.rules);
 if(panel.hidden)return;
 if(!skillReportValid(journey)){
   panel.innerHTML='<p class="subtle" role="status">Assessing your word choices… You can keep playing.</p>';
   if(!client)return;
   const id=journey.id,key=id+skillHistoryKey(journey.state);
   if(skillRequests.has(key)){
     if(skillRequests.get(key)==='failed')panel.innerHTML='<p class="subtle">Skill assessment could not finish. Reload to try again; your shots are saved.</p>';
     return;
   }
   skillRequests.set(key,'pending');
   api('skill',{state:journey.state}).then(report=>{
     report.model_sha=config.vector_sha256;report.model=config.model;
     flightLog.recordSkill(id,report);skillRequests.delete(key);
     if(selectedLogId===id)renderLog();else updateArrivalSkill();
   }).catch(()=>{skillRequests.set(key,'failed');if(selectedLogId===id)renderSkill(journey);});
   return;
 }
 const r=journey.skill,signed=n=>`${n>=0?'+':''}${n.toFixed(3)}`;
 panel.innerHTML=`<div class="skill-heading"><strong>Skill <span>${skillPercent(r.score)}</span></strong></div><p class="subtle">Vector-based choice efficiency for this hole. Automatic finishing shots are excluded.</p>${skillFeedbackHTML(journey,'scorecard')}<details class="skill-breakdown"><summary>Shot breakdown</summary><ol>${r.shots.map(shot=>`<li><div class="skill-shot-title"><strong>#${shot.attempt} · ${esc(shot.origin)} → ${esc(shot.word)}</strong><span>Shot quality ${skillPercent(shot.score)}</span></div><div class="skill-metrics"><span>Contact <b>${shot.contact_score}%</b></span><span>Choice <b>${shot.choice_score}%</b></span><span>Setup <b>${signed(shot.setup_change)}</b></span></div><p>Contact ${shot.contact.toFixed(3)} · needs ${shot.required.toFixed(3)}${shot.contact_shortfall>0?` · short by ${shot.contact_shortfall.toFixed(3)}`:''}. ${shot.outcome==='green'?'Hole reached — no further choice needed':`${shot.good_moves_before} → ${shot.good_moves_after} forward options · ${shot.green_moves_after} reach the green`}.</p>${shot.specificity_loss>0?`<p>Specificity deduction: long shot into a broader word.</p>`:''}${shot.outcome==='backtrack'?`<p>${shot.setup_change>0?'This return improved the onward opportunities.':shot.setup_change<0?'This return reduced the onward opportunities.':'This return spent a shot without improving the onward opportunities.'}</p>`:''}${shot.direction_shortfall>0?`<p>Aimed ${shot.direction_shortfall.toFixed(3)} beyond the safe backward boundary.</p>`:''}<details><summary>Compared choices (spoilers)</summary><p>${shot.compared_choices} alternatives assessed one shot ahead. Your choice was ${shot.choice_gap.toFixed(3)} below the best assessed option.</p><ul>${shot.alternatives.map(a=>`<li><b>${esc(a.word)}</b> · opportunity ${a.value.toFixed(3)} · contact ${a.contact.toFixed(3)} / ${a.required.toFixed(3)}</li>`).join('')}</ul></details></li>`).join('')}</ol></details><details class="skill-method"><summary>How the score works</summary><p>Contact measures how close a miss came to its required strength. For misses, Choice grades the intended word and Setup stays unchanged. Choice compares your intended landing with a shortlist spanning distance, connection and different approach lengths. Each landing looks one shot ahead across the full vocabulary. Setup measures the change in onward opportunity, using the strongest legal forward gain (80%) and the average of the eight strongest gains (20%), discounted for the extra shot. Fewer strong options can lower that value; extra weak options do not inflate it.</p><p>A successful forward move longer than half the original tee-to-green gap receives a small specificity cost when its destination word is broader than its origin. The cost grows smoothly with distance and increased breadth, up to 0.10 regret per shot. Small setup moves, lateral/backward travel, misses, water and the literal hole word receive no specificity cost. Alternative choices include the same deduction.</p><p>Backtracking is assessed by the same opportunity measure. Repeated visits with no improvement add a small cost. Each shot receives one main regret charge, so overlapping contact, direction and opportunity problems are not added together. Regret accumulates across the round. Scores cannot be raised by padding a round with extra shots. An automatic finish adds no skill or penalty.</p><p>This is an experimental model assessment, not a player percentile or a proven optimal route. The comparison shortlist and one-shot horizon can miss deeper strategies. Very short rounds provide little evidence. Model alternatives can include unusual or unfamiliar words.</p><p class="subtle">Skill v3 · percentage = 100 / (1 + accumulated regret), with no fixed minimum. Each shot uses the largest of its contact deficit, direction deficit, choice gap and setup decline, plus 0.05 for an unhelpful repeated lie and any specificity cost.</p></details>`;
}
function skillFeedbackHTML(journey,context){
 const feedback=currentSkillFeedback(journey),noteId=`${context}-skill-note`;
 return `<div class="skill-feedback" data-skill-feedback-journey="${esc(journey.id)}" data-feedback-context="${context}"><div class="skill-feedback-buttons"><span>Does this score feel right?</span><button type="button" class="quiet" data-skill-rating="too_harsh" aria-pressed="${feedback?.rating==='too_harsh'}">Too harsh</button><button type="button" class="quiet" data-skill-rating="too_generous" aria-pressed="${feedback?.rating==='too_generous'}">Too generous</button></div>${feedback?`<div class="skill-feedback-note"><label for="${noteId}">Tell us why <span>(optional)</span></label><input id="${noteId}" data-skill-note maxlength="500" value="${esc(feedback.note)}" placeholder="The overall score or a particular shot"><button type="button" class="quiet" data-save-skill-note>Save note</button></div>`:''}<p class="skill-feedback-status subtle" role="status">${feedback?'Feedback saved with your scorecards. Tap the selected button again to clear.':''}</p></div>`;
}
function refreshSkillFeedback(journey,message){
 for(const container of document.querySelectorAll('[data-skill-feedback-journey]')){
  if(container.dataset.skillFeedbackJourney!==journey.id)continue;
  const parent=container.parentNode,context=container.dataset.feedbackContext;
  container.outerHTML=skillFeedbackHTML(journey,context);
  parent.querySelector('.skill-feedback-status').textContent=flightLog.warning||message;
 }
 $('log-storage').textContent=flightLog.warning||'Saved in this browser. Download your scorecards to keep or share them.';
}
for(const id of ['arrival-skill-feedback','skill-panel']){
 $(id).addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('[data-skill-note]')){event.preventDefault();event.target.closest('.skill-feedback').querySelector('[data-save-skill-note]').click();}});
 $(id).addEventListener('click',event=>{
  const button=event.target.closest('button'),container=button?.closest('[data-skill-feedback-journey]');if(!container)return;
  const journey=flightLog.data.journeys.find(j=>j.id===container.dataset.skillFeedbackJourney);if(!journey)return;
  try{
   let message='Feedback saved with your scorecards. Tap the selected button again to clear.';
   if(button.hasAttribute('data-save-skill-note')){flightLog.noteSkillFeedback(journey.id,container.querySelector('[data-skill-note]').value);message='Note saved with your scorecards.';}
   else if(button.dataset.skillRating){
    const rating=button.dataset.skillRating,clear=currentSkillFeedback(journey)?.rating===rating;
    flightLog.recordSkillFeedback(journey.id,clear?null:rating,container.querySelector('[data-skill-note]')?.value);if(clear)message='Feedback cleared.';
   }else return;
   refreshSkillFeedback(journey,message);
   const replacement=[...document.querySelectorAll('[data-skill-feedback-journey]')].find(c=>c.dataset.skillFeedbackJourney===journey.id&&c.dataset.feedbackContext===container.dataset.feedbackContext);
   replacement?.querySelector(button.dataset.skillRating?`[data-skill-rating="${button.dataset.skillRating}"]`:'[data-save-skill-note]')?.focus({preventScroll:true});
  }catch(error){container.querySelector('.skill-feedback-status').textContent=error.message;}
 });
}
function syncPuzzleSelection(){
 const index=config.puzzles.findIndex(p=>p.start===state.start&&p.target===state.target&&p.threshold===state.threshold&&(p.mode||'fixed')===state.mode);
 $('puzzle').querySelector('option[value="custom"]')?.remove();
 if(index<0){const option=document.createElement('option');option.value='custom';option.textContent=`${state.start} → ${state.target} (custom)`;$('puzzle').append(option);$('puzzle').value='custom';}
 else $('puzzle').value=String(index);
}
function update(){
 $('start-label').textContent=state.start;$('target-label').textContent=state.target;$('attempts').textContent=state.attempts;
 $('lab-start').value=state.start;$('lab-target').value=state.target;$('threshold').value=state.threshold;$('launch-mode').value=state.mode;$('launch-min').value=state.launch_min;$('launch-max').value=state.launch_max;
 document.querySelector('.controls').hidden=state.won;
 document.querySelector('.attempts').hidden=state.won;
 $('arrival-banner').hidden=!state.won||resultDismissed;
 $('show-result').hidden=!state.won||!resultDismissed;
 document.querySelector('.map-card').classList.toggle('arrived',state.won);
 if(state.won){$('arrival-banner').querySelector('h2').textContent=state.attempts===1?'Hole in one!':`Holed in ${state.attempts} shots!`;}
 renderArrivalRoute();
 const failures=failedShotSummary(state);
 $('arrival-failures').hidden=!state.won||!failures;
 $('arrival-failures').textContent=failures;
 $('shot-notice').hidden=noticeDismissed||!shownEvent||!['water','miss'].includes(shownEvent.outcome)||state.won;
 $('shot-notice-text').textContent=shownEvent?.outcome==='water'?`Splash! Ball returned to ${state.current}. One shot counted.`:`Miss! Ball stays at ${state.current}. One shot counted.`;


 map();telemetry();renderLog();updateArrivalSkill();
}
async function newGame(puzzle){
 if(busy)return false;lock(true);
 try{const data=await api('new',{...puzzle,finish_mode:'range'});state=data.state;shownEvent=null;resultDismissed=false;noticeDismissed=false;resetBridgeView();selectedLogId=flightLog.begin(state,config.model,config.vector_sha256).id;$('copy-fallback').hidden=true;$('log-feedback').textContent='';syncPuzzleSelection();update();$('word').value='';$('status').textContent='';return true;}
 catch(error){$('status').textContent=error.message;return false;}finally{lock(false);if(state?.won)$('launch').disabled=true;}
}
function bezier(a,b,t){return {x:(1-t)**2*a.x+2*(1-t)*t*(a.x+b.x)/2+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*(Math.min(a.y,b.y)-65)+t*t*b.y};}
async function animate(event){
 const a=ballPosition(state.current),b=event.outcome==='water'?waterPoint(event):ballPosition(event.word,event),ball=$('golf-ball');
 if(reduced)return;
 const kind=event.automatic?(event.outcome==='chip'?'chip':'putt'):event.success&&event.word===state.target?'chip':'flight';
 ball.setAttribute('data-motion',kind);
 const duration=event.outcome==='water'?1250:event.outcome==='miss'?450:kind==='putt'?850:kind==='chip'?1350:1000;
 await new Promise(resolve=>{const start=performance.now();function frame(now){const t=Math.min(1,(now-start)/duration);let point=a;
 if(event.outcome==='water'){
  if(t<.72)point=bezier(a,b,t/.72);
  ball.setAttribute('opacity',t>=.72&&t<.94?'0':'1');
  const splash=$('water-splash');if(splash&&t>=.72){splash.setAttribute('opacity',String(1-(t-.72)/.28));splash.setAttribute('r',String(8+35*(t-.72)/.28));}
 }else if(event.success){
  const pose=shotMotion(kind,a,b,t,{tee:event.origin===state.start});point=pose;
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

async function submit(word){
 if(busy||!state||state.won)return false;
 $('word').blur();noticeDismissed=false;resultDismissed=false;$('shot-notice').hidden=true;lock(true);$('attempts').textContent=state.attempts+1;
 try{
 let data;try{data=await api('submit',{word});}catch(error){flightLog.record(word,state,null,error.message);selectedLogId=flightLog.data.activeId;renderLog();throw error;}
 const event=data.event;flightLog.record(word,data.state,event);selectedLogId=flightLog.data.activeId;
 // Keep the old state visible until the proposal and flight have played out.
 if(event.outcome||event.forward!==false){map(event);$('status').textContent=`Playing ${event.word.toUpperCase()}…`;
 await delay(reduced?150:350);await animate(event);}
 if(event.automatic_shot){
   state={...data.state,current:event.word,won:false,attempts:event.attempt,route:data.state.route.slice(0,-1),automatic_shots:[]};map();$('attempts').textContent=event.attempt;$('status').textContent='Ball settling…';
   await delay(reduced?250:1100);$('status').textContent='Lining up the finish…';$('attempts').textContent=data.state.attempts;await animate(event.automatic_shot);
 }
 state=data.state;shownEvent=event;update();$('word').value='';
 if(event.won)document.querySelector('.map-card').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
 $('status').textContent=event.won||['water','miss'].includes(event.outcome)?'':event.outcome==='backtrack'?`Back to ${event.word}.`:event.outcome==='recovery'?`Recovery to ${event.word}.`:event.success?`On ${event.word}.`:'Ball stays put. One shot counted.';

 return true;
 }catch(error){$('attempts').textContent=state.attempts;$('status').textContent=error.message;return false;}
 finally{lock(false);if(state.won)$('launch').disabled=true;else if(!narrow())$('word').focus({preventScroll:true});}
}
$('launch-form').addEventListener('submit',event=>{event.preventDefault();submit($('word').value);});
$('lab-form').onsubmit=event=>{event.preventDefault();newGame({start:$('lab-start').value,target:$('lab-target').value,threshold:Number($('threshold').value),mode:$('launch-mode').value,launch_min:Number($('launch-min').value),launch_max:Number($('launch-max').value)});};
$('new-game').onclick=()=>newGame(restartSettings(state,config.puzzles[0]));
$('puzzle').onchange=()=>newGame(config.puzzles[Number($('puzzle').value)]);
const assessments=new Map();
function assess(settings){
 settings={finish_mode:'range',...settings};
 const key=JSON.stringify([settings.start,settings.target,settings.threshold,settings.mode,settings.launch_min,settings.launch_max,settings.finish_mode,settings.rules??(settings.mode==='fixed'?'golf-fixed-v3':'golf-distance-v3')]);
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
  const key=bridgeKey(result.settings,b.word,config.vector_sha256),review=flightLog.data.bridgeFeedback.find(r=>r.key===key);
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
  flightLog.flagBridge(result,bridge,{model:config.model,model_sha:config.vector_sha256,source:id==='current-bridge-list'?'active':'preview'});message='Flag saved with your scorecards.';
 }
 refreshBridgeFlags();$(id).querySelector('.bridge-feedback-status').textContent=flightLog.warning||message;
 const replacement=[...$(id).querySelectorAll('[data-review-key]')].find(r=>r.dataset.reviewKey===key);replacement?.querySelector('[data-flag-bridge]')?.focus({preventScroll:true});
});
function resetBridgeView(){
 currentBridgeResult=null;bridgeViewVersion++;$('current-bridges').open=false;$('current-bridge-list').textContent='';
}
$('current-bridges').addEventListener('toggle',async()=>{
 if(!$('current-bridges').open)return;
 if(!state||!client){$('current-bridge-list').textContent='The course is still loading.';return;}
 const version=bridgeViewVersion;
 const settings={start:state.start,target:state.target,threshold:state.threshold,mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max,rules:state.rules,finish_mode:state.finish_mode??'green'};
 $('current-bridge-list').textContent='Calculating opening bridges…';
 try{const result=await assess(settings);if(version===bridgeViewVersion){currentBridgeResult=result;$('current-bridge-list').innerHTML=bridgeList(result);if($('current-bridges').open)flightLog.markBridgeView(result.settings,'active',config.vector_sha256);}}
 catch(error){if(version===bridgeViewVersion)$('current-bridge-list').textContent=error.message;}
});
$('close-result').onclick=()=>{resultDismissed=true;$('arrival-banner').hidden=true;$('show-result').hidden=false;$('show-result').focus({preventScroll:true});document.querySelector('.map-card').scrollIntoView({block:'nearest',behavior:reduced?'instant':'smooth'});};
$('show-result').onclick=()=>{resultDismissed=false;$('arrival-banner').hidden=false;$('show-result').hidden=true;$('close-result').focus({preventScroll:true});};
$('close-shot-notice').onclick=()=>{noticeDismissed=true;$('shot-notice').hidden=true;};
let assessmentTimer,assessmentSequence=0,customBridgeResult=null;
$('custom-bridges').addEventListener('toggle',()=>{if($('custom-bridges').open&&customBridgeResult){$('custom-bridge-list').innerHTML=bridgeList(customBridgeResult);flightLog.markBridgeView(customBridgeResult.settings,'preview',config.vector_sha256);}});
function previewHole(){
 clearTimeout(assessmentTimer);const sequence=++assessmentSequence;
 const start=$('custom-start').value.trim().toLowerCase(),target=$('custom-target').value.trim().toLowerCase();
 const warning=$('custom-hub-warning');warning.textContent='';warning.hidden=true;
 if(client)api('breadth',{start,target}).then(endpoints=>{if(sequence!==assessmentSequence)return;warning.textContent=hubWarningText(endpoints);warning.hidden=!endpoints.length;});
 $('custom-assessment').dataset.valid='false';
 customBridgeResult=null;$('custom-bridges').hidden=true;$('custom-bridges').open=false;$('custom-bridge-list').textContent='';
 if(!start||!target||!client){$('custom-assessment').textContent='';return;}
 $('custom-assessment').textContent='Assessing these words…';
 assessmentTimer=setTimeout(async()=>{
  try{const result=await assess({...config.puzzles[0],start,target});if(sequence!==assessmentSequence)return;
   $('custom-assessment').textContent=result.direct_hole_in_one?'Direct hole in one available. Choose a more distant pair.':!result.playable?'No playable opening found. Choose another pair.':`${result.separation_degrees.toFixed(0)}° word separation · ${result.green_bridges} opening ${result.green_bridges===1?'route':'routes'} within finishing range. Connection counts do not measure human difficulty.`;
   $('custom-assessment').dataset.valid=String(result.playable);
   $('custom-bridges').hidden=false;$('custom-bridges').querySelector('summary').textContent=`View ${result.green_bridges} opening ${result.green_bridges===1?'bridge':'bridges'} (spoilers)`;
   customBridgeResult=result;
  }catch(error){if(sequence===assessmentSequence){$('custom-assessment').textContent=error.message;$('custom-assessment').dataset.valid='false';}}
 },200);
}
for(const id of ['custom-start','custom-target'])$(id).addEventListener('input',previewHole);
$('custom-form').onsubmit=async event=>{
 event.preventDefault();if(busy||!config)return;
 $('custom-start').blur();$('custom-target').blur();$('custom-feedback').textContent='';
 const started=await newGame({...config.puzzles[0],start:$('custom-start').value,target:$('custom-target').value,validate_direct:true});
 if(!started){$('custom-feedback').textContent=$('status').textContent;return;}
 $('custom-start').value=state.start;$('custom-target').value=state.target;
 $('custom-feedback').textContent=`Your ${state.start} → ${state.target} hole is ready.`;
 document.querySelector('.map-card').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
};

$('route-form').onsubmit=async event=>{event.preventDefault();if(busy)return;const words=$('route-input').value.split(',').map(w=>w.trim()).filter(Boolean);for(const word of words){if(state.won||!await submit(word))break;}};
$('reset-log').onclick=()=>{$('reset-confirmation').hidden=false;};
$('cancel-reset').onclick=()=>{$('reset-confirmation').hidden=true;};
$('confirm-reset').onclick=async()=>{
 if(busy||!state)return;
 lock(true);const previous=state;let candidate;
 try{
  candidate=(await api('new',{start:state.start,target:state.target,threshold:state.threshold,mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max,rules:state.rules,finish_mode:'range'})).state;
  const journey=flightLog.reset(candidate,config.model,config.vector_sha256);
  state=candidate;shownEvent=null;resultDismissed=false;noticeDismissed=false;resetBridgeView();selectedLogId=journey.id;
  $('reset-confirmation').hidden=true;$('copy-fallback').hidden=true;$('word').value='';
  update();refreshBridgeFlags();$('status').textContent='';$('log-feedback').textContent='Scorecards reset. Future downloads contain only new rounds.';
 }catch(error){
  if(candidate)try{await api('restore',{state:previous});}catch{}
  $('log-feedback').textContent=error.message;
 }finally{lock(false);if(state.won)$('launch').disabled=true;}
};
$('restore-log').onclick=()=>{
 try{if(flightLog.restorePrevious()){$('reset-confirmation').hidden=true;renderLog();refreshBridgeFlags();$('log-feedback').textContent='Previous scorecards restored. New rounds were kept too.';}}
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
 const blob=new Blob([flightLog.exportJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='word-golf-scorecards.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('log-feedback').textContent='Scorecards download requested. If it does not appear, use Copy scorecard.';
};
renderLog();
try{lock(true);$('status').textContent='Preparing the course (about 14 MB on your first visit; cached afterwards)…';client=await createBrowserClient();config=client.config;lock(false);$('puzzle').innerHTML=config.puzzles.map((p,i)=>`<option value="${i}">${esc(p.start)} → ${esc(p.target)}</option>`).join('');$('model-info').textContent=`${config.model} / ${config.vocabulary.toLocaleString()} WORDS · ${config.release||'golf-v40'}`;if(startupAction(flightLog.active,config.puzzles[0])==='upgrade'){const saved=flightLog.active.state;await newGame({...config.puzzles[0],start:saved.start,target:saved.target});$('status').textContent='Automatic finishing is ready to try. Your earlier rounds are saved in Scorecards.';}else if(startupAction(flightLog.active,config.puzzles[0])==='restore'){try{state=(await api('restore',{state:flightLog.active.state})).state;shownEvent=state.history.at(-1)||null;syncPuzzleSelection();update();$('status').textContent='';if(state.won)$('launch').disabled=true;}catch{await newGame(config.puzzles[0]);$('status').textContent='Teed up a fresh hole. Your earlier scorecards are still available below.';}}else await newGame(config.puzzles[0]);}
catch(error){$('status').textContent=`Course unavailable: ${error.message}. Please reload to try again.`;}

window.addEventListener('resize',()=>{if(state&&!busy)map();});

// Keep the map and input in the visible area above mobile software keyboards.
let typingScroll=0;
function fitTypingView(){
 if(!document.body.classList.contains('typing'))return;
 const viewport=window.visualViewport;
 document.documentElement.style.setProperty('--typing-height',`${viewport?.height??innerHeight}px`);
 document.documentElement.style.setProperty('--typing-top',`${viewport?.offsetTop??0}px`);
}
$('launch').addEventListener('pointerdown',event=>{
 if(document.body.classList.contains('typing'))event.preventDefault();
});
$('word').addEventListener('focus',()=>{
 if(!narrow())return;
 typingScroll=window.scrollY;document.body.classList.add('typing');fitTypingView();
});
$('word').addEventListener('blur',()=>{
 if(!document.body.classList.contains('typing'))return;
 document.body.classList.remove('typing');window.scrollTo({top:typingScroll,behavior:'instant'});
});
window.visualViewport?.addEventListener('resize',fitTypingView);
window.visualViewport?.addEventListener('scroll',fitTypingView);
window.addEventListener('resize',fitTypingView);
