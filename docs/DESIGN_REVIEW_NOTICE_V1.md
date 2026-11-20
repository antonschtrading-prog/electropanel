# Saved review notices after a design edit

Scope: the main Electropanel integration workstream. A project can be
edited, saved, reloaded or imported without losing the list of design
areas affected by previous changes.

- The existing `epDesignChangeImpactV1` is the only source of affected
  domains. This module does **not** compute electrical sizing or approve
  an apparatus.
- `designReviewNoticeV1` is an advisory, bounded, versioned record with
  `version`, `revision`, `pendingDomains` and `lastChangedDomains`.
- Every materially changed domain is accumulated, not silently cleared.
  Unchanged and presentation-only edits do not create new notices.
- `epRestoreProjectExtensionsV2` validates serialized records strictly
  and rejects unsupported domains, malformed versions or inserted approval
  fields. Existing legacy projects without the record remain supported.
- `renderEngineeringDiagnosticsV1` reads the **saved** notice rather than
  transient session-only `lastDesignImpact`, and makes clear that the
  record does not certify engineering correctness.

The record is intentionally not a compliance gate and is not an
acknowledgement of a completed check. Independent evidence and actual
engineering validation remain necessary. A future acknowledgement workflow
must not transform a notification into approval or clear stale evidence.

See `tests/design-review-notice-v1.test.js` and Chromium integration.
