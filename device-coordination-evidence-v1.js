'use strict';
// Manufacturer pair data are DECLARED evidence, never automatic selective or
// backup-protection approval. Source URL and revision do not prove authenticity.
const EP_COORD_TYPES=['SELECTIVITY_LIMIT','BACKUP_BREAKING_CAPACITY'];
function epCoordPairV1(project,from,to){
 if(typeof epDeviceSupplyValidateV1!=='function')throw Error('COORD_SUPPLY_MODULE_MISSING');
 const model=epDeviceSupplyValidateV1(project,project.deviceSupplyV1);
 if(!/^(BRANCH|INCOMING):[A-Za-z0-9_-]{1,80}$/.test(from)|| 
    !/^(BRANCH|INCOMING):[A-Za-z0-9_-]{1,80}$/.test(to)||
    !model.links.some(x=>x.from===from&&x.to===to))
  throw Error('COORD_EXPLICIT_PROTECTION_PAIR_REQUIRED');
 if(typeof epDeviceFaultNodeV1!=='function'||typeof epDeviceFaultSupplyFingerprintV1!=='function')
  throw Error('COORD_FAULT_MODULE_MISSING');
 const a=epDeviceFaultNodeV1(project,from),b=epDeviceFaultNodeV1(project,to);
 return {upstreamSku:a.sku,downstreamSku:b.sku,
  supplyFingerprint:epDeviceFaultSupplyFingerprintV1(project,to)};
}
function epCoordRecordV1(project,r){
 const fail=code=>{throw Error('COORD_'+code);};
 const allowed=['from','to','evidenceType','voltageV','limitKa','manufacturer',
  'documentId','revision','page','sourceUrl','upstreamSkuSnapshot',
  'downstreamSkuSnapshot','supplyFingerprint'];
 if(!r||typeof r!=='object'||Array.isArray(r)||
  Object.keys(r).some(k=>!allowed.includes(k))||
  typeof r.from!=='string'||typeof r.to!=='string'||
  !EP_COORD_TYPES.includes(r.evidenceType))fail('RECORD_INVALID');
 // Import keeps historical declarations even when the live supply edge changed.
 // Audit must expose stale evidence rather than silently discard it.
 if(typeof r.voltageV!=='number'||!Number.isFinite(r.voltageV)||r.voltageV<=0||r.voltageV>1500||
  typeof r.limitKa!=='number'||!Number.isFinite(r.limitKa)||r.limitKa<=0||r.limitKa>1000)
  fail('VALUES_INVALID');
 for(const k of ['manufacturer','documentId','revision','page']){
  if(typeof r[k]!=='string'||!r[k].trim()||r[k].length>150)fail('SOURCE_INCOMPLETE');
 }
 if(typeof r.sourceUrl!=='string'||r.sourceUrl.length>500||
  !/^https:\/\/[^\s/?#]+(?:[^\s]*)$/.test(r.sourceUrl))fail('URL_INVALID');
 if(!(r.upstreamSkuSnapshot===null||
   typeof r.upstreamSkuSnapshot==='string'&&r.upstreamSkuSnapshot.length<=100)||
  !(r.downstreamSkuSnapshot===null||
   typeof r.downstreamSkuSnapshot==='string'&&r.downstreamSkuSnapshot.length<=100)||
  typeof r.supplyFingerprint!=='string'||r.supplyFingerprint.length>50000)
  fail('SNAPSHOT_INVALID');
 return Object.fromEntries(allowed.map(k=>[k,r[k]]));
}
function epCoordNormalizeV1(project,records){
 if(!Array.isArray(records)||records.length>500)throw Error('COORD_LIST_INVALID');
 const unique=new Set();
 return records.map(r=>{
  const item=epCoordRecordV1(project,r),key=JSON.stringify([item.from,item.to,item.evidenceType]);
  if(unique.has(key))throw Error('COORD_PAIR_EVIDENCE_DUPLICATED');
  unique.add(key);return item;
 });
}
function epCoordDeclareV1(project,from,to,evidenceType,voltageV,limitKa,
 manufacturer,documentId,revision,page,sourceUrl){
 const pair=epCoordPairV1(project,from,to);
 const record=epCoordRecordV1(project,{from,to,evidenceType,voltageV,limitKa,
  manufacturer,documentId,revision,page,sourceUrl,
  upstreamSkuSnapshot:pair.upstreamSku,downstreamSkuSnapshot:pair.downstreamSku,
  supplyFingerprint:pair.supplyFingerprint});
 const old=epCoordNormalizeV1(project,project.deviceCoordinationEvidenceV1??[]);
 return [...old.filter(x=>x.from!==from||x.to!==to||x.evidenceType!==evidenceType),record];
}
function epCoordClearV1(project,from,to,type){
 return epCoordNormalizeV1(project,project.deviceCoordinationEvidenceV1??[])
  .filter(x=>x.from!==from||x.to!==to||x.evidenceType!==type);
}
function epCoordAuditV1(project,lookup){
 const rows=[],issues=[],add=(code,level='UNKNOWN',data={})=>issues.push({code,level,...data});
 const finish=()=>({schema:'electropanel.device.coordination.evidence.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,selectivityStatus:'NOT_ASSESSED',backupStatus:'NOT_ASSESSED',
  engineeringApproved:false,ready_for_installation:false});
 if(!project?.deviceSupplyV1){add('COORD_TOPOLOGY_UNDECLARED');return finish();}
 let entries;
 try{entries=epCoordNormalizeV1(project,project.deviceCoordinationEvidenceV1??[]);}
 catch(e){add(e.message,'BLOCKED');return finish();}
 for(const r of entries){
  const rowIssues=[],flag=(code,level='UNKNOWN')=>{
   const issue={code,level,objectId:r.to};issues.push(issue);rowIssues.push(issue);
  };
  let pair=null;
  try{pair=epCoordPairV1(project,r.from,r.to);}catch(_){
   flag('COORD_PAIR_NO_LONGER_DECLARED','BLOCKED');
  }
  if(pair&&pair.supplyFingerprint!==r.supplyFingerprint)
   flag('COORD_PATH_CHANGED','BLOCKED');
  if(pair&&(pair.upstreamSku!==r.upstreamSkuSnapshot||
     pair.downstreamSku!==r.downstreamSkuSnapshot))
   flag('COORD_ARTICLE_CHANGED','BLOCKED');
  const articles=[];
  for(const sku of [pair?.upstreamSku,pair?.downstreamSku]){
   if(!sku){flag('COORD_SELECTED_ARTICLE_MISSING');articles.push(null);continue;}
   if(typeof lookup!=='function'){flag('COORD_CATALOGUE_MISSING');articles.push(null);continue;}
   let a=null;try{a=lookup(sku)||null;}catch(_){flag('COORD_CATALOGUE_LOOKUP_FAILED','BLOCKED');}
   if(!a)flag('COORD_ARTICLE_NOT_FOUND','BLOCKED');
   else if(!['MCB','RCBO'].includes(a.kind))flag('COORD_KIND_NOT_OVERCURRENT','BLOCKED');
   articles.push(a);
  }
  if(articles.some(a=>a?.verificationStatus!=='VERIFIED'))
   flag('COORD_MANUFACTURER_FACTS_UNVERIFIED');
  const sourceStudy=(project.deviceFaultScenariosV1||[]).find(x=>x.deviceNodeId===r.to);
  let studyCurrent=false;
  if(!sourceStudy)flag('COORD_LOCAL_FAULT_STUDY_REQUIRED');
  else{
   if(sourceStudy.voltageV!==r.voltageV)
    flag('COORD_STUDY_VOLTAGE_DIFFERS','BLOCKED');
   try{
    const now=epDeviceFaultSupplyFingerprintV1(project,r.to);
    const selected=epDeviceFaultNodeV1(project,r.to).sku;
    studyCurrent=sourceStudy.supplyFingerprint===now&&
     sourceStudy.articleSkuSnapshot===selected;
    if(!studyCurrent)flag('COORD_LOCAL_FAULT_STUDY_STALE','BLOCKED');
   }catch(_){flag('COORD_LOCAL_FAULT_STUDY_INVALID','BLOCKED');}
  }
  if(r.evidenceType==='SELECTIVITY_LIMIT')
   flag('COORD_SELECTIVITY_CURVE_AND_SETTINGS_REVIEW_REQUIRED');
  else flag('COORD_BACKUP_TABLE_APPLICABILITY_REVIEW_REQUIRED');
  // The limit is a statement taken from declared source metadata, not
  // independently verified manufacturer tabulation.
  const numeric=studyCurrent&&sourceStudy&&sourceStudy.voltageV===r.voltageV?
   sourceStudy.ikMaxKa>r.limitKa?'DECLARED_FAULT_ABOVE_CLAIMED_LIMIT':
    'WITHIN_DECLARED_LIMIT_UNVERIFIED':'NOT_ASSESSED';
  if(numeric==='DECLARED_FAULT_ABOVE_CLAIMED_LIMIT')
   flag('COORD_DECLARED_LIMIT_EXCEEDED','BLOCKED');
  rows.push({...r,ikMaxKa:sourceStudy?.ikMaxKa??null,numeric,
   status:rowIssues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
   issues:rowIssues});
 }
 return finish();
}
function epCoordHtmlV1(project,lookup){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const links=(project?.deviceSupplyV1?.links||[]).filter(x=>
  /^(INCOMING|BRANCH):/.test(x.from)&&/^(INCOMING|BRANCH):/.test(x.to));
 const options=links.map(x=>'<option value="'+esc(x.from+'|'+x.to)+'">'+esc(x.from+' → '+x.to)+'</option>').join('');
 const report=epCoordAuditV1(project,lookup);
 const rows=report.rows.map(x=>'<tr><td>'+esc(x.from)+' → '+esc(x.to)+
  '</td><td>'+esc(x.evidenceType)+'</td><td>'+esc(x.limitKa)+
  '</td><td>'+esc(x.numeric)+'</td><td><button class="btn tiny" type="button" data-coord-clear="'+
  esc(x.from+'|'+x.to+'|'+x.evidenceType)+'">Удалить</button></td></tr>').join('');
 return '<details class="ep-coordination-evidence"><summary>Данные изготовителя: селективность / резервная защита · '+esc(report.status)+
  '</summary><p class="muted">Нужны точная пара артикулов, напряжение, предел, паспорт и редакция. Таблицы селективности и резервной защиты не взаимозаменяемы. Результат не подтверждает соответствие.</p>'+
  '<div class="form-grid"><label>Пара аппаратов<select id="coordPair">'+options+'</select></label>'+
  '<label>Вид данных<select id="coordType"><option value="SELECTIVITY_LIMIT">Селективность</option>'+
  '<option value="BACKUP_BREAKING_CAPACITY">Резервная защита</option></select></label>'+
  '<label>Напряжение, В<input id="coordVoltage" inputmode="decimal"></label>'+
  '<label>Заявленный предел, кА<input id="coordLimit" inputmode="decimal"></label>'+
  '<label>Изготовитель<input id="coordMaker" maxlength="150"></label>'+
  '<label>Документ<input id="coordDocument" maxlength="150"></label>'+
  '<label>Редакция<input id="coordRevision" maxlength="150"></label>'+
  '<label>Страница / таблица<input id="coordPage" maxlength="150"></label>'+
  '<label>Ссылка на паспорт<input id="coordUrl" maxlength="500" placeholder="https://..."></label></div>'+
  '<button class="btn" type="button" id="coordSave">Сохранить документированное заявление</button>'+ 
  '<button class="btn" type="button" id="coordCsv">Выгрузить CSV</button>'+
  '<div class="table-scroll"><table><thead><tr><th>Пара</th><th>Тип</th><th>кА</th><th>Сравнение</th><th></th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="5">Подтверждающие документы не заявлены</td></tr>')+'</tbody></table></div></details>';
}
function epCoordCsvV1(report){
 const cell=value=>{
  let v=String(value??'');
  if(/^\s*[=+\-@]/.test(v))v="'"+v;
  return '"'+v.replace(/"/g,'""')+'"';
 };
 const entries=[['Upstream','Downstream','Evidence type','Manufacturer','Document',
  'Revision','Page','Source URL','Study voltage V','Declared limit kA',
  'Local Ik max kA','Upstream SKU snapshot','Downstream SKU snapshot',
  'Comparison','Issue codes']];
 for(const r of report?.rows||[])entries.push([r.from,r.to,r.evidenceType,
  r.manufacturer,r.documentId,r.revision,r.page,r.sourceUrl,
  r.voltageV,r.limitKa,r.ikMaxKa,r.upstreamSkuSnapshot,
  r.downstreamSkuSnapshot,r.numeric,(r.issues||[]).map(x=>x.code).join(', ')]);
 return '\uFEFF'+entries.map(row=>row.map(cell).join(';')).join('\r\n');
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epCoordPairV1,epCoordRecordV1,epCoordNormalizeV1,epCoordDeclareV1,
 epCoordClearV1,epCoordAuditV1,epCoordHtmlV1,epCoordCsvV1};
