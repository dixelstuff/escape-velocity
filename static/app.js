import { createBrowserClient } from './engine.mjs?v=custom-v7';
import { mapLayout, projectX, visibleAttempts } from './map.mjs?v=custom-v7';
import { startupAction, isOpening } from './startup.mjs?v=custom-v7';
import { FlightLog, outcome, journeyText } from './flight-log.mjs?v=custom-v7';
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
const path=(a,b)=>`M ${a.x},${a.y} Q ${(a.x+b.x)/2},${Math.min(a.y,b.y)-65} ${b.x},${b.y}`;
function map(preview=null){
 const d=dimensions();$('map').setAttribute('viewBox',`0 0 ${d.width} 360`);
 const zone=d.zoneLeft;
 let svg=`<rect x="${zone}" y="57" width="${d.zoneRight-zone}" height="274" rx="12" fill="#d8e7ce" fill-opacity=".45" stroke="#9cba8d" stroke-dasharray="5 6"/><text x="${d.right}" y="72" text-anchor="middle" class="map-small arrival-label">ARRIVAL ZONE</text><path d="M${d.left} 194 H${d.right}" stroke="#c3cfbb" stroke-dasharray="3 8"/>`;
 for(const h of visibleAttempts(state)){const a=position(h.origin),b=position(h.word,h);svg+=`<path d="${path(a,b)}" fill="none" stroke="${h.success?'#7d9f73':'#b7bfb1'}" stroke-width="1.4" ${h.success?'':'stroke-dasharray="3 5"'} opacity=".6"/>`;}
 const nodes=new Map([[state.start,{word:state.start,pos:position(state.start)}]]);
 for(const h of visibleAttempts(state)){if(h.word===state.target)continue;const old=nodes.get(h.word);if(!old)nodes.set(h.word,{word:h.word,pos:position(h.word,h),failed:!h.success});else if(h.success)old.failed=false;}
 nodes.set(state.target,{word:state.target,pos:position(state.target)});
 if(preview&&preview.forward!==false){const old=nodes.get(preview.word);if(old)old.preview=true;else nodes.set(preview.word,{word:preview.word,pos:position(preview.word,preview),preview:true});}
 const planets=[...nodes.values()];
 for(const p of planets){const active=p.word===state.current;svg+=`<g opacity="${p.failed?.35:1}"><circle cx="${p.pos.x}" cy="${p.pos.y}" r="14" fill="${p.preview?'#f6f7f2':active?'#397655':'#f7f8f0'}" stroke="${p.preview?'#a89965':'#63845a'}" stroke-width="2"/><text x="${p.pos.x}" y="${p.pos.y+35}" text-anchor="middle" class="planet-label" fill="#41563e">${esc(p.word.toUpperCase())}</text></g>`;}
 const r=position(state.current);
 svg+=`<text id="rocket" x="0" y="0" text-anchor="middle" font-size="30" transform="translate(${r.x},${r.y-28})">🚀</text>`;
 $('map').innerHTML=svg;
}
function telemetry(){
 const last=shownEvent;
 $('telemetry').textContent=JSON.stringify({current:state.current,proposed:last?.word??null,target:state.target,launch_cosine:last?.launch??null,destination_cosine:last?.destination??null,launch_mode:state.mode,rules:state.rules,required_launch:last?.required??state.threshold,trip_fraction:last?.trip_fraction??null,arrival_threshold:state.threshold,launch_min:state.launch_min,launch_max:state.launch_max,progress:state.progress,starting_boundary:state.baseline,inside_arrival_zone:last?.inside??null,attempts:state.attempts,successful_route:state.route,failed_attempts:state.history.filter(e=>!e.success).map(e=>({word:e.word,launch:e.launch,destination:e.destination,reason:e.forward===false?'backward guess':e.boundary?'insufficient launch similarity':'behind starting boundary'}))},null,2);
}
function renderLog(){
 const journeys=flightLog.data.journeys;
 if(!journeys.some(j=>j.id===selectedLogId))selectedLogId=flightLog.data.activeId;
 $('log-journey').innerHTML=[...journeys].reverse().map(j=>`<option value="${esc(j.id)}" ${j.id===selectedLogId?'selected':''}>${esc(j.state.start)} → ${esc(j.state.target)} · ${j.state.attempts} attempts · ${j.state.won?'completed':'in progress'} · ${esc(new Date(j.startedAt).toLocaleString())}</option>`).join('');
 const journey=journeys.find(j=>j.id===selectedLogId);
 $('log-summary').textContent=journey?`${journey.state.attempts} scored attempts · ${journey.entries.length} submissions · ${journey.state.mode==='distance'?'distance launches · arrival':'fixed threshold'} ${journey.state.threshold}`:'Your submissions will appear here.';
 $('log-entries').innerHTML=journey?.entries.map(entry=>`<li><div class="log-entry-heading"><strong>${entry.event?'#'+entry.event.attempt:'Unscored'} · ${esc(entry.origin)} → ${esc(entry.word)}</strong><span>${esc(outcome(entry))}</span></div>${entry.event?`<p>Launch ${entry.event.launch.toFixed(3)} / ${(entry.event.required??entry.threshold).toFixed(3)} needed · Destination ${entry.event.destination.toFixed(3)}${entry.event.inside?' · In arrival zone':''}</p>`:''}</li>`).join('')||'<li class="subtle">No submissions yet.</li>';
 $('log-storage').textContent=flightLog.warning||'Saved in this browser. Download all logs for a backup or to share them.';
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
 $('upgrade-rules').hidden=['distance-v3','fixed-threshold-v3'].includes(state.rules);$('rules-note').textContent=state.mode==='distance'?'Move forward. Short hops need less lift. Finishing gets easier as you approach.':'Move forward. Every launch uses the fixed requirement.';
 $('opening-game').hidden=isOpening(state,config.puzzles[0]);$('opening-game').textContent=`Play opening journey: ${config.puzzles[0].start} → ${config.puzzles[0].target}`;
 $('results').hidden=!state.won;
 $('arrival-banner').hidden=!state.won;
 document.querySelector('.map-card').classList.toggle('arrived',state.won);
 if(state.won)$('arrival-summary').textContent=`${state.attempts} ${state.attempts===1?'attempt':'attempts'} · ${state.start} → ${state.target}`;
 if(state.won){$('results').innerHTML=`<span class="eyebrow">ARRIVAL ZONE REACHED</span><h2>${state.attempts===1?'Holy Grail. One extraordinary leap.':`Touchdown in ${state.attempts} attempts.`}</h2><p>${state.route.map(esc).join(' → ')} <small>(${esc(state.target)} arrival zone reached)</small></p><p>Failed attempts: ${state.history.filter(h=>!h.success).map(h=>esc(h.word)).join(', ')||'none'}</p><p>Your full journey is shown above.</p>`;}
 map();telemetry();renderLog();
}
async function newGame(puzzle){
 if(busy)return false;lock(true);
 try{const data=await api('new',puzzle);state=data.state;shownEvent=null;selectedLogId=flightLog.begin(state,config.model).id;$('copy-fallback').hidden=true;$('log-feedback').textContent='';syncPuzzleSelection();update();$('word').value='';$('status').textContent=`Start from ${state.start}. Find a word that connects you to ${state.target}.`;$('last-reading').textContent=state.mode==='distance'?'Launch requirements grow with trip length. Land in the arrival zone to complete the journey.':'Launch and arrival use the fixed threshold.';return true;}
 catch(error){$('status').textContent=error.message;return false;}finally{lock(false);if(state?.won)$('launch').disabled=true;}
}
function bezier(a,b,t){return {x:(1-t)**2*a.x+2*(1-t)*t*(a.x+b.x)/2+t*t*b.x,y:(1-t)**2*a.y+2*(1-t)*t*(Math.min(a.y,b.y)-65)+t*t*b.y};}
async function animate(event){
 const a=position(state.current), b=position(event.word,event), rocket=$('rocket');
 const duration=reduced?0:1050;
 if(!duration)return;
 await new Promise(resolve=>{const start=performance.now();function frame(now){let t=Math.min(1,(now-start)/duration);let point;
 if(event.success)point=bezier(a,b,t*t*(3-2*t));
 else{const u=t<.5?t*1.1:(1-t)*1.1;point=bezier(a,b,u);}
 rocket.setAttribute('transform',`translate(${point.x},${point.y-28})`);
 if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});

}
async function submit(word){
 if(busy||!state||state.won)return false;
 $('word').blur();lock(true);$('attempts').textContent=state.attempts+1;
 try{
 let data;try{data=await api('submit',{word});}catch(error){flightLog.record(word,state,null,error.message);selectedLogId=flightLog.data.activeId;renderLog();throw error;}
 const event=data.event;flightLog.record(word,data.state,event);selectedLogId=flightLog.data.activeId;
 // Keep the old state visible until the proposal and flight have played out.
 if(event.forward!==false){map(event);$('status').textContent=`${event.word.toUpperCase()} spotted. Preparing to launch…`;$('last-reading').textContent='';
 await delay(reduced?250:850);await animate(event);}
 state=data.state;shownEvent=event;update();$('word').value='';
 if(event.won)document.querySelector('.map-card').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
 $('status').textContent=event.won?'Arrival zone reached. Journey complete.':event.success?`Landed on ${event.word}. Ready for your next connection.`:event.forward===false?'That guess goes backward. One attempt used; try a word closer to your destination.':!event.boundary?'That planet lies behind the starting boundary. Returned to your current planet.':`Not enough lift to reach ${event.word}. Try a closer connection to ${state.current}.`;
 $('last-reading').textContent=`Launch ${event.launch.toFixed(3)} / ${(event.required??state.threshold).toFixed(3)} needed · Destination ${event.destination.toFixed(3)}${event.inside?' · Inside arrival zone':''}`;
 return true;
 }catch(error){$('attempts').textContent=state.attempts;$('status').textContent=error.message;return false;}
 finally{lock(false);if(state.won)$('launch').disabled=true;else if(!narrow())$('word').focus({preventScroll:true});}
}
$('launch-form').addEventListener('submit',event=>{event.preventDefault();submit($('word').value);});
$('debug-toggle').onclick=()=>{const open=$('debug').hidden;$('debug').hidden=!open;$('debug-toggle').setAttribute('aria-expanded',String(open));};
$('lab-form').onsubmit=event=>{event.preventDefault();newGame({start:$('lab-start').value,target:$('lab-target').value,threshold:Number($('threshold').value),mode:$('launch-mode').value,launch_min:Number($('launch-min').value),launch_max:Number($('launch-max').value)});};
$('new-game').onclick=()=>newGame($('puzzle').value==='custom'?{start:state.start,target:state.target,threshold:state.threshold,mode:state.mode,launch_min:state.launch_min,launch_max:state.launch_max}:config.puzzles[Number($('puzzle').value)]);
$('opening-game').onclick=()=>newGame(config.puzzles[0]);
$('upgrade-rules').onclick=()=>newGame({start:state.start,target:state.target,threshold:.25,mode:'distance',launch_min:.08,launch_max:.18});
$('puzzle').onchange=()=>newGame(config.puzzles[Number($('puzzle').value)]);
$('custom-form').onsubmit=async event=>{
 event.preventDefault();if(busy||!config)return;
 $('custom-start').blur();$('custom-target').blur();$('custom-feedback').textContent='';
 const started=await newGame({...config.puzzles[0],start:$('custom-start').value,target:$('custom-target').value});
 if(!started){$('custom-feedback').textContent=$('status').textContent;return;}
 $('custom-start').value=state.start;$('custom-target').value=state.target;
 $('custom-feedback').textContent=`Your ${state.start} → ${state.target} journey is ready.`;
 document.querySelector('.map-card').scrollIntoView({block:'center',behavior:reduced?'instant':'smooth'});
};

$('route-form').onsubmit=async event=>{event.preventDefault();if(busy)return;const words=$('route-input').value.split(',').map(w=>w.trim()).filter(Boolean);for(const word of words){if(state.won||!await submit(word))break;}};
$('log-journey').onchange=()=>{selectedLogId=$('log-journey').value;$('copy-fallback').hidden=true;renderLog();};
$('copy-log').onclick=async()=>{
 const journey=flightLog.data.journeys.find(j=>j.id===selectedLogId);if(!journey)return;
 const text=journeyText(journey);
 try{await navigator.clipboard.writeText(text);$('log-feedback').textContent='Journey copied. Paste it into our chat.';}
 catch{$('copy-fallback').hidden=false;$('log-copy-text').value=text;$('log-copy-text').focus();$('log-copy-text').select();$('log-feedback').textContent='Select and copy the journey text below.';}
};
$('download-log').onclick=()=>{
 const blob=new Blob([flightLog.exportJSON()],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download='escape-velocity-flight-logs.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);$('log-feedback').textContent='Backup download requested. If it does not appear, use Copy journey.';
};
renderLog();
try{lock(true);$('status').textContent='Loading real word vectors (24 MB on your first visit)…';client=await createBrowserClient();config=client.config;lock(false);$('puzzle').innerHTML=config.puzzles.map((p,i)=>`<option value="${i}">${esc(p.start)} → ${esc(p.target)}</option>`).join('');$('model-info').textContent=`${config.model} / ${config.vocabulary.toLocaleString()} WORDS · ${config.release||'custom-v7'}`;if(startupAction(flightLog.active,config.puzzles[0])==='upgrade'){const saved=flightLog.active.state;await newGame({start:saved.start,target:saved.target,threshold:.25,mode:'distance',launch_min:.08,launch_max:.18});$('status').textContent='New journey started with a gentler final launch. Your previous attempts are saved in Flight log.';}else if(startupAction(flightLog.active,config.puzzles[0])==='restore'){try{state=(await api('restore',{state:flightLog.active.state})).state;shownEvent=state.history.at(-1)||null;syncPuzzleSelection();update();$('status').textContent=state.won?'Your completed journey and flight log have been restored.':isOpening(state,config.puzzles[0])?'Journey restored. Pick up where you left off.':`Resuming your saved ${state.start} → ${state.target} journey. The opening journey is ${config.puzzles[0].start} → ${config.puzzles[0].target}.`;if(state.won)$('launch').disabled=true;}catch{await newGame(config.puzzles[0]);$('status').textContent='Started a fresh journey. Your earlier logs are still available below.';}}else await newGame(config.puzzles[0]);}
catch(error){$('status').textContent=`Launchpad unavailable: ${error.message}. Please reload to try again.`;}

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
