'use strict';
// Human-readable DIN placement schedule; every value is sourced from the draft board.
function epBoardPlacementCsvV1(project,lookup){
 const cols=['device_id','kind','catalog_sku','rail_number','start_module_number','width_modules','end_module_number','layout_status'];
 const quote=x=>{
  let s=String(x??'');
  if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const issues=[];
 if(typeof epDraftBoardPlanV1!=='function'||!project)return {csv:cols.map(quote).join(';')+'\r\n',status:'BLOCKED',issues:[{code:'BOARD_EXPORT_ENGINE_UNAVAILABLE'}],engineeringApproved:false,ready_for_installation:false};
 let board;
 try{board=epDraftBoardPlanV1(project,lookup)}catch(_){return {csv:cols.map(quote).join(';')+'\r\n',status:'BLOCKED',issues:[{code:'BOARD_EXPORT_ENGINE_FAILED'}],engineeringApproved:false,ready_for_installation:false};}
 const lines=[cols.map(quote).join(';')];
 for(const p of board.placements||[]){
  lines.push([p.deviceId,p.kind,p.article,p.railIndex+1,p.startModule+1,p.modules,p.startModule+p.modules,
   board.status].map(quote).join(';'));
 }
 for(const issue of board.issues||[])issues.push({code:issue.code,level:issue.level,id:issue.id??null});
 return {csv:lines.join('\r\n')+'\r\n',status:board.status==='BLOCKED'?'BLOCKED':'REVIEW_REQUIRED',
  issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epBoardPlacementCsvV1};
