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

When any selected catalogue item has a declared body height greater than the nominal per-row apparatus band, the preliminary candidate is blocked against *that specific assumed row pitch*. Unknown heights are expressly marked unknown and do not become approval. Actual DIN mounting position, cable duct interference, access and body projection still require separate geometric evidence.

A supplier-neutral CSV schedule exports rows, module widths, spare modules, preliminary useful inside dimensions, wiring corridor and terminal reserves, and review status. The enclosure SKU column is intentionally blank: the CSV does not select a product or certify usable dimensions.

## Declared-relationship proximity audit

The optional cabinetConnectionProximity engineering section relates DIN positions to explicit shared-device memberships, protection hierarchy and declared supply links (when both endpoints are represented apparatuses). It reports same-rail, directly adjacent, cross-rail and unplaced pairs, without inferring other electrical connections. It is a relative planning signal only: no conductor routing, terminal access, wire lengths, selectivity, or installation conformity is asserted. The board and print report display the findings; actual device placement is not silently modified.

Every nominal cabinet candidate now optionally carries proximity counts for its proposed rail locations based solely on available declared logical connections. The chooser and print report expose these counts for comparing alternatives; no topology-driven physical wiring claim is made. If the advisory engine is absent, the candidate still exists but its proximity field is null.

## Explicit within-rail proximity reflow

An opt-in UI command runs a strictly non-destructive candidate optimizer: adjacent whole-device swaps on each existing DIN rail to reduce gaps between apparatuses with *declared* logical relationships. The optimizer does not transfer an apparatus to a different rail, alter circuit topology, device SKU, protection setting, capacity, or wiring declaration. It validates the proposed positions through the existing DIN planner and cabinet fit-delta check, and commits through undo/redo only when at least one position actually improves. No speculative electrical connection is created.

## Declared cabinet connection-space audit

When actual *user-declared* cabinet geometry is present, the new cabinetConnectionSpace section locates the nearest explicitly reserved WIRE_DUCT and TERMINAL_REGION rectangles relative to each nominal DIN allocated slot band. It returns planar edge-to-edge separation only, never a routed conductor distance. A missing duct, terminal region, body terminal position or cabinet geometry is UNKNOWN/NOT_CONFIGURED and is not silently treated as approval. Invalid intersecting zones are BLOCKED. Board interface, printable engineering report and DIN CSV expose these review-only distances. The existing geometry editor owns these regions; there is no parallel unversioned model or manufacturer enclosure catalogue.

An explicitly requested same-rail grouping reflow now compares before/after straight-line planar gaps to any user-declared cable ducts and terminal regions. The UI requests confirmation if nominal gaps increase; cancel leaves the original layout untouched, while approval remains undoable. This warning is a preliminary spatial tradeoff, **not** evidence of actual wiring, length, bending, terminal orientation or mechanical access.

The board includes a collapsed per-device table with nearest user-declared cable duct/terminal-region IDs and edge distances; DOM text nodes prevent user-entered IDs from injecting HTML. It intentionally says that actual connection access has **not** been verified. Large boards cap this screen-only table at 100 rows; bundle/print/CSV retain the complete dataset.

## Exact selected-article dimension evidence

The new cabinetApparatusEvidence section traces each board placement to the actual selected branch apparatus article (never merely the stale circuit fallback) and its explicitly populated width, height and depth plus source category and review date. Unknown dimensions remain null; a module pitch is **never** converted into a claimed device body measurement. User-added catalogue measurements remain USER DECLARED / UNVERIFIED. Known body width beyond nominal slot, height beyond allocated user-declared band or depth beyond declared usable inside depth yields a blocking issue. This checks numeric bounds, *not* mounting offsets, exact terminal coordinates, manufacturer installation permissions, heat calculations or wiring access. Board review, print and DIN CSV report the same data with clear unknowns.

A separate *supplier questions* CSV lists each selected apparatus by article and maker, all known body dimensions, each missing width/height/depth and source review, and required DIN mounting offset, connection-terminal positions and connection clearances. The last three remain required even with complete body dimensions because no catalogue source currently supplies them. The list never claims a compatible enclosure or that a physical connection can be installed.
