# RCBO manufacturer intake — 2026-11-18

Five exact Schneider Electric RCBO articles were added to an **isolated staging manifest**, not to the selectable application catalogue. Their category-specific protection semantics are preserved: **1P+N = two switched poles, one protected phase**, 3P+Ns has three protected phases and a neutral connection; **AC is not interchangeable with type A**.

| SKU | Poles | In | Curve | Residual | Breaking capacity | Geometry | Regional status |
|---|---|---|---|---|---|---|---|
| A9D34616 | 1P+N | 16A | C | AC 30mA | Icn 4.5kA IEC 61009-2-1 at 230V | 36×85×73 mm, 2 modules | replacement review |
| A9D32616 | 1P+N | 16A | C | A 30mA | 6kA, standard/voltage pending | unknown | replaced in UK |
| A9D31616 | 1P+N | 16A | C | AC 30mA | 6kA, standard/voltage pending | unknown | replaced in UK |
| A9DC1916 | 3P+Ns | 16A | C | A 30mA | 10kA, standard/voltage pending | 3 modules; body dimensions unknown | regional check |
| R9DX01616 | 1P+N | 16A | B | A 30mA | 6kA; standard pending | 18 mm; height/depth unknown | regional check |

Manufacturer sources:
- https://eshop.se.com/sa/acti9-idpna-vigi-1pn-16a-c-30ma-ac-rcbo-a9d34616.html
- https://www.se.com/uk/en/product/A9D32616/
- https://www.se.com/uk/en/product/A9D31616/
- https://www.se.com/uk/en/product/A9DC1916/
- https://download.se.com/files?p_Doc_Ref=ENVPEP2505044EN&p_File_name=PEP+ecopassport+SCHN-02065-V01.01-EN1.pdf

**Not procurement-ready:** UK manufacturer pages explicitly list replacement products for A9D32616 and A9D31616. No source grants image reuse rights. Do not infer voltage or standard for a 6/10 kA rating from another model. The 3P+Ns protected-pole distinction must be preserved in wiring/schematic generation. Final application import requires engineering review, complete geometry, and source-specific lifecycle checks.
