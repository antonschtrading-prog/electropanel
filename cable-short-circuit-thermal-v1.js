'use strict';
// Thermal short-circuit check (adiabatic energy criterion) for an engineer-
// declared conductor and the explicitly selected fault path. Does NOT borrow
// L-PE minimum-current trip times or claim norm/installation conformity.
function epCableShortCircuitThermalV1(project,line,article){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const end=(extra={})=>({schema:'electropanel.cable.short_circuit.thermal.declared.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  numericalStatus:'UNKNOWN',issues,conductorCapacityA2s:null,
  faultEnergyA2s:null,energyMarginA2s:null,minimumSectionMm2:null,
  engineeringApproved:false,ready_for_installation:false,...extra});
 const input=line?.shortCircuitThermalInput;
 if(input===undefined||input===null){add('THERMAL_SHORT_CIRCUIT_INPUT_MISSING');return end();}
 if(!input||typeof input!=='object'||Array.isArray(input)){
  add('THERMAL_INPUT_INVALID','BLOCKED');return end();
 }
 const number=(value,max=1e8)=>{
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const str=String(value).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(str))return null;
  const val=Number(str);return Number.isFinite(val)&&val>0&&val<=max?val:null;
 };
 const section=number(input.sectionMm2,1e5),k=number(input.kA_SqrtS_PerMm2,1000),
  time=number(input.clearingTimeS,5);
 if(section===null||k===null||time===null){
  add('THERMAL_VALUES_INVALID','BLOCKED');return end();
 }
 if(input.method!=='ADIABATIC_K2S2'){
  add('THERMAL_METHOD_UNSUPPORTED','BLOCKED');return end();
 }
 if(!['PHASE','NEUTRAL','PE'].includes(input.conductorRole)){
  add('THERMAL_CONDUCTOR_ROLE_UNSUPPORTED','BLOCKED');return end();
 }
 if(!['Cu','Al'].includes(input.conductorMaterial)){
  add('THERMAL_CONDUCTOR_MATERIAL_UNSUPPORTED','BLOCKED');return end();
 }
 if(typeof input.insulationType!=='string'||!input.insulationType.trim())
  add('THERMAL_INSULATION_UNSPECIFIED');
 if(input.temperatureBasisConfirmed!==true)
  add('THERMAL_TEMPERATURE_BASIS_UNCONFIRMED');
 if(input.adiabaticApplicabilityConfirmed!==true)
  add('THERMAL_ADIABATIC_APPLICABILITY_UNCONFIRMED');
 const source=(field,code)=>{
  if(typeof input[field]!=='string'||!input[field].trim())add(code);
  else if(input[field].length>2000)add('THERMAL_SOURCE_TOO_LONG','BLOCKED');
 };
 source('kSource','THERMAL_K_SOURCE_MISSING');
 source('timeSource','THERMAL_TIME_SOURCE_MISSING');
 source('conductorSource','THERMAL_CONDUCTOR_SOURCE_MISSING');
 source('methodSource','THERMAL_METHOD_SOURCE_MISSING');
 const declaredSection=number(line?.cableDesignInput?.sectionMm2,1e5);
 if(input.conductorRole==='PHASE'){
  if(declaredSection===null)add('THERMAL_PROJECT_SECTION_UNDECLARED');
  else if(Math.abs(declaredSection-section)>1e-8*Math.max(declaredSection,section))
   add('THERMAL_PHASE_SECTION_MISMATCH','BLOCKED');
 }
 const declaredMaterial=line?.cableDesignInput?.material;
 if(declaredMaterial&&declaredMaterial!==input.conductorMaterial)
  add('THERMAL_MATERIAL_MISMATCH','BLOCKED');
 let current=null,faultModel=input.faultModel??null,comparisonPoint=input.comparisonPoint??null,
  linkedFault=null;
 if(input.currentBasis==='DECLARED_SCENARIO'){
  current=number(input.faultCurrentA,1e8);
  if(current===null)add('THERMAL_FAULT_CURRENT_INVALID','BLOCKED');
  source('faultCurrentSource','THERMAL_CURRENT_SOURCE_MISSING');
  if(!['THREE_PHASE_POSITIVE_SEQUENCE','SINGLE_PHASE_L_N','L_PE'].includes(faultModel))
   add('THERMAL_FAULT_MODEL_UNSUPPORTED','BLOCKED');
  if(typeof comparisonPoint!=='string'||!comparisonPoint.trim())
   add('THERMAL_COMPARISON_POINT_MISSING');
 }else if(input.currentBasis==='LINKED_MAXIMUM'){
  const configured=line?.maximumFaultInput;
  if(!configured||typeof epMaximumFaultCurrentV2!=='function'){
   add('THERMAL_LINKED_MAXIMUM_UNAVAILABLE','BLOCKED');
  }else{
   try{linkedFault=epMaximumFaultCurrentV2(project,line,()=>article);}
   catch(_){add('THERMAL_LINKED_MAXIMUM_FAILED','BLOCKED');}
   if(linkedFault){
    for(const issue of linkedFault.issues||[])
     add('THERMAL_LINKED_'+issue.code,issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN');
    current=number(linkedFault.ikMaxA,1e8);
    if(current===null)add('THERMAL_LINKED_MAXIMUM_INVALID','BLOCKED');
   }
   if(faultModel!==configured.model)
    add('THERMAL_FAULT_MODEL_MISMATCH','BLOCKED');
   if(typeof comparisonPoint!=='string'||!comparisonPoint.trim()||
      comparisonPoint!==configured.comparisonPoint)
    add('THERMAL_COMPARISON_POINT_MISMATCH','BLOCKED');
  }
  if(input.conductorRole==='PE')add('THERMAL_LINKED_MAXIMUM_PE_SCOPE_UNSUPPORTED','BLOCKED');
 }else add('THERMAL_CURRENT_BASIS_UNSUPPORTED','BLOCKED');
 if(input.conductorRole==='PE'&&faultModel!=='L_PE')
  add('THERMAL_PE_REQUIRES_L_PE_SCENARIO','BLOCKED');
 if(input.conductorRole==='NEUTRAL'&&faultModel==='THREE_PHASE_POSITIVE_SEQUENCE')
  add('THERMAL_NEUTRAL_NOT_IN_THREE_PHASE_SYMMETRIC_PATH','BLOCKED');
 if(input.conductorRole==='PHASE'&&faultModel==='L_PE'&&input.currentBasis==='LINKED_MAXIMUM')
  add('THERMAL_LINKED_SCOPE_INVALID','BLOCKED');
 if(issues.some(x=>x.level==='BLOCKED'))return end({linkedFault,faultModel,comparisonPoint});
 // Fault clearing time is independently declared and source-backed, NOT inferred
 // from a minimum-current protective curve for a different fault scenario.
 const faultEnergyA2s=current*current*time;
 const conductorCapacityA2s=(k*section)*(k*section);
 const minimumSectionMm2=current*Math.sqrt(time)/k;
 if(![faultEnergyA2s,conductorCapacityA2s,minimumSectionMm2].every(Number.isFinite)){
  add('THERMAL_ENERGY_OVERFLOW','BLOCKED');return end();
 }
 const numericalStatus=faultEnergyA2s>conductorCapacityA2s*(1+1e-12)?
  'FAIL':'PRELIMINARY_PASS';
 if(numericalStatus==='FAIL')
  add('THERMAL_SHORT_CIRCUIT_ENERGY_EXCEEDS_CAPACITY','BLOCKED');
 if(input.timeModel!=='DECLARED_MAX_CLEARING_TIME')
  add('THERMAL_CLEARING_TIME_MODEL_UNSUPPORTED','BLOCKED');
 if(input.clearingTimeGuaranteeConfirmed!==true)
  add('THERMAL_CLEARING_TIME_GUARANTEE_UNCONFIRMED');
 if(input.currentBasis==='LINKED_MAXIMUM'&&linkedFault?.status==='BLOCKED')
  add('THERMAL_LINKED_FAULT_BLOCKED','BLOCKED');
 return end({sectionMm2:section,kA_SqrtS_PerMm2:k,clearingTimeS:time,
  faultCurrentA:current,currentBasis:input.currentBasis,conductorRole:input.conductorRole,
  conductorMaterial:input.conductorMaterial,insulationType:input.insulationType??null,
  faultModel,comparisonPoint,linkedFault,
  faultEnergyA2s,conductorCapacityA2s,energyMarginA2s:conductorCapacityA2s-faultEnergyA2s,
  minimumSectionMm2,numericalStatus,sourceReferences:{
   k:input.kSource??null,time:input.timeSource??null,current:input.faultCurrentSource??null,
   conductor:input.conductorSource??null,method:input.methodSource??null},
  formula:'I²t ≤ k²S²; Smin = I×sqrt(t)/k',
  notice:'Adiabatic comparison for the selected fault path and declared maximum clearing time only; not a verified withstand calculation for all scenarios.'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCableShortCircuitThermalV1};
