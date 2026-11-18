# Electropanel — архитектурные решения и правила
Обновлено: 2026-11-18. Различаем утверждённые требования, рабочие технические решения и гипотезы.

## Утверждённые требования
- Конечная пользовательская версия должна работать в браузере, с размещением на GitHub Pages без обязательного Python-сервера.
- Сохранить ценные функции старого Python Electropanel v4.14, проверяя перенос по исходникам и эталонным тестам. Не удалять старый архив до завершения сверки.
- Высокая инженерная достоверность важнее эффектного UI: не представлять предварительные вычисления как нормативный допуск.
- Интерфейс должен быть интуитивным, с качественным реалистичным видом щита и различиями производителей/серий; текущие CSS-фасады — прототип, не точные модели.
- Уже согласованные результаты не менять молча; изменения оформлять явно и проверять.

## Технические решения, реализованные частично
- Python v4.14 — эталон алгоритмов и тестовых сценариев; JS — браузерная реализация. Не переносить Flask API напрямую в статический сайт.
- Декларации электрических связей не равны реальным соединениям: недостающие провода/клеммы не создавать автоматически.
- При изменении аппарата, фазы, полюсов и терминалов существующие привязки становятся устаревшими, а не переназначаются молча.
- Каталожный артикул, паспортные данные и доказательства происхождения должны иметь явный источник; неподтверждённое помечать UNVERIFIED.
- Рабочий код и документация — в GitHub; локальная папка Mac может быть синхронизированной копией, но обычный чат не получает к ней прямого доступа автоматически.
- Kimi-интеграция — отдельная инфраструктурная задача; успешные PING не подтверждают надёжность передачи полноценных заданий.

## Не решено
- Состав и метод верификации официальных нормативных таблиц и паспортов.
- Детальная модель электрического графа через промежуточные клеммы и аппараты.
- Выбор CAD/фото источников и прав на использование.
- Автоматизация доступа к Mac и синхронизация без расходования лишнего контекста.

## Правило принятия решения
Указывать альтернативы, риски и доказательства. Не заменять утверждённые версии по памяти. Любое существенное архитектурное изменение сначала документировать с причиной и последствиями.

## 2026-11-14 — preserve Web entity model and input provenance
Retain the existing Web schema and stable branch IDs. Add versioned extensions instead of replacing the project or converting it to the evidence-only schema. Recompute derived current on import. Opt-in automatic Ib uses the circuit power with explicitly declared electrical factors; phase-mode changes and manual current overrides cannot silently adopt a new calculation. DIN coordinates are nominal module positions, not certified CAD geometry. One planner drives visible board and exported projections.

## 2026-11-14 — minimum-fault and maximum-fault separation
A route-derived minimum L–PE current cannot populate maximum-fault Icn inputs. Ia, required time and supporting references are explicit declarations, never inferred from the letter B/C/D alone. Manufacturer-authored mirrored PDFs may support catalogue dimensions when cross-checked against official product identity; provenance is retained and not relabelled as a manufacturer's hosted source. Updating used custom articles is atomic with geometry checks.


## 2026-11-18 — panel-only manual current and document-issue contract

For a panel-only draft, manual Ib and Iz are a required positive pair, but Ik is optional because upstream fault evidence may legitimately be unavailable. Only an explicitly blank Ik form field removes an earlier manual declaration; omitted, null, zero, negative and malformed values are rejected. Calculated Ik and calculated/display voltage must not silently become manual declarations when the form is reopened. Missing Ik leaves breaking-capacity review incomplete and never creates engineering approval.

Project import accepts the actual persisted representation: positive numeric or string `ikKa`, absent `ikKa`, optional bounded voltage and supported textual fault provenance. Unknown or malformed fields fail closed. A valid project with manual Ib/Iz and no Ik must survive save/reload rather than being discarded as a whole.

All coordinated draft-document entry points use the shared cross-view export gate, including DIN placement CSV. Blocking coordinated documents must not block diagnostic bundle/audit exports or raw project JSON: engineers need those artifacts to repair an invalid draft. UNKNOWN may remain a marked DRAFT, while contradictory identities are blocked. This contract does not turn a successful export into normative, physical-fit or installation approval.
