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

/** Pack measured label boxes around fixed word positions, without obscuring balls. */
export function layoutLabels(labels, obstacles, width, minimumHeight=360) {
  const placed=[],result=new Map();let height=minimumHeight;
  const overlaps=(a,b)=>a.x<b.x+b.width+4&&a.x+a.width+4>b.x&&a.y<b.y+b.height+4&&a.y+a.height+4>b.y;
  for(const label of [...labels].sort((a,b)=>(b.priority||0)-(a.priority||0))) {
    const w=Math.min(width-16,label.width+12),h=label.height+8;
    const candidates=[];
    for(let y=24;y+h<=minimumHeight-10;y+=h+7) {
      for(const shift of [0,-28,28,-64,64,-112,112,-180,180]) {
        const x=Math.max(8,Math.min(width-w-8,label.x-w/2+shift));
        candidates.push({x,y,width:w,height:h,cost:(x+w/2-label.x)**2+(y+h/2-(label.y+33))**2});
      }
    }
    candidates.sort((a,b)=>a.cost-b.cost);
    let box=candidates.find(box=>![...obstacles,...placed].some(other=>overlaps(box,other)));
    if(!box){box={x:Math.max(8,Math.min(width-w-8,label.x-w/2)),y:height+8,width:w,height:h};height=box.y+h+12;}
    placed.push(box);result.set(label.word,{...box,textX:box.x+w/2,textY:box.y+h/2});
  }
  return {labels:result,height};
}
