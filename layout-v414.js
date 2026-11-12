'use strict';
// Faithful, deterministic browser port of structural occupancy logic in
// electropanel/layout_capacity_v414.py from the recovered v4.14 archive.
// This is a structural comparison only. No Python API / server / LLM required.
// Digest and complete parsed terminal semantics are deliberately NOT invented.
function epLegacyLayoutCapacity(project) {
 if(!project||typeof project!=='object'||!project.panel||
   !Array.isArray(project.panel.rails)||!Array.isArray(project.panel.devices))
  throw Error('Неверная структура проекта Studio');
 const catalog=project.catalog&&typeof project.catalog==='object'?project.catalog:{};
 const rails=project.panel.rails,devices=project.panel.devices;
 const railMap=new Map(rails.map(x=>[x.id,x]));
 const occupied=new Map(rails.map(x=>[x.id,new Map()]));
 const problems=[];
 let total=0,usedTotal=0;
 for(const d of devices){
  const model=catalog[d.model_sku],rail=railMap.get(d.rail_id);
  if(!model||!rail||!Number.isInteger(model.modules)||model.modules<=0){
   problems.push({code:'UNKNOWN_PLACEMENT',device_id:d.id});continue;
  }
  const width=model.modules,start=d.start_module,capacity=rail.modules;
  if(!Number.isInteger(start)||start<0||start+width>capacity)
   problems.push({code:'OUT_OF_BOUNDS',device_id:d.id,rail_id:rail.id});
  // Unlike Python, JS Math.min can accept NaN: reject invalid start before loop.
  if(!Number.isInteger(start))continue;
  for(let slot=Math.max(0,start);slot<Math.min(capacity,start+width);slot++){
   const taken=occupied.get(rail.id);
   if(taken.has(slot))
    problems.push({code:'OVERLAP',device_id:d.id,other_device_id:taken.get(slot),rail_id:rail.id,module:slot+1});
   else taken.set(slot,d.id);
  }
 }
 const resultRails=[];
 for(const rail of rails){
  if(!Number.isInteger(rail.modules)||rail.modules<1||rail.modules>1000)
   throw Error('Некорректная ёмкость DIN-рейки');
  const taken=occupied.get(rail.id);
  const free=[];
  for(let i=0;i<rail.modules;i++)if(!taken.has(i))free.push(i+1);
  total+=rail.modules;
  usedTotal+=taken.size;
  resultRails.push({
   rail_id:rail.id,modules_total:rail.modules,modules_occupied:taken.size,
   modules_free:free.length,free_module_numbers:free,
   device_ids:devices.filter(d=>d.rail_id===rail.id).map(d=>d.id),
   utilization_percent:Math.round(10000*taken.size/rail.modules)/100
  });
 }
 return {
  schema_version:'4.14-WEB-STRUCTURAL',rails:resultRails,
  total_modules:total,occupied_modules:usedTotal,free_modules:total-usedTotal,
  problems,layout_screen_status:problems.length?'FAIL':'STRUCTURAL_ONLY',
  ready_for_installation:false,neutral_bus_verified:false,
  protective_bus_verified:false,assembly_space_verified:false,
  thermal_verification:false,project_sha256:null,
  evidence_status:'UNVERIFIED_NO_DIGEST',
  disclaimer:'DIN module capacity only; cable routing, N/PE bars, enclosure, heat, assembly standard and actual installation NOT verified'
 };
}
