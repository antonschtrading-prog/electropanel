# Electropanel — архитектурные решения и правила
Обновлено: 2026-11-19. Различаем утверждённые требования, рабочие технические решения и гипотезы.

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


## 2026-11-19 — shared-article identity, visual rights and evidence boundaries

**One existing model, including shared devices.** `sharedDevices[].catalogSku` remains the canonical link for a group RCD. Creation and editing use the same catalogue validation; no parallel shared-device catalogue or replacement UI architecture is introduced. The group label (for example QD1), stable entity ID and manually declared Ib/Iz/Ik are not overwritten by an article selection. Wrong kind/poles/geometry and unknown SKUs fail before mutation. Width changes require a successful full DIN-plan preflight on a clone; BLOCKED means no project mutation.

**Source-backed technical facts do not create verification or asset rights.** `MANUFACTURER_PRODUCT_PAGE` plus a valid review date supports the stated source-backed fields and original-SVG disclosure only. It does not independently promote a record to `VERIFIED`, prove protection suitability, or grant photo/CAD reuse rights. Official product pages can support technical identity while their images remain unavailable for redistribution. Until rights evidence exists, the manufacturer raster library stays empty and generated SVG remains explicitly non-official, non-photo and non-CAD.

**Cabinet declarations and apparatus evidence remain separate.** Enclosure interior and zones are `USER_DECLARED`; apparatus width/height/depth can be manufacturer-source-backed. Neither side alone establishes actual DIN attachment, mounting offsets, terminal coordinates, door/wire/thermal clearance or cabinet fit. `confirmedCabinetFit`, `engineeringApproved` and `ready_for_installation` stay false without independent evidence.

**Mobile evidence is named precisely.** Real Chromium with mobile/touch context and 375/390/768/1024 viewport regression is the committed automated baseline. It is not represented as a physical Mac/iPhone test or Safari/WebKit compatibility result. Selectors retain at least 44 px touch height and page overflow is tested at the document/body level.

Publication target remains PR #12/GitHub Pages. `main` requires a separate user decision. Blocking coordinated documents does not block diagnostics or raw project JSON, and none of these software outcomes grants engineering or installation approval.

## 2026-11-20 — mobile containment and browser-engine evidence

Wide DIN rails and engineering tables must scroll inside their own containers; they must not expand the document or body beyond the viewport. Single-column grids use `minmax(0,1fr)`, panel headings and diagnostic rows wrap, and long evidence text remains breakable. Mobile regression covers loads, board and documents at 375/390/768/1024 px rather than only the input table.

A local Playwright WebKit run is engine-level compatibility evidence. It is not a physical Mac/iPhone test or a successful real-Safari WebDriver session. Those checks remain separate, and no engineering or installation approval follows from a browser-layout pass.
