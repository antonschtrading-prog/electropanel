# Electropanel — cycle: opt-in consumer grouping, 56 connected acceptance items

**Work:** PR #12, existing branch `feature/design-evidence-integrated-20261114`. This checklist records linked implementation steps, regression cases and acceptance criteria, not 56 independent new modules or commits.

## Scope and input ownership (1–8)

1. [x] Grouping is explicitly requested by the engineer.
2. [x] Source of truth remains existing consumer IDs and original circuit IDs.
3. [x] No grouping inferred from consumer names.
4. [x] No input source provenance documents required.
5. [x] Unknown cable routes/lengths do not block preliminary grouping.
6. [x] External network and transformer model not used as arbitrary prerequisites.
7. [x] Existing phases remain unchanged when groups split.
8. [x] Proposed groups are draft projections, never engineering approval.

## Engineer-controlled grouping rules (9–16)

9. [x] Engineer enters maximum sum of *connected* power per circuit in kW.
10. [x] Optional maximum count of consumers per circuit.
11. [x] Decimal comma accepted for connected-power limit.
12. [x] Reject zero, negative, non-finite and malformed limits.
13. [x] Reject fractional, zero or implausibly large consumer count.
14. [x] Reject unknown, invented or forged rule fields.
15. [x] Validate saved rules on JSON import.
16. [x] Preserve older projects with no grouping rule as NOT_REQUIRED.

## Safe deterministic proposal engine (17–24)

17. [x] Use current explicit powerKw of assigned consumers.
18. [x] Do not move consumers between unrelated existing circuits.
19. [x] Only propose splitting groups whose rules are exceeded.
20. [x] First-fit decreasing allocation with deterministic consumer-ID tie breaker.
21. [x] Retain original circuit ID for the first group.
22. [x] Never split an indivisible consumer exceeding power limit.
23. [x] Flag malformed powers, duplicate load identifiers and orphan consumer associations.
24. [x] Show the exact consumer IDs, grouped kW and source circuit before applying.

## Existing protection and topology safeguards (25–32)

25. [x] Do not split circuits with a selected catalogue article.
26. [x] Do not split circuits with engineer-declared Ib or a linked load-current calculation.
27. [x] Do not split circuits with existing fault or cable-design evidence.
28. [x] Do not split circuits belonging to shared RCDs without explicit topology review.
29. [x] Do not split circuits with feed or conductor route declarations.
30. [x] Do not split circuits already connected to terminal-model evidence.
31. [x] Do not split circuits referenced by calculated fault scenarios or manufacturer coordination records.
32. [x] Do not silently change manual DIN placements or fixed layout assignments.

## Safe project application (33–40)

33. [x] Apply only after an explicit user action on a previewed proposal.
34. [x] Recompute all proposals on the current project before any mutation.
35. [x] Reject stale plans when consumer power, group membership or rule changes.
36. [x] Reject newly created circuits above the 400-circuit cap.
37. [x] Allocate new branch IDs avoiding conflicts with lines, loads, shared devices and apparatuses.
38. [x] Preserve individual consumers, their IDs and declared powers.
39. [x] New circuits have no silently selected protection or invented apparatus SKU.
40. [x] Check resulting branch model and DIN fit before committing changes.

## User workflow, persistence and reporting (41–48)

41. [x] Display grouping as a collapsible part of the unified engineering workflow.
42. [x] Do not prefill invented maximum-power design assumptions.
43. [x] Separate preview and apply actions in the UI.
44. [x] Keep a preview transient rather than modifying the project.
45. [x] Invalidate cached previews after project changes.
46. [x] Save explicit accepted grouping rules in project JSON and undo/redo history.
47. [x] Include optional grouping decisions in engineering bundle.
48. [x] Print group proposals with consumer IDs and kW totals, explicitly as draft.

## Testing, reproducibility and acceptance (49–56)

49. [x] Unit test deterministic output with no source mutation.
50. [x] Unit test correct consumer association and total power after apply.
51. [x] Unit test every major selected-device, supply, shared-RCD and evidence guard.
52. [x] Unit test malformed rules, forged fields, duplicate IDs and stale plans.
53. [x] Unit test count and kW thresholds together.
54. [x] Integration test JSON persistence, optional rule absence and dossier/print output.
55. [x] Chromium test interactive preview, apply, saved rule and undo/redo.
56. [ ] Final acceptance: all three GitHub checks must succeed on **the exact final HEAD**.

## Engineering boundaries

This is deliberately **not** grouping by name. A text label such as “lighting”, “sockets” or “air conditioning” is not sufficient to determine common protective devices, load diversity, RCD membership, cable type or circuit separation. The first grouping engine can split an **unprotected draft circuit** under the explicit connected-power/count limits provided by the engineer. It does not merge unrelated circuits, change a selected electrical system, assign cable lengths or issue installation approval.

Future automation should support engineer-defined categories and allowed group matrices, then add a separate explicit review stage for prospective common RCDs, protection coordination and auto-selected DIN apparatus.

This module is intentionally designed to keep the customer's primary workflow lightweight: **enter loads and constraints → preview groups → accept → continue calculated current, apparatus selection, schematic, DIN, specification**.
