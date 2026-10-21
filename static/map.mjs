/** Display geometry only; scoring never depends on pixels. */
export function mapFraction(similarity, baseline, arrival, arrivalFraction=.9) {
  if(arrival<=baseline+1e-7)return (similarity-baseline)/Math.max(1e-6,1-baseline);
  if(similarity<=arrival)return arrivalFraction*(similarity-baseline)/(arrival-baseline);
  return arrivalFraction+(1-arrivalFraction)*(similarity-arrival)/Math.max(1e-6,1-arrival);
}
export function mapLayout(narrow=false) {
  const layout=narrow?{width:640,left:55,right:550,radius:48.4,edge:620}:{width:1000,left:80,right:860,radius:79.2,edge:960};
  return {...layout,zoneLeft:layout.right-layout.radius,zoneRight:layout.right+layout.radius};
}
export function projectX(similarity,baseline,arrival,layout) {
  const span=layout.right-layout.left;
  const fraction=(layout.zoneLeft-layout.left)/span;
  return Math.max(20,Math.min(layout.edge,layout.left+span*mapFraction(similarity,baseline,arrival,fraction)));
}

/** Hole-centred distance contours; lateral positions follow the same radius.
 * The centre-line scale is unchanged. Offset is decorative, never a scoring input.
 */
export function contourX(centreX,offset,layout){
 const radius=layout.right-centreX;
 if(radius<=1e-6)return centreX;
 return layout.right-Math.sqrt(Math.max(0,radius*radius-offset*offset));
}
export function projectPoint(similarity,baseline,arrival,layout,offset=0,centreY=215){
 const centreX=projectX(similarity,baseline,arrival,layout),radius=Math.max(0,layout.right-centreX);
 let spread=.88*radius;
 // Keep a lie short of the green visibly outside the putting surface.
 if(similarity<arrival){
  const edgeRadius=layout.right-layout.zoneLeft;
  const safeRadius=Math.min(radius,edgeRadius+6);
  spread=Math.min(spread,Math.sqrt(Math.max(0,radius*radius-safeRadius*safeRadius)));
 }
 const dy=Math.max(-spread,Math.min(spread,offset));
 return {x:contourX(centreX,dy,layout),y:centreY+dy};
}
/** A narrow fade-in ribbon; nothing is filled on the hole side of the arc. */
export function chipArcBands(centreX,layout,{centreY=215,top=54,bottom=378,width=12,steps=12,samples=40}={}){
 const extent=.9*Math.max(0,layout.right-centreX-width/2);
 top=Math.max(top,centreY-extent);bottom=Math.min(bottom,centreY+extent);
 const line=x=>Array.from({length:samples+1},(_,i)=>{const y=top+(bottom-top)*i/samples;return [contourX(x,y-centreY,layout),y];});
 return Array.from({length:steps},(_,i)=>{
  const a=line(centreX-width/2+width*i/steps),b=line(centreX-width/2+width*(i+1)/steps).reverse();
  const points=[...a,...b];
  return {path:'M'+points.map(p=>p.map(v=>v.toFixed(2)).join(',')).join(' L')+' Z',opacity:.78*((i+1)/steps)**1.7};
 });
}

/** Unmade forward shots keep their word markers until the ball passes them. */
export function visibleAttempts(state) {
  const reached=new Set(state.route);
  return state.history.filter(event=>(event.success||event.forward!==false) && event.outcome!=='water' &&
    (reached.has(event.word)||event.destination+1e-7>=state.progress));
}

/** Pack measured label boxes around fixed word positions, without obscuring balls. */
export function layoutLabels(labels, obstacles, width, minimumHeight=360) {
  const placed=[],result=new Map();let height=minimumHeight;
  const overlaps=(a,b)=>a.x<b.x+b.width+3&&a.x+a.width+3>b.x&&a.y<b.y+b.height+3&&a.y+a.height+3>b.y;
  for(const label of [...labels].sort((a,b)=>(b.priority||0)-(a.priority||0))) {
    const w=Math.min(width-16,label.width+10),h=label.height+6;
    const candidates=[];
    const radius=label.radius??16,preferredTop=label.y+radius+(label.gap??5);
    const rows=[preferredTop,label.y-radius-5-h];
    for(let y=24;y+h<=minimumHeight-10;y+=h+7)rows.push(y);
    for(const y of rows.filter(y=>y>=24&&y+h<=minimumHeight-10)) {
      for(const shift of [0,-28,28,-64,64,-112,112,-180,180]) {
        const x=Math.max(8,Math.min(width-w-8,label.x-w/2+shift));
        candidates.push({x,y,width:w,height:h,cost:(x+w/2-label.x)**2+(y+h/2-(preferredTop+h/2))**2});
      }
    }
    candidates.sort((a,b)=>a.cost-b.cost);
    let box=candidates.find(box=>![...obstacles,...placed].some(other=>overlaps(box,other)));
    if(!box){box={x:Math.max(8,Math.min(width-w-8,label.x-w/2)),y:height+8,width:w,height:h};height=box.y+h+12;}
    placed.push(box);result.set(label.word,{...box,textX:box.x+w/2,textY:box.y+h/2});
  }
  return {labels:result,height};
}
