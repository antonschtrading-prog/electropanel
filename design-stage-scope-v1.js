'use strict';
// Determines WHICH design checks are applicable. No externally entered value
// requires a certificate and no unrequested stage is promoted to an obligation.
const EP_DESIGN_STAGES_V1=Object.freeze(['PRELIMINARY','BOARD_DESIGN','DETAILED']);
function epDesignStageScopeV1(project){
 const p=project&&typeof project==='object'&&!Array.isArray(project)?project:{};
 const requested=typeof p.designStageV1==='string'?p.designStageV1:'PRELIMINARY';
 const valid=EP_DESIGN_STAGES_V1.includes(requested);
 const stage=valid?requested:'PRELIMINARY';
 const selectivity=p.designRequirementsV1?.selectivity===true;
 const externalNetwork=p.designRequirementsV1?.externalNetwork===true;
 const hasLines=Array.isArray(p.lines)&&p.lines.length>0;
 const hasRouting=hasLines&&p.lines.some(l=>l&&
  (l.route44Input!==undefined||l.cableDesignInput?.lengthM!==undefined||
   l.voltageDropDesignInput!==undefined||l.faultRouteInput!==undefined));
 const hasCableInput=hasLines&&p.lines.some(l=>l&&(
  l.cableDesignInput!==undefined||l.cableReferenceInput!==undefined||
  l.overloadInput?.izA!==undefined));
 const optional=(code,required,known)=>({code,status:required?'REQUIRED':
  known?'IN_PROGRESS':'NOT_REQUIRED'});
 const items=[
  optional('LOAD_CALCULATION',hasLines,false),
  optional('BOARD_PROTECTION_SELECTION',stage!=='PRELIMINARY'&&hasLines,false),
  optional('CABLING_AMPACITY',stage==='DETAILED'&&hasCableInput,hasCableInput),
  optional('CABLE_ROUTE_AND_LENGTH',stage==='DETAILED'&&hasRouting,hasRouting),
  optional('EXTERNAL_NETWORK_MODEL',externalNetwork,externalNetwork||
   !!(p.network?.transformer||p.incomingMaximumStudiesV1?.length)),
  optional('MANUFACTURER_SELECTIVITY',selectivity,selectivity||
   !!p.deviceCoordinationEvidenceV1?.length),
  optional('PHYSICAL_INSTALLATION_TESTS',false,false)
 ];
 return {schema:'electropanel.design.stage.scope.1',stage,valid,items,
  selectivityRequested:selectivity,externalNetworkRequested:externalNetwork,
  required:items.filter(x=>x.status==='REQUIRED').map(x=>x.code),
  notRequired:items.filter(x=>x.status==='NOT_REQUIRED').map(x=>x.code),
  engineeringApproved:false,ready_for_installation:false};
}
function epDesignStageScopeHtmlV1(report){
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={PRELIMINARY:'Предварительный расчёт',
  BOARD_DESIGN:'Проектирование щита',DETAILED:'Детализация проекта'};
 const rows=(report?.items||[]).map(x=>'<tr><td>'+esc(x.code)+'</td><td>'+
  esc(x.status)+'</td></tr>').join('');
 return '<details class="ep-design-stage-scope"><summary>Стадия проектирования · '+
  esc(labels[report?.stage]||'Предварительный расчёт')+'</summary>'+
  '<p class="muted">Исходные данные принимаются от инженера. Неизвестная длина кабеля и внешняя сеть не блокируют проект щита. Реальные технические противоречия остаются ошибками.</p>'+
  '<label>Стадия<select id="designStageSelect">'+
  EP_DESIGN_STAGES_V1.map(x=>'<option value="'+esc(x)+'"'+
  (report?.stage===x?' selected':'')+'>'+esc(labels[x])+'</option>').join('')+
  '</select></label>'+ 
  '<label><input id="designSelectivityRequested" type="checkbox"'+(report?.selectivityRequested?' checked':'')+'> Требуется селективность по заданию</label>'+ 
  '<label><input id="designExternalNetworkRequested" type="checkbox"'+(report?.externalNetworkRequested?' checked':'')+'> Выполнить дополнительный расчёт внешней сети</label>'+ 
  '<button class="btn" id="designStageSave" type="button">Применить требования</button>'+
  '<div class="table-scroll"><table><thead><tr><th>Проверка</th><th>Применимость</th></tr></thead><tbody>'+
  rows+'</tbody></table></div></details>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 EP_DESIGN_STAGES_V1,epDesignStageScopeV1,epDesignStageScopeHtmlV1};
