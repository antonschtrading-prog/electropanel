'use strict';
// Port of electropanel/cable_tables_v31.py from archived v4.14.
// Uses supplied rows ONLY. Never creates reference ampacity values or approval.
// Exact decimal comparison uses overload-v30.js BigInt primitives.
const EP_CABLE31_KEYS=Object.freeze(['conductor_material','insulation','cores_loaded','installation_method','ambient_c','cross_section_mm2','reference_id','table_id','row_id']);
const EP_CABLE31_NUMERIC=Object.freeze(['ambient_c','cores_loaded','cross_section_mm2']);
function epCable31Decimal(x,allowZero=false,allowNegative=false){
 if(typeof x==='boolean'||x===null||x===undefined||(typeof x!=='string'&&typeof x!=='number'))return null;
 if(typeof x==='number'&&!Number.isFinite(x))return null;
 let txt=String(x).trim();
 if(txt.length>128)return null;
 let neg=false;
 if(txt.startsWith('-')){if(!allowNegative)return null;neg=true;txt=txt.slice(1);}
 const zero=/^\+?(?:0+(?:\.0*)?|\.0+)(?:[eE][+-]?\d+)?$/.test(txt);
 if(zero){if(!allowZero)return null;return {sign:0,coefficient:0n,exponent:0,key:'0'};}
 const d=epV30Decimal(txt);
 if(!d)return null;
 const magnitude=d.coefficient.toString().length+d.exponent-1;
 if(magnitude>100||magnitude< -100)return null;
 return {sign:neg?-1:1,coefficient:d.coefficient,exponent:d.exponent,
  key:(neg?'-':'')+d.coefficient.toString()+'e'+d.exponent};
}
function epCable31Compare(a,b){
 if(a.sign!==b.sign)return a.sign>b.sign?1:-1;
 if(a.sign===0)return 0;
 const r=epV30Compare(a,b);
 return a.sign===-1?-r:r;
}
function epCable31ContextValue(record,key){
 if(!record||typeof record!=='object')return null;
 const val=record[key];
 if(EP_CABLE31_NUMERIC.includes(key)){
  const d=epCable31Decimal(val,key==='ambient_c',key==='ambient_c');
  if(!d||key!=='ambient_c'&&d.sign<=0)return null;
  if(key==='cores_loaded'&&d.exponent<0)return null;
  return 'num:'+d.key;
 }
 return typeof val==='string'&&val.trim()?'str:'+val:null;
}
function epCable31Audit(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Object expected');
 const source=payload.source&&typeof payload.source==='object'&&!Array.isArray(payload.source)?payload.source:{};
 const rows=payload.rows===undefined?[]:payload.rows;
 if(!Array.isArray(rows)||rows.length>10000)throw Error('rows must be a list of no more than 10000 entries');
 const problems=[],add=(code,location,extra={})=>problems.push({code,location,...extra});
 for(const field of ['designation','edition','publisher','source_url','document_sha256','verification_status'])
  if(typeof source[field]!=='string'||!source[field].trim())add('SOURCE_FIELD_MISSING','source.'+field);
 if(typeof source.document_sha256==='string'&&source.document_sha256&&!/^[a-fA-F0-9]{64}$/.test(source.document_sha256))
  add('SOURCE_HASH_INVALID','source.document_sha256');
 if(source.verification_status!=='INDEPENDENTLY_VERIFIED')add('SOURCE_NOT_VERIFIED','source.verification_status');
 add('DOCUMENT_AUTHENTICITY_UNPROVEN','source');
 const seen=new Set();
 for(let i=0;i<rows.length;i++){
  const row=rows[i],loc='rows['+i+']';
  if(!row||typeof row!=='object'||Array.isArray(row)){add('ROW_NOT_OBJECT',loc);continue;}
  for(const key of EP_CABLE31_KEYS)
   if(row[key]===undefined||row[key]===null||row[key]==='')add('ROW_FIELD_MISSING',loc+'.'+key);
  for(const key of ['ambient_c','cores_loaded','cross_section_mm2'])
   if(epCable31ContextValue(row,key)===null)add('ROW_DIMENSION_INVALID',loc+'.'+key);
  if(!epCable31Decimal(row.iz_a))add('AMPACITY_INVALID',loc+'.iz_a');
  const id=JSON.stringify(EP_CABLE31_KEYS.map(k=>epCable31ContextValue(row,k)));
  if(seen.has(id))add('DUPLICATE_TABLE_ROW',loc);
  seen.add(id);
 }
 const structural=new Set(['SOURCE_FIELD_MISSING','SOURCE_HASH_INVALID','ROW_NOT_OBJECT',
  'ROW_FIELD_MISSING','ROW_DIMENSION_INVALID','AMPACITY_INVALID','DUPLICATE_TABLE_ROW']);
 return {schema_version:'3.1',row_count:rows.length,
  structural_status:rows.length&&!problems.some(p=>structural.has(p.code))?'PASS':'FAIL',
  normative_status:'UNVERIFIED',ready_for_installation:false,
  table_sha256:null,hash_status:'NOT_PORTED_CANONICAL_JSON',
  problems};
}
function epCable31Assess(payload){
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Object expected');
 const table=payload.table,context=payload.context;
 if(!table||!context||typeof table!=='object'||typeof context!=='object'||Array.isArray(table)||Array.isArray(context))
  throw Error('table and context objects required');
 const audit=epCable31Audit(table),issues=[...audit.problems],add=(code,location,extra={})=>issues.push({code,location,...extra});
 const matches=[];
 for(let i=0;i<table.rows.length;i++){
  const row=table.rows[i];
  if(!row||typeof row!=='object'||Array.isArray(row))continue;
  if(EP_CABLE31_KEYS.every(k=>epCable31ContextValue(row,k)!==null&&epCable31ContextValue(row,k)===epCable31ContextValue(context,k)))
   matches.push([i,row]);
 }
 if(matches.length!==1)add('NO_UNIQUE_APPLICABLE_TABLE_ROW','context',{count:matches.length});
 const factors=payload.factors;
 if(!Array.isArray(factors)||factors.length===0||factors.length>32)add('FACTORS_REQUIRED','factors');
 const factorList=Array.isArray(factors)&&factors.length>0&&factors.length<=32?factors:[];
 const validFactors=[];
 for(let i=0;i<factorList.length;i++){
  const f=factorList[i],loc='factors['+i+']';
  if(!f||typeof f!=='object'||Array.isArray(f)||!['name','source_locator'].every(k=>typeof f[k]==='string'&&f[k].trim()))
   add('FACTOR_SOURCE_MISSING',loc);
  const k=f&&typeof f==='object'?epCable31Decimal(f.value):null;
  if(!k||epV30Compare(k,epV30Decimal('1'))>0)add('FACTOR_INVALID_OR_REVIEW',loc);
  else validFactors.push(k);
 }
 const ib=epCable31Decimal(payload.ib_a),inn=epCable31Decimal(payload.in_a),i2=epCable31Decimal(payload.i2_a);
 if(!ib||!inn||!i2)add('CURRENT_INPUT_INVALID','currents');
 let numeric='UNKNOWN',computed={};
 if(matches.length===1&&audit.structural_status==='PASS'&&validFactors.length===factorList.length&&
  validFactors.length>0&&ib&&inn&&i2&&!issues.some(x=>x.code==='FACTOR_SOURCE_MISSING')){
  let iz=epCable31Decimal(matches[0][1].iz_a);
  for(const k of validFactors)iz={...epV30Multiply(iz,k),sign:1};
  const limit=epV30Multiply(iz,epV30Decimal('1.45'));
  const cond1=epV30Compare(ib,inn)<=0&&epV30Compare(inn,iz)<=0;
  const cond2=epV30Compare(i2,limit)<=0;
  numeric=cond1&&cond2?'PASS':'FAIL';
  const fmt=v=>epV30Format(v);
  computed={table_row_index:matches[0][0],corrected_iz_a:fmt(iz),
   condition_1:cond1,condition_2:cond2,i2_limit_a:fmt(limit)};
 }
 return {schema_version:'3.1',numeric_status:numeric,normative_status:'UNVERIFIED',
  ready_for_installation:false,computed,issues,table_audit:audit,
  notice:'Supplied-data check only; not built-in normative ampacity, source or authenticity verification.'};
}