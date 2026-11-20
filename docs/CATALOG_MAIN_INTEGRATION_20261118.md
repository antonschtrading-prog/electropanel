# Catalogue intake — safe integration into the main Electropanel workspace

Source: isolated PR #13 (catalogue equipment evidence). This integration
carries the complete catalog-intake source files, dedicated test suites and
source-audit documentation into the main engineering branch. It also makes
the independent catalogue review page reachable from the main navigation.

## Intentionally no transfer into the live verified equipment library

The source catalogue intake package is **staging only**. Manufacturer
records are proposals for human review, not verified devices or automatic
selection candidates. In particular, the integration does **not** add
equipment to `EP_CATALOG`, auto-populate project articles, change existing
device characteristics or assert new product compliance.

The review page reads user-selected JSON data entirely in the browser.
Its safety constraints and claim labels remain part of the original review
package. The existing engineering core and project catalog stay unchanged.

## Publication gate

`scripts/build-site.js` includes the two review-page files only when the
main navigation explicitly links that page. Missing or empty files fail the
build. Removing the link removes stale staged review files from the
published asset directory. GitHub Pages uses the relative script path
from `catalog-intake/catalog-review-page.html`.

The new `tests/catalogue-review-pages-publish.test.js` independently
verifies copy, cleanup, absence of implicit import and malformed assets.

## CI and ownership

This handoff is integrated from the catalogue chat's PR only after its
JavaScript, engineering and Chromium checks were successful. The combined
integration PR must then run those checks again on its **actual combined
commit**. The catalogue chat can continue curating product data in its
separate branch; later changes require their own verification and merge.
