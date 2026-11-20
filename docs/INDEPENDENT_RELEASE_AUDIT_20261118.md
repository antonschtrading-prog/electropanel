# Electropanel 1.0 — independent release readiness audit (2026-11-18)

## Current verification status — local P0 commercial panel

This addendum supersedes the earlier pending/NO GO conclusions **only for the local P0 evidence recorded in the final section below**. Earlier sections remain the historical audit trail for their respective commits.

- Baseline: local branch `integration-pr12`; merge `dfa84e38c85a77e95d882224dbfce94b975c36d1` combines PR #12 `b1b74b22b4ba5d0c4039ee6f80a231331b30021e` and PR #32 `fd77adf97361cd5a369083287b4417e35f33a552`, followed by the P0 fixes documented below.
- **Local P0 UI acceptance: PASS.** The full commercial-panel route, post-reload editing, repeated document issue, conflict blocking and correction were exercised in real Chromium; downloaded artifacts were parsed and checked.
- **Local regression: PASS.** 5255/5255 Node tests, JavaScript syntax checks, Pages build and the complete Chromium integration passed.
- **GitHub publication and new-head CI: PENDING.** No write access was available; the new commit was not published and no new GitHub Actions result is claimed. `main` was not changed.
- **Engineering/installation release: NOT APPROVED.** `engineeringApproved` and `ready_for_installation` remain false. Arithmetic, drafts and browser evidence do not replace applicable engineering review or verified physical fit.

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

## Guard-layer verification and correction of earlier release-risk interpretation

The source review found an **existing independent cross-view guard**: `epCrossViewAuditV1` in `cross-view-audit-v1.js`, already called by `epEngineeringBundleV1` as the `crossView` section. It compares the canonical line SKU with actual DIN placements and BOM device/article records and can return `BLOCKED` for the A/B mismatch. The bundle aggregates blocked sections into `overallStatus:'BLOCKED'`.

**Important correction to DEFECT-01:** contradictory raw schematic, DIN and CSV projections are real, but it is inaccurate to claim that the *entire* application lacks a consistency guard. The existing bundle cross-view check detects the discrepancy. **Remaining release risk** is whether every UI download/print/export path enforces the bundle or cross-view guard before delivering conflicting artifacts. This has not been demonstrated. Severity remains conditional on export bypass, not automatically P0.

**Important qualification to DEFECT-02:** the standalone workflow preview can report `DRAFT` despite a `BLOCKED` schematic step. However, the larger engineering bundle separately aggregates blocked sections. The severity depends on whether the workflow preview is presented as an authoritative release state or controls any export; this is not yet established.

Five new cases in `tests/independent-aggregate-guard-1-0.test.js` verify: SKU mismatch blocked by cross-view audit, read-only behavior, consistent SKU case, missing placement detection, and stale schematic after rename.

**Updated total:** 61 independent audit tests (56 + 5). This new commit requires fresh CI.

### Next acceptance target
Trace actual application handlers for BOM CSV, schematic print/export and engineering bundle downloads; verify all entry points block or prominently mark contradictory outputs. Do not propose a duplicate validator when the existing cross-view audit already covers the inconsistency.

## Confirmed release-gate bypass in shipped app handlers — source evidence

### DEFECT-03 — standalone BOM and single-line exports bypass cross-view gate
- **Severity:** **P0 for issuing mutually inconsistent project documents**; exported files are explicitly marked DRAFT, which limits the claim, but does not eliminate the inconsistency.
- **Reproduction at module level:** set line `L1.catalogSku='A'`, linked branch `Q1.catalogSku='B'`; generate single-line and BOM. Existing `epCrossViewAuditV1` detects and BLOCKS the mismatch, as tested in `independent-aggregate-guard-1-0.test.js`.
- **Source path in `app.js`:**
  - `exportSingleLineSvgBtn` directly calls `epSingleLineDraftV1(state,catalogDevice)`, renders SVG and invokes `download(...single_line_DRAFT.svg...)` without checking `epCrossViewAuditV1`, bundle `overallStatus`, or even schematic `status`.
  - `exportDraftBomCsvBtn` directly calls `epDraftBomCsvV1(epDraftBomV1(state,catalogDevice))` and downloads `equipment_BOM_DRAFT.csv` without a gate.
  - `exportDraftBomJsonBtn` directly serializes `epDraftBomV1(state,catalogDevice)` and downloads `equipment_BOM_DRAFT.json` without a gate.
  - `workflowExportCsvBtn` directly downloads `epWorkflowCsvV1(epWorkflowPreviewV1(...))` without checking aggregate `BLOCKED` status.
- **Expected:** any contradictory article assignments either prevent standalone document export, or are clearly embedded in the exported artifact with a mandatory blocking notice and reconciliation status. Do not silently deliver contradictory project documents.
- **Actual:** source handlers call download unconditionally after generating draft reports. The existing cross-view guard is available but not enforced in these handlers.
- **Verification boundary:** source-level handler audit is conclusive about missing gate calls; actual UI interaction and download artifacts for this inconsistent fixture have not yet been run in Chromium.
- **Recommended minimal production fix:** centralize a single export eligibility decision using `epEngineeringBundleV1(...).sections.crossView` (and relevant report blockers), and require it in schematic SVG, BOM CSV/JSON, workflow CSV, and other document outputs. Keep draft export possible for nonblocking UNKNOWN states, with clear issue annotations; do not demand unrelated external network/cable length inputs.

### CI
- Audit SHA `591dfa79e09f996dbf71615ff9cabab61d40b7f0`: all three workflows completed SUCCESS, including browser integration.
- Audit SHA with the new cross-view guard tests and this report requires fresh CI confirmation.

## Export entry-point regression characterization

`tests/independent-export-entrypoints-1-0.test.js` adds **10 source-level contracts** against actual shipped `app.js` handlers:
- Three independent draft export handlers (schematic SVG, BOM CSV, BOM JSON) bypass the existing cross-view bundle gate.
- Workflow CSV export does not check aggregate `BLOCKED`.
- DIN placement CSV is a positive control that does reject its own `BLOCKED` result.
- Engineering bundle export is a positive control that serializes the full bundle.
- Draft filenames explicitly identify draft output.
- Schematic SVG and BOM CSV/JSON do not check their own reports' `BLOCKED` statuses.

These tests intentionally characterize **present behavior**, not desired acceptance. A production fix should update these tests to assert guarded exports instead of retaining bypass behavior. No app code is modified by this audit.

**Independent audit suite: 71 tests** (previous 61 + 10). Fresh GitHub Actions confirmation required for this revision.

### Important PR integration note
GitHub currently reports audit PR #14 `mergeable:false`. This may indicate conflicts with the concurrently advancing integration branch. No merge or force update was attempted; inspect and rebase with explicit conflict resolution before integration.

## Candidate remediation in isolated audit branch (not merged)

Commit series `23d4614` / `2306474` / `79bcebe` implements a **minimal cross-view export gate** in `app.js`, updates the source-level tests to require the gate, and adds a real Chromium check in `scripts/browser-integration.cjs` for inconsistent line-vs-branch SKU.
- `epDraftDocumentExportGate` calls `epEngineeringBundleV1` and requires the `crossView` section to exist and not be `BLOCKED`.
- `epRequireDraftDocumentExport` informs the engineer of a blocked export.
- Four standalone exports now call the gate: schematic SVG, BOM CSV, BOM JSON, workflow CSV.
- UNKNOWN status remains exportable as **DRAFT**. Missing optional cable route and upstream external studies do not become universal blockers.
- Existing DIN CSV guard is retained.
- Chromium regression mutates only its in-browser demo fixture, attempts the three primary document exports, checks none reaches `download`, and restores state.
- This is a **candidate fix pending CI**. It does not assert final engineering approval and does not cover every other specialized export handler.
- The independent audit test inventory is now **72** (previous 71 plus one shared-gate contract).

## Expanded coherent release-control batch

The prior candidate `ceb1b2e` was verified with **three successful GitHub Actions workflows** (JS, engineering validation, Chromium). The following separate batch adds:
1. Shared cross-view export eligibility checks to **seven additional engineering deliverable entry points**: conductor SVG, conductor trace CSV, circuit dossier JSON, circuit dossier CSV, protection CSV, design-review CSV, and preliminary cabinet drawing SVG.
2. **56 additional automated source contracts** in `tests/independent-export-surface-matrix-1-0.test.js`: per-entry-point guard presence, ordering before download, single gate invocation, non-approval language, project state linkage; delegated handlers; explicit diagnostics exemptions; fail-closed and draft-UNKNOWN gate semantics.
3. Chromium regression expanded from three to **eight** primary standalone export buttons with contradictory SKU assignments.
4. The **diagnostic** bundle, cross-view issue register and cross-view CSV/JSON remain downloadable even when blocked, to support remediation; these must not be gated as engineering deliverables.
5. **Independent test count is 128** (72 previous plus 56), excluding the additional Chromium assertions.

This is a **targeted safety/control patch**, not a claim of 10x more feature development. New batch must pass fresh JS, validation and browser workflows. Avoid adding blanket gates to JSON project saves or diagnostic reports: an engineer must be able to save and inspect an invalid draft.

### Outstanding
- Verify every new workflow on the exact head SHA.
- Review source test failures and any browser selector/visibility failures before claiming completion.
- Check merge conflicts in PR #14 (`mergeable:false`) and rebase without overwriting concurrently developed PR #12 work.
- No release approval until independent workflow, round-trip persistence, and complete document consistency criteria pass.

## Chromium follow-up: invalid draft retention and diagnostic access

The exact commit `bf1f728` passed all three GitHub Actions workflows. New browser checks added after that confirmation:
- When an inconsistent branch SKU is present, the four **diagnostic** exports (engineering bundle, cross-view CSV/JSON, issue register) remain available; blocking them would hide the information needed to repair the project.
- A user can still save the full inconsistent project JSON for later correction, without dropping the offending SKU. The save operation is intentionally **not** gated by cross-view release eligibility.
- Previous negative export tests remain in place and ensure eight engineering deliverables are blocked for the same inconsistency.

These browser checks are pending CI on the new head. Do not interpret a diagnostic export as engineering approval.


## Final local P0 acceptance update — integrated PR #32 and commercial UI route

### Baseline actually exercised

The production baseline is the local `integration-pr12` branch. Merge `dfa84e38c85a77e95d882224dbfce94b975c36d1` has PR #12 head `b1b74b22b4ba5d0c4039ee6f80a231331b30021e` and PR #32 head `fd77adf97361cd5a369083287b4417e35f33a552` as parents; its tree matched PR #32 before the subsequent P0 fixes. The three GitHub workflows had previously passed on each source head. That historical CI does **not** cover the new local merge plus fixes. `main` was not modified.

### Closed local evidence gaps and corrected defects

1. **GAP-01 / nine-stage interactive evidence — closed for the agreed local P0 draft route.** A fresh Chromium page used actual visible controls to load the commercial fixture, enter 230/400 V and electrical factors, calculate/apply currents, select articles, create a shared RCD group, apply a cabinet, enter manual current evidence, create cabinet geometry, save, reload, edit and issue documents again. This was not a module-only projection test.
2. **Manual Ib/Iz without Ik — corrected and browser-verified.** Ik is optional only for an explicitly blank form field in a panel-only draft. Ib/Iz remain mandatory and positive. Null, omitted, zero, negative and malformed Ik values remain invalid. Empty Ik removes an old declaration; calculated Ik/voltage do not silently become manual declarations. Missing Ik leaves breaking-capacity review unresolved.
3. **Saved-project loss after manual input — corrected and browser-verified.** Import normalization now accepts persisted numeric/string positive Ik, absent Ik, optional voltage and supported fault metadata, while rejecting malformed/unknown fields. A project with `faultInput:{}` and manual Ib/Iz survives actual reload instead of being discarded.
4. **DEFECT-03 export-bypass surface — rechecked and extended.** Coordinated SVG/BOM/document exports remain gated; DIN placement CSV now also requires the shared draft-document gate before its own placement validation and download. In Chromium, a deliberate line/branch article conflict produced no downloads for single-line SVG, BOM CSV/JSON, DIN CSV, circuit dossier JSON, protection CSV and wiring trace CSV. The corrected project restored export.
5. **Diagnostic access retained.** Under the same conflict, engineering bundle, cross-view diagnostic JSON and raw project JSON remained downloadable and exposed the blocked/conflicting state. Blocking these would impede correction and is not required by the release gate.
6. **Browser hygiene corrected.** The cabinet obstacle identifier pattern is valid under modern Chromium HTML pattern `/v` semantics (`WD-1` passes `checkValidity()`), and the inline favicon removes the former `/favicon.ico` 404.

### Commercial acceptance artifact inspection

The UI scenario covered lighting, sockets, HVAC and another commercial load, with calculated currents plus a manual Ib/Iz declaration, four concrete branch article assignments and a four-pole shared RCD. A two-pole RCD was not used to bypass the valid different-phase group restriction.

After reload, the circuit name, group and L1 article were edited through real controls. The second issue was inspected by parsing the downloaded files, not merely observing download events:

- BOM JSON: draft schema, four branch devices with articles and one article-less device, L1 rebound to `SE-A9F74116`, unresolved engineering status;
- BOM CSV: actual article and device material rows;
- single-line SVG: DRAFT heading, L1/L4, `iC60N C16`, QD1;
- DIN CSV: `device_id`, selected article, real branch/group IDs and `actual_terminal_access_verified` field;
- engineering bundle JSON: `bom`, `board`, `singleLine`, `workflowPreview`, `crossView` sections;
- print HTML: `НЕ ДЛЯ МОНТАЖА` and the edited circuit name;
- project JSON: saved project state and reimport/correction path.

The conflicting state persisted across reload and continued to block coordinated exports. Reimporting the valid JSON restored a checked BOM download. `engineeringApproved:false` and `ready_for_installation:false` were asserted, not inferred from green tests.

### Executed local verification

- Full Node suite: **5255 tests, 5255 passed, 0 failed**.
- Syntax check for all repository `.js`/`.cjs` files outside dependencies/build/browser artifacts: **PASS**.
- GitHub Pages package: **PASS — 183 scripts / 188 assets**, nonempty `dist/index.html` and `dist/app.js`.
- Complete `scripts/browser-integration.cjs`: **PASS**, including commercial UI acceptance, persisted design-change review and the prior PR #32 Chromium route.
- Browser runtime: **0 page errors, 0 console warnings/errors, 0 HTTP 4xx/5xx**.

### Current decision and remaining gates

**LOCAL P0 COMMERCIAL-DRAFT ACCEPTANCE: PASS.** This supersedes the old blanket `NOT YET VERIFIED / NO GO pending evidence` for the specific local route and artifacts above.

**GITHUB HEAD VERIFICATION: PENDING.** The commit containing this update must be published to PR #12 and all three workflows must pass on that exact SHA. No such run is claimed here.

**ENGINEERING / IFC / INSTALLATION RELEASE: NOT APPROVED.** Manufacturer-specific final enclosure fit, verified front/CAD geometry, full applicable fault/selectivity/thermal evidence and independent engineering review remain open. Preliminary cabinet capacity and schematic visuals are not verified physical fit. P1 catalogue/visual/geometry and Mac/iPhone checks, fire-alarm interfaces and optional room-plan contour B are outside this P0 acceptance.


## 2026-11-19 — P0 publication confirmation and restored P1 local acceptance

### Baseline and publication boundary

The P0 commercial-panel route was published to PR #12 as `3993d1f34bce56df3722f955e9fb68d9feb2626b`; its required GitHub Actions workflows succeeded. `main` was not changed. P1 implementation starts from that exact published tree and was published as `d65210720585a7239d056c872704c18ad2b99836`; all five exact-head GitHub Actions runs succeeded. Older statements that P0 was local-only or lacked write access are superseded.

### P1 scope independently rechecked after workspace loss

An earlier uncommitted P1 workspace was lost with `/tmp`; no published P0 work was lost. The current candidate was reconstructed in persistent storage and every result below was rerun. No green result is inherited merely from the lost workspace.

1. **Catalogue/source records.** Schneider A9F74116 now carries source-backed body height/depth and separate Icu fields. Hager CDA440D is a live shared-RCD record with exact maker/series/SKU, RCD kind, 3P+N/four-pole identity, four modules, 40 A, 30 mA type A, conditional 6 kA rating and 70 × 83 × 70 mm body dimensions. Official HTTPS sources and review dates are present. Neither record becomes `VERIFIED` solely from source metadata.
2. **Real shared-RCD route.** Chromium selects `HA-CDA440D` through `#sharedRcdSku` during group creation, sees an original RCD SVG with one linked lever, saves/reloads, removes/recreates the group through visible controls and issues coordinated documents. Project JSON, BOM JSON/CSV, DIN CSV and single-line SVG are parsed for the manufacturer SKU `CDA440D`, not just the internal key. The accepted commercial BOM has five catalogued devices and zero missing devices.
3. **Transactional integrity.** Node regressions cover unknown/wrong-kind/wrong-pole rejection without state mutation, manual-current preservation, linked-circuit review on clearing, JSON projection and a full-rail width increase that must fail atomically. The implementation preflights the actual board planner rather than checking only arithmetic module totals.
4. **Cabinet evidence.** The real cabinet panel shows `Hager / CDA / CDA440D` and `70 × 83 × 70`, with an official source link and the `USER_DECLARED` enclosure boundary. Tests explicitly retain false engineering/installation approval and unverified actual mounting/terminal coordinates; Chromium confirms `confirmedCabinetFit:false`.
5. **Visual rights boundary.** Official technical sources and image reuse rights are independent. Hager image-use conditions reviewed in the prior session did not establish redistribution permission for this project. No official raster was copied, no permission status was invented and the manufacturer front-asset library remains empty. Original SVG labels explicitly deny photo/CAD status; malformed review dates cannot obtain source-backed presentation.
6. **Touch/responsive regression.** A real Chromium mobile/touch context creates QD1 with CDA440D through actual controls, verifies no page overflow at 375, 390, 768 and 1024 px, checks a 44 px selector and visible original front, then clears/reselects the article and reloads. This is not physical Mac/iPhone or Safari/WebKit evidence.

### Fresh verification evidence

- `node --test tests/*.test.js`: **5266 passed, 0 failed**.
- Changed JavaScript/CJS syntax checks and `git diff --check`: passed.
- `node scripts/build-site.js`: **183 scripts / 188 assets**.
- Complete `scripts/browser-integration.cjs` in real Chromium: commercial acceptance, touch 375/390/768/1024 select/clear/reselect/reload, design-review reload, and general load/catalogue/calculation/DIN/history/JSON/bundle scenarios all passed.
- Final commercial, general/catalogue-review and touch listeners reported no page errors, console warnings/errors or HTTP 4xx/5xx. The catalogue-review inline favicon removes the previous early 404 rather than filtering it from results.

### Remaining release and engineering limits

All five GitHub Actions runs succeeded on P1 implementation head `d65210720585a7239d056c872704c18ad2b99836`; local green checks were not treated as a substitute for remote CI. Any later head requires its own checks. Rights-cleared official visuals/CAD, independent enclosure/cover/terminal/wiring geometry, physical Apple-device/Safari checks and full normative fault/selectivity/thermal verification remain open. The accepted result is a traceable editable DRAFT and regression-tested software route, not a certified electrical design, manufacturer-approved assembly or permission to install.
