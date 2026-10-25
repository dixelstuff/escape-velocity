import {readFile,writeFile} from 'node:fs/promises';
import {balancePublications} from '../static/rolling-schedule.mjs';
const file=new URL('../static/rolling-manifest.mjs',import.meta.url),source=await readFile(file,'utf8');
const manifest=JSON.parse(source.slice(source.indexOf('=')+1).trim().replace(/;$/,''));
Object.assign(manifest,balancePublications(manifest));
await writeFile(file,'// Fixed publication queue for the rolling-course trial. Existing IDs and publication order are immutable.\nexport const rollingManifest='+JSON.stringify(manifest)+';\n');
console.log(`${manifest.publicationIds.length-manifest.initialNewest} daily courses; each par 35–36, with no adjacent par 3. ${manifest.unreleasedIds.length} holes held for future curation.`);
