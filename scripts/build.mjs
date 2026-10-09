import fs from 'node:fs';import path from 'node:path';
const root=process.cwd(),src=path.join(root,'app'),out=path.join(root,'www');
if(!fs.existsSync(src)) throw Error('app folder not found');
fs.rmSync(out,{recursive:true,force:true});fs.cpSync(src,out,{recursive:true});
console.log('OROT HR built static web app:',out);
