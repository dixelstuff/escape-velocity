import unittest
from scripts.import_scorecard_holes import eligible
class ScreeningTests(unittest.TestCase):
    def test_screening_is_based_on_completed_play_and_endpoint_breadth(self):
        class Model:
            index={'tee':0,'flag':1,'hub':2}
            def hub(self,w):return .8 if w=='hub' else 0
        e=Model();s=dict(start='tee',target='flag',won=True,attempts=4,history=[{'success':True},{'success':False},{'success':True}])
        self.assertTrue(eligible(e,s))
        for changes in [dict(won=False),dict(target='hub'),dict(start='hub'),dict(attempts=20),dict(target='unknown'),dict(history=[{'success':False},{'success':False},{'success':True}])]:
            self.assertFalse(eligible(e,{**s,**changes}))
