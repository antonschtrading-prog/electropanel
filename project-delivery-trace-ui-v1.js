'use strict';
function epProjectDeliveryTraceHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report)return '<section><h3>Сквозная трассировка проекта</h3><p>Нет данных.</p></section>';
 const rows=(report.rows||[]).slice(0,400).map(x=>'<tr>'+
  '<td>'+esc(x.lineId)+'</td><td>'+esc(x.name)+'</td><td>'+esc(x.consumerCount)+'</td>'+
  '<td>'+esc(x.articleSku||'Не выбран')+'</td>'+
  '<td>'+esc(x.workflow?'Есть':'Нет')+'</td>'+
  '<td>'+esc(x.schematic?'Есть':'Нет')+'</td>'+
  '<td>'+esc(x.board?('Ряд '+(x.board.railIndex+1)+', модуль '+(x.board.startModule+1)):'Нет')+'</td>'+
  '<td>'+esc(x.bom?'Есть':'Нет')+'</td>'+
  '<td>'+esc(x.crossViewStatus)+'</td></tr>').join('');
 const issues=(report.issues||[]).slice(0,30).map(x=>'<li>'+esc(x.code)+(x.lineId?' — '+esc(x.lineId):'')+'</li>').join('');
 return '<section class="card" id="projectDeliveryTracePanel"><h3>Сквозная трассировка проекта</h3>'+
  '<p>Нагрузки → расчёт → схема → DIN → спецификация. Только проектные данные; статус: <strong>'+esc(report.status)+'</strong>. Не является разрешением к монтажу.</p>'+
  '<div style="overflow:auto"><table><thead><tr><th>Линия</th><th>Наименование</th><th>Потребители</th><th>Артикул</th><th>Расчёт</th><th>Схема</th><th>DIN</th><th>Спецификация</th><th>Статус</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
  '<p>Проверок, требующих внимания: '+esc((report.issues||[]).length)+'</p>'+
  '<details><summary>Замечания</summary><ul>'+issues+'</ul></details>'+
  '<button type="button" class="btn" id="projectDeliveryTraceCsvBtn">Трассировка CSV</button></section>';
}
function epProjectDeliveryTraceCsvV1(report){
 const q=x=>'"'+String(x??'').replace(/"/g,'""').replace(/^[=+@-]/,v=>"'"+v)+'"';
 const rows=[['line_id','name','consumer_count','article_sku','workflow','single_line','board_rail','board_start','bom','status']];
 for(const r of report?.rows||[])rows.push([r.lineId,r.name,r.consumerCount,r.articleSku,
  !!r.workflow,!!r.schematic,r.board?.railIndex??'',r.board?.startModule??'',!!r.bom,r.crossViewStatus]);
 return {schema:'electropanel.project.delivery-trace.csv.1',status:report?.status??'UNKNOWN',
  csv:rows.map(row=>row.map(q).join(';')).join('\r\n')+'\r\n',
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epProjectDeliveryTraceHtmlV1,epProjectDeliveryTraceCsvV1};
