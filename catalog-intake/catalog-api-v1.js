'use strict';
const {makeCards}=require('./catalog-view-model-v1.js');
const {findStagedDevices}=require('./staged-selector-v1.js');
const {assessDinPlacement}=require('./din-fit-preview-v1.js');
const {buildReleaseBundle}=require('./review-bundle-v1.js');
const {summary}=require('./verification-backlog-v1.js');
const {catalogIntegration,projectMaterialDraft}=require('./catalog-project-integration-v1.js');
const {coverage}=require('./catalog-seed-coverage-v1.js');
const {dashboard,verificationQueue}=require('./catalog-quality-dashboard-v1.js');
function handleCatalogueRequest(request={}){
 if(!request||typeof request!=='object'||Array.isArray(request))return {ok:false,error:'INVALID_REQUEST'};
 const {operation='list',criteria={},availableModules,filters={}}=request;
 try{
  switch(operation){
   case 'list':{
    const {filterCards}=require('./catalog-view-model-v1.js');
    return {ok:true,operation, ...filterCards(filters)};
   }
   case 'find':return {ok:true,operation,...findStagedDevices(criteria)};
   case 'din-fit':return {ok:true,operation,...assessDinPlacement(criteria,availableModules)};
   case 'summary':return {ok:true,operation,...summary()};
   case 'coverage':return {ok:true,operation,...coverage()};
   case 'quality':return {ok:true,operation,...dashboard()};
   case 'verification-queue':return {ok:true,operation,...verificationQueue()};
   case 'project-audit':return {ok:true,operation,...catalogIntegration(request.project||{})};
   case 'preliminary-bom':return {ok:true,operation,...projectMaterialDraft(request.project||{})};
   case 'review':{
    const bundle=buildReleaseBundle();
    return {ok:true,operation,...bundle};
   }
   case 'get':{
    const sku=String(request.sku||'').trim().toUpperCase();
    if(!sku)return {ok:false,error:'SKU_REQUIRED'};
    const card=makeCards().find(x=>x.sku.toUpperCase()===sku);
    return card?{ok:true,operation,card}:{ok:false,error:'SKU_NOT_FOUND',sku};
   }
   default:return {ok:false,error:'UNKNOWN_OPERATION',operation};
  }
 }catch(error){
  if(error instanceof RangeError||error instanceof TypeError)return {ok:false,error:'INVALID_CRITERIA',message:error.message};
  throw error;
 }
}
module.exports={handleCatalogueRequest};
