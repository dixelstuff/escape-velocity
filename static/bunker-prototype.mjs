import {bunkerExperimentSettings,DEFAULT_BUNKER_THRESHOLD} from './semantic-bunker.mjs?v=bunker-two-legs-v1';

/** Admin-only controls. Applying settings opens a separate, durable test hole. */
export function mountBunkerPrototype({parent,getSource,getCurrent,onTest,onExample,examples=[],isBusy}){
 const panel=document.createElement('details');panel.id='bunker-prototype';
 panel.innerHTML=`<summary>Semantic bunker experiment</summary>${examples.length?`<div class="bunker-examples"><label for="bunker-example-picker">Five example holes · similarity 0.40</label><select id="bunker-example-picker">${examples.map((e,i)=>`<option value="${i}">${e.number}. ${e.source.settings.start.toUpperCase()} → ${e.source.settings.waypoint.word.toUpperCase()} → ${e.source.settings.target.toUpperCase()} · ${e.settings.semantic_bunker.word.toUpperCase()} bunker</option>`).join('')}</select><button type="button" data-example>Play example</button></div>`:''}<p class="bunker-source"></p><form novalidate>
 <label class="bunker-check"><input name="enabled" type="checkbox" checked> Enable bunker word</label>
 <label>Bunker word<input name="word" placeholder="e.g. love" autocomplete="off" autocapitalize="none" spellcheck="false" maxlength="40"></label>
 <label class="bunker-check"><input name="exact" type="checkbox" checked> Exact match only</label>
 <label>GloVe similarity threshold<input name="threshold" type="number" min="0" max="1" step="0.01" value="${DEFAULT_BUNKER_THRESHOLD}" disabled></label>
 <p class="subtle">Higher thresholds catch fewer words. Start at 0.85 for exceptionally close neighbours. Applies on both legs; the bunker marker moves greenside after the dogleg.</p>
 <div class="bunker-test-actions"><button type="submit">Test this setting</button><button type="button" class="quiet" data-control>Compare without bunker</button><button type="button" class="quiet" data-original>Return to original</button></div>
 <p class="bunker-status" role="status" aria-live="polite"></p></form><p class="subtle">Test results are separate from the original hole and your overall stats. Each configuration keeps its own progress.</p>`;
 parent.append(panel);
 const form=panel.querySelector('form'),field=name=>form.elements.namedItem(name),status=panel.querySelector('.bunker-status');
 const sourceText=panel.querySelector('.bunker-source'),buttons=[...panel.querySelectorAll('button')];
 function controls(){const enabled=field('enabled').checked;field('word').disabled=!enabled;field('exact').disabled=!enabled;field('threshold').disabled=!enabled||field('exact').checked;}
 field('enabled').onchange=field('exact').onchange=controls;
 async function run(mode){
  if(isBusy()||buttons[0].disabled)return;const example=mode==='example'?examples[Number(panel.querySelector('#bunker-example-picker').value)]:null,source=example?.source??getSource();if(!source)return;
  if(example){const b=example.settings.semantic_bunker;field('enabled').checked=true;field('word').value=b.word;field('threshold').value=b.threshold;field('exact').checked=b.exact_only;controls();}
  const enabled=(mode==='test'||mode==='example')&&field('enabled').checked,threshold=Number(field('threshold').value);
  if(enabled&&(!field('word').value.trim()||field('threshold').value===''||!Number.isFinite(threshold)||threshold<0||threshold>1)){status.textContent='Choose a bunker word and a threshold between 0 and 1.';return;}
  buttons.forEach(b=>b.disabled=true);status.textContent='Opening test…';
  try{if(example)await onExample(example);else await onTest(source,mode==='original'?null:bunkerExperimentSettings(source,enabled,field('word').value,threshold,field('exact').checked));refresh();status.textContent=mode==='original'?'Original hole restored. Its saved results are unchanged.':enabled?'Bunker test ready.':'Control test ready: no bunker.';}
  catch(error){status.textContent=error.message;}
  finally{buttons.forEach(b=>b.disabled=false);}
 }
 if(examples.length)panel.querySelector('[data-example]').onclick=()=>void run('example');
 form.onsubmit=e=>{e.preventDefault();void run('test');};
 panel.querySelector('[data-control]').onclick=()=>void run('control');
 panel.querySelector('[data-original]').onclick=()=>void run('original');
 let lastSelection=null;
 function refresh(){
  const source=getSource();sourceText.textContent=source?`${source.settings.start.toUpperCase()} → ${source.settings.waypoint.word.toUpperCase()} → ${source.settings.target.toUpperCase()}`:'Select a dogleg hole first.';
  if(getCurrent?.()?.settings.semantic_bunker?.version==='semantic-bunker-v1')sourceText.textContent+=' · Earlier first-leg-only test. Use Test this setting to try both legs.';
  const current=getCurrent?.();if(current?.id===lastSelection)return;lastSelection=current?.id;
  if(current?.settings.semantic_bunker){const b=current.settings.semantic_bunker;field('enabled').checked=true;field('word').value=b.word;field('threshold').value=b.threshold;field('exact').checked=b.exact_only;controls();}
  else if(current?.settings.bunker_experiment){field('enabled').checked=false;controls();}
 }
 panel.addEventListener('toggle',refresh);refresh();
 return {refresh,hit:event=>{if(event.bunker)status.textContent=`${event.word.toUpperCase()} caught by ${event.bunker.word.toUpperCase()}: GloVe similarity ${event.bunker.similarity.toFixed(6)} (${event.bunker.exact?'exact spelling or equivalent':`threshold ${event.bunker.threshold}`}).`;}};
}
