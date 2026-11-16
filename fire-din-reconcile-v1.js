'use strict';
function epFireDinReconcileV1(project){
 const issues=[],placements=[],occupied=new Map();
 const add=(code,level='BLOCKED',id=null)=>issues.push({code,level,objectId:id});
 if(typeof epFireControlDesignV1!=='function'){add('FIRE_DIN_ENGINE_MISSING');return {status:'BLOCKED',issues,placements,engineeringApproved:false};}
 const design=epFireControlDesignV1(project);
 if(design.status==='NOT_CONFIGURED')return {schema:'electropanel.fire.din.1',status:'NOT_CONFIGURED',issues,placements,engineeringApproved:false};
 issues.push(...design.issues);
 const put=(id,rail,start,width,origin)=>{
  if(!id||!rail||!Number.isInteger(start)||!Number.isInteger(width)||start<1||width<1)return;
  if(Number.isInteger(project.railCapacity)&&start+width-1>project.railCapacity)add('FIRE_DIN_CAPACITY_EXCEEDED','BLOCKED',id);
  for(let n=start;n<start+width;n++){
   const slot=rail+':'+n;
   if(occupied.has(slot)&&occupied.get(slot)!==origin+':'+id)add('FIRE_DIN_CROSS_DEVICE_COLLISION','BLOCKED',id);
   occupied.set(slot,origin+':'+id);
  }
  placements.push({id,railId:rail,startModule:start,widthModules:width,origin});
 };
 for(const item of design.rows)put(item.deviceId,item.dinRailId,item.dinStartModule,item.moduleWidth,'FIRE');
 if(project.dinPlacementsV1!==undefined&&!Array.isArray(project.dinPlacementsV1))add('FIRE_DIN_EXTERNAL_PLACEMENTS_INVALID');
 else for(const item of project.dinPlacementsV1||[]){
  if(!item||typeof item!=='object'){add('FIRE_DIN_EXTERNAL_PLACEMENT_INVALID');continue;}
  const rail=item.railId??item.dinRailId,start=item.startModule??item.dinStartModule,width=item.widthModules??item.moduleWidth??item.modules,id=item.deviceId??item.id;
  if(!id||!rail||!Number.isInteger(start)||!Number.isInteger(width)){add('FIRE_DIN_EXTERNAL_GEOMETRY_UNDECLARED','UNKNOWN',id);continue;}
  put(id,rail,start,width,'PANEL');
 }
 if(!Array.isArray(project.dinPlacementsV1))add('FIRE_DIN_FULL_PANEL_LAYOUT_UNVERIFIED','UNKNOWN');
 return {schema:'electropanel.fire.din.1',status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',issues,placements,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined')module.exports={epFireDinReconcileV1};
