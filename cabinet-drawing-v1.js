'use strict';
// Scaled SVG of DECLARED usable interior/installation zones. Never a factory drawing.
function epCabinetDrawingSvgV1(project,lookup){
 const fail=(status,issues)=>({schema:'electropanel.cabinet.drawing.1',status,svg:null,
  issues,engineeringApproved:false,ready_for_installation:false,manufacturerDrawing:false});
 if(typeof epCabinetFitAuditV1!=='function')
  return fail('BLOCKED',[{code:'CABINET_FIT_ENGINE_MISSING',level:'BLOCKED'}]);
 let audit;
 try{audit=epCabinetFitAuditV1(project,lookup);}
 catch(_){return fail('BLOCKED',[{code:'CABINET_FIT_DRAWING_FAILED',level:'BLOCKED'}]);}
 if(!audit.geometry)return fail(audit.status,audit.issues);
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const n=v=>Number(v).toFixed(2).replace(/\.00$/,'');
 const width=audit.geometry.interior.widthMm,height=audit.geometry.interior.heightMm;
 const font=Math.max(4,Math.min(16,width/30,height/18));
 const stroke=Math.max(.5,Math.min(3,width/250));
 const blocked=audit.status==='BLOCKED';
 const zones=audit.geometry.zones.map(z=>
  '<g class="ep-cabinet-zone-drawing" data-rail="'+z.railIndex+'">'+
  '<rect x="'+n(z.xMm)+'" y="'+n(z.yMm)+'" width="'+n(z.widthMm)+'" height="'+n(z.heightMm)+'" fill="#dcebf2" stroke="#487f9b" stroke-dasharray="5 3" stroke-width="'+n(stroke)+'"/>'+
  '<text x="'+n(z.xMm+font*.55)+'" y="'+n(z.yMm+font*1.3)+'" font-size="'+n(font)+'" fill="#173f57">DIN '+(z.railIndex+1)+'</text></g>').join('');
 const obstacles=(audit.geometry.obstacles||[]).map(o=>
  '<g class="ep-cabinet-reserved-drawing" data-obstacle="'+safe(o.id)+'" data-kind="'+safe(o.kind)+'">'+
  '<rect x="'+n(o.xMm)+'" y="'+n(o.yMm)+'" width="'+n(o.widthMm)+'" height="'+n(o.heightMm)+'" '+
  'fill="#eddfb5" stroke="#98733f" stroke-dasharray="4 2" stroke-width="'+n(stroke)+'"/>'+
  '<title>'+safe(o.id)+' · '+safe(o.kind)+' · user-declared reserved zone</title></g>').join('');
 const devices=audit.rows.map(r=>{
  const unknown=r.bodyWidthMm==null||r.bodyHeightMm==null;
  const bodyW=r.bodyWidthMm??r.nominalSlotWidthMm;
  const bodyH=r.bodyHeightMm??r.allocatedHeightMm;
  return '<g class="ep-cabinet-apparatus" data-device-id="'+safe(r.deviceId)+'" data-dimensions="'+
   (unknown?'UNKNOWN':'DECLARED')+'">'+
   '<rect x="'+n(r.xMm)+'" y="'+n(r.yMm)+'" width="'+n(bodyW)+'" height="'+n(bodyH)+'" '+
    'fill="'+(r.status==='BLOCKED'?'#e8a69c':unknown?'#eff3f5':'#8cc6d5')+'" stroke="'+
    (r.status==='BLOCKED'?'#ae3025':'#2d677c')+'" stroke-width="'+n(stroke/2)+'"'+
    (unknown?' stroke-dasharray="3 2"':'')+'/>'+
   '<title>'+safe(r.deviceId)+(unknown?' · размеры корпуса не объявлены':' · габариты каталога')+'</title>'+
   '</g>';
 }).join('');
 const warn='ЭСКИЗ · НЕ ПРОИЗВОДСТВЕННЫЙ ЧЕРТЁЖ · монтаж не подтверждён';
 const textSize=Math.max(2,Math.min(14,width/36,width/(warn.length*0.62)));
 const caption='<text x="'+n(Math.max(2,width-5))+'" y="'+n(height-Math.max(2,textSize))+
  '" font-size="'+n(textSize)+'" text-anchor="end" fill="#832c23">'+safe(warn)+'</text>';
 const title='Пропорциональная схема корпуса с пользовательскими внутренними размерами. '+width+'×'+height+' мм. '+(blocked?'Выявлены блокирующие замечания. ':'')+warn;
 const svg='<?xml version="1.0" encoding="UTF-8"?>\n'+
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+n(width)+' '+n(height)+'" width="'+n(width)+'mm" height="'+n(height)+'mm" '+
  'role="img" aria-label="'+safe(title)+'" data-engineering-approved="false" data-factory-cad="false">'+
  '<title>'+safe(title)+'</title>'+
  '<rect x="0" y="0" width="'+n(width)+'" height="'+n(height)+'" fill="#f8fafb" stroke="#546b78" stroke-width="'+n(stroke*2)+'"/>'+
  zones+obstacles+devices+caption+'</svg>';
 return {schema:'electropanel.cabinet.drawing.1',status:audit.status,svg,
  declaredWidthMm:width,declaredHeightMm:height,
  issues:audit.issues,engineeringApproved:false,ready_for_installation:false,
  manufacturerDrawing:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetDrawingSvgV1};
