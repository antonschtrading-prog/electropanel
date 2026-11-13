# Integrated engineering workbench — batch acceptance

Status: experimental draft in PR #10. No changes to main or installation approval.

## End-to-end operator journey

1. Open board view and inspect proportional DIN module blocks. These are nominal module widths, not manufacturer-authenticated fronts or enclosure clearance checks.
2. Select a circuit from the searchable circuit workspace, logical graph or board. Its row and preliminary DIN apparatus are highlighted.
3. Review selected article, phase, manually declared Ib, Iz and Ik in the protection workbench.
4. Enter all three currents in their specified units (Ib/Iz in A, Ik in kA); the editor rejects missing, nonpositive, nonfinite and excessive numbers and Ib greater than Iz.
5. Saving input creates a new project snapshot, supports undo and browser autosave, and marks calculations for independent review.
6. Compare actual curated article candidates; candidates violating available arithmetic or pole compatibility are marked REJECTED.
7. A non-rejected candidate may be assigned by explicit user action, using existing catalogue and branch apparatus consistency checks. This is not an automatic engineering recommendation.
8. Changing an article uses the project history and marks calculation review as stale. Article geometry is synchronized with the branch apparatus.
9. Inspect BOM grouping and missing article count; export CSV or JSON.
10. Compare original sequential DIN placement with optional first-fit packing, without altering project or wiring.
11. Export a combined draft JSON with circuit dossier, BOM, original DIN, alternative layout, per-circuit protection assessment and engineering gate.
12. Verify a complete scenario with a curated ABB article and confirm no module ever asserts engineering approval.

## Explicit engineering limits

- Seed catalogue has only three manufacturer records, not a production-ready article database.
- Ib, Iz and Ik are **user declarations**; this module does not calculate design current from load, ampacity from installation conditions, or fault current from network impedances.
- Available shortlist checks only Ib <= In <= Iz, Icn >= declared Ik and phase/pole compatibility. No I2, trip curve, selectivity, RCD protection, conductor thermal withstand or disconnection-time verification.
- Current inputs are not source evidence or certified calculations; saving always requests review.
- A POTENTIAL article is not a recommended, verified or compliant apparatus.
- Physical arrangement is only nominal module packing, not verified manufacturer front artwork, wiring routing, cooling, mechanical clearances or terminal accessibility.
- Alternative packing may change apparent ordering of protective devices and **must not** be interpreted as a wiring plan.
- All exports retain DRAFT and engineeringApproved=false, ready_for_installation=false.
- Release gates: authenticated manufacturer documentation, project-specific normative verification, complete terminal topology, enclosure verification, independent engineering review, visual browser acceptance.

## Regression coverage

- Invalid/manual current input parsing and immutability
- Article matching, insufficient breaking rating, phase/pole and width conflicts
- Selected article navigation, undo, autosave and stale-review behavior
- Proportional DIN blocks, accessible labels and XSS escaping
- Sequential vs first-fit placement, overflow, deterministic ordering and immutability
- BOM quantity and source evidence
- Consolidated JSON sections and conservative status
- End-to-end curated article scenario
