'use strict';
// Shared offline preflight for exact manufacturer front assets. No network requests.
const fs=require('node:fs');
const path=require('node:path');
const MAX_BYTES=12*1024*1024;
const TYPES=Object.freeze({png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'});
function inspectRaster(file,expectedExt){
 const issues=[];
 let st,buf;
 try{st=fs.lstatSync(file);}catch(_){return {ok:false,issues:['FILE_MISSING'],mime:null};}
 if(st.isSymbolicLink()||!st.isFile())issues.push('NOT_REGULAR_FILE');
 if(st.size===0)issues.push('FILE_EMPTY');
 if(st.size>MAX_BYTES)issues.push('FILE_TOO_LARGE');
 const ext=(expectedExt||path.extname(file).slice(1)).toLowerCase();
 if(!Object.hasOwn(TYPES,ext))issues.push('EXTENSION_UNSUPPORTED');
 if(!issues.length){
  try{buf=fs.readFileSync(file);}catch(_){issues.push('FILE_UNREADABLE');}
 }
 if(buf){
  const png=buf.length>=24&&buf.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'));
  const jpeg=buf.length>=4&&buf[0]===255&&buf[1]===216&&buf[2]===255&&buf[buf.length-2]===255&&buf[buf.length-1]===217;
  const webp=buf.length>=20&&buf.toString('ascii',0,4)==='RIFF'&&buf.toString('ascii',8,12)==='WEBP'&&
   buf.readUInt32LE(4)===buf.length-8&&['VP8 ','VP8L','VP8X'].includes(buf.toString('ascii',12,16));
  if(!(ext==='png'&&png||(ext==='jpg'||ext==='jpeg')&&jpeg||ext==='webp'&&webp))
   issues.push('RASTER_SIGNATURE_MISMATCH');
  if(png){
   const width=buf.readUInt32BE(16),height=buf.readUInt32BE(20);
   if(!width||!height||width>12000||height>12000)issues.push('RASTER_DIMENSIONS_INVALID');
  }
 }
 return {ok:issues.length===0,issues,mime:TYPES[ext]||null,bytes:st.size};
}
function auditManufacturerFrontAssets(root,catalog,registry,resolve,keyOf){
 const issues=[],files=[],used=new Set(),keys=new Set();
 const items=Object.entries(catalog||{});
 if(!registry||typeof registry!=='object'||Array.isArray(registry))
  return {ok:false,issues:['REGISTRY_INVALID'],files:[]};
 for(const [key,asset] of Object.entries(registry)){
  if(keys.has(key)){issues.push('REGISTRY_KEY_DUPLICATE:'+key);continue;}
  keys.add(key);
  const matches=items.filter(([,device])=>keyOf(device)===key);
  if(matches.length!==1){issues.push('CATALOG_MATCH_COUNT:'+key);continue;}
  const verdict=resolve(matches[0][1],registry);
  if(verdict.status!=='REVIEWED_IMAGE'){issues.push('RECORD_REJECTED:'+key+':'+verdict.issues.join(','));continue;}
  if(used.has(asset.src)){issues.push('IMAGE_REUSED:'+asset.src);continue;}
  used.add(asset.src);
  const full=path.join(root,asset.src);
  const checked=inspectRaster(full,path.extname(asset.src).slice(1));
  if(!checked.ok){issues.push(...checked.issues.map(code=>code+':'+asset.src));continue;}
  files.push(asset.src);
 }
 return {ok:issues.length===0,issues,files};
}
module.exports={inspectRaster,auditManufacturerFrontAssets,MAX_BYTES,TYPES};
