'use strict';
// Manufacturer pages, individual exact-SKU contactor specifications.
// Different coil frequencies/voltages must never be substituted.
const rows=[
 ['A9C20132',25,'2NO',24,'AC',50,'https://www.se.com/uk/en/product/A9C20132/ict-25a-2no-24v-50hz-contactor/'],
 ['A9C20532',25,'2NO',220,'AC',50,'https://www.se.com/uk/en/product/A9C20532/ict-25a-2no-220v-50hz-contactor/'],
 ['A9C20632',25,'2NO',220,'AC',60,'https://www.se.com/uk/en/product/A9C20632/ict-25a-2no-220-240v-60hz-contactor/'],
 ['A9C20732',25,'2NO',230,'AC',50,'https://www.se.com/uk/en/product/A9C20732/ict-25a-2no-230-240v-50hz-contactor/'],
 ['A9C20838',25,'2NO+2NC',220,'AC',50,'https://www.se.com/uk/en/product/A9C20838/ict-25a-2no-2nc-220-240v-50hz-contactor/']
];
const candidates=rows.map(([sku,contactRatingA,contactConfiguration,coilVoltageV,coilSupplyType,coilFrequencyHz,source])=>Object.freeze({
 maker:'Schneider Electric',series:'Acti9 iCT',sku,kind:'CONTACTOR',
 contactRatingA,contactConfiguration,coilVoltageV,coilSupplyType,coilFrequencyHz,
 modules:null,widthMm:null,heightMm:null,depthMm:null,utilizationCategory:null,
 coilVoltageRangeV:sku==='A9C20132'?[24,24]:sku==='A9C20532'?[220,220]:sku==='A9C20732'?[230,240]:[220,240],
 source,sourceReviewedAt:'2026-11-18',sourceType:'MANUFACTURER_PRODUCT_PAGE',
 lifecycle:'REGIONAL_REVIEW_REQUIRED',engineeringApproved:false
}));
const evidence=Object.fromEntries(candidates.map(c=>{
 const fields={};for(const field of ['sku','series','contactRatingA','contactConfiguration','coilVoltageV','coilSupplyType','coilFrequencyHz']){
 fields[field]={url:c.source,documentTitle:'Schneider Electric Acti9 iCT '+c.sku,
 locator:'Exact SKU product title and specifications',reviewedAt:'2026-11-18'};}
 fields.sku.exactSku=c.sku;return [c.sku,fields];
}));
module.exports={rows,candidates,evidence};
