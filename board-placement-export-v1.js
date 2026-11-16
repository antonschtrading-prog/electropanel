'use strict';
// Human-readable DIN placement schedule; every value is sourced from the draft board.
function epBoardPlacementCsvV1(project,lookup){
 const cols=['device_id','kind','catalog_sku','rail_number','start_module_number','width_modules','end_module_number','layout_status',
  'nominal_slot_width_mm','body_width_mm','body_height_mm','body_depth_mm','nominal_remaining_mm','physical_width_status','visual_asset_status'];
 const quote=x=>{
  let s=String(x??'');
  if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;
  return '"'+s.replace(/"/g,'""')+'"';
 };
 const issues=[];
 if(typeof epDraftBoardPlanV1!=='function'||!project)return {csv:cols.map(quote).join(';')+'\r\n',status:'BLOCKED',issues:[{code:'BOARD_EXPORT_ENGINE_UNAVAILABLE'}],engineeringApproved:false,ready_for_installation:false};
 let board;
 try{board=epDraftBoardPlanV1(project,lookup)}catch(_){return {csv:cols.map(quote).join(';')+'\r\n',status:'BLOCKED',issues:[{code:'BOARD_EXPORT_ENGINE_FAILED'}],engineeringApproved:false,ready_for_installation:false};}
 const physical=typeof epDinPhysicalEnvelopeV1==='function'?epDinPhysicalEnvelopeV1(board,lookup):null;
 const byDevice=new Map((physical?.rows||[]).map(r=>[r.deviceId,r]));
 const lines=[cols.map(quote).join(';')];
 for(const p of board.placements||[]){
  const row=byDevice.get(p.deviceId);
  let device=null;
  try{device=p.article&&typeof lookup==='function'?lookup(p.article):null;}catch(_){}
  const asset=device&&typeof epManufacturerFrontResolveV1==='function'?epManufacturerFrontResolveV1(device):null;
  const widthStatus=!row?'NOT_CHECKED':row.issues.some(x=>['DIN_ENVELOPE_BODY_OVERFLOW','DIN_ENVELOPE_MODULE_MISMATCH','DIN_ENVELOPE_WIDTH_INVALID'].includes(x))?'BLOCKED':
   row.bodyWidthMm===null?'UNKNOWN':'DECLARED_WITHIN_SLOT';
  lines.push([p.deviceId,p.kind,p.article,p.railIndex+1,p.startModule+1,p.modules,p.startModule+p.modules,
   board.status,p.modules*18,row?.bodyWidthMm??null,row?.bodyHeightMm??null,row?.bodyDepthMm??null,
   row?.nominalFreeWidthMm??null,widthStatus,asset?.status||'STYLIZED_ONLY'].map(quote).join(';'));
 }
 for(const issue of board.issues||[])issues.push({code:issue.code,level:issue.level,id:issue.id??null});
 for(const issue of physical?.issues||[])if(issue.code!=='DIN_ENCLOSURE_CLEARANCES_NOT_CHECKED')
  issues.push({code:issue.code,level:issue.level,id:issue.deviceId??null});
 return {csv:lines.join('\r\n')+'\r\n',status:board.status==='BLOCKED'||physical?.status==='BLOCKED'?'BLOCKED':'REVIEW_REQUIRED',
  issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epBoardPlacementCsvV1};
