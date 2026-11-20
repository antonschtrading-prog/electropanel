# Exact manufacturer front image intake — integrated gate

The image intake is an offline, fail-closed gate. It never fetches remote files and never infers manufacturer approval.

1. An asset must match exactly one catalogue article by normalized maker and SKU.
2. Series, kind, poles, modules, and declared width must match.
3. A reviewed source URL, rights evidence URL, permission flag, and review date are mandatory.
4. The raster must be local, nonempty, regular, nonsymlink, and no larger than 12 MiB.
5. The filename extension and binary signature must agree. PNG dimensions must be nonzero and at most 12000 px per side.
6. Reusing the same file for different registered articles is rejected.
7. A missing or rejected image fails packaging; ordinary catalogue items without registered images continue using stylized SVG.
8. Neither raster acceptance nor article identity establishes engineering suitability, dimensional fit, licensing authenticity, or product certification.

The gate runs from `scripts/build-site.js` and is covered by focused Node regression tests.
