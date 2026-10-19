"""Semantic rules independent of HTTP and presentation."""
from pathlib import Path
import json
import numpy as np
DATA = Path(__file__).parent/'data'
LEGACY_RULES = 'fixed-threshold-v1'

def launch_requirement(current_progress, destination, baseline, arrival, minimum=.25, maximum=.40):
    """Trip length as a fraction of the start-to-arrival journey, in either direction."""
    fraction = min(1., abs(destination-current_progress) / max(1e-6, arrival-baseline))
    return minimum + (maximum-minimum)*fraction, fraction

class Embeddings:
    def __init__(self, folder=DATA):
        self.words = json.loads((folder/'words.json').read_text())
        self.index = {w:i for i,w in enumerate(self.words)}
        self.vectors = np.load(folder/'vectors.npy', mmap_mode='r')
    def cosine(self, a, b):
        return float(np.clip(self.vectors[self.index[a]] @ self.vectors[self.index[b]], -1, 1))

class Game:
    def __init__(self, embeddings, start, target, threshold=.45, mode='fixed', launch_min=.25, launch_max=.40, rules=None):
        if start not in embeddings.index or target not in embeddings.index: raise ValueError('Choose words in the supported vocabulary.')
        if start == target: raise ValueError('Start and target must differ.')
        if not 0.1 <= threshold <= 0.9: raise ValueError('Arrival threshold must be between 0.1 and 0.9.')
        if mode not in ['fixed','distance']: raise ValueError('Unknown launch mode.')
        if not .1 <= launch_min <= launch_max <= .9: raise ValueError('Launch requirements must be between 0.1 and 0.9, with short hops no harder than long jumps.')
        expected = 'distance-v1' if mode=='distance' else 'fixed-threshold-v2'
        if rules is not None and rules not in [expected, LEGACY_RULES]: raise ValueError('Unknown rule version.')
        if rules==LEGACY_RULES and mode!='fixed': raise ValueError('Legacy journeys use fixed launches.')
        self.e, self.start, self.current, self.target = embeddings, start, start, target
        self.threshold, self.mode = float(threshold), mode
        self.launch_min, self.launch_max = float(launch_min), float(launch_max)
        self.rules = rules or expected
        self.baseline = embeddings.cosine(start, target)
        self.route = [start]; self.history = []; self.won = False
    def submit(self, word):
        word = word.strip().lower()
        if self.won: raise ValueError('Journey complete. Start a new puzzle.')
        if word not in self.e.index: raise ValueError('That word is outside the supported vocabulary. No attempt used.')
        if self.rules==LEGACY_RULES:
            if word==self.start or any(h['word']==word for h in self.history): raise ValueError('That planet has already been tried. No attempt used.')
        elif word==self.current: raise ValueError('You are already on that planet. No attempt used.')
        launch = self.e.cosine(self.current, word)
        destination = self.e.cosine(word, self.target)
        required, trip_fraction = launch_requirement(self.e.cosine(self.current,self.target), destination, self.baseline, self.threshold, self.launch_min, self.launch_max)
        if self.mode=='fixed': required = self.threshold
        boundary = destination + 1e-7 >= self.baseline
        success = boundary and launch + 1e-7 >= required
        inside = destination + 1e-7 >= self.threshold
        result = dict(word=word, origin=self.current, launch=launch, destination=destination,
                      required=required, trip_fraction=trip_fraction, boundary=boundary, success=success,
                      inside=inside, won=success and inside, attempt=len(self.history)+1)
        self.history.append(result)
        if success: self.current = word; self.route.append(word)
        self.won = result['won']
        return result
    def state(self):
        return dict(start=self.start, current=self.current, target=self.target, threshold=self.threshold,
                    mode=self.mode, rules=self.rules, launch_min=self.launch_min, launch_max=self.launch_max,
                    baseline=self.baseline, progress=self.e.cosine(self.current,self.target),
                    attempts=len(self.history), route=self.route, history=self.history, won=self.won)
