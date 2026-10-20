"""Export the curated real vectors for serverless browser play on GitHub Pages."""
from pathlib import Path
import json, sys, gzip, hashlib
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine import Embeddings, DATA

def main():
    e = Embeddings()
    output = ROOT / 'static' / 'model'
    output.mkdir(exist_ok=True)
    # Keep exact historical vectors available only for replaying old saved rounds.
    historical = output / 'vectors.f32'
    if historical.exists() and historical.read_bytes()!=e.vectors[:19989].astype('<f4').tobytes():
        raise ValueError('Historical vector rows changed; preserve the original model before publishing.')
    if not historical.exists():
        e.vectors[:19989].astype('<f4').tofile(historical)
    packed=e.vectors.astype('<f2').tobytes()
    digest=hashlib.sha256(packed).hexdigest()[:16]
    filename=f'vectors-{digest}.f16.gz'
    (output/f'vectors-{digest}.f16').write_bytes(packed)
    (output/filename).write_bytes(gzip.compress(packed, compresslevel=9, mtime=0))
    for pattern in ['vectors-*.f16','vectors-*.f16.gz']:
        for stale in output.glob(pattern):
            if stale.name not in [filename,f'vectors-{digest}.f16']:stale.unlink()
    words_json=json.dumps(e.words,separators=(',', ':'))
    words_file='words-'+hashlib.sha256(words_json.encode()).hexdigest()[:16]+'.json'
    for stale in output.glob('words-*.json'):
        if stale.name != words_file:stale.unlink()
    (output/words_file).write_text(words_json)
    (output / 'words.json').write_text(words_json)
    config = dict(release='golf-v14', vector_file=filename, words_file=words_file, vector_fallback=f'vectors-{digest}.f16', vector_bytes=len(packed), vector_sha256=hashlib.sha256(packed).hexdigest(), historical_vocabulary=19989,puzzles=json.loads((DATA / 'puzzles.json').read_text()), vocabulary=len(e.words),
                  dimensions=e.vectors.shape[1], model='GloVe 6B · 300 dimensions')
    (output / 'config.json').write_text(json.dumps(config, separators=(',', ':')))
    (output / 'ATTRIBUTION.txt').write_text(
        'Word vectors: Stanford GloVe 6B 300d, Wikipedia 2014 + Gigaword 5.\n'
        'https://nlp.stanford.edu/projects/glove/\n'
        'Pretrained vectors: Open Data Commons PDDL 1.0.\n'
        'https://opendatacommons.org/licenses/pddl/1-0/\n'
        'Vocabulary selection uses wordfreq 3.1.1 (frequency data CC BY-SA 4.0) and Princeton WordNet.\n'
        'https://github.com/rspeer/wordfreq\nhttps://wordnet.princeton.edu/\n'
        'See README.md for vocabulary processing and source attribution.\n')
    (ROOT / 'static' / '.nojekyll').touch()
    print(f'Exported {len(e.words):,} vectors; {len(packed)/1e6:.1f} MB half precision, {(output/filename).stat().st_size/1e6:.1f} MB compressed.')
if __name__ == '__main__': main()
