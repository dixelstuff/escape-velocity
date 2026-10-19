import unittest
from engine import Game, launch_requirement
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
    def setUp(self):self.game=Game(FakeEmbeddings(),'start','target',.5,rules='fixed-threshold-v2')
    def test_failed_launch_counts_without_moving(self):
        result=self.game.submit('weak');self.assertFalse(result['success']);self.assertTrue(result['inside']);self.assertEqual(self.game.current,'start');self.assertEqual(len(self.game.history),1)
    def test_invalid_and_current_word_do_not_count(self):
        for word in ['nonsense','start']:
            with self.assertRaises(ValueError):self.game.submit(word)
        self.game.submit('forward')
        with self.assertRaises(ValueError):self.game.submit('FORWARD')
        self.assertEqual(len(self.game.history),1)
    def test_revisit_start_and_retry_failed_words(self):
        self.game.submit('weak');self.game.submit('weak')
        self.game.submit('forward');self.assertTrue(self.game.submit('start')['success'])
        self.assertTrue(self.game.submit('forward')['success'])
        self.assertEqual(len(self.game.history),5)
        self.assertEqual(self.game.route,['start','forward','start','forward'])
    def test_legacy_repeats_remain_rejected(self):
        game=Game(FakeEmbeddings(),'start','target',.5,rules='fixed-threshold-v1')
        game.submit('weak')
        with self.assertRaises(ValueError):game.submit('weak')
    def test_distance_requirements_are_symmetric_and_capped(self):
        self.assertEqual(launch_requirement(.2,.2,.1,.5)[0],.08)
        self.assertAlmostEqual(launch_requirement(.1,.5,.1,.5)[0],.18)
        self.assertAlmostEqual(launch_requirement(.1,1,.1,.5)[0],.18)
        self.assertEqual(launch_requirement(.2,.3,.1,.5),launch_requirement(.3,.2,.1,.5))
    def test_short_hop_succeeds_at_lower_similarity(self):
        e=FakeEmbeddings();e.values[tuple(sorted(['start','forward']))]=.38
        game=Game(e,'start','target',.5,mode='distance',rules='distance-v1')
        result=game.submit('forward')
        self.assertTrue(result['success']);self.assertLess(result['required'],.38)
        self.assertEqual(game.threshold,.5)
    def test_distance_one_attempt_victory_remains_possible(self):
        e=FakeEmbeddings();e.values[tuple(sorted(['start','arrival']))]=.4
        game=Game(e,'start','target',.5,mode='distance',rules='distance-v1')
        self.assertTrue(game.submit('arrival')['won']);self.assertEqual(len(game.history),1)
    def test_long_jump_still_requires_connection(self):
        e=FakeEmbeddings();e.values[tuple(sorted(['start','arrival']))]=.39
        game=Game(e,'start','target',.5,mode='distance',rules='distance-v1')
        result=game.submit('arrival');self.assertTrue(result['inside']);self.assertFalse(result['success']);self.assertAlmostEqual(result['required'],.4)
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
    def test_forward_only_blocks_backward_and_counts_attempt(self):
        game=Game(FakeEmbeddings(),'start','target',.5)
        game.submit('forward')
        event=game.submit('backward')
        self.assertFalse(event['forward']);self.assertFalse(event['success'])
        self.assertEqual(game.current,'forward');self.assertEqual(len(game.history),2)
        self.assertFalse(game.submit('start')['success'])
    def test_forward_failed_planet_can_be_retried_from_new_origin(self):
        e=FakeEmbeddings();e.values[tuple(sorted(['forward','weak']))]=.6
        game=Game(e,'start','target',.5)
        self.assertFalse(game.submit('weak')['success'])
        game.submit('forward')
        self.assertTrue(game.submit('weak')['won'])
        self.assertEqual(len(game.history),3)
    def test_new_defaults_and_legacy_defaults(self):
        game=Game(FakeEmbeddings(),'start','target',mode='distance')
        self.assertEqual((game.threshold,game.launch_min,game.launch_max),(.12,.08,.18))
        old=Game(FakeEmbeddings(),'start','target',.45,mode='distance',rules='distance-v1')
        self.assertEqual((old.launch_min,old.launch_max),(.25,.4))
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
        analysis=json.loads((DATA.parent/'reports/forward-analysis.json').read_text())
        for p in json.loads((DATA/'puzzles.json').read_text()):
            row=next(r for r in analysis['results'] if all(r[k]==v for k,v in p.items()))
            game=Game(self.e,**p)
            for word in row['route'][1:]:self.assertTrue(game.submit(word)['success'])
            self.assertTrue(game.won);self.assertEqual(len(game.history),row['attempts'])
if __name__=='__main__':unittest.main()
