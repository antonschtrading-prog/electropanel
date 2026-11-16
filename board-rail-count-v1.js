'use strict';
// Explicit cabinet DIN-row count change with full revalidation; no guessed enclosure dimensions.
function epBoardRailCountChangeV1(project,newRailCount,lookup,{preserve=true}={}){
 const fail=(code,issues=[])=>({project:null,status:'BLOCKED',code,issues,
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Number.isInteger(newRailCount)||newRailCount<1||newRailCount>100||
 !Number.isInteger(project.railCount)||!Number.isInteger(project.railCapacity)||
 project.railCount<1||project.railCapacity<1||typeof epDraftBoardPlanV1!=='function')
  return fail('RAIL_CHANGE_INVALID');
 let baseline;
 try{baseline=epDraftBoardPlanV1(project,lookup)}catch(_){return fail('RAIL_CHANGE_ENGINE_FAILED');}
 if(baseline.status==='BLOCKED')return fail('RAIL_CHANGE_BASELINE_BLOCKED',baseline.issues);
 const next=JSON.parse(JSON.stringify(project));
 next.railCount=newRailCount;
 let cabinetReplanned=false;
 if(project.cabinetGeometryV1&&newRailCount!==project.railCount){
  if(typeof epCabinetGeometryNormalizeV1!=='function'||typeof epCabinetAutoZonesV1!=='function')
   return fail('CABINET_GEOMETRY_ENGINE_UNAVAILABLE');
  let original;
  try{original=epCabinetGeometryNormalizeV1(project.cabinetGeometryV1);}
  catch(_){return fail('CABINET_GEOMETRY_INVALID');}
  if(!original.planning)return fail('CABINET_MANUAL_ZONES_REPLAN_REQUIRED');
  const prop=epCabinetAutoZonesV1({
   interiorWidthMm:original.interior.widthMm,interiorHeightMm:original.interior.heightMm,
   interiorDepthMm:original.interior.depthMm,...original.planning
  },newRailCount,project.railCapacity);
  if(prop.status==='BLOCKED')return fail('CABINET_NEW_RAIL_ZONE_NOT_FIT',prop.issues);
  next.cabinetGeometryV1=prop.geometry;cabinetReplanned=true;
 }
 if(preserve){
  // Freeze every current position. A reduced cabinet must reject out-of-range apparatus.
  next.manualLayoutV1=baseline.placements.map(p=>({deviceId:p.deviceId,railIndex:p.railIndex,startModule:p.startModule}));
 }else{
  // An explicit repack is allowed; electrical order and device assignments remain unchanged.
  delete next.manualLayoutV1;
 }
 const result=epDraftBoardPlanV1(next,lookup);
 if(result.status==='BLOCKED')return fail('RAIL_CHANGE_NOT_FIT',result.issues);
 if(result.placements.length!==baseline.placements.length)return fail('RAIL_CHANGE_LOST_DEVICE');
 if(preserve){
  for(const old of baseline.placements){
   const current=result.placements.find(x=>x.deviceId===old.deviceId);
   if(!current||current.railIndex!==old.railIndex||current.startModule!==old.startModule)
    return fail('RAIL_CHANGE_MOVED_ANCHOR');
  }
 }
 return {project:next,status:'REVIEW_REQUIRED',code:'RAIL_COUNT_UPDATED',
  from:project.railCount,to:newRailCount,placements:result.placements,cabinetReplanned,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epBoardRailCountChangeV1};
