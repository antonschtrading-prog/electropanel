'use strict';
// Circuit workspace: search, issue triage and per-line dossier; no electrical approval.
function epCircuitWorkspaceV1(project,lookupSku,query='',mode='all'){
 const report=typeof epCircuitDossierV1==='function'?epCircuitDossierV1(project,lookupSku):
 {rows:[],issues:[{code:'DOSSIER_UNAVAILABLE',level:'BLOCKED'}],status:'BLOCKED'};
 const normalized=String(query??'').trim().toLocaleLowerCase('ru-RU').slice(0,200);
 const allowed=['all','blocked','unknown','placed','unplaced','article_missing','review'];
 const filter=allowed.includes(mode)?mode:'all';
 const rows=report.rows.map(row=>{
  const issues=report.issues.filter(x=>x.lineId===row.circuitId);
  const blocked=issues.some(x=>x.level==='BLOCKED');
  const unknown=issues.some(x=>x.level!=='BLOCKED');
  return {...row,issues,blocked,unknown};
 }).filter(row=>{
  const searchable=[row.circuitId,row.name,row.phase,row.sku,row.manufacturer,row.series,row.apparatusId]
   .map(x=>String(x??'').toLocaleLowerCase('ru-RU')).join(' ');
  if(normalized&&!searchable.includes(normalized))return false;
  if(filter==='blocked')return row.blocked;
  if(filter==='unknown')return row.unknown;
  if(filter==='placed')return !!row.placement;
  if(filter==='unplaced')return !row.placement;
  if(filter==='article_missing')return !row.sku;
  if(filter==='review')return row.calculationReviewRequired;
  return true;
 });
 const counts={blocked:report.rows.filter(x=>report.issues.some(i=>i.lineId===x.circuitId&&i.level==='BLOCKED')).length,
  missingArticle:report.rows.filter(x=>!x.sku).length,
  unplaced:report.rows.filter(x=>!x.placement).length,
  staleReview:report.rows.filter(x=>x.calculationReviewRequired).length};
 return {status:report.status,rows,visible:rows.length,total:report.rows.length,
  issueCount:report.issues.length,counts,filter,query:normalized,
  engineeringApproved:false,ready_for_installation:false};
}
function epCircuitWorkspaceHtmlV1(result,selectedId=null){
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=result.rows.map(x=>{
  const location=x.placement?'DIN '+x.placement.rail+' / '+x.placement.from+'–'+x.placement.to:'Не размещено';
  const issues=x.issues.map(i=>i.code).join(', ');
  return '<tr'+(x.circuitId===selectedId?' class="ep-circuit-active"':'')+'><td><button type="button" class="btn tiny" data-focus-circuit="'+safe(x.circuitId)+'" aria-label="Выбрать цепь '+safe(x.circuitId)+'">'+safe(x.circuitId)+'</button></td><td>'+safe(x.name)+'</td><td>'+safe(x.phase)+
   '</td><td>'+safe(x.manufacturer||'—')+'</td><td>'+safe(x.sku||'Без артикула')+
   '</td><td>'+safe(location)+'</td><td>'+safe(issues||'Замечаний по цепи нет')+'</td><td><button type="button" class="btn tiny" data-open-load-circuit="'+safe(x.circuitId)+'">Редактировать</button></td></tr>';
 }).join('');
 return '<p>Показано '+result.visible+' из '+result.total+' цепей · замечаний по проекту: '+
 result.issueCount+'. Блокирующих цепей: '+result.counts.blocked+
 '; без артикула: '+result.counts.missingArticle+'; не размещено: '+result.counts.unplaced+
 '; перепроверка: '+result.counts.staleReview+'. Только заявленные данные, не инженерный допуск.</p>'+
 '<div style="overflow-x:auto"><table><thead><tr><th>Цепь</th><th>Назначение</th><th>Фаза</th>'+
 '<th>Производитель</th><th>Артикул</th><th>DIN</th><th>Замечания</th><th>Действие</th></tr></thead><tbody>'+
 (rows||'<tr><td colspan="8">Нет цепей по выбранному фильтру</td></tr>')+
 '</tbody></table></div>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCircuitWorkspaceV1,epCircuitWorkspaceHtmlV1};
