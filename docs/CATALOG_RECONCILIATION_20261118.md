# Catalogue reconciliation: existing PR #12 versus staged manufacturer articles

This is an additive, non-mutating reconciliation against `catalog.js`. Two staged MCB records (Schneider A9F74116, ABB 2CDS251001R0164) **already exist** in the integrated seed catalogue. They must be treated as source enrichment or discrepancy review, not as new catalogue coverage. Hager CDA440D is the only newly staged device kind (RCD), still blocked from import pending unknown body width and exact source verification.

Reconciliation distinguishes contradictory non-null values, additional source values, and missing incoming values. Missing fields must never delete existing values. Manufacturer source URLs are not image-use licenses. No change is made to the core catalogue, UI, or electrical calculations.

## Release sequence
1. Recheck official source pages and source field locators; preserve exact document version.
2. Review source discrepancies for the two existing SKUs.
3. Complete Hager dimensions and map RCD-specific conditional short-circuit ratings without conflating them with MCB Icn.
4. Run all isolated Node tests and full PR #12 integration tests on the combined head.
5. Human-review and explicitly approve any future import into core; PR #13 remains draft.
