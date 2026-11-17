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

## Dependency and issue tracking
A change to declared cabinet geometry invalidates only enclosure design evidence, not unrelated load, protection or cable arithmetic. `cabinetFit` is a separate engineering bundle and consolidated issue-register section. During preliminary circuit planning, absence of cabinet data is deferred; an invalid declared cabinet geometry remains a blocking issue at every stage.

## SVG draft drawing
The separate `cabinet-drawing-v1.js` creates a mm-scaled SVG from declared interior and band coordinates and uses catalogue body dimensions only where known. Unknown body size is outlined as an explicit placeholder; no manufacturer model or shop-drawing accuracy is claimed. The board UI exports this as `-cabinet-plan-DRAFT.svg` independently of the existing board SVG.

## Reserved installation regions
Optional `obstacles[]` is a list of user-declared rectangles with unique safe ID, kind (`WIRE_DUCT`, `TERMINAL_REGION`, `RESERVED`), and x/y/width/height in millimetres. It does not draw actual cabling or imply that an actual trunking kit is chosen. Out-of-envelope rectangles, intersecting reserved regions, or overlaps with allocated rail bands are blocked; touching edges are allowed. Repacking of rail zones preserves registered obstacles and fails if the new proposal collides with them, without deleting user data.

The cabinet editor now allows adding/removing user-declared reserved zones by stable ID and area type, preserving edit history. The proportional board sketch and SVG export render these in a separate amber layer, never as actual cable routes or certified physical parts.

## Placement transaction safety
Moving a DIN apparatus, exchanging two equal-width apparatuses, reflowing/compacting rails or resizing the rail count now compares cabinet fit blockers before/after the proposed change. The operation is atomically rejected if it would introduce a **new** physical fit conflict (e.g. a tall apparatus moved into a shorter declared installation band), while existing unrelated issues can be resolved progressively. No line allocation, current calculation, source or unrelated position is mutated upon rejection. Missing manufacturer body geometry still remains UNKNOWN.

The read-only DIN preview now shows the same cabinet fit status and allocated band size per row as the editable cabinet panel. The SVG export warning caption is kept inside the declared drawing width, including narrow user-declared cabinets.

## Article-specific provenance and nominal/actual horizontal coordinates (2026-11-17)

The selected branch-device SKU, not a stale line fallback, is the source for apparatus geometry. Each row exposes source category, date, link, complete/incomplete width/height/depth and explicit unresolved terminal and DIN mounting offsets. A source-review date must be a real calendar day and must not be in the future. An invalid date does not count as a review. A mirror datasheet entry without an HTTPS source link is flagged; user-entered dimensions never become manufacturer verification by implication.

The nominal DIN slot begins at the user-declared mounting band's x coordinate plus the zero-based module index multiplied by 18 mm. Its nominal right edge is the start plus the selected module count multiplied by 18 mm. The *known* apparatus body right edge is separately calculated from the catalogue body width; unknown body width yields null, never a guessed value. Remaining horizontal space to the band's right boundary is reported for both nominal slot and known body. A known body extending beyond the band is BLOCKED, independently of the nominal slot. These coordinates are planning geometry only: actual DIN clip offset, lateral projections, terminal reach and required clearance are still unknown.

The supplier CSV now includes these nominal/actual coordinates and explicitly requests missing source links and correction of invalid review dates. It is a request for engineering data, not an installation acceptance document. All source and dimension coverage counts refer to apparatuses actually placed on the board. The result is still not certified manufacturer CAD or an enclosure-fit approval.
