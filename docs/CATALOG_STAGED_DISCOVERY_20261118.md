# Staged equipment engineering discovery and DIN preview

Two pure, read-only modules have been added:

- `catalog-intake/staged-selector-v1.js`: filter 46 manufacturer-sourced staging records by exact category, nominal current, poles, residual current/type, MCB/RCBO Icn with standard and voltage context, coil voltage/frequency, contact composition, modules and maximum width.
- `catalog-intake/din-fit-preview-v1.js`: calculate provisional DIN module fit, keeping missing geometry as UNKNOWN rather than treating null as zero.

Safety semantics:
- No candidate is approved or selectable for engineering use merely because it matches a filter.
- RCD conditional short-circuit withstand is not equivalent to MCB/RCBO Icn.
- Coil voltage, AC/DC type and frequency are exact match criteria; 50 and 60 Hz are not silently interchangeable.
- Missing width, module count, rated Icn standard or voltage produces explicit exclusion/warning.
- DIN fit is geometric only; it does not establish compatibility, selectivity, heat balance, terminal access, or normative compliance.
- Existing live application catalogue and project calculations remain unchanged.

A reconciliation defect was corrected: `reconcile(existing,incoming,proof)` now accepts evidence for the actual incoming batch, rather than silently reviewing other manufacturers against the initial default evidence map.

This module is a bridge toward an approved core catalogue. It is not yet wired to the production selector; that requires completed source evidence, geometry and category-specific approval.
