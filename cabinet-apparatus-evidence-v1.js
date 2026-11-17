'use strict';
// Trace article-specific dimensions against the declared nominal DIN positions.
// No device-terminal coordinates, heat flow or manufacturer CAD are inferred.
function epCabinetApparatusEvidenceV1(project,lookup){
 const issues=[],rows=[],add=(code,level='UNKNOWN',deviceId=null)=>issues.push({code,level,deviceId});
 const finish=()=>({schema:'electropanel.cabinet.apparatus.evidence.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
  rows,issues,knownDimensions:{
   width:rows.filter(x=>x.bodyWidthMm!==null).length,
   height:rows.filter(x=>x.bodyHeightMm!==null).length,
   depth:rows.filter(x=>x.bodyDepthMm!==null).length},
  sourceReviewed:rows.filter(x=>x.sourceReviewedAt!==null&&x.sourceType!=='PROJECT_DECLARATION').length,
  sourceCoverage:{total:rows.length,reviewed:rows.filter(x=>x.sourceReviewedAt!==null&&x.sourceUrl!==null&&x.sourceType!=='PROJECT_DECLARATION').length,missingSourceUrl:rows.filter(x=>x.sourceUrl===null).length},
  dimensionCoverage:{complete:rows.filter(x=>x.bodyDimensionsComplete).length,incomplete:rows.filter(x=>!x.bodyDimensionsComplete).length},
  terminalsLocated:0,engineeringApproved:false,ready_for_installation:false,
  actualMountingPositionVerified:false,actualTerminalCoordinatesVerified:false});
 if(!project||typeof epDraftBoardPlanV1!=='function'){
  add('APPARATUS_EVIDENCE_BOARD_ENGINE_UNAVAILABLE','BLOCKED');return finish();
 }
 let board;
 try{board=epDraftBoardPlanV1(project,lookup);}
 catch(_){add('APPARATUS_EVIDENCE_BOARD_FAILED','BLOCKED');return finish();}
 if(board.status==='BLOCKED')add('APPARATUS_EVIDENCE_LAYOUT_BLOCKED','BLOCKED');
 const geometry=typeof epCabinetGeometryCheckV1==='function'?
  epCabinetGeometryCheckV1(project.cabinetGeometryV1,project.railCount,project.railCapacity):null;
 if(geometry?.status==='BLOCKED')add('APPARATUS_EVIDENCE_CABINET_GEOMETRY_INVALID','BLOCKED');
 const zones=new Map((geometry?.geometry?.zones||[]).map(x=>[x.railIndex,x]));
 const dim=(v)=>typeof v==='number'&&Number.isFinite(v)&&v>0?v:null;
 const validReviewDate=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;
  const t=Date.parse(v+'T00:00:00Z');return Number.isFinite(t)&&
   new Date(t).toISOString().slice(0,10)===v&&t<=Date.now();};
 for(const p of board.placements||[]){
  let d=null;
  try{d=p.article&&typeof lookup==='function'?lookup(p.article):null;}
  catch(_){add('APPARATUS_EVIDENCE_ARTICLE_LOOKUP_FAILED','BLOCKED',p.deviceId);}
  if(p.article&&!d)add('APPARATUS_EVIDENCE_ARTICLE_MISSING','BLOCKED',p.deviceId);
  const width=dim(d?.widthMm),height=dim(d?.heightMm),depth=dim(d?.depthMm);
  const slotWidth=p.modules*18,zone=zones.get(p.railIndex);
  const startX=zone?zone.xMm+p.startModule*18:null;
  const nominalEndX=startX===null?null:startX+slotWidth;
  const remainingZoneWidthMm=zone?zone.xMm+zone.widthMm-nominalEndX:null;
  const actualBodyEndXMm=startX===null||width===null?null:startX+width;
  const remainingBodyZoneWidthMm=zone&&actualBodyEndXMm!==null?
   zone.xMm+zone.widthMm-actualBodyEndXMm:null;
  const review=validReviewDate(d?.sourceReviewedAt)?d.sourceReviewedAt:null;
  const sourceType=typeof d?.sourceType==='string'&&d.sourceType?d.sourceType:
   d?'SOURCE_CATEGORY_NOT_DECLARED':'NO_ARTICLE';
  const evidenceSource=typeof d?.source==='string'&&/^https:\/\//.test(d.source)?d.source:null;
  const codes=[];
  const issue=(code,level='UNKNOWN')=>{codes.push(code);add(code,level,p.deviceId);};
  if(!p.article)issue('APPARATUS_EVIDENCE_ARTICLE_NOT_SELECTED');
  if(width===null)issue('APPARATUS_EVIDENCE_WIDTH_MISSING');
  if(height===null)issue('APPARATUS_EVIDENCE_HEIGHT_MISSING');
  if(depth===null)issue('APPARATUS_EVIDENCE_DEPTH_MISSING');
  if(review===null)issue('APPARATUS_EVIDENCE_SOURCE_NOT_REVIEWED');
  if(d?.sourceReviewedAt!=null&&!validReviewDate(d.sourceReviewedAt))
   issue('APPARATUS_EVIDENCE_SOURCE_REVIEW_DATE_INVALID');
  if(sourceType==='MANUFACTURER_DATASHEET_MIRROR'&&evidenceSource===null)
   issue('APPARATUS_EVIDENCE_SOURCE_LINK_MISSING');
  if(sourceType==='PROJECT_DECLARATION')issue('APPARATUS_EVIDENCE_USER_ENTERED_UNVERIFIED');
  if(width!==null&&width>slotWidth+1e-6)issue('APPARATUS_EVIDENCE_NOMINAL_SLOT_WIDTH_EXCEEDED','BLOCKED');
  if(zone&&remainingZoneWidthMm!==null&&remainingZoneWidthMm< -1e-6)
   issue('APPARATUS_EVIDENCE_SLOT_OUTSIDE_RAIL_BAND','BLOCKED');
  if(zone&&remainingBodyZoneWidthMm!==null&&remainingBodyZoneWidthMm< -1e-6)
   issue('APPARATUS_EVIDENCE_BODY_OUTSIDE_RAIL_BAND','BLOCKED');
  if(zone&&height!==null&&height>zone.heightMm+1e-6)
   issue('APPARATUS_EVIDENCE_DECLARED_RAIL_BAND_HEIGHT_EXCEEDED','BLOCKED');
  if(geometry?.geometry&&depth!==null&&depth>geometry.geometry.interior.depthMm+1e-6)
   issue('APPARATUS_EVIDENCE_DECLARED_INTERIOR_DEPTH_EXCEEDED','BLOCKED');
  rows.push({deviceId:p.deviceId,railIndex:p.railIndex,startModule:p.startModule,
   articleId:p.article||null,maker:d?.maker??null,series:d?.series??null,articleSku:d?.sku??null,
   sourceType,sourceReviewedAt:review,sourceUrl:evidenceSource,
   bodyWidthMm:width,bodyHeightMm:height,bodyDepthMm:depth,
   nominalSlotWidthMm:slotWidth,nominalStartXMm:startX,nominalEndXMm:nominalEndX,
   remainingZoneWidthMm,actualBodyEndXMm,remainingBodyZoneWidthMm,
   nominalRailBandHeightMm:zone?.heightMm??null,
   declaredUsableDepthMm:geometry?.geometry?.interior?.depthMm??null,
   actualTerminalCoordinates:null,actualDinMountingOffset:null,
   bodyDimensionsComplete:width!==null&&height!==null&&depth!==null,
   issues:codes,status:codes.some(c=>issues.some(i=>i.code===c&&i.level==='BLOCKED'&&i.deviceId===p.deviceId))?
    'BLOCKED':'REVIEW_REQUIRED'});
 }
 add('APPARATUS_EVIDENCE_DIN_OFFSETS_AND_TERMINALS_UNVERIFIED');
 return finish();
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetApparatusEvidenceV1};
