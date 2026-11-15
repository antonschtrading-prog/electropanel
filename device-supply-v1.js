'use strict';
// Versioned device-to-device supply declarations. Never equate a graph edge to a wire.
const EP_SUPPLY_V1_ID=/^[A-Za-z0-9_-]{1,60}$/;
function epDeviceSupplyValidateV1(project,model){
 const fail=code=>{throw Error('DEVICE_SUPPLY_'+code);};
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.branchDevices)||
  !Array.isArray(project.sharedDevices))fail('PROJECT_INVALID');
 if(!model||typeof model!=='object'||Array.isArray(model)||model.version!==1||
  !Array.isArray(model.incomingDevices)||!Array.isArray(model.links)||
  model.incomingDevices.length>50||model.links.length>600)fail('MODEL_INVALID');
 const nodeIds=new Set(['SOURCE:MAIN']),devices=[];
 const add=(id)=>{if(nodeIds.has(id))fail('NODE_DUPLICATE');nodeIds.add(id);};
 const lines=new Set(project.lines.map(x=>x?.id));
 for(const b of project.branchDevices){
  if(!b||!EP_SUPPLY_V1_ID.test(b.id)||!lines.has(b.circuitId))fail('BRANCH_INVALID');
  add('BRANCH:'+b.id);
 }
 for(const g of project.sharedDevices){
  if(!g||!EP_SUPPLY_V1_ID.test(g.id))fail('GROUP_INVALID');
  add('GROUP:'+g.id);
 }
 for(const d of model.incomingDevices){
  if(!d||typeof d!=='object'||Array.isArray(d)||
    !EP_SUPPLY_V1_ID.test(d.id)||typeof d.label!=='string'||!d.label.trim()||
    d.label.length>80||!(d.catalogSku===null||d.catalogSku===undefined||
    typeof d.catalogSku==='string'&&d.catalogSku.length<=100))fail('INCOMING_INVALID');
  add('INCOMING:'+d.id);
  devices.push({id:d.id,label:d.label, catalogSku:d.catalogSku??null});
 }
 const parents=new Map(),links=[];
 for(const l of model.links){
  if(!l||typeof l!=='object'||Array.isArray(l)||
   typeof l.from!=='string'||typeof l.to!=='string'||
   !nodeIds.has(l.from)||!nodeIds.has(l.to))fail('ENDPOINT_UNKNOWN');
  if(l.to==='SOURCE:MAIN'||l.from===l.to)fail('DIRECTION_INVALID');
  if(parents.has(l.to))fail('MULTIPLE_SUPPLY_PARENTS');
  if(!Array.isArray(l.conductors)||l.conductors.length<1||l.conductors.length>4)fail('CONDUCTORS_INVALID');
  const conductors=[];
  for(const k of l.conductors){
   if(!['L1','L2','L3','N'].includes(k)||conductors.includes(k))fail('CONDUCTORS_INVALID');
   conductors.push(k);
  }
  if(!conductors.some(k=>k!=='N'))fail('PHASE_REQUIRED');
  parents.set(l.to,l.from);
  links.push({from:l.from,to:l.to,conductors});
 }
 for(const node of nodeIds){
  const seen=new Set();let current=node;
  while(parents.has(current)){
   if(seen.has(current))fail('CYCLE');
   seen.add(current);current=parents.get(current);
  }
 }
 return {version:1,incomingDevices:devices,links};
}
function epDeviceSupplyUpdateV1(project,from,to,conductors){
 const current=epDeviceSupplyValidateV1(project,project.deviceSupplyV1||
  {version:1,incomingDevices:[],links:[]});
 const links=current.links.filter(x=>x.to!==to);
 if(from!==null)links.push({from,to,conductors});
 return epDeviceSupplyValidateV1(project,{...current,links});
}
function epDeviceSupplyIncomingV1(project,device){
 const current=epDeviceSupplyValidateV1(project,project.deviceSupplyV1||
  {version:1,incomingDevices:[],links:[]});
 return epDeviceSupplyValidateV1(project,{...current,
  incomingDevices:[...current.incomingDevices,device]});
}
function epDeviceSupplyRemoveIncomingV1(project,id){
 const current=epDeviceSupplyValidateV1(project,project.deviceSupplyV1||
  {version:1,incomingDevices:[],links:[]});
 if(!current.incomingDevices.some(x=>x.id===id))throw Error('DEVICE_SUPPLY_INCOMING_UNKNOWN');
 return epDeviceSupplyValidateV1(project,{version:1,
  incomingDevices:current.incomingDevices.filter(x=>x.id!==id),
  links:current.links.filter(x=>x.from!=='INCOMING:'+id&&x.to!=='INCOMING:'+id)});
}
function epDeviceSupplyAuditV1(project){
 const issues=[],nodes=[],edges=[],add=(code,level='UNKNOWN',data={})=>issues.push({code,level,...data});
 const finish=()=>({schema:'electropanel.device.supply.audit.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',nodes,edges,issues,
  electricalPath:'DECLARED_NOT_VERIFIED',selectivityStatus:'NOT_ASSESSED',
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||!Array.isArray(project.branchDevices)||
  !Array.isArray(project.sharedDevices)){
  add('DEVICE_SUPPLY_PROJECT_INVALID','BLOCKED');return finish();
 }
 if(!project.deviceSupplyV1){add('DEVICE_SUPPLY_NOT_DECLARED');return finish();}
 let model;
 try{model=epDeviceSupplyValidateV1(project,project.deviceSupplyV1);}
 catch(e){add(e.message,'BLOCKED');return finish();}
 nodes.push({id:'SOURCE:MAIN',kind:'SOURCE'});
 for(const d of model.incomingDevices)nodes.push({id:'INCOMING:'+d.id,kind:'INCOMING',
  label:d.label,catalogSku:d.catalogSku});
 for(const d of project.sharedDevices)nodes.push({id:'GROUP:'+d.id,kind:'GROUP',
  catalogSku:d.catalogSku??null});
 for(const b of project.branchDevices)nodes.push({id:'BRANCH:'+b.id,kind:'BRANCH',
  circuitId:b.circuitId});
 for(const l of model.links)edges.push({...l,evidence:'USER_DECLARED',
  physicalContinuity:'NOT_VERIFIED'});
 const parents=new Map(model.links.map(x=>[x.to,x]));
 for(const node of nodes){
  if(node.kind==='SOURCE')continue;
  if(!parents.has(node.id))add('DEVICE_SUPPLY_PARENT_MISSING','UNKNOWN',{objectId:node.id});
 }
 const lineById=new Map(project.lines.map(x=>[x.id,x]));
 const groupByCircuit=new Map();
 for(const g of project.sharedDevices)for(const c of g.circuitIds||[])
  groupByCircuit.set(c,g.id);
 for(const b of project.branchDevices){
  const line=lineById.get(b.circuitId),parent=parents.get('BRANCH:'+b.id);
  if(!line){add('DEVICE_SUPPLY_BRANCH_CIRCUIT_UNKNOWN','BLOCKED',{objectId:b.id});continue;}
  const required=line.phase==='3Ф'?['L1','L2','L3']:
   ['L1','L2','L3'].includes(line.phase)?[line.phase]:[];
  if(!required.length){add('DEVICE_SUPPLY_PHASE_UNKNOWN','UNKNOWN',{circuitId:line.id});continue;}
  if(parent&&!required.every(k=>parent.conductors.includes(k)))
   add('DEVICE_SUPPLY_BRANCH_PHASE_MISMATCH','BLOCKED',{circuitId:line.id});
  const group=groupByCircuit.get(line.id);
  if(group&&parent&&parent.from!=='GROUP:'+group)
   add('DEVICE_SUPPLY_GROUP_PARENT_CONFLICT','BLOCKED',{circuitId:line.id});
  if(!group&&parent&&parent.from.startsWith('GROUP:'))
   add('DEVICE_SUPPLY_UNDECLARED_GROUP_PARENT','BLOCKED',{circuitId:line.id});
  if(parent&&Array.isArray(project.feedLinks)&&project.feedLinks.some(x=>x.circuitId===line.id))
   add('DEVICE_SUPPLY_LEGACY_FEED_RECONCILIATION_REQUIRED','UNKNOWN',{circuitId:line.id});
 }
 for(const g of project.sharedDevices){
  const parent=parents.get('GROUP:'+g.id);
  if(!parent)continue;
  const required=new Set();
  for(const id of g.circuitIds||[]){
   const phase=lineById.get(id)?.phase;
   for(const k of phase==='3Ф'?['L1','L2','L3']:
    ['L1','L2','L3'].includes(phase)?[phase]:[])required.add(k);
  }
  if(![...required].every(k=>parent.conductors.includes(k)))
   add('DEVICE_SUPPLY_GROUP_PHASE_MISMATCH','BLOCKED',{objectId:g.id});
  if(Array.isArray(project.groupInputLinks)&&project.groupInputLinks.some(x=>x.groupId===g.id))
   add('DEVICE_SUPPLY_LEGACY_GROUP_INPUT_RECONCILIATION_REQUIRED','UNKNOWN',{objectId:g.id});
 }
 const pathToSource=id=>{
  let node=id;
  for(let n=0;n<=nodes.length;n++){
   if(node==='SOURCE:MAIN')return true;
   const p=parents.get(node);if(!p)return false;node=p.from;
  }
  return false;
 };
 for(const n of nodes)if(n.kind!=='SOURCE'&&parents.has(n.id)&&!pathToSource(n.id))
  add('DEVICE_SUPPLY_SOURCE_PATH_INCOMPLETE','UNKNOWN',{objectId:n.id});
 // Never infer manufacturer coordination even when a valid source path exists.
 if(edges.length)add('DEVICE_SUPPLY_SELECTIVITY_EVIDENCE_MISSING');
 return finish();
}
function epDeviceSupplyHtmlV1(project){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const model=project?.deviceSupplyV1||{version:1,incomingDevices:[],links:[]};
 const nodes=[['SOURCE:MAIN','Источник питания'],
  ...(model.incomingDevices||[]).map(x=>['INCOMING:'+x.id,'Вводной · '+x.label]),
  ...(project.sharedDevices||[]).map(x=>['GROUP:'+x.id,'Групповое · '+x.id]),
  ...(project.branchDevices||[]).map(x=>['BRANCH:'+x.id,'Отходящий · '+x.circuitId])];
 const opts=nodes.map(([id,label])=>'<option value="'+esc(id)+'">'+esc(label)+'</option>').join('');
 const status=typeof epDeviceSupplyAuditV1==='function'?epDeviceSupplyAuditV1(project):null;
 return '<section class="ep-device-supply"><h3>Питание между аппаратами · декларация</h3>'+
 '<p class="muted">Это заявленные связи устройств, не подтверждённые физические провода. Выбирайте только реально предполагаемое питание.</p>'+
 '<div class="form-grid"><label>Вводной ID<input id="deviceSupplyIncomingId" maxlength="60" placeholder="QF0"></label>'+
 '<label>Обозначение вводного<input id="deviceSupplyIncomingLabel" maxlength="80" placeholder="Вводной автомат"></label></div>'+
 '<button class="btn" type="button" id="deviceSupplyIncomingSave">Добавить вводной</button>'+
 '<div class="form-grid"><label>От какого устройства<select id="deviceSupplyFrom"><option value="">Удалить связь</option>'+opts+'</select></label>'+
 '<label>К какому устройству<select id="deviceSupplyTo"><option value="">Выберите</option>'+
 nodes.slice(1).map(([id,label])=>'<option value="'+esc(id)+'">'+esc(label)+'</option>').join('')+'</select></label>'+
 '<label>Проводники<select id="deviceSupplyConductors"><option value="L1,N">L1 + N</option>'+
 '<option value="L2,N">L2 + N</option><option value="L3,N">L3 + N</option>'+
 '<option value="L1,L2,L3,N">L1 + L2 + L3 + N</option></select></label></div>'+
 '<button class="btn" type="button" id="deviceSupplyLinkSave">Сохранить связь устройств</button>'+
 '<p class="muted">Состояние: '+esc(status?.status??'UNKNOWN')+
 '; селективность: '+esc(status?.selectivityStatus??'NOT_ASSESSED')+'</p>'+
 '<div class="table-scroll"><table><thead><tr><th>Источник</th><th>Назначение</th><th>Проводники</th><th></th></tr></thead><tbody>'+
 ((model.links||[]).map(x=>'<tr><td>'+esc(x.from)+'</td><td>'+esc(x.to)+
 '</td><td>'+esc(x.conductors?.join(', '))+'</td><td><button class="btn tiny" type="button" data-device-supply-unlink="'+esc(x.to)+'">Удалить</button></td></tr>').join('')||
 '<tr><td colspan="4">Связи не введены</td></tr>')+'</tbody></table></div>'+
 '<div class="mini-actions">'+(model.incomingDevices||[]).map(x=>
 '<button type="button" class="btn tiny" data-device-supply-remove-incoming="'+esc(x.id)+'">Удалить вводной '+esc(x.id)+'</button>').join('')+'</div></section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epDeviceSupplyValidateV1,epDeviceSupplyUpdateV1,epDeviceSupplyIncomingV1,
 epDeviceSupplyRemoveIncomingV1,epDeviceSupplyAuditV1,epDeviceSupplyHtmlV1};
