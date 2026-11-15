# Integrated engineering cycle — 56 acceptance tasks (2026-11-16)

This is a traceable **work/acceptance matrix** for one integrated cycle, not 56 independent product features or proof of normative compliance.

## A. Local device fault study (1–7)

1. [x] Identify an incoming protective apparatus by stable ID.
2. [x] Identify a branch protective apparatus by stable ID.
3. [x] Reject group RCD identifiers as unsupported overcurrent-breaking study points.
4. [x] Trace the upstream path only from explicit user supply edges.
5. [x] Refuse capture when a complete supply path is not declared.
6. [x] Freeze the upstream path fingerprint for the studied point.
7. [x] Capture selected catalogue article ID with the study.

## B. Local study input integrity and lifecycle (8–14)

8. [x] Bound numeric local Ik,max in kA.
9. [x] Bound local study voltage in volts.
10. [x] Require the calculation source document.
11. [x] Require the source revision.
12. [x] Reject unexpected serialized approval tokens.
13. [x] Reject multiple studies for one protective-device location.
14. [x] Support explicit removal without modifying unrelated studies.

## C. Fault review and applicability (15–21)

15. [x] Detect changed upstream topology.
16. [x] Detect changed selected article.
17. [x] Preserve stale original snapshots for engineering review.
18. [x] Compare only Icn, never silently substitute Icu.
19. [x] Require an exact declared Icn voltage and applicable standard before numerical comparison.
20. [x] Block a declared Ik,max exceeding comparable Icn.
21. [x] Mark all non-exceeding numeric comparisons as preliminary, never engineering approval.

## D. Exact manufacturer pair and backup evidence (22–28)

22. [x] Require a directly declared protective-device pair.
23. [x] Keep selective coordination data distinct from backup/cascading data.
24. [x] Capture exact upstream/downstream article snapshots.
25. [x] Capture the complete downstream supply fingerprint.
26. [x] Bound source voltage and manufacturer-declared limit.
27. [x] Require manufacturer, document, revision, page/table and HTTPS reference.
28. [x] Reject duplicate records of the same type for the same pair.

## E. Manufacturer applicability and staleness (29–35)

29. [x] Keep historic pair records inspectable after topology changes.
30. [x] Block outdated pair/path or selected-article applicability.
31. [x] Require a corresponding local fault study for numerical screening.
32. [x] Suppress a positive numerical indication for a stale fault study.
33. [x] Flag documented limits exceeded by matching local declared Ik,max.
34. [x] Flag cross-manufacturer source, product voltage and mixed standards for review.
35. [x] Never equate a referenced document or provisional numeric result with verified selectivity.

## F. User workflow (36–42)

36. [x] Provide editor for local device fault study, including decimals with dot or comma.
37. [x] Provide exact manufacturer-pair editor with separate coordination type.
38. [x] Preserve changes through existing project checkpoint and autosave.
39. [x] Exercise undo/redo for both new studies in Chromium scenario source.
40. [x] Remove affected evidence when an apparatus itself is deleted.
41. [x] Export safe UTF-8 CSV for per-device fault study.
42. [x] Export safe UTF-8 CSV for manufacturer pair source data.

## G. Engineering dossier and persistence (43–49)

43. [x] Restore validated local fault studies from project JSON.
44. [x] Restore validated manufacturer pair records from project JSON.
45. [x] Retain historical stale evidence in saved projects without silent repair.
46. [x] Add both sections to the engineering JSON bundle.
47. [x] Register unresolved and blocking issues in the common engineering issue list.
48. [x] Include both sections and provenance in printable engineering report.
49. [x] Preserve compatibility with earlier projects without these optional inputs.

## H. Automated acceptance (50–56)

50. [x] Unit tests: valid local fault study and upstream path captured.
51. [x] Unit tests: malformed studies, unsupported Icn, voltage mismatch and status boundaries.
52. [x] Unit tests: exact manufacturer pair, duplicate and malformed source rejected.
53. [x] Unit tests: topology changes, revisions and stale manufacturer applicability.
54. [x] Integration tests: JSON roundtrip, engineering bundle, issue register and printed dossier.
55. [x] Browser scenario written for actual controls, decimal input, autosave, import, undo and redo.
56. [ ] Verify **all three GitHub Actions** on the **last commit of the cycle** and record exact SHA.

## Still not demonstrated

- Physical conductor continuity, factory terminal identification and completed panel inspection.
- Normative installation acceptance; these are engineering draft and data-consistency reviews.
- Manufacturer table authenticity, exact tripping curves/settings, or guaranteed selectivity.
- Automatic fault-current calculation at every apparatus from a verified network/transformer equivalent. This cycle records a *declared source-backed study* at a specific location instead.
- Full commercial-panel end-to-end acceptance with independent real manufacturer datasets.

The next batch should use the 50–60 task orientation without converting commit count or mere test-case count into claims of completed engineering features.
