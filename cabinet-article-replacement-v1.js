'use strict';
// Preflight a proposed apparatus replacement without modifying the project.
// A replacement is applied only if the board, BOM and visual article identities
// remain consistent and the DIN geometry is not invalidated.
function epCabinetArticleReplacementV1(project,deviceId,nextSku,lookup){
 const reject=(code,issues=[])=>({schema:'electropanel.cabinet.article.replacement.1',
  status:'BLOCKED',code,issues,project:null,preview:null,
  engineeringApproved:false,ready_for_installation:false});
 if(!project||!Array.isArray(project.lines)||typeof deviceId!=='string'||
  !deviceId.trim()||typeof nextSku!=='string'||!nextSku.trim()||
  nextSku.length>200||typeof lookup!=='function')
  return reject('REPLACEMENT_INPUT_INVALID');
 if(typeof epCabinetArticleReconciliationV1!=='function'||
  typeof epDraftBoardPlanV1!=='function')return reject('REPLACEMENT_ENGINES_UNAVAILABLE');
 let copy;
 try{copy=JSON.parse(JSON.stringify(project));}
 catch(_){return reject('REPLACEMENT_PROJECT_NOT_SERIALIZABLE');}
 const matches=[];
 for(const line of copy.lines)if(line?.id===deviceId)matches.push({kind:'line',item:line});
 for(const branch of Array.isArray(copy.branchDevices)?copy.branchDevices:[])
  if(branch?.id===deviceId)matches.push({kind:'branch',item:branch});
 for(const shared of Array.isArray(copy.sharedDevices)?copy.sharedDevices:[])
  if(shared?.id===deviceId)matches.push({kind:'shared',item:shared});
 if(matches.length!==1)return reject(matches.length?'REPLACEMENT_DEVICE_AMBIGUOUS':'REPLACEMENT_DEVICE_NOT_FOUND');
 const target=matches[0];
 if(target.kind==='line'&&copy.branchDevices?.some(b=>b?.circuitId===deviceId))
  return reject('REPLACEMENT_SELECT_BRANCH_DEVICE');
 let catalogue;
 try{catalogue=lookup(nextSku);}catch(_){return reject('REPLACEMENT_CATALOGUE_LOOKUP_FAILED');}
 if(!catalogue||typeof catalogue!=='object')return reject('REPLACEMENT_ARTICLE_UNKNOWN');
 if(catalogue.sku&&catalogue.sku!==nextSku)return reject('REPLACEMENT_ARTICLE_ID_MISMATCH');
 if(!Number.isInteger(catalogue.modules)||catalogue.modules<1||catalogue.modules>200)
  return reject('REPLACEMENT_ARTICLE_MODULES_INVALID');
 if(typeof catalogue.widthMm!=='number'||!Number.isFinite(catalogue.widthMm)||
  catalogue.widthMm<=0||catalogue.widthMm>catalogue.modules*18+0.001)
  return reject('REPLACEMENT_ARTICLE_WIDTH_INVALID');
 const previous=target.item.catalogSku||null;
 if(previous===nextSku)return reject('REPLACEMENT_ARTICLE_UNCHANGED');
 target.item.catalogSku=nextSku;
 target.item.modules=catalogue.modules;
 if(target.kind==='branch'){
  const circuit=copy.lines.find(l=>l?.id===target.item.circuitId);
  if(!circuit)return reject('REPLACEMENT_BRANCH_CIRCUIT_MISSING');
  circuit.modules=catalogue.modules;
 }else if(target.kind==='line'&&Array.isArray(copy.branchDevices)&&
  copy.branchDevices.some(b=>b?.circuitId===deviceId))
  return reject('REPLACEMENT_SELECT_BRANCH_DEVICE');
 const before=epDraftBoardPlanV1(project,lookup);
 const after=epDraftBoardPlanV1(copy,lookup);
 if(after.status==='BLOCKED')return reject('REPLACEMENT_LAYOUT_BLOCKED',after.issues);
 const reconciliation=epCabinetArticleReconciliationV1(copy,lookup);
 if(reconciliation.status==='BLOCKED')
  return reject('REPLACEMENT_RECONCILIATION_BLOCKED',reconciliation.issues);
 const previousPosition=before.placements?.find(x=>x.deviceId===deviceId);
 const newPosition=after.placements?.find(x=>x.deviceId===deviceId);
 if(!newPosition)return reject('REPLACEMENT_PLACEMENT_MISSING');
 const relocated=(before.placements||[]).filter(old=>{
  const next=after.placements.find(x=>x.deviceId===old.deviceId);
  return next&&(next.railIndex!==old.railIndex||next.startModule!==old.startModule);
 }).map(x=>x.deviceId);
 return {schema:'electropanel.cabinet.article.replacement.1',status:'REVIEW_REQUIRED',
  code:'REPLACEMENT_PREVIEW_READY',project:copy,
  preview:{deviceId,previousSku:previous,nextSku,previousModules:previousPosition?.modules??null,
   nextModules:newPosition.modules,previousPosition:previousPosition?{
    railIndex:previousPosition.railIndex,startModule:previousPosition.startModule}:null,
   nextPosition:{railIndex:newPosition.railIndex,startModule:newPosition.startModule},
   relocatedDeviceIds:relocated,relocationCount:relocated.length,
   moduleDelta:newPosition.modules-(previousPosition?.modules??newPosition.modules),
   articleCount:reconciliation.counts.matched,
   manualLayoutPreserved:Array.isArray(copy.manualLayoutV1)},
  issues:[],engineeringApproved:false,ready_for_installation:false,
  manufacturerCabinetFitVerified:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetArticleReplacementV1};
