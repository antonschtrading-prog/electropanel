'use strict';
// Compact user-entered enclosure dimensions. Missing values remain unknown.
function epCabinetEnclosureInputV1(text){
 const fail=code=>({status:'BLOCKED',code,items:[]});
 if(typeof text!=='string'||text.length>20000)return fail('ENCLOSURE_INPUT_TOO_LARGE');
 if(!text.trim())return {status:'REVIEW_REQUIRED',items:[],code:'ENCLOSURE_INPUT_EMPTY'};
 let items;
 if(text.trim().startsWith('[')){
  try{items=JSON.parse(text)}catch(_){return fail('ENCLOSURE_INPUT_JSON_INVALID')}
 }else{
  const lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length>100)return fail('ENCLOSURE_INPUT_TOO_MANY');
  items=lines.map(line=>{
   const parts=line.split(';').map(x=>x.trim());
   if(parts.length!==7)return null;
   const [id,manufacturer,article,width,height,depth,rails]=parts;
   const num=s=>s===''?null:Number(s.replace(',','.'));
   return {id,manufacturer:manufacturer||null,article:article||null,
    usableInterior:{widthMm:num(width),heightMm:num(height),depthMm:num(depth)},
    railCapacity:num(rails)};
  });
 }
 if(!Array.isArray(items)||items.length>100||items.some(x=>!x||typeof x!=='object'||Array.isArray(x)))
  return fail('ENCLOSURE_INPUT_SHAPE_INVALID');
 const ids=new Set();
 for(const item of items){
  if(typeof item.id!=='string'||!item.id.trim()||item.id.length>80||ids.has(item.id))
   return fail('ENCLOSURE_INPUT_ID_INVALID');
  ids.add(item.id);
  if(item.manufacturer!==undefined&&item.manufacturer!==null&&typeof item.manufacturer!=='string'||
   item.article!==undefined&&item.article!==null&&typeof item.article!=='string')
   return fail('ENCLOSURE_INPUT_TEXT_INVALID');
  const dim=item.usableInterior;
  if(dim!==undefined&&dim!==null&&
   (typeof dim!=='object'||Array.isArray(dim)||
    Object.keys(dim).some(k=>!['widthMm','heightMm','depthMm'].includes(k))))
   return fail('ENCLOSURE_INPUT_DIMENSIONS_INVALID');
  if(['widthMm','heightMm','depthMm'].some(k=>dim?.[k]!=null&&
   (typeof dim[k]!=='number'||!Number.isFinite(dim[k])||dim[k]<=0||dim[k]>5000)))
   return fail('ENCLOSURE_INPUT_DIMENSIONS_INVALID');
  if(item.railCapacity!=null&&(!Number.isInteger(item.railCapacity)||
   item.railCapacity<1||item.railCapacity>100))
   return fail('ENCLOSURE_INPUT_RAILS_INVALID');
 }
 return {status:'REVIEW_REQUIRED',code:'ENCLOSURE_INPUT_PARSED',items,
  note:'Only explicitly supplied usable interior values are used. Missing dimensions remain unknown.'};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCabinetEnclosureInputV1};
