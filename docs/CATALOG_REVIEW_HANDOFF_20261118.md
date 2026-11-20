# Per-article verification and release handoff

Two deterministic, read-only artefacts now come out of every catalogue CI run:

1. `catalog-portfolio.json`: 46 staged records, category coverage, overlap and geometry summary.
2. `catalog-review-bundle.json`: exact-SKU action queue with manufacturer source, priority, per-field missing data and explicit no-live-use flags.

Priorities: `CORE_RECONCILIATION` for two existing MCBs; `PROTECTION_CRITICAL` for RCBOs; `RCD_COORDINATION` for RCCBs; `COIL_AND_UTILIZATION` for contactors. Tasks distinguish missing required fields, geometry, evidence, lifecycle and existing-catalogue reconciliation. This avoids repeatedly scanning manufacturer tables by hand.

The queue is a **triage tool, not a product certification system**. All 46 remain outside the live selector until their specific engineering and regional requirements are confirmed. Missing METER and RELAY categories are reported as portfolio gaps, not populated with invented product data. Existing `catalog.js` remains unchanged.

Run `node catalog-intake/review-bundle-v1.js` to inspect the JSON. GitHub Actions uploads both JSON files under the `catalog-portfolio` artifact.
