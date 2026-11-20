'use strict';
// Dimension annotations for a nominal DIN plan. Never a manufacturer product image.
function epCabinetApparatusGeometrySvgV1(report){
 if(!report||!['UNKNOWN','REVIEW_REQUIRED'].includes(report.status)||
  !Array.isArray(report.rows)||!report.summary||!Array.isArray(report.summary.railWidths))
  return '';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const rails=report.summary.railWidths;
 if(!rails.length||rails.length>100||rails.some(r=>!Number.isInteger(r.railIndex)||
  !Number.isFinite(r.nominalSpanMm)||r.nominalSpanMm<=0||r.nominalSpanMm>5000))
  return '';
 const width=760,height=75+rails.length*88,max=Math.max(...rails.map(r=>r.nominalSpanMm));
 const scale=Math.min(1.8,620/max);
 const blocks=rails.map((r,i)=>{
  const y=40+i*88;
  const background='<text x="10" y="'+(y+22)+'" font-size="12" fill="#334155">DIN '+(r.railIndex+1)+'</text>'+
   '<rect x="90" y="'+y+'" width="'+(r.nominalSpanMm*scale).toFixed(2)+
   '" height="44" rx="3" fill="#e2e8f0" stroke="#94a3b8"/>';
  const devices=report.rows.filter(d=>d.railIndex===r.railIndex).map(d=>{
   const x=90+d.startModule*report.summary.assumedModulePitchMm*scale;
   const w=d.nominalWidthMm*scale;
   if(!Number.isFinite(x)||!Number.isFinite(w)||x<90||w<=0||x+w>90+r.nominalSpanMm*scale+0.01)return '';
   const known=d.dimensionsKnown,fill=known?'#d1fae5':'#fef3c7';
   const label=d.deviceId+' · '+(d.widthMm===null?'ширина н/д':d.widthMm+' мм')+
    ' · '+(d.heightMm===null?'высота н/д':d.heightMm+' мм')+
    ' · '+(d.depthMm===null?'глубина н/д':d.depthMm+' мм');
   return '<g><title>'+esc(label)+'</title><rect x="'+x.toFixed(2)+'" y="'+(y+3)+
    '" width="'+w.toFixed(2)+'" height="38" fill="'+fill+'" stroke="#64748b"/>'+
    '<text x="'+(x+3).toFixed(2)+'" y="'+(y+25)+
    '" font-size="10" fill="#0f172a">'+esc(d.deviceId.slice(0,Math.max(1,Math.floor(w/7))))+'</text></g>';
  }).join('');
  return background+devices;
 }).join('');
 return '<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Условная DIN-схема с известными и отсутствующими каталожными габаритами аппаратов" viewBox="0 0 '+width+' '+height+
  '" style="display:block;width:100%;height:auto;max-height:550px">'+
  '<text x="10" y="18" font-size="13" fill="#334155">Каталожные габариты · DIN-позиции условные</text>'+
  blocks+'<text x="10" y="'+(height-12)+
  '" font-size="11" fill="#475569">Зелёный — все габариты известны · жёлтый — часть габаритов неизвестна · не для монтажа</text></svg>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetApparatusGeometrySvgV1};
