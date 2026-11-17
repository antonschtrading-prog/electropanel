'use strict';
// All-or-nothing manufacturer/series migration of a selected article across a
// cabinet. Uses the same validation as individual replacements.
function epCabinetArticleBulkReplacementV1(project,oldSku,newSku,lookup){
 const reject=(code,issues=[])=>({schema:'electropanel.cabinet.article.bulk.replacement.1',
  status:'BLOCKED',code,issues,project:null,preview:null,
  engineeringApproved:false,ready_for_installation:false});
 if(!project||typeof oldSku!=='string'||!oldSku.trim()||
  typeof newSku!=='string'||!newSku.trim()||oldSku===newSku||
  typeof lookup!=='function'||typeof epDraftBoardPlanV1!=='function'||
  typeof epCabinetArticleReplacementV1!=='function')
  return reject('BULK_REPLACEMENT_INPUT_INVALID');
 let board;
 try{board=epDraftBoardPlanV1(project,lookup);}
 catch(_){return reject('BULK_REPLACEMENT_LAYOUT_FAILED');}
 if(board.status==='BLOCKED')return reject('BULK_REPLACEMENT_SOURCE_LAYOUT_BLOCKED',board.issues);
 const ids=(board.placements||[]).filter(p=>p.article===oldSku).map(p=>p.deviceId);
 if(!ids.length)return reject('BULK_REPLACEMENT_SOURCE_ARTICLE_NOT_FOUND');
 if(ids.length>400)return reject('BULK_REPLACEMENT_TOO_MANY_DEVICES');
 let copy=project;const steps=[];
 for(const id of ids){
  const result=epCabinetArticleReplacementV1(copy,id,newSku,lookup);
  if(result.status!=='REVIEW_REQUIRED')
   return reject('BULK_REPLACEMENT_STEP_BLOCKED',
    [{code:result.code,deviceId:id,level:'BLOCKED'},...(result.issues||[])]);
  copy=result.project;
  steps.push({deviceId:id,moduleDelta:result.preview.moduleDelta,
   relocatedDeviceIds:result.preview.relocatedDeviceIds});
 }
 const final=epDraftBoardPlanV1(copy,lookup);
 if(final.status==='BLOCKED')return reject('BULK_REPLACEMENT_FINAL_LAYOUT_BLOCKED',final.issues);
 if(final.placements.some(p=>p.article===oldSku))
  return reject('BULK_REPLACEMENT_INCOMPLETE');
 const originalById=new Map(board.placements.map(x=>[x.deviceId,x]));
 const moved=final.placements.filter(x=>{
  const before=originalById.get(x.deviceId);
  return before&&(before.railIndex!==x.railIndex||before.startModule!==x.startModule);
 }).map(x=>x.deviceId);
 return {schema:'electropanel.cabinet.article.bulk.replacement.1',
  status:'REVIEW_REQUIRED',code:'BULK_REPLACEMENT_PREVIEW_READY',
  project:copy,preview:{oldSku,newSku,replacedDeviceIds:ids,
   replacedCount:ids.length,steps,relocatedDeviceIds:moved,
   relocatedCount:moved.length,finalPlacementCount:final.placements.length,
   engineeringApproved:false},issues:[],engineeringApproved:false,
  ready_for_installation:false,manufacturerCabinetFitVerified:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCabinetArticleBulkReplacementV1};
