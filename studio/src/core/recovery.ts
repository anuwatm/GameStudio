import type {Project} from './types.ts';
export type Draft={project:Project;sourceRevision:string|null;revision:string;updatedAt:number;root:FileSystemDirectoryHandle|null};
export class DraftStorageError extends Error{constructor(cause:unknown){super(`IndexedDB: ${String(cause)}`);this.name='DraftStorageError';}}
const DB='storyflow-recovery',STORE='drafts';
async function database():Promise<IDBDatabase>{return new Promise((resolve,reject)=>{const req=indexedDB.open(DB,1);req.onupgradeneeded=()=>req.result.createObjectStore(STORE,{keyPath:'project.id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error??Error('IndexedDB open failed'));req.onblocked=()=>reject(Error('IndexedDB upgrade blocked'));});}
async function transaction<T>(mode:IDBTransactionMode,body:(store:IDBObjectStore,result:(value:T)=>void)=>void):Promise<T>{const db=await database();try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction(STORE,mode);let value:T;tx.oncomplete=()=>resolve(value);tx.onabort=()=>reject(tx.error??Error('IndexedDB transaction aborted'));tx.onerror=()=>reject(tx.error??Error('IndexedDB transaction failed'));try{body(tx.objectStore(STORE),v=>value=v);}catch(e){tx.abort();reject(e);}});}finally{db.close();}}
export function drafts(){return transaction<Draft[]>('readonly',(s,set)=>{s.getAll().onsuccess=e=>set((e.target as IDBRequest<Draft[]>).result.sort((a,b)=>b.updatedAt-a.updatedAt));});}
export function draftFor(id:string){return transaction<Draft|undefined>('readonly',(s,set)=>{s.get(id).onsuccess=e=>set((e.target as IDBRequest<Draft>).result);});}
export function putDraft(draft:Draft){return transaction<void>('readwrite',(s)=>{s.put(draft);});}
// Compare-and-delete: a delayed save must not delete a newer draft.
export function removeDraft(id:string,revision:string){return transaction<void>('readwrite',s=>{const req=s.get(id);req.onsuccess=()=>{if(req.result?.revision===revision)s.delete(id);};});}
export type Lease={id:string;release:()=>void};
export async function acquireProject(id:string):Promise<Lease>{
 return new Promise((resolve,reject)=>{let finish:()=>void;const held=new Promise<void>(r=>finish=r);navigator.locks.request(`storyflow-project:${id}`,{ifAvailable:true},async lock=>{if(!lock){reject(Error('โปรเจกต์นี้เปิดอยู่ในแท็บอื่น กรุณาปิดหรือเปลี่ยนโปรเจกต์ในแท็บนั้นก่อน'));return;}resolve({id,release:()=>finish()});await held;}).catch(reject);});
}
export async function requestFolderPermission(root:FileSystemDirectoryHandle){
 const handle=root as FileSystemDirectoryHandle&{requestPermission?:(options:{mode:'readwrite'})=>Promise<PermissionState>};
 if(handle.requestPermission&&await handle.requestPermission({mode:'readwrite'})!=='granted')throw new DOMException('ไม่ได้รับสิทธิ์แก้ไขโฟลเดอร์ ร่างยังอยู่ใน IndexedDB','NotAllowedError');
}
