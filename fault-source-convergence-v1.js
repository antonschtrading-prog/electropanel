'use strict';
// Conditional arithmetic review of incoming and outgoing three-phase fault studies.
// A comparison is valid ONLY for explicitly shared modelled source conditions.
// This is not an electrical connection proof, selectivity or IEC compliance claim.
function epFaultSourceConvergenceV1(project,lookup){
 const issues=[],rows=[],add=(code,level='UNKNOWN',d={})=>issues.push({code,level,...d});
 const output=()=>({schema:'electropanel.fault.source.convergence.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',rows,issues,
  engineeringApproved:false,ready_for_installation:false,
  selectivityStatus:'NOT_ASSESSED'});
 if(!project||!Array.isArray(project.branchDevices)||!project.deviceSupplyV1||
  typeof epIncomingMaximumAuditV1!=='function'||
  typeof epCalculatedDeviceFaultAuditV1!=='function')
  {add('FAULT_SOURCE_CONVERGENCE_INPUT_UNAVAILABLE');return output();}
 let incoming,branch;
 try{
  incoming=epIncomingMaximumAuditV1(project,lookup);
  branch=epCalculatedDeviceFaultAuditV1(project,lookup);
 }catch(_){add('FAULT_SOURCE_CONVERGENCE_UPSTREAM_FAILURE','BLOCKED');return output();}
 const incomingMap=new Map((incoming.rows||[]).map(x=>[x.deviceNodeId,x]));
 const branchMap=new Map((branch.rows||[]).map(x=>[x.deviceNodeId,x]));
 const parent=new Map((project.deviceSupplyV1.links||[]).map(x=>[x.to,x.from]));
 const sourceFor=id=>{
  let current=id;const seen=new Set();
  for(let i=0;i<450;i++){
   if(seen.has(current))return null;
   seen.add(current);
   const upstream=parent.get(current);
   if(!upstream)return null;
   if(upstream.startsWith('INCOMING:'))return upstream;
   if(upstream==='SOURCE:MAIN')return null;
   current=upstream;
  }
  return null;
 };
 const near=(a,b)=>typeof a==='number'&&typeof b==='number'&&
  Number.isFinite(a)&&Number.isFinite(b)&&
  Math.abs(a-b)<=Math.max(1,Math.abs(a),Math.abs(b))*1e-10;
 const sameSource=(a,b)=>{
  if(!a||!b||a.model!=='THREE_PHASE_POSITIVE_SEQUENCE'||
   b.model!=='THREE_PHASE_POSITIVE_SEQUENCE'||
   a.sourceModel!==b.sourceModel||!near(a.uLLV,b.uLLV)||
   !near(a.cmax,b.cmax))return false;
  if(a.sourceModel==='TRANSFORMER_WITH_UPSTREAM')
   return JSON.stringify(a.transformer)===JSON.stringify(b.transformer);
  if(a.sourceModel==='DECLARED_RX')
   return near(a.sourceROhm,b.sourceROhm)&&
    near(a.sourceXOhm,b.sourceXOhm)&&
    typeof a.networkSource==='string'&&a.networkSource.trim()&&
    a.networkSource===b.networkSource;
  return false;
 };
 for(const device of project.branchDevices){
  const id='BRANCH:'+device.id,upstreamId=sourceFor(id);
  if(!upstreamId)continue;
  const upstream=incomingMap.get(upstreamId),downstream=branchMap.get(id);
  const line=project.lines?.find(x=>x.id===device.circuitId);
  const a=(project.incomingMaximumStudiesV1||[]).find(x=>x.deviceNodeId===upstreamId)?.maximumFaultInput;
  const b=line?.maximumFaultInput;
  const row={incomingId:upstreamId,branchId:id,
   incomingIkMaxKa:upstream?.ikMaxKa??null,branchIkMaxKa:downstream?.ikMaxKa??null,
   status:'UNKNOWN',sourceConditions:'NOT_COMPARABLE',engineeringApproved:false};
  rows.push(row);
  if(!upstream||!downstream){add('FAULT_SOURCE_PAIR_STUDY_MISSING','UNKNOWN',{objectId:id});continue;}
  if(upstream.sourcePathStale||downstream.stale||
   !Number.isFinite(upstream.ikMaxKa)||!Number.isFinite(downstream.ikMaxKa)){
   add('FAULT_SOURCE_PAIR_STUDY_STALE','BLOCKED',{objectId:id});
   row.status='BLOCKED';continue;
  }
  if(!sameSource(a,b)){
   add('FAULT_SOURCE_COMMON_BASIS_NOT_CONFIRMED','UNKNOWN',{objectId:id});continue;
  }
  row.sourceConditions='DECLARED_SAME_SOURCE';
  // Passive positive R/X added downstream must not raise three-phase
  // prospective fault current for unchanged voltage and cmax.
  if(downstream.ikMaxKa>upstream.ikMaxKa*(1+1e-9)){
   add('FAULT_SOURCE_DOWNSTREAM_IK_EXCEEDS_UPSTREAM_SAME_SOURCE',
    'BLOCKED',{objectId:id});
   row.status='BLOCKED';
  }else{
   add('FAULT_SOURCE_NUMERIC_ORDER_ONLY','UNKNOWN',{objectId:id});
  }
 }
 if(!rows.length)add('FAULT_SOURCE_NO_COMPARABLE_UPSTREAM_BRANCH_PAIRS');
 add('FAULT_SOURCE_COORDINATION_AND_PHYSICAL_PATH_NOT_PROVEN');
 return output();
}
function epFaultSourceConvergenceHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rows=(report?.rows||[]).map(x=>'<tr><td>'+esc(x.incomingId)+
  '</td><td>'+esc(x.branchId)+'</td><td>'+esc(x.incomingIkMaxKa??'—')+
  '</td><td>'+esc(x.branchIkMaxKa??'—')+'</td><td>'+esc(x.sourceConditions)+
  '</td><td>'+esc(x.status)+'</td></tr>').join('');
 return '<details class="ep-fault-source-convergence"><summary>Согласование Ik,max ввод / отходящая линия · '+
  esc(report?.status??'UNKNOWN')+'</summary>'+
  '<p class="muted">Сравнение выполняется только при одинаковых явно заявленных параметрах источника, модели трёхфазного КЗ, ULL и cmax. Одинаковые числа не доказывают электрический путь или селективность.</p>'+
  '<div class="table-scroll"><table><thead><tr><th>Вводной</th><th>Отходящий</th><th>Ik ввода, кА</th><th>Ik линии, кА</th><th>База</th><th>Статус</th></tr></thead><tbody>'+
  (rows||'<tr><td colspan="6">Нет сопоставимых заявленных пар</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epFaultSourceConvergenceV1,epFaultSourceConvergenceHtmlV1};
