# End-to-end engineering dossier: implementation and acceptance

## Implemented in this batch
- Manufacturer-specific BOM groups selected SKU keys; does not invent substitutes or prices.
- Shared protective devices and branch apparatus are separate BOM entries.
- BOM reports unknown article, invalid catalogue geometry, stale branch bindings, missing source and width disagreement.
- Quantity, owners, article source and catalogue module width remain traceable.
- BOM explicitly reports how many expected apparatus lack catalogue evidence.
- Visible live BOM in board engineering panel, with full issue list.
- CSV and JSON BOM exports; CSV cells neutralize formula-like user strings.
- Consolidated JSON draft report includes circuit dossier, BOM, DIN plan and engineering gate.
- Bundle sections fail closed if their computation is unavailable.
- All generated artifacts are marked DRAFT; engineering approval and installation readiness remain false.
- Browser selection of circuit connects line editor, logical graph, DIN apparatus and searchable workspace.
- Regression tests cover grouping, missing articles, widths, branch mapping, XSS, formula safety, and export wiring.

## Acceptance scenarios
1. Two circuits using the same verified SKU produce one BOM row with quantity two.
2. An upstream shared RCD remains an independent apparatus in the BOM.
3. Changing a circuit's SKU changes its BOM entry after the common render.
4. A missing or unrecognized SKU is an issue, not a generic replacement.
5. DIN-width disagreements are blocking even if the device can be drawn.
6. CSV cannot execute formula-like user content on spreadsheet import.
7. No generated report asserts electrical or normative compliance.
8. All reports are computed from the current state, not cached selection or filtered view.
9. JSON bundle contains all independent audit sections.
10. Missing engineering-gate computation blocks the consolidated bundle.

## Still required before a production engineering design
- Independently verified catalogue breadth, manufacturer source versions and technical datasheets.
- Cable sizing and protection selection against applicable project-specific normative rules.
- Terminal-level model for actual N/PE and protective-device connections.
- Physical enclosure/thermal/clearance verification and full mounting constraints.
- Browser-based visual acceptance and independent review of end-to-end example projects.
