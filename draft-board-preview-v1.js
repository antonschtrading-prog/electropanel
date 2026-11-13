'use strict';
// Read-only geometric DIN preview; modules are nominal slots, not measured enclosure clearances.
function epDraftBoardPreviewV1(project,lookupSku,selectedId=null){
 const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 if(typeof epDraftBoardPlanV1!=='function')return '<p>Предварительная компоновка недоступна.</p>';
 const p=epDraftBoardPlanV1(project,lookupSku);
 if(!Number.isInteger(p.rails)||!Number.isInteger(p.capacityPerRail))
  return '<p>Параметры щита некорректны. Размещение заблокировано.</p>';
 const byRail=Array.from({length:p.rails},()=>[]);
 for(const d of p.placements)if(byRail[d.railIndex])byRail[d.railIndex].push(d);
 const branchMap=new Map((Array.isArray(project?.branchDevices)?project.branchDevices:[]).map(x=>[x.id,x.circuitId]));
 const railRows=byRail.map((items,index)=>{
  const used=items.reduce((n,x)=>n+x.modules,0);
  const sorted=[...items].sort((a,b)=>a.startModule-b.startModule);
  const entries=items.map(x=>'<li'+((x.deviceId===selectedId||branchMap.get(x.deviceId)===selectedId)?' class="ep-circuit-active"':'')+'><strong>'+safe(x.deviceId)+'</strong> · '+safe(x.modules)+
   ' мод. · позиции '+safe(x.startModule+1)+'–'+safe(x.startModule+x.modules)+
   (x.article?' · '+safe(x.article):' · без артикула')+'</li>').join('');
  let cursor=0,blocks='';
  for(const d of sorted){
   if(d.startModule>cursor)blocks+='<div class="ep-din-empty" style="grid-column:span '+(d.startModule-cursor)+'" aria-label="Свободные модули '+(d.startModule-cursor)+'"></div>';
   const active=d.deviceId===selectedId||branchMap.get(d.deviceId)===selectedId;
   const label=safe(d.deviceId)+(d.article?' · '+safe(d.article):' · без артикула');
   const circuitId=branchMap.get(d.deviceId)||((project?.lines||[]).some(l=>l?.id===d.deviceId)?d.deviceId:null);
   blocks+='<button type="button" class="ep-din-block'+(active?' ep-circuit-active':'')+(d.article?'':' ep-din-unverified')+
    '" style="grid-column:span '+d.modules+'" title="'+label+'" aria-label="'+label+'"'+
    (circuitId?' data-din-focus="'+safe(circuitId)+'"':' disabled')+'>'+
    '<span class="ep-din-block-id">'+safe(d.deviceId)+'</span>'+
    '<span class="ep-din-block-article">'+safe(d.article||'Артикул не выбран')+'</span>'+
    '<span class="ep-din-block-width">'+d.modules+'M</span></button>';
   cursor=d.startModule+d.modules;
  }
  if(cursor<p.capacityPerRail)blocks+='<div class="ep-din-empty" style="grid-column:span '+(p.capacityPerRail-cursor)+'" aria-label="Свободные модули '+(p.capacityPerRail-cursor)+'"></div>';
  return '<section class="ep-din-rail-section"><h4>DIN '+(index+1)+' · '+used+'/'+p.capacityPerRail+
   ' мод. · свободно '+(p.capacityPerRail-used)+'</h4>'+
   '<div class="ep-din-module-grid" style="--ep-din-columns:'+p.capacityPerRail+'" role="img" aria-label="Предварительная рейка DIN '+(index+1)+'">'+blocks+'</div>'+
   '<details><summary>Позиции аппаратов</summary><ol>'+entries+'</ol></details></section>';
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
