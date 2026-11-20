'use strict';
// An immutable comparison of the current DIN board against user-declared useful cabinet sizes.
function epCabinetCurrentEnclosureV1(project,lookup,enclosures,settings={}){
 const fail=code=>({schema:'electropanel.cabinet.current.enclosure.1',status:'BLOCKED',code,
  board:null,geometry:null,match:null,review:null,engineeringApproved:false,
  ready_for_installation:false,manufacturerCabinetFitVerified:false});
 if(!project||typeof lookup!=='function'||!Array.isArray(enclosures)||!enclosures.length||
  enclosures.length>100||typeof epDraftBoardPlanV1!=='function'||
  typeof epCabinetApparatusGeometryV1!=='function'||
  typeof epCabinetEnclosureMatchV1!=='function'||
  typeof epCabinetEnclosureReviewV1!=='function')
  return fail('CURRENT_ENCLOSURE_INPUT_INVALID');
 if(!Number.isInteger(project.railCount)||project.railCount<1||project.railCount>100||
  !Number.isInteger(project.railCapacity)||project.railCapacity<1||project.railCapacity>200)
  return fail('CURRENT_ENCLOSURE_CAPACITY_INVALID');
 let board;
 try{board=epDraftBoardPlanV1(project,lookup)}catch(_){return fail('CURRENT_ENCLOSURE_BOARD_FAILED')}
 if(!board||board.status==='BLOCKED'||!Array.isArray(board.placements)||
  !board.placements.length||board.placements.length>1000)
  return fail('CURRENT_ENCLOSURE_BOARD_BLOCKED');
 const ids=new Set(),rows=[];
 for(const p of board.placements){
  if(!p||typeof p.deviceId!=='string'||!p.deviceId||ids.has(p.deviceId)||
   !Number.isInteger(p.railIndex)||p.railIndex<0||p.railIndex>=project.railCount||
   !Number.isInteger(p.startModule)||p.startModule<0||
   !Number.isInteger(p.modules)||p.modules<1||
   p.startModule+p.modules>project.railCapacity)
   return fail('CURRENT_ENCLOSURE_PLACEMENT_INVALID');
  ids.add(p.deviceId);
  rows.push({deviceId:p.deviceId,article:p.article??null,
   toRail:p.railIndex,toSlot:p.startModule,modules:p.modules});
 }
 const rails=Array.from({length:project.railCount},(_,railIndex)=>({
  railIndex,capacity:project.railCapacity}));
 const preview={status:'REVIEW_REQUIRED',rows,rails};
 let geometry,match,review;
 try{
  geometry=epCabinetApparatusGeometryV1(project,preview,lookup);
  if(!geometry||geometry.status==='BLOCKED')return fail('CURRENT_ENCLOSURE_GEOMETRY_BLOCKED');
  match=epCabinetEnclosureMatchV1(preview,geometry,enclosures,settings);
  if(!match||match.status==='BLOCKED')return fail('CURRENT_ENCLOSURE_MATCH_BLOCKED');
  review=epCabinetEnclosureReviewV1(match);
  if(!review||review.status==='BLOCKED')return fail('CURRENT_ENCLOSURE_REVIEW_BLOCKED');
 }catch(_){return fail('CURRENT_ENCLOSURE_ENGINE_FAILED')}
 return {schema:'electropanel.cabinet.current.enclosure.1',status:match.status,
  code:'CURRENT_ENCLOSURE_COMPARISON_READY',
  board:{railCount:project.railCount,modulesPerRail:project.railCapacity,
   devices:rows.length,usedModules:rows.reduce((n,r)=>n+r.modules,0)},
  geometry:{status:geometry.status,knownDimensions:geometry.summary.knownDimensions,
   missingDimensions:geometry.summary.missingDimensions,devices:geometry.summary.devices,
   issues:geometry.issues},match,review,
  engineeringApproved:false,manufacturerCabinetFitVerified:false,
  ready_for_installation:false,
  note:'Preliminary nominal DIN comparison. Exact mounting, wiring and thermal fit are unverified.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetCurrentEnclosureV1};
