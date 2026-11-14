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
   ik=safePositive(line.faultInput?.ikKa??line.ikKa??line.breakingCapacityInput?.ikKa),
   voltageV=safePositive(line.faultInput?.voltageV);
  const sku=line.catalogSku||null;
  let article=null;
  if(sku&&typeof lookupSku==='function'){try{article=lookupSku(sku);}catch(_){}}
  const selectedCandidate=raw.candidates.find(c=>c.sku===sku);
  const reasons=[];
  if(!sku)reasons.push('ARTICLE_NOT_SELECTED');
  else if(!article)reasons.push('ARTICLE_UNKNOWN');
  else if(!['MCB','RCBO'].includes(article.kind))reasons.push('SELECTED_ARTICLE_NOT_MCB');
  else if(!selectedCandidate)reasons.push('ARTICLE_NOT_IN_SHORTLIST');
  else reasons.push(...selectedCandidate.reasons);
  if(article&&article.verificationStatus!=='VERIFIED')reasons.push('CATALOG_DATA_UNVERIFIED');
  if(article&&!article.source)reasons.push('DATASHEET_SOURCE_MISSING');
  if(line.loadCurrentCalculation?.stale)reasons.push('LOAD_CURRENT_STALE');
  const derivedIb=safePositive(line.loadCurrentCalculation?.roundedIbA);
  if(derivedIb!==null&&ib!==derivedIb)reasons.push('IB_DIFFERS_FROM_CALCULATION');
  if(voltageV===null)reasons.push('FAULT_VOLTAGE_UNDECLARED');
  if(article&&voltageV!==null){
   if(!Number.isFinite(article.icnVoltageV))reasons.push('ARTICLE_ICN_VOLTAGE_UNDECLARED');
   else if(article.icnVoltageV<voltageV)reasons.push('ARTICLE_ICN_VOLTAGE_LT_DECLARED');
  }
  if(article&&article.kind==='RCBO'){
   reasons.push('RCBO_RESIDUAL_PROTECTION_UNVERIFIED');
   if(!Number.isFinite(article.residualCurrentMa)||article.residualCurrentMa<=0)
    reasons.push('RCBO_RESIDUAL_CURRENT_UNDECLARED');
   if(!['AC','A','F','B','B+'].includes(article.residualType))
    reasons.push('RCBO_RESIDUAL_TYPE_UNDECLARED');
  }
  if(article&&article.kind==='MCB')reasons.push('MCB_DISCONNECTION_UNVERIFIED');
  if(ib===null)reasons.push('IB_MISSING_OR_INVALID');
  if(iz===null)reasons.push('IZ_MISSING_OR_INVALID');
  if(ik===null)reasons.push('IK_MISSING_OR_INVALID');
  if(line.calculationReview?.required)reasons.push('CALCULATION_REVIEW_STALE');
  if(article&&Number.isInteger(article.modules)&&line.modules!==article.modules)
   reasons.push('ARTICLE_MODULE_WIDTH_MISMATCH');
  if(article&&article.label&&line.device&&line.device!==article.label)
   reasons.push('ARTICLE_LABEL_MISMATCH');
  if(article&&article.modules!==undefined&&(!Number.isInteger(article.modules)||article.modules<1||article.modules>12))
   reasons.push('ARTICLE_MODULES_INVALID');
  if(article&&article.widthMm!==undefined&&
    (!Number.isFinite(article.widthMm)||article.widthMm<=0||article.widthMm>article.modules*18))
   reasons.push('ARTICLE_GEOMETRY_INVALID');
  if(article&&(['L1','L2','L3'].includes(line.phase)?!(article.poles===1||article.poles===2&&
    (article.kind==='RCBO'||['1P+N','2P'].includes(article.poleConfiguration))):
     line.phase==='3Ф'?![3,4].includes(article.poles):false))
   reasons.push('ARTICLE_POLES_MISMATCH');
  if(article&&Array.isArray(project.branchDevices)){
   const branches=project.branchDevices.filter(b=>b?.circuitId===line.id);
   if(branches.length>1)reasons.push('BRANCH_ASSIGNMENT_DUPLICATE');
   if(!branches.length)reasons.push('BRANCH_ASSIGNMENT_MISSING');
   for(const b of branches){
    if(Number.isInteger(article.modules)&&b.modules!==article.modules)reasons.push('BRANCH_WIDTH_MISMATCH');
    if(article.label&&b.label!==article.label)reasons.push('BRANCH_LABEL_MISMATCH');
   }
  }
  if(article&&!article.source)reasons.push('ARTICLE_SOURCE_MISSING');
  const blocking=new Set(['ARTICLE_UNKNOWN','SELECTED_ARTICLE_NOT_MCB','ARTICLE_NOT_IN_SHORTLIST',
   'IN_LT_IB','IN_GT_IZ','ICN_LT_DECLARED_IK','POLES_INCOMPATIBLE','CATALOG_SPEC_INVALID',
   'ARTICLE_MODULE_WIDTH_MISMATCH','ARTICLE_LABEL_MISMATCH','ARTICLE_MODULES_INVALID',
   'ARTICLE_GEOMETRY_INVALID','ARTICLE_POLES_MISMATCH','BRANCH_ASSIGNMENT_DUPLICATE',
   'BRANCH_ASSIGNMENT_MISSING','BRANCH_WIDTH_MISMATCH','BRANCH_LABEL_MISMATCH',
   'IB_DIFFERS_FROM_CALCULATION','ICN_VOLTAGE_LT_DECLARED',
   'ARTICLE_ICN_VOLTAGE_LT_DECLARED']);
  const status=reasons.some(x=>blocking.has(x))?'BLOCKED':'UNKNOWN';
  for(const code of reasons)issues.push({code,lineId:line.id,level:blocking.has(code)?'BLOCKED':'UNKNOWN'});
  rows.push({lineId:line.id,name:line.name||line.device||'',phase:line.phase||null,
   ibA:ib,izA:iz,ikKa:ik,voltageV,loadCurrentCalculation:line.loadCurrentCalculation||null,selectedSku:sku,selectedArticle:article?
   {maker:article.maker||null,series:article.series||null,sku:article.sku||sku,
    kind:article.kind||null,label:article.label||null,
    residualCurrentMa:article.residualCurrentMa??null,residualType:article.residualType??null,
    inA:article.inA??null,icnKa:article.icnKa??null,poles:article.poles??null,
    poleConfiguration:article.poleConfiguration??null,
    icnVoltageV:article.icnVoltageV??null,icnStandard:article.icnStandard??null,
    modules:article.modules??null,source:article.source||null,
    verificationStatus:article.verificationStatus||'UNKNOWN'}:null,
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
  const reasons=(c.reasons.length?c.reasons.join(', '):'Арифметических противоречий не выявлено')+
   (c.caution?.length?' · требуют проверки: '+c.caution.join(', '):'');
  return '<tr><td>'+esc(c.maker||'—')+'</td><td>'+esc(c.series||'—')+'</td><td>'+
   esc(c.sku)+' ('+esc(c.kind||'MCB')+
   (c.kind==='RCBO'?' · IΔn '+fmt(c.residualCurrentMa)+' мА · '+esc(c.residualType||'тип не задан'):'')+
   ')</td><td>'+fmt(c.inA)+'</td><td>'+fmt(c.icnKa)+'</td><td>'+
   esc(c.status)+'</td><td>'+esc(reasons)+'</td><td>'+
   '<button type="button" class="btn tiny" data-protection-sku="'+esc(c.sku)+'" data-protection-line="'+esc(x.lineId)+'"'+
   (c.status==='REJECTED'?' disabled title="Кандидат не проходит заявленные проверки"':'')+
   '>Назначить</button></td></tr>';
 }).join('');
 return '<section class="ep-protection-workbench" aria-label="Черновой подбор защиты">'+
  '<h3>Защита цепи '+esc(x.lineId)+' · '+esc(x.name)+'</h3>'+
  '<p>Ib: '+fmt(x.ibA)+' А · Iz: '+fmt(x.izA)+' А · Ik: '+fmt(x.ikKa)+' кА · напряжение для Icn: '+fmt(x.voltageV)+' В · фаза: '+fmt(x.phase)+
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
  '<label>Напряжение сети для проверки Icn, В (по исходным данным) <input name="voltageV" type="text" inputmode="decimal" value="'+(x.voltageV===null?'':esc(x.voltageV))+'"></label>'+
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
