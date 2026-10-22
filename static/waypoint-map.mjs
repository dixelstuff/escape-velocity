import {mapFraction} from './map.mjs?v=golf-v89';
import {greenPoints,greenPath,greenContains,bunkerPath,bunkerPoints,lakeGeometry,shoreY} from './course-appearance.mjs?v=golf-v89';
import {courseLake,courseBunkers} from './course-art.mjs?v=golf-v89';
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
 d.greenNotch={x:d.greenCentre,width:d.width<700?32:46,depth:14,edge:mirror?'bottom':'top'};
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
const bunkerLayouts=new WeakMap();
/** Green and adjacent sand share one surrounding collar; their playing surfaces sit above it. */
export function waypointBunkers(d,style={phase:0}){
 if(bunkerLayouts.has(d))return bunkerLayouts.get(d);
 const down=d.reflectY,w=d.width,top=down?430-d.greenBottom:d.greenTop,bottom=top+184;
 const bunkers=[
  {x:down?.45:.425,y:down?220:211,rx:w<700?31:41,ry:26,angle:down?7:-10,shape:10},
  {x:(d.greenCentre-4)/w,y:top+5,rx:w<700?30:42,ry:19,angle:down?4:-5,shape:8},
  {x:(d.zoneLeft-8)/w,y:bottom-12,rx:w<700?29:39,ry:17,angle:59,shape:9}
 ];
 for(let index=1;index<bunkers.length;index++){
  const b=bunkers[index],angle=b.angle*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  // Keep banks clear of the putting surface, including their outline and a small turf gap.
  for(let pass=0;pass<48;pass++){
   const overlaps=bunkerPoints(b,2).some(p=>{
    const x=b.x*w+p.x*cos-p.y*sin,canonicalY=b.y+p.x*sin+p.y*cos,point={x,y:down?430-canonicalY:canonicalY};
    if(greenContains(point,d))return true;
    const outline=d.greenOutline??greenPoints(d);
    return outline.some((a,i)=>{const c=outline[(i+1)%outline.length],dx=c.x-a.x,dy=c.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy)<1.8;});
   });
   if(!overlaps)break;
   if(index===1)b.y-=.75;else b.x-=.75/w;
  }
 }
 bunkerLayouts.set(d,bunkers);return bunkers;
}
export function waypointGreen(d,style){
 const bunkers=waypointBunkers(d,style).slice(1),transform=reflection(d);
 const outer=bunkers.map(b=>`<path d="${bunkerPath(b,10)}" transform="translate(${b.x*d.width} ${b.y}) rotate(${b.angle})"/>`).join('');
 return `<defs><filter id="shared-collar-join" x="-10%" y="-10%" width="120%" height="120%"><feMorphology operator="dilate" radius="2"/><feMorphology operator="erode" radius="2"/></filter></defs><g id="green-fringe" fill="#b8cf94" filter="url(#shared-collar-join)"><path d="${greenPath(d,8)}"/><g transform="${transform}">${outer}</g></g><g class="greenside-sand" transform="${transform}">${courseBunkers(d,{...style,bunkers},{fringe:false})}</g><path id="putting-green" d="${greenPath(d)}" fill="url(#green-mown)" stroke="#70a35d" stroke-width="1.6"/>`;
}
export function waypointLandscape(state,d,style={phase:0}){
 const w=d.width,a=waypointAnchors(d),bx=a.bend.x,transform=reflection(d);
 const down=d.reflectY,top=down?80:70,greenTop=down?430-d.greenBottom:d.greenTop,greenBottom=greenTop+184,front=d.zoneLeft+24;
 const bank=x=>waypointBankY(d,style,x),slope=x=>(bank(x+.15)-bank(x-.15))/.3;
 const points=Array.from({length:33},(_,i)=>({x:bx-(bx+30)*i/32,y:bank(bx-(bx+30)*i/32)}));
 let lower='';for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],step=(b.x-a.x)/3;lower+=` C${a.x+step} ${a.y+step*slope(a.x)} ${b.x-step} ${b.y-step*slope(b.x)} ${b.x} ${b.y}`;}
 // Broad, authored curves with matching tangent handles; no interpolated anchor bumps.
 const frontStart=d.zoneLeft-20,frontNear=greenTop+38,frontFar=greenBottom-38,frontMiddle=(greenTop+greenBottom)/2;
 const outline=`M-30 222 C${w*.18} 222 ${w*.29} ${top} ${bx} ${top} C${bx+w*.10} ${top} ${w*.68} ${frontNear} ${frontStart} ${frontNear} C${d.zoneLeft+10} ${frontNear} ${front} ${frontNear} ${front} ${frontMiddle} C${front} ${frontFar} ${d.zoneLeft+10} ${frontFar} ${frontStart} ${frontFar} C${w*.68} ${frontFar} ${bx+70} ${bank(bx)+70*slope(bx)} ${bx} ${bank(bx)}${lower} Z`;
 const sandStyle={...style,bunkers:waypointBunkers(d,style).slice(0,1)};
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
