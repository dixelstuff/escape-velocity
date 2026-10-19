import { createBrowserClient } from './engine.mjs';
import { FlightLog, outcome, journeyText } from './flight-log.mjs';
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
const dimensions=()=>narrow()?{width:640,left:55,right:585,edge:610}:{width:1000,left:80,right:900,edge:925};
const x=similarity=>{const d=dimensions();return Math.max(20,Math.min(d.edge,d.left+(d.right-d.left)*(similarity-state.baseline)/(1-state.baseline)));};
function position(word,event=null){if(word===state.start)return {x:dimensions().left,y:194};if(word===state.target)return {x:dimensions().right,y:194};const h=event||state.history.find(e=>e.word===word);return {x:x(h.destination),y:194+[-62,54,-104,97,-28,15][(h.attempt-1)%6]};}
const path=(a,b)=>`M ${a.x},${a.y} Q ${(a.x+b.x)/2},${Math.min(a.y,b.y)-65} ${b.x},${b.y}`;
function map(preview=null){
 const d=dimensions();$('map').setAttribute('viewBox',`0 0 ${d.width} 360`);
 const zone=x(state.threshold);
 let svg=`<rect x="${zone}" y="57" width="${d.edge-zone}" height="274" rx="12" fill="#d8e7ce" fill-opacity=".45" stroke="#9cba8d" stroke-dasharray="5 6"/><text x="${Math.min(d.right-75,zone+20)}" y="72" class="map-small">ARRIVAL ZONE</text><path d="M${d.left} 194 H${d.right}" stroke="#c3cfbb" stroke-dasharray="3 8"/>`;
 for(const h of state.history){const a=position(h.origin),b=position(h.word,h);svg+=`<path d="${path(a,b)}" fill="none" stroke="${h.success?'#7d9f73':'#b7bfb1'}" stroke-width="1.4" ${h.success?'':'stroke-dasharray="3 5"'} opacity=".6"/>`;}
 const planets=[{word:state.start,pos:position(state.start)},...state.history.filter(h=>h.word!==state.target).map(h=>({word:h.word,pos:position(h.word,h),failed:!h.success})),{word:state.target,pos:position(state.target)}];
 if(preview)planets.splice(planets.length-1,0,{word:preview.word,pos:position(preview.word,preview),preview:true});
 for(const p of planets){const active=p.word===(state.won?state.target:state.current);svg+=`<g opacity="${p.failed?.35:1}"><circle cx="${p.pos.x}" cy="${p.pos.y}" r="14" fill="${p.preview?'#f6f7f2':active?'#397655':'#f7f8f0'}" stroke="${p.preview?'#a89965':'#63845a'}" stroke-width="2"/><text x="${p.pos.x}" y="${p.pos.y+35}" text-anchor="middle" class="planet-label" fill="#41563e">${esc(p.word.toUpperCase())}</text>${active?`<text x="${p.pos.x}" y="${p.pos.y+53}" text-anchor="middle" class="map-small">YOU ARE HERE</text>`:''}</g>`;}
 const r=state.won?position(state.target):position(state.current);
 svg+=`<text id="rocket" x="0" y="0" text-anchor="middle" font-size="30" transform="translate(${r.x},${r.y-28})">🚀</text>`;
 $('map').innerHTML=svg;
}
function telemetry(){
 const last=shownEvent;
 $('telemetry').textContent=JSON.stringify({current:state.current,proposed:last?.word??null,target:state.target,launch_cosine:last?.launch??null,destination_cosine:last?.destination??null,launch_threshold:state.threshold,progress:state.progress,starting_boundary:state.baseline,inside_arrival_zone:last?.inside??null,attempts:state.attempts,successful_route:state.route,failed_attempts:state.history.filter(e=>!e.success).map(e=>({word:e.word,launch:e.launch,destination:e.destination,reason:e.boundary?'insufficient launch similarity':'behind starting boundary'}))},null,2);
}
function renderLog(){
 const journeys=flightLog.data.journeys;
 if(!journeys.some(j=>j.id===selectedLogId))selectedLogId=flightLog.data.activeId;
 $('log-journey').innerHTML=[...journeys].reverse().map(j=>`<option value="${esc(j.id)}" ${j.id===selectedLogId?'selected':''}>${esc(j.state.start)} → ${esc(j.state.target)} · ${j.state.attempts} attempts · ${j.state.won?'completed':'in progress'} · ${esc(new Date(j.startedAt).toLocaleString())}</option>`).join('');
 const journey=journeys.find(j=>j.id===selectedLogId);
 $('log-summary').textContent=journey?`${journey.state.attempts} scored attempts · ${journey.entries.length} submissions · threshold ${journey.state.threshold}`:'Your submissions will appear here.';
 $('log-entries').innerHTML=journey?.entries.map(entry=>`<li><div class="log-entry-heading"><strong>${entry.event?'#'+entry.event.attempt:'Unscored'} · ${esc(entry.origin)} → ${esc(entry.word)}</strong><span>${esc(outcome(entry))}</span></div>${entry.event?`<p>Launch ${entry.event.launch.toFixed(3)} / ${entry.threshold.toFixed(2)} needed · Destination ${entry.event.destination.toFixed(3)}${entry.event.inside?' · In arrival zone':''}</p>`:''}</li>`).join('')||'<li class="subtle">No submissions yet.</li>';
 $('log-storage').textContent=flightLog.warning||'Saved in this browser. Download all logs for a backup or to share them.';
}
function syncPuzzleSelection(){
 const index=config.puzzles.findIndex(p=>p.start===state.start&&p.target===state.target&&p.threshold===state.threshold);
 $('puzzle').querySelector('option[value="custom"]')?.remove();
 if(index<0){const option=document.createElement('option');option.value='custom';option.textContent=`${state.start} → ${state.target} (custom)`;$('puzzle').append(option);$('puzzle').value='custom';}
 else $('puzzle').value=String(index);
}
function update(){
 $('start-label').textContent=state.start;$('target-label').textContent=state.target;$('attempts').textContent=state.attempts;
 $('lab-start').value=state.start;$('lab-target').value=state.target;$('threshold').value=state.threshold;
 $('results').hidden=!state.won;
 if(state.won){$('results').innerHTML=`<span class="eyebrow">DESTINATION REACHED</span><h2>${state.attempts===1?'Holy Grail. One extraordinary leap.':`Touchdown in ${state.attempts} attempts.`}</h2><p>${[...state.route,...(state.route.at(-1)===state.target?[]:[state.target])].map(esc).join(' → ')} <small>(free final hop)</small></p><p>Failed attempts: ${state.history.filter(h=>!h.success).map(h=>esc(h.word)).join(', ')||'none'}</p><p>Your full journey is shown above.</p>`;}
 map();telemetry();renderLog();
}
async function newGame(puzzle){
 if(busy)return;lock(true);
 try{const data=await api('new',puzzle);state=data.state;shownEvent=null;selectedLogId=flightLog.begin(state,config.model).id;$('copy-fallback').hidden=true;$('log-feedback').textContent='';syncPuzzleSelection();update();$('word').value='';$('status').textContent=`Start from ${state.start}. Find a word that connects you to ${state.target}.`;$('last-reading').textContent='The arrival zone uses the same similarity threshold as each launch.';}
 catch(error){$('status').textContent=error.message;}finally{lock(false);if(state?.won)$('launch').disabled=true;}
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
 if(event.won){const target=position(state.target);await new Promise(resolve=>{const start=performance.now();function frame(now){let t=Math.min(1,(now-start)/800),p;
 if(t<.35){let angle=-Math.PI/2+t/.35*Math.PI*1.6;p={x:b.x+25*Math.cos(angle),y:b.y+25*Math.sin(angle)};}else p=bezier(b,target,(t-.35)/.65);
 rocket.setAttribute('transform',`translate(${p.x},${p.y-28})`);if(t<1)requestAnimationFrame(frame);else resolve();}requestAnimationFrame(frame);});}
}
async function submit(word){
 if(busy||!state||state.won)return false;
 lock(true);const previousProgress=state.progress;$('attempts').textContent=state.attempts+1;
 try{
 let data;try{data=await api('submit',{word});}catch(error){flightLog.record(word,state,null,error.message);selectedLogId=flightLog.data.activeId;renderLog();throw error;}
 const event=data.event;flightLog.record(word,data.state,event);selectedLogId=flightLog.data.activeId;renderLog();
 // Keep the old state visible until the proposal and flight have played out.
 map(event);$('status').textContent=`${event.word.toUpperCase()} spotted. Preparing to launch…`;$('last-reading').textContent='';
 await delay(reduced?250:850);await animate(event);
 state=data.state;shownEvent=event;update();$('word').value='';
 $('status').textContent=event.won?'Gravity assist complete. Welcome to your destination.':event.success?`Landed on ${event.word}. ${event.destination<previousProgress?'A step back can open a new route.':'Ready for your next connection.'}`:!event.boundary?'That planet lies behind the starting boundary. Returned to your current planet.':`Not enough lift to reach ${event.word}. Try a closer connection to ${state.current}.`;
 $('last-reading').textContent=`Launch ${event.launch.toFixed(3)} / ${state.threshold.toFixed(2)} needed · Destination ${event.destination.toFixed(3)}${event.inside?' · Inside arrival zone':''}`;
 return true;
 }catch(error){$('attempts').textContent=state.attempts;$('status').textContent=error.message;return false;}
 finally{lock(false);if(state.won)$('launch').disabled=true;else $('word').focus();}
}
$('launch-form').addEventListener('submit',event=>{event.preventDefault();submit($('word').value);});
$('debug-toggle').onclick=()=>{const open=$('debug').hidden;$('debug').hidden=!open;$('debug-toggle').setAttribute('aria-expanded',String(open));};
$('lab-form').onsubmit=event=>{event.preventDefault();newGame({start:$('lab-start').value,target:$('lab-target').value,threshold:Number($('threshold').value)});};
$('new-game').onclick=()=>newGame($('puzzle').value==='custom'?{start:state.start,target:state.target,threshold:state.threshold}:config.puzzles[Number($('puzzle').value)]);
$('puzzle').onchange=()=>newGame(config.puzzles[Number($('puzzle').value)]);
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
try{lock(true);$('status').textContent='Loading real word vectors (24 MB on your first visit)…';client=await createBrowserClient();config=client.config;lock(false);$('puzzle').innerHTML=config.puzzles.map((p,i)=>`<option value="${i}">${esc(p.start)} → ${esc(p.target)}</option>`).join('');$('model-info').textContent=`${config.model} / ${config.vocabulary.toLocaleString()} WORDS`;if(flightLog.active){try{state=(await api('restore',{state:flightLog.active.state})).state;shownEvent=state.history.at(-1)||null;syncPuzzleSelection();update();$('status').textContent=state.won?'Your completed journey and flight log have been restored.':'Journey restored. Pick up where you left off.';if(state.won)$('launch').disabled=true;}catch{await newGame(config.puzzles[0]);$('status').textContent='Started a fresh journey. Your earlier logs are still available below.';}}else await newGame(config.puzzles[0]);}
catch(error){$('status').textContent=`Launchpad unavailable: ${error.message}. Please reload to try again.`;}

window.addEventListener('resize',()=>{if(state&&!busy)map();});
