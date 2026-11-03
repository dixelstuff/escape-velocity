/** Reorder the public view by stable IDs. Never retire, rewrite or duplicate archive holes. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';
import {isRetiredHole} from '../static/hole-retirement.mjs';
const dir='reports/public-fifty-rebalanced/',plan=JSON.parse(fs.readFileSync(dir+'selection.json'));
assert.equal(plan.selection.length,50);assert.equal(new Set(plan.selection.map(r=>r.id)).size,50);
const holes=plan.selection.map((r,i)=>{const h=archive.holes.find(h=>h.id===r.id);assert.ok(h&&!isRetiredHole(h));assert.equal(r.position,i+1);assert.deepEqual(r.words,[h.settings.start,h.settings.waypoint.word,h.settings.target]);return h;});
const manifest={version:1,view:plan.version,scopeToManifest:true,includeCustom:false,entryHoleId:holes[0].id,holes};
fs.writeFileSync('static/public-manifest.mjs','/** Public selection of shared stable archive definitions; display numbers may change. */\nexport const dailyManifest='+JSON.stringify(manifest)+';\n');
fs.writeFileSync(dir+'validation.json',JSON.stringify({archiveSha256:crypto.createHash('sha256').update(JSON.stringify(archive)).digest('hex'),archiveDefinitions:archive.holes.length,publicIds:holes.map(h=>h.id),playtested:20,new:30},null,2)+'\n');
console.log('Public mix: 20 playtested + 30 newer holes. Archive untouched.');
