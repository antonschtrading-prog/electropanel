# Electropanel — состояние проекта
Обновлено: 2026-11-13. Это оперативная карта, не сертификат инженерной пригодности.

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
