import {bunkerPath,shoreY,lakeGeometry,lakeContains,greenPath} from './course-appearance.mjs?v=golf-v66';

/** Quiet, plan-view scorecard artwork. All scenery is behind the played words. */
function smoothContour(points){
 const xy=p=>p.map(v=>v.toFixed(3)).join(','),n=points.length;let path='M'+xy(points[0]);
 for(let i=0;i<n;i++){const a=points[(i+n-1)%n],b=points[i],c=points[(i+1)%n],e=points[(i+2)%n];path+=` C${xy([b[0]+(c[0]-a[0])/6,b[1]+(c[1]-a[1])/6])} ${xy([c[0]-(e[0]-b[0])/6,c[1]-(e[1]-b[1])/6])} ${xy(c)}`;}
 return path+' Z';
}
export function courseSurrounds(d,style){
 const w=d.width,end=d.zoneLeft-24,approach=approachGeometry(d,style);
 const bank=x=>{
  let y=shoreY(Math.min(x,end),d,style)-24;
  if(x>end){const t=Math.max(0,Math.min(1,(x-end)/(w-35-end)));y+=(400-y)*t*t*(3-2*t);}
  if(approach)y-=100*Math.exp(-(((x-approach.x)/approach.rx)**2));
  return y;
 };
 const contour=smoothContour([
  [-30,108],[w*.12,82],[w*.28,65],[w*.42,45],[w*.55,57],[w*.68,32],[w*.82,23],[w*.92,40],
  [w-30,85],[w-16,170],[w-15,260],[w-18,340],[w-35,400],
  ...Array.from({length:49},(_,i)=>{const x=w-50-(w-20)*i/48;return [x,bank(x)];}),[-40,250]
 ]);
 // A single smooth fairway boundary leaves one continuous, uniformly shaded rough.
 return `<defs><mask id="rough-union" maskUnits="userSpaceOnUse" x="-50" y="-30" width="${w+100}" height="1830"><rect x="-50" y="-30" width="${w+100}" height="1830" fill="white"/><path d="${contour}" fill="black"/></mask></defs><rect id="course-rough" x="-30" y="-30" width="${w+60}" height="1830" fill="#aebd88" opacity=".53" mask="url(#rough-union)"/>`;
}

function tree(x,y,r,seed){
 const shades=['#718c63','#7c9668','#66845f'];
 const lobes=Array.from({length:7},(_,i)=>{
  const t=i*Math.PI*2/7,rr=r*(.53+.035*((i+seed)%3));
  return `<circle cx="${Math.cos(t)*r*.47}" cy="${Math.sin(t)*r*.43}" r="${rr}"/>`;
 }).join('');
 return `<g transform="translate(${x},${y})"><ellipse cx="4" cy="5" rx="${r*1.06}" ry="${r*.87}" fill="#546c49" opacity=".12"/>
 <g fill="${shades[seed%3]}" stroke="#5f7b55" stroke-width=".65">${lobes}</g>
 <path d="M${-r*.58},${-r*.12} Q${-r*.64},${-r*.7} 0,${-r*.65} Q${r*.38},${-r*.72} ${r*.55},${-r*.24}" fill="none" stroke="#adbf8d" stroke-width="1.5" opacity=".6"/>
 <circle cx="${-r*.15}" cy="${-r*.13}" r="${r*.46}" fill="#9bb282" opacity=".25"/>
 <path d="M-2 7 L1 -3 M1 -3 L-6 -7 M1 -3 L7 -6" fill="none" stroke="#516e4b" stroke-width=".8" opacity=".35"/></g>`;
}

export function courseTrees(d,style,lake=lakeGeometry(d,style)){
 const shift=8*Math.sin(style.phase);
 const trees=[
  [.035,28,14],[.068,42,18],[.105,25,17],[.14,43,13],
  [.24,19,15],[.273,28,12], [.69,15,14],[.729,27,18],[.765,12,14],
  [.981,89,12],[.985,122,13],[.978,332,14],[.975,366,12]
 ];
 return `<g id="course-trees" aria-hidden="true" pointer-events="none">${trees.map(([x,y,r],i)=>({x:x*d.width+(i<9?5*Math.sin(i*2.7+style.phase):0),y:y+(i<9?shift+4*Math.sin(i+style.phase):0),r:r*(d.width<700?.88:1),seed:i})).filter(p=>!lakeContains(p,lake,p.r+7)).map(p=>tree(p.x,p.y,p.r,p.seed)).join('')}</g>`;
}

export function courseBunkers(d,style){
 return `<g aria-hidden="true" pointer-events="none">${style.bunkers.map(b=>`<g class="bunker" transform="translate(${b.x*d.width},${b.y}) rotate(${b.angle})">
 <path d="${bunkerPath(b,5)}" fill="#9daf7d" opacity=".7"/>
 <path d="${bunkerPath(b,2)}" fill="#c5b384"/>
 <path d="${bunkerPath(b)}" fill="url(#scorecard-sand)" stroke="#c8b88e" stroke-width=".8"/>
 <path d="${bunkerPath(b,-4)}" fill="none" stroke="#eee5c8" stroke-width="1.2" opacity=".7"/>
 </g>`).join('')}</g>`;
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
 <path d="M32 413 h27 m8 0 h9 M${d.zoneLeft*.32} 394 h21 m8 0 h6 M${d.zoneLeft*.63} 417 h29" stroke="#d3e1d9" stroke-width="1.1" opacity=".65"/>
 </g>`;
}

function approachGeometry(d,style){
 if(!(style.approach>=.28))return null;
 return {x:d.zoneLeft*.91,y:399+5*Math.sin(style.phase),rx:d.width<700?65:100,ry:45};
}
export function approachLandscape(d,style){
 const p=approachGeometry(d,style);if(!p)return '';
 const sand={rx:p.rx*.68,ry:25,shape:2};
 // Its turf is part of the shared rough mask; only the sand/trees belong here.
 return `<g id="approach-landscape" aria-hidden="true" pointer-events="none" transform="translate(${p.x},${p.y}) rotate(-12)">
 ${style.approach>.59?`<path d="${bunkerPath(sand,3)}" fill="#9daf7d"/><path d="${bunkerPath(sand)}" fill="url(#scorecard-sand)" stroke="#c5b58a" stroke-width="1"/>`:tree(-p.rx*.3,-1,18,2)+tree(p.rx*.18,4,16,1)+tree(p.rx*.46,15,12,0)}
 </g>`;
}

export function continuationTrees(d,style,lake=lakeGeometry(d,style)){
 const trees=[[.025,484,15],[.045,531,17],[.98,463,15],[.96,544,17],[.025,730,18],[.975,746,17],[.075,803,14],[.91,863,16],[.02,1030,16],[.97,1120,17]];
 return trees.map(([x,y,r],i)=>({x:x*d.width,y:y+8*Math.sin(style.phase+i),r,seed:i})).filter(p=>!lakeContains(p,lake,p.r+7));
}

/** One world behind the playable viewport and feedback, with no image edge at their join. */
export function courseContinuation(d,style){
 const w=d.width;
 const lake=lakeGeometry(d,style);
 const fairway=`M${w*.95},458 C${w*.76},468 ${w*.91},603 ${w*.65},649 C${w*.32},710 ${w*.11},768 ${w*.04},925 C${w*.01},1000 ${w*.2},1019 ${w*.26},930 C${w*.36},787 ${w*.52},781 ${w*.79},714 C${w*1.05},652 ${w*1.05},536 ${w*.95},458 Z`;
 const path=`M${w+20},428 C${w*.88},452 ${w*.99},574 ${w*.81},622 C${w*.54},695 ${w*.2},686 -20,870`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="1730" viewBox="0 0 ${w} 1730">
 <defs><pattern id="green-mown" width="22" height="22" patternUnits="userSpaceOnUse"><rect width="22" height="22" fill="#95c87b"/><rect width="11" height="22" fill="#a5d18d"/></pattern><pattern id="course-ground" width="100" height="1300" patternUnits="userSpaceOnUse"><rect width="100" height="1300" fill="#d8e7c4"/><rect width="50" height="1300" fill="#e1edcf"/></pattern><pattern id="neighbour-mown" width="100" height="1300" patternUnits="userSpaceOnUse"><rect width="100" height="1300" fill="#cfddb9"/><rect width="50" height="1300" fill="#dbe5c6"/></pattern>${courseArtDefs}</defs>
 <rect y="-20" width="${w}" height="1780" fill="url(#course-ground)"/>${courseSurrounds(d,style,lake)}${courseBunkers(d,style)}<path d="${greenPath(d,7)}" fill="#b8cf94"/><path d="${greenPath(d)}" fill="url(#green-mown)" stroke="#70a35d" stroke-width="2"/>${courseLake(d,style,lake)}${approachLandscape(d,style)}${courseTrees(d,style,lake)}
 <path d="${fairway}" fill="url(#neighbour-mown)" stroke="#afc18e" stroke-width="7"/>
 <path d="${path}" fill="none" stroke="#a8b88d" stroke-width="13"/><path d="${path}" fill="none" stroke="#e1dcc4" stroke-width="8"/>
 <ellipse cx="${w*.16}" cy="942" rx="${w*.065}" ry="35" fill="#a2c487" stroke="#91b579" stroke-width="3" transform="rotate(-30 ${w*.16} 942)"/>
 <g transform="translate(${w*.36},798) rotate(-30)"><path d="${bunkerPath({rx:36,ry:19,shape:1})}" fill="url(#scorecard-sand)" stroke="#c5b58a" stroke-width="2"/></g>
 ${continuationTrees(d,style,lake).map(p=>tree(p.x,p.y,p.r,p.seed)).join('')}
 </svg>`;
}

export const courseArtDefs=`<pattern id="scorecard-sand" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#e6d8b5"/><circle cx="2" cy="3" r=".55" fill="#c5b68f" opacity=".45"/><circle cx="7" cy="7" r=".4" fill="#c5b68f" opacity=".3"/></pattern>`;
