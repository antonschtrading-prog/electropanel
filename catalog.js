'use strict';
// Curated seed records. Original stylized previews, NOT exact manufacturer front photography.
// Specifications are source-dependent, and selection does not establish suitability of protection.
const EP_CATALOG = Object.freeze({
  'SE-A9F74116':Object.freeze({
    maker:'Schneider Electric',series:'Acti9 iC60N',sku:'A9F74116',label:'iC60N C16',kind:'MCB',
    poles:1,modules:1,widthMm:18,inA:16,curve:'C',icnKa:6,appearance:'schneider',
    source:'https://eshop.se.com/sg/ic60n-miniature-circuit-breaker-1p-16a-c-curve-a9f74116.html'
  }),
  'SE-A9F73110':Object.freeze({
    maker:'Schneider Electric',series:'Acti9 iC60N',sku:'A9F73110',label:'iC60N B10 1P',kind:'MCB',
    poles:1,modules:1,widthMm:18,heightMm:85,depthMm:78.5,inA:10,curve:'B',icnKa:6,appearance:'schneider',
    icnVoltageV:230,icnStandard:'IEC/EN 60898-1',sourceReviewedAt:'2026-11-14',
    sourceType:'MANUFACTURER_DATASHEET_MIRROR',source:'https://technocare.az/wp-content/uploads/2024/01/Schneider-A9F73110_document-EN.pdf',
    productSource:'https://www.se.com/sg/en/product/A9F73110/'
  }),
  'SE-A9F74316':Object.freeze({
    maker:'Schneider Electric',series:'Acti9 iC60N',sku:'A9F74316',label:'iC60N C16 3P',kind:'MCB',
    poles:3,modules:3,widthMm:54,heightMm:85,depthMm:78.5,inA:16,curve:'C',icnKa:6,appearance:'schneider',
    icnVoltageV:400,icnStandard:'IEC/EN 60898-1',sourceReviewedAt:'2026-11-14',
    sourceType:'MANUFACTURER_DATASHEET_MIRROR',source:'https://aygelectrocompany.com/wp-content/uploads/2026/01/PES_Schneider-Electric_Acti-9-iC60_A9F74316.pdf',
    productSource:'https://www.se.com/sg/en/product/A9F74316/'
  }),
  'SE-A9F74332':Object.freeze({
    maker:'Schneider Electric',series:'Acti9 iC60N',sku:'A9F74332',label:'iC60N C32 3P',kind:'MCB',
    poles:3,modules:3,widthMm:54,heightMm:85,depthMm:78.5,inA:32,curve:'C',icnKa:6,appearance:'schneider',
    icnVoltageV:400,icnStandard:'IEC/EN 60898-1',sourceReviewedAt:'2026-11-14',
    sourceType:'MANUFACTURER_DATASHEET_MIRROR',source:'https://storage.googleapis.com/eezee-technical-data/uCW73Qu86ZsNE1Tl.pdf',
    productSource:'https://www.se.com/sg/en/product/A9F74332/'
  }),
  'ABB-2CDS251001R0164':Object.freeze({
    maker:'ABB',series:'System pro M S200',sku:'2CDS251001R0164',label:'S201-C16',kind:'MCB',
    poles:1,modules:1,widthMm:17.5,inA:16,curve:'C',icnKa:6,appearance:'abb',
    source:'https://nizke-napeti.cz.abb.com/jistice-1pol-s201-6-ka-charakteristika-c-16995/jistic-s200-1fazovy-2cds251001r0164'
  }),
  'IEK-MVA20-1-016-C':Object.freeze({
    maker:'IEK',series:'KARAT ВА47-29',sku:'MVA20-1-016-C',label:'ВА47-29 C16',kind:'MCB',
    poles:1,modules:1,widthMm:18,inA:16,curve:'C',icnKa:4.5,appearance:'iek',
    source:'https://www.iek.ru/upload/pictures/katalogi/ru_ru/1-catalog_moduln_app.pdf'
  }),
  'HA-MBN116':Object.freeze({
    maker:'Hager',series:'MBN 6 kA',sku:'MBN116',label:'MBN116 B16',kind:'MCB',
    poles:1,poleConfiguration:'1P',modules:1,widthMm:17.5,heightMm:83,depthMm:70,
    inA:16,curve:'B',icnKa:6,icnVoltageV:230,icnStandard:'IEC 60898-1',appearance:'hager',
    sourceType:'MANUFACTURER_PRODUCT_PAGE',sourceReviewedAt:'2026-11-14',
    source:'https://hager.com/en-tr/catalogue/product-information/mbn116-mcb-1p-6ka-b-16a-1m'
  }),
  'LE-406775':Object.freeze({
    maker:'Legrand',series:'DNX3 4500',sku:'406775',label:'DNX3 C20 1P+N',kind:'MCB',
    poles:2,poleConfiguration:'1P+N',modules:1,widthMm:17.8,heightMm:94.8,depthMm:77.7,
    inA:20,curve:'C',icnKa:4.5,icnVoltageV:230,icnStandard:'EN 60898-1',appearance:'legrand',
    sourceType:'MANUFACTURER_PRODUCT_PAGE',sourceReviewedAt:'2026-11-14',
    source:'https://www.legrand.fr/pro/catalogue/disjoncteur-phaseneutre-dnx34500-6ka-arrivee-et-sortie-borne-a-vis-1pn-230v-20a-courbe-c-1-module'
  }),
  'CH-814014':Object.freeze({
    maker:'CHINT',series:'NXB-63',sku:'814014',label:'NXB-63 C16 1P',kind:'MCB',
    poles:1,poleConfiguration:'1P',modules:1,widthMm:18,inA:16,curve:'C',
    icnKa:null,icuKa:6,icuVoltageV:230,appearance:'chint',
    sourceType:'MANUFACTURER_CATALOG',sourceReviewedAt:'2026-11-14',
    source:'https://www.chintglobal.com/content/dam/chint/global/product-center/low-voltage/iec/final-power-distribution/mcb/nxb-63/catalog/NXB-63-MCB-catalog.pdf',
    productSource:'https://www.chintglobal.com/global/en/products/low-voltage/iec/final-power-distribution/nxb-63.html'
  }),
  'EA-286533':Object.freeze({
    maker:'Eaton',series:'xPole PL6',sku:'286533',label:'PL6-C16/1',kind:'MCB',
    poles:1,poleConfiguration:'1P',modules:1,widthMm:17.7,heightMm:73,depthMm:85,
    inA:16,curve:'C',icnKa:6,icnStandard:'IEC/EN 60898-1',appearance:'eaton',
    sourceType:'MANUFACTURER_PRODUCT_PAGE',sourceReviewedAt:'2026-11-14',
    source:'https://www.eaton.com/gb/en-gb/skuPage.286533.html'
  }),
  'SI-5SL6116-7':Object.freeze({
    maker:'Siemens',series:'SENTRON 5SL',sku:'5SL6116-7',label:'5SL6116-7 C16',kind:'MCB',
    poles:1,poleConfiguration:'1P',modules:1,widthMm:18,heightMm:90,depthMm:76,
    inA:16,curve:'C',icnKa:6,icnVoltageV:230,icnStandard:'EN 60898-1',appearance:'siemens',
    sourceType:'MANUFACTURER_DATASHEET_OFFICIAL',sourceReviewedAt:'2026-11-14',
    source:'https://support.industry.siemens.com/teddatasheet/?caller=SIOS&format=pdf&language=en&mlfbs=5SL6116-7',
    productSource:'https://mall.industry.siemens.com/mall/en/en/Catalog/product?mlfb=5SL6116-7'
  })
});
function epCatalogSku(sku) { return Object.prototype.hasOwnProperty.call(EP_CATALOG,sku)?EP_CATALOG[sku]:null; }
function epCatalogMakers() {
 return [...new Set(Object.values(EP_CATALOG).map(d=>d.maker))].sort((a,b)=>a.localeCompare(b));
}
function epCatalogSeries(maker='') {
 return [...new Set(Object.values(EP_CATALOG).filter(d=>!maker||d.maker===maker).map(d=>d.series))].sort((a,b)=>a.localeCompare(b));
}
// Catalogue geometry compatibility only: not a fault-current or protection calculation.
function epCatalogCompatible(sku,phase) {
 const d=epCatalogSku(sku);
 if(!d)return false;
 if(!['MCB','RCBO'].includes(d.kind))return false;
 if(['L1','L2','L3'].includes(phase))return d.poles===1||
  (d.poles===2&&['1P+N','2P'].includes(d.poleConfiguration));
 if(phase==='3Ф')return d.poles===3||d.poles===4;
 return false;
}
function epCatalogFilter(maker='',series='',phase='') {
 return Object.entries(EP_CATALOG).filter(([id,d])=>
  (!maker||d.maker===maker)&&(!series||d.series===series)&&(!phase||epCatalogCompatible(id,phase)));
}
// Compare an explicitly declared calculation record with the chosen article.
// This is a consistency check, NOT cable selection or a compliance certificate.
// Missing and invalid inputs never become inferred values.
function epCatalogDeclaredCurrentIssues(sku, input, resolvedDevice=null) {
 const d=resolvedDevice||epCatalogSku(sku);
 if(!d||!input||typeof input!=='object')return [];
 const issues=[];
 const number=(key)=>{
  const raw=input[key];
  if(raw===undefined||raw===null||String(raw).trim()==='')return null;
  const n=Number(String(raw).replace(',','.'));
  return Number.isFinite(n)&&n>0?n:null;
 };
 const declaredIn=number('inA');
 const ib=number('ibA');
 const iz=number('izA');
 if(declaredIn!==null&&Math.abs(declaredIn-d.inA)>1e-9)
  issues.push({code:'CATALOG_IN_CONFLICT',message:'Введённый In не совпадает с паспортным номиналом выбранного аппарата'});
 if(ib!==null&&ib>d.inA)
  issues.push({code:'CATALOG_IB_GT_IN',message:'Заявленный Ib выше паспортного In выбранного аппарата'});
 if(iz!==null&&d.inA>iz)
  issues.push({code:'CATALOG_IN_GT_IZ',message:'Паспортный In выбранного аппарата выше заявленного Iz кабеля'});
 return issues;
}
function epCatalogDeviceSummary(sku) {
 const d=epCatalogSku(sku);
 return d?{sku:d.sku,maker:d.maker,series:d.series,modules:d.modules,widthMm:d.widthMm,inA:d.inA,curve:d.curve,icnKa:d.icnKa}:null;
}


// Commercial navigation only. A tier is not a quality, suitability or price
// certification of a manufacturer's individual product/series.
const EP_BRAND_TIERS=Object.freeze({
 budget:Object.freeze(['IEK','CHINT','Systeme Electric','DEKraft','Himel']),
 comfort:Object.freeze(['Schneider Electric','Legrand','Panasonic']),
 premium:Object.freeze(['ABB','Siemens','Hager','Schrack Technik','КЭАЗ','Eaton'])
});
function epBrandTier(maker){
 for(const [tier,members] of Object.entries(EP_BRAND_TIERS))
  if(members.includes(maker))return tier;
 return null;
}
function epBrandCoverage(articles=EP_CATALOG){
 const actual=Object.values(articles||{}).filter(a=>a&&typeof a==='object');
 return Object.entries(EP_BRAND_TIERS).map(([tier,makers])=>({
  tier,makers:makers.map(maker=>({
   maker,articles:actual.filter(a=>a.maker===maker).length,
   series:[...new Set(actual.filter(a=>a.maker===maker).map(a=>a.series).filter(Boolean))].length
  }))
 }));
}

if(typeof module!=='undefined'&&module.exports)module.exports={EP_CATALOG,epCatalogSku,epCatalogMakers,epCatalogSeries,epCatalogCompatible,epCatalogFilter,epCatalogDeclaredCurrentIssues,epCatalogDeviceSummary,EP_BRAND_TIERS,epBrandTier,epBrandCoverage};
