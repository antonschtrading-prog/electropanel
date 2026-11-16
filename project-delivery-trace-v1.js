'use strict';
// One project -> four independently generated engineering views. Never fills missing design inputs.
function epProjectDeliveryTraceV1(project,lookupSku){
 const issues=[],rows=[],sections={};
 const add=(code,level='UNKNOWN',lineId=null)=>issues.push({code,level,lineId});
 const result=()=>({schema:'electropanel.project.delivery-trace.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  rows,sections,issues,engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.loads)||project.lines.length>400){
  add('DELIVERY_PROJECT_INVALID','BLOCKED');return result();
 }
 const engines=[
  ['BOARD','epDraftBoardPlanV1'],['BOM','epDraftBomV1'],['SINGLE_LINE','epSingleLineDraftV1'],
  ['WORKFLOW','epWorkflowPreviewV1']
 ];
 const engine=(name)=>({
  BOARD:typeof epDraftBoardPlanV1==='function'?epDraftBoardPlanV1:null,
  BOM:typeof epDraftBomV1==='function'?epDraftBomV1:null,
  SINGLE_LINE:typeof epSingleLineDraftV1==='function'?epSingleLineDraftV1:null,
  WORKFLOW:typeof epWorkflowPreviewV1==='function'?epWorkflowPreviewV1:null
 })[name];
 for(const [name] of engines){
  const fn=engine(name);
  if(!fn){sections[name]={status:'UNAVAILABLE'};add('DELIVERY_'+name+'_ENGINE_UNAVAILABLE','BLOCKED');continue;}
  try{
   const data=name==='WORKFLOW'?fn(project,lookupSku,[],project.workflowDesignInputsV1):fn(project,lookupSku);
   sections[name]={status:data?.status??'UNKNOWN',issues:data?.issues?.length??0,data};
   if(data?.status==='BLOCKED')add('DELIVERY_'+name+'_BLOCKED','BLOCKED');
  }catch(_){sections[name]={status:'FAILED'};add('DELIVERY_'+name+'_FAILED','BLOCKED');}
 }
 const ids=new Set(),loads=new Map();
 for(const load of project.loads){
  if(!load||typeof load.circuitId!=='string'){add('DELIVERY_LOAD_UNASSIGNED');continue;}
  loads.set(load.circuitId,(loads.get(load.circuitId)||0)+1);
 }
 const board=sections.BOARD?.data,bom=sections.BOM?.data,scheme=sections.SINGLE_LINE?.data,workflow=sections.WORKFLOW?.data;
 const placements=Array.isArray(board?.placements)?board.placements:[];
 const devices=Array.isArray(bom?.devices)?bom.devices:[];
 const nodes=Array.isArray(scheme?.nodes)?scheme.nodes:[];
 const workflowRows=Array.isArray(workflow?.rows)?workflow.rows:[];
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:[];
 for(const line of project.lines){
  if(!line||typeof line.id!=='string'||!line.id){add('DELIVERY_LINE_ID_INVALID','BLOCKED');continue;}
  if(ids.has(line.id)){add('DELIVERY_DUPLICATE_LINE_ID','BLOCKED',line.id);continue;}
  ids.add(line.id);
  const branchMatches=branches.filter(b=>b?.circuitId===line.id);
  const deviceId=branchMatches.length===1?branchMatches[0].id:line.id;
  const p=placements.filter(x=>x.deviceId===deviceId);
  const b=devices.filter(x=>x.owner===line.id&&x.kind==='branch');
  const s=nodes.filter(x=>x.id==='CIRCUIT:'+line.id);
  const w=workflowRows.filter(x=>x.lineId===line.id);
  const issuesBefore=issues.length;
  if(branchMatches.length>1)add('DELIVERY_BRANCH_DUPLICATED','BLOCKED',line.id);
  if(project.branchDevices!==undefined&&!branchMatches.length)add('DELIVERY_BRANCH_MISSING','BLOCKED',line.id);
  if(p.length===0)add('DELIVERY_PLACEMENT_MISSING','UNKNOWN',line.id);
  if(p.length>1)add('DELIVERY_PLACEMENT_DUPLICATED','BLOCKED',line.id);
  if(b.length===0)add('DELIVERY_BOM_DEVICE_MISSING','UNKNOWN',line.id);
  if(b.length>1)add('DELIVERY_BOM_DEVICE_DUPLICATED','BLOCKED',line.id);
  if(s.length===0)add('DELIVERY_SCHEMATIC_CIRCUIT_MISSING','UNKNOWN',line.id);
  if(s.length>1)add('DELIVERY_SCHEMATIC_CIRCUIT_DUPLICATED','BLOCKED',line.id);
  if(w.length===0)add('DELIVERY_WORKFLOW_ROW_MISSING','UNKNOWN',line.id);
  if(w.length>1)add('DELIVERY_WORKFLOW_ROW_DUPLICATED','BLOCKED',line.id);
  if(p[0]&&Number.isInteger(line.modules)&&p[0].modules!==line.modules)add('DELIVERY_BOARD_WIDTH_MISMATCH','BLOCKED',line.id);
  if(line.catalogSku&&b[0]&&b[0].sku!==line.catalogSku)add('DELIVERY_BOM_SKU_MISMATCH','BLOCKED',line.id);
  if(line.catalogSku&&s[0]&&s[0].sku!==line.catalogSku)add('DELIVERY_SCHEMATIC_SKU_MISMATCH','BLOCKED',line.id);
  if(!line.catalogSku)add('DELIVERY_SKU_NOT_SELECTED','UNKNOWN',line.id);
  if(!loads.has(line.id))add('DELIVERY_CONSUMERS_NOT_LINKED','UNKNOWN',line.id);
  rows.push({lineId:line.id,name:line.name??line.id,deviceId,consumerCount:loads.get(line.id)||0,
   articleSku:line.catalogSku??null,phase:line.phase??null,board:p[0]??null,
   bom:b[0]??null,schematic:s[0]??null,workflow:w[0]??null,
   crossViewStatus:issues.length>issuesBefore?'REVIEW_REQUIRED':'LINKED_DRAFT'});
 }
 for(const id of loads.keys())if(!ids.has(id))add('DELIVERY_ORPHAN_CONSUMER','BLOCKED',id);
 for(const p of placements)if(!rows.some(r=>r.deviceId===p.deviceId)&&!project.sharedDevices?.some(x=>x.id===p.deviceId))
  add('DELIVERY_ORPHAN_PLACEMENT','BLOCKED',p.deviceId);
 for(const d of devices)if(d.kind==='branch'&&!ids.has(d.owner))add('DELIVERY_ORPHAN_BOM_DEVICE','BLOCKED',d.owner);
 for(const n of nodes)if(n.type==='circuit'&&!ids.has(n.id.slice(8)))add('DELIVERY_ORPHAN_SCHEMATIC_CIRCUIT','BLOCKED',n.id);
 return result();
}
if(typeof module!=='undefined')module.exports={epProjectDeliveryTraceV1};
