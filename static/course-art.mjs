import {bunkerPath,shoreY} from './course-appearance.mjs?v=golf-v37';

/** Quiet, plan-view scorecard artwork. All scenery is behind the played words. */
export function courseSurrounds(d){
 const w=d.width;
 return `<path id="course-rough" d="M-20,-20 H${w+20} V450 H${w-23} C${w-38},361 ${w-2},305 ${w-16},237 C${w-31},149 ${w-4},93 ${w-24},60 C${w*.83},6 ${w*.73},21 ${w*.64},41 C${w*.48},79 ${w*.4},24 ${w*.29},65 C${w*.16},100 ${w*.09},69 -20,108 Z" fill="#aebd88" opacity=".53"/>`;
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

export function courseTrees(d,style){
 const shift=8*Math.sin(style.phase);
 const trees=[
  [.035,28,14],[.068,42,18],[.105,25,17],[.14,43,13],
  [.24,19,15],[.273,28,12], [.69,15,14],[.729,27,18],[.765,12,14],
  [.981,89,12],[.985,122,13],[.978,332,14],[.975,366,12]
 ];
 return `<g id="course-trees" aria-hidden="true" pointer-events="none">${trees.map(([x,y,r],i)=>tree(x*d.width+(i<9?5*Math.sin(i*2.7+style.phase):0),y+(i<9?shift+4*Math.sin(i+style.phase):0),r*(d.width<700?.88:1),i)).join('')}</g>`;
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
 <path d="${lake.path}" fill="#b4c3a0" stroke="#b4c3a0" stroke-width="9"/>
 <path id="lake" d="${lake.path}" fill="#91b7bc" stroke="#789f9f" stroke-width="1.3"/>
 <g clip-path="url(#lake-clip)" fill="none" pointer-events="none">
 <path d="${shore(8)}" stroke="#c0d6ce" stroke-width="2" opacity=".7"/>
 <path d="${shore(19)}" stroke="#b1cdca" stroke-width=".9" opacity=".55"/>
 <path d="M32 413 h27 m8 0 h9 M${d.zoneLeft*.32} 394 h21 m8 0 h6 M${d.zoneLeft*.63} 417 h29" stroke="#d3e1d9" stroke-width="1.1" opacity=".65"/>
 </g>`;
}

export const courseArtDefs=`<pattern id="scorecard-sand" width="9" height="9" patternUnits="userSpaceOnUse"><rect width="9" height="9" fill="#e6d8b5"/><circle cx="2" cy="3" r=".55" fill="#c5b68f" opacity=".45"/><circle cx="7" cy="7" r=".4" fill="#c5b68f" opacity=".3"/></pattern>`;
