import {useState} from 'react';
import type {Project,StoryNode,Patch} from '../core/types';
import {nodePatch,deleteNodePatch,ports,uuid,connectPatch,fieldsPatch} from '../core/editor';
type Props={project:Project;node:StoryNode;locked:boolean;apply:(patch:Patch[])=>Promise<void>;move:(id:string,x:number,y:number)=>void;position:{x:number;y:number}};
export function NodeInspector({project,node,locked,apply,move,position}:Props){
 const [draft,setDraft]=useState(()=>structuredClone(node)),[port,setPort]=useState(ports(node)[0]??''),[target,setTarget]=useState(''),[replacement,setReplacement]=useState(''),[message,setMessage]=useState('');
 const others=project.nodes.filter(n=>n.graphId===node.graphId&&n.id!==node.id),graph=project.graphs.find(g=>g.id===node.graphId)!;
 function submit(){setMessage('');try{void apply(nodePatch(project,draft));}catch(e){setMessage(String(e));}}
 return <div className="node-inspector"><h2>Inspector · {node.kind}</h2><code>{node.id}</code>
  <fieldset disabled={locked}><legend>เนื้อหาโหนด</legend>
  {draft.kind==='scene'&&<>
   <h3>บทพูด</h3>{(draft.lines??[]).map((line,i)=><div className="line-row" key={i}>
    <label>ผู้พูด {i+1}<select aria-label={`ผู้พูด ${i+1}`} value={line.characterId??''} onChange={e=>setDraft({...draft,lines:draft.lines!.map((l,k)=>k===i?{...l,characterId:e.target.value||null}:l)})}><option value="">ผู้บรรยาย</option>{project.characters.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
    <label>บทพูด {i+1}<textarea aria-label={`บทพูด ${i+1}`} value={line.text} onChange={e=>setDraft({...draft,lines:draft.lines!.map((l,k)=>k===i?{...l,text:e.target.value}:l)})}/></label>
    <button onClick={()=>setDraft({...draft,lines:draft.lines!.filter((_,k)=>k!==i)})}>ลบบทพูด {i+1}</button>
   </div>)}<button onClick={()=>setDraft({...draft,lines:[...(draft.lines??[]),{text:'',characterId:null}]})}>เพิ่มบทพูด</button>
   <h3>สื่อในฉาก</h3>{project.assets.length?project.assets.map(a=><label className="check-label" key={a.id}><input type="checkbox" checked={(draft.assetIds??[]).includes(a.id)} onChange={e=>setDraft({...draft,assetIds:e.target.checked?[...(draft.assetIds??[]),a.id]:(draft.assetIds??[]).filter(id=>id!==a.id)})}/>{a.path}</label>):<p>ลงทะเบียนสื่อที่หน้าโปรเจกต์ก่อน</p>}
   <h3>ตัวเลือก</h3>{(draft.choices??[]).map((choice,i)=><div className="choice-row" key={choice.id}><label>ตัวเลือก {i+1}<input value={choice.text} onChange={e=>setDraft({...draft,choices:draft.choices!.map((c,k)=>k===i?{...c,text:e.target.value}:c)})}/></label><code>{choice.id.slice(-12)}</code><button onClick={()=>setDraft({...draft,choices:draft.choices!.filter(c=>c.id!==choice.id)})}>ลบตัวเลือก {i+1}</button></div>)}
   <button onClick={()=>setDraft({...draft,choices:[...(draft.choices??[]),{id:uuid(),text:'ตัวเลือกใหม่',visibleIf:null,effects:[]}]})}>เพิ่มตัวเลือก</button><p>Condition/Effects เดิมคงอยู่ เครื่องมือแก้กติกาเพิ่มใน 1.3</p>
  </>}
  {draft.kind==='schedule'&&<><label>startDay<input type="number" min="1" value={draft.startDay??1} onChange={e=>setDraft({...draft,startDay:Number(e.target.value)})}/></label><label>lastDay (รวมวันสุดท้าย)<input type="number" min="1" value={draft.lastDay??1} onChange={e=>setDraft({...draft,lastDay:Number(e.target.value)})}/></label><p>Activities/Events แก้ใน 1.3</p></>}
  {draft.kind==='end'&&<><label>mode<select aria-label="mode" value={draft.mode} onChange={e=>{const next={...draft,mode:e.target.value as StoryNode['mode']};if(next.mode!=='jump')delete next.targetGraphId;else next.targetGraphId=project.graphs[0].id;setDraft(next);}}><option value="ending">ending</option><option value="return">return</option><option value="jump">jump</option></select></label>{draft.mode==='jump'&&<label>targetGraphId<select aria-label="targetGraphId" value={draft.targetGraphId??''} onChange={e=>setDraft({...draft,targetGraphId:e.target.value})}>{project.graphs.map(g=><option key={g.id} value={g.id}>{g.kind} · {g.id.slice(-4)}</option>)}</select></label>}</>}
  {(draft.kind==='branch'||draft.kind==='effect')&&<p>โหนดพร้อมเชื่อมต่อ การแก้ Condition/Effects เต็มรูปแบบอยู่ใน 1.3</p>}
  <button className="primary" onClick={submit} disabled={JSON.stringify(draft)===JSON.stringify(node)}>ใช้การแก้ไขโหนด</button>
  </fieldset>
  {message&&<p role="alert">{message}</p>}
  <h3>เชื่อมต่อผ่านฟอร์ม</h3><fieldset disabled={locked||!ports(node).length}><label>พอร์ต<select aria-label="พอร์ต" value={port} onChange={e=>setPort(e.target.value)}>{ports(node).map(p=><option key={p} value={p}>{node.choices?.find(c=>c.id===p)?.text??p}</option>)}</select></label><label>โหนดปลายทาง<select aria-label="โหนดปลายทาง" value={target} onChange={e=>setTarget(e.target.value)}><option value="">เลือกปลายทาง</option>{project.nodes.filter(n=>n.graphId===node.graphId).map(n=><option key={n.id} value={n.id}>{n.kind} · {n.id.slice(-4)}</option>)}</select></label><button disabled={!target} onClick={()=>apply(connectPatch(project,node.id,port,target))}>เชื่อมพอร์ต</button></fieldset>
  {project.edges.filter(e=>e.from===node.id).map(e=><div className="edge-row" key={e.id}><span>{node.choices?.find(c=>c.id===e.port)?.text??e.port} → {e.to.slice(-4)}</span><button disabled={locked} onClick={()=>apply(fieldsPatch(project,{edges:project.edges.filter(edge=>edge.id!==e.id)}))}>ตัดเส้น {e.port==='fallback'?'fallback':e.port.slice(-4)}</button></div>)}
  <h3>ตำแหน่งในหน้าจอ</h3><div className="actions"><button disabled={locked} onClick={()=>move(node.id,position.x-80,position.y)}>ซ้าย</button><button disabled={locked} onClick={()=>move(node.id,position.x+80,position.y)}>ขวา</button><button disabled={locked} onClick={()=>move(node.id,position.x,position.y-80)}>ขึ้น</button><button disabled={locked} onClick={()=>move(node.id,position.x,position.y+80)}>ลง</button></div><p>ตำแหน่งเป็น view state ของ session ยังไม่บันทึกข้ามการเปิดใหม่</p>
  <h3>ลบโหนด</h3>{graph.entryNodeId===node.id&&<label>โหนดเริ่มต้นทดแทน<select aria-label="โหนดเริ่มต้นทดแทน" value={replacement} onChange={e=>setReplacement(e.target.value)}><option value="">เลือกก่อนลบ entry node</option>{others.map(n=><option key={n.id} value={n.id}>{n.kind} · {n.id.slice(-4)}</option>)}</select></label>}
  <button disabled={locked||!others.length||(graph.entryNodeId===node.id&&!replacement)} onClick={()=>{if(window.confirm('ลบโหนดนี้พร้อมเส้นเชื่อมทั้งหมด? Undo คืนได้ในขั้นเดียว'))void apply(deleteNodePatch(project,node.id,replacement));}}>ลบโหนดพร้อมเส้นเชื่อม</button>
  <details><summary>ข้อมูลโหนดที่ Core ยืนยัน</summary><pre>{JSON.stringify(node,null,2)}</pre></details>
 </div>;
}
