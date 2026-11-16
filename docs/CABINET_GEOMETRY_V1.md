# Electropanel — declared cabinet geometry v1

## Scope
Cabinet dimensions and rail installation bands are entered by the engineer. No manufacturer's internal dimensions, mounting kits, clamp spacings, thermal behavior, EMC, ventilation, routing or fit are invented. The 2D proportional sketch is a planning aid, not shop drawings.

## Data
- `cabinetGeometryV1.version=1`, `source=USER_DECLARED`.
- `interior.widthMm / heightMm / depthMm`: usable internal dimensions in mm, **not** exterior product dimensions.
- `zones[]`: rail index and allocated band `xMm/yMm/widthMm/heightMm`, with origin at the internal upper-left corner.
- `planning` (optional): margin, first row Y, band height and row gap used to generate the bands. Remove planning when a row is adjusted manually.
- No cabinet on a legacy project => `NOT_CONFIGURED`, not approved.

## Validation
Invalid, missing or duplicate rail-zone indexes, bands exceeding the declared interior, allocated row width below the nominal module run and intersecting mounting bands are BLOCKED. Selected equipment's catalogue width, height and depth are separately checked against its assigned slot, declared band and declared useful depth; absent dimensions remain UNKNOWN. The fit verdict always remains a provisional review, never a certificate of installation suitability.

## Workflow
The board editor offers dimension inputs, generation of uniformly spaced mounting bands, and per-row coordinate editing. Changed settings enter undo/redo and the existing JSON import/export path. New rail count can use the saved **user-provided** automatic band spacing; if manually edited bands exist, changes are rejected instead of silently losing positions. The DIN CSV and engineering bundle carry the audit.

## Acceptance boundary
No physical manufacturing tolerances, exact DIN mounting offset, front plate depth, door clearance, wiring duct interference, protective thermal assessment, approved CAD or product installation suitability is established. Full manufacturer enclosure model integration must be based on product-specific source geometry. The editor never changes the electrical circuit or device selection to force a fit.
