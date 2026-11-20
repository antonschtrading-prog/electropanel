'use strict';
// Conservative manufacturer's guaranteed upper-bound trip envelope.
// No interpolation, guessed B/C/D curve multipliers, or normative approval.
function epTripEnvelopeV1(line,article,ikMinA,requiredTimeS){
 const issues=[],add=(code,level='UNKNOWN')=>issues.push({code,level,lineId:line?.id??null});
 const end=(extra={})=>({schema:'electropanel.trip.envelope.declared.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  numericalStatus:'UNKNOWN',issues,guaranteedMaxTimeS:null,
  guaranteedThresholdA:null,requiredCurrentA:null,marginA:null,
  engineeringApproved:false,ready_for_installation:false,...extra});
 const input=line?.faultRouteInput?.tripEnvelope;
 if(!input){add('TRIP_ENVELOPE_MISSING');return end();}
 if(!input||typeof input!=='object'||Array.isArray(input)){
  add('TRIP_ENVELOPE_INVALID','BLOCKED');return end();
 }
 const num=x=>{
  if(typeof x!=='string'&&typeof x!=='number')return null;
  const s=String(x).trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;
  const n=Number(s);return Number.isFinite(n)&&n>0&&n<=1e8?n:null;
 };
 const ik=num(ikMinA),time=num(requiredTimeS);
 if(ik===null||time===null){add('TRIP_ENVELOPE_CURRENT_OR_TIME_INVALID');return end();}
 if(!article||!['MCB','RCBO'].includes(article.kind)){
  add('TRIP_ENVELOPE_DEVICE_UNSUPPORTED');return end();
 }
 if(typeof input.articleSku!=='string'||!input.articleSku.trim()||
    input.articleSku!==line?.catalogSku){
  add('TRIP_ENVELOPE_SKU_MISMATCH','BLOCKED');return end();
 }
 if(typeof input.source!=='string'||!input.source.trim())
  add('TRIP_ENVELOPE_MANUFACTURER_SOURCE_MISSING');
 else if(input.source.length>2000)add('TRIP_ENVELOPE_MANUFACTURER_SOURCE_TOO_LONG','BLOCKED');
 if(input.guaranteeBasisConfirmed!==true)
  add('TRIP_ENVELOPE_GUARANTEE_BASIS_UNCONFIRMED');
 if(input.articleRatingA!==undefined&&
    (num(input.articleRatingA)===null||num(input.articleRatingA)!==num(article.inA)))
  add('TRIP_ENVELOPE_RATING_MISMATCH','BLOCKED');
 if(input.curve!==undefined&&input.curve!==(article.curve??null))
  add('TRIP_ENVELOPE_CURVE_MISMATCH','BLOCKED');
 if(!Array.isArray(input.points)||input.points.length===0||input.points.length>40){
  add('TRIP_ENVELOPE_POINTS_INVALID','BLOCKED');return end();
 }
 const points=[];
 let lastCurrent=-Infinity,lastTime=Infinity;
 for(const [index,point] of input.points.entries()){
  const current=num(point?.currentA),maxTime=num(point?.maxTimeS);
  if(current===null||maxTime===null){
   add('TRIP_ENVELOPE_POINT_INVALID','BLOCKED');continue;
  }
  if(current<=lastCurrent){
   add('TRIP_ENVELOPE_CURRENT_ORDER_INVALID','BLOCKED');continue;
  }
  // A guarantee at a larger current must not be weaker than at the
  // immediately preceding current. Do not silently repair contradictory curves.
  if(maxTime>lastTime){
   add('TRIP_ENVELOPE_TIME_ORDER_INVALID','BLOCKED');continue;
  }
  lastCurrent=current;lastTime=maxTime;
  points.push({index:index+1,currentA:current,maxTimeS:maxTime});
 }
 if(issues.some(x=>x.level==='BLOCKED'))return end({points});
 const candidates=points.filter(x=>x.maxTimeS<=time);
 const requiredCurrentA=candidates.length?candidates[0].currentA:null;
 const applicable=points.filter(x=>x.currentA<=ik);
 const guaranteedMaxTimeS=applicable.length?applicable[applicable.length-1].maxTimeS:null;
 const numericalStatus=requiredCurrentA!==null&&ik>=requiredCurrentA?
  'PRELIMINARY_WITHIN_ENVELOPE':'NOT_DEMONSTRATED';
 if(numericalStatus==='NOT_DEMONSTRATED')
  add('TRIP_ENVELOPE_DISCONNECTION_NOT_DEMONSTRATED');
 if(input.faultType!==undefined&&input.faultType!=='L_PE')
  add('TRIP_ENVELOPE_FAULT_SCOPE_MISMATCH','BLOCKED');
 return end({points,ikMinA:ik,requiredTimeS:time,requiredCurrentA,
  guaranteedMaxTimeS,marginA:requiredCurrentA===null?null:ik-requiredCurrentA,
  numericalStatus:issues.some(x=>x.level==='BLOCKED')?'UNKNOWN':numericalStatus,
  manufacturerSource:input.source??null,
  notice:'Declared conservative manufacturer maximum trip times only. No interpolation; not a verification of installation or regulatory disconnection time.'});
}
if(typeof module!=='undefined'&&module.exports)module.exports={epTripEnvelopeV1};
