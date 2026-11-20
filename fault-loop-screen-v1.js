'use strict';
// Conservative declared loop impedance / prospective fault-current screening.
// Values are declarations, not a verified network short-circuit study.
function epFaultLoopScreen(x){
 const issues=[];
 const number=(key)=>{const v=x?.[key];if(v===undefined||v===null||v===''){issues.push({code:key+'_MISSING',status:'UNKNOWN'});return null;}if(typeof v!=='number'&&typeof v!=='string'){issues.push({code:key+'_INVALID',status:'BLOCKED'});return null;}const s=String(v).trim();if(!/^\d+(?:[.,]\d+)?$/.test(s)){issues.push({code:key+'_INVALID',status:'BLOCKED'});return null;}const n=Number(s.replace(',','.'));if(!Number.isFinite(n)||n<=0){issues.push({code:key+'_INVALID',status:'BLOCKED'});return null;}return n;};
 const u0=number('u0V'),zs=number('zsOhm'),ia=number('iaA');
 const cmin=x?.cmin===undefined?null:number('cmin');
 if(cmin===null)issues.push({code:'CMIN_NOT_ESTABLISHED',status:'UNKNOWN'});
 if(cmin!==null&&(cmin>1||cmin<=0))issues.push({code:'CMIN_OUT_OF_RANGE',status:'BLOCKED'});
 let prospectiveIa=null,thresholdZs=null;
 if(u0!==null&&zs!==null&&cmin!==null&&cmin>0&&cmin<=1)prospectiveIa=cmin*u0/zs;
 if(u0!==null&&ia!==null&&cmin!==null&&cmin>0&&cmin<=1)thresholdZs=cmin*u0/ia;
 if(prospectiveIa!==null&&ia!==null&&prospectiveIa<ia)issues.push({code:'DECLARED_FAULT_CURRENT_BELOW_IA',status:'BLOCKED'});
 if(!x?.source||typeof x.source!=='string'||!x.source.trim())issues.push({code:'SOURCE_MISSING',status:'UNKNOWN'});
 issues.push({code:'DISCONNECTION_TIME_AND_SYSTEM_UNVERIFIED',status:'UNKNOWN'});
 return {status:issues.some(i=>i.status==='BLOCKED')?'BLOCKED':'UNKNOWN',issues,prospectiveIa,thresholdZs,engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epFaultLoopScreen};
