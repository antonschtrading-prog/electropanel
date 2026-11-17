'use strict';
function epCabinetArticleReconciliationCsvV1(report){
 if(!report||report.schema!=='electropanel.cabinet.article.reconciliation.1'||
  !Array.isArray(report.rows))return {status:'BLOCKED',csv:null,
   issues:[{code:'ARTICLE_RECONCILIATION_REPORT_INVALID',level:'BLOCKED'}]};
 const safe=x=>{
  let s=String(x??'');
  if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const cols=['device_id','board_sku','bom_sku','visual_sku','modules',
  'rail_index','start_module','status','issue_codes','installation_approved'];
 const rows=[cols,...report.rows.map(x=>[x.deviceId,x.boardSku,x.bomSku,x.visualSku,
  x.modules,x.railIndex,x.startModule,x.status,(x.issues||[]).join('|'),'NO'])];
 return {schema:'electropanel.cabinet.article.reconciliation.csv.1',
  status:report.status==='BLOCKED'?'BLOCKED':'REVIEW_REQUIRED',
  csv:'\uFEFF'+rows.map(x=>x.map(safe).join(';')).join('\r\n')+'\r\n',
  rowCount:report.rows.length,issueCount:report.issues?.length||0,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCabinetArticleReconciliationCsvV1};
