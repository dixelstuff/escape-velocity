import unittest
from types import SimpleNamespace
import numpy as np
from scripts.analyze import search, graph
class SearchTests(unittest.TestCase):
    def setUp(self):
        self.e=SimpleNamespace(words=['start','target','alpha','beta','arrival'],index={w:i for i,w in enumerate(['start','target','alpha','beta','arrival'])},vectors=np.array([[0,1],[1,0],[.1,.995],[.1,.995],[.8,.6]],dtype=np.float32))
        self.adjacency=[[2,3],[4],[0,4],[0,4],[1,2,3]]
    def test_two_routes_to_one_arrival_count_free_hop_correctly(self):
        result=search(self.e,self.adjacency,'start','target',.7)
        self.assertEqual(result['attempts'],2)
        self.assertEqual(result['shortest_routes'],2)
        self.assertEqual(result['first_moves'],2)
        self.assertEqual(result['winning_planets'],1)
        self.assertEqual(result['route'][-1],'arrival')
    def test_start_boundary_removes_route(self):
        self.e.vectors[2,0]=-.1
        result=search(self.e,self.adjacency,'start','target',.7)
        self.assertEqual(result['shortest_routes'],1)
        self.assertEqual(result['first_moves'],1)
    def test_disconnected_graph(self):
        self.adjacency[0]=[]
        self.assertIsNone(search(self.e,self.adjacency,'start','target',.7)['attempts'])
    def test_exact_threshold_graph(self):
        adjacency=graph(np.array([[1,0],[.8,.6],[0,1]],dtype=np.float32),.8)
        self.assertEqual(adjacency[0].tolist(),[0,1])
if __name__=='__main__':unittest.main()
