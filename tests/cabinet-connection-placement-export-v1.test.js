'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1.js').epDraftBoardPlanV1;
global.epCabinetConnectionProximityV1=require('../cabinet-connection-proximity-v1.js').epCabinetConnectionProximityV1;
const {epBoardPlacementCsvV1}=require('../board-placement-export-v1.js');
test('DIN CSV includes advisory relation counts without claiming wires',()=>{
 const p={railCount:1,railCapacity:8,
  lines:[{id:'L1',modules:1},{id:'L2',modules:1}],
  protectionLinks:[{upstreamLineId:'L1',downstreamLineId:'L2'}]};
 const r=epBoardPlacementCsvV1(p);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/declared_related_on_same_rail/);
 assert.match(r.csv,/declared_related_across_rails/);
 assert.match(r.csv,/REVIEW_REQUIRED/);
 assert.equal(r.ready_for_installation,false);
});
test('without electrical relationship counts remain zero',()=>{
 const p={railCount:1,railCapacity:8,lines:[{id:'L1',modules:1}]};
 const r=epBoardPlacementCsvV1(p);
 assert.equal(r.status,'REVIEW_REQUIRED');
 assert.match(r.csv,/"0";"0";"REVIEW_REQUIRED"/);
});
