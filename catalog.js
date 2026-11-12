'use strict';
// Curated seed records. Original stylized previews, NOT exact manufacturer front photography.
// Specifications are source-dependent, and selection does not establish suitability of protection.
const EP_CATALOG = Object.freeze({
  'SE-A9F74116':Object.freeze({
    maker:'Schneider Electric',series:'Acti9 iC60N',sku:'A9F74116',label:'iC60N C16',kind:'MCB',
    poles:1,modules:1,widthMm:18,inA:16,curve:'C',icnKa:6,appearance:'schneider',
    source:'https://eshop.se.com/sg/ic60n-miniature-circuit-breaker-1p-16a-c-curve-a9f74116.html'
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
  })
});
function epCatalogSku(sku) { return Object.prototype.hasOwnProperty.call(EP_CATALOG,sku)?EP_CATALOG[sku]:null; }
function epCatalogMakers() {
 return [...new Set(Object.values(EP_CATALOG).map(d=>d.maker))].sort((a,b)=>a.localeCompare(b));
}
function epCatalogSeries(maker='') {
 return [...new Set(Object.values(EP_CATALOG).filter(d=>!maker||d.maker===maker).map(d=>d.series))].sort((a,b)=>a.localeCompare(b));
}
function epCatalogFilter(maker='',series='') {
 return Object.entries(EP_CATALOG).filter(([,d])=>(!maker||d.maker===maker)&&(!series||d.series===series));
}
function epCatalogDeviceSummary(sku) {
 const d=epCatalogSku(sku);
 return d?{sku:d.sku,maker:d.maker,series:d.series,modules:d.modules,widthMm:d.widthMm,inA:d.inA,curve:d.curve,icnKa:d.icnKa}:null;
}
