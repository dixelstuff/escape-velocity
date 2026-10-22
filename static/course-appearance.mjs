/** Per-round appearance, independent of word vectors, rules and scores. */
function appearanceUnit(seed,salt){let h=2166136261;for(const c of String(seed)+salt){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return (h>>>0)/4294967295;
}
export const GREEN_HEIGHT=318,GREEN_CENTRE_Y=224.5;
export function pinPlacement(seed){
 return {depth:.5+.2*appearanceUnit(seed,':depth'),vertical:.3+.4*appearanceUnit(seed,':vertical')};
}
export function greenPoints(d,padding=0){
 const cx=(d.zoneLeft+d.zoneRight)/2,cy=(d.greenTop+d.greenBottom)/2,rx=(d.zoneRight-d.zoneLeft)/2+padding,ry=(d.greenBottom-d.greenTop)/2+padding;
 return Array.from({length:64},(_,i)=>{
  const t=2*Math.PI*i/64,c=Math.cos(t),s=Math.sin(t);
  let x=cx+rx*Math.sign(c)*Math.abs(c)**.68*(1+.035*Math.sin(3*t+.5)+.015*Math.cos(5*t));
  let y=cy+ry*Math.sign(s)*Math.abs(s)**.68*(.99+.01*Math.cos(3*t));
  if(d.greenNotch){
    const n=d.greenNotch,sign=n.edge==='bottom'?-1:1;
    const edge=Math.max(0,-sign*s)**4;
    y+=sign*n.depth*Math.exp(-(((x-n.x)/n.width)**2))*edge;
  }
  for(const n of d.greenNotches??[]){
   if(n.edge==='top')y+=n.depth*Math.exp(-(((x-n.at)/n.width)**2))*Math.max(0,-s)**4;
   if(n.edge==='left')x+=n.depth*Math.exp(-(((y-n.at)/n.width)**2))*Math.max(0,-c)**4;
   if(n.edge==='right')x-=n.depth*Math.exp(-(((y-n.at)/n.width)**2))*Math.max(0,c)**4;
  }
  if(d.greenSideNotch){const n=d.greenSideNotch;x+=n.depth*Math.exp(-(((y-n.y)/n.height)**2))*Math.max(0,-c)**4;}
  return {x,y};
 });
}
export function greenPath(d,padding=0){
 const points=greenPoints(d,padding),n=points.length;
 const xy=p=>`${p.x.toFixed(3)},${p.y.toFixed(3)}`;
 let path='M'+xy(points[0]);
 for(let i=0;i<n;i++){
  const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n],e=points[(i+2)%n];
  path+=` C${xy({x:b.x+(c.x-a.x)/6,y:b.y+(c.y-a.y)/6})} ${xy({x:c.x-(e.x-b.x)/6,y:c.y-(e.y-b.y)/6})} ${xy(c)}`;
 }
 return path+' Z';
}
export function greenContains(p,d){
 if(p.x<d.zoneLeft-8||p.x>d.zoneRight+8||p.y<d.greenTop-1||p.y>d.greenBottom+1)return false;
 const points=d.greenOutline??greenPoints(d);let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
  if(Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<1e-7)return true;
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}

/** Decorative terrain stays stable for a saved round, including across screen sizes. */
export function courseStyle(seed){
 const u=salt=>appearanceUnit(seed,salt),count=u(':count')>.65?2:1;
 const greenCentreY=GREEN_CENTRE_Y+40*(u(':green-y')-.5),holeY=greenCentreY+GREEN_HEIGHT*(pinPlacement(seed).vertical-.5);
 const teeY=Math.max(191,Math.min(239,215-.25*(holeY-215)+4*(u(':tee')-.5)));
 return {teeY,greenCentreY,approach:u(':approach'),lakeY:388+8*u(':shore'),wave:34+12*u(':wave'),phase:u(':phase')*Math.PI*2,
  bunkers:Array.from({length:count},(_,i)=>({
   x:i?.65+.025*u(':bx1'):.38+(count===2?.06:.16)*u(':bx0'),y:46+16*u(':by'+i),
   rx:(i?23:47)+(i?11:16)*u(':br'+i),ry:17+9*u(':bh'+i),angle:-17+34*u(':ba'+i),phase:6.28*u(':bp'+i),shape:8+Math.floor(2*u(':shape'+i))
  }))};
}
// Hand-drawn outlines shared by rendering and terrain clearance.
const BUNKER_PROFILES=[
  [[-1,-.1],[-1.08,-.65,-.55,-1.08,-.12,-.82],[.12,-.67,.05,-.3,.4,-.45],[.86,-.75,1.1,-.18,.88,.31],[.67,.87,.05,1.05,-.25,.64],[-.52,.3,-.99,.54,-1,-.1]],
  [[-.95,.35],[-1.2,-.1,-.73,-.84,-.18,-.92],[.43,-1.02,1.07,-.5,.97,.03],[.91,.43,.48,.8,.31,.51],[.16,.19,.38,-.11,.03,-.16],[-.35,-.2,-.37,.94,-.95,.35]],
  [[-.98,-.23],[-1.06,-.72,-.65,-1.04,-.3,-.74],[-.04,-.49,.19,-.8,.53,-.69],[1.03,-.52,1.14,.1,.78,.35],[.49,.52,.49,1.03,.05,.9],[-.34,.8,-.16,.28,-.55,.3],[-.88,.3,-.93,.11,-.98,-.23]],
  [[-1,-.12],[-1.15,-.62,-.72,-1.02,-.24,-.86],[.05,-.76,.24,-.27,.47,-.52],[.82,-.9,1.16,-.48,1.02,.02],[.96,.45,.55,.35,.33,.6],[.05,1.02,-.45,.88,-.53,.48],[-.59,.15,-.92,.29,-1,-.12]],
  [[-.88,-.4],[-.75,-.94,-.12,-1.02,.29,-.75],[.82,-.72,1.12,-.22,.85,.17],[.64,.48,.29,.16,.05,.31],[-.12,.45,.01,.95,-.42,.87],[-.94,.82,-1.16,.08,-.88,-.4]],
  [[-.9,-.4],[-.55,-.92,.5,-.87,.92,-.43],[1.18,-.06,.35,.98,-.08,.94],[-.49,.87,-.68,.14,-.9,-.4]],
  [[-1,-.1],[-.9,-.8,-.3,-.8,.4,-.55],[1,-.35,1.1,.25,.6,.5],[.05,.9,-.85,.65,-1,-.1]],
  [[-.9,-.5],[-.4,-.85,.9,-.65,1,-.1],[1,.55,.25,.8,-.4,.55],[-1,.3,-1,-.2,-.9,-.5]],
  [[-1,-.12],[-1.06,-.58,-.73,-.86,-.37,-.71],[-.12,-.61,.08,-.92,.46,-.69],[.74,-.54,.82,-.13,1,.04],[1.14,.34,.71,.73,.35,.58],[.06,.42,-.1,.67,-.43,.56],[-.77,.53,-.94,.22,-1,-.12]],
  [[-.96,-.36],[-.84,-.84,-.23,-.86,.12,-.61],[.44,-.39,.84,-.68,1,-.23],[1.2,.19,.63,.72,.23,.81],[-.02,.85,-.13,.38,-.43,.39],[-.82,.41,-1.08,.04,-.96,-.36]],
  [[-1,.05],[-.9,-.38,-.72,-.91,-.28,-.82],[.08,-.78,.34,-.4,.67,-.44],[1.15,-.48,1.1,.18,.75,.46],[.4,.82,.03,.9,-.28,.67],[-.55,.49,-1.04,.48,-1,.05]]
 ];
export function bunkerPath(b,padding=0){
 const points=BUNKER_PROFILES[b.shape??0],rx=b.rx+padding,ry=b.ry+padding;
 const scaled=a=>a.map((v,i)=>(v*(i%2?ry:rx)).toFixed(3)).join(',');
 return 'M'+scaled(points[0])+points.slice(1).map(a=>' C'+scaled(a)).join('')+' Z';
}
export function bunkerPoints(b,padding=0){
 const profile=BUNKER_PROFILES[b.shape??0],rx=b.rx+padding,ry=b.ry+padding,points=[];
 let a=profile[0];
 for(const curve of profile.slice(1)){
  for(let i=0;i<=16;i++){const t=i/16,u=1-t;points.push({x:(u**3*a[0]+3*u*u*t*curve[0]+3*u*t*t*curve[2]+t**3*curve[4])*rx,y:(u**3*a[1]+3*u*u*t*curve[1]+3*u*t*t*curve[3]+t**3*curve[5])*ry});}
  a=curve.slice(4);
 }
 return points;
}
export function shoreY(x,d,style){
 const t=x/d.zoneLeft;
 const turn=Math.max(0,Math.min(1,(t-.62)/.38)),exit=100*turn*turn*(3-2*turn);
 return exit+style.lakeY-(style.cove??0)*Math.exp(-(((t-(style.coveAt??.55))/(style.coveWidth??.2))**2))-style.wave*Math.exp(-(((t-.23)/.24)**2))-13*Math.exp(-(((t-.67)/.12)**2))+3*Math.cos(7*t+style.phase);
}
export function lakeGeometry(d,style){
 const end=d.zoneLeft-24,points=Array.from({length:33},(_,i)=>({x:-30+(end+30)*i/32,y:shoreY(-30+(end+30)*i/32,d,style)}));
 let shore=`M${points[0].x},${points[0].y}`;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i],step=(b.x-a.x)/3,slope=x=>(shoreY(x+.1,d,style)-shoreY(x-.1,d,style))/.2;shore+=` C${a.x+step},${a.y+step*slope(a.x)} ${b.x-step},${b.y-step*slope(b.x)} ${b.x},${b.y}`;}
 const a=points.at(-1),tangent=(shoreY(end+.1,d,style)-shoreY(end-.1,d,style))/.2,b={x:end+80,y:a.y+80*tangent},c={x:d.width*.62,y:640},e={x:-30,y:686};
 const path=shore+` C${b.x},${b.y} ${c.x},${c.y} ${e.x},${e.y} Z`;
 const outline=[...points,...Array.from({length:48},(_,i)=>{const t=(i+1)/48,u=1-t;return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*e.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*e.y};})];
 return {path,shore,outline,obstacles:points.slice(0,-1).map((p,i)=>({x:p.x,y:Math.min(p.y,points[i+1].y),width:points[i+1].x-p.x,height:700-Math.min(p.y,points[i+1].y)})).filter(o=>o.y<430)};
}
/** Include a safety margin for the entire tree canopy and shadow, not just its centre. */
export function lakeContains(p,lake,margin=0){
 let inside=false;const points=lake.outline;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy)));
  if(Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)<=margin)return true;
  if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;
 }
 return inside;
}
