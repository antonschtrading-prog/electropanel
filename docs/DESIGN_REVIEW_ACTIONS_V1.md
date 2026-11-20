# Persisted design recheck actions — integration

The design change-impact engine records affected engineering domains in
`designReviewNoticeV1`. This work does not create a new independent
electrical calculation. It **joins** the saved domain list with the
existing engineering issue register generated for the current project.

For each affected domain, the report exposes:
- the current saved review revision and scope;
- relevant issue codes, sections and circuit/object identifiers;
- separate blocked, open and deferred counts;
- an explicit pending review when the issue list happens to be empty.

Domain-to-section mappings are declarative and bounded. They do not
invent a verification procedure, auto-approve an area, or clear existing
stale engineering evidence. An issue can be relevant to multiple areas,
but the source register remains the sole copy of the issue.

The section `sections.reviewActions` is included in the engineering
bundle, print dossier and the existing on-screen engineering diagnostics.
Users can export the pending actions to a spreadsheet-safe CSV without
altering original project data. Legacy projects with no saved notice
retain their prior behaviour.

Stage-specific deferred issues remain deferred; unrelated issues in
other domains are not misrepresented as pending work for the affected
domain.

Acceptance: the `tests/design-review-actions-v1.test.js` regression
suite plus Chromium and engineering CI on a specific commit. No product
licensing, catalogue or physical verification is in scope.
