"""Export the curated real vectors for serverless browser play on GitHub Pages."""
from pathlib import Path
import json, sys
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from engine import Embeddings, DATA

def main():
    e = Embeddings()
    output = ROOT / 'static' / 'model'
    output.mkdir(exist_ok=True)
    # Preserve normalized 300d float32 values exactly; no quantization or preset links.
    e.vectors.astype('<f4').tofile(output / 'vectors.f32')
    (output / 'words.json').write_text(json.dumps(e.words, separators=(',', ':')))
    config = dict(release='finish-v6',puzzles=json.loads((DATA / 'puzzles.json').read_text()), vocabulary=len(e.words),
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
    print(f'Exported {len(e.words):,} real vectors, {(output / "vectors.f32").stat().st_size / 1e6:.1f} MB.')
if __name__ == '__main__': main()
