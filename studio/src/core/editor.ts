import type {Project,StoryNode,NodeKind,Patch} from './types.ts';
export const uuid=()=>crypto.randomUUID();
/** Compare JSON data independent of object key order across Rust/JS serialization. */
export const stableJSON=(value:unknown)=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
export function createNode(kind:NodeKind,graphId:string):StoryNode{
 const base={id:uuid(),kind,graphId};
 switch(kind){
 case 'scene':return {...base,lines:[{text:'ฉากใหม่',characterId:null}],assetIds:[],effects:[],choices:[]};
 case 'branch':return {...base,condition:{kind:'all',conditions:[]}};
 case 'effect':return {...base,effects:[]};
 case 'schedule':return {...base,startDay:1,lastDay:1,activityIds:[],eventIds:[]};
 case 'end':return {...base,mode:'ending'};
 }
}
export function createProject(name:string):Project{
 const graphId=uuid(),end=createNode('end',graphId);
 return {schemaVersion:1,id:uuid(),name,entryGraphId:graphId,characters:[],assets:[],variables:[],activities:[],events:[],graphs:[{id:graphId,kind:'main',entryNodeId:end.id}],nodes:[end],edges:[]};
}
/** UI port choices follow Contract v1; Core Validator remains authoritative. */
export function ports(node:StoryNode):string[]{
 switch(node.kind){case 'scene':return node.choices?.length?[...node.choices.map(c=>c.id),'fallback']:['next'];case 'branch':return ['true','false'];case 'effect':return ['next'];case 'schedule':return ['onComplete'];case 'end':return [];}
}
export function fieldsPatch(project:Project,fields:Partial<Project>):Patch[]{
 return Object.entries(fields).filter(([key,value])=>JSON.stringify(project[key])!==JSON.stringify(value)).map(([key,value])=>({op:'replace',path:'/'+key,value}));
}
export function nodePatch(project:Project,next:StoryNode):Patch[]{
 if(!project.nodes.some(n=>n.id===next.id))throw Error('Node not found');
 const valid=new Set(ports(next));
 return fieldsPatch(project,{nodes:project.nodes.map(n=>n.id===next.id?next:n),edges:project.edges.filter(e=>e.from!==next.id||valid.has(e.port))});
}
export function deleteNodePatch(project:Project,id:string,replacement?:string):Patch[]{
 const node=project.nodes.find(n=>n.id===id);if(!node)throw Error('Node not found');
 if(project.nodes.filter(n=>n.graphId===node.graphId).length<=1)throw Error('กราฟต้องเหลืออย่างน้อยหนึ่งโหนด');
 const graph=project.graphs.find(g=>g.id===node.graphId)!;
 if(graph.entryNodeId===id&&!project.nodes.some(n=>n.id===replacement&&n.graphId===node.graphId&&n.id!==id))throw Error('เลือกโหนดเริ่มต้นทดแทนก่อนลบ');
 return fieldsPatch(project,{nodes:project.nodes.filter(n=>n.id!==id),edges:project.edges.filter(e=>e.from!==id&&e.to!==id),graphs:project.graphs.map(g=>g.id===graph.id&&g.entryNodeId===id?{...g,entryNodeId:replacement!}:g)});
}
export function connectPatch(project:Project,from:string,port:string,to:string):Patch[]{
 const source=project.nodes.find(n=>n.id===from),target=project.nodes.find(n=>n.id===to);
 if(!source||!target||source.graphId!==target.graphId||!ports(source).includes(port))throw Error('เลือกโหนดและพอร์ตในกราฟเดียวกัน');
 const existing=project.edges.find(e=>e.from===from&&e.port===port);
 return fieldsPatch(project,{edges:existing?project.edges.map(e=>e.id===existing.id?{...e,to}:e):[...project.edges,{id:uuid(),from,port,to}]});
}
