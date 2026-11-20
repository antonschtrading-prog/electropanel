'use strict';
// Explicit R/X at design temperature; values must be supplied by engineer, never synthesized from section.
function epVoltageDropDesignV1(input){
 const finish=(status,issues,extra={})=>({schema:'electropanel.voltage.drop.1',status,issues,...extra,engineeringApproved:false});
 if(!input||typeof input!=='object'||Array.isArray(input))return finish('UNKNOWN',['INPUT_MISSING']);
 const num=(v,zero=false)=>{
  if(v===null||v===undefined||typeof v==='boolean'||typeof v==='object')return null;
  const s=String(v).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>=(zero?0:1e-12)&&n<=1e7?n:null;
 };
 const phase=input.phase,three=phase==='3Ф',single=['L1','L2','L3'].includes(phase);
 if(!three&&!single)return finish('UNKNOWN',['PHASE_UNSUPPORTED']);
 const ib=num(input.ibA),length=num(input.lengthM),voltage=num(input.voltageV),
  resistance=num(input.rOhmKm),reactance=num(input.xOhmKm,true),
  cosPhi=num(input.powerFactor),limit=num(input.maxDropPercent);
 if([ib,length,voltage,resistance,reactance,cosPhi,limit].some(x=>x===null)||
  cosPhi>1||limit>100)return finish('UNKNOWN',['DECLARED_PARAMETERS_REQUIRED']);
 if(input.conductorBasisDocumented!==true)return finish('UNKNOWN',['CONDUCTOR_BASIS_NOT_DOCUMENTED']);
 if(input.routeLengthDocumented!==true)return finish('UNKNOWN',['ROUTE_LENGTH_NOT_DOCUMENTED']);
 if(single&&input.neutralEquivalent!==true)return finish('UNKNOWN',['NEUTRAL_EQUIVALENCE_NOT_DOCUMENTED']);
 const sinPhi=Math.sqrt(Math.max(0,1-cosPhi*cosPhi));
 const multiplier=three?Math.sqrt(3):2;
 const dropV=multiplier*ib*(length/1000)*(resistance*cosPhi+reactance*sinPhi);
 const percent=dropV/voltage*100;
 if(!Number.isFinite(percent)||percent<0)return finish('UNKNOWN',['ARITHMETIC_OUT_OF_RANGE']);
 const status=percent<=limit?'PASS':'FAIL';
 return finish(status,status==='FAIL'?['DROP_EXCEEDS_DECLARED_LIMIT']:[],{
  dropV,dropPercent:percent,limitPercent:limit,
  inputs:{ibA:ib,lengthM:length,voltageV:voltage,rOhmKm:resistance,xOhmKm:reactance,
   powerFactor:cosPhi,phase,neutralEquivalent:single?true:null},
  formula:three?'sqrt(3)*Ib*Lkm*(R*cosPhi+X*sinPhi)':'2*Ib*Lkm*(R*cosPhi+X*sinPhi)',
  scope:'Steady-state balanced three-phase or single-phase with equivalent neutral impedance',
  notice:'Limit is user declared; conductor R/X are documented design-temperature inputs, not catalogue defaults.'
 });
}
function epApplyVoltageDropInputV1(project,lineId,input){
 if(!project||!Array.isArray(project.lines)||!input||typeof input!=='object')
  return {status:'BLOCKED',code:'INPUT_INVALID',project:null};
 const matches=project.lines.filter(x=>x?.id===lineId);
 if(matches.length!==1)return {status:'BLOCKED',code:'LINE_NOT_UNIQUE',project:null};
 const line=matches[0],ib=line.overloadInput?.ibA;
 const calculated=epVoltageDropDesignV1({...input,ibA:ib,phase:line.phase});
 if(!['PASS','FAIL'].includes(calculated.status))return {status:'BLOCKED',code:calculated.issues[0],project:null};
 const copy=JSON.parse(JSON.stringify(project)),target=copy.lines.find(x=>x.id===lineId);
 target.voltageDropDesignInput={
  lengthM:calculated.inputs.lengthM,voltageV:calculated.inputs.voltageV,
  rOhmKm:calculated.inputs.rOhmKm,xOhmKm:calculated.inputs.xOhmKm,
  powerFactor:calculated.inputs.powerFactor,maxDropPercent:calculated.limitPercent,
  conductorBasisDocumented:true,routeLengthDocumented:true,
  neutralEquivalent:line.phase==='3Ф'?null:true};
 target.calculationReview={required:true,reason:'VOLTAGE_DROP_INPUT_UPDATED'};
 return {status:'REVIEW_REQUIRED',code:'DROP_CALCULATED',project:copy,calculation:calculated};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epVoltageDropDesignV1,epApplyVoltageDropInputV1};
