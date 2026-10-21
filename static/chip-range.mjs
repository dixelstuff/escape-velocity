/** Display-only envelope of chip-in boundaries across possible word breadths.
 * Use the real requirement method, so the guide never changes shot scoring.
 */
export function chipRange(game) {
 if(!game||!['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(game.rules)||game.threshold<=game.baseline+1e-6)return null;
 const targetHub=game.e.hub?.(game.target)??0;
 function boundary(hub){
  const probe=Object.create(game);
  probe.e={hub:word=>word===game.target?targetHub:hub};
  let lo=-1,hi=1;
  for(let i=0;i<42;i++){
   const p=(lo+hi)/2;
   if(p+1e-7>=probe.requirement(game.start,game.target,p,1).required)hi=p;else lo=p;
  }
  return (lo+hi)/2;
 }
 const first=boundary(0),last=boundary(1),softness=.035*(game.threshold-game.baseline);
 return {first,last,start:Math.max(game.baseline,first-softness),end:Math.min(game.threshold,last+softness)};
}
