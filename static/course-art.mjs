import {bunkerPath,bunkerPoints,greenPoints,shoreY,lakeGeometry,lakeContains,greenPath,greenContains} from './course-appearance.mjs?v=golf-v162';

/** Quiet, plan-view scorecard artwork. All scenery is behind the played words. */
function smoothContour(points){
 const xy=p=>p.map(v=>v.toFixed(3)).join(','),n=points.length;let path='M'+xy(points[0]);
 for(let i=0;i<n;i++){const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n],e=points[(i+2)%n];path+=` C${xy([b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6])} ${xy([c[0]-(e[0]-b[0])/6,c[1]-(e[1]-b[1])/6])} ${xy(c)}`;}
 return path+' Z';
}
const fairwayShapes=new WeakMap();
function cubicPoint(segment,t){const u=1-t,[a,b,c,e]=segment;return {x:u**3*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t**3*e.x,y:u**3*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t**3*e.y};}
export function par3Fairway(d){
 if(fairwayShapes.has(d))return fairwayShapes.get(d);
 const w=d.width,cy=d.teeY,gy=(d.greenTop+d.greenBottom)/2,front=d.zoneLeft,rx=(d.zoneRight-d.zoneLeft)/2,span=d.right-d.left;
 const phase=d.style?.phase??0,neckX=d.left+.32*span,neckY=cy+.22*(gy-cy)-12,endX=front+.78*rx,p=(x,y)=>({x,y});
 // Stagger the two edge turns: a shoulder on one bank meets a longer sweep on
 // the other, rather than two matching hourglass pinches. Vertical dimensions
 // are about 15% wider, while the join under the front green stays unchanged.
 const topNeck=d.left+.25*span,bottomNeck=d.left+.40*span,lean=5*Math.sin(phase);
 const top=[
 [p(-30,cy-87.4),p(d.left+.08*span,cy-87.4),p(topNeck-.10*span,neckY-43.7+lean),p(topNeck,neckY-43.7+lean)],
 [p(topNeck,neckY-43.7+lean),p(topNeck+.22*span,neckY-43.7+lean),p(front-.21*span,d.greenTop-4),p(front+.38*rx,d.greenTop)]
 ];
 const shoulder=[
 [top.at(-1)[3],p(front+.70*rx,d.greenTop+30),p(endX,gy-35),p(endX,gy)],
 [p(endX,gy),p(endX,gy+35),p(front+.50*rx,d.greenBottom-20),p(front+.25*rx,d.greenBottom-2)]
 ];
 const bottom=[
 [shoulder.at(-1)[3],p(front-.13*span,d.greenBottom+6),p(bottomNeck+.15*span,neckY+43.7-lean),p(bottomNeck,neckY+43.7-lean)],
 [p(bottomNeck,neckY+43.7-lean),p(bottomNeck-.13*span,neckY+43.7-lean),p(d.left+.08*span,cy+87.4),p(-30,cy+87.4)]
 ];
 const xy=p=>`${p.x},${p.y}`,path='M'+xy(top[0][0])+[...top,...shoulder,...bottom].map(c=>' C'+c.slice(1).map(xy).join(' ')).join('')+' Z';
 function edgeY(segments,x){const segment=segments.find(c=>x>=Math.min(c[0].x,c[3].x)&&x<=Math.max(c[0].x,c[3].x));if(!segment)return x<0?segments.find(c=>c.some(p=>p.x<0)).find(p=>p.x<0).y:d.greenBottom+23;let lo=0,hi=1;const forward=segment[3].x>segment[0].x;for(let i=0;i<32;i++){const t=(lo+hi)/2;if((cubicPoint(segment,t).x<x)===forward)lo=t;else hi=t;}return cubicPoint(segment,(lo+hi)/2).y;}
 const outline=[...top,...shoulder,...bottom].flatMap(segment=>Array.from({length:25},(_,i)=>cubicPoint(segment,i/25)));
 const result={path,outline,endX,neckX,topY:x=>edgeY(top,x),bottomY:x=>edgeY(bottom,x)};fairwayShapes.set(d,result);return result;
}
export function par3MidBunkers(d,style){const source=style.bunkers[0],x=Math.max(.39,Math.min(.52,source.x)),geometry=par3Fairway(d),px=x*d.width;return [{...source,x,y:geometry.topY(px)-3,angle:Math.atan((geometry.topY(px+1)-geometry.topY(px-1))/2)*180/Math.PI}];}
export function courseSurrounds(d,style){
 const w=d.width,end=d.zoneLeft-24,approach=approachGeometry(d,style);
 const bank=x=>{
  let y=shoreY(Math.min(x,end),d,style)-24;
  if(x>end){const t=Math.max(0,Math.min(1,(x-end)/(w-35-end)));y+=(400-y)*t*t*(3-2*t);}
  if(approach)y-=100*Math.exp(-(((x-approach.x)/approach.rx)**2));
  return y;
 };
 if(d.par3){
  const contour=par3Fairway(d).path;
  const joins=[...par3MidBunkers(d,style),...par3Bunkers(d)].map(b=>`<path d="${bunkerPath(b,2)}" transform="translate(${b.x*w},${b.y}) rotate(${b.angle})"/>`).join('');
  return `<defs><filter id="fairway-soft-joins" filterUnits="userSpaceOnUse" x="-30" y="-30" width="${w+60}" height="490"><feMorphology operator="dilate" radius="4"/><feMorphology operator="erode" radius="4"/></filter><mask id="fairway-mask" maskUnits="userSpaceOnUse" x="-30" y="-30" width="${w+60}" height="490"><rect x="-30" y="-30" width="${w+60}" height="490" fill="black"/><g fill="white" filter="url(#fairway-soft-joins)"><path d="${contour}"/><path d="${greenPath(d)}"/>${joins}</g></mask></defs><rect id="course-rough" x="-30" y="-30" width="${w+60}" height="1830" fill="#c4d3a7"/><rect id="course-fairway" x="-30" y="-30" width="${w+60}" height="1830" fill="url(#fairway-mown)" mask="url(#fairway-mask)"/>`;
 }
 const contour=smoothContour([
  [-30,108],[w*.12,82],[w*.28,65],[w*.42,45],[w*.55,57],[w*.68,32],[w*.82,23],[w*.92,40],
  [w-30,85],[w-16,170],[w-15,260],[w-18,340],[w-35,400],
  ...Array.from({length:49},(_,i)=>{const x=w-50-(w-20)*i/48;return [x,bank(x)];}),[-40,250]
 ]);
 // Opaque rough forms the ground; only the smooth fairway gets mowing stripes.
 return `<defs><clipPath id="fairway-clip" clipPathUnits="userSpaceOnUse"><path d="${contour}"/></clipPath></defs><rect id="course-rough" x="-30" y="-30" width="${w+60}" height="1830" fill="#c4d3a7"/><rect id="course-fairway" x="-30" y="-30" width="${w+60}" height="1830" fill="url(#fairway-mown)" clip-path="url(#fairway-clip)"/>`;
}

function tree(x,y,r,seed){
 const shades=['#718c63','#7c9668','#66845f'];
 const lobes=Array.from({length:7},(_,i)=>{
  const t=i*Math.PI*2/7,rr=r*(.53+.035*((i+seed)%3));
  return `<circle cx="${Math.cos(t)*r*.47}" cy="${Math.sin(t)*r*.43}" r="${rr}"/>`;
 }).join('');
 return `<g data-course-tree="true" transform="translate(${x},${y})"><ellipse cx="4" cy="5" rx="${r*1.06}" ry="${r*.87}" fill="#546c49" opacity=".12"/>
 <g fill="${shades[seed%3]}" stroke="#5f7b55" stroke-width=".65">${lobes}</g>
 <path d="M${-r*.58},${-r*.12} Q${-r*.64},${-r*.7} 0,${-r*.65} Q${r*.38},${-r*.72} ${r*.55},${-r*.24}" fill="none" stroke="#adbf8d" stroke-width="1.5" opacity=".6"/>
 <circle cx="${-r*.15}" cy="${-r*.13}" r="${r*.46}" fill="#9bb282" opacity=".25"/>
 <path d="M-2 7 L1 -3 M1 -3 L-6 -7 M1 -3 L7 -6" fill="none" stroke="#516e4b" stroke-width=".8" opacity=".35"/></g>`;
}

const par3Paths=new WeakMap();
export function par3CartPath(d,style=d.style??{lakeY:395,wave:40,phase:0}){
 if(par3Paths.has(d))return par3Paths.get(d);
 const w=d.width,end=d.zoneLeft-24,geometry=par3Fairway(d);
 const knots=[-.04,.12,.29,.46,.64,.81,1.05].map(f=>{
  const x=w*f,edge=geometry.bottomY(x),desired=25+8*Math.sin(f*6.28+style.phase);
  const shore=shoreY(x,d,style),y=x<end?edge+Math.max(9,Math.min(desired,(shore-edge)/2)):d.greenBottom+51+8*Math.sin(f*4+style.phase);
  return {x,y};
 });
 const xy=p=>`${p.x.toFixed(3)},${p.y.toFixed(3)}`,points=[];let path='M'+xy(knots[0]);
 for(let i=0;i<knots.length-1;i++){
  const a=knots[Math.max(0,i-1)],b=knots[i],c=knots[i+1],e=knots[Math.min(knots.length-1,i+2)],p={x:b.x+(c.x-a.x)/6,y:b.y+(c.y-a.y)/6},q={x:c.x-(e.x-b.x)/6,y:c.y-(e.y-b.y)/6};
  path+=` C${xy(p)} ${xy(q)} ${xy(c)}`;
  for(let j=0;j<20;j++){const t=j/20,u=1-t;points.push({x:u**3*b.x+3*u*u*t*p.x+3*u*t*t*q.x+t**3*c.x,y:u**3*b.y+3*u*u*t*p.y+3*u*t*t*q.y+t**3*c.y});}
 }
 points.push(knots.at(-1));const result={path,points};par3Paths.set(d,result);return result;
}
export function par3PathArt(d,style){const p=par3CartPath(d,style);return `<g id="par3-cart-path" fill="none" aria-hidden="true" pointer-events="none"><path d="${p.path}" stroke="#a7b68d" stroke-width="8"/><path d="${p.path}" stroke="#e0dec4" stroke-width="5"/></g>`;}
export function clearOfCartPath(p,d){
 const points=(d.cartPath??(d.par3?par3CartPath(d):null))?.points;if(!points)return true;
 return points.every((b,i)=>{if(!i)return true;const a=points[i-1],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)>=p.r+4;});
}
export function courseTrees(d,style,lake=lakeGeometry(d,style)){
 const shift=8*Math.sin(style.phase);
 const edgeTrees=d.waypointTurn?[
  [.948,180,13],[.981,204,16],
  [.943,275,16],[.985,264,12],[.967,305,13],
  [.943,395,14],[.979,420,16]
 ]:[[.981,89,12],[.985,122,13],[.978,332,14],[.975,366,12]];
 const trees=d.waypointTurn?[
  [.03,83,17],[.058,62,14],[.079,96,19],[.116,74,12],
  [.30,24,14],[.332,42,17],[.355,13,12],
  [.45,8,16],[.476,24,12],[.51,11,18],
  [.12,160,15],[.15,143,12],[.17,173,17],
  [.62,124,15],[.65,139,12],[.674,116,17],
  [.56,272,17],[.583,296,13],[.607,279,19],[.63,314,14],
  [.51,351,21],[.54,368,15],[.56,339,17],
  [.79,416,18],[.824,399,12],[.842,426,16],
  ...edgeTrees
 ]:d.par3?edgeTrees:[
  [.035,28,14],[.068,42,18],[.105,25,17],[.14,43,13],
  [.24,19,15],[.273,28,12],[.69,15,14],[.729,27,18],[.765,12,14],...edgeTrees
 ];
 const cart=d.cartPath??(d.par3?par3CartPath(d,style):null);
 const noise=i=>{const n=Math.sin((i+1)*12.9898+style.phase*78.233)*43758.5453;return n-Math.floor(n);};
 const pathTrees=d.par3?[.12,.37,.67,.90].flatMap((f,i)=>{
  const fraction=f+.035*(noise(i)-.5),a=cart.points[Math.round(fraction*(cart.points.length-1))],side=i%2?1:-1,count=3+Math.floor(4*noise(i+10)),spread=15+17*noise(i+30);
  return Array.from({length:count},(_,j)=>{const t=noise(i*10+j+60)*6.28,rr=spread*Math.sqrt(noise(i*10+j+90));return {x:a.x+Math.cos(t)*rr,y:a.y+side*(25+8*noise(i+50))+Math.sin(t)*rr*.7,r:7+10*noise(i*10+j+120),seed:60+i*7+j};});
 }).filter(p=>p.y>par3Fairway(d).bottomY(p.x)+3):d.cartPath?[8,12,29,33,56,59,78,82].map((index,i)=>{
  const a=d.cartPath.points[index],b=d.cartPath.points[index+1],dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy)||1,r=(13+(i*7)%9)*(d.width<700?.88:1)*(d.artScale??1),sign=d.reflectY?1:-1,offset=r+5+(i%2)*3;
  return {x:a.x-sign*dy/length*offset,y:a.y+sign*dx/length*offset,r,seed:50+i};
 }):[];
 // Grow irregular groves in the broad top rough, leaving open pockets between
 // them. Sample the actual fairway edge rather than lining trees along the frame.
 const topTrees=[];
 if(d.par3){
  const geometry=par3Fairway(d),centres=[],count=4+Math.floor(3*noise(310));
  for(let i=0;i<40&&centres.length<count;i++){
   const x=d.width*(.025+.79*noise(320+i*7)),ceiling=geometry.topY(x)-26;
   if(ceiling<22)continue;
   const y=10+(ceiling-10)*noise(321+i*7);
   if(centres.some(c=>Math.hypot((x-c.x)*.8,y-c.y)<62))continue;
   centres.push({x,y});
   const n=1+Math.floor(4*noise(322+i*7)),grove=[];
   for(let j=0;j<n*5&&grove.length<n;j++){
    const angle=noise(600+i*23+j*3)*Math.PI*2,spread=j?9+18*noise(601+i*23+j*3):0;
    const tx=x+Math.cos(angle)*spread,ty=y+Math.sin(angle)*spread*.85,r=8+10*noise(602+i*23+j*3);
    if(ty+r>geometry.topY(tx)+2||ty<-r*.25||tx<r*.3||tx>d.zoneLeft-25)continue;
    if(grove.some(a=>Math.hypot(tx-a.x,ty-a.y)<9))continue;
    if(grove.some((a,k)=>grove.slice(k+1).some(b=>{const ux=b.x-a.x,uy=b.y-a.y,vx=tx-a.x,vy=ty-a.y;return Math.abs(ux*vy-uy*vx)<.24*Math.hypot(ux,uy)*Math.hypot(vx,vy);})))continue;
    const sapling={x:tx,y:ty,r,seed:150+i*20+j};grove.push(sapling);topTrees.push(sapling);
   }
  }
 }
 const fairwayTrees=d.par3?[.21,.61].flatMap((fraction,i)=>{
  const geometry=par3Fairway(d),x=d.left+(d.zoneLeft-d.left)*(fraction+.025*(noise(i+180)-.5)),r=11+4*noise(i+190),y=geometry.topY(x);
  return [{x,y:y+3,r,seed:110+i*3},{x:x-17-7*noise(i+200),y:y-16,r:r*.85,seed:111+i*3},{x:x+13,y:y-24,r:r*.72,seed:112+i*3}];
 }):[];
 return `<g id="course-trees" aria-hidden="true" pointer-events="none">${trees.map(([x,y,r],i)=>({x:x*d.width+(i<9?5*Math.sin(i*2.7+style.phase):0)+(d.reflectY&&i>=9?d.width*.009*Math.sin(i*1.7+style.phase):0),y:d.reflectY?430-y-(i<9?shift+4*Math.sin(i+style.phase):0)+7*Math.sin(i*2.3+style.phase):y+(i<9?shift+4*Math.sin(i+style.phase):0),r:r*(d.width<700?.88:1)*(d.artScale??1),seed:i})).concat(pathTrees,fairwayTrees,topTrees).filter(p=>clearOfCartPath(p,d)&&clearOfPar3Sand(p,d)&&!lakeContains(p,lake,p.r+7)&&(!(d.waypointTurn||d.par3)||!Array.from({length:12},(_,i)=>({x:p.x+Math.cos(i*Math.PI/6)*(p.r+5),y:p.y+Math.sin(i*Math.PI/6)*(p.r+5)})).some(point=>greenContains(point,d)))).map(p=>tree(p.x,p.y,p.r,p.seed)).join('')}</g>`;
}

const par3Sand=new WeakMap();
export function par3Bunkers(d){
 if(par3Sand.has(d))return par3Sand.get(d);
 const cx=(d.zoneLeft+d.zoneRight)/2,cy=(d.greenTop+d.greenBottom)/2,rx=(d.zoneRight-d.zoneLeft)/2,ry=(d.greenBottom-d.greenTop)/2;
 const bunkers=[{x:(cx-.6*rx)/d.width,y:d.greenTop-12,rx:rx*.70,ry:23,shape:10,angle:-23},{x:(d.zoneRight+12)/d.width,y:cy+.44*ry,rx:rx*.32,ry:43,shape:9,angle:18},{x:(d.zoneLeft-8)/d.width,y:cy+.64*ry,rx:rx*.53,ry:28,shape:8,angle:30}];
 const edge=greenPoints(d);
 for(const b of bunkers){
  const angle=b.angle*Math.PI/180,dx=b.x*d.width-cx,dy=b.y-cy,length=Math.hypot(dx,dy);
  for(let step=0;step<60;step++){
   const points=bunkerPoints(b,2).map(p=>({x:b.x*d.width+p.x*Math.cos(angle)-p.y*Math.sin(angle),y:b.y+p.x*Math.sin(angle)+p.y*Math.cos(angle)}));
   if(points.every(p=>!greenContains(p,d)&&edge.every(q=>Math.hypot(p.x-q.x,p.y-q.y)>=5)))break;
   b.x+=dx/length/d.width;b.y+=dy/length;
  }
 }
 par3Sand.set(d,bunkers);return bunkers;
}
function clearOfPar3Sand(p,d){return !d.par3||[...par3Bunkers(d),...(d.style?par3MidBunkers(d,d.style):[])].every(b=>{const a=b.angle*Math.PI/180,outline=bunkerPoints(b,2).map(q=>({x:b.x*d.width+q.x*Math.cos(a)-q.y*Math.sin(a),y:b.y+q.x*Math.sin(a)+q.y*Math.cos(a)}));return !lakeContains(p,{outline},p.r+3);});}
export function courseBunkers(d,style,{fringe=true}={}){
 const greenside=d.par3?par3Bunkers(d):[];
 return `<g aria-hidden="true" pointer-events="none">${[...(d.par3?par3MidBunkers(d,style):style.bunkers),...greenside].map(b=>`<g class="bunker" transform="translate(${b.x*d.width},${b.y}) rotate(${b.angle})">
 ${fringe?`<path d="${bunkerPath(b,5)}" fill="${greenside.includes(b)?'#b8cf94':'#9daf7d'}" opacity="${greenside.includes(b)?1:.7}"/>`:''}
 <path d="${bunkerPath(b,2)}" fill="#c5b384"/>
 <path d="${bunkerPath(b)}" fill="url(#scorecard-sand)" stroke="#c8b88e" stroke-width=".8"/>
 <path d="${bunkerPath(b,-4)}" fill="none" stroke="#eee5c8" stroke-width="1.2" opacity=".7"/>
 </g>`).join('')}</g>`;
}

/** Stable scattered marks, with varying length, curvature, spacing and opacity. */
function lakeRipples(width,top,bottom,phase=0){
 const random=n=>{const v=Math.sin(n*127.1+phase*31.7)*43758.5453;return v-Math.floor(v);};
 const count=Math.ceil(width*(bottom-top)/19000);
 return Array.from({length:count},(_,i)=>{
  const x=width*(.025+.93*random(i*9+1)),y=top+(bottom-top)*random(i*9+2),length=13+43*random(i*9+3),bend=(random(i*9+4)-.5)*6;
  const mark=(x,y,len,bend)=>`M${x.toFixed(2)} ${y.toFixed(2)} q${(len*.46).toFixed(2)} ${bend.toFixed(2)} ${len.toFixed(2)} 0`;
  const paired=random(i*9+5)>.66?mark(x+length*(.22+random(i*9+6)*.3),y+5+random(i*9+7)*4,length*.48,-bend*.55):'';
  return `<path d="${mark(x,y,length,bend)} ${paired}" opacity="${(.28+random(i*9+8)*.4).toFixed(2)}" stroke-width="${(.7+random(i*9+9)*.6).toFixed(2)}"/>`;
 }).join('');
}

export function courseLake(d,style,lake){
 const shore=offset=>Array.from({length:33},(_,i)=>{
  const x=-12+(d.zoneLeft-12)*i/32;
  return `${i?'L':'M'}${x.toFixed(2)},${(shoreY(x,d,style)+offset).toFixed(2)}`;
 }).join(' ');
 return `<defs><clipPath id="lake-clip"><path d="${lake.path}"/></clipPath></defs>
 <path id="lake" d="${lake.path}" fill="#91b7bc" stroke="#789f9f" stroke-width="1.3"/>
 <g clip-path="url(#lake-clip)" fill="none" pointer-events="none">
 <path d="${shore(8)}" stroke="#c0d6ce" stroke-width="2" opacity=".7"/>
 <path d="${shore(19)}" stroke="#b1cdca" stroke-width=".9" opacity=".55"/>
 <g stroke="#d3e1d9" stroke-linecap="round">${lakeRipples(d.zoneLeft,365,450,style.phase)}</g>
 </g>`;
}

function approachGeometry(d,style){
 if(!(style.approach>=.28))return null;
 return {x:d.zoneLeft*.91,y:399+5*Math.sin(style.phase),rx:d.width<700?65:100,ry:45};
}
export function approachLandscape(d,style){
 if(d.par3)return '';
 const p=approachGeometry(d,style);if(!p)return '';
 const sand={rx:p.rx*.68,ry:25,shape:8};
 // Its turf is part of the shared rough mask; only the sand/trees belong here.
 return `<g id="approach-landscape" aria-hidden="true" pointer-events="none" transform="translate(${p.x},${p.y}) rotate(-12)">
 ${style.approach>.59?`<path d="${bunkerPath(sand,3)}" fill="#9daf7d"/><path d="${bunkerPath(sand)}" fill="url(#scorecard-sand)" stroke="#c5b58a" stroke-width="1"/>`:tree(-p.rx*.3,-1,18,2)+tree(p.rx*.18,4,16,1)+tree(p.rx*.46,15,12,0)}
 </g>`;
}

export function continuationTrees(d,style,lake=lakeGeometry(d,style)){
 const trees=[[.025,484,15],[.045,531,17],[.98,463,15],[.96,544,17],[.025,730,18],[.975,746,17],[.075,803,14],[.91,863,16],[.02,1030,16],[.97,1120,17]];
 return trees.map(([x,y,r],i)=>({x:x*d.width,y:y+8*Math.sin(style.phase+i),r,seed:i})).filter(p=>!lakeContains(p,lake,p.r+7));
}

/** The neighbouring hole and its road share the same boundary geometry. */
export function neighbouringCourse(d){
 const w=d.width,p=(x,y)=>({x:x*w,y}),segments=[
 [p(.95,458),p(.76,468),p(.91,603),p(.65,649)],
 [p(.65,649),p(.32,710),p(.11,768),p(.04,925)],
 [p(.04,925),p(.01,1000),p(.20,1019),p(.26,930)],
 [p(.26,930),p(.36,787),p(.52,781),p(.79,714)],
 [p(.79,714),p(1.05,652),p(1.07,451.684),p(.95,458)]
 ];
 const xy=p=>`${p.x},${p.y}`,render=curves=>'M'+xy(curves[0][0])+curves.map(c=>' C'+c.slice(1).map(xy).join(' ')).join('');
 const route=segments.slice(3).reverse().map(c=>[...c].reverse().map(p=>({x:p.x+w*.065,y:p.y})));
 const pathCurves=route,sample=curves=>curves.flatMap(c=>Array.from({length:50},(_,i)=>cubicPoint(c,i/50)));
 return {fairway:render(segments)+' Z',path:render(pathCurves),outline:sample(segments),pathPoints:sample(pathCurves)};
}
/** One world behind the playable viewport and feedback, with no image edge at their join. */
export function courseContinuation(d,style,{foreground=null,lake=lakeGeometry(d,style)}={}){
 const w=d.width,{fairway,path}=neighbouringCourse(d);
 const defs=`<pattern id="green-mown" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#95c87b"/><rect width="11" height="22" fill="#a5d18d"/></pattern><pattern id="fairway-mown" width="100" height="1300" patternUnits="userSpaceOnUse"><rect width="100" height="1300" fill="#d8e7c4"/><rect width="50" height="1300" fill="#e1edcf"/></pattern>${courseArtDefs}`;
 const world=foreground??`${courseSurrounds(d,style,lake)}${courseBunkers(d,style)}<path d="${greenPath(d,7)}" fill="#b8cf94"/><path d="${greenPath(d)}" fill="url(#green-mown)" stroke="#70a35d" stroke-width="2"/>${courseLake(d,style,lake)}${approachLandscape(d,style)}${d.par3?par3PathArt(d,style):''}${courseTrees(d,style,lake)}`;
 const waterOutline=lake.outline.map(p=>`${p.x},${p.y}`).join(' '),transform=d.reflectY?'translate(0 430) scale(1 -1)':'';
 const ripples=lakeRipples(w,455,760,style.phase);
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="1730" viewBox="0 0 ${w} 1730">
 <defs>${foreground?'':defs}<pattern id="neighbour-mown" width="100" height="1300" patternUnits="userSpaceOnUse"><rect width="100" height="1300" fill="#cfddb9"/><rect width="50" height="1300" fill="#dbe5c6"/></pattern><clipPath id="world-water"><polygon points="${waterOutline}"/></clipPath></defs>
 <rect width="${w}" height="1730" fill="#c4d3a7"/>${world}
 <g id="continuation-water-details" clip-path="url(#world-water)" fill="none"><path d="${lake.path}" transform="${transform}" stroke="#b8d1cb" stroke-width="3" opacity=".65"/><g stroke="#cfdfd8" stroke-linecap="round">${ripples}</g></g>
 <path d="${fairway}" fill="url(#neighbour-mown)" stroke="#afc18e" stroke-width="7" stroke-linejoin="round"/>
 <path d="${path}" fill="none" stroke="#a8b88d" stroke-width="13"/><path d="${path}" fill="none" stroke="#e1dcc4" stroke-width="8"/>
 <ellipse cx="${w*.16}" cy="942" rx="${w*.065}" ry="35" fill="#a2c487" stroke="#91b579" stroke-width="3" transform="rotate(-30 ${w*.16} 942)"/>
 <g transform="translate(${w*.36},798) rotate(-30)"><path d="${bunkerPath({rx:36,ry:19,shape:1})}" fill="url(#scorecard-sand)" stroke="#c5b58a" stroke-width="2"/></g>
 ${continuationTrees(d,style,lake).map(p=>tree(p.x,p.y,p.r,p.seed)).join('')}
 </svg>`;
}

export const courseArtDefs=`<pattern id="scorecard-sand" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#e6d8b5"/><circle cx="2" cy="3" r=".55" fill="#c5b68f" opacity=".45"/><circle cx="7" cy="7" r=".4" fill="#c5b68f" opacity=".3"/></pattern>`;
