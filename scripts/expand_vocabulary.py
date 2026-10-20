"""Append dictionary words and common inflections without changing historical vectors."""
from pathlib import Path
import json,re,zipfile
import numpy as np
from wordfreq import top_n_list,zipf_frequency
ROOT=Path(__file__).resolve().parents[1];DATA=ROOT/'data'
def main():
    words=json.loads((DATA/'words.json').read_text()); old=set(words[:19989]);existing=set(words)
    lemmas=set();exceptions=set()
    with zipfile.ZipFile(DATA/'wordnet.zip') as z:
        for pos in ['noun','verb','adj','adv']:
            for line in z.read('wordnet/data.'+pos).decode().splitlines():
                if not line or line.startswith(' '):continue
                fields=line.split('|',1)[0].split();count=int(fields[3],16)
                lemmas.update(re.sub(r'\([a-z]+\)$','',w) for w in fields[4:4+2*count:2])
            exceptions.update(line.split()[0] for line in z.read('wordnet/'+pos+'.exc').decode().splitlines() if line)
    # Real inflected vectors retain their own meanings, rather than silently substituting a root.
    def dictionary_word(w):
        if w in lemmas or w in exceptions:return True
        bases=[]
        for suffix,replacement in [('s',''),('es',''),('ies','y'),('ed',''),('ed','e'),('ied','y'),('ing',''),('ing','e'),('er',''),('er','e'),('est',''),('est','e')]:
            if w.endswith(suffix):
                base=w[:-len(suffix)];bases.append(base+replacement)
                if len(base)>2 and base[-1]==base[-2]:bases.append(base[:-1]+replacement)
        return any(b in old for b in bases)
    excluded=set('john james william robert david michael mary peter paul george thomas richard charles joseph andrew mark jesus christ america american english british french german chinese indian christian islamic muslim jewish roman russian european african asian london paris china india japan italy canada australia california york washington fuck fucking shit bullshit asshole cunt nigger nigga faggot'.split())
    priority='jeans wheels fishing cracked faded locked squabble divot gumption icing incubate squawk anaphylaxis anaphylactic ad'.split()
    common=[w for w in top_n_list('en',150000) if w not in old and w not in excluded and re.fullmatch('[a-z]{3,18}',w) and zipf_frequency(w,'en')>=3 and dictionary_word(w)]
    additions=list(dict.fromkeys([w for w in priority if w not in old and dictionary_word(w)]+common[:5000]))
    additions=[w for w in additions if w not in existing]
    if not additions:
        print(f'Vocabulary already expanded: {len(words):,} words.');return
    wanted=set(additions);found={}
    with zipfile.ZipFile(DATA/'glove.6B.zip') as z:
        with z.open('glove.6B.300d.txt') as source:
            for line in source:
                name,_,raw=line.partition(b' ');word=name.decode()
                if word in wanted:
                    v=np.fromstring(raw.decode(),sep=' ',dtype=np.float32)
                    if len(v)==300 and np.isfinite(v).all() and np.linalg.norm(v)>0:found[word]=v/np.linalg.norm(v)
    additions=[w for w in additions if w in found]
    if additions:
        np.save(DATA/'vectors.npy',np.concatenate([np.load(DATA/'vectors.npy'),np.stack([found[w] for w in additions])]))
        (DATA/'words.json').write_text(json.dumps(words+additions))
    metadata=json.loads((DATA/'metadata.json').read_text());metadata.update(words=len(words)+len(additions),expansion='Appended dictionary words and common inflections; existing vectors unchanged')
    (DATA/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n')
    print(f'Added {len(additions):,} words; {len(words)+len(additions):,} total. Historical vectors preserved.')
if __name__=='__main__':main()
