# Catalogue batch gate and merge handoff

## Boundaries
The isolated package is read-only and does not inject articles into the live application. No manufacturer specifications are invented. Missing data stays unknown. An article matching an existing SKU must be manually reviewed even if its numerical values match; differences are reported rather than silently overwriting existing catalogue data.

## Batch audit
`inspectBatch(records,evidenceBySku)` checks six categories, duplicate normalized maker/series/SKU identities, individual structural requirements and source evidence. It returns per-item and per-category counts, always `engineeringApproved:false`.

`compareAgainstLegacy(records,legacyRecords)` finds exact-SKU overlaps and reports conflicting existing fields. This is a review aid, not a merge operation.

## Release gates
1. Manufacturer primary document with exact SKU, document title, source URL, review date and page/table locator.
2. Source evidence for each required characteristic; never substitute Icu for Icn.
3. Confirm family-specific semantics for RCCB/RCD, RCBO, meter, relay and contactor before enabling engineering selection.
4. Confirm image use rights independently; absent rights means no factory image.
5. Run Node tests, integration tests and browser tests on the final PR head; record actual conclusions.
6. PR #13 targets PR #12 head branch. No automatic merge or edits to existing catalogue.
