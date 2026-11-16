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
 const issues=(audit?.issues||[]).map(x=>'<li>'+esc(x.level)+' · '+esc(x.code)+' · '+esc(x.objectId??'')+'</li>').join('');
 return '<details class="ep-fire-control"><summary>Пожарное управление · '+esc(summary)+'</summary>'+
 '<p>Внешняя пожарная система проектируется отдельно. Здесь задаются только сигналы, действия над потребителями и исполнительные интерфейсы щита. Результат — проектный черновик.</p>'+
 '<label for="fireControlJson">Сценарии управления (JSON)</label>'+
 '<textarea id="fireControlJson" rows="10" spellcheck="false">'+esc(JSON.stringify(raw,null,2))+'</textarea>'+
 '<div><button type="button" class="btn primary" id="fireControlApplyBtn">Проверить и сохранить</button> '+
 '<button type="button" class="btn" id="fireControlClearBtn">Очистить сценарии</button></div>'+
 '<table><thead><tr><th>Потребитель</th><th>Сигнал</th><th>Команда</th><th>Исполнитель</th><th>При потере сигнала</th></tr></thead><tbody>'+rows+'</tbody></table>'+
 '<h4>Трассировка управления (проектный черновик)</h4><table><thead><tr><th>Зона</th><th>Потребитель</th><th>Цепь</th><th>Клеммы</th><th>Питание управления</th><th>DIN</th></tr></thead><tbody>'+traceRows+'</tbody></table>'+ 
 '<h4>Исполнительные аппараты и DIN</h4><table><thead><tr><th>Действие</th><th>Аппарат</th><th>Артикул</th><th>Напряжение</th><th>Источник</th><th>DIN</th><th>Модули</th></tr></thead><tbody>'+designRows+'</tbody></table>'+ 
 '<ul>'+issues+designIssues+'</ul></details>';
}
if(typeof module!=='undefined')module.exports={epFireControlHtmlV1};
