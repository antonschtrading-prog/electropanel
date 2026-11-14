'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epFaultRouteReviewV2:review,epApplyFaultRouteV2:apply,epFaultRouteProjectV2:projectReview}=require('../fault-route-design-v2');
const article={kind:'MCB',sku:'TEST',inA:16,poles:1,curve:'C'};
const lookup=()=>article;
const project=()=>({earthing:'TN-S',lines:[{id:'L1',phase:'L1',catalogSku:'TEST',modules:1,cableDesignInput:{sectionMm2:2.5},faultInput:{ikKa:5,source:'max fault study'}}]});
const input=()=>({u0V:230,cmin:0.95,sourceROhm:0.1,sourceXOhm:0.05,networkSource:'network study',iaA:160,requiredTimeS:0.4,tripSource:'device curve at 0.4 s',timeSource:'project applicability review',segments:[{lengthM:25,phaseROhmKm:8,peROhmKm:8,phaseXOhmKm:0.08,peXOhmKm:0.08,source:'documented conductor R/X at design temperature',temperatureBasisConfirmed:true}]});
test('independent reference example sums both conductors and source R/X',()=>{
 const out=apply(project(),'L1',input(),lookup);assert.ok(out.project);
 const r=out.report;assert.equal(r.loopROhm,0.5);assert.ok(Math.abs(r.loopXOhm-0.054)<1e-12);
 assert.ok(Math.abs(r.zsOhm-0.502907546175227)<1e-12);assert.ok(Math.abs(r.ikMinA-434.4734964940521342253260862787993861692)<1e-9);assert.equal(r.thresholdStatus,'PASS');assert.equal(r.engineeringApproved,false);
});
test('multiple segments and separate maximum current are retained',()=>{
 const p=project(),x=input();x.segments=[{...x.segments[0],lengthM:10},{...x.segments[0],lengthM:15}];
 const before=JSON.stringify(p),out=apply(p,'L1',x,lookup);
 assert.equal(out.report.loopROhm,0.5);assert.equal(out.project.lines[0].faultInput.ikKa,5);assert.equal(out.report.maxFaultCurrentKa,5);assert.equal(JSON.stringify(p),before);
});
test('genuine failing threshold is saved as a correctable engineering result',()=>{
 const x=input();x.iaA=500;const out=apply(project(),'L1',x,lookup);assert.ok(out.project);assert.equal(out.report.status,'BLOCKED');assert.equal(out.report.thresholdStatus,'FAIL');
});
test('TT, unsupported topology and missing phase never give a passing comparison',()=>{
 const p=project();p.earthing='TT';assert.equal(apply(p,'L1',input(),lookup).project,null);
 const out=apply(project(),'L1',input(),lookup).project;out.lines[0].faultRouteInput.model='PARALLEL';assert.equal(review(out,out.lines[0],lookup).status,'BLOCKED');
 const q=project();q.lines[0].phase='';assert.equal(apply(q,'L1',input(),lookup).report.thresholdStatus,'UNKNOWN');
});
test('article replacement, changed rating and changed cable invalidate the documented comparison',()=>{
 for(const change of [p=>p.lines[0].catalogSku='NEW',p=>p.lines[0].cableDesignInput.sectionMm2=4,p=>p.earthing='TN-C-S']){
  const p=apply(project(),'L1',input(),lookup).project;change(p);const r=review(p,p.lines[0],lookup);assert.equal(r.stale,true);assert.equal(r.thresholdStatus,'UNKNOWN');
 }
 const p=apply(project(),'L1',input(),lookup).project;assert.equal(review(p,p.lines[0],()=>({...article,inA:20})).stale,true);
});
test('missing sources, temperature, trip/time evidence and unsupported apparatus remain unknown',()=>{
 for(const change of [x=>x.networkSource='',x=>x.tripSource='',x=>x.timeSource='',x=>x.segments[0].source='',x=>x.segments[0].temperatureBasisConfirmed=false]){
  const x=input();change(x);const out=apply(project(),'L1',x,lookup);assert.ok(out.project);assert.equal(out.report.thresholdStatus,'UNKNOWN');
 }
 assert.equal(apply(project(),'L1',input(),()=>({...article,kind:'RCD'})).report.thresholdStatus,'UNKNOWN');
});
test('malformed numeric input and unreasonable scope are rejected',()=>{
 for(const change of [x=>x.cmin=1.1,x=>x.u0V=10000,x=>x.sourceROhm=true,x=>x.segments=[],x=>x.segments[0].lengthM=-1,x=>x.segments[0].phaseROhmKm='1e309',x=>x.segments[0].phaseXOhmKm=-1]){
  const x=input();change(x);assert.equal(apply(project(),'L1',x,lookup).project,null);
 }
});
test('comma decimals are supported, project report carries circuit IDs',()=>{
 const x=input();x.sourceROhm='0,1';const p=apply(project(),'L1',x,lookup).project;
 assert.equal(projectReview(p,lookup).rows[0].loopROhm,0.5);
 const blank=projectReview(project(),lookup);assert.equal(blank.issues[0].lineId,'L1');
});
