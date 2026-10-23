/** Choose the nearest visible word core when generous finger targets overlap.
 * All boxes and points use screen pixels, independent of SVG/map scaling.
 */
export function nearestWordTarget(targets,{x,y},padding=10,minimum=44){
 // Visible text wins over a neighbouring marker's enlarged target.
 const directlyHit=targets.filter(target=>{const b=target.boxes[0];return b&&x>=b.left&&x<=b.left+b.width&&y>=b.top&&y<=b.top+b.height;});
 if(directlyHit.length)return directlyHit.sort((a,b)=>{const centreDistance=t=>{const r=t.boxes[0];return (x-r.left-r.width/2)**2+(y-r.top-r.height/2)**2;};return centreDistance(a)-centreDistance(b);})[0].word;
 let best=null,bestScore=Infinity;
 for(const target of targets)for(const b of target.boxes){
  const cx=b.left+b.width/2,cy=b.top+b.height/2;
  const halfWidth=Math.max(minimum/2,b.width/2+padding),halfHeight=Math.max(minimum/2,b.height/2+padding);
  if(Math.abs(x-cx)>halfWidth||Math.abs(y-cy)>halfHeight)continue;
  const dx=Math.max(b.left-x,0,x-b.left-b.width),dy=Math.max(b.top-y,0,y-b.top-b.height);
  const score=dx*dx+dy*dy+.001*((x-cx)**2+(y-cy)**2);
  if(score<bestScore){bestScore=score;best=target.word;}
 }
 return best;
}
