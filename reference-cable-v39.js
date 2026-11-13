'use strict';
// v4.14 cable_conditions_v39.py: tiny public-reference crosschecked derating
// subset; not an authenticated official table and not design authorization.
// Depends on reference-ampacity-v38.js and overload-v30.js.
const EP_AIR_TEMP39=Object.freeze({'25':'1.06','30':'1.00','35':'0.94','40':'0.87','45':'0.79','50':'0.71'});
const EP_GROUPING39=Object.freeze({'1':'1.00','2':'0.80','3':'0.70','4':'0.65'});
const EP_FACTOR_SOURCES39=Object.freeze({
 temperature:{table:'B.52.14',insulation:'PVC',ambient_reference_c:'30',
  public_gost_transcription:'https://terramaris.ru/gost/gost-r-50571-5-52-2011.html',
  manufacturer_crosscheck:'https://www.untel.com.tr/wp-content/uploads/2024/04/Endustriyel_Technical.pdf'},
 grouping:{table:'B.52.17',row:'1',layout:'bunched_air_surface_embedded_enclosed',
  public_gost_transcription:'https://meganorm.ru/Data2/1/4293792/4293792410.htm',
  second_public_transcription:'https://e-ecolog.ru/docs/ir7E8zpmCDOpvKMD3ZfVN'},
 base:EP_AMPACITY38_SOURCE
});
function ep39Key(v){
 const d=epAmpacity38Decimal(v);
 if(!d)return null;
 for(const k of [...Object.keys(EP_AIR_TEMP39),...Object.keys(EP_GROUPING39)]){
  if(epAmpacity38Eq(d,epAmpacity38Decimal(k)))return k;
 }
 return null;
}
function epReferenceFactorsV39(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Object expected');
 const temp=EP_AIR_TEMP39[ep39Key(input.ambient_air_c)]??null;
 const group=EP_GROUPING39[ep39Key(input.circuits_grouped)]??null;
 return {schema_version:'3.9',temperature_factor:temp,grouping_factor:group,
  supported:temp!==null&&group!==null&&input.insulation==='PVC'&&input.installation_medium==='air'&&
   input.grouping_layout==='bunched_air_surface_embedded_enclosed',
  source_tables:EP_FACTOR_SOURCES39,ready_for_design:false,
  normative_status:'UNVERIFIED_OFFICIAL_SOURCE'};
}
function epReferenceCableV39(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Object expected');
 const issues=[];
 const base=epReferenceAmpacityV38({
  conductor_material:payload.conductor_material,insulation:payload.insulation,
  cores_loaded:payload.cores_loaded,installation_method:payload.installation_method,
  ambient_air_c:30,cross_section_mm2:payload.cross_section_mm2,
  single_circuit_ungrouped:true,other_derating_factors_present:false
 });
 issues.push(...base.issues);
 const temp=EP_AIR_TEMP39[ep39Key(payload.ambient_air_c)]??null;
 const group=EP_GROUPING39[ep39Key(payload.circuits_grouped)]??null;
 if(temp===null)issues.push('TEMPERATURE_NOT_IN_VERIFIED_EXTRACT');
 if(group===null)issues.push('GROUP_COUNT_NOT_IN_VERIFIED_EXTRACT');
 if(payload.grouping_layout!=='bunched_air_surface_embedded_enclosed')issues.push('GROUPING_LAYOUT_NOT_VERIFIED');
 if(payload.other_derating_factors_present!==false)issues.push('OTHER_DERATING_FACTORS_UNRESOLVED');
 if(payload.all_circuits_simultaneously_loaded!==true)issues.push('LOADING_CONFIGURATION_NOT_VERIFIED');
 if(payload.installation_method_verified!==true)issues.push('INSTALLATION_METHOD_NOT_VERIFIED');
 const ib=epAmpacity38Decimal(payload.ib_a),inn=epAmpacity38Decimal(payload.in_a),i2=epAmpacity38Decimal(payload.i2_a);
 const currents=[ib,inn,i2];
 if(currents.some(x=>!x||x.negative||x.coefficient===0n))issues.push('IB_IN_I2_REQUIRED_FINITE_POSITIVE');
 if(currents.some(x=>x&&x.coefficient.toString().length+x.exponent-1>100))
  issues.push('CURRENT_OUTSIDE_NUMERIC_LIMIT');
 const baseVal=base.reference_iz_a,ready=baseVal!==null&&temp!==null&&group!==null&&!issues.length;
 const numericChecks=ready?{}:null;
 let adjusted=null,status='UNKNOWN';
 if(ready){
  const ref=epV30Decimal(baseVal),factor1=epV30Decimal(temp),factor2=epV30Decimal(group);
  const iz=epV30Multiply(epV30Multiply(ref,factor1),factor2);
  adjusted=iz;
  numericChecks.ib_le_in=epV30Compare(ib,inn)<=0;
  numericChecks.in_le_iz=epV30Compare(inn,iz)<=0;
  numericChecks.i2_le_1_45_iz=epV30Compare(i2,epV30Multiply(iz,epV30Decimal('1.45')))<=0;
  status=Object.values(numericChecks).every(Boolean)?'PASS':'FAIL';
 }
 const fmt=x=>{
  if(!x)return null;
  const ds=x.coefficient.toString(),exp=x.exponent;
  if(exp>=0&&exp<=30)return ds+'0'.repeat(exp);
  const at=ds.length+exp;
  if(at>0)return ds.slice(0,at)+'.'+ds.slice(at);
  if(at>=-12)return '0.'+'0'.repeat(-at)+ds;
  return epV30Format(x);
 };
 return {schema_version:'3.9',status:ready?'REFERENCE_NUMERIC_ASSESSMENT':'UNSUPPORTED_CONTEXT',
  numeric_status:status,numeric_checks:numericChecks,
  base_reference_a:baseVal,temperature_factor:temp,grouping_factor:group,
  adjusted_reference_iz_a:fmt(adjusted),issues:[...new Set(issues)].sort(),
  source_tables:EP_FACTOR_SOURCES39,normative_status:'UNVERIFIED_OFFICIAL_SOURCE',
  ready_for_design:false,ready_for_installation:false,
  remaining_checks:['official_amendment_review','independent_design_review','short_circuit',
   'voltage_drop','automatic_disconnection','cable_construction_and_terminals',
   'harmonics','actual_grouping_and_installation'],
  notice:'Reference arithmetic only; explicit B.52.2+B.52.14+B.52.17 extracts, not a verified GOST selection.'};
}