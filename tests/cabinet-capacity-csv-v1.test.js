'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {epUniversalCabinetOptionsV1}=require('../universal-cabinet-options-v1.js');
const {epCabinetCapacityCsvV1:csv}=require('../cabinet-capacity-csv-v1.js');
test('supplier schedule includes distinct routing bands and no external enclosure SKU',()=>{
 const r=epUniversalCabinetOptionsV1({lines:[{id:'L1',modules:1}]},
  null,{terminalReserveMm:45,wiringCorridorMm:30});
 const o=csv(r);
 assert.equal(o.status,'REVIEW_REQUIRED');
 assert.match(o.csv,/PRELIMINARY_NOT_MANUFACTURER_FIT/);
 assert.match(o.csv,/terminal_height_reserve_mm/);
 assert.match(o.csv,/UNKNOWN/);
 assert.match(o.csv,/1x4/);
 assert.equal(o.engineeringApproved,false);
});
test('outside-limit alternatives remain marked and are not claimed to fit',()=>{
 const r=epUniversalCabinetOptionsV1({lines:[{id:'L1',modules:1}]});
 const result=csv(r,{maxUsableWidthMm:50});
 assert.equal(result.status,'REVIEW_REQUIRED');
 assert.match(result.csv,/EXCEEDS_LIMITS/);
});
test('blocked or missing sizing input exports only a safe heading',()=>{
 const r=csv({schema:'electropanel.universal.cabinet.options.1',status:'BLOCKED',options:[]});
 assert.equal(r.status,'BLOCKED');assert.doesNotMatch(r.csv,/1x4/);
});
