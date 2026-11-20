'use strict';
// Millimetre-level declared geometry; no assumption of 18mm per device.
function epDinGeometryCheck(devices,railWidthMm){
 const issues=[],placements=[];
 if(!Array.isArray(devices)||typeof railWidthMm!=='number'||!Number.isFinite(railWidthMm)||railWidthMm<=0)
  return {status:'BLOCKED',issues:[{code:'GEOMETRY_INPUT_INVALID'}],placements:[],verified:false};
 const seen=new Set();
 for(const d of devices){
  if(!d||typeof d.id!=='string'||!d.id||seen.has(d.id)){issues.push({code:'DEVICE_ID_INVALID'});continue;}
  seen.add(d.id);
  if(typeof d.xMm!=='number'||!Number.isFinite(d.xMm)||d.xMm<0||
    typeof d.widthMm!=='number'||!Number.isFinite(d.widthMm)||d.widthMm<=0){
    issues.push({code:'DEVICE_GEOMETRY_INVALID',id:d.id});continue;
  }
  const end=d.xMm+d.widthMm;
  if(end>railWidthMm+1e-9)issues.push({code:'RAIL_OVERFLOW',id:d.id});
  placements.push({id:d.id,startMm:d.xMm,endMm:end});
 }
 const sorted=[...placements].sort((a,b)=>a.startMm-b.startMm);
 for(let i=1;i<sorted.length;i++)if(sorted[i].startMm<sorted[i-1].endMm-1e-9)
  issues.push({code:'DEVICE_OVERLAP',id:sorted[i].id,otherId:sorted[i-1].id});
 issues.push({code:'MOUNTING_CLEARANCES_UNVERIFIED'});
 return {status:issues.some(i=>i.code!=='MOUNTING_CLEARANCES_UNVERIFIED')?'BLOCKED':'UNKNOWN',issues,placements,verified:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDinGeometryCheck};
