'use strict';
// Ports document byte integrity from evidence_v34.py and independent cable
// provenance check from tt_cable_v45.py of the recovered v4.14 package.
// Uses native HTTPS browser WebCrypto; no network calls, external services
// or manufacturer authenticity assertions.
function epCableDecimal(value,positive=true) {
 if(typeof value==='boolean'||value===null||value===undefined||typeof value==='object')return null;
 const raw=String(value).trim();
 if(!positive&&/^[+]?0+(?:\.0*)?(?:[eE][+-]?\d{1,5})?$/.test(raw))
  return {coefficient:0n,exponent:0};
 const d=epV30Decimal(value);
 if(!d)return null;
 const magnitude=d.coefficient.toString().length+d.exponent-1;
 if(magnitude>8||magnitude< -8)return null;
 return d;
}
function epCableFormat(value) {
 if(value.coefficient===0n)return '0';
 const digits=value.coefficient.toString(),exp=value.exponent;
 if(exp>=0&&exp<40)return digits+'0'.repeat(exp);
 const pos=digits.length+exp;
 if(exp<0&&pos>0)return digits.slice(0,pos)+'.'+digits.slice(pos);
 if(exp<0&&pos>=-5)return '0.'+'0'.repeat(-pos)+digits;
 return epV30Format(value);
}
function epCableDecodeBase64(base64) {
 if(typeof base64!=='string'||base64.length>2000000)
  throw Error('Missing or oversized base64 document');
 if(!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))
  throw Error('Invalid base64 document');
 const binary=atob(base64);
 if(binary.length<1||binary.length>1000000)
  throw Error('Document must be 1..1000000 bytes');
 const data=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)data[i]=binary.charCodeAt(i);
 return data;
}
async function epVerifyDocumentBytesV34(payload) {
 if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Object expected');
 const hash=payload.expected_sha256;
 if(typeof hash!=='string'||!/^[a-fA-F0-9]{64}$/.test(hash))
  throw Error('expected_sha256 must be 64 hex characters');
 const bytes=epCableDecodeBase64(payload.base64);
 const subtle=globalThis.crypto?.subtle;
 if(!subtle)throw Error('WebCrypto unavailable; cannot verify bytes');
 const digest=new Uint8Array(await subtle.digest('SHA-256',bytes));
 const actual=Array.from(digest,x=>x.toString(16).padStart(2,'0')).join('');
 return {schema_version:'3.4',byte_count:bytes.length,actual_sha256:actual,
  integrity_status:actual===hash.toLowerCase()?'PASS':'FAIL',
  authenticity_status:'UNVERIFIED',normative_status:'UNVERIFIED',
  ready_for_design:false,ready_for_installation:false,
  notice:'Hash comparison validates only submitted bytes against submitted digest.'};
}
async function epCableProvenanceV45(data) {
 const answer=(status,issues,extra={})=>({
  status,issues,ready_for_design:false,ready_for_installation:false,...extra
 });
 if(!data||typeof data!=='object'||Array.isArray(data))
  return answer('UNKNOWN',['CABLE_DATA_MISSING']);
 const required=['manufacturer','product_code','datasheet_title','datasheet_revision',
  'datasheet_sha256','datasheet_page','conductor_material','cross_section_mm2',
  'r20_ohm_per_km','x_ohm_per_km','alpha_per_c'];
 if(required.some(k=>data[k]===undefined||data[k]===null||data[k]===''||data[k]===false))
  return answer('UNKNOWN',['CABLE_DATASHEET_FIELDS_MISSING']);
 if(['manufacturer','product_code','datasheet_title','datasheet_revision','datasheet_page']
   .some(k=>typeof data[k]!=='string'||!data[k].trim()))
  return answer('UNKNOWN',['CABLE_IDENTIFIERS_INVALID']);
 const h=data.datasheet_sha256;
 if(typeof h!=='string'||!/^[a-fA-F0-9]{64}$/.test(h))
  return answer('UNKNOWN',['CABLE_DOCUMENT_SHA256_INVALID']);
 if(!['Cu','Al'].includes(data.conductor_material))
  return answer('UNKNOWN',['CABLE_MATERIAL_UNSUPPORTED']);
 const s=epCableDecimal(data.cross_section_mm2),r=epCableDecimal(data.r20_ohm_per_km);
 const x=epCableDecimal(data.x_ohm_per_km,false),a=epCableDecimal(data.alpha_per_c,false);
 if(!s||!r||!x||!a||epV30Compare(a,epV30Decimal('0.01'))>0)
  return answer('UNKNOWN',['CABLE_CHARACTERISTICS_INVALID']);
 if(typeof data.datasheet_base64!=='string')
  return answer('UNKNOWN',['CABLE_DOCUMENT_BYTES_NOT_SUPPLIED']);
 let evidence;
 try{evidence=await epVerifyDocumentBytesV34({base64:data.datasheet_base64,expected_sha256:h});}
 catch(error){return answer('UNKNOWN',['CABLE_DOCUMENT_BYTES_INVALID']);}
 if(evidence.integrity_status!=='PASS')
  return answer('FAIL',['CABLE_DOCUMENT_SHA256_MISMATCH']);
 if(data.manufacturer_origin_verified!==true)
  return answer('UNKNOWN',['CABLE_MANUFACTURER_ORIGIN_NOT_VERIFIED']);
 if(data.independent_row_review_verified!==true)
  return answer('UNKNOWN',['CABLE_ROW_NOT_INDEPENDENTLY_REVIEWED']);
 return answer('PASS',[],{
  cable_data:{manufacturer:data.manufacturer.trim(),product_code:data.product_code.trim(),
   cross_section_mm2:epCableFormat(s),conductor_material:data.conductor_material,
   r20_ohm_per_km:epCableFormat(r),x_ohm_per_km:epCableFormat(x),
   alpha_per_c:epCableFormat(a),datasheet_sha256:h.toLowerCase()},
  source_byte_count:evidence.byte_count,
  evidence_state:'ATTESTED_BY_SUBMITTER_NOT_CERTIFIED_BY_SOFTWARE'
 });
}
