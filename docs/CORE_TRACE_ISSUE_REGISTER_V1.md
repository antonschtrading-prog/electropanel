# Electropanel — delivery mismatch issues in the unified register

The existing single-engineer workflow produces four projections: calculated
workflow, one-line scheme, preliminary DIN plan and BOM. The delivery trace
checks that the values and identity agree.

All `sections.deliveryTrace.issues` are now also included in
`epEngineeringIssueRegisterV1` with their original code, level, circuit ID
and `deliveryTrace` provenance. This ensures discrepancies appear in:
- the standard issue register and its circuit-focused HTML;
- the standard issues CSV used for engineering review;
- the draft printed dossier's issue register as well as the trace table.

A legacy bundle with no delivery trace remains usable; it is not a
mandatory user-supplied input. An explicitly provided malformed trace
section fails closed. `UNKNOWN` problems remain pending, `BLOCKED`
inconsistencies remain blockers, and nothing is accepted or reselected
automatically. Projects are still drafts for independent engineering review.

Regression: `tests/core-trace-issue-register-v1.test.js`, existing
integration and browser suites. Only merge after all commit-specific CI
checks pass.
