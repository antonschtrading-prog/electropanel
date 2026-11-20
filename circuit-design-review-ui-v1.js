'use strict';
function epCircuitDesignReviewHtmlV1(project,lookupSku,selectedId){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const report=typeof epCircuitDesignReviewV1==='function'?epCircuitDesignReviewV1(project,lookupSku):null;
 if(!report)return '<p>Матрица расчётов недоступна.</p>';
 const fmt=v=>v===null||v===undefined?'—':typeof v==='number'?String(Math.round(v*10000)/10000):String(v);
 const td=v=>'<td>'+esc(fmt(v))+'</td>';
 const tr=report.rows.map(x=>'<tr'+(x.lineId===selectedId?' class="ep-circuit-active"':'')+'>'+
  '<td><button class="btn tiny" type="button" data-design-focus="'+esc(x.lineId)+'">'+esc(x.name||x.lineId)+'</button></td>'+
  td(x.ibA)+td(x.inA)+td(x.izA)+td(x.ikKa)+td(x.icnKa)+td(x.sectionMm2)+
  td(x.voltageDrop.dropPercent)+td(x.voltageDrop.limitPercent)+td(x.current)+td(x.cable)+td(x.breaking)+
  td(x.referenceStatus)+td(x.voltageDrop.status)+td(x.status)+'</tr>').join('');
 const line=project?.lines?.find(x=>x?.id===selectedId)||project?.lines?.[0];
 let editor='';
 if(line){
  const data=line.voltageDropDesignInput||{};
  const val=(key)=>esc(data[key]??'');
  const fields=[['lengthM','Длина трассы, м'],['voltageV','Напряжение, В'],
   ['rOhmKm','R жилы при расчётной температуре, Ом/км'],
   ['xOhmKm','X жилы, Ом/км'],['powerFactor','cos φ'],
   ['maxDropPercent','Допустимое падение, %']];
  editor='<details class="ep-drop-editor"><summary>Падение напряжения · '+esc(line.name||line.id)+'</summary>'+
   '<p>Введите сопротивление и реактивность жилы для расчётной температуры и длину трассы. Для однофазной цепи формула предполагает эквивалентный обратный проводник.</p>'+
   '<form data-drop-form="'+esc(line.id)+'"><div class="ep-drop-fields">'+
   fields.map(([name,label])=>'<label>'+esc(label)+'<input name="'+name+'" inputmode="decimal" required value="'+val(name)+'"></label>').join('')+
   '<label class="ep-drop-check"><input name="conductorBasisDocumented" type="checkbox" required'+(data.conductorBasisDocumented?' checked':'')+'> R/X документированы для расчётной температуры</label>'+
   '<label class="ep-drop-check"><input name="routeLengthDocumented" type="checkbox" required'+(data.routeLengthDocumented?' checked':'')+'> Длина трассы обоснована</label>'+
   (line.phase==='3Ф'?'':'<label class="ep-drop-check"><input name="neutralEquivalent" type="checkbox" required'+(data.neutralEquivalent?' checked':'')+'> N-проводник эквивалентен фазному по импедансу</label>')+
   '<button class="btn" type="submit">Рассчитать и записать</button></div></form></details>';
 }
 return '<section class="ep-design-review"><div class="ep-design-review-head"><strong>Сводная матрица проектных расчётов</strong>'+
  '<span>'+report.summary.circuits+' цепей · '+report.summary.blocked+' с противоречиями · '+report.summary.pending+' требуют проверки</span>'+
  '<button class="btn" type="button" id="exportDesignReviewCsvBtn">Ведомость CSV</button></div>'+
  '<div class="ep-design-review-scroll"><table><thead><tr>'+
  ['Цепь','Ib','In','Iz','Ik','Icn','S, мм²','ΔU, %','Лимит, %','Ib ≤ In','In ≤ Iz','Icn ≥ Ik','Сечение','ΔU','Итог'].map(x=>'<th>'+esc(x)+'</th>').join('')+
  '</tr></thead><tbody>'+tr+'</tbody></table></div>'+editor+
  '<p>Матрица показывает отдельные условия; отсутствие данных не считается успешной проверкой. Справочное сечение не назначается автоматически.</p></section>';
}
function epCircuitDesignReviewCsvV1(report){
 const q=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';};
 const rows=[['Цепь','Название','Ib A','In A','Iz A','Ik kA','Icn kA','Сечение мм2','Падение %','Лимит %','Ib/In','In/Iz','Icn/Ik','Статус']];
 for(const x of report?.rows||[])rows.push([x.lineId,x.name,x.ibA,x.inA,x.izA,x.ikKa,x.icnKa,x.sectionMm2,
  x.voltageDrop?.dropPercent,x.voltageDrop?.limitPercent,x.current,x.cable,x.breaking,x.status]);
 return '\uFEFF'+rows.map(row=>row.map(q).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCircuitDesignReviewHtmlV1,epCircuitDesignReviewCsvV1};
