import {useEffect,useState} from 'react';
import {Handle,Position,useUpdateNodeInternals,type Node,type NodeProps} from '@xyflow/react';
import type {StoryNode,Project,Condition,Operand,Issue} from '../core/types';
import {ports,stableJSON} from '../core/editor';
import {assetFile} from '../core/folder';
export const kindNames={scene:'ฉากและบทสนทนา',branch:'ตรวจเงื่อนไข',effect:'เปลี่ยนค่าตัวแปร',schedule:'ตารางกิจกรรม',end:'จบเส้นทาง'};
export type InlineDraft={baseline:string;text:string;choices:string[]};
export type StoryCardNode=Node<{model:StoryNode;inlineDrafts:Map<string,InlineDraft>;project:Project;root:FileSystemDirectoryHandle|null;issues:Issue[];locked:boolean;entry:boolean;inspect:(id:string)=>void;inline:(id:string,text:string,choices:string[])=>void},'story'>;
function operand(value:Operand,project:Project):string{return value.kind==='variable'?project.variables.find(v=>v.id===value.variableId)?.name??'ตัวแปรที่หาย':value.kind==='day'?'วัน':JSON.stringify(value.value);}
export function conditionText(value:Condition|undefined,project:Project,depth=0):string{
 if(!value)return 'ยังไม่มีเงื่อนไข';if(depth>3)return 'กลุ่มเงื่อนไข…';
 if(value.kind==='compare')return `${operand(value.left,project)} ${{eq:'=',ne:'≠',lt:'<',le:'≤',gt:'>',ge:'≥'}[value.operator]} ${operand(value.right,project)}`;
 if(value.kind==='not')return `NOT (${conditionText(value.condition,project,depth+1)})`;
 return value.conditions.length?'('+value.conditions.slice(0,4).map(c=>conditionText(c,project,depth+1)).join(value.kind==='all'?' AND ':' OR ')+(value.conditions.length>4?' …':'')+')':value.kind==='all'?'AND · กลุ่มว่าง':'OR · กลุ่มว่าง';
}
function Thumbnail({root,path}:{root:FileSystemDirectoryHandle;path:string}){
 const [url,setUrl]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{let disposed=false,current='';setUrl('');setFailed(false);assetFile(root,path).then(file=>{if(!disposed){current=URL.createObjectURL(file);setUrl(current);}}).catch(()=>{if(!disposed)setFailed(true);});return()=>{disposed=true;if(current)URL.revokeObjectURL(current);};},[root,path]);
 return failed?<p className="node-media-status">เปิดภาพไม่ได้ · ตรวจสื่อในโปรเจกต์</p>:url?<img className="node-thumbnail" src={url} alt={`ภาพตัวอย่างสื่อ ${path}`} onError={()=>setFailed(true)}/>:<p className="node-media-status">กำลังเปิดภาพ…</p>;
}
export function StoryCard({data,selected}:NodeProps<StoryCardNode>){
 const {model,project,root,issues,locked,entry,inlineDrafts}=data,cached=inlineDrafts.get(model.id),[editing,setEditing]=useState(!!cached),[text,setText]=useState(cached?.text??model.lines?.[0]?.text??''),[choices,setChoices]=useState(cached?.choices??(model.choices??[]).map(c=>c.text)),[editBaseline,setEditBaseline]=useState(cached?.baseline??stableJSON(model));
 const stale=editing&&editBaseline!==stableJSON(model);
 function cancelInline(){inlineDrafts.delete(model.id);setEditing(false);setText(model.lines?.[0]?.text??'');setChoices((model.choices??[]).map(c=>c.text));setEditBaseline(stableJSON(model));}
 const update=useUpdateNodeInternals(),outputs=ports(model);const image=(model.assetIds??[]).map(id=>project.assets.find(a=>a.id===id)).find(a=>a&&/\.(png|jpe?g|webp)$/i.test(a.path));
 useEffect(()=>{if(editing)inlineDrafts.set(model.id,{baseline:editBaseline,text,choices});},[editing,text,choices,editBaseline,inlineDrafts,model.id]);
 useEffect(()=>{const saved=inlineDrafts.get(model.id);if(saved&&!(saved.text===(model.lines?.[0]?.text??'')&&stableJSON(saved.choices)===stableJSON((model.choices??[]).map(c=>c.text))))return;inlineDrafts.delete(model.id);setEditing(false);setText(model.lines?.[0]?.text??'');setChoices((model.choices??[]).map(c=>c.text));setEditBaseline(stableJSON(model));},[model,inlineDrafts]);
 useEffect(()=>{update(model.id);},[update,model,editing,selected]);
 return <article className={`story-card kind-${model.kind}`} aria-label={`${model.kind} ${model.id.slice(-4)}`}>
  <Handle type="target" id="in" position={Position.Left} aria-label={`รับเข้า ${model.kind}`} />
  <header className="node-card-heading"><strong>{model.kind.toUpperCase()}</strong><code title={model.id}>#{model.id.slice(-6)}</code></header>
  <div className="node-kind-title">{kindNames[model.kind]}</div>{entry&&<span className="entry-label">เริ่มกราฟ</span>}
  {model.kind==='scene'&&<>{selected&&root&&image&&<Thumbnail root={root} path={image.path}/>}
   {editing?<form className="nodrag nopan inline-edit" onSubmit={e=>{e.preventDefault();if(!stale)data.inline(model.id,text,choices);}}><label>บทพูดบนกราฟ<input aria-label="บทพูดบนกราฟ" value={text} onChange={e=>setText(e.target.value)} disabled={locked}/></label>{choices.map((value,i)=><label key={i}>ตัวเลือกบนกราฟ {i+1}<input value={value} disabled={locked} onChange={e=>setChoices(choices.map((v,k)=>k===i?e.target.value:v))}/></label>)}{stale&&<p role="alert">ข้อมูลโหนดเปลี่ยน ร่างยังอยู่ กรุณาคัดลอกข้อความก่อนยกเลิกแล้วแก้กับข้อมูลล่าสุด</p>}<button disabled={locked||stale}>ใช้ข้อความบนกราฟ</button><button type="button" onClick={cancelInline}>ยกเลิก</button></form>:<><p className="node-dialogue">{model.lines?.[0]?.text||'ยังไม่มีบทพูด'}</p><div className="node-meta">{model.lines?.length??0} บทพูด · {model.assetIds?.length??0} สื่อ</div><button className="nodrag nopan" disabled={locked} onClick={()=>setEditing(true)}>แก้ข้อความบนกราฟ</button></>}
  </>}
  {model.kind==='branch'&&<div className="node-condition">{conditionText(model.condition,project)}</div>}
  {model.kind==='effect'&&<><ol className="node-effects">{(model.effects??[]).slice(0,4).map((e,i)=><li key={i}>{project.variables.find(v=>v.id===e.variableId)?.name??'ตัวแปรที่หาย'} <b>{{set:'=',add:'+',subtract:'−'}[e.op]}</b> {String(e.value)}</li>)}</ol>{!model.effects?.length&&<p>ยังไม่มี Effects</p>}{(model.effects?.length??0)>4&&<p>และอีก {model.effects!.length-4} รายการ</p>}<div className="node-meta">ตามลำดับ · clamp ตามขอบเขตตัวแปร</div></>}
  {model.kind==='schedule'&&<><p>วันที่ {model.startDay??1}–{model.lastDay} · รวมวันสุดท้าย</p><div className="node-meta">{model.activityIds?.length??0} Activities · {model.eventIds?.length??0} Events</div><p>{(model.activityIds??[]).slice(0,3).map(id=>project.activities.find(a=>a.id===id)?.name??'กิจกรรมที่หาย').join(' · ')||'ยังไม่เลือกกิจกรรม'}</p></>}
  {model.kind==='end'&&<><p className="node-end-mode">{model.mode}</p><div className="node-meta">{model.mode==='jump'?`ไป Graph ${project.graphs.find(g=>g.id===model.targetGraphId)?.id.slice(-6)??'ยังไม่เลือก'}`:model.mode==='return'?'กลับจาก Subgraph':'จบเกม'}</div></>}
  {issues.length>0&&<div className="node-issues" role="status">{issues.some(i=>i.severity==='error')?'Error':'Warning'} · {issues.length} รายการ{issues.slice(0,2).map(i=><div key={i.code+i.message}>{i.code}: {i.message}</div>)}</div>}
  <div className="node-ports">{outputs.map(port=><div className="node-port-row" key={port}><span>{model.choices?.find(c=>c.id===port)?.text??port}</span><Handle id={port} type="source" position={Position.Right} aria-label={`พอร์ตออก ${port}`} />{port==='fallback'&&<small>ไม่มี Choice ผ่าน visibleIf</small>}</div>)}</div>
  <button className="nodrag nopan node-inspect-button" disabled={locked} onClick={()=>data.inspect(model.id)}>เปิด Inspector</button>
 </article>;
}
