# Integrated project cycle — 14 November 2026

## Problem and implementation
The runtime used the Web entity model (catalogSku / branchDevices), while the newest reconciliation module expected a separate manufacturer/article model. Import rebuilt only the older project fields: undo and reload silently discarded catalogue extensions, load-current provenance, cable selection and design evidence.

- Added an explicit native-model reconciliation projection, consumed by a linked circuit table and engineering JSON bundle. It uses the same catalogue lookup, calculation review and DIN planner as the UI. The older evidence-format function remains available.
- Restored versioned project extensions during JSON import, browser reload and undo/redo. Catalogue records undergo existing validation; bounded recursive input parsing rejects malformed/prototype keys. Derived Ib/formula is recomputed from declared inputs; inconsistent saved current is marked stale.
- Unified seeded and project catalogue entries in manufacturer/series filters, protection candidates and engineering bundle. Applying an article resolves against the supplied project rather than unrelated global state.
- Added opt-in circuit-bound Ib: changes to consumer power refresh the explicit formula, preserving voltage, cos φ, efficiency and demand factor. Manual current overrides disable the link. Phase-mode changes require a new declared voltage and remain stale.
- Added exact module-slot manual positioning with rail bounds and collision rejection. A move freezes other current positions; auto-layout can be restored and the action undone. New devices occupy free slots. Board, preview, reconciliation and bundle use the same planner.
- Extended dependency invalidation to calculation inputs, cable section/context, catalogue edits and manual positions.

## Verification
Baseline: 882 Node tests passed. Added 10 integration regressions covering persistence, tampering, dependent recalculation, manual overrides, phase changes, collision rejection, free-slot placement and HTML escaping. Complete suite: 892 passed locally; static package: 72 scripts / 75 assets.

A committed Chromium regression exercises the actual page: seeded article selection, Ib form, linked consumer update, manual positioning, undo/redo, reload, JSON roundtrip, custom catalogue candidates and bundle. Local Chromium launch is denied by the execution environment's socket policy; GitHub Actions runs this browser scenario independently. Consult commit-specific Actions results for the outcome.

## Boundaries
This cycle does not add manufacturer-certified 3D geometry, expand the three seeded products, verify new normative methods or implement full short-circuit/selectivity/thermal design. Module slots remain nominal 18 mm envelopes; measured enclosure clearances are not inferred. Custom records remain declarations. No engineering approval is inferred from arithmetic, successful tests or a consistent model.
