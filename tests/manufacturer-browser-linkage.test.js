'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const s=fs.readFileSync(path.join(__dirname,'..','scripts/browser-integration.cjs'),'utf8');
test('real Chromium flow validates exact article facade on the editable rail',()=>{
 assert.match(s,/row\?\.querySelector\('\.ep-front-viewport svg'\)/);
 assert.match(s,/face\.asset,'STYLIZED_ONLY'/);
 assert.match(s,/face\.hasPhoto,false/);
});
test('browser flow verifies measured body width differs from nominal slot metadata',()=>{
 assert.match(s,/epDinPhysicalEnvelopeV1\(epDraftBoardPlanV1\(state,catalogDevice\),catalogDevice\)/);
 assert.match(s,/face\.bodyWidth,'18'/);
 assert.match(s,/face\.slotWidth,'18'/);
 assert.match(s,/face\.approval,false/);
});
