'use strict';
// Declared circuit-level upstream topology editor. Not a verified device graph.
function epProtectionLinksValidateV1(project, links) {
 const fail=code=>{throw Error('PROTECTION_LINKS_'+code);};
 if(!Array.isArray(project?.lines)||project.lines.length>400)fail('PROJECT_INVALID');
 if(!Array.isArray(links)||links.length>400)fail('INVALID');
 const ids=new Set();
 for(const line of project.lines){
  if(typeof line?.id!=='string'||!line.id||ids.has(line.id))fail('LINE_IDS_INVALID');
  ids.add(line.id);
 }
 const parents=new Map(),out=[];
 for(const pair of links){
  if(!pair||typeof pair!=='object'||Array.isArray(pair)||
    typeof pair.downstreamLineId!=='string'||typeof pair.upstreamLineId!=='string')fail('ENTRY_INVALID');
  const down=pair.downstreamLineId,up=pair.upstreamLineId;
  if(!ids.has(down)||!ids.has(up))fail('UNKNOWN_ENDPOINT');
  if(down===up)fail('SELF_LINK');
  if(parents.has(down))fail('DUPLICATE_DOWNSTREAM');
  parents.set(down,up);
  out.push({downstreamLineId:down,upstreamLineId:up});
 }
 for(const line of ids){
  let node=line;const seen=new Set();
  while(parents.has(node)){
   if(seen.has(node))fail('CYCLE');
   seen.add(node);node=parents.get(node);
  }
 }
 return out;
}
function epProtectionLinksUpdateV1(project,downstream,upstream){
 const all=epProtectionLinksValidateV1(project,project.protectionLinks??[]);
 if(!project.lines.some(x=>x.id===downstream))throw Error('PROTECTION_LINKS_UNKNOWN_DOWNSTREAM');
 if(upstream!==null&&!project.lines.some(x=>x.id===upstream))throw Error('PROTECTION_LINKS_UNKNOWN_UPSTREAM');
 const next=all.filter(x=>x.downstreamLineId!==downstream);
 if(upstream!==null)next.push({downstreamLineId:downstream,upstreamLineId:upstream});
 const valid=epProtectionLinksValidateV1(project,next);
 return {...project,protectionLinksVersion:1,protectionLinks:valid};
}
function epProtectionLinksHtmlV1(project){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const lines=Array.isArray(project?.lines)?project.lines:[];
 const links=Array.isArray(project?.protectionLinks)?project.protectionLinks:[];
 const options=lines.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.id+' · '+(x.name||x.device||'Без названия'))+'</option>').join('');
 const selection=lines.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.id+' · '+(x.name||x.device||'Без названия'))+'</option>').join('');
 const result=typeof epProtectionTopologyV1==='function'?epProtectionTopologyV1(project,links):null;
 return '<section class="ep-protection-links"><h3>Иерархия защитных аппаратов · декларация цепей</h3>'+
 '<p class="muted">Назначьте вышестоящую цепь для отходящей. Это не подтверждает проводное соединение, тип аппарата или селективность.</p>'+
 '<div class="form-grid"><label>Нижестоящая цепь<select id="protectionDownstream"><option value="">Выберите</option>'+selection+'</select></label>'+
 '<label>Вышестоящая цепь<select id="protectionUpstream"><option value="">Нет связи / удалить</option>'+options+'</select></label></div>'+
 '<button type="button" class="btn" id="protectionLinkSave">Сохранить связь</button>'+
 '<p class="muted">Статус схемы: '+esc(result?.status??'UNKNOWN')+
 '; селективность: '+esc(result?.selectivityStatus??'NOT_ASSESSED')+'</p>'+
 '<div class="table-scroll"><table><thead><tr><th>Нижестоящая</th><th>Вышестоящая</th><th></th></tr></thead><tbody>'+
 (links.map(x=>'<tr><td>'+esc(x.downstreamLineId)+'</td><td>'+esc(x.upstreamLineId)+
 '</td><td><button type="button" class="btn tiny" data-protection-unlink="'+esc(x.downstreamLineId)+'">Удалить</button></td></tr>').join('')||
 '<tr><td colspan="3">Связи ещё не заявлены</td></tr>')+
 '</tbody></table></div></section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epProtectionLinksValidateV1,epProtectionLinksUpdateV1,epProtectionLinksHtmlV1};
