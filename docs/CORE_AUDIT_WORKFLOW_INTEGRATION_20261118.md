# Core Electropanel integration — audit regressions and workflow blockers

This integration reuses the established workflow, DIN layout and
independent audit test suites. It is based on the up-to-date main
engineering PR #12, not the independent audit's older snapshot.

## Changes

- Preserve the already implemented overall workflow blocking for
  schematic issues while making individual `APPARATUS`, `SINGLE_LINE`,
  `BOARD` and `BOM` stage states reflect all supported
  blocking issue severities (`level`, `status`, `severity`).
- Respect actual catalogue module width for manual DIN placement
  reservations. An expanded device must never overlap downstream
  equipment or silently exceed the rail.
- Import the independent release-audit regression cases as executable
  upstream coverage. The old DEFECT-02 characterization was corrected:
  **a schematic BLOCKED status now correctly blocks the workflow**.
  The audit file retained in this integration records its historical
  findings; it is not a claim that all issues remain unresolved.

## Release conditions

Every imported regression executes on the final integration commit.
Actual Chromium, JavaScript, and engineering validation CI must all pass
before a fast-forward to PR #12. No changes to the saved engineer inputs,
catalogue evidence or product approval.

## Remaining independent work

Release acceptance still requires a documented nine-stage commercial
panel walkthrough and a deliberate gate for contradictory standalone
exported drawings/specifications. Historical "known defect" tests that
only characterize unsafe outputs are not passing acceptance criteria:
a passing characterization can still describe a blocker.
