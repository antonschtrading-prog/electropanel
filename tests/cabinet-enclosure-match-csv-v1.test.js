'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epCabinetEnclosureMatchCsvV1:csv}=require('../cabinet-enclosure-match-csv-v1');
const data=()=>({status:'REVIEW_REQUIRED',required:{widthMm:300,heightMm:450,depthMm:100,railCount:2},
 rows:[{id:'BOX-A',manufacturer:'Brand',article:'A',status:'PRELIMINARY_MATCH',
 checks:[{requiredMm:300,availableMm:400,result:'PASS'},
 {requiredMm:450,availableMm:500,result:'PASS'},
 {requiredMm:100,availableMm:150,result:'PASS'}],
 requiredRailCount:2,railCapacity:2,railCheck:'PASS',missingApparatusDimensions:0}]});
test('CSV returns review status',()=>assert.equal(csv(data()).status,'REVIEW_REQUIRED'));
test('CSV has one row',()=>assert.equal(csv(data()).rows,1));
test('CSV contains enclosure id',()=>assert.match(csv(data()).csv,/BOX-A/));
test('CSV includes manufacturer',()=>assert.match(csv(data()).csv,/Brand/));
test('CSV includes article',()=>assert.match(csv(data()).csv,/"A"/));
test('CSV includes status',()=>assert.match(csv(data()).csv,/PRELIMINARY_MATCH/));
test('CSV includes axis results',()=>assert.match(csv(data()).csv,/width_result/));
test('CSV includes rail result',()=>assert.match(csv(data()).csv,/rail_result/));
test('CSV fit always NO',()=>assert.match(csv(data()).csv,/"NO"/));
test('CSV confirmed fit false',()=>assert.equal(csv(data()).confirmedFit,false));
test('CSV UTF8 BOM',()=>assert.equal(csv(data()).csv.charCodeAt(0),65279));
test('CSV CRLF',()=>assert.match(csv(data()).csv,/\r\n/));
test('CSV null blocked',()=>assert.equal(csv(null).status,'BLOCKED'));
test('CSV missing rows blocked',()=>assert.equal(csv({...data(),rows:null}).status,'BLOCKED'));
test('CSV blocked report blocked',()=>assert.equal(csv({...data(),status:'BLOCKED'}).status,'BLOCKED'));
test('CSV unknown report allowed',()=>assert.equal(csv({...data(),status:'UNKNOWN'}).status,'UNKNOWN'));
test('CSV escapes quotes',()=>{const d=data();d.rows[0].id='A"B';assert.match(csv(d).csv,/A""B/)});
test('CSV escapes formulas',()=>{const d=data();d.rows[0].id='=SUM(1,2)';assert.match(csv(d).csv,/"'=SUM/)});
test('CSV does not mutate input',()=>{const d=data(),s=JSON.stringify(d);csv(d);assert.equal(JSON.stringify(d),s)});
test('CSV deterministic',()=>assert.deepEqual(csv(data()),csv(data())));
