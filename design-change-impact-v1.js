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
  load:[lines(before,['power','powerKw','phase','source','loadCurrentCalculation','overloadInput']),lines(after,['power','powerKw','phase','source','loadCurrentCalculation','overloadInput']),before.loads,after.loads],
  network:[before.network,after.network,before.earthing,after.earthing,before.voltage,after.voltage],
  cable:[lines(before,['cableReferenceInput','cableDesignInput','voltageDropDesignInput','faultRouteInput']),lines(after,['cableReferenceInput','cableDesignInput','voltageDropDesignInput','faultRouteInput']),before.cables,after.cables,before.conductorRoutes,after.conductorRoutes],
  device:[before.catalogArticles,after.catalogArticles,lines(before,['catalogSku','device','modules','templateId']),lines(after,['catalogSku','device','modules','templateId']),before.branchDevices,after.branchDevices,before.sharedDevices,after.sharedDevices,before.catalogueSelection,after.catalogueSelection],
  topology:[before.wiringModelV18,after.wiringModelV18,before.endpointBindingsV1,after.endpointBindingsV1,before.terminalLinks,after.terminalLinks,before.feedLinks,after.feedLinks,before.groupInputLinks,after.groupInputLinks],
  enclosure:[before.manualLayoutV1,after.manualLayoutV1,before.railCount,after.railCount,before.railCapacity,after.railCapacity,before.enclosure,after.enclosure]
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
