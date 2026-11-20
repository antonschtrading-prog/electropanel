# Circuit workspace acceptance matrix — draft

This feature is a read-only projection of the current project. It is not a normative electrical design engine.

## User journey
1. Open the engineering panel and inspect all circuits with manufacturer, SKU and DIN placement.
2. Search by circuit ID, Cyrillic name, manufacturer, series or article; search is case-insensitive.
3. Filter blocked circuits, unknown declarations, placed/unplaced devices, missing SKUs or stale calculations.
4. Inspect project-wide counters that remain unchanged when a search narrows the table.
5. Change a circuit's source data in the existing editor; the common render recalculates the workspace without changing the project.
6. Export the complete project dossier as CSV or JSON; filters do not silently remove circuits from exports.
7. Review a layout overflow, missing article, mismatched width and duplicate apparatus binding as explicit issues.
8. Treat declared Ib, Iz and Ik as unverified inputs, never an approved cable or protective-device selection.
9. Confirm spreadsheet formula-like user text is neutralized in CSV exports and HTML input is escaped.
10. Confirm both engineering approval and installation readiness remain false in every projection.

## Known limitations
- DIN geometry is a sequential module estimate; not a verified enclosure model.
- Catalogue contains only a small seed set of three MCB articles, not a full manufacturer range.
- Search is a text lookup, not electrical terminal tracing.
- Calculations remain incomplete; normative review and manufacturer evidence are required.
- Live end-to-end browser testing and visual acceptance remain separate release gates.

## Next integrated deliverables
- Circuit-focused selection across schematic, DIN apparatus and line editor.
- Explicit catalogue compatibility and article revision workflow.
- Project-specific source documents and reproducible engineering case studies.
- Terminal graph backed by real device declarations and verified neutral/PE rules.
- Export of an integrated technical dossier with traceable assumptions and versioned results.
