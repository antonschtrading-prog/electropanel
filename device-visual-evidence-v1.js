'use strict';
// Visual labels are catalogue evidence, not manufacturer-certified product photography.
function epDeviceVisualEvidenceV1(line,device){
 const str=x=>typeof x==='string'?x.trim():'';
 const known=!!(device&&str(device.sku)&&str(device.maker)&&str(device.series));
 const sku=known?str(device.sku):'';
 const maker=known?str(device.maker):'DIN';
 const series=known?str(device.series):'Условный аппарат';
 const mark=known?str(device.label)||sku:str(line?.device)||str(line?.label)||'—';
 const kind=known?str(device.kind)||'UNKNOWN':'UNKNOWN';
 const poles=known&&Number.isInteger(device.poles)&&device.poles>0?device.poles:null;
 const modules=known&&Number.isInteger(device.modules)&&device.modules>0?device.modules:null;
 const source=known?'CATALOG_DECLARED':'UNVERIFIED_PLACEHOLDER';
 const appearance=known&&/^[a-z0-9_-]{1,30}$/i.test(str(device.appearance))?device.appearance:'generic';
 const issues=[];
 if(!known)issues.push('VISUAL_CATALOG_NOT_LINKED');
 if(known&&!modules)issues.push('VISUAL_WIDTH_NOT_VERIFIED');
 if(known&&!poles)issues.push('VISUAL_POLES_NOT_VERIFIED');
 if(known&&line?.modules!=null&&modules&&Number(line.modules)!==modules)issues.push('VISUAL_WIDTH_MISMATCH');
 return {maker,series,sku,mark,kind,poles,modules,appearance,source,issues,
  status:issues.length?'REVIEW_REQUIRED':'CATALOG_DECLARED',
  photographVerified:false,dimensionsVerified:false,engineeringApproved:false};
}
function epDeviceVisualEvidenceHtmlV1(v){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 return '<span class="ep-visual-evidence" title="'+esc(v.source==='CATALOG_DECLARED'?
 'Данные каталога; изображение условное':'Артикул производителя не подтверждён')+'">'+
 esc(v.source==='CATALOG_DECLARED'?'Каталог · условный вид':'Условный вид · нет артикула')+'</span>';
}
if(typeof module!=='undefined')module.exports={epDeviceVisualEvidenceV1,epDeviceVisualEvidenceHtmlV1};
