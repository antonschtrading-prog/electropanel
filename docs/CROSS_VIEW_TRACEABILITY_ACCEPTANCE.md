# Cross-view engineering traceability — acceptance (draft)

## Operator journey
1. Edit a circuit and assign an actual curated manufacturer SKU. Changes to the selected article must invalidate review.
2. Open board view and click its nominal DIN apparatus block. The same circuit is selected in the dossier and protection workbench; upstream shared devices are not misrepresented as outgoing circuits.
3. Inspect cross-view consistency: circuit identity, protection SKU, branch apparatus, shared devices, DIN slot geometry, BOM quantity and owners.
4. Use issue navigation to focus a circuit. Every issue retains its section, severity and machine-readable code; common findings include a Russian explanation and a concrete verification action.
5. Export cross-view JSON and CSV, full multi-section issue CSV, combined JSON and standalone printable HTML. The HTML includes all circuits, protection declarations, DIN positions, BOM, cross-view issues, all engineering issues and status.
6. Exported data is current project state, independent of circuit search filters and selected focus.
7. No successful comparison, empty issue list, exported report or catalogue shortlist can mark a project as approved for installation.

## Scenarios
- Changed SKU without updated DIN placement: BLOCKED.
- Changed protection article without updated selected line: BLOCKED.
- Missing or duplicated branch placement: BLOCKED.
- DIN overlap, negative or out-of-range position: BLOCKED.
- Shared RCD absent, wrong SKU or width: BLOCKED.
- BOM missing a selected article, wrong quantity, wrong owner or orphan: BLOCKED.
- Missing computation section: BLOCKED.
- Unresolved calculation, conductor routing, neutral/PE, thermal, physical clearance and manufacturer evidence: remain unverified.
- Untrusted text in HTML attributes, issue codes, CSV cells and printed reports: escaped or formula-neutralized.

## Release limitations
This is a deterministic consistency layer, not a physical electrical network simulation. It does not establish contact conductivity, protective disconnection time, I2, cable ampacity, fault-loop impedance, selectivity, RCD topology, enclosure thermal suitability, manufacturer front geometry or compliance with a particular edition of a standard. The catalogue remains small and provisional. No public engineering approval is implied by green automated tests.

## Manual browser checks still required
- Load a sample board and select circuits via table, DIN block and issue register.
- Verify all controls with keyboard and mobile layout.
- Edit currents, assign a different SKU, undo, reload, inspect synchronized outputs.
- Download and open standalone HTML and CSV locally in a browser/spreadsheet.
- Verify no unexpected network requests or hidden dependencies in printable HTML.
- Verify browser state migration and large project performance.
