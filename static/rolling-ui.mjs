import {holeBest,usedAttempts,endedAttempts,addDays} from './rolling-course.mjs?v=golf-v171';
import {scoreText,resultText} from './course-round.mjs?v=golf-v171';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountRollingUI(rounds,{simulation,onDaily,onPractice,onNext,onSubmit,onView,onLocked}){
 const $=id=>document.getElementById(id);
 document.body.classList.add('rolling-mode');
 const top=document.createElement('section');top.className='rolling-top';top.innerHTML=`<div><span class="eyebrow">ROLLING DAILY NINE · ${simulation?'DATE SIMULATOR':'LOCAL TRIAL'}</span><p id="rolling-date"></p></div><nav><button id="rolling-daily" class="quiet">Daily course</button><button id="rolling-view" class="quiet">Scorecard</button><a href="./">Original game</a></nav>`;

 $('round-scorecard').insertAdjacentHTML('beforebegin','<p id="rolling-practice-label" class="rolling-practice-label" hidden>Practice hole · retired from the daily course. Unlimited attempts.</p>');
 $('round-scorecard').insertAdjacentHTML('afterend',`<section class="rolling-extras"><div class="rolling-practice"><span class="rolling-practice-icon" aria-hidden="true"><svg viewBox="0 0 30 36"><path d="M9 30V5m1 0c6-4 10 5 17 1v13c-7 4-11-5-17-1"/><ellipse cx="10" cy="32" rx="8" ry="2"/></svg></span><div><h2>Practice holes</h2><p>Explore retired holes with unlimited attempts. Your daily score stays unchanged.</p></div><button id="rolling-practice" class="quiet">PLAY PRACTICE HOLE →</button></div><details class="rolling-history"><summary>Your submitted scorecards</summary><div id="rolling-history"></div></details><details class="rolling-admin"><summary>Trial controls · test the daily rollover</summary><p>Simulation has separate progress. It cannot change your real-date trial or the original game. Dates only move forward; reset the simulation to start over.</p><label for="rolling-test-date">Simulated UTC date</label><input id="rolling-test-date" type="date"><div><button id="rolling-test-day" class="quiet">OPEN SIMULATION</button><button id="rolling-next-day" class="quiet">NEXT DAY +1</button><button id="rolling-real-date" class="quiet">REAL UTC DATE</button><button id="rolling-reset-sim" class="quiet">RESET SIMULATION</button><button id="rolling-download" class="quiet">DOWNLOAD TRIAL DATA</button></div><p id="rolling-queue"></p></details><p class="rolling-local-note">Experimental mode · progress and submissions are saved on this browser. Daily rollover: 00:00 UTC. No leaderboard or account connection yet.</p></section>`);
 document.querySelector('.rolling-extras').append(top);
 const dialog=document.createElement('dialog');dialog.id='rolling-lock-dialog';dialog.innerHTML='<h2 id="rolling-lock-title"></h2><p id="rolling-lock-copy"></p><div class="rolling-dialog-actions"><button id="rolling-lock-close" class="quiet">VIEW HOLE</button><button id="rolling-lock-card" class="quiet">SCORECARD</button><button id="rolling-lock-practice">PRACTICE HOLES</button></div>';document.body.append(dialog);
 $('rolling-daily').onclick=onDaily;$('rolling-view').onclick=onView;$('rolling-practice').onclick=onPractice;
 $('rolling-lock-close').onclick=()=>dialog.close();$('rolling-lock-card').onclick=()=>{dialog.close();onView();};$('rolling-lock-practice').onclick=()=>{dialog.close();onPractice();};
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 $('rolling-test-date').value=rounds.day;$('rolling-test-date').min=rounds.manifest.epoch;$('rolling-test-date').max=addDays(rounds.manifest.epoch,rounds.manifest.holes.length-rounds.manifest.initialNewest-1);
 const simulationURL=day=>{location.href=`?mode=rolling&date=${encodeURIComponent(day)}`;};
 $('rolling-test-day').onclick=()=>{const day=$('rolling-test-date').value;if($('rolling-test-date').reportValidity()&&/^\d{4}-\d{2}-\d{2}$/.test(day))simulationURL(day);};
 $('rolling-next-day').onclick=()=>simulationURL(addDays(rounds.day,1));
 $('rolling-real-date').onclick=()=>{location.href='?mode=rolling';};
 $('rolling-reset-sim').onclick=()=>{if(!confirm('Reset simulated progress and submissions? Your real-date progress and original games will stay saved.'))return;for(const key of Object.keys(localStorage))if(key.startsWith('word-golf.rolling-sim.'))localStorage.removeItem(key);simulationURL(rounds.manifest.epoch);};
 $('rolling-download').onclick=()=>document.getElementById('download-log').click();
 $('submit-scorecard').onclick=onSubmit;
 $('round-scorecard').querySelector('thead tr').innerHTML=['Hole','Par','Tee → Flag','Strokes','Attempts'].map(label=>`<th scope="col"><span class="rolling-column-label">${label}</span></th>`).join('');
 const table=$('round-scorecard').querySelector('table'),tableFrame=document.createElement('div');tableFrame.className='rolling-table-frame';table.before(tableFrame);tableFrame.append(table);
 const banner=document.createElement('div');banner.id='rolling-day-banner';tableFrame.before(banner);
 banner.addEventListener('click',e=>{if(!e.target.closest('#rolling-info'))return;dialog.classList.add('rolling-info-dialog');$('rolling-lock-title').textContent='Your daily nine';$('rolling-lock-copy').textContent='A new hole arrives each day, and the oldest retires. Progress carries forward, and you can reattempt submitted holes from earlier days to try and improve your stroke score.\n\nSubmit once a day to compare your score with other players. The course reopens at 00:00 UTC.';$('rolling-lock-close').textContent='GOT IT';$('rolling-lock-card').hidden=true;$('rolling-lock-practice').hidden=true;if(!dialog.open)dialog.showModal();});
 const info=document.createElement('p');info.id='rolling-card-meta';$('round-scorecard').querySelector('.round-card-heading').after(info);
 const heading=$('round-scorecard').querySelector('.round-card-heading'),sheet=document.createElement('div');sheet.className='rolling-sheet';heading.before(sheet);heading.append(info);sheet.append(heading,banner,tableFrame);
 const footer=document.createElement('div');footer.className='rolling-sheet-footer';footer.append($('round-status'),$('submit-scorecard'),$('submit-scorecard-note'));sheet.append(footer);
 function lockMessage(){
  dialog.classList.remove('rolling-info-dialog');
  $('rolling-lock-close').textContent='VIEW HOLE';$('rolling-lock-card').hidden=false;$('rolling-lock-practice').hidden=false;
  const submitted=!!rounds.store.submissions[rounds.day];
  $('rolling-lock-title').textContent=submitted?'Today’s scorecard is submitted':'No scoring attempts remaining';
  $('rolling-lock-copy').textContent=submitted?'Your nine scores are final for today. The daily course unlocks at 00:00 UTC. You can play retired practice holes now.':'Your progress is saved. Return on a later UTC day for +3 attempts on this hole, or explore a retired practice hole now.';
  if(!dialog.open)dialog.showModal();onLocked?.();
 }
 function render(practice=false){
  const r=rounds.current,submission=rounds.store.submissions[rounds.day],par=r.holes.reduce((n,h)=>n+h.settings.par,0),finished=r.holes.filter(h=>holeBest(h)||endedAttempts(h)>=h.allowance).length;
  $('rolling-next-day').disabled=rounds.day>=$('rolling-test-date').max;
  $('rolling-date').textContent=new Date(rounds.day+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  $('rolling-practice-label').hidden=!practice;document.body.classList.toggle('rolling-practising',practice);
  $('round-scorecard').hidden=false;$('round-course-name').textContent=new Date(rounds.day+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  let strokes=0,scoredPar=0;for(const h of r.holes){const best=holeBest(h),posted=best?Math.min(h.settings.par+2,best.state.attempts):endedAttempts(h)>=h.allowance?h.settings.par+2:null;if(posted!==null){strokes+=posted;scoredPar+=h.settings.par;}}
  $('round-running-score').hidden=!submission&&!finished;
  $('round-running-score').innerHTML=`<span>Total</span> <b>${submission?submission.total:finished?strokes:'—'}</b> ${submission||finished?`<em>(${scoreText(submission?submission.total-par:strokes-scoredPar)})</em>`:''}`;
  $('rolling-card-meta').textContent=`9 HOLES · PAR ${par}${submission?' · SUBMITTED':''}`;
  const bonus=rounds.store.bonus??[];
  $('rolling-day-banner').innerHTML=`<svg class="rolling-calendar" viewBox="0 0 32 34" aria-hidden="true"><rect x="4" y="7" width="24" height="24" rx="3"/><path d="M4 15h24M11 3v9M22 3v9"/><circle cx="22" cy="24" r="2"/></svg><div><strong>${submission?'Scorecard submitted for today':'New hole today'}</strong><p>${submission?'Your scores unlock tomorrow at 00:00 UTC.':bonus.length?`Previously played holes have <b>+3 attempts</b>`:'Previously played holes receive <b>+3 attempts</b> when you return'}</p></div><button id="rolling-info" type="button" aria-label="About the rolling course"><svg viewBox="0 0 26 26" aria-hidden="true"><circle cx="13" cy="13" r="10"/><path d="M13 12v7M13 7v1"/></svg></button>`;
  $('round-rows').innerHTML=r.holes.map((h,i)=>{
   const best=holeBest(h),posted=submission?.rows[i],score=posted?.strokes??(best?Math.min(h.settings.par+2,best.state.attempts):endedAttempts(h)>=h.allowance?h.settings.par+2:null),outcome=score===null?'No score yet':resultText(score-h.settings.par);
   return `<tr data-course-row="${i}" class="${i===0?'rolling-new':i===8?'rolling-retiring':''} ${!practice&&i===r.index?'current-hole':''}"><td><button type="button" data-course-hole="${i}" aria-label="View hole ${i+1}">${i+1}${i===0?'<span class="rolling-badge">NEW</span>':i===8?'<span class="rolling-badge retiring">LAST DAY</span>':''}</button></td><td class="rolling-par">${h.settings.par}</td><th scope="row"><button type="button" data-course-hole="${i}" aria-label="View hole ${i+1}: ${esc(h.settings.start)} to ${esc(h.settings.target)}">${esc(h.settings.start)} <span>→</span> ${esc(h.settings.target)}</button></th><td><strong class="course-hole-score ${score===null?'unplayed':score<h.settings.par?'under-par':''}">${score??'—'}</strong><span class="course-score-label">${outcome}</span></td><td class="rolling-attempts"><span>${usedAttempts(h)}/${h.allowance}</span>${h.lastBonus===rounds.day?'<span class="rolling-bonus">+3 today</span>':''}<span class="rolling-row-arrow" aria-hidden="true">›</span></td></tr>`;
  }).join('');
  $('round-status').textContent=rounds.warning||(submission?'Submitted · all nine competitive holes are locked until 00:00 UTC.':'Submit to compare yourself with other players. Any unfinished holes receive double bogey. Progress carries forward and holes unlock again tomorrow.');
  $('submit-scorecard').hidden=!!submission;$('submit-scorecard').disabled=false;$('submit-scorecard-note').hidden=true;
  $('rolling-history').innerHTML=Object.values(rounds.store.submissions).reverse().map(s=>`<p><strong>${s.date}</strong><span>${s.total} strokes (${scoreText(s.total-s.par)})</span></p>`).join('')||'<p>No submitted scorecards yet.</p>';
  $('rolling-queue').textContent=`${rounds.retired().length} retired holes available. Trial queue runs through ${addDays(rounds.manifest.epoch,rounds.manifest.holes.length-rounds.manifest.initialNewest-1)}.`;
 }
 return {render,lockMessage};
}
