'use strict';
// Draft-only UI: explicit engineer inputs, never inferred fire-system design.
function epFireControlHtmlV1(project){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const raw=project?.fireControlV1??{version:1,signals:[],actions:[]};
 const audit=typeof epFireControlAuditV1==='function'?epFireControlAuditV1(project,raw):null;
 const summary=audit?audit.status+' · '+audit.rows.length+' действий · '+audit.issues.length+' замечаний':'Модуль недоступен';
 const rows=(audit?.rows||[]).map(x=>'<tr><td>'+esc(x.loadId)+'</td><td>'+esc(x.signalId)+'</td><td>'+esc(x.action)+'</td><td>'+esc(x.actuator)+'</td><td>'+esc(x.onSignalLoss)+'</td></tr>').join('');
 const trace=typeof epFireControlTraceV1==='function'?epFireControlTraceV1(project):null;
 const traceRows=(trace?.rows||[]).map(x=>'<tr><td>'+esc(x.zoneId)+'</td><td>'+esc(x.consumerId)+'</td><td>'+esc(x.circuitId)+'</td><td>'+esc(x.terminalAssignment)+'</td><td>'+esc(x.controlPower)+'</td><td>'+esc(x.dinStatus)+'</td></tr>').join('');
 const design=typeof epFireControlDesignV1==='function'?epFireControlDesignV1(project):null;
 const designRows=(design?.rows||[]).map(x=>'<tr><td>'+esc(x.actionId)+'</td><td>'+esc(x.deviceId??'—')+'</td><td>'+esc(x.articleSku??'—')+'</td><td>'+esc(x.controlVoltageV??'—')+'</td><td>'+esc(x.controlSupplyId??'—')+'</td><td>'+esc(x.dinRailId??'—')+'</td><td>'+esc(x.moduleWidth??'—')+'</td></tr>').join('');
 const designIssues=(design?.issues||[]).map(x=>'<li>'+esc(x.level)+' · '+esc(x.code)+' · '+esc(x.objectId??'')+'</li>').join('');
 const schedule=typeof epFireControlScheduleV1==='function'?epFireControlScheduleV1(project):null;
 const bomRows=(schedule?.preliminaryBom||[]).map(x=>'<tr><td>'+esc(x.articleSku)+'</td><td>'+esc(x.actuator)+'</td><td>'+esc(x.quantity)+'</td><td>'+esc(x.reviewedQuantity)+'</td></tr>').join('');
 const catalog=typeof epFireCatalogReconcileV1==='function'?epFireCatalogReconcileV1(project):null;
 const din=typeof epFireDinReconcileV1==='function'?epFireDinReconcileV1(project):null;
 const catalogIssues=(catalog?.issues||[]).map(x=>'<li>'+esc(x.level)+' · '+esc(x.code)+'</li>').join('');
 const dinIssues=(din?.issues||[]).map(x=>'<li>'+esc(x.level)+' · '+esc(x.code)+'</li>').join('');
 const gate=typeof epFireControlGateV1==='function'?epFireControlGateV1(project):null;
 const gateRows=(gate?.checks||[]).map(x=>'<tr><td>'+esc(x.name)+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.issueCount)+'</td></tr>').join('');
 const checklist=typeof epFireControlChecklistV1==='function'?epFireControlChecklistV1(project):null;
 const checklistRows=(checklist?.checks||[]).map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+esc(x.scope)+'</td><td>'+esc(x.status)+'</td><td>'+esc(x.detail)+'</td></tr>').join('');
 const diagram=typeof epFireControlDiagramV1==='function'?epFireControlDiagramV1(project):null;
 const wiring=typeof epFireControlWiringV1==='function'?epFireControlWiringV1(project):null;
 const wiringDiagram=typeof epFireControlWiringDiagramV1==='function'?epFireControlWiringDiagramV1(project):null;
 const continuity=typeof epFireControlContinuityV1==='function'?epFireControlContinuityV1(project):null;
 const continuityRows=(continuity?.actions||[]).map(x=>'<tr><td>'+esc(x.actionId)+'</td><td>'+esc(x.wireCount)+'</td><td>'+esc(x.componentCount)+'</td><td>'+esc(x.reachablePins.join(', '))+'</td><td>'+esc(x.unreachablePins.join(', '))+'</td><td>Требуется проверка</td></tr>').join('');
 const wiringRows=(wiring?.connections||[]).map(x=>'<tr><td>'+esc(x.id)+'</td><td>'+esc(x.from)+'</td><td>'+esc(x.to)+'</td><td>'+esc(x.purpose)+'</td><td>'+esc(x.wireReference)+'</td></tr>').join('');
 const issues=(audit?.issues||[]).map(x=>'<li>'+esc(x.level)+' · '+esc(x.code)+' · '+esc(x.objectId??'')+'</li>').join('');
 return '<details class="ep-fire-control"><summary>Пожарное управление · '+esc(summary)+'</summary>'+
 '<p>Внешняя пожарная система проектируется отдельно. Здесь задаются только сигналы, действия над потребителями и исполнительные интерфейсы щита. Результат — проектный черновик.</p>'+
 '<label for="fireControlJson">Сценарии управления (JSON)</label>'+
 '<textarea id="fireControlJson" rows="10" spellcheck="false">'+esc(JSON.stringify(raw,null,2))+'</textarea>'+
 '<div><button type="button" class="btn primary" id="fireControlApplyBtn">Проверить и сохранить</button> '+
 '<button type="button" class="btn" id="fireControlClearBtn">Очистить сценарии</button> '+
 '<button type="button" class="btn" id="fireControlExportBtn">Выгрузить инженерный отчёт JSON</button> '+
 '<button type="button" class="btn" id="fireControlWiringCsvBtn">Ведомость управления CSV</button> '+
 '<button type="button" class="btn" id="fireControlBomCsvBtn">Спецификация CSV</button> '+
 '<button type="button" class="btn" id="fireControlChecklistCsvBtn">50 критериев CSV</button> '+
 '<button type="button" class="btn" id="fireControlSvgBtn">Логическая схема SVG</button> '+
 '<button type="button" class="btn" id="fireControlGraphCsvBtn">Связи схемы CSV</button> '+
 '<button type="button" class="btn" id="fireControlWiringSvgBtn">Соединения SVG</button> '+
 '<button type="button" class="btn" id="fireControlDeclaredWiresCsvBtn">Провода CSV</button> '+
 '<button type="button" class="btn" id="fireControlContinuityCsvBtn">Связность CSV</button></div>'+
 '<table><thead><tr><th>Потребитель</th><th>Сигнал</th><th>Команда</th><th>Исполнитель</th><th>При потере сигнала</th></tr></thead><tbody>'+rows+'</tbody></table>'+
 '<h4>Логическая схема интерфейса</h4><p>Не является монтажной схемой. Номера выводов аппаратов не определены.</p><div class="fire-diagram-preview" style="overflow-x:auto;max-height:430px;overflow-y:auto">'+(diagram?.svg||'Нет сценариев')+'</div>'+ 
 '<h4>Связность цепей управления (только по введённым проводам)</h4><p>Контакты, полярность, срабатывание и электрическая непрерывность не подтверждены.</p><table><thead><tr><th>Действие</th><th>Провода</th><th>Компоненты</th><th>Доступные выводы</th><th>Изолированные выводы</th><th>Статус</th></tr></thead><tbody>'+continuityRows+'</tbody></table>'+ 
 '<h4>Черновая схема соединений</h4><div style="overflow:auto;max-height:400px">'+(wiringDiagram?.svg||'Нет соединений')+'</div>'+ 
 '<h4>Соединения управления, введённые инженером</h4><p>Статус: '+esc(wiring?.status??'НЕДОСТУПЕН')+'</p><table><thead><tr><th>ID</th><th>От</th><th>К</th><th>Назначение</th><th>Провод</th></tr></thead><tbody>'+wiringRows+'</tbody></table>'+ 
 '<h4>Трассировка управления (проектный черновик)</h4><table><thead><tr><th>Зона</th><th>Потребитель</th><th>Цепь</th><th>Клеммы</th><th>Питание управления</th><th>DIN</th></tr></thead><tbody>'+traceRows+'</tbody></table>'+ 
 '<h4>Исполнительные аппараты и DIN</h4><table><thead><tr><th>Действие</th><th>Аппарат</th><th>Артикул</th><th>Напряжение</th><th>Источник</th><th>DIN</th><th>Модули</th></tr></thead><tbody>'+designRows+'</tbody></table>'+ 
 '<h4>Предварительная спецификация выбранных аппаратов</h4><table><thead><tr><th>Артикул</th><th>Тип</th><th>Количество</th><th>Проверено инженером</th></tr></thead><tbody>'+bomRows+'</tbody></table>'+ 
 '<h4>Согласование каталога и общей DIN-компоновки</h4><p>Каталог: '+esc(catalog?.status??'НЕДОСТУПЕН')+' · DIN: '+esc(din?.status??'НЕДОСТУПЕН')+'</p>'+ 
 '<h4>Инженерная проверка пожарного интерфейса</h4><p>Статус: '+esc(gate?.status??'НЕДОСТУПЕН')+'</p><table><thead><tr><th>Раздел</th><th>Статус</th><th>Замечания</th></tr></thead><tbody>'+gateRows+'</tbody></table>'+ 
 '<h4>50 критериев инженерной готовности</h4><p>Подтверждено '+esc(checklist?.passed??0)+' из '+esc(checklist?.total??0)+'</p><details><summary>Открыть контрольный лист</summary><table><thead><tr><th>Код</th><th>Раздел</th><th>Статус</th><th>Требование</th></tr></thead><tbody>'+checklistRows+'</tbody></table></details>'+ 
 '<ul>'+issues+designIssues+catalogIssues+dinIssues+'</ul></details>';
}
if(typeof module!=='undefined')module.exports={epFireControlHtmlV1};
