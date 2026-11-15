# Protection hierarchy audit — engineering draft

## Implemented

- `protection-topology-v1.js` audits explicitly declared radial relationships between project line IDs.
- Input: `epProtectionTopologyV1(project, links)`, where links are records `{downstreamLineId, upstreamLineId}`.
- Detects absent endpoints, duplicate parent links, self-links, cycles and invalid/duplicate line IDs. No upstream path is fabricated from physical DIN order or nominal ratings.
- The engineering bundle reads optional `project.protectionLinks`, carries the audit under `sections.protectionTopology`, and includes its issues in the common register and printable report.
- Independent and bundle-level regression tests cover invalid topology, no evidence, reporting, non-mutation, and HTML escaping.

## Engineering limitations

- `selectivityStatus` remains `NOT_ASSESSED` regardless of whether topology is structurally valid.
- No manufacturer time-current curve, energy selectivity table, I²t, fault location, network topology, or breaker discrimination limit is inferred.
- This is **not** an automatic selective coordination calculation, normative design approval or an installation authorization.
- The UI now includes an editable circuit-to-circuit hierarchy panel. Project JSON uses `protectionLinksVersion: 1` and `protectionLinks`; imported topology is strictly checked, cycles rejected, and updates go through existing undo/redo and autosave. Chromium tests exercise the UI path, but success is not claimed until CI is verified.
- Deleting a line removes incident hierarchy links. Missing upstream relationships remain explicitly unknown.
- A line is an editor circuit, not an automatically proven unique upstream breaker identity. Wider modeling of main/incoming and shared protection devices requires an explicit and stable device graph before topology can serve as a project-wide coordination basis.

## Next acceptance criteria

1. Reconcile graph edges against actual protective devices and circuit connectivity, not DIN positions: current editor uses circuit IDs only.
2. Add an explicit stable graph for main/incoming and shared protective apparatuses; do not claim a circuit ID is proof of a physical breaker path.
3. Add applicable manufacturer selectivity evidence (article pair, voltage, settings, current ranges, revision/source and location) with strict source and scenario checks.
4. Extend Chromium coverage to importing a JSON file and deleting a linked circuit, and verify results on the exact final HEAD.

No local or GitHub Actions test outcome has yet been established for this current cycle.

## 2026-11-16 — Device identity reconciliation

- Added `protection-device-chain-v1.js`: a read-only projection of declared protection hierarchy edges onto stable `branchDevices[].id` mappings (version 1) and selected catalogue article IDs. Device IDs are not inferred from DIN position.
- The module detects missing or repeated apparatus identities, catalogue lookup errors, non-overcurrent articles, missing manufacturer verification and unresolved physical path evidence. If an upstream In is below a downstream In, this is only a review issue, not a certified selectivity failure.
- Both the engineering bundle and issue register now carry these findings. The printable HTML report and board workspace show explicit pair identities, selected articles and `NOT_ASSESSED` selectivity.
- Added focused regressions and Chromium UI scenario assertions. Source code inspection alone is not acceptance; confirm CI on this exact final commit.

**Current scope:** it reconciles two declared circuit protection-device identities, not a power-supply topology. An incoming breaker outside `lines`, shared protection devices, upstream power sources, and terminal/wire continuity require a separate stable device graph before physical or selective coordination can be tested.

## 2026-11-16 — Supply source / shared RCD / outgoing apparatus evidence graph

- Introduced `supply-device-graph-v1.js`, which reads existing `branchDevices`, `sharedDevices`, `feedLinks` and `groupInputLinks` instead of inventing additional physical wiring or changing the saved project schema.
- Distinguishes source, shared-RCD and branch apparatus nodes. Keeps L1/L2/L3/N declarations with their saved source IDs, and checks missing, duplicate, extra or contradictory feeds. Reports impossible overlapping RCD memberships.
- Reconciles declared upstream line-protection relationships as **unrepresented physical connections** because the existing symbolic feed model cannot encode BRANCH→BRANCH power paths. Such pairs are never labelled as proven or selective.
- Added evidence to engineering bundle, issue register, printable report, board UI and the real Chromium scenario, with focused and integration regressions.
- All results remain DRAFT / NOT_VERIFIED; neither the graph nor a larger upstream breaker rating demonstrates electrical continuity, trip coordination, manufacturer applicability or compliance.

Next: add a versioned device-to-device supply model able to express incoming breakers and branch-to-branch feeds without silently converting symbolic declarations to physical facts; reconcile device and terminal identities, ratings, and manufacturer evidence.

## Device-to-device supply declarations v1

- `device-supply-v1.js` provides a separate versioned project input `deviceSupplyV1`, including explicit incoming devices and user-declared directed feeds between `SOURCE:MAIN`, `INCOMING:id`, `GROUP:id`, and `BRANCH:id`.
- Input validation rejects duplicate IDs, nonexistent endpoints, cycles, multiple upstream parents, invalid conductor sets, and neutral-only phase feeds before any editor mutation. Historical projects with no `deviceSupplyV1` remain valid and do not receive invented paths.
- Dedicated audit distinguishes missing upstreams, branch/group phase mismatch, declared group membership contradictions and still-unreconciled legacy `feedLinks` / `groupInputLinks`. The model **does not** infer conductor continuity, enclosure terminal identities, rated breaking capacity, coordination or selectivity.
- The UI supports adding/removing incoming devices, entering/removing device supply relations and undo/redo. Project import validates the saved model. Engineering bundle, issue register and print expose independent evidence.
- On circuit removal, links to its outgoing device are removed; any downstream declarations may become incomplete, never silently reparented.
- No IEC/GOST compliance or installation approval is produced from this graph; manufacturer technical parameters and source provenance are separate evidence tasks.
