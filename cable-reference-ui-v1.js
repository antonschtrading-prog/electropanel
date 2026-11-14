'use strict';
function epCableReferenceHtmlV1(project,lineId,lookupSku){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const line=project?.lines?.find(x=>x?.id===lineId)||project?.lines?.[0];
 if(!line)return '<p>Выберите цепь для просмотра кабельного справочника.</p>';
 const report=typeof epCableReferenceForCircuitV1==='function'?
  epCableReferenceForCircuitV1(project,line,lookupSku):null;
 const method=line.cableReferenceInput?.installationMethod||'';
 const choices=['B1','C'].map(x=>'<option value="'+x+'"'+(method===x?' selected':'')+'>'+x+'</option>').join('');
 const rows=(report?.candidates||[]).map(x=>'<tr><td>'+esc(x.sectionMm2)+'</td><td>'+esc(x.izA)+
  '</td><td>'+esc(x.ibFits?'Да':'Нет')+'</td><td>'+esc(x.inFits===null?'In не задан':x.inFits?'Да':'Нет')+
  '</td><td>'+esc(x.status)+'</td></tr>').join('');
 return '<details class="ep-cable-reference"><summary>Справочник сечений · '+esc(line.name||line.id)+
  ' · '+esc(report?.status||'Недоступно')+'</summary>'+
  '<p>Ограниченная справочная таблица Cu/PVC: 2 нагруженных проводника, воздух 30°C, одна цепь без группировки и дополнительных поправок. Выбор требует проверки условий проекта.</p>'+
  '<form data-cable-reference-form="'+esc(line.id)+'"><div class="ep-cable-reference-controls">'+
  '<label>Способ прокладки<select name="installationMethod"><option value="">Выберите</option>'+choices+'</select></label>'+
  '<label class="ep-cable-reference-confirm"><input type="checkbox" name="confirmContext" required'+(method?' checked':'')+
  '> Подтверждаю применимость всех перечисленных условий</label>'+
  '<button class="btn" type="submit">Применить условия</button></div></form>'+
  '<form data-cable-section-form="'+esc(line.id)+'"><div class="ep-cable-reference-controls"><label>Проектное сечение, мм²'+
  '<select name="sectionMm2"><option value="">Выберите сечение</option>'+
  ['1.5','2.5','4','6','10','16'].map(x=>'<option value="'+x+'"'+(line.cableDesignInput?.sectionMm2===Number(x)?' selected':'')+'>'+x+'</option>').join('')+
  '</select></label><button class="btn" type="submit">Записать сечение в проект</button></div></form>'+
  '<p>Ib: '+esc(report?.ibA??'не задан')+' А · In: '+esc(report?.inA??'не задан')+
  ' А. Справочный кандидат: '+esc(report?.smallestReferenceCandidate?.sectionMm2??'нет')+' мм².</p>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Сечение, мм²</th><th>Iz, А</th><th>Ib ≤ Iz</th><th>In ≤ Iz</th><th>Статус</th></tr></thead><tbody>'+
  rows+'</tbody></table></div><p>Не является окончательным выбором кабеля. Проверки падения напряжения, защиты и иных условий выполняются отдельно.</p></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCableReferenceHtmlV1};
