'use strict';
// Five-stage circuit dossier: identity, declared calculations, article, placement, export.
// Pure projections. No electrical engineering approval.
function epCircuitDossierV1(project,lookupSku){
 const rows=[],issues=[],lines=Array.isArray(project?.lines)?project.lines:[];
 if(!project||!Array.isArray(project.lines)||lines.length>400)
  return {schema:'electropanel.circuit.dossier.draft.1',status:'BLOCKED',rows:[],
   issues:[{code:'PROJECT_INPUT_INVALID',level:'BLOCKED'}],engineeringApproved:false,ready_for_installation:false};
 const plan=typeof epDraftBoardPlanV1==='function'?epDraftBoardPlanV1(project,lookupSku):null;
 const positions=new Map((plan?.placements||[]).filter(x=>x.kind==='branch').map(x=>[x.deviceId,x]));
 const branches=Array.isArray(project?.branchDevices)?project.branchDevices:[];
 const used=new Set();
 for(const line of lines){
  if(!line||typeof line!=='object'||typeof line.id!=='string'||!line.id){
   issues.push({code:'LINE_INVALID',level:'BLOCKED'});continue;
  }
  if(used.has(line.id))issues.push({code:'DUPLICATE_CIRCUIT_ID',level:'BLOCKED',lineId:line.id});
  used.add(line.id);
  const matches=branches.filter(x=>x?.circuitId===line.id);
  if(matches.length>1)issues.push({code:'DUPLICATE_BRANCH_BINDING',level:'BLOCKED',lineId:line.id});
  if(Array.isArray(project.branchDevices)&&!matches.length)
   issues.push({code:'BRANCH_BINDING_MISSING',level:'BLOCKED',lineId:line.id});
  const branch=matches[0];
  const apparatusId=branch?.id??line.id;
  const location=positions.get(apparatusId)||null;
  let article=null;
  if(line.catalogSku){
   try{article=typeof lookupSku==='function'?lookupSku(line.catalogSku):null;}catch(_){}
   if(!article)issues.push({code:'ARTICLE_UNKNOWN',level:'BLOCKED',lineId:line.id});
  }else issues.push({code:'ARTICLE_NOT_SELECTED',level:'UNKNOWN',lineId:line.id});
  if(!location)issues.push({code:'CIRCUIT_NOT_PLACED',level:'BLOCKED',lineId:line.id});
  if(branch&&branch.modules!==line.modules)issues.push({code:'BRANCH_WIDTH_CONFLICT',level:'BLOCKED',lineId:line.id});
  if(article&&Number.isInteger(article.modules)&&article.modules!==line.modules)
   issues.push({code:'ARTICLE_WIDTH_CONFLICT',level:'BLOCKED',lineId:line.id});
  if(article&&!article.source)issues.push({code:'ARTICLE_SOURCE_MISSING',level:'UNKNOWN',lineId:line.id});
  if(!line.route44Input)issues.push({code:'ROUTE_NOT_DECLARED',level:'UNKNOWN',lineId:line.id});
  if(!['L1','L2','L3','3Ф'].includes(line.phase))issues.push({code:'PHASE_UNKNOWN',level:'UNKNOWN',lineId:line.id});
  const current=line.overloadInput||{};
  const declared={ibA:current.ibA??null,izA:current.izA??null,ikKa:line.faultInput?.ikKa??line.ikKa??line.breakingCapacityInput?.ikKa??null};
  for(const [key,value] of Object.entries(declared)){
   const n=typeof value==='boolean'||typeof value==='object'?NaN:Number(String(value??'').trim().replace(',','.'));
   if(value===null||value===''||!Number.isFinite(n)||n<=0)
    issues.push({code:'INVALID_OR_MISSING_'+key.toUpperCase(),level:'UNKNOWN',lineId:line.id});
  }
  if(line.calculationReview?.required)issues.push({code:'CALCULATION_REVIEW_REQUIRED',level:'BLOCKED',lineId:line.id});
  rows.push({circuitId:line.id,name:line.name??'',phase:line.phase??null,
   powerKw:line.power??null,apparatusId,sku:line.catalogSku??null,
   manufacturer:article?.maker??null,series:article?.series??null,
   articleSource:article?.source??null,declared,
   routeDeclared:!!line.route44Input,calculationReviewRequired:!!line.calculationReview?.required,
   placement:location?{rail:location.railIndex+1,from:location.startModule+1,
    to:location.startModule+location.modules}:null});
 }
 if(!plan)issues.push({code:'BOARD_PLAN_UNAVAILABLE',level:'BLOCKED'});
 else for(const issue of plan.issues.filter(x=>x.level==='BLOCKED'))
  issues.push({code:'PLAN_'+issue.code,level:'BLOCKED',lineId:issue.id??null});
 return {schema:'electropanel.circuit.dossier.draft.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',rows,issues,
  engineeringApproved:false,ready_for_installation:false};
}
function epCircuitDossierCsvV1(report){
 const cells=['Цепь','Назначение','Фаза','Мощность кВт','ID аппарата','Артикул','Производитель',
 'Серия','Источник','Ib A','Iz A','Ik кА','Трасса заявлена','Перепроверка расчётов',
 'DIN','Позиция с','Позиция по'];
 const quote=x=>{
  let value=String(x??'');
  // Defang formula-like cells on spreadsheet import, including whitespace prefixes.
  if(/^[\\s\\u0000-\\u001f]*[=+@-]/.test(value))value="'"+value;
  return '"'+value.replace(/"/g,'""')+'"';
 };
 const rows=[cells,...(report?.rows||[]).map(x=>[x.circuitId,x.name,x.phase,x.powerKw,x.apparatusId,
 x.sku,x.manufacturer,x.series,x.articleSource,x.declared?.ibA,x.declared?.izA,x.declared?.ikKa,
 x.routeDeclared?'ДА':'НЕТ',x.calculationReviewRequired?'ДА':'НЕТ',x.placement?.rail,
 x.placement?.from,x.placement?.to])];
 return '\uFEFF'+rows.map(row=>row.map(quote).join(';')).join('\r\n')+'\r\n';
}
function epCircuitDossierPanelV1(project,lookupSku){
 const report=epCircuitDossierV1(project,lookupSku);
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=report.rows.map(x=>{
  const notes=report.issues.filter(i=>i.lineId===x.circuitId);
  const place=x.placement?'DIN '+x.placement.rail+' · '+x.placement.from+'–'+x.placement.to:'Не размещено';
  return '<tr><td>'+safe(x.circuitId)+'</td><td>'+safe(x.name)+'</td><td>'+safe(x.phase)+
  '</td><td>'+safe(x.sku||'Без артикула')+'</td><td>'+safe(place)+'</td><td>'+
  safe(notes.length?notes.map(n=>n.code).join(', '):'Нет замечаний в этой ограниченной проверке')+'</td></tr>';
 }).join('');
 return '<section role="region" aria-label="Прослеживаемость цепей"><h3>Цепь → аппарат → DIN · черновик</h3>'+
 '<p>Цепей: '+report.rows.length+'. Статус '+safe(report.status)+
 '. Исходные токи только заявлены; расчёт и монтаж не подтверждены.</p>'+
 '<div style="overflow-x:auto"><table><thead><tr><th>Цепь</th><th>Назначение</th><th>Фаза</th>'+
 '<th>Артикул</th><th>Размещение</th><th>Замечания</th></tr></thead><tbody>'+rows+'</tbody></table></div></section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCircuitDossierV1,epCircuitDossierCsvV1,epCircuitDossierPanelV1};
