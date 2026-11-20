'use strict';
// All-or-nothing manufacturer/series migration of a selected article across a
// cabinet. Uses the same validation as individual replacements.
function epCabinetArticleBulkReplacementV1(project,oldSku,newSku,lookup){
 const reject=(code,issues=[])=>({schema:'electropanel.cabinet.article.bulk.replacement.1',
  status:'BLOCKED',code,issues,project:null,preview:null,
  engineeringApproved:false,ready_for_installation:false});
 if(!project||typeof oldSku!=='string'||!oldSku.trim()||
  typeof newSku!=='string'||!newSku.trim()||oldSku!==oldSku.trim()||
  newSku!==newSku.trim()||oldSku.length>200||newSku.length>200||oldSku===newSku||
  typeof lookup!=='function'||typeof epDraftBoardPlanV1!=='function'||
  typeof epCabinetArticleReplacementV1!=='function')
  return reject('BULK_REPLACEMENT_INPUT_INVALID');
 const snapshot=new Map();
 const stableLookup=sku=>{
  if(snapshot.has(sku))return snapshot.get(sku);
  const value=lookup(sku);
  const copy=value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value;
  snapshot.set(sku,copy);return copy;
 };
 let board;
 try{board=epDraftBoardPlanV1(project,stableLookup);}
 catch(_){return reject('BULK_REPLACEMENT_LAYOUT_FAILED');}
 if(board.status==='BLOCKED')return reject('BULK_REPLACEMENT_SOURCE_LAYOUT_BLOCKED',board.issues);
 const ids=(board.placements||[]).filter(p=>p.article===oldSku).map(p=>p.deviceId);
 if(!ids.length)return reject('BULK_REPLACEMENT_SOURCE_ARTICLE_NOT_FOUND');
 if(ids.length>400)return reject('BULK_REPLACEMENT_TOO_MANY_DEVICES');
 let copy=project;const steps=[];
 for(const id of ids){
  const result=epCabinetArticleReplacementV1(copy,id,newSku,stableLookup);
  if(result.status!=='REVIEW_REQUIRED')
   return reject('BULK_REPLACEMENT_STEP_BLOCKED',
    [{code:result.code,deviceId:id,level:'BLOCKED'},...(result.issues||[])]);
  copy=result.project;
  steps.push({deviceId:id,moduleDelta:result.preview.moduleDelta,
   relocatedDeviceIds:result.preview.relocatedDeviceIds});
 }
 const final=epDraftBoardPlanV1(copy,stableLookup);
 if(final.status==='BLOCKED')return reject('BULK_REPLACEMENT_FINAL_LAYOUT_BLOCKED',final.issues);
 if(final.placements.some(p=>p.article===oldSku))
  return reject('BULK_REPLACEMENT_INCOMPLETE');
 const originalById=new Map(board.placements.map(x=>[x.deviceId,x]));
 const beforeModules=board.placements.reduce((sum,x)=>sum+x.modules,0);
 const afterModules=final.placements.reduce((sum,x)=>sum+x.modules,0);
 const bomChanges=[];
 if(typeof epDraftBomV1==='function'){
  let oldBom,newBom;
  try{oldBom=epDraftBomV1(project,stableLookup);newBom=epDraftBomV1(copy,stableLookup);}
  catch(_){return reject('BULK_REPLACEMENT_BOM_FAILED');}
  const oldQuantities=new Map(oldBom.items.map(x=>[x.key,x.quantity]));
  const newQuantities=new Map(newBom.items.map(x=>[x.key,x.quantity]));
  for(const sku of [...new Set([...oldQuantities.keys(),...newQuantities.keys()])].sort()){
   const before=oldQuantities.get(sku)||0,after=newQuantities.get(sku)||0;
   if(before!==after)bomChanges.push({sku,oldQuantity:before,newQuantity:after,delta:after-before});
  }
 }
 const moved=final.placements.filter(x=>{
  const before=originalById.get(x.deviceId);
  return before&&(before.railIndex!==x.railIndex||before.startModule!==x.startModule);
 }).map(x=>x.deviceId);
 return {schema:'electropanel.cabinet.article.bulk.replacement.1',
  status:'REVIEW_REQUIRED',code:'BULK_REPLACEMENT_PREVIEW_READY',
  project:copy,preview:{oldSku,newSku,replacedDeviceIds:ids,
   replacedCount:ids.length,steps,beforeModules,afterModules,
   moduleDelta:afterModules-beforeModules,bomChanges,relocatedDeviceIds:moved,
   relocatedCount:moved.length,finalPlacementCount:final.placements.length,
   engineeringApproved:false},issues:[],engineeringApproved:false,
  ready_for_installation:false,manufacturerCabinetFitVerified:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCabinetArticleBulkReplacementV1};
