import {bunkerExperimentSettings,DEFAULT_BUNKER_THRESHOLD} from './semantic-bunker.mjs?v=semantic-bunker-v1';

/** Admin-only controls. Applying settings opens a separate, durable test hole. */
export function mountBunkerPrototype({parent,getSource,getCurrent,onTest,isBusy}){
 const panel=document.createElement('details');panel.id='bunker-prototype';
 panel.innerHTML=`<summary>Semantic bunker experiment</summary><p class="bunker-source"></p><form novalidate>
 <label class="bunker-check"><input name="enabled" type="checkbox" checked> Enable bunker word</label>
 <label>Bunker word<input name="word" placeholder="e.g. love" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40"></label>
 <label class="bunker-check"><input name="exact" type="checkbox" checked> Exact match only</label>
 <label>GloVe similarity threshold<input name="threshold" type="number" min="0" max="1" step="0.01" value="${DEFAULT_BUNKER_THRESHOLD}" disabled></label>
 <p class="subtle">Higher thresholds catch fewer words. Start at 0.85 for exceptionally close neighbours. Applies only before the dogleg.</p>
 <div class="bunker-test-actions"><button type="submit">Test this setting</button><button type="button" class="quiet" data-control>Compare without bunker</button><button type="button" class="quiet" data-original>Return to original</button></div>
 <p class="bunker-status" role="status" aria-live="polite"></p></form><p class="subtle">Test results are separate from the original hole and your overall stats. Each configuration keeps its own progress.</p>`;
 parent.append(panel);
 const form=panel.querySelector('form'),field=name=>form.elements.namedItem(name),status=panel.querySelector('.bunker-status');
 const sourceText=panel.querySelector('.bunker-source'),buttons=[...panel.querySelectorAll('button')];
 function controls(){const enabled=field('enabled').checked;field('word').disabled=!enabled;field('exact').disabled=!enabled;field('threshold').disabled=!enabled||field('exact').checked;}
 field('enabled').onchange=field('exact').onchange=controls;
 async function run(mode){
  if(isBusy()||buttons[0].disabled)return;const source=getSource();if(!source)return;
  const enabled=mode==='test'&&field('enabled').checked,threshold=Number(field('threshold').value);
  if(enabled&&(!field('word').value.trim()||field('threshold').value===''||!Number.isFinite(threshold)||threshold<0||threshold>1)){status.textContent='Choose a bunker word and a threshold between 0 and 1.';return;}
  buttons.forEach(b=>b.disabled=true);status.textContent='Opening test…';
  try{await onTest(source,mode==='original'?null:bunkerExperimentSettings(source,enabled,field('word').value,threshold,field('exact').checked));status.textContent=mode==='original'?'Original hole restored. Its saved results are unchanged.':enabled?'Bunker test ready.':'Control test ready: no bunker.';}
  catch(error){status.textContent=error.message;}
  finally{buttons.forEach(b=>b.disabled=false);}
 }
 form.onsubmit=e=>{e.preventDefault();void run('test');};
 panel.querySelector('[data-control]').onclick=()=>void run('control');
 panel.querySelector('[data-original]').onclick=()=>void run('original');
 function refresh(){const source=getSource();sourceText.textContent=source?`${source.settings.start.toUpperCase()} → ${source.settings.waypoint.word.toUpperCase()} → ${source.settings.target.toUpperCase()}`:'Select a dogleg hole first.';}
 const current=getCurrent?.()?.settings;
 if(current?.semantic_bunker){const b=current.semantic_bunker;field('word').value=b.word;field('threshold').value=b.threshold;field('exact').checked=b.exact_only;controls();}
 else if(current?.bunker_experiment){field('enabled').checked=false;controls();}
 panel.addEventListener('toggle',refresh);refresh();
 return {refresh,hit:event=>{if(event.bunker)status.textContent=`${event.word.toUpperCase()} caught by ${event.bunker.word.toUpperCase()}: GloVe similarity ${event.bunker.similarity.toFixed(6)} (${event.bunker.exact?'exact spelling or equivalent':`threshold ${event.bunker.threshold}`}).`;}};
}
