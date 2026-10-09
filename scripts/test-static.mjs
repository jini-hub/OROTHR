import fs from 'node:fs';import path from 'node:path';
const list=['app/index.html','app/styles.css','app/app.js','app/data.js','app/sync.js','app/sw.js','app/manifest.webmanifest','worker/index.js','worker/migrations/0001_schema.sql','scripts/build.mjs','.github/workflows/pages.yml','.github/workflows/android.yml','android-assets/mipmap-mdpi/ic_launcher.png'];
for(const f of list){if(!fs.existsSync(f))throw Error(`Missing ${f}`)}
console.log('Static file checks passed:',list.length,'files');
