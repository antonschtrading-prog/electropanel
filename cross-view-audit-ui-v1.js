'use strict';
// Read-only navigation over cross-view issues; no compliance claims.
function epCrossViewAuditHtmlV1(report,selectedId=null){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.issues))
  return '<p>Сквозная проверка недоступна. Данные не подтверждены.</p>';
 const blockers=report.issues.filter(x=>x.level==='BLOCKED').length;
 const unknown=report.issues.length-blockers;
 const rows=report.issues.slice(0,150).map(x=>{
  const id=x.lineId===null||x.lineId===undefined?'':String(x.lineId);
  const action=id?'<button class="btn tiny" type="button" data-crossview-focus="'+esc(id)+'">Открыть цепь</button>':'—';
  return '<tr'+(id&&id===selectedId?' class="ep-circuit-active"':'')+'><td>'+esc(x.level)+
   '</td><td>'+esc(x.code)+'</td><td>'+esc(id||'Проект')+'</td><td>'+action+'</td></tr>';
 }).join('');
 return '<section class="ep-crossview-panel" aria-label="Согласованность инженерных представлений">'+
  '<h3>Согласованность цепей, DIN и спецификации · черновик</h3>'+
  '<p>Статус: '+esc(report.status)+' · цепей: '+esc(report.checkedCircuits||0)+
  ' · блокирующих: '+blockers+' · неопределённостей: '+unknown+
  '. Совпадение данных не подтверждает электрическую безопасность.</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Уровень</th><th>Проблема</th><th>Цепь</th><th>Переход</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="4">Расхождений между представлениями не обнаружено; инженерная проверка всё равно требуется.</td></tr>')+
  '</tbody></table></div></section>';
}
function epCrossViewAuditCsvV1(report){
 const q=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 const rows=[['Уровень','Код','Цепь'],...(report?.issues||[]).map(x=>[x.level,x.code,x.lineId])];
 return '\uFEFF'+rows.map(row=>row.map(q).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCrossViewAuditHtmlV1,epCrossViewAuditCsvV1};
