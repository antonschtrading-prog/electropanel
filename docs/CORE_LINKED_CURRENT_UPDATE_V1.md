# Core linked-current update on explicit shared-input changes

The unified Electropanel workflow has two separate responsibilities:

1. **Explicit engineer action** “Рассчитать недостающие Ib” (also recalculates
   already linked, engine-owned Ib when shared input parameters changed). The
   action never silently replaces a manual current, an overridden current, or
   a calculation flagged stale. A result retains the existing calculation
   review obligation and original manual circuit selection.
2. **Design impact tracking** now includes persisted
   `workflowDesignInputsV1`, consumer group split and merge rules. Such edits
   invalidate the relevant evidence domains without overwriting the model.

A linked current is eligible only when `powerSource === 'circuit'`, stale
is not true, and saved overload Ib exactly matches the calculated linked Ib.
When the normalized engine inputs are equal, the action is idempotent.
When a required voltage is missing, affected circuits are skipped with an
explicit reason; other circuits may still calculate.

The output is a **draft engineering calculation**, not protection approval,
manufacturer product confirmation or physical commissioning. Values remain
the responsibility of the engineer. No cable route or supply transformer is
required just to compute an available circuit load-current estimate.

Regression: `tests/core-linked-current-update-v1.test.js` plus existing
workflow, state/restore, design-impact and Chromium suites. Verify CI on the
exact commit before integration into PR #12.
