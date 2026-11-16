'use strict';
// Declared device body dimensions versus nominal DIN slots, NOT cabinet approval.
function epDinPhysicalEnvelopeV1(plan,lookupSku){
 const rows=[],issues=[],add=(code,deviceId,level)=>issues.push({code,deviceId,level});
 if(!plan||!Array.isArray(plan.placements)||!Number.isInteger(plan.capacityPerRail)||
   plan.capacityPerRail<=0||!Number.isInteger(plan.rails)||plan.rails<=0)
  return {status:'BLOCKED',rows,issues:[{code:'DIN_ENVELOPE_INPUT_INVALID',level:'BLOCKED'}],
   checkedWidths:0,missingWidths:0,engineeringApproved:false};
 const pitch=18;
 for(const p of plan.placements){
  const id=p?.deviceId;
  if(!p||typeof id!=='string'||!id||!Number.isInteger(p.modules)||p.modules<1||
    !Number.isInteger(p.startModule)||p.startModule<0||
    !Number.isInteger(p.railIndex)||p.railIndex<0||p.railIndex>=plan.rails){
   add('DIN_ENVELOPE_PLACEMENT_INVALID',id||null,'BLOCKED');continue;
  }
  const startMm=p.startModule*pitch,slotWidthMm=p.modules*pitch;
  if(startMm+slotWidthMm>plan.capacityPerRail*pitch+1e-6)
   add('DIN_ENVELOPE_SLOT_OVERFLOW',id,'BLOCKED');
  let d=null;
  try{d=p.article&&typeof lookupSku==='function'?lookupSku(p.article):null;}catch(_){}
  const width=d&&Number.isFinite(d.widthMm)&&d.widthMm>0?d.widthMm:null;
  const height=d&&Number.isFinite(d.heightMm)&&d.heightMm>0?d.heightMm:null;
  const depth=d&&Number.isFinite(d.depthMm)&&d.depthMm>0?d.depthMm:null;
  const local=[],report=(code,level)=>{local.push(code);add(code,id,level);};
  if(p.article&&!d)report('DIN_ENVELOPE_ARTICLE_UNKNOWN','BLOCKED');
  if(d&&d.modules!==p.modules)report('DIN_ENVELOPE_MODULE_MISMATCH','BLOCKED');
  if(d&&d.widthMm!=null&&!width)report('DIN_ENVELOPE_WIDTH_INVALID','BLOCKED');
  if(d&&d.heightMm!=null&&!height)report('DIN_ENVELOPE_HEIGHT_INVALID','BLOCKED');
  if(d&&d.depthMm!=null&&!depth)report('DIN_ENVELOPE_DEPTH_INVALID','BLOCKED');
  if(width===null)report('DIN_ENVELOPE_WIDTH_UNKNOWN','UNKNOWN');
  else if(width>slotWidthMm+1e-6)report('DIN_ENVELOPE_BODY_OVERFLOW','BLOCKED');
  if(height===null)report('DIN_ENVELOPE_HEIGHT_UNKNOWN','UNKNOWN');
  if(depth===null)report('DIN_ENVELOPE_DEPTH_UNKNOWN','UNKNOWN');
  rows.push({deviceId:id,railIndex:p.railIndex,startMm,slotWidthMm,
   bodyWidthMm:width,bodyHeightMm:height,bodyDepthMm:depth,
   nominalFreeWidthMm:width===null?null:Math.max(0,slotWidthMm-width),
   issues:local,status:issues.some(x=>x.deviceId===id&&x.level==='BLOCKED')?'BLOCKED':'UNKNOWN'});
 }
 for(let rail=0;rail<plan.rails;rail++){
  const sorted=rows.filter(r=>r.railIndex===rail).sort((a,b)=>a.startMm-b.startMm);
  for(let i=1;i<sorted.length;i++){
   const left=sorted[i-1],right=sorted[i];
   if(left.bodyWidthMm!==null&&left.startMm+left.bodyWidthMm>right.startMm+1e-6)
    add('DIN_ENVELOPE_BODY_OVERLAP',right.deviceId,'BLOCKED');
  }
 }
 add('DIN_ENCLOSURE_CLEARANCES_NOT_CHECKED',null,'UNKNOWN');
 return {status:issues.some(x=>x.level==='BLOCKED')?'BLOCKED':'UNKNOWN',rows,issues,
  modulePitchMm:pitch,checkedWidths:rows.filter(x=>x.bodyWidthMm!==null).length,
  missingWidths:rows.filter(x=>x.bodyWidthMm===null).length,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDinPhysicalEnvelopeV1};
