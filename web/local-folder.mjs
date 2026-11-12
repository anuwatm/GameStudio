const GENERATED = "game/storyflow_generated/";
const MANIFEST = GENERATED + "sf_manifest.json";
const PENDING = ".storyflow/export.pending.json";
const SOURCE_MAP = ".storyflow/sourcemap.json";
const encoder = new TextEncoder();

export function safePath(path) {
  if (typeof path !== "string" || !path || /[\\:\u0000-\u001f]/.test(path) ||
      path.split("/").some(p => !p || p === "." || p === ".." || /[. ]$/.test(p) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p))) {
    throw new Error("Unsafe relative path: " + path);
  }
  return path;
}

export async function sha256(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map(b => b.toString(16).padStart(2,"0")).join("");
}

async function parent(root, path, create = false) {
  const parts = safePath(path).split("/");
  const name = parts.pop();
  let dir = root;
  for (const part of parts) dir = await dir.getDirectoryHandle(part,{create});
  return {dir,name};
}

async function read(root,path) {
  try {
    const {dir,name} = await parent(root,path);
    return new Uint8Array(await (await dir.getFileHandle(name)).getFile().then(f=>f.arrayBuffer()));
  } catch(error) {
    if (error.name === "NotFoundError") return null;
    throw error;
  }
}

async function write(root,path,value) {
  const {dir,name} = await parent(root,path,true);
  const file = await dir.getFileHandle(name,{create:true});
  const stream = await file.createWritable();
  try { await stream.write(value); await stream.close(); }
  catch(error) { await stream.abort().catch(()=>{}); throw error; }
}

async function remove(root,path) {
  try {
    const {dir,name} = await parent(root,path);
    await dir.removeEntry(name);
  } catch(error) { if(error.name !== "NotFoundError") throw error; }
}

async function readJson(root,path) {
  const value=await read(root,path);
  return value===null ? null : JSON.parse(new TextDecoder().decode(value));
}

function ownedFiles(files) {
  if (!files || typeof files !== "object" || Array.isArray(files)) throw new Error("Invalid file list");
  for (const path of Object.keys(files)) {
    safePath(path);
    if (!path.startsWith(GENERATED) || path === MANIFEST || path.slice(GENERATED.length).includes("/") || !path.endsWith(".rpy")) {
      throw new Error("Unowned export path: "+path);
    }
  }
}

async function verify(root,files) {
  for (const [path,hash] of Object.entries(files)) {
    const bytes=await read(root,path);
    if (bytes===null || await sha256(bytes)!==hash) throw new Error("File conflict: "+path);
  }
}

async function manifest(root) {
  const value=await readJson(root,MANIFEST);
  if(value!==null) {
    if(value.version!==1 || typeof value.projectId!=="string") throw new Error("Invalid manifest");
    ownedFiles(value.files);
    if(Object.values(value.files).some(v=>typeof v!=="string" || !/^[a-f0-9]{64}$/.test(v))) throw new Error("Invalid manifest hash");
  }
  return value;
}

export class LocalProject {
  constructor(root,{fault=async()=>{}}={}) { this.root=root; this.fault=fault; }

  async asset(path) {
    safePath(path);
    const bytes=await read(this.root,"game/assets/"+path);
    if(bytes===null) throw new Error("Missing asset: "+path);
    return bytes;
  }

  async export(bundle) {
    bundle=structuredClone(bundle);
    if(typeof bundle.projectId!=="string" || !bundle.projectId || !bundle.sourceMap || bundle.subgraphStructure===undefined) throw new Error("Invalid export bundle");
    ownedFiles(bundle.files);
    if(Object.values(bundle.files).some(v=>typeof v!=="string")) throw new Error("Export requires text files");
    // One origin-wide lock also protects an empty folder opened under two IDs.
    const lock="storyflow-export";
    return navigator.locks.request(lock,()=>this.exportLocked(bundle));
  }

  async exportLocked(bundle) {
    await this.recoverLocked();
    const old=await manifest(this.root);
    if(old && old.projectId!==bundle.projectId) throw new Error("Project ID conflict");
    await verify(this.root,old?.files || {});
    const paths=new Set([...Object.keys(old?.files || {}),...Object.keys(bundle.files)]);
    for(const path of paths) {
      if(!old?.files[path] && await read(this.root,path)!==null) throw new Error("Unowned file collision: "+path);
    }
    const hashes={};
    for(const [path,source] of Object.entries(bundle.files)) hashes[path]=await sha256(source);
    const fingerprint=await sha256(JSON.stringify(bundle.subgraphStructure));
    const next={version:1,projectId:bundle.projectId,files:hashes,subgraphFingerprint:fingerprint};
    const nextManifest=JSON.stringify(next,null,2)+"\n";
    const oldMap=await read(this.root,SOURCE_MAP);
    const oldManifest=await read(this.root,MANIFEST);
    const backup={version:1,files:{},manifest:oldManifest?new TextDecoder().decode(oldManifest):null,
      sourceMap:oldMap?new TextDecoder().decode(oldMap):null};
    for(const path of paths) {
      const bytes=await read(this.root,path);
      backup.files[path]=bytes===null?null:new TextDecoder().decode(bytes);
    }
    const backupPath=".storyflow/backups/"+crypto.randomUUID()+"/export.json";
    const nextMap=JSON.stringify(bundle.sourceMap,null,2)+"\n";
    const staged={files:bundle.files,sourceMap:nextMap,manifest:nextManifest};
    const stagePath=backupPath.replace("export.json","next.json");
    const backupText=JSON.stringify(backup);
    await write(this.root,backupPath,backupText);
    await write(this.root,stagePath,JSON.stringify(staged));
    await this.fault("prepared",stagePath);
    const journal={version:1,projectId:bundle.projectId,backupPath,newManifestHash:await sha256(nextManifest),newHashes:hashes,
      backupHash:await sha256(backupText),
      oldMapHash:oldMap?await sha256(oldMap):null,newMapHash:await sha256(nextMap),
      oldManifestHash:oldManifest?await sha256(oldManifest):null};
    await write(this.root,PENDING,JSON.stringify(journal));
    await this.fault("pending",PENDING);
    for(const path of paths) {
      // Recheck each file immediately before replacing to detect external changes.
      const current=await read(this.root,path);
      const previous=backup.files[path];
      if((current===null)!==(previous===null) ||
          (current!==null && await sha256(current)!==await sha256(previous))) throw new Error("File changed during export: "+path);
      if(path in bundle.files) await write(this.root,path,bundle.files[path]);
      else await remove(this.root,path);
      await this.fault("file",path);
    }
    const currentMap=await read(this.root,SOURCE_MAP);
    if((currentMap===null)!==(oldMap===null) ||
       (currentMap && await sha256(currentMap)!==await sha256(oldMap))) throw new Error("Source Map changed during export");
    await write(this.root,SOURCE_MAP,nextMap);
    await this.fault("sourceMap",SOURCE_MAP);
    const currentManifest=await read(this.root,MANIFEST);
    if((currentManifest===null)!==(oldManifest===null) ||
       (currentManifest && await sha256(currentManifest)!==await sha256(oldManifest))) throw new Error("Manifest changed during export");
    await write(this.root,MANIFEST,nextManifest);
    await this.fault("manifest",MANIFEST);
    await remove(this.root,PENDING);
    return {files:Object.keys(hashes),warnings:old && old.subgraphFingerprint!==fingerprint
      ? ["Subgraph changed; older saves may fail to load."] : [],sourceMap:SOURCE_MAP};
  }

  async recover() {
    // The same lock namespace as export prevents rollback racing another export.
    const journal=await readJson(this.root,PENDING);
    if(!journal) return {recovered:false};
    if(typeof journal.projectId!=="string") throw new Error("Invalid recovery project");
    return navigator.locks.request("storyflow-export",()=>this.recoverLocked());
  }

  async recoverLocked() {
    const journal=await readJson(this.root,PENDING);
    if(!journal) return {recovered:false};
    if(journal.version!==1 || !/^\.storyflow\/backups\/[a-f0-9-]+\/export\.json$/.test(journal.backupPath)) throw new Error("Invalid recovery journal");
    ownedFiles(journal.newHashes);
    const backupBytes=await read(this.root,journal.backupPath);
    if(!backupBytes || await sha256(backupBytes)!==journal.backupHash) throw new Error("Recovery backup hash conflict");
    const backup=JSON.parse(new TextDecoder().decode(backupBytes));
    if(backup?.version!==1) throw new Error("Missing recovery backup");
    ownedFiles(backup.files);
    const currentManifest=await read(this.root,MANIFEST);
    if(currentManifest && await sha256(currentManifest)===journal.newManifestHash) {
      await verify(this.root,journal.newHashes);
      const map=await read(this.root,SOURCE_MAP);
      if(!map || await sha256(map)!==journal.newMapHash) throw new Error("Committed Source Map conflict");
      await remove(this.root,PENDING);
      return {recovered:true,committed:true};
    }
    if((currentManifest===null)!==(backup.manifest===null) ||
       (currentManifest && await sha256(currentManifest)!==journal.oldManifestHash)) throw new Error("Manifest changed during recovery");
    // Preflight the entire set before restoring anything.
    for(const [path,previous] of Object.entries(backup.files)) {
      const current=await read(this.root,path);
      const oldHash=previous===null?null:await sha256(previous);
      const hash=current===null?null:await sha256(current);
      if(hash!==oldHash && hash!==(journal.newHashes[path] || null)) throw new Error("Recovery conflict: "+path);
    }
    const map=await read(this.root,SOURCE_MAP);
    const mapHash=map===null?null:await sha256(map);
    if(mapHash!==journal.oldMapHash && mapHash!==journal.newMapHash) throw new Error("Source Map changed during recovery");
    for(const [path,previous] of Object.entries(backup.files)) {
      if(previous===null) await remove(this.root,path); else await write(this.root,path,previous);
    }
    if(backup.sourceMap===null) await remove(this.root,SOURCE_MAP);
    else await write(this.root,SOURCE_MAP,backup.sourceMap);
    await remove(this.root,PENDING);
    return {recovered:true,committed:false};
  }
}

export {read as readFile,write as writeFile};
