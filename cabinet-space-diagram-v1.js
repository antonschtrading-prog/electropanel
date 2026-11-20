'use strict';
// Read-only SVG of assumed *usable interior*, never a manufacturer enclosure drawing.
function epCabinetSpaceDiagramV1(option){
 if(!option||option.status==='BLOCKED')return '<p class="muted">Эскиз недоступен: компоновка не подтверждена.</p>';
 const e=option.envelope||{},s=e.spacePlan;
 const width=e.preliminaryUsableWidthMm,height=e.preliminaryUsableHeightMm;
 if(!s||!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0||
  !Array.isArray(s.rowZones)||s.rowZones.length!==option.railCount)
  return '<p class="muted">Недостаточно данных для предварительного эскиза.</p>';
 // All SVG coordinates are finite numbers derived from checked planning parameters.
 const N=x=>Number(x).toFixed(1);
 const cw=540,ch=340,left=32,top=28,scale=Math.min(470/width,270/height);
 const X=x=>N(left+x*scale),Y=y=>N(top+y*scale),W=w=>N(w*scale),H=h=>N(h*scale);
 const rect=(x,y,w,h,fill,stroke='#64748b')=>'<rect x="'+X(x)+'" y="'+Y(y)+
  '" width="'+W(w)+'" height="'+H(h)+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="1"/>';
 const innerSpan=e.nominalDinSpanMm,margin=(width-innerSpan)/2;
 const rows=s.rowZones.map((z,i)=>{
  const wire=z.wiringCorridor,band=z.apparatusBand;
  return rect(wire.xMm,wire.yMm,wire.widthMm,wire.heightMm,'#dbeafe','#93c5fd')+
   rect(band.xMm,band.yMm,band.widthMm,band.heightMm,'#d1fae5','#059669')+
   '<text x="'+X(band.xMm+4)+'" y="'+Y(band.yMm+Math.min(band.heightMm/2,18))+
   '" font-size="10" fill="#065f46">DIN '+(i+1)+' ('+option.modulesPerRail+' мод.)</text>';
 }).join('');
 const sideA=rect(0,s.topBottomAllowanceMm,s.sideWiringCorridorMm,
  option.railCount*s.rowPitchMm,'#fef3c7','#d97706');
 const sideB=rect(width-s.sideWiringCorridorMm,s.topBottomAllowanceMm,
  s.sideWiringCorridorMm,option.railCount*s.rowPitchMm,'#fef3c7','#d97706');
 const terminals=s.terminalReserveMm>0?
  rect(0,height-s.topBottomAllowanceMm-s.terminalReserveMm,width,
   s.terminalReserveMm,'#ede9fe','#8b5cf6'):'';
 return '<div class="ep-cabinet-space-preview">'+
  '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Условный эскиз полезного пространства щита и резервных зон; не чертёж изготовителя" '+
  'viewBox="0 0 '+cw+' '+ch+'" style="max-width:100%;height:auto;background:#f8fafc;border:1px solid #cbd5e1;border-radius:8px">'+
  rect(0,0,width,height,'#ffffff','#334155')+
  rows+sideA+sideB+terminals+
  '<text x="32" y="15" font-size="12" font-weight="bold" fill="#0f172a">УСЛОВНАЯ СХЕМА · НЕ ДЛЯ МОНТАЖА</text>'+
  '<text x="32" y="325" font-size="11" fill="#334155">Полезное пространство ~ '+
  N(width)+' × '+N(height)+' мм · глубина '+(e.preliminaryUsableDepthMm==null?'неизвестна':N(e.preliminaryUsableDepthMm)+' мм')+'</text>'+
  '</svg><p class="muted">Зелёный — полосы под аппараты; синий — коридор проводов; жёлтый — боковой резерв; фиолетовый — зона клемм. Размеры — допущения проектирования, не паспорт корпуса.</p></div>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetSpaceDiagramV1};
