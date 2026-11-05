import assert from 'node:assert/strict';import fs from 'node:fs';
import {dailyManifest as fullArchive} from '../static/daily-manifest.mjs';

import {adminHoleOrder} from '../static/admin-hole-order.mjs';
import {DailyGame} from '../static/daily-game.mjs';import {holeNumber} from '../static/daily-ui.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';import {waypointLegAccess} from '../static/engine.mjs';import {requirePlayableWord} from '../static/playable-vocabulary.mjs';
const archive={...fullArchive,holes:fullArchive.holes.slice(0,570)},holes=JSON.parse(fs.readFileSync('reports/clear-public-twenty/holes.json')),publicCollection={version:1,view:'clear-public-twenty-v1',entryHoleId:holes[0].id,holes};
const {e}=loadResearchModel(),admin=adminHoleOrder(archive,publicCollection),prior=JSON.parse(fs.readFileSync('reports/novel-public-twenty/validation.json'));
assert.equal(publicCollection.holes.length,20);assert.equal(archive.holes.length,570);assert.deepEqual(archive.holes.slice(530,550),prior.holes);
assert.deepEqual(admin.holes.slice(0,20),publicCollection.holes);assert.equal(new Set(admin.holes.map(h=>h.id)).size,archive.holes.length);
for(const [i,h]of publicCollection.holes.entries()){
 assert.deepEqual(h,archive.holes.find(a=>a.id===h.id));assert.equal(h.settings.par,5);assert.equal(h.settings.continuous_play,true);assert.equal(waypointLegAccess(e,h.settings).allowed,true);
 for(const w of [h.settings.start,h.settings.waypoint.word,h.settings.target]){requirePlayableWord(w);assert.ok(e.index.has(w));}
 for(const m of [publicCollection,admin]){const game=new DailyGame(null,m);assert.equal(holeNumber(game,h),'#'+(i+1));assert.equal(game.latest().id,publicCollection.entryHoleId);}
}
const css=fs.readFileSync('static/style.css','utf8');assert.ok(!css.includes('body:not(.admin-mode) :is(#personal-create-hole,.personal-data'));
console.log('PASS fresh public twenty; shared stable IDs, admin-first ordering, valid vocabulary/direct legs, public export visible');
