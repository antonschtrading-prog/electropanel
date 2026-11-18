'use strict';
// Non-mutating geometric planning alternatives, not an installation drawing.
const {capacityPreview}=require('./catalog-panel-capacity-v1.js');
function layoutOptions(project={},options={}){
 const base=capacityPreview(project,options);
 const choices=base.candidates.filter(c=>c.fitsKnownDemand);
 const orientations=['HORIZONTAL','VERTICAL','BALANCED'];
 const alternatives=choices.map(c=>{
  const railModules=base.railModules;
  const railCount=Math.ceil(c.capacity/railModules);
  const exactRailCapacity=railCount*railModules===c.capacity;
  const placed=base.railPreview.rails;
  const usedRails=placed.length;
  const physicalFit=base.railPreview.oversized.length===0&&usedRails<=railCount&&
   placed.every(r=>r.remaining>=0);
  const allKnown=base.unknownLines.length===0;
  return {capacity:c.capacity,railModules,railCount,exactRailCapacity,usedRails,
   unusedRails:Math.max(0,railCount-usedRails),remainingModules:c.remainingModules,
   remainingAfterReserve:c.remainingAfterReserve,
   feasible:exactRailCapacity&&physicalFit&&allKnown,
   reviewRequired:true,variants:orientations.map(orientation=>({
    orientation,railCount,railModules,capacity:c.capacity,
    rows:placed.map(rail=>({rail:rail.index,usedModules:rail.capacity-rail.remaining,
     remainingModules:rail.remaining,devices:rail.devices.map(d=>({lineId:d.lineId,catalogId:d.catalogId,sku:d.sku,modules:d.modules}))})),
    unplaced:base.railPreview.oversized.map(d=>({lineId:d.lineId,sku:d.sku,reason:'DEVICE_EXCEEDS_RAIL'})),
    geometryOnly:true,engineeringApproved:false
   }))};
 });
 return {mode:'PRELIMINARY_LAYOUT_OPTIONS_ONLY',engineeringApproved:false,projectMutationAllowed:false,
  notInstallationDrawing:true,knownModules:base.knownModules,requiredModules:base.requiredModules,
  suggestedCapacity:base.suggestedCapacity,unresolved:base.unknownLines,
  alternatives,feasibleCount:alternatives.filter(x=>x.feasible).length,
  warnings:[...base.warnings,...(!alternatives.length?['NO_CAPACITY_OPTIONS']:[])]};
}
module.exports={layoutOptions};
