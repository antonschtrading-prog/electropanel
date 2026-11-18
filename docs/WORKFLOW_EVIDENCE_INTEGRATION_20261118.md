# Independent workflow evidence integration package

Branch: `feature/workflow-engineering-evidence-20261118`. Target: PR #12 development branch. No automatic merge.

## Scope

This package changes the existing `project-automation-workflow-v1.js` only. It does not add a second workflow engine, alter calculation inputs, choose protection ratings automatically, or modify project data.

- Normalize blocking evidence from schematic, board and bill-of-material projections when their issue objects express `level`, `status` or `severity` as `BLOCKED`.
- Report blocked projection status on the corresponding stage, not just on the aggregate workflow.
- Mark apparatus stage `BLOCKED` for circuit/branch article conflicts, multiple branch devices on a circuit or branch devices with missing circuit references.
- Preserve the original evidence and project for engineer repair.

## Integration checks

Run the existing JavaScript, engineering validation and Chromium workflows. The added `tests/workflow-projection-blockers.test.js` exercises projection blocker propagation and apparatus stage status. Integrate only after all three workflows pass on the final commit and the main chat has reviewed the change.

## Out of scope

No laboratory verification, physical equipment testing, hidden cable-length assumptions or automatic approval of engineering decisions.
