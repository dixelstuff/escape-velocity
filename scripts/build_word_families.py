"""Compile a tiny, dictionary-confirmed noun/adjective rescue table into the browser module."""
from pathlib import Path
import json,numpy as np
from build_word_family_candidates import candidate_pairs
ROOT=Path(__file__).resolve().parents[1]
def main(config=None):
    folder=ROOT/'static/model';config=config or json.loads((folder/'config.json').read_text())
    words=json.loads((folder/config['words_file']).read_text());index={w:i for i,w in enumerate(words)}
    vectors=np.fromfile(folder/config['vector_fallback'],dtype='<f2').astype('float64').reshape(len(words),config['dimensions'])
    pairs=[(a,b)for a,b in candidate_pairs(set(words),ROOT/'data/wordnet.zip')if vectors[index[a]]@vectors[index[b]]>.65]
    source='''/** Generated from explicit WordNet noun/adjective links; never suffix guesses. */
export const WORD_FAMILY_VERSION='noun-adjective-v1';
const pairs='''+json.dumps(pairs,separators=(',',':'))+''';
const variants=new Map();
for(const[a,b]of pairs)for(const[word,other]of[[a,b],[b,a]]){if(!variants.has(word))variants.set(word,[]);variants.get(word).push(other);}
export function familyVariants(word){return variants.get(word)??[];}
'''
    (ROOT/'static/word-families.mjs').write_text(source);print(f'Compiled {len(pairs)} distinct noun/adjective pairs.')
if __name__=='__main__':main()
