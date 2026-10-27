import importlib.util,unittest
from pathlib import Path
import numpy as np
spec=importlib.util.spec_from_file_location('profiles',Path(__file__).resolve().parents[1]/'scripts/build_semantic_profiles.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class GeometryTests(unittest.TestCase):
 def test_concentration_and_silhouette_identity(self):
  rng=np.random.default_rng(1729);x=rng.normal(size=(3,25,12)).astype(np.float32);x/=np.linalg.norm(x,axis=2,keepdims=True)
  labels,sizes,sil,gain,sep,centers,reps=m.partition(x)
  for b in range(3):
   gram=x[b]@x[b].T;dist=1-gram;expected=[]
   for i in range(25):
    own=np.where(labels[b]==labels[b,i])[0];own=own[own!=i];other=np.where(labels[b]!=labels[b,i])[0]
    if not len(own) or not len(other):expected.append(0);continue
    a=dist[i,own].mean();bb=dist[i,other].mean();expected.append((bb-a)/max(a,bb))
   self.assertAlmostEqual(float(sil[b]),float(np.mean(expected)),places=6)
   average=(gram.sum()-np.trace(gram))/(25*24);sum_identity=((x[b].sum(axis=0)**2).sum()-25)/(25*24);self.assertAlmostEqual(float(average),float(sum_identity),places=6)
  again=m.partition(x);np.testing.assert_array_equal(labels,again[0]);np.testing.assert_allclose(centers,again[5]);self.assertTrue(np.all(gain>=-1e-6))
 def test_stability_label_invariant(self):
  a=np.array([0,0,1,1,0,1]);self.assertEqual(m.ari(a,a),1);self.assertEqual(m.ari(a,1-a),1)
 def test_one_region_not_two_meanings(self):
  x=np.ones((1,25,10),np.float32);x/=np.linalg.norm(x,axis=2,keepdims=True);labels,sizes,sil,gain,sep,*_=m.partition(x);self.assertEqual(min(sizes[0]),0);self.assertEqual(float(sil[0]),0);self.assertEqual(float(sep[0]),0)
if __name__=='__main__':unittest.main()
