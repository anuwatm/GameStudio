import {LocalProject,readFile,writeFile,sha256,safePath} from "./local-folder.mjs";

function assert(value,message) { if(!value) throw new Error(message); }
async function rejects(fn,fragment) {
  try {await fn();} catch(error) {
    if(fragment && !String(error).includes(fragment)) throw error;
    return;
  }
  throw new Error("Expected rejection: "+fragment);
}
async function snapshot(root) {
  const paths=["game/user.rpy","game/assets/probe.webm",".storyflow/sourcemap.json",
    "game/storyflow_generated/sf_manifest.json",
    "game/storyflow_generated/sf_runtime.rpy","game/storyflow_generated/sf_story.rpy",
    "game/storyflow_generated/sf_variables.rpy","game/storyflow_generated/sf_schedule.rpy"];
  return Object.fromEntries(await Promise.all(paths.map(async p=>{
    const bytes=await readFile(root,p);return [p,bytes===null?null:await sha256(bytes)];
  })));
}

export async function tests(root,bundle) {
  // Never reuse a previous test run's files or conflicts.
  root=await root.getDirectoryHandle("run-"+crypto.randomUUID(),{create:true});
  const report=[];
  const clip=new Uint8Array(await (await fetch("./probe.webm")).arrayBuffer());
  let counter=0;
  async function fresh() {
    const dir=await root.getDirectoryHandle("case-"+(++counter),{create:true});
    await writeFile(dir,"game/user.rpy","# owned by user\n");
    await writeFile(dir,"game/assets/probe.webm",clip);
    return dir;
  }
  async function test(name,fn) {
    const start=performance.now();
    await fn();
    report.push({name,passed:true,ms:performance.now()-start});
  }
  await test("unsafe paths rejected",async()=>{
    for(const p of ["../x","/x","C:/x","x\\y","x/../y","x//y","NUL","x."]) {
      await rejects(()=>Promise.resolve(safePath(p)),"Unsafe relative path");
    }
  });
  await test("export twice and preserve media/user files",async()=>{
    const dir=await fresh();
    const adapter=new LocalProject(dir);
    const assetFile=await (await (await dir.getDirectoryHandle("game")).getDirectoryHandle("assets")).getFileHandle("probe.webm");
    const before=await assetFile.getFile();
    await adapter.export(bundle);
    const first=await snapshot(dir);
    await adapter.export(bundle);
    assert(JSON.stringify(first)===JSON.stringify(await snapshot(dir)),"Second export differs");
    const after=await assetFile.getFile();
    assert(before.lastModified===after.lastModified && before.size===after.size,"Asset rewritten");
    assert(await sha256(await adapter.asset("probe.webm"))===await sha256(clip),"Asset bytes differ");
    await rejects(()=>adapter.asset("../user.rpy"),"Unsafe relative path");
  });
  await test("hash conflict and unowned collision stop before writing",async()=>{
    const dir=await fresh(), adapter=new LocalProject(dir);
    await adapter.export(bundle);
    const path=Object.keys(bundle.files)[0];
    await writeFile(dir,path,"# manually edited");
    const before=await snapshot(dir);
    await rejects(()=>adapter.export(bundle),"File conflict");
    assert(JSON.stringify(before)===JSON.stringify(await snapshot(dir)),"Conflict modified files");
    const another=await fresh();
    await writeFile(another,path,"# user file with generated name");
    await rejects(()=>new LocalProject(another).export(bundle),"Unowned file collision");
    assert(await readFile(another,".storyflow/export.pending.json")===null,"Collision started transaction");
  });
  const changed=structuredClone(bundle);
  for(const path in changed.files) changed.files[path]+="\n# revision two\n";
  changed.subgraphStructure={...changed.subgraphStructure,revision:2};
  for(const stage of ["pending","file","sourceMap","manifest"]) {
    await test("interrupt "+stage+" then reopen and recover",async()=>{
      const dir=await fresh();
      await new LocalProject(dir).export(bundle);
      const before=await snapshot(dir);
      const fail=new LocalProject(dir,{fault:async point=>{
        if(point===stage) throw new Error("Simulated interruption");
      }});
      await rejects(()=>fail.export(changed),"Simulated interruption");
      const reopened=new LocalProject(dir);
      const result=await reopened.recover();
      assert(result.recovered,"No pending recovery");
      if(stage==="manifest") {
        assert(result.committed,"Committed export was not kept");
        await new LocalProject(dir).export(changed);
      } else {
        assert(JSON.stringify(before)===JSON.stringify(await snapshot(dir)),"Restored set differs");
      }
      assert(await readFile(dir,".storyflow/export.pending.json")===null,"Pending not cleared");
    });
  }
  await test("NotAllowedError after first file remains recoverable",async()=>{
    const dir=await fresh();
    await new LocalProject(dir).export(bundle);
    const before=await snapshot(dir);
    await rejects(()=>new LocalProject(dir,{fault:async point=>{
      if(point==="file") throw new DOMException("Simulated permission loss","NotAllowedError");
    }}).export(changed),"NotAllowedError");
    await new LocalProject(dir).recover();
    assert(JSON.stringify(before)===JSON.stringify(await snapshot(dir)),"Permission recovery differs");
  });
  await test("recovery refuses external changes",async()=>{
    const dir=await fresh();
    await new LocalProject(dir).export(bundle);
    await rejects(()=>new LocalProject(dir,{fault:async point=>{
      if(point==="file") throw new Error("Interrupted");
    }}).export(changed),"Interrupted");
    const path=Object.keys(bundle.files)[0];
    await writeFile(dir,path,"# external edit after crash");
    await rejects(()=>new LocalProject(dir).recover(),"Recovery conflict");
    assert(new TextDecoder().decode(await readFile(dir,path))==="# external edit after crash","External edit lost");
  });
  await test("Subgraph warning and Source Map",async()=>{
    const dir=await fresh(),adapter=new LocalProject(dir);
    await adapter.export(bundle);
    const result=await adapter.export(changed);
    assert(result.warnings.length===1,"Save warning missing");
    const map=JSON.parse(new TextDecoder().decode(await readFile(dir,".storyflow/sourcemap.json")));
    let node=false,choice=false;
    for(const [path,lines] of Object.entries(map.files)) {
      const source=bundle.files[path].split("\n");
      for(const [line,owner] of Object.entries(lines)) {
        assert(source[Number(line)-1]!==undefined,"Invalid source line");
        if(source[Number(line)-1]==="label sf_scene_000000000006:") {
          assert(owner.nodeId==="00000000-0000-4000-8000-000000000006","Wrong scene mapping");node=true;
        }
        if(source[Number(line)-1].includes('"Accept" if')) {
          assert(owner.nodeId==="00000000-0000-4000-8000-000000000006" && owner.choiceId==="00000000-0000-4000-8000-000000000015","Wrong choice mapping");choice=true;
        }
      }
    }
    assert(node&&choice,"Node/choice mapping missing");
  });
  const dir=await fresh(), adapter=new LocalProject(dir);
  await adapter.export(bundle);
  const start=performance.now();
  await adapter.export(changed);
  const exportMs=performance.now()-start;
  return {report,exportMs,storage:root.name};
}
