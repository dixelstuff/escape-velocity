# Association Specificity V3 — validation

All 13 supplied paths are replayed under recorded current settings; no tuning to force a semantic winner. Full results include exact replacement proofs and source evidence.

| Case | Exact | V2 context leaders | Mechanical replacements tried | V3 ms |
|---|---|---|---|---|
| A | true | ink, document | 96 | 357.3 |
| B | true | head, ruler, king | 144 | 344.9 |
| C | true | spiral, disorder, chaotic | 192 | 422.5 |
| D | true | wheel, power | 96 | 252.9 |
| E | true | pipe, water, plant | 144 | 322.3 |
| F | true | perfume, smell, chemical | 144 | 317.4 |
| G | true | pattern, lattice, notes | 240 | 440.2 |
| H | true | computer, pad, mouse | 256 | 625.1 |
| I | true | mouse, computer, engineer | 192 | 199.8 |
| J | true | chips, mouse, pie | 144 | 186.9 |
| K | true | stone, sugar, hard | 144 | 291.5 |
| L | true | beach, sea | 96 | 231.2 |
| M | true | dinner, date, friend | 144 | 289.9 |

## Selected comparisons

### B — prawn / tyrant / salesman

KING: cosine sides 0.117 / 0.485; joint rank 154. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 296/3/0/0; both-endpoint top100/500/1000 counts: 0/1/7. Exact role+completion replacements 7/48.
RULER: cosine sides 0.485 / 0.230; joint rank 266. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 3180/534/31/0; both-endpoint top100/500/1000 counts: 8/138/361. Exact role+completion replacements 0/48.
HEAD: cosine sides 0.230 / 0.160; joint rank 57. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 447/11/1/0; both-endpoint top100/500/1000 counts: 1/11/38. Exact role+completion replacements 31/48.

### F — apricot / perfumery / chemistry

SMELL: cosine sides 0.162 / 0.445; joint rank 674. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 2795/310/32/3; both-endpoint top100/500/1000 counts: 7/96/254. Exact role+completion replacements 36/48.
PERFUME: cosine sides 0.445 / 0.215; joint rank 140. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 2090/190/13/0; both-endpoint top100/500/1000 counts: 0/38/113. Exact role+completion replacements 1/48.
CHEMICAL: cosine sides 0.215 / 0.454; joint rank 21. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 939/38/2/0; both-endpoint top100/500/1000 counts: 0/7/37. Exact role+completion replacements 43/48.

### G — honeycomb / architecture / orchestra

LATTICE: cosine sides 0.405 / 0.242; joint rank 30. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 1807/117/5/0; both-endpoint top100/500/1000 counts: 3/20/55. Exact role+completion replacements 34/48.
PATTERN: cosine sides 0.242 / 0.337; joint rank 57. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 1476/161/9/0; both-endpoint top100/500/1000 counts: 2/19/73. Exact role+completion replacements 43/48.
DESIGN: cosine sides 0.337 / 0.168; joint rank 802. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 2913/360/8/0; both-endpoint top100/500/1000 counts: 2/52/173. Exact role+completion replacements 6/48.
NOTES: cosine sides 0.168 / 0.282; joint rank 1531. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 3897/934/123/11; both-endpoint top100/500/1000 counts: 3/108/297. Exact role+completion replacements 41/48.
MUSIC: cosine sides 0.282 / 0.528; joint rank 12. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 1283/91/5/0; both-endpoint top100/500/1000 counts: 0/36/136. Exact role+completion replacements 48/48.

### J — rabbit / computing / bakery

MOUSE: cosine sides 0.508 / 0.247; joint rank 16. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 1343/85/1/0; both-endpoint top100/500/1000 counts: 0/24/91. Exact role+completion replacements 41/48.
CHIPS: cosine sides 0.247 / 0.243; joint rank 17. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 1660/76/0/0; both-endpoint top100/500/1000 counts: 0/16/83. Exact role+completion replacements 2/48.
PIE: cosine sides 0.243 / 0.299; joint rank 64. Alternative counts at cosine ≥0.1/0.2/0.3/0.4: 1140/157/11/1; both-endpoint top100/500/1000 counts: 6/76/174. Exact role+completion replacements 48/48.

## Pair ranks

| Pair | Cosine | Forward / reverse rank | Phrase match |
|---|---|---|---|
| squid / ink | 0.296 | 201 / 105 | squid ink |
| ink / document | 0.231 | 356 / 1683 | none in sources |
| document / espionage | 0.186 | 2851 / 881 | none in sources |
| prawn / king | 0.117 | 4721 / 3884 | king prawn |
| king / ruler | 0.485 | 15 / 9 | none in sources |
| ruler / head | 0.230 | 388 / 1125 | none in sources |
| head / salesman | 0.160 | 2953 / 1061 | none in sources |
| robot / activity | 0.120 | 3802 / 6695 | none in sources |
| activity / disorder | 0.260 | 1253 / 619 | none in sources |
| disorder / chaotic | 0.259 | 626 / 539 | none in sources |
| chaotic / spiral | 0.230 | 898 / 416 | none in sources |
| spiral / stairs | 0.330 | 44 / 134 | none in sources |
| hamster / wheel | 0.297 | 65 / 252 | hamster wheel |
| wheel / power | 0.286 | 303 / 715 | power wheel |
| power / electricity | 0.591 | 2 / 4 | none in sources |
| flute / pipe | 0.328 | 139 / 89 | none in sources |
| pipe / water | 0.375 | 31 / 163 | water pipe, water pipe |
| water / plant | 0.377 | 151 / 41 | water plant, water plant, waterplant |
| plant / botany | 0.184 | 1747 / 704 | none in sources |
| apricot / smell | 0.162 | 2407 / 3112 | none in sources |
| smell / perfume | 0.445 | 23 / 13 | none in sources |
| perfume / chemical | 0.215 | 854 / 1028 | none in sources |
| chemical / chemistry | 0.454 | 14 / 34 | none in sources |
| honeycomb / lattice | 0.405 | 6 / 28 | none in sources |
| lattice / pattern | 0.242 | 616 / 1049 | none in sources |
| pattern / design | 0.337 | 170 / 293 | design pattern |
| design / notes | 0.168 | 3423 / 2034 | none in sources |
| notes / music | 0.282 | 258 / 714 | none in sources |
| music / orchestra | 0.528 | 32 / 23 | none in sources |
| rabbit / bunny | 0.570 | 2 / 2 | bunny rabbit, bunny rabbit |
| bunny / mat | 0.200 | 809 / 342 | none in sources |
| mat / pad | 0.307 | 13 / 20 | none in sources |
| pad / mouse | 0.348 | 8 / 53 | mouse pad, mousepad |
| mouse / computer | 0.375 | 34 / 133 | computer mouse |
| computer / electric | 0.215 | 1877 / 788 | none in sources |
| electric / cook | 0.117 | 3949 / 2994 | none in sources |
| cook / oven | 0.457 | 14 / 40 | none in sources |
| oven / bakery | 0.276 | 394 / 236 | none in sources |
| rabbit / mouse | 0.508 | 5 / 4 | none in sources |
| computer / engineer | 0.344 | 232 / 84 | computer engineer |
| engineer / baker | 0.260 | 286 / 233 | none in sources |
| baker / bakery | 0.211 | 573 / 590 | none in sources |
| mouse / chips | 0.247 | 364 / 481 | none in sources |
| chips / pie | 0.243 | 521 / 560 | none in sources |
| pie / bakery | 0.299 | 286 / 181 | none in sources |
| almond / sugar | 0.383 | 68 / 87 | none in sources |
| sugar / hard | 0.186 | 1227 / 4287 | none in sources |
| hard / stone | 0.263 | 1811 / 424 | hardstone, stonehard |
| stone / statue | 0.426 | 26 / 41 | none in sources |
| tortoise / sea | 0.232 | 445 / 949 | sea tortoise |
| sea / beach | 0.328 | 175 / 79 | seabeach |
| beach / wedding | 0.245 | 392 / 514 | none in sources |
| mate / friend | 0.325 | 37 / 396 | none in sources |
| friend / dinner | 0.359 | 232 / 149 | none in sources |
| dinner / date | 0.234 | 877 / 1524 | none in sources |
| date / fate | 0.258 | 1095 / 667 | none in sources |

## Size and scope

Phrase table 3,003,012 bytes raw / 730,115 bytes gzip. Lazy import only on opening V3; no initial gameplay request. No new vectors or runtime API. Rank cache ≤13.3 MiB/model plus existing cosine cache ≤8.9 MiB/model. Actual heap depends on the JS engine and decoded lexical objects; these cache figures are bounds, not measured total memory.

See DESIGN.md and PHRASE-SOURCES.md for formulas, targeted coverage and interpretation.
