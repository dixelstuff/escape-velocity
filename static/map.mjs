import {greenPoints,greenContains,shoreY,GREEN_HEIGHT,GREEN_CENTRE_Y} from './course-appearance.mjs?v=golf-v54';
/** Display geometry only; scoring never depends on pixels. */
export function mapFraction(similarity, baseline, arrival, arrivalFraction=.9) {
  if(arrival<=baseline+1e-7)return (similarity-baseline)/Math.max(1e-6,1-baseline);
  if(similarity<=arrival){
    const progress=(similarity-baseline)/(arrival-baseline);
    return arrivalFraction*(progress>0?progress**.55:progress);
  }
  return arrivalFraction+(1-arrivalFraction)*(similarity-arrival)/Math.max(1e-6,1-arrival);
}
export function mapLayout(narrow=false,placement={depth:.6,vertical:(215-(GREEN_CENTRE_Y-GREEN_HEIGHT/2))/GREEN_HEIGHT}) {
 const base=narrow?{width:640,left:55,greenCentre:550,radius:50.82,edge:620}:{width:1000,left:80,greenCentre:860,radius:83.16,edge:960};
 const greenY=Math.max(GREEN_CENTRE_Y-20,Math.min(GREEN_CENTRE_Y+20,placement.greenCentreY??GREEN_CENTRE_Y));
 const d={...base,teeY:Math.max(191,Math.min(239,placement.teeY??215)),greenTop:greenY-GREEN_HEIGHT/2,greenBottom:greenY+GREEN_HEIGHT/2,zoneLeft:base.greenCentre-base.radius,zoneRight:base.greenCentre+base.radius};
 const depth=Math.max(.5,Math.min(.7,placement.depth)),vertical=Math.max(.3,Math.min(.7,placement.vertical));
 d.right=d.zoneLeft+depth*(d.zoneRight-d.zoneLeft);d.holeY=d.greenTop+vertical*(d.greenBottom-d.greenTop);
 d.axisLength=Math.hypot(d.right-d.left,d.holeY-d.teeY);d.axisRight=d.left+d.axisLength;
 d.axisX=(d.right-d.left)/d.axisLength;d.axisY=(d.holeY-d.teeY)/d.axisLength;
 d.greenOutline=greenPoints(d);
 let lo=0,hi=d.axisLength;
 for(let i=0;i<40;i++){const mid=(lo+hi)/2;if(greenContains(axisPoint(mid,0,d),d))hi=mid;else lo=mid;}
 d.arrivalDistance=hi;
 return d;
}
/** Local tee-to-cup coordinates, rotated into the course's screen coordinates. */
export function axisPoint(along,offset,d){return {x:d.left+d.axisX*along-d.axisY*offset,y:d.teeY+d.axisY*along+d.axisX*offset};}
export function projectX(similarity,baseline,arrival,layout) {
 const fraction=layout.arrivalDistance/layout.axisLength;
 return Math.max(20,Math.min(layout.edge,layout.left+layout.axisLength*mapFraction(similarity,baseline,arrival,fraction)));
}
/** Display circles and their word lies share the actual cup as their centre. */
export function contourX(centreX,offset,layout){
 const radius=layout.axisRight-centreX;
 if(radius<=1e-6)return centreX;
 return layout.axisRight-Math.sqrt(Math.max(0,radius*radius-offset*offset));
}
export function projectPoint(similarity,baseline,arrival,layout,offset=0){
 const centreX=projectX(similarity,baseline,arrival,layout),radius=Math.max(0,layout.axisRight-centreX);
 const point=dy=>axisPoint(contourX(centreX,dy,layout)-layout.left,dy,layout);
 let dy=Math.max(-.88*radius,Math.min(.88*radius,offset));
 const allowed=value=>{const p=point(value);return p.x>=20&&p.x<=layout.edge&&p.y>=62&&p.y<=370&&(!layout.style||p.x>layout.zoneLeft-24||p.y<=shoreY(p.x,layout,layout.style)-14)&&(similarity>=arrival?greenContains(p,layout):!greenContains(p,layout));};
 if(!allowed(dy)){
  let lo=0,hi=1;
  for(let i=0;i<24;i++){const mid=(lo+hi)/2;if(allowed(dy*mid))lo=mid;else hi=mid;}
  dy*=lo;
 }
 return point(dy);
}
/** Paint only the true hub-boundary interval; never add a decorative band width. */
export function chipArcBands(outerX,innerX,layout,{centreY=215,top=54,bottom=378,steps=16,samples=40}={}){
 const width=Math.max(0,innerX-outerX),extent=.9*Math.max(0,layout.axisRight-innerX);
 top=Math.max(top,centreY-extent);bottom=Math.min(bottom,centreY+extent);
 const line=x=>Array.from({length:samples+1},(_,i)=>{const offset=top+(bottom-top)*i/samples-centreY,p=axisPoint(contourX(x,offset,layout)-layout.left,offset,layout);return [p.x,p.y];});
 const path=points=>'M'+points.map(p=>p.map(v=>v.toFixed(3)).join(',')).join(' L');
 if(width<=1e-7)return [{path:path(line(outerX)),opacity:.78,stroke:true}];
 return Array.from({length:steps},(_,i)=>{
  const a=line(outerX+width*i/steps),b=line(outerX+width*(i+1)/steps).reverse();
  return {path:path([...a,...b])+' Z',opacity:.06+.72*((i+1)/steps)**1.7};
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
    const radius=label.radius??16,below=label.y+radius+(label.gap??5),above=label.y-radius-5-h;
    const peers=(label.priority??0)<5?labels.filter(other=>other!==label&&(other.priority??0)<5&&Math.abs(other.x-label.x)<(other.width+label.width)/2+12&&Math.abs(other.y-label.y)<Math.max(60,(other.height+label.height)/2+radius+(other.radius??16)+16)):[];
    const cluster=[label,...peers].sort((a,b)=>a.y-b.y||a.x-b.x||String(a.word).localeCompare(String(b.word)));
    const preferAbove=peers.length&&cluster.indexOf(label)<cluster.length/2;
    const preferredTop=preferAbove?above:below;
    const blocked=[...obstacles,...placed];
    const rows=[preferredTop,preferAbove?below:above,label.y-h/2,
      ...blocked.flatMap(o=>[o.y-h-4,o.y+o.height+4])];
    for(let y=24;y+h<=minimumHeight-10;y+=h+7)rows.push(y);
    for(const y of rows.filter(y=>y>=24&&y+h<=minimumHeight-10)) {
      for(const desiredX of [label.x-w/2,label.x-radius-5-w,label.x+radius+5,
        ...[...obstacles,...placed].flatMap(o=>[o.x-w-4,o.x+o.width+4]),
        ...[-28,28,-64,64,-112,112,-180,180].map(shift=>label.x-w/2+shift)]) {
        const x=Math.max(8,Math.min(width-w-8,desiredX));
        const dx=Math.max(x-label.x,0,label.x-x-w),dy=Math.max(y-label.y,0,label.y-y-h);
        const sidePenalty=(preferAbove?y+h>label.y:y<label.y)?220:0;
        candidates.push({x,y,width:w,height:h,cost:dx*dx+dy*dy+.12*(x+w/2-label.x)**2+sidePenalty});
      }
    }
    candidates.sort((a,b)=>a.cost-b.cost);
    let box=candidates.find(box=>![...obstacles,...placed].some(other=>overlaps(box,other)));
    if(!box){box={x:Math.max(8,Math.min(width-w-8,label.x-w/2)),y:height+8,width:w,height:h};height=box.y+h+12;}
    placed.push(box);result.set(label.word,{...box,textX:box.x+w/2,textY:box.y+h/2});
  }
  return {labels:result,height};
}
