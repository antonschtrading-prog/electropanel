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
 if(path.resolve(output)===path.resolve(root))throw Error('Output must not overwrite sources');
 fs.mkdirSync(output,{recursive:true});
 for(const name of files){
  const source=path.join(root,name);
  if(!fs.existsSync(source)||!fs.statSync(source).isFile()||fs.statSync(source).size===0)
   throw Error('Missing/empty published asset: '+name);
  fs.copyFileSync(source,path.join(output,name));
 }
 fs.writeFileSync(path.join(output,'.nojekyll'),'');
 const shipped=new Set(fs.readdirSync(output));
 for(const file of files)if(!shipped.has(file))throw Error('Not packaged: '+file);
 return {scripts:references.length,assets:files.length,files};
}
if(require.main===module){
 const result=buildSite();
 process.stdout.write('Electropanel Pages package OK: '+result.scripts+
  ' scripts / '+result.assets+' assets\n');
}
module.exports={buildSite};
