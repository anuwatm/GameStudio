import {LocalProject,readFile,writeFile,sha256} from '../../../web/local-folder.mjs';
import {requestFolderPermission} from './recovery';
import type {FolderSession} from './folder';
import {RevisionConflict,checkAssets} from './folder';
import type {ExportBundle,Project} from './types';
const template=import.meta.glob('../../../templates/renpy/game/**/*',{query:'?url',import:'default',eager:true}) as Record<string,string>;
async function checkRevision(folder:FolderSession){const bytes=await readFile(folder.root,'project.storyflow.json');if(bytes===null||await sha256(bytes)!==folder.hash)throw new RevisionConflict();}
export async function exportToFolder(folder:FolderSession,project:Project,bundle:ExportBundle){
 return navigator.locks.request('storyflow-export',async()=>{const local=new LocalProject(folder.root);await local.recoverLocked();await checkRevision(folder);const assets=await checkAssets(folder.root,project.assets);const missing=assets.filter(a=>a.status!=='พร้อมใช้งาน');if(missing.length)throw Error('สื่อไม่พร้อม: '+missing.map(a=>`${project.assets.find(v=>v.id===a.id)?.path}: ${a.status}`).join('; '));return local.exportLocked(bundle);});
}
export async function saveWarnings(folder:FolderSession,bundle:ExportBundle){const bytes=await readFile(folder.root,'game/storyflow_generated/sf_manifest.json');if(!bytes)return [];const old=JSON.parse(new TextDecoder().decode(bytes));return old.subgraphFingerprint!==await sha256(JSON.stringify(bundle.subgraphStructure))?['Subgraph changed; older saves may fail to load.']:[];}
export async function initializeTemplate(folder:FolderSession){
 // Fetch all approved assets first; a network failure must not leave a partial template.
 const files=await Promise.all(Object.entries(template).map(async([key,url])=>{const response=await fetch(url);if(!response.ok)throw Error(`Template HTTP ${response.status}: ${key}`);return {path:'game/'+key.split('/game/')[1],bytes:new Uint8Array(await response.arrayBuffer())};}));
 return navigator.locks.request('storyflow-export',async()=>{await new LocalProject(folder.root).recoverLocked();await checkRevision(folder);
  const game=await folder.root.getDirectoryHandle('game',{create:true});
  const scripts=async(dir:FileSystemDirectoryHandle):Promise<boolean>=>{for await(const handle of (dir as FileSystemDirectoryHandle&{values():AsyncIterable<FileSystemHandle>}).values()){if(handle.kind==='directory'){if(await scripts(handle as FileSystemDirectoryHandle))return true;}else if(/\.rpyc?$/.test(handle.name))return true;}return false;};
  if(await scripts(game))throw Error('พบสคริปต์เกมเดิม ไม่ติดตั้งเทมเพลตทับ ให้เชื่อม call sf_entry เอง');
  for(const file of files)if(await readFile(folder.root,file.path)!==null)throw Error('Template file collision: '+file.path);
  for(const file of files){if(await readFile(folder.root,file.path)!==null)throw Error('Template file collision: '+file.path);await writeFile(folder.root,file.path,file.bytes);}
  return files.map(f=>f.path);
 });
}

export async function recoverExportFolder(folder:FolderSession){await requestFolderPermission(folder.root);return new LocalProject(folder.root).recover();}
