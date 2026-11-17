'use strict';
// Offline, self-contained, print-friendly engineering DRAFT; never asserts normative approval.
function epEngineeringPrintV1(bundle){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=(headers,data)=>{
  const th=headers.map(x=>'<th>'+esc(x)+'</th>').join('');
  const trs=data.map(row=>'<tr>'+row.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('');
  return '<table><thead><tr>'+th+'</tr></thead><tbody>'+trs+'</tbody></table>';
 };
 const sections=bundle?.sections||{},dossier=sections.dossier?.rows||[],
  bom=sections.bom?.items||[],protection=sections.protection?.rows||[],
  board=sections.board?.placements||[],cross=sections.crossView?.issues||[],
  allIssues=sections.issueRegister?.entries||[],wiring=sections.wiringTrace?.rows||[],
  neutral=sections.neutralSegregation?.rows||[],neutralPairs=sections.neutralWireIsolation?.pairs||[],
  singleLine=sections.singleLine?.nodes||[];
 const replacementRows=sections.replacementReview?.rows||[];
 const replacementTable=rows(['Цепь','Предыдущий артикул','Назначенный артикул','Текущий артикул','Предупреждения','Статус'],
  replacementRows.map(x=>[x.lineId,x.from??'Не указан',x.to??'Не указан',
   x.currentSku??'Не указан',(x.warnings||[]).join('; '),x.status]));
 const workQueue=sections.designWorkQueue?.items||[];
 const workQueueTable=rows(['Приоритет','Цепь','Задача','Раздел'],workQueue.map(x=>[x.priority,x.lineId,x.action,x.section]));
 const designReview=sections.designReview?.rows||[];
 const designReviewTable=rows(['Цепь','Ib A','In A','Iz A','Icn kA','Ik kA','Сечение мм²','ΔU %','Статус'],designReview.map(x=>[x.lineId,x.ibA,x.inA,x.izA,x.icnKa,x.ikKa,x.sectionMm2,x.voltageDrop?.dropPercent,x.status]));
 const topology=sections.protectionTopology;
 const protectionTopologyTable=rows(['Нижестоящая цепь','Вышестоящая цепь','Проверка селективности'],
  (topology?.edges||[]).map(x=>[x.downstreamLineId,x.upstreamLineId,
   topology?.selectivityStatus??'NOT_ASSESSED']));
 const protectionTopologyIssues=rows(['Уровень','Код','Цепь'],
  (topology?.issues||[]).map(x=>[x.level,x.code,x.lineId??x.downstreamLineId??'—']));
 const protectionChainTable=rows(['Нижестоящая цепь','Аппарат ID','Артикул','In, A',
  'Вышестоящая цепь','Аппарат ID','Артикул','In, A','Путь','Селективность'],
  (sections.protectionDeviceChain?.pairs||[]).map(x=>[x.downstreamLineId,
   x.downstreamDeviceId??'—',x.downstream?.sku??'—',x.downstream?.inA??'—',
   x.upstreamLineId,x.upstreamDeviceId??'—',x.upstream?.sku??'—',x.upstream?.inA??'—',
   x.relation,x.selectivityStatus]));
 const supplyEdgesTable=rows(['Источник','Назначение','Проводник','ID декларации','Достоверность'],
  (sections.supplyDeviceGraph?.edges||[]).map(x=>[x.from,x.to,x.kind,x.sourceId,x.physicalContinuity]));
 const deviceSupplyTable=rows(['Источник','Получатель','Проводники','Источник данных','Проверка'],
  (sections.deviceSupply?.edges||[]).map(x=>[x.from,x.to,(x.conductors||[]).join(', '),x.evidence,x.physicalContinuity]));
 const supplyTerminalTable=rows(['От','К','Проводники','Устройство модели 1','Устройство модели 2','Прямые провода','Физический статус'],
  (sections.supplyTerminals?.rows||[]).map(x=>[x.from,x.to,(x.conductors||[]).join(', '),
   x.fromModelDeviceId??'—',x.toModelDeviceId??'—',x.declaredDirectWires,x.verification]));
 const incomingBindingsTable=rows(['Вводной','Терминальная модель','Клемм','Устаревшая привязка','Статус'],
  (sections.incomingTerminalBindings?.rows||[]).map(x=>[
   x.incomingId,x.modelDeviceId,x.terminalCount,x.snapshotStale?'ДА':'нет',x.status]));
 const crossFeedTable=rows(['Цепь','Питающий аппарат','Объявленные проводники','Прежних связей','Маршрут объявлен'],
  (sections.supplyCrossEvidence?.rows||[]).map(x=>[
   x.circuitId,x.upstream??'—',(x.deviceConductors||[]).join(', '),x.legacyCount,x.routeDeclared?'Да':'Нет']));
 const deviceFaultTable=rows(['Аппарат','Ik,max, кА','Напряжение, В','Icn, кА','U Icn, В','Артикул','Сравнение','Изменён маршрут','Замечания'],
  (sections.deviceFaultScenarios?.rows||[]).map(x=>[x.deviceNodeId,x.ikMaxKa,x.voltageV,
   x.icnKa??'—',x.icnVoltageV??'—',x.sku??'—',x.numericalComparison,
   x.supplyPathStale?'ДА':'нет',(x.issues||[]).map(i=>i.code).join('; ')]));
 const coordinationTable=rows(['Питающий','Нижестоящий','Тип данных','Координационный предел, кА',
  'Ik,max, кА','Напряжение, В','Производитель','Документ','Редакция','Страница','Численный статус'],
  (sections.deviceCoordinationEvidence?.rows||[]).map(x=>[x.from,x.to,x.evidenceType,
  x.limitKa,x.ikMaxKa??'—',x.voltageV,x.manufacturer,x.documentId,x.revision,x.page,x.numeric]));
 const calculatedFaultTable=rows(['Аппарат','Точка','Модель КЗ','Ik,max, кА','Напряжение, В',
  'Icn, кА','Метод источника','Расчётный статус','Устарел'],
  (sections.calculatedDeviceFault?.rows||[]).map(x=>[x.deviceNodeId,x.comparisonPoint,x.model,
   x.ikMaxKa??'—',x.voltageV??'—',x.icnKa??'—',x.sourceModel??'—',
   x.calculationThreshold,x.stale?'ДА':'нет']));
 const incomingMaxTable=rows(['Вводной','Модель источника','Ik,max, кА','Напряжение, В','Icn, кА',
  'Численная проверка','Изменено питание','Эквивалент трансформатора'],
  (sections.incomingMaximum?.rows||[]).map(x=>[x.deviceNodeId,x.model,x.ikMaxKa??'—',
   x.voltageV??'—',x.icnKa??'—',x.thresholdStatus,x.sourcePathStale?'ДА':'нет',
   x.transformer?.transformerZOhm??'—']));
 const evidenceMatrixTable=rows(['Аппарат','Назначение','Артикул','Питание заявлено','Расчётный Ik,max, кА',
  'Ручной Ik,max, кА','Документов пары','Устарело','Статус','Что проверить'],
  (sections.protectionEvidenceMatrix?.rows||[]).map(x=>[x.deviceNodeId,x.kind,x.sku??'—',
   x.declaredSupply?'ДА':'нет',x.calculatedIkMaxKa??'—',x.manualIkMaxKa??'—',
   x.coordinationRecords,x.evidenceStale?'ДА':'нет',x.status,(x.actions||[]).join(', ')]));
 const sourceConvergenceTable=rows(['Вводной','Отходящий','Ik,max ввода, кА','Ik,max линии, кА',
  'Сравнимость исходных условий','Статус'],
  (sections.faultSourceConvergence?.rows||[]).map(x=>[x.incomingId,x.branchId,
   x.incomingIkMaxKa??'—',x.branchIkMaxKa??'—',x.sourceConditions,x.status]));
 const groupMergeTable=rows(['Категория','Фаза','Сохраняемый ID цепи',
  'Объединяемые цепи','Установленная мощность, кВт','Потребителей'],
  (sections.consumerMerge?.proposals||[]).map(x=>[x.category,x.phase,
   x.targetCircuitId,(x.sourceCircuitIds||[]).join(', '),x.totalKw,x.consumerCount]));
 const groupSplitTable=rows(['Исходная цепь','Мощность, кВт','Групп после разделения','Состав предложенных групп'],
  (sections.consumerGrouping?.proposals||[]).map(x=>[
   x.circuitId,x.originalTotalKw,x.groups.length,
   x.groups.map(g=>g.consumerIds.join(', ')+' ('+g.connectedKw+' кВт)').join(' / ')]));
 const designStageTable=rows(['Область','Применимость'],
  (sections.designStageScope?.items||[]).map(x=>[x.code,x.status]));
 const workflowRows=rows(['Цепь','Назначение','Фаза','кВт','Ib, А',
  'Происхождение Ib','Выбранный артикул','Предлагаемый артикул',
  'Состояние предварительного расчёта'],
  (sections.workflowPreview?.rows||[]).map(x=>[x.lineId,x.name,x.phase??'—',
   x.powerKw??'—',x.ibA??'—',x.ibSource,x.selectedSku??'—',
   x.proposedSku??'—',x.calculationStatus]));
 const protectionDecisionRows=sections.protectionDecision?.rows||[];
 const protectionDecisionTable=rows(['Цепь','Артикул','Ib≤In','In≤Iz','Ikmax≤Icn',
  'Ik,max, кА','Icn, кА','Ik,min, А','Времятоковая огибающая',
  'Ограничение времени ADS','Общий статус','Незакрытые замечания'],
  protectionDecisionRows.map(x=>[x.lineId,x.sku??'—',x.currentChecks?.ibVsIn??'UNKNOWN',
   x.currentChecks?.inVsIz??'UNKNOWN',x.breaking?.status??'UNKNOWN',
   x.breaking?.ikMaxKa??'—',x.breaking?.icnKa??'—',
   x.minimum?.ikMinA??'—',x.minimum?.tripTimeStatus??'UNKNOWN',
   x.minimum?.allowedTimeStatus??'UNKNOWN',x.status,
   (x.issues||[]).map(i=>i.code).join('; ')]));
 const cableOverloadTable=rows(['Цепь','Артикул','Ib, A','In, A','Iz исходный, A','Коэффициенты','Iz скорр., A',
  'Iz для проверки, A','I2, A','1,45 Iz, A','Запас I2, A','Ib≤In','In≤Iz','I2≤1,45Iz','Источники и замечания'],
  protectionDecisionRows.map(x=>{
   const d=x.overloadCoordination||{},f=(d.factors||[]).map(t=>t.id+'='+t.value+' ('+(t.source??'без источника')+')').join('; ');
   return [x.lineId,x.sku??'—',d.ibA??'—',d.inA??'—',d.baseIzA??'—',f,
    d.correctedIzA??'—',d.comparisonIzA??'—',d.i2A??'—',d.i2LimitA??'—',
    d.marginA??'—',d.ibInStatus??'UNKNOWN',d.inIzStatus??'UNKNOWN',
    d.i2IzStatus??'UNKNOWN',
    [d.baseIzSource,d.i2Source,d.i2Standard,d.applicabilitySource,
      ...(d.issues||[]).map(z=>z.code)].filter(Boolean).join('; ')];
  }));
 const cableThermalTable=rows(['Цепь','Роль','Материал','Сечение, мм²','k, А√с/мм²',
  'Модель КЗ','Точка','Ток, А','Время, с','I²t, А²с','k²S², А²с','Запас, А²с',
  'Минимальное S, мм²','Численный результат','Источники и замечания'],
  protectionDecisionRows.map(x=>{
   const d=x.shortCircuitThermal||{},r=d.sourceReferences||{};
   return [x.lineId,d.conductorRole??'—',d.conductorMaterial??'—',
    d.sectionMm2??'—',d.kA_SqrtS_PerMm2??'—',d.faultModel??'—',
    d.comparisonPoint??'—',d.faultCurrentA??'—',d.clearingTimeS??'—',
    d.faultEnergyA2s??'—',d.conductorCapacityA2s??'—',d.energyMarginA2s??'—',
    d.minimumSectionMm2??'—',d.numericalStatus??'UNKNOWN',
    [r.k,r.time,r.current,r.conductor,r.method,...(d.issues||[]).map(i=>i.code)]
     .filter(Boolean).join('; ')];
  }));
 const letThroughTable=rows(['Цепь','Аппарат','Точка КЗ','Модель КЗ','Ik ожидаемый, А',
  'Диапазон подтверждения, А','Гарантированный максимум I²t, А²с',
  'Допустимое k²S², А²с','Запас энергии, А²с','Минимальное сечение, мм²',
  'Результат','Запись паспорта','Место в источнике','Источники и замечания'],
  protectionDecisionRows.map(x=>{
   const d=x.breakerLetThrough||{},b=d.matchedBand||{},r=d.sourceReferences||{},ev=d.evidenceBinding||{};
   return [x.lineId,x.sku??'—',d.comparisonPoint??'—',d.faultModel??'—',
    d.prospectiveCurrentA??'—',b.minProspectiveA===undefined?'—':
    b.minProspectiveA+' — '+b.maxProspectiveA,
    d.letThroughUpperBoundA2s??'—',d.conductorCapacityA2s??'—',
    d.energyMarginA2s??'—',d.minimumSectionMm2??'—',
    d.numericalStatus??'UNKNOWN',ev.recordId??'—',ev.documentLocation??'—',
    [r.manufacturer,r.conditions,r.cable,r.k,
      b.source,...(d.issues||[]).map(i=>i.code)].filter(Boolean).join('; ')];
  }));
 const manufacturerEvidenceTable=rows(['Запись','Изготовитель','Серия',
  'Заводской артикул','Документ','Редакция','URL документа','Место в документе',
  'Дата просмотра','Просмотрел','Тип источника','Статус'],
  (sections.manufacturerEvidence?.records||[]).map(r=>[
   r.id,r.manufacturerName??'—',r.series??'—',r.manufacturerSku??'—',
   r.documentTitle??'—',r.documentRevision??'—',r.documentUrl??'—',
   r.documentLocation??'—',r.reviewedAt??'—',r.reviewedBy??'—',
   r.sourceType??'—',r.approval??'NOT_ESTABLISHED']));
 const manufacturerFactTable=rows(['Цепь','Аппарат в каталоге','Изготовитель','Артикул',
  'Источник','Место в источнике','Проверенные поля','Отсутствуют в каталоге',
  'Противоречия','Не подтверждено данным источником','Статус'],
  (sections.manufacturerFacts?.rows||[]).map(x=>[
   x.lineId,x.catalogKey??'—',x.manufacturer??'—',x.sku??'—',
   x.sourceUrl??'Нет источника',x.sourceLocation??'—',
   (x.matchedFields||[]).join(', '),(x.missingFields||[]).join(', '),
   (x.conflictingFields||[]).join(', '),(x.unavailableClaims||[]).join(', '),
   x.status]));
 const faultReconciliationTable=rows(['Цепь','Общий расчётный пункт','Ручной Ik, кА','Расчётный Ik,max, кА','Разность, кА','Разность, %','Статус сверки'],
  designReview.filter(x=>x.faultCurrentComparison).map(x=>{
   const c=x.faultCurrentComparison;
   return [x.lineId,c.scope==='SAME_POINT_SAME_FAULT_MODEL'?'Заявлено совпадение':'Не установлено',
    c.manualIkKa??'—',c.computedIkKa??'—',c.differenceKa??'—',
    c.differencePercent??'—',c.status];
  }));
 const cableReference=sections.cableReference?.rows||[];
 const cableReferenceTable=rows(['Цепь','Ib, A','In, A','Способ','Справочное сечение, мм²','Статус'],cableReference.map(x=>[x.lineId,x.report?.ibA,x.report?.inA,x.report?.installationMethod,x.report?.smallestReferenceCandidate?.sectionMm2,x.report?.status]));
 const loadCurrent=sections.loadCurrent?.rows||[];
 const loadCurrentTable=rows(['Цепь','Ib, A','Источник Ib','Режим','Формула','Исходные данные','Статус','Повторная проверка'],loadCurrent.map(x=>[x.lineId,x.ibA,x.source||'Не указан',x.calculation?.mode||'Не рассчитан',x.calculation?.formula||'',x.calculation?.inputs?JSON.stringify(x.calculation.inputs):'',x.status||'UNKNOWN',x.reviewRequired?'Требуется':'Не заявлена']));
 const catalogueEvidence=sections.catalogEvidence?.items||[];
 const catalogueEvidenceTable=rows(['Использует','Артикул проекта','Артикул производителя','Производитель','Серия','Ширина, мм','Высота, мм','Глубина, мм','Конфигурация полюсов','Документ','Источник','Страница производителя','Дата сверки','Подтверждение','Icn, кА','Icn: напряжение, В','Стандарт Icn','Icu, кА','Icu: напряжение, В'],
  catalogueEvidence.map(x=>[x.role==='circuit'?x.ownerId:'УЗО '+x.ownerId,x.articleId,x.sku,
   x.manufacturer,x.series,x.widthMm??'—',x.heightMm??'—',x.depthMm??'—',
   x.poleConfiguration||'Не указана',x.source||'Отсутствует',
   x.sourceType||'Не указан',x.productSource||'Не указана',x.sourceReviewedAt||'Не записано',
   x.verificationStatus==='VERIFIED'?'Заявлено VERIFIED, отдельная проверка необходима':'Не подтверждено',
   x.icnKa??'—',x.icnVoltageV??'—',x.icnStandard||'—',x.icuKa??'—',x.icuVoltageV??'—']));
 const evidence=sections.designEvidence?.items||[];
 const evidenceTable=rows(['Раздел','Статус','Обоснование'],
  evidence.map(x=>[x.area,x.status,x.reason]));
 const status=bundle?.overallStatus||'BLOCKED';
 const circuitTable=rows(['Цепь','Название','Фаза','Артикул','DIN','Статус проверки'],
  dossier.map(x=>[x.circuitId,x.name,x.phase,x.sku||'Не выбран',
   x.placement?'DIN '+x.placement.rail+' · '+x.placement.from+'–'+x.placement.to:'Не размещено',
   x.calculationReviewRequired?'Требуется перепроверка':'Не подтверждено']));
 const protectionTable=rows(['Цепь','Ib, A','Iz, A','Ik, кА','Напряжение сети, В','Артикул','Тип','Изготовитель','In, A','Icn, кА','Напряжение Icn, В','Стандарт Icn','Icu, кА','Напряжение Icu, В','Конфигурация полюсов','IΔn, мА','Тип дифзащиты','Источник','Статус','Причины'],
  protection.map(x=>[x.lineId,x.ibA,x.izA,x.ikKa,x.voltageV??'Не указано',x.selectedSku,x.selectedArticle?.kind,
   x.selectedArticle?.maker,x.selectedArticle?.inA,x.selectedArticle?.icnKa,
   x.selectedArticle?.icnVoltageV??'—',x.selectedArticle?.icnStandard||'—',
   x.selectedArticle?.icuKa??'—',x.selectedArticle?.icuVoltageV??'—',
   x.selectedArticle?.poleConfiguration||'Не указана',
   x.selectedArticle?.residualCurrentMa??'—',x.selectedArticle?.residualType||'—',
   x.selectedArticle?.source||'Не подтверждён',x.status,(x.reasons||[]).join(', ')]));
 const candidateRankingTable=rows(['Цепь','Артикул','Класс рассмотрения',
  'Ik для сравнения, кА','Источник Ik','Модель КЗ','Точка КЗ',
  'Запас In−Ib, А','Запас Iz−In, А','Запас Icn−Ik, кА','Запас Uном−Uсети, В',
  'Источники и недостающие доказательства'],
  protection.flatMap(p=>(p.ranking?.rows||[]).map(c=>[
   p.lineId,c.catalogKey,c.classification,c.ikComparedKa??'—',
   c.ikComparisonSource??'MANUAL_OR_MISSING',c.calculatedFaultModel??'—',
   c.calculatedFaultPoint??'—',c.currentHeadroomA??'—',
   c.cableHeadroomA??'—',c.breakingHeadroomKa??'—',c.voltageHeadroomV??'—',
   c.openEvidence.join('; ')])));
 const selectionTable=rows(['Цепь','Арифметически возможные артикулы','Количество'],
  (sections.protectionSelection?.results||[]).map(x=>[x.lineId,(x.potential||[]).join(', '),(x.potential||[]).length]));
 const bomTable=rows(['Артикул','Производитель','Серия','Количество','Модули','Ширина, мм','Высота, мм','Глубина, мм','Полюса','Icn, кА','Icn, В','Стандарт Icn','Icu, кА','Icu, В','IΔn, мА','Тип дифзащиты','Источник','Дата сверки'],
  bom.map(x=>[x.sku,x.maker,x.series,x.quantity,x.modules,
   x.widthMm??'—',x.heightMm??'—',x.depthMm??'—',x.poleConfiguration||'Не указана',
   x.icnKa??'—',x.icnVoltageV??'—',x.icnStandard||'—',x.icuKa??'—',x.icuVoltageV??'—',x.residualCurrentMa??'—',
   x.residualType||'—',x.source||'Не указан',x.sourceReviewedAt||'Не записано']));
 const capacity=sections.cabinetCapacity||{};
 const capacityRows=rows(['Вместимость','Вариант','Ряды','Модулей на DIN','Резерв','Полезная ширина (предв.), мм',
  'Полезная высота (предв.), мм','Полезная глубина (предв.), мм',
  'Кабельный коридор на ряд, мм','Резерв клемм, мм','Ограничения'],
  (capacity.options||[]).filter(o=>o.status!=='BLOCKED').slice(0,16).map(o=>[
   o.capacityModules,({TALL:'Высокий',BALANCED:'Сбалансированный',WIDE:'Широкий',ONLY:'Единственный'}[o.orientation]||'Не определён'),o.railCount,o.modulesPerRail,o.reserveModules,
   o.envelope?.preliminaryUsableWidthMm??'—',
   o.envelope?.preliminaryUsableHeightMm??'—',
   o.envelope?.preliminaryUsableDepthMm??'НЕИЗВЕСТНА',
   o.envelope?.spacePlan?.wiringCorridorPerRailMm??'—',
   o.envelope?.spacePlan?.terminalReserveMm??'—',
   o.withinDeclaredLimits===false?'Превышены':'Требует проверки'
  ]));
 const boardTable=rows(['Аппарат','Рейка','Начало','Модули','Артикул'],
  board.map(x=>[x.deviceId,x.railIndex+1,x.startModule+1,x.modules,x.article||'Не выбран']));
 const crossTable=rows(['Уровень','Код','Цепь'],cross.map(x=>[x.level,x.code,x.lineId||'Проект']));
 const issueTable=rows(['Раздел','Уровень','Код','Цепь'],allIssues.map(x=>[x.section,x.level,x.code,x.circuitId||'Проект']));
 const singleLineTable=rows(['Элемент','ID','Назначение','Фаза','Артикул','Тип','Напряжение сети, В','Полюса','Напряжение Icn, В','Стандарт Icn','IΔn, мА','Тип дифзащиты','Группа/аппарат','Ib A','Iz A','Ik кА','Повторная проверка'],
  singleLine.map(x=>[x.type,x.lineId||x.id,x.name,x.phase,x.sku,x.article?.kind||'',
   x.design?.voltageV??'Не указано',
   x.article?.poleConfiguration||'Не указана',x.article?.icnVoltageV??'—',x.article?.icnStandard||'—',
   x.article?.residualCurrentMa??'—',x.article?.residualType||'—',
   x.branchId||x.templateId,x.design?.ibA??'',x.design?.izA??'',x.design?.ikKa??'',
   x.design?.calculationReviewRequired||x.design?.loadCurrentStale?'Требуется':'Не заявлена']));
 const neutralPairTable=rows(['N-шина 1','N-шина 2','Статус','Путь по модели'],
  neutralPairs.map(x=>[x.fromBus,x.toBus,x.status,(x.path||[]).join(' → ')]));
 const neutralTable=rows(['Цепь','Группа УЗО','Ожидаемая N','Заявленная N','PE','Статус'],
  neutral.map(x=>[x.lineId,x.groupId||'Без УЗО',x.expectedBus,x.declaredBus,x.protectiveBus,x.status]));
 const wiringTable=rows(['Цепь','Роль','От','До','Статус','Клеммы по модели'],
  wiring.flatMap(x=>(x.connections||[]).map(c=>[x.lineId,c.role,c.from,c.to,c.status,(c.path||[]).join(' → ')])));
 const oneLineSvg=typeof epSingleLineSvgV1==='function'&&sections.singleLine?
  epSingleLineSvgV1(sections.singleLine):'';
 const style='body{font:13px/1.45 Arial,sans-serif;color:#20252b;margin:32px auto;max-width:1100px;padding:0 18px}'+
 'h1{font-size:26px}h2{margin-top:28px;border-bottom:2px solid #bbb;padding-bottom:5px}'+
 'table{width:100%;border-collapse:collapse;margin:12px 0 20px;font-size:11px;table-layout:fixed}'+
 'th,td{border:1px solid #aeb7c1;padding:5px;vertical-align:top;overflow-wrap:anywhere}'+
 'th{background:#edf1f5}.warning{border:2px solid #bd6c27;padding:12px;font-weight:bold}'+
 '.ep-single-line-scroll{overflow:hidden}.ep-single-line-scroll svg{max-width:100%;height:auto}'+
 '@page{size:A4 landscape;margin:13mm}@media print{body{margin:0;padding:0}h2{break-after:avoid}tr{break-inside:avoid}}';
 return '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
  '<title>'+esc(bundle?.projectTitle||'Проект')+' · DRAFT</title><style>'+style+'</style></head><body>'+
  '<h1>Инженерный отчёт · ЧЕРНОВИК</h1>'+
  '<p>Проект: '+esc(bundle?.projectTitle||'Без названия')+' · Состояние: '+esc(status)+'</p>'+
  '<p class="warning">НЕ ДЛЯ МОНТАЖА. Электрическая безопасность, нормативное соответствие, паспортные данные и физическая компоновка не подтверждены.</p>'+
  '<h2>Единый предварительный маршрут: нагрузки, токи и аппараты</h2>'+workflowRows+
  '<p>Предварительные предложения аппаратов не являются утверждённой спецификацией. Параметры источника и потребителей задаёт инженер.</p>'+
  '<h2>Предложение объединения черновых цепей по категориям инженера</h2>'+groupMergeTable+
  '<p>Категории указаны инженером. Подбор защиты и кабелей после объединения требуется выполнить отдельно.</p>'+
  '<h2>Предварительное разбиение потребителей по введённому пределу</h2>'+groupSplitTable+
  '<p>Перегруппировка не назначает электрическую защиту и не меняет общие УЗО без инженерного решения.</p>'+
  '<h2>Стадия и применимость проектных проверок</h2>'+designStageTable+
  '<h2>Варианты вместимости и предварительной компоновки корпуса</h2>'+capacityRows+
  '<p>Это не паспортные размеры конкретного щита. Приведён только расчёт полезного монтажного пространства с условными отступами. Кабельные вводы, температурный режим, аппараты и конструкция корпуса требуют проверки.</p>'+
  '<h2>Ведомость цепей</h2>'+circuitTable+
  '<h2>Изменения аппаратов · обязательная повторная проверка</h2>'+replacementTable+
  '<h2>Связи защитных аппаратов · топология, селективность не доказана</h2>'+protectionTopologyTable+protectionTopologyIssues+
  '<h3>Связь с идентификаторами аппаратов и артикулами — предварительно</h3>'+protectionChainTable+
  '<p>Топология — лишь проверка объявленных связей. Для селективности нужны применимые заводские таблицы или времятоковые данные и отдельная проверка сценариев КЗ.</p>'+
  '<h2>Единая проверка защиты · числовые нарушения и неполные данные</h2>'+protectionDecisionTable+
  '<h3>Защита кабеля от перегрузки · подтверждение I2 и поправок Iz</h3>'+cableOverloadTable+
  '<h3>Термическая стойкость проводника при КЗ · адиабатическая проверка</h3>'+cableThermalTable+
  '<h3>Энергия пропускания аппарата · подтверждённый диапазон изготовителя</h3>'+letThroughTable+
  '<h3>Сверка каталога с опубликованными первичными характеристиками</h3>'+
  manufacturerFactTable+
  '<p>Совпадение опубликованных характеристик не подтверждает I²t, I2, время отключения, условия применения или соответствие проекта. Источники требуют проверки редакции и актуальности.</p>'+
  '<h3>Реестр паспортных документов и границ их применения</h3>'+manufacturerEvidenceTable+
  '<p>Реестр подтверждает факт документирования входных данных, а не подлинность документа или соответствие оборудования нормам.</p>'+
  '<p>Огибающая I²t используется только в заявленных пределах испытаний и не интерполируется. Источники и применимость требуют независимого подтверждения.</p>'+
  '<p>Расчёт I²t и k²S² применим только к объявленному сценарию и подтверждённому времени отключения; нормативная пригодность не установлена.</p>'+
  '<p>Проверки не подтверждают соответствие требованиям и не заменяют проверку паспортов, температурных условий, тока КЗ, норм и селективности.</p>'+
  '<h2>Предварительный подбор защиты</h2>'+protectionTable+
  '<h3>Порядок проверки возможных защитных аппаратов · без автоматического допуска</h3>'+candidateRankingTable+
  '<h2>Арифметический перечень возможных MCB и RCBO (не допуск)</h2>'+selectionTable+
  '<h2>Минимальный ток замыкания L–PE (TN)</h2>'+rows(['Цепь','Zs, Ом','Ik,min, А','Ia, А','Время, с','Сравнение'],(sections.faultRoutes?.rows||[]).map(x=>[x.lineId,x.zsOhm,x.ikMinA,x.iaA,x.requiredTimeS,x.thresholdStatus]))+
  '<h2>Основание времени автоматического отключения · область применения</h2>'+
  rows(['Цепь','Класс цепи','Условие защиты','Предельное время, с','Заявленное время, с',
   'Запас, с','Численное сравнение','Стандарт и пункт','Основание времени','Основание класса','Замечания'],
   (sections.faultRoutes?.rows||[]).map(x=>{
    const c=x.disconnectionContext||{};
    return [x.lineId,c.circuitClass??'Не заявлен',c.protectiveMeasure??'—',
     c.maxAllowedTimeS??'—',c.declaredTimeS??'—',c.timeMarginS??'—',
     c.numericalStatus??'UNKNOWN',c.standardReference??'Не указан',
     c.timeBasisSource??'Не указан',c.circuitClassSource??'Не указан',
     (c.issues||[]).map(i=>i.code).join('; ')];
   }))+
  '<p>Предельное время не выбирается автоматически по нормативным таблицам. Источник, редакция и применимость заявлены проектировщиком; численное соответствие не является допуском.</p>'+
  '<h2>Паспортная огибающая времени отключения · только заявленные точки</h2>'+
  rows(['Цепь','Паспортный источник','Ik,min, А','Требуемое время, с','Ток гарантированного отключения, А','Верхняя граница времени, с','Численная проверка','Замечания'],
   (sections.faultRoutes?.rows||[]).map(x=>[x.lineId,x.tripEnvelope?.manufacturerSource??'Не указан',
    x.tripEnvelope?.ikMinA??'—',x.tripEnvelope?.requiredTimeS??'—',
    x.tripEnvelope?.requiredCurrentA??'—',x.tripEnvelope?.guaranteedMaxTimeS??'—',
    x.tripEnvelope?.numericalStatus??'UNKNOWN',
    (x.tripEnvelope?.issues||[]).map(i=>i.code).join('; ')]))+
  '<p>Гарантированное максимальное время применяется без интерполяции только для заявленных паспортных точек. Нормативная пригодность и условия срабатывания должны проверяться отдельно.</p>'+
  '<h2>Максимальный заявленный ток КЗ · независимая расчётная модель</h2>'+
  rows(['Цепь','Модель','Напряжение, В','cmax','R, Ом','X, Ом','|Z|, Ом','Ik,max, кА','Icn, кА','Арифметическое сравнение','Статус'],
   (sections.faultRoutes?.rows||[]).map(x=>[x.lineId,x.maximum?.model??'Не выбран',
    x.maximum?.voltageV??'—',x.maximum?.cmax??'—',x.maximum?.rOhm??'—',
    x.maximum?.xOhm??'—',x.maximum?.impedanceOhm??'—',
    x.maximum?.ikMaxKa??'—',x.maximum?.icnKa??'—',
    x.maximum?.numericComparison??'Не проверено',x.maximum?.thresholdStatus??'UNKNOWN']))+
  '<h3>Эквивалент трансформатора · исходные параметры и происхождение</h3>'+
  rows(['Цепь','S, кВА','ULL, В','uk, %','Потери КЗ, Вт','Rt, Ом','Xt, Ом','R сети до Т, Ом','X сети до Т, Ом','Источник трансформатора','Источник сети','Основание потерь'],
   (sections.faultRoutes?.rows||[]).filter(x=>x.maximum?.sourceModel==='TRANSFORMER_WITH_UPSTREAM').map(x=>{
    const t=x.maximum.transformer||{};
    return [x.lineId,t.ratedPowerKva??'—',t.ratedVoltageV??'—',t.ukPercent??'—',
     t.loadLossW??'—',t.transformerROhm??'—',t.transformerXOhm??'—',
     t.upstreamROhm??'—',t.upstreamXOhm??'—',t.source??'Не указан',
     t.upstreamSource??'Не указан',
     t.lossBasisConfirmed?'Заявлено':'Не подтверждено'];}))+
  '<p>Расчёт Ik,max и сравнение с Icn не являются подтверждением соответствия требованиям без проверенных исходных данных, применимости стандарта и паспортов.</p>'+
  '<h2>Сравнение максимального КЗ: вводной и отходящая линия</h2>'+sourceConvergenceTable+
  '<p>Сравнение допустимо только при одинаковой явно заявленной базе источника, одинаковых ULL/cmax и модели трёхфазного КЗ; достоверность питания и селективность не доказаны.</p>'+
  '<h2>Матрица недостающих инженерных данных по аппаратам</h2>'+evidenceMatrixTable+
  '<h2>Ток КЗ на вводных аппаратах из R/X и трансформатора</h2>'+incomingMaxTable+
  '<p>Область расчёта: точка вводного аппарата с явно приведённым импедансом источника. Истинность исходных данных и паспортов требует инженерного подтверждения.</p>'+
  '<h2>Расчётные точки аппаратов: существующий движок R/X</h2>'+calculatedFaultTable+
  '<p>Расчётные точки должны соответствовать заданным местам установки аппаратов. Селективность и нормативная пригодность не подтверждаются автоматически.</p>'+
  '<h2>Изготовитель: документированные пары селективности и резервной защиты</h2>'+coordinationTable+
  '<p>Ни один документ сам по себе не превращает предварительную проверку в нормативный допуск. Типы данных не взаимозаменяемы.</p>'+
  '<h2>Исследования максимального тока КЗ в точках защитных аппаратов</h2>'+deviceFaultTable+
  '<p>Только заявленные точки, источники и редакции. Даже положительное численное сравнение не доказывает нормативную пригодность или селективность.</p>'+
  '<h2>Питание между конкретными аппаратами · версия 1</h2>'+deviceSupplyTable+
  '<h3>Сверка питания с прежними схемами проводников</h3>'+crossFeedTable+
  '<h3>Привязки вводных аппаратов к терминальной модели</h3>'+incomingBindingsTable+
  '<h3>Сверка с терминальной моделью и заявленными проводами</h3>'+supplyTerminalTable+
  '<p>Связи введены пользователем и не подтверждают физическое соединение или селективность.</p>'+
  '<h2>Декларативная модель источника, аппаратов и проводников</h2>'+supplyEdgesTable+
  '<p>Граф не доказывает физическую непрерывность, идентификацию клемм, селективность или пригодность к монтажу.</p>'+
  '<h2>DIN-компоновка</h2>'+boardTable+
  '<h2>Спецификация оборудования</h2>'+bomTable+
  '<h2>Паспортные данные выбранного оборудования · источники и ограничения</h2>'+catalogueEvidenceTable+
  '<h2>Очередь инженерных задач</h2>'+workQueueTable+
  '<h2>Сверка исходных токов КЗ · только при явно совпадающем сценарии</h2>'+faultReconciliationTable+
  '<h2>Матрица проектных расчётов</h2>'+designReviewTable+
  '<h2>Справочные сечения проводников</h2>'+cableReferenceTable+
  '<h2>Расчёт тока нагрузки</h2>'+loadCurrentTable+
  '<h2>Доказательная база проектных решений</h2>'+evidenceTable+
  '<h2>Однолинейная структура проекта (декларация)</h2>'+oneLineSvg+singleLineTable+
  '<h2>Разделение нейтралей УЗО и PE</h2>'+neutralTable+
  '<h2>Проверка соединений между N-шинами</h2>'+neutralPairTable+
  '<h2>Заявленные проводники и клеммы</h2>'+wiringTable+
  '<h2>Расхождения между представлениями</h2>'+crossTable+
  '<h2>Все инженерные замечания</h2>'+issueTable+
  '<h2>Статусы инженерных разделов</h2>'+rows(['Раздел','Статус'],Object.entries(bundle?.statuses||{}))+
  '<p>Источник: локальный проект Electropanel. Отчёт отражает только сохранённые и заявленные данные; требуется независимая инженерная проверка.</p></body></html>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epEngineeringPrintV1};
