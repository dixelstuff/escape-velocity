import {mapFraction} from './map.mjs?v=golf-v80';
import {greenPoints,lakeGeometry,shoreY} from './course-appearance.mjs?v=golf-v80';
import {courseLake,courseBunkers} from './course-art.mjs?v=golf-v80';
/** Longer holes use a smaller visual scale; semantic distances and text sizes stay unchanged. */
export function waypointLayout(base,state,placement={depth:.6,vertical:.5}){
 const turn=state.waypoint.turn??'up',mirror=turn==='down';
 const d={...base,artScale:.8,reflectY:mirror,waypointTurn:turn};
 const centre=mirror?146:284,height=184;
 d.teeY=mirror?158:272;d.bendY=mirror?302:128;
 d.zoneLeft=d.greenCentre-base.radius*.88;d.zoneRight=d.greenCentre+base.radius*.88;
 d.zoneLeft+=(d.zoneRight-d.zoneLeft)*.12;d.greenCentre=(d.zoneLeft+d.zoneRight)/2;
 d.greenTop=centre-height/2;d.greenBottom=centre+height/2;
 d.right=d.zoneLeft+placement.depth*(d.zoneRight-d.zoneLeft);
 d.holeY=centre+(placement.vertical-.5)*height*.65;
 d.axisLength=Math.hypot(d.right-d.left,d.holeY-d.teeY);d.axisRight=d.left+d.axisLength;
 d.axisX=(d.right-d.left)/d.axisLength;d.axisY=(d.holeY-d.teeY)/d.axisLength;
 d.greenNotch={x:d.greenCentre,width:d.width<700?27:38,depth:24,edge:mirror?'bottom':'top'};
 d.greenOutline=greenPoints(d);return d;
}
export function waypointAnchors(d){return {tee:{x:d.left,y:d.waypointTurn?d.teeY:280},bend:{x:d.width*.48,y:d.bendY??130},flag:{x:d.right,y:d.holeY}};}
function along(a,b,f,offset=0){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),t=Math.max(-.08,Math.min(1,f));return {x:a.x+dx*t-dy/len*offset*Math.sin(Math.PI*t),y:a.y+dy*t+dx/len*offset*Math.sin(Math.PI*t)};}
/** Store each shot in its own leg, so switching target does not move earlier labels. */
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
function reflection(d){return d.reflectY?'translate(0 430) scale(1 -1)':'';}
export function waypointLake(d,style){
 const canonical=lakeGeometry({...d,zoneLeft:d.width*.51},{...style,lakeY:390,wave:35});
 if(!d.reflectY)return canonical;
 return {...canonical,outline:canonical.outline.map(p=>({...p,y:430-p.y})),obstacles:canonical.obstacles.map(o=>({...o,y:430-o.y-o.height}))};
}
/** Smoothly merge the tee-side cut into the lake bank instead of intersecting two edges. */
export function waypointBankY(d,style,x){
 const w=d.width,cubic=(a,b,c,e,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*e;
 let lo=0,hi=1;
 for(let i=0;i<26;i++){const t=(lo+hi)/2;if(cubic(w*.48,w*.32,w*.20,-30,t)>x)lo=t;else hi=t;}
 const original=cubic(191,183,375,387,(lo+hi)/2);
 const bank=shoreY(x,{...d,zoneLeft:w*.51},{...style,lakeY:390,wave:35})-18;
 return (original+bank-Math.hypot(original-bank,24))/2;
}
export function waypointLandscape(state,d,style={phase:0}){
 const w=d.width,a=waypointAnchors(d),bx=a.bend.x,transform=reflection(d);
 const back=d.zoneRight+8;
 const bank=x=>waypointBankY(d,style,x),slope=x=>(bank(x+.15)-bank(x-.15))/.3;
 const points=Array.from({length:33},(_,i)=>({x:bx-(bx+30)*i/32,y:bank(bx-(bx+30)*i/32)}));
 let lower='';for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],step=(b.x-a.x)/3;lower+=` C${a.x+step} ${a.y+step*slope(a.x)} ${b.x-step} ${b.y-step*slope(b.x)} ${b.x} ${b.y}`;}
 const outline=`M-30 222 C${w*.15} 218 ${w*.26} 113 ${bx-62} 82 C${bx-20} 61 ${bx+25} 65 ${bx+66} 100 C${w*.65} 168 ${w*.69} 181 ${w*.79} 181 C${w*.89} 166 ${back-12} 190 ${back} 224 C${back+7} 266 ${back+7} 336 ${back-6} 378 C${w*.89} 409 ${w*.80} 401 ${w*.74} 348 C${w*.65} 272 ${bx+46} ${bank(bx)+46*slope(bx)} ${bx} ${bank(bx)}${lower} Z`;
 const sandStyle={...style,bunkers:[
  {x:.425,y:211,rx:w<700?32:44,ry:20,angle:-19,shape:2},
  {x:d.greenCentre/w,y:184,rx:w<700?27:38,ry:18,angle:-9,shape:2}
 ]};
 const lakeD={...d,zoneLeft:w*.51},lakeStyle={...style,lakeY:390,wave:35},lake=lakeGeometry(lakeD,lakeStyle);
 const bend=a.bend;
 // Both cubic segments share a horizontal tangent at the bend: one smooth centreline.
 const guide=`M${a.tee.x} ${a.tee.y} C${w*.20} ${a.tee.y} ${w*.28} ${bend.y} ${bend.x} ${bend.y} C${w*.66} ${bend.y} ${w*.68} ${a.flag.y} ${a.flag.x} ${a.flag.y}`;
 return `<rect width="${w}" height="430" fill="#c4d3a7"/><defs><clipPath id="waypoint-fairway"><path d="${outline}" transform="${transform}"/></clipPath></defs><rect width="${w}" height="430" fill="url(#fairway-mown)" clip-path="url(#waypoint-fairway)"/><g transform="${transform}"><path d="${lake.path}" fill="#c4d3a7" stroke="#c4d3a7" stroke-width="30"/>${courseLake(lakeD,lakeStyle,lake)}${courseBunkers(d,sandStyle)}</g><path id="dogleg-centreline" d="${guide}" fill="none" stroke="#a1b78e" stroke-width="1.2" stroke-dasharray="3 8"/>`;
}
export function waypointZone(state,d){
 if(state.stage!==0)return '';
 const {bend}=waypointAnchors(d);
 return `<g id="waypoint-zone"><ellipse cx="${bend.x}" cy="${bend.y}" rx="${d.width*.065}" ry="40" fill="#a9c981" fill-opacity=".5" stroke="#77985c" stroke-width="1.5" stroke-dasharray="5 5"/></g>`;
}
export function waypointChipGuide(state,d,range){
 if(state.stage===0||!range)return '';
 const a=waypointAnchors(d),entry=state.history.find(h=>h.waypoint_reached);
 if(!entry)return '';
 const start=waypointPosition(state,entry.word,d),length=Math.hypot(a.flag.x-start.x,a.flag.y-start.y);
 const radius=p=>Math.max(5,length*(1-mapFraction(p,state.baseline,state.threshold,.88)));
 const outer=radius(range.first),inner=radius(range.last),steps=12;
 return `<defs><clipPath id="waypoint-chip-front"><rect width="${d.zoneLeft}" height="430"/></clipPath></defs><g clip-path="url(#waypoint-chip-front)"><g id="chip-range-shading" clip-path="url(#waypoint-fairway)" pointer-events="none">${Array.from({length:steps},(_,i)=>{const r=outer+(inner-outer)*(i+.5)/steps;return `<circle cx="${a.flag.x}" cy="${a.flag.y}" r="${r}" fill="none" stroke="#b94b46" stroke-width="${Math.max(.7,Math.abs(outer-inner)/steps+.15)}" opacity="${.06+.72*((i+1)/steps)**1.7}"/>`;}).join('')}</g></g>`;
}
