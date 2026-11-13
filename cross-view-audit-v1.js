'use strict';
// Cross-view consistency audit. Read-only, fail-closed, no installation approval.
function epCrossViewAuditV1(project, protection, board, bom) {
 const issues=[], add=(code,level='BLOCKED',lineId=null)=>issues.push({code,level,lineId});
 const lines=project?.lines;
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
 const pIds=new Set(), placed=new Set();
 for(const row of pRows){
  if(!row||!ids.has(row.lineId)||pIds.has(row.lineId)){add('PROTECTION_ROW_ORPHAN_OR_DUPLICATE','BLOCKED',row?.lineId??null);continue;}
  pIds.add(row.lineId);
  const line=lines.find(l=>l?.id===row.lineId);
  if((line.catalogSku||null)!==(row.selectedSku||null))add('PROTECTION_SKU_STALE','BLOCKED',row.lineId);
  if(row.status!=='BLOCKED'&&row.status!=='UNKNOWN')add('UNSUPPORTED_PROTECTION_STATUS','BLOCKED',row.lineId);
 }
 for(const id of ids)if(!pIds.has(id))add('PROTECTION_ROW_MISSING','BLOCKED',id);
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:null;
 for(const item of placements){
  if(!item||typeof item.deviceId!=='string'||!Number.isInteger(item.railIndex)||!Number.isInteger(item.startModule)||!Number.isInteger(item.modules)||item.railIndex<0||item.startModule<0||item.modules<1){add('PLACEMENT_INVALID');continue;}
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
 if(board&&Number.isInteger(board.capacityPerRail)&&Number.isInteger(board.rails)){
  const occupied=new Set();
  for(const p of placements){
   if(!Number.isInteger(p.railIndex)||!Number.isInteger(p.startModule)||!Number.isInteger(p.modules))continue;
   if(p.railIndex>=board.rails||p.startModule+p.modules>board.capacityPerRail)add('PLACEMENT_OUT_OF_BOUNDS');
   for(let m=p.startModule;m<p.startModule+p.modules&&m<p.startModule+1000;m++){
    const key=p.railIndex+':'+m;
    if(occupied.has(key))add('PLACEMENT_OVERLAP');
    occupied.add(key);
   }
  }
 }else add('BOARD_CAPACITY_UNVERIFIED','UNKNOWN');
 if(bom===null||bom===undefined)add('BOM_NOT_PROVIDED','UNKNOWN');
 // This audit never certifies normative calculations or physical installation.
 return {schema:'electropanel.crossview.audit.1',status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,checkedCircuits:ids.size,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCrossViewAuditV1};
