'use strict';
// Manufacturer-series presentation: original vector illustration, not an official product image.
function epCatalogFrontSvgV1(device,deviceId=''){
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const maker=String(device?.maker||'').toLowerCase();
 const series=String(device?.series||'');
 const family=maker.includes('schneider')?'schneider':maker.includes('abb')?'abb':maker.includes('iek')?'iek':'neutral';
 const palette={schneider:{brand:'#16814c',label:'#e7f5e9',stripe:'#2c985d'},abb:{brand:'#cf252d',label:'#fff0f0',stripe:'#cf252d'},iek:{brand:'#1671ad',label:'#e7f1fc',stripe:'#eab92f'},neutral:{brand:'#546577',label:'#eef1f4',stripe:'#546577'}}[family];
 const poles=Number.isInteger(device?.poles)&&device.poles>0?Math.min(device.poles,8):1;
 const width=Math.max(92,Math.min(480,Math.round((Number(device?.widthMm)||18)*5.1)));
 const height=240;
 const gradientId='ep-body-'+family+'-'+Array.from(String(deviceId||device?.sku||'device')).reduce((h,ch)=>((h*33+ch.charCodeAt(0))>>>0),5381).toString(36);
 const inA=Number.isFinite(device?.inA)?String(device.inA):'—';
 const curve=String(device?.curve||'');
 const rated=esc(curve+inA);
 const labels=family==='schneider'?['Acti9',series]:family==='abb'?['ABB',series]:family==='iek'?['IEK',series]:['Условный вид',series];
 const breaker=String(device?.kind||'MCB').toUpperCase();
 const levers=Array.from({length:poles},(_,i)=>{
  const cx=width*(i+.5)/poles;
  return '<rect x="'+(cx-9)+'" y="127" width="18" height="45" rx="4" fill="#252d35"/>'+
   '<rect x="'+(cx-6)+'" y="124" width="12" height="28" rx="3" fill="#424b54"/>'+
   '<path d="M '+(cx-4)+' 128 h8 v12 h-8z" fill="#69737c"/>';
 }).join('');
 const terminal=Array.from({length:poles},(_,i)=>{
  const cx=width*(i+.5)/poles;
  return '<rect x="'+(cx-7)+'" y="6" width="14" height="12" rx="2" fill="#6f7c86"/>'+
   '<rect x="'+(cx-7)+'" y="222" width="14" height="12" rx="2" fill="#6f7c86"/>';
 }).join('');
 const text=(y,size,fill,value,weight=500)=>'<text x="10" y="'+y+'" font-family="Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+fill+'">'+esc(value)+'</text>';
 return '<svg class="ep-manufacturer-front" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+width+' '+height+'" role="img" aria-label="'+esc('Иллюстрация '+(device?.maker||'')+' '+series+' '+(device?.sku||deviceId))+'">'+
 '<defs><linearGradient id="ep-body-'+gradientId+'" x1="0" x2="1"><stop stop-color="#e7e9eb"/><stop offset=".18" stop-color="#fff"/><stop offset=".83" stop-color="#f7f8f9"/><stop offset="1" stop-color="#d7dade"/></linearGradient></defs>'+
 '<rect x="1" y="1" width="'+(width-2)+'" height="238" rx="7" fill="url(#ep-body-'+gradientId+')" stroke="#b9c1c7" stroke-width="2"/>'+
 terminal+'<rect x="5" y="25" width="'+(width-10)+'" height="86" rx="3" fill="'+palette.label+'"/>'+
 '<rect x="5" y="25" width="'+(width-10)+'" height="6" fill="'+palette.stripe+'"/>'+
 text(49,Math.min(14,width/8),palette.brand,labels[0],700)+
 text(65,Math.min(10,width/11),'#394653',labels[1])+
 text(90,Math.min(17,width/6),'#17232b',rated,700)+
 '<rect x="5" y="118" width="'+(width-10)+'" height="63" rx="4" fill="#e3e5e8" stroke="#cbd0d4"/>'+levers+
 text(198,10,'#36424b',breaker,700)+text(211,Math.min(9,width/12),'#56616a',device?.sku||deviceId)+
 '<path d="M5 218h'+(width-10)+'" stroke="#b7bfc7"/>'+
 '</svg>';
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCatalogFrontSvgV1};
