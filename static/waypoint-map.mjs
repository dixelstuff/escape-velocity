import {mapFraction} from './map.mjs?v=golf-v75';
/** Fixed anchors and per-event leg coordinates keep earlier shots still at the turn. */
export function waypointAnchors(d){return {tee:{x:d.left,y:280},bend:{x:d.width*.48,y:130},flag:{x:d.right,y:d.holeY}};}
function along(a,b,f,offset=0){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),t=Math.max(-.08,Math.min(1,f));return {x:a.x+dx*t-dy/len*offset*Math.sin(Math.PI*t),y:a.y+dy*t+dx/len*offset*Math.sin(Math.PI*t)};}
export function waypointPosition(state,word,d,event=null){
 const a=waypointAnchors(d);
 if(word===state.start)return a.tee;
 if(word===state.final_target)return a.flag;
 const h=state.history.find(h=>h.word===word&&h.success)??event??state.history.find(h=>h.word===word);
 if(!h)return a.bend;
 const entry=state.history.find(h=>h.waypoint_reached);
 const start=h.stage===1&&entry?waypointPosition({...state,history:state.history.slice(0,state.history.indexOf(entry)+1)},entry.word,d,entry):a.tee;
 const goal=h.stage===1?a.flag:a.bend;
 const fraction=mapFraction(h.destination,h.leg_baseline??state.baseline,h.leg_threshold??state.threshold,.88);
 return along(start,goal,fraction,[-24,26,-36,34,-12,14][(h.attempt-1)%6]);
}
export function waypointLandscape(state,d){
 const w=d.width,a=waypointAnchors(d),bx=a.bend.x;
 const outline=`M0 212 C${w*.15} 208 ${w*.27} 93 ${bx-55} 77 Q${bx} 51 ${bx+62} 85 C${w*.65} 114 ${w*.72} 40 ${w*.86} 48 Q${w*.98} 56 ${w} 98 L${w} 374 Q${w*.84} 418 ${w*.74} 330 C${w*.65} 260 ${bx+60} 205 ${bx+5} 193 C${w*.3} 197 ${w*.2} 390 0 400 Z`;
 return `<rect width="${w}" height="430" fill="#c4d3a7"/><defs><clipPath id="waypoint-fairway"><path d="${outline}"/></clipPath></defs><path d="${outline}" fill="url(#fairway-mown)"/><path d="M0 388 Q${w*.18} 325 ${w*.31} 373 Q${w*.38} 404 ${w*.42} 430 H0Z" fill="#8fb9c1" stroke="#72a5ae" stroke-width="2"/><path d="M0 400 Q${w*.17} 344 ${w*.29} 385" fill="none" stroke="#b9d4d4" opacity=".7"/><path d="M${bx+25} 218 C${bx+60} 192 ${bx+125} 225 ${bx+108} 249 C${bx+93} 270 ${bx+40} 254 ${bx+25} 238Z" fill="#e8d6a5" stroke="#b6bf8d" stroke-width="6"/><path d="M${a.tee.x} ${a.tee.y} Q${bx-35} 100 ${bx} 130 T${a.flag.x} ${a.flag.y}" fill="none" stroke="#a1b78e" stroke-width="1.3" stroke-dasharray="3 8"/>`;
}
export function waypointZone(state,d){
 if(state.stage!==0)return '';
 const {bend}=waypointAnchors(d);
 return `<g id="waypoint-zone"><ellipse cx="${bend.x}" cy="${bend.y}" rx="${d.width*.073}" ry="49" fill="#a9c981" fill-opacity=".5" stroke="#77985c" stroke-width="1.8" stroke-dasharray="5 5"/><text x="${bend.x}" y="${bend.y-59}" text-anchor="middle" class="waypoint-zone-caption">LAND HERE FIRST</text></g>`;
}
export function waypointChipGuide(state,d,range){
 if(state.stage===0||!range)return '';
 const a=waypointAnchors(d),entry=state.history.find(h=>h.waypoint_reached);
 if(!entry)return '';
 const start=waypointPosition(state,entry.word,d),length=Math.hypot(a.flag.x-start.x,a.flag.y-start.y);
 const radius=p=>Math.max(5,length*(1-mapFraction(p,state.baseline,state.threshold,.88)));
 const outer=radius(range.first),inner=radius(range.last),steps=12;
 return `<g id="chip-range-shading" clip-path="url(#waypoint-fairway)" pointer-events="none">${Array.from({length:steps},(_,i)=>{const r=outer+(inner-outer)*(i+.5)/steps;return `<circle cx="${a.flag.x}" cy="${a.flag.y}" r="${r}" fill="none" stroke="#b94b46" stroke-width="${Math.max(.7,Math.abs(outer-inner)/steps+.15)}" opacity="${.06+.72*((i+1)/steps)**1.7}"/>`;}).join('')}</g>`;
}
