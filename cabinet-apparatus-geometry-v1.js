'use strict';
// Catalogue-grounded advisory geometry. A module pitch is not a manufacturer drawing.
function epCabinetApparatusGeometryV1(project,preview,lookup,settings={}){
 const blocked=(code,issues=[])=>({schema:'electropanel.cabinet.apparatus.geometry.1',
  status:'BLOCKED',code,issues,rows:[],summary:null,engineeringApproved:false,confirmedFit:false});
 if(!project||!preview||preview.status!=='REVIEW_REQUIRED'||!Array.isArray(preview.rows)||
  !settings||typeof settings!=='object'||Array.isArray(settings)||
  Object.keys(settings).some(k=>!['modulePitchMm','mountingBandMm','depthLimitMm'].includes(k)))
  return blocked('GEOMETRY_INPUT_INVALID');
 const pitch=settings.modulePitchMm??18,band=settings.mountingBandMm??null,depth=settings.depthLimitMm??null;
 if(!Number.isFinite(pitch)||pitch<15||pitch>25||
  [band,depth].some(x=>x!==null&&(!Number.isFinite(x)||x<=0||x>2000)))
  return blocked('GEOMETRY_SETTINGS_INVALID');
 const issues=[],rows=[],seen=new Set();
 for(const p of preview.rows){
  if(!p||typeof p.deviceId!=='string'||seen.has(p.deviceId)||
   !Number.isInteger(p.modules)||p.modules<1||!Number.isInteger(p.toRail)||
   !Number.isInteger(p.toSlot))return blocked('GEOMETRY_POSITION_INVALID');
  seen.add(p.deviceId);
  let catalog=null;
  if(p.article){
   try{catalog=typeof lookup==='function'?lookup(p.article):null}
   catch(_){issues.push({deviceId:p.deviceId,code:'GEOMETRY_LOOKUP_FAILED',level:'UNKNOWN'});}
  }
  if(catalog&&(!Number.isInteger(catalog.modules)||catalog.modules!==p.modules||
   catalog.article&&catalog.article!==p.article))
   return blocked('GEOMETRY_CATALOG_IDENTITY_CONFLICT',[{deviceId:p.deviceId,code:'GEOMETRY_CATALOG_IDENTITY_CONFLICT',level:'BLOCKED'}]);
  const raw=k=>catalog?.geometry?.[k]??catalog?.[k]??null;
  const width=raw('widthMm'),height=raw('heightMm'),bodyDepth=raw('depthMm');
  for(const [key,value] of [['widthMm',width],['heightMm',height],['depthMm',bodyDepth]]){
   if(value!==null&&(!Number.isFinite(value)||value<=0||value>2000))
    return blocked('GEOMETRY_CATALOG_DIMENSION_INVALID',[{deviceId:p.deviceId,dimension:key,level:'BLOCKED'}]);
  }
  const nominalWidth=p.modules*pitch;
  if(width!==null&&width>nominalWidth+1e-6)
   issues.push({deviceId:p.deviceId,code:'GEOMETRY_WIDTH_EXCEEDS_MODULE_SPAN',level:'BLOCKED'});
  if(height!==null&&band!==null&&height>band)
   issues.push({deviceId:p.deviceId,code:'GEOMETRY_HEIGHT_EXCEEDS_ASSUMED_BAND',level:'BLOCKED'});
  if(bodyDepth!==null&&depth!==null&&bodyDepth>depth)
   issues.push({deviceId:p.deviceId,code:'GEOMETRY_DEPTH_EXCEEDS_ASSUMED_LIMIT',level:'BLOCKED'});
  const unknown=['widthMm','heightMm','depthMm'].filter((k,i)=>[width,height,bodyDepth][i]===null);
  if(unknown.length)issues.push({deviceId:p.deviceId,code:'GEOMETRY_DIMENSIONS_UNKNOWN',dimensions:unknown,level:'UNKNOWN'});
  rows.push({deviceId:p.deviceId,article:p.article??null,railIndex:p.toRail,startModule:p.toSlot,
   modules:p.modules,nominalWidthMm:nominalWidth,widthMm:width,heightMm:height,depthMm:bodyDepth,
   widthBasis:width===null?'NOMINAL_MODULE_PITCH':'CATALOG',
   dimensionsKnown:unknown.length===0});
 }
 const railWidths=preview.rails.map(rail=>({railIndex:rail.railIndex,
  nominalSpanMm:rail.capacity*pitch,usedNominalSpanMm:rows.filter(x=>x.railIndex===rail.railIndex)
   .reduce((sum,x)=>sum+x.nominalWidthMm,0)}));
 const summary={devices:rows.length,knownDimensions:rows.filter(x=>x.dimensionsKnown).length,
  missingDimensions:rows.filter(x=>!x.dimensionsKnown).length,
  maxKnownDepthMm:rows.reduce((n,x)=>Math.max(n,x.depthMm??0),0)||null,
  maxKnownHeightMm:rows.reduce((n,x)=>Math.max(n,x.heightMm??0),0)||null,
  railWidths,assumedModulePitchMm:pitch};
 return {schema:'electropanel.cabinet.apparatus.geometry.1',
  status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':issues.length?'UNKNOWN':'REVIEW_REQUIRED',
  code:issues.some(x=>x.level==='BLOCKED')?'GEOMETRY_ASSUMED_ENVELOPE_CONFLICT':
   issues.length?'GEOMETRY_INCOMPLETE':'GEOMETRY_CATALOG_DIMENSIONS_RECORDED',
  rows,summary,issues,engineeringApproved:false,confirmedFit:false,
  note:'Only catalogue dimensions, when provided. Nominal DIN pitch is an assumption; enclosure fit, wiring and thermal clearances are unverified.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetApparatusGeometryV1};
