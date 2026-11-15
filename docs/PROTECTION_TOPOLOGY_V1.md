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
- The UI currently loads the audit module, but **does not yet offer an editor for protectionLinks**. Persistence/import schema acceptance and a real Chromium interaction must be implemented and tested as a separate integration step.
- A line is an editor circuit, not an automatically proven unique upstream breaker identity. Wider modeling of main/incoming and shared protection devices requires an explicit and stable device graph before topology can serve as a project-wide coordination basis.

## Next acceptance criteria

1. Add versioned, validated storage of upstream protection-device relationships with explicit IDs and atomic rejection.
2. Render/edit those relations in the existing board workspace and preserve them through undo/redo, reload and JSON roundtrip.
3. Reconcile graph edges against actual protective devices and circuit connectivity, not DIN positions.
4. Add guaranteed manufacturer selectivity evidence (article pair, voltage, characteristic, setting, declared fault range, edition/source and source location) with strict applicability gates.
5. Add independent numeric scenario tests and a full Chromium UI test. CI results must be checked for the exact final HEAD.

No local or GitHub Actions test outcome has yet been established for this current cycle.
