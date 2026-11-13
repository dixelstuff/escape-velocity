import {BAND_FREE_VERSION} from './cleverness-score-config.mjs?v=incoming-dogleg-v1';
import {SIMULATION_DATA_VERSION,simulationSettingsKey,compareSimulatedRoute,simulationForState} from './simulation-comparison.mjs?v=simulation-pilot-v1';
export const SIMULATION_HOLE_IDS=['daily-2027-09-30','daily-2027-10-01','daily-2027-10-02','daily-2027-10-03','daily-2027-10-04'];
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),percent=x=>x===null?'—':Math.round(x)+'%';
export function distributionChart(hist,marker,label,{score=false}={}){
 const numbers=Object.keys(hist).map(Number),lo=score?0:Math.min(...numbers,marker),hi=score?100:Math.max(...numbers,marker),span=Math.max(1,hi-lo+1),group=score?5:Math.max(1,Math.ceil(span/24)),bins=new Map();for(const[x,n]of Object.entries(hist)){const k=Math.floor((Number(x)-lo)/group);bins.set(k,(bins.get(k)??0)+n);}const max=Math.max(1,...bins.values()),width=290,height=65,x=v=>8+(v-lo+.5)/span*274,barWidth=274*group/span;
 const bars=[...bins].map(([i,n])=>{const h=n/max*42;return`<rect x="${8+i*barWidth}" y="${47-h}" width="${Math.max(.7,274*Math.min(group,hi-(lo+i*group)+1)/span-1)}" height="${h}" rx="1"/>`;}).join('');
 return`<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(label)} distribution; your route ${marker}"><g class="simulation-bars">${bars}</g><path class="simulation-axis" d="M8 48H282"/><path class="simulation-marker" d="M${x(marker)} 2V49"/><text x="8" y="62">${lo}</text><text x="282" y="62" text-anchor="end">${hi}</text></svg>`;
}
export function simulationDetails(hole,{strokes,score},policyId=hole.styles[0].policy){
 const rows=compareSimulatedRoute(hole,{strokes,score}),chosen=hole.styles.find(s=>s.policy===policyId)??hole.styles[0],row=rows.find(r=>r.id===chosen.policy),same=row.sameStrokeLower===null?`Too few scored samples at ${strokes} strokes (${row.sameN}).`:`Among ${row.sameN} scored samples using ${strokes} strokes, ${percent(row.sameStrokeLower)} had lower Cleverness.`;
 return{rows,chosen,row,table:`<p class="simulation-route">Shown route: <b>${strokes} strokes · ${score} Cleverness</b></p><table><thead><tr><th>Sampling style</th><th>More strokes</th><th>Lower Cleverness</th></tr></thead><tbody>${rows.map(r=>`<tr><th>${escape(r.name)}</th><td>${percent(r.moreStrokes)}</td><td>${percent(r.lowerCleverness)}</td></tr>`).join('')}</tbody></table>`,chart:`<p class="simulation-chart-label">Strokes</p>${distributionChart(chosen.strokeHistogram,strokes,'Strokes')}<p class="simulation-chart-label">Cleverness</p>${distributionChart(chosen.clevernessHistogram,score,'Cleverness',{score:true})}<p class="simulation-caption">Gold line: your route. ${row.completed.toLocaleString('en')} completed simulations; ${row.scored} randomly sampled completions scored.</p><p class="simulation-caption">${same}</p>`};
}
export function mountSimulationPanel(node,{load=async()=>{const r=await fetch(new URL('./simulation-pilot.json?v=incoming-dogleg-v1',import.meta.url));if(!r.ok)throw Error('Simulation data unavailable');return r.json();}}={}){
 let pending=null,key=null,token=0,last=null;
 node.addEventListener('click',event=>event.stopPropagation());node.addEventListener('pointerdown',event=>event.stopPropagation());
 function show(input){last=input;const{id,state,score,modelSha,visible=true}=input;
  if(!visible||!state?.won||!SIMULATION_HOLE_IDS.includes(id)){key=null;token++;node.hidden=true;return;}
  const next=JSON.stringify([id,simulationSettingsKey(state),state.route,score,modelSha]);if(next===key)return;key=next;const ticket=++token,keepOpen=node.querySelector('details')?.open??false;node.hidden=false;
  if(!Number.isFinite(score)){node.innerHTML=`<details class="simulation-comparison" ${keepOpen?'open':''}><summary>Compare with simulations</summary><p>Cleverness is calculating…</p></details>`;return;}
  node.innerHTML=`<details class="simulation-comparison" ${keepOpen?'open':''}><summary>Compare with simulations</summary><p>Loading simulation comparisons…</p></details>`;
  pending??=Promise.resolve().then(load).catch(error=>{pending=null;throw error;});pending.then(data=>{
   if(ticket!==token)return;const hole=simulationForState(data,{id,state,scorerVersion:BAND_FREE_VERSION,modelSha});
   if(!hole){node.innerHTML='<details class="simulation-comparison"><summary>Compare with simulations</summary><p>This route uses different rules or scoring from the simulation pilot.</p></details>';return;}
   const route={strokes:state.attempts,score},view=simulationDetails(hole,route),wasOpen=node.querySelector('details')?.open;
   node.innerHTML=`<details class="simulation-comparison" ${wasOpen?'open':''}><summary>Compare with simulations <small>PILOT</small></summary><div class="simulation-scroll"><p class="simulation-caption">Computer-generated routes, not player rankings. Each style chooses words differently; percentages describe these samples.</p>${view.table}<label class="simulation-select">View distribution <select aria-label="Simulation sampling style">${hole.styles.map(s=>`<option value="${escape(s.policy)}">${escape(s.name)}</option>`).join('')}</select></label><div class="simulation-charts">${view.chart}</div><p class="simulation-caption">Legal-route sampling from a limited association pool, capped at 12 chosen words. The pool can miss short or clever routes. Miss rates and repeated player exploration are not modelled.</p></div></details>`;
   node.querySelector('select').onchange=event=>{node.querySelector('.simulation-charts').innerHTML=simulationDetails(hole,route,event.target.value).chart;};
  }).catch(()=>{if(ticket!==token)return;node.innerHTML='<details class="simulation-comparison" open><summary>Compare with simulations</summary><p>Simulation data could not load. <button type="button" class="quiet simulation-retry">Try again</button></p></details>';node.querySelector('button').onclick=()=>{key=null;show(last);};});
 }
 return{show};
}
