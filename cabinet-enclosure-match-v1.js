'use strict';
// Compare explicitly supplied enclosure usable dimensions against a DIN proposal.
// Unknown manufacturer data never becomes an assumed confirmed fit.
function epCabinetEnclosureMatchV1(preview,geometry,enclosures,settings={}){
 const fail=code=>({schema:'electropanel.cabinet.enclosure.match.1',status:'BLOCKED',code,
  rows:[],recommendedId:null,engineeringApproved:false,confirmedFit:false});
 if(!preview||preview.status!=='REVIEW_REQUIRED'||!geometry||
  !['UNKNOWN','REVIEW_REQUIRED'].includes(geometry.status)||
  !Array.isArray(geometry.rows)||!Array.isArray(preview.rails)||
  !Array.isArray(enclosures)||enclosures.length>100||
  !settings||typeof settings!=='object'||Array.isArray(settings)||
  Object.keys(settings).some(k=>!['sideAllowanceMm','verticalAllowanceMm','depthAllowanceMm','railPitchMm'].includes(k)))
  return fail('ENCLOSURE_MATCH_INPUT_INVALID');
 const cfg={sideAllowanceMm:40,verticalAllowanceMm:70,depthAllowanceMm:35,railPitchMm:150,...settings};
 if(Object.values(cfg).some(x=>typeof x!=='number'||!Number.isFinite(x)||x<0||x>1000)||
  cfg.railPitchMm<50)return fail('ENCLOSURE_MATCH_SETTINGS_INVALID');
 const ids=new Set(),rows=[];
 const railCount=preview.rails.length;
 if(!railCount||railCount>100||geometry.rows.length!==preview.rows.length||
  preview.rails.some(r=>!Number.isInteger(r.capacity)||r.capacity<1||r.capacity>200))
  return fail('ENCLOSURE_MATCH_PREVIEW_INVALID');
 const pitch=geometry.summary?.assumedModulePitchMm;
 if(!Number.isFinite(pitch)||pitch<15||pitch>25)return fail('ENCLOSURE_MATCH_GEOMETRY_INVALID');
 const requiredWidth=Math.max(...preview.rails.map(r=>r.capacity*pitch))+cfg.sideAllowanceMm*2;
 const requiredHeight=railCount*cfg.railPitchMm+cfg.verticalAllowanceMm*2;
 const maxDepth=geometry.summary.maxKnownDepthMm;
 const requiredDepth=maxDepth===null?null:maxDepth+cfg.depthAllowanceMm;
 for(const item of enclosures){
  if(!item||typeof item.id!=='string'||!item.id.trim()||item.id.length>80||ids.has(item.id))
   return fail('ENCLOSURE_MATCH_ID_INVALID');
  ids.add(item.id);
  const interior=item.usableInterior;
  if(interior!==null&&interior!==undefined&&
   (typeof interior!=='object'||Array.isArray(interior)||Object.keys(interior).some(k=>!['widthMm','heightMm','depthMm'].includes(k))))
   return fail('ENCLOSURE_MATCH_DIMENSIONS_INVALID');
  const values=['widthMm','heightMm','depthMm'].map(k=>interior?.[k]??null);
  if(values.some(v=>v!==null&&(typeof v!=='number'||!Number.isFinite(v)||v<=0||v>5000)))
   return fail('ENCLOSURE_MATCH_DIMENSIONS_INVALID');
  const [w,h,d]=values;
  const railCapacity=item.railCapacity??null;
  if(railCapacity!==null&&(!Number.isInteger(railCapacity)||railCapacity<1||railCapacity>100))
   return fail('ENCLOSURE_MATCH_RAIL_CAPACITY_INVALID');
  const checks=[
   {dimension:'width',requiredMm:requiredWidth,availableMm:w},
   {dimension:'height',requiredMm:requiredHeight,availableMm:h},
   {dimension:'depth',requiredMm:requiredDepth,availableMm:d}
  ];
  const railCheck=railCapacity===null?'UNKNOWN':railCapacity<railCount?'FAIL':'PASS';
  for(const c of checks)c.result=c.requiredMm===null||c.availableMm===null?'UNKNOWN':
   c.availableMm+1e-6<c.requiredMm?'FAIL':'PASS';
  const rejected=railCheck==='FAIL'||checks.some(c=>c.result==='FAIL');
  const complete=railCheck==='PASS'&&checks.every(c=>c.result==='PASS')&&
   geometry.summary.missingDimensions===0;
  const unknown=railCheck==='UNKNOWN'||checks.some(c=>c.result==='UNKNOWN')||
   geometry.summary.missingDimensions>0;
  const state=rejected?'REJECTED':complete?'PRELIMINARY_MATCH':'UNVERIFIED';
  const extra=checks.every(c=>c.result==='PASS')?
   (w-requiredWidth)*(h-requiredHeight):null;
  rows.push({id:item.id,manufacturer:item.manufacturer??null,article:item.article??null,
   status:state,checks,railCheck,railCapacity,requiredRailCount:railCount,
   missingApparatusDimensions:geometry.summary.missingDimensions,
   excessAreaMm2:extra,engineeringApproved:false,confirmedFit:false});
 }
 rows.sort((a,b)=>({PRELIMINARY_MATCH:0,UNVERIFIED:1,REJECTED:2}[a.status]-
  {PRELIMINARY_MATCH:0,UNVERIFIED:1,REJECTED:2}[b.status])||
  (a.excessAreaMm2??Infinity)-(b.excessAreaMm2??Infinity)||a.id.localeCompare(b.id));
 const best=rows.find(r=>r.status==='PRELIMINARY_MATCH');
 return {schema:'electropanel.cabinet.enclosure.match.1',
  status:best?'REVIEW_REQUIRED':'UNKNOWN',
  code:best?'ENCLOSURE_PRELIMINARY_MATCH':'ENCLOSURE_FIT_UNVERIFIED',
  required:{widthMm:requiredWidth,heightMm:requiredHeight,depthMm:requiredDepth,
   railCount,assumptions:cfg},
  rows,recommendedId:best?.id??null,engineeringApproved:false,confirmedFit:false,
  note:'Usable interior dimensions and rail capacity must come from explicit data. Even a preliminary match does not verify mounting, wiring, heat or product compatibility.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetEnclosureMatchV1};
