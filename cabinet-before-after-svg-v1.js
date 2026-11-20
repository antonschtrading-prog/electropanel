'use strict';
// Reuse the same SVG renderer for the existing and proposed nominal DIN layout.
function epCabinetBeforeAfterSvgV1(preview){
 if(!preview||preview.status!=='REVIEW_REQUIRED'||!Array.isArray(preview.rows)||
  !Array.isArray(preview.rails)||typeof epCabinetOptionDinSvgV1!=='function')
  return {status:'BLOCKED',before:'',after:'',code:'BEFORE_AFTER_INPUT_INVALID'};
 const oldCount=preview.summary?.oldRailCount,oldCapacity=preview.summary?.oldCapacity;
 if(!Number.isInteger(oldCount)||oldCount<1||oldCount>100||
  !Number.isInteger(oldCapacity)||oldCapacity<oldCount||oldCapacity%oldCount!==0)
  return {status:'BLOCKED',before:'',after:'',code:'BEFORE_AFTER_CAPACITY_INVALID'};
 const perRail=oldCapacity/oldCount;
 if(perRail<1||perRail>200)return {status:'BLOCKED',before:'',after:'',code:'BEFORE_AFTER_CAPACITY_INVALID'};
 const beforeRows=preview.rows.map(r=>({
  ...r,toRail:r.fromRail,toSlot:r.fromSlot,changed:false}));
 const beforeRails=Array.from({length:oldCount},(_,railIndex)=>({
  railIndex,capacity:perRail}));
 const before=epCabinetOptionDinSvgV1({status:'REVIEW_REQUIRED',rows:beforeRows,rails:beforeRails});
 const after=epCabinetOptionDinSvgV1(preview);
 if(!before||!after)return {status:'BLOCKED',before:'',after:'',code:'BEFORE_AFTER_RENDER_FAILED'};
 return {status:'REVIEW_REQUIRED',code:'BEFORE_AFTER_READY',before,after,
  engineeringApproved:false,ready_for_installation:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetBeforeAfterSvgV1};
