/** Per-round appearance, independent of word vectors, rules and scores. */
function appearanceUnit(seed,salt){let h=2166136261;for(const c of String(seed)+salt){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return (h>>>0)/4294967295;
}
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
 return {teeY:191+48*u(':tee'),lakeY:368+12*u(':shore'),wave:5+6*u(':wave'),phase:u(':phase')*Math.PI*2,
  bunkers:Array.from({length:count},(_,i)=>({
   x:i?.65+.025*u(':bx1'):.38+(count===2?.06:.16)*u(':bx0'),y:46+16*u(':by'+i),
   rx:(i?23:47)+(i?11:16)*u(':br'+i),ry:17+9*u(':bh'+i),angle:-17+34*u(':ba'+i),phase:6.28*u(':bp'+i)
  }))};
}
function smoothOutline(points){
 const n=points.length,xy=p=>`${p.x.toFixed(3)},${p.y.toFixed(3)}`;let d='M'+xy(points[0]);
 for(let i=0;i<n;i++){const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n],e=points[(i+2)%n];d+=` C${xy({x:b.x+(c.x-a.x)/6,y:b.y+(c.y-a.y)/6})} ${xy({x:c.x-(e.x-b.x)/6,y:c.y-(e.y-b.y)/6})} ${xy(c)}`;}
 return d+' Z';
}
export function bunkerPath(b,padding=0){
 return smoothOutline(Array.from({length:32},(_,i)=>{const t=2*Math.PI*i/32,r=1+.19*Math.sin(3*t+b.phase)+.08*Math.cos(2*t-b.phase);return {x:(b.rx+padding)*Math.cos(t)*r,y:(b.ry+padding)*Math.sin(t)*r};}));
}
export function shoreY(x,d,style){return style.lakeY+style.wave*Math.sin(x/d.zoneLeft*3*Math.PI+style.phase);}
export function lakeGeometry(d,style){
 const end=d.zoneLeft-24,points=Array.from({length:9},(_,i)=>({x:-12+(end+12)*i/8,y:shoreY(-12+(end+12)*i/8,d,style)}));
 let path=`M-12,450 L${points[0].x},${points[0].y}`;
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];path+=` C${a.x+(b.x-a.x)/2},${a.y} ${a.x+(b.x-a.x)/2},${b.y} ${b.x},${b.y}`;}
 path+=` Q${end+20},${points.at(-1).y+4} ${end+12},450 Z`;
 return {path,obstacles:points.slice(0,-1).map((p,i)=>({x:p.x,y:Math.min(p.y,points[i+1].y),width:points[i+1].x-p.x,height:450-Math.min(p.y,points[i+1].y)}))};
}
