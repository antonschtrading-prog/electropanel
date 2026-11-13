# Declared conductor trace and RCD neutral segregation — engineering acceptance

Status: experimental read-only DRAFT in PR #10. No main branch change.

## Delivered workflow
1. Select a circuit in the DIN view, searchable dossier or engineering issue register.
2. Inspect its explicit symbolic feed, consumer terminal and shared RCD input connections, with roles L1/L2/L3/N/PE.
3. Where endpoints are explicitly bound to terminals, trace only user-declared wires and their declared closed state. Display terminal IDs in order, or a BLOCKED/UNKNOWN diagnostic.
4. Never infer current flow through MCB, RCD, contactor, switch or load. A declared wire path is not physical verification.
5. Inspect each circuit's expected N bus based on its assigned RCD group, declared N bus and PE bus.
6. Detect neutral shared between independent RCD groups, a circuit assigned to multiple RCD groups, stale or duplicate group N input, orphan and duplicate routes.
7. Both declared conductor trace and neutral segregation are included in the conservative engineering gate; BLOCKED findings cannot be silently downgraded by other sections.\n8. Export circuit wiring CSV, full engineering JSON, full issue CSV and standalone printable HTML with the same N/PE and terminal trace sections.
9. All findings feed the unified issue register, with Russian actionable explanations.

## Fail-closed scenarios
- Missing wiring model or endpoint bindings: UNKNOWN; never a fabricated path.
- Absent terminal or wire, conflicting conductor roles: BLOCKED where the declared graph proves an inconsistency.
- Unknown wire state: UNKNOWN; never assume closed.
- Same terminal referenced twice: inspect explicit binding and clamp occupancy; no implicit connection.
- Wrong RCD N bus or shared N bus across protection groups: BLOCKED.
- Missing N group input or missing PE declaration: UNKNOWN.
- Unmatched RCD N input endpoint: BLOCKED.
- No issue is an installation approval. Manufacturer contact numbers and physical wiring must be independently checked.

## Coverage and limitations
The project stores symbolic references and a separate v4.14 terminal model. These are user declarations, not a verified manufacturer pin map. The wiring tracer does not infer a topology from load names, phase assignment or catalogue article. Cross-circuit links are flagged, not silently treated as one circuit. A shared RCD input can appear in the trace of every assigned outgoing circuit, which is intentionally a shared upstream path rather than independent wiring.

A path composed of several wires can be traced. Device internal links are deliberately excluded. The model does not yet verify loop impedance, PE continuity by measurement, RCD trip characteristics, fault clearance, insulation, terminal capacity, short-circuit thermal withstand or enclosure thermal performance.

## Manual checks
- Create two circuits behind different RCDs; confirm N buses are separate.
- Change one circuit to the wrong neutral bus; verify BLOCKED in the panel, issue register and exported JSON.
- Bind terminal endpoints for an L wire with two declared segments; verify ordered terminal path.
- Remove a segment; verify BLOCKED and that no continuity is inferred through an MCB.
- Confirm circuit selection remains synchronized between DIN, N/PE matrix, wiring explorer and protection workbench.
- Test exports in browser, mobile and spreadsheet; verify formula injection mitigation and HTML escaping.

## Downstream N-bus cross-connection audit
A separate read-only audit compares the explicit terminal endpoints for `BUS:N_MAIN/N` and every declared `BUS:N_<RCD-ID>/N`. It checks whether a continuous declared N-wire path exists between two distinct bus endpoints. A direct or multi-segment path between independently assigned downstream N buses is BLOCKED. A reused terminal for two buses is also BLOCKED. An absent binding or no declared cross-bus path remains UNKNOWN: absence of a drawn wire is **not** proof of physical separation. Internal RCD contacts are never assumed closed. The resulting bus-pair table, issues and ordered terminal paths are included in the UI, engineering bundle, issue register, engineering gate and printable HTML.

Manual regression: map N_MAIN, N_RCD1 and N_RCD2 to three distinct terminals; add a two-segment declared wire between RCD1 and RCD2; verify BLOCKED. Remove the wire; verify UNKNOWN, not PASS. Map both buses to the same terminal; verify BLOCKED. Remove the model; verify UNKNOWN.
