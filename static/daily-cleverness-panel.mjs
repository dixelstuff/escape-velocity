import {BAND_FREE_VERSION} from './cleverness-score-config.mjs?v=cubic-results-v1';
import {playtestKey,PLAYTEST_VERSION} from './cleverness-playtest-data.mjs?v=cubic-results-v1';
export function mountDailyCleverness(node,{request,modelHash,onReport,getSavedReport}){
 let active=null;const pending=new Map(),cache=new Map();
 function draw(r){node.hidden=true;node.innerHTML=`<p class="daily-cleverness-score">Cleverness <strong>${r.band_free.score}<span>/100</span></strong></p>`;}
 function show(state,{visible=true}={}){if(!visible||!state?.won){node.hidden=true;active=null;return;}node.hidden=true;const key=playtestKey(state,modelHash(state));if(active===key)return;active=key;const saved=cache.get(key)??getSavedReport?.(key);if(saved?.key===key&&saved.band_free?.version===BAND_FREE_VERSION){cache.set(key,saved);draw(saved);return;}
 node.innerHTML='';
 if(!pending.has(key)){const task=Promise.resolve().then(()=>request(structuredClone(state))).then(r=>{if(r.key!==key||r.version!==PLAYTEST_VERSION||r.band_free?.version!==BAND_FREE_VERSION)throw Error('Cleverness report does not match this route.');cache.set(key,r);onReport(state,r);return r;}).finally(()=>pending.delete(key));pending.set(key,task);}
 pending.get(key).then(r=>{if(active===key)draw(r);}).catch(error=>{if(active!==key)return;node.hidden=false;node.innerHTML='<p>Cleverness could not load. <button type="button" class="quiet daily-analysis-retry">Try again</button></p>';node.querySelector('button').onclick=()=>{active=null;show(state);};node.querySelector('p').title=error.message;});
 }return {show};
}
