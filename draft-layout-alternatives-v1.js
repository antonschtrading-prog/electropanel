'use strict';
// Pure draft-only packing alternatives. Reordering apparatus has NO wiring or engineering implications.
function epDraftLayoutAlternativesV1(project,lookupSku){
 const fail=(code)=>({status:'BLOCKED',issues:[{code,level:'BLOCKED'}],baseline:null,compact:null,
  engineeringApproved:false,ready_for_installation:false});
 if(typeof epDraftBoardPlanV1!=='function')return fail('BOARD_PLANNER_UNAVAILABLE');
 const baseline=epDraftBoardPlanV1(project,lookupSku);
 if(!project||!Array.isArray(project.lines)||!Number.isInteger(project.railCount)||
  !Number.isInteger(project.railCapacity)||project.railCount<1||project.railCapacity<1||
  project.railCount>100||project.railCapacity>200)return fail('BOARD_INPUT_INVALID');
 const entries=[],issues=[],seen=new Set(),branches=Array.isArray(project.branchDevices)?project.branchDevices:null;
 for(const d of Array.isArray(project.sharedDevices)?project.sharedDevices:[]){
  if(!d||typeof d.id!=='string'||!d.id||seen.has(d.id)){issues.push({code:'DEVICE_ID_INVALID',level:'BLOCKED'});continue;}
  seen.add(d.id);entries.push({id:d.id,kind:'shared',sku:d.catalogSku||null,modules:d.modules});
 }
 for(const l of project.lines){
  if(!l||typeof l.id!=='string'||!l.id){issues.push({code:'LINE_INVALID',level:'BLOCKED'});continue;}
  const b=branches?.find(x=>x?.circuitId===l.id),id=b?.id??l.id;
  if(seen.has(id)){issues.push({code:'DEVICE_ID_DUPLICATE',level:'BLOCKED',id});continue;}
  seen.add(id);
  if(branches&&(!b||b.modules!==l.modules))issues.push({code:'BRANCH_BINDING_INVALID',level:'BLOCKED',id});
  entries.push({id,kind:'branch',sku:l.catalogSku||null,modules:b?.modules??l.modules});
 }
 const valid=[];
 for(const e of entries){
  let modules=e.modules;
  if(e.sku){
   let a=null;try{a=typeof lookupSku==='function'?lookupSku(e.sku):null;}catch(_){}
   if(!a||!Number.isInteger(a.modules)||a.modules<1){
    issues.push({code:'ARTICLE_WIDTH_UNVERIFIED',level:'BLOCKED',id:e.id});continue;
   }
   if(modules!==a.modules)issues.push({code:'WIDTH_CONFLICT',level:'BLOCKED',id:e.id});
   modules=a.modules;
  }else issues.push({code:'ARTICLE_NOT_SELECTED',level:'UNKNOWN',id:e.id});
  if(!Number.isInteger(modules)||modules<1||modules>project.railCapacity){
   issues.push({code:'DEVICE_TOO_WIDE',level:'BLOCKED',id:e.id});continue;
  }
  valid.push({...e,modules});
 }
 // First-fit decreasing is only an alternative layout, never a design recommendation.
 const ordered=[...valid].sort((a,b)=>b.modules-a.modules||a.id.localeCompare(b.id));
 const rails=Array.from({length:project.railCount},()=>({used:0,devices:[]}));
 const unplaced=[];
 for(const d of ordered){
  const rail=rails.find(x=>x.used+d.modules<=project.railCapacity);
  if(!rail){unplaced.push(d.id);continue;}
  rail.devices.push({deviceId:d.id,kind:d.kind,article:d.sku,modules:d.modules,startModule:rail.used});
  rail.used+=d.modules;
 }
 const placements=rails.flatMap((rail,index)=>rail.devices.map(x=>({...x,railIndex:index})));
 const compact={placements,rails:project.railCount,capacityPerRail:project.railCapacity,
  unplaced,placedCount:placements.length,usedModules:placements.reduce((n,x)=>n+x.modules,0)};
 const baselineUnplaced=valid.length-baseline.placements.length;
 const comparison={baselinePlaced:baseline.placements.length,compactPlaced:compact.placedCount,
  baselineUnplaced:Math.max(0,baselineUnplaced),compactUnplaced:unplaced.length,
  gainedDevices:compact.placedCount-baseline.placements.length};
 if(unplaced.length)issues.push({code:'COMPACT_CAPACITY_EXCEEDED',level:'BLOCKED'});
 if(baseline.status==='BLOCKED')issues.push({code:'BASELINE_HAS_BLOCKING_ISSUES',level:'BLOCKED'});
 issues.push({code:'WIRING_ORDER_THERMAL_AND_CLEARANCES_NOT_VERIFIED',level:'UNKNOWN'});
 return {schema:'electropanel.layout.alternatives.draft.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  baseline,compact,comparison,issues,engineeringApproved:false,ready_for_installation:false,
  note:'Alternative rearranges devices for module occupancy only. Do not apply to physical wiring without engineering review.'};
}
function epDraftLayoutAlternativesHtmlV1(report){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report?.compact)return '<p>Сравнение вариантов компоновки недоступно.</p>';
 const rows=report.compact.placements.map(p=>'<tr><td>'+esc(p.deviceId)+'</td><td>DIN '+(p.railIndex+1)+
 '</td><td>'+(p.startModule+1)+'–'+(p.startModule+p.modules)+'</td><td>'+p.modules+'</td></tr>').join('');
 return '<details class="ep-layout-alternatives"><summary>Альтернативная упаковка DIN (черновик)</summary>'+
 '<p>Размещено: исходный порядок '+report.comparison.baselinePlaced+
 ', альтернативный '+report.comparison.compactPlaced+'. Разница: '+report.comparison.gainedDevices+
 '. Это только сравнение геометрии, без изменения проекта.</p>'+
 '<div style="overflow-x:auto"><table><thead><tr><th>Аппарат</th><th>Рейка</th><th>Позиции</th><th>Модули</th></tr></thead><tbody>'+
 (rows||'<tr><td colspan="4">Размещения нет</td></tr>')+
 '</tbody></table></div><p>Расположение аппаратов и проводников требует отдельного инженерного решения.</p></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDraftLayoutAlternativesV1,epDraftLayoutAlternativesHtmlV1};
