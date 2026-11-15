# Electropanel — integrated fault-model cycle, 56 linked work / acceptance items

**Work in PR #12.** Scope: reuse existing maximum-fault R/X and transformer models, bind them to *specific* apparatus supply nodes, reconcile input assumptions, expose missing engineering evidence, preserve backward-compatible source data and prevent automatic approval.

These are individually testable engineering tasks, integration steps and acceptance checks, **not 56 independent features**. Items marked complete indicate implementation/tests present in the branch; final CI is tracked separately by exact commit SHA.

## A — Existing engineering core and safe scope

1. [x] Inspect the existing transformer uk/loss-derived R/X source equivalent.
2. [x] Inspect the existing maximum prospective fault engine instead of duplicating formulas.
3. [x] Keep maximum three-phase, single-phase L–N and minimum L–PE models distinct.
4. [x] Identify exact incoming/branch apparatus identities from deviceSupplyV1.
5. [x] Reuse versioned supply-parent graph as the declared node-path source.
6. [x] Preserve explicit supply path fingerprints for derived studies.
7. [x] Ensure newly linked calculations never claim physical continuity.
8. [x] Ensure modelled Ik results never certify selectivity/installation approval.

## B — Outgoing-device calculated fault bridge

9. [x] Require an existing outgoing branch apparatus ID.
10. [x] Require a matching circuit and its existing maximumFaultInput.
11. [x] Require comparisonPoint to match the actual BRANCH:ID.
12. [x] Require a supported three-phase or L–N maximum-fault topology.
13. [x] Reject attempts to bind incoming devices with the branch bridge.
14. [x] Capture the selected catalogue article identity and model input snapshot.
15. [x] Capture source path including conductors of every upstream edge.
16. [x] Recompute with the existing maximum-fault engine; reject structurally invalid inputs.

## C — Outgoing-device audit and lifecycle

17. [x] Mark changed selected articles as stale.
18. [x] Mark changed source routing or conductors as stale.
19. [x] Mark changed R/X, cmax, voltage, segments or comparison point as stale.
20. [x] Reject forged top-level approval tokens and duplicated saved bindings.
21. [x] Block calculated Ik above applicable Icn without suppressing current evidence.
22. [x] Withhold obsolete Ik from presented rows rather than presenting stale values.
23. [x] Preserve old project files with no binding rather than inventing binding data.
24. [x] Support explicit unbinding plus circuit deletion cleanup and undo/redo.

## D — Incoming R/X and transformer calculations

25. [x] Require a selected incoming protective device, not a fabricated line.
26. [x] Require an explicit source-to-device path.
27. [x] Reuse the existing THREE_PHASE_POSITIVE_SEQUENCE maximum-fault engine.
28. [x] Support engineer-declared upstream source R/X, source and revision context.
29. [x] Support transformer uk%, power, short-circuit losses and referred network R/X.
30. [x] Exclude downstream cable segments at the incoming-source calculation point.
31. [x] Reject unsupported models, invalid source values and forged source metadata.
32. [x] Preserve stale studies when the device supply path changes or is removed.

## E — Incoming audit and source convergence

33. [x] Block an incoming fault current above applicable Icn.
34. [x] Preserve missing catalogue/passport facts as unresolved engineering evidence.
35. [x] Reconcile incoming and branch studies only under identical ULL and cmax.
36. [x] Require identical explicit source R/X and source document before RX comparison.
37. [x] Distinguish transformer-source comparisons from declared-network R/X.
38. [x] Reject a numerical reversal of incoming/downstream Ik on the same modelled source.
39. [x] Do not compare studies with different source assumptions or fault models.
40. [x] Keep manually declared Ik and calculated Ik separate until point/model context matches.

## F — User workflows and engineering dossier

41. [x] Implement an incoming network R/X and transformer source editor.
42. [x] Implement calculated branch-result binding in the board workspace.
43. [x] Keep existing undo/redo and autosave semantics for both study types.
44. [x] Clean incoming or branch studies when their apparatus itself is deleted.
45. [x] Expose missing per-device calculated studies in an actionable evidence matrix.
46. [x] Provide CSV export of the apparatus evidence matrix.
47. [x] Integrate calculated branch and incoming studies into engineering JSON bundle.
48. [x] Integrate source convergence and evidence matrix into the common issue register.

## G — Reports, security and acceptance

49. [x] Print source, incoming, outgoing and convergence rows distinctly in the dossier.
50. [x] Restore branch-bound calculated fault snapshots through versioned project import.
51. [x] Restore incoming R/X and transformer studies through versioned project import.
52. [x] Test stale imports with changed article, R/X, supply paths and comparison points.
53. [x] Test malformed values, unsupported models, duplicate/forged records and XSS-safe UI.
54. [x] Stress the review matrix with 400 outgoing and 50 incoming devices.
55. [x] Extend shipped-page Chromium scenario with incoming R/X, JSON roundtrip and negative branch binding.
56. [ ] Accept the exact final HEAD only after full Node/JS, validation and real-browser integration workflows all report SUCCESS.

## Engineering limitations

- Transformer and network R/X are engineer-declared data; no independent source authenticity check or full IEC 60909 source calculation is inferred.
- Matching supply IDs does not prove physical conductors or DIN terminal wiring.
- A same-source incoming/branch Ik comparison is only conditional arithmetic consistency, not selective coordination.
- Icn applicability, exact manufacturer ratings, breaking duty and installation requirements remain separately reviewable, never implicitly approved.
- An outgoing-circuit maximum-fault model is scoped to the protective-device node only when the engineer explicitly names that point.

### Next engineering priorities

1. Extend automatic comparison to exact device-specific breaking-duty standards, not a generic Icn proxy.
2. Tie upstream source models to network/transformer equipment revision IDs and invalidate dependent study snapshots after replacement.
3. Build an interactive review work queue with owned action state, source links and robust project migration.
4. Map engineering nodes into the normative single-line draft with actual per-brand/series visuals.
5. Add reference project fixtures and independent benchmark cases for transformer and radial network impedance.
