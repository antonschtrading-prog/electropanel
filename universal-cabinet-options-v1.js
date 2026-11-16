'use strict';
// Manufacturer-neutral preliminary enclosure planning. No cabinet SKU or certified fit is inferred.
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
  push(l,b?.id??l?.id,l?.catalogSku,b?.modules??l?.modules);
 }
 if(!entries.length)issues.push({code:'NO_DEVICES',level:'BLOCKED'});
 if(issues.some(x=>x.level==='BLOCKED'))return {...blocked('EQUIPMENT_INVALID'),issues};
 const profiles=[{id:'TALL',modulesPerRail:12},{id:'BALANCED',modulesPerRail:18},
  {id:'WIDE',modulesPerRail:24}];
 const options=profiles.map(profile=>{
  const rails=[],unplaced=[];
  // Stable original order, preserving each appliance as an indivisible group.
  for(const device of entries){
   if(device.modules>profile.modulesPerRail){unplaced.push(device.deviceId);continue;}
   let row=rails[rails.length-1];
   if(!row||row.usedModules+device.modules>profile.modulesPerRail){
    row={railIndex:rails.length,usedModules:0,devices:[]};rails.push(row);
   }
   row.devices.push({deviceId:device.deviceId,startModule:row.usedModules,
    modules:device.modules,article:device.article});
   row.usedModules+=device.modules;
  }
  const used=entries.reduce((s,x)=>s+x.modules,0);
  const target=Math.ceil(used*(1+p.reserveFraction));
  // Keep reserve in whole unused modular positions, including a new empty row.
  while(rails.length*profile.modulesPerRail<target&&rails.length<100)
   rails.push({railIndex:rails.length,usedModules:0,devices:[]});
  const allocated=rails.length*profile.modulesPerRail;
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
   ...unplaced.map(deviceId=>({code:'DEVICE_EXCEEDS_RAIL_WIDTH',level:'BLOCKED',deviceId})),
   ...(rails.length>=100&&allocated<target?[{code:'RAIL_LIMIT_EXCEEDED',level:'BLOCKED'}]:[]),
   {code:'CABINET_MOUNTING_WIRING_AND_THERMAL_NOT_VERIFIED',level:'UNKNOWN'},
   ...(depthKnown?[]:[{code:'CABINET_DEPTH_UNKNOWN',level:'UNKNOWN'}])
  ];
  return {id:profile.id,modulesPerRail:profile.modulesPerRail,railCount:rails.length,
   rails,usedModules:used,allocatedModules:allocated,reserveModules:allocated-used,
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
if(typeof module!=='undefined'&&module.exports)module.exports={epUniversalCabinetOptionsV1};
