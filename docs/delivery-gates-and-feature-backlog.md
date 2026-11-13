# Electropanel — delivery gates and feature backlog

## Release rule
A new idea must not delay the first usable engineering workflow. Keep proposed features in this backlog; do not silently implement or discard them.

## MVP acceptance gates (all mandatory)
1. Project inputs: supply topology, loads, installation conditions, cable routes and source provenance are explicit; missing safety-critical inputs block approval.
2. Calculations: cable ampacity with correction factors, voltage drop, short-circuit conditions and protective-device coordination have documented applicable standards, assumptions and independently checked reference cases.
3. Device selection: rated current, poles, breaking capacity, trip characteristics, residual-current protection where applicable and manufacturer data are verified. Unknown data never mean “suitable”.
4. End-to-end traceability: each circuit links inputs, calculations, selected catalog SKU, single-line schematic, physical placement and bill of materials. Changes invalidate dependent results.
5. DIN layout: physical dimensions and mounting compatibility are checked; reserve space and thermal constraints are distinguished from purely geometric fit.
6. Schematic: circuit IDs, terminals, neutral/PE separation, connections and cross-references remain consistent after edits.
7. Export: BOM, schematic and calculation report identify versions, assumptions, unresolved issues and verified versus provisional results.
8. UX: complete one representative apartment/house board project without editing raw JSON or source code.
9. Quality: benchmark cases, boundary/failure cases, regression tests and end-to-end browser checks; report coverage of engineering scenarios, not test counts.
10. Release gate: no unverified engineering result may be labeled approved for installation; publication only after CI and manual acceptance checks.

## Parallel visual track (must not block engineering MVP)
- Manufacturer → series → SKU maps to one evidence-backed record: ratings, width, terminal positions, front-face asset, revision and source.
- Replacing an SKU generates a preview and requires explicit acceptance when dimensions or ratings change.
- Realistic DIN rail visualization supports breakers, RCDs, meters, relays, contactors, PSUs and low-voltage modules; no invented product appearance or measurements.
- Visual assets have licensing/provenance metadata and fallback placeholders marked clearly.

## Deferred feature registry
| Idea | Priority | Dependency / reason to defer |
|---|---|---|
| Search and highlight full electrical connection path | High after MVP | Requires verified terminal-level graph |
| Natural-language engineering assistant and voice comments | Later | Must be grounded in deterministic checks, not hallucinated conclusions |
| Reconstruct an existing board from user inputs | Later | Requires stable catalog and terminal graph |
| Cabinet fire suppression modules | Research | Verify certification, operating limits, protected volume and manufacturer installation rules before selection |
| Advanced low-voltage / LED-driver selection | Later | Add electrical, thermal and EMC compatibility rules |
| Photorealistic multi-manufacturer device library | Parallel staged rollout | Licensing, verified dimensions and catalog maintenance |

## Work cadence
Deliver 5–10 related changes per cycle where feasible, with one working user journey as the target. Report changed behavior, verified checks, outstanding engineering risks and CI state. Avoid claiming standards compliance or product readiness from green unit tests alone.
