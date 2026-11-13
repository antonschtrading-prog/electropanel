'use strict';
// Deterministic per-circuit protection workbench. No automatic electrical selection.
function epProtectionWorkbenchV1(project,lookupSku,catalogInput,selectedId){
 const issues=[],rows=[];
 const safePositive=v=>{
  if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0?n:null;
 };
 if(!project||!Array.isArray(project.lines)||project.lines.length>1000)
  return {status:'BLOCKED',issues:[{code:'PROJECT_INVALID',level:'BLOCKED'}],rows:[],selected:null,
   engineeringApproved:false,ready_for_installation:false};
 const catalogue=Array.isArray(catalogInput)?catalogInput:[];
 const ids=new Set();
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id||ids.has(line.id)){
   issues.push({code:'CIRCUIT_ID_INVALID_OR_DUPLICATE',level:'BLOCKED',lineId:line?.id??null});continue;
  }
  ids.add(line.id);
  const raw=typeof epProtectiveDeviceShortlistV1==='function'?
   epProtectiveDeviceShortlistV1(line,catalogue):
   {candidates:[],issues:[{code:'SHORTLIST_UNAVAILABLE',level:'BLOCKED'}]};
  const ib=safePositive(line.overloadInput?.ibA),iz=safePositive(line.overloadInput?.izA),
   ik=safePositive(line.faultInput?.ikKa??line.ikKa??line.breakingCapacityInput?.ikKa);
  const sku=line.catalogSku||null;
  let article=null;
  if(sku&&typeof lookupSku==='function'){try{article=lookupSku(sku);}catch(_){}}
  const selectedCandidate=raw.candidates.find(c=>c.sku===sku);
  const reasons=[];
  if(!sku)reasons.push('ARTICLE_NOT_SELECTED');
  else if(!article)reasons.push('ARTICLE_UNKNOWN');
  else if(article.kind!=='MCB')reasons.push('SELECTED_ARTICLE_NOT_MCB');
  else if(!selectedCandidate)reasons.push('ARTICLE_NOT_IN_SHORTLIST');
  else reasons.push(...selectedCandidate.reasons);
  if(ib===null)reasons.push('IB_MISSING_OR_INVALID');
  if(iz===null)reasons.push('IZ_MISSING_OR_INVALID');
  if(ik===null)reasons.push('IK_MISSING_OR_INVALID');
  if(line.calculationReview?.required)reasons.push('CALCULATION_REVIEW_STALE');
  if(article&&Number.isInteger(article.modules)&&line.modules!==article.modules)
   reasons.push('ARTICLE_MODULE_WIDTH_MISMATCH');
  if(article&&!article.source)reasons.push('ARTICLE_SOURCE_MISSING');
  const blocking=new Set(['ARTICLE_UNKNOWN','SELECTED_ARTICLE_NOT_MCB','ARTICLE_NOT_IN_SHORTLIST',
   'IN_LT_IB','IN_GT_IZ','ICN_LT_DECLARED_IK','POLES_INCOMPATIBLE','CATALOG_SPEC_INVALID',
   'ARTICLE_MODULE_WIDTH_MISMATCH']);
  const status=reasons.some(x=>blocking.has(x))?'BLOCKED':'UNKNOWN';
  for(const code of reasons)issues.push({code,lineId:line.id,level:blocking.has(code)?'BLOCKED':'UNKNOWN'});
  rows.push({lineId:line.id,name:line.name||line.device||'',phase:line.phase||null,
   ibA:ib,izA:iz,ikKa:ik,loadCurrentCalculation:line.loadCurrentCalculation||null,selectedSku:sku,selectedArticle:article?
   {maker:article.maker||null,series:article.series||null,sku:article.sku||sku,
    inA:article.inA??null,icnKa:article.icnKa??null,poles:article.poles??null,
    modules:article.modules??null,source:article.source||null}:null,
   status,reasons,candidates:raw.candidates,engineeringApproved:false});
 }
 const selected=rows.find(x=>x.lineId===selectedId)||rows[0]||null;
 return {schema:'electropanel.protection.workbench.draft.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,selected,issues,blockedCircuits:rows.filter(x=>x.status==='BLOCKED').length,
  incompleteCircuits:rows.filter(x=>x.status==='UNKNOWN').length,
  engineeringApproved:false,ready_for_installation:false,
  note:'Arithmetic comparisons only. No I2, selectivity, thermal, disconnection or normative verification.'};
}
function epProtectionWorkbenchHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report?.selected)return '<p>Добавьте отходящую цепь, чтобы проверить подбор защиты.</p>';
 const x=report.selected,fmt=v=>v===null||v===undefined?'Не задано':esc(v);
 const article=x.selectedArticle;
 const rows=x.candidates.map(c=>{
  const reasons=c.reasons.length?c.reasons.join(', '):'Арифметических противоречий не выявлено';
  return '<tr><td>'+esc(c.maker||'—')+'</td><td>'+esc(c.series||'—')+'</td><td>'+
   esc(c.sku)+'</td><td>'+fmt(c.inA)+'</td><td>'+fmt(c.icnKa)+'</td><td>'+
   esc(c.status)+'</td><td>'+esc(reasons)+'</td><td>'+
   '<button type="button" class="btn tiny" data-protection-sku="'+esc(c.sku)+'" data-protection-line="'+esc(x.lineId)+'"'+
   (c.status==='REJECTED'?' disabled title="Кандидат не проходит заявленные проверки"':'')+
   '>Назначить</button></td></tr>';
 }).join('');
 return '<section class="ep-protection-workbench" aria-label="Черновой подбор защиты">'+
  '<h3>Защита цепи '+esc(x.lineId)+' · '+esc(x.name)+'</h3>'+
  '<p>Ib: '+fmt(x.ibA)+' А · Iz: '+fmt(x.izA)+' А · Ik: '+fmt(x.ikKa)+' кА · фаза: '+fmt(x.phase)+
  '. Выбран: '+esc(x.selectedSku||'нет')+'; статус: '+esc(x.status)+'.</p>'+
  '<p>Паспорт выбранного аппарата: '+(article?
   esc(article.maker)+' / '+esc(article.series)+' / '+esc(article.sku)+
   ' · In '+fmt(article.inA)+' А · Icn '+fmt(article.icnKa)+' кА · '+fmt(article.poles)+' пол.':
   'Артикул не выбран или отсутствует в каталоге')+'</p>'+
  '<p>Замечания: '+(x.reasons.length?x.reasons.map(esc).join('; '):'Нет по проверяемым входным данным')+'</p>'+
  '<form data-protection-input-form="'+esc(x.lineId)+'" class="ep-protection-inputs">'+
  '<fieldset><legend>Исходные токи (ввод инженером, без автоматического расчёта)</legend>'+
  '<label>Ib, А <input name="ibA" type="text" inputmode="decimal" required value="'+(x.ibA===null?'':esc(x.ibA))+'"></label>'+
  '<label>Iz, А <input name="izA" type="text" inputmode="decimal" required value="'+(x.izA===null?'':esc(x.izA))+'"></label>'+
  '<label>Ik, кА <input name="ikKa" type="text" inputmode="decimal" required value="'+(x.ikKa===null?'':esc(x.ikKa))+'"></label>'+
  '<button type="submit" class="btn">Записать исходные токи</button></fieldset></form>'+
  '<div style="overflow-x:auto"><table><thead><tr><th>Производитель</th><th>Серия</th><th>Артикул</th>'+
  '<th>In, А</th><th>Icn, кА</th><th>Оценка</th><th>Причины</th><th>Действие</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="8">Нет аппаратов в доступном каталоге</td></tr>')+
  '</tbody></table></div><p>Назначение кандидата не подтверждает пригодность к монтажу. Изменение артикула помечает расчёт на перепроверку.</p></section>';
}
function epProtectionWorkbenchCsvV1(report){
 const quote=x=>{
  let s=String(x??'');
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const head=['Цепь','Назначение','Фаза','Ib А','Iz А','Ik кА','Выбранный артикул',
  'Производитель','Серия','In А','Icn кА','Статус','Замечания','Кандидаты POTENTIAL'];
 const rows=(report?.rows||[]).map(x=>[x.lineId,x.name,x.phase,x.ibA,x.izA,x.ikKa,
  x.selectedSku,x.selectedArticle?.maker,x.selectedArticle?.series,x.selectedArticle?.inA,
  x.selectedArticle?.icnKa,x.status,x.reasons.join('; '),
  x.candidates.filter(c=>c.status==='POTENTIAL').map(c=>c.sku).join(', ')]);
 return '\uFEFF'+[head,...rows].map(row=>row.map(quote).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epProtectionWorkbenchV1,epProtectionWorkbenchHtmlV1,epProtectionWorkbenchCsvV1};
