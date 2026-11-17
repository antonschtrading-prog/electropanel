'use strict';
// Manufacturer-neutral preliminary enclosure planning. No cabinet SKU or certified fit is inferred.
// Bounded exact packing fallback. FFD is fast, but can falsely reject a feasible
// set of indivisible apparatuses. Memoized DFS is complete unless budget expires.
function epCabinetPackDevicesV1(entries,railCount,capacity,nodeLimit=60000){
 const sorted=[...entries].sort((a,b)=>b.modules-a.modules||a.deviceId.localeCompare(b.deviceId));
 const rails=Array.from({length:railCount},(_,railIndex)=>({railIndex,usedModules:0,devices:[]}));
 const add=(row,d)=>{row.devices.push({deviceId:d.deviceId,startModule:row.usedModules,
  modules:d.modules,article:d.article});row.usedModules+=d.modules;};
 const greedyMissing=[];
 for(const d of sorted){
  const row=rails.find(r=>r.usedModules+d.modules<=capacity);
  if(row)add(row,d);else greedyMissing.push(d.deviceId);
 }
 if(!greedyMissing.length)return {status:'PACKED',rails,unplaced:[]};
 if(sorted.some(d=>d.modules>capacity)||sorted.reduce((s,d)=>s+d.modules,0)>railCount*capacity)
  return {status:'IMPOSSIBLE',rails,unplaced:greedyMissing};
 const free=Array(railCount).fill(capacity),assigned=Array(sorted.length).fill(-1),
  seen=new Set(),suffix=Array(sorted.length+1).fill(0);
 for(let i=sorted.length-1;i>=0;i--)suffix[i]=suffix[i+1]+sorted[i].modules;
 let nodes=0,exhausted=false;
 function visit(i){
  if(i===sorted.length)return true;
  if(++nodes>nodeLimit){exhausted=true;return false;}
  if(free.reduce((a,b)=>a+b,0)<suffix[i])return false;
  const key=i+'|'+[...free].sort((a,b)=>b-a).join(',');
  if(seen.has(key))return false;
  const width=sorted[i].modules,tried=new Set();
  for(let r=0;r<free.length;r++){
   if(free[r]<width||tried.has(free[r]))continue;
   tried.add(free[r]);free[r]-=width;assigned[i]=r;
   if(visit(i+1))return true;
   free[r]+=width;assigned[i]=-1;
   if(exhausted)return false;
  }
  seen.add(key);return false;
 }
 if(!visit(0))return {status:exhausted?'UNPROVEN':'IMPOSSIBLE',rails,unplaced:greedyMissing};
 const resolved=Array.from({length:railCount},(_,railIndex)=>({railIndex,usedModules:0,devices:[]}));
 sorted.forEach((d,i)=>add(resolved[assigned[i]],d));
 return {status:'PACKED_EXACT',rails:resolved,unplaced:[]};
}
function epUniversalCabinetOptionsV1(project, lookupSku, settings = {}) {
 const blocked=(code)=>({schema:'electropanel.universal.cabinet.options.1',status:'BLOCKED',
  issues:[{code,level:'BLOCKED'}],options:[],engineeringApproved:false,confirmedCabinetFit:false});
 if(!project||!Array.isArray(project.lines)||project.lines.length>500||
    !Array.isArray(project.sharedDevices??[])||(project.sharedDevices??[]).length>500||
    !settings||typeof settings!=='object'||Array.isArray(settings))return blocked('INPUT_INVALID');
 const defaults={reserveFraction:0.2,sideAllowanceMm:70,topBottomAllowanceMm:100,
  rowPitchMm:150,depthAllowanceMm:60};
 const p={...defaults,...settings};
 if(Object.keys(settings).some(k=>!Object.hasOwn(defaults,k))||
    !Number.isFinite(p.reserveFraction)||p.reserveFraction<0||p.reserveFraction>1||
    ![p.sideAllowanceMm,p.topBottomAllowanceMm,p.rowPitchMm,p.depthAllowanceMm].every(x=>
      typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=1000)||
    p.rowPitchMm<50)return blocked('SETTINGS_INVALID');
 const entries=[],issues=[],seen=new Set();
 const branches=Array.isArray(project.branchDevices)?project.branchDevices:null;
 const push=(d,id,sku,declared)=>{
  if(typeof id!=='string'||!id.trim()||seen.has(id)){
   issues.push({code:'DEVICE_ID_INVALID_OR_DUPLICATE',level:'BLOCKED',deviceId:id});return;}
  seen.add(id);
  let modules=declared,bodyDepthMm=null;
  if(sku){
   let a=null;try{a=typeof lookupSku==='function'?lookupSku(sku):null;}catch(_){}
   if(!a||!Number.isInteger(a.modules)||a.modules<1||a.article&&a.article!==sku){
    issues.push({code:'ARTICLE_WIDTH_UNVERIFIED',level:'BLOCKED',deviceId:id});return;}
   if(modules!==a.modules)issues.push({code:'MODULE_WIDTH_MISMATCH',level:'BLOCKED',deviceId:id});
   modules=a.modules;
   const depth=a.geometry?.depthMm??a.depthMm;
   if(typeof depth==='number'&&Number.isFinite(depth)&&depth>0)bodyDepthMm=depth;
  }else issues.push({code:'ARTICLE_NOT_SELECTED',level:'UNKNOWN',deviceId:id});
  if(!Number.isInteger(modules)||modules<1||modules>200){
   issues.push({code:'DEVICE_MODULES_INVALID',level:'BLOCKED',deviceId:id});return;}
  entries.push({deviceId:id,modules,article:sku||null,bodyDepthMm});
 };
 for(const d of project.sharedDevices||[])push(d,d?.id,d?.catalogSku,d?.modules);
 for(const l of project.lines){
  const matching=branches?.filter(b=>b?.circuitId===l?.id);
  if(branches&&matching?.length!==1){
   issues.push({code:'BRANCH_BINDING_INVALID',level:'BLOCKED',deviceId:l?.id});continue;}
  const b=matching?.[0];
  if(b&&b.modules!==l.modules)issues.push({code:'BRANCH_MODULES_CONFLICT',level:'BLOCKED',deviceId:b.id});
  push(l,b?.id??l?.id,b?.catalogSku||l?.catalogSku,b?.modules??l?.modules);
 }
 if(!entries.length)issues.push({code:'NO_DEVICES',level:'BLOCKED'});
 if(issues.some(x=>x.level==='BLOCKED'))return {...blocked('EQUIPMENT_INVALID'),issues};
 // Catalogue-neutral market-pattern capacity shapes: illustrative availability,
 // not a guarantee that a model exists from a particular enclosure maker.
 const shapes=[
  [1,4],[1,6],[1,8],[1,9],[1,12],[1,15],[1,18],[1,24],
  [2,9],[2,12],[2,15],[2,18],[2,24],
  [3,12],[3,18],[3,24],[4,12],[4,18],[4,24],
  [5,12],[5,18],[5,24],[6,12],[6,18],[6,24],[8,18],[8,24]
 ];
 const targetModules=Math.ceil(entries.reduce((n,x)=>n+x.modules,0)*(1+p.reserveFraction));
 const profiles=shapes.map(([railCount,modulesPerRail])=>({
  id:railCount+'x'+modulesPerRail,railCount,modulesPerRail,capacityModules:railCount*modulesPerRail
 })).filter(x=>x.capacityModules>=targetModules)
  .sort((a,b)=>a.capacityModules-b.capacityModules||a.railCount-b.railCount);
 const options=profiles.map(profile=>{
  const packed=epCabinetPackDevicesV1(entries,profile.railCount,profile.modulesPerRail);
  const {rails,unplaced}=packed;
  const used=entries.reduce((s,x)=>s+x.modules,0);
  const target=Math.ceil(used*(1+p.reserveFraction));
  const allocated=profile.capacityModules;
  const depthKnown=entries.every(x=>x.bodyDepthMm!==null);
  const maxDepth=depthKnown?Math.max(...entries.map(x=>x.bodyDepthMm)):null;
  const envelope={
   nominalDinSpanMm:profile.modulesPerRail*18,
   preliminaryUsableWidthMm:profile.modulesPerRail*18+2*p.sideAllowanceMm,
   preliminaryUsableHeightMm:rails.length*p.rowPitchMm+2*p.topBottomAllowanceMm,
   preliminaryUsableDepthMm:maxDepth===null?null:maxDepth+p.depthAllowanceMm,
   basis:'ASSUMED_PLANNING_ALLOWANCES_NOT_MANUFACTURER_DIMENSIONS'
  };
  const optionIssues=[
   ...unplaced.map(deviceId=>({code:packed.status==='UNPROVEN'?'PACKING_NOT_VERIFIED':'DEVICE_NOT_PACKABLE_IN_PATTERN',level:'BLOCKED',deviceId})),
   ...(packed.status==='UNPROVEN'?[{code:'PACKING_SEARCH_LIMIT',level:'UNKNOWN'}]:[]),
   ...(allocated<target?[{code:'CAPACITY_RESERVE_UNMET',level:'BLOCKED'}]:[]),
   {code:'CABINET_MOUNTING_WIRING_AND_THERMAL_NOT_VERIFIED',level:'UNKNOWN'},
   ...(depthKnown?[]:[{code:'CABINET_DEPTH_UNKNOWN',level:'UNKNOWN'}])
  ];
  return {id:profile.id,capacityModules:profile.capacityModules,modulesPerRail:profile.modulesPerRail,railCount:rails.length,
   rails,packingMethod:packed.status,usedModules:used,allocatedModules:allocated,reserveModules:allocated-used,
   unplaced,envelope,issues:optionIssues,
   status:optionIssues.some(x=>x.level==='BLOCKED')?'BLOCKED':'REVIEW_REQUIRED',
   engineeringApproved:false,confirmedCabinetFit:false};
 });
 return {schema:'electropanel.universal.cabinet.options.1',
  status:options.some(x=>x.status!=='BLOCKED')?'REVIEW_REQUIRED':'BLOCKED',
  equipmentCount:entries.length,equipmentModules:entries.reduce((s,x)=>s+x.modules,0),
  options,issues,engineeringApproved:false,confirmedCabinetFit:false,
  note:'Draft nominal DIN packing only. Preliminary usable interior envelope assumes user-adjustable allowances; external cabinet dimensions, thermal and wiring fit require separate review.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epUniversalCabinetOptionsV1,epCabinetPackDevicesV1};
