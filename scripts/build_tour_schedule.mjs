import {writeFileSync,existsSync} from 'node:fs';
import {rollingManifest as bank} from '../static/rolling-manifest.mjs';
import {buildTourSchedule} from '../static/tour-schedule.mjs';
const file=new URL('../static/tour-manifest.mjs',import.meta.url),existing=existsSync(file)?(await import(file.href+'?build='+Date.now())).tourManifest:null;
const serial=buildTourSchedule(bank,existing);
writeFileSync(file,"import {rollingManifest} from './rolling-manifest.mjs?v=golf-v178';\n// Fixed, non-repeating daily fives from the curated hole bank.\nexport const tourManifest={..."+JSON.stringify(serial)+",holes:rollingManifest.holes};\n");
console.log(`${serial.courses.length} daily five-hole courses, ${serial.courses.length*5} distinct layouts; through ${serial.courses.at(-1).date}.`);
