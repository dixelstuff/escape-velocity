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
    config = dict(release='golf-v163', vector_file=filename, words_file=words_file, vector_fallback=f'vectors-{digest}.f16', vector_bytes=len(packed), vector_sha256=hashlib.sha256(packed).hexdigest(), historical_vocabulary=19989,puzzles=[dict(p,finish_mode='range',success_mode=True,success_version='stroke-play-v1',par=p.get('par',3)) for p in json.loads((DATA / 'puzzles.json').read_text())+json.loads((DATA / 'comparison-holes.json').read_text())+json.loads((DATA / 'ls-comparison-holes.json').read_text())+json.loads((DATA / 'fresh-course.json').read_text())+json.loads((DATA / 'player-discoveries.json').read_text())+json.loads((DATA / 'waypoint-holes.json').read_text())+json.loads((DATA / 'player-waypoint-holes.json').read_text())+json.loads((DATA / 'new-waypoint-holes.json').read_text())+json.loads((DATA / 'new-waypoint-holes-3.json').read_text())+json.loads((DATA / '24-october-holes.json').read_text())+json.loads((DATA / 'new-mixed-holes.json').read_text())], vocabulary=len(e.words),
                  dimensions=e.vectors.shape[1], model='GloVe 6B · 300 dimensions')
    config['retired_waypoint_holes']=json.loads((DATA / 'retired-waypoint-holes.json').read_text())
    config['courses']=json.loads((DATA / 'five-hole-courses.json').read_text())
    config['golden_holes']=json.loads((DATA/'golden-paths.json').read_text())['holes']
    for hole in [*config['puzzles'],*[h for course in config['courses'] for h in course['holes']]]:
        chosen=next((g for g in config['golden_holes'] if g['start']==hole['start'] and g['target']==hole['target'] and g.get('waypoint')==hole.get('waypoint',{}).get('word')),None)
        if chosen and hole.get('par',3)<=4:hole['golden_paths']=chosen['paths']
    from wordfreq import zipf_frequency
    endpoints=set()
    def collect(value):
        if isinstance(value,dict):
            for key,item in value.items():
                if key in ('start','target','word') and isinstance(item,str): endpoints.add(item)
                else: collect(item)
        elif isinstance(value,list):
            for item in value: collect(item)
    collect(config['puzzles']); collect(config['courses'])
    seed=[i for i,w in enumerate(e.words) if w in endpoints]
    common=set(sorted(range(len(e.words)),key=lambda i:zipf_frequency(e.words[i],'en'),reverse=True)[:5000])
    starter=sorted(common-set(seed))
    remaining=sorted(set(range(len(e.words)))-set(seed)-common)
    def pack(rows):
        content=e.vectors[rows].astype('<f2').tobytes()
        sha=hashlib.sha256(content).hexdigest(); name=f'pack-{sha[:16]}.f16'
        (output/name).write_bytes(content)
        (output/(name+'.gz')).write_bytes(gzip.compress(content,compresslevel=9,mtime=0))
        return dict(file=name+'.gz',raw_file=name,rows=rows,bytes=len(content),sha256=sha)
    manifest=dict(model_sha256=config['vector_sha256'],dimensions=config['dimensions'],seed=pack(seed),starter=pack(starter),background=[pack(remaining[i:i+2000]) for i in range(0,len(remaining),2000)])
    content=json.dumps(manifest,separators=(',',':')).encode()
    name='packs-'+hashlib.sha256(content).hexdigest()[:16]+'.json'
    (output/name).write_bytes(content)
    config['progressive']=dict(manifest_file=name,starter_words=5000)
    retained={name}|{part[key] for part in [manifest['seed'],manifest['starter'],*manifest['background']] for key in ('file','raw_file')}
    for stale in [*output.glob('pack-*.f16*'),*output.glob('packs-*.json')]:
        if stale.name not in retained:stale.unlink()
    hub_meta=json.loads((output/'hubs.json').read_text()) if (output/'hubs.json').exists() else {}
    if hub_meta.get('vector_sha256')!=config['vector_sha256'] or hub_meta.get('words_file')!=words_file:
        from build_hubs import main as build_hubs
        build_hubs(config)
        config['retired_waypoint_holes']=json.loads((DATA / 'retired-waypoint-holes.json').read_text())
    config['courses']=json.loads((DATA / 'five-hole-courses.json').read_text())
    hub_meta=json.loads((output/'hubs.json').read_text())
    from build_abtt import build_abtt
    trial=build_abtt(e.words,DATA).astype('<f2').tobytes()
    trial_sha=hashlib.sha256(trial).hexdigest()
    trial_name=f'abtt1-{trial_sha[:16]}.f16'
    for stale in output.glob('abtt1-*.f16*'):
        if stale.name not in [trial_name,trial_name+'.gz']:stale.unlink()
    (output/trial_name).write_bytes(trial)
    (output/(trial_name+'.gz')).write_bytes(gzip.compress(trial,compresslevel=9,mtime=0))
    config['word_models']={'abtt-1-v1':dict(model='GloVe 6B · ABTT · 1 component (trial)',
        vector_file=trial_name+'.gz',vector_fallback=trial_name,vector_bytes=len(trial),vector_sha256=trial_sha,
        algorithm='Subtract full 400,000-row raw-vector mean; remove top centred PCA component; normalise; pack float16.',
        defaults=dict(launch_min=0.09526148742408946,launch_max=0.2226404434066529,threshold=0.26797642291676005))}
    config.update(hub_file=hub_meta['file'],hub_sha256=hub_meta['sha256'],hub_version=hub_meta['version'])
    from build_ls import build_ls
    config['word_models']['ls15-v1']=build_ls(config)
    from build_word_families import main as build_word_families
    build_word_families(config)
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
