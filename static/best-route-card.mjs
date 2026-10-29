import {featuredRoutes} from './best-route-selection.mjs?v=best-route-v1';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function bestRouteCard(hole){
 const routes=featuredRoutes(hole);
 return {title:routes.length>1?'Your best routes':'Your best route',html:routes.map(({best},i)=>`<li class="bag-route">${routes.length>1?`<h3>${i?'Higher Cleverness':'Fewest strokes'}</h3>`:''}<p class="best-route-words">${esc(best.route.map(w=>w.toUpperCase()).join(' → '))}</p><p class="subtle">${best.strokes} strokes${best.score!==undefined?' · Cleverness '+best.score+'/100':''}</p></li>`).join('')};
}
