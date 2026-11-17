'use strict';
// Procurement-facing inventory of front presentation evidence, not a compliance
// certificate or a list of manufacturer-authorized images.
function epCabinetFrontInventoryCsvV1(rows,lookup,resolve){
 const empty=code=>({schema:'electropanel.cabinet.front.inventory.csv.1',
  status:'BLOCKED',code,csv:null,rows:0,engineeringApproved:false});
 if(!Array.isArray(rows)||rows.length>5000||typeof lookup!=='function'||
  typeof resolve!=='function')return empty('FRONT_INVENTORY_INPUT_INVALID');
 const q=v=>{
  const raw=String(v??'');
  const safe=/^[=+@\-\t\r\n]/.test(raw)?"'"+raw:raw;
  return '"'+safe.replace(/"/g,'""')+'"';
 };
 const columns=['article','manufacturer','series','kind','modules','poles',
  'body_width_mm','front_status','front_issues','image_source','product_evidence',
  'installation_approved'];
 const seen=new Set(),data=[];
 for(const row of rows){
  const sku=row?.boardSku;
  if(typeof sku!=='string'||!sku.trim()||seen.has(sku))continue;
  seen.add(sku);
  let item=null,asset=null;
  try{item=lookup(sku);if(item)asset=resolve(item);}
  catch(_){item=null;asset=null;}
  const status=!item?'CATALOGUE_MISSING':asset?.status==='REVIEWED_IMAGE'?
   'REVIEWED_IMAGE':asset?.status==='ASSET_REJECTED'?'ASSET_REJECTED':'STYLIZED_ONLY';
  const issues=!item?'ARTICLE_NOT_IN_CATALOGUE':Array.isArray(asset?.issues)?
   asset.issues.join('|'):'';
  data.push([sku,item?.maker,item?.series,item?.kind,item?.modules,item?.poles,
   item?.widthMm,status,issues,asset?.image?.src,asset?.image?.productEvidenceUrl,'NO']);
 }
 data.sort((a,b)=>String(a[0]).localeCompare(String(b[0]),'ru'));
 const csv='\uFEFF'+[columns,...data].map(row=>row.map(q).join(';')).join('\r\n')+'\r\n';
 return {schema:'electropanel.cabinet.front.inventory.csv.1',status:'REVIEW_REQUIRED',
  code:'FRONT_INVENTORY_NOT_INSTALLATION_APPROVAL',csv,rows:data.length,
  engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCabinetFrontInventoryCsvV1};
