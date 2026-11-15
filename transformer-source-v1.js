'use strict';
// Declared 3-phase transformer impedance referred to its LV terminals.
// Arithmetic: |Zt|=uk/100*Ull^2/S; Rt=Pcu*Ull^2/S^2.
// Does not establish network supply, tolerances or IEC 60909 applicability.
function epTransformerSourceV1(input){
 const issues=[],add=(code,level='BLOCKED')=>issues.push({code,level});
 const out=(extra={})=>({schema:'electropanel.transformer.source.declared.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,transformerROhm:null,transformerXOhm:null,transformerZOhm:null,
  sourceROhm:null,sourceXOhm:null,engineeringApproved:false,
  ready_for_installation:false,...extra});
 if(!input||typeof input!=='object'||Array.isArray(input)){
  add('TRANSFORMER_INPUT_INVALID');return out();
 }
 const positive=(value,zero=false)=>{
  if(typeof value!=='number'&&typeof value!=='string')return null;
  const s=String(value).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n<=1e9&&(zero?n>=0:n>0)?n:null;
 };
 const powerKva=positive(input.ratedPowerKva),voltage=positive(input.ratedVoltageV),
  uk=positive(input.ukPercent),loss=positive(input.loadLossW,true),
  upR=positive(input.upstreamROhm,true),upX=positive(input.upstreamXOhm,true);
 if([powerKva,voltage,uk,loss,upR,upX].includes(null)||
     voltage>1000||uk>100||powerKva>1e6){
  add('TRANSFORMER_VALUES_INVALID');return out();
 }
 if(typeof input.source!=='string'||!input.source.trim())
  add('TRANSFORMER_SOURCE_MISSING','UNKNOWN');
 else if(input.source.length>2000)add('TRANSFORMER_SOURCE_TOO_LONG');
 if(typeof input.upstreamSource!=='string'||!input.upstreamSource.trim())
  add('TRANSFORMER_UPSTREAM_SOURCE_MISSING','UNKNOWN');
 else if(input.upstreamSource.length>2000)add('TRANSFORMER_UPSTREAM_SOURCE_TOO_LONG');
 // The short-circuit copper loss is assumed to be the three-phase rated-load
 // loss on the same winding base as uk. Both have to be declared by the user.
 const u=voltage,s=powerKva*1000,z=uk/100*u*u/s;
 const r=loss*u*u/(s*s);
 if(!Number.isFinite(z)||z<=0||!Number.isFinite(r)||r<0){
  add('TRANSFORMER_IMPEDANCE_INVALID');return out();
 }
 // Relative tolerance only: an absolute 1e-10 Ω tolerance is large for
 // low-impedance transformers and can conceal physically impossible losses.
 const tolerance=32*Number.EPSILON*z;
 if(r>z+tolerance){
  add('TRANSFORMER_LOSS_EXCEEDS_IMPEDANCE');return out();
 }
 const normalizedR=Math.min(r,z);
 const x=Math.sqrt(Math.max(0,(z-normalizedR)*(z+normalizedR)));
 if(!Number.isFinite(x)){add('TRANSFORMER_REACTANCE_INVALID');return out();}
 if(input.lossBasisConfirmed!==true)
  add('TRANSFORMER_LOSS_BASIS_UNCONFIRMED','UNKNOWN');
 return out({transformerROhm:r,transformerXOhm:x,transformerZOhm:z,
  sourceROhm:r+upR,sourceXOhm:x+upX,ratedVoltageV:voltage,
  ratedPowerKva:powerKva,ukPercent:uk,loadLossW:loss,
  ratedCurrentA:s/(Math.sqrt(3)*u),
  resistivePercent:100*normalizedR*s/(u*u),
  reactivePercent:100*x*s/(u*u),
  impedanceRatio:normalizedR/z,
  upstreamROhm:upR,upstreamXOhm:upX,
  source:typeof input.source==='string'?input.source:null,
  upstreamSource:typeof input.upstreamSource==='string'?input.upstreamSource:null,
  lossBasisConfirmed:input.lossBasisConfirmed===true,
  formula:'|Zt|=(uk%/100)*Ull^2/S; Rt=Pcu*Ull^2/S^2; Xt=sqrt(|Zt|^2-Rt^2)',
  notice:'A declared LV three-phase transformer equivalent plus explicitly declared upstream R/X. No impedance tolerances, tap-changer, correction factor, source network model or normative approval.'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={epTransformerSourceV1};
