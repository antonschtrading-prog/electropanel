'use strict';
// Read-only mapping of declared circuit hierarchy to actual project apparatus IDs.
// This is an identity/evidence reconciliation, NOT a conductor-continuity or selectivity study.
function epProtectionDeviceChainV1(project, lookup){
 const issues=[],pairs=[],add=(code,level='UNKNOWN',detail={})=>issues.push({code,level,...detail});
 const finish=()=>({schema:'electropanel.protection.device.chain.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  pairs,issues,selectivityStatus:'NOT_ASSESSED',engineeringApproved:false,
  ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||project.lines.length>400){
  add('CHAIN_PROJECT_INVALID','BLOCKED');return finish();
 }
 if(typeof epProtectionTopologyV1!=='function'){
  add('CHAIN_TOPOLOGY_UNAVAILABLE','BLOCKED');return finish();
 }
 const topology=epProtectionTopologyV1(project,project.protectionLinks);
 if(topology.status==='BLOCKED'){
  for(const item of topology.issues.filter(x=>x.level==='BLOCKED'))
   add('CHAIN_'+item.code,'BLOCKED',{lineId:item.lineId??null});
  return finish();
 }
 if(!Array.isArray(project.protectionLinks)||!project.protectionLinks.length){
  add('CHAIN_RELATIONSHIPS_UNDECLARED');return finish();
 }
 const branches=project.branchDevices,byLine=new Map(),deviceIds=new Set();
 if(!Array.isArray(branches)||project.branchModelVersion!==1){
  add('CHAIN_BRANCH_MODEL_UNAVAILABLE');return finish();
 }
 for(const device of branches){
  if(!device||typeof device.id!=='string'||!device.id.trim()||
     typeof device.circuitId!=='string'||!device.circuitId.trim()||
     deviceIds.has(device.id)||byLine.has(device.circuitId)){
   add('CHAIN_BRANCH_DEVICE_INVALID_OR_DUPLICATED','BLOCKED');continue;
  }
  deviceIds.add(device.id);byLine.set(device.circuitId,device);
 }
 const lines=new Map(project.lines.map(x=>[x.id,x]));
 for(const edge of topology.edges){
  const down=lines.get(edge.downstreamLineId),up=lines.get(edge.upstreamLineId);
  const downDevice=byLine.get(edge.downstreamLineId),upDevice=byLine.get(edge.upstreamLineId);
  const pairIssues=[],flag=(code,level='UNKNOWN')=>{
   pairIssues.push({code,level,lineId:edge.downstreamLineId});
   add(code,level,{lineId:edge.downstreamLineId});
  };
  if(!downDevice||!upDevice)flag('CHAIN_PROTECTIVE_DEVICE_BINDING_MISSING');
  const details=(line,device)=>{
   const sku=typeof line?.catalogSku==='string'&&line.catalogSku.trim()?line.catalogSku:null;
   if(!sku){flag('CHAIN_SELECTED_ARTICLE_UNDECLARED');return {sku:null,kind:null,inA:null};}
   if(typeof lookup!=='function'){flag('CHAIN_CATALOGUE_UNAVAILABLE');return {sku,kind:null,inA:null};}
   let article;
   try{article=lookup(sku);}catch(_){flag('CHAIN_CATALOGUE_LOOKUP_FAILED','BLOCKED');}
   if(!article){flag('CHAIN_ARTICLE_NOT_FOUND','BLOCKED');return {sku,kind:null,inA:null};}
   if(!['MCB','RCBO'].includes(article.kind))
    flag('CHAIN_ARTICLE_NOT_OVERCURRENT_PROTECTIVE','BLOCKED');
   if(article.verificationStatus!=='VERIFIED')flag('CHAIN_ARTICLE_SOURCE_REVIEW_REQUIRED');
   if(device&&typeof device.label==='string'&&typeof line.device==='string'&&
      device.label!==line.device)flag('CHAIN_DEVICE_LABEL_MISMATCH');
   const raw=article.inA;
   const inA=(typeof raw==='number'&&Number.isFinite(raw)&&raw>0)?raw:null;
   if(inA===null)flag('CHAIN_RATED_CURRENT_UNKNOWN');
   return {sku,kind:article.kind??null,inA};
  };
  const downstream=details(down,downDevice),upstream=details(up,upDevice);
  if(downstream.inA!==null&&upstream.inA!==null&&upstream.inA<downstream.inA)
   flag('CHAIN_UPSTREAM_RATING_LT_DOWNSTREAM','UNKNOWN');
  // DIN order and nominal amperes never prove electrical connection or selectivity.
  flag('CHAIN_PHYSICAL_PATH_NOT_PROVEN');
  flag('CHAIN_SELECTIVITY_MANUFACTURER_EVIDENCE_MISSING');
  pairs.push({downstreamLineId:edge.downstreamLineId,upstreamLineId:edge.upstreamLineId,
   downstreamDeviceId:downDevice?.id??null,upstreamDeviceId:upDevice?.id??null,
   downstream,upstream,relation:'DECLARED_NOT_VERIFIED',
   selectivityStatus:'NOT_ASSESSED',issues:pairIssues,engineeringApproved:false});
 }
 return finish();
}
function epProtectionDeviceChainHtmlV1(report){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.pairs))
  return '<p>Проверка идентификаторов защиты недоступна.</p>';
 const rows=report.pairs.map(p=>'<tr><td>'+esc(p.downstreamLineId)+'</td><td>'+
  esc(p.downstreamDeviceId??'—')+'</td><td>'+esc(p.downstream?.sku??'—')+
  '</td><td>'+esc(p.upstreamLineId)+'</td><td>'+esc(p.upstreamDeviceId??'—')+
  '</td><td>'+esc(p.upstream?.sku??'—')+'</td><td>'+esc(p.selectivityStatus)+'</td></tr>').join('');
 return '<details class="ep-protection-device-chain"><summary>Аппараты в иерархии · '+
  report.pairs.length+' пар · '+esc(report.status)+'</summary>'+
  '<p class="muted">Показаны ID аппаратов и заявленные артикулы. Электрическое соединение и селективность не подтверждены.</p>'+
  '<div class="table-scroll"><table><thead><tr><th>Цепь</th><th>Аппарат</th><th>Артикул</th>'+
  '<th>Вышестоящая цепь</th><th>Аппарат</th><th>Артикул</th><th>Селективность</th></tr></thead>'+
  '<tbody>'+(rows||'<tr><td colspan="7">Нет заявленных пар</td></tr>')+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epProtectionDeviceChainV1,epProtectionDeviceChainHtmlV1};
