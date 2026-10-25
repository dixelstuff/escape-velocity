/** Curated semantic routes, replayed against the actual engine before publication. */
import {readFileSync,writeFileSync} from 'node:fs';
import {Embeddings,decodeHalf,Game,waypointLegAccess} from '../static/engine.mjs';
import {assessWaypointHole,WAYPOINT_PAR_VERSION} from '../static/waypoint-assessment.mjs';
import {insertDailyTrios} from '../static/rolling-schedule.mjs';
import {publicationDays} from '../static/rolling-course.mjs';
const root=new URL('../',import.meta.url),file=f=>new URL(f,root),read=f=>readFileSync(file(f),'utf8');
const config=JSON.parse(read('static/model/config.json')),manifest=JSON.parse(read('static/rolling-manifest.mjs').split('export const rollingManifest=')[1].trim().replace(/;$/,''));
const source='data/25-october-daily-holes.json';
if(manifest.dailyRelease?.date==='2026-10-25')throw Error('This editorial release is already installed; do not insert it twice.');
const raw=readFileSync(file('static/model/'+config.vector_fallback)),e=new Embeddings(JSON.parse(read('static/model/'+config.words_file)),decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),config.dimensions,new Uint8Array(readFileSync(file('static/model/'+config.hub_file))));
const proposals=[
 // One par 3, par 4 and par 5 per day. Routes are verification examples, not hints in play.
 ['oyster',null,'jewellery',['pearl'],'Pearls come from oysters and become jewellery.',true],
 ['honeycomb','architecture','orchestra',['geometry','acoustics'],'Hexagonal geometry links honeycombs to architectural design; architectural acoustics link to orchestras.'],
 ['rabbit','computing','bakery',['mouse','chip','cookie'],'A mouse shifts from animal to computer hardware; a chip shifts from silicon to a cookie ingredient.'],
 ['violin',null,'archery',['bow'],'Bow has two precise, familiar meanings.',true],
 ['hamster','exercise','electricity',['treadmill','wheel','generator'],'A hamster exercises on a treadmill or wheel; rotation drives a generator.'],
 ['flute','plumbing','botany',['brass','pipe','water','garden'],'Brass and pipes connect the instrument to plumbing; water connects plumbing to growing plants.'],
 ['bishop',null,'fortress',['castle'],'Chess provides the bridge from a bishop to a castle, then to fortification.'],
 ['apricot','perfumery','chemistry',['fragrance','organic'],'Fruit fragrance leads to perfumery and organic chemistry.'],
 ['tortoise','navigation','wedding',['turtle','sea','cruise'],'A sea turtle sets up navigation; a cruise can be a honeymoon journey.'],
 ['loom',null,'spider',['weaving'],'A loom and a spider both weave.'],
 ['hammock','textiles','navigation',['rope','bamboo','rafts'],'Ropes and hammock materials lead through textile craft to bamboo rafts.'],
 ['hourglass','geology','computer',['quartz','mineral','crystal'],'Sand and quartz connect the hourglass to geology; crystals are used in computer timing and electronics.'],
 ['acorn',null,'vineyard',['oak'],'An acorn becomes an oak; oak barrels are familiar in wine making.'],
 ['marble','geology','music',['limestone','rock'],'Marble and limestone establish geology, then rock changes meaning to music.'],
 ['chameleon','theatre','medicine',['mask','costume','mask','surgery'],'Disguise and costume reach theatre; a mask shifts to surgical use on the second leg.'],
 ['glacier',null,'glass',['ice'],'Ice and glass share transparent, brittle material qualities.'],
 ['teapot','ceramics','astronaut',['ceramic','insulation','shuttle'],'Ceramic teapots lead to heat-insulating ceramics used on the space shuttle.'],
 ['anemone','photography','medicine',['coral','underwater','photography'],'Coral and anemones set up underwater photography; photography also serves medical documentation.'],
];
const holes=[],checks=[];
for(const [index,[start,waypoint,target,route,reason,golden]] of proposals.entries()){
 const expected=3+index%3,s={start,target,threshold:.27,mode:'distance',launch_min:.095,launch_max:.215,finish_mode:'range',success_mode:true,success_version:'stroke-play-v1',par:expected,course_set:'daily-discoveries-2026-10-25',course_number:index+1,...waypoint?{waypoint:{word:waypoint,threshold:.265,turn:Math.floor(index/3)%2?'up':'down'}}:{},...golden?{golden_paths:[route]}:{}};
 if([start,waypoint,target,...route].filter(Boolean).some(w=>!e.index.has(w)))throw Error('Unsupported word in '+start);
 if(config.puzzles.some(h=>h.start===start&&h.target===target&&(h.waypoint?.word??null)===waypoint))throw Error('Duplicate banked hole '+start);
 if(waypoint){const a=assessWaypointHole(e,s);if(!a.allowed||a.suggested_par!==expected)throw Error(`${start}: expected par ${expected}, got ${a.suggested_par}, direct allowed ${a.allowed}`);s.par_estimate={version:WAYPOINT_PAR_VERSION,suggested_par:a.suggested_par,sampled_routes:a.sampled_routes,best_sampled_strokes:a.best_sampled_strokes,quick_opening_families:a.quick_opening_families,strong_four_opening_families:a.strong_four_opening_families};}
 else if(new Game(e,start,target,.27,{...s,golden_paths:[]}).submit(target).success)throw Error('Direct endpoint accessible: '+start);
 const g=new Game(e,start,target,.27,{...s,challenge:{version:'stroke-play-v1',par:expected,attempt:1,id:'curation'}}),events=[];
 for(const word of route){if(g.won)break;const event=g.submit(word);if(!event.success)throw Error(`${start}: ${word} failed (${event.launch} / ${event.required})`);events.push({word,stage:event.leg??null,contact:event.launch,required:event.required,destination:event.destination,waypointReached:!!event.waypoint_reached});}
 if(!g.won||g.state().attempts>expected)throw Error(`Route did not finish within par: ${start}`);
 holes.push(s);checks.push({start,waypoint,target,par:expected,route,strokes:g.state().attempts,reason,events});console.log(start,waypoint??'',target,'par',expected,'route',g.state().attempts);
}
// Keep a compact legacy queue fixture so storage migration tests retain the old daily-one behavior.
writeFileSync(file('tests/rolling-legacy-publications.json'),JSON.stringify(manifest.publicationIds)+'\n');
const newIds=holes.map((settings,i)=>{const id=`daily-20261025-${String(i+1).padStart(2,'0')}`;manifest.holes.push({id,settings});return id;});
const chronological=[];for(let i=0;i<newIds.length;i+=3)chronological.push(...newIds.slice(i,i+3).reverse());
const scheduled=insertDailyTrios(manifest,chronological,'2026-10-25');scheduled.dailyRelease={date:'2026-10-25',holeIds:newIds};
config.puzzles.push(...holes);writeFileSync(file(source),JSON.stringify(holes,null,2)+'\n');writeFileSync(file('data/25-october-daily-route-checks.json'),JSON.stringify(checks,null,2)+'\n');
writeFileSync(file('static/model/config.json'),JSON.stringify(config));
writeFileSync(file('static/rolling-manifest.mjs'),'// Fixed daily-trio publication queue. Hole IDs and submitted daily snapshots remain immutable.\nexport const rollingManifest='+JSON.stringify(scheduled)+';\n');
writeFileSync(file('reports/daily-discoveries-25-october.md'),'# Daily discoveries · 25 October 2026\n\n18 new layouts, six daily trios of par 3 / 4 / 5. All routes below were semantically reviewed and replayed with the current model, word-family rules and actual automatic finish. Both direct dogleg legs are rejected. Pars use the existing bounded estimator; no gameplay thresholds changed. Only OYSTER → PEARL → JEWELLERY and VIOLIN → BOW → ARCHERY have curated hole-in-one overrides.\n\nThese routes are spoilers for verification, not the only valid routes.\n\n| Hole | Par | Verified words | Strokes | Semantic rationale |\n|---|---:|---|---:|---|\n'+checks.map(r=>`| ${[r.start,r.waypoint,r.target].filter(Boolean).join(' → ')} | ${r.par} | ${r.route.join(' → ')} | ${r.strokes} | ${r.reason} |`).join('\n')+'\n');
console.log(`${publicationDays(scheduled)} scheduled daily courses; previous upcoming holes delayed six days.`);
