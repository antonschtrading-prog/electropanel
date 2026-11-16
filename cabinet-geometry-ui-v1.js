'use strict';
// Only a proportionally scaled scheme of USER-DECLARED usable dimensions.
// Not a manufacturer's cabinet drawing, enclosure approval or DIN mounting CAD.
function epCabinetGeometryUiV1(project,lookup){
 const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fit=typeof epCabinetFitAuditV1==='function'?epCabinetFitAuditV1(project,lookup):null;
 const raw=fit?.geometry||null,inner=raw?.interior||{},planning=raw?.planning||{};
 const input=(name,label,value,min=0)=>'<label>'+label+
  '<input name="'+name+'" type="number" step="any" min="'+min+'" inputmode="decimal" required value="'+safe(value??'')+'"></label>';
 const editing='<details'+(!raw?' open':'')+'><summary>Задать внутренние габариты и создать монтажные зоны</summary>'+
  '<form data-cabinet-autoplan class="ep-cabinet-form">'+
  input('interiorWidthMm','Полезная ширина, мм',inner.widthMm,20)+
  input('interiorHeightMm','Полезная высота, мм',inner.heightMm,20)+
  input('interiorDepthMm','Полезная глубина, мм',inner.depthMm,20)+
  input('marginMm','Отступ слева/справа, мм',planning.marginMm)+
  input('firstRowYMm','Верх первой зоны, мм',planning.firstRowYMm)+
  input('zoneHeightMm','Высота монтажной зоны ряда, мм',planning.zoneHeightMm,1)+
  input('rowGapMm','Промежуток между зонами, мм',planning.rowGapMm)+
  '<button class="btn primary" type="submit">Создать / пересчитать размещение</button>'+
  '</form><p class="muted">Все размеры задаёт проектировщик. Монтажная зона — предварительно выделенная площадь, а не подтверждённая точка крепления DIN-рейки.</p></details>';
 const rows=raw?'<details><summary>Редактировать монтажные зоны по рядам</summary>'+
  raw.zones.map(z=>'<form data-cabinet-zone="'+z.railIndex+'" class="ep-cabinet-zone-form">'+
    '<strong>DIN '+(z.railIndex+1)+'</strong>'+
    input('xMm','X, мм',z.xMm)+input('yMm','Y, мм',z.yMm)+
    input('widthMm','Ширина зоны, мм',z.widthMm,1)+
    input('heightMm','Высота зоны, мм',z.heightMm,1)+
    '<button class="btn" type="submit">Сохранить зону DIN '+(z.railIndex+1)+'</button></form>').join('')+
  '</details>':'';
 let schematic='';
 if(raw){
  const W=raw.interior.widthMm,H=raw.interior.heightMm,scale=Math.min(480/W,300/H);
  const rect=(x,y,w,h,cls)=>'<rect class="'+cls+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="2"/>';
  const bodies=(fit?.rows||[]).map(r=>r.bodyWidthMm===null?'':rect(
   20+r.xMm*scale,20+r.yMm*scale,
   Math.max(0,r.bodyWidthMm*scale),Math.max(0,(r.bodyHeightMm??r.allocatedHeightMm)*scale),
   r.status==='BLOCKED'?'ep-cabinet-device-bad':'ep-cabinet-device')).join('');
  const zones=raw.zones.map(z=>rect(20+z.xMm*scale,20+z.yMm*scale,
   z.widthMm*scale,z.heightMm*scale,'ep-cabinet-zone')+
   '<text x="'+(24+z.xMm*scale)+'" y="'+(35+z.yMm*scale)+'" font-size="11">DIN '+(z.railIndex+1)+'</text>').join('');
  schematic='<div class="ep-cabinet-schematic"><svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Схема выделенных монтажных зон внутри заданных размеров корпуса" viewBox="0 0 520 340">'+
   rect(20,20,W*scale,H*scale,'ep-cabinet-interior')+zones+bodies+'</svg>'+
   '<p class="muted">Масштабная схема распределения зон, без учёта крепежа, расстояния до дверцы, клемм и проводов.</p></div>';
 }
 const problems=(fit?.issues||[]).filter(x=>x.level==='BLOCKED');
 const issues=problems.length?'<details class="ep-cabinet-problems"><summary>Ошибки геометрии: '+problems.length+'</summary><ul>'+
  problems.slice(0,30).map(x=>'<li>'+safe(x.code)+(x.deviceId?' · '+safe(x.deviceId):x.railIndex!==null&&x.railIndex!==undefined?' · DIN '+(x.railIndex+1):'')+'</li>').join('')+
  '</ul></details>':'';
 const status=fit?.status||'NOT_CONFIGURED';
 const heading=raw?'Внутренний объём: '+inner.widthMm+' × '+inner.heightMm+' × '+inner.depthMm+' мм':
  'Внутренние размеры корпуса не заданы';
 return '<section class="ep-cabinet-panel"><h3>Геометрия корпуса · черновик</h3>'+
  '<p><strong>'+safe(heading)+'</strong></p><p>Состояние: <strong>'+safe(status)+'</strong> · проверено аппаратов: '+(fit?.rows.length||0)+
  ' · замечаний: '+(fit?.issues.length||0)+'. Совместимость и возможность монтажа не подтверждены.</p>'+
  schematic+issues+editing+rows+
  (project?.cabinetGeometryV1?'<button id="cabinetGeometryClearBtn" class="btn" type="button">Очистить модель корпуса</button>':'')+
  '</section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetGeometryUiV1};
