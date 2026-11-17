# Manufacturer-neutral cabinet options — draft v1

## Architecture decision (2026-11-17)

Engineering loads, circuit topology, selected articles and nominal DIN module widths are the immutable inputs to the orientation comparison. A cabinet manufacturer's SKU is not required to calculate draft alternatives. The user can choose a tall, balanced or wide form factor *after* equipment selection without recalculating protections.

## Current API

`epUniversalCabinetOptionsV1(project, lookupSku, settings)` is a pure, non-mutating preliminary planner. It produces TALL (12 module rail), BALANCED (18) and WIDE (24) candidate profiles. Stable placement preserves the appliance as one indivisible block. Reserve is at least 20% of occupied modules by default; it may need an additional empty rail. These are draft candidates, **not** a recommendation that a particular enclosure will fit.

The output distinguishes DIN rail span, hypothetical useful interior width and height, and optional interior depth when *every* article has a declared body depth. Planning allowances are adjustable and are assumptions, **not normative clearances**. Unknown article depth remains null. No manufacturer exterior dimensions can be deduced.

Input validation blocks invalid/duplicated device identifiers, unresolved article geometry, catalogue/module disagreements, and inconsistent branch bindings. An oversized apparatus blocks only the orientations that cannot accommodate it. Each candidate retains explicit thermal, wiring and mounting review warnings.

## Next integration work

1. Connect the orientation choices to the existing draft board UI; applying a choice must be a separate explicit, undoable action, with no changes to load/current/protection selections.
2. Add user width/height constraints and evaluate all candidates against declared usable dimensions, not against outside cabinet dimensions.
3. Link the selected candidate to the existing versioned cabinet geometry, DIN CSV, drawing and project JSON; validate roundtrips.
4. Add row grouping, heat and connection-space evidence before labeling any enclosure as installation-ready.
5. Add a manufacturer enclosure catalogue only later as an optional matching/filter layer.

Do not remove the existing cabinet geometry engine: it remains necessary for fit checking once a candidate enclosure's *usable interior* geometry is known.

This document makes no claim of certified dimensions, enclosure fitting, standards compliance or finished UI integration.

## Market-pattern revision

Candidates now use enumerated row-count × modules-per-row capacity patterns; e.g., 1×6, 2×12, 2×18, 3×12, 3×18. Candidate list is ordered by total capacity, not by fixed TALL/BALANCED/WIDE categories. Orientation is a comparison of configurations for the same electrical equipment. Patterns are examples of commonly marketed capacities, not an exhaustive catalogue or proof a specific manufacturer sells the shape.

The board screen shows fitting choices. Choosing one validates the complete placement through the existing board planner, records a manual layout, and adds an undo checkpoint. Electrical circuits and device nominal ratings are unchanged. Manual layout is included in project JSON. No enclosure SKU, external size or certified fit is inferred.

Acceptance: small cabinet pattern 1×6, saved manual rail positions, unchanged circuit data, undo/redo and JSON roundtrip are exercised in the Chromium integration test. The board also exports a clearly marked draft, manufacturer-neutral capacity recommendation JSON.

The board offers optional maximum *usable interior* width/height limits (not exterior cabinet dimensions). Values survive project JSON/undo/redo and are applied to preliminary candidate envelopes only. No claims of verified manufacturer fit.

## Cross-view and existing geometric evidence (2026-11-17)

The engineering bundle now carries a cabinetCapacity section with options, usable-space constraints and the board's selected rail configuration. Print HTML includes a preliminary capacity table. Existing cabinet fit audit remains separate evidence.

A rail shape change cannot silently retain incompatible user-declared cabinetGeometryV1. The application requests confirmation before removing the old geometry. Cancellation makes no changes. Approval clears it in an undoable checkpoint, with circuit ratings retained; users must redeclare the usable mounting zones. No manufacturer enclosure is assumed.

Reserved capacity is user-adjustable (0–50%, integer percent), persisted with width/height preferences, and interpreted as minimum whole-module free capacity. The same reserve assumption applies to the interactive picker and exported engineering bundle.

## Packing correctness and UI lifecycle

The initial first-fit-decreasing allocator is not a proof of non-fit. A memoized, bounded exact bin-packing search is now used whenever first-fit fails. A complete search may prove impossible; if the search budget is exhausted, the candidate is explicitly not verified and is never presented as an accepted fit. Complete apparatuses are never split between rows. Repeated rendering does not register duplicate reserve-change handlers.

## Capacity comparison UI

The selector compares all known row distributions for a chosen standard-pattern total (e.g., 36 = 2×18 versus 3×12). No arbitrary 'first 12 options' cutoff can hide the alternate orientation. When inputs/constraints change, the selector falls back to the closest eligible total. This is a draft shortlist, not a catalogue of actual enclosure products.

Orientation labels are *comparative within the same modular capacity*, not assertions about external manufacturer cabinet proportions: the variant with fewer rails is 'wide', with more rails 'tall', intermediate rows are 'balanced', and sole variants are labelled uniquely.

The selected comparison capacity is ephemeral UI state. It is reset when the equipment input signature or declared sizing preferences change; this avoids hiding the nearest small enclosure when switching between separate projects. The selected total remains stable across unrelated redraws.

## Preliminary mounting-space allocation (2026-11-17)

The planner allocates a **declared design allowance**, not a normative clearance: a wiring corridor (default 40 mm) for each DIN row inside a 150 mm planning pitch, a terminal reserve at the top/bottom of the overall usable height (default 0 mm additional), and lateral cabling corridors (default 40 mm on each side, within the existing 70 mm side allowance). The row's remaining 110 mm is only a nominal apparatus mounting band. The cabinet useful-height estimate grows by the terminal reservation; width remains the nominal module span plus the total declared side allowance, avoiding double counting cable corridors. No power-loss, conductor bend radius, DIN fitting offset, actual panel depth, usable area under covers, ventilation or IP rating is computed. A verified body depth can support only a preliminary depth estimate; missing depths remain unknown.

An original SVG schematic shows the hypothetical inside space with per-row device mounting bands, cable corridors, lateral wiring reservations and a distinct terminal reserve. This diagram never represents a known enclosure model, DIN mounting geometry or certified physical clearances. It is visible with the capacity picker and updates when assumption inputs change.
