'use strict';
// Explicit incoming apparatus -> declared terminal-model device association.
// No implicit manufacturer terminal number or electrical continuity.
function epIncomingTerminalBindingSnapshotV1(project,incomingId,modelDeviceId){
 const incoming=project?.deviceSupplyV1?.incomingDevices?.find(x=>x.id===incomingId);
 const model=project?.deviceModelV19;
 const device=model?.devices?.find(x=>x.id===modelDeviceId);
 if(!incoming||!device||!Array.isArray(model.terminals))
  throw Error('INCOMING_BINDING_ENTITY_NOT_FOUND');
 const terminals=model.terminals.filter(t=>t.device_id===modelDeviceId)
  .map(t=>({id:t.id,conductor:t.conductor})).sort((a,b)=>a.id.localeCompare(b.id));
 if(new Set(terminals.map(t=>t.id)).size!==terminals.length)
  throw Error('INCOMING_BINDING_DUPLICATE_TERMINAL');
 return {incoming:{label:incoming.label,catalogSku:incoming.catalogSku??null},
  model:{kind:device.kind??null,poles:device.poles??null,terminals}};
}
function epIncomingTerminalBindingsNormalizeV1(project,items){
 if(!Array.isArray(items)||items.length>50)throw Error('INCOMING_BINDINGS_INVALID');
 const ids=new Set(),modelIds=new Set(),out=[];
 for(const item of items){
  if(!item||typeof item!=='object'||Array.isArray(item)||
   Object.keys(item).some(x=>!['incomingId','modelDeviceId','snapshot'].includes(x))||
   typeof item.incomingId!=='string'||typeof item.modelDeviceId!=='string'||
   item.incomingId.length>60||item.modelDeviceId.length>128||
   !item.incomingId||!item.modelDeviceId||ids.has(item.incomingId)||
   modelIds.has(item.modelDeviceId)||!item.snapshot||typeof item.snapshot!=='object'||
   Array.isArray(item.snapshot))throw Error('INCOMING_BINDING_ENTRY_INVALID_OR_DUPLICATED');
  ids.add(item.incomingId);modelIds.add(item.modelDeviceId);
  const fresh=epIncomingTerminalBindingSnapshotV1(project,item.incomingId,item.modelDeviceId);
  // A stale imported snapshot remains stale. Do NOT silently refresh it.
  const snapshot=JSON.parse(JSON.stringify(item.snapshot));
  if(JSON.stringify(snapshot).length>15000)throw Error('INCOMING_BINDING_SNAPSHOT_TOO_LARGE');
  if(!snapshot.incoming||!snapshot.model||!Array.isArray(snapshot.model.terminals)||
   snapshot.model.terminals.length>100||
   snapshot.model.terminals.some(t=>typeof t?.id!=='string'||typeof t?.conductor!=='string'))
   throw Error('INCOMING_BINDING_SNAPSHOT_INVALID');
  out.push({incomingId:item.incomingId,modelDeviceId:item.modelDeviceId,snapshot});
 }
 return out;
}
function epIncomingTerminalBindingSetV1(project,incomingId,modelDeviceId){
 const snapshot=epIncomingTerminalBindingSnapshotV1(project,incomingId,modelDeviceId);
 const prior=epIncomingTerminalBindingsNormalizeV1(project,project.incomingTerminalBindingsV1??[]);
 if(prior.some(x=>x.modelDeviceId===modelDeviceId&&x.incomingId!==incomingId))
  throw Error('INCOMING_BINDING_MODEL_ALREADY_ASSIGNED');
 if((project.boardBindingsV1||[]).some(x=>x.modelDeviceId===modelDeviceId))
  throw Error('INCOMING_BINDING_MODEL_USED_BY_BOARD_DEVICE');
 const next=prior.filter(x=>x.incomingId!==incomingId);
 next.push({incomingId,modelDeviceId,snapshot});
 return epIncomingTerminalBindingsNormalizeV1(project,next);
}
function epIncomingTerminalBindingClearV1(project,incomingId){
 const prior=epIncomingTerminalBindingsNormalizeV1(project,project.incomingTerminalBindingsV1??[]);
 return prior.filter(x=>x.incomingId!==incomingId);
}
function epIncomingTerminalBindingsAuditV1(project){
 const issues=[],rows=[],add=(code,level='UNKNOWN',detail={})=>issues.push({code,level,...detail});
 const finish=()=>({schema:'electropanel.incoming.terminal.bindings.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  rows,issues,engineeringApproved:false,ready_for_installation:false});
 if(!project?.deviceSupplyV1){
  add('INCOMING_BINDING_SUPPLY_MODEL_MISSING');return finish();
 }
 let entries;
 try{entries=epIncomingTerminalBindingsNormalizeV1(project,project.incomingTerminalBindingsV1??[]);}
 catch(error){add(error.message,'BLOCKED');return finish();}
 const seen=new Set();
 for(const b of entries){
  const actual=epIncomingTerminalBindingSnapshotV1(project,b.incomingId,b.modelDeviceId);
  const stale=JSON.stringify(actual)!==JSON.stringify(b.snapshot);
  const clash=(project.boardBindingsV1||[]).some(x=>x.modelDeviceId===b.modelDeviceId);
  if(stale)add('INCOMING_BINDING_SNAPSHOT_STALE','BLOCKED',{objectId:b.incomingId});
  if(clash)add('INCOMING_BINDING_MODEL_REUSED','BLOCKED',{objectId:b.incomingId});
  rows.push({incomingId:b.incomingId,modelDeviceId:b.modelDeviceId,
   snapshotStale:stale,modelReused:clash,terminalCount:actual.model.terminals.length,
   status:stale||clash?'BLOCKED':'UNKNOWN'});
  seen.add(b.incomingId);
 }
 for(const d of project.deviceSupplyV1.incomingDevices||[])
  if(!seen.has(d.id))add('INCOMING_BINDING_REQUIRED','UNKNOWN',{objectId:d.id});
 if(entries.length)add('INCOMING_BINDING_TERMINAL_MANUFACTURER_EVIDENCE_REQUIRED');
 return finish();
}
function epIncomingTerminalBindingsHtmlV1(project){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const inc=project?.deviceSupplyV1?.incomingDevices||[],devices=project?.deviceModelV19?.devices||[];
 const items=project?.incomingTerminalBindingsV1||[];
 const opts=(list,make)=>
  '<option value="">Выберите</option>'+list.map(x=>'<option value="'+esc(x.id)+'">'+esc(make(x))+'</option>').join('');
 const report=epIncomingTerminalBindingsAuditV1(project);
 return '<details class="ep-incoming-terminal-bindings"><summary>Привязка вводных аппаратов к терминальной модели · '+esc(report.status)+'</summary>'+
  '<p class="muted">Выберите устройство модели для каждого вводного аппарата. Изменение маркировки, артикула, контактов или их ролей делает прежнюю привязку устаревшей.</p>'+
  '<div class="form-grid"><label>Вводной<select id="incomingBindingIncoming">'+
  opts(inc,x=>x.id+' · '+x.label)+'</select></label>'+
  '<label>Устройство терминальной модели<select id="incomingBindingModel">'+
  opts(devices,x=>x.id+' · '+(x.kind||'тип не указан'))+'</select></label></div>'+
  '<button class="btn" type="button" id="incomingBindingSave">Назначить</button>'+
  '<button class="btn" type="button" id="incomingBindingClear">Очистить привязку</button>'+
  '<div class="table-scroll"><table><thead><tr><th>Вводной</th><th>Устройство модели</th><th>Статус</th></tr></thead><tbody>'+
  (items.map(b=>'<tr><td>'+esc(b.incomingId)+'</td><td>'+esc(b.modelDeviceId)+'</td><td>'+
   esc(report.rows.find(x=>x.incomingId===b.incomingId)?.status||'BLOCKED')+'</td></tr>').join('')||
   '<tr><td colspan="3">Привязки отсутствуют</td></tr>')+
  '</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epIncomingTerminalBindingSnapshotV1,epIncomingTerminalBindingsNormalizeV1,
 epIncomingTerminalBindingSetV1,epIncomingTerminalBindingClearV1,
 epIncomingTerminalBindingsAuditV1,epIncomingTerminalBindingsHtmlV1};
