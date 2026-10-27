# Cleverness V4 — supplied routes and held-out triples

All 13 current-rule paths retain their V2 engine reproduction. No vocabulary/shot changes, example overrides, final score or test-route lexical snapshot.

| Case | V2 context leaders | Necessary setups | V4 ms |
|---|---|---|---|
| A | ink, document | ink, document | 532.2 |
| B | head, ruler, king | king, ruler, head | 464.9 |
| C | spiral, disorder, chaotic | activity, disorder, chaotic, spiral | 497.3 |
| D | wheel, power | wheel, power | 313.1 |
| E | pipe, water, plant | pipe, plant | 365.3 |
| F | perfume, smell, chemical | perfume, chemical | 413.7 |
| G | pattern, lattice, notes | design, music | 559.2 |
| H | computer, pad, mouse | bunny, pad, computer, electric, cook, oven | 816.5 |
| I | mouse, computer, engineer | mouse, computer, engineer, baker | 264.4 |
| J | chips, mouse, pie | mouse, chips, pie | 212.6 |
| K | stone, sugar, hard | sugar, hard, stone | 377.1 |
| L | beach, sea | sea, beach | 302.9 |
| M | dinner, date, friend | friend, dinner, date | 386.2 |

## Word-level geometry at 200 neighbours

| Word / route | Concentration | Concentration vocabulary percentile | Silhouette | ARI100 vs200 | Exclusive cluster difference | Incoming / outgoing support mass |
|---|---|---|---|---|---|---|
| ink / A | 0.179 | 35.1% | 0.064 | 0.321 | 0.106 | 5.597 / 3.522 |
| document / A | 0.253 | 82.2% | 0.105 | 0.880 | 0.227 | 4.805 / 3.018 |
| king / B | 0.225 | 68.2% | 0.139 | -0.027 | 0.254 | 0.072 / 19.565 |
| ruler / B | 0.175 | 32.2% | 0.092 | 0.404 | 0.407 | 10.163 / 0.492 |
| head / B | 0.285 | 92.0% | 0.159 | 0.669 | 0.034 | 4.881 / 2.275 |
| activity / C | 0.284 | 91.9% | 0.097 | 0.806 | 0.151 | 0.402 / 9.823 |
| disorder / C | 0.261 | 85.5% | 0.090 | -0.066 | 0.023 | 6.634 / 1.821 |
| chaotic / C | 0.192 | 45.5% | 0.089 | 0.543 | 0.095 | 2.032 / 2.184 |
| spiral / C | 0.150 | 16.7% | 0.127 | 0.808 | 0.712 | 4.163 / 5.388 |
| wheel / D | 0.200 | 51.6% | 0.091 | -0.019 | 0.080 | 1.594 / 7.275 |
| power / D | 0.303 | 95.3% | 0.197 | 0.878 | 0.344 | 0.808 / 9.101 |
| pipe / E | 0.188 | 41.8% | 0.076 | -0.011 | 0.412 | 1.436 / 10.361 |
| water / E | 0.223 | 67.3% | 0.095 | 0.404 | 0.413 | 2.579 / 4.968 |
| plant / E | 0.188 | 42.0% | 0.127 | -0.045 | 0.435 | 14.392 / 0.477 |
| smell / F | 0.193 | 45.9% | 0.115 | 0.909 | 0.323 | 0.797 / 7.649 |
| perfume / F | 0.194 | 46.8% | 0.128 | 0.921 | 0.313 | 10.029 / 0.948 |
| chemical / F | 0.214 | 61.5% | 0.082 | 0.296 | 0.304 | 1.110 / 8.250 |
| lattice / G | 0.246 | 79.5% | 0.103 | 0.260 | 0.109 | 6.208 / 2.235 |
| pattern / G | 0.239 | 76.0% | 0.092 | 0.772 | 0.452 | 1.390 / 9.899 |
| design / G | 0.251 | 81.4% | 0.062 | 0.699 | 0.253 | 7.556 / 1.076 |
| notes / G | 0.216 | 62.6% | 0.102 | 0.242 | 0.386 | 1.904 / 3.804 |
| music / G | 0.268 | 87.9% | 0.115 | 0.587 | 0.720 | 1.456 / 13.953 |
| bunny / H | 0.169 | 28.3% | 0.051 | 0.330 | 0.348 | 11.632 / 0.044 |
| mat / H | 0.147 | 15.0% | 0.058 | 0.328 | 0.044 | 1.083 / 3.183 |
| pad / H | 0.144 | 13.3% | 0.093 | 0.807 | 0.232 | 1.713 / 3.275 |
| mouse / H | 0.159 | 21.4% | 0.107 | 0.543 | 0.233 | 1.706 / 5.668 |
| computer / H | 0.247 | 79.6% | 0.085 | 0.179 | 0.001 | 5.210 / 4.306 |
| electric / H | 0.213 | 60.9% | 0.075 | -0.028 | 0.258 | 13.294 / 0.246 |
| cook / H | 0.257 | 84.1% | 0.188 | 0.640 | 0.956 | 0.336 / 17.787 |
| oven / H | 0.279 | 90.7% | 0.112 | 0.745 | 0.093 | 11.840 / 1.006 |
| mouse / I | 0.159 | 21.4% | 0.107 | 0.543 | 0.768 | 8.434 / 4.616 |
| computer / I | 0.247 | 79.6% | 0.085 | 0.179 | 0.440 | 7.277 / 3.734 |
| engineer / I | 0.177 | 33.8% | 0.105 | 0.404 | 0.656 | 5.675 / 3.214 |
| baker / I | 0.214 | 61.2% | 0.085 | 0.083 | 0.304 | 9.503 / 0.431 |
| mouse / J | 0.159 | 21.4% | 0.107 | 0.543 | 0.709 | 9.472 / 2.278 |
| chips / J | 0.194 | 47.0% | 0.153 | 1.000 | 0.792 | 4.086 / 4.573 |
| pie / J | 0.318 | 96.9% | 0.076 | 0.158 | 0.105 | 2.594 / 3.489 |
| sugar / K | 0.263 | 86.0% | 0.136 | 0.920 | 0.569 | 13.840 / 1.221 |
| hard / K | 0.461 | 99.9% | 0.091 | 0.808 | 0.331 | 1.203 / 4.118 |
| stone / K | 0.218 | 64.1% | 0.077 | -0.010 | 0.632 | 1.564 / 11.836 |
| sea / L | 0.209 | 58.1% | 0.108 | 0.621 | 0.863 | 1.358 / 12.484 |
| beach / L | 0.192 | 44.8% | 0.076 | 0.048 | 0.355 | 9.019 / 1.667 |
| friend / M | 0.261 | 85.4% | 0.107 | 0.511 | 0.469 | 2.146 / 4.463 |
| dinner / M | 0.215 | 61.8% | 0.166 | 0.960 | 0.414 | 5.164 / 2.989 |
| date / M | 0.320 | 97.1% | 0.098 | 0.153 | 0.118 | 2.291 / 5.997 |

## Held-out triples

| Type | Triple | Weakest link | Endpoint cosine | Exclusive cluster difference | Support mass in/out |
|---|---|---|---|---|---|
| ordinary progression | kitten → cat → animal | 0.430 | 0.177 | 0.686 | 3.334 / 6.317 |
| context shift | river → bank → money | 0.273 | 0.119 | 0.693 | 0.438 / 16.539 |
| specialist | violin → bow → arrow | 0.238 | 0.063 | 0.166 | 0.548 / 5.754 |
| generic bridge | thing → system → process | 0.266 | 0.328 | 0.705 | 2.003 / 7.370 |
| ambiguous | tree → bark → dog | 0.263 | 0.249 | 0.417 | 12.308 / 0.557 |
| weak connection | turnip → galaxy → scissors | -0.105 | 0.174 | 0.471 | 1.144 / 3.338 |
| specialist progression | proton → neutron → nucleus | 0.344 | 0.248 | 0.175 | 1.378 / 3.658 |
| ordinary synonymy | happy → glad → pleased | 0.690 | 0.671 | 0.725 | 7.852 / 1.847 |

These contrast cases are not a blind human evaluation. Failures and partial support must remain visible; a high normalized split with tiny mass is not convincing semantic evidence. See DESIGN.md for interpretation and caveats.
