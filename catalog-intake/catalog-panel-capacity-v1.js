'use strict';
// Read-only preliminary DIN capacity analysis. This is not a physical layout or engineering approval.
const {catalogIntegration}=require('./catalog-project-integration-v1.js');
const DEFAULT_CAPACITIES=Object.freeze([12,18,24,36,48,54,72,96,120,144]);
function capacityPreview(project={},options={}){
 if(!options||typeof options!=='object'||Array.isArray(options))throw new TypeError('Invalid options');
 const reservePercent=options.reservePercent===undefined?20:options.reservePercent;
 if(!Number.isFinite(reservePercent)||reservePercent<0||reservePercent>100)throw new RangeError('reservePercent must be 0..100');
 const capacities=options.capacities===undefined?DEFAULT_CAPACITIES:options.capacities;
 if(!Array.isArray(capacities)||!capacities.length||capacities.some(x=>!Number.isInteger(x)||x<=0)||new Set(capacities).size!==capacities.length)throw new RangeError('capacities must be unique positive integers');
 const sizes=[...capacities].sort((a,b)=>a-b);
 const report=catalogIntegration(project);
 const known=report.records.filter(r=>r.catalogId&&Number.isInteger(r.modules)&&r.modules>0);
 const unknown=report.records.filter(r=>!r.catalogId||!Number.isInteger(r.modules)||r.modules<=0);
 const modules=known.reduce((sum,r)=>sum+r.modules,0);
 const reserveModules=Math.ceil(modules*reservePercent/100);
 const requiredModules=modules+reserveModules;
 const suggested=sizes.find(x=>x>=requiredModules)||null;
 const candidates=sizes.map(size=>({capacity:size,remainingModules:size-modules,remainingAfterReserve:size-requiredModules,
  fitsKnownDemand:size>=requiredModules,canConfirmFit:unknown.length===0&&size>=requiredModules}));
 const railModules=options.railModules===undefined?12:options.railModules;
 if(!Number.isInteger(railModules)||railModules<=0)throw new RangeError('railModules must be positive integer');
 const devices=known.map(r=>({lineId:r.lineId,catalogId:r.catalogId,sku:r.sku,modules:r.modules,warnings:r.warnings}));
 const oversized=devices.filter(d=>d.modules>railModules);
 const bins=[];for(const d of devices.filter(d=>d.modules<=railModules).sort((a,b)=>b.modules-a.modules||a.lineId.localeCompare(b.lineId))){
  let bin=bins.find(x=>x.remaining>=d.modules);
  if(!bin){bin={index:bins.length+1,capacity:railModules,remaining:railModules,devices:[]};bins.push(bin)}
  bin.devices.push(d);bin.remaining-=d.modules;
 }
 return {mode:'PRELIMINARY_PANEL_CAPACITY_ONLY',engineeringApproved:false,autoSelectionAllowed:false,projectMutationAllowed:false,
  reservePercent,railModules,knownLines:known.length,unknownLines:unknown.map(x=>({lineId:x.lineId,reason:x.warnings})),
  knownModules:modules,reserveModules,requiredModules,suggestedCapacity:suggested,
  capacityConfirmed:unknown.length===0&&oversized.length===0&&suggested!==null,
  candidates,railPreview:{railCount:bins.length,rails:bins,oversized,unknownCount:unknown.length},
  warnings:[...(unknown.length?['UNRESOLVED_EQUIPMENT']:[]),...(oversized.length?['DEVICE_EXCEEDS_RAIL']:[]),...(suggested===null?['NO_MATCHING_STANDARD_CAPACITY']:[]),...(report.totals.withWarnings?['CATALOG_REVIEW_WARNINGS']:[])],
  sourceIssues:report.issues};
}
module.exports={capacityPreview,DEFAULT_CAPACITIES};
