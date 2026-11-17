'use strict';
// Deterministic, bounded catalogue-front browser for devices actually installed
// in the draft board. Never treats a vector sketch as a verified manufacturer image.
function epCabinetFrontGalleryModelV1(rows,lookup,options={}){
 const reject=code=>({schema:'electropanel.cabinet.front.gallery.1',status:'BLOCKED',
  code,items:[],total:0,visible:0,hasMore:false,makerOptions:[],engineeringApproved:false});
 if(!Array.isArray(rows)||rows.length>5000||typeof lookup!=='function')
  return reject('FRONT_GALLERY_INPUT_INVALID');
 const search=typeof options.search==='string'?options.search.trim().toLocaleLowerCase():''; 
 const maker=typeof options.maker==='string'?options.maker.trim().toLocaleLowerCase():'';
 if(search.length>200||maker.length>200)return reject('FRONT_GALLERY_FILTER_INVALID');
 const page=Number.isInteger(options.page)&&options.page>=0&&options.page<=1000?options.page:0;
 const pageSize=Number.isInteger(options.pageSize)&&options.pageSize>=1&&options.pageSize<=48?
  options.pageSize:12;
 const bySku=new Map();
 for(const row of rows){
  const sku=row?.boardSku;
  if(typeof sku!=='string'||!sku.trim()||sku.length>200)continue;
  if(bySku.has(sku)){bySku.get(sku).quantity++;continue;}
  let device=null;
  try{device=lookup(sku);}catch(_){device=null;}
  const makerName=typeof device?.maker==='string'?device.maker:'';
  const series=typeof device?.series==='string'?device.series:'';
  const kind=typeof device?.kind==='string'?device.kind:'';
  bySku.set(sku,{sku,maker:makerName,series,kind,quantity:1,device:device||null,
   status:device?'CATALOGUE_FOUND':'CATALOGUE_MISSING'});
 }
 const all=[...bySku.values()].sort((a,b)=>
  a.maker.localeCompare(b.maker,'ru')||a.series.localeCompare(b.series,'ru')||
  a.sku.localeCompare(b.sku,'ru'));
 const makerOptions=[...new Set(all.map(x=>x.maker).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru'));
 const filtered=all.filter(x=>(!maker||x.maker.toLocaleLowerCase()===maker)&&
  (!search||[x.sku,x.maker,x.series,x.kind].join(' ').toLocaleLowerCase().includes(search)));
 const start=page*pageSize;
 return {schema:'electropanel.cabinet.front.gallery.1',status:'REVIEW_REQUIRED',
  code:'FRONT_GALLERY_PREVIEW_ONLY',items:filtered.slice(start,start+pageSize),
  total:filtered.length,visible:Math.min(pageSize,Math.max(0,filtered.length-start)),
  hasMore:start+pageSize<filtered.length,page,pageSize,makerOptions,
  allArticles:all.length,engineeringApproved:false};
}
if(typeof module!=='undefined'&&module.exports)
 module.exports={epCabinetFrontGalleryModelV1};
