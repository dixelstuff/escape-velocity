"""Semantic rules independent of HTTP and presentation."""
from pathlib import Path
import json
import numpy as np
DATA = Path(__file__).parent/'data'
class Embeddings:
    def __init__(self, folder=DATA):
        self.words = json.loads((folder/'words.json').read_text())
        self.index = {w:i for i,w in enumerate(self.words)}
        self.vectors = np.load(folder/'vectors.npy', mmap_mode='r')
    def cosine(self, a, b):
        return float(np.clip(self.vectors[self.index[a]] @ self.vectors[self.index[b]], -1, 1))

class Game:
    def __init__(self, embeddings, start, target, threshold=0.5):
        if start not in embeddings.index or target not in embeddings.index: raise ValueError('Choose words in the supported vocabulary.')
        if start == target: raise ValueError('Start and target must differ.')
        if not 0.1 <= threshold <= 0.9: raise ValueError('Threshold must be between 0.1 and 0.9.')
        self.e, self.start, self.current, self.target = embeddings, start, start, target
        self.threshold = float(threshold)
        self.baseline = embeddings.cosine(start, target)
        self.route = [start]; self.history = []; self.won = False
    def submit(self, word):
        word = word.strip().lower()
        if self.won: raise ValueError('Journey complete. Start a new puzzle.')
        if word not in self.e.index: raise ValueError('That word is outside the supported vocabulary. No attempt used.')
        if word == self.start or any(h['word'] == word for h in self.history): raise ValueError('That planet has already been tried. No attempt used.')
        launch = self.e.cosine(self.current, word)
        destination = self.e.cosine(word, self.target)
        boundary = destination + 1e-7 >= self.baseline
        success = boundary and launch + 1e-7 >= self.threshold
        inside = destination + 1e-7 >= self.threshold
        result = dict(word=word, origin=self.current, launch=launch, destination=destination,
                      boundary=boundary, success=success, inside=inside, won=success and inside,
                      attempt=len(self.history)+1)
        self.history.append(result)
        if success: self.current = word; self.route.append(word)
        self.won = result['won']
        return result
    def state(self):
        return dict(start=self.start, current=self.current, target=self.target, threshold=self.threshold,
                    baseline=self.baseline, progress=self.e.cosine(self.current,self.target),
                    attempts=len(self.history), route=self.route, history=self.history, won=self.won)
