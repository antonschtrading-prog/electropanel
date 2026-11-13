'use strict';
// Bounded reference cable shortlist. NOT a normative cable design decision.
const EP_CABLE_REFERENCE_V1=Object.freeze({
 B1:Object.freeze({'1.5':17.5,'2.5':24,'4':32,'6':41,'10':57,'16':76}),
 C:Object.freeze({'1.5':19.5,'2.5':27,'4':36,'6':46,'10':63,'16':85})
});
function epCableReferenceV1(input){
 const finish=(status,issues,extra={})=>({schema:'electropanel.cable.reference.1',status,issues,
  engineeringApproved:false,...extra});
 if(!input||typeof input!=='object'||Array.isArray(input))return finish('BLOCKED',['INPUT_INVALID']);
 const positive=v=>{
  if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0&&n<=100000?n:null;
 };
 const ib=positive(input.ibA),inA=positive(input.inA);
 if(ib===null)return finish('BLOCKED',['IB_INVALID']);
 const method=input.installationMethod;
 if(!Object.hasOwn(EP_CABLE_REFERENCE_V1,method))return finish('UNKNOWN',['METHOD_NOT_IN_REFERENCE']);
 if(input.material!=='Cu'||input.insulation!=='PVC'||input.loadedConductors!==2||
  input.ambientAirC!==30||input.ungrouped!==true||input.otherDeratingPresent!==false)
  return finish('UNKNOWN',['REFERENCE_CONTEXT_NOT_ESTABLISHED']);
 const candidates=Object.entries(EP_CABLE_REFERENCE_V1[method]).sort((a,b)=>Number(a[0])-Number(b[0])).map(([sectionMm2,izA])=>({
  sectionMm2:Number(sectionMm2),izA,ibFits:ib<=izA,inFits:inA===null?null:inA<=izA,
  status:ib>izA||inA!==null&&inA>izA?'REJECTED':inA===null?'PARTIAL':'REFERENCE_POTENTIAL'
 }));
 const possible=candidates.filter(x=>x.status!=='REJECTED');
 const issues=['OFFICIAL_REFERENCE_AND_CORRECTIONS_REQUIRE_REVIEW',
  'THERMAL_GROUPING_VOLTAGE_DROP_FAULT_WITHSTAND_REQUIRE_SEPARATE_CHECK'];
 if(inA===null)issues.push('PROTECTIVE_RATING_MISSING');
 if(!possible.length)issues.push('NO_REFERENCE_SECTION_FITS');
 return finish(possible.length?'REFERENCE_ONLY':'BLOCKED',issues,{
  ibA:ib,inA,installationMethod:method,candidates,
  smallestReferenceCandidate:possible[0]||null,
  source:{designation:'ГОСТ Р 50571.5.52-2011',table:'B.52.2',
   numericSource:'CROSSCHECKED_PUBLIC_REPRODUCTIONS',officialNumericReview:false},
  note:'Cu/PVC, two loaded conductors, 30°C, single ungrouped circuit, no derating; not a final cable selection.'
 });
}
function epCableReferenceForCircuitV1(project,line,lookupSku){
 if(!line||typeof line!=='object')return epCableReferenceV1(null);
 let article=null;
 try{article=typeof lookupSku==='function'?lookupSku(line.catalogSku):null;}catch(_){}
 const setup=line.cableReferenceInput||{};
 return epCableReferenceV1({ibA:line.overloadInput?.ibA,inA:article?.inA,
  installationMethod:setup.installationMethod,material:setup.material,
  insulation:setup.insulation,loadedConductors:setup.loadedConductors,
  ambientAirC:setup.ambientAirC,ungrouped:setup.ungrouped,
  otherDeratingPresent:setup.otherDeratingPresent});
}
function epApplyCableReferenceInputV1(project,lineId,input){
 if(!project||!Array.isArray(project.lines)||!input||typeof input!=='object')
  return {status:'BLOCKED',code:'INPUT_INVALID',project:null};
 const lines=project.lines.filter(x=>x?.id===lineId);
 if(lines.length!==1)return {status:'BLOCKED',code:'LINE_NOT_UNIQUE',project:null};
 if(!['B1','C'].includes(input.installationMethod))return {status:'BLOCKED',code:'METHOD_INVALID',project:null};
 if(input.confirmContext!==true)return {status:'BLOCKED',code:'REFERENCE_CONTEXT_NOT_CONFIRMED',project:null};
 const copy=JSON.parse(JSON.stringify(project)),line=copy.lines.find(x=>x.id===lineId);
 line.cableReferenceInput={installationMethod:input.installationMethod,material:'Cu',
  insulation:'PVC',loadedConductors:2,ambientAirC:30,ungrouped:true,otherDeratingPresent:false,
  declaredBy:'user'};
 line.calculationReview={required:true,reason:'CABLE_REFERENCE_CONTEXT_UPDATED'};
 return {status:'REVIEW_REQUIRED',code:'REFERENCE_CONTEXT_RECORDED',project:copy};
}
if(typeof module!=='undefined'&&module.exports)module.exports={
 epCableReferenceV1,epCableReferenceForCircuitV1,epApplyCableReferenceInputV1,EP_CABLE_REFERENCE_V1};
