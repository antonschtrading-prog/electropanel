'use strict';
// Pure browser port of v4.14 reference_ampacity_v38.py, intentionally only 12
// public-reproduction crosschecked numbers. NOT official/normative approval.
const EP_AMPACITY38=Object.freeze({
 '1.5':['17.5','19.5'],'2.5':['24','27'],'4':['32','36'],
 '6':['41','46'],'10':['57','63'],'16':['76','85']
});
const EP_AMPACITY38_SOURCE=Object.freeze({
 designation:'ГОСТ Р 50571.5.52-2011',table:'B.52.2',
 edition:'2011, checked registry amendments ИУС 8-2018 and ИУС 8-2025',
 registry:'https://protect.gost.ru/gost/details/9ad936e3-1370-4745-a211-ad1c7737bb68',
 transcription_1:'https://meganorm.ru/mega_doc/norm/gost-r_gosudarstvennyj-standart/4/gost_r_50571_5_52-2011_mek_60364-5-52_2009_natsionalnyy.html',
 transcription_2:'https://www.ti-soft.com/en/support/help/electricaldesign/standards/iec-60364-5-52/current-carrying-capacity/table_b_52_2',
 scope:'Cu/PVC, 2 loaded cores, B1 or C, 30°C, single ungrouped circuit; no extra derating',
 authentic_official_numeric_copy_reviewed:false,
 source_quality:'TWO_PUBLIC_REPRODUCTIONS_CROSSCHECKED'
});
function epAmpacity38Decimal(v){
 if(v===null||v===undefined||typeof v==='boolean'||(typeof v!=='string'&&typeof v!=='number'))return null;
 const raw=String(v).replace(',','.').trim();
 if(raw.length>128)return null;
 if(/^[+-]?(?:0+(?:\.0*)?|\.0+)(?:[eE][+-]?\d+)?$/.test(raw))return {coefficient:0n,exponent:0};
 const neg=raw.startsWith('-');
 const result=epV30Decimal(neg?raw.slice(1):raw);
 if(!result)return null;
 return {...result,negative:neg};
}
function epAmpacity38Eq(a,b){
 if(!a||!b)return false;
 if(!!a.negative!==!!b.negative||a.coefficient!==b.coefficient)return false;
 return a.coefficient===0n||a.exponent===b.exponent;
}
function epReferenceAmpacityV38(input) {
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Object expected');
 const issues=[];
 if(input.conductor_material!=='Cu')issues.push('MATERIAL_UNSUPPORTED');
 if(input.insulation!=='PVC')issues.push('INSULATION_UNSUPPORTED');
 if(!epAmpacity38Eq(epAmpacity38Decimal(input.cores_loaded),epAmpacity38Decimal(2)))
  issues.push('LOADED_CONDUCTORS_UNSUPPORTED');
 if(!['B1','C'].includes(input.installation_method))issues.push('INSTALLATION_METHOD_UNSUPPORTED');
 if(!epAmpacity38Eq(epAmpacity38Decimal(input.ambient_air_c),epAmpacity38Decimal(30)))
  issues.push('TEMPERATURE_CORRECTION_REQUIRED');
 if(input.single_circuit_ungrouped!==true)issues.push('GROUPING_REVIEW_REQUIRED');
 const section=epAmpacity38Decimal(input.cross_section_mm2);
 let lookup=null;
 if(!section||section.negative||section.coefficient===0n)issues.push('SECTION_INVALID');
 else {
  const key=Object.keys(EP_AMPACITY38).find(k=>epAmpacity38Eq(section,epAmpacity38Decimal(k)));
  if(!key)issues.push('SECTION_NOT_IN_REFERENCE_EXTRACT');else lookup=EP_AMPACITY38[key];
 }
 if(input.other_derating_factors_present!==false)issues.push('ADDITIONAL_DERATING_REVIEW_REQUIRED');
 const value=issues.length?null:lookup[input.installation_method==='B1'?0:1];
 return {schema_version:'3.8',status:value===null?'UNSUPPORTED_CONTEXT':'REFERENCE_VALUE_FOUND',
  reference_iz_a:value,units:'A',issues,source:EP_AMPACITY38_SOURCE,
  numeric_source_status:'CROSSCHECKED_PUBLIC_REPRODUCTIONS',
  normative_status:'UNVERIFIED_OFFICIAL_SOURCE',ready_for_design:false,ready_for_installation:false,
  notice:'Reference fact only: verify official text/amendments, cable construction, installation, protection and fault withstand.'};
}
const EP_AMENDMENT38=Object.freeze({
 designation:'ГОСТ Р 50571.5.52-2011',amendment:'ИУС 8-2025',
 table:'B.52.12',column:3,cross_section_mm2:'50',printed_a:'102',corrected_a:'192',
 registry:'https://protect.gost.ru/gost/changesdetails/58f23235-cc2b-45c9-8f3a-64baab61b961',
 source_quality:'PUBLISHED_CORRECTION_SECONDARY_COPY_OFFICIAL_METADATA',
 for_general_cable_lookup:false
});
function epInspectAmendment2025V38(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Object expected');
 const exact=input.table==='B.52.12'&&input.column===3&&
  epAmpacity38Eq(epAmpacity38Decimal(input.cross_section_mm2),epAmpacity38Decimal(50));
 if(!exact)return {schema_version:'3.8',status:'OUTSIDE_CORRECTION_SCOPE',
  expected_a:null,ready_for_design:false,normative_status:'UNVERIFIED',source:EP_AMENDMENT38};
 const actual=epAmpacity38Decimal(input.claimed_a);
 const status=!actual?'INVALID_CLAIM':
  epAmpacity38Eq(actual,epAmpacity38Decimal(102))?'OUTDATED_VALUE':
  epAmpacity38Eq(actual,epAmpacity38Decimal(192))?'MATCHES_PUBLISHED_CORRECTION':'CONFLICTING_VALUE';
 return {schema_version:'3.8',status,expected_a:'192',ready_for_design:false,
  normative_status:'UNVERIFIED_OFFICIAL_SOURCE',source:EP_AMENDMENT38};
}