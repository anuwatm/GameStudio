import type {Project,Variable,Scalar,Patch,Condition,Operand} from './types.ts';
import {fieldsPatch} from './editor.ts';
export const initialFor=(type:Variable['type']):Scalar=>type==='int'?0:type==='bool'?false:'';
export const compareDefault=():Condition=>({kind:'compare',left:{kind:'day'},operator:'ge',right:{kind:'literal',value:1}});
export function conditionKind(value:Condition|null,kind:Condition['kind']|'none'):Condition|null{
 if(kind==='none')return null;
 if(value?.kind===kind)return value;
 if(kind==='all'||kind==='any')return {kind,conditions:value&&(value.kind==='all'||value.kind==='any')?value.conditions:[]};
 return kind==='not'?{kind,condition:compareDefault()}:compareDefault();
}
/** Reference discovery only. Conditions/effects are evaluated exclusively by Rust. */
export function variableReferences(project:Project,id:string):string[]{
 const result:string[]=[];
 function visit(value:unknown,path:string){if(!value||typeof value!=='object')return;for(const [key,item]of Object.entries(value)){if(key==='variableId'&&item===id)result.push(path+'/'+key);else if(item&&typeof item==='object')visit(item,path+'/'+key);}}
 for(const key of ['nodes','activities','events'] as const)visit(project[key],'/'+key);
 return result;
}
export function deleteVariablePatch(project:Project,id:string):Patch[]{
 const refs=variableReferences(project,id);if(refs.length)throw Error(`ตัวแปรนี้ถูกอ้างอิง ${refs.length} จุด แก้ references ก่อนลบ: ${refs.join(', ')}`);
 return fieldsPatch(project,{variables:project.variables.filter(v=>v.id!==id)});
}
export function deleteRulePatch(project:Project,collection:'activities'|'events',id:string):Patch[]{
 const field=collection==='activities'?'activityIds':'eventIds';
 return fieldsPatch(project,{[collection]:project[collection].filter(row=>row.id!==id),nodes:project.nodes.map(n=>n.kind==='schedule'?{...n,[field]:(n[field]??[]).filter(value=>value!==id)}:n)});
}
export function operandFor(kind:Operand['kind'],variables:Variable[]):Operand{
 return kind==='day'?{kind}:kind==='variable'?{kind,variableId:variables[0]?.id??''}:{kind:'literal',value:0};
}
