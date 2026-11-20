# Electropanel — состояние проекта
Обновлено: 2026-11-19. Это оперативная карта, не сертификат инженерной пригодности.

## Источники
1. Старый Electropanel v4.14: Python-архив electropanel_core_v4.14.zip, 172 файла, 51 Python-модуль (по существующему реестру); ранее зафиксированы 883 успешных Python-теста. Архив и тесты требуют независимого повторного подтверждения при очередном аудите.
2. Новый Electropanel Web: статический HTML/CSS/JS в репозитории antonschtrading-prog/electropanel, публикация GitHub Pages. Старый Python API /api/v28/* на Pages не работает; алгоритмы переносятся в JS, а не требуют возвращения Python-сервера.

## Последняя проверенная точка по истории Git
На момент создания документа последний изученный коммит main: 2e44d6aa17e578c3d283d9fc07d42a90bbfe3fb1 (2026-11-13). Последовательные коммиты добавили wiring-audit-v18.js, device-audit-v19.js, board-binding-v1.js и endpoint-bridge-v1.js. Проверено по истории Git и документации; актуальные тесты в этой сессии НЕ запускались.

## Состояние переноса
Основной реестр: [V414_MIGRATION_LEDGER.md](V414_MIGRATION_LEDGER.md). Техническая сверка: [V414_WEB_MIGRATION_AUDIT.md](V414_WEB_MIGRATION_AUDIT.md).
Исходный подсчёт реестра: 9 частичных переносов, 14 Web-аналогов без доказанного паритета, 28 не перенесены (51 всего). Эти категории устаревают по мере новых коммитов; не трактовать их как свежую пофайловую проверку.
Добавлены ограниченные расчёты перегрузки, справочные кабельные значения и поправки, TN/TT и падение напряжения, условные терминальные и аппаратные аудиты, ручные связи с DIN-компоновкой. Полная функциональная эквивалентность v4.14 не доказана.

## Ограничения безопасности
Не подтверждены полная селективность, расчёты КЗ и условия отключения во всех конфигурациях, достоверность заводских паспортов, реальная топология и физическая сборка, нагрев и полный нормативный комплект. PASS в отдельных арифметических тестах не означает допуск к проектированию или монтажу. engineeringApproved / ready_for_installation должны оставаться false до обоснованной независимой проверки.

## Порядок продолжения
1. Прочитать этот файл, DECISIONS.md, NEXT_STEPS.md.
2. Проверить свежий HEAD и PR; не полагаться на дату этого файла как на HEAD.
3. Для нужной задачи читать только относящиеся к ней исходники и тесты.
4. После блока: тесты, проверка артефакта публикации, обновление реестра и этих трёх документов.
5. Не менять согласованные решения и не утверждать успешные проверки без запуска.

## 14 November 2026 — native integrated project cycle (PR #12)
Current work supersedes the old snapshot above for Web integration. See [INTEGRATED_PROJECT_V2.md](INTEGRATED_PROJECT_V2.md): persistence repaired; catalogue candidates unified; opt-in linked current recalculation; collision-checked DIN positioning; native reconciliation table and bundle. Local suite: 894/894. Browser coverage is now committed as a separate GitHub Actions workflow. Main was not changed.

## 14 November 2026 — TN route and catalogue workbench
See [FAULT_ROUTE_AND_CATALOG_V2.md](FAULT_ROUTE_AND_CATALOG_V2.md). Added multi-segment declared TN L–PE fault-loop arithmetic, source/time/temperature evidence, current article/cable binding, gate/queue/report integration, catalogue CRUD with atomic geometry changes, and three source-backed Schneider records (six seeds total). Local regression suite: 908 passed. Full max-fault studies, selectivity, thermal design, normative applicability automation and manufacturer 3D remain outside the completed scope.

## 14 November 2026 — BOM and combined engineering gate integrity
The native project reconciliation and draft BOM now participate in the combined engineering gate. Duplicate circuit/branch IDs, orphan bindings, module mismatch, unplaced equipment, duplicate material takeoff and invalid catalogue geometry are reported as blockers. The draft BOM also distinguishes declared sources from verified manufacturer evidence. New regression files cover BOM and gate integration. All outputs remain DRAFT; no safety approval is inferred. Changes committed to PR #12. The latest workflow result has **not** been independently verified; recorded test additions are not a claim of a successful run.


## 14 November 2026 — manufacturer body dimensions across design outputs
PR #12: editable manufacturer declaration retains optional height/depth and propagates width/height/depth into the DIN evidence bridge, catalogue audit, draft BOM, CSV, printable engineering report and visual DIN preview. Inputs are bounded and malformed edits are transactional. Unknown dimensions remain explicit. Manufacturer-certified CAD/3D fit and thermal/enclosure clearance are not established. Verify commit-specific CI before treating this block as regression-tested.


## 18 November 2026 — local P0 commercial-panel acceptance

Web work remains on `integration-pr12`, not `main`. PR #32 (`fd77adf97361cd5a369083287b4417e35f33a552`) was integrated into PR #12 (`b1b74b22b4ba5d0c4039ee6f80a231331b30021e`) as merge `dfa84e38c85a77e95d882224dbfce94b975c36d1`. The completed P0 commercial-panel acceptance was published to PR #12 at `3993d1f34bce56df3722f955e9fb68d9feb2626b`; required GitHub Actions workflows passed on that exact head. `main` was not modified and the PR was not merged.

The real-Chromium commercial acceptance now exercises four consumer categories, calculated and manually declared currents, concrete catalogue articles, a shared four-pole RCD group, one-line/DIN/cabinet projections, project save and actual reload, subsequent UI editing, repeated issue and content-level checks of BOM JSON/CSV, single-line SVG, DIN CSV, engineering bundle JSON, print HTML and project JSON. A deliberately conflicting line/branch article blocks coordinated deliverables, including DIN CSV; diagnostic exports and raw project JSON remain available. Reimporting the corrected project restores export.

Panel-only manual Ib/Iz no longer require Ik. A blank Ik explicitly removes an earlier declaration; omitted, null, zero, negative and malformed values remain invalid. Calculated Ik/voltage are not copied into manual declarations. Numeric or absent `ikKa`, optional voltage and supported fault metadata now survive JSON/localStorage round trips instead of causing the saved project to be discarded. Chromium `/v` pattern syntax and the favicon 404 were also corrected.

Local verification on this source state: **5255/5255 Node tests passed**, all JS/CJS syntax checks passed, Pages package passed (**183 scripts / 188 assets**), and both full Chromium scenarios passed with zero page errors, console warnings/errors and HTTP 4xx/5xx. See `INDEPENDENT_RELEASE_AUDIT_20261118.md` for evidence boundaries. These are local results, not a new GitHub CI claim and not engineering or installation approval.


## 19 November 2026 — local P1 catalogue, apparatus and cabinet evidence slice

Baseline: published P0 head `3993d1f34bce56df3722f955e9fb68d9feb2626b` in PR #12. P1 implementation was published as `d65210720585a7239d056c872704c18ad2b99836`; all five exact-head GitHub Actions runs (two JS, two Chromium and one engineering validation) succeeded. `main` remains untouched.

- Enriched Schneider `A9F74116` with source-backed 85 × 78.5 mm body height/depth and separate Icu data. Added live Hager `CDA440D`: RCD, 3P+N, four poles/modules, 40 A, 30 mA type A, 6 kA conditional short-circuit rating and 70 × 83 × 70 mm body dimensions. Both records retain official HTTPS sources and review date 2026-11-19; neither is promoted to `VERIFIED` merely by having a product page.
- Closed the existing UI gap for `sharedDevices[].catalogSku`: a specific RCD can now be selected both when creating and editing a shared group. The internal key and manufacturer SKU reach DIN, BOM, single-line SVG, project JSON and reload without renaming QD1 or rewriting Ib/Iz/Ik.
- Shared-RCD replacement validates kind, poles, current and body/module geometry. Width changes are preflighted on a clone through the full DIN planner; a blocked result leaves the entire project unchanged. Clearing the selection restores template width. Only linked circuits with manual declarations receive `SHARED_RCD_ARTICLE_CHANGED` review.
- RCD illustrations use one linked operating lever and an explicit test control. They remain original SVG illustrations, not official photos or CAD. No raster manufacturer assets were added; `EP_MANUFACTURER_FRONT_ASSETS_V1` remains empty because image reuse permission is not established.
- The cabinet UI now exposes the existing apparatus-evidence projection, including exact article and source-backed body dimensions. Cabinet dimensions remain `USER_DECLARED`; an apparatus source does not verify DIN attachment, terminals, door clearance, wiring space, thermal clearance or `confirmedCabinetFit`.
- Responsive containment and permanent real-Chromium touch regression cover 375/390/768/1024 px, a 44 px selector target, select/clear/reselect and reload without horizontal page overflow. This is Chromium emulation, not a physical Mac/iPhone or Safari/WebKit test.

Repeated local verification on the restored source state: **5266/5266 Node tests passed**, changed JS/CJS syntax and `git diff --check` passed, Pages package passed (**183 scripts / 188 assets**), and the complete real-Chromium suite passed. Commercial exports were parsed for `CDA440D`; final commercial, general and touch scenarios had no page errors, console warnings/errors or HTTP 4xx/5xx. `engineeringApproved`, `ready_for_installation` and `confirmedCabinetFit` remain false. These results are software-regression evidence, not normative design or installation approval.


## 20 November 2026 — local browser compatibility and mobile containment

- The current working copy retains the earlier local fixes for calculation-source traceability, DIN owner identity, circuit deletion and project-switch baselines. It also contains mobile containment for the board grid, wide DIN/candidate/cabinet tables, wrapping panel headings and long diagnostic text.
- Mobile regression now checks loads, board and documents at 375/390/768/1024 px, including shared-RCD selection, clearing, reselection and reload. The previous board-only overflow is covered rather than inferred from the loads view.
- The complete Node suite and `git diff --check` passed after the code changes. Pages packaging passed with 183 scripts / 188 assets. The full existing browser integration workflow passed locally in both WebKit and Chromium; Chromium required the new headless mode because the legacy headless shell did not deliver its initial click on this Mac.
- A real-Safari WebDriver session did not start and is not counted as a pass. Physical Mac/iPhone and real-Safari checks remain open. Nothing from this local block has been committed, pushed, published or sent to GitHub CI; `engineeringApproved`, `ready_for_installation` and `confirmedCabinetFit` remain false.
