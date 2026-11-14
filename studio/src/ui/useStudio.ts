import {useCallback,useEffect,useRef,useState,useMemo} from 'react';
import {createCore} from '../core/create';
import {CoreClient,CoreError} from '../core/client';
import type {Project,Patch,Issue,PlayResult,Payloads,ExportBundle} from '../core/types';
import type {FolderSession} from '../core/folder';
import {saveProject,readProject,RevisionConflict} from '../core/folder';
import {drafts as listDrafts,draftFor,putDraft,removeDraft,acquireProject,requestFolderPermission,DraftStorageError,type Draft,type Lease} from '../core/recovery';
import {exportToFolder,saveWarnings,initializeTemplate,recoverExportFolder} from '../core/export';
import {stableJSON} from '../core/editor';
export function useStudio(supported:boolean){
 const client=useRef<CoreClient|null>(null),active=useRef(true),guard=useRef(false),ack=useRef<Project|null>(null);
 const [project,setProject]=useState<Project|null>(null),[folder,setFolder]=useState<FolderSession|null>(null),[saved,setSaved]=useState('');
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('กำลังเริ่ม Core…'),[error,setError]=useState(''),[session,setSession]=useState(0);
 const [undo,setUndo]=useState(0),[redo,setRedo]=useState(0),[issues,setIssues]=useState<Issue[]|null>(null);
 const [play,setPlay]=useState<{project:Project;result:PlayResult}|null>(null);
 const lease=useRef<Lease|null>(null),source=useRef<FolderSession|null>(null),baseline=useRef(''),latestDraft=useRef<Draft|null>(null);
 const [drafts,setDrafts]=useState<Draft[]>([]),[pending,setPending]=useState<{draft:Draft;folder:FolderSession|null;project:Project}|null>(null),[storageStatus,setStorageStatus]=useState('ยังไม่มีโปรเจกต์'),[saveProblem,setSaveProblem]=useState('');
 const refreshDrafts=useCallback(async()=>setDrafts(await listDrafts()),[]);
 useEffect(()=>{void refreshDrafts().catch(e=>{setStorageStatus('เก็บร่างไม่ได้');setError(String(e));});return()=>{lease.current?.release();lease.current=null;};},[refreshDrafts]);
 const checkpoint=useCallback(async(next:Project)=>{
  if(stableJSON(next)===baseline.current){const old=latestDraft.current;if(old){await removeDraft(next.id,old.revision);latestDraft.current=null;await refreshDrafts();}setStorageStatus(previous=>previous.includes('ลงโฟลเดอร์ไม่สำเร็จ')?'ไม่มีการแก้ไขใหม่ · ตรวจไฟล์บนดิสก์ก่อนทำต่อ':'บันทึกแล้ว');return;}
  const draft:Draft={project:next,sourceRevision:source.current?.hash??null,revision:crypto.randomUUID(),updatedAt:Date.now(),root:source.current?.root??null};
  try{await putDraft(draft);latestDraft.current=draft;setStorageStatus(source.current?'กู้คืนได้ · รอ Autosave':'กู้คืนได้ · ร่างใน IndexedDB');await refreshDrafts();}
  catch(e){setSaveProblem('draft');setStorageStatus('เก็บร่างไม่ได้ · ยังอยู่ในหน่วยความจำ');throw new DraftStorageError(e);}
 },[refreshDrafts]);
 const [exportPreview,setExportPreview]=useState<{bundle:ExportBundle;warnings:string[];key:string}|null>(null),[exportReport,setExportReport]=useState<{kind?:'template'|'recovery';files:string[];warnings:string[];sourceMap:string}|null>(null);
 const snapshot=useCallback((next:Project)=>{ack.current=next;setProject(next);setIssues(null);setExportPreview(null);setExportReport(null);},[]);
 useEffect(()=>{
  active.current=true;let disposed=false;setReady(false);setPlay(null);
  if(!supported){setStatus('เบราว์เซอร์ยังไม่พร้อม');return;}
  let c:CoreClient;try{c=createCore();client.current=c;}catch(e){setError(String(e));setStatus('ไม่สามารถเริ่ม Core');return;}
  const startup=ack.current?c.request('openProject',{project:ack.current}):c.request('getProject',{});
  startup.catch(e=>{if(!(e instanceof CoreError&&e.code==='CORE_ERROR'&&!ack.current))throw e;}).then(()=>{if(!disposed){setReady(true);setStatus('Core พร้อมใช้งาน');setUndo(0);setRedo(0);}}).catch(e=>{if(!disposed){setError(String(e));setStatus('ไม่สามารถเริ่ม Core');}});
  return()=>{disposed=true;active.current=false;c.close();client.current=null;};
 },[supported,session]);
 const run=useCallback(async(action:(c:CoreClient)=>Promise<void>)=>{
  const c=client.current;if(!c||guard.current)return;guard.current=true;setBusy(true);setError('');
  try{await action(c);return true;}catch(e){if(active.current){setError(e instanceof CoreError?`${e.code}: ${e.message}`:String(e));if(c.closed){setReady(false);setStatus('Core หยุดทำงาน');}}return false;}finally{guard.current=false;if(active.current)setBusy(false);}
 },[]);
 const load=useCallback(async(next:Project,origin:FolderSession|null=null,recover=false,savedBaseline?:string)=>{let loaded=false;const ok=await run(async c=>{
  const previous=lease.current;const acquired=previous?.id===next.id?previous:await acquireProject(next.id);
  try{
   const draft=await draftFor(next.id);
   if(!recover&&draft&&stableJSON(draft.project)!==stableJSON(next)){setPending({draft,folder:origin,project:next});if(acquired!==previous)acquired.release();return;}
   const result=await c.request('openProject',{project:next});
   if(acquired!==previous){previous?.release();lease.current=acquired;}
   source.current=origin;baseline.current=savedBaseline??(origin?.hash?stableJSON(result.project):'');latestDraft.current=null;
   snapshot(result.project);setPlay(null);setFolder(origin);setSaved(baseline.current);setUndo(0);setRedo(0);setPending(null);setSaveProblem('');setStorageStatus(origin?'บันทึกแล้ว':'ร่างในหน่วยความจำ');
   if(draft&&stableJSON(draft.project)===stableJSON(next)&&baseline.current===stableJSON(next)){await removeDraft(next.id,draft.revision);await refreshDrafts();}
   await checkpoint(result.project);loaded=true;
  }catch(e){if(acquired!==lease.current)acquired.release();throw e;}
 });return !!ok&&loaded;},[run,snapshot,checkpoint,refreshDrafts]);
 const patch=useCallback(async(operations:Patch[])=>{if(!operations.length)return;await run(async c=>{const next=(await c.request('applyEdit',{patch:operations})).project;snapshot(next);setUndo(v=>v+1);setRedo(0);await checkpoint(next);});},[run,snapshot,checkpoint]);
 const history=useCallback(async(name:'undo'|'redo')=>run(async c=>{const next=(await c.request(name,{})).project;snapshot(next);setUndo(v=>v+(name==='undo'?-1:1));setRedo(v=>v+(name==='undo'?1:-1));await checkpoint(next);}),[run,snapshot,checkpoint]);
 const save=useCallback(async()=>{const current=ack.current,target=source.current;if(!target||!current)return;await run(async()=>{
  setStorageStatus('กำลังบันทึก…');
  try{await checkpoint(current);const draft=latestDraft.current;setStorageStatus('กำลังบันทึก…');const next=await saveProject(target,current);source.current=next;baseline.current=stableJSON(current);setFolder(next);setSaved(baseline.current);setSaveProblem('');if(draft){await removeDraft(current.id,draft.revision);latestDraft.current=null;}setStorageStatus('บันทึกแล้ว');await refreshDrafts();}
  catch(e){if(e instanceof DraftStorageError)throw e;setSaveProblem(e instanceof RevisionConflict?'conflict':'permission');setStorageStatus(latestDraft.current?'กู้คืนได้ · บันทึกลงโฟลเดอร์ไม่สำเร็จ':'บันทึกไม่สำเร็จ · ตรวจร่างก่อนปิดหน้า');throw e;}
 });},[run,checkpoint,refreshDrafts]);
 const recoverDraft=async(draft:Draft,copy=false)=>{
  try{
   if(!copy&&draft.root){await requestFolderPermission(draft.root);const disk=await readProject(draft.root);if(disk.project.id===draft.project.id&&disk.folder.hash===draft.sourceRevision){return await load(draft.project,disk.folder,true,stableJSON(disk.project));}}
   const copied={...draft.project,id:crypto.randomUUID(),name:`${draft.project.name} (สำเนากู้คืน)`};return await load(copied,null,true);
  }catch(e){setError(String(e));return false;}
 };
 const discardPending=async()=>{if(!pending)return;try{const lock=lease.current?.id===pending.draft.project.id?lease.current:await acquireProject(pending.draft.project.id);try{await removeDraft(pending.draft.project.id,pending.draft.revision);}finally{if(lock!==lease.current)lock.release();}const disk=pending.folder?await readProject(pending.folder.root):{project:pending.project,folder:null};await refreshDrafts();return await load(disk.project,disk.folder,true);}catch(e){setError(String(e));return false;}};
 const regrant=async()=>{if(!source.current)return;try{await requestFolderPermission(source.current.root);await save();}catch(e){setError(String(e));}};
 const dirty=useMemo(()=>!!project&&saved!==stableJSON(project),[project,saved]);
 useEffect(()=>{if(!project||!folder||!dirty||busy||!ready||saveProblem||pending)return;const timer=setTimeout(()=>void save(),2000);return()=>clearTimeout(timer);},[project,folder,dirty,busy,ready,saveProblem,pending,save]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 const prepareExport=()=>run(async c=>{if(!project||!folder)throw Error('เปิดโฟลเดอร์โปรเจกต์ก่อนส่งออก');if(dirty||saveProblem)throw Error('บันทึกโปรเจกต์และแก้ปัญหาการบันทึกก่อนส่งออก');setExportReport(null);setExportPreview(null);const found=(await c.request('validate',{})).issues;setIssues(found);if(found.some(i=>i.severity==='error'))throw Error('Core Validate พบ error กรุณาแก้ก่อนส่งออก');const bundle=await c.request('buildExport',{});setExportPreview({bundle,warnings:await saveWarnings(folder,bundle),key:stableJSON(project)});});
 const commitExport=()=>run(async c=>{if(!project||!folder||!exportPreview||exportPreview.key!==stableJSON(project)||dirty||saveProblem)throw Error('ข้อมูลเปลี่ยน ต้องบันทึกและเตรียมส่งออกใหม่');setExportReport(null);const found=(await c.request('validate',{})).issues;setIssues(found);if(found.some(i=>i.severity==='error'))throw Error('Core Validate พบ error');const bundle=await c.request('buildExport',{});setExportReport(await exportToFolder(folder,project,bundle));});
 const recoverExport=()=>run(async()=>{if(!folder)throw Error('เปิดโฟลเดอร์ก่อนกู้คืน');setExportReport(null);const result=await recoverExportFolder(folder);setExportPreview(null);setExportReport({kind:'recovery',files:[],warnings:[JSON.stringify(result)],sourceMap:''});});
 const installTemplate=()=>run(async()=>{setExportReport(null);if(!folder||dirty||saveProblem)throw Error('บันทึกโปรเจกต์ก่อนติดตั้งเทมเพลต');const files=await initializeTemplate(folder);setExportReport({kind:'template',files,warnings:['ติดตั้งเทมเพลตแล้ว ยังต้องส่งออก generated scripts'],sourceMap:''});});
 const startPlay=async(startNodeId?:string)=>run(async c=>{if(!project)return;const result=await c.request('startPlaytest',startNodeId?{startNodeId}:{});setPlay({project,result});});
 const playCommand=async<N extends 'choose'|'setVar'|'rewind'>(name:N,payload:Payloads[N])=>run(async c=>{const result=await c.request(name,payload);setPlay(previous=>previous?{...previous,result}:null);});
 return {project,folder,saved,dirty,ready,busy,status,error,undo,redo,issues,exportPreview,exportReport,prepareExport,commitExport,installTemplate,recoverExport,drafts,pending,storageStatus,saveProblem,recoverDraft,discardPending,regrant,play,startPlay,playCommand,exportTrace:()=>run(async c=>{const {trace}=await c.request('getTrace',{});const url=URL.createObjectURL(new Blob([JSON.stringify(trace,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='storyflow-trace.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}),locked:!ready||busy||!!pending,run,load,patch,history,save,finishCreate:async(next:FolderSession,current:Project)=>{source.current=next;baseline.current=stableJSON(current);setFolder(next);setSaved(baseline.current);const old=latestDraft.current;if(old){await removeDraft(current.id,old.revision);latestDraft.current=null;}setStorageStatus('บันทึกแล้ว');await refreshDrafts();},retryDraft:()=>run(async()=>{if(ack.current){await checkpoint(ack.current);setSaveProblem('');}}),setError,validate:()=>run(async c=>setIssues((await c.request('validate',{})).issues)),restart:()=>{setError('');setSession(v=>v+1);}};
}
