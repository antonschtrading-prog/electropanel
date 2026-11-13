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
 const areas={
  load:[before.lines,after.lines],
  network:[before.network,after.network],
  cable:[before.cables,after.cables],
  device:[before.branchDevices,after.branchDevices,before.sharedDevices,after.sharedDevices],
  topology:[before.wiringModelV18,after.wiringModelV18,before.endpointBindingsV1,after.endpointBindingsV1],
  enclosure:[before.railCount,after.railCount,before.railCapacity,after.railCapacity,before.enclosure,after.enclosure]
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
if(typeof module!=='undefined'&&module.exports)module.exports={epDesignChangeImpactV1,MAP};
