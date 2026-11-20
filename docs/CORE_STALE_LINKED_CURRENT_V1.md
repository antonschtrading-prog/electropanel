# Linked-current provenance gate for preliminary protection shortlist

The preview distinguishes an engineer-entered Ib from an Ib produced by
the circuit-linked engine. A linked current is **stale** if its stored review
flag is stale, the current has been overridden without updating provenance,
or its input tuple (including current circuit power, phase, voltage, power
factor, efficiency and demand factor) differs from the inputs currently
being previewed.

The original Ib is still displayed, with source
`STALE_LINKED_CURRENT`, but must not feed a new protective-device candidate
shortlist. Each affected circuit receives
`WORKFLOW_LINKED_CURRENT_REVIEW_REQUIRED`. The LOADS stage remains PARTIAL.

The engineer can explicitly run the linked-current recalculation using
validated inputs (when the saved calculation is still engine-owned and not
otherwise marked stale). Manually entered Ib and protected stale revisions
are never silently changed. Displaying an existing selected catalogue SKU
does not imply the changed loading has been verified for that device.

There is no automatic manufacturer's suitability decision, no auto-design
approval, and no new prerequisite for route or upstream supply data.
