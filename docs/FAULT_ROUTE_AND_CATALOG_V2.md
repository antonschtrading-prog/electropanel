# TN fault-route and catalogue workbench — 14 November 2026

## Delivered scope
A new circuit-bound route calculation handles one radial TN-S/TN-C-S L–PE path, with up to 50 series segments. It sums source R/X and both phase and PE conductor impedances. R must be supplied at the design temperature, with a source and explicit confirmation. U0 and cmin have no defaults. Parallel supplies, parallel earth paths, TT/IT and non-MCB comparison are not supported.

The result is Ik,min = cmin × U0 / hypot(Rloop, Xloop). A separately documented Ia at the declared required disconnection time is compared with Ik,min. A numerical PASS is not a normative approval; sources and local standard applicability remain user declarations. Missing sources produce UNKNOWN. Invalid numeric/model inputs are refused. Valid failing calculations remain saved and visible for correction.

**Maximum prospective fault current is separate:** the route result never overwrites `faultInput.ikKa`. Icn checks still require the maximum fault study at the apparatus location. A minimum L–PE current cannot establish breaking capacity.

Changes to the selected article, its trip-related characteristics, circuit phase, selected conductor section or earthing system invalidate the saved comparison. The form, project import, aggregate gate, priority queue, issue register, JSON bundle and printable report use the same result.

## Method references reviewed
- Schneider Electric Electrical Installation Guide, [TN system principle](https://www.electrical-installation.org/enwiki/TN_system_-_Principle): relationship of loop impedance, fault current and Ia tied to required disconnection time.
- [Minimum short-circuit current](https://www.electrical-installation.org/enwiki/Calculation_of_minimum_levels_of_short-circuit_current): low-current operation and distinction from breaking capability.
- [Circuit-breaker selection](https://www.electrical-installation.org/enwiki/Selection_of_a_circuit-breaker): breaking capacity at the installation point.

These manufacturer references establish the limited arithmetic model. They do not establish a blanket ГОСТ/ПУЭ approval. No disconnection-time table, voltage factor or trip-curve multiplier is silently selected by the software.

## Catalogue workflow
The project catalogue now has search and a normal input form for creation/editing, while JSON import/export remains available. Edits preserve catalogue ID. Used entries cannot be deleted. A used article update synchronizes circuit and branch label/module width and requests calculation review. Incompatible poles, insufficient rail capacity or manual-placement overlaps reject the entire change before history/state mutation. Seed records remain read-only. User records cannot assert verified status.

Three Schneider Electric articles were added, bringing the seed to six records. Electrical identities were cross-checked against official Schneider product pages; dimensions are taken from manufacturer-authored datasheets hosted by distributors (this hosting provenance is explicit in each record).

| Article | Poles | In | Curve | Width × height × depth | Icn basis | Datasheet |
|---|---:|---:|---|---|---|---|
| A9F73110 | 1 | 10 A | B | 18 × 85 × 78.5 mm | 6 kA, 230 V AC, IEC/EN 60898-1 | [Manufacturer PDF, distributor mirror](https://technocare.az/wp-content/uploads/2024/01/Schneider-A9F73110_document-EN.pdf) |
| A9F74316 | 3 | 16 A | C | 54 × 85 × 78.5 mm | 6 kA, 400 V AC, IEC/EN 60898-1 | [Manufacturer PDF, distributor mirror](https://aygelectrocompany.com/wp-content/uploads/2026/01/PES_Schneider-Electric_Acti-9-iC60_A9F74316.pdf) |
| A9F74332 | 3 | 32 A | C | 54 × 85 × 78.5 mm | 6 kA, 400 V AC, IEC/EN 60898-1 | [Manufacturer PDF, distributor mirror](https://storage.googleapis.com/eezee-technical-data/uCW73Qu86ZsNE1Tl.pdf) |

Official product references: [A9F73110](https://www.se.com/sg/en/product/A9F73110/), [A9F74316](https://www.se.com/sg/en/product/A9F74316/), [A9F74332](https://www.se.com/sg/en/product/A9F74332/). Product availability and national market substitutions are not inferred. This is still a small seeded catalogue, not a complete manufacturer database. Styling is not a certified CAD model.

## Checks
908 Node regressions pass locally. The route reference example is independently evaluated with Python Decimal: Rloop=0.5 Ω, Xloop=0.054 Ω, Zs=0.5029075461752388539 Ω, Ik,min=434.4734964940521342 A for U0=230 V and cmin=0.95. Negative, unsupported, stale and missing-evidence cases are covered. Catalogue tests cover atomic updates, used-record deletion, fixed-position collision, reserved IDs and seed immutability.

The committed Chromium regression additionally creates/assigns/edits an article through the form, searches the catalogue, refuses deletion of used equipment, selects a seeded 3P breaker, fills the route form, checks stale state after replacement, and reloads the saved project. See commit-specific Actions for its execution outcome.
