"""Semantic rules independent of HTTP and presentation."""
from pathlib import Path
import json
import numpy as np
DATA = Path(__file__).parent/'data'
LEGACY_RULES = 'fixed-threshold-v1'

def launch_requirement(current_progress, destination, baseline, arrival, minimum=.10, maximum=.21, cap_arrival=True):
    """Measure travel to the finish edge; historical rules retain full overshoot distance."""
    trip = abs(min(destination,arrival)-min(current_progress,arrival)) if cap_arrival else abs(destination-current_progress)
    fraction = min(1., trip / max(1e-6, arrival-baseline))
    return minimum + (maximum-minimum)*fraction, fraction

class Embeddings:
    def __init__(self, folder=DATA):
        self.words = json.loads((folder/'words.json').read_text())
        self.index = {w:i for i,w in enumerate(self.words)}
        self.vectors = np.load(folder/'vectors.npy', mmap_mode='r')
    def cosine(self, a, b):
        return float(np.clip(self.vectors[self.index[a]] @ self.vectors[self.index[b]], -1, 1))

class Game:
    def __init__(self, embeddings, start, target, threshold=.28, mode='fixed', launch_min=None, launch_max=None, rules=None):
        if start not in embeddings.index or target not in embeddings.index: raise ValueError('Choose words in the supported vocabulary.')
        if start == target: raise ValueError('Tee and hole words must differ.')
        if not 0.1 <= threshold <= 0.9: raise ValueError('Green threshold must be between 0.1 and 0.9.')
        if mode not in ['fixed','distance']: raise ValueError('Unknown shot mode.')
        legacy = rules in ['distance-v1','fixed-threshold-v1','fixed-threshold-v2']
        golf = rules is None or rules.startswith('golf-')
        launch_min = (.25 if legacy else .10 if golf else .08) if launch_min is None else launch_min
        modern = rules is None or rules in ['golf-distance-v2','golf-fixed-v2']
        launch_max = (.40 if legacy else .21 if modern else .20 if golf else .18) if launch_max is None else launch_max
        if not .01 <= launch_min <= launch_max <= .9: raise ValueError('Shot requirements must be between 0.01 and 0.9, with short shots no harder than long shots.')
        expected = 'golf-distance-v2' if mode=='distance' else 'golf-fixed-v2'
        if rules is not None and rules not in [expected, *(['golf-distance-v1','distance-v1','distance-v2','distance-v3'] if mode=='distance' else ['golf-fixed-v1',LEGACY_RULES,'fixed-threshold-v2','fixed-threshold-v3'])]: raise ValueError('Unknown rule version.')
        if rules==LEGACY_RULES and mode!='fixed': raise ValueError('Historical rounds use fixed shot strength.')
        self.e, self.start, self.current, self.target = embeddings, start, start, target
        self.threshold, self.mode = float(threshold), mode
        self.launch_min, self.launch_max = float(launch_min), float(launch_max)
        self.rules = rules or expected
        self.modern = modern
        self.automatic_shots = []
        self.baseline = embeddings.cosine(start, target)
        self.route = [start]; self.history = []; self.won = False
        self.best_progress = self.baseline
        self.backward_allowance = .01 if modern else max(0., min(.01, .05*(self.threshold-self.baseline)))
    def submit(self, word):
        word = word.strip().lower()
        if self.won: raise ValueError('Hole complete. Start a new hole.')
        if word not in self.e.index: raise ValueError('That word is outside the supported vocabulary. No shot used.')
        if self.rules==LEGACY_RULES:
            if word==self.start or any(h['word']==word for h in self.history): raise ValueError('That word has already been played. No shot used.')
        elif word==self.current: raise ValueError('The ball is already on that word. No shot used.')
        launch = self.e.cosine(self.current, word)
        destination = self.e.cosine(word, self.target)
        required, trip_fraction = launch_requirement(self.e.cosine(self.current,self.target), destination, self.baseline, self.threshold, self.launch_min, self.launch_max, cap_arrival=self.rules in ['distance-v3','golf-distance-v1','golf-distance-v2'])
        if self.mode=='fixed': required = self.threshold
        boundary = destination + 1e-7 >= self.baseline
        forward = destination + 1e-7 >= self.e.cosine(self.current,self.target)
        forward_only = self.rules in ['distance-v2','distance-v3','fixed-threshold-v3']
        is_golf = self.rules.startswith('golf-')
        connected = launch + 1e-7 >= required
        backtrack = self.modern and not forward and word in self.route
        safe = backtrack or destination + 1e-7 >= self.best_progress-self.backward_allowance
        success = connected and safe if is_golf else boundary and (not forward_only or forward) and connected
        inside = destination + 1e-7 >= self.threshold
        result = dict(word=word, origin=self.current, launch=launch, destination=destination,
                      required=required, trip_fraction=trip_fraction, boundary=boundary, success=success,
                      inside=inside, won=success and inside, attempt=len(self.history)+1)
        if forward_only or is_golf: result['forward'] = forward
        if is_golf: result.update(connected=connected, safe=safe, outcome='green' if result['won'] else 'miss' if not connected else 'water' if not safe else 'backtrack' if backtrack else 'recovery' if not forward else 'landed')
        if self.modern: result['backtrack'] = backtrack
        self.history.append(result)
        if success:
            self.current = word; self.route.append(word)
            self.best_progress = destination if backtrack else max(self.best_progress,destination)
        if self.modern and result['won'] and word != self.target:
            automatic = dict(word=self.target, origin=word, automatic=True, outcome='putt', attempt=len(self.history)+1, success=True, inside=True, won=True)
            self.automatic_shots.append(automatic)
            result['automatic_shot'] = automatic
            self.current = self.target; self.route.append(self.target)
        self.won = result['won']
        return result
    def state(self):
        return dict(start=self.start, current=self.current, target=self.target, threshold=self.threshold,
                    mode=self.mode, rules=self.rules, launch_min=self.launch_min, launch_max=self.launch_max,
                    baseline=self.baseline, progress=self.e.cosine(self.current,self.target),
                    attempts=len(self.history)+len(self.automatic_shots), route=self.route, history=self.history, won=self.won,
                    **(dict(automatic_shots=self.automatic_shots) if self.modern else {}),
                    **(dict(best_progress=self.best_progress,backward_allowance=self.backward_allowance) if self.rules.startswith('golf-') else {}))
