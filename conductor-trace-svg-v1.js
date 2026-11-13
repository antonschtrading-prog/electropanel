'use strict';
// Vector schematic of explicitly declared symbolic links, not a certified conductor diagram.
function epConductorTraceSvgV1(trace,lineId){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!trace||!Array.isArray(trace.rows))
  return '<p>Векторная схема проводников недоступна.</p>';
 const row=trace.rows.find(x=>x.lineId===lineId);
 if(!row)return '<p>Выберите цепь для просмотра объявленных соединений.</p>';
 const links=(row.connections||[]).slice(0,150),w=1100,h=Math.max(180,100+links.length*90);
 const colors={L1:'#b36b16',L2:'#a24d28',L3:'#8c5633',N:'#2563a6',PE:'#26774c'};
 let shapes='<rect width="'+w+'" height="'+h+'" fill="#f8fafc"/>'+
  '<text x="20" y="27" font-size="16" fill="#25384f" font-weight="700">ЦЕПЬ '+esc(row.lineId)+' · ЗАЯВЛЕННЫЕ ПРОВОДНИКИ</text>'+
  '<text x="20" y="46" font-size="11" fill="#66788c">Только декларации клемм и проводов · контакты аппаратов не моделируются</text>';
 for(let i=0;i<links.length;i++){
  const x=links[i],cy=83+i*90,c=colors[x.role]||'#8b5b5b',continuous=x.status==='DECLARED_PATH';
  const left=String(x.from??''),right=String(x.to??'');
  const shorten=s=>s.length>38?s.slice(0,35)+'…':s;
  const path=(x.path||[]).join(' → ');
  shapes+='<rect x="18" y="'+(cy-24)+'" width="360" height="49" rx="5" fill="#fff" stroke="#b7c4d2"/>'+
   '<text x="28" y="'+(cy-6)+'" font-size="12" font-weight="700" fill="#273b50">'+esc(shorten(left))+'</text>'+
   '<text x="28" y="'+(cy+12)+'" font-size="10" fill="#5a6d80">'+esc(x.group||'Связь')+'</text>'+
   '<path d="M 378 '+cy+' H 722" stroke="'+c+'" stroke-width="3" '+
   (continuous?'':'stroke-dasharray="7 7" ')+'fill="none"/>'+
   '<rect x="516" y="'+(cy-20)+'" width="70" height="22" rx="4" fill="'+c+'"/>'+
   '<text x="551" y="'+(cy-5)+'" font-size="12" fill="#fff" text-anchor="middle" font-weight="700">'+esc(x.role||'?')+'</text>'+
   '<text x="550" y="'+(cy+23)+'" font-size="10" fill="'+(continuous?'#26774c':'#9a3c3c')+
   '" text-anchor="middle">'+esc(continuous?'Путь заявлен':'Нет подтверждённого пути')+'</text>'+
   '<rect x="722" y="'+(cy-24)+'" width="360" height="49" rx="5" fill="#fff" stroke="#b7c4d2"/>'+
   '<text x="732" y="'+(cy-6)+'" font-size="12" font-weight="700" fill="#273b50">'+esc(shorten(right))+'</text>'+
   '<text x="732" y="'+(cy+12)+'" font-size="10" fill="#5a6d80">'+esc(x.code||'')+'</text>'+
   '<text x="550" y="'+(cy+39)+'" font-size="10" text-anchor="middle" fill="#63768b">'+
   esc(path.length>90?path.slice(0,87)+'…':path||'Клеммный путь не подтверждён')+'</text>';
 }
 if(!links.length)shapes+='<text x="22" y="92" font-size="13" fill="#8a4d38">Связи этой цепи не объявлены</text>';
 shapes+='<text x="20" y="'+(h-12)+'" font-size="11" fill="#8b3f46">'+
  'Ни одна линия не подтверждает физический монтаж, замкнутость аппарата или безопасность.</text>';
 return '<section class="ep-conductor-visual"><div class="ep-single-line-scroll">'+
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+
  '" role="img" aria-label="Заявленные проводники цепи '+esc(row.lineId)+'">'+shapes+
  '</svg></div></section>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epConductorTraceSvgV1};
