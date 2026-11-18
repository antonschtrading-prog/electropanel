# Read-only staged catalogue browsing API

The catalogue intake branch now exposes four functional layers:

1. `catalog-view-model-v1.js` converts each exact-SKU candidate into a UI-ready card with explicit missing fields, per-field display values, source links, and hard `selectable:false` / `engineeringApproved:false`.
2. `catalog-api-v1.js` provides read-only `list`, `get`, `find`, `din-fit`, `summary`, `review` operations. Invalid parameters produce structured errors; there are **no write or approve operations**.
3. `catalog-browser-v1.js` builds manufacturer/category/series facets and exact-SKU side-by-side comparisons. Cross-category comparison never implies engineering substitutability.
4. `staged-selector-v1.js` now validates protected pole count and rejects disconnected Icn voltage/standard filters.

The browser-ready data model is **not yet connected to the production HTML UI**. The 46 records remain isolated and must not be presented as selectable, approved, or current-market devices. This separation prevents accidental use of historically sourced or incomplete devices in electrical designs.

For future integration: present staged records on a separate research/review tab with source links and missing-data badges. Keep production project selection bound to the existing curated catalogue until engineering approval and regional lifecycle review are complete. Never render manufacturer images without licensed rights.
