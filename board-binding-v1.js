'use strict';
// Explicit, reversible bridge between existing Web board apparatus and the
// separate v4.14 device/terminal declaration. No inferred manufacturer terminals.
function epBoardDevicesV1(project){
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:[];
 const lines=Array.isArray(project.lines)?project.lines:[];
 const shared=Array.isArray(project.sharedDevices)?project.sharedDevices:[];
 const output=[];
 for(const b of branches){
  const line=lines.find(x=>x.id===b.circuitId);
  if(!line)continue;
  output.push({id:b.id,scope:'branch',circuitId:b.circuitId,
   sku:line.catalogSku||null,label:b.label,modules:b.modules,
   phase:line.phase||null,templateId:b.templateId||null});
 }
 for(const d of shared)output.push({id:d.id,scope:'shared',circuitId:null,
  sku:null,label:d.label,modules:d.modules,phase:null,templateId:d.templateId||null});
 return output;
}
function epBoardBindingSnapshotV1(boardDevice){
 if(!boardDevice||typeof boardDevice.id!=='string')throw Error('Board apparatus missing');
 return {sku:boardDevice.sku??null,label:boardDevice.label??'',
  modules:boardDevice.modules,phase:boardDevice.phase??null,
  templateId:boardDevice.templateId??null};
}
function epBoardBindingsAuditV1(project,lookupSku){
 const entries=project?.boardBindingsV1??[];
 if(!Array.isArray(entries)||entries.length>500)
  return {status:'BLOCKED',issues:[{code:'BINDINGS_INVALID'}],
   matched:0,boardTotal:0,modelTotal:0,engineeringApproved:false};
 const actual=epBoardDevicesV1(project),model=project?.deviceModelV19;
 const boardById=new Map(actual.map(x=>[x.id,x]));
 const modelById=new Map((model?.devices||[]).map(x=>[x.id,x]));
 const modelTerms=new Map();
 for(const t of model?.terminals||[]){
  if(!modelTerms.has(t.device_id))modelTerms.set(t.device_id,[]);
  modelTerms.get(t.device_id).push(t);
 }
 const issues=[],push=(code,level,extra={})=>issues.push({code,level,...extra});
 const boardSeen=new Set(),modelSeen=new Set();
 for(const entry of entries){
  if(!entry||typeof entry!=='object'||typeof entry.boardDeviceId!=='string'||
    typeof entry.modelDeviceId!=='string'||!entry.snapshot||
    typeof entry.snapshot!=='object'){
   push('BINDING_MALFORMED','BLOCKED');continue;
  }
  if(boardSeen.has(entry.boardDeviceId)||modelSeen.has(entry.modelDeviceId))
   push('BINDING_REUSED','BLOCKED',{boardDeviceId:entry.boardDeviceId,modelDeviceId:entry.modelDeviceId});
  boardSeen.add(entry.boardDeviceId);modelSeen.add(entry.modelDeviceId);
  const b=boardById.get(entry.boardDeviceId),d=modelById.get(entry.modelDeviceId);
  if(!b){push('BOARD_DEVICE_MISSING','BLOCKED',{id:entry.boardDeviceId});continue;}
  if(!d){push('MODEL_DEVICE_MISSING','BLOCKED',{id:entry.modelDeviceId});continue;}
  const current=epBoardBindingSnapshotV1(b);
  if(JSON.stringify(entry.snapshot)!==JSON.stringify(current))
   push('BOARD_DEVICE_CHANGED','BLOCKED',{id:b.id});
  if(!Number.isInteger(d.poles)||d.poles<1||d.poles>4)
   push('MODEL_POLES_UNKNOWN','UNKNOWN',{id:d.id});
  // A 1P catalogue record is not a 2P/4P switch. Never infer poles from DIN width.
  const article=b.sku&&typeof lookupSku==='function'?lookupSku(b.sku):null;
  if(b.sku&&!article)push('CATALOG_ARTICLE_NOT_FOUND','BLOCKED',{id:b.id});
  if(article&&article.poles!==d.poles)
   push('CATALOG_POLES_CONFLICT','BLOCKED',{id:b.id,declared:d.poles,catalog:article.poles});
  if(!article)push('POLES_NOT_VERIFIED_BY_CATALOG','UNKNOWN',{id:b.id});
  if(b.scope==='shared'){
   const expected=b.templateId==='RCD_2P'?2:b.templateId==='RCD_4P'?4:null;
   if(expected!==null&&d.poles!==expected)
    push('SHARED_RCD_POLE_CONFLICT','BLOCKED',{id:b.id,expected,declared:d.poles});
  }
  const terminals=modelTerms.get(d.id)||[];
  if(!terminals.length)push('MODEL_TERMINALS_MISSING','UNKNOWN',{id:d.id});
  if(b.scope==='branch'){
   const allowed=b.phase==='3Ф'?new Set(['L1','L2','L3','N','PE','CONTROL']):
    ['L1','L2','L3'].includes(b.phase)?new Set([b.phase,'N','PE','CONTROL']):null;
   if(!allowed)push('CIRCUIT_PHASE_UNDEFINED','BLOCKED',{id:b.id});
   else for(const t of terminals)if(!allowed.has(t.conductor))
    push('TERMINAL_PHASE_CONFLICT','BLOCKED',{id:b.id,terminal:t.id,role:t.conductor});
  }
  // Topological/device identity is still a declaration, not a physical connection.
  push('TERMINAL_IDENTITY_NOT_MANUFACTURER_VERIFIED','UNKNOWN',{id:b.id});
 }
 if(model){
  for(const d of model.devices||[])if(!modelSeen.has(d.id))
   push('MODEL_DEVICE_UNBOUND','UNKNOWN',{id:d.id});
  for(const b of actual)if(!boardSeen.has(b.id))
   push('BOARD_DEVICE_UNBOUND','UNKNOWN',{id:b.id});
 }else if(entries.length)push('MODEL_ABSENT','BLOCKED');
 const blocked=issues.some(x=>x.level==='BLOCKED');
 return {schema_version:'1.0',status:blocked?'BLOCKED':'UNKNOWN',
  matched:entries.length,boardTotal:actual.length,modelTotal:model?.devices?.length||0,
  issues,engineeringApproved:false,ready_for_installation:false,
  warning:'Binding references a declared board device and declared terminal identities, not physical terminal numbers or certified manufacturer assets.'};
}
function epNewBoardBindingV1(project,modelId,boardId){
 const model=project?.deviceModelV19?.devices||[];
 if(!model.some(d=>d.id===modelId))throw Error('No device in terminal model');
 const board=epBoardDevicesV1(project).find(d=>d.id===boardId);
 if(!board)throw Error('No board apparatus');
 return {modelDeviceId:modelId,boardDeviceId:boardId,
  snapshot:epBoardBindingSnapshotV1(board)};
}
function epNormalizeBoardBindingsV1(input){
 if(!Array.isArray(input)||input.length>500)throw Error('Invalid bindings array');
 const seenModel=new Set(),seenBoard=new Set();
 return input.map(x=>{
  if(!x||typeof x!=='object'||Array.isArray(x)||
    Object.keys(x).some(k=>!['modelDeviceId','boardDeviceId','snapshot'].includes(k))||
    typeof x.modelDeviceId!=='string'||x.modelDeviceId.length>128||
    typeof x.boardDeviceId!=='string'||x.boardDeviceId.length>128||
    !x.snapshot||typeof x.snapshot!=='object'||Array.isArray(x.snapshot))
   throw Error('Invalid binding');
  if(seenModel.has(x.modelDeviceId)||seenBoard.has(x.boardDeviceId))
   throw Error('Duplicate board/device binding');
  seenModel.add(x.modelDeviceId);seenBoard.add(x.boardDeviceId);
  const allowed=['sku','label','modules','phase','templateId'];
  if(Object.keys(x.snapshot).some(k=>!allowed.includes(k))||
     typeof x.snapshot.label!=='string'||x.snapshot.label.length>100||
     !Number.isInteger(x.snapshot.modules)||x.snapshot.modules<1||x.snapshot.modules>12)
   throw Error('Invalid apparatus snapshot');
  for(const k of ['sku','phase','templateId'])
   if(x.snapshot[k]!==null&&x.snapshot[k]!==undefined&&
      (typeof x.snapshot[k]!=='string'||x.snapshot[k].length>128))
    throw Error('Invalid snapshot '+k);
  return {modelDeviceId:x.modelDeviceId,boardDeviceId:x.boardDeviceId,
   snapshot:{sku:x.snapshot.sku??null,label:x.snapshot.label,
    modules:x.snapshot.modules,phase:x.snapshot.phase??null,
    templateId:x.snapshot.templateId??null}};
 });
}
