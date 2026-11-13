'use strict';
// A reversible projection of a verified catalogue record onto a DIN placement.
// Never derives a width from a visual image or invents dimensions.
function epDinPlacementFromArticleV1(record,deviceId){
 const audit=epDinCatalogValidateV1(record);
 const issues=[...audit.issues];
 const add=(code,level='UNKNOWN')=>issues.push({code,level});
 if(typeof deviceId!=='string'||!deviceId.trim())add('DEVICE_ID_REQUIRED','BLOCKED');
 const g=record?.geometry;
 const din=record?.mounting==='DIN';
 if(!din)add('NOT_CONFIRMED_DIN_MOUNT','BLOCKED');
 const width=g?.widthMm;
 if(!Number.isFinite(width)||width<=0)add('WIDTH_UNKNOWN','BLOCKED');
 const modules=Number.isFinite(width)&&width>0?Math.ceil(width/18):null;
 if(modules!==null&&modules>100)add('UNREASONABLE_MODULE_COUNT','BLOCKED');
 if(record?.verificationStatus!=='VERIFIED')add('ARTICLE_NOT_VERIFIED');
 if(record?.visual?.verified!==true)add('VISUAL_NOT_VERIFIED');
 const status=issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN';
 return {status,deviceId,article:record?.article??null,
  category:record?.category??null,manufacturer:record?.manufacturer??null,
  series:record?.series??null,geometry:g??null,modules,
  visual:record?.visual?.verified===true?record.visual:{mode:'NEUTRAL_PLACEHOLDER',verified:false},
  issues,engineeringApproved:false,ready_for_installation:false};
}
function epDinPlacementAuditV1(project,lookup){
 const entries=project?.dinPlacementsV1;
 if(entries===undefined)return {status:'UNKNOWN',issues:[{code:'DIN_PLACEMENTS_NOT_DECLARED',level:'UNKNOWN'}],
  count:0,engineeringApproved:false,ready_for_installation:false};
 if(!Array.isArray(entries)||entries.length>500)return {status:'BLOCKED',issues:[{code:'DIN_PLACEMENTS_INVALID',level:'BLOCKED'}],
  count:0,engineeringApproved:false,ready_for_installation:false};
 const issues=[],seen=new Set();
 const board=typeof epBoardDevicesV1==='function'?epBoardDevicesV1(project):[];
 const ids=new Set(board.map(x=>x.id));
 for(const e of entries){
  if(!e||typeof e!=='object'){issues.push({code:'DIN_ENTRY_INVALID',level:'BLOCKED'});continue;}
  if(seen.has(e.deviceId))issues.push({code:'DIN_DEVICE_DUPLICATE',level:'BLOCKED',deviceId:e.deviceId});
  seen.add(e.deviceId);
  if(!ids.has(e.deviceId))issues.push({code:'DIN_DEVICE_NOT_ON_BOARD',level:'BLOCKED',deviceId:e.deviceId});
  let record;
  try{record=typeof lookup==='function'?lookup(e.article):null;}
  catch(_){issues.push({code:'DIN_LOOKUP_FAILED',level:'BLOCKED',deviceId:e.deviceId});continue;}
  if(!record){issues.push({code:'DIN_ARTICLE_UNKNOWN',level:'BLOCKED',deviceId:e.deviceId});continue;}
  const result=epDinPlacementFromArticleV1(record,e.deviceId);
  for(const issue of result.issues)issues.push({...issue,deviceId:e.deviceId});
  if(e.modules!==result.modules)issues.push({code:'DIN_MODULES_STALE',level:'BLOCKED',deviceId:e.deviceId});
  const placed=board.find(x=>x.id===e.deviceId);
  if(placed&&placed.modules!==result.modules)issues.push({code:'DIN_BOARD_MODULES_CONFLICT',level:'BLOCKED',deviceId:e.deviceId});
 }
 return {status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',
  issues,count:entries.length,engineeringApproved:false,ready_for_installation:false};
}

// Atomic proposal only: caller must explicitly apply and persist after review.
function epDinArticleReplacementV1(project,deviceId,nextArticle,lookup){
 const entry=Array.isArray(project?.dinPlacementsV1)?
  project.dinPlacementsV1.find(x=>x?.deviceId===deviceId):null;
 if(!entry)return {status:'BLOCKED',code:'PLACEMENT_NOT_FOUND',proposal:null};
 let product=null;
 try{product=typeof lookup==='function'?lookup(nextArticle):null;}
 catch(_){return {status:'BLOCKED',code:'LOOKUP_FAILED',proposal:null};}
 if(!product||product.article!==nextArticle)
  return {status:'BLOCKED',code:'ARTICLE_IDENTITY_MISMATCH',proposal:null};
 const projection=epDinPlacementFromArticleV1(product,deviceId);
 if(projection.status==='BLOCKED'||projection.modules===null)
  return {status:'BLOCKED',code:'ARTICLE_GEOMETRY_UNAVAILABLE',proposal:null,issues:projection.issues};
 return {status:'REVIEW_REQUIRED',code:'ARTICLE_CHANGE_REQUIRES_BOARD_RELAYOUT',
  proposal:{deviceId,article:nextArticle,modules:projection.modules,
   manufacturer:projection.manufacturer,series:projection.series,
   geometry:projection.geometry,visual:projection.visual},
  issues:projection.issues,engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDinPlacementFromArticleV1,epDinPlacementAuditV1,epDinArticleReplacementV1};
