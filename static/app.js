import { createBrowserClient } from './engine.mjs?v=golf-v11';
import { mapLayout, projectX, visibleAttempts, layoutLabels } from './map.mjs?v=golf-v11';
import { startupAction, isOpening } from './startup.mjs?v=golf-v11';
import { FlightLog, outcome, journeyText } from './flight-log.mjs?v=golf-v11';
const $=id=>document.getElementById(id);
let config,state,client,busy=false,shownEvent=null;
let storage;try{storage=window.localStorage;}catch{}
const flightLog=new FlightLog(storage);
let selectedLogId=flightLog.data.activeId;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(path,body){return client.request(path,body);}
function lock(value){busy=value;for(const e of document.querySelectorAll('button,input,select'))if(!['debug-toggle','copy-log','download-log','log-journey'].includes(e.id))e.disabled=value;}
const narrow=()=>matchMedia('(max-width:650px)').matches;
const dimensions=()=>mapLayout(narrow());
const x=similarity=>projectX(similarity,state.baseline,state.threshold,dimensions());
function position(word,event=null){if(word===state.start)return {x:dimensions().left,y:194};if(word===state.target)return {x:dimensions().right,y:194};const h=state.history.find(e=>e.word===word)||event;return {x:x(h.destination),y:194+[-62,54,-104,97,-28,15][(h.attempt-1)%6]};}
function waterPoint(event){const d=dimensions();return {x:Math.max(48,Math.min(d.zoneLeft-48,x(event.destination))),y:337};}
const path=(a,b)=>`M ${a.x},${a.y} Q ${(a.x+b.x)/2},${Math.min(a.y,b.y)-65} ${b.x},${b.y}`;
function map(preview=null){
 const d=dimensions();$('map').setAttribute('viewBox',`0 0 ${d.width} 360`);
 const zone=d.zoneLeft;
 let svg=`<defs><radialGradient id="ball-shade" cx="30%" cy="25%" r="75%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#f4f5ed"/><stop offset="1" stop-color="#cbd6bd"/></radialGradient><pattern id="fairway-mown" width="100" height="360" patternUnits="userSpaceOnUse"><rect width="100" height="360" fill="#d8e7c4"/><rect width="50" height="360" fill="#e1edcf"/></pattern><pattern id="green-mown" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#95c87b"/><rect width="11" height="22" fill="#a5d18d"/></pattern></defs><rect width="${d.width}" height="360" fill="url(#fairway-mown)"/><g class="bunker" transform="translate(${d.width*.48},44)"><path d="M-58 -7 C-67 -22 -39 -35 -18 -29 C-2 -24 8 -11 25 -16 C48 -29 73 -13 68 3 C64 18 39 23 23 14 C4 3 -2 20 -24 20 C-48 24 -67 11 -58 -7Z" fill="#b8c48c" stroke="#a6b480" stroke-width="3"/><path d="M-53 -7 C-60 -20 -37 -29 -19 -24 C-1 -19 9 -6 27 -12 C47 -24 68 -10 62 3 C58 15 39 18 24 9 C3 -2 -3 15 -25 15 C-45 19 -61 8 -53 -7Z" fill="#eddbac" stroke="#cdb986" stroke-width="1.5"/><path d="M-48 4 Q-28 17 -11 6 M29 9 Q48 19 59 4" fill="none" stroke="#c6b07a" stroke-width="2" opacity=".65"/><path d="M-40 -13 q13 -6 25 2 M-43 -8 q15 -7 29 2 M30 -6 q13 -5 23 1" fill="none" stroke="#d5c18e" stroke-width="1.2"/></g><rect x="${zone-7}" y="50" width="${d.zoneRight-zone+14}" height="288" rx="27" fill="#b8cf94"/><rect x="${zone}" y="57" width="${d.zoneRight-zone}" height="274" rx="20" fill="url(#green-mown)" stroke="#70a35d" stroke-width="2"/><text x="${d.right}" y="78" text-anchor="middle" class="map-small arrival-label">GREEN</text><path d="M${d.left} 194 H${d.right-12}" stroke="#a7bb9b" stroke-dasharray="3 8"/><path d="M25 326 Q70 309 116 322 T212 321 T310 322 Q${zone-40} 307 ${zone-24} 330 L${zone-24} 345 Q${zone-30} 355 ${zone-46} 354 H42 Q18 354 25 326Z" fill="#8dcbd4" stroke="#62adb9" stroke-width="2"/><path d="M44 336 q16 -6 32 0 t32 0 M160 337 q16 -6 32 0 t32 0 M${zone-115} 338 q16 -6 32 0 t32 0" fill="none" stroke="#d6f1ed" stroke-width="2"/><text x="50" y="349" class="map-small water-label">WATER</text>`;
 if(preview?.outcome==='water'){const splash=waterPoint(preview);svg+=`<circle id="water-splash" cx="${splash.x}" cy="${splash.y}" r="8" fill="none" stroke="#fff" stroke-width="3" opacity="0"/>`;}


 for(const h of visibleAttempts(state)){const a=position(h.origin),b=position(h.word,h);svg+=`<path d="${path(a,b)}" fill="none" stroke="${h.success?'#7d9f73':'#b7bfb1'}" stroke-width="1.4" ${h.success?'':'stroke-dasharray="3 5"'} opacity=".6"/>`;}
 const nodes=new Map([[state.start,{word:state.start,pos:position(state.start)}]]);
 for(const h of visibleAttempts(state)){if(h.word===state.target)continue;const old=nodes.get(h.word);if(!old)nodes.set(h.word,{word:h.word,pos:position(h.word,h),failed:!h.success});else if(h.success)old.failed=false;}
 nodes.set(state.target,{word:state.target,pos:position(state.target)});
 if(preview&&preview.outcome!=='water'&&(preview.forward!==false||preview.success)){const old=nodes.get(preview.word);if(old)old.preview=true;else nodes.set(preview.word,{word:preview.word,pos:position(preview.word,preview),preview:true});}
 const planets=[...nodes.values()];
 for(const p of planets){const active=p.word===state.current;
 const ball=p.word===state.target?`<ellipse cx="${p.pos.x}" cy="${p.pos.y}" rx="10" ry="5" fill="#294d35"/><path d="M${p.pos.x} ${p.pos.y} v-48" stroke="#f9fff2" stroke-width="3"/><path d="M${p.pos.x+2} ${p.pos.y-48} l25 9 -25 9Z" fill="#d66a4c"/>`:`<circle cx="${p.pos.x}" cy="${p.pos.y}" r="${p.preview?9:6}" fill="${p.preview?'#fff7df':'#d5e3c5'}" stroke="${p.preview?'#a89965':active?'#25715a':'#63845a'}" stroke-width="2"/>`;
 svg+=`<g opacity="${p.failed?.4:1}">${ball}</g>`;
 }
 // Measure the actual font before packing labels; semantic ball positions never move.
 for(const p of planets)svg+=`<text data-word-label="${esc(p.word)}" x="${p.pos.x}" y="${p.pos.y+35}" text-anchor="middle" class="planet-label">${esc(p.word.toUpperCase())}</text>`;

 const r=position(state.current);
 svg+=`<g id="golf-ball" transform="translate(${r.x},${r.y})" aria-label="Your golf ball"><ellipse cy="18" rx="17" ry="4" fill="#45663e" opacity=".2"/><circle r="16" fill="url(#ball-shade)" stroke="#728363" stroke-width="1"/>${[[-4,-5],[3,-6],[-7,1],[0,0],[6,1],[-3,6],[4,6]].map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="1.2" fill="#d4ddc8"/>`).join('')}</g>`;
 $('map').innerHTML=svg;
 const textNodes=[...$('map').querySelectorAll('[data-word-label]')];
 const obstacles=planets.map(p=>{const radius=p.word===state.current?17:p.word===state.target?10:8;return {x:p.pos.x-radius,y:p.pos.y-radius,width:2*radius,height:2*radius};});
 obstacles.push({x:20,y:313,width:d.zoneLeft-42,height:43},{x:d.right-3,y:143,width:33,height:52},{x:d.zoneLeft,y:62,width:d.radius*2,height:20});
 const measured=textNodes.map((node,i)=>{const p=planets[i],box=node.getBBox();return {word:p.word,...p.pos,radius:p.word===state.current?16:p.word===state.target?10:6,width:box.width,height:box.height,priority:p.word===state.current?4:p.word===state.target?3:p.word===state.start?2:p.failed?0:1};});
 const layout=layoutLabels(measured,obstacles,d.width);
 for(const node of textNodes)node.remove();
 let labels='';
 for(const p of planets){const box=layout.labels.get(p.word);const endX=Math.max(box.x,Math.min(box.x+box.width,p.pos.x)),endY=Math.max(box.y,Math.min(box.y+box.height,p.pos.y));const length=Math.hypot(endX-p.pos.x,endY-p.pos.y)||1;const markerRadius=p.word===state.current?16:p.word===state.target?10:6;const startX=p.pos.x+markerRadius*(endX-p.pos.x)/length,startY=p.pos.y+markerRadius*(endY-p.pos.y)/length;
 labels+=`<g class="word-label" data-label-word="${esc(p.word)}" opacity="${p.failed?.72:1}"><path d="M${startX} ${startY} L${endX} ${endY}" stroke="#8ba17e" stroke-width="1"/><rect x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" rx="5" fill="#f4f7ee" fill-opacity=".96"/><text x="${box.textX}" y="${box.textY}" dominant-baseline="central" text-anchor="middle" class="planet-label">${esc(p.word.toUpperCase())}</text></g>`;
 }
 $('map').insertAdjacentHTML('beforeend',labels);
 $('map').setAttribute('viewBox',`0 0 ${d.width} ${layout.height}`);
 $('map').style.minHeight=layout.height>360?`${(narrow()?230:360)*layout.height/360}px`:'';
}
function telemetry(){
 const last=shownEvent;
 $('telemetry').textContent=JSON.stringify({current:state.current,proposed:last?.word??null,target:state.target,shot_outcome:last?.outcome??null,contact_made:last?.connected??null,safe_landing:last?.safe??null,contact_cosine:last?.launch??null,destination_cosine:last?.destination??null,shot_mode:state.mode,rules:state.rules,required_contact:last?.required??state.threshold,trip_fraction:last?.trip_fraction??null,green_threshold:state.threshold,short_shot:state.launch_min,long_shot:state.launch_max,water_boundary:state.best_progress-state.backward_allowance,progress:state.progress,starting_boundary:state.baseline,inside_arrival_zone:last?.inside??null,attempts:state.attempts,successful_route:state.route,failed_attempts:state.history.filter(e=>!e.success).map(e=>({word:e.word,launch:e.launch,destination:e.destination,reason:e.outcome==='water'?'water hazard':e.outcome==='miss'?'weak contact':e.forward===false?'backward shot':'previous course boundary'}))},null,2);
}
function renderLog(){
 const journeys=flightLog.data.journeys;
 if(!journeys.some(j=>j.id===selectedLogId))selectedLogId=flightLog.data.activeId;
 $('log-journey').innerHTML=[...journeys].reverse().map(j=>`<option value="${esc(j.id)}" ${j.id===selectedLogId?'selected':''}>${esc(j.state.start)} → ${esc(j.state.target)} · ${j.state.attempts} ${j.state.attempts===1?'shot':'shots'} · ${j.state.won?'completed':'in progress'} · ${esc(new Date(j.startedAt).toLocaleString())}</option>`).join('');
 const journey=journeys.find(j=>j.id===selectedLogId);
 $('log-summary').textContent=journey?`${journey.state.attempts} ${journey.state.attempts===1?'shot':'shots'} · ${journey.entries.filter(e=>!e.event?.automatic).length} submissions · ${journey.state.mode==='distance'?'distance shots · green':'fixed strength'} ${journey.state.threshold}`:'Your shots will appear here.';
 $('log-entries').innerHTML=journey?.entries.map(entry=>`<li><div class="log-entry-heading"><strong>${entry.event?'#'+entry.event.attempt:'No shot'} · ${esc(entry.origin)} → ${esc(entry.word)}</strong><span>${esc(outcome(entry))}</span></div>${entry.event?`<p>${entry.event.automatic?'Automatic finish · one shot counted':entry.event.outcome==='backtrack'?'Returned to a previously reached word':entry.event.connected===false?'Weak contact':entry.event.outcome==='water'?'Good contact, wrong direction':entry.event.outcome==='recovery'?'Small recovery shot':entry.event.success?'Ball landed':'Ball stayed put'}${entry.event.inside?(entry.event.success?' · On the green':' · Aimed at green'):''}</p>`:''}</li>`).join('')||'<li class="subtle">No shots yet.</li>';
 $('log-storage').textContent=flightLog.warning||'Saved in this browser. Download your scorecards to keep or share them.';
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
 $('upgrade-rules').hidden=['golf-distance-v2','golf-fixed-v2'].includes(state.rules);$('rules-note').textContent=state.mode==='distance'?'Connect to the ball word. Reach the green for an automatic finish, or hit the hole word directly.':'Every shot needs the fixed connection strength.';
 $('opening-game').hidden=isOpening(state,config.puzzles[0]);$('opening-game').textContent=`Play opening hole: ${config.puzzles[0].start} → ${config.puzzles[0].target}`;
 $('results').hidden=!state.won;
 $('arrival-banner').hidden=!state.won;
 document.querySelector('.map-card').classList.toggle('arrived',state.won);
 if(state.won){$('arrival-banner').querySelector('h2').textContent=state.attempts===1?'Hole in one!':`Holed in ${state.attempts} shots!`;}
 if(state.won)$('arrival-summary').textContent=`${state.attempts} ${state.attempts===1?'shot':'shots'} · ${state.start} → ${state.target}`;
 $('shot-notice').hidden=!shownEvent||!['water','miss'].includes(shownEvent.outcome)||state.won;
 $('shot-notice').textContent=shownEvent?.outcome==='water'?`Splash! Ball returned to ${state.current}. One shot counted.`:`Miss! Ball stays at ${state.current}. One shot counted.`;
 if(state.won){$('results').innerHTML=`<span class="eyebrow">HOLE COMPLETE</span><h2>${state.attempts===1?'Hole in one!':`Holed in ${state.attempts} shots.`}</h2><p>${state.route.map(esc).join(' → ')}</p>${state.automatic_shots?.length?'<p>Includes one automatic finishing shot from the green.</p>':''}<p>Misses and water shots: ${state.history.filter(h=>!h.success).map(h=>esc(h.word)).join(', ')||'none'}</p><p>Your full scorecard is below.</p>`;}

 map();telemetry();renderLog();
}
async function newGame(puzzle){
 if(busy)return false;lock(true);
 try{const data=await api('new',puzzle);state=data.state;shownEvent=null;selectedLogId=flightLog.begin(state,config.model).id;$('copy-fallback').hidden=true;$('log-feedback').textContent='';syncPuzzleSelection();update();$('word').value='';$('status').textContent=`Tee off from ${state.start}. Play a word towards ${state.target}.`;$('last-reading').textContent=state.mode==='distance'?'Long shots need stronger connections. Reach the green for a one-shot automatic finish, or chip in with the hole word.':'Every shot uses the fixed strength setting.';return true;}
 catch(error){$('status').textContent=error.message;return false;}finally{lock(false);if(state?.won)$('launch').disabled=true;}
}
function bezier(a,b,t){return {x:(1-t)**2*a.x+2*(1-t)*t*(a.x+b.x)/2+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*(Math.min(a.y,b.y)-65)+t*t*b.y};}
async function animate(event){
 const a=position(state.current),b=event.outcome==='water'?waterPoint(event):position(event.word,event),ball=$('golf-ball');
 if(reduced)return;
 const duration=event.outcome==='water'?1250:event.outcome==='miss'?450:1000;
 await new Promise(resolve=>{const start=performance.now();function frame(now){const t=Math.min(1,(now-start)/duration);let point=a;
 if(event.outcome==='water'){
  if(t<.72)point=bezier(a,b,t/.72);
  ball.setAttribute('opacity',t>=.72&&t<.94?'0':'1');
  const splash=$('water-splash');if(splash&&t>=.72){splash.setAttribute('opacity',String(1-(t-.72)/.28));splash.setAttribute('r',String(8+35*(t-.72)/.28));}
 }else if(event.success)point=bezier(a,b,t*t*(3-2*t));
 else if(event.outcome==='miss')point={x:a.x+Math.sin(t*Math.PI*4)*(1-t)*4,y:a.y};
 else point=bezier(a,b,t<.5?t*1.1:(1-t)*1.1);
 ball.setAttribute('transform',`translate(${point.x},${point.y})`);
 if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});
}

async function submit(word){
 if(busy||!state||state.won)return false;
 $('word').blur();$('shot-notice').hidden=true;lock(true);$('attempts').textContent=state.attempts+1;
 try{
 let data;try{data=await api('submit',{word});}catch(error){flightLog.record(word,state,null,error.message);selectedLogId=flightLog.data.activeId;renderLog();throw error;}
 const event=data.event;flightLog.record(word,data.state,event);selectedLogId=flightLog.data.activeId;
 // Keep the old state visible until the proposal and flight have played out.
 if(event.outcome||event.forward!==false){map(event);$('status').textContent=`Playing ${event.word.toUpperCase()}…`;$('last-reading').textContent='';
 await delay(reduced?150:350);await animate(event);}
 if(event.automatic_shot){
   state={...data.state,current:event.word};map();$('status').textContent='On the green! Finishing in one more shot…';
   await delay(reduced?0:250);await animate(event.automatic_shot);
 }
 state=data.state;shownEvent=event;update();$('word').value='';
 if(event.won)document.querySelector('.map-card').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
 $('status').textContent=event.won?(event.automatic_shot?`Holed in ${state.attempts} shots, including the automatic finish.`:`Holed directly in ${state.attempts} shots!`):event.outcome==='water'?`Splash! Backward shot into the water. Ball returned to ${state.current}.`:event.outcome==='miss'?`Miss! Not enough connection to ${event.word}. Ball stays at ${state.current}.`:event.outcome==='backtrack'?`Back to ${event.word}. A new line is open.`:event.outcome==='recovery'?`Recovery shot to ${event.word}. Ready for your next shot.`:event.success?`Ball landed on ${event.word}. Ready for your next shot.`:'Ball stays put. One shot counted.';
 $('last-reading').textContent=event.won?`${state.attempts} ${state.attempts===1?'shot':'shots'} · Hole complete`:event.outcome==='water'?'One shot counted. No extra penalty.':event.success?'Good contact. Choose your next word.':'One shot counted. Try a stronger connection.';

 return true;
 }catch(error){$('attempts').textContent=state.attempts;$('status').textContent=error.message;return false;}
 finally{lock(false);if(state.won)$('launch').disabled=true;else if(!narrow())$('word').focus({preventScroll:true});}
}
$('launch-form').addEventListener('submit',event=>{event.preventDefault();submit($('word').value);});
$('debug-toggle').onclick=()=>{const open=$('debug').hidden;$('debug').hidden=!open;$('debug-toggle').setAttribute('aria-expanded',String(open));};
$('lab-form').onsubmit=event=>{event.preventDefault();newGame({start:$('lab-start').value,target:$('lab-target').value,threshold:Number($('threshold').value),mode:$('launch-mode').value,launch_min:Number($('launch-min').value),launch_max:Number($('launch-max').value)});};
$('new-game').onclick=()=>newGame($('puzzle').value==='custom'?{start:state.start,target:state.target,threshold:state.threshold,mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max}:config.puzzles[Number($('puzzle').value)]);
$('opening-game').onclick=()=>newGame(config.puzzles[0]);
$('upgrade-rules').onclick=()=>newGame({start:state.start,target:state.target,threshold:.28,mode:'distance',launch_min:.10,launch_max:.21});
$('puzzle').onchange=()=>newGame(config.puzzles[Number($('puzzle').value)]);
let assessmentTimer,assessmentSequence=0;
function previewHole(){
 clearTimeout(assessmentTimer);const sequence=++assessmentSequence;
 const start=$('custom-start').value.trim().toLowerCase(),target=$('custom-target').value.trim().toLowerCase();
 if(!start||!target||!client){$('custom-assessment').textContent='';return;}
 $('custom-assessment').textContent='Assessing these words…';
 assessmentTimer=setTimeout(async()=>{
  try{const result=await api('assess',{...config.puzzles[0],start,target});if(sequence!==assessmentSequence)return;
   $('custom-assessment').textContent=result.direct_hole_in_one?'Direct hole in one available. Choose a more distant pair.':!result.playable?'No playable opening found. Choose another pair.':`${result.difficulty} estimate · ${result.separation_degrees.toFixed(0)}° word separation · ${result.green_bridges} opening ${result.green_bridges===1?'bridge':'bridges'} onto the green. Based on available connections; human difficulty may differ.`;
   $('custom-assessment').dataset.valid=String(result.playable);
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
$('log-journey').onchange=()=>{selectedLogId=$('log-journey').value;$('copy-fallback').hidden=true;renderLog();};
$('copy-log').onclick=async()=>{
 const journey=flightLog.data.journeys.find(j=>j.id===selectedLogId);if(!journey)return;
 const text=journeyText(journey);
 try{await navigator.clipboard.writeText(text);$('log-feedback').textContent='Scorecard copied. Paste it into our chat.';}
 catch{$('copy-fallback').hidden=false;$('log-copy-text').value=text;$('log-copy-text').focus();$('log-copy-text').select();$('log-feedback').textContent='Select and copy the scorecard text below.';}
};
$('download-log').onclick=()=>{
 const blob=new Blob([flightLog.exportJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='word-golf-scorecards.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('log-feedback').textContent='Backup download requested. If it does not appear, use Copy scorecard.';
};
renderLog();
try{lock(true);$('status').textContent='Preparing the course (about 14 MB on your first visit; cached afterwards)…';client=await createBrowserClient();config=client.config;lock(false);$('puzzle').innerHTML=config.puzzles.map((p,i)=>`<option value="${i}">${esc(p.start)} → ${esc(p.target)}</option>`).join('');$('model-info').textContent=`${config.model} / ${config.vocabulary.toLocaleString()} WORDS · ${config.release||'golf-v11'}`;if(startupAction(flightLog.active,config.puzzles[0])==='upgrade'){const saved=flightLog.active.state;await newGame({start:saved.start,target:saved.target,threshold:.28,mode:'distance',launch_min:.10,launch_max:.21});$('status').textContent='New course rules are ready: backtracking, a one-shot automatic finish, and slightly firmer shots. Your earlier rounds are saved in Scorecards.';}else if(startupAction(flightLog.active,config.puzzles[0])==='restore'){try{state=(await api('restore',{state:flightLog.active.state})).state;shownEvent=state.history.at(-1)||null;syncPuzzleSelection();update();$('status').textContent=state.won?'Your completed hole and scorecard have been restored.':isOpening(state,config.puzzles[0])?'Hole restored. Play your next shot.':`Resuming your ${state.start} → ${state.target} hole. The opening hole is ${config.puzzles[0].start} → ${config.puzzles[0].target}.`;if(state.won)$('launch').disabled=true;}catch{await newGame(config.puzzles[0]);$('status').textContent='Teed up a fresh hole. Your earlier scorecards are still available below.';}}else await newGame(config.puzzles[0]);}
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
