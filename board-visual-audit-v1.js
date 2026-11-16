'use strict';
function epBoardVisualAuditV1(project,lookup){
 const issues=[],rows=[];
 if(!project||typeof epDraftBoardPlanV1!=='function'||typeof epDeviceVisualEvidenceV1!=='function')
  return {status:'BLOCKED',rows,issues:[{code:'VISUAL_AUDIT_ENGINE_UNAVAILABLE',level:'BLOCKED'}],engineeringApproved:false};
 let plan;
 try{plan=epDraftBoardPlanV1(project,lookup)}catch(_){
  return {status:'BLOCKED',rows,issues:[{code:'VISUAL_AUDIT_LAYOUT_FAILED',level:'BLOCKED'}],engineeringApproved:false};
 }
 for(const p of plan.placements||[]){
  const branch=project.branchDevices?.find(x=>x.id===p.deviceId);
  const line=project.lines?.find(x=>x.id===(branch?.circuitId||p.deviceId));
  const shared=project.sharedDevices?.find(x=>x.id===p.deviceId);
  const source=shared||branch||line;
  const sku=source?.catalogSku||line?.catalogSku||'';
  const catalog=sku&&typeof lookup==='function'?lookup(sku):null;
  const visual=epDeviceVisualEvidenceV1({modules:p.modules,device:source?.label||line?.device},catalog);
  const evidence=visual.issues.slice();
  if(sku&&!catalog)evidence.push('VISUAL_SKU_NOT_FOUND');
  if(catalog&&Number.isInteger(catalog.modules)&&catalog.modules!==p.modules)evidence.push('VISUAL_PLACEMENT_WIDTH_MISMATCH');
  if(catalog&&catalog.sku&&catalog.sku!==sku)evidence.push('VISUAL_ARTICLE_ID_MISMATCH');
  const row={deviceId:p.deviceId,sku,railIndex:p.railIndex,startModule:p.startModule,
   modules:p.modules,visual,evidence};
  rows.push(row);
  for(const code of evidence)issues.push({code,deviceId:p.deviceId,level:
   code==='VISUAL_PLACEMENT_WIDTH_MISMATCH'||code==='VISUAL_ARTICLE_ID_MISMATCH'?'BLOCKED':'UNKNOWN'});
 }
 for(const source of [...(project.lines||[]),...(project.branchDevices||[]),...(project.sharedDevices||[])]){
  if(!source?.catalogSku)continue;
  if(typeof lookup!=='function'||!lookup(source.catalogSku)){
   if(!issues.some(x=>x.code==='VISUAL_SKU_NOT_FOUND'&&x.deviceId===source.id))
    issues.push({code:'VISUAL_SKU_NOT_FOUND',deviceId:source.id,level:'BLOCKED'});
  }
 }
 if(plan.status==='BLOCKED')issues.push({code:'VISUAL_LAYOUT_BLOCKED',level:'BLOCKED'});
 return {status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',rows,issues,
  verifiedCatalogueFaces:rows.filter(x=>x.visual.source==='CATALOG_DECLARED'&&!x.evidence.length).length,
  placeholders:rows.filter(x=>x.visual.source==='UNVERIFIED_PLACEHOLDER').length,
  engineeringApproved:false,photographVerified:false};
}
if(typeof module!=='undefined')module.exports={epBoardVisualAuditV1};
