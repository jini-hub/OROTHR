import fs from 'node:fs';import path from 'node:path';
const src='android-assets',dst='android/app/src/main/res';
if(!fs.existsSync(dst))throw Error('Android project missing: run npx cap add android');
for(const dir of fs.readdirSync(src)){const from=path.join(src,dir);if(!fs.statSync(from).isDirectory())continue;fs.mkdirSync(path.join(dst,dir),{recursive:true});for(const name of fs.readdirSync(from))fs.copyFileSync(path.join(from,name),path.join(dst,dir,name));}
console.log('OROT HR Android icons applied.');
