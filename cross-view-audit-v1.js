'use strict';
// Cross-view consistency audit. Read-only, fail-closed, no installation approval.
function epCrossViewAuditV1(project, protection, board, bom) {
 const issues=[], add=(code,level='BLOCKED',lineId=null)=>issues.push({code,level,lineId});
 const lines=project?.lines;
 const bomItems=Array.isArray(bom?.items)?bom.items:null;
 if(!Array.isArray(lines)||lines.length>1000)
  return {schema:'electropanel.crossview.audit.1',status:'BLOCKED',issues:[{code:'PROJECT_INVALID',level:'BLOCKED',lineId:null}],engineeringApproved:false,ready_for_installation:false};
 const ids=new Set();
 for(const l of lines) {
  if(!l||typeof l.id!=='string'||!l.id||ids.has(l.id))add('LINE_ID_INVALID_OR_DUPLICATE','BLOCKED',l?.id??null);
  else ids.add(l.id);
 }
 if(!protection||!Array.isArray(protection.rows))add('PROTECTION_VIEW_MISSING');
 if(!board||!Array.isArray(board.placements))add('BOARD_VIEW_MISSING');
 const pRows=protection?.rows||[], placements=board?.placements||[];
 const pIds=new Set(), placed=new Set(), deviceIds=new Set();
 for(const row of pRows){
  if(!row||!ids.has(row.lineId)||pIds.has(row.lineId)){add('PROTECTION_ROW_ORPHAN_OR_DUPLICATE','BLOCKED',row?.lineId??null);continue;}
  pIds.add(row.lineId);
  const line=lines.find(l=>l?.id===row.lineId);
  if((line.catalogSku||null)!==(row.selectedSku||null))add('PROTECTION_SKU_STALE','BLOCKED',row.lineId);
  if(row.status!=='BLOCKED'&&row.status!=='UNKNOWN')add('UNSUPPORTED_PROTECTION_STATUS','BLOCKED',row.lineId);
 }
 for(const id of ids)if(!pIds.has(id))add('PROTECTION_ROW_MISSING','BLOCKED',id);
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:null;
 const sharedDevices=Array.isArray(project.sharedDevices)?project.sharedDevices:[];
 const sharedIds=new Set(),placedShared=new Set();
 for(const d of sharedDevices){
  if(!d||typeof d.id!=='string'||!d.id||sharedIds.has(d.id))
   add('SHARED_DEVICE_ID_INVALID_OR_DUPLICATE','BLOCKED',d?.id??null);
  else sharedIds.add(d.id);
 }
 for(const item of placements){
  if(!item||typeof item.deviceId!=='string'||!Number.isInteger(item.railIndex)||!Number.isInteger(item.startModule)||!Number.isInteger(item.modules)||item.railIndex<0||item.startModule<0||item.modules<1){add('PLACEMENT_INVALID');continue;}
  if(deviceIds.has(item.deviceId))add('PLACEMENT_DEVICE_DUPLICATE','BLOCKED',item.deviceId);
  deviceIds.add(item.deviceId);
  if(item.kind==='shared'){
   const matches=sharedDevices.filter(d=>d?.id===item.deviceId);
   if(matches.length!==1)add('PLACEMENT_SHARED_UNMATCHED','BLOCKED',item.deviceId);
   else{
    placedShared.add(item.deviceId);
    if(item.article!==(matches[0].catalogSku||null))add('PLACEMENT_SHARED_SKU_STALE','BLOCKED',item.deviceId);
    if(item.modules!==matches[0].modules)add('PLACEMENT_SHARED_WIDTH_MISMATCH','BLOCKED',item.deviceId);
   }
  }else if(item.kind!=='branch')add('PLACEMENT_KIND_INVALID','BLOCKED',item.deviceId);
  if(item.kind==='branch'){
   const matching=branches?branches.filter(b=>b?.id===item.deviceId):lines.filter(l=>l?.id===item.deviceId);
   if(matching.length!==1){add('PLACEMENT_BRANCH_UNMATCHED','BLOCKED',item.deviceId);continue;}
   const id=branches?matching[0].circuitId:matching[0].id;
   if(placed.has(id))add('PLACEMENT_BRANCH_DUPLICATE','BLOCKED',id);
   placed.add(id);
   const line=lines.find(l=>l?.id===id);
   if(!line||item.article!==(line.catalogSku||null))add('PLACEMENT_SKU_STALE','BLOCKED',id);
  }
 }
 for(const id of ids)if(!placed.has(id))add('PLACEMENT_BRANCH_MISSING','BLOCKED',id);
 for(const id of sharedIds)if(!placedShared.has(id))add('PLACEMENT_SHARED_MISSING','BLOCKED',id);
 if(board&&Number.isInteger(board.capacityPerRail)&&Number.isInteger(board.rails)&&board.rails>0&&board.rails<=100&&board.capacityPerRail>0&&board.capacityPerRail<=200){
  const occupied=new Set();
  for(const p of placements){
   if(!Number.isInteger(p.railIndex)||!Number.isInteger(p.startModule)||!Number.isInteger(p.modules))continue;
   if(p.railIndex<0||p.railIndex>=board.rails||p.startModule<0||p.startModule+p.modules>board.capacityPerRail)add('PLACEMENT_OUT_OF_BOUNDS');
   for(let m=p.startModule;m<p.startModule+p.modules&&m<p.startModule+1000;m++){
    const key=p.railIndex+':'+m;
    if(occupied.has(key))add('PLACEMENT_OVERLAP');
    occupied.add(key);
   }
  }
 }else add('BOARD_CAPACITY_UNVERIFIED','UNKNOWN');
 if(!bomItems)add('BOM_VIEW_MISSING');
 else {
  const expected=new Map();
  const addExpected=(sku,id)=>{if(typeof sku!=='string'||!sku)return;
   const a=expected.get(sku)||[];a.push(id);expected.set(sku,a);};
  for(const l of lines)if(l)addExpected(l.catalogSku,l.id);
  for(const d of Array.isArray(project.sharedDevices)?project.sharedDevices:[])if(d)addExpected(d.catalogSku,d.id);
  const seen=new Set();
  for(const item of bomItems){
   if(!item||typeof item.key!=='string'||seen.has(item.key)){
    add('BOM_ROW_INVALID_OR_DUPLICATE');continue;
   }
   seen.add(item.key);
   const owners=expected.get(item.key)||[];
   if(!owners.length)add('BOM_ARTICLE_ORPHAN','BLOCKED',item.key);
   if(item.quantity!==owners.length)add('BOM_QUANTITY_MISMATCH','BLOCKED',item.key);
   if(!Array.isArray(item.owners)||item.owners.length!==owners.length||
    owners.some(owner=>!item.owners.includes(owner)))add('BOM_OWNERS_MISMATCH','BLOCKED',item.key);
  }
  for(const sku of expected.keys())if(!seen.has(sku))add('BOM_ARTICLE_MISSING','BLOCKED',sku);
 }
 if(board?.status==='BLOCKED')add('BOARD_HAS_BLOCKING_ISSUES');
 if(protection?.status==='BLOCKED')add('PROTECTION_HAS_BLOCKING_ISSUES');
 // This audit never certifies normative calculations or physical installation.
 return {schema:'electropanel.crossview.audit.1',status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,checkedCircuits:ids.size,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCrossViewAuditV1};
