# V5 research outputs

- [Design, formulas, calibration findings and limitations](DESIGN.md)
- [Nineteen complete-route comparisons](VALIDATION.md)
- [Local short-solution counts, coverage and examples](LANDSCAPE.md)
- `validation.json`: all19 completed states, V5 evidence, retained V4 proofs and five diagnostic control triples.
- `landscape.json`: every accepted short route, per-landing counts, coverage cells and explicitly scoped player comparisons.

Reproduce from the repository root:

```sh
node scripts/validate_cleverness_v5.mjs
node scripts/hole-solution-landscape.mjs
node tests/test_cleverness_v5.mjs
node tests/test_cleverness_v5_panel.mjs
node tests/test_cleverness_v5_worker.mjs
node tests/test_hole_solution_landscape.mjs
```

The landscape is Node-based to reuse the authoritative gameplay engine. It is not imported by any browser component. JSON outputs are local research files, not page assets. V5's browser section stays lazy and never changes a shot or score. Research combinations failed to reproduce the supplied human route ordering; there is no final cleverness rating.
