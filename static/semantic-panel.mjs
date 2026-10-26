/** Result-card presentation only; asynchronous responses never touch game state. */
import {semanticRouteKey,SEMANTIC_VERSION} from './semantic-analysis.mjs?v=golf-v179';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const semanticPercent=value=>value===null||value===undefined?'—':`${(100*value).toFixed(1).replace(/\.0$/,'')}%`;
const number=v=>Number(v).toFixed(3);
export function semanticSummary(report){
 const lines=[['Best bridge distinctiveness',report?.best_distinctiveness],['Best neighbourhood separation',report?.best_separation]];
 if(report?.dogleg)lines.push(['Dogleg distinctiveness',report.dogleg.available?{word:report.dogleg.word,value:report.dogleg.distinctiveness.value}:null]);
 return lines.map(([label,result])=>`<div><dt>${label}</dt><dd><b>${result?semanticPercent(result.value):'—'}</b>${result?` <span>— ${esc(result.word.toUpperCase())}</span>`:''}</dd></div>`).join('');
}
function individualMarkup(report){
 const dogleg=report.dogleg;
 return `<p class="semantic-route">${report.route.map(w=>esc(w.toUpperCase())).join(' → ')}</p><p class="semantic-explanation">Each played word is compared between its previous and next words. The fixed tee and flag are excluded. Neighbourhoods use up to 100 nearest words.</p><p class="semantic-same">Same word led both measures: <strong>${report.same_best_word?'Yes':'No'}</strong>${report.same_best_word?` — ${esc(report.best_distinctiveness.word.toUpperCase())}${report.same_best_position?'':' (different visits)'}`:''}.</p><ol class="semantic-words">${report.bridges.map((b,i)=>`<li><h4>${esc(b.word.toUpperCase())}${b.dogleg?' <span>Dogleg landing</span>':''}</h4><p class="semantic-context">${esc(b.predecessor.toUpperCase())} → <strong>${esc(b.word.toUpperCase())}</strong> → ${esc(b.successor.toUpperCase())}</p><dl><div><dt>Distinctiveness</dt><dd>${semanticPercent(b.distinctiveness.value)}</dd></div><div><dt>Separation</dt><dd>${semanticPercent(b.separation.value)}</dd></div></dl><p class="semantic-diagnostics">${b.distinctiveness.lower}/${b.distinctiveness.count} neighbours had a lower weakest-link score; ${b.distinctiveness.tied} tied. Chosen Q: ${number(b.quality)}.<br>A-side affinity: ${number(b.separation.left_affinity)} · shared: ${number(b.separation.shared_affinity)} · C-side: ${number(b.separation.right_affinity)}.<br>Split balance: ${semanticPercent(b.separation.balance)} · non-overlap: ${semanticPercent(b.separation.nonoverlap)} · mean positive affinity: ${number(b.separation.mean_positive_affinity)}.</p><details data-semantic-neighbours="${i}"><summary>Inspect ${b.neighbours.length} neighbours</summary><div class="semantic-neighbour-data"></div></details></li>`).join('')}</ol>${dogleg?dogleg.available?`<div class="semantic-dogleg"><h4>Dogleg comparison — ${esc(dogleg.word.toUpperCase())}</h4><p>${dogleg.distinctiveness.lower}/${dogleg.distinctiveness.count} legal alternative landing words had lower Q; ${dogleg.distinctiveness.tied} tied. Alternatives must reach ${esc(dogleg.waypoint.toUpperCase())} from this route’s incoming lie, using the existing shot and word-form rules. This is separate from the 100-neighbour comparison.</p>${dogleg.scoring_word!==dogleg.word?`<p>The game credited ${esc(dogleg.scoring_word.toUpperCase())} for this landing; semantic Q uses the word you typed.</p>`:''}<details><summary>Inspect strongest alternative bridges</summary><div class="semantic-table-scroll"><table><thead><tr><th>Word</th><th>Incoming</th><th>Outgoing</th><th>Q</th></tr></thead><tbody>${dogleg.alternatives.slice(0,12).map(a=>`<tr><th>${esc(a.word.toUpperCase())}${a.word!==a.scoring_word?`<small>credited ${esc(a.scoring_word.toUpperCase())}</small>`:''}</th><td>${number(a.incoming)}</td><td>${number(a.outgoing)}</td><td>${number(a.quality)}</td></tr>`).join('')}</tbody></table></div><p>Showing up to 12 by Q. Download includes every legal alternative.</p></details></div>`:`<p class="semantic-explanation">Dogleg analysis unavailable: ${esc(dogleg.reason)}</p>`:''}<details class="semantic-formulas"><summary>How these measures work</summary><p>Distinctiveness is the proportion of neighbours with a strictly lower Q = min(incoming similarity, outgoing similarity). Ties receive no credit.</p><p>Separation uses continuous positive affinities to the two sides. It multiplies a balanced two-sided split by the proportion of affinity not shared by both sides. A one-sided or entirely shared neighbourhood scores zero. This describes a pattern, not the quality of the route.</p><p>High separation can also occur with weak affinities. Inspect the raw affinity values above. These scales are experimental and are not calibrated to human judgement.</p></details><button type="button" class="semantic-download">DOWNLOAD ANALYSIS</button>`;
}
export function mountSemanticPanel(node,{request,modelHash=()=>'',download=(report)=>{const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)+'\n'],{type:'application/json'}));a.href=url;a.download='word-golf-semantic-analysis.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}){
 const cache=new Map(),pending=new Map();let activeKey=null,activeReport=null,renderedKey=null,source,activeCaption='';
 node.innerHTML='<h3 class="scorecard-label">SEMANTIC ANALYSIS</h3><p class="semantic-source"></p><dl class="semantic-summary"></dl><p class="semantic-status" role="status" aria-live="polite"></p><p class="semantic-caveat">Experimental vector measures, not player percentiles.</p><details class="semantic-individual" hidden><summary>Inspect individual word scores</summary><div class="semantic-individual-content"></div></details><button class="semantic-retry" type="button" hidden>RETRY ANALYSIS</button>';
 const $=selector=>node.querySelector(selector),details=$('.semantic-individual');
 function draw(report,key){
  if(activeKey!==key)return;activeReport=report;$('.semantic-source').textContent=activeCaption;$('.semantic-summary').innerHTML=semanticSummary(report);$('.semantic-status').textContent=report.bridges.length?'':'No intermediate player-chosen words to analyse.';$('.semantic-retry').hidden=true;details.hidden=!report.bridges.length;
  if(renderedKey!==key){details.open=false;$('.semantic-individual-content').innerHTML=individualMarkup(report);renderedKey=key;}
 }
 function load(saved,key){
  if(pending.has(key))return;
  $('.semantic-source').textContent=activeCaption+' · calculating…';
  $('.semantic-status').textContent='Calculating with the complete word model…';$('.semantic-retry').hidden=true;
  const job=Promise.resolve().then(()=>request(saved)).then(report=>{
   if(report.version!==SEMANTIC_VERSION||report.key!==semanticRouteKey(saved))throw Error('This analysis belongs to a different route.');
   report={...report,model_sha:modelHash(saved)};if(cache.size>=40)cache.delete(cache.keys().next().value);cache.set(key,report);draw(report,key);
  }).catch(error=>{if(activeKey!==key)return;$('.semantic-source').textContent=activeCaption;$('.semantic-status').textContent='Analysis unavailable. You can keep playing and retry it later.';$('.semantic-retry').hidden=false;}).finally(()=>pending.delete(key));pending.set(key,job);
 }
 function show(saved,{visible=true,caption='This completed route'}={}){
  if(!visible||!saved?.won){activeKey=null;activeReport=null;node.hidden=true;return;}
  node.hidden=false;source=saved;activeCaption=caption;$('.semantic-source').textContent=caption;
  const key=JSON.stringify([modelHash(saved),semanticRouteKey(saved)]);
  if(activeKey===key){if(pending.has(key))$('.semantic-source').textContent=activeCaption+' · calculating…';return;}activeKey=key;activeReport=null;details.hidden=true;details.open=false;
  $('.semantic-summary').innerHTML=semanticSummary({dogleg:saved.waypoint?{}:null});
  if(cache.has(key))draw(cache.get(key),key);else load(saved,key);
 }
 node.addEventListener('toggle',event=>{
  const target=event.target;if(!target.open||!target.matches('[data-semantic-neighbours]')||!activeReport)return;
  const box=target.querySelector('.semantic-neighbour-data');if(box.hasChildNodes())return;
  const bridge=activeReport.bridges[Number(target.dataset.semanticNeighbours)];
  box.innerHTML=`<div class="semantic-table-scroll"><table><thead><tr><th>Word</th><th>To bridge</th><th>Incoming</th><th>Outgoing</th><th>Q</th></tr></thead><tbody>${bridge.neighbours.map(n=>`<tr><th>${esc(n.word.toUpperCase())}</th><td>${number(n.similarity)}</td><td>${number(n.incoming)}</td><td>${number(n.outgoing)}</td><td>${number(n.quality)}</td></tr>`).join('')}</tbody></table></div>`;
 },true);
 node.addEventListener('click',event=>{if(event.target.closest('.semantic-download')&&activeReport)download(activeReport);if(event.target.closest('.semantic-retry')&&source&&activeKey)load(source,activeKey);});
 return {show};
}
