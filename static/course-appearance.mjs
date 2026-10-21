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
  return {x:cx+rx*Math.sign(c)*Math.abs(c)**.68*(1+.035*Math.sin(3*t+.5)+.015*Math.cos(5*t)),y:cy+ry*Math.sign(s)*Math.abs(s)**.68*(.99+.01*Math.cos(3*t))};
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
   rx:(i?23:47)+(i?11:16)*u(':br'+i),ry:17+9*u(':bh'+i),angle:-17+34*u(':ba'+i),phase:6.28*u(':bp'+i),shape:Math.floor(3*u(':shape'+i))
  }))};
}
export function bunkerPath(b,padding=0){
 // Hand-drawn kidney/crescent profiles, rather than a radial blob.
 const profiles=[
  [[-1,-.1],[-1.08,-.65,-.55,-1.08,-.12,-.82],[.12,-.67,.05,-.3,.4,-.45],[.86,-.75,1.1,-.18,.88,.31],[.67,.87,.05,1.05,-.25,.64],[-.52,.3,-.99,.54,-1,-.1]],
  [[-.95,.35],[-1.2,-.1,-.73,-.84,-.18,-.92],[.43,-1.02,1.07,-.5,.97,.03],[.91,.43,.48,.8,.31,.51],[.16,.19,.38,-.11,.03,-.16],[-.35,-.2,-.37,.94,-.95,.35]],
  [[-.98,-.23],[-1.06,-.72,-.65,-1.04,-.3,-.74],[-.04,-.49,.19,-.8,.53,-.69],[1.03,-.52,1.14,.1,.78,.35],[.49,.52,.49,1.03,.05,.9],[-.34,.8,-.16,.28,-.55,.3],[-.88,.3,-.93,.11,-.98,-.23]]
 ];
 const points=profiles[b.shape??0],rx=b.rx+padding,ry=b.ry+padding;
 const scaled=a=>a.map((v,i)=>(v*(i%2?ry:rx)).toFixed(3)).join(',');
 return 'M'+scaled(points[0])+points.slice(1).map(a=>' C'+scaled(a)).join('')+' Z';
}
export function shoreY(x,d,style){
 const t=x/d.zoneLeft;
 const turn=Math.max(0,Math.min(1,(t-.62)/.38)),exit=100*turn*turn*(3-2*turn);
 return exit+style.lakeY-style.wave*Math.exp(-(((t-.23)/.24)**2))-13*Math.exp(-(((t-.67)/.12)**2))+3*Math.cos(7*t+style.phase);
}
export function lakeGeometry(d,style){
 const end=d.zoneLeft-24,points=Array.from({length:17},(_,i)=>({x:-12+(end+12)*i/16,y:shoreY(-12+(end+12)*i/16,d,style)}));
 let path=`M-12,500 L${points[0].x},${points[0].y}`;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];const step=(b.x-a.x)/3,slope=x=>(shoreY(x+.1,d,style)-shoreY(x-.1,d,style))/.2;path+=` C${a.x+step},${a.y+step*slope(a.x)} ${b.x-step},${b.y-step*slope(b.x)} ${b.x},${b.y}`;}
 path+=` L${end},500 L-12,500 Z`;
 return {path,obstacles:points.slice(0,-1).map((p,i)=>({x:p.x,y:Math.min(p.y,points[i+1].y),width:points[i+1].x-p.x,height:500-Math.min(p.y,points[i+1].y)})).filter(o=>o.y<430)};
}
