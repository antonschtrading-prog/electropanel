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
 const workQueue=sections.designWorkQueue?.items||[];
 const workQueueTable=rows(['Приоритет','Цепь','Задача','Раздел'],workQueue.map(x=>[x.priority,x.lineId,x.action,x.section]));
 const designReview=sections.designReview?.rows||[];
 const designReviewTable=rows(['Цепь','Ib A','In A','Iz A','Icn kA','Ik kA','Сечение мм²','ΔU %','Статус'],designReview.map(x=>[x.lineId,x.ibA,x.inA,x.izA,x.icnKa,x.ikKa,x.sectionMm2,x.voltageDrop?.dropPercent,x.status]));
 const cableReference=sections.cableReference?.rows||[];
 const cableReferenceTable=rows(['Цепь','Ib, A','In, A','Способ','Справочное сечение, мм²','Статус'],cableReference.map(x=>[x.lineId,x.report?.ibA,x.report?.inA,x.report?.installationMethod,x.report?.smallestReferenceCandidate?.sectionMm2,x.report?.status]));
 const loadCurrent=sections.loadCurrent?.rows||[];
 const loadCurrentTable=rows(['Цепь','Ib, A','Режим','Формула','Исходные данные'],loadCurrent.map(x=>[x.lineId,x.ibA,x.calculation?.mode||'Не рассчитан',x.calculation?.formula||'',x.calculation?.inputs?JSON.stringify(x.calculation.inputs):'']));
 const evidence=sections.designEvidence?.items||[];
 const evidenceTable=rows(['Раздел','Статус','Обоснование'],
  evidence.map(x=>[x.area,x.status,x.reason]));
 const status=bundle?.overallStatus||'BLOCKED';
 const circuitTable=rows(['Цепь','Название','Фаза','Артикул','DIN','Статус проверки'],
  dossier.map(x=>[x.circuitId,x.name,x.phase,x.sku||'Не выбран',
   x.placement?'DIN '+x.placement.rail+' · '+x.placement.from+'–'+x.placement.to:'Не размещено',
   x.calculationReviewRequired?'Требуется перепроверка':'Не подтверждено']));
 const protectionTable=rows(['Цепь','Ib, A','Iz, A','Ik, кА','Артикул','In, A','Icn, кА','Статус','Причины'],
  protection.map(x=>[x.lineId,x.ibA,x.izA,x.ikKa,x.selectedSku,x.selectedArticle?.inA,
   x.selectedArticle?.icnKa,x.status,(x.reasons||[]).join(', ')]));
 const bomTable=rows(['Артикул','Производитель','Серия','Количество','Модули','Источник'],
  bom.map(x=>[x.sku,x.maker,x.series,x.quantity,x.modules,x.source||'Не указан']));
 const boardTable=rows(['Аппарат','Рейка','Начало','Модули','Артикул'],
  board.map(x=>[x.deviceId,x.railIndex+1,x.startModule+1,x.modules,x.article||'Не выбран']));
 const crossTable=rows(['Уровень','Код','Цепь'],cross.map(x=>[x.level,x.code,x.lineId||'Проект']));
 const issueTable=rows(['Раздел','Уровень','Код','Цепь'],allIssues.map(x=>[x.section,x.level,x.code,x.circuitId||'Проект']));
 const singleLineTable=rows(['Элемент','ID','Назначение','Фаза','Артикул','Группа/аппарат'],
  singleLine.map(x=>[x.type,x.lineId||x.id,x.name,x.phase,x.sku,x.branchId||x.templateId]));
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
  '<h2>Ведомость цепей</h2>'+circuitTable+
  '<h2>Предварительный подбор защиты</h2>'+protectionTable+
  '<h2>DIN-компоновка</h2>'+boardTable+
  '<h2>Спецификация оборудования</h2>'+bomTable+
  '<h2>Очередь инженерных задач</h2>'+workQueueTable+
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
