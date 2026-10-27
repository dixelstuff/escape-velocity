# Phrase evidence — sources and redistribution

**V4 source policy:** V4 uses only the vocabulary-wide WordNet portion. The targeted Wiktionary supplement remains confined to the historical V3 comparison panel and never enters V4 calculations or annotations.

This diagnostic table is a modified extract, not a complete dictionary or collocation corpus. It contains headword titles, WordNet synset identifiers and Wiktionary compound decompositions/revision links; no definitions, corpus text or invented phrase frequencies.

* **Princeton WordNet3.0**, Copyright2006 Princeton University. See [the included full license](WORDNET-LICENSE.txt) and [WordNet licensing](https://wordnet.princeton.edu/license-and-commercial-use). Build modifications: restrict to the game's vocabulary, extract shared synsets and exact two-word or three-word `of/the` headwords, encode into indexed arrays. Dictionary single-entry coverage32,444/36,306 (89.4%);10,846 words appear as indexed multiword components. This is not pair-recall or phrase-recall coverage. No fuzzy word replacement or gloss co-occurrence inference.
* **English Wiktionary contributors**, [Wiktionary](https://en.wiktionary.org/), [CC BY-SA4.0](https://creativecommons.org/licenses/by-sa/4.0/). The Wiktionary-derived portion of this table and its snapshot are available under that license. Attribution/history is available through each entry's permanent revision link. Build modifications: generate336 candidate titles uniformly from the56 adjacent pairs in13 supplied validation paths, require an English entry, retain17 verified entries and explicit compound components; follow a verified alternative spelling only when the source compound decomposition is also in the snapshot. Definitions are not copied. This is **targeted prototype coverage**, not a full-vocabulary Wiktionary dictionary. An arbitrary new route may lack phrase coverage. The frozen source snapshot and rebuild script are under `reports/association-v3/wiktionary-snapshot.json` and `scripts/build_phrase_evidence.py` in the repository.

Sources do not endorse this game. Source absence does not establish absence of a phrase. Dictionary multiword entries are not automatically fixed idioms or statistically strong collocations. Source matches do not determine the player's intended sense.

## Resource investigation before choosing the prototype

| Resource | Coverage examined | Offline/build size and runtime | Decision |
|---|---|---|---|
| Existing WordNet3.0 |32,444 game words; KING PRAWN absent; MOUSEPAD present|Existing~10MB archive; standard-library Python build; compact browser lookup|Reuse; license retained|
| Open English Wordnet2025 |32,445 game words covered; downloaded official WNDB and checked all headwords; KING PRAWN still absent; MOUSEPAD present|Official download lists9.2MB; no Python package needed; CC BY4.0|Investigated offline; no extra runtime data/dependency adopted because it did not fix the key gap|
| English Wiktionary/Kaikki full extract |Full-game coverage not measured; source reports~1.4million English forms|Kaikki postprocessed English JSONL is3.2GB; CC BY-SA/GFDL source obligations; can stream offline and emit a compact vocabulary-pair lookup|Not downloaded/introduced; a stronger feasible option for future broad coverage|
| Targeted Wiktionary snapshot |56 actual adjacent test pairs;336 generated title variants;17 English entries|Small frozen revision snapshot; standard-library build +curl; no runtime API or dependency|Prototype adopted, explicitly incomplete|
| Corpus n-grams |Not integrated; coverage not measured|Needs real unigram and pair counts, documented corpus size/tokenization and frequency safeguards; no such dataset is bundled|PMI/NPMI/frequency stay null; no invented statistics|

The stronger full Wiktionary/Kaikki offline pipeline is the next expansion, rather than pretending WordNet is sufficient. Source: [Kaikki English dictionary and3.2GB download](https://kaikki.org/dictionary/English/index.html), [Kaikki source licenses](https://kaikki.org/dictionary/), [Open English Wordnet downloads and license](https://en-word.net/downloads).

If corpus counts are introduced later, use matching-count PMI=`log(p(a,b)/(p(a)p(b)))`, NPMI=`PMI/−log(p(a,b))`, with minimum count and dispersion/significance checks. No concrete count cutoff can be justified without inspecting the chosen corpus. Dictionary attestation should remain separate from corpus collocation evidence.
