# Manufacturer primary-source intake — 18 November 2026

Three exact-SKU records are transcribed into a **staging-only** manifest; none is imported into `catalog.js`. Their source URLs are official manufacturer resources. Each listed field has source-document evidence, while unsupported fields remain `null`.

| Manufacturer | SKU | Kind | Source-backed fields | Intentionally unresolved |
|---|---|---|---|---|
| ABB S200 | 2CDS251001R0164 | MCB | 1P, 16A, C, 6kA, 1 module, body 17.5×88×69 mm | Exact IEC 60898-1 Icn voltage and standard context for this exact ABB source |
| Schneider Acti9 iC60N | A9F74116 | MCB | 1P, 16A, C, 1 module, 18×85×78.5 mm, Icn 6kA at 230V IEC/EN 60898-1, Icu 10kA at 230V IEC/EN 60947-2 | Product regional lifecycle status |
| Hager CDA | CDA440D | RCD | 4 poles (3P+N), 40A, 30mA, type A, 4 modules, 70×83×70 mm, conditional Inc 6kA EN61008-1 | Residual-device terminology mapping |

**Source URLs:** ABB https://vypinace.sk.abb.com/sk/product/detail/16995/15107 ; Schneider https://www.se.com/sg/en/product/A9F74116/miniature-circuit-breaker-mcb-acti9-ic60n-1p-16a-c-curve-6000a-iec-en-608981-10ka-iec-en-609472/ ; Hager https://assets.hager.com/step-content/P/PDS_157723390101DE/Document/std.lang.all/CDA440D_0101_de-DE.pdf .

No factory image is bundled or licensed by these references. A primary product page can differ by sales region: Schneider's product lifecycle status must be checked before active procurement recommendations. The Hager conditional Inc rating must never be presented as MCB Icn. This manifest is an evidence transcription, not an engineering approval, certification or finished commercial catalogue.

## Source review update
Schneider dimensions and module pitch verified against https://eshop.se.com/sg/ic60n-miniature-circuit-breaker-1p-16a-c-curve-a9f74116.html (product description/specifications). Hager CDA440D body dimensions 70×83×70 mm verified against https://hager.com/de/katalog/produkt/cda440d-fi-schalter-3p-n-6ka-40a-30ma-typ-a (technical characteristics, dimensions). These are exact article values, not extrapolations from DIN modules. No images imported.
