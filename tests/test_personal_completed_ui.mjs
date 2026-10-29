import assert from 'node:assert/strict';
import {completedHoles,topHoles,resultGroup,mountDailyUI} from '../static/daily-ui.mjs';
const holes={};for(let i=0;i<12;i++)holes[i]={id:String(i),date:'2026-10-'+String(i+10).padStart(2,'0'),tee:'tee',flag:'flag',completedAt:String(i).padStart(2,'0'),lastPlayedAt:String(30-i),bestStrokes:{strokes:3+i%4,route:['tee','flag']},bestCleverness:{unrounded:60+i,score:60+i,route:['tee','flag']}};
holes.unfinished={id:'unfinished',date:'2026-10-28',lastPlayedAt:'zz'};
const game={data:{holes},stats:()=>({completed:12,counts:{Eagle:3,Birdie:3,Par:3,Bogey:3,'Double bogey+':0},clevernessByResult:{Eagle:64,Birdie:65,Par:66,Bogey:67},averageBestCleverness:66}),selected:()=>({id:'11',date:'2026-10-21'}),available:()=>Object.values(holes).filter(h=>h.bestStrokes).map(h=>({...h,settings:{start:h.tee,target:h.flag,waypoint:{word:"middle"}}})),latest:()=>({id:'11'}),manifest:{holes:[]},warning:''};
assert.equal(completedHoles(game).length,12);assert.equal(completedHoles(game)[0].id,'11');assert.deepEqual(topHoles(game).map(h=>h.id),['11','10','9']);assert.ok(topHoles(game,'strokes').every(h=>h.bestStrokes.strokes===3));assert.equal(resultGroup(holes[0]),'Eagle');
const nodes=new Map();globalThis.document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,{innerHTML:'',textContent:'',hidden:false,addEventListener(name,fn){this.listener=fn;},setAttribute(){}});return nodes.get(id);}};
const ui=mountDailyUI(game,{onNavigate(){},onToday(){}});ui.render();const card=nodes.get('personal-scorecard');assert.ok(!card.innerHTML.includes('unfinished'));assert.match(card.innerHTML,/Your best three/);assert.match(card.innerHTML,/Cleverness/);assert.match(nodes.get('personal-stats').innerHTML,/aria-pressed="false"/);
nodes.get('personal-stats').listener({target:{closest:()=>({dataset:{resultFilter:'Eagle'}})}});assert.match(card.innerHTML,/Eagle finishes/);assert.ok(!card.innerHTML.includes('<small>Birdie</small>'));assert.match(nodes.get('personal-stats').innerHTML,/aria-pressed="true"/);
console.log('Completed UI passed: completion recency, unfinished exclusion, two top-three rankings, interactive result filter and empty-safe rendering.');

nodes.get('personal-stats').listener({target:{closest:()=>({dataset:{resultFilter:'all'}})}});assert.match(card.innerHTML,/Recent finishes/);assert.ok(!card.innerHTML.includes('Eagle finishes'));assert.match(nodes.get('personal-stats').innerHTML,/data-result-filter="all" aria-pressed="true"/);
nodes.get('personal-stats').listener({target:{closest:()=>({dataset:{resultFilter:'Birdie'}})}});nodes.get('personal-stats').listener({target:{closest:()=>({dataset:{resultFilter:'Birdie'}})}});assert.match(card.innerHTML,/Recent finishes/);
console.log('Result filters clear with All holes or a repeated selection; horizontal rows retain explicit selection state.');

assert.match(nodes.get("personal-stats").innerHTML,/Overall Cleverness/);assert.ok(!nodes.get("personal-stats").innerHTML.includes("Average best cleverness"));assert.match(nodes.get("personal-stats").innerHTML,/aria-label="Average Cleverness">64/);

assert.equal(nodes.get("hole-number").textContent,"#12");assert.match(card.innerHTML,/<th>Hole<\/th>/);assert.ok(!card.innerHTML.includes("<th>Date</th>"));assert.match(nodes.get("personal-hole-picker").innerHTML,/#12 · TEE → MIDDLE → FLAG/);assert.ok(!nodes.get("personal-hole-picker").innerHTML.includes("Oct"));
