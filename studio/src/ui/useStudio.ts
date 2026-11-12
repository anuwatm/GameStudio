import {useCallback,useEffect,useRef,useState,useMemo} from 'react';
import {createCore} from '../core/create';
import {CoreClient,CoreError} from '../core/client';
import type {Project,Patch,Issue} from '../core/types';
import type {FolderSession} from '../core/folder';
import {saveProject} from '../core/folder';
import {stableJSON} from '../core/editor';
export function useStudio(supported:boolean){
 const client=useRef<CoreClient|null>(null),active=useRef(true),guard=useRef(false),ack=useRef<Project|null>(null);
 const [project,setProject]=useState<Project|null>(null),[folder,setFolder]=useState<FolderSession|null>(null),[saved,setSaved]=useState('');
 const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('กำลังเริ่ม Core…'),[error,setError]=useState(''),[session,setSession]=useState(0);
 const [undo,setUndo]=useState(0),[redo,setRedo]=useState(0),[issues,setIssues]=useState<Issue[]|null>(null);
 const snapshot=useCallback((next:Project)=>{ack.current=next;setProject(next);setIssues(null);},[]);
 useEffect(()=>{
  active.current=true;let disposed=false;setReady(false);
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
 const load=useCallback(async(next:Project,source:FolderSession|null=null)=>run(async c=>{const result=await c.request('openProject',{project:next});snapshot(result.project);setFolder(source);setSaved(source?stableJSON(result.project):'');setUndo(0);setRedo(0);}),[run,snapshot]);
 const patch=useCallback(async(operations:Patch[])=>{if(!operations.length)return;await run(async c=>{snapshot((await c.request('applyEdit',{patch:operations})).project);setUndo(v=>v+1);setRedo(0);});},[run,snapshot]);
 const history=useCallback(async(name:'undo'|'redo')=>run(async c=>{snapshot((await c.request(name,{})).project);setUndo(v=>v+(name==='undo'?-1:1));setRedo(v=>v+(name==='undo'?1:-1));}),[run,snapshot]);
 const save=useCallback(async()=>{if(!folder||!project)return;await run(async()=>{const next=await saveProject(folder,project);setFolder(next);setSaved(stableJSON(project));});},[folder,project,run]);
 const dirty=useMemo(()=>!!project&&saved!==stableJSON(project),[project,saved]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 return {project,folder,saved,dirty,ready,busy,status,error,undo,redo,issues,locked:!ready||busy,run,load,patch,history,save,snapshot,setFolder,setSaved,setError,validate:()=>run(async c=>setIssues((await c.request('validate',{})).issues)),restart:()=>{setError('');setSession(v=>v+1);}};
}
