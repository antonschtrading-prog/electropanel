'use strict';
// Read-only compatibility inspection of the historical Python-backed Studio format.
// The historic panel.devices are not necessarily Web "lines"/"loads". Never
// manufacture protection, conductor connections, or approvals during conversion.
function epInspectLegacyPanel(value) {
 if(!value||typeof value!=='object'||!value.panel||typeof value.panel!=='object')
  return {recognized:false,status:'NOT_LEGACY',issues:[]};
 const panel=value.panel;
 if(!Array.isArray(panel.devices)||!Array.isArray(panel.rails))
  return {recognized:false,status:'UNSUPPORTED',issues:['Отсутствуют panel.devices или panel.rails']};
 const issues=[],ids=new Set(),rails=new Map();
 for(const r of panel.rails){
  if(!r||typeof r.id!=='string'||!Number.isInteger(r.modules)||r.modules<1||r.modules>256){
   issues.push('Некорректное описание DIN-рейки');continue;
  }
  if(rails.has(r.id))issues.push('Повтор DIN-рейки: '+r.id);
  rails.set(r.id,r.modules);
 }
 for(const d of panel.devices){
  if(!d||typeof d.id!=='string'||!d.id.trim()){issues.push('Аппарат без устойчивого ID');continue;}
  if(ids.has(d.id))issues.push('Повтор ID аппарата: '+d.id);
  ids.add(d.id);
  if(typeof d.model_sku!=='string'||!d.model_sku.trim())issues.push('Нет артикула для '+d.id);
  if(typeof d.rail_id!=='string'||!rails.has(d.rail_id))issues.push('Неизвестная рейка у '+d.id);
  if(!Number.isInteger(d.start_module)||d.start_module<0)issues.push('Недопустимая позиция '+d.id);
 }
 // Legacy Studio catalog has per-SKU module width. Reuse its declared
 // dimensions to find visible DIN collisions; never infer widths from names.
 const catalog=value.catalog&&typeof value.catalog==='object'?value.catalog:{};
 const occupied=new Map();
 for(const d of panel.devices){
  if(!d||typeof d.rail_id!=='string'||!rails.has(d.rail_id)||!Number.isInteger(d.start_module)||d.start_module<0)continue;
  const width=catalog[d.model_sku]?.modules;
  if(!Number.isInteger(width)||width<1||width>256){
   issues.push('Неизвестная ширина модели '+String(d.model_sku||'?')+' для '+String(d.id||'?'));
   continue;
  }
  if(d.start_module+width>rails.get(d.rail_id))
   issues.push('Аппарат выходит за границы DIN-рейки: '+d.id);
  for(let i=d.start_module;i<Math.min(d.start_module+width,rails.get(d.rail_id));i++){
   const pos=d.rail_id+':'+i;
   if(occupied.has(pos))issues.push('Пересечение аппаратов '+occupied.get(pos)+' и '+d.id+' на '+pos);
   else occupied.set(pos,d.id);
  }
 }
 const wireIds=new Set();
 if(panel.wires!==undefined&&!Array.isArray(panel.wires))issues.push('Неверная структура panel.wires');
 if(Array.isArray(panel.wires))for(const w of panel.wires){
  if(!w||typeof w.source_device!=='string'||typeof w.target_device!=='string'){
   issues.push('Повреждённая запись проводника');continue;
  }
  if(!ids.has(w.source_device)||!ids.has(w.target_device))
   issues.push('Провод с неизвестным аппаратом: '+String(w.wire_id||'без ID'));
  if(w.wire_id&&wireIds.has(w.wire_id))issues.push('Повтор ID провода '+w.wire_id);
  if(w.wire_id)wireIds.add(w.wire_id);
 }
 return {
  recognized:true,status:issues.length?'REVIEW_REQUIRED':'READ_ONLY_COMPATIBLE',
  counts:{rails:panel.rails.length,devices:panel.devices.length,wires:Array.isArray(panel.wires)?panel.wires.length:0},
  issues,automaticMigrationSafe:false,engineeringApproved:false,
  reason:'Нельзя автоматически преобразовать физические аппараты старого Studio в цепи Web без сопоставления их назначения, нагрузок и контактов'
 };
}
