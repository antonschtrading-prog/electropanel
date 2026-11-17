'use strict';
// Manufacturer-source transcription. Missing values are null; no inferred dimensions.
// These records are NOT loaded into the live application.
const sources=Object.freeze({
 abb:'https://vypinace.sk.abb.com/sk/product/detail/16995/15107',
 schneider:'https://www.se.com/sg/en/product/A9F74116/miniature-circuit-breaker-mcb-acti9-ic60n-1p-16a-c-curve-6000a-iec-en-608981-10ka-iec-en-609472/',
 hager:'https://assets.hager.com/step-content/P/PDS_157723390101DE/Document/std.lang.all/CDA440D_0101_de-DE.pdf'
});
const candidates=[
 {maker:'ABB',series:'S200',sku:'2CDS251001R0164',kind:'MCB',poles:1,modules:1,widthMm:17.5,heightMm:88,depthMm:69,inA:16,curve:'C',icnKa:6,icnVoltageV:null,icnStandard:null,source:sources.abb},
 {maker:'Schneider Electric',series:'Acti9 iC60N',sku:'A9F74116',kind:'MCB',poles:1,modules:null,widthMm:null,heightMm:null,depthMm:null,inA:16,curve:'C',icnKa:6,icnVoltageV:230,icnStandard:'IEC/EN 60898-1',icuKa:10,icuVoltageV:230,source:sources.schneider},
 {maker:'Hager',series:'CDA',sku:'CDA440D',kind:'RCD',poles:4,poleConfiguration:'3P+N',modules:4,widthMm:null,heightMm:null,depthMm:null,inA:40,residualCurrentMa:30,residualType:'A',conditionalShortCircuitKa:6,conditionalShortCircuitStandard:'EN 61008-1',source:sources.hager}
];
const fields={
 '2CDS251001R0164':['sku','poles','modules','widthMm','heightMm','depthMm','inA','curve','icnKa'],
 A9F74116:['sku','poles','inA','curve','icnKa','icnVoltageV','icnStandard','icuKa','icuVoltageV'],
 CDA440D:['sku','poles','poleConfiguration','modules','inA','residualCurrentMa','residualType','conditionalShortCircuitKa','conditionalShortCircuitStandard']
};
const evidence=Object.fromEntries(candidates.map(c=>{
 const url=c.source;
 const doc=c.maker==='Hager'?'Hager CDA440D product datasheet':c.maker==='ABB'?'ABB S200 S201-C16 product details':'Schneider Acti9 iC60N A9F74116 product details';
 const fieldEvidence=Object.fromEntries(fields[c.sku].map(field=>[field,{url,documentTitle:doc,locator:c.maker==='Hager'?'Technical properties': 'Product specifications',reviewedAt:'2026-11-18'}]));
 fieldEvidence.sku.exactSku=c.sku;
 return [c.sku,fieldEvidence];
}));
module.exports={sources,candidates,evidence};
