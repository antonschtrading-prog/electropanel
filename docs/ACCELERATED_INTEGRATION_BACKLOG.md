# Electropanel — accelerated integrated delivery backlog

This is the **implementation and acceptance backlog**, not a claim that the listed work is completed.
Work in coherent 50–60 individually verifiable engineering and acceptance tasks per substantial development cycle when dependencies permit; these are not necessarily 50–60 new features or commits. Preserve existing modules. Every final HEAD needs validation, full Node tests and real Chromium smoke tests.

## P0 — Integrity of the engineering core

1. [x] Versioned incoming-device inventory and directed supply graph with cycle/parent validation.
2. [x] Device graph persistence with import, autosave and undo/redo.
3. [x] Reconcile symbolic source, shared RCD and outgoing branch feeds against phase/N declarations.
4. [x] Reconcile apparatus-to-apparatus supply against independent terminal and wire models, without physical approval.
5. [x] Explicit incoming-to-terminal-model binding with identity snapshot and invalidation.
6. [x] Block the same model device being assigned both incoming and outgoing board identities in UI, with audit checks.
7. [x] Cross-compare device supply, legacy feed origins and declared conductor route phases.
8. [ ] Generalize incoming device selection to real manufacturer article/series, with canonical catalogue matching and immutable revision provenance.
9. [x] Add preliminary, apparatus-location-specific Ik,max / Icn numerical screening at the incoming and outgoing devices; manufacturer and normative applicability remain unapproved.
10. [x] Map engineer-declared source R/X and transformer-equivalent impedance calculations to exact incoming apparatus IDs and supply paths.
11. [x] Flag stale modelled fault studies when upstream paths, selected articles, comparison points, model input or declared conductor basis changes.
12. [ ] Compare upstream/downstream overload constraints only when Ib/In/Iz, apparatus types and verified settings are available.
13. [ ] Add a device graph consistency matrix covering 1P, 1P+N, 2P, 3P, 3P+N, 4P: no inference from DIN module width.
14. [ ] Ensure every neutral zone is tied to declared RCD topology; PE must never pass through switchable contacts.
15. [x] Implement explicit incoming-terminal model bindings with immutable identity snapshots and separate drawing/wire evidence.

## P1 — Traceable selection and engineering outputs

16. [ ] Manufacturer selectivity records: exact upstream/downstream product pair, revision, voltage, current range, setting and source page; no default PASS.
17. [x] Store manufacturer's backup/cascading pair claims separately from selectivity claims; neither grants verified status.
18. [ ] Per-device scope checking for Icn/Icu/Ics and applicable standards; refuse cross-standard substitution.
19. [ ] Cross-view projection of graph onto GOST-oriented one-line draft with explicit incomplete/unknown states.
20. [ ] Generate a searchable apparatus-to-terminal reference matrix in engineering PDF/HTML and CSV.
21. [ ] Track article replacement impact on bindings, snapshots, BOM, conductor paths, fault studies and printed plans.
22. [ ] Build a realistic manufacturer/series device front renderer tied to catalogue physical dimensions and article ID.
23. [ ] Allow safe manufacturer/style changes with all affected calculations and model bindings marked for review.
24. [ ] Add an engineering issue work queue with explicit severity, affected device, required source and owner action.

## P2 — Shipping quality and migration

25. [ ] Chromium: full JSON upload for device-supply and incoming-binding snapshots, including tampered import rejection.
26. [ ] Chromium: add, bind, change, delete and undo an incoming apparatus; verify identical export/import state.
27. [ ] Chromium: route contradiction, terminal mismatch, and shared-RCD membership changes.
28. [ ] Stress tests for 400 branches, 50 incoming devices, 100 shared apparatuses and graph cycles.
29. [ ] Security tests for malicious labels, links, prototype-key payloads and oversized snapshots.
30. [ ] Reference projects: apartment TN-S, three-phase commercial panel, several grouped RCDs and explicit incomplete supply.
31. [ ] Document catalogue data ownership, safe import format and model incompatibility recovery.
32. [ ] CI on each final HEAD: JS syntax, complete Node tests, Chromium and Pages packaging. Never claim green without exact SHA.
33. [ ] Provide the engineer with a review-first UI: show unresolved sources and graph contradictions before visually convincing outputs.

**Engineering boundary:** this project produces design calculations, declared electrical models, diagrams, BOMs and documentation; it does not perform physical panel tests or certify installation. An explicit source/path or matched terminal remains *declared*, not physically proven. Engineering approval never follows from a graph alone.

## Cycle selection

Next large batch should combine items 8–15 and 19–21 when dependencies allow, with 25–29 running as acceptance tasks. Prefer finishing one complete user workflow (input → identity → calculation → warning → export → UI test) rather than adding disconnected partial modules.


## Latest complete integrated batch

See `docs/CYCLE_56_FAULT_SOURCE_INTEGRATION_20261116.md`: 56 linked delivery and acceptance items for existing R/X and transformer maximum fault studies, incoming/branch location binding, modelled fault-current comparison, evidence work queue, project import, printed dossier, stress and Chromium coverage. The matrix is explicitly a set of linked tasks and acceptance checks, not a claim of 56 brand-new modules.
