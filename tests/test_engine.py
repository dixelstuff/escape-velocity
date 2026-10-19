import unittest
from engine import Game
class FakeEmbeddings:
    def __init__(self):
        self.index={w:i for i,w in enumerate(['start','target','forward','backward','behind','arrival','weak'])}
        self.values={tuple(sorted(k)):v for k,v in {
            ('start','target'):.1,('start','forward'):.6,('forward','target'):.4,
            ('forward','backward'):.6,('backward','target'):.2,
            ('start','behind'):.8,('behind','target'):.05,
            ('start','arrival'):.7,('arrival','target'):.7,
            ('start','weak'):.2,('weak','target'):.8,
        }.items()}
    def cosine(self,a,b):return 1. if a==b else self.values.get(tuple(sorted([a,b])),0.)
class RuleTests(unittest.TestCase):
    def setUp(self):self.game=Game(FakeEmbeddings(),'start','target',.5)
    def test_failed_launch_counts_without_moving(self):
        result=self.game.submit('weak');self.assertFalse(result['success']);self.assertTrue(result['inside']);self.assertEqual(self.game.current,'start');self.assertEqual(len(self.game.history),1)
    def test_invalid_and_duplicate_do_not_count(self):
        for word in ['nonsense','start']:
            with self.assertRaises(ValueError):self.game.submit(word)
        self.game.submit('forward')
        with self.assertRaises(ValueError):self.game.submit('FORWARD')
        self.assertEqual(len(self.game.history),1)
    def test_backwards_allowed(self):
        self.game.submit('forward');self.assertTrue(self.game.submit('backward')['success']);self.assertEqual(self.game.current,'backward')
    def test_start_boundary_counts_failed_attempt(self):
        result=self.game.submit('behind');self.assertFalse(result['boundary']);self.assertFalse(result['success']);self.assertEqual(self.game.current,'start');self.assertEqual(len(self.game.history),1)
    def test_automatic_victory_free_final_hop(self):
        self.game.submit('weak');result=self.game.submit('arrival');self.assertTrue(result['won']);self.assertEqual(len(self.game.history),2);self.assertEqual(self.game.route,['start','arrival'])
        with self.assertRaises(ValueError):self.game.submit('target')
    def test_exact_threshold_is_inclusive(self):
        self.game.e.values[tuple(sorted(['start','arrival']))]=.5
        self.game.e.values[tuple(sorted(['arrival','target']))]=.5
        self.assertTrue(self.game.submit('arrival')['won'])
    def test_invalid_threshold_and_identical_endpoints(self):
        with self.assertRaises(ValueError):Game(FakeEmbeddings(),'start','target',1.)
        with self.assertRaises(ValueError):Game(FakeEmbeddings(),'start','start',.5)
class RealEmbeddingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        from engine import Embeddings
        cls.e=Embeddings()
    def test_normalization_and_cosine(self):
        import numpy as np
        self.assertTrue(np.allclose(np.linalg.norm(self.e.vectors,axis=1),1,atol=1e-5))
        self.assertAlmostEqual(self.e.cosine('cheese','cheese'),1,places=5)
        self.assertAlmostEqual(self.e.cosine('cheese','language'),self.e.cosine('language','cheese'),places=6)
        self.assertGreater(self.e.cosine('cheese','milk'),self.e.cosine('cheese','language'))
    def test_every_selected_puzzle_has_a_verified_route(self):
        import json
        from engine import DATA
        analysis=json.loads((DATA.parent/'reports/analysis.json').read_text())
        for p in json.loads((DATA/'puzzles.json').read_text()):
            row=next(r for m in analysis for r in m['results'] if all(r[k]==v for k,v in p.items()))
            game=Game(self.e,**p)
            for word in row['route'][1:]:self.assertTrue(game.submit(word)['success'])
            self.assertTrue(game.won);self.assertEqual(len(game.history),row['attempts'])
if __name__=='__main__':unittest.main()
