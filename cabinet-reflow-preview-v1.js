'use strict';
// Turn an optimizer proposal into the same immutable DIN comparison contract
// used for cabinet alternatives. Never mutates the original or proposal.
function epCabinetReflowPreviewV1(project,proposal,lookup){
 const fail=code=>({schema:'electropanel.cabinet.reflow.preview.1',
  status:'BLOCKED',code,rows:[],rails:[],summary:null,
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!proposal||proposal.status!=='REVIEW_REQUIRED'||!proposal.project||
  !Array.isArray(proposal.changes)||typeof epDraftBoardPlanV1!=='function'||
  typeof epCabinetOptionPreviewV1!=='function')
  return fail('REFLOW_PREVIEW_INPUT_INVALID');
 if(project.railCount!==proposal.project.railCount||
  project.railCapacity!==proposal.project.railCapacity)
  return fail('REFLOW_PREVIEW_SHAPE_CHANGED');
 let board;
 try{board=epDraftBoardPlanV1(proposal.project,lookup)}
 catch(_){return fail('REFLOW_PREVIEW_BOARD_FAILED');}
 if(board.status==='BLOCKED')return fail('REFLOW_PREVIEW_BOARD_BLOCKED');
 const rails=Array.from({length:project.railCount},(_,railIndex)=>({
  railIndex,devices:board.placements.filter(p=>p.railIndex===railIndex).map(p=>({
   deviceId:p.deviceId,startModule:p.startModule,modules:p.modules}))}));
 const compared=epCabinetOptionPreviewV1(project,{
  id:'cross-rail-proposal',railCount:project.railCount,
  modulesPerRail:project.railCapacity,rails},lookup);
 if(compared.status!=='REVIEW_REQUIRED')return fail(compared.code);
 const changeIds=new Set(proposal.changes.map(c=>c.deviceId));
 const computedIds=new Set(compared.rows.filter(r=>r.changed).map(r=>r.deviceId));
 if(changeIds.size!==proposal.changes.length||changeIds.size!==computedIds.size||
  [...changeIds].some(id=>!computedIds.has(id)))
  return fail('REFLOW_PREVIEW_CHANGE_MISMATCH');
 for(const c of proposal.changes){
  const row=compared.rows.find(r=>r.deviceId===c.deviceId);
  if(!row||row.fromRail!==c.from?.railIndex||row.fromSlot!==c.from?.startModule||
   row.toRail!==c.to?.railIndex||row.toSlot!==c.to?.startModule)
   return fail('REFLOW_PREVIEW_POSITION_MISMATCH');
 }
 return {...compared,schema:'electropanel.cabinet.reflow.preview.1',
  code:compared.summary.moved?'REFLOW_PREVIEW_READY':'REFLOW_PREVIEW_NO_MOVES',
  beforeRelations:proposal.before,afterRelations:proposal.after,
  engineeringApproved:false,ready_for_installation:false,
  note:'Preview only; no electrical circuit changes or manufacturer cabinet approval.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetReflowPreviewV1};
