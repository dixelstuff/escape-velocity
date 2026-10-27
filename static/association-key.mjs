/** Lightweight UI identity; no lexical table fetched at startup. */
import {clevernessKey} from './cleverness-key.mjs?v=golf-v185';
export const ASSOCIATION_VERSION='association-specificity-v3';
export const PHRASE_VERSION='wordnet3-wiktionary-snapshot-v1';
export const associationKey=s=>JSON.stringify([ASSOCIATION_VERSION,PHRASE_VERSION,clevernessKey(s)]);
