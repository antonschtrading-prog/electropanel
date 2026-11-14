'use strict';
// Read-only geometric DIN preview; modules are nominal slots, not measured enclosure clearances.
function epDraftBoardPreviewV1(project,lookupSku,selectedId=null){
 const safe=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 if(typeof epDraftBoardPlanV1!=='function')return '<p>Предварительная компоновка недоступна.</p>';
 const p=epDraftBoardPlanV1(project,lookupSku);
 if(!Number.isInteger(p.rails)||!Number.isInteger(p.capacityPerRail))
  return '<p>Параметры щита некорректны. Размещение заблокировано.</p>';
 const byRail=Array.from({length:p.rails},()=>[]);
 for(const d of (Array.isArray(p.placements)?p.placements:[]))if(d&&byRail[d.railIndex])byRail[d.railIndex].push(d);
 const branchMap=new Map((Array.isArray(project?.branchDevices)?project.branchDevices:[]).filter(x=>x&&typeof x==='object').map(x=>[x.id,x.circuitId]));
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
   let catalog=null;
   try{catalog=d.article&&typeof lookupSku==='function'?lookupSku(d.article):null;}catch(_){}
   const maker=catalog?.maker||null,series=catalog?.series||null;
   const widthKnown=Number.isFinite(catalog?.widthMm)&&catalog.widthMm>0;
   const moduleMatch=Number.isInteger(catalog?.modules)&&catalog.modules===d.modules;
   const envelopeMatch=widthKnown&&catalog.widthMm<=d.modules*18+0.001;
   const geometryIssue=!!catalog&&(!widthKnown||!moduleMatch||!envelopeMatch);
   const evidenceNote=!catalog?'Артикул не выбран':geometryIssue?'Геометрия каталога не согласована с DIN':catalog.verificationStatus!=='VERIFIED'?'Паспортные данные не подтверждены':'Геометрия по заявленному каталогу';
   const rating=catalog&&Number.isFinite(catalog.inA)?
    (safe(catalog.curve||'')+safe(catalog.inA)+' A'):'';
   const breaking=catalog&&Number.isFinite(catalog.icnKa)?safe(catalog.icnKa)+' kA':'';
   const faceStyle=['abb','schneider','iek'].includes(catalog?.appearance)?catalog.appearance:'generic';
   const facade=catalog?
    '<span class="ep-din-brand">'+safe(maker||'Изготовитель не указан')+'</span>'+
    '<span class="ep-din-series">'+safe(series||'Серия не указана')+'</span>'+
    '<span class="ep-din-rating">'+rating+'</span>'+
    '<span class="ep-din-breaking">'+breaking+'</span>':
    '<span class="ep-din-brand">Нет каталожной записи</span>';
   const circuitId=branchMap.get(d.deviceId)||((project?.lines||[]).some(l=>l?.id===d.deviceId)?d.deviceId:null);
   blocks+='<button type="button" class="ep-din-block'+(active?' ep-circuit-active':'')+(d.article?'':' ep-din-unverified')+
    '" style="grid-column:span '+d.modules+'" title="'+label+'" aria-label="'+label+'"'+
    (circuitId?' data-din-focus="'+safe(circuitId)+'"':' disabled')+'>'+
    '<span class="ep-din-block-id">'+safe(d.deviceId)+'</span>'+
    facade+
    '<span class="ep-din-device-face ep-din-face-'+faceStyle+'" aria-hidden="true">'+
    (catalog&&typeof epCatalogFrontSvgV1==='function'?epCatalogFrontSvgV1(catalog,d.deviceId)+'<span class="ep-din-device-toggle" hidden></span>':'<span class="ep-din-device-toggle"></span><span class="ep-din-device-indicator"></span>')+'</span>'+ 
    '<span class="ep-din-block-article">'+safe(d.article||'Артикул не выбран')+'</span>'+ 
    '<span class="ep-din-block-evidence" title="'+safe(evidenceNote)+'">'+safe(evidenceNote)+'</span>'+
    '<span class="ep-din-block-width">'+d.modules+'M</span></button>';
   cursor=d.startModule+d.modules;
  }
  if(cursor<p.capacityPerRail)blocks+='<div class="ep-din-empty" style="grid-column:span '+(p.capacityPerRail-cursor)+'" aria-label="Свободные модули '+(p.capacityPerRail-cursor)+'"></div>';
  return '<section class="ep-din-rail-section"><h4>DIN '+(index+1)+' · '+used+'/'+p.capacityPerRail+
   ' мод. · свободно '+(p.capacityPerRail-used)+'</h4>'+
   '<div class="ep-din-module-grid" style="--ep-din-columns:'+p.capacityPerRail+'" role="img" aria-label="Предварительная рейка DIN '+(index+1)+'">'+blocks+'</div>'+
   '<details><summary>Позиции аппаратов</summary><ol>'+entries+'</ol></details></section>';
 }).join('');
 const errors=(Array.isArray(p.issues)?p.issues:[]).filter(x=>x.level==='BLOCKED');
 const warnings=(Array.isArray(p.issues)?p.issues:[]).filter(x=>x.level!=='BLOCKED');
 return '<div class="ep-draft-board-preview" role="region" aria-label="Предварительная компоновка">'+
  '<p><strong>Предварительный план: '+safe(p.status)+'</strong>. Только геометрическое размещение; монтаж не подтверждён.</p>'+
  railRows+'<p>Блокирующих ошибок: '+errors.length+'; неопределённостей: '+warnings.length+'.</p>'+
  (errors.length?'<ul>'+errors.slice(0,30).map(x=>'<li>'+safe(x.code)+(x.id?' · '+safe(x.id):'')+'</li>').join('')+'</ul>':'')+
  '<p>Проверка нагрева, зазоров, проводников и совместимости корпуса не выполнена.</p></div>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDraftBoardPreviewV1};
