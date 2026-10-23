/** Re-run the same bounded estimator used by custom creation over the saved bank. */
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {Embeddings,decodeHalf} from '../static/engine.mjs';
import {assessWaypointHole,WAYPOINT_PAR_VERSION} from '../static/waypoint-assessment.mjs';
const root=new URL('../',import.meta.url),path=name=>new URL(name,root),read=name=>readFileSync(path(name),'utf8');
const configPath='static/model/config.json',raw=read(configPath),config=JSON.parse(raw),packed=readFileSync(path('static/model/'+config.vector_fallback));
const e=new Embeddings(JSON.parse(read('static/model/'+config.words_file)),decodeHalf(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength)),config.dimensions,new Uint8Array(readFileSync(path('static/model/'+config.hub_file))));
const key=h=>[h.start,h.waypoint?.word,h.target].join('|'),results=new Map(),rows=[];
const started=performance.now();
for(const h of [...config.puzzles,...config.courses.flatMap(c=>c.holes)].filter(h=>h.waypoint)){
 if(!results.has(key(h))){
  const r=assessWaypointHole(e,h);if(!r.allowed)throw Error('Remove this invalid direct-leg layout before estimating par: '+key(h));
  const metadata={version:WAYPOINT_PAR_VERSION,suggested_par:r.suggested_par,sampled_routes:r.sampled_routes,best_sampled_strokes:r.best_sampled_strokes,quick_opening_families:r.quick_opening_families,strong_four_opening_families:r.strong_four_opening_families,...(!r.allowed?{direct_legs:r.legs.filter(l=>l.direct).map(({start,target})=>({start,target}))}:{})};
  results.set(key(h),metadata);rows.push({words:key(h).replaceAll('|',' → '),old:h.par,par:r.suggested_par,...metadata});
 }
 const result=results.get(key(h));h.par=result.suggested_par;h.par_estimate=result;
 delete h.golden_paths;
 const golden=config.golden_holes.find(g=>g.start===h.start&&g.waypoint===h.waypoint.word&&g.target===h.target);
 if(h.par===4&&golden)h.golden_paths=golden.paths;
}
for(const name of ['data/waypoint-holes.json','data/player-waypoint-holes.json','data/new-waypoint-holes.json','data/new-waypoint-holes-3.json','data/five-hole-courses.json']){
 const data=JSON.parse(read(name)),holes=name.includes('five-hole')?data.flatMap(c=>c.holes):data;
 for(const h of holes){const result=results.get(key(h));if(result){h.par=result.suggested_par;h.par_estimate=result;}}
 writeFileSync(path(name),JSON.stringify(data,null,2)+'\n');
}
writeFileSync(path(configPath),JSON.stringify(config)+ (raw.endsWith('\n')?'\n':''));
const count=par=>rows.filter(r=>r.par===par).length,changed=rows.filter(r=>r.old!==r.par).length,flagged=rows.filter(r=>r.direct_legs?.length);
const report=`# Waypoint par backfill\n\nApplied ${WAYPOINT_PAR_VERSION} to all ${rows.length} distinct banked waypoint holes using the exact current model and current creation estimator. ${changed} changed par; ${count(4)} now have par 4 and ${count(5)} have par 5. Existing scorecards and in-progress attempts retain their recorded par.\n\nThis is a bounded structural estimate, not a human difficulty assessment. Existing curated eagle paths are excluded from the estimate, and retained for gameplay only where the resulting par is 4.\n\n${config.retired_waypoint_holes?.length??0} invalid direct-leg layouts have been removed from the selectable bank and local scorecard recovery. Historical scorecards remain intact. New custom creation still rejects these direct legs.\n\nRemoved: ${(config.retired_waypoint_holes??[]).map(h=>[h.start,h.waypoint.word,h.target].join(' → ')).join('; ')}.\n\n| Hole | Previous par | Estimated par | Best sampled strokes | Strong ≤3-shot opening families | Strong ≤4-shot opening families | Direct-leg review |\n|---|---:|---:|---:|---:|---:|---|\n`+rows.map(r=>`| ${r.words} | ${r.old} | ${r.par} | ${r.best_sampled_strokes??'None found'} | ${r.quick_opening_families} | ${r.strong_four_opening_families} | ${r.direct_legs?.map(l=>l.start+' → '+l.target).join('; ')??'—'} |`).join('\n')+'\n';
writeFileSync(path('reports/waypoint-par-backfill.md'),report);
console.log(JSON.stringify({holes:rows.length,changed,par4:count(4),par5:count(5),directLegReviews:flagged.length,elapsedMs:Math.round(performance.now()-started),report:fileURLToPath(path('reports/waypoint-par-backfill.md'))}));
