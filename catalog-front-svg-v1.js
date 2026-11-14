'use strict';
// Manufacturer-series presentation: original vector illustration, not an official product image.
function epCatalogFrontSvgV1(device,deviceId=''){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const maker=String(device?.maker||'').toLowerCase();
 const series=String(device?.series||'');
 const family=maker.includes('schneider')?'schneider':maker.includes('abb')?'abb':
  maker.includes('iek')?'iek':maker.includes('legrand')?'legrand':
  maker.includes('hager')?'hager':maker.includes('ekf')?'ekf':
  maker.includes('chint')?'chint':maker.includes('siemens')?'siemens':
  maker.includes('dekraft')?'dekraft':'neutral';
 // These are original catalogue-navigation color families, NOT certified factory skins.
 const palette={
  schneider:{brand:'#16814c',label:'#e7f5e9',stripe:'#2c985d'},
  abb:{brand:'#cf252d',label:'#fff0f0',stripe:'#cf252d'},
  iek:{brand:'#1671ad',label:'#e7f1fc',stripe:'#eab92f'},
  legrand:{brand:'#a12d42',label:'#fcecf0',stripe:'#c73b52'},
  hager:{brand:'#395d96',label:'#eaf0f8',stripe:'#4477b3'},
  ekf:{brand:'#a84b37',label:'#fff1e9',stripe:'#d06547'},
  chint:{brand:'#24678d',label:'#e9f5fb',stripe:'#2989ba'},
  siemens:{brand:'#167873',label:'#e7f7f4',stripe:'#188c88'},
  dekraft:{brand:'#aa6540',label:'#fff3e9',stripe:'#bd7645'},
  neutral:{brand:'#546577',label:'#eef1f4',stripe:'#546577'}
 }[family];
 const poles=Number.isInteger(device?.poles)&&device.poles>0?Math.min(device.poles,8):1;
 const modules=Number.isInteger(device?.modules)&&device.modules>0?Math.min(device.modules,24):poles;
 const geometryKnown=Number.isFinite(device?.widthMm)&&device.widthMm>0&&device.widthMm<=modules*18+0.001;
 const evidenceVerified=device?.verificationStatus==='VERIFIED'&&geometryKnown;
 const visualNote=evidenceVerified?'Эскиз, не официальный фасад':'Условный эскиз · геометрия/паспорт не подтверждены';
 const width=Math.max(92,Math.min(480,Math.round((geometryKnown?device.widthMm:modules*18)*5.1)));
 const height=240;
 const gradientId='ep-body-'+family+'-'+Array.from(String(deviceId||device?.sku||'device')).reduce((h,ch)=>((h*33+ch.charCodeAt(0))>>>0),5381).toString(36);
 const inA=Number.isFinite(device?.inA)?String(device.inA):'—';
 const curve=String(device?.curve||'');
 const labels=[String(device?.maker||'Условный вид'),series];
 const breaker=String(device?.kind||'OTHER').toUpperCase();
 // Nominal label is not a live meter reading or a PSU output rating.
 // Escape once in the text helper; do not double-escape manufacturer fields.
 const rated=['MCB','RCBO'].includes(breaker)?curve+inA:
  ['RCD','SWITCH','CONTACTOR','RELAY'].includes(breaker)?
   (inA==='—'?'—':'In '+inA+' A'):'—';
 const levers=Array.from({length:poles},(_,i)=>{
  const cx=width*(i+.5)/poles,leverWidth=Math.min(18,width/poles*.65);
  return '<rect data-lever="true" x="'+(cx-leverWidth/2)+'" y="127" width="'+leverWidth+'" height="45" rx="3" fill="#252d35"/>'+
   '<rect x="'+(cx-leverWidth*.34)+'" y="124" width="'+(leverWidth*.68)+'" height="28" rx="3" fill="#424b54"/>';
 }).join('');
 const faceShape=(()=>{
  if(['MCB','SWITCH','RCD','RCBO'].includes(breaker)){
   const testButton=['RCD','RCBO'].includes(breaker)?
    '<circle data-test-control="true" cx="'+(width-15)+'" cy="163" r="7" fill="#f9f5df" stroke="#3c4650"/>'+
    '<text x="'+(width-17.5)+'" y="166" font-family="Arial" font-size="9" fill="#2d353b">T</text>':'';
   return levers+testButton;
  }
  if(['CONTACTOR','RELAY'].includes(breaker))
   return '<rect data-coil="true" x="12" y="126" width="'+(width-24)+'" height="43" rx="4" fill="#ccd4d9" stroke="#9aa7b1"/>'+
    '<circle cx="'+(width-21)+'" cy="147" r="5" fill="#5d8c70" stroke="#415c50"/>'+
    '<text x="16" y="154" font-family="Arial" font-size="11" fill="#25323e">A1 / A2</text>';
  if(breaker==='METER')
   return '<rect data-display="true" x="10" y="121" width="'+(width-20)+'" height="49" rx="4" fill="#a8bbb5" stroke="#60746f"/>'+
    '<text x="16" y="151" font-family="monospace" font-size="15" fill="#334944">— — —</text>';
  if(breaker==='DIN_PSU')
   return Array.from({length:5},(_,i)=>'<path data-vent="true" d="M 13 '+(126+i*9)+' H '+(width-13)+'" stroke="#88949d" stroke-width="3" stroke-linecap="round"/>').join('')+
    '<text x="10" y="179" font-family="Arial" font-size="8" fill="#53636d">DC OUT · not rated</text>';
  return '<rect data-generic-face="true" x="12" y="126" width="'+(width-24)+'" height="43" rx="4" fill="#d7dde1" stroke="#a9b4bd"/>';
 })();
 const terminal=Array.from({length:poles},(_,i)=>{
  const cx=width*(i+.5)/poles,terminalWidth=Math.min(14,width/poles*.58);
  return '<rect data-terminal="true" x="'+(cx-terminalWidth/2)+'" y="6" width="'+terminalWidth+'" height="12" rx="2" fill="#6f7c86"/>'+
   '<rect data-terminal="true" x="'+(cx-terminalWidth/2)+'" y="222" width="'+terminalWidth+'" height="12" rx="2" fill="#6f7c86"/>';
 }).join('');
 const text=(y,size,fill,value,weight=500)=>'<text x="10" y="'+y+'" font-family="Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'">'+esc(value)+'</text>';
 const elide=(value,limit)=>{const raw=String(value??'');return raw.length>limit?raw.slice(0,Math.max(1,limit-1))+'…':raw;};
 const brandSize=Math.min(14,width/8),seriesSize=Math.min(10,width/11),ratingSize=Math.min(17,width/6);
 const brandMax=Math.max(6,Math.floor((width-22)/(brandSize*.58)));
 const seriesMax=Math.max(8,Math.floor((width-22)/(seriesSize*.58)));
 const ratingMax=Math.max(4,Math.floor((width-22)/(ratingSize*.58)));
 const legend=esc('Иллюстрация '+(device?.maker||'Условный вид')+' '+series+' '+(device?.sku||deviceId)+(rated==='—'?'':'. Обозначение номинала: '+rated)+'. '+visualNote);
 return '<svg class="ep-manufacturer-front" data-device-kind="'+esc(breaker)+'" data-appearance-family="'+esc(family)+'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+legend+'">'+
 '<defs><linearGradient id="ep-body-'+gradientId+'" x1="0" x2="1"><stop stop-color="#e7e9eb"/><stop offset=".18" stop-color="#fff"/><stop offset=".83" stop-color="#f7f8f9"/><stop offset="1" stop-color="#d7dade"/></linearGradient></defs>'+
 '<rect x="1" y="1" width="'+(width-2)+'" height="238" rx="7" fill="url(#ep-body-'+gradientId+')" stroke="#b9c1c7" stroke-width="2"/>'+
 terminal+'<rect x="5" y="25" width="'+(width-10)+'" height="86" rx="3" fill="'+palette.label+'"/>'+
 '<rect x="5" y="25" width="'+(width-10)+'" height="6" fill="'+palette.stripe+'"/>'+
 text(49,brandSize,palette.brand,elide(labels[0],brandMax),700)+
 text(65,seriesSize,'#394653',elide(labels[1],seriesMax))+
 text(90,ratingSize,'#17232b',elide(rated,ratingMax),700)+
 '<rect x="5" y="118" width="'+(width-10)+'" height="63" rx="4" fill="#e3e5e8" stroke="#cbd0d4"/>'+faceShape+
 text(198,10,'#36424b',breaker,700)+text(211,Math.min(9,width/12),'#56616a',device?.sku||deviceId)+
 '<path d="M5 218h'+(width-10)+'" stroke="#b7bfc7"/>'+
 '</svg>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCatalogFrontSvgV1};
