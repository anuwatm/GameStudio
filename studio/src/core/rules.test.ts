import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from './editor.ts';
import {variableReferences,deleteVariablePatch,deleteRulePatch,initialFor,conditionKind} from './rules.ts';
test('switching AND/OR preserves nested AST and variable UUIDs',()=>{const original={kind:'all' as const,conditions:[{kind:'not' as const,condition:{kind:'compare' as const,left:{kind:'variable' as const,variableId:crypto.randomUUID()},operator:'eq' as const,right:{kind:'literal' as const,value:true}}}]};const changed=conditionKind(original,'any');assert.equal(changed?.kind,'any');assert.deepEqual(changed&&'conditions' in changed?changed.conditions:[],original.conditions);assert.deepEqual(conditionKind(changed,'all'),original);assert.equal(original.kind,'all');});
test('variable references find nested AST and effects without treating literal UUID text as a reference',()=>{
 const p=createProject('Rules'),id=crypto.randomUUID();p.variables=[{id,name:'x',type:'int',initial:0}];p.nodes[0].condition={kind:'not',condition:{kind:'any',conditions:[{kind:'compare',left:{kind:'variable',variableId:id},operator:'eq',right:{kind:'literal',value:id}}]}};p.nodes[0].effects=[{variableId:id,op:'add',value:1}];
 assert.equal(variableReferences(p,id).length,2);assert.throws(()=>deleteVariablePatch(p,id),/อ้างอิง 2 จุด/);p.nodes[0].effects=[];delete p.nodes[0].condition;assert.equal(deleteVariablePatch(p,id)[0].path,'/variables');assert.equal(p.variables.length,1);
});
test('deleting an activity/event removes schedule membership together without changing unrelated IDs',()=>{
 const p=createProject('Rules'),activityId=crypto.randomUUID(),eventId=crypto.randomUUID();p.activities=[{id:activityId,name:'Rest',condition:null,effects:[],subgraphId:null}];p.events=[{id:eventId,phase:'end_of_day',priority:0,order:0,once:true,condition:{kind:'all',conditions:[]},subgraphId:crypto.randomUUID()}];p.nodes[0]={id:p.nodes[0].id,graphId:p.entryGraphId,kind:'schedule',lastDay:3,activityIds:[activityId],eventIds:[eventId]};
 for(const [collection,id,field] of [['activities',activityId,'activityIds'],['events',eventId,'eventIds']] as const){const patch=deleteRulePatch(p,collection,id);assert.deepEqual(patch.find(op=>op.path==='/'+collection)?.value,[]);const nodes=patch.find(op=>op.path==='/nodes')!.value as typeof p.nodes;assert.deepEqual(nodes[0][field],[]);assert.equal(nodes[0].id,p.nodes[0].id);}assert.equal(p.nodes[0].activityIds!.length,1);
});
test('typed defaults do not coerce bool/string values into numeric operations',()=>{assert.equal(initialFor('bool'),false);assert.equal(initialFor('string'),'');assert.equal(initialFor('int'),0);});
