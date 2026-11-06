import {waypointBunkers} from './waypoint-map.mjs?v=strong-arrival-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function semanticBunkerPosition(d){const b=waypointBunkers(d,d.style)[0];return {x:b.x*d.width,y:d.reflectY?430-b.y:b.y};}
export function semanticBunkerArt(state,d,event){
 if(!state.semantic_bunker||state.stage!==0)return '';
 const p=semanticBunkerPosition(d),word=state.semantic_bunker.word.toUpperCase(),width=Math.max(42,word.length*8.7+18),angle=-(d.style?.rotation??0);
 return `<g class="semantic-bunker-label" data-semantic-bunker="${esc(word)}" aria-label="First-leg bunker: ${esc(word)}" transform="translate(${p.x} ${p.y}) rotate(${angle})">${event?.bunker?'<ellipse data-bunker-hit="true" rx="38" ry="25" fill="#f7d668" fill-opacity=".35" stroke="#b48a24" stroke-width="2"/>':''}<rect x="${-width/2}" y="-13" width="${width}" height="26" rx="4" fill="#f6db75" stroke="#b89b43" stroke-width="1"/><text y="1" text-anchor="middle" dominant-baseline="central" fill="#53451e" font-family="Arial,sans-serif" font-size="15" font-weight="600">${esc(word)}</text></g>`;
}
