'use strict';
// A provenance gate for product records. No invented ratings or geometry.
function epCatalogEvidence(article){
 const issues=[];
 if(!article||typeof article!=='object'||Array.isArray(article))return {status:'BLOCKED',issues:[{code:'ARTICLE_INVALID'}],verified:false};
 for(const key of ['maker','series','sku','source']){
  if(typeof article[key]!=='string'||!article[key].trim())issues.push({code:key.toUpperCase()+'_MISSING'});
 }
 if(typeof article.source==='string'&&article.source.trim()&&!/^https:\/\/[^\s]+$/i.test(article.source))issues.push({code:'SOURCE_URL_INVALID'});
 for(const key of ['poles','modules','inA','widthMm']){
  if(typeof article[key]!=='number'||!Number.isFinite(article[key])||article[key]<=0)issues.push({code:key.toUpperCase()+'_INVALID'});
 }
 if(typeof article.poles==='number'&&!Number.isInteger(article.poles))issues.push({code:'POLES_NOT_INTEGER'});
 if(typeof article.modules==='number'&&!Number.isInteger(article.modules))issues.push({code:'MODULES_NOT_INTEGER'});
 const appearance=article.appearanceEvidence;
 if(!appearance||typeof appearance!=='object'||!['original-stylized','licensed-image','manufacturer-cad'].includes(appearance.kind))
  issues.push({code:'APPEARANCE_PROVENANCE_MISSING'});
 else if(appearance.kind!=='original-stylized'&&(!appearance.source||!appearance.license))issues.push({code:'APPEARANCE_RIGHTS_MISSING'});
 // A URL is evidence provenance, not proof that a product rating was independently verified.
 return {status:issues.length?'INCOMPLETE':'DOCUMENTED_UNVERIFIED',issues,verified:false};
}
if(typeof module!=='undefined'&&module.exports)module.exports={epCatalogEvidence};
