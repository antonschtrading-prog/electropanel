'use strict';
// Read-only circuit-level conductor path explorer. Never invents device contact continuity.
function epCircuitWiringTraceHtmlV1(report,selectedId=null){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.rows))
  return '<p>Прослеживаемость проводов недоступна. Проверка не выполнена.</p>';
 const rows=report.rows.filter(x=>selectedId===null||x.lineId===selectedId);
 const cards=rows.slice(0,100).map(row=>{
  const paths=row.connections.slice(0,100).map(link=>'<tr><td>'+esc(link.group)+'</td><td>'+
   esc(link.role||'—')+'</td><td>'+esc(link.from)+'</td><td>'+esc(link.to)+'</td><td>'+
   esc(link.status)+'</td><td>'+esc(link.code)+'</td><td>'+esc(link.path.join(' → ')||'—')+'</td></tr>').join('');
  return '<details class="ep-wire-circuit"'+(selectedId===row.lineId?' open':'')+'><summary>'+
   esc(row.lineId)+' · '+esc(row.status)+' · заявленных путей '+row.declaredPaths+
   ', блокировок '+row.blocked+', неопределённостей '+row.unknown+'</summary>'+
   '<div style="overflow-x:auto"><table><thead><tr><th>Связь</th><th>Роль</th><th>От</th><th>До</th>'+
   '<th>Статус</th><th>Причина</th><th>Клеммы по модели</th></tr></thead><tbody>'+
   (paths||'<tr><td colspan="7">Связи цепи не объявлены</td></tr>')+'</tbody></table></div></details>';
 }).join('');
 return '<section class="ep-wire-trace" aria-label="Прослеживаемость проводников"><h3>Проводники L/N/PE · заявленная схема</h3>'+
  '<p>Связей: '+esc(report.summary?.connections||0)+
  ' · заявленных непрерывных путей: '+esc(report.summary?.declaredPaths||0)+
  ' · блокировок: '+esc(report.summary?.blocked||0)+
  ' · неопределённостей: '+esc(report.summary?.unknown||0)+
  '. Прохождение тока через контакты аппаратов и физический монтаж не подтверждены.</p>'+
  (cards||'<p>Цепи не выбраны или не заданы.</p>')+'</section>';
}
function epCircuitWiringTraceCsvV1(report){
 const q=x=>{let s=String(x??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 const rows=[['Цепь','Связь','Роль','От','До','Статус','Код','Путь по модели']];
 for(const row of report?.rows||[])for(const link of row.connections||[])
  rows.push([row.lineId,link.group,link.role,link.from,link.to,link.status,link.code,link.path.join(' -> ')]);
 return '\uFEFF'+rows.map(row=>row.map(q).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCircuitWiringTraceHtmlV1,epCircuitWiringTraceCsvV1};
