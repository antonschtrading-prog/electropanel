'use strict';
// Compare a computed alternative against the CURRENT board without mutating either.
function epCabinetOptionPreviewV1(project,option,lookup){
 const fail=(code)=>({schema:'electropanel.cabinet.option.preview.1',status:'BLOCKED',code,
  rows:[],rails:[],summary:null,engineeringApproved:false,ready_for_installation:false});
 if(!project||!option||!Array.isArray(option.rails)||!Number.isInteger(option.railCount)||
  !Number.isInteger(option.modulesPerRail)||option.railCount<1||option.modulesPerRail<1||
  typeof epDraftBoardPlanV1!=='function')return fail('OPTION_PREVIEW_INPUT_INVALID');
 const seen=new Set(),positions=[],rails=[];
 for(const rail of option.rails){
  if(!rail||!Number.isInteger(rail.railIndex)||rail.railIndex<0||
   rail.railIndex>=option.railCount||!Array.isArray(rail.devices))
   return fail('OPTION_PREVIEW_RAIL_INVALID');
  const occupied=new Set(),items=[];
  for(const d of rail.devices){
   if(!d||typeof d.deviceId!=='string'||!d.deviceId||seen.has(d.deviceId)||
    !Number.isInteger(d.startModule)||d.startModule<0||
    !Number.isInteger(d.modules)||d.modules<1||
    d.startModule+d.modules>option.modulesPerRail)
    return fail('OPTION_PREVIEW_DEVICE_INVALID');
   seen.add(d.deviceId);
   for(let k=d.startModule;k<d.startModule+d.modules;k++){
    if(occupied.has(k))return fail('OPTION_PREVIEW_OVERLAP');
    occupied.add(k);
   }
   positions.push({deviceId:d.deviceId,railIndex:rail.railIndex,startModule:d.startModule});
   items.push({deviceId:d.deviceId,startModule:d.startModule,modules:d.modules});
  }
  rails.push({railIndex:rail.railIndex,capacity:option.modulesPerRail,occupied:occupied.size,
   free:option.modulesPerRail-occupied.size,devices:items});
 }
 if(new Set(rails.map(r=>r.railIndex)).size!==option.railCount)
  return fail('OPTION_PREVIEW_RAIL_COUNT_INVALID');
 let before,after;
 try{
  before=epDraftBoardPlanV1(project,lookup);
  const candidate=JSON.parse(JSON.stringify(project));
  candidate.railCount=option.railCount;candidate.railCapacity=option.modulesPerRail;
  delete candidate.cabinetGeometryV1;
  candidate.manualLayoutV1=positions;
  after=epDraftBoardPlanV1(candidate,lookup);
 }catch(_){return fail('OPTION_PREVIEW_ENGINE_FAILED');}
 if(before.status==='BLOCKED'||after.status==='BLOCKED'||
  after.placements.length!==positions.length||before.placements.length!==positions.length)
  return fail('OPTION_PREVIEW_PLACEMENTS_INVALID');
 const declared=new Map(option.rails.flatMap(r=>r.devices.map(d=>[d.deviceId,d])));
 const old=new Map(before.placements.map(p=>[p.deviceId,p]));
 const next=new Map(after.placements.map(p=>[p.deviceId,p]));
 const rows=[];
 for(const d of positions){
  const a=old.get(d.deviceId),b=next.get(d.deviceId);
  if(!a||!b||b.railIndex!==d.railIndex||b.startModule!==d.startModule||
   a.modules!==b.modules||a.article!==b.article||declared.get(d.deviceId)?.modules!==b.modules)
   return fail('OPTION_PREVIEW_IDENTITY_MISMATCH');
  const railChanged=a.railIndex!==b.railIndex;
  const slotChanged=a.startModule!==b.startModule;
  rows.push({deviceId:d.deviceId,article:b.article??null,modules:b.modules,
   fromRail:a.railIndex,fromSlot:a.startModule,toRail:b.railIndex,toSlot:b.startModule,
   railChanged,slotChanged,changed:railChanged||slotChanged});
 }
 rows.sort((a,b)=>a.toRail-b.toRail||a.toSlot-b.toSlot||a.deviceId.localeCompare(b.deviceId));
 const moved=rows.filter(r=>r.changed),cross=moved.filter(r=>r.railChanged);
 const oldCapacity=project.railCount*project.railCapacity,newCapacity=option.railCount*option.modulesPerRail;
 const summary={devices:rows.length,moved:moved.length,unchanged:rows.length-moved.length,
  changedRails:cross.length,changedSlots:moved.length-cross.length,
  oldRailCount:project.railCount,newRailCount:option.railCount,
  oldCapacity,newCapacity,capacityDelta:newCapacity-oldCapacity,
  usedModules:rows.reduce((n,r)=>n+r.modules,0),
  freeModules:newCapacity-rows.reduce((n,r)=>n+r.modules,0),
  geometryResetRequired:!!project.cabinetGeometryV1&&
   (project.railCount!==option.railCount||project.railCapacity!==option.modulesPerRail)};
 return {schema:'electropanel.cabinet.option.preview.1',status:'REVIEW_REQUIRED',
  code:'OPTION_PREVIEW_READY',rows,rails:rails.sort((a,b)=>a.railIndex-b.railIndex),
  summary,engineeringApproved:false,ready_for_installation:false,
  note:'Preliminary DIN positions only; no electrical connection or cabinet fit verified.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetOptionPreviewV1};
