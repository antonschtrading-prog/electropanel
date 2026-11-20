'use strict';
const KINDS=Object.freeze(['MCB','RCD','RCBO','METER','RELAY','CONTACTOR']);
const REQUIRED=Object.freeze({
 MCB:['inA','poles','modules','widthMm','icnKa','icnVoltageV','icnStandard'],
 RCD:['inA','poles','modules','widthMm','residualCurrentMa','residualType'],
 RCBO:['inA','poles','modules','widthMm','residualCurrentMa','residualType','icnKa','icnVoltageV','icnStandard'],
 METER:['poles','modules','widthMm','ratedVoltageV','connectionType'],
 RELAY:['modules','widthMm','coilVoltageV','coilSupplyType','contactRatingA'],
 CONTACTOR:['modules','widthMm','coilVoltageV','coilSupplyType','utilizationCategory','contactRatingA']
});
const POSITIVE=['inA','poles','modules','widthMm','heightMm','depthMm','icnKa','icnVoltageV','icuKa','icuVoltageV','residualCurrentMa','ratedVoltageV','coilVoltageV','contactRatingA'];
function validateCandidate(record){
 const errors=[];
 if(!record||typeof record!=='object'||Array.isArray(record))return [{code:'INVALID_RECORD'}];
 for(const key of ['maker','series','sku','kind'])if(typeof record[key]!=='string'||!record[key].trim())errors.push({code:'IDENTITY_REQUIRED',field:key});
 if(!KINDS.includes(record.kind))errors.push({code:'UNKNOWN_KIND',field:'kind'});
 for(const key of REQUIRED[record.kind]||[])if(record[key]===null||record[key]===undefined||record[key]==='')errors.push({code:'REQUIRED_SPEC_UNKNOWN',field:key});
 for(const key of POSITIVE)if(record[key]!=null&&(!Number.isFinite(record[key])||record[key]<=0))errors.push({code:'INVALID_POSITIVE_NUMBER',field:key});
 for(const key of ['poles','modules'])if(record[key]!=null&&!Number.isInteger(record[key]))errors.push({code:'INTEGER_REQUIRED',field:key});
 if(record.icnKa!=null&&(!record.icnStandard||!record.icnVoltageV))errors.push({code:'ICN_CONTEXT_REQUIRED'});
 if(record.icuKa!=null&&record.icnKa==null)errors.push({code:'ICU_CANNOT_REPLACE_ICN'});
 if(record.kind==='RCD'&&record.icnKa!=null)errors.push({code:'RCD_ICN_NEEDS_INDEPENDENT_REVIEW'});
 if(record.poleConfiguration==='1P+N'&&record.poles!==2)errors.push({code:'POLE_CONFIGURATION_MISMATCH'});
 if(record.modules!=null&&record.widthMm!=null&&record.widthMm>record.modules*18.5)errors.push({code:'WIDTH_EXCEEDS_MODULE_ENVELOPE'});
 if(record.imageUrl&&!record.imageRightsEvidence)errors.push({code:'IMAGE_RIGHTS_MISSING'});
 return errors;
}
module.exports={KINDS,REQUIRED,validateCandidate};
