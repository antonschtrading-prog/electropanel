# Unified project catalogue and delivery evidence in the engineering dossier

The existing project-specific catalogue is the only source for equipment
article records in core trace. `epProjectDeliveryTraceV1` now resolves
`epProjectCatalogV1(project, EP_CATALOG)` and passes the exact catalogue
entries into the existing workflow preview. The branch selection, DIN,
schematic and BOM views continue receiving the caller's project-specific
`lookupSku`; no duplicate catalogue or new verification status is created.

- A missing catalogue engine keeps the shortlist empty without fabricating
  device options.
- A blocked or malformed catalogue report makes the delivery trace BLOCKED.
- The four projections remain separate and always draft-only.
- The printed engineering report includes a dedicated per-circuit table of
  linked Ib, schematic ID, DIN rail/position, BOM SKU, consistency status
  and the associated explicit diagnostic codes.
- No automatic re-selection of a breaker or modification of source circuit
  inputs, layout, or manual decisions occurs.

Regression: `tests/core-trace-catalogue-dossier-v1.test.js`, existing
delivery-trace and engineering-print tests, plus full GitHub CI and Chromium.
