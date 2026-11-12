import {useEffect,useMemo,useRef,useState} from 'react';
import {ReactFlow,Controls,Background} from '@xyflow/react';
import {createCore} from '../core/create';
import {CoreClient,CoreError} from '../core/client';
import {browserFeatures} from '../core/features';
import type {Project,Issue} from '../core/types';
import fixture from '../../../contract/fixtures/summer-house.json';
import {graphView} from './graph';

// Owner decision: Thai UI; preserve technical terms and original project content.
const checks:Record<string,string>={secure:'HTTPS หรือ localhost',browser:'Chrome / Edge บนเดสก์ท็อป',wasm:'WebAssembly',worker:'Web Worker',folder:'File System Access API',indexedDB:'IndexedDB',locks:'Web Locks',crypto:'Web Crypto'};
const sections=['Project','Story Graph','Rules & Schedule','Playtest','Validate','Export'];
export default function App(){
 const features=useMemo(browserFeatures,[]),supported=features.every(f=>f.available);
 const core=useRef<CoreClient|null>(null),generation=useRef(0);
 const [session,setSession]=useState(0),[status,setStatus]=useState('กำลังเริ่ม Core…'),[ready,setReady]=useState(false);
 const [project,setProject]=useState<Project|null>(null),[page,setPage]=useState('Project'),[graphId,setGraphId]=useState(''),[selected,setSelected]=useState('');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState(''),[undo,setUndo]=useState(0),[redo,setRedo]=useState(0),[issues,setIssues]=useState<Issue[]|null>(null);
 useEffect(()=>{
  const current=++generation.current;setReady(false);setError('');setProject(null);setUndo(0);setRedo(0);setIssues(null);setBusy(false);
  if(!supported){setStatus('เบราว์เซอร์ยังไม่พร้อม');return;}
  let client:CoreClient;
  try{client=createCore();core.current=client;}catch(e){setStatus('ไม่สามารถเริ่ม Core');setError(String(e));return;}
  setStatus('กำลังเริ่ม Core…');
  client.request('getProject',{}).then(()=>{if(current===generation.current){setReady(true);setStatus('Core พร้อมใช้งาน');}}).catch(e=>{
   if(current!==generation.current)return;
   if(e instanceof CoreError&&e.code==='CORE_ERROR'){setReady(true);setStatus('Core พร้อมใช้งาน');}
   else{setStatus('ไม่สามารถเริ่ม Core');setError(String(e));}
  });
  return ()=>{generation.current++;client.close();core.current=null;};
 },[session,supported]);
 async function run(action:(client:CoreClient)=>Promise<void>){
  const client=core.current;if(!client||busy)return;
  setBusy(true);setError('');try{await action(client);}catch(e){setError(e instanceof CoreError?`${e.code}: ${e.message}`:String(e));if(client.closed){setReady(false);setStatus('Core หยุดทำงาน');}}finally{setBusy(false);}
 }
 function snapshot(next:Project){setProject(next);setDraft(next.name);setIssues(null);}
 const view=useMemo(()=>project?graphView(project,graphId):{nodes:[],edges:[]},[project,graphId]);
 const node=project?.nodes.find(n=>n.id===selected);
 const locked=!ready||busy;
 return <div className="app">
  <header className="topbar"><strong className="wordmark">StoryFlow</strong><span className="project-name">{project?.name??'Web Studio'}</span><span className="session-status" role="status">{busy?'กำลังทำงาน…':status}</span><button disabled={locked||!undo} onClick={()=>run(async c=>{snapshot((await c.request('undo',{})).project);setUndo(v=>v-1);setRedo(v=>v+1);})}>Undo</button><button disabled={locked||!redo} onClick={()=>run(async c=>{snapshot((await c.request('redo',{})).project);setUndo(v=>v+1);setRedo(v=>v-1);})}>Redo</button></header>
  <nav aria-label="พื้นที่ทำงาน">{sections.map((name,i)=><button key={name} aria-current={page===name?'page':undefined} disabled={i>1||(i===1&&!project)} title={i>1?'จะเปิดใช้ในขั้นถัดไปของ Phase 1':name==='Story Graph'&&!project?'เปิดโปรเจกต์ตัวอย่างก่อน':undefined} onClick={()=>setPage(name)}>{name==='Project'?'โปรเจกต์':name}</button>)}<p className="nav-note">ตัวอย่างระบบเบื้องต้น<br/>Phase 1.1</p></nav>
  <main>
   {error&&<div className="error" role="alert"><strong>ทำรายการไม่สำเร็จ</strong> {error}<p>{ready?'ข้อมูลโปรเจกต์ที่ยืนยันล่าสุดยังอยู่ ตรวจข้อมูลแล้วลองอีกครั้ง':'เริ่ม Core ใหม่แล้วเปิดตัวอย่างอีกครั้ง ข้อมูลที่แก้ในหน่วยความจำจะถูกทิ้ง'}</p></div>}
   {!ready&&supported&&<button className="restart" onClick={()=>setSession(v=>v+1)}>เริ่ม Core ใหม่</button>}
   {page==='Project'?<section className="project-page"><h1>โปรเจกต์</h1><p className="intro">สร้างเรื่องราวแบบแตกแขนงสำหรับ Ren’Py เริ่มสำรวจกราฟจากโปรเจกต์ตัวอย่าง</p>
    <div className="project-layout"><section><h2>Summer House</h2><p>โปรเจกต์ตัวอย่างสำหรับฉาก ตัวเลือก Branch, Effect และ Schedule</p><p className="notice">ตัวอย่างนี้ทำงานในหน่วยความจำ ข้อมูลที่แก้จะหายเมื่อโหลดหน้าใหม่หรือเริ่ม Core ใหม่ การเปิดโฟลเดอร์และบันทึกจะเพิ่มในขั้นถัดไป</p><button className="primary" disabled={locked||!supported} onClick={()=>run(async c=>{const result=await c.request('openProject',{project:fixture as Project});snapshot(result.project);setGraphId(result.project.entryGraphId);setSelected('');setUndo(0);setRedo(0);setPage('Story Graph');})}>เปิดตัวอย่าง</button></section>
    <section className="requirements"><h2>ความพร้อมของเบราว์เซอร์</h2><ul>{features.map(f=><li key={f.id}><span>{checks[f.id]}</span><strong>{f.available?'พร้อมใช้งาน':'ไม่พบ'}</strong></li>)}</ul><p>การพบ API ไม่ได้หมายถึงได้รับสิทธิ์โฟลเดอร์ ตัวอย่างนี้ยังไม่เข้าถึงโฟลเดอร์ใด</p>{!supported&&<p role="alert">ใช้ Chrome หรือ Edge บนเดสก์ท็อป ผ่าน HTTPS / localhost และเปิดใช้ API ตามรายการ</p>}</section></div>
   </section>:project&&<section className="editor">
    <div className="workspace-heading"><div><h1>Story Graph</h1><p>กราฟแบบอ่านอย่างเดียว · เลือกโหนดเพื่อดูข้อมูล</p></div><div><label htmlFor="graph-select">Graph</label><select id="graph-select" value={graphId} onChange={e=>{setGraphId(e.target.value);setSelected('');}}>{project.graphs.map(g=><option key={g.id} value={g.id}>{g.kind} · {g.id.slice(-4)}</option>)}</select></div></div>
    <div className="memory-note">ข้อมูลอยู่ในหน่วยความจำ · ยังไม่บันทึกลงไฟล์</div>
    <div className="graph-layout"><div className="canvas" aria-label="Story graph"><ReactFlow key={graphId} nodes={view.nodes.map(n=>({...n,selected:n.id===selected}))} edges={view.edges} onNodeClick={(_,n)=>setSelected(n.id)} onPaneClick={()=>setSelected('')} nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} fitView minZoom={0.15} maxZoom={1.5} colorMode="dark"><Background color="#526174" gap={24}/><Controls showInteractive={false}/></ReactFlow></div>
    <aside className="inspector"><h2>Inspector</h2>{node?<><h3>{node.kind}</h3><code>{node.id}</code>{node.lines?.map((l,i)=><p key={i} className="dialogue">{l.text}</p>)}{node.choices?.length?<><h3>ตัวเลือก</h3><ul>{node.choices.map(c=><li key={c.id}>{c.text}</li>)}</ul></>:null}<details><summary>ข้อมูลโหนด</summary><pre>{JSON.stringify(node,null,2)}</pre></details><p>การแก้ไขโหนดจะเพิ่มใน Phase 1.2</p></>:<p>เลือกโหนดเพื่อดูเนื้อหาและการตั้งค่า</p>}
     <hr/><form onSubmit={e=>{e.preventDefault();run(async c=>{snapshot((await c.request('applyEdit',{patch:[{op:'replace',path:'/name',value:draft}]})).project);setUndo(v=>v+1);setRedo(0);});}}><h3>ชื่อโปรเจกต์</h3><label htmlFor="project-name">ชื่อ</label><input id="project-name" value={draft} onChange={e=>setDraft(e.target.value)} disabled={locked}/><button type="submit" disabled={locked||draft===project.name||!draft.trim()}>ใช้ชื่อนี้</button></form>
     <button className="validate" disabled={locked} onClick={()=>run(async c=>setIssues((await c.request('validate',{})).issues))}>ตรวจโปรเจกต์ (Validate)</button>{issues&&<div role="status"><h3>ผลการตรวจโปรเจกต์</h3>{issues.length?<ul>{issues.map((i,index)=><li key={index}>{i.severity}: {i.code} — {i.message}</li>)}</ul>:<p>ไม่พบปัญหา</p>}</div>}
    </aside></div>
   </section>}
  </main>
 </div>;
}
