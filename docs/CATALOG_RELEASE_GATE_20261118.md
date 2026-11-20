# Catalogue integration release gate — held, not imported

The release gate returns an explicit decision for every staged article. Two existing MCB SKUs are source-enrichment reviews, not new catalogue coverage. The Hager CDA440D RCD is a new kind but remains held because required body dimensions and manufacturer-specific integration semantics are not yet complete.

The release gate never changes `catalog.js`, the UI, calculations, manufacturer images, or any PR #12 source file. It never returns an automatic import approval. This is intentional: manufacturer evidence and exact equipment semantics must be reviewed before engineering use.

## Work still required for an actual product release

- Obtain source-specific dimensional values and resolve regional product differences.
- Complete article-level source evidence; verify document locators rather than relying on generic 'product specifications' labels.
- Implement and test RCD/RCBO/meter/relay/contactor semantics in the existing application before any new kind becomes selectable.
- Run all Node and browser tests on a reconciled PR #12 head. Current GitHub PR #12 head may advance independently.
- Keep image assets empty until exact-SKU rights are confirmed.

This gate is a release checklist, not evidence that a complete catalogue has been delivered.
