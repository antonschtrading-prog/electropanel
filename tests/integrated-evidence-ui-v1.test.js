'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {epIntegratedEvidenceHtmlV1}=require('../integrated-evidence-ui-v1');
test('renders counts and escapes untrusted issue fields',()=>{
 const html=epIntegratedEvidenceHtmlV1({issues:[{scope:'<img src=x onerror=alert(1)>',code:'IB_GT_IN',status:'BLOCKED'},{code:'MISSING',status:'UNKNOWN'}]});
 assert.match(html,/Блокирующих замечаний: <b>1<\/b>/);
 assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);
});
test('handles missing review',()=>assert.match(epIntegratedEvidenceHtmlV1(null),/недоступен/));
test('no approval claim',()=>assert.doesNotMatch(epIntegratedEvidenceHtmlV1({issues:[]}),/соответствие подтверждено/i));
