# Fire-control integration: draft engineering workflow

Scope: an external fire-alarm system supplies declared signals. Electropanel describes electrical interfaces at the panel; it does **not** design fire detection, alarm logic, evacuation, suppression or commissioning.

## Inputs
- `fireControlV1.version=1`, `signals[]`, `actions[]`
- `fireControlV1.design.assignments[]` (optional): engineer-declared device identifiers, article SKUs, control voltages, supply references, terminal IDs, DIN placement, wire references and review state
- Each action targets a **consumer ID**, not a protective breaker. Replacing a breaker cannot silently reassign a fire action.

## Projections
- `epFireControlAuditV1`: signal, action and actuator conflicts
- `epFireControlTraceV1`: zone → signal → consumer → circuit, with explicit missing-evidence flags
- `epFireControlDesignV1`: declared actuator assignments, identity validation, DIN collision and rail-capacity audit
- `epFireControlScheduleV1`: draft control schematic schedule, terminals, device list, preliminary SKU counts
- `epFireControlBillV1`: type-level quantities, with SKU selection still required

All projections remain `engineeringApproved:false`. No calculated protective performance, tested operation or installation readiness is asserted. The schedule is not a wiring diagram.

## User workflow
Open the project automation workflow, expand **Пожарное управление**, edit JSON, then **Проверить и сохранить**. Invalid audit/design input is rejected before updating state. Save/export JSON and restore it later; linked loads and circuits are protected against accidental deletion. Fire-linked groups are excluded from automatic split/merge.

## Known engineering gaps
- Cross-check against real manufacturer article catalogue and electrical ratings
- Control circuit power and protective device selection
- Contact and coil terminal pin mapping, interlocks and fail-safe strategy
- DIN collisions against **all other** panel devices (current check covers fire assignments only)
- Full single-line and control wiring graphics
- Validation against project-specific applicable standards and approved design documentation
- CI/test execution evidence: pending; commits alone do not prove a green build

## Regression coverage
`tests/fire-control-v1.test.js`, `tests/fire-control-integration.test.js`, `tests/fire-control-safety.test.js`, `tests/fire-control-ui-integration.test.js`, `tests/fire-control-trace.test.js`, `tests/fire-control-design.test.js`, `tests/fire-control-schedule.test.js`.

Run from repository root: `node --test tests/fire-control-*.test.js` (requires Node.js with built-in test runner). Do not mark tests passed until a run is observed.

## Integrated catalogue, DIN and export stage
- `epFireCatalogReconcileV1(project,lookupSku)`: compares the exact engineer-selected SKU to catalogue category, DIN module width, coil voltage and source evidence. A missing SKU blocks this projection; no substitute is selected.
- `epFireDinReconcileV1(project)`: compares declared fire actuator positions against `dinPlacementsV1` when the project supplies them; flags collisions and rail capacity overflow. Missing full-board layout remains UNKNOWN.
- `epFireControlGateV1(project,lookupSku)`: consolidates scenario, design, trace, schedule, catalogue and DIN evidence. Never marks a project approved automatically.
- `epFireControlCsvV1` and `epFireControlBomCsvV1`: export draft control circuit schedules and exact selected-SKU quantities as semicolon-delimited CSV. Spreadsheet formula injection is escaped.

The editor now offers JSON evidence export, control schedule CSV and preliminary BOM CSV. The engineering bundle includes FIRE_CATALOG, FIRE_DIN and FIRE_CONTROL_GATE sections.

### Limitations of catalogue evidence
Existing curated catalogue records mainly cover protective devices. Do not mislabel an MCB as a contactor or claim that a manufacturer coil voltage is verified when its catalogue record does not contain that field. A manufacturer-specific actuator series and compatible coil still require engineer selection and authoritative evidence.

### Test additions
`tests/fire-reconciliation.test.js`, `tests/fire-control-export.test.js`, `tests/fire-control-gate.test.js`.

## Fifty linked review criteria (next cycle)
`epFireControlChecklistV1` produces exactly 50 traceable criteria (FCHK_01–FCHK_50), grouped as:
1. Project and consumer/circuit identity: 01–10
2. External signals and contact interpretation: 11–20
3. Action mapping and fail-state declarations: 21–30
4. Actuator and supply evidence: 31–40
5. Terminals, DIN layout and handoff: 41–50

Each criterion has a code, scope, status and explanation. `PASS` only means that the **specific declared evidence criterion** was met; it does not establish design approval. A missing requirement is `REVIEW_REQUIRED` or `BLOCKED` as appropriate. The pin-level mapping criterion FCHK_50 remains unresolved until a real, reviewed terminal pin model exists.

The checklist is included in the engineering bundle, overall fire-control gate, project draft JSON report, UI and a semicolon-delimited CSV export. The CSV is spreadsheet-formula-safe. Regression tests exercise every criterion against a baseline and intentionally violate 49 other conditions, including input volume limits.

### Remaining design work
A checklist is not a substitute for electrical schematics. Next implementation priorities are real manufacturer contactor/relay/UVR/shunt accessory evidence, terminal pin assignments, control supply topology, electrical interlocks, complete panel DIN geometry, and actual graphical control schematics. Do not promote a review checklist to normative certification.

## Logical interface drawing (SVG) and topology (new integrated stage)
`epFireControlTopologyV1(project)` constructs typed nodes for external signals, commands, actuators, loads, circuits, control supplies and declared terminals. The graph carries six distinct link types: logical triggers, logical commands, actuator assignments, control supply references, terminal assignments and load-to-circuit associations. It does **not** assert actual wire continuity.

`epFireControlDiagramV1(project)` renders a deterministic SVG view of those declared nodes and relations, with escaped labels, a visible NOT FOR INSTALLATION warning and no inferred manufacturer pin numbers. The browser provides preview and SVG download. The graph relations can also be exported to CSV for engineering review.

Both projections are included in the consolidated gate, engineering evidence bundle and JSON report. Graph construction flags orphan references, reused terminal references, shared actuators, unassigned devices, missing supplies, missing articles, unreviewed assignments, and actuator-specific safety questions. For all schematic outputs, the external fire alarm, evacuation and suppression system design remains out of scope.

**Important distinction:** a symbolic SVG is a real visual output, but it is not yet a standards-compliant electrical control schematic. To reach that stage, the application still needs manufacturer-backed terminal pins and contact functions, explicit supply/protection wiring, return circuits, interlock logic and a checked drawing standard.

## Engineer-declared manufacturer terminal pin evidence
Optional `fireControlV1.design.assignments[].pins` entries bind a previously declared terminal ID to a manufacturer device pin. Every entry declares:
- `terminalId`: terminal reference already present in `terminalIds`
- `devicePin`: manufacturer pin marking (e.g. A1, A2), entered by the engineer
- `role`: one of COIL_A1, COIL_A2, COMMON, NO, NC, TRIP, RETURN, OTHER
- `verifiedSource`: an HTTPS manufacturer evidence reference supplied by the engineer

Invalid mappings, repeated pins and orphan terminal references are blocked. Explicit mappings add DEVICE_PIN nodes and ENGINEER_DECLARED_PIN_BINDING edges to the logical graph and appear in SVG/CSV. FCHK_50 may pass when all action mappings have such declared evidence. This does **not** verify the URL contents or infer that the full control circuit is correct. It does not approve installation or resolve return wiring, interlocks, protection, ratings or supply compatibility.
