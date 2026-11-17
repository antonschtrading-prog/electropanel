'use strict';
// Greedy, deterministic opt-in relocation of whole devices between DIN rails.
// Explicit manual anchors are immutable. Electrical circuit connectivity is never changed.
function epCabinetCrossRailOptimizeV1(project,lookup,options={}){
 const fail=(code,issues=[])=>({status:'BLOCKED',code,project:null,changes:[],issues,
  engineeringApproved:false,physicalWiringVerified:false});
 if(!project||!options||typeof options!=='object'||Array.isArray(options)||
  typeof epDraftBoardPlanV1!=='function'||typeof epCabinetConnectionProximityV1!=='function')
  return fail('CROSS_RAIL_INPUT_INVALID');
 const maxPasses=options.maxPasses??12;
 if(!Number.isInteger(maxPasses)||maxPasses<1||maxPasses>50)return fail('CROSS_RAIL_PASSES_INVALID');
 let before;
 try{before=epDraftBoardPlanV1(project,lookup)}catch(_){return fail('CROSS_RAIL_ENGINE_FAILED');}
 if(before.status==='BLOCKED')return fail('CROSS_RAIL_BASELINE_BLOCKED',before.issues);
 if(before.placements.length>150)return fail('CROSS_RAIL_TOO_MANY_DEVICES');
 const original=epCabinetConnectionProximityV1(project,before.placements);
 if(original.status==='BLOCKED')return fail('CROSS_RAIL_RELATIONS_INVALID',original.issues);
 const fixed=new Set((project.manualLayoutV1||[]).map(x=>x.deviceId));
 const relatedIds=new Set(original.pairs.filter(p=>p.status==='REVIEW_REQUIRED')
  .flatMap(p=>[p.from,p.to]));
 const capacity=project.railCapacity,rails=project.railCount;
 const initial=before.placements.map(p=>({deviceId:p.deviceId,railIndex:p.railIndex,
  startModule:p.startModule,modules:p.modules}));
 const related=original.pairs.filter(p=>p.status==='REVIEW_REQUIRED');
 function quality(positions){
  const byId=new Map(positions.map(p=>[p.deviceId,p]));
  let cross=0,gap=0;
  for(const rel of related){
   const a=byId.get(rel.from),b=byId.get(rel.to);
   if(!a||!b)continue;
   if(a.railIndex!==b.railIndex)cross++;
   else gap+=Math.max(0,a.startModule-b.startModule-b.modules,
    b.startModule-a.startModule-a.modules);
  }
  return {cross,gap};
 }
 function better(a,b){return a.cross<b.cross||a.cross===b.cross&&a.gap<b.gap;}
 function valid(positions){
  const slots=Array.from({length:rails},()=>new Set());
  for(const p of positions){
   if(!Number.isInteger(p.railIndex)||p.railIndex<0||p.railIndex>=rails||
    !Number.isInteger(p.startModule)||p.startModule<0||
    p.startModule+p.modules>capacity)return false;
   for(let i=p.startModule;i<p.startModule+p.modules;i++){
    if(slots[p.railIndex].has(i))return false;
    slots[p.railIndex].add(i);
   }
  }
  return true;
 }
 let current=initial.map(p=>({...p})),currentScore=quality(current);
 const startScore={...currentScore};
 for(let pass=0;pass<maxPasses;pass++){
  let best=null,bestScore=currentScore;
  // Candidate search only moves one non-anchored apparatus at a time.
  let inspected=0;
  search:for(let i=0;i<current.length;i++){
   if(fixed.has(current[i].deviceId)||!relatedIds.has(current[i].deviceId))continue;
   for(let r=0;r<rails;r++){
    if(r===current[i].railIndex)continue;
    for(let x=0;x+current[i].modules<=capacity;x++){
     if(++inspected>20000)break search;
     const candidate=current.map(p=>({...p}));
     candidate[i].railIndex=r;candidate[i].startModule=x;
     if(!valid(candidate))continue;
     const score=quality(candidate);
     if(better(score,bestScore)){
      best={candidate,index:i,railIndex:r,startModule:x};
      bestScore=score;
     }
    }
   }
  }
  if(!best)break;
  current=best.candidate;currentScore=bestScore;
 }
 if(!better(currentScore,startScore)){
  return {status:'REVIEW_REQUIRED',code:'CROSS_RAIL_NO_IMPROVEMENT',
   project:JSON.parse(JSON.stringify(project)),changes:[],
   before:startScore,after:startScore,engineeringApproved:false,physicalWiringVerified:false};
 }
 const copy=JSON.parse(JSON.stringify(project));
 copy.manualLayoutV1=current.map(p=>({deviceId:p.deviceId,railIndex:p.railIndex,startModule:p.startModule}));
 let verified;
 try{verified=epDraftBoardPlanV1(copy,lookup)}catch(_){return fail('CROSS_RAIL_VERIFICATION_FAILED');}
 if(verified.status==='BLOCKED'||verified.placements.length!==before.placements.length)
  return fail('CROSS_RAIL_VERIFICATION_FAILED',verified.issues);
 const old=new Map(before.placements.map(p=>[p.deviceId,p]));
 const after=new Map(verified.placements.map(p=>[p.deviceId,p]));
 for(const p of current){
  const a=old.get(p.deviceId),b=after.get(p.deviceId);
  if(!a||!b||b.railIndex!==p.railIndex||b.startModule!==p.startModule||
   a.modules!==b.modules||a.article!==b.article||
   fixed.has(p.deviceId)&&(a.railIndex!==b.railIndex||a.startModule!==b.startModule))
   return fail('CROSS_RAIL_IDENTITY_CONFLICT');
 }
 if(copy.cabinetGeometryV1){
  if(typeof epCabinetPlacementChangeAuditV1!=='function')
   return fail('CROSS_RAIL_CABINET_AUDIT_UNAVAILABLE');
  const audit=epCabinetPlacementChangeAuditV1(project,copy,lookup);
  if(audit.status==='BLOCKED')return fail('CROSS_RAIL_CABINET_FIT_CONFLICT',audit.newIssues);
 }
 const proximity=epCabinetConnectionProximityV1(copy,verified.placements);
 if(proximity.status==='BLOCKED'||proximity.summary.crossRail>=original.summary.crossRail)
  return fail('CROSS_RAIL_PROXIMITY_NOT_IMPROVED');
 const changes=current.filter(p=>{
  const a=old.get(p.deviceId);
  return a.railIndex!==p.railIndex||a.startModule!==p.startModule;
 }).map(p=>({deviceId:p.deviceId,
  from:{railIndex:old.get(p.deviceId).railIndex,startModule:old.get(p.deviceId).startModule},
  to:{railIndex:p.railIndex,startModule:p.startModule}}));
 return {status:'REVIEW_REQUIRED',code:'CROSS_RAIL_OPTIMIZED',project:copy,
  changes,before:startScore,after:quality(current),
  engineeringApproved:false,physicalWiringVerified:false,
  note:'Nominal cross-rail relations only. Cable routing and electrical connections unchanged.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetCrossRailOptimizeV1};
