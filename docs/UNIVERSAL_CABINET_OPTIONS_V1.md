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
