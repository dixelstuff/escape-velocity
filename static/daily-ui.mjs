import {golfResult} from './daily-game.mjs?v=personal-daily-v1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const dateLabel=day=>new Intl.DateTimeFormat('en',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day+'T00:00:00Z'));
export function mountDailyUI(game,{onNavigate,onToday}){
 const root=document.getElementById('personal-scorecard');root.addEventListener('click',e=>{const b=e.target.closest('[data-daily-date]');if(b)onNavigate(b.dataset.dailyDate);});
 document.getElementById('header-today').onclick=onToday;
 function render(){const def=game.selected(),recent=game.recent(),stats=game.stats();if(!def)return;
  document.getElementById('hole-number').textContent='HOLE #'+(game.manifest.holes.findIndex(h=>h.id===def.id)+1);document.getElementById('hole-title').title=dateLabel(def.date);document.getElementById('hole-par').textContent='';
  const index=game.published().findIndex(h=>h.id===def.id);document.getElementById('header-prev-hole').disabled=index<=0;document.getElementById('header-next-hole').disabled=index>=game.published().length-1;document.getElementById('header-today').hidden=def.id===game.latest()?.id;
  root.innerHTML=`<div class="personal-card-heading"><h2>Your recent holes</h2><span>Best scores · Par 5</span></div>${recent.length?`<table><thead><tr><th>Date</th><th>Tee → flag</th><th>Strokes</th><th>Cleverness</th></tr></thead><tbody>${recent.map(h=>`<tr data-daily-date="${h.date}" class="${h.id===def.id?'current-hole':''}"><th><button type="button" data-daily-date="${h.date}">${esc(dateLabel(h.date))}</button></th><td><button type="button" data-daily-date="${h.date}">${esc(h.tee.toUpperCase())} <span>→</span> ${esc(h.flag.toUpperCase())}</button></td><td>${h.bestStrokes?`<strong>${h.bestStrokes.strokes}</strong><small>${esc(golfResult(h.bestStrokes.strokes))}</small>`:'—'}</td><td>${h.bestCleverness?`<strong>${h.bestCleverness.score}<small class="out-of">/100</small></strong>`:'—'}</td></tr>`).join('')}</tbody></table>`:'<p>Your played holes and personal bests will appear here.</p>'}`;
  document.getElementById('personal-stats').innerHTML=`<div class="personal-card-heading"><h2>Your golf</h2><span>${stats.completed} ${stats.completed===1?'hole':'holes'} completed</span></div><dl class="personal-distribution">${Object.entries(stats.counts).map(([name,count])=>`<div><dt>${esc(name)}</dt><dd>${count}</dd></div>`).join('')}</dl>${stats.averageBestCleverness===null?'':`<p class="personal-average">Average best cleverness <strong>${stats.averageBestCleverness}/100</strong></p>`}`;
  document.getElementById('personal-storage-warning').textContent=game.warning;
 }return {render};
}
