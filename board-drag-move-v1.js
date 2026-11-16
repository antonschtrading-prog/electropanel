'use strict';
// Dragging an apparatus must change its DIN position, never silently reorder circuits.
function epBoardDragMoveV1(project,sourceDeviceId,targetDeviceId,lookup){
 const fail=(code,issues=[])=>({project:null,status:'BLOCKED',code,issues,engineeringApproved:false});
 if(!project||typeof sourceDeviceId!=='string'||typeof targetDeviceId!=='string'||
 !sourceDeviceId||!targetDeviceId)return fail('BOARD_DRAG_INVALID');
 if(sourceDeviceId===targetDeviceId)return fail('BOARD_DRAG_SAME_DEVICE');
 if(typeof epDraftBoardPlanV1!=='function'||typeof epMoveBoardDeviceV1!=='function')
  return fail('BOARD_DRAG_ENGINE_UNAVAILABLE');
 const before=epDraftBoardPlanV1(project,lookup);
 if(before.status==='BLOCKED')return fail('BOARD_DRAG_LAYOUT_BLOCKED',before.issues);
 const source=before.placements.find(x=>x.deviceId===sourceDeviceId);
 const target=before.placements.find(x=>x.deviceId===targetDeviceId);
 if(!source||!target)return fail('BOARD_DRAG_DEVICE_NOT_PLACED');
 if(source.modules!==target.modules)return fail('BOARD_DRAG_WIDTH_MISMATCH');
 // Exchange equal-width devices; all other positions remain fixed.
 const next=JSON.parse(JSON.stringify(project));
 next.manualLayoutV1=before.placements.map(x=>({
  deviceId:x.deviceId,
  railIndex:x.deviceId===sourceDeviceId?target.railIndex:
   x.deviceId===targetDeviceId?source.railIndex:x.railIndex,
  startModule:x.deviceId===sourceDeviceId?target.startModule:
   x.deviceId===targetDeviceId?source.startModule:x.startModule
 }));
 const after=epDraftBoardPlanV1(next,lookup);
 const blockers=after.issues.filter(x=>x.level==='BLOCKED');
 if(blockers.length)return fail('BOARD_DRAG_POSITION_BLOCKED',blockers);
 const changed=after.placements.find(x=>x.deviceId===sourceDeviceId);
 const displaced=after.placements.find(x=>x.deviceId===targetDeviceId);
 if(!changed||!displaced||changed.railIndex!==target.railIndex||changed.startModule!==target.startModule||
 displaced.railIndex!==source.railIndex||displaced.startModule!==source.startModule)
  return fail('BOARD_DRAG_POSITION_NOT_PRESERVED');
 return {project:next,status:'REVIEW_REQUIRED',code:'BOARD_DRAG_SWAPPED',issues:after.issues,
  moved:[sourceDeviceId,targetDeviceId],engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epBoardDragMoveV1};
