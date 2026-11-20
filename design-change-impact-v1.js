'use strict';
// Change-impact preview for design documents. Conservative dependencies, not an electrical calculation.
const MAP=Object.freeze({
 load:Object.freeze(['load','cable','device','topology','enclosure']),
 network:Object.freeze(['network','cable','device','topology']),
 cable:Object.freeze(['cable','device','topology','enclosure']),
 device:Object.freeze(['device','topology','enclosure']),
 topology:Object.freeze(['topology','enclosure']),
 enclosure:Object.freeze(['enclosure'])
});
function epDesignChangeImpactV1(before,after){
 const has=v=>v&&typeof v==='object'&&!Array.isArray(v);
 const stable=v=>JSON.stringify(v===undefined?null:v);
 if(!has(before)||!has(after))return {status:'BLOCKED',changed:['project'],affected:Object.keys(MAP),issues:[{code:'CHANGE_IMPACT_PROJECT_INVALID',level:'BLOCKED'}]};
 const lines=(project,keys)=>Array.isArray(project.lines)?project.lines.map(x=>Object.fromEntries(['id',...keys].map(k=>[k,x?.[k]??null]))).sort((a,b)=>String(a.id).localeCompare(String(b.id))):null;
 const areas={
  load:[lines(before,['power','powerKw','phase','source','loadCurrentCalculation','overloadInput']),lines(after,['power','powerKw','phase','source','loadCurrentCalculation','overloadInput']),before.loads,after.loads,
   before.workflowDesignInputsV1,after.workflowDesignInputsV1,
   before.consumerLoadsV1,after.consumerLoadsV1,
   before.consumerGroupMergeRulesV1,after.consumerGroupMergeRulesV1,
   before.consumerGroupSplitRulesV1,after.consumerGroupSplitRulesV1],
  network:[before.network,after.network,before.earthing,after.earthing,before.voltage,after.voltage,
   before.supplyNetworkV1,after.supplyNetworkV1,
   before.incomingMaximumStudiesV1,after.incomingMaximumStudiesV1,
   before.calculatedDeviceFaultBindingsV1,after.calculatedDeviceFaultBindingsV1,
   lines(before,['maximumFaultInput','faultRouteInput','faultInput']),lines(after,['maximumFaultInput','faultRouteInput','faultInput'])],
  cable:[lines(before,['cableReferenceInput','cableDesignInput','overloadCoordinationInput','shortCircuitThermalInput','letThroughInput','voltageDropDesignInput','faultRouteInput','route44Input','cableInput','lv43Input']),lines(after,['cableReferenceInput','cableDesignInput','overloadCoordinationInput','shortCircuitThermalInput','letThroughInput','voltageDropDesignInput','faultRouteInput','route44Input','cableInput','lv43Input']),before.cables,after.cables,before.conductorRoutes,after.conductorRoutes,
   before.cableRoutesV1,after.cableRoutesV1],
  device:[before.catalogArticles,after.catalogArticles,before.manufacturerEvidenceRecords,after.manufacturerEvidenceRecords,lines(before,['catalogSku','device','modules','templateId','articleReplacementReview']),lines(after,['catalogSku','device','modules','templateId','articleReplacementReview']),before.branchDevices,after.branchDevices,before.sharedDevices,after.sharedDevices,before.catalogueSelection,after.catalogueSelection,
   before.deviceFaultScenariosV1,after.deviceFaultScenariosV1,
   before.deviceCoordinationEvidenceV1,after.deviceCoordinationEvidenceV1,
   before.protectionEvidenceMatrixV1,after.protectionEvidenceMatrixV1],
  topology:[before.wiringModelV18,after.wiringModelV18,before.endpointBindingsV1,after.endpointBindingsV1,before.terminalLinks,after.terminalLinks,before.feedLinks,after.feedLinks,before.groupInputLinks,after.groupInputLinks,
   before.protectionLinks,after.protectionLinks,
   before.deviceSupplyV1,after.deviceSupplyV1,
   before.incomingTerminalBindingsV1,after.incomingTerminalBindingsV1,
   before.fireControlV1,after.fireControlV1,
   before.supplyDeviceGraphV1,after.supplyDeviceGraphV1,
   before.neutralSegregationV1,after.neutralSegregationV1],
  enclosure:[before.manualLayoutV1,after.manualLayoutV1,before.railCount,after.railCount,before.railCapacity,after.railCapacity,before.enclosure,after.enclosure,
   before.cabinetGeometryV1,after.cabinetGeometryV1,
   before.cabinetSizingPreferencesV1,after.cabinetSizingPreferencesV1,
   before.enclosureLayoutV1,after.enclosureLayoutV1]
 };
 const changed=[];
 for(const [key,parts] of Object.entries(areas)){
  for(let i=0;i<parts.length;i+=2)if(stable(parts[i])!==stable(parts[i+1])){changed.push(key);break;}
 }
 const affected=[...new Set(changed.flatMap(x=>MAP[x]))];
 return {status:affected.length?'REVIEW_REQUIRED':'UNCHANGED',changed,affected,
  issues:affected.map(x=>({code:'CHANGE_IMPACT_REVIEW_'+x.toUpperCase(),level:'UNKNOWN'})),
  engineeringApproved:false};
}
function epInvalidateDesignEvidenceV1(project,impact){
 if(!project||typeof project!=='object'||Array.isArray(project))return project;
 if(!impact||!Array.isArray(impact.affected)||!impact.affected.length)return project;
 const evidence=project.evidence;
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))return project;
 const next={...project,evidence:{...evidence}};
 for(const area of impact.affected){
  if(!Object.prototype.hasOwnProperty.call(evidence,area))continue;
  const item=evidence[area];
  if(!item||typeof item!=='object'||Array.isArray(item))continue;
  next.evidence[area]={...item,status:'unknown',stale:true};
 }
 return next;
}
if(typeof module!=='undefined'&&module.exports)module.exports={epDesignChangeImpactV1,epInvalidateDesignEvidenceV1,MAP};
