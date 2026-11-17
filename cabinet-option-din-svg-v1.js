'use strict';
// Diagram shows nominal DIN module positions only; no manufacturer device likeness.
function epCabinetOptionDinSvgV1(preview){
 if(!preview||preview.status!=='REVIEW_REQUIRED'||!Array.isArray(preview.rails)||
  !Array.isArray(preview.rows)||!preview.rails.length)return '';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rails=[...preview.rails].sort((a,b)=>a.railIndex-b.railIndex);
 if(rails.length>100||rails.some(r=>!Number.isInteger(r.capacity)||r.capacity<1||r.capacity>200))
  return '';
 const max=Math.max(...rails.map(r=>r.capacity)),cell=20,width=Math.max(300,80+max*cell);
 const height=60+rails.length*65;
 const rects=rails.map((r,i)=>{
  const y=40+i*65,base='<text x="8" y="'+(y+20)+'" font-size="12" fill="#334155">DIN '+(r.railIndex+1)+'</text>'+
   '<rect x="70" y="'+y+'" width="'+(r.capacity*cell)+'" height="35" rx="3" fill="#e2e8f0" stroke="#94a3b8"/>';
  const cells=Array.from({length:r.capacity},(_,j)=>'<line x1="'+(70+j*cell)+'" y1="'+y+
   '" x2="'+(70+j*cell)+'" y2="'+(y+35)+'" stroke="#cbd5e1"/>').join('');
  const blocks=preview.rows.filter(d=>d.toRail===r.railIndex).map(d=>{
   const x=70+d.toSlot*cell,w=d.modules*cell;
   const fill=d.changed?'#fef3c7':'#d1fae5',stroke=d.changed?'#b45309':'#059669';
   return '<g><title>'+esc(d.deviceId)+(d.changed?' — изменено':' — без изменений')+'</title>'+
    '<rect x="'+x+'" y="'+(y+3)+'" width="'+w+'" height="29" rx="2" fill="'+fill+
    '" stroke="'+stroke+'"/><text x="'+(x+4)+'" y="'+(y+22)+'" font-size="11" fill="#1e293b">'+
    esc(d.deviceId.length>Math.max(1,d.modules*3)?d.deviceId.slice(0,Math.max(1,d.modules*3))+'…':d.deviceId)+
    '</text></g>';
  }).join('');
  return base+cells+blocks;
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Предварительное расположение аппаратов по DIN-рейкам. Жёлтые аппараты изменят позицию, зелёные останутся на месте." '+
  'viewBox="0 0 '+width+' '+height+'" style="display:block;width:100%;max-height:500px;overflow:visible">'+
  '<text x="8" y="20" font-size="12" fill="#334155">DIN-позиции · предварительный просмотр</text>'+
  rects+'<text x="8" y="'+(height-8)+'" font-size="11" fill="#475569">Жёлтый — перемещение · зелёный — без изменений</text></svg>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetOptionDinSvgV1};
