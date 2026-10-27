/** V3 comparison retains its historical targeted annotations; V4 uses the source-neutral core. */
import {AssociationAnalyser as Core} from './association-core.mjs?v=golf-v187';
import {pairEvidence,phraseCoverage} from './phrase-evidence.mjs?v=golf-v187';
export * from './association-core.mjs?v=golf-v187';
export class AssociationAnalyser extends Core{constructor(e,semantic,cleverness){super(e,semantic,cleverness,{pairEvidence,phraseCoverage});}}
