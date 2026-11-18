# Electropanel — состояние проекта
Обновлено: 2026-11-18. Это оперативная карта, не сертификат инженерной пригодности.

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

Current Web work is on local `integration-pr12`, not `main`. PR #32 (`fd77adf97361cd5a369083287b4417e35f33a552`) was merged locally into PR #12 (`b1b74b22b4ba5d0c4039ee6f80a231331b30021e`) as merge `dfa84e38c85a77e95d882224dbfce94b975c36d1`; subsequent P0 source, test and documentation changes are in the commit containing this note. Nothing was pushed because GitHub write access was unavailable, so CI for the new head remains unverified.

The real-Chromium commercial acceptance now exercises four consumer categories, calculated and manually declared currents, concrete catalogue articles, a shared four-pole RCD group, one-line/DIN/cabinet projections, project save and actual reload, subsequent UI editing, repeated issue and content-level checks of BOM JSON/CSV, single-line SVG, DIN CSV, engineering bundle JSON, print HTML and project JSON. A deliberately conflicting line/branch article blocks coordinated deliverables, including DIN CSV; diagnostic exports and raw project JSON remain available. Reimporting the corrected project restores export.

Panel-only manual Ib/Iz no longer require Ik. A blank Ik explicitly removes an earlier declaration; omitted, null, zero, negative and malformed values remain invalid. Calculated Ik/voltage are not copied into manual declarations. Numeric or absent `ikKa`, optional voltage and supported fault metadata now survive JSON/localStorage round trips instead of causing the saved project to be discarded. Chromium `/v` pattern syntax and the favicon 404 were also corrected.

Local verification on this source state: **5255/5255 Node tests passed**, all JS/CJS syntax checks passed, Pages package passed (**183 scripts / 188 assets**), and both full Chromium scenarios passed with zero page errors, console warnings/errors and HTTP 4xx/5xx. See `INDEPENDENT_RELEASE_AUDIT_20261118.md` for evidence boundaries. These are local results, not a new GitHub CI claim and not engineering or installation approval.
