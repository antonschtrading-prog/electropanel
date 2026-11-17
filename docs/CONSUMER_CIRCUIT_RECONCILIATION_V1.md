# Electropanel — consumer/circuit reconciliation in the core dossier

Scope: unified panel-design workflow. This report is read-only; it never
alters circuit power, consumer power, phase assignments, demand factors or the
protection selection.

## Source and method

`epWorkflowConsumerAuditV1` takes saved `project.lines` and
`project.loads`. It checks unique identifiers, valid circuit references,
missing/invalid consumer power, and the arithmetic sum of declared kW.
A mismatch is **not** proof of a design error: a circuit may use demand,
diversity, duty cycle and independently justified values. These remain
engineer-supplied parameters. Data are not inferred from routing or drawings.

The read-only audit is included in `engineering-bundle-v1.js` as
`sections.consumerReconciliation`. Its details (including the original
`auditIssues`) are retained, but no duplicate `issues` are added:
`workflowPreview` already forwards the audit diagnostics to the common
engineering issue register. The print dossier includes a row-per-circuit table
and explicit caveat. The CSV function escapes spreadsheet formulas.

No consumer links is a REVIEW state, not a false match. A manual panel can
still be designed through the documented alternate input route.

## Safety

All outputs remain draft-only: `engineeringApproved=false`,
`ready_for_installation=false`. Product suitability, selectivity, drawings
and manufacturer cabinet fit require their own applicable evidence.

## Regression

`tests/project-consumer-reconciliation-v1.test.js` checks live workflow
validation. `tests/project-consumer-dossier-v1.test.js` checks publishing
through the bundle, printed report, no double-counting and CSV escaping.
Verify JS, validation and Chromium CI on the exact commit before integration.
