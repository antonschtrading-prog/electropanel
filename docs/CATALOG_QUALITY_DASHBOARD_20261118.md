# Catalogue quality dashboard — 2026-11-18

This branch keeps manufacturer intake separate from the selectable production catalogue.

## Review operations

- `dashboard()` produces deterministic, read-only totals and per-SKU blockers.
- `verificationQueue()` prioritizes duplicate SKUs, overlaps with the production catalogue, unknown required specifications, missing physical dimensions and field evidence.
- Neither function promotes, imports, certifies or authorizes a device.
- Missing dimensions are recorded independently from missing kind-specific specifications.
- Evidence of a manufacturer URL alone does not establish a current product lifecycle, suitability or permission to reuse imagery.

## Engineering handoff

Resolve each source article against its manufacturer documentation, record applicable standard and voltage context, check exact SKU and dimensional data, review regional lifecycle and compare against existing production articles. Only after a separate human engineering decision may an approved record be considered for a controlled import. Existing project data must not be silently overwritten.

Run: `node --test tests/catalog-quality-dashboard-v1.test.js`.
