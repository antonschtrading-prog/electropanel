'use strict';
// Exact-SKU RCBO intake; not automatically selectable in the application.
const SOURCES=Object.freeze({
 A9D34616:'https://eshop.se.com/sa/acti9-idpna-vigi-1pn-16a-c-30ma-ac-rcbo-a9d34616.html',
 A9D32616:'https://www.se.com/uk/en/product/A9D32616/',
 A9D31616:'https://www.se.com/uk/en/product/A9D31616/',
 A9DC1916:'https://www.se.com/uk/en/product/A9DC1916/',
 R9DX01616:'https://download.se.com/files?p_Doc_Ref=ENVPEP2505044EN&p_File_name=PEP+ecopassport+SCHN-02065-V01.01-EN1.pdf'
});
const rows=[
 {sku:'A9D34616',series:'Acti9 iDPNa Vigi',poleConfiguration:'1P+N',poles:2,protectedPoles:1,inA:16,curve:'C',residualType:'AC',residualCurrentMa:30,icnKa:4.5,icnStandard:'IEC 61009-2-1',icnVoltageV:230,modules:2,widthMm:36,heightMm:85,depthMm:73,lifecycle:'REGIONAL_REPLACEMENT_REVIEW'},
 {sku:'A9D32616',series:'Acti9 iDPN N Vigi',poleConfiguration:'1P+N',poles:2,protectedPoles:1,inA:16,curve:'C',residualType:'A',residualCurrentMa:30,icnKa:6,icnStandard:null,icnVoltageV:null,modules:null,widthMm:null,heightMm:null,depthMm:null,lifecycle:'REPLACED_UK'},
 {sku:'A9D31616',series:'Acti9 iDPN N Vigi',poleConfiguration:'1P+N',poles:2,protectedPoles:1,inA:16,curve:'C',residualType:'AC',residualCurrentMa:30,icnKa:6,icnStandard:null,icnVoltageV:null,modules:null,widthMm:null,heightMm:null,depthMm:null,lifecycle:'REPLACED_UK'},
 {sku:'A9DC1916',series:'Acti9 iC60H3',poleConfiguration:'3P+Ns',poles:4,protectedPoles:3,inA:16,curve:'C',residualType:'A',residualCurrentMa:30,icnKa:10,icnStandard:null,icnVoltageV:null,modules:3,widthMm:null,heightMm:null,depthMm:null,lifecycle:'REGIONAL_CHECK_REQUIRED'},
 {sku:'R9DX01616',series:'Resi9 compact',poleConfiguration:'1P+N',poles:2,protectedPoles:1,inA:16,curve:'B',residualType:'A',residualCurrentMa:30,icnKa:6,icnStandard:null,icnVoltageV:240,modules:1,widthMm:18,heightMm:null,depthMm:null,lifecycle:'REGIONAL_CHECK_REQUIRED'}
];
const candidates=rows.map(row=>Object.freeze({maker:'Schneider Electric',kind:'RCBO',...row,source:SOURCES[row.sku]}));
const FIELD_SETS={
 A9D34616:['sku','series','poleConfiguration','poles','protectedPoles','inA','curve','residualType','residualCurrentMa','icnKa','icnStandard','icnVoltageV','modules','widthMm','heightMm','depthMm'],
 A9D32616:['sku','series','poleConfiguration','poles','inA','curve','residualType','residualCurrentMa','icnKa'],
 A9D31616:['sku','series','poleConfiguration','poles','inA','curve','residualType','residualCurrentMa','icnKa'],
 A9DC1916:['sku','series','poleConfiguration','poles','inA','curve','residualType','residualCurrentMa','icnKa','modules'],
 R9DX01616:['sku','series','poleConfiguration','poles','inA','curve','residualType','residualCurrentMa','icnKa','icnVoltageV','widthMm','modules']
};
const evidence=Object.fromEntries(candidates.map(c=>{
 const fields=Object.fromEntries(FIELD_SETS[c.sku].map(field=>[field,{url:c.source,documentTitle:'Schneider Electric official product specification',locator:'Product description or product specifications',reviewedAt:'2026-11-18'}]));
 fields.sku.exactSku=c.sku;
 return [c.sku,fields];
}));
module.exports={SOURCES,candidates,evidence};
