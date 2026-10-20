"""Current golf rules; historical rules retain separate regression coverage."""
import unittest
from engine import Game
from test_engine import FakeEmbeddings
class CurrentCourseTests(unittest.TestCase):
    def test_automatic_finish_is_a_counted_shot_but_direct_target_is_not(self):
        e=FakeEmbeddings();g=Game(e,'start','target',.5,mode='distance')
        result=g.submit('arrival')
        self.assertEqual(result['automatic_shot']['attempt'],2)
        self.assertEqual(g.state()['attempts'],2)
        self.assertEqual(g.current,'target')
        self.assertEqual(g.route,['start','arrival','target'])
        g=Game(e,'start','target',.5,mode='distance');g.submit('forward');result=g.submit('target')
        self.assertTrue(result['won']);self.assertNotIn('automatic_shot',result)
        self.assertEqual(g.state()['attempts'],2)
    def test_backtrack_resets_boundary_and_still_needs_contact(self):
        e=FakeEmbeddings();g=Game(e,'start','target',.5,mode='distance');g.submit('forward')
        self.assertEqual(g.submit('backward')['outcome'],'water')
        self.assertEqual(g.submit('start')['outcome'],'backtrack')
        self.assertEqual(g.best_progress,.1)
        e.values[tuple(sorted(['start','backward']))]=.5
        self.assertTrue(g.submit('backward')['success'])
        e.values[tuple(sorted(['start','backward']))]=.01
        self.assertEqual(g.submit('start')['outcome'],'miss')
    def test_small_retreat_is_consistent_for_short_holes(self):
        self.assertEqual(Game(FakeEmbeddings(),'start','target',.12).backward_allowance,.01)
    def test_historical_green_does_not_gain_an_extra_shot(self):
        g=Game(FakeEmbeddings(),'start','target',.5,mode='distance',rules='golf-distance-v1')
        g.submit('arrival');self.assertEqual(g.state()['attempts'],1)
        self.assertNotIn('automatic_shots',g.state())

    def test_hub_fee_is_modest_forward_only_and_versioned(self):
        e=FakeEmbeddings();e.hub=lambda w:1. if w=='forward' else 0.
        modern=Game(e,'start','target',.5,mode='distance')
        old=Game(e,'start','target',.5,mode='distance',rules='golf-distance-v2')
        self.assertAlmostEqual(modern.requirement('start','forward')[2],.035*(.3/.4)**2)
        self.assertEqual(modern.requirement('forward','backward')[2],0)
        self.assertEqual(old.requirement('start','forward')[2],0)
        self.assertGreater(modern.submit('forward')['required'],old.submit('forward')['required'])
        self.assertIn('hub_surcharge',modern.history[0]);self.assertNotIn('hub_surcharge',old.history[0])
