'use strict';
// Explicit, non-destructive DIN reflow. Keeps valid manual anchors; never changes
// circuit order, catalogue assignments, electrical ratings or source project.
function epBoardReflowV1(project,lookup,options={}){
 const fail=(code,issues=[])=>({project:null,status:'BLOCKED',code,issues,
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.sharedDevices)||
 !Number.isInteger(project.railCount)||!Number.isInteger(project.railCapacity)||
 project.railCount<1||project.railCount>100||project.railCapacity<1||project.railCapacity>200)
  return fail('REFLOW_INPUT_INVALID');
 if(typeof epDraftBoardPlanV1!=='function')return fail('REFLOW_ENGINE_UNAVAILABLE');
 const mode=options.mode||'compact';
 if(!['compact','preserve'].includes(mode))return fail('REFLOW_MODE_INVALID');
 const keepAnchors=mode==='preserve';
 let baseline;
 try{baseline=epDraftBoardPlanV1(project,lookup)}catch(_){return fail('REFLOW_ENGINE_FAILED');}
 const hard=baseline.issues.filter(x=>x.level==='BLOCKED');
 // A project with invalid manual anchors must be fixed, not silently rewritten.
 if(hard.length)return fail('REFLOW_BASELINE_BLOCKED',hard);
 const devices=baseline.placements;
 const capacity=project.railCapacity,rails=project.railCount;
 const slots=Array.from({length:rails},()=>Array(capacity).fill(null));
 const fixed=new Map();
 if(keepAnchors){
  for(const a of Array.isArray(project.manualLayoutV1)?project.manualLayoutV1:[]){
   const d=devices.find(x=>x.deviceId===a.deviceId);
   if(!d)continue;
   if(fixed.has(d.deviceId))return fail('REFLOW_DUPLICATE_ANCHOR');
   fixed.set(d.deviceId,a);
   for(let x=a.startModule;x<a.startModule+d.modules;x++){
    if(!slots[a.railIndex]||slots[a.railIndex][x]!==null)return fail('REFLOW_ANCHOR_CONFLICT');
    slots[a.railIndex][x]=d.deviceId;
   }
  }
 }
 const positions=[];
 for(const d of devices){
  const width=d.modules;
  if(!Number.isInteger(width)||width<1||width>capacity)return fail('REFLOW_WIDTH_INVALID');
  let pos=fixed.get(d.deviceId);
  if(!pos){
   outer:for(let r=0;r<rails;r++)for(let x=0;x+width<=capacity;x++){
    if(slots[r].slice(x,x+width).every(y=>y===null)){
     pos={railIndex:r,startModule:x};break outer;
    }
   }
  }
  if(!pos)return fail('REFLOW_CAPACITY_EXCEEDED');
  for(let x=pos.startModule;x<pos.startModule+width;x++)slots[pos.railIndex][x]=d.deviceId;
  positions.push({deviceId:d.deviceId,railIndex:pos.railIndex,startModule:pos.startModule});
 }
 const copy=JSON.parse(JSON.stringify(project));
 copy.manualLayoutV1=positions;
 const verified=epDraftBoardPlanV1(copy,lookup);
 const errors=verified.issues.filter(x=>x.level==='BLOCKED');
 if(errors.length)return fail('REFLOW_VERIFICATION_BLOCKED',errors);
 for(const p of positions){
  const actual=verified.placements.find(x=>x.deviceId===p.deviceId);
  if(!actual||actual.railIndex!==p.railIndex||actual.startModule!==p.startModule)
   return fail('REFLOW_POSITION_MISMATCH');
 }
 if(copy.cabinetGeometryV1&&typeof epCabinetPlacementChangeAuditV1==='function'){
  const cabinet=epCabinetPlacementChangeAuditV1(project,copy,lookup);
  if(cabinet.status==='BLOCKED')return fail('REFLOW_CABINET_FIT_CONFLICT',cabinet.newIssues);
 }
 const changes=positions.filter(p=>{
  const old=devices.find(d=>d.deviceId===p.deviceId);
  return old.railIndex!==p.railIndex||old.startModule!==p.startModule;
 }).map(p=>({deviceId:p.deviceId,from:devices.find(d=>d.deviceId===p.deviceId),
  to:p}));
 return {project:copy,status:'REVIEW_REQUIRED',code:'REFLOW_APPLIED',
  changes,positions,engineeringApproved:false,ready_for_installation:false,
  note:'Layout positions only. No electrical or installation approval.'};
}
if(typeof module!=='undefined')module.exports={epBoardReflowV1};
