# Complete staged catalogue portfolio — 2026-11-18

The read-only portfolio joins all four manufacturer intake batches: 2 MCB, 34 RCD, 5 RCBO and 5 contactors = **46 staged records**. Two MCB SKUs already exist in `catalog.js`; **44 records are new to the core by SKU**, but remain **staged and not usable for automatic engineering selection**.

**Uncovered categories:** electricity meters and modular relays. These must be sourced from exact manufacturer documents rather than synthetic model families.

The new `catalog-intake/portfolio-v1.js` checks global duplicate SKUs, missing geometry, provenance metadata, category counts, existing catalogue overlaps and field conflicts. The deterministic `catalog-intake/portfolio-report-v1.js` emits machine-readable JSON. CI runs the complete Node suite and uploads `catalog-portfolio.json` as a GitHub Actions artifact.

Do not equate structural source metadata with independently verified source contents; exact source documents, geometry, regional lifecycle and product selection rules remain separate engineering review gates. No unlicensed image assets are included. The live catalogue, UI, and calculation code remain unchanged.

**Release conditions:** (1) independently confirm exact SKU against official document; (2) verify protection rating context and dimensions; (3) resolve overlap conflicts; (4) test category-specific selection and DIN placement; (5) run full CI on current integration head; (6) explicit approval before any live catalogue import.
