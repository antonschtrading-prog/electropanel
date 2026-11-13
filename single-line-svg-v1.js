'use strict';
// Safe SVG schematic for declared associations. No physical wiring inferred.
function epSingleLineSvgV1(report,selectedId=null){
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!report||!Array.isArray(report.nodes)||!Array.isArray(report.edges))
  return '<p>Однолинейная схема недоступна: нет корректной модели.</p>';
 const nodes=report.nodes,source=nodes.find(n=>n.type==='source');
 const groups=nodes.filter(n=>n.type==='rcd'),lines=nodes.filter(n=>n.type==='circuit');
 const parents=new Map(report.edges.filter(e=>e.to&&e.from).map(e=>[e.to,e.from]));
 const byGroup=new Map();
 for(const l of lines){const parent=parents.get(l.id)||'SOURCE:MAIN';
  if(!byGroup.has(parent))byGroup.set(parent,[]);byGroup.get(parent).push(l);
 }
 const lanes=[...groups.map(g=>({group:g,lines:byGroup.get(g.id)||[]})),
  {group:null,lines:byGroup.get('SOURCE:MAIN')||[]}].filter(x=>x.group||x.lines.length);
 const rowHeight=75,head=120,rows=lanes.reduce((n,l)=>n+Math.max(1,l.lines.length),0);
 const height=Math.max(220,head+rows*rowHeight+50),width=980;
 let content='<rect x="0" y="0" width="'+width+'" height="'+height+'" fill="#f7f9fc"/>'+
  '<text x="22" y="25" fill="#293b50" font-size="15" font-weight="700">ОДНОЛИНЕЙНАЯ СХЕМА · ЧЕРНОВИК</text>'+
  '<text x="22" y="45" fill="#6a7887" font-size="11">Пунктир — логическая принадлежность, НЕ электрический провод</text>'+
  '<rect x="22" y="63" width="205" height="42" rx="6" fill="#e4ebf3" stroke="#72859a"/>'+
  '<text x="32" y="81" fill="#253448" font-size="13" font-weight="700">ВВОД</text>'+
  '<text x="32" y="96" fill="#52647a" font-size="10">'+esc(source?.name||'Не задан')+'</text>';
 let y=head;
 for(const lane of lanes){
  const count=Math.max(1,lane.lines.length),laneY=y,center=laneY+(count-1)*rowHeight/2+21;
  const parent=lane.group;
  const title=parent?parent.name:'Без группового УЗО';
  content+='<path d="M 227 84 H 252 V '+center+' H 265" stroke="#708399" stroke-width="2" stroke-dasharray="5 5" fill="none"/>'+
   '<rect x="265" y="'+(center-22)+'" width="215" height="44" rx="5" fill="'+(parent?'#e7e5f6':'#e9edf0')+'" stroke="#7a8ba0"/>'+
   '<text x="275" y="'+(center-5)+'" fill="#28374a" font-size="12" font-weight="700">'+esc(title)+'</text>'+
   '<text x="275" y="'+(center+11)+'" fill="#596c80" font-size="10">'+
   esc(parent?(parent.templateId||'УЗО · тип не подтверждён'):'Непосредственно от ввода · декларация')+'</text>';
  if(lane.lines.length){
   content+='<path d="M 480 '+center+' H 502 V '+(laneY+21)+'" stroke="#708399" stroke-width="2" stroke-dasharray="5 5" fill="none"/>';
   for(let i=0;i<lane.lines.length;i++){
    const l=lane.lines[i],cy=laneY+i*rowHeight+21,active=l.lineId===selectedId;
    const detail=l.article?[l.article.maker,l.article.series,l.article.label].filter(Boolean).join(' / '):
     'Артикул не выбран или не найден';
    const electrical=l.article?
     'In '+(l.article.inA??'?')+' A · Icn '+(l.article.icnKa??'?')+' kA · '+(l.article.poles??'?')+'P':
     'Характеристики защиты не подтверждены';
    content+='<path d="M 502 '+cy+' H 518" stroke="#708399" stroke-width="2" stroke-dasharray="5 5"/>'+
     '<g class="ep-single-line-circuit'+(active?' ep-circuit-active':'')+'" data-single-line-focus="'+esc(l.lineId)+'" role="button" tabindex="0" aria-label="Выбрать цепь '+esc(l.lineId)+'">'+
     '<rect x="518" y="'+(cy-26)+'" width="430" height="57" rx="7" fill="'+(active?'#d9ebff':'#fff')+
     '" stroke="'+(active?'#236cc3':'#a1aeba')+'" stroke-width="'+(active?'2':'1')+'"/>'+
     '<text x="530" y="'+(cy-9)+'" fill="#24354a" font-size="13" font-weight="700">'+esc(l.lineId)+' · '+esc(l.name)+'</text>'+
     '<text x="530" y="'+(cy+6)+'" fill="#465f78" font-size="10">'+esc(l.phase||'Фаза не задана')+' · '+esc(detail)+'</text>'+
     '<text x="530" y="'+(cy+21)+'" fill="#596c80" font-size="10">'+esc(electrical)+'</text></g>';
   }
  }else content+='<text x="525" y="'+(center+4)+'" fill="#8b5e4e" font-size="12">Отходящие цепи не назначены</text>';
  y+=count*rowHeight;
 }
 content+='<text x="22" y="'+(height-14)+'" fill="#7a5360" font-size="11">'+
  'Непрерывность PE, N, контактная схема, селективность и монтаж не подтверждены.</text>';
 return '<div class="ep-single-line-draft" role="region" aria-label="Черновая однолинейная схема">'+
  '<p>Статус: '+esc(report.status)+' · цепей: '+lines.length+
  ' · групп УЗО: '+groups.length+'. Нажмите цепь для перехода к её проверке.</p>'+
  '<div class="ep-single-line-scroll"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+
  '" role="img" aria-label="Черновая схема принадлежности отходящих цепей">'+content+'</svg></div></div>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epSingleLineSvgV1};
