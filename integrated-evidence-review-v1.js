'use strict';
// Consolidated evidence screening; never upgrades preliminary checks to engineering approval.
const deps=typeof module!=='undefined'&&module.exports?{
 ...require('./coordination-evidence-v1.js'),
 ...require('./fault-loop-screen-v1.js'),
 ...require('./catalog-evidence-v1.js'),
 ...require('./din-geometry-evidence-v1.js'),
 ...require('./design-quality-gates-v1.js')
}:globalThis;
function epIntegratedEvidenceReview(project,api=deps){
 const checks=[],issues=[];
 const add=(scope,id,result)=>{
  checks.push({scope,id,status:result.status});
  for(const issue of result.issues||[])issues.push({scope,id,...issue});
 };
 if(!project||typeof project!=='object'||Array.isArray(project))
  return {status:'BLOCKED',checks:[],issues:[{code:'PROJECT_INVALID'}],engineeringApproved:false};
 for(const [index,line] of (Array.isArray(project.lines)?project.lines:[]).entries()){
  const id=typeof line?.id==='string'?line.id:String(index);
  add('coordination',id,api.epCoordinationCheck(line?.coordinationEvidence||{}));
  add('faultLoop',id,api.epFaultLoopScreen(line?.faultLoopEvidence||{}));
 }
 for(const [index,article] of (Array.isArray(project.catalogArticles)?project.catalogArticles:[]).entries())
  add('catalog',String(index),api.epCatalogEvidence(article));
 if(project.dinEvidence!==undefined)
  add('din','board',api.epDinGeometryCheck(project.dinEvidence?.devices,project.dinEvidence?.railWidthMm));
 if(!Array.isArray(project.lines)||project.lines.length===0)issues.push({code:'NO_CIRCUITS',status:'UNKNOWN'});
 if(!Array.isArray(project.catalogArticles)||!project.catalogArticles.length)issues.push({code:'CATALOG_EVIDENCE_MISSING',status:'UNKNOWN'});
 if(project.dinEvidence===undefined)issues.push({code:'DIN_EVIDENCE_MISSING',status:'UNKNOWN'});
 const quality=typeof api.epDesignQualityGatesV1==='function'?api.epDesignQualityGatesV1(project):null;
 if(quality)for(const issue of quality.issues)issues.push({scope:'quality',...issue});
 const blocked=checks.some(c=>c.status==='BLOCKED')||issues.some(i=>i.status==='BLOCKED');
 return {status:blocked?'BLOCKED':'UNKNOWN',checks,issues,quality,engineeringApproved:false,readyForInstallation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epIntegratedEvidenceReview};
