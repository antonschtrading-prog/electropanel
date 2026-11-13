'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {EP_DIN_CATEGORIES_V1,epDinCatalogValidateV1:validate,epDinCatalogTemplateV1:template}=require('../din-catalog-schema-v1.js');
test('11 classes of DIN and panel devices are represented',()=>assert.equal(Object.keys(EP_DIN_CATEGORIES_V1).length,11));
test('every category has a nonapproved neutral template',()=>{
 for(const c of Object.keys(EP_DIN_CATEGORIES_V1)){
  const x=template(c);assert.equal(x.visual.mode,'NEUTRAL_PLACEHOLDER');
  assert.equal(validate(x).engineeringApproved,false);
 }
});
test('unknown class is rejected',()=>assert.equal(validate({category:'MAGIC'}).status,'BLOCKED'));
test('verified record requires evidence',()=>{
 const r={...template('MCB'),verificationStatus:'VERIFIED'};
 assert.ok(validate(r).issues.some(x=>x.code==='VERIFIED_REQUIRES_SOURCE'));
});
test('fire suppression never auto approves missing certification',()=>{
 const r=validate(template('FIRE_SUPPRESSION'));
 assert.ok(r.issues.some(x=>x.code==='FIRE_CERTIFICATION_UNVERIFIED'));
});
test('invalid dimensions block',()=>{
 const r=template('DIN_PSU');r.geometry.widthMm=-5;
 assert.equal(validate(r).status,'BLOCKED');
});
test('no guessed activation temperature',()=>{
 const r=template('FIRE_SUPPRESSION');
 assert.equal(r.activationTemperatureC,undefined);
});
