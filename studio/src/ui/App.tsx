import {useMemo,useState,useEffect,useRef} from 'react';
import {ReactFlow,Controls,Background,type XYPosition,type ReactFlowInstance} from '@xyflow/react';
import {browserFeatures} from '../core/features';
import {createProject,createNode,fieldsPatch,nodePatch,connectPatch,uuid,stableJSON} from '../core/editor';
import {pickFolder,readProject,newFolderSession,saveProject} from '../core/folder';
import type {Project,NodeKind,Patch} from '../core/types';
import fixture from '../../../contract/fixtures/summer-house.json';
import {useStudio} from './useStudio';
import {graphView} from './graph';
import {StoryCard,type StoryCardNode} from './StoryCard';
import {NodeInspector} from './NodeInspector';
import {Resources} from './Resources';
import {RulesPane} from './RulesPane';
const nodeTypes={story:StoryCard};
const checks:Record<string,string>={secure:'HTTPS หรือ localhost',browser:'Chrome / Edge บนเดสก์ท็อป',wasm:'WebAssembly',worker:'Web Worker',folder:'File System Access API',indexedDB:'IndexedDB',locks:'Web Locks',crypto:'Web Crypto'};
const sections=['Project','Story Graph','Rules & Schedule','Playtest','Validate','Export'];
export default function Studio(){
 const features=useMemo(browserFeatures,[]),supported=features.every(f=>f.available),studio=useStudio(supported);
 const {project,folder}=studio;
 const [page,setPage]=useState('Project'),[selected,setSelected]=useState(''),[graphId,setGraphId]=useState(''),[kind,setKind]=useState<NodeKind>('scene'),[positions,setPositions]=useState<Record<string,XYPosition>>({}),[ioBusy,setIoBusy]=useState(false);
 const flowRef=useRef<ReactFlowInstance<StoryCardNode>|null>(null);
 const [newName,setNewName]=useState('โปรเจกต์ใหม่'),[name,setName]=useState('');
 const locked=studio.locked||ioBusy;
 useEffect(()=>{setPositions({});},[project?.id]);
 useEffect(()=>{setName(project?.name??'');},[project?.name]);
 useEffect(()=>{if(project&&!project.graphs.some(g=>g.id===graphId))setGraphId(project.entryGraphId);if(project&&!project.nodes.some(n=>n.id===selected))setSelected('');},[project,graphId,selected]);
 const apply=async(patch:Patch[])=>{await studio.patch(patch);};
 const attempt=(action:()=>void)=>{try{action();}catch(e){studio.setError(String(e));}};
 const canReplace=()=>!studio.dirty||confirm('โปรเจกต์มีข้อมูลที่ยังไม่บันทึก ต้องการเปิดโปรเจกต์อื่นและทิ้งการแก้ไขหรือไม่?');
 async function openFolder(create=false){
  if(!canReplace())return;
  setIoBusy(true);studio.setError('');
  try{
   const root=await pickFolder();
   if(create){const target=await newFolderSession(root),next=createProject(newName);if(await studio.load(next)){
    const saved=await saveProject(target,next);await (await root.getDirectoryHandle('game',{create:true})).getDirectoryHandle('assets',{create:true});studio.setFolder(saved);studio.setSaved(stableJSON(next));setGraphId(next.entryGraphId);setSelected('');setPage('Story Graph');
   }}else{const opened=await readProject(root);if(await studio.load(opened.project,opened.folder)){setGraphId(opened.project.entryGraphId);setSelected('');setPositions({});setPage('Story Graph');}}
  }catch(e){if(!(e instanceof DOMException&&e.name==='AbortError'))studio.setError(String(e));}finally{setIoBusy(false);}
 }
 async function openExample(){if(!canReplace())return;if(await studio.load(fixture as Project)){setGraphId(fixture.entryGraphId);setSelected('');setPositions({});setPage('Story Graph');}}
 function move(id:string,x:number,y:number){setPositions(p=>({...p,[id]:{x,y}}));}
 const view=useMemo(()=>project?graphView(project,graphId):{nodes:[],edges:[]},[project,graphId]);
 const node=project?.nodes.find(n=>n.id===selected),position=node?(positions[node.id]??view.nodes.find(n=>n.id===node.id)?.position??{x:0,y:0}):{x:0,y:0};
 const flowNodes=view.nodes.map(n=>({id:n.id,type:'story' as const,position:positions[n.id]??n.position,selected:n.id===selected,data:{model:project!.nodes.find(m=>m.id===n.id)!,locked,entry:project!.graphs.find(g=>g.id===graphId)?.entryNodeId===n.id,inline:(id:string,text:string,choices:string[])=>{
  const current=project!.nodes.find(n=>n.id===id)!;void apply(nodePatch(project!,{...current,lines:current.lines?.length?current.lines.map((l,i)=>i===0?{...l,text}:l):[{text,characterId:null}],choices:current.choices?.map((c,i)=>({...c,text:choices[i]??c.text}))??[]}));
 }}}));
 return <div className="app"><header className="topbar"><strong className="wordmark">StoryFlow</strong><span className="project-name">{project?.name??'Web Studio'}</span><span className="session-status" role="status">{locked&&studio.ready?'กำลังทำงาน…':studio.status}</span><button disabled={locked||!studio.undo} onClick={()=>studio.history('undo')}>Undo</button><button disabled={locked||!studio.redo} onClick={()=>studio.history('redo')}>Redo</button>{project&&<button disabled={locked||!folder||!studio.dirty} title={!folder?'เปิดหรือสร้างโปรเจกต์ในโฟลเดอร์เพื่อบันทึก':undefined} onClick={()=>studio.save()}>บันทึกโปรเจกต์</button>}</header>
  <nav aria-label="พื้นที่ทำงาน">{sections.map((section,i)=><button key={section} aria-current={page===section?'page':undefined} disabled={i>2||((i===1||i===2)&&!project)||ioBusy} title={i>2?'จะเปิดใช้ในขั้นถัดไปของ Phase 1':undefined} onClick={()=>setPage(section)}>{section==='Project'?'โปรเจกต์':section}</button>)}<p className="nav-note">Story Editor<br/>Phase 1.3</p></nav>
  <main>{studio.error&&<div className="error" role="alert"><strong>ทำรายการไม่สำเร็จ</strong> {studio.error}<p>ข้อมูลที่ Core ยืนยันล่าสุดยังคงอยู่ ตรวจข้อความและสิทธิ์ก่อนลองอีกครั้ง</p></div>}
   {!studio.ready&&supported&&<button className="restart" disabled={studio.busy||ioBusy} onClick={studio.restart}>เริ่ม Core ใหม่</button>}
   {page==='Project'?<section className="project-page"><h1>โปรเจกต์</h1><p className="intro">สร้างเรื่องราวแบบแตกแขนงสำหรับ Ren’Py เปิดโฟลเดอร์บนเครื่องเพื่อเริ่มทำงาน</p>
    <div className="project-layout"><section><h2>เปิดหรือสร้างโปรเจกต์</h2><div className="actions"><button className="primary" disabled={locked} onClick={()=>openFolder()}>เปิดโฟลเดอร์โปรเจกต์</button><button disabled={locked} onClick={openExample}>เปิดตัวอย่าง</button></div><label>ชื่อโปรเจกต์ใหม่<input value={newName} disabled={locked} onChange={e=>setNewName(e.target.value)}/></label><button disabled={locked||!newName.trim()} onClick={()=>openFolder(true)}>สร้างโปรเจกต์ในโฟลเดอร์</button><p className="notice">ตัวอย่างนี้ทำงานในหน่วยความจำ เมื่อเปิดโฟลเดอร์จริงให้กดบันทึกโปรเจกต์เพื่อเก็บการแก้ไข Autosave จะเพิ่มใน 1.5</p>{project&&<><p>{folder?`โฟลเดอร์: ${folder.root.name}`:'กำลังใช้ตัวอย่างในหน่วยความจำ'} · {studio.dirty?'มีการแก้ไขที่ยังไม่บันทึก':'บันทึกโปรเจกต์แล้ว'}</p><form onSubmit={e=>{e.preventDefault();void apply(fieldsPatch(project,{name}));}}><label>ชื่อโปรเจกต์<input value={name} onChange={e=>setName(e.target.value)} disabled={locked}/></label><button disabled={locked||name===project.name||!name.trim()}>ใช้ชื่อโปรเจกต์</button></form></>}</section>
    <section className="requirements"><h2>ความพร้อมของเบราว์เซอร์</h2><ul>{features.map(f=><li key={f.id}><span>{checks[f.id]}</span><strong>{f.available?'พร้อมใช้งาน':'ไม่พบ'}</strong></li>)}</ul><p>การพบ API ไม่ได้หมายถึงได้รับสิทธิ์โฟลเดอร์ เลือกโฟลเดอร์และอนุญาตเมื่อเบราว์เซอร์ถาม</p>{!supported&&<p role="alert">ใช้ Chrome หรือ Edge บนเดสก์ท็อป ผ่าน HTTPS / localhost และเปิดใช้ API ตามรายการ</p>}</section></div>
    {project&&<Resources project={project} root={folder?.root??null} locked={locked} apply={apply}/>}
   </section>:page==='Rules & Schedule'&&project?<RulesPane project={project} locked={locked} apply={apply} issues={studio.issues} validate={studio.validate}/>:project&&<section className="editor"><div className="workspace-heading"><div><h1>Story Graph</h1><p>เลือกโหนดเพื่อแก้ Inspector หรือแก้ข้อความบนกราฟได้โดยตรง</p></div><div><label htmlFor="graph-select">Graph</label><select id="graph-select" disabled={locked} value={graphId} onChange={e=>{setGraphId(e.target.value);setSelected('');}}>{project.graphs.map(g=><option key={g.id} value={g.id}>{g.kind} · {g.id.slice(-4)}</option>)}</select></div></div>
    <div className="memory-note">{folder?`${folder.root.name} · ${studio.dirty?'ยังไม่บันทึกการแก้ไข':'บันทึกแล้ว'}`:'ข้อมูลอยู่ในหน่วยความจำ · ยังไม่บันทึกลงไฟล์'}</div>
    <div className="graph-toolbar"><label>เลือกโหนด<select aria-label="เลือกโหนด" value={selected} onChange={e=>setSelected(e.target.value)}><option value="">เลือกโหนด</option>{project.nodes.filter(n=>n.graphId===graphId).map(n=><option key={n.id} value={n.id}>{n.kind} · {n.id.slice(-4)}</option>)}</select></label><button disabled={!node} onClick={()=>flowRef.current?.setCenter(position.x+130,position.y+80,{zoom:1,duration:0})}>โฟกัสโหนด</button><label>ชนิดโหนด<select aria-label="ชนิดโหนด" value={kind} disabled={locked} onChange={e=>setKind(e.target.value as NodeKind)}>{['scene','branch','effect','schedule','end'].map(k=><option key={k}>{k}</option>)}</select></label><button disabled={locked} onClick={()=>{const next=createNode(kind,graphId);void apply(fieldsPatch(project,{nodes:[...project.nodes,next]})).then(()=>setSelected(next.id));}}>เพิ่มโหนด</button><button disabled={locked} onClick={()=>{const id=uuid(),entry=createNode('end',id);entry.mode='return';void apply(fieldsPatch(project,{graphs:[...project.graphs,{id,kind:'subgraph',entryNodeId:entry.id}],nodes:[...project.nodes,entry]}));}}>เพิ่ม Subgraph</button><button disabled={locked} onClick={studio.validate}>ตรวจโปรเจกต์ (Validate)</button></div>
    <div className="graph-layout"><div className="canvas" aria-label="Story graph"><ReactFlow<StoryCardNode> onInit={instance=>{flowRef.current=instance;}} key={project.id+graphId} nodeTypes={nodeTypes} nodes={flowNodes} edges={view.edges.map(e=>({...e,sourceHandle:project.edges.find(edge=>edge.id===e.id)?.port,targetHandle:'in'}))} onNodeClick={(_,n)=>setSelected(n.id)} onPaneClick={()=>setSelected('')} onNodesChange={changes=>{for(const change of changes)if(change.type==="position"&&change.position)move(change.id,change.position.x,change.position.y);}} onNodeDragStop={(_,n)=>move(n.id,n.position.x,n.position.y)} nodesDraggable={!locked} nodesConnectable={!locked} edgesReconnectable={false} deleteKeyCode={null} onConnect={connection=>attempt(()=>{if(connection.source&&connection.target&&connection.sourceHandle)void apply(connectPatch(project,connection.source,connection.sourceHandle,connection.target));})} fitView minZoom={0.15} maxZoom={1.5} colorMode="dark"><Background color="#526174" gap={24}/><Controls showInteractive={false}/></ReactFlow></div>
    <aside className="inspector">{node?<NodeInspector key={JSON.stringify(node)} project={project} node={node} locked={locked} apply={apply} move={move} position={position}/>:<><h2>Inspector</h2><p>เลือกโหนดเพื่อดูเนื้อหาและการตั้งค่า</p></>}
     {node&&<button disabled={locked||project.graphs.find(g=>g.id===graphId)?.entryNodeId===node.id} onClick={()=>apply(fieldsPatch(project,{graphs:project.graphs.map(g=>g.id===graphId?{...g,entryNodeId:node.id}:g)}))}>ใช้โหนดนี้เริ่มกราฟ</button>}
     {studio.issues&&<div role="status"><h3>ผลการตรวจโปรเจกต์</h3>{studio.issues.length?<ul>{studio.issues.map((issue,i)=><li key={i}>{issue.severity}: {issue.code} — {issue.message}</li>)}</ul>:<p>ไม่พบปัญหา</p>}</div>}
    </aside></div></section>}
  </main></div>;
}
