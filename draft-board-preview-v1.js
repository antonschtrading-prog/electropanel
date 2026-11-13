'use strict';
// Read-only preview of a draft DIN plan. Never mutates project data.
function epDraftBoardPreviewV1(project,lookupSku,selectedId=null){
 const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 if(typeof epDraftBoardPlanV1!=='function')return '<p>Предварительная компоновка недоступна.</p>';
 const p=epDraftBoardPlanV1(project,lookupSku);
 if(!Number.isInteger(p.rails)||!Number.isInteger(p.capacityPerRail))
  return '<p>Параметры щита некорректны. Размещение заблокировано.</p>';
 const byRail=Array.from({length:p.rails},()=>[]);
 for(const d of p.placements)if(byRail[d.railIndex])byRail[d.railIndex].push(d);
 const branchMap=new Map((project?.branchDevices||[]).map(x=>[x.id,x.circuitId]));
 const railRows=byRail.map((items,index)=>{
  const used=items.reduce((n,x)=>n+x.modules,0);
  const entries=items.map(x=>'<li'+((x.deviceId===selectedId||branchMap.get(x.deviceId)===selectedId)?' class="ep-circuit-active"':'')+'><strong>'+safe(x.deviceId)+'</strong> · '+safe(x.modules)+
   ' мод. · позиции '+safe(x.startModule+1)+'–'+safe(x.startModule+x.modules)+
   (x.article?' · '+safe(x.article):' · без артикула')+'</li>').join('');
  return '<section><h4>DIN '+(index+1)+' · '+used+'/'+p.capacityPerRail+
   ' мод. · свободно '+(p.capacityPerRail-used)+'</h4><ol>'+entries+'</ol></section>';
 }).join('');
 const errors=p.issues.filter(x=>x.level==='BLOCKED');
 const warnings=p.issues.filter(x=>x.level!=='BLOCKED');
 return '<div class="ep-draft-board-preview" role="region" aria-label="Предварительная компоновка">'+
  '<p><strong>Предварительный план: '+safe(p.status)+'</strong>. Только геометрическое размещение; монтаж не подтверждён.</p>'+
  railRows+'<p>Блокирующих ошибок: '+errors.length+'; неопределённостей: '+warnings.length+'.</p>'+
  (errors.length?'<ul>'+errors.slice(0,30).map(x=>'<li>'+safe(x.code)+(x.id?' · '+safe(x.id):'')+'</li>').join('')+'</ul>':'')+
  '<p>Проверка нагрева, зазоров, проводников и совместимости корпуса не выполнена.</p></div>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDraftBoardPreviewV1};
