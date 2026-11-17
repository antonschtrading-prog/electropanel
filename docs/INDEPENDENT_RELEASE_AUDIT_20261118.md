# Electropanel 1.0 — independent release readiness audit (2026-11-18)

## Baseline and independence
- Source: PR #12 head `8f1230d25649deb7c673e0a1741626a196cbafa9`.
- Approved scope: `docs/APPROVED_TWO_STAGE_PRODUCT_SCOPE_20261116.md`.
- Independent audit branch only; no application or shared CI files changed.
- Commercial shop fixture: lighting 1.5 kW L1, sockets 2.0 kW L2 (manual Ib 9.5 A), HVAC 5.0 kW three-phase; 230/400 V, cos(phi) 0.9, demand 1.
- Fixture apparatus is explicitly unverified and MUST NOT be interpreted as an approved manufacturer SKU.

## Nine-stage traceability
| Stage | Evidence in repository | Release acceptance |
| --- | --- | --- |
| 1 Consumer input | `project-automation-workflow-v1.js`, `loads` | Real UI input and persistence not independently browser-tested yet |
| 2 Load calculation | `load-current-v1.js` | Arithmetic and manual override contract tests added |
| 3 Grouping | `consumer-group-merge-v1.js`, `consumer-group-split-v1.js` | Group edit / identity / downstream reconciliation still needs end-to-end browser execution |
| 4 Cable/protection | `cable-reference-v1.js`, `protective-device-shortlist-v1.js` | Engineering sufficiency remains conditional on applicable evidence; no false approval |
| 5 Single-line | `single-line-draft-v1.js` | Cross-view identity and post-edit browser proof pending |
| 6 DIN layout | `draft-board-plan-v1.js` | Actual UI, collision, and changed SKU layout browser proof pending |
| 7 Cabinet | Cabinet capacity/geometry modules | Preliminary capacity must not be confused with verified manufacturer fit |
| 8 BOM/documents | `draft-bom-v1.js`, `engineering-bundle-v1.js` | Full release document package and post-edit consistency not established |
| 9 Save/reopen/edit | `project-state-v2.js` | Fresh Chromium import/reload/undo/redo run required |

## Defect register
No newly reproduced runtime defect is claimed from source inspection alone. The following are **release evidence gaps**, not confirmed application bugs.

### GAP-01 — Full nine-stage acceptance not demonstrated on current head
- Severity: **P0 release gate** (verification gap).
- Reproduction: open PR #12 HEAD, create commercial-panel project, complete stages 1–9, reload, edit article and group, export all views, compare IDs and quantities.
- Expected: all representations agree before and after edit, with explicit incomplete engineering checks.
- Actual: not yet independently executed end to end on this HEAD; therefore unknown.
- Modules: app, workflow, groups, cable, protection, single-line, board, cabinet, BOM, state.

### GAP-02 — Manufacturer-specific final enclosure fit not demonstrated
- Severity: **P0 if release claims verified physical fit**, otherwise P1 feature limitation.
- Reproduction: select an enclosure without declared verified useful internal dimensions; request final fit confirmation.
- Expected: preliminary recommendation or UNKNOWN, never certified fit.
- Actual: documentation explicitly describes preliminary assumptions; exact final-fit acceptance not independently verified.
- Modules: cabinet capacity, cabinet geometry, apparatus dimensions, supplier evidence.

### GAP-03 — Complete engineering documentation not established
- Severity: **P0 if release promises complete issue-for-construction package**, otherwise P1 scope gap.
- Reproduction: export documentation for the shop fixture and compare line/device/cable/cabinet identities and unresolved checks.
- Expected: coherent specification and drawings, no invented manufacturer values or unconditional approval.
- Actual: source PR documents indicate incomplete full engineering document release; current-head output not independently inspected.
- Modules: BOM, bundle, print, single-line, engineering gates.

## Release classification
- **P0:** no go until independent Chromium end-to-end acceptance, current-head CI and export reconciliation pass; engineering claims must remain conditional.
- **P1:** verified manufacturer front images, detailed enclosure model fit, refined documentation and visual quality beyond agreed minimum.
- **Out of scope:** laboratory/physical tests, validating user-provided source truth, mandatory plan routing or cable lengths for panel-only workflow.

## Automated tests
`tests/independent-release-1-0.test.js` covers:
1. Non-mutating workflow projections and absence of false approval.
2. Orphan consumer rejection.
3. No forced cable length or upstream fault input for draft.
4. Three-phase calculation and preservation of manual current.
5. Missing phase/power does not produce approval.
6. Missing relevant voltage never generates guessed current.

These are **contract/regression tests**, not proof of a fully integrated commercial panel. GitHub Actions results must be checked for the audit PR's latest commit. Do not mark unexecuted browser tests as passed.

## Final release decision
**NOT YET VERIFIED / NO GO pending evidence**. This is not a conclusion that the application is broken. It means the independent audit has not yet demonstrated all acceptance criteria.

## Extended independent audit cycle — cross-view acceptance

New isolated files:
- `tests/independent-release-negative-1-0.test.js`: five negative BOM and identity cases.
- `tests/independent-cross-view-1-0.test.js`: eight cross-projection, edit, overflow and DIN-move cases.
- `tests/independent-known-defects-1-0.test.js`: one characterization of a source-reproducible discrepancy.

### DEFECT-01 — branch article override produces contradictory drawing and specification
- **Severity:** P0 for release if mismatched article assignments can be saved/exported; otherwise P1 if a separate authoritative validation always blocks the state.
- **Reproduction:** create one circuit `L1` with `catalogSku:'A'` and its linked branch device `Q1` with `catalogSku:'B'`, both one module. Project both with `epSingleLineDraftV1`, `epDraftBoardPlanV1` and `epDraftBomV1`.
- **Expected:** one canonical effective SKU across scheme, DIN and BOM, or a BLOCKED status preventing inconsistent issue.
- **Actual (verified from source control flow):** `single-line-draft-v1.js` reads `line.catalogSku` and emits `A`; `draft-board-plan-v1.js` uses `branch.catalogSku ?? line.catalogSku` and emits `B`; `draft-bom-v1.js` uses `branch.catalogSku || line.catalogSku` and emits `B` with only an UNKNOWN override notice. These projections do not themselves block the mismatch.
- **Affected modules:** `single-line-draft-v1.js`, `draft-board-plan-v1.js`, `draft-bom-v1.js`; project-state mutation and final export gate require separate UI verification.
- **Proposed fix in production PR (not made in audit PR):** establish a single authoritative effective article and block or reconcile conflicting line/branch assignments on change/import. Re-run cross-view and export regression after fix.

### Execution evidence and limits
- Earlier audit commit `72abd59e2fca7d92bc41d1c3d3f85fce2b9fbb39`: GitHub Actions JS checks and validation reported success; browser integration was in progress when last observed.
- New audit commits require fresh CI verification. Local git clone failed because the runtime cannot resolve `github.com`; no local Node or Chromium run is claimed.
- This source-level characterization does **not** establish that the public UI can reach or export the conflicting state; that is an additional acceptance step.
- Independent audit test inventory now totals 20 tests (6 + 5 + 8 + 1); only the subset included in completed CI can be called executed.

## Release-gate propagation and exported-data audit (additional cycle)

### DEFECT-02 — blocked schematic does not block aggregate workflow preview
- **Severity:** P0 if an aggregate DRAFT can be exported or mistaken for a non-blocked project; P1 if another mandatory final-release gate prevents this.
- **Reproduction:** valid circuit `L1`, linked branch `Q1`, and shared RCD `R1` whose `circuitIds:['MISSING']` refers to a nonexistent circuit. Generate `epSingleLineDraftV1` and `epWorkflowPreviewV1`.
- **Expected:** aggregate workflow is BLOCKED when its schematic projection is BLOCKED.
- **Actual (source-level characterization):** schematic returns `BLOCKED` with `SINGLE_LINE_GROUP_ORPHAN`, and the workflow's SINGLE_LINE step reports `BLOCKED`, but aggregate workflow `status` is `DRAFT`. The workflow explicitly propagates BOARD and BOM blocking issues but not schematic blocking issues.
- **Modules:** `single-line-draft-v1.js`, `project-automation-workflow-v1.js`.
- **Proposed fix:** propagate any schematic BLOCKED result to aggregate workflow BLOCKED, preserving all detailed issue codes; add browser export gating acceptance.

### DEFECT-01 — export impact confirmed by CSV generation path
- **Reproduction:** same A/B line-vs-branch SKU conflict described above; call `epDraftBomCsvV1(epDraftBomV1(project,lookup))` and compare to the schematic circuit node.
- **Expected:** exported specification and schematic reference the same article or export is blocked.
- **Actual:** BOM CSV contains article B while schematic circuit node contains A. This demonstrates contradictory projection/export values in the module API; UI-level download gating remains unverified.

### Added regression characterization
`tests/independent-workflow-release-gates-1-0.test.js` includes five cases: schematic block propagation gap, BOM mismatch severity, CSV article divergence, positive BOARD blocker propagation, and positive BOM blocker propagation. The independent audit suite totals **25 tests** across five files.

### CI evidence
- For audit commit `311fd99ffa4d3922b59159471d869ebac3221ce6`, all three GitHub Actions workflows completed successfully: JS checks, engineering validation, browser integration. Job steps confirm full Node regression and actual packaged page exercise.
- Later commits (including this audit expansion) require their own CI result before claiming success.
- Current suite is mostly module-level; a nine-stage interactive browser acceptance with post-edit exports and reimport is still a distinct release requirement.

## Bulk acceptance matrix — 31 further scenarios

`tests/independent-release-matrix-1-0.test.js` introduces 31 independent tests in one batch:
- **20 mutation/failure cases:** orphan branch, duplicate branch assignment, missing branch, duplicate circuit/device identifiers, inconsistent module widths, unknown SKU, invalid DIN rail, overlapping/orphan/out-of-range/duplicate/manual-layout inputs, insufficient enclosure, orphan/invalid/multiply-assigned shared protection groups, malformed branch collection, invalid manufacturer dimensions, and missing selected article.
- **8 malformed engineering inputs:** invalid power factor, voltages, demand factor, missing efficiency, unknown fields, and invalid numerical strings.
- **3 acceptance invariants:** decimal-comma parsing, nonmutating phase suggestions, and non-approval of unverified protective candidates.
- The cases invoke actual projectors and assert precise issue codes, non-approval and project immutability; they do not simulate the entire UI.
- **Total isolated audit tests: 56** (6 + 5 + 8 + 1 + 5 + 31). The matrix's newly committed cases remain **unverified until CI completes**.

### Remaining release gates
1. Resolve DEFECT-01 cross-view effective SKU and exported CSV consistency.
2. Resolve DEFECT-02 aggregate BLOCKED propagation from schematic.
3. Confirm post-edit and post-import consistency in real Chromium and validate export gates.
4. Confirm enclosure and article manufacturer evidence against the agreed 1.0 scope.
5. Re-run all relevant checks after any production fix, without treating a green CI as proof of requirements not covered by its tests.
