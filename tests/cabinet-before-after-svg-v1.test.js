'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
global.epCabinetOptionDinSvgV1=require('../cabinet-option-din-svg-v1').epCabinetOptionDinSvgV1;
const {epCabinetBeforeAfterSvgV1:render}=require('../cabinet-before-after-svg-v1');
const p=()=>({status:'REVIEW_REQUIRED',summary:{oldRailCount:2,oldCapacity:6},
 rails:[{railIndex:0,capacity:3},{railIndex:1,capacity:3}],
 rows:[{deviceId:'G',fromRail:0,fromSlot:0,toRail:1,toSlot:2,modules:1,changed:true},
 {deviceId:'B',fromRail:1,fromSlot:0,toRail:1,toSlot:0,modules:2,changed:false}]});
test('returns ready',()=>assert.equal(render(p()).status,'REVIEW_REQUIRED'));
test('returns before svg',()=>assert.match(render(p()).before,/^<svg/));
test('returns after svg',()=>assert.match(render(p()).after,/^<svg/));
test('returns distinct diagrams',()=>assert.notEqual(render(p()).before,render(p()).after));
test('before has G',()=>assert.match(render(p()).before,/G — без изменений/));
test('after marks G moved',()=>assert.match(render(p()).after,/G — изменено/));
test('before has rail 1',()=>assert.match(render(p()).before,/DIN 1/));
test('after has rail 2',()=>assert.match(render(p()).after,/DIN 2/));
test('before G is on first rail',()=>assert.match(render(p()).before,/G — без изменений/));
test('no approval',()=>assert.equal(render(p()).engineeringApproved,false));
test('no installation approval',()=>assert.equal(render(p()).ready_for_installation,false));
test('null blocked',()=>assert.equal(render(null).status,'BLOCKED'));
test('blocked preview blocked',()=>assert.equal(render({...p(),status:'BLOCKED'}).status,'BLOCKED'));
test('missing rows blocked',()=>assert.equal(render({...p(),rows:null}).status,'BLOCKED'));
test('missing rails blocked',()=>assert.equal(render({...p(),rails:null}).status,'BLOCKED'));
test('missing summary blocked',()=>assert.equal(render({...p(),summary:null}).status,'BLOCKED'));
test('zero rail count blocked',()=>assert.equal(render({...p(),summary:{oldRailCount:0,oldCapacity:6}}).status,'BLOCKED'));
test('noninteger rail count blocked',()=>assert.equal(render({...p(),summary:{oldRailCount:1.5,oldCapacity:6}}).status,'BLOCKED'));
test('nondivisible old capacity blocked',()=>assert.equal(render({...p(),summary:{oldRailCount:4,oldCapacity:6}}).status,'BLOCKED'));
test('oversized rail blocked',()=>assert.equal(render({...p(),summary:{oldRailCount:1,oldCapacity:201}}).status,'BLOCKED'));
test('deterministic',()=>assert.deepEqual(render(p()),render(p())));
test('does not mutate preview',()=>{const x=p(),s=JSON.stringify(x);render(x);assert.equal(JSON.stringify(x),s)});
test('svg has accessible role',()=>assert.match(render(p()).before,/role="img"/));
test('svg contains no images',()=>assert.doesNotMatch(render(p()).after,/<image /));
test('before G has no moved color',()=>assert.doesNotMatch(render(p()).before,/#fef3c7/));
test('after G has moved color',()=>assert.match(render(p()).after,/#fef3c7/));
