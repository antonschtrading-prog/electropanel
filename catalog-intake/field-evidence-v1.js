'use strict';
const {validateCandidate}=require('./candidate-schema-v1.js');
const KEY_FIELDS=Object.freeze({
 MCB:['inA','poles','modules','widthMm','icnKa','icnVoltageV','icnStandard'],
 RCD:['inA','poles','modules','widthMm','residualCurrentMa','residualType'],
 RCBO:['inA','poles','modules','widthMm','residualCurrentMa','residualType','icnKa','icnVoltageV','icnStandard'],
 METER:['poles','modules','widthMm','ratedVoltageV','connectionType'],
 RELAY:['modules','widthMm','coilVoltageV','coilSupplyType','contactRatingA'],
 CONTACTOR:['modules','widthMm','coilVoltageV','coilSupplyType','utilizationCategory','contactRatingA']
});
function reviewCandidate(candidate,fieldEvidence={}){
 const errors=validateCandidate(candidate);
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return {status:'BLOCKED',errors,engineeringApproved:false};
 for(const field of KEY_FIELDS[candidate.kind]||[]){
  if(candidate[field]==null)continue;
  const e=fieldEvidence[field];
  if(!e||typeof e!=='object'||typeof e.url!=='string'||!/^https:\/\//.test(e.url)||!e.documentTitle||!e.reviewedAt||!e.locator)
   errors.push({code:'FIELD_EVIDENCE_MISSING',field});
 }
 const identity=fieldEvidence.sku;
 if(!identity||identity.exactSku!==candidate.sku||!identity.url||!identity.documentTitle||!identity.locator||!identity.reviewedAt)
  errors.push({code:'SKU_IDENTITY_EVIDENCE_MISSING',field:'sku'});
 return {status:errors.length?'BLOCKED':'READY_FOR_HUMAN_REVIEW',errors,engineeringApproved:false,
  manufacturerCertified:false};
}
function toLegacyCandidate(candidate,fieldEvidence={}){
 const review=reviewCandidate(candidate,fieldEvidence);
 if(review.status!=='READY_FOR_HUMAN_REVIEW')return {status:'BLOCKED',issues:review.errors,article:null};
 const keys=['maker','series','sku','kind','poles','poleConfiguration','modules','widthMm','heightMm','depthMm','inA','curve','icnKa','icnVoltageV','icnStandard','icuKa','icuVoltageV','residualCurrentMa','residualType'];
 const article=Object.fromEntries(keys.filter(k=>candidate[k]!==undefined).map(k=>[k,candidate[k]]));
 article.verificationStatus='PENDING_INTEGRATION_REVIEW';
 return {status:'REVIEW_REQUIRED',issues:[],article,engineeringApproved:false};
}
module.exports={KEY_FIELDS,reviewCandidate,toLegacyCandidate};
