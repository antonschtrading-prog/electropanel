'use strict';
// Bounded cable-overload coordination. Only engineer-declared cable Iz
// and manufacturer-declared guaranteed conventional operating current I2.
// IEC 60364-4-43:2023 431.4.2 numerical criteria, not conformity approval.
function epCableOverloadCoordinationV1(project,line,article){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const result=(extra={})=>({schema:'electropanel.cable.overload.declared.1',
  status:issues.some(i=>i.level==='BLOCKED')?'BLOCKED':'UNKNOWN',issues,
  ibInStatus:'UNKNOWN',inIzStatus:'UNKNOWN',i2IzStatus:'UNKNOWN',
  correctedIzA:null,comparisonIzA:null,i2LimitA:null,marginA:null,
  engineeringApproved:false,ready_for_installation:false,...extra});
 const parse=(v,positive=true)=>{
  if(typeof v!=='number'&&typeof v!=='string')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n<=1e8&&(positive?n>0:n>=0)?n:null;
 };
 const input=line?.overloadCoordinationInput;
 if(input===undefined||input===null){
  add('CABLE_OVERLOAD_I2_AND_DERATING_INPUT_MISSING');return result();
 }
 if(!input||typeof input!=='object'||Array.isArray(input)){
  add('CABLE_OVERLOAD_INPUT_INVALID','BLOCKED');return result();
 }
 const ib=parse(line?.overloadInput?.ibA),inA=parse(article?.inA);
 const declaredIz=parse(line?.overloadInput?.izA);
 const base=parse(input.baseIzA),i2=parse(input.i2A);
 if(typeof input.articleSku!=='string'||!input.articleSku.trim()||
   input.articleSku!==line?.catalogSku)
  add('CABLE_OVERLOAD_ARTICLE_MISMATCH','BLOCKED');
 if(input.articleInA!==undefined&&parse(input.articleInA)!==inA)
  add('CABLE_OVERLOAD_RATING_CHANGED','BLOCKED');
 if(!article||!['MCB','RCBO'].includes(article.kind))
  add('CABLE_OVERLOAD_DEVICE_KIND_UNSUPPORTED','BLOCKED');
 if(article?.verificationStatus!=='VERIFIED')
  add('CABLE_OVERLOAD_ARTICLE_VERIFICATION_PENDING');
 const source=(key,code)=>{
  if(typeof input[key]!=='string'||!input[key].trim())add(code);
  else if(input[key].length>2000)add('CABLE_OVERLOAD_SOURCE_TOO_LONG','BLOCKED');
 };
 source('baseIzSource','CABLE_OVERLOAD_BASE_IZ_SOURCE_MISSING');
 source('i2Source','CABLE_OVERLOAD_I2_SOURCE_MISSING');
 source('i2Standard','CABLE_OVERLOAD_I2_STANDARD_MISSING');
 source('applicabilitySource','CABLE_OVERLOAD_APPLICABILITY_SOURCE_MISSING');
 if(input.applicationReviewed!==true)add('CABLE_OVERLOAD_APPLICABILITY_UNREVIEWED');
 if(!['CABLE_DECLARED_BASE_WITH_CORRECTIONS'].includes(input.model)){
  add('CABLE_OVERLOAD_MODEL_UNSUPPORTED','BLOCKED');return result();
 }
 if(base===null||base>1e6)add('CABLE_OVERLOAD_BASE_IZ_INVALID','BLOCKED');
 if(i2===null)add('CABLE_OVERLOAD_I2_INVALID','BLOCKED');
 if(!Array.isArray(input.factors)||!input.factors.length||input.factors.length>12){
  add('CABLE_OVERLOAD_FACTORS_INVALID','BLOCKED');return result();
 }
 let product=1;
 const factors=[],keys=new Set();
 for(const [idx,factor] of input.factors.entries()){
  const value=parse(factor?.value);
  const key=typeof factor?.id==='string'?factor.id.trim():'';
  if(!key||key.length>60||keys.has(key)||value===null||value>1){
   add('CABLE_OVERLOAD_FACTOR_INVALID','BLOCKED');continue;
  }
  keys.add(key);
  if(typeof factor.source!=='string'||!factor.source.trim())
   add('CABLE_OVERLOAD_FACTOR_SOURCE_MISSING');
  else if(factor.source.length>2000)
   add('CABLE_OVERLOAD_FACTOR_SOURCE_TOO_LONG','BLOCKED');
  product*=value;
  factors.push({index:idx+1,id:key,value,source:factor.source??null});
 }
 if(issues.some(x=>x.level==='BLOCKED'))
  return result({factors});
 const correctedIzA=base*product;
 if(!Number.isFinite(correctedIzA)||correctedIzA<=0){
  add('CABLE_OVERLOAD_CORRECTED_IZ_INVALID','BLOCKED');return result({factors});
 }
 // For source conflicts, use lower declared capacity, never the higher.
 const comparisonIzA=declaredIz===null?correctedIzA:Math.min(declaredIz,correctedIzA);
 if(declaredIz===null)add('CABLE_OVERLOAD_DECLARED_IZ_MISSING');
 else if(declaredIz>correctedIzA*(1+1e-10))
  add('CABLE_OVERLOAD_DECLARED_IZ_EXCEEDS_CORRECTED','BLOCKED');
 else if(declaredIz<correctedIzA*(1-1e-10))
  add('CABLE_OVERLOAD_IZ_VALUES_DIFFER');
 if(ib===null||inA===null)add('CABLE_OVERLOAD_IB_OR_IN_MISSING');
 const ibInStatus=ib===null||inA===null?'UNKNOWN':
  ib>inA?'FAIL':'PRELIMINARY_PASS';
 const inIzStatus=inA===null?'UNKNOWN':inA>comparisonIzA?'FAIL':'PRELIMINARY_PASS';
 const i2LimitA=1.45*comparisonIzA;
 const i2IzStatus=i2===null?'UNKNOWN':i2>i2LimitA?'FAIL':'PRELIMINARY_PASS';
 if(ibInStatus==='FAIL')add('CABLE_OVERLOAD_IB_EXCEEDS_IN','BLOCKED');
 if(inIzStatus==='FAIL')add('CABLE_OVERLOAD_IN_EXCEEDS_IZ','BLOCKED');
 if(i2IzStatus==='FAIL')add('CABLE_OVERLOAD_I2_EXCEEDS_1_45_IZ','BLOCKED');
 if(inA!==null&&i2!==null&&i2<inA)
  add('CABLE_OVERLOAD_I2_BELOW_RATING_REQUIRES_REVIEW');
 return result({ibA:ib,inA,declaredIzA:declaredIz,baseIzA:base,
  correctedIzA,comparisonIzA,i2A:i2,i2LimitA,marginA:i2LimitA-i2,
  ibInStatus,inIzStatus,i2IzStatus,
  correctionProduct:product,factors,articleSku:input.articleSku,
  baseIzSource:input.baseIzSource??null,i2Source:input.i2Source??null,
  i2Standard:input.i2Standard??null,applicabilitySource:input.applicabilitySource??null,
  applicationReviewed:input.applicationReviewed===true,
  formula:'Iz,corrected = Iz,base × product(declared factors ≤ 1); I2 ≤ 1.45 × min(Iz,declared,Iz,corrected)',
  notice:'Numerical comparison only. Thermal cable ratings, correction factors and manufacturer I2 still require independent verification.'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCableOverloadCoordinationV1};
