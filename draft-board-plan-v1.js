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
  if(slot+width>project.railCapacity){rail++;slot=0;}
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
if(typeof module!=='undefined'&&module.exports)module.exports={epDraftBoardPlanV1};
