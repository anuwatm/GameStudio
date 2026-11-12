// Node regression driver for the browser adapter. Uses real temporary files,
// implements the handle methods exercised here; does not emulate OS permissions.
import * as fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {LocalProject,readFile,writeFile,sha256} from '../web/local-folder.mjs';
import {tests} from '../web/local-folder-test.mjs';
const base=path.resolve('temp/phase-0b2-'+Date.now());
await fs.mkdir(base,{recursive:true});
const locks=new Map();
Object.defineProperty(navigator,'locks',{value:{request(name,fn){
 const old=locks.get(name)||Promise.resolve();const result=old.catch(()=>{}).then(fn);
 locks.set(name,result);return result;
}}});
function missing(){return new DOMException('Missing','NotFoundError');}
class Dir {
 constructor(p){this.path=p;this.name=path.basename(p);}
 async getDirectoryHandle(name,{create=false}={}){
  const p=path.join(this.path,name);if(create)await fs.mkdir(p,{recursive:true});
  if(!await fs.stat(p).catch(()=>null))throw missing();return new Dir(p);
 }
 async getFileHandle(name,{create=false}={}){
  const p=path.join(this.path,name);if(create){const h=await fs.open(p,'a');await h.close();}
  if(!await fs.stat(p).catch(()=>null))throw missing();
  return {async getFile(){const s=await fs.stat(p);return new File([await fs.readFile(p)],name,{lastModified:s.mtimeMs});},
   async createWritable(){let data;const tmp=p+'.swap-'+crypto.randomUUID();return {
    async write(v){data=v;},async close(){await fs.writeFile(tmp,data);await fs.rename(tmp,p);},
    async abort(){await fs.unlink(tmp).catch(()=>{});}
   };}};
 }
 async removeEntry(name){try{await fs.unlink(path.join(this.path,name));}catch(e){if(e.code==='ENOENT')throw missing();throw e;}}
}
const cli=path.resolve(process.argv[2] || 'temp/rust-target/debug/sf-cli.exe');
const fixture=JSON.parse(await fs.readFile('contract/fixtures/summer-house.json'));
async function bundle(project,name){const input=path.join(base,name+'.project.json'),output=path.join(base,name+'.bundle.json');
 await fs.writeFile(input,JSON.stringify(project));execFileSync(cli,['bundle',input,output]);return JSON.parse(await fs.readFile(output));}
const original=await bundle(fixture,'original');
const clip=await fs.readFile(process.argv[3] || 'temp/0b-prototype/probe.webm');
globalThis.fetch=async()=>new Response(clip);
const initial=await tests(new Dir(base),original);
const report=[...initial.report];
const evidence={};
async function check(name,fn){const t=performance.now();await fn();report.push({name,passed:true,ms:performance.now()-t});}
let count=0;async function fresh(){const p=path.join(base,'regression-'+(++count));await fs.mkdir(p);return new Dir(p);}
const pending='.storyflow/export.pending.json',manifest='game/storyflow_generated/sf_manifest.json';
const decode=v=>new TextDecoder().decode(v);
async function snapshot(root){const out={};async function walk(p){for(const entry of await fs.readdir(p,{withFileTypes:true})){
 const full=path.join(p,entry.name);if(entry.isDirectory())await walk(full);else{const rel=path.relative(root.path,full).replaceAll('\\','/');if(!rel.startsWith('.storyflow/backups/'))out[rel]=await sha256(await fs.readFile(full));}}}await walk(root.path);return out;}
await check('prepared set exists before pending; commit manifest last',async()=>{
 const root=await fresh(),stages=[];
 await new LocalProject(root,{fault:async(stage,p)=>{stages.push(stage);
 if(stage==='prepared'){assert.equal(await readFile(root,pending),null);const staged=JSON.parse(decode(await readFile(root,p)));assert.deepEqual(staged.files,original.files);}
 if(stage==='sourceMap')assert.equal(await readFile(root,manifest),null);
 }}).export(original);
 assert.equal(stages[0],'prepared');assert.equal(stages.at(-1),'manifest');assert.equal(await readFile(root,pending),null);
 evidence.commitOrder=stages;
});
await check('corrupted backup refuses recovery without changing files',async()=>{
 const root=await fresh();await new LocalProject(root).export(original);
 await assert.rejects(new LocalProject(root,{fault:async s=>{if(s==='file')throw Error('interrupt');}}).export(original),/interrupt/);
 const journal=JSON.parse(decode(await readFile(root,pending)));
 await writeFile(root,journal.backupPath,'{}');const before=await snapshot(root);
 await assert.rejects(new LocalProject(root).recover(),/backup hash conflict/);assert.deepEqual(await snapshot(root),before);
});
await check('concurrent recovery and export serialize without mixed output',async()=>{
 const root=await fresh();await new LocalProject(root).export(original);
 await assert.rejects(new LocalProject(root,{fault:async s=>{if(s==='file')throw Error('interrupt');}}).export(original),/interrupt/);
 await Promise.all([new LocalProject(root).recover(),new LocalProject(root).export(original)]);
 assert.equal(await readFile(root,pending),null);
 for(const [p,s] of Object.entries(original.files))assert.equal(decode(await readFile(root,p)),s);
});
await check('external Source Map modification during export is preserved',async()=>{
 const root=await fresh();await new LocalProject(root).export(original);let modified=false;
 await assert.rejects(new LocalProject(root,{fault:async s=>{if(s==='file'&&!modified){modified=true;await writeFile(root,'.storyflow/sourcemap.json','external map');}}}).export(original),/Source Map changed/);
 assert.equal(decode(await readFile(root,'.storyflow/sourcemap.json')),'external map');
 await assert.rejects(new LocalProject(root).recover(),/Source Map (changed|conflict)/);
});
await check('removed owned file rolls back after interruption and disappears on commit',async()=>{
 const root=await fresh();await new LocalProject(root).export(original);
 const changed=structuredClone(original),removed=Object.keys(changed.files)[0];delete changed.files[removed];delete changed.sourceMap.files[removed];
 const before=await snapshot(root);
 await assert.rejects(new LocalProject(root,{fault:async(s,p)=>{if(s==='file'&&p===removed)throw Error('interrupt');}}).export(changed),/interrupt/);
 await new LocalProject(root).recover();assert.deepEqual(await snapshot(root),before);
 await new LocalProject(root).export(changed);assert.equal(await readFile(root,removed),null);
});
await check('recovery after first export interruption removes only new generated files',async()=>{
 const root=await fresh();await writeFile(root,'game/user.rpy','# user');
 await assert.rejects(new LocalProject(root,{fault:async s=>{if(s==='file')throw Error('interrupt');}}).export(original),/interrupt/);
 const result=await new LocalProject(root).recover();assert.equal(result.committed,false);
 assert.equal(decode(await readFile(root,'game/user.rpy')),'# user');
 for(const p of Object.keys(original.files))assert.equal(await readFile(root,p),null);
});
await check('identical choice text maps to distinct known choice IDs',async()=>{
 const project=structuredClone(fixture);const scene=project.nodes.find(n=>n.choices?.length===2);
 scene.choices[1].text=scene.choices[0].text;const b=await bundle(project,'duplicate-choice');
 const p='game/storyflow_generated/sf_story.rpy';const lines=b.files[p].split('\n');
 const rows=lines.map((s,i)=>({s,i})).filter(v=>v.s.trimStart().startsWith('"Accept" if'));
 assert.equal(rows.length,2);for(let i=0;i<2;i++)assert.deepEqual(b.sourceMap.files[p][rows[i].i+1],{nodeId:scene.id,choiceId:scene.choices[i].id});
 evidence.sourceMap=rows.map(v=>({path:p,line:v.i+1,...b.sourceMap.files[p][v.i+1]}));
});
await check('edit one scene through CLI bundle and reexport; warning only for structure',async()=>{
 const root=await fresh();await new LocalProject(root).export(original);
 const project=structuredClone(fixture),scene=project.nodes.find(n=>n.choices?.length===2);
 const start=performance.now();scene.lines[0].text='แก้ฉากหนึ่งครั้ง';
 const changed=await bundle(project,'scene-edit');const result=await new LocalProject(root).export(changed);
 evidence.sceneEditToExportMs=performance.now()-start;evidence.timingBoundary='in-memory scene text edit -> project JSON write -> native CLI bundle process -> filesystem adapter export commit';
 assert.deepEqual(result.warnings,[]);
 const moved=structuredClone(project);const edge=moved.edges.find(e=>e.from===scene.id&&e.port===scene.choices[0].id);
 edge.to=moved.edges.find(e=>e.from===scene.id&&e.port==='fallback').to;
 const structural=await bundle(moved,'structure-edit');assert.equal((await new LocalProject(root).export(structural)).warnings.length,1);
 assert.deepEqual((await new LocalProject(root).export(structural)).warnings,[]);
});
const result={timestampUTC:new Date().toISOString(),mode:'node-filesystem-handles',node:process.version,platform:process.platform,base,report,evidence,
 limitations:['Node handle adapter is not a browser native picker or OS permission test','Actual tab close/permission loss remains Phase 0b.4']};
await fs.writeFile(process.argv[4] || 'document/phase-0b/evidence/transaction-report.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:report.length,sceneEditToExportMs:evidence.sceneEditToExportMs,base}));
