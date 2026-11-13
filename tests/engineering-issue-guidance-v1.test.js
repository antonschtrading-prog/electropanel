'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epIssueGuidanceV1:guide,EP_ISSUE_GUIDANCE_V1:map}=require('../engineering-issue-guidance-v1');
test('all known engineering issues have nonempty Russian title and action',()=>{
 for(const [code,entry] of Object.entries(map)){
  assert.equal(entry.length,2,code);assert.ok(entry[0].length>8,code);
  assert.ok(entry[1].length>8,code);assert.equal(guide(code).known,true);
 }
});
test('critical cable overload and breaking capacity explanations are distinct',()=>{
 assert.notEqual(guide('IN_GT_IZ').title,guide('ICN_LT_DECLARED_IK').title);
 assert.match(guide('IN_GT_IZ').action,/кабель/);
 assert.match(guide('ICN_LT_DECLARED_IK').action,/КЗ/);
});
test('unknown code never claims success or engineering approval',()=>{
 const r=guide('UNKNOWN_ISSUE');assert.equal(r.known,false);
 assert.match(r.action,/Проверьте/);
});
test('hostile issue code is never reflected into trusted guidance',()=>{
 const r=guide('<script>');assert.equal(r.known,false);
 assert.doesNotMatch(r.title,/<script>/);
});
