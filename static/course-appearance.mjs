/** Per-round appearance, independent of word vectors, rules and scores. */
export function pinPlacement(seed){
 function unit(salt){let h=2166136261;for(const c of String(seed)+salt){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}h^=h>>>16;h=Math.imul(h,0x7feb352d);h^=h>>>15;return (h>>>0)/4294967295;}
 return {depth:.5+.2*unit(':depth'),vertical:.3+.4*unit(':vertical')};
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
