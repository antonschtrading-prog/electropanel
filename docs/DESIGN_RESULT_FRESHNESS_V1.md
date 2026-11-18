# Electropanel — evidence freshness and saved change notices (V1)

This read-only report is part of the core panel design workflow. It answers
one practical question after a designer edits inputs: which saved engineering
conclusions are declared current, which are stale, and which require review?

**Inputs:** `project.evidence`, the validated saved
`designReviewNoticeV1`, and the live draft engineering-bundle sections.

**Statuses:** `STALE` when an evidence entry explicitly marks itself
stale; `FAILED` on a declared failed check; `PENDING_REVIEW` when the
saved change notice covers the area even if an older entry was verified;
`DECLARED_CURRENT` only when a saved verified entry is not stale and has
no pending change notice; `UNCONFIRMED` for other stated values; and
`NOT_DOCUMENTED` where no verification was entered.

None of these is an independent engineer approval, normative acceptance,
or a guarantee that an existing numerical calculation still reflects all
relevant inputs. A stored 'verified' declaration is not verified by the
software. The section snapshots show live report availability and issues
separately from the user's saved evidence declarations.

The six tracked domains are load, network, cable, device, topology and
enclosure. No new mandatory project inputs were added; no cable lengths,
transformer parameters, manufacturer facts, device selection or wiring
were invented or edited.

The matrix is included in the existing draft bundle and print dossier, is
shown in the design diagnostics, and can be exported to spreadsheet-safe
CSV. Invalid persisted notices and malformed evidence records fail closed.

Acceptance criteria: Node regressions, engineering validation and actual
Chromium browser checks on the exact commit; use a separate PR into PR #12.

## Line-level stale current cross-check

For each circuit with a saved engine-owned `loadCurrentCalculation`
(`powerSource: "circuit"`) this report also checks the persisted
`stale` flag, whether the declared overload Ib still matches the saved
linked Ib, and whether the input circuit power still matches its saved
calculation basis. These findings are shown for the load and device
domains, with circuit identifiers. They do not modify engineer-entered Ib.
Manual current records are outside this automatic comparison.

A currently BLOCKED related engine section also takes precedence over an
older `verified` declaration: it becomes `PENDING_REVIEW`, not a false
freshness claim. This audit is not a substitute for engineering verification.
