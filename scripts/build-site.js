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
 const imageFiles=[];
 if(references.includes('manufacturer-visual-library-v1.js')){
  const lib=require(path.join(root,'manufacturer-visual-library-v1.js'));
  const intake=require('../manufacturer-front-intake-v1.js');
  const catalogue=require(path.join(root,'catalog.js')).EP_CATALOG;
  const report=intake.auditManufacturerFrontAssets(root,catalogue,
   lib.EP_MANUFACTURER_FRONT_ASSETS_V1,lib.epManufacturerFrontResolveV1,lib.epManufacturerFrontKeyV1);
  if(!report.ok){
   const first=report.issues[0]||'UNKNOWN';
   if(first.startsWith('FILE_MISSING:'))throw Error('Missing/empty published asset: '+first);
   if(first.startsWith('CATALOG_MATCH_COUNT:'))throw Error('Unlinked manufacturer image article: '+first);
   if(first.startsWith('IMAGE_REUSED:'))throw Error('Manufacturer image duplicated: '+first);
   throw Error('Manufacturer asset rejected: '+report.issues.join('; '));
  }
  imageFiles.push(...report.files);
 }
 files.push(...imageFiles);
 const rootPath=path.resolve(root),outPath=path.resolve(output);
 if(outPath===rootPath||rootPath.startsWith(outPath+path.sep))
  throw Error('Output must not overwrite source root or its parent');
 if(fs.existsSync(output)&&fs.lstatSync(output).isSymbolicLink())
  throw Error('Output directory must not be a symlink');
 fs.mkdirSync(output,{recursive:true});
 fs.rmSync(path.join(output,'assets','device-fronts'),{recursive:true,force:true});
 for(const name of files){
  const source=path.join(root,name);
  if(!fs.existsSync(source)||!fs.statSync(source).isFile()||fs.lstatSync(source).isSymbolicLink()||fs.statSync(source).size===0)
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
