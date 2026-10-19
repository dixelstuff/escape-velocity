/** Display geometry only; scoring never depends on pixels. */
export function mapFraction(similarity, baseline, arrival, arrivalFraction=.9) {
  if(arrival<=baseline+1e-7)return (similarity-baseline)/Math.max(1e-6,1-baseline);
  if(similarity<=arrival)return arrivalFraction*(similarity-baseline)/(arrival-baseline);
  return arrivalFraction+(1-arrivalFraction)*(similarity-arrival)/Math.max(1e-6,1-arrival);
}
export function mapLayout(narrow=false) {
  const layout=narrow?{width:640,left:55,right:550,radius:44,edge:620}:{width:1000,left:80,right:860,radius:72,edge:960};
  return {...layout,zoneLeft:layout.right-layout.radius,zoneRight:layout.right+layout.radius};
}
export function projectX(similarity,baseline,arrival,layout) {
  const span=layout.right-layout.left;
  const fraction=(layout.zoneLeft-layout.left)/span;
  return Math.max(20,Math.min(layout.edge,layout.left+span*mapFraction(similarity,baseline,arrival,fraction)));
}

/** Failed planets retain their original positions until the rocket passes them. */
export function visibleAttempts(state) {
  const reached=new Set(state.route);
  return state.history.filter(event=>event.forward!==false &&
    (reached.has(event.word)||event.destination+1e-7>=state.progress));
}
