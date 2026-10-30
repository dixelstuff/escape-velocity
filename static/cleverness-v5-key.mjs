import {clevernessV4Key} from './cleverness-v4-key.mjs?v=uk-us-v1';
export const CLEVERNESS_V5_VERSION='semantic-strategy-v5';
export const clevernessV5Key=s=>JSON.stringify([CLEVERNESS_V5_VERSION,'wordnet-only-v1',clevernessV4Key(s)]);
