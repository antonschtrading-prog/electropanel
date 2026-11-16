# Electropanel — unified engineer workflow: 56 connected tasks and acceptance checks

**Scope:** work delivered in the existing PR #12 without replacing existing modules, source data, or user choices. This matrix records connected engineering tasks and regression criteria, **not 56 new standalone features**.

## Consumer and circuit source model (1–8)

1. [x] Use the existing `loads` inventory as the consumer source.
2. [x] Preserve consumer IDs and their explicitly assigned circuit IDs.
3. [x] Show consumer names in the unified circuit workflow.
4. [x] Flag consumers assigned to nonexistent circuit IDs.
5. [x] Never regroup consumers silently based on names or apparent similarity.
6. [x] Use the existing circuit power, normally reconciled from consumer assignments.
7. [x] Distinguish unknown circuit power from zero or malformed values.
8. [x] Leave undeclared phase assignments unchanged.

## Reusable calculation assumptions (9–16)

9. [x] Capture a single shared engineer-entered power factor.
10. [x] Capture an explicit demand factor rather than assuming simultaneity.
11. [x] Capture efficiency explicitly without inventing motor characteristics.
12. [x] Capture single-phase supply voltage only for relevant single-phase circuits.
13. [x] Capture three-phase line-to-line voltage only for three-phase circuits.
14. [x] Support decimal commas and enforce finite positive bounded values.
15. [x] Validate and persist shared source values in the existing project JSON flow.
16. [x] Reject unexpected saved approval flags and unsupported input fields.

## Existing electrical current engine (17–24)

17. [x] Reuse `epLoadCurrentV1` rather than duplicate its formulas.
18. [x] Select single- or three-phase calculation from actual line phase.
19. [x] Reject calculations when the relevant voltage is unavailable.
20. [x] Leave missing or zero/invalid power without a manufactured Ib value.
21. [x] Provide a read-only preview before applying changes.
22. [x] Calculate Ib for multiple eligible circuits with one explicit action.
23. [x] Never overwrite a manually declared Ib, including an invalid value.
24. [x] Record calculated Ib provenance and linked circuit power; preserve undo and redo.

## Apparatus suggestions and user approval boundary (25–32)

25. [x] Reuse the existing shortlist engine for each circuit.
26. [x] Filter out candidates rejected by known current or pole constraints.
27. [x] Distinguish provisional INCOMPLETE candidates from POTENTIAL ones.
28. [x] Display selected and suggested catalogue article side-by-side.
29. [x] Require a real user click before assigning any draft article.
30. [x] Re-run shortlist selection against live project state before assignment.
31. [x] Forbid silent replacement of an article already selected by the engineer.
32. [x] Delegate article assignment to existing `applyCatalogueSku` DIN/pole/geometry and impact validations.

## Existing engineering outputs (33–40)

33. [x] Retrieve the existing one-line draft for the same project.
34. [x] Retrieve the existing DIN layout from existing branch apparatus IDs.
35. [x] Retrieve the existing bill of materials from actual selected SKUs.
36. [x] Show independent workflow steps for loads, apparatus, scheme, DIN and BOM.
37. [x] Show installed current count and missing-current count without normative approval.
38. [x] Display approximate per-phase active power from declared circuit phases.
39. [x] Suggest, but do not apply, basic active-kW imbalance improvements.
40. [x] Never claim phase imbalance heuristics account for differing cos phi or simultaneous use.

## UI, persistence and exports (41–48)

41. [x] Place one connected workflow panel next to the existing consumer editor.
42. [x] Preserve user's inputs while previewing without mutating project state.
43. [x] Provide explicit “calculate missing Ib” batch action.
44. [x] Provide per-line checked provisional apparatus selection.
45. [x] Surface consumer groups and current source in one review table.
46. [x] Export a semicolon-separated UTF-8/BOM CSV of circuits, consumers, currents and suggested devices.
47. [x] Neutralize spreadsheet formulas and escape embedded quoted fields in CSV.
48. [x] Include the combined workflow in the existing engineering bundle and printed dossier.

## Engineering regression and acceptance (49–56)

49. [x] Unit test three-phase `sqrt(3)` arithmetic via the existing engine.
50. [x] Unit test missing phase, power and relevant source voltage.
51. [x] Unit test preservation of manual Ib and idempotent batch runs.
52. [x] Unit test rejected apparatus candidates, incorrect pole counts and silent replacement prohibition.
53. [x] Unit test consumer assignment errors and read-only phase balance hints.
54. [x] Integration test project JSON restoration with shared calculation inputs.
55. [x] Chromium scenario exercises real preview, batch save, manual apparatus choice, export view and Undo/Redo.
56. [ ] Accept only when JavaScript, repository validation and real Chromium checks all succeed on the exact last HEAD.

## Important scope rules

- User-entered electrical inputs are assumed truthful. Calculation code checks formats and mutual consistency, not whether the real facility physically matches the input.
- Unknown cable route or cable length must not block preliminary panel design. Dependent calculations are not invented.
- External network calculations, selectivity and manufacturer documents are not silently made mandatory for every project.
- Candidate article assignment is **draft only**; it does not certify Icn, cable ampacity, type-of-load protection or final normative fitness.
- Phase balancing suggestions are only active-power heuristics and cannot be applied without engineering review.
- Full automatic consumer grouping remains deliberately **unimplemented**: consumer names alone do not determine safe electrical grouping, protection or RCD coverage. Existing assignments are displayed, never guessed.
- Production-quality verified brand front illustrations, network plans and installation drawings remain separate future work.

## Next value-generating cycle

1. Provide an explicit engineer-editable ruleset for grouping compatible consumers and preview the proposed groups before applying.
2. Add a project-level network assumptions sheet, reusable in the existing fault and overload calculations without requiring external-network design.
3. Connect accepted candidate SKUs to an automatically refreshed single-line drawing and DIN preview with manufacturer/series assets.
4. Implement full cross-view edit propagation for branch protective device changes and group RCD membership.
5. Add reference fixture projects and golden checks for complete office and commercial-panel scenarios.
