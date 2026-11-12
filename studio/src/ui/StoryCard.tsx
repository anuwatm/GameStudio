import {useEffect,useState} from 'react';
import {Handle,Position,type Node,type NodeProps} from '@xyflow/react';
import type {StoryNode} from '../core/types';
import {ports} from '../core/editor';
export type StoryCardNode=Node<{model:StoryNode;locked:boolean;entry:boolean;inline:(id:string,text:string,choices:string[])=>void},'story'>;
export function StoryCard({data}:NodeProps<StoryCardNode>){
 const {model,locked,entry}=data,[editing,setEditing]=useState(false),[text,setText]=useState(model.lines?.[0]?.text??''),[choices,setChoices]=useState((model.choices??[]).map(c=>c.text));
 useEffect(()=>{setEditing(false);setText(model.lines?.[0]?.text??'');setChoices((model.choices??[]).map(c=>c.text));},[model]);
 return <><Handle type="target" id="in" position={Position.Left}/><strong>{model.kind} · {model.id.slice(-4)}</strong>{entry&&<span className="entry-label">เริ่มกราฟ</span>}
  {model.kind==='scene'?editing?<form className="nodrag nopan inline-edit" onSubmit={e=>{e.preventDefault();data.inline(model.id,text,choices);}}><label>บทพูดบนกราฟ<input aria-label="บทพูดบนกราฟ" value={text} onChange={e=>setText(e.target.value)} disabled={locked}/></label>{choices.map((value,i)=><label key={i}>ตัวเลือกบนกราฟ {i+1}<input value={value} disabled={locked} onChange={e=>setChoices(choices.map((v,k)=>k===i?e.target.value:v))}/></label>)}<button disabled={locked}>ใช้ข้อความบนกราฟ</button><button type="button" onClick={()=>setEditing(false)}>ยกเลิก</button></form>:<><p>{model.lines?.[0]?.text||'ยังไม่มีบทพูด'}</p>{model.choices?.map(c=><div className="card-choice" key={c.id}>{c.text}</div>)}<button className="nodrag nopan" disabled={locked} onClick={()=>setEditing(true)}>แก้ข้อความบนกราฟ</button></>:<p>{model.kind==='end'?model.mode:model.kind==='schedule'?`วันที่ ${model.startDay??1}–${model.lastDay}`:model.kind==='branch'?'true / false':'Effects'}</p>}
  {ports(model).map((port,i,all)=><Handle key={port} id={port} type="source" position={Position.Right} style={{top:`${((i+1)/(all.length+1))*100}%`}}/>)}</>;
}
