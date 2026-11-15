'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {epFaultRouteHtmlV2,epTripEnvelopeFieldsV1}=require('../fault-route-ui-v2.js');
const route=require('../fault-route-design-v2.js');
const {epTripEnvelopeV1}=require('../trip-envelope-v1.js');
const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
global.epTripEnvelopeV1=epTripEnvelopeV1;
global.epFaultRouteReviewV2=route.epFaultRouteReviewV2;
const article={kind:'MCB',sku:'TEST',inA:16,poles:1,curve:'C'};
const p=()=>({earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'TEST',
 cableDesignInput:{sectionMm2:2.5}}]});
const input=()=>({u0V:230,cmin:0.95,sourceROhm:0.1,sourceXOhm:0.05,
 networkSource:'grid study',iaA:160,requiredTimeS:0.4,
 tripSource:'manufacturer',timeSource:'time selection',
 segments:[{lengthM:25,phaseROhmKm:8,peROhmKm:8,phaseXOhmKm:.08,peXOhmKm:.08,
 source:'line source',temperatureBasisConfirmed:true}],
 tripEnvelope:{articleSku:'TEST',articleRatingA:16,curve:'C',
 source:'manual of manufacturer series',faultType:'L_PE',
 guaranteeBasisConfirmed:true,points:[{currentA:100,maxTimeS:2},
 {currentA:160,maxTimeS:.4},{currentA:320,maxTimeS:.1}]}});
test('optional envelope fields do not block ordinary TN fault-route submission',()=>{
 const html=epTripEnvelopeFieldsV1(null);
 assert.match(html,/name="tripEnvelopeEnabled"/);
 assert.doesNotMatch(html,/<input required data-trip-point-field/);
 assert.match(html,/data-add-trip-point/);
});
test('TN route UI exposes declared manufacturer guarantees and protects text',()=>{
 const source=input();source.tripEnvelope.source='<svg onload="alert(1)">';
 const saved=route.epApplyFaultRouteV2(p(),'L1',source,()=>article);
 assert.ok(saved.project);
 const html=epFaultRouteHtmlV2(saved.project,'L1',()=>article);
 assert.doesNotMatch(html,/<svg onload/);
 assert.match(html,/&lt;svg/);
 assert.match(html,/data-trip-envelope-panel/);
 assert.match(html,/PRELIMINARY_WITHIN_ENVELOPE/);
 assert.match(html,/data-trip-envelope-point/);
});
test('engineering print exports independent numerical outcome and provenance',()=>{
 const project=p();const out=route.epApplyFaultRouteV2(project,'L1',input(),()=>article);
 assert.ok(out.project);
 const report=route.epFaultRouteProjectV2(out.project,()=>article);
 const html=epEngineeringPrintV1({sections:{faultRoutes:report}});
 assert.match(html,/Паспортная огибающая времени отключения/);
 assert.match(html,/manual of manufacturer series/);
 assert.match(html,/PRELIMINARY_WITHIN_ENVELOPE/);
 assert.match(html,/160/);
 assert.doesNotMatch(html,/engineeringApproved=true/);
});
test('production HTML and app route handler load the optional envelope module',()=>{
 const dir=path.resolve(__dirname,'..');
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(dir,'app.js'),'utf8');
 assert.ok(html.indexOf('trip-envelope-v1.js')<html.indexOf('fault-route-design-v2.js'));
 assert.match(app,/tripEnvelopeEnabled/);
 assert.match(app,/data-trip-envelope-point/);
 assert.match(app,/epTripEnvelopePointHtmlV1/);
});
