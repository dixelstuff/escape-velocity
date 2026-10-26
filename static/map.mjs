import {greenPoints,greenContains,shoreY,GREEN_HEIGHT,GREEN_CENTRE_Y} from './course-appearance.mjs?v=golf-v179';
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
 const height=placement.greenHeight??GREEN_HEIGHT;
 const d={...base,...(placement.par3?{par3:true}:{}),teeY:Math.max(placement.par3?168:191,Math.min(placement.par3?262:239,placement.teeY??215)),greenTop:greenY-height/2,greenBottom:greenY+height/2,zoneLeft:base.greenCentre-base.radius,zoneRight:base.greenCentre+base.radius};
 const depth=Math.max(.5,Math.min(.7,placement.depth)),vertical=Math.max(.3,Math.min(.7,placement.vertical));
 d.right=d.zoneLeft+depth*(d.zoneRight-d.zoneLeft);d.holeY=d.greenTop+vertical*(d.greenBottom-d.greenTop);
 d.axisLength=Math.hypot(d.right-d.left,d.holeY-d.teeY);d.axisRight=d.left+d.axisLength;
 d.axisX=(d.right-d.left)/d.axisLength;d.axisY=(d.holeY-d.teeY)/d.axisLength;
 if(d.par3){const cx=(d.zoneLeft+d.zoneRight)/2,cy=(d.greenTop+d.greenBottom)/2;d.greenNotches=[{edge:'top',at:cx-.6*d.radius,width:d.radius*.9,depth:18},{edge:'left',at:cy+height*.32,width:45,depth:d.radius*.30},{edge:'right',at:cy+height*.22,width:48,depth:d.radius*.30}];}
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
export function layoutLabels(labels, obstacles, width, minimumHeight=360, previous=new Map()) {
  const placed=[],result=new Map();let height=minimumHeight;
  const overlaps=(a,b)=>a.x<b.x+b.width+3&&a.x+a.width+3>b.x&&a.y<b.y+b.height+3&&a.y+a.height+3>b.y;
  const ordered=[...labels].sort((a,b)=>Number(!!a.optional)-Number(!!b.optional)||(b.priority||0)-(a.priority||0));
  const remember=(label,box)=>{
    placed.push(box);const {cost,...geometry}=box;result.set(label.word,{...geometry,textX:box.x+box.width/2,textY:box.y+box.height/2,anchorX:label.x,anchorY:label.y});
  };
  const retain=label=>{
    const old=previous.get(label.word),w=Math.min(width-16,label.width+10),h=label.height+6;
    if(!old||Math.abs(old.anchorX-label.x)>.25||Math.abs(old.anchorY-label.y)>.25||Math.abs(old.width-w)>.25||Math.abs(old.height-h)>.25)return false;
    const box={x:old.x,y:old.y,width:w,height:h};
    if(box.x<8||box.x+w>width-8||box.y<24||box.y+h>minimumHeight-10||[...obstacles,...placed].some(other=>overlaps(box,other)))return false;
    remember(label,box);return true;
  };
  // Reserve existing readable labels before fitting new ones. Changing a label's
  // role, ball size or connector is not itself a reason to move its text.
  for(const label of ordered.filter(l=>!l.optional))retain(label);
  for(const label of ordered) {
    if(result.has(label.word)||label.optional&&retain(label))continue;
    const w=Math.min(width-16,label.width+10),h=label.height+6;
    const candidates=[];
    const radius=label.radius??16,below=label.y+radius+(label.gap??5),above=label.y-radius-5-h;
    const peers=(label.priority??0)<5?labels.filter(other=>other!==label&&(!other.optional||label.optional)&&(other.priority??0)<5&&Math.abs(other.x-label.x)<(other.width+label.width)/2+12&&Math.abs(other.y-label.y)<Math.max(60,(other.height+label.height)/2+radius+(other.radius??16)+16)):[];
    const cluster=[label,...peers].sort((a,b)=>a.y-b.y||a.x-b.x||String(a.word).localeCompare(String(b.word)));
    const preferAbove=label.preferAbove??(peers.length&&cluster.indexOf(label)<cluster.length/2);
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
    if(!box&&label.optional)continue;
    if(!box){box={x:Math.max(8,Math.min(width-w-8,label.x-w/2)),y:height+8,width:w,height:h};height=box.y+h+12;}
    remember(label,box);
  }
  return {labels:result,height};
}

/** A quiet guide follows the fairway centre, easing towards the variable pin. */
export function par3CentreTrace(d){
 const end={x:d.right-12*d.axisX,y:d.holeY-12*d.axisY},span=end.x-d.left,cy=(d.greenTop+d.greenBottom)/2;
 return `M${d.left},${d.teeY} C${d.left+span*.32},${d.teeY-14} ${d.left+span*.72},${cy-8} ${end.x},${end.y}`;
}
