'use strict';
// Single source of truth for CI preview and production GitHub Pages assets.
// Only root-local CSS/HTML and JavaScript files explicitly referenced by HTML.
const fs=require('node:fs');
const path=require('node:path');
function buildSite(root=path.resolve(__dirname,'..'),output=path.join(root,'dist')){
 const index=path.join(root,'index.html');
 const html=fs.readFileSync(index,'utf8');
 const references=[...html.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]);
 if(references.length<2)throw Error('Missing local JavaScript references');
 if(new Set(references).size!==references.length)throw Error('Duplicate script reference');
 const files=['index.html','styles.css','browser_check.html'];
 for(const ref of references){
  if(!/^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.js$/.test(ref)||ref.includes('..'))
   throw Error('Unsafe or non-local script: '+ref);
  files.push(ref);
 }
 // An image that is not bundled must never be advertised in the published app.
 const imageFiles=[],seenImagePaths=new Set();
 if(references.includes('manufacturer-visual-library-v1.js')){
  const lib=require(path.join(root,'manufacturer-visual-library-v1.js'));
  const catalogue=require(path.join(root,'catalog.js')).EP_CATALOG;
  const registry=lib.EP_MANUFACTURER_FRONT_ASSETS_V1;
  if(!registry||typeof registry!=='object'||Array.isArray(registry))
   throw Error('Invalid manufacturer image registry');
  for(const [key,a] of Object.entries(registry)){
   const device=Object.values(catalogue||{}).find(d=>lib.epManufacturerFrontKeyV1(d)===key);
   if(!device)throw Error('Unlinked manufacturer image article: '+key);
   const result=lib.epManufacturerFrontResolveV1(device,registry);
   if(result.status!=='REVIEWED_IMAGE')throw Error('Manufacturer asset rejected: '+key+' '+result.issues.join(','));
   if(seenImagePaths.has(a.src))throw Error('Manufacturer image duplicated: '+a.src);
   seenImagePaths.add(a.src);imageFiles.push(a.src);
  }
 }
 files.push(...imageFiles);
 if(path.resolve(output)===path.resolve(root))throw Error('Output must not overwrite sources');
 fs.mkdirSync(output,{recursive:true});
 fs.rmSync(path.join(output,'assets','device-fronts'),{recursive:true,force:true});
 for(const name of files){
  const source=path.join(root,name);
  if(!fs.existsSync(source)||!fs.statSync(source).isFile()||fs.statSync(source).size===0)
   throw Error('Missing/empty published asset: '+name);
  const target=path.join(output,name);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(source,target);
 }
 fs.writeFileSync(path.join(output,'.nojekyll'),'');
 for(const file of files)if(!fs.existsSync(path.join(output,file)))throw Error('Not packaged: '+file);
 return {scripts:references.length,assets:files.length,files};
}
if(require.main===module){
 const result=buildSite();
 process.stdout.write('Electropanel Pages package OK: '+result.scripts+
  ' scripts / '+result.assets+' assets\n');
}
module.exports={buildSite};
