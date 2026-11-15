'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {epDisconnectionContextV1}=require('../disconnection-context-v1.js');
const {epFaultRouteHtmlV2,epDisconnectionContextFieldsV1}=require('../fault-route-ui-v2.js');
const {epEngineeringPrintV1}=require('../engineering-print-v1.js');
const fault=require('../fault-route-design-v2.js');
global.epDisconnectionContextV1=epDisconnectionContextV1;
global.epFaultRouteReviewV2=fault.epFaultRouteReviewV2;
const device={kind:'MCB',sku:'TEST',poles:1,inA:16,modules:1,label:'C16'};
const project=()=>({earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'TEST',
 cableDesignInput:{sectionMm2:2.5}}]});
const input=()=>({u0V:230,cmin:0.95,sourceROhm:0.1,sourceXOhm:0.05,
 networkSource:'grid',iaA:160,requiredTimeS:0.4,tripSource:'trip graph',
 timeSource:'time condition',
 segments:[{lengthM:25,phaseROhmKm:8,peROhmKm:8,phaseXOhmKm:0.08,peXOhmKm:0.08,
 source:'wire basis',temperatureBasisConfirmed:true}],
 disconnectionContext:{circuitClass:'FINAL_CIRCUIT',protectiveMeasure:'ADS_OVERCURRENT',
  earthing:'TN-S',phase:'L1',u0V:230,maxAllowedTimeS:0.2,
  standardReference:'engineer citation',timeBasisSource:'engineer limit basis',
  circuitClassSource:'engineer final circuit basis',applicabilityReviewed:true}});
test('disconnection UI provides opt-in context and no invented time limits',()=>{
 const html=epDisconnectionContextFieldsV1(null);
 assert.match(html,/name="adsMaxAllowedTimeS" value=""/);
 assert.match(html,/name="adsContextEnabled"/);
 assert.match(html,/name="adsStandardReference"/);
 assert.match(html,/DISTRIBUTION_CIRCUIT/);
 assert.doesNotMatch(html,/maxAllowedTimeS" value="0\.4"/);
});
test('TN route and print expose a blocking declared time overrun',()=>{
 const p=project();
 const out=fault.epApplyFaultRouteV2(p,'L1',input(),()=>device);
 assert.ok(out.project);
 assert.equal(out.report.disconnectionContext.numericalStatus,'FAIL');
 const html=epFaultRouteHtmlV2(out.project,'L1',()=>device);
 assert.match(html,/Ограничение времени/);
 assert.match(html,/0\.2/);
 const report=epEngineeringPrintV1({sections:{faultRoutes:fault.epFaultRouteProjectV2(out.project,()=>device)}});
 assert.match(report,/Основание времени автоматического отключения/);
 assert.match(report,/engineer citation/);
 assert.match(report,/engineer final circuit basis/);
 assert.match(report,/DISCONNECTION_REQUESTED_TIME_EXCEEDS_LIMIT/);
 assert.equal(out.report.engineeringApproved,false);
});
test('untrusted declared sources are escaped in printed dossier and UI',()=>{
 const p=project(),x=input();
 x.disconnectionContext.standardReference='<script>alert(1)</script>';
 const out=fault.epApplyFaultRouteV2(p,'L1',x,()=>device);
 assert.ok(out.project);
 const html=epFaultRouteHtmlV2(out.project,'L1',()=>device);
 const print=epEngineeringPrintV1({sections:{faultRoutes:fault.epFaultRouteProjectV2(out.project,()=>device)}});
 for(const source of [html,print]){
  assert.doesNotMatch(source,/<script>/);
  assert.match(source,/&lt;script&gt;/);
 }
});
test('real production app links opt-in ADS time fields to project action',()=>{
 const root=path.join(__dirname,'..');
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 assert.ok(html.indexOf('disconnection-context-v1.js')<html.indexOf('fault-route-design-v2.js'));
 assert.match(app,/adsContextEnabled/);
 assert.match(app,/input\.disconnectionContext=/);
});
