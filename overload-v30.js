'use strict';
// Browser port of the pure arithmetic/evidence decision logic from recovered
// v4.14 archive: electropanel/overload_guard_v30.py.
// This is NOT normative verification or installation approval.
const EP_V30_EVIDENCE=Object.freeze([
 'design_load_basis','cable_reference_document','cable_reference_table',
 'installation_method','correction_factor_sources',
 'device_manufacturer_document','device_article','device_i2_locator',
 'applicable_normative_clause','independent_engineer_review'
]);
// Decimal = coefficient * 10^exponent, represented with BigInt to prevent
// IEEE 754 rounding and to preserve 1e+308 / 1e-600 comparisons.
function epV30Decimal(value) {
 if(typeof value==='boolean'||(typeof value!=='string'&&typeof value!=='number'))return null;
 if(typeof value==='number'&&!Number.isFinite(value))return null;
 const t=String(value).trim();
 if(t.length>256)return null;
 const match=/^\+?(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d{1,5}))?$/.exec(t);
 if(!match)return null;
 const exp=Number(match[2]||0);
 if(!Number.isInteger(exp)||Math.abs(exp)>10000)return null;
 const [whole='',fraction=''] = match[1].split('.');
 let digits=(whole+fraction).replace(/^0+/,'');
 if(!digits)return null;
 let scale=exp-fraction.length;
 while(digits.endsWith('0')){digits=digits.slice(0,-1);scale++;}
 return {coefficient:BigInt(digits),exponent:scale};
}
function epV30Multiply(a,b) {
 let digits=(a.coefficient*b.coefficient).toString(),exp=a.exponent+b.exponent;
 while(digits.endsWith('0')){digits=digits.slice(0,-1);exp++;}
 return {coefficient:BigInt(digits),exponent:exp};
}
function epV30Compare(a,b){
 const ad=a.coefficient.toString(),bd=b.coefficient.toString();
 const magnitudeA=ad.length+a.exponent,magnitudeB=bd.length+b.exponent;
 if(magnitudeA!==magnitudeB)return magnitudeA>magnitudeB?1:-1;
 const length=Math.max(ad.length,bd.length);
 const ax=ad.padEnd(length,'0'),bx=bd.padEnd(length,'0');
 return ax===bx?0:(ax>bx?1:-1);
}
function epV30Format(a){
 const digits=a.coefficient.toString(),exp=a.exponent;
 if(exp>=0&&exp<=32)return digits+'0'.repeat(exp);
 if(exp<0&&-exp<digits.length){
  const idx=digits.length+exp;return digits.slice(0,idx)+'.'+digits.slice(idx);
 }
 const magnitude=exp+digits.length-1;
 return digits[0]+(digits.length>1?'.'+digits.slice(1):'')+'E'+(magnitude>=0?'+':'')+magnitude;
}
function epOverloadGuardV30(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Expected object');
 const diagnostics=[],issue=(code,status,message)=>diagnostics.push({code,status,message});
 const keys=['ib_a','in_a','base_iz_a','i2_a'];
 const values=Object.fromEntries(keys.map(k=>[k,epV30Decimal(data[k])]));
 const raw=data.factors;
 const factors=[];
 if(!Array.isArray(raw)||raw.length<1||raw.length>32)
  issue('FACTORS_ABSENT','UNKNOWN','Require 1..32 explicitly supplied correction factors');
 else for(let i=0;i<raw.length;i++){
  const f=raw[i];
  if(!f||typeof f!=='object'||typeof f.name!=='string'||!f.name.trim()){
   issue('FACTOR_BAD_FORMAT','UNKNOWN','Factor '+i+' must be named');continue;
  }
  const factor=epV30Decimal(f.value);
  if(!factor)issue('FACTOR_BAD_VALUE','UNKNOWN','Factor '+i+' is not a finite positive number');
  else{
   factors.push(factor);
   if(epV30Compare(factor,epV30Decimal('1'))>0)
    issue('FACTOR_ABOVE_ONE_REVIEW','UNKNOWN','Factor '+i+' > 1; applicability requires review');
  }
 }
 for(const k of keys)if(values[k]===null)
  issue('INPUT_INVALID','UNKNOWN',k+' missing or not finite positive');
 let numericStatus='UNKNOWN',computed={};
 const good=keys.every(k=>values[k]!==null)&&Array.isArray(raw)&&
  factors.length===raw.length&&factors.length>0&&
  !diagnostics.some(x=>x.code==='FACTOR_ABOVE_ONE_REVIEW');
 if(good){
  let iz=values.base_iz_a;
  for(const f of factors)iz=epV30Multiply(iz,f);
  const i2Limit=epV30Multiply(iz,epV30Decimal('1.45'));
  const cond1=epV30Compare(values.ib_a,values.in_a)<=0&&epV30Compare(values.in_a,iz)<=0;
  const cond2=epV30Compare(values.i2_a,i2Limit)<=0;
  numericStatus=cond1&&cond2?'PASS':'FAIL';
  computed={ib_a:epV30Format(values.ib_a),in_a:epV30Format(values.in_a),
   corrected_iz_a:epV30Format(iz),i2_a:epV30Format(values.i2_a),
   i2_limit_a:epV30Format(i2Limit)};
  issue('OVERLOAD_ARITHMETIC',numericStatus,'Supplied-data arithmetic: Ib<=In<=Iz AND I2<=1.45 Iz');
 }
 const evidence=data.evidence&&typeof data.evidence==='object'?data.evidence:{};
 const missing=EP_V30_EVIDENCE.filter(k=>typeof evidence[k]!=='string'||!evidence[k].trim());
 if(missing.length)issue('EVIDENCE_INCOMPLETE','UNKNOWN','Missing evidence fields: '+missing.join(', '));
 issue('EXTERNAL_NORMATIVE_REVIEW','UNKNOWN','Source authenticity, applicability and engineering review are not independently verified by this program');
 return {schema_version:'3.0',numeric_status:numericStatus,evidence_status:'UNVERIFIED',
  ready_for_installation:false,standards_certified:false,computed,missing_evidence:missing,diagnostics};
}
