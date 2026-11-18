'use strict';
const {findStagedDevices}=require('./staged-selector-v1.js');
const {makeBacklog}=require('./verification-backlog-v1.js');
function assessDinPlacement(criteria={},availableModules){
 if(!Number.isInteger(availableModules)||availableModules<=0)throw new RangeError('availableModules must be a positive integer');
 const discovery=findStagedDevices(criteria),review=new Map(makeBacklog().map(x=>[x.sku,x]));
 const candidates=discovery.matches.map(device=>{
  const missingModules=device.modules==null,modules=device.modules??null;
  const fits=missingModules?null:modules<=availableModules;
  return {...device,availableModules,fitStatus:missingModules?'UNKNOWN_GEOMETRY':fits?'GEOMETRICALLY_FITS':'EXCEEDS_AVAILABLE_MODULES',
   estimatedRemainingModules:fits?availableModules-modules:null,
   integrationStatus:'NOT_APPROVED_FOR_PLACEMENT',
   outstandingTasks:review.get(device.sku)?.tasks.length??0};
 });
 return {mode:'PRELIMINARY_DIN_FIT_ONLY',availableModules,total:candidates.length,candidates,
  approvedPlacements:0,engineeringApproved:false};
}
module.exports={assessDinPlacement};
