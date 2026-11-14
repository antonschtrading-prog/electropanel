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
