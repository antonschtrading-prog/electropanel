'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epDraftBoardPlanV1=require('../draft-board-plan-v1').epDraftBoardPlanV1;
global.epCabinetApparatusGeometryV1=require('../cabinet-apparatus-geometry-v1').epCabinetApparatusGeometryV1;
global.epCabinetEnclosureMatchV1=require('../cabinet-enclosure-match-v1').epCabinetEnclosureMatchV1;
global.epCabinetEnclosureReviewV1=require('../cabinet-enclosure-review-v1').epCabinetEnclosureReviewV1;
const {epCabinetCurrentEnclosureV1:run}=require('../cabinet-current-enclosure-v1');
const {epCabinetEnclosureReviewCsvV1:csv}=require('../cabinet-enclosure-review-v1');
const project=()=>({railCount:2,railCapacity:6,
 lines:[{id:'A',modules:1,catalogSku:'SKU-A'},{id:'B',modules:2,catalogSku:'SKU-B'}],
 sharedDevices:[],manualLayoutV1:[{deviceId:'A',railIndex:0,startModule:0},
 {deviceId:'B',railIndex:1,startModule:2}]});
const catalog={
 'SKU-A':{article:'SKU-A',modules:1,widthMm:18,heightMm:75,depthMm:65},
 'SKU-B':{article:'SKU-B',modules:2,widthMm:36,heightMm:90,depthMm:75}
};
const lookup=id=>catalog[id]||null;
const candidates=()=>[{id:'BOX',manufacturer:'Demo',article:'DM-1',
 usableInterior:{widthMm:350,heightMm:500,depthMm:150},railCapacity:2},
 {id:'SMALL',manufacturer:'Demo',article:'DM-2',
 usableInterior:{widthMm:100,heightMm:150,depthMm:50},railCapacity:1}];
const result=()=>run(project(),lookup,candidates());
test('schema',()=>assert.equal(result().schema,'electropanel.cabinet.current.enclosure.1'));
test('status',()=>assert.equal(result().status,'REVIEW_REQUIRED'));
test('code',()=>assert.equal(result().code,'CURRENT_ENCLOSURE_COMPARISON_READY'));
test('cannot certify',()=>assert.equal(result().manufacturerCabinetFitVerified,false));
test('engineering not approved',()=>assert.equal(result().engineeringApproved,false));
test('not installation ready',()=>assert.equal(result().ready_for_installation,false));
test('board rails',()=>assert.equal(result().board.railCount,2));
test('board rail capacity',()=>assert.equal(result().board.modulesPerRail,6));
test('board devices',()=>assert.equal(result().board.devices,2));
test('board used slots',()=>assert.equal(result().board.usedModules,3));
test('known apparatus dimensions',()=>assert.equal(result().geometry.knownDimensions,2));
test('missing dimensions zero',()=>assert.equal(result().geometry.missingDimensions,0));
test('large preliminary',()=>assert.equal(result().match.recommendedId,'BOX'));
test('small rejected',()=>assert.equal(result().match.rows.find(x=>x.id==='SMALL').status,'REJECTED'));
test('review count',()=>assert.equal(result().review.summary.candidates,2));
test('review rejected count',()=>assert.equal(result().review.summary.rejected,1));
test('review preliminary count',()=>assert.equal(result().review.summary.preliminary,1));
test('width derived from current rail',()=>assert.equal(result().match.required.widthMm,188));
test('height derived from current rails',()=>assert.equal(result().match.required.heightMm,440));
test('depth derived from deepest body',()=>assert.equal(result().match.required.depthMm,110));
test('height shortage',()=>assert.equal(result().review.rows.find(x=>x.id==='SMALL').deficits.find(x=>x.axis==='height').missingMm,290));
test('rail shortage',()=>assert.equal(result().review.rows.find(x=>x.id==='SMALL').deficits.find(x=>x.axis==='rails').missingCount,1));
test('width spare',()=>assert.equal(result().review.rows.find(x=>x.id==='BOX').spare.find(x=>x.axis==='width').spareMm,162));
test('manufacturer identity',()=>assert.equal(result().review.rows[0].article,'DM-1'));
test('no approval in review',()=>assert.equal(result().review.rows[0].confirmedFit,false));
test('no mutation of project',()=>{const p=project(),s=JSON.stringify(p);run(p,lookup,candidates());assert.equal(JSON.stringify(p),s)});
test('no mutation of candidates',()=>{const c=candidates(),s=JSON.stringify(c);run(project(),lookup,c);assert.equal(JSON.stringify(c),s)});
test('deterministic',()=>assert.deepEqual(result(),result()));
test('null project blocked',()=>assert.equal(run(null,lookup,candidates()).status,'BLOCKED'));
test('missing lookup blocked',()=>assert.equal(run(project(),null,candidates()).status,'BLOCKED'));
test('empty candidates blocked',()=>assert.equal(run(project(),lookup,[]).status,'BLOCKED'));
test('null candidates blocked',()=>assert.equal(run(project(),lookup,null).status,'BLOCKED'));
test('bad rail pitch blocked',()=>assert.equal(run(project(),lookup,candidates(),{railPitchMm:1}).status,'BLOCKED'));
test('invalid candidate width blocked',()=>{const c=candidates();c[0].usableInterior.widthMm=-1;assert.equal(run(project(),lookup,c).status,'BLOCKED')});
test('duplicate candidate blocked',()=>{const c=candidates();c.push({...c[0]});assert.equal(run(project(),lookup,c).status,'BLOCKED')});
test('out of range rail blocked',()=>{const p=project();p.manualLayoutV1[0].railIndex=5;assert.equal(run(p,lookup,candidates()).status,'BLOCKED')});
test('overlapping board devices blocked',()=>{const p=project();p.manualLayoutV1[1]={deviceId:'B',railIndex:0,startModule:0};assert.equal(run(p,lookup,candidates()).status,'BLOCKED')});
test('empty board blocked',()=>{const p=project();p.lines=[];p.manualLayoutV1=[];assert.equal(run(p,lookup,candidates()).status,'BLOCKED')});
test('catalogue modules mismatch blocked',()=>{const c={...catalog,'SKU-A':{...catalog['SKU-A'],modules:2}};assert.equal(run(project(),id=>c[id],candidates()).status,'BLOCKED')});
test('body width beyond slot blocked',()=>{const c={...catalog,'SKU-A':{...catalog['SKU-A'],widthMm:30}};assert.equal(run(project(),id=>c[id],candidates()).status,'BLOCKED')});
test('unknown apparatus depth unverified',()=>{const c={...catalog,'SKU-B':{...catalog['SKU-B'],depthMm:null}};const r=run(project(),id=>c[id],candidates());assert.equal(r.match.recommendedId,null);assert.equal(r.review.summary.unverified,1)});
test('article not selected unverified',()=>{const p=project();delete p.lines[1].catalogSku;const r=run(p,lookup,candidates());assert.equal(r.status,'UNKNOWN');assert.equal(r.match.recommendedId,null)});
test('missing cabinet depth unverified',()=>{const c=candidates();delete c[0].usableInterior.depthMm;const r=run(project(),lookup,c);assert.equal(r.match.rows.find(x=>x.id==='BOX').status,'UNVERIFIED')});
test('supplier export BOM',()=>assert.equal(csv(result().review).csv.charCodeAt(0),65279));
test('supplier export shortages',()=>assert.match(csv(result().review).csv,/height_shortage_mm/));
test('supplier export status',()=>assert.match(csv(result().review).csv,/PRELIMINARY_MATCH/));
test('supplier export no fit',()=>assert.match(csv(result().review).csv,/"NO"/));
test('supplier export deterministic',()=>assert.deepEqual(csv(result().review),csv(result().review)));
test('supplier export formula safe',()=>{const c=candidates();c[0].id='=HYPERLINK("bad")';const r=run(project(),lookup,c);assert.match(csv(r.review).csv,/"'=HYPERLINK/);});
test('blocked review cannot export',()=>assert.equal(csv({status:'BLOCKED'}).status,'BLOCKED'));
test('supplier request for incomplete apparatus',()=>{const c={...catalog,'SKU-B':{...catalog['SKU-B'],heightMm:null}};const r=run(project(),id=>c[id],candidates());assert.ok(r.review.rows.find(x=>x.id==='BOX').requests.includes('SELECTED_APPARATUS_DIMENSIONS_INCOMPLETE'))});
test('supplier request for missing cabinet width',()=>{const c=candidates();delete c[0].usableInterior.widthMm;const r=run(project(),lookup,c);assert.ok(r.review.rows.find(x=>x.id==='BOX').requests.includes('USABLE_INTERIOR_WIDTH_MISSING'))});
test('supplier request for unknown rails',()=>{const c=candidates();c[0].railCapacity=null;const r=run(project(),lookup,c);assert.ok(r.review.rows.find(x=>x.id==='BOX').requests.includes('RAIL_CAPACITY_MISSING'))});
test('thermal checks remain outstanding',()=>assert.ok(result().review.rows[0].confirmationStillRequired.includes('WIRING_AND_THERMAL_REVIEW')));
test('supplier CSV CRLF',()=>assert.match(csv(result().review).csv,/\r\n$/));
test('supplier CSV row count',()=>assert.equal(csv(result().review).rows,2));
