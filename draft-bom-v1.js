'use strict';
// Draft bill of materials: exact SKU grouping only, no pricing or substitute guesses.
function epDraftBomV1(project,lookupSku){
 const issues=[],items=new Map(),devices=[];
 if(!project||!Array.isArray(project.lines)||project.lines.length>400)
  return {schema:'electropanel.bom.draft.1',status:'BLOCKED',items:[],issues:[{code:'PROJECT_INVALID',level:'BLOCKED'}],engineeringApproved:false,ready_for_installation:false};
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:[];
 const push=(kind,id,sku,modules,owner)=>{
  if(!sku){issues.push({code:'SKU_MISSING',level:'UNKNOWN',deviceId:id,owner});return;}
  let article=null;
  try{article=typeof lookupSku==='function'?lookupSku(sku):null;}catch(_){}
  if(!article){issues.push({code:'SKU_UNKNOWN',level:'BLOCKED',deviceId:id,owner,sku});return;}
  if(article.sku&&typeof article.sku!=='string'){issues.push({code:'SKU_INVALID',level:'BLOCKED',deviceId:id});return;}
  if(!Number.isInteger(article.modules)||article.modules<1||article.modules>200){
   issues.push({code:'ARTICLE_WIDTH_INVALID',level:'BLOCKED',deviceId:id});return;
  }
  if(modules!==article.modules)issues.push({code:'WIDTH_MISMATCH',level:'BLOCKED',deviceId:id,owner,sku});
  if(!article.source)issues.push({code:'SOURCE_NOT_DECLARED',level:'UNKNOWN',deviceId:id,owner,sku});
  const key=String(sku);
  if(!items.has(key))items.set(key,{key,sku:article.sku||sku,maker:article.maker||null,
   series:article.series||null,label:article.label||null,kind:article.kind||null,
   modules:article.modules,widthMm:article.widthMm??null,source:article.source||null,
   quantity:0,owners:[],draft:true});
  const item=items.get(key);item.quantity++;item.owners.push(owner);
  devices.push({kind,id,sku:key,owner});
 };
 const ids=new Set();
 for(const d of Array.isArray(project.sharedDevices)?project.sharedDevices:[]){
  if(!d||typeof d.id!=='string'||!d.id||ids.has(d.id)){issues.push({code:'DEVICE_ID_INVALID',level:'BLOCKED'});continue;}
  ids.add(d.id);push('shared',d.id,d.catalogSku,d.modules,d.id);
 }
 for(const l of project.lines){
  if(!l||typeof l.id!=='string'||!l.id){issues.push({code:'CIRCUIT_INVALID',level:'BLOCKED'});continue;}
  const matches=branches.filter(b=>b?.circuitId===l.id);
  if(matches.length>1)issues.push({code:'BRANCH_DUPLICATE',level:'BLOCKED',owner:l.id});
  if(Array.isArray(project.branchDevices)&&!matches.length)issues.push({code:'BRANCH_MISSING',level:'BLOCKED',owner:l.id});
  const b=matches[0],id=b?.id??l.id;
  if(ids.has(id))issues.push({code:'DEVICE_ID_DUPLICATE',level:'BLOCKED',owner:l.id});
  ids.add(id);
  if(b&&b.modules!==l.modules)issues.push({code:'BRANCH_WIDTH_CONFLICT',level:'BLOCKED',owner:l.id});
  push('branch',id,l.catalogSku,b?.modules??l.modules,l.id);
 }
 for(const b of branches)if(!project.lines.some(l=>l?.id===b?.circuitId))
  issues.push({code:'BRANCH_ORPHAN',level:'BLOCKED',deviceId:b?.id});
 const result=[...items.values()].sort((a,b)=>a.key.localeCompare(b.key));
 if(!result.length)issues.push({code:'NO_VERIFIED_CATALOGUE_ARTICLES',level:'UNKNOWN'});
 return {schema:'electropanel.bom.draft.1',status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  items:result,devices,issues,distinctArticles:result.length,totalCataloguedDevices:result.reduce((n,x)=>n+x.quantity,0),
  engineeringApproved:false,ready_for_installation:false};
}
function epDraftBomCsvV1(report){
 const columns=['Артикул (ключ)','Артикул производителя','Производитель','Серия','Название','Тип',
  'Количество','Модули на аппарат','Ширина мм','Источник','Привязки'];
 const safe=x=>{let v=String(x??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
 const rows=[columns,...(report?.items||[]).map(x=>[x.key,x.sku,x.maker,x.series,x.label,x.kind,
  x.quantity,x.modules,x.widthMm,x.source,x.owners.join(', ')])];
 return '\uFEFF'+rows.map(row=>row.map(safe).join(';')).join('\r\n')+'\r\n';
}
function epDraftBomHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=report.items.map(x=>'<tr><td>'+esc(x.maker)+'</td><td>'+esc(x.series)+'</td><td>'+
 esc(x.sku)+'</td><td>'+esc(x.quantity)+'</td><td>'+esc(x.modules)+'</td><td>'+esc(x.owners.join(', '))+
 '</td><td>'+esc(x.source||'Не указан')+'</td></tr>').join('');
 return '<section aria-label="Предварительная спецификация"><h3>Спецификация оборудования · черновик</h3>'+
 '<p>Артикулов: '+report.distinctArticles+'; аппаратов с артикулами: '+report.totalCataloguedDevices+
 '; замечаний: '+report.issues.length+'. Цены, совместимость и полнота спецификации не подтверждены.</p>'+
 '<div style="overflow-x:auto"><table><thead><tr><th>Производитель</th><th>Серия</th><th>Артикул</th>'+
 '<th>Шт.</th><th>Мод.</th><th>Цепи</th><th>Источник</th></tr></thead><tbody>'+
 (rows||'<tr><td colspan="7">Нет подтверждённых записей каталога</td></tr>')+
 '</tbody></table></div></section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDraftBomV1,epDraftBomCsvV1,epDraftBomHtmlV1};
