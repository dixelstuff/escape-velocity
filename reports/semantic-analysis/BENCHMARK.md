# Semantic analysis comparison

Same shipped model, same fixed formulas, no route enumeration or scoring changes. Percentages describe local vector measurements; they are not player percentiles.

| Completed route | Best distinctiveness | Best separation | Dogleg distinctiveness | First / warm |
|---|---|---|---|---|
| PENCIL → LINES → LAKE → BASS → ORCHESTRA | 99.0% BASS | 35.3% LAKE | 83.2% LAKE | 231 / 51 ms |
| PENCIL → BAMBOO → FLUTE → ORCHESTRA | 100.0% FLUTE | 25.1% BAMBOO | 100.0% BAMBOO | 93 / 14 ms |
| PENCIL → WORK → CONSISTS → ORCHESTRA | 97.0% WORK | 22.1% WORK | 98.6% CONSISTS | 85 / 13 ms |
| PENCIL → LOOK → NATIONAL → ORCHESTRA | 98.0% LOOK | 10.3% LOOK | 100.0% NATIONAL | 88 / 12 ms |
| PENGUIN → BOOK → ALIEN → GALAXY | 92.0% BOOK | 36.8% ALIEN | 100.0% BOOK | 138 / 13 ms |
| PENGUIN → BOOKS → TABLET → GALAXY | 97.0% TABLET | 25.9% TABLET | 59.1% BOOKS | 90 / 11 ms |

The generic WORK → CONSISTS and LOOK → NATIONAL routes also have high distinctiveness and dogleg distinctiveness. These metrics therefore do not yet distinguish human satisfaction reliably. They are implemented for comparison and inspection, with no combined score.

BASS has a music-dominated 100-neighbour set; its fish-related neighbours are a smaller group. The balance factor reduces its separation despite the recognisable fish/instrument pivot. LAKE has a more balanced local split and leads separation in that path. The neighbour table exposes this limitation rather than hiding it behind a cleverness label.

Timings are desktop Node measurements with the model already in memory. Full-vocabulary analysis may wait for model loading on a cold visit. Mobile-width UI has also been checked; real iPhone performance and native keyboard behavior are not emulated by the desktop benchmark.
