# Electropanel — очередь работ
Обновлено: 2026-11-13. Короткий план для продолжения в новом чате.

## P0 — закончить аудит старого и нового источников
- Найти/проверить исходный архив v4.14 и доступность всех 172 файлов; проверить точный состав 51 Python-модуля.
- Пересчитать статусы 51 модуля по последнему main, включая wiring/device/board/endpoint изменения; отдельно различать частичный перенос, Web-аналог, полное покрытие и отсутствие.
- Для каждой значимой функции указать Python-файл, JS-файл, тесты, степень совпадения и пробелы.
- Сверить CI, GitHub Pages, импорт/экспорт JSON и реальные браузерные сценарии; тесты в текущем чате ещё не запускались.
Критерий: обновлённый проверяемый реестр с ссылками на код и тесты, без голословного «всё перенесено».

## P1 — инженерное ядро
- Полный граф клемм/проводов, включая многосегментные маршруты и N/PE.
- Полноценные расчёты КЗ, отключения, селективности и кабельных условий с контролем применимости и источников.
- Контроль регрессий Python↔JS; UNKNOWN при недоказанных предпосылках.
Критерий: эталонные тесты, независимая инженерная проверка и отсутствие ложного монтажного PASS.

## P2 — каталог и визуальная сборка
- Расширить проверенный каталог конкретных артикулов, серий, геометрии и разрешённых изображений.
- Связать точные модели аппаратов с логическими цепями и DIN-расположением.
Критерий: смена производителя/серии меняет достоверный фасад и параметры без подмены электрических расчётов.

## Режим работы
Один блок = реализация → тесты → проверка публикации → обновление PROJECT_STATE/DECISIONS/NEXT_STEPS и реестра. GitHub — источник актуальной версии; читать только релевантные файлы. Kimi отлаживать отдельно; Mac-папку подключать позже.

## Цикл 2026-11-14: независимые проверочные модули (ещё не интегрированы в UI)
- `coordination-evidence-v1.js`: неравенства Ib/In/Iz/I2 и контроль происхождения данных.
- `fault-loop-screen-v1.js`: расчёт из явно заданных U0, Zs, cmin и Ia, без утверждения времени отключения.
- `catalog-evidence-v1.js`: контроль происхождения паспортов и прав на визуальные материалы.
- `din-geometry-evidence-v1.js`: миллиметровые границы DIN и проверка пересечений.
- Добавлены четыре файла тестов (23 сценария). CI ещё требует подтверждения. Модули не подключены к app.js, не являются полноценным расчётом КЗ или нормативной проверкой.
- Далее: интеграция в проект, документы и UI, регрессионные тесты, браузерные сценарии, обновление реестра переноса.

## После интеграционного цикла 2026-11-14
- Проверить новый браузерный workflow на точном HEAD PR #12; не считать Node-тесты заменой браузерной проверки.
- Расширять паспортную базу и подтверждённую геометрию, сохраняя различие между декларациями и заводскими данными.
- Полное расчётное ядро КЗ/отключения/селективности/нагрева и реалистичные 3D-модели остаются незавершёнными; текущая интеграция их не подменяет.

## After TN route/catalogue cycle
- Extend verified source/method coverage for max prospective fault current, selectivity and thermal calculations; preserve the distinction between numeric comparison and applicable normative design.
- Expand catalogue categories and genuine manufacturer CAD/visual data; current additions support single- and three-phase MCB workflows only.
- Improve workspace navigation and explicit conductor cross-section/temperature provenance across multi-segment routes; current segment R/X is declared directly.

## 2026-11-14 — native reconciliation integrity hardening
- Added fail-closed validation for duplicate/missing circuit and branch-device identifiers, orphan branch devices, multiple devices bound to one circuit, and mismatched/invalid module counts in `epReconcileProjectV2`.
- Reconciliation now flags missing board placement and catalogue-vs-line module drift, rather than relying on a width-only check. Added dedicated native integrity regression cases.
- Changes are committed in PR #12; CI on the exact final commit is **not yet independently confirmed**. Do not treat this section as evidence of a successful test run.
- Next substantial work: verify browser workflow on the final HEAD; connect engineering status to export gates; expand verified manufacturer records and genuine frontplate geometry; complete bounded fault-current and protection evidence.

## Ten-task integrated execution queue (2026-11-14)
This queue is deliberately based on the current PR #12, not a fresh implementation. **Only code-backed results count as completed.**
1. [x] Native reconciliation must not crash on malformed branch collections; fail closed with issue codes. Commit 321cc171.
2. [x] Add regressions for malformed imported branch data and incomplete board plan. Commit 158e9eb6.
3. [x] Combined gate must tolerate malformed issue arrays from independent audits. Commit bbee74cf.
4. [x] Export bundle must expose blocked/unresolved section summaries and issue count. Commit 849d63a0.
5. [x] Add export regression coverage for status summaries and untrusted approval flags. Commit e8c33512.
6. [ ] Verify the entire Node suite at the latest HEAD, not a stale commit.
7. [ ] Verify actual Playwright browser workflow and repair failures.
8. [ ] Complete terminal/N/PE trace consistency and documentation gate.
9. [ ] Extend fault-route evidence with verified boundary assumptions and applicable disconnection criteria.
10. [ ] Improve source-backed manufacturer-specific device front geometry and integrated cabinet visual.

**Validation constraint:** GitHub workflow runs were not visible for the latest commit at the time of this update. Entries 1–5 describe committed changes and regression additions, **not a confirmed green test run**. Tasks 6–10 remain open.

## 2026-11-14 — linked TN fault-route evidence block
- Extended existing `fault-route-design-v2.js` rather than creating a competing calculator. Numerical Ik,min and loop impedance remain separate from the maximum fault-current input.
- The Ia comparison now fails closed unless the declared device is an MCB, required network/conductor/temperature/trip-time sources are present, and the bounded single-phase applicability assumptions are satisfied. A 3-phase line or incompatible poles yields UNKNOWN instead of an unjustified PASS.
- Added input/source-length guards, malformed project handling, UI diagnostics and focused regression cases in `tests/fault-route-v2.test.js`.
- This is a **bounded evidence review**, not normative certification. Verification of device time-current characteristics, actual disconnection-time applicability and full three-phase/TT/IT fault studies remain open.
- GitHub workflow success on this HEAD has **not been observed**. Do not mark CI complete until confirmed.


## After body-geometry integration — next engineering-critical tasks
- Collect actual manufacturer CAD/STEP or legally usable product photography for exact articles and series, with explicit provenance and licence review; the current SVG remains an original schematic illustration.
- Bind declared height/depth to a verified enclosure-clearance model only after collecting inner-case, cover and wiring-space geometry. Width in 18 mm modules is **not** a 3D fit verification.
- Continue bounded short-circuit, cable and disconnection source verification, cross-view N/PE graph integrity and migration parity with the legacy source; keep status UNKNOWN where evidence is absent.

## 2026-11-15 — chained selection/schematic/evidence consistency (PR #12)
- Shortlist preserves Icu separately from Icn; Icu-only candidates are rejected for Icn-based arithmetic instead of receiving an inferred Icn.
- Selected protection workbench emits explicit missing-Icn and non-substitutability diagnostics, rather than displaying an unidentified breaking rating as suitable.
- Both the native one-line projection and protective workbench keep the separate Icu fields, while no safety/installation approval is inferred.
- Regression cases cover CHINT Icu-only rejection, Eaton Icn-only retention, one-line output and HTML evidence.
- Latest commit-specific CI must be checked before marking this cycle verified.

## 2026-11-15 — catalogue replacement integrity and 14-brand picker
- Board apparatus picker now offers the approved three tiers, including unavailable names marked as having no article; only actual records are selectable.
- Article replacement validates geometry, label and nominal data before mutation and records a circuit-level re-review trail, without rewriting Ib, Iz or Ik.
- New comparison helper preserves field-by-field previous/new article values and flags missing Icn, unknown enclosure body dimensions, and unresolved source verification.
- Complete CI and browser run must be checked on the final head; no normative clearance is claimed.

## 2026-11-15 — catalogue replacement / DIN and report integration
- The live editor preflights manufacturer width changes in both manually fixed and automatically allocated rail layouts. A failed layout preserves the original circuit and project rather than partially updating the article.
- The engineering bundle now includes a separate replacementReview section listing old article ID, chosen article ID, current selection and unresolved warnings; mismatched current selection is explicitly BLOCKED.
- The printable engineering report includes the same substitution review with HTML escaping.
- Change-impact detection includes the pending manufacturer replacement review, so modified evidence cannot be silently overlooked even when the SKU has not changed.
- Added regression tests for auto-layout overflow, unchanged source on failed swap, replacement export/markup escaping, stale substitution and downstream invalidation.
- The software still does not establish normative safety or manufacturer geometry approval. Verify exact-head JS, validation and browser CI before marking the cycle complete.

## 2026-11-15 — focused engineering-core stage: prospective maximum short-circuit current
- Extended the existing `fault-route-design-v2.js`; did not introduce a competing unrelated calculation engine.
- Added explicit declared maximum-current models for a three-phase positive-sequence source+line network and a single-phase L–N path, with R/X sums, independent voltage and cmax, and no reuse of L–PE minimum-loop impedance.
- Added source and conductor temperature provenance gates, 3-phase/1-phase pole applicability checks, Icn-rated-voltage/standard checks, and separate numerical comparison versus evidence-limited threshold status. Icu is not Icn.
- Surfaced results under the existing engineering bundle's faultRoutes section and in the printable report; added project JSON restoration for maximumFaultInput and independent reference/regression tests.
- Scope limitation: these models are restricted arithmetic on engineer-supplied positive-sequence or line-neutral impedances, not a full IEC 60909 study. No default fault levels, equipment certification, selectivity or normative approval.
- Verify CI (Node, validation, Chromium) on this exact branch HEAD before marking complete.

## 2026-11-15 — focused engineering-core multi-chapter cycle
This cycle prioritises one short-circuit calculation chain rather than isolated styling tasks.

1. **Maximum-fault provenance:** `epMaximumFaultBasisV2` stores the relevant line, earthing, cable-section and article characteristics; `epApplyMaximumFaultV2` atomically updates a project and rejects malformed inputs without mutating the original. Changed dependencies produce `MAX_FAULT_BASIS_STALE` and prohibit a preliminary positive comparison.
2. **Minimum L-PE fail-closed evidence:** a known numerical `Ik,min < Ia` is now BLOCKED even if another source or time-current basis is incomplete. Missing evidence cannot turn a known failure into UNKNOWN. Passing still requires full bounded inputs.
3. **One circuit review:** maximum prospective short-circuit results are exposed separately from independent manual Ik declarations in `epCircuitDesignReviewV1`. Each result maintains its own uncertainty and does not overwrite the other.
4. **Usable editor input:** two separate engineering forms (3-phase positive-sequence and single-phase L-N) in `maximum-fault-ui-v2.js`, with declared R/X network + segments and temperature/source fields; wired to the original project UI, undo/edit and persistence.
5. **Action queue:** distinct urgent `MAX_FAULT_EXCEEDS_ICN` action and missing/uncertain maximum-fault input tasks, separate from minimum L-PE fault-loop issues.
6. **Coverage:** numeric reference tests, invalid input, project fingerprint invalidation, design review, report and UI/browser integration. CI must be checked on the final head before describing it as verified.

**Boundary:** restricted arithmetic from engineer-declared source and cable impedances; not a validated IEC 60909 implementation. Never infer Icu from Icn, conductor properties from catalogue logos, verified protection time, selectivity or normative suitability.

## 2026-11-15 — focused engineering-core: LV transformer source equivalent
- Added `transformer-source-v1.js` for a **declared three-phase LV transformer equivalent**, deriving R and X at LV terminals from rated apparent power, rated LV ULL, uk% and rated short-circuit load loss. The upstream network R/X is explicitly supplied *referred to the LV base* and added separately.
- The existing maximum fault-current model supports `sourceModel: TRANSFORMER_WITH_UPSTREAM` only in its three-phase positive-sequence scope. Other models retain explicit impedance input; transformer source cannot be silently applied to L–N calculations.
- Guarded incompatible voltage base, physically inconsistent active resistance versus impedance magnitude, missing provenance and loss-basis declarations. Comparison to Icn remains provisional, a numeric overrun remains blocking, and no numeric defaults are inferred.
- Exposed transformer nameplate and upstream source inputs in the circuit engineering UI, persisted through the existing maximum-fault workflow, and included transformer impedance/source provenance in the printed report.
- Added reference examples, malformed-input and nonmutation tests, documentation checks, HTML escaping tests and a real-browser entry/persistence scenario.
- **Boundaries:** R/X transformer equivalence is an explicitly declared algebraic engineering model, not validated IEC 60909, not a certified short-circuit study and not a substitute for network topology, correction factors, upstream network evaluation, or manufacturer evidence. CI must be verified on the final exact commit.

## 2026-11-15 — engineering-core transformer plausibility and fault-current reconciliation
- Corrected a low-impedance transformer physical-plausibility check: active resistance from declared load losses cannot exceed total impedance magnitude; tolerance is now scale-relative rather than an absolute ohm threshold. Added rated LV current and resistive/reactive impedance components as explicit derived diagnostics, never an approval flag.
- Added `epFaultCurrentConsistencyV1` to the existing circuit design reviewer. It compares an independently declared Ik and calculated Ik,max **only if** the engineer supplies identical nonempty `comparisonPoint`, the exact same `faultModel`, and manual `purpose: MAX_PROSPECTIVE`. Otherwise values remain independent and must not be interpreted as contradictory.
- If an explicitly matched manual maximum falls below the computed one, the reviewer emits a BLOCKED discrepancy, with source values preserved unchanged. A larger or equal manual declaration remains UNKNOWN pending engineering comparison.
- Reconciliation evidence is surfaced in the engineering work queue and printed draft report. Regression coverage spans contradictory sources, mismatched points/fault models, malformed inputs, non-mutation, numerical equivalence and report flow.
- **Critical limitation:** arithmetic reconciliation never independently verifies fault topology, network impedance, calculation assumptions, IEC 60909 compliance or manufacturer ratings. A negative numeric comparison is a review blocker, not a certified measurement. Independent provenance is still required.

## 2026-11-15 — focused calculation core: manufacturer upper-bound trip envelope for TN L–PE
- Implemented `trip-envelope-v1.js`, a deterministic, conservative *declared evidence* calculation. The engineer supplies an exact article ID, rating/curve (where declared), manufacturer source, applicability confirmation and ordered points with current in amperes and **guaranteed maximum** disconnection time in seconds. No interpolated trip curves, guessed B/C/D multipliers, or manufacturer-provided guarantee values are fabricated.
- For a given `Ik,min` and required time, the algorithm finds the lowest listed current whose declared maximum clearing time is no greater than the time limit. It reports that threshold, arithmetic margin and the maximum time documented at or below the evaluated current. If no point demonstrates clearing, it reports `NOT_DEMONSTRATED`, not a fabricated certified device failure.
- Malformed/mismatching records, unordered points, excessive source length, incorrect article ID and wrong fault type are rejected as blocking evidence. Missing manufacturer source or applicability confirmation remains UNKNOWN. Device selection, PE/earthing scope, cable impedance and current-source declarations are evaluated by the existing fault-route model.
- The existing L–PE threshold's former `PASS` has been deliberately renamed `PRELIMINARY_PASS`: the numerical inequality alone never establishes a verified automatic disconnection time.
- Added optional source-backed trip-envelope fields in the TN route editor with a separate explicit enable control, backed by the existing atomic project save, risk register, work queue, and printable draft. Empty optional fields do not block an ordinary TN calculation. Added reference, malformed, injection-escaping, printed-output, integration and real-browser regression coverage.
- **Scope:** early engineering review of manually declared upper-bound trip-time evidence only. Not IEC 60898/60947 conformance, not a licensed manufacturer curve database, not an implementation of all IEC 60364 disconnection conditions or device selectivity. Real verification still requires authentic catalogue/time-current data and applicable network/installation norms.
- Before marking this cycle complete, verify JS, validation and browser checks on the exact final commit.

## 2026-11-15 — engineering core: declared automatic disconnection applicability
- Added `disconnection-context-v1.js` as an explicit **engineer-declared** condition for TN-S/TN-C-S automatic disconnection by overcurrent protection. The engineer must identify circuit class, earthing, phase, nominal U0, maximum permitted disconnection time, a standard edition/clause, a documented time basis and classification basis.
- The module **does not invent IEC 60364 time values** or automatically select an applicable limit. It checks the declared required disconnection time against the declared permitted time and reports a blocking numerical contradiction when the requested value exceeds the limit.
- A contradiction remains in the editable project for correction; invalid scope, wrong voltage/earthing/phase, unsupported protective measure, malformed time or excessive source text are rejected before modifying the project.
- Integrated optional inputs into the existing TN L–PE editor. Results are included separately from numerical fault-current and time-current envelope checks, documented in the print dossier and converted to engineering work-queue actions.
- Regression tests cover contradictory time limits, missing sources, wrong earthing/scope, non-mutation, HTML escaping and actual browser editor persistence. All conclusions remain `engineeringApproved:false`.
- **Limitations:** this is a strict consistency/evidence gate, not an authoritative implementation of the IEC 60364 disconnection-time tables or compliance certification. No assumed default times, conductor verification, RCD operating-time rules or undocumented manufacturer curves.

## 2026-11-15 — core-focus: unified protection decision over existing calculations
- Added `protection-decision-v1.js`: one read-only per-circuit matrix joining declared Ib/In/Iz, independent computed Ik,max against Icn, TN L–PE minimum current, manufacturer upper-bound trip envelope and the engineer-declared ADS time-context evidence. It reuses existing models rather than introducing competing or automatically fabricated calculation inputs.
- Numerically insufficient ratings or incompatible protective-device kinds yield BLOCKED; missing current, catalogue, breaking-capacity or disconnection evidence remains UNKNOWN, never an engineering approval. Icu/Ics do not replace Icn, and a maximum Ik calculation does not overwrite independently entered manual Ik or the minimum L–PE scenario.
- Integrated the independent `protectionDecision` section into the engineering bundle, the print-friendly report and production browser script load order. Its output is deterministic and does not mutate the project. Numeric statuses use PRELIMINARY_PASS (not verified); the overall approval fields stay false.
- Added regression coverage for insufficient load and cable ratings, Ik,max exceeding Icn, missing Icn, current below Ia, ADS time-limit violations, missing calculations, mismatching article kinds, duplicate circuit IDs, and printed output. The existing bundle tests also cover unavailable-module failure behavior.
- **Next:** linked physical-device selection evidence, the actual passport standard and voltage requirements for Icn, and richer norm-specific applicability studies with original source citations. Never infer conformity to IEC 60364, IEC 60898, IEC 60947 or manufacturer standards from these arithmetic checks.
- Verify CI on the exact latest commit before marking complete.

## 2026-11-15 — core-focused milestone: verified-input overload coordination with derated Iz and I2
- Extended the protection engineering chain with `cable-overload-coordination-v1.js`, a read-only model for the two separate numerical criteria `Ib <= In <= Iz` and `I2 <= 1.45 Iz`. This follows the stated numerical coordination tests of IEC 60364-4-43:2023, 431.4.2; it is not a declaration of compliance or a manufacturer verification.
- The engineer enters a base current-carrying capacity, at least one named and documented correction factor, the source and standard of a manufacturer-declared conventional operating current I2, and the article identity. Factors are deliberately restricted to (0,1] in this conservative model; boosting factors, unsupported conditions and imported unbounded data are rejected.
- A corrected current-carrying capacity is computed by multiplying explicit factors. If the legacy entered Iz disagrees, the lower current is used for the numerical protection test; a legacy Iz higher than computed results in a BLOCKED inconsistency rather than silently accepting a less restrictive value.
- I2 is never estimated from a generic breaker curve or assumed automatically equal to 1.45 In. An absent I2 is UNKNOWN, an arithmetic I2 excess is BLOCKED, and manufacturer provenance is always an open independent-review obligation.
- Propagates overload results into the unified per-circuit protection assessment, circuit design review, engineering work queue, and print dossier; the original project import/restoration and change-impact pipeline now track `overloadCoordinationInput`.
- The original board workspace has an optional editable engineering form for base Iz, factors, declared I2, provenance and reviewed applicability. The form preflights structural errors, retains numerically failing designs for correction, supports undo, and persists declared inputs to the project. Added deterministic numeric/security tests and actual Chromium input-and-save regression.
- **Boundary:** this is an engineer-supplied, conservative algebraic model. It does not implement the full IEC 60364-5-52 cable ratings, nonstandard exceptions to overload coordination, adjustable-trip setting models, or certification of the device manufacturer's declared operating characteristic.
- CI checks must be verified on the exact final commit.

## 2026-11-15 — focused engineering core: adiabatic conductor withstand for a declared fault scenario
- Added `cable-short-circuit-thermal-v1.js` with the energy inequality `I²t ≤ k²S²`, equivalent minimum cross-section `S_min = I sqrt(t)/k` and explicit engineering units. The checked conductor role (phase, neutral or PE), material, cross-section, fault type and location, coefficient k, clearing time and source provenance must be supplied. No k, maximum clearing time or fault current are guessed.
- Supports two distinct current inputs: an independently declared sourced scenario, including L–PE, or the existing calculated maximum current **only if** the fault model and comparison point match. The maximum L–N/three-phase model is never silently reused for PE. The minimum-current L–PE trip envelope is not substituted as evidence of maximum thermal clearing time.
- Guards unsupported PE/neutral paths, mismatched phase cross-section or conductor material, missing k/time/current/documentary provenance, non-adiabatic methods, malformed numbers, >5 s in this restricted adiabatic model, and non-finite energies. A known numerical withstand overrun generates BLOCKED; positive arithmetic stays preliminary and never asserts engineering approval.
- Connected to the existing unified protective-device decision, circuit design review, prioritized work queue, print dossier, project JSON import, impact invalidation, and a board-workspace editor. The editor preserves numerically failing cases for corrective design, while rejecting malformed or inconsistent input. Changes demand repeat engineering review.
- Added independent numeric reference cases, linked-max-current point/model regressions, PE versus L–N scope tests, invalid source/temperature guards, stored-project/impact tests, output escaping, and real-browser input/persistence/decision tests.
- **Known exclusions:** IEC 60909 full network study; non-adiabatic/long-duration heating, I²t let-through curves for current-limiting protective devices, realistic time-current interpolation, independent verified k for cable types and actual conductor grouping, and automatic normative conformity. The inputs remain engineer-declared source evidence and the output is a DRAFT.
- Ensure all three CI checks pass against the **exact final commit SHA** before marking the milestone verified.

## 2026-11-15 — focused engineering core: source-bound current-limiting breaker I²t
- Added `breaker-let-through-v1.js` as a **conservative manufacturer-declared** upper-bound energy evaluator, not a synthetic breaker catalogue or generated time-current curve. It evaluates an explicitly scoped prospective short-circuit current against guaranteed upper I²t bands and the conductor's k²S² thermal capacity.
- Strong identity boundary: internal catalogue **key** and manufacturer **article SKU** must each match the selected device. Its nominal rating, poles, protection standard, tested/application voltage and frequency, model and fault point are checked. Missing manufacturer documentation, unsupported scenarios and mismatched conditions never produce an engineering approval.
- Bands are ordered and non-overlapping, with explicit min/max prospective current, a maximum I²t and a source for the **entire** stated interval. No interpolation or extrapolation. If no confirmed band contains the current, result is UNKNOWN; if a claimed bound exceeds k²S², result is BLOCKED. This model does not invent cut-off/current-limitation characteristics.
- Prospective current is separately source-declared or linked to the already scoped maximum-current calculation **only at the exact same point/model/voltage**; missing or invalid source evidence prevents approval. L–PE/PE and unsuitable conductor role are not treated as compatible with the available L–N/3-phase data.
- Integrated with unified protection assessment, circuit review/work queue, draft print report, project JSON restoration, change-impact invalidation and original board workspace's editable I²t form. Input updates require repeat review; physically impossible or mismatched inputs are rejected; arithmetic failures are preserved for correction.
- Regression tests include energy arithmetic, inadequate withstand, outside-band cases, overlapping ranges, voltage/frequency/poles/article mismatches, separate catalogue identity, source provenance, linked-source applicability, HTML escaping, JSON round-trip, and change impact; Chromium exercises a full data-entry/persistence/issue path.
- **Scope restrictions:** no actual manufacturer data has been independently ingested by this module, and no current-limitation curve, IEC 60909 network study or IEC 60364/60947/60898 conformity is certified. Input is an engineer-declared upper-bound **claim** requiring independent evidence verification. Never substitute a single measured point for a guaranteed interval.
- Confirm all three CI workflows on the latest exact SHA before marking the milestone complete.

## 2026-11-15 — manufacturer documentation index and corrected I²t conclusions
- Corrected a critical *upper-bound inference*: a documented **maximum** let-through energy above k²S² does **not** prove cable thermal damage. It means that withstand cannot be demonstrated from that upper bound (`NOT_DEMONSTRATED`, UNKNOWN), requiring a sharper manufacturer's guarantee or a different design. A demonstrated upper bound below/equal to k²S² remains PRELIMINARY_PASS only. No physical testing is within the scope of this project.
- Added `manufacturer-evidence-register-v1.js` as a project-local, append-only document index, with exact selected catalogue key and distinct manufacturer SKU, maker and series, HTTPS source, document version, reviewed date/name, page/graph location and explicit test scope (device standard, rating, poles, voltage, frequency, fault model and bounded I²t intervals).
- `epLetThroughEvidenceBindingV1` cross-checks all numerical band boundaries, source identity and test conditions against the I²t calculation. Mismatches are BLOCKED; missing or unreviewed evidence is UNKNOWN. Document presence is *never* treated as manufacturer authentication, testing, certification or normative approval.
- Exposed an editor in the original board workspace to capture a record from existing I²t inputs, validate it, link the record to the circuit, and preserve the document version in JSON. Source register changes invalidate device-dependent design evidence. The engineering bundle and print output expose sources, locations and linked calculations; work queue includes unlinked, mismatched and incomplete provenance.
- Added isolated regression and Chromium tests for document records, duplicate IDs, invalid dates/URL, curve mismatch, independent catalogue/manufacturer SKU identities, imported project, print, true upper-bound conclusions and complete browser save/link flow.
- **Scope:** the project now has a document *register*, not a populated or independently authenticated manufacturer database. Genuine published I²t curves must be obtained and interpreted case-by-case; any example.org links used in tests are synthetic fixture data, not manufacturer evidence.
- Verify all 3 CI workflows on the final exact branch head.
