'use strict';
// Explicit opt-in rearrangement WITHIN existing DIN rails to shorten nominal
// gaps between declared related apparatuses. No conductor path is inferred.
function epCabinetGroupReflowV1(project,lookup){
 const fail=(code,issues=[])=>({project:null,status:'BLOCKED',code,issues,
  engineeringApproved:false,physicalWiringVerified:false});
 if(!project||typeof epDraftBoardPlanV1!=='function'||
  typeof epCabinetConnectionProximityV1!=='function')return fail('GROUP_REFLOW_ENGINE_UNAVAILABLE');
 const before=epDraftBoardPlanV1(project,lookup);
 if(before.status==='BLOCKED')return fail('GROUP_REFLOW_BOARD_INVALID',before.issues);
 if(before.placements.length>150)return fail('GROUP_REFLOW_TOO_MANY_DEVICES');
 const prior=epCabinetConnectionProximityV1(project,before.placements);
 if(prior.status==='BLOCKED')return fail('GROUP_REFLOW_DECLARATIONS_INVALID',prior.issues);
 const pairs=prior.pairs.filter(x=>x.status==='REVIEW_REQUIRED'&&x.sameRail);
 const perRail=new Map();
 for(const p of before.placements){
  const arr=perRail.get(p.railIndex)||[];arr.push(p);perRail.set(p.railIndex,arr);
 }
 const positions=[],newOrders=[];
 function score(array){
  const at=new Map();let offset=0;
  for(const p of array){at.set(p.deviceId,{start:offset,modules:p.modules});offset+=p.modules;}
  let sum=0;
  for(const e of pairs){
   const a=at.get(e.from),b=at.get(e.to);if(!a||!b)continue;
   sum+=Math.max(0,a.start-b.start-b.modules,b.start-a.start-a.modules);
  }
  return sum;
 }
 for(const [railIndex,row] of [...perRail].sort((a,b)=>a[0]-b[0])){
  let arr=[...row].sort((a,b)=>a.startModule-b.startModule||a.deviceId.localeCompare(b.deviceId));
  const initial=score(arr);let best=initial;
  // Adjacent whole-apparatus swaps: deterministic hill climbing with strict
  // improvement. Never changes rail membership or total module capacity.
  for(let iteration=0;iteration<30&&arr.length>1;iteration++){
   let improved=false;
   for(let j=0;j<arr.length-1;j++){
    const next=[...arr];[next[j],next[j+1]]=[next[j+1],next[j]];
    const candidate=score(next);
    if(candidate<best){arr=next;best=candidate;improved=true;break;}
   }
   if(!improved)break;
  }
  if(best===initial){
   for(const p of row)
    positions.push({deviceId:p.deviceId,railIndex,startModule:p.startModule});
  }else{
   let startModule=0;
   for(const p of arr){
    positions.push({deviceId:p.deviceId,railIndex,startModule});
    startModule+=p.modules;
   }
  }
  newOrders.push({railIndex,beforeScore:initial,afterScore:best});
 }
 const next=JSON.parse(JSON.stringify(project));
 next.manualLayoutV1=positions;
 const board=epDraftBoardPlanV1(next,lookup);
 if(board.status==='BLOCKED'||board.placements.length!==before.placements.length)
  return fail('GROUP_REFLOW_BOARD_VERIFICATION_FAILED',board.issues);
 const index=new Map(board.placements.map(x=>[x.deviceId,x]));
 for(const p of positions){
  const actual=index.get(p.deviceId);
  if(!actual||actual.railIndex!==p.railIndex||actual.startModule!==p.startModule)
   return fail('GROUP_REFLOW_PLACEMENT_MISMATCH');
 }
 if(next.cabinetGeometryV1&&typeof epCabinetPlacementChangeAuditV1==='function'){
  const audit=epCabinetPlacementChangeAuditV1(project,next,lookup);
  if(audit.status==='BLOCKED')return fail('GROUP_REFLOW_NEW_CABINET_BLOCKER',audit.newIssues);
 }
 const after=epCabinetConnectionProximityV1(next,board.placements);
 if(after.status==='BLOCKED')return fail('GROUP_REFLOW_AFTER_INVALID');
 if(after.summary.nominalDistanceModules>=prior.summary.nominalDistanceModules){
  return {project:JSON.parse(JSON.stringify(project)),status:'REVIEW_REQUIRED',
   code:'GROUP_REFLOW_NO_IMPROVEMENT',changes:[],perRail:newOrders,
   before:prior.summary,after:prior.summary,
   engineeringApproved:false,physicalWiringVerified:false,
   note:'No actual decrease in declared same-rail gap; existing positions preserved.'};
 }
 const connectionSpaceDelta=typeof epCabinetConnectionSpaceDeltaV1==='function'?
  epCabinetConnectionSpaceDeltaV1(project,next,lookup):null;
 if(connectionSpaceDelta?.status==='BLOCKED')
  return fail('GROUP_REFLOW_CONNECTION_SPACE_INVALID');
 const improvements=before.placements.filter(p=>{
  const q=index.get(p.deviceId);return q?.railIndex!==p.railIndex||q?.startModule!==p.startModule;
 }).map(p=>({deviceId:p.deviceId,from:{railIndex:p.railIndex,startModule:p.startModule},
  to:{railIndex:index.get(p.deviceId).railIndex,startModule:index.get(p.deviceId).startModule}}));
 return {project:next,status:'REVIEW_REQUIRED',code:improvements.length?'GROUP_REFLOW_READY':'GROUP_REFLOW_NO_IMPROVEMENT',
  changes:improvements,perRail:newOrders,
  connectionSpaceDelta,before:prior.summary,after:after.summary,
  engineeringApproved:false,physicalWiringVerified:false,
  note:'Same-rail nominal apparatus proximity only; actual wire routing unchanged and not assessed.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetGroupReflowV1};
