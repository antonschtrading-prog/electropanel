'use strict';
// Evidence-aware cable/protection coordination. No implicit defaults or approvals.
function epCoordinationCheck(input) {
  const issues=[];
  const required=['ibA','inA','izA','i2A'];
  const values={};
  for(const key of required){
    const raw=input&&input[key];
    if(raw===undefined||raw===null||String(raw).trim()===''){
      issues.push({code:key.toUpperCase()+'_MISSING',status:'UNKNOWN'});
      continue;
    }
    if(typeof raw!=='number'&&typeof raw!=='string'){
      issues.push({code:key.toUpperCase()+'_INVALID',status:'BLOCKED'});continue;
    }
    const str=String(raw).trim();
    if(!/^(?:\d+)(?:[.,]\d+)?$/.test(str)){
      issues.push({code:key.toUpperCase()+'_INVALID',status:'BLOCKED'});continue;
    }
    const n=Number(str.replace(',','.'));
    if(!Number.isFinite(n)||n<=0){
      issues.push({code:key.toUpperCase()+'_INVALID',status:'BLOCKED'});continue;
    }
    values[key]=n;
  }
  if(required.every(k=>values[k]!==undefined)){
    if(values.ibA>values.inA)issues.push({code:'IB_GT_IN',status:'BLOCKED'});
    if(values.inA>values.izA)issues.push({code:'IN_GT_IZ',status:'BLOCKED'});
    if(values.i2A>1.45*values.izA)issues.push({code:'I2_GT_145_IZ',status:'BLOCKED'});
  }
  const evidence=input&&input.evidence;
  if(!evidence||typeof evidence!=='object'||Array.isArray(evidence)||
    typeof evidence.cableSource!=='string'||!evidence.cableSource.trim()||
    typeof evidence.protectionSource!=='string'||!evidence.protectionSource.trim()){
    issues.push({code:'EVIDENCE_INCOMPLETE',status:'UNKNOWN'});
  }
  // Numerical checks alone cannot verify installation method, derating,
  // conductor temperature, protection characteristics or normative applicability.
  issues.push({code:'DESIGN_APPLICABILITY_UNVERIFIED',status:'UNKNOWN'});
  const status=issues.some(x=>x.status==='BLOCKED')?'BLOCKED':'UNKNOWN';
  return {status,issues,values,engineeringApproved:false,readyForInstallation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCoordinationCheck};
