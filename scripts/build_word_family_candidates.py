"""Extract explicit WordNet noun/adjective links; shared by analysis and production builds."""
from pathlib import Path
from zipfile import ZipFile
import argparse,json
ROOT=Path(__file__).resolve().parents[1]
def candidate_pairs(vocabulary,archive_path):
    synsets,links={},[]
    with ZipFile(archive_path) as archive:
        for part in ['noun','adj']:
            for raw in archive.read('wordnet/data.'+part).decode().splitlines():
                if not raw or not raw[0].isdigit():continue
                fields=raw.split(' | ')[0].split();count=int(fields[3],16);cursor=4+2*count
                source=(fields[0],'a' if fields[2]=='s' else fields[2])
                synsets[source]=[fields[4+2*i].split('(')[0] for i in range(count)]
                for i in range(int(fields[cursor])):
                    symbol,offset,pos,indices=fields[cursor+1+4*i:cursor+5+4*i]
                    # '+' = derivationally related; '\\' = adjective pertains to noun.
                    if symbol in ['+','\\'] and indices!='0000' and pos in ['a','n']:
                        links.append((source,int(indices[:2],16)-1,(offset,pos),int(indices[2:],16)-1))
    pairs=set()
    for source,i,target,j in links:
        if source[1]==target[1] or target not in synsets:continue
        a,b=synsets[source][i],synsets[target][j]
        if a in vocabulary and b in vocabulary and a!=b:pairs.add(tuple(sorted((a,b))))
    return sorted(pairs)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('output',type=Path);args=parser.parse_args()
    config=json.loads((ROOT/'static/model/config.json').read_text())
    words=json.loads((ROOT/'static/model'/config['words_file']).read_text())
    pairs=candidate_pairs(set(words),ROOT/'data/wordnet.zip')
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps({'source':'WordNet explicit noun/adjective derivational and pertainym links','pairs':pairs},separators=(',',':'))+'\n')
    print(f'{len(pairs)} vocabulary pairs saved to {args.output}')
if __name__=='__main__':main()
