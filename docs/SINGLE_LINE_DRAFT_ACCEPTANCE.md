# One-line electrical overview — draft acceptance

This feature is a user-facing *logical* one-line overview for the browser-based Electropanel. It is not a verified installation drawing.

## What the user can do
1. Open the board view and inspect an SVG showing the source, assigned shared RCD groups and each outgoing circuit.
2. Read manufacturer, series, article, In, Icn and poles for a circuit **only** if the selected SKU exists in the curated catalogue. Unknown articles stay explicitly unknown.
3. Select any outgoing circuit in the diagram using pointer or keyboard Enter/Space; the same circuit becomes selected in the board, dossier, protection workbench and diagnostic views.
4. Export the diagram as a standalone SVG, without a server, for sharing and review. The export is marked as a draft.
5. Export the full engineering HTML report and JSON bundle with a structured list of diagram nodes and associations.
6. Inspect errors in the engineering issue register. Duplicate group membership, duplicate branch, orphan references and unknown articles remain visible.

## Critical distinction
The lines connecting source, RCD groups and circuits are **dashed logical associations** from the project model, not verified electrical conductors. They do not claim a particular conductor route, upstream switching arrangement, RCD terminal pin, circuit-breaker contact continuity, N/PE separation, selectivity, fault-current adequacy or safe installation. These require explicit declarations, manufacturer evidence and independent engineering review.

## Manual acceptance
- A circuit in RCD group RCD1 appears below that group; an ungrouped circuit appears directly below the source.
- Changing group assignment changes the diagram after render, with no stale cached associations.
- Selecting a circuit highlights it in the diagram and other views.
- Unknown article does not show fabricated ratings; valid article shows the catalogue record.
- Malicious circuit names and labels cannot inject HTML/SVG markup.
- Narrow mobile screens can horizontally scroll the full SVG.
- Downloaded SVG opens as a standalone vector file and retains draft disclaimer.
- A duplicate group membership yields BLOCKED in the diagram, engineering gate and issue register.
- Automated tests run with both GitHub Actions workflows.

## Deliberately not implemented yet
A normative single-line electrical schematic with verified protective coordination, exact manufacturer terminal numbers, true L/N/PE conductors and switch contacts; validated thermal enclosure calculation; CAD/DXF output; a verified manufacturer front-image library. These remain distinct engineering deliverables.

## Conductor-path SVG companion
The selected circuit now also has a separate read-only vector diagram generated from `epCircuitWiringTraceV1`. Each declared L1/L2/L3/N/PE connection is shown as a labelled edge. A solid edge means that a path exists **only in the declared terminal/wire model**; a dashed edge means no declared path has been established. The ordered terminal IDs and unresolved reason are displayed. The selected-circuit SVG can be exported separately.

This view must not be confused with a physical wiring drawing. In particular, it does not connect through an MCB/RCD/contact, invent a wire, assign manufacturer terminal numbers or claim electrical safety. It complements the group/branch one-line SVG and the N/PE segregation audit.

The offline printable engineering report embeds the one-line SVG and tables of the conductor paths and RCD N/PE declarations. Both SVG exports include draft-only disclaimers.
