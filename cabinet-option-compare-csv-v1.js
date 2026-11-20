'use strict';
// A non-mutating, supplier-facing comparison sheet. Never implies an approved cabinet.
function epCabinetOptionCompareCsvV1(report){
 const columns=['Ранг','Вариант','Приоритет','Доступен','Причина','DIN-реек',
 'Модулей на рейке','Всего модулей','Занято модулей','Резерв модулей',
 'Свободно %','Полезная ширина оценка мм','Полезная высота оценка мм',
 'Полезная площадь оценка мм2','Пропорция Ш/В','Связей между рейками',
 'Неразрешенных связей','Метод упаковки','Перемещено аппаратов','Смена DIN-рейки',
 'Условный балл','Инженерно утверждено'];
 const safe=v=>{let s=String(v??'');if(/^[\s\u0000-\u001f]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const rows=Array.isArray(report?.rows)?report.rows:[];
 return '\uFEFF'+[columns,...rows.map((r,i)=>[i+1,r.id,report.preference,
  r.eligible?'Да':'Нет',r.reason,r.railCount,r.modulesPerRail,r.capacityModules,
  r.usedModules,r.reserveModules,r.freePct,r.widthMm,r.heightMm,r.areaMm2,
  r.aspectRatio,r.crossRailLinks,r.unresolvedLinks,r.packingMethod,
  r.movedDevices??'н/д',r.changedRailDevices??'н/д',r.score,'Нет'])]
  .map(row=>row.map(safe).join(';')).join('\r\n')+'\r\n';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetOptionCompareCsvV1};
