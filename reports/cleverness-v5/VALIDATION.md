# V5 calibration

All supplied routes are replayed under recorded/current rules. No test-specific lexical evidence or weights. Human preferences are reference judgements, not training targets.

| Route | Strokes | Verified removable strokes | Necessary setups | V5 including V4 ms |
|---|---:|---:|---|---:|
| P-A: penguin → fish → market → volatile → volcano | 4 | 0 | fish, market, volatile | 651 |
| P-B: penguin → books → cash → rise → volcano | 4 | 0 | books, rise | 344 |
| P-C: penguin → book → note → message → danger → volcano | 5 | 0 | book, note, message, danger | 382 |
| V-A: velvet → red → television → drama → jealousy | 4 | 0 | red, television, drama | 437 |
| V-B: velvet → smooth → orbit → sphere → relationship → jealousy | 5 | 0 | smooth, orbit, sphere, relationship | 350 |
| V-C: velvet → curtain → slide → drift → orbit → eye → tears → jealousy | 7 | 0 | curtain, slide, drift, orbit, eye, tears | 473 |
| A: squid → ink → document → espionage | 3 | 0 | ink, document | 328 |
| B: prawn → king → ruler → head → salesman | 4 | 0 | king, ruler, head | 414 |
| C: robot → activity → disorder → chaotic → spiral → stairs | 5 | 0 | activity, disorder, chaotic, spiral | 498 |
| D: hamster → wheel → power → electricity | 3 | 0 | wheel, power | 341 |
| E: flute → pipe → water → plant → botany | 4 | 1 | pipe, plant | 391 |
| F: apricot → smell → perfume → chemical → chemistry | 4 | 1 | perfume, chemical | 404 |
| G: honeycomb → lattice → pattern → design → notes → music → orchestra | 6 | 2 | design, music | 568 |
| H: rabbit → bunny → mat → pad → mouse → computer → electric → cook → oven → bakery | 9 | 3 | bunny, pad, computer, electric, cook, oven | 818 |
| I: rabbit → mouse → computer → engineer → baker → bakery | 5 | 0 | mouse, computer, engineer, baker | 249 |
| J: rabbit → mouse → chips → pie → bakery | 4 | 0 | mouse, chips, pie | 253 |
| K: almond → sugar → hard → stone → statue | 4 | 0 | sugar, hard, stone | 392 |
| L: tortoise → sea → beach → wedding | 3 | 0 | sea, beach | 309 |
| M: mate → friend → dinner → date → fate | 4 | 0 | friend, dinner, date | 389 |

## Competing bridge indices at K=200

These raw indices are not cleverness ratings. Strength × gap alone ignores credible contexts; the supported index also weights separation, balanced support and mass. Overlap adjustment is a sensitivity comparison, not a second independent signal.

| Case / bridge | Weakest cosine | Gap | Difference | Support in/out | Strength×gap | Supported switch | Overlap adjusted | Role + completion / sampled |
|---|---:|---:|---:|---|---:|---:|---:|---|
| P-A / fish | 0.164 | 1.000 | 0.528 | 5.54 / 5.09 | 0.1645 | 0.002210 | 0.002210 | 31/48 |
| P-A / market | 0.231 | 0.899 | 0.257 | 1.53 / 8.73 | 0.2079 | 0.000408 | 0.000408 | 6/48 |
| P-A / volatile | 0.234 | 0.997 | 0.660 | 12.34 / 1.03 | 0.2334 | 0.000792 | 0.000792 | 42/48 |
| P-B / books | 0.244 | 1.000 | 0.854 | 8.06 / 5.53 | 0.2438 | 0.005758 | 0.005758 | 27/48 |
| P-B / cash | 0.244 | 0.829 | 0.216 | 1.71 / 8.64 | 0.2022 | 0.000373 | 0.000373 | 8/48 |
| P-B / rise | 0.164 | 1.000 | 0.108 | 17.89 / 0.41 | 0.1637 | 0.000036 | 0.000036 | 38/48 |
| P-C / book | 0.327 | 0.947 | 0.633 | 3.82 / 9.76 | 0.3096 | 0.003748 | 0.003748 | 33/48 |
| P-C / note | 0.327 | 0.750 | 0.408 | 2.27 / 4.68 | 0.2450 | 0.001136 | 0.001119 | 0/48 |
| P-C / message | 0.271 | 0.818 | 0.696 | 6.57 / 2.13 | 0.2215 | 0.001638 | 0.001579 | 48/48 |
| P-C / danger | 0.271 | 1.000 | 0.605 | 13.47 / 1.06 | 0.2708 | 0.000870 | 0.000870 | 44/48 |
| V-A / red | 0.208 | 0.954 | 0.916 | 8.05 / 4.53 | 0.1984 | 0.004117 | 0.004117 | 46/48 |
| V-A / television | 0.208 | 0.840 | 0.764 | 1.07 / 12.29 | 0.1745 | 0.000715 | 0.000715 | 2/48 |
| V-A / drama | 0.176 | 1.000 | 0.850 | 17.87 / 1.25 | 0.1757 | 0.000931 | 0.000931 | 31/48 |
| V-B / smooth | 0.173 | 1.000 | 0.697 | 3.27 / 4.50 | 0.1735 | 0.001979 | 0.001979 | 25/48 |
| V-B / orbit | 0.181 | 0.742 | 0.464 | 1.15 / 5.62 | 0.1340 | 0.000357 | 0.000350 | 0/48 |
| V-B / sphere | 0.254 | 0.856 | 0.700 | 4.29 / 4.33 | 0.2172 | 0.003261 | 0.003261 | 36/48 |
| V-B / relationship | 0.254 | 0.929 | 0.776 | 4.39 / 5.77 | 0.2359 | 0.004018 | 0.004018 | 48/48 |
| V-C / curtain | 0.236 | 0.875 | 0.741 | 6.56 / 1.34 | 0.2064 | 0.001021 | 0.001021 | 28/48 |
| V-C / slide | 0.236 | 0.946 | 0.079 | 1.11 / 6.40 | 0.2231 | 0.000098 | 0.000098 | 23/48 |
| V-C / drift | 0.202 | 0.955 | 0.253 | 4.43 / 1.90 | 0.1931 | 0.000465 | 0.000465 | 41/48 |
| V-C / orbit | 0.197 | 0.887 | 0.342 | 3.24 / 1.89 | 0.1747 | 0.000567 | 0.000567 | 2/48 |
| V-C / eye | 0.197 | 1.000 | 0.141 | 0.83 / 7.29 | 0.1969 | 0.000115 | 0.000115 | 32/48 |
| V-C / tears | 0.213 | 0.908 | 0.533 | 5.98 / 5.56 | 0.1931 | 0.002862 | 0.002862 | 16/16 |
| A / ink | 0.231 | 1.000 | 0.106 | 5.60 / 3.52 | 0.2306 | 0.000429 | 0.000429 | 0/48 |
| A / document | 0.186 | 0.963 | 0.227 | 4.81 / 3.02 | 0.1787 | 0.000611 | 0.000611 | 22/48 |
| B / king | 0.117 | 0.966 | 0.254 | 0.07 / 19.57 | 0.1133 | 0.000010 | 0.000010 | 7/48 |
| B / ruler | 0.230 | 0.741 | 0.407 | 10.16 / 0.49 | 0.1701 | 0.000170 | 0.000163 | 0/48 |
| B / head | 0.160 | 0.971 | 0.034 | 4.88 / 2.28 | 0.1554 | 0.000060 | 0.000060 | 31/48 |
| C / activity | 0.120 | 0.960 | 0.151 | 0.40 / 9.82 | 0.1153 | 0.000035 | 0.000035 | 29/48 |
| C / disorder | 0.259 | 0.831 | 0.023 | 6.63 / 1.82 | 0.2153 | 0.000046 | 0.000045 | 2/48 |
| C / chaotic | 0.230 | 0.802 | 0.095 | 2.03 / 2.18 | 0.1840 | 0.000177 | 0.000176 | 39/48 |
| C / spiral | 0.230 | 0.967 | 0.712 | 4.16 / 5.39 | 0.2219 | 0.003290 | 0.003290 | 45/48 |
| D / wheel | 0.286 | 1.000 | 0.080 | 1.59 / 7.28 | 0.2858 | 0.000183 | 0.000183 | 8/48 |
| D / power | 0.286 | 0.924 | 0.344 | 0.81 / 9.10 | 0.2641 | 0.000367 | 0.000365 | 7/48 |
| E / pipe | 0.328 | 0.932 | 0.412 | 1.44 / 10.36 | 0.3057 | 0.000904 | 0.000904 | 1/48 |
| E / water | 0.375 | 0.699 | 0.413 | 2.58 / 4.97 | 0.2620 | 0.001397 | 0.001368 | 45/48 |
| E / plant | 0.184 | 0.987 | 0.435 | 14.39 / 0.48 | 0.1812 | 0.000188 | 0.000188 | 48/48 |
| F / smell | 0.162 | 0.756 | 0.323 | 0.80 / 7.65 | 0.1226 | 0.000158 | 0.000152 | 36/48 |
| F / perfume | 0.215 | 0.739 | 0.313 | 10.03 / 0.95 | 0.1589 | 0.000236 | 0.000236 | 1/48 |
| F / chemical | 0.215 | 0.910 | 0.304 | 1.11 / 8.25 | 0.1956 | 0.000330 | 0.000330 | 43/48 |
| G / lattice | 0.242 | 0.784 | 0.109 | 6.21 / 2.23 | 0.1899 | 0.000232 | 0.000228 | 34/48 |
| G / pattern | 0.242 | 0.826 | 0.452 | 1.39 / 9.90 | 0.2001 | 0.000629 | 0.000623 | 43/48 |
| G / design | 0.168 | 0.854 | 0.253 | 7.56 / 1.08 | 0.1436 | 0.000196 | 0.000194 | 6/48 |
| G / notes | 0.168 | 0.712 | 0.386 | 1.90 / 3.80 | 0.1197 | 0.000440 | 0.000433 | 41/48 |
| G / music | 0.282 | 0.832 | 0.720 | 1.46 / 13.95 | 0.2343 | 0.001227 | 0.001227 | 48/48 |
| H / bunny | 0.200 | 0.881 | 0.348 | 11.63 / 0.04 | 0.1765 | 0.000013 | 0.000013 | 26/48 |
| H / mat | 0.200 | 0.823 | 0.044 | 1.08 / 3.18 | 0.1647 | 0.000039 | 0.000039 | 34/48 |
| H / pad | 0.307 | 0.936 | 0.232 | 1.71 / 3.27 | 0.2876 | 0.000570 | 0.000567 | 27/48 |
| H / mouse | 0.348 | 0.781 | 0.233 | 1.71 / 5.67 | 0.2718 | 0.000540 | 0.000531 | 26/48 |
| H / computer | 0.215 | 0.863 | 0.001 | 5.21 / 4.31 | 0.1859 | 0.000005 | 0.000005 | 18/48 |
| H / electric | 0.117 | 0.989 | 0.258 | 13.29 / 0.25 | 0.1158 | 0.000037 | 0.000037 | 13/16 |
| H / cook | 0.117 | 0.822 | 0.956 | 0.34 / 17.79 | 0.0963 | 0.000155 | 0.000155 | 0/0 |
| H / oven | 0.276 | 0.862 | 0.093 | 11.84 / 1.01 | 0.2384 | 0.000111 | 0.000108 | 0/0 |
| I / mouse | 0.375 | 0.958 | 0.768 | 8.43 / 4.62 | 0.3587 | 0.006358 | 0.006358 | 44/48 |
| I / computer | 0.344 | 0.922 | 0.440 | 7.28 / 3.73 | 0.3170 | 0.002605 | 0.002605 | 8/48 |
| I / engineer | 0.260 | 0.918 | 0.656 | 5.68 / 3.21 | 0.2391 | 0.002519 | 0.002519 | 36/48 |
| I / baker | 0.211 | 0.928 | 0.304 | 9.50 / 0.43 | 0.1960 | 0.000128 | 0.000128 | 45/48 |
| J / mouse | 0.247 | 0.880 | 0.709 | 9.47 / 2.28 | 0.2177 | 0.001760 | 0.001760 | 41/48 |
| J / chips | 0.243 | 0.838 | 0.792 | 4.09 / 4.57 | 0.2038 | 0.003297 | 0.003297 | 2/48 |
| J / pie | 0.243 | 0.848 | 0.105 | 2.59 / 3.49 | 0.2064 | 0.000282 | 0.000273 | 48/48 |
| K / sugar | 0.186 | 0.957 | 0.569 | 13.84 / 1.22 | 0.1783 | 0.000619 | 0.000619 | 5/48 |
| K / hard | 0.186 | 0.842 | 0.331 | 1.20 / 4.12 | 0.1569 | 0.000312 | 0.000312 | 47/48 |
| K / stone | 0.263 | 0.909 | 0.632 | 1.56 / 11.84 | 0.2388 | 0.001180 | 0.001180 | 48/48 |
| L / sea | 0.232 | 0.991 | 0.863 | 1.36 / 12.48 | 0.2304 | 0.001350 | 0.001343 | 0/48 |
| L / beach | 0.245 | 0.874 | 0.355 | 9.02 / 1.67 | 0.2139 | 0.000632 | 0.000632 | 47/48 |
| M / friend | 0.325 | 0.832 | 0.469 | 2.15 / 4.46 | 0.2701 | 0.001358 | 0.001358 | 32/48 |
| M / dinner | 0.234 | 0.811 | 0.414 | 5.16 / 2.99 | 0.1894 | 0.001172 | 0.001172 | 1/48 |
| M / date | 0.234 | 0.985 | 0.118 | 2.29 / 6.00 | 0.2303 | 0.000312 | 0.000312 | 48/48 |

See DESIGN.md for interpretation, failures, formulas and what adds information.
