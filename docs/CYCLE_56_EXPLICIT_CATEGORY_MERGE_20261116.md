# Electropanel — explicit-category draft circuit merge: 56 linked work and acceptance checks

**Existing PR #12.** The project already includes deterministic opt-in **splitting** of a single draft circuit (`consumer-group-split-v1.js`). This new cycle adds a different capability: engineer-labeled categories that may propose **merging separate untouched draft circuits** of an identical phase under explicitly entered power and consumer-count constraints. All outputs remain preliminary. The following are connected design decisions, implementation actions and regression criteria, not 56 independent standalone features.

## Engineer-defined scope (1–8)

1. [x] Engineer explicitly opts in to category-based merging.
2. [x] Engineer provides the category associated with each circuit ID.
3. [x] Consumer names never determine the electrical category.
4. [x] Existing consumer and circuit identifiers are the source of truth.
5. [x] Do not infer the building type, RCD grouping or intended protection.
6. [x] Cable length, location, route and external transformer are not prerequisites.
7. [x] Only full untouched draft circuits may be combined.
8. [x] Engineering approval and installation readiness are always false.

## Rules and import validation (9–16)

9. [x] Require a positive maximum sum of connected kW.
10. [x] Allow a separate optional consumer-count limit.
11. [x] Reuse already tested power and count validation from group splitting.
12. [x] Accept decimal commas without unit inference.
13. [x] Validate categories as explicit bounded Unicode labels.
14. [x] Reject duplicate mappings for the same circuit ID.
15. [x] Reject unknown fields and forged approval flags.
16. [x] Validate saved rules on project import; old projects need no rules.

## Structural and electrical safety (17–24)

17. [x] Require valid unique project circuit IDs.
18. [x] Require valid unique consumer identifiers and ownership.
19. [x] Require finite positive individual consumer powers.
20. [x] Verify declared circuit power equals the sum of assigned consumers.
21. [x] Reject orphan categories referring to absent circuit IDs.
22. [x] Refuse to merge circuits in different phases under one category.
23. [x] Do not silently assign a missing circuit phase.
24. [x] Merge whole circuits only; never split a consumer during merge.

## Protected existing design (25–32)

25. [x] Refuse circuits with a selected catalogue article.
26. [x] Refuse circuits with manually declared Ib or existing load-current calculation.
27. [x] Refuse circuits with fault, cable or route design records.
28. [x] Refuse circuits attached to shared RCDs.
29. [x] Refuse any circuit with declared conductor, feed or terminal links.
30. [x] Refuse circuits with fixed DIN placement or terminal-model binding.
31. [x] Refuse circuits carrying fault scenarios, manufacturer coordination or supply graph edges.
32. [x] Refuse circuits whose apparatus designation is already selected.

## Deterministic preview and application (33–40)

33. [x] Partition proposals by exact category and phase.
34. [x] Use deterministic descending-whole-circuit first-fit packing.
35. [x] Never exceed the engineer's kW limit.
36. [x] Never exceed the engineer's consumer-count limit.
37. [x] Preserve a stable original circuit ID, delete only merged source draft circuit rows.
38. [x] Retain original consumer IDs, names and individual powers while reassigning circuit IDs.
39. [x] Recompute an exact proposed plan on current project and reject stale or altered plans.
40. [x] Never mutate original project during preview or a failed application.

## UI, output and integrations (41–48)

41. [x] Show category merging inside the existing load-to-board workflow.
42. [x] Accept simple `Circuit ID;Category` rows, no category inferred automatically.
43. [x] Keep preview and apply as two separate deliberate actions.
44. [x] Show source circuits, surviving ID, category, phase, combined kW and consumer count.
45. [x] Validate updated branch apparatus model and existing DIN positions after application.
46. [x] Integrate with autosave and Undo/Redo, clearing stale preview across project changes.
47. [x] Include optional merge proposals in engineering bundle, print and issue register.
48. [x] Drop merged-away category mappings and retain only still-existent circuit references.

## Regression and delivery (49–56)

49. [x] Test immutable deterministic preview and distinct consumer identities.
50. [x] Test conservation of connected power and reassignment without deleting consumers.
51. [x] Test no name inference and no phase mixing.
52. [x] Test count, power limits and refusals for protected circuits.
53. [x] Test stale or forged proposals, duplicate IDs, unknown categories and invalid power.
54. [x] Test saved rules and engineering print/dossier integration.
55. [x] Run Chromium preview, apply, saved JSON, Undo and Redo through actual UI.
56. [ ] Final acceptance on exact final HEAD: all GitHub JavaScript, validation and Chromium CI jobs SUCCESS.

## Dedicated circuit exclusions

The engineer may explicitly enter `separateCircuitIds` (via the “Отдельные линии” input) to block merging a dedicated circuit even when its category and phase match other circuits. The list is validated for duplicate IDs, bounded content and references to existing circuits. Adding an exclusion after preview invalidates the previous proposal; deleting it requires a new preview. This is a deterministic safety rule, not inferred from text labels.

## Remaining design work

The category merge engine intentionally does not assign an RCD group, protective device, cable, current values or terminal wiring. Those depend on the circuit's function and project-specific electrical conditions. After a reviewed merge, the established current calculation, apparatus shortlist, single-line, DIN and BOM workflow can be used.

Next valuable work: reusable **engineer-defined category presets and separation constraints**, e.g. dedicated loads that must not merge; preview/review of RCD topology; explicit structured category management rather than editing a mapping text field; reference commercial project integration; improved real series visuals and existing schematic auto-refresh.
