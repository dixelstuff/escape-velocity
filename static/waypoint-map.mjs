import {mapFraction} from './map.mjs?v=golf-v85';
import {greenPoints,lakeGeometry,shoreY} from './course-appearance.mjs?v=golf-v85';
import {courseLake,courseBunkers} from './course-art.mjs?v=golf-v85';
/** Longer holes use a smaller visual scale; semantic distances and text sizes stay unchanged. */
export function waypointLayout(base,state,placement={depth:.6,vertical:.5}){
 const turn=state.waypoint.turn??'up',mirror=turn==='down';
 const d={...base,artScale:.8,reflectY:mirror,waypointTurn:turn};
 const centre=mirror?138:284,height=184;
 d.teeY=mirror?168:272;d.bendY=mirror?298:128;d.bendX=d.width*(mirror?.52:.48);
 d.zoneLeft=d.greenCentre-base.radius*.88;d.zoneRight=d.greenCentre+base.radius*.88;
 d.zoneLeft+=(d.zoneRight-d.zoneLeft)*.12;d.greenCentre=(d.zoneLeft+d.zoneRight)/2;
 d.greenTop=centre-height/2;d.greenBottom=centre+height/2;
 d.right=d.zoneLeft+placement.depth*(d.zoneRight-d.zoneLeft);
 d.holeY=centre+(placement.vertical-.5)*height*.65;
 d.axisLength=Math.hypot(d.right-d.left,d.holeY-d.teeY);d.axisRight=d.left+d.axisLength;
 d.axisX=(d.right-d.left)/d.axisLength;d.axisY=(d.holeY-d.teeY)/d.axisLength;
 d.greenNotch={x:d.greenCentre,width:d.width<700?27:38,depth:24,edge:mirror?'bottom':'top'};
 d.greenSideNotch={y:mirror?d.greenTop+24:d.greenBottom-24,height:31,depth:12};
 d.greenOutline=greenPoints(d);d.cartPath=waypointCartPath(d);return d;
}
export function waypointAnchors(d){return {tee:{x:d.left,y:d.waypointTurn?d.teeY:280},bend:{x:d.bendX??d.width*.48,y:d.bendY??130},flag:{x:d.right,y:d.holeY}};}
function along(a,b,f,offset=0){const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy),t=Math.max(-.08,Math.min(1,f));return {x:a.x+dx*t-dy/len*offset*Math.sin(Math.PI*t),y:a.y+dy*t+dx/len*offset*Math.sin(Math.PI*t)};}
/** Store each shot in its own leg, so switching target does not move earlier labels. */
export function waypointPosition(state,word,d,event=null){
 const a=waypointAnchors(d);
 if(word===state.start)return a.tee;
 if(word===state.final_target)return a.flag;
 const h=state.history.find(h=>h.word===word&&h.success)??event??state.history.find(h=>h.word===word);
 if(!h)return a.bend;
 if(h.stage===0&&h.waypoint_reached){
  const rx=d.width*.065,ry=40,dx=(a.bend.x-a.tee.x)/rx,dy=(a.bend.y-a.tee.y)/ry,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
  const depth=Math.sqrt(Math.max(0,Math.min(1,(h.destination-(h.leg_threshold??.27))/(1-(h.leg_threshold??.27))))),forward=.62*(2*depth-1),side=.18*Math.sin(h.attempt*2.4+h.destination*5);
  return {x:a.bend.x+rx*(forward*ux-side*uy),y:a.bend.y+ry*(forward*uy+side*ux)};
 }
 const entry=state.history.find(h=>h.waypoint_reached);
 const start=h.stage===1&&entry?waypointPosition({...state,history:state.history.slice(0,state.history.indexOf(entry)+1)},entry.word,d,entry):a.tee;
 const goal=h.stage===1?a.flag:a.bend;
 const fraction=mapFraction(h.destination,h.leg_baseline??state.baseline,h.leg_threshold??state.threshold,.88);
 return along(start,goal,fraction,[-24,26,-36,34,-12,14][(h.attempt-1)%6]);
}
/** The exact same path geometry drives drawing and tree clearance. */
export function waypointCartPath(d){
 const w=d.width,bx=d.bendX??w*.48,start={x:-30,y:184},mid={x:bx,y:28},end={x:w+30,y:145};
 const segments=[[start,{x:w*.18,y:188},{x:w*.31,y:43},mid],[mid,{x:w*.65,y:19},{x:w*.79,y:137},end]];
 const points=segments.flatMap(([a,b,c,e],segment)=>Array.from({length:49},(_,i)=>{const t=i/48,u=1-t,x=u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*e.x,y=u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*e.y;return {x,y:d.reflectY?430-y:y};}));
 return {path:`M-30 184 C${w*.18} 188 ${w*.31} 43 ${bx} 28 C${w*.65} 19 ${w*.79} 137 ${w+30} 145`,points};
}
function lakeSettings(d,style){return {layout:{...d,zoneLeft:d.width*(d.reflectY?.64:.59)},style:{...style,lakeY:d.reflectY?384:390,wave:d.reflectY?39:35,cove:d.reflectY?38:26,coveAt:.55,coveWidth:.19}};}
function reflection(d){return d.reflectY?'translate(0 430) scale(1 -1)':'';}
export function waypointLake(d,style){
 const settings=lakeSettings(d,style),canonical=lakeGeometry(settings.layout,settings.style);
 if(!d.reflectY)return canonical;
 return {...canonical,outline:canonical.outline.map(p=>({...p,y:430-p.y})),obstacles:canonical.obstacles.map(o=>({...o,y:430-o.y-o.height}))};
}
/** Smoothly merge the tee-side cut into the lake bank instead of intersecting two edges. */
export function waypointBankY(d,style,x){
 const w=d.width,bx=d.bendX??w*.48,cubic=(a,b,c,e,t)=>(1-t)**3*a+3*(1-t)**2*t*b+3*(1-t)*t*t*c+t**3*e;
 let lo=0,hi=1;
 for(let i=0;i<26;i++){const t=(lo+hi)/2;if(cubic(bx,w*.32,w*.20,-30,t)>x)lo=t;else hi=t;}
 const original=cubic(191,183,375,387,(lo+hi)/2);
 const settings=lakeSettings(d,style),bank=shoreY(x,settings.layout,settings.style)-18;
 return (original+bank-Math.hypot(original-bank,24))/2;
}
function smoothCourseBoundary(points){
 const xy=p=>`${p.x.toFixed(3)},${p.y.toFixed(3)}`,n=points.length;
 return 'M'+xy(points[0])+points.map((b,i)=>{const a=points[(i+n-1)%n],c=points[(i+1)%n],e=points[(i+2)%n];return ` C${xy({x:b.x+(c.x-a.x)/6,y:b.y+(c.y-a.y)/6})} ${xy({x:c.x-(e.x-b.x)/6,y:c.y-(e.y-b.y)/6})} ${xy(c)}`;}).join('')+' Z';
}
export function waypointLandscape(state,d,style={phase:0}){
 const w=d.width,a=waypointAnchors(d),bx=a.bend.x,transform=reflection(d);
 const back=d.zoneRight+8,down=d.reflectY,entryTop=down?92:82,approachTop=down?191:181,greenBack=down?386:378;
 const bank=x=>waypointBankY(d,style,x),slope=x=>(bank(x+.15)-bank(x-.15))/.3;
 const points=Array.from({length:33},(_,i)=>({x:bx-(bx+30)*i/32,y:bank(bx-(bx+30)*i/32)}));
 const canonicalGreenTop=d.reflectY?430-d.greenBottom:d.greenTop,canonicalGreenBottom=canonicalGreenTop+184;
 // One closed spline shares its tangent at every join, including the back of the green.
 const outline=smoothCourseBoundary([
  {x:-30,y:222},{x:w*.15,y:210},{x:w*.26,y:125},{x:bx-62,y:entryTop},{x:bx+10,y:entryTop-12},{x:bx+66,y:entryTop+18},
  {x:w*.66,y:approachTop-5},{x:w*.79,y:approachTop},{x:back-14,y:canonicalGreenTop-5},{x:back+3,y:224},{x:back+5,y:288},{x:back-5,y:greenBack},
  {x:w*.86,y:greenBack+17},{x:w*.79,y:greenBack-5},{x:w*.74,y:down?361:348},{x:w*.65,y:272},{x:bx+46,y:bank(bx)+46*slope(bx)},{x:bx,y:bank(bx)},...points.slice(1)
 ]);
 const sandStyle={...style,bunkers:[
  {x:down?.45:.425,y:down?220:211,rx:w<700?31:41,ry:26,angle:down?7:-10,shape:10},
  {x:(d.greenCentre-4)/w,y:canonicalGreenTop+1,rx:w<700?30:42,ry:19,angle:down?4:-5,shape:8},
  {x:(d.zoneLeft-8)/w,y:canonicalGreenBottom-12,rx:w<700?29:39,ry:17,angle:59,shape:9}
 ]};
 const settings=lakeSettings(d,style),lakeD=settings.layout,lakeStyle=settings.style,lake=lakeGeometry(lakeD,lakeStyle);
 const bend=a.bend;
 // Two broad cubic curves meet at the centre of the waypoint with a shared tangent.
 const guide=`M${a.tee.x} ${a.tee.y} C${w*.20} ${a.tee.y} ${w*.29} ${bend.y} ${bend.x} ${bend.y} C${w*.60} ${bend.y} ${w*.70} ${a.flag.y} ${a.flag.x} ${a.flag.y}`;
 // A through path follows the outside cut, rather than returning in a hairpin.
 const outerPath=(d.cartPath??waypointCartPath(d)).path;

 return `<rect width="${w}" height="430" fill="#c4d3a7"/><defs><mask id="waypoint-dry-rough"><rect width="${w}" height="430" fill="white"/><path d="${outline}" transform="${transform}" fill="black"/><path d="${lake.path}" transform="${transform}" fill="black" stroke="black" stroke-width="22"/></mask><clipPath id="waypoint-fairway"><path d="${outline}" transform="${transform}"/></clipPath></defs><rect width="${w}" height="430" fill="url(#fairway-mown)" clip-path="url(#waypoint-fairway)"/><g mask="url(#waypoint-dry-rough)" aria-hidden="true"><path d="${outerPath}" transform="${transform}" fill="none" stroke="#b3bd96" stroke-width="13"/><path d="${outerPath}" transform="${transform}" fill="none" stroke="#ddd8bb" stroke-width="8"/></g><g transform="${transform}"><path d="${lake.path}" fill="#c4d3a7" stroke="#c4d3a7" stroke-width="30"/>${courseLake(lakeD,lakeStyle,lake)}${courseBunkers(d,sandStyle)}</g><path id="dogleg-centreline" d="${guide}" fill="none" stroke="#a1b78e" stroke-width="1.2" stroke-dasharray="3 8"/>`;
}
export function waypointZone(state,d,occupied=false){
 if(state.stage!==0||occupied)return '';
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
