'use strict';
// USER-DECLARED usable interior and allocated mounting bands, never a certified enclosure CAD.
function epCabinetGeometryNormalizeV1(input){
 const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const fail=code=>{const error=new Error(code);error.code=code;throw error;};
 if(!plain(input)||input.version!==1||input.source!=='USER_DECLARED')
  fail('CABINET_SCHEMA_UNSUPPORTED');
 if(Object.keys(input).some(k=>!['version','source','interior','zones','planning','obstacles'].includes(k)))
  fail('CABINET_FIELD_UNKNOWN');
 if(!plain(input.interior)||Object.keys(input.interior).some(k=>!['widthMm','heightMm','depthMm'].includes(k)))
  fail('CABINET_INTERIOR_INVALID');
 const n=(value,min,max)=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
 const {widthMm,heightMm,depthMm}=input.interior;
 if(!n(widthMm,20,5000)||!n(heightMm,20,5000)||!n(depthMm,20,3000))
  fail('CABINET_INTERIOR_INVALID');
 if(!Array.isArray(input.zones)||input.zones.length<1||input.zones.length>100)
  fail('CABINET_ZONES_INVALID');
 const seen=new Set(),zones=[];
 for(const zone of input.zones){
  if(!plain(zone)||Object.keys(zone).some(k=>!['railIndex','xMm','yMm','widthMm','heightMm'].includes(k))||
    !Number.isInteger(zone.railIndex)||zone.railIndex<0||zone.railIndex>=100||
    seen.has(zone.railIndex)||!n(zone.xMm,0,5000)||!n(zone.yMm,0,5000)||
    !n(zone.widthMm,1,5000)||!n(zone.heightMm,1,5000))
   fail('CABINET_ZONE_INVALID');
  seen.add(zone.railIndex);
  zones.push({railIndex:zone.railIndex,xMm:zone.xMm,yMm:zone.yMm,
   widthMm:zone.widthMm,heightMm:zone.heightMm});
 }
 let planning=null;
 if(input.planning!==undefined){
  if(!plain(input.planning)||Object.keys(input.planning).some(k=>!['marginMm','firstRowYMm','zoneHeightMm','rowGapMm'].includes(k))||
    !n(input.planning.marginMm,0,2000)||!n(input.planning.firstRowYMm,0,5000)||
    !n(input.planning.zoneHeightMm,1,5000)||!n(input.planning.rowGapMm,0,5000))
   fail('CABINET_PLANNING_INVALID');
  planning={marginMm:input.planning.marginMm,firstRowYMm:input.planning.firstRowYMm,
   zoneHeightMm:input.planning.zoneHeightMm,rowGapMm:input.planning.rowGapMm};
 }
 let obstacles;
 if(input.obstacles!==undefined){
  if(!Array.isArray(input.obstacles)||input.obstacles.length>100)
   fail('CABINET_OBSTACLES_INVALID');
  const ids=new Set();
  obstacles=[];
  for(const o of input.obstacles){
   if(!plain(o)||Object.keys(o).some(k=>!['id','kind','xMm','yMm','widthMm','heightMm'].includes(k))||
     typeof o.id!=='string'||!/^[A-Za-z0-9_-]{1,40}$/.test(o.id)||
     ids.has(o.id)||!['WIRE_DUCT','TERMINAL_REGION','RESERVED'].includes(o.kind)||
     !n(o.xMm,0,5000)||!n(o.yMm,0,5000)||!n(o.widthMm,1,5000)||!n(o.heightMm,1,5000))
    fail('CABINET_OBSTACLE_INVALID');
   ids.add(o.id);
   obstacles.push({id:o.id,kind:o.kind,xMm:o.xMm,yMm:o.yMm,
    widthMm:o.widthMm,heightMm:o.heightMm});
  }
 }
 return {version:1,source:'USER_DECLARED',
  interior:{widthMm,heightMm,depthMm},
  zones:zones.sort((a,b)=>a.railIndex-b.railIndex),...(planning?{planning}:{}),
  ...(obstacles!==undefined?{obstacles}:{})};
}
function epCabinetGeometryCheckV1(input,railCount,railCapacity){
 const issues=[],add=(code,level='BLOCKED',railIndex=null)=>issues.push({code,level,railIndex});
 if(input===undefined||input===null)
  return {status:'NOT_CONFIGURED',geometry:null,issues:[{code:'CABINET_GEOMETRY_NOT_DECLARED',level:'UNKNOWN'}],
   engineeringApproved:false,ready_for_installation:false};
 let geometry;
 try{geometry=epCabinetGeometryNormalizeV1(input);}
 catch(e){return {status:'BLOCKED',geometry:null,issues:[{code:e.code||'CABINET_SCHEMA_INVALID',level:'BLOCKED'}],
  engineeringApproved:false,ready_for_installation:false};}
 if(!Number.isInteger(railCount)||railCount<1||railCount>100||
    !Number.isInteger(railCapacity)||railCapacity<1||railCapacity>200)
  add('CABINET_BOARD_CAPACITY_INVALID');
 if(geometry.zones.length!==railCount)add('CABINET_RAIL_COUNT_MISMATCH');
 for(let i=0;i<railCount;i++)if(!geometry.zones.some(z=>z.railIndex===i))
  add('CABINET_RAIL_ZONE_MISSING','BLOCKED',i);
 for(const zone of geometry.zones){
  const w=geometry.interior.widthMm,h=geometry.interior.heightMm;
  if(zone.railIndex>=railCount)add('CABINET_RAIL_INDEX_OUT_OF_RANGE','BLOCKED',zone.railIndex);
  if(zone.xMm+zone.widthMm>w+1e-6||zone.yMm+zone.heightMm>h+1e-6)
   add('CABINET_ZONE_OUTSIDE_INTERIOR','BLOCKED',zone.railIndex);
  if(Number.isInteger(railCapacity)&&zone.widthMm+1e-6<railCapacity*18)
   add('CABINET_RAIL_SPAN_TOO_NARROW','BLOCKED',zone.railIndex);
 }
 for(let i=0;i<geometry.zones.length;i++)for(let j=i+1;j<geometry.zones.length;j++){
  const a=geometry.zones[i],b=geometry.zones[j];
  if(a.xMm<b.xMm+b.widthMm-1e-6&&b.xMm<a.xMm+a.widthMm-1e-6&&
    a.yMm<b.yMm+b.heightMm-1e-6&&b.yMm<a.yMm+a.heightMm-1e-6)
   add('CABINET_ZONE_OVERLAP','BLOCKED',b.railIndex);
 }
 const intersect=(a,b)=>a.xMm<b.xMm+b.widthMm-1e-6&&b.xMm<a.xMm+a.widthMm-1e-6&&
   a.yMm<b.yMm+b.heightMm-1e-6&&b.yMm<a.yMm+a.heightMm-1e-6;
 const obstacles=geometry.obstacles||[];
 for(const o of obstacles){
  if(o.xMm+o.widthMm>geometry.interior.widthMm+1e-6||
     o.yMm+o.heightMm>geometry.interior.heightMm+1e-6)
   issues.push({code:'CABINET_OBSTACLE_OUTSIDE_INTERIOR',level:'BLOCKED',obstacleId:o.id});
  for(const z of geometry.zones)if(intersect(o,z))
   issues.push({code:'CABINET_OBSTACLE_ZONE_OVERLAP',level:'BLOCKED',obstacleId:o.id,railIndex:z.railIndex});
 }
 for(let i=0;i<obstacles.length;i++)for(let j=i+1;j<obstacles.length;j++){
  if(intersect(obstacles[i],obstacles[j]))
   issues.push({code:'CABINET_OBSTACLES_OVERLAP',level:'BLOCKED',obstacleId:obstacles[j].id});
 }
 add('CABINET_HARDWARE_MOUNTING_CLEARANCES_UNVERIFIED','UNKNOWN');
 return {status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  geometry,issues,engineeringApproved:false,ready_for_installation:false};
}
function epCabinetAutoZonesV1(input,railCount,railCapacity){
 const fail=(code)=>({status:'BLOCKED',geometry:null,issues:[{code,level:'BLOCKED'}]});
 if(!input||!Number.isInteger(railCount)||railCount<1||railCount>100||
    !Number.isInteger(railCapacity)||railCapacity<1||railCapacity>200)
  return fail('CABINET_AUTO_INPUT_INVALID');
 const {interiorWidthMm,interiorHeightMm,interiorDepthMm,marginMm,firstRowYMm,zoneHeightMm,rowGapMm}=input;
 const numeric=[interiorWidthMm,interiorHeightMm,interiorDepthMm,marginMm,firstRowYMm,zoneHeightMm,rowGapMm];
 if(numeric.some(x=>typeof x!=='number'||!Number.isFinite(x)))return fail('CABINET_AUTO_NUMBER_INVALID');
 const geometry={version:1,source:'USER_DECLARED',
  interior:{widthMm:interiorWidthMm,heightMm:interiorHeightMm,depthMm:interiorDepthMm},
  planning:{marginMm,firstRowYMm,zoneHeightMm,rowGapMm},
  zones:Array.from({length:railCount},(_,railIndex)=>({
   railIndex,xMm:marginMm,yMm:firstRowYMm+railIndex*(zoneHeightMm+rowGapMm),
   widthMm:interiorWidthMm-2*marginMm,heightMm:zoneHeightMm
  })),...(input.obstacles!==undefined?{obstacles:input.obstacles}:{})};
 const audit=epCabinetGeometryCheckV1(geometry,railCount,railCapacity);
 return {status:audit.status,geometry:audit.geometry,issues:audit.issues};
}
function epCabinetFitAuditV1(project,lookup){
 const n=project?.railCount,c=project?.railCapacity;
 const base=epCabinetGeometryCheckV1(project?.cabinetGeometryV1,n,c);
 const issues=[...base.issues],rows=[];
 const result=()=>({schema:'electropanel.cabinet.fit.audit.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':base.status==='NOT_CONFIGURED'?'NOT_CONFIGURED':'REVIEW_REQUIRED',
  geometry:base.geometry,rows,issues,engineeringApproved:false,ready_for_installation:false,
  confirmedCabinetFit:false});
 if(base.status==='NOT_CONFIGURED'||base.status==='BLOCKED')return result();
 if(typeof epDraftBoardPlanV1!=='function'){
  issues.push({code:'CABINET_BOARD_ENGINE_UNAVAILABLE',level:'BLOCKED'});return result();
 }
 let board;
 try{board=epDraftBoardPlanV1(project,lookup);}
 catch(_){issues.push({code:'CABINET_BOARD_ENGINE_FAILED',level:'BLOCKED'});return result();}
 if(board.status==='BLOCKED')issues.push({code:'CABINET_BOARD_LAYOUT_BLOCKED',level:'BLOCKED'});
 let physical=null;
 try{if(typeof epDinPhysicalEnvelopeV1==='function')physical=epDinPhysicalEnvelopeV1(board,lookup);}
 catch(_){issues.push({code:'CABINET_PHYSICAL_AUDIT_FAILED',level:'UNKNOWN'});}
 const physicalRows=new Map((physical?.rows||[]).map(r=>[r.deviceId,r]));
 if(physical?.status==='BLOCKED')issues.push({code:'CABINET_DIN_ENVELOPE_BLOCKED',level:'BLOCKED'});
 for(const p of board.placements){
  const zone=base.geometry.zones.find(z=>z.railIndex===p.railIndex);
  if(!zone){issues.push({code:'CABINET_RAIL_ZONE_MISSING',level:'BLOCKED',deviceId:p.deviceId});continue;}
  const d=physicalRows.get(p.deviceId);
  const xMm=zone.xMm+p.startModule*18,slotWidthMm=p.modules*18;
  const local=[],add=(code,level)=>{local.push(code);issues.push({code,level,deviceId:p.deviceId});};
  if(xMm+slotWidthMm>zone.xMm+zone.widthMm+1e-6)add('CABINET_SLOT_OUTSIDE_ZONE','BLOCKED');
  if(d?.bodyWidthMm!=null&&xMm+d.bodyWidthMm>zone.xMm+zone.widthMm+1e-6)
   add('CABINET_DEVICE_WIDTH_OVERFLOW','BLOCKED');
  if(d?.bodyHeightMm==null)add('CABINET_DEVICE_HEIGHT_UNKNOWN','UNKNOWN');
  else if(d.bodyHeightMm>zone.heightMm+1e-6)add('CABINET_DEVICE_HEIGHT_OVERFLOW','BLOCKED');
  if(d?.bodyDepthMm==null)add('CABINET_DEVICE_DEPTH_UNKNOWN','UNKNOWN');
  else if(d.bodyDepthMm>base.geometry.interior.depthMm+1e-6)add('CABINET_DEVICE_DEPTH_OVERFLOW','BLOCKED');
  rows.push({deviceId:p.deviceId,railIndex:p.railIndex,xMm,yMm:zone.yMm,nominalSlotWidthMm:slotWidthMm,
   bodyWidthMm:d?.bodyWidthMm??null,bodyHeightMm:d?.bodyHeightMm??null,
   bodyDepthMm:d?.bodyDepthMm??null,allocatedHeightMm:zone.heightMm,
   issues:local,status:local.some(code=>issues.some(x=>x.deviceId===p.deviceId&&x.code===code&&x.level==='BLOCKED'))?'BLOCKED':'REVIEW_REQUIRED'});
 }
 return result();
}
function epCabinetGeometryApplyV1(project,data){
 const fail=code=>({project:null,status:'BLOCKED',code,engineeringApproved:false});
 if(!project||typeof project!=='object')return fail('CABINET_PROJECT_INVALID');
 const audit=epCabinetGeometryCheckV1(data,project.railCount,project.railCapacity);
 if(audit.status==='BLOCKED'||audit.status==='NOT_CONFIGURED')
  return {project:null,status:'BLOCKED',code:audit.issues[0]?.code||'CABINET_INVALID',
   issues:audit.issues,engineeringApproved:false};
 const clone=JSON.parse(JSON.stringify(project));
 clone.cabinetGeometryV1=audit.geometry;
 return {project:clone,status:'REVIEW_REQUIRED',code:'CABINET_GEOMETRY_UPDATED',
  issues:audit.issues,engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epCabinetGeometryNormalizeV1,epCabinetGeometryCheckV1,epCabinetAutoZonesV1,
 epCabinetFitAuditV1,epCabinetGeometryApplyV1};
