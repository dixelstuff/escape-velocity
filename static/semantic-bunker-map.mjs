import {bunkerActive} from './semantic-bunker.mjs?v=bunker-two-legs-v1';
import {waypointBunkers} from './waypoint-map.mjs?v=strong-arrival-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function semanticBunkerPosition(d,stage=0){const b=waypointBunkers(d,d.style)[stage===1?1:0];return {x:b.x*d.width,y:d.reflectY?430-b.y:b.y};}
/** Keep the label just outside the sand: inner rough first, behind the green second. */
export function semanticBunkerLabel(d,word,stage=0){
 const p=semanticBunkerPosition(d,stage),width=Math.max(42,word.length*8.7+18),direction=d.reflectY?-1:1;
 const x=p.x+d.width*(stage===1?-.035:.035),y=p.y+direction*(stage===1?-45:45);
 return {point:p,x,y,width,height:26,lineEnd:{x,y:y-direction*(stage===1?-13:13)}};
}
export function semanticBunkerArt(state,d){
 if(!bunkerActive(state.semantic_bunker,state.stage))return '';
 const word=state.semantic_bunker.word.toUpperCase(),box=semanticBunkerLabel(d,word,state.stage),p=box.point,angle=-(d.style?.rotation??0);
 return `<g class="semantic-bunker-label" data-semantic-bunker="${esc(word)}" data-bunker-stage="${state.stage}" aria-label="${state.stage===1?'Greenside':'Dogleg'} bunker: ${esc(word)}"><path data-bunker-leader d="M${p.x} ${p.y} L${box.lineEnd.x} ${box.lineEnd.y}" fill="none" stroke="#8ba17e" stroke-width="1"/><circle data-bunker-dot cx="${p.x}" cy="${p.y}" r="4.8" fill="#f6db75" stroke="#938047" stroke-width="1.8"/><g transform="translate(${box.x} ${box.y}) rotate(${angle})"><rect x="${-box.width/2}" y="-13" width="${box.width}" height="26" rx="4" fill="#f6db75" stroke="#b89b43" stroke-width="1"/><text y="1" text-anchor="middle" dominant-baseline="central" fill="#53451e" font-family="Arial,sans-serif" font-size="15" font-weight="600">${esc(word)}</text></g></g>`;
}
