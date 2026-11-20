'use strict';
// One immutable snapshot of the selected cabinet's draft placements, BOM, front evidence and capacity.
// Advisory only; no project mutation or automatic selection of manufacturer enclosure.
function epCabinetDeliveryConvergenceV1(project,lookup,resolve){
 const empty=(code)=>({schema:'electropanel.cabinet.delivery.convergence.1',status:'BLOCKED',
  code,issues:[{code,level:'BLOCKED'}],rows:[],rails:[],totals:{placed:0,articles:0,occupied:0,free:0,
   imageReviewed:0,imageStylized:0,imageRejected:0,geometryConflicts:0,unplaced:0,actionable:0},
  engineeringApproved:false,ready_for_installation:false,manufacturerCabinetFitVerified:false});
 if(!project||typeof lookup!=='function'||typeof resolve!=='function'||typeof epDraftBoardPlanV1!=='function'||
  typeof epDraftBomV1!=='function'||typeof epBoardCapacityReviewV1!=='function'||
  typeof epFrontEvidenceLedgerV1!=='function'||typeof epFrontReviewQueueV1!=='function')
  return empty('CONVERGENCE_ENGINES_UNAVAILABLE');
 const cached=new Map(),failed=new Set();
 const once=sku=>{
  if(failed.has(sku))throw Error('LOOKUP_FAILED');
  if(cached.has(sku))return cached.get(sku);
  try{
   const item=lookup(sku);
   const copy=item&&typeof item==='object'?JSON.parse(JSON.stringify(item)):item;
   cached.set(sku,copy);return copy;
  }catch(_){failed.add(sku);throw Error('LOOKUP_FAILED');}
 };
 let board,bom,capacity;
 try{
  board=epDraftBoardPlanV1(project,once);
  bom=epDraftBomV1(project,once);
  capacity=epBoardCapacityReviewV1(project,once);
 }catch(_){return empty('CONVERGENCE_ENGINE_FAILED');}
 if(!Array.isArray(board?.placements)||!Array.isArray(bom?.devices)||!Array.isArray(capacity?.rails))
  return empty('CONVERGENCE_ENGINE_RESULT_INVALID');
 const issues=[],add=(code,deviceId=null,level='BLOCKED')=>issues.push({code,deviceId,level});
 const placements=new Map(),bomById=new Map();
 for(const p of board.placements){
  const id=String(p.deviceId??'');
  if(!id){add('CONVERGENCE_DEVICE_ID_MISSING');continue;}
  if(placements.has(id))add('CONVERGENCE_PLACEMENT_ID_DUPLICATE',id);
  placements.set(id,p);
 }
 for(const b of bom.devices){
  const id=String(b.id??'');
  if(!id){add('CONVERGENCE_BOM_ID_MISSING');continue;}
  if(bomById.has(id))add('CONVERGENCE_BOM_ID_DUPLICATE',id);
  bomById.set(id,b);
 }
 const ids=[...new Set([...placements.keys(),...bomById.keys()])].sort();
 const reconciliationRows=ids.map(id=>{
  const p=placements.get(id),b=bomById.get(id);
  if(!p)add('CONVERGENCE_PLACEMENT_MISSING',id);
  if(!b)add('CONVERGENCE_BOM_MISSING',id);
  if(p&&b&&p.article!==b.sku)add('CONVERGENCE_ARTICLE_MISMATCH',id);
  if(p&&(!Number.isInteger(p.modules)||p.modules<1))add('CONVERGENCE_MODULES_INVALID',id);
  if(p&&(!Number.isInteger(p.railIndex)||p.railIndex<0||p.railIndex>=project.railCount||
   !Number.isInteger(p.startModule)||p.startModule<0||p.startModule+p.modules>project.railCapacity))
   add('CONVERGENCE_PLACEMENT_OUT_OF_BOUNDS',id);
  return {deviceId:id,boardSku:p?.article??null,bomSku:b?.sku??null,railIndex:p?.railIndex??null,
   startModule:p?.startModule??null,modules:p?.modules??null};
 });
 const ledger=epFrontEvidenceLedgerV1(reconciliationRows,once,resolve);
 const queue=epFrontReviewQueueV1(ledger,{filter:'ACTION_REQUIRED',pageSize:100});
 if(ledger.status==='BLOCKED')add('CONVERGENCE_FRONT_EVIDENCE_BLOCKED');
 if(queue.status==='BLOCKED')add('CONVERGENCE_FRONT_REVIEW_BLOCKED');
 if(board.status==='BLOCKED')add('CONVERGENCE_BOARD_BLOCKED');
 if(bom.status==='BLOCKED')add('CONVERGENCE_BOM_BLOCKED');
 if(capacity.status==='BLOCKED')add('CONVERGENCE_CAPACITY_BLOCKED');
 const bySku=new Map(ledger.entries.map(e=>[e.sku,e]));
 const rows=reconciliationRows.map(r=>{
  const evidence=bySku.get(r.boardSku);
  if(evidence&&r.modules!==null&&evidence.modules!==null&&r.modules!==evidence.modules)
   add('CONVERGENCE_CATALOGUE_MODULES_MISMATCH',r.deviceId);
  const deviceIssues=issues.filter(i=>i.deviceId===r.deviceId).map(i=>i.code);
  return {...r,maker:evidence?.maker??'',series:evidence?.series??'',
   frontStatus:evidence?.frontStatus??'CATALOGUE_MISSING',
   geometryStatus:evidence?.geometryStatus??'UNKNOWN',bodyWidthMm:evidence?.widthMm??null,
   nominalSlotWidthMm:r.modules===null?null:r.modules*18,
   issues:[...new Set([...deviceIssues,...(evidence?.issues||[])])],
   engineeringApproved:false};
 });
 const rails=capacity.rails.map(rail=>({railIndex:rail.railIndex,capacity:rail.capacity,
  occupied:rail.occupied,free:rail.free,largestFreeRun:rail.largestFreeRun,
  deviceIds:rail.devices.map(d=>String(d.deviceId))}));
 const totalCapacity=rails.reduce((n,r)=>n+r.capacity,0),occupied=rails.reduce((n,r)=>n+r.occupied,0);
 const expected=board.placements.reduce((n,p)=>n+(Number.isInteger(p.modules)?p.modules:0),0);
 if(occupied!==expected)add('CONVERGENCE_CAPACITY_SUM_MISMATCH');
 if(totalCapacity!==project.railCount*project.railCapacity)add('CONVERGENCE_RAIL_CAPACITY_MISMATCH');
 const unplaced=ids.filter(id=>!placements.has(id)).length;
 if(ledger.totals.quantity!==placements.size)add('CONVERGENCE_LEDGER_QUANTITY_MISMATCH');
 if(rows.length!==ids.length)add('CONVERGENCE_ROW_COUNT_MISMATCH');
 const totals={placed:placements.size,articles:ledger.totals.articles,occupied,free:totalCapacity-occupied,
  imageReviewed:ledger.totals.reviewed,imageStylized:ledger.totals.stylized,
  imageRejected:ledger.totals.rejected,geometryConflicts:ledger.totals.widthConflicts,
  unplaced,actionable:queue.total};
 return {schema:'electropanel.cabinet.delivery.convergence.1',
  status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  code:'CONVERGENCE_REQUIRES_ENGINEER_REVIEW',issues,rows,rails,totals,
  reviewQueue:queue,engineeringApproved:false,ready_for_installation:false,
  manufacturerCabinetFitVerified:false};
}
function epCabinetDeliveryConvergenceCsvV1(report){
 if(!report||!Array.isArray(report.rows))return {status:'BLOCKED',csv:null,code:'CONVERGENCE_EXPORT_INVALID'};
 const q=x=>{const s=String(x??'');return '"'+(/^[\s\uFEFF\u200B]*[=+@\-]/.test(s)||/^[\t\r\n]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"';};
 const header=['device_id','board_sku','bom_sku','manufacturer','series','rail_number','start_module_number',
  'modules','nominal_slot_width_mm','declared_body_width_mm','geometry_status','front_status','issues',
  'engineering_approved','ready_for_installation'];
 const data=report.rows.map(x=>[x.deviceId,x.boardSku,x.bomSku,x.maker,x.series,
  Number.isInteger(x.railIndex)?x.railIndex+1:null,Number.isInteger(x.startModule)?x.startModule+1:null,
  x.modules,x.nominalSlotWidthMm,x.bodyWidthMm,x.geometryStatus,x.frontStatus,x.issues.join('|'),'NO','NO']);
 return {status:report.status,rows:data.length,engineeringApproved:false,
  csv:'\uFEFF'+[header,...data].map(r=>r.map(q).join(';')).join('\r\n')+'\r\n'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetDeliveryConvergenceV1,epCabinetDeliveryConvergenceCsvV1};
