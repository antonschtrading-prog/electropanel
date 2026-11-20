'use strict';
// Generate distinct verified DIN arrangements without applying any of them.
function epCabinetReflowAlternativesV1(project,lookup,options={}){
 const fail=code=>({schema:'electropanel.cabinet.reflow.alternatives.1',
  status:'BLOCKED',code,alternatives:[],recommendedId:null,engineeringApproved:false});
 if(!project||!options||typeof options!=='object'||Array.isArray(options)||
  typeof epCabinetCrossRailOptimizeV1!=='function'||
  typeof epCabinetReflowPreviewV1!=='function')return fail('REFLOW_ALTERNATIVES_INPUT_INVALID');
 const strategies=options.strategies??['first','reverse','nearest','compact'];
 if(!Array.isArray(strategies)||!strategies.length||strategies.length>8||
  strategies.some(x=>!['first','reverse','nearest','compact'].includes(x))||
  new Set(strategies).size!==strategies.length)return fail('REFLOW_ALTERNATIVES_STRATEGIES_INVALID');
 const variants=[],seen=new Set(),failures=[];
 for(const strategy of strategies){
  let proposal;
  try{proposal=epCabinetCrossRailOptimizeV1(project,lookup,{strategy,maxPasses:options.maxPasses??12})}
  catch(_){failures.push({strategy,code:'REFLOW_ALTERNATIVES_ENGINE_FAILED'});continue;}
  if(proposal.status==='BLOCKED'){failures.push({strategy,code:proposal.code});continue;}
  if(!proposal.changes.length)continue;
  const preview=epCabinetReflowPreviewV1(project,proposal,lookup);
  if(preview.status!=='REVIEW_REQUIRED'){failures.push({strategy,code:preview.code});continue;}
  const geometry=typeof epCabinetApparatusGeometryV1==='function'?
   epCabinetApparatusGeometryV1(project,preview,lookup):null;
  if(geometry?.status==='BLOCKED'){
   failures.push({strategy,code:geometry.code});continue;
  }
  const enclosure=geometry&&Array.isArray(options.enclosures)&&options.enclosures.length>0&&
   typeof epCabinetEnclosureMatchV1==='function'?
   epCabinetEnclosureMatchV1(preview,geometry,options.enclosures):null;
  if(enclosure?.status==='BLOCKED'){
   failures.push({strategy,code:enclosure.code});continue;
  }
  const key=JSON.stringify(preview.rows.map(r=>[r.deviceId,r.toRail,r.toSlot]));
  if(seen.has(key))continue;
  seen.add(key);
  const id='reflow-'+strategy;
  variants.push({id,strategy,proposal,preview,geometry,enclosure,
   moved:preview.summary.moved,changedRails:preview.summary.changedRails,
   crossRail:proposal.after.cross,nominalGap:proposal.after.gap,
   engineeringApproved:false});
 }
 variants.sort((a,b)=>a.crossRail-b.crossRail||a.moved-b.moved||
  a.changedRails-b.changedRails||a.nominalGap-b.nominalGap||
  (a.geometry?.summary?.missingDimensions??Infinity)-(b.geometry?.summary?.missingDimensions??Infinity)||
  a.id.localeCompare(b.id));
 return {schema:'electropanel.cabinet.reflow.alternatives.1',
  status:variants.length?'REVIEW_REQUIRED':failures.length?'UNKNOWN':'REVIEW_REQUIRED',
  code:variants.length?'REFLOW_ALTERNATIVES_READY':failures.length?
   'REFLOW_ALTERNATIVES_UNAVAILABLE':'REFLOW_ALTERNATIVES_NO_IMPROVEMENT',
  alternatives:variants,recommendedId:variants[0]?.id??null,failures,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetReflowAlternativesV1};
