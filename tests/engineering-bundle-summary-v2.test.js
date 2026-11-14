'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epEngineeringBundleV1}=require('../engineering-bundle-v1.js');
test('bundle exposes blocked and unresolved sections without implying approval',()=>{const b=epEngineeringBundleV1({title:'Draft',lines:[]},()=>null);assert.ok(Array.isArray(b.blockedSections));assert.ok(Array.isArray(b.unresolvedSections));assert.ok(b.blockedSections.includes('dossier'));assert.ok(b.issueCount>=b.blockedSections.length);assert.equal(b.overallStatus,'BLOCKED');assert.equal(b.engineeringApproved,false);});
test('bundle never trusts saved engineering approval',()=>{const b=epEngineeringBundleV1({title:'Example',lines:[],engineeringApproved:true,ready_for_installation:true},()=>null);assert.equal(b.engineeringApproved,false);assert.equal(b.ready_for_installation,false);});
