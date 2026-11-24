import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const file of readdirSync('tests').filter(name=>name.endsWith('.mjs')&&!['sharing-rules.mjs','ocr-quota-integration.mjs'].includes(name)).sort()){
 const result=spawnSync(process.execPath,['--import','tsx','tests/'+file],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
}
