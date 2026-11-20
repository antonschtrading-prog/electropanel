'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const designImpact=fs.readFileSync(path.join(root,'design-change-impact-v1.js'),'utf8');
const calculationReview=fs.readFileSync(path.join(root,'calculation-review-v1.js'),'utf8');

function env(){
 const c=vm.createContext({console,Date,Number,String,Array,Set,Map,Math,JSON,Object,
  syncBranchDevices:p=>p,ensureV2:()=>{},
  structuredCloneCompat:x=>JSON.parse(JSON.stringify(x)),
  localStorage:{setItem(){}},render(){},notify(){}});
 vm.runInContext(designImpact,c);
 vm.runInContext(calculationReview,c);
 vm.runInContext(app.slice(app.indexOf('const initial ='),app.indexOf('const historyUndo')),c);
 vm.runInContext(app.slice(app.indexOf('function changed(){'),app.indexOf('function switchView(view){')),c);
 return c;
}
const run=(c,code)=>vm.runInContext(code,c);

test('JSON-style project replacement does not compare circuits with previous project',()=>{
 const c=env();
 run(c,"state=demoCommercial();changed();state=demo();resetDesignBaseline();changed();");
 assert.equal(run(c,'state.title'),'Квартира · ЩР-1');
 assert.equal(run(c,'state.lines.length'),6);
 assert.equal(run(c,'state.lines.every(line=>line.calculationReview===undefined)'),true);
 assert.equal(run(c,'state.designReviewNoticeV1===undefined'),true);
 assert.equal(run(c,'lastDesignSnapshot.title'),'Квартира · ЩР-1');
 assert.equal(run(c,'lastDesignImpact===null'),true);
});

test('switching between built-in examples establishes an independent baseline',()=>{
 const c=env();
 run(c,"state=demo();changed();state=demoCommercial();resetDesignBaseline();changed();");
 assert.equal(run(c,'state.lines.length'),4);
 assert.equal(run(c,'state.lines.every(line=>line.calculationReview===undefined)'),true);
 assert.equal(run(c,'lastDesignSnapshot.title'),'Коммерция · небольшое помещение');
});

test('project replacement preserves review obligations already stored in the file',()=>{
 const c=env();
 run(c,"state=demo();state.lines[0].overloadInput={ibA:'4'};state.lines[0].calculationReview={required:true,reason:'EXISTING_REVIEW',pending:['overloadInput']};resetDesignBaseline();changed();");
 assert.equal(run(c,'state.lines[0].calculationReview.required'),true);
 assert.equal(run(c,'state.lines[0].calculationReview.reason'),'EXISTING_REVIEW');
 assert.equal(run(c,"state.lines[0].calculationReview.pending.join(',')"),'overloadInput');
});

test('genuine edits after project replacement still invalidate calculations',()=>{
 const c=env();
 run(c,"state=demoCommercial();changed();state=demo();resetDesignBaseline();changed();state.lines[0].power=1.3;changed();");
 assert.equal(run(c,'state.lines[0].calculationReview.required'),true);
 assert.equal(run(c,'state.lines[0].calculationReview.reason'),'LOAD_SOURCE_CHANGED');
});

test('all project-loading handlers reset baseline without changing undo behavior',()=>{
 for(const marker of ['state=demo();','state=demoCommercial();','state=loaded;']){
  const start=app.indexOf(marker);
  assert.ok(start>=0,marker);
  const end=app.indexOf("switchView('loads')",start);
  const handler=app.slice(start,end);
  assert.match(handler,/resetDesignBaseline\(\);changed\(\);$/,marker);
 }
 const history=app.slice(app.indexOf('function restoreHistory('),app.indexOf('function reorderLine('));
 assert.doesNotMatch(history,/resetDesignBaseline/);
});
