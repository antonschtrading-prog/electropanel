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
