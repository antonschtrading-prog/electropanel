'use strict';
// Deterministic cross-domain reconciliation. This is a design consistency check,
// not an electrical safety approval or substitute for verified manufacturer data.
function epReconcileDesign(project) {
 const issues=[], rows=[], placements=[];
 const issue=(code,scope,id,detail)=>issues.push({code,scope,id,detail});
 if(!project||typeof project!=='object'||Array.isArray(project))return {status:'BLOCKED',issues:[{code:'INVALID_PROJECT',scope:'project',id:'',detail:'Expected object'}],rows:[],placements:[],engineeringApproved:false};
 const lines=Array.isArray(project.lines)?project.lines:[];
 const catalog=Array.isArray(project.catalogArticles)?project.catalogArticles:[];
 const devices=Array.isArray(project.dinEvidence?.devices)?project.dinEvidence.devices:[];
 const ids=new Set(), articles=new Map(), seenDevices=new Set();
 for(const [i,a] of catalog.entries()){
  const key=typeof a?.manufacturer==='string'&&typeof a?.article==='string'?a.manufacturer.trim().toLowerCase()+'|'+a.article.trim().toLowerCase():'';
  if(!key||key==='|')issue('CATALOG_KEY_MISSING','catalog',String(i),'Manufacturer and article required');
  else if(articles.has(key))issue('CATALOG_DUPLICATE','catalog',String(i),key);
  else articles.set(key,a);
 }
 for(const [i,l] of lines.entries()){
  const id=typeof l?.id==='string'?l.id.trim():'';
  if(!id){issue('LINE_ID_MISSING','line',String(i),'Circuit ID required');continue;}
  if(ids.has(id)){issue('LINE_DUPLICATE','line',id,'Duplicate circuit ID');continue;}
  ids.add(id);
  const key=typeof l.catalogManufacturer==='string'&&typeof l.catalogArticle==='string'?l.catalogManufacturer.trim().toLowerCase()+'|'+l.catalogArticle.trim().toLowerCase():'';
  const a=key?articles.get(key):undefined;
  if(!key||key==='|')issue('ARTICLE_NOT_ASSIGNED','line',id,'Select an exact catalog article');
  else if(!a)issue('ARTICLE_NOT_FOUND','line',id,key);
  const width=Number(a?.widthMm), modules=Number(a?.modules), chosen=Number(l.modules);
  if(a&&(!Number.isFinite(width)||width<=0||!Number.isFinite(modules)||modules<=0))issue('ARTICLE_DIMENSIONS_UNKNOWN','line',id,'Positive width and modules required');
  if(a&&Number.isFinite(chosen)&&chosen>0&&Number.isFinite(modules)&&modules>0&&chosen!==modules)issue('MODULE_MISMATCH','line',id,'Line and catalog modules differ');
  if(a&&a.verified!==true)issue('ARTICLE_UNVERIFIED','line',id,'Catalog evidence not verified');
  rows.push({lineId:id,articleKey:key||null,articleFound:!!a,widthMm:a&&Number.isFinite(width)&&width>0?width:null,modules:a&&Number.isFinite(modules)&&modules>0?modules:null});
 }
 const railWidth=Number(project.dinEvidence?.railWidthMm);
 if(!Number.isFinite(railWidth)||railWidth<=0)issue('RAIL_WIDTH_UNKNOWN','din','board','Positive rail width required');
 const sorted=devices.map((d,i)=>({d,i})).sort((a,b)=>Number(a.d?.xMm)-Number(b.d?.xMm));
 let previousEnd=0;
 for(const {d,i} of sorted){
  const id=typeof d?.lineId==='string'?d.lineId:'';
  const x=Number(d?.xMm),w=Number(d?.widthMm);
  if(!id||!ids.has(id))issue('ORPHAN_PLACEMENT','din',String(i),'Unknown circuit reference');
  if(id&&seenDevices.has(id))issue('DUPLICATE_PLACEMENT','din',id,'Circuit placed more than once');
  seenDevices.add(id);
  if(!Number.isFinite(x)||x<0||!Number.isFinite(w)||w<=0){issue('PLACEMENT_INVALID','din',id||String(i),'Positive width and nonnegative offset required');continue;}
  if(x<previousEnd)issue('PLACEMENT_OVERLAP','din',id,'Devices overlap');
  if(Number.isFinite(railWidth)&&railWidth>0&&x+w>railWidth+1e-7)issue('PLACEMENT_OUT_OF_RAIL','din',id,'Device exceeds rail');
  previousEnd=Math.max(previousEnd,x+w);
  const row=rows.find(r=>r.lineId===id);
  if(row?.widthMm!==null&&row?.widthMm!==undefined&&Math.abs(row.widthMm-w)>0.1)issue('PLACEMENT_WIDTH_MISMATCH','din',id,'Catalog and placed widths differ');
  placements.push({lineId:id,xMm:x,widthMm:w});
 }
 for(const r of rows)if(!seenDevices.has(r.lineId))issue('LINE_NOT_PLACED','din',r.lineId,'No placement');
 if(!lines.length)issue('NO_LINES','project','','At least one circuit required');
 return {status:issues.length?'BLOCKED':'CONSISTENT_UNVERIFIED',issues,rows,placements,engineeringApproved:false,readyForInstallation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epReconcileDesign};

// Native Web model adapter. Legacy evidence format above remains readable as-is.
function epReconcileProjectV2(project,lookup){
 const issues=[],rows=[];
 const add=(code,lineId,level='UNKNOWN')=>issues.push({code,lineId,level});
 if(!project||!Array.isArray(project.lines))return {status:'BLOCKED',issues:[{code:'PROJECT_INVALID',level:'BLOCKED'}],rows:[],engineeringApproved:false};
 const lineIds=new Set(),deviceIds=new Set(),linkedCircuits=new Map();
 for(const [index,line] of project.lines.entries()){
  if(!line||typeof line.id!=='string'||!line.id.trim()){
   add('LINE_ID_MISSING',String(index),'BLOCKED');continue;
  }
  if(lineIds.has(line.id))add('LINE_ID_DUPLICATE',line.id,'BLOCKED');
  lineIds.add(line.id);
  if(!Number.isInteger(line.modules)||line.modules<=0)add('LINE_MODULE_COUNT_INVALID',line.id,'BLOCKED');
 }
 if(project.branchDevices!==undefined&&!Array.isArray(project.branchDevices))add('BRANCH_DEVICES_INVALID',null,'BLOCKED');
 for(const [index,device] of (Array.isArray(project.branchDevices)?project.branchDevices:[]).entries()){
  if(!device||typeof device.id!=='string'||!device.id.trim()){
   add('BRANCH_DEVICE_ID_MISSING',String(index),'BLOCKED');continue;
  }
  if(deviceIds.has(device.id))add('BRANCH_DEVICE_ID_DUPLICATE',device.id,'BLOCKED');
  deviceIds.add(device.id);
  if(!lineIds.has(device.circuitId))add('BRANCH_DEVICE_ORPHAN',device.circuitId||device.id,'BLOCKED');
  linkedCircuits.set(device.circuitId,(linkedCircuits.get(device.circuitId)||0)+1);
  if(!Number.isInteger(device.modules)||device.modules<=0)add('BRANCH_MODULE_COUNT_INVALID',device.id,'BLOCKED');
  const circuit=project.lines.find(x=>x?.id===device.circuitId);
  if(circuit&&Number.isInteger(circuit.modules)&&device.modules!==circuit.modules)
   add('BRANCH_LINE_MODULE_MISMATCH',circuit.id,'BLOCKED');
 }
 for(const line of project.lines){
  if(!line||!line.id)continue;
  if((linkedCircuits.get(line.id)||0)===0)add('BRANCH_DEVICE_MISSING',line.id,'BLOCKED');
  if((linkedCircuits.get(line.id)||0)>1)add('BRANCH_DEVICE_DUPLICATE_FOR_LINE',line.id,'BLOCKED');
 }
 const plan=typeof epDraftBoardPlanV1==='function'?epDraftBoardPlanV1(project,lookup):null;
 if(!plan)add('BOARD_MODEL_UNAVAILABLE',null,'BLOCKED');
 else if(!Array.isArray(plan.placements))add('BOARD_PLACEMENTS_UNAVAILABLE',null,'BLOCKED');
 for(const i of (Array.isArray(plan?.issues)?plan.issues:[]))add(i?.code||'BOARD_ISSUE_INVALID',i?.id,i?.level||'UNKNOWN');
 const review=typeof epCircuitDesignReviewV1==='function'?epCircuitDesignReviewV1(project,lookup):null;
 for(const i of (Array.isArray(review?.issues)?review.issues:[]))issues.push(i);
 for(const line of project.lines){
  if(!line||typeof line!=='object')continue;
  let article=null;try{article=line.catalogSku&&lookup?.(line.catalogSku);}catch(_){add('CATALOG_LOOKUP_FAILED',line.id,'BLOCKED');}
  const branch=Array.isArray(project.branchDevices)?project.branchDevices.find(x=>x?.circuitId===line.id):null;
  const placement=Array.isArray(plan?.placements)?plan.placements.find(x=>x?.deviceId===(branch?.id||line.id)):null;
  if(plan&&branch&&!placement)add('BRANCH_DEVICE_NOT_PLACED',line.id,'BLOCKED');
  if(!article)add('ARTICLE_NOT_SELECTED_OR_UNKNOWN',line.id);
  if(article&&(!Number.isFinite(article.widthMm)||article.widthMm<=0||!Number.isInteger(line.modules)||line.modules<=0||article.widthMm>line.modules*18))add('ARTICLE_ENVELOPE_CONFLICT',line.id,'BLOCKED');
  if(article&&Number.isInteger(article.modules)&&article.modules>0&&article.modules!==line.modules)add('CATALOG_LINE_MODULE_MISMATCH',line.id,'BLOCKED');
  rows.push({lineId:line.id,name:line.name||'',powerKw:line.power??null,
   article:article?{id:line.catalogSku,maker:article.maker,series:article.series,sku:article.sku,widthMm:article.widthMm,source:article.source}:null,
   calculation:(Array.isArray(review?.rows)?review.rows.find(x=>x?.lineId===line.id):null)||null,placement:placement||null});
 }
 return {schema:'electropanel.reconciled.project.2',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,board:plan,engineeringApproved:false,ready_for_installation:false};
}
function epReconcileProjectHtmlV2(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<section class="panel compact ep-project-chain"><h3>Связанный проект · нагрузка → аппарат → DIN</h3><p>Обновляется по текущей модели. '+report.rows.length+' цепей; '+report.issues.filter(x=>x.level==='BLOCKED').length+' противоречий. Проверка согласованности не заменяет инженерные основания.</p><div class="table-scroll"><table><thead><tr><th>Цепь</th><th>кВт / Ib</th><th>Оборудование</th><th>Сечение / ΔU</th><th>Позиция DIN</th></tr></thead><tbody>'+report.rows.map(r=>'<tr><td><button type="button" class="btn tiny" data-project-focus="'+esc(r.lineId)+'">'+esc(r.lineId+' · '+r.name)+'</button></td><td>'+esc(r.powerKw??'—')+' / '+esc(r.calculation?.ibA??'—')+' A</td><td>'+esc(r.article?r.article.maker+' / '+r.article.sku:'Артикул не выбран')+'</td><td>'+esc(r.calculation?.sectionMm2??'—')+' мм² / '+esc(r.calculation?.voltageDrop?.dropPercent?.toFixed(2)??'—')+'%</td><td>'+esc(r.placement?'Рейка '+(r.placement.railIndex+1)+' · модуль '+(r.placement.startModule+1):'Не размещён')+'</td></tr>').join('')+'</tbody></table></div></section>';
}
if(typeof module!=='undefined'&&module.exports)Object.assign(module.exports,{epReconcileProjectV2,epReconcileProjectHtmlV2});
