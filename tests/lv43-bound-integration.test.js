'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.join(__dirname,'..');
const js=['typical-lv-v43.js'].map(p=>fs.readFileSync(path.join(root,p),'utf8')).join('\n');
const {epLV43BoundLine}=vm.runInNewContext(js+'\n({epLV43BoundLine})');
function inputs(){
 return {
 scope:{installation_category:'ordinary_commercial',voltage_system:'AC_230_400_V_50_HZ',
  supply_architecture:'single_utility_source',special_installation:false},
 tn_disconnection:{earthing_system:'TN',source_impedance_included:true,temperature_basis_checked:true,
  disconnection_time_limit_verified:true,trip_curve_source_verified:true,u0_v:230,
  zs_ohm:'0.98',ia_a_at_required_disconnection_time:160,minimum_voltage_factor:'0.95'},
 voltage_drop:{method:'explicit_conductor_R_X_at_operating_temperature',phase_configuration:'single_phase_L_N',
  conductor_temperature_verified:true,total_route_verified:true,r_ohm_per_conductor:'0.44',
  x_ohm_per_conductor:'0.004',power_factor:1,design_voltage_v:230,max_drop_percent:5}
 };
}
const line=(change={})=>({id:'L1',phase:'L1',overloadInput:{ibA:'12'},lv43Input:inputs(),...change});
test('TN line uses project current from existing overloadInput, not imported duplicate current',()=>{
 const p={earthing:'TN-S'},l=line({lv43Input:{...inputs(),design_current_a:'0.01'}});
 const r=epLV43BoundLine(p,l);
 assert.equal(r.design_current_origin,'line.overloadInput.ibA');
 assert.equal(r.declared_ib_a,'12');
 assert.equal(r.tn.status,'PASS');
 assert.equal(r.voltage_drop.status,'PASS');
 assert.equal(r.ready_for_installation,false);
});
test('change of project earthing or line phase blocks old TN check',()=>{
 assert.equal(epLV43BoundLine({earthing:'TT'},line()).status,'BLOCKED');
 assert.equal(epLV43BoundLine({earthing:'TN-S'},line({phase:'3Ф'})).status,'BLOCKED');
});
test('missing authoritative Ib does not invent voltage drop PASS',()=>{
 const r=epLV43BoundLine({earthing:'TN-S'},line({overloadInput:undefined}));
 assert.equal(r.voltage_drop.status,'UNKNOWN');
 assert.equal(r.engineeringApproved,false);
});
test('stale input remains blocker after apparatus change until explicitly reviewed',()=>{
 const l=line({calculationReview:{required:true,pending:['lv43Input']}});
 assert.equal(epLV43BoundLine({earthing:'TN-S'},l).status,'BLOCKED');
});
test('numeric failures block, while all pass still requires engineer review',()=>{
 const d=inputs();d.tn_disconnection.ia_a_at_required_disconnection_time=400;
 assert.equal(epLV43BoundLine({earthing:'TN-S'},line({lv43Input:d})).status,'BLOCKED');
 assert.equal(epLV43BoundLine({earthing:'TN-S'},line()).status,'UNKNOWN');
});
test('line normalization is narrow and rejects hidden overriding fields',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf('function normalizeLV43Import(value){');
 const end=app.indexOf('function normalizeV30Import(value){',start);
 assert.ok(start>=0&&end>start);
 const fn=vm.runInNewContext(app.slice(start,end)+'\nnormalizeLV43Import');
 const v=fn({...inputs(),design_current_a:'999'});
 assert.equal(v.design_current_a,undefined);
 assert.throws(()=>fn({...inputs(),extraOverride:1}));
 assert.throws(()=>fn({...inputs(),tn_disconnection:{...inputs().tn_disconnection,certificate:true}}));
});
test('module loaded before app and Pages packages it',()=>{
 const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const publish=fs.readFileSync(path.join(root,'.github/workflows/publish.yml'),'utf8');
 const first=html.indexOf('src="typical-lv-v43.js"'),last=html.indexOf('src="app.js"');
 assert.ok(first>=0&&first<last);
 assert.ok(publish.includes('typical-lv-v43.js'));
 assert.ok(html.includes('id="lv43SaveLine"'));
});