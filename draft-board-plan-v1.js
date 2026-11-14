'use strict';
// Draft-only planning. Never chooses electrical protection or invents catalogue data.
function epDraftBoardPlanV1(project,lookupSku){
 const issues=[],placements=[],add=(code,id=null,level='UNKNOWN')=>issues.push({code,id,level});
 if(!project||!Array.isArray(project.lines)||!Number.isInteger(project.railCount)||
 !Number.isInteger(project.railCapacity)||project.railCount<1||project.railCapacity<1||
 project.railCount>100||project.railCapacity>200)
 return {status:'BLOCKED',issues:[{code:'BOARD_INPUT_INVALID',level:'BLOCKED'}],
 placements:[],engineeringApproved:false,ready_for_installation:false};
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:null;
 const devices=Array.isArray(project.sharedDevices)?project.sharedDevices.map(d=>({
  id:d?.id,modules:d?.modules,article:d?.catalogSku??null,kind:'shared'
 })):[];
 const lineIds=new Set(project.lines.map(l=>l?.id));
 if(branches){
  const branchRefs=new Set();
  for(const b of branches){
   if(!b||!lineIds.has(b.circuitId)){add('ORPHAN_BRANCH_DEVICE',b?.id??null,'BLOCKED');continue;}
   if(branchRefs.has(b.circuitId))add('DUPLICATE_BRANCH_FOR_CIRCUIT',b.circuitId,'BLOCKED');
   branchRefs.add(b.circuitId);
  }
 }
 for(const line of project.lines){
  const branch=branches?.find(b=>b?.circuitId===line?.id);
  if(branches&&!branch)add('MISSING_BRANCH_DEVICE',line?.id??null,'BLOCKED');
  if(branch&&branch.modules!==line?.modules)add('BRANCH_LINE_WIDTH_CONFLICT',line?.id??null,'BLOCKED');
  devices.push({id:branch?.id??line?.id,modules:branch?.modules??line?.modules,
   article:line?.catalogSku??null,kind:'branch'});
 }
 const ids=new Set();let rail=0,slot=0;
 const manual=project.manualLayoutV1;
 const fixed=new Map(), occupied=Array.from({length:project.railCount},()=>new Set());
 if(manual!==undefined&&!Array.isArray(manual))add('MANUAL_LAYOUT_INVALID',null,'BLOCKED');
 for(const entry of Array.isArray(manual)?manual:[]){
  if(!entry||typeof entry.deviceId!=='string'||fixed.has(entry.deviceId)){
   add('MANUAL_LAYOUT_DUPLICATE_OR_INVALID',entry?.deviceId,'BLOCKED');continue;
  }
  fixed.set(entry.deviceId,entry);
  const device=devices.find(x=>x.id===entry.deviceId);
  if(!device){add('MANUAL_LAYOUT_ORPHAN',entry.deviceId,'BLOCKED');continue;}
  const {railIndex:r,startModule:x}=entry,w=device.modules;
  if(!Number.isInteger(r)||!Number.isInteger(x)||r<0||r>=project.railCount||x<0||!Number.isInteger(w)||w<1||x+w>project.railCapacity){
   add('MANUAL_LAYOUT_OUT_OF_BOUNDS',entry.deviceId,'BLOCKED');continue;
  }
  for(let j=x;j<x+w;j++){
   if(occupied[r].has(j))add('MANUAL_LAYOUT_OVERLAP',entry.deviceId,'BLOCKED');
   occupied[r].add(j);
  }
 }

 for(const d of devices){
  if(typeof d.id!=='string'||!d.id||ids.has(d.id)){add('DEVICE_ID_INVALID_OR_DUPLICATE',d.id,'BLOCKED');continue;}
  ids.add(d.id);
  let width=d.modules;
  if(d.article){
   let c=null;
   try{c=typeof lookupSku==='function'?lookupSku(d.article):null;}catch(_){add('ARTICLE_LOOKUP_FAILED',d.id,'BLOCKED');}
   if(!c){add('ARTICLE_UNKNOWN',d.id,'BLOCKED');continue;}
   if(!Number.isInteger(c.modules)||c.modules<1){add('CATALOG_MODULES_UNKNOWN',d.id,'BLOCKED');continue;}
   if(width!==c.modules)add('CATALOG_WIDTH_CONFLICT',d.id,'BLOCKED');
   width=c.modules;
  }else add('DEVICE_ARTICLE_NOT_SELECTED',d.id);
  if(!Number.isInteger(width)||width<1||width>project.railCapacity){
   add('DEVICE_WIDTH_INVALID',d.id,'BLOCKED');continue;
  }
  const chosen=fixed.get(d.id);
  if(chosen){
   if(!Number.isInteger(chosen.railIndex)||!Number.isInteger(chosen.startModule)||chosen.railIndex<0||chosen.railIndex>=project.railCount||chosen.startModule<0||chosen.startModule+width>project.railCapacity)continue;
   placements.push({deviceId:d.id,kind:d.kind,article:d.article,railIndex:chosen.railIndex,startModule:chosen.startModule,modules:width});continue;
  }
  if(fixed.size){
   let found=null;
   for(let r=0;r<project.railCount&&!found;r++)for(let x=0;x+width<=project.railCapacity;x++){
    if(Array.from({length:width},(_,i)=>x+i).every(i=>!occupied[r].has(i))){found={r,x};break;}
   }
   if(!found){add('RAIL_CAPACITY_EXCEEDED',d.id,'BLOCKED');continue;}
   rail=found.r;slot=found.x;
   for(let j=slot;j<slot+width;j++)occupied[rail].add(j);
  }else if(slot+width>project.railCapacity){rail++;slot=0;}
  if(rail>=project.railCount){add('RAIL_CAPACITY_EXCEEDED',d.id,'BLOCKED');continue;}
  placements.push({deviceId:d.id,kind:d.kind,article:d.article,railIndex:rail,
   startModule:slot,modules:width});
  slot+=width;
 }
 if(!devices.length)add('NO_DEVICES',null,'BLOCKED');
 add('PHYSICAL_CLEARANCE_THERMAL_AND_WIRING_NOT_VERIFIED');
 return {status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,placements,rails:project.railCount,capacityPerRail:project.railCapacity,
  engineeringApproved:false,ready_for_installation:false,
  note:'Draft layout only. No electrical design or installation approval.'};
}
function epMoveBoardDeviceV1(project,deviceId,railIndex,startModule,lookup){
 const current=epDraftBoardPlanV1(project,lookup);
 if(!current.placements.some(x=>x.deviceId===deviceId))return {project:null,code:'DEVICE_NOT_PLACED'};
 const copy=JSON.parse(JSON.stringify(project));
 // Freeze all current positions, so moving one apparatus never silently relocates another.
 copy.manualLayoutV1=current.placements.map(x=>({deviceId:x.deviceId,railIndex:x.deviceId===deviceId?railIndex:x.railIndex,startModule:x.deviceId===deviceId?startModule:x.startModule}));
 const next=epDraftBoardPlanV1(copy,lookup);
 const blockers=next.issues.filter(x=>x.level==='BLOCKED');
 if(blockers.length)return {project:null,code:blockers[0].code,issues:blockers};
 return {project:copy,status:'REVIEW_REQUIRED',code:'POSITION_UPDATED'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDraftBoardPlanV1,epMoveBoardDeviceV1};
