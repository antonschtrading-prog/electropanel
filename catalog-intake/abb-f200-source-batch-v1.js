'use strict';
// Manufacturer order-code table, ABB System pro M compact F200 Type A.
// Catalogue publication is historical; market lifecycle is NOT verified.
const source='https://library.e.abb.com/public/e1feaf53e4b99c8ac1257e36003719a4/Modular%20DIN%20Comps%20MCB%20RCB%20Meters%20Surge%209AKK106354A1400.pdf';
const configurations=[
 ['F202',2,25,30,'2CSF202101R1250'],['F202',2,40,30,'2CSF202101R1400'],['F202',2,63,30,'2CSF202101R1630'],['F202',2,80,30,'2CSF202101R1800'],['F202',2,100,30,'2CSF202101R1900'],
 ['F204',4,25,30,'2CSF204101R1250'],['F204',4,40,30,'2CSF204101R1400'],['F204',4,63,30,'2CSF204101R1630'],['F204',4,80,30,'2CSF204101R1800'],['F204',4,100,30,'2CSF204101R1900'],['F204',4,125,30,'2CSF204101R1950'],
 ['F202',2,25,100,'2CSF202101R2250'],['F202',2,40,100,'2CSF202101R2400'],['F202',2,63,100,'2CSF202101R2630'],['F202',2,80,100,'2CSF202101R2800'],['F202',2,100,100,'2CSF202101R2900'],
 ['F204',4,25,100,'2CSF204101R2250'],['F204',4,40,100,'2CSF204101R2400'],['F204',4,63,100,'2CSF204101R2630'],['F204',4,80,100,'2CSF204101R2800'],['F204',4,100,100,'2CSF204101R2900'],['F204',4,125,100,'2CSF204101R2950'],
 ['F202',2,25,300,'2CSF202101R3250'],['F202',2,40,300,'2CSF202101R3400'],['F202',2,63,300,'2CSF202101R3630'],['F202',2,80,300,'2CSF202101R3800'],['F202',2,100,300,'2CSF202101R3900'],
 ['F204',4,25,300,'2CSF204101R3250'],['F204',4,40,300,'2CSF204101R3400'],['F204',4,63,300,'2CSF204101R3630'],['F204',4,80,300,'2CSF204101R3800'],['F204',4,100,300,'2CSF204101R3900'],['F204',4,125,300,'2CSF204101R3950']
];
const candidates=configurations.map(([family,poles,inA,residualCurrentMa,sku])=>Object.freeze({
 maker:'ABB',series:'System pro M compact '+family,sku,kind:'RCD',poles,inA,residualCurrentMa,residualType:'A',
 modules:null,widthMm:null,heightMm:null,depthMm:null,conditionalShortCircuitKa:null,
 source,sourceReviewedAt:'2026-11-18',sourceType:'MANUFACTURER_HISTORICAL_CATALOG',
 marketStatus:'UNKNOWN_CHECK_BEFORE_PROCUREMENT',engineeringApproved:false
}));
const evidence=Object.fromEntries(candidates.map(c=>{
 const fields={};for(const field of ['sku','series','poles','inA','residualCurrentMa','residualType'])fields[field]={
 url:source,documentTitle:'ABB System pro M compact, F200 A Type RCCBs order table',
 locator:'F200 A Type RCCBs — Two Pole and Four Pole, order code row '+c.sku,
 reviewedAt:'2026-11-18'};
 fields.sku.exactSku=c.sku;return [c.sku,fields];
}));
module.exports={source,configurations,candidates,evidence};
