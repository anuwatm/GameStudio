import {LocalProject,readFile,writeFile,safePath,sha256} from '../../../web/local-folder.mjs';
import type {Project,Asset} from './types.ts';
const PROJECT='project.storyflow.json';
export type FolderSession={root:FileSystemDirectoryHandle;hash:string|null};
export async function pickFolder():Promise<FileSystemDirectoryHandle>{
 const picker=(window as unknown as {showDirectoryPicker:(options:{mode:string})=>Promise<FileSystemDirectoryHandle>}).showDirectoryPicker;
 return picker.call(window,{mode:'readwrite'});
}
export async function readProject(root:FileSystemDirectoryHandle){
 await new LocalProject(root).recover();
 const bytes=await readFile(root,PROJECT);if(!bytes)throw Error('ไม่พบ project.storyflow.json ในโฟลเดอร์นี้');
 const value=JSON.parse(new TextDecoder().decode(bytes));
 if(value.schemaVersion!==1){
  const backup=`.storyflow/backups/project-${crypto.randomUUID()}.json`;
  await writeFile(root,backup,bytes);
  throw Error(`ไม่รองรับ schemaVersion ${String(value.schemaVersion)}; สำรองต้นฉบับที่ ${backup} แล้ว ไม่แปลงหรือเขียนทับไฟล์เดิม`);
 }
 return {project:value as Project,folder:{root,hash:await sha256(bytes)} as FolderSession};
}
export async function saveProject(folder:FolderSession,project:Project):Promise<FolderSession>{
 return navigator.locks.request('storyflow-export',async()=>{
  await new LocalProject(folder.root).recoverLocked();
  const current=await readFile(folder.root,PROJECT),hash=current===null?null:await sha256(current);
  if(hash!==folder.hash)throw Error('ไฟล์โปรเจกต์ถูกแก้ไขภายนอก หยุดบันทึกเพื่อไม่เขียนทับ เปิดไฟล์ใหม่เพื่อตรวจสอบ');
  const text=JSON.stringify(project,null,2)+'\n';await writeFile(folder.root,PROJECT,text);
  return {root:folder.root,hash:await sha256(text)};
 });
}
export async function newFolderSession(root:FileSystemDirectoryHandle):Promise<FolderSession>{
 await new LocalProject(root).recover();
 if(await readFile(root,PROJECT)!==null)throw Error('มี project.storyflow.json อยู่แล้ว กรุณาใช้เปิดโฟลเดอร์');
 return {root,hash:null};
}
export async function assetFile(root:FileSystemDirectoryHandle,relative:string):Promise<File>{
 const parts=safePath(relative).split('/');const name=parts.pop()!;
 let dir=await (await root.getDirectoryHandle('game')).getDirectoryHandle('assets');
 for(const part of parts)dir=await dir.getDirectoryHandle(part);
 return (await dir.getFileHandle(name)).getFile();
}
export async function checkAssets(root:FileSystemDirectoryHandle,assets:Asset[]){
 return Promise.all(assets.map(async asset=>{try{await assetFile(root,asset.path);return {id:asset.id,status:'พร้อมใช้งาน'};}catch(e){return {id:asset.id,status:e instanceof Error?`${e.name}: ${e.message}`:String(e)};}}));
}
