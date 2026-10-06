import {readFile,readdir,mkdir,rm,writeFile,cp} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
const assets={};
for(const file of await readdir('public'))assets['/'+file]=await readFile('public/'+file,'utf8');
await writeFile('dist/server/index.js','const assets='+JSON.stringify(assets)+';\n'+await readFile('worker/index.js','utf8'));
await mkdir('dist/.openai',{recursive:true});
await cp('.openai/hosting.json','dist/.openai/hosting.json');
