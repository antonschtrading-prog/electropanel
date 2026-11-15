'use strict';
// Bounded manufacturer let-through energy for a named device, installation
// voltage and prospective short-circuit scenario. No interpolation or claim
// that a test curve applies to a different network configuration.
function epBreakerLetThroughV1(project,line,article){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const end=(extra={})=>({schema:'electropanel.protection.let_through.declared.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  numericalStatus:'UNKNOWN',issues,prospectiveCurrentA:null,
  letThroughUpperBoundA2s:null,conductorCapacityA2s:null,energyMarginA2s:null,
  minimumSectionMm2:null,engineeringApproved:false,ready_for_installation:false,...extra});
 const input=line?.letThroughInput;
 if(input===undefined||input===null){add('LET_THROUGH_INPUT_MISSING');return end();}
 if(!input||typeof input!=='object'||Array.isArray(input)){
  add('LET_THROUGH_INPUT_INVALID','BLOCKED');return end();
 }
 const num=(value,max=1e10)=>{
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const s=String(value).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0&&n<=max?n:null;
 };
 const source=(key,code)=>{
  if(typeof input[key]!=='string'||!input[key].trim())add(code);
  else if(input[key].length>2000)add('LET_THROUGH_SOURCE_TOO_LONG','BLOCKED');
 };
 if(!article||!['MCB','RCBO'].includes(article.kind)){
  add('LET_THROUGH_KIND_UNSUPPORTED','BLOCKED');return end();
 }
 if(typeof input.articleSku!=='string'||!input.articleSku.trim()||
   input.articleSku!==line?.catalogSku||input.articleSku!==article.sku)
  add('LET_THROUGH_ARTICLE_MISMATCH','BLOCKED');
 if(article.verificationStatus!=='VERIFIED')
  add('LET_THROUGH_ARTICLE_VERIFICATION_PENDING');
 if(input.articleInA!==undefined&&num(input.articleInA)!==num(article.inA))
  add('LET_THROUGH_ARTICLE_RATING_MISMATCH','BLOCKED');
 if(input.deviceStandard!==article.icnStandard)
  add('LET_THROUGH_DEVICE_STANDARD_MISMATCH','BLOCKED');
 const volts=num(input.testVoltageV,1000),freq=num(input.testFrequencyHz,1000);
 const declaredVolts=num(input.applicationVoltageV,1000),
  declaredFreq=num(input.applicationFrequencyHz,1000);
 if([volts,freq,declaredVolts,declaredFreq].includes(null)||
  volts!==declaredVolts||freq!==declaredFreq)
  add('LET_THROUGH_TEST_CONDITIONS_MISMATCH','BLOCKED');
 if(num(article.icnVoltageV,1000)===null||declaredVolts>num(article.icnVoltageV,1000))
  add('LET_THROUGH_ARTICLE_VOLTAGE_UNCONFIRMED','BLOCKED');
 if(input.protectionPoles!==article.poles)
  add('LET_THROUGH_POLE_CONFIGURATION_MISMATCH','BLOCKED');
 if(!['THREE_PHASE_POSITIVE_SEQUENCE','SINGLE_PHASE_L_N'].includes(input.faultModel))
  add('LET_THROUGH_FAULT_MODEL_UNSUPPORTED','BLOCKED');
 if(typeof input.comparisonPoint!=='string'||!input.comparisonPoint.trim())
  add('LET_THROUGH_FAULT_POINT_MISSING','BLOCKED');
 if(input.manufacturerEnvelopeConfirmed!==true)
  add('LET_THROUGH_ENVELOPE_GUARANTEE_UNCONFIRMED');
 if(input.conductorApplicationReviewed!==true)
  add('LET_THROUGH_CABLE_APPLICABILITY_UNREVIEWED');
 source('manufacturerSource','LET_THROUGH_MANUFACTURER_SOURCE_MISSING');
 source('testConditionSource','LET_THROUGH_TEST_CONDITIONS_SOURCE_MISSING');
 source('cableSource','LET_THROUGH_CABLE_SOURCE_MISSING');
 source('kSource','LET_THROUGH_K_SOURCE_MISSING');
 let current=null,linkedFault=null;
 if(input.currentBasis==='LINKED_MAXIMUM'){
  const sourceInput=line?.maximumFaultInput;
  if(!sourceInput||typeof epMaximumFaultCurrentV2!=='function')
   add('LET_THROUGH_MAXIMUM_UNAVAILABLE','BLOCKED');
  else{
   try{linkedFault=epMaximumFaultCurrentV2(project,line,()=>article);}
   catch(_){add('LET_THROUGH_MAXIMUM_FAILED','BLOCKED');}
   for(const issue of linkedFault?.issues||[])
    add('LET_THROUGH_MAX_'+issue.code,issue.level==='BLOCKED'?'BLOCKED':'UNKNOWN');
   current=num(linkedFault?.ikMaxA);
   if(current===null)add('LET_THROUGH_MAXIMUM_CURRENT_INVALID','BLOCKED');
   if(sourceInput.model!==input.faultModel||sourceInput.comparisonPoint!==input.comparisonPoint)
    add('LET_THROUGH_FAULT_SCENARIO_MISMATCH','BLOCKED');
   const sourceVoltage=num(sourceInput.model==='THREE_PHASE_POSITIVE_SEQUENCE'?
    sourceInput.uLLV:sourceInput.u0V,1000);
   if(sourceVoltage!==declaredVolts)
    add('LET_THROUGH_FAULT_VOLTAGE_MISMATCH','BLOCKED');
  }
 }else if(input.currentBasis==='DECLARED_SCENARIO'){
  current=num(input.prospectiveCurrentA);
  if(current===null)add('LET_THROUGH_CURRENT_INVALID','BLOCKED');
  source('prospectiveSource','LET_THROUGH_CURRENT_SOURCE_MISSING');
 }else add('LET_THROUGH_CURRENT_BASIS_UNSUPPORTED','BLOCKED');
 const section=num(input.sectionMm2,1e5),k=num(input.kA_SqrtS_PerMm2,1000);
 if(section===null||k===null)add('LET_THROUGH_CONDUCTOR_INVALID','BLOCKED');
 if(!['PHASE','NEUTRAL'].includes(input.conductorRole))
  add('LET_THROUGH_CONDUCTOR_ROLE_UNSUPPORTED','BLOCKED');
 if(input.conductorRole==='NEUTRAL'&&input.faultModel==='THREE_PHASE_POSITIVE_SEQUENCE')
  add('LET_THROUGH_NEUTRAL_THREE_PHASE_SCOPE_INVALID','BLOCKED');
 const sectionProject=num(line?.cableDesignInput?.sectionMm2,1e5);
 if(input.conductorRole==='PHASE'&&sectionProject!==null&&sectionProject!==section)
  add('LET_THROUGH_CONDUCTOR_SECTION_MISMATCH','BLOCKED');
 if(input.conductorRole==='PHASE'&&sectionProject===null)
  add('LET_THROUGH_PROJECT_SECTION_MISSING');
 if(!['Cu','Al'].includes(input.conductorMaterial))
  add('LET_THROUGH_MATERIAL_UNSUPPORTED','BLOCKED');
 if(line?.cableDesignInput?.material&&
  line.cableDesignInput.material!==input.conductorMaterial)
  add('LET_THROUGH_MATERIAL_MISMATCH','BLOCKED');
 if(input.temperatureBasisConfirmed!==true)
  add('LET_THROUGH_TEMPERATURE_BASIS_UNCONFIRMED');
 if(!Array.isArray(input.bands)||input.bands.length<1||input.bands.length>30){
  add('LET_THROUGH_BANDS_INVALID','BLOCKED');return end();
 }
 const bands=[];let prevMax=0;
 for(const [idx,band] of input.bands.entries()){
  const min=num(band?.minProspectiveA),max=num(band?.maxProspectiveA),
    energy=num(band?.maxLetThroughA2s,1e16);
  if(min===null||max===null||energy===null||min>max||
     min<=prevMax){
   add('LET_THROUGH_BAND_INVALID','BLOCKED');continue;
  }
  if(typeof band?.source!=='string'||!band.source.trim())
   add('LET_THROUGH_BAND_SOURCE_MISSING');
  else if(band.source.length>2000)add('LET_THROUGH_BAND_SOURCE_TOO_LONG','BLOCKED');
  bands.push({index:idx+1,minProspectiveA:min,maxProspectiveA:max,
   maxLetThroughA2s:energy,source:band.source??null});
  prevMax=max;
 }
 if(issues.some(x=>x.level==='BLOCKED'))return end({linkedFault,bands});
 const matching=bands.filter(b=>current>=b.minProspectiveA&&current<=b.maxProspectiveA);
 if(matching.length!==1){
  add('LET_THROUGH_NO_GUARANTEED_BAND');
  return end({linkedFault,bands,prospectiveCurrentA:current,
   notice:'No manufacturer-declared upper bound covers this exact prospective current.'});
 }
 const letThroughUpperBoundA2s=matching[0].maxLetThroughA2s;
 const conductorCapacityA2s=(k*section)**2;
 const energyMarginA2s=conductorCapacityA2s-letThroughUpperBoundA2s;
 const minimumSectionMm2=Math.sqrt(letThroughUpperBoundA2s)/k;
 if(![conductorCapacityA2s,energyMarginA2s,minimumSectionMm2].every(Number.isFinite)){
  add('LET_THROUGH_ENERGY_OVERFLOW','BLOCKED');return end();
 }
 const numericalStatus=energyMarginA2s< -1e-12*conductorCapacityA2s?
  'FAIL':'PRELIMINARY_PASS';
 if(numericalStatus==='FAIL')add('LET_THROUGH_CABLE_CAPACITY_EXCEEDED','BLOCKED');
 return end({prospectiveCurrentA:current,letThroughUpperBoundA2s,
  conductorCapacityA2s,energyMarginA2s,minimumSectionMm2,
  sectionMm2:section,kA_SqrtS_PerMm2:k,conductorRole:input.conductorRole,
  faultModel:input.faultModel,comparisonPoint:input.comparisonPoint,
  currentBasis:input.currentBasis,linkedFault,bands,matchedBand:matching[0],
  testVoltageV:volts,testFrequencyHz:freq,
  sourceReferences:{manufacturer:input.manufacturerSource??null,
   conditions:input.testConditionSource??null,cable:input.cableSource??null,
   k:input.kSource??null},
  numericalStatus,
  formula:'manufacturer stated upper I²t ≤ k²S² (no interpolation)',
  notice:'Upper-bound manufacturer let-through envelope declared for exact article, tested conditions, fault model and point. It does not establish certification or suitability of other fault paths.'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={epBreakerLetThroughV1};
