'use strict';
// Relative distance from nominal DIN slot bands to USER-DECLARED reserved rectangles.
// Not a route, terminal binding, bend-radius or accessibility verification.
function epCabinetConnectionSpaceV1(project,lookup){
 const issues=[],rows=[],add=(code,level='UNKNOWN',detail={})=>issues.push({code,level,...detail});
 const finish=status=>({schema:'electropanel.cabinet.connection.space.1',status,rows,issues,
  terminalConnectionsVerified:false,conductorRoutesVerified:false,
  manufacturerClearancesVerified:false,engineeringApproved:false,ready_for_installation:false});
 if(!project||typeof epCabinetGeometryCheckV1!=='function'||
  typeof epDraftBoardPlanV1!=='function'){
  add('CABINET_CONNECTION_SPACE_ENGINE_UNAVAILABLE','BLOCKED');return finish('BLOCKED');
 }
 const geometry=epCabinetGeometryCheckV1(project.cabinetGeometryV1,project.railCount,project.railCapacity);
 if(geometry.status==='NOT_CONFIGURED'){
  add('CABINET_CONNECTION_SPACE_GEOMETRY_NOT_DECLARED');
  return finish('NOT_CONFIGURED');
 }
 if(geometry.status==='BLOCKED'){
  add('CABINET_CONNECTION_SPACE_GEOMETRY_INVALID','BLOCKED');return finish('BLOCKED');
 }
 const board=epDraftBoardPlanV1(project,lookup);
 if(board.status==='BLOCKED'){
  add('CABINET_CONNECTION_SPACE_BOARD_BLOCKED','BLOCKED');return finish('BLOCKED');
 }
 const zones=new Map(geometry.geometry.zones.map(z=>[z.railIndex,z]));
 const obstacles=geometry.geometry.obstacles||[];
 const ducts=obstacles.filter(x=>x.kind==='WIRE_DUCT');
 const terminals=obstacles.filter(x=>x.kind==='TERMINAL_REGION');
 // Edge-to-edge planar gap. This is NOT a conductor route or passable corridor.
 const gap=(a,b)=>({
  xMm:Math.max(0,b.xMm-(a.xMm+a.widthMm),a.xMm-(b.xMm+b.widthMm)),
  yMm:Math.max(0,b.yMm-(a.yMm+a.heightMm),a.yMm-(b.yMm+b.heightMm))
 });
 const nearest=(band,regions)=>{
  let best=null;
  for(const region of regions){
   const d=gap(band,region),distance=Math.hypot(d.xMm,d.yMm);
   if(!best||distance<best.distanceMm-1e-9||
     Math.abs(distance-best.distanceMm)<1e-9&&region.id<best.regionId)
    best={regionId:region.id,kind:region.kind,distanceMm:Math.round(distance*100)/100,
     horizontalGapMm:Math.round(d.xMm*100)/100,
     verticalGapMm:Math.round(d.yMm*100)/100};
  }
  return best;
 };
 if(!ducts.length)add('CABINET_CONNECTION_SPACE_DUCT_NOT_DECLARED');
 if(!terminals.length)add('CABINET_CONNECTION_SPACE_TERMINAL_REGION_NOT_DECLARED');
 for(const p of board.placements){
  const zone=zones.get(p.railIndex);
  if(!zone){add('CABINET_CONNECTION_SPACE_RAIL_MISSING','BLOCKED',{deviceId:p.deviceId});continue;}
  // The allocated zone is only a nominal mounting band, not the actual
  // apparatus body nor the location of its connection terminals.
  const band={xMm:zone.xMm+p.startModule*18,yMm:zone.yMm,
   widthMm:p.modules*18,heightMm:zone.heightMm};
  if(band.xMm+band.widthMm>zone.xMm+zone.widthMm+1e-6){
   add('CABINET_CONNECTION_SPACE_SLOT_OUTSIDE_ZONE','BLOCKED',{deviceId:p.deviceId});
   continue;
  }
  rows.push({deviceId:p.deviceId,railIndex:p.railIndex,
   nominalBand:band,nearestWireDuct:nearest(band,ducts),
   nearestTerminalRegion:nearest(band,terminals),
   connectionTerminalsKnown:false,actualAccessVerified:false,
   status:'REVIEW_REQUIRED'});
 }
 add('CABINET_CONNECTION_SPACE_TERMINALS_AND_BEND_RADII_UNVERIFIED');
 return finish(issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED');
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetConnectionSpaceV1};
