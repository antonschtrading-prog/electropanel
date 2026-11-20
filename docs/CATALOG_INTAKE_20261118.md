# Isolated catalogue intake — 2026-11-18

## Scope and integration contract
This branch starts from PR #12 HEAD `8f1230d25649deb7c673e0a1741626a196cbafa9`. No edits to `catalog.js`, application UI, engineering calculations, build scripts or existing tests. This is an additive **audit and intake boundary**, not a populated manufacturer-certified catalogue.

## Current measured coverage
The existing `catalog.js` has 11 MCB entries and **zero** RCD, RCBO, METER, RELAY or CONTACTOR entries. All 11 retain their original source links. The intake audit deliberately labels every inherited record `REQUIRES_INDEPENDENT_SOURCE_REVIEW`; a legacy source URL or a past review-date declaration does not constitute a new verification.

## Required fields for future article intake
- Identity: exact manufacturer, series, article/SKU, device kind, regional variant.
- Electrical: rated current, pole arrangement (including switched N), curve where applicable, Icn **with standard and rated voltage**, and separate Icu/Ics when actually documented.
- RCD/RCBO: residual current, type (AC/A/F/B as documented), pole arrangement and applicable standard.
- Meters: connection topology, phase count, current rating, voltage and mounting details.
- Relays/contactors: coil voltage and type, contact ratings/utilization category and modular width.
- Mechanical: modules, body width/height/depth, manufacturer drawing revision; unknown dimensions remain null.
- Provenance: per-field official manufacturer URL, document title/revision, page/table, access/review date, original units, exact quotation or trace; no fabricated images.

## Engineering distinctions
Icu is not substituted for Icn. Pole count is not equivalent to 1P+N switching behavior. Nominal DIN modules are not proof of actual body dimensions or cabinet fit. Source existence is not proof that all fields have been checked. Manufacturer images require separate usage-rights and exact-article evidence.

## Integration questions for PR #12 owner
1. Confirm canonical kind identifiers: current engine supports MCB/RCBO in several selection paths, but RCD versus RCCB naming must be agreed before importing.
2. Confirm schema for coil ratings, residual protection and meter measurement attributes, preferably additive rather than changing existing fields.
3. Confirm which verified series and country-specific SKUs to prioritize.
4. Integrate via a reviewed adapter/manifest, not direct overwrite of seeded records.

## Validation
Run `node --test tests/catalog-intake-evidence-v1.test.js` and the existing complete Node suite on the final commit. CI must be checked independently. This package contains **no newly verified manufacturer articles**.
