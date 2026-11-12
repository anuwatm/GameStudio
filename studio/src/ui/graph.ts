import {Position,type Edge,type Node} from '@xyflow/react';
import type {Project} from '../core/types';
/** Display layout only. No coordinates or semantic edits are written to Core. */
export function graphView(project:Project,graphId:string):{nodes:Node[];edges:Edge[]}{
 const source=project.nodes.filter(n=>n.graphId===graphId),ids=new Set(source.map(n=>n.id));
 const links=project.edges.filter(e=>ids.has(e.from)&&ids.has(e.to));
 const depth=new Map<string,number>();const entry=project.graphs.find(g=>g.id===graphId)?.entryNodeId;
 if(entry){depth.set(entry,0);const queue=[entry];for(let i=0;i<queue.length;i++)for(const e of links.filter(e=>e.from===queue[i]))if(!depth.has(e.to)){depth.set(e.to,depth.get(queue[i])!+1);queue.push(e.to);}}
 const rows=new Map<number,number>();
 return {nodes:source.map(n=>{const column=depth.get(n.id)??0,row=rows.get(column)??0;rows.set(column,row+1);return {id:n.id,position:{x:column*290,y:row*150},sourcePosition:Position.Right,targetPosition:Position.Left,data:{label:`${n.kind} · ${n.id.slice(-4)}\n${n.lines?.[0]?.text??(n.kind==='schedule'?'Schedule configuration':n.kind==='end'?'End of path':'')}`},type:n.kind==='end'?'output':undefined};}),edges:links.map(e=>({id:e.id,source:e.from,target:e.to,label:source.find(n=>n.id===e.from)?.choices?.find(c=>c.id===e.port)?.text??e.port,type:'smoothstep'}))};
}
