"""Download and stream official GloVe archive; retain normalized common-word vectors."""
from pathlib import Path
import argparse, json, re, urllib.request, zipfile
import numpy as np
from wordfreq import top_n_list, zipf_frequency
ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'data'
SOURCES = {
    'glove.6B.zip': 'https://nlp.stanford.edu/data/glove.6B.zip',
    'wordnet.zip': 'https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip',
}
def main():
    p = argparse.ArgumentParser(); p.add_argument('--limit', type=int, default=20000); args = p.parse_args()
    DATA.mkdir(exist_ok=True)
    for name, url in SOURCES.items():
        if not (DATA/name).exists():
            print('Downloading', url, flush=True)
            temp = DATA/(name+'.part'); urllib.request.urlretrieve(url, temp); temp.rename(DATA/name)
    # Index files lowercase even proper names; use original case in data files.
    lemmas = set()
    with zipfile.ZipFile(DATA/'wordnet.zip') as z:
        for pos in ['noun','verb','adj','adv']:
            for line in z.read('wordnet/data.'+pos).decode().splitlines():
                if not line or line.startswith(' '): continue
                fields = line.split('|',1)[0].split()
                count = int(fields[3],16)
                for word in fields[4:4+2*count:2]:
                    word = re.sub(r'\([a-z]+\)$','',word)  # adjective syntactic markers
                    if re.fullmatch('[a-z]{3,18}',word): lemmas.add(word)
    excluded = set('john james william robert david michael mary peter paul george thomas richard charles joseph andrew mark jesus christ america american english british french german chinese indian christian islamic muslim jewish roman russian european african asian london paris china india japan italy canada australia california york washington fuck fucking shit bullshit asshole cunt nigger nigga faggot'.split())
    ranked = [w for w in top_n_list('en', 150000) if w in lemmas and w not in excluded and zipf_frequency(w,'en') >= 2.5]
    # Drop redundant regular plurals/participles only if the base is supported and more frequent.
    candidates = set(ranked)
    def inflected(w):
        bases = ([w[:-1]] if w.endswith('s') and not w.endswith('ss') else [])
        if w.endswith('ing'): bases += [w[:-3], w[:-3]+'e']
        if w.endswith('ed'): bases += [w[:-2], w[:-1]]
        return any(b in candidates and zipf_frequency(b,'en') >= zipf_frequency(w,'en') for b in bases)
    ranked = [w for w in ranked if not inflected(w)][:args.limit]
    wanted = set(ranked); found = {}
    with zipfile.ZipFile(DATA/'glove.6B.zip') as z:
        with z.open('glove.6B.300d.txt') as source:
            for i, line in enumerate(source):
                word, _, raw = line.partition(b' ')
                w = word.decode('utf8')
                if w in wanted:
                    v = np.fromstring(raw.decode(), sep=' ', dtype=np.float32)
                    if len(v) != 300 or not np.isfinite(v).all(): raise ValueError(w)
                    norm = np.linalg.norm(v)
                    if norm > 0: found[w] = v/norm
                if i % 100000 == 0: print('Read', i, 'vectors; retained', len(found), flush=True)
    words = [w for w in ranked if w in found]
    np.save(DATA/'vectors.npy', np.stack([found[w] for w in words]))
    (DATA/'words.json').write_text(json.dumps(words))
    (DATA/'metadata.json').write_text(json.dumps({'source':SOURCES, 'dimensions':300, 'words':len(words), 'frequency_floor':2.5, 'selection':'wordfreq English frequency rank intersected with lowercase single-word WordNet lemmas; regular inflections and common names excluded'}, indent=2))
    print('Prepared', len(words), 'words.', flush=True)
if __name__ == '__main__': main()
