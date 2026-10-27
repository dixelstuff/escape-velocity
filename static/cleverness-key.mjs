/** Lightweight identity shared by UI and worker; no lexical table on page load. */
import {semanticRouteKey} from './semantic-analysis.mjs?v=golf-v183';
export const CLEVERNESS_VERSION='cleverness-diagnostics-v2';
export const LEXICAL_DIAGNOSTIC_VERSION='dictionary-morphology-v1';
export const clevernessKey=saved=>JSON.stringify([CLEVERNESS_VERSION,LEXICAL_DIAGNOSTIC_VERSION,semanticRouteKey(saved),saved?.challenge?[saved.challenge.version,saved.challenge.par]:null,saved?.golden_paths??[],saved?.continuous_play]);
