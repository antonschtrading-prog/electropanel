# Electropanel — synchronized delivery-view consistency checks

Main core workstream. The design tracing module reads four independently
generated draft projections (workflow, single-line diagram, DIN and BOM).

It now compares **only values explicitly present** in those projections:
- circuit phase in scheme/workflow against its declared phase;
- declared Ib against circuit Ib in scheme/workflow (0.001 A tolerance);
- catalogue SKU against DIN placement and BOM versus DIN;
- placement width against BOM device width when present;
- duplicated declared consumer IDs;
- stale linked Ib from the workflow, explicitly as review (not selection).

When projections disagree, a BLOCKED inconsistency is reported; when a
previously calculated Ib is stale, it remains visible but under review.
Each circuit has its own diagnostic count in HTML and exported CSV.

The module never edits the project or reselects an article, cable or DIN
position. Missing values are not guessed and do not count as a numerical
mismatch. This audit does not establish safe installation, device
coordination or conformity to standards. A missing optional consumer list is
not a new requirement for entering an existing cabinet.

Validation: original delivery trace tests, new
`tests/project-delivery-value-consistency-v1.test.js`, Chromium integration,
and full GitHub CI on the exact commit.
