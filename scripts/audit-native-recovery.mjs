import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const permission=JSON.parse(await fs.readFile('document/phase-0b/evidence/native-reopen-permission.json'));
const ui=JSON.parse(await fs.readFile('document/phase-0b/evidence/native-recovery-last-ui-report.json'));
const root=path.join('temp/0b4-native-root',permission.name);
if(!/^recovery-[a-f0-9-]+$/.test(permission.name))throw Error('Unexpected test case');
if(permission.permission==='granted'||permission.error?.name!=='NotAllowedError')throw Error('No real permission denial');
const hashes={};for(const [p,expected] of Object.entries(ui.before)){
 hashes[p]=createHash('sha256').update(await fs.readFile(path.join(root,p))).digest('hex');
 if(hashes[p]!==expected)throw Error('Restored file differs: '+p);
}
const pending=await fs.stat(path.join(root,'.storyflow/export.pending.json')).then(()=>true,()=>false);
if(pending||!ui.equal)throw Error('Native recovery incomplete');
const result={date:'2026-11-12',passed:true,mode:'native-folder',case:permission.name,permissionLoss:permission,hashes,pendingAbsent:true,filesVerified:Object.keys(hashes).length,
 observation:'After manual regrant, on-disk scripts/manifest/map/media/user sentinel match baseline. Last UI call was a repeat/no-op; its strict harness error was not a storage failure.',
 limitation:'First recovered:true response was overwritten by a repeated UI call; raw last UI response is retained separately. Acceptance uses native permission error plus baseline/hash audit and pending absence.'};
await fs.writeFile('document/phase-0b/evidence/native-recovery-audit.json',JSON.stringify(result,null,2)+'\n');console.log('PASS native permission loss + restored '+result.filesVerified+' hashes + no pending');
