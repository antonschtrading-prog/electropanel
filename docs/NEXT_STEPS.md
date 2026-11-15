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
