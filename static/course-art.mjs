import {bunkerPath,shoreY,lakeGeometry,lakeContains} from './course-appearance.mjs?v=golf-v39';

/** Quiet, plan-view scorecard artwork. All scenery is behind the played words. */
export function courseSurrounds(d,style,lake=lakeGeometry(d,style)){
 const w=d.width;
 const perimeter=`M-20,-20 H${w+20} V1800 H${w-23} C${w-38},361 ${w-2},305 ${w-16},237 C${w-31},149 ${w-4},93 ${w-24},60 C${w*.83},6 ${w*.73},21 ${w*.64},41 C${w*.48},79 ${w*.4},24 ${w*.29},65 C${w*.16},100 ${w*.09},69 -20,108 Z`;
 const approach=approachGeometry(d,style);
 const approachCut=approach?`<path d="M${approach.x-approach.rx},${approach.y+30} C${approach.x-approach.rx-5},${approach.y-20} ${approach.x-approach.rx*.4},${approach.y-approach.ry} ${approach.x},${approach.y-approach.ry*.7} C${approach.x+approach.rx*.8},${approach.y-approach.ry} ${approach.x+approach.rx},${approach.y} ${approach.x+approach.rx},${approach.y+28} C${approach.x+approach.rx},${approach.y+58} ${approach.x+approach.rx*.65},${approach.y+85} ${approach.x+approach.rx*.65},${approach.y+110} L${approach.x-approach.rx*.7},${approach.y+110} C${approach.x-approach.rx*.7},${approach.y+80} ${approach.x-approach.rx},${approach.y+60} ${approach.x-approach.rx},${approach.y+30} Z" fill="white"/>`:'';
 const lakeCut=lake.shore+` C${w*.87},${shoreY(d.zoneLeft-24,d,style)} ${w*.94},440 ${w+20},440 V1800 H-30 Z`;
 // Union the cuts in a mask, then tint once, so intersecting rough never darkens.
 return `<defs><mask id="rough-union" maskUnits="userSpaceOnUse" x="-30" y="-30" width="${w+60}" height="1830"><path d="${perimeter}" fill="white"/><path d="${lakeCut}" transform="translate(0,-24)" fill="white"/>${approachCut}</mask></defs><rect id="course-rough" x="-30" y="-30" width="${w+60}" height="1830" fill="#aebd88" opacity=".53" mask="url(#rough-union)"/>`;
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
 return {x:d.zoneLeft*.91,y:399+5*Math.sin(style.phase),rx:d.width<700?49:72,ry:33};
}
export function approachLandscape(d,style){
 const p=approachGeometry(d,style);if(!p)return '';
 const sand={rx:p.rx*.58,ry:18,shape:2};
 // Its turf is part of the shared rough mask; only the sand/trees belong here.
 return `<g id="approach-landscape" aria-hidden="true" pointer-events="none" transform="translate(${p.x},${p.y}) rotate(-12)">
 ${style.approach>.59?`<path d="${bunkerPath(sand,3)}" fill="#9daf7d"/><path d="${bunkerPath(sand)}" fill="url(#scorecard-sand)" stroke="#c5b58a" stroke-width="1"/>`:tree(-p.rx*.25,0,14,2)+tree(p.rx*.26,6,12,1)}
 </g>`;
}

export function continuationTrees(d,style,lake=lakeGeometry(d,style)){
 const trees=[[.025,484,15],[.045,531,17],[.98,463,15],[.96,544,17],[.025,730,18],[.975,746,17],[.075,803,14],[.91,863,16],[.02,1030,16],[.97,1120,17]];
 return trees.map(([x,y,r],i)=>({x:x*d.width,y:y+8*Math.sin(style.phase+i),r,seed:i})).filter(p=>!lakeContains(p,lake,p.r+7));
}

/** The next part of the course continues beneath the feedback card at the same scale. */
export function courseContinuation(d,style){
 const w=d.width;
 const lake=lakeGeometry(d,style);
 const fairway=`M${w*.95},458 C${w*.76},468 ${w*.91},603 ${w*.65},649 C${w*.32},710 ${w*.11},768 ${w*.04},925 C${w*.01},1000 ${w*.2},1019 ${w*.26},930 C${w*.36},787 ${w*.52},781 ${w*.79},714 C${w*1.05},652 ${w*1.05},536 ${w*.95},458 Z`;
 const path=`M${w+20},428 C${w*.88},452 ${w*.99},574 ${w*.81},622 C${w*.54},695 ${w*.2},686 -20,870`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="1300" viewBox="0 430 ${w} 1300">
 <defs><pattern id="course-ground" width="100" height="1300" patternUnits="userSpaceOnUse"><rect width="100" height="1300" fill="#d8e7c4"/><rect width="50" height="1300" fill="#e1edcf"/></pattern><pattern id="neighbour-mown" width="100" height="1300" patternUnits="userSpaceOnUse"><rect width="100" height="1300" fill="#cfddb9"/><rect width="50" height="1300" fill="#dbe5c6"/></pattern>${courseArtDefs}</defs>
 <rect y="430" width="${w}" height="1300" fill="url(#course-ground)"/>${courseSurrounds(d,style,lake)}${courseLake(d,style,lake)}
 <path d="${fairway}" fill="url(#neighbour-mown)" stroke="#afc18e" stroke-width="7"/>
 <path d="${path}" fill="none" stroke="#a8b88d" stroke-width="13"/><path d="${path}" fill="none" stroke="#e1dcc4" stroke-width="8"/>
 <ellipse cx="${w*.16}" cy="942" rx="${w*.065}" ry="35" fill="#a2c487" stroke="#91b579" stroke-width="3" transform="rotate(-30 ${w*.16} 942)"/>
 <g transform="translate(${w*.36},798) rotate(-30)"><path d="${bunkerPath({rx:36,ry:19,shape:1})}" fill="url(#scorecard-sand)" stroke="#c5b58a" stroke-width="2"/></g>
 ${continuationTrees(d,style,lake).map(p=>tree(p.x,p.y,p.r,p.seed)).join('')}
 </svg>`;
}

export const courseArtDefs=`<pattern id="scorecard-sand" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#e6d8b5"/><circle cx="2" cy="3" r=".55" fill="#c5b68f" opacity=".45"/><circle cx="7" cy="7" r=".4" fill="#c5b68f" opacity=".3"/></pattern>`;
